import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  energyLostMicro,
  energyNj,
  explainSolution,
  fmt,
  judgeEnergy,
  judgeMixed,
  judgeParallel,
  judgeSeries,
  judgeShare,
  mixedC,
  parallelC,
  parallelCharges,
  seriesC,
  seriesVoltages,
  sharedVoltage,
  starsFor,
  type LevelEnergy,
  type LevelMixed,
  type LevelParallel,
  type LevelSeries,
  type LevelShare,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook exercises', () => {
  it('three 9 pF capacitors in series give 3 pF, and share 120 V as 40 V each (Exercise 2.6)', () => {
    expect(seriesC([9, 9, 9])).toBeCloseTo(3, 9);
    seriesVoltages([9, 9, 9], 120).forEach((v) => expect(v).toBeCloseTo(40, 9));
  });
  it('2, 3 and 4 pF in parallel give 9 pF and hold 0.2, 0.3 and 0.4 nC at 100 V (Exercise 2.7)', () => {
    expect(parallelC([2, 3, 4])).toBe(9);
    const q = parallelCharges([2, 3, 4], 100);
    expect(q[0]).toBeCloseTo(0.2, 9);
    expect(q[1]).toBeCloseTo(0.3, 9);
    expect(q[2]).toBeCloseTo(0.4, 9);
  });
  it('a 12 pF capacitor at 50 V stores 15 nJ (Exercise 2.10)', () => {
    expect(energyNj(12, 50)).toBeCloseTo(15, 9);
  });
  it('a 600 pF capacitor at 200 V joined to an uncharged 600 pF one ends at 100 V and loses 6 µJ (Exercise 2.11)', () => {
    expect(sharedVoltage(600, 600, 200)).toBeCloseTo(100, 9);
    expect(energyLostMicro(600, 600, 200)).toBeCloseTo(6, 9);
  });
});

describe('the rules', () => {
  it('series is smaller than the smallest, parallel is larger than the largest', () => {
    for (const cs of [[2, 3, 4], [10, 10], [1, 100]]) {
      expect(seriesC(cs)).toBeLessThan(Math.min(...cs));
      expect(parallelC(cs)).toBeGreaterThan(Math.max(...cs));
    }
  });
  it('in series the voltages add up to the battery voltage, and the same charge sits on each', () => {
    const cs = [3, 6, 12];
    const vs = seriesVoltages(cs, 120);
    expect(vs.reduce((a, b) => a + b, 0)).toBeCloseTo(120, 9);
    const qs = cs.map((c, i) => c * vs[i]);
    expect(qs[0]).toBeCloseTo(qs[1], 9);
    expect(qs[1]).toBeCloseTo(qs[2], 9);
  });
  it('in parallel the charges add up to C_eq V', () => {
    expect(parallelCharges([2, 5, 6], 100).reduce((a, b) => a + b, 0)).toBeCloseTo((parallelC([2, 5, 6]) * 100) / 1000, 9);
  });
  it('the energy lost on sharing is never negative, and is zero only if the second capacitor is infinitely small', () => {
    expect(energyLostMicro(300, 900, 100)).toBeGreaterThan(0);
    expect(energyLostMicro(300, 1e-6, 100)).toBeCloseTo(0, 6);
  });
  it('the energy lost equals the difference between the stored energies before and after', () => {
    const before = energyNj(600, 200);
    const after = energyNj(1200, sharedVoltage(600, 600, 200));
    expect((before - after) / 1000).toBeCloseTo(energyLostMicro(600, 600, 200), 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: C_eq and the chosen voltage follow the series rules; adding the capacitances is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelSeries;
      expect(judgeSeries(l, l.ceq, l.vTarget).ok).toBe(true);
      expect(judgeSeries(l, parallelC(l.cs), l.vTarget).ceqOk).toBe(false);
      expect(judgeSeries(l, l.ceq, l.v / 3).vOk || l.vTarget === l.v / 3).toBe(l.vTarget === l.v / 3 || false);
    }
  });
  it('level 2: C_eq is the sum, the charge is C_target V, and using series for parallel is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelParallel;
      expect(new Set(l.cs).size).toBe(3);
      expect(l.qTarget).toBeCloseTo((l.cs[l.target] * l.v) / 1000, 9);
      expect(judgeParallel(l, l.ceq, l.qTarget).ok).toBe(true);
      expect(judgeParallel(l, seriesC(l.cs), l.qTarget).ceqOk).toBe(false);
      expect(judgeParallel(l, l.ceq, (l.ceq * l.v) / 1000).qOk).toBe(false); // the total charge, not this capacitor's
    }
  });
  it('level 3: both topologies appear, C_eq follows the rules, and the charge is C_eq V', () => {
    const tops = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelMixed;
      tops.add(l.topology);
      expect(l.ceq).toBeCloseTo(mixedC(l.topology, l.c1, l.c2, l.c3), 9);
      expect(l.q).toBeCloseTo((l.ceq * l.v) / 1000, 9);
      expect(judgeMixed(l, l.ceq, l.q).ok).toBe(true);
      expect(judgeMixed(l, parallelC([l.c1, l.c2, l.c3]), l.q).ceqOk).toBe(l.topology === 'c1-parallel-with-chain' && false);
    }
    expect(tops.size).toBe(2);
  });
  it('level 4: U = ½CV², and ×4 is the right answer to doubling the voltage', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelEnergy;
      expect(l.u).toBeCloseTo(0.5 * l.c * l.v * l.v * 1e-3, 9);
      expect(judgeEnergy(l, l.u, 'x4').ok).toBe(true);
      expect(judgeEnergy(l, l.u, 'x2').dblOk).toBe(false);
      expect(judgeEnergy(l, l.c * l.v, 'x4').uOk).toBe(false); // CV is a charge, not an energy
    }
  });
  it('level 5: the common voltage and the loss follow the rules; "heat" is the right place, and the energy loss is positive', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelShare;
      expect(l.v2).toBeLessThan(l.v);
      expect(l.lost).toBeGreaterThan(0);
      expect(judgeShare(l, l.v2, l.lost, 'heat').ok).toBe(true);
      expect(judgeShare(l, l.v, l.lost, 'heat').vOk).toBe(false); // the voltage does not stay the same
      expect(judgeShare(l, l.v2, l.lost, 'vanished').whereOk).toBe(false);
      expect(judgeShare(l, l.v2, l.lost, 'wires').whereOk).toBe(false);
      expect(judgeShare(l, l.v2, 0.5 * (l.c1 * l.v * l.v) * 1e-6, 'heat').lostOk).toBe(false); // the initial energy, not the loss
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
    const must = [/1\/C = 1\/C₁/, /capacitances add/, /inside of the network/, /V ∝|U ∝ V²/, /dissipated/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
