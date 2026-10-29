// Pure rules of Energy Ladder: no DOM, no canvas. Energies in eV, wavelengths in nm; hc = 1240 eV nm and E₁ = −13.6 eV.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';
import { fmt, sgn } from '@core/judge';

export const HC = 1240;
export const E1 = 13.6;
/** Energy of level n, eV (negative). */
export const level = (n: number) => -E1 / (n * n);
/** Energy of the photon for the jump between two levels, eV (positive). */
export const jumpEv = (a: number, b: number) => Math.abs(level(a) - level(b));
export const jumpNm = (a: number, b: number) => HC / jumpEv(a, b);
/** The highest level a beam of electrons of energy E (eV) can excite hydrogen to from the ground state, or 1 if none. */
export function topLevel(beamEv: number): number {
  let n = 1;
  while (n < 12 && E1 * (1 - 1 / ((n + 1) * (n + 1))) <= beamEv + 1e-9) n++;
  return n;
}
/** How many different spectral lines the excited gas can emit: all the jumps between the levels up to the top one. */
export const linesFor = (beamEv: number) => (topLevel(beamEv) * (topLevel(beamEv) - 1)) / 2;
/** The name of the series that ends on level m. */
export const seriesName = (m: number) => (m === 1 ? 'Lyman' : m === 2 ? 'Balmer' : m === 3 ? 'Paschen' : m === 4 ? 'Brackett' : 'Pfund');

export interface AbsorbRound {
  from: number;
  to: number;
  /** The wavelength (nm) that lifts the electron from one level to the other. */
  lamSol: number;
  assist: 0 | 1 | 2;
}
export interface BeamRound {
  lines: number;
  /** The electron-beam energies (eV) that give that number of lines: from lo up to, but not including, hi. */
  lo: number;
  hi: number;
  assist: 0 | 1 | 2;
}
export interface BudgetRound {
  n: number;
  ke: number;
  pe: number;
  assist: 0 | 1 | 2;
}

const ABSORB: [number, number][] = [[1, 2], [1, 3], [1, 4], [2, 4], [2, 3], [1, 5]];
const LINES = [1, 3, 6, 10];

export const SLIDERS = {
  lam: { min: 80, max: 700, step: 0.1 },
  beam: { min: 8, max: 13.6, step: 0.01 },
  ke: { min: 0, max: 14, step: 0.01 },
  pe: { min: -28, max: 0, step: 0.01 },
};

