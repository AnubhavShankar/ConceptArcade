// Pure rules of the Bridge Balance: no DOM, no canvas.
// Resistance in ohms, emf in volts, current in amperes (the galvanometer current is shown in mA).
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
const within = (value: number, answer: number, tol: number) => Math.abs(value - answer) / Math.abs(answer) <= tol;

/** The bridge: A to B is P, B to C is Q, A to D is R, D to C is S, the galvanometer G joins B and D, the battery V is across A and C. */
export function bridge(p: number, q: number, r: number, s: number, g: number, v: number) {
  // Nodal analysis with C at 0 V and A at V: unknowns V_B and V_D.
  const a11 = 1 / p + 1 / q + 1 / g;
  const a12 = -1 / g;
  const a22 = 1 / r + 1 / s + 1 / g;
  const b1 = v / p;
  const b2 = v / r;
  const det = a11 * a22 - a12 * a12;
  const vB = (b1 * a22 - a12 * b2) / det;
  const vD = (a11 * b2 - a12 * b1) / det;
  return { vB, vD, ig: (vB - vD) / g };
}
/** The balance condition: P/Q = R/S. */
export const balanced = (p: number, q: number, r: number, s: number) => Math.abs(p * s - q * r) < 1e-9 * p * s;
/** Meter bridge deflection (arbitrary units, zero at balance): the junction of X and R against the jockey. */
export const meterDeflection = (x: number, r: number, jockey: number, v = 3) => v * (x / (x + r) - jockey / 100);

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelNull {
  kind: 'null';
  story: string;
  p: number;
  q: number;
  /** The unknown resistance in arm DC. */
  x: number;
  /** The rheostat setting at which the bridge balances. */
  rStar: number;
  g: number;
  v: number;
  freeTests: number;
}
export interface LevelCurrent {
  kind: 'current';
  story: string;
  p: number;
  q: number;
  r: number;
  s: number;
  g: number;
  v: number;
  /** In mA. */
  igMilli: number;
  /** True when the current flows from B to D. */
  bToD: boolean;
  freeTests: number;
}
export interface LevelMeter {
  kind: 'meter';
  story: string;
  x: number;
  r: number;
  l: number;
  swapped: number;
  freeTests: number;
}
export type Level = LevelNull | LevelCurrent | LevelMeter;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const p = pick([10, 20, 25, 50], random);
    const k = pick([0.5, 1, 2, 2.5], random);
    const q = p / k;
    const x = pick([20, 40, 60, 80], random);
    return {
      kind: 'null',
      story: 'A Wheatstone bridge has a hidden resistor X in one arm. Turn the rheostat in the opposite arm until the galvanometer shows no deflection, then use that setting to find X.',
      p,
      q,
      x,
      rStar: k * x,
      g: 50,
      v: 6,
      freeTests: 1,
    };
  }
  if (level === 2) {
    for (;;) {
      const p = pick([10, 20, 50, 100], random);
      const q = pick([5, 10, 20, 50], random);
      const r = pick([20, 40, 60, 100], random);
      const s = pick([5, 10, 20, 50], random);
      const g = pick([10, 15, 20], random);
      const v = pick([6, 10, 12], random);
      const res = bridge(p, q, r, s, g, v);
      if (Math.abs(res.ig) < 5e-4 || Math.abs(res.ig) > 0.2 || balanced(p, q, r, s)) continue;
      return {
        kind: 'current',
        story: 'The arms of a Wheatstone bridge are not balanced, so a current flows through the galvanometer. Apply Kirchhoff\'s rules, or find the potentials at B and D. Find the galvanometer current and its direction.',
        p,
        q,
        r,
        s,
        g,
        v,
        igMilli: Math.abs(res.ig) * 1000,
        bToD: res.ig > 0,
        freeTests: 1,
      };
    }
  }
  const l = pick([20, 25, 40, 50, 60, 75], random);
  const r = pick([10, 20, 30, 40], random);
  return {
    kind: 'meter',
    story: 'In a meter bridge a uniform wire one metre long is connected across a battery. An unknown resistance X and a known resistance R are in the two gaps. Slide the jockey along the wire until the galvanometer shows no deflection. Find X, then predict where the balance point moves if X and R are swapped.',
    x: (r * l) / (100 - l),
    r,
    l,
    swapped: 100 - l,
    freeTests: 1,
  };
}

export function judgeNull(lvl: LevelNull, x: number): { ok: boolean } {
  return { ok: within(x, lvl.x, 0.03) };
}
export function judgeCurrent(lvl: LevelCurrent, ig: number, bToD: boolean): { ok: boolean; igOk: boolean; dirOk: boolean } {
  const igOk = within(ig, lvl.igMilli, 0.03);
  const dirOk = bToD === lvl.bToD;
  return { ok: igOk && dirOk, igOk, dirOk };
}
export function judgeMeter(lvl: LevelMeter, x: number, swapped: number): { ok: boolean; xOk: boolean; sOk: boolean } {
  const xOk = within(x, lvl.x, 0.03);
  const sOk = within(swapped, lvl.swapped, 0.03);
  return { ok: xOk && sOk, xOk, sOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'null') {
    return [
      `At null the galvanometer current is zero, so the potentials at B and D are equal and P/Q = R/X.`,
      `With P = ${lvl.p} Ω, Q = ${fmt(lvl.q)} Ω and R = ${fmt(lvl.rStar)} Ω at balance, X = RQ/P = ${fmt(lvl.rStar)} × ${fmt(lvl.q)} / ${lvl.p} = ${fmt(lvl.x)} Ω.`,
      'The balance does not depend on the battery emf or on the galvanometer resistance, which is why the method is so accurate.',
    ];
  }
  if (lvl.kind === 'current') {
    const res = bridge(lvl.p, lvl.q, lvl.r, lvl.s, lvl.g, lvl.v);
    return [
      `Take C as 0 V and A as ${lvl.v} V. Kirchhoff's junction rule at B and at D gives two equations in V_B and V_D, which give V_B = ${fmt(res.vB)} V and V_D = ${fmt(res.vD)} V.`,
      `The galvanometer carries I_g = (V_B − V_D)/G = (${fmt(res.vB)} − ${fmt(res.vD)}) / ${lvl.g} = ${fmt(lvl.igMilli)} mA, flowing from ${lvl.bToD ? 'B to D' : 'D to B'}, towards the lower potential.`,
      `The bridge is not balanced: P/Q = ${fmt(lvl.p / lvl.q)} but R/S = ${fmt(lvl.r / lvl.s)}.`,
    ];
  }
  return [
    `At balance the wire lengths are in the ratio of the resistances: X/R = l/(100 − l), so X = R l/(100 − l) = ${lvl.r} × ${lvl.l} / ${100 - lvl.l} = ${fmt(lvl.x)} Ω.`,
    `Swapping X and R swaps the ratio, so the new balance length is 100 − ${lvl.l} = ${lvl.swapped} cm.`,
  ];
}
