// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch03-current-electricity/heating-wire/index';
import { buildLevel, hotAnswer, type Level, type LevelBill, type LevelHot, type LevelRated, type LevelThermo, type LevelToaster } from '../src/games/physics/class-12/ch03-current-electricity/heating-wire/logic';
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
  const m = manifest('hw');
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

describe('level 1: hot and cold', () => {
  it('forward mode: R₂ wins; the cold resistance is a miss that does not give the answer', () => {
    const l = start(1, seedFor(1, (x) => (x as LevelHot).mode === 'forward')) as LevelHot;
    typeIn('Resistance at the higher temperature in Ω', r6(l.r1));
    click('Heat the resistor');
    expect(feedback()).toMatch(/not the resistance at the higher temperature/);
    expect(feedback()).not.toContain(r6(l.r2));
    advance(RUN);
    typeIn('Resistance at the higher temperature in Ω', r6(l.r2));
    click('Heat the resistor');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/R₂ = R₁/);
  });
  it('inverse mode: T₂ wins, and the element heats up (phase testing)', () => {
    const l = start(1, seedFor(1, (x) => (x as LevelHot).mode === 'inverse')) as LevelHot;
    typeIn('Steady temperature in °C', r6(hotAnswer(l)));
    click('Switch on the element');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('rejects a non-positive value for free', () => {
    start(1, 4);
    for (const b of ['Heat the resistor', 'Switch on the element']) {
      const btnEl = btn(b);
      if (!btnEl) continue;
      btnEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(feedback()).toMatch(/does not cost/);
    }
  });
});

describe('level 2: the toaster', () => {
  const go = (t: number, p: number) => {
    typeIn('Steady temperature in °C', r6(t));
    typeIn('Steady power in W', r6(p));
    click('Switch on the toaster');
    advance(RUN);
  };
  it('the steady temperature and power win', () => {
    const l = start(2, 5) as LevelToaster;
    go(l.tSteady, l.pSteady);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/P = VI/);
  });
  it('the switch-on power is flagged under the power only', () => {
    const l = start(2, 5) as LevelToaster;
    go(l.tSteady, l.pStart);
    expect(feedback()).toMatch(/steady power is not right/);
    expect(feedback()).not.toMatch(/steady temperature is not right/);
  });
});

describe('level 3: the platinum thermometer', () => {
  it('t and α win', () => {
    const l = start(3, 6) as LevelThermo;
    typeIn('Temperature of the bath in °C', r6(l.tBath));
    typeIn('Temperature coefficient in 10⁻³ per °C', r6(l.alpha3));
    click('Dip the thermometer');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('α in the wrong power of ten is flagged under α only', () => {
    const l = start(3, 6) as LevelThermo;
    typeIn('Temperature of the bath in °C', r6(l.tBath));
    typeIn('Temperature coefficient in 10⁻³ per °C', r6(l.alpha3 * 1000));
    click('Dip the thermometer');
    expect(feedback()).toMatch(/coefficient is not right/);
    expect(feedback()).not.toMatch(/bath temperature is not right/);
  });
});

describe('level 4: a weak supply', () => {
  it('R = V²/P and the squared fall in power win; linear scaling is flagged', () => {
    const l = start(4, 3) as LevelRated;
    typeIn('Resistance of the element in Ω', r6(l.r));
    typeIn('Power at the lower voltage in W', r6(l.pRated * (l.vNew / l.vRated)));
    click('Check the heater');
    expect(feedback()).toMatch(/lower voltage is not right/);
    advance(RUN);
    typeIn('Power at the lower voltage in W', r6(l.pNew));
    click('Check the heater');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 5: the electricity bill', () => {
  it('kWh and cost win; watt-hours are flagged', () => {
    const l = start(5, 2) as LevelBill;
    typeIn('Energy used in kWh', r6(l.kwh * 1000));
    typeIn('Cost of the energy', r6(l.cost));
    click('Read the meter');
    expect(feedback()).toMatch(/kilowatt-hour/);
    advance(RUN);
    typeIn('Energy used in kWh', r6(l.kwh));
    click('Read the meter');
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
