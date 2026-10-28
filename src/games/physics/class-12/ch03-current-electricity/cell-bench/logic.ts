// Pure rules of the Cell Bench: no DOM, no canvas.
// emf and voltages in volts, resistance in ohms, current in amperes.
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
/** A reading on a meter: five significant figures, so that r = (ε − V)/I can be found from it. */
export const reading = (x: number) => String(Number(x.toPrecision(5)));
const within = (value: number, answer: number, tol: number) => Math.abs(value - answer) / Math.abs(answer) <= tol;

/** Current when a cell (ε, r) drives a resistor R. */
export const loadCurrent = (e: number, r: number, load: number) => e / (load + r);
/** Terminal voltage when the cell delivers current I: V = ε − I r. */
export const terminalV = (e: number, r: number, i: number) => e - i * r;
/** Terminal voltage while the cell is being charged by current I: V = ε + I r. */
export const chargingV = (e: number, r: number, i: number) => e + i * r;
export const seriesAiding = (e1: number, r1: number, e2: number, r2: number) => ({ e: e1 + e2, r: r1 + r2 });
export const seriesOpposing = (e1: number, r1: number, e2: number, r2: number) => ({ e: e1 - e2, r: r1 + r2 });
export const parallelCells = (e1: number, r1: number, e2: number, r2: number) => ({ e: (e1 * r2 + e2 * r1) / (r1 + r2), r: (r1 * r2) / (r1 + r2) });

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelLoad {
  kind: 'load';
  story: string;
  mode: 'current' | 'resistor';
  e: number;
  r: number;
  load: number;
  i: number;
  v: number;
  freeTests: number;
}
export interface LevelMeasure {
  kind: 'measure';
  story: string;
  e: number;
  r: number;
  iMax: number;
  freeTests: number;
}
export type Why = 'limit' | 'raise' | 'reverse';
export interface LevelCharge {
  kind: 'charge';
  story: string;
  e: number;
  r: number;
  supply: number;
  rSeries: number;
  i: number;
  v: number;
  freeTests: number;
}
export interface LevelSeries {
  kind: 'series';
  story: string;
  aiding: boolean;
  e1: number;
  r1: number;
  e2: number;
  r2: number;
  e: number;
  r: number;
  freeTests: number;
}
export interface LevelParallel {
  kind: 'parallel';
  story: string;
  e1: number;
  r1: number;
  e2: number;
  r2: number;
  load: number;
  e: number;
  r: number;
  i: number;
  freeTests: number;
}
export type Level = LevelLoad | LevelMeasure | LevelCharge | LevelSeries | LevelParallel;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    if (random() < 0.5) {
      const e = pick([6, 9, 10, 12], random);
      const r = pick([0.5, 1, 2, 3], random);
      const load = pick([4, 5, 8, 10], random);
      const i = loadCurrent(e, r, load);
      return {
        kind: 'load',
        story: 'A cell with an internal resistance drives current through a resistor. Not all of its emf reaches the resistor. Find the current, and the terminal voltage across the cell.',
        mode: 'current',
        e,
        r,
        load,
        i,
        v: terminalV(e, r, i),
        freeTests: 1,
      };
    }
    const [e, r, i] = pick([[10, 3, 0.5], [12, 2, 1], [9, 1, 0.5], [6, 0.5, 0.4]] as [number, number, number][], random);
    const load = e / i - r;
    return {
      kind: 'load',
      story: 'A cell with an internal resistance is connected to a resistor and the current is measured. Find the resistance of the resistor, and the terminal voltage across the cell.',
      mode: 'resistor',
      e,
      r,
      load,
      i,
      v: terminalV(e, r, i),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const e = pick([6, 9, 12], random);
    const r = pick([0.4, 0.5, 0.8, 1.2, 2], random);
    return {
      kind: 'measure',
      story: 'The internal resistance of this cell is hidden. Connect different loads and read the terminal voltage and the current. Find the internal resistance, and the largest current the cell could ever deliver.',
      e,
      r,
      iMax: e / r,
      freeTests: 1,
    };
  }
  if (level === 3) {
    const [e, r, supply, rSeries] = pick([[8, 0.5, 120, 15.5], [12, 1, 120, 14], [6, 0.5, 24, 2.5], [12, 1, 24, 3]] as [number, number, number, number][], random);
    const i = (supply - e) / (rSeries + r);
    return {
      kind: 'charge',
      story: 'A storage battery is being charged from a dc supply through a series resistor. The current now flows into the positive terminal. Find the charging current, the terminal voltage of the battery while it is being charged, and why the resistor is there.',
      e,
      r,
      supply,
      rSeries,
      i,
      v: chargingV(e, r, i),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const aiding = random() < 0.5;
    let e1 = pick([1.5, 2, 3, 4.5], random);
    let e2 = pick([1.5, 2, 3, 4.5], random);
    if (!aiding) {
      if (e1 === e2) e1 = e2 + 1.5;
      if (e1 < e2) [e1, e2] = [e2, e1];
    }
    const r1 = pick([0.2, 0.5, 1], random);
    const r2 = pick([0.2, 0.5, 1], random);
    const res = aiding ? seriesAiding(e1, r1, e2, r2) : seriesOpposing(e1, r1, e2, r2);
    return {
      kind: 'series',
      story: aiding ? 'Two cells are joined in series, positive to negative, so their emfs help each other. Find the emf and internal resistance of the combination.' : 'Two cells are joined in series, but with the positive terminals together, so their emfs oppose. Find the emf and internal resistance of the combination.',
      aiding,
      e1,
      r1,
      e2,
      r2,
      e: res.e,
      r: res.r,
      freeTests: 1,
    };
  }
  let e1 = pick([2, 3, 4, 6], random);
  let e2 = pick([2, 3, 4, 6], random);
  if (e1 === e2) e2 = e1 + 1;
  const r1 = pick([1, 2, 3], random);
  const r2 = pick([1, 2, 6], random);
  const load = pick([2, 4, 5, 10], random);
  const eq = parallelCells(e1, r1, e2, r2);
  return {
    kind: 'parallel',
    story: 'Two cells with different emfs and internal resistances are connected in parallel, positive to positive, and drive a resistor. Find the equivalent emf of the pair, and the current in the resistor.',
    e1,
    r1,
    e2,
    r2,
    load,
    e: eq.e,
    r: eq.r,
    i: eq.e / (load + eq.r),
    freeTests: 1,
  };
}

