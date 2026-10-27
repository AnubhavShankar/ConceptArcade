import fs from 'node:fs';
import path from 'node:path';
import { parseCurriculum, type Curriculum } from '../../src/core/curriculum';
import { expectedDir, parseManifest, type GameManifest } from '../../src/core/manifest';

export interface ValidationResult {
  errors: string[];
  games: { dir: string; manifest: GameManifest }[];
}

const ALLOWED_EXT = new Set(['.ts', '.json', '.css', '.svg', '.png', '.webp', '.md']);
const TEXT_EXT = new Set(['.ts', '.json', '.css', '.svg', '.md']);
const MAX_FILE_BYTES = 200_000;
const MAX_GAME_BYTES = 1_000_000;

// Games run in students' browsers, so they are sandboxed by review + static rules:
// no network, no storage of their own, no HTML injection, no dynamic code, no third-party deps.
const FORBIDDEN: [RegExp, string][] = [
  [/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b/, 'network access is not allowed'],
  [/\b(eval|Function)\s*\(/, 'dynamic code execution is not allowed'],
  [/\bnew\s+Function\b/, 'dynamic code execution is not allowed'],
  [/\b(innerHTML|outerHTML|insertAdjacentHTML)\b|document\s*\.\s*write/, 'HTML injection is not allowed (use h()/svg()/textContent)'],
  [/\b(localStorage|sessionStorage|indexedDB|document\s*\.\s*cookie)\b/, 'games must not use storage (the shell tracks progress)'],
  [/https?:\/\//, 'external URLs are not allowed'],
  [/@import\b/, 'CSS @import is not allowed'],
  [/\bwindow\s*\.\s*(open|location)\b|\blocation\s*\.\s*(href|assign|replace)\b/, 'navigation is not allowed'],
];
const FORBIDDEN_SVG: [RegExp, string][] = [
  [/<script/i, 'scripts in SVG are not allowed'],
  [/<foreignObject/i, '<foreignObject> is not allowed'],
  [/\son\w+\s*=/i, 'event handlers in SVG are not allowed'],
  [/href\s*=\s*["'](?!#)/i, 'external references in SVG are not allowed'],
];

// A game must read ctx.level (directly, via destructuring, or via ctx.levelInfo) to vary by level.
const LEVEL_USE = /\bctx\.level\b|\blevelInfo\b|=\s*ctx\s*;/;

const IMPORT_RE =
  /(?:\bimport|\bexport)\s[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function walk(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

/** Directories (relative to root) that contain a game.json or index.ts. */
function findGameDirs(root: string): string[] {
  const dirs = new Set<string>();
  for (const f of walk(root)) {
    const name = path.posix.basename(f);
    if (name === 'game.json' || name === 'index.ts') dirs.add(path.posix.dirname(f));
  }
  return [...dirs].sort();
}

/** Read the curriculum files (chapters per subject and class). Invalid files are reported as errors. */
function loadCurricula(root: string, errors: string[]): Map<string, Curriculum> {
  const out = new Map<string, Curriculum>();
  if (!fs.existsSync(root)) return out;
  for (const f of walk(root).filter((x) => x.endsWith('.json'))) {
    try {
      const parsed = parseCurriculum(JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')));
      if (!parsed.ok) {
        parsed.errors.forEach((e) => errors.push(`curriculum/${f}: ${e}`));
        continue;
      }
      const key = `${parsed.curriculum.subject}|${parsed.curriculum.classLevel}`;
      if (out.has(key)) errors.push(`curriculum/${f}: a second file for ${parsed.curriculum.subject} class ${parsed.curriculum.classLevel}`);
      else out.set(key, parsed.curriculum);
    } catch (e) {
      errors.push(`curriculum/${f}: not valid JSON (${(e as Error).message})`);
    }
  }
  return out;
}

export function validateGames(gamesRoot: string, curriculumRoot = path.join(gamesRoot, '..', 'curriculum')): ValidationResult {
  const errors: string[] = [];
  const games: ValidationResult['games'] = [];
  const ids = new Map<string, string>();
  const curricula = loadCurricula(curriculumRoot, errors);

  if (!fs.existsSync(gamesRoot)) return { errors: [`${gamesRoot} does not exist`], games };

  for (const dir of findGameDirs(gamesRoot)) {
    const err = (msg: string) => errors.push(`${dir}: ${msg}`);
    const abs = path.join(gamesRoot, dir);
    const files = walk(abs);

    // 1. manifest
    if (!files.includes('game.json')) {
      err('missing game.json');
      continue;
    }
    if (!files.includes('index.ts')) err('missing index.ts (must default-export defineGame({...}))');
    let manifest: GameManifest | undefined;
    try {
      const parsed = parseManifest(JSON.parse(fs.readFileSync(path.join(abs, 'game.json'), 'utf8')));
      if (parsed.ok) manifest = parsed.manifest;
      else parsed.errors.forEach((e) => err(`game.json ${e}`));
    } catch (e) {
      err(`game.json is not valid JSON (${(e as Error).message})`);
    }

    // 2. location must match metadata, ids unique
    if (manifest) {
      const want = expectedDir(manifest);
      if (dir !== want) err(`folder must be "${want}" to match game.json`);
      // One canonical name per chapter: it comes from the curriculum file for that subject and class, if there is one.
      const cur = curricula.get(`${manifest.subject}|${manifest.classLevel}`);
      if (cur) {
        const ch = cur.chapters.find((c) => c.number === manifest.chapter.number);
        if (!ch) err(`chapter ${manifest.chapter.number} is not in the ${manifest.subject} class ${manifest.classLevel} curriculum (src/curriculum): add it there first`);
        else if (ch.name !== manifest.chapter.name) err(`chapter name must be "${ch.name}" to match the curriculum`);
      }
      const clash = ids.get(manifest.id);
      if (clash) err(`id "${manifest.id}" already used by ${clash}`);
      else ids.set(manifest.id, dir);
      games.push({ dir, manifest });
    }

    // 3. correctness evidence: a test file for the game's logic
    if (!files.some((f) => f.endsWith('.test.ts'))) {
      err('needs at least one *.test.ts that checks the physics/maths (e.g. logic.test.ts)');
    }

    // 3b. levels must actually be used by the game code
    const sources = files.filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    const usesLevel = sources.some((f) => LEVEL_USE.test(fs.readFileSync(path.join(abs, f), 'utf8')));
    if (manifest && manifest.levels.length > 1 && !usesLevel) err('no source file reads ctx.level: a game with several levels must behave differently per level (see game.json "levels")');

    // 4. file rules
    let total = 0;
    for (const f of files) {
      const ext = path.posix.extname(f);
      const size = fs.statSync(path.join(abs, f)).size;
      total += size;
      if (!ALLOWED_EXT.has(ext)) err(`${f}: file type "${ext}" is not allowed`);
      if (size > MAX_FILE_BYTES) err(`${f}: larger than ${MAX_FILE_BYTES / 1000} KB`);
      if (!TEXT_EXT.has(ext)) continue;

      const text = fs.readFileSync(path.join(abs, f), 'utf8');
      const isTest = f.endsWith('.test.ts');
      if (!isTest) {
        for (const [re, why] of FORBIDDEN) if (re.test(text)) err(`${f}: ${why}`);
      }
      if (ext === '.svg') for (const [re, why] of FORBIDDEN_SVG) if (re.test(text)) err(`${f}: ${why}`);
      if (ext === '.ts') {
        for (const m of text.matchAll(IMPORT_RE)) {
          const spec = m[1] ?? m[2] ?? m[3];
          const ok = spec.startsWith('./') || spec.startsWith('@core/') || (isTest && spec === 'vitest');
          if (!ok) err(`${f}: import "${spec}" not allowed (use "./...", "@core/...", or open an issue to propose a dependency)`);
        }
      }
    }
    if (total > MAX_GAME_BYTES) err(`game folder is larger than ${MAX_GAME_BYTES / 1_000_000} MB`);
  }
  return { errors, games };
}
