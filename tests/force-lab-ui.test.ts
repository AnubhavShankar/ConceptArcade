// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/force-lab/index';
import { buildRounds, fault, goal, type Round, type Values } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/force-lab/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'force-lab', 5);
type L = 1 | 2 | 3 | 4 | 5;
const LEVELS: L[] = [1, 2, 3, 4, 5];
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));
const FIRE = 'Power on: run the beam with these settings';
const TEST = 'Monitor check: read the beam monitor for this setting';
const up = (x: number, s: number) => Number((x + s).toFixed(1));

function set(r: Round, right: boolean) {
  if (r.kind === 'kick') { h.setSlider(r.out, 0); h.setSlider(right ? r.b : up(r.b, 0.1), 1); }
  if (r.kind === 'lift') { h.setSlider(r.cur, 0); h.setSlider(right ? r.i : up(r.i, 0.1), 1); }
  if (r.kind === 'cyc') { h.setSlider(r.b, 0); h.setSlider(right ? r.f : up(r.f, 0.1), 1); }
  if (r.kind === 'speed') { h.setSlider(right ? r.r : r.r + 1, 0); h.setSlider(r.f0, 1); }
  if (r.kind === 'focus') h.setSlider(right ? r.b : up(r.b, 0.5));
}
shellTests<Round[]>(h, { levels: [1, 2, 3, 4, 5], build, setRight: (g, k) => set(g[k], true), setWrong: (g, k) => set(g[k], false), commit: () => h.click(FIRE) });

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const canvas = () => h.$('canvas')!;
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
/** A few settings of each level's dials, in slider order. */
const SETS: Record<L, number[][]> = {
  1: [[0, 0.3], [1, 1.0], [0, 1.9], [1, 0.1]],
  2: [[0, 0.5], [1, 2.5], [0, 4.9]],
  3: [[0.5, 8], [1.5, 20], [2.5, 40]],
  4: [[10, 8], [40, 20], [80, 40]],
  5: [[1], [6], [19.5]],
};
const apply = (x: number[]) => x.forEach((v, i) => h.setSlider(v, i));
const asValues = (level: L, x: number[]): Values =>
  level === 1 ? { out: x[0], b: x[1] } : level === 2 ? { cur: x[0], i: x[1] } : level === 3 ? { b: x[0], f: x[1] } : level === 4 ? { r: x[0], f: x[1] } : { b: x[0] };
/** The number a round's answer is hidden behind, and the player's own value of the same dial. */
const token = (r: Round): string => (r.kind === 'kick' ? `${r.b} T` : r.kind === 'lift' ? `${r.i} A` : r.kind === 'cyc' ? `${r.b} T` : r.kind === 'speed' ? `${r.r} cm` : `${r.b} G`);
const ownToken = (level: L, x: number[]) => (level === 1 ? `${x[1]} T` : level === 2 ? `${x[1]} A` : level === 3 ? `${x[0]} T` : level === 4 ? `${x[0]} cm` : `${x[0]} G`);

const frame = (R: ReturnType<typeof canvasRecorder>, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec.at.map((a) => a.s);
};
const LCD_RE = [/^push .* N [⬆⬇]$/, /^push .* mN [⬆⬇] · weight/, /^lap .* MHz · out/, /^lap .* MHz · out/, /^pitch .* cm · width/];
const lcdDrawn = (level: L, texts: string[]) => texts.some((s) => LCD_RE[level - 1].test(s));

