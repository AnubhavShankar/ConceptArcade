// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-field/index';
import { buildLevel, type Level, type LevelCompensate, type LevelScale, type LevelShort } from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-field/logic';
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
  const m = manifest('mf');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 3, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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

describe('level 1: axis and equator', () => {
  it('both fields and both directions win', () => {
    const l = start(1, 4) as LevelShort;
    typeIn('Field on the axis in µT', r6(l.axial));
    typeIn('Field on the equatorial line in µT', r6(l.equatorial));
    click('Axial field points along the moment');
    click('Equatorial field points against the moment');
    click('Measure the fields');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/replaced by μ₀/);
  });
  it('the wrong equatorial direction is flagged without naming the right one; missing choices are free', () => {
    const l = start(1, 4) as LevelShort;
    typeIn('Field on the axis in µT', r6(l.axial));
    typeIn('Field on the equatorial line in µT', r6(l.equatorial));
    click('Measure the fields');
    expect(feedback()).toMatch(/Choose a direction/);
    expect(feedback()).toMatch(/does not cost/);
    click('Axial field points along the moment');
    click('Equatorial field points along the moment');
    click('Measure the fields');
    expect(feedback()).toMatch(/direction on the equatorial line is not right/);
    expect(feedback()).not.toMatch(/axial field is not right/);
  });
  it('swapped fields are flagged under both sizes', () => {
    const l = start(1, 4) as LevelShort;
    typeIn('Field on the axis in µT', r6(l.equatorial));
    typeIn('Field on the equatorial line in µT', r6(l.axial));
    click('Axial field points along the moment');
    click('Equatorial field points against the moment');
    click('Measure the fields');
    expect(feedback()).toMatch(/axial field is not right/);
    expect(feedback()).toMatch(/equatorial field is not right/);
  });
});

describe('level 2: the null point', () => {
  it('the probe must be moved first, for free', () => {
    const l = start(2, 4) as LevelCompensate;
    typeIn('Distance in cm', r6(l.rCm));
    click('Check the null point');
    expect(feedback()).toMatch(/Slide the probe/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('after moving the probe, the null distance wins', () => {
    const l = start(2, 4) as LevelCompensate;
    const sl = root.querySelector('input[aria-label="Probe distance in cm"]') as HTMLInputElement;
    sl.value = String(Math.round(l.rCm));
    sl.dispatchEvent(new Event('input', { bubbles: true }));
    advance(0.5);
    typeIn('Distance in cm', r6(l.rCm));
    click('Check the null point');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/r³ = 2/);
  });
});

describe('level 3: scale it', () => {
  it('B₁/(2k³) wins; B₁/k³ (forgetting the half) is a miss that does not give the answer', () => {
    const l = start(3, 6) as LevelScale;
    typeIn('Equatorial field in µT', r6(l.b1 / l.k ** 3));
    click('Predict the field');
    expect(feedback()).toMatch(/not the equatorial field/);
    expect(feedback()).not.toContain(r6(l.eqNew));
    advance(RUN);
    typeIn('Equatorial field in µT', r6(l.eqNew));
    click('Predict the field');
    advance(RUN);
    expect(wins).toEqual([3]);
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
