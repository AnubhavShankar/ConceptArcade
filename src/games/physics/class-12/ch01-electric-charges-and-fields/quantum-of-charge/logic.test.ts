import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  checkElectrons,
  checkUnit,
  determinesUnit,
  E,
  G,
  gcdAll,
  GAP,
  hoverVoltage,
  in19,
  isHovering,
  isImpure,
  makeDrop,
  measuredCharge,
  netRatio,
  scoreFlags,
  speed,
  starsFor,
  tellsApart,
  V_MAX,
} from './logic';

const lcg = (seed: number) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

describe('the physics of a hovering drop', () => {
  const d = makeDrop(1, 1.0e-15, 1); // 1.0 × 10⁻¹⁵ kg carrying one electron

  it('hovers when qV/d = mg: one electron on a 1.0e-15 kg drop needs about 306 V', () => {
    expect(hoverVoltage(d)).toBeCloseTo((1e-15 * G * GAP) / E, 6);
    expect(hoverVoltage(d)).toBeCloseTo(306.25, 2);
  });
  it('more charge needs less voltage: n electrons need 1/n of the voltage', () => {
    expect(hoverVoltage(makeDrop(1, 1e-15, 2))).toBeCloseTo(hoverVoltage(d) / 2, 8);
    expect(hoverVoltage(makeDrop(1, 1e-15, 5))).toBeCloseTo(hoverVoltage(d) / 5, 8);
  });
  it('a heavier drop needs more voltage', () => {
    expect(hoverVoltage(makeDrop(1, 1.4e-15, 3))).toBeGreaterThan(hoverVoltage(makeDrop(1, 0.8e-15, 3)));
  });
  it('the net force is zero at the hover voltage, up above it, down below it', () => {
    const vh = hoverVoltage(d);
    expect(netRatio(vh, d)).toBeCloseTo(0, 10);
    expect(netRatio(vh * 1.1, d)).toBeGreaterThan(0);
    expect(netRatio(vh * 0.9, d)).toBeLessThan(0);
    expect(netRatio(0, d)).toBe(-1); // no field: just falling under gravity
  });
  it('the drop rises when the voltage is too high and falls when it is too low', () => {
    const vh = hoverVoltage(d);
    expect(speed(netRatio(vh * 1.2, d))).toBeGreaterThan(0);
    expect(speed(netRatio(vh * 0.8, d))).toBeLessThan(0);
    expect(speed(netRatio(vh, d))).toBeCloseTo(0, 6);
  });
  it('speed is proportional to the net force for small imbalances and is capped', () => {
    expect(speed(0.01)).toBeCloseTo(speed(0.02) / 2, 6);
    expect(speed(50)).toBe(140);
    expect(speed(-50)).toBe(-140);
  });
  it('hovering means within the tolerance of the hover voltage', () => {
    const vh = hoverVoltage(d);
    expect(isHovering(vh, d, 0.02)).toBe(true);
    expect(isHovering(vh * 1.015, d, 0.02)).toBe(true);
    expect(isHovering(vh * 1.03, d, 0.02)).toBe(false);
    expect(isHovering(vh * 0.97, d, 0.02)).toBe(false);
    expect(isHovering(0, d, 0.5)).toBe(false);
  });
  it('the lab reads the charge back from the voltage: exact at the hover voltage, off by the tuning error otherwise', () => {
    const vh = hoverVoltage(d);
    expect(measuredCharge(vh, d)).toBeCloseTo(d.charge, 25);
    expect(in19(measuredCharge(vh, d))).toBeCloseTo(1.6, 6);
    expect(measuredCharge(vh * 1.02, d) / d.charge).toBeCloseTo(1 / 1.02, 6); // 2% too much voltage reads 2% low
  });
});

describe('finding the unit needs evidence', () => {
  const drop = (n: number, i = n) => makeDrop(i, 1e-15, n);
  it('needs at least three drops', () => {
    expect(determinesUnit([drop(2), drop(3)])).toBe(false);
  });
  it('drops that are all multiples of 2e cannot tell e from 2e', () => {
    expect(determinesUnit([drop(2), drop(4), drop(6), drop(8)])).toBe(false);
  });
  it('drops that are all multiples of 3e cannot tell e from 3e', () => {
    expect(determinesUnit([drop(3), drop(6), drop(9)])).toBe(false);
  });
  it('three drops with no common factor can', () => {
    expect(determinesUnit([drop(2), drop(3), drop(5)])).toBe(true);
    expect(determinesUnit([drop(4), drop(6), drop(9)])).toBe(true);
  });
  it('a lone odd drop among evens is enough', () => {
    expect(determinesUnit([drop(4), drop(6), drop(8), drop(9)])).toBe(true);
  });
  it('gcd', () => {
    expect(gcdAll([12, 18, 24])).toBe(6);
    expect(gcdAll([4, 6, 9])).toBe(1);
  });
  it('accepts the unit within tolerance, in 10⁻¹⁹ C or in coulombs, and rejects multiples of it', () => {
    expect(checkUnit(1.6, 0.05)).toBe(true);
    expect(checkUnit(1.55, 0.05)).toBe(true);
    expect(checkUnit(1.65, 0.05)).toBe(true);
    expect(checkUnit(1.6e-19, 0.05)).toBe(true);
    expect(checkUnit(3.2, 0.05)).toBe(false); // 2e is not e
    expect(checkUnit(0.8, 0.05)).toBe(false); // e/2 is not e
    expect(checkUnit(1.8, 0.05)).toBe(false);
  });
});

