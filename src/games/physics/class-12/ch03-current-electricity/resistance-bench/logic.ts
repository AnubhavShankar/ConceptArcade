// Rules for "Line Down" (the rebuilt Resistance Bench): a lineworker finds a short on a power line by Ohm's law, finds a corroded
// joint by its V-I trace, reads a wire's resistance from its metal and size, handles a stretched span, and sets a resistor's colour bands.
// Pure functions only: no DOM, no canvas. Randomness comes from the `random` argument.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const LINE_KM = 12; // the line runs 12 km from the substation to the village
export const JKM = [1, 2.5, 4, 5.5, 7, 8.5, 10, 11.5]; // level 2: where joints J1 to J8 sit, in km
export const COL = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'] as const;
export const ABBR = ['Bk', 'Br', 'Rd', 'Or', 'Ye', 'Gn', 'Bu', 'Vi', 'Gy', 'Wh'] as const; // the swatch labels (colour is never the only cue)

export interface BreakRow { V: number; i: number; unit: 'A' | 'mA'; ohm: number; wire: boolean; d: number } // wire: ohm is per wire (boss), else per km of line; d: answer km
export interface JointRow { bad: number; shape: 'bend' | 'oneway' | 'offset'; g: number[] } // bad: answer joint 1..8; g: each joint's conductance in A/V for its trace
export interface WireRow { metal?: 'copper' | 'aluminium'; rho?: number; A?: number; half?: true; ohm?: number; s?: number; R: number; d: number } // rho in 1e-8 Ω m, A in mm²; half: loop ohm per km up to km s, 4 × ohm beyond
export interface SlideRow { R: number; a: number; k: number; d: number } // 1 Ω per km of line; the span from km a to a + 1 is stretched k times
export interface BandRow { V: number; mA: number; d1: number; d2: number; m: number } // answer: bands d1, d2 and multiplier m

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'break'; assist: Assist } & BreakRow)
  | ({ kind: 'joint'; assist: Assist } & JointRow)
  | ({ kind: 'wire'; assist: Assist } & WireRow)
  | ({ kind: 'slide'; assist: Assist } & SlideRow)
  | ({ kind: 'bands'; assist: Assist } & BandRow);

// R = V/I (mA rows divide by 1000); d = R ÷ loop ohms per km, where the loop is ohm (wire: false) or 2 × ohm (wire: true, the boss).
export const BREAK: BreakRow[][] = [
  [{ V: 12, i: 2, unit: 'A', ohm: 1, wire: false, d: 6 }, { V: 12, i: 3, unit: 'A', ohm: 0.5, wire: false, d: 8 }, { V: 24, i: 4, unit: 'A', ohm: 2, wire: false, d: 3 },
   { V: 6, i: 1.5, unit: 'A', ohm: 0.4, wire: false, d: 10 }, { V: 9, i: 2, unit: 'A', ohm: 1, wire: false, d: 4.5 }],
  [{ V: 1.5, i: 500, unit: 'mA', ohm: 0.6, wire: false, d: 5 }, { V: 2.8, i: 400, unit: 'mA', ohm: 1, wire: false, d: 7 }, { V: 3, i: 800, unit: 'mA', ohm: 1.5, wire: false, d: 2.5 },
   { V: 4.5, i: 625, unit: 'mA', ohm: 0.8, wire: false, d: 9 }, { V: 1.1, i: 250, unit: 'mA', ohm: 0.8, wire: false, d: 5.5 }],
  [{ V: 12, i: 0.8, unit: 'A', ohm: 1, wire: true, d: 7.5 }, { V: 6, i: 1.5, unit: 'A', ohm: 0.5, wire: true, d: 4 }, { V: 1.3, i: 200, unit: 'mA', ohm: 0.5, wire: true, d: 6.5 },
   { V: 5.1, i: 300, unit: 'mA', ohm: 1, wire: true, d: 8.5 }],
];

