// Rules for "The Slowest Race" (Physics Ch 3, section 3.2, 3.5 and 3.5.1). Pure: no DOM, no canvas, no Math.random.
// Zip, a free electron in a copper wire, must drift at the record pace of the champion racing snail Shelly.
// Working unit: I (A) = 13.6 x A (mm2) x v_d (mm/s), because n e = 8.5e28 x 1.6e-19 = 1.36e10 C/m3 and 1 mm2 x 1 mm/s = 1e-9 m3/s.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const E_CHARGE = 1.6e-19; // C
export const N_CU = 8.5e28; // free electrons per m3 in copper (the book's value)
export const K = 13.6; // amperes per (mm2 x mm/s): N_CU x E_CHARGE x 1e-9
export const C_LIGHT = 3e8; // m/s
export const FEEDER = 6; // mm2, the thick feeder from the battery to the start line (level 3 win text)

export interface GateRow { e19: number; t: number; heading: 'right' | 'left'; i: number; dir: 0 | 1 } // e19: electrons in units of 1e19; i: answer A; dir: answer (1 = current arrow left)
export interface CrawlRow { a: number; len: number; T: number; i: number } // a mm2, len cm, T s, i answer A
export interface ThickRow { i: number; tau: number; T: number; a: number } // i A (fixed), tau ns, T s, a answer mm2
export interface MobRow { mu: number; L: number; v: number; V: number; a: number; lamp: number } // mu in 1e-3 m2/(V s), L m, v mm/s, V answer mV, a answer mm2, lamp A (shown)

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'gate'; assist: Assist } & GateRow)
  | ({ kind: 'crawl'; assist: Assist } & CrawlRow)
  | ({ kind: 'thick'; assist: Assist } & ThickRow)
  | ({ kind: 'mob'; assist: Assist } & MobRow);

// I = 1.6 x e19 / t. heading 'right' means the finish is on the right, so electrons must drift right and the current arrow points left (dir 1).
export const GATE: GateRow[][] = [
  [{ e19: 2.5, t: 1, heading: 'right', i: 4, dir: 1 }, { e19: 3.75, t: 2, heading: 'left', i: 3, dir: 0 }, { e19: 5, t: 1, heading: 'right', i: 8, dir: 1 },
   { e19: 6.25, t: 2, heading: 'left', i: 5, dir: 0 }, { e19: 7.5, t: 2, heading: 'right', i: 6, dir: 1 }],
  [{ e19: 3.75, t: 4, heading: 'left', i: 1.5, dir: 0 }, { e19: 6.25, t: 5, heading: 'right', i: 2, dir: 1 }, { e19: 8.75, t: 4, heading: 'left', i: 3.5, dir: 0 },
   { e19: 4.5, t: 0.8, heading: 'right', i: 9, dir: 1 }, { e19: 6.25, t: 4, heading: 'left', i: 2.5, dir: 0 }],
  [{ e19: 8.75, t: 2, heading: 'left', i: 7, dir: 0 }, { e19: 6.25, t: 1, heading: 'right', i: 10, dir: 1 }, { e19: 2.5, t: 4, heading: 'right', i: 1, dir: 1 },
   { e19: 2.75, t: 0.8, heading: 'left', i: 5.5, dir: 0 }],
];

// v = 10 x len / T mm/s; I = 13.6 x a x v.
export const CRAWL: CrawlRow[][] = [
  [{ a: 0.25, len: 30, T: 255, i: 4 }, { a: 0.25, len: 25, T: 170, i: 5 }, { a: 0.5, len: 30, T: 340, i: 6 }, { a: 0.75, len: 40, T: 510, i: 8 }, { a: 1, len: 50, T: 680, i: 10 }],
  [{ a: 0.25, len: 50, T: 680, i: 2.5 }, { a: 0.5, len: 30, T: 680, i: 3 }, { a: 0.75, len: 25, T: 340, i: 7.5 }, { a: 2, len: 30, T: 680, i: 12 }, { a: 1, len: 30, T: 255, i: 16 }],
  [{ a: 0.25, len: 30, T: 510, i: 2 }, { a: 0.75, len: 30, T: 680, i: 4.5 }, { a: 1.5, len: 30, T: 680, i: 9 }, { a: 0.75, len: 50, T: 340, i: 15 }, { a: 1, len: 40, T: 320, i: 17 }],
];

