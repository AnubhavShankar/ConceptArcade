// Pure rules of Drone Dispatch: no DOM, no canvas. Dash the courier drone is sent a vector (x, y) by tapping the vector plane. Level 1: the vector that joins two
// points. Level 2: a thrust of a given size along a given direction (a unit vector scaled). Level 3: the relay point that divides a leg in the ratio m : n.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'join' | 'mag' | 'section';
export type Pt = [number, number];
export interface Round {
  kind: Kind;
  /** join: the drone D and the pad E. mag: the given direction d and the thrust size M. section: the points P and Q and the ratio m : n. */
  D: Pt;
  E: Pt;
  d: Pt;
  M: number;
  m: number;
  n: number;
  external: boolean;
  /** The winning point on the vector plane, and the start. */
  ans: Pt;
  start: Pt;
  assist: 0 | 1 | 2;
}

export const RANGE = 12;
const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
const blank = { D: [0, 0] as Pt, E: [0, 0] as Pt, d: [0, 0] as Pt, M: 0, m: 0, n: 0, external: false, start: [0, 0] as Pt, assist: 0 as const };
const inside = (p: Pt, r = RANGE) => Math.abs(p[0]) <= r && Math.abs(p[1]) <= r;

function join(random: () => number): Round {
  for (;;) {
    const D: Pt = [ri(-5, 5, random), ri(-5, 5, random)];
    const E: Pt = [ri(-6, 6, random), ri(-6, 6, random)];
    const ans: Pt = [E[0] - D[0], E[1] - D[1]];
    if (ans[0] === 0 || ans[1] === 0 || !inside(ans, 10)) continue;
    return { ...blank, kind: 'join', D, E, ans };
  }
}

const PRIMS: Pt[] = [[3, 4], [4, 3], [-3, 4], [4, -3], [-4, -3], [5, 12], [-5, 12], [12, 5], [12, -5], [8, 15]];
function magnitude(random: () => number): Round {
  for (;;) {
    const prim = pick(PRIMS, random);
    const s = ri(1, 3, random);
    const ans: Pt = [prim[0] * s, prim[1] * s];
    if (!inside(ans)) continue;
    // The direction is shown as a longer multiple, so the unit vector has to be worked out.
    const t = ri(1, 3, random);
    if (t === s) continue;
    const d: Pt = [prim[0] * t, prim[1] * t];
    const norm = Math.hypot(prim[0], prim[1]);
    return { ...blank, kind: 'mag', d, M: s * norm, ans };
  }
}

function section(external: boolean, random: () => number): Round {
  for (;;) {
    const m = ri(1, 4, random);
    const n = ri(1, 4, random);
    if (external && m === n) continue;
    const P: Pt = [ri(-5, 5, random), ri(-5, 5, random)];
    const u: Pt = [ri(-2, 2, random), ri(-2, 2, random)];
    if (u[0] === 0 && u[1] === 0) continue;
    const k = external ? m - n : m + n;
    const Q: Pt = [P[0] + k * u[0], P[1] + k * u[1]];
    const ans: Pt = [P[0] + m * u[0], P[1] + m * u[1]];
    if (!inside(Q, 10) || !inside(ans, 10) || (ans[0] === 0 && ans[1] === 0)) continue;
    return { ...blank, kind: 'section', D: P, E: Q, m, n, external, ans };
  }
}

export function buildRounds(level: number, random: () => number): Round[] {
  const makers: (() => Round)[] = level === 1 ? [() => join(random), () => join(random), () => join(random)]
    : level === 2 ? [() => magnitude(random), () => magnitude(random), () => magnitude(random)]
    : [() => section(false, random), () => section(false, random), () => section(true, random)];
  const out: Round[] = [];
  makers.forEach((make, i) => {
    let r = make();
    for (let t = 0; t < 50 && out.some((o) => o.ans.join() === r.ans.join() && o.D.join() === r.D.join()); t++) r = make();
    out.push({ ...r, assist: aid(i) });
  });
  return out;
}

export const judge = (r: Round, v: Pt) => v[0] === r.ans[0] && v[1] === r.ans[1];
const size = (p: Pt) => Math.hypot(p[0], p[1]);
const pt = (p: Pt) => `(${num(p[0])}, ${num(p[1])})`;
const one = (x: number) => num(Math.round(x * 10) / 10);
export const label = (r: Round) => (r.external ? 'externally' : 'internally');

