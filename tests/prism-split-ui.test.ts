// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/prism-split/index';
import { DIAL, buildRounds, type Round } from '../src/games/mathematics/class-12/ch07-integrals/prism-split/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'prism-split', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));

/** Set every strength; a miss moves the first one by one step, away from the dial end. */
function set(r: Round, wrong: boolean) {
  r.ans.forEach((a, i) => h.setSlider(wrong && i === 0 ? (a === DIAL.max ? a - 1 : a + 1) : a, i));
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Split the beam'),
});

describe('Prism Split', () => {
  it('each level has as many strengths as pieces, all starting at 0, and the beam is in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      const g = build(level, 5);
      expect(h.sliders()).toHaveLength(g[0].ans.length);
      expect(h.sliders().every((s) => Number(s.value) === 0)).toBe(true);
      expect(h.note()).toMatch(/Split the beam/);
    }
  });
  it('dragging the crystal sets A and B together', () => {
    h.start(1, 5);
    const g = build(1, 5);
    const [a, b] = g[0].ans;
    h.pointer('pointerdown', 536, 160);
    h.pointer('pointermove', 536 + a * 8, 160 - b * 8);
    h.pointer('pointerup', 536 + a * 8, 160 - b * 8);
    expect(h.sliders().map((s) => Number(s.value))).toEqual([a, b]);
  });
  it('a miss reports the checkpoints, never the strengths; a test beam costs a charge', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0], true);
    h.click('Split the beam');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/beams apart/);
    expect(h.feedback()).not.toMatch(/checkpoints|\d/);
    h.click('Test beam: compare the beams at one point');
    expect(h.feedback()).toMatch(/Test beam at x = /);
    h.click('Test beam: compare the beams at one point');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('your beam is live in round 1, flashes 1.5 s after a test beam in round 2, never in round 3; a miss paints every scanner dot red', () => {
    for (const level of [1, 2, 3]) {
      const R = canvasRecorder();
      const beam = () => h.$('canvas')!.dataset.beam;
      const frame = (dt: number) => {
        if (dt > 0.05) h.advance(dt - 0.05);
        R.clear();
        h.advance(0.05);
      };
      h.start(level, 5);
      const g = build(level, 5);
      frame(0.1);
      expect(beam()).toBe('1');
      set(g[0], false);
      h.click('Split the beam');
      h.advance(3.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      set(g[1], true);
      frame(0.3);
      expect(beam()).toBe('0');
      h.click('Test beam: compare the beams at one point');
      frame(0.3);
      expect(beam()).toBe('1');
      frame(1.0);
      expect(beam()).toBe('1');
      frame(0.5);
      expect(beam()).toBe('0');
      // a miss in round 2 after the flash: beam stays hidden and every dot is red
      h.click('Split the beam');
      R.clear();
      for (const dt of [0.4, 0.4, 0.4, 0.4]) {
        frame(dt);
        expect(beam()).toBe('0');
      }
      expect(R.rec.fills.includes('#5dff9a')).toBe(false);
      h.advance(2);
      set(g[1], false);
      h.click('Split the beam');
      h.advance(3.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      set(g[2], true);
      h.click('Split the beam');
      for (const dt of [0.3, 0.5, 0.5, 0.5]) {
        frame(dt);
        expect(beam()).toBe('0');
      }
    }
  });
  it('a win shows the cover-up working', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0], false);
    h.click('Split the beam');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/cover-up/);
  });
});
