import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  explainSolution,
  fmt,
  instantaneous,
  judgeBulb,
  judgeConvert,
  judgeCycle,
  judgeInstant,
  peakFromRms,
  rmsFromPeak,
  starsFor,
  type LevelBulb,
  type LevelConvert,
  type LevelCycle,
  type LevelInstant,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('a 100 W, 220 V bulb has R = 484 Ω, peak 311 V and I = 0.45 A (Example 7.1)', () => {
    expect(220 * 220 / 100).toBe(484);
    expect(peakFromRms(220)).toBeCloseTo(311, 0);
    expect(100 / 220).toBeCloseTo(0.4545, 3);
  });
  it('300 V peak is 212 V rms, and 10 A rms is 14.1 A peak (Exercise 7.2)', () => {
    expect(rmsFromPeak(300)).toBeCloseTo(212.1, 1);
    expect(peakFromRms(10)).toBeCloseTo(14.14, 2);
  });
  it('a 100 W resistor on 220 V consumes 100 W on average (Exercise 7.1)', () => {
    expect((220 * 220) / 484).toBeCloseTo(100, 6);
  });
});

describe('the rules', () => {
  it('the instantaneous voltage is the peak times the sine', () => {
    expect(instantaneous(100, 30)).toBeCloseTo(50, 9);
    expect(instantaneous(100, 150)).toBeCloseTo(50, 9);
    expect(instantaneous(100, 90)).toBeCloseTo(100, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: R, peak and rms current win; peak used as rms loses', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelBulb;
      expect(judgeBulb(l, l.r, l.vm, l.i).ok).toBe(true);
      expect(judgeBulb(l, (l.vm * l.vm) / l.p, l.vm, l.i).rOk).toBe(false);
    }
  });
  it('level 2: both conversions win; swapping the factors loses', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelConvert;
      expect(judgeConvert(l, l.vRms, l.iPeak).ok).toBe(true);
      expect(judgeConvert(l, l.vm * Math.SQRT2, l.iPeak).vOk).toBe(false);
      expect(judgeConvert(l, l.vRms, l.iRms / Math.SQRT2).iOk).toBe(false);
    }
  });
  it('level 3: average power is half the peak power; swapping them loses', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelCycle;
      expect(l.pAvg).toBeCloseTo(l.pPeak / 2, 9);
      expect(judgeCycle(l, l.i, l.pAvg, l.pPeak).ok).toBe(true);
      expect(judgeCycle(l, l.i, l.pPeak, l.pAvg).ok).toBe(false);
    }
  });
  it('level 4: the instantaneous voltage and "in phase" win', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelInstant;
      expect(judgeInstant(l, l.vNow, 'inphase').ok).toBe(true);
      expect(judgeInstant(l, l.vNow, 'lags').pOk).toBe(false);
      if (l.phase !== 45 && l.phase !== 135) expect(judgeInstant(l, l.v, "inphase").vOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/rated voltage is the rms/, /rms value/, /never negative/, /in phase/];
    [1, 2, 3, 4].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
