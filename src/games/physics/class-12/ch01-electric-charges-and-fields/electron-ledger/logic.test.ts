import { describe, expect, it } from 'vitest';
import { relationOf, signNeeded, buildLevel, chargeOf, E, explainSolution, impliedBy, judgeCount, judgeSign, nanoCoulombs, parRubs, rankCorrect, rub, sci, SERIES, signOf, starsFor, strokesFor } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const mat = (i: number) => ({ name: SERIES[i], rank: i });

describe('rubbing', () => {
  it('electrons leave the lower-ranked material and arrive on the higher-ranked one', () => {
    const r = rub(mat(1), mat(3), 4, 1e9);
    expect(r.gainA).toBe(-4e9);
    expect(r.gainB).toBe(4e9);
  });
  it('is symmetric: the order you name the two materials in does not matter', () => {
    const a = rub(mat(1), mat(3), 2, 5e9);
    const b = rub(mat(3), mat(1), 2, 5e9);
    expect(a.gainA).toBe(b.gainB);
    expect(a.gainB).toBe(b.gainA);
  });
  it('conserves charge: gains cancel exactly', () => {
    for (const strokes of [1, 7, 30]) {
      const r = rub(mat(0), mat(5), strokes, 2.5e9);
      expect(r.gainA + r.gainB).toBe(0);
    }
  });
});

describe('charge from electrons', () => {
  it('losing electrons is positive, gaining is negative, none is neutral', () => {
    expect(signOf(-5)).toBe(1);
    expect(signOf(5)).toBe(-1);
    expect(signOf(0)).toBe(0);
  });
  it('q = N e, in nanocoulombs', () => {
    expect(chargeOf(-1)).toBeCloseTo(E);
    expect(nanoCoulombs(5e9)).toBe(0.8);
    expect(nanoCoulombs(-3e10)).toBe(4.8);
    expect(nanoCoulombs(1e10)).toBe(1.6);
  });
  it('writes numbers in scientific notation', () => {
    expect(sci(3e10)).toBe('3 × 10¹⁰');
    expect(sci(2.5e9)).toBe('2.5 × 10⁹');
  });
});

describe('level 1 scenarios', () => {
  it('like charges repel and unlike attract', () => {
    expect(relationOf(1, 1)).toBe('repel');
    expect(relationOf(-1, -1)).toBe('repel');
    expect(relationOf(1, -1)).toBe('attract');
  });
  it('the sign needed is the other body\'s sign to repel and the opposite to attract', () => {
    expect(signNeeded(-1, 'repel')).toBe(-1);
    expect(signNeeded(-1, 'attract')).toBe(1);
    expect(signNeeded(1, 'attract')).toBe(-1);
  });
  it('every generated order is consistent: the wanted sign really produces the ordered effect', () => {
    for (let s = 1; s < 80; s++) {
      const l = buildLevel(1, lcg(s * 7919 + 3));
      expect(relationOf(l.wantSign, l.scenario!.sign)).toBe(l.scenario!.relation);
    }
  });
  it('the description never names the sign, only what happened to the electrons', () => {
    for (let s = 1; s < 40; s++) {
      const l = buildLevel(1, lcg(s * 31 + 1));
      expect(l.scenario!.desc).toMatch(/gained electrons|lost electrons/);
      expect(l.scenario!.desc).not.toMatch(/positive|negative/);
    }
  });
  it('all four combinations of sign and relation turn up', () => {
    const seen = new Set<string>();
    for (let s = 1; s < 120; s++) {
      const l = buildLevel(1, lcg(s * 7919 + 3));
      seen.add(l.scenario!.sign + l.scenario!.relation);
    }
    expect(seen.size).toBe(4);
  });
});

