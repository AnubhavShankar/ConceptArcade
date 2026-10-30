import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIAL, buildRounds, explain, intel, judge, missText, output, spotText, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const dial = Array.from({ length: DIAL.max - DIAL.min + 1 }, (_, i) => DIAL.min + i);

/** The derivative the round claims, checked against a numerical derivative of the real function. */
function numeric(r: Round): number {
  const h = 1e-4;
  if (r.order === 2) return (r.fn(r.x0 + h) - 2 * r.fn(r.x0) + r.fn(r.x0 - h)) / (h * h);
  return Math.abs((r.fn(r.x0 + h) - r.fn(r.x0 - h)) / (2 * h)) / r.unitVal;
}

describe('every round has exactly one crank speed that hits the target', () => {
  it('one whole speed from 1 to 12 matches, it is not the starting 1, and the target has at most 2 decimals', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        expect(dial.filter((w) => judge(r, w))).toEqual([r.ans]);
        expect(r.ans).toBeGreaterThan(1);
        expect(Math.abs(r.target * 100 - Math.round(r.target * 100))).toBeLessThan(1e-6);
        expect(r.target).toBeGreaterThan(0);
      }
    }
  });
  it('the derivative in each round agrees with a numerical derivative of its function', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        const claimed = r.mn / r.md;
        expect(Math.abs(numeric(r) - claimed) / claimed).toBeLessThan(1e-3);
      }
    }
  });
  it('the helpers fade, and levels use their kinds', () => {
    for (const level of [1, 2, 3, 4]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
    expect(buildRounds(1, createRng(2)).every((r) => r.kind === 'power')).toBe(true);
    expect(buildRounds(2, createRng(2)).map((r) => r.kind)).toEqual(['exp', 'log', 'base']);
    expect(buildRounds(3, createRng(2)).map((r) => r.kind)).toEqual(['circle', 'hyper', 'param']);
    expect(buildRounds(4, createRng(2)).every((r) => r.kind === 'second' && r.order === 2)).toBe(true);
  });
  it('matches textbook anchors: d/dx (x + 1)^2 at 2 is 6; bead on x²+y² = 25 at (3, 4) falls at 3/4 of x', () => {
    const r = all(1).find((x) => x.machine.startsWith('y = (x + 1)² at x = 2'))!;
    expect(r.mn / r.md).toBe(6);
    const c = all(3).find((x) => x.kind === 'circle' && x.machine.includes('(3, 4)'))!;
    expect(c.mn / c.md).toBe(0.75);
  });
});

describe('words', () => {
  it('a miss states the output, not the speed; the working names the rule and the answer', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 40)) {
        for (const w of dial.filter((x) => x !== r.ans)) {
          const t = missText(r, w);
          expect(t).toMatch(/per second/);
          expect(t).not.toMatch(/w =|should|correct/);
          expect(spotText(r, w)).toContain(`w = ${w}`);
        }
        expect(explain(r)).toContain(`w = ${r.ans}`);
        expect(intel(r)).toContain('Target output');
        expect(output(r, r.ans)).toBeCloseTo(r.target, 9);
      }
    }
  });
});
