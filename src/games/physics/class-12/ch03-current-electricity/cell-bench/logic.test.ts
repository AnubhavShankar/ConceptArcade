import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  chargingV,
  explainSolution,
  fmt,
  judgeCharge,
  judgeLoad,
  judgeMeasure,
  judgeParallel,
  judgeSeries,
  loadCurrent,
  parallelCells,
  reading,
  seriesAiding,
  seriesOpposing,
  starsFor,
  terminalV,
  type LevelCharge,
  type LevelLoad,
  type LevelMeasure,
  type LevelParallel,
  type LevelSeries,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('a 12 V, 0.4 Ω battery can give at most 30 A (Exercise 3.1)', () => {
    expect(12 / 0.4).toBeCloseTo(30, 9);
  });
  it('10 V, 3 Ω and 0.5 A: R = 17 Ω and V = 8.5 V (Exercise 3.2)', () => {
    expect(10 / 0.5 - 3).toBe(17);
    expect(terminalV(10, 3, 0.5)).toBeCloseTo(8.5, 9);
  });
  it('charging an 8 V, 0.5 Ω battery from 120 V through 15.5 Ω: 7 A and 11.5 V (Exercise 3.8)', () => {
    const i = (120 - 8) / (15.5 + 0.5);
    expect(i).toBe(7);
    expect(chargingV(8, 0.5, i)).toBeCloseTo(11.5, 9);
  });
});

describe('the rules', () => {
  it('terminal voltage is below the emf on discharge, above it on charge, and equal at zero current', () => {
    expect(terminalV(10, 2, 1)).toBeLessThan(10);
    expect(chargingV(10, 2, 1)).toBeGreaterThan(10);
    expect(terminalV(10, 2, 0)).toBe(10);
  });
  it('series: emfs add or subtract, resistances add', () => {
    expect(seriesAiding(2, 0.5, 3, 1)).toEqual({ e: 5, r: 1.5 });
    expect(seriesOpposing(3, 0.5, 2, 1)).toEqual({ e: 1, r: 1.5 });
  });
  it('parallel: identical cells give the same emf and half the resistance', () => {
    const p = parallelCells(2, 1, 2, 1);
    expect(p.e).toBeCloseTo(2, 9);
    expect(p.r).toBeCloseTo(0.5, 9);
  });
  it('parallel emf lies between the two emfs, and r is below the smaller r', () => {
    for (const [e1, r1, e2, r2] of [[2, 1, 6, 2], [3, 3, 4, 1]]) {
      const p = parallelCells(e1, r1, e2, r2);
      expect(p.e).toBeGreaterThan(Math.min(e1, e2));
      expect(p.e).toBeLessThan(Math.max(e1, e2));
      expect(p.r).toBeLessThan(Math.min(r1, r2));
    }
  });
  it('meter readings keep five significant figures', () => {
    expect(reading(11.538461)).toBe('11.538');
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(2);
    }
  });
  it('level 1: both modes occur; the emf is never the terminal voltage', () => {
    const modes = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelLoad;
      modes.add(l.mode);
      const first = l.mode === 'current' ? l.i : l.load;
      expect(judgeLoad(l, first, l.v).ok).toBe(true);
      expect(judgeLoad(l, first, l.e).vOk).toBe(false);
      expect(l.v).toBeCloseTo(l.i * l.load, 9);
      expect(l.i).toBeCloseTo(loadCurrent(l.e, l.r, l.load), 9);
    }
    expect(modes.size).toBe(2);
  });
  it('level 2: r and the short-circuit current; the current for a real load is not the maximum', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelMeasure;
      expect(judgeMeasure(l, l.r, l.iMax).ok).toBe(true);
      expect(judgeMeasure(l, l.r, l.e / (10 + l.r)).iOk).toBe(false);
      // r is recoverable from any displayed reading
      const i = loadCurrent(l.e, l.r, 7);
      const v = terminalV(l.e, l.r, i);
      expect((l.e - Number(reading(v))) / Number(reading(i))).toBeCloseTo(l.r, 2);
    }
  });
  it('level 3: charging current, terminal voltage above the emf, and only "limit" is the reason', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelCharge;
      expect(l.v).toBeGreaterThan(l.e);
      expect(judgeCharge(l, l.i, l.v, 'limit').ok).toBe(true);
      expect(judgeCharge(l, l.i, l.v, 'raise').whyOk).toBe(false);
      expect(judgeCharge(l, l.i, l.v, 'reverse').whyOk).toBe(false);
      expect(judgeCharge(l, l.i, l.e - l.i * l.r, 'limit').vOk).toBe(false); // the discharge formula is wrong here
    }
  });
  it('level 4: both orientations occur; the emfs add or subtract, resistances always add, and emf stays positive', () => {
    const o = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelSeries;
      o.add(l.aiding);
      expect(l.e).toBeGreaterThan(0);
      expect(l.r).toBeCloseTo(l.r1 + l.r2, 9);
      expect(judgeSeries(l, l.e, l.r).ok).toBe(true);
      expect(judgeSeries(l, l.aiding ? l.e1 - l.e2 : l.e1 + l.e2, l.r).eOk).toBe(false);
    }
    expect(o.size).toBe(2);
  });
  it('level 5: the parallel emf is between the cells, and the current uses the combined r', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelParallel;
      expect(l.e1).not.toBe(l.e2);
      expect(l.e).toBeGreaterThan(Math.min(l.e1, l.e2));
      expect(l.e).toBeLessThan(Math.max(l.e1, l.e2));
      expect(judgeParallel(l, l.e, l.i).ok).toBe(true);
      const avg = (l.e1 + l.e2) / 2;
      expect(judgeParallel(l, avg, l.i).eOk).toBe(Math.abs(avg - l.e) / l.e <= 0.03);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/ε/, /short-circuited/, /series resistor limits/, /internal resistances/, /ε₁r₂/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
