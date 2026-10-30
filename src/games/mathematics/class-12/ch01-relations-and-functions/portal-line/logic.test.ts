import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { COUNT, DOMAIN, RANGE, buildRounds, collision, explain, factorial, imageOf, intel, judge, missText, oneOne, spotText } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('level 1: the widest one-one fences around Pip', () => {
  it('exactly one pair of fences wins: one-one, around Pip, and not extendable', () => {
    for (const r of all(1)) {
      const wins: string[] = [];
      for (const lo of span(DOMAIN.min, DOMAIN.max)) {
        for (const hi of span(DOMAIN.min, DOMAIN.max)) if (judge(r, { lo, hi })) wins.push(`${lo},${hi}`);
      }
      expect(wins).toEqual([`${r.ans.lo},${r.ans.hi}`]);
      expect(r.pip).toBeGreaterThan(r.ans.lo - 1e-9);
      expect(r.pip).toBeLessThan(r.ans.hi + 1e-9);
      expect(oneOne(r, r.ans.lo, r.ans.hi)).toBe(true);
      expect(collision(r, r.ans.lo, r.ans.hi)).toBeNull();
      expect(r.turns).not.toContain(r.pip);
    }
  });
  it('the answer is maximal: widening either fence by one puts a collision in (when there is room)', () => {
    for (const r of all(1)) {
      if (r.ans.lo > DOMAIN.min) expect(collision(r, r.ans.lo - 1, r.ans.hi)).not.toBeNull();
      if (r.ans.hi < DOMAIN.max) expect(collision(r, r.ans.lo, r.ans.hi + 1)).not.toBeNull();
    }
  });
  it('a collision exists exactly when f is not one-one, and the pair really shares a door', () => {
    for (const r of all(1).slice(0, 60)) {
      for (let lo = DOMAIN.min; lo <= DOMAIN.max; lo++) {
        for (let hi = lo + 1; hi <= DOMAIN.max; hi++) {
          const c = collision(r, lo, hi);
          expect(c === null).toBe(oneOne(r, lo, hi));
          if (c) {
            expect(Math.abs(r.f(c[0]) - r.f(c[1]))).toBeLessThan(0.2);
            expect(c[0]).toBeGreaterThanOrEqual(lo - 1e-9);
            expect(c[1]).toBeLessThanOrEqual(hi + 1e-9);
          }
        }
      }
    }
  });
  it('the dials start at 0, 0, which never wins', () => {
    for (const r of all(1)) expect(judge(r, { lo: 0, hi: 0 })).toBe(false);
  });
});

describe('level 2: the co-domain fences that make f onto', () => {
  it('the answer is the real image of the domain, found by a fine scan, and it is the only winner', () => {
    for (const r of all(2)) {
      const ys: number[] = [];
      for (let x = r.a; x <= r.b + 1e-9; x += 0.01) ys.push(r.f(x));
      expect(Math.min(...ys)).toBeCloseTo(r.ans.lo, 1);
      expect(Math.max(...ys)).toBeCloseTo(r.ans.hi, 1);
      expect(imageOf(r, r.a, r.b)).toEqual([r.ans.lo, r.ans.hi]);
      expect(Number.isInteger(r.ans.lo) && Number.isInteger(r.ans.hi)).toBe(true);
      expect(r.ans.lo).toBeGreaterThanOrEqual(RANGE.min);
      expect(r.ans.hi).toBeLessThanOrEqual(RANGE.max);
      expect(judge(r, { lo: r.ans.lo - 1, hi: r.ans.hi })).toBe(false);
      expect(judge(r, { lo: r.ans.lo, hi: r.ans.hi + 1 })).toBe(false);
      expect(judge(r, { lo: 0, hi: 0 })).toBe(r.ans.lo === 0 && r.ans.hi === 0);
    }
  });
});

describe('level 3: counting one-one maps', () => {
  it('n travellers on n doors give n!, within the dial, and the start is wrong', () => {
    for (const r of buildRounds(3, createRng(1))) {
      expect(r.ans.c).toBe(factorial(r.n - r.k));
      expect(r.ans.c).toBeLessThanOrEqual(COUNT.max);
      expect(judge(r, { c: 1 })).toBe(false);
    }
    expect(buildRounds(3, createRng(1)).map((r) => r.ans.c)).toEqual([6, 24, 120]);
  });
});

describe('words', () => {
  it('helpers fade and misses say what happened, never the fences', () => {
    for (const level of [1, 2, 3]) {
      expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r of all(level).slice(0, 30)) {
        const wrong: Record<string, number> = r.kind === 'count' ? { c: r.ans.c + 1 } : { lo: r.ans.lo - 1 < -30 ? r.ans.lo : r.ans.lo - 1, hi: r.ans.hi };
        expect(missText(r, wrong).length).toBeGreaterThan(30);
        expect(missText(r, wrong)).not.toMatch(/should|\[−?\d+, −?\d+\]/);
        expect(spotText(r, wrong).length).toBeGreaterThan(20);
        expect(explain(r).length).toBeGreaterThan(30);
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('textbook anchors: x² is not one-one on [−1, 1] but is on [0, 5]; x³ − 3x collides at −2 and 1', () => {
    const r = all(1).find((x) => x.fnText.includes('²') && x.turns[0] === 0)!;
    if (r) {
      expect(collision(r, -1, 1)).not.toBeNull();
      expect(collision(r, 0, 5)).toBeNull();
    }
    const c = all(1).find((x) => x.fnText === 'f(x) = x³ − 3x')!;
    expect(c.f(-2)).toBe(c.f(1));
  });
});
