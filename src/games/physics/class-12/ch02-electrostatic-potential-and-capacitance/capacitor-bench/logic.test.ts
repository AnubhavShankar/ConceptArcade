import { describe, expect, it } from 'vitest';
import { buildLevel, chargeNc, explainSolution, fmt, gapFor, judgeCharge, judgePlate, judgeSlab, plateCapacitance, slabAfter, starsFor, voltageOf, type LevelCharge, type LevelPlate, type LevelSlab } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const energy = (cPf: number, v: number) => 0.5 * cPf * 1e-12 * v * v; // joules

describe('the numbers from the textbook exercises', () => {
  it('plates of 6 × 10⁻³ m² a distance of 3 mm apart have 17.7 pF, and hold 1.77 nC at 100 V (Exercise 2.8)', () => {
    expect(plateCapacitance(6e-3, 3)).toBeCloseTo(17.7, 1);
    expect(chargeNc(plateCapacitance(6e-3, 3), 100)).toBeCloseTo(1.77, 2);
  });
  it('an 8 pF capacitor with half the gap and a dielectric of 6 becomes 96 pF (Exercise 2.5)', () => {
    expect(8 * 2 * 6).toBe(96);
    const a = 6e-3;
    const c = plateCapacitance(a, 3);
    expect(plateCapacitance(a, 1.5) * 6).toBeCloseTo(c * 2 * 6, 6);
  });
  it('Q = CV and V = Q/C are inverses, and the gap for a capacitance is the inverse of C for a gap', () => {
    expect(voltageOf(chargeNc(12, 50), 12)).toBeCloseTo(50, 9);
    expect(gapFor(plateCapacitance(4e-3, 2), 4e-3)).toBeCloseTo(2, 9);
  });
  it('C ∝ 1/d and C ∝ A', () => {
    expect(plateCapacitance(4e-3, 4)).toBeCloseTo(plateCapacitance(4e-3, 2) / 2, 9);
    expect(plateCapacitance(8e-3, 2)).toBeCloseTo(2 * plateCapacitance(4e-3, 2), 9);
  });
});

describe('a dielectric slab, with the supply on or off', () => {
  it('connected: V is unchanged, Q is multiplied by K, energy is multiplied by K', () => {
    const { v, q } = slabAfter(true, 20, 100, 4);
    expect(v).toBe(100);
    expect(q).toBeCloseTo(4 * chargeNc(20, 100), 9);
    expect(energy(80, v)).toBeCloseTo(4 * energy(20, 100), 18);
  });
  it('disconnected: Q is unchanged, V is divided by K, energy is divided by K', () => {
    const { v, q } = slabAfter(false, 20, 100, 4);
    expect(q).toBeCloseTo(chargeNc(20, 100), 9);
    expect(v).toBeCloseTo(25, 9);
    expect(energy(80, v)).toBeCloseTo(energy(20, 100) / 4, 18);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: both modes appear, the answers follow Q = CV, and the wrong unit is a miss', () => {
    const modes = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelCharge;
      modes.add(l.mode);
      expect(l.q).toBeCloseTo((l.c * l.v) / 1000, 9);
      const answer = l.mode === 'charge' ? l.q : l.v;
      expect(judgeCharge(l, answer).ok).toBe(true);
      expect(judgeCharge(l, answer * 1000).ok).toBe(false); // pC vs nC
      expect(judgeCharge(l, answer * 0.5).verdict).toBe('too-small');
    }
    expect(modes.size).toBe(2);
  });
  it('level 2: the gap gives the capacitance and the second answer is 2K times the first', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelPlate;
      expect(l.c).toBeCloseTo(plateCapacitance(l.a, l.d), 9);
      expect(l.c2).toBeCloseTo(l.c * 2 * l.k, 9);
      expect(gapFor(l.c, l.a)).toBeCloseTo(l.d, 9);
      expect(judgePlate(l, l.d, l.c2).ok).toBe(true);
      expect(judgePlate(l, l.d, l.c * l.k).c2Ok).toBe(false); // forgetting that halving the gap doubles C
      expect(judgePlate(l, l.d, l.c * 2).c2Ok).toBe(false); // forgetting the dielectric
      expect(judgePlate(l, l.d * 2, l.c2).dOk).toBe(false);
    }
  });
  it('level 3: both situations appear and each answer follows the physics', () => {
    const flags = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelSlab;
      flags.add(l.connected);
      if (l.connected) {
        expect(l.v1).toBe(l.v0);
        expect(l.q1).toBeCloseTo(l.k * l.q0, 9);
      } else {
        expect(l.q1).toBeCloseTo(l.q0, 9);
        expect(l.v1).toBeCloseTo(l.v0 / l.k, 9);
      }
      expect(judgeSlab(l, l.v1, l.q1).ok).toBe(true);
    }
    expect(flags.size).toBe(2);
  });
  it('level 3: mixing up the two situations is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelSlab;
      const other = slabAfter(!l.connected, l.c0, l.v0, l.k);
      const r = judgeSlab(l, other.v, other.q);
      expect(r.ok).toBe(false);
      expect(r.vOk && r.qOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(9, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/C = Q\/V|V = Q\/C/, /C = ε₀A\/d/, /battery|isolated/];
    [1, 2, 3].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(17.7)).toBe('17.7');
  });
});
