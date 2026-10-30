// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch03-matrices/hole-in-the-wall/index';
import { DIALS, KINDS, buildRounds, type Round } from '../src/games/mathematics/class-12/ch03-matrices/hole-in-the-wall/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts, type CanvasRec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'hole-in-the-wall', 5);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const FIRE = ['Send Blocky through the wall', 'Send Blocky through the machine', 'Send Blocky through the turntable', 'Send Blocky through both machines', 'Send Blocky through the express machine'];
const keys = (r: Round) => DIALS[r.kind].map((d) => d.key);
const wrongOf = (r: Round) => {
  const d = DIALS[r.kind][0];
  return r.ans[d.key] === d.max ? d.max - 1 : r.ans[d.key] + 1;
};

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build,
  setRight: (g, k) => keys(g[k]).forEach((key, i) => h.setSlider(g[k].ans[key], i)),
  setWrong: (g, k) => {
    keys(g[k]).forEach((key, i) => h.setSlider(g[k].ans[key], i));
    h.setSlider(wrongOf(g[k]), 0);
  },
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('Hole in the Wall', () => {
  it('each level has its dials, and the hole is in the note', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(DIALS[KINDS[level - 1]].length);
      expect(h.note()).toMatch(/The hole is \[/);
    }
  });
  it('a miss names the vertex that jammed, a test slide costs a charge, and a win shows the working', () => {
    h.start(2, 5);
    const g = build(2, 5);
    keys(g[0]).forEach((key, i) => h.setSlider(g[0].ans[key], i));
    h.setSlider(wrongOf(g[0]), 0);
    h.click(FIRE[1]);
    h.advance(3);
    expect(h.feedback()).toMatch(/^Vertex \d landed outside the hole/);
    expect(h.feedback()).not.toMatch(/came out at|\(/);
    keys(g[0]).forEach((key, i) => h.setSlider(g[0].ans[key], i));
    h.click(FIRE[1]);
    h.advance(3);
    expect(h.feedback()).toMatch(/Row 1 of A times column 1 of P/);
    h.advance(1);
    h.click('Test slide: read the outline at these settings');
    expect(h.feedback()).toMatch(/Test slide/);
    h.click('Test slide: read the outline at these settings');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 5 has the k and m dials, a win shows A² − in the working and a wrong k jams Blocky', () => {
    h.start(5, 5);
    const g = build(5, 5);
    expect(h.sliders().map((s) => s.getAttribute('aria-label'))).toEqual(['Value of k in kA − mI', 'Value of m in kA − mI']);
    keys(g[0]).forEach((key, i) => h.setSlider(g[0].ans[key], i));
    h.setSlider(g[0].ans.k + 1, 0);
    h.click(FIRE[4]);
    h.advance(3);
    expect(h.feedback()).toMatch(/vertex \d came out at/);
    expect(h.feedback()).not.toMatch(/k = |m = /);
    keys(g[0]).forEach((key, i) => h.setSlider(g[0].ans[key], i));
    h.click(FIRE[4]);
    h.advance(3);
    expect(h.feedback()).toMatch(/A² −/);
  });
  it('level 3 can be dragged on the track and shows the angle in π', () => {
    h.start(3, 5);
    h.pointer('pointerdown', 60 + (520 * 11) / 23, 322);
    h.pointer('pointermove', 60 + (520 * 14) / 23, 322);
    expect(Number(h.sliders()[0].value)).toBe(3);
    expect(h.$('.v-readout')?.textContent).toMatch(/π/);
  });
  it('level 3 shows the player’s own angle beside the knob, with its unit', () => {
    const R = canvasRecorder();
    h.start(3, 5);
    h.setSlider(3);
    h.advance(0.1);
    expect(texts(R.rec).some((s) => /^α = π\/4 \(45°\)$/.test(s))).toBe(true);
  });
});

