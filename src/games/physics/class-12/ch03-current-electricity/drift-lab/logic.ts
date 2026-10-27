// Pure rules of the Drift Lab: no DOM, no canvas.
// Current in amperes, area in mm², length in metres, speeds in mm/s unless named.
import { pick } from '@core/quiz';

export const E_CHARGE = 1.6e-19;
export const N_COPPER = 8.5e28; // free electrons per m³ in copper (the textbook's value)
export const C_LIGHT = 3e8;

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

/** Current from the charge counted through a cross-section: I = N e / t, with N given in units of 10¹⁸ electrons. */
export const currentFromCount = (n18: number, t: number) => (n18 * 1e18 * E_CHARGE) / t;
/** Drift speed in mm/s from I = n e A v_d, with A in mm². */
export const driftSpeedMmS = (i: number, aMm2: number) => ((i / (N_COPPER * E_CHARGE * aMm2 * 1e-6)) * 1000);
/** Time in hours for an electron to drift a length L (m) at v_d (mm/s). */
export const driftHours = (lenM: number, vdMmS: number) => lenM / (vdMmS / 1000) / 3600;
/** Time in ns for the electric field (a signal at the speed of light) to cross a length L. */
export const signalNs = (lenM: number) => (lenM / C_LIGHT) * 1e9;
/** Drift speed in mm/s from the mobility µ (in 10⁻³ m²/(V s)) and the field E = V/L. */
export const driftFromMobility = (muMilli: number, v: number, lenM: number) => muMilli * 1e-3 * (v / lenM) * 1000;
/** Current in amperes from the drift speed (mm/s) and area (mm²). */
export const currentFromDrift = (vdMmS: number, aMm2: number) => N_COPPER * E_CHARGE * aMm2 * 1e-6 * (vdMmS / 1000);

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelCount {
  kind: 'count';
  story: string;
  n18: number;
  t: number;
  /** The electrons stream to the right if true. */
  electronsRight: boolean;
  i: number;
  freeTests: number;
}
export interface LevelDrift {
  kind: 'drift';
  story: string;
  i: number;
  aMm2: number;
  lenM: number;
  vd: number;
  hours: number;
  freeTests: number;
}
export interface LevelScale {
  kind: 'scale';
  story: string;
  i: number;
  a1: number;
  a2: number;
  lenM: number;
  vd1: number;
  vd2: number;
  ns: number;
  freeTests: number;
}
export interface LevelMobility {
  kind: 'mobility';
  story: string;
  muMilli: number;
  v: number;
  lenM: number;
  aMm2: number;
  field: number;
  vd: number;
  i: number;
  freeTests: number;
}
export type Level = LevelCount | LevelDrift | LevelScale | LevelMobility;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const n18 = pick([1.25, 2.5, 3.75, 5, 6.25, 7.5], random);
    const t = pick([2, 4, 5, 10], random);
    return {
      kind: 'count',
      story: 'A counter sits across a metal wire and tallies the electrons that pass through it. Open the gate, read the count and the time, and find the current. Then say which way the conventional current flows.',
      n18,
      t,
      electronsRight: random() < 0.5,
      i: currentFromCount(n18, t),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const i = pick([1.5, 3, 5], random);
    const aMm2 = pick([1, 2, 4], random);
    const lenM = pick([1.5, 3, 6], random);
    const vd = driftSpeedMmS(i, aMm2);
    return {
      kind: 'drift',
      story: 'A copper wire carries a steady current. The electrons are not racing along it, they are creeping. Find the drift speed, and how long one electron takes to drift from one end of the wire to the other.',
      i,
      aMm2,
      lenM,
      vd,
      hours: driftHours(lenM, vd),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const i = pick([2, 3, 4], random);
    const a1 = pick([2, 4], random);
    const a2 = pick([1, 8, 0.5], random);
    const lenM = pick([3, 15, 30], random);
    return {
      kind: 'scale',
      story: 'The same copper wire carries the same current, but part of it is swapped for a wire of a different cross-section. Find the new drift speed there. Then find how long the electric signal needs to cross the length of the circuit, and compare.',
      i,
      a1,
      a2,
      lenM,
      vd1: driftSpeedMmS(i, a1),
      vd2: driftSpeedMmS(i, a2),
      ns: signalNs(lenM),
      freeTests: 1,
    };
  }
  const muMilli = pick([2, 4, 5], random);
  const v = pick([0.01, 0.02, 0.05], random);
  const lenM = pick([1, 2, 4], random);
  const aMm2 = pick([0.5, 1, 2], random);
  const vd = driftFromMobility(muMilli, v, lenM);
  return {
    kind: 'mobility',
    story: 'A voltage across a copper wire sets up a field inside it, and the electrons drift in proportion to that field. Use the mobility to find the drift speed, then the current that this drift carries.',
    muMilli,
    v,
    lenM,
    aMm2,
    field: v / lenM,
    vd,
    i: currentFromDrift(vd, aMm2),
    freeTests: 1,
  };
}

