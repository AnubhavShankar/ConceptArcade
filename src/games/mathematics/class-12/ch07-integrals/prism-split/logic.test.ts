import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { CHECK, DIAL, bad, beamText, buildRounds, explain, intel, judge, missText, original, probeText, recombined, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const SAMPLES = [-5.5, -2.5, 0.5, 1.5, 4.5, 7.5, 9.25];

/** True when the split reproduces the original at every sample point. */
const fits = (r: Round, v: number[]) => SAMPLES.every((x) => Math.abs(original(r, x) - recombined(r, v, x)) < 1e-9);

describe('partial fractions', () => {
  it('textbook anchor: (3x + 1)/((x − 1)(x + 2)) = (4/3)/(x − 1) + (5/3)/(x + 2)', () => {
    const g = (x: number) => (3 * x + 1) / ((x - 1) * (x + 2));
    expect(g(3)).toBeCloseTo(4 / 3 / 2 + 5 / 3 / 5, 12);
  });
  it('the written split is the original beam at every sample point, for every level', () => {
    for (const level of [1, 2, 3]) for (const r of all(level)) expect(fits(r, r.ans)).toBe(true);
  });
});

describe('every round has exactly one winning setting', () => {
  it('levels 1 and 2: of all strengths from −9 to 9, only the answer reproduces the beam', () => {
    for (const level of [1, 2]) {
      for (const r of all(level)) {
        const wins: string[] = [];
        for (const A of span(DIAL.min, DIAL.max)) for (const B of span(DIAL.min, DIAL.max)) if (fits(r, [A, B])) wins.push(`${A},${B}`);
        expect(wins).toEqual([r.ans.join()]);
        expect(judge(r, r.start)).toBe(false);
      }
    }
  });
  it('level 3: three strengths, scanned over every setting', () => {
    for (const r of all(3).slice(0, 12)) {
      const wins: string[] = [];
      for (const A of span(DIAL.min, DIAL.max)) for (const B of span(DIAL.min, DIAL.max)) for (const C of span(DIAL.min, DIAL.max)) if (fits(r, [A, B, C])) wins.push(`${A},${B},${C}`);
      expect(wins).toEqual([r.ans.join()]);
      expect(judge(r, r.start)).toBe(false);
    }
  });
  it('the answers are inside the dial range and are never zero, and the checkpoints are not poles', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        for (const a of r.ans) {
          expect(Math.abs(a)).toBeGreaterThan(0);
          expect(a).toBeGreaterThanOrEqual(DIAL.min);
          expect(a).toBeLessThanOrEqual(DIAL.max);
        }
        for (const p of r.poles) expect(CHECK).not.toContain(p);
        expect(r.poles).not.toContain(r.probe);
      }
    }
  });
  it('a wrong setting is caught by the scanner and the right one is not', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        expect(bad(r, r.ans)).toEqual([]);
        const off = r.ans.map((a, i) => (i === 0 ? (a === DIAL.max ? a - 1 : a + 1) : a));
        expect(bad(r, off).length).toBeGreaterThan(0);
      }
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('words', () => {
  it('the beam is written with true minus signs and the split is named', () => {
    const r: Round = { kind: 'two', poles: [1, -2], ans: [1, 2], top: [[3, 1], [-3, 0]], bottom: '(x − 1)(x + 2)', probe: 0, start: [0, 0], assist: 0 };
    expect(beamText(r)).toBe('(3x − 3) / (x − 1)(x + 2)');
    expect(intel(r)).toMatch(/A\/\(x − 1\) \+ B\/\(x \+ 2\)/);
  });
  it('misses and probes report readings, not strengths; the working is stated', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        const off = r.ans.map((a, i) => (i === 0 ? (a === DIAL.max ? a - 1 : a + 1) : a));
        expect(missText(r, off)).toMatch(/beams apart/);
        expect(missText(r, off)).not.toMatch(/A = |\d/);
        expect(missText(r, off)).toBe(missText(r, r.ans.map((a, i) => (i === 0 ? (a === DIAL.min ? a + 2 : a - 1) : a))));
        expect(probeText(r, off)).toMatch(/Test beam at x = /);
        expect(explain(r).length).toBeGreaterThan(40);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.bottom + r.ans.join())).size).toBe(3);
    }
  });
});
