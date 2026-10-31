// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch14-semiconductor-electronics-materials-devices-and-simple-circuits/gap-jump/index';
import { dopeRounds, gapRounds } from '../src/games/physics/class-12/ch14-semiconductor-electronics-materials-devices-and-simple-circuits/gap-jump/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'gap-jump', 2);
type G = { gap: ReturnType<typeof gapRounds>; dope: ReturnType<typeof dopeRounds> };
const build = (level: number, seed: number): G => ({ gap: level === 1 ? gapRounds(createRng(seed)) : [], dope: level === 2 ? dopeRounds(createRng(seed)) : [] });
const FIRE = ['Fire the photon at the electron', 'Dope the crystal with these carrier counts'];

shellTests<G>(h, {
  levels: [1, 2],
  build,
  setRight: (g, k, level) => {
    if (level === 1) h.setSlider(Math.round(g.gap[k].sol));
    else {
      h.setSlider(g.dope[k].logE, 0);
      h.setSlider(g.dope[k].logH, 1);
    }
  },
  setWrong: (g, k, level) => {
    if (level === 1) h.setSlider(Math.min(2000, Math.round(g.gap[k].sol * 1.5)));
    else {
      h.setSlider(g.dope[k].logE + 1, 0);
      h.setSlider(g.dope[k].logH, 1);
    }
  },
  commit: (level) => h.click(FIRE[level - 1]),
});

// ---- no leaks: the helper fades, and a miss shows no true value ---------------------------------------------------------------
const TEST_SHOT = ['Test shot: read the photon energy and the gap', 'Test shot: read the dopant and the silicon atoms'];
/** What the true helper draws: the energy meter with its photon and gap labels; the dopant’s carrier label and the two checks. */
const HELPER = [/^photon [\d.]+ eV$|^gap [\d.]+ eV$/, /^n_e n_h = |^spare electron$|^a hole$|^electrons ≤ |^holes ≤ /];
const hasHelper = (t: string[], level: number) => t.some((s) => HELPER[level - 1].test(s));
const frameAfter = (rc: ReturnType<typeof canvasRecorder>, dt: number) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rc.clear();
  h.advance(0.05);
  return texts(rc.rec);
};
/** The dial that holds the majority carrier of a doping round: electrons for n-type, holes for p-type. */
const majDial = (r: G['dope'][number]) => (r.type === 'n' ? 0 : 1);
const setRightK = (g: G, level: number, k: number) => {
  if (level === 1) h.setSlider(Math.round(g.gap[k].sol));
  else {
    h.setSlider(g.dope[k].logE, 0);
    h.setSlider(g.dope[k].logH, 1);
  }
};
/** Two settings that miss on the same side: the majority too high, or too low, with the other dial right; or a photon too weak, or with energy to spare. */
const setSide = (g: G, level: number, k: number, side: 'high' | 'low', f: number) => {
  if (level === 1) h.setSlider(Math.round(side === 'high' ? g.gap[k].sol * (1.3 + 0.5 * f) : g.gap[k].sol / (1.3 + 0.5 * f)));
  else {
    const r = g.dope[k];
    setRightK(g, 2, k);
    const d = majDial(r);
    const v = d === 0 ? r.logE : r.logH;
    h.setSlider(side === 'high' ? v + 0.6 + 0.6 * f : v - 1 - f, d);
  }
};
const playTo = (level: number, seed: number, round: number) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    setRightK(g, level, k);
    h.click(FIRE[level - 1]);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

