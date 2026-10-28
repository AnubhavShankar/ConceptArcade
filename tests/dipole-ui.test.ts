// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/dipole-bench/index';
import { buildLevel, type Level, type LevelAxis, type LevelFade, type LevelMoment, type LevelStable, type LevelTorque } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/dipole-bench/logic';
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
  const m = manifest('dp');
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
const input = (label: string) => root.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
const typeIn = (label: string, v: string | number) => {
  const el = input(label);
  if (!el) throw new Error(`no input "${label}"`);
  el.value = String(v);
};
const setSlider = (label: string, v: number) => {
  const el = input(label);
  el.value = String(v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const feedback = () => $('.feedback')?.textContent ?? '';
const canvas = () => $('canvas') as HTMLCanvasElement;
const r6 = (x: number) => String(Number(x.toPrecision(6)));

describe('level 1: build a dipole', () => {
  const build = (_l: LevelMoment, q: number, sep: number, angle: number, total = 'zero') => {
    setSlider('Charge q in nC', q);
    setSlider('Separation 2a in cm', sep);
    setSlider('Direction of the moment in degrees', angle);
    click(`Total charge is ${total}`);
    click('Lock the dipole');
    advance(1.6);
  };
  it('the right charge, separation and direction win', () => {
    const l = start(1, 3) as LevelMoment;
    build(l, l.qAnswer, l.sepAnswer, l.targetAngle);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/p = q × 2a/);
  });
  it('any charge and separation with the same product is accepted', () => {
    const l = start(1, 3) as LevelMoment;
    build(l, l.qAnswer * 2 > 10 ? l.qAnswer : l.qAnswer * 2, l.qAnswer * 2 > 10 ? l.sepAnswer : l.sepAnswer / 2, l.targetAngle);
    expect(wins).toEqual([3]);
  });
  it('the meter shows the moment live', () => {
    start(1, 3);
    setSlider('Charge q in nC', 4);
    setSlider('Separation 2a in cm', 10);
    step(50);
    expect($('.v-readout')!.textContent).toBe('p = 4 × 10⁻¹⁰ C m');
  });
  it('a wrong total charge costs a star even when the dipole is right, and says why', () => {
    const l = start(1, 3) as LevelMoment;
    build(l, l.qAnswer, l.sepAnswer, l.targetAngle, 'q');
    expect(wins).toEqual([2]);
    expect(feedback()).toMatch(/total charge is zero/);
  });
  it('a wrong moment or direction is called out, the first miss is free', () => {
    const l = start(1, 3) as LevelMoment;
    build(l, l.qAnswer, l.sepAnswer, (l.targetAngle + 90) % 360);
    expect(feedback()).toMatch(/does not point the way/);
    expect(feedback()).toMatch(/0 free tests left/);
    build(l, l.qAnswer === 6 ? 3 : l.qAnswer + 1, l.sepAnswer, l.targetAngle);
    expect(feedback()).toMatch(/(too large|too small)/);
    expect(feedback()).toMatch(/cost a star/);
  });
  it('asks about the total charge first, for free', () => {
    start(1, 3);
    click('Lock the dipole');
    expect(feedback()).toMatch(/total charge/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 2: hold it still', () => {
  const brake = (_l: LevelTorque, tau: number, force = 'zero') => {
    click(`Net force is ${force === 'zero' ? 'zero' : 'not zero'}`);
    typeIn('Brake torque in N m', r6(tau));
    click('Apply the brake');
    advance(3.4);
  };
  it('the torque p E sin θ holds it, with the force prediction right', () => {
    const l = start(2, 4) as LevelTorque;
    brake(l, l.answer);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/τ = p E sin θ/);
  });
  it('too weak a brake lets it swing towards the field, too strong drags it away; the first miss is free', () => {
    const l = start(2, 4) as LevelTorque;
    brake(l, l.answer * 0.5);
    expect(feedback()).toMatch(/swings towards the field/);
    expect(feedback()).toMatch(/0 free tests left/);
    brake(l, l.answer * 1.8);
    expect(feedback()).toMatch(/dragged away from the field/);
    expect(feedback()).toMatch(/cost a star/);
    brake(l, l.answer);
    expect(wins).toEqual([2]);
  });
  it('saying the net force is not zero costs a star and explains the equal and opposite forces', () => {
    const l = start(2, 4) as LevelTorque;
    brake(l, l.answer, 'not-zero');
    expect(wins).toEqual([2]);
    expect(feedback()).toMatch(/equal and opposite/);
  });
  it('rejects a missing prediction or a silly torque for free', () => {
    const l = start(2, 4) as LevelTorque;
    typeIn('Brake torque in N m', r6(l.answer));
    click('Apply the brake');
    expect(feedback()).toMatch(/net force on the dipole is first/);
    click('Net force is zero');
    typeIn('Brake torque in N m', '-3');
    click('Apply the brake');
    expect(feedback()).toMatch(/positive number of N m/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the dipole swings (phase testing) before the verdict, and a miss can be retried', () => {
    const l = start(2, 4) as LevelTorque;
    click('Net force is zero');
    typeIn('Brake torque in N m', r6(l.answer * 0.4));
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    click('Apply the brake');
    advance(0.4);
    expect(canvas().dataset.phase).toBe('testing');
    expect(feedback()).toBe('');
    advance(3);
    expect(feedback()).not.toBe('');
    typeIn('Brake torque in N m', r6(l.answer));
    click('Apply the brake');
    advance(3.4);
    expect(wins).toEqual([3]); // the first miss was the free one
  });
});

describe('level 3: which way is stable?', () => {
  const nudgeAt = (angle: number) => {
    setSlider('Orientation of the dipole in degrees', angle);
    click('Give it a nudge');
    advance(8);
  };
  const snap = (a: number) => ((Math.round(a / 5) * 5) % 360 + 360) % 360;
  it('along the field is stable and wins', () => {
    const l = start(3, 5) as LevelStable;
    nudgeAt(snap(l.fieldAngle));
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/unstable equilibrium/);
  });
  it('against the field flips round: an unstable equilibrium, and it costs a star after the free test', () => {
    const l = start(3, 5) as LevelStable;
    nudgeAt(snap(l.fieldAngle + 180));
    expect(feedback()).toMatch(/flips right round/);
    expect(feedback()).toMatch(/0 free tests left/);
    nudgeAt(snap(l.fieldAngle + 180));
    expect(feedback()).toMatch(/cost a star/);
    nudgeAt(snap(l.fieldAngle));
    expect(wins).toEqual([2]);
  });
  it('sideways is not an equilibrium at all', () => {
    const l = start(3, 5) as LevelStable;
    nudgeAt(snap(l.fieldAngle + 90));
    expect(feedback()).toMatch(/not in equilibrium/);
    expect(wins).toEqual([]);
  });
  it('the nudge runs for a while (phase testing), then the dipole is free to be turned again', () => {
    const l = start(3, 5) as LevelStable;
    setSlider('Orientation of the dipole in degrees', snap(l.fieldAngle + 90));
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    click('Give it a nudge');
    advance(2);
    expect(canvas().dataset.phase).toBe('testing');
    advance(6);
    expect(canvas().dataset.phase).not.toBe('testing');
  });
});

describe('level 4: axis or equator?', () => {
  const measure = (l: LevelAxis, v: number, along: 1 | -1 = l.along) => {
    typeIn('Field at the probe in N/C', r6(v));
    click(along > 0 ? 'Along the moment' : 'Against the moment');
    click('Measure at the probe');
    advance(1.6);
  };
  it('the right strength and direction win, for both places', () => {
    const seen = new Set<string>();
    for (const where of ['axis', 'equator'] as const) {
      let seed = 1;
      for (; seed < 300; seed++) if ((buildLevel(4, createRng(seed)) as LevelAxis).where === where) break;
      const l = start(4, seed) as LevelAxis;
      seen.add(l.where);
      wins = [];
      measure(l, l.answer);
      expect(wins).toEqual([3]);
    }
    expect(seen.size).toBe(2);
  });
  it('the wrong direction is flagged, and the axis/equator mix-up gives a wrong strength', () => {
    const l = start(4, 6) as LevelAxis;
    measure(l, l.answer, (-l.along) as 1 | -1);
    expect(feedback()).toMatch(/other way round/);
    measure(l, l.where === 'axis' ? l.answer / 2 : l.answer * 2);
    expect(feedback()).toMatch(/too (large|small)/);
    expect(feedback()).toMatch(/cost a star/);
  });
  it('asks for strength and direction first, for free', () => {
    const l = start(4, 6) as LevelAxis;
    click('Measure at the probe');
    expect(feedback()).toMatch(/positive number of N\/C/);
    typeIn('Field at the probe in N/C', r6(l.answer));
    click('Measure at the probe');
    expect(feedback()).toMatch(/along the moment or against it/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 5: how fast it fades', () => {
  const move = (k: string | number) => {
    typeIn('How many times farther', k);
    click('Move the probe');
    advance(3.2);
  };
  it('the right multiple wins, and the explanation compares with a single charge', () => {
    const l = start(5, 7) as LevelFade;
    move(r6(l.kAnswer));
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/single charge/);
  });
  it('too near and too far are told apart, with the field fraction reached', () => {
    const l = start(5, 7) as LevelFade;
    move(r6(l.kAnswer * 0.7 < 1.05 ? 1.05 : l.kAnswer * 0.7));
    expect(feedback()).toMatch(/too near/);
    move(r6(Math.min(4, l.kAnswer * 1.3)));
    expect(feedback()).toMatch(/too far/);
    expect(feedback()).toMatch(/cost a star/);
  });
  it('the single-charge answer (square root instead of cube root) is a miss', () => {
    const l = start(5, 7) as LevelFade;
    move(r6(Math.sqrt(1 / l.fraction) > 4 ? 4 : Math.sqrt(1 / l.fraction)));
    expect(wins).toEqual([]);
  });
  it('rejects a multiple outside 1 to 4 for free', () => {
    start(5, 7);
    for (const bad of ['', '0.5', '9', 'x']) {
      typeIn('How many times farther', bad);
      click('Move the probe');
      expect(feedback()).toMatch(/between 1 and 4/);
      expect(feedback()).toMatch(/does not cost/);
    }
  });
});

describe('robustness', () => {
  it('every level mounts and draws frames without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4, 5]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      advance(0.6);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
