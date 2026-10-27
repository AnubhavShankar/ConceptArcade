import { describe, expect, it } from 'vitest';
import {
  bandsFor,
  bandsValue,
  buildLevel,
  currentThrough,
  explainSolution,
  fmt,
  formatOhms,
  isOhmic,
  judgeColour,
  judgeOhm,
  judgeOhmic,
  judgeRho,
  judgeStretch,
  resistance,
  starsFor,
  type LevelColour,
  type LevelOhm,
  type LevelOhmic,
  type LevelRho,
  type LevelStretch,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('15 m of wire with a 6.0 × 10⁻⁷ m² cross-section and 5.0 Ω has resistivity 2.0 × 10⁻⁷ Ω m (Exercise 3.4)', () => {
    expect(resistance(2, 15, 6)).toBeCloseTo(5, 9);
  });
});

describe('the rules', () => {
  it('a resistor obeys V = IR at every voltage; the lamp and the diode do not', () => {
    const r = { name: 'A', kind: 'resistor' as const, r: 10 };
    for (const v of [0.5, 1, 3, 6]) expect(v / currentThrough(r, v)).toBeCloseTo(10, 9);
    for (const kind of ['lamp', 'diode'] as const) {
      const c = { name: 'B', kind, r: 10 };
      const ratios = [1, 3, 6].map((v) => v / currentThrough(c, v));
      expect(Math.abs(ratios[0] - ratios[2]) / ratios[0]).toBeGreaterThan(0.15);
    }
  });
  it('currents are positive and rise with the voltage for every component', () => {
    for (const kind of ['resistor', 'lamp', 'diode'] as const) {
      const c = { name: 'A', kind, r: 10 };
      let last = 0;
      for (const v of [0.5, 1, 2, 3, 4, 5, 6]) {
        const i = currentThrough(c, v);
        expect(i).toBeGreaterThan(last);
        last = i;
      }
    }
  });
  it('the colour bands: yellow violet orange is 47 kΩ', () => {
    expect(bandsValue(4, 7, 3)).toBe(47000);
    expect(formatOhms(47000)).toBe('47 kΩ');
    expect(formatOhms(220)).toBe('220 Ω');
  });
  it('bandsFor gives bands whose value is the target, for every target in the game', () => {
    for (const t of [150, 220, 470, 680, 1000, 2200, 3300, 4700, 10000, 33000]) {
      const [a, b, m] = bandsFor(t);
      expect(bandsValue(a, b, m)).toBe(t);
    }
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(2);
    }
  });
  it('level 1: R = V/I wins, and the current at the highest voltage is below 3 A', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelOhm;
      expect(judgeOhm(l, l.r).ok).toBe(true);
      expect(judgeOhm(l, l.r * 2).ok).toBe(false);
      expect(l.volts[l.volts.length - 1] / l.r).toBeLessThan(3);
    }
  });
  it('level 2: one or two ohmic, always at least one non-ohmic; the right marks win and any other set loses', () => {
    const counts = new Set<number>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelOhmic;
      const truth = l.comps.filter(isOhmic).map((c) => c.name);
      counts.add(truth.length);
      expect(truth.length).toBeGreaterThanOrEqual(1);
      expect(truth.length).toBeLessThan(3);
      expect(judgeOhmic(l, truth).ok).toBe(true);
      expect(judgeOhmic(l, []).ok).toBe(false);
      expect(judgeOhmic(l, ['A', 'B', 'C']).wrong.length).toBe(3 - truth.length);
    }
    expect(counts.size).toBe(2);
  });
  it('level 3: ρ and the new resistance follow R = ρl/A; reusing R is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelRho;
      expect(l.r).toBeCloseTo(resistance(l.rhoE7, l.lenM, l.aE7), 9);
      expect(l.r2).toBeCloseTo((l.r * l.lenFactor) / l.radiusFactor ** 2, 9);
      expect(judgeRho(l, l.rhoE7, l.r2).ok).toBe(true);
      expect(judgeRho(l, l.rhoE7, l.r).r2Ok).toBe(l.lenFactor === l.radiusFactor ** 2);
      expect(judgeRho(l, l.r, l.r2).rhoOk).toBe(l.r === l.rhoE7);
    }
  });
  it('level 4: R scales as k² and the resistivity is unchanged', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelStretch;
      expect(l.r2).toBe(l.r * l.k * l.k);
      expect(judgeStretch(l, l.r2, 'unchanged').ok).toBe(true);
      expect(judgeStretch(l, l.r * l.k, 'unchanged').r2Ok).toBe(false);
      expect(judgeStretch(l, l.r2, 'increases').rhoOk).toBe(false);
    }
  });
  it('level 5: any bands with the right value win', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelColour;
      const [a, b, m] = bandsFor(l.target);
      expect(judgeColour(l, a, b, m).ok).toBe(true);
      expect(judgeColour(l, a, b, m + 1).ok).toBe(false);
      expect(judgeColour(l, a, b, m + 1).value).toBe(l.target * 10);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/Ohm's law/, /straight line/, /ρ = RA\/l/, /resistivity is a property/, /multiplier/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
