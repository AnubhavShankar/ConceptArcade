// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/flow-control/index';
import { SPEED, buildRounds, type Round } from '../src/games/mathematics/class-12/ch07-integrals/flow-control/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';
import { canvasRecorder, texts, type CanvasRec } from './helpers/canvas-rec';

const h = arcadeHarness(game, 'flow-control', 4);
const build = (level: number, seed: number) => buildRounds(level, createRng(seed));
const wrong = (r: Round) => (r.ans === r.max ? r.ans - 1 : r.ans + 1);

/** The moment the next commit will shut the gate. */
let want = 0;
/** Open the gate, wait until the clock reads `at`, shut it. */
function run(at: number) {
  h.click('Open the gate');
  h.advance(at / SPEED);
  h.click('Shut the gate');
}

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4],
  build,
  setRight: (g, k) => (want = g[k].ans),
  setWrong: (g, k) => (want = wrong(g[k])),
  commit: () => run(want),
});

describe('Flow Control', () => {
  it('shutting the gate before it is open is free and changes nothing', () => {
    h.start(1, 5);
    h.click('Shut the gate');
    expect(h.feedback()).toMatch(/not open yet/);
    expect(h.hearts()).toBe(3);
    expect(h.phase()).toBe('play');
  });
  it('the volume needed is in the note for every level', () => {
    for (const level of [1, 2, 3, 4]) {
      h.start(level, 5);
      expect(h.note()).toContain(String(build(level, 5)[0].V));
    }
  });
  it('a miss says which way the tank is off and what to do, never the volume or the moment; a win shows the antiderivative', () => {
    h.start(1, 5);
    const g = build(1, 5);
    run(wrong(g[0]));
    h.advance(3);
    expect(h.feedback()).not.toMatch(/holds/);
    expect(h.feedback()).toMatch(/short of|over/);
    expect(h.feedback()).not.toMatch(/sooner|longer/);
    run(g[0].ans);
    h.advance(3);
    expect(h.feedback()).toMatch(/F\(t\) =/);
  });
  it('slow motion costs a charge and lets the player shut the gate at half the speed', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.click('Slow motion: run this round at half speed');
    expect(h.feedback()).toMatch(/half speed/);
    h.click('Slow motion: run this round at half speed');
    expect(h.feedback()).toMatch(/already on/);
    h.click('Open the gate');
    h.advance(g[0].ans / (SPEED / 2));
    h.click('Shut the gate');
    h.advance(3);
    expect(h.score()).toBeGreaterThan(0);
  });
  it('the gate shuts by itself at the end of the range, and that is a miss', () => {
    h.start(1, 5);
    h.click('Open the gate');
    h.advance(12);
    expect(h.hearts()).toBe(2);
    expect(h.feedback()).toMatch(/over/);
  });
  it('level 4 says the odd terms cancel', () => {
    h.start(4, 5);
    const g = build(4, 5);
    run(g[0].ans);
    h.advance(3);
    expect(h.feedback()).toMatch(/odd terms cancel/);
  });
  it('the goal is on the canvas at round start', () => {
    for (const level of [1, 4]) {
      const R = canvasRecorder();
      h.start(level, 5);
      h.advance(0.1);
      expect(texts(R.rec).some((s) => new RegExp(`holds exactly ${build(level, 5)[0].V}$`).test(s))).toBe(true);
    }
  });
});

const SLOW = 'Slow motion: run this round at half speed';
const frame = (R: CanvasRec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  R.clear();
  h.advance(0.05);
  return R.rec;
};
const canvas = () => h.$('canvas')!;
const gauge = () => canvas().dataset.gauge;
const tank = () => Number(canvas().dataset.tank);
const winRound = (g: Round[], k: number) => {
  run(g[k].ans);
  h.advance(2.8);
  h.advance(1);
};

