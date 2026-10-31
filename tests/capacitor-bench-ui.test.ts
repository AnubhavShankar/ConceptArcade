// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/index';
import { DIAL, buildRounds, cueRt, fault, flashRt, verdictDelay, type Round } from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';
import { RACK, RIG, crankXFor, plateW, slotX, topY } from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/art';
import { GRIP_MIN } from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/ux';

const h = arcadeHarness(game, 'capacitor-bench', 4);
type L = 1 | 2 | 3 | 4;
const LEVELS: L[] = [1, 2, 3, 4];
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const ACTION = 'Call action and pull the discharge lever';
const METER = 'Meter check: read the rig meter for this setting';

function set(r: Round, right: boolean) {
  if (r.kind === 'wake') h.setSlider(right ? r.v : r.v + 1);
  if (r.kind === 'gap') h.setSlider(right ? r.d : r.d + 1);
  if (r.kind === 'panel') {
    h.setSlider(r.k, 0);
    h.setSlider(right === r.on ? 1 : 0, 1);
  }
  if (r.kind === 'flash') {
    h.setSlider(right ? r.d : r.d < 12 ? r.d + 1 : r.d - 1, 0); // one row has d = 12
    h.setSlider(r.a, 1);
  }
}
shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => set(g[k], true),
  setWrong: (g, k) => set(g[k], false),
  commit: () => h.click(ACTION),
});

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
const frame = (rec: Rec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rec.at.length = 0;
  h.advance(0.05);
  return rec.at.map((a) => a.s);
};
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    set(g[k], true);
    h.click(ACTION);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
/** The LCD's live text in each level (the fixed notch label "32 µC" and the CUE tick never match these). */
/** Two-line readings are drawn as two strings (split at the dot), so each line has its own pattern. */
const LCD_RE = [/^Q .* µC$/, /^C .* nF$/, /^after: .* kV$/, /^fires .* kV$/];
const lcdDrawn = (level: number, texts: string[]) => texts.some((s) => LCD_RE[level - 1].test(s));
/** Every setting of the level's dials that the scan covers (the first dial, or a pair for level 3). */
const settings = (level: L, r: Round): Record<string, number>[] => {
  if (level === 1) return range(DIAL.v.min, DIAL.v.max).map((v) => ({ v }));
  if (level === 2) return range(DIAL.d.min, DIAL.d.max).map((d) => ({ d }));
  if (level === 3) return range(1, 6).flatMap((k) => [0, 1].map((on) => ({ k, on })));
  return range(DIAL.d.min, DIAL.d.max).flatMap((d) => [0.25, r.kind === 'flash' ? r.a : 1, 3].map((a) => ({ d, a })));
};
const apply = (x: Record<string, number>) => {
  const keys = Object.keys(x);
  keys.forEach((key, i) => h.setSlider(x[key], i));
};
const as = (x: Record<string, number>) => x as { v?: number; d?: number; k?: number; on?: number; a?: number };

