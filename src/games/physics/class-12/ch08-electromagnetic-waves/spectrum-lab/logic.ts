// Pure rules of the Spectrum Lab: no DOM, no canvas.
import { pick, shuffle } from '@core/quiz';

export const C = 3e8;
export const H_PLANCK = 6.63e-34;
export const EV = 1.6e-19;

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => Math.abs(value - answer) / Math.abs(answer) <= tol;

export type Band = 'radio' | 'microwave' | 'infrared' | 'visible' | 'ultraviolet' | 'xray' | 'gamma';
/** Bands from the longest wavelength to the shortest, with a typical wavelength in metres and the upper and lower edges used for classification. */
export const BANDS: { id: Band; name: string; typical: number; lo: number; hi: number }[] = [
  { id: 'radio', name: 'radio waves', typical: 500, lo: 0.1, hi: 1e5 },
  { id: 'microwave', name: 'microwaves', typical: 0.03, lo: 1e-3, hi: 0.1 },
  { id: 'infrared', name: 'infrared', typical: 1e-5, lo: 7e-7, hi: 1e-3 },
  { id: 'visible', name: 'visible light', typical: 6.8e-7, lo: 4e-7, hi: 7e-7 },
  { id: 'ultraviolet', name: 'ultraviolet', typical: 1e-7, lo: 1e-9, hi: 4e-7 },
  { id: 'xray', name: 'X-rays', typical: 1e-10, lo: 1e-12, hi: 1e-9 },
  { id: 'gamma', name: 'gamma rays', typical: 1e-13, lo: 1e-16, hi: 1e-12 },
];
export const bandName = (b: Band) => BANDS.find((x) => x.id === b)!.name;
export const bandOf = (lambdaM: number): Band => {
  const hit = BANDS.find((b) => lambdaM >= b.lo && lambdaM < b.hi);
  return (hit ?? BANDS[BANDS.length - 1]).id;
};
export const frequencyOf = (lambdaM: number) => C / lambdaM;
/** Photon energy hf in eV. */
export const photonEv = (lambdaM: number) => (H_PLANCK * C) / lambdaM / EV;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelOrder {
  kind: 'order';
  story: string;
  bands: Band[];
  order: Band[];
  freeTests: number;
}
export interface LevelClassify {
  kind: 'classify';
  story: string;
  lambda: number;
  lambdaText: string;
  band: Band;
  hz: number;
  freeTests: number;
}
export interface LevelPhoton {
  kind: 'photon';
  story: string;
  lambda: number;
  lambdaText: string;
  other: number;
  otherText: string;
  ev: number;
  larger: 'first' | 'second';
  freeTests: number;
}
export type Same = 'speed' | 'frequency' | 'wavelength' | 'energy';
export interface LevelSame {
  kind: 'same';
  story: string;
  distanceKm: number;
  ms: number;
  freeTests: number;
}
export type Level = LevelOrder | LevelClassify | LevelPhoton | LevelSame;

const WAVELENGTHS: { m: number; text: string }[] = [
  { m: 500, text: '500 m' },
  { m: 0.03, text: '3 cm' },
  { m: 1e-5, text: '10 µm' },
  { m: 6.8e-7, text: '6800 Å' },
  { m: 1e-7, text: '100 nm' },
  { m: 1e-10, text: '10⁻¹⁰ m' },
];

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const bands = shuffle(BANDS.map((b) => b.id), random).slice(0, 5);
    const order = BANDS.map((b) => b.id).filter((b) => bands.includes(b));
    return {
      kind: 'order',
      story: 'The electromagnetic spectrum is divided into bands by wavelength, with no sharp edges between them. Put the bands shown in order, from the longest wavelength to the shortest. Pick them one at a time, longest first.',
      bands,
      order,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const w = pick(WAVELENGTHS, random);
    return {
      kind: 'classify',
      story: 'A wave of the stated wavelength travels in vacuum. Decide which part of the electromagnetic spectrum it belongs to, and find its frequency.',
      lambda: w.m,
      lambdaText: w.text,
      band: bandOf(w.m),
      hz: frequencyOf(w.m),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const [a, b] = shuffle(WAVELENGTHS, random).slice(0, 2);
    return {
      kind: 'photon',
      story: 'The energy of a photon of electromagnetic radiation is E = hf. It is usually quoted in electron-volts. Find the photon energy for the first wavelength, in eV, and say which of the two radiations has the more energetic photons.',
      lambda: a.m,
      lambdaText: a.text,
      other: b.m,
      otherText: b.text,
      ev: photonEv(a.m),
      larger: a.m < b.m ? 'first' : 'second',
      freeTests: 1,
    };
  }
  const distanceKm = pick([3000, 300, 30000], random);
  return {
    kind: 'same',
    story: 'X-rays of wavelength 10⁻¹⁰ m, red light of wavelength 6800 Å and radio waves of wavelength 500 m all leave a source at the same instant. Find how long each takes to travel the stated distance in vacuum, and say which physical quantity is the same for all three.',
    distanceKm,
    ms: (distanceKm * 1000) / C * 1000,
    freeTests: 1,
  };
}

export function judgeOrder(lvl: LevelOrder, picked: Band[]): { ok: boolean; complete: boolean } {
  return { ok: picked.length === lvl.order.length && picked.every((b, i) => b === lvl.order[i]), complete: picked.length === lvl.order.length };
}
export function judgeClassify(lvl: LevelClassify, band: Band, hz: number): { ok: boolean; bOk: boolean; fOk: boolean } {
  const bOk = band === lvl.band;
  const fOk = within(hz, lvl.hz, 0.03);
  return { ok: bOk && fOk, bOk, fOk };
}
export function judgePhoton(lvl: LevelPhoton, ev: number, larger: 'first' | 'second'): { ok: boolean; eOk: boolean; lOk: boolean } {
  const eOk = within(ev, lvl.ev, 0.03);
  const lOk = larger === lvl.larger;
  return { ok: eOk && lOk, eOk, lOk };
}
export function judgeSame(lvl: LevelSame, ms: number, same: Same): { ok: boolean; tOk: boolean; sOk: boolean } {
  const tOk = within(ms, lvl.ms, 0.03);
  const sOk = same === 'speed';
  return { ok: tOk && sOk, tOk, sOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'order') {
    return [`From the longest wavelength to the shortest: ${lvl.order.map(bandName).join(', ')}.`, 'The same order is from the lowest frequency to the highest and from the lowest photon energy to the highest, since λ = c/f and E = hf.'];
  }
  if (lvl.kind === 'classify') {
    return [`A wavelength of ${lvl.lambdaText} falls in the ${bandName(lvl.band)} band.`, `f = c/λ = 3 × 10⁸ / ${fmt(lvl.lambda)} = ${fmt(lvl.hz)} Hz.`];
  }
  if (lvl.kind === 'photon') {
    return [`E = hf = hc/λ = 6.63 × 10⁻³⁴ × 3 × 10⁸ / ${fmt(lvl.lambda)} J = ${fmt(lvl.ev)} eV.`, `The photon energy is inversely proportional to the wavelength, so the shorter wavelength carries the more energetic photons: the ${lvl.larger} one. Gamma and X-ray photons ionise atoms; radio photons are far too weak to.`];
  }
  return [`All electromagnetic waves travel at c = 3 × 10⁸ m/s in vacuum, so t = ${lvl.distanceKm * 1000} / (3 × 10⁸) = ${fmt(lvl.ms)} ms for each.`, 'Their frequencies, wavelengths and photon energies are all different. Only the speed in vacuum is the same.'];
}
