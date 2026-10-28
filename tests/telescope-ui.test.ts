// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/telescope-lab/index';
import { buildGame, type Game } from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/telescope-lab/logic';
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
  const m = manifest('tl');
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
const r1 = (x: number) => Math.round(x * 10) / 10;

const FIRE = ['Fire the scope with these settings', 'Expose the plate at this focal length', 'Fire the scope with these settings'];
const TEST = ['Test shot: measure the view with these settings', 'Test shot: measure the image size at this focal length', 'Test shot: measure the view with these settings'];
const setRight = (g: Game, k: number) => {
  if (g.kind === 'plate') setSlider(Math.round(g.rounds[k].foSol / 10) * 10);
  else {
    setSlider(g.rounds[k].feSol, 0);
    setSlider(g.kind === 'near' ? r1(g.rounds[k].LSol) : g.rounds[k].LSol, 1);
  }
};
const setWrong = (g: Game, k: number) => {
  if (g.kind === 'plate') setSlider(Math.max(50, Math.round(g.rounds[k].foSol / 20) * 10));
  else if (g.kind === 'zoom') {
    setSlider(g.rounds[k].feSol * 2, 0);
    setSlider(g.rounds[k].LSol, 1);
  } else {
    setSlider(g.rounds[k].feSol, 0);
    setSlider(g.rounds[k].fo + g.rounds[k].feSol, 1);
  }
};
const solveRound = (level: number, g: Game, k: number) => {
  setRight(g, k);
  click(FIRE[level - 1]);
  advance(2.8);
};

describe('the arcade shell around every level', () => {
  it('opens with a hero banner, three hearts, round 1 of 3 and a score of 0', () => {
    for (const level of [1, 2, 3]) {
      start(level, 4);
      expect($('.hero .hero-name')?.textContent?.length).toBeGreaterThan(3);
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
        solveRound(level, g, k);
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
      click(FIRE[level - 1]);
      advance(0.1);
      expect(phase()).toBe('resolve');
      advance(2.8);
      expect(hearts()).toBe(2);
      expect(hud()).toMatch(/Round 1 of 3/);
      expect(feedback().length).toBeGreaterThan(15);
      solveRound(level, g, 0);
      expect(phase()).toBe('between');
    }
  });
  it('three misses end the level with a retry', () => {
    const g = start(1, 8);
    for (let k = 0; k < 3; k++) {
      setWrong(g, 0);
      click(FIRE[0]);
      advance(2.8);
    }
    expect(phase()).toBe('over');
    click('Try this level again');
    expect(restarts).toBe(1);
  });
});

describe('level 1: the scout’s scope', () => {
  it('the three rounds are Exercises 9.13, 9.27(a) and 9.14(a), and the hint says which aids are on', () => {
    const g = start(1, 5);
    expect($('.note')?.textContent).toMatch(/Objective f = 144 cm\. Make the target fill the ring: 24×/);
    expect($('.note')?.textContent).toMatch(/scope view is live/);
    solveRound(1, g, 0);
    advance(1);
    expect($('.note')?.textContent).toMatch(/f = 140 cm\. Make the target fill the ring: 28×/);
    expect($('.note')?.textContent).toMatch(/dim/);
    solveRound(1, g, 1);
    advance(1);
    expect($('.note')?.textContent).toMatch(/1500 cm\. Make the target fill the ring: 1500×/);
    expect($('.note')?.textContent).toMatch(/work it out/);
  });
  it('a test shot costs a charge and reads the view; the near-point tube length is not the relaxed answer', () => {
    const g = start(1, 5) as Extract<Game, { kind: 'zoom' }>;
    click(TEST[0]);
    expect(feedback()).toMatch(/Final image|inside the objective|outside the eyepiece/);
    click(TEST[0]);
    expect(feedback()).toMatch(/No charges left/);
    expect(feedback()).toMatch(/does not cost/);
    setSlider(g.rounds[0].feSol, 0);
    setSlider(g.rounds[0].LSol - 1, 1);
    click(FIRE[0]);
    advance(2.8);
    expect(hearts()).toBe(2);
  });
  it('dragging the eyepiece along the zoom inset sets the tube length, and the focal-length knob sets the eyepiece', () => {
    start(1, 5);
    pointer('pointerdown', 150, 235);
    pointer('pointermove', 150 + 4.6 * 14, 235);
    expect(sliders()[1].value).toBe('149');
    pointer('pointerup', 0, 0);
    const knobY = (v: number) => 300 - ((v - 0.5) / 29.5) * 130;
    pointer('pointerdown', 612, knobY(10));
    pointer('pointermove', 612, knobY(6));
    expect(sliders()[0].value).toBe('6');
  });
});

describe('level 2: the photo plate', () => {
  it('a focal length twice too long spills over the plate, half as long leaves it empty, and neither names the right value', () => {
    const g = start(2, 5) as Extract<Game, { kind: 'plate' }>;
    const fo = Math.round(g.rounds[0].foSol / 10) * 10;
    setSlider(Math.min(2000, fo * 2));
    click(FIRE[1]);
    advance(2.8);
    expect(feedback()).toMatch(/spills over/);
    setSlider(Math.max(50, Math.round(fo / 20) * 10));
    click(FIRE[1]);
    advance(2.8);
    expect(feedback()).toMatch(/partly empty/);
    expect(feedback()).not.toContain(`${fo} cm`);
    expect(hearts()).toBe(1);
  });
  it('dragging the plate along the axis sets the focal length in steps of 10 cm', () => {
    start(2, 5);
    pointer('pointerdown', 70 + 800 * 0.2, 180);
    pointer('pointermove', 70 + 1004 * 0.2, 180);
    expect(sliders()[0].value).toBe('1000');
  });
});

describe('level 3: Orion’s near-point view', () => {
  it('the first round is Exercise 9.27(b); the relaxed tube length is not the near-point one', () => {
    const g = start(3, 5) as Extract<Game, { kind: 'near' }>;
    expect($('.note')?.textContent).toMatch(/Objective f = 140 cm\. Make the target fill the ring: 33\.6×, final image at the near point/);
    setSlider(g.rounds[0].feSol, 0);
    setSlider(g.rounds[0].fo + g.rounds[0].feSol, 1);
    click(FIRE[2]);
    advance(2.8);
    expect(feedback()).toMatch(/× and the final image is at infinity/);
    expect(hearts()).toBe(2);
  });
});

describe('robustness', () => {
  it('every level animates through a hit and a miss with no console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3]) {
      const g = start(level, 9);
      advance(0.8);
      setWrong(g, 0);
      click(FIRE[level - 1]);
      advance(3);
      solveRound(level, g, 0);
      advance(1);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
