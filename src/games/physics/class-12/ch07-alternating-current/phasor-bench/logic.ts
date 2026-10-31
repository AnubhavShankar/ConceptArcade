// Rules, pools, judging and words for "Chai Before the Whistle" (phasor-bench). Pure: no DOM, no canvas, no Math.random.
// Units: R in ohms, V in volts (rms unless it says peak), P in watts, E in kJ, t in seconds, angles in degrees.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const RT2 = Math.SQRT2;
export const DEG = Math.PI / 180;
/** Steam plume heights: three fixed sizes, never proportional to the error. */
export const PLUME = { weak: 0.3, right: 1, over: 1.6 } as const;

export interface CoilRow { v: number; p: number; r: number } // answer r (Ω)
export interface ScopeRow { vm: number; v: number } // shown vm (V peak); answer v (V rms)
export interface BrewRow { v: number; r: number; e: number; t: number } // shown v, r, e (kJ); answer t (s)
export interface SignRow { kind: 'v' | 'i'; rms: number; th: number; at: number } // shown rms and at; answer th (degrees)

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'coil'; assist: Assist } & CoilRow)
  | ({ kind: 'scope'; assist: Assist } & ScopeRow)
  | ({ kind: 'brew'; assist: Assist } & BrewRow)
  | ({ kind: 'sign'; assist: Assist; trig: 'v' | 'i' } & Omit<SignRow, 'kind'>);

export const COIL: CoilRow[][] = [
  [{ v: 220, p: 1210, r: 40 }, { v: 240, p: 1200, r: 48 }, { v: 220, p: 1100, r: 44 }, { v: 110, p: 242, r: 50 }],
  [{ v: 240, p: 960, r: 60 }, { v: 220, p: 605, r: 80 }, { v: 230, p: 529, r: 100 }, { v: 240, p: 720, r: 80 }],
  [{ v: 240, p: 1280, r: 45 }, { v: 220, p: 880, r: 55 }, { v: 230, p: 1150, r: 46 }, { v: 240, p: 800, r: 72 }],
];
export const SCOPE: ScopeRow[][] = [
  [{ vm: 311, v: 220 }, { vm: 325, v: 230 }, { vm: 339, v: 240 }],
  [{ vm: 156, v: 110 }, { vm: 170, v: 120 }, { vm: 184, v: 130 }, { vm: 212, v: 150 }],
  [{ vm: 283, v: 200 }, { vm: 297, v: 210 }, { vm: 226, v: 160 }, { vm: 255, v: 180 }],
];
export const BREW: BrewRow[][] = [
  [{ v: 220, r: 44, e: 132, t: 120 }, { v: 220, r: 40, e: 121, t: 100 }, { v: 240, r: 48, e: 108, t: 90 }],
  [{ v: 230, r: 46, e: 161, t: 140 }, { v: 110, r: 22, e: 44, t: 80 }, { v: 240, r: 60, e: 124.8, t: 130 }],
  [{ v: 240, r: 60, e: 144, t: 150 }, { v: 240, r: 36, e: 256, t: 160 }, { v: 230, r: 46, e: 126.5, t: 110 }, { v: 220, r: 55, e: 149.6, t: 170 }],
];
// kind 'v': the sign strikes when v = √2·rms·sin(th) first reaches `at` volts. kind 'i': a relay on the kettle line fires when
// i = √2·rms·sin(th) first reaches `at` amperes (rms is then the kettle's rms current).
export const SIGN: SignRow[][] = [
  [{ kind: 'v', rms: 220, th: 20, at: 106 }, { kind: 'v', rms: 230, th: 35, at: 187 }, { kind: 'i', rms: 5, th: 50, at: 5.42 }],
  [{ kind: 'i', rms: 4, th: 25, at: 2.39 }, { kind: 'v', rms: 240, th: 40, at: 218 }, { kind: 'i', rms: 10, th: 55, at: 11.6 }],
  [{ kind: 'v', rms: 220, th: 65, at: 282 }, { kind: 'i', rms: 6, th: 30, at: 4.24 }, { kind: 'v', rms: 230, th: 70, at: 306 }, { kind: 'i', rms: 8, th: 45, at: 8 }],
];

