// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch07-alternating-current/lcr-bench/index';
import { buildLevel, type Level, type LevelCoil, type LevelLCR, type LevelRC, type LevelVoltages } from '../src/games/physics/class-12/ch07-alternating-current/lcr-bench/logic';
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
  const m = manifest('lb');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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

describe('level 1: resistor and capacitor', () => {
  it('Z, I and V_C win; R + X for Z is flagged under the impedance only', () => {
    const l = start(1, 4) as LevelRC;
    typeIn('Impedance in Ω', r6(l.r + l.xc));
    typeIn('Rms current in A', r6(l.i));
    typeIn('Rms voltage across the capacitor in V', r6(l.vc));
    click('Switch on the source');
    expect(feedback()).toMatch(/impedance is not right/);
    expect(feedback()).not.toMatch(/capacitor voltage is not right/);
    advance(RUN);
    typeIn('Impedance in Ω', r6(l.z));
    click('Switch on the source');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 2: series LCR', () => {
  it('both leads work; the wrong lead is flagged under the lag/lead only', () => {
    for (const lead of ['lags', 'leads']) {
      wins = [];
      const l = start(2, seedFor(2, (x) => (x as LevelLCR).lead === lead)) as LevelLCR;
      typeIn('Impedance in Ω', r6(l.z));
      typeIn('Phase difference in degrees', r6(l.phase));
      click(lead === 'lags' ? 'The current leads the voltage' : 'The current lags the voltage');
      click('Check the circuit');
      expect(feedback()).toMatch(/lag or lead is not right/);
      expect(feedback()).not.toMatch(/impedance is not right/);
      advance(RUN);
      click(lead === 'lags' ? 'The current lags the voltage' : 'The current leads the voltage');
      click('Check the circuit');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
  });
});

describe('level 3: add the phasors', () => {
  it('the source voltage wins; the arithmetic sum is a miss without the answer', () => {
    const l = start(3, 3) as LevelVoltages;
    typeIn('Source voltage in V', r6(l.vr + l.vl + l.vc));
    click('Add the phasors');
    expect(feedback()).toMatch(/not the source voltage/);
    expect(feedback()).not.toContain(r6(l.source));
    advance(RUN);
    typeIn('Source voltage in V', r6(l.source));
    click('Add the phasors');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/partly cancel/);
  });
});

describe('level 4: a real coil', () => {
  it('Z, I and the power factor win', () => {
    const l = start(4, 2) as LevelCoil;
    typeIn('Impedance in Ω', r6(l.z));
    typeIn('Rms current in A', r6(l.v / l.z));
    typeIn('Power factor', r6(l.pf));
    click('Check the coil');
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
