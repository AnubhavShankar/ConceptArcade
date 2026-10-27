// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch03-current-electricity/drift-lab/index';
import { buildLevel, type Level, type LevelCount, type LevelDrift, type LevelMobility, type LevelScale } from '../src/games/physics/class-12/ch03-current-electricity/drift-lab/logic';
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
  const m = manifest('dl');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop?.();
  stop = game.mount(ctx);
  return buildLevel(level, createRng(seed)) as Level;
}
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

describe('level 1: count the charge', () => {
  const dirLabel = (right: boolean) => (right ? 'Conventional current: left to right' : 'Conventional current: right to left');
  it('the gate must be opened first, for free', () => {
    start(1, 4);
    typeIn('Current in A', '1');
    click('Check the current');
    expect(feedback()).toMatch(/Open the gate first/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the gate animates (phase testing) and the right current and direction win', () => {
    const l = start(1, 4) as LevelCount;
    click('Open the gate');
    advance(0.5);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    typeIn('Current in A', r6(l.i));
    click(dirLabel(!l.electronsRight));
    click('Check the current');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/opposite way/);
  });
  it('taking the electrons\' direction as conventional is caught without giving the answer', () => {
    const l = start(1, 4) as LevelCount;
    click('Open the gate');
    advance(RUN);
    typeIn('Current in A', r6(l.i));
    click(dirLabel(l.electronsRight));
    click('Check the current');
    expect(feedback()).toMatch(/direction is not right/);
    expect(feedback()).not.toMatch(/current is not right/);
  });
});

describe('level 2: a slow crawl', () => {
  const go = (v: number, t: number) => {
    typeIn('Drift speed in mm/s', r6(v));
    typeIn('Time to drift the whole wire in hours', r6(t));
    click('Check the drift');
    advance(RUN);
  };
  it('the drift speed and hours win', () => {
    const l = start(2, 5) as LevelDrift;
    go(l.vd, l.hours);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/I = n e A v_d/);
  });
  it('seconds instead of hours is flagged under the time only', () => {
    const l = start(2, 5) as LevelDrift;
    go(l.vd, l.hours * 3600);
    expect(feedback()).toMatch(/time is not right/);
    expect(feedback()).not.toMatch(/drift speed is not right/);
  });
  it('needs both answers, for free', () => {
    start(2, 5);
    click('Check the drift');
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: thick and thin', () => {
  it('the new drift speed and the signal time win', () => {
    const l = start(3, 6) as LevelScale;
    typeIn('New drift speed in mm/s', r6(l.vd2));
    typeIn('Time for the signal to cross the circuit in ns', r6(l.ns));
    click('Check the wire');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/speed of light/);
  });
  it('reusing the old drift speed is a miss that does not reveal the new one', () => {
    const l = start(3, 6) as LevelScale;
    typeIn('New drift speed in mm/s', r6(l.vd1));
    typeIn('Time for the signal to cross the circuit in ns', r6(l.ns));
    click('Check the wire');
    expect(feedback()).toMatch(/new drift speed is not right/);
    expect(feedback()).not.toContain(r6(l.vd2));
  });
});

describe('level 4: mobility', () => {
  it('v_d = μE and I = nAev_d win', () => {
    const l = start(4, 7) as LevelMobility;
    typeIn('Drift speed in mm/s', r6(l.vd));
    typeIn('Current in A', r6(l.i));
    click('Check the wire');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('a drift speed in m/s is caught under the speed', () => {
    const l = start(4, 7) as LevelMobility;
    typeIn('Drift speed in mm/s', r6(l.vd / 1000));
    typeIn('Current in A', r6(l.i));
    click('Check the wire');
    expect(feedback()).toMatch(/drift speed is not right/);
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
