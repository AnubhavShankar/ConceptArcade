// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch14-semiconductor-electronics-materials-devices-and-simple-circuits/junction-run/index';
import { biasRounds, curveRounds, rectRounds } from '../src/games/physics/class-12/ch14-semiconductor-electronics-materials-devices-and-simple-circuits/junction-run/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'junction-run', 3);
type G = { bias: ReturnType<typeof biasRounds>; rect: ReturnType<typeof rectRounds>; curve: ReturnType<typeof curveRounds> };
const build = (level: number, seed: number): G => ({ bias: level === 1 ? biasRounds(createRng(seed)) : [], rect: level === 2 ? rectRounds(createRng(seed)) : [], curve: level === 3 ? curveRounds(createRng(seed)) : [] });
const FIRE = ['Connect the battery and hop', 'Run the lamp at this flash rate', 'Race with this resistance'];

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? g.bias[k].sol : level === 2 ? g.rect[k].sol : g.curve[k].logSol),
  setWrong: (g, k, level) => h.setSlider(level === 1 ? -g.bias[k].sol : level === 2 ? g.rect[k].sol + 40 : Math.min(9, g.curve[k].logSol + 2)),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Hopper’s barrier', () => {
  it('a battery the wrong way round is described, and a test shot reads the built-in barrier', () => {
    h.start(1, 5);
    const g = build(1, 5);
    expect(h.note()).toMatch(/hill is drawn live/);
    h.setSlider(-g.bias[0].sol);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/wrong way round/);
    h.click('Test shot: read the built-in barrier and the battery');
    expect(h.feedback()).toMatch(/built-in barrier/);
  });
  it('dragging the handle sets the battery', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 610, 290 - ((0 + 6) / 7) * 230);
    h.pointer('pointermove', 610, 290 - ((0.5 + 6) / 7) * 230);
    expect(Number(h.sliders()[0].value)).toBeCloseTo(0.5, 1);
  });
});

describe('level 2: Beat’s rhythm', () => {
  it('doubling a half-wave rectifier is described, and a test shot says when the diode conducts', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(2 * g.rect[0].f);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/twice as often/);
    h.click('Test shot: read when the diodes conduct');
    expect(h.feedback()).toMatch(/one diode/);
  });
});

describe('level 3: Slope’s resistance', () => {
  it('the straight V/I slip gets its own message and the reverse round reads µA', () => {
    h.start(3, 5);
    const g = build(3, 5);
    h.setSlider(Math.log10(Math.abs(g.curve[0].v2) / (g.curve[0].i2 * 1e-3)));
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/line from the origin/);
    h.click('Test shot: read the change in voltage and current');
    expect(h.feedback()).toMatch(/voltage rises by/);
  });
});
