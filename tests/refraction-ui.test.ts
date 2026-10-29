// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/refraction-bench/index';
import { buildGame, sinD, type Game } from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/refraction-bench/logic';
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
  const m = manifest('ra');
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
const slider = () => root.querySelector('input[type="range"]') as HTMLInputElement;
const setSlider = (v: number) => {
  slider().value = String(v);
  slider().dispatchEvent(new Event('input', { bubbles: true }));
};
const feedback = () => $('.feedback')?.textContent ?? '';
const phase = () => $('canvas')!.dataset.phase;
const hud = () => $('.hud')?.textContent ?? '';
const hearts = () => ($('.hud-hearts')?.textContent ?? '').split('♥').length - 1;
const pointer = (type: string, x: number, y: number) => $('canvas')!.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));

const COMMIT = ['Fire Ray at this angle', 'Lock the microscope focus here', 'Refocus the camera here', 'Float the disc on the surface', 'Launch Pulse at this angle'];
const solution = (g: Game, i: number) => (g.kind === 'snell' ? g.rounds[i].iSol : g.kind === 'depth' ? g.rounds[i].move : g.kind === 'slab' ? g.rounds[i].shift : g.kind === 'cone' ? Math.round(g.rounds[i].radius) : Math.round(g.rounds[i].maxDeg));
const wrong = (g: Game, i: number) => {
  if (g.kind === 'snell') return g.rounds[i].iSol <= 40 ? g.rounds[i].iSol + 15 : g.rounds[i].iSol - 15;
  if (g.kind === 'depth') return g.rounds[i].move > 3 ? g.rounds[i].move - 3 : g.rounds[i].move + 3;
  if (g.kind === 'slab') return g.rounds[i].shift + 3;
  if (g.kind === 'cone') return Math.round(g.rounds[i].radius * 0.5);
  return g.rounds[i].maxDeg >= 90 ? 20 : Math.min(90, Math.round(g.rounds[i].maxDeg) + 10);
};
const commit = (level: number) => click(COMMIT[level - 1]);
const solveRound = (level: number, g: Game, i: number) => {
  setSlider(solution(g, i));
  commit(level);
  advance(2.6);
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
  it('plays a whole level: three rounds, a growing score, then the win with 3 stars', () => {
    for (const level of [1, 2, 3, 4, 5]) {
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
        }
      }
      expect(phase()).toBe('won');
      advance(2);
      expect(wins).toEqual([3]);
      wins = [];
    }
  });
  it('a miss costs a heart, says what happened, keeps the round, and the next solve still works', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const g = start(level, 8);
      setSlider(wrong(g, 0));
      commit(level);
      advance(0.1);
      expect(phase()).toBe('resolve');
      advance(2.6);
      expect(hearts()).toBe(2);
      expect(hud()).toMatch(/Round 1 of 3/);
      expect(phase()).toBe('play');
      expect(feedback().length).toBeGreaterThan(15);
      solveRound(level, g, 0);
      expect(hearts()).toBe(2);
      expect(phase()).toBe('between');
    }
  });
  it('three misses end the level with a retry; hearts left decide the stars', () => {
    const g = start(5, 8);
    for (let i = 0; i < 3; i++) {
      setSlider(wrong(g, 0));
      commit(5);
      advance(2.8);
    }
    expect(phase()).toBe('over');
    expect($('.arcade-overlay')?.textContent).toMatch(/Out of hearts/);
    click('Try this level again');
    expect(restarts).toBe(1);
    const g2 = start(1, 8);
    setSlider(wrong(g2, 0));
    commit(1);
    advance(2.8);
    for (let i = 0; i < 3; i++) {
      solveRound(1, g2, i);
      advance(1);
    }
    advance(2);
    expect(wins).toEqual([2]);
  });
});

