// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch12-atoms/bohr-orbits/index';
import { DELAY, answer, buildRounds, goal, outcome, ringA, sup, type Round, type Values } from '../src/games/physics/class-12/ch12-atoms/bohr-orbits/logic';
import { ATOM, onRing, ringPx, trapPx } from '../src/games/physics/class-12/ch12-atoms/bohr-orbits/art';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'bohr-orbits', 4);
type L = 1 | 2 | 3 | 4;
const LEVELS: L[] = [1, 2, 3, 4];
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const FIRE = (level: number) => (level === 4 ? 'Zoom the scope to this power of ten' : 'Fire the flash and take the photo');
const TEST = 'Test flash: preview this setting (costs a charge)';
const wrong = (r: Round) => (r.kind === 'trap' || r.kind === 'twin' ? (answer(r) + 15) % 360 : answer(r) + 1);
shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => h.setSlider(answer(g[k])),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: (level) => h.click(FIRE(level)),
});

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const R = () => canvasRecorder();
const canvas = () => h.$('canvas')!;
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
    h.setSlider(answer(g[k]));
    h.click(FIRE(level));
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const HELPER = [/waves: (fits|no fit)/, /^first reaches here /, /^B first reaches here /, /^live view$/];
const helperDrawn = (level: L, texts: string[]) => texts.some((s) => HELPER[level - 1].test(s));
const token = (r: Round) => (r.kind === 'ring' ? `${ringA(answer(r)).toFixed(2)} Å` : r.kind === 'zoom' ? `×10${sup(answer(r))}` : `${answer(r)}°`);
const ownToken = (r: Round, v: number) => (r.kind === 'ring' ? `${ringA(v).toFixed(2)} Å` : r.kind === 'zoom' ? `×10${sup(v)}` : `${v}°`);
const dialRange = (level: L) => (level === 1 ? [1, 30, 1] : level === 4 ? [0, 90, 1] : [0, 345, 15]);
const sweep = (level: L) => {
  const [lo, hi, step] = dialRange(level);
  return Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
};
/** Two wrong settings on one side of the answer. */
const sameSide = (level: L, a: number, side: 'above' | 'below'): [number, number] => {
  const s = side === 'above' ? 1 : -1;
  return level === 1 ? [a + 2 * s, a + 4 * s] : level === 4 ? [a + s, a + 3 * s] : [a + 15 * s, a + 30 * s];
};

