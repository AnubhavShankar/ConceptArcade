import { describe, expect, it } from 'vitest';
import {
  bInsidePicoT,
  buildLevel,
  displacementCurrent,
  dvdt,
  explainSolution,
  fmt,
  judgeAc,
  judgeCharge,
  judgeDisplacement,
  plateCapacitancePF,
  starsFor,
  type LevelAc,
  type LevelCharge,
  type LevelDisplacement,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('plates of radius 12 cm, 5.0 cm apart and 0.15 A: C ≈ 8.0 pF and dV/dt ≈ 1.9 × 10¹⁰ V/s (Exercise 8.1, with the 5.0 cm gap as printed)', () => {
    const c = plateCapacitancePF(12, 5);
    expect(c).toBeCloseTo(8.01, 1);
    expect(dvdt(0.15, c)/1e10).toBeCloseTo(1.87, 1);
  });
  it('100 pF, 230 V, 300 rad/s: I_rms = 6.9 µA (Exercise 8.2)', () => {
    expect(230 * 300 * 100e-12 * 1e6).toBeCloseTo(6.9, 6);
  });
  it('B at 3.0 cm from the axis for plates of radius 6.0 cm is about 1.6 × 10⁻¹¹ T (Exercise 8.2)', () => {
    expect(bInsidePicoT(Math.SQRT2 * 6.9e-6, 3, 6)).toBeCloseTo(16.3, 0);
  });
});

describe('the rules', () => {
  it('the displacement current equals the conduction current that charges the plates', () => {
    const i = 0.15;
    const aCm2 = Math.PI * 12 * 12;
    const dEdt = i / (8.854e-12 * aCm2 * 1e-4);
    expect(displacementCurrent(aCm2, dEdt)).toBeCloseTo(i, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: C and dV/dt win; a radius used as a diameter loses', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelCharge;
      expect(judgeCharge(l, l.cPF, l.rate).ok).toBe(true);
      expect(judgeCharge(l, l.cPF * 4, l.rate).cOk).toBe(false);
    }
  });
  it('level 2: the displacement current and "holds" win; "fails" loses', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelDisplacement;
      expect(judgeDisplacement(l, l.id, 'holds').ok).toBe(true);
      expect(judgeDisplacement(l, l.id, 'fails').rOk).toBe(false);
      expect(judgeDisplacement(l, l.id * 1e6, 'holds').iOk).toBe(false);
    }
  });
  it('level 3: the rms current and the field amplitude win; the rms value used for the peak loses', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelAc;
      expect(judgeAc(l, l.iRmsMicro, l.bPico).ok).toBe(true);
      expect(judgeAc(l, l.iRmsMicro, l.bPico / Math.SQRT2).bOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/C dV\/dt/, /junction rule/, /Ampère–Maxwell/];
    [1, 2, 3].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
