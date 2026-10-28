// Pure rules of the LCR Bench: no DOM, no canvas.
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

export const impedance = (r: number, xl: number, xc: number) => Math.hypot(r, xl - xc);
/** Phase angle in degrees: positive when the circuit is inductive (the current lags the voltage). */
export const phaseDeg = (r: number, xl: number, xc: number) => (Math.atan2(xl - xc, r) * 180) / Math.PI;
export const xlOf = (lMilliH: number, hz: number) => 2 * Math.PI * hz * lMilliH * 1e-3;
export const xcOf = (cMicroF: number, hz: number) => 1 / (2 * Math.PI * hz * cMicroF * 1e-6);

export type Lead = 'lags' | 'leads';

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelRC {
  kind: 'rc';
  story: string;
  r: number;
  cMicroF: number;
  v: number;
  hz: number;
  xc: number;
  z: number;
  i: number;
  vc: number;
  freeTests: number;
}
export interface LevelLCR {
  kind: 'lcr';
  story: string;
  r: number;
  xl: number;
  xc: number;
  vPeak: number;
  z: number;
  phase: number;
  lead: Lead;
  freeTests: number;
}
export interface LevelVoltages {
  kind: 'voltages';
  story: string;
  r: number;
  xl: number;
  xc: number;
  i: number;
  vr: number;
  vl: number;
  vc: number;
  source: number;
  freeTests: number;
}
export interface LevelCoil {
  kind: 'coil';
  story: string;
  r: number;
  lMilliH: number;
  hz: number;
  v: number;
  xl: number;
  z: number;
  pf: number;
  freeTests: number;
}
export type Level = LevelRC | LevelLCR | LevelVoltages | LevelCoil;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const r = pick([100, 200, 300], random);
    const cMicroF = pick([10, 15, 20, 30], random);
    const v = pick([110, 220], random);
    const hz = pick([50, 60], random);
    const x = xcOf(cMicroF, hz);
    const z = impedance(r, 0, x);
    return {
      kind: 'rc',
      story: 'A resistor and a capacitor are in series on an AC source. The voltage across the resistor is in phase with the current and that across the capacitor is a quarter cycle behind it, so the impedance is not R plus X. Find the impedance, the rms current, and the rms voltage across the capacitor.',
      r,
      cMicroF,
      v,
      hz,
      xc: x,
      z,
      i: v / z,
      vc: (v / z) * x,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const r = pick([3, 6, 8], random);
    const [xl, xc] = pick([[8, 4], [4, 8], [10, 2], [2, 10], [12, 6]] as [number, number][], random);
    const vPeak = pick([283, 311, 340], random);
    return {
      kind: 'lcr',
      story: 'A sinusoidal voltage is applied to a series LCR circuit. Find the impedance of the circuit, and the phase difference between the source voltage and the current, saying whether the current lags or leads the voltage.',
      r,
      xl,
      xc,
      vPeak,
      z: impedance(r, xl, xc),
      phase: Math.abs(phaseDeg(r, xl, xc)),
      lead: xl > xc ? 'lags' : 'leads',
      freeTests: 1,
    };
  }
  if (level === 3) {
    const r = pick([30, 40, 60], random);
    const xl = pick([50, 80, 100], random);
    const xc = pick([20, 40, 120], random);
    const i = pick([1, 2, 3], random);
    const vr = r * i;
    const vl = xl * i;
    const vc = xc * i;
    return {
      kind: 'voltages',
      story: 'The rms voltages across the resistor, the inductor and the capacitor of a series LCR circuit are measured. They do not add up arithmetically to the source voltage, because they are not in phase. Find the rms voltage of the source.',
      r,
      xl,
      xc,
      i,
      vr,
      vl,
      vc,
      source: Math.hypot(vr, vl - vc),
      freeTests: 1,
    };
  }
  const r = pick([20, 40, 60], random);
  const lMilliH = pick([100, 200, 300], random);
  const hz = pick([50, 60], random);
  const v = pick([110, 220], random);
  const xl = xlOf(lMilliH, hz);
  const z = impedance(r, xl, 0);
  return {
    kind: 'coil',
    story: 'A coil has both inductance and resistance, so it behaves like a resistor in series with a pure inductor. Find the impedance of the coil, the rms current, and the power factor.',
    r,
    lMilliH,
    hz,
    v,
    xl,
    z,
    pf: r / z,
    freeTests: 1,
  };
}

