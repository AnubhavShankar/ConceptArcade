// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/ampere-lab/index';
import { buildRounds, fault, type Round, type Values } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/ampere-lab/logic';
import { C, SOLE, LINE, PAD, inPx, outPx, rayPx, torPx, xPx, invTorPx } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/ampere-lab/art';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'ampere-lab', 5);
type L = 1 | 2 | 3 | 4 | 5;
const LEVELS: L[] = [1, 2, 3, 4, 5];
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const FIRE = 'Fire a test plasma shot with these settings';
const TEST = 'Probe check: read the probe for this setting';
const canvas = () => h.$('canvas')!;

function set(r: Round, right: boolean) {
  if (r.kind === 'bus') { h.setSlider(r.side, 0); h.setSlider(right ? r.r : r.r + 5, 1); }
  if (r.kind === 'col') { h.setSlider(right ? r.rin : r.rin + 1, 0); h.setSlider(r.rout, 1); }
  if (r.kind === 'xpt') h.setSlider(right ? r.x : r.x + 2);
  if (r.kind === 'sol') h.setSlider(right ? r.L : r.L + 5);
  if (r.kind === 'tor') h.setSlider(right ? r.r : r.r + 1);
}
shellTests<Round[]>(h, { levels: [1, 2, 3, 4, 5], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const ARROWS = ['↑', '↓', '←', '→'];
/** Every setting a level's sliders can reach (a subset for the big ones), as slider values in slider order. */
const settings = (level: L, r: Round): number[][] => {
  if (r.kind === 'bus') return range(0, 3).flatMap((s) => range(5, 100, 5).map((d) => [s, d]));
  if (r.kind === 'col') return range(1, r.a - 1).flatMap((i) => range(r.a + 1, 3 * r.a).map((o) => [i, o])).filter((_, i) => i % 7 === 0);
  if (level === 3) return range(2, 98, 2).map((x) => [x]);
  if (level === 4) return range(20, 150, 5).map((x) => [x]);
  return range(2, 60).map((x) => [x]);
};
const apply = (x: number[]) => x.forEach((v, i) => h.setSlider(v, i));
const asValues = (r: Round, x: number[]): Values => (r.kind === 'bus' ? { side: x[0], r: x[1] } : r.kind === 'col' ? { rin: x[0], rout: x[1] } : r.kind === 'xpt' ? { x: x[0] } : r.kind === 'sol' ? { L: x[0] } : { r: x[0] });
const tokenOf = (r: Round, x: number[]): string[] =>
  r.kind === 'bus' ? [`${r.r} cm`].filter(() => x[1] !== r.r)
  : r.kind === 'col' ? [...(x[0] !== r.rin ? [`${r.rin} cm`] : []), ...(x[1] !== r.rout ? [`${r.rout} cm`] : [])]
  : r.kind === 'xpt' ? [`${r.x} cm`].filter(() => x[0] !== r.x)
  : r.kind === 'sol' ? [`${r.L} cm`].filter(() => x[0] !== r.L)
  : [`${r.r} cm`].filter(() => x[0] !== r.r);
const LCD_RE = [/^[\d.]+ µT [↑↓←→]$/, /^in .* · out .* mT$/, /^net .* mT$/, /^inside .* mT$/, /^(hole|winding|outside) .* mT$/];
const lcdDrawn = (level: number, texts: string[]) => texts.some((s) => LCD_RE[level - 1].test(s));

const frame = (R: ReturnType<typeof canvasRecorder>, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec.at.map((a) => a.s);
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

describe('First Plasma', () => {
  it('level 1 has Side (0 to 3, start 0) and Distance (5 to 100 in steps of 5, start 5)', () => {
    h.start(1, 5);
    const [side, dist] = h.sliders();
    expect(h.sliders().length).toBe(2);
    expect([Number(side.min), Number(side.max), Number(side.value)]).toEqual([0, 3, 0]);
    expect([Number(dist.min), Number(dist.max), Number(dist.step), Number(dist.value)]).toEqual([5, 100, 5, 5]);
    expect([...document.querySelectorAll('.control-label')].map((e) => e.textContent)).toEqual(['Side', 'Distance']);
    expect(h.$('.lab-controls')!.textContent).toContain('right');
    h.setSlider(2, 0);
    expect(h.$('.lab-controls')!.textContent).toContain('left');
  });

  it('level 2’s sliders take the round’s ranges, and re-range in the next round', () => {
    h.start(2, 5);
    const g = build(2, 5) as Extract<Round, { kind: 'col' }>[];
    const [inner, outer] = h.sliders();
    expect([Number(inner.min), Number(inner.max), Number(inner.value)]).toEqual([1, g[0].a - 1, 1]);
    expect([Number(outer.min), Number(outer.max), Number(outer.value)]).toEqual([g[0].a + 1, 3 * g[0].a, g[0].a + 1]);
    set(g[0], true);
    h.click(FIRE);
    h.advance(3.8);
    expect([Number(inner.max), Number(outer.min), Number(outer.max)]).toEqual([g[1].a - 1, g[1].a + 1, 3 * g[1].a]);
  });

  it('level 5 has Probe (2 to 60, start 2) and 2 cm is a miss that says the circle encloses no net current', () => {
    h.start(5, 5);
    const [s] = h.sliders();
    expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([2, 60, 2]);
    h.click(FIRE);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/encloses no net current/);
    expect(h.hearts()).toBe(2);
  });

  it('a probe check costs a charge, then there are no charges left; a miss never states the answer', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      h.click(TEST);
      expect(h.feedback()).toMatch(/Probe check:/);
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(h.hearts()).toBe(3);
      const r = build(level, 5)[0];
      set(r, false);
      h.click(FIRE);
      h.advance(2.8);
      const f = h.feedback();
      expect(h.hearts()).toBe(2);
      if (r.kind === 'bus') expect(has(f, `${r.r} cm`)).toBe(false);
      if (r.kind === 'col') expect(has(f, `${r.rout} cm`)).toBe(false);
      if (r.kind === 'xpt') expect(has(f, `${r.x} cm`)).toBe(false);
      if (r.kind === 'sol') expect(has(f, `${r.L} cm`)).toBe(false);
      if (r.kind === 'tor') expect(has(f, `${r.r} cm`)).toBe(false);
    }
  });

  it('a win teaches its law: Calibrated!, Both probes agree!, Exhaust on target!, Plasma current started!, Plasma held!', () => {
    const want = [/^Calibrated!/, /^Both probes agree!/, /^Exhaust on target!/, /^Plasma current started!/, /^Plasma held!/];
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], true);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(want[level - 1]);
      expect(h.hearts()).toBe(3);
    }
  });

  it('the hint line fades round by round', () => {
    h.start(1, 5);
    expect(h.note()).toMatch(/Round 1: the probe readout is live/);
    const g = build(1, 5);
    set(g[0], true);
    h.click(FIRE);
    h.advance(3.8);
    expect(h.note()).toMatch(/a probe check costs a charge/);
    set(g[1], true);
    h.click(FIRE);
    h.advance(3.8);
    expect(h.note()).toMatch(/Last shot: no readout/);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
  });

  it('the verdict lands at 0.9 s: the hearts are still 3 after 0.8 s and 2 after 1.0 s, and everything is over by 2.4 s', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], false);
      h.click(FIRE);
      h.advance(0.8);
      expect(h.hearts()).toBe(3);
      h.advance(0.2);
      expect(h.hearts()).toBe(2);
      expect(canvas().dataset.take).toBeDefined();
      h.advance(1.6);
      expect(h.phase()).toBe('play');
      expect(canvas().dataset.take).toBeUndefined();
    }
  });

  it('dragging the handles on the canvas moves the sliders', () => {
    h.start(1, 5);
    h.pointer('pointerdown', C.x + rayPx(5), C.y);
    h.pointer('pointermove', C.x + rayPx(50), C.y);
    h.pointer('pointerup', C.x + rayPx(50), C.y);
    expect(Number(h.sliders()[1].value)).toBe(50);
    h.pointer('pointerdown', PAD.x + 22, PAD.y);
    h.pointer('pointermove', PAD.x, PAD.y - 30);
    h.pointer('pointerup', PAD.x, PAD.y - 30);
    expect(Number(h.sliders()[0].value)).toBe(1);
    const r = build(5, 5)[0] as Extract<Round, { kind: 'tor' }>;
    h.start(5, 5);
    h.pointer('pointerdown', C.x + torPx(r, 2), C.y);
    h.pointer('pointermove', C.x + torPx(r, r.r), C.y);
    expect(Math.abs(Number(h.sliders()[0].value) - r.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(invTorPx(r, torPx(r, 30)) - 30)).toBeLessThan(1e-9);
  });

  it('the take on screen always agrees with the rules: every reachable setting shows its own fault, and only the answer shows a win', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of LEVELS) {
      const r = build(level, 11)[0];
      for (const x of settings(level, r).filter((_, i) => i % 3 === 0)) {
        h.start(level, 11);
        apply(x);
        h.click(FIRE);
        h.advance(0.2);
        expect(canvas().dataset.take).toBe(fault(r, asValues(r, x)) ?? 'win');
        h.advance(2.7);
      }
    }
    expect(err).not.toHaveBeenCalled();
  });

  it('the miss burst and the −1 float land at the same fixed point whichever setting was wrong', () => {
    const spots = new Set<string>();
    for (const level of LEVELS) {
      const R = canvasRecorder();
      h.start(level, 11);
      set(build(level, 11)[0], false);
      h.click(FIRE);
      R.clear();
      h.advance(2.8);
      const floats = R.rec.at.filter((a) => a.s === '−1 ♥');
      expect(floats.length).toBeGreaterThan(0);
      floats.forEach((a) => spots.add(String(a.x)));
    }
    expect([...spots]).toEqual(['320']);
  });
});

