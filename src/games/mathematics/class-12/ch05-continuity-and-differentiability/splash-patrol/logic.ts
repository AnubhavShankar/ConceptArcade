// Rules of Splash Patrol (Maths Ch 5, sections 5.2 and 5.3): flag each joint of a slide built from a function as fine, kink or gap.
// Pure: no DOM, no canvas, no Math.random. The pools, the judging and every text live here and are tested in logic.test.ts.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { pick } from '@core/quiz';

export type Kind = 'smooth' | 'kink' | 'gap';
export type Flag = null | 'fine' | 'kink' | 'gap';
export interface Joint { c: number; cText: string; kind: Kind }
export interface Row {
  /** The slide on one line, for the hint: 'f(x) = |x − 1|'. */
  name: string;
  /** The blueprint lines for the sign: ['x + 1, x ≤ 1', 'x² + 1, 1 < x ≤ 2', '7 − x, x > 2'] or ['|x − 1|']. */
  lines: string[];
  f: (x: number) => number;
  lo: number; hi: number; loText: string; hiText: string;
  joints: Joint[];   // left to right
}
export type Level = 1 | 2 | 3 | 4;
export interface Round extends Row { assist: 0 | 1 | 2; level: Level }

// ---- The pools (every joint's kind is checked numerically in logic.test.ts) -------------------------------------------------------------------------

const { abs, floor, sin, cos, PI } = Math;
type Piece = [(x: number) => boolean, (x: number) => number];
const pw = (pieces: Piece[]) => (x: number) => { for (const [test, g] of pieces) if (test(x)) return g(x); return NaN; };
const J = (c: number, kind: Kind, cText = num(c)): Joint => ({ c, cText, kind });
const R = (name: string, lines: string[], f: (x: number) => number, lo: number, hi: number, joints: Joint[], loText = num(lo), hiText = num(hi)): Row => ({ name, lines, f, lo, hi, loText, hiText, joints });