describe('Flow Control never leaks the answer', () => {
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level}: the gauge is live in round 1, lights for 1.5 s after the charge in round 2, and never in round 3`, () => {
      const R = canvasRecorder();
      h.start(level, 5);
      const g = build(level, 5);
      frame(R);
      expect(gauge()).toBe('1');
      winRound(g, 0);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      frame(R, 0.3);
      expect(gauge()).toBe('0');
      expect(texts(frame(R)).includes('gauge off')).toBe(true);
      // running the gate in round 2 keeps the tank empty: nothing shows the volume
      h.click('Open the gate');
      for (let i = 0; i < 6; i++) {
        frame(R, 0.2);
        expect(gauge()).toBe('0');
        expect(tank()).toBe(0);
      }
      h.click(SLOW);
      frame(R, 0.3);
      expect(gauge()).toBe('1');
      expect(tank()).toBeGreaterThan(0);
      frame(R, 1.0);
      expect(gauge()).toBe('1');
      frame(R, 0.5);
      expect(gauge()).toBe('0');
      expect(tank()).toBe(0);
      h.click('Shut the gate');
      h.advance(3);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      // finish round 2 (slow motion is still on, so the clock runs at half speed) and play round 3: no gauge at all, a charge is refused
      h.click('Open the gate');
      h.advance(g[1].ans / (SPEED / 2));
      h.click('Shut the gate');
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      h.click('Open the gate');
      for (let i = 0; i < 6; i++) {
        frame(R, 0.2);
        expect(gauge()).toBe('0');
        expect(tank()).toBe(0);
      }
      h.click(SLOW);
      expect(h.feedback()).toMatch(/No charges left/);
      frame(R, 0.3);
      expect(gauge()).toBe('0');
    });

    it(`level ${level}: a win fills the tank to the line and shows FULL`, () => {
      const R = canvasRecorder();
      h.start(level, 11);
      const g = build(level, 11);
      winRound(g, 0);
      run(g[1].ans);
      let full = false;
      for (let i = 0; i < 8; i++) full = texts(frame(R, 0.2)).includes('FULL ✓') || full;
      expect(full).toBe(true);
    });

    it(`level ${level}: two wrong moments on the same side give the same text, the same tank and the same −1 float; the tank shows no volume`, () => {
      const g = build(level, 11);
      for (const k of [0, 2]) {
        const logs: { side: string; text: string; tanks: number[]; shown: string[]; xs: number[] }[] = [];
        for (let at = 1; at <= g[k].max; at++) {
          if (at === g[k].ans) continue;
          const R = canvasRecorder();
          h.start(level, 11);
          for (let j = 0; j < k; j++) winRound(g, j);
          run(at);
          const tanks: number[] = [];
          const shown: string[] = [];
          const xs: number[] = [];
          for (const dt of [0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 0.3, 0.4]) {
            R.clear();
            h.advance(dt);
            tanks.push(tank());
            R.rec.at.filter((a) => /SHORT|OVER|^holds|\d\.\d/.test(a.s) && !/^t =|^h =/.test(a.s)).forEach((a) => shown.push(a.s));
            R.rec.at.filter((a) => a.s === '−1 ♥').forEach((a) => xs.push(a.x));
          }
          h.advance(1);
          const text = h.feedback().replace(/(from −?[\d.]+ to [\d.]+|at t = [\d.]+)/, 'WHEN');
          logs.push({ side: /short of/.test(text) ? 'short' : 'over', text, tanks, shown, xs });
        }
        for (const side of ['short', 'over']) {
          const two = logs.filter((l) => l.side === side).slice(0, 2);
          if (two.length < 2) continue;
          expect(two[0].text).toBe(two[1].text);
          expect(two[0].text).not.toMatch(/\d|holds/);
          expect(two[0].xs).toEqual(two[1].xs);
          expect(two[0].shown.some((s) => /^holds|\d\.\d/.test(s))).toBe(false);
          // the animation ends in the fixed fill: 0.55 of the need line when short, past the brim when over (the same for every wrong setting)
          for (const l of two) expect(l.tanks[l.tanks.length - 1]).toBeCloseTo(side === 'short' ? 0.55 * 0.8 : 1.08, 3);
          // with no gauge (round 3) the whole animation is the same, frame by frame
          if (k === 2) expect(two[0].tanks).toEqual(two[1].tanks);
        }
        expect(logs.some((l) => l.side === 'short') || logs.some((l) => l.side === 'over')).toBe(true);
      }
    });

    it(`level ${level}: the start (shutting at once) never wins`, () => {
      for (const seed of [1, 2, 3, 4]) {
        h.start(level, seed);
        h.click('Open the gate');
        h.advance(0.1);
        h.click('Shut the gate');
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
      }
    });
  }
});
