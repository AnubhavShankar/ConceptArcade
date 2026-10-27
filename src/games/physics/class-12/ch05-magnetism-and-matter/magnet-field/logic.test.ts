import { describe, expect, it } from 'vitest';
import {
  axialUT,
  buildLevel,
  compensationCm,
  equatorialUT,
  explainSolution,
  fmt,
  judgeCompensate,
  judgeScale,
  judgeShort,
  netOnAxisUT,
  starsFor,
  type LevelCompensate,
  type LevelScale,
  type LevelShort,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('a short magnet of 0.48 J/T gives 9.6 × 10⁻⁵ T on the axis and 4.8 × 10⁻⁵ T on the equator at 10 cm (Exercise 5.7)', () => {
    expect(axialUT(0.48, 10)).toBeCloseTo(96, 6);
    expect(equatorialUT(0.48, 10)).toBeCloseTo(48, 6);
  });
});

describe('the rules', () => {
  it('both fields fall as 1/r³, and the axial field is twice the equatorial one', () => {
    expect(axialUT(1, 10) / axialUT(1, 20)).toBeCloseTo(8, 9);
    expect(equatorialUT(2, 30)).toBeCloseTo(axialUT(2, 30) / 2, 12);
  });
  it('at the compensation distance the net field on the axis is zero, and has the right sign either side', () => {
    const r = compensationCm(0.5, 30);
    expect(netOnAxisUT(0.5, r, 30)).toBeCloseTo(0, 6);
    expect(netOnAxisUT(0.5, r * 0.8, 30)).toBeGreaterThan(0);
    expect(netOnAxisUT(0.5, r * 1.2, 30)).toBeLessThan(0);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: the fields and directions win; wrong directions lose', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelShort;
      expect(judgeShort(l, l.axial, l.equatorial, 'along', 'against').ok).toBe(true);
      expect(judgeShort(l, l.axial, l.equatorial, 'against', 'against').adOk).toBe(false);
      expect(judgeShort(l, l.axial, l.equatorial, 'along', 'along').edOk).toBe(false);
      expect(judgeShort(l, l.equatorial, l.axial, 'along', 'against').ok).toBe(false);
    }
  });
  it('level 2: the null distance is within 40 cm, and the net field changes sign there', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelCompensate;
      expect(l.rCm).toBeGreaterThan(5);
      expect(l.rCm).toBeLessThan(40);
      expect(netOnAxisUT(l.m, l.rCm, l.bExt)).toBeCloseTo(0, 6);
      expect(judgeCompensate(l, l.rCm).ok).toBe(true);
      expect(judgeCompensate(l, l.rCm * 1.2).ok).toBe(false);
    }
  });
  it('level 3: the equatorial field at k r₁ is B₁/(2k³), whatever the moment', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelScale;
      expect(l.eqNew).toBeCloseTo(l.b1 / (2 * l.k ** 3), 12);
      expect(judgeScale(l, l.eqNew).ok).toBe(true);
      expect(judgeScale(l, l.b1 / (l.k ** 3)).ok).toBe(false); // forgetting the equatorial half
      expect(judgeScale(l, l.b1 / (2 * l.k)).ok).toBe(false); // wrong power
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/replaced by μ₀/, /r³ = 2/, /1\/r³|divided by/];
    [1, 2, 3].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
