// Pure rules of the Equipotential Explorer: no DOM, no canvas.
// Charges in nC, distances in cm, potentials in volts, fields in V/m (= N/C).
import { pick } from '@core/quiz';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
export interface Pt {
  x: number;
  y: number;
}
export interface Src {
  q: number;
  at: Pt;
}
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const potentialAt = (p: Pt, srcs: Src[]) => srcs.reduce((v, s) => v + (dist(p, s.at) > 1e-9 ? (900 * s.q) / dist(p, s.at) : 0), 0);
export function fieldAt(p: Pt, srcs: Src[]): Pt {
  let x = 0;
  let y = 0;
  for (const s of srcs) {
    const dx = p.x - s.at.x;
    const dy = p.y - s.at.y;
    const r = Math.hypot(dx, dy);
    if (r < 1e-9) continue;
    const e = (9e4 * s.q) / (r * r);
    x += (e * dx) / r;
    y += (e * dy) / r;
  }
  return { x, y };
}
export const strength = (p: Pt, srcs: Src[]) => Math.hypot(fieldAt(p, srcs).x, fieldAt(p, srcs).y);

export const BOUNDS = { x: 24, y: 12.5 };
const inside = (p: Pt) => Math.abs(p.x) <= BOUNDS.x && Math.abs(p.y) <= BOUNDS.y;
const rnd = (random: () => number, lo: number, hi: number) => lo + random() * (hi - lo);

// ---- level 1: find the equipotential ---------------------------------------------------------------------------------

export type Angle = 'perpendicular' | 'along' | 'any';
export interface LevelFind {
  kind: 'find';
  story: string;
  sources: Src[];
  /** The marked point and its potential. Taps must match this potential. */
  mark: Pt;
  target: number;
  tolerance: number;
  /** True when the equipotential through the mark is the straight line halfway between two equal and opposite charges. */
  bisector: boolean;
  freeTests: number;
}
export function buildFind(random: () => number): LevelFind {
  const a = pick([5, 6, 8], random);
  const q = pick([2, 3, 4], random);
  const kindOf = pick(['dipole', 'dipole', 'unequal', 'like'] as const, random);
  let sources: Src[];
  if (kindOf === 'dipole') sources = [{ q, at: { x: -a, y: 0 } }, { q: -q, at: { x: a, y: 0 } }];
  else if (kindOf === 'unequal') sources = [{ q: q + 2, at: { x: -a, y: 0 } }, { q: -q, at: { x: a, y: 0 } }];
  else sources = [{ q, at: { x: -a, y: 0 } }, { q, at: { x: a, y: 0 } }];
  let mark: Pt = { x: 0, y: 6 };
  const bisector = kindOf === 'dipole' && random() < 0.5;
  if (bisector) mark = { x: 0, y: pick([4, 6, -4, -6, 8], random) };
  else {
    for (let i = 0; i < 400; i++) {
      const p = { x: rnd(random, -16, 16), y: rnd(random, -9, 9) };
      if (sources.some((s) => dist(s.at, p) < 4)) continue;
      const v = Math.abs(potentialAt(p, sources));
      if (v > 90 && v < 450) {
        mark = p;
        break;
      }
    }
  }
  const target = potentialAt(mark, sources);
  return {
    kind: 'find',
    story: 'An equipotential surface joins points that all have the same potential. One point on the map is marked, and its potential is the target. Tap other points where the potential is the same until three are found. Each tap reads the potential there. Then say how the electric field meets the surface.',
    sources,
    mark,
    target,
    tolerance: Math.max(25, 0.15 * Math.abs(target)), // wide enough that a tap by finger or mouse can land on the band
    bisector,
    freeTests: 1,
  };
}
/** Is a tap on the equipotential? (Close in potential, and not on the mark or on another found point.) */
export function tapMatches(lvl: LevelFind, p: Pt, found: Pt[]): boolean {
  if (!inside(p)) return false;
  if (dist(p, lvl.mark) < 3 || found.some((f) => dist(f, p) < 3)) return false;
  return Math.abs(potentialAt(p, lvl.sources) - lvl.target) <= lvl.tolerance;
}
export const needed = 3;
export const tapStars = (taps: number, misses: number): 1 | 2 | 3 => Math.max(1, (taps <= 7 ? 3 : taps <= 12 ? 2 : 1) - misses) as 1 | 2 | 3;
export function judgeAngle(guess: Angle): { ok: boolean } {
  return { ok: guess === 'perpendicular' };
}

// ---- level 2: field from potential -----------------------------------------------------------------------------------

