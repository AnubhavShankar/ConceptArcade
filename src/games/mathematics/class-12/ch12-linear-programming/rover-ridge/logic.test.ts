import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { buildRounds, explain, intel, judge, missText, ore, ruler, spotText, type Pt, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** The best Z found by checking every whole-number point of the plateau, as an independent check on the corner rule. */
function bruteBest(r: Round) {
  let best = r.goal === 'max' ? -Infinity : Infinity;
  for (const x of span(0, 9)) for (const y of span(0, 9)) {
    // inside the convex polygon (counter-clockwise: every cross product is non-negative)
    const inside = r.corners.every((p, i) => {
      const q = r.corners[(i + 1) % r.corners.length];
      return (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]) >= 0;
    });
    if (!inside) continue;
    const z = ore(r, [x, y]);
    best = r.goal === 'max' ? Math.max(best, z) : Math.min(best, z);
  }
  return best;
}

describe('the corner rule is right', () => {
  it('textbook anchor: corners (0,0), (4,0), (3,3), (0,5) with Z = 3x + 2y: the largest is 15 at (3, 3)', () => {
    const corners: Pt[] = [[0, 0], [4, 0], [3, 3], [0, 5]];
    const r: Round = { corners, constraints: [], a: 3, b: 2, goal: 'max', ans: 15, best: [3, 3], min: -4, max: 20, start: 0, assist: 0 };
    expect(Math.max(...corners.map((p) => ore(r, p)))).toBe(15);
  });
  it('every round: the best whole-number point of the plateau gives the same Z as the best corner', () => {
    for (const level of [1, 2, 3]) for (const r of all(level).slice(0, 60)) expect(bruteBest(r)).toBe(r.ans);
  });
  it('the plateau is convex with whole corners, and the best corner is unique', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        const vals = r.corners.map((p) => ore(r, p));
        expect(vals.filter((v) => v === r.ans)).toHaveLength(1);
        expect(r.corners.length).toBeGreaterThanOrEqual(4);
        expect(r.constraints).toHaveLength(r.corners.length);
      }
    }
  });
});

describe('every round has exactly one winning setting', () => {
  it('only the best Z wins over the whole dial, and the start never wins', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level)) {
        expect(span(r.min, r.max).filter((z) => judge(r, z))).toEqual([r.ans]);
        expect(judge(r, r.start)).toBe(false);
        expect(ruler(r, r.ans)).toBe('touches');
        expect(r.ans).toBeGreaterThanOrEqual(r.min);
        expect(r.ans).toBeLessThanOrEqual(r.max);
      }
    }
  });
  it('level 1 is a maximum with positive ore; levels 2 and 3 have mixed signs', () => {
    for (const r of all(1)) {
      expect(r.goal).toBe('max');
      expect(r.a * r.b).toBeGreaterThan(0);
    }
    for (const level of [2, 3]) for (const r of all(level)) expect(r.a * r.b).toBeLessThan(0);
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('words', () => {
  it('misses and probes describe the ruler, never the best Z; the working lists the corners', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        const wrong = r.ans === r.max ? r.ans - 1 : r.ans + 1;
        expect(missText(r, wrong).length).toBeGreaterThan(30);
        expect(spotText(r, wrong)).toMatch(/Probe/);
        expect(explain(r)).toMatch(/→/);
        expect(intel(r)).toContain('≤');
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.corners.join() + r.a + r.b)).size).toBe(3);
    }
  });
});
