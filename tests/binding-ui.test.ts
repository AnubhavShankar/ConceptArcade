// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch13-nuclei/binding-lab/index';
import { bindRounds, powerRounds, qRounds } from '../src/games/physics/class-12/ch13-nuclei/binding-lab/logic';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'bl', 3);
type G = { bind: ReturnType<typeof bindRounds>; q: ReturnType<typeof qRounds>; power: ReturnType<typeof powerRounds> };
const build = (level: number): G => ({ bind: level === 1 ? bindRounds() : [], q: level === 2 ? qRounds() : [], power: level === 3 ? powerRounds() : [] });
const FIRE = ['Pull the nucleus apart with this energy', 'Settle the reaction at this Q value', 'Switch the power plant on'];

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? g.bind[k].sol : level === 2 ? g.q[k].sol : g.power[k].sol),
  setWrong: (g, k, level) => h.setSlider(level === 1 ? Math.min(1800, g.bind[k].sol * 1.5) : level === 2 ? -g.q[k].sol : g.power[k].sol > 15 ? 3 : 25),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Jenga’s tower', () => {
  it('a test shot reads the mass defect, and paying too much or too little is described, not corrected', () => {
    h.start(1, 5);
    const g = build(1);
    h.click('Test shot: read the mass defect');
    expect(h.feedback()).toMatch(/mass defect is [\d.]+ u/);
    h.setSlider(Math.min(1800, g.bind[0].sol * 2));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/more binding/);
    h.setSlider(g.bind[0].sol / 2);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too little/);
  });
});

describe('level 2: Coin’s trades', () => {
  it('the wrong sign is named as the wrong direction; the rounds are the textbook reactions', () => {
    h.start(2, 5);
    const g = build(2);
    expect(h.note()).toMatch(/¹₁H \+ ³₁H/);
    h.setSlider(-g.q[0].sol);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/sign is wrong/);
  });
});

describe('level 3: Plant’s fuel', () => {
  it('the fuels come in order of energy; a test shot counts the events', () => {
    h.start(3, 5);
    expect(h.note()).toMatch(/plutonium-239/);
    h.click('Test shot: count the events in the fuel');
    expect(h.feedback()).toMatch(/atoms|kilogram/);
  });
});
