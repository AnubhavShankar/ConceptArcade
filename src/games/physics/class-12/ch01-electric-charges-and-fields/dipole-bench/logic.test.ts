import { describe, expect, it } from 'vitest';
import {
  axisField,
  buildLevel,
  dipoleField,
  dipoleRatio,
  equatorField,
  explainSolution,
  fmt,
  judgeAxis,
  judgeFade,
  judgeMoment,
  judgeStable,
  judgeTorque,
  magnitude,
  moment,
  settleAfterNudge,
  stepTorsion,
  starsFor,
  torque,
  wrap,
  type LevelAxis,
  type LevelFade,
  type LevelMoment,
  type LevelStable,
  type LevelTorque,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);

describe('the physics of a dipole', () => {
  it('charges of 2.5 × 10⁻⁷ C a total of 30 cm apart have a moment of 7.5 × 10⁻⁸ C m (Exercise 1.9)', () => {
    expect(moment(250, 30)).toBeCloseTo(7.5e-8, 15);
  });
  it('a dipole of 4 × 10⁻⁹ C m at 30° to a field of 5 × 10⁴ N/C feels a torque of 10⁻⁴ N m (Exercise 1.10)', () => {
    expect(torque(4e-9, 5e4, 30)).toBeCloseTo(1e-4, 12);
  });
  it('the torque is largest at 90°, zero along or against the field, and negative past 180°', () => {
    expect(torque(1e-9, 1e4, 90)).toBeGreaterThan(torque(1e-9, 1e4, 45));
    expect(Math.abs(torque(1e-9, 1e4, 0))).toBeLessThan(1e-20);
    expect(Math.abs(torque(1e-9, 1e4, 180))).toBeLessThan(1e-20);
    expect(torque(1e-9, 1e4, 270)).toBeLessThan(0);
  });
  it('far away, the axis field is twice the equatorial field, and falls as 1/r³', () => {
    expect(axisField(1e-10, 30)).toBeCloseTo(2 * equatorField(1e-10, 30), 12);
    expect(axisField(1e-10, 60)).toBeCloseTo(axisField(1e-10, 30) / 8, 12);
  });
  it('the exact field agrees with the far-field formulas once r is much bigger than the dipole', () => {
    // q = 4 nC, separation 4 cm: p = 1.6e-10 C m; probe 30 cm away
    const p = moment(4, 4);
    const onAxis = dipoleField(4, 4, 0, { x: 30, y: 0 });
    const onEquator = dipoleField(4, 4, 0, { x: 0, y: 30 });
    expect(Math.abs(magnitude(onAxis) - axisField(p, 30)) / axisField(p, 30)).toBeLessThan(0.02);
    expect(Math.abs(magnitude(onEquator) - equatorField(p, 30)) / equatorField(p, 30)).toBeLessThan(0.02);
    expect(onAxis.x).toBeGreaterThan(0); // along p
    expect(onEquator.x).toBeLessThan(0); // against p
  });
  it('a dipole’s field is not zero even though its total charge is', () => {
    expect(magnitude(dipoleField(4, 4, 0, { x: 10, y: 0 }))).toBeGreaterThan(0);
  });
  it('a dipole’s field falls faster than a single charge’s: doubling r divides it by 8, not 4', () => {
    expect(dipoleRatio(2)).toBeCloseTo(1 / 8, 12);
    const near = magnitude(dipoleField(4, 2, 0, { x: 20, y: 0 }));
    const far = magnitude(dipoleField(4, 2, 0, { x: 40, y: 0 }));
    expect(near / far).toBeGreaterThan(7.5);
    expect(near / far).toBeLessThan(8.6);
  });
});

