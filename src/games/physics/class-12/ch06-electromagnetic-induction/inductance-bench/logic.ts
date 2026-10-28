// Pure rules of the Inductance Bench: no DOM, no canvas.
import { pick } from '@core/quiz';

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

/** Self-inductance of a long solenoid of N turns, area A (cm²), length l (cm), in mH. */
export const solenoidMilliHenry = (n: number, aCm2: number, lCm: number) => ((MU0 * n * n * (aCm2 * 1e-4)) / (lCm / 100)) * 1000;
/** Energy stored, ½LI², in mJ with L in mH and I in A. */
export const energyMilliJ = (lMilliH: number, i: number) => 0.5 * lMilliH * i * i;
/** Mutual inductance of a small coil at the centre of a large one, in nH: μ₀ N₁N₂ π r₁²/(2 r₂), radii in cm. */
export const concentricNanoHenry = (n1: number, n2: number, r1Cm: number, r2Cm: number) => ((MU0 * n1 * n2 * Math.PI * (r1Cm / 100) ** 2) / (2 * (r2Cm / 100))) * 1e9;
/** Magnetic energy density B²/2μ₀ in J/m³. */
export const energyDensity = (b: number) => (b * b) / (2 * MU0);

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelSelf {
  kind: 'self';
  story: string;
  mode: 'L' | 'emf';
  l: number;
  dI: number;
  dt: number;
  emf: number;
  answer: number;
  freeTests: number;
}
export interface LevelMutual {
  kind: 'mutual';
  story: string;
  m: number;
  dI: number;
  dt: number;
  linkage: number;
  emf: number;
  freeTests: number;
}
export interface LevelSolenoid {
  kind: 'solenoid';
  story: string;
  n: number;
  aCm2: number;
  lCm: number;
  i: number;
  mH: number;
  mJ: number;
  freeTests: number;
}
export interface LevelConcentric {
  kind: 'concentric';
  story: string;
  n1: number;
  n2: number;
  r1: number;
  r2: number;
  nH: number;
  freeTests: number;
}
export interface LevelDensity {
  kind: 'density';
  story: string;
  b: number;
  volCm3: number;
  u: number;
  mJ: number;
  freeTests: number;
}
export type Level = LevelSelf | LevelMutual | LevelSolenoid | LevelConcentric | LevelDensity;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const mode = random() < 0.5 ? 'L' : 'emf';
    const dI = pick([2, 5, 10], random);
    const dt = pick([0.05, 0.1, 0.2], random);
    const l = pick([0.5, 2, 4], random);
    const emf = (l * dI) / dt;
    return {
      kind: 'self',
      story: mode === 'L' ? 'The current in a circuit falls steadily to zero and an average emf is induced in it by self-induction. Find the self-inductance of the circuit.' : 'The current in a coil of known self-inductance changes steadily. Find the average emf induced in it.',
      mode,
      l,
      dI,
      dt,
      emf,
      answer: mode === 'L' ? l : emf,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const m = pick([0.5, 1.5, 2], random);
    const dI = pick([10, 20, 30], random);
    const dt = pick([0.1, 0.5, 2], random);
    return {
      kind: 'mutual',
      story: 'Two adjacent coils have a mutual inductance. The current in one changes steadily. Find the change in the flux linkage of the other coil, and the average emf induced in it.',
      m,
      dI,
      dt,
      linkage: m * dI,
      emf: (m * dI) / dt,
      freeTests: 1,
    };
  }
  if (level === 3) {
    const n = pick([500, 1000, 2000], random);
    const aCm2 = pick([2, 5, 10], random);
    const lCm = pick([25, 50, 100], random);
    const i = pick([1, 2, 5], random);
    const mH = solenoidMilliHenry(n, aCm2, lCm);
    return {
      kind: 'solenoid',
      story: 'A long air-cored solenoid has a self-inductance that depends only on its geometry. Find it, and then the magnetic energy stored in it when it carries a given current.',
      n,
      aCm2,
      lCm,
      i,
      mH,
      mJ: energyMilliJ(mH, i),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const n1 = pick([1, 10, 20], random);
    const n2 = pick([1, 10, 25], random);
    const r1 = pick([1, 2], random);
    const r2 = pick([20, 25, 40], random);
    return {
      kind: 'concentric',
      story: 'A small circular coil sits at the centre of a much larger one, in the same plane. Treat the field of the large coil as uniform over the small one. Find the mutual inductance of the pair.',
      n1,
      n2,
      r1,
      r2,
      nH: concentricNanoHenry(n1, n2, r1, r2),
      freeTests: 1,
    };
  }
  const b = pick([0.1, 0.5, 1, 2], random);
  const volCm3 = pick([50, 100, 500], random);
  const u = energyDensity(b);
  return {
    kind: 'density',
    story: 'Energy is stored in a magnetic field, as it is in the electric field of a capacitor. Find the energy in each cubic metre of a region where the field is uniform, and the energy in a given volume of it.',
    b,
    volCm3,
    u,
    mJ: u * volCm3 * 1e-6 * 1000,
    freeTests: 1,
  };
}

