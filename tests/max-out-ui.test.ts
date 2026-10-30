// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch06-application-of-derivatives/max-out/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch06-application-of-derivatives/max-out/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'max-out', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const FIRE = ['Cut and fold the sheet', 'Build the container', 'Fit the solid inside', 'Lower the winch'];

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => h.setSlider(g[k].best),
  setWrong: (g, k) => h.setSlider(g[k].best + 1),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('Max Out', () => {
  it('the dial range follows each round and starts away from the answer', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].lo, g[0].hi, g[0].start]);
      expect(Number(s.value)).not.toBe(g[0].best);
    }
  });
  it('a miss shows the reading of the build, and the spotter costs one charge in round 2', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(g[0].best + 1);
    h.click(FIRE[0]);
    h.advance(3);
    expect(h.feedback()).toMatch(/cm³/);
    expect(h.feedback()).not.toMatch(/′|best/);
    h.setSlider(g[0].best);
    h.click(FIRE[0]);
    h.advance(3);
    h.advance(1);
    h.click('Test build: read the result at this setting');
    expect(h.feedback()).toMatch(/Test build at/);
    h.click('Test build: read the result at this setting');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('after a win the working shows the derivative step', () => {
    h.start(3, 5);
    const g = build(3, 5);
    h.setSlider(g[0].best);
    h.click(FIRE[2]);
    h.advance(3);
    expect(h.feedback()).toMatch(/V′ = 0/);
    expect(h.feedback()).toMatch(/V″ < 0/);
  });
  it('level 2 mentions the budget and level 4 the winch line', () => {
    h.start(2, 5);
    const g2 = build(2, 5);
    h.setSlider(g2[0].best + 1);
    h.click(FIRE[1]);
    h.advance(3);
    expect(h.feedback()).toMatch(/metal ran out/);
    h.start(4, 5);
    const g4 = build(4, 5);
    h.setSlider(g4[0].best + 1);
    h.click(FIRE[3]);
    h.advance(3);
    expect(h.feedback()).toMatch(/rope ran out/);
  });
  it('dragging the handle sets the dial', () => {
    h.start(1, 5);
    const g = build(1, 5);
    const r = g[0];
    h.pointer('pointerdown', 60, 322);
    h.pointer('pointermove', 60 + 520 * ((r.best - r.lo) / (r.hi - r.lo)), 322);
    expect(Number(h.sliders()[0].value)).toBe(r.best);
  });
});
