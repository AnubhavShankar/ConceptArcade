// The rules of "First Plasma": every case of Ampère's law inside a small tokamak. Pure functions only (no DOM, no canvas, no Math.random).
// Level 1 busbar probe (side and distance), 2 the plasma column (inner and outer probe), 3 the X-point (null of two currents),
// 4 the central solenoid (its length), 5 the toroidal coil (probe radius; the toroid is beyond Section 4.7 by owner decision).
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const MU0 = 4 * Math.PI * 1e-7; // T m/A

export type Dir = 'up' | 'down' | 'left' | 'right';
export interface BusRow { cur: 'out' | 'in'; arrow: Dir; I: number; ut: number; side: 0 | 1 | 2 | 3; r: number }
// I in A; ut, the calibration field, in µT; arrow, the probe's sensing direction. Answer: side (0 right, 1 above, 2 left, 3 below) and r (cm).
export interface ColRow { a: number; I: number; mt: number; rin: number; rout: number }
// a, the column's radius, in cm; I in kA; mt in mT. Answer: rin (inside) and rout (outside), cm; rin × rout = a².
export interface XptRow { same: boolean; I1: number; I2: number; d: number; x: number }
// I1 (the plasma) and I2 (the divertor coil) in kA; d, their spacing, in cm (always odd). Answer: x, the null point's distance from current 1 (cm, even).
export interface SolRow { layers: number; per: number; I: number; mt: number; L: number }
// layers × per turns, I in A, mt in mT. Answer: L (cm).
export interface TorRow { N: number; I: number; mt: number; rIn: number; rOut: number; r: number }
// N turns, I in A, mt in mT; the winding runs from rIn to rOut (cm). Answer: r (cm).

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'bus'; assist: Assist } & BusRow)
  | ({ kind: 'col'; assist: Assist } & ColRow)
  | ({ kind: 'xpt'; assist: Assist } & XptRow)
  | ({ kind: 'sol'; assist: Assist } & SolRow)
  | ({ kind: 'tor'; assist: Assist } & TorRow);

export const BUS: BusRow[][] = [
  [
    { cur: 'out', arrow: 'up', I: 35, ut: 35, side: 0, r: 20 }, { cur: 'out', arrow: 'left', I: 120, ut: 80, side: 1, r: 30 },
    { cur: 'out', arrow: 'down', I: 200, ut: 160, side: 2, r: 25 }, { cur: 'out', arrow: 'right', I: 90, ut: 120, side: 3, r: 15 },
  ],
  [
    { cur: 'in', arrow: 'up', I: 150, ut: 75, side: 2, r: 40 }, { cur: 'in', arrow: 'right', I: 50, ut: 100, side: 1, r: 10 },
    { cur: 'in', arrow: 'down', I: 300, ut: 80, side: 0, r: 75 }, { cur: 'in', arrow: 'left', I: 250, ut: 111, side: 3, r: 45 },
  ],
  [
    { cur: 'out', arrow: 'right', I: 400, ut: 100, side: 3, r: 80 }, { cur: 'in', arrow: 'right', I: 180, ut: 103, side: 1, r: 35 },
    { cur: 'out', arrow: 'down', I: 75, ut: 27.3, side: 2, r: 55 }, { cur: 'in', arrow: 'down', I: 500, ut: 154, side: 0, r: 65 },
  ],
];

export const COL: ColRow[][] = [
  [{ a: 12, I: 30, mt: 33.3, rin: 8, rout: 18 }, { a: 15, I: 50, mt: 40, rin: 9, rout: 25 }, { a: 10, I: 25, mt: 25, rin: 5, rout: 20 }, { a: 20, I: 60, mt: 48, rin: 16, rout: 25 }],
  [{ a: 18, I: 45, mt: 33.3, rin: 12, rout: 27 }, { a: 24, I: 96, mt: 40, rin: 12, rout: 48 }, { a: 12, I: 36, mt: 30, rin: 6, rout: 24 }, { a: 20, I: 80, mt: 40, rin: 10, rout: 40 }],
  [{ a: 30, I: 120, mt: 53.3, rin: 20, rout: 45 }, { a: 24, I: 64, mt: 40, rin: 18, rout: 32 }, { a: 18, I: 54, mt: 30, rin: 9, rout: 36 }, { a: 16, I: 64, mt: 40, rin: 8, rout: 32 }],
];

