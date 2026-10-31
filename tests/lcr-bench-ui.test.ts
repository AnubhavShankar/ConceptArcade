// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch07-alternating-current/lcr-bench/index';
import { DIAL, NEEDLE, RING, buildRounds, fault, verdictDelay, type Round } from '../src/games/physics/class-12/ch07-alternating-current/lcr-bench/logic';
import { FADER, faderY } from '../src/games/physics/class-12/ch07-alternating-current/lcr-bench/art';
import { fmt } from '../src/core/judge';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'lcr-bench', 4);
type L = 1 | 2 | 3 | 4;
const LEVELS: L[] = [1, 2, 3, 4];
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const DROP = 'Drop the beat and play the speakers';
const METER = 'Meter check: read the meter bridge for this fader setting';

/** The answer on the fader, or one step above it. */
const answer = (r: Round) => (r.kind === 'tweet' ? r.c : r.kind === 'mid' ? r.l : r.kind === 'meters' ? r.v : r.f);
const step = (r: Round) => (r.kind === 'tweet' ? 1 : r.kind === 'mid' ? 0.1 : r.kind === 'meters' ? 1 : 5);
const above = (r: Round) => Number((answer(r) + step(r)).toFixed(6));
const set = (r: Round, right: boolean) => h.setSlider(right ? answer(r) : above(r));

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => set(g[k], true),
  setWrong: (g, k) => set(g[k], false),
  commit: () => h.click(DROP),
});

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const range = (lo: number, hi: number, st: number) => Array.from({ length: Math.round((hi - lo) / st) + 1 }, (_, i) => Number((lo + i * st).toFixed(6)));
const canvas = () => h.$('canvas')!;
const dialOf = (level: L) => DIAL[(['c', 'l', 'v', 'f'] as const)[level - 1]];
const keyOf = (level: L) => (['c', 'l', 'v', 'f'] as const)[level - 1];
const settings = (level: L) => {
  const d = dialOf(level);
  const all = range(d.min, d.max, d.step);
  return level === 3 ? all.filter((_, i) => i % 5 === 0) : all;
};
const token = (r: Round) => (r.kind === 'tweet' ? `${r.c} µF` : r.kind === 'mid' ? `${fmt(r.l)} mH` : r.kind === 'meters' ? `${r.v} V` : `${r.f} Hz`);
const asValues = (level: L, x: number) => ({ [keyOf(level)]: x });

