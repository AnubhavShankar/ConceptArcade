// Pure rules of Bohr Orbits: no DOM, no canvas. Radii in 10⁻¹¹ m, speeds in 10⁵ m/s, periods in 10⁻¹⁶ s.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

/** Bohr radius in 10⁻¹¹ m (0.53 × 10⁻¹⁰ m). */
export const A0 = 5.3;
/** Speed of the electron in the first orbit, 10⁵ m/s (2.19 × 10⁶ m/s). */
export const V1 = 21.9;
export const HBAR = 1.055e-34;
export const radius = (n: number) => A0 * n * n;
export const speed = (n: number) => V1 / n;
/** Period in 10⁻¹⁶ s: T = 2πr/v. */
export const period = (n: number) => ((2 * Math.PI * radius(n) * 1e-11) / (speed(n) * 1e5)) / 1e-16;
/** The quantum number of an orbit of mass m (kg), speed v (m/s) and radius r (m): n = mvr/ħ. */
export const quantumLog = (m: number, v: number, r: number) => Math.log10((m * v * r) / HBAR);

export interface RingRound {
  n: number;
  rSol: number;
  assist: 0 | 1 | 2;
}
export interface LapRound {
  n: number;
  vSol: number;
  tSol: number;
  assist: 0 | 1 | 2;
}
export interface BigRound {
  name: string;
  m: number;
  v: number;
  r: number;
  /** log₁₀ of the quantum number. */
  sol: number;
  desc: string;
  assist: 0 | 1 | 2;
}

const BIG: { name: string; m: number; v: number; r: number; desc: string }[] = [
  { name: 'Earth', m: 6.0e24, v: 3e4, r: 1.5e11, desc: 'the Earth round the Sun: m = 6.0 × 10²⁴ kg, v = 3 × 10⁴ m/s, r = 1.5 × 10¹¹ m' },
  { name: 'Moon', m: 7.35e22, v: 1.02e3, r: 3.84e8, desc: 'the Moon round the Earth: m = 7.35 × 10²² kg, v = 1.02 × 10³ m/s, r = 3.84 × 10⁸ m' },
  { name: 'Ball', m: 1, v: 1, r: 1, desc: 'a 1 kg ball on a 1 m string at 1 m/s' },
];

export const SLIDERS = {
  r: { min: 1, max: 150, step: 0.1 },
  v: { min: 1, max: 30, step: 0.01 },
  t: { min: 1, max: 130, step: 0.01 },
  log: { min: 0, max: 90, step: 0.1 },
};

export function ringRounds(random: () => number): RingRound[] {
  return shuffle([2, 3, 4, 5], random)
    .slice(0, 3)
    .sort((a, b) => a - b)
    .map((n, k) => ({ n, rSol: Math.round(radius(n) * 100) / 100, assist: aid(k) }));
}
export function lapRounds(): LapRound[] {
  return [1, 2, 3].map((n, k) => ({ n, vSol: Math.round(speed(n) * 100) / 100, tSol: Math.round(period(n) * 100) / 100, assist: aid(k) }));
}
export function bigRounds(): BigRound[] {
  return BIG.map((b) => ({ ...b, sol: Math.round(quantumLog(b.m, b.v, b.r) * 10) / 10 }))
    .sort((a, b) => a.sol - b.sol)
    .map((b, k) => ({ ...b, assist: aid(k) }));
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export const judgeRing = (r: RingRound, rad: number) => Math.abs(rad - r.rSol) / r.rSol <= 0.01;
export function judgeLap(r: LapRound, v: number, t: number): { ok: boolean; vOk: boolean; tOk: boolean } {
  const vOk = Math.abs(v - r.vSol) / r.vSol <= 0.015;
  const tOk = Math.abs(t - r.tSol) / r.tSol <= 0.015;
  return { ok: vOk && tOk, vOk, tOk };
}
export const judgeBig = (r: BigRound, log: number) => Math.abs(log - r.sol) <= 0.15;

export const ringReading = (r: RingRound, rad: number) => `A ring of radius ${fmt(rad)} × 10⁻¹¹ m would belong to level n = ${fmt(Math.sqrt(rad / A0))}; Hop must be on level n = ${r.n}.`;
export const lapReading = (r: LapRound, v: number, t: number) => `At ${fmt(v)} × 10⁵ m/s on a ring of radius ${fmt(radius(r.n))} × 10⁻¹¹ m one lap takes ${fmt(((2 * Math.PI * radius(r.n) * 1e-11) / (v * 1e5)) / 1e-16)} × 10⁻¹⁶ s; you chose ${fmt(t)}.`;
export const bigReading = (r: BigRound) => `mvr = ${fmt(r.m * r.v * r.r)} J s for ${r.name}, and ħ = 1.055 × 10⁻³⁴ J s.`;

export const ringMiss = (r: RingRound, rad: number) => (rad > r.rSol ? 'The ring is too wide: the electron would sit on a higher level than the one it is in.' : 'The ring is too small: the electron would sit on a lower level than the one it is in.');
export function lapMiss(r: LapRound, v: number, t: number): string {
  const j = judgeLap(r, v, t);
  if (j.vOk && !j.tOk) return 'The speed is right, but one lap of this orbit does not take that long: check the circumference.';
  if (!j.vOk && j.tOk) return 'The lap time is right, but the electron does not move that fast on this level.';
  return 'The electron neither moves that fast nor laps in that time on this level.';
}
export const bigMiss = (r: BigRound, log: number) => (log > r.sol ? 'The quantum number is not that huge: you have too many zeros.' : 'The quantum number is far bigger than that: you are short of zeros.');

export function ringExplain(r: RingRound): string[] {
  return [
    `The allowed orbits of hydrogen have radius rₙ = n²a₀ = ${r.n}² × 0.53 Å = ${fmt(r.n * r.n)} × 0.53 Å.`,
    `That is ${fmt(r.rSol)} × 10⁻¹¹ m: 4, 9 and 16 times the first orbit for n = 2, 3, 4 (Exercise 12.7).`,
  ];
}
export function lapExplain(r: LapRound): string[] {
  return [
    `The speed falls as 1/n: vₙ = v₁/n = 2.19 × 10⁶ / ${r.n} = ${fmt(r.vSol)} × 10⁵ m/s.`,
    `The orbit has circumference 2π n²a₀, so T = 2πr/v = ${fmt(r.tSol)} × 10⁻¹⁶ s, which grows as n³ (Exercise 12.6).`,
  ];
}
export function bigExplain(r: BigRound): string[] {
  return [
    `The Bohr condition is mvr = nħ, so n = mvr/ħ = ${fmt(r.m * r.v * r.r)} / 1.055 × 10⁻³⁴ = ${fmt(Math.pow(10, r.sol))}.`,
    `So log₁₀ n ≈ ${fmt(r.sol)}: an everyday orbit has a quantum number so large that its steps cannot be seen (Exercise 12.9).`,
  ];
}