export const XPT: XptRow[][] = [
  [{ same: true, I1: 200, I2: 100, d: 57, x: 38 }, { same: true, I1: 400, I2: 300, d: 35, x: 20 }, { same: true, I1: 200, I2: 100, d: 27, x: 18 }, { same: true, I1: 400, I2: 300, d: 21, x: 12 }],
  [{ same: false, I1: 400, I2: 100, d: 21, x: 28 }, { same: false, I1: 600, I2: 100, d: 25, x: 30 }, { same: false, I1: 400, I2: 100, d: 33, x: 44 }, { same: false, I1: 600, I2: 100, d: 35, x: 42 }],
  [{ same: true, I1: 200, I2: 300, d: 35, x: 14 }, { same: false, I1: 400, I2: 100, d: 45, x: 60 }, { same: true, I1: 300, I2: 150, d: 39, x: 26 }, { same: false, I1: 800, I2: 200, d: 27, x: 36 }],
];

export const SOL: SolRow[][] = [
  [{ layers: 1, per: 500, I: 5, mt: 6.28, L: 50 }, { layers: 1, per: 800, I: 4, mt: 10.1, L: 40 }, { layers: 1, per: 600, I: 6, mt: 5.03, L: 90 }, { layers: 1, per: 1000, I: 3, mt: 6.28, L: 60 }],
  [{ layers: 5, per: 400, I: 8, mt: 25.1, L: 80 }, { layers: 3, per: 200, I: 6, mt: 15.1, L: 30 }, { layers: 4, per: 250, I: 5, mt: 6.28, L: 100 }, { layers: 2, per: 300, I: 7, mt: 7.54, L: 70 }],
  [{ layers: 6, per: 300, I: 4, mt: 8.23, L: 110 }, { layers: 4, per: 500, I: 3, mt: 6.28, L: 120 }, { layers: 3, per: 400, I: 9, mt: 30.2, L: 45 }, { layers: 8, per: 150, I: 5, mt: 11.6, L: 65 }],
];

export const TOR: TorRow[][] = [
  [{ N: 1000, I: 20, mt: 16, rIn: 15, rOut: 40, r: 25 }, { N: 500, I: 30, mt: 15, rIn: 12, rOut: 35, r: 20 }, { N: 2000, I: 10, mt: 12.5, rIn: 20, rOut: 48, r: 32 }, { N: 800, I: 25, mt: 10, rIn: 26, rOut: 52, r: 40 }],
  [{ N: 1500, I: 20, mt: 20, rIn: 18, rOut: 44, r: 30 }, { N: 1200, I: 15, mt: 15, rIn: 14, rOut: 38, r: 24 }, { N: 600, I: 40, mt: 13.3, rIn: 22, rOut: 50, r: 36 }, { N: 900, I: 20, mt: 20, rIn: 10, rOut: 32, r: 18 }],
  [{ N: 2500, I: 12, mt: 21.4, rIn: 16, rOut: 42, r: 28 }, { N: 1000, I: 35, mt: 20, rIn: 22, rOut: 50, r: 35 }, { N: 1800, I: 15, mt: 20, rIn: 15, rOut: 40, r: 27 }, { N: 2000, I: 15, mt: 27.3, rIn: 12, rOut: 36, r: 22 }],
];

export const DIAL = {
  side: { min: 0, max: 3, start: 0 }, // L1: 0 right, 1 above, 2 left, 3 below
  r: { min: 5, max: 100, step: 5, start: 5 }, // L1 distance, cm
  x: { min: 2, max: 98, step: 2, start: 2 }, // L3 plate position, cm from current 1
  L: { min: 20, max: 150, step: 5, start: 20 }, // L4 solenoid length, cm
  tr: { min: 2, max: 60, step: 1, start: 2 }, // L5 probe radius, cm
};
// L2's ranges depend on the round: rin from 1 to a − 1 (start 1), rout from a + 1 to 3a (start a + 1), both in steps of 1 cm.