export const DIAL = {
  r: { min: 10, max: 120, step: 1, start: 120 }, // L1, Ω
  v: { min: 100, max: 250, step: 10, start: 100 }, // L2, V rms
  t: { min: 30, max: 300, step: 10, start: 30 }, // L3, s
  th: { min: 0, max: 355, step: 5, start: 0 }, // L4, degrees
};

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  if (level === 1) return COIL.map((pool, k) => ({ ...pick(pool, random), kind: 'coil', assist: aid(k) }) as Round);
  if (level === 2) return SCOPE.map((pool, k) => ({ ...pick(pool, random), kind: 'scope', assist: aid(k) }) as Round);
  if (level === 3) return BREW.map((pool, k) => ({ ...pick(pool, random), kind: 'brew', assist: aid(k) }) as Round);
  return SIGN.map((pool, k) => {
    const { kind: trig, ...row } = pick(pool, random);
    return { ...row, trig, kind: 'sign', assist: aid(k) } as Round;
  });
}

export type Fault = 'blow' | 'weak' | 'cold' | 'over' | 'early' | 'late';
export type Values = { r?: number; v?: number; t?: number; th?: number };

/** The power (W) the kettle really gives: L1 at coil R. */
export const powerL1 = (r: CoilRow, R: number) => (r.v * r.v) / R;
/** L2: the coil is sized for the selector setting `sel` (rated 1000 W there); the supply really is v. */
export const powerL2 = (sel: number, v: number, pRated = 1000) => pRated * (v / sel) ** 2;
/** L3: energy delivered in t seconds, kJ. */
export const energy = (r: BrewRow, t: number) => ((r.v * r.v) / r.r) * t / 1000;
/** L4: the instantaneous value at the player's angle (V or A). */
export const instant = (r: { rms: number }, th: number) => RT2 * r.rms * Math.sin(th * DEG);

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'coil': return x.r === r.r ? null : x.r! < r.r ? 'blow' : 'weak';
    case 'scope': return x.v === r.v ? null : x.v! < r.v ? 'blow' : 'weak';
    case 'brew': return x.t === r.t ? null : x.t! < r.t ? 'cold' : 'over';
    case 'sign': return x.th === r.th ? null : x.th! < r.th ? 'early' : 'late';
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;

/** Seconds into the take at which the verdict (hearts, score, text) lands. */
export function verdictDelay(r: Round, x: Values): number {
  if (r.kind === 'brew') return 1.0;
  if (r.kind === 'sign') return 0.8;
  const f = fault(r, x);
  return f === 'blow' ? 0.55 : f === 'weak' ? 1.05 : 1.1;
}

// ---- words ------------------------------------------------------------------------------------------------------------------------------------------------

const unit = (r: Extract<Round, { kind: 'sign' }>) => (r.trig === 'v' ? 'V' : 'A');
const what = (r: Extract<Round, { kind: 'sign' }>) => (r.trig === 'v' ? 'voltage' : 'current');

/** The goal line drawn on the canvas at round start. */
export function goal(r: Round): string {
  switch (r.kind) {
    case 'coil': return `New coil: ${r.p} W at ${r.v} V`;
    case 'scope': return `Scope peak ${r.vm} V: set the selector`;
    case 'brew': return `This order needs ${r.e} kJ of heat`;
    case 'sign': return r.trig === 'v' ? `Snap when the sign strikes at ${r.at} V` : `Snap when the kettle current hits ${r.at} A`;
  }
}

export function intel(r: Round): string {
  switch (r.kind) {
    case 'coil': return `The kettle is rated ${r.p} W at ${r.v} V. The stall’s fuse allows the rated current and no more.`;
    case 'scope': return `The scope shows a peak of ${r.vm} V. The selector is marked in rms volts.`;
    case 'brew': return `The supply is ${r.v} V and the coil is ${r.r} Ω. The chai needs ${r.e} kJ.`;
    case 'sign':
      return r.trig === 'v'
        ? `The supply is ${r.rms} V rms. The neon strikes when the voltage first reaches ${r.at} V.`
        : `The kettle draws ${r.rms} A rms. The relay fires when the current first reaches ${r.at} A.`;
  }
}

