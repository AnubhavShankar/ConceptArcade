import { describe, expect, it } from 'vitest';
import {
  acceleration,
  answerInUnit,
  buildLevel,
  equilibriumHeight,
  explainSolution,
  G,
  judge,
  K,
  mag,
  restOf,
  requiredCharge,
  requiredSign,
  settledHeight,
  sig3,
  simulate,
  starsFor,
  toCoulombs,
  type Level,
} from './logic';

const lcg = (seed: number) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

const rig = (over: Partial<Level> = {}): Level => ({
  mass: 1e-3,
  baseQ: 2e-6,
  target: 0.1,
  tubeMax: 0.2,
  tol: 0.03,
  freeReleases: 0,
  showHeight: false,
  needsSign: false,
  units: { mass: 'g', base: 'µC', length: 'cm', ball: 'nC' },
  story: '',
  ...over,
});

describe('the physics of the floating ball', () => {
  it('worked example: a 1 g ball over 2 µC floats at 10 cm when it carries 5.44 nC', () => {
    const q = requiredCharge(0.1, 2e-6, 1e-3);
    expect(q).toBeCloseTo((1e-3 * 9.8 * 0.01) / (9e9 * 2e-6), 20);
    expect(q / 1e-9).toBeCloseTo(5.4444, 3);
    expect(equilibriumHeight(q, 2e-6, 1e-3)).toBeCloseTo(0.1, 10); // and the inverse gives the height back
  });

  it('the electric force equals the weight at the equilibrium height (k q Q / h² = m g)', () => {
    const q = 7e-9;
    const h = equilibriumHeight(q, 2e-6, 1e-3)!;
    expect((K * q * 2e-6) / (h * h)).toBeCloseTo(1e-3 * G, 10);
    expect(acceleration(h, q, 2e-6, 1e-3)).toBeCloseTo(0, 8);
  });

  it('INVERSE SQUARE: doubling the charge raises the ball by √2 (about 1.41), not by 2', () => {
    const h1 = equilibriumHeight(4e-9, 2e-6, 1e-3)!;
    const h2 = equilibriumHeight(8e-9, 2e-6, 1e-3)!;
    expect(h2 / h1).toBeCloseTo(Math.SQRT2, 10);
    expect(h2 / h1).not.toBeCloseTo(2, 1);
  });

  it('height squared is proportional to the charge, to the base charge, and inversely to the mass', () => {
    const h = (q: number, Q: number, m: number) => equilibriumHeight(q, Q, m)! ** 2;
    expect(h(8e-9, 2e-6, 1e-3) / h(4e-9, 2e-6, 1e-3)).toBeCloseTo(2, 10);
    expect(h(4e-9, 4e-6, 1e-3) / h(4e-9, 2e-6, 1e-3)).toBeCloseTo(2, 10);
    expect(h(4e-9, 2e-6, 2e-3) / h(4e-9, 2e-6, 1e-3)).toBeCloseTo(0.5, 10);
  });

  it('above the hover height the net force is down; below it, up', () => {
    const q = 5e-9;
    const h = equilibriumHeight(q, 2e-6, 1e-3)!;
    expect(acceleration(h * 1.2, q, 2e-6, 1e-3)).toBeLessThan(0);
    expect(acceleration(h * 0.8, q, 2e-6, 1e-3)).toBeGreaterThan(0);
  });

  it('LIKE CHARGES repel and a ball can hover; UNLIKE charges attract and it cannot', () => {
    expect(equilibriumHeight(5e-9, 2e-6, 1e-3)).not.toBeNull();
    expect(equilibriumHeight(-5e-9, -2e-6, 1e-3)).not.toBeNull(); // both negative: still repels
    expect(equilibriumHeight(-5e-9, 2e-6, 1e-3)).toBeNull();
    expect(equilibriumHeight(5e-9, -2e-6, 1e-3)).toBeNull();
    expect(equilibriumHeight(0, 2e-6, 1e-3)).toBeNull();
    expect(acceleration(0.1, -5e-9, 2e-6, 1e-3)).toBeLessThan(-G); // attraction pulls harder than gravity alone
  });

  it('requiredSign: the same sign as the base', () => {
    expect(requiredSign(2e-6)).toBe(1);
    expect(requiredSign(-2e-6)).toBe(-1);
  });
});

