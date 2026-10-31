// Pure rules of Rover Ridge: no DOM, no canvas. Rover the mining rover is on a plateau whose edges are the constraints of a linear programme. The ore map is
// Z = a·x + b·y. The player slides a ruler line Z = z across the plateau and parks it where the plateau still just touches it: that z is the best (largest or
// smallest) Z, and it is always met at a corner. The answer is that whole-number z.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Pt = [number, number];
export interface Round {
  /** The corners of the plateau, in order round the edge, and the constraints written out. */
  corners: Pt[];
  constraints: string[];
  /** The ore map Z = a·x + b·y and whether the most or the least is wanted. */
  a: number;
  b: number;
  goal: 'max' | 'min';
  /** The best Z, the corner that gives it, and the dial range. */
  ans: number;
  best: Pt;
  min: number;
  max: number;
  start: number;
  assist: 0 | 1 | 2;
  /** Level 4 only: park at a value, or declare that there is no maximum, or that there is no plateau. */
  kind?: Kind;
  /** The plateau runs off the map (unbounded), so `draw` holds its visible part. */
  open?: boolean;
  /** The visible part of the region inside the 0..12 window, counter-clockwise, for drawing. */
  draw?: Pt[];
  /** Level 5: the best Z is reached along a whole edge. */
  edge?: boolean;
  /** Every corner that gives the best Z. */
  bestAt?: Pt[];
}
export type Kind = 'value' | 'nomax' | 'empty';
export type Shape = 'corner' | 'edge';
export type Goal = 'max' | 'min';

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const cross = (o: Pt, p: Pt, q: Pt) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);

/** The convex hull of whole-number points, counter-clockwise, with no collinear points. */
function hull(points: Pt[]): Pt[] {
  const p = [...points].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const build = (pts: Pt[]) => {
    const h: Pt[] = [];
    for (const q of pts) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
      h.push(q);
    }
    h.pop();
    return h;
  };
  return [...build(p), ...build([...p].reverse())];
}

/** The line through consecutive corners as 'ax + by ≤ c' with whole numbers and the plateau on the ≤ side. */
function edgeText(p: Pt, q: Pt): string {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const g = gcd(dx, dy);
  const a = dy / g;
  const b = -dx / g;
  const c = a * p[0] + b * p[1];
  const term = (k: number, v: string, first: boolean) => (k === 0 ? '' : `${first ? (k < 0 ? '−' : '') : k < 0 ? ' − ' : ' + '}${Math.abs(k) === 1 ? '' : Math.abs(k)}${v}`);
  return `${term(a, 'x', true)}${term(b, 'y', a === 0)} ≤ ${num(c)}`;
}

const value = (r: { a: number; b: number }, p: Pt) => r.a * p[0] + r.b * p[1];

function make(count: [number, number], mixed: boolean, random: () => number): Round {
  for (;;) {
    const pts: Pt[] = Array.from({ length: 7 }, () => [ri(0, 9, random), ri(0, 9, random)]);
    const h = hull(pts);
    if (h.length < count[0] || h.length > count[1]) continue;
    const area = Math.abs(h.reduce((s, p, i) => s + (p[0] * h[(i + 1) % h.length][1] - h[(i + 1) % h.length][0] * p[1]), 0)) / 2;
    if (area < 14) continue;
    const a = mixed ? pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], random) : ri(1, 5, random);
    const b = mixed ? pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], random) : ri(1, 5, random);
    if (mixed && (a > 0) === (b > 0)) continue;
    const goal: 'max' | 'min' = mixed ? pick(['max', 'min'] as const, random) : 'max';
    const vals = h.map((p) => value({ a, b }, p));
    const best = goal === 'max' ? Math.max(...vals) : Math.min(...vals);
    if (vals.filter((v) => v === best).length !== 1) continue;
    const corner = h[vals.indexOf(best)];
    const lo = Math.min(...vals, 0) - 4;
    const hi = Math.max(...vals, 0) + 4;
    const constraints = h.map((p, i) => edgeText(p, h[(i + 1) % h.length]));
    return { corners: h, constraints, a, b, goal, ans: best, best: corner, min: lo, max: hi, start: best === 0 ? 1 : 0, assist: 0 };
  }
}

