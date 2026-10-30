// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch01-relations-and-functions/portal-line/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch01-relations-and-functions/portal-line/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'portal-line', 5);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const FIRE = ['Send the travellers through', 'Send the travellers through', 'Hand the ledger to the Mayor', 'Send the travellers there and back', 'Send the travellers there and back'];
const TEST_TRIP = 'Test walk: send one test traveller';

function set(r: Round, wrong: boolean) {
  if (r.kind === 'count') h.setSlider(wrong ? r.ans.c + 1 : r.ans.c, 0);
  else if (r.lin) {
    h.setSlider(wrong ? r.ans.p + 1 : r.ans.p, 0);
    h.setSlider(r.ans.q, 1);
  } else {
    h.setSlider(wrong ? r.ans.lo + 1 : r.ans.lo, 0);
    h.setSlider(r.ans.hi, 1);
  }
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('Portal Line', () => {
  it('level 1: a fence past the turning point makes a collision; a fence that leaves Pip out says so', () => {
    h.start(1, 5);
    const g = build(1, 5);
    const r = g[0];
    h.setSlider(-5, 0);
    h.setSlider(5, 1);
    h.click(FIRE[0]);
    h.advance(3);
    expect(h.feedback()).toMatch(/landed on the same door/);
    expect(h.feedback()).not.toMatch(/\[/);
    const left = r.pip > 0 ? -5 : 1;
    h.setSlider(left, 0);
    h.setSlider(left, 1);
    h.click(FIRE[0]);
    h.advance(3);
    expect(h.feedback()).toMatch(/Pip was left outside|kept one back/);
  });
  it('level 2: fences too wide leave a dark door, too narrow let a traveller land outside', () => {
    h.start(2, 5);
    const r = build(2, 5)[0];
    h.setSlider(r.ans.lo - 2, 0);
    h.setSlider(r.ans.hi, 1);
    h.click(FIRE[1]);
    h.advance(3);
    expect(h.feedback()).toMatch(/stayed dark/);
    h.setSlider(r.ans.lo + 1, 0);
    h.click(FIRE[1]);
    h.advance(3);
    expect(h.feedback()).toMatch(/outside your fences/);
  });
  it('level 3 counts factorials and a test walk costs a charge', () => {
    h.start(3, 5);
    h.setSlider(6);
    h.click(FIRE[2]);
    h.advance(3);
    expect(h.feedback()).toMatch(/3 × 2 × 1 = 6/);
    h.advance(1);
    h.click('Test walk: send two test travellers');
    expect(h.feedback()).toMatch(/Test walkers/);
    h.click('Test walk: send two test travellers');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 4: the sliders start at p = 0, q = 1; a wrong portal costs a heart and the miss text has the side only, no number', () => {
    h.start(4, 5);
    expect(h.sliders().map((s) => s.value)).toEqual(['0', '1']);
    expect(h.note()).toMatch(/Ghost travellers/);
    const r = build(4, 5)[0];
    h.setSlider(r.ans.p, 0);
    h.setSlider(r.ans.q + 1, 1);
    h.click(FIRE[3]);
    h.advance(3);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/to the (left|right) of home/);
    expect(h.feedback()).not.toMatch(/\d/);
  });
  it('level 4: q = 0 is free, for the send button and the test walk, and nothing is spent', () => {
    h.start(4, 5);
    h.setSlider(3, 0);
    h.setSlider(0, 1);
    h.click(FIRE[3]);
    h.advance(0.2);
    expect(h.phase()).toBe('play');
    expect(h.hearts()).toBe(3);
    expect(h.feedback()).toMatch(/cannot divide by zero/);
    expect(h.feedback()).toMatch(/does not cost you anything/);
    h.click(TEST_TRIP);
    expect(h.feedback()).toMatch(/cannot divide by zero/);
    h.setSlider(2, 1);
    h.click(TEST_TRIP);
    expect(h.feedback()).toMatch(/Test walker: traveller 1 went through portal f/);
    h.click(TEST_TRIP);
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 5: composing in the wrong order (f after g) loses, and the right portal wins with both orders in the working', () => {
    h.start(5, 5);
    const r = build(5, 5)[0];
    const l = r.lin!;
    h.setSlider(l.a * l.d + l.b, 0);
    h.setSlider(r.ans.q, 1);
    h.click(FIRE[4]);
    h.advance(3);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/of home/);
    h.setSlider(r.ans.p, 0);
    h.click(FIRE[4]);
    h.advance(3);
    expect(h.phase()).toBe('between');
    expect(h.feedback()).toMatch(/Everyone home! g\(f\(x\)\) = g\(/);
    expect(h.feedback()).toMatch(/order of composition matters/);
  });
});
