// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch07-alternating-current/phasor-bench/index';
import { buildLevel, type Level, type LevelBulb, type LevelConvert, type LevelCycle, type LevelInstant } from '../src/games/physics/class-12/ch07-alternating-current/phasor-bench/logic';
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
  const m = manifest('ph');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop?.();
  stop = game.mount(ctx);
  return buildLevel(level, createRng(seed)) as Level;
}
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

describe('level 1: a rated bulb', () => {
  it('R, peak and rms current win; the animation runs (phase testing)', () => {
    const l = start(1, 4) as LevelBulb;
    typeIn('Resistance in Ω', r6(l.r));
    typeIn('Peak voltage in V', r6(l.vm));
    typeIn('Rms current in A', r6(l.i));
    click('Light the bulb');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/rated voltage is the rms/);
  });
  it('the peak given as the rms voltage is flagged under the peak only', () => {
    const l = start(1, 4) as LevelBulb;
    typeIn('Resistance in Ω', r6(l.r));
    typeIn('Peak voltage in V', r6(l.v));
    typeIn('Rms current in A', r6(l.i));
    click('Light the bulb');
    expect(feedback()).toMatch(/peak voltage is not right/);
    expect(feedback()).not.toMatch(/resistance is not right/);
  });
});

describe('level 2: rms and peak', () => {
  it('both conversions win', () => {
    const l = start(2, 5) as LevelConvert;
    typeIn('Rms voltage in V', r6(l.vRms));
    typeIn('Peak current in A', r6(l.iPeak));
    click('Convert');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('a wrong rms voltage does not give the answer', () => {
    const l = start(2, 5) as LevelConvert;
    typeIn('Rms voltage in V', r6(l.vm));
    typeIn('Peak current in A', r6(l.iPeak));
    click('Convert');
    expect(feedback()).toMatch(/rms voltage is not right/);
    expect(feedback()).not.toContain(r6(l.vRms));
  });
});

describe('level 3: power over a cycle', () => {
  it('current, average and peak power win; swapped powers are flagged', () => {
    const l = start(3, 6) as LevelCycle;
    typeIn('Rms current in A', r6(l.i));
    typeIn('Average power in W', r6(l.pPeak));
    typeIn('Peak power in W', r6(l.pAvg));
    click('Run the cycle');
    expect(feedback()).toMatch(/average power is not right/);
    expect(feedback()).toMatch(/peak power is not right/);
    advance(RUN);
    typeIn('Average power in W', r6(l.pAvg));
    typeIn('Peak power in W', r6(l.pPeak));
    click('Run the cycle');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 4: read the phasor', () => {
  it('the voltage and "in phase" win; the wrong phase is flagged under the phase', () => {
    const l = start(4, 3) as LevelInstant;
    typeIn('Instantaneous voltage in V', r6(l.vNow));
    click('Current lags the voltage');
    click('Read the phasor');
    expect(feedback()).toMatch(/phase is not right/);
    expect(feedback()).not.toMatch(/voltage is not right/);
    advance(RUN);
    click('Current is in phase with the voltage');
    click('Read the phasor');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('needs a phase choice, for free', () => {
    const l = start(4, 3) as LevelInstant;
    typeIn('Instantaneous voltage in V', r6(l.vNow));
    click('Read the phasor');
    expect(feedback()).toMatch(/Choose how the current/);
    expect(feedback()).toMatch(/does not cost/);
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
