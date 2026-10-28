// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch07-alternating-current/reactance-lab/index';
import { buildLevel, type Level, type LevelCapacitor, type LevelFrequency, type LevelInductor, type LevelPower } from '../src/games/physics/class-12/ch07-alternating-current/reactance-lab/logic';
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
  const m = manifest('rx');
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

describe('level 1: the inductor', () => {
  it('reactance and current win; the wave animation runs (phase testing)', () => {
    const l = start(1, 4) as LevelInductor;
    typeIn('Inductive reactance in Ω', r6(l.x));
    typeIn('Rms current in A', r6(l.i));
    click('Switch on the source');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/X_L = ωL/);
  });
  it('ω taken as f is flagged under the reactance only', () => {
    const l = start(1, 4) as LevelInductor;
    typeIn('Inductive reactance in Ω', r6(l.x / (2 * Math.PI)));
    typeIn('Rms current in A', r6(l.i));
    click('Switch on the source');
    expect(feedback()).toMatch(/reactance is not right/);
    expect(feedback()).not.toMatch(/current is not right/);
  });
});

describe('level 2: the capacitor', () => {
  it('reactance and current win', () => {
    const l = start(2, 5) as LevelCapacitor;
    typeIn('Capacitive reactance in Ω', r6(l.x));
    typeIn('Rms current in A', r6(l.i));
    click('Switch on the source');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 3: change the frequency', () => {
  it('the new reactance and the brightness win; the wrong brightness is flagged under the brightness', () => {
    const l = start(3, 6) as LevelFrequency;
    typeIn('Reactance at the new frequency in Ω', r6(l.x2));
    click(l.glow === 'brighter' ? 'The lamp glows dimmer' : 'The lamp glows brighter');
    click('Change the frequency');
    expect(feedback()).toMatch(/brightness is not right/);
    expect(feedback()).not.toMatch(/new reactance is not right/);
    advance(RUN);
    click(l.glow === 'brighter' ? 'The lamp glows brighter' : 'The lamp glows dimmer');
    click('Change the frequency');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 4: no net power', () => {
  it('zero power and the right lead win; a non-zero power is flagged under the power', () => {
    const l = start(4, 3) as LevelPower;
    typeIn('Average power in W', r6(l.v * l.i));
    click(l.lead === 'lags' ? 'The current lags the voltage' : 'The current leads the voltage');
    click('Run the cycle');
    expect(feedback()).toMatch(/net power is not right/);
    expect(feedback()).not.toMatch(/lag or lead is not right/);
    advance(RUN);
    typeIn('Average power in W', '0');
    click('Run the cycle');
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
