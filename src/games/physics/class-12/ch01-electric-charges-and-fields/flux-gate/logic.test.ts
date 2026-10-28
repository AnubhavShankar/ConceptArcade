import { describe, expect, it } from 'vitest';
import { buildLevel, explainSolution, FACES, faceFluxes, flux, fmt, growNet, judgeCube, judgeGrow, judgeTilt, signOf, starsFor, type LevelAngle, type LevelCube, type LevelGrow, type LevelTilt } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);

describe('flux through a flat area, Φ = E A cos θ', () => {
  it('a field of 3 × 10³ N/C through a 10 cm square: 30 N m²/C face on, 15 at 60° (Exercise 1.14)', () => {
    expect(flux(3000, 0.1 * 0.1, 0)).toBeCloseTo(30, 9);
    expect(flux(3000, 0.1 * 0.1, 60)).toBeCloseTo(15, 9);
  });
  it('is zero edge-on, and negative once the outward normal points against the field', () => {
    expect(flux(3000, 0.01, 90)).toBeCloseTo(0, 9);
    expect(flux(3000, 0.01, 120)).toBeLessThan(0);
    expect(flux(3000, 0.01, 180)).toBeCloseTo(-30, 9);
  });
  it('is largest when the loop faces the field, never when it is edge-on', () => {
    expect(flux(1000, 1, 0)).toBeGreaterThan(flux(1000, 1, 45));
    expect(flux(1000, 1, 45)).toBeGreaterThan(flux(1000, 1, 90));
  });
});

describe('a cube in a uniform field', () => {
  it('the net flux through the six faces is zero for every direction of the field (Exercise 1.15)', () => {
    for (const alpha of [0, 30, 45, 60, 90, 120, 150, 180, 210, 270, 330]) {
      const net = faceFluxes(3000, 0.2, alpha).reduce((a, b) => a + b, 0);
      expect(Math.abs(net)).toBeLessThan(1e-9);
    }
  });
  it('opposite faces carry equal and opposite flux, and the z faces carry none when the field is in the x-y plane', () => {
    const f = faceFluxes(4000, 0.1, 30);
    expect(f[0]).toBeCloseTo(-f[1], 9);
    expect(f[2]).toBeCloseTo(-f[3], 9);
    expect(f[4]).toBe(0);
    expect(f[5]).toBe(0);
  });
  it('a field along +x leaves through +x, enters through −x and skims the other four', () => {
    const f = faceFluxes(2000, 0.1, 0);
    expect(f[0]).toBeCloseTo(20, 9);
    expect(f[1]).toBeCloseTo(-20, 9);
    expect(Math.abs(f[2])).toBeLessThan(1e-9);
    expect(FACES).toHaveLength(6);
  });
  it('signs: near-zero values count as zero', () => {
    expect(signOf(1e-12, 1e-6)).toBe(0);
    expect(signOf(5, 1e-6)).toBe(1);
    expect(signOf(-5, 1e-6)).toBe(-1);
  });
});

describe('a field that grows with x (Example 1.10)', () => {
  it('E = 800 √x with a cube of side 0.1 m has a net flux of about 1.05 N m²/C', () => {
    expect(growNet(800, 0.1)).toBeCloseTo(1.05, 2);
  });
  it('is the far-face flux minus the near-face flux, and zero when the field is uniform', () => {
    const alpha = 600;
    const a = 0.2;
    const far = alpha * Math.sqrt(2 * a) * a * a;
    const near = alpha * Math.sqrt(a) * a * a;
    expect(growNet(alpha, a)).toBeCloseTo(far - near, 12);
    expect(growNet(alpha, a)).toBeGreaterThan(0);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('levels 1 and 3: the answer angle gives the target flux, both signs of flux occur, and the target is not zero', () => {
    const signs = new Set<number>();
    for (const level of [1, 3]) {
      for (const s of seeds) {
        const l = buildLevel(level, lcg(s)) as LevelTilt | LevelAngle;
        expect(judgeTilt(l, l.thetaAnswer).ok).toBe(true);
        expect(l.target).not.toBe(0);
        signs.add(Math.sign(l.target));
      }
    }
    expect(signs.size).toBe(2);
  });
  it('levels 1 and 3: a wrong angle is told too much or too little, and 3% of E·A is the boundary', () => {
    const l = buildLevel(1, lcg(3)) as LevelTilt;
    const wrong = l.thetaAnswer < 90 ? l.thetaAnswer + 20 : l.thetaAnswer - 20;
    const r = judgeTilt(l, wrong);
    expect(r.ok).toBe(false);
    expect(['too-much', 'too-little']).toContain(r.verdict);
    expect(judgeTilt(l, l.thetaAnswer + 1).ok).toBe(true);
    expect(judgeTilt(l, l.thetaAnswer + 8).ok).toBe(false);
  });
  it('level 2: the states match the flux values, and the net flux and +x flux are right', () => {
    const outcomes = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelCube;
      const f = faceFluxes(l.e, l.side, l.alpha);
      l.states.forEach((st, i) => expect(st).toBe(Math.abs(f[i]) < 1e-6 * l.e * l.side * l.side ? 0 : Math.sign(f[i])));
      expect(l.rightFlux).toBeCloseTo(f[0], 9);
      expect(judgeCube(l, l.states, l.rightFlux, 0).ok).toBe(true);
      outcomes.add(l.states.join(','));
    }
    expect(outcomes.size).toBeGreaterThan(4);
  });
  it('level 2: every kind of mistake is caught separately', () => {
    const l = buildLevel(2, lcg(7)) as LevelCube;
    const bad = [...l.states];
    bad[0] = bad[0] === 1 ? -1 : 1;
    expect(judgeCube(l, bad, l.rightFlux, 0).facesWrong).toBe(1);
    expect(judgeCube(l, l.states, l.rightFlux * 2 + 1, 0).rightOk).toBe(false);
    expect(judgeCube(l, l.states, l.rightFlux, l.e * l.side * l.side).netOk).toBe(false);
    expect(judgeCube(l, l.states, l.rightFlux, 0).ok).toBe(true);
  });
  it('level 2: faces with zero flux appear (the field skimming a face) and the field enters through some faces', () => {
    const zero = seeds.some((s) => (buildLevel(2, lcg(s)) as LevelCube).states.slice(0, 4).includes(0));
    const negative = seeds.every((s) => (buildLevel(2, lcg(s)) as LevelCube).states.includes(-1));
    expect(zero).toBe(true);
    expect(negative).toBe(true);
  });
  it('level 4: the net flux matches the formula, is positive, and 3% is the tolerance', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelGrow;
      expect(l.net).toBeCloseTo(growNet(l.alpha, l.a), 12);
      expect(l.net).toBeGreaterThan(0);
      expect(judgeGrow(l, l.net).ok).toBe(true);
      expect(judgeGrow(l, l.net * 1.02).ok).toBe(true);
      expect(judgeGrow(l, l.net * 1.1).verdict).toBe('too-big');
      expect(judgeGrow(l, l.net * 0.9).verdict).toBe('too-small');
    }
  });
  it('level 4: forgetting the near face (using only the far face) is a clear miss', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelGrow;
      const farOnly = l.alpha * Math.sqrt(2 * l.a) * l.a * l.a;
      expect(judgeGrow(l, farOnly).ok).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(9, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/E A cos θ/, /outward normal/, /E A cos θ/, /α a\^\(5\/2\)/];
    [1, 2, 3, 4].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(30)).toBe('30');
    expect(fmt(0.001)).toBe('1 × 10⁻³');
  });
});
