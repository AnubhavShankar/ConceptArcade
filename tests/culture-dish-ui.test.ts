// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch09-differential-equations/culture-dish/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch09-differential-equations/culture-dish/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'culture-dish', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.max ? r.ans - 1 : r.ans + 1);

/** Set the right or a wrong setting for round k of level 1 (two dials) or levels 2 and 3 (one dial). */
function set(g: Round[], k: number, bad: boolean) {
  const r = g[k];
  if (r.kind === 'scan') {
    h.setSlider(r.order, 0);
    h.setSlider(bad ? (r.degree === 4 ? 3 : r.degree + 1) : r.degree, 1);
  } else h.setSlider(bad ? wrong(r) : r.ans);
}
const commitLabel = (level: number) => (level === 1 ? 'Scan the specimen' : level === 2 ? 'Switch on the lamp' : 'Start the dish');

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g, k, false),
  setWrong: (g, k) => set(g, k, true),
  commit: (level) => h.click(commitLabel(level)),
});

describe('Culture Dish', () => {
  it('level 1 starts the scanner at order 4 and degree 4, and the equation is in the note', () => {
    h.start(1, 5);
    expect(h.sliders().map((s) => Number(s.value))).toEqual([4, 4]);
    expect(h.note()).toContain(build(1, 5)[0].text);
  });
  it('level 1: a miss says what is wrong without the numbers; the magnifier costs a charge', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g, 0, true);
    h.click('Scan the specimen');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/flagged/);
    h.click('Magnifier: show the highest derivative');
    expect(h.feedback()).toMatch(/highest derivative/);
    h.click('Magnifier: show the highest derivative');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 1: a specimen that lands unscanned costs a heart', () => {
    h.start(1, 5);
    h.advance(19);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/hit the floor/);
  });
  it('levels 2 and 3: the tests read effects, and the dial starts away from the answer', () => {
    for (const level of [2, 3]) {
      h.start(level, 5);
      const g = build(level, 5);
      expect(Number(h.sliders()[0].value)).not.toBe(g[0].ans);
      h.click(level === 2 ? 'Incubator test: read the colony for this lamp setting' : 'Swing test: count the swings for this frequency');
      expect(h.feedback()).toMatch(/test/i);
    }
  });
});
