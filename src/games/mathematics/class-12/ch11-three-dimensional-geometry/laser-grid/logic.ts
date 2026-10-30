// Pure rules of Laser Grid: no DOM, no canvas. Lux the laser technician aims beams in 3D. Level 1: set the direction cosines of a beam (as numerators over a
// given denominator) so it points at a target. Level 2: set one direction ratio so a second beam is perpendicular to a first. Level 3: set one direction ratio
// so two beams make a given angle. Level 4: set an offset so two skew beams clear each other by a given distance. Level 5: the beam runs on r = a + λb from
// relay A and must pass relay B at a given tick, so set b. Level 6: read a and b out of a cartesian code, with the code's own λ.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'cosines' | 'perp' | 'angle' | 'skew' | 'relay' | 'code';
export type V3 = [number, number, number];
export interface Round {
  kind: Kind;
  /** relay: the emitter relay A, the target relay B and the tick lam at which the beam passes B (so b = (B − A)/lam). code: the cartesian code of the line. */
  A?: V3;
  B?: V3;
  lam?: number;
  code?: string;
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

/** Level 5: [A, B, tick at which B is reached]; b = (B − A)/tick. One pool per round, the last is the boss (B is reached at tick 2). */
const RELAY: [V3, V3, number][][] = [
  [[[0, 0, 0], [2, 3, 6], 1], [[0, 0, 0], [1, -2, 4], 1], [[0, 0, 0], [3, 1, -2], 1], [[0, 0, 0], [-2, 4, 5], 1]],
  [[[1, 2, -1], [4, -1, 3], 1], [[-2, 0, 3], [1, 5, -1], 1], [[2, -3, 1], [-1, 1, 6], 1], [[0, 4, -2], [5, 1, 2], 1]],
  [[[1, -1, 2], [7, 3, -4], 2], [[-3, 2, 0], [1, -6, 6], 2], [[2, 5, -1], [-4, 1, 7], 2]],
];
function relay(i: number, random: () => number): Round {
  const [A, B, lam] = pick(RELAY[i], random);
  const b = B.map((x, j) => (x - A[j]) / lam) as V3;
  return { ...blank, kind: 'relay', A, B, lam, a: A, b, ans: [...b], min: -9, max: 9, start: [0, 0, 0] };
}

/** Level 6: [cartesian code, a, b] where every ratio of the code equals λ at the point a + λb. One pool per round; the boss codes have reversed signs such as (3 − x)/2. */
const CODE: [string, V3, V3][][] = [
  [['(x − 2)/3 = (y + 1)/4 = (z − 5)/2', [2, -1, 5], [3, 4, 2]], ['(x + 3)/2 = (y − 4)/(−1) = (z − 1)/5', [-3, 4, 1], [2, -1, 5]], ['(x − 1)/4 = (y − 6)/3 = (z + 2)/(−2)', [1, 6, -2], [4, 3, -2]]],
  [['x/2 = (y − 3)/(−5) = (z + 4)/1', [0, 3, -4], [2, -5, 1]], ['(x + 1)/3 = y/4 = (z − 2)/(−6)', [-1, 0, 2], [3, 4, -6]], ['(x − 4)/(−3) = (y + 2)/2 = z/7', [4, -2, 0], [-3, 2, 7]]],
  [['(3 − x)/2 = (y − 1)/(−5) = (4 − z)/1', [3, 1, 4], [-2, -5, -1]], ['(1 − x)/3 = (y + 2)/4 = (5 − z)/2', [1, -2, 5], [-3, 4, -2]], ['(x + 2)/1 = (4 − y)/3 = (z + 1)/(−2)', [-2, 4, -1], [1, -3, -2]]],
];
function code(i: number, random: () => number): Round {
  const [c, a, b] = pick(CODE[i], random);
  return { ...blank, kind: 'code', code: c, a, b, ans: [...a, ...b], min: -9, max: 9, start: [0, 0, 0, 0, 0, 0] };
}

export function buildRounds(level: number, random: () => number): Round[] {
  const make = (i: number) => (level === 5 ? relay(i, random) : level === 6 ? code(i, random) : (level === 1 ? cosines : level === 2 ? perp : level === 3 ? angle : skew)(random));
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    let r = make(i);
    for (let t = 0; t < 80 && out.some((o) => o.a.join() === r.a.join() && o.b.join() === r.b.join() && o.off.join() === r.off.join()); t++) r = make(i);
    // Every dial starts at 0 in every level: a start that moved where the answer is 0 would show which parts are zero. No answer of levels 1 to 4 is 0
    // in every part, so the start never wins (the logic test scans it).
    out.push({ ...r, start: r.ans.map(() => 0), assist: aid(i) });
  }
  return out;
}

