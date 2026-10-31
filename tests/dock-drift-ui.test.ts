// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/dock-drift/index';
import { GOAL, HANDLE_RADIUS } from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/dock-drift/index';
import { DIAL, buildRounds, heightText, missEnd, type Round } from '../src/games/mathematics/class-12/ch05-continuity-and-differentiability/dock-drift/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'dock-drift', 5);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4 | 5, createRng(seed));
const wrong = (r: Round) => (r.ans < 12 ? r.ans + 1 : r.ans - 1);
const RELEASE = 'Release Orbit from the rail';
const PING = 'Sensor ping: will Orbit pass above or below the clamp?';
const ALL = [1, 2, 3, 4, 5];
const heights = Array.from({ length: DIAL.max - DIAL.min + 1 }, (_, i) => DIAL.min + i);

shellTests<Round[]>(h, {
  levels: ALL,
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click(RELEASE),
});

// Record every string and every dash pattern the scene draws, to prove that the helpers are hidden when they must be.
const recorder = () => {
  const rec = { texts: [] as string[], dashes: [] as string[] };
  const proxy = new Proxy({}, {
    get: (_t, p) => (p === 'fillText' ? (s: string) => rec.texts.push(String(s)) : p === 'setLineDash' ? (d: number[]) => rec.dashes.push(JSON.stringify(d)) : () => undefined),
    set: () => true,
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  return rec;
};
const frame = (rec: ReturnType<typeof recorder>) => {
  rec.texts.length = 0;
  rec.dashes.length = 0;
  h.advance(0.05);
  return { texts: [...rec.texts], dashes: [...rec.dashes] };
};
const laser = (f: ReturnType<typeof frame>) => f.texts.includes('GUIDE LASER') || f.dashes.includes('[7,5]');
const pingMarks = (f: ReturnType<typeof frame>) => f.texts.filter((s) => s === 'PING' || s === '▲' || s === '▼' || s === '◎');
const playTo = (level: number, round: number) => {
  const g = build(level, 5);
  for (let k = 0; k < round; k++) {
    h.setSlider(g[k].ans);
    h.click(RELEASE);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

describe('Dock Drift', () => {
  it('the slider runs −12 to 12 in whole metres and starts at the round’s start (levels 1 to 5)', () => {
    for (const level of ALL) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      expect(h.sliders().length).toBe(1);
      const [s] = h.sliders();
      expect(Number(s.min)).toBe(-12);
      expect(Number(s.max)).toBe(12);
      expect(Number(s.step)).toBe(1);
      expect(Number(s.value)).toBe(r.start);
      expect(Number(s.value)).not.toBe(r.ans);
    }
  });

  it('a miss says Orbit bonked the hull, on the side the clamp is, and never names the winning height', () => {
    for (const level of ALL) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      h.setSlider(wrong(r));
      h.click(RELEASE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(/bonked the hull/);
      expect(h.feedback()).toMatch(wrong(r) > r.ans ? /underneath/ : /above it/);
      expect(h.feedback()).not.toMatch(new RegExp(`(^|[^0-9])${Math.abs(r.ans)} m (up|down)`));
      expect(h.hearts()).toBe(2);
    }
  });

  it('a win says Docked! with the working', () => {
    for (const level of ALL) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      h.setSlider(r.ans);
      h.click(RELEASE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(/^Docked!/);
      expect(h.feedback()).toContain(r.work);
      expect(h.hearts()).toBe(3);
    }
  });

  it('the ping costs a charge and gives a direction only, then there are no charges left', () => {
    h.start(2, 5);
    const r = build(2, 5)[0];
    h.setSlider(wrong(r));
    h.click(PING);
    expect(h.feedback()).toMatch(/Sensor ping/);
    expect(h.feedback()).toMatch(wrong(r) > r.ans ? /below the clamp/ : /above the clamp/);
    expect(h.feedback()).not.toMatch(/\d/);
    expect(h.hud()).toMatch(/Charges ·/);
    h.click(PING);
    expect(h.feedback()).toMatch(/No charges left/);
    expect(h.hearts()).toBe(3);
  });

  it('round 3 has no charge and no ping, and the hint line fades round by round', () => {
    h.start(3, 5);
    expect(h.note()).toMatch(/guide laser shows the drift line/);
    const g = build(3, 5);
    h.setSlider(g[0].ans);
    h.click(RELEASE);
    h.advance(3.8);
    expect(h.note()).toMatch(/No laser: a sensor ping costs a charge/);
    h.setSlider(g[1].ans);
    h.click(RELEASE);
    h.advance(3.8);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    expect(h.note()).toMatch(/Boss round: no laser, no ping/);
    h.click(PING);
    expect(h.feedback()).toMatch(/No charges left/);
  });

  it('the verdict lands when the robot reaches the wall (1.4 s), not before', () => {
    h.start(1, 5);
    h.setSlider(wrong(build(1, 5)[0]));
    h.click(RELEASE);
    h.advance(1.2);
    expect(h.hearts()).toBe(3);
    h.advance(0.3);
    expect(h.hearts()).toBe(2);
  });

  it('every clamp height of every level animates through a release with no console error, and only the answer is a hit', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of ALL) {
      const r = build(level, 11)[0];
      for (const height of heights.filter((_, i) => i % 3 === 0 || heights[i] === r.ans)) {
        h.start(level, 11);
        h.click(PING);
        h.advance(0.3);
        h.setSlider(height);
        h.click(RELEASE);
        h.advance(3);
        expect(h.hearts() === 3).toBe(height === r.ans);
      }
    }
    expect(err).not.toHaveBeenCalled();
  });

  // After a miss the same round is replayed, so the robot must show only above or below, never the true height.
  it('a miss ends the robot’s line 2 m past the clamp on the right side (never at the true height); a catch ends it at the clamp', () => {
    for (const level of ALL) {
      const r = build(level, 5)[0];
      for (const height of heights) {
        h.start(level, 5);
        expect(h.$('canvas')!.dataset.driftEnd).toBeUndefined();
        h.setSlider(height);
        h.click(RELEASE);
        h.advance(0.1);
        const end = Number(h.$('canvas')!.dataset.driftEnd);
        if (height === r.ans) expect(end).toBe(r.ans);
        else {
          expect(end).toBe(missEnd(r, height));
          expect(Math.abs(end - r.ans)).toBeGreaterThanOrEqual(0.5);
          expect(r.ans > height ? end > height : end < height).toBe(true);
          expect(Math.abs(end - height)).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('the guide laser is drawn in round 1 only: never in rounds 2 and 3, at any clamp height, before or after a release', () => {
    for (const level of [1, 5]) {
      const rec = recorder();
      h.start(level, 5);
      expect(laser(frame(rec))).toBe(true);
      // hidden while the shot plays, even in round 1
      const g = build(level, 5);
      h.setSlider(wrong(g[0]));
      h.click(RELEASE);
      h.advance(0.3);
      expect(laser(frame(rec))).toBe(false);
      h.advance(0.8);
      expect(laser(frame(rec))).toBe(false);
      h.advance(2);
      expect(h.hud()).toMatch(/Round 1 of 3/);
      expect(laser(frame(rec))).toBe(true);
      // round 2
      h.setSlider(g[0].ans);
      h.click(RELEASE);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      for (const height of heights) {
        h.setSlider(height);
        expect(laser(frame(rec))).toBe(false);
      }
      h.click(PING);
      h.advance(0.3);
      expect(laser(frame(rec))).toBe(false);
      h.setSlider(wrong(g[1]));
      h.click(RELEASE);
      for (let i = 0; i < 10; i++) expect(laser(frame(rec))).toBe(false);
      h.advance(2);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(laser(frame(rec))).toBe(false);
      // round 3
      h.setSlider(g[1].ans);
      h.click(RELEASE);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const height of heights) {
        h.setSlider(height);
        expect(laser(frame(rec))).toBe(false);
      }
      h.click(PING);
      h.advance(0.3);
      expect(laser(frame(rec))).toBe(false);
    }
  });

  it('the scene never writes the winning height in rounds 2 and 3 before a release (the readout shows only the player’s own setting)', () => {
    const rec = recorder();
    h.start(4, 5);
    const g = playTo(4, 1);
    for (const k of [1, 2]) {
      const r = g[k];
      expect(h.hud()).toMatch(new RegExp(`Round ${k + 1} of 3`));
      for (const height of heights.filter((x) => x !== r.ans)) {
        h.setSlider(height);
        const f = frame(rec);
        expect(f.texts.includes(`${heightText(r.ans)} m`)).toBe(false);
        expect(f.texts.some((s) => /GUIDE|LASER/i.test(s))).toBe(false);
      }
      if (k === 1) {
        h.setSlider(r.ans);
        h.click(RELEASE);
        h.advance(2.8);
        h.advance(1);
      }
    }
  });

  it('the ping shows a ring and a direction arrow for a short time only, and never in round 3', () => {
    const rec = recorder();
    h.start(2, 5);
    const g = playTo(2, 1);
    const r = g[1];
    h.advance(0.3);
    expect(pingMarks(frame(rec))).toEqual([]);
    const low = r.ans > DIAL.min + 1 ? r.ans - 2 : r.ans + 2;
    h.setSlider(low);
    h.click(PING);
    h.advance(0.3);
    const during = pingMarks(frame(rec));
    expect(during).toContain('PING');
    expect(during).toContain(low < r.ans ? '▲' : '▼');
    expect(during).not.toContain(low < r.ans ? '▼' : '▲');
    h.advance(0.9);
    const later = pingMarks(frame(rec));
    expect(later).not.toContain('PING');
    expect(later).toContain(low < r.ans ? '▲' : '▼');
    h.advance(0.5);
    expect(pingMarks(frame(rec))).toEqual([]);
    // round 3: no charge, so no ping marks
    h.setSlider(r.ans);
    h.click(RELEASE);
    h.advance(2.8);
    h.advance(1);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    h.click(PING);
    h.advance(0.3);
    expect(pingMarks(frame(rec))).toEqual([]);
  });

  it('the ping can say right through (a ring flash, no arrow) when the clamp is already right', () => {
    const rec = recorder();
    h.start(1, 5);
    const r = build(1, 5)[0];
    h.setSlider(r.ans);
    h.click(PING);
    expect(h.feedback()).toMatch(/right through/);
    h.advance(0.3);
    const marks = pingMarks(frame(rec));
    expect(marks).toContain('◎');
    expect(marks).not.toContain('▲');
    expect(marks).not.toContain('▼');
  });
});

// ---- UX pass: the goal line, grip, cue, text size, round tints, plain-words miss text ------------------------------------------------------------------------

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
const clampY = (m: number) => 176 - m * 11;

describe('Dock Drift UX', () => {
  it('the goal is drawn on the scene at the start of every round, fades after 3 s, and is not drawn during the release', () => {
    for (const level of [1, 4]) {
      const R = scene();
      h.start(level, 5);
      expect(says(snap(R))).toContain(GOAL);
      expect(says(snap(R, 2.0))).toContain(GOAL);
      expect(says(snap(R, 1.7))).not.toContain(GOAL);
      playTo(level, 1);
      expect(says(snap(R, 0.3))).toContain(GOAL);
      expect(says(snap(R, 3.8))).not.toContain(GOAL);
      h.start(level, 5);
      h.setSlider(wrong(build(level, 5)[0]));
      h.click(RELEASE);
      expect(says(snap(R, 0.2))).not.toContain(GOAL);
    }
  });

  it('round 3 shows the goal at its start too', () => {
    const R = scene();
    h.start(2, 5);
    playTo(2, 2);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    expect(says(snap(R, 0.3))).toContain(GOAL);
  });

  it('the clamp has a grip ring of radius 18 or more, and the player’s own height is written beside it with its unit', () => {
    expect(HANDLE_RADIUS).toBeGreaterThanOrEqual(18);
    const R = scene();
    for (const level of ALL) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      let rec = snap(R);
      expect(rec.arcs.some((a) => Math.abs(a.x - 532) < 0.01 && Math.abs(a.y - clampY(r.start)) < 0.01 && a.r >= 18)).toBe(true);
      expect(says(rec)).toContain(`${heightText(r.start)} m`);
      h.setSlider(3);
      rec = snap(R);
      expect(says(rec)).toContain('+3 m');
      expect(rec.arcs.some((a) => Math.abs(a.y - clampY(3)) < 0.01 && a.r >= 18)).toBe(true);
    }
  });

  it('level 1 round 1 pulses a drag cue until the first touch, and no other level or round shows it', () => {
    const R = scene();
    h.start(1, 5);
    expect(says(snap(R))).toContain('drag ⇕');
    h.setSlider(2);
    expect(says(snap(R))).not.toContain('drag ⇕');
    h.start(1, 5);
    playTo(1, 1);
    expect(says(snap(R, 0.3))).not.toContain('drag ⇕');
    h.start(2, 5);
    expect(says(snap(R))).not.toContain('drag ⇕');
  });

  it('the scene text is at least 11 px in every level, before, during and after a release, and with the ping and the laser showing; every control is labelled', () => {
    const R = scene();
    for (const level of ALL) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      let rec = snap(R, 0.5);
      expect(Math.min(...rec.texts.map((t) => t.size))).toBeGreaterThanOrEqual(11);
      h.setSlider(wrong(r));
      h.click(PING);
      rec = snap(R, 0.3);
      expect(says(rec)).toContain('PING');
      expect(Math.min(...rec.texts.map((t) => t.size))).toBeGreaterThanOrEqual(11);
      h.click(RELEASE);
      for (const dt of [0.2, 0.4, 0.4, 0.4, 0.4, 0.6, 0.6]) {
        rec = snap(R, dt);
        expect(Math.min(...rec.texts.map((t) => t.size))).toBeGreaterThanOrEqual(11);
      }
      h.setSlider(r.ans);
      h.click(RELEASE);
      for (const dt of [0.3, 0.5, 0.5, 0.5, 0.5, 0.6]) {
        rec = snap(R, dt);
        expect(Math.min(...rec.texts.map((t) => t.size))).toBeGreaterThanOrEqual(11);
      }
      for (const el of document.body.querySelectorAll('button, input')) expect(el.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('each round has its own wash of light, and the boss round a still red frame', () => {
    const R = scene();
    const washes = ['rgba(77,225,255,0.05)', 'rgba(170,90,255,0.1)', 'rgba(255,60,90,0.11)'];
    for (let k = 0; k < 3; k++) {
      h.start(1, 5);
      playTo(1, k);
      const rec = snap(R, 0.3);
      expect(washes.map((w) => rec.rects.includes(w))).toEqual(washes.map((_, i) => i === k));
      expect(rec.strokes.includes('rgba(255,60,90,0.35)')).toBe(k === 2);
    }
  });

  it('a miss says in plain words which way to slide the clamp, never how far', () => {
    for (const level of ALL) {
      const r = build(level, 5)[0];
      for (const height of [r.ans < 12 ? r.ans + 1 : r.ans - 1, r.ans > -12 ? r.ans - 3 : r.ans + 3]) {
        h.start(level, 5);
        h.setSlider(height);
        h.click(RELEASE);
        h.advance(2.8);
        expect(h.feedback()).toContain(height > r.ans ? 'Slide the clamp down.' : 'Slide the clamp up.');
      }
    }
  });
});
