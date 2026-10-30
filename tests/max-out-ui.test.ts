// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch06-application-of-derivatives/max-out/index';
import { buildRounds, show, type Round } from '../src/games/mathematics/class-12/ch06-application-of-derivatives/max-out/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'max-out', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const FIRE = ['Cut and fold the sheet', 'Build the container', 'Fit the solid inside', 'Lower the winch'];

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => h.setSlider(g[k].best),
  setWrong: (g, k) => h.setSlider(g[k].best + 1),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('Max Out', () => {
  it('the dial range follows each round and starts away from the answer', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].lo, g[0].hi, g[0].start]);
      expect(Number(s.value)).not.toBe(g[0].best);
    }
  });
  it('a miss shows the reading of the build, and the spotter costs one charge in round 2', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(g[0].best + 1);
    h.click(FIRE[0]);
    h.advance(3);
    expect(h.feedback()).toMatch(/tall, narrow box/);
    expect(h.feedback()).not.toMatch(/′|best|\d/);
    h.setSlider(g[0].best);
    h.click(FIRE[0]);
    h.advance(3);
    h.advance(1);
    h.click('Test build: read the result at this setting');
    expect(h.feedback()).toMatch(/Test build at/);
    h.click('Test build: read the result at this setting');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('after a win the working shows the derivative step', () => {
    h.start(3, 5);
    const g = build(3, 5);
    h.setSlider(g[0].best);
    h.click(FIRE[2]);
    h.advance(3);
    expect(h.feedback()).toMatch(/V′ = 0/);
    expect(h.feedback()).toMatch(/V″ < 0/);
  });
  it('level 2 mentions the budget and level 4 the winch line', () => {
    h.start(2, 5);
    const g2 = build(2, 5);
    h.setSlider(g2[0].best + 1);
    h.click(FIRE[1]);
    h.advance(3);
    expect(h.feedback()).toMatch(/metal ran out/);
    h.start(4, 5);
    const g4 = build(4, 5);
    h.setSlider(g4[0].best + 1);
    h.click(FIRE[3]);
    h.advance(3);
    expect(h.feedback()).toMatch(/rope ran out/);
  });
  it('dragging the handle sets the dial', () => {
    h.start(1, 5);
    const g = build(1, 5);
    const r = g[0];
    h.pointer('pointerdown', 60, 322);
    h.pointer('pointermove', 60 + 520 * ((r.best - r.lo) / (r.hi - r.lo)), 322);
    expect(Number(h.sliders()[0].value)).toBe(r.best);
  });
});

