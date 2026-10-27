// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/potential-bench/index';
import { buildLevel, type Level, type LevelDipole, type LevelPoint, type LevelPolygon, type LevelZero } from '../src/games/physics/class-12/ch02-electrostatic-potential-and-capacitance/potential-bench/logic';
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
  const m = manifest('pb');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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
const ANIM = 1.6;

describe('level 1: probe the potential', () => {
  const SL = 'Probe distance from the charge in cm';
  const go = (l: LevelPoint, r: number, w: number) => {
    setSlider(SL, r);
    typeIn('Work to bring the test charge in mJ', r6(w));
    click('Lock the probe');
    advance(ANIM);
    void l;
  };
  it('the right distance and the work qV win, for both signs of charge', () => {
    for (const sign of [1, -1]) {
      const l = start(1, seedFor(1, (x) => Math.sign((x as LevelPoint).Q) === sign)) as LevelPoint;
      wins = [];
      go(l, l.rAnswer, l.work);
      expect(wins).toEqual([3]);
      expect($('.solution')?.textContent).toMatch(/scalar/);
    }
  });
  it('the meter shows the potential live, signed', () => {
    const l = start(1, 3) as LevelPoint;
    setSlider(SL, 10);
    step(50);
    expect($('.v-readout')!.textContent).toMatch(l.Q > 0 ? /^V = [\d.]+/ : /^V = [-−]|^V = -/);
  });
  it('the work needs the right sign: a negative charge gives negative work', () => {
    const l = start(1, seedFor(1, (x) => (x as LevelPoint).Q < 0)) as LevelPoint;
    go(l, l.rAnswer, -l.work);
    expect(feedback()).toMatch(/carries the sign of V/);
    expect(wins).toEqual([]);
  });
  it('a wrong distance is flagged, the first miss is free', () => {
    const l = start(1, 3) as LevelPoint;
    go(l, l.rAnswer < 20 ? l.rAnswer + 5 : l.rAnswer - 5, l.work);
    expect(feedback()).toMatch(/potential at the probe is (too large|too small)/);
    expect(feedback()).toMatch(/0 free tests left/);
    go(l, l.rAnswer < 20 ? l.rAnswer + 5 : l.rAnswer - 5, l.work);
    expect(feedback()).toMatch(/cost a star/);
  });
  it('rejects an empty work value for free', () => {
    start(1, 3);
    click('Lock the probe');
    expect(feedback()).toMatch(/Enter the work in mJ/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the verdict animates and the controls lock after the win', () => {
    const l = start(1, 3) as LevelPoint;
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    setSlider(SL, l.rAnswer);
    typeIn('Work to bring the test charge in mJ', r6(l.work));
    click('Lock the probe');
    step(50);
    expect(canvas().dataset.phase).toBe('testing');
    advance(ANIM);
    expect(btn('Lock the probe')!.disabled).toBe(true);
    expect(wins).toHaveLength(1);
  });
});

describe('level 2: add them up', () => {
  const go = (v: number, f: 'zero' | 'not zero' = 'zero') => {
    typeIn('Potential at the centre in V', r6(v));
    click(`The field at the centre is ${f}`);
    click('Check the centre');
    advance(ANIM);
  };
  it('the sum of potentials and "the field is zero" win', () => {
    const l = start(2, 4) as LevelPolygon;
    go(l.answer);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/scalars/);
  });
  it('dividing by n (cancelling like a vector) or saying the field is not zero is caught separately', () => {
    const l = start(2, 4) as LevelPolygon;
    go(l.answer / l.n, 'not zero');
    expect(feedback()).toMatch(/potentials are scalars/);
    expect(feedback()).toMatch(/field is a vector/);
  });
  it('needs a number and an answer about the field first, for free', () => {
    const l = start(2, 4) as LevelPolygon;
    click('Check the centre');
    expect(feedback()).toMatch(/Enter the potential in volts/);
    typeIn('Potential at the centre in V', r6(l.answer));
    click('Check the centre');
    expect(feedback()).toMatch(/whether the field at the centre is zero/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: where is it zero?', () => {
  const go = (b: number, o: number) => {
    typeIn('Zero point between the charges in cm', r6(b));
    typeIn('Zero point outside the charges in cm', r6(o));
    click('Check the zero points');
    advance(ANIM);
  };
  it('both zero points win, whichever charge is positive', () => {
    for (const sign of [1, -1]) {
      const l = start(3, seedFor(3, (x) => Math.sign((x as LevelZero).big) === sign)) as LevelZero;
      wins = [];
      go(l.between, l.outside);
      expect(wins).toEqual([3]);
    }
    expect($('.solution')?.textContent).toMatch(/ratio of their magnitudes|ratio of the charges|ratio/);
  });
  it('the midpoint (the classic mistake) is called out, and the outside point is judged separately', () => {
    const l = start(3, 5) as LevelZero;
    go(l.d / 2, l.outside * 2);
    expect(feedback()).toMatch(/between the charges is not right/);
    expect(feedback()).toMatch(/outside is not right/);
  });
  it('the live meter changes sign as the probe crosses a zero', () => {
    const l = start(3, 5) as LevelZero;
    const read = (x: number) => {
      setSlider('Probe position along the line in cm', x);
      step(50);
      return $('.v-readout')!.textContent!;
    };
    const left = read(Math.max(-18, Math.floor(l.between * 2) / 2 - 2));
    const right = read(Math.min(l.d + 18, Math.ceil(l.between * 2) / 2 + 2));
    expect(left.includes('-') || left.includes('−')).not.toBe(right.includes('-') || right.includes('−'));
  });
  it('rejects empty or non-positive input for free', () => {
    start(3, 5);
    click('Check the zero points');
    expect(feedback()).toMatch(/positive numbers of cm/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 4: the dipole’s potential', () => {
  const go = (v: number) => {
    typeIn('Potential at the probe in V', String(v));
    click('Measure the potential');
    advance(ANIM);
  };
  it('the formula value wins, including exactly zero on the equatorial plane', () => {
    for (const equatorial of [false, true]) {
      const l = start(4, seedFor(4, (x) => ((x as LevelDipole).theta === 90) === equatorial)) as LevelDipole;
      wins = [];
      go(Number(l.answer.toPrecision(6)));
      expect(wins).toEqual([3]);
    }
  });
  it('the wrong sign is pointed out, and a non-zero answer on the equator is a miss', () => {
    const l = start(4, seedFor(4, (x) => (x as LevelDipole).theta !== 90)) as LevelDipole;
    go(-Number(l.answer.toPrecision(6)));
    expect(feedback()).toMatch(/sign is wrong/);
    const e = start(4, seedFor(4, (x) => (x as LevelDipole).theta === 90)) as LevelDipole;
    go(50);
    expect(feedback()).toMatch(/not that large there/);
    void e;
  });
  it('rejects an empty value for free', () => {
    start(4, 3);
    click('Measure the potential');
    expect(feedback()).toMatch(/Enter the potential in volts/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('robustness', () => {
  it('every level mounts, paints its potential map and animates without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      advance(0.8);
      expect(canvas().dataset.phase).toBe('idle');
    }
    expect(err).not.toHaveBeenCalled();
  });
});
