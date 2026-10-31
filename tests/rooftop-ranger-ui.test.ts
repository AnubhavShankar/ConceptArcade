// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch02-inverse-trigonometric-functions/rooftop-ranger/index';
import { DIAL, buildRounds, missEnd, rayEnd, type Round } from '../src/games/mathematics/class-12/ch02-inverse-trigonometric-functions/rooftop-ranger/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'rooftop-ranger', 5);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrongK = (r: Round) => (r.k === 6 || r.k === 12 ? r.k - 1 : r.k + 1);

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build,
  setRight: (g, k, level) => {
    h.setSlider(g[k].k, 0);
    if (level === 2) h.setSlider(g[k].range!, 1);
  },
  setWrong: (g, k, level) => {
    h.setSlider(wrongK(g[k]), 0);
    if (level === 2) h.setSlider(g[k].range!, 1);
  },
  commit: () => h.click('Fire the shot'),
});

describe('Rooftop Ranger', () => {
  it('level 1: the intel is in the note, a shallow shot passes over, and the spotter costs a charge in round 2', () => {
    h.start(1, 5);
    const g = build(1, 5);
    expect(h.note()).toMatch(/Roof height/);
    expect(h.note()).toMatch(/laser sight is on/);
    h.setSlider(g[0].k + 1);
    h.click('Fire the shot');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/over the robot/);
    h.setSlider(g[0].k);
    h.click('Fire the shot');
    h.advance(2.8);
    h.advance(1);
    expect(h.hud()).toMatch(/Round 2 of 3/);
    h.click('Call the spotter: where would this shot go');
    expect(h.feedback()).toMatch(/Spotter/);
    h.click('Call the spotter: where would this shot go');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('level 2: two dials; a true tilt with the wrong range is described as a drop or a rise', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.sliders()).toHaveLength(2);
    h.setSlider(g[0].k, 0);
    h.setSlider(g[0].range! - 2, 1);
    h.click('Fire the shot');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/tilt was true.*nearer/);
    expect(h.hearts()).toBe(2);
  });
  it('level 4: the turret dial runs from 0 to π and a west robot hit by an east bearing says so', () => {
    const seed = Array.from({ length: 50 }, (_, i) => i + 1).find((s) => build(4, s)[0].k > 6)!;
    h.start(4, seed);
    const g = build(4, seed);
    const s = h.sliders()[0];
    expect([s.min, s.max]).toEqual(['0', '12']);
    h.setSlider(12 - g[0].k);
    h.click('Fire the shot');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/east half/);
  });
  it('level 4: the dial starts at the same place in every round whatever the answer, so the start tells nothing (a boss answer of straight out included)', () => {
    const seed = Array.from({ length: 200 }, (_, i) => i + 1).find((s) => build(4, s)[2].k === 6)!;
    expect(seed).toBeDefined();
    h.start(4, seed);
    const g = build(4, seed);
    for (const k of [0, 1, 2]) {
      expect(h.sliders()[0].value).toBe('0');
      expect(g[k].k).not.toBe(0);
      if (k === 2) break;
      h.setSlider(g[k].k);
      h.click('Fire the shot');
      h.advance(2.8);
      h.advance(1);
    }
    expect(h.hud()).toMatch(/Round 3 of 3/);
  });
  it('level 5: the dial is a bearing 0..12 in rounds 1 and 3 and a tilt −6..6 in round 2, and it starts where no round is won', () => {
    h.start(5, 5);
    const g = build(5, 5);
    const dial = () => {
      const s = h.sliders()[0];
      return [s.min, s.max, s.value];
    };
    expect(h.sliders()).toHaveLength(1);
    expect(dial()).toEqual(['0', '12', '0']);
    expect(h.$('.hero')?.textContent).toMatch(/gadget scope/);
    for (let k = 0; k < 3; k++) {
      expect(g[k].k).not.toBe(0);
      expect(dial()).toEqual(k === 1 ? ['-6', '6', '0'] : ['0', '12', '0']);
      expect(h.note()).toContain(`= ${g[k].ratio}.`);
      h.setSlider(g[k].k);
      h.click('Fire the shot');
      h.advance(2.8);
      h.advance(1);
    }
    expect(h.phase()).toBe('won');
  });
  it('level 5: the screen reading is in the note, the first round has the laser sight, and a wrong bearing is described by its side', () => {
    h.start(5, 5);
    const g = build(5, 5);
    expect(h.note()).toMatch(/sec θ = range ÷ east offset/);
    expect(h.note()).toMatch(/laser sight is on/);
    expect(h.note()).not.toContain('π');
    h.setSlider(g[0].k > 6 ? 0 : 12);
    h.click('Fire the shot');
    h.advance(2.8);
    expect(h.feedback()).toMatch(/robot is on the (east|west) side/);
    expect(h.feedback()).not.toContain('π');
    expect(h.hearts()).toBe(2);
  });
  it('level 5, round 2: a tilt on the wrong side of the horizon is a miss that names only the side, and the spotter costs a charge', () => {
    h.start(5, 5);
    const g = build(5, 5);
    h.setSlider(g[0].k);
    h.click('Fire the shot');
    h.advance(2.8);
    h.advance(1);
    expect(h.hud()).toMatch(/Round 2 of 3/);
    expect(h.note()).toMatch(/cosec θ = range ÷ height/);
    expect(h.note()).toMatch(/Tilt the scope/);
    h.setSlider(g[1].k > 0 ? -6 : 6);
    h.click('Fire the shot');
    h.advance(2.8);
    expect(h.feedback()).toMatch(g[1].k > 0 ? /below you, so the shot passed far above|pointed downward/ : /pointed upward/);
    h.click('Call the spotter: where would this shot go');
    expect(h.feedback()).toMatch(/Spotter/);
  });
  it('level 5, boss: the cot reading is shown and no spotter is left', () => {
    h.start(5, 5);
    const g = build(5, 5);
    for (let k = 0; k < 2; k++) {
      h.setSlider(g[k].k);
      h.click('Fire the shot');
      h.advance(2.8);
      h.advance(1);
    }
    expect(h.hud()).toMatch(/BOSS/);
    expect(h.note()).toMatch(/cot θ = east offset ÷ height/);
    expect(h.note()).toContain(`= ${g[2].ratio}.`);
    h.click('Call the spotter: where would this shot go');
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('dragging the scope knob sets the tilt', () => {
    h.start(1, 5);
    // The tilt knob is centred at (540, 172) with radius 58: straight down is (540, 230).
    h.pointer('pointerdown', 598, 172);
    h.pointer('pointermove', 540 + 58 * Math.cos(Math.PI / 6), 172 + 58 * Math.sin(Math.PI / 6));
    expect(Number(h.sliders()[0].value)).toBe(-2);
  });
});

