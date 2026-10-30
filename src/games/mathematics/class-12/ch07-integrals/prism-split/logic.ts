// Pure rules of Prism Split: no DOM, no canvas. One beam g(x) = (numerator)/(factors) has to be split into simple beams A/(x − a) + B/(x − b) (+ C/(x − c)),
// or A/(x − a) + B/(x − a)² for a repeated factor. The split is unique, so exactly one setting of the strengths wins each round.
import { aid } from '@core/dialgame';
import { num, poly } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'two' | 'repeat' | 'three';
export interface Round {
  kind: Kind;
  /** The poles (where a factor of the bottom is zero): one for a repeat, two or three otherwise. */
  poles: number[];
  /** The winning strengths: A, B (and C). */
  ans: number[];
  /** The top of the beam as terms [coefficient, power], and the bottom written out. */
  top: [number, number][];
  bottom: string;
  /** A test point that is not a pole. */
  probe: number;
  start: number[];
  assist: 0 | 1 | 2;
}

export const DIAL = { min: -9, max: 9 };
/** The scanner checks the beams at these half-way points between the poles. */
export const CHECK = Array.from({ length: 12 }, (_, i) => i - 5.5);

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const strength = (random: () => number) => pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6], random);
const factor = (a: number) => (a === 0 ? 'x' : `(x ${a < 0 ? '+' : '−'} ${Math.abs(a)})`);

/** The pole numbers as distinct whole numbers from −3 to 3. */
function poles(count: number, random: () => number): number[] {
  return shuffle([-3, -2, -1, 0, 1, 2, 3], random).slice(0, count);
}

function make(kind: Kind, random: () => number): Round {
  if (kind === 'repeat') {
    const [a] = poles(1, random);
    const A = strength(random);
    const B = strength(random);
    return { kind, poles: [a], ans: [A, B], top: [[A, 1], [B - A * a, 0]], bottom: `${factor(a)}²`, probe: pick([-2, -1, 1, 2, 3].filter((x) => x !== a), random), start: [0, 0], assist: 0 };
  }
  if (kind === 'two') {
    const [a, b] = poles(2, random);
    const [A, B] = [strength(random), strength(random)];
    return { kind, poles: [a, b], ans: [A, B], top: [[A + B, 1], [-(A * b + B * a), 0]], bottom: `${factor(a)}${factor(b)}`, probe: pick([-2, -1, 0, 1, 2, 3].filter((x) => x !== a && x !== b), random), start: [0, 0], assist: 0 };
  }
  const [a, b, c] = poles(3, random);
  const [A, B, C] = [strength(random), strength(random), strength(random)];
  const top: [number, number][] = [[A + B + C, 2], [-(A * (b + c) + B * (a + c) + C * (a + b)), 1], [A * b * c + B * a * c + C * a * b, 0]];
  return { kind, poles: [a, b, c], ans: [A, B, C], top, bottom: `${factor(a)}${factor(b)}${factor(c)}`, probe: pick([-2, -1, 0, 1, 2, 3, 4].filter((x) => ![a, b, c].includes(x)), random), start: [0, 0, 0], assist: 0 };
}

const same = (r: Round, o: Round) => r.bottom === o.bottom && r.ans.join() === o.ans.join();

export function buildRounds(level: number, random: () => number): Round[] {
  const kind: Kind = level === 1 ? 'two' : level === 2 ? 'repeat' : 'three';
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    let r = make(kind, random);
    for (let t = 0; t < 50 && out.some((o) => same(r, o)); t++) r = make(kind, random);
    out.push({ ...r, assist: aid(i) });
  }
  return out;
}

/** The original beam. */
export function original(r: Round, x: number): number {
  const top = r.top.reduce((s, [c, p]) => s + c * x ** p, 0);
  const bottom = r.kind === 'repeat' ? (x - r.poles[0]) ** 2 : r.poles.reduce((p, a) => p * (x - a), 1);
  return top / bottom;
}
/** The beam made by putting the split pieces back together. */
export function recombined(r: Round, v: number[], x: number): number {
  if (r.kind === 'repeat') return v[0] / (x - r.poles[0]) + v[1] / (x - r.poles[0]) ** 2;
  return r.poles.reduce((s, a, i) => s + v[i] / (x - a), 0);
}
export const judge = (r: Round, v: number[]) => r.ans.every((a, i) => a === v[i]);
const away = (r: Round, v: number[], x: number) => Math.abs(original(r, x) - recombined(r, v, x)) > 1e-9;
/** The checkpoints where the two beams disagree. */
export const bad = (r: Round, v: number[]) => CHECK.filter((x) => away(r, v, x));

const name = (r: Round) => (r.kind === 'repeat' ? ['A', 'B'] : ['A', 'B', 'C'].slice(0, r.poles.length));
const pieces = (r: Round) => (r.kind === 'repeat' ? `A/${factor(r.poles[0])} + B/${factor(r.poles[0])}²` : r.poles.map((a, i) => `${name(r)[i]}/${factor(a)}`).join(' + '));
export const beamText = (r: Round) => `(${poly(r.top, 'x')}) / ${r.bottom}`;

export function intel(r: Round): string {
  return `Split the beam ${beamText(r)} into ${pieces(r)}.`;
}

/** A test beam at one point: what the original reads and what the split reads, never the strengths. */
export function probeText(r: Round, v: number[]): string {
  return `Test beam at x = ${r.probe}: the original reads ${num(Math.round(original(r, r.probe) * 100) / 100)} and your split reads ${num(Math.round(recombined(r, v, r.probe) * 100) / 100)}.`;
}

/** After a miss: that the beams part, with no checkpoint, reading or count (a reading at one point is the paid test beam). Never the right strengths. */
export function missText(_r: Round, _v: number[]): string {
  return 'The scanner found the beams apart: your pieces do not add back to the original beam. Put them over the common bottom and compare the top with the original top.';
}

/** After a hit: the working. */
export function explain(r: Round): string {
  const [A, B, C] = r.ans;
  if (r.kind === 'repeat') {
    const a = r.poles[0];
    return `Multiply through by (x − ${a})²: the top equals A(x − ${a}) + B. Matching x gives A = ${A}; putting x = ${a} gives B = ${num(B)}. The pieces are ${num(A)}/${factor(a)} and ${num(B)}/${factor(a)}².`;
  }
  const cover = (i: number) => `covering ${factor(r.poles[i])} and putting x = ${r.poles[i]} in the rest gives ${'ABC'[i]} = ${num(r.ans[i])}`;
  return `The cover-up method: ${r.poles.map((_, i) => cover(i)).join('; ')}. Check: ${r.poles.length === 3 ? `${A} + ${B} + ${C}` : `${A} + ${B}`} is the coefficient of the top power.`.replace(/\+ -/g, '+ −');
}
