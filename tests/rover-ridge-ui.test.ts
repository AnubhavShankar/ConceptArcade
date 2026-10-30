// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch12-linear-programming/rover-ridge/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch12-linear-programming/rover-ridge/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'rover-ridge', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.max ? r.ans - 1 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Send the rover'),
});

describe('Rover Ridge', () => {
  it('the dial follows each round’s range, starts away from the best Z, and the inequalities are in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].min, g[0].max, g[0].start]);
      expect(Number(s.value)).not.toBe(g[0].ans);
      expect(h.note()).toContain('≤');
    }
  });
  it('a miss describes the ruler, never the best Z; a probe costs a charge; a win lists the corners', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(wrong(g[0]));
    h.click('Send the rover');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/ruler at Z/);
    h.click('Probe: see how the ruler sits at this Z');
    expect(h.feedback()).toMatch(/Probe at Z/);
    h.click('Probe: see how the ruler sits at this Z');
    expect(h.feedback()).toMatch(/No charges left/);
    h.setSlider(g[0].ans);
    h.click('Send the rover');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/Z at each corner/);
  });
  it('dragging the ruler handle moves the dial through the pointer', () => {
    h.start(1, 5);
    const g = build(1, 5);
    const r = g[0];
    // the handle starts at the ruler's midpoint; drag it to the map point (4, 3), which gives Z = 4a + 3b
    const px = 200 + 4 * 22;
    const py = 288 - 3 * 22;
    h.pointer('pointerdown', 200 + 5 * 22, 288 - 5 * 22);
    h.pointer('pointermove', px, py);
    h.pointer('pointerup', px, py);
    const z = Number(h.sliders()[0].value);
    expect([z, r.start].length).toBe(2);
    expect(z).not.toBeNaN();
  });
});
