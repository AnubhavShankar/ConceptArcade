import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { CABLE_ROWS, barRatio, buildRounds, climberAt, explain, intel, judge, kText, missText, objective, show, spotText, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const settings = (r: Round) => Array.from({ length: r.hi - r.lo + 1 }, (_, i) => r.lo + i);

describe('every round has exactly one best whole-number setting', () => {
  it('the setting from calculus is the true extreme of a scan of every dial position, strictly', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        expect(Number.isInteger(r.best)).toBe(true);
        expect(r.best).toBeGreaterThanOrEqual(r.lo);
        expect(r.best).toBeLessThanOrEqual(r.hi);
        const best = objective(r, r.best);
        for (const s of settings(r)) {
          if (s === r.best) continue;
          if (r.goal === 'max') expect(objective(r, s)).toBeLessThan(best - 1e-9);
          else expect(objective(r, s)).toBeGreaterThan(best + 1e-9);
        }
      }
    }
  });
  it('judge accepts only that setting', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) expect(settings(r).filter((s) => judge(r, s))).toEqual([r.best]);
    }
  });
  it('the calculus really is a stationary point: a half-step either side is worse', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        const m = objective(r, r.best);
        for (const e of [0.05, -0.05]) {
          const v = objective(r, r.best + e);
          if (r.goal === 'max') expect(v).toBeLessThan(m);
          else expect(v).toBeGreaterThan(m);
        }
      }
    }
  });
  it('the dial starts away from the answer, and the helpers fade', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) expect(r.start).not.toBe(r.best);
      expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
    }
  });
  it('levels use the exercises’ shapes and goals', () => {
    expect(buildRounds(1, createRng(3)).map((r) => r.shape)).toEqual(['square', 'square', 'rect']);
    expect(buildRounds(2, createRng(3)).map((r) => r.shape)).toEqual(['can', 'can', 'tank']);
    expect(buildRounds(3, createRng(3)).map((r) => r.shape)).toEqual(['cone', 'cylVol', 'cylSurf']);
    expect(buildRounds(4, createRng(3)).map((r) => r.shape)).toEqual(['cable', 'cable', 'cable']);
    expect(all(1).every((r) => r.goal === 'max') && all(2).every((r) => r.goal === 'min') && all(4).every((r) => r.goal === 'min')).toBe(true);
  });
  it('matches the textbook numbers: 18 cm sheet cut 3 cm (432 cm³), 45 by 24 cut 5 cm (2450 cm³), tank ₹1000, nearest point √5', () => {
    const sq = { shape: 'square', goal: 'max', a: 18, b: 0, c: 0, d: 0, best: 3, lo: 1, hi: 8, start: 1, assist: 0 } as Round;
    expect(objective(sq, 3)).toBe(432);
    const rc = { ...sq, shape: 'rect', a: 45, b: 24, best: 5, hi: 11 } as Round;
    expect(objective(rc, 5)).toBe(2450);
    const tank = { ...sq, shape: 'tank', goal: 'min', a: 4, b: 2, c: 70, d: 45, best: 2, hi: 10 } as Round;
    expect(objective(tank, 2)).toBe(1000);
    const cable = { ...sq, shape: 'cable', goal: 'min', a: 1, b: 3, best: 1, lo: -5, hi: 7 } as Round;
    expect(objective(cable, 1)).toBe(5);
  });
});