export function judgeSelf(lvl: LevelSelf, v: number): { ok: boolean } {
  return { ok: within(v, lvl.answer, 0.03) };
}
export function judgeMutual(lvl: LevelMutual, linkage: number, emf: number): { ok: boolean; lOk: boolean; eOk: boolean } {
  const lOk = within(linkage, lvl.linkage, 0.03);
  const eOk = within(emf, lvl.emf, 0.03);
  return { ok: lOk && eOk, lOk, eOk };
}
export function judgeSolenoid(lvl: LevelSolenoid, mH: number, mJ: number): { ok: boolean; lOk: boolean; uOk: boolean } {
  const lOk = within(mH, lvl.mH, 0.03);
  const uOk = within(mJ, lvl.mJ, 0.03);
  return { ok: lOk && uOk, lOk, uOk };
}
export function judgeConcentric(lvl: LevelConcentric, nH: number): { ok: boolean } {
  return { ok: within(nH, lvl.nH, 0.03) };
}
export function judgeDensity(lvl: LevelDensity, u: number, mJ: number): { ok: boolean; uOk: boolean; eOk: boolean } {
  const uOk = within(u, lvl.u, 0.03);
  const eOk = within(mJ, lvl.mJ, 0.03);
  return { ok: uOk && eOk, uOk, eOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'self') {
    return lvl.mode === 'L'
      ? [`The average emf is ε = L ΔI/Δt, so L = ε Δt/ΔI = ${fmt(lvl.emf)} × ${lvl.dt} / ${lvl.dI} = ${fmt(lvl.l)} H.`, 'Self-inductance is the emf per unit rate of change of the current. The emf opposes the change, which is what the minus sign in ε = −L dI/dt means.']
      : [`ε = L ΔI/Δt = ${lvl.l} × ${lvl.dI} / ${lvl.dt} = ${fmt(lvl.emf)} V.`, 'The emf opposes the change in current: it tries to keep the current as it was.'];
  }
  if (lvl.kind === 'mutual') {
    return [`The flux linkage of the second coil is NΦ = M I, so its change is M ΔI = ${lvl.m} × ${lvl.dI} = ${fmt(lvl.linkage)} Wb.`, `The average emf is that change divided by the time: ${fmt(lvl.linkage)} / ${lvl.dt} = ${fmt(lvl.emf)} V.`];
  }
  if (lvl.kind === 'solenoid') {
    return [`L = μ₀N²A/l = 4π × 10⁻⁷ × ${lvl.n}² × ${lvl.aCm2 * 1e-4} / ${lvl.lCm / 100} = ${fmt(lvl.mH)} mH.`, `The energy is U = ½LI² = ½ × ${fmt(lvl.mH)} × ${lvl.i}² = ${fmt(lvl.mJ)} mJ.`];
  }
  if (lvl.kind === 'concentric') {
    return [`The large coil carries I₂ and gives B = μ₀N₂I₂/2r₂ at the centre. The small coil has N₁ turns of area πr₁², so its flux linkage is N₁πr₁²B.`, `M = μ₀N₁N₂πr₁²/2r₂ = ${fmt(lvl.nH)} nH.`];
  }
  return [`The energy density is u = B²/2μ₀ = ${lvl.b}² / (2 × 4π × 10⁻⁷) = ${fmt(lvl.u)} J/m³.`, `In ${lvl.volCm3} cm³ = ${lvl.volCm3 * 1e-6} m³ the energy is ${fmt(lvl.mJ)} mJ. The electric field stores energy ½ε₀E² per unit volume in the same way.`];
}
