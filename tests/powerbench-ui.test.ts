// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch07-alternating-current/power-bench/index';
import { buildLevel, type Level, type LevelCircuit, type LevelCorrect, type LevelLoss, type LevelPhase, type LevelTransformer } from '../src/games/physics/class-12/ch07-alternating-current/power-bench/logic';
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
  const m = manifest('pw');
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
const RUN = 4;

describe('level 1: power and phase', () => {
  it('P and the wattless current win; V I for the power is flagged under the power only', () => {
    const l = start(1, 4) as LevelPhase;
    typeIn('Average power in W', r6(l.v * l.i));
    typeIn('Wattless current in A', r6(l.iq));
    click('Run the circuit');
    expect(feedback()).toMatch(/power is not right/);
    expect(feedback()).not.toMatch(/wattless current is not right/);
    advance(RUN);
    typeIn('Average power in W', r6(l.p));
    click('Run the circuit');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 2: power in a circuit', () => {
  it('P and the power factor win', () => {
    const l = start(2, 5) as LevelCircuit;
    typeIn('Power dissipated in W', r6(l.p));
    typeIn('Power factor', r6(l.pf));
    click('Run the circuit');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/P = I²R/);
  });
});

describe('level 3: correct the power factor', () => {
  it('C and the reduced supply current win; the uncorrected current is flagged under the current', () => {
    const l = start(3, 6) as LevelCorrect;
    typeIn('Capacitance in µF', r6(l.cMicroF));
    typeIn('Supply current after correction in A', r6(l.iOld));
    click('Add the capacitor');
    expect(feedback()).toMatch(/supply current is not right/);
    expect(feedback()).not.toMatch(/capacitance is not right/);
    advance(RUN);
    typeIn('Supply current after correction in A', r6(l.iNew));
    click('Add the capacitor');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 4: the transformer', () => {
  it('both kinds work; the wrong type is flagged under the type only', () => {
    for (const type of ['step-up', 'step-down']) {
      wins = [];
      const l = start(4, seedFor(4, (x) => (x as LevelTransformer).type === type)) as LevelTransformer;
      typeIn('Secondary voltage in V', r6(l.vs));
      typeIn('Secondary current in A', r6(l.is));
      click(type === 'step-up' ? 'Step-down transformer' : 'Step-up transformer');
      click('Switch on the transformer');
      expect(feedback()).toMatch(/Step-up or step-down is not right/);
      expect(feedback()).not.toMatch(/secondary voltage is not right/);
      advance(RUN);
      click(type === 'step-up' ? 'Step-up transformer' : 'Step-down transformer');
      click('Switch on the transformer');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
  });
});

describe('level 5: power lines', () => {
  it('both losses win; the same loss twice is flagged under the second', () => {
    const l = start(5, 3) as LevelLoss;
    typeIn('Power lost at the low voltage in W', r6(l.loss1));
    typeIn('Power lost after stepping up in W', r6(l.loss1));
    click('Send the power');
    expect(feedback()).toMatch(/second loss is not right/);
    expect(feedback()).not.toMatch(/first loss is not right/);
    advance(RUN);
    typeIn('Power lost after stepping up in W', r6(l.loss2));
    click('Send the power');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/high voltage/);
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
