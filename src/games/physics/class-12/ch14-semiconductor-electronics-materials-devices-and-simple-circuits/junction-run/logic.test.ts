import { describe, expect, it } from 'vitest';
import { BIAS_TOL, FREQ_TOL, RES_TOL, SLIDERS, barrierAfter, biasExplain, biasMiss, biasReading, biasRounds, biasSolution, curveExplain, curveMiss, curveReading, curveRounds, judgeBias, judgeCurve, judgeRect, rectExplain, rectMiss, rectReading, rectRounds, resistance, staticResistance } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Example 14.4: 0.7 V at 10 mA and 0.8 V at 20 mA give 10 Ω; −10 V at −1 µA gives 1.0 × 10⁷ Ω', () => {
    expect(resistance({ kind: 'forward', v1: 0.7, i1: 10, v2: 0.8, i2: 20 })).toBeCloseTo(10, 9);
    expect(resistance({ kind: 'reverse', v1: -10, i1: -1, v2: -10, i2: -1 })).toBeCloseTo(1e7, 0);
  });
  it('Exercise 14.5: forward bias lowers the barrier of 0.7 V and reverse bias raises it', () => {
    const r = biasRounds(lcg(3))[0];
    expect(barrierAfter({ ...r, v0: 0.7 }, 0.3)).toBeCloseTo(0.4, 9);
    expect(barrierAfter({ ...r, v0: 0.7 }, -3)).toBeCloseTo(3.7, 9);
    expect(biasSolution('silicon', 'lower', 0.4)).toBeCloseTo(0.3, 9);
    expect(biasSolution('silicon', 'raise', 3.7)).toBeCloseTo(-3, 9);
  });
  it('Exercise 14.6: half-wave output has the supply frequency and full-wave has twice', () => {
    const rounds = rectRounds(lcg(3));
    expect(rounds.map((r) => r.kind)).toEqual(['half', 'full', 'full']);
    for (const r of rounds) expect(r.sol).toBe(r.kind === 'half' ? r.f : 2 * r.f);
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: lower, raise, then a repeat of either, each battery on the dial with a short run of winners', () => {
    for (const s of seeds) {
      const rounds = biasRounds(lcg(s));
      expect(rounds.slice(0, 2).map((r) => r.goal)).toEqual(['lower', 'raise']);
      expect(new Set(rounds.map((r) => `${r.material}${r.target}`)).size).toBe(3);
      for (const r of rounds) {
        expect(r.sol).toBeGreaterThan(SLIDERS.v.min);
        expect(r.sol).toBeLessThan(SLIDERS.v.max);
        expect(r.goal === 'lower' ? r.sol > 0 : r.sol < 0).toBe(true);
        const winners = grid(SLIDERS.v.min, SLIDERS.v.max, SLIDERS.v.step).filter((v) => judgeBias(r, v));
        expect(winners.length).toBeGreaterThanOrEqual(5);
        expect(barrierAfter(r, winners[Math.floor(winners.length / 2)])).toBeCloseTo(r.target, 1);
      }
    }
  });
  it('level 2: a half-wave then two full-wave rounds at different frequencies, each reachable with a short run of winners', () => {
    for (const s of seeds) {
      const rounds = rectRounds(lcg(s));
      expect(rounds[1].f).not.toBe(rounds[2].f);
      for (const r of rounds) {
        expect(r.sol).toBeGreaterThan(SLIDERS.f.min);
        expect(r.sol).toBeLessThan(SLIDERS.f.max);
        const winners = grid(SLIDERS.f.min, SLIDERS.f.max, SLIDERS.f.step).filter((f) => judgeRect(r, f));
        expect(winners.length).toBe(2 * FREQ_TOL + 1);
        expect(winners).toContain(r.sol);
      }
    }
  });
  it('level 3: two forward slopes and one reverse resistance, each on the dial', () => {
    for (const s of seeds) {
      const rounds = curveRounds(lcg(s));
      expect(rounds.map((r) => r.kind)).toEqual(['forward', 'forward', 'reverse']);
      expect(new Set(rounds.slice(0, 2).map((r) => `${r.v1}${r.i1}${r.v2}${r.i2}`)).size).toBe(2);
      for (const r of rounds) {
        expect(r.logSol).toBeGreaterThan(SLIDERS.r.min);
        expect(r.logSol).toBeLessThan(SLIDERS.r.max);
        const winners = grid(SLIDERS.r.min, SLIDERS.r.max, SLIDERS.r.step).filter((x) => judgeCurve(r, x));
        expect(winners.length).toBeGreaterThanOrEqual(9);
        expect(r.sol).toBeCloseTo(resistance(r), 6);
      }
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: the battery the wrong way round, or the target itself used as the battery, fails', () => {
    for (const s of seeds.slice(0, 20)) {
      for (const r of biasRounds(lcg(s))) {
        expect(judgeBias(r, -r.sol)).toBe(false);
        expect(judgeBias(r, r.target)).toBe(r.target === r.sol);
        expect(judgeBias(r, r.sol + 1.5 * BIAS_TOL)).toBe(false);
      }
    }
  });
  it('level 2: doubling a half-wave frequency or leaving a full-wave one alone fails', () => {
    for (const r of rectRounds(lcg(3))) {
      expect(judgeRect(r, r.kind === 'half' ? 2 * r.f : r.f)).toBe(false);
      expect(judgeRect(r, r.sol + 3)).toBe(false);
    }
  });
  it('level 3: V/I in forward bias instead of ΔV/ΔI fails', () => {
    for (const s of seeds) {
      for (const r of curveRounds(lcg(s)).slice(0, 2)) {
        expect(Math.abs(Math.log10(staticResistance(r)) - r.logSol)).toBeGreaterThan(2 * RES_TOL);
        expect(judgeCurve(r, Math.log10(staticResistance(r)))).toBe(false);
      }
    }
  });
});

