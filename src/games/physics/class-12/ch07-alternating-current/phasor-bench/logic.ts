// Pure rules of the Phasor Bench: no DOM, no canvas.
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

export const peakFromRms = (rms: number) => Math.SQRT2 * rms;
export const rmsFromPeak = (peak: number) => peak / Math.SQRT2;
export const instantaneous = (peak: number, phaseDeg: number) => peak * Math.sin((phaseDeg * Math.PI) / 180);

export type Phase = 'inphase' | 'lags' | 'leads';

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelBulb {
  kind: 'bulb';
  story: string;
  p: number;
  v: number;
  r: number;
  vm: number;
  i: number;
  freeTests: number;
}
export interface LevelConvert {
  kind: 'convert';
  story: string;
  vm: number;
  iRms: number;
  vRms: number;
  iPeak: number;
  freeTests: number;
}
export interface LevelCycle {
  kind: 'cycle';
  story: string;
  r: number;
  v: number;
  hz: number;
  i: number;
  pAvg: number;
  pPeak: number;
  freeTests: number;
}
export interface LevelInstant {
  kind: 'instant';
  story: string;
  v: number;
  hz: number;
  phase: number;
  vNow: number;
  freeTests: number;
}
export type Level = LevelBulb | LevelConvert | LevelCycle | LevelInstant;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const p = pick([40, 60, 100, 150], random);
    const v = pick([110, 220, 230, 240], random);
    return {
      kind: 'bulb',
      story: 'A light bulb is rated for a power at a stated rms supply voltage. Find the resistance of the bulb, the peak voltage of the supply, and the rms current through the bulb.',
      p,
      v,
      r: (v * v) / p,
      vm: peakFromRms(v),
      i: p / v,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const vm = pick([220, 300, 340, 400], random);
    const iRms = pick([5, 10, 15], random);
    return {
      kind: 'convert',
      story: 'The peak voltage of an AC supply is known, and the rms value of the current in a circuit is known. Find the rms voltage of the supply, and the peak value of the current.',
      vm,
      iRms,
      vRms: rmsFromPeak(vm),
      iPeak: peakFromRms(iRms),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const r = pick([50, 100, 200, 484], random);
    const v = pick([110, 220], random);
    const hz = pick([50, 60], random);
    return {
      kind: 'cycle',
      story: 'A resistor is connected to an AC supply. The power at an instant is v times i, and it changes through the cycle. Find the rms current, the average power over a full cycle, and the largest power at any instant.',
      r,
      v,
      hz,
      i: v / r,
      pAvg: (v * v) / r,
      pPeak: (2 * v * v) / r,
      freeTests: 1,
    };
  }
  const v = pick([110, 220, 230], random);
  const hz = pick([50, 60], random);
  const phase = pick([30, 45, 60, 120, 150], random);
  return {
    kind: 'instant',
    story: 'An AC supply of known rms voltage gives v = v_m sin ωt. Find the voltage at the instant when ωt has a given value.',
    v,
    hz,
    phase,
    vNow: instantaneous(peakFromRms(v), phase),
    freeTests: 1,
  };
}

export function judgeBulb(lvl: LevelBulb, r: number, vm: number, i: number): { ok: boolean; rOk: boolean; vOk: boolean; iOk: boolean } {
  const rOk = within(r, lvl.r, 0.03);
  const vOk = within(vm, lvl.vm, 0.03);
  const iOk = within(i, lvl.i, 0.03);
  return { ok: rOk && vOk && iOk, rOk, vOk, iOk };
}
export function judgeConvert(lvl: LevelConvert, vRms: number, iPeak: number): { ok: boolean; vOk: boolean; iOk: boolean } {
  const vOk = within(vRms, lvl.vRms, 0.03);
  const iOk = within(iPeak, lvl.iPeak, 0.03);
  return { ok: vOk && iOk, vOk, iOk };
}
export function judgeCycle(lvl: LevelCycle, i: number, pAvg: number, pPeak: number): { ok: boolean; iOk: boolean; aOk: boolean; pOk: boolean } {
  const iOk = within(i, lvl.i, 0.03);
  const aOk = within(pAvg, lvl.pAvg, 0.03);
  const pOk = within(pPeak, lvl.pPeak, 0.03);
  return { ok: iOk && aOk && pOk, iOk, aOk, pOk };
}
export function judgeInstant(lvl: LevelInstant, v: number, phase: Phase): { ok: boolean; vOk: boolean; pOk: boolean } {
  const vOk = within(v, lvl.vNow, 0.03);
  const pOk = phase === 'inphase';
  return { ok: vOk && pOk, vOk, pOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'bulb') {
    return [
      `P = V²/R, so R = V²/P = ${lvl.v}² / ${lvl.p} = ${fmt(lvl.r)} Ω. The rms current is I = P/V = ${fmt(lvl.i)} A.`,
      `The rated voltage is the rms value. The peak voltage is v_m = √2 V = ${fmt(lvl.vm)} V.`,
    ];
  }
  if (lvl.kind === 'convert') {
    return [`V_rms = v_m/√2 = ${lvl.vm} / 1.414 = ${fmt(lvl.vRms)} V.`, `i_m = √2 I_rms = 1.414 × ${lvl.iRms} = ${fmt(lvl.iPeak)} A. The rms value is the steady value that would give the same heating.`];
  }
  if (lvl.kind === 'cycle') {
    return [
      `I_rms = V/R = ${lvl.v} / ${lvl.r} = ${fmt(lvl.i)} A, and the average power over a full cycle is V_rms I_rms = ${fmt(lvl.pAvg)} W.`,
      `The power v i = (v_m²/R) sin²ωt is never negative and reaches v_m²/R = 2 V²/R = ${fmt(lvl.pPeak)} W twice per cycle, so its average is half of that. A resistor takes power in both half-cycles.`,
    ];
  }
  return [
    `v_m = √2 × ${lvl.v} = ${fmt(peakFromRms(lvl.v))} V, so v = v_m sin ${lvl.phase}° = ${fmt(lvl.vNow)} V.`,
    'For a resistor the current is in phase with the voltage: both reach their peaks and cross zero together, so a phasor diagram shows one arrow.',
  ];
}
