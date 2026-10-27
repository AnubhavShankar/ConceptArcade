// Pure game rules: no DOM, no canvas. The UI only draws the tube and reads these functions.
import { pick } from '@core/quiz';

/** Coulomb constant 1/(4πε₀) in N m² C⁻² (NCERT uses 9 × 10⁹) and g in m/s². */
export const K = 9e9;
export const G = 9.8;

export type Scale = 'cm' | 'mm';

export interface Level {
  /** Ball mass in kg. */
  mass: number;
  /** Fixed charge on the base, in coulombs (signed). */
  baseQ: number;
  /** The height the ball must hover at, above the base, in metres. */
  target: number;
  /** Height of the tube in metres: the ball cannot rise above it. */
  tubeMax: number;
  /** Allowed error on the settled height (fraction). */
  tol: number;
  /** Releases that cost nothing before each failed one costs a star. */
  freeReleases: number;
  /** Is the settled height printed? (only on the first level, where you experiment) */
  showHeight: boolean;
  /** Must the student choose the sign of the ball's charge? */
  needsSign: boolean;
  /** Units the numbers are shown in. */
  units: { mass: 'g' | 'mg'; base: 'µC' | 'nC'; length: 'cm' | 'mm'; ball: 'nC' | 'pC' };
  story: string;
}

// ---- the physics ---------------------------------------------------------------------------

/** Where the electric force on the ball equals its weight: k q Q / r² = m g. Null if there is no repulsion. */
export function equilibriumHeight(q: number, baseQ: number, mass: number): number | null {
  if (!(q * baseQ > 0)) return null; // zero or opposite signs: no repulsion, so no hovering
  return Math.sqrt((K * Math.abs(q) * Math.abs(baseQ)) / (mass * G));
}

/** The charge (magnitude, in coulombs) that makes the ball hover at `height`: q = m g h² / (k Q). */
export const requiredCharge = (height: number, baseQ: number, mass: number) => (mass * G * height * height) / (K * Math.abs(baseQ));

/** The sign the ball needs to float: the same as the base. */
export const requiredSign = (baseQ: number): 1 | -1 => (baseQ > 0 ? 1 : -1);

/** Acceleration of the ball (m/s², up is positive) at height r: electric force over mass, minus g. */
export function acceleration(r: number, q: number, baseQ: number, mass: number): number {
  return (K * q * baseQ) / (mass * r * r) - G;
}

/** How high the ball sits when it rests on the base: 2% of the tube, so it scales with the rig (4 mm in a 20 cm tube). */
export const restOf = (tubeMax: number) => tubeMax * 0.02;
export const DAMPING = 8; // 1/s: oil-like friction, so the ball settles after a few bobs

export interface Ball {
  r: number;
  v: number;
}

/**
 * One small step of the ball's motion. It rests on the base below, and stops against the top of the tube.
 * Sub-stepping keeps the stiff 1/r² force stable.
 */
export function stepBall(b: Ball, dt: number, q: number, baseQ: number, mass: number, tubeMax: number): void {
  const rest = restOf(tubeMax);
  const n = Math.max(1, Math.ceil(dt / (1 / 480)));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = acceleration(b.r, q, baseQ, mass) - DAMPING * b.v;
    b.v += a * h;
    b.r += b.v * h;
    if (b.r <= rest) {
      b.r = rest;
      b.v = Math.max(0, b.v);
    }
    if (b.r >= tubeMax) {
      b.r = tubeMax;
      b.v = Math.min(0, b.v);
    }
  }
}

/** Where the ball ends up: its equilibrium height, resting on the base, or pressed against the top of the tube. */
export function settledHeight(q: number, level: Level): { height: number; how: 'hovering' | 'on-base' | 'at-top' } {
  const r = equilibriumHeight(q, level.baseQ, level.mass);
  const rest = restOf(level.tubeMax);
  if (r === null) return { height: rest, how: 'on-base' };
  if (r >= level.tubeMax) return { height: level.tubeMax, how: 'at-top' };
  return { height: Math.max(r, rest), how: r <= rest ? 'on-base' : 'hovering' };
}

export interface Verdict {
  ok: boolean;
  height: number;
  how: 'hovering' | 'on-base' | 'at-top';
  /** Where the ball settled compared with the target (for the message). */
  direction: 'on-target' | 'too-high' | 'too-low';
}

export function judge(q: number, level: Level): Verdict {
  const s = settledHeight(q, level);
  const off = (s.height - level.target) / level.target;
  const ok = s.how === 'hovering' && Math.abs(off) <= level.tol;
  return { ok, ...s, direction: ok ? 'on-target' : s.height > level.target ? 'too-high' : 'too-low' };
}

/** Run the real dynamics from a start height for `seconds` and return the ball. Used to prove the model settles. */
export function simulate(q: number, level: Level, seconds: number, startAt = level.tubeMax / 2): Ball {
  const b: Ball = { r: startAt, v: 0 };
  for (let t = 0; t < seconds; t += 0.01) stepBall(b, 0.01, q, level.baseQ, level.mass, level.tubeMax);
  return b;
}

