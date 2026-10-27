import { describe, expect, it } from 'vitest';
import { apply, buildLevel, ground, isGoal, solve, starsForMoves, total, touch } from './logic';

const lcg = (seed: number) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

describe('the physics of contact', () => {
  it('two identical spheres each keep half of the combined charge', () => {
    expect(touch([8, 0, 0], 0, 1)).toEqual([4, 4, 0]);
    expect(touch([8, -4, 0], 0, 1)).toEqual([2, 2, 0]);
  });

  it('touching NEVER changes the total (conservation)', () => {
    for (let s = 1; s < 40; s++) {
      const r = lcg(s);
      let st = [Math.round(r() * 20 - 10), Math.round(r() * 20 - 10), Math.round(r() * 20 - 10), 0];
      const before = total(st);
      for (let k = 0; k < 6; k++) st = touch(st, Math.floor(r() * 2), 2 + Math.floor(r() * 2));
      expect(total(st)).toBeCloseTo(before, 10);
    }
  });

  it('only the Earth changes the total', () => {
    expect(total(ground([8, 4, 0], 0))).toBe(4);
    expect(ground([8, 4, 0], 0)).toEqual([0, 4, 0]);
  });

  it('apply dispatches both kinds of move', () => {
    expect(apply([8, 0], { kind: 'touch', a: 0, b: 1 })).toEqual([4, 4]);
    expect(apply([8, 0], { kind: 'ground', a: 0 })).toEqual([0, 0]);
  });

  it('isGoal respects "don\'t care"', () => {
    expect(isGoal([4, 2, 2], [4, 2, 2])).toBe(true);
    expect(isGoal([4, 2, 2], [null, 2, null])).toBe(true);
    expect(isGoal([4, 3, 1], [null, 2, null])).toBe(false);
  });
});

describe('solve (the benchmark)', () => {
  it('finds known optimal answers', () => {
    expect(solve([8, 0, 0], [4, 4, 0], false)).toBe(1);
    expect(solve([8, 0, 0], [4, 2, 2], false)).toBe(2);
    expect(solve([16, 0, 0, 0], [null, null, null, 2], false)).toBe(3); // one eighth takes three halvings
    expect(solve([8, 0], [8, 0], false)).toBe(0);
  });
  it('knows when a goal is impossible without the Earth', () => {
    expect(solve([8, 0, 0], [2, 2, 0], false)).toBeNull(); // total would have to drop from 8 to 4
    expect(solve([8, 0, 0], [2, 2, 0], true)).not.toBeNull();
  });
  it('conservation means no goal with a different total is ever reachable by touching', () => {
    expect(solve([8, 0, 0], [8, 8, 0], false)).toBeNull();
  });
});

describe('buildLevel: incremental levels', () => {
  it('every level is solvable and its par is the true minimum', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 15; s++) {
        const l = buildLevel(level, lcg(s));
        expect(solve(l.start, l.target, l.allowGround)).toBe(l.par);
        expect(isGoal(l.start, l.target)).toBe(false);
      }
    }
  });
  it('level 1: 3 spheres, one charged, par 2', () => {
    for (let s = 1; s < 20; s++) {
      const l = buildLevel(1, lcg(s));
      expect(l.start).toHaveLength(3);
      expect(l.start.filter((x) => x !== 0)).toHaveLength(1);
      expect(l.par).toBe(2);
      expect(l.allowGround).toBe(false);
    }
  });
  it('level 2: both signs present, par at least 3', () => {
    for (let s = 1; s < 20; s++) {
      const l = buildLevel(2, lcg(s));
      expect(l.start.some((x) => x > 0) && l.start.some((x) => x < 0)).toBe(true);
      expect(l.par).toBeGreaterThanOrEqual(3);
      expect(total(l.target as number[])).toBeCloseTo(total(l.start), 9); // reachable, so the totals must match
    }
  });
  it('level 3: a single goal of exactly one eighth, needing at least three moves', () => {
    for (let s = 1; s < 20; s++) {
      const l = buildLevel(3, lcg(s));
      const goals = l.target.filter((x) => x !== null);
      expect(goals).toHaveLength(1);
      expect(Math.abs(goals[0]!)).toBe(Math.abs(l.start[0]) / 8);
      expect(l.par).toBeGreaterThanOrEqual(3);
    }
  });
  it('level 4: needs the Ground tool and the goal total is smaller', () => {
    for (let s = 1; s < 20; s++) {
      const l = buildLevel(4, lcg(s));
      expect(l.allowGround).toBe(true);
      expect(solve(l.start, l.target, false)).toBeNull();
      expect(Math.abs(total(l.target as number[]))).toBeLessThan(Math.abs(total(l.start)));
    }
  });
  it('is deterministic for a seed', () => {
    for (const level of [1, 2, 3, 4]) expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
  });
});

describe('stars', () => {
  it('par is 3 stars, one extra is 2, more is 1', () => {
    expect(starsForMoves(3, 3)).toBe(3);
    expect(starsForMoves(2, 3)).toBe(3);
    expect(starsForMoves(4, 3)).toBe(2);
    expect(starsForMoves(7, 3)).toBe(1);
  });
});
