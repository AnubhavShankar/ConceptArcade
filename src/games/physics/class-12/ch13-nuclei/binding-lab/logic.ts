// Pure rules of Binding Lab: no DOM, no canvas. Masses in u, energies in MeV (and 10¹³ J for the power plant), 1 u = 931.5 MeV/c².
import { aid } from '@core/dialgame';
import { fmt, sgn } from '@core/judge';

export const U_MEV = 931.5;
export const M_H = 1.007825;
export const M_N = 1.008665;
export const N_A = 6.023e23;
export const MEV_J = 1.6e-13;

export interface BindRound {
  name: string;
  z: number;
  a: number;
  /** The mass of the neutral atom, u. */
  m: number;
  /** The mass defect, u, and the binding energy, MeV (exact). */
  dm: number;
  sol: number;
  assist: 0 | 1 | 2;
}
export interface QRound {
  label: string;
  /** The reaction in words and the masses on the two sides (u). */
  eq: string;
  left: number;
  right: number;
  sol: number;
  assist: 0 | 1 | 2;
}
export interface PowerRound {
  name: string;
  desc: string;
  /** Energy in 10¹³ J. */
  sol: number;
  /** How the energy comes about, for the working and the test shot. */
  atoms: number;
  perEvent: string;
  assist: 0 | 1 | 2;
}

export const massDefect = (z: number, a: number, m: number) => z * M_H + (a - z) * M_N - m;
export const bindingMeV = (z: number, a: number, m: number) => massDefect(z, a, m) * U_MEV;
export const qMeV = (left: number, right: number) => (left - right) * U_MEV;

const NUCLEI: { name: string; z: number; a: number; m: number }[] = [
  { name: 'nitrogen-14', z: 7, a: 14, m: 14.00307 },
  { name: 'iron-56', z: 26, a: 56, m: 55.934939 },
  { name: 'bismuth-209', z: 83, a: 209, m: 208.980388 },
];
const REACTIONS: { label: string; eq: string; left: number; right: number }[] = [
  { label: 'hydrogen plus tritium', eq: '¹₁H + ³₁H → ²₁H + ²₁H', left: M_H + 3.016049, right: 2 * 2.014102 },
  { label: 'carbon plus carbon', eq: '¹²₆C + ¹²₆C → ²⁰₁₀Ne + ⁴₂He', left: 24.0, right: 19.992439 + 4.002603 },
  { label: 'iron splits in two', eq: '⁵⁶₂₆Fe → ²⁸₁₃Al + ²⁸₁₃Al', left: 55.93494, right: 2 * 27.98191 },
];

export const SLIDERS = {
  be: { min: 50, max: 1800, step: 0.1 },
  q: { min: -30, max: 10, step: 0.01 },
  e: { min: 0, max: 30, step: 0.01 },
};

/** Where each dial starts: no round has this as its answer. */
export const START = { be: 300, q: 0, e: 5 };
/** Where the burst of points appears: a fixed point per level, never a function of the answer. */
export const HIT: Record<'be' | 'q' | 'e', [number, number]> = { be: [200, 170], q: [330, 170], e: [330, 150] };
/** The x position of a value on the level's bar or track (canvas pixels), for the marks and the tests. */
export const BAR = { be: { x0: 340, w: 260 }, q: { x0: 60, w: 520 }, e: { x0: 300, w: 300 } };
export const markX = (level: 'be' | 'q' | 'e', v: number) => {
  const S = SLIDERS[level];
  return level === 'q' ? 60 + ((v - S.min) / (S.max - S.min)) * 520 : BAR[level].x0 + (BAR[level].w * v) / S.max;
};

