// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch06-electromagnetic-induction/faraday-bench/index';
import { GLOW, buildRounds, crackAt, fault, verdictDelay, type Round, type Values } from '../src/games/physics/class-12/ch06-electromagnetic-induction/faraday-bench/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'faraday-bench', 4);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4, createRng(seed));
const FIRE = 'Signal the ship: run the station and light the beacon';
const CHECK = 'Console check: read the station meter for this setting';
function set(r: Round, right: boolean) {
  if (r.kind === 'out') h.setSlider(right ? r.th : r.th + 5);
  if (r.kind === 'tube') h.setSlider(right ? r.r : r.r + 0.5);
  if (r.kind === 'flip') h.setSlider(right ? r.t : Number((r.t + 0.1).toFixed(1)));
  if (r.kind === 'show') h.setSlider(right ? r.n : r.n + 10);
}
/** The dial values `set` puts in, for the rules. */
const vals = (r: Round, right: boolean): Values =>
  r.kind === 'out' ? { th: right ? r.th : r.th + 5 } : r.kind === 'tube' ? { r: right ? r.r : r.r + 0.5 } : r.kind === 'flip' ? { t: right ? r.t : Number((r.t + 0.1).toFixed(1)) } : { n: right ? r.n : r.n + 10 };
shellTests<Round[]>(h, { levels: [1, 2, 3, 4], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });

const canvas = () => h.$('canvas')!;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const range = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Number((min + i * step).toFixed(6)));
/** Every value the level's dial can reach. */
const SETTINGS: number[][] = [range(0, 90, 5), range(1, 8, 0.5), Array.from({ length: 20 }, (_, i) => Number((0.1 * (i + 1)).toFixed(1))), range(10, 200, 10)];
const asValues = (level: number, x: number): Values => (level === 1 ? { th: x } : level === 2 ? { r: x } : level === 3 ? { t: x } : { n: x });
const token = (r: Round) => (r.kind === 'out' ? `${r.th}°` : r.kind === 'tube' ? `${r.r} cm` : r.kind === 'flip' ? `${r.t} s` : `${r.n} turns`);
const answerTag = (r: Round) => (r.kind === 'out' ? `θ ${r.th}°` : r.kind === 'tube' ? `r ${r.r} cm` : r.kind === 'flip' ? `${r.t} s flip` : `N ${r.n}`);
const LCD_RE = [/^WINK .* V$/, /^WINK .* V$/, /^WINK .* mA$/, /^PEAK .* V$/];
const GOAL_RE = /^Light Wink|^Signal:/;
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
const frame = (R: ReturnType<typeof canvasRecorder>, dt: number) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};

