// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/field-bench/index';
import { buildLevel, type Level, type LevelJet, type LevelPair, type LevelPoint, type LevelTracks } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/field-bench/logic';
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
  const m = manifest('fb');
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
const feedback = () => $('.feedback')?.textContent ?? '';
const canvas = () => $('canvas') as HTMLCanvasElement;
const r6 = (x: number) => String(Number(x.toPrecision(6)));
const SETTLE = 1.6;
const JET = 4.5;

describe('level 1: probe the field', () => {
  const setR = (r: number) => {
    const s = input('Probe distance from the source in cm');
    s.value = String(r);
    s.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const truth = (l: LevelPoint) => (l.Q > 0 ? 'Pulled towards the source' : 'Pushed away from the source');
  const untruth = (l: LevelPoint) => (l.Q > 0 ? 'Pushed away from the source' : 'Pulled towards the source');
  it('the right distance and the right force direction win, and the working is shown', () => {
    const l = start(1, 3) as LevelPoint;
    setR(l.rAnswer);
    click(truth(l));
    click('Place the test charge');
    advance(SETTLE);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/E = k Q \/ r²/);
  });
  it('the meter shows the field live as the probe moves', () => {
    const l = start(1, 3) as LevelPoint;
    step(50);
    const a = $('.v-readout')!.textContent;
    setR(l.rAnswer);
    step(50);
    const b = $('.v-readout')!.textContent;
    expect(a).toMatch(/^E = [\d.]+( × 10[⁰-⁹]+)? N\/C$/);
    expect(b).not.toBe(a);
    expect(b).toContain(String(Math.round(l.target)).slice(0, 2));
  });
  it('asks for the prediction first, for free', () => {
    const l = start(1, 3) as LevelPoint;
    setR(l.rAnswer);
    click('Place the test charge');
    expect(feedback()).toMatch(/Say which way you expect/);
    expect(feedback()).toMatch(/does not cost you anything/);
    expect(wins).toEqual([]);
  });
  it('a wrong distance is called too strong or too weak, the first test is free, the second costs', () => {
    const l = start(1, 3) as LevelPoint;
    click(truth(l));
    setR(Math.max(5, l.rAnswer * 0.6));
    click('Place the test charge');
    expect(feedback()).toMatch(/stronger than the target/);
    expect(feedback()).toMatch(/0 free tests left/);
    setR(Math.min(60, l.rAnswer * 1.6));
    click('Place the test charge');
    expect(feedback()).toMatch(/weaker than the target/);
    expect(feedback()).toMatch(/cost a star/);
    setR(l.rAnswer);
    click('Place the test charge');
    advance(SETTLE);
    expect(wins).toEqual([2]);
  });
  it('a wrong force direction is explained in terms of the sign of the source', () => {
    const l = start(1, 3) as LevelPoint;
    setR(l.rAnswer);
    click(untruth(l));
    click('Place the test charge');
    expect(feedback()).toMatch(l.Q > 0 ? /pulled towards a positive source/ : /pushed away from a negative source/);
    expect(feedback()).toMatch(/opposite to the field/);
  });
  it('animates the test charge and settles; controls lock after the win', () => {
    const l = start(1, 3) as LevelPoint;
    setR(l.rAnswer);
    click(truth(l));
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    click('Place the test charge');
    step(50);
    expect(canvas().dataset.phase).toBe('testing');
    advance(SETTLE);
    expect(canvas().dataset.phase).toBe('done');
    expect(btn('Place the test charge')!.disabled).toBe(true);
    expect(wins).toHaveLength(1);
  });
});

describe('level 2: two charges, one point', () => {
  const place = (q: string | number) => {
    typeIn('Test charge at P in nC', q);
    click('Place the test charge');
    advance(SETTLE);
  };
  it('the test charge from the vector sum wins; the explanation uses superposition', () => {
    const l = start(2, 4) as LevelPair;
    place(l.qAnswer);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/superposition/);
  });
  it('the right size with the wrong sign points the force the wrong way', () => {
    const l = start(2, 4) as LevelPair;
    place(-l.qAnswer);
    expect(feedback()).toMatch(/the wrong way/);
    expect(wins).toEqual([]);
  });
  it('a wrong size says too strong or too weak without giving the field', () => {
    const l = start(2, 4) as LevelPair;
    place(l.qAnswer * 2);
    expect(feedback()).toMatch(/too strong/);
    place(l.qAnswer / 2);
    expect(feedback()).toMatch(/too weak/);
    expect(feedback()).toMatch(/cost a star/);
    expect(feedback()).not.toMatch(/N\/C/);
  });
  it('rejects empty and zero charge for free', () => {
    start(2, 4);
    for (const bad of ['', '0', 'q']) {
      typeIn('Test charge at P in nC', bad);
      click('Place the test charge');
      expect(feedback()).toMatch(/Enter the test charge in nC/);
      expect(feedback()).toMatch(/does not cost/);
    }
    expect(wins).toEqual([]);
  });
});

