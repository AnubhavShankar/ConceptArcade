// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch12-atoms/rutherford-range/index';
import { foilRounds, rangeRounds } from '../src/games/physics/class-12/ch12-atoms/rutherford-range/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'rr', 2);
type G = { range: ReturnType<typeof rangeRounds>; foil: ReturnType<typeof foilRounds> };
const build = (level: number, seed: number): G => ({ range: level === 1 ? rangeRounds(createRng(seed)) : [], foil: level === 2 ? foilRounds(createRng(seed)) : [] });
const FIRE = ['Fire the alpha particle at the nucleus', 'Identify the nucleus'];

shellTests<G>(h, {
  levels: [1, 2],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? Math.round(g.range[k].kSol * 100) / 100 : g.foil[k].zSol),
  setWrong: (g, k, level) => h.setSlider(level === 1 ? Math.min(12, g.range[k].kSol * 2) : g.foil[k].zSol > 40 ? 5 : 85),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Alpha’s closest approach', () => {
  it('too much energy gets too close, too little turns back early, and a test shot reads the turning point', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(Math.min(12, g.range[0].kSol * 2));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too close/);
    h.setSlider(Math.max(1, g.range[0].kSol / 2));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/turns back too early/);
    h.click('Test shot: see where the alpha particle turns back');
    expect(h.feedback()).toMatch(/turns back at [\d.]+ fm/);
  });
  it('dragging the energy knob sets the dial in hundredths of an MeV', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 60 + ((2 - 1) / 11) * 520, 314);
    h.pointer('pointermove', 60 + ((5.5 - 1) / 11) * 520, 314);
    expect(Number(h.sliders()[0].value)).toBeCloseTo(5.5, 1);
  });
});

describe('level 2: Sonar’s foil', () => {
  it('names the element when right, and a nucleus with more charge turns the particle back farther out', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(g.foil[0].zSol > 40 ? 5 : 85);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/farther out|too strongly charged/);
    h.setSlider(g.foil[0].zSol);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/Z = \d+/);
    expect(h.phase()).toBe('between');
  });
});

// ---- no leaks: the helper fades, and a miss shows neither the player's turning point nor a true place ----------------------

const TEST_SHOT = ['Test shot: see where the alpha particle turns back', 'Test shot: see where an alpha particle would turn for this Z'];
const HELPER = /^turns back at [\d.]+ fm$/;
const AY = 170;
const frameAfter = (rc: ReturnType<typeof canvasRecorder>, dt: number) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rc.clear();
  h.advance(0.05);
  return rc.rec;
};
const solOf = (g: G, level: number, k: number) => (level === 1 ? Math.round(g.range[k].kSol * 100) / 100 : g.foil[k].zSol);
/** Play rounds 1 to k right, to stand in round k (0-based). */
const playTo = (level: number, round: number) => {
  const g = build(level, 5);
  for (let k = 0; k < round; k++) {
    h.setSlider(solOf(g, level, k));
    h.click(FIRE[level - 1]);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
/** A setting that misses on the given side: high means too much energy (too close) or a Z that is too big. */
const wrong = (g: G, level: number, k: number, side: 'high' | 'low', f: number) => {
  const s = solOf(g, level, k);
  return level === 1 ? (side === 'high' ? Math.min(12, s * (1.4 + 0.5 * f)) : Math.max(1, s * (0.7 - 0.2 * f))) : side === 'high' ? Math.min(92, s + 8 + 2 * f) : Math.max(1, s - 6 - 3 * f);
};
const alphaX = (rec: ReturnType<typeof canvasRecorder>['rec']) => rec.arcs.filter((a) => a.y === AY && a.x !== 540 && a.r > 9 && a.r < 11.5).map((a) => Math.round(a.x * 100) / 100);

describe('no leaks: the helper fades', () => {
  it('round 1 has the live mark; round 2 only for about 1.5 s after a test shot; round 3 never, even after a test shot', () => {
    for (const level of [1, 2]) {
      const rc = canvasRecorder();
      h.start(level, 5);
      expect(texts(frameAfter(rc, 0.1)).some((s) => HELPER.test(s))).toBe(true);
      const g = playTo(level, 1);
      expect(texts(frameAfter(rc, 0.1)).some((s) => HELPER.test(s))).toBe(false);
      h.click(TEST_SHOT[level - 1]);
      expect(texts(frameAfter(rc, 0.3)).some((s) => HELPER.test(s))).toBe(true);
      expect(texts(frameAfter(rc, 1.5)).some((s) => HELPER.test(s))).toBe(false);
      h.setSlider(solOf(g, level, 1));
      h.click(FIRE[level - 1]);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3/);
      expect(texts(frameAfter(rc, 0.1)).some((s) => HELPER.test(s))).toBe(false);
      h.click(TEST_SHOT[level - 1]);
      expect(texts(frameAfter(rc, 0.3)).some((s) => HELPER.test(s))).toBe(false);
    }
  });
  it('the hint text says the mark shows for a moment after a test shot', () => {
    for (const level of [1, 2]) {
      h.start(level, 5);
      playTo(level, 1);
      expect(h.note()).toMatch(/for a moment after a test shot/);
    }
  });
  it('a miss never draws the turning point of the player’s own setting; a win does, after the turn', () => {
    for (const level of [1, 2]) {
      for (const round of [0, 1, 2]) {
        const rc = canvasRecorder();
        h.start(level, 5);
        const g = playTo(level, round);
        h.setSlider(wrong(g, level, round, 'high', 0));
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(texts(frameAfter(rc, 0.05)).some((s) => HELPER.test(s))).toBe(false);
        h.advance(1);
        h.setSlider(solOf(g, level, round));
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(texts(frameAfter(rc, 0.05)).some((s) => HELPER.test(s))).toBe(true);
        h.advance(1);
      }
    }
  });
});

describe('no leaks: misses on one side end the same way, and the start never wins', () => {
  it('two wrong settings on the same side end with the α-particle in the same place and the same words', () => {
    for (const level of [1, 2]) {
      for (const round of [0, 1, 2]) {
        for (const side of ['high', 'low'] as const) {
          const rc = canvasRecorder();
          h.start(level, 5);
          const g = playTo(level, round);
          const ends: { x: number[]; words: string[] }[] = [];
          for (const f of [0, 1]) {
            h.setSlider(wrong(g, level, round, side, f));
            h.click(FIRE[level - 1]);
            h.advance(2.0);
            const rec = frameAfter(rc, 0.05);
            ends.push({ x: alphaX(rec), words: texts(rec).filter((s) => !/^(Z = \d+|\+\d+e|[\d.]+ MeV)$/.test(s)) });
            h.advance(1);
          }
          expect(ends[0].x.length).toBeGreaterThan(0);
          expect(ends[0].x).toEqual(ends[1].x);
          expect(ends[0].words).toEqual(ends[1].words);
        }
      }
    }
  });
  it('the start never wins: firing at once is a miss in every round of both levels', () => {
    for (const level of [1, 2]) {
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
