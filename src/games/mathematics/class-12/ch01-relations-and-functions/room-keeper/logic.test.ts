import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { COUNTS, COUNT_MAX, DIALS, MOD_GUESTS, buildRounds, countSeatings, explain, intel, isEquivalence, judge, missText, properties, roomsFor, spotText, withPair, type Pair } from './logic';

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
  it('every answer fits its round’s dial, is not 1 (the start), and the rounds grow', () => {
    for (const s of seeds) {
      const rs = buildRounds(3, createRng(s));
      rs.forEach((r, k) => {
        expect(r.ans.c).toBeGreaterThan(1);
        expect(r.max).toBe(COUNT_MAX[k]);
        expect(r.ans.c).toBeLessThanOrEqual(r.max);
        expect(r.max).toBeLessThanOrEqual(DIALS.count[0].max);
        expect(judge(r, { c: r.ans.c })).toBe(true);
        expect(judge(r, { c: r.ans.c + 1 })).toBe(false);
      });
      expect(rs[0].n).toBeLessThanOrEqual(4);
      expect(rs[1].n).toBeGreaterThanOrEqual(5);
      expect(rs[2].n).toBeGreaterThanOrEqual(6);
      expect(rs[0].n).toBeLessThanOrEqual(rs[1].n);
      expect(rs[1].n).toBeLessThanOrEqual(rs[2].n);
    }
  });
  it('every pool row is recounted: each round has at least 4 rows with different counts, and no count is shared by two rounds', () => {
    const answers = COUNTS.map((pool) => pool.map((c) => countSeatings(c.n, c.together, c.apart)));
    answers.forEach((a, k) => {
      expect(a.length).toBeGreaterThanOrEqual(4);
      expect(new Set(a).size).toBe(a.length);
      for (const x of a) {
        expect(x).toBeGreaterThan(1);
        expect(x).toBeLessThanOrEqual(COUNT_MAX[k]);
      }
    });
    expect(new Set(answers.flat()).size).toBe(answers.flat().length);
    expect(answers).toEqual([[2, 3, 5, 7, 10], [15, 20, 27, 37, 52], [87, 114, 151, 203]]);
    for (const pool of COUNTS) for (const c of pool) for (const [a, b] of [...c.together, ...c.apart]) expect(Math.max(a, b)).toBeLessThanOrEqual(c.n);
  });
  it('exactly one count on the whole dial wins each round, the start (1) never wins, and no answer is a likely blind guess', () => {
    const rounds = Array.from({ length: 200 }, (_, i) => i * 7919 + 13).flatMap((s) => buildRounds(3, createRng(s)).map((r, k) => ({ r, k })));
    for (const { r, k } of rounds.slice(0, 120)) {
      const wins = Array.from({ length: r.max }, (_, i) => i + 1).filter((c) => judge(r, { c }));
      expect(wins).toEqual([r.ans.c]);
      expect(judge(r, { c: DIALS.count[0].start })).toBe(false);
      expect(r.max).toBe(COUNT_MAX[k]);
    }
    for (let k = 0; k < 3; k++) {
      const mine = rounds.filter((x) => x.k === k);
      const seen = new Map<number, number>();
      for (const { r } of mine) seen.set(r.ans.c, (seen.get(r.ans.c) ?? 0) + 1);
      expect(seen.size).toBeGreaterThanOrEqual(4);
      // no single number wins more than 3 rounds in 10
      expect(Math.max(...seen.values()) / mine.length).toBeLessThan(0.3);
    }
  });
  it('a miss says only whether the count was too low or too high, the same for every count on one side', () => {
    for (const s of seeds.slice(0, 20)) {
      for (const r of buildRounds(3, createRng(s))) {
        const lows = [1, Math.max(1, r.ans.c - 1)].filter((c) => c < r.ans.c);
        const highs = [r.ans.c + 1, r.max].filter((c) => c > r.ans.c);
        expect(new Set(lows.map((c) => missText(r, { c }))).size).toBe(1);
        expect(new Set(highs.map((c) => missText(r, { c }))).size).toBe(1);
        for (const c of [...lows, ...highs]) expect(missText(r, { c })).not.toMatch(/\d/);
        expect(missText(r, { c: r.ans.c - 1 })).toMatch(/more ways/);
        expect(missText(r, { c: r.ans.c + 1 })).toMatch(/fewer ways/);
      }
    }
  });
});

describe('a miss never gives the paid check for free', () => {
  it('level 1: round 1 (lamps live) names the broken rules; rounds 2 and 3 name none, whatever the entry', () => {
    for (const r of all(1).slice(0, 60)) {
      const rules = /reflexive|symmetric|transitive/g;
      for (const wrong of [{ a: 1, b: 1 }, { a: 2, b: 1 }, { a: 1, b: r.n }]) {
        if (judge(r, wrong)) continue;
        const text = missText(r, wrong);
        if (r.assist === 0) expect(text).toMatch(/not (reflexive|symmetric|transitive)/);
        else expect(text.replace(/Test reflexive, symmetric and transitive/, '').match(rules)).toBeNull();
      }
      const a = { a: 1, b: 1 };
      const b = { a: 2, b: 1 };
      if (r.assist > 0 && !judge(r, a) && !judge(r, b)) expect(missText(r, a)).toBe(missText(r, b));
    }
  });
  it('level 2: a miss says only more or fewer rooms than the plan, never a guest or the modulus', () => {
    for (const r of all(2).slice(0, 60)) {
      for (let m = 1; m <= 11; m++) {
        if (m === r.ans.m) continue;
        const text = missText(r, { m });
        expect(text).toMatch(m > r.ans.m ? /more than the plan has/ : /fewer than the plan has/);
        expect(text.replace(`into ${m} room${m === 1 ? '' : 's'}`, '')).not.toMatch(/\d/);
      }
      const same = (ms: number[]) => new Set(ms.map((m) => missText(r, { m }).replace(`into ${m} room`, '#'))).size;
      expect(same([r.ans.m + 1, 11].filter((m) => m <= 11 && m > r.ans.m))).toBeLessThanOrEqual(1);
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