describe('no leaks: the helper fades, and a miss shows no true value', () => {
  it('round 1 has the live helper; round 2 only for about 1.5 s after a test shot; round 3 never, even after a test shot', () => {
    for (const level of [1, 2]) {
      const rc = canvasRecorder();
      h.start(level, 5);
      expect(hasHelper(frameAfter(rc, 0.1), level)).toBe(true);
      const g = playTo(level, 5, 1);
      expect(hasHelper(frameAfter(rc, 0.1), level)).toBe(false);
      h.click(TEST_SHOT[level - 1]);
      expect(hasHelper(frameAfter(rc, 0.3), level)).toBe(true);
      expect(hasHelper(frameAfter(rc, 1.5), level)).toBe(false);
      setRightK(g, level, 1);
      h.click(FIRE[level - 1]);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3/);
      expect(hasHelper(frameAfter(rc, 0.1), level)).toBe(false);
      h.click(TEST_SHOT[level - 1]);
      expect(hasHelper(frameAfter(rc, 0.3), level)).toBe(false);
    }
  });
  it('the hint text says the helper shows for a moment after a test shot', () => {
    for (const level of [1, 2]) {
      h.start(level, 5);
      playTo(level, 5, 1);
      expect(h.note()).toMatch(/for a moment after a test shot/);
    }
  });
  it('a miss in round 2 or 3 never draws the helper (not the carrier label either); a win does', () => {
    for (const level of [1, 2]) {
      for (const round of [1, 2]) {
        const rc = canvasRecorder();
        h.start(level, 5);
        const g = playTo(level, 5, round);
        setSide(g, level, round, 'high', 0);
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(hasHelper(frameAfter(rc, 0.05), level)).toBe(false);
        h.advance(1);
        setRightK(g, level, round);
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(hasHelper(frameAfter(rc, 0.05), level)).toBe(true);
        h.advance(1);
      }
    }
  });
  it('two wrong settings on the same side give the same words and the same drawn end', () => {
    for (const level of [1, 2]) {
      for (const side of ['high', 'low'] as const) {
        const rc = canvasRecorder();
        const ends: string[][] = [];
        const says: string[] = [];
        for (const f of [0, 1]) {
          h.start(level, 5);
          const g = playTo(level, 5, 2);
          setSide(g, level, 2, side, f);
          h.click(FIRE[level - 1]);
          h.advance(2.0);
          ends.push(frameAfter(rc, 0.05));
          h.advance(1);
          says.push(h.feedback());
        }
        expect(says[0]).toBe(says[1]);
        expect(says[0]).not.toMatch(/\d/);
        expect(ends[0]).toEqual(ends[1]);
      }
    }
  });
  it('a wrong-majority miss does not name the carrier or the valence of the dopant', () => {
    h.start(2, 5);
    const g = playTo(2, 5, 2);
    const r = g.dope[2];
    h.setSlider(10, majDial(r));
    h.setSlider(15, 1 - majDial(r));
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/wrong way round/);
    expect(h.feedback()).not.toMatch(/spare electron|hole,|valence|\d/);
  });
  it('the start never wins: firing at once is a miss in every round of both levels', () => {
    for (const level of [1, 2]) {
      for (const round of [0, 1, 2]) {
        h.start(level, 5);
        playTo(level, 5, round);
        const hearts = h.hearts();
        h.click(FIRE[level - 1]);
        h.advance(2.8);
        expect(h.hearts()).toBe(hearts - 1);
      }
    }
  });
});

describe('level 1: Sparky’s jump', () => {
  it('a photon that is too weak and one with energy to spare are described, and a test shot reads the photon energy', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(Math.min(2000, Math.round(g.gap[0].sol * 1.5)));
    h.click(FIRE[0]);
    h.advance(3.2);
    expect(h.feedback()).toMatch(/too weak/);
    h.setSlider(Math.round(g.gap[0].sol / 1.5));
    h.click(FIRE[0]);
    h.advance(3.2);
    expect(h.feedback()).toMatch(/energy to spare/);
    h.click('Test shot: read the photon energy and the gap');
    expect(h.feedback()).toMatch(/eV/);
  });
  it('dragging the handle sets the wavelength', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 60 + (520 * (600 - 100)) / 1900, 312);
    h.pointer('pointermove', 60 + (520 * (1000 - 100)) / 1900, 312);
    expect(Number(h.sliders()[0].value)).toBeCloseTo(1000, -1);
  });
});

describe('level 2: Doper’s crystal', () => {
  it('two dials; the wrong majority and the wrong minority are described; the checks fade', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.sliders()).toHaveLength(2);
    expect(h.note()).toMatch(/live checks are on/);
    const d = majDial(g.dope[0]);
    const maj = d === 0 ? g.dope[0].logE : g.dope[0].logH;
    const min = d === 0 ? g.dope[0].logH : g.dope[0].logE;
    h.setSlider(maj + 1, d);
    h.setSlider(min, 1 - d);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/more free carriers than dopant atoms/);
    h.setSlider(maj, d);
    h.setSlider(min + 1, 1 - d);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/recombine/);
    h.click('Test shot: read the dopant and the silicon atoms');
    expect(h.feedback()).toMatch(/valence electrons/);
  });
});