export const judge = (r: Round, v: number[]) => r.ans.every((x, i) => x === v[i]);
const vec = (p: V3) => `(${num(p[0])}, ${num(p[1])}, ${num(p[2])})`;
const pt = vec;
const one = (x: number) => num(Math.round(x * 100) / 100);
/** A vector in unit-vector form: (î + 2ĵ − k̂). */
const ijk = (p: V3) => {
  let s = '';
  p.forEach((c, i) => {
    if (c === 0) return;
    const body = `${Math.abs(c) === 1 ? '' : Math.abs(c)}${['î', 'ĵ', 'k̂'][i]}`;
    s += s === '' ? `${c < 0 ? '−' : ''}${body}` : ` ${c < 0 ? '−' : '+'} ${body}`;
  });
  return s === '' ? '0' : `(${s})`;
};
/** The cartesian form through A with direction b: (x − 1)/3 = (y − 2)/(−3) = (z + 1)/4, and x alone for a zero coordinate. */
const cart = (A: V3, b: V3) =>
  [0, 1, 2].map((i) => `${A[i] === 0 ? 'xyz'[i] : `(${'xyz'[i]} ${A[i] < 0 ? '+' : '−'} ${Math.abs(A[i])})`}/${b[i] < 0 ? `(${num(b[i])})` : b[i]}`).join(' = ');
/** Where the beam's tip is after `lam` ticks. */
export const tipAt = (A: V3, b: number[], lam: number): V3 => [A[0] + lam * b[0], A[1] + lam * b[1], A[2] + lam * b[2]];

export function intel(r: Round): string {
  if (r.kind === 'relay') return `The emitter is at relay A ${pt(r.A!)}. The beam’s tip moves by b each tick: r = a + λb. It must pass relay B ${pt(r.B!)} at tick λ = ${r.lam}. Set b.`;
  if (r.kind === 'code') return `The line’s code is ${r.code}. Set the emitter a and the step b so that x = a₁ + b₁λ, y = a₂ + b₂λ, z = a₃ + b₃λ with the code’s own λ.`;
  if (r.kind === 'cosines') return `The target is at ${vec(r.a)}. Aim the beam at it: set the direction cosines as the numerators over ${r.N}, so the beam is (l, m, n) = (p, q, r)/${r.N}.`;
  if (r.kind === 'perp') return `Beam 1 runs with direction ratios ${vec(r.a)}. Beam 2 runs with ratios (p, ${num(r.b[1])}, ${num(r.b[2])}). They must be perpendicular. Set p.`;
  if (r.kind === 'angle') return `Beam 1 has ratios ${vec(r.a)}; beam 2 has ratios (${r.b[0]}, ${r.b[1]}, c). They must meet at an angle whose cosine is exactly ${r.cn}/${r.cd}. Set c.`;
  return `Beam 1 has direction ${vec(r.a)}; beam 2 has direction ${vec(r.b)}. A point of beam 2 is offset from a point of beam 1 by (${num(r.off[0])}, ${num(r.off[1])}, h). They must clear each other by exactly ${num(r.T)}. Set h.`;
}

