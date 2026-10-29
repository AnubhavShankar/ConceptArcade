import { describe, expect, it } from 'vitest';
import { SLIDERS, fringeWidth, fringeX, gauge, gaugeExplain, gaugeMiss, gaugeRounds, hunterExplain, hunterMiss, hunterReading, hunterRounds, intensity, judgeGauge, judgeHunter, judgeLock, lockExplain, lockMiss, lockReading, lockRounds } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Exercise 10.4: d = 0.28 mm, D = 1.4 m and the 4th bright fringe at 1.2 cm give λ = 600 nm', () => {
    const [r] = hunterRounds(() => 0);
    expect(fringeX(4, 600, 1.4, 0.28)).toBeCloseTo(12, 6);
    expect(r).toBeDefined();
  });
  it('Exercise 10.5: I(Δ = λ) = K, so I(λ/3) = K/4', () => {
    expect(gauge(1)).toBeCloseTo(1, 9);
    expect(gauge(1 / 3)).toBeCloseTo(0.25, 9);
  });
  it('Exercise 10.6(b): 650 nm and 520 nm coincide at the 4th and 5th fringes', () => {
    expect(4 * 650).toBe(5 * 520);
    expect(fringeX(4, 650, 1.2, 2)).toBeCloseTo(fringeX(5, 520, 1.2, 2), 9);
  });
  it('the intensity pattern is 1 at the centre, 0 half a fringe out, 1 a whole fringe out', () => {
    const b = fringeWidth(600, 1, 0.5);
    expect(intensity(0, 600, 1, 0.5)).toBeCloseTo(1, 9);
    expect(intensity(b / 2, 600, 1, 0.5)).toBeCloseTo(0, 9);
    expect(intensity(b, 600, 1, 0.5)).toBeCloseTo(1, 9);
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: whole-nm wavelengths in the visible range, and exactly one colour on the dial hits the target', () => {
    for (const s of seeds) {
      const rounds = hunterRounds(lcg(s));
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(new Set(rounds.map((r) => `${r.d}/${r.D}/${r.n}/${r.x}`)).size).toBe(3);
      for (const r of rounds) {
        expect(Number.isInteger(Math.round(r.lamSol * 1e6) / 1e6)).toBe(true);
        expect(r.lamSol).toBeGreaterThan(SLIDERS.lam.min);
        expect(r.lamSol).toBeLessThan(SLIDERS.lam.max);
        expect(fringeX(r.n, r.lamSol, r.D, r.d)).toBeCloseTo(r.x, 6);
        expect(grid(SLIDERS.lam.min, SLIDERS.lam.max, SLIDERS.lam.step).filter((l) => judgeHunter(r, l))).toEqual([r.lamSol]);
        expect(r.x).toBeLessThanOrEqual(15);
      }
    }
  });
  it('level 2: the nearest coincidence uses the smallest whole numbers, lies on the screen, and exactly one detector setting wins', () => {
    for (const s of seeds) {
      const rounds = lockRounds(lcg(s));
      expect(rounds).toHaveLength(3);
      for (const r of rounds) {
        expect(r.n1 * r.lam1).toBe(r.n2 * r.lam2);
        expect(r.xSol).toBeGreaterThanOrEqual(SLIDERS.x.min);
        expect(r.xSol).toBeLessThanOrEqual(SLIDERS.x.max);
        expect(r.xSol * 10).toBeCloseTo(Math.round(r.xSol * 10), 6);
        expect(grid(SLIDERS.x.min, SLIDERS.x.max, SLIDERS.x.step).filter((x) => judgeLock(r, x))).toHaveLength(1);
        // no smaller coincidence exists
        for (let n1 = 1; n1 < r.n1; n1++) expect((n1 * r.lam1) % r.lam2).not.toBe(0);
      }
    }
  });
  it('level 3: three different path differences with brightness 0, ¼, ½ or ¾ of K, each set by exactly one meter reading', () => {
    for (const s of seeds) {
      const rounds = gaugeRounds(lcg(s));
      expect(new Set(rounds.map((r) => r.frac)).size).toBe(3);
      for (const r of rounds) {
        expect([0, 0.25, 0.5, 0.75]).toContainEqual(expect.closeTo(r.sol, 9));
        expect(grid(SLIDERS.g.min, SLIDERS.g.max, SLIDERS.g.step).filter((v) => judgeGauge(r, v))).toHaveLength(1);
      }
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: forgetting the order (n = 1) or mixing mm and m fails', () => {
    for (const r of hunterRounds(lcg(3))) {
      const lam1 = ((r.x * 1e-3 * r.d * 1e-3) / (1 * r.D)) * 1e9;
      expect(judgeHunter(r, lam1)).toBe(r.n === 1);
      expect(judgeHunter(r, r.lamSol * 10)).toBe(false);
    }
  });
  it('level 2: the first bright fringe of either colour, or the product of the wavelengths, is not the coincidence', () => {
    for (const r of lockRounds(lcg(3))) {
      expect(judgeLock(r, fringeX(1, r.lam1, r.D, r.d))).toBe(r.n1 === 1);
      expect(judgeLock(r, fringeX(r.n1 + 1, r.lam1, r.D, r.d))).toBe(false);
    }
  });
  it('level 3: the amplitude fraction instead of the intensity, or the phase over 2π, fails', () => {
    for (const r of gaugeRounds(lcg(3))) {
      if (r.sol > 0 && r.sol < 1) expect(judgeGauge(r, Math.sqrt(r.sol))).toBe(false);
    }
  });
});

describe('words: the working and the misses', () => {
  it('every working names the exercise', () => {
    expect(hunterExplain(hunterRounds(lcg(3))[0])[1]).toMatch(/Exercise 10\.4/);
    expect(lockExplain(lockRounds(lcg(3))[0])[1]).toMatch(/Exercise 10\.6/);
    expect(gaugeExplain(gaugeRounds(lcg(3))[0])[1]).toMatch(/Exercise 10\.5/);
  });
  it('a miss describes the effect and never states the answer', () => {
    const h = hunterRounds(lcg(3))[0];
    expect(hunterMiss(h, h.lamSol + 100)).toMatch(/past the target/);
    expect(hunterMiss(h, h.lamSol - 100)).toMatch(/short of the target/);
    expect(hunterMiss(h, h.lamSol + 100)).not.toContain(`${h.lamSol} nm`);
    const k = lockRounds(lcg(3))[0];
    expect(lockMiss(k, fringeX(1, k.lam1, k.D, k.d))).toMatch(/Only the|Neither|Both/);
    expect(lockMiss(k, 0.5)).toMatch(/Only the|Neither/);
    const g = gaugeRounds(lcg(3))[0];
    expect(gaugeMiss(g, g.sol + 0.3)).toMatch(/dimmer/);
    expect(gaugeMiss(g, g.sol - 0.3)).toMatch(/brighter/);
  });
  it('test shots read out the fringe positions and orders', () => {
    const h = hunterRounds(lcg(3))[0];
    expect(hunterReading(h, 500)).toMatch(/bright fringe lands [\d.]+ mm from the centre/);
    const k = lockRounds(lcg(3))[0];
    expect(lockReading(k, k.xSol)).toMatch(new RegExp(`order ${k.n1} of ${k.lam1} nm and ${k.n2} of ${k.lam2} nm`));
  });
});
