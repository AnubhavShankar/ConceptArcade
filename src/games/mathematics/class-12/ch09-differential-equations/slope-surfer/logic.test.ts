import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { buildRounds, explain, intel, judge, missText, passes, spotText, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** The slope of the curve with constant c at x, by a central difference. */
const dydx = (r: Round, c: number, x: number) => (r.curve(x + 1e-5, c) - r.curve(x - 1e-5, c)) / 2e-5;

describe('the solutions solve their equations', () => {
  it('textbook anchor: y = Cx² solves dy/dx = 2y/x, and x² + y² = C solves dy/dx = −x/y', () => {
    const c = 3;
    expect((2 * (c * 4)) / 2).toBeCloseTo(2 * c * 2, 12);
    expect(-1 / Math.sqrt(8 - 1)).toBeCloseTo(-1 / Math.sqrt(7), 12);
  });
  it('every round: the written curve has the slope the equation gives, for several constants and several x', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 60)) {
        for (const c of [r.ans, r.ans + 1, r.ans - 2]) {
          if (c < r.cmin || c > r.cmax) continue;
          for (const x of [r.xb, r.xb + 0.5, r.xb + 1]) {
            const y = r.curve(x, c);
            if (Number.isNaN(y) || Math.abs(y) < 1e-6) continue;
            expect(dydx(r, c, x)).toBeCloseTo(r.slope(x, y), 3);
          }
        }
      }
    }
  });
});

describe('every round has exactly one winning constant', () => {
  it('only the answer passes through the beacon over the whole dial, the start never wins, the beacon is whole', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        expect(span(r.cmin, r.cmax).filter((c) => passes(r, c))).toEqual([r.ans]);
        expect(span(r.cmin, r.cmax).filter((c) => judge(r, c))).toEqual([r.ans]);
        expect(judge(r, r.start)).toBe(false);
        expect(Number.isInteger(r.yb)).toBe(true);
        expect(r.ans).toBeGreaterThanOrEqual(r.cmin);
        expect(r.ans).toBeLessThanOrEqual(r.cmax);
        expect(r.yb).toBeGreaterThan(-150);
        expect(r.yb).toBeLessThan(150);
      }
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3, 4]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('words', () => {
  it('misses name the side and the height, never the constant; the working is stated', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 40)) {
        const wrong = r.ans === r.cmax ? r.ans - 1 : r.ans + 1;
        expect(missText(r, wrong)).toMatch(/above|below|does not exist/);
        expect(missText(r, wrong)).not.toContain(`C = ${r.ans}`);
        expect(spotText(r, wrong)).toMatch(/Test ride/);
        expect(explain(r)).toMatch(/general solution/);
        expect(intel(r)).toContain(r.de);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3, 4]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.de + r.xb + r.ans)).size).toBe(3);
    }
  });
});
