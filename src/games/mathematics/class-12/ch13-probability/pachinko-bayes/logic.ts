// Pure rules of Pachinko Bayes: no DOM, no canvas. Bounce the pachinko ball drops N balls through gates; each gate sends balls to a red or a blue tray with its own
// chance. Chances are turned into counts of balls (natural frequencies), so total probability and Bayes become counting. Level 1: how many balls land red in
// all. Levels 2 and 3: of the red landings, how many came from one gate, as a count out of the total red count.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';

export type Kind = 'total' | 'bayes';
export interface Gate {
  name: string;
  /** How many of the N balls go through this gate, and how many of those land red. */
  n: number;
  red: number;
}
export interface Round {
  kind: Kind;
  N: number;
  gates: Gate[];
  /** Bayes: the gate asked about. */
  target: number;
  /** The winning setting: [total red] or [reds from the target gate, total red]. */
  ans: number[];
  max: number;
  start: number[];
  assist: 0 | 1 | 2;
}

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
export const frac = (a: number, b: number) => (a === 0 ? '0' : `${a / gcd(a, b)}/${b / gcd(a, b)}`);

const SPLITS2: number[][] = [[20, 40], [40, 20], [15, 45], [45, 15], [24, 36], [36, 24], [30, 30], [12, 48], [48, 12]];
const SPLITS3: number[][] = [[10, 20, 30], [30, 20, 10], [20, 10, 30], [12, 18, 30], [15, 15, 30], [30, 15, 15], [20, 20, 20], [10, 30, 20]];
const CHANCES: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6], [1, 10], [3, 10], [9, 10]];

function gates(split: number[], random: () => number): Gate[] | null {
  const out: Gate[] = [];
  for (let i = 0; i < split.length; i++) {
    const options = CHANCES.filter(([a, b]) => (split[i] * a) % b === 0);
    if (!options.length) return null;
    const [a, b] = pick(options, random);
    out.push({ name: 'ABC'[i], n: split[i], red: (split[i] * a) / b });
  }
  return out;
}

function make(kind: Kind, three: boolean, random: () => number): Round {
  for (;;) {
    const split = pick(three ? SPLITS3 : SPLITS2, random);
    const gs = gates(split, random);
    if (!gs) continue;
    const R = gs.reduce((s, g) => s + g.red, 0);
    if (R < 8 || R > 50) continue;
    // Chances must not all be equal, or the gate would not matter.
    if (new Set(gs.map((g) => frac(g.red, g.n))).size < 2) continue;
    const target = kind === 'bayes' ? Math.floor(random() * gs.length) : 0;
    const ans = kind === 'total' ? [R] : [gs[target].red, R];
    return { kind, N: 60, gates: gs, target, ans, max: 60, start: ans.map(() => 0), assist: 0 };
  }
}

export function buildRounds(level: number, random: () => number): Round[] {
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    const mk = () => make(level === 1 ? 'total' : 'bayes', level === 3, random);
    let r = mk();
    for (let t = 0; t < 50 && out.some((o) => o.gates.map((g) => g.n + ':' + g.red).join() === r.gates.map((g) => g.n + ':' + g.red).join() && o.target === r.target); t++) r = mk();
    out.push({ ...r, assist: aid(i) });
  }
  return out;
}

export const judge = (r: Round, v: number[]) => r.ans.every((x, i) => x === v[i]);
/** The exact probability the asked count stands for: P(red) or P(gate | red). */
export const probability = (r: Round) => (r.kind === 'total' ? frac(r.ans[0], r.N) : frac(r.ans[0], r.ans[1]));

export function intel(r: Round): string {
  const parts = r.gates.map((g) => `gate ${g.name} takes ${frac(g.n, r.N)} of the balls and sends ${frac(g.red, g.n)} of them red`).join('; ');
  if (r.kind === 'total') return `${r.N} balls drop: ${parts}. How many land red altogether? Set the red count.`;
  return `${r.N} balls drop: ${parts}. A ball landed red. Of all the red landings, how many came through gate ${r.gates[r.target].name}? Set the count from gate ${r.gates[r.target].name} and the total red count.`;
}

/** A test drop of a few balls, showing what the settings would mean, never the right counts. */
export function spotText(r: Round, v: number[]): string {
  if (r.kind === 'total') return `Check: ${v[0]} red balls out of ${r.N} is a chance of ${frac(v[0], r.N)}.`;
  return v[1] === 0 ? 'Check: with no red balls there is no chance to speak of.' : `Check: ${v[0]} from gate ${r.gates[r.target].name} out of ${v[1]} red balls is a chance of ${frac(v[0], v[1])}.`;
}
/** After a miss: one text for every wrong setting. Level 1 gives the direction of the one count; the Bayes levels say only that the pair did not match, never which count is right. */
export function missText(r: Round, v: number[]): string {
  if (r.kind === 'total') return `${v[0] > r.ans[0] ? 'More' : 'Fewer'} balls landed red than you said: the drop showed a different count.`;
  return `The drop did not match your two counts: the red landings from gate ${r.gates[r.target].name} and the red landings in all were different from what you set.`;
}
/**
 * The balls the drop animation sends through each gate. A win plays the real counts; a miss plays a fixed, generic drop (the same for every wrong setting, a half-half split
 * of an equal share per gate), so the animation never shows the true red counts.
 */
export function dropCounts(r: Round, ok: boolean): { n: number; red: number }[] {
  if (ok) return r.gates.map((g) => ({ n: g.n, red: g.red }));
  const share = r.N / r.gates.length;
  return r.gates.map(() => ({ n: share, red: share / 2 }));
}
/** After a hit: the working. */
export function explain(r: Round): string {
  const lines = r.gates.map((g) => `gate ${g.name}: ${g.n} balls, ${g.red} red`).join('; ');
  if (r.kind === 'total') return `Out of ${r.N} balls — ${lines}. Total red = ${r.ans[0]}, so P(red) = ${probability(r)}.`;
  return `Out of ${r.N} balls — ${lines}. Total red = ${r.ans[1]}, ${r.ans[0]} of them from gate ${r.gates[r.target].name}: P(gate ${r.gates[r.target].name} | red) = ${r.ans[0]}/${r.ans[1]} = ${probability(r)}.`;
}
