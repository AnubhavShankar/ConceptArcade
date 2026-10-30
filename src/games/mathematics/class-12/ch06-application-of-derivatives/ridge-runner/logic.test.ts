import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { buildRounds, cubic, explain, intel, judge, missText, spotText, type Round } from './logic';

const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (r: Round) => Array.from({ length: r.hi - r.lo + 1 }, (_, i) => r.lo + i);
const numeric = (g: (x: number) => number, x: number) => (g(x + 1e-5) - g(x - 1e-5)) / 2e-5;

describe('the ground and its derivatives agree', () => {
  it('fp is the derivative of f, and fpp the derivative of fp (numerical check)', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 60)) {
        for (const x of [-3, 0, 2]) {
          expect(Math.abs(numeric(r.f, x) - r.fp(x))).toBeLessThan(1e-3 * Math.max(1, Math.abs(r.fp(x))));
          expect(Math.abs(numeric(r.fp, x) - r.fpp(x))).toBeLessThan(1e-3 * Math.max(1, Math.abs(r.fpp(x))));
        }
      }
    }
  });
  it('the textbook cubic x³ − 3x has a peak at −1 and a valley at 1', () => {
    const g = cubic(-1, 1, 1, 0);
    expect(g.text).toBe('f(x) = x³ − 3x');
    expect(g.fpp(-1)).toBeLessThan(0);
    expect(g.fpp(1)).toBeGreaterThan(0);
    expect(g.f(-1)).toBe(2);
    expect(g.f(1)).toBe(-2);
  });
});

describe('every round has exactly one winning camp', () => {
  it('only the answer wins when every whole position is tried, and the start is wrong', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        expect(span(r).filter((x) => judge(r, x))).toEqual([r.ans]);
        expect(r.ans).toBeGreaterThanOrEqual(r.lo);
        expect(r.ans).toBeLessThanOrEqual(r.hi);
        expect(r.start).not.toBe(r.ans);
        expect(r.start).toBeGreaterThanOrEqual(r.lo);
        expect(r.start).toBeLessThanOrEqual(r.hi);
      }
    }
  });
  it('level 1: the answer is a stationary point whose second derivative has the right sign', () => {
    for (const r of all(1)) {
      expect(r.fp(r.ans) === 0).toBe(true);
      expect(r.fpp(r.ans) < 0).toBe(r.ask === 'peak');
    }
  });
  it('level 2: the only sign change of the slope is at the answer, and the other zero is a flat spot', () => {
    for (const r of all(2)) {
      const flat = r.crit.find((c) => c !== r.ans)!;
      expect(r.fp(flat) === 0).toBe(true);
      expect(r.fp(flat - 0.3) * r.fp(flat + 0.3)).toBeGreaterThan(0);
      expect(r.fp(r.ans - 0.3) * r.fp(r.ans + 0.3)).toBeLessThan(0);
      expect(r.fpp(r.ans) > 0).toBe(r.ask === 'valley');
    }
  });
  it('level 3: the winner beats every other whole position on the walk, and round 1 is interior, round 2 an end point', () => {
    for (const s of seeds) {
      const rs = buildRounds(3, createRng(s));
      rs.forEach((r, k) => {
        for (let x = r.lo; x <= r.hi; x++) {
          if (x === r.ans) continue;
          if (r.ask === 'highest') expect(r.f(x)).toBeLessThan(r.f(r.ans));
          else expect(r.f(x)).toBeGreaterThan(r.f(r.ans));
        }
        if (k === 0) expect(r.ans > r.lo && r.ans < r.hi).toBe(true);
        if (k === 1) expect(r.ans === r.lo || r.ans === r.hi).toBe(true);
      });
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('words', () => {
  it('a miss describes the slope and the kind of point, never the position; the working is stated', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        for (const x of span(r).filter((v) => v !== r.ans).slice(0, 5)) {
          expect(missText(r, x).length).toBeGreaterThan(30);
          expect(missText(r, x)).not.toMatch(new RegExp(`x = ${r.ans}\\b`));
          expect(spotText(r, x)).toMatch(/slope/);
        }
        expect(explain(r)).toContain(String(r.ans));
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('the flat spot of level 2 is called out as a flat spot', () => {
    const r = all(2)[0];
    const flat = r.crit.find((c) => c !== r.ans)!;
    expect(missText(r, flat)).toMatch(/flattens for a moment/);
  });
});
