// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch06-application-of-derivatives/catch-rate/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch06-application-of-derivatives/catch-rate/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, type Rec } from './helpers/canvas-rec';
import { GRIP_MIN } from '../src/games/mathematics/class-12/ch06-application-of-derivatives/catch-rate/ux';

const h = arcadeHarness(game, 'catch-rate', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === 12 ? 11 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: (level) => h.click(level === 4 ? 'Start the run' : 'Run the winch'),
});

describe('Catch Rate UX', () => {
  const TEST = (level: number) => (level === 4 ? 'Test run: read the money rate at this setting' : 'Test run: read the result rate at this winch speed');
  const FIRE = (level: number) => (level === 4 ? 'Start the run' : 'Run the winch');
  const canvas = () => h.$('canvas')!;
  const frame = (R: ReturnType<typeof canvasRecorder>, dt: number) => {
    if (dt > 0.05) h.advance(dt - 0.05);
    R.clear();
    h.advance(0.05);
    return R.rec;
  };
  const gauge = (rec: Rec) => rec.at.some((a) => a.s === 'you');
  const playTo = (level: number, seed: number, k: number) => {
    h.start(level, seed);
    const g = build(level, seed);
    for (let i = 0; i < k; i++) {
      h.setSlider(g[i].ans);
      h.click(FIRE(level));
      h.advance(3.4);
      h.advance(1);
    }
    return g;
  };
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level}: the goal line is drawn at round start and fades; the handle is at least ${GRIP_MIN} px with its setting and unit beside it`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const rec = frame(R, 0.05);
      const goal = rec.at.filter((a) => /^Goal: /.test(a.s));
      expect(goal.length).toBe(1);
      expect(goal[0].y).toBeGreaterThanOrEqual(12);
      expect(GRIP_MIN).toBeGreaterThanOrEqual(18);
      expect(rec.arcs.some((a) => a.y === 322 && a.r >= 18)).toBe(true);
      expect(rec.at.some((a) => /^w = 1 \S+ per (s|hour|day)/.test(a.s))).toBe(true);
      expect(frame(R, 4).at.some((a) => /^Goal: /.test(a.s))).toBe(false);
    });
    it(`level ${level}: the gauge is live in round 1, shows 1.5 s after a test run in round 2, never in round 3`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      expect(gauge(frame(R, 0.1))).toBe(true);
      expect(canvas().dataset.helper).toBe('1');
      const g = playTo(level, 5, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/lights for a moment after a test run/);
      expect(gauge(frame(R, 0.3))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      h.setSlider(g[1].ans);
      expect(gauge(frame(R, 0.3))).toBe(false);
      h.click(TEST(level));
      expect(gauge(frame(R, 0.3))).toBe(true);
      expect(gauge(frame(R, 0.8))).toBe(true);
      expect(gauge(frame(R, 0.8))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      const g2 = playTo(level, 5, 2);
      expect(h.hud()).toMatch(/BOSS/);
      h.setSlider(g2[2].ans);
      expect(gauge(frame(R, 0.3))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
    });
  }
  it('a miss says which way to change the rate, never the right setting', () => {
    for (const level of [2, 4]) {
      h.start(level, 5);
      const g = build(level, 5);
      h.setSlider(wrong(g[0]));
      h.click(FIRE(level));
      h.advance(3.4);
      expect(h.feedback()).toMatch(/(Turn the winch (faster|slower)|Try a (higher|lower) rate)\.$/);
      expect(h.feedback()).not.toMatch(/\d/);
    }
  });
});

describe('Catch Rate', () => {
  it('a miss reports the result rate, a test run costs a charge, a win shows the derivative', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.note()).toMatch(/ladder/);
    h.setSlider(wrong(g[0]));
    h.click('Run the winch');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/too (slowly|fast)/);
    expect(h.feedback()).not.toMatch(/w = /);
    h.setSlider(g[0].ans);
    h.click('Run the winch');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/x² \+ y² =/);
    h.advance(1);
    h.click('Test run: read the result rate at this winch speed');
    expect(h.feedback()).toMatch(/Test run at w =/);
    h.click('Test run: read the result rate at this winch speed');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('dragging the handle sets the speed', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 60, 322);
    h.pointer('pointermove', 60 + (520 * 6) / 11, 322);
    expect(Number(h.sliders()[0].value)).toBe(7);
  });
  it('level 4: the round shows the function and the rate, the start setting misses, a miss gives a money rate and a side, a win shows the marginal working', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(h.note()).toContain(g[0].fnText!);
    expect(h.note()).toMatch(/per hour/);
    expect(h.sliders()[0].getAttribute('aria-label')).toBe('Rate w');
    expect(Number(h.sliders()[0].value)).toBe(1);
    h.click('Start the run');
    h.advance(3.4);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/^The rate was set, and the money flowed too slowly: the meter fell short/);
    expect(h.feedback()).not.toMatch(/w = |should|correct/);
    h.setSlider(g[0].ans);
    h.click('Start the run');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/^Funded on time! Marginal cost C′\(x\) = .* at x = \d+\./);
    expect(h.hearts()).toBe(2);
    h.advance(1);
    h.click('Test run: read the money rate at this setting');
    expect(h.feedback()).toMatch(/Test run at w = 1: the result changes at ₹\d+ per hour\./);
  });
  it('level 4: too fast is a different miss from too slow, and the profit round counts per day', () => {
    h.start(4, 11);
    const g = build(4, 11);
    for (let k = 0; k < 2; k++) {
      h.setSlider(g[k].ans);
      h.click('Start the run');
      h.advance(3.4);
      h.advance(1);
    }
    expect(h.note()).toMatch(/per day/);
    expect(g[2].ans).toBeLessThan(12);
    h.setSlider(12);
    h.click('Start the run');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/money flowed too fast: the meter overflowed/);
    expect(h.feedback()).not.toMatch(/w = /);
  });
  it('level 4: dragging the handle sets the rate', () => {
    h.start(4, 5);
    h.pointer('pointerdown', 60, 322);
    h.pointer('pointermove', 60 + (520 * 6) / 11, 322);
    expect(Number(h.sliders()[0].value)).toBe(7);
  });
});
