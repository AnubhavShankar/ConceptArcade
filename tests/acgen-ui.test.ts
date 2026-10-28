// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch06-electromagnetic-induction/ac-generator/index';
import { buildLevel, type Level, type LevelPeak, type LevelRpm, type LevelScale } from '../src/games/physics/class-12/ch06-electromagnetic-induction/ac-generator/logic';
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
  const m = manifest('ag');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 3, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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
const RUN = 5;

describe('level 1: peak and instant', () => {
  it('both win; the peak given for the instantaneous emf is flagged under that answer', () => {
    const l = start(1, 4) as LevelPeak;
    typeIn('Peak emf in V', r6(l.peak));
    typeIn('Emf at the given angle in V', r6(l.peak));
    click('Turn the coil');
    expect(feedback()).toMatch(/emf at that angle is not right/);
    expect(feedback()).not.toMatch(/peak emf is not right/);
    advance(RUN);
    typeIn('Emf at the given angle in V', r6(l.inst));
    click('Turn the coil');
    advance(1);
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/NBAω/);
  });
});

describe('level 2: revolutions per minute', () => {
  it('peak and quarter-turn time win; the full period is flagged under the time', () => {
    const l = start(2, 5) as LevelRpm;
    typeIn('Peak emf in V', r6(l.peak));
    typeIn('Time from zero to the first peak in ms', r6(l.quarterMs * 4));
    click('Turn the coil');
    expect(feedback()).toMatch(/time is not right/);
    expect(feedback()).not.toMatch(/peak emf is not right/);
    advance(RUN);
    typeIn('Time from zero to the first peak in ms', r6(l.quarterMs));
    click('Turn the coil');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 3: change the generator', () => {
  it('the product of the factors wins', () => {
    const l = start(3, 6) as LevelScale;
    typeIn('New peak emf in V', r6(l.newPeak));
    click('Change the generator');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('the sum of the factors is a miss that does not give the answer', () => {
    const l = start(3, 6) as LevelScale;
    typeIn('New peak emf in V', r6(l.peak * (l.nFactor + l.speedFactor + l.bFactor) + 1000));
    click('Change the generator');
    expect(feedback()).toMatch(/not the new peak emf/);
    expect(feedback()).not.toContain(r6(l.newPeak));
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
