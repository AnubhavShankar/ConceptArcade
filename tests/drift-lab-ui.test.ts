// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch03-current-electricity/drift-lab/index';
import { DIAL, buildRounds, fault, type Round, type Values } from '../src/games/physics/class-12/ch03-current-electricity/drift-lab/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'drift-lab', 4);
type L = 1 | 2 | 3 | 4;
const LEVELS: L[] = [1, 2, 3, 4];
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const FIRE = 'Drop the flag and start the heat';
const PACE = 'Pace check: read the pace board for this setting';

function set(r: Round, right: boolean) {
  if (r.kind === 'gate') {
    h.setSlider(r.i, 0);
    h.setSlider(right ? r.dir : 1 - r.dir, 1);
  }
  if (r.kind === 'crawl') h.setSlider(right ? r.i : r.i + 0.5);
  if (r.kind === 'thick') h.setSlider(right ? r.a : r.a + 0.25);
  if (r.kind === 'mob') {
    h.setSlider(right ? r.V : r.V + 10, 0);
    h.setSlider(r.a, 1);
  }
}
shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => set(g[k], true),
  setWrong: (g, k) => set(g[k], false),
  commit: () => h.click(FIRE),
});

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const range = (lo: number, hi: number, step: number) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const canvas = () => h.$('canvas')!;
const apply = (x: Values) => {
  if (x.i !== undefined) h.setSlider(x.i, 0);
  if (x.dir !== undefined) h.setSlider(x.dir, 1);
  if (x.a !== undefined) h.setSlider(x.a, x.mv !== undefined ? 1 : 0);
  if (x.mv !== undefined) h.setSlider(x.mv, 0);
};
/** A subset of settings that still covers every kind of take. */
function settings(level: L, r: Round): Values[] {
  if (level === 1) return range(DIAL.i1.min, DIAL.i1.max, DIAL.i1.step).flatMap((i) => [0, 1].map((dir) => ({ i, dir })));
  if (level === 2) return range(DIAL.i2.min, DIAL.i2.max, DIAL.i2.step).map((i) => ({ i }));
  if (level === 3) return range(DIAL.a.min, DIAL.a.max, DIAL.a.step).map((a) => ({ a }));
  const m = r as Extract<Round, { kind: 'mob' }>;
  return [m.V - 10, m.V, m.V + 10, 10, 300].flatMap((mv) => [m.a - 0.25, m.a, m.a + 0.25, 0.25, 4].map((a) => ({ mv, a })));
}

const rec = () => {
  const c = canvasRecorder();
  return c;
};
type Rc = ReturnType<typeof rec>;
const frame = (c: Rc, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  c.clear();
  h.advance(0.05);
  return c.rec.at.map((a) => a.s);
};
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
/** The pace board's live text in each level (the goal line also says mm/s in level 4, so the patterns are exact). */
const BOARD_RE = [/^[\d.]+×10¹⁹ e⁻\/s [→←]$/, /^Zip [\d.]+ mm\/s$/, /^Zip [\d.]+ mm\/s$/, /^[\d.]+ mm\/s · [\d.]+ A$/];
const boardDrawn = (level: number, texts: string[]) => texts.some((s) => BOARD_RE[level - 1].test(s));

