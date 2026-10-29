import { describe, expect, it } from 'vitest';
import { A0, SLIDERS, V1, bigExplain, bigMiss, bigReading, bigRounds, judgeBig, judgeLap, judgeRing, lapExplain, lapMiss, lapReading, lapRounds, period, quantumLog, radius, ringExplain, ringMiss, ringReading, ringRounds, speed } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Exercise 12.7: with r₁ = 5.3 × 10⁻¹¹ m the radii for n = 2 and 3 are 2.12 × 10⁻¹⁰ m and 4.77 × 10⁻¹⁰ m', () => {
    expect(radius(2) / 10).toBeCloseTo(2.12, 2);
    expect(radius(3) / 10).toBeCloseTo(4.77, 2);
  });
  it('Exercise 12.6: the speeds are 2.19 × 10⁶, 1.095 × 10⁶ and 7.3 × 10⁵ m/s, and the periods 1.52 × 10⁻¹⁶, 1.22 × 10⁻¹⁵ and 4.1 × 10⁻¹⁵ s', () => {
    expect(speed(1)).toBeCloseTo(V1, 9);
    expect(speed(2)).toBeCloseTo(10.95, 2);
    expect(speed(3)).toBeCloseTo(7.3, 2);
    expect(period(1)).toBeCloseTo(1.52, 2);
    expect(period(2)).toBeCloseTo(12.16, 1);
    expect(period(3)).toBeCloseTo(41.04, 1);
    expect(period(3) / period(1)).toBeCloseTo(27, 1);
  });
  it('Exercise 12.9: the Earth’s quantum number is about 2.6 × 10⁷⁴', () => {
    expect(quantumLog(6e24, 3e4, 1.5e11)).toBeCloseTo(74.41, 2);
  });
  it('the first radius is a₀ and the radii grow as n²', () => {
    expect(radius(1)).toBe(A0);
    expect(radius(4) / radius(2)).toBe(4);
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: three different levels increasing; the rings are n² times the first, and the dial winners form a narrow run', () => {
    for (const s of seeds) {
      const rounds = ringRounds(lcg(s));
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(rounds.map((r) => r.n)).toEqual([...rounds.map((r) => r.n)].sort((a, b) => a - b));
      expect(new Set(rounds.map((r) => r.n)).size).toBe(3);
      for (const r of rounds) {
        expect(r.rSol).toBeCloseTo(radius(r.n), 6);
        const winners = grid(SLIDERS.r.min, SLIDERS.r.max, SLIDERS.r.step).filter((x) => judgeRing(r, x));
        expect(winners.length).toBeGreaterThanOrEqual(1);
        for (const w of winners) expect(Math.abs(w - r.rSol) / r.rSol).toBeLessThanOrEqual(0.01 + 1e-9);
        // the neighbouring allowed rings are never accepted
        expect(judgeRing(r, radius(r.n + 1))).toBe(false);
        expect(judgeRing(r, radius(r.n - 1))).toBe(false);
      }
    }
  });
  it('level 2: levels 1, 2, 3; the speed and the lap time are both needed and within the dials', () => {
    const rounds = lapRounds();
    expect(rounds.map((r) => r.n)).toEqual([1, 2, 3]);
    for (const r of rounds) {
      expect(r.vSol).toBeGreaterThanOrEqual(SLIDERS.v.min);
      expect(r.vSol).toBeLessThanOrEqual(SLIDERS.v.max);
      expect(r.tSol).toBeGreaterThanOrEqual(SLIDERS.t.min);
      expect(r.tSol).toBeLessThanOrEqual(SLIDERS.t.max);
      expect(judgeLap(r, r.vSol, r.tSol).ok).toBe(true);
      expect(judgeLap(r, r.vSol, r.tSol * 2)).toMatchObject({ ok: false, vOk: true, tOk: false });
      expect(judgeLap(r, r.vSol * 2, r.tSol)).toMatchObject({ ok: false, vOk: false, tOk: true });
    }
  });
  it('level 3: the ball, the Moon and the Earth, with 34, 68 and 74 zeros, each reachable on the dial', () => {
    const rounds = bigRounds();
    expect(rounds.map((r) => r.name)).toEqual(['Ball', 'Moon', 'Earth']);
    expect(rounds.map((r) => Math.round(r.sol))).toEqual([34, 68, 74]);
    for (const r of rounds) {
      expect(r.sol).toBeLessThan(SLIDERS.log.max);
      expect(grid(SLIDERS.log.min, SLIDERS.log.max, SLIDERS.log.step).filter((x) => judgeBig(r, x)).length).toBeGreaterThanOrEqual(2);
      expect(judgeBig(r, r.sol + 1)).toBe(false);
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: n times a₀ (not n²), or a₀/n², fails', () => {
    for (const r of ringRounds(lcg(3))) {
      expect(judgeRing(r, A0 * r.n)).toBe(false);
      expect(judgeRing(r, A0 / (r.n * r.n))).toBe(false);
    }
  });
  it('level 2: speed growing with n, or the period growing as n², fails', () => {
    for (const r of lapRounds().slice(1)) {
      expect(judgeLap(r, V1 * r.n, r.tSol).vOk).toBe(false);
      expect(judgeLap(r, r.vSol, period(1) * r.n * r.n).tOk).toBe(false);
    }
  });
  it('level 3: forgetting that ħ is 10⁻³⁴ (giving log of mvr) fails', () => {
    for (const r of bigRounds()) expect(judgeBig(r, Math.log10(r.m * r.v * r.r))).toBe(false);
  });
});

describe('words: the working and the misses', () => {
  it('the working names the exercise', () => {
    expect(ringExplain(ringRounds(lcg(3))[0])[1]).toMatch(/Exercise 12\.7/);
    expect(lapExplain(lapRounds()[1])[1]).toMatch(/Exercise 12\.6/);
    expect(bigExplain(bigRounds()[2])[1]).toMatch(/Exercise 12\.9/);
  });
  it('a miss describes the effect and never states the answer', () => {
    const r = ringRounds(lcg(3))[0];
    expect(ringMiss(r, r.rSol * 2)).toMatch(/too wide/);
    expect(ringMiss(r, r.rSol / 2)).toMatch(/too small/);
    expect(ringMiss(r, r.rSol * 2)).not.toContain(`${r.rSol}`);
    const l = lapRounds()[1];
    expect(lapMiss(l, l.vSol, l.tSol * 3)).toMatch(/speed is right/);
    expect(lapMiss(l, l.vSol * 3, l.tSol)).toMatch(/lap time is right/);
    const b = bigRounds()[2];
    expect(bigMiss(b, b.sol + 5)).toMatch(/too many zeros/);
    expect(bigMiss(b, b.sol - 5)).toMatch(/short of zeros/);
  });
  it('test shots read out the numbers', () => {
    expect(ringReading(ringRounds(lcg(3))[0], 21.2)).toMatch(/level n = 2/);
    expect(lapReading(lapRounds()[0], 21.9, 1.5)).toMatch(/one lap takes/);
    expect(bigReading(bigRounds()[0])).toMatch(/mvr = 1 J s for Ball/);
  });
});