describe('Snap the Electron', () => {
  it('each level has one slider: level 1 runs 1 to 30 from 6, levels 2 and 3 run 0 to 345 in 15s from 0, level 4 runs 0 to 90 from 0', () => {
    const want = [[1, 30, 6, 1], [0, 345, 0, 15], [0, 345, 0, 15], [0, 90, 0, 1]];
    for (const level of LEVELS) {
      h.start(level, 5);
      expect(h.sliders().length).toBe(1);
      const [s] = h.sliders();
      expect([Number(s.min), Number(s.max), Number(s.value), Number(s.step)]).toEqual(want[level - 1]);
    }
  });

  it('one frame after Fire the phase is resolve and the floater is up (FLASH! or ZOOM!)', () => {
    for (const level of LEVELS) {
      const c = R();
      h.start(level, 5);
      h.click(FIRE(level));
      const t = frame(c);
      expect(h.phase()).toBe('resolve');
      expect(t, `level ${level}`).toContain(level === 4 ? 'ZOOM!' : 'FLASH!');
    }
  });

  it('the start setting never wins: firing at once costs a heart in every round of every level', () => {
    for (const level of LEVELS) {
      for (let k = 0; k < 3; k++) {
        h.start(level, 5);
        playTo(level, k);
        expect(h.hearts()).toBe(3);
        h.click(FIRE(level));
        h.advance(2.8);
        expect(h.hearts(), `level ${level} round ${k + 1}`).toBe(2);
      }
    }
  });

  it('the test flash reads out and spends the charge in round 1 (a second click says there are none); round 3 has none at all', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      h.click(TEST);
      expect(h.feedback()).toMatch(/^Test flash/);
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      h.start(level, 5);
      playTo(level, 2);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
    }
  });

  it('a win teaches (Got it! or Counted!) and a miss on each side says which way to go', () => {
    const DIR: Record<string, RegExp[]> = {
      // [a setting below the answer, a setting above it]
      1: [/farther out/, /closer in/],
      2: [/already gone past/, /not reached/],
      3: [/already gone past/, /not reached/],
      4: [/too many waves/, /less than one wave/],
    };
    for (const level of LEVELS) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      h.setSlider(answer(r));
      h.click(FIRE(level));
      h.advance(2.8);
      expect(h.feedback()).toMatch(level === 4 ? /^Counted!/ : /^Got it!/);
      for (const side of [0, 1]) {
        h.start(level, 5);
        const step = dialRange(level)[2];
        h.setSlider(answer(r) + (side === 0 ? -step : step));
        h.click(FIRE(level));
        h.advance(2.8);
        expect(h.feedback(), `level ${level} side ${side}`).toMatch(DIR[level][side]);
      }
    }
  });

  it('the goal line is among the drawn texts in the first frame of every round', () => {
    for (const level of LEVELS) {
      const c = R();
      h.start(level, 5);
      const g = playTo(level, 0);
      expect(frame(c)).toContain(goal(g[0]));
      for (let k = 1; k < 3; k++) {
        h.start(level, 5);
        playTo(level, k);
        expect(frame(c), `level ${level} round ${k + 1}`).toContain(goal(g[k]));
      }
    }
  });

  it('dragging: the ring handle sets 9, and the camera sets 90 and wraps from 356 degrees to 0', () => {
    h.start(1, 5);
    h.pointer('pointerdown', ATOM.x + ringPx(6), ATOM.y);
    h.pointer('pointermove', ATOM.x + ringPx(9), ATOM.y);
    expect(Number(h.sliders()[0].value)).toBe(9);
    const r2 = build(2, 5)[0];
    if (r2.kind !== 'trap') throw new Error('trap');
    h.start(2, 5);
    const [gx, gy] = onRing(400, 190, trapPx(r2.n), 0);
    h.pointer('pointerdown', gx, gy);
    const [mx, my] = onRing(400, 190, trapPx(r2.n), 90);
    h.pointer('pointermove', mx, my);
    expect(Number(h.sliders()[0].value)).toBe(90);
    const [wx, wy] = onRing(400, 190, trapPx(r2.n), 356);
    h.pointer('pointermove', wx, wy);
    expect(Number(h.sliders()[0].value)).toBe(0);
  });

  it('the first grip carries a drag cue until the dial leaves its start (round 1 only)', () => {
    for (const level of LEVELS) {
      const c = R();
      h.start(level, 5);
      expect(frame(c).some((s) => /^drag [⇔↻]$/.test(s)), `level ${level}`).toBe(true);
      h.setSlider(answer(build(level, 5)[0]));
      expect(frame(c).some((s) => /^drag /.test(s))).toBe(false);
    }
  });
});

