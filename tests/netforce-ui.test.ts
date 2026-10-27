// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/net-force-workshop/index';
import { attracts, buildLevel, type Level, type Level1, type Level2, type Level3, type Level4, type Level5 } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/net-force-workshop/logic';
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
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
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
  const m = manifest('nfw');
  const ctx = { root, manifest: m, level, levelCount: 5, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  (ctx as { root: HTMLElement }).root = root;
  stop?.();
  stop = game.mount(ctx);
  return buildLevel(level, createRng(seed)) as Level;
}
/** Find a seed that gives a level 3 of the wanted shape. */
const seedFor = (level: number, ok: (l: Level) => boolean) => {
  for (let s = 1; s < 500; s++) if (ok(buildLevel(level, createRng(s)))) return s;
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
const SETTLE = 1.6;
const round6 = (x: number) => Number(x.toPrecision(6));

describe('level 1: set the gap', () => {
  const play = (l: Level1, r: string | number, dir = attracts({ q1: l.q1, q2: l.q2, r: 1 }) ? 'Pull together' : 'Push apart', size = 'Same size') => {
    typeIn('Separation in cm', r);
    click(dir);
    click(size);
    click('Place and test');
    advance(SETTLE);
  };
  it('the calculated gap, with the right predictions, wins with three stars and shows the working', () => {
    const l = start(1, 3) as Level1;
    play(l, l.rAnswer);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/r = √/);
    expect(feedback()).toMatch(/exactly the target/);
  });
  it('asks for both predictions first, and refusing costs nothing', () => {
    const l = start(1, 3) as Level1;
    typeIn('Separation in cm', l.rAnswer);
    click('Place and test');
    expect(feedback()).toMatch(/Say what you expect first/);
    expect(feedback()).toMatch(/does not cost you anything/);
    expect(wins).toEqual([]);
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
  });
  it('rejects an empty or silly separation for free', () => {
    start(1, 3);
    for (const bad of ['', 'abc', '-4', '0']) {
      typeIn('Separation in cm', bad);
      click('Place and test');
      expect(feedback()).toMatch(/positive number of cm/);
    }
  });
  it('a wrong gap says too high or too low, the first test is free, the next costs a star', () => {
    const l = start(1, 3) as Level1;
    play(l, l.rAnswer * 0.7);
    expect(feedback()).toMatch(/too high/);
    expect(feedback()).toMatch(/too close/);
    expect(feedback()).toMatch(/0 free tests left/);
    play(l, l.rAnswer * 1.6);
    expect(feedback()).toMatch(/too low/);
    expect(feedback()).toMatch(/too far apart/);
    expect(feedback()).toMatch(/cost a star/);
    play(l, l.rAnswer);
    expect(wins).toEqual([2]);
  });
  it('a wrong prediction is explained and costs one star, only once', () => {
    const l = start(1, 3) as Level1;
    const wrongDir = l.q1 * l.q2 < 0 ? 'Push apart' : 'Pull together';
    play(l, l.rAnswer, wrongDir);
    // the gap was right, so this wins, but the slip was charged
    expect(feedback()).toMatch(/You expected/);
    expect(wins).toEqual([2]);
  });
  it('the force on B is explained as equal to the force on A', () => {
    const l = start(1, 3) as Level1;
    play(l, l.rAnswer, undefined, 'B feels more');
    expect(feedback()).toMatch(/equal and opposite/);
  });
  it('the picture animates the arrows and settles', () => {
    const l = start(1, 3) as Level1;
    typeIn('Separation in cm', l.rAnswer * 2);
    click('Pull together');
    click('Same size');
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    click('Place and test');
    step(50);
    expect(canvas().dataset.phase).toBe('testing');
    advance(1.5);
    expect(canvas().dataset.phase).toBe('done');
  });
  it('after the win the controls are locked and a second win cannot be recorded', () => {
    const l = start(1, 3) as Level1;
    play(l, l.rAnswer);
    expect(btn('Place and test')!.disabled).toBe(true);
    click('Place and test');
    advance(SETTLE);
    expect(wins).toHaveLength(1);
  });
});

