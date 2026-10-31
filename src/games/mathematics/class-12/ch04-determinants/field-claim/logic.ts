// Pure rules of Field Claim: no DOM, no canvas. Posts are points on a grid. Area of a triangle = ½|x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)|, which is
// the determinant of the rows (xᵢ, yᵢ, 1), and three points are collinear exactly when it is 0.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'area' | 'collinear' | 'line' | 'scale';
export type Pt = [number, number];
export interface Round {
  kind: Kind;
  /** The posts. For 'area' the unknown one is A and moves along an axis; for 'collinear' it is the third post; for 'scale' they are the three original posts. */
  pts: Pt[];
  /** area: the deed's area, and which side of B the post must stand; collinear: which coordinate of the third post is unknown; scale: the new area after stretching. */
  deed: number;
  axis: 'x' | 'y';
  side: 1 | -1;
  /** collinear and line: the line the posts lie on, y = m·x + c. */
  m: number;
  c: number;
  ans: Record<string, number>;
  assist: 0 | 1 | 2;
  /** scale: the winning factor. */
  k0?: number;
}

export const DIALS: Record<Kind, { key: string; label: string; min: number; max: number; start: number }[]> = {
  area: [{ key: 'k', label: 'Post A', min: -12, max: 12, start: 0 }],
  collinear: [{ key: 'k', label: 'Third post', min: -12, max: 12, start: 0 }],
  line: [{ key: 'm', label: 'Slope m', min: -6, max: 6, start: 0 }, { key: 'c', label: 'Intercept c', min: -12, max: 12, start: 0 }],
  scale: [{ key: 'k', label: 'Scale k', min: 1, max: 6, start: 1 }],
};
export const KINDS: Kind[] = ['area', 'collinear', 'line', 'scale'];

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));

/** The determinant of the rows (x, y, 1): twice the signed area. */
export const det3 = (a: Pt, b: Pt, c: Pt) => a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]);
export const area = (a: Pt, b: Pt, c: Pt) => Math.abs(det3(a, b, c)) / 2;

/** The moving post for the dial value. */
export function movePost(r: Round, v: Record<string, number>): Pt {
  if (r.kind === 'scale') return [r.pts[2][0] * v.k, r.pts[2][1] * v.k];
  if (r.kind === 'area') return r.axis === 'x' ? [v.k, 0] : [0, v.k];
  return r.axis === 'x' ? [v.k, r.pts[2][1]] : [r.pts[2][0], v.k];
}
export function triangle(r: Round, v: Record<string, number>): [Pt, Pt, Pt] {
  if (r.kind === 'scale') return r.pts.map(([x, y]): Pt => [x * v.k, y * v.k]) as [Pt, Pt, Pt];
  const p = movePost(r, v);
  return r.kind === 'area' ? [p, r.pts[0], r.pts[1]] : [r.pts[0], r.pts[1], p];
}

/** Scale level: the three original posts, and the factors each round draws its answer from (round 1, 2, 3). Areas are in the comments. */
const TRI: Pt[][] = [
  [[1, 0], [3, 1], [0, 2]], // area 5/2
  [[0, 0], [3, 1], [1, 2]], // 5/2
  [[1, 1], [2, 3], [-1, 2]], // 5/2
  [[2, 0], [0, 1], [1, 2]], // 3/2
  [[-1, 0], [1, 1], [0, 2]], // 3/2
  [[1, 2], [2, -1], [-1, 1]], // 7/2
];
const KS: [number[], number[], number[]] = [[2, 3], [3, 4], [4, 5]];

function scaleRound(i: number, random: () => number): Round {
  const pts = pick(TRI, random);
  const k0 = pick(KS[i], random);
  return { kind: 'scale', pts, deed: k0 * k0 * area(pts[0], pts[1], pts[2]), axis: 'x', side: 1, m: 0, c: 0, ans: { k: k0 }, assist: 0, k0 };
}

/** The area of the field after every post is stretched by the dial value. */
export const scaledArea = (r: Round, v: Record<string, number>) => {
  const [a, b, c] = triangle(r, v);
  return area(a, b, c);
};
/** −1 when the stretched field is smaller than the deed, 1 when it is bigger, 0 when equal. */
export const scaleDir = (r: Round, v: Record<string, number>) => Math.sign(scaledArea(r, v) - r.deed);

