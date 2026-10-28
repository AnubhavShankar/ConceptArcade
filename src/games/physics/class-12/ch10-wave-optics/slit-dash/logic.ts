// Pure rules of Slit Dash: no DOM, no canvas. Wavelengths in nm, lengths on the screen in mm, slit separation in mm, screen distance in m.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

/** Position (mm) of the n-th bright fringe: x = nλD/d with λ in nm, D in m and d in mm. */
export const fringeX = (n: number, lamNm: number, Dm: number, dMm: number) => (n * lamNm * 1e-9 * Dm) / (dMm * 1e-3) * 1e3;
/** Fringe width (mm). */
export const fringeWidth = (lamNm: number, Dm: number, dMm: number) => fringeX(1, lamNm, Dm, dMm);
/** Relative intensity at screen position x (mm): cos²(π d x / λ D) for two equal coherent slits (1 at the centre). */
export const intensity = (xMm: number, lamNm: number, Dm: number, dMm: number) => Math.cos((Math.PI * (dMm * 1e-3) * (xMm * 1e-3)) / (lamNm * 1e-9 * Dm)) ** 2;
/** Intensity relative to the maximum for a path difference of `frac` wavelengths: cos²(π Δ/λ). */
export const gauge = (frac: number) => Math.cos(Math.PI * frac) ** 2;

export interface HunterRound {
  d: number;
  D: number;
  n: number;
  /** Where the target is, mm from the centre, and the wavelength that puts the n-th bright fringe on it. */
  x: number;
  lamSol: number;
  assist: 0 | 1 | 2;
}
export interface LockRound {
  lam1: number;
  lam2: number;
  d: number;
  D: number;
  /** The smallest fringe orders that make the two colours coincide, and where. */
  n1: number;
  n2: number;
  xSol: number;
  assist: 0 | 1 | 2;
}
export interface GaugeRound {
  /** Path difference in wavelengths, and the intensity as a fraction of K (the intensity at a path difference of λ). */
  frac: number;
  sol: number;
  assist: 0 | 1 | 2;
}

/** [d mm, D m, n, x mm]: the wavelength comes out a whole number of nm. */
const HUNT: [number, number, number, number][] = [[0.28, 1.4, 4, 12], [0.2, 1, 3, 9], [0.5, 2, 5, 10], [0.3, 1.5, 2, 6], [0.25, 1, 4, 8], [0.4, 2, 3, 9]];
/** [λ1, λ2] in nm for D/d = 2000 (D = 1 m, d = 0.5 mm). */
const LOCK: [number, number][] = [[650, 520], [600, 450], [700, 560], [600, 400], [450, 300], [500, 400]];
const GAUGE: number[] = [1 / 3, 1 / 4, 1 / 6, 1 / 2, 2 / 3, 3 / 4, 5 / 6];