export const POOLS: Record<Level, [Row[], Row[], Row[]]> = {
  1: [
    [
      R('f(x) = 2x, 0 or 4x', ['2x, x < 0', '0, 0 ≤ x ≤ 1', '4x, x > 1'], pw([[(x) => x < 0, (x) => 2 * x], [(x) => x <= 1, () => 0], [() => true, (x) => 4 * x]]), -1, 2, [J(0, 'kink'), J(1, 'gap')]),
      R('f(x) = 3, 4 or 5', ['3, x ≤ 1', '4, 1 < x < 3', '5, x ≥ 3'], pw([[(x) => x <= 1, () => 3], [(x) => x < 3, () => 4], [() => true, () => 5]]), 0, 4, [J(1, 'gap'), J(3, 'gap')]),
      R('f(x) = x + 5, x − 5 or 2x − 8', ['x + 5, x ≤ 1', 'x − 5, 1 < x ≤ 3', '2x − 8, x > 3'], pw([[(x) => x <= 1, (x) => x + 5], [(x) => x <= 3, (x) => x - 5], [() => true, (x) => 2 * x - 8]]), 0, 4, [J(1, 'gap'), J(3, 'kink')]),
    ],
    [
      R('f(x) = x + 1, x² + 1 or 7 − x', ['x + 1, x ≤ 1', 'x² + 1, 1 < x ≤ 2', '7 − x, x > 2'], pw([[(x) => x <= 1, (x) => x + 1], [(x) => x <= 2, (x) => x * x + 1], [() => true, (x) => 7 - x]]), 0, 3, [J(1, 'kink'), J(2, 'kink')]),
      R('f(x) = −2, 2x or 2', ['−2, x ≤ −1', '2x, −1 < x ≤ 1', '2, x > 1'], pw([[(x) => x <= -1, () => -2], [(x) => x <= 1, (x) => 2 * x], [() => true, () => 2]]), -2, 2, [J(-1, 'kink'), J(1, 'kink')]),
      R('f(x) = x³ − 3, x² + 1 or 2x + 4', ['x³ − 3, x ≤ 2', 'x² + 1, 2 < x ≤ 3', '2x + 4, x > 3'], pw([[(x) => x <= 2, (x) => x ** 3 - 3], [(x) => x <= 3, (x) => x * x + 1], [() => true, (x) => 2 * x + 4]]), 1, 4, [J(2, 'kink'), J(3, 'kink')]),
      R('f(x) = x¹⁰ − 1, x² or x + 1', ['x¹⁰ − 1, x ≤ 1', 'x², 1 < x ≤ 2', 'x + 1, x > 2'], pw([[(x) => x <= 1, (x) => x ** 10 - 1], [(x) => x <= 2, (x) => x * x], [() => true, (x) => x + 1]]), 0, 3, [J(1, 'gap'), J(2, 'gap')]),
    ],
    [
      R('f(x) = |x|/x, with f(0) = 0', ['|x|/x, x ≠ 0', '0, x = 0'], (x) => (x === 0 ? 0 : abs(x) / x), -2, 2, [J(0, 'gap'), J(1, 'smooth')]),
      R('f(x) = x², with f(0) = 1', ['x², x ≠ 0', '1, x = 0'], (x) => (x === 0 ? 1 : x * x), -2, 2, [J(-1, 'smooth'), J(0, 'gap')]),
      R('f(x) = (x² − 1)/(x − 1), with f(1) = 2', ['(x² − 1)/(x − 1), x ≠ 1', '2, x = 1'], (x) => (x === 1 ? 2 : (x * x - 1) / (x - 1)), -1, 2, [J(0, 'smooth'), J(1, 'smooth')]),
      R('f(x) = |x + 1|', ['|x + 1|'], (x) => abs(x + 1), -2, 2, [J(-1, 'kink'), J(1, 'smooth')]),
    ],
  ],
  2: [
    [
      R('f(x) = |x − 1|', ['|x − 1|'], (x) => abs(x - 1), -1, 3, [J(0, 'smooth'), J(1, 'kink')]),
      R('f(x) = x², 2x − 1 or 3', ['x², x ≤ 1', '2x − 1, 1 < x ≤ 2', '3, x > 2'], pw([[(x) => x <= 1, (x) => x * x], [(x) => x <= 2, (x) => 2 * x - 1], [() => true, () => 3]]), 0, 3, [J(1, 'smooth'), J(2, 'kink')]),
    ],
    [
      R('f(x) = x², x or x + 1', ['x², x ≤ 1', 'x, 1 < x ≤ 2', 'x + 1, x > 2'], pw([[(x) => x <= 1, (x) => x * x], [(x) => x <= 2, (x) => x], [() => true, (x) => x + 1]]), 0, 3, [J(1, 'kink'), J(2, 'gap')]),
      R('f(x) = |x| − |x + 1|', ['|x| − |x + 1|'], (x) => abs(x) - abs(x + 1), -3, 2, [J(-1, 'kink'), J(0, 'kink')]),
    ],
    [
      R('f(x) = x|x| + |x − 1|', ['x|x| + |x − 1|'], (x) => x * abs(x) + abs(x - 1), -2, 2, [J(0, 'smooth'), J(1, 'kink')]),
      R('f(x) = x², 2x − 1 or x + 2', ['x², x ≤ 1', '2x − 1, 1 < x ≤ 2', 'x + 2, x > 2'], pw([[(x) => x <= 1, (x) => x * x], [(x) => x <= 2, (x) => 2 * x - 1], [() => true, (x) => x + 2]]), 0, 3, [J(1, 'smooth'), J(2, 'gap')]),
    ],
  ],
  3: [
    [
      R('f(x) = [x]', ['[x], the greatest integer ≤ x'], (x) => floor(x), -2, 2, [J(-1, 'gap'), J(0, 'gap'), J(0.5, 'smooth', '1/2'), J(1, 'gap')]),
      R('f(x) = x − [x]', ['x − [x]'], (x) => x - floor(x), -2, 2, [J(-1, 'gap'), J(0, 'gap'), J(1, 'gap'), J(1.5, 'smooth', '3/2')]),
    ],
    [
      R('f(x) = |cos x|', ['|cos x|'], (x) => abs(cos(x)), 0, 2 * PI, [J(PI / 2, 'kink', 'π/2'), J(PI, 'smooth', 'π'), J((3 * PI) / 2, 'kink', '3π/2')], '0', '2π'),
      R('f(x) = |x² − 1|', ['|x² − 1|'], (x) => abs(x * x - 1), -2, 2, [J(-1, 'kink'), J(0, 'smooth'), J(1, 'kink')]),
    ],
    [
      R('f(x) = sin|x|', ['sin|x|'], (x) => sin(abs(x)), -PI, PI, [J(-PI / 2, 'smooth', '−π/2'), J(0, 'kink'), J(PI / 2, 'smooth', 'π/2')], '−π', 'π'),
      R('f(x) = |sin x|', ['|sin x|'], (x) => abs(sin(x)), -PI, PI, [J(-PI / 2, 'smooth', '−π/2'), J(0, 'kink'), J(PI / 2, 'smooth', 'π/2')], '−π', 'π'),
    ],
  ],
  4: [
    [
      R('f(x) = |x| + |x − 2|', ['|x| + |x − 2|'], (x) => abs(x) + abs(x - 2), -1, 3, [J(0, 'kink'), J(1, 'smooth'), J(2, 'kink')]),
      R('f(x) = |x − 1| or 3 − x', ['|x − 1|, x ≤ 2', '3 − x, x > 2'], pw([[(x) => x <= 2, (x) => abs(x - 1)], [() => true, (x) => 3 - x]]), 0, 3, [J(1, 'kink'), J(2, 'kink')]),
    ],
    [
      R('f(x) = [x] + |x − 1|', ['[x] + |x − 1|'], (x) => floor(x) + abs(x - 1), -1, 3, [J(0, 'gap'), J(0.5, 'smooth', '1/2'), J(1, 'gap'), J(2, 'gap')]),
      R('f(x) = x[x]', ['x[x]'], (x) => x * floor(x), 0, 3, [J(1, 'gap'), J(1.5, 'smooth', '3/2'), J(2, 'gap')]),
    ],
    [
      R('f(x) = x|x|, 2x − 1 or x + 2', ['x|x|, x ≤ 1', '2x − 1, 1 < x ≤ 2', 'x + 2, x > 2'], pw([[(x) => x <= 1, (x) => x * abs(x)], [(x) => x <= 2, (x) => 2 * x - 1], [() => true, (x) => x + 2]]), -1, 3, [J(0, 'smooth'), J(1, 'smooth'), J(2, 'gap')]),
    ],
  ],
};

