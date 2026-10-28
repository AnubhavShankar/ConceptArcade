// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch08-electromagnetic-waves/em-wave-bench/index';
import { buildLevel, type Level, type LevelDirection, type LevelEnergy, type LevelEquation, type LevelMagnitude, type LevelQuantities, type LevelWavelength } from '../src/games/physics/class-12/ch08-electromagnetic-waves/em-wave-bench/logic';
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
  const m = manifest('ew');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 6, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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
const RUN = 4;

describe('level 1: E and B', () => {
  it('both modes: the answer wins; the animation runs (phase testing)', () => {
    for (const mode of ['E', 'B']) {
      wins = [];
      const l = start(1, seedFor(1, (x) => (x as LevelMagnitude).mode === mode)) as LevelMagnitude;
      typeIn(mode === 'E' ? 'Electric field amplitude in V/m' : 'Magnetic field in nT', r6(l.answer));
      click('Send the wave');
      advance(1);
      expect(canvas().dataset.phase).toBe('testing');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
  });
});

describe('level 2: which way is B', () => {
  it('the right direction wins; the opposite is flagged without naming it', () => {
    const l = start(2, 4) as LevelDirection;
    const opposite = `${l.b[0] === '+' ? '-' : '+'}${l.b[1]}`;
    click(`B points along ${opposite}`);
    click('Check the direction');
    expect(feedback()).toMatch(/not the direction of B/);
    expect(feedback()).not.toContain(`along ${l.b}`);
    advance(RUN);
    click(`B points along ${l.b}`);
    click('Check the direction');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/transverse/);
  });
  it('needs a direction, for free', () => {
    start(2, 4);
    click('Check the direction');
    expect(feedback()).toMatch(/Choose a direction/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: wavelengths', () => {
  it('both wavelengths win', () => {
    const l = start(3, 5) as LevelWavelength;
    typeIn('Wavelength for the first frequency in m', r6(l.l1));
    typeIn('Wavelength for the second frequency in m', r6(l.l2));
    click('Tune the radio');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 4: a plane wave', () => {
  it('B₀, k and λ win; ω for k is flagged under k only', () => {
    const l = start(4, 6) as LevelQuantities;
    typeIn('Magnetic field amplitude in nT', r6(l.b0Nano));
    typeIn('Wave number in rad/m', r6(2 * Math.PI * l.fMHz * 1e6));
    typeIn('Wavelength in m', r6(l.lambda));
    click('Send the wave');
    expect(feedback()).toMatch(/wave number is not right/);
    expect(feedback()).not.toMatch(/wavelength is not right/);
    advance(RUN);
    typeIn('Wave number in rad/m', r6(l.k));
    click('Send the wave');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 5: read the equation', () => {
  it('λ, f and E₀ win', () => {
    const l = start(5, 2) as LevelEquation;
    typeIn('Wavelength in cm', r6(l.lambdaCm));
    typeIn('Frequency in GHz', r6(l.fGHz));
    typeIn('Electric field amplitude in V/m', r6(l.e0));
    click('Read the equation');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 6: energy in the fields', () => {
  it('λ, B₀, u_B and "equal" win; "electric larger" is flagged under the comparison', () => {
    const l = start(6, 3) as LevelEnergy;
    typeIn('Wavelength in cm', r6(l.lambdaCm));
    typeIn('Magnetic field amplitude in nT', r6(l.b0Nano));
    typeIn('Average magnetic energy density in nJ/m³', r6(l.uNano));
    click('The electric energy density is larger');
    click('Measure the wave');
    expect(feedback()).toMatch(/Think again about the comparison/);
    expect(feedback()).not.toMatch(/wavelength is not right/);
    advance(RUN);
    click('The electric and magnetic energy densities are equal');
    click('Measure the wave');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/equal energy/);
  });
});

describe('robustness', () => {
  it('every level mounts and animates without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4, 5, 6]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      advance(0.8);
      expect(canvas().dataset.phase).toBe('idle');
    }
    expect(err).not.toHaveBeenCalled();
  });
});
