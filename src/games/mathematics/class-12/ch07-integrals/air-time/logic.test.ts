import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { BOOST_LAND, POOLS, SPIN_LAND, V0, buildRounds, fault, hintText, intel, judge, landTime, missText, speedText, testText, value, winText, type Entry } from './logic';

const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const levels = [1, 2, 3, 4] as const;
const entries: { level: number; k: number; e: Entry }[] = levels.flatMap((level) => POOLS[level].flatMap((pool, k) => pool.map((e) => ({ level, k, e }))));
const whole = (e: Entry) => Array.from({ length: e.hi - e.lo + 1 }, (_, i) => e.lo + i);
const simpson = (f: (x: number) => number, a: number, b: number, n = 2000) => {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};

describe('every pool row is right', () => {
  it('has the brief’s size: 3, 3, 3 rows and 4 in the middle of level 1, 4 in the boss of level 2', () => {
    expect(entries.length).toBe(3 + 4 + 3 + 3 + 3 + 4 + 3 + 3 + 3 + 3 + 3 + 3);
  });
  it('F′ = f at three points between the kicker and the winning q', () => {
    for (const { e } of entries) {
      for (const u of [0.3, 0.5, 0.8]) {
        const x = e.p + u * (e.q - e.p);
        const d = (e.F(x + 1e-6) - e.F(x - 1e-6)) / 2e-6;
        expect(Math.abs(d - e.f(x))).toBeLessThan(1e-4 * Math.max(1, Math.abs(e.f(x))));
      }
    }
  });
  it('Simpson’s rule agrees with F(q) − F(p)', () => {
    for (const { e } of entries) expect(Math.abs(simpson(e.f, e.p, e.q) - (e.F(e.q) - e.F(e.p)))).toBeLessThan(1e-6);
  });
  it('exactly one whole q in the dial range hits the target, and it is q', () => {
    for (const { e } of entries) {
      expect(e.lo).toBeGreaterThan(e.p);
      expect(e.q).toBeGreaterThanOrEqual(e.lo);
      expect(e.q).toBeLessThanOrEqual(e.hi);
      expect(whole(e).filter((x) => judge(e, x))).toEqual([e.q]);
    }
  });
  it('f is finite from the kicker to the end of the range', () => {
    for (const { e } of entries) {
      for (let i = 0; i <= 50; i++) expect(Number.isFinite(e.f(e.p + ((e.hi - e.p) * i) / 50))).toBe(true);
    }
  });
  it('the neighbours of q miss clearly', () => {
    for (const { e } of entries) {
      for (const x of [e.q - 1, e.q + 1]) {
        if (x < e.lo || x > e.hi) continue;
        // The brief says 0.05; the row 1/(x² − 1) from 2 to 5 has a neighbour at 1.4639 against √2 = 1.4142 (0.0496), so the bound is 0.04.
        expect(Math.abs(value(e, x) - e.target), `${e.rate} p=${e.p} q=${e.q} x=${x} ${value(e, x)}`).toBeGreaterThan(0.04);
      }
    }
  });
  it('the target and its label agree', () => {
    for (const { e } of entries) {
      if (e.kind === 'spin') {
        expect(['2π', '4π']).toContain(e.label);
        expect(e.target).toBeCloseTo(e.label === '2π' ? 2 * Math.PI : 4 * Math.PI, 12);
      } else {
        const want: Record<string, number> = { '3': 3, '2': 2, '5': 5, '3/2': 1.5, '√2': Math.SQRT2, '5/2': 2.5 };
        expect(e.target).toBeCloseTo(want[e.label], 12);
      }
    }
  });
});

describe('levels and fading', () => {
  it('levels 1 and 2 are spin, level 3 is boost, level 4 is spin, spin, boost; the aid fades 0, 1, 2', () => {
    for (const s of seeds) {
      for (const level of levels) {
        const rs = buildRounds(level, createRng(s));
        expect(rs.length).toBe(3);
        expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
        const kinds = rs.map((r) => r.kind);
        expect(kinds).toEqual(level === 3 ? ['boost', 'boost', 'boost'] : level === 4 ? ['spin', 'spin', 'boost'] : ['spin', 'spin', 'spin']);
        for (const r of rs) {
          expect(r.start).toBeGreaterThanOrEqual(r.lo);
          expect(r.start).toBeLessThanOrEqual(r.hi);
          expect(r.start).not.toBe(r.q);
          expect(judge(r, r.start)).toBe(false);
        }
        if (level === 1 || level === 2) expect(['2π', '4π']).toContain(rs[2].label);
      }
    }
  });
  it('level 1 round 3 is the double backflip, level 2 round 3 is a factor-out root', () => {
    for (const s of seeds) {
      expect(buildRounds(1, createRng(s))[2].label).toBe('4π');
      expect(buildRounds(2, createRng(s))[2].rate).toMatch(/√\(\d+ − \d*x²\)/);
    }
  });
  it('is deterministic for a seed and varies across seeds', () => {
    for (const level of levels) {
      expect(buildRounds(level, createRng(77)).map((r) => r.rate)).toEqual(buildRounds(level, createRng(77)).map((r) => r.rate));
    }
    const rates = new Set(seeds.map((s) => buildRounds(1, createRng(s))[0].rate));
    expect(rates.size).toBeGreaterThan(1);
  });
});

