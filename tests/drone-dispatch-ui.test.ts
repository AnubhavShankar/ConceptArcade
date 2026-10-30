// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch10-vector-algebra/drone-dispatch/index';
import { RANGE, buildRounds, type Round } from '../src/games/mathematics/class-12/ch10-vector-algebra/drone-dispatch/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'drone-dispatch', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));

function set(r: Round, wrong: boolean) {
  h.setSlider(r.ans[0] + (wrong ? (r.ans[0] === RANGE ? -1 : 1) : 0), 0);
  h.setSlider(r.ans[1], 1);
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
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
  it('level 4 starts at (0, 0) and the note names the legs, the wind and the target', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(h.sliders().map((s) => Number(s.value))).toEqual([0, 0]);
    expect(h.note()).toContain('two legs');
    expect(g.map((r) => r.kind)).toEqual(['legs', 'wind', 'wind2']);
  });
  it('level 4 working names the law in each round, and the plane keeps its range', () => {
    h.start(4, 5);
    const g = build(4, 5);
    const want = [/Triangle law/, /Ground track = own vector \+ wind/, /half the trip/];
    for (let k = 0; k < 3; k++) {
      expect(Math.abs(g[k].ans[0])).toBeLessThanOrEqual(RANGE);
      set(g[k], false);
      h.click('Dispatch the drone');
      h.advance(2.8);
      expect(h.feedback()).toMatch(want[k]);
      h.advance(1);
    }
    expect(h.phase()).toBe('won');
  });
  it('level 4 miss says only a compass direction, with no number; a test flight is paid and may show numbers', () => {
    h.start(4, 5);
    const g = build(4, 5);
    h.advance(0.1);
    set(g[0], true);
    h.click('Dispatch the drone');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/^Dash came down on a rooftop [a-z-]+ of the target\.$/);
    expect(h.feedback()).not.toMatch(/\d/);
    h.click('Test flight: see where this vector leads');
    expect(h.feedback()).toMatch(/Test flight .* Dash would land .* the target/);
    h.click('Test flight: see where this vector leads');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 4 boss round has no test flight, and a miss in a wind round is a compass word with no number', () => {
    h.start(4, 5);
    const g = build(4, 5);
    set(g[0], false);
    h.click('Dispatch the drone');
    h.advance(3.8);
    set(g[1], true);
    h.click('Dispatch the drone');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/^Dash came down on a rooftop [a-z-]+ of the target\.$/);
    expect(h.feedback()).not.toMatch(/\d/);
    set(g[1], false);
    h.click('Dispatch the drone');
    h.advance(3.8);
    expect(h.hud()).toMatch(/BOSS/);
    h.click('Test flight: see where this vector leads');
    expect(h.feedback()).toMatch(/No charges left/);
  });
});
