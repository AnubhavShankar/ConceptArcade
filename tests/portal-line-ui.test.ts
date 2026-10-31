// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch01-relations-and-functions/portal-line/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch01-relations-and-functions/portal-line/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, type Rec } from './helpers/canvas-rec';
import { HANDLE_R } from '../src/games/mathematics/class-12/ch01-relations-and-functions/portal-line/index';
import { GRIP_MIN } from '../src/games/mathematics/class-12/ch01-relations-and-functions/portal-line/ux';

const h = arcadeHarness(game, 'portal-line', 5);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const FIRE = ['Send the travellers through', 'Send the travellers through', 'Hand the ledger to the Mayor', 'Send the travellers there and back', 'Send the travellers there and back'];
const TEST_TRIP = 'Test walk: send one test traveller';

function set(r: Round, wrong: boolean) {
  if (r.kind === 'count') h.setSlider(wrong ? r.ans.c + 1 : r.ans.c, 0);
  else if (r.lin) {
    h.setSlider(wrong ? r.ans.p + 1 : r.ans.p, 0);
    h.setSlider(r.ans.q, 1);
  } else {
    h.setSlider(wrong ? r.ans.lo + 1 : r.ans.lo, 0);
    h.setSlider(r.ans.hi, 1);
  }
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('Portal Line', () => {
  it('level 1: a fence past the turning point makes a collision; a fence that leaves Pip out says so', () => {
    h.start(1, 5);
    const g = build(1, 5);
    const r = g[0];
    h.setSlider(-5, 0);
    h.setSlider(5, 1);
    h.click(FIRE[0]);
    h.advance(3);
    expect(h.feedback()).toMatch(/landed on the same door/);
    expect(h.feedback()).not.toMatch(/\[/);
    const left = r.pip > 0 ? -5 : 1;
    h.setSlider(left, 0);
    h.setSlider(left, 1);
    h.click(FIRE[0]);
    h.advance(3);
    expect(h.feedback()).toMatch(/Pip was left outside|kept one back/);
  });
  it('level 2: fences too wide leave a dark door, too narrow let a traveller land outside', () => {
    h.start(2, 5);
    const r = build(2, 5)[0];
    h.setSlider(r.ans.lo - 2, 0);
    h.setSlider(r.ans.hi, 1);
    h.click(FIRE[1]);
    h.advance(3);
    expect(h.feedback()).toMatch(/stayed dark/);
    h.setSlider(r.ans.lo + 1, 0);
    h.click(FIRE[1]);
    h.advance(3);
    expect(h.feedback()).toMatch(/outside your fences/);
  });
  it('level 3 counts factorials and a test walk costs a charge', () => {
    h.start(3, 5);
    h.setSlider(6);
    h.click(FIRE[2]);
    h.advance(3);
    expect(h.feedback()).toMatch(/3 × 2 × 1 = 6/);
    h.advance(1);
    h.click('Test walk: send two test travellers');
    expect(h.feedback()).toMatch(/Test walkers/);
    h.click('Test walk: send two test travellers');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 4: the sliders start at p = 0, q = 1; a wrong portal costs a heart and the miss text has the side only, no number', () => {
    h.start(4, 5);
    expect(h.sliders().map((s) => s.value)).toEqual(['0', '1']);
    expect(h.note()).toMatch(/Ghost travellers/);
    const r = build(4, 5)[0];
    h.setSlider(r.ans.p, 0);
    h.setSlider(r.ans.q + 1, 1);
    h.click(FIRE[3]);
    h.advance(3);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/to the (left|right) of home/);
    expect(h.feedback()).not.toMatch(/\d/);
  });
  it('level 4: q = 0 is free, for the send button and the test walk, and nothing is spent', () => {
    h.start(4, 5);
    h.setSlider(3, 0);
    h.setSlider(0, 1);
    h.click(FIRE[3]);
    h.advance(0.2);
    expect(h.phase()).toBe('play');
    expect(h.hearts()).toBe(3);
    expect(h.feedback()).toMatch(/cannot divide by zero/);
    expect(h.feedback()).toMatch(/does not cost you anything/);
    h.click(TEST_TRIP);
    expect(h.feedback()).toMatch(/cannot divide by zero/);
    h.setSlider(2, 1);
    h.click(TEST_TRIP);
    expect(h.feedback()).toMatch(/Test walker: traveller 1 went through portal f/);
    h.click(TEST_TRIP);
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('levels 4 and 5: dragging the q and p handles on the side-by-side tracks moves the dials', () => {
    for (const level of [4, 5]) {
      h.start(level, 5);
      // q runs from 84 to 290 for -5..5 (starts at 1); p runs from 368 to 574 for -9..9 (starts at 0)
      const qx = (q: number) => 84 + ((q + 5) / 10) * 206;
      const px = (p: number) => 368 + ((p + 9) / 18) * 206;
      h.pointer('pointerdown', qx(1), 308);
      h.pointer('pointermove', qx(3), 308);
      h.pointer('pointerup', qx(3), 308);
      expect(h.sliders().map((s) => s.value)).toEqual(['0', '3']);
      h.pointer('pointerdown', px(0), 308);
      h.pointer('pointermove', px(4), 308);
      h.pointer('pointerup', px(4), 308);
      expect(h.sliders().map((s) => s.value)).toEqual(['4', '3']);
    }
  });
  it('level 5: composing in the wrong order (f after g) loses, and the right portal wins with both orders in the working', () => {
    h.start(5, 5);
    const r = build(5, 5)[0];
    const l = r.lin!;
    h.setSlider(l.a * l.d + l.b, 0);
    h.setSlider(r.ans.q, 1);
    h.click(FIRE[4]);
    h.advance(3);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/of home/);
    h.setSlider(r.ans.p, 0);
    h.click(FIRE[4]);
    h.advance(3);
    expect(h.phase()).toBe('between');
    expect(h.feedback()).toMatch(/Everyone home! g\(f\(x\)\) = g\(/);
    expect(h.feedback()).toMatch(/order of composition matters/);
  });
});

describe('Portal Line UX pass', () => {
  const TEST = (level: number) => (level >= 4 ? TEST_TRIP : 'Test walk: send two test travellers');
  type R = ReturnType<typeof canvasRecorder>;
  const frame = (R: R, dt: number) => {
    if (dt > 0.05) h.advance(dt - 0.05);
    R.clear();
    h.advance(0.05);
    return R.rec;
  };
  /** Whether this level's helper (the graph, the lit doors or the ghosts) was drawn this frame. */
  const helperDrawn = (level: number, rec: Rec) =>
    level === 1 ? rec.strokes.some((s) => s.style === '#4de1ff' && s.n >= 90) : level === 2 ? rec.at.some((a) => a.s === 'doors in use') : rec.at.some((a) => /^ghosts: /.test(a.s));
  const playTo = (level: number, seed: number, k: number) => {
    h.start(level, seed);
    const g = build(level, seed);
    for (let i = 0; i < k; i++) {
      set(g[i], false);
      h.click(FIRE[level - 1]);
      h.advance(2.8);
      h.advance(1);
    }
    return g;
  };
  it('every handle is at least 18 px in radius', () => {
    expect(HANDLE_R).toBeGreaterThanOrEqual(18);
    expect(GRIP_MIN).toBeGreaterThanOrEqual(18);
  });
  for (const level of [1, 2, 3, 4, 5]) {
    it(`level ${level}: the goal line is drawn at round start and fades; the handles are drawn at least 18 px with the player's own setting beside them`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const rec = frame(R, 0.05);
      const goals = rec.at.filter((a) => /^Goal: /.test(a.s));
      expect(goals.length).toBe(1);
      expect(goals[0].y).toBeGreaterThanOrEqual(12);
      if (level <= 2) expect(rec.arcs.filter((a) => a.y === 272 && a.r >= 18).length).toBeGreaterThanOrEqual(2);
      if (level === 3) expect(rec.arcs.some((a) => a.y === 322 && a.r >= 18)).toBe(true);
      if (level >= 4) expect(rec.arcs.filter((a) => a.y === 308 && a.r >= 18).length).toBeGreaterThanOrEqual(2);
      const own = level === 1 ? /^left −?\d+/ : level === 2 ? /^low −?\d+/ : level === 3 ? /^\d+ ways/ : /^q = −?\d+/;
      expect(rec.at.some((a) => own.test(a.s))).toBe(true);
      expect(frame(R, 4).at.some((a) => /^Goal: /.test(a.s))).toBe(false);
    });
  }
  for (const level of [1, 2, 4, 5]) {
    it(`level ${level}: the helper is live in round 1, shows 1.5 s after a test walk in round 2, never in round 3`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      expect(helperDrawn(level, frame(R, 0.1))).toBe(true);
      expect(h.$('canvas')!.dataset.helper).toBe('1');
      const g = playTo(level, 5, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/for a moment after a test walk/);
      expect(helperDrawn(level, frame(R, 0.3))).toBe(false);
      expect(h.$('canvas')!.dataset.helper).toBe('0');
      set(g[1], true);
      expect(helperDrawn(level, frame(R, 0.3))).toBe(false);
      h.click(TEST(level));
      expect(helperDrawn(level, frame(R, 0.3))).toBe(true);
      expect(helperDrawn(level, frame(R, 0.8))).toBe(true);
      expect(helperDrawn(level, frame(R, 0.8))).toBe(false);
      expect(h.$('canvas')!.dataset.helper).toBe('0');
      // a miss does not bring the helper back
      h.click(FIRE[level - 1]);
      h.advance(3.6);
      expect(helperDrawn(level, frame(R, 0.3))).toBe(false);
      const g2 = playTo(level, 5, 2);
      expect(h.hud()).toMatch(/BOSS/);
      set(g2[2], true);
      expect(helperDrawn(level, frame(R, 0.3))).toBe(false);
      expect(h.$('canvas')!.dataset.helper).toBe('0');
    });
  }
  it('level 1, round 1: the handles pulse with a "drag" cue until the first touch, and round 2 has none', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    expect(frame(R, 0.1).at.some((a) => / · drag$/.test(a.s))).toBe(true);
    h.pointer('pointerdown', 320, 272);
    h.pointer('pointerup', 320, 272);
    expect(frame(R, 0.1).at.some((a) => / · drag$/.test(a.s))).toBe(false);
    playTo(1, 5, 1);
    expect(frame(R, 0.1).at.some((a) => / · drag$/.test(a.s))).toBe(false);
  });
  it('the fence words stand beside the flags, so no word sits on the axis numbers', () => {
    const R = canvasRecorder();
    for (const level of [1, 2]) {
      h.start(level, 5);
      const rec = frame(R, 0.1);
      const word = rec.at.filter((a) => a.s === (level === 1 ? 'left' : 'low') || a.s === (level === 1 ? 'right' : 'high'));
      expect(word.length).toBe(2);
      expect(word.every((a) => a.y < 232)).toBe(true);
    }
  });
});
