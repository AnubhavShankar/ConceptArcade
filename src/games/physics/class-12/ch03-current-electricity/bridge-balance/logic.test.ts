import { describe, expect, it } from 'vitest';
import {
  balanced,
  bridge,
  buildLevel,
  explainSolution,
  fmt,
  judgeCurrent,
  judgeMeter,
  judgeNull,
  meterDeflection,
  starsFor,
  type LevelCurrent,
  type LevelMeter,
  type LevelNull,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('AB = 100, BC = 10, CD = 5, DA = 60 with a 15 Ω galvanometer and 10 V: about 4.87 mA (Example 3.7)', () => {
    // arms: A to B = 100, B to C = 10, A to D = 60, D to C = 5
    const res = bridge(100, 10, 60, 5, 15, 10);
    expect(Math.abs(res.ig) * 1000).toBeCloseTo(4.87, 1);
  });
});

describe('the rules', () => {
  it('a balanced bridge carries no galvanometer current, whatever G and V are', () => {
    for (const [g, v] of [[10, 5], [100, 12], [1, 3]]) {
      expect(bridge(10, 20, 30, 60, g, v).ig).toBeCloseTo(0, 12);
    }
    expect(balanced(10, 20, 30, 60)).toBe(true);
    expect(balanced(10, 20, 30, 50)).toBe(false);
  });
  it('making S bigger than the balance value reverses the galvanometer current', () => {
    const a = bridge(10, 20, 30, 50, 15, 10).ig;
    const b = bridge(10, 20, 30, 80, 15, 10).ig;
    expect(Math.sign(a)).toBe(-Math.sign(b));
  });
  it('the meter-bridge deflection is zero at the balance point and changes sign through it', () => {
    expect(meterDeflection(30, 20, 60)).toBeCloseTo(0, 9);
    expect(meterDeflection(30, 20, 50) * meterDeflection(30, 20, 70)).toBeLessThan(0);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: the rheostat balance is on the 5 Ω grid, and at it the galvanometer reads zero', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelNull;
      expect(l.rStar % 5).toBe(0);
      expect(l.rStar).toBeGreaterThanOrEqual(5);
      expect(l.rStar).toBeLessThanOrEqual(250);
      expect(bridge(l.p, l.q, l.rStar, l.x, l.g, l.v).ig).toBeCloseTo(0, 12);
      expect(Math.abs(bridge(l.p, l.q, l.rStar + 5, l.x, l.g, l.v).ig)).toBeGreaterThan(1e-4);
      expect(judgeNull(l, l.x).ok).toBe(true);
      expect(judgeNull(l, l.rStar).ok).toBe(l.rStar === l.x);
    }
  });
  it('level 2: unbalanced with a measurable current in both directions; magnitude and direction win', () => {
    const dirs = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelCurrent;
      dirs.add(l.bToD);
      expect(l.igMilli).toBeGreaterThanOrEqual(0.5);
      expect(balanced(l.p, l.q, l.r, l.s)).toBe(false);
      expect(judgeCurrent(l, l.igMilli, l.bToD).ok).toBe(true);
      expect(judgeCurrent(l, l.igMilli, !l.bToD).dirOk).toBe(false);
      expect(judgeCurrent(l, l.igMilli / 1000, l.bToD).igOk).toBe(false); // amperes instead of mA
    }
    expect(dirs.size).toBe(2);
  });
  it('level 3: X/R = l/(100 − l), and the swapped balance length is 100 − l', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelMeter;
      expect(l.x / l.r).toBeCloseTo(l.l / (100 - l.l), 9);
      expect(l.swapped).toBe(100 - l.l);
      expect(meterDeflection(l.x, l.r, l.l)).toBeCloseTo(0, 9);
      expect(judgeMeter(l, l.x, l.swapped).ok).toBe(true);
      expect(judgeMeter(l, l.x, l.l).sOk).toBe(l.l === 50);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/P\/Q = R\/X/, /junction rule/, /X\/R = l/];
    [1, 2, 3].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