describe('the dynamics really do settle where the formula says', () => {
  it('from the middle of the tube, within 1% of the equilibrium height after 4 s, for a range of rigs', () => {
    for (const q of [1e-9, 3e-9, 5.44e-9, 8e-9, 12e-9]) {
      const level = rig();
      const want = equilibriumHeight(q, level.baseQ, level.mass)!;
      if (want >= level.tubeMax) continue;
      const b = simulate(q, level, 4);
      expect(Math.abs(b.r - want) / want).toBeLessThan(0.01);
      expect(Math.abs(b.v)).toBeLessThan(0.01);
    }
  });
  it('also at the tiny scale (mg, mm, pC)', () => {
    const level = rig({ mass: 5e-5, baseQ: 2e-8, tubeMax: 0.012, units: { mass: 'mg', base: 'nC', length: 'mm', ball: 'pC' } });
    for (const mm of [3, 5, 8]) {
      const q = requiredCharge(mm / 1000, level.baseQ, level.mass);
      const b = simulate(q, level, 4);
      expect(Math.abs(b.r - mm / 1000) / (mm / 1000)).toBeLessThan(0.01);
    }
  });
  it('wherever it starts, it ends at the same height (the balance point is stable)', () => {
    const level = rig();
    const q = requiredCharge(0.1, level.baseQ, level.mass);
    for (const start of [0.02, 0.05, 0.15, 0.19]) expect(simulate(q, level, 5, start).r).toBeCloseTo(0.1, 2);
  });
  it('it bobs before settling: it overshoots when released from far above', () => {
    const level = rig();
    const q = requiredCharge(0.1, level.baseQ, level.mass);
    const b = { r: 0.18, v: 0 };
    let lowest = b.r;
    for (let t = 0; t < 2; t += 0.005) {
      for (let i = 0; i < 1; i++) {
        const a = acceleration(b.r, q, level.baseQ, level.mass) - 8 * b.v;
        b.v += a * 0.005;
        b.r += b.v * 0.005;
      }
      lowest = Math.min(lowest, b.r);
    }
    expect(lowest).toBeLessThan(0.1); // it fell past the balance point and came back
  });
  it('too much charge pushes it to the top of the tube', () => {
    const level = rig();
    const b = simulate(60e-9, level, 3);
    expect(b.r).toBe(level.tubeMax);
  });
  it('an opposite charge makes it fall and rest on the base', () => {
    const level = rig();
    const b = simulate(-5e-9, level, 3);
    expect(b.r).toBe(restOf(level.tubeMax));
  });
  it('never goes below the base or above the tube, and never produces NaN, even for extreme charges', () => {
    const level = rig();
    for (const q of [1e-12, 1e-9, 1e-7, 1e-5, -1e-5]) {
      const b = simulate(q, level, 2);
      expect(Number.isFinite(b.r)).toBe(true);
      expect(b.r).toBeGreaterThanOrEqual(restOf(level.tubeMax));
      expect(b.r).toBeLessThanOrEqual(level.tubeMax);
    }
  });
});

