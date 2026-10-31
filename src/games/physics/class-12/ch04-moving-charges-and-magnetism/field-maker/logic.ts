// Rules, pools, judging and words for "Turtle Compass" (field-maker). Pure: no DOM, no canvas, no Math.random.
// Units: lengths in cm in the pools, fields in nT (level 1) or µT (levels 2 to 5), currents in A.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const MU0 = 4 * Math.PI * 1e-7; // T m/A
const DEG = Math.PI / 180;

export interface TrimRow { dl: number; r: number; th: 30 | 90 | 150; side: 'north' | 'south'; up: boolean; nt: number; dir: 0 | 1; i: number }
// dl and r in cm; th, the angle from the wire's +x direction to the line to the probe; side: where the probe is from the wire
// (north = up the screen); nt, the calibration field in nT (up = out of the tank floor). Answer: dir (1 = current →) and i (A).
export interface CoilRow { i: number; R: number; ut: number; up: boolean; sense: 0 | 1; n: number }
// i in A, R in cm, ut in µT. Answer: sense (1 = anticlockwise seen from above) and n turns.
export interface ArcRow { i: number; R: number; ut: number; up: boolean; sense: 0 | 1; deg: number }
// Answer: sense and deg, the arc's angle (the arc always starts at the east end and runs anticlockwise on screen).
export interface AxisRow { R: number; x: number; i: number; ut: number; up: boolean; sense: 0 | 1; n: number }
// x, the tank's height above the coil on its axis, in cm. Answer: sense and n.
export interface PairRow { n1: number; R1: number; s1: 0 | 1; R2: number; i: number; ut: number; up: boolean; sense: 0 | 1; n: number }
// The inner coil (n1 turns, R1 cm, sense s1) is fixed; both coils carry i. Answer: the outer coil's sense and n.

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'trim'; assist: Assist } & TrimRow)
  | ({ kind: 'coil'; assist: Assist } & CoilRow)
  | ({ kind: 'arc'; assist: Assist } & ArcRow)
  | ({ kind: 'axis'; assist: Assist } & AxisRow)
  | ({ kind: 'pair'; assist: Assist } & PairRow);

export const TRIM: TrimRow[][] = [
  [
    { dl: 1, r: 50, th: 90, side: 'north', up: true, nt: 40, dir: 1, i: 10 }, { dl: 2, r: 40, th: 90, side: 'south', up: true, nt: 100, dir: 0, i: 8 },
    { dl: 1, r: 25, th: 90, side: 'north', up: false, nt: 80, dir: 0, i: 5 }, { dl: 5, r: 100, th: 90, side: 'south', up: false, nt: 60, dir: 1, i: 12 },
  ],
  [
    { dl: 2, r: 50, th: 30, side: 'north', up: false, nt: 60, dir: 0, i: 15 }, { dl: 4, r: 80, th: 150, side: 'south', up: true, nt: 50, dir: 0, i: 16 },
    { dl: 3, r: 60, th: 30, side: 'north', up: true, nt: 75, dir: 1, i: 18 }, { dl: 1, r: 20, th: 150, side: 'south', up: false, nt: 175, dir: 1, i: 14 },
  ],
  [
    { dl: 2.5, r: 50, th: 30, side: 'south', up: true, nt: 120, dir: 0, i: 24 }, { dl: 1.5, r: 30, th: 90, side: 'north', up: false, nt: 333, dir: 0, i: 20 },
    { dl: 4, r: 40, th: 150, side: 'north', up: true, nt: 275, dir: 1, i: 22 }, { dl: 5, r: 50, th: 90, side: 'south', up: false, nt: 120, dir: 1, i: 6 },
  ],
];