const CCW: Dir[] = ['up', 'left', 'down', 'right'];
const FLIP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
/** L1: the field's direction on side s (0 right, 1 above, 2 left, 3 below). It circles anticlockwise on screen for a current out of the screen. */
export const fieldAt = (cur: 'out' | 'in', s: number): Dir => (cur === 'out' ? CCW[s] : FLIP[CCW[s]]);
/** L1: µT, I in A, r in cm. */
export const busUT = (I: number, r: number) => (20 * I) / r;
/** L2: mT, I in kA, lengths in cm. */
export const inMT = (r: ColRow, x: number) => (20 * r.I * x) / (r.a * r.a);
export const outMT = (r: ColRow, x: number) => (20 * r.I) / x;
/** L3: the net field (mT, signed along one fixed direction) at x cm from current 1. */
export const netMT = (r: XptRow, x: number) => (20 * r.I1) / x + ((r.same ? 1 : -1) * 20 * r.I2) / (x - r.d);
/** L4: turns per metre, and the field in mT inside, for a length of L cm. */
export const solTurnsPerM = (r: SolRow, L: number) => (r.layers * r.per) / (L / 100);
export const solMT = (r: SolRow, L: number) => MU0 * solTurnsPerM(r, L) * r.I * 1000;
/** L5: mT at radius x cm; zero in the hole and outside the ring. */
export const torRegion = (r: TorRow, x: number) => (x <= r.rIn ? 'hole' : x >= r.rOut ? 'outside' : 'winding');
export const torMT = (r: TorRow, x: number) => (torRegion(r, x) === 'winding' ? (0.02 * r.N * r.I) / x : 0);

const POOLS = [BUS, COL, XPT, SOL, TOR] as unknown[][][];
const KINDS = ['bus', 'col', 'xpt', 'sol', 'tor'] as const;
/** Three rounds for a level: one row from each pool of the level. Must be the first use of `random` in the level. */
export function buildRounds(level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] {
  return POOLS[level - 1].map((pool, k) => ({ ...(pick(pool, random) as object), kind: KINDS[level - 1], assist: aid(k) }) as Round);
}

export type Fault = 'wrong' | 'weak' | 'strong' | 'inLow' | 'inHigh' | 'outHigh' | 'outLow' | 'near' | 'far' | 'quench' | 'dim' | 'zero';
export type Values = { side?: number; r?: number; rin?: number; rout?: number; x?: number; L?: number };

/** What went wrong with the player's setting, or null for the winning one. L1 checks the side first; L2 the inner probe first. */
export function fault(r: Round, v: Values): Fault | null {
  switch (r.kind) {
    case 'bus':
      if (fieldAt(r.cur, v.side!) !== r.arrow) return 'wrong';
      return v.r === r.r ? null : v.r! > r.r ? 'weak' : 'strong';
    case 'col':
      if (v.rin !== r.rin) return v.rin! < r.rin ? 'inLow' : 'inHigh';
      if (v.rout !== r.rout) return v.rout! < r.rout ? 'outHigh' : 'outLow';
      return null;
    case 'xpt':
      return v.x === r.x ? null : v.x! < r.x ? 'near' : 'far';
    case 'sol':
      return v.L === r.L ? null : v.L! < r.L ? 'quench' : 'dim';
    case 'tor':
      if (torRegion(r, v.r!) !== 'winding') return 'zero';
      return v.r === r.r ? null : v.r! < r.r ? 'strong' : 'weak';
  }
}
export const judge = (r: Round, v: Values) => fault(r, v) === null;

// ---- words ----
export const SIDE = ['right of', 'above', 'left of', 'below'];
export const sideWord = (s: number) => `${SIDE[s]} the busbar`;
export const ARROW: Record<Dir, string> = { up: '↑', down: '↓', left: '←', right: '→' };
export const curSym = (cur: 'out' | 'in') => (cur === 'out' ? '⊙ out of the screen' : '⊗ into the screen');
export const sense = (cur: 'out' | 'in') => (cur === 'out' ? 'anticlockwise' : 'clockwise');

