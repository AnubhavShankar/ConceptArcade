// Pure rules of the Field-Line Detective: no DOM, no canvas.
// Charges are in arbitrary units (E = q / r² with the constant dropped) and lengths in cm: only the geometry of the
// picture matters here, never a number of newtons.
import { pick } from '@core/quiz';

export interface Pt {
  x: number;
  y: number;
}
export interface Src {
  name: string;
  q: number;
  at: Pt;
}
export const BOUNDS = { x: 24, y: 12.5 };
const NEAR = 0.55; // a line that comes this close to a charge ends on it

export const inBounds = (p: Pt) => Math.abs(p.x) <= BOUNDS.x && Math.abs(p.y) <= BOUNDS.y;
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Field vector at p: each charge contributes q / r² along the line from it (superposition). */
export function fieldAt(p: Pt, srcs: Src[]): Pt {
  let x = 0;
  let y = 0;
  for (const s of srcs) {
    const dx = p.x - s.at.x;
    const dy = p.y - s.at.y;
    const r2 = dx * dx + dy * dy;
    if (r2 < 1e-12) continue;
    const r = Math.sqrt(r2);
    x += (s.q * dx) / (r2 * r);
    y += (s.q * dy) / (r2 * r);
  }
  return { x, y };
}
export const strength = (p: Pt, srcs: Src[]) => Math.hypot(fieldAt(p, srcs).x, fieldAt(p, srcs).y);

export interface Trace {
  pts: Pt[];
  /** Index of the charge the line ended on, or -1 if it left the picture. */
  end: number;
}
/** Follow the field (dir 1) or against it (dir −1) from `start`, in small steps along the field direction. */
export function trace(srcs: Src[], start: Pt, dir: 1 | -1, opts: { step?: number; maxArc?: number } = {}): Trace {
  const step = opts.step ?? 0.2;
  const maxArc = opts.maxArc ?? Infinity;
  const unit = (p: Pt): Pt => {
    const e = fieldAt(p, srcs);
    const m = Math.hypot(e.x, e.y) || 1;
    return { x: (dir * e.x) / m, y: (dir * e.y) / m };
  };
  const pts: Pt[] = [start];
  let p = start;
  let arc = 0;
  for (let i = 0; i < 4000 && arc < maxArc; i++) {
    const e1 = unit(p);
    const mid = { x: p.x + (e1.x * step) / 2, y: p.y + (e1.y * step) / 2 };
    const e2 = unit(mid);
    p = { x: p.x + e2.x * step, y: p.y + e2.y * step };
    arc += step;
    const hit = srcs.findIndex((s) => dist(s.at, p) < NEAR);
    if (hit >= 0) {
      pts.push({ ...srcs[hit].at });
      return { pts, end: hit };
    }
    pts.push(p);
    if (!inBounds(p)) return { pts, end: -1 };
  }
  return { pts, end: -1 };
}

export interface Line {
  pts: Pt[];
  /** Charge it starts on and charge it ends on (-1 = comes from, or runs off to, infinity). */
  from: number;
  to: number;
  /** Set on a deliberately faulty line. */
  reversed?: boolean;
  extra?: boolean;
}

/**
 * The usual picture: from each positive charge leave ∝ q lines. Into each negative charge arrive ∝ |q| lines, but a
 * line that came from a positive charge is already drawn, so only the ones that arrive from far away are added.
 */
export function fieldLines(srcs: Src[], perUnit = 6): Line[] {
  const lines: Line[] = [];
  const ring = (s: Src, k: number, n: number): Pt => {
    const a = (2 * Math.PI * k) / n;
    return { x: s.at.x + 0.7 * Math.cos(a), y: s.at.y + 0.7 * Math.sin(a) };
  };
  // lines leave the positive charges
  srcs.forEach((s, i) => {
    if (s.q <= 0) return;
    const n = Math.round(perUnit * s.q);
    for (let k = 0; k < n; k++) {
      const t = trace(srcs, ring(s, k, n), 1);
      lines.push({ pts: [{ ...s.at }, ...t.pts], from: i, to: t.end });
    }
  });
  // each negative charge should end up with a number of lines proportional to its size: the ones that came from a
  // positive charge are already drawn, and the rest arrive from far away
  srcs.forEach((s, i) => {
    if (s.q >= 0) return;
    const want = Math.round(perUnit * Math.abs(s.q));
    const have = lines.filter((l) => l.to === i).length;
    const missing = want - have;
    if (missing <= 0) return;
    const fine = want * 8;
    const far: Trace[] = [];
    for (let k = 0; k < fine; k++) {
      const t = trace(srcs, ring(s, k, fine), -1);
      if (t.end === -1) far.push(t);
    }
    for (let j = 0; j < Math.min(missing, far.length); j++) {
      const t = far[Math.floor(((j + 0.5) * far.length) / Math.min(missing, far.length))];
      lines.push({ pts: [...t.pts.slice().reverse(), { ...s.at }], from: -1, to: i });
    }
  });
  return lines;
}

