// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch08-electromagnetic-waves/displacement-bench/index';
import { buildLevel, type Level, type LevelAc, type LevelCharge, type LevelDisplacement } from '../src/games/physics/class-12/ch08-electromagnetic-waves/displacement-bench/logic';
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
  const m = manifest('db');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 3, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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

describe('level 1: charging a capacitor', () => {
  it('C and dV/dt win; the animation runs (phase testing)', () => {
    const l = start(1, 4) as LevelCharge;
    typeIn('Capacitance in pF', r6(l.cPF));
    typeIn('Rate of change of the potential difference in V/s', r6(l.rate));
    click('Charge the capacitor');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('a wrong capacitance is flagged under C only', () => {
    const l = start(1, 4) as LevelCharge;
    typeIn('Capacitance in pF', r6(l.cPF * 4));
    typeIn('Rate of change of the potential difference in V/s', r6(l.rate));
    click('Charge the capacitor');
    expect(feedback()).toMatch(/capacitance is not right/);
    expect(feedback()).not.toMatch(/rate is not right/);
  });
});

describe('level 2: displacement current', () => {
  it('I_d and "holds" win; "fails" is flagged under the rule only', () => {
    const l = start(2, 5) as LevelDisplacement;
    typeIn('Displacement current in A', r6(l.id));
    click('The junction rule fails at the plate');
    click('Check the gap');
    expect(feedback()).toMatch(/Think again about the rule/);
    expect(feedback()).not.toMatch(/displacement current is not right/);
    advance(RUN);
    click('The junction rule holds with the displacement current');
    click('Check the gap');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/junction rule/);
  });
  it('needs the rule chosen, for free', () => {
    const l = start(2, 5) as LevelDisplacement;
    typeIn('Displacement current in A', r6(l.id));
    click('Check the gap');
    expect(feedback()).toMatch(/Choose whether/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: an AC capacitor', () => {
  it('the rms current and the field amplitude win; the rms value for the peak is flagged under the field', () => {
    const l = start(3, 6) as LevelAc;
    typeIn('Rms conduction current in µA', r6(l.iRmsMicro));
    typeIn('Amplitude of the magnetic field in pT', r6(l.bPico / Math.SQRT2));
    click('Switch on the supply');
    expect(feedback()).toMatch(/field is not right/);
    expect(feedback()).not.toMatch(/current is not right/);
    advance(RUN);
    typeIn('Amplitude of the magnetic field in pT', r6(l.bPico));
    click('Switch on the supply');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('robustness', () => {
  it('every level mounts and animates without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      advance(0.8);
      expect(canvas().dataset.phase).toBe('idle');
    }
    expect(err).not.toHaveBeenCalled();
  });
});
