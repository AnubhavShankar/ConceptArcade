import { describe, expect, it } from 'vitest';
import { SLIDERS, middleExplain, middleMiss, middlePolaroid, middleReading, middleRounds, minimumDeg, shadeExplain, shadeMiss, shadeReading, shadeRounds, slitExplain, slitIntensity, slitMiss, slitReading, slitRounds, twoPolaroids, judgeMiddle, judgeShade, judgeSlit } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Example 10.2: a polaroid between crossed ones passes (I₀/4) sin²2θ, a maximum of I₀/4 at 45°', () => {
    expect(middlePolaroid(45)).toBeCloseTo(0.25, 9);
    expect(middlePolaroid(0)).toBeCloseTo(0, 9);
    expect(middlePolaroid(90)).toBeCloseTo(0, 9);
    for (let t = 0; t <= 90; t += 5) expect(middlePolaroid(t)).toBeLessThanOrEqual(0.25 + 1e-12);
    expect(middlePolaroid(30)).toBeCloseTo(middlePolaroid(60), 9);
  });
  it('a single polaroid passes half the unpolarised light; two at 0° pass half, at 90° none', () => {
    expect(twoPolaroids(0)).toBeCloseTo(0.5, 9);
    expect(twoPolaroids(90)).toBeCloseTo(0, 9);
  });
  it('the first dark band of a slit of width 1200 nm and 600 nm light is at 30°, and the pattern is dark there', () => {
    expect(minimumDeg(1, 600, 1200)).toBeCloseTo(30, 6);
    expect(slitIntensity(1200, 600, 30)).toBeCloseTo(0, 9);
    expect(slitIntensity(1200, 600, 0)).toBeCloseTo(1, 9);
    expect(minimumDeg(2, 600, 1000)).toBeNull();
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: the slit width is a multiple of 100 nm on the dial, the pattern is dark at the target, and exactly one width wins', () => {
    for (const s of seeds) {
      const rounds = slitRounds(lcg(s));
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(rounds.map((r) => r.n)).toEqual([...rounds.map((r) => r.n)].sort((a, b) => a - b));
      for (const r of rounds) {
        expect(r.aSol % 100).toBe(0);
        expect(r.aSol).toBeGreaterThanOrEqual(SLIDERS.a.min);
        expect(r.aSol).toBeLessThanOrEqual(SLIDERS.a.max);
        expect(slitIntensity(r.aSol, r.lam, r.theta) * 0).toBe(0);
        expect(minimumDeg(r.n, r.lam, r.aSol)).toBeCloseTo(r.theta, 6);
        expect(grid(SLIDERS.a.min, SLIDERS.a.max, SLIDERS.a.step).filter((a) => judgeSlit(r, a))).toEqual([r.aSol]);
      }
    }
  });
  it('level 2: three of six wanted fractions, each checked numerically; exactly one whole-degree dial setting wins each', () => {
    const seen = new Set<number>();
    for (const s of seeds) {
      const rounds = shadeRounds(lcg(s));
      expect(new Set(rounds.map((r) => r.target)).size).toBe(3);
      for (const r of rounds) {
        seen.add(r.target);
        expect(twoPolaroids(r.thetaSol)).toBeCloseTo(r.target, 6);
        expect(Math.round(r.target * 1000) / 1000).toBe(r.target);
        const winners = grid(SLIDERS.theta.min, SLIDERS.theta.max, SLIDERS.theta.step).filter((t) => judgeShade(r, t));
        expect(winners).toHaveLength(1);
        expect(Math.abs(winners[0] - r.thetaSol)).toBeLessThanOrEqual(0.5);
        // the winning whole degree really gives the wanted fraction to within a percent
        expect(Math.abs(twoPolaroids(winners[0]) - r.target) / r.target).toBeLessThan(0.02);
      }
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([0.125, 0.18, 0.25, 0.32, 0.375, 0.405]);
  });
  it('level 3: three of five wanted fractions; the angle and its mirror image 90° − θ both win, 45° is the single peak, and nothing else does', () => {
    const seen = new Set<number>();
    for (const s of seeds) {
      const rounds = middleRounds(lcg(s));
      expect(new Set(rounds.map((r) => r.target)).size).toBe(3);
      for (const r of rounds) {
        seen.add(r.target);
        for (const sol of r.solutions) expect(middlePolaroid(sol)).toBeCloseTo(r.target, 6);
        const winners = grid(SLIDERS.theta.min, SLIDERS.theta.max, SLIDERS.theta.step).filter((t) => judgeMiddle(r, t));
        expect(winners.length).toBeGreaterThanOrEqual(r.solutions.length);
        for (const w of winners) expect(Math.abs(middlePolaroid(w) - r.target)).toBeLessThan(0.02);
        expect(r.solutions.length).toBe(r.target === 0.25 ? 1 : 2);
        expect(grid(SLIDERS.theta.min, SLIDERS.theta.max, SLIDERS.theta.step).filter((t) => judgeMiddle(r, t) && Math.abs(t - 45) <= 1).length > 0).toBe(r.target === 0.25);
      }
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([0.0625, 0.09, 0.16, 0.1875, 0.25]);
  });
  it('rounds 1 and 2 never fix round 3 (levels 2 and 3 slice three from a bigger pool)', () => {
    for (const make of [shadeRounds, middleRounds] as const) {
      const third = new Map<string, Set<number>>();
      for (let s = 0; s < 400; s++) {
        const [a, b, c] = make(lcg(s * 7919 + 13));
        const key = `${a.target},${b.target}`;
        third.set(key, (third.get(key) ?? new Set()).add(c.target));
      }
      expect([...third.values()].every((v) => v.size >= 2)).toBe(true);
    }
  });
  it('the dials start where no round of any level is won', () => {
    for (const s of seeds) {
      for (const r of slitRounds(lcg(s))) expect(judgeSlit(r, 1500)).toBe(false);
      for (const r of shadeRounds(lcg(s))) expect(judgeShade(r, 10)).toBe(false);
      for (const r of middleRounds(lcg(s))) expect(judgeMiddle(r, 5)).toBe(false);
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: the width for the wrong order, or wavelength instead of width, fails', () => {
    for (const r of slitRounds(lcg(3))) {
      expect(judgeSlit(r, r.lam)).toBe(false);
      expect(judgeSlit(r, r.aSol / 2)).toBe(false);
      expect(judgeSlit(r, r.aSol * 2)).toBe(false);
    }
  });
  it('level 2: forgetting the first polaroid (cos²θ alone), or ignoring the angle, fails', () => {
    for (const r of shadeRounds(lcg(3))) {
      const cos2 = Math.acos(Math.sqrt(r.target)) / (Math.PI / 180);
      expect(judgeShade(r, cos2)).toBe(false);
      expect(judgeShade(r, 0)).toBe(false);
    }
  });
  it('level 3: using Malus’ law once (cos²θ), or the unpolarised half, fails', () => {
    for (const r of middleRounds(lcg(3))) {
      const once = Math.acos(Math.sqrt(r.target)) / (Math.PI / 180);
      expect(judgeMiddle(r, once)).toBe(r.solutions.some((s) => Math.abs(once - s) <= 1));
      expect(judgeMiddle(r, 0)).toBe(false);
      expect(judgeMiddle(r, 90)).toBe(false);
    }
  });
});

describe('words: the working and the misses', () => {
  it('the working explains the formula', () => {
    expect(slitExplain(slitRounds(lcg(3))[0])[0]).toMatch(/a sin θ = nλ/);
    expect(shadeExplain(shadeRounds(lcg(3))[0])[0]).toMatch(/Malus/);
    expect(middleExplain(middleRounds(lcg(3))[0])[1]).toMatch(/Example 10\.2/);
  });
  it('a miss describes the effect and never states the answer', () => {
    const s = slitRounds(lcg(3))[0];
    expect(slitMiss(s, s.aSol * 0.7)).toMatch(/beyond the target/);
    expect(slitMiss(s, s.aSol * 1.4)).toMatch(/inside the target/);
    expect(slitMiss(s, 300)).toMatch(/no dark band/);
    expect(slitMiss(s, s.aSol * 0.7)).not.toContain(`${s.aSol} nm`);
    const h = shadeRounds(lcg(3))[0];
    expect(shadeMiss(h, 0)).toMatch(/Too much light/);
    expect(shadeMiss(h, 90)).toMatch(/Too little light/);
    const m = middleRounds(lcg(3))[0];
    expect(middleMiss(m, 0)).toMatch(/Less light/);
    expect(middleMiss(m, m.target > 0.2 ? 0 : 45)).toMatch(/light/);
  });
  it('test shots read out the numbers', () => {
    const s = slitRounds(lcg(3))[0];
    expect(slitReading(s, s.aSol)).toMatch(/dark band is at/);
    expect(slitReading(s, 100)).toMatch(/narrower than/);
    expect(shadeReading(45)).toMatch(/0\.25 of the original/);
    expect(middleReading(45)).toMatch(/0\.25 of the light after the first/);
  });
});