export function buildRounds(level: number, random: () => number): Round[] {
  if (level >= 4) return buildOpenRounds(level >= 5 ? 5 : 4, random);
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    const mk = () => (level === 1 ? make([4, 4], false, random) : level === 2 ? make([4, 5], true, random) : make([5, 6], true, random));
    let r = mk();
    for (let t = 0; t < 50 && out.some((o) => o.corners.join() === r.corners.join() && o.a === r.a && o.b === r.b); t++) r = mk();
    out.push({ ...r, assist: aid(i) });
  }
  return out;
}

export const judge = (r: Round, z: number) => z === r.ans;
export const ore = (r: Round, p: Pt) => value(r, p);

/** Where the ruler line a x + b y = z sits: 'cuts' across the plateau, 'touches' at a corner, or 'misses' it. */
export function ruler(r: Round, z: number): 'cuts' | 'touches' | 'misses' {
  // An empty region has no ground at all. An open region (a, b positive) has a smallest Z at a corner and goes on cutting above it for ever.
  if (r.kind === 'empty') return 'misses';
  if (r.open) {
    const least = Math.min(...r.corners.map((p) => value(r, p)));
    return z < least ? 'misses' : z === least ? 'touches' : 'cuts';
  }
  const vals = r.corners.map((p) => value(r, p));
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  if (z < lo || z > hi) return 'misses';
  if (z === lo || z === hi) return 'touches';
  return 'cuts';
}

export const zText = (r: Round) => `${r.a < 0 ? '−' : ''}${Math.abs(r.a) === 1 ? '' : Math.abs(r.a)}x ${r.b < 0 ? '−' : '+'} ${Math.abs(r.b) === 1 ? '' : Math.abs(r.b)}y`;
export function intel(r: Round): string {
  if (r.kind !== undefined) return `The plateau is ${r.constraints.join(', ')}. Ore is Z = ${zText(r)}. Park the ruler at the ${r.goal === 'max' ? 'largest' : 'smallest'} Z, or declare that there is no ${r.goal === 'max' ? 'maximum' : 'minimum'} or no plateau at all.`;
  const base = `The plateau is ${r.constraints.join(', ')}. Ore is Z = ${zText(r)}. Park the ruler where the plateau only just touches it, at the ${r.goal === 'max' ? 'largest' : 'smallest'} Z.`;
  return r.edge !== undefined ? `${base} Then say whether the best is at one corner or along a whole edge.` : base;
}
export function spotText(r: Round, z: number): string {
  const s = ruler(r, z);
  return `Probe at Z = ${num(z)}: the ruler ${s === 'cuts' ? 'cuts across the plateau' : s === 'touches' ? 'just touches the plateau at its edge' : 'misses the plateau completely'}.`;
}
/** After a miss: what the ruler did, never the best Z. */
export function missText(r: Round, z: number): string {
  const s = ruler(r, z);
  // Levels 1 to 3 (no kind) add the plain direction to move the ruler; later levels keep the wording as it was, so a declaration round reads like any other.
  const way = r.kind === undefined ? ` Slide the ruler to a ${z < r.ans ? 'higher' : 'lower'} Z.` : '';
  if (s === 'misses') return `The ruler at Z = ${num(z)} is off the plateau: there is no ground with that much ${z > r.ans === (r.goal === 'max') ? 'ore' : 'ore (or so little)'}, and the rover found nothing.${way}`;
  if (s === 'touches') return `The ruler at Z = ${num(z)} only touches the plateau at its far end, which is the wrong end for the ${r.goal === 'max' ? 'richest' : 'poorest'} ground.${way}`;
  return `The ruler at Z = ${num(z)} cuts across the plateau, so there is ground ${r.goal === 'max' ? 'richer' : 'poorer'} than that further on: the rover stopped short.${way}`;
}

/** After a hit: the working. */
export function explain(r: Round): string {
  // The two clashing constraints of an empty region are always the first two listed.
  if (r.kind === 'empty') return `${r.constraints[0]} and ${r.constraints[1]} cannot both hold, so the feasible region is empty and there is no optimal value.`;
  const list = r.corners.map((p) => `(${num(p[0])}, ${num(p[1])}) → ${num(value(r, p))}`).join(', ');
  if (r.kind === 'nomax') return `Z at each corner: ${list}. The region runs off to infinity with a and b positive, so Z can be as large as you like: there is no maximum.`;
  let out = `Z at each corner: ${list}. The ${r.goal === 'max' ? 'largest' : 'smallest'} is ${num(r.ans)}, at (${num(r.best[0])}, ${num(r.best[1])}).`;
  if (r.open && r.goal === 'min') out += ' The plateau runs off the map, but with a and b positive Z only grows that way, so the least value is at a corner.';
  if (r.edge && r.bestAt && r.bestAt.length >= 2) out += ` The best Z is reached at ${pt(r.bestAt[0])} and ${pt(r.bestAt[1])}, so at every point of the edge between them.`;
  return out;
}
const pt = (p: Pt) => `(${num(p[0])}, ${num(p[1])})`;

