import { describe, expect, it } from 'vitest';
import { REASON, VERDICT, buildLevel, explainSolution, fmt, judgeFaces, judgeHalf, judgeSpot, starsFor, type LevelFaces, type LevelHalf, type LevelSpot, type Verdict } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the rules', () => {
  it('only closed loops are magnetic; single-charge and charge-to-charge lines are electrostatic only', () => {
    expect(VERDICT['m-dipole']).toBe('magnetic');
    expect(VERDICT['m-solenoid']).toBe('magnetic');
    expect(VERDICT['e-dipole']).toBe('electrostatic');
    expect(VERDICT['e-radial']).toBe('electrostatic');
    expect(VERDICT['n-cross']).toBe('neither');
    expect(VERDICT['n-open']).toBe('neither');
    for (const k of Object.keys(REASON)) expect(REASON[k as keyof typeof REASON].length).toBeGreaterThan(10);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: six distinct diagrams; the right labels win; one wrong label is named; unset is flagged', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelSpot;
      expect(new Set(l.cards.map((c) => c.kind)).size).toBe(6);
      const truth = l.cards.map((c) => VERDICT[c.kind]) as (Verdict | null)[];
      expect(judgeSpot(l, truth).ok).toBe(true);
      const bad = [...truth];
      bad[2] = truth[2] === 'magnetic' ? 'neither' : 'magnetic';
      const r = judgeSpot(l, bad);
      expect(r.ok).toBe(false);
      expect(r.wrong).toEqual([l.cards[2].letter]);
      expect(judgeSpot(l, [null, ...truth.slice(1)]).unset).toBe(true);
    }
  });
  it('level 2: the five fluxes sum to zero and the missing one is never zero', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelFaces;
      expect(l.known.reduce((a, b) => a + b, 0) + l.missing).toBe(0);
      expect(l.missing).not.toBe(0);
      expect(judgeFaces(l, l.missing).ok).toBe(true);
      expect(judgeFaces(l, -l.missing).ok).toBe(false);
    }
  });
  it('level 3: the cut flux is opposite to the outer flux, both pole cases occur', () => {
    const poles = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelHalf;
      poles.add(l.pole);
      expect(l.outer + l.cut).toBe(0);
      expect(judgeHalf(l, l.cut).ok).toBe(true);
      expect(judgeHalf(l, -l.cut).signOk).toBe(false);
    }
    expect(poles.size).toBe(2);
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/magnetic\. It shows/, /Gauss's law for magnetism/, /no ends/];
    [1, 2, 3].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
