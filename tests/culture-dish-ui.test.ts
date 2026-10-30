// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch09-differential-equations/culture-dish/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch09-differential-equations/culture-dish/logic';
import { PAL } from '../src/core/arcade';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, type CanvasRec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'culture-dish', 3);
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.max ? r.ans - 1 : r.ans + 1);

/** Set the right or a wrong setting for round k of level 1 (two dials) or levels 2 and 3 (one dial). */
function set(g: Round[], k: number, bad: boolean) {
  const r = g[k];
  if (r.kind === 'scan') {
    h.setSlider(r.order, 0);
    h.setSlider(bad ? (r.degree === 4 ? 3 : r.degree + 1) : r.degree, 1);
  } else h.setSlider(bad ? wrong(r) : r.ans);
}
const commitLabel = (level: number) => (level === 1 ? 'Scan the specimen' : level === 2 ? 'Switch on the lamp' : 'Start the dish');

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g, k, false),
  setWrong: (g, k) => set(g, k, true),
  commit: (level) => h.click(commitLabel(level)),
});

describe('Culture Dish', () => {
  it('level 1 starts the scanner at order 4 and degree 4, and the equation is in the note', () => {
    h.start(1, 5);
    expect(h.sliders().map((s) => Number(s.value))).toEqual([4, 4]);
    expect(h.note()).toContain(build(1, 5)[0].text);
  });
  it('level 1: a miss says what is wrong without the numbers; the magnifier costs a charge', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g, 0, true);
    h.click('Scan the specimen');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/flagged/);
    h.click('Magnifier: show the highest derivative');
    expect(h.feedback()).toMatch(/highest derivative/);
    h.click('Magnifier: show the highest derivative');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 1: a specimen that lands unscanned costs a heart', () => {
    h.start(1, 5);
    h.advance(19);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/hit the floor/);
  });
  it('levels 2 and 3: the tests read effects, and the dial starts away from the answer', () => {
    for (const level of [2, 3]) {
      h.start(level, 5);
      const g = build(level, 5);
      expect(Number(h.sliders()[0].value)).not.toBe(g[0].ans);
      h.click(level === 2 ? 'Incubator test: read the colony for this lamp setting' : 'Swing test: count the swings for this frequency');
      expect(h.feedback()).toMatch(/test/i);
    }
  });
});

// No leaks: the growth line and swing curve are the helper; a miss plays a fixed effect and a direction-only text.
const FIRE = ['', 'Scan the specimen', 'Switch on the lamp', 'Start the dish'];
const TEST = ['', 'Magnifier: show the highest derivative', 'Incubator test: read the colony for this lamp setting', 'Swing test: count the swings for this frequency'];
const frame = (rc: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rc.clear();
  h.advance(0.05);
  return rc.rec;
};
/** The helper line or curve: a yellow stroke with at least one segment (the handle ring is a yellow arc with none). */
const helperDrawn = (rec: CanvasRec['rec']) => rec.strokes.some((s) => s.style === PAL.yellow && s.n >= 1);
const helperFlag = () => h.$('canvas')?.dataset.helper;
const playTo = (level: number, round: number, seed: number) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    set(g, k, false);
    h.click(FIRE[level]);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

