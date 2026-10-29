import { describe, expect, it } from 'vitest';
import { ELEMENTS, SLIDERS, closestFm, energyFor, foilExplain, foilMiss, foilReading, foilRounds, judgeFoil, judgeRange, rangeExplain, rangeMiss, rangeReading, rangeRounds } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Example 12.2: a 7.7 MeV α-particle on gold turns back at about 29.6 fm (3.0 × 10⁻¹⁴ m)', () => {
    expect(closestFm(79, 7.7)).toBeCloseTo(29.55, 2);
  });
  it('d scales as Z / K: double the energy halves it, double the charge doubles it', () => {
    expect(closestFm(79, 11)).toBeCloseTo(closestFm(79, 5.5) / 2, 9);
    expect(closestFm(58, 5.5)).toBeCloseTo(2 * closestFm(29, 5.5), 9);
  });
  it('energyFor undoes closestFm', () => {
    expect(energyFor(29, closestFm(29, 4.2))).toBeCloseTo(4.2, 9);
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: three different set-ups, the target is reachable on the energy dial, and the dial winners form a narrow run', () => {
    for (const s of seeds) {
      const rounds = rangeRounds(lcg(s));
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(new Set(rounds.map((r) => `${r.z}/${r.target}`)).size).toBe(3);
      for (const r of rounds) {
        expect(r.kSol).toBeGreaterThan(SLIDERS.k.min);
        expect(r.kSol).toBeLessThan(SLIDERS.k.max);
        expect(closestFm(r.z, r.kSol)).toBeCloseTo(r.target, 6);
        const winners = grid(SLIDERS.k.min, SLIDERS.k.max, SLIDERS.k.step).filter((k) => judgeRange(r, k));
        expect(winners.length).toBeGreaterThanOrEqual(3);
        for (const w of winners) expect(Math.abs(w - r.kSol) / r.kSol).toBeLessThanOrEqual(0.02 + 1e-9);
        expect(judgeRange(r, r.kSol * 2)).toBe(false);
        expect(judgeRange(r, r.kSol / 2)).toBe(false);
      }
    }
  });
  it('level 2: the element is found from the turning point, and exactly one Z wins every round', () => {
    for (const s of seeds) {
      const rounds = foilRounds(lcg(s));
      expect(new Set(rounds.map((r) => r.zSol)).size).toBe(3);
      for (const r of rounds) {
        expect(ELEMENTS[r.zSol]).toBeDefined();
        expect(grid(SLIDERS.z.min, SLIDERS.z.max, SLIDERS.z.step).filter((z) => judgeFoil(r, z))).toEqual([r.zSol]);
        expect(Math.abs((r.turn * r.k) / 2.88 - r.zSol)).toBeLessThan(0.5);
      }
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: forgetting the charge 2 of the α-particle (using Z e²) gives the wrong energy', () => {
    for (const r of rangeRounds(lcg(3))) {
      expect(judgeRange(r, (r.z * 1.44) / r.target)).toBe(false);
      expect(judgeRange(r, r.kSol * 79 / r.z)).toBe(r.z === 79);
    }
  });
  it('level 2: using the atomic mass or the charge of the α-particle instead of Z fails', () => {
    for (const r of foilRounds(lcg(3))) {
      expect(judgeFoil(r, r.zSol * 2)).toBe(false);
      expect(judgeFoil(r, r.zSol + 1)).toBe(false);
    }
  });
});

describe('words: the working and the misses', () => {
  it('the working names the example or the exercise', () => {
    expect(rangeExplain(rangeRounds(lcg(3))[0])[1]).toMatch(/Example 12\.2/);
    expect(foilExplain(foilRounds(lcg(3))[0])[1]).toMatch(/Example 12\.1/);
  });
  it('a miss describes the effect and never states the answer', () => {
    const r = rangeRounds(lcg(3))[0];
    expect(rangeMiss(r, r.kSol * 2)).toMatch(/too close/);
    expect(rangeMiss(r, r.kSol / 2)).toMatch(/turns back too early/);
    expect(rangeMiss(r, r.kSol * 2)).not.toContain(`${r.kSol.toFixed(2)} MeV`);
    const f = foilRounds(lcg(3))[0];
    expect(foilMiss(f, f.zSol + 20)).toMatch(/farther out/);
    expect(foilMiss(f, Math.max(1, f.zSol - 10))).toMatch(/closer|too strongly/);
  });
  it('test shots read out the turning points', () => {
    const r = rangeRounds(lcg(3))[0];
    expect(rangeReading(r, 5)).toMatch(/turns back at [\d.]+ fm/);
    const f = foilRounds(lcg(3))[0];
    expect(foilReading(f, 30)).toMatch(/it turned at/);
  });
});
