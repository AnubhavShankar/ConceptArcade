// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch07-alternating-current/reactance-lab/index';
import { SLUICE, leverY } from '../src/games/physics/class-12/ch07-alternating-current/reactance-lab/art';
import { DIAL, buildRounds, goal, type Round } from '../src/games/physics/class-12/ch07-alternating-current/reactance-lab/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'reactance-lab', 4);
type L = 1 | 2 | 3 | 4;
const LEVELS: L[] = [1, 2, 3, 4];
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const LIGHT = 'Open the sluice and switch on the lamps';
const METER = 'Meter check: read the lamp meter for this frequency';

const set = (r: Round, right: boolean) => h.setSlider(right ? r.f : r.f + 1);
shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => set(g[k], true),
  setWrong: (g, k) => set(g[k], false),
  commit: () => h.click(LIGHT),
});

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const dialOf = (level: L) => (level === 4 ? DIAL.f4 : DIAL.f);
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const canvas = () => h.$('canvas')!;
const R = () => canvasRecorder();
/** Advance `dt` seconds, then record one frame; the strings drawn in it. */
const frame = (c: ReturnType<typeof canvasRecorder>, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  c.clear();
  h.advance(0.05);
  return c.rec.at.map((a) => a.s);
};
const playTo = (level: L, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    set(g[k], true);
    h.click(LIGHT);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
/** The lamp meter's live text in each level (the goal line starts with a capital, so it never matches). */
const LCD_RE = [/^trail .* A$/, /^beacon .* A$/, / A · beacon /, /^X .* Ω · R /];
const lcdDrawn = (level: L, texts: string[]) => texts.some((s) => LCD_RE[level - 1].test(s));

describe('Lights of the High Pass', () => {
  it('levels 1 to 3 slide 20 to 100 Hz and start at 20; level 4 slides 10 to 60 Hz and starts at 10', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const [s] = h.sliders();
      expect(h.sliders().length).toBe(1);
      expect([Number(s.min), Number(s.max), Number(s.value), Number(s.step)]).toEqual(level === 4 ? [10, 60, 10, 1] : [20, 100, 20, 1]);
      expect(document.querySelector('.control-label')?.textContent).toBe('Turbine');
    }
  });

  it('level 1 at 20 Hz bursts a lamp, level 2 at 20 Hz only glows', () => {
    h.start(1, 5);
    h.click(LIGHT);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/burst/);
    h.start(2, 5);
    h.click(LIGHT);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/only glowed/);
  });

  it('a burst lands at 0.65 s: the heart is still there at 0.5 s and gone at 0.8 s', () => {
    h.start(1, 5);
    h.click(LIGHT);
    h.advance(0.5);
    expect(h.hearts()).toBe(3);
    h.advance(0.3);
    expect(h.hearts()).toBe(2);
  });

  it('a meter check costs a charge: the check reads out, a second press says there are no charges left', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      h.click(METER);
      expect(h.feedback()).toMatch(/Meter check/);
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
    }
  });

  it('a win teaches: the trail is lit, the beacon shines, both lamps lit, a steady beacon', () => {
    const want = [/The trail is lit!/, /The beacon shines!/, /Both lamps lit!/, /A steady beacon!/];
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], true);
      h.click(LIGHT);
      h.advance(2.8);
      expect(h.feedback(), `level ${level}`).toMatch(want[level - 1]);
    }
  });

  it('a miss ends with the direction to turn the turbine', () => {
    for (const level of LEVELS) {
      for (const right of [false]) {
        h.start(level, 5);
        set(build(level, 5)[0], right);
        h.click(LIGHT);
        h.advance(2.8);
        expect(h.feedback(), `level ${level}`).toMatch(/(faster|slower)\./);
      }
    }
  });

  it('the lever’s ring sits on the slot at the player’s setting', () => {
    for (const level of LEVELS) {
      const c = R();
      h.start(level, 5);
      frame(c);
      const { min, max } = dialOf(level);
      expect(c.rec.arcs.some((a) => Math.abs(a.x - SLUICE.x) < 1 && Math.abs(a.y - leverY(min, min, max)) < 1 && a.r >= 20), `level ${level}`).toBe(true);
    }
  });
});

