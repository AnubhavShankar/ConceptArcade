// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch06-electromagnetic-induction/lenz-lab/index';
import { buildRounds, fault, firstWrong, rocket, rocketAnswer, steady, tunnelAnswer, verdictDelay, type Round, type Values } from '../src/games/physics/class-12/ch06-electromagnetic-induction/lenz-lab/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'lenz-lab', 3);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3, createRng(seed));
const FIRE = 'Start the ride';
const CHECK = ['Flux check: read the flux meter for this setting', 'Flux check: read the flux meter for this setting', 'Brake check: read the brake meter for this setting'];
function set(r: Round, right: boolean) {
  if (r.kind === 'rocket') {
    const a = rocketAnswer(r);
    h.setSlider(a.pole, 0);
    h.setSlider(right ? a.move : 0, 1); // hold never wins
    h.setSlider(1, 2);
  }
  if (r.kind === 'tunnel') {
    const z = tunnelAnswer(r);
    z.forEach((v, i) => h.setSlider(right || i > 0 ? v : 1 - v, i)); // flip sign 1 for a miss
  }
  if (r.kind === 'brake') h.setSlider(right ? r.r : r.r + 1);
}
shellTests<Round[]>(h, { levels: [1, 2, 3], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });

const canvas = () => h.$('canvas')!;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
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
/** Every setting the level's dials can reach, in the dial order. */
const settings = (level: number): number[][] => {
  if (level === 1) return [0, 1].flatMap((pole) => [-1, 0, 1].flatMap((move) => [0, 1].map((ring) => [pole, move, ring])));
  if (level === 2) return Array.from({ length: 8 }, (_, i) => [(i >> 2) & 1, (i >> 1) & 1, i & 1]);
  return Array.from({ length: 25 }, (_, i) => [i + 1]);
};
const apply = (x: number[]) => x.forEach((v, i) => h.setSlider(v, i));
const asValues = (level: number, x: number[]): Values => (level === 1 ? { pole: x[0], move: x[1], ring: x[2] } : level === 2 ? { z0: x[0], z1: x[1], z2: x[2] } : { r: x[0] });
const fireAndLook = (level: number, x: number[], seed: number, seconds: number) => {
  h.start(level, seed);
  apply(x);
  h.click(FIRE);
  h.advance(seconds);
  return canvas().dataset;
};
const LCD_RE = [/^RING MAKES B|^RING: NO CURRENT/, /^INDUCED [⊙⊗]$/, /^STEADY .* m\/s$/];
const GOAL_RE = /^Launch the ring|^Pull the ring down|^Flash the cues:|^Safe speed:/;

