import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { angle, buildRounds, explain, intel, judge, measure, missText, spotText, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('the vector measures are right', () => {
  it('textbook anchors: (3, 4)·(−4, 3) = 0; the shadow of (7, 1) on (3, 4) is 5', () => {
    const r: Round = { kind: 'perp', o: [3, 4], k: 3, u: [0, 0], T: 0, ans: -4, min: -12, max: 12, start: 0, assist: 0 };
    expect(measure(r, -4)).toBe(0);
    expect(angle(r, -4)).toBeCloseTo(90, 9);
    const p: Round = { kind: 'proj', o: [1, 1], k: 1, u: [3, 4], T: 5, ans: 7, min: -12, max: 12, start: 0, assist: 0 };
    expect(measure(p, 7)).toBe(5);
  });
  it('level 1: the paths are at a right angle exactly when the dot product is 0', () => {
    for (const r of all(1)) {
      expect(measure(r, r.ans)).toBe(0);
      expect(angle(r, r.ans)).toBeCloseTo(90, 6);
    }
  });
});

describe('every round has exactly one winning setting', () => {
  it('only the answer makes the measured number right, the start never wins, and the amounts are whole', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        const target = r.kind === 'perp' ? 0 : r.T;
        const wins = span(r.min, r.max).filter((l) => Math.abs(measure(r, l) - target) < 1e-9);
        expect(wins).toEqual([r.ans]);
        expect(span(r.min, r.max).filter((l) => judge(r, l))).toEqual([r.ans]);
        expect(judge(r, r.start)).toBe(false);
        expect(Number.isInteger(measure(r, r.ans))).toBe(true);
        expect(r.ans).not.toBe(0);
      }
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('words', () => {
  it('misses report the measured effect and never the right λ; meters read effects; the working is stated', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        const wrong = r.ans === r.max ? r.ans - 1 : r.ans + 1;
        expect(missText(r, wrong).length).toBeGreaterThan(25);
        expect(missText(r, wrong)).not.toMatch(/λ = /);
        expect(spotText(r, wrong)).toMatch(/meter|Protractor/);
        expect(explain(r)).toContain('λ');
        expect(intel(r)).toContain('λ');
      }
    }
  });
  it('a miss names the direction only: no digit at all, the same words for every wrong λ on one side', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 60)) {
        const wrongs = span(r.min, r.max).filter((l) => l !== r.ans);
        const target = r.kind === 'perp' ? 0 : r.T;
        const bySide = new Map<boolean, Set<string>>();
        for (const l of wrongs) {
          const t = missText(r, l);
          expect(t).not.toMatch(/\d/);
          const up = measure(r, l) > target;
          bySide.set(up, (bySide.get(up) ?? new Set()).add(t));
        }
        for (const set of bySide.values()) expect(set.size).toBe(1);
        if (bySide.size === 2) expect([...bySide.get(true)!][0]).not.toBe([...bySide.get(false)!][0]);
      }
    }
  });
  it('the start is one constant (0) in every round and never wins', () => {
    for (const level of [1, 2, 3]) for (const r of all(level)) expect([r.start, judge(r, r.start)]).toEqual([0, false]);
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => [r.ans, r.k, r.o.join(), r.u.join()].join('|'))).size).toBe(3);
    }
  });
});
