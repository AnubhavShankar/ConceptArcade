// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch14-semiconductor-electronics-materials-devices-and-simple-circuits/junction-run/index';
import { biasRounds, curveRounds, rectRounds } from '../src/games/physics/class-12/ch14-semiconductor-electronics-materials-devices-and-simple-circuits/junction-run/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'junction-run', 3);
type G = { bias: ReturnType<typeof biasRounds>; rect: ReturnType<typeof rectRounds>; curve: ReturnType<typeof curveRounds> };
const build = (level: number, seed: number): G => ({ bias: level === 1 ? biasRounds(createRng(seed)) : [], rect: level === 2 ? rectRounds(createRng(seed)) : [], curve: level === 3 ? curveRounds(createRng(seed)) : [] });
const FIRE = ['Connect the battery and hop', 'Run the lamp at this flash rate', 'Race with this resistance'];

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? g.bias[k].sol : level === 2 ? g.rect[k].sol : g.curve[k].logSol),
  setWrong: (g, k, level) => h.setSlider(level === 1 ? -g.bias[k].sol : level === 2 ? g.rect[k].sol + 40 : Math.min(9, g.curve[k].logSol + 2)),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Hopper’s barrier', () => {
  it('a battery the wrong way round is described, and a test shot reads the built-in barrier', () => {
    h.start(1, 5);
    const g = build(1, 5);
    expect(h.note()).toMatch(/hill is drawn live/);
    h.setSlider(-g.bias[0].sol);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/wrong way round/);
    h.click('Test shot: read the built-in barrier and the battery');
    expect(h.feedback()).toMatch(/built-in barrier/);
  });
  it('dragging the handle sets the battery', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 610, 290 - ((0 + 6) / 7) * 230);
    h.pointer('pointermove', 610, 290 - ((0.5 + 6) / 7) * 230);
    expect(Number(h.sliders()[0].value)).toBeCloseTo(0.5, 1);
  });
});

describe('level 2: Beat’s rhythm', () => {
  it('a lamp that is too fast is described, and a test shot says when the diode conducts', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(g.rect[0].sol + 20);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/faster than the circuit/);
    h.click('Test shot: read when the diodes conduct');
    expect(h.feedback()).toMatch(/one diode/);
  });
});

describe('level 3: Slope’s resistance', () => {
  it('the straight V/I slip gets its own message and the reverse round reads µA', () => {
    h.start(3, 5);
    const g = build(3, 5);
    h.setSlider(Math.log10(Math.abs(g.curve[0].v2) / (g.curve[0].i2 * 1e-3)));
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/line from the origin/);
    h.click('Test shot: read the change in voltage and current');
    expect(h.feedback()).toMatch(/voltage rises by/);
  });
});

// ---- no leaks: the helper fades, and a miss shows no true value ---------------------------------------------------------------
const TEST_SHOT = ['Test shot: read the built-in barrier and the battery', 'Test shot: read when the diodes conduct', 'Test shot: read the change in voltage and current'];
/** What the true helper draws: the live hill and its label; the output trace; the ΔV, ΔI and working lines. */
const HELPER = [/^barrier [\d.]+ V$/, /^output$/, /^ΔV = |^ΔI = |^V and I at this point/];
const solOf = (g: G, level: number, k: number) => (level === 1 ? g.bias[k].sol : level === 2 ? g.rect[k].sol : g.curve[k].logSol);
const frameAfter = (rc: ReturnType<typeof canvasRecorder>, dt: number) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rc.clear();
  h.advance(0.05);
  return texts(rc.rec);
};
const hasHelper = (t: string[], level: number) => t.some((s) => HELPER[level - 1].test(s));
const playTo = (level: number, seed: number, round: number) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    h.setSlider(solOf(g, level, k));
    h.click(FIRE[level - 1]);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
/** Two settings that miss on the same side, without changing the polarity or hitting the classic slip. */
const sidePair = (g: G, level: number, k: number, side: 'high' | 'low'): [number, number] => {
  const s = solOf(g, level, k);
  if (level === 1) return side === 'high' ? [Math.min(1, s + 0.1), Math.min(1, s + 0.3)] : s > 0 ? [s - 0.05, s - 0.15] : [s - 0.1, s - 0.5];
  if (level === 2) return side === 'high' ? [s + 10, s + 30] : [s - 6, s - 12];
  return side === 'high' ? [s + 0.8, s + 1.6] : [Math.max(0, s - 0.3), Math.max(0, s - 0.6)];
};
const wrongOne = (g: G, level: number, k: number) => sidePair(g, level, k, 'high')[0];

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
      h.setSlider(solOf(g, level, 1));
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
        h.setSlider(solOf(g, level, round));
        h.click(FIRE[level - 1]);
        h.advance(2.0);
        expect(hasHelper(frameAfter(rc, 0.05), level)).toBe(true);
        h.advance(1);
      }
    }
  });
  it('two wrong settings on the same side give the same words and the same drawn end (the player’s own readout aside)', () => {
    const own = /^[+−-]?[\d.]+( × 10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)? (V|Ω)$/;
    for (const level of [1, 2, 3]) {
      for (const side of ['high', 'low'] as const) {
        const rc = canvasRecorder();
        const ends: string[][] = [];
        const says: string[] = [];
        for (const f of [0, 1]) {
          h.start(level, 5);
          const g = playTo(level, 5, 2);
          h.setSlider(sidePair(g, level, 2, side)[f]);
          h.click(FIRE[level - 1]);
          h.advance(2.0);
          ends.push(frameAfter(rc, 0.05).filter((s) => !own.test(s)));
          h.advance(1);
          says.push(h.feedback());
        }
        expect(says[0]).toBe(says[1]);
        expect(says[0]).not.toMatch(/\d/);
        expect(ends[0]).toEqual(ends[1]);
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
});

describe('level 2: the kinds and supplies vary', () => {
  it('over many seeds every round position sees both kinds and several supplies', () => {
    const kinds = [new Set<string>(), new Set<string>(), new Set<string>()];
    const supplies = new Set<number>();
    for (let s = 1; s <= 60; s++) {
      rectRounds(createRng(s * 7919 + 13)).forEach((r, k) => {
        kinds[k].add(r.kind);
        supplies.add(r.f);
      });
    }
    for (const k of kinds) expect(k.size).toBe(2);
    expect(supplies.size).toBeGreaterThanOrEqual(5);
  });
});
