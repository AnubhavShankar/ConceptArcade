import { describe, expect, it } from 'vitest';
import {
  SLIDERS,
  buildGame,
  explainRound,
  fInLiquid,
  fromPower,
  grindF,
  judgeGrind,
  judgeLiquid,
  judgeProjector,
  judgeRelay,
  judgeStack,
  liquidText,
  makerF,
  missText,
  nGlass,
  pairPower,
  power,
  powerText,
  projectorV,
  resultLine,
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
  it('Exercise 9.7: n = 1.55 and f = 20 cm need both radii of 22 cm', () => {
    expect(makerF(1.55, 22, 22)).toBeCloseTo(20, 6);
  });
  it('Example 9.7(ii): faces of 10 cm and 15 cm with f = 12 cm mean n = 1.5', () => {
    expect(makerF(1.5, 10, 15)).toBeCloseTo(12, 6);
  });
  it('Example 9.7(iii): a 20 cm lens of n = 1.5 has f ≈ 78 cm in water (n = 1.33)', () => {
    expect(fInLiquid(1.5, 1.33, 20)).toBeCloseTo(78.2, 0);
  });
  it('Example 9.6: a lens vanishes in a liquid of its own index', () => {
    expect(fInLiquid(1.47, 1.47, 20)).toBe(Infinity);
  });
  it('Exercise 9.10: +30 cm with −20 cm in contact is a diverging lens of f = −60 cm', () => {
    expect(fromPower(power(30) + power(-20))).toBeCloseTo(-60, 6);
  });
  it('Exercise 9.18: with the object and screen 3 m apart no lens longer than 75 cm can make an image (u = 2f, v = 2f)', () => {
    expect(projectorV(75, 150)).toBeCloseTo(150, 6);
    expect(projectorV(80, 150)).not.toBeCloseTo(150, 0);
  });
});

