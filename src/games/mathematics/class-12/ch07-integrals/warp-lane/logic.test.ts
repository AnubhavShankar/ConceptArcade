import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { POOLS, RANGE, RUN, START, backwards, buildRounds, fault, hintText, intel, judge, laneDir, missText, outcome, sixths, testText, uv, verdictTime, winText, type Level, type Row } from './logic';

const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const levels = [1, 2, 3, 4] as const;
const rows: { level: Level; k: number; r: Row }[] = levels.flatMap((level) => POOLS[level].flatMap((pool, k) => pool.map((r) => ({ level, k, r }))));

const simpson = (f: (x: number) => number, a: number, b: number, n: number) => {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
  return (s * h) / 3;
};
const N = 20000;
const { E, PI, log, exp } = Math;
/** The value of every integral written as text, computed independently of the row. */
const VALUES: Record<string, number> = {
  '78': 78,
  'e⁴ − e': E ** 4 - E,
  '31/5': 31 / 5,
  '(1/2) log(9/5)': 0.5 * log(9 / 5),
  'log 6': log(6),
  '61/3': 61 / 3,
  '1/2': 1 / 2,
  'log 2': log(2),
  'log(3/2)': log(1.5),
  '9': 9,
  '(1/2) log 5': 0.5 * log(5),
  '1/3': 1 / 3,
  'π/4': PI / 4,
  '1/8': 1 / 8,
  '52/9': 52 / 9,
  '(2/3) log 3': (2 / 3) * log(3),
  '(1/2)(1 − 1/e)': 0.5 * (1 - 1 / exp(1)),
};

describe('the pools', () => {
  it('have 4 levels of 3 rounds, 22 rows in all', () => {
    expect(rows.length).toBe(6 + 5 + 7 + 4);
    for (const level of levels) expect(POOLS[level].length).toBe(3);
  });

  it('every row checked by Simpson’s rule: the integral over x equals (k/6) times the integral of h over u, and u(a), u(b) are the limits', () => {
    for (const { r } of rows) {
      const inX = simpson(r.f, r.a, r.b, N);
      const inU = (r.k6 / 6) * simpson(r.h, r.lo, r.hi, N);
      expect(Math.abs(inX - inU), `${r.text}: ${inX} against ${inU}`).toBeLessThan(1e-6);
      expect(Math.abs(r.u(r.a) - r.lo), `${r.text} lower`).toBeLessThan(1e-9);
      expect(Math.abs(r.u(r.b) - r.hi), `${r.text} upper`).toBeLessThan(1e-9);
    }
  });

  it('the written value of every row is the integral, checked by Simpson’s rule', () => {
    for (const { r } of rows) {
      expect(VALUES[r.valueText], `${r.valueText} is in the table`).toBeDefined();
      expect(Math.abs(simpson(r.f, r.a, r.b, N) - VALUES[r.valueText]), r.text).toBeLessThan(1e-6);
    }
  });

  it('every answer is on the dials, the factor is never 0, and the levels bring what they promise', () => {
    for (const { level, r } of rows) {
      expect(r.lo).toBeGreaterThanOrEqual(RANGE.lo.min);
      expect(r.lo).toBeLessThanOrEqual(RANGE.lo.max);
      expect(r.hi).toBeGreaterThanOrEqual(RANGE.hi.min);
      expect(r.hi).toBeLessThanOrEqual(RANGE.hi.max);
      expect(r.k6).not.toBe(0);
      expect(Math.abs(r.k6)).toBeLessThanOrEqual(RANGE.k.max);
      expect(Number.isInteger(r.lo) && Number.isInteger(r.hi) && Number.isInteger(r.k6)).toBe(true);
      expect(r.lo, `${r.text}: the mouths are never the same place`).not.toBe(r.hi);
      if (level === 3 && r.hi < r.lo) expect(r.k6).toBeLessThan(0);
    }
    expect(rows.filter((x) => x.level === 3 && x.r.hi < x.r.lo && x.r.k6 < 0).length).toBeGreaterThanOrEqual(5);
    expect(rows.filter((x) => x.level === 4 && x.r.k6 === 2).length).toBe(2);
    expect(rows.some((x) => x.level === 4 && x.r.hi < 0)).toBe(true);
  });
});

