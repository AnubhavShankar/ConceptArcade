// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/air-time/index';
import { buildRounds, fault, type Round } from '../src/games/mathematics/class-12/ch07-integrals/air-time/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'air-time', 4);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4, createRng(seed));
const wrong = (r: Round) => (r.q < r.hi ? r.q + 1 : r.q - 1);
const TEST = 'Test run: read the spin or the speed for this setting';

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => h.setSlider(g[k].q),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Launch the jump'),
});

describe('Air Time', () => {
  it('the slider follows the round’s range and starts at start (levels 1 to 4, seed 5)', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      const [s] = h.sliders();
      expect(h.sliders().length).toBe(1);
      expect(Number(s.min)).toBe(r.lo);
      expect(Number(s.max)).toBe(r.hi);
      expect(Number(s.value)).toBe(r.start);
      expect(Number(s.step)).toBe(1);
    }
  });
  it('a spin miss names the crash and a boost miss names the canyon or the billboard, and never the winning setting', () => {
    for (const level of [1, 3, 4]) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      h.setSlider(wrong(r));
      h.click('Launch the jump');
      h.advance(2.8);
      if (r.kind === 'spin') expect(h.feedback()).toMatch(/spun too far|had not spun far enough|upside down|over the handlebars/);
      else expect(h.feedback()).toMatch(/canyon|billboard/);
      const win = r.q < 0 ? `x = −${Math.abs(r.q)} m` : `x = ${r.q} m`;
      expect(h.feedback()).not.toContain(win);
      expect(h.hearts()).toBe(2);
    }
  });
  it('the test run costs a charge in level 1 and says Practice jump, then No charges left; level 3 says Dyno test', () => {
    h.start(1, 5);
    h.click(TEST);
    expect(h.feedback()).toMatch(/Practice jump/);
    h.click(TEST);
    expect(h.feedback()).toMatch(/No charges left/);
    h.start(3, 5);
    h.click(TEST);
    expect(h.feedback()).toMatch(/Dyno test/);
  });
  it('the test run reads the player’s own setting, not the answer', () => {
    h.start(1, 5);
    const r = build(1, 5)[0];
    h.setSlider(wrong(r));
    h.click(TEST);
    expect(h.feedback()).toContain(`x = ${wrong(r)} m`);
    expect(h.feedback()).not.toContain('360°');
  });
  it('round 3 has no charge and no test run', () => {
    h.start(2, 5);
    const g = build(2, 5);
    for (let k = 0; k < 2; k++) {
      h.setSlider(g[k].q);
      h.click('Launch the jump');
      h.advance(2.8);
      h.advance(1);
    }
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    h.click(TEST);
    expect(h.feedback()).toMatch(/No charges left/);
    expect(h.note()).toMatch(/Boss round: no gauge, no test run/);
  });
  it('the hint line fades round by round', () => {
    h.start(1, 5);
    const g = build(1, 5);
    expect(h.note()).toMatch(/gauge shows your setting live/);
    h.setSlider(g[0].q);
    h.click('Launch the jump');
    h.advance(3.8);
    expect(h.note()).toMatch(/test run costs a charge/);
  });
  it('the verdict of a spin lands at 1.35 s and of a boost at 1.55 s, not before', () => {
    h.start(1, 5);
    h.setSlider(wrong(build(1, 5)[0]));
    h.click('Launch the jump');
    h.advance(1.0);
    expect(h.hearts()).toBe(3);
    h.advance(0.5);
    expect(h.hearts()).toBe(2);
    h.start(3, 5);
    h.setSlider(wrong(build(3, 5)[0]));
    h.click('Launch the jump');
    h.advance(1.4);
    expect(h.hearts()).toBe(3);
    h.advance(0.3);
    expect(h.hearts()).toBe(2);
  });
  it('a level 4 win in round 3 says Big air!', () => {
    h.start(4, 5);
    const g = build(4, 5);
    for (let k = 0; k < 3; k++) {
      h.setSlider(g[k].q);
      h.click('Launch the jump');
      h.advance(2.8);
      if (k < 2) h.advance(1);
    }
    expect(h.feedback()).toMatch(/^Big air!/);
  });
  it('a clean spin landing says Clean landing!', () => {
    h.start(2, 5);
    h.setSlider(build(2, 5)[0].q);
    h.click('Launch the jump');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/^Clean landing!/);
  });
  it('every setting of every round animates through a launch, with and without a test run, with no console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      const r = build(level, 11)[0];
      for (let x = r.lo; x <= r.hi; x += x === r.lo ? 1 : 2) {
        h.start(level, 11);
        h.click(TEST);
        h.advance(0.3);
        h.setSlider(x);
        h.click('Launch the jump');
        h.advance(3);
        const f = fault(r, x);
        expect(f === null ? h.hearts() === 3 : h.hearts() === 2).toBe(true);
      }
    }
    expect(err).not.toHaveBeenCalled();
  });
  // Never leak the answer: record every string the scene writes on the canvas and look for the gauge and the speedometer.
  const frameTexts = (rec: string[]) => {
    rec.length = 0;
    h.advance(0.05);
    return [...rec];
  };
  const recorder = () => {
    const rec: string[] = [];
    const proxy = new Proxy({}, { get: (_t, p) => (p === 'fillText' ? (s: string) => rec.push(String(s)) : () => undefined), set: () => true });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
    return rec;
  };
  const gauge = (texts: string[], kind: 'spin' | 'boost') => texts.some((s) => (kind === 'spin' ? /^-?\d+°$/.test(s) || s === 'SPIN' : /^\d+ km\/h$/.test(s)));
  const playTo = (level: number, round: number) => {
    const g = build(level, 5);
    for (let k = 0; k < round; k++) {
      h.setSlider(g[k].q);
      h.click('Launch the jump');
      h.advance(2.8);
      h.advance(1);
    }
    return g;
  };
  for (const [level, kind] of [[1, 'spin'], [3, 'boost']] as const) {
    it(`${kind}: the gauge is live in round 1, flashes 1.8 s after a test run in round 2, and never shows in round 3`, () => {
      const rec = recorder();
      h.start(level, 5);
      expect(gauge(frameTexts(rec), kind)).toBe(true);
      // round 2: nothing before the test, the reading for 1.8 s after it, nothing again after
      playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      h.advance(0.3);
      expect(gauge(frameTexts(rec), kind)).toBe(false);
      h.setSlider(build(level, 5)[1].q + (build(level, 5)[1].q < build(level, 5)[1].hi ? 1 : -1));
      h.advance(0.5);
      expect(gauge(frameTexts(rec), kind)).toBe(false);
      h.click(TEST);
      h.advance(0.3);
      expect(gauge(frameTexts(rec), kind)).toBe(true);
      h.advance(1.2);
      expect(gauge(frameTexts(rec), kind)).toBe(true);
      h.advance(0.5);
      expect(gauge(frameTexts(rec), kind)).toBe(false);
      // round 3: never, with the ramp or cone anywhere
      h.setSlider(build(level, 5)[1].q);
      h.click('Launch the jump');
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      const r3 = build(level, 5)[2];
      for (let x = r3.lo; x <= r3.hi; x++) {
        h.setSlider(x);
        expect(gauge(frameTexts(rec), kind)).toBe(false);
      }
      h.click(TEST);
      h.advance(0.5);
      expect(gauge(frameTexts(rec), kind)).toBe(false);
    });
  }
  it('the scene never writes the winning setting as a word in rounds 2 and 3 (only the metre marks and the course sign)', () => {
    const rec = recorder();
    h.start(2, 5);
    playTo(2, 1);
    const texts = frameTexts(rec);
    expect(texts.some((s) => /°/.test(s))).toBe(false);
    expect(texts.every((s) => !/^(clean|perfect)/i.test(s))).toBe(true);
  });
  it('the fault kinds that exist across the pools are under, over, way under, way over, short and long', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const seen = new Set<string>();
    for (const level of [1, 2, 3, 4]) {
      for (let seed = 0; seed < 12; seed++) {
        const g = build(level, seed * 31 + 3);
        for (const r of g) {
          for (let x = r.lo; x <= r.hi; x++) {
            const f = fault(r, x);
            if (f) seen.add(f);
          }
        }
      }
    }
    expect([...seen].sort()).toEqual(['long', 'over', 'short', 'under', 'wayOver', 'wayUnder']);
    expect(err).not.toHaveBeenCalled();
  });
});
