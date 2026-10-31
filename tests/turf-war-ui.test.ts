// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch08-application-of-integrals/turf-war/index';
import { buildRounds, height, type Round } from '../src/games/mathematics/class-12/ch08-application-of-integrals/turf-war/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';
import { GRIP_MIN } from '../src/games/mathematics/class-12/ch08-application-of-integrals/turf-war/ux';

const h = arcadeHarness(game, 'turf-war', 6);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.max ? r.ans - 1 : r.ans + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5, 6],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(wrong(g[k])),
  commit: () => h.click('Seal the turf'),
});

describe('Turf War', () => {
  it('the dial starts at the beginning of the turf, never at the answer, and the need is in the note', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      h.start(level, 5);
      const g = build(level, 5);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].min, level === 6 ? 10 : g[0].max, g[0].start]);
      expect(h.note()).toMatch(/needs exactly/);
    }
  });
  it('dragging Inky along the turf sets the roller', () => {
    h.start(2, 5);
    // where the axis sits on the canvas for round 1: the same window the scene uses
    const r = build(2, 5)[0];
    const ys = Array.from({ length: 121 }, (_, i) => height(r, (9 * i) / 120));
    const lo = Math.min(0, ...ys);
    const hi = Math.max(0, ...ys);
    const pad = (hi - lo) * 0.06;
    const z = 262 - ((0 - (lo - pad)) / (hi + pad - (lo - pad))) * 200;
    h.pointer('pointerdown', 70, z);
    h.pointer('pointermove', 70 + 3 * 56.7, z);
    h.pointer('pointerup', 70 + 3 * 56.7, z);
    expect(Number(h.sliders()[0].value)).toBe(3);
  });
  it('a miss names the roller and which way it is off, with no amounts; a win shows the working; the gauge costs a charge', () => {
    h.start(2, 5);
    const g = build(2, 5);
    h.setSlider(wrong(g[0]));
    h.click('Seal the turf');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/^With the roller at x = \d+, /);
    expect(h.feedback()).not.toMatch(/laid|needs/);
    expect(h.feedback()).toMatch(/bare patches|spilled/);
    h.setSlider(g[0].ans);
    h.click('Seal the turf');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/signed integral/);
    h.advance(1);
    h.click('Ink gauge: read the paint laid at this setting');
    expect(h.feedback()).toMatch(/Ink gauge/);
    h.click('Ink gauge: read the paint laid at this setting');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 1 explains with πab', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(g[0].ans);
    h.click('Seal the turf');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/πab/);
  });
});