export function bindRounds(): BindRound[] {
  return NUCLEI.map((n, k) => ({ ...n, dm: massDefect(n.z, n.a, n.m), sol: Math.round(bindingMeV(n.z, n.a, n.m) * 100) / 100, assist: aid(k) }));
}
export function qRounds(): QRound[] {
  return REACTIONS.map((r, k) => ({ ...r, sol: Math.round(qMeV(r.left, r.right) * 100) / 100, assist: aid(k) }));
}
export function powerRounds(): PowerRound[] {
  const pu = (1000 / 239) * N_A;
  const d = (2000 / 2) * N_A;
  return [
    { name: '1 kg of plutonium-239', desc: 'all atoms fission and each fission releases 180 MeV', sol: Math.round(((pu * 180 * MEV_J) / 1e13) * 100) / 100, atoms: pu, perEvent: '180 MeV per fission' },
    { name: '1 g of any matter', desc: 'all of its mass turned into energy', sol: Math.round(((1e-3 * 9e16) / 1e13) * 100) / 100, atoms: 1, perEvent: 'E = mc² = 10⁻³ kg × (3 × 10⁸ m/s)²' },
    { name: '2 kg of deuterium', desc: 'fused by ²₁H + ²₁H → ³₂He + n + 3.27 MeV', sol: Math.round(((d / 2) * 3.27 * MEV_J) / 1e13 * 100) / 100, atoms: d, perEvent: '3.27 MeV per pair of deuterons' },
  ]
    .sort((a, b) => a.sol - b.sol)
    .map((r, k) => ({ ...r, assist: aid(k) }));
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export const judgeBind = (r: BindRound, be: number) => Math.abs(be - r.sol) / r.sol <= 0.005;
export const judgeQ = (r: QRound, q: number) => Math.abs(q - r.sol) <= 0.06;
export const judgePower = (r: PowerRound, e: number) => Math.abs(e - r.sol) / r.sol <= 0.015;

export const bindReading = (r: BindRound) => `Z × m_H + (A − Z) × m_n = ${fmt(r.z * M_H + (r.a - r.z) * M_N)} u, while the atom weighs ${fmt(r.m)} u, so the mass defect is ${fmt(r.dm)} u.`;
export const qReading = (r: QRound) => `The masses on the left add to ${fmt(r.left)} u and on the right to ${fmt(r.right)} u, a difference of ${sgn(r.left - r.right)} u.`;
export const powerReading = (r: PowerRound) => `${r.name}: ${r.desc}; that is ${fmt(r.atoms)} ${r.atoms === 1 ? 'kilogram-scale unit' : 'atoms'} with ${r.perEvent}.`;

export const bindMiss = (r: BindRound, be: number) => (be > r.sol ? 'You paid for more binding than the nucleus has: it would not need that much energy to be pulled apart.' : 'You paid too little: the nucleus is held together more firmly than that.');
export const qMiss = (r: QRound, q: number) => (Math.sign(q) !== Math.sign(r.sol) ? 'The sign is wrong: the reaction goes the other way, taking in energy where you said it gives it out, or the reverse.' : q > r.sol ? 'The reaction would give out more energy than the mass lost allows.' : 'The reaction gives out more (or takes in less) energy than that.');
export const powerMiss = (r: PowerRound, e: number) => (e > r.sol ? 'You are claiming more energy than this fuel can supply.' : 'This fuel supplies more energy than that.');

export function bindExplain(r: BindRound): string[] {
  return [
    `Mass defect Δm = Z m_H + (A − Z) m_n − m = ${fmt(r.z * M_H + (r.a - r.z) * M_N)} − ${fmt(r.m)} = ${fmt(r.dm)} u.`,
    `Binding energy = Δm × 931.5 MeV/u = ${fmt(r.sol)} MeV, which is ${fmt(r.sol / r.a)} MeV per nucleon (Exercises 13.1, 13.2; Example 13.3).`,
  ];
}
export function qExplain(r: QRound): string[] {
  return [
    `Q = (mass before − mass after) c² = (${fmt(r.left)} − ${fmt(r.right)}) u × 931.5 MeV/u = ${sgn(r.sol)} MeV.`,
    r.sol > 0 ? 'Q is positive, so the reaction gives out energy: it is exothermic.' : 'Q is negative, so the reaction would need energy to be supplied: it is endothermic, and the fission is not possible on its own (Exercises 13.5, 13.6).',
  ];
}
export function powerExplain(r: PowerRound): string[] {
  return [`${r.name}: ${r.desc}. Energy per event: ${r.perEvent}.`, `Total energy = ${fmt(r.sol)} × 10¹³ J (Exercises 13.7, 13.8; Example 13.2). A 100 W lamp would run for ${fmt((r.sol * 1e13) / 100 / 3.154e7)} years on it.`];
}
