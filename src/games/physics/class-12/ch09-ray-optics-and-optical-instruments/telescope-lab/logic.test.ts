import { describe, expect, it } from 'vitest';
import {
  D,
  MOON_ANGLE,
  SLIDERS,
  buildGame,
  eyeSees,
  explainRound,
  judgeNear,
  judgePlate,
  judgeZoom,
  lRange,
  missText,
  nearL,
  nearM,
  normalM,
  plateSize,
  resultLine,
  view,
  viewReading,
  type Game,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const as = <K extends Game['kind']>(g: Game, _kind: K) => g as Extract<Game, { kind: K }>;
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Exercise 9.13: fo = 144 cm and fe = 6 cm give 24× with the lenses 150 cm apart', () => {
    expect(normalM(144, 6)).toBe(24);
    expect(144 + 6).toBe(150);
  });
  it('Exercise 9.14: fo = 15 m and fe = 1 cm give 1500×, and the Moon’s image is 13.7 cm across', () => {
    expect(normalM(1500, 1)).toBe(1500);
    expect(plateSize(1500, MOON_ANGLE)).toBeCloseTo(13.7, 1);
  });
  it('Exercise 9.27: fo = 140 cm and fe = 5 cm give 28× in normal adjustment and 33.6× with the image at 25 cm', () => {
    expect(normalM(140, 5)).toBe(28);
    expect(nearM(140, 5)).toBeCloseTo(33.6, 6);
  });
  it('Exercise 9.28: the 100 m tower 3 km away makes an image 4.7 cm tall in the objective, and 145 cm is the lens separation', () => {
    expect(plateSize(140, 100 / 3000)).toBeCloseTo(4.67, 2);
    expect(140 + 5).toBe(145);
  });
  it('the tube length for a near-point view follows from the eyepiece’s object distance', () => {
    const w = view(140, 5, nearL(140, 5));
    expect(w.v).toBeCloseTo(D, 6);
    expect(w.M).toBeCloseTo(33.6, 6);
    expect(view(140, 5, 145).v).toBe(Infinity);
  });
});

