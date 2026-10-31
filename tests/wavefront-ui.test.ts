// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch10-wave-optics/wavefront-run/index';
import { bandRounds, mudRounds, rainbowRounds } from '../src/games/physics/class-12/ch10-wave-optics/wavefront-run/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'wr', 3);
type G = { level: number; mud: ReturnType<typeof mudRounds>; band: ReturnType<typeof bandRounds>; rain: ReturnType<typeof rainbowRounds> };
const build = (level: number, seed: number): G => ({
  level,
  mud: level === 1 ? mudRounds(createRng(seed)) : [],
  band: level === 2 ? bandRounds(createRng(seed)) : [],
  rain: level === 3 ? rainbowRounds(createRng(seed)) : [],
});
const FIRE = ['Send the wave into the mud', 'Send the column over the boundary', 'Release the violet and red pulses'];
const TEST_RACE = 'Test race: see how long each colour takes in the glass';

shellTests<G>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k, level) => {
    if (level === 1) {
      h.setSlider(g.mud[k].lamSol, 0);
      h.setSlider(g.mud[k].vSol, 1);
    } else if (level === 2) h.setSlider(Math.round(g.band[k].rSol * 2) / 2);
    else h.setSlider(g.rain[k].dt);
  },
  setWrong: (g, k, level) => {
    if (level === 1) {
      h.setSlider(g.mud[k].lambda, 0);
      h.setSlider(3, 1);
    } else if (level === 2) h.setSlider(g.band[k].rSol + 10);
    else h.setSlider(-g.rain[k].dt);
  },
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: mud run', () => {
  it('a test shot costs a charge and says whether the frequency stays the same', () => {
    h.start(1, 5);
    h.click('Test shot: check the frequency of these settings');
    expect(h.feedback()).toMatch(/the frequency would be/);
    expect(h.feedback()).toMatch(/They (agree|do not agree)/);
    h.click('Test shot: check the frequency of these settings');
    expect(h.feedback()).toMatch(/No charges left/);
    expect(h.hearts()).toBe(3);
  });
  it('the right wavelength with the speed left at c still drifts off the crests', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(g.mud[0].lamSol, 0);
    h.setSlider(3, 1);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/drift off the crests/);
    expect(h.hearts()).toBe(2);
  });
  it('dragging the wavelength knob sets the dial', () => {
    h.start(1, 5);
    const g = build(1, 5);
    const x = 330 + 0.2 * g.mud[0].lambda + 12;
    h.pointer('pointerdown', x, 170 - 62);
    h.pointer('pointermove', 330 + 0.2 * 400 + 12, 108);
    expect(h.sliders()[0].value).toBe('400');
  });
});

describe('level 1: no leaks: the crest view fades', () => {
  /** The crest view is off exactly when the "?" is drawn in the middle of the road. */
  const off = (t: string[]) => t.includes('?');
  const frameAfter = (rc: ReturnType<typeof canvasRecorder>, dt: number) => {
    if (dt > 0.05) h.advance(dt - 0.05);
    rc.clear();
    h.advance(0.05);
    return texts(rc.rec);
  };
  const solve = (g: G, k: number) => {
    h.setSlider(g.mud[k].lamSol, 0);
    h.setSlider(g.mud[k].vSol, 1);
  };
  it('round 1 live; round 2 only for about 1.5 s after a test shot; round 3 never, even after a test shot; the hint says so', () => {
    const rc = canvasRecorder();
    h.start(1, 5);
    const g = build(1, 5);
    expect(off(frameAfter(rc, 0.1))).toBe(false);
    solve(g, 0);
    h.click(FIRE[0]);
    h.advance(3.8);
    expect(h.note()).toMatch(/for a moment after a test shot/);
    expect(off(frameAfter(rc, 0.1))).toBe(true);
    h.click('Test shot: check the frequency of these settings');
    expect(off(frameAfter(rc, 0.3))).toBe(false);
    expect(off(frameAfter(rc, 1.5))).toBe(true);
    solve(g, 1);
    h.click(FIRE[0]);
    h.advance(3.8);
    expect(h.hud()).toMatch(/Round 3 of 3/);
    expect(off(frameAfter(rc, 0.1))).toBe(true);
    h.click('Test shot: check the frequency of these settings');
    expect(off(frameAfter(rc, 0.3))).toBe(true);
  });
});

describe('level 2: the marching column', () => {
  it('the wavefront help fades and the angle of incidence is never the answer', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.note()).toMatch(/predicted wavefront is drawn live/);
    h.setSlider(30);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/cuts through|floats clear/);
    h.setSlider(Math.round(g.band[0].rSol * 2) / 2);
    h.click(FIRE[1]);
    h.advance(2.8);
    h.advance(1);
    expect(h.note()).toMatch(/wavelets are drawn/);
  });
});

