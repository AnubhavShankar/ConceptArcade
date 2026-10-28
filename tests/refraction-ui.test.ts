// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/refraction-bench/index';
import { buildLevel, type Level, type LevelCone, type LevelDepth, type LevelPipe, type LevelSlab, type LevelSnell } from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/refraction-bench/logic';
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
  const m = manifest('rb');
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

describe('every level opens with a hero and an objective', () => {
  it('shows the hero banner with an Objective line', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      start(level, 4);
      expect($('.hero .hero-name')?.textContent?.length).toBeGreaterThan(4);
      expect($('.hero .objective')?.textContent).toMatch(/^Objective:/);
    }
  });
});

describe('level 1: ray from water to glass', () => {
  it('the detector at the true angle wins; the incident angle is a miss that never says the answer', () => {
    const l = start(1, 4) as LevelSnell;
    typeIn('Detector angle from the normal in degrees', l.inDeg);
    click('Send the ray');
    expect(feedback()).toMatch(/away from the detector/);
    expect(feedback()).not.toMatch(new RegExp(r6(l.answer)));
    advance(RUN);
    typeIn('Detector angle from the normal in degrees', r6(l.answer));
    click('Send the ray');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('an angle of 90° or more is refused for free', () => {
    start(1, 4);
    typeIn('Detector angle from the normal in degrees', 95);
    click('Send the ray');
    expect(feedback()).toMatch(/less than 90/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 2: refocusing on Needle', () => {
  it('the direction must be chosen first, for free', () => {
    const l = start(2, 4) as LevelDepth;
    typeIn('Distance to move the microscope in cm', r6(Math.abs(l.move)));
    click('Refocus the microscope');
    expect(feedback()).toMatch(/up or down/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the wrong direction leaves Needle blurred; the right one wins', () => {
    const l = start(2, 4) as LevelDepth;
    typeIn('Distance to move the microscope in cm', r6(Math.abs(l.move)));
    click(l.move > 0 ? 'Move the microscope down' : 'Move the microscope up');
    click('Refocus the microscope');
    expect(feedback()).toMatch(/still blurred/);
    advance(RUN);
    click(l.move > 0 ? 'Move the microscope up' : 'Move the microscope down');
    click('Refocus the microscope');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 3: Pin under a glass slab', () => {
  it('both the raise and the position question must be right', () => {
    const l = start(3, 4) as LevelSlab;
    typeIn('How far the pin appears raised in cm', r6(l.shift));
    click('The raise changes when the slab slides');
    click('Lay the slab over Pin');
    expect(feedback()).toMatch(/does not move the image/);
    expect(feedback()).not.toMatch(/out of focus/);
    advance(RUN);
    click('The raise stays the same when the slab slides');
    click('Lay the slab over Pin');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('the question must be answered first, for free', () => {
    start(3, 4);
    typeIn('How far the pin appears raised in cm', 4);
    click('Lay the slab over Pin');
    expect(feedback()).toMatch(/Say whether/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 4: the disc over Glow', () => {
  it('a small disc lets light escape; the right radius wins', () => {
    const l = start(4, 4) as LevelCone;
    typeIn('Radius of the disc in cm', r6(l.radius * 0.5));
    click('Float the disc');
    expect(feedback()).toMatch(/Light still escapes/);
    advance(RUN);
    typeIn('Radius of the disc in cm', r6(l.radius));
    click('Float the disc');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 5: Pulse in the fibre', () => {
  it('too wide a beam leaks at the first bounce, a narrow one is guided but not the widest; the limit wins', () => {
    let l = start(5, 4) as LevelPipe;
    let seed = 4;
    while (l.maxDeg >= 85) l = start(5, ++seed) as LevelPipe;
    typeIn('Angle of incidence in degrees', r6(Math.min(89, l.maxDeg + 8)));
    click('Send the pulse');
    expect(feedback()).toMatch(/leaks out/);
    advance(RUN);
    typeIn('Angle of incidence in degrees', r6(l.maxDeg * 0.6));
    click('Send the pulse');
    expect(feedback()).toMatch(/wider beam/);
    advance(RUN);
    typeIn('Angle of incidence in degrees', r6(l.maxDeg));
    click('Send the pulse');
    advance(RUN);
    expect(wins).toEqual([2]);
  });
});

describe('robustness', () => {
  it('every level mounts and animates without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4, 5]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(20);
      advance(0.8);
      expect(canvas().dataset.phase).toBe('idle');
    }
    expect(err).not.toHaveBeenCalled();
  });
  it('a run of every level draws without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const typed: Record<number, [string, string, string][]> = {
      1: [['Detector angle from the normal in degrees', '30', 'Send the ray']],
      4: [['Radius of the disc in cm', '40', 'Float the disc']],
      5: [['Angle of incidence in degrees', '40', 'Send the pulse']],
    };
    for (const level of [1, 4, 5]) {
      start(level, 9);
      for (const [label, v, btn] of typed[level]) {
        typeIn(label, v);
        click(btn);
      }
      advance(RUN);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
