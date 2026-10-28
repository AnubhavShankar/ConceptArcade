import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  currentFromCount,
  currentFromDrift,
  driftFromMobility,
  driftHours,
  driftSpeedMmS,
  explainSolution,
  fmt,
  judgeCount,
  judgeDrift,
  judgeMobility,
  judgeScale,
  signalNs,
  starsFor,
  type LevelCount,
  type LevelDrift,
  type LevelMobility,
  type LevelScale,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('3.75 × 10¹⁸ electrons in 2 s is 0.3 A', () => {
    expect(currentFromCount(3.75, 2)).toBeCloseTo(0.3, 9);
  });
  it('3 A through 2 mm² of copper drifts at about 0.11 mm/s and needs about 7.5 h for 3 m (Exercise 3.9)', () => {
    const vd = driftSpeedMmS(3, 2);
    expect(vd).toBeCloseTo(0.1103, 3);
    expect(driftHours(3, vd)).toBeCloseTo(7.55, 1);
  });
  it('1.5 A through 0.1 mm² of copper drifts at 1.1 mm/s (Example 3.1)', () => {
    expect(driftSpeedMmS(1.5, 0.1)).toBeCloseTo(1.1, 1);
  });
  it('the signal takes 10 ns to cross 3 m', () => {
    expect(signalNs(3)).toBeCloseTo(10, 9);
  });
});

describe('the rules', () => {
  it('drift speed is inversely proportional to the area and proportional to the current', () => {
    expect(driftSpeedMmS(3, 1)).toBeCloseTo(2 * driftSpeedMmS(3, 2), 9);
    expect(driftSpeedMmS(6, 2)).toBeCloseTo(2 * driftSpeedMmS(3, 2), 9);
  });
  it('mobility and the current are consistent: I = n e A μ E', () => {
    const vd = driftFromMobility(4, 0.05, 2);
    expect(vd).toBeCloseTo(4e-3 * 0.025 * 1000, 9);
    expect(currentFromDrift(driftSpeedMmS(2, 1), 1)).toBeCloseTo(2, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: both flow directions occur; the current and the opposite-to-electrons direction win', () => {
    const dirs = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelCount;
      dirs.add(l.electronsRight);
      expect(judgeCount(l, l.i, !l.electronsRight).ok).toBe(true);
      expect(judgeCount(l, l.i, l.electronsRight).dirOk).toBe(false); // the electrons' direction is the wrong convention
      expect(judgeCount(l, l.i * 2, !l.electronsRight).iOk).toBe(false);
    }
    expect(dirs.size).toBe(2);
  });
  it('level 2: the drift speed is tiny and the crossing takes hours; the speed in m/s is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelDrift;
      expect(l.vd).toBeLessThan(1);
      expect(l.hours).toBeGreaterThan(0.3);
      expect(judgeDrift(l, l.vd, l.hours).ok).toBe(true);
      expect(judgeDrift(l, l.vd / 1000, l.hours).vdOk).toBe(false);
      expect(judgeDrift(l, l.vd, l.hours * 3600).hoursOk).toBe(false);
    }
  });
  it('level 3: thinner wire drifts faster, thicker slower; the signal is far faster than the drift', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelScale;
      expect(l.a1).not.toBe(l.a2);
      expect(l.vd2 / l.vd1).toBeCloseTo(l.a1 / l.a2, 9);
      expect(judgeScale(l, l.vd2, l.ns).ok).toBe(true);
      expect(judgeScale(l, l.vd1, l.ns).vdOk).toBe(false);
      expect(l.ns / 1e9).toBeLessThan(1e-6);
    }
  });
  it('level 4: v_d = μE and I = n e A v_d', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelMobility;
      expect(l.field).toBeCloseTo(l.v / l.lenM, 9);
      expect(l.i).toBeCloseTo(8.5e28 * 1.6e-19 * l.aMm2 * 1e-6 * (l.vd / 1000), 6);
      expect(judgeMobility(l, l.vd, l.i).ok).toBe(true);
      expect(judgeMobility(l, l.vd * 1000, l.i).vdOk).toBe(false);
      expect(l.i).toBeLessThan(10); // a believable current
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(9, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/opposite way/, /I = n e A v_d/, /speed of light/, /Mobility/];
    [1, 2, 3, 4].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
    expect(fmt(0.0001)).toBe('1 × 10⁻⁴');
  });
});
