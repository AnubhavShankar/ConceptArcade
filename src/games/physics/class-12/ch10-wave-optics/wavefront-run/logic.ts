// Pure rules of Wavefront Run: no DOM, no canvas. Speeds are in units of 10⁸ m/s, wavelengths in nm.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

export const C = 3;
const RAD = Math.PI / 180;
export const sinD = (d: number) => Math.sin(d * RAD);
export const asinD = (x: number) => Math.asin(x) / RAD;
/** Frequency in Hz from a speed (10⁸ m/s) and a wavelength (nm). */
export const freq = (v: number, nm: number) => (v * 1e8) / (nm * 1e-9);

export interface MudRound {
  /** Wavelength in air (nm), refractive index of the medium. */
  lambda: number;
  n: number;
  /** The wavelength and speed in the medium (exact). */
  lamSol: number;
  vSol: number;
  assist: 0 | 1 | 2;
}
export interface BandRound {
  v1: number;
  v2: number;
  /** Angle of incidence (degrees) and the refraction angle that Huygens’ construction gives (exact). */
  i: number;
  rSol: number;
  assist: 0 | 1 | 2;
}

/** [wavelength in air, index]: the wavelength and speed in the medium come out as clean numbers. */
const MUD: [number, number][] = [[600, 1.5], [500, 1.25], [600, 1.2], [450, 1.5], [540, 1.2], [660, 1.5], [600, 2]];
/** [v1, v2] in 10⁸ m/s with a clean refraction angle for i = 30°. */
const BAND: [number, number][] = [[3, 2], [2, 3], [5, 6], [5, 4], [3, 4]];

export const SLIDERS = {
  lam: { min: 150, max: 700, step: 1 },
  v: { min: 1, max: 3, step: 0.01 },
  r: { min: 1, max: 85, step: 0.5 },
};

export function mudRounds(random: () => number): MudRound[] {
  return shuffle(MUD, random)
    .slice(0, 3)
    .sort((a, b) => b[1] - a[1])
    .map(([lambda, n], k) => ({ lambda, n, lamSol: lambda / n, vSol: C / n, assist: aid(k) }));
}
export function bandRounds(random: () => number): BandRound[] {
  return shuffle(BAND, random)
    .slice(0, 3)
    .map(([v1, v2], k) => ({ v1, v2, i: 30, rSol: asinD((v2 / v1) * sinD(30)), assist: aid(k) }));
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export function judgeMud(r: MudRound, lam: number, v: number): { ok: boolean; lamOk: boolean; vOk: boolean } {
  const lamOk = Math.abs(lam - r.lamSol) <= 0.5;
  const vOk = Math.abs(v - r.vSol) <= 0.005;
  return { ok: lamOk && vOk, lamOk, vOk };
}
export const judgeBand = (r: BandRound, deg: number) => Math.abs(deg - r.rSol) <= 0.26;

/** A test shot on the mud track: does the frequency stay the same? */
export function mudReading(r: MudRound, lam: number, v: number): string {
  const f0 = freq(C, r.lambda);
  const f1 = freq(v, lam);
  return `With λ′ = ${fmt(lam)} nm and v′ = ${fmt(v)} × 10⁸ m/s the frequency would be ${fmt(f1)} Hz; the wave coming in has ${fmt(f0)} Hz. ${Math.abs(f1 - f0) / f0 < 0.01 ? 'They agree.' : 'They do not agree.'}`;
}

export function mudMiss(r: MudRound, lam: number, v: number): string {
  const j = judgeMud(r, lam, v);
  const parts: string[] = [];
  if (Math.abs(freq(v, lam) - freq(C, r.lambda)) / freq(C, r.lambda) > 0.01) parts.push('The karts drift off the crests: your wavelength and speed would change the frequency, and the frequency cannot change.');
  if (!j.lamOk && parts.length === 0) parts.push('The karts keep up with the crests, but the wave in the mud does not have the wavelength the medium gives it.');
  if (!j.vOk && parts.length === 0) parts.push('The karts keep up with the crests, but the speed in the mud is not what its refractive index allows.');
  return parts.join(' ');
}
export const bandMiss = (r: BandRound, deg: number) =>
  `The wavefront you predicted at ${fmt(deg)}° ${deg > r.rSol ? 'cuts through' : 'floats clear of'} the secondary wavelets: the column would not stay in step.`;

export function mudExplain(r: MudRound): string[] {
  return [
    `The speed in the medium is v = c/n = 3/${r.n} = ${fmt(r.vSol)} × 10⁸ m/s. The frequency does not change, so λ′ = λ/n = ${r.lambda}/${r.n} = ${fmt(r.lamSol)} nm (Exercise 10.1).`,
    `The frequency is f = c/λ = ${fmt(freq(C, r.lambda))} Hz on both sides. The reflected light stays in air, so it keeps λ = ${r.lambda} nm, c and the same f.`,
  ];
}
export function bandExplain(r: BandRound): string[] {
  return [
    `Each wavelet spreads at the new speed v₂ = ${r.v2}, while the front reaches the next point at the old speed v₁ = ${r.v1}: sin r / sin i = v₂/v₁.`,
    `sin r = (${r.v2}/${r.v1}) × sin ${r.i}° = ${fmt((r.v2 / r.v1) * sinD(r.i))}, so r = ${fmt(r.rSol)}° (Huygens’ construction, Section 10.3).`,
  ];
}
