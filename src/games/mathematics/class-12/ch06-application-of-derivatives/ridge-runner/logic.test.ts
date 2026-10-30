import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { buildRounds, cubic, explain, intel, judge, missText, spotText, type Round } from './logic';

const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (r: Round) => Array.from({ length: r.hi - r.lo + 1 }, (_, i) => r.lo + i);
const numeric = (g: (x: number) => number, x: number) => (g(x + 1e-5) - g(x - 1e-5)) / 2e-5;

describe('the ground and its derivatives agree', () => {
  it('fp is the derivative of f, and fpp the derivative of fp (numerical check)', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 60)) {
        for (const x of [-3, 0, 2]) {
          expect(Math.abs(numeric(r.f, x) - r.fp(x))).toBeLessThan(1e-3 * Math.max(1, Math.abs(r.fp(x))));
          expect(Math.abs(numeric(r.fp, x) - r.fpp(x))).toBeLessThan(1e-3 * Math.max(1, Math.abs(r.fpp(x))));
        }
      }
    }
  });
  it('the textbook cubic x³ − 3x has a peak at −1 and a valley at 1', () => {
    const g = cubic(-1, 1, 1, 0);
    expect(g.text).toBe('f(x) = x³ − 3x');
    expect(g.fpp(-1)).toBeLessThan(0);
    expect(g.fpp(1)).toBeGreaterThan(0);
    expect(g.f(-1)).toBe(2);
    expect(g.f(1)).toBe(-2);
  });
});

describe('every round has exactly one winning camp', () => {
  it('only the answer wins when every whole position is tried, and the start is wrong', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        expect(span(r).filter((x) => judge(r, x))).toEqual([r.ans]);
        expect(r.ans).toBeGreaterThanOrEqual(r.lo);
        expect(r.ans).toBeLessThanOrEqual(r.hi);
        expect(r.start).not.toBe(r.ans);
        expect(r.start).toBeGreaterThanOrEqual(r.lo);
        expect(r.start).toBeLessThanOrEqual(r.hi);
      }
    }
  });
  it('level 1: the answer is a stationary point whose second derivative has the right sign', () => {
    for (const r of all(1)) {
      expect(r.fp(r.ans) === 0).toBe(true);
      expect(r.fpp(r.ans) < 0).toBe(r.ask === 'peak');
    }
  });
  it('level 2: the only sign change of the slope is at the answer, and the other zero is a flat spot', () => {
    for (const r of all(2)) {
      const flat = r.crit.find((c) => c !== r.ans)!;
      expect(r.fp(flat) === 0).toBe(true);
      expect(r.fp(flat - 0.3) * r.fp(flat + 0.3)).toBeGreaterThan(0);
      expect(r.fp(r.ans - 0.3) * r.fp(r.ans + 0.3)).toBeLessThan(0);
      expect(r.fpp(r.ans) > 0).toBe(r.ask === 'valley');
    }
  });
  it('level 3: the winner beats every other whole position on the walk, and every level has an interior answer and an end-point answer', () => {
    for (const s of seeds) {
      const rs = buildRounds(3, createRng(s));
      rs.forEach((r) => {
        for (let x = r.lo; x <= r.hi; x++) {
          if (x === r.ans) continue;
          if (r.ask === 'highest') expect(r.f(x)).toBeLessThan(r.f(r.ans));
          else expect(r.f(x)).toBeGreaterThan(r.f(r.ans));
        }
      });
      const atEnd = rs.map((r) => r.ans === r.lo || r.ans === r.hi);
      expect(atEnd.some((b) => b)).toBe(true);
      expect(atEnd.some((b) => !b)).toBe(true);
    }
  });
  it('level 3: no round slot always has its answer at a dial end or always inside, and the start says nothing about the answer', () => {
    for (const slot of [0, 1, 2]) {
      const ends = seeds.map((s) => {
        const r = buildRounds(3, createRng(s))[slot];
        return r.ans === r.lo || r.ans === r.hi;
      });
      const share = ends.filter(Boolean).length / ends.length;
      expect(share).toBeGreaterThan(0.2);
      expect(share).toBeLessThan(0.8);
    }
    // the start is not tied to the ends of the walk: it is neither always lo nor a function of "the answer is lo"
    const rs = all(3);
    expect(new Set(rs.map((r) => r.start - r.lo)).size).toBeGreaterThanOrEqual(5);
    const startAtLo = rs.filter((r) => r.start === r.lo).length / rs.length;
    expect(startAtLo).toBeLessThan(0.4);
    // given that the answer is at lo, the start is spread over the whole walk rather than sitting at hi
    const ansLo = rs.filter((r) => r.ans === r.lo);
    expect(ansLo.length).toBeGreaterThan(10);
    expect(ansLo.filter((r) => r.start === r.hi).length / ansLo.length).toBeLessThan(0.5);
    expect(new Set(ansLo.map((r) => r.start - r.lo)).size).toBeGreaterThanOrEqual(4);
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('words', () => {
  it('a miss describes the slope and the kind of point, never the position; the working is stated', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        for (const x of span(r).filter((v) => v !== r.ans).slice(0, 5)) {
          expect(missText(r, x).length).toBeGreaterThan(30);
          expect(missText(r, x)).not.toMatch(new RegExp(`x = ${r.ans}\\b`));
          expect(spotText(r, x)).toMatch(/slope/);
        }
        expect(explain(r)).toContain(String(r.ans));
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('a miss holds no height and no slope: the only number it may print is the flag’s own position', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 60)) {
        for (const x of span(r).filter((v) => v !== r.ans)) {
          const t = missText(r, x).replace(`camped at ${x}`, 'camped at #');
          expect(/\d/.test(t)).toBe(false);
        }
      }
    }
  });
  it('two wrong settings that did the same thing give the same miss text', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 60)) {
        const wrong = span(r).filter((v) => v !== r.ans);
        const key = (x: number) => (r.kind === 'camp' ? 'camp' : r.fp(x) === 0 ? `flat${Math.sign(r.fp(x - 0.5))}${Math.sign(r.fp(x + 0.5))}` : `slope${Math.sign(r.fp(x))}`);
        for (const a of wrong) for (const b of wrong) {
          if (key(a) !== key(b)) continue;
          expect(missText(r, a).replace(`camped at ${a}`, 'camped at #')).toBe(missText(r, b).replace(`camped at ${b}`, 'camped at #'));
        }
      }
    }
  });
  it('the flat spot of level 2 is called out as a flat spot', () => {
    const r = all(2)[0];
    const flat = r.crit.find((c) => c !== r.ans)!;
    expect(missText(r, flat)).toMatch(/flattens for a moment/);
  });
});
