// Rules for "Lights of the High Pass" (Section 7.4 and 7.5): the player sets the frequency of a lodge's water-turbine supply so a sealed choke or a sealed
// capacitor gives its lamps the right current. Pure functions only: no DOM, no canvas, no Math.random (randomness comes from the `random` argument).
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const TWO_PI = 2 * Math.PI;
/** Lamp brightness: fixed values, never proportional to the error. */
export const GLOW = { dim: 0.25, right: 1 } as const;

/** Shown v (V), l (mH), i (A); the answer f (Hz). */
export interface ChokeRow { v: number; l: number; i: number; f: number }
/** Shown v, c (µF), i; the answer f. */
export interface CapRow { v: number; c: number; i: number; f: number }
/** The trail needs at least `trail` A and the beacon at least `porch` A. */
export interface BothRow { v: number; l: number; c: number; trail: number; porch: number; f: number }
/** The answer f is where the reactance of the choke or capacitor equals R. */
export interface SteadyRow { r: number; part: 'L' | 'C'; l?: number; c?: number; f: number }

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'choke'; assist: Assist } & ChokeRow)
  | ({ kind: 'cap'; assist: Assist } & CapRow)
  | ({ kind: 'both'; assist: Assist } & BothRow)
  | ({ kind: 'steady'; assist: Assist } & SteadyRow);

// The pools: one row per round, copied from the brief (checked by script on 2026-10-31).
export const CHOKE: ChokeRow[][] = [
  [{ v: 220, l: 44, i: 15.9, f: 50 }, { v: 230, l: 100, i: 9.15, f: 40 }, { v: 240, l: 80, i: 8.68, f: 55 }, { v: 220, l: 60, i: 13, f: 45 }],
  [{ v: 230, l: 90, i: 11.6, f: 35 }, { v: 230, l: 65, i: 8.8, f: 64 }, { v: 220, l: 120, i: 6.08, f: 48 }, { v: 230, l: 75, i: 9.39, f: 52 }],
  [{ v: 240, l: 110, i: 8.27, f: 42 }, { v: 230, l: 45, i: 11.3, f: 72 }, { v: 230, l: 60, i: 10.5, f: 58 }, { v: 240, l: 90, i: 6.43, f: 66 }],
];
export const CAP: CapRow[][] = [
  [{ v: 220, c: 15, i: 1.04, f: 50 }, { v: 110, c: 60, i: 2.49, f: 60 }, { v: 230, c: 20, i: 1.3, f: 45 }, { v: 240, c: 25, i: 1.51, f: 40 }],
  [{ v: 220, c: 30, i: 1.49, f: 36 }, { v: 240, c: 18, i: 1.9, f: 70 }, { v: 220, c: 45, i: 3.42, f: 55 }, { v: 240, c: 20, i: 1.93, f: 64 }],
  [{ v: 230, c: 40, i: 1.85, f: 32 }, { v: 220, c: 30, i: 3.11, f: 75 }, { v: 240, c: 35, i: 2.53, f: 48 }, { v: 110, c: 80, i: 3.21, f: 58 }],
];
export const BOTH: BothRow[][] = [
  [{ v: 230, l: 80, c: 30, trail: 9.08, porch: 2.15, f: 50 }, { v: 220, l: 100, c: 25, trail: 7.87, porch: 1.51, f: 44 }, { v: 240, l: 60, c: 20, trail: 11.1, porch: 1.71, f: 57 }],
  [{ v: 220, l: 70, c: 40, trail: 13, porch: 2.07, f: 38 }, { v: 230, l: 50, c: 15, trail: 11.5, porch: 1.36, f: 63 }, { v: 240, l: 90, c: 35, trail: 9.14, porch: 2.4, f: 46 }],
  [{ v: 230, l: 120, c: 45, trail: 8.84, porch: 2.18, f: 34 }, { v: 240, l: 45, c: 18, trail: 12.4, porch: 1.83, f: 68 }, { v: 220, l: 65, c: 28, trail: 10.1, porch: 2.03, f: 53 }, { v: 230, l: 55, c: 22, trail: 10.8, porch: 1.93, f: 61 }],
];
export const STEADY: SteadyRow[][] = [
  [{ r: 30, part: 'L', l: 298, f: 16 }, { r: 40, part: 'C', c: 199, f: 20 }, { r: 25, part: 'L', l: 181, f: 22 }],
  [{ r: 50, part: 'C', c: 227, f: 14 }, { r: 35, part: 'L', l: 223, f: 25 }, { r: 20, part: 'C', c: 284, f: 28 }],
  [{ r: 45, part: 'L', l: 398, f: 18 }, { r: 30, part: 'C', c: 166, f: 32 }, { r: 60, part: 'L', l: 367, f: 26 }, { r: 40, part: 'C', c: 332, f: 12 }],
];

