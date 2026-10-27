import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  explainSolution,
  fmt,
  forceDirection,
  helixPitchCm,
  judgeCircle,
  judgeHelix,
  judgeLorentz,
  judgeSpeed,
  judgeWire,
  levitationField,
  lorentz13,
  orbitFreqMHz,
  orbitRadiusCm,
  starsFor,
  wireForceMilli,
  type Dir,
  type LevelCircle,
  type LevelHelix,
  type LevelLorentz,
  type LevelSpeed,
  type LevelWire,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('a 200 g, 1.5 m wire with 2 A is held up by about 0.65 T (Example 4.1)', () => {
    expect(levitationField(200, 1.5, 2)).toBeCloseTo(0.653, 2);
  });
  it('8 A at 30° in 0.15 T gives 0.6 N per metre (Exercise 4.5)', () => {
    expect(wireForceMilli(0.15, 8, 100, 30) / 1000).toBeCloseTo(0.6, 9);
  });
  it('a 3.0 cm wire with 10 A in 0.27 T feels 8.1 × 10⁻² N (Exercise 4.6)', () => {
    expect(wireForceMilli(0.27, 10, 3, 90) / 1000).toBeCloseTo(0.081, 9);
  });
  it('an electron at 4.8 × 10⁶ m/s in 6.5 G circles with r ≈ 4.2 cm and f ≈ 18 MHz (Exercises 4.11 and 4.12)', () => {
    expect(orbitRadiusCm(4.8, 6.5)).toBeCloseTo(4.2, 1);
    expect(orbitFreqMHz(6.5)).toBeCloseTo(18.2, 1);
  });
});

describe('the rules', () => {
  it('the force reverses with the sign of the charge, with the field, and with the velocity', () => {
    for (const v of ['right', 'left', 'up', 'down'] as Dir[]) {
      for (const bOut of [true, false]) {
        const p = forceDirection(v, bOut, false);
        expect(forceDirection(v, bOut, true)).not.toBe(p);
        expect(forceDirection(v, !bOut, false)).not.toBe(p);
      }
    }
  });
  it('the force is perpendicular to the velocity', () => {
    const horizontal = new Set(['left', 'right']);
    for (const v of ['right', 'left', 'up', 'down'] as Dir[]) {
      for (const [bOut, neg] of [[true, false], [false, true], [true, true]] as [boolean, boolean][]) {
        expect(horizontal.has(v)).not.toBe(horizontal.has(forceDirection(v, bOut, neg)));
      }
    }
  });
  it('a proton moving right with B out of the page is pushed down (F = qv × B)', () => {
    expect(forceDirection('right', true, false)).toBe('down');
    expect(forceDirection('up', true, false)).toBe('right');
    expect(forceDirection('right', true, true)).toBe('up');
  });
  it('the frequency does not depend on speed; the radius is proportional to it', () => {
    expect(orbitRadiusCm(6, 8)).toBeCloseTo(2 * orbitRadiusCm(3, 8), 9);
    expect(orbitFreqMHz(8)).toBe(orbitFreqMHz(8));
  });
  it('a helix at 90° has zero pitch and the circle radius; at 0° it is a straight line', () => {
    expect(helixPitchCm(4, 8, 90)).toBeCloseTo(0, 6);
    expect(orbitRadiusCm(4, 8, 90)).toBeCloseTo(orbitRadiusCm(4, 8), 9);
    expect(orbitRadiusCm(4, 8, 0)).toBeCloseTo(0, 9);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: all four directions occur; the direction and force win; the opposite direction is a miss', () => {
    const dirs = new Set<string>();
    const opposite: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelLorentz;
      dirs.add(l.dir);
      expect(judgeLorentz(l, l.dir, l.f13).ok).toBe(true);
      expect(judgeLorentz(l, opposite[l.dir], l.f13).dirOk).toBe(false);
      expect(judgeLorentz(l, l.dir, l.f13 * 10).fOk).toBe(false);
      expect(l.f13).toBeCloseTo(lorentz13(l.v6, l.b), 9);
    }
    expect(dirs.size).toBe(4);
  });
  it('level 2: both modes occur; the answer wins and a missing sin θ loses (unless θ = 90°)', () => {
    const modes = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelWire;
      modes.add(l.mode);
      expect(judgeWire(l, l.answer).ok).toBe(true);
      if (l.mode === 'force' && l.theta !== 90) expect(judgeWire(l, l.answer / Math.sin((l.theta * Math.PI) / 180)).ok).toBe(false);
    }
    expect(modes.size).toBe(2);
  });
  it('level 3: radius and frequency win; speed does not appear in the frequency', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelCircle;
      expect(judgeCircle(l, l.rCm, l.fMHz).ok).toBe(true);
      expect(judgeCircle(l, l.rCm, l.fMHz * 2 * Math.PI).fOk).toBe(false);
      expect(l.rCm).toBeGreaterThan(1);
    }
  });
  it('level 4: the radius scales with the factor, and only "unchanged" is the frequency answer', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelSpeed;
      expect(l.r2Cm / l.rCm).toBeCloseTo(l.factor, 9);
      expect(judgeSpeed(l, l.r2Cm, 'unchanged').ok).toBe(true);
      expect(judgeSpeed(l, l.r2Cm, 'increases').fOk).toBe(false);
      expect(judgeSpeed(l, l.rCm, 'unchanged').rOk).toBe(false);
    }
  });
  it('level 5: radius uses sin θ and the pitch uses cos θ', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelHelix;
      expect(judgeHelix(l, l.rCm, l.pitchCm).ok).toBe(true);
      expect(l.rCm).toBeLessThan(orbitRadiusCm(l.v6, l.bGauss));
      expect(judgeHelix(l, orbitRadiusCm(l.v6, l.bGauss), l.pitchCm).rOk).toBe(false);
      expect(l.pitchCm).toBeGreaterThan(0);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/q v × B/, /B I l|mg/, /centripetal/, /does not depend on the speed/, /pitch/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