describe('turning in a field', () => {
  it('wrap brings angles into (−180, 180]', () => {
    expect(wrap(190)).toBe(-170);
    expect(wrap(-190)).toBe(170);
    expect(wrap(360)).toBe(0);
    expect(wrap(180)).toBe(180);
  });
  it('a dipole nudged from the field direction swings back and stays there (stable)', () => {
    expect(Math.abs(settleAfterNudge(0))).toBeLessThan(0.5);
  });
  it('a dipole nudged from the opposite direction flips round to the field direction (unstable)', () => {
    expect(Math.abs(settleAfterNudge(180))).toBeLessThan(0.5);
    // and on the way it really did leave 180°
    let s = { theta: 184, omega: 0 };
    let farthest = 0;
    for (let t = 0; t < 4; t += 0.01) {
      s = stepTorsion(s, 0.01);
      farthest = Math.max(farthest, Math.abs(wrap(s.theta - 180)));
    }
    expect(farthest).toBeGreaterThan(90);
  });
  it('from any other angle it turns towards the field', () => {
    for (const a of [30, 90, 150, -60, -120]) expect(Math.abs(settleAfterNudge(a))).toBeLessThan(0.5);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: the answer charge and separation give the target moment, with the target direction accepted', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelMoment;
      expect(moment(l.qAnswer, l.sepAnswer)).toBeCloseTo(l.targetP, 15);
      const r = judgeMoment(l, l.qAnswer, l.sepAnswer, l.targetAngle + 5, 'zero');
      expect(r.ok).toBe(true);
      expect(judgeMoment(l, l.qAnswer, l.sepAnswer, l.targetAngle + 30, 'zero').angleOk).toBe(false);
      expect(judgeMoment(l, l.qAnswer + 1, l.sepAnswer, l.targetAngle, 'zero').pOk).toBe(false);
      expect(judgeMoment(l, l.qAnswer, l.sepAnswer, l.targetAngle, 'q').totalOk).toBe(false);
    }
  });
  it('level 1: a different charge and separation can give the same moment, and is accepted', () => {
    const l = buildLevel(1, lcg(3)) as LevelMoment;
    expect(judgeMoment(l, l.qAnswer * 2, l.sepAnswer / 2, l.targetAngle, 'zero').pOk).toBe(true);
  });
  it('level 2: the brake torque that holds is p E sin θ, and a clear over- or under-estimate is told apart', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelTorque;
      expect(l.answer).toBeCloseTo(torque(l.p, l.e, l.theta), 18);
      expect(judgeTorque(l, l.answer).ok).toBe(true);
      expect(judgeTorque(l, l.answer * 1.03).ok).toBe(true);
      expect(judgeTorque(l, l.answer * 0.5).verdict).toBe('swings-in');
      expect(judgeTorque(l, l.answer * 1.6).verdict).toBe('dragged-out');
    }
  });
  it('level 2: forgetting sin θ (using p E) is a clear miss unless θ is 90°', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelTorque;
      if (l.theta === 90) continue;
      expect(judgeTorque(l, l.p * l.e).ok).toBe(false);
    }
  });
  it('level 3: only an orientation along the field is the stable one; against it flips; the rest are neither', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelStable;
      expect(judgeStable(l, l.fieldAngle).ok).toBe(true);
      expect(judgeStable(l, l.fieldAngle + 2).ok).toBe(true);
      const against = judgeStable(l, l.fieldAngle + 180);
      expect(against.ok).toBe(false);
      expect(against.kind).toBe('unstable');
      expect(judgeStable(l, l.fieldAngle + 90).kind).toBe('other');
    }
  });
  it('level 4: the answer is the far-field formula, the exact field agrees within 6%, and the direction follows the place', () => {
    const places = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelAxis;
      places.add(l.where);
      const a = l.sep / 2;
      expect(l.r / a).toBeGreaterThanOrEqual(10);
      const at = l.where === 'axis' ? { x: l.r, y: 0 } : { x: 0, y: l.r };
      const exact = magnitude(dipoleField(l.q, l.sep, 0, at));
      expect(Math.abs(exact - l.answer) / l.answer).toBeLessThan(0.06);
      expect(l.along).toBe(l.where === 'axis' ? 1 : -1);
      expect(judgeAxis(l, l.answer, l.along).ok).toBe(true);
      expect(judgeAxis(l, l.answer, (-l.along) as 1 | -1).directionOk).toBe(false);
    }
    expect(places.size).toBe(2);
  });
  it('level 4: mixing up the axis and equator formulas is a miss', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelAxis;
      const wrong = l.where === 'axis' ? l.answer / 2 : l.answer * 2;
      expect(judgeAxis(l, wrong, l.along).valueOk).toBe(false);
    }
  });
  it('level 5: the multiple k brings the field down to the fraction, and the dipole needs less distance than a single charge', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelFade;
      expect(dipoleRatio(l.kAnswer)).toBeCloseTo(l.fraction, 12);
      expect(judgeFade(l, l.kAnswer).ok).toBe(true);
      expect(judgeFade(l, l.kAnswer * 1.3).verdict).toBe('too-far');
      expect(judgeFade(l, l.kAnswer * 0.8).verdict).toBe('too-near');
      expect(l.kAnswer).toBeLessThan(Math.sqrt(1 / l.fraction)); // a single charge needs a bigger step
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
    const must = [/p = q × 2a/, /τ = p E sin θ/, /unstable equilibrium/, /E = (2kp|kp)\/r³/, /1\/r³/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(7.5e-8)).toBe('7.5 × 10⁻⁸');
    expect(fmt(100)).toBe('100');
  });
});
