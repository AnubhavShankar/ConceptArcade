// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/field-maker/index';
import { buildLevel, type Level, type LevelArc, type LevelAxis, type LevelConcentric, type LevelElement, type LevelLoop } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/field-maker/logic';
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
  const m = manifest('fm');
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
const dirLabel = (out: boolean) => (out ? 'Field points out of the page' : 'Field points into the page');
const RUN = 4;

describe('level 1: a current element', () => {
  it('dB and the direction win; the field appears during the measurement (phase testing)', () => {
    const l = start(1, 4) as LevelElement;
    typeIn('Field in nT', r6(l.nt));
    click(dirLabel(l.out));
    click('Measure the field');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/dl × r/);
  });
  it('the wrong direction is flagged under the direction only', () => {
    const l = start(1, 4) as LevelElement;
    typeIn('Field in nT', r6(l.nt));
    click(dirLabel(!l.out));
    click('Measure the field');
    expect(feedback()).toMatch(/direction is not right/);
    expect(feedback()).not.toMatch(/size is not right/);
  });
  it('needs a direction, for free', () => {
    const l = start(1, 4) as LevelElement;
    typeIn('Field in nT', r6(l.nt));
    click('Measure the field');
    expect(feedback()).toMatch(/Choose whether/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 2: a coil', () => {
  it('B and the direction win; one turn instead of N is flagged under the field', () => {
    const l = start(2, 5) as LevelLoop;
    typeIn('Field at the centre in µT', r6(l.n === 1 ? l.ut * 3 : l.ut / l.n));
    click(dirLabel(l.out));
    click('Measure the field');
    expect(feedback()).toMatch(/field is not right/);
    advance(RUN);
    typeIn('Field at the centre in µT', r6(l.ut));
    click('Measure the field');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 3: an arc', () => {
  it('B of the arc and the direction win', () => {
    const l = start(3, 5) as LevelArc;
    typeIn('Field at the centre of the arc in µT', r6(l.ut));
    click(dirLabel(l.out));
    click('Measure the field');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/straight leads/);
  });
});

describe('level 4: along the axis', () => {
  it('the axis field and the fraction win', () => {
    const l = start(4, 6) as LevelAxis;
    typeIn('Field on the axis in µT', r6(l.ut));
    typeIn('Fraction of the centre field', r6(l.ratio));
    click('Measure the field');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('giving the centre field is flagged under the axis field', () => {
    const l = start(4, 6) as LevelAxis;
    typeIn('Field on the axis in µT', r6(l.centreUt));
    typeIn('Fraction of the centre field', r6(l.ratio));
    click('Measure the field');
    expect(feedback()).toMatch(/axis field is not right/);
  });
});

describe('level 5: two loops', () => {
  it('both senses: the net field and the direction win', () => {
    for (const same of [true, false]) {
      wins = [];
      let seed = 1;
      while ((buildLevel(5, createRng(seed)) as LevelConcentric).same !== same) seed++;
      const l = start(5, seed) as LevelConcentric;
      typeIn('Net field in µT', r6(l.ut));
      click(dirLabel(l.out));
      click('Measure the field');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
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
