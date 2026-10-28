import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  emfAt,
  explainSolution,
  fmt,
  judgePeak,
  judgeRpm,
  judgeScale,
  omegaFromHz,
  omegaFromRpm,
  peakEmf,
  starsFor,
  type LevelPeak,
  type LevelRpm,
  type LevelScale,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('100 turns, 0.10 m², half a revolution per second and 0.01 T give about 0.31 V peak (Example 6.10)', () => {
    expect(peakEmf(100, 0.01, 1000, omegaFromHz(0.5))).toBeCloseTo(0.314, 3);
  });
});

describe('the rules', () => {
  it('the emf is zero at 0° and 180° and peaks at 90°', () => {
    expect(emfAt(10, 0)).toBeCloseTo(0, 9);
    expect(emfAt(10, 90)).toBeCloseTo(10, 9);
    expect(emfAt(10, 180)).toBeCloseTo(0, 9);
  });
  it('60 rev/min is 2π rad/s', () => {
    expect(omegaFromRpm(60)).toBeCloseTo(2 * Math.PI, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: peak and instantaneous emf win; the peak given as the instantaneous value loses', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelPeak;
      expect(judgePeak(l, l.peak, l.inst).ok).toBe(true);
      expect(judgePeak(l, l.peak, l.peak).iOk).toBe(false);
      expect(judgePeak(l, l.peak / (2 * Math.PI), l.inst).pOk).toBe(false);
    }
  });
  it('level 2: peak and quarter-turn time win; the period instead of a quarter loses', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelRpm;
      expect(l.quarterMs).toBeCloseTo(15000 / l.rpm, 9);
      expect(judgeRpm(l, l.peak, l.quarterMs).ok).toBe(true);
      expect(judgeRpm(l, l.peak, l.quarterMs * 4).tOk).toBe(false);
    }
  });
  it('level 3: the factors multiply; adding them loses', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelScale;
      expect(l.newPeak).toBeCloseTo(l.peak * l.nFactor * l.speedFactor * l.bFactor, 9);
      expect(judgeScale(l, l.newPeak).ok).toBe(true);
      const added = l.peak * (l.nFactor + l.speedFactor + l.bFactor);
      if (Math.abs(added - l.newPeak) / l.newPeak > 0.05) expect(judgeScale(l, added).ok).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/NBAω/, /T\/4/, /proportional/];
    [1, 2, 3].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