// ---- Levels 4 and 5: open plains and the level ridge ----------------------------------------------------------------------------------------------------
// Both levels draw their rounds from fixed pools, one row per round. Level 4: park at the best Z, or declare 'no maximum' or 'no plateau'. Level 5: park at the
// best Z and say whether it is one corner or a whole edge.

export interface Region {
  constraints: string[];
  /** The finite corners, in order round the edge (none for an empty region). */
  corners?: Pt[];
  /** The visible part inside the 0..12 window, counter-clockwise (only for a region that runs off the map). */
  draw?: Pt[];
}
const edgesOf = (c: Pt[]) => c.map((p, i) => edgeText(p, c[(i + 1) % c.length]));
const openReg = (constraints: string[], corners: Pt[], tail: Pt[] = [[12, 0], [12, 12], [0, 12]]): Region => ({ constraints, corners, draw: [...corners, ...tail] });
const closedReg = (corners: Pt[]): Region => ({ corners, constraints: edgesOf(corners) });
const U1 = openReg(['x + y ≥ 4', 'x + 3y ≥ 6', 'x ≥ 0', 'y ≥ 0'], [[0, 4], [3, 1], [6, 0]]);
const U2 = openReg(['2x + y ≥ 6', 'x + 2y ≥ 6', 'x ≥ 0', 'y ≥ 0'], [[0, 6], [2, 2], [6, 0]]);
const U3 = openReg(['x + y ≥ 5', '3x + y ≥ 9', 'x ≥ 0', 'y ≥ 0'], [[0, 9], [2, 3], [5, 0]]);
const U4 = openReg(['x + 2y ≥ 8', '3x + 2y ≥ 12', 'x ≥ 0', 'y ≥ 0'], [[0, 6], [2, 3], [8, 0]]);
const E1: Region = { constraints: ['x + y ≤ 2', 'x + y ≥ 5', 'x ≥ 0', 'y ≥ 0'] };
const E2: Region = { constraints: ['x − y ≤ −1', '−x + y ≤ 0', 'x ≥ 0', 'y ≥ 0'] }; // Ex 12.1 Q10
const B1 = closedReg([[0, 0], [6, 0], [4, 4], [0, 6]]); // y ≥ 0, 2x + y ≤ 12, x + 2y ≤ 12, x ≥ 0
const B2 = closedReg([[0, 0], [5, 0], [5, 2], [2, 5], [0, 5]]); // y ≥ 0, x ≤ 5, x + y ≤ 7, y ≤ 5, x ≥ 0
const T3 = openReg(['x + 2y ≥ 6', '2x + y ≥ 3', 'x ≥ 0', 'y ≥ 0'], [[0, 3], [6, 0]]); // Ex 12.1 Q6

/** [region, a, b, goal, kind, answer]; the answer is the best Z for a 'value' round and null otherwise. */
export type Row4 = readonly [Region, number, number, Goal, Kind, number | null];
/** [region, a, b, goal, answer, edge]. */
export type Row5 = readonly [Region, number, number, Goal, number, boolean];
export const POOL4: readonly (readonly Row4[])[] = [
  [[U1, 2, 3, 'min', 'value', 9], [U2, 1, 1, 'min', 'value', 4], [U3, 2, 1, 'min', 'value', 7], [U4, 1, 1, 'min', 'value', 5]],
  [[U1, 1, 2, 'min', 'value', 5], [U2, 3, 2, 'min', 'value', 10], [U4, 2, 3, 'min', 'value', 13], [U1, 2, 3, 'max', 'nomax', null], [U3, 1, 1, 'max', 'nomax', null], [B1, 1, 1, 'max', 'value', 8], [B2, 2, 1, 'max', 'value', 12], [E1, 1, 1, 'min', 'empty', null]],
  [[U2, 3, 4, 'max', 'nomax', null], [U4, 1, 3, 'max', 'nomax', null], [E1, 1, 1, 'max', 'empty', null], [E2, 1, 1, 'max', 'empty', null], [U3, 4, 3, 'min', 'value', 17], [U4, 3, 1, 'min', 'value', 6], [B2, 1, 2, 'max', 'value', 12], [E2, 1, 1, 'min', 'empty', null]],
];
export const POOL5: readonly (readonly Row5[])[] = [
  [[B1, 2, 1, 'max', 12, true], [B2, 1, 1, 'max', 7, true], [B1, 1, 1, 'max', 8, false], [B2, 2, 1, 'max', 12, false]],
  [[B1, 1, 1, 'max', 8, false], [B2, 2, 1, 'max', 12, false], [B1, 2, 1, 'max', 12, true], [B2, 1, 1, 'max', 7, true]],
  [[T3, 1, 2, 'min', 6, true], [U1, 2, 3, 'min', 9, false]],
];

