// Pure rules of "Main Stage Soundcheck" (Section 7.6.1 and 7.7): no DOM, no canvas. One fader per level sets a capacitor, a coil tap, the master voltage or the bass note.
// Level 1: the tweeter's current through R and C, Z = √(R² + X_C²). Level 2: the mid driver through R, L and C, lagging or leading. Level 3: the three soundcheck
// voltages add as phasors. Level 4: the woofer's coil is R in series with L, and only R dissipates, P = I²R = VI cos φ.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const TWO_PI = 2 * Math.PI;
/** Sound-ring strength: fixed, never proportional to the error. */
export const RING = { faint: 0.25, right: 1 } as const;
/** Level 3 meter needles, as a fraction of the soundcheck mark. */
export const NEEDLE = { low: 0.5, right: 1, high: 1.25 } as const;

export interface TweetRow { r: number; fk: number; v: number; c: number; i: number } // shown r (Ω), fk (kHz), v (V), i (A); answer c (µF)
export interface MidRow { r: number; fk: number; c: number; v: number; l: number; i: number; lag: boolean } // shown r, fk, c (µF), v, i, lag; answer l (mH)
export interface MeterRow { vr: number; vl: number; vc: number; v: number } // shown vr, vl, vc (V); answer v (V)
export interface WoofRow { r: number; l: number; v: number; f: number; p: number } // shown r (Ω), l (mH), v (V), p (W); answer f (Hz)

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'tweet'; assist: Assist } & TweetRow)
  | ({ kind: 'mid'; assist: Assist } & MidRow)
  | ({ kind: 'meters'; assist: Assist } & MeterRow)
  | ({ kind: 'woof'; assist: Assist } & WoofRow);

// The pools: checked by script on 2026-10-31 (see the brief, section 5.2).
export const TWEET: TweetRow[][] = [
  [{ r: 8, fk: 2, v: 10, c: 10, i: 0.886 }, { r: 6, fk: 2.5, v: 12, c: 6, i: 0.984 }, { r: 8, fk: 3, v: 12, c: 5, i: 0.903 }, { r: 4, fk: 2, v: 12, c: 12, i: 1.55 }],
  [{ r: 8, fk: 2, v: 12, c: 7, i: 0.863 }, { r: 6, fk: 2, v: 20, c: 14, i: 2.42 }, { r: 8, fk: 2.5, v: 16, c: 4, i: 0.898 }, { r: 6, fk: 3, v: 10, c: 9, i: 1.19 }],
  [{ r: 8, fk: 2, v: 12, c: 8, i: 0.94 }, { r: 6, fk: 2.5, v: 16, c: 11, i: 1.92 }, { r: 6, fk: 2, v: 12, c: 13, i: 1.4 }, { r: 4, fk: 2, v: 12, c: 16, i: 1.88 }],
];
export const MID: MidRow[][] = [
  [{ r: 6, fk: 1, c: 10, v: 8, l: 3.6, i: 0.889, lag: true }, { r: 4, fk: 1, c: 15, v: 10, l: 0.5, i: 1.18, lag: false }, { r: 4, fk: 1, c: 20, v: 12, l: 1.7, i: 2.48, lag: true }],
  [{ r: 6, fk: 1, c: 10, v: 10, l: 1.3, i: 1.02, lag: false }, { r: 4, fk: 1.25, c: 10, v: 12, l: 2.2, i: 1.98, lag: true }, { r: 4, fk: 1, c: 25, v: 8, l: 1.6, i: 1.47, lag: true }],
  [{ r: 6, fk: 1, c: 15, v: 8, l: 2.6, i: 0.965, lag: true }, { r: 4, fk: 1.25, c: 10, v: 8, l: 1.2, i: 1.54, lag: false }, { r: 4, fk: 1, c: 10, v: 12, l: 1.4, i: 1.47, lag: false }],
];
export const METERS: MeterRow[][] = [
  [{ vr: 30, vl: 110, vc: 70, v: 50 }, { vr: 36, vl: 40, vc: 88, v: 60 }, { vr: 24, vl: 75, vc: 43, v: 40 }],
  [{ vr: 20, vl: 66, vc: 45, v: 29 }, { vr: 45, vl: 140, vc: 80, v: 75 }, { vr: 40, vl: 30, vc: 105, v: 85 }],
  [{ vr: 33, vl: 120, vc: 64, v: 65 }, { vr: 48, vl: 95, vc: 40, v: 73 }, { vr: 39, vl: 30, vc: 110, v: 89 }, { vr: 12, vl: 70, vc: 35, v: 37 }],
];
export const WOOF: WoofRow[][] = [
  [{ r: 6, l: 5, v: 20, f: 200, p: 31.8 }, { r: 6, l: 6, v: 20, f: 130, p: 40 }, { r: 6, l: 8, v: 16, f: 90, p: 27.2 }],
  [{ r: 6, l: 5, v: 16, f: 150, p: 26.4 }, { r: 6, l: 6, v: 24, f: 170, p: 44.8 }, { r: 6, l: 8, v: 20, f: 110, p: 36.1 }],
  [{ r: 6, l: 5, v: 30, f: 240, p: 58.2 }, { r: 6, l: 6, v: 30, f: 140, p: 84.6 }, { r: 6, l: 8, v: 16, f: 120, p: 21.2 }, { r: 4, l: 5, v: 20, f: 160, p: 38.8 }],
];

