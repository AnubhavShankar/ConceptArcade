import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIAL, buildRounds, explain, intel, judge, missText, output, spotText } from './logic';

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
  it('a miss states the result rate, not the winch speed; the working states the answer', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 30)) {
        for (const w of dial.filter((x) => x !== r.ans).slice(0, 4)) {
          expect(missText(r, w)).toMatch(/per second/);
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
