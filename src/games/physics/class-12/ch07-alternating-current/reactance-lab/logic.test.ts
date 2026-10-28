import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  explainSolution,
  fmt,
  judgeCapacitor,
  judgeFrequency,
  judgeInductor,
  judgePower,
  leadOf,
  starsFor,
  xc,
  xl,
  type LevelCapacitor,
  type LevelFrequency,
  type LevelInductor,
  type LevelPower,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('44 mH on 220 V, 50 Hz: X_L = 13.8 Ω and I = 15.9 A (Exercise 7.3)', () => {
    expect(xl(44, 50)).toBeCloseTo(13.82, 2);
    expect(220 / xl(44, 50)).toBeCloseTo(15.9, 1);
  });
  it('60 µF on 110 V, 60 Hz: X_C = 44.2 Ω and I = 2.49 A (Exercise 7.4)', () => {
    expect(xc(60, 60)).toBeCloseTo(44.2, 1);
    expect(110 / xc(60, 60)).toBeCloseTo(2.49, 2);
  });
  it('25 mH on 220 V, 50 Hz gives X_L = 7.85 Ω (Example 7.2)', () => {
    expect(xl(25, 50)).toBeCloseTo(7.85, 2);
  });
});

describe('the rules', () => {
  it('X_L is proportional to f, X_C to 1/f', () => {
    expect(xl(10, 100) / xl(10, 50)).toBeCloseTo(2, 9);
    expect(xc(10, 100) / xc(10, 50)).toBeCloseTo(0.5, 9);
  });
  it('the inductor current lags, the capacitor current leads', () => {
    expect(leadOf('inductor')).toBe('lags');
    expect(leadOf('capacitor')).toBe('leads');
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: reactance and current win; using ω = f loses', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelInductor;
      expect(judgeInductor(l, l.x, l.i).ok).toBe(true);
      expect(judgeInductor(l, l.x / (2 * Math.PI), l.i).xOk).toBe(false);
    }
  });
  it('level 2: reactance and current win; the inductor formula loses', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelCapacitor;
      expect(judgeCapacitor(l, l.x, l.i).ok).toBe(true);
      expect(judgeCapacitor(l, 2 * Math.PI * l.hz * l.cMicroF * 1e-6, l.i).xOk).toBe(false);
    }
  });
  it('level 3: both elements occur, and the lamp brightens whenever X falls', () => {
    const els = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelFrequency;
      els.add(l.element);
      expect(l.glow).toBe(l.x2 < l.x1 ? 'brighter' : 'dimmer');
      expect(judgeFrequency(l, l.x2, l.glow).ok).toBe(true);
      expect(judgeFrequency(l, l.x2, l.glow === 'brighter' ? 'dimmer' : 'brighter').gOk).toBe(false);
    }
    expect(els.size).toBe(2);
  });
  it('level 4: zero power and the right lead win; both elements occur', () => {
    const els = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelPower;
      els.add(l.element);
      expect(judgePower(l, 0, l.lead).ok).toBe(true);
      expect(judgePower(l, l.v * l.i, l.lead).pOk).toBe(false);
      expect(judgePower(l, 0, l.lead === 'lags' ? 'leads' : 'lags').lOk).toBe(false);
    }
    expect(els.size).toBe(2);
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/X_L = ωL/, /X_C = 1\/ωC/, /reactance/, /cos φ/];
    [1, 2, 3, 4].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
