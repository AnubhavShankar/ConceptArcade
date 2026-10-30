import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { buildRounds, explain, intel, judge, missText, objective, show, spotText, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const settings = (r: Round) => Array.from({ length: r.hi - r.lo + 1 }, (_, i) => r.lo + i);

describe('every round has exactly one best whole-number setting', () => {
  it('the setting from calculus is the true extreme of a scan of every dial position, strictly', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        expect(Number.isInteger(r.best)).toBe(true);
        expect(r.best).toBeGreaterThanOrEqual(r.lo);
        expect(r.best).toBeLessThanOrEqual(r.hi);
        const best = objective(r, r.best);
        for (const s of settings(r)) {
          if (s === r.best) continue;
          if (r.goal === 'max') expect(objective(r, s)).toBeLessThan(best - 1e-9);
          else expect(objective(r, s)).toBeGreaterThan(best + 1e-9);
        }
      }
    }
  });
  it('judge accepts only that setting', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) expect(settings(r).filter((s) => judge(r, s))).toEqual([r.best]);
    }
  });
  it('the calculus really is a stationary point: a half-step either side is worse', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        const m = objective(r, r.best);
        for (const e of [0.05, -0.05]) {
          const v = objective(r, r.best + e);
          if (r.goal === 'max') expect(v).toBeLessThan(m);
          else expect(v).toBeGreaterThan(m);
        }
      }
    }
  });
  it('the dial starts away from the answer, and the helpers fade', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) expect(r.start).not.toBe(r.best);
      expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
    }
  });
  it('levels use the exercises’ shapes and goals', () => {
    expect(buildRounds(1, createRng(3)).map((r) => r.shape)).toEqual(['square', 'square', 'rect']);
    expect(buildRounds(2, createRng(3)).map((r) => r.shape)).toEqual(['can', 'can', 'tank']);
    expect(buildRounds(3, createRng(3)).map((r) => r.shape)).toEqual(['cone', 'cylVol', 'cylSurf']);
    expect(buildRounds(4, createRng(3)).map((r) => r.shape)).toEqual(['cable', 'cable', 'cable']);
    expect(all(1).every((r) => r.goal === 'max') && all(2).every((r) => r.goal === 'min') && all(4).every((r) => r.goal === 'min')).toBe(true);
  });
  it('matches the textbook numbers: 18 cm sheet cut 3 cm (432 cm³), 45 by 24 cut 5 cm (2450 cm³), tank ₹1000, nearest point √5', () => {
    const sq = { shape: 'square', goal: 'max', a: 18, b: 0, c: 0, d: 0, best: 3, lo: 1, hi: 8, start: 1, assist: 0 } as Round;
    expect(objective(sq, 3)).toBe(432);
    const rc = { ...sq, shape: 'rect', a: 45, b: 24, best: 5, hi: 11 } as Round;
    expect(objective(rc, 5)).toBe(2450);
    const tank = { ...sq, shape: 'tank', goal: 'min', a: 4, b: 2, c: 70, d: 45, best: 2, hi: 10 } as Round;
    expect(objective(tank, 2)).toBe(1000);
    const cable = { ...sq, shape: 'cable', goal: 'min', a: 1, b: 3, best: 1, lo: -5, hi: 7 } as Round;
    expect(objective(cable, 1)).toBe(5);
  });
});

describe('words never give the answer away', () => {
  it('misses describe the build, with no derivative work or optimum', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 40)) {
        for (const s of settings(r).filter((x) => x !== r.best)) {
          const t = missText(r, s);
          expect(t.length).toBeGreaterThan(25);
          expect(t).not.toMatch(/′|derivative|best|should|optimum|too (small|large|big)/i);
        }
        expect(spotText(r, r.start)).toContain(show(r, r.start));
      }
    }
  });
  it('the working names the derivative step and the second-derivative check', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 30)) {
        const e = explain(r);
        expect(e).toMatch(/′/);
        expect(e).toMatch(/″/);
        expect(e).toContain(String(r.best));
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('a rectangular sheet’s second root is always an impossible cut', () => {
    for (const r of all(1).filter((x) => x.shape === 'rect')) {
      const other = (r.a + r.b + Math.sqrt(r.a * r.a - r.a * r.b + r.b * r.b)) / 6;
      expect(other).toBeGreaterThan(Math.min(r.a, r.b) / 2);
    }
  });
});