describe('exactly one setting wins', () => {
  it('for every row, scanning each dial over its whole range with the others at the answer, only the answer passes judge', () => {
    for (const { r } of rows) {
      const ans = { lo: r.lo, hi: r.hi, k: r.k6 };
      expect(judge(r, ans)).toBe(true);
      for (const key of ['lo', 'hi', 'k'] as const) {
        let winners = 0;
        for (let x = RANGE[key].min; x <= RANGE[key].max; x++) if (judge(r, { ...ans, [key]: x })) winners++;
        expect(winners, `${r.text} ${key}`).toBe(1);
      }
    }
  });

  it('over every combination of the three dials only the answer wins, and the scene’s outcome agrees with judge', () => {
    for (const { r } of rows) {
      let winners = 0;
      for (let lo = RANGE.lo.min; lo <= RANGE.lo.max; lo++)
        for (let hi = RANGE.hi.min; hi <= RANGE.hi.max; hi++)
          for (let k = RANGE.k.min; k <= RANGE.k.max; k++) {
            const v = { lo, hi, k };
            const ok = judge(r, v);
            if (ok) winners++;
            expect(outcome(r, v) === 'win').toBe(ok);
            expect(fault(r, v) === null).toBe(ok);
          }
      expect(winners, r.text).toBe(1);
    }
  });

  it('the start never wins, whichever round it is', () => {
    for (const { r } of rows) {
      expect(judge(r, START)).toBe(false);
      expect(fault(r, START)).not.toBeNull();
      expect(r.k6).not.toBe(START.k);
    }
    for (const level of levels) for (const seed of seeds) for (const r of buildRounds(level, createRng(seed))) expect(judge(r, START)).toBe(false);
  });

  it('the fault comes in the order the kart meets the parts: entry, then exit, then boost', () => {
    for (const { r } of rows) {
      const ans = { lo: r.lo, hi: r.hi, k: r.k6 };
      expect(fault(r, ans)).toBeNull();
      expect(fault(r, { ...ans, k: ans.k + 1 })).toBe('boost');
      expect(fault(r, { ...ans, hi: ans.hi + 1, k: ans.k + 1 })).toBe('exit');
      expect(fault(r, { lo: ans.lo + 1, hi: ans.hi + 1, k: ans.k + 1 })).toBe('entry');
      expect(fault(r, { ...ans, lo: ans.lo + 1 })).toBe('entry');
    }
  });

  it('a boost that is too big is fast and any other wrong boost is slow; a real boost the wrong way round is backwards', () => {
    const r = POOLS[3][0][1]; // k6 = −6
    const ans = { lo: r.lo, hi: r.hi, k: r.k6 };
    expect(outcome(r, { ...ans, k: -9 })).toBe('fast');
    expect(outcome(r, { ...ans, k: -3 })).toBe('slow');
    expect(outcome(r, { ...ans, k: 6 })).toBe('slow');
    expect(outcome(r, { ...ans, k: 9 })).toBe('fast');
    expect(backwards(r, { ...ans, k: 6 })).toBe(true);
    expect(backwards(r, { ...ans, k: -3 })).toBe(false);
    expect(backwards(r, { ...ans, k: 0 })).toBe(false);
    expect(backwards(POOLS[1][0][0], { lo: 1, hi: 5, k: -3 })).toBe(true);
  });
});

describe('the race', () => {
  it('the verdict lands inside the 2.4 s of an attempt, in order, and a win comes last', () => {
    for (const { r } of rows) {
      const ans = { lo: r.lo, hi: r.hi, k: r.k6 };
      const entry = verdictTime(r, { ...ans, lo: ans.lo + 1 });
      const exit = verdictTime(r, { ...ans, hi: ans.hi + 1 });
      const boost = verdictTime(r, { ...ans, k: ans.k + 1 });
      const win = verdictTime(r, ans);
      for (const t of [entry, exit, boost, win]) expect(t).toBeLessThan(2.4);
      expect(entry).toBeLessThan(exit);
      expect(exit).toBeLessThan(boost);
      expect(boost).toBeLessThan(win);
      expect(entry).toBeCloseTo(0.55, 9);
      expect(exit).toBeCloseTo(1.4, 9);
      expect(boost).toBeCloseTo(1.5, 9);
      expect(win).toBeCloseTo(RUN.into + RUN.lane + RUN.out, 9);
    }
  });

  it('the kart drives to the left in u-land when the exit is left of the entry (level 3, level 4 negative limit)', () => {
    for (const { r } of rows.filter((x) => x.level === 3 && x.r.hi < x.r.lo)) {
      expect(laneDir({ lo: r.lo, hi: r.hi, k: r.k6 })).toBe(-1);
    }
    expect(rows.filter((x) => x.level === 3 && x.r.hi < x.r.lo).length).toBe(6);
    const neg = POOLS[4][2][0];
    expect(laneDir({ lo: neg.lo, hi: neg.hi, k: neg.k6 })).toBe(-1);
    const fwd = POOLS[1][0][0];
    expect(laneDir({ lo: fwd.lo, hi: fwd.hi, k: fwd.k6 })).toBe(1);
  });
});

describe('the rounds', () => {
  it('every level over 80 seeds has three rounds with assist 0, 1, 2, each drawn from its own pool', () => {
    for (const level of levels) {
      for (const seed of seeds) {
        const rounds = buildRounds(level, createRng(seed));
        expect(rounds.map((x) => x.assist)).toEqual([0, 1, 2]);
        rounds.forEach((x, k) => expect(POOLS[level][k].some((p) => p.text === x.text && p.lo === x.lo && p.hi === x.hi && p.k6 === x.k6)).toBe(true));
      }
    }
  });

  it('over many seeds the rounds with several rows in the pool vary', () => {
    for (const level of levels) {
      const names = new Set(seeds.map((s) => buildRounds(level, createRng(s))[1].text));
      expect(names.size).toBeGreaterThan(1);
    }
  });
});