/** Three rounds: round 1 has the live zoom, round 2 a zoom drone, round 3 (the boss) none. */
export const buildRounds = (level: Level, random: () => number): Round[] => POOLS[level].map((pool, k) => ({ ...pick(pool, random), level, assist: aid(k) }));

// ---- Judging -------------------------------------------------------------------------------------------------------------------------------------------

/** The flag a joint needs in this level: level 1 has no kinks (a kink is joined, so it needs 'fine'). */
export const want = (level: Level, j: Joint): 'fine' | 'kink' | 'gap' => (j.kind === 'gap' ? 'gap' : level === 1 || j.kind === 'smooth' ? 'fine' : 'kink');
export const complete = (flags: Flag[], n: number) => flags.length >= n && flags.slice(0, n).every((f) => f !== null);
export const judge = (r: Round, flags: Flag[]) => complete(flags, r.joints.length) && r.joints.every((j, i) => flags[i] === want(r.level, j));
/** A fault is only a position: the first joint where the flag is wrong. It never says what kind of fault it is or what the joint needed (owner decision, 2026-10-31). */
export type Fault = { joint: number };
/** The first joint (left to right) where the flag is wrong. */
export function firstFault(r: Round, flags: Flag[]): Fault | null {
  for (let i = 0; i < r.joints.length; i++) if (flags[i] !== want(r.level, r.joints[i])) return { joint: i };
  return null;
}
export const RUN = 1.6;  // seconds from the start of the ride to the pool
export const jointTime = (r: Round, i: number) => 0.3 + (RUN * (i + 1)) / (r.joints.length + 1);
export const verdictTime = (r: Round, f: Fault | null) => (f ? jointTime(r, f.joint) + 0.25 : 0.3 + RUN);

/** The flag cycle on a tap: level 1 has no kink flag. */
export function nextFlag(level: Level, f: Flag): Exclude<Flag, null> {
  if (f === 'fine') return level === 1 ? 'gap' : 'kink';
  if (f === 'kink') return 'gap';
  return 'fine';
}
/** The text on a joint button and on the slide: level 1 says joined, levels 2 to 4 say fine, smooth (kink) or patch (gap). */
export function flagText(level: Level, f: Flag): string {
  if (f === null) return '?';
  if (f === 'fine') return level === 1 ? '✓ joined' : '✓ fine';
  return f === 'kink' ? '🟡 smooth' : '🔴 patch';
}