// No leaks: a miss ends its tracer at a fixed spot for the side the shot went, never in the true geometry.
const tracer = () => h.$('canvas')?.dataset.tracer;
const rounded = (p: [number, number]) => `${Math.round(p[0])},${Math.round(p[1])}`;

describe('Rooftop Ranger never leaks the answer through a miss', () => {
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level}: wrong settings with the same words end the tracer at the same spot, the spot is not the true geometry, and the −1 float lands on one point`, () => {
      const seed = 11;
      const r = build(level, seed)[0];
      const lo = level === 4 ? DIAL.pan.min : DIAL.tilt.min;
      const hi = level === 4 ? DIAL.pan.max : DIAL.tilt.max;
      const byText = new Map<string, Set<string>>();
      const xs = new Set<number>();
      for (let k = lo; k <= hi; k++) {
        if (k === r.k) continue;
        const rc = canvasRecorder();
        h.start(level, seed);
        h.setSlider(k, 0);
        if (level === 2) h.setSlider(r.range!, 1);
        h.click('Fire the shot');
        rc.clear();
        h.advance(2.0);
        const text = h.feedback();
        expect(text).not.toMatch(/\d/);
        byText.set(text, (byText.get(text) ?? new Set()).add(tracer()!));
        expect(tracer()).toBe(rounded(missEnd(r, { k, range: r.range })));
        if (k < 0 && level !== 4 && k !== -6 && r.k < 0 && level !== 3) expect(tracer()).not.toBe(rounded(rayEnd(r, k)));
        rc.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.add(a.x));
      }
      for (const ends of byText.values()) expect(ends.size).toBe(1);
      expect(byText.size).toBeGreaterThan(1);
      expect([...xs]).toEqual([r.vx]);
    });
  }

  it('level 2: a true tilt with the range off ends a fixed 40 px in front of or beyond the robot, whatever the range', () => {
    const r = build(2, 11)[0];
    const ends: Record<string, string[]> = { nearer: [], farther: [] };
    for (const range of [r.range! - 7, r.range! - 1, r.range! + 1, r.range! + 7]) {
      h.start(2, 11);
      h.setSlider(r.k, 0);
      h.setSlider(range, 1);
      h.click('Fire the shot');
      h.advance(2.0);
      ends[/nearer/.test(h.feedback()) ? 'nearer' : 'farther'].push(tracer()!);
    }
    expect(ends.nearer).toHaveLength(2);
    expect(ends.farther).toHaveLength(2);
    expect(new Set(ends.nearer).size).toBe(1);
    expect(new Set(ends.farther).size).toBe(1);
  });

  it('the start never wins: a shot fired at the start of every round of levels 1 to 4 costs a heart', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 7);
      expect(h.sliders()[0].value).toBe('0');
      h.click('Fire the shot');
      h.advance(2.8);
      expect(h.hearts()).toBe(2);
    }
  });
});
