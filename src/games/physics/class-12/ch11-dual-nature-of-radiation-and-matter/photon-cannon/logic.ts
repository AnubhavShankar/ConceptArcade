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
export function lineMiss(r: LineRound, h: number, phi: number): string {
  const j = judgeLine(r, h, phi);
  if (!j.hOk && j.phiOk) return 'The line has the wrong slope: it misses at least one of the two points.';
  if (j.hOk && !j.phiOk) return 'The line is parallel to the data but sits too high or too low: it misses both points.';
  return 'The line misses the measured points.';
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