describe('Culture Dish never leaks the answer', () => {
  for (const level of [2, 3]) {
    it(`level ${level}: the curve is live in round 1, shows for 1.5 s after a test in round 2, and never in round 3, not even after a miss`, () => {
      const rc = canvasRecorder();
      h.start(level, 5);
      expect([helperDrawn(frame(rc)), helperFlag()]).toEqual([true, '1']);
      const g = playTo(level, 1, 5);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/shows it for a moment and costs a charge/);
      for (const a of [g[1].min, 2, g[1].ans, g[1].max]) {
        h.setSlider(a);
        expect([helperDrawn(frame(rc)), helperFlag()]).toEqual([false, '0']);
      }
      h.click(TEST[level]);
      expect(h.feedback()).toMatch(/test/i);
      expect([helperDrawn(frame(rc, 0.3)), helperFlag()]).toEqual([true, '1']);
      expect(helperDrawn(frame(rc, 1.0))).toBe(true);
      expect([helperDrawn(frame(rc, 0.5)), helperFlag()]).toEqual([false, '0']);
      h.click(TEST[level]);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(helperDrawn(frame(rc, 0.5))).toBe(false);
      // a miss in round 2: only the fixed effect, never the curve at the setting (the line ends 34 px from the target dot)
      set(g, 1, true);
      h.click(FIRE[level]);
      h.advance(2.0);
      expect(helperFlag()).toBe('0');
      h.advance(1.5);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      set(g, 1, false);
      h.click(FIRE[level]);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const a of [g[2].min, 3, g[2].ans, g[2].max]) {
        h.setSlider(a);
        expect([helperDrawn(frame(rc)), helperFlag()]).toEqual([false, '0']);
      }
      h.click(TEST[level]);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(helperDrawn(frame(rc, 0.5))).toBe(false);
      set(g, 2, true);
      h.click(FIRE[level]);
      h.advance(2.0);
      expect(helperFlag()).toBe('0');
    });

    it(`level ${level}: a win shows the true curve, even in the boss round`, () => {
      const rc = canvasRecorder();
      h.start(level, 9);
      const g = playTo(level, 2, 9);
      set(g, 2, false);
      h.click(FIRE[level]);
      h.advance(1.5);
      expect([helperDrawn(frame(rc)), helperFlag()]).toEqual([true, '1']);
    });

    it(`level ${level}: two wrong settings on the same side give the same text and the same ending, with the −1 float at one fixed point`, () => {
      for (const round of [0, 1, 2]) {
        const r = build(level, 11)[round];
        const lows = span(r.min, r.max).filter((v) => v !== r.ans && v < r.ans);
        const highs = span(r.min, r.max).filter((v) => v !== r.ans && v > r.ans);
        for (const side of [lows, highs]) {
          if (side.length < 2) continue;
          const seen: string[] = [];
          const xs = new Set<number>();
          const ends: string[] = [];
          for (const v of [side[0], side[side.length - 1]]) {
            const rc = canvasRecorder();
            h.start(level, 11);
            playTo(level, round, 11);
            h.setSlider(v);
            h.click(FIRE[level]);
            rc.clear();
            h.advance(2.2);
            seen.push(h.feedback());
            // the last frame of the shot: the strokes (colour, segments) and the dish circles
            const rec = frame(rc);
            ends.push(JSON.stringify([rec.strokes.filter((s) => s.style === PAL.yellow).length, rec.arcs.map((a) => Math.round(a.r)).join()]));
            rc.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
          }
          expect(seen[0]).toBe(seen[1]);
          expect(seen[0]).not.toMatch(/\d/);
          // above or below the target: one fixed picture, whichever setting was chosen (round 1 keeps its live helper)
          if (round > 0) expect(ends[0]).toBe(ends[1]);
          expect([...xs]).toEqual([320]);
        }
      }
    });
  }

  it('level 1: every wrong scanner setting gets the same words, none of them a number or a hint about which dial', () => {
    const g = build(1, 11);
    const seen = new Set<string>();
    for (const [o, d] of [[1, 0], [2, 3], [3, 1], [4, 4]]) {
      if (o === g[0].order && d === g[0].degree) continue;
      h.start(1, 11);
      h.setSlider(o, 0);
      h.setSlider(d, 1);
      h.click('Scan the specimen');
      h.advance(2.0);
      seen.add(h.feedback());
    }
    expect(seen.size).toBe(1);
    expect([...seen][0]).not.toMatch(/\d|not defined|too (low|high)/);
  });

  it('level 1: the degree is not tied to the round number (the kinds come in a random order)', () => {
    const degrees = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => build(1, s)[1].degree);
    expect(new Set(degrees).size).toBeGreaterThan(1);
    expect(degrees.some((d) => d === 0)).toBe(true);
  });
});
