// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch04-determinants/field-claim/index';
import { DIALS, KINDS, buildRounds, type Round } from '../src/games/mathematics/class-12/ch04-determinants/field-claim/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'field-claim', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const keys = (r: Round) => DIALS[r.kind].map((d) => d.key);

function set(r: Round, wrong: boolean) {
  keys(r).forEach((k, i) => {
    const d = DIALS[r.kind][i];
    const off = wrong && i === 0 ? (r.ans[k] + 1 > d.max ? -1 : 1) : 0;
    h.setSlider(r.ans[k] + off, i);
  });
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Stake the posts'),
});

describe('Field Claim', () => {
  it('each level has its dials, and the posts are in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(DIALS[KINDS[level - 1]].length);
      expect(h.note()).toMatch(/\(/);
    }
  });
  it('the mirror post gives the right area but the wrong side, and the message says so without a value', () => {
    h.start(1, 5);
    const r = build(1, 5)[0];
    const B = r.pts[0][r.axis === 'x' ? 0 : 1];
    h.setSlider(2 * B - r.ans.k);
    h.click('Stake the posts');
    h.advance(3);
    expect(h.feedback()).toMatch(/wrong side of the gate/);
  });
  it('a check costs a charge and a win shows the determinant formula', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(g[0].ans.k);
    h.click('Stake the posts');
    h.advance(3);
    expect(h.feedback()).toMatch(/determinant is 0/);
    h.advance(1);
    h.click('Check the determinant of the posts');
    expect(h.feedback()).toMatch(/Check:/);
    h.click('Check the determinant of the posts');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 3 names the beacon that is missed', () => {
    h.start(3, 5);
    const g = build(3, 5);
    h.setSlider(g[0].ans.m, 0);
    h.setSlider(g[0].ans.c + 1 > 12 ? g[0].ans.c - 1 : g[0].ans.c + 1, 1);
    h.click('Stake the posts');
    h.advance(3);
    expect(h.feedback()).toMatch(/beacon/i);
  });
});
