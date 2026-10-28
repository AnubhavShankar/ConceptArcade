// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/mirror-bench/index';
import { buildGame, type Game } from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/mirror-bench/logic';
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
  const m = manifest('ma');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => restarts++ } as unknown as GameContext;
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
const slider = () => root.querySelector('input[type="range"]') as HTMLInputElement;
const setSlider = (v: number) => {
  slider().value = String(v);
  slider().dispatchEvent(new Event('input', { bubbles: true }));
};
const feedback = () => $('.feedback')?.textContent ?? '';
const phase = () => $('canvas')!.dataset.phase;
const hud = () => $('.hud')?.textContent ?? '';
const hearts = () => ($('.hud-hearts')?.textContent ?? '').split('♥').length - 1;

const COMMIT = ['Ignite Flicker at this spot', 'Start Dash driving to the finish line', 'Take the selfie at this distance', 'Fire the laser at this dial setting'];
/** The slider value that solves round i of this game. */
const solution = (g: Game, i: number) => (g.kind === 'wall' ? g.rounds[i].uSol : g.kind === 'drive' ? g.rounds[i].behind : g.kind === 'selfie' ? g.rounds[i].d : g.rounds[i].theta);
/** A slider value that is certainly wrong for round i. */
const wrong = (g: Game, i: number) => (g.kind === 'wall' ? g.rounds[i].uStart : g.kind === 'drive' ? 1 : g.kind === 'selfie' ? 3 * g.rounds[i].F : 0);
const commit = (level: number) => click(COMMIT[level - 1]);
const solveRound = (level: number, g: Game, i: number) => {
  setSlider(solution(g, i));
  commit(level);
  advance(2.5);
};

describe('the arcade shell around every level', () => {
  it('opens with a hero banner, a HUD of three hearts, round 1 of 3 and a score of 0', () => {
    for (const level of [1, 2, 3, 4]) {
      start(level, 4);
      expect($('.hero .hero-name')?.textContent?.length).toBeGreaterThan(4);
      expect($('.hero .objective')?.textContent).toMatch(/^Objective:/);
      expect(hearts()).toBe(3);
      expect(hud()).toMatch(/Round 1 of 3/);
      expect(hud()).toMatch(/Score 0/);
      expect(phase()).toBe('play');
    }
  });
  it('plays a whole level: three rounds, a growing score, then the win with 3 stars', () => {
    for (const level of [1, 2, 3, 4]) {
      const g = start(level, 6);
      let last = 0;
      for (let i = 0; i < 3; i++) {
        solveRound(level, g, i);
        const score = Number(/Score (\d+)/.exec(hud())![1]);
        expect(score).toBeGreaterThan(last);
        last = score;
        if (i < 2) {
          expect(phase()).toBe('between');
          advance(1);
          expect(hud()).toMatch(new RegExp(`Round ${i + 2} of 3`));
          expect(phase()).toBe('play');
        }
      }
      expect(phase()).toBe('won');
      expect(wins).toEqual([]);
      advance(2);
      expect(wins).toEqual([3]);
      wins = [];
    }
  });
  it('a miss costs a heart, shows the effect, keeps the same round and the next solve still works', () => {
    for (const level of [1, 2, 3, 4]) {
      const g = start(level, 8);
      setSlider(wrong(g, 0));
      commit(level);
      advance(0.1);
      expect(phase()).toBe('resolve');
      advance(2.4);
      expect(hearts()).toBe(2);
      expect(hud()).toMatch(/Round 1 of 3/);
      expect(phase()).toBe('play');
      expect(feedback().length).toBeGreaterThan(15);
      solveRound(level, g, 0);
      expect(hud()).toMatch(/Round 2 of 3|Round 1 of 3/);
      expect(hearts()).toBe(2);
    }
  });
  it('one miss during the level leaves 2 stars', () => {
    const g = start(1, 8);
    setSlider(wrong(g, 0));
    commit(1);
    advance(2.6);
    for (let i = 0; i < 3; i++) {
      solveRound(1, g, i);
      advance(1);
    }
    advance(2);
    expect(wins).toEqual([2]);
  });
  it('losing all three hearts ends the level and offers a retry that restarts it', () => {
    const g = start(1, 8);
    for (let i = 0; i < 3; i++) {
      setSlider(wrong(g, 0));
      commit(1);
      advance(2.6);
    }
    expect(phase()).toBe('over');
    expect(hearts()).toBe(0);
    expect(($('.arcade-overlay') as HTMLElement).hidden).toBe(false);
    expect($('.arcade-overlay')?.textContent).toMatch(/Out of hearts/);
    click('Try this level again');
    expect(restarts).toBe(1);
    expect(wins).toEqual([]);
  });
  it('controls are locked while the consequence plays and free again afterwards', () => {
    const g = start(2, 3);
    setSlider(wrong(g, 0));
    commit(2);
    advance(0.5);
    expect(slider().disabled).toBe(true);
    expect((root.querySelector(`[aria-label="${COMMIT[1]}"]`) as HTMLButtonElement).disabled).toBe(true);
    advance(2.5);
    expect(slider().disabled).toBe(false);
  });
  it('the mute button toggles and is reachable', () => {
    start(1, 3);
    click('Sound on');
    expect($('.hud-mute')?.getAttribute('aria-pressed')).toBe('true');
    expect($('.hud-mute')?.getAttribute('aria-label')).toBe('Sound off');
  });
});

