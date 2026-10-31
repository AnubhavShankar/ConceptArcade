// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/quantum-of-charge/index';
import { buildRounds, isDust, type Round } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/quantum-of-charge/logic';
import { DROP_Y, STRIP } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/quantum-of-charge/art';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'quantum-of-charge', 3);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3, createRng(seed));
const FIRE = ['Switch on the plates and release the drop', 'Fit the ladder to the readings', 'Publish the run'];
const CHECK = ['Force check: compare the push with the weight', 'Fit check: see the counts at this spacing', 'Ladder check: see the whole numbers of e for a moment'];
const ZAP = 'X-ray zap: add one electron to the drop';
const FLASH = 'UV flash: knock one electron off the drop';

function set(r: Round, right: boolean) {
  if (r.kind === 'hold') h.setSlider(right ? r.n : r.n + 1);
  if (r.kind === 'cal') h.setSlider(right ? r.u : Number((r.u + 0.1).toFixed(1)));
  if (r.kind === 'dust') r.ks.forEach((k, i) => {
    if (right && isDust(k)) h.click(`Flag drop ${'ABCDE'[i]}`);
  });
}
shellTests<Round[]>(h, {
  levels: [1, 2, 3],
  build,
  setRight: (g, k) => set(g[k], true),
  setWrong: (g, k) => set(g[k], false),
  commit: (level) => h.click(FIRE[level - 1]),
});

const canvas = () => h.$('canvas')!;
type R = ReturnType<typeof canvasRecorder>;
/** Advance so that the clock sits `dt` seconds after the last frame, then record exactly one frame. */
const frame = (R: R, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
const strings = (R: R, dt = 0.05) => frame(R, dt).at.map((a) => a.s);
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    set(g[k], true);
    h.click(FIRE[level - 1]);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const GAUGE = [/^up .* N · down .* N$/, /^counts /];
const gaugeOn = (level: number, R: R, dt = 0.05) => {
  const rec = frame(R, dt);
  if (level < 3) return rec.at.some((a) => GAUGE[level - 1].test(a.s));
  return rec.at.some((a) => /^[1-9]$/.test(a.s) && a.y === STRIP.y + 14);
};

describe('The Quark Hunt', () => {
  it('level 1: three clicks on the X-ray zap make 3 electrons; the UV flash at 0 keeps 0', () => {
    h.start(1, 5);
    h.click(ZAP);
    h.click(ZAP);
    h.click(ZAP);
    expect(h.sliders()[0].value).toBe('3');
    h.click(FLASH);
    expect(h.sliders()[0].value).toBe('2');
    h.start(1, 5);
    h.click(FLASH);
    expect(h.sliders()[0].value).toBe('0');
    expect([h.sliders()[0].min, h.sliders()[0].max].join()).toBe('0,15');
  });
  it('level 1: one electron too many says the drop stuck to the top plate; too few says it sank', () => {
    h.start(1, 5);
    const g = build(1, 5);
    set(g[0], false);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toContain('stuck to the top plate');
    h.setSlider(0);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toContain('Zap some electrons on');
    h.setSlider(g[0].kind === 'hold' ? g[0].n - 1 : 1);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.hearts()).toBe(0);
    expect(h.feedback()).toContain('sank onto the bottom plate');
  });
  it('level 1: the drop falls or rises at the same fixed speed whatever the error', () => {
    const readY = (n: number) => {
      h.start(1, 5);
      h.setSlider(n);
      h.click(FIRE[0]);
      h.advance(0.5);
      return Number(canvas().dataset.dropy);
    };
    const g = build(1, 5)[0];
    if (g.kind !== 'hold') throw new Error('kind');
    const lo1 = readY(0);
    const lo2 = readY(g.n - 1);
    expect(lo1).toBeCloseTo(lo2, 3);
    expect(lo1).toBeGreaterThan(DROP_Y);
    const hi1 = readY(g.n + 1);
    const hi2 = readY(15);
    expect(hi1).toBeCloseTo(hi2, 3);
    expect(hi1).toBeLessThan(DROP_Y);
  });
  it('level 2: the slider runs 2 to 6 in steps of 0.1 and starts at 6', () => {
    h.start(2, 5);
    const [s] = h.sliders();
    expect([Number(s.min), Number(s.max), Number(s.step), Number(s.value)]).toEqual([2, 6, 0.1, 6]);
    expect(h.sliders().length).toBe(1);
  });
  it('level 2: a wrong spacing says a drop hung between two rungs, and does not name the unit', () => {
    h.start(2, 5);
    const g = build(2, 5)[0];
    if (g.kind !== 'cal') throw new Error('kind');
    set(g, false);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/hung between two rungs/);
    expect(h.feedback()).not.toContain(`${g.u.toFixed(1)} du`);
  });
  it('level 3: flagging a good drop and all the dust gives Too few drops; flagging nothing gives Retracted', () => {
    h.start(3, 5);
    const g = build(3, 5)[0];
    if (g.kind !== 'dust') throw new Error('kind');
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toContain('Retracted');
    g.ks.forEach((k, i) => isDust(k) && h.click(`Flag drop ${'ABCDE'[i]}`));
    const good = g.ks.findIndex((k) => !isDust(k));
    h.click(`Flag drop ${'ABCDE'[good]}`);
    h.click(FIRE[2]);
    h.advance(2.8);
    expect(h.feedback()).toContain('Too few drops');
  });
  it('level 3: the flag buttons follow aria-pressed, and a tap on a drop on the canvas flags it', () => {
    h.start(3, 5);
    const btn = () => h.$('[aria-label="Flag drop B"]')!;
    expect(btn().getAttribute('aria-pressed')).toBe('false');
    h.click('Flag drop B');
    expect(btn().getAttribute('aria-pressed')).toBe('true');
    h.pointer('pointerdown', 230, 150);
    expect(btn().getAttribute('aria-pressed')).toBe('false');
    h.pointer('pointerdown', 530, 150);
    expect(h.$('[aria-label="Flag drop E"]')!.getAttribute('aria-pressed')).toBe('true');
  });
  for (const level of [1, 2, 3]) {
    it(`level ${level}: a check costs a charge, and round 3 says No charges left`, () => {
      h.start(level, 5);
      expect(h.hud()).toMatch(/Charges ⚡/);
      h.click(CHECK[level - 1]);
      expect(h.hud()).toMatch(/Charges ·/);
      expect(h.feedback()).toMatch(/check|Check|electron|counts|strip|Ladder|Fit|Force/);
      h.click(CHECK[level - 1]);
      expect(h.feedback()).toMatch(/No charges left/);
      playTo(level, 2);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      h.click(CHECK[level - 1]);
      expect(h.feedback()).toMatch(/No charges left/);
    });
  }
});

