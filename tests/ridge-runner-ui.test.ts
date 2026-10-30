// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch06-application-of-derivatives/ridge-runner/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch06-application-of-derivatives/ridge-runner/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'ridge-runner', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.hi ? r.ans - 1 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Plant the flag'),
});

describe('Ridge Runner', () => {
  it('the dial follows each round’s stretch and starts away from the answer', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].lo, g[0].hi, g[0].start]);
      expect(Number(s.value)).not.toBe(g[0].ans);
    }
  });
  it('level 2: planting on the flat spot says the ground only flattens', () => {
    h.start(2, 5);
    const g = build(2, 5);
    const flat = g[0].crit.find((c) => c !== g[0].ans)!;
    h.setSlider(flat);
    h.click('Plant the flag');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/flattens for a moment/);
  });
  it('a miss never gives the position, a survey costs a charge and a win shows f′', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(wrong(g[0]));
    h.click('Plant the flag');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/ground is (still|level)/);
    expect(h.feedback()).not.toMatch(/\d/);
    h.setSlider(g[0].ans);
    h.click('Plant the flag');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/f′\(x\) = 0 at x/);
    h.advance(1);
    h.click('Survey: read the height and slope at the flag');
    expect(h.feedback()).toMatch(/Survey at x/);
    h.click('Survey: read the height and slope at the flag');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 3 mentions the end points in the working', () => {
    h.start(3, 5);
    const g = build(3, 5);
    h.setSlider(g[0].ans);
    h.click('Plant the flag');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/end points/);
  });
});

