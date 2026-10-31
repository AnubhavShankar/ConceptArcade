// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch01-relations-and-functions/room-keeper/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch01-relations-and-functions/room-keeper/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts, type CanvasRec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'room-keeper', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));

function set(r: Round, wrong: boolean) {
  if (r.kind === 'repair') {
    h.setSlider(r.ans.a, 0);
    h.setSlider(wrong ? (r.ans.b === 1 ? 2 : 1) : r.ans.b, 1);
  } else if (r.kind === 'modulus') h.setSlider(wrong ? (r.ans.m === 3 ? 4 : 3) : r.ans.m, 0);
  else h.setSlider(wrong ? r.ans.c + 1 : r.ans.c, 0);
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Seat the guests'),
});

describe('Room Keeper', () => {
  it('level 1 has two dials that follow the number of guests; a wrong entry names the broken property', () => {
    h.start(1, 5);
    const g = build(1, 5);
    expect(h.sliders()).toHaveLength(2);
    expect(Number(h.sliders()[0].max)).toBe(g[0].n);
    h.setSlider(1, 0);
    h.setSlider(1, 1);
    h.click('Seat the guests');
    h.advance(3);
    expect(h.feedback()).toMatch(/not (reflexive|symmetric|transitive)/);
  });
  it('level 2 mentions the rooms; a win shows the working; a check costs a charge', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.note()).toMatch(/rooms must be/);
    h.setSlider(g[0].ans.m);
    h.click('Seat the guests');
    h.advance(3);
    expect(h.feedback()).toMatch(/equivalence relation/);
    h.advance(1);
    h.click('Check the chart or the plan');
    expect(h.feedback()).toMatch(/Check: with modulus/);
    h.click('Check the chart or the plan');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 3 counts plans', () => {
    h.start(3, 5);
    const g = build(3, 5);
    h.setSlider(g[0].ans.c + 1);
    h.click('Seat the guests');
    h.advance(3);
    expect(h.feedback()).toMatch(/Keeper tried every seating/);
  });
});