export function judgeLoad(lvl: LevelLoad, first: number, v: number): { ok: boolean; firstOk: boolean; vOk: boolean } {
  const firstOk = within(first, lvl.mode === 'current' ? lvl.i : lvl.load, 0.03);
  const vOk = within(v, lvl.v, 0.03);
  return { ok: firstOk && vOk, firstOk, vOk };
}
export function judgeMeasure(lvl: LevelMeasure, r: number, iMax: number): { ok: boolean; rOk: boolean; iOk: boolean } {
  const rOk = within(r, lvl.r, 0.04);
  const iOk = within(iMax, lvl.iMax, 0.04);
  return { ok: rOk && iOk, rOk, iOk };
}
export function judgeCharge(lvl: LevelCharge, i: number, v: number, why: Why): { ok: boolean; iOk: boolean; vOk: boolean; whyOk: boolean } {
  const iOk = within(i, lvl.i, 0.03);
  const vOk = within(v, lvl.v, 0.03);
  const whyOk = why === 'limit';
  return { ok: iOk && vOk && whyOk, iOk, vOk, whyOk };
}
export function judgeSeries(lvl: LevelSeries, e: number, r: number): { ok: boolean; eOk: boolean; rOk: boolean } {
  const eOk = within(e, lvl.e, 0.03);
  const rOk = within(r, lvl.r, 0.03);
  return { ok: eOk && rOk, eOk, rOk };
}
export function judgeParallel(lvl: LevelParallel, e: number, i: number): { ok: boolean; eOk: boolean; iOk: boolean } {
  const eOk = within(e, lvl.e, 0.03);
  const iOk = within(i, lvl.i, 0.03);
  return { ok: eOk && iOk, eOk, iOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'load') {
    if (lvl.mode === 'current') {
      return [
        `The current runs through the resistor and the internal resistance in series: I = ε/(R + r) = ${lvl.e} / (${lvl.load} + ${lvl.r}) = ${fmt(lvl.i)} A.`,
        `The terminal voltage is V = ε − Ir = ${lvl.e} − ${fmt(lvl.i)} × ${lvl.r} = ${fmt(lvl.v)} V. It is also IR = ${fmt(lvl.i * lvl.load)} V, which is less than the emf.`,
      ];
    }
    return [
      `I = ε/(R + r), so R = ε/I − r = ${lvl.e} / ${lvl.i} − ${lvl.r} = ${fmt(lvl.load)} Ω.`,
      `The terminal voltage is V = ε − Ir = ${lvl.e} − ${lvl.i} × ${lvl.r} = ${fmt(lvl.v)} V, which is less than the emf because of the voltage lost inside the cell.`,
    ];
  }
  if (lvl.kind === 'measure') {
    return [
      `The voltage lost inside the cell is ε − V = Ir, so r = (ε − V)/I. Any reading gives r = ${fmt(lvl.r)} Ω.`,
      `The largest current flows when the cell is short-circuited (R = 0): I = ε/r = ${lvl.e} / ${fmt(lvl.r)} = ${fmt(lvl.iMax)} A.`,
    ];
  }
  if (lvl.kind === 'charge') {
    return [
      `The supply drives the current against the battery's emf: I = (V − ε)/(R + r) = (${lvl.supply} − ${lvl.e}) / (${lvl.rSeries} + ${lvl.r}) = ${fmt(lvl.i)} A.`,
      `While charging, the current enters the positive terminal, so the terminal voltage is V = ε + Ir = ${lvl.e} + ${fmt(lvl.i)} × ${lvl.r} = ${fmt(lvl.v)} V, more than the emf.`,
      'The series resistor limits the charging current. Without it the supply would push a very large current through the tiny internal resistance of the battery.',
    ];
  }
  if (lvl.kind === 'series') {
    return lvl.aiding
      ? [`In series the emfs add when they help: ε = ${lvl.e1} + ${lvl.e2} = ${fmt(lvl.e)} V.`, `The internal resistances always add in series: r = ${lvl.r1} + ${lvl.r2} = ${fmt(lvl.r)} Ω.`]
      : [`When the cells oppose, the emfs subtract: ε = ${lvl.e1} − ${lvl.e2} = ${fmt(lvl.e)} V.`, `The internal resistances still add: r = ${lvl.r1} + ${lvl.r2} = ${fmt(lvl.r)} Ω.`];
  }
  return [
    `For two cells in parallel, ε = (ε₁r₂ + ε₂r₁)/(r₁ + r₂) = (${lvl.e1} × ${lvl.r2} + ${lvl.e2} × ${lvl.r1}) / (${lvl.r1} + ${lvl.r2}) = ${fmt(lvl.e)} V, and 1/r = 1/r₁ + 1/r₂, so r = ${fmt(lvl.r)} Ω.`,
    `The pair is one cell (ε, r) driving R: I = ε/(R + r) = ${fmt(lvl.e)} / (${lvl.load} + ${fmt(lvl.r)}) = ${fmt(lvl.i)} A.`,
  ];
}
