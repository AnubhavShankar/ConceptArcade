import { describe, expect, it } from 'vitest';
import {
  CONE_MIN,
  PROBE_DEG,
  SLIDER,
  acceptanceDeg,
  apparentDepth,
  asinD,
  buildGame,
  coneMax,
  coneRadius,
  criticalDeg,
  explainRound,
  judgeCone,
  judgeDepth,
  judgePipe,
  judgeSlab,
  judgeSnell,
  missText,
  probeText,
  refractDeg,
  resultLine,
  sinD,
  slabShift,
  type Game,
} from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const as = <K extends Game['kind']>(g: Game, _kind: K) => g as Extract<Game, { kind: K }>;
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);

describe('the numbers from the textbook', () => {
  it('Exercise 9.3: 12.5 cm of water that looks 9.4 cm deep has n = 1.33; in a liquid of n = 1.63 it looks 7.67 cm, so the microscope rises 1.73 cm', () => {
    expect(12.5 / 9.4).toBeCloseTo(1.33, 2);
    expect(apparentDepth(12.5, 1.63)).toBeCloseTo(7.67, 2);
    expect(9.4 - apparentDepth(12.5, 1.63)).toBeCloseTo(1.73, 2);
  });
  it('Exercise 9.4: air-glass 60° → 35.3°, air-water 60° → 40.6°; water at 45° into glass gives about 38.8°', () => {
    const nG = sinD(60) / sinD(35.3);
    const nW = sinD(60) / sinD(40.6);
    expect(asinD((nW * sinD(45)) / nG)).toBeCloseTo(38.8, 0);
  });
  it('Exercise 9.5: a bulb 80 cm under water (n = 1.33) lights a circle of radius 91 cm', () => {
    expect(coneRadius(80, 1.33)).toBeCloseTo(91.1, 0);
  });
  it('Exercise 9.16: a 15 cm slab of n = 1.5 raises the pin by 5 cm', () => {
    expect(slabShift(15, 1.5)).toBeCloseTo(5, 9);
  });
  it('Exercise 9.17: core 1.68, cladding 1.44 gives 60°; with no cladding every angle is guided', () => {
    expect(acceptanceDeg(1.68, 1.44)).toBeCloseTo(60, 0);
    expect(acceptanceDeg(1.68, 1)).toBe(90);
  });
  it('the critical angle of water is about 48.8°', () => {
    expect(criticalDeg(1.33)).toBeCloseTo(48.75, 1);
  });
});

