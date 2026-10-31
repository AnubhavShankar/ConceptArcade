// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/signal-heist/index';
import { LIQUID, SLEEVE } from '../src/games/mathematics/class-12/ch07-integrals/signal-heist/art';
import { GOALS, HANDLE_RADIUS } from '../src/games/mathematics/class-12/ch07-integrals/signal-heist/index';
import { STROBE_HALF } from '../src/games/mathematics/class-12/ch07-integrals/signal-heist/ux';
import { buildFuse, buildMatch, type FuseRound, type MatchRound } from '../src/games/mathematics/class-12/ch07-integrals/signal-heist/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'signal-heist', 4);
const setBands = (r: MatchRound, bump = 0) => r.bands.forEach(([, c], i) => h.setSlider(c + (i === 0 ? bump : 0), i));

shellTests<MatchRound[]>(h, {
  levels: [1, 2, 3],
  build: (level, seed) => buildMatch(level as 1 | 2 | 3, createRng(seed)),
  setRight: (g, k) => setBands(g[k]),
  setWrong: (g, k) => setBands(g[k], g[k].bands[0][1] < 8 ? 1 : -1),
  commit: () => h.click('Transmit the tone mix to the lock'),
});
shellTests<FuseRound[]>(h, {
  levels: [4],
  build: (_level, seed) => buildFuse(createRng(seed)),
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(g[k].ans + 1),
  commit: () => h.click('Run the charge through the fuse'),
});

const TRANSMIT = 'Transmit the tone mix to the lock';
const CHARGE = 'Run the charge through the fuse';
const PEEK = 'Scope peek: show your mix on the scope for a moment';
const PROBE = 'Probe: is the net charge more or less than the rating?';
const CYAN = '#4de1ff';
const PINK = '#ff4d8d';
const buildM = (level: number, seed: number) => buildMatch(level as 1 | 2 | 3, createRng(seed));
const buildF = (seed: number) => buildFuse(createRng(seed));
const wrongBump = (r: MatchRound) => (r.bands[0][1] < 8 ? 1 : -1);

