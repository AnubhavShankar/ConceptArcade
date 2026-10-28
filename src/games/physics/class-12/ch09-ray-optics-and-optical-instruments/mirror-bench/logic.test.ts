import { describe, expect, it } from 'vitest';
import { buildLevel, explainSolution, imageV, judgeFocus, judgePin, judgeShave, judgeSpot, magnify, shaveResult, starsFor, tanDeg, type LevelFocus, type LevelPin, type LevelShave, type LevelSpot } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const twoDecimals = (x: number) => Math.abs(x * 100 - Math.round(x * 100)) < 1e-6;

describe('the numbers from the textbook', () => {
  it('Exercise 9.1: a candle 27 cm from a concave mirror of R = 36 cm has its image 54 cm away, twice the size', () => {
    const v = imageV(-18, -27);
    expect(v).toBeCloseTo(-54, 6);
    expect(magnify(-27, v)).toBeCloseTo(-2, 6);
  });
  it('Exercise 9.2: a needle 12 cm from a convex mirror of f = 15 cm gives v = 6.67 cm and m = 0.56', () => {
    const v = imageV(15, -12);
    expect(v).toBeCloseTo(6.667, 3);
    expect(magnify(-12, v)).toBeCloseTo(0.556, 3);
  });
  it('Example 9.3: R = 15 cm, object at 10 cm gives v = −30 cm; at 5 cm gives v = +15 cm', () => {
    expect(imageV(-7.5, -10)).toBeCloseTo(-30, 6);
    expect(imageV(-7.5, -5)).toBeCloseTo(15, 6);
  });
  it('an object at the focus makes no image', () => {
    expect(imageV(-10, -10)).toBe(Infinity);
    expect(shaveResult(10, 10).m).toBeNull();
  });
  it('Exercise 9.30: a mirror turned by 3.5° moves the spot 1.5 m away by about 18.4 cm', () => {
    expect(150 * tanDeg(7)).toBeCloseTo(18.4, 1);
  });
});

describe('every level is solvable and clean', () => {
  it('level 1: a real image, in front of the mirror, with a 2-decimal height', () => {
    for (const s of seeds) {
      const l = buildLevel(1, lcg(s)) as LevelFocus;
      expect(l.screen).toBeGreaterThan(0);
      expect(l.screen).toBeLessThanOrEqual(100);
      expect(Number.isInteger(Math.round(l.screen * 1e6) / 1e6)).toBe(true);
      expect(twoDecimals(l.imgH)).toBe(true);
      expect(l.imgH).toBeLessThan(0);
      expect(l.d).toBeGreaterThan(l.F);
    }
  });
  it('level 2: a virtual, upright, smaller image behind the mirror', () => {
    for (const s of seeds) {
      const l = buildLevel(2, lcg(s)) as LevelPin;
      expect(l.behind).toBeGreaterThan(0);
      expect(l.behind).toBeLessThan(l.F);
      expect(l.imgH).toBeGreaterThan(0);
      expect(l.imgH).toBeLessThan(l.objH);
      expect(twoDecimals(l.imgH)).toBe(true);
    }
  });
  it('level 3: the wanted magnification is reached by an exact distance inside the focus', () => {
    for (const s of seeds) {
      const l = buildLevel(3, lcg(s)) as LevelShave;
      expect(l.d).toBeLessThan(l.F);
      const r = shaveResult(l.F, l.d);
      expect(r.real).toBe(false);
      expect(r.m).toBeCloseTo(l.want, 9);
      expect(Number.isInteger(l.d)).toBe(true);
    }
  });
  it('level 4: the spot shift is L tan 2θ and is between 10 and 25 cm so it fits the scale', () => {
    for (const s of seeds) {
      const l = buildLevel(4, lcg(s)) as LevelSpot;
      expect(l.shift).toBeCloseTo(l.L * tanDeg(2 * l.theta), 9);
      expect(l.shift).toBeGreaterThan(10);
      expect(l.shift).toBeLessThan(25);
    }
  });
  it('every level has a hero with a name, a story and an objective', () => {
    for (const lv of [1, 2, 3, 4]) {
      const l = buildLevel(lv, lcg(5));
      expect(l.hero.name.length).toBeGreaterThan(2);
      expect(l.hero.story.length).toBeGreaterThan(40);
      expect(l.hero.objective.length).toBeGreaterThan(20);
    }
  });
});

describe('judging: right answers win, near misses and lucky guesses do not', () => {
  it('level 1 needs both the screen distance and the signed height', () => {
    const l = buildLevel(1, lcg(3)) as LevelFocus;
    expect(judgeFocus(l, l.screen, l.imgH).ok).toBe(true);
    expect(judgeFocus(l, l.screen * 1.02, l.imgH * 0.98).ok).toBe(true);
    expect(judgeFocus(l, l.screen, -l.imgH)).toMatchObject({ ok: false, sOk: true, hOk: false });
    expect(judgeFocus(l, l.screen * 1.3, l.imgH)).toMatchObject({ ok: false, sOk: false, hOk: true });
  });
  it('level 2 needs the pin position and the height', () => {
    const l = buildLevel(2, lcg(3)) as LevelPin;
    expect(judgePin(l, l.behind, l.imgH).ok).toBe(true);
    expect(judgePin(l, l.d, l.imgH).ok).toBe(false);
    expect(judgePin(l, l.behind, l.objH).ok).toBe(false);
  });
  it('level 3 judges the magnification the typed distance actually gives, and refuses a real image', () => {
    const l = buildLevel(3, lcg(3)) as LevelShave;
    expect(judgeShave(l, l.d).ok).toBe(true);
    expect(judgeShave(l, l.F).ok).toBe(false);
    expect(judgeShave(l, l.F * 1.5)).toMatchObject({ ok: false, real: true });
    expect(judgeShave(l, l.d * 0.5).ok).toBe(false);
  });
  it('level 4 rejects the shift for a mirror turn of θ instead of 2θ', () => {
    const l = buildLevel(4, lcg(3)) as LevelSpot;
    expect(judgeSpot(l, l.shift).ok).toBe(true);
    expect(judgeSpot(l, l.L * tanDeg(l.theta)).ok).toBe(false);
  });
});

describe('stars and the working', () => {
  it('free misses cost nothing, then a star each, never below one', () => {
    expect(starsFor(0, 1)).toBe(3);
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(9, 1)).toBe(1);
  });
  it('every level explains itself with the formula and never an empty line', () => {
    for (const lv of [1, 2, 3, 4]) {
      const lines = explainSolution(buildLevel(lv, lcg(11)));
      expect(lines.length).toBeGreaterThanOrEqual(2);
      lines.forEach((t) => expect(t.length).toBeGreaterThan(20));
    }
  });
});
