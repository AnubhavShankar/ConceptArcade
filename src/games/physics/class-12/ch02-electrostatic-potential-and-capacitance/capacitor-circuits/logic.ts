// Pure rules of the Circuit Builder: no DOM, no canvas.
// Capacitance in pF, charge in nC, potential difference in volts, energy in nJ or µJ as named.
import { pick, shuffle } from '@core/quiz';

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

export const seriesC = (cs: number[]) => 1 / cs.reduce((s, c) => s + 1 / c, 0);
export const parallelC = (cs: number[]) => cs.reduce((s, c) => s + c, 0);
/** In series every capacitor carries the same charge Q = C_eq V, so the voltage across capacitor i is Q / C_i. */
export const seriesVoltages = (cs: number[], v: number) => cs.map((c) => (seriesC(cs) * v) / c);
/** In parallel every capacitor has the full voltage, so the charge on capacitor i is C_i V (nC for pF and volts). */
export const parallelCharges = (cs: number[], v: number) => cs.map((c) => (c * v) / 1000);
/** Energy stored, ½CV², in nJ (C in pF, V in volts). */
export const energyNj = (cPf: number, v: number) => (0.5 * cPf * v * v) / 1000;
/** Connecting a charged capacitor (C₁ at V) to an uncharged one (C₂): the common voltage, and the energy lost in µJ. */
export const sharedVoltage = (c1: number, c2: number, v: number) => (c1 * v) / (c1 + c2);
export const energyLostMicro = (c1: number, c2: number, v: number) => ((0.5 * c1 * v * v * c2) / (c1 + c2)) * 1e-6;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelSeries {
  kind: 'series';
  story: string;
  cs: number[];
  v: number;
  /** Which capacitor to report the voltage of. */
  target: number;
  ceq: number;
  vTarget: number;
  freeTests: number;
}
export interface LevelParallel {
  kind: 'parallel';
  story: string;
  cs: number[];
  v: number;
  target: number;
  ceq: number;
  qTarget: number;
  freeTests: number;
}
export type Topology = 'c1-series-with-pair' | 'c1-parallel-with-chain';
export interface LevelMixed {
  kind: 'mixed';
  story: string;
  topology: Topology;
  c1: number;
  c2: number;
  c3: number;
  v: number;
  ceq: number;
  q: number;
  freeTests: number;
}
export type Double = 'x2' | 'x4' | 'x8';
export interface LevelEnergy {
  kind: 'energy';
  story: string;
  c: number;
  v: number;
  u: number; // nJ
  freeTests: number;
}
export type Where = 'heat' | 'wires' | 'vanished';
export interface LevelShare {
  kind: 'share';
  story: string;
  c1: number;
  c2: number;
  v: number;
  v2: number;
  lost: number; // µJ
  freeTests: number;
}
export type Level = LevelSeries | LevelParallel | LevelMixed | LevelEnergy | LevelShare;

export function mixedC(topology: Topology, c1: number, c2: number, c3: number): number {
  return topology === 'c1-series-with-pair' ? seriesC([c1, parallelC([c2, c3])]) : parallelC([c1, seriesC([c2, c3])]);
}

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const cs = [pick([3, 6, 9, 12], random), pick([3, 6, 9, 12], random), pick([3, 6, 9, 12], random)];
    const v = pick([60, 120, 180], random);
    const target = Math.floor(random() * 3);
    return {
      kind: 'series',
      story: 'Three capacitors are joined end to end in a chain, and a battery is connected across the whole chain. The same charge sits on every capacitor, and the battery voltage is shared between them. Find the capacitance of the chain and the voltage across the capacitor marked with the ring.',
      cs,
      v,
      target,
      ceq: seriesC(cs),
      vTarget: seriesVoltages(cs, v)[target],
      freeTests: 1,
    };
  }
  if (level === 2) {
    const cs = shuffle([2, 3, 4, 5, 6], random).slice(0, 3);
    const v = pick([50, 100, 120], random);
    const target = Math.floor(random() * 3);
    return {
      kind: 'parallel',
      story: 'Three capacitors are connected side by side across one battery, so each has the full battery voltage. Find the capacitance of the combination and the charge on the capacitor marked with the ring.',
      cs,
      v,
      target,
      ceq: parallelC(cs),
      qTarget: parallelCharges(cs, v)[target],
      freeTests: 1,
    };
  }
  if (level === 3) {
    const topology: Topology = random() < 0.5 ? 'c1-series-with-pair' : 'c1-parallel-with-chain';
    const [c1, c2, c3] = [pick([2, 3, 4, 6, 12], random), pick([2, 3, 4, 6, 12], random), pick([2, 3, 4, 6, 12], random)];
    const v = pick([60, 120], random);
    const ceq = mixedC(topology, c1, c2, c3);
    return {
      kind: 'mixed',
      story: topology === 'c1-series-with-pair' ? 'A capacitor C₁ is in series with a pair, C₂ and C₃, that are in parallel with each other. Find the capacitance of the whole network and the total charge the battery supplies.' : 'A capacitor C₁ is in parallel with a chain, C₂ and C₃, that are in series with each other. Find the capacitance of the whole network and the total charge the battery supplies.',
      topology,
      c1,
      c2,
      c3,
      v,
      ceq,
      q: (ceq * v) / 1000,
      freeTests: 1,
    };
  }
  if (level === 4) {
    const c = pick([10, 12, 20, 50, 100, 600], random);
    const v = pick([12, 50, 100, 200], random);
    return {
      kind: 'energy',
      story: 'A capacitor stores energy in the electric field between its plates, as much as the work done in charging it. Find the energy stored. Then say what happens to the energy if the voltage across the capacitor is doubled.',
      c,
      v,
      u: energyNj(c, v),
      freeTests: 1,
    };
  }
  const c1 = pick([300, 600, 900], random);
  const c2 = pick([300, 600, 900], random);
  const v = pick([100, 200, 300], random);
  return {
    kind: 'share',
    story: 'A charged capacitor is disconnected from its battery and connected across a second capacitor that starts uncharged. The charge spreads between them until their voltages are equal. Find the common voltage and the energy that has been lost, then say where it went.',
    c1,
    c2,
    v,
    v2: sharedVoltage(c1, c2, v),
    lost: energyLostMicro(c1, c2, v),
    freeTests: 1,
  };
}

