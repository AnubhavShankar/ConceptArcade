// Pure rules of the Resonance Lab: no DOM, no canvas.
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

/** Natural angular frequency ω₀ = 1/√(LC), with L in henry and C in µF. */
export const omega0 = (lHenry: number, cMicroF: number) => 1 / Math.sqrt(lHenry * cMicroF * 1e-6);
export const f0 = (lHenry: number, cMicroF: number) => omega0(lHenry, cMicroF) / (2 * Math.PI);
/** Quality factor Q = ω₀L/R = (1/R)√(L/C). */
export const qFactor = (lHenry: number, cMicroF: number, r: number) => (omega0(lHenry, cMicroF) * lHenry) / r;
/** The capacitance in µF that resonates with L (henry) at frequency f (Hz). */
export const tuneMicroF = (lHenry: number, hz: number) => (1 / ((2 * Math.PI * hz) ** 2 * lHenry)) * 1e6;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelNatural {
  kind: 'natural';
  story: string;
  cMicroF: number;
  lMilliH: number;
  omega: number;
  hz: number;
  freeTests: number;
}
export interface LevelAt {
  kind: 'at';
  story: string;
  r: number;
  l: number;
  cMicroF: number;
  v: number;
  z: number;
  i: number;
  p: number;
  freeTests: number;
}
export interface LevelVolts {
  kind: 'volts';
  story: string;
  r: number;
  l: number;
  cMicroF: number;
  v: number;
  i: number;
  vl: number;
  vr: number;
  freeTests: number;
}
export interface LevelQ {
  kind: 'q';
  story: string;
  r: number;
  l: number;
  cMicroF: number;
  v: number;
  q: number;
  vc: number;
  freeTests: number;
}
export interface LevelTune {
  kind: 'tune';
  story: string;
  l: number;
  hz: number;
  cMicroF: number;
  newHz: number;
  freeTests: number;
}
export type Level = LevelNatural | LevelAt | LevelVolts | LevelQ | LevelTune;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const cMicroF = pick([10, 20, 30, 50], random);
    const lMilliH = pick([27, 50, 100, 250], random);
    const l = lMilliH / 1000;
    return {
      kind: 'natural',
      story: 'A charged capacitor is connected across an inductor. The charge sloshes back and forth between them. Find the angular frequency of these free oscillations, and the frequency in hertz.',
      cMicroF,
      lMilliH,
      omega: omega0(l, cMicroF),
      hz: f0(l, cMicroF),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const r = pick([20, 40, 50], random);
    const l = pick([0.5, 1.5, 5], random);
    const cMicroF = pick([35, 50, 80], random);
    const v = pick([200, 230], random);
    return {
      kind: 'at',
      story: 'A series LCR circuit is connected to a variable-frequency source, and the frequency is set equal to the natural frequency of the circuit. Find the impedance, the rms current, and the average power transferred to the circuit.',
      r,
      l,
      cMicroF,
      v,
      z: r,
      i: v / r,
      p: (v * v) / r,
      freeTests: 1,
    };
  }
  if (level === 3) {
    const r = pick([20, 40, 50], random);
    const l = pick([0.5, 1.5, 5], random);
    const cMicroF = pick([35, 50, 80], random);
    const v = pick([200, 230], random);
    const i = v / r;
    return {
      kind: 'volts',
      story: 'The same circuit is driven at resonance. Find the rms potential drop across the inductor, and across the inductor and capacitor together. The resistor takes the whole source voltage; what do the other two do?',
      r,
      l,
      cMicroF,
      v,
      i,
      vl: i * omega0(l, cMicroF) * l,
      vr: v,
      freeTests: 1,
    };
  }
  if (level === 4) {
    const r = pick([5, 10, 20], random);
    const l = pick([0.1, 0.5, 1], random);
    const cMicroF = pick([10, 20, 50], random);
    const v = pick([10, 50, 100], random);
    const q = qFactor(l, cMicroF, r);
    return {
      kind: 'q',
      story: 'The quality factor Q of a series circuit tells how sharp its resonance is: the larger it is, the more the voltage across the capacitor exceeds the source voltage at resonance. Find Q, and the rms voltage across the capacitor at resonance.',
      r,
      l,
      cMicroF,
      v,
      q,
      vc: q * v,
      freeTests: 1,
    };
  }
  const l = pick([0.05, 0.1, 0.25], random);
  const hz = pick([500, 1000, 2000], random);
  return {
    kind: 'tune',
    story: 'A radio-type circuit is tuned by choosing the capacitance. Find the capacitance that makes a coil of the stated inductance resonate at the stated frequency. Then a piece of metal doubles the inductance of the coil: find the new resonant frequency.',
    l,
    hz,
    cMicroF: tuneMicroF(l, hz),
    newHz: hz / Math.SQRT2,
    freeTests: 1,
  };
}

