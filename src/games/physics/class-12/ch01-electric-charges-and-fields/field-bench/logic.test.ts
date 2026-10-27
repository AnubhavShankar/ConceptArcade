import { describe, expect, it } from 'vitest';
import {
  accel,
  buildLevel,
  deflection,
  describeLanding,
  explainSolution,
  fieldAt,
  fmt,
  forceOnCharge,
  judgeJet,
  judgePair,
  judgePoint,
  judgeTracks,
  magnitude,
  pathAt,
  pointField,
  starsFor,
  trackExit,
  type LevelJet,
  type LevelPair,
  type LevelPoint,
  type LevelTracks,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 120 }, (_, i) => i * 7919 + 13);

describe('field of a point charge, in these units', () => {
  it('is k Q / r² (checked against SI)', () => {
    expect(pointField(1, 10)).toBeCloseTo((9e9 * 1e-9) / 0.1 ** 2, 9); // 900 N/C
    expect(pointField(4, 20)).toBeCloseTo((9e9 * 4e-9) / 0.2 ** 2, 9);
  });
  it('falls as 1/r², and takes the sign of the charge', () => {
    expect(pointField(3, 20)).toBeCloseTo(pointField(3, 10) / 4, 12);
    expect(pointField(-3, 10)).toBeLessThan(0);
  });
  it('points away from a positive charge and towards a negative one', () => {
    const away = fieldAt({ x: 5, y: 0 }, [{ q: 2, at: { x: 0, y: 0 } }]);
    const towards = fieldAt({ x: 5, y: 0 }, [{ q: -2, at: { x: 0, y: 0 } }]);
    expect(away.x).toBeGreaterThan(0);
    expect(towards.x).toBeLessThan(0);
  });
  it('is not defined at the charge itself, and does not blow up there', () => {
    const e = fieldAt({ x: 0, y: 0 }, [{ q: 5, at: { x: 0, y: 0 } }]);
    expect(Number.isFinite(e.x)).toBe(true);
  });
  it('F = qE', () => {
    expect(forceOnCharge(2, 900)).toBeCloseTo(1.8e-6, 15);
    expect(forceOnCharge(-2, 900)).toBeCloseTo(-1.8e-6, 15);
  });
});

describe('superposition of fields', () => {
  it('opposite equal charges: the field at the midpoint is twice that of one, from + to − (Exercise 1.8)', () => {
    // +3 nC and −3 nC, 20 cm apart: the field at the midpoint
    const e = fieldAt({ x: 0, y: 0 }, [{ q: 3, at: { x: -10, y: 0 } }, { q: -3, at: { x: 10, y: 0 } }]);
    expect(e.x).toBeCloseTo(2 * pointField(3, 10), 9);
    expect(e.x).toBeGreaterThan(0); // pointing from the positive charge to the negative one
    expect(Math.abs(e.y)).toBeLessThan(1e-9);
  });
  it('the force on a negative test charge there is opposite to the field (Exercise 1.8b)', () => {
    const e = fieldAt({ x: 0, y: 0 }, [{ q: 3, at: { x: -10, y: 0 } }, { q: -3, at: { x: 10, y: 0 } }]);
    expect(forceOnCharge(-1.5, e.x)).toBeLessThan(0);
  });
  it('equal like charges cancel at the midpoint', () => {
    const e = fieldAt({ x: 0, y: 0 }, [{ q: 4, at: { x: -8, y: 0 } }, { q: 4, at: { x: 8, y: 0 } }]);
    expect(magnitude(e)).toBeCloseTo(0, 9);
  });
  it('fields on the same side add as numbers, along a line (Example 1.8 style)', () => {
    const e = fieldAt({ x: 5, y: 0 }, [{ q: 10, at: { x: 0, y: 0 } }, { q: -10, at: { x: 10, y: 0 } }]);
    expect(e.x).toBeCloseTo(pointField(10, 5) + pointField(10, 5), 9);
  });
});

