import { describe, expect, it } from 'vitest';
import {
  buildFind,
  buildLevel,
  buildRank,
  buildUniform,
  dist,
  explainSolution,
  fieldAt,
  fmt,
  judgeAngle,
  judgeRank,
  judgeUniform,
  needed,
  potentialAt,
  starsFor,
  strength,
  strengthsAt,
  tapMatches,
  tapStars,
  type LevelFind,
  type LevelRank,
  type LevelUniform,
  type Src,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const pair: Src[] = [{ q: 2, at: { x: -3, y: 0 } }, { q: -2, at: { x: 3, y: 0 } }];

describe('equipotentials of two equal and opposite charges (Exercise 2.3)', () => {
  it('the potential is zero everywhere on the plane halfway between them', () => {
    for (const y of [-9, -3, 0, 2, 7]) expect(potentialAt({ x: 0, y }, pair)).toBeCloseTo(0, 9);
    expect(potentialAt({ x: 1, y: 3 }, pair)).not.toBeCloseTo(0, 0);
  });
  it('the field there is perpendicular to that plane (along the line joining the charges)', () => {
    for (const y of [-6, 0, 4, 9]) {
      const e = fieldAt({ x: 0, y }, pair);
      expect(Math.abs(e.y)).toBeLessThan(1e-9);
      expect(e.x).toBeGreaterThan(0); // from the positive charge on the left towards the negative one on the right
    }
  });
});

describe('level 1: find the equipotential', () => {
  it('is deterministic, and the bisector case and the other cases both turn up', () => {
    expect(buildFind(lcg(5))).toEqual(buildFind(lcg(5)));
    const flags = new Set(seeds.map((s) => buildFind(lcg(s)).bisector));
    expect(flags.size).toBe(2);
  });
  it('the target is the potential at the mark, the mark is away from the charges, and the potential is not extreme', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelFind;
      expect(potentialAt(l.mark, l.sources)).toBeCloseTo(l.target, 9);
      expect(l.sources.every((c) => dist(c.at, l.mark) >= 3.5)).toBe(true);
      if (l.bisector) expect(Math.abs(l.target)).toBeLessThan(1e-9);
      else expect(Math.abs(l.target)).toBeGreaterThan(80);
    }
  });
  it('a tap on the same potential matches; one on a different potential, on the mark, or on a found point does not', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelFind;
      expect(tapMatches(l, l.mark, [])).toBe(false); // the mark itself does not count
      const other = { x: l.mark.x + 0.01, y: l.mark.y + 0.01 };
      expect(tapMatches(l, other, [])).toBe(false); // too close to the mark
      if (l.bisector) {
        expect(tapMatches(l, { x: 0, y: l.mark.y > 0 ? -2 : 2 }, [])).toBe(true);
        expect(tapMatches(l, { x: 0, y: 6.4 }, [{ x: 0, y: 6 }])).toBe(false); // too close to one already found
        expect(tapMatches(l, { x: 5, y: 2 }, [])).toBe(false);
      }
    }
  });
  it('every non-bisector puzzle has plenty of matching points (many taps can succeed)', () => {
    for (const s of seeds.slice(0, 40)) {
      const l = buildFind(lcg(s));
      let hits = 0;
      for (let x = -20; x <= 20; x += 1) for (let y = -10; y <= 10; y += 1) if (tapMatches(l, { x, y }, [])) hits++;
      expect(hits).toBeGreaterThanOrEqual(needed);
    }
  });
  it('the field meets the surface at right angles', () => {
    expect(judgeAngle('perpendicular').ok).toBe(true);
    expect(judgeAngle('along').ok).toBe(false);
    expect(judgeAngle('any').ok).toBe(false);
  });
  it('fewer taps earn more stars, and misses take one off each', () => {
    expect(tapStars(5, 0)).toBe(3);
    expect(tapStars(9, 0)).toBe(2);
    expect(tapStars(20, 0)).toBe(1);
    expect(tapStars(5, 1)).toBe(2);
    expect(tapStars(20, 3)).toBe(1);
  });
});

describe('level 2: field from potential', () => {
  it('E = ΔV/d, and the field points from the higher to the lower potential', () => {
    const ways = new Set<string>();
    for (const s of seeds) {
      const l = buildUniform(lcg(s)) as LevelUniform;
      ways.add(l.from);
      expect(Math.abs(l.vA - l.vB)).toBeCloseTo((l.e * l.d) / 100, 9);
      expect(l.from === 'a-to-b' ? l.vA > l.vB : l.vB > l.vA).toBe(true);
      expect(judgeUniform(l, l.e, l.from).ok).toBe(true);
    }
    expect(ways.size).toBe(2);
  });
  it('forgetting to convert cm to metres, or reversing the direction, is caught separately', () => {
    for (const s of seeds) {
      const l = buildUniform(lcg(s));
      expect(judgeUniform(l, Math.abs(l.vA - l.vB) / l.d, l.from).eOk).toBe(false);
      expect(judgeUniform(l, l.e, l.from === 'a-to-b' ? 'b-to-a' : 'a-to-b').wayOk).toBe(false);
    }
  });
});

describe('level 3: rank by crowding', () => {
  it('the points are clearly different in strength, away from charges and each other, and the answer is sorted', () => {
    for (const s of seeds) {
      const l = buildRank(lcg(s)) as LevelRank;
      const e = strengthsAt(l);
      const sorted = [...e].sort((a, b) => b - a);
      expect(sorted[0] / sorted[1]).toBeGreaterThanOrEqual(1.7 - 1e-9);
      expect(sorted[1] / sorted[2]).toBeGreaterThanOrEqual(1.7 - 1e-9);
      for (const p of l.points) expect(l.sources.every((c) => dist(c.at, p.at) >= 3.5 - 1e-9)).toBe(true);
      expect(l.answer.map((i) => e[i])).toEqual(sorted);
      expect(judgeRank(l, l.answer).ok).toBe(true);
      expect(judgeRank(l, [...l.answer].reverse()).ok).toBe(false);
    }
  });
  it('counts places right', () => {
    const l = buildRank(lcg(3));
    expect(judgeRank(l, [l.answer[0], l.answer[2], l.answer[1]]).correctPlaces).toBe(1);
  });
  it('the field strength is bigger where the potential changes faster (E = −dV/dr, checked numerically)', () => {
    for (const s of seeds.slice(0, 30)) {
      const l = buildRank(lcg(s));
      const p = l.points[l.answer[0]].at;
      const dx = 0.01;
      const grad = Math.abs(potentialAt({ x: p.x + dx, y: p.y }, l.sources) - potentialAt({ x: p.x - dx, y: p.y }, l.sources)) / (2 * dx);
      const gradY = Math.abs(potentialAt({ x: p.x, y: p.y + dx }, l.sources) - potentialAt({ x: p.x, y: p.y - dx }, l.sources)) / (2 * dx);
      expect(Math.hypot(grad, gradY) * 100).toBeCloseTo(strength(p, l.sources), -2 + 2); // V/cm × 100 = V/m ≈ field in the same units
    }
  });
});

describe('stars, explanations and formatting', () => {
  it('free tests are forgiven, then each miss costs a star', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(9, 1)).toBe(1);
  });
  it('levels are deterministic and differ between seeds', () => {
    for (const level of [1, 2, 3]) {
      expect(buildLevel(level, lcg(5))).toEqual(buildLevel(level, lcg(5)));
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('every level explains the answer with the physics', () => {
    const must = [/perpendicular/, /E = ΔV \/ d/, /E = −dV\/dr/];
    [1, 2, 3].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(1500)).toBe('1500');
  });
});
