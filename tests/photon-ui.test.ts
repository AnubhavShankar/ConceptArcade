// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch11-dual-nature-of-radiation-and-matter/photon-cannon/index';
import { H, brightRounds, lineRounds, stopRounds, thresholdRounds, voltsText } from '../src/games/physics/class-12/ch11-dual-nature-of-radiation-and-matter/photon-cannon/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'pc', 4);
type G = { thr: ReturnType<typeof thresholdRounds>; stop: ReturnType<typeof stopRounds>; line: ReturnType<typeof lineRounds>; bright: ReturnType<typeof brightRounds> };
const build = (level: number, seed: number): G => ({ thr: level === 1 ? thresholdRounds(createRng(seed)) : [], stop: level === 2 ? stopRounds(createRng(seed)) : [], line: level === 3 ? lineRounds(createRng(seed)) : [], bright: level === 4 ? brightRounds(createRng(seed)) : [] });
const FIRE = ['Fire the photons at the metal', 'Switch on the light with this retarding voltage', 'Check the line against the measured points', 'Switch on the lamp and run the experiment'];

shellTests<G>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k, level) => {
    if (level === 1) h.setSlider(g.thr[k].lamSol);
    else if (level === 2) h.setSlider(g.stop[k].v0);
    else if (level === 3) {
      h.setSlider(H, 0);
      h.setSlider(g.line[k].phi, 1);
    } else {
      h.setSlider(g.bright[k].b2, 0);
      h.setSlider(g.bright[k].v02t, 1);
    }
  },
  setWrong: (g, k, level) => {
    if (level === 1) h.setSlider(Math.round(g.thr[k].lamSol * 0.7));
    else if (level === 2) h.setSlider(Math.max(0, g.stop[k].v0 - 0.2));
    else if (level === 3) {
      h.setSlider(H * 1.3, 0);
      h.setSlider(g.line[k].phi, 1);
    } else {
      h.setSlider(g.bright[k].b2 - 1, 0);
      h.setSlider(g.bright[k].v02t, 1);
    }
  },
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Zap’s threshold', () => {
  it('too weak shakes the electrons; too strong throws them out; a test shot compares the energies', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(Math.min(900, Math.round(g.thr[0].lamSol * 1.3)));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/too weak/);
    h.setSlider(Math.round(g.thr[0].lamSol * 0.7));
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/more than strong enough/);
    h.click('Test shot: compare the photon energy with the work function');
    expect(h.feedback()).toMatch(/each photon carries [\d.]+ eV/);
  });
});

describe('level 2: Volt’s stopping potential', () => {
  it('too little push-back lets electrons through and too much over-stops, in words that never give the voltage', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(Math.max(0, g.stop[0].v0 - 0.2));
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/still get through/);
    h.setSlider(Math.min(4, g.stop[0].v0 + 0.6));
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/stronger than it needs/);
    expect(h.feedback()).not.toContain(`${g.stop[0].v0} V`);
  });
  it('dragging the voltage knob sets the dial in hundredths of a volt', () => {
    h.start(2, 5);
    h.pointer('pointerdown', 598, 300 - (0.2 / 4) * 220);
    h.pointer('pointermove', 598, 300 - (1.234 / 4) * 220);
    expect(h.sliders()[0].value).toBe('1.23');
  });
});

/** x of a handle on a panel track (the tracks run from x = 480 to x = 605). */
const TX = (val: number, min: number, max: number) => 480 + ((val - min) / (max - min)) * 125;

describe('level 3: Ruler’s line', () => {
  it('has two dials; the right slope with the wrong intercept misses both points, in words', () => {
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.sliders()).toHaveLength(2);
    h.setSlider(H, 0);
    h.setSlider(g.line[0].phi + 1, 1);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/passes below both measured points/);
    expect(h.hearts()).toBe(2);
  });
  it('the two handles sit on tracks in the panel on the right: the lower one sets the work function, the upper one sets h', () => {
    h.start(3, 5);
    // starting dials: h = 5 (a fifth of the way along its 4 to 9 track), φ = 3.6 eV (a bit over half way along its 1 to 6 track)
    h.pointer('pointerdown', TX(3.6, 1, 6), 250 + 3);
    h.pointer('pointermove', TX(2.5, 1, 6), 250);
    expect(Number(h.sliders()[1].value)).toBeCloseTo(2.5, 1);
    expect(Number(h.sliders()[0].value)).toBe(5);
    h.pointer('pointerup', 0, 0);
    h.pointer('pointerdown', TX(5, 4, 9), 150 - 4);
    h.pointer('pointermove', TX(6.63, 4, 9), 150);
    expect(Number(h.sliders()[0].value)).toBeCloseTo(6.63, 1);
    expect(Number(h.sliders()[1].value)).toBeCloseTo(2.5, 1);
  });
});

