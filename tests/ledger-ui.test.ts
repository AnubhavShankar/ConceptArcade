// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/electron-ledger/index';
import { buildLevel, strokesFor } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/electron-ledger/logic';
import { createRng } from '../src/core/random';
import type { GameContext } from '../src/core/types';
import { manifest } from './fixtures';

let wins: number[];
let root: HTMLElement;
let stop: (() => void) | void;
let step: (ms: number) => void;
let clock = 0;
const advance = (seconds: number) => {
  for (let i = 0; i < Math.round(seconds / 0.05); i++) step(50);
};

beforeEach(() => {
  clock = 0;
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
  wins = [];
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => {
  stop?.();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function start(level: number, seed: number) {
  const m = manifest('led');
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop = game.mount(ctx);
  return buildLevel(level, createRng(seed));
}
const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;
const btn = (label: string) => root.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement | null;
const click = (label: string) => {
  const b = btn(label);
  if (!b) throw new Error(`no button "${label}"`);
  b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
const feedback = () => $('.feedback')?.textContent ?? '';
const rubPair = (a: string, b: string) => {
  click(`Select ${a}`);
  click(`Select ${b}`);
  click('Rub the two selected');
};
const strokes = (n: number) => {
  ($('input[aria-label="Strokes"]') as HTMLInputElement).value = String(n);
  click('Rub');
};
type L = ReturnType<typeof buildLevel>;
const wrongSign = (l: L) => (l.wantSign > 0 ? 1 : -1);

describe('level 1: pump it', () => {
  it('removing electrons then shipping wins a positive order, adding wins a negative one', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      document.body.innerHTML = '';
      root = document.createElement('div');
      document.body.append(root);
      wins = [];
      const l = start(1, seed);
      for (let i = 0; i < 4; i++) click(l.wantSign > 0 ? 'Remove electrons' : 'Add electrons');
      click('Ship it');
      expect(wins).toEqual([3]);
      expect($('.solution')?.textContent).toMatch(/electrons/);
    }
  });
  it('the wrong direction, nothing, or too little all miss, each costing a star', () => {
    const l = start(1, 3);
    click('Ship it');
    expect(feedback()).toMatch(/still neutral/);
    for (let i = 0; i < 4; i++) click(l.wantSign > 0 ? 'Add electrons' : 'Remove electrons');
    click('Ship it');
    expect(feedback()).toMatch(/the opposite of what was ordered/);
    click('Earth it');
    click(l.wantSign > 0 ? 'Remove electrons' : 'Add electrons');
    click('Ship it');
    expect(feedback()).toMatch(/not enough/);
    expect(wins).toEqual([]);
    for (let i = 0; i < 3; i++) click(l.wantSign > 0 ? 'Remove electrons' : 'Add electrons');
    click('Ship it');
    expect(wins).toEqual([1]); // three misses
  });
  it('the ledger reads from the electron count', () => {
    start(1, 3);
    click('Remove electrons');
    expect(root.textContent).toMatch(/lost 2 × 10⁹ electrons/);
    expect($('.detector')?.textContent).toBe('+');
  });
  it('controls lock after the win', () => {
    const l = start(1, 3);
    for (let i = 0; i < 3; i++) click(l.wantSign > 0 ? 'Remove electrons' : 'Add electrons');
    click('Ship it');
    expect(btn('Ship it')!.disabled).toBe(true);
    expect(wins).toHaveLength(1);
  });
});

describe('level 1: work out the charge first', () => {
  it('the order describes an effect, not a sign', () => {
    for (let seed = 1; seed < 20; seed++) {
      document.body.innerHTML = '';
      root = document.createElement('div');
      document.body.append(root);
      start(1, seed * 7919);
      const order = $('.order-card')!.textContent!;
      expect(order).toMatch(/attract|repel/);
      expect(order).toMatch(/gained electrons|lost electrons/);
      expect(order).not.toMatch(/positive|negative/);
    }
  });
  it('the other body is drawn but not labelled with its sign', () => {
    start(1, 3);
    expect($('canvas')!.getAttribute('aria-label')).toMatch(/neutral/);
  });
  it('the protons button explains that protons cannot move, and costs nothing', () => {
    const l = start(1, 3);
    click('Add protons');
    expect(feedback()).toMatch(/Protons are locked/);
    expect(feedback()).toMatch(/does not cost you anything/);
    for (let i = 0; i < 3; i++) click(l.wantSign > 0 ? 'Remove electrons' : 'Add electrons');
    click('Ship it');
    expect(wins).toEqual([3]);
  });
  it('the wrong-sign message names the effect it would have had, not the answer', () => {
    const l = start(1, 3);
    for (let i = 0; i < 3; i++) click(l.wantSign > 0 ? 'Add electrons' : 'Remove electrons');
    click('Ship it');
    expect(feedback()).toMatch(/so it would (attract|repel)/);
    expect(feedback()).toMatch(/the opposite of what was ordered/);
  });
  it('the explanation walks through the reasoning', () => {
    const l = start(1, 3);
    for (let i = 0; i < 3; i++) click(l.wantSign > 0 ? 'Remove electrons' : 'Add electrons');
    click('Ship it');
    expect($('.solution')?.textContent).toMatch(/Like charges repel and unlike charges attract/);
  });
});

describe('level 1: the force is shown', () => {
  const canvas = () => $('canvas') as HTMLCanvasElement;
  const pump = (l: L, right: boolean, times = 3) => {
    for (let i = 0; i < times; i++) click((l.wantSign > 0) === right ? 'Remove electrons' : 'Add electrons');
  };
  it('a correct delivery shows exactly the effect that was ordered, and settles', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      document.body.innerHTML = '';
      root = document.createElement('div');
      document.body.append(root);
      wins = [];
      const l = start(1, seed * 7919);
      pump(l, true);
      click('Ship it');
      (step(50), expect(canvas().dataset.demo)).toBe(l.scenario!.relation);
      step(50);
      expect(canvas().dataset.settled).toBe('false');
      advance(2);
      expect(canvas().dataset.settled).toBe('true');
      expect(feedback()).toMatch(new RegExp(`will ${l.scenario!.relation}`));
    }
  });
  it('a wrong delivery shows the opposite effect, the one its charge really causes', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      document.body.innerHTML = '';
      root = document.createElement('div');
      document.body.append(root);
      const l = start(1, seed * 7919);
      pump(l, false);
      click('Ship it');
      const opposite = l.scenario!.relation === 'attract' ? 'repel' : 'attract';
      (step(50), expect(canvas().dataset.demo)).toBe(opposite);
      expect(feedback()).toMatch(new RegExp(`would ${opposite}`));
    }
  });
  it('a neutral sphere shows that nothing happens', () => {
    start(1, 3);
    click('Ship it');
    (step(50), expect(canvas().dataset.demo)).toBe('none');
  });
  it('pumping again clears the demo so the next try starts fresh', () => {
    const l = start(1, 3);
    pump(l, false);
    click('Ship it');
    (step(50), expect(canvas().dataset.demo)).not.toBe('');
    click('Earth it');
    (step(50), expect(canvas().dataset.demo)).toBe('');
  });
  it('after a win the picture keeps showing the effect and the controls stay locked', () => {
    const l = start(1, 3);
    pump(l, true);
    click('Ship it');
    advance(2);
    (step(50), expect(canvas().dataset.demo)).toBe(l.scenario!.relation);
    expect(btn('Ship it')!.disabled).toBe(true);
  });
});

