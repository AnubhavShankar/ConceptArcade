// Pure rules of Field Claim: no DOM, no canvas. Posts are points on a grid. Area of a triangle = ½|x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)|, which is
// the determinant of the rows (xᵢ, yᵢ, 1), and three points are collinear exactly when it is 0.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'area' | 'collinear' | 'line';
export type Pt = [number, number];
export interface Round {
  kind: Kind;
  /** The posts. For 'area' the unknown one is A and moves along an axis; for 'collinear' it is the third post. */
  pts: Pt[];
  /** area: the deed's area, and which side of B the post must stand; collinear: which coordinate of the third post is unknown. */
  deed: number;
  axis: 'x' | 'y';
  side: 1 | -1;
  /** collinear and line: the line the posts lie on, y = m·x + c. */
  m: number;
  c: number;
  ans: Record<string, number>;
  assist: 0 | 1 | 2;
}

export const DIALS: Record<Kind, { key: string; label: string; min: number; max: number; start: number }[]> = {
  area: [{ key: 'k', label: 'Post A', min: -12, max: 12, start: 0 }],
  collinear: [{ key: 'k', label: 'Third post', min: -12, max: 12, start: 0 }],
  line: [{ key: 'm', label: 'Slope m', min: -6, max: 6, start: 0 }, { key: 'c', label: 'Intercept c', min: -12, max: 12, start: 0 }],
};
export const KINDS: Kind[] = ['area', 'collinear', 'line'];

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));

/** The determinant of the rows (x, y, 1): twice the signed area. */
export const det3 = (a: Pt, b: Pt, c: Pt) => a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]);
export const area = (a: Pt, b: Pt, c: Pt) => Math.abs(det3(a, b, c)) / 2;

/** The moving post for the dial value. */
export function movePost(r: Round, v: Record<string, number>): Pt {
  if (r.kind === 'area') return r.axis === 'x' ? [v.k, 0] : [0, v.k];
  return r.axis === 'x' ? [v.k, r.pts[2][1]] : [r.pts[2][0], v.k];
}
export function triangle(r: Round, v: Record<string, number>): [Pt, Pt, Pt] {
  const p = movePost(r, v);
  return r.kind === 'area' ? [p, r.pts[0], r.pts[1]] : [r.pts[0], r.pts[1], p];
}

function areaRound(axis: 'x' | 'y', random: () => number): Round {
  for (;;) {
    const p = ri(2, 4, random);
    const h = pick([2, 4], random);
    const d = ri(3, 8, random);
    const side = pick([1, -1], random) as 1 | -1;
    const k = p + side * d;
    if (k === 0) continue;
    const B: Pt = axis === 'x' ? [p, 0] : [0, p];
    const C: Pt = axis === 'x' ? [0, h] : [h, 0];
    return { kind: 'area', pts: [B, C], deed: (d * h) / 2, axis, side, m: 0, c: 0, ans: { k }, assist: 0 };
  }
}

function collinearRound(axis: 'x' | 'y', random: () => number): Round {
  for (;;) {
    const m = pick([-3, -2, -1, 1, 2, 3], random);
    const c = ri(-3, 3, random);
    const x1 = ri(-3, 0, random);
    const x2 = ri(1, 4, random);
    const x3 = ri(-5, 6, random);
    const third: Pt = [x3, m * x3 + c];
    const k = axis === 'x' ? third[0] : third[1];
    if (k === 0 || x3 === x1 || x3 === x2) continue;
    if ([...[[x1, m * x1 + c], [x2, m * x2 + c], third]].some(([x, y]) => Math.abs(x) > 12 || Math.abs(y) > 12)) continue;
    return { kind: 'collinear', pts: [[x1, m * x1 + c], [x2, m * x2 + c], third], deed: 0, axis, side: 1, m, c, ans: { k }, assist: 0 };
  }
}

function lineRound(random: () => number): Round {
  for (;;) {
    const m = pick([-3, -2, -1, 1, 2, 3, 4], random);
    const c = ri(-6, 6, random);
    const x1 = ri(-3, 1, random);
    const x2 = x1 + ri(1, 3, random);
    return { kind: 'line', pts: [[x1, m * x1 + c], [x2, m * x2 + c]], deed: 0, axis: 'x', side: 1, m, c, ans: { m, c }, assist: 0 };
  }
}

export function buildRounds(level: number, random: () => number): Round[] {
  const axes = ['x', 'y', 'x'] as const;
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    let r: Round;
    do r = level === 1 ? areaRound(axes[i], random) : level === 2 ? collinearRound(axes[i], random) : lineRound(random);
    while (out.some((o) => JSON.stringify(o.pts) === JSON.stringify(r.pts)));
    out.push({ ...r, assist: aid(i) });
  }
  return out;
}

/** Does the post stand on the required side of B (area level)? */
const rightSide = (r: Round, k: number) => Math.sign(k - r.pts[0][r.axis === 'x' ? 0 : 1]) === r.side;

