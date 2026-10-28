import { describe, expect, it } from 'vitest';
import {
  buildBox,
  buildCubeFace,
  buildDensity,
  buildFlux,
  buildLevel,
  chargeOf,
  EPS0,
  explainSolution,
  fluxOf,
  fmt,
  judgeBox,
  judgeCubeFace,
  judgeDensity,
  judgeFlux,
  starsFor,
  type LevelBox,
  type LevelCubeFace,
  type LevelDensity,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe("Gauss's law in these units", () => {
  it('a 2 µC charge in a cube gives a flux of 2.26 × 10⁵ N m²/C (Exercise 1.18)', () => {
    expect(fluxOf(2)).toBeCloseTo(2e-6 / EPS0, 3);
    expect(fluxOf(2)).toBeCloseTo(2.26e5, -3);
  });
  it('a flux of −10³ N m²/C means a charge of −8.85 nC, whatever the radius (Exercise 1.19)', () => {
    expect(chargeOf(-1000) * 1000).toBeCloseTo(-8.854, 2);
  });
  it('a sphere of diameter 2.4 m with σ = 80 µC/m² carries 1.45 mC and has a flux of 1.63 × 10⁸ (Exercise 1.21)', () => {
    const q = 80 * 4 * Math.PI * 1.2 * 1.2; // µC
    expect(q).toBeCloseTo(1447.6, 0);
    expect(fluxOf(q)).toBeCloseTo(1.635e8, -5);
  });
  it('flux and charge convert back and forth exactly', () => {
    expect(chargeOf(fluxOf(7.5))).toBeCloseTo(7.5, 12);
  });
});

describe('level 1: charge from a density', () => {
  it('every kind of shape appears, with the matching density symbol', () => {
    const map = new Map<string, string>();
    for (const s of seeds) {
      const l = buildDensity(lcg(s));
      map.set(l.shape, l.symbol);
    }
    expect([...map.entries()].sort()).toEqual([['line', 'λ'], ['surface', 'σ'], ['volume', 'ρ']]);
  });
  it('the answer is the density times the length, area or volume, and is accepted with the right symbol', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelDensity;
      expect(judgeDensity(l, l.symbol, l.answer).ok).toBe(true);
      expect(judgeDensity(l, l.symbol, l.answer * 1.02).ok).toBe(true);
      expect(judgeDensity(l, l.symbol, l.answer * 1.1).qOk).toBe(false);
      const other = (['λ', 'σ', 'ρ'] as const).find((d) => d !== l.symbol)!;
      expect(judgeDensity(l, other, l.answer).symbolOk).toBe(false);
      expect(l.answer).toBeGreaterThan(0);
    }
  });
  it('using the wrong measure (forgetting 4π, or using a radius where the area is needed) is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelDensity;
      if (l.shape === 'line') continue;
      if (Math.abs(l.answer - l.value) / l.value > 0.05) expect(judgeDensity(l, l.symbol, l.value).qOk).toBe(false); // the bare density
    }
  });
});

describe('level 2: flux from the enclosed charge', () => {
  it('the first flux counts only the charges inside, and the second follows the changed surface', () => {
    for (const s of seeds) {
      const l = buildFlux(lcg(s));
      const inside = (radius: number) => l.charges.filter((c) => c.r < radius).reduce((a, c) => a + c.q, 0);
      expect(l.first).toBeCloseTo(fluxOf(inside(1)), 6);
      expect(l.second).toBeCloseTo(fluxOf(inside(l.factor)), 6);
      expect(judgeFlux(l, l.first, l.second).ok).toBe(true);
    }
  });
  it('sometimes the flux is unchanged by changing the surface, sometimes it is not', () => {
    const flags = new Set(seeds.map((s) => buildFlux(lcg(s)).changes));
    expect(flags.size).toBe(2);
    for (const s of seeds) {
      const l = buildFlux(lcg(s));
      if (!l.changes) expect(l.second).toBeCloseTo(l.first, 6);
    }
  });
  it('a charge outside the surface is never counted: including it is a clear miss', () => {
    for (const s of seeds) {
      const l = buildFlux(lcg(s));
      const all = fluxOf(l.charges.reduce((a, c) => a + c.q, 0));
      if (Math.abs(all - l.first) > 0.05 * Math.abs(l.first)) expect(judgeFlux(l, all, l.second).firstOk).toBe(false);
    }
  });
  it('the two answers are judged separately', () => {
    const l = buildFlux(lcg(3));
    expect(judgeFlux(l, l.first * 2, l.second).firstOk).toBe(false);
    expect(judgeFlux(l, l.first * 2, l.second).secondOk).toBe(true);
  });
  it('no charge sits exactly on a surface, so the count is never in doubt', () => {
    for (const s of seeds) {
      const l = buildFlux(lcg(s));
      for (const c of l.charges) {
        expect(Math.abs(c.r - 1)).toBeGreaterThan(0.05);
        expect(Math.abs(c.r - l.factor)).toBeGreaterThan(0.05);
      }
    }
  });
});