describe('Lightning on Set', () => {
  it('the level 1 slider runs from 1 to 20 and starts at 2', () => {
    h.start(1, 5);
    const [s] = h.sliders();
    expect(h.sliders().length).toBe(1);
    expect(Number(s.min)).toBe(1);
    expect(Number(s.max)).toBe(20);
    expect(Number(s.value)).toBe(2);
    expect(Number(s.step)).toBe(1);
  });

  it('level 3 has two dials, Panel and Charger: the panel runs 1 to 6, the switch 0 to 1, both start at 1', () => {
    h.start(3, 5);
    const [panel, charger] = h.sliders();
    expect(h.sliders().length).toBe(2);
    const labels = [...document.querySelectorAll('.control-label')].map((e) => e.textContent);
    expect(labels).toEqual(['Panel', 'Charger']);
    expect([Number(panel.min), Number(panel.max), Number(panel.value)]).toEqual([1, 6, 1]);
    expect([Number(charger.min), Number(charger.max), Number(charger.value)]).toEqual([0, 1, 1]);
    h.setSlider(0, 1);
    expect(h.$('.lab-controls')!.textContent).toContain('unplugged');
  });

  it('level 4 has the gap (starts at 2 mm) and the plate area (0.25 to 3 m², starts at 0.25)', () => {
    h.start(4, 5);
    const [d, a] = h.sliders();
    expect([Number(d.min), Number(d.max), Number(d.value)]).toEqual([1, 12, 2]);
    expect([Number(a.min), Number(a.max), Number(a.step), Number(a.value)]).toEqual([0.25, 3, 0.25, 0.25]);
  });

  it('level 1 at 20 kV flashes over in every round (20 kV is above 3 kV per millimetre for every gap in the pool)', () => {
    h.start(1, 5);
    h.setSlider(20);
    h.click(ACTION);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/flashed over/);
    expect(h.hearts()).toBe(2);
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

  it('a win says It’s alive! in levels 1 to 3 and Perfect shot! in level 4, with the working', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      set(g[0], true);
      h.click(ACTION);
      h.advance(2.8);
      expect(h.feedback()).toMatch(level === 4 ? /^Perfect shot!/ : /^It’s alive!/);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a miss never states the answer and costs a heart', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      set(g[0], false);
      h.click(ACTION);
      h.advance(2.8);
      const r = g[0];
      const f = h.feedback();
      expect(h.hearts()).toBe(2);
      if (r.kind === 'wake') expect(has(f, `${r.v} kV`)).toBe(false);
      if (r.kind === 'gap') expect(has(f, `${r.d} mm`)).toBe(false);
      if (r.kind === 'panel' && r.on) expect(f).toContain('unplugged');
      if (r.kind === 'flash') expect(has(f, `${r.d} mm`)).toBe(false);
    }
  });

  it('the hint line fades round by round', () => {
    h.start(1, 5);
    expect(h.note()).toMatch(/Round 1: the rig meter is live/);
    const g = build(1, 5);
    set(g[0], true);
    h.click(ACTION);
    h.advance(3.8);
    expect(h.note()).toMatch(/a meter check costs a charge/);
    set(g[1], true);
    h.click(ACTION);
    h.advance(3.8);
    expect(h.note()).toMatch(/Final take: no meter/);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
  });

  it('the verdict lands at 0.95 s (0.55 s on a flashover), 1.45 s in level 3, and a quarter second after the flash in level 4', () => {
    // level 1: a short take lands at 0.95 s
    h.start(1, 5);
    const g1 = build(1, 5);
    h.setSlider((g1[0] as Extract<Round, { kind: 'wake' }>).v - 1);
    h.click(ACTION);
    h.advance(0.85);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
    // level 1: a flashover lands at 0.55 s
    h.start(1, 5);
    h.setSlider(20);
    h.click(ACTION);
    h.advance(0.45);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
    // level 3: 1.45 s
    h.start(3, 5);
    const g3 = build(3, 5);
    set(g3[0], false);
    h.click(ACTION);
    h.advance(1.35);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
    // level 4: flash + 0.25 s
    h.start(4, 5);
    const r4 = build(4, 5)[0] as Extract<Round, { kind: 'flash' }>;
    h.setSlider(r4.d, 0);
    h.setSlider(Math.max(0.25, r4.a - 0.25), 1);
    h.click(ACTION);
    const vt = verdictDelay(r4, { d: r4.d, a: r4.a });
    h.advance(vt - 0.15);
    expect(h.hearts()).toBe(3);
    h.advance(0.3);
    expect(h.hearts()).toBe(2);
  });

  it('every animation is over by 2.4 s: after a take the scene is back to rest', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      set(g[0], false);
      h.click(ACTION);
      h.advance(0.5);
      expect(canvas().dataset.take).toBeDefined();
      h.advance(2.0);
      expect(h.phase()).toBe('play');
      expect(canvas().dataset.take).toBeUndefined();
    }
  });

  it('the take on screen always agrees with the rules: every reachable setting shows its own fault, and only the answer shows a win', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of LEVELS) {
      const r = build(level, 11)[0];
      for (const x of settings(level, r)) {
        h.start(level, 11);
        apply(x);
        h.click(ACTION);
        h.advance(0.2);
        expect(canvas().dataset.take).toBe(fault(r, as(x)) ?? 'win');
        h.advance(2.7);
      }
    }
    expect(err).not.toHaveBeenCalled();
  });

  it('the miss burst and the −1 float land at the same fixed point whichever setting was wrong', () => {
    const spots = new Set<string>();
    for (const level of LEVELS) {
      const rec = recorder();
      h.start(level, 11);
      const g = build(level, 11);
      set(g[0], false);
      h.click(ACTION);
      rec.at.length = 0;
      h.advance(2.8);
      const floats = rec.at.filter((a) => a.s === '−1 ♥');
      expect(floats.length).toBeGreaterThan(0);
      floats.forEach((a) => spots.add(String(a.x)));
    }
    expect([...spots]).toEqual(['320']);
  });
});