export function judgeNatural(lvl: LevelNatural, w: number, hz: number): { ok: boolean; wOk: boolean; fOk: boolean } {
  const wOk = within(w, lvl.omega, 0.03);
  const fOk = within(hz, lvl.hz, 0.03);
  return { ok: wOk && fOk, wOk, fOk };
}
export function judgeAt(lvl: LevelAt, z: number, i: number, p: number): { ok: boolean; zOk: boolean; iOk: boolean; pOk: boolean } {
  const zOk = within(z, lvl.z, 0.03);
  const iOk = within(i, lvl.i, 0.03);
  const pOk = within(p, lvl.p, 0.03);
  return { ok: zOk && iOk && pOk, zOk, iOk, pOk };
}
export function judgeVolts(lvl: LevelVolts, vl: number, vlc: number): { ok: boolean; lOk: boolean; cOk: boolean } {
  const lOk = within(vl, lvl.vl, 0.03);
  const cOk = Math.abs(vlc) < 1e-9;
  return { ok: lOk && cOk, lOk, cOk };
}
export function judgeQ(lvl: LevelQ, q: number, vc: number): { ok: boolean; qOk: boolean; vOk: boolean } {
  const qOk = within(q, lvl.q, 0.03);
  const vOk = within(vc, lvl.vc, 0.03);
  return { ok: qOk && vOk, qOk, vOk };
}
export function judgeTune(lvl: LevelTune, c: number, hz: number): { ok: boolean; cOk: boolean; fOk: boolean } {
  const cOk = within(c, lvl.cMicroF, 0.03);
  const fOk = within(hz, lvl.newHz, 0.03);
  return { ok: cOk && fOk, cOk, fOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'natural') {
    return [`ω₀ = 1/√(LC) = 1/√(${lvl.lMilliH * 1e-3} × ${lvl.cMicroF * 1e-6}) = ${fmt(lvl.omega)} rad/s.`, `The frequency is f₀ = ω₀/2π = ${fmt(lvl.hz)} Hz. This is the natural frequency of the circuit; it does not depend on the resistance.`];
  }
  if (lvl.kind === 'at') {
    return [
      `At resonance X_L = X_C, so the reactances cancel and Z = R = ${lvl.r} Ω, its smallest value.`,
      `I_rms = V/Z = ${lvl.v} / ${lvl.r} = ${fmt(lvl.i)} A and P = I²R = V²/R = ${fmt(lvl.p)} W. The power factor is 1 at resonance.`,
    ];
  }
  if (lvl.kind === 'volts') {
    return [
      `At resonance I = V/R = ${fmt(lvl.i)} A, and ω₀ = ${fmt(omega0(lvl.l, lvl.cMicroF))} rad/s, so V_L = I ω₀L = ${fmt(lvl.vl)} V, which can be much bigger than the source voltage.`,
      `V_C is equal in size and opposite in phase to V_L, so the voltage across the LC combination is zero, and the resistor has the whole source voltage ${lvl.v} V.`,
    ];
  }
  if (lvl.kind === 'q') {
    return [`Q = ω₀L/R = ${fmt(omega0(lvl.l, lvl.cMicroF) * lvl.l)} / ${lvl.r} = ${fmt(lvl.q)}.`, `At resonance V_C = I X_C = Q V = ${fmt(lvl.q)} × ${lvl.v} = ${fmt(lvl.vc)} V: a high-Q circuit magnifies the source voltage across the capacitor.`];
  }
  return [
    `Resonance needs ω₀² = 1/LC, so C = 1/(4π²f²L) = ${fmt(lvl.cMicroF)} µF.`,
    `If L doubles, f₀ = 1/(2π√(LC)) falls by a factor √2: ${lvl.hz} / 1.414 = ${fmt(lvl.newHz)} Hz. A small change of resonant frequency is how a metal detector notices metal.`,
  ];
}
