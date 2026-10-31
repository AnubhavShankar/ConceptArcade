import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIAL, FLOW, TRIG_ROWS, buildRounds, explain, flowEnd, intel, judge, missText, output, spotText, type Round } from './logic';

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
          expect(t).toMatch(/too slowly|so fast/);
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

describe('level 5, wobble gears', () => {
  const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
  const rounds5 = seeds80.flatMap((s) => buildRounds(5, createRng(s)));
  const central = (f: (x: number) => number, x: number) => {
    const h = 1e-5;
    return (f(x + h) - f(x - h)) / (2 * h);
  };
  // The brief's table: function, x0 in π form, derivative as mn/md, chain text.
  const TABLE: [string, string, number, number, string][][] = [
    [
      ['sin 3x', 'π/9', 3, 2, 'dy/dx = 3 cos 3x, and 3 cos(π/3) = 3/2'],
      ['−cos 2x', 'π/12', 1, 1, 'dy/dx = 2 sin 2x, and 2 sin(π/6) = 1'],
      ['cos 4x', '−π/24', 2, 1, 'dy/dx = −4 sin 4x, and −4 sin(−π/6) = 2'],
    ],
    [
      ['sin² x', 'π/4', 1, 1, 'dy/dx = 2 sin x cos x, and 2·(1/√2)·(1/√2) = 1'],
      ['2 sin(2x + π/6)', 'π/12', 2, 1, 'dy/dx = 4 cos(2x + π/6), and 4 cos(π/3) = 2'],
      ['sin(x/2)', '2π/3', 1, 4, 'dy/dx = (1/2) cos(x/2), and (1/2) cos(π/3) = 1/4'],
    ],
    [
      ['tan 2x', 'π/8', 4, 1, 'dy/dx = 2 sec² 2x, and 2 sec²(π/4) = 4'],
      ['tan² x', 'π/4', 4, 1, 'dy/dx = 2 tan x sec² x, and 2·1·2 = 4'],
      ['−cos²(3x)', 'π/12', 3, 1, 'dy/dx = 6 cos 3x sin 3x, and 6·(1/√2)·(1/√2) = 3'],
    ],
  ];
  const piValue = (t: string) => {
    const m = /^(−?)(\d*)π(?:\/(\d+))?$/.exec(t)!;
    return (m[1] ? -1 : 1) * Number(m[2] || 1) * Math.PI / Number(m[3] || 1);
  };

  it('every row matches the brief, x0 matches its π text, and the signed derivative agrees with a central difference', () => {
    expect(TRIG_ROWS.map((rows) => rows.map((t) => [t.f, t.x0Text, t.mn, t.md, t.chain]))).toEqual(TABLE);
    for (const rows of TRIG_ROWS) {
      for (const t of rows) {
        expect(t.x0).toBeCloseTo(piValue(t.x0Text), 12);
        expect(central(t.fn, t.x0)).toBeCloseTo(t.mn / t.md, 5);
      }
    }
  });
  it('rounds: kind trig, first order, no unit, fading helpers, every row reachable, the machine text shows the π form', () => {
    expect(buildRounds(5, createRng(3)).map((r) => r.assist)).toEqual([0, 1, 2]);
    for (const r of rounds5) {
      expect(r.kind).toBe('trig');
      expect(r.order).toBe(1);
      expect(r.unit).toBe('');
      expect(r.machine).toBe(`y = ${r.machine.slice(4, r.machine.indexOf(' at x = '))} at x = ${r.x0Text}`);
      expect(Math.abs(numeric(r) - r.mn / r.md)).toBeLessThan(1e-3);
    }
    TRIG_ROWS.forEach((rows, k) => {
      const seen = new Set(rounds5.filter((_, i) => i % 3 === k).map((r) => r.machine));
      expect([...seen].sort()).toEqual(rows.map((t) => `y = ${t.f} at x = ${t.x0Text}`).sort());
    });
  });
  it('exactly one crank speed wins each round, the start never wins, the target has at most 2 decimals', () => {
    for (const r of rounds5) {
      expect(dial.filter((w) => judge(r, w))).toEqual([r.ans]);
      expect(r.ans).toBeGreaterThan(DIAL.min);
      expect(judge(r, DIAL.min)).toBe(false);
      expect(Math.abs(r.target * 100 - Math.round(r.target * 100))).toBeLessThan(1e-6);
      expect(r.target).toBeGreaterThan(0);
    }
  });
  it('words: a miss gives only the direction, never a rate or the speed; the working shows the chain, the point and the answer', () => {
    for (const r of rounds5) {
      for (const w of dial.filter((x) => x !== r.ans)) {
        const t = missText(r, w);
        expect(t).toMatch(/too slowly|so fast/);
        expect(t).not.toMatch(/w =|should|correct|dy\/dx|chain/i);
        expect(t).not.toContain(`w = ${r.ans}`);
        expect(t).toContain(output(r, w) < r.target ? 'too slowly' : 'so fast');
        expect(spotText(r, w)).toContain(`w = ${w}`);
      }
      const e = explain(r);
      expect(e).toContain(`Chain rule: ${r.chain} at x = ${r.x0Text}.`);
      expect(e).toContain(`w = ${r.ans}`);
      expect(intel(r)).toContain(`y = `);
      expect(intel(r)).toContain(`at x = ${r.x0Text}`);
      expect(intel(r)).toContain('Target output');
    }
  });
});

describe('a miss gives the side only, in every level', () => {
  it('two different wrong settings on the same side give the same text and the same animation end, with no digit', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      for (const r of all(level)) {
        const wrong = dial.filter((w) => w !== r.ans);
        for (const side of [wrong.filter((w) => output(r, w) < r.target), wrong.filter((w) => output(r, w) > r.target)]) {
          if (side.length === 0) continue;
          expect(new Set(side.map((w) => missText(r, w))).size).toBe(1);
          expect(new Set(side.map((w) => flowEnd(r, w))).size).toBe(1);
          expect(missText(r, side[0])).not.toMatch(/\d/);
        }
        expect(flowEnd(r, r.ans)).toBe(1);
        if (r.ans > DIAL.min) expect(flowEnd(r, DIAL.min)).toBe(FLOW.short);
        if (r.ans < DIAL.max) expect(flowEnd(r, DIAL.max)).toBe(FLOW.over);
      }
    }
  });
});
