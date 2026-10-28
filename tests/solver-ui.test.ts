// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch03-current-electricity/circuit-solver/index';
import { buildLevel, type Level, type LevelCube, type LevelJunction, type LevelLoop, type LevelReduce, type LevelTwoLoop } from '../src/games/physics/class-12/ch03-current-electricity/circuit-solver/logic';
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
  const m = manifest('cs');
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

describe('level 1: reduce the network', () => {
  it('both topologies: R and V₁ win', () => {
    for (const top of ['r1-series-with-pair', 'r1-parallel-with-chain']) {
      wins = [];
      const l = start(1, seedFor(1, (x) => (x as LevelReduce).topology === top)) as LevelReduce;
      typeIn('Resistance of the network in Ω', r6(l.req));
      typeIn('Voltage across the ringed resistor in V', r6(l.vR1));
      click('Check the network');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
    expect($('.solution')?.textContent).toMatch(/R₂₃/);
  });
  it('a wrong resistance is flagged under the resistance only', () => {
    const l = start(1, 4) as LevelReduce;
    typeIn('Resistance of the network in Ω', r6(l.req * 3));
    typeIn('Voltage across the ringed resistor in V', r6(l.vR1));
    click('Check the network');
    expect(feedback()).toMatch(/resistance of the network is not right/);
    expect(feedback()).not.toMatch(/voltage across R₁/);
  });
});

describe('level 2: the junction rule', () => {
  it('the balancing current and its direction win', () => {
    const l = start(2, 4) as LevelJunction;
    typeIn('Fourth current in A', r6(l.fourth));
    click(l.fourthIn ? 'Current flows into the junction' : 'Current flows out of the junction');
    click('Check the junction');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/junction rule/);
  });
  it('the wrong direction is flagged under the direction only; a missing choice is free', () => {
    const l = start(2, 4) as LevelJunction;
    typeIn('Fourth current in A', r6(l.fourth));
    click('Check the junction');
    expect(feedback()).toMatch(/Choose whether/);
    expect(feedback()).toMatch(/does not cost/);
    click(l.fourthIn ? 'Current flows out of the junction' : 'Current flows into the junction');
    click('Check the junction');
    expect(feedback()).toMatch(/direction is not right/);
    expect(feedback()).not.toMatch(/size of the fourth/);
  });
});

describe('level 3: the loop rule', () => {
  it('I, V₁ and the direction win', () => {
    const l = start(3, 5) as LevelLoop;
    typeIn('Current in the loop in A', r6(l.i));
    typeIn('Voltage across the ringed resistor in V', r6(l.vR1));
    click(l.clockwise ? 'Current flows clockwise' : 'Current flows anticlockwise');
    click('Check the loop');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('adding emfs that oppose is caught under the current', () => {
    const l = start(3, seedFor(3, (x) => !(x as LevelLoop).aiding)) as LevelLoop;
    typeIn('Current in the loop in A', r6((l.e1 + l.e2) / (l.r1 + l.r2)));
    typeIn('Voltage across the ringed resistor in V', r6(l.vR1));
    click(l.clockwise ? 'Current flows clockwise' : 'Current flows anticlockwise');
    click('Check the loop');
    expect(feedback()).toMatch(/current is not right/);
    expect(feedback()).toMatch(/difference/);
  });
});

describe('level 4: a two-loop network', () => {
  it('I₁, I₃ and the direction win for both signs', () => {
    for (const sign of [1, -1]) {
      wins = [];
      const l = start(4, seedFor(4, (x) => (x as LevelTwoLoop).sign === sign)) as LevelTwoLoop;
      typeIn('Current from cell 1 in A', r6(Math.abs(l.i1)));
      typeIn('Current in the middle resistor in A', r6(l.i3));
      click(l.down ? 'Middle current flows down' : 'Middle current flows up');
      click('Check the network');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
    expect($('.solution')?.textContent).toMatch(/Three unknowns/);
  });
  it('the wrong direction of the middle current is flagged', () => {
    const l = start(4, 6) as LevelTwoLoop;
    typeIn('Current from cell 1 in A', r6(Math.abs(l.i1)));
    typeIn('Current in the middle resistor in A', r6(l.i3));
    click(l.down ? 'Middle current flows up' : 'Middle current flows down');
    click('Check the network');
    expect(feedback()).toMatch(/direction of the middle current/);
  });
});

describe('level 5: the cube', () => {
  it('5R/6 and the edge current win; the total current as the edge current is flagged', () => {
    const l = start(5, 3) as LevelCube;
    typeIn('Equivalent resistance in Ω', r6(l.req));
    typeIn('Current in each edge at the positive corner in A', r6(l.total));
    click('Check the cube');
    expect(feedback()).toMatch(/edge current is not right/);
    advance(RUN);
    typeIn('Current in each edge at the positive corner in A', r6(l.edge));
    click('Check the cube');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/symmetry/);
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