describe('The Slowest Race', () => {
  it('level 1 has Current (0.5 to 12, step 0.5, starts 0.5) and Current arrow (0 to 1, starts 0)', () => {
    h.start(1, 5);
    const [i, dir] = h.sliders();
    expect(h.sliders().length).toBe(2);
    expect([Number(i.min), Number(i.max), Number(i.step), Number(i.value)]).toEqual([0.5, 12, 0.5, 0.5]);
    expect([Number(dir.min), Number(dir.max), Number(dir.value)]).toEqual([0, 1, 0]);
    expect([...document.querySelectorAll('.control-label')].map((e) => e.textContent)).toEqual(['Current', 'Current arrow']);
    h.setSlider(1, 1);
    expect(h.$('.lab-controls')!.textContent).toContain('right to left');
  });

  it('level 2 has one slider (0.5 to 20); level 3 runs 0.25 to 4 and starts at 4; level 4 has Voltage (10 to 300) and Race wire', () => {
    h.start(2, 5);
    expect(h.sliders().length).toBe(1);
    expect([Number(h.sliders()[0].min), Number(h.sliders()[0].max), Number(h.sliders()[0].value)]).toEqual([0.5, 20, 0.5]);
    h.start(3, 5);
    expect(h.sliders().length).toBe(1);
    expect([Number(h.sliders()[0].min), Number(h.sliders()[0].max), Number(h.sliders()[0].value)]).toEqual([0.25, 4, 4]);
    h.start(4, 5);
    const [mv, a] = h.sliders();
    expect([Number(mv.min), Number(mv.max), Number(mv.step), Number(mv.value)]).toEqual([10, 300, 10, 10]);
    expect([Number(a.min), Number(a.max), Number(a.step), Number(a.value)]).toEqual([0.25, 4, 0.25, 4]);
    expect([...document.querySelectorAll('.control-label')].map((e) => e.textContent)).toEqual(['Voltage', 'Race wire']);
  });

  it('level 1 with the wrong arrow gives a miss that says backwards, and the hearts drop at 0.65 s', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0], false);
    h.click(FIRE);
    h.advance(0.55);
    expect(h.hearts()).toBe(3);
    h.advance(0.15);
    expect(h.hearts()).toBe(2);
    h.advance(2);
    expect(h.feedback()).toMatch(/backwards/);
  });

  it('a fast miss lands at 1.05 s and a slow miss at 1.65 s', () => {
    h.start(2, 5);
    const r = build(2, 5)[0] as Extract<Round, { kind: 'crawl' }>;
    h.setSlider(r.i + 0.5);
    h.click(FIRE);
    h.advance(0.95);
    expect(h.hearts()).toBe(3);
    h.advance(0.15);
    expect(h.hearts()).toBe(2);
    h.start(2, 5);
    h.setSlider(r.i - 0.5);
    h.click(FIRE);
    h.advance(1.55);
    expect(h.hearts()).toBe(3);
    h.advance(0.15);
    expect(h.hearts()).toBe(2);
  });

  it('a pace check costs a charge, then there are no charges left', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      h.click(PACE);
      expect(h.feedback()).toMatch(/Pace check/);
      expect(h.hud()).toMatch(/Charges ·/);
      h.click(PACE);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a win says Record! in level 1 and Dead heat in levels 2 to 4, with the working', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      set(g[0], true);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(level === 1 ? /^Record!/ : /^Dead heat/);
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
      const f = h.feedback();
      expect(h.hearts()).toBe(2);
      if (r.kind === 'gate') expect(f).not.toContain(r.dir ? '← (right to left)' : '→ (left to right)');
      if (r.kind === 'crawl') expect(has(f, `${r.i} A`)).toBe(false);
      if (r.kind === 'thick') expect(has(f, `${r.a} mm²`)).toBe(false);
      if (r.kind === 'mob') expect(has(f, `${r.V} mV`)).toBe(false);
    }
  });

  it('the hint line fades round by round', () => {
    h.start(2, 5);
    expect(h.note()).toMatch(/Round 1: the pace board is live/);
    const g = build(2, 5);
    set(g[0], true);
    h.click(FIRE);
    h.advance(3.8);
    expect(h.note()).toMatch(/a pace check costs a charge/);
    set(g[1], true);
    h.click(FIRE);
    h.advance(3.8);
    expect(h.note()).toMatch(/Grand final: no pace board/);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
  });

  it('every animation is over by 2.4 s: after a take the scene is back to rest', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      set(g[0], false);
      h.click(FIRE);
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
        h.click(FIRE);
        h.advance(0.2);
        expect(canvas().dataset.take).toBe(fault(r, x) ?? 'win');
        h.advance(2.7);
      }
    }
    expect(err).not.toHaveBeenCalled();
  });

  it('the miss burst and the −1 float land at the same fixed point whichever setting was wrong', () => {
    const spots = new Set<string>();
    for (const level of LEVELS) {
      const c = rec();
      h.start(level, 11);
      const g = build(level, 11);
      set(g[0], false);
      h.click(FIRE);
      c.clear();
      h.advance(2.8);
      const floats = c.rec.at.filter((a) => a.s === '−1 ♥');
      expect(floats.length).toBeGreaterThan(0);
      floats.forEach((a) => spots.add(String(a.x)));
    }
    expect([...spots]).toEqual(['320']);
  });
});