describe('Night Shift at Magnet Park', () => {
  it('level 1 has three sliders: Pole 0..1 from 1, Move −1..1 from 0, Ring 0..1 from 1', () => {
    h.start(1, 5);
    const s = h.sliders();
    expect(s.length).toBe(3);
    expect(s.map((e) => [Number(e.min), Number(e.max), Number(e.value)])).toEqual([[0, 1, 1], [-1, 1, 0], [0, 1, 1]]);
    expect([...document.querySelectorAll('.control-label')].map((e) => e.textContent)).toEqual(['Pole', 'Move', 'Ring']);
  });

  it('level 2 has three switches from 0 to 1 starting at 1; level 3 has one slider from 1 to 25 starting at 1', () => {
    h.start(2, 5);
    expect(h.sliders().map((e) => [Number(e.min), Number(e.max), Number(e.value)])).toEqual([[0, 1, 1], [0, 1, 1], [0, 1, 1]]);
    h.start(3, 5);
    expect(h.sliders().map((e) => [Number(e.min), Number(e.max), Number(e.value), Number(e.step)])).toEqual([[1, 25, 1, 1]]);
  });

  it('level 1 at the start setting says the magnet held still; with the ring split it says split', () => {
    h.start(1, 5);
    h.click(FIRE);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/held still/);
    expect(h.hearts()).toBe(2);
    h.start(1, 5);
    const a = rocketAnswer(build(1, 5)[0] as Extract<Round, { kind: 'rocket' }>);
    h.setSlider(a.pole, 0);
    h.setSlider(a.move, 1);
    h.setSlider(0, 2);
    h.click(FIRE);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/split/);
    expect(h.hearts()).toBe(2);
  });

  it('a check costs a charge, then there are no charges left, and the hearts stay at 3; level 3 says Brake check', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      h.click(CHECK[level - 1]);
      expect(h.feedback()).toMatch(level === 3 ? /Brake check/ : /Flux check/);
      expect(h.hud()).toMatch(/Charges ·/);
      h.click(CHECK[level - 1]);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a win says Showtime!, What a show! or Smooth stop!', () => {
    const want = [/^Showtime!/, /^What a show!/, /^Smooth stop!/];
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      set(build(level, 5)[0], true);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(want[level - 1]);
      expect(h.hearts()).toBe(3);
    }
  });

  it('level 3: one step above the answer slams into the buffer, one step below stops short, and neither says the answer', () => {
    for (const [d, re] of [[1, /slammed into the buffer/], [-1, /stopped short/]] as [number, RegExp][]) {
      h.start(3, 5);
      const r = build(3, 5)[0] as Extract<Round, { kind: 'brake' }>;
      h.setSlider(r.r + d);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(re);
      expect(has(h.feedback(), `${r.r} mΩ`)).toBe(false);
      expect(h.hearts()).toBe(2);
    }
  });

  it('the take on screen agrees with the rules: every reachable setting shows its own fault, only the answer shows a win, and the ring does what the physics says', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3]) {
      const r = build(level, 11)[0];
      for (const x of settings(level)) {
        const d = fireAndLook(level, x, 11, 0.9);
        const v = asValues(level, x);
        expect(d.take, `level ${level} ${x}`).toBe(fault(r, v) ?? 'win');
        if (r.kind === 'rocket') {
          const o = rocket(r, x[0], x[1], x[2]);
          expect(d.ring).toBe(o === 'hold' || o === 'split' ? 'still' : o.split('-')[0]);
        }
        h.advance(2);
        if (d.take !== 'win') expect(canvas().dataset.take, 'the scene is back at rest after a miss').toBeUndefined();
      }
    }
    expect(err).not.toHaveBeenCalled();
  });

  it('the verdict lands at 0.65 s in level 1, at the first wrong sign in level 2, and at 1.5, 1.8 or 1.9 s in level 3', () => {
    h.start(1, 5);
    h.click(FIRE);
    h.advance(0.55);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
    // level 2: a wrong first sign lands at 0.55 s, a wrong third sign at 1.75 s
    const r2 = build(2, 5)[0] as Extract<Round, { kind: 'tunnel' }>;
    for (const wrong of [0, 2]) {
      h.start(2, 5);
      tunnelAnswer(r2).forEach((v, i) => h.setSlider(i === wrong ? 1 - v : v, i));
      const at = verdictDelay(r2, { z0: wrong === 0 ? 1 - tunnelAnswer(r2)[0] : tunnelAnswer(r2)[0], z1: tunnelAnswer(r2)[1], z2: wrong === 2 ? 1 - tunnelAnswer(r2)[2] : tunnelAnswer(r2)[2] });
      expect(at).toBeCloseTo(0.55 + 0.6 * wrong, 5);
      h.click(FIRE);
      h.advance(at - 0.15);
      expect(h.hearts()).toBe(3);
      h.advance(0.3);
      expect(h.hearts()).toBe(2);
    }
    const r3 = build(3, 5)[0] as Extract<Round, { kind: 'brake' }>;
    for (const [d, at] of [[1, 1.5], [-1, 1.9]] as [number, number][]) {
      h.start(3, 5);
      h.setSlider(r3.r + d);
      h.click(FIRE);
      h.advance(at - 0.15);
      expect(h.hearts()).toBe(3);
      h.advance(0.3);
      expect(h.hearts()).toBe(2);
    }
    h.start(3, 5);
    h.setSlider(r3.r);
    h.click(FIRE);
    h.advance(1.65);
    expect(h.score()).toBe(0);
    h.advance(0.3);
    expect(h.score()).toBeGreaterThan(0);
  });

  it('level 2 stops at the first wrong sign: the later signs stay still', () => {
    const r = build(2, 5)[0] as Extract<Round, { kind: 'tunnel' }>;
    const rec = canvasRecorder();
    h.start(2, 5);
    tunnelAnswer(r).forEach((v, i) => h.setSlider(i === 0 ? 1 - v : v, i));
    expect(firstWrong(r, { z0: 1 - tunnelAnswer(r)[0], z1: tunnelAnswer(r)[1], z2: tunnelAnswer(r)[2] })).toBe(0);
    h.click(FIRE);
    rec.clear();
    h.advance(1.9);
    const marks = rec.rec.at.filter((a) => a.s === '✓' || a.s === '✗').map((a) => a.s);
    expect(marks).toContain('✗');
    expect(marks).not.toContain('✓');
  });

  it('level 3: the car’s pace takes one of three fixed values, whatever the player’s resistance', () => {
    const r = build(3, 11)[0] as Extract<Round, { kind: 'brake' }>;
    const at = new Map<string, Set<string>>();
    for (let R = 1; R <= 25; R++) {
      const d = fireAndLook(3, [R], 11, 1.0);
      const f = fault(r, { r: R }) ?? 'win';
      if (!at.has(f)) at.set(f, new Set());
      at.get(f)!.add(d.carX!);
      expect(steady(r, R)).toBeGreaterThan(0);
    }
    for (const xs of at.values()) expect(xs.size).toBe(1);
    expect(at.size).toBe(3);
  });

  it('the miss burst and the −1 float land at the same fixed point whichever setting was wrong', () => {
    const spots = new Set<string>();
    for (const level of [1, 2, 3]) {
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

describe('Night Shift at Magnet Park UX', () => {
  const frame = (R: ReturnType<typeof canvasRecorder>, dt: number) => {
    if (dt > 0.05) h.advance(dt - 0.05);
    R.clear();
    h.advance(0.05);
    return R.rec;
  };
  for (const level of [1, 2, 3]) {
    it(`level ${level}: the goal line is drawn during play and not while the ride runs; every handle ring is at least 18 px`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const rec = frame(R, 0.05);
      const goal = rec.at.filter((a) => GOAL_RE.test(a.s));
      expect(goal.length).toBe(1);
      expect(goal[0].y).toBe(40);
      const rings = rec.arcs.filter((a) => a.r >= 18);
      expect(rings.length).toBeGreaterThanOrEqual(level === 3 ? 1 : 3);
      h.click(FIRE);
      h.advance(0.3);
      expect(frame(R, 0.05).at.some((a) => GOAL_RE.test(a.s))).toBe(false);
    });
  }

  it('level 1 shows the player’s own settings under the podium, and level 2 beside each switch', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    expect(frame(R, 0.05).at.map((a) => a.s)).toEqual(expect.arrayContaining(['N', 'HOLD', 'CLOSED']));
    h.setSlider(0, 0);
    h.setSlider(-1, 1);
    h.setSlider(0, 2);
    expect(frame(R, 0.05).at.map((a) => a.s)).toEqual(expect.arrayContaining(['S', 'AWAY', 'SPLIT']));
    h.start(2, 5);
    h.setSlider(0, 1);
    expect(frame(R, 0.05).at.map((a) => a.s)).toEqual(expect.arrayContaining(['⊗ in', '⊙ out']));
    h.start(3, 5);
    h.setSlider(7);
    expect(frame(R, 0.05).at.map((a) => a.s)).toContain('R 7 mΩ');
  });

  it('round 1 of level 1 shows a blinking "drag" cue until a lever is first moved', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    let seen = false;
    for (let i = 0; i < 12; i++) seen = seen || frame(R, 0.05).at.some((a) => a.s === 'drag');
    expect(seen).toBe(true);
    h.setSlider(1, 1);
    frame(R, 0.05);
    for (let i = 0; i < 12; i++) expect(frame(R, 0.05).at.some((a) => a.s === 'drag')).toBe(false);
  });

  it('a ticket drops in at the start of every round', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    h.advance(0.1);
    expect(frame(R, 0.05).at.map((a) => a.s)).toContain('SHOW 1');
    playTo(1, 2);
    h.advance(0.1);
    expect(frame(R, 0.05).at.map((a) => a.s)).toContain('FINAL SHOW');
    expect(frame(R, 2).at.map((a) => a.s)).not.toContain('FINAL SHOW');
  });

});

