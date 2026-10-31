// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/track-joiner/index';
import { DIALS, KINDS, buildRounds, type Round } from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/track-joiner/logic';
import { createRng } from '../src/core/random';
import { PAL } from '../src/core/arcade';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts, type CanvasRec, type Rec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'track-joiner', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const keys = (r: Round) => DIALS[r.kind].map((d) => d.key);

function set(r: Round, wrong: boolean) {
  keys(r).forEach((key, i) => h.setSlider(r.ans[key] + (wrong && i === 0 ? 1 : 0), i));
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Send Zip down the track'),
});

const FIRE = 'Send Zip down the track';
const TEST = 'Test ride: read the limits at the first broken join';
const canvas = () => h.$('canvas')!;
const frame = (R: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
/** The whole track is the helper: with it the pink piece and no "hidden" note are drawn; without it only the first piece is. */
const helperDrawn = (rec: Rec) => !texts(rec).includes('? the rest of the track is hidden') && rec.strokes.some((s) => s.style === PAL.pink);
const vals = (r: Round) => keys(r).map((k) => r.ans[k]);
const setAll = (vs: number[]) => vs.forEach((x, i) => h.setSlider(x, i));
/** Wrong settings: 0 moves the first dial up one, 1 moves the second dial (or, with one dial, moves the first down one). */
const off = (r: Round, which: number) => vals(r).map((x, i) => x + (keys(r).length === 1 ? (which ? -1 : 1) : i === which ? 1 : 0));
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    setAll(vals(g[k]));
    h.click(FIRE);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

describe('Track Joiner never leaks the answer', () => {
  for (const level of [1, 2, 3]) {
    it(`level ${level}: the whole track is live in round 1, shows for 1.5 s after a paid test ride in round 2, and never in round 3; a miss never shows it`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const g0 = build(level, 5);
      setAll(vals(g0[0]));
      expect(helperDrawn(frame(R))).toBe(true);
      expect(canvas().dataset.helper).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/Only the first piece is drawn: a test ride shows the whole track for a moment and costs a charge/);
      const dials = DIALS[KINDS[level - 1]];
      const at = (f: (d: (typeof dials)[number]) => number) => dials.map(f);
      // round 2, before any ride: only the first piece, at every setting, the answer included
      for (const vs of [at((d) => d.start), vals(g[1]), at((d) => d.max), at((d) => d.min)]) {
        setAll(vs);
        expect(helperDrawn(frame(R, 0.3))).toBe(false);
        expect(canvas().dataset.helper).toBe('0');
      }
      setAll(vals(g[1]));
      h.click(TEST);
      expect(h.feedback()).toMatch(/Test ride/);
      expect(helperDrawn(frame(R, 0.3))).toBe(true);
      expect(helperDrawn(frame(R, 1.0))).toBe(true);
      expect(helperDrawn(frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(helperDrawn(frame(R, 0.5))).toBe(false);
      // a miss in round 2 draws only the first piece
      setAll(off(g[1], 0));
      h.click(FIRE);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(helperDrawn(frame(R, dt))).toBe(false);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      // a win shows the whole track
      setAll(vals(g[1]));
      h.click(FIRE);
      expect(helperDrawn(frame(R, 0.5))).toBe(true);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      // round 3: never, at any setting; a ride is refused; a miss draws only the first piece
      for (const vs of [at((d) => d.start), vals(g[2]), at((d) => d.max)]) {
        setAll(vs);
        expect(helperDrawn(frame(R, 0.3))).toBe(false);
      }
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(helperDrawn(frame(R, 0.5))).toBe(false);
      setAll(off(g[2], 0));
      h.click(FIRE);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(helperDrawn(frame(R, dt))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
    });
  }

  it('in rounds 2 and 3 every miss ends the same way: the cart stops on the first piece at the first join, whichever join or kind of fault it was', () => {
    for (const level of [1, 2, 3]) {
      for (const round of [1, 2]) {
        const r = build(level, 11)[round];
        const variants = [off(r, 0), off(r, 1)];
        // level 3: the right value with the wrong slope is a corner, and a wrong value is a gap
        if (level === 3) variants.push([r.ans.k + 1, r.ans.m - r.joins[0]]);
        const carts = new Set<string>();
        const texts2 = new Set<string>();
        for (const vs of variants) {
          const R = canvasRecorder();
          h.start(level, 11);
          playTo(level, round, 11);
          setAll(vs);
          h.click(FIRE);
          R.clear();
          h.advance(2.0);
          carts.add(canvas().dataset.cart ?? '');
          texts2.add(h.feedback().replace(/ too (low|high|steep|shallow)/, ' too _'));
        }
        expect([...carts]).toEqual([String(Math.round(40 + (r.joins[0] - 0.02) * 90))]);
        expect(texts2.size).toBeLessThanOrEqual(2);
      }
    }
  });

  it('level 1: two wrong k on the same side give the same miss text and the same animation end, and the −1 float lands at one fixed point (never at the answer)', () => {
    const xs = new Set<number>();
    for (const round of [1, 2]) {
      const r = build(1, 11)[round];
      for (const side of [[-5, r.ans.k - 1], [r.ans.k + 1, 9]]) {
        const seen: { text: string; strings: string[]; cart: string }[] = [];
        for (const k of side) {
          const R = canvasRecorder();
          h.start(1, 11);
          playTo(1, round, 11);
          setAll([k]);
          h.click(FIRE);
          R.clear();
          h.advance(2.8);
          R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
          seen.push({ text: h.feedback(), strings: [...new Set(texts(R.rec))].sort(), cart: canvas().dataset.cart ?? '' });
        }
        expect(seen[0].text.length).toBeGreaterThan(20);
        expect(seen[0].text).toBe(seen[1].text);
        expect(seen[0].strings).toEqual(seen[1].strings);
        expect(seen[0].cart).toBe(seen[1].cart);
      }
    }
    expect([...xs]).toEqual([40 + 6 * 90]);
  });

  it('the start (every dial at 0) never wins, in any row of any level', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        h.start(level, seed);
        expect(h.sliders().map((s) => Number(s.value))).toEqual(DIALS[KINDS[level - 1]].map((d) => d.start));
        h.click(FIRE);
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
    }
  });
});

describe('Track Joiner', () => {
  it('each level has its dials and shows the track in words', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(DIALS[KINDS[level - 1]].length);
      expect(h.note()).toMatch(/f\(x\) = /);
    }
  });
  it('a gap and a corner are told apart, and a test ride costs a charge', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(g[0].ans.k + 1);
    h.click('Send Zip down the track');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/track broke at a join/);
    expect(h.feedback()).not.toMatch(/k = |\d/);
    h.start(3, 5);
    const s = build(3, 5);
    h.setSlider(s[0].ans.k + 1, 0);
    h.setSlider(s[0].ans.m - s[0].joins[0], 1);
    h.click('Send Zip down the track');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/bent sharply at a join/);
  });
  it('a win shows the working and the test ride runs out', () => {
    h.start(2, 5);
    const g = build(2, 5);
    set(g[0], false);
    h.click('Send Zip down the track');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/Continuity at x = /);
    h.advance(1);
    h.click('Test ride: read the limits at the first broken join');
    expect(h.feedback()).toMatch(/Test ride/);
    h.click('Test ride: read the limits at the first broken join');
    expect(h.feedback()).toMatch(/No charges left/);
  });
});