describe('judge', () => {
  it('accepts the exact charge and anything within the tolerance on height', () => {
    const level = rig();
    const q = requiredCharge(0.1, level.baseQ, level.mass);
    expect(judge(q, level).ok).toBe(true);
    // height goes as √q, so 3% on height is about 6% on charge
    expect(judge(q * 1.05, level).ok).toBe(true);
    expect(judge(q * 0.95, level).ok).toBe(true);
    expect(judge(q * 1.1, level).ok).toBe(false);
    expect(judge(q * 0.9, level).ok).toBe(false);
  });
  it('says which way it missed', () => {
    const level = rig();
    const q = requiredCharge(0.1, level.baseQ, level.mass);
    expect(judge(q * 1.5, level).direction).toBe('too-high');
    expect(judge(q * 0.5, level).direction).toBe('too-low');
    expect(judge(q, level).direction).toBe('on-target');
  });
  it('the wrong sign or zero charge never succeeds, and ends on the base', () => {
    const level = rig();
    const q = requiredCharge(0.1, level.baseQ, level.mass);
    const wrong = judge(-q, level);
    expect(wrong.ok).toBe(false);
    expect(wrong.how).toBe('on-base');
    expect(judge(0, level).ok).toBe(false);
  });
  it('a charge so large the ball hits the top of the tube is not a hover', () => {
    const level = rig();
    const v = judge(1e-6, level);
    expect(v.how).toBe('at-top');
    expect(v.ok).toBe(false);
  });
  it('the common mistake: treating height as proportional to charge (1/r instead of 1/r²) misses', () => {
    const level = rig();
    const q = requiredCharge(0.1, level.baseQ, level.mass);
    // a student who thinks h ∝ q finds q for 10 cm from a 5 cm reference and doubles it
    const reference = requiredCharge(0.05, level.baseQ, level.mass);
    expect(judge(reference * 2, level).ok).toBe(false); // the true answer is 4× the 5 cm charge
    expect(judge(reference * 4, level).ok).toBe(true);
    expect(q).toBeCloseTo(reference * 4, 20);
  });
  it('settledHeight reports how it came to rest', () => {
    const level = rig();
    expect(settledHeight(requiredCharge(0.1, level.baseQ, level.mass), level).how).toBe('hovering');
    expect(settledHeight(-1e-9, level).how).toBe('on-base');
    expect(settledHeight(1e-6, level).how).toBe('at-top');
  });
});

describe('buildLevel: incremental levels', () => {
  it('level 1: fixed rig, shows the height, three free releases, target inside the tube', () => {
    for (let s = 1; s < 40; s++) {
      const l = buildLevel(1, lcg(s));
      expect(l.showHeight).toBe(true);
      expect(l.freeReleases).toBe(3);
      expect(l.target).toBeLessThan(l.tubeMax);
      expect(l.needsSign).toBe(false);
      expect(l.baseQ).toBeGreaterThan(0);
    }
  });
  it('level 2: no readout, no free releases, a varied rig, answer in nC', () => {
    const rigs = new Set<string>();
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(2, lcg(s));
      expect(l.showHeight).toBe(false);
      expect(l.freeReleases).toBe(0);
      expect(l.units.ball).toBe('nC');
      rigs.add(`${l.mass}|${l.baseQ}|${l.target}`);
    }
    expect(rigs.size).toBeGreaterThan(10);
  });
  it('level 3: milligrams, millimetres and nanocoulombs, answer in picocoulombs', () => {
    for (let s = 1; s < 40; s++) {
      const l = buildLevel(3, lcg(s));
      expect(l.units).toEqual({ mass: 'mg', base: 'nC', length: 'mm', ball: 'pC' });
      expect(l.mass).toBeLessThan(1e-4);
      expect(l.target).toBeLessThan(0.01);
      expect(l.baseQ).toBeGreaterThan(0);
    }
  });
  it('level 4: the base can be negative, and the student must choose the sign', () => {
    const signs = new Set<number>();
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(4, lcg(s));
      expect(l.needsSign).toBe(true);
      signs.add(Math.sign(l.baseQ));
    }
    expect(signs).toEqual(new Set([1, -1]));
  });
  it('every level is solvable: the exact answer is accepted, within the tube, and at a sensible size to type', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 80; s++) {
        const l = buildLevel(level, lcg(s));
        const q = requiredCharge(l.target, l.baseQ, l.mass);
        expect(judge(q * Math.sign(l.baseQ), l).ok).toBe(true);
        expect(equilibriumHeight(q * Math.sign(l.baseQ), l.baseQ, l.mass)!).toBeLessThan(l.tubeMax);
        const typed = answerInUnit(l);
        expect(typed).toBeGreaterThan(0.1); // not a vanishing decimal
        expect(typed).toBeLessThan(1000);
      }
    }
  });
  it('the wrong sign on level 4 always fails', () => {
    for (let s = 1; s < 40; s++) {
      const l = buildLevel(4, lcg(s));
      const q = requiredCharge(l.target, l.baseQ, l.mass);
      expect(judge(-q * Math.sign(l.baseQ), l).ok).toBe(false);
    }
  });
  it('is deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      const distinct = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(buildLevel(level, lcg(i + 1)))));
      expect(distinct.size).toBeGreaterThan(2);
    }
  });
});