// Track length = 300 x tau mm (the field covers 300 mm per ns); v = length / T; a = i / (13.6 v).
export const THICK: ThickRow[][] = [
  [{ i: 6, tau: 1, T: 510, a: 0.75 }, { i: 10, tau: 1, T: 612, a: 1.5 }, { i: 17, tau: 1, T: 600, a: 2.5 }, { i: 4, tau: 1.5, T: 765, a: 0.5 }],
  [{ i: 8, tau: 2, T: 1020, a: 1 }, { i: 12, tau: 1, T: 595, a: 1.75 }, { i: 17, tau: 1.5, T: 990, a: 2.75 }, { i: 15, tau: 1.5, T: 918, a: 2.25 }],
  [{ i: 8, tau: 2, T: 1275, a: 1.25 }, { i: 15, tau: 1.5, T: 816, a: 2 }, { i: 18, tau: 1.5, T: 1020, a: 3 }, { i: 9, tau: 1.5, T: 850, a: 1.25 }],
];

// V (mV) = 1000 x v x L / mu; lamp = 13.6 x a x v, shown to 3 figures.
export const MOB: MobRow[][] = [
  [{ mu: 4, L: 0.4, v: 0.5, V: 50, a: 1, lamp: 6.8 }, { mu: 4, L: 0.3, v: 0.8, V: 60, a: 0.75, lamp: 8.16 }, { mu: 3.6, L: 0.6, v: 0.6, V: 100, a: 1.25, lamp: 10.2 },
   { mu: 3.2, L: 0.4, v: 0.8, V: 100, a: 0.5, lamp: 5.44 }],
  [{ mu: 4, L: 0.6, v: 1.2, V: 180, a: 0.75, lamp: 12.2 }, { mu: 4, L: 0.4, v: 0.4, V: 40, a: 2, lamp: 10.9 }, { mu: 5, L: 0.5, v: 1.4, V: 140, a: 0.5, lamp: 9.52 },
   { mu: 4.4, L: 0.44, v: 1.2, V: 120, a: 1, lamp: 16.3 }],
  [{ mu: 3.2, L: 0.6, v: 0.8, V: 150, a: 1.5, lamp: 16.3 }, { mu: 3.6, L: 0.6, v: 1.5, V: 250, a: 0.75, lamp: 15.3 }, { mu: 4, L: 0.3, v: 1.2, V: 90, a: 1, lamp: 16.3 },
   { mu: 4.4, L: 0.33, v: 1.2, V: 90, a: 0.5, lamp: 8.16 }],
];

export const DIAL = {
  i1: { min: 0.5, max: 12, step: 0.5, start: 0.5 }, // level 1 current, A
  dir: { min: 0, max: 1, step: 1, start: 0 }, // level 1: 0 = current arrow right, 1 = current arrow left
  i2: { min: 0.5, max: 20, step: 0.5, start: 0.5 }, // level 2 current, A
  a: { min: 0.25, max: 4, step: 0.25, start: 4 }, // levels 3 and 4: race wire, mm2 (starts on the thickest spool)
  mv: { min: 10, max: 300, step: 10, start: 10 }, // level 4 track voltage, mV
};

/** Zip's drift speed in mm/s for a current i (A) in a wire of a (mm2). */
export const pace = (i: number, a: number) => i / (K * a);
/** Level 4: drift speed in mm/s for mobility mu (1e-3 m2/(V s)), mV across L metres. */
export const paceMob = (mu: number, mv: number, L: number) => (mu * mv) / (1000 * L);
/** Level 1: electrons per second through the gate, in units of 1e19. */
export const perSecond = (i: number) => i / 1.6;
/** The record time written the race way: 340 -> '5 min 40 s', 1020 -> '17 min'. */
export const mmss = (T: number) => `${Math.floor(T / 60)} min${T % 60 ? ` ${T % 60} s` : ''}`;
/** Shelly's pace in mm/s for the round (levels 2 to 4). */
export const shellyPace = (r: Round) => (r.kind === 'crawl' ? (10 * r.len) / r.T : r.kind === 'thick' ? (300 * r.tau) / r.T : r.kind === 'mob' ? r.v : 0);

export type Fault = 'backward' | 'slow' | 'fast' | 'dim' | 'blown';
export type Values = { i?: number; dir?: number; a?: number; mv?: number };