// A canvas recorder: every string drawn (with its position), every stroke (colour and dashed or not) and every filled rectangle.
const YELLOW = '#ffd23f';
const TEST = 'Test build: read the result at this setting';
const recorder = () => {
  const rec = { at: [] as { s: string; x: number; y: number }[], strokes: [] as { style: string; dash: boolean }[], rects: [] as { style: string; x: number; y: number; w: number; h: number }[] };
  const store: Record<string, unknown> = {};
  let dash = false;
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'fillText') return (s: string, x: number, y: number) => rec.at.push({ s: String(s), x, y });
      if (p === 'setLineDash') return (a: number[]) => (dash = a.length > 0);
      if (p === 'stroke') return () => rec.strokes.push({ style: String(store.strokeStyle), dash });
      if (p === 'fillRect') return (x: number, y: number, w: number, hh: number) => rec.rects.push({ style: String(store.fillStyle), x, y, w, h: hh });
      return () => undefined;
    },
    set: (_t, p, v) => {
      store[String(p)] = v;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  return { rec, clear: () => ((rec.at.length = 0), (rec.strokes.length = 0), (rec.rects.length = 0)) };
};
type R = ReturnType<typeof recorder>;
const frame = (R: R, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
const texts = (rec: R['rec']) => rec.at.map((a) => a.s);
/** The build bar of levels 2 and 3 sits at (420, 270), 10 high. */
const barRects = (rec: R['rec']) => rec.rects.filter((q) => q.x === 420 && q.y === 270 && q.h === 10);
/** The dashed yellow winch line of level 4. */
const winchLine = (rec: R['rec']) => rec.strokes.some((s) => s.style === YELLOW && s.dash);
const canvas = () => h.$('canvas')!;
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    h.setSlider(g[k].best);
    h.click(FIRE[level - 1]);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
/** A wrong setting, the first one below (or above) the best. */
const wrongAt = (r: Round, side: 'low' | 'high', k = 0) => {
  const xs = Array.from({ length: r.hi - r.lo + 1 }, (_, i) => r.lo + i).filter((x) => (side === 'low' ? x < r.best : x > r.best));
  return side === 'low' ? xs[xs.length - 1 - k] : xs[k];
};

describe('Max Out never leaks the answer', () => {
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level}: the reading is live in round 1, shows for 1.5 s after a test build in round 2, and never in round 3, not even after Fire`, () => {
      const R = recorder();
      h.start(level, 5);
      const g0 = build(level, 5);
      const at = (r: Round, s: number) => show(r, s);
      let rec = frame(R);
      expect(texts(rec)).toContain(at(g0[0], Number(h.sliders()[0].value)));
      expect(canvas().dataset.reading).toBe('1');
      if (level === 4) expect(winchLine(rec)).toBe(true);
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      rec = frame(R, 0.3);
      const none = (rec2: R['rec'], r: Round) => {
        const s = Number(h.sliders()[0].value);
        expect(texts(rec2)).not.toContain(at(r, s));
        expect(texts(rec2)).toContain('reading off');
        expect(winchLine(rec2)).toBe(false);
      };
      none(rec, g[1]);
      expect(canvas().dataset.reading).toBe('0');
      for (const s of [g[1].lo, g[1].best, g[1].hi]) {
        h.setSlider(s);
        none(frame(R), g[1]);
      }
      h.setSlider(wrongAt(g[1], 'low'));
      h.click(TEST);
      rec = frame(R, 0.3);
      expect(texts(rec)).toContain(at(g[1], wrongAt(g[1], 'low')));
      if (level === 4) expect(winchLine(rec)).toBe(true);
      rec = frame(R, 1.0);
      expect(texts(rec)).toContain(at(g[1], wrongAt(g[1], 'low')));
      rec = frame(R, 0.5);
      none(rec, g[1]);
      expect(canvas().dataset.reading).toBe('0');
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      none(frame(R, 0.5), g[1]);
      // a miss in round 2 shows no reading and no winch line while it plays
      const wrong2 = wrongAt(g[1], 'high');
      h.setSlider(wrong2);
      h.click(FIRE[level - 1]);
      for (const dt of [0.3, 0.6, 0.6]) {
        rec = frame(R, dt);
        expect(texts(rec)).not.toContain(at(g[1], wrong2));
        expect(winchLine(rec)).toBe(false);
      }
      h.advance(1.5);
      h.setSlider(g[1].best);
      h.click(FIRE[level - 1]);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      // round 3: never, at any setting; a test build is refused; a miss shows nothing
      for (const s of [g[2].lo, g[2].best, g[2].hi]) {
        h.setSlider(s);
        none(frame(R), g[2]);
      }
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      none(frame(R, 0.5), g[2]);
      const wrong3 = wrongAt(g[2], 'low');
      h.setSlider(wrong3);
      h.click(FIRE[level - 1]);
      for (const dt of [0.3, 0.6, 0.6]) {
        rec = frame(R, dt);
        expect(texts(rec)).not.toContain(at(g[2], wrong3));
        expect(winchLine(rec)).toBe(false);
      }
      expect(canvas().dataset.reading).toBe('0');
    });
  }

  for (const level of [2, 3]) {
    it(`level ${level}: the build bar is drawn only while a build is tested, and a miss fills it to the same fixed amount for every wrong setting`, () => {
      const R = recorder();
      h.start(level, 11);
      const r = build(level, 11)[0];
      for (const s of [r.lo, r.best, r.hi]) {
        h.setSlider(s);
        expect(barRects(frame(R))).toHaveLength(0);
      }
      const widths: number[][] = [];
      for (const [side, k] of [['low', 0], ['low', 2], ['high', 0], ['high', 1]] as const) {
        h.start(level, 11);
        h.setSlider(wrongAt(r, side, k));
        h.click(FIRE[level - 1]);
        const rec = frame(R, 1.4);
        const bars = barRects(rec);
        expect(bars.length).toBe(2);
        widths.push(bars.map((b) => b.w));
        expect(canvas().dataset.bar).toBe(r.goal === 'min' ? '1.45' : '0.55');
      }
      expect(new Set(widths.map((w) => w.join())).size).toBe(1);
      // a win fills it to the tick exactly
      h.start(level, 11);
      h.setSlider(r.best);
      h.click(FIRE[level - 1]);
      const rec = frame(R, 1.4);
      expect(canvas().dataset.bar).toBe('1.00');
      expect(barRects(rec)[1].w).toBeCloseTo(r.goal === 'min' ? 80 : 160, 6);
      // the bar is gone again once the round moves on
      h.advance(2.5);
      h.advance(1);
      expect(barRects(frame(R))).toHaveLength(0);
    });
  }

  it('two wrong settings on the same side give the same miss text, in every level, and the −1 float lands at one fixed point', () => {
    for (const level of [1, 2, 3, 4]) {
      const r = build(level, 11)[0];
      for (const side of ['low', 'high'] as const) {
        const xs: number[] = [];
        const outs: string[] = [];
        for (const k of [0, 1]) {
          const R = recorder();
          h.start(level, 11);
          const s = wrongAt(r, side, k);
          if (s === undefined) continue;
          h.setSlider(s);
          h.click(FIRE[level - 1]);
          R.clear();
          h.advance(2.8);
          outs.push(h.feedback());
          R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.push(a.x));
        }
        if (outs.length === 2) expect(outs[0]).toBe(outs[1]);
        expect(new Set(xs).size).toBeLessThanOrEqual(1);
        if (xs.length) expect(xs[0]).toBe(level === 4 ? 320 : 400);
      }
    }
  });

  it('the start setting never wins, in any level or seed', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        h.start(level, seed);
        h.click(FIRE[level - 1]);
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
    }
  });
});
