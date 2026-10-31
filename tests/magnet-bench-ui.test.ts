// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-bench/index';
import { DIAL, buildRounds, coilAnswer, fault, sawAnswer, type Round } from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-bench/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts, type CanvasRec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'magnet-bench', 3);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3, createRng(seed));
const FIRE = 'Showtime: perform the floating ring act';
const TEST = 'Rehearse: try this setting backstage first';
const LEVELS = [1, 2, 3];

function set(r: Round, right: boolean) {
  if (r.kind === 'saw') {
    const a = sawAnswer(r);
    h.setSlider(right ? a.k : a.k + 1, 0);
    h.setSlider(a.up, 1);
  } else {
    const a = coilAnswer(r);
    h.setSlider(right ? a.n : a.n + 50, 0);
    h.setSlider(a.dir, 1);
  }
}
/** The right size with the wrong pole. */
function setSnap(r: Round) {
  if (r.kind === 'saw') {
    const a = sawAnswer(r);
    h.setSlider(a.k, 0);
    h.setSlider(1 - a.up, 1);
  } else {
    const a = coilAnswer(r);
    h.setSlider(a.n, 0);
    h.setSlider(1 - a.dir, 1);
  }
}
shellTests<Round[]>(h, { levels: [1, 2, 3], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const canvas = () => h.$('canvas')!;
/** Every setting of the level's two dials. */
const settings = (level: number): Record<string, number>[] =>
  level === 1
    ? range(DIAL.k.min, DIAL.k.max).flatMap((k) => [0, 1].map((up) => ({ k, up })))
    : range(DIAL.n.min, DIAL.n.max, DIAL.n.step).flatMap((n) => [0, 1].map((dir) => ({ n, dir })));
const apply = (x: Record<string, number>) => Object.keys(x).forEach((key, i) => h.setSlider(x[key], i));

const frame = (c: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  c.clear();
  h.advance(0.05);
  return texts(c.rec);
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
const CARD_RE = /^m .* J\/T · top [NS]$/;
const GOAL_RE = /^Float the ring|^Swap the/;

describe('The Floating Act', () => {
  it('level 1 has two sliders, Saw at (1 to 11, start 1) and End up (0 to 1, start 0)', () => {
    h.start(1, 5);
    const [k, up] = h.sliders();
    expect(h.sliders().length).toBe(2);
    expect([Number(k.min), Number(k.max), Number(k.step), Number(k.value)]).toEqual([1, 11, 1, 1]);
    expect([Number(up.min), Number(up.max), Number(up.value)]).toEqual([0, 1, 0]);
    expect([...document.querySelectorAll('.control-label')].map((e) => e.textContent)).toEqual(['Saw at', 'End up']);
  });

  it('levels 2 and 3 have Turns (100 to 1500, step 50, start 100) and Current (0 to 1, start 0)', () => {
    for (const level of [2, 3]) {
      h.start(level, 5);
      const [n, dir] = h.sliders();
      expect(h.sliders().length).toBe(2);
      expect([Number(n.min), Number(n.max), Number(n.step), Number(n.value)]).toEqual([100, 1500, 50, 100]);
      expect([Number(dir.min), Number(dir.max), Number(dir.value)]).toEqual([0, 1, 0]);
      expect([...document.querySelectorAll('.control-label')].map((e) => e.textContent)).toEqual(['Turns', 'Current']);
    }
    h.setSlider(1, 1);
    expect(h.$('.lab-controls')!.textContent).toContain('front turns →');
  });

  it('the right size with the wrong pole is a snap that costs a heart', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      setSnap(g[0]);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(/snapped down/);
      expect(h.hearts()).toBe(2);
    }
  });

  it('a rehearsal costs a charge, then there are no charges left', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      h.click(TEST);
      expect(h.feedback()).toMatch(/Rehearsal:/);
      expect(h.hud()).toMatch(/Charges ·/);
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a win says Ta-da! with the working, and costs nothing', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      set(g[0], true);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(/^Ta-da!/);
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
      if (r.kind === 'saw') expect(has(f, `mark ${sawAnswer(r).k}`)).toBe(false);
      else expect(has(f, `${coilAnswer(r).n} turns`)).toBe(false);
    }
  });

  it('the verdict lands at 1.2 s: still 3 hearts at 1.1 s after a miss, 2 hearts a moment later', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      set(g[0], false);
      h.click(FIRE);
      h.advance(1.1);
      expect(h.hearts()).toBe(3);
      h.advance(0.2);
      expect(h.hearts()).toBe(2);
    }
  });

  it('the hint line fades round by round', () => {
    h.start(1, 5);
    expect(h.note()).toMatch(/Round 1: the rehearsal card is live/);
    const g = build(1, 5);
    set(g[0], true);
    h.click(FIRE);
    h.advance(3.8);
    expect(h.note()).toMatch(/a rehearsal costs a charge/);
    set(g[1], true);
    h.click(FIRE);
    h.advance(3.8);
    expect(h.note()).toMatch(/Gala night: no rehearsal/);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
  });

  it('every animation is over by 2.4 s', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = build(level, 5);
      set(g[0], false);
      h.click(FIRE);
      h.advance(0.5);
      expect(canvas().dataset.act).toBeDefined();
      h.advance(2.0);
      expect(h.phase()).toBe('play');
      expect(canvas().dataset.act).toBeUndefined();
    }
  });
});

