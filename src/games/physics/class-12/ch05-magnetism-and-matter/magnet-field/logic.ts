// Pure rules of the Magnet Field game: no DOM, no canvas.
// Magnetic moments in J/T, distances in cm where named, fields in µT. μ₀/4π = 10⁻⁷ T m/A.
import { pick } from '@core/quiz';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e5 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => Math.abs(value - answer) / Math.abs(answer) <= tol;

/** Field of a short bar magnet on its axis at distance r (cm), in µT: (μ₀/4π) 2m/r³. */
export const axialUT = (m: number, rCm: number) => ((1e-7 * 2 * m) / (rCm / 100) ** 3) * 1e6;
/** Field on the equatorial line at the same distance: half of the axial value, in the opposite direction. */
export const equatorialUT = (m: number, rCm: number) => axialUT(m, rCm) / 2;
/** The distance (cm) at which the axial field of the magnet equals an external field bUT. */
export const compensationCm = (m: number, bUT: number) => Math.cbrt((1e-7 * 2 * m) / (bUT * 1e-6)) * 100;
/** Net field on the axis of the magnet when an external field of bExtUT opposes it, in µT (positive = along the moment). */
export const netOnAxisUT = (m: number, rCm: number, bExtUT: number) => axialUT(m, rCm) - bExtUT;

// ---- levels --------------------------------------------------------------------------------------------------------------

export type Along = 'along' | 'against';
export interface LevelShort {
  kind: 'short';
  story: string;
  m: number;
  rCm: number;
  axial: number;
  equatorial: number;
  freeTests: number;
}
export interface LevelCompensate {
  kind: 'compensate';
  story: string;
  m: number;
  /** The external field shown, in µT. */
  bExt: number;
  rCm: number;
  freeTests: number;
}
export interface LevelScale {
  kind: 'scale';
  story: string;
  m: number;
  r1Cm: number;
  k: number;
  b1: number;
  eqNew: number;
  freeTests: number;
}
export type Level = LevelShort | LevelCompensate | LevelScale;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const m = pick([0.32, 0.48, 0.6, 1.2], random);
    const rCm = pick([10, 15, 20], random);
    return {
      kind: 'short',
      story: 'A short bar magnet produces a field that falls off as the cube of the distance. Find the size of its field at a point on its axis and at a point on the perpendicular bisector (the equatorial line) at the same distance, and say which way each field points compared with the magnetic moment.',
      m,
      rCm,
      axial: axialUT(m, rCm),
      equatorial: equatorialUT(m, rCm),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const m = pick([0.5, 1, 2], random);
    const rCm = pick([12, 15, 20, 25], random);
    const bExt = Number(axialUT(m, rCm).toPrecision(3));
    return {
      kind: 'compensate',
      story: 'A short bar magnet lies with its axis pointing south to north, opposite to a steady external field. Slide the probe along the axis. Somewhere the field of the magnet exactly cancels the external field, and the net field is zero. Find the distance of that point from the centre of the magnet.',
      m,
      bExt,
      rCm: compensationCm(m, bExt),
      freeTests: 1,
    };
  }
  const m = pick([0.48, 0.6, 1.2], random);
  const r1Cm = pick([10, 12, 15], random);
  const k = pick([1.5, 2, 3], random);
  const b1 = Number(axialUT(m, r1Cm).toPrecision(3));
  return {
    kind: 'scale',
    story: 'The field of a short bar magnet is measured on its axis at a certain distance. From it, predict the field on the equatorial line at a different distance, without being told the magnetic moment.',
    m,
    r1Cm,
    k,
    b1,
    eqNew: b1 / (2 * k ** 3),
    freeTests: 1,
  };
}

export function judgeShort(lvl: LevelShort, axial: number, equatorial: number, axialDir: Along, eqDir: Along): { ok: boolean; aOk: boolean; eOk: boolean; adOk: boolean; edOk: boolean } {
  const aOk = within(axial, lvl.axial, 0.03);
  const eOk = within(equatorial, lvl.equatorial, 0.03);
  const adOk = axialDir === 'along';
  const edOk = eqDir === 'against';
  return { ok: aOk && eOk && adOk && edOk, aOk, eOk, adOk, edOk };
}
export function judgeCompensate(lvl: LevelCompensate, rCm: number): { ok: boolean } {
  return { ok: within(rCm, lvl.rCm, 0.03) };
}
export function judgeScale(lvl: LevelScale, eq: number): { ok: boolean } {
  return { ok: within(eq, lvl.eqNew, 0.03) };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'short') {
    return [
      `On the axis B = (μ₀/4π) 2m/r³ = 10⁻⁷ × 2 × ${lvl.m} / ${lvl.rCm / 100}³ = ${fmt(lvl.axial)} µT, pointing along the moment (from south to north inside the magnet, out of the north pole).`,
      `On the equatorial line B = (μ₀/4π) m/r³ = ${fmt(lvl.equatorial)} µT, half as big, and pointing opposite to the moment. This is the electric dipole result with 1/ε₀ replaced by μ₀ and p by m.`,
    ];
  }
  if (lvl.kind === 'compensate') {
    return [
      `The two fields cancel when (μ₀/4π) 2m/r³ = B, so r³ = 2 × 10⁻⁷ m/B = 2 × 10⁻⁷ × ${lvl.m} / (${lvl.bExt} × 10⁻⁶).`,
      `That gives r = ${fmt(lvl.rCm)} cm. Closer than this the magnet's field is stronger and the net field points along m; further out the external field wins.`,
    ];
  }
  return [
    `From the axial field at r₁: (μ₀/4π) m/r₁³ = B₁/2, so the equatorial field at r₁ would be ${fmt(lvl.b1 / 2)} µT.`,
    `The field falls as 1/r³, so at ${lvl.k} r₁ it is divided by ${lvl.k}³: B = ${lvl.b1} / (2 × ${lvl.k}³) = ${fmt(lvl.eqNew)} µT. You never need m: only the ratios matter.`,
  ];
}
