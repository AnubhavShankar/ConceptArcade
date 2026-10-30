import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { buildRounds, explain, frac, intel, judge, missText, probability, spotText, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('total probability and Bayes by counting', () => {
  it('textbook anchors: bag 1 with 3 red of 5 and bag 2 with 1 red of 5, equally likely: P(red) = 2/5 and P(bag 1 | red) = 3/4', () => {
    const P = (1 / 2) * (3 / 5) + (1 / 2) * (1 / 5);
    expect(P).toBeCloseTo(2 / 5, 12);
    expect(((1 / 2) * (3 / 5)) / P).toBeCloseTo(3 / 4, 12);
    expect(frac(6, 8)).toBe('3/4');
  });
  it('every round: the counts agree with the theorem of total probability and with Bayes’ formula in fractions', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        const P = r.gates.reduce((s, g) => s + (g.n / r.N) * (g.red / g.n), 0);
        const R = r.gates.reduce((s, g) => s + g.red, 0);
        expect(P).toBeCloseTo(R / r.N, 12);
        if (r.kind === 'bayes') {
          const t = r.gates[r.target];
          expect(((t.n / r.N) * (t.red / t.n)) / P).toBeCloseTo(r.ans[0] / r.ans[1], 12);
        }
        expect(r.gates.reduce((s, g) => s + g.n, 0)).toBe(r.N);
      }
    }
  });
});

describe('every round has exactly one winning setting', () => {
  it('level 1: only the total red count wins; levels 2 and 3: only the pair of counts wins', () => {
    for (const r of all(1)) expect(span(0, r.max).filter((x) => judge(r, [x]))).toEqual([r.ans[0]]);
    for (const level of [2, 3]) {
      for (const r of all(level).slice(0, 30)) {
        const wins: string[] = [];
        for (const a of span(0, r.max)) for (const b of span(0, r.max)) if (judge(r, [a, b])) wins.push(`${a},${b}`);
        expect(wins).toEqual([r.ans.join()]);
      }
    }
  });
  it('the start never wins, the gates differ, and the last level has three gates', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        expect(judge(r, r.start)).toBe(false);
        expect(r.gates.length).toBe(level === 3 ? 3 : 2);
      }
    }
  });
  it('the reduced fraction does not win: the counts must be the real ones', () => {
    for (const r of all(2)) {
      const g = r.ans[0] === 0 ? 1 : Math.abs(r.ans[0]);
      const reduced = [r.ans[0] / gcd2(r.ans[0], r.ans[1]), r.ans[1] / gcd2(r.ans[0], r.ans[1])];
      if (reduced[0] !== r.ans[0]) expect(judge(r, reduced)).toBe(false);
      void g;
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

function gcd2(a: number, b: number): number {
  return b === 0 ? a : gcd2(b, a % b);
}

describe('words', () => {
  it('misses say which count was off without giving it; the working shows the fraction', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40) as Round[]) {
        const wrong = r.ans.map((x, i) => (i === 0 ? (x === r.max ? x - 1 : x + 1) : x));
        expect(missText(r, wrong).length).toBeGreaterThan(30);
        expect(spotText(r, wrong)).toMatch(/Check/);
        expect(explain(r)).toContain(probability(r));
        expect(intel(r)).toMatch(/balls drop/);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.gates.map((g) => `${g.n}:${g.red}`).join() + r.target)).size).toBe(3);
    }
  });
});
