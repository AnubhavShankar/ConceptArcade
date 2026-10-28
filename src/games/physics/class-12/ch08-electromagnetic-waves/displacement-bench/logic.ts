// Pure rules of the Displacement Bench: no DOM, no canvas.
import { pick } from '@core/quiz';

export const EPS0 = 8.854e-12;
export const MU0 = 4 * Math.PI * 1e-7;

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

/** Capacitance of circular plates of radius r (cm), separation d (cm), in pF. */
export const plateCapacitancePF = (rCm: number, dCm: number) => ((EPS0 * Math.PI * (rCm / 100) ** 2) / (dCm / 100)) * 1e12;
/** dV/dt in V/s when a current I (A) charges a capacitor C (pF). */
export const dvdt = (i: number, cPF: number) => i / (cPF * 1e-12);
/** Displacement current ε₀ A dE/dt, A in cm², dE/dt in V/(m s). */
export const displacementCurrent = (aCm2: number, dEdt: number) => EPS0 * (aCm2 * 1e-4) * dEdt;
/** Field at distance r (cm) from the axis, inside the plates of radius R (cm), for a displacement current i. */
export const bInsidePicoT = (i: number, rCm: number, bigRCm: number) => ((MU0 * (rCm / 100) * i) / (2 * Math.PI * (bigRCm / 100) ** 2)) * 1e12;

export type Rule = 'holds' | 'fails';

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelCharge {
  kind: 'charge';
  story: string;
  rCm: number;
  dCm: number;
  i: number;
  cPF: number;
  rate: number;
  freeTests: number;
}
export interface LevelDisplacement {
  kind: 'displacement';
  story: string;
  aCm2: number;
  dEdt: number;
  id: number;
  freeTests: number;
}
export interface LevelAc {
  kind: 'ac';
  story: string;
  rCm: number;
  cPF: number;
  v: number;
  omega: number;
  rCmField: number;
  iRmsMicro: number;
  bPico: number;
  freeTests: number;
}
export type Level = LevelCharge | LevelDisplacement | LevelAc;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const rCm = pick([6, 8, 12], random);
    const dCm = pick([2, 5, 10], random);
    const i = pick([0.05, 0.1, 0.15], random);
    const cPF = plateCapacitancePF(rCm, dCm);
    return {
      kind: 'charge',
      story: 'A parallel-plate capacitor with circular plates is being charged by a constant current. Find its capacitance, and how fast the potential difference between the plates is rising.',
      rCm,
      dCm,
      i,
      cPF,
      rate: dvdt(i, cPF),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const aCm2 = pick([100, 200, 450], random);
    const dEdt = pick([1e9, 5e9, 2e10], random);
    return {
      kind: 'displacement',
      story: 'Between the plates of a charging capacitor no charge crosses, yet the electric field is changing. Maxwell saw that a changing electric flux acts like a current, the displacement current. Find the displacement current for a given plate area and rate of change of the field. Then say whether the junction rule holds at a plate once this current is counted.',
      aCm2,
      dEdt,
      id: displacementCurrent(aCm2, dEdt),
      freeTests: 1,
    };
  }
  const rCm = pick([4, 6, 8], random);
  const cPF = pick([50, 100, 200], random);
  const v = pick([110, 230], random);
  const omega = pick([300, 500, 1000], random);
  const rField = rCm / 2;
  const iRms = v * omega * cPF * 1e-12;
  return {
    kind: 'ac',
    story: 'A parallel-plate capacitor with circular plates is connected to an AC supply. The conduction current in the wires is carried across the gap by an equal displacement current, which makes a magnetic field between the plates. Find the rms conduction current, and the amplitude of the magnetic field at a point inside the plates, a given distance from the axis.',
    rCm,
    cPF,
    v,
    omega,
    rCmField: rField,
    iRmsMicro: iRms * 1e6,
    bPico: bInsidePicoT(Math.SQRT2 * iRms, rField, rCm),
    freeTests: 1,
  };
}

export function judgeCharge(lvl: LevelCharge, c: number, rate: number): { ok: boolean; cOk: boolean; rOk: boolean } {
  const cOk = within(c, lvl.cPF, 0.03);
  const rOk = within(rate, lvl.rate, 0.03);
  return { ok: cOk && rOk, cOk, rOk };
}
export function judgeDisplacement(lvl: LevelDisplacement, id: number, rule: Rule): { ok: boolean; iOk: boolean; rOk: boolean } {
  const iOk = within(id, lvl.id, 0.03);
  const rOk = rule === 'holds';
  return { ok: iOk && rOk, iOk, rOk };
}
export function judgeAc(lvl: LevelAc, iMicro: number, bPico: number): { ok: boolean; iOk: boolean; bOk: boolean } {
  const iOk = within(iMicro, lvl.iRmsMicro, 0.03);
  const bOk = within(bPico, lvl.bPico, 0.03);
  return { ok: iOk && bOk, iOk, bOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'charge') {
    return [`C = ε₀A/d = ε₀ π (${lvl.rCm / 100})² / ${lvl.dCm / 100} = ${fmt(lvl.cPF)} pF.`, `I = C dV/dt, so dV/dt = I/C = ${lvl.i} / ${fmt(lvl.cPF * 1e-12)} = ${fmt(lvl.rate)} V/s.`];
  }
  if (lvl.kind === 'displacement') {
    return [`I_d = ε₀ dΦ_E/dt = ε₀ A dE/dt = 8.85 × 10⁻¹² × ${lvl.aCm2 * 1e-4} × ${fmt(lvl.dEdt)} = ${fmt(lvl.id)} A.`, 'Between the plates the displacement current equals the conduction current in the wires, so the total current is continuous and Kirchhoff’s junction rule holds at each plate when the displacement current is included.'];
  }
  return [`I_rms = V ω C = ${lvl.v} × ${lvl.omega} × ${lvl.cPF} × 10⁻¹² = ${fmt(lvl.iRmsMicro)} µA. The displacement current between the plates is equal to this at every instant.`, `Inside the plates, Ampère–Maxwell gives B = μ₀ r I_d/(2πR²), using the peak value √2 I_rms: B = ${fmt(lvl.bPico)} pT at r = ${lvl.rCmField} cm. It is tiny, which is why displacement current is hard to detect with a magnetometer.`];
}
