// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/field-maker/index';
import { DIAL, buildRounds, fault, goal, verdictDelay, type Round, type Values } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/field-maker/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'field-maker', 5);
type L = 1 | 2 | 3 | 4 | 5;
const LEVELS: L[] = [1, 2, 3, 4, 5];
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const FIRE = 'Switch on the coil and start the trial';
const TEST = 'Meter check: read the field meter for this setting';
function set(r: Round, right: boolean) {
  if (r.kind === 'trim') { h.setSlider(r.dir, 0); h.setSlider(right ? r.i : r.i + 1, 1); }
  else if (r.kind === 'arc') { h.setSlider(r.sense, 0); h.setSlider(right ? r.deg : r.deg + 30, 1); }
  else { h.setSlider(r.sense, 0); h.setSlider(right ? r.n : r.n + 5, 1); }
}
shellTests<Round[]>(h, { levels: [1, 2, 3, 4, 5], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const canvas = () => h.$('canvas')!;

// A canvas recorder: every string drawn, with its position.
const recorder = () => {
  const rec = { at: [] as { s: string; x: number; y: number }[] };
  const proxy = new Proxy({}, {
    get: (_t, p) => (p === 'fillText' ? (s: string, x: number, y: number) => rec.at.push({ s: String(s), x, y }) : () => undefined),
    set: () => true,
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  return rec;
};
type Rec = ReturnType<typeof recorder>;
const frameAt = (rec: Rec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rec.at.length = 0;
  h.advance(0.05);
  return rec.at.slice();
};
const frame = (rec: Rec, dt = 0.05) => frameAt(rec, dt).map((a) => a.s);
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    set(g[k], true);
    h.click(FIRE);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

/** Every setting of the level's dials. */
const settings = (level: L): Values[] => {
  if (level === 1) return [0, 1].flatMap((dir) => range(DIAL.i.min, DIAL.i.max).map((i) => ({ dir, i })));
  if (level === 3) return [0, 1].flatMap((sense) => range(DIAL.deg.min, DIAL.deg.max, DIAL.deg.step).map((deg) => ({ sense, deg })));
  return [0, 1].flatMap((sense) => range(DIAL.n.min, DIAL.n.max, DIAL.n.step).map((n) => ({ sense, n })));
};
const apply = (x: Values) => {
  const vals = x.dir !== undefined ? [x.dir, x.i!] : x.deg !== undefined ? [x.sense!, x.deg] : [x.sense!, x.n!];
  vals.forEach((v, i) => h.setSlider(v, i));
};
const token = (r: Round) => (r.kind === 'trim' ? `${r.i} A` : r.kind === 'arc' ? `${r.deg}°` : `${r.n} turns`);
const own = (r: Round, x: Values) => (r.kind === 'trim' ? x.i === r.i : r.kind === 'arc' ? x.deg === r.deg : x.n === r.n);
const LCD_RE = [/^[\d.]+ nT [⊙⊗]/, /^[\d.]+ µT [⊙⊗]/, /^[\d.]+ µT [⊙⊗]/, /^[\d.]+ µT [⊙⊗]/, /^net [\d.]+ µT/];
const lcdDrawn = (level: number, texts: string[]) => texts.some((s) => LCD_RE[level - 1].test(s));

describe('Turtle Compass', () => {
  it('level 1 has Direction (0 to 1, start 0) and Current (1 to 30, start 1)', () => {
    h.start(1, 5);
    const ss = h.sliders();
    expect(ss.length).toBe(2);
    const labels = [...document.querySelectorAll('.control-label')].map((e) => e.textContent);
    expect(labels).toEqual(['Direction', 'Current']);
    expect([Number(ss[0].min), Number(ss[0].max), Number(ss[0].value)]).toEqual([0, 1, 0]);
    expect([Number(ss[1].min), Number(ss[1].max), Number(ss[1].value)]).toEqual([1, 30, 1]);
  });

  it('level 3 has Sense and Arc (30 to 360, step 30, start 30)', () => {
    h.start(3, 5);
    const ss = h.sliders();
    expect(ss.length).toBe(2);
    const labels = [...document.querySelectorAll('.control-label')].map((e) => e.textContent);
    expect(labels).toEqual(['Sense', 'Arc']);
    expect([Number(ss[1].min), Number(ss[1].max), Number(ss[1].step), Number(ss[1].value)]).toEqual([30, 360, 30, 30]);
  });

  it('level 5 has Outer sense and Outer turns (5 to 150, step 5, start 5)', () => {
    h.start(5, 5);
    const ss = h.sliders();
    const labels = [...document.querySelectorAll('.control-label')].map((e) => e.textContent);
    expect(labels).toEqual(['Outer sense', 'Outer turns']);
    expect([Number(ss[1].min), Number(ss[1].max), Number(ss[1].step), Number(ss[1].value)]).toEqual([5, 150, 5, 5]);
  });

  it('in level 2 the right turns with the other sense is a miss that says Reverse the current, and costs a heart', () => {
    h.start(2, 5);
    const r = build(2, 5)[0] as Extract<Round, { kind: 'coil' }>;
    h.setSlider(1 - r.sense, 0);
    h.setSlider(r.n, 1);
    h.click(FIRE);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/Reverse the current/);
    expect(h.hearts()).toBe(2);
  });

  it('a meter check costs a charge, then there are no charges left', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      h.click(TEST);
      expect(h.feedback()).toMatch(/Meter check:/);
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a win says Calibrated! in level 1 and Nui swims for the open sea! in levels 2 to 5', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      set(g[0], true);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(level === 1 ? /^Calibrated!/ : /^Nui swims for the open sea!/);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a miss never states the answer and costs a heart', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      set(g[0], false);
      h.click(FIRE);
      h.advance(2.8);
      const r = g[0];
      expect(h.hearts()).toBe(2);
      if (r.kind === 'trim' || r.kind === 'arc' || r.kind === 'coil' || r.kind === 'axis') expect(has(h.feedback(), token(r))).toBe(false);
    }
  });

  it('the hint line fades round by round', () => {
    h.start(2, 5);
    expect(h.note()).toMatch(/Round 1: the field meter is live/);
    const g = build(2, 5);
    set(g[0], true);
    h.click(FIRE);
    h.advance(3.8);
    expect(h.note()).toMatch(/a meter check costs a charge/);
    set(g[1], true);
    h.click(FIRE);
    h.advance(3.8);
    expect(h.note()).toMatch(/Last trial: no meter/);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
  });

  it('the verdict lands at the impact: 0.9 s in level 1, 1.2 s in levels 2 to 5', () => {
    h.start(1, 5);
    set(build(1, 5)[0], false);
    h.click(FIRE);
    h.advance(0.8);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
    for (const level of [2, 3, 4, 5]) {
      h.start(level, 5);
      set(build(level, 5)[0], false);
      h.click(FIRE);
      h.advance(1.1);
      expect(h.hearts(), `level ${level}`).toBe(3);
      h.advance(0.2);
      expect(h.hearts(), `level ${level}`).toBe(2);
    }
    expect(build(1, 5).map(verdictDelay)).toEqual([0.9, 0.9, 0.9]);
  });

  it('every animation is over by 2.4 s', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], false);
      h.click(FIRE);
      h.advance(0.5);
      expect(canvas().dataset.take).toBeDefined();
      h.advance(2.0);
      expect(h.phase()).toBe('play');
      expect(canvas().dataset.take).toBeUndefined();
    }
  });

  it('the take on screen agrees with the rules: every setting shows its own fault, and only the answer shows a win', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of LEVELS) {
      const r = build(level, 11)[0];
      settings(level).filter((_, i) => i % 3 === 0 || fault(r, _) === null).forEach((x) => {
        h.start(level, 11);
        apply(x);
        h.click(FIRE);
        h.advance(0.2);
        expect(canvas().dataset.take).toBe(fault(r, x) ?? 'win');
        h.advance(2.7);
      });
    }
    expect(err).not.toHaveBeenCalled();
  });

  it('the miss burst and the −1 float land at the same fixed point whichever setting was wrong', () => {
    const spots = new Set<string>();
    for (const level of LEVELS) {
      const rec = recorder();
      h.start(level, 11);
      set(build(level, 11)[0], false);
      h.click(FIRE);
      rec.at.length = 0;
      h.advance(2.8);
      const floats = rec.at.filter((a) => a.s === '−1 ♥');
      expect(floats.length).toBeGreaterThan(0);
      floats.forEach((a) => spots.add(String(a.x)));
    }
    expect([...spots]).toEqual(['320']);
  });
});

