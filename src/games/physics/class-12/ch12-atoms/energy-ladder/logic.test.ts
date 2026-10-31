import { describe, expect, it } from 'vitest';
import { E1, SLIDERS, START, absorbExplain, absorbMiss, absorbReading, absorbRounds, beamExplain, beamMiss, beamReading, beamRounds, budgetExplain, budgetMiss, budgetReading, budgetRounds, jumpEv, jumpNm, judgeAbsorb, judgeBeam, judgeBudget, level, linesFor, topLevel } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Exercise 12.5: from n = 1 to n = 4 the photon has 12.75 eV, λ = 97.3 nm and f = 3.08 × 10¹⁵ Hz', () => {
    expect(jumpEv(1, 4)).toBeCloseTo(12.75, 2);
    expect(jumpNm(1, 4)).toBeCloseTo(97.25, 2);
    expect((jumpEv(1, 4) * 1.6e-19) / 6.63e-34 / 1e15).toBeCloseTo(3.08, 2);
  });
  it('Exercise 12.8: a 12.5 eV electron beam lifts hydrogen to n = 3 and gives 3 lines (two Lyman, one Balmer)', () => {
    expect(topLevel(12.5)).toBe(3);
    expect(linesFor(12.5)).toBe(3);
    expect(jumpNm(3, 1)).toBeCloseTo(102.6, 1);
    expect(jumpNm(2, 1)).toBeCloseTo(121.6, 1);
    expect(jumpNm(3, 2)).toBeCloseTo(656.5, 0);
  });
  it('Exercise 12.4: the ground state has K = +13.6 eV and U = −27.2 eV', () => {
    const r = budgetRounds(() => 0).find((x) => x.n === 1);
    expect(level(1)).toBeCloseTo(-E1, 9);
    expect(r === undefined || (r.ke === 13.6 && r.pe === -27.2)).toBe(true);
  });
  it('the beam thresholds are 10.2, 12.09, 12.75 and 13.06 eV for n = 2, 3, 4, 5', () => {
    expect(topLevel(10.19)).toBe(1);
    expect(topLevel(10.2)).toBe(2);
    expect(topLevel(12.09)).toBe(3);
    expect(topLevel(12.75)).toBe(4);
    expect(topLevel(13.06)).toBe(5);
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: three different jumps up the ladder; the dial winners are one short contiguous run around the exact wavelength', () => {
    for (const s of seeds) {
      const rounds = absorbRounds(lcg(s));
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(new Set(rounds.map((r) => `${r.from}>${r.to}`)).size).toBe(3);
      for (const r of rounds) {
        expect(r.to).toBeGreaterThan(r.from);
        const winners = grid(SLIDERS.lam.min, SLIDERS.lam.max, SLIDERS.lam.step).filter((l) => judgeAbsorb(r, l));
        expect(winners.length).toBeGreaterThanOrEqual(5);
        expect(winners.length).toBeLessThanOrEqual(70);
        for (const w of winners) expect(Math.abs(w - r.lamSol) / r.lamSol).toBeLessThanOrEqual(0.005 + 1e-9);
        expect(winners[winners.length - 1] - winners[0]).toBeCloseTo((winners.length - 1) * 0.1, 6);
      }
    }
  });
  it('level 2: each wanted line count has exactly the beam-energy window that gives it, and nothing outside it wins', () => {
    for (const s of seeds) {
      const rounds = beamRounds(lcg(s));
      expect(rounds.map((r) => r.lines)).toEqual([...rounds.map((r) => r.lines)].sort((a, b) => a - b));
      for (const r of rounds) {
        const winners = grid(SLIDERS.beam.min, SLIDERS.beam.max, SLIDERS.beam.step).filter((e) => judgeBeam(r, e));
        expect(winners.length).toBeGreaterThan(10);
        expect(winners[0]).toBeGreaterThanOrEqual(r.lo - 1e-6);
        expect(winners[winners.length - 1]).toBeLessThan(r.hi);
        expect(judgeBeam(r, r.lo - 0.05)).toBe(false);
        expect(judgeBeam(r, r.hi + 0.001)).toBe(false);
      }
    }
  });
  it('level 3: KE and PE come out as clean hundredths, KE + PE = E, and the two dials are needed together', () => {
    for (const s of seeds) {
      const rounds = budgetRounds(lcg(s));
      expect(rounds.map((r) => r.n)).toEqual([...rounds.map((r) => r.n)].sort((a, b) => a - b));
      for (const r of rounds) {
        expect(r.ke + r.pe).toBeCloseTo(level(r.n), 1);
        expect(judgeBudget(r, r.ke, r.pe).ok).toBe(true);
        expect(judgeBudget(r, r.ke, r.ke).ok).toBe(false);
        expect(judgeBudget(r, -r.pe, r.pe).ok).toBe(false);
      }
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: the wrong rung, or 13.6 eV for any jump, fails', () => {
    for (const r of absorbRounds(lcg(3))) {
      expect(judgeAbsorb(r, 1240 / 13.6)).toBe(r.lamSol === 91.18);
      expect(judgeAbsorb(r, jumpNm(r.from, r.to + 1))).toBe(false);
    }
  });
  it('level 3: kinetic energy equal to the total energy (sign dropped) is not the potential energy', () => {
    for (const r of budgetRounds(lcg(3))) {
      expect(judgeBudget(r, r.ke, level(r.n)).ok).toBe(false);
      expect(judgeBudget(r, -level(r.n) / 2, r.pe).ok).toBe(r.n < 0);
    }
  });
});

