// Pure rules of the Field Bench: no DOM, no canvas.
// Units: charge in nC, distance in cm, field in N/C, mass in µg, speed in m/s, deflection in mm.
//   E = k Q / r²  with k = 9 × 10⁹  becomes  E = 9 × 10⁴ Q / r²  in these units.
import { pick } from '@core/quiz';

export const K_E = 9e4;
export interface Pt {
  x: number;
  y: number;
}
export interface Source {
  q: number;
  at: Pt;
}

/** Field magnitude of a point charge Q at distance r (signed by Q). */
export const pointField = (qNc: number, rCm: number) => (K_E * qNc) / (rCm * rCm);

/** Field vector (N/C) at p from point charges, added as vectors (superposition). */
export function fieldAt(p: Pt, sources: Source[]): Pt {
  let x = 0;
  let y = 0;
  for (const s of sources) {
    const dx = p.x - s.at.x;
    const dy = p.y - s.at.y;
    const r = Math.hypot(dx, dy);
    if (r < 1e-9) continue; // the field is not defined at the charge itself
    const e = pointField(s.q, r);
    x += (e * dx) / r;
    y += (e * dy) / r;
  }
  return { x, y };
}
export const magnitude = (v: Pt) => Math.hypot(v.x, v.y);

/** Force (N) on a test charge of q nC in a field of E N/C: F = qE. */
export const forceOnCharge = (qNc: number, e: number) => qNc * 1e-9 * e;

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
/** 3 significant figures, in scientific notation when very large or small. */
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
export const signed = (q: number, unit = 'nC') => `${q < 0 ? '−' : '+'}${fmt(Math.abs(q))} ${unit}`;

// ---- charged particle in a uniform field (ink-jet and tracks) -------------------------------------

export interface Particle {
  /** Charge in nC (signed) and mass in µg. */
  q: number;
  m: number;
}
/** Acceleration (m/s²) in a field of E N/C pointing along `dir` (+1 up, −1 down): a = qE/m. */
export const accel = (p: Particle, e: number, dir: 1 | -1) => (p.q * dir * e) / p.m;

/**
 * Sideways displacement (m) after crossing plates of length L (m) at speed v0, then drifting a further D (m) to the paper.
 * Inside the plates y = ½ a t² with t = L / v0; afterwards the drop travels straight with the sideways speed a t.
 */
export function deflection(p: Particle, e: number, dir: 1 | -1, v0: number, L: number, D = 0): number {
  const a = accel(p, e, dir);
  const t = L / v0;
  return 0.5 * a * t * t + a * t * (D / v0);
}
/** The path of the particle: position at time t (s), with the plates from x = 0 to L, straight beyond. */
export function pathAt(p: Particle, e: number, dir: 1 | -1, v0: number, L: number, t: number): Pt {
  const a = accel(p, e, dir);
  const tin = L / v0;
  if (t <= tin) return { x: v0 * t, y: 0.5 * a * t * t };
  const vy = a * tin;
  return { x: L + v0 * (t - tin), y: 0.5 * a * tin * tin + vy * (t - tin) };
}

// ---- levels --------------------------------------------------------------------------------------

export interface LevelPoint {
  kind: 'point';
  story: string;
  Q: number;
  /** Distance at which the field equals the target (cm), and that field (N/C). */
  rAnswer: number;
  target: number;
  tol: number;
  freeTests: number;
  /** The test charge that will be placed at the probe (nC, negative so the sign of the force is a real question). */
  testQ: number;
}
export interface LevelPair {
  kind: 'pair';
  story: string;
  sources: Source[];
  probe: Pt;
  /** The force the test charge must feel, along x (N, signed), and the test charge that does it (nC). */
  targetF: number;
  qAnswer: number;
  tol: number;
  freeTests: number;
}
export interface LevelJet {
  kind: 'jet';
  story: string;
  drop: Particle;
  v0: number;
  /** Plate length and the gap from the plates to the paper, cm. */
  L: number;
  D: number;
  /** Where the drop must land on the paper: mm above (+) or below (−) the beam line. */
  yTarget: number;
  eAnswer: number;
  dirAnswer: 1 | -1;
  tol: number;
  freeTests: number;
}
export interface Track {
  id: number;
  q: number;
  m: number;
}
export interface LevelTracks {
  kind: 'tracks';
  story: string;
  e: number;
  /** Field direction, +1 up. */
  dir: 1 | -1;
  v0: number;
  L: number;
  tracks: Track[];
  highest: number;
  freeTests: number;
}
export type Level = LevelPoint | LevelPair | LevelJet | LevelTracks;