describe('every game has three solvable rounds', () => {
  it('level 1: one equal, one plano, one unequal, the aids fade, and a whole-cm radius is the only winner', () => {
    for (const s of seeds) {
      const g = as(buildGame(1, lcg(s)), 'grind');
      expect(g.rounds.map((r) => r.shape)).toEqual(['equal', 'plano', 'unequal']);
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(g.charges).toEqual([1, 1, 1]);
      for (const r of g.rounds) {
        expect(r.sol).toBeCloseTo(Math.round(r.sol), 6);
        expect(grindF(r, r.sol)).toBeCloseTo(r.f, 6);
        const winners = grid(SLIDERS.grind.min, SLIDERS.grind.max, SLIDERS.grind.step).filter((x) => judgeGrind(r, x).ok);
        expect(winners).toEqual([Math.round(r.sol)]);
      }
    }
  });
  it('level 2: the back lens is a multiple of 0.5 D in range, never zero, the rounds get bigger, and exactly one dial setting wins', () => {
    for (const s of seeds) {
      const g = as(buildGame(2, lcg(s)), 'stack');
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      const sizes = g.rounds.map((r) => Math.abs(r.target - r.P1));
      expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
      expect(new Set(g.rounds.map((r) => `${r.P1}/${r.target}`)).size).toBe(3);
      for (const r of g.rounds) {
        expect(r.P2 * 2).toBeCloseTo(Math.round(r.P2 * 2), 9);
        expect(r.P2).not.toBe(0);
        expect(r.P2).toBeGreaterThanOrEqual(SLIDERS.stack.min);
        expect(r.P2).toBeLessThanOrEqual(SLIDERS.stack.max);
        expect(r.target).not.toBe(0);
        const w = grid(SLIDERS.stack.min, SLIDERS.stack.max, SLIDERS.stack.step).filter((v) => judgeStack(r, v).ok);
        expect(w).toEqual([r.P2]);
      }
    }
  });
  it('level 3: the focal length and the position follow from D and m, they are whole numbers on their dials, and only that pair wins', () => {
    for (const s of seeds.slice(0, 50)) {
      const g = as(buildGame(3, lcg(s)), 'projector');
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      for (const r of g.rounds) {
        expect(Number.isInteger(r.u)).toBe(true);
        expect(Number.isInteger(r.v)).toBe(true);
        expect(r.u + r.v).toBe(r.D);
        expect(r.v).toBe(r.m * r.u);
        expect(1 / r.f).toBeCloseTo(1 / r.u + 1 / r.v, 9);
        expect(r.f).toBeGreaterThanOrEqual(SLIDERS.focal.min);
        expect(r.f).toBeLessThanOrEqual(SLIDERS.focal.max);
        const winners: [number, number][] = [];
        for (const f of grid(SLIDERS.focal.min, SLIDERS.focal.max, SLIDERS.focal.step)) for (const x of grid(5, r.D - 5, 1)) if (judgeProjector(r, f, x).ok) winners.push([f, x]);
        expect(winners).toEqual([[r.f, r.u]]);
      }
    }
  });
  it('level 4: lens 1’s image, lens 2’s object and the final image are whole numbers and only one screen spot wins', () => {
    for (const s of seeds) {
      const g = as(buildGame(4, lcg(s)), 'relay');
      expect(g.charges).toEqual([2, 1, 1]);
      expect(g.rounds[0].f2).toBeGreaterThan(0);
      expect(g.rounds[1].f2).toBeLessThan(0);
      expect(g.rounds[2].f2).toBeLessThan(0);
      for (const r of g.rounds) {
        expect(r.v1).toBeCloseTo(Math.round(r.v1), 9);
        expect(r.v2).toBeCloseTo(Math.round(r.v2), 9);
        expect(r.screen).toBeGreaterThan(SLIDERS.relay.min);
        expect(r.screen).toBeLessThanOrEqual(SLIDERS.relay.max);
        expect(1 / r.v2).toBeCloseTo(1 / r.f2 + 1 / r.u2, 9);
        expect(grid(SLIDERS.relay.min, SLIDERS.relay.max, SLIDERS.relay.step).filter((x) => judgeRelay(r, x).ok)).toEqual([Math.round(r.screen)]);
      }
    }
  });
  it('level 5: vanish, then a weaker converging lens, then a diverging one, each with exactly one liquid index', () => {
    for (const s of seeds) {
      const g = as(buildGame(5, lcg(s)), 'liquid');
      expect(g.rounds.map((r) => r.kind)).toEqual(['vanish', 'target', 'diverge']);
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      const [v, t, d] = g.rounds;
      expect(v.nL).toBeCloseTo(v.nG, 9);
      expect(t.nL).toBeLessThan(t.nG);
      expect(d.nL).toBeGreaterThan(d.nG);
      for (const r of g.rounds) {
        expect(r.nL * 100).toBeCloseTo(Math.round(r.nL * 100), 6);
        expect(r.nL).toBeGreaterThanOrEqual(SLIDERS.liquid.min);
        expect(r.nL).toBeLessThanOrEqual(SLIDERS.liquid.max);
        expect(grid(SLIDERS.liquid.min, SLIDERS.liquid.max, SLIDERS.liquid.step).filter((n) => judgeLiquid(r, n).ok)).toEqual([Math.round(r.nL * 100) / 100]);
        expect(nGlass(r.R, r.fAir)).toBeCloseTo(r.nG, 9);
      }
      expect(fInLiquid(t.nG, t.nL, t.fAir)).toBeCloseTo(t.fTarget, 6);
      expect(fInLiquid(d.nG, d.nL, d.fAir)).toBeCloseTo(d.fTarget, 6);
    }
  });
  it('every game has a hero with a name, a story and an objective, and none of the story talks about orders, stock or shops', () => {
    for (const lv of [1, 2, 3, 4, 5]) {
      const g = buildGame(lv, lcg(5));
      expect(g.hero.name.length).toBeGreaterThan(2);
      expect(g.hero.story.length).toBeGreaterThan(60);
      expect(g.hero.objective.length).toBeGreaterThan(30);
      expect(`${g.hero.story} ${g.hero.objective} ${g.hero.role}`).not.toMatch(/\border|stock|shop|workshop|customer|inventory|craft/i);
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: the plano formula for an equal lens fails, and R = f is a trap unless n = 1.5', () => {
    const eq = as(buildGame(1, lcg(3)), 'grind').rounds[0];
    expect(judgeGrind(eq, (eq.n - 1) * eq.f).ok).toBe(false);
    expect(judgeGrind(eq, eq.f).ok).toBe(eq.n === 1.5);
  });
  it('level 2: forgetting the front lens, or negating it, does not win', () => {
    for (const s of seeds.slice(0, 30)) {
      const r = as(buildGame(2, lcg(s)), 'stack').rounds[0];
      expect(judgeStack(r, r.target).ok).toBe(r.P1 === 0);
      expect(judgeStack(r, -r.P1).ok).toBe(r.target === 0);
      expect(pairPower(r, r.P2)).toBeCloseTo(r.target, 9);
    }
  });
  it('level 3: the right focal length in the wrong place, or the wrong one in the right place, fails', () => {
    const r = as(buildGame(3, lcg(3)), 'projector').rounds[0];
    expect(judgeProjector(r, r.f, r.u + 5)).toMatchObject({ ok: false, fOk: true, xOk: false });
    expect(judgeProjector(r, r.f + 1, r.u)).toMatchObject({ ok: false, fOk: false, xOk: true });
  });
  it('level 4: the intermediate image or the object distance is not the screen position', () => {
    for (const r of as(buildGame(4, lcg(3)), 'relay').rounds) {
      expect(judgeRelay(r, r.v1).ok).toBe(r.v1 === r.screen);
      expect(judgeRelay(r, r.v2).ok).toBe(r.v2 === r.screen);
    }
  });
  it('level 5: the glass index is right only for the vanishing trick', () => {
    const [v, t, d] = as(buildGame(5, lcg(3)), 'liquid').rounds;
    expect(judgeLiquid(v, v.nG).ok).toBe(true);
    expect(judgeLiquid(t, t.nG).ok).toBe(false);
    expect(judgeLiquid(d, d.nG).ok).toBe(false);
  });
});

describe('words: the working and the misses', () => {
  it('every round explains itself with two lines and a result line', () => {
    for (const lv of [1, 2, 3, 4, 5]) {
      const g = buildGame(lv, lcg(11));
      for (let i = 0; i < 3; i++) {
        const lines = explainRound(g, i);
        expect(lines).toHaveLength(2);
        lines.forEach((t) => expect(t.length).toBeGreaterThan(30));
        expect(resultLine(g, i).length).toBeGreaterThan(20);
      }
    }
  });
  it('a miss describes the effect and does not hand over the answer', () => {
    const g1 = as(buildGame(1, lcg(3)), 'grind');
    expect(missText(g1, 0, { x: g1.rounds[0].sol + 10 })).toMatch(/blur/);
    const g2 = as(buildGame(2, lcg(3)), 'stack');
    expect(missText(g2, 0, { x: g2.rounds[0].P2 + 3 })).toMatch(/pair measures/);
    const g3 = as(buildGame(3, lcg(3)), 'projector');
    expect(missText(g3, 0, { f: 40, x: 2 })).toMatch(/inside the focus/);
    expect(missText(g3, 0, { f: g3.rounds[0].f, x: g3.rounds[0].u + 6 })).toMatch(/blur|wrong size/);
    const g5 = as(buildGame(5, lcg(3)), 'liquid');
    expect(missText(g5, 1, { x: g5.rounds[1].nG })).toMatch(/vanished|no focus/);
  });
  it('powers and liquids read in words with signs', () => {
    expect(powerText(2.5)).toMatch(/\+2\.5 D \(converging, f = 40 cm\)/);
    expect(powerText(-2)).toMatch(/−2 D \(diverging/);
    expect(powerText(0)).toMatch(/flat glass/);
    expect(liquidText(Infinity)).toMatch(/vanished/);
    expect(liquidText(-60)).toMatch(/diverging/);
  });
});
