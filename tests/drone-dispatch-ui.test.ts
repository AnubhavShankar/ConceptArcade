// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch10-vector-algebra/drone-dispatch/index';
import { RANGE, buildRounds, type Round } from '../src/games/mathematics/class-12/ch10-vector-algebra/drone-dispatch/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, type Rec } from './helpers/canvas-rec';
import { HANDLE_R } from '../src/games/mathematics/class-12/ch10-vector-algebra/drone-dispatch/index';
import { GRIP_MIN } from '../src/games/mathematics/class-12/ch10-vector-algebra/drone-dispatch/ux';

const h = arcadeHarness(game, 'drone-dispatch', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));

function set(r: Round, wrong: boolean) {
  h.setSlider(r.ans[0] + (wrong ? (r.ans[0] === RANGE ? -1 : 1) : 0), 0);
  h.setSlider(r.ans[1], 1);
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Dispatch the drone'),
});

describe('Drone Dispatch', () => {
  it('both coordinates start at 0 and the task is in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      expect(h.sliders().map((s) => Number(s.value))).toEqual([0, 0]);
      expect(h.note().length).toBeGreaterThan(30);
    }
  });
  it('tapping the plane sets both coordinates, and a drag of the tip does too', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 470 + 3 * 10, 185 - 4 * 10);
    expect(h.sliders().map((s) => Number(s.value))).toEqual([3, 4]);
    h.pointer('pointermove', 470 - 5 * 10, 185 + 2 * 10);
    h.pointer('pointerup', 470 - 5 * 10, 185 + 2 * 10);
    expect(h.sliders().map((s) => Number(s.value))).toEqual([-5, -2]);
  });
  it('a miss says where the drone ended up without the vector; a test flight costs a charge', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0], true);
    h.click('Dispatch the drone');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/landed .* the pad/);
    h.click('Test flight: see where this vector leads');
    expect(h.feedback()).toMatch(/Test flight/);
    h.click('Test flight: see where this vector leads');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 3 names the formula in the working', () => {
    h.start(3, 5);
    const g = build(3, 5);
    set(g[0], false);
    h.click('Dispatch the drone');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/Internal division/);
  });
  it('level 4 starts at (0, 0) and the note names the legs, the wind and the target', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(h.sliders().map((s) => Number(s.value))).toEqual([0, 0]);
    expect(h.note()).toContain('two legs');
    expect(g.map((r) => r.kind)).toEqual(['legs', 'wind', 'wind2']);
  });
  it('level 4 working names the law in each round, and the plane keeps its range', () => {
    h.start(4, 5);
    const g = build(4, 5);
    const want = [/Triangle law/, /Ground track = own vector \+ wind/, /half the trip/];
    for (let k = 0; k < 3; k++) {
      expect(Math.abs(g[k].ans[0])).toBeLessThanOrEqual(RANGE);
      set(g[k], false);
      h.click('Dispatch the drone');
      h.advance(2.8);
      expect(h.feedback()).toMatch(want[k]);
      h.advance(1);
    }
    expect(h.phase()).toBe('won');
  });
  it('level 4 miss says only a compass direction, with no number; a test flight is paid and may show numbers', () => {
    h.start(4, 5);
    const g = build(4, 5);
    h.advance(0.1);
    set(g[0], true);
    h.click('Dispatch the drone');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/^Dash came down on a rooftop [a-z-]+ of the target\. Aim more [a-z-]+\.$/);
    expect(h.feedback()).not.toMatch(/\d/);
    h.click('Test flight: see where this vector leads');
    expect(h.feedback()).toMatch(/Test flight .* Dash would land .* the target/);
    h.click('Test flight: see where this vector leads');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 4 boss round has no test flight, and a miss in a wind round is a compass word with no number', () => {
    h.start(4, 5);
    const g = build(4, 5);
    set(g[0], false);
    h.click('Dispatch the drone');
    h.advance(3.8);
    set(g[1], true);
    h.click('Dispatch the drone');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/^Dash came down on a rooftop [a-z-]+ of the target\. Aim more [a-z-]+\.$/);
    expect(h.feedback()).not.toMatch(/\d/);
    set(g[1], false);
    h.click('Dispatch the drone');
    h.advance(3.8);
    expect(h.hud()).toMatch(/BOSS/);
    h.click('Test flight: see where this vector leads');
    expect(h.feedback()).toMatch(/No charges left/);
  });
});