const SEAT = 'Seat the guests';
const CHECK = 'Check the chart or the plan';
const frame = (R: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
/** Level 1: the property lamps (words reflexive, symmetric, transitive). Level 2: the "m = N: K rooms" colour caption. */
const liveDrawn = (level: number, rec: CanvasRec['rec']) => texts(rec).some((s) => (level === 1 ? /reflexive|symmetric|transitive/.test(s) : /^m = \d+: \d+ rooms?$/.test(s)));
const canvas = () => h.$('canvas')!;
const playRound = (level: number, g: Round[], k: number) => {
  set(g[k], false);
  h.click(SEAT);
  h.advance(2.8);
  h.advance(1);
  void level;
};
const playTo = (level: number, g: Round[], round: number) => {
  for (let k = 0; k < round; k++) playRound(level, g, k);
};

describe('Room Keeper never leaks the answer', () => {
  for (const level of [1, 2]) {
    it(`level ${level}: the live view is on in round 1, shows 1.5 s after a check in round 2, and never in round 3, not even after Fire`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      expect(liveDrawn(level, frame(R))).toBe(true);
      expect(canvas().dataset.live).toBe('1');
      playRound(level, g, 0);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      for (const wrong of [true, false]) {
        set(g[1], wrong);
        expect(liveDrawn(level, frame(R, 0.3))).toBe(false);
      }
      expect(canvas().dataset.live).toBe('0');
      set(g[1], true);
      h.click(CHECK);
      expect(liveDrawn(level, frame(R, 0.3))).toBe(true);
      expect(liveDrawn(level, frame(R, 1.0))).toBe(true);
      expect(liveDrawn(level, frame(R, 0.5))).toBe(false);
      // a miss in round 2 after the flash: no live view, and a text that names no broken rule
      h.click(SEAT);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(liveDrawn(level, frame(R, dt))).toBe(false);
      h.advance(1);
      expect(h.feedback()).toMatch(level === 1 ? /breaks at least one of the three rules/ : /than the plan has/);
      expect(h.feedback()).not.toMatch(/not (reflexive|symmetric|transitive)/);
      playRound(level, g, 1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const wrong of [true, false]) {
        set(g[2], wrong);
        expect(liveDrawn(level, frame(R, 0.3))).toBe(false);
      }
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(liveDrawn(level, frame(R, 0.3))).toBe(false);
      set(g[2], true);
      h.click(SEAT);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(liveDrawn(level, frame(R, dt))).toBe(false);
      expect(canvas().dataset.live).toBe('0');
    });

    it(`level ${level}: a win draws the live view`, () => {
      const R = canvasRecorder();
      h.start(level, 11);
      const g = build(level, 11);
      playRound(level, g, 0);
      set(g[1], false);
      h.click(SEAT);
      let live = false;
      for (let i = 0; i < 8; i++) live = liveDrawn(level, frame(R, 0.2)) || live;
      expect(live).toBe(true);
    });
  }

  it('round 1 of level 1 names the broken rule; two different wrong entries in rounds 2 and 3 give the same text and the −1 float at one point', () => {
    h.start(1, 11);
    h.setSlider(1, 0);
    h.setSlider(1, 1);
    h.click(SEAT);
    h.advance(3);
    expect(h.feedback()).toMatch(/not (reflexive|symmetric|transitive)/);
    for (const round of [1, 2]) {
      const texts2: string[] = [];
      const xs = new Set<number>();
      for (const pick of ['a', 'b'] as const) {
        const R = canvasRecorder();
        h.start(1, 11);
        const g = build(1, 11);
        playTo(1, g, round);
        const r = g[round];
        const d = r.ans[pick];
        h.setSlider(d, 0);
        h.setSlider(d, 1);
        h.click(SEAT);
        R.clear();
        h.advance(2.8);
        texts2.push(h.feedback());
        R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
      }
      expect(texts2[0]).toBe(texts2[1]);
      expect([...xs]).toEqual([400]);
    }
  });

  it('levels 2 and 3: two wrong settings on the same side give the same text, and the −1 float lands at one fixed point', () => {
    for (const level of [2, 3]) {
      for (const round of [0, 1, 2]) {
        const r = build(level, 11)[round];
        const key = level === 2 ? 'm' : 'c';
        const top = level === 2 ? 11 : r.max;
        const lows = Array.from({ length: r.ans[key] - 1 }, (_, i) => i + 1);
        const highs = Array.from({ length: top - r.ans[key] }, (_, i) => r.ans[key] + 1 + i);
        for (const side of [lows, highs]) {
          const out: string[] = [];
          const xs = new Set<number>();
          for (const k of [side[0], side[side.length - 1]]) {
            const R = canvasRecorder();
            h.start(level, 11);
            const g = build(level, 11);
            playTo(level, g, round);
            h.setSlider(k, 0);
            h.click(SEAT);
            R.clear();
            h.advance(2.8);
            out.push(h.feedback().replace(/into \d+ rooms?/, 'into #'));
            R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
          }
          expect(out[0]).toBe(out[1]);
          expect([...xs]).toEqual([400]);
        }
      }
    }
  });

  it('the start never wins in any level, and the count dial of level 3 widens round by round', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        h.start(level, seed);
        h.click(SEAT);
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
    }
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.sliders().map((s) => Number(s.max))).toEqual([24]);
    playRound(3, g, 0);
    expect(h.sliders().map((s) => Number(s.max))).toEqual([60]);
    playRound(3, g, 1);
    expect(h.sliders().map((s) => Number(s.max))).toEqual([210]);
  });

  it('the goal is on the canvas, and the player’s own setting is beside the knob', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    expect(texts(frame(R)).some((s) => /^Write back the missing entry/.test(s))).toBe(true);
    h.setSlider(2, 0);
    h.setSlider(3, 1);
    expect(texts(frame(R)).some((s) => s === 'your entry: row 2, column 3')).toBe(true);
    h.start(2, 5);
    h.setSlider(4);
    expect(texts(frame(R)).some((s) => /^Set m so that the rooms match the plan/.test(s))).toBe(true);
    expect(texts(frame(R)).some((s) => s === 'm = 4')).toBe(true);
    h.start(3, 5);
    h.setSlider(7);
    expect(texts(frame(R)).some((s) => /^Count the seating plans/.test(s))).toBe(true);
    expect(texts(frame(R)).some((s) => s === '7 ways')).toBe(true);
    // the handle is easy to grab: the drag handle of levels 2 and 3 has a radius of at least 18
    h.pointer('pointerdown', 60 + (520 * 6) / 23, 322);
    h.pointer('pointermove', 60 + (520 * 13) / 23, 322);
    expect(Number(h.sliders()[0].value)).toBeGreaterThan(7);
  });
});