describe('The Quark Hunt UX', () => {
  it('the goal line shows at the start and fades; the first-touch cues show until the first tap', () => {
    const cases: [number, RegExp, RegExp, () => void][] = [
      [1, /^Hover the drop: \d+ V across 5 mm$/, /^tap \+1$/, () => h.click(ZAP)],
      [2, /^Calibrate: how many du is one electron\?$/, /^drag$/, () => h.pointer('pointerdown', 360, 258)],
      [3, /^Flag every reading that is not a whole number of e$/, /^tap a drop$/, () => h.click('Flag drop A')],
    ];
    for (const [level, goal, cue, act] of cases) {
      const R = canvasRecorder();
      h.start(level, 5);
      const s = strings(R);
      expect(s.filter((x) => goal.test(x)).length, `goal ${level}`).toBe(1);
      expect(s.some((x) => cue.test(x)), `cue ${level}`).toBe(true);
      act();
      expect(strings(R, 0.3).some((x) => cue.test(x)), `cue gone ${level}`).toBe(false);
      expect(strings(R, 4).some((x) => goal.test(x)), `goal gone ${level}`).toBe(false);
    }
  });
  it('level 1 shows the player’s own count, level 2 the player’s own spacing', () => {
    const R = canvasRecorder();
    h.start(1, 5);
    h.click(ZAP);
    h.click(ZAP);
    expect(strings(R)).toContain('2 electrons');
    h.click(FLASH);
    expect(strings(R)).toContain('1 electron');
    h.start(2, 5);
    h.setSlider(4.3);
    expect(strings(R)).toContain('4.3 du');
  });
  it('every level has a stencil tag, and the last run is marked as the boss', () => {
    for (const level of [1, 2, 3]) {
      const R = canvasRecorder();
      h.start(level, 5);
      expect(strings(R)).toContain('RUN 1');
      playTo(level, 2);
      expect(strings(R, 0.3)).toContain('FINAL RUN · BOSS');
    }
  });
  it('every handle ring and the tap targets are big enough', () => {
    const R = canvasRecorder();
    h.start(2, 5);
    const rec = frame(R);
    expect(rec.arcs.some((a) => Math.abs(a.x - 360) < 1 && Math.abs(a.y - 258) < 1 && a.r >= 18)).toBe(true);
  });
  it('level 2: the three readings are labelled and the counts show only after a win', () => {
    const R = canvasRecorder();
    h.start(2, 5);
    const g = build(2, 5)[0];
    if (g.kind !== 'cal') throw new Error('kind');
    const before = strings(R);
    for (const q of g.reads) expect(before).toContain(`${q} du`);
    set(g, true);
    h.click(FIRE[1]);
    h.advance(1.5);
    const after = strings(R);
    for (const n of g.ns) expect(after).toContain(`${n} e`);
    expect(after).toContain('✓');
  });
  it('level 3: on a miss no ✓ or ? is drawn next to a drop and the strip is not drawn, even in round 1', () => {
    const R = canvasRecorder();
    h.start(3, 5);
    expect(gaugeOn(3, R)).toBe(true);
    h.click(FIRE[2]);
    for (let i = 0; i < 40; i++) {
      const rec = frame(R, 0.05);
      const s = rec.at.map((a) => a.s);
      expect(s.includes('✓') || s.includes('?'), `t = ${(i * 0.05).toFixed(2)}`).toBe(false);
      expect(rec.at.some((a) => /^[1-9]$/.test(a.s) && a.y === STRIP.y + 14)).toBe(false);
    }
    expect(h.feedback()).toContain('Retracted');
  });
  it('level 3: the stamp says RETRACTED, TOO FEW DROPS or PUBLISHED: NO FREE QUARKS', () => {
    const R = canvasRecorder();
    h.start(3, 5);
    const g = build(3, 5)[0];
    if (g.kind !== 'dust') throw new Error('kind');
    h.click(FIRE[2]);
    h.advance(1.5);
    expect(strings(R)).toContain('RETRACTED');
    h.advance(1.5);
    h.click('Flag drop A');
    h.click('Flag drop B');
    h.click('Flag drop C');
    h.click('Flag drop D');
    h.click('Flag drop E');
    h.click(FIRE[2]);
    h.advance(1.5);
    expect(strings(R)).toContain('TOO FEW DROPS');
    h.advance(1.5);
    for (const l of 'ABCDE') h.click(`Flag drop ${l}`);
    set(g, true);
    h.click(FIRE[2]);
    h.advance(1.8);
    const s = strings(R);
    expect(s).toContain('PUBLISHED: NO FREE QUARKS');
    expect(s.some((x) => /^[1-9]$/.test(x))).toBe(true);
  });
  it('a miss in level 1 and level 2 says in plain words what to change, never the answer', () => {
    h.start(1, 5);
    set(build(1, 5)[0], false);
    h.click(FIRE[0]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/It needs fewer electrons\.$/);
    h.start(2, 5);
    set(build(2, 5)[0], false);
    h.click(FIRE[1]);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/The right step fits all three readings exactly\.$/);
  });
});

