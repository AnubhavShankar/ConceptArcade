// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch03-matrices/mirror-crystal/index';
import { DIALS, KINDS, buildRounds, type Round } from '../src/games/mathematics/class-12/ch03-matrices/mirror-crystal/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'mirror-crystal', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const keys = (r: Round) => DIALS[r.kind].map((d) => d.key);

function set(r: Round, wrong: boolean) {
  keys(r).forEach((k, i) => {
    const d = DIALS[r.kind][i];
    const off = wrong && i === 0 ? (r.ans[k] + d.step > d.max ? -d.step : d.step) : 0;
    h.setSlider(r.ans[k] + off, i);
  });
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Open the crystal'),
});

describe('Mirror Crystal', () => {
  it('each level has its dials and describes the crystal', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(DIALS[KINDS[level - 1]].length);
      expect(h.note().length).toBeGreaterThan(30);
    }
  });
  it('the half-step dials of level 3 accept halves', () => {
    h.start(3, 5);
    h.setSlider(2.5, 1);
    expect(Number(h.sliders()[1].value)).toBe(2.5);
  });
  it('a miss names the mirror pair, a check costs a charge and a win shows the working', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0], true);
    h.click('Open the crystal');
    h.advance(3);
    expect(h.feedback()).toMatch(/mirror caught the gems at row \d, column \d/);
    set(g[0], false);
    h.click('Open the crystal');
    h.advance(3);
    expect(h.feedback()).toMatch(/A′ = A/);
    h.advance(1);
    h.click('Check the mirror pairs');
    expect(h.feedback()).toMatch(/Check:/);
    h.click('Check the mirror pairs');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('the skew level explains the zero diagonal', () => {
    h.start(2, 5);
    const g = build(2, 5);
    set(g[0], false);
    h.click('Open the crystal');
    h.advance(3);
    expect(h.feedback()).toMatch(/diagonal entry is 0/);
  });
});