export const DIAL = {
  f: { min: 20, max: 100, step: 1, start: 20 }, // levels 1 to 3, Hz
  f4: { min: 10, max: 60, step: 1, start: 10 }, // level 4, Hz
};
/** The dial of a level. */
export const dialOf = (level: 1 | 2 | 3 | 4) => (level === 4 ? DIAL.f4 : DIAL.f);

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  const pools = [CHOKE, CAP, BOTH, STEADY][level - 1] as unknown[][];
  const kind = (['choke', 'cap', 'both', 'steady'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

/** Reactances in ohms (l in mH, c in µF). */
export const xl = (lmH: number, f: number) => TWO_PI * f * lmH * 1e-3;
export const xc = (cuF: number, f: number) => 1 / (TWO_PI * f * cuF * 1e-6);
/** Level 4: the reactance of the round's choke or capacitor. */
export const xPart = (r: SteadyRow, f: number) => (r.part === 'L' ? xl(r.l!, f) : xc(r.c!, f));
/** Level 3: the frequency edges from the shown numbers (the trail is bright enough iff f <= fa, the beacon iff f >= fb). */
export const edges = (r: BothRow) => ({ fa: r.v / (TWO_PI * r.l * 1e-3 * r.trail), fb: r.porch / (TWO_PI * r.c * 1e-6 * r.v) });

export type Fault = 'burst' | 'dim' | 'trail' | 'porch' | 'part' | 'dropper';
export type Values = { f?: number };

export function fault(r: Round, x: Values): Fault | null {
  const f = x.f!;
  if (f === r.f) return null;
  switch (r.kind) {
    case 'choke': return f < r.f ? 'burst' : 'dim'; // slower: smaller X_L, more current
    case 'cap': return f < r.f ? 'dim' : 'burst'; // slower: bigger X_C, less current
    case 'both': return f < r.f ? 'porch' : 'trail'; // slower starves the beacon, faster the trail
    case 'steady': return (r.part === 'L') === (f < r.f) ? 'part' : 'dropper'; // 'part': the choke or capacitor lamp outshone the dropper lamp
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;

/** Seconds into the take at which the verdict lands. */
export const verdictDelay = (r: Round, x: Values) => {
  const f = fault(r, x);
  return f === 'burst' ? 0.65 : f === 'dim' || f === 'trail' ? 1.15 : f === 'porch' ? 1.4 : 1.0;
};

// ---- words ----------------------------------------------------------------------------------------------------------------------------------------------

export const partName = (r: SteadyRow) => (r.part === 'L' ? 'choke' : 'capacitor');
export const partValue = (r: SteadyRow) => (r.part === 'L' ? `${r.l} mH` : `${r.c} µF`);

/** The canvas goal line (UX item 1). */
export function goal(r: Round): string {
  switch (r.kind) {
    case 'choke': return `Trail lamps need ${r.i} A`;
    case 'cap': return `Porch beacon needs ${r.i} A`;
    case 'both': return `Trail ≥ ${r.trail} A and beacon ≥ ${r.porch} A`;
    case 'steady': return 'Make the beacon steady';
  }
}

export function intel(r: Round): string {
  switch (r.kind) {
    case 'choke': return `The trail lamps are 12-volt lamps fed through a sealed ${r.l} mH choke, so the choke sets their current. The regulator holds ${r.v} V. They need ${r.i} A.`;
    case 'cap': return `The porch beacon is a 12-volt lamp fed through a sealed ${r.c} µF capacitor, so the capacitor sets its current. The regulator holds ${r.v} V. It needs ${r.i} A.`;
    case 'both': return `One turbine at ${r.v} V feeds the trail lamps through a ${r.l} mH choke and the porch beacon through a ${r.c} µF capacitor. The trail needs at least ${r.trail} A and the beacon at least ${r.porch} A.`;
    case 'steady': return `One beacon lamp is fed through a resistor dropper (${r.r} Ω with its lamp), the other through a sealed ${partValue(r)} ${partName(r)}. Their currents must be equal.`;
  }
}

export const hintText = (r: Round) => `${intel(r)} ${r.assist === 0 ? 'Round 1: the lamp meter is live.' : r.assist === 1 ? 'The meter is off: a meter check costs a charge.' : 'Last party: no meter.'}`;

/** The text of the miss: the player's own frequency, then the direction (never the answer). */
export function missText(r: Round, x: Values): string {
  const f = x.f!;
  switch (fault(r, x)) {
    case 'burst':
      return r.kind === 'choke'
        ? `At ${f} Hz the choke’s reactance was too small: too much current, and a trail lamp burst. Run the turbine faster.`
        : `At ${f} Hz the capacitor’s reactance was too small: too much current, and the porch beacon burst. Run the turbine slower.`;
    case 'dim':
      return r.kind === 'choke'
        ? `At ${f} Hz the choke’s reactance was too big: the trail lamps only glowed and the trekkers lost the path. Run the turbine slower.`
        : `At ${f} Hz the capacitor’s reactance was too big: the porch beacon only glowed. Run the turbine faster.`;
    case 'porch': return `At ${f} Hz the trail was bright, but the beacon was too dim and the trekkers walked past the door. Run the turbine a little faster.`;
    case 'trail': return `At ${f} Hz the beacon was bright, but the trail lamps were too dim and the trekkers lost the path. Run the turbine a little slower.`;
    case 'part': return `At ${f} Hz the ${partName(r as SteadyRow)} lamp outshone the dropper lamp, so the beacon still flickered and the snow strobed. Run the turbine ${(r as SteadyRow).part === 'L' ? 'faster' : 'slower'}.`;
    case 'dropper': return `At ${f} Hz the dropper lamp outshone the ${partName(r as SteadyRow)} lamp, so the beacon still flickered and the snow strobed. Run the turbine ${(r as SteadyRow).part === 'L' ? 'slower' : 'faster'}.`;
    default: return '';
  }
}

/** The paid meter check (the first line of the LCD in short form is `lcdText`). */
export function meterText(r: Round, x: Values): string {
  const f = x.f!;
  switch (r.kind) {
    case 'choke': return `Meter check: at ${f} Hz the choke’s reactance is ${fmt(xl(r.l, f))} Ω and the trail lamps draw ${fmt(r.v / xl(r.l, f))} A.`;
    case 'cap': return `Meter check: at ${f} Hz the capacitor’s reactance is ${fmt(xc(r.c, f))} Ω and the beacon draws ${fmt(r.v / xc(r.c, f))} A.`;
    case 'both': return `Meter check: at ${f} Hz the trail lamps draw ${fmt(r.v / xl(r.l, f))} A and the beacon ${fmt(r.v / xc(r.c, f))} A.`;
    case 'steady': return `Meter check: at ${f} Hz the ${partName(r)}’s reactance is ${fmt(xPart(r, f))} Ω; the dropper line has ${r.r} Ω.`;
  }
}

/** The lamp meter's live text (round 1, and for 1.5 s after a paid check in round 2). */
export function lcdText(r: Round, x: Values): string {
  const f = x.f!;
  switch (r.kind) {
    case 'choke': return `trail ${fmt(r.v / xl(r.l, f))} A`;
    case 'cap': return `beacon ${fmt(r.v / xc(r.c, f))} A`;
    case 'both': return `trail ${fmt(r.v / xl(r.l, f))} A · beacon ${fmt(r.v / xc(r.c, f))} A`;
    case 'steady': return `X ${fmt(xPart(r, f))} Ω · R ${r.r} Ω`;
  }
}
export const LCD_OFF = '— — —';

export function winText(r: Round): string {
  switch (r.kind) {
    case 'choke': return `The trail is lit! The choke needs X_L = V/I = ${r.v} ÷ ${r.i} = ${fmt(r.v / r.i)} Ω, and X_L = 2πfL gives f = ${fmt(r.v / r.i)} ÷ (2π × ${r.l / 1000}) = ${r.f} Hz. In a choke the current lags the voltage by a quarter cycle.`;
    case 'cap': return `The beacon shines! The capacitor needs X_C = V/I = ${r.v} ÷ ${r.i} = ${fmt(r.v / r.i)} Ω, and X_C = 1/(2πfC) gives f = 1 ÷ (2π × ${r.c} × 10⁻⁶ × ${fmt(r.v / r.i)}) = ${r.f} Hz. Its current leads by a quarter cycle and peaks at √2 × ${r.i} = ${fmt(Math.SQRT2 * r.i)} A.`;
    case 'both': return `Both lamps lit! X_L = 2πfL rises with f and X_C = 1/(2πfC) falls, so speeding up dims the trail and brightens the beacon. The trail needs f ≤ ${fmt(edges(r).fa)} Hz and the beacon f ≥ ${fmt(edges(r).fb)} Hz: only ${r.f} Hz does both.`;
    case 'steady': return `A steady beacon! At ${r.f} Hz the ${partName(r)}’s reactance ${r.part === 'L' ? '2πfL' : '1/(2πfC)'} equals the dropper’s ${r.r} Ω, so both lamps carry the same current. Its current is a quarter cycle ${r.part === 'L' ? 'behind' : 'ahead'}, so one lamp peaks as the other goes dark (sin² + cos² = 1). The ${partName(r)} takes no average power; the dropper burns I²R.`;
  }
}
