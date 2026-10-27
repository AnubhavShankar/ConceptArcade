// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/equipotential-explorer/index';
import { buildLevel, tapMatches, type Level, type LevelFind, type LevelRank, type LevelUniform, type Pt } from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/equipotential-explorer/logic';
import { createRng } from '../src/core/random';
import type { GameContext } from '../src/core/types';
import { manifest } from './fixtures';

const W = 640;
const H = 340;
const K = W / 48;
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
  const m = manifest('eq');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 3, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop?.();
  stop = game.mount(ctx);
  (root.querySelector('canvas') as HTMLCanvasElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H, right: W, bottom: H, x: 0, y: 0, toJSON: () => ({}) });
  return buildLevel(level, createRng(seed)) as Level;
}
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
const canvas = () => $('canvas') as HTMLCanvasElement;
const tap = (p: Pt) => canvas().dispatchEvent(new MouseEvent('click', { clientX: W / 2 + p.x * K, clientY: H / 2 - p.y * K, bubbles: true }));
const feedback = () => $('.feedback')?.textContent ?? '';
const ANIM = 1.6;

/** Three well-separated points that match the target potential. */
function matches(l: LevelFind): Pt[] {
  const found: Pt[] = [];
  for (let x = -20; x <= 20 && found.length < 3; x += 1) for (let y = -10; y <= 10 && found.length < 3; y += 1) if (tapMatches(l, { x, y }, found)) found.push({ x, y });
  return found;
}
const seedFor = (level: number, ok: (l: Level) => boolean) => {
  for (let s = 1; s < 600; s++) if (ok(buildLevel(level, createRng(s)))) return s;
  throw new Error('no seed');
};

describe('level 1: find the equipotential', () => {
  it('three matching taps and the right angle win with three stars', () => {
    const l = start(1, 3) as LevelFind;
    matches(l).forEach(tap);
    click('The field is perpendicular to the surface');
    click('Check the equipotential');
    advance(ANIM);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/perpendicular/);
  });
  it('each tap reads the potential and says whether it matched', () => {
    const l = start(1, 3) as LevelFind;
    tap({ x: l.mark.x > 0 ? -22 : 22, y: 11 });
    expect(feedback()).toMatch(/V = .* V: not the target/);
    const [first] = matches(l);
    tap(first);
    expect(feedback()).toMatch(/a match/);
  });
  it('the bisector of two equal and opposite charges is found as a whole line of zeros', () => {
    const l = start(1, seedFor(1, (x) => (x as LevelFind).bisector)) as LevelFind;
    tap({ x: 0, y: l.mark.y > 0 ? -3 : 3 });
    expect(feedback()).toMatch(/a match/);
  });
  it('needs three points and an answer about the angle first, for free', () => {
    const l = start(1, 3) as LevelFind;
    click('Check the equipotential');
    expect(feedback()).toMatch(/Find 3 points/);
    matches(l).forEach(tap);
    click('Check the equipotential');
    expect(feedback()).toMatch(/how the field meets/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the wrong angle is a miss with the reason, and many wasted taps cost stars', () => {
    const l = start(1, 3) as LevelFind;
    for (let i = 0; i < 12; i++) tap({ x: l.mark.x > 0 ? -22 : 22, y: 11 }); // twelve taps that find nothing
    matches(l).forEach(tap);
    click('The field is along the surface');
    click('Check the equipotential');
    expect(feedback()).toMatch(/gain or lose energy/);
    click('The field is perpendicular to the surface');
    click('Check the equipotential');
    advance(ANIM);
    expect(wins).toEqual([1]); // 15 taps
  });
  it('the verdict animates and the controls lock after the win', () => {
    const l = start(1, 3) as LevelFind;
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    matches(l).forEach(tap);
    click('The field is perpendicular to the surface');
    click('Check the equipotential');
    step(50);
    expect(canvas().dataset.phase).toBe('testing');
    advance(ANIM);
    expect(btn('Check the equipotential')!.disabled).toBe(true);
  });
});

describe('level 2: field from potential', () => {
  const go = (e: number, way: string) => {
    typeIn('Field strength in V/m', String(e));
    click(`The field points ${way}`);
    click('Check the field');
    advance(ANIM);
  };
  it('E = ΔV/d and the direction towards lower potential win, in both directions', () => {
    for (const from of ['a-to-b', 'b-to-a']) {
      const l = start(2, seedFor(2, (x) => (x as LevelUniform).from === from)) as LevelUniform;
      wins = [];
      go(l.e, from === 'a-to-b' ? 'from A towards B' : 'from B towards A');
      expect(wins).toEqual([3]);
    }
    expect($('.solution')?.textContent).toMatch(/E = ΔV \/ d/);
  });
  it('forgetting to convert cm to metres and reversing the direction are caught separately', () => {
    const l = start(2, 4) as LevelUniform;
    go(Math.abs(l.vA - l.vB) / l.d, l.from === 'a-to-b' ? 'from B towards A' : 'from A towards B');
    expect(feedback()).toMatch(/d in metres/);
    expect(feedback()).toMatch(/towards lower potential/);
  });
  it('needs a positive number and a direction first, for free', () => {
    const l = start(2, 4) as LevelUniform;
    click('Check the field');
    expect(feedback()).toMatch(/positive number of V\/m/);
    typeIn('Field strength in V/m', String(l.e));
    click('Check the field');
    expect(feedback()).toMatch(/which way the field points/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: rank by crowding', () => {
  const tapOrder = (l: LevelRank, order: number[]) => order.forEach((i) => tap(l.points[i].at));
  it('tapping strongest to weakest wins and the explanation gives the strengths', () => {
    const l = start(3, 5) as LevelRank;
    tapOrder(l, l.answer);
    click('Check the order');
    advance(ANIM);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/E = −dV\/dr/);
  });
  it('a wrong order counts the right places without revealing the readings', () => {
    const l = start(3, 5) as LevelRank;
    tapOrder(l, [...l.answer].reverse());
    click('Check the order');
    expect(feedback()).toMatch(/1 of the 3 places is right/);
    expect($('.solution')!.hidden).toBe(true);
  });
  it('needs all three points first, and "Start again" clears the order', () => {
    const l = start(3, 5) as LevelRank;
    tap(l.points[0].at);
    click('Check the order');
    expect(feedback()).toMatch(/Tap all three points/);
    tapOrder(l, [1, 2]);
    click('Clear my order');
    click('Check the order');
    expect(feedback()).toMatch(/Tap all three points/);
  });
});

describe('robustness', () => {
  it('every level mounts, paints its map and animates without a console error', () => {
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
