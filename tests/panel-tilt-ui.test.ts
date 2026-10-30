// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch10-vector-algebra/panel-tilt/index';
import { buildRounds, cross, type Round } from '../src/games/mathematics/class-12/ch10-vector-algebra/panel-tilt/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'panel-tilt', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));

/** Set the right setting, or one step off in the first dial (never past the dial end). */
function set(r: Round, wrong: boolean) {
  r.ans.forEach((a, i) => h.setSlider(wrong && i === 0 ? (a === r.max ? a - 1 : a + 1) : a, i));
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Drive the bolt'),
});

describe('Panel Tilt', () => {
  it('level 1 has three bolt dials, levels 2 and 3 one, and the supports are in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(level === 1 ? 3 : 1);
      expect(h.note()).toMatch(/a = \(/);
    }
  });
  it('level 1: the reversed bolt gets the right-hand-rule message and a bolt test costs a charge', () => {
    h.start(1, 5);
    const g = build(1, 5);
    cross(g[0].b, g[0].a).forEach((x, i) => h.setSlider(x, i));
    h.click('Drive the bolt');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/wrong way/);
    h.click('Panel test: see how the panel sits for this setting');
    expect(h.feedback()).toMatch(/Bolt test/);
    h.click('Panel test: see how the panel sits for this setting');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 3: a miss says the panel is not flat, a win explains the multiple', () => {
    h.start(3, 5);
    const g = build(3, 5);
    set(g[0], true);
    h.click('Drive the bolt');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/not parallel/);
    set(g[0], false);
    h.click('Drive the bolt');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/multiple of a/);
  });
});