export type Way = 'a-to-b' | 'b-to-a';
export interface LevelUniform {
  kind: 'uniform';
  story: string;
  e: number; // V/m
  d: number; // cm, between A and B along the field
  vA: number;
  vB: number;
  /** +1 if the field points from A to B (so the potential falls from A to B). */
  from: Way;
  freeTests: number;
}
export function buildUniform(random: () => number): LevelUniform {
  const e = pick([200, 400, 500, 800, 1000, 1500], random);
  const d = pick([2, 3, 4, 5, 8, 10], random);
  const vA = pick([-60, -30, 0, 20, 50, 80], random);
  const dv = (e * d) / 100;
  const from: Way = random() < 0.5 ? 'a-to-b' : 'b-to-a';
  // the field points towards lower potential
  const vB = from === 'a-to-b' ? vA - dv : vA + dv;
  return {
    kind: 'uniform',
    story: 'Between two large charged plates the field is uniform. Two probes, A and B, read the potential at their positions. Use the readings and the distance between them along the field to find the strength of the field, and say which way it points.',
    e,
    d,
    vA,
    vB,
    from,
    freeTests: 1,
  };
}
export function judgeUniform(lvl: LevelUniform, e: number, way: Way): { ok: boolean; eOk: boolean; wayOk: boolean } {
  const eOk = Math.abs(e - lvl.e) / lvl.e <= 0.03;
  const wayOk = way === lvl.from;
  return { ok: eOk && wayOk, eOk, wayOk };
}

// ---- level 3: rank by crowding --------------------------------------------------------------------------------------------

export interface LevelRank {
  kind: 'rank';
  story: string;
  sources: Src[];
  points: { name: string; at: Pt }[];
  answer: number[];
  freeTests: number;
}
export function buildRank(random: () => number): LevelRank {
  const a = pick([5, 6, 8], random);
  const [qa, qb] = pick([[3, 3], [2, 4], [4, 2], [3, 5]], random);
  const s = random() < 0.5 ? 1 : -1;
  const sources: Src[] = [{ q: s * qa, at: { x: -a, y: 0 } }, { q: -s * qb, at: { x: a, y: 0 } }];
  const names = ['X', 'Y', 'Z'];
  let chosen: { name: string; at: Pt }[] | null = null;
  for (let t = 0; t < 800 && !chosen; t++) {
    const pts = names.map((name) => ({ name, at: { x: rnd(random, -18, 18), y: rnd(random, -9, 9) } }));
    if (pts.some((p) => sources.some((c) => dist(p.at, c.at) < 3.5))) continue;
    if (pts.some((p, i) => pts.some((q, j) => i < j && dist(p.at, q.at) < 6))) continue;
    const e = pts.map((p) => strength(p.at, sources)).sort((u, v) => v - u);
    if (e[0] / e[1] >= 1.7 && e[1] / e[2] >= 1.7) chosen = pts;
  }
  const points = chosen ?? [{ name: 'X', at: { x: -12, y: 2 } }, { name: 'Y', at: { x: 14, y: 6 } }, { name: 'Z', at: { x: 0, y: -9 } }];
  const answer = points.map((_, i) => i).sort((i, j) => strength(points[j].at, sources) - strength(points[i].at, sources));
  return {
    kind: 'rank',
    story: 'On this potential map the colour changes in steps, so the edges of the bands are equipotential surfaces. Where the bands are packed closely the potential changes quickly over a short distance, which means the field is strong. Tap the three points in order from the strongest field to the weakest.',
    sources,
    points,
    answer,
    freeTests: 1,
  };
}
export const strengthsAt = (lvl: LevelRank) => lvl.points.map((p) => strength(p.at, lvl.sources));
export function judgeRank(lvl: LevelRank, order: number[]): { ok: boolean; correctPlaces: number } {
  const correctPlaces = order.filter((v, i) => v === lvl.answer[i]).length;
  return { ok: order.length === lvl.answer.length && correctPlaces === lvl.answer.length, correctPlaces };
}

export type Level = LevelFind | LevelUniform | LevelRank;
export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) return buildFind(random);
  if (level === 2) return buildUniform(random);
  return buildRank(random);
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win ---------------------------------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'find') {
    return [
      lvl.bisector ? 'Halfway between two equal and opposite charges, every point is the same distance from both, so the two potentials cancel: V = 0 along the whole plane that bisects the line joining them (Exercise 2.3a).' : 'An equipotential surface is the set of points with the same potential. Its shape depends on all the charges: near a single charge it is a sphere.',
      'The electric field is always perpendicular to an equipotential surface (Exercise 2.3b). If it had a part along the surface, moving a charge along the surface would take work, and the potential would not be constant.',
      'The field points from higher to lower potential.',
    ];
  }
  if (lvl.kind === 'uniform') {
    return [
      `The potential difference between A and B is ${fmt(Math.abs(lvl.vA - lvl.vB))} V over ${lvl.d} cm.`,
      `In a uniform field E = ΔV / d = ${fmt(Math.abs(lvl.vA - lvl.vB))} V / ${lvl.d / 100} m = ${fmt(lvl.e)} V/m.`,
      `The field points towards lower potential: from ${lvl.from === 'a-to-b' ? 'A to B' : 'B to A'}.`,
    ];
  }
  const e = strengthsAt(lvl);
  return [
    'The field is the rate at which the potential changes with distance: E = −dV/dr. Where equipotential bands are close together, V changes quickly and E is large.',
    `Order from strongest to weakest: ${lvl.answer.map((i) => lvl.points[i].name).join(', then ')}.`,
    `Relative strengths: ${lvl.answer.map((i) => `${lvl.points[i].name} = ${fmt(e[i])}`).join(', ')} (V/m).`,
  ];
}
