// Pure rules of the Coil Torque Bench: no DOM, no canvas.
// Fields in T, currents in A, areas in m², moments in A m², torques in N m, energies in J.
import { pick } from '@core/quiz';

export const MU0 = 4 * Math.PI * 1e-7;

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e5 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => Math.abs(value - answer) / Math.abs(answer) <= tol;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Torque on a coil of N turns: τ = N I A B sin θ, θ the angle between the normal to the coil and the field. */
export const coilTorque = (n: number, i: number, aM2: number, b: number, thetaDeg: number) => n * i * aM2 * b * Math.sin(rad(thetaDeg));
export const squareArea = (sideCm: number) => (sideCm / 100) ** 2;
export const circleArea = (rCm: number) => Math.PI * (rCm / 100) ** 2;
/** Magnetic moment m = N I A. */
export const moment = (n: number, i: number, aM2: number) => n * i * aM2;
/** Angular speed on swinging from 90° into alignment with the field, with moment of inertia J: ½Jω² = mB. */
export const omega90 = (m: number, b: number, inertia: number) => Math.sqrt((2 * m * b) / inertia);
/** Work needed to turn a dipole from its stable orientation (θ = 0) to the angle θ: mB(1 − cos θ). */
export const dipoleWork = (m: number, b: number, thetaDeg: number) => m * b * (1 - Math.cos(rad(thetaDeg)));
export type Equilibrium = 'stable' | 'unstable' | 'none';
export const equilibrium = (thetaDeg: number): Equilibrium => (thetaDeg === 0 ? 'stable' : thetaDeg === 180 ? 'unstable' : 'none');
/** Far field of a dipole of moment m at distance x (m): on the axis μ₀m/2πx³ and on the equator half of that, both in µT. */
export const axialUT = (m: number, x: number) => ((MU0 * m) / (2 * Math.PI * x ** 3)) * 1e6;
export const equatorialUT = (m: number, x: number) => axialUT(m, x) / 2;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelSquare {
  kind: 'square';
  story: string;
  n: number;
  sideCm: number;
  i: number;
  b: number;
  theta: number;
  torque: number;
  freeTests: number;
}
export type Shape = 'same' | 'changes';
export interface LevelCircular {
  kind: 'circular';
  story: string;
  n: number;
  rCm: number;
  i: number;
  b: number;
  theta: number;
  m: number;
  torque: number;
  freeTests: number;
}
export interface LevelSwing {
  kind: 'swing';
  story: string;
  n: number;
  rCm: number;
  i: number;
  b: number;
  inertia: number;
  m: number;
  torque: number;
  omega: number;
  freeTests: number;
}
export interface LevelEnergy {
  kind: 'energy';
  story: string;
  m: number;
  b: number;
  theta: number;
  work: number;
  eq: Equilibrium;
  freeTests: number;
}
export interface LevelFar {
  kind: 'far';
  story: string;
  n: number;
  i: number;
  rCm: number;
  xM: number;
  m: number;
  axial: number;
  equatorial: number;
  freeTests: number;
}
export type Level = LevelSquare | LevelCircular | LevelSwing | LevelEnergy | LevelFar;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const n = pick([10, 20, 50], random);
    const sideCm = pick([8, 10, 12], random);
    const i = pick([5, 10, 12], random);
    const b = pick([0.5, 0.8, 1.2], random);
    const theta = pick([30, 45, 60], random);
    return {
      kind: 'square',
      story: 'A square coil carrying a current hangs in a uniform magnetic field. The normal to the plane of the coil makes an angle with the field. Find the torque the field exerts on the coil.',
      n,
      sideCm,
      i,
      b,
      theta,
      torque: coilTorque(n, i, squareArea(sideCm), b, theta),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const n = pick([30, 50, 100], random);
    const rCm = pick([8, 10], random);
    const i = pick([3, 6], random);
    const b = pick([0.5, 1, 2], random);
    const theta = pick([30, 60], random);
    const area = circleArea(rCm);
    return {
      kind: 'circular',
      story: 'A circular coil is suspended in a uniform horizontal field, with the field lines at an angle to the normal of the coil. Find the magnetic moment of the coil and the counter torque that must be applied to stop it turning. Then say what changes if the circular coil is replaced by a planar coil of irregular shape that encloses the same area.',
      n,
      rCm,
      i,
      b,
      theta,
      m: moment(n, i, area),
      torque: coilTorque(n, i, area, b, theta),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const n = pick([50, 100], random);
    const i = pick([2, 3.2, 4], random);
    const rCm = 10;
    const b = pick([1, 2], random);
    const inertia = pick([0.05, 0.1, 0.2], random);
    const m = moment(n, i, circleArea(rCm));
    return {
      kind: 'swing',
      story: 'A coil can turn about an axis along a diameter in a uniform field. It is released from rest with its magnetic moment at right angles to the field, and swings round until its moment points along the field. Find the torque on it at the moment of release, and the angular speed it has when it reaches alignment.',
      n,
      rCm,
      i,
      b,
      inertia,
      m,
      torque: m * b,
      omega: omega90(m, b, inertia),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const m = pick([5, 10], random);
    const b = pick([0.5, 1, 2], random);
    const theta = pick([0, 60, 90, 120, 180], random);
    return {
      kind: 'energy',
      story: 'A current loop with a magnetic moment lies in a uniform field with its moment at an angle to the field. Find the work needed to turn it from its stable equilibrium orientation to this one, and say whether this orientation is a stable equilibrium, an unstable equilibrium, or not an equilibrium at all.',
      m,
      b,
      theta,
      work: dipoleWork(m, b, theta),
      eq: equilibrium(theta),
      freeTests: 1,
    };
  }
  const n = pick([50, 100, 200], random);
  const i = pick([2, 3.2, 5], random);
  const rCm = pick([5, 10], random);
  const xM = pick([1, 1.5, 2], random);
  const m = moment(n, i, circleArea(rCm));
  return {
    kind: 'far',
    story: 'Far from a small current loop the field looks like that of a bar magnet, with the magnetic moment of the loop standing for the magnet. Find the field far away on the axis of the loop, and at the same distance on the line through its centre in the plane of the loop.',
    n,
    i,
    rCm,
    xM,
    m,
    axial: axialUT(m, xM),
    equatorial: equatorialUT(m, xM),
    freeTests: 1,
  };
}

export function judgeSquare(lvl: LevelSquare, t: number): { ok: boolean } {
  return { ok: within(t, lvl.torque, 0.03) };
}
export function judgeCircular(lvl: LevelCircular, m: number, t: number, shape: Shape): { ok: boolean; mOk: boolean; tOk: boolean; shapeOk: boolean } {
  const mOk = within(m, lvl.m, 0.03);
  const tOk = within(t, lvl.torque, 0.03);
  const shapeOk = shape === 'same';
  return { ok: mOk && tOk && shapeOk, mOk, tOk, shapeOk };
}
export function judgeSwing(lvl: LevelSwing, t: number, w: number): { ok: boolean; tOk: boolean; wOk: boolean } {
  const tOk = within(t, lvl.torque, 0.03);
  const wOk = within(w, lvl.omega, 0.03);
  return { ok: tOk && wOk, tOk, wOk };
}
export function judgeEnergy(lvl: LevelEnergy, work: number, eq: Equilibrium): { ok: boolean; wOk: boolean; eqOk: boolean } {
  const wOk = lvl.work === 0 ? Math.abs(work) < 1e-9 : within(work, lvl.work, 0.03);
  const eqOk = eq === lvl.eq;
  return { ok: wOk && eqOk, wOk, eqOk };
}
export function judgeFar(lvl: LevelFar, axial: number, equatorial: number): { ok: boolean; aOk: boolean; eOk: boolean } {
  const aOk = within(axial, lvl.axial, 0.03);
  const eOk = within(equatorial, lvl.equatorial, 0.03);
  return { ok: aOk && eOk, aOk, eOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'square') {
    return [
      `The area is A = (${lvl.sideCm / 100} m)² = ${fmt(squareArea(lvl.sideCm))} m². The torque is τ = N I A B sin θ = ${lvl.n} × ${lvl.i} × ${fmt(squareArea(lvl.sideCm))} × ${lvl.b} × sin ${lvl.theta}° = ${fmt(lvl.torque)} N m.`,
      'θ is the angle between the normal to the coil and the field. The torque is greatest when the plane of the coil is parallel to the field (θ = 90°) and zero when the normal is along the field.',
    ];
  }
  if (lvl.kind === 'circular') {
    return [
      `The magnetic moment is m = N I A = ${lvl.n} × ${lvl.i} × π × ${lvl.rCm / 100}² = ${fmt(lvl.m)} A m².`,
      `The torque is τ = m B sin θ = ${fmt(lvl.m)} × ${lvl.b} × sin ${lvl.theta}° = ${fmt(lvl.torque)} N m, so this counter torque keeps the coil from turning.`,
      'The shape does not matter: τ depends only on N, I, A and B. An irregular planar coil with the same area gives the same torque.',
    ];
  }
  if (lvl.kind === 'swing') {
    return [
      `m = N I A = ${lvl.n} × ${lvl.i} × π × ${lvl.rCm / 100}² = ${fmt(lvl.m)} A m². At release θ = 90°, so τ = mB sin 90° = mB = ${fmt(lvl.torque)} N m. At alignment θ = 0 and the torque is zero.`,
      `As θ goes from 90° down to 0 the torque does work mB sin θ dθ summed, which is mB. So ½Jω² = mB, giving ω = √(2mB/J) = ${fmt(lvl.omega)} rad/s.`,
    ];
  }
  if (lvl.kind === 'energy') {
    return [
      `The potential energy is U = −mB cos θ. Turning from θ = 0 to ${lvl.theta}° needs work mB(1 − cos θ) = ${lvl.m} × ${lvl.b} × (1 − cos ${lvl.theta}°) = ${fmt(lvl.work)} J.`,
      lvl.eq === 'stable' ? 'At θ = 0 the moment points along the field: the energy is a minimum, so this is stable equilibrium and the torque is zero.' : lvl.eq === 'unstable' ? 'At θ = 180° the torque is zero, but a small turn makes the torque push the loop further away: unstable equilibrium, with the energy at its maximum.' : 'At this angle there is a torque mB sin θ, so the loop is not in equilibrium: it swings towards θ = 0.',
    ];
  }
  return [
    `The magnetic moment is m = N I A = ${lvl.n} × ${lvl.i} × π × ${lvl.rCm / 100}² = ${fmt(lvl.m)} A m².`,
    `On the axis B = μ₀m/2πx³ = ${fmt(lvl.axial)} µT at ${lvl.xM} m, and on the equatorial line B = μ₀m/4πx³ = ${fmt(lvl.equatorial)} µT, half as much, just as for a bar magnet.`,
  ];
}
