// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch12-atoms/bohr-orbits/index';
import { bigRounds, lapRounds, ringRounds } from '../src/games/physics/class-12/ch12-atoms/bohr-orbits/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'bo', 3);
type G = { ring: ReturnType<typeof ringRounds>; lap: ReturnType<typeof lapRounds>; big: ReturnType<typeof bigRounds> };
const build = (level: number, seed: number): G => ({ ring: level === 1 ? ringRounds(createRng(seed)) : [], lap: level === 2 ? lapRounds() : [], big: level === 3 ? bigRounds() : [] });
const FIRE = ['Put the electron on this ring', 'Race the electron round the orbit', 'Lock in the number of zeros'];

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => {
    if (level === 1) h.setSlider(g.ring[k].rSol);
    else if (level === 2) {
      h.setSlider(g.lap[k].vSol, 0);
      h.setSlider(g.lap[k].tSol, 1);
    } else h.setSlider(g.big[k].sol);
  },
  setWrong: (g, k, level) => {
    if (level === 1) h.setSlider(Math.min(150, g.ring[k].rSol * 2));
    else if (level === 2) {
      h.setSlider(g.lap[k].vSol, 0);
      h.setSlider(Math.min(130, g.lap[k].tSol * 2), 1);
    } else h.setSlider(g.big[k].sol + 10);
  },
  commit: (level) => h.click(FIRE[level - 1]),
});

const TEST_SHOT = ['Test shot: which level does this ring belong to', 'Test shot: time a lap at this speed'];
const HELPER = [/^n = \d$/, /a lap would take/];
const frameAfter = (rc: ReturnType<typeof canvasRecorder>, dt: number) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rc.clear();
  h.advance(0.05);
  return texts(rc.rec);
};
const setRight2 = (g: G, level: number, k: number) => {
  if (level === 1) h.setSlider(g.ring[k].rSol);
  else {
    h.setSlider(g.lap[k].vSol, 0);
    h.setSlider(g.lap[k].tSol, 1);
  }
};
/** Play rounds 1 to `round` right, to stand in round `round + 1`. */
const playTo = (level: number, round: number) => {
  const g = build(level, 5);
  for (let k = 0; k < round; k++) {
    setRight2(g, level, k);
    h.click(FIRE[level - 1]);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const wrongSide = (g: G, level: number, k: number, side: 'high' | 'low', f: number) => {
  if (level === 1) h.setSlider(side === 'high' ? Math.min(150, g.ring[k].rSol * (1.2 + 0.2 * f)) : g.ring[k].rSol * (0.8 - 0.2 * f));
  else {
    h.setSlider(g.lap[k].vSol, 0);
    h.setSlider(Math.min(130, g.lap[k].tSol * (side === 'high' ? 1.4 + 0.4 * f : 0.7 - 0.2 * f)), 1);
  }
};

describe('no leaks: the helper fades, and a miss shows no true ring or lap time', () => {
  it('round 1 has the live helper; round 2 only for about 1.5 s after a test shot; round 3 never, even after a test shot', () => {
    for (const level of [1, 2]) {
      const rc = canvasRecorder();
      h.start(level, 5);
      expect(frameAfter(rc, 0.1).some((s) => HELPER[level - 1].test(s))).toBe(true);
      const g = playTo(level, 1);
      expect(frameAfter(rc, 0.1).some((s) => HELPER[level - 1].test(s))).toBe(false);
      h.click(TEST_SHOT[level - 1]);
      expect(frameAfter(rc, 0.3).some((s) => HELPER[level - 1].test(s))).toBe(true);
      expect(frameAfter(rc, 1.5).some((s) => HELPER[level - 1].test(s))).toBe(false);
      setRight2(g, level, 1);
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
    for (const level of [1, 2]) {
      h.start(level, 5);
      playTo(level, 1);
      expect(h.note()).toMatch(/for a moment after a test shot/);
    }
  });
  it('a miss never draws the rings or the lap time in rounds 2 and 3; a win does', () => {
    for (const level of [1, 2]) {
      for (const round of [0, 1, 2]) {
        const rc = canvasRecorder();
        h.start(level, 5);
        const g = playTo(level, round);
        wrongSide(g, level, round, 'high', 0);
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(frameAfter(rc, 0.05).some((s) => HELPER[level - 1].test(s))).toBe(round === 0);
        h.advance(1);
        setRight2(g, level, round);
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(frameAfter(rc, 0.05).some((s) => HELPER[level - 1].test(s))).toBe(true);
        h.advance(1);
      }
    }
  });
  it('two wrong settings on the same side end on the same scene: the same words, only the player’s own label differs', () => {
    const own = [/^[\d.]+ × 10⁻¹¹ m$/, /^[\d.]+$/];
    for (const level of [1, 2]) {
      for (const side of ['high', 'low'] as const) {
        const rc = canvasRecorder();
        h.start(level, 5);
        const g = playTo(level, 1);
        const ends: string[][] = [];
        for (const f of [0, 1]) {
          wrongSide(g, level, 1, side, f);
          h.click(FIRE[level - 1]);
          h.advance(2.0);
          ends.push(frameAfter(rc, 0.05).filter((t) => !own[level - 1].test(t)));
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
        const g = build(level, 5);
        for (let k = 0; k < round; k++) {
          if (level === 3) h.setSlider(g.big[k].sol);
          else setRight2(g, level, k);
          h.click(FIRE[level - 1]);
          h.advance(2.8);
          h.advance(1);
        }
        const hearts = h.hearts();
        h.click(FIRE[level - 1]);
        h.advance(2.8);
        expect(h.hearts()).toBe(hearts - 1);
      }
    }
  });
});

describe('level 1: Hop’s ring', () => {
  it('a ring too wide or too small is described; a test shot says which level it belongs to', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(Math.min(150, g.ring[0].rSol * 2));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too wide/);
    h.setSlider(Math.max(1, g.ring[0].rSol / 2));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too small/);
    h.click('Test shot: which level does this ring belong to');
    expect(h.feedback()).toMatch(/would belong to level n = [\d.]+/);
  });
  it('dragging the ring handle sets the radius', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 330 + 1.2 * 10, 170);
    h.pointer('pointermove', 330 + 1.2 * 47.7, 170);
    expect(Number(h.sliders()[0].value)).toBeCloseTo(47.7, 1);
  });
});

describe('level 2: Lap’s race', () => {
  it('has two dials; the right speed with the wrong lap time is named as such', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.sliders()).toHaveLength(2);
    h.setSlider(g.lap[0].vSol, 0);
    h.setSlider(30, 1);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/speed is right/);
    expect(h.hearts()).toBe(2);
  });
});

describe('level 3: Giga’s zeros', () => {
  it('a number with too many or too few zeros is described, and the rounds go ball, Moon, Earth', () => {
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.note()).toMatch(/1 kg ball/);
    h.setSlider(g.big[0].sol + 10);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too many zeros/);
    h.setSlider(g.big[0].sol);
    h.click(FIRE[2]);
    h.advance(2.8);
    h.advance(1);
    expect(h.note()).toMatch(/Moon/);
  });
});
