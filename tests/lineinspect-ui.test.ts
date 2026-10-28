// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch05-magnetism-and-matter/line-inspector/index';
import { VERDICT, buildLevel, type Level, type LevelFaces, type LevelHalf, type LevelSpot, type Verdict } from '../src/games/physics/class-12/ch05-magnetism-and-matter/line-inspector/logic';
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
  const m = manifest('li');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 3, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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
const RUN = 4;
const NAMES: Record<Verdict, string> = { magnetic: 'Magnetic', electrostatic: 'Electrostatic only', neither: 'Neither' };
const setLabel = (letter: string, want: Verdict) => {
  for (let k = 0; k < 4; k++) {
    if (btn(`Diagram ${letter}`)!.textContent === `${letter}: ${NAMES[want]}`) return;
    click(`Diagram ${letter}`);
  }
};

describe('level 1: spot the flaw', () => {
  it('every diagram must be labelled first, for free', () => {
    start(1, 4);
    click('Check the diagrams');
    expect(feedback()).toMatch(/Label every diagram/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the right labels win; one wrong label is named', () => {
    const l = start(1, 4) as LevelSpot;
    l.cards.forEach((c, i) => setLabel(c.letter, i === 0 ? (VERDICT[c.kind] === 'neither' ? 'magnetic' : 'neither') : VERDICT[c.kind]));
    click('Check the diagrams');
    expect(feedback()).toMatch(new RegExp(`Diagram ${l.cards[0].letter} is not classified`));
    advance(RUN);
    setLabel(l.cards[0].letter, VERDICT[l.cards[0].kind]);
    click('Check the diagrams');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
});

describe('level 2: closed surface', () => {
  it('the missing flux wins, with its sign', () => {
    const l = start(2, 5) as LevelFaces;
    typeIn('Flux through the fifth face in µWb', -l.missing);
    click('Check the surface');
    expect(feedback()).toMatch(/not the flux/);
    advance(RUN);
    typeIn('Flux through the fifth face in µWb', l.missing);
    click('Check the surface');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/Gauss's law for magnetism/);
  });
});

describe('level 3: through the magnet', () => {
  it('the cut flux wins; the wrong sign is flagged', () => {
    const l = start(3, 6) as LevelHalf;
    typeIn('Flux through the cut across the magnet in µWb', -l.cut);
    click('Check the surface');
    expect(feedback()).toMatch(/sign is not right/);
    advance(RUN);
    typeIn('Flux through the cut across the magnet in µWb', l.cut);
    click('Check the surface');
    advance(RUN);
    expect(wins).toEqual([3]);
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