export function judge(r: Round, v: Record<string, number>): boolean {
  if (r.kind === 'area') {
    const [a, b, c] = triangle(r, v);
    return area(a, b, c) === r.deed && rightSide(r, v.k);
  }
  if (r.kind === 'collinear') {
    const [a, b, c] = triangle(r, v);
    return det3(a, b, c) === 0;
  }
  return r.pts.every(([x, y]) => y === v.m * x + v.c);
}

const gate = (r: Round) => (r.axis === 'x' ? (r.side === 1 ? 'east' : 'west') : r.side === 1 ? 'north' : 'south');
const pt = (p: Pt) => `(${num(p[0])}, ${num(p[1])})`;

/** After a miss: what the surveyor measured, never the post that fixes it. */
export function missText(r: Round, v: Record<string, number>): string {
  if (r.kind === 'area') {
    const [a, b, c] = triangle(r, v);
    const A = area(a, b, c);
    if (A !== r.deed) return `The surveyor’s tape measured the field at ${num(A)} square units, but the deed names a different area.`;
    return `The area was right, but the post stands on the wrong side of the gate: the deed puts it to the ${gate(r)}.`;
  }
  if (r.kind === 'collinear') {
    const [a, b, c] = triangle(r, v);
    return `The three posts do not lie on one line: they make a triangle of area ${num(area(a, b, c))}, so the rope would not run straight.`;
  }
  const on = r.pts.map(([x, y]) => y === v.m * x + v.c);
  if (on[0] && !on[1]) return 'Your line passes through beacon 1 but misses beacon 2.';
  if (!on[0] && on[1]) return 'Your line passes through beacon 2 but misses beacon 1.';
  return 'Your line misses both beacons.';
}
export function spotText(r: Round, v: Record<string, number>): string {
  if (r.kind === 'line') return `Check: beacon 1 is ${r.pts[0][1] === v.m * r.pts[0][0] + v.c ? 'on' : 'off'} your line, beacon 2 is ${r.pts[1][1] === v.m * r.pts[1][0] + v.c ? 'on' : 'off'} your line.`;
  const [a, b, c] = triangle(r, v);
  return `Check: the determinant of the three posts is ${num(det3(a, b, c))}, so their area is ${num(area(a, b, c))}.`;
}

const detText = (a: Pt, b: Pt, c: Pt) => `½|${a[0]}(${b[1]} − ${c[1]}) + ${b[0]}(${c[1]} − ${a[1]}) + ${c[0]}(${a[1]} − ${b[1]})|`;
/** After a hit: the working. */
export function explain(r: Round): string {
  if (r.kind === 'area') {
    const [B, C] = r.pts;
    const d = (r.deed * 2) / (r.axis === 'x' ? C[1] : C[0]);
    return `Area = ½|x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)|. With A on the ${r.axis}-axis this is ½·${r.axis === 'x' ? C[1] : C[0]}·|k − ${r.axis === 'x' ? B[0] : B[1]}| = ${num(r.deed)}, so |k − ${r.axis === 'x' ? B[0] : B[1]}| = ${d} and k = ${r.axis === 'x' ? B[0] : B[1]} ± ${d}. The ${gate(r)} one is k = ${r.ans.k}.`;
  }
  if (r.kind === 'collinear') {
    const [a, b, c] = r.pts;
    return `Three points are collinear when the determinant is 0: ${detText(a, b, [r.axis === 'x' ? r.ans.k : c[0], r.axis === 'x' ? c[1] : r.ans.k])} = 0. Solving for ${r.axis === 'x' ? 'x' : 'y'} of the third post gives k = ${r.ans.k}.`;
  }
  const [a, b] = r.pts;
  return `A point (x, y) is on the line through the beacons when the determinant of (x, y, 1), (${a[0]}, ${a[1]}, 1), (${b[0]}, ${b[1]}, 1) is 0. That gives y = ${r.m}x ${r.c < 0 ? '−' : '+'} ${Math.abs(r.c)}.`;
}
export function intel(r: Round): string {
  if (r.kind === 'area') {
    const [B, C] = r.pts;
    return `The deed says the field has area ${num(r.deed)} square units. Two posts are at B = ${pt(B)} and C = ${pt(C)}. Post A stands on the ${r.axis}-axis, ${gate(r)} of B. Where does it go?`;
  }
  if (r.kind === 'collinear') {
    const [a, b, c] = r.pts;
    return `A rope must run straight through ${pt(a)} and ${pt(b)} and a third post whose ${r.axis === 'x' ? `y is ${c[1]}` : `x is ${c[0]}`}. Set its ${r.axis === 'x' ? 'x' : 'y'}.`;
  }
  return `Two beacons are at ${pt(r.pts[0])} and ${pt(r.pts[1])}. Set the slope m and the intercept c of the line y = mx + c through both.`;
}