describe('stars and units', () => {
  it('free releases cost nothing, then each failure costs a star, minimum one', () => {
    expect(starsFor(0, 3)).toBe(3);
    expect(starsFor(3, 3)).toBe(3);
    expect(starsFor(4, 3)).toBe(2);
    expect(starsFor(9, 3)).toBe(1);
    expect(starsFor(1, 0)).toBe(2);
    expect(starsFor(2, 0)).toBe(1);
  });
  it('unit conversions', () => {
    expect(toCoulombs(5.44, 'nC')).toBeCloseTo(5.44e-9, 20);
    expect(toCoulombs(68, 'pC')).toBeCloseTo(6.8e-11, 22);
    expect(mag(1.5e-3, 'g')).toBe(1.5);
    expect(mag(-2e-6, 'µC')).toBe(2); // magnitudes
    expect(mag(5e-5, 'mg')).toBe(50);
  });
  it('sig3 formats three significant figures and scientific notation', () => {
    expect(sig3(0.001)).toBe('1 × 10⁻³');
    expect(sig3(5.4444e-9)).toBe('5.44 × 10⁻⁹');
    expect(sig3(9.8)).toBe('9.8');
    expect(sig3(0.08)).toBe('0.08');
  });
});

describe('the explanation after a win', () => {
  it('shows the balance, the rearrangement, the SI conversions and the numbers', () => {
    const l = rig({ mass: 1.5e-3, baseQ: 3e-6, target: 0.08 });
    const text = explainSolution(l).join('\n');
    expect(text).toMatch(/k q Q \/ h² = m g/);
    expect(text).toMatch(/q = m g h² \/ \(k Q\)/);
    expect(text).toContain('1.5 g = 1.5 × 10⁻³ kg');
    expect(text).toContain('3 µC = 3 × 10⁻⁶ C');
    expect(text).toContain('8 cm = 0.08 m');
    const q = requiredCharge(0.08, 3e-6, 1.5e-3);
    expect(text).toContain(`${sig3(q / 1e-9)} nC`);
  });
  it('level 4 explains why the sign must match the base', () => {
    for (const sgn of [1, -1]) {
      const l = rig({ baseQ: sgn * 2e-8, needsSign: true, mass: 5e-5, tubeMax: 0.012, target: 0.005, units: { mass: 'mg', base: 'nC', length: 'mm', ball: 'pC' } });
      const text = explainSolution(l).join(' ');
      expect(text).toContain(sgn > 0 ? 'positive' : 'negative');
      expect(text).toMatch(/like charges repel/);
    }
  });
  it('the ball can rest below every target, on every level (the resting height scales with the tube)', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 60; s++) {
        const l = buildLevel(level, lcg(s));
        expect(restOf(l.tubeMax)).toBeLessThan(l.target);
      }
    }
  });
  it('the printed answer really is what the rules accept, on every level', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s < 30; s++) {
        const l = buildLevel(level, lcg(s));
        const typed = answerInUnit(l) * Math.sign(l.baseQ);
        expect(judge(toCoulombs(typed, l.units.ball), l).ok).toBe(true);
      }
    }
  });
});
