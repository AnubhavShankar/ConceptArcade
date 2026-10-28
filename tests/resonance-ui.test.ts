// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch07-alternating-current/resonance-lab/index';
import { buildLevel, type Level, type LevelAt, type LevelNatural, type LevelQ, type LevelTune, type LevelVolts } from '../src/games/physics/class-12/ch07-alternating-current/resonance-lab/logic';
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
  const m = manifest('rs');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 5, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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

describe('level 1: natural frequency', () => {
  it('ω₀ and f₀ win; ω given as f is flagged under ω only', () => {
    const l = start(1, 4) as LevelNatural;
    typeIn('Angular frequency in rad/s', r6(l.hz));
    typeIn('Frequency in Hz', r6(l.hz));
    click('Let the charge oscillate');
    expect(feedback()).toMatch(/angular frequency is not right/);
    expect(feedback()).not.toMatch(/frequency is not right: it is the angular/);
    advance(RUN);
    typeIn('Angular frequency in rad/s', r6(l.omega));
    click('Let the charge oscillate');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 2: at resonance', () => {
  it('Z, I and P win', () => {
    const l = start(2, 5) as LevelAt;
    typeIn('Impedance in Ω', r6(l.z));
    typeIn('Rms current in A', r6(l.i));
    typeIn('Average power in W', r6(l.p));
    click('Tune to resonance');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/Z = R/);
  });
});

describe('level 3: the voltages', () => {
  it('V_L and zero for the combination win; a non-zero combination is flagged under that', () => {
    const l = start(3, 6) as LevelVolts;
    typeIn('Rms voltage across the inductor in V', r6(l.vl));
    typeIn('Rms voltage across the LC combination in V', r6(l.vl));
    click('Measure the voltages');
    expect(feedback()).toMatch(/combination is not right/);
    expect(feedback()).not.toMatch(/inductor voltage is not right/);
    advance(RUN);
    typeIn('Rms voltage across the LC combination in V', '0');
    click('Measure the voltages');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 4: quality factor', () => {
  it('Q and V_C win; the source voltage for V_C is flagged under the voltage', () => {
    const l = start(4, 3) as LevelQ;
    typeIn('Quality factor Q', r6(l.q));
    typeIn('Rms voltage across the capacitor in V', r6(l.v));
    click('Measure the circuit');
    expect(feedback()).toMatch(/capacitor voltage is not right/);
    advance(RUN);
    typeIn('Rms voltage across the capacitor in V', r6(l.vc));
    click('Measure the circuit');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 5: tune the circuit', () => {
  it('C and the shifted frequency win', () => {
    const l = start(5, 2) as LevelTune;
    typeIn('Capacitance in µF', r6(l.cMicroF));
    typeIn('New resonant frequency in Hz', r6(l.newHz));
    click('Tune the circuit');
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
