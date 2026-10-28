import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  explainSolution,
  flipEmfMilliV,
  fluxMilli,
  fmt,
  judgeFlip,
  judgeFlux,
  judgeGraph,
  judgeSolenoid,
  solenoidLoopMicroV,
  starsFor,
  type LevelFlip,
  type LevelFlux,
  type LevelGraph,
  type LevelSolenoid,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('15 turns per cm, 2.0 cm², 2 A to 4 A in 0.1 s induces 7.5 µV (Exercise 6.3)', () => {
    expect(solenoidLoopMicroV(15, 2, 2, 0.1)).toBeCloseTo(7.54, 1);
  });
  it('500 turns of radius 10 cm turned through 180° in 0.25 s in 0.3 G gives about 3.8 mV (Example 6.3)', () => {
    expect(flipEmfMilliV(500, 10, 0.3, 0.25)).toBeCloseTo(3.77, 1);
  });
});

describe('the rules', () => {
  it('flux is greatest along the normal, zero in the plane, negative beyond 90°', () => {
    expect(fluxMilli(1, 100, 0)).toBeCloseTo(10, 9);
    expect(fluxMilli(1, 100, 90)).toBeCloseTo(0, 9);
    expect(fluxMilli(1, 100, 180)).toBeCloseTo(-10, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: both modes occur; the answer wins; changes are never zero', () => {
    const modes = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelFlux;
      modes.add(l.mode);
      expect(judgeFlux(l, l.answer).ok).toBe(true);
      expect(l.answer).not.toBeCloseTo(0, 9);
      expect(judgeFlux(l, l.answer * 1000).ok).toBe(false);
    }
    expect(modes.size).toBe(2);
  });
  it('level 2: the emf is a few microvolts and the answer wins', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelSolenoid;
      expect(l.microV).toBeGreaterThan(0.5);
      expect(judgeSolenoid(l, l.microV).ok).toBe(true);
      expect(judgeSolenoid(l, l.microV / 1000).ok).toBe(false);
    }
  });
  it('level 3: emf and current win; the current is emf over R', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelFlip;
      expect(l.current).toBeCloseTo(l.emf / l.r, 9);
      expect(judgeFlip(l, l.emf, l.current).ok).toBe(true);
      expect(judgeFlip(l, l.emf / 2, l.current).eOk).toBe(false);
    }
  });
  it('level 4: a unique steepest segment and no flat segment; the answers win', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelGraph;
      const d = [1, 2, 3].map((k) => Math.abs(l.flux[k] - l.flux[k - 1]));
      expect(d.every((x) => x > 0)).toBe(true);
      expect(d.indexOf(Math.max(...d)) + 1).toBe(l.largest);
      expect(judgeGraph(l, l.emf, l.largest).ok).toBe(true);
      expect(judgeGraph(l, l.emf, (l.largest % 3) + 1).lOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/cos θ|change/, /μ₀nA/, /2BA/, /slope/];
    [1, 2, 3, 4].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
