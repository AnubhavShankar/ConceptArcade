// Pure rules of Rutherford Range: no DOM, no canvas. Energies in MeV, distances in fm; e²/4πε₀ = 1.44 MeV fm.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

export const K_E2 = 1.44;
/** Distance of closest approach (fm) of an α-particle (charge 2e) with kinetic energy K (MeV) heading straight at a nucleus of charge Ze. */
export const closestFm = (z: number, kMeV: number) => (2 * z * K_E2) / kMeV;
/** The energy (MeV) that brings an α-particle to a given distance from a nucleus of charge Ze. */
export const energyFor = (z: number, rFm: number) => (2 * z * K_E2) / rFm;

export const ELEMENTS: Record<number, string> = { 13: 'aluminium', 26: 'iron', 29: 'copper', 47: 'silver', 50: 'tin', 79: 'gold', 82: 'lead' };

/** Where each dial starts: no round has this as its answer. */
export const START = { k: 2, z: 20 };
/** Where the burst of points appears: one fixed point, never a function of the answer. */
export const HIT: [number, number] = [330, 110];
/** On a miss the α-particle stops at a fixed fraction of the wanted distance: inside the ring if it got too close, beyond it if it turned too soon. */
export const MISS_FRACTION = { tooClose: 0.6, tooSoon: 1.5 };
/** Where the α-particle stops on screen (fm): its true turning point on a win, a fixed fraction of the wanted distance on a miss. */
export const stopFm = (dOwn: number, wanted: number, ok: boolean) => (ok ? dOwn : wanted * (dOwn < wanted ? MISS_FRACTION.tooClose : MISS_FRACTION.tooSoon));

export interface RangeRound {
  z: number;
  /** The distance of closest approach wanted (fm, to one decimal) and the energy that gives it. */
  target: number;
  kSol: number;
  assist: 0 | 1 | 2;
}
export interface FoilRound {
  /** The fixed α energy (MeV) and where it turns back (fm, to one decimal). */
  k: number;
  turn: number;
  zSol: number;
  assist: 0 | 1 | 2;
}

/** [Z, K in MeV]: Example 12.2 (gold, 7.7 MeV) and friends. */
const RANGE: [number, number][] = [[79, 5.5], [79, 7.7], [29, 4.0], [47, 6.0], [13, 4.0], [79, 4.8]];
const FOIL_Z = [13, 26, 29, 47, 50, 79, 82];

export const SLIDERS = {
  k: { min: 1, max: 12, step: 0.01 },
  z: { min: 1, max: 92, step: 1 },
};

export function rangeRounds(random: () => number): RangeRound[] {
  return shuffle(RANGE, random)
    .slice(0, 3)
    .map(([z, k], i) => ({ z, k, target: Math.round(closestFm(z, k) * 10) / 10, assist: aid(i) }))
    .map((r, i) => ({ z: r.z, target: r.target, kSol: energyFor(r.z, r.target), assist: aid(i) }));
}
export function foilRounds(random: () => number): FoilRound[] {
  return shuffle(FOIL_Z, random)
    .slice(0, 3)
    .map((z, i) => ({ k: 5.5, turn: Math.round(closestFm(z, 5.5) * 10) / 10, zSol: z, assist: aid(i) }));
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export const judgeRange = (r: RangeRound, k: number) => Math.abs(k - r.kSol) / r.kSol <= 0.02;
export const judgeFoil = (r: FoilRound, z: number) => Math.abs(z - r.zSol) <= 0.5;

export const rangeReading = (r: RangeRound, k: number) => `A ${fmt(k)} MeV α-particle on a nucleus with Z = ${r.z} turns back at ${fmt(closestFm(r.z, k))} fm; the wanted distance is ${fmt(r.target)} fm.`;
export const foilReading = (r: FoilRound, z: number) => `If the nucleus had Z = ${z}, a ${fmt(r.k)} MeV α-particle would turn back at ${fmt(closestFm(z, r.k))} fm; it turned at ${fmt(r.turn)} fm.`;

export const rangeMiss = (r: RangeRound, k: number) => (closestFm(r.z, k) < r.target ? 'The α-particle gets too close: it climbs further up the repulsion than the target distance.' : 'The α-particle turns back too early: it runs out of energy before reaching the target distance.');
export const foilMiss = (r: FoilRound, z: number) => (closestFm(z, r.k) > r.turn ? 'That nucleus would turn the α-particle back farther out than it did: it is not charged enough.' : 'That nucleus would let the α-particle in closer than it got: it is too strongly charged.');

export function rangeExplain(r: RangeRound): string[] {
  return [
    `At the turning point all the kinetic energy has become electric potential energy: K = (2e)(Ze)/(4πε₀ d), so d = 2Ze²/(4πε₀K) = 2 × ${r.z} × 1.44 MeV fm / K.`,
    `For d = ${fmt(r.target)} fm: K = ${fmt(2 * r.z * K_E2)} / ${fmt(r.target)} = ${fmt(r.kSol)} MeV (Example 12.2).`,
  ];
}
export function foilExplain(r: FoilRound): string[] {
  return [
    `d = 2Ze²/(4πε₀K) gives Z = dK / (2 × 1.44 MeV fm) = ${fmt(r.turn)} × ${fmt(r.k)} / 2.88 = ${fmt((r.turn * r.k) / 2.88)}, so Z = ${r.zSol}, ${ELEMENTS[r.zSol]}.`,
    'A nucleus with more charge repels the α-particle more, so it turns back farther out for the same energy (Example 12.1, Exercise 12.2).',
  ];
}
