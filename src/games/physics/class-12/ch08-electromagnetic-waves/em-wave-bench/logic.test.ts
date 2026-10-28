import { describe, expect, it } from 'vitest';
import {
  EPS0,
  avgDensityNano,
  bDirection,
  bFromE,
  buildLevel,
  eFromB,
  explainSolution,
  fmt,
  judgeDirection,
  judgeEnergy,
  judgeEquation,
  judgeMagnitude,
  judgeQuantities,
  judgeWavelength,
  starsFor,
  wavelength,
  type Axis,
  type LevelDirection,
  type LevelEnergy,
  type LevelEquation,
  type LevelMagnitude,
  type LevelQuantities,
  type LevelWavelength,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('6.3 V/m gives B = 2.1 × 10⁻⁸ T (Example 8.1)', () => {
    expect(bFromE(6.3) * 1e9).toBeCloseTo(21, 6);
  });
  it('B₀ = 510 nT gives E₀ = 153 V/m (Exercise 8.7)', () => {
    expect(eFromB(510e-9)).toBeCloseTo(153, 6);
  });
  it('30 MHz has λ = 10 m, and 7.5 to 12 MHz is 40 m to 25 m (Exercises 8.4, 8.5)', () => {
    expect(wavelength(30e6)).toBeCloseTo(10, 9);
    expect(wavelength(7.5e6)).toBeCloseTo(40, 9);
    expect(wavelength(12e6)).toBeCloseTo(25, 9);
  });
  it('E₀ = 120 N/C at 50 MHz: B₀ = 400 nT, λ = 6 m, k = 1.05 rad/m (Exercise 8.8)', () => {
    expect(bFromE(120) * 1e9).toBeCloseTo(400, 6);
    expect((2 * Math.PI) / wavelength(50e6)).toBeCloseTo(1.047, 3);
  });
  it('2.0 × 10¹⁰ Hz and 48 V/m: λ = 1.5 cm, B₀ = 160 nT, equal energy densities (Exercise 8.10)', () => {
    expect(wavelength(2e10) * 100).toBeCloseTo(1.5, 9);
    expect(bFromE(48) * 1e9).toBeCloseTo(160, 6);
    expect((0.25 * EPS0 * 48 * 48) * 1e9).toBeCloseTo(avgDensityNano(bFromE(48)), 0);
  });
  it('By = 2 × 10⁻⁷ sin(0.5 × 10³ x + 1.5 × 10¹¹ t): λ = 1.26 cm, f = 23.9 GHz, E₀ = 60 V/m (Example 8.2)', () => {
    expect(((2 * Math.PI) / 500) * 100).toBeCloseTo(1.257, 3);
    expect(1.5e11 / (2 * Math.PI) / 1e9).toBeCloseTo(23.87, 2);
    expect(eFromB(2e-7)).toBeCloseTo(60, 6);
  });
});

describe('the rules', () => {
  it('B = k̂ × Ê: x travel with E along y has B along z, and so on', () => {
    expect(bDirection('+x', '+y')).toBe('+z');
    expect(bDirection('+z', '+x')).toBe('+y');
    expect(bDirection('+z', '+y')).toBe('-x');
    expect(bDirection('-x', '+y')).toBe('-z');
  });
  it('E × B along the travel direction for every combination', () => {
    const axes: Axis[] = ['+x', '-x', '+y', '-y', '+z', '-z'];
    for (const t of axes) for (const e of axes) if (t[1] !== e[1]) expect(bDirection(t, e)[1]).not.toBe(t[1]);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(2);
    }
  });
  it('level 1: both modes occur; the answer wins and E/B swapped loses', () => {
    const modes = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelMagnitude;
      modes.add(l.mode);
      expect(judgeMagnitude(l, l.answer).ok).toBe(true);
      expect(judgeMagnitude(l, l.answer * 3e8).ok).toBe(false);
    }
    expect(modes.size).toBe(2);
  });
  it('level 2: E, B and the travel direction are mutually perpendicular; the opposite direction loses', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelDirection;
      expect(l.b[1]).not.toBe(l.travel[1]);
      expect(l.b[1]).not.toBe(l.e[1]);
      expect(judgeDirection(l, l.b).ok).toBe(true);
      expect(judgeDirection(l, (l.b[0] === '+' ? '-' : '+') + l.b[1] as Axis).ok).toBe(false);
    }
  });
  it('level 3: two distinct frequencies; both wavelengths win; swapping loses', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelWavelength;
      expect(l.f1).not.toBe(l.f2);
      expect(judgeWavelength(l, l.l1, l.l2).ok).toBe(true);
      expect(judgeWavelength(l, l.l2, l.l1).ok).toBe(false);
    }
  });
  it('level 4: B₀, k and λ win; ω for k loses', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelQuantities;
      expect(judgeQuantities(l, l.b0Nano, l.k, l.lambda).ok).toBe(true);
      expect(judgeQuantities(l, l.b0Nano, 2 * Math.PI * l.fMHz * 1e6, l.lambda).kOk).toBe(false);
    }
  });
  it('level 5: λ, f and E₀ win, with ω = ck consistent', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelEquation;
      expect(l.omega11 * 1e11).toBeCloseTo(3e8 * l.k3 * 1e3, -3);
      expect(judgeEquation(l, l.lambdaCm, l.fGHz, l.e0).ok).toBe(true);
      expect(judgeEquation(l, l.lambdaCm, l.omega11 * 100, l.e0).fOk).toBe(false);
    }
  });
  it('level 6: λ, B₀ and the density win with "equal"; "E larger" loses', () => {
    for (const s of seeds) {
      const l = buildLevel(6, lcg(s)) as LevelEnergy;
      expect(judgeEnergy(l, l.lambdaCm, l.b0Nano, l.uNano, 'equal').ok).toBe(true);
      expect(judgeEnergy(l, l.lambdaCm, l.b0Nano, l.uNano, 'e-larger').eqOk).toBe(false);
      expect(l.uNano).toBeCloseTo(0.25 * EPS0 * l.e0 * l.e0 * 1e9, 0);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/c B₀|E\/c/, /transverse/, /λ = c\/f/, /k = 2π\/λ/, /Comparing with/, /equal energy|carry equal energy/];
    [1, 2, 3, 4, 5, 6].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
