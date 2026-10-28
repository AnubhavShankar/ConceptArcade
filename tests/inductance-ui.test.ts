// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch06-electromagnetic-induction/inductance-bench/index';
import { buildLevel, type Level, type LevelConcentric, type LevelDensity, type LevelMutual, type LevelSelf, type LevelSolenoid } from '../src/games/physics/class-12/ch06-electromagnetic-induction/inductance-bench/logic';
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
  const m = manifest('ib');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 5, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop?.();
  stop = game.mount(ctx);
  return buildLevel(level, createRng(seed)) as Level;
}
const seedFor = (level: number, ok: (l: Level) => boolean) => {
  for (let s = 1; s < 600; s++) if (ok(buildLevel(level, createRng(s)))) return s;
  throw new Error('no seed');
};
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

describe('level 1: self-inductance', () => {
  it('both modes: the answer wins and the animation runs (phase testing)', () => {
    for (const mode of ['L', 'emf']) {
      wins = [];
      const l = start(1, seedFor(1, (x) => (x as LevelSelf).mode === mode)) as LevelSelf;
      typeIn(mode === 'L' ? 'Self-inductance in H' : 'Induced emf in V', r6(l.answer));
      click('Change the current');
      advance(1);
      expect(canvas().dataset.phase).toBe('testing');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
  });
});

describe('level 2: mutual inductance', () => {
  it('flux linkage and emf win; the linkage given as the emf is flagged under the emf', () => {
    const l = start(2, seedFor(2, (x) => (x as LevelMutual).dt !== 1)) as LevelMutual;
    typeIn('Change in flux linkage in Wb', r6(l.linkage));
    typeIn('Average emf in V', r6(l.linkage));
    click('Change the current');
    expect(feedback()).toMatch(/emf is not right/);
    expect(feedback()).not.toMatch(/flux linkage change is not right/);
    advance(RUN);
    typeIn('Average emf in V', r6(l.emf));
    click('Change the current');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 3: solenoid and energy', () => {
  it('L and U win', () => {
    const l = start(3, 6) as LevelSolenoid;
    typeIn('Self-inductance in mH', r6(l.mH));
    typeIn('Stored energy in mJ', r6(l.mJ));
    click('Switch on the current');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/½LI²/);
  });
  it('the energy without the half is flagged under the energy', () => {
    const l = start(3, 6) as LevelSolenoid;
    typeIn('Self-inductance in mH', r6(l.mH));
    typeIn('Stored energy in mJ', r6(l.mJ * 2));
    click('Switch on the current');
    expect(feedback()).toMatch(/energy is not right/);
    expect(feedback()).not.toMatch(/inductance is not right/);
  });
});

describe('level 4: concentric coils', () => {
  it('M wins; a wrong value does not give the answer', () => {
    const l = start(4, 3) as LevelConcentric;
    typeIn('Mutual inductance in nH', r6(l.nH * 4));
    click('Measure the pair');
    expect(feedback()).toMatch(/not the mutual inductance/);
    expect(feedback()).not.toContain(r6(l.nH));
    advance(RUN);
    typeIn('Mutual inductance in nH', r6(l.nH));
    click('Measure the pair');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 5: energy in a field', () => {
  it('density and energy win', () => {
    const l = start(5, 2) as LevelDensity;
    typeIn('Energy density in J/m³', r6(l.u));
    typeIn('Energy in the volume in mJ', r6(l.mJ));
    click('Measure the field');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('robustness', () => {
  it('every level mounts and animates without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4, 5]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      advance(0.8);
      expect(canvas().dataset.phase).toBe('idle');
    }
    expect(err).not.toHaveBeenCalled();
  });
});
