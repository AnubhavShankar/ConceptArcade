// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/physics/class-12/ch10-wave-optics/slit-dash/index';
import { LAMP, SLIDERS, gaugeRounds, hunterRounds, lampMiss, lampRounds, lockRounds } from '../src/games/physics/class-12/ch10-wave-optics/slit-dash/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, type Rec } from './helpers/canvas-rec';
import { HANDLE_R } from '../src/games/physics/class-12/ch10-wave-optics/slit-dash/index';
import { GRIP_MIN } from '../src/games/physics/class-12/ch10-wave-optics/slit-dash/ux';

const h = arcadeHarness(game, 'sd', 4);
type G = { hunt: ReturnType<typeof hunterRounds>; lock: ReturnType<typeof lockRounds>; gauge: ReturnType<typeof gaugeRounds>; lamp: ReturnType<typeof lampRounds> };
const build = (level: number, seed: number): G => ({
  hunt: level === 1 ? hunterRounds(createRng(seed)) : [],
  lock: level === 2 ? lockRounds(createRng(seed)) : [],
  gauge: level === 3 ? gaugeRounds(createRng(seed)) : [],
  lamp: level === 4 ? lampRounds(createRng(seed)) : [],
});
const FIRE = ['Fire the laser through the slits', 'Lock the detector here', 'Play the note at this meter reading', 'Lock the meter reading'];
const PHASE_CHECK = 'Phase check: are the two sources locked in phase?';

shellTests<G>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k, level) => h.setSlider(level === 1 ? g.hunt[k].lamSol : level === 2 ? g.lock[k].xSol : level === 3 ? g.gauge[k].sol : g.lamp[k].sol),
  setWrong: (g, k, level) =>
    h.setSlider(
      level === 1
        ? g.hunt[k].lamSol + 100
        : level === 2
          ? (g.lock[k].xSol > 6 ? g.lock[k].xSol - 2.3 : g.lock[k].xSol + 2.3)
          : level === 3
            ? (Math.min(1, g.gauge[k].sol + 0.4) === g.gauge[k].sol ? g.gauge[k].sol - 0.4 : Math.min(1, g.gauge[k].sol + 0.4))
            : g.lamp[k].sol === LAMP.max ? LAMP.max - 1 : g.lamp[k].sol + 1,
    ),
  commit: (level) => h.click(FIRE[level - 1]),
});

describe('level 1: Kestrel’s range', () => {
  it('a test shot costs a charge and tells where the stripe lands; the colour dial moves with the handle', () => {
    h.start(1, 5);
    h.click('Test shot: see where the bright stripe lands');
    expect(h.feedback()).toMatch(/bright fringe lands [\d.]+ mm from the centre; the target is at/);
    h.click('Test shot: see where the bright stripe lands');
    expect(h.feedback()).toMatch(/No charges left/);
    h.pointer('pointerdown', 70 + ((450 - 380) / 380) * 500, 312);
    h.pointer('pointermove', 70 + ((600 - 380) / 380) * 500, 312);
    expect(h.sliders()[0].value).toBe('600');
  });
  it('a stripe landing past or short of the target is described, not corrected', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(g.hunt[0].lamSol + 100);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/past the target/);
    expect(h.feedback()).not.toContain(`${g.hunt[0].lamSol} nm`);
  });
});

describe('level 2: the double lock', () => {
  it('the first bright fringe of one colour is bright for that colour only, and the message says so', () => {
    h.start(2, 5);
    const g = build(2, 5);
    const r = g.lock[0];
    h.setSlider(Math.round(((r.lam1 * 1e-9 * r.D) / (r.d * 1e-3)) * 1e4) / 10);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/Only the|Neither|Both/);
    expect(h.hearts()).toBe(2);
  });
  it('the help fades: marks, then dim patterns, then nothing until you lock', () => {
    h.start(2, 5);
    const g = build(2, 5);
    expect(h.note()).toMatch(/Marks show where the two patterns meet/);
    h.setSlider(g.lock[0].xSol);
    h.click(FIRE[1]);
    h.advance(3.8);
    expect(h.note()).toMatch(/marks are off/);
  });
});

