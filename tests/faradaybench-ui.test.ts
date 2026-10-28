// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch06-electromagnetic-induction/faraday-bench/index';
import { buildLevel, type Level, type LevelFlip, type LevelFlux, type LevelGraph, type LevelSolenoid } from '../src/games/physics/class-12/ch06-electromagnetic-induction/faraday-bench/logic';
import { createRng } from '../src/core/random';
import type { GameContext } from '../src/core/types';
import { manifest } from './fixtures';

let step: (ms: number) => void;
let clock = 0;
let stop: (() => void) | void;
let wins: number[];
let root: HTMLElement;

beforeEach(() => {
  clock = 0;
  wins = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: () => () => undefined, set: () => true }) as never);
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
  const m = manifest('fa');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop?.();
  stop = game.mount(ctx);
  return buildLevel(level, createRng(seed)) as Level;
}
const seedFor = (level: number, ok: (l: Level) => boolean) => {
  for (let s = 1; s < 600; s++) if (ok(buildLevel(level, createRng(s)))) return s;
  throw new Error('no seed');
};
const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;
const btn = (label: string) => root.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement | null;
const click = (label: string) => {
  const b = btn(label);
  if (!b) throw new Error(`no button "${label}"`);
  b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
const typeIn = (label: string, v: string | number) => {
  const el = root.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
  if (!el) throw new Error(`no input "${label}"`);
  el.value = String(v);
};
const feedback = () => $('.feedback')?.textContent ?? '';
const canvas = () => $('canvas') as HTMLCanvasElement;
const r6 = (x: number) => String(Number(x.toPrecision(6)));
const RUN = 4;

describe('level 1: flux through a coil', () => {
  it('both modes: the answer wins (signed for a change)', () => {
    for (const mode of ['flux', 'change']) {
      wins = [];
      const l = start(1, seedFor(1, (x) => (x as LevelFlux).mode === mode)) as LevelFlux;
      typeIn(mode === 'flux' ? 'Flux in mWb' : 'Change in flux in mWb', r6(l.answer));
      click('Measure the flux');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
  });
  it('a wrong value does not give the answer', () => {
    const l = start(1, seedFor(1, (x) => (x as LevelFlux).mode === 'flux')) as LevelFlux;
    typeIn('Flux in mWb', r6(l.answer * 5));
    click('Measure the flux');
    expect(feedback()).toMatch(/not the flux/);
    expect(feedback()).not.toContain(r6(l.answer));
  });
});

describe('level 2: loop in a solenoid', () => {
  it('the emf wins; the animation runs (phase testing)', () => {
    const l = start(2, 5) as LevelSolenoid;
    typeIn('Induced emf in µV', r6(l.microV));
    click('Change the current');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/μ₀nA/);
  });
});

describe('level 3: turning a coil', () => {
  it('emf and current win; half the emf is flagged under the emf only', () => {
    const l = start(3, 6) as LevelFlip;
    typeIn('Average emf in mV', r6(l.emf / 2));
    typeIn('Average current in mA', r6(l.current));
    click('Turn the coil');
    expect(feedback()).toMatch(/emf is not right/);
    expect(feedback()).not.toMatch(/current is not right/);
    advance(RUN);
    typeIn('Average emf in mV', r6(l.emf));
    click('Turn the coil');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 4: read the graph', () => {
  it('the emf and the steepest segment win; a wrong segment is flagged', () => {
    const l = start(4, 3) as LevelGraph;
    typeIn('Emf in the chosen segment in mV', r6(l.emf));
    click(`Segment ${(l.largest % 3) + 1} has the largest emf`);
    click('Read the graph');
    expect(feedback()).toMatch(/segment is not right/);
    expect(feedback()).not.toMatch(/emf is not right/);
    advance(RUN);
    click(`Segment ${l.largest} has the largest emf`);
    click('Read the graph');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('needs a segment choice, for free', () => {
    const l = start(4, 3) as LevelGraph;
    typeIn('Emf in the chosen segment in mV', r6(l.emf));
    click('Read the graph');
    expect(feedback()).toMatch(/Choose the segment/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('robustness', () => {
  it('every level mounts and animates without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      advance(0.8);
      expect(canvas().dataset.phase).toBe('idle');
    }
    expect(err).not.toHaveBeenCalled();
  });
});
