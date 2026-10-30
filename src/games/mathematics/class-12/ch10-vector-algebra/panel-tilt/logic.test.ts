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
