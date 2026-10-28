// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch03-current-electricity/resistance-bench/index';
import { bandsFor, buildLevel, isOhmic, type Level, type LevelColour, type LevelOhm, type LevelOhmic, type LevelRho, type LevelStretch } from '../src/games/physics/class-12/ch03-current-electricity/resistance-bench/logic';
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
  const m = manifest('rb');
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

describe('level 1: find the resistance', () => {
  it('a voltage must be applied first, for free', () => {
    start(1, 4);
    typeIn('Resistance in Ω', '10');
    click('Check the resistor');
    expect(feedback()).toMatch(/Apply a voltage first/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('V/I wins after a reading; a wrong value does not give the answer', () => {
    const l = start(1, 4) as LevelOhm;
    click('Apply 6 V');
    typeIn('Resistance in Ω', r6(l.r * 2));
    click('Check the resistor');
    expect(feedback()).toMatch(/not the resistance/);
    expect(feedback()).not.toContain(r6(l.r));
    advance(RUN);
    typeIn('Resistance in Ω', r6(l.r));
    click('Check the resistor');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/Ohm's law/);
  });
});

describe('level 2: ohmic or not', () => {
  it('every component must be swept first, for free', () => {
    start(2, 4);
    click('Sweep A');
    click('Check the components');
    expect(feedback()).toMatch(/Sweep every component/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('marking exactly the straight-line components wins; the sweeps animate (phase testing)', () => {
    const l = start(2, 4) as LevelOhmic;
    for (const c of l.comps) click(`Sweep ${c.name}`);
    advance(0.5);
    expect(canvas().dataset.phase).toBe('testing');
    advance(3);
    for (const c of l.comps.filter(isOhmic)) click(`${c.name} is ohmic`);
    click('Check the components');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('marking a curved one is flagged with the reason', () => {
    const l = start(2, 4) as LevelOhmic;
    for (const c of l.comps) click(`Sweep ${c.name}`);
    advance(3);
    for (const c of l.comps) click(`${c.name} is ohmic`);
    click('Check the components');
    expect(feedback()).toMatch(/graph is curved/);
  });
});

describe('level 3: wire dimensions', () => {
  it('the resistivity and the second resistance win', () => {
    const l = start(3, 6) as LevelRho;
    typeIn('Resistivity in 10⁻⁷ Ω m', r6(l.rhoE7));
    typeIn('Resistance of the second wire in Ω', r6(l.r2));
    click('Check the wires');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/ρ = RA\/l/);
  });
  it('forgetting the area change is caught under the resistance only', () => {
    const l = start(3, 6) as LevelRho;
    typeIn('Resistivity in 10⁻⁷ Ω m', r6(l.rhoE7));
    typeIn('Resistance of the second wire in Ω', r6(l.r * l.lenFactor * (l.radiusFactor === 1 ? 7 : 1)));
    click('Check the wires');
    if (l.radiusFactor !== 1) expect(feedback()).toMatch(/second wire is not right/);
    else expect(feedback()).toMatch(/second wire is not right/);
    expect(feedback()).not.toMatch(/resistivity is not right/);
  });
});

describe('level 4: drawing a wire', () => {
  it('k² and "unchanged" win; a wrong choice is a miss', () => {
    const l = start(4, 3) as LevelStretch;
    typeIn('New resistance in Ω', r6(l.r2));
    click('Resistivity increases');
    click('Draw the wire');
    expect(feedback()).toMatch(/what the resistivity depends on/);
    advance(RUN);
    click('Resistivity unchanged');
    click('Draw the wire');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('needs a choice, for free', () => {
    const l = start(4, 3) as LevelStretch;
    typeIn('New resistance in Ω', r6(l.r2));
    click('Draw the wire');
    expect(feedback()).toMatch(/Choose what happens/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 5: the colour code', () => {
  const setBands = (target: [number, number, number]) => {
    const cur = [1, 0, 1];
    ['First band', 'Second band', 'Multiplier band'].forEach((name, i) => {
      for (let k = 0; k < (target[i] - cur[i] + 10) % 10; k++) click(name);
    });
  };
  it('bands with the right value win', () => {
    const l = start(5, 3) as LevelColour;
    setBands(bandsFor(l.target));
    click('Check the resistor');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/multiplier/);
  });
  it('wrong bands report the value they make, not the target', () => {
    const l = start(5, 3) as LevelColour;
    const [a, b, m] = bandsFor(l.target);
    setBands([a, b, (m + 1) % 10]);
    click('Check the resistor');
    expect(feedback()).toMatch(/Your bands make/);
    expect(feedback()).toMatch(/free tests left|cost a star/);
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
