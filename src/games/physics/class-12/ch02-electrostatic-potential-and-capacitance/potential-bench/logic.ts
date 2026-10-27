// Pure rules of the Potential Bench: no DOM, no canvas.
// Charges in nC, distances in cm, potentials in volts, work in mJ.  V = k q / r = 900 q / r in these units.
import { pick } from '@core/quiz';

export const K = 9e9;
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => (answer === 0 ? Math.abs(value) <= 1e-6 : Math.abs(value - answer) / Math.abs(answer) <= tol);

export interface Pt {
  x: number;
  y: number;
}
export interface Src {
  q: number; // nC, signed
  at: Pt; // cm
}
/** Potential (V) of a point charge q nC at r cm: V = kq/r. A scalar, with the sign of q. */
export const potential = (qNc: number, rCm: number) => (900 * qNc) / rCm;
/** Potential at a point from several charges: the plain sum of the individual potentials. */
export function potentialAt(p: Pt, srcs: Src[]): number {
  let v = 0;
  for (const s of srcs) {
    const r = Math.hypot(p.x - s.at.x, p.y - s.at.y);
    if (r > 1e-9) v += potential(s.q, r);
  }
  return v;
}
/** Field vector (N/C) at a point: the vector sum, for contrast with the scalar sum of potentials. */
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
/** Work (mJ) to bring a test charge q µC from infinity to a point of potential V volts: W = qV. */
export const workMilli = (qMicro: number, v: number) => qMicro * v * 1e-3;

// ---- levels -----------------------------------------------------------------------------------------------------------

export interface LevelPoint {
  kind: 'point';
  story: string;
  Q: number;
  rAnswer: number;
  target: number; // V, signed
  testQ: number; // µC
  work: number; // mJ
  freeTests: number;
}
export type Zero = 'zero' | 'not-zero';
export interface LevelPolygon {
  kind: 'polygon';
  story: string;
  n: number;
  R: number; // cm
  q: number; // nC each
  answer: number; // V
  freeTests: number;
}
export interface LevelZero {
  kind: 'zero';
  story: string;
  big: number; // nC, signed (the larger magnitude)
  small: number; // nC, the opposite sign
  d: number; // cm
  between: number; // cm from the larger charge
  outside: number; // cm from the larger charge, beyond the smaller one
  freeTests: number;
}
export interface LevelDipole {
  kind: 'dipole';
  story: string;
  q: number;
  sep: number;
  r: number;
  theta: number;
  answer: number;
  freeTests: number;
}
export type Level = LevelPoint | LevelPolygon | LevelZero | LevelDipole;

/** Far-field potential of a dipole: V = k p cos θ / r². */
export function dipolePotential(qNc: number, sepCm: number, rCm: number, thetaDeg: number): number {
  const p = qNc * 1e-9 * (sepCm / 100);
  const v = (K * p * Math.cos((thetaDeg * Math.PI) / 180)) / (rCm / 100) ** 2;
  return Math.abs(v) < 1e-9 ? 0 : v;
}
/** Exact potential of the same dipole (two point charges): the far-field formula should agree for r ≫ a. */
export function dipoleExact(qNc: number, sepCm: number, rCm: number, thetaDeg: number): number {
  const a = sepCm / 2;
  const t = (thetaDeg * Math.PI) / 180;
  const p: Pt = { x: rCm * Math.cos(t), y: rCm * Math.sin(t) };
  return potentialAt(p, [{ q: qNc, at: { x: a, y: 0 } }, { q: -qNc, at: { x: -a, y: 0 } }]);
}
export const polygonPotential = (n: number, qNc: number, rCm: number) => n * potential(qNc, rCm);