describe('Drone Dispatch UX pass', () => {
  const TEST = 'Test flight: see where this vector leads';
  type R = ReturnType<typeof canvasRecorder>;
  const frame = (R: R, dt: number) => {
    if (dt > 0.05) h.advance(dt - 0.05);
    R.clear();
    h.advance(0.05);
    return R.rec;
  };
  /** Whether this level's helper (guide line, size, live ratio or ghost arrow) is on the canvas this frame. */
  const helperDrawn = (level: number, rec: Rec) =>
    level === 1 ? rec.strokes.some((s) => s.dash && s.style === '#8f9bd6' && s.n === 1)
    : level === 2 ? rec.at.some((a) => /^size /.test(a.s))
    : level === 3 ? rec.at.some((a) => /^(PR : RQ = |not on the line PQ|at [PQ]$)/.test(a.s))
    : rec.strokes.some((s) => s.dash && s.style === '#ffd23f');
  const playTo = (level: number, seed: number, k: number) => {
    h.start(level, seed);
    const g = build(level, seed);
    for (let i = 0; i < k; i++) {
      set(g[i], false);
      h.click('Dispatch the drone');
      h.advance(2.8);
      h.advance(1);
    }
    return g;
  };
  it('the handle is at least 18 px in radius', () => {
    expect(HANDLE_R).toBeGreaterThanOrEqual(18);
    expect(GRIP_MIN).toBeGreaterThanOrEqual(18);
  });
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level}: the goal line is drawn at round start and fades; the grip is at least 18 px; the player's own vector is beside it`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const rec = frame(R, 0.05);
      const goals = rec.at.filter((a) => /^Goal: /.test(a.s));
      expect(goals.length).toBe(1);
      expect(goals[0].y).toBeGreaterThanOrEqual(12);
      expect(rec.arcs.some((a) => a.x === 470 && a.y === 185 && a.r >= 18)).toBe(true);
      expect(rec.at.some((a) => /^(vector|thrust|R) \(0, 0\)/.test(a.s))).toBe(true);
      expect(frame(R, 4).at.some((a) => /^Goal: /.test(a.s))).toBe(false);
    });
    it(`level ${level}: the helper is live in round 1, shows 1.5 s after a test flight in round 2, never in round 3; the own vector is always shown`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      expect(helperDrawn(level, frame(R, 0.1))).toBe(true);
      expect(h.$('canvas')!.dataset.helper).toBe('1');
      const g = playTo(level, 5, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/for a moment after a test flight/);
      set(g[1], true);
      let rec = frame(R, 0.3);
      expect(helperDrawn(level, rec)).toBe(false);
      expect(rec.at.some((a) => /^(vector|thrust|R) \(/.test(a.s))).toBe(true);
      expect(h.$('canvas')!.dataset.helper).toBe('0');
      h.click(TEST);
      expect(helperDrawn(level, frame(R, 0.3))).toBe(true);
      expect(helperDrawn(level, frame(R, 0.8))).toBe(true);
      expect(helperDrawn(level, frame(R, 0.8))).toBe(false);
      expect(h.$('canvas')!.dataset.helper).toBe('0');
      // a miss does not bring it back
      h.click('Dispatch the drone');
      h.advance(3.6);
      expect(helperDrawn(level, frame(R, 0.3))).toBe(false);
      const g2 = playTo(level, 5, 2);
      expect(h.hud()).toMatch(/BOSS/);
      set(g2[2], true);
      rec = frame(R, 0.3);
      expect(helperDrawn(level, rec)).toBe(false);
      expect(rec.at.some((a) => /^(vector|thrust|R) \(/.test(a.s))).toBe(true);
      expect(h.$('canvas')!.dataset.helper).toBe('0');
    });
  }
  it('level 1, round 1: the grip pulses with a "drag" cue until the first touch, and round 2 has none', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    expect(frame(R, 0.1).at.some((a) => / · drag$/.test(a.s))).toBe(true);
    h.pointer('pointerdown', 470 + 3 * 10, 185 - 4 * 10);
    h.pointer('pointerup', 470 + 3 * 10, 185 - 4 * 10);
    expect(frame(R, 0.1).at.some((a) => / · drag$/.test(a.s))).toBe(false);
    playTo(1, 5, 1);
    expect(frame(R, 0.1).at.some((a) => / · drag$/.test(a.s))).toBe(false);
  });
  it('a miss on level 2 says in words which way to change the thrust', () => {
    h.start(2, 5);
    const r = build(2, 5)[0];
    h.setSlider(r.ans[0] * 2, 0);
    h.setSlider(r.ans[1] * 2 > RANGE || r.ans[1] * 2 < -RANGE ? r.ans[1] : r.ans[1] * 2, 1);
    h.click('Dispatch the drone');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/Tap closer in along it\.|Turn the arrow towards that direction\./);
  });
});
