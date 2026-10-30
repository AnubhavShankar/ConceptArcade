// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/gear-train/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/gear-train/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'gear-train', 5);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === 12 ? 11 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Start the machine'),
});

describe('Gear Train', () => {
  it('a miss reports the output rate without the right speed, a test run costs a charge, a win shows the working', () => {
    h.start(1, 5);
    const g = build(1, 5);
    expect(h.note()).toMatch(/Target output/);
    h.setSlider(wrong(g[0]));
    h.click('Start the machine');
    h.advance(3);
    expect(h.feedback()).toMatch(/output gear turned/);
    expect(h.feedback()).not.toMatch(/w = /);
    h.setSlider(g[0].ans);
    h.click('Start the machine');
    h.advance(3);
    expect(h.feedback()).toMatch(/Chain rule/);
    h.advance(1);
    h.click('Test run: read the output at this crank speed');
    expect(h.feedback()).toMatch(/Test run at w =/);
    h.click('Test run: read the output at this crank speed');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 4 asks for acceleration and the speed counts squared', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(h.note()).toMatch(/accelerates/);
    h.setSlider(g[0].ans);
    h.click('Start the machine');
    h.advance(3);
    expect(h.feedback()).toMatch(/w²/);
  });
  it('level 5 shows a trigonometric machine at a special angle, the start setting misses, and a win shows the chain rule working', () => {
    h.start(5, 5);
    const g = build(5, 5);
    expect(h.note()).toMatch(/y = .* at x = .*π/);
    expect(h.note()).toContain(g[0].machine);
    expect(h.note()).toMatch(/Target output/);
    expect(Number(h.sliders()[0].value)).toBe(1);
    h.click('Start the machine');
    h.advance(3);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/output gear turned too slowly/);
    expect(h.feedback()).not.toMatch(/w = |dy\/dx/);
    h.setSlider(g[0].ans);
    h.click('Start the machine');
    h.advance(3);
    expect(h.feedback()).toMatch(/^Dispatched! Chain rule: dy\/dx = .* at x = .*π.*Output rate = .* × w;/);
    expect(h.hearts()).toBe(2);
  });
  it('dragging the handle sets the crank speed', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 60, 322);
    h.pointer('pointermove', 60 + (520 * 5) / 11, 322);
    expect(Number(h.sliders()[0].value)).toBe(6);
  });
});