export function buildLevel(level: number, random: () => number): Level {
  const sign = () => (random() < 0.5 ? -1 : 1);
  if (level === 1) {
    const Q = sign() * pick([2, 3, 4, 5, 6, 8], random);
    const rAnswer = pick([3, 4, 5, 6, 8, 10, 12, 15, 20], random);
    const testQ = pick([1, 2, 5], random);
    const target = potential(Q, rAnswer);
    return {
      kind: 'point',
      story: 'The potential of a point charge falls with distance and carries the sign of the charge. Move the probe until the meter reads the target potential. Then work out how much work it takes to bring a small test charge there from far away.',
      Q,
      rAnswer,
      target,
      testQ,
      work: workMilli(testQ, target),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const n = pick([3, 4, 5, 6], random);
    const R = pick([5, 8, 10, 12], random);
    const q = sign() * pick([2, 3, 5], random);
    return {
      kind: 'polygon',
      story: `${n} equal charges sit at the corners of a regular polygon, each the same distance from the centre. Find the potential at the centre. Then decide whether the electric field at the centre is zero. The two answers are not the same, and the reason is the heart of this level.`,
      n,
      R,
      q,
      answer: polygonPotential(n, q, R),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const [qa, qb] = pick([[5, 3], [4, 2], [6, 2], [3, 1], [5, 2], [6, 4]], random);
    const d = pick([12, 16, 20, 24], random);
    const s = sign();
    return {
      kind: 'zero',
      story: 'Two charges of opposite sign sit on a line. The potential is zero at two points on that line, one between the charges and one outside them. Find both, measuring from the larger charge. Slide the probe along the line to watch the potential change sign.',
      big: s * qa,
      small: -s * qb,
      d,
      between: (d * qa) / (qa + qb),
      outside: (d * qa) / (qa - qb),
      freeTests: 1,
    };
  }
  const q = pick([2, 4, 5], random);
  const sep = pick([2, 4], random);
  const r = pick([20, 30, 40], random);
  const theta = pick([0, 60, 90, 120, 180], random);
  return {
    kind: 'dipole',
    story: 'A small dipole sets up a potential in the space around it. A probe sits at the marked distance and angle from the dipole’s axis. Find the potential there, with its sign. On one particular line the potential is zero everywhere.',
    q,
    sep,
    r,
    theta,
    answer: dipolePotential(q, sep, r, theta),
    freeTests: 1,
  };
}

// ---- judging -------------------------------------------------------------------------------------------------------------

export function judgePoint(lvl: LevelPoint, r: number, work: number): { ok: boolean; rOk: boolean; workOk: boolean; v: number } {
  const v = potential(lvl.Q, r);
  const rOk = Math.abs(v - lvl.target) <= 0.03 * Math.abs(lvl.target);
  const workOk = within(work, lvl.work, 0.03);
  return { ok: rOk && workOk, rOk, workOk, v };
}
export function judgePolygon(lvl: LevelPolygon, v: number, field: Zero): { ok: boolean; vOk: boolean; fieldOk: boolean } {
  const vOk = within(v, lvl.answer, 0.03);
  const fieldOk = field === 'zero';
  return { ok: vOk && fieldOk, vOk, fieldOk };
}
export function judgeZero(lvl: LevelZero, between: number, outside: number): { ok: boolean; betweenOk: boolean; outsideOk: boolean } {
  const betweenOk = within(between, lvl.between, 0.03);
  const outsideOk = within(outside, lvl.outside, 0.03);
  return { ok: betweenOk && outsideOk, betweenOk, outsideOk };
}
export function judgeDipole(lvl: LevelDipole, v: number): { ok: boolean; verdict: 'on-target' | 'too-big' | 'too-small' | 'wrong-sign' } {
  const ok = lvl.answer === 0 ? Math.abs(v) <= 0.5 : within(v, lvl.answer, 0.06) && Math.sign(v) === Math.sign(lvl.answer);
  const verdict = ok ? 'on-target' : lvl.answer !== 0 && Math.sign(v) !== Math.sign(lvl.answer) ? 'wrong-sign' : Math.abs(v) > Math.abs(lvl.answer) ? 'too-big' : 'too-small';
  return { ok, verdict };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win -------------------------------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'point') {
    return [
      `The potential of a point charge is V = kq/r = 9 × 10⁹ × ${lvl.Q} × 10⁻⁹ / (${lvl.rAnswer / 100} m) = ${fmt(lvl.target)} V. It is a scalar and has the sign of the charge.`,
      `The work to bring a test charge q₀ from infinity to a point of potential V is W = q₀V = ${lvl.testQ} µC × ${fmt(lvl.target)} V = ${fmt(lvl.work)} mJ${lvl.work < 0 ? ' (negative: the field does the work, since the charges attract)' : ''}.`,
      'The potential at infinity is taken as zero.',
    ];
  }
  if (lvl.kind === 'polygon') {
    return [
      `Potentials add as plain numbers (they are scalars). Each charge is ${lvl.R} cm from the centre, so V = ${lvl.n} × kq/R = ${lvl.n} × 9 × 10⁹ × ${lvl.q} × 10⁻⁹ / ${lvl.R / 100} = ${fmt(lvl.answer)} V.`,
      'The electric field is a vector. The fields of the equal charges point in different directions and cancel at the centre, so E = 0 there.',
      'So the potential at the centre need not be zero when the field is zero: potentials of like charges never cancel.',
    ];
  }
  if (lvl.kind === 'zero') {
    return [
      'The potential is zero where kq₁/r₁ + kq₂/r₂ = 0, so the distances from the two charges must be in the ratio of their magnitudes: r₁ : r₂ = |q₁| : |q₂|.',
      `Between the charges: r = d q₁ / (q₁ + q₂) = ${lvl.d} × ${Math.abs(lvl.big)} / (${Math.abs(lvl.big)} + ${Math.abs(lvl.small)}) = ${fmt(lvl.between)} cm from the larger charge.`,
      `Outside, on the side of the smaller charge: r = d q₁ / (q₁ − q₂) = ${fmt(lvl.outside)} cm from the larger charge. (The smaller charge has to be the nearer one, because its potential falls off more slowly than distance grows.)`,
    ];
  }
  return [
    'For a small dipole, V = k p cos θ / r², where θ is measured from the dipole axis and p = q × 2a.',
    lvl.theta === 90 ? 'On the equatorial plane θ = 90° and cos θ = 0, so the potential is zero everywhere on that plane.' : `Here p = ${lvl.q} nC × ${lvl.sep} cm = ${fmt(lvl.q * 1e-9 * (lvl.sep / 100))} C m and cos ${lvl.theta}° = ${fmt(Math.cos((lvl.theta * Math.PI) / 180))}, so V = ${fmt(lvl.answer)} V.`,
    'The potential of a dipole falls as 1/r², faster than the 1/r of a single charge.',
  ];
}
