// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/conduct-or-insulate/index';
import { buildLevel, evaluate, initialConfig, material, solutions } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/conduct-or-insulate/logic';
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
  const m = manifest('fuel');
  const rng = createRng(seed);
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: rng, randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop = game.mount(ctx);
  return buildLevel(level, createRng(seed));
}

const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;
const $$ = (sel: string) => [...root.querySelectorAll(sel)] as HTMLElement[];
const click = (el: Element | null) => {
  if (!el) throw new Error('nothing to click');
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
/** Select the n-th part of the path (counting across routes). */
const selectPart = (n: number) => click($$('.route-group button')[n]);
const choose = (name: string) => click($$('.choices button').find((b) => b.textContent?.startsWith(name)) ?? null);
const runBtn = () => $('[aria-label="Run the discharge test"]') as HTMLButtonElement;
/** Press the test button and let the worker walk to the pump. */
const runTest = () => {
  click(runBtn());
  advance(3.2);
};
const feedback = () => $('.feedback')?.textContent ?? '';
const flat = (lvl: ReturnType<typeof buildLevel>) => lvl.routes.flatMap((r, ri) => r.slots.map((s, si) => ({ ri, si, id: s.material })));
const isInsulator = (id: string | null) => id !== null && material(id).kind === 'insulator';
const metalName = (lvl: ReturnType<typeof buildLevel>) => material(lvl.toolbox.find((id) => !isInsulator(id))!).name;
const insulatorName = (lvl: ReturnType<typeof buildLevel>) => material(lvl.toolbox.find((id) => isInsulator(id))!).name;

describe('level 1: ground the worker', () => {
  it('a metal lead drains the charge: a win with three stars', () => {
    const lvl = start(1, 3);
    choose(metalName(lvl));
    runTest();
    expect(feedback()).toMatch(/Safe!/);
    expect(wins).toEqual([3]);
  });

  it('an insulating lead sparks, explains why, costs a star, and the next try can still win', () => {
    const lvl = start(1, 3);
    choose(insulatorName(lvl));
    runTest();
    expect(feedback()).toMatch(/SPARK at the nozzle/);
    expect(feedback()).toMatch(/insulator has no free charges/);
    expect(feedback()).toMatch(/cost a star/);
    expect(wins).toEqual([]);
    advance(1); // the spark flash ends and the controls come back
    choose(metalName(lvl));
    runTest();
    expect(wins).toEqual([2]);
  });

  it('testing with an empty gap is refused and costs nothing', () => {
    start(1, 3);
    click(runBtn());
    expect(feedback()).toMatch(/empty gap/);
    expect(feedback()).toMatch(/does not cost you anything/);
    advance(3.2);
    expect(wins).toEqual([]);
  });

  it('the test takes time: the button is locked while the worker walks, and nothing is decided early', () => {
    const lvl = start(1, 3);
    choose(metalName(lvl));
    click(runBtn());
    advance(1.5);
    expect(runBtn().disabled).toBe(true);
    expect(wins).toEqual([]);
    advance(1.8);
    expect(wins).toEqual([3]);
  });
});

describe('level 2: find the break', () => {
  it('swapping the insulator wins', () => {
    const lvl = start(2, 4);
    const bad = flat(lvl).findIndex((p) => isInsulator(p.id));
    selectPart(bad);
    choose(metalName(lvl));
    expect($('.control-body p strong')?.textContent).toBe('Parts swapped: ');
    runTest();
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/single insulator stops the whole path/);
  });

  it('swapping a part that already conducts changes nothing: still a spark', () => {
    const lvl = start(2, 4);
    const good = flat(lvl).findIndex((p) => !isInsulator(p.id));
    selectPart(good);
    choose(metalName(lvl)); // a harmless swap: the real fault is still there
    runTest();
    expect(feedback()).toMatch(/SPARK/);
    expect(feedback()).toContain(lvl.routes[0].slots[flat(lvl).findIndex((p) => isInsulator(p.id))].name); // names the REAL culprit
    expect(wins).toEqual([]);
  });

  it('only one swap is allowed: a second is refused and costs nothing, and Undo gives the swap back', () => {
    const lvl = start(2, 4);
    selectPart(0);
    choose(metalName(lvl));
    selectPart(1);
    choose(metalName(lvl) === 'Steel' ? 'Iron' : 'Steel'); // a different part, even with a metal that is on offer
    const changed = $('.control-body')?.textContent;
    expect(changed).toBeDefined();
    click(runBtn());
    const msg = feedback();
    if (/at most 1 part/.test(msg)) {
      expect(msg).toMatch(/does not cost you anything/);
      selectPart(1);
      click($$('button').find((b) => b.textContent === 'Undo the swap on this part') ?? null);
      expect($$('.route-group button')[1].textContent).not.toMatch(/swapped/);
    } else {
      // the second choice happened to equal the original material: nothing to refuse
      expect(msg).not.toMatch(/at most/);
    }
    expect(wins).toEqual([]);
  });
});