describe('the core gauge and the frame use fixed fills only', () => {
  it('level 1: the core ends at 55% (short), 80% (right) or 100% (too much), and stays empty on a flashover', () => {
    const r = build(1, 11)[0] as Extract<Round, { kind: 'wake' }>;
    const cases: [number, string, string][] = [[r.v - 1, 'short', '0.55'], [r.v, 'win', '0.80'], [r.v + 1, 'over', '1.00'], [20, 'flash', '0.00']];
    for (const [v, take, fill] of cases) {
      h.start(1, 11);
      h.setSlider(v);
      h.click(ACTION);
      h.advance(1.3);
      expect(canvas().dataset.take).toBe(take);
      expect(canvas().dataset.fill).toBe(fill);
    }
  });

  it('level 2: the same fixed fills, whatever the gap', () => {
    const r = build(2, 11)[0] as Extract<Round, { kind: 'gap' }>;
    const seen = new Map<string, Set<string>>();
    for (const d of range(DIAL.d.min, DIAL.d.max)) {
      h.start(2, 11);
      h.setSlider(d);
      h.click(ACTION);
      h.advance(1.3);
      const take = canvas().dataset.take!;
      if (!seen.has(take)) seen.set(take, new Set());
      seen.get(take)!.add(canvas().dataset.fill!);
    }
    expect(seen.get('win')).toEqual(new Set(['0.80']));
    expect(seen.get('short')).toEqual(new Set(['0.55']));
    expect(seen.get('over')).toEqual(new Set(['1.00']));
    if (seen.has('flash')) expect(seen.get('flash')).toEqual(new Set(['0.00']));
    expect(r.d).toBeGreaterThan(0);
  });

  it('level 3: the same fixed fills, and no fill after a spark that fizzled or punched through', () => {
    const r = build(3, 11)[0];
    const seen = new Map<string, Set<string>>();
    for (let k = 1; k <= 6; k++) {
      for (const on of [0, 1]) {
        h.start(3, 11);
        h.setSlider(k, 0);
        h.setSlider(on, 1);
        h.click(ACTION);
        h.advance(1.6);
        const take = canvas().dataset.take!;
        if (!seen.has(take)) seen.set(take, new Set());
        seen.get(take)!.add(canvas().dataset.fill!);
        expect(take).toBe(fault(r, { k, on }) ?? 'win');
      }
    }
    for (const [take, fills] of seen) {
      const want = { win: '0.80', short: '0.55', over: '1.00', nospark: '0.00', punch: '0.00' }[take];
      expect([...fills]).toEqual([want]);
    }
  });

  it('level 4: the frame is one of five fixed looks, and the take names it', () => {
    const r = build(4, 11)[0] as Extract<Round, { kind: 'flash' }>;
    const looks: [number, number, string, string][] = [
      [r.d, r.a, 'win', 'PERFECT SHOT'],
      [r.d - 1, r.a, 'early', 'TOO EARLY'],
      [r.d + 1, r.a, 'late', 'TOO LATE'],
      [r.d, 0.25, 'dim', 'TOO DARK'],
      [r.d, 3, 'bright', 'WASHED OUT'],
    ];
    for (const [d, a, take, label] of looks) {
      const rec = recorder();
      h.start(4, 11);
      h.setSlider(d, 0);
      h.setSlider(a, 1);
      h.click(ACTION);
      h.advance(2.35);
      expect(canvas().dataset.take).toBe(take);
      expect(rec.at.map((x) => x.s)).toContain(label);
    }
  });
});

