// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/mirror-bench/index';
import { buildLevel, tanDeg, type Level, type LevelFocus, type LevelPin, type LevelShave, type LevelSpot } from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/mirror-bench/logic';
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
  const m = manifest('mb');
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

const SCREEN = 'Screen distance from the mirror in cm';
const HEIGHT = 'Image height in cm, negative if upside down';

describe('every level opens with a hero and an objective', () => {
  it('shows the hero banner with an Objective line', () => {
    for (const level of [1, 2, 3, 4]) {
      start(level, 4);
      expect($('.hero .hero-name')?.textContent?.length).toBeGreaterThan(4);
      expect($('.hero .objective')?.textContent).toMatch(/^Objective:/);
    }
  });
});

describe('level 1: Flicker’s image on the wall', () => {
  it('empty or non-positive input is free', () => {
    start(1, 4);
    click('Set the screen');
    expect(feedback()).toMatch(/does not cost/);
    typeIn(SCREEN, -4);
    typeIn(HEIGHT, 1);
    click('Set the screen');
    expect(feedback()).toMatch(/positive number/);
    advance(0.1);
    expect(canvas().dataset.phase).toBe('idle');
  });
  it('a wrong screen distance blurs the image and costs nothing yet (one free test), the next miss costs a star', () => {
    const l = start(1, 4) as LevelFocus;
    typeIn(SCREEN, r6(l.screen * 1.5));
    typeIn(HEIGHT, r6(l.imgH));
    click('Set the screen');
    expect(feedback()).toMatch(/blurred/);
    expect(feedback()).not.toMatch(new RegExp(`\\b${r6(l.screen)}\\b`));
    expect(feedback()).toMatch(/free test/);
    advance(RUN);
    click('Set the screen');
    expect(feedback()).toMatch(/cost a star/);
    advance(RUN);
    typeIn(SCREEN, r6(l.screen));
    click('Set the screen');
    advance(RUN);
    expect(wins).toEqual([2]);
    expect($('.solution')?.textContent).toMatch(/real/);
  });
  it('the right distance and the signed height win; the right distance with the wrong sign does not', () => {
    const l = start(1, 7) as LevelFocus;
    typeIn(SCREEN, r6(l.screen));
    typeIn(HEIGHT, r6(-l.imgH));
    click('Set the screen');
    expect(feedback()).toMatch(/image height is not right/);
    expect(feedback()).not.toMatch(/blurred/);
    advance(RUN);
    typeIn(HEIGHT, r6(l.imgH));
    click('Set the screen');
    advance(0.1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('controls lock after the win', () => {
    const l = start(1, 7) as LevelFocus;
    typeIn(SCREEN, r6(l.screen));
    typeIn(HEIGHT, r6(l.imgH));
    click('Set the screen');
    advance(RUN);
    expect((root.querySelector(`input[aria-label="${SCREEN}"]`) as HTMLInputElement).disabled).toBe(true);
    expect((root.querySelector('[aria-label="Set the screen"]') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('level 2: Dash in the wing mirror', () => {
  it('the pin at the image and the right height win; the pin at the object distance leaves a gap', () => {
    const l = start(2, 5) as LevelPin;
    typeIn('Pin distance behind the mirror in cm', r6(l.d));
    typeIn(HEIGHT, r6(l.imgH));
    click('Push the pin in');
    expect(feedback()).toMatch(/gap/);
    advance(RUN);
    typeIn('Pin distance behind the mirror in cm', r6(l.behind));
    click('Push the pin in');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 3: Zoya’s shaving mirror', () => {
  it('describes the effect of a wrong distance but never states the right one', () => {
    const l = start(3, 6) as LevelShave;
    typeIn('Distance from the mirror in cm', r6(l.F * 2));
    click('Hold the face there');
    expect(feedback()).toMatch(/real and upside down/);
    expect(feedback()).not.toMatch(new RegExp(`at ${r6(l.d)} cm`));
    advance(RUN);
    typeIn('Distance from the mirror in cm', r6(l.F));
    click('Hold the face there');
    expect(feedback()).toMatch(/no image forms/);
    advance(RUN);
    typeIn('Distance from the mirror in cm', r6(l.d));
    click('Hold the face there');
    advance(RUN);
    expect(wins).toEqual([2]);
  });
});

describe('level 4: Beam on the galvanometer scale', () => {
  it('the half-angle answer misses; L tan 2θ wins', () => {
    const l = start(4, 3) as LevelSpot;
    typeIn('Detector position on the wall in cm', r6(l.L * tanDeg(l.theta)));
    click('Turn the mirror');
    expect(feedback()).toMatch(/beside the detector/);
    advance(RUN);
    typeIn('Detector position on the wall in cm', r6(l.shift));
    click('Turn the mirror');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/twice/);
  });
});

describe('robustness', () => {
  it('every level mounts and animates without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(20);
      advance(0.8);
      expect(canvas().dataset.phase).toBe('idle');
    }
    expect(err).not.toHaveBeenCalled();
  });
});
