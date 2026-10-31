// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch06-application-of-derivatives/fog-rally/index';
import { buildBuilder, buildStrip, type BuildRound, type StripRound } from '../src/games/mathematics/class-12/ch06-application-of-derivatives/fog-rally/logic';
import { createRng } from '../src/core/random';
import { KNOB_R } from '../src/games/mathematics/class-12/ch06-application-of-derivatives/fog-rally/art';
import { PAL } from '../src/core/arcade';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts, type CanvasRec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'fog-rally', 5);
const cells = () => [...document.querySelectorAll('[data-cell]')] as HTMLButtonElement[];
function setGears(want: ('gas' | 'brake')[]) {
  cells().forEach((b, i) => {
    for (let k = 0; k < 3 && b.dataset.gear !== want[i]; k++) b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}
const flip0 = (w: ('gas' | 'brake')[]) => w.map((g, i) => (i === 0 ? (g === 'gas' ? 'brake' : 'gas') : g)) as ('gas' | 'brake')[];

shellTests<StripRound[]>(h, {
  levels: [1, 2, 3, 4],
  build: (level, seed) => buildStrip(level as 1 | 2 | 3 | 4, createRng(seed)),
  setRight: (g, k) => setGears(g[k].want),
  setWrong: (g, k) => setGears(flip0(g[k].want)),
  commit: () => h.click('Drive the stage'),
});
shellTests<BuildRound[]>(h, {
  levels: [5],
  build: (_level, seed) => buildBuilder(createRng(seed)),
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k) => h.setSlider(g[k].ans + 1 <= g[k].max ? g[k].ans + 1 : g[k].ans - 1),
  commit: () => h.click('Drive the stage'),
});

describe('Fog Rally', () => {
  it('an unfinished strip is free', () => {
    h.start(1, 5);
    cells()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    h.click('Drive the stage');
    expect(h.feedback()).toMatch(/does not cost you anything/);
    expect(h.hearts()).toBe(3);
    expect(h.phase()).toBe('play');
  });
  it('the strip has eight gear buttons that cycle none, gas, brake, gas', () => {
    h.start(2, 5);
    expect(cells()).toHaveLength(8);
    expect(cells().map((b) => b.dataset.gear)).toEqual(Array(8).fill('none'));
    const seen: (string | undefined)[] = [];
    for (let k = 0; k < 3; k++) {
      cells()[3].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      seen.push(cells()[3].dataset.gear);
    }
    expect(seen).toEqual(['gas', 'brake', 'gas']);
    expect(cells()[3].getAttribute('aria-label')).toBe('Gear from x = −1 to 0');
  });
  it('a canvas tap on a strip cell sets its gear', () => {
    h.start(1, 5);
    h.pointer('pointerdown', 60 + 65 * 2 + 30, 268);
    expect(cells()[2].dataset.gear).toBe('gas');
    expect(cells()[1].dataset.gear).toBe('none');
  });
  it('the scout needs a tapped stretch, reads only that stretch, and costs the one charge', () => {
    h.start(1, 5);
    const scout = 'Scout: a drone reads the slope over the stretch you last tapped';
    h.click(scout);
    expect(h.feedback()).toMatch(/Tap a stretch of road first/);
    expect(h.feedback()).toMatch(/does not cost you anything/);
    cells()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    h.click(scout);
    expect(h.feedback()).toMatch(/Scout drone over x = −4 to −3/);
    h.click(scout);
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('one wrong cell stalls or flips the truck and costs a heart', () => {
    h.start(2, 5);
    const g = buildStrip(2, createRng(5));
    setGears(flip0(g[0].want));
    h.click('Drive the stage');
    h.advance(3);
    expect(h.feedback()).toMatch(/stalled|flipped/);
    expect(h.hearts()).toBe(2);
  });
  it('a win shows the intervals', () => {
    h.start(1, 5);
    const g = buildStrip(1, createRng(5));
    setGears(g[0].want);
    h.click('Drive the stage');
    h.advance(3);
    expect(h.feedback()).toMatch(/increases on/);
    expect(h.hearts()).toBe(3);
  });
  it('level 5: a turn before the gate voids the stage, a turn inside it crashes the truck', () => {
    h.start(5, 5);
    const g = buildBuilder(createRng(5));
    h.setSlider(g[0].ans + 1);
    h.click('Drive the stage');
    h.advance(3);
    expect(h.feedback()).toMatch(/voided/);
    h.setSlider(g[0].ans - 1);
    h.click('Drive the stage');
    h.advance(3);
    expect(h.feedback()).toMatch(/flipped/);
    expect(h.hearts()).toBe(1);
  });
  it('level 5: the scout reads the slope at the gate and the dial starts away from the answer', () => {
    h.start(5, 5);
    const g = buildBuilder(createRng(5));
    const s = h.sliders()[0];
    expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([g[0].min, g[0].max, g[0].start]);
    expect(Number(s.value)).not.toBe(g[0].ans);
    h.click('Scout: read the slope at the start gate');
    expect(h.feedback()).toMatch(/Scout at the start gate/);
  });
  it('the gear buttons lock while the truck runs', () => {
    h.start(1, 5);
    const g = buildStrip(1, createRng(5));
    setGears(g[0].want);
    expect(cells()[0].hasAttribute('disabled')).toBe(false);
    h.click('Drive the stage');
    h.advance(0.3);
    expect(h.phase()).toBe('resolve');
    expect(cells()[0].hasAttribute('disabled')).toBe(true);
    cells()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(cells()[0].dataset.gear).toBe(g[0].want[0]);
  });
  it('a miss never gives the answer strip away', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 8);
      const g = buildStrip(level as 1 | 2 | 3 | 4, createRng(8));
      setGears(flip0(g[0].want));
      h.click('Drive the stage');
      h.advance(3);
      expect(h.feedback()).toMatch(/Between x = /);
      expect(h.feedback()).not.toMatch(/GAS|BRAKE/);
    }
  });
});

