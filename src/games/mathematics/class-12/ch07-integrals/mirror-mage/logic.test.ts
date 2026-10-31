import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { POOLS, RANGE, UNIT, buildRounds, fault, foldPlan, half, hintText, intel, judge, manaText, manaValue, mirrorText, missText, pi8, pilog, recip, winText, type Row } from './logic';

const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const levels = [1, 2, 3, 4, 5] as const;
const rows: { level: 1 | 2 | 3 | 4 | 5; k: number; r: Row }[] = levels.flatMap((level) => POOLS[level].flatMap((pool, k) => pool.map((r) => ({ level, k, r }))));

const simpson = (f: (x: number) => number, a: number, b: number, n: number) => {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
  return (s * h) / 3;
};
/** Simpson's rule after a substitution that flattens both ends, for the log integrands that blow up at an end point. */
const flat = (f: (x: number) => number, a: number, b: number, n: number) =>
  simpson(
    (t) => {
      const s = 3 * t * t - 2 * t ** 3;
      const ds = 6 * t - 6 * t * t;
      return ds === 0 ? 0 : f(a + (b - a) * s) * (b - a) * ds;
    },
    0,
    1,
    n,
  );
const integral = (level: number, r: Row) => {
  if (r.name === '1/(1 + tan³ x)') return simpson(r.f, r.a, r.b - 1e-12, 20000);
  if (level === 5 && r.name !== 'log(1 + tan x)') return flat(r.f, r.a, r.b, 200000);
  return simpson(r.f, r.a, r.b, 20000);
};

describe('the pools', () => {
  it('have 5 levels of 3 rounds, 43 rows in all', () => {
    expect(rows.length).toBe(9 + 10 + 7 + 10 + 7);
    for (const level of levels) expect(POOLS[level].length).toBe(3);
  });

  it('the value of every rune is the mana of its answer, checked numerically', () => {
    for (const { level, r } of rows) {
      const tol = level === 5 && r.name !== 'log(1 + tan x)' ? 2e-4 : 1e-7;
      const got = integral(level, r);
      expect(Math.abs(got - manaValue(UNIT[level], r.ans)), `${r.name} ${r.aText}..${r.bText}: ${got}`).toBeLessThan(tol);
    }
  });

  it('every row has limits and a working that ends in the value', () => {
    for (const { r } of rows) {
      expect(r.a).toBeLessThan(r.b);
      expect(r.work.length).toBeGreaterThan(20);
      expect(r.aText.length).toBeGreaterThan(0);
    }
    for (const { r } of rows.filter((x) => x.level === 1)) expect(r.splits?.length).toBeGreaterThan(0);
  });

  it('the V of every level-1 row turns at its split points', () => {
    for (const { r } of rows.filter((x) => x.level === 1)) {
      for (const s of r.splits!) {
        expect(r.f(s)).toBeCloseTo(0, 12);
        expect(s).toBeGreaterThan(r.a);
        expect(s).toBeLessThan(r.b);
      }
    }
  });
});

describe('exactly one setting wins', () => {
  it('for every row, scanning the whole dial, only the answer passes judge; the answer is in range and the start is not it', () => {
    for (const { level, r } of rows) {
      const R = RANGE[level];
      let winners = 0;
      for (let k = R.min; k <= R.max; k++) {
        if (judge(r, k)) {
          winners++;
          expect(k).toBe(r.ans);
        }
      }
      expect(winners, r.name).toBe(1);
      expect(r.ans).toBeGreaterThanOrEqual(R.min);
      expect(r.ans).toBeLessThanOrEqual(R.max);
      expect(R.start).not.toBe(r.ans);
    }
  });

  it('faults compare values: for the reciprocal level a bigger m is less mana', () => {
    for (const { level, r } of rows) {
      const u = UNIT[level];
      expect(fault(u, r, r.ans)).toBeNull();
      if (level === 3) {
        expect(fault(u, r, r.ans + 1)).toBe('low');
        expect(fault(u, r, r.ans - 1)).toBe('high');
      } else {
        expect(fault(u, r, r.ans - 1)).toBe('low');
        expect(fault(u, r, r.ans + 1)).toBe('high');
      }
    }
  });

  it('every wrong setting is low or high, matching the values it stands for', () => {
    for (const { level, r } of rows) {
      const u = UNIT[level];
      for (let k = RANGE[level].min; k <= RANGE[level].max; k++) {
        if (k === r.ans) continue;
        expect(fault(u, r, k)).toBe(manaValue(u, k) < manaValue(u, r.ans) ? 'low' : 'high');
      }
    }
  });
});

describe('the rounds', () => {
  it('every level over 80 seeds has three rounds with assist 0, 1, 2, each drawn from its own pool', () => {
    for (const level of levels) {
      for (const seed of seeds) {
        const rounds = buildRounds(level, createRng(seed));
        expect(rounds.map((x) => x.assist)).toEqual([0, 1, 2]);
        rounds.forEach((x, k) => expect(POOLS[level][k].some((p) => p.name === x.name && p.ans === x.ans && p.aText === x.aText && p.bText === x.bText)).toBe(true));
      }
    }
  });

  it('over many seeds the rounds with several runes in the pool vary', () => {
    for (const level of levels) {
      const names = new Set(seeds.map((s) => buildRounds(level, createRng(s))[1].name + buildRounds(level, createRng(s))[1].bText));
      expect(names.size).toBeGreaterThan(1);
    }
  });
});

