// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch13-nuclei/binding-lab/index';
import { bindRounds, powerRounds, qRounds } from '../src/games/physics/class-12/ch13-nuclei/binding-lab/logic';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'bl', 3);
type G = { bind: ReturnType<typeof bindRounds>; q: ReturnType<typeof qRounds>; power: ReturnType<typeof powerRounds> };
const build = (level: number): G => ({ bind: level === 1 ? bindRounds() : [], q: level === 2 ? qRounds() : [], power: level === 3 ? powerRounds() : [] });
const FIRE = ['Pull the nucleus apart with this energy', 'Settle the reaction at this Q value', 'Switch the power plant on'];

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? g.bind[k].sol : level === 2 ? g.q[k].sol : g.power[k].sol),
  setWrong: (g, k, level) => h.setSlider(level === 1 ? Math.min(1800, g.bind[k].sol * 1.5) : level === 2 ? -g.q[k].sol : g.power[k].sol > 15 ? 3 : 25),
  commit: (level) => h.click(FIRE[level - 1]),
});

const TEST_SHOT = ['Test shot: read the mass defect', 'Test shot: weigh the two sides of the reaction', 'Test shot: count the events in the fuel'];
const HELPER = [/mass defect Δm = /, /\d u$/, /^(all atoms fission|all of its mass|fused by)/];
const REAL = /^real/;
/** One drawn frame after the clock has run `dt` seconds. */
const frameAfter = (rc: ReturnType<typeof canvasRecorder>, dt: number) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rc.clear();
  h.advance(0.05);
  return texts(rc.rec);
};
/** Play rounds 1 to k-1 right, to stand in round k (0-based). */
const playTo = (level: number, round: number) => {
  const g = build(level);
  for (let k = 0; k < round; k++) {
    h.setSlider(level === 1 ? g.bind[k].sol : level === 2 ? g.q[k].sol : g.power[k].sol);
    h.click(FIRE[level - 1]);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const solOf = (g: G, level: number, k: number) => (level === 1 ? g.bind[k].sol : level === 2 ? g.q[k].sol : g.power[k].sol);
const wrongSet = (g: G, level: number, k: number, side: 'high' | 'low') => {
  const s = solOf(g, level, k);
  return level === 1 ? (side === 'high' ? s * (k === 0 ? 1.5 : 1.2) : s * (k === 0 ? 0.5 : 0.8)) : level === 2 ? (side === 'high' ? Math.min(9, s + 4) : Math.max(-29, s - 4)) : side === 'high' ? s + (k === 0 ? 6 : 4) : Math.max(0.5, s - 3);
};

describe('no leaks: the helper fades, and a miss shows no true value', () => {
  it('round 1 has the live helper; round 2 only for about 1.5 s after a test shot; round 3 never, even after a test shot', () => {
    for (const level of [1, 2, 3]) {
      const rc = canvasRecorder();
      h.start(level, 5);
      expect(frameAfter(rc, 0.1).some((s) => HELPER[level - 1].test(s))).toBe(true);
      playTo(level, 1);
      expect(frameAfter(rc, 0.1).some((s) => HELPER[level - 1].test(s))).toBe(false);
      h.click(TEST_SHOT[level - 1]);
      expect(frameAfter(rc, 0.3).some((s) => HELPER[level - 1].test(s))).toBe(true);
      expect(frameAfter(rc, 1.5).some((s) => HELPER[level - 1].test(s))).toBe(false);
      h.setSlider(solOf(build(level), level, 1));
      h.click(FIRE[level - 1]);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3/);
      expect(frameAfter(rc, 0.1).some((s) => HELPER[level - 1].test(s))).toBe(false);
      h.click(TEST_SHOT[level - 1]);
      expect(frameAfter(rc, 0.3).some((s) => HELPER[level - 1].test(s))).toBe(false);
    }
  });
  it('the hint text says the helper shows for a moment after a test shot', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      playTo(level, 1);
      expect(h.note()).toMatch(/for a moment after a test shot/);
    }
  });
  it('a miss never draws the true value; a win does', () => {
    for (const level of [1, 2, 3]) {
      for (const round of [0, 1, 2]) {
        const rc = canvasRecorder();
        h.start(level, 5);
        const g = playTo(level, round);
        h.setSlider(wrongSet(g, level, round, 'high'));
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        const miss = frameAfter(rc, 0.05);
        expect(miss.some((s) => REAL.test(s))).toBe(false);
        expect(miss.some((s) => HELPER[level - 1].test(s))).toBe(round === 0);
        h.advance(1);
        h.setSlider(solOf(g, level, round));
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(frameAfter(rc, 0.05).some((s) => REAL.test(s))).toBe(true);
        h.advance(1);
      }
    }
  });
  it('two wrong settings on the same side end on the same scene: the same words, only the player’s own label differs', () => {
    for (const level of [1, 2, 3]) {
      for (const side of ['high', 'low'] as const) {
        const rc = canvasRecorder();
        h.start(level, 5);
        const g = build(level);
        const ends: string[][] = [];
        const own = /^[+−-]?[\d.]+( MeV| × 10¹³ J)$/;
        for (const f of [0, 1]) {
          const s = solOf(g, level, 0);
          const x = level === 1 ? (side === 'high' ? s * (1.3 + 0.4 * f) : s * (0.6 - 0.2 * f)) : level === 2 ? (side === 'high' ? s + 2 + 1.5 * f : s - 3 - 3 * f) : side === 'high' ? s + 3 + 4 * f : Math.max(0.5, s - 2 - 2 * f);
          h.setSlider(x);
          h.click(FIRE[level - 1]);
          h.advance(2.0);
          ends.push(frameAfter(rc, 0.05).filter((t) => !own.test(t)));
          h.advance(1);
        }
        expect(ends[0]).toEqual(ends[1]);
      }
    }
  });
  it('the start never wins: firing at once is a miss in every round of every level', () => {
    for (const level of [1, 2, 3]) {
      for (const round of [0, 1, 2]) {
        h.start(level, 5);
        playTo(level, round);
        const hearts = h.hearts();
        h.click(FIRE[level - 1]);
        h.advance(2.8);
        expect(h.hearts()).toBe(hearts - 1);
      }
    }
  });
});

describe('level 1: Jenga’s tower', () => {
  it('a test shot reads the mass defect, and paying too much or too little is described, not corrected', () => {
    h.start(1, 5);
    const g = build(1);
    h.click('Test shot: read the mass defect');
    expect(h.feedback()).toMatch(/mass defect is [\d.]+ u/);
    h.setSlider(Math.min(1800, g.bind[0].sol * 2));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/more binding/);
    h.setSlider(g.bind[0].sol / 2);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too little/);
  });
});

describe('level 2: Coin’s trades', () => {
  it('the wrong sign is named as the wrong direction; the rounds are the textbook reactions', () => {
    h.start(2, 5);
    const g = build(2);
    expect(h.note()).toMatch(/¹₁H \+ ³₁H/);
    h.setSlider(-g.q[0].sol);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/sign is wrong/);
  });
});

describe('level 3: Plant’s fuel', () => {
  it('the fuels come in order of energy; a test shot counts the events', () => {
    h.start(3, 5);
    expect(h.note()).toMatch(/plutonium-239/);
    h.click('Test shot: count the events in the fuel');
    expect(h.feedback()).toMatch(/atoms|kilogram/);
  });
});
