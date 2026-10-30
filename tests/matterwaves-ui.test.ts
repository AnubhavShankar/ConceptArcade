// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch11-dual-nature-of-radiation-and-matter/matter-waves/index';
import { countRounds, electronNm, tubeRounds, tuneRounds } from '../src/games/physics/class-12/ch11-dual-nature-of-radiation-and-matter/matter-waves/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'mw', 3);
type G = { count: ReturnType<typeof countRounds>; tune: ReturnType<typeof tuneRounds>; tube: ReturnType<typeof tubeRounds> };
const build = (level: number, seed: number): G => ({ count: level === 1 ? countRounds(createRng(seed)) : [], tune: level === 2 ? tuneRounds(createRng(seed)) : [], tube: level === 3 ? tubeRounds(createRng(seed)) : [] });
const FIRE = ['Lock in the photon count', 'Send the electron at the crystal', 'Fire the X-ray tube at this voltage'];
const voltFor = (target: number) => Math.round((6.63e-34 / (target * 1e-9)) ** 2 / (2 * 9.1e-31 * 1.6e-19));

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? g.count[k].nSol : level === 2 ? voltFor(g.tune[k].target) : g.tube[k].kvSol),
  setWrong: (g, k, level) => h.setSlider(level === 1 ? g.count[k].nSol * 2 > 30 ? g.count[k].nSol / 2 : g.count[k].nSol * 2 : level === 2 ? (voltFor(g.tune[k].target) > 300 ? 50 : 700) : g.tube[k].kvSol === 50 ? 10 : 70),
  commit: (level) => h.click(FIRE[level - 1]),
});

const TEST_SHOT = ['Test shot: read the energy of one photon', 'Test shot: measure the electron’s wavelength', 'Test shot: read the shortest wavelength'];
const HELPER = [/^beam: /, /^your electron: /, /^cut-off /];
const OWN = [/^[\d.]+ × 10¹⁵ per second$/, /^[\d.]+ V$/, /^[\d.]+ kV$/];
const solOf = (g: G, level: number, k: number) => (level === 1 ? g.count[k].nSol : level === 2 ? voltFor(g.tune[k].target) : g.tube[k].kvSol);
const frameAfter = (rc: ReturnType<typeof canvasRecorder>, dt: number) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rc.clear();
  h.advance(0.05);
  return texts(rc.rec);
};
/** Play rounds 1 to `round` right, to stand in round `round + 1`. */
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
const wrongSide = (g: G, level: number, k: number, side: 'high' | 'low', f: number) => {
  const s = solOf(g, level, k);
  h.setSlider(level === 1 ? (side === 'high' ? s * (1.3 + 0.4 * f) : s * (0.8 - 0.2 * f)) : level === 2 ? (side === 'high' ? s * (1.3 + 0.3 * f) : s * (0.8 - 0.2 * f)) : side === 'high' ? s * (1.3 + 0.3 * f) : s * (0.7 - 0.2 * f));
};

describe('no leaks: the helper fades, and a miss shows no true value', () => {
  it('round 1 has the live helper; round 2 only for about 1.5 s after a test shot; round 3 never, even after a test shot', () => {
    for (const level of [1, 2, 3]) {
      const rc = canvasRecorder();
      h.start(level, 5);
      expect(frameAfter(rc, 0.1).some((s) => HELPER[level - 1].test(s))).toBe(true);
      const g = playTo(level, 1);
      expect(frameAfter(rc, 0.1).some((s) => HELPER[level - 1].test(s))).toBe(false);
      h.click(TEST_SHOT[level - 1]);
      expect(frameAfter(rc, 0.3).some((s) => HELPER[level - 1].test(s))).toBe(true);
      expect(frameAfter(rc, 1.5).some((s) => HELPER[level - 1].test(s))).toBe(false);
      h.setSlider(solOf(g, level, 1));
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
  it('a miss never draws the player’s own value or the true one in rounds 2 and 3; a win does', () => {
    for (const level of [1, 2, 3]) {
      for (const round of [0, 1, 2]) {
        const rc = canvasRecorder();
        h.start(level, 5);
        const g = playTo(level, round);
        wrongSide(g, level, round, 'high', 0);
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(frameAfter(rc, 0.05).some((s) => HELPER[level - 1].test(s))).toBe(round === 0);
        h.advance(1);
        h.setSlider(solOf(g, level, round));
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(frameAfter(rc, 0.05).some((s) => HELPER[level - 1].test(s))).toBe(true);
        h.advance(1);
      }
    }
  });
  it('two wrong settings on the same side end on the same scene in rounds 2 and 3: the same words, only the player’s own label differs', () => {
    for (const level of [1, 2, 3]) {
      for (const side of ['high', 'low'] as const) {
        const rc = canvasRecorder();
        h.start(level, 5);
        const g = playTo(level, 1);
        const ends: string[][] = [];
        for (const f of [0, 1]) {
          wrongSide(g, level, 1, side, f);
          h.click(FIRE[level - 1]);
          h.advance(2.0);
          ends.push(frameAfter(rc, 0.05).filter((t) => !OWN[level - 1].test(t)));
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

describe('level 1: Pixel’s photon count', () => {
  it('a test shot reads the photon energy; counting too many or too few is described, not corrected', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.click('Test shot: read the energy of one photon');
    expect(h.feedback()).toMatch(/Each photon carries [\d.]+ × 10⁻¹⁹ J/);
    h.setSlider(Math.min(30, g.count[0].nSol * 2));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/more photons/);
    h.setSlider(Math.max(1, g.count[0].nSol / 2));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/fewer photons/);
  });
});

describe('level 2: Eli’s tuning', () => {
  it('too low a voltage gives a wave too long; too high a voltage a wave too short; a test shot reads the wavelength', () => {
    h.start(2, 5);
    const g = build(2, 5);
    const v = voltFor(g.tune[0].target);
    h.setSlider(10);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too long/);
    h.setSlider(800);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too short/);
    h.click('Test shot: measure the electron’s wavelength');
    expect(h.feedback()).toMatch(/de Broglie wavelength is [\d.]+ nm/);
    expect(electronNm(v)).toBeCloseTo(g.tune[0].target, 2);
  });
});

describe('level 3: Charge’s power shot', () => {
  it('a test shot gives the shortest wavelength and the highest frequency; dragging the charge knob sets the voltage', () => {
    h.start(3, 5);
    h.click('Test shot: read the shortest wavelength');
    expect(h.feedback()).toMatch(/shortest X-ray wavelength is [\d.]+ Å/);
    h.pointer('pointerdown', 60 + ((10 - 5) / 75) * 520, 314);
    h.pointer('pointermove', 60 + ((40 - 5) / 75) * 520, 314);
    expect(h.sliders()[0].value).toBe('40');
  });
});
