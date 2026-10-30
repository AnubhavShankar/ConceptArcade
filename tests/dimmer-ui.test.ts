// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch10-wave-optics/light-dimmer/index';
import { middleRounds, shadeRounds, slitRounds } from '../src/games/physics/class-12/ch10-wave-optics/light-dimmer/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'ld', 3);
type G = { slit: ReturnType<typeof slitRounds>; shade: ReturnType<typeof shadeRounds>; mid: ReturnType<typeof middleRounds> };
const build = (level: number, seed: number): G => ({ slit: level === 1 ? slitRounds(createRng(seed)) : [], shade: level === 2 ? shadeRounds(createRng(seed)) : [], mid: level === 3 ? middleRounds(createRng(seed)) : [] });
const FIRE = ['Send the light through this gap', 'Look through the polaroids at this angle', 'Flip the ball through the three polaroids'];

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? g.slit[k].aSol : level === 2 ? Math.round(g.shade[k].thetaSol) : Math.round(g.mid[k].solutions[0])),
  setWrong: (g, k, level) => h.setSlider(level === 1 ? g.slit[k].aSol * 0.7 : level === 2 ? (Math.abs(g.shade[k].thetaSol - 30) < 3 ? 60 : 30) : g.mid[k].target === 0.25 ? 5 : 45),
  commit: (level) => h.click(FIRE[level - 1]),
});

// ---- no leaks: the helper fades, and a miss shows no true value ---------------------------------------------------------------
const TEST_SHOT = ['Test shot: measure where the dark band falls', 'Test shot: measure the light that gets through', 'Test shot: measure the light that gets through'];
/** What the true helper draws. Level 1 draws a "?" on the wall exactly when the pattern is off. */
const hasHelper = (t: string[], level: number) => (level === 1 ? !t.includes('?') : t.some((s) => (level === 2 ? /of the lamp reaches the eye$/ : /of the light after the first gets through$/).test(s)));
const frameAfter = (rc: ReturnType<typeof canvasRecorder>, dt: number) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rc.clear();
  h.advance(0.05);
  return texts(rc.rec);
};
const solSet = (g: G, level: number, k: number) => (level === 1 ? g.slit[k].aSol : level === 2 ? Math.round(g.shade[k].thetaSol) : Math.round(g.mid[k].solutions[0]));
const playTo = (level: number, seed: number, round: number) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    h.setSlider(solSet(g, level, k));
    h.click(FIRE[level - 1]);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
/** Two settings that miss on the same side: level 1 a gap too narrow (but still wider than nλ) or too wide; level 2 too little turn or too much; level 3 more light or less. */
const sidePair = (g: G, level: number, k: number, side: 'high' | 'low'): [number, number] | null => {
  if (level === 1) {
    const a = g.slit[k].aSol;
    return side === 'high' ? [a - 100, a - 200] : [a + 150, a + 300];
  }
  if (level === 2) {
    const t = g.shade[k].thetaSol;
    return side === 'high' ? [Math.round(t) - 6, Math.round(t) - 12] : [Math.round(t) + 6, Math.round(t) + 12];
  }
  const m = g.mid[k];
  if (side === 'high') return m.target === 0.25 ? null : [43, 47];
  const lo = Math.min(...m.solutions);
  const hi = Math.max(...m.solutions);
  return m.target === 0.25 ? [20, 70] : [Math.round(lo) - 6, Math.round(hi) + 6];
};
const wrongOne = (g: G, level: number, k: number) => (sidePair(g, level, k, 'low') as [number, number])[0];

describe('no leaks: the helper fades, and a miss shows no true value', () => {
  it('round 1 has the live helper; round 2 only for about 1.5 s after a test shot; round 3 never, even after a test shot', () => {
    for (const level of [1, 2, 3]) {
      const rc = canvasRecorder();
      h.start(level, 5);
      expect(hasHelper(frameAfter(rc, 0.1), level)).toBe(true);
      const g = playTo(level, 5, 1);
      expect(hasHelper(frameAfter(rc, 0.1), level)).toBe(false);
      h.click(TEST_SHOT[level - 1]);
      expect(hasHelper(frameAfter(rc, 0.3), level)).toBe(true);
      expect(hasHelper(frameAfter(rc, 1.5), level)).toBe(false);
      h.setSlider(solSet(g, level, 1));
      h.click(FIRE[level - 1]);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3/);
      expect(hasHelper(frameAfter(rc, 0.1), level)).toBe(false);
      h.click(TEST_SHOT[level - 1]);
      expect(hasHelper(frameAfter(rc, 0.3), level)).toBe(false);
    }
  });
  it('the hint text says the helper shows for a moment after a test shot', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      playTo(level, 5, 1);
      expect(h.note()).toMatch(/for a moment after a test shot/);
    }
  });
  it('a miss in round 2 or 3 never draws the helper; a win does', () => {
    for (const level of [1, 2, 3]) {
      for (const round of [1, 2]) {
        const rc = canvasRecorder();
        h.start(level, 5);
        const g = playTo(level, 5, round);
        h.setSlider(wrongOne(g, level, round));
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(hasHelper(frameAfter(rc, 0.05), level)).toBe(false);
        h.advance(1);
        h.setSlider(solSet(g, level, round));
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(hasHelper(frameAfter(rc, 0.05), level)).toBe(true);
        h.advance(1);
      }
    }
  });
  it('two wrong settings on the same side give the same words and the same drawn end (the player’s own label aside)', () => {
    const own = /^[\d.]+( nm|°)$/;
    for (const level of [1, 2, 3]) {
      for (const side of ['high', 'low'] as const) {
        const rc = canvasRecorder();
        const ends: string[][] = [];
        const dots: unknown[] = [];
        const says: string[] = [];
        for (const f of [0, 1]) {
          h.start(level, 5);
          const g = playTo(level, 5, 2);
          const pair = sidePair(g, level, 2, side);
          if (!pair) break;
          h.setSlider(pair[f]);
          h.click(FIRE[level - 1]);
          h.advance(2.0);
          ends.push(frameAfter(rc, 0.05).filter((s) => !own.test(s)));
          dots.push(rc.rec.arcs.filter((a) => a.r === 6 && a.x === 500));
          h.advance(1);
          says.push(h.feedback());
        }
        if (says.length < 2) continue;
        expect(says[0]).toBe(says[1]);
        expect(ends[0]).toEqual(ends[1]);
        expect(dots[0]).toEqual(dots[1]);
        if (level === 1) expect((dots[0] as unknown[]).length).toBe(1);
      }
    }
  });
  it('the start never wins: firing at once is a miss in every round of every level', () => {
    for (const level of [1, 2, 3]) {
      for (const round of [0, 1, 2]) {
        h.start(level, 5);
        playTo(level, 5, round);
        const hearts = h.hearts();
        h.click(FIRE[level - 1]);
        h.advance(2.8);
        expect(h.hearts()).toBe(hearts - 1);
      }
    }
  });
  it('a miss never prints the player’s own output fraction (round 2, level 2 and 3)', () => {
    for (const level of [2, 3]) {
      const rc = canvasRecorder();
      h.start(level, 5);
      const g = playTo(level, 5, 1);
      h.setSlider(wrongOne(g, level, 1));
      h.click(FIRE[level - 1]);
      h.advance(2.0);
      expect(frameAfter(rc, 0.05).some((s) => /of the (lamp|light)/.test(s))).toBe(false);
    }
  });
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
    expect(h.note()).toMatch(/meter shows for a moment after a test shot/);
  });
});
