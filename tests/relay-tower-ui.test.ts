// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { piText } from '../src/core/mathkit';
import game from '../src/games/mathematics/class-12/ch02-inverse-trigonometric-functions/relay-tower/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch02-inverse-trigonometric-functions/relay-tower/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'relay-tower', 3);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === 12 ? 11 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Send the signal'),
});

describe('Relay Tower', () => {
  it('the dial shows the angle in π and degrees, and the expression is in the note', () => {
    h.start(1, 5);
    h.setSlider(3);
    expect(h.$('.v-readout')?.textContent).toMatch(/π\/4 \(45°\)/);
    expect(h.note()).toMatch(/Point the dish at the value of/);
  });
  it('a dish outside the range of the expression is refused with the range, and a miss inside it names a direction', () => {
    h.start(1, 5);
    const g = build(1, 5);
    const r = g[0];
    const out = r.range[1] < 12 ? r.range[1] + 3 : r.range[0] - 3;
    h.setSlider(Math.max(-12, Math.min(12, out)));
    h.click('Send the signal');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/can only lie/);
    const inside = r.ans === r.range[1] ? r.ans - 1 : r.ans + 1;
    h.setSlider(inside);
    h.click('Send the signal');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/clockwise/);
  });
  it('a win shows the working, and a check costs a charge', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(g[0].ans);
    h.click('Send the signal');
    h.advance(3.4);
    expect(h.feedback()).toMatch(/tan|sin/);
    h.advance(1);
    h.click('Check the dish against the range of the outer function');
    expect(h.feedback()).toMatch(/Check/);
    h.click('Check the dish against the range of the outer function');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('dragging the handle around the dish sets the angle', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 400 + 92, 180);
    h.pointer('pointermove', 400 + 92 * Math.cos(Math.PI / 3), 180 - 92 * Math.sin(Math.PI / 3));
    expect(Number(h.sliders()[0].value)).toBe(4);
  });
});

// A canvas recorder: every string drawn (with its position) and every arc (centre and radius).
const SEND = 'Send the signal';
const CHECK = 'Check the dish against the range of the outer function';
const ARC_R = 92 + 5;
const recorder = () => {
  const rec = { at: [] as { s: string; x: number; y: number }[], arcs: [] as number[] };
  const store: Record<string, unknown> = {};
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'fillText') return (s: string, x: number, y: number) => rec.at.push({ s: String(s), x, y });
      if (p === 'arc') return (_x: number, _y: number, r: number) => rec.arcs.push(r);
      return () => undefined;
    },
    set: (_t, p, v) => {
      store[String(p)] = v;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  return { rec, clear: () => ((rec.at.length = 0), (rec.arcs.length = 0)) };
};
type R = ReturnType<typeof recorder>;
const frame = (R: R, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
/** The principal-range arc: the only arc with this radius. */
const arcDrawn = (rec: R['rec']) => rec.arcs.some((r) => r === ARC_R);
const satelliteDrawn = (rec: R['rec']) => rec.at.some((a) => a.s === 'satellite');
const canvas = () => h.$('canvas')!;
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    h.setSlider(g[k].ans);
    h.click(SEND);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
/** The miss text with the player's own setting taken out. */
const without = (s: string, k: number) => s.split(piText(k)).join('#');

describe('Relay Tower never leaks the answer', () => {
  for (const level of [1, 2, 3]) {
    it(`level ${level}: the range arc is live in round 1, shows for 1.5 s after a check in round 2, and never in round 3, not even after Fire`, () => {
      const R = recorder();
      h.start(level, 5);
      expect(arcDrawn(frame(R))).toBe(true);
      expect(canvas().dataset.arc).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(arcDrawn(frame(R, 0.3))).toBe(false);
      expect(canvas().dataset.arc).toBe('0');
      for (const k of [-12, 0, g[1].ans, 12]) {
        h.setSlider(k);
        expect(arcDrawn(frame(R))).toBe(false);
      }
      h.click(CHECK);
      expect(arcDrawn(frame(R, 0.3))).toBe(true);
      expect(arcDrawn(frame(R, 1.0))).toBe(true);
      expect(arcDrawn(frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.arc).toBe('0');
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(arcDrawn(frame(R, 0.5))).toBe(false);
      // a miss in round 2 does not show the arc or the satellite either
      h.setSlider(g[1].ans === 12 ? 11 : g[1].ans + 1);
      h.click(SEND);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) {
        const rec = frame(R, dt);
        expect(arcDrawn(rec)).toBe(false);
        expect(satelliteDrawn(rec)).toBe(false);
      }
      h.advance(1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      h.setSlider(g[1].ans);
      h.click(SEND);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      // round 3: never, at any setting; a check is refused; a miss shows neither the arc nor the satellite
      for (const k of [-12, -5, 0, g[2].ans, 12]) {
        h.setSlider(k);
        expect(arcDrawn(frame(R))).toBe(false);
      }
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(arcDrawn(frame(R, 0.5))).toBe(false);
      h.setSlider(g[2].ans === 12 ? 11 : g[2].ans + 1);
      h.click(SEND);
      for (const dt of [0.3, 0.6, 0.6, 0.6]) {
        const rec = frame(R, dt);
        expect(arcDrawn(rec)).toBe(false);
        expect(satelliteDrawn(rec)).toBe(false);
      }
      expect(canvas().dataset.arc).toBe('0');
      expect(canvas().dataset.satellite).toBe('0');
    });
  }

  it('a win draws the satellite and the arc; a miss never draws the satellite, at any wrong setting in any level', () => {
    for (const level of [1, 2, 3]) {
      const R = recorder();
      h.start(level, 11);
      const r = build(level, 11)[0];
      h.setSlider(r.ans);
      h.click(SEND);
      let sat = false;
      for (let i = 0; i < 12; i++) sat = satelliteDrawn(frame(R, 0.2)) || sat;
      expect(sat).toBe(true);
      for (const k of [-12, -6, -1, 1, 5, 12]) {
        if (k === r.ans) continue;
        h.start(level, 11);
        h.setSlider(k);
        h.click(SEND);
        for (let i = 0; i < 12; i++) expect(satelliteDrawn(frame(R, 0.2))).toBe(false);
      }
    }
  });

  it('two wrong settings on the same side give the same miss text (apart from the setting itself), and the −1 float lands at one fixed point', () => {
    for (const level of [1, 2, 3]) {
      for (const round of [1, 2]) {
        const g = build(level, 11);
        const r = g[round];
        const lows = [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((k) => k < r.ans);
        const highs = [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((k) => k > r.ans);
        for (const side of [lows, highs]) {
          if (side.length < 2) continue;
          const texts: string[] = [];
          const xs = new Set<number>();
          for (const k of [side[0], side[side.length - 1]]) {
            const R = recorder();
            h.start(level, 11);
            playTo(level, round, 11);
            h.setSlider(k);
            h.click(SEND);
            R.clear();
            h.advance(2.8);
            texts.push(without(h.feedback(), k));
            R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
          }
          expect(texts[0]).toBe(texts[1]);
          expect([...xs]).toEqual([400]);
        }
      }
    }
  });

  it('the start (a dish at 0) never wins, and neither does any single fixed setting across rounds and seeds', () => {
    for (const level of [1, 2, 3]) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        h.start(level, seed);
        h.click(SEND);
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
      for (const k of [-12, -6, -3, 3, 6, 12]) {
        let wins = 0;
        for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) wins += build(level, seed).filter((r) => r.ans === k).length;
        expect(wins).toBeLessThan(8 * 3 * 0.6);
      }
    }
  });
});
