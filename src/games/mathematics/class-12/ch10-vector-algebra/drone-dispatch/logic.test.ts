import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { RANGE, buildRounds, explain, intel, judge, missText, spotText, type Pt, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const grid = span(-RANGE, RANGE).flatMap((x) => span(-RANGE, RANGE).map((y): Pt => [x, y]));
const wrongOf = (r: Round): Pt => [r.ans[0] === RANGE ? r.ans[0] - 1 : r.ans[0] + 1, r.ans[1]];

describe('the vector rules are right', () => {
  it('textbook anchors: the vector from (1, 2) to (4, 6) is (3, 4) of size 5; R divides (0,0)(6,3) internally 1:2 at (2,1) and externally 3:1 at (9, 4.5)', () => {
    expect(Math.hypot(3, 4)).toBe(5);
    expect([(2 * 0 + 1 * 6) / 3, (2 * 0 + 1 * 3) / 3]).toEqual([2, 1]);
    expect([(3 * 6 - 1 * 0) / 2, (3 * 3 - 1 * 0) / 2]).toEqual([9, 4.5]);
  });
  it('level 2: the answer has the required direction and size', () => {
    for (const r of all(2)) {
      expect(r.ans[0] * r.d[1] - r.ans[1] * r.d[0]).toBe(0);
      expect(r.ans[0] * r.d[0] + r.ans[1] * r.d[1]).toBeGreaterThan(0);
      expect(Math.hypot(r.ans[0], r.ans[1])).toBeCloseTo(r.M, 9);
      // the direction is shown as a longer multiple, never already reduced to the answer
      expect(r.d.join()).not.toBe(r.ans.join());
    }
  });
  it('level 3: the relay really divides PQ in the ratio m : n, internally or externally', () => {
    for (const level of [3]) {
      for (const r of all(level)) {
        const [P, Q, R] = [r.D, r.E, r.ans];
        const k = r.external ? r.m - r.n : r.m + r.n;
        const calc = [0, 1].map((i) => (r.m * Q[i] + (r.external ? -1 : 1) * r.n * P[i]) / k + 0);
        expect(calc).toEqual(R.map((x) => x + 0));
        const PR = Math.hypot(R[0] - P[0], R[1] - P[1]);
        const QR = Math.hypot(R[0] - Q[0], R[1] - Q[1]);
        expect(PR / QR).toBeCloseTo(r.m / r.n, 9);
      }
    }
  });
});

describe('every round has exactly one winning tap', () => {
  it('only the answer wins over the whole plane, the start never wins, and the answer is on the plane', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 60)) {
        expect(grid.filter((p) => judge(r, p))).toEqual([r.ans]);
        expect(judge(r, r.start)).toBe(false);
        expect(Math.abs(r.ans[0])).toBeLessThanOrEqual(RANGE);
        expect(Math.abs(r.ans[1])).toBeLessThanOrEqual(RANGE);
      }
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
  it('level 3 ends with an external division', () => {
    for (const s of seeds) expect(buildRounds(3, createRng(s)).map((r) => r.external)).toEqual([false, false, true]);
  });
});

describe('words', () => {
  it('misses describe the effect and never print the right point; the working and the intel are stated', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        const w = wrongOf(r);
        const msg = missText(r, w);
        expect(msg.length).toBeGreaterThan(25);
        expect(msg).not.toContain(`(${r.ans[0]}, ${r.ans[1]})`.replace(/-/g, '−'));
        expect(spotText(r, w)).toMatch(/Test flight/);
        expect(explain(r)).toContain(`${r.ans[0] < 0 ? '−' : ''}${Math.abs(r.ans[0])}`);
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.ans.join() + r.D.join())).size).toBe(3);
    }
  });
});
