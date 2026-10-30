// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch11-three-dimensional-geometry/laser-grid/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch11-three-dimensional-geometry/laser-grid/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'laser-grid', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));

/** Set the right setting, or one step off in the first dial (away from the dial end). */
function set(r: Round, wrong: boolean) {
  r.ans.forEach((a, i) => h.setSlider(wrong && i === 0 ? (a === r.max ? a - 1 : a + 1) : a, i));
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Fire the beam'),
});

describe('Laser Grid', () => {
  it('level 1 has three numerator dials, the others one; the setup is in the note', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(level === 1 ? 3 : 1);
      expect(h.note().length).toBeGreaterThan(40);
      expect(h.sliders().every((s) => Number(s.value) !== build(level, 5)[0].ans[0] || level === 1)).toBe(true);
    }
  });
  it('a miss reports a reading; a check costs a charge; a win shows the working', () => {
    h.start(2, 5);
    const g = build(2, 5);
    set(g[0], true);
    h.click('Fire the beam');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/dot product of/);
    h.click('Check: read the beams for this setting');
    expect(h.feedback()).toMatch(/Check/);
    h.click('Check: read the beams for this setting');
    expect(h.feedback()).toMatch(/No charges left/);
    set(g[0], false);
    h.click('Fire the beam');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/Perpendicular beams/);
  });
  it('level 1 names the length of the target vector in the working', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0], false);
    h.click('Fire the beam');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/cosines/);
  });
});
