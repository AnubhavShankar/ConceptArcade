// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch14-semiconductor-electronics-materials-devices-and-simple-circuits/gap-jump/index';
import { dopeRounds, gapRounds } from '../src/games/physics/class-12/ch14-semiconductor-electronics-materials-devices-and-simple-circuits/gap-jump/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

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
    h.setSlider(g.dope[0].logE + 1, 0);
    h.setSlider(g.dope[0].logH, 1);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/more free carriers than dopant atoms/);
    h.setSlider(g.dope[0].logE, 0);
    h.setSlider(g.dope[0].logH + 1, 1);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/recombine/);
    h.click('Test shot: read the dopant and the silicon atoms');
    expect(h.feedback()).toMatch(/valence electrons/);
  });
});
