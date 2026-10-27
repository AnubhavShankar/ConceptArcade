import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  correctEnds,
  explainSolution,
  fmt,
  judgeCut,
  judgeMatch,
  judgeSolenoid,
  northAtLeft,
  otherPole,
  solenoidMoment,
  starsFor,
  type LevelCut,
  type LevelMatch,
  type LevelSolenoid,
  type Pole,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('800 turns, 2.5 × 10⁻⁴ m² and 3.0 A give 0.60 J/T (Exercise 5.3)', () => {
    expect(solenoidMoment(800, 3, 2.5)).toBeCloseTo(0.6, 9);
  });
  it('2000 turns, 1.6 × 10⁻⁴ m² and 4.0 A give 1.28 J/T (Exercise 5.6a)', () => {
    expect(solenoidMoment(2000, 4, 1.6)).toBeCloseTo(1.28, 9);
  });
});

describe('the rules', () => {
  it('every piece of a cut magnet is a complete magnet pointing the same way', () => {
    const l: LevelCut = { kind: 'cut', story: '', pieces: 3, dir: 'across', northLeft: true, freeTests: 1 };
    expect(correctEnds(l)).toEqual([['N', 'S'], ['N', 'S'], ['N', 'S']]);
    expect(correctEnds({ ...l, northLeft: false })).toEqual([['S', 'N'], ['S', 'N'], ['S', 'N']]);
  });
  it('the north pole is at the left end when the current on the front flows up', () => {
    expect(northAtLeft(true)).toBe(true);
    expect(northAtLeft(false)).toBe(false);
    expect(otherPole('N')).toBe('S');
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: both cuts and orientations occur; the right labels win and a flipped piece loses', () => {
    const dirs = new Set<string>();
    const orient = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelCut;
      dirs.add(l.dir);
      orient.add(l.northLeft);
      const truth = correctEnds(l) as Pole[][];
      expect(judgeCut(l, truth).ok).toBe(true);
      const bad = truth.map((p) => [...p]);
      bad[0] = [otherPole(bad[0][0]), otherPole(bad[0][1])];
      const res = judgeCut(l, bad);
      expect(res.ok).toBe(false);
      expect(res.wrongPieces).toEqual([0]);
      const blank = truth.map((p) => [...p]) as (Pole | null)[][];
      blank[l.pieces - 1][1] = null;
      expect(judgeCut(l, blank).unset).toBe(true);
    }
    expect(dirs.size).toBe(2);
    expect(orient.size).toBe(2);
  });
  it('level 2: both pole ends occur; the moment and pole win; the wrong end loses', () => {
    const ends = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelSolenoid;
      ends.add(l.frontUp);
      expect(judgeSolenoid(l, l.m, northAtLeft(l.frontUp)).ok).toBe(true);
      expect(judgeSolenoid(l, l.m, !northAtLeft(l.frontUp)).poleOk).toBe(false);
      expect(judgeSolenoid(l, l.m / l.n, northAtLeft(l.frontUp)).mOk).toBe(false);
    }
    expect(ends.size).toBe(2);
  });
  it('level 3: the current that makes the same moment wins', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelMatch;
      expect(solenoidMoment(l.n, l.i, l.aCm2)).toBeCloseTo(l.mBar, 9);
      expect(judgeMatch(l, l.i).ok).toBe(true);
      expect(judgeMatch(l, l.mBar).ok).toBe(l.mBar === l.i);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/complete magnet/, /m = N I A/, /equivalent when they have the same magnetic moment/];
    [1, 2, 3].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