describe('charged particles in a uniform field', () => {
  const drop = { q: 2, m: 1 };
  it('a = qE/m, in the direction of E for a positive charge and against it for a negative one', () => {
    expect(accel(drop, 5000, 1)).toBeCloseTo(1e4, 9); // m/s²
    expect(accel({ q: -2, m: 1 }, 5000, 1)).toBeCloseTo(-1e4, 9);
    expect(accel(drop, 5000, -1)).toBeCloseTo(-1e4, 9);
  });
  it('the deflection inside the plates is ½ a t² with t = L / v₀', () => {
    const y = deflection(drop, 5000, 1, 20, 0.02);
    expect(y).toBeCloseTo(0.5 * 1e4 * (0.02 / 20) ** 2, 12); // 5 mm
    expect(y * 1000).toBeCloseTo(5, 9);
  });
  it('after the plates the drop keeps moving sideways in a straight line (L/2 + D)', () => {
    const y = deflection(drop, 5000, 1, 20, 0.02, 0.04);
    expect(y).toBeCloseTo((2 * 5000 * 0.02 * (0.02 / 2 + 0.04)) / (1 * 20 * 20) * 1, 9);
    expect(y).toBeGreaterThan(deflection(drop, 5000, 1, 20, 0.02));
  });
  it('doubling the speed cuts the deflection to a quarter; doubling the field doubles it', () => {
    const y = deflection(drop, 5000, 1, 20, 0.02);
    expect(deflection(drop, 5000, 1, 40, 0.02)).toBeCloseTo(y / 4, 12);
    expect(deflection(drop, 10000, 1, 20, 0.02)).toBeCloseTo(2 * y, 12);
  });
  it('the animated path agrees with the formula at the end of the plates and at the paper', () => {
    const tin = 0.02 / 20;
    expect(pathAt(drop, 5000, 1, 20, 0.02, tin).y).toBeCloseTo(deflection(drop, 5000, 1, 20, 0.02), 12);
    const tEnd = tin + 0.04 / 20;
    const end = pathAt(drop, 5000, 1, 20, 0.02, tEnd);
    expect(end.x).toBeCloseTo(0.06, 12);
    expect(end.y).toBeCloseTo(deflection(drop, 5000, 1, 20, 0.02, 0.04), 12);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      const distinct = new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s)))));
      expect(distinct.size).toBeGreaterThan(3);
    }
  });

  it('level 1: the answer distance gives the target field, with the right force direction on a negative test charge', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelPoint;
      expect(Math.abs(pointField(l.Q, l.rAnswer))).toBeCloseTo(l.target, 9);
      const truth = l.Q > 0 ? 'toward' : 'away';
      expect(judgePoint(l, l.rAnswer, truth).ok).toBe(true);
      expect(judgePoint(l, l.rAnswer, truth === 'toward' ? 'away' : 'toward').ok).toBe(false);
    }
  });
  it('level 1: both signs of source appear, and a wrong distance is reported as too strong or too weak', () => {
    expect(new Set(seeds.map((s) => Math.sign((buildLevel(1, lcg(s)) as LevelPoint).Q))).size).toBe(2);
    const l = buildLevel(1, lcg(3)) as LevelPoint;
    const truth = l.Q > 0 ? 'toward' : 'away';
    expect(judgePoint(l, l.rAnswer * 0.8, truth).verdict).toBe('too-strong');
    expect(judgePoint(l, l.rAnswer * 1.3, truth).verdict).toBe('too-weak');
    expect(judgePoint(l, l.rAnswer * 1.01, truth).ok).toBe(true);
    expect(judgePoint(l, l.rAnswer * 1.05, truth).ok).toBe(false);
  });

  it('level 2: the test charge in the answer gives the ordered force, and its sign matters', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelPair;
      expect(judgePair(l, l.qAnswer).ok).toBe(true);
      expect(judgePair(l, -l.qAnswer).ok).toBe(false); // right size, wrong sign: force points the other way
      expect(judgePair(l, l.qAnswer * 2).ok).toBe(false);
      expect(Math.abs(judgePair(l, 1).e.x)).toBeGreaterThan(1); // never a degenerate zero field
    }
  });
  it('level 2: the point P is sometimes the midpoint and sometimes outside the pair', () => {
    const where = new Set(seeds.map((s) => ((buildLevel(2, lcg(s)) as LevelPair).probe.x === 0 ? 'mid' : 'out')));
    expect(where.size).toBe(2);
  });
  it('level 2: forgetting one of the two charges is not accepted', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelPair;
      const onlyOne = fieldAt(l.probe, [l.sources[0]]).x;
      const q = l.targetF / (onlyOne * 1e-9);
      expect(judgePair(l, q).ok).toBe(l.sources[1].q === 0);
    }
  });

  it('levels 3 and 5: the answer field and direction land the drop on the target', () => {
    for (const level of [3, 5]) {
      for (const s of seeds) {
        const l = buildLevel(level, lcg(s)) as LevelJet;
        const r = judgeJet(l, l.eAnswer, l.dirAnswer);
        expect(r.ok).toBe(true);
        expect(Math.abs(r.landing - l.yTarget)).toBeLessThan(1e-6);
        expect(l.D > 0).toBe(level === 5);
      }
    }
  });
  it('levels 3 and 5: the wrong direction sends the drop to the other side, and a wrong strength misses', () => {
    for (const level of [3, 5]) {
      for (const s of seeds) {
        const l = buildLevel(level, lcg(s)) as LevelJet;
        const flipped = judgeJet(l, l.eAnswer, (-l.dirAnswer) as 1 | -1);
        expect(flipped.ok).toBe(false);
        expect(flipped.side).toBe('wrong-side');
        expect(judgeJet(l, l.eAnswer * 1.3, l.dirAnswer).side).toBe('too-high');
        expect(judgeJet(l, l.eAnswer * 0.7, l.dirAnswer).side).toBe('too-low');
        expect(judgeJet(l, l.eAnswer * 1.02, l.dirAnswer).ok).toBe(true);
      }
    }
  });
  it('levels 3 and 5: the drop of either sign appears and the field direction follows the sign', () => {
    const signs = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelJet;
      signs.add(`${Math.sign(l.drop.q)}${Math.sign(l.yTarget)}${l.dirAnswer}`);
      expect(l.dirAnswer).toBe(Math.sign(l.drop.q) === Math.sign(l.yTarget) ? 1 : -1);
    }
    expect(signs.size).toBe(4);
  });
  it('levels 3 and 5: the fields are in a sensible range and the picture fits (deflection under 10 mm)', () => {
    for (const level of [3, 5]) for (const s of seeds) {
      const l = buildLevel(level, lcg(s)) as LevelJet;
      expect(l.eAnswer).toBeGreaterThan(20);
      expect(l.eAnswer).toBeLessThan(3e5);
      expect(Math.abs(l.yTarget)).toBeLessThanOrEqual(8);
    }
  });
  it('level 5: ignoring the gap gives a clearly wrong field', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelJet;
      const Lm = l.L / 100;
      // the field a student would get by treating the plates as if the paper were right at their edge
      const eNoGap = ((Math.abs(l.yTarget) / 1000) * l.drop.m * l.v0 * l.v0) / (Math.abs(l.drop.q) * Lm * (Lm / 2));
      expect(judgeJet(l, eNoGap, l.dirAnswer).ok).toBe(false);
    }
  });

  it('level 4: three distinct charge-to-mass ratios at least 30% apart, with the highest identified', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelTracks;
      const r = l.tracks.map((t) => Math.abs(t.q) / t.m);
      expect(new Set(r).size).toBe(3);
      const sorted = [...r].sort((a, b) => a - b);
      expect(sorted[1] / sorted[0]).toBeGreaterThanOrEqual(1.3 - 1e-9);
      expect(sorted[2] / sorted[1]).toBeGreaterThanOrEqual(1.3 - 1e-9);
      expect(l.tracks.find((t) => t.id === l.highest)).toBeDefined();
      expect(r[l.highest - 1]).toBe(sorted[2]);
    }
  });
  it('level 4: the most deflected track has the highest q/m, and a negative track bends against the field', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelTracks;
      const ex = l.tracks.map((_, i) => trackExit(l, i));
      const biggest = ex.reduce((b, v, i) => (Math.abs(v) > Math.abs(ex[b]) ? i : b), 0);
      expect(biggest + 1).toBe(l.highest);
      l.tracks.forEach((t, i) => expect(Math.sign(ex[i])).toBe(Math.sign(t.q) * l.dir));
      expect(Math.max(...ex.map(Math.abs))).toBeLessThan(15); // fits the picture, in mm
    }
  });
  it('level 4: right tags win, any wrong sign or wrong ranking is caught', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelTracks;
      const signs = l.tracks.map((t) => (t.q > 0 ? 1 : -1)) as (1 | -1)[];
      expect(judgeTracks(l, signs, l.highest).ok).toBe(true);
      const bad = [...signs];
      bad[0] = (-bad[0]) as 1 | -1;
      const r = judgeTracks(l, bad, l.highest);
      expect(r.ok).toBe(false);
      expect(r.signsOk).toEqual([false, true, true]);
      expect(judgeTracks(l, signs, (l.highest % 3) + 1).highestOk).toBe(false);
      expect(judgeTracks(l, [null, null, null], null).ok).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star, never below one', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(9, 1)).toBe(1);
    expect(starsFor(1, 0)).toBe(2);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/r = √/, /superposition/, /a = qE\/m/, /a = qE\/m/, /charge-to-mass/];
    [1, 2, 3, 5, 4].forEach((level, i) => {
      expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]);
    });
  });
  it('level 5 explains the gap, and level 3 does not', () => {
    expect(explainSolution(buildLevel(5, lcg(3))).join(' ')).toMatch(/gap D/);
    expect(explainSolution(buildLevel(3, lcg(3))).join(' ')).not.toMatch(/gap D/);
  });
  it('formats numbers and landing spots', () => {
    expect(fmt(5000)).toBe('5000');
    expect(fmt(0.00123)).toBe('1.23 × 10⁻³');
    expect(describeLanding(-4.5)).toBe('4.5 mm below the beam line');
    expect(describeLanding(3)).toBe('3 mm above the beam line');
  });
});