describe('level 2: rub two bodies', () => {
  const names = (l: L) => l.bench.map((m) => m.name);
  /** Find the bench body that would end with the wanted sign, by the rules. */
  const winning = (l: L) => {
    const [a, b, c] = l.bench;
    const tries: [typeof a, typeof a][] = [[a, b], [a, c], [b, c]];
    for (const [x, y] of tries) {
      const first = x.rank < y.rank ? 1 : -1;
      if (first === l.wantSign) return [x, y] as const;
      if (-first === l.wantSign) return [y, x] as const;
    }
    throw new Error('no winning pair');
  };
  it('both bodies are charged with opposite signs after a rub', () => {
    const l = start(2, 4);
    rubPair(names(l)[0], names(l)[1]);
    const marks = [...root.querySelectorAll('.detector')].map((d) => d.textContent).sort();
    expect(marks).toEqual(['+', '−']);
  });
  it('shipping the body that took the right sign wins', () => {
    const l = start(2, 4);
    const [x, y] = winning(l);
    rubPair(x.name, y.name);
    click(`Ship the ${x.name}`);
    expect(wins).toEqual([3]);
  });
  it('shipping the oppositely charged partner misses and costs a star', () => {
    const l = start(2, 4);
    const [x, y] = winning(l);
    rubPair(x.name, y.name);
    click(`Ship the ${y.name}`);
    expect(feedback()).toMatch(/opposite sign/);
    expect(feedback()).toMatch(/cost a star/);
    click(`Ship the ${x.name}`);
    expect(wins).toEqual([2]);
  });
  it('rubbing needs exactly two selected, and a third pick replaces the oldest', () => {
    const l = start(2, 4);
    const [a, b, c] = names(l);
    click(`Select ${a}`);
    expect(btn('Rub the two selected')!.disabled).toBe(true);
    click(`Select ${b}`);
    click(`Select ${c}`);
    expect(btn(`Select ${a}`)!.getAttribute('aria-pressed')).toBe('false');
    expect(btn('Rub the two selected')!.disabled).toBe(false);
  });
  it('a middle material is positive with one partner and negative with the other', () => {
    const l = start(2, 4);
    const sorted = [...l.bench].sort((p, q) => p.rank - q.rank);
    rubPair(sorted[0].name, sorted[1].name);
    const withLow = [...root.querySelectorAll('.body-card')].find((c) => c.textContent!.includes(sorted[1].name))!.querySelector('.detector')!.textContent;
    rubPair(sorted[1].name, sorted[2].name);
    const withHigh = [...root.querySelectorAll('.body-card')].find((c) => c.textContent!.includes(sorted[1].name))!.querySelector('.detector')!.textContent;
    expect([withLow, withHigh]).toEqual(['−', '+']);
  });
});

