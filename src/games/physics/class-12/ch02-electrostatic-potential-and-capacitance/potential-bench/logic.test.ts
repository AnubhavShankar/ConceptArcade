import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  dipoleExact,
  dipolePotential,
  explainSolution,
  fieldAt,
  fmt,
  judgeDipole,
  judgePoint,
  judgePolygon,
  judgeZero,
  polygonPotential,
  potential,
  potentialAt,
  starsFor,
  workMilli,
  type LevelDipole,
  type LevelPoint,
  type LevelPolygon,
  type LevelZero,
  type Src,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the potential of point charges', () => {
  it('is kq/r, checked against SI, with the sign of the charge', () => {
    expect(potential(1, 1)).toBeCloseTo((9e9 * 1e-9) / 0.01, 6);
    expect(potential(-4, 10)).toBeCloseTo((9e9 * -4e-9) / 0.1, 6);
    expect(potential(5, 20)).toBeGreaterThan(0);
    expect(potential(-5, 20)).toBeLessThan(0);
  });
  it('falls as 1/r (not 1/r²)', () => {
    expect(potential(3, 20)).toBeCloseTo(potential(3, 10) / 2, 9);
  });
  it('the work to bring a charge from infinity is qV', () => {
    expect(workMilli(2, 450)).toBeCloseTo(0.9, 9); // 2 µC × 450 V = 0.9 mJ
    expect(workMilli(2, -450)).toBeLessThan(0);
  });
});

describe('a system of charges', () => {
  it('a hexagon of 5 µC charges 10 cm from the centre gives 2.7 × 10⁶ V there (Exercise 2.2)', () => {
    expect(polygonPotential(6, 5000, 10)).toBeCloseTo(2.7e6, -2);
  });
  it('but the field at the centre of such a polygon is zero', () => {
    for (const n of [3, 4, 5, 6]) {
      const srcs: Src[] = Array.from({ length: n }, (_, k) => ({ q: 4, at: { x: 10 * Math.cos((2 * Math.PI * k) / n), y: 10 * Math.sin((2 * Math.PI * k) / n) } }));
      const e = fieldAt({ x: 0, y: 0 }, srcs);
      expect(Math.hypot(e.x, e.y)).toBeCloseTo(0, 9);
      expect(potentialAt({ x: 0, y: 0 }, srcs)).toBeCloseTo(polygonPotential(n, 4, 10), 9);
    }
  });
  it('charges of 5 × 10⁻⁸ C and −3 × 10⁻⁸ C, 16 cm apart, give zero potential 10 cm and 40 cm from the larger one (Exercise 2.1)', () => {
    const srcs: Src[] = [{ q: 50, at: { x: 0, y: 0 } }, { q: -30, at: { x: 16, y: 0 } }];
    expect(potentialAt({ x: 10, y: 0 }, srcs)).toBeCloseTo(0, 6);
    expect(potentialAt({ x: 40, y: 0 }, srcs)).toBeCloseTo(0, 6);
    expect(potentialAt({ x: 25, y: 0 }, srcs)).not.toBeCloseTo(0, 1);
  });
});

