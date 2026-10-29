import { describe, expect, it } from 'vitest';
import { PARTICLE, SLIDERS, barrierExplain, barrierKeV, barrierMiss, barrierReading, barrierRounds, decayExplain, decayMiss, decayReading, decayRounds, judgeBarrier, judgeDecay, judgeSize, radiusFm, sizeExplain, sizeMiss, sizeReading, sizeRounds } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Exercise 13.4: the radius ratio of gold-197 to silver-107 is about 1.23', () => {
    expect(radiusFm(197) / radiusFm(107)).toBeCloseTo(1.2256, 3);
  });
  it('Exercise 13.10: the density A m_u / (4/3 π R₀³ A) does not depend on A', () => {
    const rho = (a: number) => (a * 1.66e-27) / ((4 / 3) * Math.PI * (radiusFm(a) * 1e-15) ** 3);
    expect(rho(16) / rho(238)).toBeCloseTo(1, 9);
    expect(rho(56)).toBeCloseTo(2.3e17, -16);
  });
  it('Exercise 13.9: two deuterons of radius 2.0 fm have a barrier of 360 keV', () => {
    expect(barrierKeV(1, 1, 4)).toBeCloseTo(360, 6);
  });
  it('α, β⁻ and β⁺ decay conserve A and Z: ²³⁸U → ²³⁴Th, ¹⁴C → ¹⁴N, ¹¹C → ¹¹B', () => {
    const rounds = decayRounds(() => 0.3);
    expect(rounds.map((r) => r.kind)).toEqual(['alpha', 'beta-', 'beta+']);
    for (const r of rounds) {
      expect(r.aSol + PARTICLE[r.kind].a).toBe(r.a);
      expect(r.zSol + PARTICLE[r.kind].z).toBe(r.z);
    }
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: three nuclei by increasing A; the radius is reachable and the dial winners are a short run', () => {
    for (const s of seeds) {
      const rounds = sizeRounds(lcg(s));
      expect(rounds.map((r) => r.a)).toEqual([...rounds.map((r) => r.a)].sort((a, b) => a - b));
      expect(new Set(rounds.map((r) => r.a)).size).toBe(3);
      for (const r of rounds) {
        expect(r.sol).toBeGreaterThan(SLIDERS.r.min);
        expect(r.sol).toBeLessThan(SLIDERS.r.max);
        const winners = grid(SLIDERS.r.min, SLIDERS.r.max, SLIDERS.r.step).filter((x) => judgeSize(r, x));
        expect(winners.length).toBeGreaterThanOrEqual(5);
        expect(winners.length).toBeLessThanOrEqual(7);
        expect(winners).toContain(Math.round(r.sol * 100) / 100);
      }
    }
  });
  it('level 2: three distinct barriers in increasing height, each reachable on the dial', () => {
    for (const s of seeds) {
      const rounds = barrierRounds(lcg(s));
      expect(rounds.map((r) => r.sol)).toEqual([...rounds.map((r) => r.sol)].sort((a, b) => a - b));
      expect(new Set(rounds.map((r) => r.sol)).size).toBe(3);
      for (const r of rounds) {
        expect(r.sol).toBeGreaterThan(SLIDERS.u.min);
        expect(r.sol).toBeLessThan(SLIDERS.u.max);
        const winners = grid(SLIDERS.u.min, SLIDERS.u.max, SLIDERS.u.step).filter((u) => judgeBarrier(r, u));
        expect(winners.length).toBeGreaterThanOrEqual(5);
      }
    }
  });
  it('level 3: one α, one β⁻ and one β⁺ decay, and exactly one (A, Z) pair wins each', () => {
    for (const s of seeds) {
      const rounds = decayRounds(lcg(s));
      expect(rounds.map((r) => r.kind)).toEqual(['alpha', 'beta-', 'beta+']);
      for (const r of rounds) {
        expect(r.aSol).toBeGreaterThan(0);
        expect(r.zSol).toBeGreaterThan(0);
        const winners: [number, number][] = [];
        for (const a of grid(SLIDERS.a.min, SLIDERS.a.max, SLIDERS.a.step)) for (const z of [r.zSol - 1, r.zSol, r.zSol + 1]) if (judgeDecay(r, a, z).ok) winners.push([a, z]);
        expect(winners).toEqual([[r.aSol, r.zSol]]);
      }
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: R₀A (not the cube root) or the radius of the wrong nucleus fails', () => {
    for (const r of sizeRounds(lcg(3))) {
      expect(judgeSize(r, Math.min(9, 1.2 * r.a))).toBe(false);
      expect(judgeSize(r, radiusFm(r.a * 2))).toBe(false);
    }
  });
  it('level 2: using one radius for the distance, or forgetting a charge, fails', () => {
    for (const r of barrierRounds(lcg(3))) {
      expect(judgeBarrier(r, r.sol * 2)).toBe(false);
      expect(judgeBarrier(r, r.sol / (r.z1 * r.z2 === 1 ? 2 : r.z1 * r.z2))).toBe(false);
    }
  });
  it('level 3: leaving A or Z as the parent’s, or flipping the β sign, fails', () => {
    for (const r of decayRounds(lcg(3))) {
      expect(judgeDecay(r, r.a, r.z).ok).toBe(false);
      expect(judgeDecay(r, r.aSol, r.z + PARTICLE[r.kind].z).ok).toBe(PARTICLE[r.kind].z === 0 ? true : false);
      expect(judgeDecay(r, r.aSol, r.zSol).ok).toBe(true);
    }
  });
});

describe('words: the working and the misses', () => {
  it('the working names the exercise or the example', () => {
    expect(sizeExplain(sizeRounds(lcg(3))[0])[1]).toMatch(/Exercises 13\.4, 13\.10; Example 13\.1/);
    expect(barrierExplain(barrierRounds(lcg(3))[0])[1]).toMatch(/Exercise 13\.9/);
    expect(decayExplain(decayRounds(lcg(3))[0])[1]).toMatch(/Example 13\.4/);
  });
  it('a miss describes the effect and never states the answer', () => {
    const s = sizeRounds(lcg(3))[0];
    expect(sizeMiss(s, s.sol * 1.5)).toMatch(/bigger than the real one/);
    expect(sizeMiss(s, s.sol / 1.5)).toMatch(/smaller than the real one/);
    const b = barrierRounds(lcg(3))[0];
    expect(barrierMiss(b, b.sol * 2)).toMatch(/too high/);
    expect(barrierMiss(b, b.sol / 2)).toMatch(/too low/);
    const d = decayRounds(lcg(3))[0];
    expect(decayMiss(d, d.aSol, d.zSol + 3)).toMatch(/charge does not/);
    expect(decayMiss(d, d.aSol + 3, d.zSol)).toMatch(/mass number does not/);
    expect(decayMiss(d, 1, 1)).toMatch(/Neither/);
  });
  it('test shots read out the helpful numbers', () => {
    expect(sizeReading(sizeRounds(lcg(3))[0])).toMatch(/A\^⅓ for A = \d+ is/);
    expect(barrierReading(barrierRounds(lcg(3))[0], 300)).toMatch(/repulsion energy/);
    expect(decayReading(decayRounds(lcg(3))[0])).toMatch(/α-particle.*mass number 4 and charge \+2/);
  });
});
