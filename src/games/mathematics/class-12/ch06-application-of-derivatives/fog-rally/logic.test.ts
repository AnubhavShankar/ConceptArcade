import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import {
  CELLS, DRIVE, L1_BOSS, L1_DOWN, L1_UP, L2_BOSS, L2_DOWN, L2_UP, L3_CUBE, L3_FLAT, L3_SQUARE, L4_POOL,
  buildBuilder, buildExplain, buildFault, buildIntel, buildMiss, buildScout, buildStrip, complete, cube, cubic3, cubic6, edgeText, firstFault, flat, impactTime,
  judgeBuild, judgeStrip, mid, quad, quadBoss, roadF, roadFp, scoutText, square, stripExplain, stripIntel, stripMiss, trig, turnAt,
  type Gear, type StripRound,
} from './logic';
import { num } from '@core/mathkit';

const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const strips = (level: 1 | 2 | 3 | 4) => seeds.flatMap((s) => buildStrip(level, createRng(s)));
const LEVELS = [1, 2, 3, 4] as const;
const gb = (r: StripRound) => r.want.map((g) => (g === 'gas' ? 'G' : 'B')).join('');
const numeric = (g: (x: number) => number, x: number) => (g(x + 1e-5) - g(x - 1e-5)) / 2e-5;
const close = (a: number, b: number) => Math.abs(a - b) < 1e-3 * Math.max(1, Math.abs(b));

describe('the roads and their derivatives agree', () => {
  it('fp is the derivative of f at four points of every strip road', () => {
    for (const level of LEVELS) {
      for (const r of strips(level).slice(0, 90)) {
        for (const k of [0.1, 0.35, 0.6, 0.9]) {
          const x = r.lo + k * (r.hi - r.lo);
          expect(close(numeric(r.f, x), r.fp(x))).toBe(true);
        }
      }
    }
  });
  it('roadF and roadFp agree for the builder roads', () => {
    for (const r of buildBuilder(createRng(5))) {
      for (const a of [-3, 0, 2]) for (const x of [-3.3, -1.1, 0.7, 3.2]) expect(close(numeric(roadF(r, a), x), roadFp(r, a)(x))).toBe(true);
    }
  });
});