describe('Beam Hall', () => {
  it('level 1 has Field (0 to 1, starts at 1) and Kicker (0.1 to 2, step 0.1, starts at 0.1); level 3 has Magnet and RF; level 5 has Focus coil', () => {
    h.start(1, 5);
    const [f, k] = h.sliders();
    expect(h.sliders().length).toBe(2);
    expect([Number(f.min), Number(f.max), Number(f.value)]).toEqual([0, 1, 1]);
    expect([Number(k.min), Number(k.max), Number(k.step), Number(k.value)]).toEqual([0.1, 2, 0.1, 0.1]);
    h.start(3, 5);
    const [m, rf] = h.sliders();
    expect([Number(m.min), Number(m.max)]).toEqual([0.5, 2.5]);
    expect([Number(rf.min), Number(rf.max), Number(rf.step), Number(rf.value)]).toEqual([8, 40, 0.1, 8]);
    expect([...document.querySelectorAll('.control-label')].map((e) => e.textContent)).toEqual(['Magnet', 'RF']);
    h.start(5, 5);
    const [c] = h.sliders();
    expect(h.sliders().length).toBe(1);
    expect([Number(c.min), Number(c.max), Number(c.step), Number(c.value)]).toEqual([1, 20, 0.5, 1]);
    expect(document.querySelector('.control-label')?.textContent).toBe('Focus coil');
  });

  it('level 1 with the right strength and the wrong polarity misses with "Flip the field" and costs a heart', () => {
    h.start(1, 5);
    const r = build(1, 5)[0] as Extract<Round, { kind: 'kick' }>;
    h.setSlider(1 - r.out, 0);
    h.setSlider(r.b, 1);
    h.click(FIRE);
    h.advance(2.8);
    expect(h.feedback()).toContain('Flip the field');
    expect(h.hearts()).toBe(2);
  });

  it('level 5 at 1 G scrapes the glass in every round', () => {
    h.start(5, 5);
    h.click(FIRE);
    h.advance(2.8);
    expect(h.feedback()).toContain('scraped the glass');
    expect(h.hearts()).toBe(2);
  });

  it('a monitor check costs a charge, then there are no charges left', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      h.click(TEST);
      expect(h.feedback()).toMatch(/Monitor check:/);
      expect(h.hud()).toMatch(/Charges ·/);
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a win says Beam in!, It floats!, Dose on target! (twice) and Sharp spot!, with the working', () => {
    const want = [/^Beam in!/, /^It floats!/, /^Dose on target!/, /^Dose on target!/, /^Sharp spot!/];
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], true);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback()).toMatch(want[level - 1]);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a miss never states the answer, says what to change, and costs a heart', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      const r = build(level, 5)[0];
      set(r, false);
      h.click(FIRE);
      h.advance(2.8);
      const f = h.feedback();
      expect(h.hearts()).toBe(2);
      if (r.kind === 'kick') expect(has(f, `${r.b} T`)).toBe(false);
      if (r.kind === 'lift') expect(has(f, `${r.i} A`)).toBe(false);
      if (r.kind === 'speed') expect(has(f, `${r.r} cm`)).toBe(false);
      if (r.kind === 'focus') expect(has(f, `${r.b} G`)).toBe(false);
    }
  });

  it('the hint line fades round by round', () => {
    h.start(1, 5);
    expect(h.note()).toMatch(/Round 1: the beam monitor is live/);
    const g = build(1, 5);
    set(g[0], true);
    h.click(FIRE);
    h.advance(3.8);
    expect(h.note()).toMatch(/a monitor check costs a charge/);
    set(g[1], true);
    h.click(FIRE);
    h.advance(3.8);
    expect(h.note()).toMatch(/Last run: no monitor/);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
  });

  it('the verdict lands at the impact: 0.9 s in level 2, 0.85 s in level 1, 0.6 s for a scrape and 0.65 s when out of step', () => {
    h.start(2, 5);
    const r2 = build(2, 5)[0] as Extract<Round, { kind: 'lift' }>;
    h.setSlider(r2.cur, 0);
    h.setSlider(up(r2.i, 0.1), 1);
    h.click(FIRE);
    h.advance(0.8);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
    h.start(1, 5);
    const r1 = build(1, 5)[0] as Extract<Round, { kind: 'kick' }>;
    h.setSlider(1 - r1.out, 0);
    h.setSlider(r1.b, 1);
    h.click(FIRE);
    h.advance(0.75);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
    h.start(5, 5);
    h.click(FIRE);
    h.advance(0.5);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
    h.start(3, 5);
    const r3 = build(3, 5)[0] as Extract<Round, { kind: 'cyc' }>;
    h.setSlider(r3.b, 0);
    h.setSlider(up(r3.f, 0.1), 1);
    h.click(FIRE);
    h.advance(0.55);
    expect(h.hearts()).toBe(3);
    h.advance(0.2);
    expect(h.hearts()).toBe(2);
  });

  it('every animation is over by 2.4 s: after a run the scene is back to rest', () => {
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

  it('the run on screen always agrees with the rules: each setting shows its own fault, and only the answer shows a win', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of LEVELS) {
      const r = build(level, 11)[0];
      const answerSet: number[] = r.kind === 'kick' ? [r.out, r.b] : r.kind === 'lift' ? [r.cur, r.i] : r.kind === 'cyc' ? [r.b, r.f] : r.kind === 'speed' ? [r.r, r.f0] : [r.b];
      for (const x of [...SETS[level], answerSet]) {
        h.start(level, 11);
        apply(x);
        h.click(FIRE);
        h.advance(0.2);
        expect(canvas().dataset.take, `level ${level} ${x}`).toBe(fault(r, asValues(level, x)) ?? 'win');
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

describe('Beam Hall UX', () => {
  const GRIPS: Record<L, [number, number][]> = {
    1: [[330, 118], [180, 324]],
    2: [[198, 258], [180, 324]],
    3: [[452, 172], [180, 324]],
    4: [[314, 186], [180, 324]],
    5: [[180, 324]],
  };
  const READ: Record<L, string[]> = { 1: ['0.1 T'], 2: ['0.1 A'], 3: ['0.5 T', '8 MHz'], 4: ['10 cm', '8 MHz'], 5: ['1 G'] };
  for (const level of LEVELS) {
    it(`level ${level}: the goal line is drawn at round start and again after a miss, every grip is at least 18 px, and the readouts show the player’s own settings`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const r = build(level, 5)[0];
      const texts = frame(R, 0.05);
      expect(texts.filter((s) => s === goal(r)).length).toBe(1);
      for (const [x, y] of GRIPS[level]) expect(R.rec.arcs.some((a) => Math.abs(a.x - x) < 1 && Math.abs(a.y - y) < 1 && a.r >= 18), `grip at ${x}, ${y}`).toBe(true);
      expect(texts).toEqual(expect.arrayContaining(READ[level]));
      // no goal during the run, goal again when the round is replayed after a miss
      set(r, false);
      h.click(FIRE);
      h.advance(0.5);
      expect(frame(R, 0.05).includes(goal(r))).toBe(false);
      h.advance(2.3);
      expect(frame(R, 0.05).includes(goal(r))).toBe(true);
    });
  }

  it('the first round of level 1 shows a drag cue until the handle is touched', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    expect(frame(R).includes('drag ⇔')).toBe(true);
    h.pointer('pointerdown', 180, 324);
    h.pointer('pointerup', 180, 324);
    expect(frame(R).includes('drag ⇔')).toBe(false);
  });

  it('round 3 shows a banner and each round has its own clock', () => {
    const R = canvasRecorder();
    h.start(2, 5);
    expect(frame(R).includes('LAST CHECK BEFORE PATIENTS')).toBe(false);
    playTo(2, 2);
    expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
    expect(frame(R).includes('LAST CHECK BEFORE PATIENTS')).toBe(true);
  });

  it('a miss says in plain words what to change', () => {
    const want = [/Turn the kicker (up|down)\.$/, /Use (more|less) current\.$/, /(Use a (stronger|weaker) field, with an RF to match|Match the RF to one lap)\.$/, /(Move the port (in|out)|hit a dee wall)\.$/, /Use (more|less) field\.$/];
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], false);
      h.click(FIRE);
      h.advance(2.8);
      expect(h.feedback(), `level ${level}`).toMatch(want[level - 1]);
    }
  });

  it('the readouts and the goal are drawn only while the player is setting up, not during the run', () => {
    const R = canvasRecorder();
    h.start(5, 5);
    expect(frame(R)).toContain('1 G');
    h.click(FIRE);
    h.advance(0.3);
    const during = frame(R);
    expect(during.includes('1 G')).toBe(false);
    expect(during.some((s) => /^Sharp spot/.test(s))).toBe(false);
  });
});

