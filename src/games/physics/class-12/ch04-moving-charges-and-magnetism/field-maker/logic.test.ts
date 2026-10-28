import { describe, expect, it } from 'vitest';
import {
  arcCentreUT,
  axisUT,
  biotSavartNT,
  buildLevel,
  elementDirOut,
  explainSolution,
  fmt,
  judgeArc,
  judgeAxis,
  judgeConcentric,
  judgeElement,
  judgeLoop,
  loopCentreUT,
  loopDirOut,
  starsFor,
  type LevelArc,
  type LevelAxis,
  type LevelConcentric,
  type LevelElement,
  type LevelLoop,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('a 1 cm element carrying 10 A makes 40 nT at 0.5 m on the perpendicular (Example 4.4)', () => {
    expect(biotSavartNT(10, 1, 0.5, 90)).toBeCloseTo(40, 6);
  });
  it('100 turns of radius 8 cm and 0.4 A give about 3.1 × 10⁻⁴ T at the centre (Exercise 4.1)', () => {
    expect(loopCentreUT(100, 0.4, 8)).toBeCloseTo(314, 0);
  });
  it('100 turns of radius 10 cm and 1 A give about 6.3 × 10⁻⁴ T (Example 4.6)', () => {
    expect(loopCentreUT(100, 1, 10)).toBeCloseTo(628, 0);
  });
  it('a semicircle of radius 2.0 cm carrying 12 A gives about 1.9 × 10⁻⁴ T (Example 4.5)', () => {
    expect(arcCentreUT(0.5, 12, 2)).toBeCloseTo(188, 0);
  });
});

describe('the rules', () => {
  it('the element field falls as 1/r² and is zero along the line of the element', () => {
    expect(biotSavartNT(10, 1, 1, 90)).toBeCloseTo(biotSavartNT(10, 1, 0.5, 90) / 4, 9);
    expect(biotSavartNT(10, 1, 1, 0)).toBeCloseTo(0, 9);
  });
  it('the direction reverses with dl and with the side of the point', () => {
    expect(elementDirOut(true, true)).toBe(true);
    expect(elementDirOut(true, false)).toBe(false);
    expect(elementDirOut(false, true)).toBe(false);
    expect(elementDirOut(false, false)).toBe(true);
  });
  it('a clockwise current gives a field into the page', () => {
    expect(loopDirOut(true)).toBe(false);
    expect(loopDirOut(false)).toBe(true);
  });
  it('the axis field equals the centre field at x = 0 and falls as the distance grows, as 1/x³ far away', () => {
    expect(axisUT(50, 2, 10, 0)).toBeCloseTo(loopCentreUT(50, 2, 10), 9);
    expect(axisUT(50, 2, 10, 20)).toBeLessThan(axisUT(50, 2, 10, 10));
    expect(axisUT(1, 1, 1, 100) / axisUT(1, 1, 1, 200)).toBeCloseTo(8, 1);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: both directions occur; the field and direction win; the wrong direction loses', () => {
    const dirs = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelElement;
      dirs.add(l.out);
      expect(judgeElement(l, l.nt, l.out).ok).toBe(true);
      expect(judgeElement(l, l.nt, !l.out).dirOk).toBe(false);
      expect(judgeElement(l, l.nt * 1000, l.out).bOk).toBe(false);
    }
    expect(dirs.size).toBe(2);
  });
  it('level 2: both senses occur; the coil field and direction win', () => {
    const dirs = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelLoop;
      dirs.add(l.out);
      expect(judgeLoop(l, l.ut, l.out).ok).toBe(true);
      expect(judgeLoop(l, l.ut / l.n, l.out).bOk).toBe(l.n === 1);
      expect(judgeLoop(l, l.ut, !l.out).dirOk).toBe(false);
    }
    expect(dirs.size).toBe(2);
  });
  it('level 3: the arc is the fraction of the loop field; the full-loop value is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelArc;
      expect(l.ut).toBeCloseTo(l.frac * loopCentreUT(1, l.i, l.rCm), 9);
      expect(judgeArc(l, l.ut, l.out).ok).toBe(true);
      expect(judgeArc(l, loopCentreUT(1, l.i, l.rCm), l.out).bOk).toBe(false);
    }
  });
  it('level 4: the axis field is below the centre field, and the ratio matches', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelAxis;
      expect(l.ut).toBeLessThan(l.centreUt);
      expect(l.ratio).toBeCloseTo(l.ut / l.centreUt, 9);
      expect(judgeAxis(l, l.ut, l.ratio).ok).toBe(true);
      expect(judgeAxis(l, l.centreUt, l.ratio).bOk).toBe(false);
    }
  });
  it('level 5: same sense adds, opposite sense subtracts with a measurable net field', () => {
    const sames = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelConcentric;
      sames.add(l.same);
      const b1 = loopCentreUT(1, l.i1, l.r1Cm);
      const b2 = loopCentreUT(1, l.i2, l.r2Cm);
      expect(l.ut).toBeCloseTo(l.same ? b1 + b2 : Math.abs(b1 - b2), 9);
      if (l.same) expect(l.out).toBe(true);
      else expect(l.out).toBe(b1 > b2);
      expect(l.ut).toBeGreaterThan(0.1 * Math.max(b1, b2) - 1e-9);
      expect(judgeConcentric(l, l.ut, l.out).ok).toBe(true);
      if (!l.same) expect(judgeConcentric(l, b1 + b2, l.out).bOk).toBe(false);
    }
    expect(sames.size).toBe(2);
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/dl × r/, /μ₀NI\/2R/, /straight leads/, /\(R² \+ x²\)/, /Each loop gives/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
