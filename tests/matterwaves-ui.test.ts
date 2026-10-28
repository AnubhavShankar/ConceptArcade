// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch11-dual-nature-of-radiation-and-matter/matter-waves/index';
import { countRounds, electronNm, tubeRounds, tuneRounds } from '../src/games/physics/class-12/ch11-dual-nature-of-radiation-and-matter/matter-waves/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'mw', 3);
type G = { count: ReturnType<typeof countRounds>; tune: ReturnType<typeof tuneRounds>; tube: ReturnType<typeof tubeRounds> };
const build = (level: number, seed: number): G => ({ count: level === 1 ? countRounds(createRng(seed)) : [], tune: level === 2 ? tuneRounds(createRng(seed)) : [], tube: level === 3 ? tubeRounds(createRng(seed)) : [] });
const FIRE = ['Lock in the photon count', 'Send the electron at the crystal', 'Fire the X-ray tube at this voltage'];
const voltFor = (target: number) => Math.round((6.63e-34 / (target * 1e-9)) ** 2 / (2 * 9.1e-31 * 1.6e-19));

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? g.count[k].nSol : level === 2 ? voltFor(g.tune[k].target) : g.tube[k].kvSol),
  setWrong: (g, k, level) => h.setSlider(level === 1 ? g.count[k].nSol * 2 > 30 ? g.count[k].nSol / 2 : g.count[k].nSol * 2 : level === 2 ? (voltFor(g.tune[k].target) > 300 ? 50 : 700) : g.tube[k].kvSol === 50 ? 10 : 70),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Pixel’s photon count', () => {
  it('a test shot reads the photon energy; counting too many or too few is described, not corrected', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.click('Test shot: read the energy of one photon');
    expect(h.feedback()).toMatch(/Each photon carries [\d.]+ × 10⁻¹⁹ J/);
    h.setSlider(Math.min(30, g.count[0].nSol * 2));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/more photons/);
    h.setSlider(Math.max(1, g.count[0].nSol / 2));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/fewer photons/);
  });
});

describe('level 2: Eli’s tuning', () => {
  it('too low a voltage gives a wave too long; too high a voltage a wave too short; a test shot reads the wavelength', () => {
    h.start(2, 5);
    const g = build(2, 5);
    const v = voltFor(g.tune[0].target);
    h.setSlider(10);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too long/);
    h.setSlider(800);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too short/);
    h.click('Test shot: measure the electron’s wavelength');
    expect(h.feedback()).toMatch(/de Broglie wavelength is [\d.]+ nm/);
    expect(electronNm(v)).toBeCloseTo(g.tune[0].target, 2);
  });
});

describe('level 3: Charge’s power shot', () => {
  it('a test shot gives the shortest wavelength and the highest frequency; dragging the charge knob sets the voltage', () => {
    h.start(3, 5);
    h.click('Test shot: read the shortest wavelength');
    expect(h.feedback()).toMatch(/shortest X-ray wavelength is [\d.]+ Å/);
    h.pointer('pointerdown', 60 + ((10 - 5) / 75) * 520, 314);
    h.pointer('pointermove', 60 + ((40 - 5) / 75) * 520, 314);
    expect(h.sliders()[0].value).toBe('40');
  });
});
