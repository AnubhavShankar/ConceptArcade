// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/forces-of-nature/index';
import { buildLevel, conserves, type Level, type LevelBasic, type LevelConserve, type LevelCoulomb, type LevelGravity, type LevelMass } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/forces-of-nature/logic';
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
  const m = manifest('fn');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 5, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop?.();
  stop = game.mount(ctx);
  return buildLevel(level, createRng(seed)) as Level;
}
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
const r6 = (x: number) => String(Number(x.toPrecision(6)));
const ANIM = 1.6;

describe('level 1: force and distance', () => {
  const ask = (l: LevelBasic) => (l.mode === 'force' ? 'Force between the spheres in N' : 'Distance between the spheres in cm');
  const answer = (l: LevelBasic) => (l.mode === 'force' ? l.f : l.r);
  it('the right value and Newton’s third law win, in both modes', () => {
    for (const mode of ['force', 'distance']) {
      const l = start(1, seedFor(1, (x) => (x as LevelBasic).mode === mode)) as LevelBasic;
      wins = [];
      typeIn(ask(l), r6(answer(l)));
      click('Force on the second sphere: equal and opposite');
      click('Check my answer');
      advance(ANIM);
      expect(wins).toEqual([3]);
      expect($('.solution')?.textContent).toMatch(/Newton’s third law/);
    }
  });
  it('the force on the smaller charge being bigger is called out as the wrong idea', () => {
    const l = start(1, 3) as LevelBasic;
    typeIn(ask(l), r6(answer(l)));
    click('Force on the second sphere: bigger on the smaller charge');
    click('Check my answer');
    expect(feedback()).toMatch(/Newton’s third law/);
    expect(feedback()).not.toMatch(/too (large|small)/);
  });
  it('a force that forgets the unit conversions is flagged with a pointer to the units', () => {
    const l = start(1, seedFor(1, (x) => (x as LevelBasic).mode === 'force')) as LevelBasic;
    typeIn(ask(l), r6((9e9 * l.q1 * l.q2) / (l.r * l.r)));
    click('Force on the second sphere: equal and opposite');
    click('Check my answer');
    expect(feedback()).toMatch(/check the units/);
    expect(feedback()).toMatch(/0 free tests left/);
  });
  it('needs a positive number and a choice first, for free', () => {
    const l = start(1, 3) as LevelBasic;
    click('Check my answer');
    expect(feedback()).toMatch(/positive number/);
    typeIn(ask(l), r6(answer(l)));
    click('Check my answer');
    expect(feedback()).toMatch(/second sphere/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the verdict animates and the controls lock after the win', () => {
    const l = start(1, 3) as LevelBasic;
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    typeIn(ask(l), r6(answer(l)));
    click('Force on the second sphere: equal and opposite');
    click('Check my answer');
    step(50);
    expect(canvas().dataset.phase).toBe('testing');
    advance(ANIM);
    expect(btn('Check my answer')!.disabled).toBe(true);
    expect(wins).toHaveLength(1);
  });
});

describe('level 2: electric against gravity', () => {
  const RATIO = 'How many times bigger the electric force is';
  it('the ratio (typed in scientific notation) and the cancelling reason win, for every pair', () => {
    for (const pair of ['pp', 'ep', 'ee']) {
      const l = start(2, seedFor(2, (x) => (x as LevelGravity).pair === pair)) as LevelGravity;
      wins = [];
      typeIn(RATIO, l.ratio.toExponential(2));
      click('Electric forces cancel');
      click('Compare the forces');
      advance(ANIM);
      expect(wins).toEqual([3]);
    }
  });
  it('"3 x 10^36" style input is understood', () => {
    const l = start(2, 3) as LevelGravity;
    const [m, e] = l.ratio.toExponential(2).split('e');
    typeIn(RATIO, `${m} x 10^${e.replace('+', '')}`);
    click('Electric forces cancel');
    click('Compare the forces');
    advance(ANIM);
    expect(wins).toEqual([3]);
  });
  it('a ratio off by powers of ten, or the wrong reason, are flagged separately', () => {
    const l = start(2, 3) as LevelGravity;
    typeIn(RATIO, '1e20');
    click('Gravity is stronger at long range');
    click('Compare the forces');
    expect(feedback()).toMatch(/too small by many powers of ten/);
    expect(feedback()).toMatch(/why large objects feel almost no net electric force/);
    void l;
  });
  it('needs a positive ratio and a reason first, for free', () => {
    start(2, 3);
    click('Compare the forces');
    expect(feedback()).toMatch(/positive number/);
    typeIn(RATIO, '1e36');
    click('Compare the forces');
    expect(feedback()).toMatch(/why gravity rules/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: how big is a coulomb?', () => {
  it('the electron count, the years and the reason win', () => {
    const l = start(3, 4) as LevelCoulomb;
    typeIn(`Number of electrons in ${l.micro} µC`, l.electrons.toExponential(3));
    typeIn('Years to collect 1 C', r6(l.years));
    click('One electron is a tiny step');
    click('Check my counts');
    advance(ANIM);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/very large unit/);
  });
  it('each wrong part is named separately', () => {
    const l = start(3, 4) as LevelCoulomb;
    typeIn(`Number of electrons in ${l.micro} µC`, l.electrons.toExponential(3));
    typeIn('Years to collect 1 C', r6(l.years * 365 * 24 * 3600));
    click('Charge is not quantised for big objects');
    click('Check my counts');
    expect(feedback()).toMatch(/time is not right/);
    expect(feedback()).toMatch(/Charge is quantised everywhere/);
    expect(feedback()).not.toMatch(/number of electrons is not right/);
  });
  it('needs positive numbers and a reason first, for free', () => {
    start(3, 4);
    click('Check my counts');
    expect(feedback()).toMatch(/positive numbers/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 4: the mass of charging', () => {
  const find = (negative: boolean) => seedFor(4, (x) => (x as LevelMass).negative === negative);
  const answer = (l: LevelMass, from = l.from) => {
    typeIn('Number of electrons transferred', l.electrons.toExponential(3));
    typeIn('Mass transferred in kg', l.massKg.toExponential(3));
    click(from === 'partner' ? `Electrons moved from the ${l.partner} to the ${l.body}` : `Electrons moved from the ${l.body} to the ${l.partner}`);
    click('Check the transfer');
    advance(ANIM);
  };
  it('the count, the tiny mass and the direction win, for a negative and a positive body', () => {
    for (const negative of [true, false]) {
      const l = start(4, find(negative)) as LevelMass;
      wins = [];
      answer(l);
      expect(wins).toEqual([3]);
      expect($('.solution')?.textContent).toMatch(/negligible/);
    }
  });
  it('the wrong direction is explained in terms of gaining and losing electrons', () => {
    const l = start(4, find(true)) as LevelMass;
    answer(l, 'body');
    expect(feedback()).toMatch(/gained them|has gained/);
    expect(wins).toEqual([]);
  });
  it('using the proton mass is caught as a wrong mass', () => {
    const l = start(4, 3) as LevelMass;
    typeIn('Number of electrons transferred', l.electrons.toExponential(3));
    typeIn('Mass transferred in kg', (l.electrons * 1.67e-27).toExponential(3));
    click(l.from === 'partner' ? `Electrons moved from the ${l.partner} to the ${l.body}` : `Electrons moved from the ${l.body} to the ${l.partner}`);
    click('Check the transfer');
    expect(feedback()).toMatch(/mass is not right/);
  });
});

describe('level 5: the conservation checker', () => {
  const flagBad = (l: LevelConserve) => l.reactions.forEach((r, i) => !conserves(r) && click(`Flag collision ${i + 1}`));
  it('flagging exactly the three forbidden collisions wins, and the explanation lists the totals', () => {
    const l = start(5, 3) as LevelConserve;
    flagBad(l);
    click('Run the collisions');
    advance(ANIM);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/total charge before equals/);
  });
  it('a flag toggles off again', () => {
    start(5, 3);
    click('Flag collision 1');
    expect(btn('Flag collision 1')!.getAttribute('aria-pressed')).toBe('true');
    click('Flag collision 1');
    expect(btn('Flag collision 1')!.getAttribute('aria-pressed')).toBe('false');
  });
  it('misses and false alarms are counted without naming the collisions', () => {
    const l = start(5, 3) as LevelConserve;
    const good = l.reactions.findIndex((r) => conserves(r));
    const bad = l.reactions.map((r, i) => (conserves(r) ? -1 : i)).filter((i) => i >= 0);
    click(`Flag collision ${good + 1}`);
    click(`Flag collision ${bad[0] + 1}`);
    click('Run the collisions');
    expect(feedback()).toMatch(/2 forbidden collisions are still unflagged/);
    expect(feedback()).toMatch(/1 of the collisions you flagged obey the law/);
    expect(wins).toEqual([]);
  });
  it('asks for at least one flag, for free', () => {
    start(5, 3);
    click('Run the collisions');
    expect(feedback()).toMatch(/Flag the collisions/);
    expect(feedback()).toMatch(/does not cost/);
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
