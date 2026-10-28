// Pure rules of Nucleus Builder: no DOM, no canvas. Lengths in fm, energies in keV, e²/4πε₀ = 1.44 MeV fm, R₀ = 1.2 fm.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

export const R0 = 1.2;
export const K_E2 = 1.44;
/** Nuclear radius of mass number A, fm. */
export const radiusFm = (a: number) => R0 * Math.cbrt(a);
/** The Coulomb barrier (keV) between two nuclei of charges z1 e and z2 e whose centres are d fm apart. */
export const barrierKeV = (z1: number, z2: number, d: number) => ((z1 * z2 * K_E2) / d) * 1000;

export interface SizeRound {
  name: string;
  a: number;
  sol: number;
  assist: 0 | 1 | 2;
}
export interface BarrierRound {
  label: string;
  z1: number;
  z2: number;
  /** The distance between the centres when they touch, fm. */
  d: number;
  sol: number;
  assist: 0 | 1 | 2;
}
export interface DecayRound {
  name: string;
  /** Parent, kind of decay, and the particle that leaves (mass number, charge). */
  a: number;
  z: number;
  kind: 'alpha' | 'beta-' | 'beta+';
  /** What the daughter must be (exact). */
  aSol: number;
  zSol: number;
  assist: 0 | 1 | 2;
}

export const PARTICLE: Record<DecayRound['kind'], { name: string; a: number; z: number }> = {
  alpha: { name: 'an α-particle', a: 4, z: 2 },
  'beta-': { name: 'an electron (and an antineutrino)', a: 0, z: -1 },
  'beta+': { name: 'a positron (and a neutrino)', a: 0, z: 1 },
};

const SIZE: { name: string; a: number }[] = [
  { name: 'silver-107', a: 107 },
  { name: 'gold-197', a: 197 },
  { name: 'uranium-238', a: 238 },
  { name: 'iron-56', a: 56 },
  { name: 'oxygen-16', a: 16 },
];
const BARRIER: { label: string; z1: number; z2: number; d: number }[] = [
  { label: 'two deuterons, each of radius 2.0 fm', z1: 1, z2: 1, d: 4 },
  { label: 'two protons, each of radius 1.0 fm', z1: 1, z2: 1, d: 2 },
  { label: 'two helium-4 nuclei, each of radius 2.0 fm', z1: 2, z2: 2, d: 4 },
  { label: 'a proton and a helium-4 nucleus, radii 1.0 fm and 2.0 fm', z1: 1, z2: 2, d: 3 },
  { label: 'a proton and a helium-4 nucleus, radii 1.4 fm and 3.4 fm', z1: 1, z2: 2, d: 4.8 },
];
const DECAY: { name: string; a: number; z: number; kind: DecayRound['kind'] }[] = [
  { name: 'uranium-238', a: 238, z: 92, kind: 'alpha' },
  { name: 'carbon-14', a: 14, z: 6, kind: 'beta-' },
  { name: 'radium-226', a: 226, z: 88, kind: 'alpha' },
  { name: 'caesium-137', a: 137, z: 55, kind: 'beta-' },
  { name: 'carbon-11', a: 11, z: 6, kind: 'beta+' },
  { name: 'cobalt-60', a: 60, z: 27, kind: 'beta-' },
];

export const SLIDERS = {
  r: { min: 1, max: 9, step: 0.01 },
  u: { min: 100, max: 2000, step: 1 },
  a: { min: 1, max: 250, step: 1 },
  z: { min: 1, max: 100, step: 1 },
};

