// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/lens-bench/index';
import { buildGame, type Game } from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/lens-bench/logic';
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
  const m = manifest('ll');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 5, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => restarts++ } as unknown as GameContext;
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

const COMMIT = ['Fire the beam through this lens', 'Fire the beam through the pair', 'Fire the projector', 'Place the screen here', 'Pour this liquid and do the trick'];
const setRight = (g: Game, i: number) => {
  if (g.kind === 'grind') setSlider(g.rounds[i].sol);
  else if (g.kind === 'stack') setSlider(g.rounds[i].P2);
  else if (g.kind === 'projector') {
    setSlider(g.rounds[i].u, 0);
    setSlider(g.rounds[i].f, 1);
  } else if (g.kind === 'relay') setSlider(Math.round(g.rounds[i].screen));
  else setSlider(Math.round(g.rounds[i].nL * 100) / 100);
};
const setWrong = (g: Game, i: number) => {
  if (g.kind === 'grind') setSlider(g.rounds[i].sol + 10);
  else if (g.kind === 'stack') setSlider(g.rounds[i].P2 + 3 > 10 ? g.rounds[i].P2 - 3 : g.rounds[i].P2 + 3);
  else if (g.kind === 'projector') {
    setSlider(g.rounds[i].u + 7, 0);
    setSlider(g.rounds[i].f, 1);
  } else if (g.kind === 'relay') setSlider(Math.round(g.rounds[i].screen) + 8);
  else setSlider(Math.round(g.rounds[i].nL * 100) / 100 + 0.1);
};
const commit = (level: number) => click(COMMIT[level - 1]);
const solveRound = (level: number, g: Game, i: number) => {
  setRight(g, i);
  commit(level);
  advance(2.7);
};

describe('the arcade shell around every level', () => {
  it('opens with a hero banner, three hearts, round 1 of 3 and a score of 0', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      start(level, 4);
      expect($('.hero .hero-name')?.textContent?.length).toBeGreaterThan(4);
      expect($('.hero .objective')?.textContent).toMatch(/^Objective:/);
      expect(hearts()).toBe(3);
      expect(hud()).toMatch(/Round 1 of 3/);
      expect(hud()).toMatch(/Score 0/);
      expect(phase()).toBe('play');
    }
  });
  it('there is no inventory: no stock cards, no order board, only dials, handles and beams', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      start(level, 4);
      expect($('.cards')).toBeNull();
      expect(root.textContent).not.toMatch(/\bstock\b|\bshelf\b|workshop|customer/i);
    }
  });
  it('plays a whole level: three rounds, a growing score, a BOSS round at the end, then the win with 3 stars', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const g = start(level, 6);
      let last = 0;
      for (let i = 0; i < 3; i++) {
        if (i === 2) expect(hud()).toMatch(/Round 3 of 3 · BOSS/);
        solveRound(level, g, i);
        const score = Number(/Score (\d+)/.exec(hud())![1]);
        expect(score).toBeGreaterThan(last);
        last = score;
        if (i < 2) {
          expect(phase()).toBe('between');
          advance(1);
          expect(hud()).toMatch(new RegExp(`Round ${i + 2} of 3`));
        }
      }
      expect(phase()).toBe('won');
      advance(2);
      expect(wins).toEqual([3]);
      wins = [];
    }
  });
  it('a first-try round earns a PERFECT bonus: clearing it again after a miss scores less', () => {
    const g = start(1, 6);
    solveRound(1, g, 0);
    const clean = Number(/Score (\d+)/.exec(hud())![1]);
    const g2 = start(1, 6);
    setWrong(g2, 0);
    commit(1);
    advance(2.8);
    solveRound(1, g2, 0);
    const afterMiss = Number(/Score (\d+)/.exec(hud())![1]);
    expect(clean).toBeGreaterThanOrEqual(150);
    expect(afterMiss).toBeLessThan(clean);
  });
  it('a miss costs a heart, says what happened, keeps the round, and the next solve still works', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const g = start(level, 8);
      setWrong(g, 0);
      commit(level);
      advance(0.1);
      expect(phase()).toBe('resolve');
      advance(2.8);
      expect(hearts()).toBe(2);
      expect(hud()).toMatch(/Round 1 of 3/);
      expect(phase()).toBe('play');
      expect(feedback().length).toBeGreaterThan(15);
      solveRound(level, g, 0);
      expect(hearts()).toBe(2);
      expect(phase()).toBe('between');
    }
  });
  it('three misses end the level with a retry', () => {
    const g = start(2, 8);
    for (let i = 0; i < 3; i++) {
      setWrong(g, 0);
      commit(2);
      advance(2.8);
    }
    expect(phase()).toBe('over');
    expect($('.arcade-overlay')?.textContent).toMatch(/Out of hearts/);
    click('Try this level again');
    expect(restarts).toBe(1);
    expect(wins).toEqual([]);
  });
});

