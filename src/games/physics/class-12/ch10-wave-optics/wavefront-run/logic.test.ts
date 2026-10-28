import { describe, expect, it } from 'vitest';
import { C, SLIDERS, asinD, bandExplain, bandMiss, bandRounds, freq, judgeBand, judgeMud, mudExplain, mudMiss, mudReading, mudRounds, sinD } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Exercise 10.1: 589 nm light entering water (n = 1.33) has λ′ = 443 nm, v′ = 2.26 × 10⁸ m/s and the same frequency, 5.09 × 10¹⁴ Hz', () => {
    expect(589 / 1.33).toBeCloseTo(442.9, 1);
    expect(C / 1.33).toBeCloseTo(2.256, 3);
    expect(freq(C, 589)).toBeCloseTo(5.093e14, -11);
    expect(freq(C / 1.33, 589 / 1.33)).toBeCloseTo(freq(C, 589), -8);
  });
  it('Exercise 10.3: light in glass of n = 1.5 travels at 2 × 10⁸ m/s', () => {
    expect(C / 1.5).toBe(2);
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: the wavelength and speed are clean, the frequency is conserved, and exactly one pair of dials wins', () => {
    for (const s of seeds.slice(0, 40)) {
      const rounds = mudRounds(lcg(s));
      expect(rounds).toHaveLength(3);
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(rounds.map((r) => r.n)).toEqual([...rounds.map((r) => r.n)].sort((a, b) => b - a));
      for (const r of rounds) {
        expect(Number.isInteger(r.lamSol)).toBe(true);
        expect(r.vSol * 100).toBeCloseTo(Math.round(r.vSol * 100), 6);
        expect(freq(r.vSol, r.lamSol)).toBeCloseTo(freq(C, r.lambda), -6);
        const winners: [number, number][] = [];
        for (const lam of grid(SLIDERS.lam.min, SLIDERS.lam.max, SLIDERS.lam.step)) {
          if (!judgeMud(r, lam, r.vSol).lamOk) continue;
          for (const v of grid(SLIDERS.v.min, SLIDERS.v.max, SLIDERS.v.step)) if (judgeMud(r, lam, v).ok) winners.push([lam, v]);
        }
        expect(winners).toHaveLength(1);
      }
    }
  });
  it('level 2: sin r = (v₂/v₁) sin 30°, to a clean half degree, and only that dial setting wins', () => {
    for (const s of seeds) {
      const rounds = bandRounds(lcg(s));
      expect(rounds).toHaveLength(3);
      expect(new Set(rounds.map((r) => `${r.v1}/${r.v2}`)).size).toBe(3);
      for (const r of rounds) {
        expect(sinD(r.rSol)).toBeCloseTo((r.v2 / r.v1) * sinD(30), 9);
        expect(r.rSol).toBeLessThan(85);
        const winners = grid(SLIDERS.r.min, SLIDERS.r.max, SLIDERS.r.step).filter((d) => judgeBand(r, d));
        expect(winners).toHaveLength(1);
        expect(Math.abs(winners[0] - r.rSol)).toBeLessThanOrEqual(0.26);
      }
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: the wavelength unchanged, or the speed unchanged, or λ′ = nλ, fails', () => {
    const r = mudRounds(lcg(3))[0];
    expect(judgeMud(r, r.lambda, C).ok).toBe(false);
    expect(judgeMud(r, r.lambda * r.n, r.vSol).ok).toBe(false);
    expect(judgeMud(r, r.lamSol, C).ok).toBe(false);
    expect(judgeMud(r, r.lamSol, r.vSol).ok).toBe(true);
  });
  it('level 2: the angle of incidence, and the inverted speed ratio, fail', () => {
    for (const r of bandRounds(lcg(3))) {
      expect(judgeBand(r, r.i)).toBe(false);
      expect(judgeBand(r, asinD(Math.min(1, (r.v1 / r.v2) * sinD(r.i))))).toBe(false);
    }
  });
});

describe('words: the working and the misses', () => {
  it('the working names the exercise and keeps the frequency fixed', () => {
    const r = mudRounds(lcg(3))[0];
    expect(mudExplain(r)[0]).toMatch(/Exercise 10\.1/);
    expect(mudExplain(r)[1]).toMatch(/reflected/);
    expect(bandExplain(bandRounds(lcg(3))[0])[1]).toMatch(/Huygens/);
  });
  it('a miss describes the effect and never states the right answer', () => {
    const r = mudRounds(lcg(3))[0];
    expect(mudMiss(r, r.lambda, r.vSol)).toMatch(/drift off the crests/);
    // no change at all keeps the frequency, so the karts keep up, but the numbers are wrong for this medium
    expect(mudMiss(r, r.lambda, C)).toMatch(/keep up with the crests/);
    expect(mudMiss(r, r.lamSol, r.vSol + 0.1)).toMatch(/drift off|not what its refractive index allows|does not have/);
    expect(mudMiss(r, r.lambda, r.vSol)).not.toContain(`${r.lamSol} nm`);
    const b = bandRounds(lcg(3))[0];
    expect(bandMiss(b, b.rSol + 10)).toMatch(/cuts through/);
    expect(bandMiss(b, b.rSol - 10)).toMatch(/floats clear/);
  });
  it('a test shot reports both frequencies', () => {
    const r = mudRounds(lcg(3))[0];
    expect(mudReading(r, r.lamSol, r.vSol)).toMatch(/They agree/);
    expect(mudReading(r, r.lambda, r.vSol)).toMatch(/do not agree/);
    expect(mudReading(r, r.lambda, C)).toMatch(/They agree/);
  });
});
