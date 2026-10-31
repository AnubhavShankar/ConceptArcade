// Rules of "Float the Bead": a metal bead floats above a charged base where the Coulomb push equals its weight, k q Q / h² = m g.
// Levels 1 to 3: the player sets the bead's charge so it floats in a laser beam. Level 4: the charge is given, the player sets the laser height.
// Pure functions only: no DOM, no canvas, no Math.random. Randomness comes from the `random` argument through `pick`.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const K = 9e9; // N m² C⁻², as in NCERT
export const G = 9.8; // m/s²
/** Pixels: on a miss the bead is drawn this far above or below the beam, never at its true height. */
export const OFFSET = 34;
/** Seconds into the shot at which the verdict lands (hearts, score and text), in every level. */
export const VERDICT = 1.1;

export interface FloatRow { m: number; Q: number; q: number; h: number } // level 1: m g, Q µC, answer q nC, shown h cm
export interface TinyRow { m: number; Q: number; q: number; h: number } // levels 2 and 3: m mg, Q nC (signed in level 3), answer q pC (signed), shown h mm
export interface AimRow { m: number; Q: number; h: number; q: number } // level 4: m g, Q µC, answer h cm, shown q nC

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'float'; assist: Assist } & FloatRow)
  | ({ kind: 'tiny'; assist: Assist } & TinyRow)
  | ({ kind: 'signed'; assist: Assist } & TinyRow)
  | ({ kind: 'aim'; assist: Assist } & AimRow);

// Every row was checked by script: exactly one winning dial setting, shown heights and charges to 3 figures that solve back to the answer.
export const FLOAT: FloatRow[][] = [
  [{ m: 1, Q: 2, q: 4, h: 8.57 }, { m: 2, Q: 3, q: 8, h: 10.5 }, { m: 1.5, Q: 4, q: 7, h: 13.1 }, { m: 0.5, Q: 1, q: 11, h: 14.2 }],
  [{ m: 1, Q: 3, q: 5, h: 11.7 }, { m: 2, Q: 1, q: 13, h: 7.73 }, { m: 1.5, Q: 2, q: 9, h: 10.5 }, { m: 2, Q: 4, q: 14, h: 16 }],
  [{ m: 1, Q: 1, q: 16, h: 12.1 }, { m: 2, Q: 3, q: 17, h: 15.3 }, { m: 1.5, Q: 3, q: 6, h: 10.5 }, { m: 2, Q: 1, q: 19, h: 9.34 }],
];
export const TINY: TinyRow[][] = [
  [{ m: 20, Q: 20, q: 27, h: 4.98 }, { m: 50, Q: 50, q: 21, h: 4.39 }, { m: 20, Q: 50, q: 12, h: 5.25 }, { m: 80, Q: 50, q: 34, h: 4.42 }],
  [{ m: 20, Q: 10, q: 32, h: 3.83 }, { m: 50, Q: 50, q: 29, h: 5.16 }, { m: 20, Q: 50, q: 16, h: 6.06 }, { m: 20, Q: 20, q: 19, h: 4.18 }],
  [{ m: 50, Q: 20, q: 38, h: 3.74 }, { m: 20, Q: 50, q: 24, h: 7.42 }, { m: 80, Q: 50, q: 26, h: 3.86 }, { m: 20, Q: 20, q: 35, h: 5.67 }],
];
export const SIGNED: TinyRow[][] = [
  [{ m: 20, Q: -20, q: -23, h: 4.6 }, { m: 50, Q: 50, q: 17, h: 3.95 }, { m: 20, Q: -50, q: -8, h: 4.29 }, { m: 80, Q: 50, q: 30, h: 4.15 }],
  [{ m: 20, Q: 50, q: 20, h: 6.78 }, { m: 50, Q: -50, q: -33, h: 5.51 }, { m: 20, Q: -10, q: -36, h: 4.07 }, { m: 20, Q: 20, q: 11, h: 3.18 }],
  [{ m: 50, Q: -50, q: -25, h: 4.79 }, { m: 20, Q: -20, q: -31, h: 5.34 }, { m: 80, Q: -50, q: -22, h: 3.55 }, { m: 20, Q: 50, q: 28, h: 8.02 }],
];
export const AIM: AimRow[][] = [
  [{ m: 1, Q: 2, h: 9, q: 4.41 }, { m: 2, Q: 3, h: 12, q: 10.5 }, { m: 1.5, Q: 2, h: 7, q: 4 }, { m: 1, Q: 4, h: 15, q: 6.13 }],
  [{ m: 2, Q: 2, h: 10, q: 10.9 }, { m: 1, Q: 3, h: 13, q: 6.13 }, { m: 0.5, Q: 1, h: 6, q: 1.96 }, { m: 2, Q: 4, h: 16, q: 13.9 }],
  [{ m: 1, Q: 1, h: 11, q: 13.2 }, { m: 2, Q: 4, h: 14, q: 10.7 }, { m: 1.5, Q: 3, h: 8, q: 3.48 }, { m: 1, Q: 2, h: 5, q: 1.36 }],
];

