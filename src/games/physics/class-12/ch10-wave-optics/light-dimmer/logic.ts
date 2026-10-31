// Pure rules of Light Dimmer: no DOM, no canvas. Slit widths and wavelengths in nm, angles in degrees.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

const RAD = Math.PI / 180;
export const sinD = (d: number) => Math.sin(d * RAD);
export const cosD = (d: number) => Math.cos(d * RAD);
export const asinD = (x: number) => Math.asin(x) / RAD;
/** Single-slit diffraction: I/I₀ = (sin β / β)² with β = π a sin θ / λ. */
export function slitIntensity(a: number, lam: number, deg: number): number {
  const beta = (Math.PI * a * sinD(deg)) / lam;
  return Math.abs(beta) < 1e-9 ? 1 : (Math.sin(beta) / beta) ** 2;
}
/** Angle of the n-th dark band, or null when it does not exist (nλ > a). */
export const minimumDeg = (n: number, lam: number, a: number) => (n * lam > a ? null : asinD((n * lam) / a));
/** Malus’ law through unpolarised light and one polaroid: ½, then cos²θ for the next one. */
export const twoPolaroids = (theta: number) => 0.5 * cosD(theta) ** 2;
/** A polaroid at θ between crossed polaroids: I/I₀ = cos²θ sin²θ = ¼ sin²2θ, where I₀ is the light after the first. */
export const middlePolaroid = (theta: number) => cosD(theta) ** 2 * sinD(theta) ** 2;

export interface SlitRound {
  /** Which dark band, the wavelength (nm) and where the target is (degrees). */
  n: number;
  lam: number;
  theta: number;
  /** The slit width that puts that dark band on the target (nm). */
  aSol: number;
  assist: 0 | 1 | 2;
}
export interface ShadeRound {
  /** The wanted fraction of the original (unpolarised) intensity, and the angle between the polaroids that gives it. */
  target: number;
  thetaSol: number;
  assist: 0 | 1 | 2;
}
export interface MiddleRound {
  /** The wanted fraction of the intensity after the first polaroid, and the angles that give it. */
  target: number;
  solutions: number[];
  assist: 0 | 1 | 2;
}

/** [dark band n, wavelength nm, angle of the target]; the slit width comes out a multiple of 100 nm. */
const SLIT: [number, number, number][] = [[1, 600, 30], [1, 500, 30], [2, 500, 30], [1, 700, 30], [2, 600, 30], [3, 500, 30]];
/**
 * The wanted fractions of the lamp's light for the second level. The first three have whole-degree angles (30°, 45°, 60°); the others come from
 * cos θ = 0.8, 0.6 and 0.9, whose angles (36.87°, 53.13° and 25.84°) are met by the whole-degree dial within its tolerance. Three of the six are played.
 */
const SHADE: number[] = [0.375, 0.25, 0.125, 0.32, 0.18, 0.405];
/** The wanted fractions of the light after the first polaroid for the third level: sin²2θ = 4 × the fraction (1, 3/4, 1/4, 0.64, 0.36). Three of the five are played. */
const MIDDLE: number[] = [0.25, 0.1875, 0.0625, 0.16, 0.09];
const deg2 = (x: number) => String(Number(x.toFixed(2)));

export const SLIDERS = {
  a: { min: 300, max: 3200, step: 50 },
  theta: { min: 0, max: 90, step: 1 },
};

