// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch03-current-electricity/bridge-balance/index';
import { buildLevel, type Level, type LevelCurrent, type LevelMeter, type LevelNull } from '../src/games/physics/class-12/ch03-current-electricity/bridge-balance/logic';
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
  const m = manifest('bb');
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
const RUN = 4;

describe('level 1: find the null', () => {
  it('the unknown resistance wins', () => {
    const l = start(1, 4) as LevelNull;
    const sl = root.querySelector('input[aria-label="Rheostat resistance in Ω"]') as HTMLInputElement;
    sl.value = String(l.rStar);
    sl.dispatchEvent(new Event('input', { bubbles: true }));
    typeIn('Unknown resistance in Ω', r6(l.x));
    click('Check the bridge');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/P\/Q = R\/X/);
  });
  it('the rheostat setting itself is a miss that does not reveal X', () => {
    const l = start(1, seedFor(1, (x) => (x as LevelNull).rStar !== (x as LevelNull).x)) as LevelNull;
    typeIn('Unknown resistance in Ω', r6(l.rStar));
    click('Check the bridge');
    expect(feedback()).toMatch(/not the unknown resistance/);
    expect(feedback()).not.toContain(`${l.x} Ω`);
  });
  it('rejects a non-positive value for free', () => {
    start(1, 4);
    typeIn('Unknown resistance in Ω', '0');
    click('Check the bridge');
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 2: an unbalanced bridge', () => {
  it('the current and direction win; the sweep animates', () => {
    const l = start(2, 4) as LevelCurrent;
    typeIn('Galvanometer current in mA', r6(l.igMilli));
    click(l.bToD ? 'Current flows from B to D' : 'Current flows from D to B');
    click('Check the bridge');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/junction rule/);
  });
  it('the wrong direction is flagged under the direction only; a missing choice is free', () => {
    const l = start(2, 4) as LevelCurrent;
    typeIn('Galvanometer current in mA', r6(l.igMilli));
    click('Check the bridge');
    expect(feedback()).toMatch(/Choose the direction/);
    expect(feedback()).toMatch(/does not cost/);
    click(l.bToD ? 'Current flows from D to B' : 'Current flows from B to D');
    click('Check the bridge');
    expect(feedback()).toMatch(/direction is not right/);
    expect(feedback()).not.toMatch(/galvanometer current is not right/);
  });
  it('amperes instead of mA is flagged under the current', () => {
    const l = start(2, 4) as LevelCurrent;
    typeIn('Galvanometer current in mA', r6(l.igMilli / 1000));
    click(l.bToD ? 'Current flows from B to D' : 'Current flows from D to B');
    click('Check the bridge');
    expect(feedback()).toMatch(/galvanometer current is not right/);
  });
});

describe('level 3: the meter bridge', () => {
  it('X and the swapped length win', () => {
    const l = start(3, 5) as LevelMeter;
    const sl = root.querySelector('input[aria-label="Jockey position in cm"]') as HTMLInputElement;
    sl.value = String(l.l);
    sl.dispatchEvent(new Event('input', { bubbles: true }));
    typeIn('Unknown resistance in Ω', r6(l.x));
    typeIn('Balance length after swapping in cm', r6(l.swapped));
    click('Check the meter bridge');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('an unchanged balance length is flagged under the swap only', () => {
    const l = start(3, seedFor(3, (x) => (x as LevelMeter).l !== 50)) as LevelMeter;
    typeIn('Unknown resistance in Ω', r6(l.x));
    typeIn('Balance length after swapping in cm', r6(l.l));
    click('Check the meter bridge');
    expect(feedback()).toMatch(/new balance length is not right/);
    expect(feedback()).not.toMatch(/unknown resistance is not right/);
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
