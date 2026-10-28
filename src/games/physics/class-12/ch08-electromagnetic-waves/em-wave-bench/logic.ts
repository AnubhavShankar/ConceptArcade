// Pure rules of the EM Wave Bench: no DOM, no canvas.
import { pick, shuffle } from '@core/quiz';

export const C = 3e8;
export const EPS0 = 8.854e-12;
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

export type Axis = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';
const VEC: Record<Axis, [number, number, number]> = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] };
const NAME = (v: [number, number, number]): Axis => {
  const [x, y, z] = v;
  if (x) return x > 0 ? '+x' : '-x';
  if (y) return y > 0 ? '+y' : '-y';
  return z > 0 ? '+z' : '-z';
};
/** The direction of B: since E × B points along the direction of travel, B = k̂ × Ê. */
export function bDirection(travel: Axis, e: Axis): Axis {
  const [a1, a2, a3] = VEC[travel];
  const [b1, b2, b3] = VEC[e];
  return NAME([a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1]);
}

export const bFromE = (e0: number) => e0 / C;
export const eFromB = (b0: number) => b0 * C;
export const wavelength = (fHz: number) => C / fHz;
/** Average energy density of the B field, B₀²/4μ₀, in nJ/m³; the E-field average ¼ε₀E₀² is equal. */
export const avgDensityNano = (b0: number) => ((b0 * b0) / (4 * MU0)) * 1e9;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelMagnitude {
  kind: 'magnitude';
  story: string;
  mode: 'E' | 'B';
  b0Nano: number;
  e0: number;
  answer: number;
  freeTests: number;
}
export interface LevelDirection {
  kind: 'direction';
  story: string;
  travel: Axis;
  e: Axis;
  b: Axis;
  freeTests: number;
}
export interface LevelWavelength {
  kind: 'wavelength';
  story: string;
  f1: number;
  f2: number;
  l1: number;
  l2: number;
  freeTests: number;
}
export interface LevelQuantities {
  kind: 'quantities';
  story: string;
  e0: number;
  fMHz: number;
  b0Nano: number;
  k: number;
  lambda: number;
  freeTests: number;
}
export interface LevelEquation {
  kind: 'equation';
  story: string;
  b0e7: number;
  k3: number;
  omega11: number;
  lambdaCm: number;
  fGHz: number;
  e0: number;
  freeTests: number;
}
export type Equal = 'equal' | 'e-larger' | 'b-larger';
export interface LevelEnergy {
  kind: 'energy';
  story: string;
  e0: number;
  fGHz: number;
  lambdaCm: number;
  b0Nano: number;
  uNano: number;
  freeTests: number;
}
export type Level = LevelMagnitude | LevelDirection | LevelWavelength | LevelQuantities | LevelEquation | LevelEnergy;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const mode = random() < 0.5 ? 'E' : 'B';
    const b0Nano = pick([100, 300, 510], random);
    const e0 = pick([6.3, 30, 120], random);
    return {
      kind: 'magnitude',
      story: mode === 'E' ? 'In an electromagnetic wave the electric and magnetic fields rise and fall together, in a fixed ratio. The amplitude of the magnetic field is known. Find the amplitude of the electric field.' : 'In an electromagnetic wave the electric and magnetic fields rise and fall together, in a fixed ratio. The electric field at an instant is known. Find the magnetic field at that instant.',
      mode,
      b0Nano,
      e0,
      answer: mode === 'E' ? eFromB(b0Nano * 1e-9) : bFromE(e0) * 1e9,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const [travel, e] = (() => {
      const axes: Axis[] = ['+x', '-x', '+y', '-y', '+z', '-z'];
      for (;;) {
        const t = pick(axes, random);
        const ee = pick(axes, random);
        if (t[1] !== ee[1]) return [t, ee] as [Axis, Axis];
      }
    })();
    return {
      kind: 'direction',
      story: 'A plane electromagnetic wave travels in vacuum along a coordinate axis, with its electric field along another. The wave is transverse, and E, B and the direction of travel are mutually at right angles, with E × B along the direction of travel. Find the direction of the magnetic field.',
      travel,
      e,
      b: bDirection(travel, e),
      freeTests: 1,
    };
  }
  if (level === 3) {
    const [f1, f2] = shuffle([7.5, 12, 25, 30, 50, 100], random).slice(0, 2);
    return {
      kind: 'wavelength',
      story: 'All electromagnetic waves travel at the same speed in vacuum, so a higher frequency means a shorter wavelength. Find the wavelength for each of two frequencies, in metres. A radio tuned across a band of frequencies is picking up this range of wavelengths.',
      f1,
      f2,
      l1: wavelength(f1 * 1e6),
      l2: wavelength(f2 * 1e6),
      freeTests: 1,
    };
  }
  if (level === 4) {
    const e0 = pick([60, 120, 240], random);
    const fMHz = pick([25, 50, 100], random);
    const lambda = wavelength(fMHz * 1e6);
    return {
      kind: 'quantities',
      story: 'The electric field amplitude and frequency of a plane electromagnetic wave are given. Find the amplitude of the magnetic field, the wave number, and the wavelength.',
      e0,
      fMHz,
      b0Nano: bFromE(e0) * 1e9,
      k: (2 * Math.PI) / lambda,
      lambda,
      freeTests: 1,
    };
  }
  if (level === 5) {
    const b0e7 = pick([1, 2, 3], random);
    const k3 = pick([0.5, 1, 2], random);
    const omega11 = (C * k3 * 1e3) / 1e11;
    return {
      kind: 'equation',
      story: 'The magnetic field of a plane electromagnetic wave is B = B₀ sin(kx + ωt). Read the wave number and angular frequency from the equation. Find the wavelength, the frequency, and the amplitude of the electric field.',
      b0e7,
      k3,
      omega11,
      lambdaCm: ((2 * Math.PI) / (k3 * 1e3)) * 100,
      fGHz: (omega11 * 1e11) / (2 * Math.PI) / 1e9,
      e0: C * b0e7 * 1e-7,
      freeTests: 1,
    };
  }
  const e0 = pick([24, 48, 96], random);
  const fGHz = pick([10, 20], random);
  const b0 = bFromE(e0);
  return {
    kind: 'energy',
    story: 'In an electromagnetic wave the energy is carried by both fields. Find the wavelength, the amplitude of the magnetic field, and the average energy density of the magnetic field. Then compare the average energy densities of the electric and magnetic fields.',
    e0,
    fGHz,
    lambdaCm: wavelength(fGHz * 1e9) * 100,
    b0Nano: b0 * 1e9,
    uNano: avgDensityNano(b0),
    freeTests: 1,
  };
}