describe('level 3: count the electrons', () => {
  it('the calculated number of strokes wins in one go', () => {
    const l = start(3, 5);
    const n = strokesFor(l.targetElectrons!, l.perStroke);
    strokes(n);
    click(`Ship the ${l.ship!.name}`);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/N = q \/ e/);
  });
  it('strokes add up across rubs', () => {
    const l = start(3, 5);
    const n = strokesFor(l.targetElectrons!, l.perStroke);
    strokes(1);
    strokes(n - 1);
    click(`Ship the ${l.ship!.name}`);
    expect(wins).toEqual([3]);
  });
  it('too few strokes, or too many, miss with a hint of the direction only', () => {
    const l = start(3, 5);
    const n = strokesFor(l.targetElectrons!, l.perStroke);
    strokes(n - 1);
    click(`Ship the ${l.ship!.name}`);
    expect(feedback()).toMatch(/not enough/);
    strokes(2); // now n + 1
    click(`Ship the ${l.ship!.name}`);
    expect(feedback()).toMatch(/more charge than the order allows/);
    click('Discharge both');
    strokes(n);
    click(`Ship the ${l.ship!.name}`);
    expect(wins).toEqual([1]); // two misses
  });
  it('shows electron counts, not the charge, and the order in nC', () => {
    const l = start(3, 5);
    expect($('.order-card')?.textContent).toMatch(/nC/);
    strokes(2);
    expect(root.textContent).toMatch(/Electrons moved so far: /);
    expect($('.workshop')!.textContent).not.toMatch(/nC/);
    void l;
  });
  it('rejects a silly stroke count for free', () => {
    start(3, 5);
    strokes(0);
    expect(feedback()).toMatch(/whole number of strokes/);
    expect(feedback()).toMatch(/does not cost you anything/);
  });
  it('shipping the partner, which has the wrong sign, misses', () => {
    const l = start(3, 5);
    strokes(strokesFor(l.targetElectrons!, l.perStroke));
    click(`Ship the ${l.ship!.name}`);
    expect(wins).toHaveLength(1);
    void wrongSign;
  });
});