describe('Beam Hall never leaks the answer', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the monitor is live in round 1, shows for 1.5 s after a check in round 2, and never in round 3`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      expect(lcdDrawn(level, frame(R))).toBe(true);
      expect(canvas().dataset.lcd).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(lcdDrawn(level, frame(R, 0.3))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
      for (const x of SETS[level]) {
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
      expect(lcdDrawn(level, frame(R, 0.5))).toBe(false);
      set(g[1], true);
      h.click(FIRE);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (const x of SETS[level]) {
        apply(x);
        expect(lcdDrawn(level, frame(R))).toBe(false);
      }
      set(g[2], true);
      expect(lcdDrawn(level, frame(R))).toBe(false);
      h.click(TEST);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(lcdDrawn(level, frame(R, 0.5))).toBe(false);
      expect(canvas().dataset.lcd).toBe('0');
    });
  }

  it('no drawn text contains the round’s answer before the player sets it (all three rounds, several settings)', () => {
    for (const level of LEVELS) {
      const R = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      for (let k = 0; k < 3; k++) {
        const t = token(g[k]);
        for (const x of SETS[level]) {
          if (ownToken(level, x) === t) continue; // the readout shows the player's own setting
          apply(x);
          expect(frame(R).some((s) => has(s, t)), `level ${level} round ${k + 1} ${t}`).toBe(false);
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

  it('no beam is drawn before Power on: the scene before fire has no bunch, spiral or helix text', () => {
    for (const level of LEVELS) {
      const R = canvasRecorder();
      h.start(level, 5);
      apply(SETS[level][1]);
      const before = frame(R);
      expect(before.some((s) => /^(ZAP!|CLANG!|FZZT|SNAP!|SHARP!|BLUR|whee!)$/.test(s))).toBe(false);
    }
  });
});