export function judgeSeries(lvl: LevelSeries, ceq: number, v: number): { ok: boolean; ceqOk: boolean; vOk: boolean } {
  const ceqOk = within(ceq, lvl.ceq, 0.03);
  const vOk = within(v, lvl.vTarget, 0.03);
  return { ok: ceqOk && vOk, ceqOk, vOk };
}
export function judgeParallel(lvl: LevelParallel, ceq: number, q: number): { ok: boolean; ceqOk: boolean; qOk: boolean } {
  const ceqOk = within(ceq, lvl.ceq, 0.03);
  const qOk = within(q, lvl.qTarget, 0.03);
  return { ok: ceqOk && qOk, ceqOk, qOk };
}
export function judgeMixed(lvl: LevelMixed, ceq: number, q: number): { ok: boolean; ceqOk: boolean; qOk: boolean } {
  const ceqOk = within(ceq, lvl.ceq, 0.03);
  const qOk = within(q, lvl.q, 0.03);
  return { ok: ceqOk && qOk, ceqOk, qOk };
}
export function judgeEnergy(lvl: LevelEnergy, u: number, dbl: Double): { ok: boolean; uOk: boolean; dblOk: boolean } {
  const uOk = within(u, lvl.u, 0.03);
  const dblOk = dbl === 'x4';
  return { ok: uOk && dblOk, uOk, dblOk };
}
export function judgeShare(lvl: LevelShare, v: number, lost: number, where: Where): { ok: boolean; vOk: boolean; lostOk: boolean; whereOk: boolean } {
  const vOk = within(v, lvl.v2, 0.03);
  const lostOk = within(lost, lvl.lost, 0.03);
  const whereOk = where === 'heat';
  return { ok: vOk && lostOk && whereOk, vOk, lostOk, whereOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'series') {
    return [
      `In series 1/C = 1/C₁ + 1/C₂ + 1/C₃ = ${lvl.cs.map((c) => `1/${c}`).join(' + ')}, so C = ${fmt(lvl.ceq)} pF (smaller than the smallest).`,
      `The charge is the same on each: Q = CV = ${fmt(lvl.ceq)} pF × ${lvl.v} V = ${fmt(lvl.ceq * lvl.v)} pC.`,
      `The voltage across capacitor ${lvl.target + 1} (${lvl.cs[lvl.target]} pF) is Q/C = ${fmt(lvl.vTarget)} V. The smaller capacitor takes the larger share of the voltage.`,
    ];
  }
  if (lvl.kind === 'parallel') {
    return [
      `In parallel the capacitances add: C = ${lvl.cs.join(' + ')} = ${fmt(lvl.ceq)} pF (bigger than any one).`,
      `Each capacitor has the full ${lvl.v} V, so capacitor ${lvl.target + 1} (${lvl.cs[lvl.target]} pF) holds Q = CV = ${lvl.cs[lvl.target]} pF × ${lvl.v} V = ${fmt(lvl.qTarget)} nC.`,
      'The larger capacitor takes the larger charge.',
    ];
  }
  if (lvl.kind === 'mixed') {
    return [
      lvl.topology === 'c1-series-with-pair' ? `First combine the parallel pair: C₂₃ = C₂ + C₃ = ${lvl.c2 + lvl.c3} pF. Then it is in series with C₁: 1/C = 1/${lvl.c1} + 1/${lvl.c2 + lvl.c3}.` : `First combine the series chain: C₂₃ = C₂C₃/(C₂ + C₃) = ${fmt(seriesC([lvl.c2, lvl.c3]))} pF. Then it is in parallel with C₁: C = ${lvl.c1} + ${fmt(seriesC([lvl.c2, lvl.c3]))}.`,
      `So C = ${fmt(lvl.ceq)} pF, and the total charge is Q = CV = ${fmt(lvl.ceq)} pF × ${lvl.v} V = ${fmt(lvl.q)} nC.`,
      'Work from the inside of the network outwards, replacing each series or parallel group by its equivalent.',
    ];
  }
  if (lvl.kind === 'energy') {
    return [
      `U = ½CV² = ½ × ${lvl.c} pF × (${lvl.v} V)² = ${fmt(lvl.u)} nJ.`,
      'The same energy is Q²/2C and ½QV. It is stored in the electric field between the plates.',
      'U ∝ V², so doubling the voltage multiplies the energy by 4.',
    ];
  }
  return [
    `The charge Q = C₁V = ${lvl.c1} pF × ${lvl.v} V is conserved, and it spreads over C₁ + C₂, so the common voltage is V′ = C₁V/(C₁ + C₂) = ${fmt(lvl.v2)} V.`,
    `Energy before: ½C₁V². After: ½(C₁ + C₂)V′². The difference is ${fmt(lvl.lost)} µJ lost, which is ½ C₁C₂V²/(C₁ + C₂).`,
    'The energy goes as heat and electromagnetic radiation in the connecting wires and the spark, because charge flows through resistance. Charge is conserved; energy is not stored but dissipated.',
  ];
}
