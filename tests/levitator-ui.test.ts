// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/coulomb-balance/index';
import { answerInUnit, buildLevel, equilibriumHeight, requiredCharge, toCoulombs } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/coulomb-balance/logic';
import { createRng } from '../src/core/random';
import type { GameContext } from '../src/core/types';
import { manifest } from './fixtures';

// ---- a fake browser: a stub canvas, and an animation clock we step by hand ----------------------
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
  const m = manifest('lev');
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop = game.mount(ctx);
  return buildLevel(level, createRng(seed));
}

const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;
const click = (el: Element | null) => {
  if (!el) throw new Error('nothing to click');
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
const releaseBtn = () => $('[aria-label="Release the ball"]') as HTMLButtonElement;
const feedback = () => $('.feedback')?.textContent ?? '';
const SETTLE = 3.5;

/** Level 1: move the charge slider. */
const slide = (nC: number) => {
  const el = $('input[type="range"]') as HTMLInputElement;
  el.value = String(nC);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
/** Levels 2 to 4: type the charge. */
const type = (value: string) => {
  const el = $('input[type="text"]') as HTMLInputElement;
  el.value = value;
};
const typeAndRelease = (value: string) => {
  type(value);
  click(releaseBtn());
  advance(SETTLE);
};
const chooseSign = (s: 1 | -1) => click($(`[aria-label="Give the ball a ${s > 0 ? 'positive' : 'negative'} charge"]`));
const heightShown = () => Number(/Ball height: ([\d.]+)/.exec($('.v-readout')?.textContent ?? '')?.[1]);
/** The answer rounded to the three significant figures a student would type. */
const typed = (lvl: ReturnType<typeof buildLevel>) => String(Number(answerInUnit(lvl).toPrecision(3)));

describe('level 1: raise the ball', () => {
  it('the slider sets the charge, and releasing the right charge floats the ball: three stars', () => {
    const lvl = start(1, 3);
    slide(Math.round(answerInUnit(lvl) * 20) / 20);
    click(releaseBtn());
    advance(SETTLE);
    expect(feedback()).toMatch(/floats at the target height/);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/q = m g h² \/ \(k Q\)/);
  });

  it('the ball really moves and the height it settles at matches the physics formula', () => {
    const lvl = start(1, 3);
    const nC = Math.round(answerInUnit(lvl) * 20) / 20;
    slide(nC);
    click(releaseBtn());
    advance(0.3);
    const early = heightShown();
    advance(SETTLE);
    const settled = heightShown();
    const want = equilibriumHeight(toCoulombs(nC, 'nC'), lvl.baseQ, lvl.mass)! / 0.01; // cm
    expect(Math.abs(settled - want) / want).toBeLessThan(0.02); // within 2% of the formula's height
    expect(early).not.toBe(settled); // it was still bobbing earlier
  });

  it('a wrong charge shows where the ball settled, and the first three tries are free', () => {
    const lvl = start(1, 3);
    slide(1);
    click(releaseBtn());
    advance(SETTLE);
    expect(feedback()).toMatch(/settled at [\d.]+ cm, below the target of/);
    expect(feedback()).toMatch(/2 free tries left/);
    expect(wins).toEqual([]);
    slide(Math.round(answerInUnit(lvl) * 20) / 20);
    click(releaseBtn());
    advance(SETTLE);
    expect(wins).toEqual([3]); // one miss was free
  });

  it('after the free tries, each miss costs a star', () => {
    const lvl = start(1, 3);
    for (let i = 0; i < 4; i++) {
      slide(1);
      click(releaseBtn());
      advance(SETTLE);
    }
    expect(feedback()).toMatch(/That cost a star/);
    slide(Math.round(answerInUnit(lvl) * 20) / 20);
    click(releaseBtn());
    advance(SETTLE);
    expect(wins).toEqual([2]); // 4 misses, 3 free, 1 star lost
  });

  it('too much charge pushes the ball to the top of the tube', () => {
    start(1, 3);
    slide(25);
    click(releaseBtn());
    advance(SETTLE);
    expect(feedback()).toMatch(/top of the tube/);
  });

  it('the release button is locked while the ball settles, so tries cannot overlap', () => {
    start(1, 3);
    slide(5);
    click(releaseBtn());
    advance(1);
    expect(releaseBtn().disabled).toBe(true);
    click(releaseBtn());
    advance(SETTLE);
    expect(releaseBtn().disabled).toBe(false);
  });
});

describe('level 2: work it out', () => {
  it('shows no height readout', () => {
    start(2, 4);
    step(50);
    expect($('.v-readout')?.textContent).toMatch(/read it off the ruler/);
    expect($('input[type="range"]')).toBeNull();
  });

  it('the calculated charge wins with three stars, and Enter also releases the ball', () => {
    const lvl = start(2, 4);
    type(typed(lvl));
    ($('input[type="text"]') as HTMLInputElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    advance(SETTLE);
    expect(wins).toEqual([3]);
  });

  it('a wrong charge costs a star immediately and says only too high or too low', () => {
    const lvl = start(2, 4);
    typeAndRelease(String(answerInUnit(lvl) * 1.6));
    expect(feedback()).toMatch(/settled above the target height/);
    expect(feedback()).toMatch(/That cost a star/);
    expect(feedback()).not.toMatch(/\d\.\d/); // no height given away
    typeAndRelease(typed(lvl));
    expect(wins).toEqual([2]);
  });

  it('the classic mistake, thinking height is proportional to charge, misses', () => {
    const lvl = start(2, 4);
    const half = requiredCharge(lvl.target / 2, lvl.baseQ, lvl.mass); // charge for half the height
    typeAndRelease(String(Number(((half * 2) / 1e-9).toPrecision(3)))); // a student doubles it, expecting double the height
    expect(wins).toEqual([]);
    expect(feedback()).toMatch(/below the target height/); // the real height is only 1.41x, so it is too low
  });

  it('empty, negative or non-numeric input is refused for free', () => {
    start(2, 4);
    for (const bad of ['', 'abc', '-3', '0']) {
      type(bad);
      click(releaseBtn());
      expect(feedback()).toMatch(/positive number of nC/);
      expect(feedback()).toMatch(/does not cost you anything/);
    }
    advance(SETTLE);
    expect(wins).toEqual([]);
    expect(releaseBtn().disabled).toBe(false);
  });
});

describe('level 3: tiny scale', () => {
  it('the answer is in picocoulombs, and the right one wins', () => {
    const lvl = start(3, 5);
    expect($('input[type="text"]')?.getAttribute('aria-label')).toBe('Ball charge in pC');
    typeAndRelease(typed(lvl));
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/mg = /);
    expect($('.solution')?.textContent).toMatch(/pC/);
  });
  it('forgetting to convert the prefixes (typing the answer as if it were in nC) misses', () => {
    const lvl = start(3, 5);
    typeAndRelease(String(answerInUnit(lvl) / 1000)); // off by 1000: nC value typed as pC
    expect(wins).toEqual([]);
  });
});

describe('level 4: opposite base', () => {
  it('the sign must be chosen first, and forgetting costs nothing', () => {
    const lvl = start(4, 6);
    type(typed(lvl));
    click(releaseBtn());
    expect(feedback()).toMatch(/Choose whether the ball is charged positively or negatively/);
    expect(feedback()).toMatch(/does not cost you anything/);
    advance(SETTLE);
    expect(wins).toEqual([]);
  });

  it('the right sign and size wins', () => {
    const lvl = start(4, 6);
    chooseSign(lvl.baseQ > 0 ? 1 : -1);
    typeAndRelease(typed(lvl));
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/like charges repel/);
  });

  it('the wrong sign, even with the exact size, pulls the ball onto the base and costs a star', () => {
    const lvl = start(4, 6);
    chooseSign(lvl.baseQ > 0 ? -1 : 1);
    typeAndRelease(typed(lvl));
    expect(feedback()).toMatch(/unlike charges attract/);
    expect(feedback()).toMatch(/That cost a star/);
    chooseSign(lvl.baseQ > 0 ? 1 : -1);
    typeAndRelease(typed(lvl));
    expect(wins).toEqual([2]);
  });

  it('both signs of base appear across puzzles, and each is solved by the matching sign', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed < 40 && seen.size < 2; seed++) {
      document.body.innerHTML = '';
      root = document.createElement('div');
      document.body.append(root);
      wins = [];
      stop?.();
      const lvl = start(4, seed);
      seen.add(Math.sign(lvl.baseQ));
      chooseSign(lvl.baseQ > 0 ? 1 : -1);
      typeAndRelease(typed(lvl));
      expect(wins).toEqual([3]);
    }
    expect(seen.size).toBe(2);
  });
});

describe('after winning, and robustness', () => {
  it('the controls lock and a second win cannot be recorded', () => {
    const lvl = start(2, 4);
    typeAndRelease(typed(lvl));
    expect(wins).toHaveLength(1);
    expect(releaseBtn().disabled).toBe(true);
    click(releaseBtn());
    advance(SETTLE);
    expect(wins).toHaveLength(1);
  });

  it('every level runs, wins and loses without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      document.body.innerHTML = '';
      root = document.createElement('div');
      document.body.append(root);
      stop?.();
      const lvl = start(level, 7);
      if (level === 1) slide(3);
      else {
        if (level === 4) chooseSign(lvl.baseQ > 0 ? 1 : -1);
        type('1');
      }
      click(releaseBtn());
      advance(SETTLE);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
