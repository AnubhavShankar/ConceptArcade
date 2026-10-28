// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch10-wave-optics/slit-dash/index';
import { gaugeRounds, hunterRounds, lockRounds } from '../src/games/physics/class-12/ch10-wave-optics/slit-dash/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'sd', 3);
type G = { hunt: ReturnType<typeof hunterRounds>; lock: ReturnType<typeof lockRounds>; gauge: ReturnType<typeof gaugeRounds> };
const build = (level: number, seed: number): G => ({ hunt: level === 1 ? hunterRounds(createRng(seed)) : [], lock: level === 2 ? lockRounds(createRng(seed)) : [], gauge: level === 3 ? gaugeRounds(createRng(seed)) : [] });
const FIRE = ['Fire the laser through the slits', 'Lock the detector here', 'Play the note at this meter reading'];

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? g.hunt[k].lamSol : level === 2 ? g.lock[k].xSol : g.gauge[k].sol),
  setWrong: (g, k, level) => h.setSlider(level === 1 ? g.hunt[k].lamSol + 100 : level === 2 ? (g.lock[k].xSol > 6 ? g.lock[k].xSol - 2.3 : g.lock[k].xSol + 2.3) : Math.min(1, g.gauge[k].sol + 0.4) === g.gauge[k].sol ? g.gauge[k].sol - 0.4 : Math.min(1, g.gauge[k].sol + 0.4)),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Hawkeye’s range', () => {
  it('a test shot costs a charge and tells where the stripe lands; the colour dial moves with the handle', () => {
    h.start(1, 5);
    h.click('Test shot: see where the bright stripe lands');
    expect(h.feedback()).toMatch(/bright fringe lands [\d.]+ mm from the centre; the target is at/);
    h.click('Test shot: see where the bright stripe lands');
    expect(h.feedback()).toMatch(/No charges left/);
    h.pointer('pointerdown', 70 + ((450 - 380) / 380) * 500, 312);
    h.pointer('pointermove', 70 + ((600 - 380) / 380) * 500, 312);
    expect(h.sliders()[0].value).toBe('600');
  });
  it('a stripe landing past or short of the target is described, not corrected', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(g.hunt[0].lamSol + 100);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/past the target/);
    expect(h.feedback()).not.toContain(`${g.hunt[0].lamSol} nm`);
  });
});

describe('level 2: the double lock', () => {
  it('the first bright fringe of one colour is bright for that colour only, and the message says so', () => {
    h.start(2, 5);
    const g = build(2, 5);
    const r = g.lock[0];
    h.setSlider(Math.round(((r.lam1 * 1e-9 * r.D) / (r.d * 1e-3)) * 1e4) / 10);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/Only the|Neither|Both/);
    expect(h.hearts()).toBe(2);
  });
  it('the help fades: marks, then dim patterns, then nothing until you lock', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.note()).toMatch(/Marks show where the two patterns meet/);
    h.setSlider(g.lock[0].xSol);
    h.click(FIRE[1]);
    h.advance(3.8);
    expect(h.note()).toMatch(/marks are off/);
  });
});

describe('level 3: the power meter', () => {
  it('the test shot gives the amplitude, not the brightness, and dragging the needle sets the meter', () => {
    h.start(3, 5);
    h.click('Test shot: measure the resultant amplitude');
    expect(h.feedback()).toMatch(/amplitude of [\d.]+a here/);
    h.pointer('pointerdown', 470 - 130 * Math.cos(Math.PI * 0.5), 270 - 130 * Math.sin(Math.PI * 0.5));
    h.pointer('pointermove', 470 - 130 * Math.cos(Math.PI * 0.25), 270 - 130 * Math.sin(Math.PI * 0.25));
    expect(h.sliders()[0].value).toBe('0.25');
  });
});