export function judgeRC(lvl: LevelRC, z: number, i: number, vc: number): { ok: boolean; zOk: boolean; iOk: boolean; vOk: boolean } {
  const zOk = within(z, lvl.z, 0.03);
  const iOk = within(i, lvl.i, 0.03);
  const vOk = within(vc, lvl.vc, 0.03);
  return { ok: zOk && iOk && vOk, zOk, iOk, vOk };
}
export function judgeLCR(lvl: LevelLCR, z: number, phase: number, lead: Lead): { ok: boolean; zOk: boolean; pOk: boolean; lOk: boolean } {
  const zOk = within(z, lvl.z, 0.03);
  const pOk = within(phase, lvl.phase, 0.03);
  const lOk = lead === lvl.lead;
  return { ok: zOk && pOk && lOk, zOk, pOk, lOk };
}
export function judgeVoltages(lvl: LevelVoltages, source: number): { ok: boolean } {
  return { ok: within(source, lvl.source, 0.03) };
}
export function judgeCoil(lvl: LevelCoil, z: number, i: number, pf: number): { ok: boolean; zOk: boolean; iOk: boolean; fOk: boolean } {
  const zOk = within(z, lvl.z, 0.03);
  const iOk = within(i, lvl.v / lvl.z, 0.03);
  const fOk = within(pf, lvl.pf, 0.03);
  return { ok: zOk && iOk && fOk, zOk, iOk, fOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'rc') {
    return [
      `X_C = 1/ωC = ${fmt(lvl.xc)} Ω, and Z = √(R² + X_C²) = √(${lvl.r}² + ${fmt(lvl.xc)}²) = ${fmt(lvl.z)} Ω. The current is I = V/Z = ${fmt(lvl.i)} A.`,
      `V_C = I X_C = ${fmt(lvl.vc)} V, and V_R = I R = ${fmt(lvl.i * lvl.r)} V. Their arithmetic sum is bigger than the source voltage, which is not a paradox: the two voltages are a quarter cycle apart and add as perpendicular phasors, V = √(V_R² + V_C²).`,
    ];
  }
  if (lvl.kind === 'lcr') {
    return [
      `Z = √(R² + (X_L − X_C)²) = √(${lvl.r}² + (${lvl.xl} − ${lvl.xc})²) = ${fmt(lvl.z)} Ω.`,
      `tan φ = (X_L − X_C)/R, so φ = ${fmt(lvl.phase)}°. X_L is ${lvl.xl > lvl.xc ? 'larger' : 'smaller'} than X_C, so the circuit is ${lvl.xl > lvl.xc ? 'inductive and the current lags' : 'capacitive and the current leads'} the voltage.`,
    ];
  }
  if (lvl.kind === 'voltages') {
    return [
      `The voltages across the inductor and capacitor are opposite in phase, so they partly cancel: V_L − V_C = ${lvl.vl} − ${lvl.vc} = ${lvl.vl - lvl.vc} V.`,
      `The resistor voltage is a quarter cycle from that, so V = √(V_R² + (V_L − V_C)²) = √(${lvl.vr}² + ${lvl.vl - lvl.vc}²) = ${fmt(lvl.source)} V.`,
    ];
  }
  return [
    `X_L = 2πfL = ${fmt(lvl.xl)} Ω, so Z = √(R² + X_L²) = ${fmt(lvl.z)} Ω and I = V/Z = ${fmt(lvl.v / lvl.z)} A.`,
    `The power factor is cos φ = R/Z = ${fmt(lvl.pf)}. Only the resistance dissipates power: P = I²R.`,
  ];
}
