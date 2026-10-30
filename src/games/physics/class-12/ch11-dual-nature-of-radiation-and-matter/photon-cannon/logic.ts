// Pure rules of Photon Cannon: no DOM, no canvas. Energies in eV, wavelengths in nm, frequencies in 10¹⁴ Hz, h in 10⁻³⁴ J s.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

/** hc/e in eV nm. */
export const HC = 1240;
export const H = 6.63;
export const E = 1.6;
/** Photon energy in eV for a wavelength in nm. */
export const photonEv = (lam: number) => HC / lam;
/** Maximum kinetic energy of the photoelectrons (eV), never below zero: no emission means none. */
export const kMax = (lam: number, phi: number) => Math.max(0, photonEv(lam) - phi);
/** The threshold wavelength (nm) of a metal with work function phi (eV). */
export const thresholdNm = (phi: number) => HC / phi;
/** V₀ (volts) from the V₀ = (h/e) f − φ line, with h in 10⁻³⁴ J s, f in 10¹⁴ Hz and φ in eV. */
export const stopV = (h: number, f: number, phi: number) => (h * f * 1e-34 * 1e14) / (E * 1e-19) - phi;

export interface ThresholdRound {
  phi: number;
  /** The wavelength that just frees an electron (exact). */
  lamSol: number;
  assist: 0 | 1 | 2;
}
export interface StopRound {
  lam: number;
  phi: number;
  /** The stopping potential, volts. */
  v0: number;
  assist: 0 | 1 | 2;
}
export interface LineRound {
  phi: number;
  /** Two measured points: frequency (10¹⁴ Hz) and stopping potential (V, to 0.01). */
  f1: number;
  v1: number;
  f2: number;
  v2: number;
  assist: 0 | 1 | 2;
}

/** Work functions whose threshold wavelength is a whole number of nm (with hc/e = 1240 eV nm). */
const THRESH = [2.0, 2.5, 3.1, 4.0, 1.55];
/** [wavelength nm, work function eV] with a stopping potential that is a multiple of 0.01 V. */
const STOP: [number, number][] = [[500, 2.14], [400, 2.0], [310, 2.5], [250, 3.1], [620, 1.55], [400, 2.3]];
/** Metals for the straight-line level. */
const LINE_PHI = [2.14, 2.3, 3.0, 4.2];

export const SLIDERS = {
  lam: { min: 200, max: 900, step: 1 },
  v: { min: 0, max: 4, step: 0.01 },
  h: { min: 4, max: 9, step: 0.01 },
  phi: { min: 1, max: 6, step: 0.01 },
};

export function thresholdRounds(random: () => number): ThresholdRound[] {
  return shuffle(THRESH, random)
    .slice(0, 3)
    .sort((a, b) => a - b)
    .map((phi, k) => ({ phi, lamSol: Math.round(thresholdNm(phi) * 1e6) / 1e6, assist: aid(k) }));
}
export function stopRounds(random: () => number): StopRound[] {
  return shuffle(STOP, random)
    .slice(0, 3)
    .map(([lam, phi]) => ({ lam, phi, v0: Math.round(kMax(lam, phi) * 100) / 100 }))
    .sort((a, b) => a.v0 - b.v0)
    .map((r, k) => ({ ...r, assist: aid(k) }));
}
export function lineRounds(random: () => number): LineRound[] {
  return shuffle(LINE_PHI, random)
    .slice(0, 3)
    .map((phi, k) => {
      // the threshold frequency in 10¹⁴ Hz: φ e / h with φ in eV, e = 1.6 × 10⁻¹⁹ C and h = 6.63 × 10⁻³⁴ J s
      const f0 = ((phi * E) / H) * 10;
      const f1 = Math.ceil(f0 * 2) / 2 + 1.5;
      const f2 = f1 + 3.5;
      return { phi, f1, f2, v1: Math.round(stopV(H, f1, phi) * 100) / 100, v2: Math.round(stopV(H, f2, phi) * 100) / 100, assist: aid(k) };
    });
}

// ---- judging --------------------------------------------------------------------------------------------------------------

