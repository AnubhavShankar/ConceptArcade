// Pure rules of the Dipole Bench: no DOM, no canvas.
// Charges in nC, separations and distances in cm, dipole moments in C m, fields in N/C, torque in N m.
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
const rad = (d: number) => (d * Math.PI) / 180;
/** Angle in degrees brought into (−180, 180]. */
export const wrap = (deg: number) => {
  let d = ((deg % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
};

export interface Pt {
  x: number;
  y: number;
}

/** Dipole moment p = q × (2a), in C m, from q in nC and the separation 2a in cm. */
export const moment = (qNc: number, sepCm: number) => qNc * 1e-9 * (sepCm / 100);
/** Torque τ = p E sin θ (N m), θ the angle between p and E. */
export const torque = (p: number, e: number, thetaDeg: number) => p * e * Math.sin(rad(thetaDeg));
/** Far-field values (r ≫ a), r in cm: on the axis 2kp/r³ along p; on the equatorial plane kp/r³ opposite to p. */
export const axisField = (p: number, rCm: number) => (2 * K * p) / (rCm / 100) ** 3;
export const equatorField = (p: number, rCm: number) => (K * p) / (rCm / 100) ** 3;

/** Exact field (N/C) at a point (cm) from a dipole made of +q at +u·a and −q at −u·a, u at angle φ. */
export function dipoleField(qNc: number, sepCm: number, phiDeg: number, at: Pt): Pt {
  const a = sepCm / 2;
  const u = { x: Math.cos(rad(phiDeg)), y: Math.sin(rad(phiDeg)) };
  const one = (q: number, c: Pt): Pt => {
    const dx = at.x - c.x;
    const dy = at.y - c.y;
    const r2 = dx * dx + dy * dy;
    const r = Math.sqrt(r2);
    const e = (9e4 * q) / r2; // k q / r² with q in nC and r in cm
    return { x: (e * dx) / r, y: (e * dy) / r };
  };
  const p = one(qNc, { x: u.x * a, y: u.y * a });
  const m = one(-qNc, { x: -u.x * a, y: -u.y * a });
  return { x: p.x + m.x, y: p.y + m.y };
}
export const magnitude = (v: Pt) => Math.hypot(v.x, v.y);

// ---- rotation of a dipole in a field ----------------------------------------------------------------------------

/** One step of the dipole's turning: θ is the angle from the field (deg). Restoring torque ∝ −sin θ, plus friction. */
export function stepTorsion(s: { theta: number; omega: number }, dt: number, extraTorque = 0, k = 40, c = 3): { theta: number; omega: number } {
  // omega is in rad/s, theta in degrees
  const alpha = -k * Math.sin(rad(s.theta)) + extraTorque - c * s.omega;
  const omega = s.omega + alpha * dt;
  return { theta: s.theta + ((omega * dt) * 180) / Math.PI, omega };
}
/** Where the dipole ends up after a small nudge away from `theta0`, given the time to settle. */
export function settleAfterNudge(theta0: number, nudge = 4, seconds = 12): number {
  let s = { theta: theta0 + nudge, omega: 0 };
  for (let t = 0; t < seconds; t += 0.01) s = stepTorsion(s, 0.01);
  return wrap(s.theta);
}

// ---- levels ---------------------------------------------------------------------------------------------------------

export interface LevelMoment {
  kind: 'moment';
  story: string;
  /** The order: moment (C m) and the direction the dipole must point (−→+), degrees. */
  targetP: number;
  qAnswer: number;
  sepAnswer: number;
  targetAngle: number;
  freeTests: number;
}
export interface LevelTorque {
  kind: 'torque';
  story: string;
  q: number;
  sep: number;
  p: number;
  e: number;
  theta: number;
  answer: number;
  freeTests: number;
}
export interface LevelStable {
  kind: 'stable';
  story: string;
  /** The direction the field points (deg) and the moment of the dipole. */
  fieldAngle: number;
  freeTests: number;
}
export interface LevelAxis {
  kind: 'axis';
  story: string;
  q: number;
  sep: number;
  phi: number;
  r: number;
  where: 'axis' | 'equator';
  p: number;
  answer: number;
  /** The field points along p (+1) or against it (−1). */
  along: 1 | -1;
  freeTests: number;
}
export interface LevelFade {
  kind: 'fade';
  story: string;
  q: number;
  sep: number;
  r0: number;
  /** The fraction the field must fall to, and the distance multiple that does it. */
  fraction: number;
  kAnswer: number;
  freeTests: number;
}
export type Level = LevelMoment | LevelTorque | LevelStable | LevelAxis | LevelFade;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const q = pick([2, 3, 4, 5, 6], random);
    const sep = pick([4, 6, 8, 10, 12], random);
    return {
      kind: 'moment',
      story: 'An electric dipole is a pair of equal and opposite charges a small distance apart. Build one with the moment the order asks for, pointing the way the order shows. The moment points from the negative charge to the positive one. A dipole is neutral overall, so say what its total charge is.',
      targetP: moment(q, sep),
      qAnswer: q,
      sepAnswer: sep,
      targetAngle: pick([0, 45, 90, 135, 180, 225, 270, 315], random),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const q = pick([2, 4, 5, 10], random);
    const sep = pick([4, 5, 10], random);
    const p = moment(q, sep);
    const e = pick([2000, 4000, 5000, 10000], random);
    const theta = pick([30, 45, 60, 90, 120, 135, 150], random);
    return {
      kind: 'torque',
      story: 'A dipole sits in a uniform field, held at an angle by a brake. The field pulls the two charges in opposite directions, which turns the dipole. Choose the brake torque that holds it exactly still. Too little and it swings towards the field, too much and it is dragged away from it. First say what the net force on the dipole is.',
      q,
      sep,
      p,
      e,
      theta,
      answer: torque(p, e, theta),
      freeTests: 1,
    };
  }
  if (level === 3) {
    return {
      kind: 'stable',
      story: 'A dipole in a uniform field has two orientations where the torque is zero, but only one of them is stable. Choose the orientation, give the dipole a small nudge, and see whether it returns. Find the stable one.',
      fieldAngle: pick([0, 45, 90, 135, 180, 225, 270, 315], random),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const q = pick([2, 4, 5], random);
    const sep = pick([2, 4], random);
    const r = pick([20, 30, 40], random);
    const where: 'axis' | 'equator' = random() < 0.5 ? 'axis' : 'equator';
    const p = moment(q, sep);
    return {
      kind: 'axis',
      story: 'A small dipole creates a field around it, far away compared with its own size. A probe sits at the marked point. Find the strength of the field there, and say whether it points along the dipole’s moment or against it. The two special places are the axis (the line through both charges) and the equatorial plane (the line halfway between them, at right angles).',
      q,
      sep,
      phi: pick([0, 90, 180, 270], random),
      r,
      where,
      p,
      answer: where === 'axis' ? axisField(p, r) : equatorField(p, r),
      along: where === 'axis' ? 1 : -1,
      freeTests: 1,
    };
  }
  const fraction = pick([1 / 4, 1 / 8, 1 / 16, 1 / 27], random);
  return {
    kind: 'fade',
    story: 'The field of a dipole dies away faster than the field of a single charge. A probe sits on the axis of this dipole. Choose how many times farther away it must be moved for the field to fall to the fraction in the order, then move it and see.',
    q: pick([2, 4, 5], random),
    sep: pick([2, 4], random),
    r0: pick([15, 20, 25], random),
    fraction,
    kAnswer: Math.pow(1 / fraction, 1 / 3),
    freeTests: 1,
  };
}

// ---- judging ---------------------------------------------------------------------------------------------------------

export type TotalGuess = 'zero' | 'q' | '2q';
export function judgeMoment(lvl: LevelMoment, q: number, sep: number, angleDeg: number, total: TotalGuess): { ok: boolean; pOk: boolean; angleOk: boolean; totalOk: boolean; p: number } {
  const p = moment(q, sep);
  const pOk = Math.abs(p - lvl.targetP) / lvl.targetP <= 0.03;
  const angleOk = Math.abs(wrap(angleDeg - lvl.targetAngle)) <= 8;
  const totalOk = total === 'zero';
  return { ok: pOk && angleOk, pOk, angleOk, totalOk, p };
}
export type ForceGuess = 'zero' | 'not-zero';
export function judgeTorque(lvl: LevelTorque, brake: number): { ok: boolean; verdict: 'holds' | 'swings-in' | 'dragged-out' } {
  const off = (brake - lvl.answer) / lvl.answer;
  const ok = Math.abs(off) <= 0.04;
  return { ok, verdict: ok ? 'holds' : off < 0 ? 'swings-in' : 'dragged-out' };
}
export function judgeStable(lvl: LevelStable, dipoleAngle: number): { ok: boolean; rel: number; end: number; kind: 'stable' | 'unstable' | 'other' } {
  const rel = wrap(dipoleAngle - lvl.fieldAngle);
  const end = settleAfterNudge(rel);
  const ok = Math.abs(rel) <= 4;
  const kind = ok ? 'stable' : Math.abs(Math.abs(rel) - 180) <= 4 ? 'unstable' : 'other';
  return { ok, rel, end, kind };
}
export function judgeAxis(lvl: LevelAxis, value: number, along: 1 | -1): { ok: boolean; valueOk: boolean; directionOk: boolean; verdict: 'on-target' | 'too-big' | 'too-small' } {
  const valueOk = Math.abs(value - lvl.answer) / lvl.answer <= 0.06;
  const directionOk = along === lvl.along;
  return { ok: valueOk && directionOk, valueOk, directionOk, verdict: valueOk ? 'on-target' : value > lvl.answer ? 'too-big' : 'too-small' };
}
/** The field ratio E(k r0) / E(r0) for a dipole (far field, 1/r³). */
export const dipoleRatio = (k: number) => 1 / (k * k * k);
export function judgeFade(lvl: LevelFade, k: number): { ok: boolean; ratio: number; verdict: 'on-target' | 'too-near' | 'too-far' } {
  const ratio = dipoleRatio(k);
  const ok = Math.abs(k - lvl.kAnswer) / lvl.kAnswer <= 0.03;
  return { ok, ratio, verdict: ok ? 'on-target' : k < lvl.kAnswer ? 'too-near' : 'too-far' };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win ------------------------------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'moment') {
    return [
      `The dipole moment is p = q × 2a. Here p = ${lvl.qAnswer} nC × ${lvl.sepAnswer} cm = ${lvl.qAnswer} × 10⁻⁹ C × ${lvl.sepAnswer / 100} m = ${fmt(lvl.targetP)} C m.`,
      'The moment is a vector pointing from the negative charge to the positive charge.',
      'The two charges are equal and opposite, so the total charge of a dipole is zero (+q + (−q) = 0). Its field is still not zero.',
    ];
  }
  if (lvl.kind === 'torque') {
    return [
      'The field pulls +q one way with force qE and −q the other way with force qE. The two forces are equal and opposite, so the net force is zero, but they act at different points and make a torque.',
      `The torque is τ = p E sin θ. Here p = ${fmt(lvl.p)} C m, E = ${fmt(lvl.e)} N/C, θ = ${lvl.theta}°, so τ = ${fmt(lvl.answer)} N m.`,
      'The torque turns the dipole towards the field (θ towards 0).',
    ];
  }
  if (lvl.kind === 'stable') {
    return [
      'The torque τ = p E sin θ is zero at θ = 0° and at θ = 180°.',
      'At θ = 0° (moment along the field) a small nudge produces a torque that turns the dipole back: stable equilibrium.',
      'At θ = 180° (moment against the field) a small nudge produces a torque that turns it further away until it flips round to 0°: unstable equilibrium.',
    ];
  }
  if (lvl.kind === 'axis') {
    const where = lvl.where === 'axis' ? 'On the axis the field is E = 2kp/r³, pointing along p.' : 'On the equatorial plane the field is E = kp/r³, pointing opposite to p.';
    return [
      where,
      `Here p = ${fmt(lvl.p)} C m and r = ${lvl.r / 100} m, so E = ${fmt(lvl.answer)} N/C ${lvl.along > 0 ? 'along' : 'against'} the moment.`,
      'These are the far-field formulas, valid when r is much larger than the half-length a of the dipole.',
    ];
  }
  const f = lvl.fraction;
  return [
    'The far field of a dipole falls as 1/r³, so doubling the distance divides the field by 8.',
    `To fall to ${fmt(f)} of its value the distance must grow by k = (1/${fmt(f)})^(1/3) = ${fmt(lvl.kAnswer)}.`,
    `A single charge falls as 1/r², so it would need k = (1/${fmt(f)})^(1/2) = ${fmt(Math.sqrt(1 / f))}. The dipole’s field fades faster because the two opposite fields nearly cancel far away.`,
  ];
}