export const COIL: CoilRow[][] = [
  [{ i: 0.4, R: 10, ut: 50.3, up: false, sense: 0, n: 20 }, { i: 0.5, R: 15, ut: 52.4, up: true, sense: 1, n: 25 }, { i: 0.2, R: 12, ut: 47.1, up: false, sense: 0, n: 45 }, { i: 0.3, R: 20, ut: 47.1, up: true, sense: 1, n: 50 }],
  [{ i: 0.25, R: 10, ut: 47.1, up: false, sense: 0, n: 30 }, { i: 0.5, R: 25, ut: 50.3, up: true, sense: 1, n: 40 }, { i: 0.4, R: 30, ut: 46.1, up: false, sense: 0, n: 55 }, { i: 0.2, R: 15, ut: 50.3, up: true, sense: 1, n: 60 }],
  [{ i: 1, R: 40, ut: 55, up: false, sense: 0, n: 35 }, { i: 0.75, R: 25, ut: 28.3, up: true, sense: 1, n: 15 }, { i: 0.5, R: 45, ut: 52.4, up: true, sense: 1, n: 75 }, { i: 0.6, R: 45, ut: 54.5, up: false, sense: 0, n: 65 }],
];

export const ARC: ArcRow[][] = [
  [{ i: 12, R: 10, ut: 50.3, up: false, sense: 0, deg: 240 }, { i: 10, R: 12, ut: 39.3, up: true, sense: 1, deg: 270 }, { i: 8, R: 9, ut: 46.5, up: false, sense: 0, deg: 300 }, { i: 9, R: 12, ut: 35.3, up: false, sense: 0, deg: 270 }],
  [{ i: 12, R: 10, ut: 37.7, up: true, sense: 1, deg: 180 }, { i: 9, R: 8, ut: 29.5, up: false, sense: 0, deg: 150 }, { i: 6, R: 5, ut: 25.1, up: true, sense: 1, deg: 120 }, { i: 20, R: 8, ut: 39.3, up: false, sense: 0, deg: 90 }],
  [{ i: 20, R: 24, ut: 48, up: true, sense: 1, deg: 330 }, { i: 40, R: 12, ut: 34.9, up: false, sense: 0, deg: 60 }, { i: 15, R: 20, ut: 27.5, up: true, sense: 1, deg: 210 }, { i: 18, R: 25, ut: 41.5, up: false, sense: 0, deg: 330 }],
];

export const AXIS: AxisRow[][] = [
  [{ R: 12, x: 9, i: 0.5, ut: 53.6, up: false, sense: 0, n: 40 }, { R: 16, x: 12, i: 0.8, ut: 48.3, up: true, sense: 1, n: 30 }, { R: 12, x: 5, i: 0.3, ut: 43.2, up: false, sense: 0, n: 35 }, { R: 20, x: 15, i: 1, ut: 40.2, up: true, sense: 1, n: 25 }],
  [{ R: 15, x: 20, i: 0.5, ut: 54.3, up: false, sense: 0, n: 120 }, { R: 15, x: 8, i: 0.4, ut: 51.8, up: true, sense: 1, n: 45 }, { R: 24, x: 10, i: 1, ut: 41.2, up: false, sense: 0, n: 20 }, { R: 9, x: 12, i: 0.4, ut: 45.2, up: true, sense: 1, n: 75 }],
  [{ R: 20, x: 21, i: 1, ut: 51.5, up: false, sense: 0, n: 50 }, { R: 24, x: 7, i: 0.5, ut: 63.7, up: true, sense: 1, n: 55 }, { R: 10, x: 24, i: 1, ut: 50, up: false, sense: 0, n: 140 }, { R: 18, x: 24, i: 0.8, ut: 51.3, up: true, sense: 1, n: 85 }],
];

