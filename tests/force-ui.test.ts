// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/force-lab/index';
import { buildLevel, type Dir, type Level, type LevelCircle, type LevelHelix, type LevelLorentz, type LevelSpeed, type LevelWire } from '../src/games/physics/class-12/ch04-moving-charges-and-magnetism/force-lab/logic';
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
  const m = manifest('fl');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 5, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop?.();
  stop = game.mount(ctx);
  return buildLevel(level, createRng(seed)) as Level;
}
const seedFor = (level: number, ok: (l: Level) => boolean) => {
  for (let s = 1; s < 600; s++) if (ok(buildLevel(level, createRng(s)))) return s;
  throw new Error('no seed');
};
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
const RUN = 5;

describe('level 1: which way is the push', () => {
  it('direction and force win; the charge streams (idle) then curves (testing)', () => {
    const l = start(1, 4) as LevelLorentz;
    advance(0.5);
    expect(canvas().dataset.phase).toBe('idle');
    click(`Force points ${l.dir}`);
    typeIn('Force in 10⁻¹³ N', r6(l.f13));
    click('Fire the charge');
    advance(0.8);
    expect(canvas().dataset.phase).toBe('testing');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/q v × B/);
  });
  it('the opposite direction is flagged under the direction only, without naming it', () => {
    const l = start(1, 4) as LevelLorentz;
    const opposite: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
    click(`Force points ${opposite[l.dir]}`);
    typeIn('Force in 10⁻¹³ N', r6(l.f13));
    click('Fire the charge');
    expect(feedback()).toMatch(/direction is not right/);
    expect(feedback()).not.toMatch(/size is not right/);
    expect(feedback()).not.toContain(`points ${l.dir}`);
  });
  it('needs a direction, for free', () => {
    const l = start(1, 4) as LevelLorentz;
    typeIn('Force in 10⁻¹³ N', r6(l.f13));
    click('Fire the charge');
    expect(feedback()).toMatch(/Choose the direction/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 2: force on a wire', () => {
  it('force mode: the force in mN wins', () => {
    const l = start(2, seedFor(2, (x) => (x as LevelWire).mode === 'force')) as LevelWire;
    typeIn('Force on the wire in mN', r6(l.answer));
    click('Switch on the field');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('levitate mode: too small a field says the wire sags, too large says it shoots up', () => {
    const l = start(2, seedFor(2, (x) => (x as LevelWire).mode === 'levitate')) as LevelWire;
    typeIn('Field needed in T', r6(l.answer / 2));
    click('Release the wire');
    expect(feedback()).toMatch(/sags/);
    advance(RUN);
    typeIn('Field needed in T', r6(l.answer * 2));
    click('Release the wire');
    expect(feedback()).toMatch(/shoots up/);
    advance(RUN);
    typeIn('Field needed in T', r6(l.answer));
    click('Release the wire');
    advance(RUN);
    expect(wins).toEqual([2]);
  });
});

describe('level 3: round and round', () => {
  it('r and f win', () => {
    const l = start(3, 5) as LevelCircle;
    typeIn('Orbit radius in cm', r6(l.rCm));
    typeIn('Frequency in MHz', r6(l.fMHz));
    click('Fire the electron');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/centripetal/);
  });
  it('a wrong frequency is flagged under the frequency only', () => {
    const l = start(3, 5) as LevelCircle;
    typeIn('Orbit radius in cm', r6(l.rCm));
    typeIn('Frequency in MHz', r6(l.fMHz * 2 * Math.PI));
    click('Fire the electron');
    expect(feedback()).toMatch(/frequency is not right/);
    expect(feedback()).not.toMatch(/radius is not right/);
  });
});

describe('level 4: faster electron', () => {
  it('the new radius and "unchanged" win; a wrong frequency choice is a miss', () => {
    const l = start(4, 3) as LevelSpeed;
    typeIn('New orbit radius in cm', r6(l.r2Cm));
    click('Frequency increases');
    click('Change the speed');
    expect(feedback()).toMatch(/Think again about the frequency/);
    advance(RUN);
    click('Frequency unchanged');
    click('Change the speed');
    advance(RUN);
    expect(wins).toEqual([3]);
  });
  it('needs a frequency choice, for free', () => {
    const l = start(4, 3) as LevelSpeed;
    typeIn('New orbit radius in cm', r6(l.r2Cm));
    click('Change the speed');
    expect(feedback()).toMatch(/Choose what happens/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 5: the helix', () => {
  it('radius and pitch win', () => {
    const l = start(5, 6) as LevelHelix;
    typeIn('Helix radius in cm', r6(l.rCm));
    typeIn('Pitch in cm', r6(l.pitchCm));
    click('Fire the electron');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/pitch/);
  });
  it('using the full speed for the radius is flagged under the radius', () => {
    const l = start(5, 6) as LevelHelix;
    typeIn('Helix radius in cm', r6(l.rCm / Math.sin((l.theta * Math.PI) / 180)));
    typeIn('Pitch in cm', r6(l.pitchCm));
    click('Fire the electron');
    expect(feedback()).toMatch(/radius is not right/);
    expect(feedback()).not.toMatch(/pitch is not right/);
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