describe('the words', () => {
  it('sixths writes k/6 reduced with a true minus sign', () => {
    expect([6, 3, -6, -3, 2, 0, 4, 12, 1, -12, 9, -4, 5].map(sixths)).toEqual(['1', '1/2', '−1', '−1/2', '1/3', '0', '2/3', '2', '1/6', '−2', '3/2', '−2/3', '5/6']);
  });

  it('the intel names the integral, the substitution, both limits and du; the hint line fades with the rounds', () => {
    const r = POOLS[1][0][0];
    expect(intel(r)).toBe('Track: ∫₀² x(x² + 1)³ dx. Warp: u = x² + 1. Place the entry mouth at the u where x = 0 lands, the exit mouth where x = 2 lands, and set the boost from du = 2x dx.');
    expect(hintText({ ...r, assist: 0 })).toContain('Round 1: the ghost kart shows the clean line.');
    expect(hintText({ ...r, assist: 1 })).toContain('No ghost: a test lap costs a charge.');
    expect(hintText({ ...r, assist: 2 })).toContain('Boss round: no ghost, no test lap.');
  });

  it('the test lap says right or wrong for each part, and nothing else', () => {
    const r = POOLS[1][0][0];
    expect(testText(r, { lo: 1, hi: 4, k: 3 })).toBe('Test lap: the entry is right, the exit is wrong and the boost is right.');
    expect(testText(r, START)).toBe('Test lap: the entry is wrong, the exit is wrong and the boost is wrong.');
  });

  /** The right values in the form a miss text could state them: as a u, or as the boost. */
  const states = (text: string, r: Row) => [r.lo, r.hi].some((n) => text.includes(`u = ${uv(n)}`)) || text.includes(`boost ${sixths(r.k6)} was`) || text.includes(`boost ×${sixths(r.k6)}`);

  it('a miss never states a right value: every row, every wrong setting of all three dials', () => {
    for (const { r } of rows) {
      for (let lo = RANGE.lo.min; lo <= RANGE.lo.max; lo++)
        for (let hi = RANGE.hi.min; hi <= RANGE.hi.max; hi += 5)
          for (let k = RANGE.k.min; k <= RANGE.k.max; k += 3) {
            const v = { lo, hi, k };
            if (judge(r, v)) continue;
            const text = missText(r, v);
            const o = outcome(r, v);
            if (o === 'entry') {
              // only the player’s own entry is named; a wrong entry is never the right u
              expect(text).toContain(`at u = ${uv(lo)}:`);
              expect(text).not.toMatch(/boost|exit mouth/);
              expect(lo).not.toBe(r.lo);
            } else if (o === 'exit') {
              expect(text).toContain(`exit mouth at u = ${uv(hi)} is not`);
              expect(text.match(/u = /g)?.length).toBe(1);
              expect(text).not.toMatch(/boost/);
              expect(hi).not.toBe(r.hi);
            } else {
              expect(text).toContain(`the boost ${sixths(k)} was wrong`);
              expect(text).toContain(o ==='fast' ? 'too fast and spun out' : 'too slow and stalled');
              expect(text).not.toMatch(/u = /);
              expect(states(text, r)).toBe(false);
            }
          }
    }
  });

  it('the win text says Clean warp! and carries the substitution, both limits, the factor and the value', () => {
    for (const { r } of rows) {
      const t = winText(r);
      expect(t).toContain('Clean warp!');
      expect(t).toContain(r.uText);
      expect(t).toContain(r.duText);
      expect(t).toContain(`When x = ${r.aText}, u = ${uv(r.lo)}; when x = ${r.bText}, u = ${uv(r.hi)}`);
      expect(t).toContain(`${sixths(r.k6)} × ∫ from ${uv(r.lo)} to ${uv(r.hi)} of ${r.hText} du = ${r.valueText}`);
      expect(t).not.toContain('-');
    }
    expect(winText(POOLS[3][0][1])).toContain('−1 × ∫ from 1 to 0 of u² du = 1/3');
    expect(winText(POOLS[4][2][0])).toContain('−1/2 × ∫ from 0 to −1 of eᵘ du');
  });

  it('no text uses a pronoun for Zip', () => {
    const all = [...rows.map((x) => winText(x.r)), ...rows.map((x) => missText(x.r, START)), ...rows.map((x) => missText(x.r, { lo: x.r.lo, hi: x.r.hi, k: x.r.k6 + 1 }))].join(' ');
    expect(all).not.toMatch(/\b(she|her|hers|he|him|his)\b/i);
  });
});

describe('rounds never repeat an integral within a level', () => {
  it('the three rounds of every level race three different integrals', () => {
    for (const level of levels) for (const seed of seeds) {
      const texts = buildRounds(level, createRng(seed)).map((r) => r.text);
      expect(new Set(texts).size).toBe(3);
    }
  });
});