export function judgeCount(lvl: LevelCount, i: number, conventionalRight: boolean): { ok: boolean; iOk: boolean; dirOk: boolean } {
  const iOk = within(i, lvl.i, 0.03);
  const dirOk = conventionalRight === !lvl.electronsRight;
  return { ok: iOk && dirOk, iOk, dirOk };
}
export function judgeDrift(lvl: LevelDrift, vd: number, hours: number): { ok: boolean; vdOk: boolean; hoursOk: boolean } {
  const vdOk = within(vd, lvl.vd, 0.03);
  const hoursOk = within(hours, lvl.hours, 0.03);
  return { ok: vdOk && hoursOk, vdOk, hoursOk };
}
export function judgeScale(lvl: LevelScale, vd2: number, ns: number): { ok: boolean; vdOk: boolean; nsOk: boolean } {
  const vdOk = within(vd2, lvl.vd2, 0.03);
  const nsOk = within(ns, lvl.ns, 0.03);
  return { ok: vdOk && nsOk, vdOk, nsOk };
}
export function judgeMobility(lvl: LevelMobility, vd: number, i: number): { ok: boolean; vdOk: boolean; iOk: boolean } {
  const vdOk = within(vd, lvl.vd, 0.03);
  const iOk = within(i, lvl.i, 0.03);
  return { ok: vdOk && iOk, vdOk, iOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'count') {
    return [
      `The charge through the gate is N e = ${lvl.n18} × 10¹⁸ × 1.6 × 10⁻¹⁹ C = ${fmt(lvl.n18 * 1e18 * E_CHARGE)} C in ${lvl.t} s, so I = Q/t = ${fmt(lvl.i)} A.`,
      `Electrons carry negative charge, so they stream ${lvl.electronsRight ? 'right' : 'left'}. By convention the current is the flow of positive charge, which is the opposite way: ${lvl.electronsRight ? 'left' : 'right'}.`,
    ];
  }
  if (lvl.kind === 'drift') {
    return [
      `I = n e A v_d, so v_d = I/(n e A) = ${lvl.i} / (8.5 × 10²⁸ × 1.6 × 10⁻¹⁹ × ${fmt(lvl.aMm2 * 1e-6)}) = ${fmt(lvl.vd / 1000)} m/s = ${fmt(lvl.vd)} mm/s.`,
      `Time to drift ${lvl.lenM} m: t = L/v_d = ${lvl.lenM} / ${fmt(lvl.vd / 1000)} s = ${fmt(lvl.hours * 3600)} s, about ${fmt(lvl.hours)} hours.`,
      'The drift is slow because there are so many free electrons: a huge number move a tiny distance each to carry a large current.',
    ];
  }
  if (lvl.kind === 'scale') {
    return [
      `For a fixed current, v_d = I/(n e A) is inversely proportional to A. The area changes from ${lvl.a1} mm² to ${lvl.a2} mm², so v_d goes from ${fmt(lvl.vd1)} mm/s to ${fmt(lvl.vd2)} mm/s.`,
      `The electric field that starts the drift everywhere travels at the speed of light: t = L/c = ${lvl.lenM} / (3 × 10⁸) = ${fmt(lvl.ns)} ns.`,
      'That is why a lamp lights at once when the switch is closed: every electron in the circuit starts to drift together, long before any one electron has gone far.',
    ];
  }
  return [
    `The field in the wire is E = V/L = ${lvl.v} / ${lvl.lenM} = ${fmt(lvl.field)} V/m, and v_d = μE = ${lvl.muMilli} × 10⁻³ × ${fmt(lvl.field)} = ${fmt(lvl.vd / 1000)} m/s = ${fmt(lvl.vd)} mm/s.`,
    `The current this drift carries is I = n e A v_d = 8.5 × 10²⁸ × 1.6 × 10⁻¹⁹ × ${fmt(lvl.aMm2 * 1e-6)} × ${fmt(lvl.vd / 1000)} = ${fmt(lvl.i)} A.`,
    'Mobility μ = v_d/E is the drift speed per unit field. More field, or a more mobile material, means more current.',
  ];
}