export function judgeMagnitude(lvl: LevelMagnitude, v: number): { ok: boolean } {
  return { ok: within(v, lvl.answer, 0.03) };
}
export function judgeDirection(lvl: LevelDirection, b: Axis): { ok: boolean } {
  return { ok: b === lvl.b };
}
export function judgeWavelength(lvl: LevelWavelength, a: number, b: number): { ok: boolean; aOk: boolean; bOk: boolean } {
  const aOk = within(a, lvl.l1, 0.03);
  const bOk = within(b, lvl.l2, 0.03);
  return { ok: aOk && bOk, aOk, bOk };
}
export function judgeQuantities(lvl: LevelQuantities, b: number, k: number, l: number): { ok: boolean; bOk: boolean; kOk: boolean; lOk: boolean } {
  const bOk = within(b, lvl.b0Nano, 0.03);
  const kOk = within(k, lvl.k, 0.03);
  const lOk = within(l, lvl.lambda, 0.03);
  return { ok: bOk && kOk && lOk, bOk, kOk, lOk };
}
export function judgeEquation(lvl: LevelEquation, lam: number, f: number, e: number): { ok: boolean; lOk: boolean; fOk: boolean; eOk: boolean } {
  const lOk = within(lam, lvl.lambdaCm, 0.03);
  const fOk = within(f, lvl.fGHz, 0.03);
  const eOk = within(e, lvl.e0, 0.03);
  return { ok: lOk && fOk && eOk, lOk, fOk, eOk };
}
export function judgeEnergy(lvl: LevelEnergy, lam: number, b: number, u: number, eq: Equal): { ok: boolean; lOk: boolean; bOk: boolean; uOk: boolean; eqOk: boolean } {
  const lOk = within(lam, lvl.lambdaCm, 0.03);
  const bOk = within(b, lvl.b0Nano, 0.03);
  const uOk = within(u, lvl.uNano, 0.03);
  const eqOk = eq === 'equal';
  return { ok: lOk && bOk && uOk && eqOk, lOk, bOk, uOk, eqOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'magnitude') {
    return lvl.mode === 'E'
      ? [`E₀ = c B₀ = 3 × 10⁸ × ${lvl.b0Nano} × 10⁻⁹ = ${fmt(lvl.answer)} V/m.`, 'In vacuum the ratio of the amplitudes is c, and the two fields are in phase.']
      : [`B = E/c = ${lvl.e0} / (3 × 10⁸) = ${fmt(lvl.answer)} nT.`, 'The magnetic field of a wave is tiny compared with its electric field when both are measured in SI units.'];
  }
  if (lvl.kind === 'direction') {
    return [`The direction of travel is E × B, so B = k̂ × Ê. With travel along ${lvl.travel} and E along ${lvl.e}, B points along ${lvl.b}.`, 'Both fields are at right angles to the direction of travel: the wave is transverse.'];
  }
  if (lvl.kind === 'wavelength') {
    return [`λ = c/f. For ${lvl.f1} MHz: λ = 3 × 10⁸ / ${lvl.f1 * 1e6} = ${fmt(lvl.l1)} m. For ${lvl.f2} MHz: λ = ${fmt(lvl.l2)} m.`, 'The frequency is set by the source, and the wavelength follows from the speed of light.'];
  }
  if (lvl.kind === 'quantities') {
    return [`B₀ = E₀/c = ${lvl.e0} / (3 × 10⁸) = ${fmt(lvl.b0Nano)} nT, and λ = c/f = ${fmt(lvl.lambda)} m.`, `k = 2π/λ = ${fmt(lvl.k)} rad/m, and ω = 2πf = ${fmt(2 * Math.PI * lvl.fMHz * 1e6)} rad/s.`];
  }
  if (lvl.kind === 'equation') {
    return [`Comparing with B = B₀ sin(2πx/λ + 2πt/T) gives k = ${lvl.k3} × 10³ rad/m, so λ = 2π/k = ${fmt(lvl.lambdaCm)} cm, and ω = ${fmt(lvl.omega11)} × 10¹¹ rad/s, so f = ω/2π = ${fmt(lvl.fGHz)} GHz.`, `E₀ = c B₀ = 3 × 10⁸ × ${lvl.b0e7} × 10⁻⁷ = ${fmt(lvl.e0)} V/m.`];
  }
  return [`λ = c/f = ${fmt(lvl.lambdaCm)} cm and B₀ = E₀/c = ${fmt(lvl.b0Nano)} nT. The average energy density of the B field is B₀²/4μ₀ = ${fmt(lvl.uNano)} nJ/m³.`, `The average energy density of the E field is ¼ε₀E₀², which comes to the same value: in an electromagnetic wave the electric and magnetic fields carry equal energy.`];
}