/** Level 4 lamp: compares the player's current with the lamp's, exactly (a and mv are exact binary values). */
export const lampState = (r: MobRow, x: Values): 'dim' | 'ok' | 'blown' => {
  const mine = x.a! * x.mv!;
  const need = r.a * r.V;
  return mine === need ? 'ok' : mine < need ? 'dim' : 'blown';
};

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  const pools = [GATE, CRAWL, THICK, MOB][level - 1] as unknown[][];
  const kind = (['gate', 'crawl', 'thick', 'mob'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'gate':
      if (x.dir !== r.dir) return 'backward';
      return x.i === r.i ? null : x.i! < r.i ? 'slow' : 'fast';
    case 'crawl':
      return x.i === r.i ? null : x.i! < r.i ? 'slow' : 'fast';
    case 'thick':
      return x.a === r.a ? null : x.a! > r.a ? 'slow' : 'fast'; // thicker wire, slower drift
    case 'mob':
      if (x.mv !== r.V) return x.mv! < r.V ? 'slow' : 'fast';
      return x.a === r.a ? null : x.a! < r.a ? 'dim' : 'blown';
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
/** The moment of the verdict, in seconds after Fire. */
export const verdictDelay = (r: Round, x: Values) => {
  const f = fault(r, x);
  return f === 'backward' ? 0.65 : f === 'fast' ? 1.05 : 1.65;
};

// ---- words -------------------------------------------------------------------------------------------------------------------------------------------------

export const count = (r: { e19: number }) => `${r.e19} × 10¹⁹`;
export const arrowWord = (dir: number) => (dir ? '← (right to left)' : '→ (left to right)');
export const cm = (L: number) => `${Math.round(L * 100)} cm`;

export function intel(r: Round): string {
  switch (r.kind) {
    case 'gate':
      return `Record pace in this wire: ${count(r)} electrons cross the start gate every ${r.t} s. This heat runs ${r.heading === 'right' ? 'left to right' : 'right to left'}.`;
    case 'crawl':
      return `Copper wire of ${r.a} mm². Shelly’s record: ${r.len} cm in ${mmss(r.T)}. n = 8.5 × 10²⁸ per m³, e = 1.6 × 10⁻¹⁹ C.`;
    case 'thick':
      return `The battery drives ${r.i} A. The finish lamp lit ${r.tau} ns after the field passed the start gate. Shelly’s record over this track: ${mmss(r.T)}.`;
    case 'mob':
      return `Track wire ${cm(r.L)} long; copper’s mobility today μ = ${r.mu} × 10⁻³ m²/(V s). Shelly’s pace: ${r.v} mm/s. The finish lamp needs ${r.lamp} A.`;
  }
}

/** The round's goal, drawn on the scene at round start (at most 51 characters). */
export function goalLine(r: Round): string {
  switch (r.kind) {
    case 'gate':
      return `Pace Shelly: ${count(r)} e⁻ every ${r.t} s`;
    case 'crawl':
      return `Tie Shelly: ${r.len} cm in ${mmss(r.T)}`;
    case 'thick':
      return `Tie Shelly: lamp lit at ${r.tau} ns · record ${mmss(r.T)}`;
    case 'mob':
      return `Tie Shelly at ${r.v} mm/s · lamp needs ${r.lamp} A`;
  }
}
/** A given fact drawn between START and FINISH (levels 2 and 4). */
export const factLabel = (r: Round): string | null => (r.kind === 'crawl' ? `wire ${r.a} mm²` : r.kind === 'mob' ? `track ${cm(r.L)}` : null);

export const hintText = (r: Round) =>
  `${intel(r)} ${r.assist === 0 ? 'Round 1: the pace board is live.' : r.assist === 1 ? 'The pace board is off: a pace check costs a charge.' : 'Grand final: no pace board.'}`;

export function missText(r: Round, x: Values): string {
  const f = fault(r, x);
  const lampClause = (): string => {
    if (r.kind !== 'mob') return '';
    const s = lampState(r, x);
    return s === 'ok' ? '' : s === 'dim' ? ' The finish lamp was too dim as well.' : ' The finish lamp blew as well.';
  };
  switch (r.kind) {
    case 'gate':
      if (f === 'backward') return `With the current arrow ${arrowWord(x.dir!)}, the electrons drifted toward the start and Zip went backwards. Electrons drift against the current arrow.`;
      if (f === 'slow') return `At ${x.i} A too few electrons crossed the gate each second, so Zip drifted too slowly. Raise the current.`;
      return `At ${x.i} A too many electrons crossed the gate each second, so Zip drifted too fast and ran away from Shelly. Lower the current.`;
    case 'crawl':
      return f === 'slow' ? `At ${x.i} A Zip drifted slower than Shelly’s record pace. Raise the current.` : `At ${x.i} A Zip drifted faster than Shelly and ran away. Lower the current.`;
    case 'thick':
      return f === 'slow' ? `In the ${x.a} mm² wire the battery’s current drifted too slowly. Pick a thinner wire.` : `In the ${x.a} mm² wire the battery’s current drifted too fast. Pick a thicker wire.`;
    case 'mob':
      if (f === 'slow') return `At ${x.mv} mV the field was too weak and Zip drifted too slowly. Raise the voltage.${lampClause()}`;
      if (f === 'fast') return `At ${x.mv} mV the field was too strong and Zip drifted too fast. Lower the voltage.${lampClause()}`;
      if (f === 'dim') return `A dead heat! But in the ${x.a} mm² wire the current was too small and the lamp was too dim for the photo. Pick a thicker wire.`;
      return `A dead heat! But in the ${x.a} mm² wire the current was too big and the lamp blew. Pick a thinner wire.`;
  }
}

/** The paid pace check. */
export function meterText(r: Round, x: Values): string {
  switch (r.kind) {
    case 'gate':
      return `Pace check: at ${x.i} A, ${fmt(perSecond(x.i!))} × 10¹⁹ electrons cross the gate each second, drifting ${x.dir ? 'left to right' : 'right to left'}.`;
    case 'crawl':
      return `Pace check: at ${x.i} A Zip would drift at ${fmt(pace(x.i!, r.a))} mm/s.`;
    case 'thick':
      return `Pace check: in a ${x.a} mm² wire Zip would drift at ${fmt(pace(r.i, x.a!))} mm/s.`;
    case 'mob':
      return `Pace check: ${x.mv} mV gives E = ${fmt(x.mv! / 1000 / r.L)} V/m, so Zip would drift at ${fmt(paceMob(r.mu, x.mv!, r.L))} mm/s and the lamp would get ${fmt(K * x.a! * paceMob(r.mu, x.mv!, r.L))} A.`;
  }
}

export const LCD_OFF = '— — —';
/** The pace board (the helper). In level 1 the arrow is the electrons' drift, the opposite of the current arrow. */
export function lcdText(r: Round, x: Values): string {
  switch (r.kind) {
    case 'gate':
      return `${fmt(perSecond(x.i!))}×10¹⁹ e⁻/s ${x.dir ? '→' : '←'}`;
    case 'crawl':
      return `Zip ${fmt(pace(x.i!, r.a))} mm/s`;
    case 'thick':
      return `Zip ${fmt(pace(r.i, x.a!))} mm/s`;
    case 'mob':
      return `${fmt(paceMob(r.mu, x.mv!, r.L))} mm/s · ${fmt(K * x.a! * paceMob(r.mu, x.mv!, r.L))} A`;
  }
}

export function winText(r: Round): string {
  switch (r.kind) {
    case 'gate':
      return `Record! ${count(r)} electrons carry ${fmt(1.6 * r.e19)} C, so I = Q/t = ${fmt(1.6 * r.e19)} C ÷ ${r.t} s = ${r.i} A. Electrons drift toward the battery’s + end, so the current arrow points ${arrowWord(r.dir)}, against their drift.`;
    case 'crawl':
      return `Dead heat! Shelly’s pace is ${r.len * 10} mm ÷ ${r.T} s = ${fmt((10 * r.len) / r.T)} mm/s, so I = neAv_d = 13.6 × ${r.a} × ${fmt((10 * r.len) / r.T)} = ${r.i} A. Electrons crawl at a snail’s pace, yet a lamp lights at once: the field races along the wire at 3 × 10⁸ m/s.`;
    case 'thick':
      return `Dead heat! The lamp lit after ${r.tau} ns, so the track is 3 × 10⁸ × ${r.tau} × 10⁻⁹ = ${fmt(0.3 * r.tau)} m, and Shelly’s pace is ${fmt((300 * r.tau) / r.T)} mm/s. A = I ÷ (13.6 v_d) = ${r.a} mm². In the ${FEEDER} mm² feeder the same ${r.i} A drifts only ${fmt(r.i / (K * FEEDER))} mm/s: thicker wire, slower drift.`;
    case 'mob':
      return `Dead heat and a sharp photo! E = V/L = ${fmt(r.V / 1000 / r.L)} V/m, so v_d = μE = ${r.v} mm/s, and I = neAv_d = 13.6 × ${r.a} × ${r.v} = ${fmt(K * r.a * r.v)} A for the lamp.`;
  }
}
