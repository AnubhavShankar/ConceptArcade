import { describe, expect, it } from 'vitest';
import { BIAS_TOL, FREQ_TOL, RECT_START, RES_TOL, SLIDERS, SUPPLIES, barrierAfter, biasExplain, biasMiss, biasReading, biasRounds, biasSolution, curveExplain, curveMiss, curveReading, curveRounds, judgeBias, judgeCurve, judgeRect, rectExplain, rectMiss, rectReading, rectRounds, resistance, staticResistance } from './logic';

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
    for (const s of seeds) for (const r of rectRounds(lcg(s))) expect(r.sol).toBe(r.kind === 'half' ? r.f : 2 * r.f);
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
  it('level 2: kinds are shuffled, the three output frequencies differ, and each round has one run of winners that no other round shares', () => {
    const kindsAt = [new Set<string>(), new Set<string>(), new Set<string>()];
    for (const s of seeds) {
      const rounds = rectRounds(lcg(s));
      const mix = rounds.map((r) => r.kind).sort().join();
      expect(['full,full,half', 'full,half,half']).toContain(mix);
      expect(new Set(rounds.map((r) => r.sol)).size).toBe(3);
      expect(new Set(rounds.map((r) => r.f)).size).toBe(3);
      rounds.forEach((r, k) => kindsAt[k].add(r.kind));
      const all = new Map<number, number>();
      for (const r of rounds) {
        expect(SUPPLIES).toContain(r.f);
        expect(r.sol).toBeGreaterThan(SLIDERS.f.min);
        expect(r.sol).toBeLessThan(SLIDERS.f.max);
        const winners = grid(SLIDERS.f.min, SLIDERS.f.max, SLIDERS.f.step).filter((f) => judgeRect(r, f));
        expect(winners.length).toBe(2 * FREQ_TOL + 1);
        expect(winners).toContain(r.sol);
        for (const f of winners) all.set(f, (all.get(f) ?? 0) + 1);
      }
      // no dial value wins two rounds, so no setting is right "for every round"
      expect([...all.values()].every((n) => n === 1)).toBe(true);
    }
    for (const k of kindsAt) expect(k.size).toBe(2);
  });
  it('level 2: the dial starts where no round of any seed is won, and the pool has enough rows to avoid deduction', () => {
    for (const s of seeds) for (const r of rectRounds(lcg(s))) expect(judgeRect(r, RECT_START)).toBe(false);
    for (const f of SUPPLIES) for (const kind of ['half', 'full'] as const) {
      const sol = kind === 'half' ? f : 2 * f;
      expect(Math.abs(sol - RECT_START)).toBeGreaterThan(FREQ_TOL);
      expect(sol).toBeGreaterThan(SLIDERS.f.min + FREQ_TOL);
      expect(sol).toBeLessThan(SLIDERS.f.max - FREQ_TOL);
    }
    expect(SUPPLIES.length).toBeGreaterThanOrEqual(5);
    // rounds 1 and 2 never fix round 3: over many seeds the same first two rounds are followed by more than one third round
    const third = new Map<string, Set<string>>();
    for (let s = 0; s < 400; s++) {
      const [a, b, c] = rectRounds(lcg(s * 7919 + 13));
      const key = `${a.kind}${a.f}${b.kind}${b.f}`;
      third.set(key, (third.get(key) ?? new Set()).add(`${c.kind}${c.f}`));
    }
    expect([...third.values()].some((v) => v.size > 1)).toBe(true);
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
      expect(Math.abs((r.kind === 'half' ? 2 * r.f : r.f) - r.sol)).toBeGreaterThan(FREQ_TOL);
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
  it('a rectifier miss gives the direction only: the same words for every setting on one side, and never a ratio or a number', () => {
    for (const r of rectRounds(lcg(3))) {
      const fast = new Set<string>();
      const slow = new Set<string>();
      for (const f of grid(SLIDERS.f.min, SLIDERS.f.max, SLIDERS.f.step)) {
        if (judgeRect(r, f)) continue;
        (f > r.sol ? fast : slow).add(rectMiss(r, f));
      }
      expect([...fast]).toHaveLength(1);
      expect([...slow]).toHaveLength(1);
      expect([...fast][0]).toMatch(/faster than the circuit/);
      expect([...slow][0]).toMatch(/more slowly than the circuit/);
      expect(`${[...fast][0]}${[...slow][0]}`).not.toMatch(/\d|twice|half|every second/);
    }
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
