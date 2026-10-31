// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/prism-lab/index';
import { buildGame, path, sideOf, startAngle, type Game } from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/prism-lab/logic';
import { canvasRecorder, texts, type CanvasRec } from './helpers/canvas-rec';
import { trace3 } from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/prism-lab/geometry';
import { createRng } from '../src/core/random';
import type { GameContext } from '../src/core/types';
import { manifest } from './fixtures';

let step: (ms: number) => void;
let clock = 0;
let stop: (() => void) | void;
let wins: number[];
let restarts: number;
let root: HTMLElement;

beforeEach(() => {
  clock = 0;
  wins = [];
  restarts = 0;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: () => () => undefined, set: () => true }) as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 640, height: 340, right: 640, bottom: 340, x: 0, y: 0, toJSON: () => ({}) });
  const queue = new Map<number, (t: number) => void>();
  let next = 1;
  vi.stubGlobal('performance', { now: () => 0 });
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => (queue.set(next, cb), next++));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => queue.delete(id));
  step = (ms) => {
    clock += ms;
    const batch = [...queue.entries()];
    queue.clear();
    batch.forEach(([, cb]) => cb(clock));
  };
});
afterEach(() => {
  stop?.();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const advance = (seconds: number) => {
  for (let i = 0; i < Math.round(seconds / 0.05); i++) step(50);
};

function start(level: number, seed: number) {
  const m = manifest('pl');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 3, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => restarts++ } as unknown as GameContext;
  stop?.();
  stop = game.mount(ctx);
  advance(0.1);
  return buildGame(level, createRng(seed));
}
const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;
const click = (label: string) => {
  const b = root.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement | null;
  if (!b) throw new Error(`no button "${label}"`);
  b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
const sliders = () => [...root.querySelectorAll('input[type="range"]')] as HTMLInputElement[];
const setSlider = (v: number, which = 0) => {
  const el = sliders()[which];
  el.value = String(v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const feedback = () => $('.feedback')?.textContent ?? '';
const phase = () => $('canvas')!.dataset.phase;
const hud = () => $('.hud')?.textContent ?? '';
const hearts = () => ($('.hud-hearts')?.textContent ?? '').split('♥').length - 1;
const pointer = (type: string, x: number, y: number) => $('canvas')!.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));

const FIRE = 'Fire the beam at this angle';
const TEST = 'Test beam: measure the bend at this angle';
const setRight = (g: Game, k: number) => {
  if (g.kind === 'sweet') {
    setSlider(g.rounds[k].iSol, 0);
    setSlider(Math.round(g.rounds[k].nSol * 100) / 100, 1);
  } else setSlider(Math.round(g.rounds[k].iSol), 0);
};
const setWrong = (g: Game, k: number) => {
  if (g.kind === 'sweet') {
    setSlider(g.rounds[k].iSol + 10, 0);
    setSlider(Math.round(g.rounds[k].nSol * 100) / 100, 1);
  } else setSlider(Math.round(g.rounds[k].iSol) + 6, 0);
};
const solveRound = (g: Game, k: number) => {
  setRight(g, k);
  click(FIRE);
  advance(2.8);
};

describe('the arcade shell around every level', () => {
  it('opens with a hero banner, three hearts, round 1 of 3 and a score of 0', () => {
    for (const level of [1, 2, 3]) {
      start(level, 4);
      expect($('.hero .hero-name')?.textContent?.length).toBeGreaterThan(4);
      expect($('.hero .objective')?.textContent).toMatch(/^Objective:/);
      expect(hearts()).toBe(3);
      expect(hud()).toMatch(/Round 1 of 3/);
      expect(hud()).toMatch(/Score 0/);
      expect(phase()).toBe('play');
    }
  });
  it('plays a whole level: three rounds, a growing score, a BOSS round, then 3 stars', () => {
    for (const level of [1, 2, 3]) {
      const g = start(level, 6);
      let last = 0;
      for (let k = 0; k < 3; k++) {
        if (k === 2) expect(hud()).toMatch(/Round 3 of 3 · BOSS/);
        solveRound(g, k);
        const score = Number(/Score (\d+)/.exec(hud())![1]);
        expect(score).toBeGreaterThan(last);
        last = score;
        if (k < 2) {
          expect(phase()).toBe('between');
          advance(1);
          expect(hud()).toMatch(new RegExp(`Round ${k + 2} of 3`));
        }
      }
      expect(phase()).toBe('won');
      advance(2);
      expect(wins).toEqual([3]);
      wins = [];
    }
  });
  it('a miss costs a heart, says what happened, keeps the round, and the next solve still works', () => {
    for (const level of [1, 2, 3]) {
      const g = start(level, 8);
      setWrong(g, 0);
      click(FIRE);
      advance(0.1);
      expect(phase()).toBe('resolve');
      advance(2.8);
      expect(hearts()).toBe(2);
      expect(hud()).toMatch(/Round 1 of 3/);
      expect(feedback().length).toBeGreaterThan(15);
      solveRound(g, 0);
      expect(phase()).toBe('between');
    }
  });
  it('three misses end the level with a retry', () => {
    const g = start(3, 8);
    for (let k = 0; k < 3; k++) {
      setWrong(g, 0);
      click(FIRE);
      advance(2.8);
    }
    expect(phase()).toBe('over');
    click('Try this level again');
    expect(restarts).toBe(1);
  });
});

describe('level 1: the sweet spot', () => {
  it('has two dials (the angle and the index); the right angle with the wrong index still misses, and says so', () => {
    const g = start(1, 5) as Extract<Game, { kind: 'sweet' }>;
    expect(sliders()).toHaveLength(2);
    setSlider(g.rounds[0].iSol, 0);
    setSlider(Math.round(g.rounds[0].nSol * 100) / 100 + 0.1, 1);
    click(FIRE);
    advance(2.8);
    expect(feedback()).toMatch(/index you read does not match/);
    expect(feedback()).not.toMatch(/sweet spot, so the crystal stays dark/);
    expect(hearts()).toBe(2);
  });
  it('test beams are limited, read out the bend, and the crystal never lights for a wrong angle', () => {
    const g = start(1, 5) as Extract<Game, { kind: 'sweet' }>;
    expect(hud()).toMatch(/Charges ⚡/);
    click(TEST);
    expect(feedback()).toMatch(/At 30° the beam (leaves bent by [\d.]+°|is totally reflected)/);
    expect(hud()).toMatch(/Charges ·/);
    click(TEST);
    expect(feedback()).toMatch(/No charges left/);
    expect(feedback()).toMatch(/does not cost/);
    expect(g.rounds).toHaveLength(3);
  });
  it('the live readout is on in round 1 only', () => {
    const g = start(1, 5);
    expect($('.note')?.textContent).toMatch(/live readout is on/);
    solveRound(g, 0);
    advance(1);
    expect($('.note')?.textContent).toMatch(/for a moment after a test beam/);
  });
});

describe('level 2: the gel chamber', () => {
  it('the angle that is right in air is wrong in the gel, and the miss gives the direction only', () => {
    const g = start(2, 5) as Extract<Game, { kind: 'gel' }>;
    const r = g.rounds[0];
    setSlider(Math.round(r.iSol) + 8);
    click(FIRE);
    advance(2.8);
    expect(feedback()).toMatch(/too steep/);
    expect(feedback()).not.toMatch(/\d/);
    expect(hearts()).toBe(2);
  });
});

describe('level 3: Photon Pong', () => {
  it('too wide escapes through the second face; a narrower shot bounces but is not the objective', () => {
    const g = start(3, 5) as Extract<Game, { kind: 'pong' }>;
    const r = g.rounds[0];
    setSlider(Math.round(r.iSol) + 6);
    click(FIRE);
    advance(2.8);
    expect(feedback()).toMatch(/escapes/);
    setSlider(Math.round(r.iSol) - 8);
    click(FIRE);
    advance(2.8);
    expect(feedback()).toMatch(/bounces back inside/);
    expect(hearts()).toBe(1);
  });
});

const YELLOW = '#ffd23f';
const RED = '#ff5a5a';
const CRYSTAL = '#2b3a7a';
const GREEN = '#5dff9a';
/** One drawn frame after the clock has run `dt` seconds. */
const frameAfter = (rc: CanvasRec, dt: number) => {
  if (dt > 0.05) advance(dt - 0.05);
  rc.clear();
  advance(0.05);
  return rc.rec;
};
/** The beam inside and out of the prism: a glowing yellow (leaves) or red (stays in) line with two segments. */
const beamDrawn = (rec: CanvasRec['rec']) => rec.strokes.some((s) => (s.style === YELLOW || s.style === RED) && s.n >= 2);
/** The crystal: its dark body, or its green body once lit. */
const crystalDrawn = (rec: CanvasRec['rec']) => rec.fills.includes(CRYSTAL) || rec.fills.includes(GREEN);
const hiddenMark = (rec: CanvasRec['rec']) => texts(rec).includes('?');

describe('no leaks: the helper fades and a miss draws no true spot', () => {
  it('the start never wins: firing at once is a miss in every round of every level, and Pong starts wide', () => {
    expect(startAngle('pong')).toBeGreaterThan(startAngle('sweet'));
    for (const level of [1, 2, 3]) {
      const g = start(level, 5);
      for (let k = 0; k < 3; k++) {
        const before = hearts();
        click(FIRE);
        advance(2.8);
        expect(hearts()).toBe(before - 1);
        if (hearts() === 0) break;
        solveRound(g, k);
        advance(1);
      }
    }
  });
  it('round 1 shows the beam (and the crystal); round 2 only for about 1.5 s after a test beam; round 3 never', () => {
    for (const level of [1, 2, 3]) {
      const rc = canvasRecorder();
      const g = start(level, 5);
      const crystal = level !== 3;
      let rec = frameAfter(rc, 0.1);
      expect(beamDrawn(rec)).toBe(true);
      expect(crystalDrawn(rec)).toBe(crystal);
      solveRound(g, 0);
      advance(1);
      expect(hud()).toMatch(/Round 2 of 3/);
      rec = frameAfter(rc, 0.1);
      expect(beamDrawn(rec)).toBe(false);
      expect(crystalDrawn(rec)).toBe(false);
      if (crystal) expect(hiddenMark(rec)).toBe(true);
      click(TEST);
      rec = frameAfter(rc, 0.3);
      expect(beamDrawn(rec)).toBe(true);
      expect(crystalDrawn(rec)).toBe(crystal);
      rec = frameAfter(rc, 1.6);
      expect(beamDrawn(rec)).toBe(false);
      expect(crystalDrawn(rec)).toBe(false);
      solveRound(g, 1);
      advance(1);
      expect(hud()).toMatch(/Round 3 of 3/);
      click(TEST);
      rec = frameAfter(rc, 0.3);
      expect(beamDrawn(rec)).toBe(false);
      expect(crystalDrawn(rec)).toBe(false);
    }
  });
  it('a miss in round 2 or 3 draws no crystal, not even where the beam left; a win draws it lit', () => {
    for (const level of [1, 2]) {
      for (const round of [1, 2]) {
        const rc = canvasRecorder();
        const g = start(level, 5);
        for (let k = 0; k < round; k++) {
          solveRound(g, k);
          advance(1);
        }
        setWrong(g, round);
        click(FIRE);
        advance(2.0);
        const miss = frameAfter(rc, 0.05);
        expect(crystalDrawn(miss)).toBe(false);
        expect(hiddenMark(miss)).toBe(true);
        advance(1);
        setRight(g, round);
        click(FIRE);
        advance(2.0);
        expect(frameAfter(rc, 0.05).fills.includes(GREEN)).toBe(true);
        advance(1);
      }
    }
  });
  it('two wrong settings on the same side end on the same words and the same marks', () => {
    for (const level of [1, 2, 3]) {
      const rc = canvasRecorder();
      const g = start(level, 5);
      solveRound(g, 0);
      advance(1);
      const r = g.rounds[1];
      const ends: string[][] = [];
      const says: string[] = [];
      for (const off of [6, 9]) {
        setSlider(Math.round(r.iSol) + off, 0);
        if (g.kind === 'sweet') setSlider(Math.round((r as { nSol: number }).nSol * 100) / 100, 1);
        click(FIRE);
        advance(2.0);
        ends.push(texts(frameAfter(rc, 0.05)));
        says.push(feedback());
        advance(1);
      }
      expect(says[0]).toBe(says[1]);
      expect(ends[0]).toEqual(ends[1]);
      if (g.kind !== 'pong') expect(sideOf((r as { iSol: number }).iSol, Math.round(r.iSol) + 6)).toBe('steep');
    }
  });
});

describe('direct manipulation', () => {
  it('dragging the laser along its beam turns it: the angle snaps to whole degrees', () => {
    start(1, 5);
    const tr = trace3(60, 1.5, 30);
    const src: [number, number] = [tr.E1[0] - tr.u[0] * 190, tr.E1[1] - tr.u[1] * 190];
    pointer('pointerdown', src[0], src[1]);
    const t2 = trace3(60, 1.5, 47.4);
    pointer('pointermove', t2.E1[0] - t2.u[0] * 190, t2.E1[1] - t2.u[1] * 190);
    expect(sliders()[0].value).toBe('47');
    expect(path(60, 1.5, 47).D).not.toBeNull();
  });
});

describe('robustness', () => {
  it('every level animates through a hit and a miss with no console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3]) {
      const g = start(level, 9);
      advance(0.8);
      setWrong(g, 0);
      click(FIRE);
      advance(3);
      solveRound(g, 0);
      advance(1);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
