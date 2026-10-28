// Pure rules of the AC Generator: no DOM, no canvas.
import { pick } from '@core/quiz';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e5 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => (answer === 0 ? Math.abs(value) < 1e-9 : Math.abs(value - answer) / Math.abs(answer) <= tol);

/** Peak emf N B A ω in volts: B in T, A in cm², ω in rad/s. */
export const peakEmf = (n: number, b: number, aCm2: number, omega: number) => n * b * (aCm2 * 1e-4) * omega;
/** Instantaneous emf, with θ the angle the coil has turned from the position where its plane is at right angles to the field. */
export const emfAt = (peak: number, thetaDeg: number) => peak * Math.sin((thetaDeg * Math.PI) / 180);
export const omegaFromHz = (f: number) => 2 * Math.PI * f;
export const omegaFromRpm = (rpm: number) => (2 * Math.PI * rpm) / 60;

export type Orientation = 'parallel' | 'perpendicular';

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelPeak {
  kind: 'peak';
  story: string;
  n: number;
  b: number;
  aCm2: number;
  hz: number;
  theta: number;
  peak: number;
  inst: number;
  freeTests: number;
}
export interface LevelRpm {
  kind: 'rpm';
  story: string;
  n: number;
  b: number;
  aCm2: number;
  rpm: number;
  peak: number;
  quarterMs: number;
  freeTests: number;
}
export interface LevelScale {
  kind: 'scale';
  story: string;
  peak: number;
  nFactor: number;
  speedFactor: number;
  bFactor: number;
  newPeak: number;
  freeTests: number;
}
export type Level = LevelPeak | LevelRpm | LevelScale;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const n = pick([50, 100, 200], random);
    const b = pick([0.01, 0.05, 0.1], random);
    const aCm2 = pick([500, 1000, 2000], random);
    const hz = pick([0.5, 2, 10, 50], random);
    const theta = pick([30, 45, 60], random);
    const peak = peakEmf(n, b, aCm2, omegaFromHz(hz));
    return {
      kind: 'peak',
      story: 'A coil turns steadily in a uniform magnetic field about an axis in its plane and at right angles to the field. Find the maximum emf it generates, and the emf at the instant the coil has turned a given angle from the position in which its plane is at right angles to the field.',
      n,
      b,
      aCm2,
      hz,
      theta,
      peak,
      inst: emfAt(peak, theta),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const n = pick([100, 200, 500], random);
    const b = pick([0.02, 0.05, 0.1], random);
    const aCm2 = pick([200, 500, 1000], random);
    const rpm = pick([300, 600, 1200, 3000], random);
    return {
      kind: 'rpm',
      story: 'A generator coil is turned at a stated number of revolutions per minute. Find its peak emf, and how long after the emf is zero it first reaches its peak.',
      n,
      b,
      aCm2,
      rpm,
      peak: peakEmf(n, b, aCm2, omegaFromRpm(rpm)),
      quarterMs: (60 / rpm / 4) * 1000,
      freeTests: 1,
    };
  }
  const peak = pick([6, 10, 20], random);
  const nFactor = pick([1, 2, 3], random);
  const speedFactor = pick([0.5, 2, 3], random);
  const bFactor = pick([1, 2, 0.5], random);
  return {
    kind: 'scale',
    story: 'A generator’s peak emf is known. The number of turns, the speed of rotation and the strength of the field are then changed. Find the new peak emf.',
    peak,
    nFactor,
    speedFactor,
    bFactor,
    newPeak: peak * nFactor * speedFactor * bFactor,
    freeTests: 1,
  };
}

export function judgePeak(lvl: LevelPeak, peak: number, inst: number): { ok: boolean; pOk: boolean; iOk: boolean } {
  const pOk = within(peak, lvl.peak, 0.03);
  const iOk = within(inst, lvl.inst, 0.03);
  return { ok: pOk && iOk, pOk, iOk };
}
export function judgeRpm(lvl: LevelRpm, peak: number, ms: number): { ok: boolean; pOk: boolean; tOk: boolean } {
  const pOk = within(peak, lvl.peak, 0.03);
  const tOk = within(ms, lvl.quarterMs, 0.03);
  return { ok: pOk && tOk, pOk, tOk };
}
export function judgeScale(lvl: LevelScale, v: number): { ok: boolean } {
  return { ok: within(v, lvl.newPeak, 0.03) };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'peak') {
    return [
      `The flux is Φ = NBA cos ωt, so ε = −dΦ/dt = NBAω sin ωt. The peak is ε₀ = NBAω = ${lvl.n} × ${lvl.b} × ${lvl.aCm2 * 1e-4} × 2π × ${lvl.hz} = ${fmt(lvl.peak)} V.`,
      `After turning ${lvl.theta}° from the position of zero emf, ε = ε₀ sin ${lvl.theta}° = ${fmt(lvl.inst)} V. The emf is greatest when the plane of the coil is parallel to the field and zero when it is perpendicular to it.`,
    ];
  }
  if (lvl.kind === 'rpm') {
    return [
      `ω = 2π × ${lvl.rpm}/60 = ${fmt(omegaFromRpm(lvl.rpm))} rad/s, so ε₀ = NBAω = ${fmt(lvl.peak)} V.`,
      `One turn takes T = 60/${lvl.rpm} s. The emf goes from zero to its peak in a quarter of a turn: T/4 = ${fmt(lvl.quarterMs)} ms.`,
    ];
  }
  return [
    `ε₀ = NBAω is proportional to each of N, B, A and ω. The new peak is ${lvl.peak} × ${lvl.nFactor} (turns) × ${lvl.speedFactor} (speed) × ${lvl.bFactor} (field) = ${fmt(lvl.newPeak)} V.`,
    'Faster rotation or a stronger field raises the peak emf in proportion, and also raises the frequency if the speed changes.',
  ];
}
