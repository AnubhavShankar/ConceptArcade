import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { MISS_FILL, ON, SPEED, buildRounds, explain, intel, isShort, judge, missText, onTime, poly, volume, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** Composite Simpson rule, to check the written antiderivative against the written rate. */
const simpson = (f: (x: number) => number, a: number, b: number, n = 400) => {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};

describe('the antiderivatives are right', () => {
  it('textbook anchors: the integral of 3x² from 0 to 2 is 8; of x³ from −2 to 3 is 65/4', () => {
    expect(simpson((x) => 3 * x * x, 0, 2)).toBeCloseTo(8, 8);
    expect(simpson((x) => x ** 3, -2, 3)).toBeCloseTo(65 / 4, 8);
  });
  it('every round: F(b) − F(a) equals the numerical integral of f, over every whole-number setting', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 60)) {
        for (const b of span(0, r.max)) {
          const lo = r.sym ? -b : 0;
          const exact = r.F(b) - r.F(lo);
          expect(Math.abs(simpson(r.f, lo, b) - exact)).toBeLessThan(1e-6 * Math.max(1, Math.abs(exact)));
        }
      }
    }
  });
  it('the amounts are whole numbers', () => {
    for (const level of [1, 2, 3, 4]) for (const r of all(level)) for (const b of span(0, r.max)) expect(Number.isInteger(volume(r, b))).toBe(true);
  });
});

describe('every round has exactly one winning setting', () => {
  it('only the answer wins when every setting is tried, and the start never wins', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        expect(span(0, r.max).filter((b) => judge(r, b))).toEqual([r.ans]);
        expect(judge(r, r.start)).toBe(false);
        expect(r.ans).toBeGreaterThan(0);
        expect(r.ans).toBeLessThanOrEqual(r.max);
      }
    }
  });
  it('level 1: later rounds start with water in the tank; level 2 really drains first', () => {
    for (const s of seeds) {
      const rs = buildRounds(1, createRng(s));
      expect(rs[0].c0).toBe(0);
      expect(rs[1].c0).toBeGreaterThan(0);
    }
    for (const r of all(2)) expect(span(1, r.max).some((b) => r.F(b) < r.F(b - 1))).toBe(true);
  });
  it('level 2: the total flow (ignoring the drain) is not the net volume', () => {
    for (const r of all(2)) {
      const total = simpson((x) => Math.abs(r.f(x)), 0, r.ans, 800);
      expect(Math.abs(total - r.V)).toBeGreaterThan(0.5);
    }
  });
  it('level 4: the odd terms cancel, so the volume is the even part doubled', () => {
    for (const r of all(4)) {
      const odd = (x: number) => (r.f(x) - r.f(-x)) / 2;
      expect(Math.abs(simpson(odd, -r.ans, r.ans))).toBeLessThan(1e-6);
      expect(volume(r, r.ans)).toBeCloseTo(2 * simpson((x) => (r.f(x) + r.f(-x)) / 2, 0, r.ans, 800), 4);
    }
  });
  it('the timing window is fair: it takes the exact moment and never a neighbour', () => {
    expect(ON).toBeLessThan(0.5);
    for (const r of all(1)) {
      expect(onTime(r, r.ans)).toBe(true);
      expect(onTime(r, r.ans + ON)).toBe(true);
      expect(onTime(r, r.ans + ON + 0.01)).toBe(false);
      expect(onTime(r, r.ans + 1)).toBe(false);
      // the longest wait is under ten seconds at the normal speed
      expect(r.max / SPEED).toBeLessThan(10);
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3, 4]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('a miss gives a direction only', () => {
  const grid = (r: Round) => Array.from({ length: r.max * 10 + 1 }, (_, i) => i / 10);
  it('short and over follow the volume at the moment of shutting, and never name a moment (a dipping rate can pass the need and return, so "short" is not "too soon")', () => {
    let dipping = 0;
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 60)) {
        for (const t of grid(r)) {
          if (onTime(r, t)) continue;
          const v = r.c0 + (r.sym ? r.F(t) - r.F(-t) : r.F(t) - r.F(0));
          expect(isShort(r, t)).toBe(v < r.V);
          if (t < r.ans && v > r.V) dipping++;
        }
      }
    }
    // this is why the miss text gives no "sooner" or "later": in some rounds an early shut is over the need
    expect(dipping).toBeGreaterThan(0);
  });
  it('the miss text holds no volume and no number but the player’s own moment, and two moments on one side read the same', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 60)) {
        const strip = (s: string) => s.replace(/(from −?[\d.]+ to [\d.]+|at t = [\d.]+)/, 'WHEN');
        const wrongs = grid(r).filter((t) => !onTime(r, t));
        for (const side of [wrongs.filter((t) => isShort(r, t)), wrongs.filter((t) => !isShort(r, t))]) {
          if (side.length < 2) continue;
          const a = strip(missText(r, side[0]));
          const b = strip(missText(r, side[side.length - 1]));
          expect(a).toBe(b);
          expect(a).not.toMatch(/\d/);
          expect(a).not.toMatch(/holds|drained|backwards|sooner|longer/);
        }
        const shorts = wrongs.filter((t) => isShort(r, t));
        const overs = wrongs.filter((t) => !isShort(r, t));
        if (shorts.length) expect(missText(r, shorts[0])).toMatch(/short of/);
        if (overs.length) expect(missText(r, overs[0])).toMatch(/over what/);
      }
    }
  });
  it('the fixed fills never equal the true volume of a round', () => {
    expect(MISS_FILL.short).toBeLessThan(1);
    expect(MISS_FILL.over).toBeGreaterThan(1);
  });
  it('the start (gate closed, t = 0) never wins, and every round has a different winning moment than 0', () => {
    for (const level of [1, 2, 3, 4]) for (const r of all(level)) expect(onTime(r, r.start)).toBe(false);
  });
});

describe('words', () => {
  it('poly writes terms with a true minus sign', () => {
    expect(poly([[3, 2], [-6, 1], [9, 0]])).toBe('3t² − 6t + 9');
    expect(poly([[1, 3], [-1, 1]])).toBe('t³ − t');
  });
  it('misses say which way the tank is off; the rate, the need and the working are stated', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 40) as Round[]) {
        const wrong = r.ans === r.max ? r.ans - 1 : r.ans + 1;
        expect(missText(r, wrong)).toMatch(/short of|over/);
        expect(missText(r, wrong + 0.4).length).toBeGreaterThan(30);
        expect(explain(r)).toMatch(/F\(/);
        expect(intel(r)).toContain(String(r.V));
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3, 4]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.ftext + r.c0)).size).toBe(3);
    }
  });
});