/** The one-line goal drawn on the canvas (at most 40 characters). */
export function goal(r: Round): string {
  switch (r.kind) {
    case 'bus': return `Calibrate: ${r.ut} µT along the arrow`;
    case 'col': return `Both probes must read ${r.mt} mT`;
    case 'xpt': return 'Put the plate on the null point';
    case 'sol': return `Solenoid: ${r.mt} mT inside`;
    case 'tor': return `Toroidal field: ${r.mt} mT`;
  }
}

export function intel(r: Round): string {
  switch (r.kind) {
    case 'bus': return `The busbar carries ${r.I} A, ${curSym(r.cur)}. The probe reads only a field along its arrow ${ARROW[r.arrow]}, and must read ${r.ut} µT.`;
    case 'col': return `The plasma column has a radius of ${r.a} cm and carries ${r.I} kA spread evenly over it. One probe goes inside it and one outside; both must read ${r.mt} mT.`;
    case 'xpt': return `The plasma carries ${r.I1} kA and the divertor coil ${r.I2} kA, ${r.same ? 'the same way' : 'the opposite way'}, ${r.d} cm apart. The plate must sit where their fields cancel.`;
    case 'sol': return `The solenoid has ${r.layers} layer${r.layers > 1 ? 's' : ''} of ${r.per} turns and carries ${r.I} A. Its field inside must be ${r.mt} mT.`;
    case 'tor': return `The toroidal coil has ${r.N} turns carrying ${r.I} A. The probe slides out from the middle of the ring, through the hole and across the winding; it must read ${r.mt} mT.`;
  }
}

export const hintText = (r: Round) =>
  `${intel(r)} ${r.assist === 0 ? 'Round 1: the probe readout is live.' : r.assist === 1 ? 'The readout is off: a probe check costs a charge.' : 'Last shot: no readout.'}`;

/** After a miss: the player's own setting, what it did, what to change. Never the answer, and never the field's direction on a wrong side. */
export function missText(r: Round, v: Values): string {
  const f = fault(r, v);
  switch (f) {
    case 'wrong': {
      const s = sideWord(v.side!);
      return `${s[0].toUpperCase()}${s.slice(1)}, the field did not point along the probe’s arrow, so the probe misread and the shot disrupted. Use the right-hand grip rule to choose the side.`;
    }
    case 'weak': return r.kind === 'tor'
      ? `At ${v.r} cm, in the winding, the field was too weak. Move the probe in.`
      : `At ${v.r} cm the field was too weak for the calibration. Move the probe closer.`;
    case 'strong': return r.kind === 'tor'
      ? `At ${v.r} cm, in the winding, the field was too strong. Move the probe farther out.`
      : `At ${v.r} cm the field was too strong for the calibration. Move the probe farther out.`;
    case 'inLow': return `The inner probe at ${v.rin} cm read too little: inside the column the field grows with r. Move it out.`;
    case 'inHigh': return `The inner probe at ${v.rin} cm read too much. Move it in.`;
    case 'outHigh': return `The inner probe was right, but the outer probe at ${v.rout} cm read too much: outside, the field falls as 1/r. Move it out.`;
    case 'outLow': return `The inner probe was right, but the outer probe at ${v.rout} cm read too little. Move it in.`;
    case 'near': return `At ${v.x} cm the two fields did not cancel: the exhaust missed the plate and scorched the wall. The null lies farther from the plasma.`;
    case 'far': return `At ${v.x} cm the two fields did not cancel: the exhaust missed the plate and scorched the wall. The null lies nearer the plasma.`;
    case 'quench': return `Squeezed to ${v.L} cm, the turns were packed too tightly: the field was too strong and the solenoid quenched. Make it longer.`;
    case 'dim': return `Stretched to ${v.L} cm, the turns were spread too thinly: the field was too weak to start the plasma. Make it shorter.`;
    case 'zero': {
      const where = r.kind === 'tor' && torRegion(r, v.r!) === 'hole' ? 'in the hole' : 'outside the ring';
      return `At ${v.r} cm the probe was ${where}: a circle there encloses no net current, so it read zero. Move it into the winding.`;
    }
    default: return '';
  }
}

