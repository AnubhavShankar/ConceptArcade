// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch11-dual-nature-of-radiation-and-matter/photon-cannon/index';
import { H, lineRounds, stopRounds, thresholdRounds } from '../src/games/physics/class-12/ch11-dual-nature-of-radiation-and-matter/photon-cannon/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'pc', 3);
type G = { thr: ReturnType<typeof thresholdRounds>; stop: ReturnType<typeof stopRounds>; line: ReturnType<typeof lineRounds> };
const build = (level: number, seed: number): G => ({ thr: level === 1 ? thresholdRounds(createRng(seed)) : [], stop: level === 2 ? stopRounds(createRng(seed)) : [], line: level === 3 ? lineRounds(createRng(seed)) : [] });
const FIRE = ['Fire the photons at the metal', 'Switch on the light with this retarding voltage', 'Check the line against the measured points'];

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => {
    if (level === 1) h.setSlider(g.thr[k].lamSol);
    else if (level === 2) h.setSlider(g.stop[k].v0);
    else {
      h.setSlider(H, 0);
      h.setSlider(g.line[k].phi, 1);
    }
  },
  setWrong: (g, k, level) => {
    if (level === 1) h.setSlider(Math.round(g.thr[k].lamSol * 0.7));
    else if (level === 2) h.setSlider(Math.max(0, g.stop[k].v0 - 0.2));
    else {
      h.setSlider(H * 1.3, 0);
      h.setSlider(g.line[k].phi, 1);
    }
  },
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Zap’s threshold', () => {
  it('too weak shakes the electrons; too strong throws them out; a test shot compares the energies', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(Math.min(900, Math.round(g.thr[0].lamSol * 1.3)));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too weak/);
    h.setSlider(Math.round(g.thr[0].lamSol * 0.7));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/more than strong enough/);
    h.click('Test shot: compare the photon energy with the work function');
    expect(h.feedback()).toMatch(/each photon carries [\d.]+ eV/);
  });
});

describe('level 2: Volt’s stopping potential', () => {
  it('too little push-back lets electrons through and too much over-stops, in words that never give the voltage', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(Math.max(0, g.stop[0].v0 - 0.2));
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/still get through/);
    h.setSlider(Math.min(4, g.stop[0].v0 + 0.6));
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/stronger than it needs/);
    expect(h.feedback()).not.toContain(`${g.stop[0].v0} V`);
  });
  it('dragging the voltage knob sets the dial in hundredths of a volt', () => {
    h.start(2, 5);
    h.pointer('pointerdown', 598, 300 - (0.2 / 4) * 220);
    h.pointer('pointermove', 598, 300 - (1.234 / 4) * 220);
    expect(h.sliders()[0].value).toBe('1.23');
  });
});

describe('level 3: Ruler’s line', () => {
  it('has two dials; the right slope with the wrong intercept misses both points, in words', () => {
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.sliders()).toHaveLength(2);
    h.setSlider(H, 0);
    h.setSlider(g.line[0].phi + 1, 1);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too high or too low/);
    expect(h.hearts()).toBe(2);
  });
  it('the left handle sets the work function and the right handle sets h', () => {
    h.start(3, 5);
    const yv = (v: number) => 170 - v * 43;
    // starting dials: h = 5, so the slope is 0.3125 V per 10¹⁴ Hz, and φ = 3 eV
    h.pointer('pointerdown', 40 + 0.8 * 31, yv(0.3125 * 0.8 - 3));
    h.pointer('pointermove', 40 + 0.8 * 31, yv(0.3125 * 0.8 - 2.5));
    expect(Number(h.sliders()[1].value)).toBeCloseTo(2.5, 1);
  });
});
