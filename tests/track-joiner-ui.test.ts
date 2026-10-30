// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/track-joiner/index';
import { DIALS, KINDS, buildRounds, type Round } from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/track-joiner/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'track-joiner', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const keys = (r: Round) => DIALS[r.kind].map((d) => d.key);

function set(r: Round, wrong: boolean) {
  keys(r).forEach((key, i) => h.setSlider(r.ans[key] + (wrong && i === 0 ? 1 : 0), i));
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Send Zip down the track'),
});

describe('Track Joiner', () => {
  it('each level has its dials and shows the track in words', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(DIALS[KINDS[level - 1]].length);
      expect(h.note()).toMatch(/f\(x\) = /);
    }
  });
  it('a gap and a corner are told apart, and a test ride costs a charge', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(g[0].ans.k + 1);
    h.click('Send Zip down the track');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/the track broke/);
    expect(h.feedback()).not.toMatch(/k = /);
    h.start(3, 5);
    const s = build(3, 5);
    h.setSlider(s[0].ans.k + 1, 0);
    h.setSlider(s[0].ans.m - s[0].joins[0], 1);
    h.click('Send Zip down the track');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/bent sharply|track broke/);
  });
  it('a win shows the working and the test ride runs out', () => {
    h.start(2, 5);
    const g = build(2, 5);
    set(g[0], false);
    h.click('Send Zip down the track');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/Continuity at x = /);
    h.advance(1);
    h.click('Test ride: read the limits at the first broken join');
    expect(h.feedback()).toMatch(/Test ride/);
    h.click('Test ride: read the limits at the first broken join');
    expect(h.feedback()).toMatch(/No charges left/);
  });
});
