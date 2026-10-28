// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch06-electromagnetic-induction/motional-emf/index';
import { buildLevel, type Level, type LevelLeave, type LevelRod, type LevelWheel, type LevelWire } from '../src/games/physics/class-12/ch06-electromagnetic-induction/motional-emf/logic';
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
  const m = manifest('me');
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
const RUN = 5;

describe('level 1: a falling wire', () => {
  it('the emf and the end win; the other end is flagged under the end only', () => {
    const l = start(1, 4) as LevelWire;
    typeIn('Induced emf in mV', r6(l.milliV));
    click(l.end === 'east' ? 'West end is at the higher potential' : 'East end is at the higher potential');
    click('Let go of the wire');
    expect(feedback()).toMatch(/end is not right/);
    expect(feedback()).not.toMatch(/emf is not right/);
    advance(RUN);
    click(l.end === 'east' ? 'East end is at the higher potential' : 'West end is at the higher potential');
    click('Let go of the wire');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('needs an end, for free', () => {
    const l = start(1, 4) as LevelWire;
    typeIn('Induced emf in mV', r6(l.milliV));
    click('Let go of the wire');
    expect(feedback()).toMatch(/Choose which end/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 2: a loop leaving the field', () => {
  it('emf and duration win; swapping the sides is flagged under the emf', () => {
    const l = start(2, 5) as LevelLeave;
    const cutWrong = l.normalToLong ? l.shortCm : l.longCm;
    typeIn('Emf across the cut in µV', r6(l.b * (cutWrong / 100) * (l.vCm / 100) * 1e6));
    typeIn('Duration of the emf in s', r6(l.seconds));
    click('Pull the loop out');
    expect(feedback()).toMatch(/emf is not right/);
    expect(feedback()).not.toMatch(/duration is not right/);
    advance(RUN);
    typeIn('Emf across the cut in µV', r6(l.microV));
    click('Pull the loop out');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 3: a spinning rod', () => {
  it('the emf wins; the solution mentions ½Bωl²', () => {
    const l = start(3, 6) as LevelRod;
    typeIn('Emf between the centre and the ring in V', r6(l.volts));
    click('Spin the rod');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/½Bωl²/);
  });
});

describe('level 4: the wheel', () => {
  it('the emf wins; multiplying by the spokes is a miss without the answer', () => {
    const l = start(4, 3) as LevelWheel;
    typeIn('Emf between the axle and the rim in µV', r6(l.microV * l.spokes));
    click('Spin the wheel');
    expect(feedback()).toMatch(/not the emf/);
    expect(feedback()).not.toContain(r6(l.microV));
    advance(RUN);
    typeIn('Emf between the axle and the rim in µV', r6(l.microV));
    click('Spin the wheel');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/do not add/);
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
