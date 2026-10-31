// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch09-differential-equations/slope-surfer/index';
import { buildRounds, missSide, type Round } from '../src/games/mathematics/class-12/ch09-differential-equations/slope-surfer/logic';
import { PAL } from '../src/core/arcade';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, type CanvasRec, type Rec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'slope-surfer', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.cmax ? r.ans - 1 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Ride the curve'),
});

const RIDE = 'Ride the curve';
const TEST = 'Test ride: read the height at the beacon for this C';
const canvas = () => h.$('canvas')!;
const frame = (R: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
/** The helper: the player's curve (one long cyan stroke) and the wind arrows (a hundred short dim strokes). */
const curveDrawn = (rec: Rec) => rec.strokes.some((s) => s.style === PAL.cyan && s.n > 50);
const arrowsDrawn = (rec: Rec) => rec.strokes.filter((s) => s.style === PAL.dim).length > 60;
const helperDrawn = (rec: Rec) => curveDrawn(rec) || arrowsDrawn(rec);
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    h.setSlider(g[k].ans);
    h.click(RIDE);
    h.advance(3.4);
    h.advance(1);
  }
  return g;
};
/** The screen x of the beacon, where the −1 float lands. */
const beaconX = (r: Round) => 60 + ((r.xb - r.xs) / (r.xe - r.xs)) * (580 - 60);

describe('Slope Surfer never leaks the answer', () => {
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level}: the wind and the curve are live in round 1, show for 1.5 s after a paid test ride in round 2, and never in round 3; a miss never shows them`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const g0 = build(level, 5);
      h.setSlider(g0[0].ans);
      const live = frame(R);
      expect(curveDrawn(live) && arrowsDrawn(live)).toBe(true);
      expect(canvas().dataset.helper).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/No wind arrows or curve: a test ride shows them for a moment and costs a charge/);
      // round 2, before any ride: neither the arrows nor the curve, at any setting, the answer included
      for (const c of [g[1].start, g[1].ans, g[1].cmax, g[1].cmin]) {
        h.setSlider(c);
        expect(helperDrawn(frame(R, 0.3))).toBe(false);
        expect(canvas().dataset.helper).toBe('0');
      }
      h.setSlider(g[1].ans);
      h.click(TEST);
      expect(h.feedback()).toMatch(/Test ride/);
      const on = frame(R, 0.3);
      expect(curveDrawn(on) && arrowsDrawn(on)).toBe(true);
      expect(helperDrawn(frame(R, 1.0))).toBe(true);
      expect(helperDrawn(frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(helperDrawn(frame(R, 0.5))).toBe(false);
      // a miss in round 2 shows neither
      h.setSlider(g[1].ans === g[1].cmax ? g[1].ans - 1 : g[1].ans + 1);
      h.click(RIDE);
      for (const dt of [0.3, 0.6, 0.6, 0.6, 0.6]) expect(helperDrawn(frame(R, dt))).toBe(false);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      // a win shows the construction
      h.setSlider(g[1].ans);
      h.click(RIDE);
      expect(helperDrawn(frame(R, 0.5))).toBe(true);
      h.advance(3.4);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      // round 3: never, at any setting; a ride is refused; a miss shows neither
      for (const c of [g[2].start, g[2].ans, g[2].cmax]) {
        h.setSlider(c);
        expect(helperDrawn(frame(R, 0.3))).toBe(false);
      }
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(helperDrawn(frame(R, 0.5))).toBe(false);
      h.setSlider(g[2].ans === g[2].cmax ? g[2].ans - 1 : g[2].ans + 1);
      h.click(RIDE);
      for (const dt of [0.3, 0.6, 0.6, 0.6, 0.6]) expect(helperDrawn(frame(R, dt))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
    });
  }

  it('two wrong constants on the same side give the same miss text and the same animation end (a fixed 40 px from the beacon), and the −1 float lands at the beacon, never at the answer', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const round of [1, 2]) {
        const r = build(level, 11)[round];
        const groups = new Map<string, number[]>();
        for (let c = r.cmin; c <= r.cmax; c++) if (c !== r.ans) groups.set(missSide(r, c), [...(groups.get(missSide(r, c)) ?? []), c]);
        for (const [side, cs] of groups) {
          if (cs.length < 2) continue;
          const seen: { text: string; strings: string[]; dy: string }[] = [];
          for (const c of [cs[0], cs[cs.length - 1]]) {
            const R = canvasRecorder();
            h.start(level, 11);
            playTo(level, round, 11);
            h.setSlider(c);
            h.click(RIDE);
            R.clear();
            h.advance(2.3);
            const floats = R.rec.at.filter((a) => a.s === '−1 ♥');
            expect(floats.length).toBeGreaterThan(0);
            floats.forEach((a) => expect(a.x).toBeCloseTo(beaconX(r), 5));
            seen.push({ text: h.feedback(), strings: [...new Set(R.rec.at.map((a) => a.s))].sort(), dy: canvas().dataset.dy ?? '' });
          }
          expect(seen[0].text.length).toBeGreaterThan(20);
          expect(seen[0].text).toBe(seen[1].text);
          expect(seen[0].strings).toEqual(seen[1].strings);
          expect(seen[0].dy).toBe(seen[1].dy);
          if (side === 'above') expect(seen[0].dy).toBe('-40');
          if (side === 'below') expect(seen[0].dy).toBe('40');
        }
      }
    }
  });

  it('the start (C = 0) never wins, in any row of any level', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        h.start(level, seed);
        expect(Number(h.sliders()[0].value)).toBe(0);
        h.click(RIDE);
        h.advance(3.4);
        expect(h.hearts()).toBe(2);
      }
    }
  });
});

describe('Slope Surfer', () => {
  it('the dial follows each round’s range and starts away from the answer; the beacon is in the note', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].cmin, g[0].cmax, g[0].start]);
      expect(Number(s.value)).not.toBe(g[0].ans);
      expect(h.note()).toContain(g[0].de);
    }
  });
  it('a miss gives the height and the side, never C; a win shows the general solution; a test ride costs a charge', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(wrong(g[0]));
    h.click('Ride the curve');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/above|below/);
    h.setSlider(g[0].ans);
    h.click('Ride the curve');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/general solution/);
    h.advance(1);
    h.click('Test ride: read the height at the beacon for this C');
    expect(h.feedback()).toMatch(/Test ride/);
    h.click('Test ride: read the height at the beacon for this C');
    expect(h.feedback()).toMatch(/No charges left/);
  });
});
