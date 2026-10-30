import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIALS, area, buildRounds, det3, explain, intel, judge, missText, movePost, spotText, triangle, type Pt, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('determinant, area and collinearity', () => {
  it('textbook anchors: (−2, 0), (0, 4), (0, k) with area 4 gives k = 0 or 8; (3, 8), (−4, 2), (5, 1) has area 30.5; (1, 2), (3, 6), (5, 10) are collinear', () => {
    const a: Pt = [-2, 0];
    const b: Pt = [0, 4];
    expect(span(-12, 12).filter((k) => area(a, b, [0, k]) === 4)).toEqual([0, 8]);
    expect(area([3, 8], [-4, 2], [5, 1])).toBe(30.5);
    expect(det3([1, 2], [3, 6], [5, 10])).toBe(0);
  });
  it('the determinant changes sign when two points swap, and the area does not', () => {
    const [a, b, c]: Pt[] = [[1, 2], [4, 7], [-3, 5]];
    expect(det3(a, b, c)).toBe(-det3(b, a, c));
    expect(area(a, b, c)).toBe(area(b, a, c));
  });
});

describe('every round has exactly one winning setting', () => {
  it('levels 1 and 2: only the answer wins when every dial value is tried, and the start never wins', () => {
    for (const level of [1, 2]) {
      for (const r of all(level)) {
        expect(span(-12, 12).filter((k) => judge(r, { k }))).toEqual([r.ans.k]);
        expect(judge(r, { k: 0 })).toBe(false);
      }
    }
  });
  it('level 1: the area is whole, and the mirror post gives the right area but the wrong side', () => {
    for (const r of all(1)) {
      expect(Number.isInteger(r.deed)).toBe(true);
      const B = r.pts[0][r.axis === 'x' ? 0 : 1];
      const other = 2 * B - r.ans.k;
      expect(other).not.toBe(r.ans.k);
      const [a, b, c] = triangle(r, { k: other });
      expect(area(a, b, c)).toBe(r.deed);
      expect(judge(r, { k: other })).toBe(false);
      expect(missText(r, { k: other })).toMatch(/wrong side of the gate/);
    }
  });
  it('level 2: the third post lies on the line through the first two', () => {
    for (const r of all(2)) {
      const p = movePost(r, r.ans);
      expect(p[1]).toBe(r.m * p[0] + r.c);
      expect(r.pts[0][1]).toBe(r.m * r.pts[0][0] + r.c);
    }
  });
  it('level 3: only the true slope and intercept win, scanned over every pair', () => {
    for (const r of all(3).slice(0, 60)) {
      const wins: string[] = [];
      for (const m of span(DIALS.line[0].min, DIALS.line[0].max)) for (const c of span(DIALS.line[1].min, DIALS.line[1].max)) if (judge(r, { m, c })) wins.push(`${m},${c}`);
      expect(wins).toEqual([`${r.m},${r.c}`]);
      expect(r.ans).toEqual({ m: r.m, c: r.c });
      expect(r.ans.m).not.toBe(0);
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('words', () => {
  it('misses report what was measured; the working and the intel are stated', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        const wrong: Record<string, number> = r.kind === 'line' ? { m: r.ans.m + 1, c: r.ans.c } : { k: r.ans.k + 1 };
        expect(missText(r, wrong).length).toBeGreaterThan(25);
        expect(missText(r, wrong)).not.toMatch(/k = |m = |c = /);
        expect(spotText(r, wrong)).toMatch(/Check/);
        expect(explain(r).length).toBeGreaterThan(40);
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs: Round[] = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => JSON.stringify(r.pts))).size).toBe(3);
    }
  });
});
