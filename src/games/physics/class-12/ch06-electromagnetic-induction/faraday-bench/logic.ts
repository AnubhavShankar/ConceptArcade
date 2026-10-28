// Pure rules of the Faraday Bench: no DOM, no canvas.
// Fluxes in mWb or µWb as named, emfs in µV or mV as named, B in T (G where named).
import { pick } from '@core/quiz';

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
const within = (value: number, answer: number, tol: number) => (answer === 0 ? Math.abs(value) < 1e-9 : Math.abs(value - answer) / Math.abs(answer) <= tol);
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Φ = BA cos θ in mWb, with A in cm². */
export const fluxMilli = (b: number, aCm2: number, thetaDeg: number) => b * aCm2 * 1e-4 * Math.cos(rad(thetaDeg)) * 1000;
/** emf (µV) induced in a small loop of area A (cm²) inside a long solenoid of n turns per cm, when the current changes by dI in dt. */
export const solenoidLoopMicroV = (nPerCm: number, aCm2: number, dI: number, dt: number) => ((MU0 * nPerCm * 100 * aCm2 * 1e-4 * dI) / dt) * 1e6;
/** Mean emf (mV) when a coil of N turns, radius r (cm), is turned through 180° in a field B (G) in time t. */
export const flipEmfMilliV = (n: number, rCm: number, bGauss: number, t: number) => ((n * 2 * (bGauss * 1e-4) * Math.PI * (rCm / 100) ** 2) / t) * 1000;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelFlux {
  kind: 'flux';
  story: string;
  mode: 'flux' | 'change';
  b: number;
  aCm2: number;
  theta1: number;
  theta2: number;
  answer: number;
  freeTests: number;
}
export interface LevelSolenoid {
  kind: 'solenoid';
  story: string;
  nPerCm: number;
  aCm2: number;
  i1: number;
  i2: number;
  dt: number;
  microV: number;
  freeTests: number;
}
export interface LevelFlip {
  kind: 'flip';
  story: string;
  n: number;
  rCm: number;
  bGauss: number;
  t: number;
  r: number;
  emf: number;
  current: number;
  freeTests: number;
}
export interface LevelGraph {
  kind: 'graph';
  story: string;
  /** Flux in mWb at t = 0, 1, 2, 3 s. */
  flux: number[];
  segment: number;
  emf: number;
  largest: number;
  freeTests: number;
}
export type Level = LevelFlux | LevelSolenoid | LevelFlip | LevelGraph;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const mode = random() < 0.5 ? 'flux' : 'change';
    const b = pick([0.2, 0.5, 1], random);
    const aCm2 = pick([20, 50, 100], random);
    if (mode === 'flux') {
      const theta = pick([0, 30, 45, 60], random);
      return {
        kind: 'flux',
        story: 'A flat coil of area A sits in a uniform magnetic field. The flux through it depends on the angle between the field and the normal to the coil. Find the magnetic flux through the coil.',
        mode,
        b,
        aCm2,
        theta1: theta,
        theta2: theta,
        answer: fluxMilli(b, aCm2, theta),
        freeTests: 1,
      };
    }
    const [t1, t2] = pick([[0, 90], [0, 180], [30, 90], [60, 0], [90, 180]] as [number, number][], random);
    return {
      kind: 'flux',
      story: 'A flat coil in a uniform magnetic field is turned from one orientation to another. The angles are measured between the field and the normal to the coil. Find the change in the flux through the coil, final minus initial, with its sign.',
      mode,
      b,
      aCm2,
      theta1: t1,
      theta2: t2,
      answer: fluxMilli(b, aCm2, t2) - fluxMilli(b, aCm2, t1),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const nPerCm = pick([10, 15, 20], random);
    const aCm2 = pick([1, 2, 4], random);
    const i1 = pick([1, 2], random);
    const i2 = pick([3, 4, 5], random);
    const dt = pick([0.05, 0.1, 0.2], random);
    return {
      kind: 'solenoid',
      story: 'A small loop is placed inside a long solenoid, with its plane at right angles to the axis. The current in the solenoid changes steadily, so the flux through the loop changes. Find the emf induced in the loop while the current is changing.',
      nPerCm,
      aCm2,
      i1,
      i2,
      dt,
      microV: solenoidLoopMicroV(nPerCm, aCm2, i2 - i1, dt),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const n = pick([200, 500, 1000], random);
    const rCm = pick([5, 10, 15], random);
    const bGauss = pick([0.3, 0.4, 0.5], random);
    const t = pick([0.25, 0.5], random);
    const r = pick([2, 4, 5], random);
    const emf = flipEmfMilliV(n, rCm, bGauss, t);
    return {
      kind: 'flip',
      story: 'A circular coil is turned through 180° about a diameter, from facing the field to facing the other way, in a stated time, in the earth’s weak field. Find the average emf induced in it, and the average current, given the resistance of the coil.',
      n,
      rCm,
      bGauss,
      t,
      r,
      emf,
      current: emf / r,
      freeTests: 1,
    };
  }
  for (;;) {
    const flux = Array.from({ length: 4 }, () => pick([0, 2, 4, 6, 8, 10, 12], random));
    const d = [1, 2, 3].map((k) => Math.abs(flux[k] - flux[k - 1]));
    const max = Math.max(...d);
    if (d.some((x) => x === 0) || d.filter((x) => x === max).length !== 1) continue;
    const segment = pick([1, 2, 3], random);
    return {
      kind: 'graph',
      story: 'The magnetic flux through a coil changes with time as in the graph: a straight line between each pair of marked points. The emf in the coil is the rate of change of the flux. Find the size of the emf in the chosen segment, and say which segment has the largest emf. Take one turn.',
      flux,
      segment,
      emf: d[segment - 1],
      largest: d.indexOf(max) + 1,
      freeTests: 1,
    };
  }
}