describe('the act on screen always agrees with the rules, at fixed heights', () => {
  const FIXED: Record<string, (y: number) => boolean> = {
    win: (y) => Math.abs(y - 124) <= 3,
    low: (y) => Math.abs(y - 200) <= 1,
    snap: (y) => y === 222,
    high: (y) => y === 236,
  };
  for (const level of LEVELS) {
    it(`level ${level}: every reachable setting shows its own outcome, and the ring ends at that outcome's fixed height`, () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const r = build(level, 11)[0];
      const all = settings(level);
      const stride = level === 1 ? 1 : 3;
      const seen = new Map<string, Set<number>>();
      all.filter((_, i) => i % stride === 0 || fault(r, all[i] as never) === null).forEach((x) => {
        h.start(level, 11);
        apply(x);
        h.click(FIRE);
        h.advance(0.2);
        const want = fault(r, x as never) ?? 'win';
        expect(canvas().dataset.act).toBe(want);
        h.advance(1.7); // 1.9 s into the act: every ring has settled or landed
        const y = Number(canvas().dataset.ring);
        expect(FIXED[want](y)).toBe(true);
        if (!seen.has(want)) seen.set(want, new Set());
        seen.get(want)!.add(Math.round(y / 4));
        h.advance(1);
      });
      expect(seen.has('win')).toBe(true);
      expect(err).not.toHaveBeenCalled();
    });
  }

  it('the miss burst and the −1 float land at the same fixed point whichever setting was wrong', () => {
    const spots = new Set<string>();
    for (const level of LEVELS) {
      const c = canvasRecorder();
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
    expect([...spots]).toEqual(['300']);
  });
});

describe('The Floating Act never leaks the answer', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the card is live in round 1, shows for 1.5 s after a rehearsal in round 2, and never in round 3`, () => {
      const c = canvasRecorder();
      h.start(level, 5);
      const cardDrawn = (ts: string[]) => ts.some((s) => CARD_RE.test(s));
      // round 1: live, and the goal line is on the canvas
      const t0 = frame(c);
      expect(cardDrawn(t0)).toBe(true);
      expect(t0.some((s) => GOAL_RE.test(s))).toBe(true);
      expect(canvas().dataset.card).toBe('1');
      // round 2: hidden at every setting; a rehearsal shows it for 1.5 s, once
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(frame(c, 0.3).some((s) => GOAL_RE.test(s))).toBe(true);
      expect(cardDrawn(frame(c, 0.3))).toBe(false);
      expect(canvas().dataset.card).toBe('0');
      for (const x of settings(level).filter((_, i) => i % 5 === 0)) {
        apply(x);
        expect(cardDrawn(frame(c))).toBe(false);
      }
      h.click(TEST);
      expect(cardDrawn(frame(c, 0.3))).toBe(true);
      expect(canvas().dataset.card).toBe('1');
      expect(cardDrawn(frame(c, 1.0))).toBe(true);
      expect(cardDrawn(frame(c, 0.5))).toBe(false);
      expect(canvas().dataset.card).toBe('0');
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(cardDrawn(frame(c, 0.5))).toBe(false);
      // round 3: never, at any setting, even the winning one; a rehearsal is refused
      set(g[1], true);
      h.click(FIRE);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const x of settings(level).filter((_, i) => i % 3 === 0)) {
        apply(x);
        expect(cardDrawn(frame(c))).toBe(false);
      }
      set(g[2], true);
      expect(cardDrawn(frame(c))).toBe(false);
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(cardDrawn(frame(c, 0.5))).toBe(false);
      expect(canvas().dataset.card).toBe('0');
    });
  }

  it('no drawn text contains the answer token before the player sets it (all three rounds, every other setting)', () => {
    for (const level of LEVELS) {
      const c = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      for (let k = 0; k < 3; k++) {
        const r = g[k];
        const a = r.kind === 'saw' ? sawAnswer(r) : coilAnswer(r);
        const own = (x: Record<string, number>) => (r.kind === 'saw' ? x.k === (a as { k: number }).k : x.n === (a as { n: number }).n);
        const token = r.kind === 'saw' ? `mark ${(a as { k: number }).k} ` : `${(a as { n: number }).n} turns`;
        for (const x of settings(level)) {
          if (own(x)) continue; // the label shows the player's own setting
          apply(x);
          expect(frame(c).some((s) => has(s, token))).toBe(false);
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

  it('the goal line is drawn at the start of every round, and is gone while the act plays', () => {
    for (const level of LEVELS) {
      const c = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      expect(frame(c).some((s) => GOAL_RE.test(s))).toBe(true);
      set(g[0], true);
      h.click(FIRE);
      h.advance(0.3);
      expect(frame(c).some((s) => GOAL_RE.test(s))).toBe(false);
    }
  });

  it('the scene writes the player’s own mark or turns, and the ring’s underside pole', () => {
    const c = canvasRecorder();
    h.start(1, 5);
    h.setSlider(3, 0);
    expect(frame(c)).toContain('mark 3 · 3/12');
    h.setSlider(1, 1);
    expect(frame(c)).toContain('right end up');
    h.start(2, 5);
    h.setSlider(450, 0);
    const ts = frame(c);
    expect(ts).toContain('450 turns');
    expect(ts.some((s) => /^[NS]▾$/.test(s))).toBe(true);
    expect(ts.some((s) => /^front current [←→]$/.test(s))).toBe(true);
  });
});