const GOALS = ['GOAL: GAS on climbs, BRAKE on drops', 'GOAL: Sign of f′ gives each stretch’s gear', 'GOAL: Change gear only where the road turns', 'GOAL: Set the gear for all 8 stretches', 'GOAL: Set a: the road turns at the gate'];
const frame = (R: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
/** Round 1's helper is the faint cyan silhouette of the whole road: one 120-segment cyan stroke. */
const silhouette = (rec: CanvasRec['rec']) => rec.strokes.some((s) => s.style === PAL.cyan && s.n === 120);
const finish = (level: number, g: (StripRound | BuildRound)[], k: number) => {
  if (level === 5) h.setSlider((g[k] as BuildRound).ans);
  else setGears((g[k] as StripRound).want);
  h.click('Drive the stage');
  h.advance(3.8);
};
const build = (level: number, seed: number): (StripRound | BuildRound)[] => (level === 5 ? buildBuilder(createRng(seed)) : buildStrip(level as 1 | 2 | 3 | 4, createRng(seed)));

describe('Fog Rally UX pass', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    it(`level ${level}: the goal is drawn on the canvas at round start and fades after 3 s`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const first = frame(R);
      expect(texts(first)).toContain(GOALS[level - 1]);
      const at = first.at.find((x) => x.s === GOALS[level - 1])!;
      expect(at.y).toBeLessThan(40);
      expect(texts(frame(R, 1.5))).toContain(GOALS[level - 1]);
      expect(texts(frame(R, 2))).not.toContain(GOALS[level - 1]);
    });
    it(`level ${level}: the goal comes back at the start of round 2`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      finish(level, build(level, 5), 0);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(texts(frame(R))).toContain(GOALS[level - 1]);
    });
    it(`level ${level}: round 1 shows the road as a helper, rounds 2 and 3 never do, before or after a scout`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      expect(silhouette(frame(R))).toBe(true);
      finish(level, g, 0);
      h.advance(1);
      for (const t of [0.05, 1.5, 3.5]) expect(silhouette(frame(R, t))).toBe(false);
      if (level === 5) h.setSlider((g[1] as BuildRound).ans + 1);
      else cells()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      h.click(level === 5 ? 'Scout: read the slope at the start gate' : 'Scout: a drone reads the slope over the stretch you last tapped');
      for (const t of [0.05, 0.6, 1.5, 3]) expect(silhouette(frame(R, t))).toBe(false);
      finish(level, g, 1);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const t of [0.05, 1.5, 3.5]) expect(silhouette(frame(R, t))).toBe(false);
    });
  }
  it('the round 2 hint talks about the scout costing a charge, not a helper that stays on', () => {
    h.start(2, 5);
    finish(2, build(2, 5), 0);
    h.advance(1);
    expect(h.note()).toMatch(/Thick fog: a scout drone costs a charge/);
  });
  it('level 5: the handle is large and gripped, shows the player’s own a, and cues a drag until the first touch', () => {
    expect(KNOB_R).toBeGreaterThanOrEqual(18);
    const R = canvasRecorder();
    h.start(5, 5);
    const g = buildBuilder(createRng(5));
    let rec = frame(R);
    expect(texts(rec)).toContain(`a = ${g[0].start}`);
    expect(texts(rec)).toContain('⇔');
    expect(texts(rec)).toContain('⇔ drag me');
    expect(rec.arcs.some((a) => a.r === KNOB_R - 3 && a.y === 322)).toBe(true);
    h.setSlider(g[0].start + 1);
    rec = frame(R);
    expect(texts(rec)).toContain(`a = ${g[0].start + 1}`);
    expect(texts(rec)).not.toContain('⇔ drag me');
  });
  it('level 1: a tap cue pulses on the first stretch until it is first touched', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    expect(texts(frame(R))).toContain('👆 tap');
    cells()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(texts(frame(R))).not.toContain('👆 tap');
  });
  it('the drag handle can be grabbed on the canvas, and a miss tells the player which way to move a', () => {
    h.start(5, 5);
    const g = buildBuilder(createRng(5));
    const x = 60 + ((g[0].start - g[0].min) / (g[0].max - g[0].min)) * 520;
    h.pointer('pointerdown', x + 25, 322);
    h.pointer('pointermove', 580, 322);
    expect(Number(h.sliders()[0].value)).toBe(g[0].max);
    h.click('Drive the stage');
    h.advance(3);
    expect(h.feedback()).toMatch(/Try a (larger|smaller) a\./);
  });
  it('a strip miss says to change the gear on that stretch', () => {
    h.start(1, 5);
    const g = buildStrip(1, createRng(5));
    setGears(flip0(g[0].want));
    h.click('Drive the stage');
    h.advance(3);
    expect(h.feedback()).toMatch(/Change the gear on that stretch/);
  });
});
