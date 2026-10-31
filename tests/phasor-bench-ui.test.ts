// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch07-alternating-current/phasor-bench/index';
import { DIAL, PLUME, buildRounds, fault, goal, type Round } from '../src/games/physics/class-12/ch07-alternating-current/phasor-bench/logic';
import { clipX, KNOB, PHASOR, knobAngle } from '../src/games/physics/class-12/ch07-alternating-current/phasor-bench/art';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'phasor-bench', 4);
type L = 1 | 2 | 3 | 4;
const LEVELS: L[] = [1, 2, 3, 4];
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const SWITCH = 'Flip the stall switch and serve';
const METER = 'Meter check: read the stall meter for this setting';
const answer = (r: Round) => (r.kind === 'coil' ? r.r : r.kind === 'scope' ? r.v : r.kind === 'brew' ? r.t : r.th);
const STEP = [1, 10, 10, 5];
const dial = (level: number) => [DIAL.r, DIAL.v, DIAL.t, DIAL.th][level - 1];
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const scan = (level: number) => range(dial(level).min, dial(level).max, dial(level).step);
const level = (r: Round): L => (r.kind === 'coil' ? 1 : r.kind === 'scope' ? 2 : r.kind === 'brew' ? 3 : 4);
const setRound = (r: Round, right: boolean) => h.setSlider(answer(r) + (right ? 0 : STEP[level(r) - 1]));

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => setRound(g[k], true),
  setWrong: (g, k) => setRound(g[k], false),
  commit: () => h.click(SWITCH),
});

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const canvas = () => h.$('canvas')!;
const token = (r: Round) => (r.kind === 'coil' ? `${r.r} Ω` : r.kind === 'scope' ? `${r.v} V` : r.kind === 'brew' ? `${r.t} s` : `${r.th}°`);

