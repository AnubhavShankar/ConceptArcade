import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  explainSolution,
  floatingGapMm,
  fmt,
  forceMicro,
  forcePerLength,
  judgeAmpere,
  judgeFloat,
  judgeLoop,
  judgePair,
  judgeThree,
  loopForceMilli,
  middleWireMicroPerM,
  starsFor,
  type LevelAmpere,
  type LevelFloat,
  type LevelLoop,
  type LevelPair,
  type LevelThree,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('8.0 A and 5.0 A, 4.0 cm apart, give 2.0 × 10⁻⁵ N on 10 cm of one wire (Exercise 4.7)', () => {
    expect(forceMicro(8, 5, 4, 10)).toBeCloseTo(20, 6);
  });
  it('1 A in two wires 1 m apart gives 2 × 10⁻⁷ N/m (the definition of the ampere)', () => {
    expect(forcePerLength(1, 1, 1)).toBeCloseTo(2e-7, 15);
  });
});

describe('the rules', () => {
  it('the force falls as 1/d and grows with each current', () => {
    expect(forcePerLength(5, 5, 0.2)).toBeCloseTo(forcePerLength(5, 5, 0.1) / 2, 15);
    expect(forcePerLength(10, 5, 0.1)).toBeCloseTo(2 * forcePerLength(5, 5, 0.1), 15);
  });
  it('the floating gap balances the weight: repulsion per metre equals λg', () => {
    const gap = floatingGapMm(100, 10, 2);
    expect(forcePerLength(100, 10, gap / 1000)).toBeCloseTo(0.002 * 9.8, 9);
  });
  it('symmetric outer wires cancel on the middle wire if they carry equal parallel currents', () => {
    expect(middleWireMicroPerM(3, 1, 5, 3, 1, 4)).toBeCloseTo(0, 9);
    expect(middleWireMicroPerM(3, 1, 5, 3, -1, 4)).toBeGreaterThan(0);
  });
  it('the loop is attracted when the near side current is parallel, and the far side counts less', () => {
    expect(loopForceMilli(20, 10, 10, 30, 5)).toBeGreaterThan(0);
    expect(loopForceMilli(20, 10, 10, 30, 5)).toBeLessThan(forcePerLength(20, 10, 0.05) * 0.3 * 1000);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: both cases occur; attract for parallel currents; the force and kind win', () => {
    const sames = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelPair;
      sames.add(l.same);
      expect(judgePair(l, l.micro, l.same).ok).toBe(true);
      expect(judgePair(l, l.micro, !l.same).kindOk).toBe(false);
      expect(judgePair(l, l.micro / 100, l.same).fOk).toBe(false);
    }
    expect(sames.size).toBe(2);
  });
  it('level 2: the right gap balances; a smaller gap rises and a larger gap falls', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelFloat;
      expect(l.gapMm).toBeGreaterThan(0.5);
      expect(l.gapMm).toBeLessThan(120);
      expect(judgeFloat(l, l.gapMm).verdict).toBe('balanced');
      expect(judgeFloat(l, l.gapMm * 0.5).verdict).toBe('rises');
      expect(judgeFloat(l, l.gapMm * 2).verdict).toBe('falls');
    }
  });
  it('level 3: the current and the force with doubled currents (×4) win', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelAmpere;
      expect(l.doubled).toBeCloseTo(4 * l.microPerM, 9);
      expect(judgeAmpere(l, l.i, l.doubled).ok).toBe(true);
      expect(judgeAmpere(l, l.i, l.microPerM * 2).dOk).toBe(false);
    }
  });
  it('level 4: both directions occur; never zero; the magnitude and direction win', () => {
    const dirs = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelThree;
      dirs.add(l.toLeft);
      expect(l.microPerM).toBeGreaterThan(0);
      expect(judgeThree(l, l.microPerM, l.toLeft).ok).toBe(true);
      expect(judgeThree(l, l.microPerM, !l.toLeft).dirOk).toBe(false);
      expect(l.toLeft).toBe(middleWireMicroPerM(l.i1, l.s1, l.i2, l.i3, l.s3, l.dCm) > 0);
    }
    expect(dirs.size).toBe(2);
  });
  it('level 5: both cases occur; the net force and direction win; the near side alone is a miss', () => {
    const kinds = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelLoop;
      kinds.add(l.attracted);
      expect(l.milli).toBeGreaterThan(0);
      expect(judgeLoop(l, l.milli, l.attracted).ok).toBe(true);
      expect(judgeLoop(l, l.milli, !l.attracted).dirOk).toBe(false);
      const nearOnly = forcePerLength(l.i1, l.i2, l.dCm / 100) * (l.bCm / 100) * 1000;
      expect(judgeLoop(l, nearOnly, l.attracted).fOk).toBe(false);
    }
    expect(kinds.size).toBe(2);
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/third law/, /λg/, /definition of the ampere/, /Each outer wire/, /near side/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
