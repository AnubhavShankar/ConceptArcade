// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/gear-train/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/gear-train/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, type Rec } from './helpers/canvas-rec';
import { GRIP_MIN } from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/gear-train/ux';

const h = arcadeHarness(game, 'gear-train', 5);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === 12 ? 11 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Start the machine'),
});

describe('Gear Train UX', () => {
  const TEST = 'Test run: read the output at this crank speed';
  const canvas = () => h.$('canvas')!;
  const frame = (R: ReturnType<typeof canvasRecorder>, dt: number) => {
    if (dt > 0.05) h.advance(dt - 0.05);
    R.clear();
    h.advance(0.05);
    return R.rec;
  };
  const ghostDrawn = (rec: Rec) => rec.strokes.some((s) => s.dash && s.style === '#ffd23f');
  const readingDrawn = (rec: Rec) => rec.at.some((a) => /^output \d/.test(a.s));
  const playTo = (level: number, seed: number, k: number) => {
    h.start(level, seed);
    const g = build(level, seed);
    for (let i = 0; i < k; i++) {
      h.setSlider(g[i].ans);
      h.click('Start the machine');
      h.advance(2.8);
      h.advance(1);
    }
    return g;
  };
  for (const level of [1, 2, 3, 4, 5]) {
    it(`level ${level}: the goal line is drawn at round start and fades; the handle is at least ${GRIP_MIN} px with its setting beside it`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const rec = frame(R, 0.05);
      const goal = rec.at.filter((a) => /^Goal: /.test(a.s));
      expect(goal.length).toBe(1);
      expect(goal[0].y).toBeGreaterThanOrEqual(12);
      expect(GRIP_MIN).toBeGreaterThanOrEqual(18);
      expect(rec.arcs.some((a) => a.y === 322 && a.r >= 18)).toBe(true);
      expect(rec.at.some((a) => /^crank w = 1 per s/.test(a.s))).toBe(true);
      expect(frame(R, 4).at.some((a) => /^Goal: /.test(a.s))).toBe(false);
    });
    it(`level ${level}: the ghost ring and the reading are live in round 1, show 1.5 s after a test run in round 2, never in round 3`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      let rec = frame(R, 0.1);
      expect(ghostDrawn(rec) && readingDrawn(rec)).toBe(true);
      expect(canvas().dataset.helper).toBe('1');
      const g = playTo(level, 5, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/for a moment after a test run/);
      rec = frame(R, 0.3);
      expect(ghostDrawn(rec) || readingDrawn(rec)).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      h.setSlider(g[1].ans);
      rec = frame(R, 0.3);
      expect(ghostDrawn(rec) || readingDrawn(rec)).toBe(false);
      h.click(TEST);
      rec = frame(R, 0.3);
      expect(ghostDrawn(rec) && readingDrawn(rec)).toBe(true);
      rec = frame(R, 0.8);
      expect(ghostDrawn(rec) && readingDrawn(rec)).toBe(true);
      rec = frame(R, 0.8);
      expect(ghostDrawn(rec) || readingDrawn(rec)).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      const g2 = playTo(level, 5, 2);
      expect(h.hud()).toMatch(/BOSS/);
      h.setSlider(g2[2].ans);
      rec = frame(R, 0.3);
      expect(ghostDrawn(rec) || readingDrawn(rec)).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
    });
  }
  it('a miss says which way to turn the crank, never the right speed', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(g[0].ans === 12 ? 11 : g[0].ans + 1);
    h.click('Start the machine');
    h.advance(3);
    expect(h.feedback()).toMatch(/Turn the crank (faster|slower)\.$/);
    expect(h.feedback()).not.toMatch(/\d/);
  });
});

describe('Gear Train', () => {
  it('a miss reports the output rate without the right speed, a test run costs a charge, a win shows the working', () => {
    h.start(1, 5);
    const g = build(1, 5);
    expect(h.note()).toMatch(/Target output/);
    h.setSlider(wrong(g[0]));
    h.click('Start the machine');
    h.advance(3);
    expect(h.feedback()).toMatch(/output gear turned/);
    expect(h.feedback()).not.toMatch(/w = /);
    h.setSlider(g[0].ans);
    h.click('Start the machine');
    h.advance(3);
    expect(h.feedback()).toMatch(/Chain rule/);
    h.advance(1);
    h.click('Test run: read the output at this crank speed');
    expect(h.feedback()).toMatch(/Test run at w =/);
    h.click('Test run: read the output at this crank speed');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 4 asks for acceleration and the speed counts squared', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(h.note()).toMatch(/accelerates/);
    h.setSlider(g[0].ans);
    h.click('Start the machine');
    h.advance(3);
    expect(h.feedback()).toMatch(/w²/);
  });
  it('level 5 shows a trigonometric machine at a special angle, the start setting misses, and a win shows the chain rule working', () => {
    h.start(5, 5);
    const g = build(5, 5);
    expect(h.note()).toMatch(/y = .* at x = .*π/);
    expect(h.note()).toContain(g[0].machine);
    expect(h.note()).toMatch(/Target output/);
    expect(Number(h.sliders()[0].value)).toBe(1);
    h.click('Start the machine');
    h.advance(3);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/output gear turned too slowly/);
    expect(h.feedback()).not.toMatch(/w = |dy\/dx/);
    h.setSlider(g[0].ans);
    h.click('Start the machine');
    h.advance(3);
    expect(h.feedback()).toMatch(/^Dispatched! Chain rule: dy\/dx = .* at x = .*π.*Output rate = .* × w;/);
    expect(h.hearts()).toBe(2);
  });
  it('dragging the handle sets the crank speed', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 60, 322);
    h.pointer('pointermove', 60 + (520 * 5) / 11, 322);
    expect(Number(h.sliders()[0].value)).toBe(6);
  });
});
