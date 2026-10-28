import { describe, expect, it } from 'vitest';
import { buildLevel, explainSolution, fmt, judgeDielectric, judgeShield, judgeSphere, spherePotential, sphereField, starsFor, type LevelDielectric, type LevelShield, type LevelSphere } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('a charged conducting sphere (Exercise 2.4)', () => {
  it('1.6 × 10⁻⁷ C on a 12 cm sphere: 0 inside, 10⁵ N/C just outside, 4.4 × 10⁴ N/C at 18 cm', () => {
    expect(sphereField(160, 12, 6)).toBe(0);
    expect(sphereField(160, 12, 12)).toBeCloseTo(1e5, -1);
    expect(sphereField(160, 12, 18)).toBeCloseTo(4.44e4, -2);
  });
  it('the field jumps across the surface but the potential does not', () => {
    expect(sphereField(160, 12, 11.99)).toBe(0);
    expect(sphereField(160, 12, 12)).toBeGreaterThan(0);
    expect(spherePotential(160, 12, 11.99)).toBeCloseTo(spherePotential(160, 12, 12), 6);
    expect(spherePotential(160, 12, 6)).toBeCloseTo(spherePotential(160, 12, 12), 6); // constant inside
    expect(spherePotential(160, 12, 24)).toBeCloseTo(spherePotential(160, 12, 12) / 2, 6);
  });
  it('outside, the radius does not matter, only the distance from the centre', () => {
    expect(sphereField(80, 8, 30)).toBeCloseTo(sphereField(80, 15, 30), 9);
  });
});

describe('level 1', () => {
  it('the answers follow the formulas, the marked distance is outside the sphere, and inside is zero', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelSphere;
      expect(l.r).toBeGreaterThan(l.R);
      expect(l.surface).toBeCloseTo(sphereField(l.q, l.R, l.R), 6);
      expect(l.atR).toBeCloseTo(sphereField(l.q, l.R, l.r), 6);
      expect(l.atR).toBeLessThan(l.surface);
      expect(judgeSphere(l, l.surface, l.atR, 'zero').ok).toBe(true);
    }
  });
  it('each part is judged separately, and a non-zero field inside is the classic mistake', () => {
    const l = buildLevel(1, lcg(3)) as LevelSphere;
    expect(judgeSphere(l, l.surface * 2, l.atR, 'zero').surfaceOk).toBe(false);
    expect(judgeSphere(l, l.surface, l.atR * 2, 'zero').atOk).toBe(false);
    expect(judgeSphere(l, l.surface, l.atR, 'not-zero').insideOk).toBe(false);
  });
  it('using the surface value at the marked distance (forgetting 1/r²) is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelSphere;
      expect(judgeSphere(l, l.surface, l.surface, 'zero').atOk).toBe(false);
    }
  });
});

describe('level 2: shielding', () => {
  it('has four different set-ups in a random order, and exactly one has no field at the probe', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelShield;
      expect(l.tiles).toHaveLength(4);
      expect(new Set(l.tiles.map((t) => t.caption)).size).toBe(4);
      expect(l.tiles.filter((t) => !t.field)).toHaveLength(1);
      const quiet = l.tiles.find((t) => !t.field)!;
      expect(quiet.charge).toBe('outside');
      expect(quiet.probe).toBe('cavity');
    }
    expect(new Set(seeds.map((s) => (buildLevel(2, lcg(s)) as LevelShield).tiles.map((t) => t.id + t.caption).join())).size).toBeGreaterThan(5);
  });
  it('shielding works only one way: any charge inside the cavity gives a field', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelShield;
      for (const t of l.tiles.filter((x) => x.charge === 'cavity')) expect(t.field).toBe(true);
    }
  });
  it('judging counts the wrong tiles, and unanswered tiles count as wrong', () => {
    const l = buildLevel(2, lcg(3)) as LevelShield;
    expect(judgeShield(l, l.tiles.map((t) => t.field)).ok).toBe(true);
    expect(judgeShield(l, l.tiles.map(() => true)).wrong).toBe(1);
    expect(judgeShield(l, l.tiles.map(() => null)).wrong).toBe(4);
    expect(judgeShield(l, l.tiles.map((t) => !t.field)).wrong).toBe(4);
  });
});

describe('level 3: dielectrics', () => {
  it('E inside is E₀/K, with three non-polar and two polar molecules on offer', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelDielectric;
      expect(l.answer).toBeCloseTo(l.e0 / l.k, 9);
      expect(l.molecules).toHaveLength(5);
      expect(l.molecules.filter((m) => m.polar)).toHaveLength(2);
      const polar = l.molecules.filter((m) => m.polar).map((m) => m.name);
      expect(judgeDielectric(l, l.answer, polar).ok).toBe(true);
    }
  });
  it('forgetting the dielectric (E = E₀), multiplying by K, or ticking a non-polar molecule are each caught', () => {
    const l = buildLevel(3, lcg(3)) as LevelDielectric;
    const polar = l.molecules.filter((m) => m.polar).map((m) => m.name);
    expect(judgeDielectric(l, l.e0, polar).eOk).toBe(false);
    expect(judgeDielectric(l, l.e0 * l.k, polar).eOk).toBe(false);
    expect(judgeDielectric(l, l.answer, [...polar, l.molecules.find((m) => !m.polar)!.name]).setOk).toBe(false);
    expect(judgeDielectric(l, l.answer, polar.slice(1)).setOk).toBe(false);
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(9, 1)).toBe(1);
  });
  it('levels are deterministic and differ between seeds', () => {
    for (const level of [1, 2, 3]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('every level explains the answer with the physics', () => {
    const must = [/Gaussian sphere inside the conductor/, /Shielding does not work the other way/, /dielectric constant K/];
    [1, 2, 3].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(1e5)).toBe('1 × 10⁵');
  });
});
