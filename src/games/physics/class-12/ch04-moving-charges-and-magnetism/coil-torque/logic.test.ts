import { describe, expect, it } from 'vitest';
import {
  axialUT,
  buildLevel,
  circleArea,
  coilTorque,
  dipoleWork,
  equatorialUT,
  equilibrium,
  explainSolution,
  fmt,
  judgeCircular,
  judgeEnergy,
  judgeFar,
  judgeSquare,
  judgeSwing,
  moment,
  omega90,
  squareArea,
  starsFor,
  type LevelCircular,
  type LevelEnergy,
  type LevelFar,
  type LevelSquare,
  type LevelSwing,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('a 10 cm square coil of 20 turns with 12 A in 0.80 T at 30° feels 0.96 N m (Exercise 4.9)', () => {
    expect(coilTorque(20, 12, squareArea(10), 0.8, 30)).toBeCloseTo(0.96, 9);
  });
  it('30 turns of radius 8.0 cm with 6.0 A in 1.0 T at 60° need a counter torque of about 3.1 N m (Exercise 4.13)', () => {
    expect(coilTorque(30, 6, circleArea(8), 1, 60)).toBeCloseTo(3.13, 2);
  });
  it('100 turns of radius 10 cm with 3.2 A give a moment of 10 A m², and 20 rad/s after a quarter turn in 2 T with J = 0.1 (Example 4.10)', () => {
    const m = moment(100, 3.2, circleArea(10));
    expect(m).toBeCloseTo(10.05, 1);
    expect(omega90(10, 2, 0.1)).toBeCloseTo(20, 9);
  });
});

describe('the rules', () => {
  it('the torque is zero with the normal along the field and greatest with the plane along the field', () => {
    expect(coilTorque(10, 2, 0.01, 1, 0)).toBeCloseTo(0, 12);
    expect(coilTorque(10, 2, 0.01, 1, 90)).toBeGreaterThan(coilTorque(10, 2, 0.01, 1, 60));
  });
  it('the dipole work is zero at θ = 0 and 2mB at 180°; only 0 and 180 are equilibria', () => {
    expect(dipoleWork(5, 2, 0)).toBe(0);
    expect(dipoleWork(5, 2, 180)).toBeCloseTo(20, 9);
    expect(equilibrium(0)).toBe('stable');
    expect(equilibrium(180)).toBe('unstable');
    expect(equilibrium(90)).toBe('none');
  });
  it('the equatorial field is half the axial field, and both fall as 1/x³', () => {
    expect(equatorialUT(10, 1)).toBeCloseTo(axialUT(10, 1) / 2, 9);
    expect(axialUT(10, 1) / axialUT(10, 2)).toBeCloseTo(8, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: the torque wins; the cosine instead of the sine, or the area in cm², loses', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelSquare;
      expect(judgeSquare(l, l.torque).ok).toBe(true);
      expect(judgeSquare(l, l.torque * 1e4).ok).toBe(false);
      if (l.theta !== 45) expect(judgeSquare(l, coilTorque(l.n, l.i, squareArea(l.sideCm), l.b, 90 - l.theta)).ok).toBe(false);
    }
  });
  it('level 2: m, τ and "same" win; the torque with m alone (no B) loses', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelCircular;
      expect(l.torque).toBeCloseTo(l.m * l.b * Math.sin((l.theta * Math.PI) / 180), 9);
      expect(judgeCircular(l, l.m, l.torque, 'same').ok).toBe(true);
      expect(judgeCircular(l, l.m, l.torque, 'changes').shapeOk).toBe(false);
      if (Math.abs(l.b * Math.sin((l.theta * Math.PI) / 180) - 1) > 0.05) expect(judgeCircular(l, l.m, l.m, 'same').tOk).toBe(false);
    }
  });
  it('level 3: the final torque is mB, and ω = √(2mB/J)', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelSwing;
      expect(l.torque).toBeCloseTo(l.m * l.b, 9);
      expect(l.omega).toBeCloseTo(Math.sqrt((2 * l.m * l.b) / l.inertia), 9);
      expect(judgeSwing(l, l.torque, l.omega).ok).toBe(true);
      expect(judgeSwing(l, l.torque, Math.sqrt((l.m * l.b) / l.inertia)).wOk).toBe(false);
    }
  });
  it('level 4: all five angles occur; the work and the equilibrium kind win', () => {
    const angles = new Set<number>();
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelEnergy;
      angles.add(l.theta);
      expect(judgeEnergy(l, l.work, l.eq).ok).toBe(true);
      expect(judgeEnergy(l, l.work, l.eq === 'stable' ? 'unstable' : 'stable').eqOk).toBe(false);
    }
    expect(angles.size).toBe(5);
  });
  it('level 5: the axial and equatorial fields win; swapping them loses', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelFar;
      expect(l.axial).toBeCloseTo(2 * l.equatorial, 9);
      expect(judgeFar(l, l.axial, l.equatorial).ok).toBe(true);
      expect(judgeFar(l, l.equatorial, l.axial).ok).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/N I A B sin θ/, /shape does not matter/, /½Jω² = mB/, /potential energy|equilibrium/, /bar magnet/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