export function sizeRounds(random: () => number): SizeRound[] {
  return shuffle(SIZE, random)
    .slice(0, 3)
    .sort((x, y) => x.a - y.a)
    .map((n, k) => ({ ...n, sol: Math.round(radiusFm(n.a) * 1000) / 1000, assist: aid(k) }));
}
export function barrierRounds(random: () => number): BarrierRound[] {
  return shuffle(BARRIER, random)
    .slice(0, 3)
    .map((b) => ({ ...b, sol: barrierKeV(b.z1, b.z2, b.d) }))
    .sort((x, y) => x.sol - y.sol)
    .map((b, k) => ({ ...b, assist: aid(k) }));
}
export function decayRounds(random: () => number): DecayRound[] {
  const pick = (kind: DecayRound['kind']) => shuffle(DECAY.filter((d) => d.kind === kind), random)[0];
  return [pick('alpha'), pick('beta-'), pick('beta+')].map((d, k) => ({ ...d, aSol: d.a - PARTICLE[d.kind].a, zSol: d.z - PARTICLE[d.kind].z, assist: aid(k) }));
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export const judgeSize = (r: SizeRound, rad: number) => Math.abs(rad - r.sol) <= 0.03;
export const judgeBarrier = (r: BarrierRound, u: number) => Math.abs(u - r.sol) / r.sol <= 0.01;
export function judgeDecay(r: DecayRound, a: number, z: number): { ok: boolean; aOk: boolean; zOk: boolean } {
  const aOk = a === r.aSol;
  const zOk = z === r.zSol;
  return { ok: aOk && zOk, aOk, zOk };
}

export const sizeReading = (r: SizeRound) => `A^⅓ for A = ${r.a} is ${fmt(Math.cbrt(r.a))}, and R₀ = 1.2 fm.`;
export const barrierReading = (r: BarrierRound, u: number) => `With the centres ${fmt(r.d)} fm apart the repulsion energy is ${fmt(r.z1 * r.z2 * K_E2)} MeV fm / ${fmt(r.d)} fm; you set ${fmt(u)} keV.`;
export const decayReading = (r: DecayRound) => `${r.name} emits ${PARTICLE[r.kind].name}, which carries away mass number ${PARTICLE[r.kind].a} and charge ${PARTICLE[r.kind].z > 0 ? '+' : ''}${PARTICLE[r.kind].z}.`;

export const sizeMiss = (r: SizeRound, rad: number) => (rad > r.sol ? 'Your nucleus is bigger than the real one: its nucleons would be spread thin.' : 'Your nucleus is smaller than the real one: its nucleons would be squeezed together too tightly.');
export const barrierMiss = (r: BarrierRound, u: number) => (u > r.sol ? 'You built the hill too high: the nuclei would be stopped by a barrier that is not really there.' : 'You built the hill too low: the nuclei would slip over a barrier that is really higher.');
export function decayMiss(r: DecayRound, a: number, z: number): string {
  const j = judgeDecay(r, a, z);
  if (j.aOk && !j.zOk) return 'The mass number balances, but the charge does not: the total charge before and after the decay differs.';
  if (!j.aOk && j.zOk) return 'The charge balances, but the mass number does not: nucleons would be created or destroyed.';
  return 'Neither the mass number nor the charge balances: the decay would break both conservation laws.';
}

export function sizeExplain(r: SizeRound): string[] {
  return [`R = R₀A^⅓ = 1.2 fm × ${r.a}^⅓ = 1.2 × ${fmt(Math.cbrt(r.a))} = ${fmt(r.sol)} fm.`, 'Since the volume grows as R³ ∝ A and the mass as A, the density is the same for every nucleus, about 2.3 × 10¹⁷ kg/m³ (Exercises 13.4, 13.10; Example 13.1).'];
}
export function barrierExplain(r: BarrierRound): string[] {
  return [`The Coulomb repulsion energy at touching is U = Z₁Z₂e²/(4πε₀d) = ${r.z1} × ${r.z2} × 1.44 MeV fm / ${fmt(r.d)} fm = ${fmt(r.sol)} keV.`, 'Nuclei must have about this much energy to fuse, which is why fusion needs temperatures of millions of kelvin (Exercise 13.9).'];
}
export function decayExplain(r: DecayRound): string[] {
  const p = PARTICLE[r.kind];
  return [`Mass number and charge are both conserved: A = ${r.a} → ${r.aSol} + ${p.a}, and Z = ${r.z} → ${r.zSol} + (${p.z}).`, `So the daughter has A = ${r.aSol} and Z = ${r.zSol} (Example 13.4). The number of protons and neutrons is conserved, but not the number of atoms of each element.`];
}