describe('level 1: light the lantern', () => {
  it('the live preview is on in round 1 only; a test beam costs a charge and reads out the focus', () => {
    const g = start(1, 5);
    expect($('.note')?.textContent).toMatch(/live preview shows the focus/);
    click('Test beam: measure the lens as dialled now');
    expect(feedback()).toMatch(/Test beam: with R = 30 cm the lens focuses [\d.]+ cm behind it/);
    expect(hud()).toMatch(/Charges ·/);
    click('Test beam: measure the lens as dialled now');
    expect(feedback()).toMatch(/No charges left/);
    expect(feedback()).toMatch(/does not cost/);
    expect(hearts()).toBe(3);
    solveRound(1, g, 0);
    advance(1);
    expect($('.note')?.textContent).toMatch(/preview is off/);
  });
  it('dragging the curvature dial on the canvas sets the radius in whole centimetres', () => {
    start(1, 5);
    const trackX = (r: number) => 60 + ((r - 1) * 540) / 59;
    pointer('pointerdown', trackX(30), 44);
    pointer('pointermove', trackX(17.4), 44);
    expect(sliders()[0].value).toBe('17');
  });
});

describe('level 2: the power pair', () => {
  it('a measuring beam costs a charge; the fixed front lens is stated and the answer is a half-dioptre dial', () => {
    const g = start(2, 5) as Extract<Game, { kind: 'stack' }>;
    click('Measure the pair with a beam');
    expect(feedback()).toMatch(/The pair measures .* D at this dial setting/);
    expect(hud()).toMatch(/Charges ·/);
    expect($('.note')?.textContent).toMatch(/Front lens fixed at/);
    setSlider(g.rounds[0].P2);
    commit(2);
    advance(2.7);
    expect(phase()).toBe('between');
  });
  it('dragging the power knob on the track sets the back lens in half-dioptre steps', () => {
    start(2, 5);
    pointer('pointerdown', 604, 290 - (10 / 20) * 220);
    pointer('pointermove', 604, 290 - (13.2 / 20) * 220);
    expect(sliders()[0].value).toBe('3');
  });
});

describe('level 3: the projector shot', () => {
  it('has two dials; right in one and wrong in the other still misses; a test beam reads out where the picture lands', () => {
    const g = start(3, 5) as Extract<Game, { kind: 'projector' }>;
    expect(sliders()).toHaveLength(2);
    click('Test beam: see where the picture lands');
    expect(feedback()).toMatch(/the picture lands [\d.]+ cm beyond the lens|inside the focus/);
    setSlider(g.rounds[0].u, 0);
    setSlider(g.rounds[0].f + 2, 1);
    commit(3);
    advance(2.8);
    expect(hearts()).toBe(2);
    expect(feedback()).toMatch(/blur|wrong size|inside the focus/);
    setRight(g, 0);
    commit(3);
    advance(2.8);
    expect(phase()).toBe('between');
  });
  it('the slider range follows the distance D of each round', () => {
    const g = start(3, 4) as Extract<Game, { kind: 'projector' }>;
    expect(sliders()[0].max).toBe(String(g.rounds[0].D - 5));
    solveRound(3, g, 0);
    advance(1);
    expect(sliders()[0].max).toBe(String(g.rounds[1].D - 5));
  });
});

describe('level 4: test chamber 09', () => {
  it('a flash reveals only lens 1’s own image, and two flashes are free in round 1', () => {
    const g = start(4, 5) as Extract<Game, { kind: 'relay' }>;
    expect(hud()).toMatch(/Charges ⚡⚡/);
    click('Flash: where lens 1 alone makes its image');
    expect(feedback()).toContain(`${g.rounds[0].v1} cm`);
    expect(feedback()).toMatch(/ignoring lens 2/);
    expect(feedback()).not.toContain(`${g.rounds[0].screen} cm`);
  });
});

describe('level 5: the magician’s tank', () => {
  it('the dip test reads out the lens in the current liquid, and the dark tank hides it in later rounds', () => {
    const g = start(5, 5);
    setSlider(1.5);
    click('Dip test: measure the lens in this liquid');
    expect(feedback()).toMatch(/Dip test in n = 1\.50: (converging|diverging|no focus)/);
    solveRound(5, g, 0);
    advance(1);
    expect($('.note')?.textContent).toMatch(/dark until the trick/);
  });
  it('a liquid that is too dense turns the lens diverging, and the miss says so without naming the right index', () => {
    const g = start(5, 5) as Extract<Game, { kind: 'liquid' }>;
    solveRound(5, g, 0);
    advance(1);
    setSlider(1.9);
    commit(5);
    advance(2.8);
    expect(feedback()).toMatch(/diverging/);
  });
});

describe('robustness', () => {
  it('every level animates through a hit and a miss with no console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4, 5]) {
      const g = start(level, 9);
      advance(0.8);
      setWrong(g, 0);
      commit(level);
      advance(3);
      solveRound(level, g, 0);
      advance(1);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
