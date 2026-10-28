// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch12-atoms/bohr-orbits/index';
import { bigRounds, lapRounds, ringRounds } from '../src/games/physics/class-12/ch12-atoms/bohr-orbits/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

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
