// Pure rules of the Dipole Bench: no DOM, no canvas.
// Magnetic moments in J/T (A m²), fields in T, torques in N m, energies and work in J.
import { pick, shuffle } from '@core/quiz';

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

export const torque = (m: number, b: number, thetaDeg: number) => m * b * Math.sin(rad(thetaDeg));
/** Potential energy U = −mB cos θ. */
export const energy = (m: number, b: number, thetaDeg: number) => -m * b * Math.cos(rad(thetaDeg));
/** Work by an external torque to turn the magnet from θ₁ to θ₂: the change in U. */
export const workToTurn = (m: number, b: number, fromDeg: number, toDeg: number) => energy(m, b, toDeg) - energy(m, b, fromDeg);

// ---- the six configurations of two small magnets (level 5) ----------------------------------------------------------------

export type Where = 'axis' | 'equator';
export type Orient = 'parallel' | 'antiparallel' | 'perpendicular';
export interface Config {
  letter: string;
  where: Where;
  orient: Orient;
}
/** The potential energy of Q in the field of P, in units of μ₀m²/4πr³, and whether Q is in equilibrium. */
export function configEnergy(c: Config): number {
  if (c.orient === 'perpendicular') return 0;
  const sign = c.orient === 'parallel' ? 1 : -1;
  // on the axis B_P is parallel to m_P with magnitude 2k; on the equator it is antiparallel with magnitude k
  return c.where === 'axis' ? -2 * sign : sign;
}
export const inEquilibrium = (c: Config) => c.orient !== 'perpendicular';

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelTorque {
  kind: 'torque';
  story: string;
  mode: 'moment' | 'torque';
  m: number;
  b: number;
  theta: number;
  /** The torque shown to the player (rounded), and the answers. */
  tauShown: number;
  answer: number;
  freeTests: number;
}
export interface LevelEnergy {
  kind: 'energy';
  story: string;
  m: number;
  b: number;
  stable: number;
  unstable: number;
  freeTests: number;
}
export interface LevelWork {
  kind: 'work';
  story: string;
  m: number;
  b: number;
  w90: number;
  w180: number;
  tau180: number;
  freeTests: number;
}
export interface LevelSolenoid {
  kind: 'solenoid';
  story: string;
  n: number;
  aCm2: number;
  i: number;
  b: number;
  theta: number;
  m: number;
  torque: number;
  freeTests: number;
}
export interface LevelConfigs {
  kind: 'configs';
  story: string;
  configs: Config[];
  lowest: string;
  highest: string;
  freeTests: number;
}
export type Level = LevelTorque | LevelEnergy | LevelWork | LevelSolenoid | LevelConfigs;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const mode = random() < 0.5 ? 'moment' : 'torque';
    const m = pick([0.2, 0.32, 0.36, 0.5, 0.6, 1.5], random);
    const b = pick([0.15, 0.25, 0.5], random);
    const theta = pick([30, 45, 60], random);
    const tau = torque(m, b, theta);
    const tauShown = Number(tau.toPrecision(3));
    return {
      kind: 'torque',
      story: mode === 'moment' ? 'A short bar magnet is held with its axis at an angle to a uniform magnetic field, and the field exerts a measured torque on it. Find the magnetic moment of the magnet.' : 'A short bar magnet of known magnetic moment is held with its axis at an angle to a uniform magnetic field. Find the torque the field exerts on it.',
      mode,
      m,
      b,
      theta,
      tauShown,
      answer: mode === 'moment' ? tauShown / (b * Math.sin(rad(theta))) : tau,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const m = pick([0.32, 0.5, 1.5], random);
    const b = pick([0.15, 0.22, 0.5], random);
    return {
      kind: 'energy',
      story: 'A short bar magnet is free to rotate in the plane of a uniform magnetic field. There are two orientations in which the torque on it is zero. Find the potential energy of the magnet in the stable one and in the unstable one. Energies can be negative: type the sign.',
      m,
      b,
      stable: energy(m, b, 0),
      unstable: energy(m, b, 180),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const m = pick([0.5, 1, 1.5], random);
    const b = pick([0.22, 0.3, 0.5], random);
    return {
      kind: 'work',
      story: 'A bar magnet lies aligned with a uniform field. An external torque turns it. Find the work the external torque must do to turn it until it is at right angles to the field, and until it is opposite to the field. Then find the torque on the magnet when it points opposite to the field.',
      m,
      b,
      w90: workToTurn(m, b, 0, 90),
      w180: workToTurn(m, b, 0, 180),
      tau180: 0,
      freeTests: 1,
    };
  }
  if (level === 4) {
    const n = pick([800, 2000], random);
    const aCm2 = pick([1.6, 2.5], random);
    const i = pick([3, 4], random);
    const b = pick([0.075, 0.25], random);
    const theta = pick([30, 60], random);
    const m = n * i * aCm2 * 1e-4;
    return {
      kind: 'solenoid',
      story: 'A closely wound solenoid hangs so that it can turn in a horizontal plane, in a uniform horizontal magnetic field that makes an angle with its axis. Find its magnetic moment, the torque on it, and the net force on it. The field is uniform, which matters for the force.',
      n,
      aCm2,
      i,
      b,
      theta,
      m,
      torque: torque(m, b, theta),
      freeTests: 1,
    };
  }
  const all: Omit<Config, 'letter'>[] = [
    { where: 'axis', orient: 'parallel' },
    { where: 'axis', orient: 'antiparallel' },
    { where: 'equator', orient: 'antiparallel' },
    { where: 'equator', orient: 'parallel' },
    { where: 'axis', orient: 'perpendicular' },
    { where: 'equator', orient: 'perpendicular' },
  ];
  const order = shuffle(all, random);
  const configs = order.map((c, i) => ({ ...c, letter: 'ABCDEF'[i] }));
  const sorted = [...configs].sort((a, b) => configEnergy(a) - configEnergy(b));
  return {
    kind: 'configs',
    story: 'A small magnet P sits at the centre with its moment pointing right. A second identical small magnet Q is placed near it, in one of six ways: on the line through P along its axis, or on the perpendicular line through its centre, with its moment parallel, antiparallel or at right angles to that of P. Find the arrangement with the lowest potential energy, the one with the highest, and one that is not in equilibrium.',
    configs,
    lowest: sorted[0].letter,
    highest: sorted[sorted.length - 1].letter,
    freeTests: 1,
  };
}

