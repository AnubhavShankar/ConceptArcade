// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch03-current-electricity/cell-bench/index';
import { buildLevel, type Level, type LevelCharge, type LevelLoad, type LevelMeasure, type LevelParallel, type LevelSeries } from '../src/games/physics/class-12/ch03-current-electricity/cell-bench/logic';
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
  const m = manifest('cl');
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

describe('level 1: a real cell', () => {
  it('current mode: I and V win; giving the emf as the terminal voltage is flagged under V', () => {
    const l = start(1, seedFor(1, (x) => (x as LevelLoad).mode === 'current')) as LevelLoad;
    typeIn('Current in A', r6(l.i));
    typeIn('Terminal voltage in V', r6(l.e));
    click('Connect the cell');
    expect(feedback()).toMatch(/terminal voltage is not right/);
    expect(feedback()).not.toMatch(/current is not right/);
    advance(RUN);
    typeIn('Terminal voltage in V', r6(l.v));
    click('Connect the cell');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/ε/);
  });
  it('resistor mode: R = ε/I − r and V win', () => {
    const l = start(1, seedFor(1, (x) => (x as LevelLoad).mode === 'resistor')) as LevelLoad;
    typeIn('Resistance of the resistor in Ω', r6(l.load));
    typeIn('Terminal voltage in V', r6(l.v));
    click('Connect the cell');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('needs both answers, for free', () => {
    start(1, 4);
    click('Connect the cell');
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 2: hidden resistance', () => {
  it('the cell must be loaded first, for free', () => {
    const l = start(2, 4) as LevelMeasure;
    typeIn('Internal resistance in Ω', r6(l.r));
    typeIn('Maximum current in A', r6(l.iMax));
    click('Check the cell');
    expect(feedback()).toMatch(/Connect a load first/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('after sliding the load, r and the short-circuit current win', () => {
    const l = start(2, 4) as LevelMeasure;
    const slider = root.querySelector('input[aria-label="Load resistance in Ω"]') as HTMLInputElement;
    slider.value = '5';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    typeIn('Internal resistance in Ω', r6(l.r));
    typeIn('Maximum current in A', r6(l.iMax));
    click('Check the cell');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/short-circuited/);
  });
});

describe('level 3: charging a battery', () => {
  const go = (i: number, v: number) => {
    typeIn('Charging current in A', r6(i));
    typeIn('Terminal voltage during charging in V', r6(v));
    click('Start charging');
  };
  it('I, V and the purpose win', () => {
    const l = start(3, 2) as LevelCharge;
    click('To limit the charging current');
    go(l.i, l.v);
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/series resistor limits/);
  });
  it('the discharge formula for V is flagged under V only', () => {
    const l = start(3, 2) as LevelCharge;
    click('To limit the charging current');
    go(l.i, l.e - l.i * l.r);
    expect(feedback()).toMatch(/terminal voltage is not right/);
    expect(feedback()).not.toMatch(/charging current is not right/);
  });
  it('needs the purpose chosen, for free', () => {
    const l = start(3, 2) as LevelCharge;
    go(l.i, l.v);
    expect(feedback()).toMatch(/Choose the purpose/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 4: cells in series', () => {
  it('both orientations: ε and r win', () => {
    for (const aiding of [true, false]) {
      wins = [];
      const l = start(4, seedFor(4, (x) => (x as LevelSeries).aiding === aiding)) as LevelSeries;
      typeIn('Equivalent emf in V', r6(l.e));
      typeIn('Equivalent internal resistance in Ω', r6(l.r));
      click('Combine the cells');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
  });
  it('adding opposing emfs is caught under the emf', () => {
    const l = start(4, seedFor(4, (x) => !(x as LevelSeries).aiding)) as LevelSeries;
    typeIn('Equivalent emf in V', r6(l.e1 + l.e2));
    typeIn('Equivalent internal resistance in Ω', r6(l.r));
    click('Combine the cells');
    expect(feedback()).toMatch(/emf is not right/);
    expect(feedback()).toMatch(/opposite directions/);
  });
});

describe('level 5: cells in parallel', () => {
  it('ε and the current win', () => {
    const l = start(5, 6) as LevelParallel;
    typeIn('Equivalent emf in V', r6(l.e));
    typeIn('Current in the resistor in A', r6(l.i));
    click('Connect the cells');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/ε₁r₂/);
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