// ---- level 3: no leaks (the helper fades, and a miss draws no line and no true value) ---------------------------------------
/** A canvas recorder for straight segments (line()) and text, installed after the harness has run its beforeEach. */
function segRecorder() {
  const segs: { a: [number, number]; b: [number, number]; style: string }[] = [];
  const strs: string[] = [];
  const store: Record<string, unknown> = {};
  let cur: [number, number][] = [];
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'beginPath') return () => (cur = []);
      if (p === 'moveTo' || p === 'lineTo') return (x: number, y: number) => cur.push([x, y]);
      if (p === 'stroke') return () => cur.length === 2 && segs.push({ a: cur[0], b: cur[1], style: String(store.strokeStyle) });
      if (p === 'fillText') return (s: string) => strs.push(String(s));
      return () => undefined;
    },
    set: (_t, p, v) => {
      store[String(p)] = v;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  return {
    segs,
    strs,
    clear() {
      segs.length = 0;
      strs.length = 0;
    },
  };
}
type SegRec = ReturnType<typeof segRecorder>;
const frame = (rec: SegRec, dt: number) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rec.clear();
  h.advance(0.05);
  return { segs: [...rec.segs], strs: [...rec.strs] };
};
/** The player's whole line runs from the frequency axis start (x = 36) to the end of the graph (x = 36 + 18 × 22 = 432). */
const hasLine = (f: ReturnType<typeof frame>) => f.segs.some((s) => s.a[0] === 36 && Math.abs(s.b[0] - 432) < 0.01);
const arrows = (f: ReturnType<typeof frame>) => f.strs.filter((s) => s === '▲' || s === '▼');
const L3 = 'Test shot: compare the line with the measured points';
const solve3 = (g: G, k: number) => {
  h.setSlider(H, 0);
  h.setSlider(g.line[k].phi, 1);
};
const playTo3 = (round: number) => {
  const g = build(3, 5);
  for (let k = 0; k < round; k++) {
    solve3(g, k);
    h.click(FIRE[2]);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
/** Two settings that pass on the same side of both points, with h right and φ off: below both (φ high) or above both (φ low). */
const side3 = (g: G, k: number, side: 'below' | 'above', f: number) => {
  h.setSlider(H, 0);
  h.setSlider(side === 'below' ? g.line[k].phi + 0.6 + 0.5 * f : g.line[k].phi - 0.5 - 0.3 * f, 1);
};

describe('level 3: no leaks: the helper fades, and a miss shows no line and no true value', () => {
  it('round 1 draws the live line; round 2 only for about 1.5 s after a test shot; round 3 never, even after a test shot', () => {
    const rec = segRecorder();
    h.start(3, 5);
    expect(hasLine(frame(rec, 0.1))).toBe(true);
    const g = playTo3(1);
    expect(hasLine(frame(rec, 0.1))).toBe(false);
    h.click(L3);
    expect(hasLine(frame(rec, 0.3))).toBe(true);
    expect(hasLine(frame(rec, 1.5))).toBe(false);
    solve3(g, 1);
    h.click(FIRE[2]);
    h.advance(2.8);
    h.advance(1);
    expect(h.hud()).toMatch(/Round 3 of 3/);
    expect(hasLine(frame(rec, 0.1))).toBe(false);
    h.click(L3);
    expect(hasLine(frame(rec, 0.3))).toBe(false);
  });
  it('the hint text says the line shows for a moment after a test shot', () => {
    h.start(3, 5);
    playTo3(1);
    expect(h.note()).toMatch(/for a moment after a test shot/);
  });
  it('a miss in round 2 or 3 draws no line, only a fixed arrow at each measured point; a win draws the line', () => {
    for (const round of [1, 2]) {
      const rec = segRecorder();
      h.start(3, 5);
      const g = playTo3(round);
      side3(g, round, 'below', 0);
      h.click(FIRE[2]);
      h.advance(2.0);
      const miss = frame(rec, 0.05);
      expect(hasLine(miss)).toBe(false);
      // φ too high puts the line below both points, and each arrow points toward the side the line passes
      expect(arrows(miss)).toEqual(['▼', '▼']);
      h.advance(1);
      solve3(g, round);
      h.click(FIRE[2]);
      h.advance(2.0);
      const win = frame(rec, 0.05);
      expect(hasLine(win)).toBe(true);
      expect(arrows(win)).toEqual([]);
      h.advance(1);
    }
  });
  it('two wrong settings on the same side give the same words and the same arrows, however far off they are', () => {
    for (const side of ['below', 'above'] as const) {
      const rec = segRecorder();
      const ends: unknown[] = [];
      const says: string[] = [];
      for (const f of [0, 1]) {
        h.start(3, 5);
        const g = playTo3(2);
        side3(g, 2, side, f);
        h.click(FIRE[2]);
        h.advance(2.0);
        const fr = frame(rec, 0.05);
        // the player’s own labels aside, the same texts and the same short red arrows (same ends)
        ends.push({ strs: fr.strs.filter((s) => !/^\d+\.\d\d( eV)?$/.test(s)), red: fr.segs.filter((s) => s.style === '#ff5a5a').map((s) => [s.a, s.b]) });
        h.advance(1);
        says.push(h.feedback());
      }
      expect(says[0]).toBe(says[1]);
      expect(says[0]).toMatch(side === 'below' ? /below both/ : /above both/);
      expect(says[0]).not.toMatch(/\d/);
      expect(ends[0]).toEqual(ends[1]);
    }
  });
  it('the start never wins: h starts at 5 and φ at 3.6, and firing at once costs a heart in every round', () => {
    for (const round of [0, 1, 2]) {
      h.start(3, 5);
      playTo3(round);
      expect(h.sliders()[0].value).toBe('5');
      expect(h.sliders()[1].value).toBe('3.6');
      const hearts = h.hearts();
      h.click(FIRE[2]);
      h.advance(2.8);
      expect(h.hearts()).toBe(hearts - 1);
    }
  });
});

/** Everything drawn on one frame: texts with positions, arcs, and segments. */
function geomRecorder() {
  const out = { at: [] as { s: string; x: number; y: number }[], arcs: [] as { x: number; y: number; r: number }[], segs: [] as [number, number, number, number][] };
  const store: Record<string, unknown> = {};
  let cur: [number, number][] = [];
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'beginPath') return () => (cur = []);
      if (p === 'moveTo' || p === 'lineTo') return (x: number, y: number) => cur.push([x, y]);
      if (p === 'stroke') return () => cur.length === 2 && out.segs.push([cur[0][0], cur[0][1], cur[1][0], cur[1][1]]);
      if (p === 'fillText') return (s: string, x: number, y: number) => out.at.push({ s: String(s), x, y });
      if (p === 'arc') return (x: number, y: number, r: number) => out.arcs.push({ x, y, r });
      return () => undefined;
    },
    set: (_t, p, v) => {
      store[String(p)] = v;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  return {
    out,
    frame(dt = 0.05) {
      if (dt > 0.05) h.advance(dt - 0.05);
      out.at.length = 0;
      out.arcs.length = 0;
      out.segs.length = 0;
      h.advance(0.05);
      return { at: [...out.at], arcs: [...out.arcs], segs: [...out.segs] };
    },
  };
}
type Geom = ReturnType<ReturnType<typeof geomRecorder>['frame']>;
const GRAPH_RIGHT = 440;
/** What is drawn in the graph area (x below 440): texts, arcs and segments, none of the panel on the right. */
const graphPart = (f: Geom) =>
  JSON.stringify({
    at: f.at.filter((a) => a.x < GRAPH_RIGHT).map((a) => [a.s, a.x, a.y]),
    arcs: f.arcs.filter((a) => a.x < GRAPH_RIGHT).map((a) => [a.x, a.y, a.r]),
    segs: f.segs.filter((s) => s[0] < GRAPH_RIGHT && s[2] < GRAPH_RIGHT),
  });
/** The two engine handle rings (radius 25 to 29 with the pulse). */
const handleRings = (f: Geom) => f.arcs.filter((a) => a.r >= 24 && a.r <= 30);

describe('level 3: the drag handles sit on tracks away from the graph, so no part of the player’s line shows without the helper', () => {
  it('both handles are on the right-hand panel at fixed heights, at least 18 px in radius, whatever the dials say', () => {
    for (const [hv, pv] of [[5, 3.6], [6.63, 2.14], [8.5, 5.5], [4.2, 1.2]]) {
      const rec = geomRecorder();
      h.start(3, 5);
      h.setSlider(hv, 0);
      h.setSlider(pv, 1);
      const rings = handleRings(rec.frame());
      expect(rings).toHaveLength(2);
      expect(Math.min(...rings.map((a) => a.r))).toBeGreaterThanOrEqual(24);
      const byY = [...rings].sort((a, b) => a.y - b.y);
      expect(byY.map((a) => a.y)).toEqual([150, 250]);
      expect(Math.abs(byY[0].x - TX(hv, 4, 9))).toBeLessThan(0.01);
      expect(Math.abs(byY[1].x - TX(pv, 1, 6))).toBeLessThan(0.01);
      for (const a of rings) {
        expect(a.x).toBeGreaterThanOrEqual(480);
        expect(a.x).toBeLessThanOrEqual(605);
      }
    }
  });
  it('rounds 2 (before a test shot) and 3: nothing in the graph area changes with the dials, at all', () => {
    for (const round of [1, 2]) {
      const rec = geomRecorder();
      h.start(3, 5);
      playTo3(round);
      h.advance(4);
      const settings: [number, number][] = [[5, 3.6], [6.63, 2.14], [8.9, 5.9], [4.1, 1.1], [7, 4.2]];
      const seen = new Set<string>();
      for (const [hv, pv] of settings) {
        h.setSlider(hv, 0);
        h.setSlider(pv, 1);
        seen.add(graphPart(rec.frame()));
      }
      expect(seen.size).toBe(1);
      // and no segment of the whole screen runs from the axis start to the end of the graph (the line itself)
      const f = rec.frame();
      expect(f.segs.some((s) => s[0] === 36 && Math.abs(s[2] - 432) < 0.01 && s[1] !== 170)).toBe(false);
    }
  });
  it('round 1 still draws the line live, and a win draws it in every round', () => {
    const rec = geomRecorder();
    h.start(3, 5);
    h.setSlider(6.63, 0);
    h.setSlider(2.14, 1);
    const f = rec.frame();
    expect(f.segs.some((s) => s[0] === 36 && Math.abs(s[2] - 432) < 0.01 && s[1] !== 170)).toBe(true);
    for (const round of [1, 2]) {
      h.start(3, 5);
      const g = playTo3(round);
      solve3(g, round);
      h.click(FIRE[2]);
      h.advance(2.0);
      const w = rec.frame();
      expect(w.segs.some((s) => s[0] === 36 && Math.abs(s[2] - 432) < 0.01 && s[1] !== 170)).toBe(true);
    }
  });
  it('the dials are printed beside their handles with units, and no label sits on the graph at a point of the line', () => {
    const rec = geomRecorder();
    h.start(3, 5);
    const f = rec.frame();
    const texts = f.at.map((a) => a.s);
    expect(texts).toContain('5.00');
    expect(texts).toContain('3.60 eV');
    expect(texts).toContain('h  (× 10⁻³⁴ J s)');
    expect(texts).toContain('φ  (eV)');
    // the readouts are in the panel, never on the graph
    for (const a of f.at.filter((x) => /^\d+\.\d\d( eV)?$/.test(x.s))) expect(a.x).toBeGreaterThanOrEqual(480 - 40);
    expect(texts.some((s) => /^(φ = |h = )/.test(s))).toBe(false);
  });
  it('the goal is on the canvas at the start of each round and gone after 4 s', () => {
    const rec = geomRecorder();
    h.start(3, 5);
    const goal = (f: Geom) => f.at.filter((a) => /^Goal: /.test(a.s));
    expect(goal(rec.frame(0.1))).toHaveLength(1);
    expect(goal(rec.frame(4))).toHaveLength(0);
    const g = playTo3(1);
    expect(g).toBeTruthy();
    expect(goal(rec.frame(0.3))).toHaveLength(1);
  });
});

describe('levels 1 and 2: a miss shows one fixed effect per side', () => {
  const settle = (fireLabel: string) => {
    h.click(fireLabel);
    h.advance(2.8);
  };
  it('level 1: the start wavelength never wins, and two wavelengths too short give the same speed and the same words', () => {
    h.start(1, 5);
    settle(FIRE[0]);
    expect(h.hearts()).toBe(2);
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(Math.round(g.thr[0].lamSol * 0.7));
    settle(FIRE[0]);
    const first = [h.feedback(), h.$('canvas')?.dataset.speed];
    h.setSlider(Math.round(g.thr[0].lamSol * 0.8));
    settle(FIRE[0]);
    expect([h.feedback(), h.$('canvas')?.dataset.speed]).toEqual(first);
    expect(first[1]).toBe('140');
  });
  it('level 1: a win flies the electrons at the slow fixed speed', () => {
    h.start(1, 5);
    h.setSlider(build(1, 5).thr[0].lamSol);
    h.click(FIRE[0]);
    h.advance(1.6);
    expect(h.$('canvas')?.dataset.speed).toBe('60');
  });
  it('level 2: the start voltage never wins, and two voltages on one side give the same pattern and the same words', () => {
    h.start(2, 5);
    settle(FIRE[1]);
    expect(h.hearts()).toBe(2);
    const v0 = build(2, 5).stop[0].v0;
    h.start(2, 5);
    h.setSlider(0);
    settle(FIRE[1]);
    const low = [h.feedback(), h.$('canvas')?.dataset.stopStream];
    h.setSlider(Math.max(0, Math.round((v0 - 0.2) * 100) / 100));
    settle(FIRE[1]);
    expect([h.feedback(), h.$('canvas')?.dataset.stopStream]).toEqual(low);
    expect(low[1]).toBe('through');
    h.start(2, 5);
    h.setSlider(Math.round((v0 + 0.3) * 100) / 100);
    settle(FIRE[1]);
    const high = [h.feedback(), h.$('canvas')?.dataset.stopStream];
    h.setSlider(Math.round((v0 + 0.6) * 100) / 100);
    settle(FIRE[1]);
    expect([h.feedback(), h.$('canvas')?.dataset.stopStream]).toEqual(high);
    expect(high[1]).toBe('early');
  });
  it('level 2: a win stops the electrons exactly at the collector', () => {
    h.start(2, 5);
    h.setSlider(build(2, 5).stop[0].v0);
    h.click(FIRE[1]);
    h.advance(1.6);
    expect(h.$('canvas')?.dataset.stopStream).toBe('stopped');
  });
});

describe('level 4: Brightness and colour', () => {
  const fire = () => {
    h.click(FIRE[3]);
    h.advance(2.8);
  };
  const needle = () => Number(h.$('canvas')?.dataset.needle);
  it('has two dials that start at brightness 1 and 0.0 V, and the start setting never wins', () => {
    h.start(4, 5);
    expect(h.sliders()).toHaveLength(2);
    expect(h.sliders()[0].value).toBe('1');
    expect(h.sliders()[1].value).toBe('0');
    fire();
    expect(h.hearts()).toBe(2);
    expect(h.phase()).toBe('play');
  });
  it('a wrong brightness parks the needle a fixed distance from the mark, whatever it is, and the words give only the side', () => {
    h.start(4, 5);
    const g = build(4, 5);
    const r = g.bright[0];
    h.setSlider(r.v02t, 1);
    h.setSlider(r.b2 - 1, 0);
    h.click(FIRE[3]);
    h.advance(1.6);
    expect(needle()).toBe(-4);
    h.advance(1.2);
    expect(h.feedback()).toMatch(/saturated below the target mark/);
    expect(h.feedback()).not.toMatch(/µA/);
    // a much lower brightness gives the same needle, not a bigger offset
    h.setSlider(1, 0);
    h.click(FIRE[3]);
    h.advance(1.6);
    expect(needle()).toBe(-4);
    h.advance(1.2);
    expect(h.hearts()).toBe(1);
    h.start(4, 5);
    h.setSlider(10, 0);
    h.setSlider(r.v02t, 1);
    h.click(FIRE[3]);
    h.advance(1.6);
    expect(needle()).toBe(4);
    h.advance(1.2);
    expect(h.feedback()).toMatch(/saturated above the target mark/);
  });
  it('a wrong voltage with the right brightness lets electrons through or turns them back early, and never names the voltage', () => {
    h.start(4, 5);
    const r = build(4, 5).bright[0];
    h.setSlider(r.b2, 0);
    h.setSlider(r.v02t - 1, 1);
    h.click(FIRE[3]);
    h.advance(1.6);
    expect(h.$('canvas')?.dataset.stream).toBe('through');
    expect(needle()).toBe(0);
    h.advance(1.2);
    expect(h.feedback()).toMatch(/still reached the collector/);
    expect(h.feedback()).not.toContain(`${voltsText(r.v02t)} V`);
    h.setSlider(r.v02t + 1, 1);
    h.click(FIRE[3]);
    h.advance(1.6);
    expect(h.$('canvas')?.dataset.stream).toBe('early');
    h.advance(1.2);
    expect(h.feedback()).toMatch(/turned back before the gap was closed/);
    expect(h.feedback()).not.toContain(`${voltsText(r.v02t)} V`);
    expect(h.hearts()).toBe(1);
  });
  it('a win settles the needle on the mark and stops the electrons exactly at the collector', () => {
    h.start(4, 5);
    const r = build(4, 5).bright[0];
    h.setSlider(r.b2, 0);
    h.setSlider(r.v02t, 1);
    h.click(FIRE[3]);
    h.advance(1.6);
    expect(needle()).toBe(0);
    expect(h.$('canvas')?.dataset.stream).toBe('stopped');
    h.advance(1.2);
    expect(h.feedback()).toMatch(/^Both readings match!/);
    expect(h.hearts()).toBe(3);
  });
  it('the graph help fades, a test run costs a charge and reads numbers, and the boss round has no charge', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(h.note()).toMatch(/graph is live/);
    expect(h.hud()).toMatch(/Charges ⚡/);
    h.click('Test run: show the current and voltage graph and read the meters');
    expect(h.feedback()).toMatch(/Test run: photon rate 1 gives a saturation current of/);
    expect(h.hud()).not.toMatch(/⚡/);
    h.click('Test run: show the current and voltage graph and read the meters');
    expect(h.feedback()).toMatch(/No charges left this round\. That does not cost you anything\./);
    expect(h.hearts()).toBe(3);
    for (let k = 0; k < 2; k++) {
      h.setSlider(g.bright[k].b2, 0);
      h.setSlider(g.bright[k].v02t, 1);
      fire();
      h.advance(1);
      if (k === 0) expect(h.note()).toMatch(/graph is off/);
    }
    expect(h.hud()).toMatch(/BOSS/);
    expect(h.hud()).not.toMatch(/Charges/);
    expect(h.note()).toMatch(/No graph/);
  });
  it('dragging the knob sets the brightness and dragging the battery handle sets the voltage in tenths of a volt', () => {
    h.start(4, 5);
    const knobY = (b: number) => 300 - ((b - 1) / 9) * 210;
    const voltY = (vt: number) => 310 - (vt / 40) * 220;
    h.pointer('pointerdown', 28, knobY(1));
    h.pointer('pointermove', 28, knobY(6));
    expect(h.sliders()[0].value).toBe('6');
    h.pointer('pointerup', 28, knobY(6));
    h.pointer('pointerdown', 610, voltY(0));
    h.pointer('pointermove', 610, voltY(23));
    expect(h.sliders()[1].value).toBe('23');
  });
});