const TEST_SLIDE = 'Test slide: read the outline at these settings';
const frame = (R: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
/** The live outline panel: its title says NOW only while the helper is on, and the result matrix is drawn then. */
const liveDrawn = (rec: CanvasRec['rec']) => rec.at.some((a) => a.s === 'RESULT NOW');
const canvas = () => h.$('canvas')!;
const setRound = (r: Round, wrong: boolean) => keys(r).forEach((key, i) => h.setSlider(wrong && i === 0 ? wrongOf(r) : r.ans[key], i));
const playRound = (level: number, g: Round[], k: number) => {
  setRound(g[k], false);
  h.click(FIRE[level - 1]);
  h.advance(2.8);
  h.advance(1);
};
/** The corner dots of Blocky (the only arcs of radius 3.5), in the order drawn. */
const dots = (rec: CanvasRec['rec']) => rec.arcs.filter((a) => a.r === 3.5).map((a) => `${a.x.toFixed(2)},${a.y.toFixed(2)}`).join(' ');

describe('Hole in the Wall levels 1 to 4 never leak the answer', () => {
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level}: the live outline is on in round 1, shows 1.5 s after a test slide in round 2, and never in round 3`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      expect(liveDrawn(frame(R))).toBe(true);
      expect(canvas().dataset.live).toBe('1');
      playRound(level, g, 0);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      for (const wrong of [true, false]) {
        setRound(g[1], wrong);
        expect(liveDrawn(frame(R, 0.3))).toBe(false);
      }
      expect(canvas().dataset.live).toBe('0');
      setRound(g[1], true);
      h.click(TEST_SLIDE);
      expect(liveDrawn(frame(R, 0.3))).toBe(true);
      expect(liveDrawn(frame(R, 1.0))).toBe(true);
      expect(liveDrawn(frame(R, 0.5))).toBe(false);
      // a miss in round 2 (after the flash) shows no live outline and a generic miss text
      h.click(FIRE[level - 1]);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(liveDrawn(frame(R, dt))).toBe(false);
      h.advance(1);
      expect(h.feedback()).toMatch(/^Blocky jammed in the wall: at least one corner/);
      playRound(level, g, 1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const wrong of [true, false]) {
        setRound(g[2], wrong);
        expect(liveDrawn(frame(R, 0.3))).toBe(false);
      }
      h.click(TEST_SLIDE);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(liveDrawn(frame(R, 0.3))).toBe(false);
      setRound(g[2], true);
      h.click(FIRE[level - 1]);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(liveDrawn(frame(R, dt))).toBe(false);
      expect(canvas().dataset.live).toBe('0');
    });

    it(`level ${level}: a win draws the live outline`, () => {
      const R = canvasRecorder();
      h.start(level, 11);
      const g = build(level, 11);
      playRound(level, g, 0);
      setRound(g[1], false);
      h.click(FIRE[level - 1]);
      let live = false;
      for (let i = 0; i < 8; i++) live = liveDrawn(frame(R, 0.2)) || live;
      expect(live).toBe(true);
    });

    it(`level ${level}: two wrong settings in round 3 give the same text, the same Blocky (corner dots) at every moment, and the −1 float at one point`, () => {
      const texts2: string[] = [];
      const dotLog: string[][] = [];
      const xs = new Set<number>();
      for (const bump of [1, 2]) {
        const R = canvasRecorder();
        h.start(level, 11);
        const g = build(level, 11);
        playRound(level, g, 0);
        playRound(level, g, 1);
        const r = g[2];
        const d = DIALS[r.kind][0];
        keys(r).forEach((key, i) => h.setSlider(r.ans[key] + (i === 0 ? (r.ans[key] + bump > d.max ? -bump : bump) : 0), i));
        h.click(FIRE[level - 1]);
        const log: string[] = [];
        for (const dt of [0.2, 0.4, 0.4, 0.4, 0.4]) log.push(dots(frame(R, dt)));
        dotLog.push(log);
        R.clear();
        h.advance(1);
        texts2.push(h.feedback());
        R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
      }
      expect(texts2[0]).toBe(texts2[1]);
      expect(dotLog[0]).toEqual(dotLog[1]);
      expect(dotLog[0].some((s) => s.length > 0)).toBe(true);
      expect(xs.size).toBeLessThanOrEqual(1);
    });

    it(`level ${level}: the start never wins`, () => {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        h.start(level, seed);
        h.click(FIRE[level - 1]);
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
    });
  }
});