describe('level 4 timing: the flash fires when the ramp reaches 3 kV per millimetre, not at the cue', () => {
  it('the flash follows the player’s gap and the shutter follows the cue', () => {
    for (const seed of [11, 5, 99]) {
      const r = build(4, seed)[0] as Extract<Round, { kind: 'flash' }>;
      for (const d of range(DIAL.d.min, DIAL.d.max)) {
        h.start(4, seed);
        h.setSlider(d, 0);
        h.click(ACTION);
        h.advance(2.1);
        const flashAt = Number(canvas().dataset.flashAt);
        const shutterAt = Number(canvas().dataset.shutterAt);
        expect(flashAt - flashRt(d)).toBeGreaterThanOrEqual(-0.006);
        expect(flashAt - flashRt(d)).toBeLessThanOrEqual(0.056);
        expect(shutterAt - cueRt(r.cue)).toBeGreaterThanOrEqual(-0.006);
        expect(shutterAt - cueRt(r.cue)).toBeLessThanOrEqual(0.056);
        if (d < r.d) expect(flashAt).toBeLessThan(shutterAt);
        if (d > r.d) expect(flashAt).toBeGreaterThan(shutterAt);
        if (d === r.d) expect(Math.abs(flashAt - shutterAt)).toBeLessThan(0.06);
      }
    }
  });

  it('the voltmeter needle climbs on the ramp and never passes the player’s breakdown voltage', () => {
    h.start(4, 11);
    h.setSlider(6, 0);
    h.click(ACTION);
    let last = -1;
    for (let i = 0; i < 24; i++) {
      h.advance(0.05);
      const n = Number(canvas().dataset.needle);
      expect(n).toBeLessThanOrEqual(18);
      if (i < 20) expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
  });
});

describe('Lightning on Set UX', () => {
  const frame2 = (R: ReturnType<typeof canvasRecorder>, dt: number) => {
    if (dt > 0.05) h.advance(dt - 0.05);
    R.clear();
    h.advance(0.05);
    return R.rec;
  };
  /** Where each level's grips sit at the start setting: [x, y] of every handle ring that must be drawn. */
  const GRIPS: Record<L, [number, number][]> = {
    1: [[60 + (1 / 19) * 520, 322]],
    2: [[crankXFor(RIG.w), topY(12)]],
    3: [[slotX(1), RACK.y + RACK.h / 2], [118, 214]],
    4: [[crankXFor(plateW(0.25)), topY(2)], [RIG.cx + plateW(0.25) / 2 + 3, RIG.bottom + 20]],
  };
  for (const level of LEVELS) {
    it(`level ${level}: the goal line is drawn at round start and fades; every handle ring is at least ${GRIP_MIN} px; the readouts show the player’s own settings`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const rec = frame2(R, 0.05);
      const goal = rec.at.filter((a) => /^Goal: /.test(a.s));
      expect(goal.length).toBe(1);
      expect(goal[0].y).toBeGreaterThanOrEqual(12);
      expect(GRIP_MIN).toBeGreaterThanOrEqual(18);
      for (const [x, y] of GRIPS[level]) expect(rec.arcs.some((a) => Math.abs(a.x - x) < 1 && Math.abs(a.y - y) < 1 && a.r >= 18), `ring at ${x.toFixed(0)}, ${y}`).toBe(true);
      const read = rec.at.map((a) => a.s);
      if (level === 1) expect(read.some((s) => /^2 kV( · drag)?$/.test(s))).toBe(true);
      if (level === 2) expect(read).toContain('12 mm');
      if (level === 3) expect(read).toEqual(expect.arrayContaining(['panel: none (air)', 'switch ON']));
      if (level === 4) expect(read).toEqual(expect.arrayContaining(['2 mm', '0.25 m²']));
      expect(frame2(R, 4).at.some((a) => /^Goal: /.test(a.s))).toBe(false);
    });
  }
  it('a miss says in plain words what to change, never the answer', () => {
    const want = [/(Raise|Lower) the charger voltage\.$/, /(Open the gap wider|Close the gap a little)\.$/, /Choose a setting that leaves (the voltage (higher|lower)|more charge|less charge)\.$/, /Try (a wider|a narrower) gap\.$|Try (bigger|smaller) plates\.$/];
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      set(g[0], false);
      h.click(ACTION);
      h.advance(2.8);
      expect(h.feedback(), `level ${level}`).toMatch(want[level - 1]);
    }
  });
  it('the grip is a see-through ring: the readouts are drawn only while the player is setting up, not during the take', () => {
    const R = canvasRecorder();
    h.start(2, 5);
    expect(frame2(R, 0.05).at.map((a) => a.s)).toContain('12 mm');
    h.click(ACTION);
    h.advance(0.3);
    const during = frame2(R, 0.05).at.map((a) => a.s);
    expect(during.filter((s) => / mm$/.test(s)).length).toBe(1);
    expect(during.some((s) => /^Goal: /.test(s))).toBe(false);
  });
});