// Round 1 'bend' (curves upward), round 2 'oneway' (conducts one way only), round 3 'offset' (straight but misses the origin).
export const JOINT: JointRow[][] = [
  [{ bad: 2, shape: 'bend', g: [1.2, 0.8, 1.5, 0.6, 1, 1.3, 0.7, 1.1] }, { bad: 5, shape: 'bend', g: [0.9, 1.4, 0.6, 1.1, 1.2, 0.8, 1.5, 0.7] }],
  [{ bad: 3, shape: 'oneway', g: [0.7, 1.3, 1.2, 0.9, 1.5, 0.6, 1.1, 1] }, { bad: 6, shape: 'oneway', g: [1.4, 0.6, 1, 1.2, 0.8, 1.3, 0.9, 1.1] }],
  [{ bad: 4, shape: 'offset', g: [1, 1.2, 0.7, 1.3, 0.9, 1.5, 0.6, 1.4] }, { bad: 7, shape: 'offset', g: [0.8, 1.1, 1.4, 0.6, 1.3, 1, 1.2, 0.9] }],
];

// Metal rows: loop ohms per km = 20 × rho ÷ A (rho in 1e-8 Ω m, A in mm², two wires of 1000 m each). Half rows: ohm per km (loop) up to km s, 4 × ohm beyond.
export const WIRE: WireRow[][] = [
  [{ metal: 'copper', rho: 1.7, A: 17, R: 9, d: 4.5 }, { metal: 'copper', rho: 1.7, A: 34, R: 6, d: 6 }, { metal: 'copper', rho: 1.7, A: 8.5, R: 12, d: 3 }, { metal: 'copper', rho: 1.7, A: 68, R: 4, d: 8 }],
  [{ metal: 'aluminium', rho: 2.8, A: 28, R: 10, d: 5 }, { metal: 'aluminium', rho: 2.8, A: 56, R: 7, d: 7 }, { metal: 'aluminium', rho: 2.8, A: 35, R: 16, d: 10 }, { metal: 'aluminium', rho: 2.8, A: 70, R: 4.4, d: 5.5 }],
  [{ half: true, ohm: 0.5, s: 4, R: 9, d: 7.5 }, { half: true, ohm: 1, s: 3, R: 17, d: 6.5 }, { half: true, ohm: 0.25, s: 6, R: 4.5, d: 9 }, { half: true, ohm: 0.5, s: 2, R: 14, d: 8.5 }],
];

// 1 Ω of loop resistance per km; the span from km a to a + 1 has k² Ω. Round 3 mixes shorts past the landslide with shorts before it (R < a).
export const SLIDE: SlideRow[][] = [
  [{ R: 7.44, a: 3, k: 1.2, d: 7 }, { R: 9.96, a: 5, k: 1.4, d: 9 }, { R: 5.44, a: 2, k: 1.2, d: 5 }, { R: 6.46, a: 4, k: 1.4, d: 5.5 }],
  [{ R: 8.69, a: 2, k: 1.3, d: 8 }, { R: 6.21, a: 3, k: 1.1, d: 6 }, { R: 10.69, a: 6, k: 1.3, d: 10 }, { R: 4.71, a: 1, k: 1.1, d: 4.5 }],
  [{ R: 3.5, a: 6, k: 1.3, d: 3.5 }, { R: 8.46, a: 1, k: 1.4, d: 7.5 }, { R: 2.5, a: 8, k: 1.2, d: 2.5 }, { R: 11.44, a: 7, k: 1.2, d: 11 }],
];

// R = V ÷ (mA / 1000) = (10 d1 + d2) × 10^m Ω.
export const BANDS: BandRow[][] = [
  [{ V: 9.4, mA: 2, d1: 4, d2: 7, m: 2 }, { V: 6.6, mA: 20, d1: 3, d2: 3, m: 1 }, { V: 3.4, mA: 5, d1: 6, d2: 8, m: 1 }, { V: 11, mA: 5, d1: 2, d2: 2, m: 2 }],
  [{ V: 2.8, mA: 0.5, d1: 5, d2: 6, m: 2 }, { V: 5.4, mA: 20, d1: 2, d2: 7, m: 1 }, { V: 9.9, mA: 0.3, d1: 3, d2: 3, m: 3 }, { V: 4.1, mA: 5, d1: 8, d2: 2, m: 1 }],
  [{ V: 4.7, mA: 0.1, d1: 4, d2: 7, m: 3 }, { V: 13.6, mA: 2, d1: 6, d2: 8, m: 2 }, { V: 6.6, mA: 0.3, d1: 2, d2: 2, m: 3 }, { V: 7.5, mA: 0.1, d1: 7, d2: 5, m: 3 }],
];

