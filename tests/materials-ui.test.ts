// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch05-magnetism-and-matter/materials-lab/index';
import { buildLevel, type Level, type LevelChi, type LevelCore, type LevelCurie, type LevelPick } from '../src/games/physics/class-12/ch05-magnetism-and-matter/materials-lab/logic';
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
  const m = manifest('ml');
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
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const RUN = 4;

describe('level 1: a filled solenoid', () => {
  it('H, M and B win; the core dipoles line up (phase testing)', () => {
    const l = start(1, 4) as LevelCore;
    typeIn('Magnetic intensity H in A/m', r6(l.h));
    typeIn('Magnetisation M in A/m', r6(l.m));
    typeIn('Magnetic field B in T', r6(l.b));
    click('Measure the core');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/μ₀μᵣH/);
  });
  it('M taken equal to H is flagged under M only', () => {
    const l = start(1, 4) as LevelCore;
    typeIn('Magnetic intensity H in A/m', r6(l.h));
    typeIn('Magnetisation M in A/m', r6(l.h));
    typeIn('Magnetic field B in T', r6(l.b));
    click('Measure the core');
    expect(feedback()).toMatch(/M is not right/);
    expect(feedback()).not.toMatch(/B is not right/);
  });
});

describe('level 2: which kind', () => {
  it('χ and the kind win; the wrong kind is flagged under the kind', () => {
    const l = start(2, 5) as LevelChi;
    typeIn('Susceptibility χ', r6(l.chiUnits));
    click(l.type === 'diamagnetic' ? 'Paramagnetic' : 'Diamagnetic');
    click('Classify the material');
    expect(feedback()).toMatch(/kind is not right/);
    expect(feedback()).not.toMatch(/susceptibility is not right/);
    advance(RUN);
    click(cap(l.type));
    click('Classify the material');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('needs a kind, for free', () => {
    const l = start(2, 5) as LevelChi;
    typeIn('Susceptibility χ', r6(l.chiUnits));
    click('Classify the material');
    expect(feedback()).toMatch(/Choose the kind/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: hot and cold', () => {
  it('Curie law wins; the inverted ratio is a miss', () => {
    const l = start(3, 6) as LevelCurie;
    typeIn('Susceptibility at the new temperature in 10⁻⁵', r6((l.chi1 * l.t2) / l.t1));
    click('Change the temperature');
    expect(feedback()).toMatch(/not the susceptibility/);
    advance(RUN);
    typeIn('Susceptibility at the new temperature in 10⁻⁵', r6(l.chi2));
    click('Change the temperature');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/Curie/);
  });
});

describe('level 4: near a magnet', () => {
  it('the right picks win; a swapped pair is flagged', () => {
    const l = start(4, 3) as LevelPick;
    click(`Repelled: ${l.strong}`);
    click(`Weakly attracted: ${l.weak}`);
    click(`Strongly attracted: ${l.repelled}`);
    click('Bring the magnet near');
    expect(feedback()).toMatch(/repelled sample is not right/);
    advance(RUN);
    click(`Repelled: ${l.repelled}`);
    click(`Strongly attracted: ${l.strong}`);
    click('Bring the magnet near');
    advance(RUN);
    expect(wins).toEqual([3]);
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
