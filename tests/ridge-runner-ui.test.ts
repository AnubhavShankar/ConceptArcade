// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch06-application-of-derivatives/ridge-runner/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch06-application-of-derivatives/ridge-runner/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'ridge-runner', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.hi ? r.ans - 1 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Plant the flag'),
});

describe('Ridge Runner', () => {
  it('the dial follows each round’s stretch and starts away from the answer', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].lo, g[0].hi, g[0].start]);
      expect(Number(s.value)).not.toBe(g[0].ans);
    }
  });
  it('level 2: planting on the flat spot says the ground only flattens', () => {
    h.start(2, 5);
    const g = build(2, 5);
    const flat = g[0].crit.find((c) => c !== g[0].ans)!;
    h.setSlider(flat);
    h.click('Plant the flag');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/flattens for a moment/);
  });
  it('a miss never gives the position, a survey costs a charge and a win shows f′', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(wrong(g[0]));
    h.click('Plant the flag');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/slope/);
    h.setSlider(g[0].ans);
    h.click('Plant the flag');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/f′\(x\) = 0 at x/);
    h.advance(1);
    h.click('Survey: read the height and slope at the flag');
    expect(h.feedback()).toMatch(/Survey at x/);
    h.click('Survey: read the height and slope at the flag');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 3 mentions the end points in the working', () => {
    h.start(3, 5);
    const g = build(3, 5);
    h.setSlider(g[0].ans);
    h.click('Plant the flag');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/end points/);
  });
});