export const DIAL = {
  d: { min: 0, max: 12, step: 0.5, start: 0 }, // levels 1, 3, 4: truck position in km (0 is the substation)
  j: { min: 1, max: 8, step: 1, start: 1 }, // level 2: joint
  b1: { min: 1, max: 9, step: 1, start: 1 }, // level 5: first band (never black)
  b2: { min: 0, max: 9, step: 1, start: 0 }, // level 5: second band
  m: { min: 0, max: 6, step: 1, start: 0 }, // level 5: multiplier, black (10⁰) to blue (10⁶)
};

export const amps = (r: BreakRow) => (r.unit === 'mA' ? r.i / 1000 : r.i);
export const loopOhm = (r: BreakRow) => (r.wire ? 2 * r.ohm : r.ohm);
/** Level 3 metal rows: loop ohms per km of line. */
export const metalLoop = (r: WireRow) => (20 * r.rho!) / r.A!;
/** The tester reading a short at road km d would give (levels 1, 3, 4). It rises with d. */
export function readingAt(r: Round, d: number): number {
  if (r.kind === 'break') return loopOhm(r) * d;
  if (r.kind === 'wire') {
    if (!r.half) return metalLoop(r) * d;
    return d <= r.s! ? r.ohm! * d : r.ohm! * r.s! + 4 * r.ohm! * (d - r.s!);
  }
  if (r.kind === 'slide') {
    if (d <= r.a) return d;
    if (d >= r.a + 1) return d - 1 + r.k * r.k;
    return r.a + r.k * r.k * (d - r.a);
  }
  return 0;
}
/** The tester's reading for the round (the given fact). */
export const testerR = (r: Round) => (r.kind === 'break' ? r.V / amps(r) : r.kind === 'wire' || r.kind === 'slide' ? r.R : 0);

/** Level 2: the current through joint j (1..8) at V volts, for its card's trace and the helper. */
export function jointI(r: JointRow, j: number, V: number): number {
  const g = r.g[j - 1];
  const kind = j === r.bad ? r.shape : 'ohmic';
  if (kind === 'bend') return g * V * (1 + 0.3 * V * V);
  if (kind === 'oneway') return V >= 0 ? g * V : 0.1 * g * V;
  if (kind === 'offset') return g * (V - 0.5);
  return g * V;
}
/** Level 2: V/I of joint j at +2 V and at −1 V (equal for an ohmic joint). */
export const jointVI = (r: JointRow, j: number) => ({ plus: 2 / jointI(r, j, 2), minus: -1 / jointI(r, j, -1) });

/** Level 5: the value the bands make, in ohms. */
export const bandValue = (b1: number, b2: number, m: number) => (10 * b1 + b2) * 10 ** m;
export const wantValue = (r: BandRow) => bandValue(r.d1, r.d2, r.m);
/** Ohms written the way a resistor label is: 330 Ω, 4.7 kΩ, 47 kΩ. */
export const ohms = (R: number) => (R >= 1e6 ? `${fmt(R / 1e6)} MΩ` : R >= 1e3 ? `${fmt(R / 1e3)} kΩ` : `${fmt(R)} Ω`);

