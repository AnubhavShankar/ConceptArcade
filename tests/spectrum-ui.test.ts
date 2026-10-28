// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch08-electromagnetic-waves/spectrum-lab/index';
import { BANDS, bandName, buildLevel, type Level, type LevelClassify, type LevelOrder, type LevelPhoton, type LevelSame } from '../src/games/physics/class-12/ch08-electromagnetic-waves/spectrum-lab/logic';
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
  const m = manifest('sp');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop?.();
  stop = game.mount(ctx);
  return buildLevel(level, createRng(seed)) as Level;
}
const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;
const click = (label: string) => {
  const b = root.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement | null;
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

describe('level 1: put them in order', () => {
  it('all five must be picked first, for free', () => {
    const l = start(1, 4) as LevelOrder;
    click(`Pick ${bandName(l.order[0])}`);
    click('Check the order');
    expect(feedback()).toMatch(/Pick all the bands/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the right order wins; a reversed order is a miss; "start again" lets you retry', () => {
    const l = start(1, 4) as LevelOrder;
    [...l.order].reverse().forEach((b) => click(`Pick ${bandName(b)}`));
    click('Check the order');
    expect(feedback()).toMatch(/not the order/);
    advance(RUN);
    click('Reset the order');
    l.order.forEach((b) => click(`Pick ${bandName(b)}`));
    click('Check the order');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/longest wavelength/);
  });
});

describe('level 2: name that wave', () => {
  it('the band and frequency win; a wrong band is flagged under the band only', () => {
    const l = start(2, 5) as LevelClassify;
    typeIn('Frequency in Hz', r6(l.hz));
    click(`Band: ${bandName(l.band === 'radio' ? 'xray' : 'radio')}`);
    click('Identify the wave');
    expect(feedback()).toMatch(/band is not right/);
    expect(feedback()).not.toMatch(/frequency is not right/);
    advance(RUN);
    click(`Band: ${bandName(l.band)}`);
    click('Identify the wave');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('every band offered has a button', () => {
    start(2, 5);
    for (const b of BANDS) expect(root.querySelector(`[aria-label="Band: ${b.name}"]`)).not.toBeNull();
  });
});

describe('level 3: photon energies', () => {
  it('the energy and the more energetic photon win; the wrong comparison is flagged under the comparison', () => {
    const l = start(3, 6) as LevelPhoton;
    typeIn('Photon energy in eV', r6(l.ev));
    click(l.larger === 'first' ? 'The second radiation has the more energetic photons' : 'The first radiation has the more energetic photons');
    click('Measure the photons');
    expect(feedback()).toMatch(/comparison is not right/);
    expect(feedback()).not.toMatch(/energy is not right/);
    advance(RUN);
    click(l.larger === 'first' ? 'The first radiation has the more energetic photons' : 'The second radiation has the more energetic photons');
    click('Measure the photons');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 4: the same speed', () => {
  it('the time and "speed" win; "frequency" is flagged under the quantity', () => {
    const l = start(4, 3) as LevelSame;
    typeIn('Travel time in ms', r6(l.ms));
    click('Frequency is the same');
    click('Race the waves');
    expect(feedback()).toMatch(/quantity is not right/);
    expect(feedback()).not.toMatch(/time is not right/);
    advance(RUN);
    click('Speed in vacuum is the same');
    click('Race the waves');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/Only the speed/);
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
