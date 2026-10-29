// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch13-nuclei/nucleus-builder/index';
import { barrierRounds, decayRounds, sizeRounds } from '../src/games/physics/class-12/ch13-nuclei/nucleus-builder/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'nb', 3);
type G = { size: ReturnType<typeof sizeRounds>; barrier: ReturnType<typeof barrierRounds>; decay: ReturnType<typeof decayRounds> };
const build = (level: number, seed: number): G => ({ size: level === 1 ? sizeRounds(createRng(seed)) : [], barrier: level === 2 ? barrierRounds(createRng(seed)) : [], decay: level === 3 ? decayRounds(createRng(seed)) : [] });
const FIRE = ['Roll the nucleus out at this radius', 'Set the barrier and climb it', 'Let the nucleus decay into this daughter'];

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => {
    if (level === 1) h.setSlider(g.size[k].sol);
    else if (level === 2) h.setSlider(g.barrier[k].sol);
    else {
      h.setSlider(g.decay[k].aSol, 0);
      h.setSlider(g.decay[k].zSol, 1);
    }
  },
  setWrong: (g, k, level) => {
    if (level === 1) h.setSlider(Math.min(9, g.size[k].sol * 1.5));
    else if (level === 2) h.setSlider(Math.min(2000, g.barrier[k].sol * 2));
    else {
      h.setSlider(g.decay[k].aSol, 0);
      h.setSlider(g.decay[k].zSol + 3, 1);
    }
  },
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Katamari’s radius', () => {
  it('a ball too big or too small is described, and a test shot gives the cube root of A', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(Math.min(9, g.size[0].sol * 1.5));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/bigger than the real one/);
    h.setSlider(g.size[0].sol / 1.5);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/smaller than the real one/);
    h.click('Test shot: read the cube root of the mass number');
    expect(h.feedback()).toMatch(/A\^⅓ for A = \d+ is/);
  });
  it('dragging the ball’s edge sets the radius', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 330 + 20 * 3, 170);
    h.pointer('pointermove', 330 + 20 * 5.5, 170);
    expect(Number(h.sliders()[0].value)).toBeCloseTo(5.5, 1);
  });
});

describe('level 2: Climber’s hill', () => {
  it('a hill too high or too low is described, never the height; the curve help fades', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.note()).toMatch(/curve is drawn live/);
    h.setSlider(Math.min(2000, g.barrier[0].sol * 2));
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too high/);
    expect(h.feedback()).not.toContain(`${g.barrier[0].sol} keV`);
  });
});

describe('level 3: Evo’s decay', () => {
  it('the right mass number with the wrong charge names the charge; a test shot says what the particle carries', () => {
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.sliders()).toHaveLength(2);
    h.setSlider(g.decay[0].aSol, 0);
    h.setSlider(g.decay[0].zSol + 3, 1);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/charge does not/);
    h.click('Test shot: what the emitted particle carries away');
    expect(h.feedback()).toMatch(/mass number 4 and charge \+2/);
  });
});