// ---- Words ---------------------------------------------------------------------------------------------------------------------------------------------

const clean = (x: number) => num(abs(x) < 0.005 ? 0 : x);
/** The numbers at a joint, as written in the working: both limits, the value and both slopes, to two decimals. */
export function facts(r: Round, j: Joint) {
  const { f } = r;
  const c = j.c;
  const L = f(c - 1e-9);
  const Rr = f(c + 1e-9);
  const V = f(c);
  const sl = (V - f(c - 1e-6)) / 1e-6;
  const sr = (f(c + 1e-6) - V) / 1e-6;
  return { L: clean(L), R: clean(Rr), V: clean(V), sl: clean(sl), sr: clean(sr), sameSides: abs(L - Rr) < 1e-6 };
}
export const intel = (r: Round) => `Blueprint: ${r.name}, from x = ${r.loText} to ${r.hiText}. Joints to inspect at x = ${r.joints.map((j) => j.cText).join(', ')}.`;
export const hintLine = (r: Round) => `${intel(r)} ${r.assist === 0 ? 'Round 1: the zoom shows the joint you last tapped.' : r.assist === 1 ? 'No zoom: a zoom drone costs a charge.' : 'Boss round: no zoom.'}`;
export const jointAria = (j: Joint) => `Joint at x = ${j.cText}`;

/** The text for the one joint where the ride stopped: the position only, never the kind of fault or what the joint needed. */
export const faultText = (r: Round, joint: number) => `⚠ FAULT at x = ${r.joints[joint].cText}`;
/** A miss says where the first fault is, and what to do about it in plain words; the same for every wrong flag at that joint. */
export function missText(r: Round, flags: Flag[]): string {
  const f = firstFault(r, flags);
  if (!f) return '';
  const x = `x = ${r.joints[f.joint].cText}`;
  const look = r.level === 1 ? 'the left piece, the right piece and the value there' : 'the two sides, the value and the slopes there';
  return `Sir Quacks stopped at the joint at ${x}: the inspector found a fault there. Work out again what the slide does at that joint (${look}), and change your flag.`;
}
export const zoomText = (r: Round, i: number) => `Zoom drone at x = ${r.joints[i].cText}: close-up of the joint for a moment.`;
export function explain(r: Round): string {
  return r.joints.map((j) => {
    const w = want(r.level, j);
    const x = `x = ${j.cText}`;
    const t = facts(r, j);
    if (w === 'gap') return t.sameSides ? `${x}: gap (both sides tend to ${t.L}, but f(${j.cText}) = ${t.V})` : `${x}: gap (from the left ${t.L}, from the right ${t.R}, value ${t.V})`;
    if (w === 'kink') return `${x}: kink (joined at ${t.V}, but the slope jumps from ${t.sl} to ${t.sr})`;
    return r.level === 1 ? `${x}: joined at ${t.V}` : `${x}: smooth (value ${t.V}, slope ${t.sl} on both sides)`;
  }).join('; ');
}
export const winText = (r: Round) => `Slide approved! ${explain(r)}.`;

// ---- The zoom (the only place the true shape appears) --------------------------------------------------------------------------------------------

export interface Zoom {
  c: number;
  w: number;
  /** The left piece from c − w up to just before c. */
  left: [number, number][];
  /** The right piece from just after c up to c + w. */
  right: [number, number][];
  /** The left limit, the right limit and the value at c. */
  L: number; R: number; V: number;
}
/** The real graph of f around joint i, on [c − w, c + w] with w = 6% of the slide's x-range. */
export function zoomWindow(r: Round, i: number, steps = 40): Zoom {
  const c = r.joints[i].c;
  const w = 0.06 * (r.hi - r.lo);
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let k = 0; k < steps; k++) {
    const xl = c - w + (w * k) / steps;
    left.push([xl, r.f(xl)]);
    const xr = c + w - (w * k) / steps;
    right.unshift([xr, r.f(xr)]);
  }
  left.push([c - 1e-9, r.f(c - 1e-9)]);
  right.unshift([c + 1e-9, r.f(c + 1e-9)]);
  return { c, w, left, right, L: r.f(c - 1e-9), R: r.f(c + 1e-9), V: r.f(c) };
}
