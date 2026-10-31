// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch13-probability/pachinko-bayes/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch13-probability/pachinko-bayes/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'pachinko-bayes', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));

function set(r: Round, wrong: boolean) {
  r.ans.forEach((a, i) => h.setSlider(wrong && i === 0 ? (a === r.max ? a - 1 : a + 1) : a, i));
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], false),
  setWrong: (g, k) => set(g[k], true),
  commit: () => h.click('Drop the balls'),
});

describe('Pachinko Bayes', () => {
  it('level 1 has one count, levels 2 and 3 two; all start at 0 and the balls are in the note', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      expect(h.sliders()).toHaveLength(level === 1 ? 1 : 2);
      expect(h.sliders().every((s) => Number(s.value) === 0)).toBe(true);
      expect(h.note()).toMatch(/balls drop/);
    }
  });
  it('a miss says which count was off; a check costs a charge; a win shows the fraction', () => {
    h.start(2, 5);
    const g = build(2, 5);
    set(g[0], true);
    h.click('Drop the balls');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/was right|matched|different|landed/);
    h.click('Check: see what these counts mean as a chance');
    expect(h.feedback()).toMatch(/Check/);
    h.click('Check: see what these counts mean as a chance');
    expect(h.feedback()).toMatch(/No charges left/);
    set(g[0], false);
    h.click('Drop the balls');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/P\(gate/);
  });
});

// A canvas recorder: every string drawn (with its position).
const recorder = () => {
  const rec = { at: [] as { s: string; x: number; y: number }[] };
  const store: Record<string, unknown> = {};
  const proxy = new Proxy(store, {
    get: (_t, p) => (p === 'fillText' ? (s: string, x: number, y: number) => rec.at.push({ s: String(s), x, y }) : () => undefined),
    set: (_t, p, v) => {
      store[String(p)] = v;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  return { rec, clear: () => (rec.at.length = 0) };
};
const frame = (R: ReturnType<typeof recorder>, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec.at.map((a) => a.s);
};
/** The per-gate counts text, for example "20 balls, 10 red". */
const countsDrawn = (texts: string[]) => texts.some((s) => /^\d+ balls, \d+ red$/.test(s));
const CHECK = 'Check: see what these counts mean as a chance';
const DROP = 'Drop the balls';
const canvas = () => h.$('canvas')!;
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    set(g[k], false);
    h.click(DROP);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

describe('Pachinko Bayes never leaks the answer', () => {
  for (const level of [1, 2, 3]) {
    it(`level ${level}: the per-gate counts are live in round 1, show for 1.5 s after a check in round 2, and never in round 3`, () => {
      const R = recorder();
      h.start(level, 5);
      expect(countsDrawn(frame(R))).toBe(true);
      expect(canvas().dataset.counts).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(countsDrawn(frame(R, 0.3))).toBe(false);
      expect(canvas().dataset.counts).toBe('0');
      // moving the dials never shows them
      for (const a of [0, 20, g[1].ans[0]]) {
        h.setSlider(a);
        expect(countsDrawn(frame(R))).toBe(false);
      }
      h.click(CHECK);
      expect(countsDrawn(frame(R, 0.3))).toBe(true);
      expect(countsDrawn(frame(R, 1.0))).toBe(true);
      expect(countsDrawn(frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.counts).toBe('0');
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(countsDrawn(frame(R, 0.5))).toBe(false);
      // round 3: never, even at the winning setting; a check is refused
      set(g[1], false);
      h.click(DROP);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      set(g[2], false);
      expect(countsDrawn(frame(R))).toBe(false);
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(countsDrawn(frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.counts).toBe('0');
    });
  }

  it('two wrong settings give the same miss text and the same generic drop: fixed counts, no tallies, no red-so-far line', () => {
    for (const level of [1, 2, 3]) {
      const g = build(level, 11);
      const r = g[0];
      const wrongs: number[][] = level === 1 ? [[r.ans[0] - 1], [Math.max(0, r.ans[0] - 3)]] : [[0, 0], [1, 2]];
      const ends: string[] = [];
      for (const w of wrongs) {
        const R = recorder();
        h.start(level, 11);
        w.forEach((a, i) => h.setSlider(a, i));
        h.click(DROP);
        R.clear();
        h.advance(1.9);
        expect(canvas().dataset.drop).toBe('generic');
        const drawn = R.rec.at.map((a) => a.s);
        expect(drawn.some((s) => /red so far/.test(s))).toBe(false);
        // no tally under any tray: the only numbers drawn are the player's own count line, the track scale and the fixed texts
        expect(drawn.filter((s) => /^\d+$/.test(s)).every((s) => s === '0' || s === '60')).toBe(true);
        const balls = `${canvas().dataset.dropBalls}|${canvas().dataset.dropRed}`;
        h.advance(0.9);
        ends.push(`${balls}|${h.feedback()}`);
      }
      expect(ends[0]).toBe(ends[1]);
      expect(ends[0]).toMatch(/^60\|\d+\|/);
      // the generic red count is fixed: half of the sixty balls, the same in every round
      expect(ends[0].split('|')[1]).toBe('30');
    }
  });

  it('only a win plays the real counts and prints the tallies', () => {
    for (const level of [1, 2, 3]) {
      const R = recorder();
      h.start(level, 11);
      const r = build(level, 11)[0];
      set(r, false);
      h.click(DROP);
      R.clear();
      h.advance(2.0);
      expect(canvas().dataset.drop).toBe('true');
      expect(R.rec.at.some((a) => /red so far/.test(a.s))).toBe(true);
      const total = r.gates.reduce((s, gt) => s + gt.red, 0);
      expect(canvas().dataset.dropRed).toBe(String(total));
    }
  });

  it('the miss burst and the −1 float land at the same fixed point whichever counts were wrong, and never at a count the player could read', () => {
    const xs = new Set<number>();
    const ys = new Set<number>();
    for (const level of [1, 2, 3]) {
      for (const bump of [1, 7]) {
        const R = recorder();
        h.start(level, 11);
        const r = build(level, 11)[0];
        r.ans.forEach((a, i) => h.setSlider(i === 0 ? (a + bump > r.max ? a - bump : a + bump) : a, i));
        h.click(DROP);
        R.clear();
        h.advance(2.8);
        const f = R.rec.at.filter((a) => a.s === '−1 ♥');
        expect(f.length).toBeGreaterThan(0);
        f.forEach((a) => (xs.add(a.x), ys.add(a.y)));
      }
    }
    expect([...xs]).toEqual([320]);
    expect(ys.size).toBeGreaterThan(0);
  });

  it('the start setting never wins, in any level or seed', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        h.start(level, seed);
        h.click(DROP);
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
    }
  });
});
