// Pure rules of Gauss Lab II (symmetry at work): no DOM, no canvas. SI units except where the unit is named.
import { pick } from '@core/quiz';

export const EPS0 = 8.854e-12;
export const K = 9e9;
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => (answer === 0 ? Math.abs(value) <= 1e-6 : Math.abs(value - answer) / Math.abs(answer) <= tol);

/** Field of an infinite line with λ µC/m at r cm: E = λ / (2π ε₀ r) = 2kλ/r (N/C). */
export const lineField = (lambdaMicro: number, rCm: number) => (2 * K * lambdaMicro * 1e-6) / (rCm / 100);
/** Field of an infinite sheet with σ µC/m²: E = σ / (2 ε₀), the same at every distance. */
export const sheetField = (sigmaMicro: number) => (sigmaMicro * 1e-6) / (2 * EPS0);
/** Field between two large plates with +σ and −σ: E = σ / ε₀; outside it is zero. */
export const platesBetween = (sigmaMicro: number) => (sigmaMicro * 1e-6) / EPS0;
/** Field of a thin shell with total charge q nC and radius R cm, at r cm from the centre (signed: outward is positive). */
export const shellField = (qNano: number, rCm: number, RCm: number) => (rCm < RCm ? 0 : (K * qNano * 1e-9) / (rCm / 100) ** 2);

// ---- level 1: pick the Gaussian surface -----------------------------------------------------------------------------

export type Dist = 'point' | 'line' | 'sheet' | 'shell';
export type Surface = 'sphere' | 'cylinder' | 'pillbox' | 'cube' | 'blob';
export const DIST_NAME: Record<Dist, string> = { point: 'a point charge', line: 'a very long straight charged wire', sheet: 'a very large flat charged sheet', shell: 'a uniformly charged thin spherical shell' };
export const SURFACE_NAME: Record<Surface, string> = { sphere: 'A sphere centred on it', cylinder: 'A cylinder around it, sharing its axis', pillbox: 'A flat box (pillbox) straddling it', cube: 'A cube', blob: 'An irregular blob' };
export const CORRECT_SURFACE: Record<Dist, Surface> = { point: 'sphere', line: 'cylinder', sheet: 'pillbox', shell: 'sphere' };
export const WHY: Record<Dist, string> = {
  point: 'The field of a point charge points straight out and has the same size at every point of a sphere centred on it, so E can be taken out of the flux integral: Φ = E × 4πr².',
  line: 'By symmetry the field of a long wire points straight out from it and depends only on the distance. On a coaxial cylinder it is perpendicular to the curved wall and constant there, and parallel to the ends (no flux through them): Φ = E × 2πrl.',
  sheet: 'The field of a large sheet is perpendicular to it, the same size on both sides at equal distances. A pillbox through the sheet has the field perpendicular to its two flat faces and parallel to its sides: Φ = 2EA.',
  shell: 'The charge is spread evenly over a sphere, so the field points radially and depends only on the distance. A sphere concentric with the shell has the same E everywhere on it.',
};
export interface LevelPick {
  kind: 'pick';
  story: string;
  rounds: Dist[];
  freeTests: number;
}
export function judgePick(round: Dist, chosen: Surface): { ok: boolean } {
  return { ok: CORRECT_SURFACE[round] === chosen };
}

// ---- level 2: the line --------------------------------------------------------------------------------------------------

export type Fall = '1/2' | '1/4' | '1/8';
export interface LevelLine {
  kind: 'line';
  story: string;
  lambda: number; // µC/m
  r: number; // cm
  field: number;
  freeTests: number;
}
export function judgeLine(lvl: LevelLine, lambdaTyped: number, fall: Fall): { ok: boolean; lambdaOk: boolean; fallOk: boolean } {
  const lambdaOk = within(lambdaTyped, lvl.lambda, 0.03);
  const fallOk = fall === '1/2';
  return { ok: lambdaOk && fallOk, lambdaOk, fallOk };
}

// ---- level 3: sheet or plates -----------------------------------------------------------------------------------------

