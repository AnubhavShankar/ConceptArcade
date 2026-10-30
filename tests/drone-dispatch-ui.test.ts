// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch10-vector-algebra/drone-dispatch/index';
import { RANGE, buildRounds, type Round } from '../src/games/mathematics/class-12/ch10-vector-algebra/drone-dispatch/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'drone-dispatch', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));

function set(r: Round, wrong: boolean) {
  h.setSlider(r.ans[0] + (wrong ? (r.ans[0] === RANGE ? -1 : 1) : 0), 0);
  h.setSlider(r.ans[1], 1);
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Dispatch the drone'),
});

describe('Drone Dispatch', () => {
  it('both coordinates start at 0 and the task is in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      expect(h.sliders().map((s) => Number(s.value))).toEqual([0, 0]);
      expect(h.note().length).toBeGreaterThan(30);
    }
  });
  it('tapping the plane sets both coordinates, and a drag of the tip does too', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 470 + 3 * 10, 185 - 4 * 10);
    expect(h.sliders().map((s) => Number(s.value))).toEqual([3, 4]);
    h.pointer('pointermove', 470 - 5 * 10, 185 + 2 * 10);
    h.pointer('pointerup', 470 - 5 * 10, 185 + 2 * 10);
    expect(h.sliders().map((s) => Number(s.value))).toEqual([-5, -2]);
  });
  it('a miss says where the drone ended up without the vector; a test flight costs a charge', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0], true);
    h.click('Dispatch the drone');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/landed .* the pad/);
    h.click('Test flight: see where this vector leads');
    expect(h.feedback()).toMatch(/Test flight/);
    h.click('Test flight: see where this vector leads');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 3 names the formula in the working', () => {
    h.start(3, 5);
    const g = build(3, 5);
    set(g[0], false);
    h.click('Dispatch the drone');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/Internal division/);
  });
});
