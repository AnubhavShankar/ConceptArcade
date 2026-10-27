// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/conductor-lab/index';
import { buildLevel, type Level, type LevelDielectric, type LevelShield, type LevelSphere } from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/conductor-lab/logic';
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
  const m = manifest('cl');
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

describe('level 1: the charged sphere', () => {
  const SURF = 'Field just outside the surface in N/C';
  const AT = 'Field at the marked distance in N/C';
  const go = (s: number, a: number, inside = 'zero') => {
    typeIn(SURF, r6(s));
    typeIn(AT, r6(a));
    click(`The field inside is ${inside === 'zero' ? 'zero' : 'not zero'}`);
    click('Check the sphere');
    advance(ANIM);
  };
  it('the field just outside, at the marked distance, and zero inside win', () => {
    const l = start(1, 3) as LevelSphere;
    go(l.surface, l.atR);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/Gaussian sphere inside the conductor/);
  });
  it('the meters show E dropping to zero inside the sphere while V stays constant', () => {
    const l = start(1, 3) as LevelSphere;
    const slide = (v: number) => {
      const s = input('Probe distance from the centre in cm');
      s.value = String(v);
      s.dispatchEvent(new Event('input', { bubbles: true }));
      step(50);
      const [e, vv] = [...root.querySelectorAll('.v-readout')].map((x) => x.textContent!);
      return { e, vv };
    };
    const a = slide(l.R * 0.5);
    const b = slide(l.R * 0.9);
    const c = slide(l.R * 2);
    expect(a.e).toBe('E = 0 N/C');
    expect(b.e).toBe('E = 0 N/C');
    expect(a.vv).toBe(b.vv); // the potential is the same everywhere inside
    expect(c.e).not.toBe('E = 0 N/C');
  });
  it('each wrong part is named separately', () => {
    const l = start(1, 3) as LevelSphere;
    go(l.surface * 2, l.surface, 'not zero');
    expect(feedback()).toMatch(/just outside the surface is not right/);
    expect(feedback()).toMatch(/marked distance is not right/);
    expect(feedback()).toMatch(/Inside a conductor in equilibrium/);
    expect(feedback()).toMatch(/0 free tests left/);
  });
  it('needs both numbers and an answer for the inside first, for free', () => {
    const l = start(1, 3) as LevelSphere;
    click('Check the sphere');
    expect(feedback()).toMatch(/Enter both fields/);
    typeIn(SURF, r6(l.surface));
    typeIn(AT, r6(l.atR));
    click('Check the sphere');
    expect(feedback()).toMatch(/what the field inside the sphere is/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the verdict animates and the controls lock after the win', () => {
    const l = start(1, 3) as LevelSphere;
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    typeIn(SURF, r6(l.surface));
    typeIn(AT, r6(l.atR));
    click('The field inside is zero');
    click('Check the sphere');
    step(50);
    expect(canvas().dataset.phase).toBe('testing');
    advance(ANIM);
    expect(btn('Check the sphere')!.disabled).toBe(true);
  });
});

describe('level 2: shielding', () => {
  const answer = (l: LevelShield, mistakes = 0) => {
    l.tiles.forEach((t, i) => {
      const value = i < mistakes ? !t.field : t.field;
      click(`Set-up ${i + 1}: the probe feels ${value ? 'a field' : 'no field'}`);
    });
    click('Check the set-ups');
    advance(ANIM);
  };
  it('the four right answers win', () => {
    const l = start(2, 4) as LevelShield;
    answer(l);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/Shielding does not work the other way/);
  });
  it('wrong set-ups are counted without being named', () => {
    const l = start(2, 4) as LevelShield;
    answer(l, 2);
    expect(feedback()).toMatch(/2 of the 4 set-ups are wrong/);
    expect(wins).toEqual([]);
  });
  it('needs all four answered first, for free', () => {
    const l = start(2, 4) as LevelShield;
    click(`Set-up 1: the probe feels ${l.tiles[0].field ? 'a field' : 'no field'}`);
    click('Check the set-ups');
    expect(feedback()).toMatch(/Answer all four/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('an answer can be changed before checking', () => {
    const l = start(2, 4) as LevelShield;
    l.tiles.forEach((t, i) => click(`Set-up ${i + 1}: the probe feels ${t.field ? 'no field' : 'a field'}`)); // all wrong first
    l.tiles.forEach((t, i) => click(`Set-up ${i + 1}: the probe feels ${t.field ? 'a field' : 'no field'}`)); // then right
    click('Check the set-ups');
    advance(ANIM);
    expect(wins).toEqual([3]);
  });
});

describe('level 3: a dielectric slab', () => {
  const E = 'Field inside the dielectric in N/C';
  const go = (_l: LevelDielectric, e: number, names: string[]) => {
    typeIn(E, r6(e));
    names.forEach((n) => click(`Polar: ${n}`));
    click('Check the slab');
    advance(ANIM);
  };
  it('E₀/K and the two polar molecules win', () => {
    const l = start(3, 5) as LevelDielectric;
    go(l, l.answer, l.molecules.filter((m) => m.polar).map((m) => m.name));
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/dielectric constant K/);
  });
  it('forgetting the dielectric, or ticking a non-polar molecule, is caught separately', () => {
    const l = start(3, 5) as LevelDielectric;
    go(l, l.e0, [l.molecules.find((m) => !m.polar)!.name]);
    expect(feedback()).toMatch(/reduces the applied field by the factor K/);
    expect(feedback()).toMatch(/set of polar molecules is not right/);
  });
  it('a ticked molecule toggles off again, and an empty selection is refused for free', () => {
    const l = start(3, 5) as LevelDielectric;
    const name = l.molecules[0].name;
    typeIn(E, r6(l.answer));
    click(`Polar: ${name}`);
    click(`Polar: ${name}`);
    expect(btn(`Polar: ${name}`)!.getAttribute('aria-pressed')).toBe('false');
    click('Check the slab');
    expect(feedback()).toMatch(/Tick the molecules that are polar/);
    expect(feedback()).toMatch(/does not cost/);
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
