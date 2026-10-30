// Pure rules of Turf War: no DOM, no canvas. Inky the paint-roller squid kid drags the edge of a turf to a whole-number setting v so the paint laid between
// the curve and the x-axis is exactly the area the turf needs. Paint counts as area, so the part below the axis is paint too (not a negative).
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'ellipse' | 'line' | 'sine' | 'cubic';
export interface Round {
  kind: Kind;
  /** The turf: ellipse [a]; line y = m(x − s) from x = 0 [m, s]; sine y = a·sin x from x = 0 [a]; cubic y = k·x³ from x = −p [k, p]. */
  p: number[];
  /** The area the turf needs, the winning setting, and the dial range. */
  T: number;
  ans: number;
  min: number;
  max: number;
  start: number;
  assist: 0 | 1 | 2;
}

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));

/** The area painted at setting v. For the ellipse it is counted in units of π. */
export function area(r: Round, v: number): number {
  const [a, b] = r.p;
  if (r.kind === 'ellipse') return a * v;
  if (r.kind === 'line') return v <= b ? a * (b * v - (v * v) / 2) : (a * b * b) / 2 + (a * (v - b) ** 2) / 2;
  if (r.kind === 'sine') return a * v;
  return (a * (b ** 4 + v ** 4)) / 4;
}
/** The signed integral over the same stretch, which is the wrong thing to count (NaN for the ellipse). */
export function signed(r: Round, v: number): number {
  const [a, b] = r.p;
  if (r.kind === 'line') return a * ((v * v) / 2 - b * v);
  if (r.kind === 'sine') return a * [0, 1, 2, 1][v % 4];
  if (r.kind === 'cubic') return (a * (v ** 4 - b ** 4)) / 4;
  return Number.NaN;
}
/** The curve itself, for drawing. */
export function height(r: Round, x: number): number {
  const [a, b] = r.p;
  if (r.kind === 'line') return a * (x - b);
  if (r.kind === 'sine') return a * Math.sin(x);
  if (r.kind === 'cubic') return a * x ** 3;
  return 0;
}

function make(kind: Kind, random: () => number): Round {
  if (kind === 'ellipse') {
    const a = ri(2, 6, random);
    const ans = ri(1, 8, random);
    return { kind, p: [a], T: a * ans, ans, min: 0, max: 8, start: 0, assist: 0 };
  }
  if (kind === 'line') {
    const m = pick([2, 4], random);
    const s = ri(1, 3, random);
    const ans = ri(s + 1, 9, random);
    const r: Round = { kind, p: [m, s], T: 0, ans, min: 0, max: 9, start: 0, assist: 0 };
    return { ...r, T: area(r, ans) };
  }
  if (kind === 'sine') {
    const a = ri(1, 3, random);
    const ans = ri(3, 8, random);
    return { kind, p: [a], T: a * ans, ans, min: 0, max: 8, start: 0, assist: 0 };
  }
  const k = pick([4, 8], random);
  const p = ri(2, 3, random);
  const ans = ri(1, 4, random);
  const r: Round = { kind, p: [k, p], T: 0, ans, min: 0, max: 4, start: 0, assist: 0 };
  return { ...r, T: area(r, ans) };
}

export function buildRounds(level: number, random: () => number): Round[] {
  const kind: Kind = (['ellipse', 'line', 'sine', 'cubic'] as const)[level - 1];
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    let r = make(kind, random);
    for (let t = 0; t < 50 && out.some((o) => o.p.join() === r.p.join() && o.ans === r.ans); t++) r = make(kind, random);
    out.push({ ...r, assist: aid(i) });
  }
  return out;
}

export const judge = (r: Round, v: number) => area(r, v) === r.T;
const unit = (r: Round) => (r.kind === 'ellipse' ? 'π' : '');
export const show = (r: Round, x: number) => `${num(x)}${unit(r)}`;

/** The turf in words. */
export function intel(r: Round): string {
  const [a, b] = r.p;
  const need = `The turf needs exactly ${show(r, r.T)} of paint.`;
  if (r.kind === 'ellipse') return `The turf is the ellipse x²/${a * a} + y²/b² = 1, and the roller drags its top to height b. ${need}`;
  if (r.kind === 'line') return `The turf lies between y = ${a}(x − ${b}) and the x-axis, from x = 0 to the roller. ${need}`;
  if (r.kind === 'sine') return `The turf lies between y = ${a === 1 ? '' : a}sin x and the x-axis, from x = 0 to the roller, which stops at quarter waves of π/2. ${need}`;
  return `The turf lies between y = ${a}x³ and the x-axis, from x = −${b} to the roller. ${need}`;
}

/** An ink-gauge test: how much paint is down at this setting, never the right setting. */
export const spotText = (r: Round, v: number) => `Ink gauge at ${r.kind === 'sine' ? `${v} quarter waves` : `${v}`}: ${show(r, area(r, v))} of paint is down.`;

/** After a miss: what was painted, which way it is off, and the signed-integral slip when that is what happened. */
export function missText(r: Round, v: number): string {
  const got = area(r, v);
  const side = got < r.T ? 'bare patches are left' : 'paint spilled onto the rival’s turf';
  const slip = Number.isFinite(signed(r, v)) && signed(r, v) === r.T ? ' You counted the stretch below the axis as negative paint: it is still turf, so it adds to the area.' : '';
  return `The roller laid ${show(r, got)} but the turf needs ${show(r, r.T)}: ${side}.${slip}`;
}

/** After a hit: the working. */
export function explain(r: Round): string {
  const [a, b] = r.p;
  if (r.kind === 'ellipse') return `The ellipse has area πab = π·${a}·${r.ans} = ${r.T}π (four times the first quadrant, 4∫₀^${a} b√(1 − x²/${a * a}) dx).`;
  if (r.kind === 'line') return `The line crosses the axis at x = ${b}. Below it the area is ${(a * b * b) / 2}, above it ${(a * (r.ans - b) ** 2) / 2}: add them, ${r.T}. (The signed integral would be ${num(signed(r, r.ans))}.)`;
  if (r.kind === 'sine') return `Each quarter wave of ${a === 1 ? '' : a}sin x has area ${a}, so ${r.ans} quarter waves give ${a}·${r.ans} = ${r.T}. (The signed integral cancels whenever the wave goes below the axis.)`;
  return `${a}x³ is below the axis for x < 0. Area = ∫ from −${b} to 0 of |${a}x³| + ∫ from 0 to ${r.ans} of ${a}x³ = ${(a * b ** 4) / 4} + ${(a * r.ans ** 4) / 4} = ${r.T}. (The signed integral would be ${num(signed(r, r.ans))}.)`;
}
