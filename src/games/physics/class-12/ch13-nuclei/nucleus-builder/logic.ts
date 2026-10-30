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
  // more β⁺ emitters, so that round 3 is not always ¹¹C → ¹¹B: ¹³N → ¹³C, ¹⁵O → ¹⁵N and ¹⁸F → ¹⁸O (a proton turns into a neutron, so Z falls by 1 and A stays)
  { name: 'nitrogen-13', a: 13, z: 7, kind: 'beta+' },
  { name: 'oxygen-15', a: 15, z: 8, kind: 'beta+' },
  { name: 'fluorine-18', a: 18, z: 9, kind: 'beta+' },
];
/** Level 3: where the two dials start (A = 100, Z = 50). No decay in the pool has that daughter. */
export const DECAY_START = { a: 100, z: 50 };

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

// ---- fixed miss effects for levels 1 and 2 ---------------------------------------------------------------------------------

/** Start radius (fm): outside the tolerance of every row (the smallest answer is 3.02 fm). Start barrier height (keV): no row has it. */
export const SIZE_START = 2;
export const BARRIER_START = 200;
/** Where the burst and the "−1 ♥" appear: fixed points, never an answer position. */
export const SIZE_HIT: [number, number] = [330, 170];
export const BARRIER_HIT: [number, number] = [330, 110];
/** On a miss the nucleon pack is drawn this many fm smaller (ring too big) or larger (ring too small) than the player's own ring. */
export const PACK_STEP = 1.2;
/** The radius (fm) of the nucleon pack during a shot: the true one only on a win. */
export const packRadius = (r: SizeRound, rad: number, ok: boolean) => (ok ? r.sol : rad > r.sol ? rad - PACK_STEP : rad + PACK_STEP);
/** What the climbing nucleus does: meet the other (win), bounce off a hill set too high, or overshoot a hill set too low. */
export type BarrierEffect = 'meet' | 'bounce' | 'overshoot';
export const barrierEffect = (r: BarrierRound, u: number): BarrierEffect => (judgeBarrier(r, u) ? 'meet' : u > r.sol ? 'bounce' : 'overshoot');

export const sizeReading =(r: SizeRound) => `A^⅓ for A = ${r.a} is ${fmt(Math.cbrt(r.a))}, and R₀ = 1.2 fm.`;
export const barrierReading = (r: BarrierRound, u: number) => `With the centres ${fmt(r.d)} fm apart the repulsion energy is ${fmt(r.z1 * r.z2 * K_E2)} MeV fm / ${fmt(r.d)} fm; you set ${fmt(u)} keV.`;
export const decayReading = (r: DecayRound) => `${r.name} emits ${PARTICLE[r.kind].name}, which carries away mass number ${PARTICLE[r.kind].a} and charge ${PARTICLE[r.kind].z > 0 ? '+' : ''}${PARTICLE[r.kind].z}.`;

