import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { buildRounds, clearance, cosOf, cross, dot, explain, intel, judge, missText, norm, spotText, type Round, type V3 } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('the 3D formulas are right', () => {
  it('textbook anchors: the cosines of (2, 3, 6) are 2/7, 3/7, 6/7; (1, 2, 2) and (3, 2, 6) meet at cos θ = 19/21; two skew lines 3 apart', () => {
    expect(norm([2, 3, 6])).toBe(7);
    const r: Round = { kind: 'angle', a: [1, 2, 2], b: [3, 2, 0], free: 2, N: 0, cn: 19, cd: 21, T: 0, off: [0, 0, 0], ans: [6], min: 0, max: 12, start: [0], assist: 0 };
    expect(cosOf(r, 6)).toBeCloseTo(19 / 21, 12);
    const s: Round = { kind: 'skew', a: [1, 0, 0], b: [0, 1, 0], free: 0, N: 0, cn: 0, cd: 1, T: 3, off: [0, 0, 3], ans: [3], min: 0, max: 9, start: [0], assist: 0 };
    expect(clearance(s, 3)).toBe(3);
  });
  it('level 1: the cosines are square-sum 1, and the target is a multiple of the direction', () => {
    for (const r of all(1)) {
      expect(norm(r.ans as V3)).toBe(r.N);
      expect(cross(r.a, r.ans as V3).every((x) => x === 0)).toBe(true);
      expect(dot(r.a, r.ans as V3)).toBeGreaterThan(0);
    }
  });
  it('level 2: the beams are at a right angle when the dot product is 0', () => {
    for (const r of all(2)) expect(dot(r.a, [r.ans[0], r.b[1], r.b[2]])).toBe(0);
  });
});

describe('every round has exactly one winning setting', () => {
  it('level 1: of all whole triples from −12 to 12, only the direction numerators win', () => {
    for (const r of all(1).slice(0, 12)) {
      const wins: string[] = [];
      for (const p of span(r.min, r.max)) for (const q of span(r.min, r.max)) for (const s of span(r.min, r.max)) if (judge(r, [p, q, s])) wins.push(`${p},${q},${s}`);
      expect(wins).toEqual([r.ans.join()]);
      // the requirement behind judge: the numbers over N form a unit vector along the target
      for (const p of span(r.min, r.max)) for (const q of span(r.min, r.max)) {
        const s2 = r.N * r.N - p * p - q * q;
        const s = Math.round(Math.sqrt(Math.max(0, s2)));
        for (const z of [s, -s]) if (s2 >= 0 && s * s === s2 && cross(r.a, [p, q, z]).every((x) => x === 0) && dot(r.a, [p, q, z]) > 0) expect([p, q, z]).toEqual(r.ans);
      }
    }
  });
  it('levels 2 to 4: only the answer wins over the whole dial, and the start never wins', () => {
    for (const level of [2, 3, 4]) {
      for (const r of all(level)) {
        const ok = (l: number) => (r.kind === 'perp' ? dot(r.a, [l, r.b[1], r.b[2]]) === 0 : r.kind === 'angle' ? l > 0 && Math.abs(cosOf(r, l) - r.cn / r.cd) < 1e-12 : Math.abs(clearance(r, l) - r.T) < 1e-9);
        expect(span(r.min, r.max).filter(ok)).toEqual([r.ans[0]]);
        expect(span(r.min, r.max).filter((l) => judge(r, [l]))).toEqual([r.ans[0]]);
        expect(judge(r, r.start)).toBe(false);
      }
    }
  });
  it('level 4: the clearance is a whole number', () => {
    for (const r of all(4)) expect(Number.isInteger(r.T)).toBe(true);
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3, 4]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('words', () => {
  it('misses and checks report readings, not the answer; the working is stated', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 30)) {
        const wrong = r.kind === 'cosines' ? [r.ans[0] + 1, r.ans[1], r.ans[2]] : [r.ans[0] === r.max ? r.ans[0] - 1 : r.ans[0] + 1];
        expect(missText(r, wrong).length).toBeGreaterThan(30);
        expect(spotText(r, wrong)).toMatch(/Check/);
        expect(explain(r).length).toBeGreaterThan(40);
        expect(intel(r).length).toBeGreaterThan(40);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3, 4]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.a.join() + r.b.join() + r.off.join())).size).toBe(3);
    }
  });
});