describe('level 2: the wavelets obey the hint and a miss never draws the true construction', () => {
  /** Mount level 2 with a recording canvas; a wavelet is the half-circle arc along the boundary (y = 190, from 0 to π). */
  const record = () => {
    const calls: unknown[][] = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: (_t, k) => (...a: unknown[]) => { if (k === 'arc') calls.push(a); }, set: () => true }) as never);
    return { wavelets: () => calls.filter((a) => a[1] === 190 && a[3] === 0 && a[4] === Math.PI).length, clear: () => (calls.length = 0) };
  };
  const play = (k: number, g: G, miss: boolean) => {
    h.setSlider(miss ? g.band[k].rSol + 10 : Math.round(g.band[k].rSol * 2) / 2);
    h.click(FIRE[1]);
  };
  it('round 3 draws no wavelet before or during a shot that misses; rounds 1 and 2 draw them before the march', () => {
    const rec = record();
    h.start(2, 5);
    const g = build(2, 5);
    h.advance(0.5);
    expect(rec.wavelets()).toBeGreaterThan(0);
    for (const k of [0, 1]) {
      play(k, g, false);
      h.advance(2.8);
      h.advance(1);
      rec.clear();
      h.advance(0.5);
      // after winning round k the next round is k + 2: round 2 still draws them, round 3 does not
      if (k === 0) expect(rec.wavelets()).toBeGreaterThan(0);
    }
    expect(h.hud()).toMatch(/Round 3 of 3/);
    // round 3: nothing before the shot, and nothing during a miss
    expect(rec.wavelets()).toBe(0);
    rec.clear();
    play(2, g, true);
    h.advance(2.3);
    expect(rec.wavelets()).toBe(0);
    expect(h.hearts()).toBe(2);
  });
  it('after a miss in any round no true wavelet is drawn, and a win may show the construction', () => {
    for (const round of [0, 1, 2]) {
      const rec = record();
      h.start(2, 7);
      const g = build(2, 7);
      for (let k = 0; k < round; k++) {
        play(k, g, false);
        h.advance(3.8);
      }
      rec.clear();
      play(round, g, true);
      h.advance(2.3);
      expect(rec.wavelets()).toBe(0);
      h.advance(1);
      rec.clear();
      play(round, g, false);
      h.advance(2.3);
      expect(rec.wavelets()).toBeGreaterThan(0);
    }
  });
});

describe('level 3: rainbow race', () => {
  const noNumber = (s: string) => s.replace(/[−-]?\d+(\.\d+)? ns/, 'X ns');
  it('the dial starts at 0, which is never the answer, so releasing at once is a miss', () => {
    h.start(3, 5);
    expect(h.sliders()[0].value).toBe('0');
    expect(h.sliders()[0].min).toBe('-30');
    expect(h.sliders()[0].max).toBe('30');
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/the red pulse left the block first/);
  });
  it('red first is a miss, and so is too much head start; each names only the pulse that left first', () => {
    h.start(3, 5);
    const g = build(3, 5);
    h.setSlider(-g.rain[0].dt);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/the red pulse left the block first/);
    expect(h.hearts()).toBe(2);
    h.setSlider(g.rain[0].dt + 5);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/the violet pulse left the block first/);
    expect(h.hearts()).toBe(1);
  });
  it('a miss gives no number but the player’s own, and the same text for any miss on one side', () => {
    h.start(3, 5);
    h.setSlider(-30);
    h.click(FIRE[2]);
    h.advance(2.8);
    const a = h.feedback();
    expect(a).not.toMatch(/Test race|takes|after red|before red/);
    h.setSlider(-10);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(noNumber(h.feedback())).toBe(noNumber(a));
  });
  it('a test race costs a charge, may show numbers, and round 3 has none', () => {
    h.start(3, 5);
    const g = build(3, 5);
    h.click(TEST_RACE);
    expect(h.feedback()).toMatch(/red takes 15\.1 ns .* violet takes 15\.3 ns/);
    h.click(TEST_RACE);
    expect(h.feedback()).toMatch(/No charges left/);
    expect(h.hearts()).toBe(3);
    for (let k = 0; k < 2; k++) {
      h.setSlider(g.rain[k].dt);
      h.click(FIRE[2]);
      h.advance(2.8);
      h.advance(1);
    }
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    h.click(TEST_RACE);
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('the speed helper shows in round 1 and fades; the hint says so', () => {
    h.start(3, 5);
    const g = build(3, 5);
    expect(h.note()).toMatch(/speed of each colour in the glass is shown/);
    h.setSlider(g.rain[0].dt);
    h.click(FIRE[2]);
    h.advance(2.8);
    h.advance(1);
    expect(h.note()).toMatch(/speeds are hidden/);
    h.setSlider(g.rain[1].dt);
    h.click(FIRE[2]);
    h.advance(2.8);
    h.advance(1);
    expect(h.note()).toMatch(/No speeds and no test race/);
  });
  it('dragging the head-start knob on the track sets the dial, and the wrong answer cannot win by position', () => {
    h.start(3, 5);
    h.pointer('pointerdown', 320, 52);
    h.pointer('pointermove', 320 + 7 * 10, 52);
    expect(h.sliders()[0].value).toBe('10');
    // the hit marker is fixed: after a miss the same round is replayed with the same dial positions available
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.hearts()).toBe(2);
    expect(h.hud()).toMatch(/Round 1 of 3/);
  });
});
