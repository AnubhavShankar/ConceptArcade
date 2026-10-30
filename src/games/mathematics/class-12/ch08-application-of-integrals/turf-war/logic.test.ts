import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { area, buildRounds, explain, height, intel, judge, missText, signed, spotText, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** Composite Simpson rule on |f| between lo and hi. */
const integral = (f: (x: number) => number, lo: number, hi: number, n = 2000) => {
  const h = (hi - lo) / n;
  let s = f(lo) + f(hi);
  for (let i = 1; i < n; i++) s += f(lo + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};
/** The edge of the painted stretch for setting v, and where it starts. */
const bounds = (r: Round, v: number): [number, number] => (r.kind === 'sine' ? [0, (v * Math.PI) / 2] : r.kind === 'cubic' ? [-r.p[1], v] : [0, v]);

describe('the area formulas are right', () => {
  it('textbook anchors: the ellipse x²/9 + y²/4 = 1 has area 6π; one arch of sin x has area 2; the line y = 2x − 4 on [0, 4] has area 8', () => {
    const e: Round = { kind: 'ellipse', p: [3], T: 6, ans: 2, min: 0, max: 8, start: 0, assist: 0 };
    expect(area(e, 2)).toBe(6);
    const s: Round = { kind: 'sine', p: [1], T: 2, ans: 4, min: 0, max: 8, start: 0, assist: 0 };
    expect(area(s, 4)).toBe(4);
    const l: Round = { kind: 'line', p: [2, 2], T: 8, ans: 4, min: 0, max: 9, start: 0, assist: 0 };
    expect(area(l, 4)).toBe(8);
  });
  it('the closed forms match numerical integration of |f| (and of f for the signed value)', () => {
    for (const level of [2, 3, 4]) {
      for (const r of all(level).slice(0, 60)) {
        for (const v of span(r.min, r.max)) {
          const [lo, hi] = bounds(r, v);
          if (hi === lo) continue;
          expect(integral((x) => Math.abs(height(r, x)), lo, hi, 4000)).toBeCloseTo(area(r, v), 2);
          expect(integral((x) => height(r, x), lo, hi)).toBeCloseTo(signed(r, v), 3);
        }
      }
    }
  });
  it('the ellipse area is π a b: numerical integration of 4b√(1 − x²/a²)', () => {
    for (const r of all(1).slice(0, 30)) {
      const a = r.p[0];
      const b = r.ans;
      expect(integral((x) => 2 * b * Math.sqrt(Math.max(0, 1 - (x * x) / (a * a))), -a, a, 20000)).toBeCloseTo(Math.PI * a * b, 2);
    }
  });
});

describe('every round has exactly one winning setting', () => {
  it('only the answer wins, the amounts are whole numbers, area grows with the roller, and the start never wins', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        expect(span(r.min, r.max).filter((v) => judge(r, v))).toEqual([r.ans]);
        expect(judge(r, r.start)).toBe(false);
        for (const v of span(r.min, r.max)) expect(Number.isInteger(area(r, v))).toBe(true);
        for (const v of span(r.min + 1, r.max)) expect(area(r, v)).toBeGreaterThan(area(r, v - 1));
      }
    }
  });
  it('the signed integral is a real trap: it differs from the area where the turf dips below the axis', () => {
    for (const level of [2, 3, 4]) {
      for (const r of all(level)) expect(signed(r, r.ans)).not.toBe(area(r, r.ans));
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3, 4]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('words', () => {
  it('misses state what was painted and which way; a signed-integral slip is named', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 40)) {
        const wrong = r.ans === r.max ? r.ans - 1 : r.ans + 1;
        expect(missText(r, wrong)).toMatch(/bare patches|spilled/);
        expect(spotText(r, wrong)).toMatch(/Ink gauge/);
        expect(explain(r).length).toBeGreaterThan(40);
        expect(intel(r)).toMatch(/needs exactly/);
      }
    }
    // A round where the player's setting makes the signed integral equal the need gets the slip named.
    const r: Round = { kind: 'line', p: [2, 2], T: 12, ans: 4, min: 0, max: 9, start: 0, assist: 0 };
    expect(signed(r, 6)).toBe(12);
    expect(missText(r, 6)).toMatch(/below the axis as negative/);
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3, 4]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.p.join() + r.ans)).size).toBe(3);
    }
  });
});
