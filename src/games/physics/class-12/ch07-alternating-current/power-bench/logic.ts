// Pure rules of the Power Bench: no DOM, no canvas.
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
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Average power V_rms I_rms cos φ. */
export const avgPower = (v: number, i: number, phiDeg: number) => v * i * Math.cos(rad(phiDeg));
export const wattless = (i: number, phiDeg: number) => i * Math.sin(rad(phiDeg));
/** Parallel capacitance (µF) that cancels the wattless current of a load R + jX_L at frequency hz: C = X_L/(ω Z²). */
export const correctingMicroF = (r: number, xl: number, hz: number) => ((xl / (2 * Math.PI * hz * (r * r + xl * xl))) * 1e6);

export type Kind = 'step-up' | 'step-down';

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelPhase {
  kind: 'phase';
  story: string;
  v: number;
  i: number;
  phi: number;
  p: number;
  iq: number;
  freeTests: number;
}
export interface LevelCircuit {
  kind: 'circuit';
  story: string;
  r: number;
  xl: number;
  xc: number;
  vPeak: number;
  z: number;
  iRms: number;
  p: number;
  pf: number;
  freeTests: number;
}
export interface LevelCorrect {
  kind: 'correct';
  story: string;
  r: number;
  xl: number;
  v: number;
  hz: number;
  cMicroF: number;
  iNew: number;
  iOld: number;
  freeTests: number;
}
export interface LevelTransformer {
  kind: 'transformer';
  story: string;
  np: number;
  ns: number;
  vp: number;
  ip: number;
  vs: number;
  is: number;
  type: Kind;
  freeTests: number;
}
export interface LevelLoss {
  kind: 'loss';
  story: string;
  pKw: number;
  v1: number;
  k: number;
  r: number;
  loss1: number;
  loss2: number;
  freeTests: number;
}
export type Level = LevelPhase | LevelCircuit | LevelCorrect | LevelTransformer | LevelLoss;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const v = pick([110, 220, 230], random);
    const i = pick([2, 5, 10], random);
    const phi = pick([30, 37, 45, 53, 60], random);
    return {
      kind: 'phase',
      story: 'A circuit draws a current that lags behind the supply voltage by a phase angle. Find the average power used, and the wattless component of the current, the part that is 90° out of phase with the voltage and takes no power.',
      v,
      i,
      phi,
      p: avgPower(v, i, phi),
      iq: wattless(i, phi),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const r = pick([3, 6], random);
    const [xl, xc] = r === 3 ? pick([[8, 4], [10, 6]] as [number, number][], random) : pick([[16, 8], [12, 4]] as [number, number][], random);
    const vPeak = pick([283, 311], random);
    const z = Math.hypot(r, xl - xc);
    const iRms = vPeak / Math.SQRT2 / z;
    return {
      kind: 'circuit',
      story: 'A sinusoidal source of known peak voltage drives a series LCR circuit. Find the power dissipated in the circuit and the power factor. Only the resistor dissipates power.',
      r,
      xl,
      xc,
      vPeak,
      z,
      iRms,
      p: iRms * iRms * r,
      pf: r / z,
      freeTests: 1,
    };
  }
  if (level === 3) {
    const r = pick([20, 30, 40], random);
    const xl = pick([30, 40, 60], random);
    const v = pick([110, 220], random);
    const hz = pick([50, 60], random);
    return {
      kind: 'correct',
      story: 'An inductive load has a low power factor, so the supply must deliver a larger current than the load needs. A capacitor of the right size connected in parallel with the load supplies the wattless part of the current, and brings the power factor to 1. Find that capacitance, and the current drawn from the supply after the correction.',
      r,
      xl,
      v,
      hz,
      cMicroF: correctingMicroF(r, xl, hz),
      iOld: v / Math.hypot(r, xl),
      iNew: (v * r) / (r * r + xl * xl),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const np = pick([100, 200, 500], random);
    const ratio = pick([0.1, 0.5, 2, 10], random);
    const ns = Math.round(np * ratio);
    const vp = pick([110, 220, 440], random);
    const ip = pick([1, 2, 5], random);
    const vs = (vp * ns) / np;
    return {
      kind: 'transformer',
      story: 'An ideal transformer has a primary and a secondary coil on the same iron core. The voltage across each coil is in proportion to its turns, and no power is lost. Find the secondary voltage and the secondary current, and say whether it steps the voltage up or down.',
      np,
      ns,
      vp,
      ip,
      vs,
      is: (vp * ip) / vs,
      type: ns > np ? 'step-up' : 'step-down',
      freeTests: 1,
    };
  }
  const pKw = pick([5, 10, 20], random);
  const v1 = pick([220, 400], random);
  const k = pick([10, 20, 50], random);
  const r = pick([0.1, 0.2, 0.5], random);
  const i1 = (pKw * 1000) / v1;
  const i2 = i1 / k;
  return {
    kind: 'loss',
    story: 'Electric power is sent along a line of known resistance. The line current is the power divided by the voltage, and the heating of the line is I²R. Find the power lost in the line if the power is sent at the low voltage, and the power lost if a transformer steps the voltage up first.',
    pKw,
    v1,
    k,
    r,
    loss1: i1 * i1 * r,
    loss2: i2 * i2 * r,
    freeTests: 1,
  };
}