export const sizeMiss = (r: SizeRound, rad: number) => (rad > r.sol ? 'Your nucleus is bigger than the real one: its nucleons would be spread thin.' : 'Your nucleus is smaller than the real one: its nucleons would be squeezed together too tightly.');
export const barrierMiss = (r: BarrierRound, u: number) => (u > r.sol ? 'You built the hill too high: the nuclei would be stopped by a barrier that is not really there.' : 'You built the hill too low: the nuclei would slip over a barrier that is really higher.');
/** After the decay, is there more (+1), the same (0) or less (−1) mass number and charge than the parent had? Counting the daughter and the emitted particle together. */
export function decaySides(r: DecayRound, a: number, z: number): [-1 | 0 | 1, -1 | 0 | 1] {
  const p = PARTICLE[r.kind];
  return [Math.sign(a + p.a - r.a) as -1 | 0 | 1, Math.sign(z + p.z - r.z) as -1 | 0 | 1];
}
export const SIDE_NUCLEONS = { '-1': 'fewer nucleons than before', '0': 'the same number of nucleons', '1': 'more nucleons than before' };
export const SIDE_CHARGE = { '-1': 'a lower total charge than before', '0': 'the same total charge', '1': 'a higher total charge than before' };
/** After a miss: the effect of the player's daughter, counted against the parent, in fixed words: the direction of each count and never a number. */
export function decayMiss(r: DecayRound, a: number, z: number): string {
  const [sa, sz] = decaySides(r, a, z);
  return `After that decay there would be ${SIDE_NUCLEONS[String(sa) as '-1' | '0' | '1']} and ${SIDE_CHARGE[String(sz) as '-1' | '0' | '1']}, counting the daughter and the emitted particle together.`;
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

// ---- level 4: nuclide twins (Section 13.2) ------------------------------------------------------------------------------
// The player sets the number of protons Z (1 to 30) and neutrons N (0 to 40); A = Z + N.

export type Relation = 'isotope' | 'isobar' | 'isotone';
/** What the clue's extra fact gives: the number of neutrons ('n'), the mass number ('a') or Z ('z'). */
export type ExtraKind = 'n' | 'a' | 'z';

export interface TwinRound {
  /** The reference nuclide: its symbol as written in the clue, and its numbers. */
  ref: string;
  refA: number;
  refZ: number;
  relation: Relation;
  /** The extra fact, as printed in the clue. */
  extra: string;
  extraKind: ExtraKind;
  extraValue: number;
  /** The answer: protons and neutrons, and the nuclide’s name (the element letters are shown only after a win). */
  z: number;
  n: number;
  name: string;
  assist: 0 | 1 | 2;
}

const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const digits = (x: number, set: string) => [...String(x)].map((c) => set[Number(c)]).join('');
/** The mass number as a superscript. */
export const sup = (x: number) => digits(x, SUPS);
/** The charge number as a subscript. */
export const sub = (x: number) => digits(x, SUBS);
/** The full symbol ᴬ_Z X of a nuclide. */
export const nuclideSymbol = (a: number, z: number, sym: string) => `${sup(a)}${sub(z)}${sym}`;
/** The short name ᴬX of a nuclide. */
export const nuclideName = (a: number, sym: string) => `${sup(a)}${sym}`;

interface TwinRow {
  refA: number;
  refZ: number;
  refSym: string;
  relation: Relation;
  extraKind: ExtraKind;
  extraValue: number;
  z: number;
  n: number;
  sym: string;
}
const extraText = (kind: ExtraKind, value: number) => (kind === 'n' ? `with ${value} neutrons` : kind === 'a' ? `with mass number ${value}` : `with Z = ${value}`);
/** The nine nuclide twins, three per round: isotopes, isobars, then isotones (the boss). */
export const TWIN_ROWS: TwinRow[][] = [
  [
    { refA: 35, refZ: 17, refSym: 'Cl', relation: 'isotope', extraKind: 'n', extraValue: 20, z: 17, n: 20, sym: 'Cl' },
    { refA: 56, refZ: 26, refSym: 'Fe', relation: 'isotope', extraKind: 'a', extraValue: 54, z: 26, n: 28, sym: 'Fe' },
    { refA: 1, refZ: 1, refSym: 'H', relation: 'isotope', extraKind: 'a', extraValue: 3, z: 1, n: 2, sym: 'H' },
  ],
  [
    { refA: 14, refZ: 6, refSym: 'C', relation: 'isobar', extraKind: 'z', extraValue: 7, z: 7, n: 7, sym: 'N' },
    { refA: 40, refZ: 18, refSym: 'Ar', relation: 'isobar', extraKind: 'z', extraValue: 20, z: 20, n: 20, sym: 'Ca' },
    { refA: 3, refZ: 1, refSym: 'H', relation: 'isobar', extraKind: 'z', extraValue: 2, z: 2, n: 1, sym: 'He' },
  ],
  [
    { refA: 16, refZ: 8, refSym: 'O', relation: 'isotone', extraKind: 'a', extraValue: 17, z: 9, n: 8, sym: 'F' },
    { refA: 13, refZ: 6, refSym: 'C', relation: 'isotone', extraKind: 'z', extraValue: 7, z: 7, n: 7, sym: 'N' },
    { refA: 40, refZ: 18, refSym: 'Ar', relation: 'isotone', extraKind: 'a', extraValue: 42, z: 20, n: 22, sym: 'Ca' },
  ],
];
export const TWIN_SLIDERS = { z: { min: 1, max: 30, step: 1 }, n: { min: 0, max: 40, step: 1 } };
/** Where both dials start: no row has this (Z, N) as its answer. */
export const TWIN_START = { z: 10, n: 10 };

export function twinRound(row: TwinRow, k: number): TwinRound {
  return {
    ref: nuclideSymbol(row.refA, row.refZ, row.refSym),
    refA: row.refA,
    refZ: row.refZ,
    relation: row.relation,
    extra: extraText(row.extraKind, row.extraValue),
    extraKind: row.extraKind,
    extraValue: row.extraValue,
    z: row.z,
    n: row.n,
    name: nuclideName(row.z + row.n, row.sym),
    assist: aid(k),
  };
}
/** One pick per round; a pick whose (Z, N) an earlier round already had is skipped, so the rounds never share an answer. */
export function twinRounds(random: () => number): TwinRound[] {
  const rounds: TwinRound[] = [];
  TWIN_ROWS.forEach((rows, k) => {
    const row = shuffle(rows, random).find((c) => !rounds.some((p) => p.z === c.z && p.n === c.n)) ?? rows[0];
    rounds.push(twinRound(row, k));
  });
  return rounds;
}

/** The relation to the reference holds (isotope: same Z, isobar: same A, isotone: same N). */
export const twinRelationOk = (r: TwinRound, z: number, n: number) => (r.relation === 'isotope' ? z === r.refZ : r.relation === 'isobar' ? z + n === r.refA : n === r.refA - r.refZ);
/** The clue's extra fact holds. */
export const twinExtraOk = (r: TwinRound, z: number, n: number) => (r.extraKind === 'n' ? n === r.extraValue : r.extraKind === 'a' ? z + n === r.extraValue : z === r.extraValue);
export function judgeTwin(r: TwinRound, z: number, n: number): { ok: boolean; relOk: boolean; extraOk: boolean } {
  const relOk = twinRelationOk(r, z, n);
  const extraOk = twinExtraOk(r, z, n);
  return { ok: relOk && extraOk, relOk, extraOk };
}
/** What must match, in the words of the light on the screen. */
export const TWIN_MATCH: Record<Relation, string> = { isotope: 'same Z', isobar: 'same A', isotone: 'same N' };

export const twinIntel = (r: TwinRound) => `Build an ${r.relation} of ${r.ref} ${r.extra}. Set the number of protons Z and neutrons N.`;
/** The first failed condition, in the player's own numbers; the rule is from the book and no answer is given. */
export function twinMiss(r: TwinRound, z: number, n: number): string {
  const j = judgeTwin(r, z, n);
  const rule = r.relation === 'isotope' ? `an isotope of ${r.ref} (Z must match)` : r.relation === 'isobar' ? `an isobar of ${r.ref} (A must match)` : `an isotone of ${r.ref} (N must match)`;
  const problem = !j.relOk ? `is not ${rule}` : `does not have ${r.extra.replace(/^with /, '')}`;
  return `You rolled Z = ${z}, N = ${n}, so A = ${z + n}: that ${problem}.`;
}
/** The paid test run: which conditions hold. */
export function twinReading(r: TwinRound, z: number, n: number): string {
  const j = judgeTwin(r, z, n);
  return `Test run: ${TWIN_MATCH[r.relation]} as ${r.ref}: ${j.relOk ? 'yes' : 'no'}; ${r.extra}: ${j.extraOk ? 'yes' : 'no'}.`;
}
export function twinExplain(r: TwinRound): string {
  const a = r.z + r.n;
  if (r.relation === 'isotope') {
    return r.extraKind === 'n'
      ? `Isotopes share Z = ${r.z}; with N = ${r.n}, A = Z + N = ${a}: the nuclide is ${r.name}.`
      : `Isotopes share Z = ${r.z}; with A = ${a}, N = A − Z = ${a} − ${r.z} = ${r.n}: the nuclide is ${r.name}.`;
  }
  if (r.relation === 'isobar') return `Isobars share A = ${a}; with Z = ${r.z}, N = A − Z = ${a} − ${r.z} = ${r.n}: ${r.name}.`;
  return r.extraKind === 'a'
    ? `Isotones share N = ${r.n}; with A = ${a}, Z = A − N = ${a} − ${r.n} = ${r.z}: the nuclide is ${r.name}.`
    : `Isotones share N = ${r.n}; with Z = ${r.z}, A = Z + N = ${a}: the nuclide is ${r.name}.`;
}
export const twinWin = (r: TwinRound) => `Both clues match! ${twinExplain(r)}`;