/** Frames recorded with a fresh canvas recorder: every string drawn in one frame. */
const rec = () => canvasRecorder();
const frame = (R: ReturnType<typeof canvasRecorder>, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
const strings = (R: ReturnType<typeof canvasRecorder>, dt = 0.05) => frame(R, dt).at.map((a) => a.s);
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    set(g[k], true);
    h.click(DROP);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const LCD_RE = [/^tweeter /, /^mid /, /^[^·]+ · [^·]+ · [^·]+ V$/, /^woofer /];
const lcdDrawn = (level: number, texts: string[]) => texts.some((s) => LCD_RE[level - 1].test(s));

describe('Main Stage Soundcheck', () => {
  it('the sliders: level 1 runs 1 to 30 from 1, level 2 runs 0.1 to 4 from 0.1, level 3 runs 10 to 150 from 10, level 4 runs 20 to 300 from 20', () => {
    const want: [number, number, number, number][] = [[1, 30, 1, 1], [0.1, 4, 0.1, 0.1], [10, 150, 1, 10], [20, 300, 5, 20]];
    LEVELS.forEach((level, i) => {
      h.start(level, 5);
      expect(h.sliders().length).toBe(1);
      const [s] = h.sliders();
      expect([Number(s.min), Number(s.max), Number(s.step), Number(s.value)]).toEqual(want[i]);
    });
  });

  it('level 1 at 30 µF burns the tweeter out in every round', () => {
    for (const seed of [5, 11, 99]) {
      h.start(1, seed);
      h.setSlider(30);
      h.click(DROP);
      h.advance(2.8);
      expect(h.feedback()).toMatch(/burnt out/);
      expect(h.hearts()).toBe(2);
    }
  });

  it('level 2: for a lag row the mirror setting (same current, wrong side of resonance) goes hollow', () => {
    let tested = 0;
    for (const seed of [5, 11, 99, 7919, 13, 21, 34, 55]) {
      const r = build(2, seed)[0];
      if (r.kind !== 'mid' || !r.lag) continue;
      const lres = 1000 / ((2 * Math.PI * 1000 * r.fk) ** 2 * r.c * 1e-6);
      const mirror = Math.min(4, Math.max(0.1, Number((Math.round((2 * lres - r.l) * 10) / 10).toFixed(1))));
      h.start(2, seed);
      h.setSlider(mirror);
      h.click(DROP);
      h.advance(2.8);
      expect(canvas().dataset.take).toBeUndefined();
      expect(h.feedback()).toMatch(/hollow/);
      expect(h.feedback()).toMatch(/led the voltage/);
      tested++;
    }
    expect(tested).toBeGreaterThan(0);
  });

  it('a meter check costs a charge, then there are no charges left', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      h.click(METER);
      expect(h.feedback()).toMatch(/Meter check/);
      expect(h.hud()).toMatch(/Charges ·/);
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a win says Highs on!, In step!, Back on the mark! and Drop landed!, with the working', () => {
    const says = [/^Highs on!/, /^In step!/, /^Back on the mark!/, /^Drop landed!/];
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], true);
      h.click(DROP);
      h.advance(2.8);
      expect(h.feedback()).toMatch(says[level - 1]);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a miss costs a heart, names the player’s own setting, never the answer, and says which way to move', () => {
    const way = [/Use (less|more) capacitance\.$/, /Use (less|more) of the coil\.$/, /(Bring the master down|Push the master up)\.$/, /Pick a (higher|lower) note\.$/];
    for (const level of LEVELS) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      set(r, false);
      h.click(DROP);
      h.advance(2.8);
      const f = h.feedback();
      expect(h.hearts()).toBe(2);
      expect(has(f, token(r)), f).toBe(false);
      expect(f).toMatch(way[level - 1]);
    }
  });

  it('the hint line fades round by round', () => {
    h.start(1, 5);
    expect(h.note()).toMatch(/Round 1: the meter bridge is live/);
    const g = build(1, 5);
    set(g[0], true);
    h.click(DROP);
    h.advance(3.8);
    expect(h.note()).toMatch(/a meter check costs a charge/);
    set(g[1], true);
    h.click(DROP);
    h.advance(3.8);
    expect(h.note()).toMatch(/Headline set: no meters/);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
  });

  it('the verdict lands at 0.5 s for a burn-out or a slam, 0.6 s for distortion and 0.9 s for a quiet sound', () => {
    const cases: [L, number, number][] = [[1, 30, 0.5], [3, 150, 0.6], [4, 20, 0.5]];
    for (const [level, value, at] of cases) {
      h.start(level, 5);
      h.setSlider(value);
      h.click(DROP);
      h.advance(at - 0.15);
      expect(h.hearts()).toBe(3);
      h.advance(0.3);
      expect(h.hearts()).toBe(2);
    }
    h.start(1, 5);
    const r = build(1, 5)[0];
    h.setSlider(answer(r) - 1);
    h.click(DROP);
    h.advance(0.8);
    expect(h.hearts()).toBe(3);
    h.advance(0.3);
    expect(h.hearts()).toBe(2);
    expect(verdictDelay(r, { c: answer(r) - 1 })).toBe(0.9);
  });

  it('every animation is over by 2.4 s: after a take the scene is back to rest', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], false);
      h.click(DROP);
      h.advance(0.5);
      expect(canvas().dataset.take).toBeDefined();
      h.advance(2.0);
      expect(h.phase()).toBe('play');
      expect(canvas().dataset.take).toBeUndefined();
    }
  });

  it('the take on screen always agrees with the rules: every setting shows its own fault, and only the answer shows a win', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of LEVELS) {
      const r = build(level, 11)[0];
      for (const x of settings(level)) {
        h.start(level, 11);
        h.setSlider(x);
        h.click(DROP);
        h.advance(0.2);
        expect(canvas().dataset.take, `level ${level} at ${x}`).toBe(fault(r, asValues(level, x)) ?? 'win');
        h.advance(2.7);
      }
      h.start(level, 11);
      set(r, true);
      h.click(DROP);
      h.advance(0.2);
      expect(canvas().dataset.take).toBe('win');
      h.advance(2.7);
    }
    expect(err).not.toHaveBeenCalled();
  });

  it('the miss burst and the −1 float land at the same fixed point whichever setting was wrong', () => {
    const spots = new Set<string>();
    for (const level of LEVELS) {
      const R = rec();
      h.start(level, 11);
      set(build(level, 11)[0], false);
      h.click(DROP);
      R.clear();
      h.advance(2.8);
      const floats = R.rec.at.filter((a) => a.s === '−1 ♥');
      expect(floats.length).toBeGreaterThan(0);
      floats.forEach((a) => spots.add(String(a.x)));
    }
    expect([...spots]).toEqual(['320']);
  });

  it('the fixed effects: the sound rings take only the strengths 0.25 and 1', () => {
    const strengths = new Set<string>();
    for (const level of LEVELS) {
      const r = build(level, 11)[0];
      for (const x of settings(level).filter((_, i) => i % 4 === 0).concat(answer(r))) {
        h.start(level, 11);
        h.setSlider(x);
        h.click(DROP);
        for (let i = 0; i < 40; i++) {
          h.advance(0.05);
          const a = canvas().dataset.ring;
          if (a) strengths.add(a);
        }
      }
    }
    expect([...strengths].sort()).toEqual([RING.faint.toFixed(2), RING.right.toFixed(2)]);
  });

  it('level 3: the needles rest at zero before Fire, then swing to 50% (low), 100% (right) or 125% (high) of the soundcheck mark', () => {
    const r = build(3, 11)[0];
    const cases: [number, number][] = [[answer(r) - 1, NEEDLE.low], [answer(r), NEEDLE.right], [answer(r) + 1, NEEDLE.high]];
    for (const [v, want] of cases) {
      h.start(3, 11);
      h.setSlider(v);
      h.advance(0.2);
      expect(canvas().dataset.needle).toBeUndefined();
      h.click(DROP);
      h.advance(1.2);
      expect(Number(canvas().dataset.needle)).toBeCloseTo(want, 2);
    }
  });

  it('level 3: the master’s amp display reads MASTER, and level 1 shows the supply voltage', () => {
    const R = rec();
    h.start(3, 5);
    expect(strings(R)).toContain('MASTER');
    h.start(1, 5);
    const r = build(1, 5)[0];
    if (r.kind === 'tweet') expect(strings(R)).toContain(`${r.v} V`);
  });
});