describe('words: the working and the misses', () => {
  it('the working names the exercise', () => {
    expect(absorbExplain(absorbRounds(lcg(3))[0])[1]).toMatch(/Exercise 12\.5/);
    expect(beamExplain(beamRounds(lcg(3))[0])[1]).toMatch(/Exercise 12\.8/);
    expect(budgetExplain(budgetRounds(lcg(3))[0])[1]).toMatch(/Exercise 12\.4/);
  });
  it('a miss describes the effect and never states the answer', () => {
    const a = absorbRounds(lcg(3))[0];
    expect(absorbMiss(a, 700)).toMatch(/too weak/);
    expect(absorbMiss(a, jumpNm(a.from, a.to + 1))).toMatch(/different rung|passes through/);
    expect(absorbMiss(a, 700)).not.toContain(`${a.lamSol} nm`);
    const b = beamRounds(lcg(3))[1];
    expect(beamMiss(b, 8)).toMatch(/not lifted high enough/);
    expect(beamMiss(b, 13.5)).toMatch(/lifted too high/);
    const c = budgetRounds(lcg(3))[0];
    expect(budgetMiss(c, 0, 0)).toMatch(/out of balance/);
  });
  it('test shots read out the energies', () => {
    expect(absorbReading(absorbRounds(lcg(3))[0], 100)).toMatch(/each photon has 12\.4 eV/);
    expect(beamReading(12.5)).toMatch(/up to level n = 3/);
    expect(budgetReading(budgetRounds(lcg(3))[0])).toMatch(/total energy/);
  });
});

describe('no leaks: the start and the misses', () => {
  it('the start never wins any round of its level', () => {
    for (const s of seeds) {
      for (const r of absorbRounds(lcg(s))) expect(judgeAbsorb(r, START.lam)).toBe(false);
      for (const r of beamRounds(lcg(s))) expect(judgeBeam(r, START.e)).toBe(false);
      for (const r of budgetRounds(lcg(s))) expect(judgeBudget(r, START.ke, START.pe).ok).toBe(false);
    }
  });
  it('level 2: every wrong beam on one side gives the same miss text, and it holds no number', () => {
    for (const s of seeds.slice(0, 20)) {
      for (const r of beamRounds(lcg(s))) {
        const wrong = grid(SLIDERS.beam.min, SLIDERS.beam.max, SLIDERS.beam.step * 5).filter((e) => !judgeBeam(r, e));
        for (const low of [true, false]) {
          const side = wrong.filter((e) => (linesFor(e) < r.lines) === low);
          if (side.length === 0) continue;
          expect(new Set(side.map((e) => beamMiss(r, e))).size).toBe(1);
          expect(beamMiss(r, side[0])).not.toMatch(/\d/);
        }
      }
    }
  });
  it('level 3: one miss text for every wrong pair, with no verdict on either dial and no number', () => {
    for (const r of budgetRounds(lcg(3))) {
      const texts = new Set<string>();
      for (const ke of [0, r.ke, r.ke + 2, 9]) for (const pe of [-20, r.pe, r.pe + 2, level(r.n)]) if (!judgeBudget(r, ke, pe).ok) texts.add(budgetMiss(r, ke, pe));
      expect(texts.size).toBe(1);
      expect([...texts][0]).not.toMatch(/\d|right|total/);
    }
  });
});