describe('Lights of the High Pass UX', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the goal line is drawn at round start and gone after Fire; the player’s own frequency is read beside the lever`, () => {
      const c = R();
      h.start(level, 5);
      const r = build(level, 5)[0];
      const texts = frame(c);
      expect(texts).toContain(goal(r));
      const { min } = dialOf(level);
      expect(texts.some((s) => new RegExp(`^${min} Hz$`).test(s))).toBe(true);
      set(r, false);
      h.click(LIGHT);
      expect(frame(c, 0.3)).not.toContain(goal(r));
      expect(frame(c, 0.3).some((s) => / Hz$/.test(s))).toBe(false);
    });
  }

  it('the first grip carries a drag cue until it is touched (level 1, round 1 only)', () => {
    const c = R();
    h.start(1, 5);
    expect(frame(c)).toContain('drag');
    const g = playTo(1, 1);
    expect(g.length).toBe(3);
    expect(frame(c, 0.3)).not.toContain('drag');
  });

  it('level 3 draws no L or C on the canvas, and level 4 draws no supply plate', () => {
    const c = R();
    h.start(3, 5);
    const r3 = build(3, 5)[0];
    for (const f of range(20, 100).filter((_, i) => i % 4 === 0)) {
      h.setSlider(f);
      const t = frame(c);
      expect(t.some((s) => /mH|µF/.test(s)), `f ${f}`).toBe(false);
    }
    expect(r3.kind).toBe('both');
    h.start(4, 5);
    expect(frame(c).some((s) => /^\d+ V$/.test(s))).toBe(false);
  });
});

describe('Lights of the High Pass never leaks the answer', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the lamp meter is live in round 1, shows for 1.5 s after a meter check in round 2, and never in round 3`, () => {
      const c = R();
      h.start(level, 5);
      expect(lcdDrawn(level, frame(c))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      const { min, max } = dialOf(level);
      expect(lcdDrawn(level, frame(c, 0.3))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      for (const f of range(min, max).filter((_, i) => i % 6 === 0)) {
        h.setSlider(f);
        expect(lcdDrawn(level, frame(c))).toBe(false);
      }
      h.click(METER);
      expect(lcdDrawn(level, frame(c, 0.3))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      expect(lcdDrawn(level, frame(c, 1.0))).toBe(true);
      expect(lcdDrawn(level, frame(c, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(lcdDrawn(level, frame(c, 0.5))).toBe(false);
      set(g[1], true);
      h.click(LIGHT);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const f of range(min, max).filter((_, i) => i % 4 === 0)) {
        h.setSlider(f);
        expect(lcdDrawn(level, frame(c))).toBe(false);
      }
      set(g[2], true);
      expect(lcdDrawn(level, frame(c))).toBe(false);
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(lcdDrawn(level, frame(c, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
    });
  }

  it('no drawn text contains the answer frequency unless it is the player’s own setting (all rounds, every setting)', () => {
    for (const level of LEVELS) {
      const c = R();
      h.start(level, 5);
      const g = build(level, 5);
      const { min, max } = dialOf(level);
      for (let k = 0; k < 3; k++) {
        const r = g[k];
        for (const f of range(min, max)) {
          if (f === r.f) continue;
          h.setSlider(f);
          expect(frame(c).some((s) => has(s, `${r.f} Hz`)), `level ${level} round ${k + 1} at ${f}`).toBe(false);
        }
        if (k < 2) {
          set(r, true);
          h.click(LIGHT);
          h.advance(2.8);
          h.advance(1);
        }
      }
    }
  });

  it('the sin² + cos² = 1 inset is drawn only after a level 4 win', () => {
    const c = R();
    h.start(4, 5);
    const r = build(4, 5)[0];
    const INSET = 'sin² + cos² = 1';
    expect(frame(c)).not.toContain(INSET);
    set(r, false);
    h.click(LIGHT);
    for (let i = 0; i < 20; i++) expect(frame(c)).not.toContain(INSET);
    h.advance(2);
    expect(h.phase()).toBe('play');
    set(r, true);
    h.click(LIGHT);
    h.advance(0.5);
    expect(frame(c)).not.toContain(INSET);
    h.advance(0.7);
    expect(frame(c)).toContain(INSET);
  });
});