// Pool 0: the outer coil adds (same sense, stronger). Pool 1: it takes away (opposite, weaker, same way as the inner coil).
// Pool 2: it overpowers (opposite and stronger: the net field reverses).
export const PAIR: PairRow[][] = [
  [
    { n1: 20, R1: 10, s1: 1, R2: 20, i: 0.35, ut: 60.5, up: true, sense: 1, n: 15 }, { n1: 15, R1: 8, s1: 0, R2: 16, i: 0.3, ut: 58.9, up: false, sense: 0, n: 20 },
    { n1: 10, R1: 6, s1: 1, R2: 15, i: 0.3, ut: 62.8, up: true, sense: 1, n: 25 }, { n1: 25, R1: 12, s1: 0, R2: 24, i: 0.25, ut: 52.4, up: false, sense: 0, n: 30 },
  ],
  [
    { n1: 30, R1: 10, s1: 1, R2: 20, i: 0.4, ut: 31.4, up: true, sense: 0, n: 35 }, { n1: 40, R1: 12, s1: 0, R2: 25, i: 0.3, ut: 28.9, up: false, sense: 1, n: 45 },
    { n1: 25, R1: 8, s1: 1, R2: 18, i: 0.5, ut: 28.4, up: true, sense: 0, n: 40 }, { n1: 50, R1: 15, s1: 0, R2: 30, i: 0.2, ut: 14.7, up: false, sense: 1, n: 65 },
  ],
  [
    { n1: 10, R1: 10, s1: 1, R2: 15, i: 0.4, ut: 58.6, up: false, sense: 0, n: 50 }, { n1: 15, R1: 12, s1: 0, R2: 20, i: 0.4, ut: 37.7, up: true, sense: 1, n: 55 },
    { n1: 20, R1: 15, s1: 1, R2: 25, i: 0.6, ut: 40.2, up: false, sense: 0, n: 60 }, { n1: 10, R1: 8, s1: 0, R2: 16, i: 0.3, ut: 58.9, up: true, sense: 1, n: 70 },
  ],
];

export const DIAL = {
  dir: { min: 0, max: 1, start: 0 }, // L1: 1 = current →, 0 = current ←
  i: { min: 1, max: 30, step: 1, start: 1 }, // L1, A
  sense: { min: 0, max: 1, start: 0 }, // L2 to L5: 1 = anticlockwise ↺ seen from above, 0 = clockwise ↻
  n: { min: 5, max: 150, step: 5, start: 5 }, // L2, L4, L5 turns
  deg: { min: 30, max: 360, step: 30, start: 30 }, // L3 arc angle
};

/** L1: the trim wire's field at the probe, in nT. */
export const trimNT = (r: TrimRow, i: number) => ((1e-7 * i * (r.dl / 100) * Math.sin(r.th * DEG)) / (r.r / 100) ** 2) * 1e9;
/** L1: true when dl × r points up (out of the tank floor) for this current direction. */
export const trimUp = (r: TrimRow, dir: number) => (dir === 1) === (r.side === 'north');
/** The field at the centre of a coil of n turns, radius R cm, current i, in µT (L2; also the inner and outer coils of L5). */
export const centreUT = (n: number, i: number, R: number) => ((MU0 * n * i) / (2 * (R / 100))) * 1e6;
/** L3: an arc of deg degrees. */
export const arcUT = (r: ArcRow, deg: number) => (deg / 360) * centreUT(1, r.i, r.R);
/** L4: on the axis, x cm from the centre. */
export const axisUT = (r: AxisRow, n: number) => ((MU0 * n * r.i * (r.R / 100) ** 2) / (2 * ((r.R / 100) ** 2 + (r.x / 100) ** 2) ** 1.5)) * 1e6;
/** L4: the fraction of the centre value that reaches the tank. */
export const axisFraction = (r: AxisRow) => r.R ** 3 / (r.R ** 2 + r.x ** 2) ** 1.5;
/** L5: the inner coil alone, and the signed net field (positive = up) with the outer coil set to (sense, n). */
export const innerUT = (r: PairRow) => centreUT(r.n1, r.i, r.R1);
export const netUT = (r: PairRow, sense: number, n: number) => innerUT(r) * (r.s1 ? 1 : -1) + centreUT(n, r.i, r.R2) * (sense ? 1 : -1);

