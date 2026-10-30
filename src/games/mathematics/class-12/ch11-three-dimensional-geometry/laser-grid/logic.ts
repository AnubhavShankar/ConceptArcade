// Pure rules of Laser Grid: no DOM, no canvas. Lux the laser technician aims beams in 3D. Level 1: set the direction cosines of a beam (as numerators over a
// given denominator) so it points at a target. Level 2: set one direction ratio so a second beam is perpendicular to a first. Level 3: set one direction ratio
// so two beams make a given angle. Level 4: set an offset so two skew beams clear each other by a given distance.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'cosines' | 'perp' | 'angle' | 'skew';
export type V3 = [number, number, number];
export interface Round {
  kind: Kind;
  /** cosines: the target T (a multiple of the direction) and the denominator N. perp/angle: the first beam a and the second beam b with its free part. skew: the two directions and the offset between the beams. */
  a: V3;
  b: V3;
  /** Which part of b is the dial (perp: 0, angle: 2). */
  free: number;
  /** cosines: the denominator N. angle: cos θ as a fraction cn/cd. skew: the clearance wanted. */
  N: number;
  cn: number;
  cd: number;
  T: number;
  /** skew: the offset between a point of each beam, with the dial in its third part. */
  off: V3;
  ans: number[];
  min: number;
  max: number;
  start: number[];
  assist: 0 | 1 | 2;
}

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
const nz = (lo: number, hi: number, random: () => number) => {
  let v = 0;
  while (v === 0) v = ri(lo, hi, random);
  return v;
};
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const blank = { a: [0, 0, 0] as V3, b: [0, 0, 0] as V3, free: 0, N: 0, cn: 0, cd: 1, T: 0, off: [0, 0, 0] as V3, ans: [0], min: -9, max: 9, start: [0], assist: 0 as const };
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Whole-number triples whose length is a whole number: the cosines come out as clean fractions. */
const TRIPLES: V3[] = [[1, 2, 2], [2, 3, 6], [3, 4, 12], [2, -1, 2], [4, 4, 7], [1, 4, 8], [6, 6, 7], [2, 6, 9], [2, -3, 6], [-2, 1, 2], [3, -4, 12], [4, -4, 7]];

function cosines(random: () => number): Round {
  const prim = pick(TRIPLES, random);
  const k = ri(1, 3, random);
  return { ...blank, kind: 'cosines', a: [prim[0] * k, prim[1] * k, prim[2] * k], N: norm(prim), ans: [...prim], min: -12, max: 12, start: [0, 0, 0] };
}

function perp(random: () => number): Round {
  for (;;) {
    const a: V3 = [nz(-3, 3, random), nz(-3, 3, random), nz(-3, 3, random)];
    const b: V3 = [0, nz(-4, 4, random), nz(-4, 4, random)];
    const p = -(a[1] * b[1] + a[2] * b[2]) / a[0];
    if (!Number.isInteger(p) || p === 0 || Math.abs(p) > 9) continue;
    return { ...blank, kind: 'perp', a, b, free: 0, ans: [p], min: -9, max: 9, start: [0] };
  }
}

function angle(random: () => number): Round {
  for (;;) {
    const a = pick(TRIPLES, random);
    const b: V3 = [ri(1, 6, random), ri(1, 6, random), 0];
    const p = ri(1, 12, random);
    const nb = Math.hypot(b[0], b[1], p);
    const d = dot(a, [b[0], b[1], p]);
    if (d <= 0 || !Number.isInteger(nb)) continue;
    const cn = d;
    const cd = norm(a) * nb;
    const g = gcd(cn, cd);
    const r: Round = { ...blank, kind: 'angle', a, b, free: 2, cn: cn / g, cd: cd / g, ans: [p], min: 0, max: 12, start: [0] };
    const wins = Array.from({ length: 13 }, (_, l) => l).filter((l) => l > 0 && Math.abs(cosOf(r, l) - r.cn / r.cd) < 1e-12);
    if (wins.length !== 1) continue;
    return r;
  }
}
/** cos θ between the beams for setting l (angle). */
export const cosOf = (r: Round, l: number) => {
  const b: V3 = [r.b[0], r.b[1], l];
  const nb = norm(b);
  return nb === 0 ? Number.NaN : dot(r.a, b) / (norm(r.a) * nb);
};

function skew(random: () => number): Round {
  for (;;) {
    const a: V3 = [ri(-3, 3, random), ri(-3, 3, random), ri(-3, 3, random)];
    const b: V3 = [ri(-3, 3, random), ri(-3, 3, random), ri(-3, 3, random)];
    const n = cross(a, b);
    const n2 = dot(n, n);
    if (n2 === 0 || n[2] === 0 || !Number.isInteger(Math.sqrt(n2))) continue;
    const u = ri(-3, 3, random);
    const v = ri(-3, 3, random);
    const h = ri(1, 9, random);
    const T = Math.abs(u * n[0] + v * n[1] + h * n[2]) / Math.sqrt(n2);
    if (!Number.isInteger(T) || T === 0) continue;
    const r: Round = { ...blank, kind: 'skew', a, b, off: [u, v, 0], T, ans: [h], min: 0, max: 9, start: [0] };
    const wins = Array.from({ length: 10 }, (_, l) => l).filter((l) => Math.abs(clearance(r, l) - T) < 1e-9);
    if (wins.length !== 1) continue;
    return r;
  }
}
/** The shortest distance between the two beams for setting l (skew). */
export const clearance = (r: Round, l: number) => {
  const n = cross(r.a, r.b);
  return Math.abs(dot([r.off[0], r.off[1], l], n)) / norm(n);
};