describe('Turf War levels 5 and 6', () => {
  const play = (level: number, seed: number, k: number, v: number) => {
    h.setSlider(v);
    h.click('Seal the turf');
    h.advance(3.6);
    return build(level, seed)[k];
  };
  it('level 5: dragging the top edge up the wall sets the roller to a whole number', () => {
    h.start(5, 5);
    // the handle starts at y = 1 on the wall; the scene maps y = 0 to 292 and y = 6 to 56
    const at = (v: number) => 292 - (v / 6) * 236;
    h.pointer('pointerdown', 156, at(1));
    h.pointer('pointermove', 156, at(4));
    h.pointer('pointerup', 156, at(4));
    expect(Number(h.sliders()[0].value)).toBe(4);
    h.pointer('pointerdown', 156, at(4));
    h.pointer('pointermove', 156, at(9));
    h.pointer('pointerup', 156, at(9));
    expect(Number(h.sliders()[0].value)).toBe(6);
  });
  it('level 6: dragging the right edge along the ground sets the roller, up to the end of the arc', () => {
    h.start(6, 5);
    const a = build(6, 5)[0].p[0];
    // a fixed track: x = 1 to 10 at 24 px a unit from the centre line at 100, whatever the circle
    const at = (q: number) => 100 + q * 24;
    h.pointer('pointerdown', at(1), 290);
    h.pointer('pointermove', at(3), 290);
    h.pointer('pointerup', at(3), 290);
    expect(Number(h.sliders()[0].value)).toBe(3);
    h.pointer('pointerdown', at(3), 290);
    h.pointer('pointermove', at(a + 1), 290);
    h.pointer('pointerup', at(a + 1), 290);
    expect(Number(h.sliders()[0].value)).toBe(a + 1);
    h.pointer('pointerdown', at(a + 1), 290);
    h.pointer('pointermove', at(14), 290);
    h.pointer('pointerup', at(14), 290);
    expect(Number(h.sliders()[0].value)).toBe(10);
  });
  it('a miss names the player’s own edge and the direction only: no amount, no target, no answer', () => {
    for (const level of [5, 6]) {
      h.start(level, 5);
      const g = build(level, 5);
      const w = wrong(g[0]);
      play(level, 5, 0, w);
      const f = h.feedback();
      expect(f).toMatch(level === 5 ? new RegExp(`top edge at y = ${w}`) : new RegExp(`right edge at x = ${w}`));
      expect(f).toMatch(w < g[0].ans ? /bare patches/ : /spilled/);
      expect(f).not.toMatch(/laid|needs|of paint/);
      const rest = f.replace(/the (top|right) edge at [xy] = \d+/, '');
      expect(rest).not.toMatch(/\d/);
      expect(h.hearts()).toBe(2);
    }
  });
  it('a win shows the working of the integral; level 5 integrates along y, level 6 uses the sin⁻¹ form', () => {
    h.start(5, 5);
    const g5 = build(5, 5);
    h.setSlider(g5[0].ans);
    h.click('Seal the turf');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/∫₀\^v g\(y\) dy/);
    expect(h.feedback()).toContain(`v = ${g5[0].ans}`);
    h.start(6, 5);
    const g6 = build(6, 5);
    h.setSlider(g6[0].ans);
    h.click('Seal the turf');
    h.advance(3.6);
    expect(h.feedback()).toMatch(/sin⁻¹/);
    expect(h.feedback()).toContain(g6[0].text!);
  });
  it('the next round resets the roller to the start and, in level 6, resizes the dial to the new circle', () => {
    for (const level of [5, 6]) {
      h.start(level, 6);
      const g = build(level, 6);
      h.setSlider(g[0].ans);
      h.click('Seal the turf');
      h.advance(2.8);
      h.advance(1);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[1].min, level === 6 ? 10 : g[1].max, g[1].start]);
    }
  });
  it('level 6: an edge past the end of the fence is free: a note, no shot, no heart, no charge', () => {
    h.start(6, 5);
    const a = build(6, 5)[0].p[0];
    h.setSlider(a + 1);
    h.click('Seal the turf');
    h.advance(0.1);
    expect(h.phase()).toBe('play');
    expect(h.hearts()).toBe(3);
    expect(h.feedback()).toMatch(new RegExp(`fence ends at x = ${a}: the edge cannot go past it.*does not cost you anything`));
    h.click('Ink gauge: read the paint laid at this setting');
    expect(h.feedback()).toMatch(/fence ends at x/);
    // the charge is still there for a valid setting
    h.setSlider(2);
    h.click('Ink gauge: read the paint laid at this setting');
    expect(h.feedback()).toMatch(/Ink gauge at 2: /);
    // and the largest dial value on a round that ends earlier cannot win by position
    h.setSlider(10);
    h.click('Seal the turf');
    h.advance(3);
    expect(h.hearts()).toBe(3);
    expect(h.phase()).toBe('play');
  });
  it('the ink gauge reads the paint at the current setting and costs the round’s one charge', () => {
    h.start(5, 5);
    h.setSlider(2);
    h.click('Ink gauge: read the paint laid at this setting');
    expect(h.feedback()).toMatch(/Ink gauge at 2: .* of paint is down/);
    h.click('Ink gauge: read the paint laid at this setting');
    expect(h.feedback()).toMatch(/No charges left/);
  });
});

