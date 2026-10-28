import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  conserves,
  distanceFor,
  explainSolution,
  fmt,
  forceN,
  gravityRatio,
  judgeBasic,
  judgeConserve,
  judgeCoulomb,
  judgeGravity,
  judgeMass,
  M_ELECTRON,
  M_PROTON,
  REACTIONS,
  starsFor,
  totalIn,
  totalOut,
  type LevelBasic,
  type LevelConserve,
  type LevelCoulomb,
  type LevelGravity,
  type LevelMass,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);

describe('the numbers from the textbook exercises', () => {
  it('charges of 2 × 10⁻⁷ C and 3 × 10⁻⁷ C, 30 cm apart, attract or repel with 6 × 10⁻³ N (Exercise 1.1)', () => {
    expect(forceN(0.2, 0.3, 30)).toBeCloseTo(6e-3, 9);
  });
  it('the distance for a given force is the inverse of the force for a given distance (Exercise 1.2)', () => {
    expect(distanceFor(0.4, 0.8, forceN(0.4, 0.8, 25))).toBeCloseTo(25, 9);
  });
  it('the electric force between two protons is about 10³⁶ times the gravitational force (Exercise 1.3, Example 1.3)', () => {
    expect(Math.log10(gravityRatio(M_PROTON, M_PROTON))).toBeCloseTo(36.1, 0);
    expect(Math.log10(gravityRatio(M_ELECTRON, M_PROTON))).toBeCloseTo(39.4, 0);
  });
  it('1 coulomb needs about 200 years at 10⁹ electrons a second (Example 1.1)', () => {
    const l = (() => {
      for (const s of seeds) {
        const c = buildLevel(3, lcg(s)) as LevelCoulomb;
        if (c.rate === 1e9) return c;
      }
      throw new Error('no case');
    })();
    expect(l.years).toBeCloseTo(198, 0);
  });
  it('3 × 10⁻⁷ C is 1.9 × 10¹² electrons of mass 1.7 × 10⁻¹⁸ kg (Exercise 1.11)', () => {
    const n = 3e-7 / 1.6e-19;
    expect(n).toBeCloseTo(1.875e12, -9);
    expect(n * M_ELECTRON).toBeCloseTo(1.708e-18, 20);
  });
});

describe('level 1: force and distance', () => {
  it('both modes appear, the answer matches the formula, and Newton’s third law is the right answer to the third question', () => {
    const modes = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelBasic;
      modes.add(l.mode);
      expect(l.f).toBeCloseTo(forceN(l.q1, l.q2, l.r), 12);
      const answer = l.mode === 'force' ? l.f : l.r;
      expect(judgeBasic(l, answer, 'equal-opposite').ok).toBe(true);
      expect(judgeBasic(l, answer * 1.1, 'equal-opposite').valueOk).toBe(false);
      expect(judgeBasic(l, answer, 'bigger-on-small').thirdOk).toBe(false);
      expect(judgeBasic(l, answer, 'zero').thirdOk).toBe(false);
    }
    expect(modes.size).toBe(2);
  });
  it('forgetting to convert µC or cm gives a clear miss', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelBasic;
      if (l.mode === 'force') expect(judgeBasic(l, (9e9 * l.q1 * l.q2) / (l.r * l.r), 'equal-opposite').valueOk).toBe(false);
    }
  });
});

describe('level 2: electric against gravity', () => {
  it('all three pairs appear, the ratio is enormous, and a ratio within 40% is accepted', () => {
    const pairs = new Set<string>();
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelGravity;
      pairs.add(l.pair);
      expect(l.ratio).toBeGreaterThan(1e35);
      expect(judgeGravity(l, l.ratio * 1.3, 'cancel').ok).toBe(true);
      expect(judgeGravity(l, l.ratio * 100, 'cancel').valueOk).toBe(false);
      expect(judgeGravity(l, l.ratio / 1000, 'cancel').valueOk).toBe(false);
    }
    expect(pairs.size).toBe(3);
  });
  it('the reason must be the cancelling of electric forces', () => {
    const l = buildLevel(2, lcg(3)) as LevelGravity;
    expect(judgeGravity(l, l.ratio, 'stronger').whyOk).toBe(false);
    expect(judgeGravity(l, l.ratio, 'uncharged').whyOk).toBe(false);
  });
  it('zero or negative input never counts', () => {
    const l = buildLevel(2, lcg(3)) as LevelGravity;
    expect(judgeGravity(l, 0, 'cancel').valueOk).toBe(false);
    expect(judgeGravity(l, -5, 'cancel').valueOk).toBe(false);
  });
});

