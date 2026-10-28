// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/gauss-flux-lab/index';
import { buildLevel, type Level, type LevelBox, type LevelCubeFace, type LevelDensity, type LevelFlux } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/gauss-flux-lab/logic';
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
  const m = manifest('gf');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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

describe('level 1: charge from a density', () => {
  const weigh = (l: LevelDensity, symbol: string, q: number) => {
    click(`Density is ${symbol}`);
    typeIn('Total charge in µC', r6(q));
    click('Weigh the charge');
    advance(ANIM);
    void l;
  };
  it('the right density symbol and total charge win, for every shape', () => {
    for (const shape of ['line', 'surface', 'volume']) {
      let seed = 1;
      for (; seed < 300; seed++) if ((buildLevel(1, createRng(seed)) as LevelDensity).shape === shape) break;
      const l = start(1, seed) as LevelDensity;
      wins = [];
      weigh(l, l.symbol, l.answer);
      expect(wins).toEqual([3]);
      expect($('.solution')?.textContent).toMatch(/density/);
    }
  });
  it('needs a symbol and a positive charge first, for free', () => {
    const l = start(1, 3) as LevelDensity;
    click('Weigh the charge');
    expect(feedback()).toMatch(/which kind of density/);
    click(`Density is ${l.symbol}`);
    typeIn('Total charge in µC', '-4');
    click('Weigh the charge');
    expect(feedback()).toMatch(/positive number of µC/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('a wrong symbol or a wrong total is called out, the first miss is free', () => {
    const l = start(1, 3) as LevelDensity;
    const other = (['λ', 'σ', 'ρ'] as const).find((d) => d !== l.symbol)!;
    weigh(l, other, l.answer);
    expect(feedback()).toMatch(/not the right kind of density/);
    expect(feedback()).toMatch(/0 free tests left/);
    weigh(l, l.symbol, l.answer * 2);
    expect(feedback()).toMatch(/too large/);
    expect(feedback()).toMatch(/cost a star/);
    weigh(l, l.symbol, l.answer);
    expect(wins).toEqual([2]);
  });
  it('the verdict animates and the controls lock after the win', () => {
    const l = start(1, 3) as LevelDensity;
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    click(`Density is ${l.symbol}`);
    typeIn('Total charge in µC', r6(l.answer));
    click('Weigh the charge');
    step(50);
    expect(canvas().dataset.phase).toBe('testing');
    advance(ANIM);
    expect(btn('Weigh the charge')!.disabled).toBe(true);
    expect(wins).toHaveLength(1);
  });
});

describe('level 2: flux through a closed surface', () => {
  const FIRST = 'Net flux through the surface as drawn in N m²/C';
  const SECOND = 'Net flux after the surface is resized in N m²/C';
  const check = (a: number, b: number) => {
    typeIn(FIRST, r6(a));
    typeIn(SECOND, r6(b));
    click('Check the fluxes');
    advance(ANIM);
  };
  it('the enclosed charge over ε₀, before and after resizing, wins', () => {
    for (const changes of [true, false]) {
      let seed = 1;
      for (; seed < 400; seed++) if ((buildLevel(2, createRng(seed)) as LevelFlux).changes === changes) break;
      const l = start(2, seed) as LevelFlux;
      wins = [];
      check(l.first, l.second);
      expect(wins).toEqual([3]);
      expect($('.solution')?.textContent).toMatch(changes ? /enclosed charge changed/ : /flux is unchanged/);
    }
  });
  it('the two answers are judged separately and named', () => {
    const l = start(2, 4) as LevelFlux;
    check(l.first * 3, l.second);
    expect(feedback()).toMatch(/The first flux is not right/);
    expect(feedback()).not.toMatch(/after resizing is not right/);
    check(l.first, l.second * 3);
    expect(feedback()).toMatch(/after resizing is not right/);
    expect(feedback()).toMatch(/cost a star/);
  });
  it('needs both numbers first, for free', () => {
    start(2, 4);
    click('Check the fluxes');
    expect(feedback()).toMatch(/Enter both fluxes/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: the black box', () => {
  const Q = 'Charge inside in nC';
  const tickRight = (l: LevelBox) => l.contents.filter((c) => l.zero.includes(c.id)).forEach((c) => click(`Zero flux: ${c.text}`));
  it('the charge and the set of zero-flux contents win', () => {
    const l = start(3, 5) as LevelBox;
    typeIn(Q, r6(l.answer));
    tickRight(l);
    click('Check the box');
    advance(ANIM);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/zero net flux/);
  });
  it('a negative flux gives a negative charge, typed with a minus sign', () => {
    let seed = 1;
    for (; seed < 300; seed++) if ((buildLevel(3, createRng(seed)) as LevelBox).measured < 0) break;
    const l = start(3, seed) as LevelBox;
    typeIn(Q, r6(l.answer));
    tickRight(l);
    click('Check the box');
    advance(ANIM);
    expect(wins).toEqual([3]);
  });
  it('ticking only the empty box (thinking zero flux means no charge) is caught', () => {
    const l = start(3, 5) as LevelBox;
    typeIn(Q, r6(l.answer));
    click('Zero flux: No charge at all');
    click('Check the box');
    expect(feedback()).toMatch(/set of contents that give zero flux is not right/);
    expect(feedback()).not.toMatch(/charge inside is not right/);
  });
  it('a ticked chip toggles off again, and an empty selection is refused for free', () => {
    const l = start(3, 5) as LevelBox;
    typeIn(Q, r6(l.answer));
    click('Zero flux: No charge at all');
    click('Zero flux: No charge at all');
    expect(btn('Zero flux: No charge at all')!.getAttribute('aria-pressed')).toBe('false');
    click('Check the box');
    expect(feedback()).toMatch(/Tick every set of contents/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('a wrong charge is flagged separately', () => {
    const l = start(3, 5) as LevelBox;
    typeIn(Q, r6(l.answer * 3));
    tickRight(l);
    click('Check the box');
    expect(feedback()).toMatch(/charge inside is not right/);
  });
});

describe('level 4: one face of a cube', () => {
  const FACE = 'Flux through the highlighted face in N m²/C';
  it('the symmetric share wins, for a charge at the centre and at a corner (including a face with no flux)', () => {
    const wanted = [
      (l: LevelCubeFace) => l.where === 'centre',
      (l: LevelCubeFace) => l.where === 'corner' && !l.touchesCorner,
      (l: LevelCubeFace) => l.where === 'corner' && l.touchesCorner,
    ];
    for (const ok of wanted) {
      let seed = 1;
      for (; seed < 500; seed++) if (ok(buildLevel(4, createRng(seed)) as LevelCubeFace)) break;
      const l = start(4, seed) as LevelCubeFace;
      wins = [];
      typeIn(FACE, r6(l.answer));
      click('Measure the face');
      advance(ANIM);
      expect(wins).toEqual([3]);
    }
  });
  it('using the whole flux q/ε₀ is a miss, and says too large', () => {
    const l = start(4, 6) as LevelCubeFace;
    typeIn(FACE, r6(l.answer === 0 ? 1 : l.answer * 6));
    click('Measure the face');
    expect(feedback()).toMatch(/too large/);
    expect(feedback()).toMatch(/0 free tests left/);
  });
  it('rejects empty and negative input for free', () => {
    start(4, 6);
    for (const bad of ['', '-3', 'x']) {
      typeIn(FACE, bad);
      click('Measure the face');
      expect(feedback()).toMatch(/number of N m²\/C/);
      expect(feedback()).toMatch(/does not cost/);
    }
  });
});

describe('robustness', () => {
  it('every level mounts and draws frames without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      advance(0.6);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