/** A wavelength “just frees” an electron when the photon energy is within 0.02 eV of the work function. */
export const judgeThreshold = (r: ThresholdRound, lam: number) => Math.abs(photonEv(lam) - r.phi) <= 0.02;
export const judgeStop = (r: StopRound, v: number) => Math.abs(v - r.v0) <= 0.005;
export function judgeLine(r: LineRound, h: number, phi: number): { ok: boolean; hOk: boolean; phiOk: boolean } {
  const hOk = Math.abs(h - H) / H <= 0.02;
  const phiOk = Math.abs(phi - r.phi) <= 0.08;
  return { ok: hOk && phiOk, hOk, phiOk };
}

export const thresholdReading = (r: ThresholdRound, lam: number) => {
  const e = photonEv(lam);
  return `At ${fmt(lam)} nm each photon carries ${fmt(e)} eV; the metal needs ${fmt(r.phi)} eV. ${e < r.phi ? 'No electron can leave.' : `Electrons leave with up to ${fmt(e - r.phi)} eV.`}`;
};
export const stopReading = (r: StopRound, v: number) => {
  const k = kMax(r.lam, r.phi);
  return `${fmt(photonEv(r.lam))} eV photons free electrons with up to ${fmt(k)} eV from this metal; against ${fmt(v)} V ${k > v + 0.005 ? 'some still reach the collector.' : 'none reaches the collector.'}`;
};
export const lineReading = (r: LineRound, h: number, phi: number) => {
  const m1 = stopV(h, r.f1, phi);
  const m2 = stopV(h, r.f2, phi);
  return `Your line gives ${fmt(m1)} V at ${fmt(r.f1)} × 10¹⁴ Hz and ${fmt(m2)} V at ${fmt(r.f2)} × 10¹⁴ Hz; the measurements are ${fmt(r.v1)} V and ${fmt(r.v2)} V.`;
};

export function thresholdMiss(r: ThresholdRound, lam: number): string {
  return photonEv(lam) < r.phi ? 'The photons are too weak: the electrons only shake in the metal and none escapes.' : 'The photons are more than strong enough: electrons are thrown out fast, so this is not the faintest light that works.';
}
export const stopMiss = (r: StopRound, v: number) => (v < r.v0 ? 'The fastest electrons still get through to the collector: the push-back is too weak.' : 'The push-back stops every electron, but it is stronger than it needs to be: the fastest electron turned back well short of the collector.');
/** Level 3: where the dials start. Neither is within the tolerance of any round's answer (φ is 0.6 eV from the nearest work function; h is far from 6.63). */
export const LINE_START = { h: 5, phi: 3.6 };
/** Which side of each measured point the player's line passes: +1 above it, −1 below it (the left point first). Direction only, never how far. */
export function lineSides(r: LineRound, h: number, phi: number): [1 | -1, 1 | -1] {
  const side = (f: number, v: number): 1 | -1 => (stopV(h, f, phi) - v >= 0 ? 1 : -1);
  return [side(r.f1, r.v1), side(r.f2, r.v2)];
}
/** After a miss: the side of each measured point the line passes, in fixed words: never a verdict on a dial and never a number. */
export function lineMiss(r: LineRound, h: number, phi: number): string {
  const [a, b] = lineSides(r, h, phi);
  if (a > 0 && b > 0) return 'The line passes above both measured points.';
  if (a < 0 && b < 0) return 'The line passes below both measured points.';
  return a < 0 ? 'The line passes below the left point and above the right one: it climbs too steeply.' : 'The line passes above the left point and below the right one: it climbs too gently.';
}

export function thresholdExplain(r: ThresholdRound): string[] {
  return [
    `Electrons just escape when hc/λ = φ, so λ₀ = hc/φ = 1240 eV nm / ${fmt(r.phi)} eV = ${fmt(r.lamSol)} nm (Exercise 11.7).`,
    'Longer wavelengths (lower frequencies) free no electrons at all, however bright the light: below the threshold frequency the photoelectric effect does not happen.',
  ];
}
export function stopExplain(r: StopRound): string[] {
  return [
    `Photon energy hc/λ = 1240/${r.lam} = ${fmt(photonEv(r.lam))} eV. The fastest electron has K_max = ${fmt(photonEv(r.lam))} − ${fmt(r.phi)} = ${fmt(r.v0)} eV.`,
    `It is just stopped by eV₀ = K_max, so V₀ = ${fmt(r.v0)} V (Exercises 11.2, 11.3, 11.9; Example 11.2).`,
  ];
}
export function lineExplain(r: LineRound): string[] {
  return [
    `eV₀ = hf − φ, so V₀ against f is a straight line of slope h/e: h = e(V₂ − V₁)/(f₂ − f₁) = 1.6 × 10⁻¹⁹ × (${fmt(r.v2)} − ${fmt(r.v1)}) / (${fmt(r.f2 - r.f1)} × 10¹⁴) = 6.6 × 10⁻³⁴ J s (Exercise 11.5).`,
    `The line meets V₀ = 0 at the threshold frequency, and φ = hf₁ − eV₁ = ${fmt(r.phi)} eV.`,
  ];
}

