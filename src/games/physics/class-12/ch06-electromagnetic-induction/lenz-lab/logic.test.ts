import { describe, expect, it } from 'vitest';
import {
  CAUSES,
  buildLevel,
  explainSolution,
  fmt,
  judgeLoop,
  judgeMagnet,
  judgeRod,
  loopSense,
  magnetForce,
  magnetSense,
  rodCurrent,
  rodForce,
  rodPower,
  starsFor,
  type LevelLoop,
  type LevelMagnet,
  type LevelRod,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the rules', () => {
  it('a north pole approaching gives anticlockwise current seen from the magnet, and it is repelled (Section 6.5)', () => {
    expect(magnetSense('north', 'approach')).toBe('anticlockwise');
    expect(magnetSense('north', 'recede')).toBe('clockwise');
    expect(magnetSense('south', 'approach')).toBe('clockwise');
    expect(magnetSense('south', 'recede')).toBe('anticlockwise');
    expect(magnetForce('approach')).toBe('repels');
    expect(magnetForce('recede')).toBe('attracts');
  });
  it('field into the page and increasing gives an anticlockwise current; no change gives none', () => {
    expect(loopSense(true, 'increasing')).toBe('anticlockwise');
    expect(loopSense(true, 'decreasing')).toBe('clockwise');
    expect(loopSense(false, 'increasing')).toBe('clockwise');
    expect(loopSense(false, 'decreasing')).toBe('anticlockwise');
    expect(loopSense(true, 'none')).toBe('none');
  });
  it('the work done on the rod equals the heat: P = F v = I² R', () => {
    expect(rodPower(0.5, 0.2, 2, 0.1)).toBeCloseTo(rodCurrent(0.5, 0.2, 2, 0.1) ** 2 * 0.1, 12);
    expect(rodForce(0.5, 0.2, 2, 0.1)).toBeCloseTo(0.2, 12);
  });
  it('the cause list has increasing, decreasing and no-change cases', () => {
    expect(new Set(CAUSES.map((c) => c.change)).size).toBe(3);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: all four cases occur; the right pair wins; the opposite sense loses', () => {
    const cases = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelMagnet;
      cases.add(`${l.pole}-${l.motion}`);
      expect(judgeMagnet(l, l.sense, l.force).ok).toBe(true);
      expect(judgeMagnet(l, l.sense === 'clockwise' ? 'anticlockwise' : 'clockwise', l.force).sOk).toBe(false);
      expect(judgeMagnet(l, l.sense, l.force === 'repels' ? 'attracts' : 'repels').fOk).toBe(false);
    }
    expect(cases.size).toBe(4);
  });
  it('level 2: every sense including "none" occurs; only the right one wins', () => {
    const senses = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelLoop;
      senses.add(l.sense);
      expect(judgeLoop(l, l.sense).ok).toBe(true);
      for (const other of ['clockwise', 'anticlockwise', 'none'] as const) if (other !== l.sense) expect(judgeLoop(l, other).ok).toBe(false);
    }
    expect(senses.size).toBe(3);
  });
  it('level 3: the current, force and power win; the power is F v', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelRod;
      expect(l.powerMilli).toBeCloseTo(l.forceMilli * l.v, 6);
      expect(judgeRod(l, l.current, l.forceMilli, l.powerMilli).ok).toBe(true);
      expect(judgeRod(l, l.current, l.forceMilli, l.forceMilli).pOk).toBe(l.v === 1);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/conservation of energy|opposite pole|same/, /flux|Faraday/, /I²R/];
    [1, 2, 3].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
