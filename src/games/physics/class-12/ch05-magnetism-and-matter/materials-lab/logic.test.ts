import { describe, expect, it } from 'vitest';
import {
  MATERIALS,
  MU0,
  buildLevel,
  explainSolution,
  fmt,
  judgeChi,
  judgeCore,
  judgeCurie,
  judgePick,
  kindOf,
  starsFor,
  type LevelChi,
  type LevelCore,
  type LevelCurie,
  type LevelPick,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the rules', () => {
  it('the sign and size of χ give the kind of material', () => {
    expect(kindOf(-1e-5)).toBe('diamagnetic');
    expect(kindOf(2e-5)).toBe('paramagnetic');
    expect(kindOf(1999)).toBe('ferromagnetic');
  });
  it('B = μ₀(H + M) and B = μ₀μᵣH agree', () => {
    for (const s of seeds.slice(0, 20)) {
      const l = buildLevel(1, lcg(s)) as LevelCore;
      expect(MU0 * (l.h + l.m)).toBeCloseTo(l.b, 12);
    }
  });
  it('no material is listed under two kinds', () => {
    const all = [...MATERIALS.diamagnetic, ...MATERIALS.paramagnetic, ...MATERIALS.ferromagnetic];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: H, M and B win; mistaking M for H loses', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelCore;
      expect(judgeCore(l, l.h, l.m, l.b).ok).toBe(true);
      expect(judgeCore(l, l.h, l.h, l.b).mOk).toBe(false);
      expect(judgeCore(l, l.h, l.m, MU0 * l.h).bOk).toBe(false);
    }
  });
  it('level 2: all three kinds occur; χ and the kind win', () => {
    const kinds = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelChi;
      kinds.add(l.type);
      expect(kindOf(l.chiUnits * l.unit)).toBe(l.type);
      expect(judgeChi(l, l.chiUnits, l.type).ok).toBe(true);
      expect(judgeChi(l, l.chiUnits, l.type === 'diamagnetic' ? 'paramagnetic' : 'diamagnetic').typeOk).toBe(false);
      expect(judgeChi(l, -l.chiUnits, l.type).chiOk).toBe(false);
    }
    expect(kinds.size).toBe(3);
  });
  it('level 3: χ ∝ 1/T; colder gives a larger χ', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelCurie;
      expect(l.chi2 * l.t2).toBeCloseTo(l.chi1 * l.t1, 9);
      expect(l.t1).not.toBe(l.t2);
      expect(judgeCurie(l, l.chi2).ok).toBe(true);
      expect(judgeCurie(l, (l.chi1 * l.t2) / l.t1).ok).toBe(l.t1 === l.t2);
    }
  });
  it('level 4: one of each kind; the right picks win', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelPick;
      expect(new Set(l.options).size).toBe(3);
      expect(judgePick(l, l.repelled, l.weak, l.strong).ok).toBe(true);
      expect(judgePick(l, l.strong, l.weak, l.repelled).rOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/μ₀μᵣH/, /μᵣ = 1 \+ χ/, /Curie/, /diamagnetic/];
    [1, 2, 3, 4].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
