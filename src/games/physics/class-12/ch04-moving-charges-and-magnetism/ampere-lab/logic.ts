// Pure rules of the Ampère Lab: no DOM, no canvas.
// Currents in A, lengths as named, fields in µT or mT as named. μ₀ = 4π × 10⁻⁷ T m/A.
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

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Pos = 'right' | 'above' | 'left' | 'below';
const CCW: Record<Pos, Dir> = { right: 'up', above: 'left', left: 'down', below: 'right' };
const FLIP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
/** The field direction at a point around a long wire perpendicular to the page: anticlockwise when the current is out of the page. */
export const wireFieldDir = (pos: Pos, currentOut: boolean): Dir => (currentOut ? CCW[pos] : FLIP[CCW[pos]]);
/** B of a long straight wire in µT (I in A, r in m). */
export const longWireUT = (i: number, rM: number) => ((MU0 * i) / (2 * Math.PI * rM)) * 1e6;
/** B inside (r < a) or outside (r > a) a long straight wire of radius a carrying a uniform current, in µT (lengths in mm). */
export const thickWireUT = (i: number, aMm: number, rMm: number) => {
  const a = aMm / 1000;
  const r = rMm / 1000;
  return rMm < aMm ? ((MU0 * i * r) / (2 * Math.PI * a * a)) * 1e6 : longWireUT(i, r);
};
/** Net field (µT, signed, positive upwards) on the line through two parallel wires at 0 and d (cm), at position x (cm). Currents are positive when out of the page. */
export const netOnLineUT = (x: number, i1: number, i2: number, dCm: number) => {
  const part = (cur: number, p: number) => (cur * 2e-7) / ((x - p) / 100) * 1e6;
  return part(i1, 0) + part(i2, dCm);
};
/** Position of the neutral point on the line, in cm from wire 1. Wire 1 is the one with the larger current when the currents are opposite. */
export const neutralCm = (i1: number, i2: number, dCm: number, same: boolean) => (same ? (dCm * i1) / (i1 + i2) : (dCm * i1) / (i1 - i2));
export const turnsPerMetre = (layers: number, perLayer: number, lCm: number) => (layers * perLayer) / (lCm / 100);
/** B inside a long solenoid, in mT. */
export const solenoidMT = (n: number, i: number) => MU0 * n * i * 1000;
/** B inside a toroid at its mean radius, in mT. */
export const toroidMT = (turns: number, i: number, rCm: number) => ((MU0 * turns * i) / (2 * Math.PI * (rCm / 100))) * 1000;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelWire {
  kind: 'wire';
  story: string;
  i: number;
  rM: number;
  pos: Pos;
  currentOut: boolean;
  ut: number;
  dir: Dir;
  freeTests: number;
}
export interface LevelThick {
  kind: 'thick';
  story: string;
  i: number;
  aMm: number;
  rInMm: number;
  rOutMm: number;
  inUt: number;
  outUt: number;
  freeTests: number;
}
export interface LevelNeutral {
  kind: 'neutral';
  story: string;
  i1: number;
  i2: number;
  dCm: number;
  same: boolean;
  xCm: number;
  freeTests: number;
}
export interface LevelSolenoid {
  kind: 'solenoid';
  story: string;
  layers: number;
  perLayer: number;
  lCm: number;
  i: number;
  n: number;
  mt: number;
  freeTests: number;
}
export type Hole = 'zero' | 'same' | 'half';
export interface LevelToroid {
  kind: 'toroid';
  story: string;
  turns: number;
  i: number;
  rCm: number;
  mt: number;
  freeTests: number;
}
export type Level = LevelWire | LevelThick | LevelNeutral | LevelSolenoid | LevelToroid;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const i = pick([25, 35, 50, 90], random);
    const rM = pick([0.2, 0.5, 1.5, 2.5], random);
    const pos = pick(['right', 'above', 'left', 'below'] as Pos[], random);
    const currentOut = random() < 0.5;
    return {
      kind: 'wire',
      story: 'A long straight wire runs at right angles to the page, carrying a steady current. Find the size of the field at a point some distance from it, and the direction of the field there. The field lines are circles around the wire.',
      i,
      rM,
      pos,
      currentOut,
      ut: longWireUT(i, rM),
      dir: wireFieldDir(pos, currentOut),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const i = pick([10, 20, 50], random);
    const aMm = pick([2, 4, 5], random);
    const rIn = aMm * pick([0.25, 0.5, 0.75], random);
    const rOut = aMm * pick([2, 3], random);
    return {
      kind: 'thick',
      story: 'A long straight wire of circular cross-section carries a current spread uniformly over the whole cross-section. Use Ampère\'s law with a circle round the axis. Find the field at a point inside the wire and at a point outside it.',
      i,
      aMm,
      rInMm: rIn,
      rOutMm: rOut,
      inUt: thickWireUT(i, aMm, rIn),
      outUt: thickWireUT(i, aMm, rOut),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const same = random() < 0.5;
    const [i1, i2, dCm] = same
      ? pick([[3, 1, 12], [1, 1, 10], [2, 3, 15], [3, 2, 20], [2, 3, 10]] as [number, number, number][], random)
      : pick([[3, 1, 10], [4, 2, 6], [5, 3, 8], [2, 1, 10]] as [number, number, number][], random);
    return {
      kind: 'neutral',
      story: same ? 'Two long straight parallel wires carry currents in the same direction. Between them their fields point opposite ways, so somewhere on the line joining them the fields cancel. Slide the probe along the line until the meter reads zero, then give the distance from wire 1.' : 'Two long straight parallel wires carry currents in opposite directions, so their fields point the same way between them and cancel only outside, beyond the wire with the smaller current. Slide the probe along the line until the meter reads zero, then give the distance from wire 1.',
      i1,
      i2,
      dCm,
      same,
      xCm: neutralCm(i1, i2, dCm, same),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const layers = pick([1, 3, 5], random);
    const perLayer = pick([100, 200, 400], random);
    const lCm = pick([50, 80, 100], random);
    const i = pick([2, 5, 8], random);
    const n = turnsPerMetre(layers, perLayer, lCm);
    return {
      kind: 'solenoid',
      story: 'A long closely wound solenoid carries a current. Inside it the field is uniform and parallel to the axis. Find the number of turns per metre, and the field inside near the centre.',
      layers,
      perLayer,
      lCm,
      i,
      n,
      mt: solenoidMT(n, i),
      freeTests: 1,
    };
  }
  const turns = pick([500, 1000, 2000], random);
  const i = pick([1, 2, 3], random);
  const rCm = pick([10, 15, 20], random);
  return {
    kind: 'toroid',
    story: 'A toroid is a solenoid bent into a ring. Its field is confined to the winding. Find the field inside the winding at the mean radius, and say what the field is in the empty hole at the centre of the ring.',
    turns,
    i,
    rCm,
    mt: toroidMT(turns, i, rCm),
    freeTests: 1,
  };
}

export function judgeWire(lvl: LevelWire, ut: number, dir: Dir): { ok: boolean; bOk: boolean; dirOk: boolean } {
  const bOk = within(ut, lvl.ut, 0.03);
  const dirOk = dir === lvl.dir;
  return { ok: bOk && dirOk, bOk, dirOk };
}
export function judgeThick(lvl: LevelThick, inUt: number, outUt: number): { ok: boolean; inOk: boolean; outOk: boolean } {
  const inOk = within(inUt, lvl.inUt, 0.03);
  const outOk = within(outUt, lvl.outUt, 0.03);
  return { ok: inOk && outOk, inOk, outOk };
}
export function judgeNeutral(lvl: LevelNeutral, xCm: number): { ok: boolean } {
  return { ok: within(xCm, lvl.xCm, 0.03) };
}
export function judgeSolenoid(lvl: LevelSolenoid, n: number, mt: number): { ok: boolean; nOk: boolean; bOk: boolean } {
  const nOk = within(n, lvl.n, 0.03);
  const bOk = within(mt, lvl.mt, 0.03);
  return { ok: nOk && bOk, nOk, bOk };
}
export function judgeToroid(lvl: LevelToroid, mt: number, hole: Hole): { ok: boolean; bOk: boolean; holeOk: boolean } {
  const bOk = within(mt, lvl.mt, 0.03);
  const holeOk = hole === 'zero';
  return { ok: bOk && holeOk, bOk, holeOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'wire') {
    return [
      `Ampère's law round a circle of radius r gives B = μ₀I/2πr = 2 × 10⁻⁷ × ${lvl.i} / ${lvl.rM} = ${fmt(lvl.ut)} µT.`,
      `Grip the wire with the right hand, thumb along the current: the fingers curl the way the field goes. With the current ${lvl.currentOut ? 'out of' : 'into'} the page the field circles ${lvl.currentOut ? 'anticlockwise' : 'clockwise'}, so at this point it points ${lvl.dir}.`,
    ];
  }
  if (lvl.kind === 'thick') {
    return [
      `Outside the wire the whole current I is enclosed: B = μ₀I/2πr = ${fmt(lvl.outUt)} µT at r = ${fmt(lvl.rOutMm)} mm.`,
      `Inside, a circle of radius r encloses only the fraction r²/a² of the current, so B = μ₀Ir/2πa² = ${fmt(lvl.inUt)} µT at r = ${fmt(lvl.rInMm)} mm. It grows in proportion to r inside, and falls as 1/r outside.`,
    ];
  }
  if (lvl.kind === 'neutral') {
    return [
      lvl.same ? `Between the wires the fields oppose. They cancel where I₁/x = I₂/(d − x), so x = d I₁/(I₁ + I₂) = ${lvl.dCm} × ${lvl.i1} / ${lvl.i1 + lvl.i2} = ${fmt(lvl.xCm)} cm from wire 1.` : `With opposite currents the fields cancel only outside, beyond the smaller current, where I₁/x = I₂/(x − d). So x = d I₁/(I₁ − I₂) = ${lvl.dCm} × ${lvl.i1} / ${lvl.i1 - lvl.i2} = ${fmt(lvl.xCm)} cm from wire 1.`,
      'A wire with the larger current has the stronger field at the same distance, so the neutral point lies nearer the wire with the smaller current.',
    ];
  }
  if (lvl.kind === 'solenoid') {
    return [
      `The turns per metre are n = ${lvl.layers} × ${lvl.perLayer} / ${lvl.lCm / 100} m = ${fmt(lvl.n)} per metre.`,
      `B = μ₀nI = 4π × 10⁻⁷ × ${fmt(lvl.n)} × ${lvl.i} = ${fmt(lvl.mt)} mT, uniform inside and almost zero outside a long solenoid.`,
    ];
  }
  return [
    `Ampère's law round a circle of radius r inside the winding gives B = μ₀NI/2πr = 2 × 10⁻⁷ × ${lvl.turns} × ${lvl.i} / ${lvl.rCm / 100} = ${fmt(lvl.mt)} mT.`,
    'A circle in the empty hole, or outside the ring, encloses no net current, so the field there is zero: the field of a toroid is confined to the winding.',
  ];
}
