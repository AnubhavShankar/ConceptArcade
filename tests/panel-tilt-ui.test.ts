// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch10-vector-algebra/panel-tilt/index';
import { buildRounds, cross, type Round } from '../src/games/mathematics/class-12/ch10-vector-algebra/panel-tilt/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, type Rec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'panel-tilt', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));

/** Set the right setting, or one step off in the first dial (never past the dial end). */
function set(r: Round, wrong: boolean) {
  r.ans.forEach((a, i) => h.setSlider(wrong && i === 0 ? (a === r.max ? a - 1 : a + 1) : a, i));
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Drive the bolt'),
});

const FIRE = 'Drive the bolt';
const TEST = 'Panel test: see how the panel sits for this setting';
const canvas = () => h.$('canvas')!;
/** One frame, with the clock first advanced to `dt` seconds after the last one. */
const frame = (R: ReturnType<typeof canvasRecorder>, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
/** The helper: the player's bolt and its numbers (level 1), the area readout (levels 2 and 3), or the folded-flat label (level 3). */
const helperDrawn = (level: number, rec: Rec) =>
  rec.at.some((a) => (level === 1 ? /^bolt [−-]?\d/.test(a.s) : /^area \d/.test(a.s)) || a.s === 'folded flat');
const bLabel = (rec: Rec) => rec.at.find((a) => a.s === 'b');
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    set(g[k], false);
    h.click(FIRE);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const setAll = (vs: number[]) => vs.forEach((x, i) => h.setSlider(x, i));
/** A wrong setting: in level 1 a bolt that is not square to the panel, in levels 2 and 3 the value c. */
const off = (r: Round, which: number) => (r.kind === 'mount' ? r.ans.map((x, i) => (i === which ? x + (x >= 11 ? -2 : 2) : x)) : [0]);

describe('Panel Tilt never leaks the answer', () => {
  for (const level of [1, 2, 3]) {
    it(`level ${level}: the helper is live in round 1, shows for 1.5 s after a paid test in round 2, and never in round 3; a miss never shows it`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const g0 = build(level, 5);
      setAll(g0[0].ans);
      expect(helperDrawn(level, frame(R))).toBe(true);
      expect(canvas().dataset.helper).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/Nothing is shown: a test shows .* for a moment and costs a charge/);
      // round 2, before any test: nothing, at any setting, the answer included
      const bPos: string[] = [];
      for (const vs of [g[1].ans.map(() => 0), g[1].ans.map((x) => x), g[1].ans.map(() => g[1].max), g[1].ans.map(() => g[1].min)]) {
        setAll(vs);
        const rec = frame(R, 0.3);
        expect(helperDrawn(level, rec)).toBe(false);
        expect(canvas().dataset.helper).toBe('0');
        if (level === 3) bPos.push(JSON.stringify(bLabel(rec)));
      }
      // in level 3 the b vector no longer follows the dial
      if (level === 3) expect(new Set(bPos).size).toBe(1);
      setAll(g[1].ans);
      h.click(TEST);
      expect(h.feedback()).toMatch(/test/i);
      expect(helperDrawn(level, frame(R, 0.3))).toBe(true);
      expect(helperDrawn(level, frame(R, 1.0))).toBe(true);
      expect(helperDrawn(level, frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(helperDrawn(level, frame(R, 0.5))).toBe(false);
      // a miss in round 2 does not show it, nor the fixed-c panel's flat label
      setAll(off(g[1], 0));
      h.click(FIRE);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(helperDrawn(level, frame(R, dt))).toBe(false);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      setAll(g[1].ans);
      h.click(FIRE);
      // a win shows the true construction
      expect(helperDrawn(level, frame(R, 0.5))).toBe(true);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      // round 3: never, at any setting; a test is refused; a miss shows nothing either
      for (const vs of [g[2].ans.map(() => 0), g[2].ans, g[2].ans.map(() => g[2].max)]) {
        setAll(vs);
        expect(helperDrawn(level, frame(R, 0.3))).toBe(false);
      }
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(helperDrawn(level, frame(R, 0.5))).toBe(false);
      setAll(off(g[2], 0));
      h.click(FIRE);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) expect(helperDrawn(level, frame(R, dt))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
    });
  }

  it('level 1: a miss never draws the true normal (the dashed green line), and a win does', () => {
    const R = canvasRecorder();
    h.start(1, 11);
    const g = build(1, 11);
    setAll(off(g[0], 0));
    h.click(FIRE);
    let dashed = false;
    for (let i = 0; i < 12; i++) dashed = frame(R, 0.2).strokes.some((s) => s.dash) || dashed;
    expect(dashed).toBe(false);
    h.advance(1);
    setAll(g[0].ans);
    h.click(FIRE);
    dashed = false;
    for (let i = 0; i < 12; i++) dashed = frame(R, 0.2).strokes.some((s) => s.dash) || dashed;
    expect(dashed).toBe(true);
  });

  it('two wrong settings on the same side give the same miss text and the same animation end, and the −1 float lands at one fixed point', () => {
    const xs = new Set<number>();
    for (const level of [1, 2, 3]) {
      for (const round of [1, 2]) {
        const r = build(level, 11)[round];
        const sides: number[][][] =
          level === 1
            ? [[off(r, 0), off(r, 1)]]
            : [
                [[r.min], [r.ans[0] - 1]],
                [[r.ans[0] + 1], [r.max]],
              ].map((s) => s.filter((vs) => vs[0] >= r.min && vs[0] <= r.max && vs[0] !== r.ans[0]));
        for (const side of sides) {
          if (side.length < 2 || side[0][0] === side[1][0] && level !== 1) continue;
          const seen: { text: string; strings: string[] }[] = [];
          for (const vs of side) {
            const R = canvasRecorder();
            h.start(level, 11);
            playTo(level, round, 11);
            setAll(vs);
            h.click(FIRE);
            R.clear();
            h.advance(2.8);
            const strings = new Set(R.rec.at.map((a) => a.s));
            R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
            seen.push({ text: h.feedback(), strings: [...strings].sort() });
          }
          expect(seen[0].text.length).toBeGreaterThan(20);
          expect(seen[0].text).toBe(seen[1].text);
          expect(seen[0].strings).toEqual(seen[1].strings);
        }
      }
    }
    // the float's position never depends on the round's answer
    expect([...xs]).toEqual([330]);
  });

  it('the float lands at one fixed point whatever the answer is, win or miss', () => {
    const xs = new Set<number>();
    for (const level of [1, 2, 3]) {
      for (const seed of [1, 2, 3]) {
        for (const ok of [true, false]) {
          const R = canvasRecorder();
          h.start(level, seed);
          const r = build(level, seed)[0];
          setAll(ok ? r.ans : off(r, 0));
          h.click(FIRE);
          R.clear();
          h.advance(2.8);
          const floats = R.rec.at.filter((a) => /^(−1 ♥|\+\d+)$/.test(a.s));
          expect(floats.length).toBeGreaterThan(0);
          floats.forEach((a) => xs.add(a.x));
        }
      }
    }
    expect([...xs]).toEqual([330]);
  });

  it('the start (every dial at 0) never wins, in any row of any level', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        h.start(level, seed);
        expect(h.sliders().map((s) => Number(s.value))).toEqual(build(level, seed)[0].ans.map(() => 0));
        h.click(FIRE);
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
    }
  });
});

describe('Panel Tilt', () => {
  it('level 1 has three bolt dials, levels 2 and 3 one, and the supports are in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(level === 1 ? 3 : 1);
      expect(h.note()).toMatch(/a = \(/);
    }
  });
  it('level 1: the reversed bolt gets the right-hand-rule message and a bolt test costs a charge', () => {
    h.start(1, 5);
    const g = build(1, 5);
    cross(g[0].b, g[0].a).forEach((x, i) => h.setSlider(x, i));
    h.click('Drive the bolt');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/wrong way/);
    h.click('Panel test: see how the panel sits for this setting');
    expect(h.feedback()).toMatch(/Bolt test/);
    h.click('Panel test: see how the panel sits for this setting');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 3: a miss says the panel is not flat, a win explains the multiple', () => {
    h.start(3, 5);
    const g = build(3, 5);
    set(g[0], true);
    h.click('Drive the bolt');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/not parallel/);
    set(g[0], false);
    h.click('Drive the bolt');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/multiple of a/);
  });
});
