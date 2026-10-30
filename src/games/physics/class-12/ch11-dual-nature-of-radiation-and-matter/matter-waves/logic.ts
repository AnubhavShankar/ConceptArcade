// Pure rules of Matter Waves: no DOM, no canvas. h = 6.63 × 10⁻³⁴ J s, e = 1.6 × 10⁻¹⁹ C, electron mass 9.1 × 10⁻³¹ kg.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

export const H = 6.63e-34;
export const E = 1.6e-19;
export const ME = 9.1e-31;
/** Photons per second, in units of 10¹⁵, for a beam of power P (mW) and frequency f (10¹⁴ Hz). */
export const photonsPerSec = (fE14: number, pMw: number) => (pMw * 1e-3) / (H * fE14 * 1e14) / 1e15;
/** Photon energy in 10⁻¹⁹ J. */
export const photonJ = (fE14: number) => (H * fE14 * 1e14) / 1e-19;
/** de Broglie wavelength (nm) of an electron accelerated from rest through V volts. */
export const electronNm = (volts: number) => (H / Math.sqrt(2 * ME * E * volts)) * 1e9;
/** Shortest X-ray wavelength (Å) from a tube at V kilovolts: λ = hc/eV. */
export const xrayMinA = (kv: number) => 12.4 / kv;
/** Highest X-ray frequency (10¹⁸ Hz) from a tube at V kilovolts: f = eV/h. */
export const xrayMaxF = (kv: number) => (E * kv * 1e3) / H / 1e18;

export interface CountRound {
  f: number;
  p: number;
  nSol: number;
  assist: 0 | 1 | 2;
}
export interface TuneRound {
  /** The spacing the electron wave must match (nm, to 3 decimals). */
  target: number;
  assist: 0 | 1 | 2;
}
export interface TubeRound {
  /** The shortest wavelength wanted (Å, to 3 decimals) and the tube voltage that gives it (kV). */
  target: number;
  kvSol: number;
  assist: 0 | 1 | 2;
}

/** [frequency in 10¹⁴ Hz, power in mW] */
const COUNT: [number, number][] = [[6.0, 2.0], [5.0, 1.0], [4.5, 0.6], [4.0, 2.65], [3.0, 1.99], [7.5, 3.0]];
/** Accelerating voltages whose electron wavelength is the target spacing. */
const TUNE: number[] = [25, 100, 400, 150, 60];
const TUBE: number[] = [20, 30, 40, 50, 25];

export const SLIDERS = {
  n: { min: 1, max: 30, step: 0.1 },
  v: { min: 10, max: 800, step: 1 },
  kv: { min: 5, max: 80, step: 1 },
};
/** Where each dial starts: never the answer of any round. */
export const START = { n: 1, v: 200, kv: 10 };
/** Where the burst of points and the "−1 ♥" appear: a fixed point, never where the answer is drawn. */
export const HIT: Record<'n' | 'v' | 'kv', [number, number]> = { n: [470, 160], v: [330, 175], kv: [480, 200] };
/** Level 3: the x on the canvas of a wavelength in Å (the spectrum runs from 0 to 1.2 Å over the width of the track). */
export const specX = (lam: number) => 60 + (lam / 1.2) * 520;
/** On a miss the drawn effect is a fixed multiple of the wanted value, never the player's own result: [too small, too big]. */
export const MISS_FRAC = { under: 0.55, over: 1.45 };

