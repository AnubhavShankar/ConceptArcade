// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/coil-torque/index';
import { buildLevel, type Level, type LevelCircular, type LevelEnergy, type LevelFar, type LevelSquare, type LevelSwing } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/coil-torque/logic';
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
  const m = manifest('ct');
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
const RUN = 5;

describe('level 1: torque on a coil', () => {
  it('the torque wins and the coil rocks (phase testing)', () => {
    const l = start(1, 4) as LevelSquare;
    typeIn('Torque in N m', r6(l.torque));
    click('Release the coil');
    advance(1);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/N I A B sin θ/);
  });
  it('a wrong torque is a miss that does not give the value', () => {
    const l = start(1, 4) as LevelSquare;
    typeIn('Torque in N m', r6(l.torque * 2));
    click('Release the coil');
    expect(feedback()).toMatch(/not the torque/);
    expect(feedback()).not.toContain(r6(l.torque));
  });
});

describe('level 2: moment and shape', () => {
  it('m, τ and "same" win; "changes" is flagged under the shape only', () => {
    const l = start(2, 5) as LevelCircular;
    typeIn('Magnetic moment in A m²', r6(l.m));
    typeIn('Counter torque in N m', r6(l.torque));
    click('Irregular coil of the same area: torque changes');
    click('Check the coil');
    expect(feedback()).toMatch(/Think again about the shape/);
    expect(feedback()).not.toMatch(/moment is not right/);
    advance(RUN);
    click('Irregular coil of the same area: torque is the same');
    click('Check the coil');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('needs the shape choice, for free', () => {
    const l = start(2, 5) as LevelCircular;
    typeIn('Magnetic moment in A m²', r6(l.m));
    typeIn('Counter torque in N m', r6(l.torque));
    click('Check the coil');
    expect(feedback()).toMatch(/Choose what happens/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: swing into line', () => {
  it('τ = mB and ω = √(2mB/J) win; ω without the 2 is flagged under ω', () => {
    const l = start(3, 6) as LevelSwing;
    typeIn('Torque at release in N m', r6(l.torque));
    typeIn('Angular speed in rad/s', r6(Math.sqrt((l.m * l.b) / l.inertia)));
    click('Release the coil');
    expect(feedback()).toMatch(/angular speed is not right/);
    expect(feedback()).not.toMatch(/torque is not right/);
    advance(RUN);
    typeIn('Angular speed in rad/s', r6(l.omega));
    click('Release the coil');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 4: energy of a dipole', () => {
  it('the work and equilibrium kind win for every angle', () => {
    for (const theta of [0, 60, 90, 120, 180]) {
      wins = [];
      const l = start(4, seedFor(4, (x) => (x as LevelEnergy).theta === theta)) as LevelEnergy;
      typeIn('Work needed in J', r6(l.work));
      click(l.eq === 'stable' ? 'Orientation is a stable equilibrium' : l.eq === 'unstable' ? 'Orientation is an unstable equilibrium' : 'Orientation is not an equilibrium');
      click('Turn the loop');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
  });
  it('the wrong kind of equilibrium is flagged under the equilibrium only', () => {
    const l = start(4, seedFor(4, (x) => (x as LevelEnergy).theta === 180)) as LevelEnergy;
    typeIn('Work needed in J', r6(l.work));
    click('Orientation is a stable equilibrium');
    click('Turn the loop');
    expect(feedback()).toMatch(/kind of equilibrium is not right/);
    expect(feedback()).not.toMatch(/work is not right/);
  });
});

describe('level 5: far away', () => {
  it('the axial and equatorial fields win', () => {
    const l = start(5, 3) as LevelFar;
    typeIn('Field on the axis in µT', r6(l.axial));
    typeIn('Field on the equatorial line in µT', r6(l.equatorial));
    click('Measure the field');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/bar magnet/);
  });
  it('equal fields at both points are flagged under the equatorial field', () => {
    const l = start(5, 3) as LevelFar;
    typeIn('Field on the axis in µT', r6(l.axial));
    typeIn('Field on the equatorial line in µT', r6(l.axial));
    click('Measure the field');
    expect(feedback()).toMatch(/equatorial field is not right/);
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
