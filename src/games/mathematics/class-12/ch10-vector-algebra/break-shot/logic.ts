// Pure rules of Break Shot: no DOM, no canvas. Cue the pool player sends the cue ball along a vector. The object ball runs along o = (a, b). The cue ball
// leaves along r = (λ, k) with k given and λ set by the player. Level 1: the paths must be at a right angle (dot product 0). Level 2: the dot product must be a
// given number. Level 3: the shadow (projection) of r on the rail direction u must have a given length.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'perp' | 'dot' | 'proj';
export type Pt = [number, number];
export interface Round {
  kind: Kind;
  /** The object ball's path o, the fixed part k of the cue ball's path r = (λ, k), and the rail direction u (proj). */
  o: Pt;
  k: number;
  u: Pt;
  /** The dot product wanted (dot) or the shadow length wanted (proj). */
  T: number;
  ans: number;
  min: number;
  max: number;
  start: number;
  assist: 0 | 1 | 2;
}

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
const nz = (lo: number, hi: number, random: () => number) => {
  let v = 0;
  while (v === 0) v = ri(lo, hi, random);
  return v;
};
const blank = { o: [0, 0] as Pt, k: 0, u: [0, 0] as Pt, T: 0, ans: 0, min: -12, max: 12, start: 0, assist: 0 as const };
const dotp = (p: Pt, q: Pt) => p[0] * q[0] + p[1] * q[1];
const len = (p: Pt) => Math.hypot(p[0], p[1]);

function perp(random: () => number): Round {
  for (;;) {
    const o: Pt = [nz(-4, 4, random), nz(-4, 4, random)];
    const k = nz(-6, 6, random);
    const l = (-o[1] * k) / o[0];
    if (!Number.isInteger(l) || l === 0 || Math.abs(l) > 12) continue;
    return { ...blank, kind: 'perp', o, k, ans: l, start: l === 0 ? 1 : 0 };
  }
}
function dot(random: () => number): Round {
  for (;;) {
    const o: Pt = [nz(-4, 4, random), nz(-4, 4, random)];
    const k = nz(-6, 6, random);
    const l = nz(-8, 8, random);
    const T = o[0] * l + o[1] * k;
    if (T === 0 || Math.abs(T) > 40) continue;
    return { ...blank, kind: 'dot', o, k, T, ans: l };
  }
}
const RAILS: Pt[] = [[3, 4], [4, 3], [-3, 4], [4, -3], [5, 12], [12, 5], [-5, 12], [12, -5]];
function proj(random: () => number): Round {
  for (;;) {
    const u = pick(RAILS, random);
    const l = nz(-8, 8, random);
    const k = nz(-6, 6, random);
    const s = dotp(u, [l, k]) / len(u);
    if (!Number.isInteger(s) || s === 0) continue;
    return { ...blank, kind: 'proj', o: [1, 1], k, u, T: s, ans: l };
  }
}

export function buildRounds(level: number, random: () => number): Round[] {
  const make = level === 1 ? perp : level === 2 ? dot : proj;
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    let r = make(random);
    for (let t = 0; t < 50 && out.some((o) => o.ans === r.ans && o.k === r.k && o.o.join() === r.o.join() && o.u.join() === r.u.join()); t++) r = make(random);
    // One constant start for every round (no answer is 0: the generators refuse it), so the start tells nothing and never wins.
    out.push({ ...r, start: 0, assist: aid(i) });
  }
  return out;
}

export const judge = (r: Round, l: number) => l === r.ans;
/** The cue ball's path for setting λ. */
export const cuePath = (r: Round, l: number): Pt => [l, r.k];
/** The number the shot makes: the dot product (perp, dot) or the length of the shadow on the rail (proj). */
export function measure(r: Round, l: number): number {
  const c = cuePath(r, l);
  return r.kind === 'proj' ? dotp(c, r.u) / len(r.u) : dotp(c, r.o);
}
/** The angle between the two paths in degrees. */
export const angle = (r: Round, l: number) => {
  const c = cuePath(r, l);
  return (Math.acos(Math.max(-1, Math.min(1, dotp(c, r.o) / (len(c) * len(r.o))))) * 180) / Math.PI;
};

const one = (x: number) => num(Math.round(x * 10) / 10);
const vec = (p: Pt) => `(${num(p[0])}, ${num(p[1])})`;
export function intel(r: Round): string {
  if (r.kind === 'perp') return `The object ball runs along ${vec(r.o)}. After the hit the cue ball must leave along (λ, ${num(r.k)}), at a right angle to it. Set λ.`;
  if (r.kind === 'dot') return `The object ball runs along ${vec(r.o)} and the cue ball leaves along (λ, ${num(r.k)}). The energy passed on is the dot product of the two paths, and it must be exactly ${num(r.T)}. Set λ.`;
  return `The cue ball leaves along (λ, ${num(r.k)}). Its shadow on the rail, which runs along ${vec(r.u)}, must be exactly ${num(r.T)} long (it can be negative if it points back). Set λ.`;
}
/** A meter reading at a setting, never the setting that wins. */
export function spotText(r: Round, l: number): string {
  if (r.kind === 'perp') return `Protractor with λ = ${num(l)}: the angle between the two paths is ${one(angle(r, l))}°.`;
  if (r.kind === 'dot') return `Energy meter with λ = ${num(l)}: the dot product of the two paths is ${num(measure(r, l))}.`;
  return `Shadow meter with λ = ${num(l)}: the shadow on the rail is ${one(measure(r, l))}.`;
}
/** After a miss: the direction of the error only, never a number (the meter, which costs a charge, gives the numbers) and never the right λ. */
export function missText(r: Round, l: number): string {
  const m = measure(r, l);
  if (r.kind === 'perp') return `The paths met at ${m > 0 ? 'less' : 'more'} than a right angle, so the cue ball scratched.`;
  if (r.kind === 'dot') return `The dot product of the paths came out ${m > r.T ? 'greater' : 'smaller'} than the number wanted.`;
  return `The shadow on the rail came out ${m > r.T ? 'greater' : 'smaller'} than the length wanted.`;
}
/** After a hit: the working. */
export function explain(r: Round): string {
  if (r.kind === 'perp') return `At a right angle the dot product is 0: ${r.o[0]}·λ + ${num(r.o[1])}·${num(r.k)} = 0, so λ = ${num(r.ans)}.`;
  if (r.kind === 'dot') return `Dot product = ${r.o[0]}·λ + ${num(r.o[1])}·${num(r.k)} = ${num(r.T)}, so λ = ${num(r.ans)}.`;
  const n = len(r.u);
  return `Shadow = (r·u)/|u| = (${r.u[0]}·λ + ${num(r.u[1])}·${num(r.k)})/${n} = ${num(r.T)}, so λ = ${num(r.ans)}.`;
}
