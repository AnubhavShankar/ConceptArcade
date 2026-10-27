import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { expectedDir, parseManifest, SUBJECTS, type GameManifest } from '../src/core/manifest';

const USAGE = `Usage:
  npm run new-game -- --subject physics --class 12 --chapter 1 \\
      --chapter-name "Electric Charges and Fields" \\
      --id my-game --title "My Game" --name "Your Name" --github your-username

--chapter-name may be omitted if the chapter already has games.`;

const { values: v } = parseArgs({
  options: {
    subject: { type: 'string' },
    class: { type: 'string' },
    chapter: { type: 'string' },
    'chapter-name': { type: 'string' },
    id: { type: 'string' },
    title: { type: 'string' },
    name: { type: 'string' },
    github: { type: 'string' },
  },
});

function fail(msg: string): never {
  console.error(`${msg}\n\n${USAGE}`);
  process.exit(1);
}

for (const k of ['subject', 'class', 'chapter', 'id', 'title', 'name', 'github'] as const) {
  if (!v[k]) fail(`Missing --${k}`);
}
if (!SUBJECTS.includes(v.subject as (typeof SUBJECTS)[number])) fail(`--subject must be one of ${SUBJECTS.join(', ')}`);

const gamesRoot = path.resolve('src/games');
const classDir = path.join(gamesRoot, v.subject!, `class-${v.class}`);
const chNum = String(Number(v.chapter)).padStart(2, '0');

// Reuse the chapter name from an existing game in the same chapter.
let chapterName = v['chapter-name'];
if (!chapterName && fs.existsSync(classDir)) {
  for (const d of fs.readdirSync(classDir).filter((d) => d.startsWith(`ch${chNum}-`))) {
    for (const g of fs.readdirSync(path.join(classDir, d))) {
      const f = path.join(classDir, d, g, 'game.json');
      if (fs.existsSync(f)) chapterName ??= JSON.parse(fs.readFileSync(f, 'utf8')).chapter?.name;
    }
  }
}
if (!chapterName) fail('Missing --chapter-name (no existing games in this chapter to copy it from)');

const manifest: GameManifest = {
  id: v.id!,
  title: v.title!,
  summary: 'One sentence on what the student does and which concept it tests.',
  subject: v.subject as GameManifest['subject'],
  classLevel: Number(v.class),
  chapter: { number: Number(v.chapter), name: chapterName },
  // Games are listed in textbook order, so this must start with the real section number. Fix it to the right one.
  ncertRef: `Section ${Number(v.chapter)}.1, Replace with the topic name`,
  concepts: ['Replace with the concept(s) this game tests'],
  learningOutcome: 'After winning, the student can ... (be specific and testable).',
  mechanic: 'numeric-puzzle',
  estimatedMinutes: 8,
  levels: [
    {
      title: 'Direct use',
      tier: 'concept',
      kind: 'foundation',
      adds: 'Baseline: apply the idea once, with clean numbers.',
      hints: ['Gentle nudge: which concept applies?', 'Stronger hint: state the formula or relationship.'],
    },
    {
      title: 'Harder numbers',
      tier: 'application',
      kind: 'complexity',
      adds: 'Same idea with units to convert or an extra step.',
      hints: ['What do you need to convert first?', 'Write the formula, then substitute step by step.'],
    },
    {
      title: 'A new twist',
      tier: 'application',
      kind: 'concept',
      adds: 'Adds a second concept that must be combined with the first.',
      hints: ['Which second idea is involved?', 'Work out the new quantity first, then use it.'],
    },
  ],
  author: { name: v.name!, github: v.github! },
};

const parsed = parseManifest(manifest);
if (!parsed.ok) fail(`Invalid arguments:\n  ${parsed.errors.join('\n  ')}`);

const target = path.join(gamesRoot, expectedDir(manifest));
if (fs.existsSync(target)) fail(`${target} already exists`);
fs.mkdirSync(target, { recursive: true });

const write = (name: string, content: string) => fs.writeFileSync(path.join(target, name), content);

write('game.json', JSON.stringify({ $schema: '../../../../../../schema/game.schema.json', ...manifest }, null, 2) + '\n');

write(
  'logic.ts',
  `// Pure functions only: no DOM. Build each level's questions from the seeded random passed in.
// This is the part that must be *correct*, so it is what logic.test.ts covers.
import { choice, type Question } from '@core/quiz';

/** Level 1 = baseline; each later level either adds complexity or adds a concept (see game.json). */
export function buildQuestions(level: number, random: () => number): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < 4; i++) {
    const a = 2 + Math.floor(random() * 8);
    const b = 2 + Math.floor(random() * 8);
    if (level === 1) {
      // TODO: foundation question
      qs.push({ kind: 'number', prompt: \`What is \${a} × \${b}?\`, answer: a * b, tolerance: 0, explain: \`\${a} × \${b} = \${a * b}.\` });
    } else if (level === 2) {
      // TODO: same idea, harder (more steps, unit conversions, more bodies)
      qs.push({ kind: 'number', prompt: \`What is \${a} × \${b} + \${a}?\`, answer: a * b + a, tolerance: 0, explain: \`\${a * b} + \${a} = \${a * b + a}.\` });
    } else {
      // TODO: add a NEW concept on top of the previous level
      qs.push(
        choice({
          prompt: \`Is \${a} × \${b} greater than \${a} + \${b}?\`,
          correct: a * b > a + b ? 'Yes' : 'No',
          wrong: [a * b > a + b ? 'No' : 'Yes'],
          random,
          explain: \`\${a} × \${b} = \${a * b} and \${a} + \${b} = \${a + b}.\`,
        }),
      );
    }
  }
  return qs;
}
`,
);

write(
  'logic.test.ts',
  `import { describe, expect, it } from 'vitest';
import { buildQuestions } from './logic';

describe('${v.id}', () => {
  it('builds the same questions from the same random sequence', () => {
    const seq = (s: number) => () => (s = (s * 9301 + 49297) % 233280) / 233280;
    expect(JSON.stringify(buildQuestions(2, seq(7)))).toEqual(JSON.stringify(buildQuestions(2, seq(7))));
  });

  it('gives every level questions with a correct, checkable answer', () => {
    for (const level of [1, 2, 3]) {
      const qs = buildQuestions(level, () => 0.5);
      expect(qs.length).toBeGreaterThanOrEqual(3);
      for (const q of qs) {
        expect(q.explain.length).toBeGreaterThan(5);
        if (q.kind === 'choice') expect(q.options[q.answer]).toBeDefined();
        else expect(Number.isFinite(q.answer)).toBe(true);
      }
    }
  });

  it('makes later levels different from level 1', () => {
    const rand = () => 0.5;
    expect(JSON.stringify(buildQuestions(3, rand))).not.toEqual(JSON.stringify(buildQuestions(1, rand)));
  });
});
`,
);

write(
  'index.ts',
  `import { defineGame } from '@core/define';
import { mountQuiz } from '@core/quiz';
import { buildQuestions } from './logic';

export default defineGame({
  mount(ctx) {
    // ctx.level (1-based) decides which questions to build: that is what makes the levels incremental.
    return mountQuiz(ctx, { questions: buildQuestions(ctx.level, ctx.random) });
  },
});
`,
);

console.log(`Created ${path.relative(process.cwd(), target)}\n`);
console.log('Next: edit game.json (levels! and ncertRef, which must start with the textbook section so the game is listed in the right place), logic.ts, logic.test.ts, then run `npm run check` and `npm run dev`.');