const POOLS = [TRIM, COIL, ARC, AXIS, PAIR] as unknown[][][];
const KINDS = ['trim', 'coil', 'arc', 'axis', 'pair'] as const;
/** Three rounds for a level, one row from each of the level's three pools. This must be the first use of `random` in the level. */
export function buildRounds(level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] {
  return POOLS[level - 1].map((pool, k) => ({ ...(pick(pool, random) as object), kind: KINDS[level - 1], assist: aid(k) }) as Round);
}

export type Fault = 'flip' | 'weak' | 'strong';
export type Values = { dir?: number; i?: number; sense?: number; n?: number; deg?: number };

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'trim':
      if (trimUp(r, x.dir!) !== r.up) return 'flip';
      return x.i === r.i ? null : x.i! < r.i ? 'weak' : 'strong';
    case 'coil':
    case 'axis':
      if ((x.sense === 1) !== r.up) return 'flip';
      return x.n === r.n ? null : x.n! < r.n ? 'weak' : 'strong';
    case 'arc':
      if ((x.sense === 1) !== r.up) return 'flip';
      return x.deg === r.deg ? null : x.deg! < r.deg ? 'weak' : 'strong';
    case 'pair': {
      const b = netUT(r, x.sense!, x.n!);
      if (Math.abs(b) < 1e-9 || (b > 0) !== r.up) return 'flip'; // one pool-0 row nets exactly zero with the other sense
      if (x.sense === r.sense && x.n === r.n) return null;
      return Math.abs(b) < r.ut ? 'weak' : 'strong';
    }
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;

// ---- words ----
export const upWord = (up: boolean) => (up ? '⊙ up' : '⊗ down');
export const senseWord = (s: number) => (s ? 'anticlockwise ↺' : 'clockwise ↻');
export const dirWord = (d: number) => (d ? 'flowing →' : 'flowing ←');
/** The angle between the wire and the line to the probe (150° rows are 30° on the other side). */
export const angleOf = (r: TrimRow) => (r.th === 90 ? 90 : 30);

export function goal(r: Round): string {
  switch (r.kind) {
    case 'trim': return `Calibrate the probe: ${r.nt} nT ${upWord(r.up)}`;
    case 'coil':
    case 'arc': return `Home field: ${r.ut} µT ${upWord(r.up)}`;
    case 'axis': return `Raised tank: ${r.ut} µT ${upWord(r.up)}`;
    case 'pair': return `Two coils: ${r.ut} µT ${upWord(r.up)}`;
  }
}

export function card(r: Round): string[] {
  switch (r.kind) {
    case 'trim': return [`trim wire ${r.dl} cm long`, `${r.r} cm from the probe`, `wire to probe line: ${angleOf(r)}°`];
    case 'coil': return [`coil radius ${r.R} cm`, `current ${r.i} A`];
    case 'arc': return [`arc radius ${r.R} cm`, `current ${r.i} A`, 'leads point at the centre'];
    case 'axis': return [`coil radius ${r.R} cm`, `current ${r.i} A`, `tank ${r.x} cm above the coil`];
    case 'pair': return [`inner coil alone: ${fmt(innerUT(r))} µT ${upWord(!!r.s1)}`, `outer coil radius ${r.R2} cm`, `current ${r.i} A in each coil`];
  }
}