describe('the winning strip follows the sign of f′', () => {
  it('f′ is never 0 at a cell middle and want is exactly its sign', () => {
    for (const level of LEVELS) {
      for (const r of strips(level)) {
        expect(r.want).toHaveLength(CELLS);
        for (let i = 0; i < CELLS; i++) {
          expect(r.fp(mid(r, i))).not.toBe(0);
          expect(r.want[i]).toBe(r.fp(mid(r, i)) > 0 ? 'gas' : 'brake');
        }
      }
    }
  });
  it('exactly one of the 256 complete strips wins, and it is want', () => {
    for (const level of LEVELS) {
      for (const r of strips(level).slice(0, 30)) {
        const winners: Gear[][] = [];
        for (let bits = 0; bits < 256; bits++) {
          const gears: Gear[] = Array.from({ length: CELLS }, (_, i) => ((bits >> i) & 1 ? 'gas' : 'brake'));
          if (judgeStrip(r, gears)) winners.push(gears);
        }
        expect(winners).toEqual([r.want]);
      }
    }
  });
  it('a strip with a gap is incomplete and never wins', () => {
    const r = strips(1)[0];
    for (let hole = 0; hole < CELLS; hole++) {
      const gears: Gear[] = [...r.want];
      gears[hole] = null;
      expect(complete(gears)).toBe(false);
      expect(judgeStrip(r, gears)).toBe(false);
    }
    expect(complete(r.want)).toBe(true);
    expect(complete([...r.want].slice(0, 7))).toBe(false);
  });
  it('helpers fade: aid 0, 1, 2', () => {
    for (const level of LEVELS) expect(buildStrip(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
    expect(buildBuilder(createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
});

describe('what happens at the first wrong cell', () => {
  it('no fault for the winning strip; a single wrong cell stalls (want gas) or flips (want brake)', () => {
    for (const level of LEVELS) {
      for (const r of strips(level).slice(0, 30)) {
        expect(firstFault(r, r.want)).toBeNull();
        expect(impactTime(null)).toBe(DRIVE);
        for (let i = 0; i < CELLS; i++) {
          const gears: Gear[] = [...r.want];
          gears[i] = r.want[i] === 'gas' ? 'brake' : 'gas';
          expect(firstFault(r, gears)).toEqual({ cell: i, kind: r.want[i] === 'gas' ? 'stall' : 'flip' });
          expect(impactTime(firstFault(r, gears))).toBeLessThan(2.4);
        }
      }
    }
  });
});

describe('flat spots are really flat', () => {
  it('a squared factor keeps the sign of f′ on both sides; a real turn changes it', () => {
    for (const r of strips(3)) {
      for (const v of r.flats) {
        expect(Math.abs(r.fp(v))).toBeLessThan(1e-9);
        expect(r.fp(v - 0.3) * r.fp(v + 0.3)).toBeGreaterThan(0);
      }
      for (const v of r.turns) {
        expect(Math.abs(r.fp(v))).toBeLessThan(1e-9);
        expect(r.fp(v - 0.3) * r.fp(v + 0.3)).toBeLessThan(0);
      }
    }
    for (const level of [1, 2] as const) {
      for (const r of strips(level)) for (const v of r.turns) expect(r.fp(v - 0.3) * r.fp(v + 0.3)).toBeLessThan(0);
    }
  });
  it('level 3 serves a cube, a flat-plus-turn road and a three-turn road, in that order', () => {
    expect(buildStrip(3, createRng(5)).map((r) => r.kind)).toEqual(['cube', 'flat', 'square']);
    expect(buildStrip(1, createRng(5)).map((r) => r.kind)).toEqual(['quad', 'quad', 'quad']);
    expect(buildStrip(4, createRng(5)).every((r) => r.kind === 'trig' && r.trig)).toBe(true);
  });
});

describe('the table of textbook roads', () => {
  it('quadratics', () => {
    expect(quad([2, 3, 5]).text).toBe('f(x) = 2x² − 12x + 5');
    expect(quad([2, 3, 5]).fpText).toBe('f′(x) = 4(x − 3)');
    expect(gb(quad([2, 3, 5]))).toBe('BBBBBBBG');
    expect(quad([-1, 1, 4]).text).toBe('f(x) = −x² + 2x + 4');
    expect(gb(quad([-1, 1, 4]))).toBe('GGGGGBBB');
    expect(quad([-2, 0, 5]).fpText).toBe('f′(x) = −4x');
    expect(quadBoss([-2, 3, 5]).text).toBe('f(x) = 5 + 12x − 2x²');
  });
  it('cubics (Ex 6.2 Q5 is 2x³ − 3x² − 36x + 7)', () => {
    const q5 = cubic6([1, -2, 3, 7]);
    expect(q5.text).toBe('f(x) = 2x³ − 3x² − 36x + 7');
    expect(q5.fpText).toBe('f′(x) = 6(x + 2)(x − 3)');
    expect(gb(q5)).toBe('GGBBBBBG');
    expect(cubic6([-1, -2, 1, 0]).text).toBe('f(x) = −2x³ − 3x² + 12x');
    expect(gb(cubic6([-1, -2, 1, 0]))).toBe('BBGGGBBB');
    expect(cubic6([-1, 0, 2, -3]).fpText).toBe('f′(x) = −6x(x − 2)');
    expect(cubic3([1, -2, 2, 0]).text).toBe('f(x) = x³ − 12x');
    expect(cubic3([1, -2, 2, 0]).fpText).toBe('f′(x) = 3(x + 2)(x − 2)');
    expect(gb(cubic3([1, -2, 2, 0]))).toBe('GGBBBBGG');
  });
  it('flat spots (Ex 6.2 Q18 and Q8)', () => {
    expect(cube([1, 1, -99]).text).toBe('f(x) = x³ − 3x² + 3x − 100');
    expect(cube([1, 1, -99]).fpText).toBe('f′(x) = 3(x − 1)²');
    expect(gb(cube([1, 1, -99]))).toBe('GGGGGGGG');
    expect(cube([1, 0, 5]).fpText).toBe('f′(x) = 3x²');
    expect(flat([1, -1, 3]).text).toBe('f(x) = (x + 1)³(x − 3)');
    expect(flat([1, -1, 3]).fpText).toBe('f′(x) = 4(x + 1)²(x − 2)');
    expect(gb(flat([1, -1, 3]))).toBe('BBBBBBGG');
    expect(flat([-1, 3, -1]).fpText).toBe('f′(x) = −4x(x − 3)²');
    expect(flat([1, 0, 4]).text).toBe('f(x) = x³(x − 4)');
    expect(flat([1, 0, 4]).fpText).toBe('f′(x) = 4x²(x − 3)');
    expect(square([0, 1]).text).toBe('f(x) = [x(x − 2)]²');
    expect(square([0, 1]).fpText).toBe('f′(x) = 4x(x − 1)(x − 2)');
    expect(gb(square([0, 1]))).toBe('BBBBGBGG');
  });
  it('trigonometric roads (Examples 9 and 13)', () => {
    expect(gb(trig(L4_POOL.mid[0]))).toBe('GBBBBGGG');
    expect(gb(trig(L4_POOL.easy[1]))).toBe('BBBBGGGG');
    expect(gb(trig(L4_POOL.boss[0]))).toBe('GBBGGBBG');
  });
  it('every pool entry builds a road whose f′ is never 0 at a cell middle', () => {
    const all = [
      ...L1_UP.map(quad), ...L1_DOWN.map(quad), ...L1_BOSS.map(quadBoss), ...L2_UP.map(cubic6), ...L2_DOWN.map(cubic6), ...L2_BOSS.map(cubic3),
      ...L3_CUBE.map(cube), ...L3_FLAT.map(flat), ...L3_SQUARE.map(square), ...[...L4_POOL.easy, ...L4_POOL.mid, ...L4_POOL.boss].map(trig),
    ];
    for (const r of all) for (let i = 0; i < CELLS; i++) expect(Math.abs(r.fp(mid(r, i)))).toBeGreaterThan(1e-6);
    // Every turn sits on a cell edge, so the strip is decided by the middles.
    for (const r of all) for (const t of r.turns) expect(Number.isInteger(r.trig ? t : t - r.lo)).toBe(true);
  });
});

describe('words', () => {
  it('the working of Ex 6.2 Q5 is exact', () => {
    expect(stripExplain(cubic6([1, -2, 3, 7]))).toBe('f′(x) = 6(x + 2)(x − 3). f′ = 0 at x = −2, 3. So f increases on (−∞, −2) and (3, ∞) and decreases on (−2, 3).');
  });
  it('the working of the other kinds', () => {
    expect(stripExplain(cube([1, 1, -99]))).toContain('never decreases');
    expect(stripExplain(cube([-1, 2, 0]))).toContain('never increases');
    expect(stripExplain(square([0, 1]))).toBe('f′(x) = 4x(x − 1)(x − 2). f′ = 0 at x = 0, 1, 2. So f increases on (0, 1) and (2, ∞) and decreases on (−∞, 0) and (1, 2).');
    expect(stripExplain(flat([1, -1, 3]))).toBe('f′(x) = 4(x + 1)²(x − 2). f′ = 0 at x = −1 and x = 2; the squared factor does not change sign at −1, so the only turn is at x = 2. So f increases on (2, ∞) and decreases on (−∞, 2).');
    expect(stripExplain(trig(L4_POOL.easy[1]))).toBe('f′(x) = −sin x. f′ = 0 at x = π. So f increases on (π, 2π) and decreases on (0, π).');
  });
  it('the sentence about the intervals agrees with the winning strip for every road', () => {
    for (const level of LEVELS) {
      for (const r of strips(level).slice(0, 60)) {
        const text = stripExplain(r);
        expect(text.startsWith(r.fpText)).toBe(true);
        expect(text).toMatch(/So f (increases|decreases) on /);
        const climbs = r.want.some((g) => g === 'gas');
        const falls = r.want.some((g) => g === 'brake');
        expect(/increases on/.test(text)).toBe(climbs);
        expect(/decreases on/.test(text)).toBe(falls);
      }
    }
  });
  it('a miss names the stretch and what happened, never the right gear', () => {
    for (const level of LEVELS) {
      for (const r of strips(level).slice(0, 30)) {
        for (let i = 0; i < CELLS; i++) {
          const gears: Gear[] = [...r.want];
          gears[i] = r.want[i] === 'gas' ? 'brake' : 'gas';
          const text = stripMiss(r, gears);
          expect(text).toMatch(r.want[i] === 'gas' ? /stalled/ : /flipped/);
          expect(text).toContain(`x = ${edgeText(r, i)} and x = ${edgeText(r, i + 1)}`);
          expect(text).not.toMatch(/should|must|right gear/);
        }
      }
    }
  });
  it('the scout reads one stretch, and the intel names the stage', () => {
    for (const r of strips(2).slice(0, 12)) {
      for (let i = 0; i < CELLS; i++) expect(scoutText(r, i)).toMatch(r.want[i] === 'gas' ? /climbs/ : /falls/);
      expect(stripIntel(r)).toContain(r.text);
    }
    expect(scoutText(strips(1)[0], 0)).toContain('Scout drone over x = −4 to −3');
  });
  it('edge labels', () => {
    const t = trig(L4_POOL.easy[0]);
    expect(Array.from({ length: 9 }, (_, i) => edgeText(t, i))).toEqual(['0', 'π/4', 'π/2', '3π/4', 'π', '5π/4', '3π/2', '7π/4', '2π']);
    expect(Array.from({ length: 9 }, (_, i) => edgeText(quad([1, 2, 3]), i))).toEqual(['−4', '−3', '−2', '−1', '0', '1', '2', '3', '4']);
  });
});

describe('level 5: the road builder', () => {
  const rounds = seeds.map((s) => buildBuilder(createRng(s)));
  const whole = (r: { min: number; max: number }) => Array.from({ length: r.max - r.min + 1 }, (_, i) => r.min + i);
  it('rounds are inc, dec, cub, and exactly one whole a wins', () => {
    for (const rs of rounds) {
      expect(rs.map((r) => r.kind)).toEqual(['inc', 'dec', 'cub']);
      for (const r of rs) {
        expect(whole(r).filter((a) => judgeBuild(r, a))).toEqual([r.ans]);
        expect(Object.is(r.ans, -0)).toBe(false);
        expect(r.start).toBeGreaterThanOrEqual(r.min);
        expect(r.start).toBeLessThanOrEqual(r.max);
        expect(r.start).not.toBe(r.ans);
        expect(r.n).toBe(r.m + 2);
      }
    }
  });
  it('at the answer f′ keeps its sign on the stage and is 0 at the gate; one step off, it does not', () => {
    for (const rs of rounds) {
      for (const r of rs) {
        const at = (a: number) => [0, 0.5, 1, 1.5, 2].map((d) => roadFp(r, a)(r.m + d));
        if (r.kind === 'dec') {
          expect(at(r.ans).every((v) => v <= 1e-9)).toBe(true);
          expect(roadFp(r, r.ans + 1)(r.m)).toBeGreaterThan(0);
        } else {
          expect(at(r.ans).every((v) => v >= -1e-9)).toBe(true);
          expect(roadFp(r, r.ans - 1)(r.m)).toBeLessThan(0);
        }
        expect(roadFp(r, r.ans)(r.m)).toBe(0);
      }
    }
  });
  it('a miss is late (the turn is inside the stage) or early, as the table says', () => {
    for (const rs of rounds) {
      for (const r of rs) {
        const worse = r.kind === 'dec' ? r.ans + 1 : r.ans - 1;
        const other = r.kind === 'dec' ? r.ans - 1 : r.ans + 1;
        expect(buildFault(r, r.ans)).toBeNull();
        expect(buildFault(r, worse)).toBe('late');
        expect(buildFault(r, other)).toBe('early');
        expect(buildMiss(r, worse)).toMatch(r.gear === 'gas' ? /flipped/ : /stalled/);
        expect(buildMiss(r, other)).toMatch(/voided/);
      }
    }
    const cub = rounds[0][2];
    expect(turnAt(cub, 2)).toBeNull();
    expect(buildMiss(cub, 2)).toContain('never dips at all');
  });
  it('a miss points the right way: moving a one step the stated way brings the turn closer to the gate', () => {
    for (const rs of rounds.slice(0, 30)) {
      for (const r of rs) {
        for (const a of whole(r)) {
          if (a === r.ans) continue;
          const larger = /Try a larger a\./.test(buildMiss(r, a));
          expect(larger || /Try a smaller a\./.test(buildMiss(r, a))).toBe(true);
          const t0 = turnAt(r, a);
          const t1 = turnAt(r, a + (larger ? 1 : -1));
          if (t0 === null || t1 === null) continue;
          expect(Math.abs(t1 - r.m)).toBeLessThanOrEqual(Math.abs(t0 - r.m));
        }
      }
    }
  });
  it('no miss text states the winning a', () => {
    for (const rs of rounds.slice(0, 30)) {
      for (const r of rs) {
        for (const a of whole(r)) {
          if (a === r.ans) continue;
          const text = buildMiss(r, a);
          expect(text).not.toMatch(new RegExp(`a = ${num(r.ans)}(?!\\d)`));
          expect(text).not.toMatch(/should be|must be/);
        }
      }
    }
  });
  it('intel, scout and working', () => {
    const [r1, r2, r3] = rounds[0];
    expect(buildIntel(r1)).toContain('f(x) = x² + ax + 1');
    expect(buildIntel(r2)).toContain('BRAKE');
    expect(buildIntel(r3)).toContain('f(x) = x³ + ax');
    expect(buildScout(r1, 3)).toBe(`Scout at the start gate x = ${num(r1.m)}: with a = 3 the slope there is f′(${num(r1.m)}) = ${num(2 * r1.m + 3)}.`);
    for (const r of [r1, r2, r3]) expect(buildExplain(r)).toContain(`a = ${num(r.ans)}.`);
  });
});
