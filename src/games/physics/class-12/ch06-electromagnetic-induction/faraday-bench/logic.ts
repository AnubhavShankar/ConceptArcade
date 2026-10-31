// Rules for "The Deep-Sea Beacon" (Faraday's law, chapter 6). Pure functions: the pools, the physics of each dive, the judging, the timing and every piece of text.
// Level 1 (Pad switch-off): the hoop's tilt. Level 2 (The charging sleeve): the ring's radius. Level 3 (The flip): the flip time. Level 4 (The flux program): the number of turns.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const MU0 = 4 * Math.PI * 1e-7;
export const DT1 = 0.5; // s: in level 1 the pad dies in 0.5 s (every row)
export const DT2 = 0.2; // s: in level 2 Tug ramps the current in 0.2 s (every row)
export const NR = 200; // turns on the level 2 ring (every row)
/** Wink's glow: fixed values, never proportional to the player's emf. */
export const GLOW = { dim: 0.25, blown: 0.6, win: 1 } as const;
export const LCD_OFF = '— — —';

export interface OutRow { n: number; b: number; a: number; vb: number; th: number } // L1: a in cm², vb in V; answer th in degrees
export interface TubeRow { n: number; i1: number; i2: number; vb: number; r: number } // L2: n per cm, currents in A, vb in V; answer r in cm
export interface FlipRow { n: number; b: number; rc: number; R: number; ma: number; t: number } // L3: hoop radius rc in cm, R in ohms, ma in mA; answer t in s
export interface ShowRow { phi: [number, number, number, number]; vb: number; n: number } // L4: flux per turn in mWb at t = 0, 1, 2, 3 s, vb in V; answer n turns

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'out'; assist: Assist } & OutRow)
  | ({ kind: 'tube'; assist: Assist } & TubeRow)
  | ({ kind: 'flip'; assist: Assist } & FlipRow)
  | ({ kind: 'show'; assist: Assist } & ShowRow);

// ---- the pools (every row was checked by script) ------------------------------------------------------------------------------------------------------------

export const OUT: OutRow[][] = [
  [
    { n: 50, b: 0.4, a: 500, vb: 1, th: 60 }, { n: 40, b: 0.5, a: 600, vb: 1.7, th: 45 }, { n: 100, b: 0.3, a: 500, vb: 2.6, th: 30 },
    { n: 80, b: 0.25, a: 400, vb: 0.8, th: 60 }, { n: 60, b: 0.5, a: 300, vb: 1.27, th: 45 },
  ],
  [
    { n: 50, b: 0.6, a: 400, vb: 1.84, th: 40 }, { n: 120, b: 0.2, a: 500, vb: 2.18, th: 25 }, { n: 75, b: 0.4, a: 300, vb: 1.03, th: 55 },
    { n: 30, b: 0.5, a: 800, vb: 1.84, th: 40 },
  ],
  [
    { n: 40, b: 0.75, a: 500, vb: 1.93, th: 50 }, { n: 90, b: 0.25, a: 400, vb: 1.47, th: 35 }, { n: 60, b: 0.4, a: 250, vb: 0.507, th: 65 },
    { n: 150, b: 0.2, a: 300, vb: 0.616, th: 70 },
  ],
];

export const TUBE: TubeRow[][] = [
  [{ n: 20, i1: 0, i2: 40, vb: 0.505, r: 4 }, { n: 15, i1: 0, i2: 30, vb: 0.444, r: 5 }, { n: 25, i1: 0, i2: 20, vb: 0.178, r: 3 }],
  [{ n: 10, i1: 0, i2: 50, vb: 0.4, r: 4.5 }, { n: 20, i1: 0, i2: 25, vb: 0.711, r: 6 }, { n: 12, i1: 0, i2: 40, vb: 0.232, r: 3.5 }],
  [{ n: 15, i1: 10, i2: 40, vb: 0.537, r: 5.5 }, { n: 20, i1: 5, i2: 30, vb: 0.967, r: 7 }, { n: 25, i1: 10, i2: 30, vb: 0.123, r: 2.5 }],
];

