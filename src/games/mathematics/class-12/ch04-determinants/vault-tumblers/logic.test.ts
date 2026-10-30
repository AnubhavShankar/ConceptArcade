import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIALS, adj, buildRounds, det, det3, explain, intel, judge, missText, mulVec, plateOk, plateText, spotText, type Round } from './logic';

const seeds = Array.from({ length: 50 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));

describe('the matrix method works on every generated system', () => {
  it('the code is the only whole-number setting that opens every plate (levels 1 to 3)', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 30)) {
        const n = r.A.length;
        expect(det(r.A)).not.toBe(0);
        const wins: number[][] = [];
        const grid = (k: number, acc: number[]) => {
          if (k === n) {
            if (plateOk(r, acc).every(Boolean)) wins.push(acc);
            return;
          }
          for (let v = DIALS.digits.min; v <= DIALS.digits.max; v++) grid(k + 1, [...acc, v]);
        };
        grid(0, []);
        expect(wins).toEqual([r.sol]);
        for (const s of r.sol) expect(s).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it('X = A⁻¹B = (adj A)B / |A| gives the code', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        const d = det(r.A);
        expect(mulVec(adj(r.A), r.B).map((x) => x / d)).toEqual(r.sol);
      }
    }
  });
  it('adj A times A is |A| times the identity for 3 by 3 matrices', () => {
    for (const r of all(2).slice(0, 30)) {
      const a = adj(r.A);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(a[i].reduce((s, x, k) => s + x * r.A[k][j], 0)).toBe(i === j ? det3(r.A) : 0);
    }
  });
});

describe('level 4: determinant and verdict', () => {
  it('every round has |A| and one verdict; the three kinds each appear, and singular rounds follow the (adj A)B test', () => {
    for (const s of seeds) {
      const rs = buildRounds(4, createRng(s));
      expect(rs.map((r) => r.verdict).sort()).toEqual([1, 2, 3]);
      for (const r of rs) {
        expect(det3(r.A)).toBe(r.det);
        expect(Math.abs(r.det)).toBeLessThanOrEqual(30);
        const t = mulVec(adj(r.A), r.B);
        if (r.verdict === 1) expect(r.det).not.toBe(0);
        else {
          expect(r.det).toBe(0);
          expect(t.every((x) => x === 0)).toBe(r.verdict === 3);
        }
      }
    }
  });
  it('exactly one (determinant, verdict) pair is accepted, and the start is wrong', () => {
    for (const r of all(4).slice(0, 30)) {
      const wins: string[] = [];
      for (let d = DIALS.det.min; d <= DIALS.det.max; d++) for (let m = 1; m <= 3; m++) if (judge(r, { d, m })) wins.push(`${d},${m}`);
      expect(wins).toEqual([`${r.det},${r.verdict}`]);
      expect(judge(r, { d: 0, m: 1 })).toBe(false);
    }
  });
});

describe('words', () => {
  it('helpers fade; plates read as equations; misses and checks never state the code', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r of all(level).slice(0, 25)) {
        expect(plateText(r, 0)).toMatch(/ = −?\d+/);
        expect(intel(r).length).toBeGreaterThan(30);
        const wrong: Record<string, number> = r.kind === 'jam' ? { d: r.det + 1, m: r.verdict } : { x: r.sol[0] + 1, y: r.sol[1], z: r.sol[2] ?? 0 };
        expect(missText(r, wrong)).not.toMatch(/\d{1,2}, \d/);
        expect(spotText(r, wrong)).toMatch(/Plate check/);
        expect(explain(r)).toMatch(/|A|/);
      }
    }
  });
  it('matches the textbook shopper bill: 4, 3, 2 kg for ₹60; 2, 4, 6 for ₹90; 6, 2, 3 for ₹70 at ₹5, ₹8, ₹8', () => {
    const A = [[4, 3, 2], [2, 4, 6], [6, 2, 3]];
    expect(mulVec(A, [5, 8, 8])).toEqual([60, 90, 70]);
    const r = { A } as Round;
    expect(det3(r.A)).not.toBe(0);
  });
});
