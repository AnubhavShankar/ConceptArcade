import { describe, expect, it } from 'vitest';
import {
  D,
  SLIDERS,
  buildGame,
  compound,
  explainRound,
  eyeSees,
  judgeMag,
  judgeScope,
  magRange,
  magReading,
  magnifier,
  missText,
  nearPointU,
  resultLine,
  scopeReading,
  scopeSolution,
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
  it('Exercise 9.23: a lens of f = 9 cm gives its most magnified sharp picture with the object 6.6 cm away, magnification 3.8', () => {
    expect(nearPointU(9)).toBeCloseTo(6.62, 2);
    const o = magnifier(9, nearPointU(9));
    expect(o.v).toBeCloseTo(25, 6);
    expect(o.m).toBeCloseTo(3.78, 2);
    expect(o.M).toBeCloseTo(o.m, 9);
  });
  it('Exercise 9.24: to make each square 6.25 mm² (m = 2.5) with f = 9 cm the object is at 5.4 cm, and the image 13.5 cm away is too near to see sharply', () => {
    const u = (9 * (2.5 - 1)) / 2.5;
    expect(u).toBeCloseTo(5.4, 6);
    const o = magnifier(9, u);
    expect(o.m).toBeCloseTo(2.5, 6);
    expect(o.v).toBeCloseTo(13.5, 6);
    expect(eyeSees(o.v)).toBe(false);
  });
  it('Exercise 9.11(a): fo = 2 cm, fe = 6.25 cm, L = 15 cm: the object is 2.5 cm away and the magnification is 20', () => {
    const c = compound(2, 6.25, 15, 2.5);
    expect(c.vo).toBeCloseTo(10, 6);
    expect(c.ve).toBeCloseTo(25, 6);
    expect(c.M).toBeCloseTo(20, 6);
  });
  it('Exercise 9.11(b): with the final image at infinity the object is 2.59 cm away and the magnification 13.5', () => {
    const fo = 2;
    const fe = 6.25;
    const vo = 15 - fe;
    const uo = (vo * fo) / (vo - fo);
    expect(uo).toBeCloseTo(2.59, 2);
    expect((vo / uo) * (D / fe)).toBeCloseTo(13.5, 1);
  });
  it('Exercise 9.12: fo = 0.8 cm, fe = 2.5 cm, object at 0.9 cm: lens separation 9.47 cm, magnification 88', () => {
    const s = scopeSolution(0.8, 2.5, 88);
    expect(s.uSol).toBeCloseTo(0.9, 6);
    expect(s.LSol).toBeCloseTo(9.47, 2);
    expect(compound(0.8, 2.5, s.LSol, s.uSol).M).toBeCloseTo(88, 6);
  });
  it('Exercise 9.26: 30× with fo = 1.25 cm and fe = 5 cm needs the object 1.5 cm from the objective and a tube about 11.67 cm long', () => {
    const s = scopeSolution(1.25, 5, 30);
    expect(s.uSol).toBeCloseTo(1.5, 6);
    expect(s.LSol).toBeCloseTo(11.667, 3);
  });
});