describe('level 1: Ray and the detector', () => {
  it('a probe costs a charge and reads out the bend; probing air is free and explains itself', () => {
    start(1, 5);
    expect(hud()).toMatch(/Charges ⚡⚡/);
    click('Probe medium A with a shot from air');
    expect(feedback()).toMatch(/Medium A is air/);
    expect(feedback()).toMatch(/does not cost/);
    expect(hud()).toMatch(/Charges ⚡⚡/);
    click('Probe medium B with a shot from air');
    expect(feedback()).toMatch(/Probe from air at 60° into medium B: the ray bends to [\d.]+°/);
    expect(hud()).toMatch(/Charges ⚡·/);
  });
  it('one probe of B is enough in round 1: the index follows and the angle solves the round', () => {
    const g = start(1, 5) as Extract<Game, { kind: 'snell' }>;
    click('Probe medium B with a shot from air');
    const bend = Number(/bends to ([\d.]+)°/.exec(feedback())![1]);
    const nB = sinD(60) / sinD(bend);
    const detector = Number(/detector sits ([\d.]+)°/.exec($('.note')?.textContent ?? '')![1]);
    expect(Math.round((Math.asin(nB * sinD(detector)) * 180) / Math.PI)).toBe(g.rounds[0].iSol);
  });
  it('a wrong angle lands beside the detector and never names the right one', () => {
    const g = start(1, 5);
    setSlider(wrong(g, 0));
    commit(1);
    advance(2.6);
    expect(feedback()).toMatch(/beside the detector/);
    expect(feedback()).not.toMatch(new RegExp(`\\b${solution(g, 0)}°`));
  });
});

describe('level 2 and 3: the aids fade', () => {
  it('the hint says which help is on in each round of the microscope level', () => {
    const g = start(2, 4);
    expect($('.note')?.textContent).toMatch(/shows Needle live/);
    solveRound(2, g, 0);
    advance(1);
    expect($('.note')?.textContent).toMatch(/eyepiece is off/);
  });
  it('the slab can be dragged anywhere and the answer does not change', () => {
    const g = start(3, 4) as Extract<Game, { kind: 'slab' }>;
    const r = g.rounds[0];
    pointer('pointerdown', 420, 290 - r.slabAt * 110 - 60);
    pointer('pointermove', 420, 290 - 0.9 * 110 - 60);
    pointer('pointerup', 0, 0);
    setSlider(r.shift);
    commit(3);
    advance(2.6);
    expect(phase()).toBe('between');
  });
});

describe('level 4: the disc over Glow', () => {
  it('the slider range follows the depth of each pool', () => {
    const g = start(4, 4) as Extract<Game, { kind: 'cone' }>;
    expect(slider().max).toBe(String(Math.round(1.5 * g.rounds[0].d)));
    solveRound(4, g, 0);
    advance(1);
    expect(slider().max).toBe(String(Math.round(1.5 * g.rounds[1].d)));
  });
  it('a small disc lets light escape, a huge one wastes cover', () => {
    const g = start(4, 4) as Extract<Game, { kind: 'cone' }>;
    setSlider(Math.round(g.rounds[0].radius * 0.5));
    commit(4);
    advance(2.6);
    expect(feedback()).toMatch(/still escapes/);
    setSlider(Math.round(g.rounds[0].radius * 1.4));
    commit(4);
    advance(2.6);
    expect(feedback()).toMatch(/wider than it needs/);
  });
});

describe('level 5: Pulse in the fibre', () => {
  it('too wide leaks at the first bounce; a narrow beam is carried but is not the objective', () => {
    const g = start(5, 4) as Extract<Game, { kind: 'pipe' }>;
    setSlider(Math.min(90, Math.round(g.rounds[0].maxDeg) + 10));
    commit(5);
    advance(2.6);
    expect(feedback()).toMatch(/leaks out/);
    setSlider(10);
    commit(5);
    advance(2.6);
    expect(feedback()).toMatch(/wider beam/);
    expect(hearts()).toBe(1);
  });
  it('the last fibre has no cladding: the whole half-space is guided, so 90° wins', () => {
    const g = start(5, 4) as Extract<Game, { kind: 'pipe' }>;
    solveRound(5, g, 0);
    advance(1);
    solveRound(5, g, 1);
    advance(1);
    setSlider(90);
    commit(5);
    advance(2.6);
    expect(phase()).toBe('won');
  });
  it('dragging the spark sets the entry angle, snapped to whole degrees', () => {
    start(5, 4);
    pointer('pointerdown', 150 - 80 * Math.cos((30 * Math.PI) / 180), 170 + 80 * Math.sin((30 * Math.PI) / 180));
    pointer('pointermove', 150 - 80 * Math.cos((47.4 * Math.PI) / 180), 170 + 80 * Math.sin((47.4 * Math.PI) / 180));
    expect(slider().value).toBe('47');
  });
});

describe('robustness', () => {
  it('every level animates through a hit and a miss with no console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4, 5]) {
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