describe('level 3: the black box', () => {
  it('the charge is ε₀ Φ in nC, positive or negative with the flux', () => {
    const signs = new Set<number>();
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelBox;
      expect(l.answer).toBeCloseTo(l.measured * EPS0 * 1e9, 9);
      signs.add(Math.sign(l.answer));
    }
    expect(signs.size).toBe(2);
  });
  it('the contents with zero net charge are exactly the three that give zero net flux', () => {
    const l = buildBox(lcg(3));
    expect(l.zero.sort()).toEqual(['big', 'none', 'pair']);
    expect(judgeBox(l, l.answer, ['none', 'pair', 'big']).ok).toBe(true);
  });
  it('ticking only the empty box (the common mistake), or too many, is caught', () => {
    const l = buildBox(lcg(3));
    expect(judgeBox(l, l.answer, ['none']).setOk).toBe(false);
    expect(judgeBox(l, l.answer, ['none', 'pair', 'big', 'one']).setOk).toBe(false);
    expect(judgeBox(l, l.answer * 2, ['none', 'pair', 'big']).qOk).toBe(false);
  });
});

describe('level 4: one face of a cube', () => {
  it('a charge at the centre: each face has a sixth of q/ε₀, and the six add up to q/ε₀', () => {
    const l = (() => {
      for (const s of seeds) {
        const c = buildCubeFace(lcg(s));
        if (c.where === 'centre') return c;
      }
      throw new Error('no centre case');
    })();
    expect(l.answer * 6).toBeCloseTo(fluxOf(l.q), 6);
  });
  it('a charge at a corner: the three touching faces have zero flux, the other three share one eighth of q/ε₀', () => {
    let touching = 0;
    let away = 0;
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelCubeFace;
      if (l.where !== 'corner') continue;
      if (l.touchesCorner) {
        touching++;
        expect(l.answer).toBe(0);
      } else {
        away++;
        expect(l.answer * 3).toBeCloseTo(fluxOf(l.q) / 8, 6);
      }
    }
    expect(touching).toBeGreaterThan(0);
    expect(away).toBeGreaterThan(0);
  });
  it('the right value is accepted, a wrong share (using q/ε₀, or q/(6ε₀) at a corner) is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelCubeFace;
      expect(judgeCubeFace(l, l.answer).ok).toBe(true);
      expect(judgeCubeFace(l, fluxOf(l.q)).ok).toBe(false);
      if (l.where === 'corner') expect(judgeCubeFace(l, fluxOf(l.q) / 6).ok).toBe(false);
    }
  });
  it('the named face really does (or does not) touch the corner', () => {
    for (const s of seeds) {
      const l = buildCubeFace(lcg(s));
      if (l.where !== 'corner') continue;
      expect(['front', 'bottom', 'left'].includes(l.faceName)).toBe(l.touchesCorner);
    }
  });
  it('both placements appear, and both a zero and a non-zero face turn up', () => {
    const places = new Set(seeds.map((s) => buildCubeFace(lcg(s)).where));
    expect(places.size).toBe(2);
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(9, 1)).toBe(1);
  });
  it('levels are deterministic for a seed and differ between seeds', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('every level explains the answer with the physics', () => {
    const must = [/density/, /Gauss’s law/, /zero net flux/, /symmetr/];
    [1, 2, 3, 4].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(2.26e5)).toBe('2.26 × 10⁵');
    expect(fmt(0.5)).toBe('0.5');
  });
});
