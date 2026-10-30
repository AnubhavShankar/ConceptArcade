import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { num } from '@core/mathkit';
import { DIALS, area, buildRounds, det3, explain, fmtArea, intel, judge, missText, movePost, scaleDir, scaledArea, spotText, triangle, type Pt, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('determinant, area and collinearity', () => {
  it('textbook anchors: (−2, 0), (0, 4), (0, k) with area 4 gives k = 0 or 8; (3, 8), (−4, 2), (5, 1) has area 30.5; (1, 2), (3, 6), (5, 10) are collinear', () => {
    const a: Pt = [-2, 0];
    const b: Pt = [0, 4];
    expect(span(-12, 12).filter((k) => area(a, b, [0, k]) === 4)).toEqual([0, 8]);
    expect(area([3, 8], [-4, 2], [5, 1])).toBe(30.5);
    expect(det3([1, 2], [3, 6], [5, 10])).toBe(0);
  });
  it('the determinant changes sign when two points swap, and the area does not', () => {
    const [a, b, c]: Pt[] = [[1, 2], [4, 7], [-3, 5]];
    expect(det3(a, b, c)).toBe(-det3(b, a, c));
    expect(area(a, b, c)).toBe(area(b, a, c));
  });
});

describe('every round has exactly one winning setting', () => {
  it('levels 1 and 2: only the answer wins when every dial value is tried, and the start never wins', () => {
    for (const level of [1, 2]) {
      for (const r of all(level)) {
        expect(span(-12, 12).filter((k) => judge(r, { k }))).toEqual([r.ans.k]);
        expect(judge(r, { k: 0 })).toBe(false);
      }
    }
  });
  it('level 1: the area is whole, and the mirror post gives the right area but the wrong side', () => {
    for (const r of all(1)) {
      expect(Number.isInteger(r.deed)).toBe(true);
      const B = r.pts[0][r.axis === 'x' ? 0 : 1];
      const other = 2 * B - r.ans.k;
      expect(other).not.toBe(r.ans.k);
      const [a, b, c] = triangle(r, { k: other });
      expect(area(a, b, c)).toBe(r.deed);
      expect(judge(r, { k: other })).toBe(false);
      // the mirror post is not announced as "right area": it reads like any other wrong post on its side
      expect(missText(r, { k: other })).not.toMatch(/right|wrong side|area/);
    }
  });
  it('level 2: the third post lies on the line through the first two', () => {
    for (const r of all(2)) {
      const p = movePost(r, r.ans);
      expect(p[1]).toBe(r.m * p[0] + r.c);
      expect(r.pts[0][1]).toBe(r.m * r.pts[0][0] + r.c);
    }
  });
  it('level 3: only the true slope and intercept win, scanned over every pair', () => {
    for (const r of all(3).slice(0, 60)) {
      const wins: string[] = [];
      for (const m of span(DIALS.line[0].min, DIALS.line[0].max)) for (const c of span(DIALS.line[1].min, DIALS.line[1].max)) if (judge(r, { m, c })) wins.push(`${m},${c}`);
      expect(wins).toEqual([`${r.m},${r.c}`]);
      expect(r.ans).toEqual({ m: r.m, c: r.c });
      expect(r.ans.m).not.toBe(0);
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('a miss and the start never give the answer away (levels 1 to 3)', () => {
  it('the start is the same constant for every row of a level and never wins', () => {
    for (const level of [1, 2, 3]) {
      const dials = DIALS[level === 1 ? 'area' : level === 2 ? 'collinear' : 'line'];
      for (const r of all(level)) {
        const start = Object.fromEntries(dials.map((d) => [d.key, d.start]));
        expect(dials.every((d) => d.start === 0)).toBe(true);
        expect(judge(r, start)).toBe(false);
      }
    }
  });
  it('levels 1 and 2: the miss text has no number, and every wrong post on one side of the answer reads the same, the mirror post included', () => {
    for (const level of [1, 2]) {
      for (const r of all(level)) {
        const sides: Record<string, Set<string>> = { low: new Set(), high: new Set() };
        for (const k of span(-12, 12)) {
          if (k === r.ans.k) continue;
          const text = missText(r, { k });
          expect(text).not.toMatch(/\d/);
          sides[k < r.ans.k ? 'low' : 'high'].add(text);
        }
        expect(sides.low.size).toBeLessThanOrEqual(1);
        expect(sides.high.size).toBeLessThanOrEqual(1);
        if (sides.low.size && sides.high.size) expect([...sides.low][0]).not.toBe([...sides.high][0]);
      }
    }
  });
  it('level 3: one generic miss text for every wrong line: no number, and it never says which beacon is on or off', () => {
    for (const r of all(3).slice(0, 40)) {
      const texts = new Set<string>();
      for (const m of span(-6, 6)) for (const c of span(-12, 12)) {
        if (judge(r, { m, c })) continue;
        texts.add(missText(r, { m, c }));
      }
      expect(texts.size).toBe(1);
      expect([...texts][0]).not.toMatch(/\d|beacon [12]|passes through/);
    }
  });
  it('the check (the paid test) still reads out the numbers and the beacon verdicts', () => {
    const r = all(3)[0];
    expect(spotText(r, { m: r.ans.m, c: r.ans.c + 1 })).toMatch(/beacon 1 is .* beacon 2 is/);
    const q = all(1)[0];
    expect(spotText(q, { k: q.ans.k + 1 })).toMatch(/determinant of the three posts is/);
  });
});

describe('level 4: scale the field', () => {
  const scaleRounds = () => all(4);
  const ks = span(1, 6);
  it('deed = k0² times the original area, with k0 drawn from the round’s own pool', () => {
    for (const s of seeds) {
      const rs = buildRounds(4, createRng(s));
      const pools = [[2, 3], [3, 4], [4, 5]];
      rs.forEach((r, i) => {
        expect(r.kind).toBe('scale');
        expect(pools[i]).toContain(r.k0);
        expect(r.ans).toEqual({ k: r.k0 });
        expect(r.deed).toBe((r.k0 as number) ** 2 * area(r.pts[0], r.pts[1], r.pts[2]));
        expect(Number.isInteger(r.deed * 2)).toBe(true);
      });
    }
  });
  it('the triangle for k is the three posts times k, and its area is k² times the original', () => {
    for (const r of scaleRounds()) {
      for (const k of ks) {
        const t = triangle(r, { k });
        expect(t).toEqual(r.pts.map(([x, y]) => [x * k, y * k]));
        expect(movePost(r, { k })).toEqual(t[2]);
        expect(area(...t)).toBe(k * k * area(r.pts[0], r.pts[1], r.pts[2]));
        expect(Math.abs(det3(...t))).toBe(k * k * Math.abs(det3(r.pts[0], r.pts[1], r.pts[2])));
      }
    }
  });
  it('scanning k from 1 to 6, only k0 gives the deed’s area and wins; the start (1) never wins', () => {
    for (const r of scaleRounds()) {
      expect(ks.filter((k) => scaledArea(r, { k }) === r.deed)).toEqual([r.k0]);
      expect(ks.filter((k) => judge(r, { k }))).toEqual([r.k0]);
      expect(r.k0).toBeGreaterThan(DIALS.scale[0].start);
      expect(judge(r, { k: DIALS.scale[0].start })).toBe(false);
      expect(DIALS.scale).toEqual([{ key: 'k', label: 'Scale k', min: 1, max: 6, start: 1 }]);
    }
  });
  it('the three rounds use three different triangles and the helpers fade', () => {
    for (const s of seeds) expect(new Set(buildRounds(4, createRng(s)).map((r) => JSON.stringify(r.pts))).size).toBe(3);
    expect(buildRounds(4, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
  it('a miss says too small below k0 and too big above it, and shows no area and no answer', () => {
    for (const r of scaleRounds()) {
      for (const k of ks.filter((x) => x !== r.k0)) {
        const m = missText(r, { k });
        expect(m).toContain(k < (r.k0 as number) ? 'too small' : 'too big');
        expect(m).not.toContain(k < (r.k0 as number) ? 'too big' : 'too small');
        expect(scaleDir(r, { k })).toBe(k < (r.k0 as number) ? -1 : 1);
        expect(m.replace(`k = ${k}`, '')).not.toMatch(/\d|\//);
        const sv = spotText(r, { k });
        expect(sv).toContain(k < (r.k0 as number) ? 'smaller' : 'bigger');
        expect(sv.replace(`k = ${k}`, '')).not.toMatch(/\d|\//);
      }
      expect(spotText(r, { k: r.k0 as number })).toMatch(/exactly/);
    }
  });
  it('the working states the original area, k² and |kA| = kⁿ|A|, and the intel gives the posts and the deed', () => {
    for (const r of scaleRounds().slice(0, 60)) {
      const e = explain(r);
      expect(e).toContain('kⁿ');
      expect(e).toContain(`k² = ${(r.k0 as number) ** 2}`);
      expect(e).toContain(`so k = ${r.k0}`);
      expect(e).toContain(fmtArea(r.deed));
      expect(e).toContain(fmtArea(area(r.pts[0], r.pts[1], r.pts[2])));
      const i = intel(r);
      expect(i).toContain(fmtArea(r.deed));
      for (const p of r.pts) expect(i).toContain(`(${num(p[0])}, ${num(p[1])})`);
    }
  });
  it('areas are written as 45/2 for halves and plainly for whole numbers', () => {
    expect(fmtArea(22.5)).toBe('45/2');
    expect(fmtArea(10)).toBe('10');
    expect(fmtArea(1.5)).toBe('3/2');
  });
});

describe('words', () => {
  it('misses report what was measured; the working and the intel are stated', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        const wrong: Record<string, number> = r.kind === 'line' ? { m: r.ans.m + 1, c: r.ans.c } : { k: r.ans.k + 1 };
        expect(missText(r, wrong).length).toBeGreaterThan(25);
        expect(missText(r, wrong)).not.toMatch(/k = |m = |c = /);
        expect(spotText(r, wrong)).toMatch(/Check/);
        expect(explain(r).length).toBeGreaterThan(40);
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs: Round[] = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => JSON.stringify(r.pts))).size).toBe(3);
    }
  });
});
