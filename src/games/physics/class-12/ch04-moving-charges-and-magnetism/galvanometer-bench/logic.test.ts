import { describe, expect, it } from 'vitest';
import {
  ammeterMilliOhm,
  buildLevel,
  explainSolution,
  fmt,
  fullScaleMicroA,
  judgeAmmeter,
  judgeDeflect,
  judgeRatio,
  judgeTurns,
  judgeVoltmeter,
  readingA,
  sensitivityDegPerMicroA,
  seriesKiloOhm,
  shuntMilliOhm,
  starsFor,
  voltmeterKiloOhm,
  type LevelAmmeter,
  type LevelDeflect,
  type LevelRatio,
  type LevelTurns,
  type LevelVoltmeter,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('M2 and M1 of Exercise 4.10: current sensitivity ratio 1.4 and voltage sensitivity ratio 1', () => {
    const cur = (42 * 1.8e-3 * 0.5) / (30 * 3.6e-3 * 0.25);
    expect(cur).toBeCloseTo(1.4, 9);
    expect(cur / (14 / 10)).toBeCloseTo(1, 9);
  });
  it('a 60 Ω galvanometer with a 0.02 Ω shunt reads about 0.99 A in the 3 V, 3 Ω circuit (Example 4.12)', () => {
    const rA = ammeterMilliOhm(60, 20);
    expect(rA).toBeCloseTo(20, 0);
    expect(readingA(3, 3, rA)).toBeCloseTo(0.993, 2);
    expect(readingA(3, 3, 60 * 1000)).toBeCloseTo(0.0476, 3);
  });
});

describe('the rules', () => {
  it('the shunt and the coil have the same voltage across them at full range', () => {
    const rs = shuntMilliOhm(60, 2, 5);
    const iShunt = 5 - 0.002;
    expect(iShunt * (rs / 1000)).toBeCloseTo(0.002 * 60, 9);
  });
  it('the series resistor and the coil give the full range at full-scale current', () => {
    const r = seriesKiloOhm(100, 2, 10);
    expect((r * 1000 + 100) * 0.002).toBeCloseTo(10, 9);
    expect(voltmeterKiloOhm(2, 10)).toBeCloseTo(5, 9);
  });
  it('full-scale current times the sensitivity is the full-scale deflection', () => {
    const s = sensitivityDegPerMicroA(100, 20, 0.2, 2);
    expect(fullScaleMicroA(100, 20, 0.2, 2, 45) * s).toBeCloseTo(45, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: sensitivity and full-scale current win; confusing µA with A loses', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelDeflect;
      expect(judgeDeflect(l, l.sens, l.fullMicro).ok).toBe(true);
      expect(judgeDeflect(l, l.sens, l.fullMicro * 1e6).fOk).toBe(false);
      expect(l.fullMicro).toBeGreaterThan(0.1);
    }
  });
  it('level 2: the shunt is small, the reading differs visibly from the ideal, and the bare galvanometer reads far too little', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelAmmeter;
      expect(l.shunt).toBeLessThan(1000);
      expect(l.reading).toBeLessThanOrEqual(0.975);
      expect(l.bareReading).toBeLessThan(0.2);
      expect(judgeAmmeter(l, l.shunt, l.reading).ok).toBe(true);
      expect(judgeAmmeter(l, l.shunt, 1).rOk).toBe(false);
    }
  });
  it('level 3: the series resistance is below the total, and both win', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelVoltmeter;
      expect(l.series).toBeLessThan(l.total);
      expect(l.series).toBeGreaterThan(0);
      expect(judgeVoltmeter(l, l.series, l.total).ok).toBe(true);
      if ((l.total - l.series) / l.series > 0.05) expect(judgeVoltmeter(l, l.total, l.total).sOk).toBe(false);
    }
  });
  it('level 4: the current ratio is NAB and the voltage ratio divides by R; swapping them loses unless R is unchanged', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelRatio;
      const cur = (l.m2.n * l.m2.a * l.m2.b) / (l.m1.n * l.m1.a * l.m1.b);
      expect(l.current).toBeCloseTo(cur, 9);
      expect(l.voltage).toBeCloseTo(cur / (l.m2.r / l.m1.r), 9);
      expect(judgeRatio(l, l.current, l.voltage).ok).toBe(true);
      if (Math.abs(l.current - l.voltage) / l.current > 0.05) expect(judgeRatio(l, l.voltage, l.current).ok).toBe(false);
    }
  });
  it('level 5: the current sensitivity scales with the turns and the voltage sensitivity does not', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelTurns;
      expect(l.newI).toBeCloseTo(l.k * l.sensI, 9);
      expect(l.newV).toBeCloseTo(l.sensV, 9);
      expect(judgeTurns(l, l.newI, l.newV).ok).toBe(true);
      expect(judgeTurns(l, l.newI, l.newV * l.k).vOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/kθ = NIAB/, /shunt/, /series resistor|series resistance/, /NAB\/R/, /voltage sensitivity stays/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
