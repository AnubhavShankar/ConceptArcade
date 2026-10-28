// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch10-wave-optics/wavefront-run/index';
import { bandRounds, mudRounds } from '../src/games/physics/class-12/ch10-wave-optics/wavefront-run/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'wr', 2);
type G = { level: number; mud: ReturnType<typeof mudRounds>; band: ReturnType<typeof bandRounds> };
const build = (level: number, seed: number): G => ({ level, mud: level === 1 ? mudRounds(createRng(seed)) : [], band: level === 2 ? bandRounds(createRng(seed)) : [] });
const FIRE = ['Send the wave into the mud', 'Send the column over the boundary'];

shellTests<G>(h, {
  levels: [1, 2],
  build,
  setRight: (g, k, level) => {
    if (level === 1) {
      h.setSlider(g.mud[k].lamSol, 0);
      h.setSlider(g.mud[k].vSol, 1);
    } else h.setSlider(Math.round(g.band[k].rSol * 2) / 2);
  },
  setWrong: (g, k, level) => {
    if (level === 1) {
      h.setSlider(g.mud[k].lambda, 0);
      h.setSlider(3, 1);
    } else h.setSlider(g.band[k].rSol + 10);
  },
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: mud run', () => {
  it('a test shot costs a charge and says whether the frequency stays the same', () => {
    h.start(1, 5);
    h.click('Test shot: check the frequency of these settings');
    expect(h.feedback()).toMatch(/the frequency would be/);
    expect(h.feedback()).toMatch(/They (agree|do not agree)/);
    h.click('Test shot: check the frequency of these settings');
    expect(h.feedback()).toMatch(/No charges left/);
    expect(h.hearts()).toBe(3);
  });
  it('the right wavelength with the speed left at c still drifts off the crests', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(g.mud[0].lamSol, 0);
    h.setSlider(3, 1);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/drift off the crests/);
    expect(h.hearts()).toBe(2);
  });
  it('dragging the wavelength knob sets the dial', () => {
    h.start(1, 5);
    const g = build(1, 5);
    const x = 330 + 0.2 * g.mud[0].lambda + 12;
    h.pointer('pointerdown', x, 170 - 62);
    h.pointer('pointermove', 330 + 0.2 * 400 + 12, 108);
    expect(h.sliders()[0].value).toBe('400');
  });
});

describe('level 2: the marching column', () => {
  it('the wavefront help fades and the angle of incidence is never the answer', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.note()).toMatch(/predicted wavefront is drawn live/);
    h.setSlider(30);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/cuts through|floats clear/);
    h.setSlider(Math.round(g.band[0].rSol * 2) / 2);
    h.click(FIRE[1]);
    h.advance(2.8);
    h.advance(1);
    expect(h.note()).toMatch(/wavelets are drawn/);
  });
});
