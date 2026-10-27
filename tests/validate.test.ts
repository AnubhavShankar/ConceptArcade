import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateGames } from '../scripts/lib/validate';

const manifest = {
  id: 'test-game',
  title: 'Test Game',
  summary: 'A game used only by the validator tests, with a summary long enough to pass.',
  subject: 'physics',
  classLevel: 12,
  chapter: { number: 2, name: 'Electrostatic Potential and Capacitance' },
  ncertRef: 'Section 2.1, Introduction',
  concepts: ['Potential'],
  learningOutcome: 'Student can compute potential from charge and distance.',
  mechanic: 'numeric-puzzle',
  estimatedMinutes: 2,
  levels: [
    { title: 'Level one', tier: 'concept', kind: 'foundation', adds: 'Baseline skill here.', hints: ['First hint here', 'Second hint here'] },
    { title: 'Level two', tier: 'concept', kind: 'complexity', adds: 'Harder numbers here.', hints: ['First hint here', 'Second hint here'] },
    { title: 'Level three', tier: 'application', kind: 'concept', adds: 'A new idea here.', hints: ['First hint here', 'Second hint here'] },
  ],
  author: { name: 'Tester', github: 'tester' },
};
const GOOD_DIR = 'physics/class-12/ch02-electrostatic-potential-and-capacitance/test-game';

let tmp: string;
afterEach(() => tmp && fs.rmSync(tmp, { recursive: true, force: true }));

/** Build a temp games tree; `files` maps relative-to-game-dir paths to contents. */
function setup(files: Record<string, string>, dir = GOOD_DIR): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arcade-'));
  const base = { 'game.json': JSON.stringify(manifest), 'index.ts': 'export default { mount(ctx: any) { return ctx.level; } };', 'logic.test.ts': '' };
  for (const [name, content] of Object.entries({ ...base, ...files })) {
    const f = path.join(tmp, dir, name);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content);
  }
  return tmp;
}

describe('the real games tree', () => {
  it('has no validation errors', () => {
    expect(validateGames(path.resolve('src/games')).errors).toEqual([]);
  });
});

describe('validateGames', () => {
  it('accepts a well-formed game', () => {
    const r = validateGames(setup({}));
    expect(r.errors).toEqual([]);
    expect(r.games).toHaveLength(1);
  });

  it('rejects a folder that does not match game.json', () => {
    const r = validateGames(setup({}, 'physics/class-12/ch02-wrong/test-game'));
    expect(r.errors.join('\n')).toMatch(/folder must be/);
  });

  it('rejects missing tests', () => {
    const root = setup({});
    fs.rmSync(path.join(root, GOOD_DIR, 'logic.test.ts'));
    expect(validateGames(root).errors.join('\n')).toMatch(/needs at least one \*\.test\.ts/);
  });

  it('rejects an invalid manifest with readable errors', () => {
    const bad = JSON.stringify({ ...manifest, levels: [{ ...manifest.levels[0], hints: ['only one'], tier: 'hard' }] });
    const out = validateGames(setup({ 'game.json': bad })).errors.join('\n');
    expect(out).toMatch(/levels/);
    expect(out).toMatch(/hints/);
  });

  it.each([
    ['network access', "fetch('/x');"],
    ['HTML injection', 'el.innerHTML = x;'],
    ['storage', "localStorage.setItem('a','b');"],
    ['eval', 'eval("1+1");'],
    ['external URL', "const u = 'https://evil.example';"],
  ])('rejects %s', (_name, code) => {
    expect(validateGames(setup({ 'index.ts': code })).errors.length).toBeGreaterThan(0);
  });

  it('rejects third-party and cross-game imports but allows ./ and @core/', () => {
    expect(validateGames(setup({ 'index.ts': "import x from 'lodash';" })).errors.join('\n')).toMatch(/lodash/);
    expect(validateGames(setup({ 'index.ts': "import x from '../other/logic';" })).errors.join('\n')).toMatch(/not allowed/);
    expect(validateGames(setup({ 'index.ts': "import { h } from '@core/dom';\nimport './logic';\nexport const f = (ctx: any) => ctx.level;" })).errors).toEqual([]);
  });

  it('rejects disallowed file types and dangerous SVG', () => {
    expect(validateGames(setup({ 'run.js': 'x' })).errors.join('\n')).toMatch(/not allowed/);
    expect(validateGames(setup({ 'a.svg': '<svg><script>1</script></svg>' })).errors.join('\n')).toMatch(/SVG/);
  });

  it('requires the game code to read ctx.level', () => {
    expect(validateGames(setup({ 'index.ts': 'export default {};' })).errors.join(' | ')).toMatch(/ctx\.level/);
  });

  it('rejects ladders that skip the foundation, go down in tier, or are too short', () => {
    const lv = manifest.levels;
    const bad = (levels: unknown[]) => validateGames(setup({ 'game.json': JSON.stringify({ ...manifest, levels }) })).errors.join(' | ');
    expect(bad([{ ...lv[0], kind: 'concept' }, lv[1], lv[2]])).toMatch(/foundation/);
    expect(bad([lv[0], { ...lv[1], kind: 'foundation' }, lv[2]])).toMatch(/only level 1/);
    expect(bad([lv[0], lv[2], lv[1]])).toMatch(/never go down/);
    expect(bad([])).toMatch(/levels/);
  });

  it('allows a single-level game, which need not read ctx.level', () => {
    const one = JSON.stringify({ ...manifest, levels: [manifest.levels[0]] });
    expect(validateGames(setup({ 'game.json': one, 'index.ts': 'export default {};' })).errors).toEqual([]);
  });

  it('still checks a two-level ladder', () => {
    const two = (levels: unknown[]) => validateGames(setup({ 'game.json': JSON.stringify({ ...manifest, levels }) })).errors;
    expect(two([manifest.levels[0], manifest.levels[1]])).toEqual([]);
    expect(two([manifest.levels[1], manifest.levels[0]]).join(' | ')).toMatch(/foundation/);
  });

  it('rejects duplicate ids', () => {
    const root = setup({});
    const other = path.join(root, 'physics/class-12/ch02-electrostatic-potential-and-capacitance/test-game-copy');
    fs.cpSync(path.join(root, GOOD_DIR), other, { recursive: true });
    expect(validateGames(root).errors.join('\n')).toMatch(/already used|folder must be/);
  });
});