describe('judging deliveries', () => {
  it('pump: the sign must match and the body must be clearly charged', () => {
    expect(judgeSign(-6e9, 1, 6e9)).toBe('ok');
    expect(judgeSign(-2e9, 1, 6e9)).toBe('too-little');
    expect(judgeSign(6e9, 1, 6e9)).toBe('wrong-sign');
    expect(judgeSign(0, 1, 6e9)).toBe('neutral');
  });
  it('count: exact, with too little and too much told apart', () => {
    expect(judgeCount(-3e10, 1, 3e10)).toBe('ok');
    expect(judgeCount(-2e10, 1, 3e10)).toBe('too-little');
    expect(judgeCount(-4e10, 1, 3e10)).toBe('too-much');
    expect(judgeCount(3e10, 1, 3e10)).toBe('wrong-sign');
  });
  it('rank: the whole order must match', () => {
    expect(rankCorrect(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
    expect(rankCorrect(['b', 'a', 'c'], ['a', 'b', 'c'])).toBe(false);
    expect(rankCorrect(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
  });
});

describe('levels', () => {
  it('are deterministic for a seed and vary between seeds', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      const distinct = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(buildLevel(level, lcg(i + 1)))));
      expect(distinct.size).toBeGreaterThan(2);
    }
  });
  it('level 1 offers both signs across puzzles', () => {
    const signs = new Set(Array.from({ length: 30 }, (_, i) => buildLevel(1, lcg(i * 7919 + 13)).wantSign));
    expect(signs.size).toBe(2);
  });
  it('level 2 benches have three distinct materials, and the ordered sign is always achievable', () => {
    for (let s = 1; s < 80; s++) {
      const l = buildLevel(2, lcg(s));
      expect(new Set(l.bench.map((m) => m.name)).size).toBe(3);
      const pairs = [[0, 1], [0, 2], [1, 2]].map(([i, j]) => rub(l.bench[i], l.bench[j], 1, l.perStroke));
      const signs = pairs.flatMap((p) => [signOf(p.gainA), signOf(p.gainB)]);
      expect(signs).toContain(l.wantSign);
    }
  });
  it('level 3 orders a whole number of strokes, and the ship material really ends with the ordered sign', () => {
    for (let s = 1; s < 80; s++) {
      const l = buildLevel(3, lcg(s));
      const strokes = strokesFor(l.targetElectrons!, l.perStroke);
      expect(Number.isInteger(strokes)).toBe(true);
      expect(strokes).toBeGreaterThanOrEqual(3);
      expect(strokes).toBeLessThanOrEqual(12);
      const r = rub(l.ship!, l.partner!, strokes, l.perStroke);
      expect(judgeCount(r.gainA, l.wantSign, l.targetElectrons!)).toBe('ok');
      expect(r.gainB).toBe(-r.gainA);
    }
  });
  it('level 3 asks for a charge a student can read off at 2 decimals', () => {
    for (let s = 1; s < 80; s++) {
      const l = buildLevel(3, lcg(s));
      const q = nanoCoulombs(l.targetElectrons!);
      expect(Math.abs(q * 100 - Math.round(q * 100))).toBeLessThan(1e-6);
    }
  });
  it('level 4 has four distinct pads whose true order is consistent with rubbing', () => {
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(4, lcg(s));
      expect(new Set(l.truth).size).toBe(4);
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++) {
          const r = rub(l.bench.find((m) => m.name === l.truth![i])!, l.bench.find((m) => m.name === l.truth![j])!, 1, l.perStroke);
          expect(r.gainA).toBeLessThan(0); // the earlier pad gives electrons away
        }
    }
  });
  it('level 4 can always be finished inside the free rubs', () => {
    expect(buildLevel(4, lcg(1)).freeRubs).toBeGreaterThanOrEqual(parRubs(4));
  });
});

describe('transitive reasoning', () => {
  it('knows when two rubs already settle a third pair', () => {
    const f = [{ loser: 'A', gainer: 'B' }, { loser: 'B', gainer: 'C' }];
    expect(impliedBy(f, 'A', 'C')).toEqual({ loser: 'A', gainer: 'C' });
    expect(impliedBy(f, 'C', 'A')).toEqual({ loser: 'A', gainer: 'C' });
    expect(impliedBy(f, 'A', 'D')).toBeNull();
  });
  it('terminates even on contradictory data', () => {
    const f = [{ loser: 'A', gainer: 'B' }, { loser: 'B', gainer: 'A' }];
    expect(() => impliedBy(f, 'A', 'C')).not.toThrow();
  });
});

describe('stars and explanations', () => {
  it('misses and extra rubs cost stars, never below one', () => {
    expect(starsFor(0)).toBe(3);
    expect(starsFor(1)).toBe(2);
    expect(starsFor(0, 2)).toBe(2);
    expect(starsFor(5, 9)).toBe(1);
  });
  it('level 3 explanation shows q = N e and the strokes', () => {
    const l = buildLevel(3, lcg(2));
    const text = explainSolution(l).join('\n');
    expect(text).toMatch(/N = q \/ e/);
    expect(text).toMatch(/strokes = /);
  });
  it('every level explains itself', () => {
    for (const level of [1, 2, 3, 4]) expect(explainSolution(buildLevel(level, lcg(3))).length).toBeGreaterThan(1);
  });
});
