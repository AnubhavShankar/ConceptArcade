// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch10-vector-algebra/break-shot/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch10-vector-algebra/break-shot/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'break-shot', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.max ? r.ans - 1 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Take the shot'),
});

describe('Break Shot', () => {
  it('the dial starts away from the answer and the task is in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].min, g[0].max, g[0].start]);
      expect(Number(s.value)).not.toBe(g[0].ans);
      expect(h.note()).toContain('λ');
    }
  });
  it('a miss reports the measured number, never λ; a meter costs a charge; a win shows the working', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(wrong(g[0]));
    h.click('Take the shot');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/dot product of the paths was/);
    h.click('Meter: read the shot for this λ');
    expect(h.feedback()).toMatch(/Energy meter/);
    h.click('Meter: read the shot for this λ');
    expect(h.feedback()).toMatch(/No charges left/);
    h.setSlider(g[0].ans);
    h.click('Take the shot');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/Dot product =/);
  });
});