export function buildRounds(level: number, random: () => number): Round[] {
  const make = level === 1 ? cosines : level === 2 ? perp : level === 3 ? angle : skew;
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    let r = make(random);
    for (let t = 0; t < 80 && out.some((o) => o.a.join() === r.a.join() && o.b.join() === r.b.join() && o.off.join() === r.off.join()); t++) r = make(random);
    out.push({ ...r, start: r.ans.map((x) => (x === 0 ? 1 : 0)), assist: aid(i) });
  }
  return out;
}

export const judge = (r: Round, v: number[]) => r.ans.every((x, i) => x === v[i]);
const vec = (p: V3) => `(${num(p[0])}, ${num(p[1])}, ${num(p[2])})`;
const one = (x: number) => num(Math.round(x * 100) / 100);

export function intel(r: Round): string {
  if (r.kind === 'cosines') return `The target is at ${vec(r.a)}. Aim the beam at it: set the direction cosines as the numerators over ${r.N}, so the beam is (l, m, n) = (p, q, r)/${r.N}.`;
  if (r.kind === 'perp') return `Beam 1 runs with direction ratios ${vec(r.a)}. Beam 2 runs with ratios (p, ${num(r.b[1])}, ${num(r.b[2])}). They must be perpendicular. Set p.`;
  if (r.kind === 'angle') return `Beam 1 has ratios ${vec(r.a)}; beam 2 has ratios (${r.b[0]}, ${r.b[1]}, c). They must meet at an angle whose cosine is exactly ${r.cn}/${r.cd}. Set c.`;
  return `Beam 1 has direction ${vec(r.a)}; beam 2 has direction ${vec(r.b)}. A point of beam 2 is offset from a point of beam 1 by (${num(r.off[0])}, ${num(r.off[1])}, h). They must clear each other by exactly ${num(r.T)}. Set h.`;
}

/** A test reading for a setting, never the setting that wins. */
export function spotText(r: Round, v: number[]): string {
  if (r.kind === 'cosines') {
    const len = Math.hypot(v[0], v[1], v[2]);
    return `Check: the numbers (${v.map(num).join(', ')}) over ${r.N} have length ${one(len / r.N)} (a real direction needs length 1), and ${cross(r.a, v as V3).every((x) => x === 0) ? 'point along the target' : 'do not point along the target'}.`;
  }
  if (r.kind === 'perp') return `Check with p = ${num(v[0])}: the dot product of the two beams is ${num(dot(r.a, [v[0], r.b[1], r.b[2]]))}.`;
  if (r.kind === 'angle') return `Check with c = ${num(v[0])}: the cosine of the angle between the beams is ${one(cosOf(r, v[0]))}.`;
  return `Check with h = ${num(v[0])}: the beams clear each other by ${one(clearance(r, v[0]))}.`;
}
/** After a miss. */
export function missText(r: Round, v: number[]): string {
  if (r.kind === 'cosines') {
    const len = Math.hypot(v[0], v[1], v[2]) / r.N;
    const par = cross(r.a, v as V3).every((x) => x === 0) && dot(r.a, v as V3) > 0;
    if (!par) return 'The beam misses the target: it does not point along the line from the emitter to the target.';
    return `The beam points at the target but its numbers over ${r.N} give a length of ${one(len)}, not 1: they are not direction cosines.`;
  }
  if (r.kind === 'perp') return `The beams cross at a dot product of ${num(dot(r.a, [v[0], r.b[1], r.b[2]]))}, not 0, so they are not at a right angle.`;
  if (r.kind === 'angle') return `The cosine of the angle between the beams is ${one(cosOf(r, v[0]))}, ${cosOf(r, v[0]) > r.cn / r.cd ? 'above' : 'below'} the ${r.cn}/${r.cd} wanted.`;
  return `The beams clear each other by ${one(clearance(r, v[0]))}, ${clearance(r, v[0]) > r.T ? 'more' : 'less'} than the ${num(r.T)} wanted.`;
}
/** After a hit. */
export function explain(r: Round): string {
  if (r.kind === 'cosines') return `The length of ${vec(r.a)} is ${one(norm(r.a))}. Divide by it: the cosines are ${vec(r.ans as V3)}/${r.N}, and their squares add to 1.`;
  if (r.kind === 'perp') return `Perpendicular beams have a₁b₁ + a₂b₂ + a₃b₃ = 0: ${r.a[0]}p + ${num(r.a[1] * r.b[1] + r.a[2] * r.b[2])} = 0, so p = ${num(r.ans[0])}.`;
  if (r.kind === 'angle') return `cos θ = (a·b)/(|a||b|). With c = ${r.ans[0]}: ${num(dot(r.a, [r.b[0], r.b[1], r.ans[0]]))}/(${one(norm(r.a))}·${one(norm([r.b[0], r.b[1], r.ans[0]]))}) = ${r.cn}/${r.cd}.`;
  const n = cross(r.a, r.b);
  return `d = |(a₂ − a₁)·(b₁ × b₂)| / |b₁ × b₂|, with b₁ × b₂ = ${vec(n)} of length ${one(norm(n))}. h = ${r.ans[0]} gives d = ${num(r.T)}.`;
}