describe('the dipole', () => {
  it('the potential on the equatorial plane is zero, and opposite on opposite sides along the axis', () => {
    expect(dipolePotential(4, 4, 30, 90)).toBe(0);
    expect(dipolePotential(4, 4, 30, 0)).toBeCloseTo(-dipolePotential(4, 4, 30, 180), 9);
    expect(dipolePotential(4, 4, 30, 0)).toBeGreaterThan(0);
  });
  it('the far-field formula agrees with the exact two-charge potential within 6% for r ≥ 10a', () => {
    for (const th of [0, 60, 120, 180]) {
      const a = dipolePotential(4, 4, 30, th);
      const b = dipoleExact(4, 4, 30, th);
      expect(Math.abs(a - b) / Math.abs(b)).toBeLessThan(0.06);
    }
    expect(Math.abs(dipoleExact(4, 4, 30, 90))).toBeLessThan(1e-9);
  });
  it('falls as 1/r²', () => {
    expect(dipolePotential(4, 4, 40, 0)).toBeCloseTo(dipolePotential(4, 4, 20, 0) / 4, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: the answer distance gives the target potential and the work is qV, for both signs', () => {
    const signs = new Set<number>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelPoint;
      signs.add(Math.sign(l.Q));
      expect(potential(l.Q, l.rAnswer)).toBeCloseTo(l.target, 9);
      expect(l.work).toBeCloseTo(l.testQ * l.target * 1e-3, 9);
      expect(judgePoint(l, l.rAnswer, l.work).ok).toBe(true);
      expect(judgePoint(l, l.rAnswer * 1.2, l.work).rOk).toBe(false);
      expect(judgePoint(l, l.rAnswer, l.work * 2).workOk).toBe(false);
      expect(judgePoint(l, l.rAnswer, -l.work).workOk).toBe(false); // the sign matters
    }
    expect(signs.size).toBe(2);
  });
  it('level 2: the polygon potential is n kq/R, the field answer is always zero, and the sign follows the charge', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelPolygon;
      expect(l.answer).toBeCloseTo(l.n * potential(l.q, l.R), 9);
      expect(judgePolygon(l, l.answer, 'zero').ok).toBe(true);
      expect(judgePolygon(l, l.answer, 'not-zero').fieldOk).toBe(false);
      expect(judgePolygon(l, l.answer / l.n, 'zero').vOk).toBe(false); // forgetting that they all add
    }
  });
  it('level 3: both zero points really have zero potential, and they are in the right places', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelZero;
      const srcs: Src[] = [{ q: l.big, at: { x: 0, y: 0 } }, { q: l.small, at: { x: l.d, y: 0 } }];
      expect(Math.abs(potentialAt({ x: l.between, y: 0 }, srcs))).toBeLessThan(1e-6);
      expect(Math.abs(potentialAt({ x: l.outside, y: 0 }, srcs))).toBeLessThan(1e-6);
      expect(l.between).toBeLessThan(l.d);
      expect(l.outside).toBeGreaterThan(l.d);
      expect(Math.sign(l.big)).toBe(-Math.sign(l.small));
      expect(Math.abs(l.big)).toBeGreaterThan(Math.abs(l.small));
      expect(judgeZero(l, l.between, l.outside).ok).toBe(true);
      expect(judgeZero(l, l.d / 2, l.outside).betweenOk).toBe(false); // the midpoint is the classic wrong answer
      expect(judgeZero(l, l.between, l.d + 5).outsideOk).toBe(false);
    }
  });
  it('level 3: the positive charge is sometimes the larger one and sometimes the smaller', () => {
    expect(new Set(seeds.map((s) => Math.sign((buildLevel(3, lcg(s)) as LevelZero).big))).size).toBe(2);
  });
  it('level 4: the answer follows the formula and agrees with the exact potential; the equatorial answer is exactly zero', () => {
    const thetas = new Set<number>();
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelDipole;
      thetas.add(l.theta);
      expect(l.answer).toBeCloseTo(dipolePotential(l.q, l.sep, l.r, l.theta), 9);
      if (l.theta === 90) expect(l.answer).toBe(0);
      else expect(Math.abs(dipoleExact(l.q, l.sep, l.r, l.theta) - l.answer) / Math.abs(l.answer)).toBeLessThan(0.06);
      expect(judgeDipole(l, l.answer).ok).toBe(true);
    }
    expect(thetas.size).toBe(5);
  });
  it('level 4: the wrong sign or size is told apart, and a non-zero answer on the equatorial plane is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelDipole;
      if (l.theta === 90) {
        expect(judgeDipole(l, 12).ok).toBe(false);
      } else {
        expect(judgeDipole(l, -l.answer).verdict).toBe('wrong-sign');
        expect(judgeDipole(l, l.answer * 2).verdict).toBe('too-big');
        expect(judgeDipole(l, l.answer / 2).verdict).toBe('too-small');
      }
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
    const must = [/scalar/, /scalars|plain numbers/, /ratio of their magnitudes/, /cos θ/];
    [1, 2, 3, 4].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(2.7e6)).toBe('2.7 × 10⁶');
  });
});