// ---- levels --------------------------------------------------------------------------------

export function starsFor(failedReleases: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, failedReleases - free)) as 1 | 2 | 3;
}

const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

export function buildLevel(level: number, random: () => number): Level {
  const sign = (): 1 | -1 => (random() < 0.5 ? -1 : 1);
  if (level === 1) {
    return {
      mass: 1e-3,
      baseQ: 2e-6,
      target: pick([6, 8, 10, 12, 14], random) / 100,
      tubeMax: 0.2,
      tol: 0.03,
      freeReleases: 3,
      showHeight: true,
      needsSign: false,
      units: { mass: 'g', base: 'µC', length: 'cm', ball: 'nC' },
      story: 'A small charged ball sits in a glass tube above a fixed charged base. The base pushes the ball up and gravity pulls it down. Give the ball a charge so that it floats exactly at the marked height. The tube shows where the ball settles, so you can try, look, and learn how the height depends on the charge.',
    };
  }
  if (level === 2) {
    return {
      mass: pick([0.5, 1, 1.5, 2], random) * 1e-3,
      baseQ: int(random, 1, 4) * 1e-6,
      target: pick([4, 5, 6, 8, 10, 12], random) / 100,
      tubeMax: 0.2,
      tol: 0.03,
      freeReleases: 0,
      showHeight: false,
      needsSign: false,
      units: { mass: 'g', base: 'µC', length: 'cm', ball: 'nC' },
      story: 'This time the tube has no height readout, and every failed release costs you a star. The ball’s mass, the base charge and the target height are all printed. Work out the charge the ball needs, then release it.',
    };
  }
  const tiny = {
    mass: pick([20, 50, 80], random) * 1e-6,
    target: pick([3, 4, 5, 6, 8], random) / 1000,
    tubeMax: 0.012,
    tol: 0.03,
    freeReleases: 0,
    showHeight: false,
    units: { mass: 'mg' as const, base: 'nC' as const, length: 'mm' as const, ball: 'pC' as const },
  };
  if (level === 3) {
    return {
      ...tiny,
      baseQ: pick([10, 20, 50], random) * 1e-9,
      needsSign: false,
      story: 'A much smaller rig: the ball weighs milligrams, the tube is measured in millimetres, and the base holds only nanocoulombs. Work in SI units and give your answer in picocoulombs.',
    };
  }
  return {
    ...tiny,
    baseQ: sign() * pick([10, 20, 50], random) * 1e-9,
    needsSign: true,
    story: 'The base charge is now allowed to be negative. A ball charged the opposite way is pulled down onto the base, so you must choose the sign of the ball’s charge as well as its size.',
  };
}

// ---- the explanation shown after a win ----------------------------------------------------

const UNIT_SCALE = { g: 1e-3, mg: 1e-6, 'µC': 1e-6, nC: 1e-9, pC: 1e-12, cm: 1e-2, mm: 1e-3 } as const;

/** 3 significant figures, in scientific notation when very large or small. */
export function sig3(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}

export const mag = (x: number, unit: keyof typeof UNIT_SCALE) => Number((Math.abs(x) / UNIT_SCALE[unit]).toPrecision(6));

export function explainSolution(level: Level): string[] {
  const u = level.units;
  const mText = `${mag(level.mass, u.mass)} ${u.mass}`;
  const QText = `${mag(level.baseQ, u.base)} ${u.base}`;
  const hText = `${mag(level.target, u.length)} ${u.length}`;
  const q = requiredCharge(level.target, level.baseQ, level.mass);
  const lines = [
    'At hover the electric force on the ball equals its weight: k q Q / h² = m g.',
    `Solve for the ball's charge: q = m g h² / (k Q).`,
    `In SI units: m = ${mText} = ${sig3(level.mass)} kg, Q = ${QText} = ${sig3(Math.abs(level.baseQ))} C, h = ${hText} = ${sig3(level.target)} m.`,
    `q = (${sig3(level.mass)} × 9.8 × ${sig3(level.target)}²) / (9 × 10⁹ × ${sig3(Math.abs(level.baseQ))}) = ${sig3(q)} C = ${sig3(q / UNIT_SCALE[u.ball])} ${u.ball}.`,
  ];
  if (level.needsSign) lines.push(`The base is ${level.baseQ > 0 ? 'positive' : 'negative'}, and like charges repel, so the ball needs a ${level.baseQ > 0 ? 'positive' : 'negative'} charge. An opposite charge would attract it and it would fall.`);
  return lines;
}

/** The charge to enter in the ball's unit (a positive number, or negative if the base is). */
export const answerInUnit = (level: Level) => requiredCharge(level.target, level.baseQ, level.mass) / UNIT_SCALE[level.units.ball];
export const toCoulombs = (value: number, unit: Level['units']['ball']) => value * UNIT_SCALE[unit];