/** An area written the textbook way: halves as 45/2, whole numbers plainly. */
export const fmtArea = (a: number) => (Number.isInteger(a) ? String(a) : `${a * 2}/2`);

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
    do r = level === 1 ? areaRound(axes[i], random) : level === 2 ? collinearRound(axes[i], random) : level === 4 ? scaleRound(i, random) : lineRound(random);
    while (out.some((o) => JSON.stringify(o.pts) === JSON.stringify(r.pts)));
    out.push({ ...r, assist: aid(i) });
  }
  return out;
}

/** Does the post stand on the required side of B (area level)? */
const rightSide = (r: Round, k: number) => Math.sign(k - r.pts[0][r.axis === 'x' ? 0 : 1]) === r.side;

export function judge(r: Round, v: Record<string, number>): boolean {
  if (r.kind === 'scale') return v.k === r.k0;
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

/** Which way the moving post stands from where it belongs: the compass direction only, the same for every wrong setting on that side. */
const farSide = (r: Round, k: number) => (r.axis === 'x' ? (k > r.ans.k ? 'east' : 'west') : k > r.ans.k ? 'north' : 'south');

/** After a miss: the direction only, with no area, coordinate or beacon verdict (those are the paid check). */
export function missText(r: Round, v: Record<string, number>): string {
  if (r.kind === 'scale') return `With k = ${v.k} the stretched field came out ${scaleDir(r, v) < 0 ? 'too small' : 'too big'} for the deed: the fence did not close on the marker stones.`;
  if (r.kind === 'area') return `The field does not match the deed: post A stands too far ${farSide(r, v.k)}.`;
  if (r.kind === 'collinear') return `The three posts do not lie on one line: the third post stands too far ${farSide(r, v.k)}, so the rope would not run straight.`;
  return 'Your line does not pass through both beacons, so the signal missed.';
}
export function spotText(r: Round, v: Record<string, number>): string {
  if (r.kind === 'scale') {
    const d = scaleDir(r, v);
    return `Survey: with k = ${v.k} the stretched field is ${d < 0 ? 'smaller than the deed asks' : d > 0 ? 'bigger than the deed asks' : 'exactly the deed’s area'}.`;
  }
  if (r.kind === 'line') return `Check: beacon 1 is ${r.pts[0][1] === v.m * r.pts[0][0] + v.c ? 'on' : 'off'} your line, beacon 2 is ${r.pts[1][1] === v.m * r.pts[1][0] + v.c ? 'on' : 'off'} your line.`;
  const [a, b, c] = triangle(r, v);
  return `Check: the determinant of the three posts is ${num(det3(a, b, c))}, so their area is ${num(area(a, b, c))}.`;
}

/** A coordinate in the working: a true minus sign, in brackets when it is negative after a sign. */
const neg = (x: number) => (x < 0 ? `(${num(x)})` : num(x));
const detText = (a: Pt, b: Pt, c: Pt) => `½|${neg(a[0])}(${num(b[1])} − ${neg(c[1])}) + ${neg(b[0])}(${num(c[1])} − ${neg(a[1])}) + ${neg(c[0])}(${num(a[1])} − ${neg(b[1])})|`;
/** After a hit: the working. */
export function explain(r: Round): string {
  if (r.kind === 'scale') {
    const k0 = r.k0 ?? r.ans.k;
    const [a, b, c] = r.pts;
    const a0 = area(a, b, c);
    const dt = detText(a, b, c);
    return `The original area is ${dt} = ${fmtArea(a0)}. Multiplying every coordinate by k multiplies both columns of the determinant by k, so the area becomes k²·${fmtArea(a0)}. k²·${fmtArea(a0)} = ${fmtArea(r.deed)} gives k² = ${k0 * k0}, so k = ${k0}. In general |kA| = kⁿ|A| for an n × n matrix.`;
  }
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
  if (r.kind === 'scale') return `The field’s posts stand at ${r.pts.map(pt).join(', ')}. The new deed scales every post from (x, y) to (kx, ky) and gives the field an area of ${fmtArea(r.deed)}. Set k.`;
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
