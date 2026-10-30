// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch06-application-of-derivatives/catch-rate/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch06-application-of-derivatives/catch-rate/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'catch-rate', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === 12 ? 11 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Run the winch'),
});

describe('Catch Rate', () => {
  it('a miss reports the result rate, a test run costs a charge, a win shows the derivative', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.note()).toMatch(/ladder/);
    h.setSlider(wrong(g[0]));
    h.click('Run the winch');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/per second/);
    expect(h.feedback()).not.toMatch(/w = /);
    h.setSlider(g[0].ans);
    h.click('Run the winch');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/x² \+ y² =/);
    h.advance(1);
    h.click('Test run: read the result rate at this winch speed');
    expect(h.feedback()).toMatch(/Test run at w =/);
    h.click('Test run: read the result rate at this winch speed');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('dragging the handle sets the speed', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 60, 322);
    h.pointer('pointermove', 60 + (520 * 6) / 11, 322);
    expect(Number(h.sliders()[0].value)).toBe(7);
  });
});
