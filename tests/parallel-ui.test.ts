// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/parallel-wires/index';
import { buildLevel, type Level, type LevelAmpere, type LevelFloat, type LevelLoop, type LevelPair, type LevelThree } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/parallel-wires/logic';
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

describe('level 1: pull or push', () => {
  it('the force and attract/repel win', () => {
    const l = start(1, 4) as LevelPair;
    typeIn('Force in µN', r6(l.micro));
    click(l.same ? 'The wires attract' : 'The wires repel');
    click('Measure the force');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/third law/);
  });
  it('the wrong kind is flagged under attract-or-repel only; a missing choice is free', () => {
    const l = start(1, 4) as LevelPair;
    typeIn('Force in µN', r6(l.micro));
    click('Measure the force');
    expect(feedback()).toMatch(/Choose whether/);
    expect(feedback()).toMatch(/does not cost/);
    click(l.same ? 'The wires repel' : 'The wires attract');
    click('Measure the force');
    expect(feedback()).toMatch(/Attract or repel is not right/);
    expect(feedback()).not.toMatch(/force is not right/);
  });
});

describe('level 2: the floating wire', () => {
  it('too small a gap rises, too large falls, the right gap hovers', () => {
    const l = start(2, 5) as LevelFloat;
    typeIn('Separation in mm', r6(l.gapMm * 0.5));
    click('Release the wire');
    expect(feedback()).toMatch(/wire rises/);
    advance(RUN);
    typeIn('Separation in mm', r6(l.gapMm * 2));
    click('Release the wire');
    expect(feedback()).toMatch(/wire falls/);
    advance(RUN);
    typeIn('Separation in mm', r6(l.gapMm));
    click('Release the wire');
    advance(RUN);
    expect(wins).toEqual([2]);
    expect($('.solution')?.textContent).toMatch(/λg/);
  });
});

describe('level 3: the ampere', () => {
  it('I and the doubled force win; a doubled factor of 2 is flagged under the force', () => {
    const l = start(3, 6) as LevelAmpere;
    typeIn('Current in each wire in A', r6(l.i));
    typeIn('Force per metre with both currents doubled in µN/m', r6(l.microPerM * 2));
    click('Measure the force');
    expect(feedback()).toMatch(/new force is not right/);
    expect(feedback()).not.toMatch(/current is not right/);
    advance(RUN);
    typeIn('Force per metre with both currents doubled in µN/m', r6(l.doubled));
    click('Measure the force');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 4: three wires', () => {
  it('net force and direction win; the wrong wire is flagged', () => {
    const l = start(4, 3) as LevelThree;
    typeIn('Net force per metre in µN/m', r6(l.microPerM));
    click(l.toLeft ? 'Net force is toward wire 3' : 'Net force is toward wire 1');
    click('Measure the force');
    expect(feedback()).toMatch(/direction is not right/);
    advance(RUN);
    click(l.toLeft ? 'Net force is toward wire 1' : 'Net force is toward wire 3');
    click('Measure the force');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 5: a loop near a wire', () => {
  it('the net force and direction win', () => {
    const l = start(5, 2) as LevelLoop;
    typeIn('Net force on the loop in mN', r6(l.milli));
    click(l.attracted ? 'The loop is pulled toward the wire' : 'The loop is pushed away from the wire');
    click('Measure the force');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/near side/);
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
