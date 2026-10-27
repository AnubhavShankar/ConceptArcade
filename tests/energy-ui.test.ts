// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/energy-bench/index';
import { buildLevel, type Level, type LevelDipole, type LevelMove, type LevelSystem } from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/energy-bench/logic';
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
  const m = manifest('eb');
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
const RUN = 4.2;

describe('level 1: assemble the system', () => {
  const go = (u: number) => {
    typeIn('Potential energy of the system in µJ', r6(u));
    click('Assemble the system');
    advance(RUN);
  };
  it('the sum over the three pairs wins, and the explanation walks through the assembly', () => {
    const l = start(1, 3) as LevelSystem;
    go(l.answer);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/one at a time/);
  });
  it('a total that is too high or too low is told apart, the first miss is free', () => {
    const l = start(1, 3) as LevelSystem;
    go(l.answer * 2);
    expect(feedback()).toMatch(/too (high|low)/);
    expect(feedback()).toMatch(/0 free tests left/);
    go(l.answer * 2);
    expect(feedback()).toMatch(/cost a star/);
    go(l.answer);
    expect(wins).toEqual([2]);
  });
  it('the wrong sign is a miss: unlike pairs lower the energy', () => {
    const l = start(1, 3) as LevelSystem;
    go(-l.answer);
    expect(wins).toEqual([]);
    expect(feedback()).toMatch(/keep the signs/);
  });
  it('rejects an empty value for free', () => {
    start(1, 3);
    click('Assemble the system');
    expect(feedback()).toMatch(/Enter the potential energy in µJ/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the charges fly in (phase testing) before the verdict settles, and the controls lock after the win', () => {
    const l = start(1, 3) as LevelSystem;
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    typeIn('Potential energy of the system in µJ', r6(l.answer));
    click('Assemble the system');
    advance(1.5);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(canvas().dataset.phase).toBe('done');
    expect(btn('Assemble the system')!.disabled).toBe(true);
  });
});

describe('level 2: carry a charge', () => {
  const go = (w: number, path = 'The work is the same by any route') => {
    typeIn('Work done by the agent in nJ', r6(w));
    click(path);
    click('Carry the charge');
    advance(RUN);
  };
  it('q(V_B − V_A) and "any route" win, for both signs of work', () => {
    for (const sign of [1, -1]) {
      const l = start(2, seedFor(2, (x) => Math.sign((x as LevelMove).answer) === sign)) as LevelMove;
      wins = [];
      go(l.answer);
      expect(wins).toEqual([3]);
    }
    expect($('.solution')?.textContent).toMatch(/conservative/);
  });
  it('the work and the route are judged separately', () => {
    const l = start(2, 4) as LevelMove;
    go(-l.answer, 'The longer route takes more work');
    expect(feedback()).toMatch(/work is not right/);
    expect(feedback()).toMatch(/conservative: the route makes no difference/);
  });
  it('needs a number and a route answer first, for free', () => {
    const l = start(2, 4) as LevelMove;
    click('Carry the charge');
    expect(feedback()).toMatch(/Enter the work in nJ/);
    typeIn('Work done by the agent in nJ', r6(l.answer));
    click('Carry the charge');
    expect(feedback()).toMatch(/longer, curving route/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: turn the dipole', () => {
  const go = (w: number) => {
    typeIn('Work done by the agent in µJ', r6(w));
    click('Turn the dipole');
    advance(RUN);
  };
  it('the change in −pE cos θ wins, for both signs of work', () => {
    for (const sign of [1, -1]) {
      const l = start(3, seedFor(3, (x) => Math.sign((x as LevelDipole).answer) === sign)) as LevelDipole;
      wins = [];
      go(l.answer);
      expect(wins).toEqual([3]);
    }
    expect($('.solution')?.textContent).toMatch(/−pE cos θ/);
  });
  it('the wrong sign points to the lowest energy being along the field', () => {
    const l = start(3, 5) as LevelDipole;
    go(-l.answer);
    expect(feedback()).toMatch(/lowest when the dipole points along the field/);
    expect(wins).toEqual([]);
  });
  it('rejects an empty value for free', () => {
    start(3, 5);
    click('Turn the dipole');
    expect(feedback()).toMatch(/Enter the work in µJ/);
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