export function absorbRounds(random: () => number): AbsorbRound[] {
  return shuffle(ABSORB, random)
    .slice(0, 3)
    .map(([from, to], k) => ({ from, to, lamSol: Math.round(jumpNm(from, to) * 100) / 100, assist: aid(k) }));
}
export function beamRounds(random: () => number): BeamRound[] {
  return shuffle(LINES, random)
    .slice(0, 3)
    .sort((a, b) => a - b)
    .map((lines, k) => {
      // the beam energies where topLevel gives n with n(n−1)/2 = lines
      const n = Math.round((1 + Math.sqrt(1 + 8 * lines)) / 2);
      const lo = E1 * (1 - 1 / (n * n));
      const hi = E1 * (1 - 1 / ((n + 1) * (n + 1)));
      return { lines, lo, hi, assist: aid(k) };
    });
}
export function budgetRounds(random: () => number): BudgetRound[] {
  return shuffle([1, 2, 3, 4], random)
    .slice(0, 3)
    .sort((a, b) => a - b)
    .map((n, k) => ({ n, ke: Math.round((E1 / (n * n)) * 100) / 100, pe: Math.round((-2 * E1 / (n * n)) * 100) / 100, assist: aid(k) }));
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export const judgeAbsorb = (r: AbsorbRound, lam: number) => Math.abs(lam - r.lamSol) / r.lamSol <= 0.005;
export const judgeBeam = (r: BeamRound, e: number) => linesFor(e) === r.lines;
export function judgeBudget(r: BudgetRound, ke: number, pe: number): { ok: boolean; keOk: boolean; peOk: boolean } {
  const keOk = Math.abs(ke - r.ke) <= 0.02;
  const peOk = Math.abs(pe - r.pe) <= 0.03;
  return { ok: keOk && peOk, keOk, peOk };
}

export const absorbReading = (r: AbsorbRound, lam: number) => {
  const e = HC / lam;
  const gap = jumpEv(r.from, r.to);
  return `At ${fmt(lam)} nm each photon has ${fmt(e)} eV; the jump from n = ${r.from} to n = ${r.to} needs ${fmt(gap)} eV, and the other rungs above n = ${r.from} are ${[1, 2, 3, 4, 5, 6].filter((n) => n > r.from).map((n) => `${fmt(jumpEv(r.from, n))} eV (n = ${n})`).join(', ')} up.`;
};
export const beamReading = (e: number) => `A ${fmt(e)} eV beam can lift the electron up to level n = ${topLevel(e)} (${fmt(level(topLevel(e)))} eV), so the gas can show ${linesFor(e)} line${linesFor(e) === 1 ? '' : 's'}.`;
export const budgetReading = (r: BudgetRound) => `In level n = ${r.n} the total energy is ${fmt(level(r.n))} eV, the sum of the kinetic energy (always positive) and the potential energy (negative).`;

export function absorbMiss(r: AbsorbRound, lam: number): string {
  const e = HC / lam;
  const gap = jumpEv(r.from, r.to);
  if (e < jumpEv(r.from, r.from + 1) - 0.05) return 'The photon is too weak to lift the electron to any rung: it passes straight through the atom.';
  const near = [1, 2, 3, 4, 5, 6].filter((n) => n > r.from).some((n) => Math.abs(jumpEv(r.from, n) - e) / e < 0.005);
  if (near) return `The photon fits a different rung: the electron jumps, but not to level ${r.to}.`;
  return e > gap ? 'The photon does not match any rung: it carries too much energy for the jump you want and passes through.' : 'The photon does not match any rung: it carries too little energy for the jump you want and passes through.';
}
export const beamMiss = (r: BeamRound, e: number) => (linesFor(e) < r.lines ? `The atoms are not lifted high enough: the gas shows only ${linesFor(e)} line${linesFor(e) === 1 ? '' : 's'}.` : `The atoms are lifted too high: the gas shows ${linesFor(e)} lines, more than wanted.`);
export function budgetMiss(r: BudgetRound, ke: number, pe: number): string {
  if (Math.abs(ke + pe - level(r.n)) < 0.05) return 'Your two energies add up to the right total, but they are not split the way the electron’s orbit splits them.';
  const j = judgeBudget(r, ke, pe);
  if (!j.keOk && !j.peOk) return 'Neither energy matches the level: the total of your two does not make the energy of this level.';
  return 'Your two energies do not add up to the total energy of this level.';
}

export function absorbExplain(r: AbsorbRound): string[] {
  return [
    `E = 13.6(1/${r.from}² − 1/${r.to}²) = ${fmt(jumpEv(r.from, r.to))} eV, so λ = hc/E = 1240 / ${fmt(jumpEv(r.from, r.to))} = ${fmt(r.lamSol)} nm.`,
    `That photon matches the gap between the two rungs exactly, and a photon that does not match any gap is not absorbed (Exercise 12.5; Example 12.3).`,
  ];
}
export function beamExplain(r: BeamRound): string[] {
  const n = Math.round((1 + Math.sqrt(1 + 8 * r.lines)) / 2);
  return [
    `A beam of energy E can raise the electron to level n only if E ≥ 13.6(1 − 1/n²) eV. To reach n = ${n} it needs ${fmt(r.lo)} eV, and n = ${n + 1} needs ${fmt(r.hi)} eV.`,
    `Up to level ${n} the gas can show ${n}(${n} − 1)/2 = ${r.lines} lines: from ${fmt(r.lo)} up to just below ${fmt(r.hi)} eV (Exercise 12.8).`,
  ];
}
export function budgetExplain(r: BudgetRound): string[] {
  return [
    `E = −13.6/${r.n}² = ${fmt(level(r.n))} eV. For an electron in a circular orbit K = −E and U = 2E.`,
    `So K = +${fmt(r.ke)} eV and U = ${sgn(r.pe)} eV, and K + U = E (Exercise 12.4).`,
  ];
}
export { seriesName as series };
