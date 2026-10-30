// Pure rules of Gap Jump: no DOM, no canvas. Energies in eV, wavelengths in nm, concentrations as powers of ten per m³.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

export const HC = 1240;
export const N_SI = 5e28;
export const NI = 1.5e16;
/** log10 of n_i², the product of the electron and hole concentrations in any silicon crystal at room temperature. */
export const LOG_NI2 = 2 * Math.log10(NI);
const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

export interface GapRound {
  name: string;
  /** The band gap, eV. */
  eg: number;
  /** The longest wavelength that can lift an electron across the gap, nm. */
  sol: number;
  assist: 0 | 1 | 2;
}
export interface Dopant {
  name: string;
  /** Valence electrons: 5 gives an n-type crystal, 3 a p-type one. */
  valence: 5 | 3;
}
export interface DopeRound {
  dopant: Dopant;
  ppm: number;
  type: 'n' | 'p';
  /** Dopant atoms per m³. */
  n: number;
  /** log10 of the electron and hole concentrations the crystal must have. */
  logE: number;
  logH: number;
  assist: 0 | 1 | 2;
}

export const GAPS: { name: string; eg: number }[] = [
  { name: 'germanium', eg: 0.7 },
  { name: 'silicon', eg: 1.1 },
  { name: 'carbon (diamond)', eg: 5.4 },
];
const DONORS: Dopant[] = [
  { name: 'arsenic', valence: 5 },
  { name: 'phosphorus', valence: 5 },
  { name: 'antimony', valence: 5 },
];
const ACCEPTORS: Dopant[] = [
  { name: 'boron', valence: 3 },
  { name: 'aluminium', valence: 3 },
  { name: 'indium', valence: 3 },
  { name: 'gallium', valence: 3 },
];

export const SLIDERS = {
  l: { min: 100, max: 2000, step: 1 },
  c: { min: 5, max: 26, step: 0.01 },
};
export const GAP_TOL = 0.02;
export const DOPE_TOL = 0.05;

/** The longest wavelength that lifts an electron across a gap: λ = hc/E_g. */
export const wavelengthNm = (eg: number) => HC / eg;
export const photonEv = (l: number) => HC / l;

/** The concentrations of a crystal of silicon doped with `ppm` parts per million of the dopant: the majority carrier follows the dopant, the other from n_e n_h = n_i². */
export function doping(dopant: Dopant, ppm: number): Omit<DopeRound, 'assist'> {
  const n = N_SI * ppm * 1e-6;
  const type = dopant.valence === 5 ? 'n' : 'p';
  const logMaj = round6(Math.log10(n));
  const logMin = round6(LOG_NI2 - Math.log10(n));
  return { dopant, ppm, type, n, logE: type === 'n' ? logMaj : logMin, logH: type === 'n' ? logMin : logMaj };
}

export function gapRounds(_random: () => number): GapRound[] {
  return GAPS.map((g, k) => ({ ...g, sol: round6(wavelengthNm(g.eg)), assist: aid(k) }));
}
export function dopeRounds(random: () => number): DopeRound[] {
  const pick = <T>(xs: T[]) => shuffle(xs, random)[0];
  const first = doping(pick(DONORS), pick([1, 2, 5]));
  const second = doping(pick(ACCEPTORS), pick([0.5, 1, 2]));
  const third = doping(pick([...DONORS, ...ACCEPTORS]), pick([10, 20, 50]));
  // the order is shuffled, so a round's position says nothing about whether its dopant is a donor or an acceptor
  return shuffle([first, second, third], random).map((d, k) => ({ ...d, assist: aid(k) }));
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export const judgeGap = (r: GapRound, l: number) => Math.abs(l - r.sol) / r.sol <= GAP_TOL;
export function judgeDope(r: DopeRound, logE: number, logH: number): { ok: boolean; eOk: boolean; hOk: boolean } {
  const eOk = Math.abs(logE - r.logE) <= DOPE_TOL;
  const hOk = Math.abs(logH - r.logH) <= DOPE_TOL;
  return { ok: eOk && hOk, eOk, hOk };
}

export const gapReading = (r: GapRound, l: number) => `At ${fmt(l)} nm a photon carries ${fmt(photonEv(l))} eV (that is 1240 eV nm divided by the wavelength). The gap of ${r.name} is ${fmt(r.eg)} eV.`;
export const dopeReading = (r: DopeRound) => `${r.dopant.name[0].toUpperCase()}${r.dopant.name.slice(1)} has ${r.dopant.valence} valence electrons, silicon has 4. The crystal has ${fmt(N_SI)} silicon atoms per m³ and ${fmt(r.ppm)} ppm of them are replaced.`;

export function gapMiss(r: GapRound, l: number): string {
  if (l > r.sol) return 'The photon is too weak: the electron shivers but stays in the valence band, and nothing conducts.';
  return 'The electron jumps, but with energy to spare: a photon of lower energy would still have lifted it, so this is not the longest wavelength that works.';
}
export function dopeMiss(r: DopeRound, logE: number, logH: number): string {
  const j = judgeDope(r, logE, logH);
  const maj = r.type === 'n' ? { v: logE, sol: r.logE, other: logH, name: 'electrons', otherName: 'holes', ok: j.eOk } : { v: logH, sol: r.logH, other: logE, name: 'holes', otherName: 'electrons', ok: j.hOk };
  const min = r.type === 'n' ? j.hOk : j.eOk;
  if (!maj.ok) {
    if (maj.v < maj.other) return `In your crystal the ${maj.otherName} outnumber the ${maj.name}: that is the wrong way round for this dopant in silicon.`;
    if (maj.v > maj.sol) return 'You have more free carriers than dopant atoms: every dopant atom gives one carrier at most, so the extra ones would have to come from nowhere.';
    return 'You have fewer free carriers than dopant atoms: at room temperature nearly every dopant atom has given its carrier, so some are missing.';
  }
  if (!min) {
    if (logE + logH > LOG_NI2) return 'With that many of the scarce carriers, electrons and holes would meet and recombine until their product falls back to its thermal value.';
    return 'With so few of the scarce carriers, thermal generation would keep creating electron–hole pairs until the product of the two concentrations rises back to its thermal value.';
  }
  return 'Both counts are fine.';
}

export function gapExplain(r: GapRound): string[] {
  return [`The photon must carry at least E_g: hc/λ = ${fmt(r.eg)} eV, so λ = 1240 eV nm / ${fmt(r.eg)} eV = ${fmt(r.sol)} nm.`, 'A small gap lets even infrared lift an electron into the conduction band, which is why Ge and Si conduct a little at room temperature; carbon’s 5.4 eV gap is why it is an insulator (Exercise 14.3; Example 14.1).'];
}
export function dopeExplain(r: DopeRound): string[] {
  const maj = r.type === 'n' ? 'n_e' : 'n_h';
  const min = r.type === 'n' ? 'n_h' : 'n_e';
  return [`${fmt(r.ppm)} ppm of ${fmt(N_SI)} atoms/m³ is ${fmt(r.n)} dopant atoms/m³, and each gives one carrier: ${maj} ≈ ${fmt(r.n)} m⁻³.`, `Then ${min} = n_i²/${maj} = (1.5 × 10¹⁶)²/${fmt(r.n)} = ${fmt(10 ** (r.type === 'n' ? r.logH : r.logE))} m⁻³ (Exercises 14.1, 14.2; Example 14.2).`];
}
