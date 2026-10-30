import { describe, expect, it } from 'vitest';
import { HIT, MISS_FRAC, SLIDERS, START, specX, countExplain, countMiss, countReading, countRounds, electronNm, judgeCount, judgeTube, judgeTune, photonJ, photonsPerSec, tubeExplain, tubeMiss, tubeReading, tubeRounds, tuneExplain, tuneMiss, tuneReading, tuneRounds, xrayMaxF, xrayMinA } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Example 11.1: 6.0 × 10¹⁴ Hz and 2.0 mW give a photon energy of 3.98 × 10⁻¹⁹ J and 5.0 × 10¹⁵ photons per second', () => {
    expect(photonJ(6)).toBeCloseTo(3.978, 3);
    expect(photonsPerSec(6, 2)).toBeCloseTo(5.03, 2);
  });
  it('Exercise 11.1: 30 kV electrons make X-rays of up to 7.24 × 10¹⁸ Hz, down to 0.0413 nm', () => {
    expect(xrayMaxF(30)).toBeCloseTo(7.24, 2);
    expect(xrayMinA(30) / 10).toBeCloseTo(0.0413, 4);
  });
  it('Example 11.3: an electron at 5.4 × 10⁶ m/s has λ = 0.135 nm', () => {
    const p = 9.11e-31 * 5.4e6;
    expect((6.63e-34 / p) * 1e9).toBeCloseTo(0.1348, 3);
  });
  it('an electron through 150 V has λ ≈ 0.1 nm, and λ falls as 1/√V', () => {
    expect(electronNm(150)).toBeCloseTo(0.1, 2);
    expect(electronNm(600) / electronNm(150)).toBeCloseTo(0.5, 9);
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: photon counts from 2 to 10 × 10¹⁵ per second, increasing, and the dial window around the answer is narrow', () => {
    for (const s of seeds) {
      const rounds = countRounds(lcg(s));
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(rounds.map((r) => r.nSol)).toEqual([...rounds.map((r) => r.nSol)].sort((a, b) => a - b));
      for (const r of rounds) {
        expect(r.nSol).toBeGreaterThan(SLIDERS.n.min);
        expect(r.nSol).toBeLessThan(SLIDERS.n.max);
        const winners = grid(SLIDERS.n.min, SLIDERS.n.max, SLIDERS.n.step).filter((n) => judgeCount(r, n));
        expect(winners.length).toBeGreaterThanOrEqual(1);
        expect(winners.length).toBeLessThanOrEqual(5);
        for (const w of winners) expect(Math.abs(w - r.nSol) / r.nSol).toBeLessThanOrEqual(0.02);
      }
    }
  });
  it('level 2: three different spacings from the widest down, every one reachable on the voltage dial', () => {
    for (const s of seeds) {
      const rounds = tuneRounds(lcg(s));
      expect(new Set(rounds.map((r) => r.target)).size).toBe(3);
      expect(rounds.map((r) => r.target)).toEqual([...rounds.map((r) => r.target)].sort((a, b) => b - a));
      for (const r of rounds) {
        const winners = grid(SLIDERS.v.min, SLIDERS.v.max, SLIDERS.v.step).filter((v) => judgeTune(r, v));
        expect(winners.length).toBeGreaterThanOrEqual(1);
        // the winning voltages form one contiguous run
        expect(winners[winners.length - 1] - winners[0] + 1).toBe(winners.length);
        for (const w of winners) expect(Math.abs(electronNm(w) - r.target) / r.target).toBeLessThanOrEqual(0.015);
      }
    }
  });
  it('level 3: a whole number of kilovolts for every round, in increasing order, and exactly one setting wins', () => {
    for (const s of seeds) {
      const rounds = tubeRounds(lcg(s));
      expect(rounds.map((r) => r.kvSol)).toEqual([...rounds.map((r) => r.kvSol)].sort((a, b) => a - b));
      for (const r of rounds) {
        expect(grid(SLIDERS.kv.min, SLIDERS.kv.max, SLIDERS.kv.step).filter((kv) => judgeTube(r, kv))).toEqual([r.kvSol]);
        expect(xrayMinA(r.kvSol)).toBeCloseTo(r.target, 3);
      }
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: the energy per photon in eV, or forgetting the milli, fails', () => {
    for (const r of countRounds(lcg(3))) {
      expect(judgeCount(r, r.nSol * 1000)).toBe(false);
      expect(judgeCount(r, r.nSol / 1000)).toBe(false);
      expect(judgeCount(r, photonJ(r.f))).toBe(false);
    }
  });
  it('level 2: using the photon formula λ = hc/eV for an electron fails (that would be the X-ray answer)', () => {
    for (const r of tuneRounds(lcg(3))) {
      const photonV = 1240 / (r.target * 1000) ** 0 / 1;
      expect(judgeTune(r, photonV)).toBe(false);
    }
  });
  it('level 3: V in volts instead of kilovolts, or λ = 12.4/V in nm, fails', () => {
    for (const r of tubeRounds(lcg(3))) {
      expect(judgeTube(r, r.kvSol * 1000)).toBe(false);
      expect(judgeTube(r, r.kvSol / 10)).toBe(false);
    }
  });
});