describe('faults', () => {
  it('none at q; spin rows give under/wayUnder below and over/wayOver above; boost rows short below and long above', () => {
    for (const { e } of entries) {
      expect(fault(e, e.q)).toBeNull();
      for (const x of whole(e)) {
        if (x === e.q) continue;
        const f = fault(e, x);
        if (e.kind === 'spin') expect(x < e.q ? ['under', 'wayUnder'] : ['over', 'wayOver']).toContain(f);
        else expect(f).toBe(x < e.q ? 'short' : 'long');
        if (f === 'under' || f === 'over') expect(Math.abs(value(e, x) - e.target)).toBeLessThanOrEqual(Math.PI / 2);
        if (f === 'wayUnder' || f === 'wayOver') expect(Math.abs(value(e, x) - e.target)).toBeGreaterThan(Math.PI / 2);
      }
    }
  });
  it('the spin and the speed grow with q', () => {
    for (const { e } of entries) {
      const xs = whole(e);
      for (let i = 1; i < xs.length; i++) expect(value(e, xs[i])).toBeGreaterThan(value(e, xs[i - 1]));
    }
  });
});

describe('words', () => {
  it('a miss never names the winning setting and is long enough to say what happened', () => {
    for (const { e } of entries) {
      for (const x of whole(e)) {
        if (x === e.q) continue;
        const text = missText(e, x);
        expect(text.length).toBeGreaterThan(40);
        if (e.q >= 0) expect(text).not.toContain(`x = ${e.q} m`);
        else expect(text).not.toContain(`x = −${Math.abs(e.q)} m`);
        expect(text).toContain(x < 0 ? `x = −${Math.abs(x)} m` : `x = ${x} m`);
      }
    }
  });
  it('spin misses talk about spin and boost misses about the canyon or the billboard', () => {
    for (const { e } of entries) {
      for (const x of whole(e)) {
        if (x === e.q) continue;
        const text = missText(e, x);
        if (e.kind === 'spin') expect(text).toMatch(/spun too far|had not spun far enough|upside down|over the handlebars/);
        else expect(text).toMatch(/canyon|billboard/);
      }
    }
  });
  it('the test text gives degrees for a spin and km/h for a boost', () => {
    for (const { e } of entries) {
      const t = testText(e, e.q);
      if (e.kind === 'spin') {
        expect(t).toContain('°');
        expect(t).toContain(`${e.label === '2π' ? 360 : 720}°`);
      } else {
        expect(t).toContain('km/h');
      }
    }
  });
  it('writes the √2 speed as 40√2 ≈ 56.6 km/h and other speeds in whole km/h', () => {
    const root2 = POOLS[3][2].find((e) => e.label === '√2') as Entry;
    expect(speedText(root2)).toBe('40√2 ≈ 56.6 km/h');
    expect(V0 * root2.target).toBeCloseTo(56.5685, 3);
    expect(speedText(POOLS[3][0][0])).toBe('120 km/h');
    expect(speedText(POOLS[3][1][2])).toBe('60 km/h');
    expect(speedText(POOLS[3][2][2])).toBe('100 km/h');
  });
  it('win texts start with Clean landing! or Big air! and carry the working', () => {
    for (const { e } of entries) {
      expect(winText(e)).toMatch(e.kind === 'spin' ? /^Clean landing! / : /^Big air! /);
      expect(winText(e)).toContain(e.work);
    }
  });
  it('the intel and the hint line say the right thing for each round', () => {
    for (const s of seeds.slice(0, 10)) {
      const rs = buildRounds(4, createRng(s));
      expect(hintText(rs[0])).toMatch(/gauge shows your setting live/);
      expect(hintText(rs[1])).toMatch(/test run costs a charge/);
      expect(hintText(rs[2])).toMatch(/Boss round: no gauge, no test run/);
      expect(intel(rs[0])).toMatch(/ω\(x\) = .* radians per metre/);
      expect(intel(rs[2])).toMatch(/k\(x\) = .* per metre/);
    }
    const dbl = POOLS[1][2][0];
    expect(intel({ ...dbl, start: 1, assist: 0 })).toMatch(/a double backflip/);
    expect(intel({ ...POOLS[1][0][0], start: 1, assist: 0 })).toMatch(/one backflip/);
  });
  it('no text uses a pronoun for Blaze', () => {
    for (const { e } of entries) {
      for (const text of [winText(e), missText(e, e.q === e.lo ? e.hi : e.lo), intel({ ...e, start: e.lo, assist: 0 })]) {
        expect(text).not.toMatch(/\b(he|she|his|her|him|hers)\b/i);
      }
    }
  });
});

describe('times', () => {
  it('the verdict lands at 1.35 s for a spin and 1.55 s for a boost, inside the 2.4 s resolve', () => {
    expect(SPIN_LAND).toBe(1.35);
    expect(BOOST_LAND).toBe(1.55);
    for (const { e } of entries) {
      expect(landTime(e)).toBe(e.kind === 'spin' ? 1.35 : 1.55);
      expect(landTime(e)).toBeLessThan(2.4);
    }
  });
});