// A canvas recorder: every string drawn, every stroke (with its colour and the number of points in its path) and every filled rectangle (with its colour).
const recorder = () => {
  const rec = { texts: [] as string[], strokes: [] as { style: string; n: number }[], fills: [] as string[] };
  const store: Record<string, unknown> = {};
  let n = 0;
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'fillText') return (s: string) => rec.texts.push(String(s));
      if (p === 'beginPath') return () => (n = 0);
      if (p === 'lineTo') return () => n++;
      if (p === 'stroke') return () => rec.strokes.push({ style: String(store.strokeStyle), n });
      if (p === 'fillRect') return () => rec.fills.push(String(store.fillStyle));
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
    rec.strokes.length = 0;
    rec.fills.length = 0;
  };
  return { rec, clear };
};
const MIX_POINTS = 300;
const mixDrawn = (rec: ReturnType<typeof recorder>['rec']) => rec.strokes.some((s) => s.style === CYAN && s.n >= MIX_POINTS);
const signalDrawn = (rec: ReturnType<typeof recorder>['rec']) => rec.strokes.some((s) => s.style === PINK && s.n >= 150);
/** The last frame the scene draws after advancing by `dt` (one frame is 0.05 s). */
const frame = (r: ReturnType<typeof recorder>, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  r.clear();
  h.advance(0.05);
  return r.rec;
};
const playMatchTo = (level: number, round: number, seed = 5) => {
  const g = buildM(level, seed);
  for (let k = 0; k < round; k++) {
    setBands(g[k]);
    h.click(TRANSMIT);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const playFuseTo = (round: number, seed = 5) => {
  const g = buildF(seed);
  for (let k = 0; k < round; k++) {
    h.setSlider(g[k].ans);
    h.click(CHARGE);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

describe('Signal Heist', () => {
  it('has 3 sliders in level 1, 4 in levels 2 and 3 and 1 in level 4, all at their start values', () => {
    for (const [level, n] of [[1, 3], [2, 4], [3, 4], [4, 1]] as const) {
      h.start(level, 5);
      expect(h.sliders().length).toBe(n);
      for (const s of h.sliders()) {
        expect(Number(s.step)).toBe(1);
        if (level === 4) {
          expect(Number(s.min)).toBe(0);
          expect(Number(s.max)).toBe(24);
          expect(Number(s.value)).toBe(12);
        } else {
          expect(Number(s.min)).toBe(-8);
          expect(Number(s.max)).toBe(8);
          expect(Number(s.value)).toBe(0);
        }
      }
    }
  });
  it('a level 1 miss says stun dart and gap, and never a band, a signal name or an amplitude of the answer', () => {
    h.start(1, 5);
    const r = buildM(1, 5)[0];
    setBands(r, wrongBump(r));
    h.click(TRANSMIT);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/stun dart/);
    expect(h.feedback()).toMatch(/gap/);
    expect(h.feedback()).not.toContain(r.name);
    for (const [b] of r.bands) if (b !== '1') expect(h.feedback()).not.toContain(b);
    expect(h.hearts()).toBe(2);
  });
  it('the peek costs a charge: Scope peek, then No charges left', () => {
    h.start(2, 5);
    h.click(PEEK);
    expect(h.feedback()).toMatch(/Scope peek/);
    h.click(PEEK);
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('the peek reads the player’s own mix: it lies right on the signal only at the winning amplitudes', () => {
    h.start(2, 5);
    const r = buildM(2, 5)[0];
    setBands(r, wrongBump(r));
    h.click(PEEK);
    expect(h.feedback()).toMatch(/does not lie on/);
    h.start(2, 5);
    setBands(r);
    h.click(PEEK);
    expect(h.feedback()).toMatch(/lies right on/);
  });
  it('a level 2 win says + C', () => {
    h.start(2, 5);
    setBands(buildM(2, 5)[0]);
    h.click(TRANSMIT);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/\+ C\.$/);
    expect(h.feedback()).toMatch(/^Lock open!/);
  });
  it('a level 4 miss below the answer says blew, above it says never tripped, and neither names the right rating', () => {
    for (const [d, re] of [[-1, /blew/], [1, /never tripped/]] as const) {
      h.start(4, 5);
      const r = buildF(5)[0];
      h.setSlider(r.ans + d);
      h.click(CHARGE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(re);
      expect(h.hearts()).toBe(2);
    }
  });
  it('a level 4 win says vault open', () => {
    h.start(4, 5);
    h.setSlider(buildF(5)[0].ans);
    h.click(CHARGE);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/vault open/);
  });
  it('the verdict lands at 0.9 s for levels 1 to 3 and at 1.3 s for level 4, not before', () => {
    h.start(1, 5);
    const r = buildM(1, 5)[0];
    setBands(r, wrongBump(r));
    h.click(TRANSMIT);
    h.advance(0.8);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
    h.start(4, 5);
    h.setSlider(buildF(5)[0].ans + 1);
    h.click(CHARGE);
    h.advance(1.2);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
  });
  it('round 3 has no charge and no peek or probe, and the note says so', () => {
    h.start(2, 5);
    playMatchTo(2, 2);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    h.click(PEEK);
    expect(h.feedback()).toMatch(/No charges left/);
    expect(h.note()).toMatch(/Boss round: no peek/);
    h.start(4, 5);
    playFuseTo(2);
    h.click(PROBE);
    expect(h.feedback()).toMatch(/No charges left/);
    expect(h.note()).toMatch(/Boss round: no probe/);
  });
  it('the hint line fades round by round', () => {
    h.start(1, 5);
    expect(h.note()).toMatch(/shows live on the scope/);
    playMatchTo(1, 1);
    expect(h.note()).toMatch(/scope peek costs a charge/);
    h.start(4, 5);
    expect(h.note()).toMatch(/charge meter shows the charge as it builds/);
    playFuseTo(1);
    expect(h.note()).toMatch(/meter is dark/);
  });
  it('every setting of every slot animates through a transmit, with no console error, and only the right mix opens the lock', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3]) {
      const r = buildM(level, 11)[0];
      r.bands.forEach(([, c], i) => {
        for (const v of [-8, 0, 8, c]) {
          h.start(level, 11);
          setBands(r);
          h.setSlider(v, i);
          h.click(TRANSMIT);
          h.advance(3);
          expect(h.hearts()).toBe(v === c ? 3 : 2);
        }
      });
    }
    expect(err).not.toHaveBeenCalled();
  });
  it('every fuse rating animates through a run, with no console error, and only the net charge opens the lock', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const round of [0, 1]) {
      const r = buildF(11)[round];
      for (let k = 0; k <= 24; k += 2) {
        h.start(4, 11);
        if (round) playFuseTo(round, 11);
        h.setSlider(k);
        h.click(CHARGE);
        h.advance(3);
        expect(h.hearts()).toBe(k === r.ans ? 3 : 2);
      }
      h.start(4, 11);
      if (round) playFuseTo(round, 11);
      h.setSlider(r.ans);
      h.click(CHARGE);
      h.advance(3);
      expect(h.hearts()).toBe(3);
    }
    expect(err).not.toHaveBeenCalled();
  });

  // ---- Never leak the answer: the mix curve, the peek and the sealed meter ----------------------------------------------------------------------------

  for (const level of [1, 2, 3]) {
    it(`level ${level}: the mix curve is live in round 1, shows for 1.5 s after a peek in round 2, and never shows in round 3 until Transmit`, () => {
      const R = recorder();
      h.start(level, 5);
      const canvas = () => h.$('canvas')!;
      // round 1: the lock signal and the live mix
      let rec = frame(R);
      expect(signalDrawn(rec)).toBe(true);
      expect(mixDrawn(rec)).toBe(true);
      expect(canvas().dataset.mixShown).toBe('1');
      // the scope never writes an axis number or π; the slots write only their own band names and amplitudes
      for (const s of rec.texts) expect(s).not.toMatch(/π/);
      // round 2: hidden for every setting, shown for 1.5 s after a peek
      const g = playMatchTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      rec = frame(R, 0.3);
      expect(mixDrawn(rec)).toBe(false);
      expect(signalDrawn(rec)).toBe(true);
      expect(canvas().dataset.mixShown).toBe('0');
      for (const bump of [0, 1, -1]) {
        setBands(g[1], bump || 0);
        expect(mixDrawn(frame(R))).toBe(false);
      }
      setBands(g[1]);
      h.click(PEEK);
      expect(mixDrawn(frame(R, 0.3))).toBe(true);
      expect(canvas().dataset.mixShown).toBe('1');
      expect(mixDrawn(frame(R, 1.0))).toBe(true);
      expect(mixDrawn(frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.mixShown).toBe('0');
      // a second peek in round 2 is refused, so it never shows again
      h.click(PEEK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(mixDrawn(frame(R, 0.5))).toBe(false);
      // round 3: never, for any setting of any slot, and a peek is refused
      h.click(TRANSMIT);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      const r3 = g[2];
      r3.bands.forEach((_b, i) => {
        for (let v = -8; v <= 8; v += 4) {
          h.setSlider(v, i);
          expect(mixDrawn(frame(R))).toBe(false);
        }
      });
      setBands(r3);
      expect(mixDrawn(frame(R))).toBe(false);
      h.click(PEEK);
      expect(mixDrawn(frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.mixShown).toBe('0');
      // Transmit sweeps the mix across the scope (complete at 0.8 s; from 0.9 s a win flashes both curves white)
      h.click(TRANSMIT);
      expect(mixDrawn(frame(R, 0.8))).toBe(true);
    });
  }

  it('level 1 to 3 slots draw only the player’s own amplitude: the amplitude text follows the slider, not the answer', () => {
    const R = recorder();
    h.start(1, 5);
    const r = buildM(1, 5)[0];
    let rec = frame(R);
    expect(rec.texts.filter((s) => /^amp /.test(s))).toEqual(['amp 0', 'amp 0', 'amp 0']);
    h.setSlider(3, 2);
    rec = frame(R);
    expect(rec.texts).toContain('amp 3/8');
    expect(rec.texts).toContain(r.bands[0][0]);
  });

  it('level 4, round 1: the net charge is marked and the liquid follows the integral during the run', () => {
    const R = recorder();
    h.start(4, 5);
    const canvas = () => h.$('canvas')!;
    let rec = frame(R);
    expect(rec.texts).toContain('NET');
    expect(rec.fills).not.toContain(LIQUID);
    expect(rec.fills).not.toContain(SLEEVE);
    expect(canvas().dataset.meterSealed).toBe('0');
    h.setSlider(buildF(5)[0].ans + 1);
    h.click(CHARGE);
    rec = frame(R, 0.6);
    expect(rec.fills).toContain(LIQUID);
  });

  it('level 4, rounds 2 and 3: the meter is sealed, the liquid and the net-charge mark never appear, in play or in the run, hit or miss', () => {
    const R = recorder();
    h.start(4, 5);
    const g = playFuseTo(1);
    expect(h.hud()).toMatch(/Round 2 of 3/);
    for (const round of [1, 2]) {
      const canvas = () => h.$('canvas')!;
      let rec = frame(R, 0.3);
      expect(canvas().dataset.meterSealed).toBe('1');
      expect(rec.fills).toContain(SLEEVE);
      expect(rec.fills).not.toContain(LIQUID);
      expect(rec.texts).not.toContain('NET');
      // a miss: watch every frame of the whole run
      h.setSlider(g[round].ans + 1);
      h.click(CHARGE);
      R.clear();
      h.advance(2.8);
      expect(R.rec.fills).not.toContain(LIQUID);
      expect(R.rec.texts).not.toContain('NET');
      expect(R.rec.fills).toContain(SLEEVE);
      expect(h.hearts()).toBe(round === 1 ? 2 : 1);
      // the replay of the same round is sealed too
      rec = frame(R, 0.3);
      expect(canvas().dataset.meterSealed).toBe('1');
      expect(rec.fills).not.toContain(LIQUID);
      // a hit: the run is sealed as well
      h.setSlider(g[round].ans);
      h.click(CHARGE);
      R.clear();
      h.advance(2.8);
      expect(R.rec.fills).not.toContain(LIQUID);
      expect(R.rec.texts).not.toContain('NET');
      h.advance(1);
    }
  });

  it('level 4, round 2: the probe shows a direction arrow beside the fuse for 1.5 s; round 3 never shows one', () => {
    const R = recorder();
    h.start(4, 5);
    const g = playFuseTo(1);
    const arrows = (rec: ReturnType<typeof recorder>['rec']) => rec.texts.filter((s) => /^[▲▼◎]$/.test(s));
    expect(arrows(frame(R, 0.3))).toEqual([]);
    h.setSlider(g[1].ans - 3);
    h.advance(0.3);
    expect(arrows(frame(R))).toEqual([]);
    h.click(PROBE);
    expect(h.feedback()).toMatch(/more than/);
    expect(arrows(frame(R, 0.3))).toEqual(['▲']);
    expect(arrows(frame(R, 1.0))).toEqual(['▲']);
    expect(arrows(frame(R, 0.5))).toEqual([]);
    h.setSlider(g[1].ans);
    h.click(CHARGE);
    h.advance(2.8);
    h.advance(1);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    for (let k = 0; k <= 24; k += 4) {
      h.setSlider(k);
      expect(arrows(frame(R))).toEqual([]);
    }
    h.click(PROBE);
    expect(arrows(frame(R, 0.5))).toEqual([]);
  });

  it('a probe above the answer shows a down arrow, and an exact one shows a target mark', () => {
    const R = recorder();
    h.start(4, 5);
    const g = playFuseTo(1);
    h.setSlider(g[1].ans + 2);
    h.click(PROBE);
    expect(h.feedback()).toMatch(/less than/);
    expect(frame(R, 0.3).texts).toContain('▼');
    h.start(4, 5);
    playFuseTo(1);
    h.setSlider(g[1].ans);
    h.click(PROBE);
    expect(h.feedback()).toMatch(/exactly/);
    expect(frame(R, 0.3).texts).toContain('◎');
  });

  it('the scene writes no stray answer: level 4 draws no net charge number, and the signal name is never drawn on the canvas', () => {
    const R = recorder();
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      const rec = frame(R, 0.5);
      const name = level === 4 ? buildF(5)[0].name : buildM(level, 5)[0].name;
      expect(rec.texts).not.toContain(name);
      expect(rec.texts.some((s) => /π/.test(s))).toBe(false);
    }
  });
});

// ---- UX pass: the goal line, grips, cue, text size, round tints, a calm strobe and plain-words miss text ----------------------------------------------------

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
const snap = (R: Scene, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
const says = (rec: Scene['rec']) => rec.texts.map((t) => t.s);
const STROBE_FILL = 'rgba(255,60,60,0.18)';
const SOFT_FILL = 'rgba(255,60,60,0.1)';

describe('Signal Heist UX', () => {
  it('the goal is drawn on the scene at the start of every round, fades after 3 s, and is not drawn while the mix is sent', () => {
    for (const [level, goal] of [[2, GOALS.match], [4, GOALS.fuse]] as const) {
      const R = scene();
      h.start(level, 5);
      expect(says(snap(R))).toContain(goal);
      expect(says(snap(R, 2.0))).toContain(goal);
      expect(says(snap(R, 1.7))).not.toContain(goal);
      if (level === 4) playFuseTo(1);
      else playMatchTo(level, 1);
      expect(says(snap(R, 0.3))).toContain(goal);
      expect(says(snap(R, 3.8))).not.toContain(goal);
      h.start(level, 5);
      if (level === 4) h.setSlider(buildF(5)[0].ans + 1);
      else setBands(buildM(level, 5)[0], 1);
      h.click(level === 4 ? CHARGE : TRANSMIT);
      expect(says(snap(R, 0.2))).not.toContain(goal);
    }
  });

  it('round 3 shows the goal at its start too', () => {
    const R = scene();
    h.start(3, 5);
    playMatchTo(3, 2);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    expect(says(snap(R, 0.3))).toContain(GOALS.match);
  });

  it('every handle has a grip ring of radius 18 or more at its own place, and the player’s own setting is written with a word beside its tone or fuse', () => {
    expect(HANDLE_RADIUS).toBeGreaterThanOrEqual(18);
    const R = scene();
    for (const [level, count] of [[1, 3], [2, 4], [3, 4]] as const) {
      h.start(level, 5);
      const rec = snap(R);
      const span = 600 / count;
      for (let i = 0; i < count; i++) {
        const x = 20 + i * span + (span - 10) / 2;
        expect(rec.arcs.some((a) => Math.abs(a.x - x) < 0.01 && Math.abs(a.y - 289) < 0.01 && a.r >= 18)).toBe(true);
      }
      expect(says(rec).filter((s) => /^amp /.test(s)).length).toBe(count);
    }
    h.start(4, 5);
    const rec = snap(R);
    expect(rec.arcs.some((a) => Math.abs(a.x - 469) < 0.01 && Math.abs(a.y - (210 - (12 / 24) * 170)) < 0.01 && a.r >= 18)).toBe(true);
    expect(says(rec)).toContain('fuse 1');
    h.setSlider(8);
    expect(says(snap(R))).toContain('fuse 2/3');
  });

  it('level 1 round 1 pulses a drag cue until the first touch, and no other level or round shows it', () => {
    const R = scene();
    h.start(1, 5);
    expect(says(snap(R))).toContain('drag ⇕');
    h.setSlider(2, 0);
    expect(says(snap(R))).not.toContain('drag ⇕');
    h.start(1, 5);
    playMatchTo(1, 1);
    expect(says(snap(R, 0.3))).not.toContain('drag ⇕');
    for (const level of [2, 4]) {
      h.start(level, 5);
      expect(says(snap(R))).not.toContain('drag ⇕');
    }
  });

  it('the scene text is at least 11 px in every level, before, during and after a send (hit and miss), with the peek and the probe showing', () => {
    const R = scene();
    const sizes = (rec: Scene['rec']) => Math.min(...rec.texts.map((t) => t.size));
    for (const level of [1, 2, 3, 4]) {
      for (const hit of [false, true]) {
        h.start(level, 5);
        expect(sizes(snap(R, 0.5))).toBeGreaterThanOrEqual(11);
        if (level === 4) {
          const r = buildF(5)[0];
          h.setSlider(hit ? r.ans : r.ans + 1);
          h.click(CHARGE);
        } else {
          setBands(buildM(level, 5)[0], hit ? 0 : 1);
          h.click(TRANSMIT);
        }
        for (const dt of [0.2, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4]) expect(sizes(snap(R, dt))).toBeGreaterThanOrEqual(11);
        for (const el of document.body.querySelectorAll('button, input')) expect(el.getAttribute('aria-label')).toBeTruthy();
      }
    }
    h.start(4, 5);
    const g = playFuseTo(1);
    h.setSlider(g[1].ans - 2);
    h.click(PROBE);
    expect(says(snap(R, 0.3))).toContain('▲');
    expect(sizes(R.rec)).toBeGreaterThanOrEqual(11);
  });

  it('each round has its own wash of light, and the boss round a still red frame', () => {
    const R = scene();
    const washes = ['rgba(77,225,255,0.05)', 'rgba(170,90,255,0.1)', 'rgba(255,60,90,0.11)'];
    for (let k = 0; k < 3; k++) {
      h.start(1, 5);
      playMatchTo(1, k);
      const rec = snap(R, 0.3);
      expect(washes.map((w) => rec.rects.includes(w))).toEqual(washes.map((_, i) => i === k));
      expect(rec.strokes.includes('rgba(255,60,90,0.35)')).toBe(k === 2);
    }
  });

  it('the alarm strobe flashes at most 3 times a second, in runs of at least 0.2 s, and keeps its alpha at 0.18', () => {
    expect(STROBE_HALF).toBeGreaterThanOrEqual(1 / 6);
    for (const level of [1, 4]) {
      const R = scene();
      h.start(level, 5);
      if (level === 4) h.setSlider(buildF(5)[0].ans + 1);
      else setBands(buildM(level, 5)[0], 1);
      h.click(level === 4 ? CHARGE : TRANSMIT);
      const on: boolean[] = [];
      for (let i = 0; i < 46; i++) on.push(snap(R).rects.includes(STROBE_FILL));
      const edges = on.filter((v, i) => v && !on[i - 1]).length;
      const seconds = on.length * 0.05;
      expect(edges).toBeGreaterThanOrEqual(2);
      expect(edges / seconds).toBeLessThanOrEqual(3);
      // every run of on and off frames inside the strobe lasts at least 0.2 s (4 frames), apart from the ends
      const runs: number[] = [];
      let len = 1;
      for (let i = 1; i < on.length; i++) {
        if (on[i] === on[i - 1]) len++;
        else {
          runs.push(len);
          len = 1;
        }
      }
      const inner = runs.slice(1);
      expect(inner.length).toBeGreaterThan(2);
      for (const l of inner) expect(l).toBeGreaterThanOrEqual(3);
    }
  });

  it('with reduced motion the alarm is a steady faint tint, not a strobe', () => {
    Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true }), configurable: true, writable: true });
    try {
      const R = scene();
      h.start(1, 5);
      setBands(buildM(1, 5)[0], 1);
      h.click(TRANSMIT);
      const soft: boolean[] = [];
      const hard: boolean[] = [];
      h.advance(1.0);
      for (let i = 0; i < 20; i++) {
        const rec = snap(R);
        soft.push(rec.rects.includes(SOFT_FILL));
        hard.push(rec.rects.includes(STROBE_FILL));
      }
      expect(soft.every(Boolean)).toBe(true);
      expect(hard.some(Boolean)).toBe(false);
    } finally {
      Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true, writable: true });
    }
  });

  it('a miss says in plain words what to change: the fuse rating up or down, or the tones’ amplitudes to check, never the numbers', () => {
    h.start(4, 5);
    const r = buildF(5)[0];
    h.setSlider(r.ans - 1);
    h.click(CHARGE);
    h.advance(2.8);
    expect(h.feedback()).toContain('Raise the fuse rating.');
    h.start(4, 5);
    h.setSlider(r.ans + 1);
    h.click(CHARGE);
    h.advance(2.8);
    expect(h.feedback()).toContain('Lower the fuse rating.');
    h.start(2, 5);
    setBands(buildM(2, 5)[0], 1);
    h.click(TRANSMIT);
    h.advance(2.8);
    expect(h.feedback()).toContain('Check each tone’s amplitude against the identity.');
  });
});