describe('Night Shift at Magnet Park never leaks the answer', () => {
  for (const level of [1, 2, 3]) {
    it(`level ${level}: the LCD is live in round 1, shows for 1.5 s after a check in round 2, and never in round 3`, () => {
      const R = canvasRecorder();
      const drawn = (rec: { at: { s: string }[] }) => rec.at.some((a) => LCD_RE[level - 1].test(a.s));
      const frame2 = (dt: number) => {
        if (dt > 0.05) h.advance(dt - 0.05);
        R.clear();
        h.advance(0.05);
        return R.rec;
      };
      h.start(level, 5);
      expect(drawn(frame2(0.05))).toBe(true);
      expect(canvas().dataset.helper).toBe('1');
      // round 2: hidden at every setting; a check shows it for 1.5 s, once
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(drawn(frame2(0.3))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      for (const x of settings(level).filter((_, i) => i % 5 === 0)) {
        apply(x);
        expect(drawn(frame2(0.05))).toBe(false);
      }
      h.click(CHECK[level - 1]);
      expect(drawn(frame2(0.3))).toBe(true);
      expect(canvas().dataset.helper).toBe('1');
      expect(drawn(frame2(1.0))).toBe(true);
      expect(drawn(frame2(0.5))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      h.click(CHECK[level - 1]);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(drawn(frame2(0.5))).toBe(false);
      // round 3: never, at any setting, even the winning one; a check is refused
      set(g[1], true);
      h.click(FIRE);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const x of settings(level).filter((_, i) => i % 3 === 0)) {
        apply(x);
        expect(drawn(frame2(0.05))).toBe(false);
      }
      set(g[2], true);
      expect(drawn(frame2(0.05))).toBe(false);
      h.click(CHECK[level - 1]);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(drawn(frame2(0.5))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
    });
  }

  it('level 3: before the player moves the slider, no drawn text contains the answer in mΩ (all three rounds)', () => {
    const R = canvasRecorder();
    h.start(3, 5);
    const g = build(3, 5) as Extract<Round, { kind: 'brake' }>[];
    for (let k = 0; k < 3; k++) {
      R.clear();
      h.advance(0.3);
      expect(R.rec.at.some((a) => has(a.s, `R ${g[k].r} mΩ`))).toBe(false);
      set(g[k], true);
      if (k < 2) {
        h.click(FIRE);
        h.advance(2.8);
        h.advance(1);
      }
    }
  });

  it('level 1: the lamps and the cue board never show the answer’s pole or move before the ride', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    h.advance(0.3);
    R.clear();
    h.advance(0.3);
    const words = R.rec.at.map((a) => a.s);
    for (const w of ['TOWARD', 'AWAY']) expect(words).not.toContain(w);
  });
});