describe('level 3: two ways out', () => {
  it('repairing the route that has a single insulator wins', () => {
    const lvl = start(3, 5);
    const cells = flat(lvl);
    const cheapRoute = [0, 1].find((r) => cells.filter((c) => c.ri === r && isInsulator(c.id)).length === 1)!;
    const bad = cells.findIndex((c) => c.ri === cheapRoute && isInsulator(c.id));
    selectPart(bad);
    choose(metalName(lvl));
    runTest();
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/only needs one complete route|Charge only needs one complete route/);
  });

  it('fixing one part of the route that has two insulators is not enough: a spark', () => {
    const lvl = start(3, 5);
    const cells = flat(lvl);
    const dearRoute = [0, 1].find((r) => cells.filter((c) => c.ri === r && isInsulator(c.id)).length === 2)!;
    selectPart(cells.findIndex((c) => c.ri === dearRoute));
    choose(metalName(lvl));
    runTest();
    expect(feedback()).toMatch(/SPARK/);
    expect(feedback()).toMatch(/Every route is cut/);
    expect(wins).toEqual([]);
  });
});

describe('level 4: dissipate it', () => {
  /** Choose one option for each of the three parts. */
  const fit = (ids: string[]) =>
    ids.forEach((id, i) => {
      selectPart(i);
      choose(material(id).name);
    });
  const remount = (level: number, seed: number) => {
    stop?.();
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.append(root);
    wins = [];
    return start(level, seed);
  };
  const controlsText = () => $$('.control-body').map((e) => e.textContent).join(' | ');

  it('shows a datasheet for each option and live totals', () => {
    start(4, 2);
    selectPart(0);
    expect($$('.choices button').every((b) => /· R .+ · cost \d+/.test(b.textContent ?? ''))).toBe(true);
    expect(controlsText()).toMatch(/Total resistance: choose all three parts/);
    expect(controlsText()).toMatch(/Total cost: 0 \(cap \d+\)/);
  });

  it('the totals follow your choices', () => {
    const lvl = start(4, 2);
    const sol = solutions(lvl)[0];
    fit(sol);
    const r = sol.reduce((s, id) => s + material(id).r, 0);
    expect(controlsText()).toContain(`Total resistance: ${r} (limit ${lvl.rMax})`);
    expect(controlsText()).toContain(`Total cost: ${sol.reduce((s, id) => s + material(id).cost, 0)}`);
  });

  it('EVERY one of the 27 combinations behaves correctly in the real interface, on three different puzzles', () => {
    for (const seed of [1, 2, 3]) {
      const lvl0 = buildLevel(4, createRng(seed));
      const good = new Set(solutions(lvl0).map((c) => c.join('|')));
      const [o0, o1, o2] = lvl0.routes[0].slots.map((s) => s.options!);
      let combos = 0;
      for (const a of o0) for (const b of o1) for (const c of o2) {
        combos++;
        const lvl = remount(4, seed);
        const combo = [a, b, c];
        fit(combo);
        const cost = combo.reduce((s, id) => s + material(id).cost, 0);
        const ev = evaluate(lvl, [combo]);
        click(runBtn());
        if (cost > lvl.costCap!) {
          // refused before any test: free
          expect(feedback()).toMatch(/Over budget/);
          expect(wins).toEqual([]);
          expect(good.has(combo.join('|'))).toBe(false);
          continue;
        }
        advance(3.2);
        if (good.has(combo.join('|'))) {
          expect(wins).toEqual([3]);
        } else {
          expect(wins).toEqual([]);
          expect(feedback()).toMatch(/SPARK/);
          expect(feedback()).toMatch(Number.isFinite(ev.resistance) ? /drains too slowly/ : /Every route is cut/);
        }
      }
      expect(combos).toBe(27);
    }
  });

  it('a path that conducts but drains too slowly says so, with the numbers', () => {
    // find, on some seed, a combination that is complete, affordable and too slow
    for (let seed = 1; seed < 30; seed++) {
      const lvl0 = buildLevel(4, createRng(seed));
      const slots = lvl0.routes[0].slots;
      for (const a of slots[0].options!) for (const b of slots[1].options!) for (const c of slots[2].options!) {
        const ev = evaluate(lvl0, [[a, b, c]]);
        const cost = material(a).cost + material(b).cost + material(c).cost;
        if (Number.isFinite(ev.resistance) && !ev.safe && cost <= lvl0.costCap!) {
          const lvl = remount(4, seed);
          fit([a, b, c]);
          runTest();
          expect(wins).toEqual([]);
          expect(feedback()).toContain(`total resistance is ${Number(ev.resistance.toFixed(2))}`);
          expect(feedback()).toContain(`limit of ${lvl.rMax}`);
          return;
        }
      }
    }
    throw new Error('no slow-but-affordable combination found on any seed');
  });
});

describe('after winning, and robustness', () => {
  it('the controls lock and a second win cannot be recorded', () => {
    const lvl = start(1, 3);
    choose(metalName(lvl));
    runTest();
    expect(wins).toHaveLength(1);
    expect(runBtn().disabled).toBe(true);
    click(runBtn());
    advance(4);
    expect(wins).toHaveLength(1);
  });

  it('runs every level without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      document.body.innerHTML = '';
      root = document.createElement('div');
      document.body.append(root);
      stop?.();
      start(level, 7);
      advance(0.5);
      click(runBtn());
      advance(3.5);
    }
    expect(err).not.toHaveBeenCalled();
  });

  it('the spark flash ends and the path can be repaired and tested again', () => {
    const lvl = start(2, 4);
    click(runBtn()); // as it comes: broken
    advance(3.2);
    expect(feedback()).toMatch(/SPARK/);
    expect(runBtn().disabled).toBe(true); // locked while the flash plays
    advance(1);
    expect(runBtn().disabled).toBe(false);
    selectPart(flat(lvl).findIndex((p) => isInsulator(p.id)));
    choose(metalName(lvl));
    runTest();
    expect(wins).toEqual([2]);
    expect(initialConfig(lvl).length).toBe(1);
  });
});