describe('Main Stage Soundcheck UX', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the goal line is drawn at round start and fades after Fire; the fader ring is 20 px; the readout shows the player’s own setting`, () => {
      const R = rec();
      h.start(level, 5);
      const f1 = frame(R);
      const goalWords = [/^Tweeter needs /, /^Mid needs /, /^Match the soundcheck meters$/, /^Woofer needs /][level - 1];
      const goal = f1.at.filter((a) => goalWords.test(a.s));
      expect(goal.length).toBe(1);
      expect(goal[0].y).toBeGreaterThanOrEqual(12);
      const d = dialOf(level);
      const fy = faderY(d.start, d.min, d.max);
      expect(f1.arcs.some((a) => Math.abs(a.x - FADER.x) < 1 && Math.abs(a.y - fy) < 1 && a.r >= 18)).toBe(true);
      const read = f1.at.map((a) => a.s);
      const own = [`${d.start} µF`, `${fmt(d.start)} mH`, `${d.start} V`, `${d.start} Hz`][level - 1];
      expect(read).toContain(own);
      h.click(DROP);
      h.advance(0.3);
      const during = strings(R);
      expect(during.some((s) => goalWords.test(s))).toBe(false);
      expect(during).not.toContain(own);
    });
  }

  it('level 1 round 1 pulses the fader with a drag cue until the first touch', () => {
    const R = rec();
    h.start(1, 5);
    expect(strings(R)).toContain('drag');
    h.pointer('pointerdown', 330, 300);
    expect(strings(R)).not.toContain('drag');
    h.start(1, 5);
    h.setSlider(build(1, 5)[0].kind === 'tweet' ? (build(1, 5)[0] as { c: number }).c : 1);
    h.click(DROP);
    h.advance(3.8);
    expect(strings(R)).not.toContain('drag');
  });

  it('every label on the scene is at least 11 px', () => {
    const fonts = new Set<number>();
    const store: Record<string, unknown> = {};
    const proxy = new Proxy(store, {
      get: (_t, p) => (p === 'fillText' ? () => fonts.add(Number(/(\d+(\.\d+)?)px/.exec(String(store.font))?.[1])) : () => undefined),
      set: (_t, p, v) => ((store[String(p)] = v), true),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
    for (const level of LEVELS) {
      h.start(level, 5);
      h.advance(0.5);
    }
    expect(Math.min(...fonts)).toBeGreaterThanOrEqual(11);
  });
});

describe('Main Stage Soundcheck never leaks the answer', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the meter bridge is live in round 1, shows for 1.5 s after a meter check in round 2, and never in round 3`, () => {
      const R = rec();
      h.start(level, 5);
      expect(lcdDrawn(level, strings(R))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(lcdDrawn(level, strings(R, 0.3))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      for (const x of settings(level).filter((_, i) => i % 5 === 0)) {
        h.setSlider(x);
        expect(lcdDrawn(level, strings(R))).toBe(false);
      }
      h.click(METER);
      expect(lcdDrawn(level, strings(R, 0.3))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      expect(lcdDrawn(level, strings(R, 1.0))).toBe(true);
      expect(lcdDrawn(level, strings(R, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
      set(g[1], true);
      h.click(DROP);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const x of settings(level).filter((_, i) => i % 3 === 0)) {
        h.setSlider(x);
        expect(lcdDrawn(level, strings(R))).toBe(false);
      }
      set(g[2], true);
      expect(lcdDrawn(level, strings(R))).toBe(false);
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(lcdDrawn(level, strings(R, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
    });
  }

  it('no drawn text contains the round’s answer before the player sets it (all three rounds, every other setting)', () => {
    for (const level of LEVELS) {
      const R = rec();
      h.start(level, 5);
      const g = build(level, 5);
      for (let k = 0; k < 3; k++) {
        const r = g[k];
        const tk = token(r);
        for (const x of settings(level)) {
          if (x === answer(r)) continue; // the readout shows the player's own setting
          h.setSlider(x);
          const texts = strings(R);
          expect(texts.some((s) => has(s, tk)), `level ${level} round ${k + 1} at ${x}`).toBe(false);
        }
        if (k < 2) {
          set(r, true);
          h.click(DROP);
          h.advance(2.8);
          h.advance(1);
        }
      }
    }
  });

  it('level 3: the written readings and the soundcheck ticks are the same at every master setting', () => {
    const R = rec();
    h.start(3, 5);
    const r = build(3, 5)[0];
    if (r.kind !== 'meters') throw new Error('meters');
    for (const v of [10, 50, 100, 150]) {
      h.setSlider(v);
      const texts = strings(R);
      for (const s of ['V_R', 'V_L', 'V_C', `${r.vr} V`, `${r.vl} V`, `${r.vc} V`]) expect(texts).toContain(s);
    }
  });

  it('the rack and the crowd look the same before every take, whatever the setting', () => {
    for (const level of LEVELS) {
      const R = rec();
      h.start(level, 5);
      const shapes = new Set<number>();
      for (const x of settings(level).filter((_, i) => i % 6 === 0)) {
        h.setSlider(x);
        shapes.add(frame(R).at.filter((a) => a.s === 'V_R' || a.s === 'LIMIT' || a.s === 'DROP').length);
      }
      expect(shapes.size).toBe(1);
    }
  });
});