export interface LevelSheet {
  kind: 'sheet';
  story: string;
  mode: 'sheet' | 'plates';
  sigma: number; // µC/m²
  /** One sheet: its field. Two plates: the field between and outside. */
  first: number;
  second: number;
  freeTests: number;
}
export type Same = 'same' | 'half' | 'double';
export function judgeSheet(lvl: LevelSheet, a: number, b: number, same: Same | null): { ok: boolean; aOk: boolean; bOk: boolean } {
  const aOk = within(a, lvl.first, 0.03);
  const bOk = lvl.mode === 'sheet' ? same === 'same' : within(b, lvl.second, 0.03);
  return { ok: aOk && bOk, aOk, bOk };
}

// ---- levels 4 and 5: the shell --------------------------------------------------------------------------------------------

export type Dir = 'outward' | 'inward' | 'none';
export type Region = 'inside' | 'outside';
export interface LevelShell {
  kind: 'shell';
  story: string;
  q: number; // nC, signed
  R: number; // cm
  r: number; // cm
  region: Region;
  field: number; // magnitude, N/C
  dir: Dir;
  freeTests: number;
}
export function judgeShell(lvl: LevelShell, region: Region, e: number, dir: Dir): { ok: boolean; regionOk: boolean; eOk: boolean; dirOk: boolean } {
  const regionOk = region === lvl.region;
  const eOk = within(e, lvl.field, 0.04);
  const dirOk = dir === lvl.dir;
  return { ok: regionOk && eOk && dirOk, regionOk, eOk, dirOk };
}
export interface LevelFindQ {
  kind: 'findq';
  story: string;
  R: number;
  r: number;
  field: number;
  dir: 'outward' | 'inward';
  answer: number; // nC, signed
  freeTests: number;
}
export type YesNo = 'yes' | 'no';
export function judgeFindQ(lvl: LevelFindQ, q: number, radiusMatters: YesNo): { ok: boolean; qOk: boolean; radiusOk: boolean } {
  const qOk = Math.sign(q) === Math.sign(lvl.answer) && within(q, lvl.answer, 0.04);
  const radiusOk = radiusMatters === 'no';
  return { ok: qOk && radiusOk, qOk, radiusOk };
}

