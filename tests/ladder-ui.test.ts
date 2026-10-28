// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch12-atoms/energy-ladder/index';
import { absorbRounds, beamRounds, budgetRounds } from '../src/games/physics/class-12/ch12-atoms/energy-ladder/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'el', 3);
type G = { abs: ReturnType<typeof absorbRounds>; beam: ReturnType<typeof beamRounds>; budget: ReturnType<typeof budgetRounds> };
const build = (level: number, seed: number): G => ({ abs: level === 1 ? absorbRounds(createRng(seed)) : [], beam: level === 2 ? beamRounds(createRng(seed)) : [], budget: level === 3 ? budgetRounds(createRng(seed)) : [] });
const FIRE = ['Fire the photon at the atom', 'Fire the electron beam at the gas', 'Check the energy budget'];
const mid = (lo: number, hi: number) => Math.round(((lo + hi) / 2) * 100) / 100;

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => {
    if (level === 1) h.setSlider(g.abs[k].lamSol);
    else if (level === 2) h.setSlider(mid(g.beam[k].lo, Math.min(g.beam[k].hi, 13.6)));
    else {
      h.setSlider(g.budget[k].ke, 0);
      h.setSlider(g.budget[k].pe, 1);
    }
  },
  setWrong: (g, k, level) => {
    if (level === 1) h.setSlider(g.abs[k].lamSol < 300 ? 650 : 100);
    else if (level === 2) h.setSlider(g.beam[k].lines === 1 ? 13.5 : 9);
    else {
      h.setSlider(g.budget[k].ke + 3, 0);
      h.setSlider(g.budget[k].pe, 1);
    }
  },
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Hop’s jump', () => {
  it('a photon too weak passes through; a photon for a different rung makes a different jump; a test shot lists the gaps', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(700);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too weak|does not match|different rung/);
    h.click('Test shot: compare the photon with the rung gaps');
    expect(h.feedback()).toMatch(/each photon has [\d.]+ eV/);
    expect(g.abs).toHaveLength(3);
  });
  it('dragging the wavelength knob sets the dial in tenths of a nanometre', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 400 + ((300 - 80) / 620) * 210, 312);
    h.pointer('pointermove', 400 + ((486.3 - 80) / 620) * 210, 312);
    expect(Number(h.sliders()[0].value)).toBeCloseTo(486.3, 0);
  });
});

describe('level 2: Key’s doors', () => {
  it('too little energy shows too few lines, too much shows too many, and the miss never names the energy', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(8);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/not lifted high enough/);
    h.setSlider(13.5);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/lifted too high|not lifted high enough/);
    expect(h.feedback()).not.toContain(`${g.beam[0].lo.toFixed(2)} eV`);
  });
});

describe('level 3: Orbit’s budget', () => {
  it('has two dials; the right total in the wrong split is named as such', () => {
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.sliders()).toHaveLength(2);
    h.setSlider(0, 0);
    h.setSlider(g.budget[0].ke + g.budget[0].pe, 1);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/add up to the right total|do not match|do not add up/);
    expect(h.hearts()).toBe(2);
  });
  it('the energy bars are live in round 1 and dropped later', () => {
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.note()).toMatch(/bars and the total are live/);
    h.setSlider(g.budget[0].ke, 0);
    h.setSlider(g.budget[0].pe, 1);
    h.click(FIRE[2]);
    h.advance(3.8);
    expect(h.note()).toMatch(/bars are dim/);
  });
});
