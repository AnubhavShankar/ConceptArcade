import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIAL, FLOW, MONEY_ROWS, buildRounds, explain, flowEnd, intel, judge, missText, output, spotText, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const dial = Array.from({ length: DIAL.max - DIAL.min + 1 }, (_, i) => DIAL.min + i);

describe('every round has exactly one winch speed that hits the target', () => {
  it('one whole speed matches, it is not the start, and the target has at most 2 decimals', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        expect(dial.filter((w) => judge(r, w))).toEqual([r.ans]);
        expect(r.ans).toBeGreaterThan(1);
        expect(Math.abs(r.target * 100 - Math.round(r.target * 100))).toBeLessThan(1e-6);
      }
    }
  });
  it('the rate in each round agrees with a numerical derivative of the real situation', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        const h = 1e-5;
        const d = Math.abs((r.q(h) - r.q(-h)) / (2 * h));
        expect(Math.abs(d - r.mn / r.md) / (r.mn / r.md)).toBeLessThan(1e-4);
      }
    }
  });
  it('helpers fade; the kinds follow the levels', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(4)).map((r) => r.assist)).toEqual([0, 1, 2]);
    expect(buildRounds(1, createRng(4)).map((r) => r.kind)).toEqual(['ripple', 'cube', 'balloon']);
    expect(buildRounds(2, createRng(4)).map((r) => r.kind)).toEqual(['ladderFoot', 'ladderTop', 'ladderFoot']);
    expect(buildRounds(3, createRng(4)).map((r) => r.kind)).toEqual(['shadow', 'coneHalf', 'coneThird']);
  });
  it('textbook anchors: the 5 m ladder with its foot 4 m out has its top falling at 4/3 of the foot speed; a 5 cm ripple has area rate 10π·w', () => {
    const l = all(2).find((r) => r.kind === 'ladderFoot' && r.a === 4 && r.b === 3)!;
    expect(l.mn / l.md).toBeCloseTo(4 / 3, 9);
    const rp = all(1).find((r) => r.kind === 'ripple' && r.a === 5)!;
    expect(rp.mn).toBe(10);
  });
});

describe('words', () => {
  it('a miss states only the side, not the winch speed; the working states the answer', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 30)) {
        for (const w of dial.filter((x) => x !== r.ans).slice(0, 4)) {
          expect(missText(r, w)).toMatch(/too (slowly|fast)/);
          expect(missText(r, w)).not.toMatch(/w =|should/);
          expect(spotText(r, w)).toContain(`w = ${w}`);
        }
        expect(explain(r)).toContain(`w = ${r.ans}`);
        expect(intel(r)).toContain('per second');
        expect(output(r, r.ans)).toBeCloseTo(r.target, 9);
      }
    }
  });
});

