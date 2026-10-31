// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch03-matrices/stage-lift/index';
import { GOALS, HANDLE_RADIUS } from '../src/games/mathematics/class-12/ch03-matrices/stage-lift/index';
import { knobY, trackX } from '../src/games/mathematics/class-12/ch03-matrices/stage-lift/art';
import { buildRounds, type Round } from '../src/games/mathematics/class-12/ch03-matrices/stage-lift/logic';
import { PAL } from '../src/core/arcade';
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

// ---- UX pass: the goal line, grips, cue, text size, round tints and the round 2 helper rule ------------------------------------------------------------------

const LIFT = 'Test lift: raise the pillars for a moment to the heights you set';
const START = 'Start the show';
const LEVELS = [1, 2, 3, 4, 5];
/** A canvas recorder: strings with their font size, rectangle fills, arcs and strokes (style and dashed or not). */
const scene = () => {
  const rec = { texts: [] as { s: string; size: number }[], rects: [] as string[], arcs: [] as { x: number; y: number; r: number }[], strokes: [] as { style: string; dash: boolean }[] };
  const store: Record<string, unknown> = {};
  let dash = false;
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'fillText') return (s: string) => rec.texts.push({ s: String(s), size: Number(/(\d+(\.\d+)?)px/.exec(String(store.font))?.[1] ?? 99) });
      if (p === 'fillRect') return () => rec.rects.push(String(store.fillStyle));
      if (p === 'arc') return (x: number, y: number, r: number) => rec.arcs.push({ x, y, r });
      if (p === 'setLineDash') return (a: number[]) => (dash = a.length > 0);
      if (p === 'stroke' || p === 'strokeRect') return () => rec.strokes.push({ style: String(store.strokeStyle), dash });
      return () => undefined;
    },
    set: (_t, p, v) => {
      store[String(p)] = v;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  const clear = () => {
    rec.texts.length = 0;
    rec.rects.length = 0;
    rec.arcs.length = 0;
    rec.strokes.length = 0;
  };
  return { rec, clear };
};
type Scene = ReturnType<typeof scene>;
/** Run `dt` seconds, then record exactly one frame. */
const frame = (R: Scene, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
const words = (rec: Scene['rec']) => rec.texts.map((t) => t.s);
/** The card ghosts are the only dashed pink strokes: the helper of rounds 1 and 2. */
const ghosts = (rec: Scene['rec']) => rec.strokes.some((s) => s.style === PAL.pink && s.dash);
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    setAll(g[k]);
    h.click(START);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

describe('Stage Lift UX', () => {
  it('the goal is drawn on the stage at the start of every round, fades after 3 s, and is not drawn during the show', () => {
    const R = scene();
    h.start(2, 5);
    expect(words(frame(R))).toContain(GOALS[1]);
    expect(words(frame(R, 2.0))).toContain(GOALS[1]);
    expect(words(frame(R, 1.7))).not.toContain(GOALS[1]);
    playTo(2, 1);
    expect(words(frame(R, 0.3))).toContain(GOALS[1]);
    expect(words(frame(R, 3.8))).not.toContain(GOALS[1]);
    playTo(2, 2);
    expect(h.hud()).toMatch(/Round 3 of 3/);
    expect(words(frame(R, 0.3))).toContain(GOALS[1]);
    setAll(build(2, 5)[2]);
    h.click(START);
    expect(words(frame(R, 0.1))).not.toContain(GOALS[1]);
  });

  it('each level has its own short goal line', () => {
    expect(new Set(GOALS).size).toBe(5);
    const R = scene();
    for (const level of LEVELS) {
      h.start(level, 5);
      expect(words(frame(R))).toContain(GOALS[level - 1]);
    }
  });

  it('every fader grip is at least 18 px, drawn at the knob, and the grab zones of neighbouring faders do not overlap', () => {
    expect(HANDLE_RADIUS).toBeGreaterThanOrEqual(18);
    const R = scene();
    for (const level of LEVELS) {
      h.start(level, 5);
      const n = build(level, 5)[0].keys.length;
      const { arcs } = frame(R);
      for (let i = 0; i < n; i++) {
        expect(arcs.some((a) => Math.abs(a.x - trackX(i, n)) < 0.01 && Math.abs(a.y - knobY(0)) < 0.01 && a.r >= 18)).toBe(true);
      }
      // the engine grabs the first handle within radius + 14 of the pointer: a neighbour's centre must lie outside that
      expect(trackX(1, n) - trackX(0, n)).toBeGreaterThan(HANDLE_RADIUS + 14);
      expect(trackX(n - 1, n)).toBeLessThanOrEqual(632 - 16 + 0.01);
    }
  });

  it('level 1 round 1 pulses a drag cue until the first touch, and no other level or round shows it', () => {
    const R = scene();
    h.start(1, 5);
    expect(words(frame(R))).toContain('drag ⇕');
    h.setSlider(3, 0);
    expect(words(frame(R))).not.toContain('drag ⇕');
    h.start(1, 5);
    playTo(1, 1);
    expect(words(frame(R, 0.3))).not.toContain('drag ⇕');
    h.start(2, 5);
    expect(words(frame(R))).not.toContain('drag ⇕');
  });

  it('the scene text is at least 11 px in every level, before and during the show and on a miss; every control is labelled', () => {
    const R = scene();
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      let rec = frame(R, 0.5);
      expect(Math.min(...rec.texts.map((t) => t.size))).toBeGreaterThanOrEqual(11);
      setAll(g[0], g[0].ans[g[0].keys[0]] < 9 ? 1 : -1);
      h.click(START);
      for (const dt of [0.3, 0.5, 0.5, 0.5]) {
        rec = frame(R, dt);
        expect(Math.min(...rec.texts.map((t) => t.size))).toBeGreaterThanOrEqual(11);
      }
      for (const el of document.body.querySelectorAll('button, input')) expect(el.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('each round has its own wash of stage light, and the boss round has a still red frame', () => {
    const R = scene();
    const washes = ['rgba(77,225,255,0.05)', 'rgba(170,90,255,0.1)', 'rgba(255,60,90,0.11)'];
    h.start(1, 5);
    for (let k = 0; k < 3; k++) {
      if (k > 0) playTo(1, k);
      const rec = frame(R, 0.3);
      expect(washes.map((w) => rec.rects.includes(w))).toEqual(washes.map((_, i) => i === k));
      expect(rec.strokes.some((s) => s.style === 'rgba(255,60,90,0.35)')).toBe(k === 2);
      if (k > 0) h.start(1, 5);
    }
  });

  it('Showtime answers at once: the banner shows within 100 ms of the button', () => {
    const R = scene();
    h.start(1, 5);
    setAll(build(1, 5)[0]);
    h.click(START);
    expect(words(frame(R, 0.1))).toContain('SHOWTIME!');
  });

  it('a miss says in plain words whether the pillar must stand lower or higher, and never how much', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      h.start(level, 5);
      const g = build(level, 5);
      setAll(g[0], g[0].ans[g[0].keys[0]] < 9 ? 1 : -1);
      h.click(START);
      h.advance(2.8);
      expect(h.feedback()).toMatch(/Change your settings so that pillar stands (lower|higher)\./);
    }
  });

  for (const level of LEVELS) {
    it(`level ${level}: the card ghosts are live in round 1, show for 1.5 s after a test lift in round 2, and never in round 3`, () => {
      const R = scene();
      h.start(level, 5);
      expect(ghosts(frame(R))).toBe(true);
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(ghosts(frame(R, 0.3))).toBe(false);
      setAll(g[1]);
      expect(ghosts(frame(R))).toBe(false);
      h.setSlider(-9, 0);
      expect(ghosts(frame(R))).toBe(false);
      setAll(g[1]);
      h.click(LIFT);
      expect(ghosts(frame(R, 0.3))).toBe(true);
      expect(ghosts(frame(R, 1.0))).toBe(true);
      expect(ghosts(frame(R, 0.5))).toBe(false);
      h.click(LIFT);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(ghosts(frame(R, 0.5))).toBe(false);
      h.click(START);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      expect(ghosts(frame(R, 0.3))).toBe(false);
      setAll(build(level, 5)[2]);
      expect(ghosts(frame(R))).toBe(false);
      h.click(LIFT);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(ghosts(frame(R, 0.5))).toBe(false);
    });
  }
});
