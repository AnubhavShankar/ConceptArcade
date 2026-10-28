// Pure rules of the Force Lab: no DOM, no canvas.
// Fields in T (or G where named), speeds in 10⁶ m/s where named, lengths in cm or m as named.
import { pick } from '@core/quiz';

export const E_CHARGE = 1.6e-19;
export const M_ELECTRON = 9.1e-31;
export const G_ACCEL = 9.8;

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

export type Dir = 'up' | 'down' | 'left' | 'right';
const VEC: Record<Dir, [number, number]> = { right: [1, 0], left: [-1, 0], up: [0, 1], down: [0, -1] };
const NAME = (v: [number, number]): Dir => (v[0] === 1 ? 'right' : v[0] === -1 ? 'left' : v[1] === 1 ? 'up' : 'down');

/** Direction of the force F = q v × B for B out of the page (+z) or into it (−z), in the plane of the page. */
export function forceDirection(v: Dir, bOut: boolean, negative: boolean): Dir {
  const [vx, vy] = VEC[v];
  const sign = (bOut ? 1 : -1) * (negative ? -1 : 1);
  // v × z = (vy, −vx)
  return NAME([sign * vy || 0, sign * -vx || 0]);
}
/** F = qvB for a charge moving perpendicular to the field, in units of 10⁻¹³ N (v in 10⁶ m/s, B in T). */
export const lorentz13 = (v6: number, b: number) => (E_CHARGE * v6 * 1e6 * b) / 1e-13;
/** F = B I l sin θ in mN (l in cm). */
export const wireForceMilli = (b: number, i: number, lCm: number, thetaDeg: number) => b * i * (lCm / 100) * Math.sin((thetaDeg * Math.PI) / 180) * 1000;
/** The field that just holds a wire of mass m (g) and length l (m) carrying I up against gravity. */
export const levitationField = (mGram: number, lM: number, i: number) => (mGram / 1000 * G_ACCEL) / (i * lM);
/** Orbit radius in cm for an electron at speed v (10⁶ m/s), field B (G), at angle θ to the field (90° for a circle). */
export const orbitRadiusCm = (v6: number, bGauss: number, thetaDeg = 90) => ((M_ELECTRON * v6 * 1e6 * Math.sin((thetaDeg * Math.PI) / 180)) / (E_CHARGE * bGauss * 1e-4)) * 100;
/** Orbit frequency in MHz. It does not depend on the speed. */
export const orbitFreqMHz = (bGauss: number) => (E_CHARGE * bGauss * 1e-4) / (2 * Math.PI * M_ELECTRON) / 1e6;
/** Pitch of the helix in cm. */
export const helixPitchCm = (v6: number, bGauss: number, thetaDeg: number) => ((v6 * 1e6 * Math.cos((thetaDeg * Math.PI) / 180)) / (orbitFreqMHz(bGauss) * 1e6)) * 100;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelLorentz {
  kind: 'lorentz';
  story: string;
  v: Dir;
  bOut: boolean;
  negative: boolean;
  v6: number;
  b: number;
  dir: Dir;
  f13: number;
  freeTests: number;
}
export interface LevelWire {
  kind: 'wire';
  story: string;
  mode: 'force' | 'levitate';
  b: number;
  i: number;
  lCm: number;
  theta: number;
  mGram: number;
  answer: number;
  freeTests: number;
}
export interface LevelCircle {
  kind: 'circle';
  story: string;
  v6: number;
  bGauss: number;
  rCm: number;
  fMHz: number;
  freeTests: number;
}
export type FreqChange = 'increases' | 'unchanged' | 'decreases';
export interface LevelSpeed {
  kind: 'speed';
  story: string;
  v6: number;
  factor: number;
  bGauss: number;
  rCm: number;
  r2Cm: number;
  freeTests: number;
}
export interface LevelHelix {
  kind: 'helix';
  story: string;
  v6: number;
  bGauss: number;
  theta: number;
  rCm: number;
  pitchCm: number;
  freeTests: number;
}
export type Level = LevelLorentz | LevelWire | LevelCircle | LevelSpeed | LevelHelix;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const v = pick(['right', 'left', 'up', 'down'] as Dir[], random);
    const bOut = random() < 0.5;
    const negative = random() < 0.5;
    const v6 = pick([1, 2, 4, 5], random);
    const b = pick([0.2, 0.4, 0.5, 0.8], random);
    return {
      kind: 'lorentz',
      story: `A ${negative ? 'electron' : 'proton'} moves ${v === 'up' || v === 'down' ? 'vertically' : 'horizontally'} across a region where the magnetic field is perpendicular to the page. Find the direction of the magnetic force on it, and its size.`,
      v,
      bOut,
      negative,
      v6,
      b,
      dir: forceDirection(v, bOut, negative),
      f13: lorentz13(v6, b),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const mode = random() < 0.5 ? 'force' : 'levitate';
    if (mode === 'force') {
      const b = pick([0.15, 0.27, 0.4], random);
      const i = pick([5, 8, 10, 12], random);
      const lCm = pick([3, 5, 10], random);
      const theta = pick([30, 60, 90], random);
      return {
        kind: 'wire',
        story: 'A straight wire carrying a current lies in a uniform magnetic field, at an angle to the field lines. Find the magnetic force on it.',
        mode,
        b,
        i,
        lCm,
        theta,
        mGram: 0,
        answer: wireForceMilli(b, i, lCm, theta),
        freeTests: 1,
      };
    }
    const mGram = pick([100, 200, 300], random);
    const lCm = pick([100, 150, 200], random);
    const i = pick([2, 4, 5], random);
    return {
      kind: 'wire',
      story: 'A straight horizontal wire carries a current and is held in mid-air by a uniform horizontal magnetic field at right angles to it: the magnetic force exactly balances its weight. Find the field.',
      mode,
      b: 0,
      i,
      lCm,
      theta: 90,
      mGram,
      answer: levitationField(mGram, lCm / 100, i),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const v6 = pick([3, 4.8, 6, 10], random);
    const bGauss = pick([5, 6.5, 8, 10], random);
    return {
      kind: 'circle',
      story: 'An electron is shot at right angles to a uniform magnetic field. The force is always perpendicular to its velocity, so the speed stays constant and the path bends into a circle. Find the radius of the circle and the frequency of the revolution.',
      v6,
      bGauss,
      rCm: orbitRadiusCm(v6, bGauss),
      fMHz: orbitFreqMHz(bGauss),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const v6 = pick([3, 4, 5], random);
    const factor = pick([2, 3, 0.5], random);
    const bGauss = pick([6.5, 8, 10], random);
    return {
      kind: 'speed',
      story: 'An electron circles in a uniform magnetic field. It is then given a different speed, still at right angles to the field. Find its new orbit radius, and say what happens to the frequency of revolution.',
      v6,
      factor,
      bGauss,
      rCm: orbitRadiusCm(v6, bGauss),
      r2Cm: orbitRadiusCm(v6 * factor, bGauss),
      freeTests: 1,
    };
  }
  const v6 = pick([2, 4, 5], random);
  const bGauss = pick([5, 6.5, 10], random);
  const theta = pick([30, 45, 60], random);
  return {
    kind: 'helix',
    story: 'An electron enters a uniform magnetic field at an angle to the field lines. The part of its velocity across the field makes it circle, and the part along the field carries it forward: its path is a helix. Find the radius of the helix and its pitch, the distance advanced in one turn.',
    v6,
    bGauss,
    theta,
    rCm: orbitRadiusCm(v6, bGauss, theta),
    pitchCm: helixPitchCm(v6, bGauss, theta),
    freeTests: 1,
  };
}

export function judgeLorentz(lvl: LevelLorentz, dir: Dir, f13: number): { ok: boolean; dirOk: boolean; fOk: boolean } {
  const dirOk = dir === lvl.dir;
  const fOk = within(f13, lvl.f13, 0.03);
  return { ok: dirOk && fOk, dirOk, fOk };
}
export function judgeWire(lvl: LevelWire, answer: number): { ok: boolean } {
  return { ok: within(answer, lvl.answer, 0.03) };
}
export function judgeCircle(lvl: LevelCircle, rCm: number, fMHz: number): { ok: boolean; rOk: boolean; fOk: boolean } {
  const rOk = within(rCm, lvl.rCm, 0.03);
  const fOk = within(fMHz, lvl.fMHz, 0.03);
  return { ok: rOk && fOk, rOk, fOk };
}
export function judgeSpeed(lvl: LevelSpeed, r2Cm: number, freq: FreqChange): { ok: boolean; rOk: boolean; fOk: boolean } {
  const rOk = within(r2Cm, lvl.r2Cm, 0.03);
  const fOk = freq === 'unchanged';
  return { ok: rOk && fOk, rOk, fOk };
}
export function judgeHelix(lvl: LevelHelix, rCm: number, pitchCm: number): { ok: boolean; rOk: boolean; pOk: boolean } {
  const rOk = within(rCm, lvl.rCm, 0.03);
  const pOk = within(pitchCm, lvl.pitchCm, 0.03);
  return { ok: rOk && pOk, rOk, pOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'lorentz') {
    return [
      `The force is F = q v × B. Point the fingers along v and curl them towards B: the thumb gives the force on a positive charge. For a ${lvl.negative ? 'negative charge such as an electron the force is reversed' : 'positive charge it is the thumb direction'}: here it points ${lvl.dir}.`,
      `Its size is F = qvB = 1.6 × 10⁻¹⁹ × ${lvl.v6} × 10⁶ × ${lvl.b} = ${fmt(lvl.f13)} × 10⁻¹³ N, because v is perpendicular to B.`,
      'The force is always perpendicular to the velocity, so it changes the direction of the motion but does no work.',
    ];
  }
  if (lvl.kind === 'wire') {
    return lvl.mode === 'force'
      ? [`F = B I l sin θ = ${lvl.b} × ${lvl.i} × ${lvl.lCm / 100} × sin ${lvl.theta}° = ${fmt(lvl.answer)} mN.`, 'Only the component of the field across the wire matters, B sin θ. Along the wire the force is zero.']
      : [`Balance: B I l = m g, so B = mg/(Il) = ${lvl.mGram / 1000} × 9.8 / (${lvl.i} × ${lvl.lCm / 100}) = ${fmt(lvl.answer)} T.`, 'The wire is at right angles to the field, so sin θ = 1, and the force is upwards when the field, current and force follow the right-hand rule.'];
  }
  if (lvl.kind === 'circle') {
    return [
      `The magnetic force provides the centripetal force: qvB = mv²/r, so r = mv/qB = 9.1 × 10⁻³¹ × ${lvl.v6} × 10⁶ / (1.6 × 10⁻¹⁹ × ${lvl.bGauss} × 10⁻⁴) = ${fmt(lvl.rCm)} cm.`,
      `The frequency is f = qB/2πm = ${fmt(lvl.fMHz)} MHz. It does not contain v.`,
    ];
  }
  if (lvl.kind === 'speed') {
    return [
      `r = mv/qB is proportional to v: the speed is multiplied by ${lvl.factor}, so the radius becomes ${fmt(lvl.rCm)} cm × ${lvl.factor} = ${fmt(lvl.r2Cm)} cm.`,
      'The frequency f = qB/2πm does not depend on the speed: a faster electron goes on a bigger circle but takes the same time for each revolution.',
    ];
  }
  return [
    `Only the part of the velocity across the field circles: r = m v sin θ / qB = ${fmt(lvl.rCm)} cm.`,
    `The period is T = 2πm/qB, the same for every angle, and in one period the electron advances v cos θ × T along the field: pitch = ${fmt(lvl.pitchCm)} cm.`,
  ];
}