export const DIAL = {
  q1: { min: 1, max: 20, start: 1 }, // level 1, nC
  q2: { min: 1, max: 40, start: 1 }, // level 2, pC
  q3: { min: -40, max: 40, start: 0 }, // level 3, pC
  h4: { min: 2, max: 19, start: 19 }, // level 4, cm
};

/** Float height for levels 1 and 4: m in g, Q in µC, q in nC; returns cm. */
export const floatCm = (m: number, Q: number, q: number) => 100 * Math.sqrt((K * q * 1e-9 * Q * 1e-6) / (m * 1e-3 * G));
/** Float height for levels 2 and 3: m in mg, |Q| in nC, |q| in pC; returns mm. */
export const floatMm = (m: number, Q: number, q: number) => 1000 * Math.sqrt((K * Math.abs(q) * 1e-12 * Math.abs(Q) * 1e-9) / (m * 1e-6 * G));

/** The push of the base at a height, and the bead's weight, for the force check: levels 1 and 4 in mN, levels 2 and 3 in µN. */
export function forces(r: Round, x: number): { push: number; weight: number; unit: 'mN' | 'µN' } {
  if (r.kind === 'float') return { push: ((K * x * 1e-9 * r.Q * 1e-6) / (r.h / 100) ** 2) * 1000, weight: r.m * 1e-3 * G * 1000, unit: 'mN' };
  if (r.kind === 'aim') return { push: ((K * r.q * 1e-9 * r.Q * 1e-6) / (x / 100) ** 2) * 1000, weight: r.m * 1e-3 * G * 1000, unit: 'mN' };
  return { push: ((K * Math.abs(x) * 1e-12 * Math.abs(r.Q) * 1e-9) / (r.h / 1000) ** 2) * 1e6, weight: r.m * 1e-6 * G * 1e6, unit: 'µN' };
}

