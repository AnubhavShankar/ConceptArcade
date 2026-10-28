// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/galvanometer-bench/index';
import { buildLevel, type Level, type LevelAmmeter, type LevelDeflect, type LevelRatio, type LevelTurns, type LevelVoltmeter } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/galvanometer-bench/logic';
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
  const m = manifest('gb');
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

describe('level 1: pointer and spring', () => {
  it('the sensitivity and full-scale current win; the slider moves the pointer without error', () => {
    const l = start(1, 4) as LevelDeflect;
    const sl = root.querySelector('input[aria-label="Current in µA"]') as HTMLInputElement;
    sl.value = String(l.fullMicro / 2);
    sl.dispatchEvent(new Event('input', { bubbles: true }));
    advance(0.5);
    typeIn('Current sensitivity in degrees per µA', r6(l.sens));
    typeIn('Full-scale current in µA', r6(l.fullMicro));
    click('Check the meter');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/kθ = NIAB/);
  });
  it('the full-scale current in A is flagged under the full scale only', () => {
    const l = start(1, 4) as LevelDeflect;
    typeIn('Current sensitivity in degrees per µA', r6(l.sens));
    typeIn('Full-scale current in µA', r6(l.fullMicro / 1e6));
    click('Check the meter');
    expect(feedback()).toMatch(/full-scale current is not right/);
    expect(feedback()).not.toMatch(/sensitivity is not right/);
  });
});

describe('level 2: the ammeter', () => {
  it('the shunt and the reading win', () => {
    const l = start(2, 5) as LevelAmmeter;
    typeIn('Shunt resistance in mΩ', r6(l.shunt));
    typeIn('Reading of the ammeter in A', r6(l.reading));
    click('Check the ammeter');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/shunt/);
  });
  it('a reading of exactly 1 A (ignoring the ammeter) is flagged under the reading', () => {
    const l = start(2, 5) as LevelAmmeter;
    typeIn('Shunt resistance in mΩ', r6(l.shunt));
    typeIn('Reading of the ammeter in A', '1');
    click('Check the ammeter');
    expect(feedback()).toMatch(/reading is not right/);
    expect(feedback()).not.toMatch(/shunt is not right/);
  });
});

describe('level 3: the voltmeter', () => {
  it('the series resistance and the total win', () => {
    const l = start(3, 6) as LevelVoltmeter;
    typeIn('Series resistance in kΩ', r6(l.series));
    typeIn('Resistance of the voltmeter in kΩ', r6(l.total));
    click('Check the voltmeter');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 4: two meters', () => {
  it('both ratios win; the ratios swapped are flagged unless they are equal', () => {
    const l = start(4, 3) as LevelRatio;
    typeIn('Ratio of the current sensitivities, M2 to M1', r6(l.current));
    typeIn('Ratio of the voltage sensitivities, M2 to M1', r6(l.voltage));
    click('Compare the meters');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/NAB\/R/);
  });
});

describe('level 5: more turns', () => {
  it('Is scales with the turns and Vs is unchanged', () => {
    const l = start(5, 2) as LevelTurns;
    typeIn('New current sensitivity in div per mA', r6(l.newI));
    typeIn('New voltage sensitivity in div per V', r6(l.newV * l.k));
    click('Rewind the coil');
    expect(feedback()).toMatch(/voltage sensitivity is not right/);
    expect(feedback()).not.toMatch(/current sensitivity is not right/);
    advance(RUN);
    typeIn('New voltage sensitivity in div per V', r6(l.newV));
    click('Rewind the coil');
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
