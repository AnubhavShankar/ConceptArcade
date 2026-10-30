// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch10-wave-optics/slit-dash/index';
import { LAMP, SLIDERS, gaugeRounds, hunterRounds, lampMiss, lampRounds, lockRounds } from '../src/games/physics/class-12/ch10-wave-optics/slit-dash/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'sd', 4);
type G = { hunt: ReturnType<typeof hunterRounds>; lock: ReturnType<typeof lockRounds>; gauge: ReturnType<typeof gaugeRounds>; lamp: ReturnType<typeof lampRounds> };
const build = (level: number, seed: number): G => ({
  hunt: level === 1 ? hunterRounds(createRng(seed)) : [],
  lock: level === 2 ? lockRounds(createRng(seed)) : [],
  gauge: level === 3 ? gaugeRounds(createRng(seed)) : [],
  lamp: level === 4 ? lampRounds(createRng(seed)) : [],
});
const FIRE = ['Fire the laser through the slits', 'Lock the detector here', 'Play the note at this meter reading', 'Lock the meter reading'];
const PHASE_CHECK = 'Phase check: are the two sources locked in phase?';

shellTests<G>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? g.hunt[k].lamSol : level === 2 ? g.lock[k].xSol : level === 3 ? g.gauge[k].sol : g.lamp[k].sol),
  setWrong: (g, k, level) =>
    h.setSlider(
      level === 1
        ? g.hunt[k].lamSol + 100
        : level === 2
          ? (g.lock[k].xSol > 6 ? g.lock[k].xSol - 2.3 : g.lock[k].xSol + 2.3)
          : level === 3
            ? (Math.min(1, g.gauge[k].sol + 0.4) === g.gauge[k].sol ? g.gauge[k].sol - 0.4 : Math.min(1, g.gauge[k].sol + 0.4))
            : g.lamp[k].sol === LAMP.max ? LAMP.max - 1 : g.lamp[k].sol + 1,
    ),
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
    h.pointer('pointerdown', 470 - 130 * Math.cos(Math.PI * SLIDERS.g.start), 270 - 130 * Math.sin(Math.PI * SLIDERS.g.start));
    h.pointer('pointermove', 470 - 130 * Math.cos(Math.PI * 0.25), 270 - 130 * Math.sin(Math.PI * 0.25));
    expect(h.sliders()[0].value).toBe('0.25');
  });
});

describe('level 4: lamps or lasers', () => {
  const seeds = [5, 6, 8, 9, 11, 13, 21, 34];
  it('the meter starts at 2.5 I₀ in every round, and committing the start setting is a miss', () => {
    for (const seed of seeds) {
      h.start(4, seed);
      const g = build(4, seed);
      for (let k = 0; k < 3; k++) {
        expect(h.sliders()[0].value).toBe(String(LAMP.start));
        if (k === 0) {
          h.click(FIRE[3]);
          h.advance(2.8);
          expect(h.hearts()).toBe(2);
          expect(h.sliders()[0].value).toBe(String(LAMP.start));
        }
        h.setSlider(g.lamp[k].sol);
        h.click(FIRE[3]);
        h.advance(3.8);
      }
      expect(h.phase()).toBe('won');
    }
  });
  it('only the true brightness wins: every other meter setting costs a heart, in every round', () => {
    for (const seed of [5, 8]) {
      const g = build(4, seed);
      for (let k = 0; k < 3; k++) {
        for (let x = LAMP.min; x <= LAMP.max; x++) {
          h.start(4, seed);
          for (let j = 0; j < k; j++) {
            h.setSlider(g.lamp[j].sol);
            h.click(FIRE[3]);
            h.advance(3.8);
          }
          h.setSlider(x);
          h.click(FIRE[3]);
          h.advance(2.8);
          if (x === g.lamp[k].sol) expect(h.hearts()).toBe(3);
          else expect(h.hearts()).toBe(2);
        }
      }
    }
  });
  it('a miss says only too high or too low and prints no brightness but the setting', () => {
    h.start(4, 5);
    const g = build(4, 5);
    const r = g.lamp[0];
    const x = r.sol === LAMP.max ? 0 : LAMP.max;
    h.setSlider(x);
    h.click(FIRE[3]);
    h.advance(2.8);
    expect(h.feedback()).toBe(lampMiss(r, x));
    expect(h.feedback()).toMatch(/too (high|low) for the light at that point/);
    expect(h.feedback()).not.toMatch(/brighter|dimmer|Coherent|incoherent|φ/);
    expect(h.feedback().match(/\d+(\.\d+)?/g)).toEqual([String(x / 2)]);
  });
  it('the paid phase check costs a charge and never gives the brightness; the boss round has no charge', () => {
    h.start(4, 5);
    const g = build(4, 5);
    h.click(PHASE_CHECK);
    expect(h.feedback()).toMatch(/Phase check: the two beams keep a fixed phase difference of φ = \d+° at this point/);
    expect(h.feedback()).not.toMatch(/I₀/);
    h.click(PHASE_CHECK);
    expect(h.feedback()).toMatch(/No charges left/);
    h.setSlider(g.lamp[0].sol);
    h.click(FIRE[3]);
    h.advance(3.8);
    h.click(PHASE_CHECK);
    expect(h.feedback()).toMatch(g.lamp[1].coherent ? /Phase check: the two beams keep a fixed phase difference/ : /Phase check: the two bulbs never keep a steady phase difference/);
    h.setSlider(g.lamp[1].sol);
    h.click(FIRE[3]);
    h.advance(3.8);
    expect(h.hud()).toMatch(/BOSS/);
    h.click(PHASE_CHECK);
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('a win shows the working: coherent beams for a laser, 2I₀ everywhere for bulbs', () => {
    h.start(4, 6);
    const g = build(4, 6);
    h.setSlider(g.lamp[0].sol);
    h.click(FIRE[3]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/Coherent beams: φ = 2πΔ\/λ = .*= [\d.]+I₀\./);
    h.advance(1);
    h.setSlider(g.lamp[1].sol);
    h.click(FIRE[3]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(g.lamp[1].coherent ? /Coherent beams: φ = 2πΔ\/λ = .*= [\d.]+I₀\./ : /incoherent.*I = 2I₀ everywhere/);
  });
  it('the help fades: live waves and sum, then waves only with a charge, then nothing', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(h.note()).toMatch(/waves and their sum are drawn live/);
    h.setSlider(g.lamp[0].sol);
    h.click(FIRE[3]);
    h.advance(3.8);
    expect(h.note()).toMatch(/sum is hidden: a phase check costs a charge/);
    h.setSlider(g.lamp[1].sol);
    h.click(FIRE[3]);
    h.advance(3.8);
    expect(h.note()).toMatch(/Nothing is drawn: work it out/);
  });
  it('the hint line names the source and the path difference but not the brightness', () => {
    for (const seed of seeds) {
      h.start(4, seed);
      const r = build(4, seed).lamp[0];
      expect(h.note()).toMatch(/A laser feeds both slits\. At the marked point the path difference is Δ = (λ\/\d|0)\./);
      expect(h.note()).not.toContain(`${r.sol / 2}I₀`);
    }
  });
  it('dragging the meter knob sets the reading', () => {
    h.start(4, 5);
    h.pointer('pointerdown', 560, 280 - LAMP.start * 30);
    h.pointer('pointermove', 560, 280 - 8 * 30);
    expect(h.sliders()[0].value).toBe('8');
    h.pointer('pointermove', 560, 280 - 3 * 30);
    expect(h.sliders()[0].value).toBe('3');
  });
});