describe('the fold of level 4', () => {
  it('every rune of level 4 folds at the middle of its range, equal halves or opposite halves', () => {
    for (const { r } of rows.filter((x) => x.level === 4)) {
      const plan = foldPlan(r);
      expect(plan.odd, r.name).not.toBeNull();
      const mid = (plan.lo + plan.hi) / 2;
      for (let i = 1; i < 10; i++) {
        const x = plan.lo + ((mid - plan.lo) * i) / 10;
        const w = r.f(plan.lo + plan.hi - x);
        expect(Math.abs(w - (plan.odd ? -1 : 1) * r.f(x))).toBeLessThan(1e-9);
      }
    }
  });

  it('cos⁵ x over [0, 2π] folds the half [0, π], where the halves cancel; sin⁷ x over [−π/2, π/2] is odd', () => {
    const cos5 = rows.find((x) => x.r.name === 'cos⁵ x')!.r;
    const p = foldPlan(cos5);
    expect(p.lo).toBe(0);
    expect(p.hi).toBeCloseTo(Math.PI, 12);
    expect(p.odd).toBe(true);
    const sin7 = rows.find((x) => x.r.name === 'sin⁷ x')!.r;
    expect(foldPlan(sin7).odd).toBe(true);
    const sin2 = rows.find((x) => x.r.name === 'sin² x' && x.r.aText === '−π/2')!.r;
    expect(foldPlan(sin2).odd).toBe(false);
  });
});

describe('the words', () => {
  it('half writes k/2 reduced', () => {
    expect([10, 13, 9, 0, 34, 58].map(half)).toEqual(['5', '13/2', '9/2', '0', '17', '29']);
  });
  it('pi8 writes k eighths of π reduced', () => {
    expect([0, 1, 2, 3, 4, 6, 8, 12, 16, 5, 10].map(pi8)).toEqual(['0', 'π/8', 'π/4', '3π/8', 'π/2', '3π/4', 'π', '3π/2', '2π', '5π/8', '5π/4']);
  });
  it('recip writes 1/m', () => {
    expect(recip(12)).toBe('1/12');
  });
  it('pilog writes the sign, then (π/8) log 2 style', () => {
    const got = [0, 1, 2, 4, 8, -4, -8, 3, 12].map(pilog);
    expect(got).toEqual(['0', '(π/8) log 2', '(π/4) log 2', '(π/2) log 2', 'π log 2', '−(π/2) log 2', '−π log 2', '(3π/8) log 2', '(3π/2) log 2']);
  });
  it('manaText follows the level’s unit', () => {
    expect(manaText('half', 13)).toBe('13/2');
    expect(manaText('pi8', 2)).toBe('π/4');
    expect(manaText('recip', 30)).toBe('1/30');
    expect(manaText('pilog', -8)).toBe('−π log 2');
  });

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /** The answer's text as a separate token: not part of a longer number or fraction. */
  const holds = (text: string, s: string) => new RegExp(`(?<![\\w/π−])${escape(s)}(?![\\w/π])`).test(text);

  it('a miss says fizzled (low) or backfired (high), names the player’s own mana, and never the right amount', () => {
    for (const { level, r } of rows) {
      const u = UNIT[level];
      for (let k = RANGE[level].min; k <= RANGE[level].max; k++) {
        if (k === r.ans) continue;
        const text = missText(level, r, k);
        expect(text).toMatch(fault(u, r, k) === 'low' ? /fizzled/ : /backfired/);
        expect(text).toContain(manaText(u, k));
        if (manaText(u, k) !== manaText(u, r.ans)) expect(holds(text, manaText(u, r.ans)), `${r.name} k=${k}: ${text}`).toBe(false);
      }
    }
  });

  it('the win text says Barrier broken! and carries the working', () => {
    for (const { r } of rows) {
      expect(winText(r)).toContain('Barrier broken!');
      expect(winText(r)).toContain(r.work);
    }
  });

  it('the intel names the integrand, the limits and the unit; the hint line fades with the rounds', () => {
    const row = POOLS[2][0][0];
    expect(intel(2, row)).toContain(`∫ ${row.name} dx from 0 to π/2`);
    expect(intel(2, row)).toContain('in units of π/8');
    expect(intel(3, POOLS[3][0][0])).toContain('as 1/m of a crystal: set m');
    expect(hintText(2, { ...row, assist: 0 })).toContain('Round 1: the mirror shows the rune’s hidden shape.');
    expect(hintText(2, { ...row, assist: 1 })).toContain('a mirror spell costs a charge');
    expect(hintText(2, { ...row, assist: 2 })).toContain('Boss round: no mirror.');
    expect(mirrorText(1)).toBe('Mirror spell: the rune shows where to split it.');
    expect(mirrorText(4)).toBe('Mirror spell: the rune and its mirror image appear together for a moment.');
  });

  it('no text uses a pronoun for Lyra', () => {
    const all = [...rows.map((x) => winText(x.r)), mirrorText(1), mirrorText(2), ...levels.map((l) => missText(l, POOLS[l][0][0], RANGE[l].start))].join(' ');
    expect(all).not.toMatch(/\b(she|her|hers|he|him|his)\b/i);
  });
});