const pickSigned = (random: () => number, list: number[]) => (random() < 0.5 ? -1 : 1) * pick(list, random);

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const Q = pickSigned(random, [2, 3, 4, 5, 6, 8, 10]);
    const rAnswer = pick([10, 12, 15, 20, 25, 30, 40], random);
    return {
      kind: 'point',
      story: 'A fixed charge fills the space around it with an electric field. The dust specks drifting past show its direction and strength. Move the probe until the field meter reads the target value. Then decide which way a negative test charge placed there would be pushed, and release it to check.',
      Q,
      rAnswer,
      target: Math.abs(pointField(Q, rAnswer)),
      tol: 0.03,
      freeTests: 1,
      testQ: -2,
    };
  }
  if (level === 2) {
    const a = pick([5, 6, 8, 10], random);
    const mags = [2, 3, 4, 5, 6, 8];
    let q1 = pickSigned(random, mags);
    let q2 = pickSigned(random, mags);
    const out = random() < 0.4;
    const sources: Source[] = [{ q: q1, at: { x: -a, y: 0 } }, { q: q2, at: { x: a, y: 0 } }];
    const probe: Pt = out ? { x: 2 * a, y: 0 } : { x: 0, y: 0 };
    let ex = fieldAt(probe, sources).x;
    // avoid a field that almost cancels, which would make the puzzle about luck
    if (Math.abs(ex) < 0.15 * Math.max(...sources.map((s) => Math.abs(pointField(s.q, Math.hypot(probe.x - s.at.x, 0)))))) {
      q2 = -q1;
      sources[1] = { q: q2, at: { x: a, y: 0 } };
      ex = fieldAt(probe, sources).x;
    }
    q1 = sources[0].q;
    const qAnswer = pickSigned(random, [1, 2, 3, 4, 5]);
    return {
      kind: 'pair',
      story: 'Two fixed charges set up a field. A test charge will be placed at the marked point P, and the force on it must have exactly the size and direction in the order. Work out the field at P by adding the two fields as vectors, then choose the test charge, with its sign.',
      sources,
      probe,
      targetF: forceOnCharge(qAnswer, ex),
      qAnswer,
      tol: 0.03,
      freeTests: 1,
    };
  }
  if (level === 3 || level === 5) {
    const q = pickSigned(random, [1, 2, 4]);
    const m = pick([1, 2, 4], random);
    const v0 = pick([10, 20, 25, 40], random);
    const L = 2; // cm
    const D = level === 5 ? pick([2, 3, 4, 6], random) : 0;
    const above = random() < 0.5;
    const yAbs = pick([2, 3, 4, 5, 6, 8], random);
    const yTarget = above ? yAbs : -yAbs;
    // the field that puts the drop on the target: E = y m v0² / (q L (L/2 + D)), in these units
    const dirAnswer: 1 | -1 = (q > 0) === above ? 1 : -1;
    const Lm = L / 100;
    const Dm = D / 100;
    const eAnswer = (Math.abs(yTarget) / 1000 * m * v0 * v0) / (Math.abs(q) * Lm * (Lm / 2 + Dm));
    return {
      kind: 'jet',
      story:
        level === 3
          ? 'An ink-jet printer charges each ink drop, then sends it between two plates. The field between the plates deflects the drop sideways. Choose the direction and the strength of the field so the drop lands on the marked spot at the plate edge. Drops of the opposite sign bend the other way.'
          : 'Now the paper is some distance beyond the plates. The drop is deflected inside the plates and then travels straight on, so it keeps moving sideways while it crosses the gap. Choose the field so the drop lands on the marked spot on the paper.',
      drop: { q, m },
      v0,
      L,
      D,
      yTarget,
      eAnswer,
      dirAnswer,
      tol: 0.04,
      freeTests: 1,
    };
  }
  // level 4: tracks in a uniform field
  const dir: 1 | -1 = random() < 0.5 ? 1 : -1;
  const v0 = pick([20, 25, 40], random);
  const e = pick([2000, 3000, 4000], random);
  // q/m ratios that differ by at least 30% so the ranking is not a matter of eyesight
  const bases = [0.5, 1, 2, 3, 4, 6];
  let ratios: number[];
  do {
    ratios = [pick(bases, random), pick(bases, random), pick(bases, random)];
  } while (new Set(ratios).size < 3 || [...ratios].sort((x, y) => x - y).some((v, i, a) => i > 0 && v / a[i - 1] < 1.3));
  const tracks = ratios.map((r, i) => {
    const q = (random() < 0.5 ? -1 : 1) * pick([1, 2], random);
    return { id: i + 1, q, m: Math.abs(q) / r };
  });
  const highest = tracks.reduce((best, t) => (Math.abs(t.q) / t.m > Math.abs(best.q) / best.m ? t : best)).id;
  return {
    kind: 'tracks',
    story: 'Three particles are fired at the same speed into a region with a uniform electric field, and each leaves a curved track. Watch all three, then tag each track as positive or negative and say which particle has the highest charge-to-mass ratio.',
    e,
    dir,
    v0,
    L: 2,
    tracks,
    highest,
    freeTests: 0,
  };
}