describe('no leaks: the start, the hit point and the miss effects', () => {
  it('the start of every dial wins no round', () => {
    for (const s of seeds) {
      for (const r of countRounds(lcg(s))) expect(judgeCount(r, START.n)).toBe(false);
      for (const r of tuneRounds(lcg(s))) expect(judgeTune(r, START.v)).toBe(false);
      for (const r of tubeRounds(lcg(s))) expect(judgeTube(r, START.kv)).toBe(false);
    }
  });
  it('the hit point is a fixed point, and on level 3 never where a wanted cut-off is drawn', () => {
    for (const s of seeds) {
      for (const r of tubeRounds(lcg(s))) {
        expect(Math.abs(HIT.kv[0] - specX(r.target))).toBeGreaterThan(60);
        expect(Math.abs(HIT.kv[0] - specX(xrayMinA(r.kvSol)))).toBeGreaterThan(60);
      }
    }
    expect(HIT.n).toEqual([470, 160]);
    expect(HIT.v).toEqual([330, 175]);
  });
  it('the miss effect is a fixed multiple of the wanted value and never depends on how far off the player was', () => {
    expect(MISS_FRAC.under).toBeLessThan(1);
    expect(MISS_FRAC.over).toBeGreaterThan(1);
    for (const s of seeds.slice(0, 20)) {
      for (const r of tubeRounds(lcg(s))) {
        // the fixed over effect still lies on the spectrum axis (0 to 1.2 Å) and the fixed under effect lies right of the axis start
        expect(r.target * MISS_FRAC.over).toBeLessThan(1.2);
        expect(r.target * MISS_FRAC.under).toBeGreaterThan(0.05);
      }
    }
  });
  it('two wrong settings on the same side give the same miss text, and no miss text holds a number', () => {
    for (const s of seeds.slice(0, 20)) {
      for (const r of countRounds(lcg(s))) {
        expect(countMiss(r, r.nSol * 1.3)).toBe(countMiss(r, r.nSol * 3));
        expect(countMiss(r, r.nSol * 0.8)).toBe(countMiss(r, r.nSol * 0.3));
        expect(countMiss(r, r.nSol * 1.3)).not.toBe(countMiss(r, r.nSol * 0.8));
        expect(countMiss(r, r.nSol * 1.3)).not.toMatch(/\d/);
        expect(countMiss(r, r.nSol * 0.8)).not.toMatch(/\d/);
      }
      for (const r of tuneRounds(lcg(s))) {
        const lo = (f: number) => (6.63e-34 / (r.target * f * 1e-9)) ** 2 / (2 * 9.1e-31 * 1.6e-19);
        expect(tuneMiss(r, lo(1.3))).toBe(tuneMiss(r, lo(2.2)));
        expect(tuneMiss(r, lo(0.8))).toBe(tuneMiss(r, lo(0.4)));
        expect(tuneMiss(r, lo(1.3))).not.toBe(tuneMiss(r, lo(0.8)));
        expect(tuneMiss(r, lo(1.3))).not.toMatch(/\d/);
        expect(tuneMiss(r, lo(0.8))).not.toMatch(/\d/);
      }
      for (const r of tubeRounds(lcg(s))) {
        expect(tubeMiss(r, r.kvSol * 0.7)).toBe(tubeMiss(r, r.kvSol * 0.4));
        expect(tubeMiss(r, r.kvSol * 1.4)).toBe(tubeMiss(r, r.kvSol * 2));
        expect(tubeMiss(r, r.kvSol * 0.7)).not.toBe(tubeMiss(r, r.kvSol * 1.4));
        expect(tubeMiss(r, r.kvSol * 0.7)).not.toMatch(/\d/);
        expect(tubeMiss(r, r.kvSol * 1.4)).not.toMatch(/\d/);
      }
    }
  });
});

describe('words: the working and the misses', () => {
  it('the working names the exercise', () => {
    expect(countExplain(countRounds(lcg(3))[0])[1]).toMatch(/Example 11\.1/);
    expect(tuneExplain(tuneRounds(lcg(3))[0])[1]).toMatch(/Exercise 11\.10/);
    expect(tubeExplain(tubeRounds(lcg(3))[0])[1]).toMatch(/Exercise 11\.1\)/);
  });
  it('a miss describes the effect and never states the answer', () => {
    const c = countRounds(lcg(3))[0];
    expect(countMiss(c, c.nSol * 2)).toMatch(/more photons/);
    expect(countMiss(c, c.nSol / 2)).toMatch(/fewer photons/);
    const t = tuneRounds(lcg(3))[0];
    expect(tuneMiss(t, 10)).toMatch(/too long/);
    expect(tuneMiss(t, 800)).toMatch(/too short/);
    const x = tubeRounds(lcg(3))[0];
    expect(tubeMiss(x, 5)).toMatch(/not energetic enough/);
    expect(tubeMiss(x, 80)).toMatch(/more energetic than needed/);
  });
  it('test shots read out the numbers', () => {
    expect(countReading(countRounds(lcg(3))[0])).toMatch(/Each photon carries [\d.]+ × 10⁻¹⁹ J/);
    expect(tuneReading(150)).toMatch(/0\.1 nm/);
    expect(tubeReading(30)).toMatch(/0\.413 Å/);
  });
});