function openRound(level: 4 | 5, reg: Region, a: number, b: number, goal: Goal, kind: Kind, ans: number | null, edge: boolean, assist: 0 | 1 | 2): Round {
  const corners = reg.corners ?? [];
  const bestAt = ans === null ? [] : corners.filter((p) => value({ a, b }, p) === ans);
  const r: Round = {
    corners, constraints: reg.constraints, a, b, goal,
    ans: ans ?? Number.NaN,
    best: bestAt[0] ?? corners[0] ?? [0, 0],
    min: 0, max: level === 4 ? 40 : 20,
    start: ans === 0 ? 1 : 0,
    assist, bestAt, open: reg.draw !== undefined,
  };
  if (reg.draw) r.draw = reg.draw;
  else if (corners.length) r.draw = corners;
  if (level === 4) r.kind = kind;
  else r.edge = edge;
  return r;
}
export const round4 = (row: Row4, assist: 0 | 1 | 2): Round => openRound(4, row[0], row[1], row[2], row[3], row[4], row[5], false, assist);
export const round5 = (row: Row5, assist: 0 | 1 | 2): Round => openRound(5, row[0], row[1], row[2], row[3], 'value', row[4], row[5], assist);

function buildOpenRounds(level: 4 | 5, random: () => number): Round[] {
  const out: Round[] = [];
  const same = (x: Round, y: Round) => x.constraints.join() === y.constraints.join() && x.a === y.a && x.b === y.b && x.goal === y.goal;
  POOL4.forEach((_, i) => {
    const make = (): Round => (level === 4 ? round4(pick(POOL4[i], random), aid(i)) : round5(pick(POOL5[i], random), aid(i)));
    let r = make();
    // Level 5 reuses two rows in rounds 1 and 2: never play the same round twice.
    for (let t = 0; t < 50 && out.some((o) => same(o, r)); t++) r = make();
    out.push(r);
  });
  return out;
}

/** Level 4: what the player did. */
export type Attempt = { action: 'park'; z: number } | { action: 'nomax' } | { action: 'empty' };
export function judgeOpen(r: Round, at: Attempt): boolean {
  if (at.action === 'park') return r.kind === 'value' && at.z === r.ans;
  return at.action === r.kind;
}
/** Level 5: the best Z, and whether it is one corner or a whole edge. */
export function judgeEdge(r: Round, z: number, shape: Shape): boolean {
  return z === r.ans && (shape === 'edge') === (r.edge === true);
}

/** After a miss on level 4: what the player's own choice did. It never says which other choice is right, because the same round is played again. */
export function missTextOpen(r: Round, at: Attempt): string {
  if (at.action === 'park') return missText(r, at.z);
  if (at.action === 'nomax') return `Rover declared that there is no ${r.goal === 'max' ? 'maximum' : 'minimum'}, but the survey rejected the claim: it does not hold here.`;
  return `Rover declared that there is no plateau, but the survey rejected the claim: the constraints do meet, for example at ${pt(exampleCorner(r))}.`;
}
/** A corner to quote when a claim of 'no plateau' is refuted: never the corner that gives the best Z. */
export function exampleCorner(r: Round): Pt {
  return r.corners.find((p) => value(r, p) !== r.ans) ?? r.corners[0] ?? [0, 0];
}
/** Where the score burst and the heart float appear, in map units: a fixed point that is never a corner (corners are whole numbers), so a miss never points at the answer. */
export const HIT_MAP: Pt = [5, 9.64];
/** Where the burst appears for a declaration (level 4), also never a corner of any region. */
export const DECLARE_HIT: Pt = [6, 7.5];
/** After a miss on level 5: the wrong Z is described by the ruler; the edge ends are named only once Z is right. */
export function missTextEdge(r: Round, z: number, shape: Shape): string {
  if (z !== r.ans) return missText(r, z);
  if (r.edge && shape === 'corner') return `Z = ${num(z)} is right, but the ruler lies flat along a whole edge: every point between ${pt((r.bestAt ?? [])[0])} and ${pt((r.bestAt ?? [])[1])} is just as good, and Rover parked at one end only.`;
  return `Z = ${num(z)} is right, but only one corner reaches it: the ruler touches the plateau at a single point.`;
}