describe('Turf War UX pass', () => {
  const GAUGE = 'Ink gauge: read the paint laid at this setting';
  const LEVELS = [1, 2, 3, 4, 5, 6];
  /** One 50 ms frame, recorded, after letting `dt` seconds pass. */
  const frame = (R: ReturnType<typeof canvasRecorder>, dt: number) => {
    if (dt > 0.05) h.advance(dt - 0.05);
    R.clear();
    h.advance(0.05);
    return R.rec;
  };
  const counter = (R: ReturnType<typeof canvasRecorder>, dt: number) => frame(R, dt).at.some((a) => /^painted /.test(a.s));
  /** Win rounds 1 to k so the next round is on screen. */
  const playTo = (level: number, seed: number, k: number) => {
    h.start(level, seed);
    const g = build(level, seed);
    for (let i = 0; i < k; i++) {
      h.setSlider(g[i].ans);
      h.click('Seal the turf');
      h.advance(2.8);
      h.advance(1);
    }
    return g;
  };
  for (const level of LEVELS) {
    it(`level ${level}: the goal line is drawn at round start and fades; the handle is at least ${GRIP_MIN} px`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const rec = frame(R, 0.05);
      const goals = rec.at.filter((a) => /^Goal: lay exactly /.test(a.s));
      expect(goals.length).toBe(1);
      expect(goals[0].y).toBeGreaterThanOrEqual(12);
      expect(GRIP_MIN).toBeGreaterThanOrEqual(18);
      expect(rec.arcs.some((a) => a.r >= 18)).toBe(true);
      // the player's own setting is written beside the handle, with its unit
      expect(rec.at.some((a) => /^(b|x|y) = \d+( · drag)?$|^\d+ quarter waves( · drag)?$/.test(a.s))).toBe(true);
      expect(frame(R, 4).at.some((a) => /^Goal: /.test(a.s))).toBe(false);
    });
    it(`level ${level}: the paint counter is live in round 1, shows 1.5 s after an ink gauge in round 2, never in round 3`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      expect(counter(R, 0.1)).toBe(true);
      expect(h.$('canvas')!.dataset.helper).toBe('1');
      const g = playTo(level, 5, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(h.note()).toMatch(/shows for a moment after an ink gauge/);
      expect(counter(R, 0.3)).toBe(false);
      expect(h.$('canvas')!.dataset.helper).toBe('0');
      h.setSlider(g[1].ans === g[1].max ? g[1].ans - 1 : g[1].ans + 1);
      expect(counter(R, 0.3)).toBe(false);
      h.click(GAUGE);
      expect(counter(R, 0.3)).toBe(true);
      expect(counter(R, 0.8)).toBe(true);
      expect(counter(R, 0.8)).toBe(false);
      expect(h.$('canvas')!.dataset.helper).toBe('0');
      // a miss does not bring the counter back
      h.click('Seal the turf');
      h.advance(3.6);
      expect(counter(R, 0.3)).toBe(false);
      const g2 = playTo(level, 5, 2);
      expect(h.hud()).toMatch(/BOSS/);
      h.setSlider(g2[2].ans);
      expect(counter(R, 0.3)).toBe(false);
      expect(h.$('canvas')!.dataset.helper).toBe('0');
    });
  }
  it('level 1, round 1: the handle pulses with a "drag" cue until the first touch; round 2 has none', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    expect(frame(R, 0.1).at.some((a) => / · drag$/.test(a.s))).toBe(true);
    h.pointer('pointerdown', 320, 170);
    h.pointer('pointerup', 320, 170);
    expect(frame(R, 0.1).at.some((a) => / · drag$/.test(a.s))).toBe(false);
    h.start(2, 5);
    expect(frame(R, 0.1).at.some((a) => / · drag$/.test(a.s))).toBe(false);
  });
  it('a miss says which way to move the edge, in words, never by how much', () => {
    for (const [level, short, long] of [[1, /Raise the top\./, /Lower the top\./], [2, /Roll further\./, /Roll back\./], [5, /Raise the top edge\./, /Lower the top edge\./], [6, /Move the edge out\./, /Pull the edge in\./]] as const) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      h.setSlider(r.ans === r.max ? r.ans - 1 : r.ans + 1);
      h.click('Seal the turf');
      h.advance(3.6);
      expect(h.feedback()).toMatch(r.ans === r.max ? short : long);
    }
  });
});