describe('The Deep-Sea Beacon', () => {
  it('the sliders run as the brief says: tilt 0 to 90 from 90, ring 1 to 8 from 1, flip 0.1 to 2 from 2, turns 10 to 200 from 10', () => {
    const want = [[0, 90, 5, 90], [1, 8, 0.5, 1], [0.1, 2, 0.1, 2], [10, 200, 10, 10]];
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      const s = h.sliders();
      expect(s.length).toBe(1);
      expect([Number(s[0].min), Number(s[0].max), Number(s[0].step), Number(s[0].value)]).toEqual(want[level - 1]);
    }
  });

  it('level 1 at the start (edge-on, 90°) says Wink stayed dark; at 0° it says the glass cracked', () => {
    h.start(1, 5);
    h.click(FIRE);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/stayed dark/);
    expect(h.hearts()).toBe(2);
    h.start(1, 5);
    h.setSlider(0);
    h.click(FIRE);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/cracked/);
    expect(h.hearts()).toBe(2);
  });

  it('a console check costs a charge, then there are no charges left, and the hearts stay at 3', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      h.click(CHECK);
      expect(h.feedback()).toMatch(/Console check/);
      expect(h.hud()).toMatch(/Charges ·/);
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a win says Spotted! in levels 1 to 3 and Signal received! in level 4, and keeps three hearts', () => {
    const want = [/^Spotted!/, /^Spotted!/, /^Spotted!/, /^Signal received!/];
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      set(build(level, 5)[0], true);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(want[level - 1]);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a miss never states the answer, says which way to go, and costs a heart', () => {
    for (const level of [1, 2, 3, 4]) {
      for (let k = 0; k < 3; k++) {
        h.start(level, 5);
        const g = build(level, 5);
        for (let i = 0; i < k; i++) {
          set(g[i], true);
          h.click(FIRE);
          h.advance(3.8);
        }
        set(g[k], false);
        h.click(FIRE);
        h.advance(2.8);
        expect(has(h.feedback(), token(g[k])), h.feedback()).toBe(false);
        expect(h.feedback()).toMatch(/\.$/);
        expect(h.hearts()).toBe(2);
      }
    }
  });

  it('the take on screen agrees with the rules: every reachable setting shows its own fault, only the answer shows a win, and the glow is one fixed value on a miss', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      const r = build(level, 11)[0];
      for (const x of SETTINGS[level - 1]) {
        h.start(level, 11);
        h.setSlider(x);
        h.click(FIRE);
        h.advance(0.35);
        const d = canvas().dataset;
        const f = fault(r, asValues(level, x));
        expect(d.take, `level ${level} ${x}`).toBe(f ?? 'win');
        const glow = Number(d.glow);
        if (f === 'dim') expect([0, GLOW.dim]).toContain(glow);
        if (f === 'blown') expect([0, GLOW.blown]).toContain(glow);
        h.advance(2.5);
      }
    }
    expect(err).not.toHaveBeenCalled();
  });

  it('the verdict lands at its own moment: the hearts drop (or the score rises) just after verdictDelay', () => {
    for (const level of [1, 2, 3, 4]) {
      const r = build(level, 5)[0];
      for (const right of [false, true]) {
        h.start(level, 5);
        set(r, right);
        const at = verdictDelay(r, vals(r, right));
        h.click(FIRE);
        h.advance(at - 0.15);
        expect(right ? h.score() : h.hearts(), `level ${level} ${right}`).toBe(right ? 0 : 3);
        h.advance(0.3);
        if (right) expect(h.score()).toBeGreaterThan(0);
        else expect(h.hearts()).toBe(2);
      }
    }
  });

  it('a blown miss cracks Wink before its verdict, at the fixed moment of the brief', () => {
    for (const [level, want] of [[1, 0.4], [2, 0.38], [3, 0.4]] as [number, number][]) {
      const r = build(level, 5)[0];
      expect(crackAt(r, level === 1 ? { th: 0 } : level === 2 ? { r: 8 } : { t: 0.1 })).toBe(want);
    }
  });

  it('the miss burst and the −1 float land at the same fixed point whichever setting was wrong', () => {
    const spots = new Set<string>();
    for (const level of [1, 2, 3, 4]) {
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

describe('The Deep-Sea Beacon UX', () => {
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level}: the goal line is drawn once at y = 40 during play and not while a dive plays; every handle ring is at least 18 px`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const rec = frame(R, 0.05);
      const goal = rec.at.filter((a) => GOAL_RE.test(a.s));
      expect(goal.length).toBe(1);
      expect(goal[0].y).toBe(40);
      expect(goal[0].s).toMatch(level === 3 ? /mA$/ : /V$/);
      expect(rec.arcs.filter((a) => a.r >= 18).length).toBeGreaterThanOrEqual(1);
      h.click(FIRE);
      h.advance(0.3);
      expect(frame(R, 0.05).at.some((a) => GOAL_RE.test(a.s))).toBe(false);
    });
  }

  it('every setting is shown by its handle: θ, r, flip time and N', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    h.setSlider(35);
    expect(frame(R, 0.05).at.map((a) => a.s)).toContain('θ 35°');
    h.start(2, 5);
    h.setSlider(4.5);
    expect(frame(R, 0.05).at.map((a) => a.s)).toContain('r 4.5 cm');
    h.start(3, 5);
    h.setSlider(0.7);
    expect(frame(R, 0.05).at.map((a) => a.s)).toContain('0.7 s flip');
    h.start(4, 5);
    h.setSlider(120);
    expect(frame(R, 0.05).at.map((a) => a.s)).toContain('N 120');
  });

  it('level 1 round 1 shows a blinking "drag" cue until the hoop is first moved', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    let seen = false;
    for (let i = 0; i < 12; i++) seen = seen || frame(R, 0.05).at.some((a) => a.s === 'drag');
    expect(seen).toBe(true);
    h.setSlider(60);
    frame(R, 0.05);
    for (let i = 0; i < 12; i++) expect(frame(R, 0.05).at.some((a) => a.s === 'drag')).toBe(false);
  });

  it('a dive slate drops in at the start of every round: DIVE 1, DIVE 2, FINAL DIVE', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    h.advance(0.1);
    expect(frame(R, 0.05).at.map((a) => a.s)).toContain('DIVE 1');
    playTo(1, 1);
    h.advance(0.1);
    expect(frame(R, 0.05).at.map((a) => a.s)).toContain('DIVE 2');
    playTo(1, 2);
    h.advance(0.1);
    expect(frame(R, 0.05).at.map((a) => a.s)).toContain('FINAL DIVE');
    expect(frame(R, 2).at.map((a) => a.s)).not.toContain('FINAL DIVE');
  });

  it('the topside screen says SPOTTED!, NOTHING… or BEACON LOST only after the verdict', () => {
    for (const [level, right, word] of [[1, true, 'SPOTTED!'], [1, false, 'NOTHING…'], [2, false, 'BEACON LOST']] as [number, boolean, string][]) {
      const R = canvasRecorder();
      h.start(level, 5);
      const r = build(level, 5)[0];
      if (level === 2) h.setSlider(8);
      else set(r, right);
      expect(frame(R, 0.05).at.map((a) => a.s)).toContain('WATCHING…');
      h.click(FIRE);
      expect(frame(R, 0.2).at.map((a) => a.s)).not.toContain(word);
      let seen = false;
      for (let i = 0; i < 12; i++) seen = seen || frame(R, 0.1).at.some((a) => a.s === word);
      expect(seen, word).toBe(true);
    }
  });
});

describe('The Deep-Sea Beacon never leaks the answer', () => {
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level}: the console LCD is live in round 1, shows for 1.5 s after a check in round 2, and never in round 3`, () => {
      const R = canvasRecorder();
      const drawn = (rec: { at: { s: string }[] }) => rec.at.some((a) => LCD_RE[level - 1].test(a.s));
      h.start(level, 5);
      expect(drawn(frame(R, 0.05))).toBe(true);
      expect(canvas().dataset.helper).toBe('1');
      // round 2: hidden at every setting; a check shows it for 1.5 s, once
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(drawn(frame(R, 0.3))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      for (const x of SETTINGS[level - 1].filter((_, i) => i % 4 === 0)) {
        h.setSlider(x);
        expect(drawn(frame(R, 0.05))).toBe(false);
      }
      h.click(CHECK);
      expect(drawn(frame(R, 0.3))).toBe(true);
      expect(canvas().dataset.helper).toBe('1');
      expect(drawn(frame(R, 1.0))).toBe(true);
      expect(drawn(frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(drawn(frame(R, 0.5))).toBe(false);
      // round 3: never, at any setting, even the winning one; a check is refused
      set(g[1], true);
      h.click(FIRE);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const x of SETTINGS[level - 1].filter((_, i) => i % 3 === 0)) {
        h.setSlider(x);
        expect(drawn(frame(R, 0.05))).toBe(false);
      }
      set(g[2], true);
      expect(drawn(frame(R, 0.05))).toBe(false);
      h.click(CHECK);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(drawn(frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.helper).toBe('0');
    });

    it(`level ${level}: during a dive the LCD is live in round 1, shows the true value on a win and is off on a miss in round 2`, () => {
      const R = canvasRecorder();
      const drawn = (rec: { at: { s: string }[] }) => rec.at.some((a) => LCD_RE[level - 1].test(a.s));
      h.start(level, 5);
      set(build(level, 5)[0], false);
      h.click(FIRE);
      expect(drawn(frame(R, 0.3))).toBe(true);
      h.advance(3);
      const g = playTo(level, 1);
      set(g[1], false);
      h.click(FIRE);
      expect(drawn(frame(R, 0.3))).toBe(false);
      h.advance(3);
      set(g[1], true);
      h.click(FIRE);
      expect(drawn(frame(R, 0.3))).toBe(true);
    });

    it(`level ${level}: before the player moves the slider, no drawn text contains the round's answer`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      for (let k = 0; k < 3; k++) {
        R.clear();
        h.advance(0.3);
        expect(R.rec.at.some((a) => has(a.s, answerTag(g[k])))).toBe(false);
        set(g[k], true);
        if (k < 2) {
          h.click(FIRE);
          h.advance(2.8);
          h.advance(1);
        }
      }
    });
  }
});
