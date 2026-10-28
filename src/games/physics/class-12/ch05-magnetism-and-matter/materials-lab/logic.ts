// Pure rules of the Materials Lab: no DOM, no canvas.
// H and M in A/m, B in T, susceptibility in the unit named.
import { pick, shuffle } from '@core/quiz';

export const MU0 = 4 * Math.PI * 1e-7;

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e5 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => Math.abs(value - answer) / Math.abs(answer) <= tol;

export type Kind = 'diamagnetic' | 'paramagnetic' | 'ferromagnetic';
export const kindOf = (chi: number): Kind => (chi < 0 ? 'diamagnetic' : chi < 0.01 ? 'paramagnetic' : 'ferromagnetic');
export const MATERIALS: Record<Kind, string[]> = {
  diamagnetic: ['bismuth', 'copper', 'lead', 'water', 'silicon'],
  paramagnetic: ['aluminium', 'sodium', 'calcium', 'oxygen'],
  ferromagnetic: ['iron', 'nickel', 'cobalt'],
};

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelCore {
  kind: 'core';
  story: string;
  n: number;
  i: number;
  mur: number;
  h: number;
  m: number;
  b: number;
  freeTests: number;
}
export interface LevelChi {
  kind: 'chi';
  story: string;
  mur: number;
  /** The unit of the susceptibility answer: 1e-5 for the weak materials, 1 for a ferromagnet. */
  unit: number;
  chiUnits: number;
  type: Kind;
  freeTests: number;
}
export interface LevelCurie {
  kind: 'curie';
  story: string;
  chi1: number;
  t1: number;
  t2: number;
  chi2: number;
  freeTests: number;
}
export interface LevelPick {
  kind: 'pick';
  story: string;
  options: string[];
  repelled: string;
  weak: string;
  strong: string;
  freeTests: number;
}
export type Level = LevelCore | LevelChi | LevelCurie | LevelPick;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const n = pick([500, 1000, 2000], random);
    const i = pick([1, 2, 3], random);
    const mur = pick([500, 1000, 2000, 5000], random);
    const h = n * i;
    return {
      kind: 'core',
      story: 'A long solenoid is filled with a ferromagnetic core. The current sets up the magnetic intensity H. The core adds a magnetisation M, and the total field is B = μ₀(H + M). Find H, M and B inside the core.',
      n,
      i,
      mur,
      h,
      m: (mur - 1) * h,
      b: MU0 * mur * h,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const kind = pick(['diamagnetic', 'paramagnetic', 'ferromagnetic'] as Kind[], random);
    if (kind === 'ferromagnetic') {
      const mur = pick([1000, 2000, 5000], random);
      return { kind: 'chi', story: 'The relative permeability of a material is measured. Find its magnetic susceptibility, and say whether the material is diamagnetic, paramagnetic or ferromagnetic.', mur, unit: 1, chiUnits: mur - 1, type: kind, freeTests: 1 };
    }
    const chi5 = kind === 'diamagnetic' ? pick([-1, -2, -5], random) : pick([1.2, 2.3, 5], random);
    return { kind: 'chi', story: 'The relative permeability of a material is measured. Find its magnetic susceptibility, in units of 10⁻⁵, and say whether the material is diamagnetic, paramagnetic or ferromagnetic.', mur: 1 + chi5 * 1e-5, unit: 1e-5, chiUnits: chi5, type: kind, freeTests: 1 };
  }
  if (level === 3) {
    const chi1 = pick([1.2, 2.4, 3.6, 6], random);
    const t1 = pick([200, 300, 400], random);
    const t2 = pick([100, 150, 600, 800], random);
    return {
      kind: 'curie',
      story: 'The susceptibility of a paramagnetic material depends on temperature. Atoms with permanent magnetic moments are aligned by the field, but thermal motion keeps disturbing them. Find the susceptibility at the new temperature. Give it in units of 10⁻⁵.',
      chi1,
      t1,
      t2,
      chi2: (chi1 * t1) / t2,
      freeTests: 1,
    };
  }
  const dia = pick(MATERIALS.diamagnetic, random);
  const para = pick(MATERIALS.paramagnetic, random);
  const ferro = pick(MATERIALS.ferromagnetic, random);
  return {
    kind: 'pick',
    story: 'Three samples are brought near the end of a strong magnet. Decide which one is pushed away from the strong field, which one is weakly pulled in, and which one is strongly pulled in.',
    options: shuffle([dia, para, ferro], random),
    repelled: dia,
    weak: para,
    strong: ferro,
    freeTests: 1,
  };
}

export function judgeCore(lvl: LevelCore, h: number, m: number, b: number): { ok: boolean; hOk: boolean; mOk: boolean; bOk: boolean } {
  const hOk = within(h, lvl.h, 0.03);
  const mOk = within(m, lvl.m, 0.03);
  const bOk = within(b, lvl.b, 0.03);
  return { ok: hOk && mOk && bOk, hOk, mOk, bOk };
}
export function judgeChi(lvl: LevelChi, chi: number, type: Kind): { ok: boolean; chiOk: boolean; typeOk: boolean } {
  const chiOk = within(chi, lvl.chiUnits, 0.03);
  const typeOk = type === lvl.type;
  return { ok: chiOk && typeOk, chiOk, typeOk };
}
export function judgeCurie(lvl: LevelCurie, chi2: number): { ok: boolean } {
  return { ok: within(chi2, lvl.chi2, 0.03) };
}
export function judgePick(lvl: LevelPick, repelled: string, weak: string, strong: string): { ok: boolean; rOk: boolean; wOk: boolean; sOk: boolean } {
  const rOk = repelled === lvl.repelled;
  const wOk = weak === lvl.weak;
  const sOk = strong === lvl.strong;
  return { ok: rOk && wOk && sOk, rOk, wOk, sOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'core') {
    return [
      `H = nI = ${lvl.n} × ${lvl.i} = ${fmt(lvl.h)} A/m: it depends only on the current in the windings.`,
      `With μᵣ = ${lvl.mur}, χ = μᵣ − 1 and M = χH = ${fmt(lvl.m)} A/m.`,
      `B = μ₀(H + M) = μ₀μᵣH = 4π × 10⁻⁷ × ${lvl.mur} × ${fmt(lvl.h)} = ${fmt(lvl.b)} T.`,
    ];
  }
  if (lvl.kind === 'chi') {
    return [
      `μᵣ = 1 + χ, so χ = μᵣ − 1 = ${fmt(lvl.chiUnits * lvl.unit)}${lvl.unit === 1 ? '' : `, which is ${lvl.chiUnits} × 10⁻⁵`}.`,
      `A small negative χ means diamagnetic, a small positive χ means paramagnetic, and a large positive χ means ferromagnetic. This one is ${lvl.type}.`,
    ];
  }
  if (lvl.kind === 'curie') {
    return [
      `Curie's law: χ is proportional to 1/T for a paramagnetic material, so χ₂ = χ₁T₁/T₂ = ${lvl.chi1} × ${lvl.t1} / ${lvl.t2} = ${fmt(lvl.chi2)} × 10⁻⁵.`,
      'Cooling a paramagnet makes the dipoles line up more easily, so χ rises as the temperature falls.',
    ];
  }
  return [
    `${lvl.repelled} is diamagnetic: it develops a magnetisation opposite to the field and moves from strong to weak field, so it is repelled.`,
    `${lvl.weak} is paramagnetic: its atoms have permanent moments that line up a little, so it is weakly attracted. ${lvl.strong} is ferromagnetic: its domains line up and it is strongly attracted.`,
  ];
}