describe('every game has three solvable rounds', () => {
  it('level 1: three different lenses, increasing; only the settings at the near point win', () => {
    for (const s of seeds) {
      const g = as(buildGame(1, lcg(s)), 'mag');
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(new Set(g.rounds.map((r) => r.f)).size).toBe(3);
      expect(g.rounds.map((r) => r.f)).toEqual([...g.rounds.map((r) => r.f)].sort((a, b) => a - b));
      for (const r of g.rounds) {
        const rg = magRange(r.f);
        const winners = grid(rg.min, rg.max, SLIDERS.mag.step).filter((u) => judgeMag(r, u).ok);
        // only sharp settings that look within 2% as big as the best one win (one to three 0.1 cm steps)
        expect(winners.length).toBeGreaterThanOrEqual(1);
        expect(winners.length).toBeLessThanOrEqual(3);
        for (const u of winners) {
          expect(magnifier(r.f, u).v).toBeGreaterThanOrEqual(D - 0.5);
          expect(D / u).toBeGreaterThanOrEqual(0.98 * (D / r.uSol));
        }
        expect(r.uSol).toBeLessThan(r.f);
        expect(magnifier(r.f, r.uSol).v).toBeCloseTo(D, 6);
        expect(r.m).toBeCloseTo(1 + D / r.f, 9);
      }
    }
  });
  it('level 1: every closer spot looks bigger but blurs; every farther spot is sharp but looks smaller (so the near point is the optimum)', () => {
    for (const r of as(buildGame(1, lcg(3)), 'mag').rounds) {
      const near = magnifier(r.f, r.uSol);
      const closer = magnifier(r.f, r.uSol - 0.5);
      const farther = magnifier(r.f, r.uSol + 0.3);
      expect(closer.v).toBeLessThan(D);
      expect(eyeSees(closer.v)).toBe(false);
      expect(eyeSees(farther.v)).toBe(true);
      // how big it LOOKS is the angular magnification D/u: it falls as Mite moves away, even though the linear magnification grows
      expect(closer.M).toBeGreaterThan(near.M);
      expect(farther.M).toBeLessThan(near.M);
      expect(farther.m).toBeGreaterThan(near.m);
    }
  });
  it('level 2: the three rounds are Exercises 9.11(a), 9.12 and 9.26, and only one pair of 0.1 cm settings wins each', () => {
    for (const s of seeds.slice(0, 5)) {
      const g = as(buildGame(2, lcg(s)), 'scope');
      expect(g.rounds.map((r) => r.exercise)).toEqual(['Exercise 9.11(a)', 'Exercise 9.12', 'Exercise 9.26']);
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r of g.rounds) {
        const winners: [number, number][] = [];
        for (const uo of grid(SLIDERS.uo.min, SLIDERS.uo.max, SLIDERS.uo.step)) for (const L of grid(SLIDERS.L.min, SLIDERS.L.max, SLIDERS.L.step)) if (judgeScope(r, uo, L).ok) winners.push([uo, L]);
        expect(winners).toHaveLength(1);
        const c = compound(r.fo, r.fe, r.LSol, r.uSol);
        expect(c.M).toBeCloseTo(r.M, 6);
        expect(c.ve).toBeCloseTo(D, 6);
        expect(r.uSol).toBeGreaterThanOrEqual(SLIDERS.uo.min);
        expect(r.uSol).toBeLessThanOrEqual(SLIDERS.uo.max);
        expect(r.LSol).toBeGreaterThanOrEqual(SLIDERS.L.min);
        expect(r.LSol).toBeLessThanOrEqual(SLIDERS.L.max);
      }
    }
  });
  it('every game has a hero with a name, a story and an objective, in plain game words', () => {
    for (const lv of [1, 2]) {
      const g = buildGame(lv, lcg(5));
      expect(g.hero.name.length).toBeGreaterThan(2);
      expect(g.hero.story.length).toBeGreaterThan(60);
      expect(g.hero.objective.length).toBeGreaterThan(30);
      expect(`${g.hero.story} ${g.hero.objective}`).not.toMatch(/\border\b|stock|shop|workshop|customer|inventory|craft/i);
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: putting the object at the focus (image at infinity), or past it, or using u = f/2, fails', () => {
    for (const r of as(buildGame(1, lcg(3)), 'mag').rounds) {
      expect(judgeMag(r, r.f - 0.1).ok).toBe(false);
      expect(judgeMag(r, r.f + 1).ok).toBe(false);
      expect(judgeMag(r, r.f / 2).ok).toBe(false);
    }
  });
  it('level 2: the right object distance with the wrong tube, or the reverse, fails; so does an eyepiece-only guess', () => {
    const r = as(buildGame(2, lcg(3)), 'scope').rounds[0];
    expect(judgeScope(r, r.uSol, r.LSol + 1)).toMatchObject({ ok: false, uOk: true, lOk: false });
    expect(judgeScope(r, r.uSol + 0.5, r.LSol)).toMatchObject({ ok: false, uOk: false, lOk: true });
    const naive = judgeScope(r, r.fo, r.fe);
    expect(naive.ok).toBe(false);
  });
});