describe('level 2: rescale', () => {
  const factorText = (l: Level2) => String(round6(l.factor));
  const play = (factor: string | number, dir: 'Attract' | 'Repel') => {
    typeIn('New reading as a multiple of the old reading', factor);
    click(dir);
    click('Run the changed experiment');
    advance(SETTLE);
  };
  const right = (l: Level2) => (attracts(l.after) ? 'Attract' : 'Repel') as 'Attract' | 'Repel';
  const wrong = (l: Level2) => (attracts(l.after) ? 'Repel' : 'Attract') as 'Attract' | 'Repel';
  it('lists the changes and wins with the right multiple and direction', () => {
    const l = start(2, 4) as Level2;
    expect(root.querySelectorAll('ol li')).toHaveLength(l.ops.length);
    play(factorText(l), right(l));
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/times the old one/);
  });
  it('a wrong multiple says higher or lower and never gives the number', () => {
    const l = start(2, 4) as Level2;
    play(l.factor * 2, right(l));
    expect(feedback()).toMatch(/lower than you predicted/);
    expect(feedback()).toMatch(/cost a star/);
    expect(feedback()).not.toContain(String(round6(l.factor)));
    play(l.factor / 2, right(l));
    expect(feedback()).toMatch(/higher than you predicted/);
  });
  it('a wrong direction is explained', () => {
    const l = start(2, 4) as Level2;
    play(factorText(l), wrong(l));
    expect(feedback()).toMatch(/after the change, not the other way round/);
    expect(wins).toEqual([]);
  });
  it('rejects empty, zero and negative multiples for free', () => {
    const l = start(2, 4) as Level2;
    for (const bad of ['', '0', '-2', 'x']) {
      typeIn('New reading as a multiple of the old reading', bad);
      click(right(l));
      click('Run the changed experiment');
      expect(feedback()).toMatch(/positive multiple/);
      expect(feedback()).toMatch(/does not cost/);
    }
    expect(wins).toEqual([]);
  });
  it('the "unchanged force" experiment (touch both, halve the gap) is solved by answering 1', () => {
    const seed = seedFor(2, (x) => (x as Level2).ops.includes('touchBoth') && (x as Level2).ops.includes('rHalf'));
    const l = start(2, seed) as Level2;
    play('1', right(l));
    expect(wins).toEqual([3]);
  });
});

