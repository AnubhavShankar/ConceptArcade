import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { CARDS, buildRounds, counts, drawChance, explain, frac, intel, judge, judgeBoard, missText, pOf, spotText, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('conditional probability, independence and drawing without replacement', () => {
  it('textbook anchors: P(both red) from 5 red of 10 is 2/9; P(A | B) = P(A ∩ B)/P(B)', () => {
    const r: Round = { kind: 'draw', textB: '', textA: '', target: [], a: 0, N: 10, ans: 5, min: 0, max: 10, start: 0, mode: 'both', assist: 0 };
    expect(frac(...drawChance(r, 5))).toBe('2/9');
    expect(frac(3, 12) === '1/4').toBe(true);
  });
  it('level 1: the target board has the reduced sample space and the intersection, and A ⊄ B or B', () => {
    for (const r of all(1)) {
      expect(r.target).toHaveLength(CARDS);
      const [p, f] = counts(r.target);
      expect(p).toBeGreaterThanOrEqual(6);
      expect(f).toBeGreaterThanOrEqual(1);
      expect(f).toBeLessThan(p);
    }
  });
  it('level 2: P(A ∩ B) = P(A)·P(B) holds exactly at the answer and nowhere else on the dial', () => {
    for (const r of all(2)) {
      expect(span(r.min, r.max).filter((k) => pOf(r, k) === pOf(r, r.ans))).toEqual([r.ans]);
      expect(r.a * r.ans).toBeGreaterThan(0);
    }
  });
  it('level 3: the chance is exactly right at the answer, only there, and rises with the red cards', () => {
    for (const r of all(3)) {
      const [n, d] = drawChance(r, r.ans);
      const hits = span(r.min, r.max).filter((x) => { const [a, b] = drawChance(r, x); return a * d === n * b; });
      expect(hits).toEqual([r.ans]);
      expect(n).toBeGreaterThan(0);
    }
  });
});

describe('every round has exactly one winning setting', () => {
  it('board: only the exact board wins, and a blank board never wins', () => {
    for (const r of all(1)) {
      expect(judgeBoard(r, r.target)).toBe(true);
      expect(judgeBoard(r, Array(CARDS).fill(0))).toBe(false);
      const swap = [...r.target];
      swap[swap.findIndex((x) => x === 1)] = 2;
      expect(judgeBoard(r, swap)).toBe(false);
    }
  });
  it('levels 2 and 3: only the answer wins, and the start never wins', () => {
    for (const level of [2, 3]) {
      for (const r of all(level)) {
        expect(span(r.min, r.max).filter((x) => judge(r, x))).toEqual([r.ans]);
        expect(judge(r, r.start)).toBe(false);
      }
    }
  });
  it('helpers fade, and level 3 ends with at least one red', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
    expect(buildRounds(3, createRng(5)).map((r) => r.mode)).toEqual(['both', 'both', 'atleast']);
  });
});

describe('words', () => {
  it('misses say what was left out or extra without the cards; probes read the chance; the working has the fraction', () => {
    for (const r of all(1).slice(0, 30)) {
      const state = [...r.target];
      state[state.findIndex((x) => x === 1)] = 0;
      expect(missText(r, 0, state)).toMatch(/left out/);
      expect(spotText(r, 0, state)).toMatch(/green out of/);
      expect(explain(r)).toMatch(/P\(A \| B\)/);
    }
    for (const level of [2, 3]) {
      for (const r of all(level).slice(0, 30)) {
        const wrong = r.ans === r.max ? r.ans - 1 : r.ans + 1;
        expect(missText(r, wrong).length).toBeGreaterThan(30);
        expect(spotText(r, wrong)).toMatch(/Check/);
        expect(intel(r).length).toBeGreaterThan(40);
        expect(explain(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.textB + r.textA + r.a + r.N + r.ans)).size).toBe(3);
    }
  });
});
