// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch02-inverse-trigonometric-functions/relay-tower/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch02-inverse-trigonometric-functions/relay-tower/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'relay-tower', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === 12 ? 11 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Send the signal'),
});

describe('Relay Tower', () => {
  it('the dial shows the angle in π and degrees, and the expression is in the note', () => {
    h.start(1, 5);
    h.setSlider(3);
    expect(h.$('.v-readout')?.textContent).toMatch(/π\/4 \(45°\)/);
    expect(h.note()).toMatch(/Point the dish at the value of/);
  });
  it('a dish outside the range of the expression is refused with the range, and a miss inside it names a direction', () => {
    h.start(1, 5);
    const g = build(1, 5);
    const r = g[0];
    const out = r.range[1] < 12 ? r.range[1] + 3 : r.range[0] - 3;
    h.setSlider(Math.max(-12, Math.min(12, out)));
    h.click('Send the signal');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/can only lie/);
    const inside = r.ans === r.range[1] ? r.ans - 1 : r.ans + 1;
    h.setSlider(inside);
    h.click('Send the signal');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/clockwise/);
  });
  it('a win shows the working, and a check costs a charge', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(g[0].ans);
    h.click('Send the signal');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/tan|sin/);
    h.advance(1);
    h.click('Check the dish against the range of the outer function');
    expect(h.feedback()).toMatch(/Check/);
    h.click('Check the dish against the range of the outer function');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('dragging the handle around the dish sets the angle', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 400 + 92, 180);
    h.pointer('pointermove', 400 + 92 * Math.cos(Math.PI / 3), 180 - 92 * Math.sin(Math.PI / 3));
    expect(Number(h.sliders()[0].value)).toBe(4);
  });
});