export function buildRounds(level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] {
  const pools = [BREAK, JOINT, WIRE, SLIDE, BANDS][level - 1] as unknown[][];
  const kind = (['break', 'joint', 'wire', 'slide', 'bands'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'near' | 'far' | 'sound' | 'low' | 'high';
export type Values = { d?: number; j?: number; b1?: number; b2?: number; m?: number };

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'joint':
      return x.j === r.bad ? null : 'sound';
    case 'bands': {
      const v = bandValue(x.b1!, x.b2!, x.m!);
      const want = wantValue(r);
      return v === want ? null : v < want ? 'low' : 'high';
    }
    default:
      return x.d === r.d ? null : x.d! < r.d ? 'near' : 'far'; // near: the short is farther out than the truck
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
/** The moment of the verdict, in seconds after Fire (6.3 to 6.5). */
export const verdictDelay = (r: Round) => (r.kind === 'joint' ? 1.45 : r.kind === 'bands' ? 0.65 : 0.95);

// ---- words ----
const unitI = (r: BreakRow) => `${r.i} ${r.unit}`;

/** The goal line on the canvas, at most 40 characters. */
export function goalText(r: Round): string {
  switch (r.kind) {
    case 'break': return `Find the short: ${r.V} V drives ${unitI(r)}`;
    case 'joint': return 'Find the corroded joint';
    case 'wire':
    case 'slide': return `Find the short: the tester reads ${r.R} Ω`;
    default: return `Pump resistor: ${r.V} V at ${r.mA} mA`;
  }
}

/** The line card: the given facts besides the goal line. */
export function cardText(r: Round): string {
  if (r.kind === 'break') return r.wire ? `${r.ohm} Ω per km in each wire` : `${r.ohm} Ω per km of line`;
  if (r.kind === 'wire') return r.half ? `${r.ohm} Ω per km of line` : `${r.metal} · ρ = ${r.rho} × 10⁻⁸ Ω m · ${r.A} mm²`;
  return '';
}

/** The facts in words, used in the hint line. */
export function intel(r: Round): string {
  switch (r.kind) {
    case 'break':
      return `Tester at the substation: ${r.V} V drives ${unitI(r)} round the short. ${r.wire ? `Each wire has ${r.ohm} Ω per km, and the test current runs out on one wire and back on the other.` : `The line has ${r.ohm} Ω of loop resistance per km.`}`;
    case 'joint':
      return 'Each card traces its joint’s current from −2 V to +2 V. One joint is corroded.';
    case 'wire':
      return r.half
        ? `The tester reads ${r.R} Ω. The line has ${r.ohm} Ω of loop resistance per km up to km ${r.s}; beyond it the wire has half the radius.`
        : `The tester reads ${r.R} Ω. This line is ${r.metal}, ρ = ${r.rho} × 10⁻⁸ Ω m, with ${r.A} mm² in each wire, and the test current goes out and back.`;
    case 'slide':
      return `The tester reads ${r.R} Ω. The line has 1 Ω of loop resistance per km, but the landslide stretched the span from km ${r.a} to km ${r.a + 1} to ${r.k} times its length.`;
    default:
      return `The burnt resistor dropped ${r.V} V at ${r.mA} mA.`;
  }
}

export const hintText = (r: Round) =>
  `${intel(r)} ${r.assist === 0 ? 'Round 1: the tester screen is live.' : r.assist === 1 ? 'The tester screen is off: a tester check costs a charge.' : 'Storm at its worst: no tester screen.'}`;

/** After a miss: direction only, naming only the player's own choice. */
export function missText(r: Round, x: Values): string {
  switch (fault(r, x)) {
    case 'near': return `At km ${x.d} the line was clear: the short is farther out. A bigger reading means more line between the tester and the short. Drive farther out.`;
    case 'far': return `At km ${x.d} the line was clear: the short is nearer the substation. A smaller reading means less line between the tester and the short. Drive back.`;
    case 'sound': return `Joint ${x.j} was sound: its trace is a straight line through the origin, so its V/I never changes. The corroded joint stayed on the line and the breaker tripped. Try another joint.`;
    case 'low': return `Your bands made ${ohms(bandValue(x.b1!, x.b2!, x.m!))}: too little resistance, so too much current flowed and the pump’s fuse blew. Use a bigger value.`;
    case 'high': return `Your bands made ${ohms(bandValue(x.b1!, x.b2!, x.m!))}: too much resistance, so too little current flowed and the pump’s relay never clicked. Use a smaller value.`;
    default: return '';
  }
}

/** The tester check, which costs a charge. */
export function meterText(r: Round, x: Values): string {
  if (r.kind === 'joint') return `Tester check: joint ${x.j} gives V/I = ${fmt(jointVI(r, x.j!).plus)} Ω at +2 V and ${fmt(jointVI(r, x.j!).minus)} Ω at −1 V.`;
  if (r.kind === 'bands') return `Tester check: your bands make ${ohms(bandValue(x.b1!, x.b2!, x.m!))}.`;
  return `Tester check: a short at km ${x.d} would read ${fmt(readingAt(r, x.d!))} Ω.`;
}

export const LCD_OFF = '— — —';
/** The tester screen text (the helper). */
export function lcdText(r: Round, v: Values): string {
  if (r.kind === 'joint') return `J${v.j}: ${fmt(jointVI(r, v.j!).plus)} Ω at +2 V · ${fmt(jointVI(r, v.j!).minus)} Ω at −1 V`;
  if (r.kind === 'bands') return `your bands: ${ohms(bandValue(v.b1!, v.b2!, v.m!))}`;
  return `short here: ${fmt(readingAt(r, v.d!))} Ω`;
}

/** After a win: two or three short sentences of working. */
export function winText(r: Round): string {
  switch (r.kind) {
    case 'break':
      return `Lights on! R = V/I = ${r.V} V ÷ ${unitI(r)} = ${fmt(testerR(r))} Ω. ${r.wire ? `Out and back makes 2 × ${r.ohm} = ${fmt(2 * r.ohm)} Ω per km of line` : `At ${r.ohm} Ω per km`}, the short is ${fmt(testerR(r))} ÷ ${fmt(loopOhm(r))} = ${r.d} km out.`;
    case 'joint':
      return `Health centre on! Joint ${r.bad}’s trace ${r.shape === 'bend' ? 'curved upward' : r.shape === 'oneway' ? 'carried current one way only' : 'was straight but missed the origin, because the wet joint made a small voltage of its own'}: its V/I changes, so it does not obey Ohm’s law. A sound joint gives a straight line through the origin.`;
    case 'wire':
      return r.half
        ? `School lights on! Half the radius is a quarter of the area, so beyond km ${r.s} the line has 4 × ${r.ohm} = ${fmt(4 * r.ohm!)} Ω per km. ${r.R} = ${r.ohm} × ${r.s} + ${fmt(4 * r.ohm!)} × (d − ${r.s}) gives d = ${r.d} km.`
        : `School lights on! Each wire has R = ρl/A = ${r.rho} × 10⁻⁸ × 1000 ÷ (${r.A} × 10⁻⁶) = ${fmt(metalLoop(r) / 2)} Ω per km, so the loop has ${fmt(metalLoop(r))} Ω per km and the short is ${r.R} ÷ ${fmt(metalLoop(r))} = ${r.d} km out.`;
    case 'slide':
      return r.d > r.a
        ? `Market lights on! The stretched span is ${r.k} times longer and ${r.k} times thinner, so it has ${r.k}² = ${fmt(r.k * r.k)} Ω instead of 1. ${r.R} − ${fmt(r.k * r.k)} = ${fmt(r.R - r.k * r.k)} Ω is the other ${fmt(r.d - 1)} km, so d = ${r.d} km. Its resistivity never changed.`
        : `Market lights on! The tester read ${r.R} Ω, less than the ${r.a} Ω of line up to the landslide, so the short is before it: d = ${r.d} km. The stretched span lies beyond the short and played no part.`;
    default:
      return `Water’s flowing! R = V/I = ${r.V} V ÷ ${r.mA} mA = ${ohms(wantValue(r))} = ${10 * r.d1 + r.d2} × 10^${r.m} Ω: ${COL[r.d1]}, ${COL[r.d2]}, ${COL[r.m]}.`;
  }
}