describe('First Plasma on the canvas', () => {
  const GOAL_RE = [/^Calibrate: .* µT along the arrow$/, /^Both probes must read .* mT$/, /^Put the plate on the null point$/, /^Solenoid: .* mT inside$/, /^Toroidal field: .* mT$/];
  it('the goal line is drawn at round start in every level and gone once the shot is fired', () => {
    for (const level of LEVELS) {
      const R = canvasRecorder();
      h.start(level, 5);
      expect(frame(R).filter((s) => GOAL_RE[level - 1].test(s)).length).toBe(1);
      h.click(FIRE);
      expect(frame(R, 0.3).some((s) => GOAL_RE[level - 1].test(s))).toBe(false);
    }
  });

  it('every handle ring is 20 px, at the start setting, and the readouts show the player’s own settings', () => {
    for (const level of LEVELS) {
      const R = canvasRecorder();
      h.start(level, 5);
      const r = build(level, 5)[0] as never as Record<string, number>;
      const spots: [number, number][] =
        level === 1 ? [[C.x + rayPx(5), C.y], [PAD.x + 22, PAD.y]]
        : level === 2 ? [[C.x - inPx(r as never, 1), C.y], [C.x + outPx(r as never, r.a + 1), C.y]]
        : level === 3 ? [[xPx(2), LINE.y]]
        : level === 4 ? [[SOLE.x0 + 80, SOLE.y]]
        : [[C.x + torPx(r as never, 2), C.y]];
      frame(R);
      for (const [x, y] of spots) expect(R.rec.arcs.some((a) => Math.abs(a.x - x) < 1 && Math.abs(a.y - y) < 1 && a.r === 20), `ring at ${x}, ${y}`).toBe(true);
      const read = R.rec.at.map((a) => a.s);
      if (level === 1) expect(read).toContain('5 cm');
      if (level === 2) expect(read).toEqual(expect.arrayContaining(['1 cm', `${r.a + 1} cm`]));
      if (level === 3) expect(read).toContain('2 cm');
      if (level === 4) expect(read).toContain('20 cm');
      if (level === 5) expect(read).toEqual(expect.arrayContaining(['2 cm', 'hole']));
    }
  });

  it('level 1 round 1 shows the drag cue until the first drag', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    expect(frame(R)).toContain('drag the probe ⇔');
    h.pointer('pointerdown', C.x + rayPx(5), C.y);
    h.pointer('pointerup', C.x + rayPx(5), C.y);
    expect(frame(R)).not.toContain('drag the probe ⇔');
  });

  for (const level of LEVELS) {
    it(`level ${level}: the readout is live in round 1, shows for 1.5 s after a probe check in round 2, and never in round 3`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      expect(lcdDrawn(level, frame(R))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(lcdDrawn(level, frame(R, 0.3))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      for (const x of settings(level, g[1]).filter((_, i) => i % 9 === 0)) {
        apply(x);
        expect(lcdDrawn(level, frame(R))).toBe(false);
      }
      h.click(TEST);
      expect(lcdDrawn(level, frame(R, 0.3))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      expect(lcdDrawn(level, frame(R, 1.0))).toBe(true);
      expect(lcdDrawn(level, frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      set(g[1], true);
      h.click(FIRE);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const x of settings(level, g[2]).filter((_, i) => i % 9 === 0)) {
        apply(x);
        expect(lcdDrawn(level, frame(R))).toBe(false);
      }
      set(g[2], true);
      expect(lcdDrawn(level, frame(R))).toBe(false);
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(canvas().dataset.lcd).toBe('0');
    });
  }

  it('no text drawn before the shot contains a round’s answer while the player’s own value differs (all three rounds)', () => {
    for (const level of LEVELS) {
      const R = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      for (let k = 0; k < 3; k++) {
        for (const x of settings(level, g[k]).filter((_, i) => i % 3 === 0)) {
          apply(x);
          const texts = frame(R);
          for (const token of tokenOf(g[k], x)) expect(texts.some((s) => has(s, token)), `level ${level} round ${k + 1}: ${token}`).toBe(false);
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

  it('level 1: before the shot only the probe’s own arrow and the pad’s four labels are drawn as arrows (apart from the readout)', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    const g = build(1, 5);
    for (let k = 0; k < 3; k++) {
      for (const x of settings(1, g[k]).filter((_, i) => i % 6 === 0)) {
        apply(x);
        const texts = frame(R).filter((s) => !LCD_RE[0].test(s) && ARROWS.some((a) => s.includes(a)));
        expect(texts.every((s) => ARROWS.includes(s))).toBe(true);
        expect(texts.length).toBe(5);
      }
      if (k < 2) {
        set(g[k], true);
        h.click(FIRE);
        h.advance(3.8);
      }
    }
  });

  it('level 4 always draws the same coil: the label never changes with the length', () => {
    const R = canvasRecorder();
    h.start(4, 5);
    const lens = new Set<number>();
    for (const L of [20, 60, 150]) {
      h.setSlider(L);
      const texts = frame(R);
      lens.add(texts.filter((s) => / turns · /.test(s)).length);
    }
    expect([...lens]).toEqual([1]);
  });

  it('a miss says in plain words what to change, never the answer', () => {
    const want = [/(Move the probe (closer|farther out)|Use the right-hand grip rule to choose the side)\.$/, /Move it (in|out)\.$/, /The null lies (nearer|farther from) the plasma\.$/, /Make it (longer|shorter)\.$/, /Move the probe (in|farther out)\.$/];
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], false);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback(), `level ${level}`).toMatch(want[level - 1]);
    }
  });
});