describe('Snap the Electron never leaks the answer', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the helper is live in round 1, on for 1.5 s after a test flash in round 2, and never in round 3`, () => {
      const c = R();
      h.start(level, 5);
      expect(helperDrawn(level, frame(c))).toBe(true);
      expect(canvas().dataset.helper).toBe('on');
      playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(helperDrawn(level, frame(c, 0.3))).toBe(false);
      expect(canvas().dataset.helper).toBe('off');
      h.click(TEST);
      expect(helperDrawn(level, frame(c, 0.3))).toBe(true);
      expect(canvas().dataset.helper).toBe('on');
      expect(helperDrawn(level, frame(c, 1.6))).toBe(false);
      expect(canvas().dataset.helper).toBe('off');
      h.start(level, 5);
      playTo(level, 2);
      expect(helperDrawn(level, frame(c, 0.3))).toBe(false);
      h.click(TEST);
      expect(helperDrawn(level, frame(c, 0.3))).toBe(false);
      expect(canvas().dataset.helper).toBe('off');
    });

    it(`level ${level}: the helper is off during a miss in every round (round 1 included) and on after a win is revealed`, () => {
      const c = R();
      for (let k = 0; k < 3; k++) {
        h.start(level, 5);
        const g = playTo(level, k);
        h.setSlider(wrong(g[k]));
        h.click(FIRE(level));
        expect(helperDrawn(level, frame(c, 2.0)), `round ${k + 1} miss`).toBe(false);
        expect(canvas().dataset.helper).toBe('off');
        h.start(level, 5);
        playTo(level, k);
        h.setSlider(answer(g[k]));
        h.click(FIRE(level));
        expect(helperDrawn(level, frame(c, 1.2)), `round ${k + 1} win`).toBe(true);
        expect(canvas().dataset.helper).toBe('on');
      }
    });

    it(`level ${level}: no drawn text holds the answer unless it is the player's own setting (every setting, every round)`, () => {
      const c = R();
      for (let k = 0; k < 3; k++) {
        h.start(level, 5);
        const g = playTo(level, k);
        const a = answer(g[k]);
        for (const v of sweep(level)) {
          if (v === a) continue;
          h.setSlider(v);
          expect(frame(c).some((s) => has(s, token(g[k]))), `round ${k + 1} at ${v}`).toBe(false);
        }
      }
    });

    it(`level ${level}: two wrong settings on one side end on the same drawn texts, and the miss burst lands on one fixed point`, () => {
      const c = R();
      for (let k = 0; k < 3; k++) {
        const g = build(level, 5);
        const a = answer(g[k]);
        const [lo, hi] = dialRange(level);
        const sides = (['above', 'below'] as const).filter((side) => sameSide(level, a, side).every((v) => v >= lo && v <= hi));
        expect(sides.length).toBeGreaterThan(0);
        for (const side of sides) {
          const runs: { texts: string[]; burst: { x: number; y: number } | undefined }[] = [];
          for (const v of sameSide(level, a, side)) {
            h.start(level, 5);
            playTo(level, k);
            h.setSlider(v);
            h.click(FIRE(level));
            const d = DELAY[g[k].kind] + 0.1;
            h.advance(d);
            c.clear();
            h.advance(0.05);
            const burst = c.rec.at.find((x) => x.s === '−1 ♥');
            const t2 = frame(c, 2.0 - d - 0.05);
            runs.push({ texts: t2.filter((s) => !s.includes(ownToken(g[k], v))).sort(), burst });
          }
          expect(runs[0].texts, `level ${level} round ${k + 1} ${side}`).toEqual(runs[1].texts);
          expect(runs[0].burst).toBeDefined();
          expect(runs[0].burst).toEqual(runs[1].burst);
          // not where the answer is on screen
          const at = runs[0].burst!;
          const spots: [number, number][] = level === 1 ? [onRing(ATOM.x, ATOM.y, ringPx(a), 315)] : level === 4 ? [[196 + (a / 90) * 420, 312]] : [onRing(400, 190, trapPx(3), a), onRing(500, 190, 100, a)];
          for (const [sx, sy] of spots) expect(Math.hypot(at.x - sx, at.y - sy)).toBeGreaterThan(20);
        }
      }
    });

    it(`level ${level}: the screen agrees with the rules (the outcome drawn is the outcome judged)`, () => {
      const c = R();
      const r = build(level, 5)[0];
      let vals: number[];
      if (level === 1) vals = sweep(1);
      else if (level === 4) vals = [0, answer(r) - 1, answer(r), answer(r) + 1, 90];
      else vals = sweep(level);
      for (const v of vals) {
        h.start(level, 5);
        h.setSlider(v);
        h.click(FIRE(level));
        frame(c, 1.2);
        const x: Values = r.kind === 'ring' ? { k: v } : r.kind === 'zoom' ? { z: v } : { deg: v };
        expect(canvas().dataset.out, `level ${level} at ${v}`).toBe(outcome(r, x));
      }
    });

    it(`level ${level}: the verdict lands at ${level === 1 ? '0.45' : level === 2 ? '1.0' : '1.1'} s, not before, and the phase leaves resolve by 2.5 s`, () => {
      h.start(level, 5);
      const r = build(level, 5)[0];
      h.setSlider(wrong(r));
      h.click(FIRE(level));
      h.advance(DELAY[r.kind] - 0.1);
      expect(h.hearts()).toBe(3);
      h.advance(0.2);
      expect(h.hearts()).toBe(2);
      h.advance(2.3);
      expect(h.phase()).toBe('play');
    });
  }
});