export function countRounds(random: () => number): CountRound[] {
  return shuffle(COUNT, random)
    .slice(0, 3)
    .map(([f, p]) => ({ f, p, nSol: photonsPerSec(f, p) }))
    .sort((a, b) => a.nSol - b.nSol)
    .map((r, k) => ({ ...r, assist: aid(k) }));
}
export function tuneRounds(random: () => number): TuneRound[] {
  return shuffle(TUNE, random)
    .slice(0, 3)
    .map((v) => Math.round(electronNm(v) * 1000) / 1000)
    .sort((a, b) => b - a)
    .map((target, k) => ({ target, assist: aid(k) }));
}
export function tubeRounds(random: () => number): TubeRound[] {
  return shuffle(TUBE, random)
    .slice(0, 3)
    .sort((a, b) => a - b)
    .map((kvSol, k) => ({ kvSol, target: Math.round(xrayMinA(kvSol) * 1000) / 1000, assist: aid(k) }));
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export const judgeCount = (r: CountRound, n: number) => Math.abs(n - r.nSol) / r.nSol <= 0.02;
export const judgeTune = (r: TuneRound, v: number) => Math.abs(electronNm(v) - r.target) / r.target <= 0.015;
export const judgeTube = (r: TubeRound, kv: number) => Math.abs(xrayMinA(kv) - r.target) / r.target <= 0.015;

export const countReading = (r: CountRound) => `Each photon carries ${fmt(photonJ(r.f))} × 10⁻¹⁹ J (hf with f = ${fmt(r.f)} × 10¹⁴ Hz). The beam carries ${fmt(r.p)} mW.`;
export const tuneReading = (v: number) => `At ${fmt(v)} V the electron’s de Broglie wavelength is ${fmt(electronNm(v))} nm.`;
export const tubeReading = (kv: number) => `At ${fmt(kv)} kV the shortest X-ray wavelength is ${fmt(xrayMinA(kv))} Å, and the highest frequency is ${fmt(xrayMaxF(kv))} × 10¹⁸ Hz.`;

export const countMiss = (r: CountRound, n: number) => (n > r.nSol ? 'You counted more photons than the beam can supply: the power would be bigger than it is.' : 'You counted fewer photons than are arriving: the beam would carry less power than it does.');
export const tuneMiss = (r: TuneRound, v: number) => (electronNm(v) > r.target ? 'The electron wave is too long for the crystal: its crests fall between the atom rows.' : 'The electron wave is too short for the crystal: its crests crowd inside the atom rows.');
export const tubeMiss = (r: TubeRound, kv: number) => (xrayMinA(kv) > r.target ? 'The X-rays stop at a longer wavelength than wanted: the electrons are not energetic enough.' : 'The X-rays reach a shorter wavelength than wanted: the electrons are more energetic than needed.');

export function countExplain(r: CountRound): string[] {
  return [
    `Each photon has E = hf = 6.63 × 10⁻³⁴ × ${fmt(r.f)} × 10¹⁴ = ${fmt(photonJ(r.f))} × 10⁻¹⁹ J.`,
    `P = NE, so N = P/E = ${fmt(r.p)} × 10⁻³ W / (${fmt(photonJ(r.f))} × 10⁻¹⁹ J) = ${fmt(r.nSol)} × 10¹⁵ photons per second (Example 11.1, Exercise 11.4).`,
  ];
}
export function tuneExplain(r: TuneRound): string[] {
  const vSol = (H / (r.target * 1e-9)) ** 2 / (2 * ME * E);
  return [
    `An electron accelerated through V has p = √(2meV), so λ = h/p = h/√(2meV) ≈ 1.23 nm / √V (V in volts).`,
    `For λ = ${fmt(r.target)} nm: V = (h/λ)²/(2me) ≈ ${fmt(vSol)} V (Exercise 11.10, Example 11.3).`,
  ];
}
export function tubeExplain(r: TubeRound): string[] {
  return [
    `An electron of energy eV can give all of it to one X-ray photon: hc/λ_min = eV, so λ_min = hc/eV = 12.4 kV Å / V.`,
    `For λ_min = ${fmt(r.target)} Å: V = 12.4/${fmt(r.target)} = ${fmt(r.kvSol)} kV, and the highest frequency is eV/h = ${fmt(xrayMaxF(r.kvSol))} × 10¹⁸ Hz (Exercise 11.1).`,
  ];
}
