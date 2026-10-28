import { describe, expect, it } from 'vitest';
import { buildGame, explainRound, flashText, imageV, judgeDrive, judgeLaser, judgeSelfie, judgeWall, magnify, missText, mirrorImage, resultLine, tanDeg, type Game } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const as = <K extends Game['kind']>(g: Game, _kind: K) => g as Extract<Game, { kind: K }>;

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
    expect(mirrorImage(10, true, 10).kind).toBe('none');
  });
  it('Exercise 9.30: a mirror turned by 3.5° moves the spot 1.5 m away by about 18.4 cm', () => {
    expect(150 * tanDeg(7)).toBeCloseTo(18.4, 1);
  });
  it('mirrorImage names the kind of image for each side of the focus', () => {
    expect(mirrorImage(12, true, 18).kind).toBe('real');
    expect(mirrorImage(12, true, 6).kind).toBe('virtual');
    expect(mirrorImage(12, false, 30).kind).toBe('virtual');
  });
});

describe('every game has three solvable rounds', () => {
  it('level 1: Flicker’s solution spot puts a real image exactly on the wall, and one flash gives the focal length', () => {
    for (const s of seeds) {
      const g = as(buildGame(1, lcg(s)), 'wall');
      expect(g.rounds).toHaveLength(3);
      expect(g.charges).toEqual([2, 1, 1]);
      for (const r of g.rounds) {
        expect(judgeWall(r, r.uSol).ok).toBe(true);
        expect(r.uStart).toBeLessThanOrEqual(100);
        expect(r.uStart).not.toBe(r.uSol);
        expect(r.wall).toBeLessThanOrEqual(100);
        expect(Number.isInteger(Math.round(r.wall * 1e6) / 1e6)).toBe(true);
        // working it out from the start position's flash recovers f
        const img = mirrorImage(r.F, true, r.uStart);
        expect(img.kind).toBe('real');
        expect((r.uStart * img.dist) / (r.uStart + img.dist)).toBeCloseTo(r.F, 6);
      }
      expect(g.rounds.map((r) => r.wall)).toEqual([...g.rounds.map((r) => r.wall)].sort((a, b) => a - b));
      expect(new Set(g.rounds.map((r) => `${r.F}/${r.uSol}`)).size).toBe(3);
    }
  });
  it('level 2: the catch-bar answer is a whole number of cm inside the slider range', () => {
    for (const s of seeds) {
      const g = as(buildGame(2, lcg(s)), 'drive');
      for (const r of g.rounds) {
        expect(Number.isInteger(Math.round(r.behind * 1e6) / 1e6)).toBe(true);
        expect(r.behind).toBeGreaterThanOrEqual(1);
        expect(r.behind).toBeLessThanOrEqual(20);
        expect(r.behind).toBeLessThan(r.F);
        expect(judgeDrive(r, r.behind).ok).toBe(true);
      }
    }
  });
  it('level 3: the exact distance gives the wanted magnification, and the aids fade across rounds', () => {
    for (const s of seeds) {
      const g = as(buildGame(3, lcg(s)), 'selfie');
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(g.rounds.map((r) => r.want)).toEqual([...g.rounds.map((r) => r.want)].sort((a, b) => a - b));
      for (const r of g.rounds) {
        expect(r.d).toBeLessThan(r.F);
        expect(r.d).toBeLessThanOrEqual(3 * r.F);
        expect(Number.isInteger(r.d)).toBe(true);
        expect(judgeSelfie(r, r.d).ok).toBe(true);
      }
    }
  });
  it('level 4: the dial angle is a multiple of 0.5° and the target fits the wall scale', () => {
    for (const s of seeds) {
      const g = as(buildGame(4, lcg(s)), 'laser');
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r of g.rounds) {
        expect(r.theta * 2).toBe(Math.round(r.theta * 2));
        expect(r.shift).toBeGreaterThan(10);
        expect(r.shift).toBeLessThan(25);
        expect(judgeLaser(r, r.theta).ok).toBe(true);
      }
    }
  });
  it('every game has a hero with a name, a story and an objective', () => {
    for (const lv of [1, 2, 3, 4]) {
      const g = buildGame(lv, lcg(5));
      expect(g.hero.name.length).toBeGreaterThan(2);
      expect(g.hero.story.length).toBeGreaterThan(60);
      expect(g.hero.objective.length).toBeGreaterThan(30);
    }
  });
});