describe('words: the working and the misses', () => {
  it('every round explains itself with two lines and a result line', () => {
    for (const lv of [1, 2]) {
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
    const g1 = buildGame(1, lcg(3));
    const r1 = as(g1, 'mag').rounds[0];
    expect(missText(g1, 0, { u: r1.uSol - 1 })).toMatch(/nearer than the eye can focus/);
    expect(missText(g1, 0, { u: r1.uSol + 0.3 })).toMatch(/Sharp, but Mite could look bigger/);
    expect(missText(g1, 0, { u: r1.f + 1 })).toMatch(/real image/);
    expect(missText(g1, 0, { u: r1.uSol - 1 })).not.toContain(`${r1.uSol.toFixed(1)}`);
    const g2 = buildGame(2, lcg(3));
    expect(missText(g2, 0, { u: 2.2, L: 10 })).toMatch(/not the picture the lab wants|No clear picture/);
  });
  it('miss texts never hold the player’s own magnification or image distance: direction only, no digits', () => {
    for (const seed of Array.from({ length: 30 }, (_, i) => i * 7919 + 13)) {
      const g1 = buildGame(1, lcg(seed));
      for (let k = 0; k < 3; k++) {
        const r = as(g1, 'mag').rounds[k];
        for (let u = 1; u <= r.f - 0.1; u += 0.3) expect(missText(g1, k, { u })).not.toMatch(/\d/);
      }
    }
    const g2 = buildGame(2, lcg(3));
    for (let k = 0; k < 3; k++) for (let uo = 0.5; uo <= 4; uo += 0.3) for (let L = 5; L <= 20; L += 1.7) expect(missText(g2, k, { u: uo, L })).not.toMatch(/\d/);
  });
  it('the scope miss texts say too weak, too strong, too near and too far, and all four can happen', () => {
    const g2 = buildGame(2, lcg(3));
    const seen = new Set<string>();
    for (let k = 0; k < 3; k++)
      for (let uo = 0.5; uo <= 4; uo += 0.1) for (let L = 5; L <= 20; L += 0.5) {
        const t = missText(g2, k, { u: uo, L });
        if (/less than/.test(t)) seen.add('weak');
        if (/more than/.test(t)) seen.add('strong');
        if (/nearer than the eye/.test(t)) seen.add('near');
        if (/farther out/.test(t)) seen.add('far');
      }
    expect([...seen].sort()).toEqual(['far', 'near', 'strong', 'weak']);
  });
  it('the starting dials never win, in any round of either level', () => {
    for (const seed of Array.from({ length: 80 }, (_, i) => i * 7919 + 13)) {
      const g1 = buildGame(1, lcg(seed));
      for (const r of as(g1, 'mag').rounds) expect(judgeMag(r, Math.round(r.f * 0.4 * 10) / 10).ok).toBe(false);
      const g2 = buildGame(2, lcg(seed));
      for (const r of as(g2, 'scope').rounds) expect(judgeScope(r, SLIDERS.uo.start, SLIDERS.L.start).ok).toBe(false);
    }
  });
  it('test shots read out the picture in words', () => {
    expect(magReading(9, 6.6)).toMatch(/virtual image is [\d.]+ cm away/);
    expect(magReading(9, 5.4)).toMatch(/nearer than your eye can focus/);
    expect(magReading(9, 9)).toMatch(/infinity/);
    const r = as(buildGame(2, lcg(3)), 'scope').rounds[0];
    expect(scopeReading(r, 1, 10)).toMatch(/inside the objective/);
    expect(scopeReading(r, r.uSol, r.LSol)).toMatch(/total magnification 20/);
  });
});