export function judgePhase(lvl: LevelPhase, p: number, iq: number): { ok: boolean; pOk: boolean; qOk: boolean } {
  const pOk = within(p, lvl.p, 0.03);
  const qOk = within(iq, lvl.iq, 0.03);
  return { ok: pOk && qOk, pOk, qOk };
}
export function judgeCircuit(lvl: LevelCircuit, p: number, pf: number): { ok: boolean; pOk: boolean; fOk: boolean } {
  const pOk = within(p, lvl.p, 0.03);
  const fOk = within(pf, lvl.pf, 0.03);
  return { ok: pOk && fOk, pOk, fOk };
}
export function judgeCorrect(lvl: LevelCorrect, c: number, iNew: number): { ok: boolean; cOk: boolean; iOk: boolean } {
  const cOk = within(c, lvl.cMicroF, 0.03);
  const iOk = within(iNew, lvl.iNew, 0.03);
  return { ok: cOk && iOk, cOk, iOk };
}
export function judgeTransformer(lvl: LevelTransformer, vs: number, is: number, type: Kind): { ok: boolean; vOk: boolean; iOk: boolean; tOk: boolean } {
  const vOk = within(vs, lvl.vs, 0.03);
  const iOk = within(is, lvl.is, 0.03);
  const tOk = type === lvl.type;
  return { ok: vOk && iOk && tOk, vOk, iOk, tOk };
}
export function judgeLoss(lvl: LevelLoss, a: number, b: number): { ok: boolean; aOk: boolean; bOk: boolean } {
  const aOk = within(a, lvl.loss1, 0.03);
  const bOk = within(b, lvl.loss2, 0.03);
  return { ok: aOk && bOk, aOk, bOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'phase') {
    return [`P = V I cos φ = ${lvl.v} × ${lvl.i} × cos ${lvl.phi}° = ${fmt(lvl.p)} W.`, `Resolve the current into I cos φ along the voltage (the power component) and I sin φ at right angles to it. The wattless component is ${lvl.i} × sin ${lvl.phi}° = ${fmt(lvl.iq)} A: it flows, but takes no power.`];
  }
  if (lvl.kind === 'circuit') {
    return [`Z = √(R² + (X_L − X_C)²) = ${fmt(lvl.z)} Ω, and I_rms = (${lvl.vPeak}/√2)/Z = ${fmt(lvl.iRms)} A.`, `P = I²R = ${fmt(lvl.p)} W, and the power factor is cos φ = R/Z = ${fmt(lvl.pf)}.`];
  }
  if (lvl.kind === 'correct') {
    return [
      `The load draws I = V/Z = ${fmt(lvl.iOld)} A, lagging by φ, with a wattless component I sin φ = V X_L/Z². A capacitor in parallel draws a current V/X_C = ωCV that leads by 90°, so it cancels the wattless part when C = X_L/(ωZ²) = ${fmt(lvl.cMicroF)} µF.`,
      `What is left is the power component I cos φ = V R/Z² = ${fmt(lvl.iNew)} A: the supply now carries less current for the same power, so there is less loss in the transmission lines.`,
    ];
  }
  if (lvl.kind === 'transformer') {
    return [`V_s/V_p = N_s/N_p, so V_s = ${lvl.vp} × ${lvl.ns}/${lvl.np} = ${fmt(lvl.vs)} V: a ${lvl.type} transformer.`, `For an ideal transformer I_p V_p = I_s V_s, so I_s = ${lvl.ip} × ${lvl.vp} / ${fmt(lvl.vs)} = ${fmt(lvl.is)} A. Stepping the voltage up steps the current down.`];
  }
  return [`I = P/V = ${lvl.pKw * 1000} / ${lvl.v1} = ${fmt((lvl.pKw * 1000) / lvl.v1)} A, so the loss is I²R = ${fmt(lvl.loss1)} W.`, `Stepping the voltage up ${lvl.k} times cuts the current ${lvl.k} times and the loss ${lvl.k}² times, to ${fmt(lvl.loss2)} W. That is why power is transmitted at high voltage.`];
}
