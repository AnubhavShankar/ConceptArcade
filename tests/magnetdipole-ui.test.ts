// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-dipole-bench/index';
import { buildLevel, inEquilibrium, type Level, type LevelConfigs, type LevelEnergy, type LevelSolenoid, type LevelTorque, type LevelWork } from '../src/games/physics/class-12/ch05-magnetism-and-matter/magnet-dipole-bench/logic';
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
  const m = manifest('md');
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

describe('level 1: torque on a magnet', () => {
  it('both modes: the answer wins and the magnet swings (phase testing)', () => {
    for (const mode of ['moment', 'torque']) {
      wins = [];
      const l = start(1, seedFor(1, (x) => (x as LevelTorque).mode === mode)) as LevelTorque;
      typeIn(mode === 'moment' ? 'Magnetic moment in J/T' : 'Torque in N m', r6(l.answer));
      click('Release the magnet');
      advance(1);
      expect(canvas().dataset.phase).toBe('testing');
      advance(RUN);
      expect(wins).toEqual([3]);
    }
    expect($('.solution')?.textContent).toMatch(/vector product/);
  });
  it('a wrong value does not give the answer', () => {
    const l = start(1, 4) as LevelTorque;
    const label = l.mode === 'moment' ? 'Magnetic moment in J/T' : 'Torque in N m';
    typeIn(label, r6(l.answer * 3));
    click('Release the magnet');
    expect(feedback()).toMatch(/not the/);
    expect(feedback()).not.toContain(r6(l.answer));
  });
});

describe('level 2: stable and unstable', () => {
  it('signed energies win; the wrong signs are flagged', () => {
    const l = start(2, 5) as LevelEnergy;
    typeIn('Energy in the stable orientation in J', r6(-l.stable));
    typeIn('Energy in the unstable orientation in J', r6(l.unstable));
    click('Check the energies');
    expect(feedback()).toMatch(/stable energy is not right/);
    expect(feedback()).not.toMatch(/unstable energy is not right/);
    advance(RUN);
    typeIn('Energy in the stable orientation in J', r6(l.stable));
    click('Check the energies');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 3: turning a magnet', () => {
  it('both works and zero torque win; a non-zero torque is flagged under the torque', () => {
    const l = start(3, 6) as LevelWork;
    typeIn('Work to turn it to 90° in J', r6(l.w90));
    typeIn('Work to turn it to 180° in J', r6(l.w180));
    typeIn('Torque when opposite to the field in N m', r6(l.m * l.b));
    click('Turn the magnet');
    expect(feedback()).toMatch(/torque opposite to the field is not right/);
    expect(feedback()).not.toMatch(/work to reach/);
    advance(RUN);
    typeIn('Torque when opposite to the field in N m', '0');
    click('Turn the magnet');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 4: the solenoid in a field', () => {
  it('moment, torque and zero force win; a force of mB is flagged under the force', () => {
    const l = start(4, 3) as LevelSolenoid;
    typeIn('Magnetic moment in J/T', r6(l.m));
    typeIn('Torque in N m', r6(l.torque));
    typeIn('Net force in N', r6(l.m * l.b));
    click('Check the solenoid');
    expect(feedback()).toMatch(/net force is not right/);
    expect(feedback()).not.toMatch(/torque is not right/);
    advance(RUN);
    typeIn('Net force in N', '0');
    click('Check the solenoid');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/uniform field/);
  });
});

describe('level 5: two small magnets', () => {
  const choose = (lowest: string, highest: string, noEq: string) => {
    click(`Lowest energy is ${lowest}`);
    click(`Highest energy is ${highest}`);
    click(`Not in equilibrium: ${noEq}`);
    click('Check the arrangements');
  };
  it('all three picks must be made first, for free', () => {
    const l = start(5, 3) as LevelConfigs;
    click(`Lowest energy is ${l.lowest}`);
    click('Check the arrangements');
    expect(feedback()).toMatch(/Make all three choices/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the right picks win; a swapped lowest/highest is flagged', () => {
    const l = start(5, 3) as LevelConfigs;
    const perp = l.configs.find((c) => !inEquilibrium(c))!.letter;
    choose(l.highest, l.lowest, perp);
    expect(feedback()).toMatch(/lowest potential energy is not right/);
    expect(feedback()).toMatch(/highest potential energy is not right/);
    advance(RUN);
    choose(l.lowest, l.highest, perp);
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
