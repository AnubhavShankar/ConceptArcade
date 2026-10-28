import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  explainSolution,
  f0,
  fmt,
  judgeAt,
  judgeNatural,
  judgeQ,
  judgeTune,
  judgeVolts,
  omega0,
  qFactor,
  starsFor,
  tuneMicroF,
  type LevelAt,
  type LevelNatural,
  type LevelQ,
  type LevelTune,
  type LevelVolts,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('30 µF with 27 mH oscillates at 1.11 × 10³ rad/s (Exercise 7.6)', () => {
    expect(omega0(0.027, 30)).toBeCloseTo(1111, 0);
  });
  it('R = 20 Ω, L = 1.5 H, C = 35 µF on 200 V: 138 rad/s, 10 A and 2000 W at resonance (Exercise 7.7)', () => {
    expect(omega0(1.5, 35)).toBeCloseTo(138, 0);
    expect(200 / 20).toBe(10);
    expect((200 * 200) / 20).toBe(2000);
  });
  it('L = 5 H, C = 80 µF resonates at 50 rad/s, 7.96 Hz (Exercise 7.8)', () => {
    expect(omega0(5, 80)).toBeCloseTo(50, 6);
    expect(f0(5, 80)).toBeCloseTo(7.96, 2);
  });
  it('25.48 mH and 796 µF resonate at about 222 rad/s, 35.4 Hz (Example 7.9)', () => {
    expect(omega0(0.02548, 796)).toBeCloseTo(222, 0);
    expect(f0(0.02548, 796)).toBeCloseTo(35.3, 0);
  });
});

describe('the rules', () => {
  it('tuning inverts resonance', () => {
    expect(f0(0.1, tuneMicroF(0.1, 1000))).toBeCloseTo(1000, 6);
  });
  it('Q = ω₀L/R = (1/R)√(L/C)', () => {
    expect(qFactor(1, 10, 10)).toBeCloseTo((1 / 10) * Math.sqrt(1 / 10e-6), 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: ω₀ and f₀ win; ω given as f loses', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelNatural;
      expect(judgeNatural(l, l.omega, l.hz).ok).toBe(true);
      expect(judgeNatural(l, l.hz, l.hz).wOk).toBe(false);
    }
  });
  it('level 2: Z = R, I = V/R and P = V²/R win', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelAt;
      expect(judgeAt(l, l.r, l.v / l.r, (l.v * l.v) / l.r).ok).toBe(true);
      expect(judgeAt(l, l.r, l.v / l.r, l.v * l.v / l.r / 2).pOk).toBe(false);
    }
  });
  it('level 3: V_L is larger than the source, and the LC drop is zero', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelVolts;
      expect(judgeVolts(l, l.vl, 0).ok).toBe(true);
      expect(judgeVolts(l, l.vl, l.vl).cOk).toBe(false);
      expect(l.vl).toBeGreaterThan(l.v);
    }
  });
  it('level 4: Q and V_C = QV win; Q above 1 for every instance', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelQ;
      expect(l.q).toBeGreaterThan(1);
      expect(judgeQ(l, l.q, l.vc).ok).toBe(true);
      expect(judgeQ(l, l.q, l.v).vOk).toBe(false);
    }
  });
  it('level 5: the tuning capacitance and the √2 shift win', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelTune;
      expect(f0(l.l, l.cMicroF)).toBeCloseTo(l.hz, 6);
      expect(judgeTune(l, l.cMicroF, l.newHz).ok).toBe(true);
      expect(judgeTune(l, l.cMicroF, l.hz / 2).fOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/natural frequency/, /Z = R/, /zero/, /Q V/, /1\.414|√2/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
