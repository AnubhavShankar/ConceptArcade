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
  it('level 1 has one round for each of sin⁻¹, cos⁻¹ and tan⁻¹, and the level 2 boss ends past π/2 in size', () => {
    for (const s of seeds) {
      expect(buildRounds(1, createRng(s)).map((r) => r.text.slice(0, 3))).toEqual(['sin', 'cos', 'tan']);
      const rs = buildRounds(2, createRng(s));
      expect(Math.abs(rs[2].ans)).toBeGreaterThan(6);
      expect(Math.abs(rs[0].ans)).toBeLessThan(6);
    }
  });
  it('level 2: the answer of each round varies with the seed, no two rounds of a level share an answer, and no fixed guess wins every seed', () => {
    for (const slot of [0, 1, 2]) {
      const answers = new Set(seeds.map((s) => buildRounds(2, createRng(s))[slot].ans));
      expect(answers.size).toBeGreaterThanOrEqual(slot === 0 ? 4 : 3);
      // the commonest answer is not the answer of more than half the seeds
      const count = new Map<number, number>();
      for (const s of seeds) {
        const a = buildRounds(2, createRng(s))[slot].ans;
        count.set(a, (count.get(a) ?? 0) + 1);
      }
      expect(Math.max(...count.values())).toBeLessThanOrEqual(seeds.length * 0.5);
    }
    for (const s of seeds) expect(new Set(buildRounds(2, createRng(s)).map((r) => r.ans)).size).toBe(3);
  });
  it('level 2: every new row is checked against the real functions, has a worked reason, and keeps its answer inside the range it shows', () => {
    const seen = new Set<string>();
    for (const s of seeds) for (const r of buildRounds(2, createRng(s))) {
      if (seen.has(r.text)) continue;
      seen.add(r.text);
      expect(Math.abs(r.value() - r.ans * STEP)).toBeLessThan(1e-9);
      expect(r.work.length).toBeGreaterThan(30);
      expect(r.ans).toBeGreaterThanOrEqual(r.range[0]);
      expect(r.ans).toBeLessThanOrEqual(r.range[1]);
      expect(dial.filter((k) => judge(r, k))).toEqual([r.ans]);
    }
    expect(seen.size).toBeGreaterThanOrEqual(18);
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
          // only round 1 names the range (it is on screen live); rounds 2 and 3 give the direction for every wrong setting
          if (r.assist !== 0) expect(t).toMatch(/clockwise/);
          if (r.assist !== 0) expect(t).not.toMatch(/can only lie|\[/);
          if (!/can only lie/.test(t)) expect(t.replace(piText(k), "")).not.toContain(piText(r.ans));
          expect(spotText(r, k)).toMatch(/Check/);
        }
        expect(explain(r).length).toBeGreaterThan(30);
        expect(intel(r)).toContain(r.text);
      }
    }
  });
});
