import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { START, buildRounds, explain, frameOf, intel, judge, missSide, missText, passes, spotText, type Round } from './logic';

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

describe('a miss and the start never give the answer away', () => {
  const widely = Array.from({ length: 300 }, (_, i) => i * 7919 + 13);
  it('every round starts at 0 (the same constant everywhere) and no row is won by it, so a row whose answer is 0 never appears', () => {
    expect(START).toBe(0);
    for (const level of [1, 2, 3, 4]) {
      for (const s of widely) {
        for (const r of buildRounds(level, createRng(s))) {
          expect(r.start).toBe(0);
          expect(r.cmin <= 0 && r.cmax >= 0).toBe(true);
          expect(r.ans).not.toBe(0);
          expect(judge(r, r.start)).toBe(false);
        }
      }
    }
  });
  it('the miss text has no height: every wrong constant on one side of the answer reads the same, with no number but the beacon’s own x', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        const bySide = new Map<string, Set<string>>();
        for (const c of span(r.cmin, r.cmax)) {
          if (c === r.ans) continue;
          const side = missSide(r, c);
          const text = missText(r, c);
          expect(text.replace(`x = ${r.xb}`, '')).not.toMatch(/\d/);
          bySide.set(side, (bySide.get(side) ?? new Set()).add(text));
        }
        for (const texts of bySide.values()) expect(texts.size).toBe(1);
        // the side agrees with the curve: above means the board is higher than the beacon at x = xb
        for (const c of span(r.cmin, r.cmax)) {
          const h = r.curve(r.xb, c);
          if (c !== r.ans && Number.isFinite(h)) expect(missSide(r, c)).toBe(h > r.yb ? 'above' : 'below');
        }
      }
    }
  });
  it('the frame is fixed: it is the same whatever the answer and beacon are, and it holds the beacon, the true curve and every curve of the dial', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        const [y0, y1] = frameOf(r);
        expect(frameOf({ ...r, ans: r.ans + 7, yb: r.yb + 100 })).toEqual([y0, y1]);
        expect(r.yb).toBeGreaterThan(y0);
        expect(r.yb).toBeLessThan(y1);
        for (const c of [r.ans, r.cmin, 0, r.cmax]) {
          for (let i = 0; i <= 60; i++) {
            const y = r.curve(r.xs + ((r.xe - r.xs) * i) / 60, c);
            if (!Number.isFinite(y)) continue;
            expect(y).toBeGreaterThanOrEqual(y0);
            expect(y).toBeLessThanOrEqual(y1);
          }
        }
      }
    }
  });
});

describe('words', () => {
  it('misses name the side, never the height or the constant; the working is stated', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 40)) {
        const wrong = r.ans === r.cmax ? r.ans - 1 : r.ans + 1;
        expect(missText(r, wrong)).toMatch(/above|below|does not exist/);
        expect(missText(r, wrong)).not.toMatch(/height/);
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