describe('every game has three solvable rounds', () => {
  it('level 1: air first, then two water-side rounds; each round is solvable from the probe data a player is given', () => {
    for (const s of seeds) {
      const g = as(buildGame(1, lcg(s)), 'snell');
      expect(g.rounds).toHaveLength(3);
      expect(g.charges).toEqual([2, 2, 2]);
      expect(g.rounds[0].probeA).toBeNull();
      expect(g.rounds[1].probeA).not.toBeNull();
      for (const r of g.rounds) {
        const nA = r.probeA === null ? 1 : sinD(PROBE_DEG) / sinD(r.probeA);
        const nB = sinD(PROBE_DEG) / sinD(r.probeB);
        const i = asinD((nB * sinD(r.rShown)) / nA);
        expect(Math.round(i)).toBe(r.iSol);
        expect(r.nB).toBeGreaterThan(r.nA);
      }
    }
  });
  it('level 1: exactly one whole-degree incidence puts Ray on the detector', () => {
    for (const s of seeds.slice(0, 40)) {
      for (const r of as(buildGame(1, lcg(s)), 'snell').rounds) {
        const winners = grid(SLIDER.snell.min, SLIDER.snell.max, SLIDER.snell.step).filter((i) => judgeSnell(r, i).ok);
        expect(winners).toEqual([r.iSol]);
      }
    }
  });
  it('level 2: the move is a multiple of 0.5 cm inside the slider range, increasing in size, and exactly one setting wins', () => {
    for (const s of seeds) {
      const g = as(buildGame(2, lcg(s)), 'depth');
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      const sizes = g.rounds.map((r) => Math.abs(r.move));
      expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
      for (const r of g.rounds) {
        expect(r.move * 2).toBeCloseTo(Math.round(r.move * 2), 9);
        expect(r.move).toBeGreaterThanOrEqual(SLIDER.depth.min);
        expect(r.move).toBeLessThanOrEqual(SLIDER.depth.max);
        expect(r.n1).not.toBe(r.n2);
        expect(r.move > 0).toBe(r.n2 > r.n1);
        const w = grid(SLIDER.depth.min, SLIDER.depth.max, SLIDER.depth.step).filter((v) => judgeDepth(r, v).ok);
        expect(w).toHaveLength(1);
        expect(w[0]).toBeCloseTo(r.move, 9);
      }
    }
  });
  it('level 3: the raise is a multiple of 0.5 cm, the slab sits in a different place each round, and exactly one setting wins', () => {
    for (const s of seeds) {
      const g = as(buildGame(3, lcg(s)), 'slab');
      expect(new Set(g.rounds.map((r) => r.slabAt)).size).toBe(3);
      const shifts = g.rounds.map((r) => r.shift);
      expect(shifts).toEqual([...shifts].sort((a, b) => a - b));
      for (const r of g.rounds) {
        expect(r.shift).toBeLessThan(r.t);
        expect(r.shift * 2).toBeCloseTo(Math.round(r.shift * 2), 9);
        const w = grid(SLIDER.slab.min, SLIDER.slab.max, SLIDER.slab.step).filter((v) => judgeSlab(r, v).ok);
        expect(w).toHaveLength(1);
        expect(w[0]).toBeCloseTo(r.shift, 9);
      }
    }
  });
  it('level 4: the radius fits the slider, and the nearest whole centimetre wins', () => {
    for (const s of seeds) {
      const g = as(buildGame(4, lcg(s)), 'cone');
      for (const r of g.rounds) {
        expect(r.radius).toBeGreaterThan(CONE_MIN);
        expect(r.radius).toBeLessThan(coneMax(r.d));
        expect(judgeCone(r, Math.round(r.radius)).ok).toBe(true);
      }
      expect(g.rounds.map((r) => r.d)).toEqual([...g.rounds.map((r) => r.d)].sort((a, b) => a - b));
    }
  });
  it('level 5: two clad fibres then the bare one, where every angle is guided', () => {
    for (const s of seeds) {
      const g = as(buildGame(5, lcg(s)), 'pipe');
      expect(g.rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(g.rounds[2].n2).toBe(1);
      expect(g.rounds[2].maxDeg).toBe(90);
      expect(g.rounds[0].maxDeg).toBeLessThanOrEqual(g.rounds[1].maxDeg);
      for (const r of g.rounds) {
        expect(judgePipe(r, Math.round(r.maxDeg)).ok).toBe(true);
        expect(r.maxDeg).toBeGreaterThan(20);
      }
    }
  });
  it('every game has a hero with a name, a story and an objective', () => {
    for (const lv of [1, 2, 3, 4, 5]) {
      const g = buildGame(lv, lcg(5));
      expect(g.hero.name.length).toBeGreaterThan(2);
      expect(g.hero.story.length).toBeGreaterThan(60);
      expect(g.hero.objective.length).toBeGreaterThan(30);
    }
  });
});

describe('judging: classic mistakes and lucky guesses do not win', () => {
  it('level 1 rejects the detector angle itself and the unrefracted straight-through angle', () => {
    for (const r of as(buildGame(1, lcg(3)), 'snell').rounds) {
      expect(judgeSnell(r, Math.round(r.r)).ok).toBe(r.iSol === Math.round(r.r));
      expect(judgeSnell(r, r.iSol + 1).ok).toBe(false);
    }
  });
  it('level 2 needs the right sign: up and down are different answers', () => {
    const r = as(buildGame(2, lcg(3)), 'depth').rounds[0];
    expect(judgeDepth(r, r.move).ok).toBe(true);
    expect(judgeDepth(r, -r.move).ok).toBe(false);
    expect(judgeDepth(r, 0).ok).toBe(false);
  });
  it('level 3 rejects the slab thickness and t/n', () => {
    const r = as(buildGame(3, lcg(3)), 'slab').rounds[0];
    expect(judgeSlab(r, r.t).ok).toBe(false);
    expect(judgeSlab(r, r.t / r.n).ok).toBe(false);
  });
  it('level 4 rejects the depth itself and d sin θc', () => {
    const r = as(buildGame(4, lcg(3)), 'cone').rounds[0];
    expect(judgeCone(r, r.d).ok).toBe(false);
    expect(judgeCone(r, r.d * sinD(criticalDeg(r.n))).ok).toBe(false);
  });
  it('level 5: a narrower angle is guided but not the objective, a wider one leaks', () => {
    for (const s of seeds.slice(0, 40)) {
      for (const r of as(buildGame(5, lcg(s)), 'pipe').rounds) {
        expect(judgePipe(r, r.maxDeg * 0.5)).toMatchObject({ ok: false, guided: true });
        if (r.maxDeg < 85) expect(judgePipe(r, Math.round(r.maxDeg) + 5)).toMatchObject({ ok: false, guided: false });
      }
    }
  });
});

describe('words: the working and the misses', () => {
  it('every round explains itself with two lines of working', () => {
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
  it('a miss describes the effect and never gives the answer', () => {
    const g4 = as(buildGame(4, lcg(3)), 'cone');
    const r = g4.rounds[0];
    expect(missText(g4, 0, r.radius * 0.5)).toMatch(/still escapes/);
    expect(missText(g4, 0, r.radius * 1.5)).toMatch(/wider than it needs/);
    expect(missText(g4, 0, r.radius * 0.5)).not.toContain(String(Math.round(r.radius)));
    const g5 = as(buildGame(5, lcg(3)), 'pipe');
    expect(missText(g5, 0, 89)).toMatch(/leaks out/);
    expect(missText(g5, 0, 5)).toMatch(/wider beam/);
  });
  it('probes read out in words, and air is not bent', () => {
    const r = as(buildGame(1, lcg(3)), 'snell').rounds[0];
    expect(probeText('A', r)).toMatch(/air/);
    expect(probeText('B', r)).toContain(`${PROBE_DEG}°`);
    expect(refractDeg(1, 1.5, 60)).toBeCloseTo(35.3, 1);
  });
});