describe('levels 3 and 5: the ink-jet', () => {
  const fire = (l: LevelJet, e: string | number, dir: 1 | -1 = l.dirAnswer) => {
    click(dir > 0 ? 'Field up' : 'Field down');
    typeIn('Field strength in N/C', e);
    click('Fire the drops');
    advance(JET);
  };
  it('the right field direction and strength land the drops on the spot', () => {
    for (const level of [3, 5]) {
      const l = start(level, 5) as LevelJet;
      wins = [];
      fire(l, r6(l.eAnswer));
      expect(wins).toEqual([3]);
      expect(feedback()).toMatch(/on the spot/);
    }
  });
  it('level 5 explains the extra shift over the gap, level 3 does not', () => {
    const l5 = start(5, 5) as LevelJet;
    fire(l5, r6(l5.eAnswer));
    expect($('.solution')?.textContent).toMatch(/gap D/);
    const l3 = start(3, 5) as LevelJet;
    fire(l3, r6(l3.eAnswer));
    expect($('.solution')?.textContent).not.toMatch(/gap D/);
  });
  it('the wrong field direction bends the drops the wrong way, and the sign rule is stated', () => {
    const l = start(3, 5) as LevelJet;
    fire(l, r6(l.eAnswer), (-l.dirAnswer) as 1 | -1);
    expect(feedback()).toMatch(/bend (up|down), away from the target/);
    expect(feedback()).toMatch(/(positive drop moves along|negative drop moves against) the field/);
    expect(wins).toEqual([]);
  });
  it('too weak and too strong are told apart; the first miss is free', () => {
    const l = start(3, 5) as LevelJet;
    fire(l, r6(l.eAnswer * 0.6));
    expect(feedback()).toMatch(/short of the marked spot/);
    expect(feedback()).toMatch(/0 free tests left/);
    fire(l, r6(l.eAnswer * 1.7));
    expect(feedback()).toMatch(/beyond the marked spot/);
    expect(feedback()).toMatch(/cost a star/);
  });
  it('asks for a direction and a strength first, for free', () => {
    const l = start(3, 5) as LevelJet;
    typeIn('Field strength in N/C', r6(l.eAnswer));
    click('Fire the drops');
    expect(feedback()).toMatch(/Choose whether the field points up or down/);
    expect(feedback()).toMatch(/does not cost/);
    click('Field up');
    typeIn('Field strength in N/C', '-5');
    click('Fire the drops');
    expect(feedback()).toMatch(/positive number of N\/C/);
    expect(wins).toEqual([]);
  });
  it('the drops fly (phase testing), then land (phase done), and the verdict arrives only after they land', () => {
    const l = start(3, 5) as LevelJet;
    click(l.dirAnswer > 0 ? 'Field up' : 'Field down');
    typeIn('Field strength in N/C', r6(l.eAnswer * 0.5));
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    click('Fire the drops');
    advance(0.5);
    expect(canvas().dataset.phase).toBe('testing');
    expect(feedback()).toBe('');
    advance(JET);
    expect(canvas().dataset.phase).toBe('done');
    expect(feedback()).not.toBe('');
  });
  it('both signs of drop and both target sides turn up', () => {
    const seen = new Set<string>();
    for (let s = 1; s < 60; s++) {
      const l = buildLevel(3, createRng(s * 7919)) as LevelJet;
      seen.add(`${Math.sign(l.drop.q)}/${Math.sign(l.yTarget)}`);
    }
    expect(seen.size).toBe(4);
  });
});

describe('level 4: the track chamber', () => {
  const tag = (l: LevelTracks) => {
    l.tracks.forEach((t) => click(`Track ${t.id} ${t.q > 0 ? 'positive' : 'negative'}`));
  };
  it('firing, then tagging every sign and the highest q/m correctly wins', () => {
    const l = start(4, 6) as LevelTracks;
    click('Fire all three particles');
    advance(3);
    tag(l);
    click(`Track ${l.highest} has the highest charge-to-mass ratio`);
    click('Submit the tags');
    advance(1);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/charge-to-mass/);
  });
  it('asks you to fire first, and to tag everything, for free', () => {
    const l = start(4, 6) as LevelTracks;
    click('Submit the tags');
    expect(feedback()).toMatch(/Fire the particles and watch/);
    click('Fire all three particles');
    click('Submit the tags');
    expect(feedback()).toMatch(/Tag all three tracks/);
    expect(feedback()).toMatch(/does not cost/);
    void l;
  });
  it('a wrong sign is counted without saying which, and a wrong ranking is flagged; each miss costs a star', () => {
    const l = start(4, 6) as LevelTracks;
    click('Fire all three particles');
    advance(3);
    l.tracks.forEach((t, i) => click(`Track ${t.id} ${(i === 0 ? t.q < 0 : t.q > 0) ? 'positive' : 'negative'}`));
    click(`Track ${(l.highest % 3) + 1} has the highest charge-to-mass ratio`);
    click('Submit the tags');
    expect(feedback()).toMatch(/1 of the 3 signs is wrong/);
    expect(feedback()).toMatch(/highest charge-to-mass ratio is not the one you picked/);
    expect(feedback()).toMatch(/cost a star/);
    expect(feedback()).not.toMatch(new RegExp(`Track ${l.highest} `));
    tag(l);
    click(`Track ${l.highest} has the highest charge-to-mass ratio`);
    click('Submit the tags');
    advance(1);
    expect(wins).toEqual([2]);
  });
  it('the tracks animate while firing', () => {
    start(4, 6);
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    click('Fire all three particles');
    advance(0.5);
    expect(canvas().dataset.phase).toBe('testing');
    advance(2.5);
    expect(canvas().dataset.phase).toBe('done');
  });
  it('different seeds give different track layouts, with both signs appearing', () => {
    const seeds = new Set<string>();
    for (let s = 1; s < 60; s++) seeds.add((buildLevel(4, createRng(s * 7919)) as LevelTracks).tracks.map((t) => Math.sign(t.q)).join(','));
    expect(seeds.size).toBeGreaterThan(4);
  });
});

describe('robustness', () => {
  it('every level mounts, draws a few frames and shows its story without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4, 5]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      advance(0.5);
      expect(canvas()).not.toBeNull();
    }
    expect(err).not.toHaveBeenCalled();
  });
});
