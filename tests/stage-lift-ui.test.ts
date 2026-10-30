// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch03-matrices/stage-lift/index';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch03-matrices/stage-lift/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'stage-lift', 5);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const setAll = (r: Round, bump = 0) => r.keys.forEach((key, i) => h.setSlider(r.ans[key] + (i === 0 ? bump : 0), i));

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build,
  setRight: (g, k) => setAll(g[k]),
  setWrong: (g, k) => setAll(g[k], g[k].ans[g[k].keys[0]] < 9 ? 1 : -1),
  commit: () => h.click('Start the show'),
});

describe('Stage Lift', () => {
  it('has 4, 6, 8 and 4 faders for levels 1 to 4, all at 0 when a round starts', () => {
    const want: Record<number, number> = { 1: 4, 2: 6, 3: 8, 4: 4 };
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      const s = h.sliders();
      expect(s.length).toBe(want[level]);
      expect(s.every((el) => Number(el.value) === 0 && Number(el.min) === -9 && Number(el.max) === 9)).toBe(true);
    }
  });
  it('a miss in level 1 says too high or too low and costs a heart', () => {
    h.start(1, 5);
    const g = build(1, 5);
    setAll(g[0], g[0].ans[g[0].keys[0]] < 9 ? 1 : -1);
    h.click('Start the show');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too high|too low/);
    expect(h.hearts()).toBe(2);
  });
  it('the test lift costs a charge and only gives directions', () => {
    h.start(1, 5);
    h.click('Test lift: raise the pillars for a moment to the heights you set');
    expect(h.feedback()).toMatch(/^Test lift/);
    h.click('Test lift: raise the pillars for a moment to the heights you set');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('a level 3 win mentions X = and Y = in the working', () => {
    h.start(3, 5);
    const g = build(3, 5);
    setAll(g[0]);
    h.click('Start the show');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/X =/);
    expect(h.feedback()).toMatch(/Y =/);
  });
  it('the verdict of a miss lands when the runner fails, not before', () => {
    h.start(2, 5);
    const g = build(2, 5);
    // wrong fader 0 (entry 1,1): the first pillar on the path, so the hearts change early in the show
    setAll(g[0], g[0].ans[g[0].keys[0]] < 9 ? 1 : -1);
    h.click('Start the show');
    h.advance(0.3);
    expect(h.hearts()).toBe(3);
    h.advance(0.5);
    expect(h.hearts()).toBe(2);
  });
  it('every kind of failure (each fader a step off, both directions) animates without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      const g = build(level, 11);
      const r = g[0];
      for (let i = 0; i < r.keys.length; i++) {
        for (const bump of [1, -1]) {
          h.start(level, 11);
          h.click('Test lift: raise the pillars for a moment to the heights you set');
          h.advance(0.5);
          r.keys.forEach((key, q) => h.setSlider(r.ans[key] + (q === i ? bump : 0), q));
          h.click('Start the show');
          h.advance(3);
        }
      }
    }
    expect(err).not.toHaveBeenCalled();
  });
  describe('level 5, rule cards', () => {
    const LIFT = 'Test lift: raise the pillars for a moment to the heights you set';
    /** Record every fillText of the canvas from now on. */
    const recorder = () => {
      const rec: string[] = [];
      const proxy = new Proxy({}, { get: (_t, p) => (p === 'fillText' ? (s: string) => rec.push(String(s)) : () => undefined), set: () => true });
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
      return rec;
    };
    /** Texts that are only a number: the faders' own values. */
    const numeric = (texts: string[]) => texts.filter((s) => /^[−-]?\d+$/.test(s));
    const winRound = (g: Round[], k: number) => {
      setAll(g[k]);
      h.click('Start the show');
      h.advance(2.8);
      h.advance(1);
    };

    it('has 6 faders, all at 0 when each round starts', () => {
      h.start(5, 5);
      const g = build(5, 5);
      for (let k = 0; k < 3; k++) {
        const s = h.sliders();
        expect(s.length).toBe(6);
        expect(s.every((el) => Number(el.value) === 0 && Number(el.min) === -9 && Number(el.max) === 9)).toBe(true);
        if (k < 2) winRound(g, k);
      }
    });
    it('the banner shows the rule and the faders, and before Showtime the canvas never writes a number of the card', () => {
      const rec = recorder();
      h.start(5, 5);
      const g = build(5, 5);
      for (let k = 0; k < 3; k++) {
        rec.length = 0;
        h.advance(0.1);
        const r = g[k];
        expect(rec).toContain(`card: cᵢⱼ = ${r.rule}`);
        expect(rec).toContain('i = 1, 2    j = 1, 2, 3');
        // faders at 0: the only bare number on screen is 0, and no text spells the card
        expect(new Set(numeric(rec))).toEqual(new Set(['0']));
        expect(rec.some((s) => s.includes(';') || /\[/.test(s))).toBe(false);
        if (k === 1) {
          // a test lift raises the pillars for a moment: still no numbers
          rec.length = 0;
          h.click(LIFT);
          h.advance(0.6);
          expect(new Set(numeric(rec))).toEqual(new Set(['0']));
        }
        if (k < 2) winRound(g, k);
      }
    });
    it('the faders show their own values (and only those) once moved, in rounds 2 and 3', () => {
      const rec = recorder();
      h.start(5, 5);
      const g = build(5, 5);
      winRound(g, 0);
      h.setSlider(2, 0);
      rec.length = 0;
      h.advance(0.1);
      expect(new Set(numeric(rec))).toEqual(new Set(['0', '2']));
    });
    it('a win shows the working c₁₁ = …; swapping i and j gives the "Check the rule" line on a miss', () => {
      h.start(5, 5);
      const g = build(5, 5);
      winRound(g, 0);
      winRound(g, 1);
      // round 3: i² − j², or (−1)^(i + j)·(i + j), or |2i − 3j| − 1 (see the pools); swap i and j for the four entries
      const r = g[2];
      const swap: Record<string, number> = { y11: r.card[0][0], y12: r.card[1][0], y21: r.card[0][1], y22: r.card[1][1] };
      r.keys.forEach((key, q) => h.setSlider(key in swap ? swap[key] : r.ans[key], q));
      h.click('Start the show');
      h.advance(2.8);
      const asymmetric = r.card[0][1] !== r.card[1][0];
      if (asymmetric) expect(h.feedback()).toMatch(/Check the rule: i counts rows and j counts columns\./);
      else expect(h.feedback()).toMatch(/Perfect run/);
      if (asymmetric) {
        setAll(r);
        h.click('Start the show');
        h.advance(2.8);
      }
      expect(h.feedback()).toMatch(/c₁₁ = /);
      expect(h.feedback()).toMatch(/c₂₃ = /);
    });
    it('every fader a step off, both ways, animates without a console error', () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const r = build(5, 11)[0];
      for (let i = 0; i < r.keys.length; i++) {
        for (const bump of [1, -1]) {
          h.start(5, 11);
          r.keys.forEach((key, q) => h.setSlider(r.ans[key] + (q === i ? bump : 0), q));
          h.click('Start the show');
          h.advance(3);
        }
      }
      expect(err).not.toHaveBeenCalled();
    });
  });
  it('a charge is spent in rounds 2 and 3 for the test lift, and round 3 has none', () => {
    h.start(4, 5);
    const g = build(4, 5);
    for (let k = 0; k < 2; k++) {
      setAll(g[k]);
      h.click('Start the show');
      h.advance(2.8);
      h.advance(1);
    }
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    h.click('Test lift: raise the pillars for a moment to the heights you set');
    expect(h.feedback()).toMatch(/No charges left/);
  });
});