/** A test reading for a setting, never the setting that wins. */
export function spotText(r: Round, v: number[]): string {
  if (r.kind === 'relay') return `Test pulse: after tick ${r.lam} the tip would be at ${pt(tipAt(r.A!, v, r.lam!))}.`;
  if (r.kind === 'code') return `Test pulse: the beam would start at ${pt(v.slice(0, 3) as V3)} and step by ${pt(v.slice(3) as V3)} each tick.`;
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
  if (r.kind === 'relay') return `At tick ${r.lam} the beam’s tip was at ${pt(tipAt(r.A!, v, r.lam!))}, not at relay B: it missed the ring and hit the wall.`;
  if (r.kind === 'code') {
    // Only which part of the code is off; never the value that fits.
    const i = r.ans.findIndex((x, j) => x !== v[j]);
    if (i < 0) return 'The beam missed the receiver.';
    return i < 3
      ? `The emitter is not where the code puts the line at λ = 0 (check the ${'xyz'[i]} part): the beam missed the receiver.`
      : `The beam set off in a direction the code does not give (check the ${'xyz'[i - 3]} part): it missed the receiver.`;
  }
  // Levels 1 to 4: the direction of the error only, never a reading (the paid check gives the numbers). Level 1 has one text for every miss: a
  // text that said "right direction, wrong length" would hand over the paid check.
  if (r.kind === 'cosines') return `The beam missed the target: the numbers over ${r.N} must point along the line from the emitter to the target and also make a unit vector, and these did not do both.`;
  if (r.kind === 'perp') return `The beams crossed at ${dot(r.a, [v[0], r.b[1], r.b[2]]) > 0 ? 'less' : 'more'} than a right angle, so they are not perpendicular.`;
  if (r.kind === 'angle') return `The cosine of the angle between the beams came out ${cosOf(r, v[0]) > r.cn / r.cd ? 'above' : 'below'} the one wanted.`;
  return `The beams cleared each other by ${clearance(r, v[0]) > r.T ? 'more' : 'less'} than the distance wanted.`;
}
/** After a hit. */
export function explain(r: Round): string {
  if (r.kind === 'relay') {
    const b = r.ans as V3;
    const A = r.A!;
    return `b = (B − A)/${r.lam} = ${pt(b)}, so the line is r = ${A.every((x) => x === 0) ? '' : `${ijk(A)} + `}λ${ijk(b)}, or ${cart(A, b)}.`;
  }
  if (r.kind === 'code') {
    const [a1, a2, a3, b1, b2, b3] = r.ans;
    return `Each ratio equals λ: x = ${num(a1)} + (${num(b1)})λ, y = ${num(a2)} + (${num(b2)})λ, z = ${num(a3)} + (${num(b3)})λ, so a = ${pt([a1, a2, a3])}, b = ${pt([b1, b2, b3])} and r = ${ijk([a1, a2, a3])} + λ${ijk([b1, b2, b3])}.`;
  }
  if (r.kind === 'cosines') return `The length of ${vec(r.a)} is ${one(norm(r.a))}. Divide by it: the cosines are ${vec(r.ans as V3)}/${r.N}, and their squares add to 1.`;
  if (r.kind === 'perp') return `Perpendicular beams have a₁b₁ + a₂b₂ + a₃b₃ = 0: ${r.a[0]}p + ${num(r.a[1] * r.b[1] + r.a[2] * r.b[2])} = 0, so p = ${num(r.ans[0])}.`;
  if (r.kind === 'angle') return `cos θ = (a·b)/(|a||b|). With c = ${r.ans[0]}: ${num(dot(r.a, [r.b[0], r.b[1], r.ans[0]]))}/(${one(norm(r.a))}·${one(norm([r.b[0], r.b[1], r.ans[0]]))}) = ${r.cn}/${r.cd}.`;
  const n = cross(r.a, r.b);
  return `d = |(a₂ − a₁)·(b₁ × b₂)| / |b₁ × b₂|, with b₁ × b₂ = ${vec(n)} of length ${one(norm(n))}. h = ${r.ans[0]} gives d = ${num(r.T)}.`;
}