describe('Lightning on Set never leaks the answer', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the LCD is live in round 1, shows for 1.5 s after a meter check in round 2, and never in round 3`, () => {
      const rec = recorder();
      h.start(level, 5);
      // round 1: live
      expect(lcdDrawn(level, frame(rec))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      // round 2: hidden at every setting; a meter check shows it for 1.5 s, once
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(lcdDrawn(level, frame(rec, 0.3))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      for (const x of settings(level, g[1]).filter((_, i) => i % 5 === 0)) {
        apply(x);
        expect(lcdDrawn(level, frame(rec))).toBe(false);
      }
      h.click(METER);
      expect(lcdDrawn(level, frame(rec, 0.3))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      expect(lcdDrawn(level, frame(rec, 1.0))).toBe(true);
      expect(lcdDrawn(level, frame(rec, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(lcdDrawn(level, frame(rec, 0.5))).toBe(false);
      // round 3: never, at any setting, even the winning one; a meter check is refused
      set(g[1], true);
      h.click(ACTION);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const x of settings(level, g[2]).filter((_, i) => i % 3 === 0)) {
        apply(x);
        expect(lcdDrawn(level, frame(rec))).toBe(false);
      }
      set(g[2], true);
      expect(lcdDrawn(level, frame(rec))).toBe(false);
      h.click(METER);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(lcdDrawn(level, frame(rec, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
    });
  }

  it('no drawn text contains the round’s answer before the player sets it (all three rounds, every other setting)', () => {
    const tokens: ((r: Round) => string)[] = [
      (r) => `${(r as Extract<Round, { kind: 'wake' }>).v} kV`,
      (r) => `${(r as Extract<Round, { kind: 'gap' }>).d} mm`,
      (r) => `K = ${(r as Extract<Round, { kind: 'panel' }>).k}`,
      (r) => `${(r as Extract<Round, { kind: 'flash' }>).d} mm`,
    ];
    for (const level of LEVELS) {
      const rec = recorder();
      h.start(level, 5);
      const g = build(level, 5);
      for (let k = 0; k < 3; k++) {
        const r = g[k];
        const token = tokens[level - 1](r);
        for (const x of settings(level, r)) {
          const own = (level === 1 && x.v === (r as Extract<Round, { kind: 'wake' }>).v) || (level === 2 && x.d === (r as Extract<Round, { kind: 'gap' }>).d) || (level === 3 && x.k === (r as Extract<Round, { kind: 'panel' }>).k) || (level === 4 && x.d === (r as Extract<Round, { kind: 'flash' }>).d);
          if (own) continue; // the readout shows the player's own setting
          apply(x);
          expect(frame(rec).some((s) => has(s, token))).toBe(false);
        }
        if (k < 2) {
          set(r, true);
          h.click(ACTION);
          h.advance(2.8);
          h.advance(1);
        }
      }
    }
  });

  it('the plates carry six + and six − before every take, whatever the setting', () => {
    for (const level of LEVELS) {
      const rec = recorder();
      h.start(level, 5);
      const r = build(level, 5)[0];
      for (const x of settings(level, r).filter((_, i) => i % 4 === 0)) {
        apply(x);
        const texts = frame(rec);
        expect(texts.filter((s) => s === '+').length).toBe(6);
        expect(texts.filter((s) => s === '−').length).toBe(6);
      }
    }
  });

  it('the scene has no axis numbers for the answer: the only mm readout is the player’s own gap', () => {
    const rec = recorder();
    h.start(2, 5);
    const r = build(2, 5)[0] as Extract<Round, { kind: 'gap' }>;
    for (const d of [1, 5, 12]) {
      h.setSlider(d);
      const mm = frame(rec).filter((s) => / mm( · drag)?$/.test(s));
      expect(mm).toEqual([`${d} mm`]);
    }
    expect(r.d).toBeGreaterThan(0);
  });
});