// ---- geometry --------------------------------------------------------------------------------------

export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
export function distToPolyline(p: Pt, pts: Pt[]): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, distToSegment(p, pts[i - 1], pts[i]));
  return best;
}
export const distToLines = (p: Pt, lines: Line[]) => Math.min(...lines.map((l) => distToPolyline(p, l.pts)));

/** Do the open segments ab and cd cross? */
export function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = o(a, b, c);
  const d2 = o(a, b, d);
  const d3 = o(c, d, a);
  const d4 = o(c, d, b);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
export function polylinesCross(p: Pt[], q: Pt[]): boolean {
  for (let i = 1; i < p.length; i++) for (let j = 1; j < q.length; j++) if (segmentsCross(p[i - 1], p[i], q[j - 1], q[j])) return true;
  return false;
}
export const arcLength = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0);

// ---- a charge released from rest ------------------------------------------------------------------------

/**
 * Path of a charge released from rest. It is pushed along the field (or against it, for a negative charge) and has
 * inertia, so once the line curves it cannot turn as sharply as the line does. Accelerations are scaled by the field
 * at the start, which only changes the speed, never the shape of the path.
 */
export function releasePath(srcs: Src[], start: Pt, sign: 1 | -1, maxArc = 8): Pt[] {
  const e0 = fieldAt(start, srcs);
  const m0 = Math.hypot(e0.x, e0.y) || 1;
  const a0 = 6; // cm/s²
  const acc = (p: Pt): Pt => {
    const e = fieldAt(p, srcs);
    return { x: (sign * e.x * a0) / m0, y: (sign * e.y * a0) / m0 };
  };
  const dt = 0.02;
  let p = start;
  let v: Pt = { x: 0, y: 0 };
  let a = acc(p);
  const pts: Pt[] = [p];
  let arc = 0;
  for (let i = 0; i < 6000 && arc < maxArc; i++) {
    const np = { x: p.x + v.x * dt + 0.5 * a.x * dt * dt, y: p.y + v.y * dt + 0.5 * a.y * dt * dt };
    const na = acc(np);
    v = { x: v.x + 0.5 * (a.x + na.x) * dt, y: v.y + 0.5 * (a.y + na.y) * dt };
    arc += dist(p, np);
    p = np;
    a = na;
    pts.push(p);
    if (srcs.some((s) => dist(s.at, p) < NEAR) || !inBounds(p)) break;
  }
  return pts;
}
/** Largest distance between the released charge's path and the field line through its starting point. */
export function deviation(srcs: Src[], start: Pt, sign: 1 | -1, maxArc = 8): number {
  const path = releasePath(srcs, start, sign, maxArc);
  const line = trace(srcs, start, sign, { maxArc: arcLength(path) + 1, step: 0.1 }).pts;
  return Math.max(...path.map((p) => distToPolyline(p, line)));
}
/** A path that stays within this distance of the line "follows" it; the levels never use a point that is close to the line between. */
export const FOLLOWS = 0.35;
export const CLEARLY_OFF = 0.9;

// ---- levels ------------------------------------------------------------------------------------------------

export type Flaw = 'cross' | 'loop' | 'gap' | 'arrow';
export const FLAW_RULE: Record<Flaw, string> = {
  cross: 'Two field lines never cross',
  loop: 'Field lines never form closed loops',
  gap: 'Field lines never start or stop in empty space',
  arrow: 'Field lines point away from + and towards −',
};

export interface LevelFlaw {
  kind: 'flaw';
  story: string;
  sources: Src[];
  lines: Line[];
  flaw: Flaw;
  /** Where the fault is, and how close a tap must be (cm). */
  at: Pt;
  tolerance: number;
  freeTests: number;
}
export interface LevelRead {
  kind: 'read';
  story: string;
  /** The true charges. The picture shows them without signs. */
  sources: Src[];
  lines: Line[];
  stronger: 'A' | 'B' | 'equal';
  freeTests: number;
}
export interface LevelRank {
  kind: 'rank';
  story: string;
  sources: Src[];
  lines: Line[];
  points: { name: string; at: Pt }[];
  /** Point indices from the strongest field to the weakest. */
  answer: number[];
  freeTests: number;
}
export interface LevelRelease {
  kind: 'release';
  story: string;
  sources: Src[];
  lines: Line[];
  /** The sign of the released charge. */
  sign: 1 | -1;
  points: Pt[];
  /** Which points would make the released charge follow its line. */
  follows: boolean[];
  freeTests: number;
}
export type Level = LevelFlaw | LevelRead | LevelRank | LevelRelease;

