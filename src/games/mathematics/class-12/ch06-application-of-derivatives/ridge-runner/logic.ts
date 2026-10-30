// Pure rules of Ridge Runner: no DOM, no canvas. Pika the bird camps at a whole-number position x on hilly ground y = f(x). The ground is a cubic with
// integer turning points (levels 1 and 3) or is given by its slope f′(x) = (x − a)²(x − b) (level 2).
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'local' | 'trap' | 'camp';
export type Ask = 'peak' | 'valley' | 'highest' | 'lowest';
export interface Round {
  kind: Kind;
  ask: Ask;
  /** f and f′, f″ as functions. */
  f: (x: number) => number;
  fp: (x: number) => number;
  fpp: (x: number) => number;
  /** Words: the ground function or its slope. */
  text: string;
  /** The points where f′ = 0. */
  crit: number[];
  /** The stretch of ground the bird may camp on. */
  lo: number;
  hi: number;
  /** The camp that wins. */
  ans: number;
  start: number;
  assist: 0 | 1 | 2;
}

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));

const poly = (coef: number[]) => {
  // coef from highest power to constant
  const names = ['x³', 'x²', 'x', ''];
  const parts: string[] = [];
  coef.forEach((c, i) => {
    if (c === 0) return;
    const n = names[i + (4 - coef.length)];
    const mag = n === '' ? String(Math.abs(c)) : Math.abs(c) === 1 ? n : `${Math.abs(c)}${n}`;
    parts.push(parts.length === 0 ? `${c < 0 ? '−' : ''}${mag}` : `${c < 0 ? '−' : '+'} ${mag}`);
  });
  return parts.join(' ') || '0';
};

/** The cubic σ(x³ − 3s·x² + 3pq·x) + c with f′ = 3σ(x − p)(x − q). Needs p + q even so the coefficients are whole numbers. */
export function cubic(p: number, q: number, sigma: 1 | -1, c: number) {
  const s = (p + q) / 2;
  const coef = [sigma, -3 * sigma * s, 3 * sigma * p * q, c];
  return {
    f: (x: number) => coef[0] * x ** 3 + coef[1] * x ** 2 + coef[2] * x + coef[3],
    fp: (x: number) => 3 * coef[0] * x * x + 2 * coef[1] * x + coef[2],
    fpp: (x: number) => 6 * coef[0] * x + 2 * coef[1],
    text: `f(x) = ${poly(coef)}`,
  };
}

function roots(random: () => number): [number, number] {
  for (;;) {
    const p = ri(-4, 3, random);
    const q = ri(p + 2, 4, random);
    if ((p + q) % 2 === 0) return [p, q];
  }
}

function localRound(ask: 'peak' | 'valley', sigma: 1 | -1, random: () => number): Round {
  const [p, q] = roots(random);
  const g = cubic(p, q, sigma, ri(-3, 3, random));
  // With σ = 1 the smaller root is the peak; with σ = −1 it is the valley.
  const peak = sigma === 1 ? p : q;
  const valley = sigma === 1 ? q : p;
  const ans = ask === 'peak' ? peak : valley;
  return { kind: 'local', ask, ...g, crit: [p, q], lo: -5, hi: 5, ans, start: -5, assist: 0 };
}

function trapRound(random: () => number): Round {
  let a: number;
  let b: number;
  do {
    a = ri(-3, 3, random);
    b = ri(-3, 3, random);
  } while (a === b);
  const sigma = pick([1, -1], random);
  const fp = (x: number) => sigma * (x - a) ** 2 * (x - b);
  const fpp = (x: number) => sigma * (2 * (x - a) * (x - b) + (x - a) ** 2);
  const f = (x: number) => {
    // ∫ σ(x − a)²(x − b) dx from 0, so the picture has a baseline
    const F = (u: number) => sigma * (u ** 4 / 4 - ((2 * a + b) * u ** 3) / 3 + ((a * a + 2 * a * b) * u ** 2) / 2 - a * a * b * u);
    return F(x);
  };
  const ask: Ask = sigma === 1 ? 'valley' : 'peak';
  const text = `f′(x) = ${sigma === -1 ? '−' : ''}(x ${a < 0 ? '+' : '−'} ${Math.abs(a) || 0})²(x ${b < 0 ? '+' : '−'} ${Math.abs(b) || 0})`.replace(/x [+−] 0/g, 'x');
  return { kind: 'trap', ask, f, fp, fpp, text, crit: [a, b], lo: -5, hi: 5, ans: b, start: -5, assist: 0 };
}