/** The probe check (costs a charge): the field at the player's own setting. */
export function meterText(r: Round, v: Values): string {
  switch (r.kind) {
    case 'bus': return `Probe check: ${sideWord(v.side!)}, ${v.r} cm out, the field is ${fmt(busUT(r.I, v.r!))} µT pointing ${ARROW[fieldAt(r.cur, v.side!)]}.`;
    case 'col': return `Probe check: the inner probe reads ${fmt(inMT(r, v.rin!))} mT and the outer probe ${fmt(outMT(r, v.rout!))} mT.`;
    case 'xpt': return `Probe check: at ${v.x} cm the net field is ${fmt(Math.abs(netMT(r, v.x!)))} mT.`;
    case 'sol': return `Probe check: at ${v.L} cm long there are ${fmt(solTurnsPerM(r, v.L!))} turns per metre, and the field inside is ${fmt(solMT(r, v.L!))} mT.`;
    case 'tor': {
      const reg = torRegion(r, v.r!);
      return `Probe check: at ${v.r} cm the probe is ${reg === 'winding' ? 'in the winding' : reg === 'hole' ? 'in the hole' : 'outside the ring'} and reads ${fmt(torMT(r, v.r!))} mT.`;
    }
  }
}

/** After a win: the working in two or three sentences. */
export function winText(r: Round): string {
  switch (r.kind) {
    case 'bus': return `Calibrated! B = μ₀I/2πr = 2 × 10⁻⁷ × ${r.I} ÷ ${fmt(r.r / 100)} = ${r.ut} µT. With the current ${curSym(r.cur)}, the right-hand grip rule makes the field circle ${sense(r.cur)}, so ${sideWord(r.side)} it points ${ARROW[r.arrow]}, along the arrow.`;
    case 'col': return `Both probes agree! Outside, the whole current counts: B = μ₀I/2πr = ${r.mt} mT at ${r.rout} cm. Inside, a circle encloses only r²/a² of it, so B = μ₀Ir/2πa² = ${r.mt} mT at ${r.rin} cm, and ${r.rin} × ${r.rout} = ${r.a}².`;
    case 'xpt':
      return r.same
        ? `Exhaust on target! Currents the same way have opposing fields between them, which cancel where I₁/x = I₂/(d − x): x = d I₁/(I₁ + I₂) = ${r.d} × ${r.I1} ÷ ${r.I1 + r.I2} = ${r.x} cm, nearer the smaller current.`
        : `Exhaust on target! With opposite currents the fields cancel only outside, beyond the smaller current, where I₁/x = I₂/(x − d): x = d I₁/(I₁ − I₂) = ${r.d} × ${r.I1} ÷ ${r.I1 - r.I2} = ${r.x} cm.`;
    case 'sol': return `Plasma current started! n = ${r.layers} × ${r.per} ÷ ${fmt(r.L / 100)} m = ${fmt(solTurnsPerM(r, r.L))} turns per metre, and B = μ₀nI = 4π × 10⁻⁷ × ${fmt(solTurnsPerM(r, r.L))} × ${r.I} = ${r.mt} mT, the same everywhere inside.`;
    case 'tor': return `Plasma held! A circle inside the winding encloses N turns of current, so B = μ₀NI/2πr and r = 2 × 10⁻⁷ × ${r.N} × ${r.I} ÷ ${fmt(r.mt / 1000)} = ${fmt(r.r / 100)} m. In the hole a circle encloses no current, so B = 0 there.`;
  }
}

// ---- the probe readout (the helper) ----
export const LCD_OFF = '— — —';
export function lcdText(r: Round, v: Values): string {
  switch (r.kind) {
    case 'bus': return `${fmt(busUT(r.I, v.r!))} µT ${ARROW[fieldAt(r.cur, v.side!)]}`;
    case 'col': return `in ${fmt(inMT(r, v.rin!))} · out ${fmt(outMT(r, v.rout!))} mT`;
    case 'xpt': return `net ${fmt(Math.abs(netMT(r, v.x!)))} mT`;
    case 'sol': return `inside ${fmt(solMT(r, v.L!))} mT`;
    case 'tor': return `${torRegion(r, v.r!)} ${fmt(torMT(r, v.r!))} mT`;
  }
}