export function intel(r: Round): string {
  if (r.kind === 'join') return `The drone is at ${pt(r.D)} and the pad is at ${pt(r.E)}. Tap the vector from the drone to the pad.`;
  if (r.kind === 'mag') return `The thrust must point along (${r.d[0]}, ${r.d[1]}) and have size ${one(r.M)}. Tap the end of the thrust vector.`;
  return `Towers at P ${pt(r.D)} and Q ${pt(r.E)}. Tap the relay point R that divides PQ ${label(r)} in the ratio ${r.m} : ${r.n}.`;
}

/** The ratio PR : RQ of a tapped point on the line PQ, or null when it is not on that line. */
function onLine(r: Round, v: Pt): { ratio: string; external: boolean } | null {
  const w: Pt = [r.E[0] - r.D[0], r.E[1] - r.D[1]];
  const a: Pt = [v[0] - r.D[0], v[1] - r.D[1]];
  if (w[0] * a[1] - w[1] * a[0] !== 0) return null;
  const t = (a[0] * w[0] + a[1] * w[1]) / (w[0] * w[0] + w[1] * w[1]);
  if (t === 0 || t === 1) return { ratio: t === 0 ? 'at P' : 'at Q', external: false };
  const pr = Math.abs(t);
  const rq = Math.abs(1 - t);
  return { ratio: `${one(pr)} : ${one(rq)}`, external: t < 0 || t > 1 };
}

/** A test flight: where the tapped vector or point leads, never the right one. */
export function spotText(r: Round, v: Pt): string {
  if (r.kind === 'join') return `Test flight with ${pt(v)}: the drone would land at ${pt([r.D[0] + v[0], r.D[1] + v[1]])}.`;
  if (r.kind === 'mag') return `Test flight with ${pt(v)}: the thrust has size ${one(size(v))}.`;
  const o = onLine(r, v);
  if (!o) return `Test flight with ${pt(v)}: that point is not on the line through P and Q.`;
  return `Test flight with ${pt(v)}: that point is on the line PQ and divides it ${o.external ? 'externally' : 'internally'}, ${o.ratio === 'at P' || o.ratio === 'at Q' ? o.ratio : `PR : RQ = ${o.ratio}`}.`;
}

/** After a miss: the effect, never the right vector. */
export function missText(r: Round, v: Pt): string {
  if (r.kind === 'join') {
    const L: Pt = [r.D[0] + v[0], r.D[1] + v[1]];
    const ew = L[0] === r.E[0] ? '' : L[0] < r.E[0] ? 'west of' : 'east of';
    const ns = L[1] === r.E[1] ? '' : L[1] < r.E[1] ? 'south of' : 'north of';
    return `The drone landed ${[ew, ns].filter(Boolean).join(' and ')} the pad, ${one(Math.hypot(L[0] - r.E[0], L[1] - r.E[1]))} away.`;
  }
  if (r.kind === 'mag') {
    const aligned = v[0] * r.d[1] - v[1] * r.d[0] === 0 && v[0] * r.d[0] + v[1] * r.d[1] > 0;
    if (!aligned) return `The thrust does not point along (${r.d[0]}, ${r.d[1]}): the drone flew off course, with size ${one(size(v))}.`;
    return `The thrust points the right way but its size is ${one(size(v))}, ${size(v) < r.M ? 'less' : 'more'} than the ${one(r.M)} wanted.`;
  }
  const o = onLine(r, v);
  if (!o) return `The relay at ${pt(v)} is not on the line through P and Q, so it cannot divide PQ at all.`;
  return `The relay is on the line PQ but it divides it ${o.external ? 'externally' : 'internally'}${o.ratio.includes(':') ? `, in the ratio ${o.ratio}` : ` (${o.ratio})`}, not as required.`;
}

/** After a hit: the working. */
export function explain(r: Round): string {
  if (r.kind === 'join') return `The vector from the drone to the pad is E − D = ${pt(r.E)} − ${pt(r.D)} = ${pt(r.ans)}.`;
  if (r.kind === 'mag') {
    const norm = size(r.d);
    return `|d| = √(${r.d[0]}² + ${r.d[1]}²) = ${one(norm)}, so the unit vector is d/|d|. Times ${one(r.M)} it is ${pt(r.ans)}.`;
  }
  const k = r.external ? r.m - r.n : r.m + r.n;
  return `${r.external ? 'External' : 'Internal'} division: R = (${r.m}·Q ${r.external ? '−' : '+'} ${r.n}·P)/${k} = ${pt(r.ans)}.`;
}
