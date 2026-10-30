// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch13-probability/pachinko-bayes/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch13-probability/pachinko-bayes/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'pachinko-bayes', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));

function set(r: Round, wrong: boolean) {
  r.ans.forEach((a, i) => h.setSlider(wrong && i === 0 ? (a === r.max ? a - 1 : a + 1) : a, i));
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Drop the balls'),
});

describe('Pachinko Bayes', () => {
  it('level 1 has one count, levels 2 and 3 two; all start at 0 and the balls are in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(level === 1 ? 1 : 2);
      expect(h.sliders().every((s) => Number(s.value) === 0)).toBe(true);
      expect(h.note()).toMatch(/balls drop/);
    }
  });
  it('a miss says which count was off; a check costs a charge; a win shows the fraction', () => {
    h.start(2, 5);
    const g = build(2, 5);
    set(g[0], true);
    h.click('Drop the balls');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/was right|matched|different|landed/);
    h.click('Check: see what these counts mean as a chance');
    expect(h.feedback()).toMatch(/Check/);
    h.click('Check: see what these counts mean as a chance');
    expect(h.feedback()).toMatch(/No charges left/);
    set(g[0], false);
    h.click('Drop the balls');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/P\(gate/);
  });
});
