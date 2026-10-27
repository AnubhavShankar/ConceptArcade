import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  explainSolution,
  fmt,
  judgeNeutral,
  judgeSolenoid,
  judgeThick,
  judgeToroid,
  judgeWire,
  longWireUT,
  neutralCm,
  netOnLineUT,
  solenoidMT,
  starsFor,
  thickWireUT,
  toroidMT,
  turnsPerMetre,
  wireFieldDir,
  type LevelNeutral,
  type LevelSolenoid,
  type LevelThick,
  type LevelToroid,
  type LevelWire,
  type Pos,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('35 A at 20 cm gives 3.5 × 10⁻⁵ T (Exercise 4.2)', () => {
    expect(longWireUT(35, 0.2)).toBeCloseTo(35, 6);
  });
  it('50 A at 2.5 m gives 4 × 10⁻⁶ T (Exercise 4.3)', () => {
    expect(longWireUT(50, 2.5)).toBeCloseTo(4, 6);
  });
  it('90 A at 1.5 m gives 1.2 × 10⁻⁵ T (Exercise 4.4)', () => {
    expect(longWireUT(90, 1.5)).toBeCloseTo(12, 6);
  });
  it('5 layers of 400 turns on 80 cm with 8 A give about 2.5 × 10⁻² T (Exercise 4.8)', () => {
    const n = turnsPerMetre(5, 400, 80);
    expect(n).toBe(2500);
    expect(solenoidMT(n, 8)).toBeCloseTo(25.1, 1);
  });
  it('500 turns on 0.5 m with 5 A give about 6.3 × 10⁻³ T (Example 4.8)', () => {
    expect(solenoidMT(turnsPerMetre(1, 500, 50), 5)).toBeCloseTo(6.28, 2);
  });
});

describe('the rules', () => {
  it('the field inside a thick wire grows as r, outside it falls as 1/r, and the two agree at the surface', () => {
    expect(thickWireUT(20, 4, 2)).toBeCloseTo(thickWireUT(20, 4, 1) * 2, 9);
    expect(thickWireUT(20, 4, 8)).toBeCloseTo(thickWireUT(20, 4, 4 + 1e-9) / 2, 5);
    expect(thickWireUT(20, 4, 4 - 1e-9)).toBeCloseTo(thickWireUT(20, 4, 4 + 1e-9), 4);
  });
  it('the field direction reverses with the current and goes round the wire anticlockwise for current out', () => {
    const order: Pos[] = ['right', 'above', 'left', 'below'];
    expect(order.map((p) => wireFieldDir(p, true))).toEqual(['up', 'left', 'down', 'right']);
    expect(order.map((p) => wireFieldDir(p, false))).toEqual(['down', 'right', 'up', 'left']);
  });
  it('the net field on the line is zero at the neutral point, in both cases', () => {
    expect(netOnLineUT(neutralCm(3, 1, 12, true), 3, 1, 12)).toBeCloseTo(0, 6);
    expect(netOnLineUT(neutralCm(3, 1, 10, false), 3, -1, 10)).toBeCloseTo(0, 6);
  });
  it('a toroid is the solenoid formula with 2πr in place of the length', () => {
    expect(toroidMT(1000, 2, 15)).toBeCloseTo(solenoidMT(1000 / (2 * Math.PI * 0.15), 2), 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: all four directions occur; field and direction win; the reversed direction loses', () => {
    const dirs = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelWire;
      dirs.add(l.dir);
      expect(judgeWire(l, l.ut, l.dir).ok).toBe(true);
      expect(judgeWire(l, l.ut, wireFieldDir(l.pos, !l.currentOut)).dirOk).toBe(false);
      expect(judgeWire(l, l.ut * 0.5, l.dir).bOk).toBe(false);
    }
    expect(dirs.size).toBe(4);
  });
  it('level 2: one point inside and one outside; both fields win; swapping them loses', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelThick;
      expect(l.rInMm).toBeLessThan(l.aMm);
      expect(l.rOutMm).toBeGreaterThan(l.aMm);
      expect(judgeThick(l, l.inUt, l.outUt).ok).toBe(true);
      if (Math.abs(l.inUt - l.outUt) / l.inUt > 0.05) expect(judgeThick(l, l.outUt, l.inUt).ok).toBe(false);
    }
  });
  it('level 3: both cases occur; the neutral point is on a half-centimetre grid and the meter crosses zero there', () => {
    const sames = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelNeutral;
      sames.add(l.same);
      expect((l.xCm * 2) % 1).toBeCloseTo(0, 9);
      const i2 = l.same ? l.i2 : -l.i2;
      expect(netOnLineUT(l.xCm, l.i1, i2, l.dCm)).toBeCloseTo(0, 6);
      if (l.same) expect(l.xCm).toBeLessThan(l.dCm);
      else expect(l.xCm).toBeGreaterThan(l.dCm);
      expect(judgeNeutral(l, l.xCm).ok).toBe(true);
      expect(judgeNeutral(l, l.dCm / 2).ok).toBe(l.xCm === l.dCm / 2);
    }
    expect(sames.size).toBe(2);
  });
  it('level 4: turns per metre and the field win; using the total turns for n loses', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelSolenoid;
      expect(l.n).toBeCloseTo((l.layers * l.perLayer) / (l.lCm / 100), 9);
      expect(judgeSolenoid(l, l.n, l.mt).ok).toBe(true);
      if (l.lCm !== 100) expect(judgeSolenoid(l, l.layers * l.perLayer, l.mt).nOk).toBe(false);
    }
  });
  it('level 5: the winding field and "zero in the hole" win; "same as inside" loses', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelToroid;
      expect(judgeToroid(l, l.mt, 'zero').ok).toBe(true);
      expect(judgeToroid(l, l.mt, 'same').holeOk).toBe(false);
      expect(judgeToroid(l, l.mt, 'half').holeOk).toBe(false);
      expect(judgeToroid(l, l.mt * 2 * Math.PI, 'zero').bOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/Ampère's law/, /fraction r²\/a²/, /fields cancel|cancel/, /μ₀nI/, /confined to the winding/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
