// Pure game rules: no DOM, no canvas. The UI only draws the chamber and reads these functions.
import { shuffle } from '@core/quiz';

/** Magnitude of the electron charge, as used in NCERT (C). */
export const E = 1.6e-19;
/** Gravitational acceleration (m/s²) and the gap between the plates (m). */
export const G = 9.8;
export const GAP = 0.005;
/** The voltage dial goes from 0 to this many volts. */
export const V_MAX = 600;

export interface Drop {
  id: number;
  /** Mass in kg, from the drop's measured radius (shown in the lab). */
  mass: number;
  /** Charge in units of e: a whole number for a real drop, or n + 0.5 for an impure sample (level 3). */
  multiple: number;
  /** Charge in coulombs. */
  charge: number;
}

export const makeDrop = (id: number, mass: number, multiple: number): Drop => ({ id, mass, multiple, charge: multiple * E });

// ---- the physics ---------------------------------------------------------------------------

/** The voltage at which the electric force qV/d exactly balances the weight mg. */
export const hoverVoltage = (d: Drop) => (d.mass * G * GAP) / d.charge;

/** (electric force − weight) / weight. Zero when hovering, positive when the drop is pushed up. */
export const netRatio = (volts: number, d: Drop) => (d.charge * (volts / GAP)) / (d.mass * G) - 1;

/**
 * Upward speed in pixels per second. In a viscous fluid a drop reaches terminal speed almost at once,
 * and that speed is proportional to the net force, so speed follows the net ratio (capped).
 */
export const speed = (ratio: number) => 140 * Math.max(-1, Math.min(1, ratio * 4));

/** Is the voltage close enough to the hover voltage to count as "hovering" at this tolerance? */
export function isHovering(volts: number, d: Drop, tol: number): boolean {
  if (!(volts > 0)) return false;
  const vh = hoverVoltage(d);
  return Math.abs(volts - vh) / vh <= tol;
}

/** What the lab calculates from your voltage: q = m g d / V. Tuning error becomes charge error. */
export const measuredCharge = (volts: number, d: Drop) => (d.mass * G * GAP) / volts;

/** Charge in units of 10⁻¹⁹ C, the unit the lab prints. */
export const in19 = (q: number) => q / 1e-19;

// ---- finding the unit ----------------------------------------------------------------------

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
export const gcdAll = (xs: number[]) => xs.reduce(gcd);

/**
 * Can the drops measured so far tell e apart from 2e, 3e, ...? Only if there are at least three of them
 * and their whole-number multiples have no common factor. Until then, any answer would be a guess.
 */
export function determinesUnit(measured: Drop[]): boolean {
  return measured.length >= 3 && gcdAll(measured.map((d) => d.multiple)) === 1;
}

/** Is the student's answer (in 10⁻¹⁹ C, or in coulombs) the unit of charge, within tolerance? */
export function checkUnit(answer: number, tol: number): boolean {
  const in19Units = answer > 0 && answer < 1e-5 ? answer / 1e-19 : answer; // accept 1.6e-19 as well as 1.6
  return Math.abs(in19Units - E / 1e-19) / (E / 1e-19) <= tol;
}

// ---- impure samples ------------------------------------------------------------------------

export const isImpure = (d: Drop) => !Number.isInteger(d.multiple);

export function scoreFlags(flagged: number[], drops: Drop[]) {
  const impure = drops.filter(isImpure).map((d) => d.id);
  return {
    correct: impure.length === flagged.length && impure.every((id) => flagged.includes(id)),
    missed: impure.filter((id) => !flagged.includes(id)),
    falseAlarms: flagged.filter((id) => !impure.includes(id)),
  };
}

/** Is a real, whole-number drop's reading unmistakably different from a half-integer one at this tolerance? */
export function tellsApart(maxMultiple: number, tol: number): boolean {
  return (maxMultiple + 0.5) * tol < 0.25;
}

export function checkElectrons(entered: number, d: Drop): boolean {
  return Number.isInteger(entered) && entered === d.multiple;
}

export function starsFor(wrong: number): 1 | 2 | 3 {
  return Math.max(1, 3 - wrong) as 1 | 2 | 3;
}

// ---- levels --------------------------------------------------------------------------------

export type Mode = 'count' | 'unit' | 'flag';

export interface Level {
  drops: Drop[];
  mode: Mode;
  /** How close to the hover voltage the voltage must be for a reading to be recorded (fraction). */
  tol: number;
  /** Tolerance for the submitted unit of charge (level 2). */
  unitTol: number;
  /** Is e printed in the lab? */
  eKnown: boolean;
  story: string;
}

const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

/** Drop masses between 0.80 and 1.40 × 10⁻¹⁵ kg, so the hover voltage cannot reveal the charge. */
const mass = (r: () => number) => int(r, 80, 140) * 1e-17;

function pickDistinct(r: () => number, lo: number, hi: number, count: number): number[] {
  const all = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return shuffle(all, r).slice(0, count);
}

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const ns = pickDistinct(random, 1, 6, 3);
    return {
      drops: ns.map((n, i) => makeDrop(i + 1, mass(random), n)),
      mode: 'count',
      tol: 0.03,
      unitTol: 0.05,
      eKnown: true,
      story: 'A fine mist of oil drops falls between two charged plates. Each drop has picked up a few electrons. Raise the voltage until a drop hangs motionless, record it, and the lab will tell you its charge. Then work out how many electrons that is.',
    };
  }
  if (level === 2) {
    // Five drops of 2 to 9 e whose multiples share no common factor, so the unit really can be found.
    for (let t = 0; t < 500; t++) {
      const ns = pickDistinct(random, 2, 9, 5);
      if (gcdAll(ns) === 1) {
        return {
          drops: ns.map((n, i) => makeDrop(i + 1, mass(random), n)),
          mode: 'unit',
          tol: 0.02,
          unitTol: 0.05,
          eKnown: false,
          story: 'Nobody has measured the unit of charge yet. Balance several drops, record their charges, and look at the numbers. Every charge is a whole number of the same basic unit. Find it. The lab will not accept an answer until your drops could really tell the unit from twice the unit.',
        };
      }
    }
    throw new Error('could not build level 2');
  }
  // Level 3: six drops carrying 1 to 6 e; exactly two are impure (their charge is a whole number plus a half).
  // Only drops with n < 6 can take the extra half, which keeps every reading at most 6.5 e, where a few
  // percent of tuning error still cannot turn a pure reading into an impure-looking one.
  const ns = pickDistinct(random, 1, 6, 6);
  const canBeImpure = ns.map((n, i) => (n < 6 ? i : -1)).filter((i) => i >= 0);
  const impureIdx = new Set(shuffle(canBeImpure, random).slice(0, 2));
  return {
    drops: ns.map((n, i) => makeDrop(i + 1, mass(random), impureIdx.has(i) ? n + 0.5 : n)),
    mode: 'flag',
    tol: 0.03,
    unitTol: 0.05,
    eKnown: true,
    story: 'Two of these six drops are contaminated samples whose charge cannot be a whole number of electrons. Measure all six, then flag the impure ones. Your tuning is only accurate to a few percent, so decide carefully.',
  };
}