// ---- Drawing helpers that are pure maths (tested) --------------------------------------------------------------------------------------------------------
export const BOX = 12;
/** The two ends of the ruler a x + b y = z inside the 0..size box (no duplicates), or fewer than two when it is out of the box. */
export function ruleEnds(r: Round, z: number, size = BOX): Pt[] {
  const ends: Pt[] = [];
  const add = (p: Pt) => {
    if (!ends.some((q) => Math.abs(q[0] - p[0]) < 1e-9 && Math.abs(q[1] - p[1]) < 1e-9)) ends.push(p);
  };
  if (r.b !== 0) for (const x of [0, size]) {
    const y = (z - r.a * x) / r.b;
    if (y >= 0 && y <= size) add([x, y]);
  }
  if (r.a !== 0) for (const y of [0, size]) {
    const x = (z - r.b * y) / r.a;
    if (x >= 0 && x <= size) add([x, y]);
  }
  return ends;
}
/** The two ends of the ruler's chord across the visible plateau, or null when it misses. */
export function chord(r: Round, z: number): [Pt, Pt] | null {
  const poly = r.draw ?? r.corners;
  const ends: Pt[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const zp = value(r, p) - z;
    const zq = value(r, q) - z;
    if (zp === 0) ends.push(p);
    if (zp * zq < 0) {
      const s = zp / (zp - zq);
      ends.push([p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s]);
    }
  });
  return ends.length >= 2 ? [ends[0], ends[ends.length - 1]] : ends.length === 1 ? [ends[0], ends[0]] : null;
}
/** Where the rover drives to for the ruler at z: the middle of the chord across the plateau, else the middle of the ruler itself. Always on the ruler. */
export function spotFor(r: Round, z: number): Pt {
  const ch = chord(r, z);
  if (ch) return [(ch[0][0] + ch[1][0]) / 2, (ch[0][1] + ch[1][1]) / 2];
  const e = ruleEnds(r, z);
  if (e.length >= 2) return [(e[0][0] + e[e.length - 1][0]) / 2, (e[0][1] + e[e.length - 1][1]) / 2];
  return [BOX / 2, BOX / 2];
}

export interface Half {
  a: number;
  b: number;
  c: number;
  /** true for ≥, false for ≤ */
  ge: boolean;
}
/** Reads 'x + 3y ≥ 6', '−x + y ≤ 0' or 'x ≥ 0' into a, b, c and the direction. */
export function parseConstraint(s: string): Half {
  const t = s.replace(/−/g, '-').replace(/\s+/g, '');
  const m = /^(.*?)(≤|≥)(-?\d+(?:\.\d+)?)$/.exec(t);
  if (!m) throw new Error(`cannot read constraint ${s}`);
  let a = 0;
  let b = 0;
  for (const [, sign, digits, v] of m[1].matchAll(/([+-]?)(\d*)([xy])/g)) {
    const k = (sign === '-' ? -1 : 1) * (digits === '' ? 1 : Number(digits));
    if (v === 'x') a += k;
    else b += k;
  }
  return { a, b, c: Number(m[3]), ge: m[2] === '≥' };
}
/** The part of the square 0..size where the constraint holds, as a polygon (for drawing one side of a clash on its own). */
export function halfBox(h: Half, size = BOX): Pt[] {
  const s = h.ge ? 1 : -1;
  const f = (p: Pt) => s * (h.a * p[0] + h.b * p[1] - h.c);
  const sq: Pt[] = [[0, 0], [size, 0], [size, size], [0, size]];
  const out: Pt[] = [];
  sq.forEach((p, i) => {
    const q = sq[(i + 1) % sq.length];
    if (f(p) >= 0) out.push(p);
    if (f(p) * f(q) < 0) {
      const k = f(p) / (f(p) - f(q));
      out.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]);
    }
  });
  return out;
}