export function judgeFlux(lvl: LevelFlux, v: number): { ok: boolean } {
  return { ok: within(v, lvl.answer, 0.03) };
}
export function judgeSolenoid(lvl: LevelSolenoid, v: number): { ok: boolean } {
  return { ok: within(v, lvl.microV, 0.03) };
}
export function judgeFlip(lvl: LevelFlip, emf: number, i: number): { ok: boolean; eOk: boolean; iOk: boolean } {
  const eOk = within(emf, lvl.emf, 0.03);
  const iOk = within(i, lvl.current, 0.03);
  return { ok: eOk && iOk, eOk, iOk };
}
export function judgeGraph(lvl: LevelGraph, emf: number, largest: number): { ok: boolean; eOk: boolean; lOk: boolean } {
  const eOk = within(emf, lvl.emf, 0.03);
  const lOk = largest === lvl.largest;
  return { ok: eOk && lOk, eOk, lOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'flux') {
    return lvl.mode === 'flux'
      ? [`Φ = BA cos θ = ${lvl.b} × ${lvl.aCm2 * 1e-4} × cos ${lvl.theta1}° = ${fmt(lvl.answer)} mWb.`, 'θ is the angle between the field and the normal to the coil. The flux is greatest when the field is along the normal and zero when it lies in the plane of the coil.']
      : [`Initial Φ = BA cos ${lvl.theta1}° = ${fmt(fluxMilli(lvl.b, lvl.aCm2, lvl.theta1))} mWb. Final Φ = BA cos ${lvl.theta2}° = ${fmt(fluxMilli(lvl.b, lvl.aCm2, lvl.theta2))} mWb.`, `The change is final − initial = ${fmt(lvl.answer)} mWb. The sign matters: a fall in flux is negative.`];
  }
  if (lvl.kind === 'solenoid') {
    return [
      `Inside the solenoid B = μ₀nI, so the flux through the loop is Φ = μ₀nIA, and ε = dΦ/dt in size = μ₀nA ΔI/Δt.`,
      `n = ${lvl.nPerCm} per cm = ${lvl.nPerCm * 100} per m, so ε = 4π × 10⁻⁷ × ${lvl.nPerCm * 100} × ${lvl.aCm2 * 1e-4} × ${lvl.i2 - lvl.i1} / ${lvl.dt} = ${fmt(lvl.microV)} µV.`,
    ];
  }
  if (lvl.kind === 'flip') {
    return [
      `Turning through 180° changes the flux from +BA to −BA, a change of 2BA. A = π r² = ${fmt(Math.PI * (lvl.rCm / 100) ** 2)} m².`,
      `ε = N × 2BA/t = ${lvl.n} × 2 × ${lvl.bGauss * 1e-4} × ${fmt(Math.PI * (lvl.rCm / 100) ** 2)} / ${lvl.t} = ${fmt(lvl.emf)} mV. The current is ε/R = ${fmt(lvl.emf)} / ${lvl.r} = ${fmt(lvl.current)} mA.`,
    ];
  }
  return [
    `The emf is the slope of the flux graph: ε = |ΔΦ/Δt|, with Δt = 1 s in each segment, so the three emfs are ${[1, 2, 3].map((k) => `${Math.abs(lvl.flux[k] - lvl.flux[k - 1])} mV`).join(', ')} (1 mWb/s = 1 mV).`,
    `Segment ${lvl.segment} gives ${lvl.emf} mV, and segment ${lvl.largest} is the steepest, so it has the largest emf.`,
  ];
}
