import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  concentricNanoHenry,
  energyDensity,
  energyMilliJ,
  explainSolution,
  fmt,
  judgeConcentric,
  judgeDensity,
  judgeMutual,
  judgeSelf,
  judgeSolenoid,
  solenoidMilliHenry,
  starsFor,
  type LevelConcentric,
  type LevelDensity,
  type LevelMutual,
  type LevelSelf,
  type LevelSolenoid,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('5.0 A to 0 in 0.1 s with an average emf of 200 V gives L = 4 H (Exercise 6.7)', () => {
    expect((200 * 0.1) / 5).toBe(4);
  });
  it('M = 1.5 H and a 20 A change gives a flux linkage change of 30 Wb (Exercise 6.8)', () => {
    expect(1.5 * 20).toBe(30);
  });
  it('two concentric single turns of 1 cm and 20 cm give about 1 nH (Example 6.8)', () => {
    expect(concentricNanoHenry(1, 1, 1, 20)).toBeCloseTo(0.99, 2);
  });
});

describe('the rules', () => {
  it('L is proportional to N² and the energy to I²', () => {
    expect(solenoidMilliHenry(1000, 5, 50) / solenoidMilliHenry(500, 5, 50)).toBeCloseTo(4, 9);
    expect(energyMilliJ(10, 2) / energyMilliJ(10, 1)).toBeCloseTo(4, 9);
  });
  it('the energy stored in a solenoid is the density times the volume', () => {
    const n = 1000;
    const a = 5;
    const l = 50;
    const i = 2;
    const mH = solenoidMilliHenry(n, a, l);
    const b = (4 * Math.PI * 1e-7 * (n / (l / 100)) * i);
    const vol = a * 1e-4 * (l / 100);
    expect(energyDensity(b) * vol * 1000).toBeCloseTo(energyMilliJ(mH, i), 6);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: both modes occur; the answer wins and a missing division by time loses', () => {
    const modes = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelSelf;
      modes.add(l.mode);
      expect(judgeSelf(l, l.answer).ok).toBe(true);
      expect(judgeSelf(l, l.answer * l.dt).ok).toBe(false);
    }
    expect(modes.size).toBe(2);
  });
  it('level 2: flux linkage change and emf win', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelMutual;
      expect(l.emf).toBeCloseTo(l.linkage / l.dt, 9);
      expect(judgeMutual(l, l.linkage, l.emf).ok).toBe(true);
      expect(judgeMutual(l, l.linkage, l.linkage).eOk).toBe(l.dt === 1);
    }
  });
  it('level 3: L and U win; U without the half loses', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelSolenoid;
      expect(l.mJ).toBeCloseTo(0.5 * l.mH * l.i * l.i, 9);
      expect(judgeSolenoid(l, l.mH, l.mJ).ok).toBe(true);
      expect(judgeSolenoid(l, l.mH, l.mJ * 2).uOk).toBe(false);
    }
  });
  it('level 4: the mutual inductance wins; the other coil\'s radius in place of r₁ loses', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelConcentric;
      expect(judgeConcentric(l, l.nH).ok).toBe(true);
      expect(judgeConcentric(l, concentricNanoHenry(l.n1, l.n2, l.r2, l.r1)).ok).toBe(false);
    }
  });
  it('level 5: density and energy win; the volume in cm³ unconverted loses', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelDensity;
      expect(l.mJ).toBeCloseTo(l.u * l.volCm3 * 1e-3, 6);
      expect(judgeDensity(l, l.u, l.mJ).ok).toBe(true);
      expect(judgeDensity(l, l.u, l.u * l.volCm3).eOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/opposes/, /flux linkage/, /½LI²/, /flux linkage/, /energy density|per unit volume/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