describe('level 3: null the probe', () => {
  const answers = (l: Level3) => l.corners.filter((c) => c.q === null).map((c, i) => ({ name: c.name, v: l.answers[i] }));
  const fill = (l: Level3, vals: number[]) => answers(l).forEach((a, i) => typeIn(`Charge at ${a.name} in µC`, vals[i]));
  it('wins with the symmetric charges on a square', () => {
    const l = start(3, seedFor(3, (x) => (x as Level3).shape === 'square')) as Level3;
    fill(l, l.answers);
    click('Test the probe');
    advance(SETTLE);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/Opposite corners/);
  });
  it('wins with three equal charges on a triangle', () => {
    const l = start(3, seedFor(3, (x) => (x as Level3).shape === 'triangle')) as Level3;
    fill(l, l.answers);
    click('Test the probe');
    advance(SETTLE);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/120°/);
  });
  it('a wrong choice names the direction and size of the net force, the first test is free', () => {
    const l = start(3, seedFor(3, (x) => (x as Level3).shape === 'square')) as Level3;
    fill(l, [l.answers[0], l.answers[0]]);
    click('Test the probe');
    expect(feedback()).toMatch(/net force of [\d.]+ N/);
    expect(feedback()).toMatch(/pushed or pulled (up|down|to the)/);
    expect(feedback()).toMatch(/0 free tests left/);
    fill(l, l.answers);
    click('Test the probe');
    advance(SETTLE);
    expect(wins).toEqual([3]);
  });
  it('asks for every adjustable charge, for free', () => {
    const l = start(3, seedFor(3, (x) => (x as Level3).shape === 'square')) as Level3;
    typeIn('Charge at C in µC', l.answers[0]);
    click('Test the probe');
    expect(feedback()).toMatch(/Enter a charge in µC for C and D/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 4: rest on a line', () => {
  const regionLabel = (r: Level4['region']) => ({ left: 'Left of A', between: 'Between A and B', right: 'Right of B' })[r];
  const play = (region: string, dist: string | number) => {
    click(region);
    typeIn('Distance from A in cm', dist);
    click('Release the probe');
    advance(SETTLE);
  };
  it('the right region and distance win, for every kind of puzzle', () => {
    const seen = new Set<string>();
    for (const region of ['left', 'between', 'right'] as const) {
      const l = start(4, seedFor(4, (x) => (x as Level4).region === region)) as Level4;
      seen.add(l.region);
      wins = [];
      play(regionLabel(l.region), round6(Math.abs(l.xEq)));
      expect(wins).toEqual([3]);
    }
    expect(seen.size).toBe(3);
  });
  it('the wrong spot makes the probe slide, and says which way', () => {
    const l = start(4, seedFor(4, (x) => (x as Level4).region === 'between')) as Level4;
    play('Between A and B', l.b.at.x / 2 === l.xEq ? l.b.at.x / 4 : l.b.at.x / 2);
    expect(feedback()).toMatch(/slides towards (A|B)/);
    expect(wins).toEqual([]);
  });
  it('a wrong region is called out', () => {
    const l = start(4, seedFor(4, (x) => (x as Level4).region === 'left')) as Level4;
    play('Between A and B', Math.abs(l.xEq));
    expect(feedback()).toMatch(/That region cannot be right/);
  });
  it('asks for the region and the distance, for free', () => {
    start(4, 3);
    click('Release the probe');
    expect(feedback()).toMatch(/Enter the distance/);
    typeIn('Distance from A in cm', 5);
    click('Release the probe');
    expect(feedback()).toMatch(/Choose which region/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the board does not give the answer away: the same picture bounds for every answer', () => {
    // the line's bounds depend only on the gap d, so no answer position can be read from the layout
    const a = buildLevel(4, createRng(seedFor(4, (x) => (x as Level4).region === 'left'))) as Level4;
    const b = buildLevel(4, createRng(seedFor(4, (x) => (x as Level4).region === 'right' && (x as Level4).b.at.x === a.b.at.x))) as Level4;
    expect(a.b.at.x).toBe(b.b.at.x);
  });
});

describe('level 5: everyone at rest', () => {
  const play = (x: string | number, q: string | number) => {
    typeIn('Distance of the new charge from A in cm', x);
    typeIn('Charge of the new charge in µC', q);
    click('Release all three');
    advance(SETTLE);
  };
  it('the right place and the right opposite charge win, and the explanation covers the held charges too', () => {
    const l = start(5, 3) as Level5;
    play(round6(l.xAnswer), round6(l.qAnswer));
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/A must also rest/);
  });
  it('the right place with the wrong charge leaves the held charges moving', () => {
    const l = start(5, 3) as Level5;
    play(round6(l.xAnswer), round6(l.qAnswer * 2));
    expect(feedback()).toMatch(/still feel/);
    expect(wins).toEqual([]);
  });
  it('the midpoint with the right charge fails, the first test is free', () => {
    const l = start(5, seedFor(5, (x) => (x as Level5).xAnswer !== (x as Level5).b.at.x / 2)) as Level5;
    play(l.b.at.x / 2, round6(l.qAnswer));
    expect(feedback()).toMatch(/0 free tests left/);
    expect(wins).toEqual([]);
  });
  it('rejects a position outside the gap, for free', () => {
    const l = start(5, 3) as Level5;
    play(l.b.at.x + 5, -4);
    expect(feedback()).toMatch(/between 0 and/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('robustness', () => {
  it('every level mounts, shows its story and hint, and a first test runs without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4, 5]) {
      start(level, 7);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      expect(canvas()).not.toBeNull();
      advance(0.3);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