describe('level 3: the size of a coulomb', () => {
  it('the electron count and the years follow from q/e and 1/(rate e)', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelCoulomb;
      expect(l.electrons).toBeCloseTo((l.micro * 1e-6) / 1.6e-19, -6);
      expect(l.years).toBeCloseTo(1 / (l.rate * 1.6e-19) / (365 * 24 * 3600), 6);
      expect(judgeCoulomb(l, l.electrons, l.years, 'tiny-steps').ok).toBe(true);
      expect(judgeCoulomb(l, l.electrons, l.years, 'not-quantised').scaleOk).toBe(false);
      expect(judgeCoulomb(l, l.electrons * 1.1, l.years, 'tiny-steps').nOk).toBe(false);
    }
  });
  it('using seconds instead of years is a miss', () => {
    const l = buildLevel(3, lcg(3)) as LevelCoulomb;
    expect(judgeCoulomb(l, l.electrons, l.years * 365 * 24 * 3600, 'tiny-steps').yearsOk).toBe(false);
  });
});

describe('level 4: the mass of charging', () => {
  it('negative bodies gain electrons from the partner and positive ones lose them to it', () => {
    const signs = new Set<boolean>();
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelMass;
      signs.add(l.negative);
      expect(l.from).toBe(l.negative ? 'partner' : 'body');
      expect(l.massKg).toBeCloseTo(l.electrons * 9.11e-31, 25);
      expect(l.massKg).toBeLessThan(1e-17);
      expect(judgeMass(l, l.electrons, l.massKg, l.from).ok).toBe(true);
      expect(judgeMass(l, l.electrons, l.massKg, l.from === 'body' ? 'partner' : 'body').fromOk).toBe(false);
      expect(judgeMass(l, l.electrons, l.massKg * 2, l.from).massOk).toBe(false);
    }
    expect(signs.size).toBe(2);
  });
  it('using the proton mass is a clear miss', () => {
    const l = buildLevel(4, lcg(3)) as LevelMass;
    expect(judgeMass(l, l.electrons, l.electrons * M_PROTON, l.from).massOk).toBe(false);
  });
});

describe('level 5: conservation of charge', () => {
  it('every reaction labelled as allowed conserves charge, and every bad one breaks it', () => {
    for (const r of REACTIONS) expect(conserves(r)).toBe(!r.id.startsWith('bad'));
    for (const r of REACTIONS) expect(totalIn(r) === totalOut(r)).toBe(conserves(r));
  });
  it('each level has three good and three bad collisions, in a random order', () => {
    for (const s of seeds) {
      const l = buildLevel(5, lcg(s)) as LevelConserve;
      expect(l.reactions).toHaveLength(6);
      expect(new Set(l.reactions.map((r) => r.id)).size).toBe(6);
      expect(l.reactions.filter((r) => !conserves(r)).map((r) => r.id).sort()).toEqual([...l.bad].sort());
      expect(l.bad).toHaveLength(3);
    }
    expect(new Set(seeds.map((s) => (buildLevel(5, lcg(s)) as LevelConserve).reactions.map((r) => r.id).join())).size).toBeGreaterThan(10);
  });
  it('flagging exactly the bad ones wins, and misses and false alarms are counted', () => {
    const l = buildLevel(5, lcg(3)) as LevelConserve;
    expect(judgeConserve(l, l.bad).ok).toBe(true);
    expect(judgeConserve(l, []).missed).toBe(3);
    const good = l.reactions.find((r) => conserves(r))!;
    const r = judgeConserve(l, [...l.bad.slice(1), good.id]);
    expect(r.missed).toBe(1);
    expect(r.falseAlarms).toBe(1);
    expect(r.ok).toBe(false);
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(9, 1)).toBe(1);
  });
  it('levels are deterministic for a seed and differ between seeds', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThanOrEqual(level === 2 ? 3 : 4); // level 2 is one of three particle pairs
    }
  });
  it('every level explains the answer with the physics', () => {
    const must = [/Newton’s third law/, /cancel/, /A coulomb is a very large unit/, /negligible/, /total charge before equals/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(1.2e36)).toBe('1.2 × 10³⁶');
  });
});
