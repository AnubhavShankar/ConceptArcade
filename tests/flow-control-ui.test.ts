// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/flow-control/index';
import { SPEED, buildRounds, type Round } from '../src/games/mathematics/class-12/ch07-integrals/flow-control/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'flow-control', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.max ? r.ans - 1 : r.ans + 1);

/** The moment the next commit will shut the gate. */
let want = 0;
/** Open the gate, wait until the clock reads `at`, shut it. */
function run(at: number) {
  h.click('Open the gate');
  h.advance(at / SPEED);
  h.click('Shut the gate');
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => (want = g[k].ans),
  setWrong: (g, k) => (want = wrong(g[k])),
  commit: () => run(want),
});

describe('Flow Control', () => {
  it('shutting the gate before it is open is free and changes nothing', () => {
    h.start(1, 5);
    h.click('Shut the gate');
    expect(h.feedback()).toMatch(/not open yet/);
    expect(h.hearts()).toBe(3);
    expect(h.phase()).toBe('play');
  });
  it('the volume needed is in the note for every level', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      expect(h.note()).toContain(String(build(level, 5)[0].V));
    }
  });
  it('a miss says what the tank holds and which way, never the moment; a win shows the antiderivative', () => {
    h.start(1, 5);
    const g = build(1, 5);
    run(wrong(g[0]));
    h.advance(3);
    expect(h.feedback()).toMatch(/the tank holds/);
    expect(h.feedback()).toMatch(/short of|over/);
    run(g[0].ans);
    h.advance(3);
    expect(h.feedback()).toMatch(/F\(t\) =/);
  });
  it('slow motion costs a charge and lets the player shut the gate at half the speed', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.click('Slow motion: run this round at half speed');
    expect(h.feedback()).toMatch(/half speed/);
    h.click('Slow motion: run this round at half speed');
    expect(h.feedback()).toMatch(/already on/);
    h.click('Open the gate');
    h.advance(g[0].ans / (SPEED / 2));
    h.click('Shut the gate');
    h.advance(3);
    expect(h.score()).toBeGreaterThan(0);
  });
  it('the gate shuts by itself at the end of the range, and that is a miss', () => {
    h.start(1, 5);
    h.click('Open the gate');
    h.advance(12);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/over/);
  });
  it('level 4 says the odd terms cancel', () => {
    h.start(4, 5);
    const g = build(4, 5);
    run(g[0].ans);
    h.advance(3);
    expect(h.feedback()).toMatch(/odd terms cancel/);
  });
});
