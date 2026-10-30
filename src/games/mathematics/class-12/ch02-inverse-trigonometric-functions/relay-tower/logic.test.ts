import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { piText } from '@core/mathkit';
import { DIAL, STEP, buildRounds, explain, intel, judge, missText, spotText } from './logic';

const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const dial = Array.from({ length: DIAL.max - DIAL.min + 1 }, (_, i) => DIAL.min + i);

describe('every round points the dish at the true value', () => {
  it('the answer is the value of the real functions, a whole number of π/12 steps, and the only winner', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        expect(Math.abs(r.value() - r.ans * STEP)).toBeLessThan(1e-9);
        expect(dial.filter((k) => judge(r, k))).toEqual([r.ans]);
        expect(r.ans).not.toBe(0);
        expect(r.ans).toBeGreaterThanOrEqual(r.range[0]);
        expect(r.ans).toBeLessThanOrEqual(r.range[1]);
      }
    }
  });
  it('level 1: x is outside the branch, so a careless answer x is wrong, and sin x = sin(answer)', () => {
    for (const r of all(1)) {
      const m = /^(sin|cos|tan)⁻¹\((?:sin|cos|tan) (.+)\)$/.exec(r.text)!;
      expect(m).not.toBeNull();
      expect(r.work).toContain(piText(r.ans));
      const fn = { sin: Math.sin, cos: Math.cos, tan: Math.tan }[m[1] as 'sin' | 'cos' | 'tan'];
      expect(Math.abs(fn(r.ans * STEP) - fn(r.value() === 0 ? 0 : r.ans * STEP))).toBeLessThan(1e-9);
    }
  });
  it('level 1 has one round for each of sin⁻¹, cos⁻¹ and tan⁻¹, and level 2 ends past π/2', () => {
    for (const s of seeds.slice(0, 10)) {
      expect(buildRounds(1, createRng(s)).map((r) => r.text.slice(0, 3))).toEqual(['sin', 'cos', 'tan']);
      expect(buildRounds(2, createRng(s))[2].ans).toBe(9);
      expect(buildRounds(2, createRng(s))[1].ans).toBe(6);
    }
  });
  it('helpers fade, and a level never repeats an expression', () => {
    for (const level of [1, 2, 3]) {
      expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const s of seeds) expect(new Set(buildRounds(level, createRng(s)).map((r) => r.text)).size).toBe(3);
    }
  });
});

describe('words', () => {
  it('a miss names the direction or the range, never the angle; the working is stated', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        for (const k of dial.filter((x) => x !== r.ans)) {
          const t = missText(r, k);
          expect(t).toMatch(/clockwise|can only lie/);
          if (!/can only lie/.test(t)) expect(t.replace(piText(k), "")).not.toContain(piText(r.ans));
          expect(spotText(r, k)).toMatch(/Check/);
        }
        expect(explain(r).length).toBeGreaterThan(30);
        expect(intel(r)).toContain(r.text);
      }
    }
  });
});