/** Three rounds, one row from each pool; the first and only use of `random` in a level. */
export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  const pools = [FLOAT, TINY, SIGNED, AIM][level - 1] as unknown[][];
  const kind = (['float', 'tiny', 'signed', 'aim'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'low' | 'high' | 'pulled' | 'flat';
export type Values = { q?: number; h?: number };

/** null is a win. `low`: the bead floats below the beam. `high`: above it. `pulled`: wrong sign. `flat`: no charge. */
export function fault(r: Round, x: Values): Fault | null {
  if (r.kind === 'aim') {
    const h = x.h!;
    return h === r.h ? null : h > r.h ? 'low' : 'high'; // a beam set too high leaves the bead floating below it
  }
  const q = x.q!;
  if (r.kind === 'signed') {
    if (q === 0) return 'flat';
    if (Math.sign(q) !== Math.sign(r.Q)) return 'pulled';
  }
  return q === r.q ? null : Math.abs(q) < Math.abs(r.q) ? 'low' : 'high';
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;

// ---- words -----------------------------------------------------------------------------------------------------------------------------------------------

/** A signed number with a true minus. */
export const sgnQ = (x: number) => `${x < 0 ? '−' : '+'}${Math.abs(x)}`;
/** The unit of the height and of the bead's mass in a round. */
export const lengthUnit = (r: Round) => (r.kind === 'float' || r.kind === 'aim' ? 'cm' : 'mm');
export const massUnit = (r: Round) => (r.kind === 'float' || r.kind === 'aim' ? 'g' : 'mg');
export const baseUnit = (r: Round) => (r.kind === 'float' || r.kind === 'aim' ? 'µC' : 'nC');

export function intel(r: Round): string {
  if (r.kind === 'float') return `The bead weighs ${r.m} g and the base holds +${r.Q} µC. The laser crosses the column at ${r.h} cm.`;
  if (r.kind === 'tiny') return `The bead weighs ${r.m} mg and the base holds +${r.Q} nC. The laser crosses the column at ${r.h} mm.`;
  if (r.kind === 'signed') return `The bead weighs ${r.m} mg and the base holds ${sgnQ(r.Q)} nC. The laser crosses the column at ${r.h} mm.`;
  return `The bead weighs ${r.m} g and carries +${r.q} nC; the base holds +${r.Q} µC.`;
}

export const hintText = (r: Round) =>
  `${intel(r)} ${r.assist === 0 ? 'Round 1: the float gauge is live.' : r.assist === 1 ? 'The gauge is off: a force check costs a charge.' : 'Final chamber: no gauge.'}`;

/** What the player's setting did, never the answer. */
export function missText(r: Round, x: Values): string {
  const f = fault(r, x);
  if (r.kind === 'aim') {
    return f === 'low'
      ? `The bead floated below a beam set at ${x.h} cm: the laser passed over it. Lower the laser.`
      : `The bead floated above a beam set at ${x.h} cm: the laser passed under it. Raise the laser.`;
  }
  const unit = r.kind === 'float' ? 'nC' : 'pC';
  if (r.kind === 'signed') {
    if (f === 'flat') return 'An uncharged bead feels no push from the base: it just sat in the clamp.';
    if (f === 'pulled') return `A ${sgnQ(x.q!)} pC bead and a ${r.Q < 0 ? 'negative' : 'positive'} base attract: the bead was pulled down onto the base and its charge sparked away. Only like charges repel.`;
    return `With ${sgnQ(x.q!)} pC the sign was right, but the bead floated ${f === 'low' ? 'below' : 'above'} the beam: ${f === 'low' ? 'more' : 'less'} charge of the same sign moves it toward the beam.`;
  }
  return f === 'low'
    ? `With ${x.q} ${unit} the push from the base matched the bead’s weight below the beam: the laser passed over it. More charge floats it higher.`
    : `With ${x.q} ${unit} the push held the bead above the beam: the laser passed under it. Less charge floats it lower.`;
}

/** The paid force check (a charge). */
export function checkText(r: Round, x: Values): string {
  const { push, weight, unit } = forces(r, (x.q ?? x.h)!);
  if (r.kind === 'aim') return `Force check: at ${x.h} cm the base pushes the bead up with ${fmt(push)} mN; its weight is ${fmt(weight)} mN.`;
  const who = r.kind === 'float' ? `${x.q} nC` : `${sgnQ(x.q!)} pC`;
  const how = push === 0 ? 'not pushed at all' : `${r.kind === 'signed' && Math.sign(x.q!) !== Math.sign(r.Q) ? 'pulled down' : 'pushed up'} with ${fmt(push)} ${unit}`;
  return `Force check: in the beam, a ${who} bead is ${how}; its weight is ${fmt(weight)} ${unit}.`;
}

export const LCD_OFF = '— — —';

/** The live float gauge in round 1; also shown for 1.5 s after a force check in round 2. */
export function lcdText(r: Round, x: Values): string {
  if (r.kind === 'float') return `floats at ${fmt(floatCm(r.m, r.Q, x.q!))} cm`;
  if (r.kind === 'tiny') return `floats at ${fmt(floatMm(r.m, r.Q, x.q!))} mm`;
  if (r.kind === 'signed') {
    if (x.q === 0) return 'no push';
    if (Math.sign(x.q!) !== Math.sign(r.Q)) return 'pulled to the base';
    return `floats at ${fmt(floatMm(r.m, r.Q, x.q!))} mm`;
  }
  const f = forces(r, x.h!);
  return `at ${x.h} cm: push ${fmt(f.push)} mN · weight ${fmt(f.weight)} mN`;
}

export function winText(r: Round): string {
  if (r.kind === 'float') {
    return `Melted! In the beam the push equals the weight: k q Q / h² = m g, so q = m g h² / (k Q) = ${r.m} × 10⁻³ × 9.8 × (${fmt(r.h / 100)})² ÷ (9 × 10⁹ × ${r.Q} × 10⁻⁶) = ${r.q} × 10⁻⁹ C = ${r.q} nC. The height goes as √q: four times the charge floats the bead only twice as high.`;
  }
  if (r.kind === 'tiny') {
    return `Melted! In SI units: q = m g h² / (k Q) = ${r.m} × 10⁻⁶ × 9.8 × (${r.h} × 10⁻³)² ÷ (9 × 10⁹ × ${r.Q} × 10⁻⁹) = ${r.q} × 10⁻¹² C = ${r.q} pC.`;
  }
  if (r.kind === 'signed') {
    const sign = r.Q < 0 ? 'negative' : 'positive';
    return `Melted! The base is ${sign} and only like charges repel, so the bead needs a ${sign} charge. Its size: q = m g h² / (k |Q|) = ${r.m} × 10⁻⁶ × 9.8 × (${r.h} × 10⁻³)² ÷ (9 × 10⁹ × ${Math.abs(r.Q)} × 10⁻⁹) = ${Math.abs(r.q)} pC, so q = ${sgnQ(r.q)} pC.`;
  }
  return `Melted! The bead floats where k q Q / h² = m g, so h = √(k q Q / (m g)) = √(9 × 10⁹ × ${r.q} × 10⁻⁹ × ${r.Q} × 10⁻⁶ ÷ (${r.m} × 10⁻³ × 9.8)) = ${fmt(r.h / 100)} m = ${r.h} cm.`;
}

/** The text of the goal line on the scene. */
export function goalText(r: Round): string {
  if (r.kind === 'float') return `Melt the bead: beam at ${r.h} cm`;
  if (r.kind === 'tiny') return `Melt the bead: beam at ${r.h} mm`;
  if (r.kind === 'signed') return `Melt the bead: base ${sgnQ(r.Q)} nC, beam at ${r.h} mm`;
  return `Bead charged +${r.q} nC: aim the laser`;
}