// ---- level 4: brightness and colour (Sections 11.4.1 to 11.4.3) -----------------------------------------------------------
// Currents in µA, energies in eV, voltages in V; the stopping voltage dial is stored in whole tenths of a volt (0 to 40).

export interface BrightRound {
  /** The reference run: lamp brightness, saturation current (µA), photon energy (eV) and stopping potential (V). */
  b1: number;
  i1: number;
  e1: number;
  v01: number;
  /** The new run: photon energy (eV) and the target saturation current (µA). */
  e2: number;
  i2: number;
  /** The answer: the brightness, and the stopping voltage in whole tenths of a volt. */
  b2: number;
  v02t: number;
  /** The work function of the tube, E₁ − V₀₁, in eV. */
  phi: number;
  assist: 0 | 1 | 2;
}
/** [b₁, I₁, E₁, V₀₁, E₂, I₂] */
export type BrightRow = [number, number, number, number, number, number];
/** One group of rows per round: the same colour, a new colour with the same current, and both change (the boss). */
export const BRIGHT_ROWS: BrightRow[][] = [
  [[2, 6, 3.0, 1.2, 3.0, 15], [3, 9, 2.8, 0.8, 2.8, 21], [4, 10, 3.5, 1.5, 3.5, 20], [1, 4, 2.6, 0.6, 2.6, 12]],
  [[3, 9, 2.8, 0.8, 3.6, 9], [2, 8, 3.0, 1.0, 4.2, 8], [5, 10, 2.5, 0.3, 3.1, 10]],
  [[4, 8, 2.5, 0.5, 3.9, 14], [2, 5, 3.2, 1.1, 2.6, 15], [3, 6, 4.0, 1.7, 3.3, 16]],
];
export const BRIGHT_SLIDERS = { b: { min: 1, max: 10, step: 1 }, vt: { min: 0, max: 40, step: 1 } };
/** Where both dials start. Neither value is the answer of any row (b is never 1, V₀ is never 0). */
export const BRIGHT_START = { b: 1, vt: 0 };
/** The ammeter reads 0 to 28 µA; a wrong brightness parks the needle this far (µA) above or below the target mark, whatever the brightness. */
export const NEEDLE_MAX = 28;
export const NEEDLE_OFFSET = 4;

const tenths = (x: number) => Math.round(x * 10);
/** A value in volts or eV with one decimal. */
export const d1 = (x: number) => x.toFixed(1);
/** The dial value in whole tenths of a volt, written in volts. */
export const voltsText = (vt: number) => d1(vt / 10);

export function brightRound(row: BrightRow, k: number): BrightRound {
  const [b1, i1, e1, v01, e2, i2] = row;
  return { b1, i1, e1, v01, e2, i2, b2: Math.round((b1 * i2) / i1), v02t: tenths(v01) + tenths(e2 - e1), phi: (tenths(e1) - tenths(v01)) / 10, assist: aid(k) };
}
export function brightRounds(random: () => number): BrightRound[] {
  return BRIGHT_ROWS.map((rows, k) => brightRound(shuffle(rows, random)[0], k));
}

export function judgeBright(r: BrightRound, b: number, vt: number): { ok: boolean; bOk: boolean; vOk: boolean } {
  const bOk = b === r.b2;
  const vOk = vt === r.v02t;
  return { ok: bOk && vOk, bOk, vOk };
}

/** What the needle does at the end of a run: the target mark when the brightness is right, else a fixed distance above or below it. */
export const needleReading = (r: BrightRound, b: number) => (b === r.b2 ? r.i2 : r.i2 + (b < r.b2 ? -NEEDLE_OFFSET : NEEDLE_OFFSET));

