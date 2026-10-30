import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { buildRounds, exponent, explain, intel, judge, judgeScan, magnify, missText, spotText, swingsFor, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('order and degree', () => {
  it('textbook anchors: d³y/dx³ + 2(d²y/dx²)² + y = 0 has order 3 and degree 1; (dy/dx)² + y = x has order 1, degree 2', () => {
    const r = buildRounds(1, createRng(1))[1];
    expect(r.degree).toBe(1);
    expect(r.order).toBeGreaterThanOrEqual(2);
    const plain = all(1).find((x) => x.degree === 2 && x.order === 1);
    expect(plain?.text).toMatch(/\(dy\/dx\)²/);
  });
  it('each round has exactly one winning pair over every order 1 to 4 and degree 0 to 4', () => {
    for (const r of all(1)) {
      const wins: string[] = [];
      for (const o of span(1, 4)) for (const d of span(0, 4)) if (judgeScan(r, o, d)) wins.push(`${o},${d}`);
      expect(wins).toEqual([`${r.order},${r.degree}`]);
    }
  });
  it('the three rounds are plain, a power on a lower derivative (degree stays 1), and a degree that is not defined', () => {
    for (const s of seeds) {
      const rs = buildRounds(1, createRng(s));
      expect(rs[0].degree).toBeGreaterThan(0);
      expect(rs[1].degree).toBe(1);
      expect(rs[1].text).toMatch(/\)[²³]/);
      expect(rs[2].degree).toBe(0);
    }
  });
  it('the order is the highest derivative written, and the magnifier names it without the answer', () => {
    for (const r of all(1)) {
      expect(r.text).toContain(r.highest);
      expect(magnify(r)).toContain(r.highest);
      expect(magnify(r)).not.toMatch(/order|degree/);
    }
  });
});

describe('growth and swings', () => {
  it('growth: the reading c·e^(kT) matches exactly one k over the dial, and the start never wins', () => {
    for (const r of all(2)) {
      expect(span(r.min, r.max).filter((k) => exponent(r, k) === r.exp)).toEqual([r.ans]);
      expect(span(r.min, r.max).filter((k) => judge(r, k))).toEqual([r.ans]);
      expect(judge(r, r.start)).toBe(false);
      expect(r.ans).not.toBe(0);
    }
  });
  it('growth: y = c·e^(kt) really solves dy/dt = k·y (numerical check)', () => {
    for (const r of all(2).slice(0, 30)) {
      const f = (t: number) => r.c * Math.exp(r.ans * t);
      const d = (f(0.5 + 1e-6) - f(0.5 - 1e-6)) / 2e-6;
      expect(d).toBeCloseTo(r.ans * f(0.5), 4);
    }
  });
  it('swings: y = cos(mt) solves y″ + m²y = 0 and repeats m times in 2π; exactly one m wins', () => {
    for (const r of all(3)) {
      expect(span(r.min, r.max).filter((m) => swingsFor(m) === r.swings)).toEqual([r.ans]);
      expect(judge(r, r.start)).toBe(false);
      const m = r.ans;
      const y = (t: number) => Math.cos(m * t);
      const ypp = (y(1 + 1e-4) - 2 * y(1) + y(1 - 1e-4)) / 1e-8;
      expect(ypp + m * m * y(1)).toBeCloseTo(0, 3);
      expect(y(2 * Math.PI)).toBeCloseTo(y(0), 9);
    }
  });
  it('helpers fade, and the specimen falls faster each round', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
    expect(buildRounds(1, createRng(5)).map((r) => r.fall)).toEqual([18, 15, 12]);
  });
});

describe('words', () => {
  it('misses say what was wrong without giving the answer; probes read effects; the working is stated', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40) as Round[]) {
        if (level === 1) {
          const msg = missText(r, 0, r.order === 1 ? 2 : 1, r.degree === 1 ? 2 : 1);
          expect(msg).toMatch(/flagged/);
          expect(msg).not.toMatch(/order is \d|degree is \d/);
        } else {
          const wrong = r.ans === r.max ? r.ans - 1 : r.ans + 1;
          expect(missText(r, wrong).length).toBeGreaterThan(25);
          expect(spotText(r, wrong)).toMatch(/test/i);
        }
        expect(explain(r).length).toBeGreaterThan(40);
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.text + r.ans + r.c + r.T + r.order)).size).toBe(3);
    }
  });
});