// A canvas recorder: every string drawn (with its position) and every stroke (colour and number of line segments).
const CYAN = '#4de1ff';
const YELLOW = '#ffd23f';
const FLAG = 'Plant the flag';
const SURVEY = 'Survey: read the height and slope at the flag';
const recorder = () => {
  const rec = { at: [] as { s: string; x: number; y: number }[], strokes: [] as { style: string; n: number }[] };
  const store: Record<string, unknown> = {};
  let n = 0;
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'fillText') return (s: string, x: number, y: number) => rec.at.push({ s: String(s), x, y });
      if (p === 'beginPath') return () => (n = 0);
      if (p === 'lineTo') return () => n++;
      if (p === 'stroke') return () => rec.strokes.push({ style: String(store.strokeStyle), n });
      return () => undefined;
    },
    set: (_t, p, v) => {
      store[String(p)] = v;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  return { rec, clear: () => ((rec.at.length = 0), (rec.strokes.length = 0)) };
};
type R = ReturnType<typeof recorder>;
const frame = (R: R, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
/** The ground curve is the long cyan polyline; the tangent is a single yellow segment. */
const curveDrawn = (rec: R['rec']) => rec.strokes.some((s) => s.style === CYAN && s.n >= 100);
const tangentDrawn = (rec: R['rec']) => rec.strokes.some((s) => s.style === YELLOW && s.n === 1);
const canvas = () => h.$('canvas')!;
const other = (r: Round, k = 0) => {
  const xs = Array.from({ length: r.hi - r.lo + 1 }, (_, i) => r.lo + i).filter((x) => x !== r.ans);
  return xs[Math.min(k, xs.length - 1)];
};
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    h.setSlider(g[k].ans);
    h.click(FLAG);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

describe('Ridge Runner never leaks the answer', () => {
  for (const level of [1, 2, 3]) {
    it(`level ${level}: the ground and tangent are live in round 1, show for 1.5 s after a survey in round 2, and never in round 3, not even after Fire`, () => {
      const R = recorder();
      h.start(level, 5);
      let rec = frame(R);
      expect(curveDrawn(rec)).toBe(true);
      expect(tangentDrawn(rec)).toBe(true);
      expect(canvas().dataset.curve).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      rec = frame(R, 0.3);
      expect(curveDrawn(rec) || tangentDrawn(rec)).toBe(false);
      expect(canvas().dataset.curve).toBe('0');
      for (const x of [g[1].lo, g[1].ans, g[1].hi]) {
        h.setSlider(x);
        rec = frame(R);
        expect(curveDrawn(rec) || tangentDrawn(rec)).toBe(false);
      }
      h.click(SURVEY);
      rec = frame(R, 0.3);
      expect(curveDrawn(rec) && tangentDrawn(rec)).toBe(true);
      rec = frame(R, 1.0);
      expect(curveDrawn(rec) && tangentDrawn(rec)).toBe(true);
      rec = frame(R, 0.5);
      expect(curveDrawn(rec) || tangentDrawn(rec)).toBe(false);
      expect(canvas().dataset.curve).toBe('0');
      h.click(SURVEY);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(curveDrawn(frame(R, 0.5))).toBe(false);
      // a miss in round 2 does not show the ground either
      h.setSlider(other(g[1]));
      h.click(FLAG);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) {
        rec = frame(R, dt);
        expect(curveDrawn(rec) || tangentDrawn(rec)).toBe(false);
      }
      h.advance(1);
      h.setSlider(g[1].ans);
      h.click(FLAG);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      // round 3: never, at any setting; a survey is refused; a miss shows no ground
      for (const x of [g[2].lo, g[2].ans, g[2].hi]) {
        h.setSlider(x);
        rec = frame(R);
        expect(curveDrawn(rec) || tangentDrawn(rec)).toBe(false);
      }
      h.click(SURVEY);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(curveDrawn(frame(R, 0.5))).toBe(false);
      h.setSlider(other(g[2]));
      h.click(FLAG);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) {
        rec = frame(R, dt);
        expect(curveDrawn(rec) || tangentDrawn(rec)).toBe(false);
      }
      expect(canvas().dataset.curve).toBe('0');
    });
  }

  it('a win draws the ground (the working in a picture); a miss draws it only in round 1, where it is the live helper', () => {
    for (const level of [1, 2, 3]) {
      const R = recorder();
      h.start(level, 11);
      const r = build(level, 11)[0];
      h.setSlider(r.ans);
      h.click(FLAG);
      let curve = false;
      for (let i = 0; i < 10; i++) curve = curveDrawn(frame(R, 0.2)) || curve;
      expect(curve).toBe(true);
      h.start(level, 11);
      const g = playTo(level, 1, 11);
      h.setSlider(other(g[1]));
      h.click(FLAG);
      for (let i = 0; i < 10; i++) expect(curveDrawn(frame(R, 0.2))).toBe(false);
    }
  });

  it('two wrong settings give the same miss text apart from the flag’s own position, and the −1 float lands at one fixed point', () => {
    for (const level of [1, 2, 3]) {
      for (const round of [1, 2]) {
        const r = build(level, 11)[round];
        const wrong = Array.from({ length: r.hi - r.lo + 1 }, (_, i) => r.lo + i).filter((x) => x !== r.ans);
        // two settings on the same side of the walk that are both clear misses
        const same = (x: number) => (r.kind === 'camp' ? 'c' : r.fp(x) === 0 ? 'z' : String(Math.sign(r.fp(x))));
        const pair = wrong.flatMap((a) => wrong.filter((b) => b > a && same(a) === same(b)).map((b) => [a, b]))[0];
        if (!pair) continue;
        const texts: string[] = [];
        const xs = new Set<number>();
        for (const x of pair) {
          const R = recorder();
          h.start(level, 11);
          playTo(level, round, 11);
          h.setSlider(x);
          h.click(FLAG);
          R.clear();
          h.advance(2.8);
          texts.push(h.feedback().replace(`camped at ${x}`, 'camped at #'));
          R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
        }
        expect(texts[0]).toBe(texts[1]);
        expect([...xs]).toEqual([320]);
      }
    }
  });

  it('the start never wins in any level, round 1 or seed', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        h.start(level, seed);
        h.click(FLAG);
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
    }
  });
});