describe('judging: lucky guesses and classic mistakes do not win', () => {
  it('level 1 rejects the start position, a virtual image and the focus', () => {
    const r = as(buildGame(1, lcg(3)), 'wall').rounds[0];
    expect(judgeWall(r, r.uStart).ok).toBe(false);
    expect(judgeWall(r, r.F / 2)).toMatchObject({ ok: false });
    expect(judgeWall(r, r.F).image.kind).toBe('none');
    expect(judgeWall(r, r.F).ok).toBe(false);
  });
  it('level 1: every other spot on the rail fails (only one whole-cm spot works per round)', () => {
    for (const s of seeds.slice(0, 30)) {
      for (const r of as(buildGame(1, lcg(s)), 'wall').rounds) {
        const winners = Array.from({ length: 96 }, (_, i) => i + 5).filter((u) => judgeWall(r, u).ok);
        expect(winners).toEqual([r.uSol]);
      }
    }
  });
  it('level 2 rejects the focal length and the object distance as the bar position', () => {
    const r = as(buildGame(2, lcg(3)), 'drive').rounds[0];
    expect(judgeDrive(r, r.F).ok).toBe(false);
    expect(judgeDrive(r, r.line).ok).toBe(false);
  });
  it('level 3: only one whole-cm distance per round fits, and a real (inverted) image never does', () => {
    for (const s of seeds.slice(0, 30)) {
      for (const r of as(buildGame(3, lcg(s)), 'selfie').rounds) {
        const winners = Array.from({ length: 3 * r.F }, (_, i) => i + 1).filter((d) => judgeSelfie(r, d).ok);
        expect(winners).toEqual([r.d]);
      }
    }
  });
  it('level 4 rejects the single-angle answer (θ read as the ray turn) and an unturned mirror', () => {
    const r = as(buildGame(4, lcg(3)), 'laser').rounds[0];
    expect(judgeLaser(r, r.theta * 2).ok).toBe(false);
    expect(judgeLaser(r, r.theta / 2).ok).toBe(false);
    expect(judgeLaser(r, 0).ok).toBe(false);
  });
});

describe('words: the working and the misses', () => {
  it('every round explains itself with the formula', () => {
    for (const lv of [1, 2, 3, 4]) {
      const g = buildGame(lv, lcg(11));
      for (let i = 0; i < 3; i++) {
        const lines = explainRound(g, i);
        expect(lines).toHaveLength(2);
        lines.forEach((t) => expect(t.length).toBeGreaterThan(30));
        expect(resultLine(g, i).length).toBeGreaterThan(20);
      }
    }
  });
  it('a miss describes the effect and never gives the answer', () => {
    const g1 = as(buildGame(1, lcg(3)), 'wall');
    const r = g1.rounds[0];
    expect(missText(g1, 0, r.uStart)).toMatch(/blurred/);
    expect(missText(g1, 0, r.uStart)).not.toMatch(/should|must|stand at/);
    expect(missText(g1, 0, r.F)).toMatch(/no image/);
    expect(missText(g1, 0, r.F / 2)).toMatch(/virtual/);
    const g3 = as(buildGame(3, lcg(3)), 'selfie');
    expect(missText(g3, 0, 3 * g3.rounds[0].F)).toMatch(/real and upside down/);
    expect(missText(g3, 0, g3.rounds[0].d - 1)).toMatch(/does not fit the frame/);
  });
  it('a flash reads out the image in words', () => {
    expect(flashText(30, mirrorImage(10, true, 30))).toMatch(/real image 15 cm in front of the mirror/);
    expect(flashText(5, mirrorImage(10, true, 5))).toMatch(/virtual image 10 cm behind/);
    expect(flashText(10, mirrorImage(10, true, 10))).toMatch(/no image/);
  });
});
