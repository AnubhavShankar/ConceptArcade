// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-bench/index';
import { buildLevel, correctEnds, northAtLeft, type Level, type LevelCut, type LevelMatch, type LevelSolenoid } from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-bench/logic';
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
  const m = manifest('mg');
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
/** Click an end button until it shows the wanted label. */
const setEnd = (name: string, want: 'N' | 'S') => {
  for (let k = 0; k < 3; k++) {
    if (btn(name)!.textContent!.endsWith(`: ${want}`)) return;
    click(name);
  }
};

describe('level 1: cut the magnet', () => {
  it('every end must be labelled first, for free', () => {
    start(1, 4);
    click('Check the poles');
    expect(feedback()).toMatch(/Label every end/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the right labels win; a flipped piece is flagged without giving the answer', () => {
    const l = start(1, 4) as LevelCut;
    const truth = correctEnds(l);
    // first a wrong attempt: flip piece 1
    truth.forEach((t, p) => {
      setEnd(`Piece ${p + 1}, left end`, p === 0 ? (t[0] === 'N' ? 'S' : 'N') : t[0]);
      setEnd(`Piece ${p + 1}, right end`, p === 0 ? (t[1] === 'N' ? 'S' : 'N') : t[1]);
    });
    click('Check the poles');
    expect(feedback()).toMatch(/Piece 1 is not labelled correctly/);
    advance(RUN);
    setEnd('Piece 1, left end', truth[0][0]);
    setEnd('Piece 1, right end', truth[0][1]);
    click('Check the poles');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/complete magnet/);
  });
});

describe('level 2: a solenoid is a magnet', () => {
  it('the moment and the pole win; the wrong end is flagged under the pole', () => {
    const l = start(2, 5) as LevelSolenoid;
    typeIn('Magnetic moment in J/T', r6(l.m));
    click(northAtLeft(l.frontUp) ? 'North pole at the right end' : 'North pole at the left end');
    click('Check the solenoid');
    expect(feedback()).toMatch(/pole is not right/);
    expect(feedback()).not.toMatch(/moment is not right/);
    advance(RUN);
    click(northAtLeft(l.frontUp) ? 'North pole at the left end' : 'North pole at the right end');
    click('Check the solenoid');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('needs a pole choice, for free', () => {
    const l = start(2, 5) as LevelSolenoid;
    typeIn('Magnetic moment in J/T', r6(l.m));
    click('Check the solenoid');
    expect(feedback()).toMatch(/Choose which end/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: match the magnet', () => {
  it('the current wins; a too-small current says the solenoid is weaker', () => {
    const l = start(3, 6) as LevelMatch;
    typeIn('Current in A', r6(l.i / 2));
    click('Switch on the solenoid');
    expect(feedback()).toMatch(/weaker magnet/);
    advance(RUN);
    typeIn('Current in A', r6(l.i));
    click('Switch on the solenoid');
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