describe('every game has three solvable rounds', () => {
  it('level 1: Exercises 9.13, 9.27(a) and 9.14(a); the eyepiece and tube length are unique', () => {
    for (const s of seeds.slice(0, 3)) {
      const g = as(buildGame(1, lcg(s)), 'zoom');
      expect(g.rounds.map((r) => r.exercise)).toEqual(['Exercise 9.13', 'Exercise 9.27(a)', 'Exercise 9.14(a)']);
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r of g.rounds) {
        const lr = lRange(r.fo, 1);
        const winners: [number, number][] = [];
        for (const fe of grid(SLIDERS.fe.min, SLIDERS.fe.max, SLIDERS.fe.step)) for (const L of grid(lr.min, lr.max, lr.step)) if (judgeZoom(r, fe, L).ok) winners.push([fe, L]);
        expect(winners).toEqual([[r.feSol, r.LSol]]);
        const w = view(r.fo, r.feSol, r.LSol);
        expect(w.v).toBe(Infinity);
        expect(w.M).toBeCloseTo(r.M, 6);
      }
    }
  });
  it('level 2: three different plates, each fitted by exactly one focal-length dial setting, in the order of the plate size', () => {
    for (const s of seeds) {
      const g = as(buildGame(2, lcg(s)), 'plate');
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      const plates = g.rounds.map((r) => r.plate);
      expect(plates).toEqual([...plates].sort((a, b) => a - b));
      expect(new Set(plates).size).toBe(3);
      for (const r of g.rounds) {
        expect(r.foSol).toBeGreaterThan(SLIDERS.fo.min);
        expect(r.foSol).toBeLessThan(SLIDERS.fo.max);
        const winners = grid(SLIDERS.fo.min, SLIDERS.fo.max, SLIDERS.fo.step).filter((fo) => judgePlate(r, fo).ok);
        expect(winners).toHaveLength(1);
        expect(Math.abs(winners[0] - r.foSol)).toBeLessThanOrEqual(5.01);
        expect(plateSize(r.foSol, r.theta)).toBeCloseTo(r.plate, 6);
      }
    }
  });
  it('level 3: the first round is Exercise 9.27(b); every round has the final image at the near point, and one pair of dials wins', () => {
    for (const s of seeds.slice(0, 20)) {
      const g = as(buildGame(3, lcg(s)), 'near');
      expect(g.rounds[0]).toMatchObject({ fo: 140, feSol: 5 });
      expect(g.rounds[0].M).toBeCloseTo(33.6, 6);
      expect(new Set(g.rounds.map((r) => `${r.fo}/${r.feSol}`)).size).toBe(3);
      for (const r of g.rounds) {
        const lr = lRange(r.fo, 0.1);
        const winners: [number, number][] = [];
        for (const fe of grid(SLIDERS.fe.min, SLIDERS.fe.max, SLIDERS.fe.step)) for (const L of grid(lr.min, lr.max, lr.step)) if (judgeNear(r, fe, L).ok) winners.push([fe, L]);
        expect(winners).toHaveLength(1);
        expect(winners[0][0]).toBe(r.feSol);
        expect(Math.abs(winners[0][1] - r.LSol)).toBeLessThanOrEqual(0.05);
        expect(view(r.fo, r.feSol, r.LSol).v).toBeCloseTo(D, 6);
      }
    }
  });
  it('every game has a hero with a name, a story and an objective, in plain game words', () => {
    for (const lv of [1, 2, 3]) {
      const g = buildGame(lv, lcg(5));
      expect(g.hero.name.length).toBeGreaterThan(2);
      expect(g.hero.story.length).toBeGreaterThan(60);
      expect(g.hero.objective.length).toBeGreaterThan(30);
      expect(`${g.hero.story} ${g.hero.objective}`).not.toMatch(/\border\b|stock|shop|workshop|customer|inventory|craft/i);
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: the right eyepiece with the near-point tube length (or the reverse) misses', () => {
    const r = as(buildGame(1, lcg(3)), 'zoom').rounds[0];
    expect(judgeZoom(r, r.feSol, nearL(r.fo, r.feSol))).toMatchObject({ ok: false, feOk: true, lOk: false });
    expect(judgeZoom(r, r.feSol * 2, r.LSol)).toMatchObject({ ok: false, feOk: false, lOk: true });
  });
  it('level 2: the plate-sized focal length (cm of image mistaken for cm of focal length) and a halved one miss', () => {
    for (const r of as(buildGame(2, lcg(3)), 'plate').rounds) {
      expect(judgePlate(r, r.plate).ok).toBe(false);
      expect(judgePlate(r, r.foSol / 2).ok).toBe(false);
      expect(judgePlate(r, r.foSol * 2).ok).toBe(false);
    }
  });
  it('level 3: the normal-adjustment tube length puts the image at infinity, which is not the near-point view', () => {
    for (const r of as(buildGame(3, lcg(3)), 'near').rounds) {
      expect(judgeNear(r, r.feSol, r.fo + r.feSol).ok).toBe(false);
      expect(judgeNear(r, r.feSol, r.LSol).ok).toBe(true);
    }
  });
});

describe('words: the working and the misses', () => {
  it('every round explains itself with two lines and a result line', () => {
    for (const lv of [1, 2, 3]) {
      const g = buildGame(lv, lcg(11));
      for (let k = 0; k < 3; k++) {
        const lines = explainRound(g, k);
        expect(lines).toHaveLength(2);
        lines.forEach((t) => expect(t.length).toBeGreaterThan(30));
        expect(resultLine(g, k).length).toBeGreaterThan(20);
      }
    }
  });
  it('a miss describes the effect and does not hand over the answer', () => {
    const g2 = as(buildGame(2, lcg(3)), 'plate');
    const r = g2.rounds[0];
    expect(missText(g2, 0, { fo: r.foSol * 2 })).toMatch(/spills over/);
    expect(missText(g2, 0, { fo: r.foSol / 2 })).toMatch(/partly empty/);
    const g1 = buildGame(1, lcg(3));
    expect(missText(g1, 0, { fe: 3, L: 120 })).toMatch(/No clear picture/);
    expect(missText(g1, 0, { fe: 3, L: 146 })).toMatch(/× and the final image/);
  });
  it('a test shot reads the view in words', () => {
    expect(viewReading(144, 6, 150)).toMatch(/at infinity, magnification 24×/);
    expect(viewReading(140, 5, nearL(140, 5))).toMatch(/25 cm from the eyepiece, magnification 33\.6×/);
    expect(viewReading(140, 5, 135)).toMatch(/inside the objective/);
    expect(viewReading(140, 5, 160)).toMatch(/outside the eyepiece/);
    expect(eyeSees(24)).toBe(false);
  });
});
