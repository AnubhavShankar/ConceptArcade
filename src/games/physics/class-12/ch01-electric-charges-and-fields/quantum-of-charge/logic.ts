// The Quark Hunt: rules, pools, judging and words. Pure functions only; the pools were checked by script (2026-10-31).
// Level 1: count the electrons that hover an oil drop (n e V / d = m g). Level 2: find the charge unit from readings (the largest step that fits).
// Level 3: flag the readings that are not whole numbers of e.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const E = 1.6e-19; // C, as in NCERT
export const G = 9.8; // m/s²
export const GAP = 0.005; // m, between the plates

type Assist = 0 | 1 | 2;
/** V volts, answer n electrons, shown mass m in units of 10⁻¹⁵ kg. */
export interface HoldRow { V: number; n: number; m: number }
/** Answer u du per electron; reads = ns × u (shown). */
export interface CalRow { u: number; ns: number[]; reads: number[] }
/** Five drops; drop i carries ks[i]/3 of e; ks[i] % 3 !== 0 is dust. */
export interface DustRow { ks: number[] }

// Checked by script on 2026-10-31. Round k's row comes from pool k.
export const HOLD: HoldRow[][] = [
  [{ V: 300, n: 3, m: 2.94 }, { V: 450, n: 2, m: 2.94 }, { V: 240, n: 5, m: 3.92 }, { V: 500, n: 4, m: 6.53 }],
  [{ V: 200, n: 7, m: 4.57 }, { V: 350, n: 6, m: 6.86 }, { V: 150, n: 9, m: 4.41 }, { V: 300, n: 8, m: 7.84 }],
  [{ V: 250, n: 10, m: 8.16 }, { V: 270, n: 11, m: 9.7 }, { V: 240, n: 12, m: 9.4 }, { V: 160, n: 13, m: 6.79 }],
];
export const CAL: CalRow[][] = [
  [{ u: 2.4, ns: [3, 5, 7], reads: [7.2, 12, 16.8] }, { u: 3.2, ns: [2, 5, 6], reads: [6.4, 16, 19.2] }, { u: 2.7, ns: [4, 6, 9], reads: [10.8, 16.2, 24.3] }, { u: 3.5, ns: [3, 4, 8], reads: [10.5, 14, 28] }],
  [{ u: 2.6, ns: [5, 7, 8], reads: [13, 18.2, 20.8] }, { u: 3.3, ns: [2, 3, 7], reads: [6.6, 9.9, 23.1] }, { u: 2.9, ns: [4, 7, 9], reads: [11.6, 20.3, 26.1] }, { u: 3.7, ns: [2, 6, 9], reads: [7.4, 22.2, 33.3] }],
  [{ u: 2.2, ns: [6, 9, 10], reads: [13.2, 19.8, 22] }, { u: 3.1, ns: [4, 5, 6], reads: [12.4, 15.5, 18.6] }, { u: 3.6, ns: [3, 8, 9], reads: [10.8, 28.8, 32.4] }, { u: 2.5, ns: [6, 8, 9], reads: [15, 20, 22.5] }],
];
export const DUST: DustRow[][] = [
  [{ ks: [9, 7, 15, 12, 24] }, { ks: [6, 18, 10, 21, 9] }, { ks: [12, 3, 21, 14, 6] }, { ks: [21, 9, 6, 18, 16] }],
  [{ ks: [6, 11, 18, 22, 12] }, { ks: [13, 3, 24, 17, 9] }, { ks: [9, 21, 4, 12, 19] }, { ks: [8, 25, 6, 15, 24] }],
  [{ ks: [16, 3, 12, 18, 23] }, { ks: [9, 5, 26, 12, 21] }, { ks: [18, 6, 25, 11, 15] }, { ks: [20, 15, 2, 24, 9] }],
];
/** A drop's reading in units of 10⁻¹⁹ C, to 2 decimals: 4.80, 3.73, 1.07, … */
export const reading = (k: number) => Number(((k / 3) * 1.6).toFixed(2));
export const isDust = (k: number) => k % 3 !== 0;

export type Round =
  | ({ kind: 'hold'; assist: Assist } & HoldRow)
  | ({ kind: 'cal'; assist: Assist } & CalRow)
  | ({ kind: 'dust'; assist: Assist } & DustRow);

