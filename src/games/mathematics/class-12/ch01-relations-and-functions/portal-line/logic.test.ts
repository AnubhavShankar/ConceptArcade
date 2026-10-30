import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { COUNT, DOMAIN, PQ, RANGE, TRAVELLERS, aidLine, buildRounds, collision, explain, factorial, homeAll, imageOf, intel, domainFault, judge, landing, linText, missText, oneOne, outcome, rangeFault, ratio, spotText, startQ, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('level 1: the widest one-one fences around Pip', () => {
  it('exactly one pair of fences wins: one-one, around Pip, and not extendable', () => {
    for (const r of all(1)) {
      const wins: string[] = [];
      for (const lo of span(DOMAIN.min, DOMAIN.max)) {
        for (const hi of span(DOMAIN.min, DOMAIN.max)) if (judge(r, { lo, hi })) wins.push(`${lo},${hi}`);
      }
      expect(wins).toEqual([`${r.ans.lo},${r.ans.hi}`]);
      expect(r.pip).toBeGreaterThan(r.ans.lo - 1e-9);
      expect(r.pip).toBeLessThan(r.ans.hi + 1e-9);
      expect(oneOne(r, r.ans.lo, r.ans.hi)).toBe(true);
      expect(collision(r, r.ans.lo, r.ans.hi)).toBeNull();
      expect(r.turns).not.toContain(r.pip);
    }
  });
  it('the answer is maximal: widening either fence by one puts a collision in (when there is room)', () => {
    for (const r of all(1)) {
      if (r.ans.lo > DOMAIN.min) expect(collision(r, r.ans.lo - 1, r.ans.hi)).not.toBeNull();
      if (r.ans.hi < DOMAIN.max) expect(collision(r, r.ans.lo, r.ans.hi + 1)).not.toBeNull();
    }
  });
  it('a collision exists exactly when f is not one-one, and the pair really shares a door', () => {
    for (const r of all(1).slice(0, 60)) {
      for (let lo = DOMAIN.min; lo <= DOMAIN.max; lo++) {
        for (let hi = lo + 1; hi <= DOMAIN.max; hi++) {
          const c = collision(r, lo, hi);
          expect(c === null).toBe(oneOne(r, lo, hi));
          if (c) {
            expect(Math.abs(r.f(c[0]) - r.f(c[1]))).toBeLessThan(0.2);
            expect(c[0]).toBeGreaterThanOrEqual(lo - 1e-9);
            expect(c[1]).toBeLessThanOrEqual(hi + 1e-9);
          }
        }
      }
    }
  });
  it('the dials start at 0, 0, which never wins', () => {
    for (const r of all(1)) expect(judge(r, { lo: 0, hi: 0 })).toBe(false);
  });
});

describe('level 2: the co-domain fences that make f onto', () => {
  it('the answer is the real image of the domain, found by a fine scan, and it is the only winner', () => {
    for (const r of all(2)) {
      const ys: number[] = [];
      for (let x = r.a; x <= r.b + 1e-9; x += 0.01) ys.push(r.f(x));
      expect(Math.min(...ys)).toBeCloseTo(r.ans.lo, 1);
      expect(Math.max(...ys)).toBeCloseTo(r.ans.hi, 1);
      expect(imageOf(r, r.a, r.b)).toEqual([r.ans.lo, r.ans.hi]);
      expect(Number.isInteger(r.ans.lo) && Number.isInteger(r.ans.hi)).toBe(true);
      expect(r.ans.lo).toBeGreaterThanOrEqual(RANGE.min);
      expect(r.ans.hi).toBeLessThanOrEqual(RANGE.max);
      expect(judge(r, { lo: r.ans.lo - 1, hi: r.ans.hi })).toBe(false);
      expect(judge(r, { lo: r.ans.lo, hi: r.ans.hi + 1 })).toBe(false);
      expect(judge(r, { lo: 0, hi: 0 })).toBe(r.ans.lo === 0 && r.ans.hi === 0);
    }
  });
});

describe('level 3: counting one-one maps', () => {
  it('n travellers on n doors give n!, within the dial, and the start is wrong', () => {
    for (const r of buildRounds(3, createRng(1))) {
      expect(r.ans.c).toBe(factorial(r.n - r.k));
      expect(r.ans.c).toBeLessThanOrEqual(COUNT.max);
      expect(judge(r, { c: 1 })).toBe(false);
    }
    expect(buildRounds(3, createRng(1)).map((r) => r.ans.c)).toEqual([6, 24, 120]);
  });
});

describe('words', () => {
  it('helpers fade and misses say what happened, never the fences', () => {
    for (const level of [1, 2, 3]) {
      expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r of all(level).slice(0, 30)) {
        const wrong: Record<string, number> = r.kind === 'count' ? { c: r.ans.c + 1 } : { lo: r.ans.lo - 1 < -30 ? r.ans.lo : r.ans.lo - 1, hi: r.ans.hi };
        expect(missText(r, wrong).length).toBeGreaterThan(30);
        expect(missText(r, wrong)).not.toMatch(/should|\[−?\d+, −?\d+\]/);
        expect(spotText(r, wrong).length).toBeGreaterThan(20);
        expect(explain(r).length).toBeGreaterThan(30);
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('textbook anchors: x² is not one-one on [−1, 1] but is on [0, 5]; x³ − 3x collides at −2 and 1', () => {
    const r = all(1).find((x) => x.fnText.includes('²') && x.turns[0] === 0)!;
    if (r) {
      expect(collision(r, -1, 1)).not.toBeNull();
      expect(collision(r, 0, 5)).toBeNull();
    }
    const c = all(1).find((x) => x.fnText === 'f(x) = x³ − 3x')!;
    expect(c.f(-2)).toBe(c.f(1));
  });
});

// Levels 4 and 5: the return portal (y − p)/q.
const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const trips = (level: number) => seeds80.map((s) => buildRounds(level, createRng(s)));
const everyDial = () => span(PQ.p.min, PQ.p.max).flatMap((p) => span(PQ.q.min, PQ.q.max).map((q) => ({ p, q })));
const lin = (r: Round) => r.lin!;
/** g(f(x)) worked out from the real portals f and g (g is the identity on level 4). */
const gOfF = (r: Round, x: number) => lin(r).c * r.f(x) + lin(r).d;
const fOfG = (r: Round, x: number) => lin(r).a * (lin(r).c * x + lin(r).d) + lin(r).b;
const key = (r: Round) => `${lin(r).a},${lin(r).b},${lin(r).c},${lin(r).d}`;

describe('level 4: the return portal of f(x) = ax + b', () => {
  const TABLE = [
    [[2, 3], [3, -4], [4, 1]],
    [[-2, 7], [-1, 4], [-3, -2]],
    [[-2, 5], [-3, 6], [2, -6]],
  ];
  it('every round draws f from its row of the table, every entry turns up, and the answer is p = b, q = a', () => {
    const seen = TABLE.map(() => new Set<string>());
    for (const rs of trips(4)) {
      expect(rs.map((r) => r.kind)).toEqual(['inverse', 'inverse', 'inverse']);
      rs.forEach((r, k) => {
        expect(TABLE[k].map((e) => `${e[0]},${e[1]},1,0`)).toContain(key(r));
        seen[k].add(key(r));
        expect(r.ans).toEqual({ p: lin(r).b, q: lin(r).a });
      });
    }
    seen.forEach((s) => expect(s.size).toBe(3));
  });
  it('the answer really undoes the trip: (f(x) − p)/q = x for many x, and any other p or q does not', () => {
    for (const r of trips(4).flat()) {
      for (const x of span(-10, 10)) expect((r.f(x) - r.ans.p) / r.ans.q).toBeCloseTo(x, 9);
      expect(r.f(0)).toBe(r.ans.p);
      expect(r.f(1) - r.f(0)).toBe(r.ans.q);
    }
  });
  it('round 3 is written as 5 − 2x, 6 − 3x or 2(x − 3), and the working rewrites it as ax + b', () => {
    const boss = trips(4).map((rs) => rs[2]);
    for (const text of ['5 − 2x', '6 − 3x', '2(x − 3)']) expect(boss.some((r) => lin(r).fText === text)).toBe(true);
    for (const r of boss) expect(r.fnText).toBe(`f(x) = ${lin(r).fText}`);
    const r = boss.find((x) => lin(x).fText === '2(x − 3)')!;
    expect(explain(r)).toContain('f(x) = 2x − 6');
    expect(explain(r)).toContain('add 6 and divide by 2: f⁻¹(y) = (y + 6)/2. So p = −6, q = 2.');
  });
});

describe('level 5: the return portal of g after f', () => {
  // [f = [a, b], g = [c, d], p, q, p if the order were wrong]
  const TABLE = [
    [[[1, 2], [3, 0]], 6, 3, 2],
    [[[2, 0], [1, -5]], -5, 2, -10],
    [[[2, 1], [2, -3]], -1, 4, -5],
    [[[1, -3], [-2, 1]], 7, -2, -2],
    [[[3, -1], [-1, 4]], 5, -3, 11],
    [[[-1, 2], [2, 3]], 7, -2, -1],
  ] as const;
  const keyOf = (e: (typeof TABLE)[number]) => `${e[0][0][0]},${e[0][0][1]},${e[0][1][0]},${e[0][1][1]}`;
  it('every entry of the table turns up in its round, with the answer p = cb + d, q = ca', () => {
    const seen = new Set<string>();
    for (const rs of trips(5)) {
      expect(rs.map((r) => r.kind)).toEqual(['compose', 'compose', 'compose']);
      rs.forEach((r, k) => {
        const row = TABLE.slice(2 * k, 2 * k + 2);
        const e = row.find((x) => keyOf(x) === key(r));
        expect(e).toBeDefined();
        seen.add(key(r));
        expect(r.ans).toEqual({ p: e![1], q: e![2] });
        expect(r.ans).toEqual({ p: lin(r).c * lin(r).b + lin(r).d, q: lin(r).c * lin(r).a });
      });
    }
    expect(seen.size).toBe(6);
  });
  it('g(f(x)) is worked out from the real portals: the answer undoes it, and the wrong order f∘g is a different map', () => {
    for (const r of trips(5).flat()) {
      for (const x of span(-10, 10)) expect((gOfF(r, x) - r.ans.p) / r.ans.q).toBeCloseTo(x, 9);
      const e = TABLE.find((t) => keyOf(t) === key(r))!;
      expect(fOfG(r, 0)).toBe(e[3]);
      expect(fOfG(r, 0)).not.toBe(r.ans.p);
      expect(fOfG(r, 1) - fOfG(r, 0)).toBe(r.ans.q);
      // composing in the wrong order gives a return portal that loses
      expect(judge(r, { p: fOfG(r, 0), q: r.ans.q })).toBe(false);
      expect(homeAll(r, { p: fOfG(r, 0), q: r.ans.q })).toBe(false);
      expect(outcome(r, { p: fOfG(r, 0), q: r.ans.q })).not.toBe(0);
    }
  });
  it('the working names both orders', () => {
    const r = trips(5).flat().find((x) => lin(x).fText === 'x − 3')!;
    expect(explain(r)).toBe('g(f(x)) = g(x − 3) = −2x + 7. Undo that: x = (y − 7)/(−2). In the other order, f(g(x)) = −2x − 2, which is a different map: the order of composition matters.');
    expect(intel(r)).toBe('Travellers go through portal f(x) = x − 3, then portal g(x) = −2x + 1. Build one return portal (y − p)/q that brings them all home.');
  });
});

describe('levels 4 and 5: only the answer wins, and a miss shows only the side', () => {
  const rounds = (level: number) => trips(level).flat();
  it('exactly one (p, q) wins every round, and "judge" agrees with "every traveller 0 to 4 lands on his home marker"', () => {
    for (const level of [4, 5]) {
      for (const r of rounds(level)) {
        const wins = everyDial().filter((v) => judge(r, v));
        expect(wins).toEqual([r.ans]);
        for (const v of everyDial()) expect(homeAll(r, v)).toBe(judge(r, v));
        expect(judge(r, { p: r.ans.p, q: 0 })).toBe(false);
        expect(r.ans.q).not.toBe(0);
        expect(Number.isInteger(r.ans.p) && Number.isInteger(r.ans.q)).toBe(true);
      }
    }
  });
  it('the start setting never wins, and q starts nonzero, inside the dial', () => {
    for (const level of [4, 5]) {
      for (const r of rounds(level)) {
        const start = { p: PQ.p.start, q: startQ(r) };
        expect(judge(r, start)).toBe(false);
        expect(homeAll(r, start)).toBe(false);
        expect(start.q).not.toBe(0);
        expect(start.q).toBeGreaterThanOrEqual(PQ.q.min);
        expect(start.q).toBeLessThanOrEqual(PQ.q.max);
      }
    }
    const fake = { ans: { p: 3, q: 1 } } as unknown as Round;
    expect(startQ(fake)).toBe(2);
  });
  it('the answer is not won by position alone: never at a dial end or the start, and no setting wins two rounds', () => {
    for (const level of [4, 5]) {
      for (const rs of trips(level)) {
        for (const r of rs) {
          expect([PQ.p.min, PQ.p.max, PQ.p.start]).not.toContain(r.ans.p);
          expect([PQ.q.min, PQ.q.max, startQ(r)]).not.toContain(r.ans.q);
        }
        const pairs = rs.map((r) => `${r.ans.p},${r.ans.q}`);
        expect(new Set(pairs).size).toBe(3);
        for (const r of rs) expect(rs.filter((o) => judge(o, r.ans)).length).toBe(1);
      }
    }
  });
  it('a miss text names no number and no traveller, only the side, and the side is that of the first traveller who missed home', () => {
    for (const level of [4, 5]) {
      for (const r of rounds(level).slice(0, 40)) {
        for (const v of everyDial()) {
          if (judge(r, v)) continue;
          const text = missText(r, v);
          if (v.q === 0) {
            expect(text).toBe('A portal cannot divide by zero.');
            continue;
          }
          expect(text).not.toMatch(/\d/);
          expect(text).not.toMatch(/traveller [a-z]*\s?\d|[−-]\d|should/);
          // the first traveller who does not land on his own marker, found with real division
          const first = TRAVELLERS.find((x) => Math.abs((gOfF(r, x) - v.p) / v.q - x) > 1e-9)!;
          const side = Math.sign((gOfF(r, first) - v.p) / v.q - first);
          expect(outcome(r, v)).toBe(side);
          expect(text).toContain(side > 0 ? 'to the right of home' : 'to the left of home');
        }
      }
    }
  });
  it('the animation follows judge: it shows "everyone home" exactly when judge says so, and otherwise only a side (-1 or 1)', () => {
    for (const level of [4, 5]) {
      for (const r of rounds(level).slice(0, 40)) {
        for (const v of everyDial()) {
          const side = outcome(r, v);
          expect(side === 0).toBe(judge(r, v));
          expect([-1, 0, 1]).toContain(side);
        }
      }
    }
  });
  it('the paid test walk may show a number (one traveller, one equation), and q = 0 is no portal', () => {
    const r = trips(4)[0][0];
    const v = { p: 0, q: 3 };
    const L = landing(r, v, 1)!;
    expect(spotText(r, v)).toContain(`came out of your return portal at ${ratio(L.num, L.den)}. Home is 1.`);
    expect(spotText(r, { p: 0, q: 0 })).toBe('A portal cannot divide by zero.');
    expect(landing(r, { p: 0, q: 0 }, 1)).toBeNull();
    expect(ratio(7, 3)).toBe('7/3');
    expect(ratio(7, -3)).toBe('−7/3');
    expect(ratio(6, -3)).toBe('−2');
    expect(ratio(-4, 6)).toBe('−2/3');
    expect(ratio(0, 5)).toBe('0');
  });
  it('words: helpers fade, f is written the textbook way, and every text is long enough', () => {
    expect(linText(2, 3)).toBe('2x + 3');
    expect(linText(-1, 4)).toBe('−x + 4');
    expect(linText(3, 0)).toBe('3x');
    expect(linText(1, -5)).toBe('x − 5');
    for (const level of [4, 5]) {
      expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
      const lines = buildRounds(level, createRng(5)).map(aidLine);
      expect(new Set(lines).size).toBe(3);
      for (const r of rounds(level).slice(0, 30)) {
        expect(intel(r)).toContain('(y − p)/q');
        expect(intel(r)).toContain(lin(r).fText);
        expect(explain(r).length).toBeGreaterThan(40);
      }
    }
  });
});

describe('levels 1 to 3: a miss says the kind of fault only, never a pair, a door or a count', () => {
  it('level 1: no miss text has a digit (so it holds no pair, door or fence), and the text depends only on the kind of fault', () => {
    for (const r of all(1).slice(0, 30)) {
      const byFault = new Map<string, Set<string>>();
      for (const lo of span(DOMAIN.min, DOMAIN.max)) {
        for (const hi of span(DOMAIN.min, DOMAIN.max)) {
          const v = { lo, hi };
          if (judge(r, v)) continue;
          const text = missText(r, v);
          expect(text).not.toMatch(/\d/);
          const fault = domainFault(r, v);
          expect(fault).not.toBe('ok');
          byFault.set(fault, (byFault.get(fault) ?? new Set()).add(text));
        }
      }
      for (const texts of byFault.values()) expect(texts.size).toBe(1);
    }
  });
  it('level 1: two different jamming fences give the same text and the same fault, which is all the animation draws', () => {
    const r = all(1).find((x) => x.turns.length === 1 && x.turns[0] === 0 && x.pip > 0) ?? all(1).find((x) => x.turns.length === 1)!;
    const t = r.turns[0];
    const a = { lo: Math.max(DOMAIN.min, t - 1), hi: Math.min(DOMAIN.max, t + 1) };
    const b = { lo: DOMAIN.min, hi: DOMAIN.max };
    if (r.pip >= a.lo && r.pip <= a.hi) {
      expect(domainFault(r, a)).toBe('jam');
      expect(domainFault(r, b)).toBe('jam');
      expect(missText(r, a)).toBe(missText(r, b));
    }
  });
  it('level 2: no miss text has a digit, and it depends only on which end is too narrow or too wide', () => {
    for (const r of all(2).slice(0, 12)) {
      const byFault = new Map<string, Set<string>>();
      for (const lo of span(RANGE.min, RANGE.max)) {
        for (const hi of span(RANGE.min, RANGE.max)) {
          const v = { lo, hi };
          if (judge(r, v)) continue;
          const text = missText(r, v);
          expect(text).not.toMatch(/\d/);
          const key2 = rangeFault(r, v).join('/');
          byFault.set(key2, (byFault.get(key2) ?? new Set()).add(text));
        }
      }
      for (const texts of byFault.values()) expect(texts.size).toBe(1);
      // two wrong settings on the same side: same fault, same text
      expect(rangeFault(r, { lo: r.ans.lo - 1, hi: r.ans.hi })).toEqual(rangeFault(r, { lo: r.ans.lo - 4, hi: r.ans.hi }));
      expect(missText(r, { lo: r.ans.lo - 1, hi: r.ans.hi })).toBe(missText(r, { lo: r.ans.lo - 4, hi: r.ans.hi }));
      expect(missText(r, { lo: r.ans.lo + 1, hi: r.ans.hi })).toBe(missText(r, { lo: r.ans.lo + 3, hi: r.ans.hi }));
      expect(rangeFault(r, r.ans)).toEqual(['ok', 'ok']);
    }
  });
  it('level 3: the ledger text has no number, so it never holds the count', () => {
    for (const r of buildRounds(3, createRng(1))) for (const c of span(COUNT.min, COUNT.max)) if (c !== r.ans.c) expect(missText(r, { c })).not.toMatch(/\d/);
  });
});