export function intel(r: Round): string {
  switch (r.kind) {
    case 'trim':
      return `A ${r.dl} cm trim wire lies ${r.r} cm from the probe, ${r.side === 'north' ? 'south' : 'north'} of it, and the line from the wire to the probe makes ${angleOf(r)}° with the wire. The probe must read ${r.nt} nT, ${upWord(r.up)}.`;
    case 'coil':
      return `The coil has a radius of ${r.R} cm and carries ${r.i} A. Nui’s home field is ${r.ut} µT, ${upWord(r.up)}.`;
    case 'arc':
      return `The arc has a radius of ${r.R} cm and carries ${r.i} A; its straight leads point at the centre. Nui’s home field is ${r.ut} µT, ${upWord(r.up)}.`;
    case 'axis':
      return `The coil has a radius of ${r.R} cm and carries ${r.i} A. The tank sits ${r.x} cm above it, on its axis. The home field there is ${r.ut} µT, ${upWord(r.up)}.`;
    case 'pair':
      return `Alone, the inner coil makes ${fmt(innerUT(r))} µT, ${upWord(!!r.s1)}. The outer coil has a radius of ${r.R2} cm and the same ${r.i} A. The home field is ${r.ut} µT, ${upWord(r.up)}.`;
  }
}

export const hintText = (r: Round) =>
  `${intel(r)} ${r.assist === 0 ? 'Round 1: the field meter is live.' : r.assist === 1 ? 'The meter is off: a meter check costs a charge.' : 'Last trial: no meter.'}`;

export function missText(r: Round, x: Values): string {
  const f = fault(r, x);
  switch (r.kind) {
    case 'trim':
      if (f === 'flip') return `With the current ${dirWord(x.dir!)}, dl × r made the field point the other way at the probe: the needle swung backwards. Reverse the current.`;
      return f === 'weak'
        ? `At ${x.i} A the field at the probe was too small: the needle stopped short of the mark. Use more current.`
        : `At ${x.i} A the field at the probe was too big: the needle overshot the mark. Use less current.`;
    case 'coil':
      if (f === 'flip') return `With the current ${senseWord(x.sense!)}, the field pointed the other way: that is the other hemisphere’s field, and Nui swam in circles. Reverse the current.`;
      return f === 'weak'
        ? `With ${x.n} turns the field at the centre was too weak: Nui swam for the shallows. Wind more turns.`
        : `With ${x.n} turns the field at the centre was too strong: Nui swam for the rocks. Wind fewer turns.`;
    case 'arc':
      if (f === 'flip') return `With the current ${senseWord(x.sense!)}, the arc’s field pointed the other way: Nui swam in circles. Reverse the current.`;
      return f === 'weak'
        ? `A ${x.deg}° arc gave too small a share of the loop’s field: Nui swam for the shallows. Bend a longer arc.`
        : `A ${x.deg}° arc gave too big a share of the loop’s field: Nui swam for the rocks. Bend a shorter arc.`;
    case 'axis':
      if (f === 'flip') return `With the current ${senseWord(x.sense!)}, the field at the raised tank pointed the other way: Nui swam in circles. Reverse the current.`;
      return f === 'weak'
        ? `With ${x.n} turns the field up at the tank was too weak: Nui swam for the shallows. Wind more turns.`
        : `With ${x.n} turns the field up at the tank was too strong: Nui swam for the rocks. Wind fewer turns.`;
    case 'pair':
      if (f === 'flip') return `With the outer coil ${senseWord(x.sense!)} and ${x.n} turns, the two fields together pointed the wrong way: Nui swam in circles. Think about which coil wins.`;
      return f === 'weak'
        ? `With the outer coil ${senseWord(x.sense!)} and ${x.n} turns, the net field was too weak: Nui swam for the shallows. Make the net field stronger.`
        : `With the outer coil ${senseWord(x.sense!)} and ${x.n} turns, the net field was too strong: Nui swam for the rocks. Make the net field weaker.`;
  }
}

