import { describe, expect, it } from 'vitest';
import {
  avgPower,
  buildLevel,
  correctingMicroF,
  explainSolution,
  fmt,
  judgeCircuit,
  judgeCorrect,
  judgeLoss,
  judgePhase,
  judgeTransformer,
  starsFor,
  wattless,
  type LevelCircuit,
  type LevelCorrect,
  type LevelLoss,
  type LevelPhase,
  type LevelTransformer,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('R = 3 Ω, X_L = 8 Ω, X_C = 4 Ω, peak 283 V: I = 40 A, P = 4.8 kW, power factor 0.6 (Example 7.8)', () => {
    const z = 5;
    const i = 283 / Math.SQRT2 / z;
    expect(i).toBeCloseTo(40, 0);
    expect(i * i * 3).toBeCloseTo(4800, -2);
    expect(3 / z).toBeCloseTo(0.6, 9);
  });
});

describe('the rules', () => {
  it('power is zero at φ = 90° and V I at φ = 0', () => {
    expect(avgPower(100, 2, 90)).toBeCloseTo(0, 9);
    expect(avgPower(100, 2, 0)).toBeCloseTo(200, 9);
    expect(wattless(2, 90)).toBeCloseTo(2, 9);
  });
  it('the parallel capacitor cancels the wattless current exactly', () => {
    const r = 30;
    const xl = 40;
    const v = 220;
    const hz = 50;
    const c = correctingMicroF(r, xl, hz);
    const iq = (v * xl) / (r * r + xl * xl);
    const ic = 2 * Math.PI * hz * c * 1e-6 * v;
    expect(ic).toBeCloseTo(iq, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: P and the wattless current win; using I for the wattless part loses', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelPhase;
      expect(judgePhase(l, l.p, l.iq).ok).toBe(true);
      expect(judgePhase(l, l.v * l.i, l.iq).pOk).toBe(false);
      expect(judgePhase(l, l.p, l.i).qOk).toBe(false);
    }
  });
  it('level 2: P = I²R and the power factor win; V I for the power loses', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelCircuit;
      expect(l.p).toBeCloseTo(l.iRms ** 2 * l.r, 9);
      expect(judgeCircuit(l, l.p, l.pf).ok).toBe(true);
      expect(judgeCircuit(l, (l.vPeak / Math.SQRT2) * l.iRms, l.pf).pOk).toBe(false);
    }
  });
  it('level 3: the capacitance and the reduced current win; the current falls', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelCorrect;
      expect(l.iNew).toBeLessThan(l.iOld);
      expect(judgeCorrect(l, l.cMicroF, l.iNew).ok).toBe(true);
      expect(judgeCorrect(l, l.cMicroF, l.iOld).iOk).toBe(false);
    }
  });
  it('level 4: both kinds occur; the secondary voltage, current and kind win', () => {
    const kinds = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelTransformer;
      kinds.add(l.type);
      expect(l.vp * l.ip).toBeCloseTo(l.vs * l.is, 9);
      expect(judgeTransformer(l, l.vs, l.is, l.type).ok).toBe(true);
      expect(judgeTransformer(l, l.vs, l.ip, l.type).iOk).toBe(l.ip === l.is);
      expect(judgeTransformer(l, l.vs, l.is, l.type === 'step-up' ? 'step-down' : 'step-up').tOk).toBe(false);
    }
    expect(kinds.size).toBe(2);
  });
  it('level 5: the loss falls by k²; swapping the two losses loses', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelLoss;
      expect(l.loss1 / l.loss2).toBeCloseTo(l.k * l.k, 6);
      expect(judgeLoss(l, l.loss1, l.loss2).ok).toBe(true);
      expect(judgeLoss(l, l.loss2, l.loss1).ok).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/wattless component/, /P = I²R/, /power component/, /I_s V_s/, /high voltage/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
