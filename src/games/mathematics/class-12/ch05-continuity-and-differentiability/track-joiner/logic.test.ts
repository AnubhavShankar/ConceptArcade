import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIALS, KINDS, buildRounds, explain, filled, firstFault, intel, judge, missText, pieceText, spotText, trackText, type Round } from './logic';

const seeds = Array.from({ length: 50 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));

function combos(r: Round): Record<string, number>[] {
  let out: Record<string, number>[] = [{}];
  for (const d of DIALS[r.kind]) {
    const next: Record<string, number>[] = [];
    for (const o of out) for (let v = d.min; v <= d.max; v++) next.push({ ...o, [d.key]: v });
    out = next;
  }
  return out;
}

describe('every round has exactly one way to join the track', () => {
  it('a scan of every dial combination finds only the answer, and the start never wins', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 60)) {
        const wins = combos(r).filter((v) => judge(r, v));
        expect(wins).toEqual([r.ans]);
        const start = Object.fromEntries(DIALS[r.kind].map((d) => [d.key, d.start]));
        expect(judge(r, start)).toBe(false);
        for (const d of DIALS[r.kind]) {
          expect(r.ans[d.key]).toBeGreaterThanOrEqual(d.min);
          expect(r.ans[d.key]).toBeLessThanOrEqual(d.max);
        }
      }
    }
  });
  it('levels use their kinds, the helpers fade and the rounds differ', () => {
    for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(9));
      expect(rs.every((r) => r.kind === KINDS[level - 1])).toBe(true);
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(new Set(rs.map((r) => trackText(r))).size).toBe(3);
    }
  });
  it('in the smooth level the value and the slope both match at the answer, and a right value alone is a corner', () => {
    for (const r of all(3)) {
      expect(firstFault(r, r.ans)).toBeNull();
      const f = firstFault(r, { k: r.ans.k + 1, m: r.ans.m - r.joins[0] });
      expect(f?.kind).toBe('corner');
      expect(f?.x).toBe(r.joins[0]);
    }
  });
  it('in the continuity levels a wrong constant is a gap at the first broken join', () => {
    for (const r of all(1).slice(0, 40)) expect(firstFault(r, { k: r.ans.k + 1 })?.kind).toBe('gap');
    for (const r of all(2).slice(0, 40)) {
      const f = firstFault(r, { a: r.ans.a, b: r.ans.b + 1 });
      expect(f?.kind).toBe('gap');
      expect(f?.x).toBe(r.joins[0]);
    }
  });
});

describe('words', () => {
  it('writes pieces, and the textbook anchor: x² + 1 for x < 2 and kx − 1 for x ≥ 2 needs k = 3', () => {
    expect(pieceText({ p: 1, q: 0, r: 1 })).toBe('x² + 1');
    expect(pieceText({ p: 2, q: -1, r: -3 })).toBe('2x² − x − 3');
    expect(pieceText({ p: 0, q: 3, r: 0 })).toBe('3x');
    const r: Round = { kind: 'gap', joins: [2], pieces: [{ p: 1, q: 0, r: 1 }, null], ans: { k: 3 }, m0: -1, assist: 0 };
    expect(judge(r, { k: 3 })).toBe(true);
    expect(judge(r, { k: 2 })).toBe(false);
    expect(filled(r, { k: 3 })[1]).toEqual({ p: 0, q: 3, r: -1 });
  });
  it('misses name the join and the broken quantity, never the constants', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 30)) {
        const wrong = Object.fromEntries(DIALS[r.kind].map((d) => [d.key, r.ans[d.key] + 1]));
        expect(missText(r, wrong)).toMatch(/At x = \d/);
        expect(missText(r, wrong)).not.toMatch(/k = |a = |b = |m = /);
        expect(spotText(r, wrong)).toMatch(/Test ride/);
        expect(explain(r).length).toBeGreaterThan(40);
        expect(intel(r)).toContain('f(x) =');
      }
    }
  });
});