describe('level 4, running costs', () => {
  const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
  const rounds4 = seeds80.flatMap((s) => buildRounds(4, createRng(s)));
  const central = (f: (x: number) => number, x: number) => {
    const h = 1e-4;
    return (f(x + h) - f(x - h)) / (2 * h);
  };
  // The brief's tables: function, x and the stated derivative.
  const TABLE: Record<'cost' | 'revenue' | 'profit', [string, number, number][]> = {
    cost: [['C(x) = 2x² + 10x + 500', 5, 30], ['C(x) = x² + 40x + 900', 10, 60], ['C(x) = 3x² + 5x + 200', 4, 29]],
    revenue: [['R(x) = 2x² + 40x + 7', 6, 64], ['R(x) = 5x² + 12x', 3, 42], ['R(x) = 4x² + 30x', 5, 70]],
    profit: [['R(x) = 60x − x² and C(x) = 2x² + 10x + 100', 4, 26], ['R(x) = 80x − 2x² and C(x) = x² + 20x + 50', 6, 24]],
  };

  it('every row matches the brief and its derivative agrees with a central difference of the real function', () => {
    for (const kind of ['cost', 'revenue', 'profit'] as const) {
      expect(MONEY_ROWS[kind].map((m) => [m.fnText, m.x, m.d])).toEqual(TABLE[kind]);
      for (const m of MONEY_ROWS[kind]) {
        expect(central(m.f, m.x)).toBeCloseTo(m.d, 5);
        if (kind === 'profit') {
          expect(m.parts!.R.d - m.parts!.C.d).toBe(m.d);
          expect(central(m.parts!.R.f, m.x)).toBeCloseTo(m.parts!.R.d, 5);
          expect(central(m.parts!.C.f, m.x)).toBeCloseTo(m.parts!.C.d, 5);
          expect(m.parts!.R.f(m.x) - m.parts!.C.f(m.x)).toBeCloseTo(m.f(m.x), 9);
        }
      }
    }
  });
  it('rounds: kinds, fading helpers, whole-number derivative, all rows reachable, q agrees with the stated derivative', () => {
    expect(buildRounds(4, createRng(4)).map((r) => r.kind)).toEqual(['cost', 'revenue', 'profit']);
    expect(buildRounds(4, createRng(4)).map((r) => r.assist)).toEqual([0, 1, 2]);
    for (const r of rounds4) {
      expect(r.md).toBe(1);
      expect(Number.isInteger(r.mn)).toBe(true);
      expect(Math.abs(central(r.q, 0) - r.mn)).toBeLessThan(1e-4);
    }
    for (const kind of ['cost', 'revenue', 'profit'] as const) {
      const seen = new Set(rounds4.filter((r) => r.kind === kind).map((r) => r.fnText));
      expect([...seen].sort()).toEqual(MONEY_ROWS[kind].map((m) => m.fnText).sort());
    }
  });
  it('exactly one rate wins each round, the start never wins, the target has at most 2 decimals', () => {
    for (const r of rounds4) {
      expect(dial.filter((w) => judge(r, w))).toEqual([r.ans]);
      expect(r.ans).toBeGreaterThan(DIAL.min);
      expect(judge(r, DIAL.min)).toBe(false);
      expect(Math.abs(r.target * 100 - Math.round(r.target * 100))).toBeLessThan(1e-6);
    }
  });
  it('the meter ends at the target line only for the winning rate, and a miss shows only the side', () => {
    for (const r of rounds4) {
      for (const w of dial) {
        const end = flowEnd(r, w);
        expect(end === 1).toBe(w === r.ans);
        if (w < r.ans) expect(end).toBe(FLOW.short);
        if (w > r.ans) expect(end).toBe(FLOW.over);
      }
      expect(FLOW.short).toBeLessThan(1);
      expect(FLOW.over).toBeGreaterThan(1);
    }
  });
  it('words: a miss states only the side, never a rate; the working states the answer', () => {
    for (const r of rounds4) {
      const per = r.kind === 'profit' ? 'per day' : 'per hour';
      for (const w of dial.filter((x) => x !== r.ans)) {
        const t = missText(r, w);
        expect(t).not.toMatch(/\d/);
        expect(t).not.toMatch(/w =|should|correct|set w|rate of w/);
        expect(t).not.toContain(`w = ${r.ans}`);
        expect(t).toContain(output(r, w) < r.target ? 'too slowly' : 'too fast');
        expect(spotText(r, w)).toContain(`w = ${w}`);
      }
      expect(explain(r)).toContain(`w = ${r.ans}`);
      expect(explain(r)).toMatch(r.kind === 'profit' ? /Marginal profit = R′\(x\) − C′\(x\) = \d+ − \d+ = / : r.kind === 'cost' ? /Marginal cost C′\(x\) = / : /Marginal revenue R′\(x\) = /);
      expect(intel(r)).toContain(r.fnText!);
      expect(intel(r)).toContain(per);
      expect(intel(r)).toContain(`₹${r.target} ${per}`);
      expect(output(r, r.ans)).toBeCloseTo(r.target, 9);
    }
  });
  it('the working for each kind uses the stated derivative', () => {
    const find = (kind: Round['kind'], d: number) => rounds4.find((r) => r.kind === kind && r.mn === d)!;
    expect(explain(find('cost', 30))).toMatch(/^Marginal cost C′\(x\) = 4x \+ 10 = 30 at x = 5\. The cost rate is C′\(x\)·w, so \d+ = 30w and w = \d+\.$/);
    expect(explain(find('revenue', 64))).toMatch(/^Marginal revenue R′\(x\) = 4x \+ 40 = 64 at x = 6\./);
    expect(explain(find('profit', 26))).toMatch(/^Marginal profit = R′\(x\) − C′\(x\) = 52 − 26 = 26 at x = 4; then \d+ = 26w, so w = \d+\.$/);
    expect(explain(find('profit', 24))).toContain('56 − 32 = 24 at x = 6');
  });
});

describe('a miss gives the side only, in every level', () => {
  it('two different wrong settings on the same side give the same text and the same animation end, with no digit', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        const wrong = dial.filter((w) => w !== r.ans);
        for (const side of [wrong.filter((w) => w < r.ans), wrong.filter((w) => w > r.ans)]) {
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
