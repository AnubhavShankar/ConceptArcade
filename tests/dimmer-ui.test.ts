// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch10-wave-optics/light-dimmer/index';
import { middleRounds, shadeRounds, slitRounds } from '../src/games/physics/class-12/ch10-wave-optics/light-dimmer/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'ld', 3);
type G = { slit: ReturnType<typeof slitRounds>; shade: ReturnType<typeof shadeRounds>; mid: ReturnType<typeof middleRounds> };
const build = (level: number, seed: number): G => ({ slit: level === 1 ? slitRounds(createRng(seed)) : [], shade: level === 2 ? shadeRounds(createRng(seed)) : [], mid: level === 3 ? middleRounds(createRng(seed)) : [] });
const FIRE = ['Send the light through this gap', 'Look through the polaroids at this angle', 'Flip the ball through the three polaroids'];

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? g.slit[k].aSol : level === 2 ? g.shade[k].thetaSol : g.mid[k].solutions[0]),
  setWrong: (g, k, level) => h.setSlider(level === 1 ? g.slit[k].aSol * 0.7 : level === 2 ? (g.shade[k].thetaSol === 30 ? 60 : 30) : g.mid[k].target === 0.25 ? 5 : 45),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Flap’s gap', () => {
  it('a gap that is too narrow spreads the pattern past the target; one that is too wide squeezes it inside', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(Math.max(300, Math.round((g.slit[0].aSol * 0.7) / 50) * 50));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/beyond the target|no dark band/);
    h.setSlider(Math.min(3200, Math.round((g.slit[0].aSol * 1.4) / 50) * 50));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/inside the target/);
    expect(h.feedback()).not.toContain(`${g.slit[0].aSol} nm`);
  });
  it('a test shot reads the dark band; dragging the gap edge sets the width', () => {
    h.start(1, 5);
    h.click('Test shot: measure where the dark band falls');
    expect(h.feedback()).toMatch(/dark band is at [\d.]+°; the target is at/);
    h.pointer('pointerdown', 240, 170 - 7.5);
    h.pointer('pointermove', 240, 170 - 6);
    expect(h.sliders()[0].value).toBe('1200');
  });
});

describe('level 2: Glare’s shade', () => {
  it('too little turn lets too much through, too much turn lets too little through', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(g.shade[0].thetaSol - 20);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/Too much light/);
    h.setSlider(Math.min(90, g.shade[0].thetaSol + 25));
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/Too little light/);
  });
});

describe('level 3: the middle polaroid', () => {
  it('both θ and 90° − θ win the same round, and the miss never names the angle', () => {
    h.start(3, 5);
    const g = build(3, 5);
    const r = g.mid.find((x) => x.solutions.length === 2);
    expect(r).toBeDefined();
    h.setSlider(5);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/light/);
    expect(h.feedback()).not.toMatch(/\b(15|30|45|60|75)°/);
  });
  it('the meter is live in round 1 and off after', () => {
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.note()).toMatch(/light meter is live/);
    h.setSlider(g.mid[0].solutions[0]);
    h.click(FIRE[2]);
    h.advance(3.8);
    expect(h.note()).toMatch(/meter is off/);
  });
});
