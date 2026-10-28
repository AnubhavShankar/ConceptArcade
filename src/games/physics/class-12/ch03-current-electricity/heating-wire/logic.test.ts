import { describe, expect, it } from 'vitest';
import {
  alphaFromFixedPoints,
  buildLevel,
  explainSolution,
  fmt,
  hotAnswer,
  judgeBill,
  judgeHot,
  judgeRated,
  judgeThermo,
  judgeToaster,
  powerAt,
  resistanceAt,
  starsFor,
  temperatureFor,
  thermometerT,
  type LevelBill,
  type LevelHot,
  type LevelRated,
  type LevelThermo,
  type LevelToaster,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('75.3 Ω at 27 °C and 85.8 Ω steady gives about 847 °C (Example 3.3)', () => {
    expect(temperatureFor(75.3, 85.8, 1.7, 27)).toBeCloseTo(847, -1);
  });
  it('3.2 A falling to 2.8 A on 230 V gives about 867 °C (Exercise 3.6)', () => {
    expect(temperatureFor(230 / 3.2, 230 / 2.8, 1.7, 27)).toBeCloseTo(867, -1);
  });
  it('platinum: 5 Ω, 5.23 Ω and 5.795 Ω give about 345.65 °C (Example 3.4)', () => {
    expect(thermometerT(5, 5.23, 5.795)).toBeCloseTo(345.65, 1);
  });
  it('silver 2.1 Ω at 27.5 °C and 2.7 Ω at 100 °C: α ≈ 3.9 × 10⁻³ (Exercise 3.5), via the two-point formula', () => {
    expect((2.7 - 2.1) / (2.1 * (100 - 27.5))).toBeCloseTo(3.94e-3, 4);
  });
  it('alpha from the fixed points of platinum is 4.6 × 10⁻⁴', () => {
    expect(alphaFromFixedPoints(5, 5.23)).toBeCloseTo(0.46, 9);
  });
  it('R rises with T, and P = V²/R', () => {
    expect(resistanceAt(100, 1.7, 27, 127)).toBeCloseTo(101.7, 9);
    expect(powerAt(230, 52.9)).toBeCloseTo(1000, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(2);
    }
  });
  it('level 1: both modes occur; the right R₂ or T₂ wins, and the room temperature or R₁ loses', () => {
    const modes = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelHot;
      modes.add(l.mode);
      expect(judgeHot(l, hotAnswer(l)).ok).toBe(true);
      expect(judgeHot(l, l.mode === 'forward' ? l.r1 : l.t1).ok).toBe(false);
      if (l.mode === 'inverse') expect(hotAnswer(l)).toBeGreaterThan(l.t1);
    }
    expect(modes.size).toBe(2);
  });
  it('level 2: the element settles hotter than 700 °C, and the steady power is below the starting power', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelToaster;
      expect(l.tSteady).toBeGreaterThan(700);
      expect(l.pSteady).toBeLessThan(l.pStart);
      expect(judgeToaster(l, l.tSteady, l.pSteady).ok).toBe(true);
      expect(judgeToaster(l, l.t1, l.pSteady).tOk).toBe(false);
      expect(judgeToaster(l, l.tSteady, l.pStart).pOk).toBe(false);
    }
  });
  it('level 3: the bath temperature and α follow the fixed points; the temperature is the one that built Rt', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelThermo;
      expect(l.tBath).toBeCloseTo(Math.round(l.tBath / 50) * 50, 6);
      expect(l.rt).toBeGreaterThan(l.r0);
      expect(judgeThermo(l, l.tBath, l.alpha3).ok).toBe(true);
      expect(judgeThermo(l, l.tBath, l.alpha3 * 1000).aOk).toBe(false);
    }
  });
  it('level 4: R = V²/P and the power falls as V²', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelRated;
      expect(l.r).toBeCloseTo((l.vRated * l.vRated) / l.pRated, 9);
      expect(l.pNew).toBeLessThan(l.pRated);
      expect(l.pNew / l.pRated).toBeCloseTo((l.vNew / l.vRated) ** 2, 3);
      expect(judgeRated(l, l.r, l.pNew).ok).toBe(true);
      expect(judgeRated(l, l.r, l.pRated * (l.vNew / l.vRated)).pOk).toBe(false); // linear in V is wrong
    }
  });
  it('level 5: kWh and cost; watt-hours (÷1000 missing) is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelBill;
      expect(l.items.length).toBe(3);
      expect(l.cost).toBeCloseTo(l.kwh * l.rate, 9);
      expect(judgeBill(l, l.kwh, l.cost).ok).toBe(true);
      expect(judgeBill(l, l.kwh * 1000, l.cost).kOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/R₂/, /P = VI/, /α = /, /P = V²\/R/, /kWh/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