// ---- judging ---------------------------------------------------------------------------------------

export interface PointResult {
  ok: boolean;
  fieldOk: boolean;
  directionOk: boolean;
  field: number;
  verdict: 'on-target' | 'too-strong' | 'too-weak';
  /** The way the force on the negative test charge really points: towards the source or away. */
  truth: 'toward' | 'away';
}
export function judgePoint(lvl: LevelPoint, r: number, guess: 'toward' | 'away'): PointResult {
  const field = Math.abs(pointField(lvl.Q, r));
  const off = (field - lvl.target) / lvl.target;
  const fieldOk = Math.abs(off) <= lvl.tol;
  // a negative test charge is pulled towards a positive source and pushed from a negative one
  const truth = lvl.Q > 0 ? 'toward' : 'away';
  const directionOk = guess === truth;
  return { ok: fieldOk && directionOk, fieldOk, directionOk, field, verdict: fieldOk ? 'on-target' : off > 0 ? 'too-strong' : 'too-weak', truth };
}

export interface PairResult {
  ok: boolean;
  force: number;
  e: Pt;
}
export function judgePair(lvl: LevelPair, q0: number): PairResult {
  const e = fieldAt(lvl.probe, lvl.sources);
  const force = forceOnCharge(q0, e.x);
  const ok = Math.sign(force) === Math.sign(lvl.targetF) && Math.abs(force - lvl.targetF) / Math.abs(lvl.targetF) <= lvl.tol;
  return { ok, force, e };
}

export interface JetResult {
  ok: boolean;
  /** Where the drop lands, mm above (+) or below (−) the beam line. */
  landing: number;
  side: 'right-spot' | 'too-high' | 'too-low' | 'wrong-side';
}
export function judgeJet(lvl: LevelJet, e: number, dir: 1 | -1): JetResult {
  const y = deflection(lvl.drop, e, dir, lvl.v0, lvl.L / 100, lvl.D / 100) * 1000;
  const off = Math.abs(y - lvl.yTarget) / Math.abs(lvl.yTarget);
  const ok = off <= lvl.tol;
  const side = ok ? 'right-spot' : Math.sign(y) !== Math.sign(lvl.yTarget) ? 'wrong-side' : Math.abs(y) > Math.abs(lvl.yTarget) ? 'too-high' : 'too-low';
  return { ok, landing: y, side };
}
export const describeLanding = (yMm: number) => `${fmt(Math.abs(yMm))} mm ${yMm >= 0 ? 'above' : 'below'} the beam line`;

