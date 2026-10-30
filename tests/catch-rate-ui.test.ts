// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch06-application-of-derivatives/catch-rate/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch06-application-of-derivatives/catch-rate/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'catch-rate', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === 12 ? 11 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: (level) => h.click(level === 4 ? 'Start the run' : 'Run the winch'),
});

describe('Catch Rate', () => {
  it('a miss reports the result rate, a test run costs a charge, a win shows the derivative', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.note()).toMatch(/ladder/);
    h.setSlider(wrong(g[0]));
    h.click('Run the winch');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/too (slowly|fast)/);
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
  it('level 4: the round shows the function and the rate, the start setting misses, a miss gives a money rate and a side, a win shows the marginal working', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(h.note()).toContain(g[0].fnText!);
    expect(h.note()).toMatch(/per hour/);
    expect(h.sliders()[0].getAttribute('aria-label')).toBe('Rate w');
    expect(Number(h.sliders()[0].value)).toBe(1);
    h.click('Start the run');
    h.advance(3.4);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/^The rate was set, and the money flowed too slowly: the meter fell short/);
    expect(h.feedback()).not.toMatch(/w = |should|correct/);
    h.setSlider(g[0].ans);
    h.click('Start the run');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/^Funded on time! Marginal cost C′\(x\) = .* at x = \d+\./);
    expect(h.hearts()).toBe(2);
    h.advance(1);
    h.click('Test run: read the money rate at this setting');
    expect(h.feedback()).toMatch(/Test run at w = 1: the result changes at ₹\d+ per hour\./);
  });
  it('level 4: too fast is a different miss from too slow, and the profit round counts per day', () => {
    h.start(4, 11);
    const g = build(4, 11);
    for (let k = 0; k < 2; k++) {
      h.setSlider(g[k].ans);
      h.click('Start the run');
      h.advance(3.4);
      h.advance(1);
    }
    expect(h.note()).toMatch(/per day/);
    expect(g[2].ans).toBeLessThan(12);
    h.setSlider(12);
    h.click('Start the run');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/money flowed too fast: the meter overflowed/);
    expect(h.feedback()).not.toMatch(/w = /);
  });
  it('level 4: dragging the handle sets the rate', () => {
    h.start(4, 5);
    h.pointer('pointerdown', 60, 322);
    h.pointer('pointermove', 60 + (520 * 6) / 11, 322);
    expect(Number(h.sliders()[0].value)).toBe(7);
  });
});
