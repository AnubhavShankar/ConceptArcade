import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  explainSolution,
  fmt,
  higherEnd,
  judgeLeave,
  judgeRod,
  judgeWheel,
  judgeWire,
  motionalEmf,
  rotatingEmf,
  starsFor,
  type LevelLeave,
  type LevelRod,
  type LevelWheel,
  type LevelWire,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('a 10 m wire falling at 5 m/s in 0.30 × 10⁻⁴ T gives 1.5 mV (Exercise 6.6)', () => {
    expect(motionalEmf(0.3e-4, 10, 5) * 1000).toBeCloseTo(1.5, 9);
  });
  it('0.3 T, an 8 cm edge and 1 cm/s give 240 µV, lasting 2 s; the 2 cm edge gives 60 µV for 8 s (Exercise 6.4)', () => {
    expect(motionalEmf(0.3, 0.08, 0.01) * 1e6).toBeCloseTo(240, 6);
    expect(motionalEmf(0.3, 0.02, 0.01) * 1e6).toBeCloseTo(60, 6);
  });
  it('a 1 m rod at 400 rad/s in 0.5 T gives 100 V (Exercise 6.5), and at 50 rev/s in 1 T about 157 V (Example 6.6)', () => {
    expect(rotatingEmf(0.5, 400, 1)).toBeCloseTo(100, 9);
    expect(rotatingEmf(1, 2 * Math.PI * 50, 1)).toBeCloseTo(157.1, 1);
  });
  it('the 10-spoke wheel of Example 6.7 gives about 63 µV', () => {
    expect(rotatingEmf(0.4e-4, (2 * Math.PI * 120) / 60, 0.5) * 1e6).toBeCloseTo(62.8, 1);
  });
});

describe('the rules', () => {
  it('the positive end flips when the wire rises instead of falls', () => {
    expect(higherEnd(true)).toBe('east');
    expect(higherEnd(false)).toBe('west');
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: both motions occur; the emf and the end win; the other end loses', () => {
    const falls = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelWire;
      falls.add(l.falling);
      expect(judgeWire(l, l.milliV, l.end).ok).toBe(true);
      expect(judgeWire(l, l.milliV, l.end === 'east' ? 'west' : 'east').endOk).toBe(false);
      expect(judgeWire(l, l.milliV * 1000, l.end).eOk).toBe(false);
    }
    expect(falls.size).toBe(2);
  });
  it('level 2: both orientations occur; emf and time win; using the other side loses', () => {
    const o = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelLeave;
      o.add(l.normalToLong);
      expect(judgeLeave(l, l.microV, l.seconds).ok).toBe(true);
      const wrongCut = l.normalToLong ? l.shortCm : l.longCm;
      expect(judgeLeave(l, motionalEmf(l.b, wrongCut / 100, l.vCm / 100) * 1e6, l.seconds).eOk).toBe(false);
    }
    expect(o.size).toBe(2);
  });
  it('level 3: both units occur; the emf wins; revolutions used as radians lose', () => {
    const units = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelRod;
      units.add(l.unit);
      expect(judgeRod(l, l.volts).ok).toBe(true);
      if (l.unit === 'rev/s') expect(judgeRod(l, rotatingEmf(l.b, l.rate, l.lM)).ok).toBe(false);
    }
    expect(units.size).toBe(2);
  });
  it('level 4: the wheel emf wins; multiplying by the number of spokes loses', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelWheel;
      expect(judgeWheel(l, l.microV).ok).toBe(true);
      expect(judgeWheel(l, l.microV * l.spokes).ok).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/q v × B/, /parallel to the boundary/, /½Bωl²/, /do not add/];
    [1, 2, 3, 4].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