export function buildRounds(level: 1 | 2 | 3, random: () => number): Round[] {
  const pools = [HOLD, CAL, DUST][level - 1] as unknown[][];
  const kind = (['hold', 'cal', 'dust'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export const N_DIAL = { min: 0, max: 15, start: 0 }; // level 1: extra electrons on the drop
export const U_DIAL = { min: 2, max: 6, step: 0.1, start: 6 }; // level 2: du per electron

/** Level 1: the upward electric push and the weight, in N. */
export const push = (r: HoldRow, n: number) => (n * E * r.V) / GAP;
export const weight = (r: HoldRow) => r.m * 1e-15 * G;
export type Fault = 'low' | 'high' | 'offrung' | 'kept' | 'tossed';

export function holdFault(r: HoldRow, n: number): Fault | null {
  return n === r.n ? null : n < r.n ? 'low' : 'high';
}
/** Level 2: how far a reading is from a whole number of rungs at spacing u (in rungs). */
export const offBy = (q: number, u: number) => Math.abs(q / u - Math.round(q / u));
export const fits = (r: CalRow, u: number) => r.reads.every((q) => offBy(q, u) < 0.02);
export function calFault(r: CalRow, u: number): Fault | null {
  return Math.abs(u - r.u) < 1e-9 ? null : 'offrung';
}
/** Level 3: flags[i] true means drop i was flagged as dust. Kept dust is reported before a tossed good drop. */
export function dustFault(r: DustRow, flags: boolean[]): Fault | null {
  if (r.ks.some((k, i) => isDust(k) && !flags[i])) return 'kept';
  if (r.ks.some((k, i) => !isDust(k) && flags[i])) return 'tossed';
  return null;
}
/** The fault of any round for the player's settings (n electrons, u du per electron, flags). */
export function faultOf(r: Round, s: { n: number; u: number; flags: boolean[] }): Fault | null {
  return r.kind === 'hold' ? holdFault(r, s.n) : r.kind === 'cal' ? calFault(r, s.u) : dustFault(r, s.flags);
}

// ---- words ----
export const sci = (x: number) => fmt(x);
export const two = (x: number) => x.toFixed(2);
export const LCD_OFF = '— — —';
export const ARIA = 'A night-shift physics lab: a physicist at a monitor beside a camera chamber where a charged oil drop floats between two plates, watched by a robot camera.';
export const LETTERS = 'ABCDE';

export function intel(r: Round): string {
  if (r.kind === 'hold') return `The drop’s mass is ${r.m} × 10⁻¹⁵ kg. The plates are 5 mm apart at ${r.V} V, top plate positive. Each electron carries e = 1.6 × 10⁻¹⁹ C.`;
  if (r.kind === 'cal') return `The detector read three drops at ${r.reads[0]}, ${r.reads[1]} and ${r.reads[2]} du. Every drop carries a whole number of electrons.`;
  return `Five drops, in units of 10⁻¹⁹ C: ${r.ks.map(reading).map(two).join(', ')}. A real free charge is a whole number of e = 1.6 × 10⁻¹⁹ C.`;
}
export const hintLine = (r: Round) => `${intel(r)} ${r.assist === 0 ? 'Round 1: the gauge is live.' : r.assist === 1 ? 'The gauge is off: a check costs a charge.' : 'Final run: no gauge.'}`;

/** The round's goal, one short line on the scene. */
export const goalText = (r: Round) =>
  r.kind === 'hold' ? `Hover the drop: ${r.V} V across 5 mm` : r.kind === 'cal' ? 'Calibrate: how many du is one electron?' : 'Flag every reading that is not a whole number of e';

export function missText(r: Round, f: Fault, s: { n: number; u: number }): string {
  if (f === 'low') {
    return s.n === 0
      ? 'With no extra electrons nothing pushed the drop up: it sank onto the bottom plate. Zap some electrons on.'
      : `With ${s.n} electron${s.n === 1 ? '' : 's'} the push n e V/d was less than the drop’s weight: it sank onto the bottom plate. It needs more electrons.`;
  }
  if (f === 'high') return `With ${s.n} electrons the push beat the weight: the drop rose and stuck to the top plate. It needs fewer electrons.`;
  if (f === 'offrung') return `At ${s.u.toFixed(1)} du per electron, not every reading is a whole number of rungs: a drop hung between two rungs. The right step fits all three readings exactly.`;
  if (f === 'kept') return 'Retracted: a drop you published is not a whole number of e. Divide every reading by 1.6 before you publish.';
  void r;
  return 'Too few drops: you threw away a drop whose reading is a whole number of e. Flag only the readings that are not.';
}

export function checkText(r: Round, s: { n: number; u: number }): string {
  if (r.kind === 'hold') return `Force check: ${s.n} electron${s.n === 1 ? '' : 's'} push up with ${sci(push(r, s.n))} N; the weight is ${sci(weight(r))} N.`;
  if (r.kind === 'cal') return `Fit check: at ${s.u.toFixed(1)} du per electron the drops would hold ${r.reads.map((q) => two(q / s.u)).join(', ')} electrons.`;
  return 'Ladder check: the strip of whole numbers of e shows for a moment.';
}

/** The live gauge text (round 1, and for 1.5 s after a check in round 2). Level 3 has no text: its helper is the e-ladder strip. */
export function lcdText(r: Round, s: { n: number; u: number }): string {
  if (r.kind === 'hold') return `up ${sci(push(r, s.n))} N · down ${sci(weight(r))} N`;
  if (r.kind === 'cal') return `counts ${r.reads.map((q) => two(q / s.u)).join(' · ')}`;
  return '';
}

export function winText(r: Round): string {
  if (r.kind === 'hold') {
    return `It hovers! n e V / d = m g, so n = m g d / (e V) = ${r.m} × 10⁻¹⁵ × 9.8 × 0.005 ÷ (1.6 × 10⁻¹⁹ × ${r.V}) = ${r.n}. The drop’s charge is q = −${r.n}e = −${fmt(r.n * 1.6)} × 10⁻¹⁹ C. Charge comes only in whole electrons: ${r.n - 1} would let it sink and ${r.n + 1} would lift it.`;
  }
  if (r.kind === 'cal') {
    return `Calibrated! ${r.reads.join(', ')} du are ${r.ns.join(', ')} electrons: each is a whole number of ${r.u} du. The smallest drop held ${Math.min(...r.ns)} electrons, not one. Half the step, ${fmt(r.u / 2)} du, would fit too, but then every count would be even: the unit is the largest step that fits every drop.`;
  }
  const keptList = r.ks.filter((k) => !isDust(k)).map((k) => k / 3).join(', ');
  const dustList = r.ks.filter(isDust).map((k) => two(k / 3)).join(', ');
  return `Published! The kept drops are ${keptList} e: whole numbers, as q = n e says. The flagged ones would be ${dustList} e. No free charge has ever been found that is not a whole number of e, so they were dust.`;
}