describe('Turtle Compass never leaks the answer', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the meter is live in round 1, shows for 1.5 s after a meter check in round 2, and never in round 3`, () => {
      const rec = recorder();
      h.start(level, 5);
      expect(lcdDrawn(level, frame(rec))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(lcdDrawn(level, frame(rec, 0.3))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      for (const x of settings(level as L).filter((_, i) => i % 7 === 0)) {
        apply(x);
        expect(lcdDrawn(level, frame(rec))).toBe(false);
      }
      h.click(TEST);
      expect(lcdDrawn(level, frame(rec, 0.3))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      expect(lcdDrawn(level, frame(rec, 1.0))).toBe(true);
      expect(lcdDrawn(level, frame(rec, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(lcdDrawn(level, frame(rec, 0.5))).toBe(false);
      set(g[1], true);
      h.click(FIRE);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const x of settings(level as L).filter((_, i) => i % 5 === 0)) {
        apply(x);
        expect(lcdDrawn(level, frame(rec))).toBe(false);
      }
      set(g[2], true);
      expect(lcdDrawn(level, frame(rec))).toBe(false);
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(lcdDrawn(level, frame(rec, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
    });
  }

  it('no drawn text contains the answer before fire (all three rounds, every other setting), and the goal line shows at round start', () => {
    for (const level of LEVELS) {
      const rec = recorder();
      h.start(level, 5);
      const g = build(level, 5);
      for (let k = 0; k < 3; k++) {
        const r = g[k];
        expect(frame(rec)).toContain(goal(r));
        if (level !== 5) {
          for (const x of settings(level as L)) {
            if (own(r, x)) continue; // the readout shows the player's own setting
            apply(x);
            expect(frame(rec).some((s) => has(s, token(r)))).toBe(false);
          }
        }
        if (k < 2) {
          set(r, true);
          h.click(FIRE);
          h.advance(2.8);
          h.advance(1);
        }
      }
    }
  });

  it('level 5 draws no turn count of the answer before fire', () => {
    const rec = recorder();
    h.start(5, 5);
    const r = build(5, 5)[0] as Extract<Round, { kind: 'pair' }>;
    for (const x of settings(5)) {
      if (x.n === r.n) continue;
      apply(x);
      expect(frame(rec).some((s) => has(s, `${r.n} turns`))).toBe(false);
    }
  });

  it('no field symbol is drawn inside the tank before fire', () => {
    for (const level of LEVELS) {
      const rec = recorder();
      h.start(level, 5);
      for (const x of settings(level as L).filter((_, i) => i % 9 === 0)) {
        apply(x);
        const inside = frameAt(rec).filter((a) => (a.s === '⊙' || a.s === '⊗') && Math.abs(a.x - 320) < 84 && Math.abs(a.y - 176) < 84);
        expect(inside.length).toBe(0);
      }
    }
  });

  it('during a trial the field symbols appear over the tank, only in the field the player made', () => {
    const rec = recorder();
    h.start(2, 5);
    const r = build(2, 5)[0] as Extract<Round, { kind: 'coil' }>;
    h.setSlider(1 - r.sense, 0);
    h.setSlider(r.n, 1);
    h.click(FIRE);
    h.advance(0.3);
    const during = frameAt(rec).filter((a) => a.s === '⊙' || a.s === '⊗');
    expect(during.length).toBeGreaterThan(0);
    const want = 1 - r.sense === 1 ? '⊙' : '⊗';
    expect(new Set(during.filter((a) => Math.abs(a.x - 320) < 84 && Math.abs(a.y - 176) < 84).map((a) => a.s))).toEqual(new Set([want]));
  });
});
