import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  configEnergy,
  energy,
  explainSolution,
  fmt,
  inEquilibrium,
  judgeConfigs,
  judgeEnergy,
  judgeSolenoid,
  judgeTorque,
  judgeWork,
  starsFor,
  torque,
  workToTurn,
  type Config,
  type LevelConfigs,
  type LevelEnergy,
  type LevelSolenoid,
  type LevelTorque,
  type LevelWork,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook', () => {
  it('a torque of 4.5 × 10⁻² J at 30° in 0.25 T means m = 0.36 J/T (Exercise 5.1)', () => {
    expect(0.045 / (0.25 * Math.sin(Math.PI / 6))).toBeCloseTo(0.36, 9);
  });
  it('m = 0.32 J/T in 0.15 T has energy ∓0.048 J in the stable and unstable orientations (Exercise 5.2)', () => {
    expect(energy(0.32, 0.15, 0)).toBeCloseTo(-0.048, 9);
    expect(energy(0.32, 0.15, 180)).toBeCloseTo(0.048, 9);
  });
  it('1.5 J/T in 0.22 T needs 0.33 J to turn to 90° and 0.66 J to turn to 180° (Exercise 5.5)', () => {
    expect(workToTurn(1.5, 0.22, 0, 90)).toBeCloseTo(0.33, 9);
    expect(workToTurn(1.5, 0.22, 0, 180)).toBeCloseTo(0.66, 9);
  });
  it('0.6 J/T in 0.25 T at 30° gives a torque of 0.075 N m (Exercise 5.4)', () => {
    expect(torque(0.6, 0.25, 30)).toBeCloseTo(0.075, 9);
  });
  it('1.28 J/T in 0.075 T at 30° gives 0.048 N m (Exercise 5.6)', () => {
    expect(torque(1.28, 0.075, 30)).toBeCloseTo(0.048, 9);
  });
});

describe('the rules', () => {
  it('the torque is zero where the energy has its minimum or its maximum', () => {
    expect(torque(1, 1, 0)).toBeCloseTo(0, 12);
    expect(torque(1, 1, 180)).toBeCloseTo(0, 12);
    expect(energy(1, 1, 0)).toBeLessThan(energy(1, 1, 90));
    expect(energy(1, 1, 180)).toBeGreaterThan(energy(1, 1, 90));
  });
  it('configurations: the axial parallel pair is lowest, axial antiparallel is highest, perpendicular is not in equilibrium', () => {
    const c = (where: Config['where'], orient: Config['orient']): Config => ({ letter: 'X', where, orient });
    expect(configEnergy(c('axis', 'parallel'))).toBe(-2);
    expect(configEnergy(c('axis', 'antiparallel'))).toBe(2);
    expect(configEnergy(c('equator', 'antiparallel'))).toBe(-1);
    expect(configEnergy(c('equator', 'parallel'))).toBe(1);
    expect(inEquilibrium(c('axis', 'perpendicular'))).toBe(false);
    expect(inEquilibrium(c('equator', 'parallel'))).toBe(true);
  });
});

describe('levels', () => {
  it('are deterministic for a seed, and different seeds give different puzzles', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('level 1: both modes occur; the answer wins and the missing sine loses', () => {
    const modes = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelTorque;
      modes.add(l.mode);
      expect(judgeTorque(l, l.answer).ok).toBe(true);
      if (l.mode === 'torque') expect(judgeTorque(l, l.m * l.b).ok).toBe(false);
      else expect(judgeTorque(l, l.tauShown / l.b).ok).toBe(false);
    }
    expect(modes.size).toBe(2);
  });
  it('level 2: the stable energy is negative, the unstable positive, and swapping the signs loses', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelEnergy;
      expect(l.stable).toBeLessThan(0);
      expect(l.unstable).toBeGreaterThan(0);
      expect(judgeEnergy(l, l.stable, l.unstable).ok).toBe(true);
      expect(judgeEnergy(l, -l.stable, -l.unstable).ok).toBe(false);
    }
  });
  it('level 3: mB and 2mB with zero torque at 180°; swapping the works loses', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelWork;
      expect(l.w180).toBeCloseTo(2 * l.w90, 9);
      expect(judgeWork(l, l.w90, l.w180, 0).ok).toBe(true);
      expect(judgeWork(l, l.w180, l.w90, 0).ok).toBe(false);
      expect(judgeWork(l, l.w90, l.w180, 0.1).tOk).toBe(false);
    }
  });
  it('level 4: moment, torque and zero force win; a force of mB loses', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelSolenoid;
      expect(judgeSolenoid(l, l.m, l.torque, 0).ok).toBe(true);
      expect(judgeSolenoid(l, l.m, l.torque, l.m * l.b).fOk).toBe(false);
      expect(judgeSolenoid(l, l.m, l.m * l.b, 0).tOk).toBe(false);
    }
  });
  it('level 5: one lowest, one highest, two perpendicular; the right picks win', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelConfigs;
      expect(l.configs.length).toBe(6);
      expect(new Set(l.configs.map((c) => c.letter)).size).toBe(6);
      const perp = l.configs.filter((c) => !inEquilibrium(c)).map((c) => c.letter);
      expect(perp.length).toBe(2);
      const lowest = l.configs.find((c) => c.letter === l.lowest)!;
      const highest = l.configs.find((c) => c.letter === l.highest)!;
      expect(lowest).toMatchObject({ where: 'axis', orient: 'parallel' });
      expect(highest).toMatchObject({ where: 'axis', orient: 'antiparallel' });
      expect(judgeConfigs(l, l.lowest, l.highest, perp[0]).ok).toBe(true);
      expect(judgeConfigs(l, l.lowest, l.highest, perp[1]).ok).toBe(true);
      expect(judgeConfigs(l, l.highest, l.lowest, perp[0]).ok).toBe(false);
      expect(judgeConfigs(l, l.lowest, l.highest, l.lowest).eOk).toBe(false);
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(3, 1)).toBe(1);
  });
  it('every level explains the answer with the physics', () => {
    const must = [/vector product/, /−mB cos θ|U = −mB/, /external torque|rise in potential energy/, /uniform field/, /equilibrium/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(15)).toBe('15');
  });
});
