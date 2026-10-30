import { describe, expect, it } from 'vitest';
import { ELEMENTS, HIT, SLIDERS, START, closestFm, stopFm, energyFor, foilExplain, foilMiss, foilReading, foilRounds, judgeFoil, judgeRange, rangeExplain, rangeMiss, rangeReading, rangeRounds } from './logic';

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

describe('no leaks: the start, the burst point and the misses', () => {
  const ringX = (fm: number) => 540 - 6 * fm;
  it('the start never wins any round of either level', () => {
    for (const s of seeds) {
      for (const r of rangeRounds(lcg(s))) expect(judgeRange(r, START.k)).toBe(false);
      for (const r of foilRounds(lcg(s))) expect(judgeFoil(r, START.z)).toBe(false);
    }
  });
  it('the burst point is one fixed point, far from every ring the game can draw', () => {
    for (const s of seeds) {
      for (const r of rangeRounds(lcg(s))) expect(Math.abs(HIT[0] - ringX(r.target))).toBeGreaterThan(20);
      for (const r of foilRounds(lcg(s))) expect(Math.abs(HIT[0] - ringX(r.turn))).toBeGreaterThan(20);
    }
  });
  it('level 1: every wrong energy on one side gives the same miss text and the same stopping place, and the text holds no number', () => {
    for (const s of seeds.slice(0, 20)) {
      for (const r of rangeRounds(lcg(s))) {
        const wrong = grid(SLIDERS.k.min, SLIDERS.k.max, SLIDERS.k.step * 5).filter((k) => !judgeRange(r, k));
        for (const close of [true, false]) {
          const side = wrong.filter((k) => (closestFm(r.z, k) < r.target) === close);
          expect(new Set(side.map((k) => rangeMiss(r, k))).size).toBe(1);
          expect(new Set(side.map((k) => stopFm(closestFm(r.z, k), r.target, false))).size).toBe(1);
          expect(rangeMiss(r, side[0])).not.toMatch(/\d/);
        }
      }
    }
  });
  it('level 2: every wrong Z on one side gives the same miss text and the same stopping place, and the text holds no number', () => {
    for (const s of seeds.slice(0, 20)) {
      for (const r of foilRounds(lcg(s))) {
        const wrong = grid(SLIDERS.z.min, SLIDERS.z.max, SLIDERS.z.step).filter((z) => !judgeFoil(r, z));
        for (const high of [true, false]) {
          const side = wrong.filter((z) => (z > r.zSol) === high);
          expect(new Set(side.map((z) => foilMiss(r, z))).size).toBe(1);
          expect(new Set(side.map((z) => stopFm(closestFm(z, r.k), r.turn, false))).size).toBe(1);
          expect(foilMiss(r, side[0])).not.toMatch(/\d/);
        }
      }
    }
  });
  it('a miss stops inside the ring when too close and beyond it when too soon, a win stops where the turning point is', () => {
    expect(stopFm(10, 20, false)).toBeLessThan(20);
    expect(stopFm(30, 20, false)).toBeGreaterThan(20);
    expect(stopFm(19.9, 20, true)).toBe(19.9);
  });
  it('the foil pool is wide: all seven elements come up across plays, and each has a name', () => {
    const seen = new Set<number>();
    for (const s of seeds) for (const r of foilRounds(lcg(s))) seen.add(r.zSol);
    expect(seen.size).toBe(7);
    for (const z of seen) expect(ELEMENTS[z]).toBeDefined();
  });
});