describe('electrons and impure samples', () => {
  it('checks a whole number of electrons', () => {
    const d = makeDrop(1, 1e-15, 4);
    expect(checkElectrons(4, d)).toBe(true);
    expect(checkElectrons(3, d)).toBe(false);
    expect(checkElectrons(4.5, d)).toBe(false);
  });
  it('a half-integer multiple is impure', () => {
    expect(isImpure(makeDrop(1, 1e-15, 2.5))).toBe(true);
    expect(isImpure(makeDrop(1, 1e-15, 3))).toBe(false);
  });
  it('scoreFlags needs exactly the impure drops, no more and no fewer', () => {
    const drops = [makeDrop(1, 1e-15, 1), makeDrop(2, 1e-15, 2.5), makeDrop(3, 1e-15, 3), makeDrop(4, 1e-15, 4.5)];
    expect(scoreFlags([2, 4], drops).correct).toBe(true);
    expect(scoreFlags([4, 2], drops).correct).toBe(true);
    expect(scoreFlags([2], drops)).toMatchObject({ correct: false, missed: [4], falseAlarms: [] });
    expect(scoreFlags([1, 2, 4], drops)).toMatchObject({ correct: false, missed: [], falseAlarms: [1] });
    expect(scoreFlags([], drops).correct).toBe(false);
  });
  it('at the level 3 tolerance, a pure reading can never be mistaken for a half-integer one', () => {
    expect(tellsApart(6, 0.03)).toBe(true);
    expect(tellsApart(8, 0.03)).toBe(false); // why level 3 stops at 6 e
  });
});

describe('buildLevel: incremental levels', () => {
  it('every drop can actually be made to hover within the voltage dial, on every level and many seeds', () => {
    for (const level of [1, 2, 3]) {
      for (let s = 1; s < 80; s++) {
        for (const drop of buildLevel(level, lcg(s)).drops) {
          const vh = hoverVoltage(drop);
          expect(vh).toBeGreaterThan(15); // fine-tunable, not at the very bottom of the dial
          expect(vh).toBeLessThan(V_MAX);
        }
      }
    }
  });
  it('level 1: three drops with different charges of 1 to 6 e, e is printed in the lab', () => {
    for (let s = 1; s < 40; s++) {
      const l = buildLevel(1, lcg(s));
      expect(l.mode).toBe('count');
      expect(l.drops).toHaveLength(3);
      expect(new Set(l.drops.map((d) => d.multiple)).size).toBe(3);
      expect(l.drops.every((d) => Number.isInteger(d.multiple) && d.multiple >= 1 && d.multiple <= 6)).toBe(true);
      expect(l.eKnown).toBe(true);
    }
  });
  it('level 2: five drops whose multiples have no common factor, none carrying just one e, e is hidden', () => {
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(2, lcg(s));
      expect(l.mode).toBe('unit');
      expect(l.drops).toHaveLength(5);
      expect(gcdAll(l.drops.map((d) => d.multiple))).toBe(1); // the unit CAN be found
      expect(Math.min(...l.drops.map((d) => d.multiple))).toBeGreaterThanOrEqual(2); // the smallest charge is not e itself
      expect(l.eKnown).toBe(false);
      expect(determinesUnit(l.drops)).toBe(true);
    }
  });
  it('level 3: six drops, exactly two impure, none above 6.5 e, e is printed', () => {
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(3, lcg(s));
      expect(l.mode).toBe('flag');
      expect(l.drops).toHaveLength(6);
      expect(l.drops.filter(isImpure)).toHaveLength(2);
      expect(Math.max(...l.drops.map((d) => d.multiple))).toBeLessThanOrEqual(6.5);
      expect(l.eKnown).toBe(true);
      expect(tellsApart(6, l.tol)).toBe(true);
    }
  });
  it('the hover voltage cannot give the charge away: the same charge hovers at different voltages for different masses', () => {
    const volts = new Set<number>();
    for (let s = 1; s < 60; s++) for (const d of buildLevel(1, lcg(s)).drops.filter((x) => x.multiple === 3)) volts.add(Math.round(hoverVoltage(d)));
    expect(volts.size).toBeGreaterThan(5);
  });
  it('tuning gets harder: tolerance never loosens, from level 1 to 2', () => {
    expect(buildLevel(2, lcg(1)).tol).toBeLessThan(buildLevel(1, lcg(1)).tol);
  });
  it('is deterministic for a seed and varies between seeds', () => {
    for (const level of [1, 2, 3]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(JSON.stringify(buildLevel(level, lcg(5)))).not.toEqual(JSON.stringify(buildLevel(level, lcg(6))));
    }
  });
});

describe('stars', () => {
  it('each wrong answer costs a star, minimum one', () => {
    expect([0, 1, 2, 5].map(starsFor)).toEqual([3, 2, 1, 1]);
  });
});