export interface TracksResult {
  ok: boolean;
  signsOk: boolean[];
  highestOk: boolean;
}
export function judgeTracks(lvl: LevelTracks, signs: (1 | -1 | null)[], highest: number | null): TracksResult {
  const signsOk = lvl.tracks.map((t, i) => signs[i] === (t.q > 0 ? 1 : -1));
  const highestOk = highest === lvl.highest;
  return { ok: signsOk.every(Boolean) && highestOk, signsOk, highestOk };
}
/** Sideways displacement of track i at the exit of the field region (mm). */
export const trackExit = (lvl: LevelTracks, i: number) => deflection({ q: lvl.tracks[i].q, m: lvl.tracks[i].m }, lvl.e, lvl.dir, lvl.v0, lvl.L / 100) * 1000;

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win -----------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'point') {
    return [
      `The field of a point charge is E = k Q / r². Solve for r: r = √(k Q / E).`,
      `With Q = ${Math.abs(lvl.Q)} nC and E = ${fmt(lvl.target)} N/C: r = √(9 × 10⁹ × ${Math.abs(lvl.Q)} × 10⁻⁹ / ${fmt(lvl.target)}) = ${lvl.rAnswer / 100} m = ${lvl.rAnswer} cm.`,
      `The field points away from a positive charge and towards a negative one. A negative test charge feels a force opposite to the field, so here it is ${lvl.Q > 0 ? 'pulled towards the source' : 'pushed away from the source'}. The force on a charge q is F = qE.`,
    ];
  }
  if (lvl.kind === 'pair') {
    const e = fieldAt(lvl.probe, lvl.sources);
    return [
      'The field at P is the vector sum of the fields of the two charges, each taken as if the other were absent (superposition).',
      `Each field points away from a positive charge and towards a negative one. Here the two fields along the line add up to E = ${fmt(Math.abs(e.x))} N/C ${e.x > 0 ? 'to the right' : 'to the left'}.`,
      `The force on a test charge q is F = qE, so q = F / E = ${fmt(lvl.targetF)} N / ${fmt(e.x)} N/C = ${fmt(lvl.qAnswer)} nC. A positive charge feels a force along the field, a negative one against it.`,
    ];
  }
  if (lvl.kind === 'jet') {
    const dirWord = lvl.dirAnswer > 0 ? 'upwards' : 'downwards';
    const lines = [
      'Between the plates the drop feels F = qE, so its acceleration is a = qE/m. It crosses the plates in t = L/v₀, and starts with no sideways speed.',
      `Sideways shift inside the plates: y = ½ a t² = ½ (qE/m)(L/v₀)².`,
    ];
    if (lvl.D > 0) lines.push('After the plates the drop moves in a straight line with sideways speed a t, so over the gap D it shifts a further a t D/v₀. Total: y = (qE/m)(L/v₀²)(L/2 + D).');
    lines.push(`Solving for E gives ${fmt(lvl.eAnswer)} N/C, directed ${dirWord} (${lvl.drop.q > 0 ? 'a positive drop moves along the field' : 'a negative drop moves against the field'}).`);
    return lines;
  }
  const hi = lvl.tracks.find((t) => t.id === lvl.highest)!;
  return [
    'A particle in a uniform field accelerates with a = qE/m, so for the same entry speed the sideways shift is y = ½ (q/m) E (L/v₀)².',
    'A positive particle bends along the field and a negative one bends against it. The bigger the bend, the larger the charge-to-mass ratio |q|/m.',
    `Track ${hi.id} bends most, so it has the highest |q|/m.`,
  ];
}