export const DIAL = {
  c: { min: 1, max: 30, step: 1, start: 1 }, // L1, µF
  l: { min: 0.1, max: 4, step: 0.1, start: 0.1 }, // L2, mH
  v: { min: 10, max: 150, step: 1, start: 10 }, // L3, V
  f: { min: 20, max: 300, step: 5, start: 20 }, // L4, Hz
};

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  const pools = [TWEET, MID, METERS, WOOF][level - 1] as unknown[][];
  const kind = (['tweet', 'mid', 'meters', 'woof'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export const xl = (lmH: number, fHz: number) => TWO_PI * fHz * lmH * 1e-3;
export const xc = (cuF: number, fHz: number) => 1 / (TWO_PI * fHz * cuF * 1e-6);
/** L1: the tweeter current for a capacitor of c µF. */
export const tweetI = (r: TweetRow, c: number) => r.v / Math.hypot(r.r, xc(c, r.fk * 1000));
/** L2: the net reactance X_L − X_C (Ω) for a coil of l mH. */
export const netX = (r: MidRow, l: number) => xl(l, r.fk * 1000) - xc(r.c, r.fk * 1000);
/** L2: the mid current for a coil of l mH. */
export const midI = (r: MidRow, l: number) => r.v / Math.hypot(r.r, netX(r, l));
/** L2: the phase angle in degrees, positive when the current lags. */
export const phaseDeg = (r: MidRow, l: number) => (Math.atan2(netX(r, l), r.r) * 180) / Math.PI;
/** L3: what the three meters read at a master voltage v (they scale with v). */
export const readings = (r: MeterRow, v: number) => ({ vr: (r.vr * v) / r.v, vl: (r.vl * v) / r.v, vc: (r.vc * v) / r.v });
/** L4: the woofer power (W) at a bass note of f Hz. */
export const woofP = (r: WoofRow, f: number) => (r.v * r.v * r.r) / (r.r * r.r + xl(r.l, f) ** 2);

export type Fault = 'loud' | 'quiet' | 'phase';
export type Values = { c?: number; l?: number; v?: number; f?: number };
const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'tweet':
      return same(x.c!, r.c) ? null : x.c! > r.c ? 'loud' : 'quiet'; // more C, smaller X_C, more current
    case 'mid': {
      if (same(x.l!, r.l)) return null;
      if (netX(r, x.l!) > 0 !== r.lag) return 'phase'; // the wrong side of resonance
      return midI(r, x.l!) > r.i ? 'loud' : 'quiet';
    }
    case 'meters':
      return x.v === r.v ? null : x.v! > r.v ? 'loud' : 'quiet';
    case 'woof':
      return x.f === r.f ? null : x.f! < r.f ? 'loud' : 'quiet'; // a lower note, smaller X_L, more power
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;

/** The direction to move the fader after a miss: +1 up, −1 down. */
export const direction = (r: Round, x: Values): 1 | -1 => {
  switch (r.kind) {
    case 'tweet': return x.c! < r.c ? 1 : -1;
    case 'mid': return x.l! < r.l ? 1 : -1;
    case 'meters': return x.v! < r.v ? 1 : -1;
    case 'woof': return x.f! < r.f ? 1 : -1;
  }
};

/** Seconds into the take at which the verdict lands. */
export const verdictDelay = (r: Round, x: Values) => (fault(r, x) === 'loud' ? (r.kind === 'meters' ? 0.6 : 0.5) : 0.9);

// ---- words ----

export const phaseWord = (r: MidRow) => (r.lag ? 'lagging' : 'leading');
export const LCD_OFF = '— — —';

export function goal(r: Round): string {
  switch (r.kind) {
    case 'tweet': return `Tweeter needs ${r.i} A`;
    case 'mid': return `Mid needs ${r.i} A, ${phaseWord(r)}`;
    case 'meters': return 'Match the soundcheck meters';
    case 'woof': return `Woofer needs ${r.p} W`;
  }
}

export function intel(r: Round): string {
  switch (r.kind) {
    case 'tweet': return `The tweeter is ${r.r} Ω, fed through a capacitor. The amp plays a ${r.fk} kHz tone at ${r.v} V. The tweeter needs ${r.i} A.`;
    case 'mid': return `The mid driver is ${r.r} Ω, fed through a ${r.c} µF capacitor and a tapped coil. The amp plays a ${r.fk} kHz tone at ${r.v} V. The mid needs ${r.i} A, with its current ${phaseWord(r)} the voltage.`;
    case 'meters': return `At soundcheck the meters read ${r.vr} V across the tweeter, ${r.vl} V across its coil and ${r.vc} V across its capacitor.`;
    case 'woof': return `The woofer’s coil is ${r.r} Ω in series with ${r.l} mH, and the amp gives ${r.v} V. The drop needs ${r.p} W in the woofer.`;
  }
}

export const hintText = (r: Round) =>
  `${intel(r)} ${r.assist === 0 ? 'Round 1: the meter bridge is live.' : r.assist === 1 ? 'The meter bridge is off: a meter check costs a charge.' : 'Headline set: no meters.'}`;

/** What the meter bridge (the LCD) reads for the player's own fader setting. */
export function lcdText(r: Round, x: Values): string {
  switch (r.kind) {
    case 'tweet': return `tweeter ${fmt(tweetI(r, x.c!))} A`;
    case 'mid': return `mid ${fmt(midI(r, x.l!))} A · ${phaseDeg(r, x.l!) > 0 ? 'lags' : 'leads'}`;
    case 'meters': {
      const R = readings(r, x.v!);
      return `${fmt(R.vr)} · ${fmt(R.vl)} · ${fmt(R.vc)} V`;
    }
    case 'woof': return `woofer ${fmt(woofP(r, x.f!))} W`;
  }
}

/** After a miss: the player's own setting, what happened, then the direction. Never the answer. */
export function missText(r: Round, x: Values): string {
  const f = fault(r, x);
  const more = direction(r, x) > 0 ? 'more' : 'less';
  switch (r.kind) {
    case 'tweet':
      return f === 'loud'
        ? `With ${x.c} µF the capacitor’s reactance was too small: too much current, and the tweeter burnt out. Use less capacitance.`
        : `With ${x.c} µF the capacitor’s reactance was too big: the tweeter got too little current and the highs vanished. Use more capacitance.`;
    case 'mid':
      if (f === 'phase') return `With ${fmt(x.l!)} mH the mid’s current ${r.lag ? 'led' : 'lagged'} the voltage instead, out of step with the woofer: the sound went hollow. Use ${more} of the coil.`;
      return f === 'loud'
        ? `With ${fmt(x.l!)} mH the net reactance X_L − X_C was too small: too much current, and the mid driver’s cone tore. Use ${more} of the coil.`
        : `With ${fmt(x.l!)} mH the net reactance X_L − X_C was too big: the mid got too little current. Use ${more} of the coil.`;
    case 'meters':
      return f === 'loud'
        ? `At ${x.v} V the meters read more than at soundcheck: the limiter clipped and the speakers distorted. Bring the master down.`
        : `At ${x.v} V the meters read less than at soundcheck and the crowd could hardly hear. Push the master up.`;
    case 'woof':
      return f === 'loud'
        ? `At ${x.f} Hz the coil’s reactance was too small: too much power, and the woofer’s cone slammed its stops. Pick a higher note.`
        : `At ${x.f} Hz the coil’s reactance was too big: the woofer got too little power and the drop had no punch. Pick a lower note.`;
  }
}

/** The paid meter check: numbers for the player's own setting. */
export function meterText(r: Round, x: Values): string {
  switch (r.kind) {
    case 'tweet': return `Meter check: with ${x.c} µF, X_C = ${fmt(xc(x.c!, r.fk * 1000))} Ω and the tweeter draws ${fmt(tweetI(r, x.c!))} A.`;
    case 'mid': return `Meter check: with ${fmt(x.l!)} mH, X_L − X_C = ${fmt(netX(r, x.l!))} Ω; the mid draws ${fmt(midI(r, x.l!))} A, ${phaseDeg(r, x.l!) > 0 ? 'lagging' : 'leading'} by ${fmt(Math.abs(phaseDeg(r, x.l!)))}°.`;
    case 'meters': {
      const R = readings(r, x.v!);
      return `Meter check: at ${x.v} V the meters would read ${fmt(R.vr)}, ${fmt(R.vl)} and ${fmt(R.vc)} V.`;
    }
    case 'woof': return `Meter check: at ${x.f} Hz, X_L = ${fmt(xl(r.l, x.f!))} Ω and the woofer takes ${fmt(woofP(r, x.f!))} W.`;
  }
}

/** After a win: the working in two or three short sentences. */
export function winText(r: Round): string {
  switch (r.kind) {
    case 'tweet': {
      const X = xc(r.c, r.fk * 1000);
      return `Highs on! Z = V/I = ${r.v} ÷ ${r.i} = ${fmt(r.v / r.i)} Ω and Z = √(R² + X_C²), so X_C = ${fmt(X)} Ω and C = 1/(2πf X_C) = ${r.c} µF. The tweeter gets ${fmt(r.i * r.r)} V and the capacitor ${fmt(r.i * X)} V: more than ${r.v} V together, yet √(V_R² + V_C²) = ${r.v} V.`;
    }
    case 'mid': {
      const d = netX(r, r.l);
      return `In step! Z = V/I = ${fmt(r.v / r.i)} Ω = √(R² + (X_L − X_C)²), so X_L − X_C = ${r.lag ? '+' : '−'}${fmt(Math.abs(d))} Ω and X_L = ${fmt(xl(r.l, r.fk * 1000))} Ω: L = X_L/(2πf) = ${r.l} mH. tan φ = (X_L − X_C)/R gives φ = ${fmt(Math.abs(phaseDeg(r, r.l)))}°, ${phaseWord(r)}.`;
    }
    case 'meters':
      return `Back on the mark! V_L and V_C are opposite, so together they leave ${Math.abs(r.vl - r.vc)} V, and V_R is a quarter cycle away: V = √(V_R² + (V_L − V_C)²) = √(${r.vr}² + ${Math.abs(r.vl - r.vc)}²) = ${r.v} V, not ${r.vr + r.vl + r.vc} V.`;
    case 'woof': {
      const Z4 = Math.hypot(r.r, xl(r.l, r.f));
      return `Drop landed! P = I²R gives I = √(P/R) = ${fmt(Math.sqrt(r.p / r.r))} A, so Z = V/I = ${fmt(Z4)} Ω and X_L = √(Z² − R²) = ${fmt(xl(r.l, r.f))} Ω: f = X_L/(2πL) = ${r.f} Hz. The power factor is cos φ = R/Z = ${fmt(r.r / Z4)}.`;
    }
  }
}