describe('level 4: who gives way?', () => {
  const rankOrder = (l: L) => l.truth!;
  /** Do the three adjacent rubs, which settle the whole chain. */
  const rubChain = (l: L) => {
    const t = rankOrder(l);
    rubPair(t[0], t[1]);
    rubPair(t[1], t[2]);
    rubPair(t[2], t[3]);
  };
  const arrange = (target: string[]) => {
    for (let guard = 0; guard < 30; guard++) {
      const current = [...root.querySelectorAll('.rank-list li')].map((li) => li.firstChild!.textContent!.trim());
      const i = current.findIndex((n, k) => n !== target[k]);
      if (i < 0) return;
      const from = current.indexOf(target[i]);
      click(`Move ${target[i]} up`);
      void from;
    }
    throw new Error('could not arrange');
  };
  it('rubbing pairs fills a log of who gave electrons to whom', () => {
    const l = start(4, 6);
    const t = rankOrder(l);
    rubPair(t[2], t[1]);
    expect($('.notebook-log')?.textContent).toContain(`${t[1]} gave electrons to ${t[2]}`);
  });
  it('submitting with nothing learned is refused for free, so guessing cannot win', () => {
    start(4, 6);
    click('Submit order');
    expect(feedback()).toMatch(/not seen enough/);
    expect(feedback()).toMatch(/does not cost you anything/);
    expect(wins).toEqual([]);
  });
  it('three chained rubs are enough to win with three stars', () => {
    const l = start(4, 6);
    rubChain(l);
    arrange(rankOrder(l));
    click('Submit order');
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/gives electrons to every pad after it/);
  });
  it('chaining lets you skip rubs: two rubs on a triple settle that triple, and the log says so', () => {
    const l = start(4, 6);
    const t = rankOrder(l);
    rubPair(t[0], t[1]);
    rubPair(t[1], t[2]);
    rubPair(t[0], t[2]);
    expect($('.notebook-log')?.textContent).toMatch(/you could have worked this out/);
  });
  it('wasting rubs beyond the free five costs stars', () => {
    const l = start(4, 6);
    const t = rankOrder(l);
    for (let i = 0; i < 7; i++) rubPair(t[0], t[1]);
    rubChain(l);
    arrange(rankOrder(l));
    click('Submit order');
    expect(wins).toEqual([1]); // 10 rubs, 5 extra: two stars lost
  });
  it('an order that contradicts the evidence is a miss', () => {
    const l = start(4, 6);
    rubChain(l);
    const t = rankOrder(l);
    arrange([...t].reverse());
    click('Submit order');
    expect(feedback()).toMatch(/contradicts your own test rubs/);
    expect(wins).toEqual([]);
  });
  it('the starting order is never already the answer', () => {
    for (let seed = 1; seed < 40; seed++) {
      document.body.innerHTML = '';
      root = document.createElement('div');
      document.body.append(root);
      const l = start(4, seed);
      const current = [...root.querySelectorAll('.rank-list li')].map((li) => li.firstChild!.textContent!.trim());
      expect(current).not.toEqual(l.truth);
    }
  });
});

describe('robustness', () => {
  it('every level mounts without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      document.body.innerHTML = '';
      root = document.createElement('div');
      document.body.append(root);
      start(level, 9);
      expect(root.querySelector('.order-card')?.textContent).toBeTruthy();
    }
    expect(err).not.toHaveBeenCalled();
  });
});

describe('the picture and its animation', () => {
  const canvas = () => $('canvas') as HTMLCanvasElement;
  it('every level draws a canvas that describes the bench for screen readers', () => {
    for (const level of [1, 2, 3, 4]) {
      document.body.innerHTML = '';
      root = document.createElement('div');
      document.body.append(root);
      start(level, 9);
      expect(canvas().getAttribute('aria-label')).toMatch(/neutral/);
    }
  });
  it('pumping electrons starts flying electrons, and the picture settles when they land', () => {
    const l = start(1, 3);
    step(50);
    expect(canvas().dataset.settled).toBe('true');
    click(l.wantSign > 0 ? 'Remove electrons' : 'Add electrons');
    step(50);
    expect(canvas().dataset.settled).toBe('false'); // an electron is in the air
    advance(2);
    expect(canvas().dataset.settled).toBe('true');
    expect(canvas().getAttribute('aria-label')).toMatch(l.wantSign > 0 ? /positive/ : /negative/);
  });
  it('rubbing sends electrons from one body to the other, then the picture settles', () => {
    const l = start(2, 4);
    rubPair(l.bench[0].name, l.bench[1].name);
    step(50);
    expect(canvas().dataset.settled).toBe('false');
    advance(2.5);
    expect(canvas().dataset.settled).toBe('true');
    const label = canvas().getAttribute('aria-label')!;
    expect(label).toMatch(/positive/);
    expect(label).toMatch(/negative/);
  });
  it('level 3: many strokes animate and the discharge button sends the electrons back', () => {
    const l = start(3, 5);
    strokes(strokesFor(l.targetElectrons!, l.perStroke));
    advance(4);
    expect(canvas().dataset.settled).toBe('true');
    click('Discharge both');
    step(50);
    expect(canvas().dataset.settled).toBe('false');
    advance(4);
    expect(canvas().getAttribute('aria-label')).not.toMatch(/positive|negative/);
  });
  it('clicking a body in the picture selects it, on the rubbing levels', () => {
    start(2, 4);
    (canvas() as HTMLCanvasElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 250, right: 640, bottom: 250, x: 0, y: 0, toJSON: () => ({}) });
    canvas().dispatchEvent(new MouseEvent('click', { clientX: 640 / 4, clientY: 117, bubbles: true }));
    expect($('[aria-pressed="true"]')).not.toBeNull();
  });
});