/** Install the recorder (after the harness's beforeEach) and read one frame's drawn strings. */
const recorder = () => canvasRecorder();
type Rec = ReturnType<typeof recorder>;
const frame = (c: Rec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  c.clear();
  h.advance(0.05);
  return texts(c.rec);
};
const playTo = (lv: number, round: number, seed = 5) => {
  const g = build(lv, seed);
  for (let k = 0; k < round; k++) {
    setRound(g[k], true);
    h.click(SWITCH);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
/** The LCD's live text in each level (the kettle plate, the slip and the goal line never match these). */
const LCD_RE = [/^P .* W$/, /^power .*%$/, /^heat .* kJ$/, /^-?[\d.]+ [VA] at \d+°$/];
const lcdDrawn = (lv: number, ts: string[]) => ts.some((s) => LCD_RE[lv - 1].test(s));

describe('Chai Before the Whistle', () => {
  it('level 1’s slider runs 10 to 120 and starts at 120; level 2’s runs 100 to 250 from 100; level 3’s 30 to 300 from 30; level 4’s 0 to 355 from 0', () => {
    const want: [number, number, number, number][] = [[10, 120, 120, 1], [100, 250, 100, 10], [30, 300, 30, 10], [0, 355, 0, 5]];
    LEVELS.forEach((lv, i) => {
      h.start(lv, 5);
      expect(h.sliders().length).toBe(1);
      const s = h.sliders()[0];
      expect([Number(s.min), Number(s.max), Number(s.value), Number(s.step)]).toEqual(want[i]);
    });
  });

  it('level 1 at 10 ohms blows the fuse', () => {
    h.start(1, 5);
    h.setSlider(10);
    h.click(SWITCH);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/fuse/);
    expect(h.hearts()).toBe(2);
  });

  it('a meter check costs a charge, then there are no charges left', () => {
    for (const lv of LEVELS) {
      h.start(lv, 5);
      h.click(METER);
      expect(h.feedback()).toMatch(/Meter check/);
      expect(h.hud()).toMatch(/Charges ·/);
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a win says Served! in levels 1 to 3 and Got the shot! in level 4, with the working', () => {
    for (const lv of LEVELS) {
      h.start(lv, 5);
      setRound(build(lv, 5)[0], true);
      h.click(SWITCH);
      h.advance(2.8);
      expect(h.feedback()).toMatch(lv === 4 ? /^Got the shot!/ : /^Served!/);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a miss never states the answer, names the player’s own value, and costs a heart', () => {
    for (const lv of LEVELS) {
      h.start(lv, 5);
      const r = build(lv, 5)[0];
      setRound(r, false);
      h.click(SWITCH);
      h.advance(2.8);
      expect(h.hearts()).toBe(2);
      expect(has(h.feedback(), token(r))).toBe(false);
      const own = answer(r) + STEP[lv - 1];
      expect(has(h.feedback(), lv === 1 ? `${own} Ω` : lv === 2 ? `${own} V` : lv === 3 ? `${own} s` : `${own}°`)).toBe(true);
    }
  });

  it('the hint line fades round by round', () => {
    h.start(1, 5);
    expect(h.note()).toMatch(/Round 1: the stall meter is live/);
    const g = build(1, 5);
    setRound(g[0], true);
    h.click(SWITCH);
    h.advance(3.8);
    expect(h.note()).toMatch(/a meter check costs a charge/);
    setRound(g[1], true);
    h.click(SWITCH);
    h.advance(3.8);
    expect(h.note()).toMatch(/Last train: no meter/);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
  });

  it('every animation is over by 2.4 s: after a take the scene is back to rest', () => {
    for (const lv of LEVELS) {
      h.start(lv, 5);
      setRound(build(lv, 5)[0], false);
      h.click(SWITCH);
      h.advance(0.5);
      expect(canvas().dataset.take).toBeDefined();
      h.advance(2.0);
      expect(h.phase()).toBe('play');
      expect(canvas().dataset.take).toBeUndefined();
    }
  });

  it('the verdict lands at 0.55 s (blow), 1.05 s (weak), 1.10 s (win) in levels 1 and 2, 1.0 s in level 3 and 0.8 s in level 4', () => {
    const at = (lv: number, x: number, secs: number, seed = 5) => {
      h.start(lv, seed);
      h.setSlider(x);
      h.click(SWITCH);
      h.advance(secs - 0.1);
      const before = h.hearts();
      h.advance(0.2);
      return [before, h.hearts()];
    };
    for (const lv of [1, 2]) {
      const r = build(lv, 5)[0];
      expect(at(lv, answer(r) - STEP[lv - 1], 0.55)).toEqual([3, 2]);
      expect(at(lv, answer(r) + STEP[lv - 1], 1.05)).toEqual([3, 2]);
      h.start(lv, 5);
      h.setSlider(answer(r));
      h.click(SWITCH);
      h.advance(1.0);
      expect(h.score()).toBe(0);
      h.advance(0.2);
      expect(h.score()).toBeGreaterThan(0);
    }
    expect(at(3, answer(build(3, 5)[0]) + 10, 1.0)).toEqual([3, 2]);
    expect(at(4, answer(build(4, 5)[0]) + 5, 0.8)).toEqual([3, 2]);
  });

  it('the take on screen always agrees with the rules, and its effects take only the fixed values', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const seen = new Map<string, Set<string>>();
    for (const lv of LEVELS) {
      const r = build(lv, 11)[0];
      for (const x of scan(lv)) {
        h.start(lv, 11);
        h.setSlider(x);
        h.click(SWITCH);
        h.advance(0.5);
        const f = fault(r, lv === 1 ? { r: x } : lv === 2 ? { v: x } : lv === 3 ? { t: x } : { th: x });
        const take = f ?? 'win';
        expect(canvas().dataset.take).toBe(take);
        const k = `${lv}:${take}`;
        if (!seen.has(k)) seen.set(k, new Set());
        seen.get(k)!.add(`${canvas().dataset.plume}|${canvas().dataset.glow}`);
        if (lv === 4) {
          h.advance(0.3);
          expect(canvas().dataset.photo).toBe(take);
        }
        h.advance(2.0);
      }
    }
    const want: Record<string, string> = {
      '1:blow': '0|off', '1:weak': `${PLUME.weak}|red`, '1:win': `${PLUME.right}|orange`,
      '2:blow': '0|off', '2:weak': `${PLUME.weak}|red`, '2:win': `${PLUME.right}|orange`,
      '3:cold': `${PLUME.weak}|orange`, '3:over': `${PLUME.over}|orange`, '3:win': `${PLUME.right}|orange`,
      '4:early': '0|orange', '4:late': '0|orange', '4:win': '0|orange',
    };
    for (const [k, vals] of seen) expect([...vals], k).toEqual([want[k]]);
    expect(err).not.toHaveBeenCalled();
  });

  it('the stove glows white just before the fuse blows, dull red when weak and orange when right', () => {
    for (const lv of [1, 2]) {
      const r = build(lv, 11)[0];
      const cases: [number, string][] = [[answer(r) - STEP[lv - 1], 'white'], [answer(r) + STEP[lv - 1], 'red'], [answer(r), 'orange']];
      for (const [x, colour] of cases) {
        h.start(lv, 11);
        h.setSlider(x);
        h.click(SWITCH);
        h.advance(0.3);
        expect(canvas().dataset.glow).toBe(colour);
      }
    }
  });

  it('the train leaves only on a weak coil or selector in levels 1 and 2, never otherwise', () => {
    for (const lv of [1, 2, 3, 4]) {
      const r = build(lv, 11)[0];
      for (const x of [answer(r) - STEP[lv - 1], answer(r), answer(r) + STEP[lv - 1]]) {
        h.start(lv, 11);
        h.setSlider(x);
        h.click(SWITCH);
        h.advance(2.0);
        const departed = Number(canvas().dataset.train) > 0;
        expect(departed).toBe(lv <= 2 && x > answer(r));
      }
    }
  });

  it('the miss burst and the −1 float land at the same fixed point whichever setting was wrong', () => {
    const spots = new Set<string>();
    for (const lv of LEVELS) {
      const c = recorder();
      h.start(lv, 11);
      setRound(build(lv, 11)[0], false);
      h.click(SWITCH);
      c.clear();
      h.advance(2.8);
      const floats = c.rec.at.filter((a) => a.s === '−1 ♥');
      expect(floats.length).toBeGreaterThan(0);
      floats.forEach((a) => spots.add(`${a.x},${a.y}`));
    }
    expect([...spots].every((s) => s.startsWith('320,'))).toBe(true);
    expect(new Set([...spots].map((s) => s.split(',')[0])).size).toBe(1);
  });
});

describe('the handles', () => {
  it('level 1: dragging the clip along the coil sets the resistance', () => {
    h.start(1, 5);
    h.pointer('pointerdown', clipX(120), 290);
    h.pointer('pointermove', clipX(60), 290);
    expect(Number(h.sliders()[0].value)).toBeGreaterThanOrEqual(59);
    expect(Number(h.sliders()[0].value)).toBeLessThanOrEqual(61);
    h.pointer('pointerup', 0, 0);
  });
  it('level 2: turning the knob sets the selector, snapped to 10 V', () => {
    h.start(2, 5);
    const a = knobAngle(100);
    h.pointer('pointerdown', KNOB.x + KNOB.tip * Math.sin(a), KNOB.y - KNOB.tip * Math.cos(a));
    h.pointer('pointermove', KNOB.x, KNOB.y - 30);
    const v = Number(h.sliders()[0].value);
    expect(v % 10).toBe(0);
    expect(v).toBeGreaterThanOrEqual(170);
    expect(v).toBeLessThanOrEqual(180);
    h.pointer('pointerup', 0, 0);
  });
  it('level 3: dragging along the bottom track sets the timer', () => {
    h.start(3, 5);
    h.pointer('pointerdown', 60, 322);
    h.pointer('pointermove', 320, 322);
    expect(Number(h.sliders()[0].value)).toBe(170);
    h.pointer('pointerup', 0, 0);
  });
  it('level 4: swinging the phasor arm sets the angle, snapped to 5 degrees', () => {
    h.start(4, 5);
    h.pointer('pointerdown', PHASOR.x + PHASOR.r, PHASOR.y);
    h.pointer('pointermove', PHASOR.x, PHASOR.y - 40);
    expect(Number(h.sliders()[0].value)).toBe(90);
    h.pointer('pointerup', 0, 0);
  });
  it('level 1 round 1 pulses a drag cue until the first touch of the canvas', () => {
    const c = recorder();
    h.start(1, 5);
    expect(frame(c)).toContain('drag');
    h.pointer('pointerdown', 10, 10);
    expect(frame(c)).not.toContain('drag');
  });
  it('every control has an aria-label', () => {
    for (const lv of LEVELS) {
      h.start(lv, 5);
      for (const el of h.$('.lab-controls')!.querySelectorAll('button, input')) expect(el.getAttribute('aria-label')?.length).toBeGreaterThan(3);
    }
  });
});

describe('Chai Before the Whistle never leaks the answer', () => {
  it('the goal line is drawn at the start of every round', () => {
    for (const lv of LEVELS) {
      const c = recorder();
      h.start(lv, 5);
      const g = build(lv, 5);
      expect(frame(c)).toContain(goal(g[0]));
      playTo(lv, 1);
      expect(frame(c, 1.0)).toContain(goal(g[1]));
    }
  });

  for (const lv of LEVELS) {
    it(`level ${lv}: the meter LCD is live in round 1, shows for 1.5 s after a meter check in round 2, and never in round 3`, () => {
      const c = recorder();
      h.start(lv, 5);
      expect(lcdDrawn(lv, frame(c))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      const g = playTo(lv, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(lcdDrawn(lv, frame(c, 0.3))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      for (const x of scan(lv).filter((_, i) => i % 5 === 0)) {
        h.setSlider(x);
        expect(lcdDrawn(lv, frame(c))).toBe(false);
      }
      h.click(METER);
      expect(lcdDrawn(lv, frame(c, 0.3))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      expect(lcdDrawn(lv, frame(c, 1.0))).toBe(true);
      expect(lcdDrawn(lv, frame(c, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(lcdDrawn(lv, frame(c, 0.5))).toBe(false);
      setRound(g[1], true);
      h.click(SWITCH);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const x of scan(lv).filter((_, i) => i % 3 === 0)) {
        h.setSlider(x);
        expect(lcdDrawn(lv, frame(c))).toBe(false);
      }
      setRound(g[2], true);
      expect(lcdDrawn(lv, frame(c))).toBe(false);
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(lcdDrawn(lv, frame(c, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
    });
  }

  it('no drawn text contains the round’s answer before the player sets it (all three rounds, every other setting)', () => {
    for (const lv of LEVELS) {
      const c = recorder();
      h.start(lv, 5);
      const g = build(lv, 5);
      for (let k = 0; k < 3; k++) {
        const r = g[k];
        for (const x of scan(lv)) {
          if (x === answer(r)) continue; // the readout shows the player's own setting
          h.setSlider(x);
          expect(frame(c).some((s) => has(s, token(r))), `${lv}/${k}/${x}`).toBe(false);
        }
        if (k < 2) {
          setRound(r, true);
          h.click(SWITCH);
          h.advance(2.8);
          h.advance(1);
        }
      }
    }
  });

  it('level 4 draws no voltage arrow but the player’s own arm: exactly one cyan stroke on the phasor circle at every angle', () => {
    const c = recorder();
    h.start(4, 5);
    for (const x of scan(4).filter((_, i) => i % 4 === 0)) {
      h.setSlider(x);
      c.clear();
      h.advance(0.05);
      expect(c.rec.strokes.filter((s) => s.style === '#4de1ff').length).toBe(1);
    }
  });

  it('the scope shows the peak only in level 2, as a given fact', () => {
    const c = recorder();
    h.start(2, 5);
    const r = build(2, 5)[0] as Extract<Round, { kind: 'scope' }>;
    expect(frame(c)).toContain(`${r.vm} V peak`);
    h.start(1, 5);
    expect(frame(c).some((s) => / V peak$/.test(s))).toBe(false);
  });
});
