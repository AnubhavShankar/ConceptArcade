import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { bWith, buildRounds, cross, explain, intel, judge, missText, normal, size, spotText, type Round, type V3 } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe('the cross product is right', () => {
  it('textbook anchors: i × j = k; (1, 2, 3) × (4, 5, 6) = (−3, 6, −3); a × b = −b × a', () => {
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(cross([1, 2, 3], [4, 5, 6])).toEqual([-3, 6, -3]);
    const a: V3 = [2, -1, 3];
    const b: V3 = [1, 4, -2];
    expect(cross(a, b)).toEqual(cross(b, a).map((x) => -x));
  });
  it('a × b is square to both supports and its length is the parallelogram area (Lagrange identity)', () => {
    for (const r of all(1)) {
      const n = cross(r.a, r.b);
      expect(dot(n, r.a)).toBe(0);
      expect(dot(n, r.b)).toBe(0);
      expect(size(n) ** 2).toBeCloseTo(dot(r.a, r.a) * dot(r.b, r.b) - dot(r.a, r.b) ** 2, 8);
    }
  });
});

describe('every round has exactly one winning setting', () => {
  it('level 1: the bolt must equal a × b exactly; the reversed bolt and multiples do not win', () => {
    for (const r of all(1)) {
      expect(judge(r, cross(r.a, r.b))).toBe(true);
      expect(judge(r, cross(r.b, r.a))).toBe(false);
      expect(judge(r, cross(r.a, r.b).map((x) => 2 * x))).toBe(false);
      expect(judge(r, r.start)).toBe(false);
      expect(r.ans.every((x) => Math.abs(x) <= 12)).toBe(true);
    }
  });
  it('level 2: of c from 0 to 9, only the answer gives the area, and the other root is out of range', () => {
    for (const r of all(2)) {
      const wins = span(r.min, r.max).filter((c) => Math.abs(size(normal(r, [c])) - r.T) < 1e-9);
      expect(wins).toEqual([r.ans[0]]);
      expect(Number.isInteger(r.T)).toBe(true);
      expect(judge(r, r.start)).toBe(false);
    }
  });
  it('level 3: of c from −9 to 9, only the answer makes the supports parallel (a × b = 0)', () => {
    for (const r of all(3)) {
      const wins = span(r.min, r.max).filter((c) => size(normal(r, [c])) === 0);
      expect(wins).toEqual([r.ans[0]]);
      expect(judge(r, r.start)).toBe(false);
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('a miss and the start never give the answer away', () => {
  it('every dial starts at 0 in every row of every level, and that start never wins', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        expect(r.start).toEqual(r.ans.map(() => 0));
        expect(judge(r, r.start)).toBe(false);
      }
    }
  });
  it('level 2 answers range over 1 to 9 (not just 1 to 3), differ within a level, and only the answer gives the area over the whole dial', () => {
    const seen = new Set<number>();
    for (const s of seeds) {
      const rs = buildRounds(2, createRng(s));
      expect(new Set(rs.map((r) => r.ans[0])).size).toBe(3);
      for (const r of rs) {
        seen.add(r.ans[0]);
        const wins = span(r.min, r.max).filter((c) => Math.abs(size(normal(r, [c])) - r.T) < 1e-9);
        expect(wins).toEqual([r.ans[0]]);
        expect(Number.isInteger(r.T)).toBe(true);
        expect(r.ans[0]).toBeGreaterThanOrEqual(1);
        expect(r.ans[0]).toBeLessThanOrEqual(9);
      }
    }
    expect([...seen].filter((c) => c > 3).length).toBeGreaterThanOrEqual(5);
    expect(seen.size).toBe(9);
  });
  it('levels 2 and 3: the miss text has no number, and every wrong setting on one side of the answer reads the same', () => {
    for (const level of [2, 3]) {
      for (const r of all(level)) {
        const lows = new Set<string>();
        const highs = new Set<string>();
        for (const c of span(r.min, r.max)) {
          if (c === r.ans[0]) continue;
          const text = missText(r, [c]);
          expect(text).not.toMatch(/\d/);
          (c < r.ans[0] ? lows : highs).add(text);
        }
        expect(lows.size).toBeLessThanOrEqual(1);
        expect(highs.size).toBeLessThanOrEqual(1);
        if (lows.size && highs.size) expect([...lows][0]).not.toBe([...highs][0]);
      }
    }
  });
  it('level 1: a miss prints no number, and every bolt that is not square reads the same', () => {
    for (const r of all(1).slice(0, 60)) {
      const t = cross(r.a, r.b);
      const notSquare = new Set<string>();
      for (const d of [[1, 0, 0], [0, 2, 0], [0, 0, -3], [1, 1, 1], [-4, 2, 5]]) {
        const v = t.map((x, i) => x + d[i]);
        if (judge(r, v) || dot(v as V3, r.a) === 0 && dot(v as V3, r.b) === 0) continue;
        const text = missText(r, v);
        expect(text).not.toMatch(/\d/);
        notSquare.add(text);
      }
      expect(notSquare.size).toBeLessThanOrEqual(1);
      // square but off in length: only longer or shorter
      const twice = t.map((x) => 2 * x);
      expect(missText(r, twice)).toMatch(/longer/);
      expect(missText(r, twice)).not.toMatch(/\d/);
      expect(missText(r, t.map((x) => -2 * x))).toMatch(/longer/);
    }
  });
});

describe('words', () => {
  it('the reversed bolt gets the right-hand-rule message; misses and tests read effects; the working is stated', () => {
    for (const r of all(1).slice(0, 30)) {
      const rev = cross(r.b, r.a);
      expect(missText(r, rev)).toMatch(/wrong way/);
      expect(spotText(r, rev)).toMatch(/square to both/);
    }
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 30) as Round[]) {
        const wrong = r.kind === 'mount' ? [...r.ans.slice(0, 2), r.ans[2] + 1] : [r.ans[0] === r.max ? r.ans[0] - 1 : r.ans[0] + 1];
        expect(missText(r, wrong).length).toBeGreaterThan(30);
        expect(explain(r).length).toBeGreaterThan(40);
        expect(intel(r)).toMatch(/a = /);
        expect(bWith(r, wrong).length).toBe(3);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.a.join() + r.b.join())).size).toBe(3);
    }
  });
});
