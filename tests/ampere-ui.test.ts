// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/ampere-lab/index';
import { buildLevel, wireFieldDir, type Dir, type Level, type LevelNeutral, type LevelSolenoid, type LevelThick, type LevelToroid, type LevelWire } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/ampere-lab/logic';
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
  const m = manifest('am');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 5, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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

describe('level 1: a long wire', () => {
  it('B and the direction win; the reversed direction is flagged under the direction', () => {
    const l = start(1, 4) as LevelWire;
    typeIn('Field in µT', r6(l.ut));
    click(`Field points ${wireFieldDir(l.pos, !l.currentOut)}`);
    click('Measure the field');
    expect(feedback()).toMatch(/direction is not right/);
    expect(feedback()).not.toMatch(/size is not right/);
    advance(RUN);
    click(`Field points ${l.dir as Dir}`);
    click('Measure the field');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/Ampère's law/);
  });
  it('needs a direction, for free', () => {
    const l = start(1, 4) as LevelWire;
    typeIn('Field in µT', r6(l.ut));
    click('Measure the field');
    expect(feedback()).toMatch(/Choose the direction/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 2: inside the wire', () => {
  it('both fields win; the surface formula inside is flagged under the inside field', () => {
    const l = start(2, 5) as LevelThick;
    typeIn('Field inside the wire in µT', r6(l.inUt * 3));
    typeIn('Field outside the wire in µT', r6(l.outUt));
    click('Measure the field');
    expect(feedback()).toMatch(/inside is not right/);
    expect(feedback()).not.toMatch(/outside is not right/);
    advance(RUN);
    typeIn('Field inside the wire in µT', r6(l.inUt));
    click('Measure the field');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 3: the null point', () => {
  it('the probe must be moved first, for free', () => {
    const l = start(3, 4) as LevelNeutral;
    typeIn('Distance from wire 1 in cm', r6(l.xCm));
    click('Check the null point');
    expect(feedback()).toMatch(/Move the probe/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('after moving the probe, the neutral point wins; the midpoint is a miss unless it is the answer', () => {
    for (const same of [true, false]) {
      wins = [];
      let seed = 1;
      while ((buildLevel(3, createRng(seed)) as LevelNeutral).same !== same) seed++;
      const l = start(3, seed) as LevelNeutral;
      const sl = root.querySelector('input[aria-label="Probe position in cm"]') as HTMLInputElement;
      sl.value = String(l.xCm);
      sl.dispatchEvent(new Event('input', { bubbles: true }));
      typeIn('Distance from wire 1 in cm', r6(l.xCm));
      click('Check the null point');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
    expect($('.solution')?.textContent).toMatch(/cancel/);
  });
});

describe('level 4: the solenoid', () => {
  it('n and B win; the total turns for n is flagged under n', () => {
    const l = start(4, seedForSolenoid()) as LevelSolenoid;
    typeIn('Turns per metre', r6(l.layers * l.perLayer));
    typeIn('Field in mT', r6(l.mt));
    click('Measure the field');
    expect(feedback()).toMatch(/turns per metre are not right/);
    advance(RUN);
    typeIn('Turns per metre', r6(l.n));
    click('Measure the field');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});
function seedForSolenoid() {
  for (let s = 1; s < 600; s++) if ((buildLevel(4, createRng(s)) as LevelSolenoid).lCm !== 100) return s;
  throw new Error('no seed');
}

describe('level 5: the toroid', () => {
  it('B in the winding and "zero" in the hole win; "same" is a miss', () => {
    const l = start(5, 3) as LevelToroid;
    typeIn('Field in the winding in mT', r6(l.mt));
    click('Field in the hole is the same as in the winding');
    click('Measure the field');
    expect(feedback()).toMatch(/circle in the hole/);
    advance(RUN);
    click('Field in the hole is zero');
    click('Measure the field');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/confined to the winding/);
  });
  it('needs a choice for the hole, for free', () => {
    const l = start(5, 3) as LevelToroid;
    typeIn('Field in the winding in mT', r6(l.mt));
    click('Measure the field');
    expect(feedback()).toMatch(/Choose what the field is/);
    expect(feedback()).toMatch(/does not cost/);
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