const pickSign = (random: () => number): 1 | -1 => (random() < 0.5 ? -1 : 1);
const rnd = (random: () => number, lo: number, hi: number) => lo + random() * (hi - lo);

function pair(random: () => number, magnitudes: [number, number][]): Src[] {
  const d = pick([6, 7, 8], random);
  const [ma, mb] = pick(magnitudes, random);
  const sa = pickSign(random);
  const sb = pickSign(random);
  return [
    { name: 'A', q: sa * ma, at: { x: -d, y: 0 } },
    { name: 'B', q: sb * mb, at: { x: d, y: 0 } },
  ];
}

function emptySpot(lines: Line[], srcs: Src[], random: () => number): Pt {
  let best: Pt = { x: 0, y: 9 };
  let bestD = -1;
  for (let i = 0; i < 400; i++) {
    const p = { x: rnd(random, -19, 19), y: rnd(random, -9.5, 9.5) };
    const d = Math.min(distToLines(p, lines), ...srcs.map((s) => dist(p, s.at)));
    if (d > bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const sources = pair(random, [[1, 1], [1, 2], [2, 1]]);
    const lines = fieldLines(sources, 5);
    const flaw = pick(['cross', 'loop', 'gap', 'arrow'] as Flaw[], random);
    const usable = lines.map((l, i) => ({ l, i })).filter(({ l }) => l.pts.length > 30 && Math.min(...sources.map((s) => dist(s.at, l.pts[Math.floor(l.pts.length / 2)]))) > 5);
    const chosen = usable.length ? pick(usable, random) : { l: lines[0], i: 0 };
    const mid = chosen.l.pts[Math.floor(chosen.l.pts.length / 2)];
    let at = mid;
    let drawn = lines.map((l) => ({ ...l }));
    if (flaw === 'cross') {
      // cross the line in the middle of one of its segments, never at a vertex
      const a = chosen.l.pts[Math.floor(chosen.l.pts.length / 2)];
      const b = chosen.l.pts[Math.floor(chosen.l.pts.length / 2) + 1];
      at = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const tx = b.x - a.x;
      const ty = b.y - a.y;
      const m = Math.hypot(tx, ty) || 1;
      const nx = -ty / m;
      const ny = tx / m;
      // vertices at odd multiples of 0.3 so the crossing falls inside a segment, never exactly on a vertex
      const pts = Array.from({ length: 13 }, (_, i) => ({ x: at.x + nx * ((i - 6) * 0.6 + 0.3), y: at.y + ny * ((i - 6) * 0.6 + 0.3) }));
      drawn.push({ pts, from: -1, to: -1, extra: true });
    } else if (flaw === 'loop') {
      at = emptySpot(lines, sources, random);
      const pts = Array.from({ length: 41 }, (_, i) => ({ x: at.x + 2.4 * Math.cos((i / 40) * Math.PI * 2), y: at.y + 2.4 * Math.sin((i / 40) * Math.PI * 2) }));
      drawn.push({ pts, from: -1, to: -1, extra: true });
    } else if (flaw === 'gap') {
      const cut = Math.floor(chosen.l.pts.length * rnd(random, 0.4, 0.6));
      drawn = drawn.map((l, i) => (i === chosen.i ? { ...l, pts: l.pts.slice(0, cut), to: -1 } : l));
      at = chosen.l.pts[cut - 1];
    } else {
      drawn = drawn.map((l, i) => (i === chosen.i ? { ...l, reversed: true } : l));
    }
    return {
      kind: 'flaw',
      story: 'A field-line diagram has come back from the print shop with one fault. Look carefully, tap the fault on the diagram, then say which rule of field lines it breaks. The arrows drifting along each line show its direction.',
      sources,
      lines: drawn,
      flaw,
      at,
      tolerance: 3,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const sources = pair(random, [[1, 1], [1, 2], [2, 1]]);
    const lines = fieldLines(sources, 6);
    const [a, b] = sources;
    return {
      kind: 'read',
      story: 'Two charges, A and B, are drawn as field lines, but their signs and sizes have been left off. Read them from the picture: where lines start and end, which way the arrows point, and how many lines each charge has.',
      sources,
      lines,
      stronger: Math.abs(a.q) > Math.abs(b.q) ? 'A' : Math.abs(a.q) < Math.abs(b.q) ? 'B' : 'equal',
      freeTests: 1,
    };
  }
  if (level === 3) {
    const sources = pair(random, [[1, 1], [1, 2], [2, 1], [2, 3]]);
    const lines = fieldLines(sources, 5);
    const names = ['X', 'Y', 'Z'];
    let chosen: { name: string; at: Pt }[] | null = null;
    for (let tries = 0; tries < 800 && !chosen; tries++) {
      const pts = names.map((name) => ({ name, at: { x: rnd(random, -18, 18), y: rnd(random, -9, 9) } }));
      if (pts.some((p) => sources.some((s) => dist(p.at, s.at) < 3.5))) continue;
      if (pts.some((p, i) => pts.some((q, j) => i < j && dist(p.at, q.at) < 6))) continue;
      const e = pts.map((p) => strength(p.at, sources)).sort((u, v) => v - u);
      if (e[0] / e[1] >= 1.7 && e[1] / e[2] >= 1.7) chosen = pts;
    }
    const points = chosen ?? [{ name: 'X', at: { x: -12, y: 0 } }, { name: 'Y', at: { x: 14, y: 6 } }, { name: 'Z', at: { x: 0, y: -9 } }];
    const answer = points.map((_, i) => i).sort((i, j) => strength(points[j].at, sources) - strength(points[i].at, sources));
    return {
      kind: 'rank',
      story: 'Three points are marked on a field-line picture. Where the lines are packed closely the field is strong, and where they spread out it is weak. Tap the points in order from the strongest field to the weakest, then check with the field meter.',
      sources,
      lines,
      points,
      answer,
      freeTests: 1,
    };
  }
  // level 4: which released charges follow their line?
  let built: LevelRelease | null = null;
  for (let tries = 0; tries < 60 && !built; tries++) {
    // an equal and opposite pair: no neutral point, so every line runs cleanly from one charge to the other or off to infinity
    const d = pick([6, 7, 8], random);
    const sa = pickSign(random);
    const sources: Src[] = [{ name: 'A', q: sa, at: { x: -d, y: 0 } }, { name: 'B', q: -sa, at: { x: d, y: 0 } }];
    const sign = pickSign(random);
    const onAxis = shuffleList([{ x: d / 2, y: 0 }, { x: -d / 2, y: 0 }, { x: d + 5, y: 0 }, { x: -d - 5, y: 0 }, { x: 0, y: 0 }].filter((p) => sources.every((s) => dist(p, s.at) > 3)), random).slice(0, 2);
    const off: Pt[] = [];
    for (let k = 0; k < 400 && off.length < 4; k++) {
      const p = { x: rnd(random, -16, 16), y: (random() < 0.5 ? -1 : 1) * rnd(random, 3.5, 9) };
      if (sources.some((s) => dist(p, s.at) < 3.5) || off.some((o) => dist(o, p) < 5) || onAxis.some((o) => dist(o, p) < 4)) continue;
      if (deviation(sources, p, sign) >= CLEARLY_OFF) off.push(p);
    }
    if (off.length < 4 || onAxis.length < 2) continue;
    const points = shuffleList([...onAxis, ...off], random);
    const follows = points.map((p) => deviation(sources, p, sign) <= FOLLOWS);
    if (follows.filter(Boolean).length < 1) continue;
    built = {
      kind: 'release',
      story: 'Charges are released from rest at the marked points. A field line shows which way the force points, but does a released charge travel along the line? Tap the points where it would follow its line exactly, then release them all to see.',
      sources,
      lines: fieldLines(sources, 5),
      sign,
      points,
      follows,
      freeTests: 1,
    };
  }
  if (built) return built;
  const sources: Src[] = [{ name: 'A', q: 1, at: { x: -7, y: 0 } }, { name: 'B', q: -1, at: { x: 7, y: 0 } }];
  const points: Pt[] = [{ x: 0, y: 0 }, { x: -12, y: 0 }, { x: 0, y: 6 }, { x: 10, y: 7 }, { x: -10, y: -7 }, { x: 3, y: -8 }];
  return { kind: 'release', story: 'Charges are released from rest at the marked points. Tap the points where the charge would follow its line exactly, then release them all.', sources, lines: fieldLines(sources, 5), sign: 1, points, follows: points.map((p) => deviation(sources, p, 1) <= FOLLOWS), freeTests: 1 };
}

function shuffleList<T>(list: T[], random: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- judging ---------------------------------------------------------------------------------------------------

export interface FlawResult {
  ok: boolean;
  tapOk: boolean;
  ruleOk: boolean;
}
export function judgeFlaw(lvl: LevelFlaw, tap: Pt, rule: Flaw): FlawResult {
  const tapOk = dist(tap, lvl.at) <= lvl.tolerance;
  const ruleOk = rule === lvl.flaw;
  return { ok: tapOk && ruleOk, tapOk, ruleOk };
}

export interface ReadResult {
  ok: boolean;
  signsOk: [boolean, boolean];
  strongerOk: boolean;
}
export function judgeRead(lvl: LevelRead, signA: 1 | -1, signB: 1 | -1, stronger: 'A' | 'B' | 'equal'): ReadResult {
  const [a, b] = lvl.sources;
  const signsOk: [boolean, boolean] = [signA === Math.sign(a.q), signB === Math.sign(b.q)];
  const strongerOk = stronger === lvl.stronger;
  return { ok: signsOk[0] && signsOk[1] && strongerOk, signsOk, strongerOk };
}

export const strengthsAt = (lvl: LevelRank) => lvl.points.map((p) => strength(p.at, lvl.sources));
export function judgeRank(lvl: LevelRank, order: number[]): { ok: boolean; correctPlaces: number } {
  const correctPlaces = order.filter((v, i) => v === lvl.answer[i]).length;
  return { ok: order.length === lvl.answer.length && correctPlaces === lvl.answer.length, correctPlaces };
}

export function judgeRelease(lvl: LevelRelease, selected: number[]): { ok: boolean; missed: number; extra: number } {
  const set = new Set(selected);
  const missed = lvl.follows.filter((f, i) => f && !set.has(i)).length;
  const extra = lvl.follows.filter((f, i) => !f && set.has(i)).length;
  return { ok: missed === 0 && extra === 0, missed, extra };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win --------------------------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'flaw') {
    const why: Record<Flaw, string> = {
      cross: 'At a point where two lines crossed, the field would have two directions at once. The field at any point has exactly one direction, so field lines never cross. (Exercise 1.7b)',
      loop: 'Field lines start on positive charges and end on negative ones. A closed loop would need a line that never ends, which an electrostatic field cannot make.',
      gap: 'A field line is a continuous curve: it starts on a positive charge (or comes from far away) and ends on a negative charge (or runs off to infinity). It cannot break off in empty space. (Exercise 1.7a)',
      arrow: 'The field points away from a positive charge and towards a negative one, so the arrows on every line must run from + towards −.',
    };
    return [`The fault was: ${FLAW_RULE[lvl.flaw].toLowerCase()}.`, why[lvl.flaw], 'The tangent to a field line at a point gives the direction of the field there, and the lines are drawn closer together where the field is stronger.'];
  }
  if (lvl.kind === 'read') {
    const [a, b] = lvl.sources;
    const sign = (q: number) => (q > 0 ? 'positive' : 'negative');
    return [
      `Lines leave a positive charge and arrive on a negative one. A is ${sign(a.q)}, B is ${sign(b.q)}.`,
      lvl.stronger === 'equal' ? 'Both charges have the same number of lines, so they have equal magnitudes.' : `The number of lines is proportional to the size of the charge: ${lvl.stronger} has more lines, so it is the larger charge.`,
      'When the charges are unequal and opposite, the lines of the larger charge that find no partner run off to infinity.',
    ];
  }
  if (lvl.kind === 'rank') {
    const e = strengthsAt(lvl);
    return [
      'Field strength is shown by how close together the lines are: closely packed means strong, spread out means weak.',
      `Order from strongest to weakest: ${lvl.answer.map((i) => lvl.points[i].name).join(', then ')}.`,
      `The meter readings agree: ${lvl.answer.map((i) => `${lvl.points[i].name} = ${e[i].toFixed(2)}`).join(', ')} (arbitrary units).`,
    ];
  }
  const follow = lvl.follows.filter(Boolean).length;
  return [
    'A field line gives the direction of the force at each point, and a released charge starts to move along it.',
    `Only ${follow} of the points lie on a straight line, and there the charge stays on the line. Where the line curves, the charge has inertia: it keeps going in its old direction and swings off the line.`,
    'So a charge released from rest does not, in general, follow a field line. It does only when the line is straight.',
  ];
}
