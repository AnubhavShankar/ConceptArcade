// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch03-matrices/hole-in-the-wall/index';
import { DIALS, KINDS, buildRounds, type Round } from '../src/games/mathematics/class-12/ch03-matrices/hole-in-the-wall/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'hole-in-the-wall', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const FIRE = ['Send Blocky through the wall', 'Send Blocky through the machine', 'Send Blocky through the turntable', 'Send Blocky through both machines'];
const keys = (r: Round) => DIALS[r.kind].map((d) => d.key);
const wrongOf = (r: Round) => {
  const d = DIALS[r.kind][0];
  return r.ans[d.key] === d.max ? d.max - 1 : r.ans[d.key] + 1;
};

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => keys(g[k]).forEach((key, i) => h.setSlider(g[k].ans[key], i)),
  setWrong: (g, k) => {
    keys(g[k]).forEach((key, i) => h.setSlider(g[k].ans[key], i));
    h.setSlider(wrongOf(g[k]), 0);
  },
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('Hole in the Wall', () => {
  it('each level has its dials, and the hole is in the note', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(DIALS[KINDS[level - 1]].length);
      expect(h.note()).toMatch(/The hole is \[/);
    }
  });
  it('a miss names the vertex that jammed, a test slide costs a charge, and a win shows the working', () => {
    h.start(2, 5);
    const g = build(2, 5);
    keys(g[0]).forEach((key, i) => h.setSlider(g[0].ans[key], i));
    h.setSlider(wrongOf(g[0]), 0);
    h.click(FIRE[1]);
    h.advance(3);
    expect(h.feedback()).toMatch(/vertex \d came out at/);
    keys(g[0]).forEach((key, i) => h.setSlider(g[0].ans[key], i));
    h.click(FIRE[1]);
    h.advance(3);
    expect(h.feedback()).toMatch(/Row 1 of A times column 1 of P/);
    h.advance(1);
    h.click('Test slide: read the outline at these settings');
    expect(h.feedback()).toMatch(/Test slide/);
    h.click('Test slide: read the outline at these settings');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 3 can be dragged on the track and shows the angle in π', () => {
    h.start(3, 5);
    h.pointer('pointerdown', 60 + (520 * 11) / 23, 322);
    h.pointer('pointermove', 60 + (520 * 14) / 23, 322);
    expect(Number(h.sliders()[0].value)).toBe(3);
    expect(h.$('.v-readout')?.textContent).toMatch(/π/);
  });
});
