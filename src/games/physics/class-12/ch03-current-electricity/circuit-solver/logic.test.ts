import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  cubeR,
  explainSolution,
  fmt,
  judgeCube,
  judgeJunction,
  judgeLoop,
  judgeReduce,
  judgeTwoLoop,
  networkR,
  parallelR,
  seriesR,
  starsFor,
  twoLoop,
  voltageAcrossR1,
  type LevelCube,
  type LevelJunction,
  type LevelLoop,
  type LevelReduce,
  type LevelTwoLoop,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('twelve 1 Ω edges across opposite corners of a cube give 5/6 Ω, so 10 V drives 12 A and 4 A per edge (Example 3.5)', () => {
    expect(cubeR(1)).toBeCloseTo(5 / 6, 9);
    expect(10 / cubeR(1)).toBeCloseTo(12, 9);
    expect(10 / cubeR(1) / 3).toBeCloseTo(4, 9);
  });
});

describe('the rules', () => {
  it('series adds, parallel is below the smallest', () => {
    expect(seriesR([2, 3, 4])).toBe(9);
    expect(parallelR([6, 3])).toBeCloseTo(2, 9);
  });
  it('the two-loop solution satisfies the junction rule and both loop rules', () => {
    for (const sign of [1, -1] as const) {
      const [e1, r1, e2, r2, r3] = [10, 2, 8, 4, 3];
      const { i1, i2, i3 } = twoLoop(e1, r1, e2, r2, r3, sign);
      expect(i1 + i2).toBeCloseTo(i3, 9);
      expect(e1 - i1 * r1 - i3 * r3).toBeCloseTo(0, 9);
      expect(sign * e2 - i2 * r2 - i3 * r3).toBeCloseTo(0, 9);
    }
  });
  it('R₁ in parallel with a chain has the full battery voltage', () => {
    expect(voltageAcrossR1('r1-parallel-with-chain', 4, 6, 6, 24)).toBe(24);
    expect(voltageAcrossR1('r1-series-with-pair', 4, 6, 3, 24)).toBeCloseTo((24 / 6) * 4, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(2);
    }
  });
  it('level 1: both topologies; R and V₁ win', () => {
    const tops = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelReduce;
      tops.add(l.topology);
      expect(l.req).toBeCloseTo(networkR(l.topology, l.r1, l.r2, l.r3), 9);
      expect(judgeReduce(l, l.req, l.vR1).ok).toBe(true);
      expect(judgeReduce(l, seriesR([l.r1, l.r2, l.r3]), l.vR1).reqOk).toBe(false);
    }
    expect(tops.size).toBe(2);
  });
  it('level 2: the known currents plus the fourth sum to zero, and never to zero without the fourth', () => {
    const dirs = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelJunction;
      const sum = l.known.reduce((a, b) => a + b, 0);
      expect(sum).not.toBe(0);
      dirs.add(l.fourthIn);
      expect(l.fourth).toBeCloseTo(Math.abs(sum), 9);
      expect(l.fourthIn).toBe(sum < 0);
      expect(judgeJunction(l, l.fourth, l.fourthIn).ok).toBe(true);
      expect(judgeJunction(l, l.fourth, !l.fourthIn).dirOk).toBe(false);
    }
    expect(dirs.size).toBe(2);
  });
  it('level 3: both orientations; I, V and the direction follow the loop rule', () => {
    const o = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelLoop;
      o.add(l.aiding);
      expect(l.i).toBeGreaterThan(0);
      expect(l.vR1).toBeCloseTo(l.i * l.r1, 9);
      expect(judgeLoop(l, l.i, l.vR1, l.clockwise).ok).toBe(true);
      expect(judgeLoop(l, l.i, l.vR1, !l.clockwise).dirOk).toBe(false);
      expect(judgeLoop(l, (l.e1 + l.e2) / (l.r1 + l.r2), l.vR1, l.clockwise).iOk).toBe(l.aiding);
    }
    expect(o.size).toBe(2);
  });
  it('level 4: both signs and both directions occur; currents are not tiny; I₃ = I₁ + I₂', () => {
    const signs = new Set<number>();
    const dirs = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelTwoLoop;
      signs.add(l.sign);
      dirs.add(l.down);
      expect(l.i3).toBeGreaterThanOrEqual(0.3);
      const sol = twoLoop(l.e1, l.r1, l.e2, l.r2, l.r3, l.sign);
      expect(sol.i1 + sol.i2).toBeCloseTo(sol.i3, 9);
      expect(judgeTwoLoop(l, Math.abs(l.i1), l.i3, l.down).ok).toBe(true);
      expect(judgeTwoLoop(l, Math.abs(l.i1), l.i3, !l.down).dirOk).toBe(false);
    }
    expect(signs.size).toBe(2);
    expect(dirs.size).toBe(2);
  });
  it('level 5: R_eq = 5R/6 and each edge carries a third of the total', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelCube;
      expect(l.req).toBeCloseTo((5 * l.r) / 6, 9);
      expect(l.total).toBeCloseTo(l.e / l.req, 9);
      expect(judgeCube(l, l.req, l.edge).ok).toBe(true);
      expect(judgeCube(l, l.req, l.total).edgeOk).toBe(false);
      expect(judgeCube(l, l.r, l.edge).reqOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/R₂₃/, /junction rule/, /Loop rule/, /Three unknowns/, /symmetry/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
