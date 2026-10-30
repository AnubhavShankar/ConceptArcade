// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch09-differential-equations/slope-surfer/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch09-differential-equations/slope-surfer/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'slope-surfer', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.cmax ? r.ans - 1 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Ride the curve'),
});

describe('Slope Surfer', () => {
  it('the dial follows each round’s range and starts away from the answer; the beacon is in the note', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].cmin, g[0].cmax, g[0].start]);
      expect(Number(s.value)).not.toBe(g[0].ans);
      expect(h.note()).toContain(g[0].de);
    }
  });
  it('a miss gives the height and the side, never C; a win shows the general solution; a test ride costs a charge', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(wrong(g[0]));
    h.click('Ride the curve');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/above|below/);
    h.setSlider(g[0].ans);
    h.click('Ride the curve');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/general solution/);
    h.advance(1);
    h.click('Test ride: read the height at the beacon for this C');
    expect(h.feedback()).toMatch(/Test ride/);
    h.click('Test ride: read the height at the beacon for this C');
    expect(h.feedback()).toMatch(/No charges left/);
  });
});
