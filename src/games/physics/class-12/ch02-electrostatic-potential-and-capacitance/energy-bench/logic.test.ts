import { describe, expect, it } from 'vitest';
import {
  assemblySteps,
  buildLevel,
  dipoleEnergy,
  dist,
  explainSolution,
  fmt,
  judgeDipole,
  judgeMove,
  judgeSystem,
  moveWork,
  pairEnergy,
  potentialAt,
  starsFor,
  systemEnergy,
  turnWork,
  type LevelDipole,
  type LevelMove,
  type LevelSystem,
  type Src,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('energy of a system of charges', () => {
  it('one pair: k q1 q2 / r, checked against SI (0.9 µJ for two 1 nC charges 1 cm apart)', () => {
    expect(pairEnergy(1, 1, 1)).toBeCloseTo((9e9 * 1e-18) / 0.01 * 1e6, 9);
    expect(pairEnergy(2, -3, 5)).toBeLessThan(0); // unlike charges: negative
    expect(pairEnergy(2, 3, 5)).toBeGreaterThan(0);
  });
  it('three charges: the sum over the three pairs', () => {
    const cs: Src[] = [{ q: 2, at: { x: 0, y: 0 } }, { q: 3, at: { x: 10, y: 0 } }, { q: -4, at: { x: 5, y: 8.66 } }];
    const u = pairEnergy(2, 3, 10) + pairEnergy(2, -4, dist(cs[0].at, cs[2].at)) + pairEnergy(3, -4, dist(cs[1].at, cs[2].at));
    expect(systemEnergy(cs)).toBeCloseTo(u, 9);
  });
  it('bringing the charges in one at a time costs the same in total, in any order', () => {
    const cs: Src[] = [{ q: 2, at: { x: 0, y: 0 } }, { q: 3, at: { x: 10, y: 0 } }, { q: -4, at: { x: 5, y: 8.66 } }];
    const total = (a: Src[]) => assemblySteps(a).reduce((x, y) => x + y, 0);
    expect(total(cs)).toBeCloseTo(systemEnergy(cs), 9);
    expect(total([cs[2], cs[0], cs[1]])).toBeCloseTo(total(cs), 9);
    expect(assemblySteps(cs)[0]).toBe(0); // the first charge costs nothing
  });
});

describe('moving a charge in a field', () => {
  it('the work is q(V_B − V_A), changes sign with the charge, and is undone by going back', () => {
    expect(moveWork(2, 100, 400)).toBe(600);
    expect(moveWork(-2, 100, 400)).toBe(-600);
    expect(moveWork(2, 400, 100)).toBe(-moveWork(2, 100, 400));
    expect(moveWork(2, 100, 100)).toBe(0);
  });
  it('the work is independent of the path: adding up the steps along any route gives the same total', () => {
    const fixed: Src[] = [{ q: 4, at: { x: -5, y: 0 } }, { q: -3, at: { x: 5, y: 0 } }];
    const A = { x: -14, y: 5 };
    const B = { x: 12, y: -4 };
    const route = (via: { x: number; y: number }[]) => {
      let w = 0;
      let prev = A;
      for (const p of [...via, B]) {
        w += moveWork(2, potentialAt(prev, fixed), potentialAt(p, fixed));
        prev = p;
      }
      return w;
    };
    expect(route([])).toBeCloseTo(route([{ x: 0, y: 10 }, { x: 8, y: 8 }]), 9);
    expect(route([{ x: -10, y: -9 }, { x: 3, y: -9 }])).toBeCloseTo(route([]), 9);
  });
});

describe('a dipole in a field', () => {
  const p = 4e-10;
  it('U = −pE cos θ: lowest along the field, highest against it', () => {
    expect(dipoleEnergy(p, 5000, 0)).toBeLessThan(dipoleEnergy(p, 5000, 90));
    expect(dipoleEnergy(p, 5000, 90)).toBeCloseTo(0, 9);
    expect(dipoleEnergy(p, 5000, 90)).toBeLessThan(dipoleEnergy(p, 5000, 180));
  });
  it('turning from 0 to 180° takes 2pE, and from 0 to 90° takes pE (Example 2.6)', () => {
    expect(turnWork(p, 5000, 0, 180)).toBeCloseTo(2 * p * 5000 * 1e6, 9);
    expect(turnWork(p, 5000, 0, 90)).toBeCloseTo(p * 5000 * 1e6, 9);
    expect(turnWork(p, 5000, 180, 0)).toBeCloseTo(-2 * p * 5000 * 1e6, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: the answer is the pair sum, the steps add up to it, and there is always a mix of signs', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelSystem;
      expect(l.answer).toBeCloseTo(systemEnergy(l.charges), 9);
      expect(l.steps.reduce((a, b) => a + b, 0)).toBeCloseTo(l.answer, 9);
      expect(new Set(l.charges.map((c) => Math.sign(c.q))).size).toBe(2);
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(dist(l.charges[i].at, l.charges[j].at)).toBeCloseTo(l.side, 6);
      expect(judgeSystem(l, l.answer).ok).toBe(true);
      expect(judgeSystem(l, l.answer * 1.1).ok).toBe(false);
    }
  });
  it('level 1: leaving out a pair or counting it twice is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelSystem;
      const twice = 2 * l.answer;
      expect(judgeSystem(l, twice).ok).toBe(false);
      const withoutLast = l.steps[0] + l.steps[1];
      if (Math.abs(withoutLast - l.answer) > 0.05 * Math.abs(l.answer)) expect(judgeSystem(l, withoutLast).ok).toBe(false);
    }
  });
  it('level 2: the answer is q(V_B − V_A), both signs of work occur, the points are clear of the charges', () => {
    const signs = new Set<number>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelMove;
      expect(l.answer).toBeCloseTo(l.testQ * (l.vB - l.vA), 9);
      expect(l.vA).toBeCloseTo(potentialAt(l.a, l.fixed), 9);
      signs.add(Math.sign(l.answer));
      expect(l.fixed.every((f) => dist(f.at, l.a) >= 4 && dist(f.at, l.b) >= 4)).toBe(true);
      expect(judgeMove(l, l.answer, 'same').ok).toBe(true);
      expect(judgeMove(l, -l.answer, 'same').wOk).toBe(false);
      expect(judgeMove(l, l.answer, 'longer-more').pathOk).toBe(false);
    }
    expect(signs.size).toBe(2);
  });
  it('level 3: the work is the change in U, with the dipole’s own p and E', () => {
    const signs = new Set<number>();
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelDipole;
      expect(l.answer).toBeCloseTo(l.u2 - l.u1, 9);
      expect(l.p).toBeCloseTo(l.q * 1e-9 * (l.sep / 100), 18);
      signs.add(Math.sign(l.answer));
      expect(judgeDipole(l, l.answer).ok).toBe(true);
      expect(judgeDipole(l, -l.answer).verdict).toBe('wrong-sign');
      expect(judgeDipole(l, l.answer * 2).ok).toBe(false);
    }
    expect(signs.size).toBe(2);
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(9, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/one at a time/, /conservative/, /−pE cos θ/];
    [1, 2, 3].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(0.9)).toBe('0.9');
  });
});