describe('the race uses fixed positions only', () => {
  it('level 2: a slow miss ends with Zip at 0.60 and Shelly at 1.00, a fast miss the other way round, a win dead level', () => {
    const r = build(2, 11)[0] as Extract<Round, { kind: 'crawl' }>;
    const seen = new Map<string, Set<string>>();
    for (const i of range(DIAL.i2.min, DIAL.i2.max, DIAL.i2.step)) {
      h.start(2, 11);
      h.setSlider(i);
      h.click(FIRE);
      h.advance(1.8);
      const take = canvas().dataset.take!;
      if (!seen.has(take)) seen.set(take, new Set());
      seen.get(take)!.add(canvas().dataset.pos!);
    }
    expect(seen.get('win')).toEqual(new Set(['1.00,1.00']));
    expect(seen.get('slow')).toEqual(new Set(['1.00,0.60']));
    expect(seen.get('fast')).toEqual(new Set(['0.60,1.00']));
    expect(r.i).toBeGreaterThan(0);
  });

  it('level 1: a backward Zip stops at the end cap behind the start, while Shelly stops at 0.25', () => {
    const r = build(1, 11)[0] as Extract<Round, { kind: 'gate' }>;
    for (const i of [0.5, 6, 12]) {
      h.start(1, 11);
      h.setSlider(i, 0);
      h.setSlider(1 - r.dir, 1);
      h.click(FIRE);
      h.advance(1.2);
      expect(canvas().dataset.take).toBe('backward');
      expect(canvas().dataset.pos).toBe('0.25,0.00');
    }
  });

  it('nothing drifts before the flag: no take, no positions, whatever the dials say', () => {
    for (const level of LEVELS) {
      h.start(level, 11);
      const r = build(level, 11)[0];
      for (const x of settings(level, r).filter((_, i) => i % 7 === 0)) {
        apply(x);
        h.advance(0.1);
        expect(canvas().dataset.take).toBeUndefined();
        expect(canvas().dataset.pos).toBeUndefined();
      }
    }
  });

  it('level 4: a dead heat with the wrong wire shows the dim or blown lamp and its frame', () => {
    const r = build(4, 11)[0] as Extract<Round, { kind: 'mob' }>;
    const looks: [number, string, string][] = [[r.a, 'win', 'DEAD HEAT · RECORD!'], [r.a - 0.25, 'dim', 'TOO DARK TO JUDGE'], [r.a + 0.25, 'blown', 'NO LIGHT']];
    for (const [a, take, caption] of looks) {
      const c = rec();
      h.start(4, 11);
      h.setSlider(r.V, 0);
      h.setSlider(a, 1);
      h.click(FIRE);
      h.advance(2.35);
      expect(canvas().dataset.take).toBe(take);
      expect(c.rec.at.map((x) => x.s)).toContain(caption);
    }
  });

  it('the photo captions: slow, fast and backward', () => {
    const cases: [number, number, number, string, string][] = [
      [2, 0, -0.5, 'slow', 'SHELLY ALONE · NO RECORD'],
      [2, 0, 0.5, 'fast', 'ZIP RAN AWAY'],
    ];
    for (const [level, , delta, take, caption] of cases) {
      const c = rec();
      h.start(level, 11);
      const r = build(level, 11)[0] as Extract<Round, { kind: 'crawl' }>;
      h.setSlider(r.i + delta);
      h.click(FIRE);
      h.advance(2.35);
      expect(canvas().dataset.take).toBe(take);
      expect(c.rec.at.map((x) => x.s)).toContain(caption);
    }
    const c = rec();
    h.start(1, 11);
    const g = build(1, 11)[0] as Extract<Round, { kind: 'gate' }>;
    h.setSlider(g.i, 0);
    h.setSlider(1 - g.dir, 1);
    h.click(FIRE);
    h.advance(2.35);
    expect(c.rec.at.map((x) => x.s)).toContain('WRONG WAY');
  });
});