export type Level = LevelPick | LevelLine | LevelSheet | LevelShell | LevelFindQ;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const all: Dist[] = ['point', 'line', 'sheet', 'shell'];
    const rounds: Dist[] = [];
    while (rounds.length < 3) {
      const d = pick(all, random);
      if (!rounds.includes(d)) rounds.push(d);
    }
    return { kind: 'pick', story: 'To find a field with Gauss’s law you need a closed surface on which the field is perpendicular and the same everywhere, or has no flux through it. Three charge distributions arrive one at a time. For each, choose the Gaussian surface that makes the job easy.', rounds, freeTests: 1 };
  }
  if (level === 2) {
    const lambda = pick([0.1, 0.2, 0.5, 1, 2], random);
    const r = pick([2, 5, 10, 20], random);
    return {
      kind: 'line',
      story: 'A very long straight wire carries a uniform charge per unit length. A probe measures the field at a distance from it. Work out the charge per unit length, then say what happens to the field when the probe moves to twice the distance.',
      lambda,
      r,
      field: lineField(lambda, r),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const sigma = pick([1, 2, 4, 5, 8], random);
    const mode = random() < 0.5 ? 'sheet' : 'plates';
    return {
      kind: 'sheet',
      story:
        mode === 'sheet'
          ? 'A very large flat sheet carries a uniform surface charge density. Find the field near it, and say what happens when you move twice as far from the sheet.'
          : 'Two large parallel plates carry equal and opposite surface charge densities. Find the field between the plates and the field outside them, on either side.',
      mode,
      sigma,
      first: mode === 'sheet' ? sheetField(sigma) : platesBetween(sigma),
      second: 0,
      freeTests: 1,
    };
  }
  if (level === 4) {
    const q = (random() < 0.5 ? -1 : 1) * pick([5, 10, 20, 40], random);
    const R = pick([10, 15, 20], random);
    const outside = random() < 0.6;
    const r = outside ? pick([25, 30, 40, 50], random) : pick([3, 5, 8], random);
    return {
      kind: 'shell',
      story: 'A thin spherical shell carries a charge spread evenly over its surface. A probe is placed at the marked distance from the centre. Say whether it is inside or outside the shell, find the field there, and say which way it points.',
      q,
      R,
      r,
      region: outside ? 'outside' : 'inside',
      field: Math.abs(shellField(q, r, R)),
      dir: outside ? (q > 0 ? 'outward' : 'inward') : 'none',
      freeTests: 1,
    };
  }
  const R = pick([10, 15], random);
  const r = pick([20, 30, 40], random);
  const field = pick([1000, 1500, 2000, 3000], random);
  const dir = random() < 0.5 ? 'inward' : 'outward';
  const mag = (field * (r / 100) ** 2) / K / 1e-9; // nC
  return {
    kind: 'findq',
    story: 'A conducting sphere carries an unknown charge. A probe outside it measures the field and which way it points. Work out the charge on the sphere, with its sign, and say whether the size of the sphere matters for this.',
    R,
    r,
    field,
    dir,
    answer: dir === 'outward' ? mag : -mag,
    freeTests: 1,
  };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win -------------------------------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'pick') return lvl.rounds.map((d) => `${DIST_NAME[d][0].toUpperCase()}${DIST_NAME[d].slice(1)}: ${SURFACE_NAME[CORRECT_SURFACE[d]].toLowerCase()}. ${WHY[d]}`);
  if (lvl.kind === 'line') {
    return [
      'Gauss’s law with a coaxial cylinder gives E × 2πrl = λl / ε₀, so E = λ / (2π ε₀ r) = 2kλ / r.',
      `Here λ = E r / 2k = ${fmt(lvl.field)} × ${lvl.r / 100} / (2 × 9 × 10⁹) = ${fmt(lvl.lambda * 1e-6)} C/m = ${lvl.lambda} µC/m.`,
      'E ∝ 1/r, so at twice the distance the field is half as large (not a quarter, as it would be for a point charge).',
    ];
  }
  if (lvl.kind === 'sheet') {
    return lvl.mode === 'sheet'
      ? ['A pillbox through the sheet gives 2EA = σA / ε₀, so E = σ / 2ε₀.', `Here E = ${lvl.sigma} × 10⁻⁶ / (2 × 8.854 × 10⁻¹²) = ${fmt(lvl.first)} N/C.`, 'The field does not depend on the distance from the sheet, so at twice the distance it is unchanged.']
      : ['Each plate gives σ/2ε₀. Between opposite plates the two fields point the same way and add: E = σ/ε₀. Outside, they point opposite ways and cancel: E = 0.', `Here σ/ε₀ = ${lvl.sigma} × 10⁻⁶ / 8.854 × 10⁻¹² = ${fmt(lvl.first)} N/C between the plates, and 0 outside.`, 'This is the field of a parallel-plate arrangement.'];
  }
  if (lvl.kind === 'shell') {
    return lvl.region === 'inside'
      ? ['Inside a uniformly charged shell, a Gaussian sphere encloses no charge, so the net flux is zero. By symmetry E is the same all over the sphere, so E = 0.', `The probe is at ${lvl.r} cm, inside the shell of radius ${lvl.R} cm, so the field is zero.`, 'There is no force on a charge anywhere inside the shell.']
      : ['Outside, a Gaussian sphere encloses the whole charge q, so E × 4πr² = q/ε₀ and E = kq/r²: the shell acts like a point charge at its centre.', `Here E = 9 × 10⁹ × ${Math.abs(lvl.q)} × 10⁻⁹ / (${lvl.r / 100})² = ${fmt(lvl.field)} N/C, pointing ${lvl.dir} (${lvl.q > 0 ? 'positive' : 'negative'} charge).`, 'The field outside depends on the charge and the distance from the centre, not on the radius of the shell.'];
  }
  return [
    'Outside the sphere the field is that of a point charge at the centre: E = kq/r², directed outward for positive q and inward for negative q.',
    `So |q| = E r² / k = ${fmt(lvl.field)} × (${lvl.r / 100})² / (9 × 10⁹) = ${fmt(Math.abs(lvl.answer))} nC, and since the field points ${lvl.dir} the charge is ${lvl.answer > 0 ? 'positive' : 'negative'}: q = ${fmt(lvl.answer)} nC.`,
    'The radius of the sphere (' + lvl.R + ' cm) was not needed: outside, only the total charge and the distance from the centre matter.',
  ];
}
