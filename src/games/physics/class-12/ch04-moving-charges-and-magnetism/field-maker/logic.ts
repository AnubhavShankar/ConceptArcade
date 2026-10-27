// Pure rules of the Field Maker: no DOM, no canvas.
// Currents in A, lengths in cm or m as named, fields in nT or µT as named. μ₀ = 4π × 10⁻⁷ T m/A.
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
const within = (value: number, answer: number, tol: number) => Math.abs(value - answer) / Math.abs(answer) <= tol;

/** Biot–Savart: dB = (μ₀/4π) I dl sin θ / r², in nT (I in A, dl in cm, r in m). */
export const biotSavartNT = (i: number, dlCm: number, rM: number, thetaDeg: number) => ((1e-7 * i * (dlCm / 100) * Math.sin((thetaDeg * Math.PI) / 180)) / (rM * rM)) * 1e9;
/** dl × r̂ for dl along +x (right) or −x, and a point above or below the line of the element: out of the page if true. */
export const elementDirOut = (dlRight: boolean, pointAbove: boolean) => dlRight === pointAbove;
/** B at the centre of a circular coil, in µT. */
export const loopCentreUT = (n: number, i: number, rCm: number) => ((MU0 * n * i) / (2 * (rCm / 100))) * 1e6;
/** A current going clockwise (as seen) gives a field into the page. */
export const loopDirOut = (clockwise: boolean) => !clockwise;
/** B at the centre of an arc that is the fraction f of a full circle, in µT. */
export const arcCentreUT = (f: number, i: number, rCm: number) => f * loopCentreUT(1, i, rCm);
/** B on the axis of a coil, at distance x from its centre, in µT. */
export const axisUT = (n: number, i: number, rCm: number, xCm: number) => {
  const r = rCm / 100;
  const x = xCm / 100;
  return ((MU0 * n * i * r * r) / (2 * Math.pow(r * r + x * x, 1.5))) * 1e6;
};

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelElement {
  kind: 'element';
  story: string;
  i: number;
  dlCm: number;
  rM: number;
  theta: number;
  dlRight: boolean;
  pointAbove: boolean;
  nt: number;
  out: boolean;
  freeTests: number;
}
export interface LevelLoop {
  kind: 'loop';
  story: string;
  n: number;
  i: number;
  rCm: number;
  clockwise: boolean;
  ut: number;
  out: boolean;
  freeTests: number;
}
export interface LevelArc {
  kind: 'arc';
  story: string;
  i: number;
  rCm: number;
  frac: number;
  clockwise: boolean;
  ut: number;
  out: boolean;
  freeTests: number;
}
export interface LevelAxis {
  kind: 'axis';
  story: string;
  n: number;
  i: number;
  rCm: number;
  xCm: number;
  ut: number;
  centreUt: number;
  ratio: number;
  freeTests: number;
}
export interface LevelConcentric {
  kind: 'concentric';
  story: string;
  i1: number;
  r1Cm: number;
  i2: number;
  r2Cm: number;
  same: boolean;
  ut: number;
  /** True when the net field points out of the page (the larger contribution decides). */
  out: boolean;
  freeTests: number;
}
export type Level = LevelElement | LevelLoop | LevelArc | LevelAxis | LevelConcentric;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const i = pick([5, 10, 20], random);
    const dlCm = pick([1, 2, 5], random);
    const rM = pick([0.25, 0.5, 1], random);
    const theta = pick([90, 60, 30], random);
    const dlRight = random() < 0.5;
    const pointAbove = random() < 0.5;
    return {
      kind: 'element',
      story: 'A short element of a wire carries a current, and you measure the field it makes at a point some distance away. The Biot–Savart law gives the size, and the cross product of dl with the line to the point gives the direction. Find the field and say whether it points out of the page or into it.',
      i,
      dlCm,
      rM,
      theta,
      dlRight,
      pointAbove,
      nt: biotSavartNT(i, dlCm, rM, theta),
      out: elementDirOut(dlRight, pointAbove),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const n = pick([1, 30, 100, 200], random);
    const i = pick([0.4, 1, 2, 6], random);
    const rCm = pick([8, 10, 12, 20], random);
    const clockwise = random() < 0.5;
    return {
      kind: 'loop',
      story: 'A tightly wound circular coil carries a current. Every turn has the same radius and adds its own field at the centre. Find the field at the centre, and say whether it points out of the page or into it.',
      n,
      i,
      rCm,
      clockwise,
      ut: loopCentreUT(n, i, rCm),
      out: loopDirOut(clockwise),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const i = pick([6, 12, 15], random);
    const rCm = pick([2, 4, 5], random);
    const frac = pick([0.5, 0.25, 0.75], random);
    const clockwise = random() < 0.5;
    return {
      kind: 'arc',
      story: 'A straight wire carrying a current is bent into an arc of a circle, with the straight leads running in line with the centre. Find the field at the centre of the arc, and say whether it points out of the page or into it.',
      i,
      rCm,
      frac,
      clockwise,
      ut: arcCentreUT(frac, i, rCm),
      out: loopDirOut(clockwise),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const n = pick([20, 50, 100], random);
    const i = pick([1, 2, 5], random);
    const rCm = pick([10, 12, 15], random);
    const xCm = pick([5, 10, 20, 30], random);
    const centre = loopCentreUT(n, i, rCm);
    const ut = axisUT(n, i, rCm, xCm);
    return {
      kind: 'axis',
      story: 'A circular coil carries a current. The field is strongest at the centre and falls off along the axis. Find the field on the axis at a given distance from the centre, and what fraction of the centre field it is.',
      n,
      i,
      rCm,
      xCm,
      ut,
      centreUt: centre,
      ratio: ut / centre,
      freeTests: 1,
    };
  }
  const r1Cm = pick([5, 10], random);
  const r2Cm = pick([10, 20], random);
  const same = random() < 0.5;
  let i1 = pick([2, 3, 4, 5], random);
  let i2 = pick([2, 3, 4, 5], random);
  // when the fields oppose, avoid a net field too small to measure
  while (!same && Math.abs(loopCentreUT(1, i1, r1Cm) - loopCentreUT(1, i2, r2Cm)) < 0.15 * Math.max(loopCentreUT(1, i1, r1Cm), loopCentreUT(1, i2, r2Cm))) {
    i1 = pick([2, 3, 4, 5], random);
    i2 = pick([2, 3, 4, 5], random);
  }
  const b1 = loopCentreUT(1, i1, r1Cm);
  const b2 = loopCentreUT(1, i2, r2Cm);
  // the inner loop (1) is taken to produce a field out of the page; same sense means both out
  const net = same ? b1 + b2 : b1 - b2;
  return {
    kind: 'concentric',
    story: same ? 'Two circular loops share the same centre and carry currents in the same sense. Their fields at the centre add. Find the net field there, and say whether it points out of the page or into it, given that the inner loop alone would give a field out of the page.' : 'Two circular loops share the same centre and carry currents in opposite senses. Their fields at the centre subtract. Find the net field there, and say whether it points out of the page or into it, given that the inner loop alone would give a field out of the page.',
    i1,
    r1Cm,
    i2,
    r2Cm,
    same,
    ut: Math.abs(net),
    out: net > 0,
    freeTests: 1,
  };
}

export function judgeElement(lvl: LevelElement, nt: number, out: boolean): { ok: boolean; bOk: boolean; dirOk: boolean } {
  const bOk = within(nt, lvl.nt, 0.03);
  const dirOk = out === lvl.out;
  return { ok: bOk && dirOk, bOk, dirOk };
}
export function judgeLoop(lvl: LevelLoop, ut: number, out: boolean): { ok: boolean; bOk: boolean; dirOk: boolean } {
  const bOk = within(ut, lvl.ut, 0.03);
  const dirOk = out === lvl.out;
  return { ok: bOk && dirOk, bOk, dirOk };
}
export function judgeArc(lvl: LevelArc, ut: number, out: boolean): { ok: boolean; bOk: boolean; dirOk: boolean } {
  const bOk = within(ut, lvl.ut, 0.03);
  const dirOk = out === lvl.out;
  return { ok: bOk && dirOk, bOk, dirOk };
}
export function judgeAxis(lvl: LevelAxis, ut: number, ratio: number): { ok: boolean; bOk: boolean; rOk: boolean } {
  const bOk = within(ut, lvl.ut, 0.03);
  const rOk = within(ratio, lvl.ratio, 0.04);
  return { ok: bOk && rOk, bOk, rOk };
}
export function judgeConcentric(lvl: LevelConcentric, ut: number, out: boolean): { ok: boolean; bOk: boolean; dirOk: boolean } {
  const bOk = within(ut, lvl.ut, 0.03);
  const dirOk = out === lvl.out;
  return { ok: bOk && dirOk, bOk, dirOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'element') {
    return [
      `dB = (μ₀/4π) I dl sin θ / r² = 10⁻⁷ × ${lvl.i} × ${lvl.dlCm / 100} × sin ${lvl.theta}° / ${lvl.rM}² = ${fmt(lvl.nt)} nT.`,
      `The direction is that of dl × r: with dl pointing ${lvl.dlRight ? 'right' : 'left'} and the point ${lvl.pointAbove ? 'above' : 'below'} the element, the cross product points ${lvl.out ? 'out of' : 'into'} the page.`,
    ];
  }
  if (lvl.kind === 'loop') {
    return [
      `Each of the ${lvl.n} turns adds μ₀I/2R at the centre: B = μ₀NI/2R = 4π × 10⁻⁷ × ${lvl.n} × ${lvl.i} / (2 × ${lvl.rCm / 100}) = ${fmt(lvl.ut)} µT.`,
      `Curl the fingers of the right hand along the current: the thumb gives the field. A ${lvl.clockwise ? 'clockwise' : 'anticlockwise'} current gives a field ${lvl.out ? 'out of' : 'into'} the page.`,
    ];
  }
  if (lvl.kind === 'arc') {
    return [
      `The straight leads point along the line to the centre, so dl × r = 0 and they add nothing. Only the arc contributes, in proportion to its angle.`,
      `The arc is ${lvl.frac} of a full circle: B = ${lvl.frac} × μ₀I/2R = ${lvl.frac} × 4π × 10⁻⁷ × ${lvl.i} / (2 × ${lvl.rCm / 100}) = ${fmt(lvl.ut)} µT. A ${lvl.clockwise ? 'clockwise' : 'anticlockwise'} current gives a field ${lvl.out ? 'out of' : 'into'} the page.`,
    ];
  }
  if (lvl.kind === 'axis') {
    return [
      `On the axis, B = μ₀NIR² / [2(R² + x²)^(3/2)] = ${fmt(lvl.ut)} µT at x = ${lvl.xCm} cm.`,
      `At the centre B = μ₀NI/2R = ${fmt(lvl.centreUt)} µT, so the axis field is ${fmt(lvl.ratio)} of it. The field falls off as the distance grows, and far away as 1/x³.`,
    ];
  }
  return [
    `Each loop gives μ₀I/2R at the centre: ${fmt(loopCentreUT(1, lvl.i1, lvl.r1Cm))} µT from the inner loop and ${fmt(loopCentreUT(1, lvl.i2, lvl.r2Cm))} µT from the outer loop.`,
    lvl.same ? `The currents are in the same sense, so the fields point the same way and add: ${fmt(lvl.ut)} µT, out of the page.` : `The currents are in opposite senses, so the fields oppose and the larger wins: net ${fmt(lvl.ut)} µT, ${lvl.out ? 'out of' : 'into'} the page.`,
  ];
}
