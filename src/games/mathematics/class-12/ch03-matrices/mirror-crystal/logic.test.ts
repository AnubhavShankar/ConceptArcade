import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIALS, buildRounds, explain, filled, intel, judge, missText, pSymmetric, qSkew, spotText, sumPQ, type Round } from './logic';

const seeds = Array.from({ length: 40 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const transpose = (M: number[][]) => M[0].map((_, j) => M.map((row) => row[j]));

describe('levels 1 and 2: exactly one setting of x, y, z', () => {
  it('a scan of every combination finds only the answer, which really is symmetric or skew, and the start never wins', () => {
    for (const level of [1, 2]) {
      for (const r of all(level).slice(0, 40)) {
        const vs = range(-9, 9);
        const wins: string[] = [];
        for (const x of vs) for (const y of vs) for (const z of vs) if (judge(r, { x, y, z })) wins.push(`${x},${y},${z}`);
        expect(wins).toEqual([`${r.ans.x},${r.ans.y},${r.ans.z}`]);
        const M = filled(r, r.ans);
        const T = transpose(M);
        expect(M.every((row, i) => row.every((v, j) => (level === 1 ? v === T[i][j] : v === -T[i][j])))).toBe(true);
        expect(judge(r, { x: 0, y: 0, z: 0 })).toBe(false);
      }
    }
  });
  it('each crystal has exactly three unknown gems, and the skew crystal has one on the mirror line', () => {
    for (const r of all(1)) expect(r.A.flat().filter((c) => c === null)).toHaveLength(3);
    for (const r of all(2)) {
      expect(r.A.flat().filter((c) => c === null)).toHaveLength(3);
      expect([0, 1, 2].filter((i) => r.A[i][i] === null)).toHaveLength(1);
    }
  });
});

describe('level 3: split into P + Q', () => {
  it('P is symmetric, Q is skew, P + Q = A, and the answer is the only one when p12 and q12 are scanned', () => {
    for (const r of all(3).slice(0, 40)) {
      const [[a, b], [c, d]] = r.M;
      expect(r.ans.p12).toBe((b + c) / 2);
      expect(r.ans.q12).toBe((b - c) / 2);
      const wins: string[] = [];
      for (const p12 of range(-12, 12, 0.5)) for (const q12 of range(-12, 12, 0.5)) if (judge(r, { p11: a, p12, p21: p12, p22: d, q11: 0, q12, q21: -q12, q22: 0 })) wins.push(`${p12},${q12}`);
      expect(wins).toEqual([`${r.ans.p12},${r.ans.q12}`]);
      expect(judge(r, { ...r.ans, p11: a + 0.5 })).toBe(false);
      expect(judge(r, { ...r.ans, p22: d - 0.5 })).toBe(false);
      // every gem is a lever: a sum that is right but whose parts break the rules does not open the crystal
      const lopsidedP = { ...r.ans, p21: r.ans.p21 + 1, q21: r.ans.q21 - 1 };
      expect(sumPQ(lopsidedP)).toEqual(r.M);
      expect(pSymmetric(lopsidedP)).toBe(false);
      expect(judge(r, lopsidedP)).toBe(false);
      expect(missText(r, lopsidedP)).toMatch(/P is not symmetric/);
      const gemOnMirror = { ...r.ans, p11: a - 1, q11: 1 };
      expect(sumPQ(gemOnMirror)).toEqual(r.M);
      expect(qSkew(gemOnMirror)).toBe(false);
      expect(judge(r, gemOnMirror)).toBe(false);
      expect(missText(r, gemOnMirror)).toMatch(/Q is not skew symmetric/);
      const looseQ = { ...r.ans, p12: r.ans.p12 + 1, q12: r.ans.q12 - 1, p21: r.ans.p21 - 1, q21: r.ans.q21 + 1 };
      expect(sumPQ(looseQ)).toEqual(r.M);
      expect(judge(r, looseQ)).toBe(false);
      expect(sumPQ(r.ans)).toEqual(r.M);
      expect(Math.abs(r.ans.p12)).toBeLessThanOrEqual(12);
    }
  });
  it('there are eight levers, the four gems of P and the four gems of Q', () => {
    expect(DIALS.split.map((d) => d.key)).toEqual(['p11', 'p12', 'p21', 'p22', 'q11', 'q12', 'q21', 'q22']);
  });
  it('a textbook split: A = [3 5; 1 −1] gives P = [3 3; 3 −1] and Q = [0 2; −2 0]', () => {
    const r: Round = { kind: 'split', A: [], M: [[3, 5], [1, -1]], ans: { p11: 3, p12: 3, p21: 3, p22: -1, q11: 0, q12: 2, q21: -2, q22: 0 }, assist: 0 };
    expect(judge(r, r.ans)).toBe(true);
    expect(sumPQ(r.ans)).toEqual([[3, 5], [1, -1]]);
  });
});

describe('words', () => {
  it('helpers fade; misses name the pair, not the value; the working is stated', () => {
    for (const level of [1, 2, 3]) {
      expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r of all(level).slice(0, 30)) {
        const wrong = Object.fromEntries(DIALS[r.kind === 'sym' ? 'sym' : r.kind].map((d) => [d.key, r.ans[d.key] + d.step]));
        expect(missText(r, wrong)).toMatch(/row \d, column \d/);
        expect(missText(r, wrong)).not.toMatch(/should be|must be \d/);
        expect(spotText(r, wrong).length).toBeGreaterThan(15);
        expect(explain(r).length).toBeGreaterThan(30);
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
});
