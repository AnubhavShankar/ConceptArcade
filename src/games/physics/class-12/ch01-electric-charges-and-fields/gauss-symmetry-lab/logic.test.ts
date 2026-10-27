import { describe, expect, it } from 'vitest';
import {
  buildLevel,
  CORRECT_SURFACE,
  DIST_NAME,
  explainSolution,
  fmt,
  judgeFindQ,
  judgeLine,
  judgePick,
  judgeShell,
  judgeSheet,
  lineField,
  platesBetween,
  shellField,
  sheetField,
  starsFor,
  SURFACE_NAME,
  type Dist,
  type Level,
  type LevelFindQ,
  type LevelLine,
  type LevelPick,
  type LevelShell,
  type LevelSheet,
  type Surface,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const lvl = <T extends Level>(level: number, s: number) => buildLevel(level, lcg(s)) as T;

describe('the fields themselves', () => {
  it('a line with λ = 0.1 µC/m gives 9 × 10⁴ N/C at 2 cm, and the field falls as 1/r (Exercise 1.22)', () => {
    expect(lineField(0.1, 2)).toBeCloseTo(9e4, 0);
    expect(lineField(0.1, 4)).toBeCloseTo(lineField(0.1, 2) / 2, 6);
  });
  it('a sheet gives σ/2ε₀, and parallel opposite plates give σ/ε₀ between them (Exercise 1.23)', () => {
    expect(platesBetween(17e-16)).toBeCloseTo(1.92e-10, 12);
    expect(platesBetween(5)).toBeCloseTo(2 * sheetField(5), 3);
  });
  it('a shell has no field inside and kq/r² outside, signed with the charge (Exercise 1.20, Example 1.12)', () => {
    expect(shellField(10, 5, 10)).toBe(0);
    expect(shellField(10, 30, 10)).toBeCloseTo((9e9 * 10e-9) / 0.09, 6);
    expect(shellField(-6.67, 20, 10)).toBeCloseTo(-1501, 0);
    expect(shellField(10, 20, 10)).toBeCloseTo(shellField(10, 20, 15) , 9); // the radius does not matter outside
  });
  it('the field just outside a shell is continuous with the point-charge value, and drops to zero just inside', () => {
    expect(shellField(10, 10, 10)).toBeGreaterThan(0);
    expect(shellField(10, 9.99, 10)).toBe(0);
  });
});

describe('level 1: pick the Gaussian surface', () => {
  it('gives three different distributions, in a random order', () => {
    for (const s of seeds) {
      const l = lvl<LevelPick>(1, s);
      expect(l.rounds).toHaveLength(3);
      expect(new Set(l.rounds).size).toBe(3);
    }
    expect(new Set(seeds.map((s) => lvl<LevelPick>(1, s).rounds.join())).size).toBeGreaterThan(5);
  });
  it('every distribution has exactly one right surface, and the cube and the blob are never right', () => {
    for (const d of Object.keys(CORRECT_SURFACE) as Dist[]) {
      const right = (Object.keys(SURFACE_NAME) as Surface[]).filter((s) => judgePick(d, s).ok);
      expect(right).toEqual([CORRECT_SURFACE[d]]);
      expect(judgePick(d, 'cube').ok).toBe(false);
      expect(judgePick(d, 'blob').ok).toBe(false);
    }
  });
  it('line, sheet and sphere-like charges need cylinder, pillbox and sphere', () => {
    expect(CORRECT_SURFACE).toEqual({ point: 'sphere', line: 'cylinder', sheet: 'pillbox', shell: 'sphere' });
    expect(Object.values(DIST_NAME).every((t) => t.length > 5)).toBe(true);
  });
});

describe('level 2: the line', () => {
  it('the answer λ reproduces the field, and 1/2 is the right fall-off', () => {
    for (const s of seeds) {
      const l = lvl<LevelLine>(2, s);
      expect(lineField(l.lambda, l.r)).toBeCloseTo(l.field, 9);
      expect(judgeLine(l, l.lambda, '1/2').ok).toBe(true);
      expect(judgeLine(l, l.lambda, '1/4').fallOk).toBe(false);
      expect(judgeLine(l, l.lambda * 1.1, '1/2').lambdaOk).toBe(false);
    }
  });
  it('treating the wire like a point charge (a missing factor of r, or 2) is a miss', () => {
    for (const s of seeds) {
      const l = lvl<LevelLine>(2, s);
      expect(judgeLine(l, l.lambda * 2, '1/2').lambdaOk).toBe(false);
      expect(judgeLine(l, l.lambda / 2, '1/2').lambdaOk).toBe(false);
    }
  });
});

describe('level 3: sheets and plates', () => {
  it('both modes appear', () => {
    expect(new Set(seeds.map((s) => lvl<LevelSheet>(3, s).mode)).size).toBe(2);
  });
  it('a sheet: σ/2ε₀ and "the same at twice the distance"; plates: σ/ε₀ between and zero outside', () => {
    for (const s of seeds) {
      const l = lvl<LevelSheet>(3, s);
      if (l.mode === 'sheet') {
        expect(l.first).toBeCloseTo(sheetField(l.sigma), 6);
        expect(judgeSheet(l, l.first, 0, 'same').ok).toBe(true);
        expect(judgeSheet(l, l.first, 0, 'half').ok).toBe(false);
      } else {
        expect(l.first).toBeCloseTo(platesBetween(l.sigma), 6);
        expect(judgeSheet(l, l.first, 0, null).ok).toBe(true);
        expect(judgeSheet(l, l.first, l.first, null).bOk).toBe(false);
      }
    }
  });
  it('using σ/2ε₀ between the plates (forgetting that the two fields add) is a miss', () => {
    for (const s of seeds) {
      const l = lvl<LevelSheet>(3, s);
      if (l.mode === 'plates') expect(judgeSheet(l, l.first / 2, 0, null).aOk).toBe(false);
    }
  });
});

describe('level 4: the shell', () => {
  it('inside means zero field and no direction; outside is kq/r² pointing with the sign of the charge', () => {
    const regions = new Set<string>();
    const dirs = new Set<string>();
    for (const s of seeds) {
      const l = lvl<LevelShell>(4, s);
      regions.add(l.region);
      dirs.add(l.dir);
      if (l.region === 'inside') {
        expect(l.r).toBeLessThan(l.R);
        expect(l.field).toBe(0);
        expect(l.dir).toBe('none');
      } else {
        expect(l.r).toBeGreaterThan(l.R);
        expect(l.field).toBeCloseTo(Math.abs(shellField(l.q, l.r, l.R)), 9);
        expect(l.dir).toBe(l.q > 0 ? 'outward' : 'inward');
      }
      expect(judgeShell(l, l.region, l.field, l.dir).ok).toBe(true);
    }
    expect(regions.size).toBe(2);
    expect(dirs.size).toBe(3);
  });
  it('treating the inside like the outside (using kq/r²) is a miss, and each part is judged separately', () => {
    for (const s of seeds) {
      const l = lvl<LevelShell>(4, s);
      if (l.region !== 'inside') continue;
      const naive = (9e9 * Math.abs(l.q) * 1e-9) / (l.r / 100) ** 2;
      const r = judgeShell(l, 'outside', naive, 'outward');
      expect(r.regionOk).toBe(false);
      expect(r.eOk).toBe(false);
      expect(r.dirOk).toBe(false);
    }
  });
});

describe('level 5: find the charge', () => {
  it('the charge is E r² / k, negative when the field points inward, and the radius is not needed', () => {
    const signs = new Set<number>();
    for (const s of seeds) {
      const l = lvl<LevelFindQ>(5, s);
      signs.add(Math.sign(l.answer));
      expect(Math.sign(l.answer)).toBe(l.dir === 'outward' ? 1 : -1);
      expect(Math.abs(shellField(l.answer, l.r, l.R))).toBeCloseTo(l.field, 6);
      expect(judgeFindQ(l, l.answer, 'no').ok).toBe(true);
    }
    expect(signs.size).toBe(2);
  });
  it('the wrong sign, a wrong size, or saying the radius matters are each caught', () => {
    const l = lvl<LevelFindQ>(5, 3);
    expect(judgeFindQ(l, -l.answer, 'no').qOk).toBe(false);
    expect(judgeFindQ(l, l.answer * 2, 'no').qOk).toBe(false);
    expect(judgeFindQ(l, l.answer, 'yes').radiusOk).toBe(false);
  });
  it('Exercise 1.20: 1.5 × 10³ N/C inward at 20 cm means −6.67 nC', () => {
    const q = -(1500 * 0.2 ** 2) / 9e9 / 1e-9;
    expect(q).toBeCloseTo(-6.667, 2);
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
      expect(new Set(seeds.slice(0, 40).map((s) => JSON.stringify(buildLevel(level, lcg(s))))).size).toBeGreaterThan(3);
    }
  });
  it('every level explains the answer with the physics', () => {
    const must = [/perpendicular|same size|no flux/, /2πrl|2π ε₀ r/, /ε₀|σ/, /Gaussian sphere/, /point charge/];
    [1, 2, 3, 4, 5].forEach((level, i) => expect(explainSolution(buildLevel(level, lcg(3))).join('\n')).toMatch(must[i]));
  });
  it('formats numbers', () => {
    expect(fmt(9e4)).toBe('9 × 10⁴');
  });
});