export const hintText = (r: Round) => `${intel(r)} ${r.assist === 0 ? 'Round 1: the stall meter is live.' : r.assist === 1 ? 'The meter is off: a meter check costs a charge.' : 'Last train: no meter.'}`;

/** What the player's own setting did, then what to change. It never prints the answer. */
export function missText(r: Round, x: Values): string {
  const f = fault(r, x);
  switch (f) {
    case null: return '';
    case 'blow':
      return r.kind === 'coil'
        ? `With ${x.r} Ω the coil drew more current than the fuse allows, and it blew. Use more resistance.`
        : `Set to ${x.v} V on this supply, the coil got too much power and the fuse blew. Turn the selector up.`;
    case 'weak':
      return r.kind === 'coil'
        ? `With ${x.r} Ω the coil was too weak: the chai was not ready when the train left. Use less resistance.`
        : `Set to ${x.v} V on this supply, the coil got too little power and the train left first. Turn the selector down.`;
    case 'cold': return `After ${x.t} s the chai had too little heat: lukewarm. Run the kettle longer.`;
    case 'over': return `After ${x.t} s the chai had too much heat and boiled over. Run it for less time.`;
    case 'early': return `At ${x.th}° the ${r.kind === 'sign' ? what(r) : 'voltage'} had not yet reached the trigger: the photo shows a dark sign. Sync later in the cycle.`;
    case 'late': return `At ${x.th}° the sign had already struck: the photo is a glare. Sync earlier in the cycle.`;
  }
}

/** The paid meter check: the player's own setting, with numbers. */
export function meterText(r: Round, x: Values): string {
  switch (r.kind) {
    case 'coil': return `Meter check: a ${x.r} Ω coil on ${r.v} V draws ${fmt(r.v / x.r!)} A and gives ${fmt(powerL1(r, x.r!))} W.`;
    case 'scope': return `Meter check: set to ${x.v} V, the coil would give ${fmt(powerL2(x.v!, r.v) / 10)}% of its rated power.`;
    case 'brew': return `Meter check: in ${x.t} s the kettle gives ${fmt(energy(r, x.t!))} kJ.`;
    case 'sign': return `Meter check: at ${x.th}° the ${what(r)} is ${fmt(instant(r, x.th!))} ${unit(r)}.`;
  }
}

export const LCD_OFF = '— — —';
/** The stall meter LCD's live text: the only place the player's resulting power, energy or instantaneous value appears before Fire. */
export function lcdText(r: Round, x: Values): string {
  switch (r.kind) {
    case 'coil': return `P ${fmt(powerL1(r, x.r!))} W`;
    case 'scope': return `power ${fmt(powerL2(x.v!, r.v) / 10)}%`;
    case 'brew': return `heat ${fmt(energy(r, x.t!))} kJ`;
    case 'sign': return `${fmt(instant(r, x.th!))} ${unit(r)} at ${x.th}°`;
  }
}

export function winText(r: Round): string {
  switch (r.kind) {
    case 'coil': return `Served! R = V²/P = ${r.v}² ÷ ${r.p} = ${r.r} Ω, drawing I = P/V = ${fmt(r.p / r.v)} A. The rating is rms; the supply peaks at √2 × ${r.v} = ${fmt(RT2 * r.v)} V.`;
    case 'scope': return `Served! The scope shows the peak, so V_rms = v_m/√2 = ${r.vm} ÷ 1.414 ≈ ${r.v} V, the value every rating uses.`;
    case 'brew': {
      const pw = fmt((r.v * r.v) / r.r);
      return `Served! The power never goes negative and averages V²/R = ${r.v}² ÷ ${r.r} = ${pw} W (half its peak), so t = E/P = ${Math.round(r.e * 1000)} ÷ ${pw} = ${r.t} s.`;
    }
    case 'sign':
      return r.trig === 'v'
        ? `Got the shot! v = v_m sin ωt with v_m = √2 × ${r.rms} = ${fmt(RT2 * r.rms)} V, so sin ωt = ${r.at} ÷ ${fmt(RT2 * r.rms)} and ωt = ${r.th}°.`
        : `Got the shot! In a resistor the current is in phase with the voltage: i = i_m sin ωt, i_m = √2 × ${r.rms} = ${fmt(RT2 * r.rms)} A, so ωt = ${r.th}°.`;
  }
}