export const SLIDERS = {
  lam: { min: 380, max: 760, step: 5 },
  x: { min: 0.5, max: 12, step: 0.1 },
  g: { min: 0, max: 1, step: 0.05 },
};
export const LOCK_D = 0.5;
export const LOCK_DD = 1;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function hunterRounds(random: () => number): HunterRound[] {
  return shuffle(HUNT, random)
    .slice(0, 3)
    .map(([d, D, n, x], k) => ({ d, D, n, x, lamSol: Math.round(((x * 1e-3 * d * 1e-3) / (n * D)) * 1e9 * 1e6) / 1e6, assist: aid(k) }));
}
export function lockRounds(random: () => number): LockRound[] {
  return shuffle(LOCK, random)
    .slice(0, 3)
    .map(([lam1, lam2], k) => {
      const g = gcd(lam1, lam2);
      const n1 = lam2 / g;
      const n2 = lam1 / g;
      return { lam1, lam2, d: LOCK_D, D: LOCK_DD, n1, n2, xSol: fringeX(n1, lam1, LOCK_DD, LOCK_D), assist: aid(k) };
    });
}
export function gaugeRounds(random: () => number): GaugeRound[] {
  return shuffle(GAUGE, random)
    .slice(0, 3)
    .map((frac, k) => ({ frac, sol: gauge(frac), assist: aid(k) }));
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export const judgeHunter = (r: HunterRound, lam: number) => Math.abs(lam - r.lamSol) <= 2.6;
export const judgeLock = (r: LockRound, x: number) => Math.abs(x - r.xSol) <= 0.05;
export const judgeGauge = (r: GaugeRound, v: number) => Math.abs(v - r.sol) <= 0.024;

export function hunterReading(r: HunterRound, lam: number): string {
  return `With λ = ${fmt(lam)} nm the ${r.n}th bright fringe lands ${fmt(fringeX(r.n, lam, r.D, r.d))} mm from the centre; the target is at ${fmt(r.x)} mm.`;
}
export function lockReading(r: LockRound, x: number): string {
  const n1 = (x * 1e-3 * r.d * 1e-3) / (r.lam1 * 1e-9 * r.D);
  const n2 = (x * 1e-3 * r.d * 1e-3) / (r.lam2 * 1e-9 * r.D);
  return `At ${fmt(x)} mm you are at fringe order ${fmt(n1)} of ${r.lam1} nm and ${fmt(n2)} of ${r.lam2} nm. A bright fringe needs a whole number of wavelengths.`;
}

export function hunterMiss(r: HunterRound, lam: number): string {
  const x = fringeX(r.n, lam, r.D, r.d);
  return `The ${r.n}th bright fringe lands ${fmt(Math.abs(x - r.x))} mm ${x > r.x ? 'past' : 'short of'} the target.`;
}
export function lockMiss(r: LockRound, x: number): string {
  const n1 = (x * 1e-3 * r.d * 1e-3) / (r.lam1 * 1e-9 * r.D);
  const n2 = (x * 1e-3 * r.d * 1e-3) / (r.lam2 * 1e-9 * r.D);
  const near = (n: number) => Math.abs(n - Math.round(n)) < 0.08;
  if (near(n1) && !near(n2)) return `Only the ${r.lam1} nm fringe is bright there; the ${r.lam2} nm light is in a dark or half-bright part.`;
  if (near(n2) && !near(n1)) return `Only the ${r.lam2} nm fringe is bright there; the ${r.lam1} nm light is in a dark or half-bright part.`;
  if (near(n1) && near(n2)) return 'Both colours are bright there, but it is not the nearest place to the centre where they coincide.';
  return 'Neither colour has a bright fringe there.';
}
export function gaugeMiss(r: GaugeRound, v: number): string {
  return v > r.sol ? 'The two waves do not add up that brightly: the real light is dimmer than your gauge says.' : 'The two waves add up brighter than your gauge says.';
}

export function hunterExplain(r: HunterRound): string[] {
  return [
    `The ${r.n}th bright fringe is at x = nλD/d, so λ = xd/(nD) = ${fmt(r.x)} mm × ${fmt(r.d)} mm / (${r.n} × ${fmt(r.D)} m) = ${fmt(r.lamSol)} nm.`,
    'Each bright fringe is one more whole wavelength of path difference; the fringes are equally spaced, a distance λD/d apart (Exercise 10.4).',
  ];
}
export function lockExplain(r: LockRound): string[] {
  return [
    `Bright fringes of the two colours coincide where n₁λ₁ = n₂λ₂: ${r.lam1}n₁ = ${r.lam2}n₂ gives n₁ : n₂ = ${r.n1} : ${r.n2}. The smallest whole numbers are n₁ = ${r.n1}, n₂ = ${r.n2}.`,
    `x = n₁λ₁D/d = ${r.n1} × ${r.lam1} nm × ${fmt(r.D)} m / ${fmt(r.d)} mm = ${fmt(r.xSol)} mm (Exercise 10.6).`,
  ];
}
export function gaugeExplain(r: GaugeRound): string[] {
  return [
    `A path difference Δ gives a phase φ = 2πΔ/λ, so I = 4I₀cos²(φ/2). At Δ = λ that is the maximum, K = 4I₀.`,
    `At Δ = ${fmt(r.frac)}λ, I/K = cos²(π × ${fmt(r.frac)}) = ${fmt(r.sol)} (Exercise 10.5).`,
  ];
}