describe('level 3: the power meter', () => {
  it('the test shot gives the amplitude, not the brightness, and dragging the needle sets the meter', () => {
    h.start(3, 5);
    h.click('Test shot: measure the resultant amplitude');
    expect(h.feedback()).toMatch(/amplitude of [\d.]+a here/);
    h.pointer('pointerdown', 470 - 130 * Math.cos(Math.PI * SLIDERS.g.start), 270 - 130 * Math.sin(Math.PI * SLIDERS.g.start));
    h.pointer('pointermove', 470 - 130 * Math.cos(Math.PI * 0.25), 270 - 130 * Math.sin(Math.PI * 0.25));
    expect(h.sliders()[0].value).toBe('0.25');
  });
});

describe('level 4: lamps or lasers', () => {
  const seeds = [5, 6, 8, 9, 11, 13, 21, 34];
  it('the meter starts at 2.5 I₀ in every round, and committing the start setting is a miss', () => {
    for (const seed of seeds) {
      h.start(4, seed);
      const g = build(4, seed);
      for (let k = 0; k < 3; k++) {
        expect(h.sliders()[0].value).toBe(String(LAMP.start));
        if (k === 0) {
          h.click(FIRE[3]);
          h.advance(2.8);
          expect(h.hearts()).toBe(2);
          expect(h.sliders()[0].value).toBe(String(LAMP.start));
        }
        h.setSlider(g.lamp[k].sol);
        h.click(FIRE[3]);
        h.advance(3.8);
      }
      expect(h.phase()).toBe('won');
    }
  });
  it('only the true brightness wins: every other meter setting costs a heart, in every round', () => {
    for (const seed of [5, 8]) {
      const g = build(4, seed);
      for (let k = 0; k < 3; k++) {
        for (let x = LAMP.min; x <= LAMP.max; x++) {
          h.start(4, seed);
          for (let j = 0; j < k; j++) {
            h.setSlider(g.lamp[j].sol);
            h.click(FIRE[3]);
            h.advance(3.8);
          }
          h.setSlider(x);
          h.click(FIRE[3]);
          h.advance(2.8);
          if (x === g.lamp[k].sol) expect(h.hearts()).toBe(3);
          else expect(h.hearts()).toBe(2);
        }
      }
    }
  });
  it('a miss says only too high or too low and prints no brightness but the setting', () => {
    h.start(4, 5);
    const g = build(4, 5);
    const r = g.lamp[0];
    const x = r.sol === LAMP.max ? 0 : LAMP.max;
    h.setSlider(x);
    h.click(FIRE[3]);
    h.advance(2.8);
    expect(h.feedback()).toBe(lampMiss(r, x));
    expect(h.feedback()).toMatch(/too (high|low) for the light at that point/);
    expect(h.feedback()).not.toMatch(/brighter|dimmer|Coherent|incoherent|φ/);
    expect(h.feedback().match(/\d+(\.\d+)?/g)).toEqual([String(x / 2)]);
  });
  it('the paid phase check costs a charge and never gives the brightness; the boss round has no charge', () => {
    h.start(4, 5);
    const g = build(4, 5);
    h.click(PHASE_CHECK);
    expect(h.feedback()).toMatch(/Phase check: the two beams keep a fixed phase difference of φ = \d+° at this point/);
    expect(h.feedback()).not.toMatch(/I₀/);
    h.click(PHASE_CHECK);
    expect(h.feedback()).toMatch(/No charges left/);
    h.setSlider(g.lamp[0].sol);
    h.click(FIRE[3]);
    h.advance(3.8);
    h.click(PHASE_CHECK);
    expect(h.feedback()).toMatch(g.lamp[1].coherent ? /Phase check: the two beams keep a fixed phase difference/ : /Phase check: the two bulbs never keep a steady phase difference/);
    h.setSlider(g.lamp[1].sol);
    h.click(FIRE[3]);
    h.advance(3.8);
    expect(h.hud()).toMatch(/BOSS/);
    h.click(PHASE_CHECK);
    expect(h.feedback()).toMatch(/No charges left/);
  });
  it('a win shows the working: coherent beams for a laser, 2I₀ everywhere for bulbs', () => {
    h.start(4, 6);
    const g = build(4, 6);
    h.setSlider(g.lamp[0].sol);
    h.click(FIRE[3]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/Coherent beams: φ = 2πΔ\/λ = .*= [\d.]+I₀\./);
    h.advance(1);
    h.setSlider(g.lamp[1].sol);
    h.click(FIRE[3]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(g.lamp[1].coherent ? /Coherent beams: φ = 2πΔ\/λ = .*= [\d.]+I₀\./ : /incoherent.*I = 2I₀ everywhere/);
  });
  it('the help fades: live waves and sum, then waves only with a charge, then nothing', () => {
    h.start(4, 5);
    const g = build(4, 5);
    expect(h.note()).toMatch(/waves and their sum are drawn live/);
    h.setSlider(g.lamp[0].sol);
    h.click(FIRE[3]);
    h.advance(3.8);
    expect(h.note()).toMatch(/waves show for a moment after a phase check, which costs a charge; the sum is hidden/);
    h.setSlider(g.lamp[1].sol);
    h.click(FIRE[3]);
    h.advance(3.8);
    expect(h.note()).toMatch(/Nothing is drawn: work it out/);
  });
  it('the hint line names the source and the path difference but not the brightness', () => {
    for (const seed of seeds) {
      h.start(4, seed);
      const r = build(4, seed).lamp[0];
      expect(h.note()).toMatch(/A laser feeds both slits\. At the marked point the path difference is Δ = (λ\/\d|0)\./);
      expect(h.note()).not.toContain(`${r.sol / 2}I₀`);
    }
  });
  it('dragging the meter knob sets the reading', () => {
    h.start(4, 5);
    h.pointer('pointerdown', 560, 280 - LAMP.start * 30);
    h.pointer('pointermove', 560, 280 - 8 * 30);
    expect(h.sliders()[0].value).toBe('8');
    h.pointer('pointermove', 560, 280 - 3 * 30);
    expect(h.sliders()[0].value).toBe('3');
  });
});

describe('Slit Dash UX pass', () => {
  const TESTS = ['Test shot: see where the bright stripe lands', 'Test shot: read the fringe order of each colour here', 'Test shot: measure the resultant amplitude', PHASE_CHECK];
  type R = ReturnType<typeof canvasRecorder>;
  const frame = (R: R, dt: number) => {
    if (dt > 0.05) h.advance(dt - 0.05);
    R.clear();
    h.advance(0.05);
    return R.rec;
  };
  /** Whether this level's helper (stripes, patterns, waves) is on the canvas this frame. */
  const helperDrawn = (level: number, rec: Rec) =>
    level === 1 ? rec.at.some((a) => /^stripe spacing /.test(a.s))
    : level === 2 ? !rec.at.some((a) => a.s === '?')
    : rec.strokes.some((s) => s.style === '#4de1ff' && s.n >= 90);
  const right = (level: number, g: G, k: number) => h.setSlider(level === 1 ? g.hunt[k].lamSol : level === 2 ? g.lock[k].xSol : level === 3 ? g.gauge[k].sol : g.lamp[k].sol);
  const wrongSet = (level: number, g: G, k: number) =>
    h.setSlider(level === 1 ? g.hunt[k].lamSol + 100 : level === 2 ? (g.lock[k].xSol > 6 ? g.lock[k].xSol - 2.3 : g.lock[k].xSol + 2.3) : level === 3 ? (g.gauge[k].sol > 0.5 ? g.gauge[k].sol - 0.4 : g.gauge[k].sol + 0.4) : g.lamp[k].sol === LAMP.max ? LAMP.max - 1 : g.lamp[k].sol + 1);
  const playTo = (level: number, seed: number, k: number) => {
    h.start(level, seed);
    const g = build(level, seed);
    for (let i = 0; i < k; i++) {
      right(level, g, i);
      h.click(FIRE[level - 1]);
      h.advance(3.8);
    }
    return g;
  };
  it('every handle is at least 18 px in radius', () => {
    expect(HANDLE_R).toBeGreaterThanOrEqual(18);
    expect(GRIP_MIN).toBeGreaterThanOrEqual(18);
  });
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level}: the goal line is drawn at round start and fades; the grip is at least 18 px; the player's own setting is beside it`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const rec = frame(R, 0.05);
      const goals = rec.at.filter((a) => /^Goal: /.test(a.s));
      expect(goals.length).toBe(1);
      expect(goals[0].y).toBeGreaterThanOrEqual(12);
      const spots: [number, number][] = [[162, 312], [440, 278], [470 - 130 * Math.cos(Math.PI * SLIDERS.g.start), 270 - 130 * Math.sin(Math.PI * SLIDERS.g.start)], [560, 280 - LAMP.start * 30]];
      const [sx, sy] = spots[level - 1];
      expect(rec.arcs.some((a) => Math.abs(a.x - sx) < 1 && Math.abs(a.y - sy) < 1 && a.r >= 18)).toBe(true);
      const own = [/^\d+ nm/, /^[\d.]+ mm$/, /^[\d.]+ K$/, /^[\d.]+ I₀$/][level - 1];
      expect(rec.at.some((a) => own.test(a.s))).toBe(true);
      expect(frame(R, 4).at.some((a) => /^Goal: /.test(a.s))).toBe(false);
    });
    it(`level ${level}: the helper is live in round 1, shows 1.5 s after a paid check in round 2, never in round 3`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      expect(helperDrawn(level, frame(R, 0.1))).toBe(true);
      expect(h.$('canvas')!.dataset.helper).toBe('1');
      const g = playTo(level, 5, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      wrongSet(level, g, 1);
      expect(helperDrawn(level, frame(R, 0.3))).toBe(false);
      expect(h.$('canvas')!.dataset.helper).toBe('0');
      h.click(TESTS[level - 1]);
      expect(helperDrawn(level, frame(R, 0.3))).toBe(true);
      expect(helperDrawn(level, frame(R, 0.8))).toBe(true);
      expect(helperDrawn(level, frame(R, 0.8))).toBe(false);
      expect(h.$('canvas')!.dataset.helper).toBe('0');
      // a miss does not bring the helper back
      h.click(FIRE[level - 1]);
      h.advance(3.8);
      expect(helperDrawn(level, frame(R, 0.3))).toBe(false);
      const g2 = playTo(level, 5, 2);
      expect(h.hud()).toMatch(/BOSS/);
      wrongSet(level, g2, 2);
      expect(helperDrawn(level, frame(R, 0.3))).toBe(false);
      // even a paid check in round 3 (levels 1 to 3 still have one) draws no helper
      if (level <= 3) {
        h.click(TESTS[level - 1]);
        expect(helperDrawn(level, frame(R, 0.3))).toBe(false);
      }
      expect(h.$('canvas')!.dataset.helper).toBe('0');
    });
  }
  it('level 1: the stripe spacing is no longer always on (it is part of the helper), and the first-touch cue ends at the first press', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    expect(frame(R, 0.1).at.some((a) => / · drag$/.test(a.s))).toBe(true);
    h.pointer('pointerdown', 162, 312);
    h.pointer('pointerup', 162, 312);
    expect(frame(R, 0.1).at.some((a) => / · drag$/.test(a.s))).toBe(false);
    playTo(1, 5, 2);
    expect(h.hud()).toMatch(/BOSS/);
    expect(frame(R, 0.3).at.some((a) => /^stripe spacing /.test(a.s))).toBe(false);
  });
});