export function meterText(r: Round, x: Values): string {
  switch (r.kind) {
    case 'trim': return `Meter check: ${x.i} A ${dirWord(x.dir!)} makes ${fmt(trimNT(r, x.i!))} nT at the probe, ${upWord(trimUp(r, x.dir!))}.`;
    case 'coil': return `Meter check: ${x.n} turns ${senseWord(x.sense!)} make ${fmt(centreUT(x.n!, r.i, r.R))} µT at the centre, ${upWord(x.sense === 1)}.`;
    case 'arc': return `Meter check: a ${x.deg}° arc ${senseWord(x.sense!)} makes ${fmt(arcUT(r, x.deg!))} µT at the centre, ${upWord(x.sense === 1)}.`;
    case 'axis': return `Meter check: ${x.n} turns ${senseWord(x.sense!)} make ${fmt(axisUT(r, x.n!))} µT at the raised tank, ${upWord(x.sense === 1)}.`;
    case 'pair': {
      const b = netUT(r, x.sense!, x.n!);
      return `Meter check: with the outer coil ${senseWord(x.sense!)} and ${x.n} turns, the net field is ${fmt(Math.abs(b))} µT, ${upWord(b > 0)}.`;
    }
  }
}

export function winText(r: Round): string {
  switch (r.kind) {
    case 'trim':
      return `Calibrated! dB = (μ₀/4π) I dl sin θ/r² = 10⁻⁷ × ${r.i} × ${fmt(r.dl / 100)} × sin ${angleOf(r)}° ÷ ${fmt(r.r / 100)}² = ${r.nt} nT. With the current ${dirWord(r.dir)}, dl × r points ${r.up ? 'up' : 'down'} at the probe.`;
    case 'coil':
      return `Nui swims for the open sea! B = μ₀NI/2R, so N = 2RB/μ₀I = 2 × ${fmt(r.R / 100)} × ${r.ut} × 10⁻⁶ ÷ (4π × 10⁻⁷ × ${r.i}) = ${r.n} turns. Curl your right fingers ${r.sense ? 'anticlockwise' : 'clockwise'} and the thumb points ${r.up ? 'up' : 'down'}.`;
    case 'arc':
      return `Nui swims for the open sea! The straight leads point at the centre, so dl × r = 0 and they add nothing. A ${r.deg}° arc gives ${r.deg}/360 of μ₀I/2R = ${fmt(centreUT(1, r.i, r.R))} µT, which is ${r.ut} µT, ${r.up ? 'up' : 'down'} for a current ${r.sense ? 'anticlockwise' : 'clockwise'}.`;
    case 'axis':
      return `Nui swims for the open sea! On the axis B = μ₀NIR²/2(R² + x²)^(3/2), only ${fmt(axisFraction(r))} of the centre value μ₀NI/2R, so it takes ${r.n} turns to make ${r.ut} µT ${r.x} cm up.`;
    case 'pair':
      return `Nui swims for the open sea! The inner coil gives ${fmt(innerUT(r))} µT ${r.s1 ? 'up' : 'down'}, and the outer coil, ${r.n} turns ${r.sense === r.s1 ? 'the same way, adds' : 'the opposite way, takes away'} ${fmt(centreUT(r.n, r.i, r.R2))} µT. Net: ${r.ut} µT, ${r.up ? 'up' : 'down'}.`;
  }
}

// ---- the field meter helper ----
export const LCD_OFF = '— — —';
export function lcdText(r: Round, v: Values): string {
  switch (r.kind) {
    case 'trim': return `${fmt(trimNT(r, v.i!))} nT ${upWord(trimUp(r, v.dir!))}`;
    case 'coil': return `${fmt(centreUT(v.n!, r.i, r.R))} µT ${upWord(v.sense === 1)}`;
    case 'arc': return `${fmt(arcUT(r, v.deg!))} µT ${upWord(v.sense === 1)}`;
    case 'axis': return `${fmt(axisUT(r, v.n!))} µT ${upWord(v.sense === 1)}`;
    case 'pair': return `net ${fmt(Math.abs(netUT(r, v.sense!, v.n!)))} µT ${upWord(netUT(r, v.sense!, v.n!) > 0)}`;
  }
}

/** Seconds into the trial at which the verdict lands. */
export const verdictDelay = (r: Round) => (r.kind === 'trim' ? 0.9 : 1.2);
