// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/index';
import { buildLevel, slabAfter, type Level, type LevelCharge, type LevelPlate, type LevelSlab } from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/capacitor-bench/logic';
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
  const m = manifest('cb');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 3, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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
const input = (label: string) => root.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
const typeIn = (label: string, v: string | number) => {
  const el = input(label);
  if (!el) throw new Error(`no input "${label}"`);
  el.value = String(v);
};
const feedback = () => $('.feedback')?.textContent ?? '';
const canvas = () => $('canvas') as HTMLCanvasElement;
const r6 = (x: number) => String(Number(x.toPrecision(6)));
const RUN = 4.6;

describe('level 1: charge a capacitor', () => {
  const ask = (l: LevelCharge) => (l.mode === 'charge' ? 'Charge on the plates in nC' : 'Voltage across the plates in V');
  const answer = (l: LevelCharge) => (l.mode === 'charge' ? l.q : l.v);
  it('Q = CV and V = Q/C win, in both modes', () => {
    for (const mode of ['charge', 'voltage']) {
      const l = start(1, seedFor(1, (x) => (x as LevelCharge).mode === mode)) as LevelCharge;
      wins = [];
      typeIn(ask(l), r6(answer(l)));
      click('Check the capacitor');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
    expect($('.solution')?.textContent).toMatch(/C = Q\/V|V = Q\/C/);
  });
  it('a value in the wrong unit is flagged with a pointer to the units, the first miss is free', () => {
    const l = start(1, 3) as LevelCharge;
    typeIn(ask(l), r6(answer(l) * 1000));
    click('Check the capacitor');
    expect(feedback()).toMatch(/too large: check the units/);
    expect(feedback()).toMatch(/0 free tests left/);
    typeIn(ask(l), r6(answer(l) / 2));
    click('Check the capacitor');
    expect(feedback()).toMatch(/too small/);
    expect(feedback()).toMatch(/cost a star/);
  });
  it('rejects an empty or non-positive value for free', () => {
    const l = start(1, 3) as LevelCharge;
    for (const bad of ['', '0', '-3', 'x']) {
      typeIn(ask(l), bad);
      click('Check the capacitor');
      expect(feedback()).toMatch(/positive number/);
      expect(feedback()).toMatch(/does not cost/);
    }
  });
  it('the plates charge up (phase testing) and the controls lock after the win', () => {
    const l = start(1, 3) as LevelCharge;
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    typeIn(ask(l), r6(answer(l)));
    click('Check the capacitor');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(btn('Check the capacitor')!.disabled).toBe(true);
  });
});

describe('level 2: the parallel plate', () => {
  const D = 'Gap between the plates in mm';
  const C2 = 'Capacitance after halving the gap and adding the dielectric in pF';
  const go = (d: number, c2: number) => {
    typeIn(D, r6(d));
    typeIn(C2, r6(c2));
    click('Check the plates');
    advance(RUN);
  };
  it('the gap and the doubled-and-multiplied capacitance win', () => {
    const l = start(2, 4) as LevelPlate;
    go(l.d, l.c2);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/C = ε₀A\/d/);
  });
  it('forgetting that halving the gap doubles C, or the dielectric, is caught under the capacitance', () => {
    const l = start(2, 4) as LevelPlate;
    go(l.d, l.c * l.k);
    expect(feedback()).toMatch(/new capacitance is not right/);
    expect(feedback()).not.toMatch(/gap is not right/);
  });
  it('a wrong gap points to the area in m²', () => {
    const l = start(2, 4) as LevelPlate;
    go(l.d * 3, l.c2);
    expect(feedback()).toMatch(/gap is not right/);
    expect(feedback()).toMatch(/A in m²/);
  });
  it('needs both answers, for free', () => {
    start(2, 4);
    click('Check the plates');
    expect(feedback()).toMatch(/both answers as positive numbers/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: slide in a dielectric', () => {
  const V = 'Potential difference after the slab in V';
  const Q = 'Charge on the plates after the slab in nC';
  const go = (v: number, q: number) => {
    typeIn(V, r6(v));
    typeIn(Q, r6(q));
    click('Slide in the slab');
    advance(RUN);
  };
  it('connected: V fixed and Q multiplied by K; disconnected: Q fixed and V divided by K', () => {
    for (const connected of [true, false]) {
      const l = start(3, seedFor(3, (x) => (x as LevelSlab).connected === connected)) as LevelSlab;
      wins = [];
      go(l.v1, l.q1);
      expect(wins).toEqual([3]);
      expect($('.solution')?.textContent).toMatch(connected ? /battery stays connected/ : /isolated/);
    }
  });
  it('mixing up the two situations is flagged with the rule for the actual situation', () => {
    for (const connected of [true, false]) {
      const l = start(3, seedFor(3, (x) => (x as LevelSlab).connected === connected)) as LevelSlab;
      const other = slabAfter(!connected, l.c0, l.v0, l.k);
      go(other.v, other.q);
      expect(feedback()).toMatch(connected ? /battery holds V fixed/ : /cannot lose or gain charge/);
    }
  });
  it('the slab slides in (phase testing) before the verdict', () => {
    const l = start(3, 5) as LevelSlab;
    typeIn(V, r6(l.v1 * 3));
    typeIn(Q, r6(l.q1));
    click('Slide in the slab');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    expect(feedback()).not.toBe('');
  });
  it('needs both answers, for free', () => {
    start(3, 5);
    click('Slide in the slab');
    expect(feedback()).toMatch(/both answers as positive numbers/);
    expect(feedback()).toMatch(/does not cost/);
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
