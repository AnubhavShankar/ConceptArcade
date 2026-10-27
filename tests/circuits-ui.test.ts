// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-circuits/index';
import { buildLevel, type Level, type LevelEnergy, type LevelMixed, type LevelParallel, type LevelSeries, type LevelShare } from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-circuits/logic';
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
  const m = manifest('cc');
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

describe('level 1: in a chain', () => {
  const go = (c: number, v: number) => {
    typeIn('Capacitance of the chain in pF', r6(c));
    typeIn('Voltage across the ringed capacitor in V', r6(v));
    click('Check the chain');
    advance(RUN);
  };
  it('the series rules win and the physics is explained', () => {
    const l = start(1, 4) as LevelSeries;
    go(l.ceq, l.vTarget);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/1\/C = 1\/C₁/);
  });
  it('adding the capacitances is caught under the capacitance, without giving the answer', () => {
    const l = start(1, 4) as LevelSeries;
    go(l.cs.reduce((a, b) => a + b, 0), l.vTarget);
    expect(feedback()).toMatch(/capacitance of the chain is not right/);
    expect(feedback()).not.toMatch(/voltage across the ringed/);
    expect(feedback()).not.toContain(r6(l.ceq));
  });
  it('needs both answers, for free', () => {
    start(1, 4);
    click('Check the chain');
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 2: side by side', () => {
  it('the sum and Q = CV of the ringed capacitor win; the total charge is caught', () => {
    const l = start(2, 6) as LevelParallel;
    typeIn('Capacitance of the combination in pF', r6(l.ceq));
    typeIn('Charge on the ringed capacitor in nC', r6((l.ceq * l.v) / 1000));
    click('Check the combination');
    expect(feedback()).toMatch(/charge is not right/);
    advance(RUN);
    typeIn('Charge on the ringed capacitor in nC', r6(l.qTarget));
    click('Check the combination');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 3: a mixed network', () => {
  it('both topologies mount, and the equivalent capacitance and total charge win', () => {
    for (const top of ['c1-series-with-pair', 'c1-parallel-with-chain']) {
      let seed = 1;
      while ((buildLevel(3, createRng(seed)) as LevelMixed).topology !== top) seed++;
      wins = [];
      const l = start(3, seed) as LevelMixed;
      typeIn('Capacitance of the network in pF', r6(l.ceq));
      typeIn('Total charge supplied in nC', r6(l.q));
      click('Check the network');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
  });
});

describe('level 4: energy in the field', () => {
  const run = (u: number, choice: string) => {
    typeIn('Energy stored in nJ', r6(u));
    if (choice) click(choice);
    click('Check the energy');
  };
  it('½CV² and ×4 win, and the bar animates (phase testing)', () => {
    const l = start(4, 3) as LevelEnergy;
    run(l.u, 'Energy ×4');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('needs a choice for free, and a wrong factor does not give the answer', () => {
    const l = start(4, 3) as LevelEnergy;
    run(l.u, '');
    expect(feedback()).toMatch(/Choose what happens/);
    expect(feedback()).toMatch(/does not cost/);
    click('Energy ×2');
    click('Check the energy');
    expect(feedback()).toMatch(/depends on the voltage/);
    expect(feedback()).not.toMatch(/square|×4|four/);
  });
});

describe('level 5: the lost energy', () => {
  it('the common voltage, the loss and "heat" win', () => {
    const l = start(5, 2) as LevelShare;
    typeIn('Common voltage in V', r6(l.v2));
    typeIn('Energy lost in µJ', r6(l.lost));
    click('Dissipated as heat and radiation');
    click('Close the switch');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/dissipated/);
  });
  it('"it vanishes" is a miss that points to resistance in the wires', () => {
    const l = start(5, 2) as LevelShare;
    typeIn('Common voltage in V', r6(l.v2));
    typeIn('Energy lost in µJ', r6(l.lost));
    click('Destroyed, it just vanishes');
    click('Close the switch');
    expect(feedback()).toMatch(/resistance/);
    expect(feedback()).toMatch(/free tests left|cost a star/);
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
