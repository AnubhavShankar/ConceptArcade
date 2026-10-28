// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch06-electromagnetic-induction/lenz-lab/index';
import { buildLevel, type Level, type LevelLoop, type LevelMagnet, type LevelRod } from '../src/games/physics/class-12/ch06-electromagnetic-induction/lenz-lab/logic';
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
  const m = manifest('lz');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 3, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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
const RUN = 5;
const senseLabel = (s: string) => (s === 'none' ? 'There is no current' : `Current is ${s}`);

describe('level 1: magnet and coil', () => {
  it('both choices must be made first, for free', () => {
    start(1, 4);
    click('Move the magnet');
    expect(feedback()).toMatch(/Choose a direction/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the right pair wins and the magnet moves (phase testing); a wrong force is flagged under the force', () => {
    const l = start(1, 4) as LevelMagnet;
    click(senseLabel(l.sense));
    click(l.force === 'repels' ? 'The coil attracts the magnet' : 'The coil repels the magnet');
    click('Move the magnet');
    expect(feedback()).toMatch(/force is not right/);
    expect(feedback()).not.toMatch(/direction of the current is not right/);
    advance(RUN);
    click(l.force === 'repels' ? 'The coil repels the magnet' : 'The coil attracts the magnet');
    click('Move the magnet');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 2: loop in a field', () => {
  it('every sense can be right, including "no current"', () => {
    for (const sense of ['clockwise', 'anticlockwise', 'none']) {
      wins = [];
      const l = start(2, seedFor(2, (x) => (x as LevelLoop).sense === sense)) as LevelLoop;
      click(senseLabel(l.sense));
      click('Check the loop');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
  });
  it('the wrong sense is a miss that does not give the answer', () => {
    start(2, seedFor(2, (x) => (x as LevelLoop).sense === 'clockwise'));
    click('Current is anticlockwise');
    click('Check the loop');
    expect(feedback()).toMatch(/not right/);
    expect(feedback()).not.toMatch(/clockwise\b.*is right/);
  });
});

describe('level 3: pulling a rod', () => {
  it('current, force and power win; the force in newtons is flagged under the force', () => {
    const l = start(3, 6) as LevelRod;
    typeIn('Induced current in A', r6(l.current));
    typeIn('Force needed in mN', r6(l.forceMilli / 1000));
    typeIn('Power supplied in mW', r6(l.powerMilli));
    click('Pull the rod');
    expect(feedback()).toMatch(/force is not right/);
    expect(feedback()).not.toMatch(/current is not right/);
    advance(RUN);
    typeIn('Force needed in mN', r6(l.forceMilli));
    click('Pull the rod');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/I²R/);
  });
});

describe('robustness', () => {
  it('every level mounts and animates without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      advance(0.8);
      expect(canvas().dataset.phase).toBe('idle');
    }
    expect(err).not.toHaveBeenCalled();
  });
});