describe('level 1: Flicker lights the wall', () => {
  it('a flash costs a charge and reads out the image; with none left it is free to try and tells you', () => {
    const g = start(1, 5);
    expect(hud()).toMatch(/Charges ⚡⚡/);
    click('Flash: see where the image lands from here');
    expect(feedback()).toMatch(/Flicker at \d+ cm: a real image/);
    expect(hud()).toMatch(/Charges ⚡·/);
    click('Flash: see where the image lands from here');
    click('Flash: see where the image lands from here');
    expect(feedback()).toMatch(/No charges left/);
    expect(feedback()).toMatch(/does not cost/);
    expect(hearts()).toBe(3);
    expect(g.kind).toBe('wall');
  });
  it('one flash is enough to deduce the focal length and solve the round', () => {
    const g = start(1, 5) as Extract<Game, { kind: 'wall' }>;
    click('Flash: see where the image lands from here');
    const m = /Flicker at (\d+) cm: a real image ([\d.]+) cm/.exec(feedback())!;
    const u = Number(m[1]);
    const v = Number(m[2]);
    const f = (u * v) / (u + v);
    const need = (g.rounds[0].wall * f) / (g.rounds[0].wall - f);
    expect(need).toBeCloseTo(g.rounds[0].uSol, 6);
    setSlider(Math.round(need));
    commit(1);
    advance(2.5);
    expect(hud()).toMatch(/Round 2 of 3/);
  });
  it('flashing without a miss does not cost a heart; a charge is not refilled by a miss', () => {
    const g = start(1, 5);
    click('Flash: see where the image lands from here');
    setSlider(wrong(g, 0));
    commit(1);
    advance(2.6);
    expect(hearts()).toBe(2);
    expect(hud()).toMatch(/Charges ⚡·/);
  });
});

describe('level 3: the selfie ring', () => {
  it('the slider range follows the focal length of each round and the hint says how much help is left', () => {
    const g = start(3, 4) as Extract<Game, { kind: 'selfie' }>;
    expect(slider().max).toBe(String(3 * g.rounds[0].F));
    expect($('.hint, .note')?.textContent).toMatch(/Round 1: the tolerance band/);
    solveRound(3, g, 0);
    advance(1);
    expect(slider().max).toBe(String(3 * g.rounds[1].F));
    expect($('.note')?.textContent).toMatch(/dimmed/);
    solveRound(3, g, 1);
    advance(1);
    expect($('.note')?.textContent).toMatch(/no live view/i);
  });
  it('holding her face too far describes an upside-down image and never states the right distance', () => {
    const g = start(3, 4) as Extract<Game, { kind: 'selfie' }>;
    setSlider(wrong(g, 0));
    commit(3);
    advance(1.2);
    expect(feedback()).toMatch(/real and upside down/);
    expect(feedback()).not.toContain(`${g.rounds[0].d} cm`);
  });
});

describe('level 4: the laser gallery', () => {
  it('doubling is the trap: the dial at the ray-turn angle misses', () => {
    const g = start(4, 4) as Extract<Game, { kind: 'laser' }>;
    setSlider(Math.min(10, g.rounds[0].theta * 2));
    commit(4);
    advance(1.2);
    expect(feedback()).toMatch(/beside the target/);
    expect(hearts()).toBe(2);
  });
});

describe('direct manipulation on the canvas', () => {
  const pointer = (type: string, x: number, y: number) => $('canvas')!.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
  it('dragging Flicker along the rail moves the slider, snapped to whole centimetres', () => {
    const g = start(1, 5) as Extract<Game, { kind: 'wall' }>;
    const u0 = g.rounds[0].uStart;
    pointer('pointerdown', 50 + u0 * 5.4, 190 - 24);
    pointer('pointermove', 50 + 30.4 * 5.4, 166);
    expect(slider().value).toBe('30');
    pointer('pointerup', 0, 0);
    pointer('pointermove', 50 + 60 * 5.4, 166);
    expect(slider().value).toBe('30');
  });
  it('a drag that does not start on a handle does nothing, and a drag is ignored while the consequence plays', () => {
    const g = start(1, 5);
    const before = slider().value;
    pointer('pointerdown', 600, 20);
    pointer('pointermove', 300, 20);
    expect(slider().value).toBe(before);
    setSlider(wrong(g, 0));
    commit(1);
    advance(0.3);
    const during = slider().value;
    pointer('pointerdown', 50 + Number(during) * 5.4, 166);
    pointer('pointermove', 100, 166);
    expect(slider().value).toBe(during);
  });
  it('dragging the laser mirror tip sets the dial in half-degree steps', () => {
    start(4, 5);
    pointer('pointerdown', 110 + 50 * Math.sin((4 * Math.PI) / 180), 190 - 50 * Math.cos((4 * Math.PI) / 180));
    pointer('pointermove', 110 + 50 * Math.sin((4 * 3.4 * Math.PI) / 180), 190 - 50 * Math.cos((4 * 3.4 * Math.PI) / 180));
    expect(slider().value).toBe('3.5');
  });
});

describe('robustness', () => {
  it('every level animates through a hit and a miss with no console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      const g = start(level, 9);
      advance(0.8);
      setSlider(wrong(g, 0));
      commit(level);
      advance(3);
      solveRound(level, g, 0);
      advance(1);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