describe('level 4 cable rounds: the pool is wide, every row is checked, and no rule of thumb wins', () => {
  it('every cable row is checked against a scan of the real distance, with the climber on the screen and at least 1 from the answer', () => {
    expect(CABLE_ROWS.length).toBeGreaterThanOrEqual(14);
    for (const { k, x, b } of CABLE_ROWS) {
      expect(Math.abs(b - climberAt(k, x))).toBeLessThan(1e-12);
      expect(Math.abs(b * 100 - Math.round(b * 100))).toBeLessThan(1e-9);
      expect(b).toBeGreaterThanOrEqual(-6);
      expect(b).toBeLessThanOrEqual(8);
      expect(Math.abs(b - x)).toBeGreaterThanOrEqual(1);
      const r = { shape: 'cable', goal: 'min', a: k, b, c: 0, d: 0, best: x, lo: -6, hi: 8, start: 0, assist: 0 } as Round;
      const D2 = (s: number) => (s - b) ** 2 + (k * s * s) ** 2;
      for (let s = -6; s <= 8; s++) if (s !== x) expect(D2(s)).toBeGreaterThan(D2(x) + 1e-9);
      // the exact minimum of D² over all real x is at the integer x*: (D²)′ = 0 there
      expect(Math.abs(2 * (x - b) + 4 * k * k * x ** 3)).toBeLessThan(1e-9);
      expect(objective(r, x)).toBeCloseTo(D2(x), 9);
    }
  });
  it('answers, curvatures and the ratio of the climber’s x to the answer all vary across seeds', () => {
    const rounds = all(4);
    expect(new Set(rounds.map((r) => r.best)).size).toBeGreaterThanOrEqual(7);
    expect(new Set(rounds.map((r) => r.a)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(rounds.map((r) => Number((r.b / r.best).toFixed(2)))).size).toBeGreaterThanOrEqual(5);
    // no fixed fraction of the climber's x wins more than a third of the rounds
    const count = new Map<number, number>();
    for (const r of rounds) count.set(Number((r.b / r.best).toFixed(2)), (count.get(Number((r.b / r.best).toFixed(2))) ?? 0) + 1);
    expect(Math.max(...count.values())).toBeLessThanOrEqual(rounds.length / 3);
    // putting Fold straight under the climber never wins, and neither does the mirror image of the previous round
    for (const r of rounds) expect(Math.round(r.b)).not.toBe(r.best);
    for (const s of seeds) {
      const [r1, r2, r3] = buildRounds(4, createRng(s));
      expect(r2.best).not.toBe(-r1.best);
      expect(new Set([r1.a, r2.a, r3.a]).size).toBe(3);
      expect(new Set([r1.best, r2.best, r3.best]).size).toBe(3);
    }
  });
  it('the dial is wider, the start is 0 and never the answer, and every answer is on the dial', () => {
    for (const r of all(4)) {
      expect([r.lo, r.hi]).toEqual([-6, 8]);
      expect(r.start).toBe(0);
      expect(r.best).not.toBe(0);
    }
  });
  it('the working and the story write the curvature and the climber with signs and decimals that are true', () => {
    for (const r of all(4).slice(0, 40)) {
      expect(intel(r)).toContain(`y = ${kText(r.a)}x²`);
      expect(explain(r)).toContain(`(${kText(r.a)}x²)²`);
      expect(explain(r)).not.toMatch(/− -|NaN|undefined/);
    }
  });
});

describe('words never give the answer away', () => {
  it('misses describe the build, with no derivative work or optimum', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 40)) {
        for (const s of settings(r).filter((x) => x !== r.best)) {
          const t = missText(r, s);
          expect(t.length).toBeGreaterThan(25);
          expect(t).not.toMatch(/′|derivative|best|should|optimum|too (small|large|big)/i);
        }
        expect(spotText(r, r.start)).toContain(show(r, r.start));
      }
    }
  });
  it('a miss holds no number at all: no volume, metal, cost or length, and no setting', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 60)) {
        for (const s of settings(r).filter((x) => x !== r.best)) expect(/\d/.test(missText(r, s))).toBe(false);
      }
    }
  });
  it('two wrong settings on the same side give the same miss text; the two sides differ only in their direction words', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 60)) {
        const wrong = settings(r).filter((x) => x !== r.best);
        const below = wrong.filter((x) => x < r.best);
        const above = wrong.filter((x) => x > r.best);
        for (const side of [below, above]) expect(new Set(side.map((x) => missText(r, x))).size).toBeLessThanOrEqual(1);
        if (below.length && above.length) expect(missText(r, below[0])).not.toBe(missText(r, above[0]));
      }
    }
  });
  it('the build bar is a fixed 0.55 of the target for a maximum that fell short, 1.45 for a minimum that ran over, and exactly 1 on a win, whatever the setting', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 30)) {
        expect(barRatio(r, true)).toBe(1);
        expect(barRatio(r, false)).toBe(r.goal === 'min' ? 1.45 : 0.55);
      }
    }
  });
  it('the working names the derivative step and the second-derivative check', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 30)) {
        const e = explain(r);
        expect(e).toMatch(/′/);
        expect(e).toMatch(/″/);
        expect(e).toContain(String(r.best));
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('a rectangular sheet’s second root is always an impossible cut', () => {
    for (const r of all(1).filter((x) => x.shape === 'rect')) {
      const other = (r.a + r.b + Math.sqrt(r.a * r.a - r.a * r.b + r.b * r.b)) / 6;
      expect(other).toBeGreaterThan(Math.min(r.a, r.b) / 2);
    }
  });
});