export function slitRounds(random: () => number): SlitRound[] {
  return shuffle(SLIT, random)
    .slice(0, 3)
    .sort((x, y) => x[0] - y[0])
    .map(([n, lam, theta], k) => ({ n, lam, theta, aSol: Math.round(((n * lam) / sinD(theta)) * 1e6) / 1e6, assist: aid(k) }));
}
/** The angle between the polaroids that lets the fraction `target` of the lamp's light through: ½cos²θ = target. */
export const shadeAngle = (target: number) => Math.round(Math.acos(Math.sqrt(2 * target)) * 1e6 / RAD) / 1e6;
export function shadeRounds(random: () => number): ShadeRound[] {
  return shuffle(SHADE, random)
    .slice(0, 3)
    .map((target, k) => ({ target, thetaSol: shadeAngle(target), assist: aid(k) }));
}
/** The middle polaroid angles that let the fraction `target` through: sin²2θ = 4 × target, so θ and 90° − θ. */
export const middleAngles = (target: number) => {
  const t = Math.round((asinD(Math.min(1, 2 * Math.sqrt(target))) / 2) * 1e6) / 1e6;
  return t === 45 ? [45] : [t, Math.round((90 - t) * 1e6) / 1e6];
};
export function middleRounds(random: () => number): MiddleRound[] {
  return shuffle(MIDDLE, random)
    .slice(0, 3)
    .map((target, k) => ({ target, solutions: middleAngles(target), assist: aid(k) }));
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export const judgeSlit = (r: SlitRound, a: number) => Math.abs(a - r.aSol) <= 25;
export const judgeShade = (r: ShadeRound, theta: number) => Math.abs(theta - r.thetaSol) <= 0.5;
export const judgeMiddle = (r: MiddleRound, theta: number) => r.solutions.some((s) => Math.abs(theta - s) <= 1);

export function slitReading(r: SlitRound, a: number): string {
  const d = minimumDeg(r.n, r.lam, a);
  return d === null ? `With a = ${fmt(a)} nm the slit is narrower than ${r.n}λ, so there is no dark band number ${r.n}: the pattern is one wide blob.` : `With a = ${fmt(a)} nm the ${r.n}${r.n === 1 ? 'st' : r.n === 2 ? 'nd' : 'rd'} dark band is at ${fmt(d)}°; the target is at ${r.theta}°.`;
}
export const shadeReading = (theta: number) => `With the polaroids ${fmt(theta)}° apart, ${fmt(twoPolaroids(theta))} of the original light gets through (one polaroid alone passes ½).`;
export const middleReading = (theta: number) => `With the middle polaroid at ${fmt(theta)}° to the first, ${fmt(middlePolaroid(theta))} of the light after the first polaroid reaches the eye.`;

export function slitMiss(r: SlitRound, a: number): string {
  const d = minimumDeg(r.n, r.lam, a);
  if (d === null) return `The slit is narrower than ${r.n}λ: there is no dark band ${r.n} at all, only one wide bright blob.`;
  return d > r.theta ? 'The dark band lands beyond the target: the slit is too narrow, so the pattern is spread out too far.' : 'The dark band lands inside the target: the slit is too wide, so the pattern is squeezed in too tight.';
}
export const shadeMiss = (r: ShadeRound, theta: number) => (twoPolaroids(theta) > r.target ? 'Too much light gets through: the polaroids are not turned far enough apart.' : 'Too little light gets through: the polaroids are turned too far apart.');
export const middleMiss = (r: MiddleRound, theta: number) => (middlePolaroid(theta) > r.target ? 'More light reaches the eye than the shade asks for.' : 'Less light reaches the eye than the shade asks for.');

export function slitExplain(r: SlitRound): string[] {
  return [
    `Dark bands of a single slit are at a sin θ = nλ, so a = nλ/sin θ = ${r.n} × ${r.lam} nm / sin ${r.theta}° = ${fmt(r.aSol)} nm.`,
    'A wider slit gives a narrower pattern, and a narrower slit spreads the light out: the central maximum is 2λD/a wide.',
  ];
}
export function shadeExplain(r: ShadeRound): string[] {
  return [
    `The first polaroid passes ½ of unpolarised light. The second passes cos²θ of that (Malus’ law): ½cos²θ = ${fmt(r.target)}.`,
    `So cos²θ = ${fmt(2 * r.target)}, cos θ = ${fmt(Math.sqrt(2 * r.target))} and θ = ${deg2(r.thetaSol)}°${Number.isInteger(r.thetaSol) ? '' : ' (set the dial to the nearest whole degree)'}.`,
  ];
}
export function middleExplain(r: MiddleRound): string[] {
  return [
    `With I₀ after the first polaroid, the middle one passes I₀cos²θ and the last (crossed with the first) passes cos²(90° − θ) of that: I = I₀cos²θ sin²θ = (I₀/4) sin²2θ.`,
    `For I/I₀ = ${fmt(r.target)}: sin²2θ = ${fmt(4 * r.target)}, so θ = ${r.solutions.map((s) => `${deg2(s)}°`).join(' or ')}. The most light, I₀/4, gets through at 45° (Example 10.2).`,
  ];
}