export const FLIP: FlipRow[][] = [
  [{ n: 50, b: 0.2, rc: 10, R: 4, ma: 314, t: 0.5 }, { n: 40, b: 0.25, rc: 10, R: 5, ma: 157, t: 0.8 }, { n: 100, b: 0.1, rc: 8, R: 4, ma: 251, t: 0.4 }],
  [{ n: 60, b: 0.15, rc: 12, R: 6, ma: 151, t: 0.9 }, { n: 80, b: 0.2, rc: 6, R: 5, ma: 121, t: 0.6 }, { n: 25, b: 0.4, rc: 15, R: 4, ma: 295, t: 1.2 }],
  [{ n: 120, b: 0.1, rc: 10, R: 8, ma: 62.8, t: 1.5 }, { n: 50, b: 0.3, rc: 9, R: 3, ma: 364, t: 0.7 }, { n: 200, b: 0.05, rc: 12, R: 10, ma: 56.5, t: 1.6 }],
];

// Round 1: the steepest step rises. Rounds 2 and 3: the steepest step falls (a student who takes the steepest rise picks the wrong N).
export const SHOW: ShowRow[][] = [
  [{ phi: [0, 4, 10, 12], vb: 0.3, n: 50 }, { phi: [2, 10, 12, 8], vb: 0.32, n: 40 }, { phi: [4, 6, 14, 12], vb: 0.48, n: 60 }],
  [{ phi: [2, 8, 14, 4], vb: 0.3, n: 30 }, { phi: [12, 16, 4, 8], vb: 0.84, n: 70 }, { phi: [14, 10, 2, 6], vb: 0.72, n: 90 }],
  [{ phi: [0, 10, 14, 2], vb: 0.96, n: 80 }, { phi: [4, 12, 16, 2], vb: 0.28, n: 20 }, { phi: [16, 6, 8, 16], vb: 1.1, n: 110 }, { phi: [2, 14, 16, 0], vb: 1.92, n: 120 }],
];

// ---- the physics, the rounds and the judging -----------------------------------------------------------------------------------------------------------------

export const DIAL = {
  th: { min: 0, max: 90, step: 5, start: 90 }, // L1, degrees: 0 flat, 90 edge-on (no flux)
  r: { min: 1, max: 8, step: 0.5, start: 1 }, // L2, cm
  t: { min: 0.1, max: 2, step: 0.1, start: 2 }, // L3, s
  n: { min: 10, max: 200, step: 10, start: 10 }, // L4, turns
};