describe('The Slowest Race never leaks the answer', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the pace board is live in round 1, shows for 1.5 s after a pace check in round 2, and never in round 3`, () => {
      const c = rec();
      h.start(level, 5);
      // round 1: live
      expect(boardDrawn(level, frame(c))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      // round 2: hidden at every setting; a pace check shows it for 1.5 s, once
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(boardDrawn(level, frame(c, 0.3))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      for (const x of settings(level as L, g[1]).filter((_, i) => i % 5 === 0)) {
        apply(x);
        expect(boardDrawn(level, frame(c))).toBe(false);
      }
      h.click(PACE);
      expect(boardDrawn(level, frame(c, 0.3))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      expect(boardDrawn(level, frame(c, 1.0))).toBe(true);
      expect(boardDrawn(level, frame(c, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      h.click(PACE);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(boardDrawn(level, frame(c, 0.5))).toBe(false);
      // round 3: never, at any setting, even the winning one; a pace check is refused
      set(g[1], true);
      h.click(FIRE);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const x of settings(level as L, g[2]).filter((_, i) => i % 3 === 0)) {
        apply(x);
        expect(boardDrawn(level, frame(c))).toBe(false);
      }
      set(g[2], true);
      expect(boardDrawn(level, frame(c))).toBe(false);
      h.click(PACE);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(boardDrawn(level, frame(c, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
    });
  }

  it('in rounds 2 and 3 the board stays dark during and after a miss, even right after a pace check', () => {
    for (const level of LEVELS) {
      const c = rec();
      h.start(level, 5);
      const g = playTo(level, 1);
      h.click(PACE);
      set(g[1], false);
      h.click(FIRE);
      for (let i = 0; i < 50; i++) expect(boardDrawn(level, frame(c))).toBe(false);
      expect(h.phase()).toBe('play');
      for (let i = 0; i < 4; i++) expect(boardDrawn(level, frame(c))).toBe(false);
      set(g[1], true);
      h.click(FIRE);
      h.advance(2.8);
      h.advance(1);
      set(g[2], false);
      h.click(FIRE);
      for (let i = 0; i < 50; i++) expect(boardDrawn(level, frame(c))).toBe(false);
    }
  });

  it('a winning take lights the board in round 3 (the working is shown after the win)', () => {
    for (const level of LEVELS) {
      const c = rec();
      h.start(level, 5);
      const g = playTo(level, 2);
      set(g[2], true);
      h.click(FIRE);
      let shown = false;
      for (let i = 0; i < 40; i++) shown = boardDrawn(level, frame(c)) || shown;
      expect(shown).toBe(true);
    }
  });

  it('no drawn text contains the round’s answer before the player sets it (all three rounds, every other setting)', () => {
    const token: ((r: Round) => string | null)[] = [
      (r) => `${(r as Extract<Round, { kind: 'gate' }>).i} A`,
      (r) => `${(r as Extract<Round, { kind: 'crawl' }>).i} A`,
      (r) => `${(r as Extract<Round, { kind: 'thick' }>).a} mm²`,
      (r) => `${(r as Extract<Round, { kind: 'mob' }>).V} mV`,
    ];
    for (const level of LEVELS) {
      const c = rec();
      h.start(level, 5);
      const g = build(level, 5);
      for (let k = 0; k < 3; k++) {
        const r = g[k];
        const t = token[level - 1](r)!;
        for (const x of settings(level, r)) {
          const own = (level <= 2 && x.i === (r as Extract<Round, { kind: 'gate' | 'crawl' }>).i) || (level === 3 && x.a === (r as Extract<Round, { kind: 'thick' }>).a) || (level === 4 && x.mv === (r as Extract<Round, { kind: 'mob' }>).V);
          if (own) continue; // the readout shows the player’s own setting
          apply(x);
          expect(frame(c).some((s) => has(s, t))).toBe(false);
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

  it('the goal line is drawn at the start of every round, and the player’s own setting beside its handle', () => {
    for (const level of LEVELS) {
      const c = rec();
      h.start(level, 5);
      const g = build(level, 5);
      for (let k = 0; k < 3; k++) {
        expect(frame(c).some((s) => /Shelly/.test(s))).toBe(true);
        if (level === 1) {
          h.setSlider(3, 0);
          expect(frame(c)).toContain('3 A');
        }
        if (level === 4) {
          h.setSlider(70, 0);
          expect(frame(c)).toContain('70 mV');
        }
        if (level === 3) {
          h.setSlider(1.5, 0);
          expect(frame(c)).toContain('1.5 mm²');
        }
        if (k < 2) {
          set(g[k], true);
          h.click(FIRE);
          h.advance(2.8);
          h.advance(1);
        }
      }
    }
  });

  it('the level 1 round 1 “drag ⇔” cue is drawn until the throttle first moves', () => {
    const c = rec();
    h.start(1, 5);
    expect(frame(c)).toContain('drag ⇔');
    h.setSlider(1, 0);
    expect(frame(c)).not.toContain('drag ⇔');
    h.setSlider(0.5, 0);
    expect(frame(c)).not.toContain('drag ⇔');
  });

  it('before the flag the drift direction is never drawn: only the round 1 pace board carries an electron arrow', () => {
    const c = rec();
    h.start(1, 5);
    const g = build(1, 5)[0] as Extract<Round, { kind: 'gate' }>;
    for (const dir of [0, 1]) {
      h.setSlider(g.i, 0);
      h.setSlider(dir, 1);
      const texts = frame(c);
      expect(texts.filter((s) => /e⁻\/s [→←]/.test(s))).toHaveLength(1);
      expect(texts.some((s) => /signal/.test(s))).toBe(false);
    }
  });
});