describe('The Quark Hunt never leaks the answer', () => {
  for (const level of [1, 2, 3]) {
    it(`level ${level}: the helper is live in round 1, shows for 1.5 s after a check in round 2, and never in round 3`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      expect(gaugeOn(level, R)).toBe(true);
      expect(canvas().dataset.live).toBe('1');
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      expect(gaugeOn(level, R, 0.3)).toBe(false);
      expect(canvas().dataset.live).toBe('0');
      if (level === 1) for (const n of [0, 3, 7, 12]) {
        h.setSlider(n);
        expect(gaugeOn(level, R)).toBe(false);
      }
      if (level === 2) for (const u of [2, 3.3, 4.8, 5.5]) {
        h.setSlider(u);
        expect(gaugeOn(level, R)).toBe(false);
      }
      h.click(CHECK[level - 1]);
      expect(gaugeOn(level, R, 0.3)).toBe(true);
      expect(canvas().dataset.live).toBe('1');
      expect(gaugeOn(level, R, 1.0)).toBe(true);
      expect(gaugeOn(level, R, 0.5)).toBe(false);
      expect(canvas().dataset.live).toBe('0');
      // round 3: never, even at the winning setting, and not during the attempt
      set(g[1], true);
      h.click(FIRE[level - 1]);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      expect(gaugeOn(level, R, 0.3)).toBe(false);
      set(g[2], true);
      expect(gaugeOn(level, R)).toBe(false);
      h.click(FIRE[level - 1]);
      for (let i = 0; i < 14; i++) {
        const rec = frame(R, 0.1);
        if (level < 3) expect(rec.at.some((a) => GAUGE[level - 1].test(a.s))).toBe(false);
        else if (i < 13) expect(rec.at.some((a) => /^[1-9]$/.test(a.s) && a.y === STRIP.y + 14)).toBe(false);
      }
    });
  }
  it('level 2: before the attempt only the first rung is drawn in rounds 2 and 3 (one cyan bar at the player’s spacing)', () => {
    const R = canvasRecorder();
    h.start(2, 5);
    const g = playTo(2, 1);
    const bars = () => frame(R, 0.1).strokes.filter((s) => s.style === '#4de1ff' && s.n === 1).length;
    h.setSlider(2);
    // the first rung is the only cyan line drawn before the attempt (the reticle and the tube are not in this level)
    const one = bars();
    h.setSlider(3);
    expect(bars()).toBe(one);
    h.click(CHECK[1]);
    expect(bars()).toBeGreaterThan(one);
    void g;
  });
  it('the start setting of every level is not the answer', () => {
    for (const level of [1, 2, 3]) {
      h.start(level, 5);
      const g = build(level, 5);
      h.click(FIRE[level - 1]);
      h.advance(2.8);
      expect(h.hearts(), `level ${level}`).toBe(2);
      void g;
    }
  });
  it('no console error through a whole level', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3]) {
      h.start(level, 11);
      playTo(level, 3, 11);
      h.advance(2);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
