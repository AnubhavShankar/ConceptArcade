import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  explainSolution,
  fmt,
  impedance,
  judgeCoil,
  judgeLCR,
  judgeRC,
  judgeVoltages,
  phaseDeg,
  starsFor,
  xcOf,
  xlOf,
  type LevelCoil,
  type LevelLCR,
  type LevelRC,
  type LevelVoltages,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('200 Ω with 15 µF on 220 V, 50 Hz: Z = 291.5 Ω and I = 0.755 A (Example 7.6)', () => {
    const z = impedance(200, 0, xcOf(15, 50));
    expect(z).toBeCloseTo(291.5, 0);
    expect(220 / z).toBeCloseTo(0.755, 2);
  });
  it('R = 3 Ω, X_L = 8 Ω, X_C = 4 Ω gives Z = 5 Ω and φ = 53.1°, inductive (Example 7.8)', () => {
    expect(impedance(3, 8, 4)).toBeCloseTo(5, 9);
    expect(phaseDeg(3, 8, 4)).toBeCloseTo(53.13, 2);
    expect(phaseDeg(3, 4, 8)).toBeCloseTo(-53.13, 2);
  });
  it('25.48 mH at 50 Hz is 8 Ω and 796 µF is 4 Ω', () => {
    expect(xlOf(25.48, 50)).toBeCloseTo(8, 1);
    expect(xcOf(796, 50)).toBeCloseTo(4, 1);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: Z, I and V_C win; R + X for Z loses; V_R + V_C exceeds the source', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelRC;
      expect(judgeRC(l, l.z, l.i, l.vc).ok).toBe(true);
      expect(judgeRC(l, l.r + l.xc, l.i, l.vc).zOk).toBe(false);
      expect(l.i * l.r + l.vc).toBeGreaterThan(l.v);
    }
  });
  it('level 2: both leads occur; impedance, phase and lead win; the wrong lead loses', () => {
    const leads = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelLCR;
      leads.add(l.lead);
      expect(judgeLCR(l, l.z, l.phase, l.lead).ok).toBe(true);
      expect(judgeLCR(l, l.z, l.phase, l.lead === 'lags' ? 'leads' : 'lags').lOk).toBe(false);
      expect(judgeLCR(l, l.r + l.xl + l.xc, l.phase, l.lead).zOk).toBe(false);
    }
    expect(leads.size).toBe(2);
  });
  it('level 3: the source voltage wins; the arithmetic sum loses', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelVoltages;
      expect(judgeVoltages(l, l.source).ok).toBe(true);
      expect(judgeVoltages(l, l.vr + l.vl + l.vc).ok).toBe(false);
    }
  });
  it('level 4: Z, I and pf win; the power factor is below 1', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelCoil;
      expect(l.pf).toBeLessThan(1);
      expect(judgeCoil(l, l.z, l.v / l.z, l.pf).ok).toBe(true);
      expect(judgeCoil(l, l.r + l.xl, l.v / l.z, l.pf).zOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/perpendicular phasors/, /tan φ/, /partly cancel/, /power factor/];
    [1, 2, 3, 4].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
