// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch10-vector-algebra/break-shot/index';
import { buildRounds, measure, type Round } from '../src/games/mathematics/class-12/ch10-vector-algebra/break-shot/logic';
import { PAL } from '../src/core/arcade';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts, type CanvasRec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'break-shot', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.max ? r.ans - 1 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Take the shot'),
});

describe('Break Shot', () => {
  it('the dial starts away from the answer and the task is in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].min, g[0].max, g[0].start]);
      expect(Number(s.value)).not.toBe(g[0].ans);
      expect(h.note()).toContain('λ');
    }
  });
  it('a miss reports the measured number, never λ; a meter costs a charge; a win shows the working', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(wrong(g[0]));
    h.click('Take the shot');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/dot product of the paths came out (greater|smaller) than the number wanted/);
    expect(h.feedback()).not.toMatch(/\d/);
    h.click('Meter: read the shot for this λ');
    expect(h.feedback()).toMatch(/Energy meter/);
    h.click('Meter: read the shot for this λ');
    expect(h.feedback()).toMatch(/No charges left/);
    h.setSlider(g[0].ans);
    h.click('Take the shot');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/Dot product =/);
  });
});

// No leaks: the preview and its readings fade, a miss shows only a direction, the −1 float lands at one fixed point.
const SHOT = 'Take the shot';
const METER = 'Meter: read the shot for this λ';
const READING = /^(angle|dot|shadow) /;
const frame = (rc: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rc.clear();
  h.advance(0.05);
  return rc.rec;
};
/** The preview: a dashed yellow stroke (the object ball's path is dashed cyan). */
const previewDrawn = (rec: CanvasRec['rec']) => rec.strokes.some((s) => s.dash && s.style === PAL.yellow);
const readingDrawn = (rec: CanvasRec['rec']) => texts(rec).some((s) => READING.test(s));
const playTo = (level: number, round: number, seed: number) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    h.setSlider(g[k].ans);
    h.click(SHOT);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

describe('Break Shot never leaks the answer', () => {
  for (const level of [1, 2, 3]) {
    it(`level ${level}: the preview is live in round 1, shows for 1.5 s after a meter in round 2, and never in round 3`, () => {
      const rc = canvasRecorder();
      h.start(level, 5);
      expect([previewDrawn(frame(rc)), readingDrawn(frame(rc))]).toEqual([true, true]);
      const g = playTo(level, 1, 5);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/shows it for a moment and costs a charge/);
      for (const l of [-12, 3, g[1].ans, 12]) {
        h.setSlider(l);
        const rec = frame(rc);
        expect([previewDrawn(rec), readingDrawn(rec)]).toEqual([false, false]);
      }
      h.click(METER);
      expect(h.$('canvas')?.dataset.helper).toBe('0');
      expect(previewDrawn(frame(rc, 0.3))).toBe(true);
      expect(h.$('canvas')?.dataset.helper).toBe('1');
      expect(previewDrawn(frame(rc, 1.0))).toBe(true);
      expect(previewDrawn(frame(rc, 0.5))).toBe(false);
      expect(readingDrawn(frame(rc, 0.1))).toBe(false);
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(previewDrawn(frame(rc, 0.5))).toBe(false);
      // a miss in round 2 shows no preview during the shot or after
      h.setSlider(g[1].ans === g[1].max ? g[1].ans - 1 : g[1].ans + 1);
      h.click(SHOT);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) {
        const rec = frame(rc, dt);
        expect([previewDrawn(rec), readingDrawn(rec)]).toEqual([false, false]);
      }
      h.advance(1);
      h.setSlider(g[1].ans);
      h.click(SHOT);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const l of [-12, -5, 0, g[2].ans, 12]) {
        h.setSlider(l);
        const rec = frame(rc);
        expect([previewDrawn(rec), readingDrawn(rec)]).toEqual([false, false]);
      }
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(previewDrawn(frame(rc, 0.5))).toBe(false);
      expect(h.$('canvas')?.dataset.helper).toBe('0');
    });
  }

  it('two wrong settings on the same side give the same miss text and the −1 float lands at one fixed point', () => {
    for (const level of [1, 2, 3]) {
      for (const round of [0, 1, 2]) {
        const r = build(level, 11)[round];
        const target = r.kind === 'perp' ? 0 : r.T;
        const lows: number[] = [];
        const highs: number[] = [];
        for (let l = r.min; l <= r.max; l++) if (l !== r.ans) (measure(r, l) > target ? highs : lows).push(l);
        for (const side of [lows, highs]) {
          if (side.length < 2) continue;
          const seen: string[] = [];
          const xs = new Set<number>();
          for (const l of [side[0], side[side.length - 1]]) {
            const rc = canvasRecorder();
            h.start(level, 11);
            playTo(level, round, 11);
            h.setSlider(l);
            h.click(SHOT);
            rc.clear();
            h.advance(2.8);
            seen.push(h.feedback());
            rc.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
          }
          expect(seen[0]).toBe(seen[1]);
          expect(seen[0]).not.toMatch(/\d/);
          expect([...xs]).toEqual([370]);
        }
      }
    }
  });

  it('the start (λ = 0) never wins in any round', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 7);
      expect(h.sliders()[0].value).toBe('0');
      h.click(SHOT);
      h.advance(2.8);
      expect(h.hearts()).toBe(2);
    }
  });
});