export type StreamKind = 'stopped' | 'through' | 'early';
/** What the electrons do against the player's voltage. */
export const streamKind = (r: BrightRound, vt: number): StreamKind => (vt === r.v02t ? 'stopped' : vt < r.v02t ? 'through' : 'early');
/** How far across the gap (0 to 1) electron i of 6 gets before turning back: fixed patterns, never a function of the voltage chosen. */
export function turnFraction(kind: StreamKind, i: number): number {
  if (kind === 'stopped') return (i + 1) / 6;
  if (kind === 'through') return Math.min(1, (i + 1) * 0.3);
  return (0.55 * (i + 1)) / 6;
}

/** The lamp's photon rate b is the number of photon streams it sends (more photons per second, the same energy each). */
export const streamsText = (n: number) => `${n} photon stream${n === 1 ? '' : 's'}`;
export const brightIntel = (r: BrightRound) =>
  `Reference run: the lamp sends ${streamsText(r.b1)} and gives a saturation current of ${r.i1} µA, and photons of ${d1(r.e1)} eV are stopped by ${d1(r.v01)} V. Now ${r.e2 === r.e1 ? 'the same colour' : `photons of ${d1(r.e2)} eV`} and a target current of ${r.i2} µA: set the photon rate (the number of streams) and the stopping voltage.`;
/** The paid test run may show numbers, like the other levels. */
export function brightReading(r: BrightRound, b: number, vt: number): string {
  return `Test run: photon rate ${b} gives a saturation current of ${fmt((b * r.i1) / r.b1)} µA (target ${r.i2} µA). ${d1(r.e2)} eV photons free electrons with up to ${voltsText(r.v02t)} eV from this tube; against ${voltsText(vt)} V ${vt < r.v02t ? 'some still reach the collector.' : 'none reaches the collector.'}`;
}
/** A miss: the brightness is checked first; the direction only, never the target current or the stopping voltage. */
export function brightMiss(r: BrightRound, b: number, vt: number): string {
  if (b !== r.b2) return `At photon rate ${b} the current saturated ${b < r.b2 ? 'below' : 'above'} the target mark.`;
  return `At ${voltsText(vt)} V the fastest electrons ${vt < r.v02t ? 'still reached the collector' : 'turned back before the gap was closed'}: the meter did not read zero exactly at the stopping voltage.`;
}
export const brightExplain = (r: BrightRound) =>
  `The saturation current is set by how many photons arrive per second, so it is proportional to the photon rate: b = ${r.b1} × ${r.i2}/${r.i1} = ${r.b2}. The stopping potential depends only on the photon energy: φ = ${d1(r.e1)} − ${d1(r.v01)} = ${d1(r.phi)} eV, so V₀ = ${d1(r.e2)} − ${d1(r.phi)} = ${voltsText(r.v02t)} V${r.e2 === r.e1 ? ', the same as before, however many photons arrive' : ''}.`;
export const brightWin = (r: BrightRound) => `Both readings match! ${brightExplain(r)}`;

// ---- fixed miss effects for levels 1 and 2 (a miss shows the side only, never a value that follows the player's setting) ------

/** Level 1: the start wavelength (nm) and level 2: the start retarding voltage (V). Neither wins any round. */
export const THRESHOLD_START = 700;
export const STOP_START = 0.2;
/** Level 1: how fast the freed electrons fly during a shot, one fixed value per side (0 when the photon is too weak to free any). */
export const FLY_SPEED = { win: 60, strong: 140 };
export function thresholdFly(r: ThresholdRound, lam: number): number {
  if (judgeThreshold(r, lam)) return FLY_SPEED.win;
  return photonEv(lam) < r.phi ? 0 : FLY_SPEED.strong;
}
export type StopKind = 'stopped' | 'through' | 'early';
/** Level 2: what the electrons do during a shot, from the side of the stopping potential only. */
export const stopKind = (r: StopRound, v: number): StopKind => (judgeStop(r, v) ? 'stopped' : v < r.v0 ? 'through' : 'early');
/** How far across the gap (0 to 1) electron i of 5 (i from 1) gets before turning back: fixed patterns, never L·K_max/V. */
export function stopTurnFraction(kind: StopKind, i: number): number {
  if (kind === 'stopped') return i / 5;
  if (kind === 'through') return Math.min(1, i * 0.34);
  return (0.55 * i) / 5;
}
