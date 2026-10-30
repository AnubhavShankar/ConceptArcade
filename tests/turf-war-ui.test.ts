// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch08-application-of-integrals/turf-war/index';
import { buildRounds, height, type Round } from '../src/games/mathematics/class-12/ch08-application-of-integrals/turf-war/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'turf-war', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.max ? r.ans - 1 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Seal the turf'),
});

describe('Turf War', () => {
  it('the dial starts at the beginning of the turf, never at the answer, and the need is in the note', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].min, g[0].max, g[0].start]);
      expect(h.note()).toMatch(/needs exactly/);
    }
  });
  it('dragging Inky along the turf sets the roller', () => {
    h.start(2, 5);
    // where the axis sits on the canvas for round 1: the same window the scene uses
    const r = build(2, 5)[0];
    const ys = Array.from({ length: 121 }, (_, i) => height(r, (9 * i) / 120));
    const lo = Math.min(0, ...ys);
    const hi = Math.max(0, ...ys);
    const pad = (hi - lo) * 0.06;
    const z = 262 - ((0 - (lo - pad)) / (hi + pad - (lo - pad))) * 200;
    h.pointer('pointerdown', 70, z);
    h.pointer('pointermove', 70 + 3 * 56.7, z);
    h.pointer('pointerup', 70 + 3 * 56.7, z);
    expect(Number(h.sliders()[0].value)).toBe(3);
  });
  it('a miss says how much paint was laid and which way; a win shows the working; the gauge costs a charge', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(wrong(g[0]));
    h.click('Seal the turf');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/laid .* but the turf needs/);
    expect(h.feedback()).toMatch(/bare patches|spilled/);
    h.setSlider(g[0].ans);
    h.click('Seal the turf');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/signed integral/);
    h.advance(1);
    h.click('Ink gauge: read the paint laid at this setting');
    expect(h.feedback()).toMatch(/Ink gauge/);
    h.click('Ink gauge: read the paint laid at this setting');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 1 explains with πab', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(g[0].ans);
    h.click('Seal the turf');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/πab/);
  });
});
