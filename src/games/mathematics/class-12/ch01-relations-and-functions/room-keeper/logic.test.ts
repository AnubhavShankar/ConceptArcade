import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIALS, MOD_GUESTS, buildRounds, countSeatings, explain, intel, isEquivalence, judge, missText, properties, roomsFor, spotText, withPair, type Pair } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));

describe('the properties of a relation', () => {
  it('detects reflexive, symmetric and transitive failures', () => {
    const eq: Pair[] = [[1, 1], [2, 2], [3, 3], [1, 2], [2, 1]];
    expect(isEquivalence(eq, 3)).toBe(true);
    expect(properties(eq.slice(0, 4), 3)).toEqual({ reflexive: true, symmetric: false, transitive: true });
    expect(properties([[1, 1], [2, 2], [1, 2], [2, 1], [2, 3], [3, 2], [3, 3]], 3).transitive).toBe(false);
    expect(properties([[1, 2]], 3).reflexive).toBe(false);
  });
});

describe('level 1: repair the chart', () => {
  it('the chart is an equivalence relation minus one pair, and exactly one entry repairs it (all 6 × 6 entries scanned)', () => {
    for (const r of all(1)) {
      expect(isEquivalence(r.pairs, r.n)).toBe(false);
      expect(isEquivalence(withPair(r, r.gone[0], r.gone[1]), r.n)).toBe(true);
      const wins: string[] = [];
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (judge(r, { a, b })) wins.push(`${a},${b}`);
      expect(wins).toEqual([`${r.ans.a},${r.ans.b}`]);
      expect(r.ans.a).not.toBe(r.ans.b);
      expect(judge(r, { a: 1, b: 1 })).toBe(false);
    }
  });
  it('the three rounds have 4 to 6 guests', () => {
    for (const s of seeds) {
      const ns = buildRounds(1, createRng(s)).map((r) => r.n);
      expect(ns.every((n) => n >= 4 && n <= 6)).toBe(true);
    }
  });
});

describe('level 2: find the modulus', () => {
  it('exactly one modulus m from 1 to 11 gives the rooms, and the start never wins', () => {
    for (const r of all(2)) {
      const wins = Array.from({ length: 11 }, (_, i) => i + 1).filter((m) => judge(r, { m }));
      expect(wins).toEqual([r.ans.m]);
      expect(judge(r, { m: 1 })).toBe(false);
      expect(r.rooms.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: MOD_GUESTS }, (_, i) => i + 1));
    }
  });
  it('congruence mod m is an equivalence relation with m classes', () => {
    const pairs: Pair[] = [];
    for (let x = 1; x <= 12; x++) for (let y = 1; y <= 12; y++) if ((x - y) % 4 === 0) pairs.push([x, y]);
    expect(isEquivalence(pairs, 12)).toBe(true);
    expect(roomsFor(12, 4)).toEqual([[4, 8, 12], [1, 5, 9], [2, 6, 10], [3, 7, 11]]);
  });
});

describe('level 3: counting seatings', () => {
  it('matches the textbook counts and the Bell numbers', () => {
    expect(countSeatings(3, [[1, 2]], [])).toBe(2);
    expect(countSeatings(3, [], [])).toBe(5);
    expect(countSeatings(4, [], [])).toBe(15);
    expect(countSeatings(5, [], [])).toBe(52);
    expect(countSeatings(4, [[1, 2]], [])).toBe(5);
    expect(countSeatings(4, [[1, 2]], [[3, 4]])).toBe(3);
  });
  it('every answer fits the dial, is not 1, and the rounds grow', () => {
    for (const s of seeds) {
      const rs = buildRounds(3, createRng(s));
      for (const r of rs) {
        expect(r.ans.c).toBeGreaterThan(1);
        expect(r.ans.c).toBeLessThanOrEqual(DIALS.count[0].max);
        expect(judge(r, { c: r.ans.c })).toBe(true);
        expect(judge(r, { c: r.ans.c + 1 })).toBe(false);
      }
      expect(rs[0].n).toBe(3);
      expect(rs[1].n).toBe(4);
    }
  });
});

describe('words', () => {
  it('helpers fade; a miss says what broke and never the entry; the working is stated', () => {
    for (const level of [1, 2, 3]) {
      expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r of all(level).slice(0, 30)) {
        const wrong: Record<string, number> = r.kind === 'repair' ? { a: 1, b: 1 } : r.kind === 'modulus' ? { m: r.ans.m === 3 ? 4 : 3 } : { c: r.ans.c + 1 };
        expect(missText(r, wrong).length).toBeGreaterThan(30);
        expect(missText(r, wrong)).not.toMatch(/\(\d, \d\) is missing/);
        expect(spotText(r, wrong).length).toBeGreaterThan(15);
        expect(explain(r).length).toBeGreaterThan(30);
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
});
