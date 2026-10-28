// Pure rules of the Capacitor Bench: no DOM, no canvas.
// Capacitance in pF, charge in nC, potential difference in volts, area in m², gap in mm.
import { pick } from '@core/quiz';

export const EPS0 = 8.854e-12;
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => Math.abs(value - answer) / Math.abs(answer) <= tol;

/** C = Q / V. With C in pF and V in volts the charge is in pC; divide by 1000 for nC. */
export const chargeNc = (cPf: number, v: number) => (cPf * v) / 1000;
export const voltageOf = (qNc: number, cPf: number) => (qNc * 1000) / cPf;
/** Parallel plates: C = ε₀ A / d, in pF (A in m², d in mm). */
export const plateCapacitance = (aM2: number, dMm: number) => (EPS0 * aM2) / (dMm * 1e-3) * 1e12;
/** The gap that gives capacitance C (pF) with plate area A (m²). */
export const gapFor = (cPf: number, aM2: number) => (EPS0 * aM2 * 1e12) / cPf / 1e-3;

// ---- level 1: charge and voltage ------------------------------------------------------------------------------------------

export interface LevelCharge {
  kind: 'charge';
  story: string;
  mode: 'charge' | 'voltage';
  c: number; // pF
  v: number; // V
  q: number; // nC
  freeTests: number;
}
export function judgeCharge(lvl: LevelCharge, value: number): { ok: boolean; verdict: 'on-target' | 'too-big' | 'too-small' } {
  const answer = lvl.mode === 'charge' ? lvl.q : lvl.v;
  const ok = within(value, answer, 0.03);
  return { ok, verdict: ok ? 'on-target' : value > answer ? 'too-big' : 'too-small' };
}

// ---- level 2: the parallel plate ---------------------------------------------------------------------------------------------

export type Halve = 'double' | 'half' | 'same';
export interface LevelPlate {
  kind: 'plate';
  story: string;
  a: number; // m²
  d: number; // mm
  c: number; // pF
  k: number;
  /** Capacitance after the gap is halved and the space is filled with the dielectric. */
  c2: number;
  freeTests: number;
}
export function judgePlate(lvl: LevelPlate, d: number, c2: number): { ok: boolean; dOk: boolean; c2Ok: boolean } {
  const dOk = within(d, lvl.d, 0.03);
  const c2Ok = within(c2, lvl.c2, 0.03);
  return { ok: dOk && c2Ok, dOk, c2Ok };
}

// ---- level 3: the dielectric slab, with the supply connected or not ------------------------------------------------------

export interface LevelSlab {
  kind: 'slab';
  story: string;
  connected: boolean;
  c0: number; // pF
  v0: number; // V
  q0: number; // nC
  k: number;
  v1: number;
  q1: number;
  freeTests: number;
}
export function slabAfter(connected: boolean, c0: number, v0: number, k: number): { v: number; q: number } {
  const q0 = chargeNc(c0, v0);
  return connected ? { v: v0, q: q0 * k } : { v: v0 / k, q: q0 };
}
export function judgeSlab(lvl: LevelSlab, v: number, q: number): { ok: boolean; vOk: boolean; qOk: boolean } {
  const vOk = within(v, lvl.v1, 0.03);
  const qOk = within(q, lvl.q1, 0.03);
  return { ok: vOk && qOk, vOk, qOk };
}

export type Level = LevelCharge | LevelPlate | LevelSlab;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const c = pick([5, 10, 12, 20, 50], random);
    const v = pick([12, 50, 100, 120, 200], random);
    const mode = random() < 0.5 ? 'charge' : 'voltage';
    return {
      kind: 'charge',
      story: mode === 'charge' ? 'A capacitor of known capacitance is connected to a battery. The charge on each plate is proportional to the potential difference: Q = CV. Work out the charge that ends up on the plates.' : 'A capacitor of known capacitance holds a known charge. The potential difference across it is V = Q/C. Work out the voltage across the plates.',
      mode,
      c,
      v,
      q: chargeNc(c, v),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const a = pick([2e-3, 4e-3, 6e-3, 8e-3, 1e-2], random);
    const d = pick([1, 2, 3, 4, 5], random);
    const k = pick([2, 3, 5, 6], random);
    const c = plateCapacitance(a, d);
    return {
      kind: 'plate',
      story: 'A parallel-plate capacitor has air between its plates. Find the gap that gives the capacitance in the order. Then the gap is halved and the space between the plates is filled with a dielectric. Find the new capacitance.',
      a,
      d,
      c,
      k,
      c2: c * 2 * k,
      freeTests: 1,
    };
  }
  const connected = random() < 0.5;
  const c0 = pick([10, 20, 50], random);
  const v0 = pick([50, 100, 200], random);
  const k = pick([2, 3, 4, 6], random);
  const after = slabAfter(connected, c0, v0, k);
  return {
    kind: 'slab',
    story: connected ? 'A charged capacitor stays connected to its battery while a slab of dielectric is slid between the plates. The battery keeps the potential difference fixed. Find the potential difference and the charge afterwards.' : 'A capacitor is charged and then disconnected from its battery, so its charge cannot change. A slab of dielectric is then slid between the plates. Find the potential difference and the charge afterwards.',
    connected,
    c0,
    v0,
    q0: chargeNc(c0, v0),
    k,
    v1: after.v,
    q1: after.q,
    freeTests: 1,
  };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win -------------------------------------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'charge') {
    return [
      lvl.mode === 'charge' ? `C = Q/V, so Q = CV = ${lvl.c} pF × ${lvl.v} V = ${fmt(lvl.c * lvl.v)} pC = ${fmt(lvl.q)} nC.` : `V = Q/C = ${fmt(lvl.q)} nC / ${lvl.c} pF = ${fmt(lvl.v)} V.`,
      'The capacitance depends only on the geometry of the plates (and what is between them), not on Q or V: doubling V doubles Q.',
      '1 pF = 10⁻¹² F, and 1 nC = 10⁻⁹ C.',
    ];
  }
  if (lvl.kind === 'plate') {
    return [
      `C = ε₀A/d, so d = ε₀A/C = 8.854 × 10⁻¹² × ${fmt(lvl.a)} / (${fmt(lvl.c)} × 10⁻¹²) = ${lvl.d} mm.`,
      `Halving the gap doubles C (C ∝ 1/d), and a dielectric multiplies it by K = ${lvl.k}: C′ = ${fmt(lvl.c)} × 2 × ${lvl.k} = ${fmt(lvl.c2)} pF.`,
      'Exercise 2.5 is the same idea: 8 pF with the gap halved and K = 6 becomes 96 pF.',
    ];
  }
  return lvl.connected
    ? [
        'The battery stays connected, so the potential difference is fixed at V.',
        `The capacitance becomes KC, so the charge becomes Q′ = KCV = ${lvl.k} × ${fmt(lvl.q0)} nC = ${fmt(lvl.q1)} nC: more charge flows from the battery.`,
        'The field between the plates, V/d, is unchanged, and the stored energy ½CV² is multiplied by K.',
      ]
    : [
        'The capacitor is isolated, so the charge cannot change: Q′ = Q.',
        `The capacitance becomes KC, so the potential difference falls to V′ = Q/KC = ${fmt(lvl.v0)} V / ${lvl.k} = ${fmt(lvl.v1)} V.`,
        'The field is divided by K, and the stored energy Q²/2C falls by the factor K: the slab is pulled in and does work.',
      ];
}
