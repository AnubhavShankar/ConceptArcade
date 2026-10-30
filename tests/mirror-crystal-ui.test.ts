// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch03-matrices/mirror-crystal/index';
import { DIALS, KINDS, buildRounds, type Round } from '../src/games/mathematics/class-12/ch03-matrices/mirror-crystal/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, type CanvasRec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'mirror-crystal', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const keys = (r: Round) => DIALS[r.kind].map((d) => d.key);

function set(r: Round, wrong: boolean) {
  keys(r).forEach((k, i) => {
    const d = DIALS[r.kind][i];
    const off = wrong && i === 0 ? (r.ans[k] + d.step > d.max ? -d.step : d.step) : 0;
    h.setSlider(r.ans[k] + off, i);
  });
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Open the crystal'),
});

describe('Mirror Crystal', () => {
  it('each level has its dials and describes the crystal', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(DIALS[KINDS[level - 1]].length);
      expect(h.note().length).toBeGreaterThan(30);
    }
  });
  it('the half-step dials of level 3 accept halves', () => {
    h.start(3, 5);
    h.setSlider(2.5, 1);
    expect(Number(h.sliders()[1].value)).toBe(2.5);
  });
  it('a miss names the mirror pair, a check costs a charge and a win shows the working', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0], true);
    h.click('Open the crystal');
    h.advance(3);
    expect(h.feedback()).toMatch(/mirror caught the gems at row \d, column \d/);
    set(g[0], false);
    h.click('Open the crystal');
    h.advance(3);
    expect(h.feedback()).toMatch(/A′ = A/);
    h.advance(1);
    h.click('Check the mirror pairs');
    expect(h.feedback()).toMatch(/Check:/);
    h.click('Check the mirror pairs');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 4 has the four X dials, a wrong order is named, a test glow counts gems and a win shows B′A′', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(h.sliders()).toHaveLength(4);
    expect(h.note()).toMatch(/\(AB\)′ with A = \[/);
    // the player sets A′B′ (round 1 is 2 by 2, and A′B′ differs from the answer)
    const A = g[0].RA!;
    const B = g[0].RB!;
    const At = A[0].map((_, j) => A.map((row) => row[j]));
    const Bt = B[0].map((_, j) => B.map((row) => row[j]));
    const wrong = At.map((row) => Bt[0].map((_, j) => row.reduce((s, v, k) => s + v * Bt[k][j], 0)));
    wrong.flat().forEach((v, i) => h.setSlider(v, i));
    h.click('Open the crystal');
    h.advance(3);
    expect(h.feedback()).toMatch(/A′B′/);
    set(g[0], false);
    h.click('Open the crystal');
    h.advance(3);
    expect(h.feedback()).toMatch(/B′A′/);
    h.advance(1);
    set(g[1], true);
    h.click('Test glow: count the matching gems');
    expect(h.feedback()).toMatch(/Test glow: 3 of the 4 gems match/);
    h.click('Test glow: count the matching gems');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('the skew level explains the zero diagonal', () => {
    h.start(2, 5);
    const g = build(2, 5);
    set(g[0], false);
    h.click('Open the crystal');
    h.advance(3);
    expect(h.feedback()).toMatch(/diagonal entry is 0/);
  });
});

const CHECK = 'Check the mirror pairs';
const OPEN = 'Open the crystal';
const frame = (R: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
/** The verdict marks (✓ or ✗) are drawn only by the helper: the links list, the sum flags and the P and Q labels. */
const marksDrawn = (rec: CanvasRec['rec']) => rec.at.some((a) => a.s.includes('✓') || a.s.includes('✗'));
const canvas = () => h.$('canvas')!;
const playRound = (g: Round[], k: number) => {
  set(g[k], false);
  h.click(OPEN);
  h.advance(2.8);
  h.advance(1);
};

describe('Mirror Crystal levels 1 to 3 never leak the answer', () => {
  for (const level of [1, 2, 3]) {
    it(`level ${level}: marks are live in round 1, show 1.5 s after a check in round 2, never in round 3, and a miss shows none after round 1`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      expect(marksDrawn(frame(R))).toBe(true);
      expect(canvas().dataset.links).toBe('1');
      playRound(g, 0);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      for (const wrong of [true, false]) {
        set(g[1], wrong);
        expect(marksDrawn(frame(R, 0.3))).toBe(false);
      }
      expect(canvas().dataset.links).toBe('0');
      set(g[1], true);
      h.click(CHECK);
      expect(marksDrawn(frame(R, 0.3))).toBe(true);
      expect(marksDrawn(frame(R, 1.0))).toBe(true);
      expect(marksDrawn(frame(R, 0.5))).toBe(false);
      // a miss in round 2 draws no marks and says the same generic thing
      h.click(OPEN);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(marksDrawn(frame(R, dt))).toBe(false);
      h.advance(1);
      expect(h.feedback()).not.toMatch(/row \d/);
      playRound(g, 1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const wrong of [true, false]) {
        set(g[2], wrong);
        expect(marksDrawn(frame(R, 0.3))).toBe(false);
      }
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(marksDrawn(frame(R, 0.3))).toBe(false);
      set(g[2], true);
      h.click(OPEN);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(marksDrawn(frame(R, dt))).toBe(false);
      expect(canvas().dataset.links).toBe('0');
      expect(h.feedback()).not.toMatch(/row \d|\d/);
    });

    it(`level ${level}: a win draws the marks (all ✓)`, () => {
      const R = canvasRecorder();
      h.start(level, 11);
      const g = build(level, 11);
      playRound(g, 0);
      set(g[1], false);
      h.click(OPEN);
      let marks = false;
      for (let i = 0; i < 8; i++) marks = marksDrawn(frame(R, 0.2)) || marks;
      expect(marks).toBe(true);
    });

    it(`level ${level}: two wrong settings in round 2 give the same text and the −1 float lands at one fixed point`, () => {
      const texts: string[] = [];
      const xs = new Set<number>();
      for (const bump of [1, 2]) {
        const R = canvasRecorder();
        h.start(level, 11);
        const g = build(level, 11);
        playRound(g, 0);
        const r = g[1];
        DIALS[r.kind].forEach((d, i) => h.setSlider(r.ans[d.key] + (i === 0 ? -bump * d.step : 0), i));
        h.click(OPEN);
        R.clear();
        h.advance(2.8);
        texts.push(h.feedback());
        R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
      }
      expect(texts[0]).toBe(texts[1]);
      expect([...xs]).toEqual([330]);
    });

    it(`level ${level}: the start never wins`, () => {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        h.start(level, seed);
        h.click(OPEN);
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
    });
  }
});