describe('words: the working and the misses', () => {
  it('the working names the exercise or the example', () => {
    expect(biasExplain(biasRounds(lcg(3))[0])[1]).toMatch(/Exercises 14\.4, 14\.5; Example 14\.3/);
    expect(rectExplain(rectRounds(lcg(3))[0])[1]).toMatch(/Exercise 14\.6/);
    expect(curveExplain(curveRounds(lcg(3))[0])[1]).toMatch(/Example 14\.4/);
  });
  it('a bias miss names the effect: the wrong polarity, too high or too low a barrier, and never the voltage', () => {
    const [low, high] = biasRounds(lcg(3));
    expect(biasMiss(low, -2)).toMatch(/pulls the carriers away/);
    expect(biasMiss(high, 0.3)).toMatch(/pushes the carriers towards/);
    expect(biasMiss(low, low.sol - 0.2)).toMatch(/higher than the one the hopper/);
    expect(biasMiss(low, low.sol + 0.2)).toMatch(/lower than the one the hopper/);
    expect(biasMiss(low, -2)).not.toContain(String(low.sol));
  });
  it('a rectifier miss names the effect, and the classic doublings are caught', () => {
    const [half, full] = rectRounds(lcg(3));
    expect(rectMiss(half, 2 * half.f)).toMatch(/twice as often/);
    expect(rectMiss(full, full.f)).toMatch(/missing every second flash/);
    expect(rectMiss(full, full.sol + 30)).toMatch(/faster than the circuit/);
    expect(rectMiss(full, full.sol - 30)).toMatch(/more slowly than the circuit/);
  });
  it('a curve miss names the effect, and the static-resistance slip gets its own message', () => {
    const [fw, , rv] = curveRounds(lcg(3));
    expect(curveMiss(fw, Math.log10(staticResistance(fw)))).toMatch(/line from the origin/);
    expect(curveMiss(fw, fw.logSol + 1)).toMatch(/hardly change/);
    expect(curveMiss(fw, fw.logSol - 1)).toMatch(/shoot up/);
    expect(curveMiss(rv, rv.logSol + 1)).toMatch(/less than the curve shows/);
    expect(curveMiss(rv, rv.logSol - 1)).toMatch(/much more reverse current/);
  });
  it('test shots read out the helpful numbers', () => {
    expect(biasReading(biasRounds(lcg(3))[0], 0.2)).toMatch(/built-in barrier of .* V. You set a forward battery of 0\.2 V/);
    expect(rectReading(rectRounds(lcg(3))[0])).toMatch(/one diode/);
    expect(rectReading(rectRounds(lcg(3))[1])).toMatch(/two diodes/);
    expect(curveReading(curveRounds(lcg(3))[0])).toMatch(/voltage rises by .* V while the current rises by .* mA/);
    expect(curveReading(curveRounds(lcg(3))[2])).toMatch(/reverse current is −\d.* µA/);
  });
});
