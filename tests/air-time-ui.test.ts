// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/air-time/index';
import { HANDLE_RADIUS, goalFor } from '../src/games/mathematics/class-12/ch07-integrals/air-time/index';
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
    it(`${kind}: the gauge is live in round 1, flashes 1.5 s after a test run in round 2, and never shows in round 3`, () => {
      const rec = recorder();
      h.start(level, 5);
      expect(gauge(frameTexts(rec), kind)).toBe(true);
      // round 2: nothing before the test, the reading for 1.5 s after it, nothing again after
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
      h.advance(0.9);
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

// ---- UX pass: the goal line, grips, cue, text size, round tints, fixed misses and the round 2 helper rule ------------------------------------------------------

const LAUNCH = 'Launch the jump';
/** A canvas recorder: strings with their font size, rectangle fills, arcs and strokes. */
const scene = () => {
  const rec = { texts: [] as { s: string; size: number }[], rects: [] as string[], arcs: [] as { x: number; y: number; r: number }[], strokes: [] as string[] };
  const store: Record<string, unknown> = {};
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'fillText') return (s: string) => rec.texts.push({ s: String(s), size: Number(/(\d+(\.\d+)?)px/.exec(String(store.font))?.[1] ?? 99) });
      if (p === 'fillRect') return () => rec.rects.push(String(store.fillStyle));
      if (p === 'arc') return (x: number, y: number, r: number) => rec.arcs.push({ x, y, r });
      if (p === 'stroke' || p === 'strokeRect') return () => rec.strokes.push(String(store.strokeStyle));
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
const shot1 = (R: Scene, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
const says = (rec: Scene['rec']) => rec.texts.map((t) => t.s);
const toRound = (level: number, round: number) => {
  const g = build(level, 5);
  for (let k = 0; k < round; k++) {
    h.setSlider(g[k].q);
    h.click(LAUNCH);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const canvas = () => h.$('canvas')!;
/** The settings that are not the answer, in dial order. */
const wrongs = (r: Round) => Array.from({ length: r.hi - r.lo + 1 }, (_, i) => r.lo + i).filter((x) => x !== r.q);

describe('Air Time UX', () => {
  for (const level of [1, 3]) {
    it(`level ${level}: the goal is drawn on the scene at the start of each round, fades after 3 s, and is not drawn during the jump`, () => {
      const R = scene();
      h.start(level, 5);
      const g = build(level, 5);
      expect(says(shot1(R))).toContain(goalFor(g[0]));
      expect(says(shot1(R, 2.0))).toContain(goalFor(g[0]));
      expect(says(shot1(R, 1.7))).not.toContain(goalFor(g[0]));
      toRound(level, 1);
      expect(says(shot1(R, 0.3))).toContain(goalFor(g[1]));
      expect(says(shot1(R, 3.8))).not.toContain(goalFor(g[1]));
      toRound(level, 2);
      h.start(level, 5);
      h.setSlider(g[0].q);
      h.click(LAUNCH);
      expect(says(shot1(R, 0.2))).not.toContain(goalFor(g[0]));
    });
  }

  it('the goal lines name the trick or the speed, as short sentences', () => {
    const spin = build(1, 5)[0];
    const boost = build(3, 5)[0];
    expect(goalFor(spin)).toBe(`Goal: spin exactly ${spin.label}`);
    expect(goalFor(boost)).toMatch(/^Goal: reach .* km\/h$/);
    expect(goalFor(spin).length).toBeLessThan(40);
    expect(goalFor(boost).length).toBeLessThan(40);
  });

  it('the handle has a grip of radius 18 or more at the ramp or the cone, and the player’s own setting is written beside it with its unit', () => {
    expect(HANDLE_RADIUS).toBeGreaterThanOrEqual(18);
    const R = scene();
    h.start(1, 5);
    let r = build(1, 5)[0];
    let rec = shot1(R);
    const sx = 90 + ((r.start - r.p) / (r.hi - r.p)) * 470 + 15;
    expect(rec.arcs.some((a) => Math.abs(a.x - sx) < 0.01 && Math.abs(a.y - 222) < 0.01 && a.r >= 18)).toBe(true);
    expect(says(rec).some((s) => s.startsWith(`x = ${r.start < 0 ? `−${-r.start}` : r.start} m`))).toBe(true);
    h.setSlider(r.q);
    rec = shot1(R);
    expect(says(rec).some((s) => s === `x = ${r.q < 0 ? `−${-r.q}` : r.q} m`)).toBe(true);
    h.start(3, 5);
    r = build(3, 5)[0];
    rec = shot1(R);
    const bx = 50 + ((r.start - r.p) / (r.hi - r.p)) * 390;
    expect(rec.arcs.some((a) => Math.abs(a.x - bx) < 0.01 && Math.abs(a.y - 236) < 0.01 && a.r >= 18)).toBe(true);
    expect(says(rec).some((s) => /^x = −?\d+ m/.test(s))).toBe(true);
  });

  it('level 1 round 1 pulses a drag cue until the first touch, and no other level or round shows it', () => {
    const R = scene();
    h.start(1, 5);
    const r = build(1, 5)[0];
    expect(says(shot1(R)).some((s) => s.endsWith('· drag'))).toBe(true);
    h.setSlider(r.q);
    expect(says(shot1(R)).some((s) => s.endsWith('· drag'))).toBe(false);
    h.setSlider(r.start);
    expect(says(shot1(R)).some((s) => s.endsWith('· drag'))).toBe(false);
    h.start(1, 5);
    toRound(1, 1);
    expect(says(shot1(R, 0.3)).some((s) => s.endsWith('· drag'))).toBe(false);
    h.start(2, 5);
    expect(says(shot1(R)).some((s) => s.endsWith('· drag'))).toBe(false);
  });

  it('the scene text is at least 11 px before, during and after a jump, in every level; every control is labelled', () => {
    const R = scene();
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      let rec = shot1(R, 0.5);
      expect(Math.min(...rec.texts.map((t) => t.size))).toBeGreaterThanOrEqual(11);
      h.click(TEST);
      rec = shot1(R, 0.2);
      expect(Math.min(...rec.texts.map((t) => t.size))).toBeGreaterThanOrEqual(11);
      h.setSlider(wrong(r));
      h.click(LAUNCH);
      for (const dt of [0.3, 0.4, 0.4, 0.4, 0.4]) {
        rec = shot1(R, dt);
        expect(Math.min(...rec.texts.map((t) => t.size))).toBeGreaterThanOrEqual(11);
      }
      for (const el of document.body.querySelectorAll('button, input')) expect(el.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('each round has its own wash of light, and the boss round a still red frame', () => {
    const R = scene();
    const washes = ['rgba(77,225,255,0.05)', 'rgba(170,90,255,0.1)', 'rgba(255,60,90,0.11)'];
    for (let k = 0; k < 3; k++) {
      h.start(2, 5);
      toRound(2, k);
      const rec = shot1(R, 0.3);
      expect(washes.map((w) => rec.rects.includes(w))).toEqual(washes.map((_, i) => i === k));
      expect(rec.strokes.includes('rgba(255,60,90,0.35)')).toBe(k === 2);
    }
  });

  it('a miss says in plain words which way to move the ramp or the cone, never how far', () => {
    for (const level of [1, 3]) {
      const r = build(level, 5)[0];
      for (const x of [r.lo, r.hi]) {
        if (x === r.q) continue;
        h.start(level, 5);
        h.setSlider(x);
        h.click(LAUNCH);
        h.advance(2.8);
        const noun = level === 1 ? 'ramp' : 'cone';
        const more = level === 1 ? 'spin' : 'speed';
        if (x < r.q) expect(h.feedback()).toContain(`Move the ${noun} to the right for more ${more}.`);
        else expect(h.feedback()).toContain(`Move the ${noun} to the left for less ${more}.`);
        expect(h.feedback()).not.toMatch(/\d°/);
      }
    }
  });
});

describe('Air Time misses show their direction only, with fixed effects', () => {
  it('a spin miss turns the same fixed amount for every setting that is too low, and another for every setting that is too high', () => {
    for (const level of [1, 2]) {
      const r = build(level, 5)[0];
      const angs: Record<'under' | 'over', Set<string>> = { under: new Set(), over: new Set() };
      for (const x of wrongs(r)) {
        h.start(level, 5);
        h.setSlider(x);
        h.click(LAUNCH);
        h.advance(1.1);
        expect(canvas().dataset.ang).toBeDefined();
        angs[x < r.q ? 'under' : 'over'].add(canvas().dataset.ang as string);
      }
      expect(angs.under.size).toBe(1);
      expect(angs.over.size).toBe(1);
      expect([...angs.under][0]).not.toBe([...angs.over][0]);
    }
  });

  it('a boost miss comes down at the same fixed spot for every setting that is too slow, and at another for every setting that is too fast', () => {
    for (const t of [1.2, 1.7]) {
      const r = build(3, 5)[0];
      const spots: Record<'short' | 'long', Set<string>> = { short: new Set(), long: new Set() };
      for (const x of wrongs(r)) {
        h.start(3, 5);
        h.setSlider(x);
        h.click(LAUNCH);
        h.advance(t);
        spots[x < r.q ? 'short' : 'long'].add(`${canvas().dataset.bx},${canvas().dataset.by}`);
      }
      expect(spots.short.size).toBe(1);
      expect(spots.long.size).toBe(1);
      expect([...spots.short][0]).not.toBe([...spots.long][0]);
    }
  });

  it('a miss never states the spin or speed it made: in round 2 the miss text and the picture hold no degrees or km/h', () => {
    for (const level of [1, 3]) {
      const R = scene();
      h.start(level, 5);
      const r = toRound(level, 1)[1];
      h.setSlider(wrongs(r)[0]);
      h.click(LAUNCH);
      R.clear();
      h.advance(2.8);
      expect(h.feedback()).not.toMatch(/\d°|km\/h/);
      expect(says(R.rec).filter((s) => /^-?\d+°$/.test(s) || /^\d+ km\/h$/.test(s))).toEqual([]);
    }
  });
});