export function judgeTorque(lvl: LevelTorque, answer: number): { ok: boolean } {
  return { ok: within(answer, lvl.answer, 0.03) };
}
export function judgeEnergy(lvl: LevelEnergy, stable: number, unstable: number): { ok: boolean; sOk: boolean; uOk: boolean } {
  const sOk = within(stable, lvl.stable, 0.03);
  const uOk = within(unstable, lvl.unstable, 0.03);
  return { ok: sOk && uOk, sOk, uOk };
}
export function judgeWork(lvl: LevelWork, w90: number, w180: number, tau180: number): { ok: boolean; aOk: boolean; bOk: boolean; tOk: boolean } {
  const aOk = within(w90, lvl.w90, 0.03);
  const bOk = within(w180, lvl.w180, 0.03);
  const tOk = Math.abs(tau180) < 1e-9;
  return { ok: aOk && bOk && tOk, aOk, bOk, tOk };
}
export function judgeSolenoid(lvl: LevelSolenoid, m: number, tau: number, force: number): { ok: boolean; mOk: boolean; tOk: boolean; fOk: boolean } {
  const mOk = within(m, lvl.m, 0.03);
  const tOk = within(tau, lvl.torque, 0.03);
  const fOk = Math.abs(force) < 1e-9;
  return { ok: mOk && tOk && fOk, mOk, tOk, fOk };
}
export function judgeConfigs(lvl: LevelConfigs, lowest: string, highest: string, noEq: string): { ok: boolean; lOk: boolean; hOk: boolean; eOk: boolean } {
  const lOk = lowest === lvl.lowest;
  const hOk = highest === lvl.highest;
  const picked = lvl.configs.find((c) => c.letter === noEq);
  const eOk = !!picked && !inEquilibrium(picked);
  return { ok: lOk && hOk && eOk, lOk, hOk, eOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'torque') {
    return lvl.mode === 'moment'
      ? [`τ = mB sin θ, so m = τ/(B sin θ) = ${lvl.tauShown} / (${lvl.b} × sin ${lvl.theta}°) = ${fmt(lvl.answer)} J/T.`, 'The torque is the vector product m × B, so it is largest when the magnet is at right angles to the field and zero when it is along it.']
      : [`τ = mB sin θ = ${lvl.m} × ${lvl.b} × sin ${lvl.theta}° = ${fmt(lvl.answer)} N m.`, 'The torque is the vector product m × B: it turns the magnet towards the field.'];
  }
  if (lvl.kind === 'energy') {
    return [
      `The torque mB sin θ is zero at θ = 0 and θ = 180°. The potential energy is U = −mB cos θ.`,
      `Stable (θ = 0, along the field): U = −mB = −${lvl.m} × ${lvl.b} = ${fmt(lvl.stable)} J, the lowest value. Unstable (θ = 180°, opposite to the field): U = +mB = ${fmt(lvl.unstable)} J, the highest value.`,
    ];
  }
  if (lvl.kind === 'work') {
    return [
      `The work needed equals the rise in potential energy. Aligned, U = −mB. At 90° U = 0, so W = mB = ${lvl.m} × ${lvl.b} = ${fmt(lvl.w90)} J.`,
      `At 180° U = +mB, so W = 2mB = ${fmt(lvl.w180)} J. The torque mB sin θ is zero at 180° (and at 0°): the magnet is in unstable equilibrium there, with no torque even though it takes work to get it there.`,
    ];
  }
  if (lvl.kind === 'solenoid') {
    return [
      `The magnetic moment is m = N I A = ${lvl.n} × ${lvl.i} × ${lvl.aCm2 * 1e-4} = ${fmt(lvl.m)} J/T.`,
      `The torque is τ = mB sin θ = ${fmt(lvl.m)} × ${lvl.b} × sin ${lvl.theta}° = ${fmt(lvl.torque)} N m.`,
      'In a uniform field the forces on the two poles (or on opposite sides of the windings) are equal and opposite, so the net force is zero. A net force appears only in a non-uniform field, which is why an iron nail is attracted by a magnet.',
    ];
  }
  const lowest = lvl.configs.find((c) => c.letter === lvl.lowest)!;
  const highest = lvl.configs.find((c) => c.letter === lvl.highest)!;
  return [
    `The field of P is parallel to m_P on its axis (strength 2k) and antiparallel to m_P on the perpendicular line (strength k). Q has U = −m_Q·B_P, so it is in equilibrium when m_Q lies along or against the field there: that is zero torque.`,
    `Lowest energy: ${lowest.letter}, with Q on the axis parallel to P (U = −2k). Highest: ${highest.letter}, with Q on the axis antiparallel to P (U = +2k). A perpendicular Q feels a torque, so it is not in equilibrium (U = 0).`,
  ];
}