function campRound(wantEnd: boolean | null, random: () => number): Round {
  for (;;) {
    const [p, q] = roots(random);
    const g = cubic(p, q, 1, ri(-3, 3, random));
    const lo = ri(-5, p, random);
    const hi = ri(q, 5, random);
    const ask: Ask = pick(['highest', 'lowest'], random);
    const cand = [lo, hi, ...[p, q].filter((x) => x > lo && x < hi)];
    const vals = cand.map(g.f);
    const best = ask === 'highest' ? Math.max(...vals) : Math.min(...vals);
    const winners = cand.filter((_, i) => vals[i] === best);
    if (winners.length !== 1) continue;
    const atEnd = winners[0] === lo || winners[0] === hi;
    if (wantEnd !== null && atEnd !== wantEnd) continue;
    const ans = winners[0];
    // The start is drawn from the other positions at random, so it says nothing about the answer except that it is not the answer.
    const others = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((x) => x !== ans);
    return { kind: 'camp', ask, ...g, crit: [p, q], lo, hi, ans, start: pick(others, random), assist: 0 };
  }
}

export function buildRounds(level: number, random: () => number): Round[] {
  let rs: Round[];
  if (level === 1) rs = [localRound('peak', 1, random), localRound('valley', 1, random), localRound('peak', -1, random)];
  else if (level === 2) rs = [trapRound(random), trapRound(random), trapRound(random)];
  else {
    // Every level has an interior answer and an end-point answer, in an order the seed chooses; the third round is either.
    const kinds = shuffle([false, true, random() < 0.5], random);
    rs = kinds.map((wantEnd) => campRound(wantEnd, random));
  }
  return rs.map((r, i) => ({ ...r, start: r.start === r.ans ? r.hi : r.start, assist: aid(i) }));
}

export const judge = (r: Round, x: number) => x === r.ans;

const WHAT: Record<Ask, string> = { peak: 'the top of a hill', valley: 'the bottom of a valley', highest: 'the highest ground on the walk', lowest: 'the lowest ground on the walk' };
export const askText = (r: Round) => WHAT[r.ask];
const dir = (s: number) => (s > 0 ? 'climbing' : s < 0 ? 'falling' : 'flat');

/**
 * After a miss: what the bird found at the flag, in words only. It never prints the height or the slope (a paid survey does that) and never the right position.
 */
export function missText(r: Round, x: number): string {
  if (r.kind === 'camp') return `Pika camped at ${x}, but ${r.ask === 'highest' ? 'higher' : 'lower'} ground could be reached elsewhere on the walk, so the camp was moved.`;
  const s = r.fp(x);
  if (s !== 0) return `At the flag the ground is still ${dir(s)}, so it is not ${r.ask === 'peak' ? 'a hilltop' : 'a valley floor'}.`;
  const before = r.fp(x - 0.5);
  const after = r.fp(x + 0.5);
  if (before * after > 0) return `At the flag the ground is level, but it was ${before > 0 ? 'climbing' : 'falling'} just before and just after: it only flattens for a moment and keeps ${before > 0 ? 'climbing' : 'falling'}.`;
  return `At the flag the ground is level and it turns from ${before > 0 ? 'climbing to falling: a hilltop' : 'falling to climbing: a valley floor'}. That is the other kind of turning point.`;
}
export function spotText(r: Round, x: number): string {
  return `Survey at x = ${x}: ground height ${num(r.f(x))}, slope ${num(r.fp(x))}.`;
}

/** After a hit: the working. */
export function explain(r: Round): string {
  if (r.kind === 'local') {
    const [p, q] = r.crit;
    const sign = (x: number) => r.fpp(x) < 0 ? 'f″ < 0, a local maximum' : 'f″ > 0, a local minimum';
    return `f′(x) = 0 at x = ${p} and x = ${q}. f″(${p}) = ${num(r.fpp(p))} (${sign(p)}) and f″(${q}) = ${num(r.fpp(q))} (${sign(q)}), so ${r.ask === 'peak' ? 'the hilltop' : 'the valley floor'} is at x = ${r.ans}.`;
  }
  if (r.kind === 'trap') {
    const [a, b] = r.crit;
    return `f′ = 0 at x = ${a} and x = ${b}. The factor (x − ${a})² never changes sign, so f′ keeps its sign through ${a}: that is a flat spot, not a peak or valley. At x = ${b} the sign changes, so the only turning point is x = ${b} (f″(${b}) = ${num(r.fpp(b))}).`;
  }
  const cand = [r.lo, r.hi, ...r.crit.filter((x) => x > r.lo && x < r.hi)];
  return `On [${r.lo}, ${r.hi}] compare f at the end points and the critical points: ${cand.map((x) => `f(${x}) = ${num(r.f(x))}`).join(', ')}. The ${r.ask === 'highest' ? 'largest' : 'smallest'} is at x = ${r.ans}.`;
}
export function intel(r: Round): string {
  if (r.kind === 'local') return `The ground is ${r.text}. Plant the flag at ${askText(r)}.`;
  if (r.kind === 'trap') return `The slope of the ground is ${r.text}. It is zero at two places, but only one is a real ${r.ask === 'peak' ? 'hilltop' : 'valley floor'}. Plant the flag there.`;
  return `The ground is ${r.text}, and Pika may only walk from x = ${r.lo} to x = ${r.hi}. Plant the camp at ${askText(r)}.`;
}
