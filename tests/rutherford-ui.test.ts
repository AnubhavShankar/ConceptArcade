// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch12-atoms/rutherford-range/index';
import { foilRounds, rangeRounds } from '../src/games/physics/class-12/ch12-atoms/rutherford-range/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'rr', 2);
type G = { range: ReturnType<typeof rangeRounds>; foil: ReturnType<typeof foilRounds> };
const build = (level: number, seed: number): G => ({ range: level === 1 ? rangeRounds(createRng(seed)) : [], foil: level === 2 ? foilRounds(createRng(seed)) : [] });
const FIRE = ['Fire the alpha particle at the nucleus', 'Identify the nucleus'];

shellTests<G>(h, {
  levels: [1, 2],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? Math.round(g.range[k].kSol * 100) / 100 : g.foil[k].zSol),
  setWrong: (g, k, level) => h.setSlider(level === 1 ? Math.min(12, g.range[k].kSol * 2) : g.foil[k].zSol > 40 ? 5 : 85),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Alpha’s closest approach', () => {
  it('too much energy gets too close, too little turns back early, and a test shot reads the turning point', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(Math.min(12, g.range[0].kSol * 2));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too close/);
    h.setSlider(Math.max(1, g.range[0].kSol / 2));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/turns back too early/);
    h.click('Test shot: see where the alpha particle turns back');
    expect(h.feedback()).toMatch(/turns back at [\d.]+ fm/);
  });
  it('dragging the energy knob sets the dial in hundredths of an MeV', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 60 + ((2 - 1) / 11) * 520, 314);
    h.pointer('pointermove', 60 + ((5.5 - 1) / 11) * 520, 314);
    expect(Number(h.sliders()[0].value)).toBeCloseTo(5.5, 1);
  });
});

describe('level 2: Sonar’s foil', () => {
  it('names the element when right, and a nucleus with more charge turns the particle back farther out', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(g.foil[0].zSol > 40 ? 5 : 85);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/farther out|too strongly charged/);
    h.setSlider(g.foil[0].zSol);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/Z = \d+/);
    expect(h.phase()).toBe('between');
  });
});
