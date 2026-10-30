// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch02-inverse-trigonometric-functions/rooftop-ranger/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch02-inverse-trigonometric-functions/rooftop-ranger/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'rooftop-ranger', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrongK = (r: Round) => (r.k === 6 || r.k === 12 ? r.k - 1 : r.k + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k, level) => {
    h.setSlider(g[k].k, 0);
    if (level === 2) h.setSlider(g[k].range!, 1);
  },
  setWrong: (g, k, level) => {
    h.setSlider(wrongK(g[k]), 0);
    if (level === 2) h.setSlider(g[k].range!, 1);
  },
  commit: () => h.click('Fire the shot'),
});

describe('Rooftop Ranger', () => {
  it('level 1: the intel is in the note, a shallow shot passes over, and the spotter costs a charge in round 2', () => {
    h.start(1, 5);
    const g = build(1, 5);
    expect(h.note()).toMatch(/Roof height/);
    expect(h.note()).toMatch(/laser sight is on/);
    h.setSlider(g[0].k + 1);
    h.click('Fire the shot');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/over the robot/);
    h.setSlider(g[0].k);
    h.click('Fire the shot');
    h.advance(2.8);
    h.advance(1);
    expect(h.hud()).toMatch(/Round 2 of 3/);
    h.click('Call the spotter: where would this shot go');
    expect(h.feedback()).toMatch(/Spotter/);
    h.click('Call the spotter: where would this shot go');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 2: two dials; a true tilt with the wrong range is described as a drop or a rise', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.sliders()).toHaveLength(2);
    h.setSlider(g[0].k, 0);
    h.setSlider(g[0].range! - 2, 1);
    h.click('Fire the shot');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/tilt was true.*nearer/);
    expect(h.hearts()).toBe(2);
  });
  it('level 4: the turret dial runs from 0 to π and a west robot hit by an east bearing says so', () => {
    const seed = Array.from({ length: 50 }, (_, i) => i + 1).find((s) => build(4, s)[0].k > 6)!;
    h.start(4, seed);
    const g = build(4, seed);
    const s = h.sliders()[0];
    expect([s.min, s.max]).toEqual(['0', '12']);
    h.setSlider(12 - g[0].k);
    h.click('Fire the shot');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/east half/);
  });
  it('dragging the scope knob sets the tilt', () => {
    h.start(1, 5);
    // The tilt knob is centred at (540, 172) with radius 58: straight down is (540, 230).
    h.pointer('pointerdown', 598, 172);
    h.pointer('pointermove', 540 + 58 * Math.cos(Math.PI / 6), 172 + 58 * Math.sin(Math.PI / 6));
    expect(Number(h.sliders()[0].value)).toBe(-2);
  });
});
