// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch01-relations-and-functions/room-keeper/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch01-relations-and-functions/room-keeper/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'room-keeper', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));

function set(r: Round, wrong: boolean) {
  if (r.kind === 'repair') {
    h.setSlider(r.ans.a, 0);
    h.setSlider(wrong ? (r.ans.b === 1 ? 2 : 1) : r.ans.b, 1);
  } else if (r.kind === 'modulus') h.setSlider(wrong ? (r.ans.m === 3 ? 4 : 3) : r.ans.m, 0);
  else h.setSlider(wrong ? r.ans.c + 1 : r.ans.c, 0);
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Seat the guests'),
});

describe('Room Keeper', () => {
  it('level 1 has two dials that follow the number of guests; a wrong entry names the broken property', () => {
    h.start(1, 5);
    const g = build(1, 5);
    expect(h.sliders()).toHaveLength(2);
    expect(Number(h.sliders()[0].max)).toBe(g[0].n);
    h.setSlider(1, 0);
    h.setSlider(1, 1);
    h.click('Seat the guests');
    h.advance(3);
    expect(h.feedback()).toMatch(/not (reflexive|symmetric|transitive)/);
  });
  it('level 2 mentions the rooms; a win shows the working; a check costs a charge', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.note()).toMatch(/rooms must be/);
    h.setSlider(g[0].ans.m);
    h.click('Seat the guests');
    h.advance(3);
    expect(h.feedback()).toMatch(/equivalence relation/);
    h.advance(1);
    h.click('Check the chart or the plan');
    expect(h.feedback()).toMatch(/Check: with modulus/);
    h.click('Check the chart or the plan');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 3 counts plans', () => {
    h.start(3, 5);
    const g = build(3, 5);
    h.setSlider(g[0].ans.c + 1);
    h.click('Seat the guests');
    h.advance(3);
    expect(h.feedback()).toMatch(/Keeper tried every seating/);
  });
});
