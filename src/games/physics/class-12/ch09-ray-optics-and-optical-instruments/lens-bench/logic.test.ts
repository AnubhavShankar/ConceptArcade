import { describe, expect, it } from 'vitest';
import {
  DIVERGE,
  GRIND_MISS_OFFSET,
  LIQUID_MISS_FADE,
  PROJ_MISS,
  SLIDERS,
  STACK_MISS_PX,
  TARGET,
  VANISH,
  buildGame,
  grindMissFocus,
  grindSide,
  liquidMissF,
  liquidSide,
  projectorMiss,
  projectorStartX,
  stackMissF,
  stackSide,
  curvedDen,
  curvedMissDen,
  curvedRadius,
  curvedReading,
  curvedSide,
  curvedV,
  judgeCurved,
  relayMissDraw,
  unitFraction,
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
    expect(missText(g2, 0, { x: g2.rounds[0].P2 + 3 })).toMatch(/too converging/);
    expect(missText(g2, 0, { x: g2.rounds[0].P2 - 3 })).toMatch(/too diverging/);
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

describe('level 6: one curved face (Section 9.5.1, Example 9.5)', () => {
  const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
  const cg = (s: number) => as(buildGame(6, lcg(s)), 'curved');
  const radii = grid(SLIDERS.curved.min, SLIDERS.curved.max, SLIDERS.curved.step).filter((x) => x !== 0);
  /** Every row of the brief: [n₂, u, v] to the radius, checked here against n₂/v − n₁/u = (n₂ − n₁)/R written out by hand. */
  const TABLE: Record<number, [number, number, number, number][]> = {
    0: [[1.5, -30, 90, 10], [1.5, -60, 60, 12], [1.5, -40, 60, 10]],
    1: [[1.5, -15, 90, 6], [1.5, -24, 36, 6], [4 / 3, -30, 40, 5]],
    2: [[1.5, -20, -24, -40]],
  };
  const key = (n2: number, u: number, v: number) => `${n2.toFixed(4)}/${u}/${v}`;

  it('the slider is −50 to 50 in whole cm and starts at 30', () => {
    expect(SLIDERS.curved).toEqual({ min: -50, max: 50, step: 1, start: 30 });
  });
  it('every row of the table gives the printed radius, by the formula and by hand', () => {
    for (const rows of Object.values(TABLE)) {
      for (const [n2, u, v, R] of rows) {
        expect(curvedRadius(1, n2, u, v)).toBeCloseTo(R, 9);
        expect(n2 / v - 1 / u).toBeCloseTo((n2 - 1) / R, 9);
      }
    }
    // the bench numbers in the brief, one by one
    expect(1.5 / 90 + 1 / 30).toBeCloseTo(1 / 20, 12);
    expect(1.5 / 60 + 1 / 60).toBeCloseTo(1 / 24, 12);
    expect(1.5 / 60 + 1 / 40).toBeCloseTo(1 / 20, 12);
    expect(1.5 / 90 + 1 / 15).toBeCloseTo(1 / 12, 12);
    expect(1.5 / 36 + 1 / 24).toBeCloseTo(1 / 12, 12);
    expect(4 / 3 / 40 + 1 / 30).toBeCloseTo(1 / 15, 12);
    expect(1.5 / -24 + 1 / 20).toBeCloseTo(-1 / 80, 12);
  });
  it('over 80 seeds each round draws only brief rows, every row turns up, and the rounds are in the brief’s order', () => {
    const seen: Record<number, Set<string>> = { 0: new Set(), 1: new Set(), 2: new Set() };
    for (const s of seeds80) {
      const g = cg(s);
      expect(g.rounds).toHaveLength(3);
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(g.charges).toEqual([1, 1, 0]);
      g.rounds.forEach((r, i) => {
        const row = TABLE[i].find(([n2, u, v]) => key(n2, u, v) === key(r.n2, r.u, r.v));
        expect(row).toBeDefined();
        expect(r.n1).toBe(1);
        expect(r.sol).toBe(row![3]);
        expect(r.virtual).toBe(i === 2);
        seen[i].add(key(r.n2, r.u, r.v));
      });
    }
    expect(seen[0].size).toBe(3);
    expect(seen[1].size).toBe(3);
    expect(seen[2].size).toBe(1);
  });
  it('R = 10, 12, 10 / 6, 6, 5 / −40 are whole numbers inside the dial, never 0, and the light really focuses where the sensor is', () => {
    for (const s of seeds80) {
      for (const r of cg(s).rounds) {
        expect(Number.isInteger(r.sol)).toBe(true);
        expect(r.sol).not.toBe(0);
        expect(r.sol).toBeGreaterThanOrEqual(SLIDERS.curved.min);
        expect(r.sol).toBeLessThanOrEqual(SLIDERS.curved.max);
        expect(curvedRadius(r.n1, r.n2, r.u, r.v)).toBeCloseTo(r.sol, 9);
        expect(curvedV(r, r.sol)).toBeCloseTo(r.v, 9);
        expect(curvedDen(r, r.sol)).toBeCloseTo(r.n2 / r.v, 12);
      }
    }
    expect(cg(5).rounds[2].sol).toBe(-40);
    expect(cg(5).rounds[2].virtual).toBe(true);
    expect(cg(5).rounds[0].virtual).toBe(false);
  });
  it('only the answer wins: scanning every dial value gives exactly one winner, and the start (30) is never it', () => {
    for (const s of seeds80) {
      for (const r of cg(s).rounds) {
        expect(radii.filter((x) => judgeCurved(r, x).ok)).toEqual([r.sol]);
        expect(judgeCurved(r, SLIDERS.curved.start).ok).toBe(false);
        expect(r.sol).not.toBe(SLIDERS.curved.start);
      }
    }
  });
  it('classic slips do not win: the wrong sign, the radius from the thin-lens rule, the glass index forgotten', () => {
    for (const s of seeds80.slice(0, 20)) {
      for (const r of cg(s).rounds) {
        expect(judgeCurved(r, -r.sol).ok).toBe(false);
        // forgetting n₁/u (treating the face as if the light came in parallel): R = (n₂ − n₁)v/n₂
        expect(judgeCurved(r, Math.round(((r.n2 - r.n1) * r.v) / r.n2)).ok).toBe(false);
        // using v as if the light stayed in air: R = (n₂ − n₁)/(1/v − 1/u)
        const air = (r.n2 - r.n1) / (1 / r.v - r.n1 / r.u);
        if (Math.abs(air - Math.round(air)) < 1e-9 && Math.round(air) !== 0) expect(judgeCurved(r, Math.round(air)).ok).toBe(false);
      }
    }
  });
  it('the direction of a miss: more bend than needed is strong, less is weak, and the winner is neither', () => {
    for (const s of seeds80.slice(0, 20)) {
      for (const r of cg(s).rounds) {
        expect(curvedSide(r, r.sol)).toBe('right');
        for (const x of radii) {
          if (x === r.sol) continue;
          const side = curvedSide(r, x);
          expect(side).toBe(curvedDen(r, x) > curvedDen(r, r.sol) ? 'strong' : 'weak');
        }
        // for a real focus, a small positive R bends light hardest
        if (!r.virtual) {
          expect(curvedSide(r, 1)).toBe('strong');
          expect(curvedSide(r, -1)).toBe('weak');
          expect(curvedSide(r, SLIDERS.curved.max)).toBe(r.sol < SLIDERS.curved.max ? 'weak' : 'right');
        }
      }
    }
  });
  it('a miss draws and says a FIXED amount: the same for every radius on the same side, never growing with the error', () => {
    for (const s of seeds80) {
      for (const r of cg(s).rounds) {
        const groups = new Map<string, Set<number>>();
        for (const x of radii) {
          if (x === r.sol) continue;
          const k = `${curvedSide(r, x)}/${curvedDen(r, x) > 1e-9 ? 'converge' : 'spread'}`;
          const set = groups.get(k) ?? new Set<number>();
          set.add(Math.round(curvedMissDen(r, x) * 1e12));
          groups.set(k, set);
          // a miss never draws the true bend
          expect(Math.abs(curvedMissDen(r, x) - r.n2 / r.v)).toBeGreaterThan(1e-6);
        }
        groups.forEach((set) => expect(set.size).toBe(1));
        // and the picture agrees with the words: too strong draws a focus in front of the sensor for a real focus
        if (!r.virtual) {
          const strong = radii.find((x) => curvedSide(r, x) === 'strong')!;
          expect(r.n2 / curvedMissDen(r, strong)).toBeCloseTo(r.v * 0.55, 6);
          const weakConverging = radii.find((x) => curvedSide(r, x) === 'weak' && curvedDen(r, x) > 1e-9);
          if (weakConverging !== undefined) expect(r.n2 / curvedMissDen(r, weakConverging)).toBeCloseTo(r.v * 1.45, 6);
        }
      }
    }
  });
  it('miss texts give only the direction: no digits at all, and the same words for every radius on one side', () => {
    for (const s of seeds80) {
      const g = cg(s);
      g.rounds.forEach((r, i) => {
        const texts = new Map<string, Set<string>>();
        for (const x of radii) {
          if (x === r.sol) continue;
          const text = missText(g, i, { x });
          expect(text).not.toMatch(/\d/);
          expect(text).toMatch(/too (strongly|weakly)/);
          const side = curvedSide(r, x);
          expect(text.includes('strongly')).toBe(side === 'strong');
          const set = texts.get(side) ?? new Set<string>();
          set.add(text);
          texts.set(side, set);
        }
        texts.forEach((set) => expect(set.size).toBe(1));
      });
    }
  });
  it('the paid test beam reads out the focus with numbers: inside the rod, a virtual point, or parallel light', () => {
    const r = cg(5).rounds[0];
    expect(curvedReading(r, r.sol)).toContain(`${r.v} cm inside the rod`);
    const row = { n1: 1, n2: 1.5, u: -30, v: 90, sol: 10, virtual: false, assist: 0 } as typeof r;
    expect(curvedReading(row, 12)).toBe('Test beam: with R = 12 cm, the light focuses 180 cm inside the rod.');
    expect(curvedReading(row, 15)).toBe('Test beam: with R = 15 cm, the light leaves the face parallel: no focus at all.');
    expect(curvedReading(row, 30)).toBe('Test beam: with R = 30 cm, the light spreads as if from a point 90 cm in front of the face.');
    const boss = cg(5).rounds[2];
    expect(curvedReading(boss, -40)).toContain('as if from a point 24 cm in front of the face');
    expect(curvedReading(boss, -1)).toMatch(/spreads|focuses/);
    const parallel = { ...r, n1: 1, n2: 1.5, u: -30, v: 90, sol: 10, virtual: false, assist: 0 } as typeof r;
    expect(curvedReading(parallel, 15)).toMatch(/parallel/);
  });
  it('the working reads as the brief says, with the unit fraction, the concave note and the water rod', () => {
    const rows = new Map<string, string>();
    for (const s of seeds80) {
      const g = cg(s);
      g.rounds.forEach((r, i) => rows.set(key(r.n2, r.u, r.v), explainRound(g, i)[0]));
    }
    expect(rows.get(key(1.5, -30, 90))).toBe('n₂/v − n₁/u = 1.5/90 − 1/(−30) = 1/20, which equals (n₂ − n₁)/R = 0.5/R, so R = 10 cm.');
    expect(rows.get(key(1.5, -60, 60))).toContain('= 1/24,');
    expect(rows.get(key(1.5, -60, 60))).toContain('so R = 12 cm.');
    expect(rows.get(key(1.5, -15, 90))).toContain('= 1/12,');
    expect(rows.get(key(4 / 3, -30, 40))).toBe('n₂/v − n₁/u = (4/3)/40 − 1/(−30) = 1/15, which equals (n₂ − n₁)/R = (1/3)/R, so R = 5 cm.');
    expect(rows.get(key(1.5, -20, -24))).toBe('n₂/v − n₁/u = 1.5/(−24) − 1/(−20) = −1/80, which equals (n₂ − n₁)/R = 0.5/R, so R = −40 cm: a concave face.');
    expect(unitFraction(1 / 20)).toBe('1/20');
    expect(unitFraction(-1 / 80)).toBe('−1/80');
    // every printed fraction is the true left-hand side
    for (const s of seeds80.slice(0, 20)) {
      for (const r of cg(s).rounds) {
        const lhs = r.n2 / r.v - r.n1 / r.u;
        expect(1 / Math.round(1 / lhs)).toBeCloseTo(lhs, 12);
      }
    }
  });
  it('the hero for level 6 has a name, the story and the objective of the brief, and no shop words', () => {
    const g = buildGame(6, lcg(5));
    expect(g.hero.name.length).toBeGreaterThan(2);
    expect(g.hero.story).toBe('A single curved glass face bends light by itself: n₂/v − n₁/u = (n₂ − n₁)/R. The lantern’s light must focus on the sensor buried inside the glass rod.');
    expect(g.hero.objective).toBe('Grind the rod’s end to the radius that focuses the light on the sensor, in three rounds.');
    expect(`${g.hero.story} ${g.hero.objective} ${g.hero.role}`).not.toMatch(/\border|stock|shop|workshop|customer|inventory|craft/i);
  });
  it('every round explains itself with two lines and a result line', () => {
    const g = buildGame(6, lcg(11));
    for (let i = 0; i < 3; i++) {
      const lines = explainRound(g, i);
      expect(lines).toHaveLength(2);
      lines.forEach((t) => expect(t.length).toBeGreaterThan(30));
      expect(resultLine(g, i).length).toBeGreaterThan(20);
    }
  });
  it('levels 1 to 5 are unchanged by the new level (same rounds for the same seed)', () => {
    expect(as(buildGame(1, lcg(3)), 'grind').rounds[0].shape).toBe('equal');
    expect(buildGame(5, lcg(3)).kind).toBe('liquid');
    expect(buildGame(4, lcg(3)).kind).toBe('relay');
  });
});

describe('level 4 (relay): a miss shows only the player’s own screen', () => {
  const spots = Array.from({ length: 40 }, (_, i) => i * 7919 + 13);
  it('two wrong screen positions on the same side give the same miss text and the same drawn end, and it never carries the true image position', () => {
    for (const s of spots) {
      const g = as(buildGame(4, lcg(s)), 'relay');
      g.rounds.forEach((r, i) => {
        const cells = grid(SLIDERS.relay.min, SLIDERS.relay.max, SLIDERS.relay.step).filter((x) => !judgeRelay(r, x).ok);
        const front = cells.filter((x) => x > r.screen);
        const behind = cells.filter((x) => x < r.screen);
        for (const group of [front, behind]) {
          expect(group.length).toBeGreaterThan(1);
          const ref = relayMissDraw(r, group[0]);
          for (const x of group) {
            expect(relayMissDraw(r, x)).toEqual(ref);
            expect(missText(g, i, { x })).toBe(missText(g, 0, { x: group[0] }));
          }
          expect(Object.keys(ref).sort()).toEqual(['label', 'rayHalf', 'side', 'spot']);
          expect(JSON.stringify(ref)).not.toMatch(/d{2,}.d|d{3,}/);
        }
        expect(relayMissDraw(r, r.screen + 3).side).toBe('front');
        expect(relayMissDraw(r, r.screen - 3).side).toBe('behind');
      });
    }
  });
});

describe('no leaks, levels 1, 2, 3 and 5: the start, the pools and the misses', () => {
  const many = Array.from({ length: 300 }, (_, i) => i * 104729 + 7);
  const noDigit = (t: string) => expect(t).not.toMatch(/\d/);

  it('the start never wins any row of any level (and level 3’s start gives away no row’s position)', () => {
    for (const s of many) {
      for (const r of as(buildGame(1, lcg(s)), 'grind').rounds) expect(judgeGrind(r, SLIDERS.grind.start).ok).toBe(false);
      for (const r of as(buildGame(2, lcg(s)), 'stack').rounds) expect(judgeStack(r, SLIDERS.stack.start).ok).toBe(false);
      for (const r of as(buildGame(3, lcg(s)), 'projector').rounds) {
        expect(judgeProjector(r, SLIDERS.focal.start, projectorStartX(r.D)).ok).toBe(false);
        for (const m of [1, 2, 3, 4]) expect(Math.abs(projectorStartX(r.D) - r.D / (m + 1))).toBeGreaterThan(0.5);
        expect(projectorStartX(r.D)).toBeGreaterThanOrEqual(5);
        expect(projectorStartX(r.D)).toBeLessThanOrEqual(r.D - 5);
        expect(r.f).not.toBe(SLIDERS.focal.start);
      }
      for (const r of as(buildGame(5, lcg(s)), 'liquid').rounds) expect(judgeLiquid(r, SLIDERS.liquid.start).ok).toBe(false);
    }
  });

  it('level 5: each pool has six distinct answers, they spread over the dial, and no single guess wins two rows of a pool', () => {
    const seen: Record<string, Set<number>> = { vanish: new Set(), target: new Set(), diverge: new Set() };
    for (const s of many) for (const r of as(buildGame(5, lcg(s)), 'liquid').rounds) seen[r.kind].add(Math.round(r.nL * 100));
    expect(VANISH).toHaveLength(6);
    expect(TARGET).toHaveLength(6);
    expect(DIVERGE).toHaveLength(6);
    for (const k of Object.keys(seen)) expect(seen[k].size).toBe(6);
    const all = [...new Set([...seen.vanish, ...seen.target, ...seen.diverge])].sort((a, b) => a - b).map((x) => x / 100);
    expect(all[0]).toBeLessThanOrEqual(1.15);
    expect(all[all.length - 1]).toBeGreaterThanOrEqual(1.85);
    for (let i = 1; i < all.length; i++) expect(all[i] - all[i - 1]).toBeLessThanOrEqual(0.1 + 1e-9);
    // the old pools clustered at 1.20 to 1.25 and 1.75 to 1.80: no value now holds more than two of the eighteen rows
    const count = new Map<number, number>();
    for (const k of Object.keys(seen)) for (const x of seen[k]) count.set(x, (count.get(x) ?? 0) + 1);
    for (const c of count.values()) expect(c).toBeLessThanOrEqual(2);
    // every answer of a kind lies on its own side of the glass: target below, diverge above
    for (const s of many.slice(0, 60)) {
      const [v, t, d] = as(buildGame(5, lcg(s)), 'liquid').rounds;
      expect(t.nL).toBeLessThan(t.nG);
      expect(d.nL).toBeGreaterThan(d.nG);
      expect(v.nL).toBeCloseTo(v.nG, 9);
    }
    // any one guess on the dial wins at most one row of a pool
    for (const g of grid(SLIDERS.liquid.min, SLIDERS.liquid.max, SLIDERS.liquid.step)) {
      for (const k of Object.keys(seen)) expect([...seen[k]].filter((x) => Math.abs(x / 100 - g) <= 0.005 + 1e-9).length).toBeLessThanOrEqual(1);
    }
  });

  it('level 1: every wrong radius on one side gives the same words and the same drawn focus (5 cm beside the sensor), with no number', () => {
    expect(GRIND_MISS_OFFSET).toBe(5);
    for (const s of many.slice(0, 30)) {
      const g = as(buildGame(1, lcg(s)), 'grind');
      g.rounds.forEach((r, i) => {
        const wrong = grid(SLIDERS.grind.min, SLIDERS.grind.max, SLIDERS.grind.step).filter((x) => !judgeGrind(r, x).ok);
        for (const side of ['behind', 'front'] as const) {
          const group = wrong.filter((x) => grindSide(r, x) === side);
          if (group.length === 0) continue;
          expect(new Set(group.map((x) => missText(g, i, { x }))).size).toBe(1);
          expect(new Set(group.map((x) => grindMissFocus(r, x))).size).toBe(1);
          noDigit(missText(g, i, { x: group[0] }));
          expect(grindMissFocus(r, group[0])).toBe(r.f + (side === 'behind' ? 5 : -5));
        }
      });
    }
  });

  it('level 2: every wrong back lens on one side gives the same words and the same drawn focus, with no number', () => {
    expect(STACK_MISS_PX).toBe(60);
    for (const s of many.slice(0, 40)) {
      const g = as(buildGame(2, lcg(s)), 'stack');
      g.rounds.forEach((r, i) => {
        const wrong = grid(SLIDERS.stack.min, SLIDERS.stack.max, SLIDERS.stack.step).filter((x) => !judgeStack(r, x).ok);
        for (const side of ['tooConverging', 'tooDiverging'] as const) {
          const group = wrong.filter((x) => stackSide(r, x) === side);
          if (group.length === 0) continue;
          expect(new Set(group.map((x) => missText(g, i, { x }))).size).toBe(1);
          noDigit(missText(g, i, { x: group[0] }));
          const f = stackMissF(r, side, 3);
          expect(f).not.toBeCloseTo(fromPower(r.target), 6);
          expect(Math.sign(f)).toBe(Math.sign(fromPower(r.target)));
        }
        // too converging draws the focus on the near side of the flag, too diverging on the far side
        expect(stackMissF(r, 'tooConverging', 3)).toBeLessThan(stackMissF(r, 'tooDiverging', 3));
      });
    }
  });

  it('level 3: a miss is worded by category only (where the picture forms, how big), with no number, and the start is the same fraction of D', () => {
    for (const s of many.slice(0, 12)) {
      const g = as(buildGame(3, lcg(s)), 'projector');
      g.rounds.forEach((r, i) => {
        const byKind = new Map<string, Set<string>>();
        const all = new Set<string>();
        for (const f of grid(SLIDERS.focal.min, SLIDERS.focal.max, SLIDERS.focal.step)) {
          for (const x of grid(5, r.D - 5, 1)) {
            if (judgeProjector(r, f, x).ok) continue;
            const t = missText(g, i, { f, x });
            noDigit(t);
            all.add(t);
            const k = JSON.stringify(projectorMiss(r, f, x));
            byKind.set(k, (byKind.get(k) ?? new Set()).add(t));
          }
        }
        byKind.forEach((set) => expect(set.size).toBe(1));
        expect(all.size).toBeLessThanOrEqual(10);
      });
    }
    expect(projectorStartX(80)).toBe(56);
    expect(PROJ_MISS.big).toBeGreaterThan(1);
    expect(PROJ_MISS.small).toBeLessThan(1);
  });

  it('level 5: every wrong liquid on one side gives the same words and the same drawn lens, with no number, and never the true f′', () => {
    expect(LIQUID_MISS_FADE).toBeGreaterThan(0.3);
    for (const s of many.slice(0, 60)) {
      const g = as(buildGame(5, lcg(s)), 'liquid');
      g.rounds.forEach((r, i) => {
        const wrong = grid(SLIDERS.liquid.min, SLIDERS.liquid.max, SLIDERS.liquid.step).filter((n) => !judgeLiquid(r, n).ok);
        for (const side of ['low', 'high'] as const) {
          const group = wrong.filter((n) => liquidSide(r, n) === side);
          expect(group.length).toBeGreaterThan(0);
          expect(new Set(group.map((n) => missText(g, i, { x: n }))).size).toBe(1);
          noDigit(missText(g, i, { x: group[0] }));
          expect(liquidMissF(r, side)).not.toBeCloseTo(Number.isFinite(r.fTarget) ? r.fTarget : 1e9, 3);
        }
        // the sides agree with what the lens really does: lower than the answer converges more, higher converges less or diverges
        const lowF = liquidMissF(r, 'low');
        const highF = liquidMissF(r, 'high');
        if (r.kind === 'vanish') expect([Math.sign(lowF), Math.sign(highF)]).toEqual([1, -1]);
        if (r.kind === 'target') expect(lowF).toBeLessThan(highF);
        if (r.kind === 'diverge') expect(Math.abs(lowF)).toBeGreaterThan(Math.abs(highF));
      });
    }
  });
});