export const rad = (deg: number) => (deg * Math.PI) / 180;
/** L1: emf in V when the field dies, for a tilt of th degrees. */
export const emfOut = (r: OutRow, th: number) => (r.n * r.b * r.a * 1e-4 * (th === 90 ? 0 : Math.cos(rad(th)))) / DT1;
/** L2: emf in V for a ring of radius rc cm. */
export const emfTube = (r: TubeRow, rc: number) => (NR * MU0 * r.n * 100 * Math.PI * (rc / 100) ** 2 * (r.i2 - r.i1)) / DT2;
/** L3: average emf in V and current in mA for a flip lasting t s. */
export const emfFlip = (r: FlipRow, t: number) => (2 * r.n * r.b * Math.PI * (r.rc / 100) ** 2) / t;
export const maFlip = (r: FlipRow, t: number) => (emfFlip(r, t) / r.R) * 1000;
/** L4: the emf per turn in mV in each 1 s step (signed), the steepest size, and Wink's peak in V for n turns. */
export const slopes = (r: ShowRow) => [1, 2, 3].map((i) => r.phi[i] - r.phi[i - 1]);
export const steepest = (r: ShowRow) => Math.max(...slopes(r).map(Math.abs));
export const peakShow = (r: ShowRow, n: number) => (n * steepest(r)) / 1000;

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  const pools = [OUT, TUBE, FLIP, SHOW][level - 1] as unknown[][];
  const kind = (['out', 'tube', 'flip', 'show'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'dim' | 'blown';
export type Values = { th?: number; r?: number; t?: number; n?: number };
const same = (a: number, b: number) => Math.abs(a - b) < 1e-6;

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'out': return same(x.th!, r.th) ? null : x.th! > r.th ? 'dim' : 'blown'; // more tilt, less flux
    case 'tube': return same(x.r!, r.r) ? null : x.r! < r.r ? 'dim' : 'blown';
    case 'flip': return same(x.t!, r.t) ? null : x.t! > r.t ? 'dim' : 'blown'; // a slower flip, a smaller emf
    case 'show': return same(x.n!, r.n) ? null : x.n! < r.n ? 'dim' : 'blown';
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;

/** L4, blown: the moment Wink cracks, at the first step whose emf goes over the rating (0.5 s of animation per 1 s step). */
export function popAt(r: ShowRow, n: number): number {
  const i0 = slopes(r).findIndex((s) => n * Math.abs(s) > r.vb * 1000 + 1e-9);
  return 0.3 + 0.5 * Math.max(0, i0) + 0.1;
}
/** Seconds into the dive at which the verdict lands. */
export function verdictDelay(r: Round, x: Values): number {
  const f = fault(r, x);
  if (r.kind === 'out') return f === 'blown' ? 0.45 : 0.85;
  if (r.kind === 'tube') return f === 'blown' ? 0.42 : 0.6;
  if (r.kind === 'flip') return f === 'blown' ? 0.45 : 0.3 + Math.min(x.t!, 0.7);
  return f === 'blown' ? popAt(r, x.n!) + 0.05 : 1.85;
}

// ---- Wink's take: the glow and the crack, as functions of the fired setting, so the picture can be checked against the judge ---------------------------------------

/** Seconds into the dive at which Wink's glass cracks on a blown miss (levels 1 to 3 fixed; level 4 at the first step over the rating). */
export const CRACK_AT = { out: 0.4, tube: 0.38, flip: 0.4 } as const;
export const crackAt = (r: Round, x: Values): number => (r.kind === 'show' ? popAt(r, x.n!) : CRACK_AT[r.kind]);
/** Seconds the program of level 4 starts, and each of its three steps lasts. */
export const SHOW_AT = 0.3;
export const SHOW_STEP = 0.5;

/** Wink's glow `rt` seconds after Signal: the win values follow the changing flux, a miss takes one fixed value (GLOW) and never scales with the emf. */
export function winkGlow(r: Round, x: Values, rt: number): number {
  const f = fault(r, x);
  const cracked = f === 'blown' && rt >= crackAt(r, x);
  if (cracked) return 0;
  let live: boolean; // is the flux changing?
  let win = 0;
  if (r.kind === 'out') {
    live = rt >= 0.3 && rt <= 0.8;
    win = rt < 0.3 ? 0 : rt < 0.35 ? (rt - 0.3) / 0.05 : rt <= 0.8 ? 1 : Math.max(0, 1 - (rt - 0.8) / 0.2);
    if (f === 'dim' && x.th === 90) return 0; // edge-on: no flux, nothing to lose
  } else if (r.kind === 'tube') {
    live = rt >= 0.3 && rt <= 0.5;
    win = rt < 0.3 ? 0 : rt <= 0.5 ? 1 : Math.max(0, 1 - (rt - 0.5) / 0.15);
  } else if (r.kind === 'flip') {
    const end = 0.3 + x.t!;
    live = rt >= 0.3 && rt <= end;
    win = rt < 0.3 ? 0 : rt <= end ? 1 : Math.max(0, 1 - (rt - end) / 0.1);
  } else {
    live = rt >= SHOW_AT && rt < SHOW_AT + 3 * SHOW_STEP;
    const i = Math.min(2, Math.floor((rt - SHOW_AT) / SHOW_STEP));
    win = live ? Math.abs(slopes(r)[i]) / steepest(r) : 0;
  }
  if (f === null) return win;
  if (!live) return 0;
  return f === 'dim' ? GLOW.dim : GLOW.blown;
}

// ---- words ------------------------------------------------------------------------------------------------------------------------------------------------------

const p3 = (x: number) => x.toPrecision(3);

export function intel(r: Round): string {
  switch (r.kind) {
    case 'out': return `Hoop: ${r.n} turns of ${r.a} cm², in ${r.b} T pointing straight up. The pad dies in 0.5 s. Wink needs ${p3(r.vb)} V.`;
    case 'tube': return `The sleeve has ${r.n} turns per cm. Tug ramps it from ${r.i1} A to ${r.i2} A in 0.2 s. The ring has 200 turns. Wink needs ${p3(r.vb)} V.`;
    case 'flip': return `Hoop: ${r.n} turns, radius ${r.rc} cm, flat in ${r.b} T. Hoop and Wink together have ${r.R} Ω. Wink needs ${p3(r.ma)} mA.`;
    case 'show': return `The program drives the flux per turn along the graph, one step per second. Wink is rated ${p3(r.vb)} V and must reach it at the brightest moment.`;
  }
}

export const hintText = (r: Round) =>
  `${intel(r)} ${r.assist === 0 ? 'Dive 1: the console meter is live.' : r.assist === 1 ? 'The meter is off: a console check costs a charge.' : 'Final dive: no meter.'}`;

/** The goal line drawn on the scene during play. */
export function goalLine(r: Round): string {
  if (r.kind === 'flip') return `Light Wink: it needs ${p3(r.ma)} mA`;
  if (r.kind === 'show') return `Signal: Wink peaks at exactly ${p3(r.vb)} V`;
  return `Light Wink: it needs ${p3(r.vb)} V`;
}

/** After a miss: what the player's own setting did and what to change, never the answer. */
export function missText(r: Round, x: Values): string {
  const f = fault(r, x);
  switch (r.kind) {
    case 'out':
      if (f === 'dim' && x.th === 90) return 'Edge-on at 90°, no field lines crossed the hoop: there was no flux to lose, so Wink stayed dark. Tilt the hoop flatter.';
      return f === 'dim'
        ? `Tilted to ${x.th}°, the hoop held too little flux: when the field died the emf was too small and Wink only glowed dimly. Tilt it flatter.`
        : `Tilted to ${x.th}°, the hoop held too much flux: when the field died the emf was too big and Wink’s glass cracked. Tilt it more steeply.`;
    case 'tube':
      return f === 'dim'
        ? `A ${x.r} cm ring caught too little of the changing flux: Wink only glowed dimly. Use a bigger ring.`
        : `A ${x.r} cm ring caught too much of the changing flux: the emf was too big and Wink’s glass cracked. Use a smaller ring.`;
    case 'flip':
      return f === 'dim'
        ? `A ${x.t} s flip changed the flux too slowly: the current was too small and Wink only glowed dimly. Flip faster.`
        : `A ${x.t} s flip changed the flux too fast: the current was too big and Wink’s glass cracked. Flip more slowly.`;
    case 'show':
      return f === 'dim'
        ? `With ${x.n} turns even the steepest step gave too little emf: Wink never reached full brightness. Use more turns.`
        : `With ${x.n} turns a step pushed Wink over its rating and its glass cracked. Use fewer turns.`;
  }
}

/** The paid console check: it may print numbers for the player's own setting. */
export function meterText(r: Round, x: Values): string {
  switch (r.kind) {
    case 'out': return `Console check: tilted to ${x.th}°, the hoop links ${fmt(emfOut(r, x.th!) * DT1)} Wb, so Wink would get ${fmt(emfOut(r, x.th!))} V.`;
    case 'tube': return `Console check: a ${x.r} cm ring would give Wink ${fmt(emfTube(r, x.r!))} V.`;
    case 'flip': return `Console check: a ${x.t} s flip would drive ${fmt(maFlip(r, x.t!))} mA through Wink.`;
    case 'show': return `Console check: with ${x.n} turns the brightest step would give Wink ${fmt(peakShow(r, x.n!))} V.`;
  }
}

/** The console LCD helper. */
export function lcdText(r: Round, x: Values): string {
  switch (r.kind) {
    case 'out': return `WINK ${fmt(emfOut(r, x.th!))} V`;
    case 'tube': return `WINK ${fmt(emfTube(r, x.r!))} V`;
    case 'flip': return `WINK ${fmt(maFlip(r, x.t!))} mA`;
    case 'show': return `PEAK ${fmt(peakShow(r, x.n!))} V`;
  }
}

/** After a win: two short lines of working. */
export function winText(r: Round): string {
  switch (r.kind) {
    case 'out': return `Spotted! The hoop linked NBA cos θ = ${r.n} × ${r.b} × ${r.a / 1e4} × cos ${r.th}° = ${fmt(emfOut(r, r.th) * DT1)} Wb. It fell to zero in 0.5 s, so ε = ΔΦ/Δt = ${p3(r.vb)} V.`;
    case 'tube': return `Spotted! Inside the sleeve B = μ₀nI, so the ring’s flux rose with the current: ε = Nμ₀nπr² ΔI/Δt = 200 × 4π × 10⁻⁷ × ${r.n * 100} × π × ${r.r / 100}² × ${r.i2 - r.i1} ÷ 0.2 = ${p3(r.vb)} V.`;
    case 'flip': return `Spotted! A 180° flip takes the flux from +BA to −BA, a change of 2BA. ε = 2NBA/t = 2 × ${r.n} × ${r.b} × π × ${r.rc / 100}² ÷ ${r.t} = ${fmt(emfFlip(r, r.t))} V, so I = ε/R = ${p3(r.ma)} mA.`;
    case 'show': return `Signal received! The emf is the slope of the flux graph. The steepest step ${slopes(r).find((s) => Math.abs(s) === steepest(r))! < 0 ? 'falls' : 'rises'} ${steepest(r)} mWb in 1 s, which is ${steepest(r)} mV per turn, and ${r.n} × ${steepest(r)} mV = ${p3(r.vb)} V.`;
  }
}
