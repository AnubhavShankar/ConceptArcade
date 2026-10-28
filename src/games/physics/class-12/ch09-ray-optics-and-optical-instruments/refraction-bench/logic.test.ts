import { describe, expect, it } from 'vitest';
import {
  acceptanceDeg,
  apparentDepth,
  asinD,
  buildLevel,
  coneRadius,
  criticalDeg,
  explainSolution,
  judgeCone,
  judgeDepth,
  judgePipe,
  judgeSlab,
  judgeSnell,
  sinD,
  slabShift,
  starsFor,
  type LevelCone,
  type LevelDepth,
  type LevelPipe,
  type LevelSlab,
  type LevelSnell,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('Exercise 9.3: 12.5 cm of water that looks 9.4 cm deep has n = 1.33; in a liquid of n = 1.63 it looks 7.67 cm, so the microscope rises 1.73 cm', () => {
    expect(12.5 / 9.4).toBeCloseTo(1.33, 2);
    expect(apparentDepth(12.5, 1.63)).toBeCloseTo(7.67, 2);
    expect(9.4 - apparentDepth(12.5, 1.63)).toBeCloseTo(1.73, 2);
  });
  it('Exercise 9.4: air-glass 60° → 35.3°, air-water 60° → 40.6°; water at 45° into glass gives about 38.8°', () => {
    const nG = sinD(60) / sinD(35.3);
    const nW = sinD(60) / sinD(40.6);
    expect(asinD((nW * sinD(45)) / nG)).toBeCloseTo(38.8, 0);
  });
  it('Exercise 9.5: a bulb 80 cm under water (n = 1.33) lights a circle of radius 91 cm', () => {
    expect(coneRadius(80, 1.33)).toBeCloseTo(91.1, 0);
    expect(Math.PI * coneRadius(80, 1.33) ** 2 / 1e4).toBeCloseTo(2.6, 1);
  });
  it('Exercise 9.16: a 15 cm slab of n = 1.5 raises the pin by 5 cm', () => {
    expect(slabShift(15, 1.5)).toBeCloseTo(5, 9);
  });
  it('Exercise 9.17: core 1.68, cladding 1.44 gives 60°; with no cladding every angle is guided', () => {
    expect(acceptanceDeg(1.68, 1.44)).toBeCloseTo(60, 0);
    expect(acceptanceDeg(1.68, 1)).toBe(90);
  });
  it('the critical angle of water is about 48.8°', () => {
    expect(criticalDeg(1.33)).toBeCloseTo(48.75, 1);
  });
});

describe('every level is solvable', () => {
  it('level 1: a photographed angle set that gives a valid refraction, and the displayed angles are good enough to solve it', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelSnell;
      expect(l.answer).toBeGreaterThan(10);
      expect(l.answer).toBeLessThan(60);
      // working from the rounded photographs must still land within the tolerance
      const nW = sinD(l.airDeg) / sinD(l.rWater);
      const nG = sinD(l.airDeg) / sinD(l.rGlass);
      expect(judgeSnell(l, asinD((nW * sinD(l.inDeg)) / nG)).ok).toBe(true);
    }
  });
  it('level 2: the microscope move is non-zero and fits the tank', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelDepth;
      expect(Math.abs(l.move)).toBeGreaterThan(0.5);
      expect(Math.abs(l.move)).toBeLessThan(6);
      expect(l.n1).not.toBe(l.n2);
      expect(l.move > 0).toBe(l.n2 > l.n1);
    }
  });
  it('level 3: the slab shift is positive and below the thickness', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelSlab;
      expect(l.shift).toBeGreaterThan(0);
      expect(l.shift).toBeLessThan(l.t);
    }
  });
  it('level 4: the disc is wider than the depth for a thin medium and fits the picture', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelCone;
      expect(l.radius).toBeGreaterThan(0);
      expect(l.radius / l.d).toBeLessThan(1.4);
    }
  });
  it('level 5: the guided limit is between 20° and 90°', () => {
    const seen = new Set<number>();
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelPipe;
      expect(l.maxDeg).toBeGreaterThan(20);
      expect(l.maxDeg).toBeLessThanOrEqual(90);
      seen.add(Math.round(l.maxDeg));
    }
    expect(seen.size).toBeGreaterThan(3);
  });
  it('every level has a hero, a story and an objective', () => {
    for (const lv of [1, 2, 3, 4, 5]) {
      const l = buildLevel(lv, lcg(5));
      expect(l.hero.name.length).toBeGreaterThan(2);
      expect(l.hero.story.length).toBeGreaterThan(40);
      expect(l.hero.objective.length).toBeGreaterThan(20);
    }
  });
});

describe('judging', () => {
  it('level 1 rejects the mistake of using the air angle or the sine itself', () => {
    const l = buildLevel(1, lcg(3)) as LevelSnell;
    expect(judgeSnell(l, l.answer).ok).toBe(true);
    expect(judgeSnell(l, l.inDeg).ok).toBe(false);
    expect(judgeSnell(l, sinD(l.answer)).ok).toBe(false);
  });
  it('level 2 needs the right sign: up and down are different answers', () => {
    const l = buildLevel(2, lcg(3)) as LevelDepth;
    expect(judgeDepth(l, l.move).ok).toBe(true);
    expect(judgeDepth(l, -l.move).ok).toBe(false);
  });
  it('level 3 needs both the raise and "stays the same"', () => {
    const l = buildLevel(3, lcg(3)) as LevelSlab;
    expect(judgeSlab(l, l.shift, 'same').ok).toBe(true);
    expect(judgeSlab(l, l.shift, 'changes')).toMatchObject({ ok: false, sOk: true, cOk: false });
    expect(judgeSlab(l, l.t, 'same')).toMatchObject({ ok: false, sOk: false });
    expect(judgeSlab(l, l.t / l.n, 'same').ok).toBe(false);
  });
  it('level 4 rejects the depth itself and the critical-angle length d sin θc', () => {
    const l = buildLevel(4, lcg(3)) as LevelCone;
    expect(judgeCone(l, l.radius).ok).toBe(true);
    expect(judgeCone(l, l.d).ok).toBe(false);
    expect(judgeCone(l, l.d * Math.sin((criticalDeg(l.n) * Math.PI) / 180)).ok).toBe(false);
  });
  it('level 5 wins only at the widest guided angle: a narrower angle is guided but not the objective, a wider one leaks', () => {
    for (const s of seeds.slice(0, 40)) {
      const l = buildLevel(5, lcg(s)) as LevelPipe;
      expect(judgePipe(l, l.maxDeg).ok).toBe(true);
      expect(judgePipe(l, l.maxDeg * 0.5)).toMatchObject({ ok: false, guided: true });
      if (l.maxDeg < 85) expect(judgePipe(l, l.maxDeg + 5)).toMatchObject({ ok: false, guided: false });
    }
  });
});

describe('stars and the working', () => {
  it('stars', () => {
    expect(starsFor(0, 1)).toBe(3);
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains itself', () => {
    for (const lv of [1, 2, 3, 4, 5]) {
      const lines = explainSolution(buildLevel(lv, lcg(11)));
      expect(lines.length).toBeGreaterThanOrEqual(2);
      lines.forEach((t) => expect(t.length).toBeGreaterThan(20));
    }
  });
});
