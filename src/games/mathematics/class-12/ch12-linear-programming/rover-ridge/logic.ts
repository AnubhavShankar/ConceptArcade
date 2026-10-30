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
}

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
  const vals = r.corners.map((p) => value(r, p));
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  if (z < lo || z > hi) return 'misses';
  if (z === lo || z === hi) return 'touches';
  return 'cuts';
}

const zText = (r: Round) => `${r.a < 0 ? '−' : ''}${Math.abs(r.a) === 1 ? '' : Math.abs(r.a)}x ${r.b < 0 ? '−' : '+'} ${Math.abs(r.b) === 1 ? '' : Math.abs(r.b)}y`;
export function intel(r: Round): string {
  return `The plateau is ${r.constraints.join(', ')}. Ore is Z = ${zText(r)}. Park the ruler where the plateau only just touches it, at the ${r.goal === 'max' ? 'largest' : 'smallest'} Z.`;
}
export function spotText(r: Round, z: number): string {
  const s = ruler(r, z);
  return `Probe at Z = ${num(z)}: the ruler ${s === 'cuts' ? 'cuts across the plateau' : s === 'touches' ? 'just touches the plateau at its edge' : 'misses the plateau completely'}.`;
}
/** After a miss: what the ruler did, never the best Z. */
export function missText(r: Round, z: number): string {
  const s = ruler(r, z);
  if (s === 'misses') return `The ruler at Z = ${num(z)} is off the plateau: there is no ground with that much ${z > r.ans === (r.goal === 'max') ? 'ore' : 'ore (or so little)'}, and the rover found nothing.`;
  if (s === 'touches') return `The ruler at Z = ${num(z)} only touches the plateau at its far end, which is the wrong end for the ${r.goal === 'max' ? 'richest' : 'poorest'} ground.`;
  return `The ruler at Z = ${num(z)} cuts across the plateau, so there is ground ${r.goal === 'max' ? 'richer' : 'poorer'} than that further on: the rover stopped short.`;
}
/** After a hit: the working. */
export function explain(r: Round): string {
  const list = r.corners.map((p) => `(${num(p[0])}, ${num(p[1])}) → ${num(value(r, p))}`).join(', ');
  return `Z at each corner: ${list}. The ${r.goal === 'max' ? 'largest' : 'smallest'} is ${num(r.ans)}, at (${num(r.best[0])}, ${num(r.best[1])}).`;
}
