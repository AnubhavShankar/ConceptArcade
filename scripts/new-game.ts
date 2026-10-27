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
  ncertRef: 'Section X.Y, Topic name',
  concepts: ['Replace with the concept(s) this game tests'],
  learningOutcome: 'After winning, the student can ... (be specific and testable).',
  mechanic: 'tune-to-target',
  difficulty: 'concept',
  estimatedMinutes: 3,
  hints: [
    'Gentle nudge: which concept applies?',
    'Stronger hint: state the formula or relationship.',
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
  `// Pure functions only: no DOM, no randomness source other than the one passed in.
// This is the part that must be *correct*, so it is what logic.test.ts covers.

export interface Round {
  // TODO: the numbers/choices that define one round
  target: number;
}

/** Build one round from the shell's seeded random. */
export function makeRound(random: () => number): Round {
  return { target: 1 + Math.floor(random() * 9) };
}

/** Decide whether the student's answer is right. */
export function isCorrect(round: Round, answer: number): boolean {
  return answer === round.target;
}
`,
);

write(
  'logic.test.ts',
  `import { describe, expect, it } from 'vitest';
import { isCorrect, makeRound } from './logic';

describe('${v.id}', () => {
  it('makes the same round from the same random sequence', () => {
    expect(makeRound(() => 0.5)).toEqual(makeRound(() => 0.5));
  });

  it('accepts the right answer and rejects a wrong one', () => {
    const round = makeRound(() => 0.5);
    expect(isCorrect(round, round.target)).toBe(true);
    expect(isCorrect(round, round.target + 1)).toBe(false);
  });
});
`,
);

write(
  'index.ts',
  `import { defineGame } from '@core/define';
import { h } from '@core/dom';
import { isCorrect, makeRound } from './logic';

export default defineGame({
  mount(ctx) {
    const round = makeRound(ctx.random);
    let attempts = 0;

    const input = h('input', { class: 'field', type: 'number', inputmode: 'decimal', id: 'answer' });
    const feedback = h('p', { class: 'feedback', hidden: true });

    const check = () => {
      attempts++;
      const ok = isCorrect(round, Number(input.value));
      feedback.hidden = false;
      feedback.className = ok ? 'feedback good' : 'feedback bad';
      feedback.textContent = ok ? 'Correct!' : 'Not quite. Explain WHY it is wrong, not just that it is.';
      if (ok) ctx.win({ stars: attempts === 1 ? 3 : attempts === 2 ? 2 : 1 });
    };

    ctx.root.append(
      h('p', null, \`TODO: describe the problem. Target is hidden: \${round.target}\`),
      h('label', { for: 'answer' }, 'Your answer'),
      h('div', { class: 'row' }, input, h('button', { class: 'btn', onclick: check }, 'Check')),
      feedback,
    );
  },
});
`,
);

console.log(`Created ${path.relative(process.cwd(), target)}\n`);
console.log('Next: edit game.json, logic.ts, logic.test.ts, index.ts, then run `npm run check` and `npm run dev`.');
