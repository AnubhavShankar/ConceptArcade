// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/field-line-detective/index';
import { buildLevel, FLAW_RULE, strengthsAt, type Flaw, type Level, type LevelFlaw, type LevelRank, type LevelRead, type LevelRelease, type Pt } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/field-line-detective/logic';
import { createRng } from '../src/core/random';
import type { GameContext } from '../src/core/types';
import { manifest } from './fixtures';

const W = 640;
const H = 340;
const K = W / 48;
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
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop?.();
  stop = game.mount(ctx);
  (root.querySelector('canvas') as HTMLCanvasElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H, right: W, bottom: H, x: 0, y: 0, toJSON: () => ({}) });
  return buildLevel(level, createRng(seed)) as Level;
}
const seedFor = (level: number, ok: (l: Level) => boolean) => {
  for (let s = 1; s < 800; s++) if (ok(buildLevel(level, createRng(s)))) return s;
  throw new Error('no seed');
};
const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;
const btn = (label: string) => root.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement | null;
const click = (label: string) => {
  const b = btn(label);
  if (!b) throw new Error(`no button "${label}"`);
  b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
const canvas = () => $('canvas') as HTMLCanvasElement;
/** Tap the diagram at a place given in cm. */
const tap = (p: Pt) => canvas().dispatchEvent(new MouseEvent('click', { clientX: W / 2 + p.x * K, clientY: H / 2 - p.y * K, bubbles: true }));
const feedback = () => $('.feedback')?.textContent ?? '';
const ANIM = 1.6;

describe('level 1: spot the fault', () => {
  it('tapping the fault and naming its rule wins, for every kind of fault', () => {
    for (const kind of ['cross', 'loop', 'gap', 'arrow'] as Flaw[]) {
      const l = start(1, seedFor(1, (x) => (x as LevelFlaw).flaw === kind)) as LevelFlaw;
      wins = [];
      tap(l.at);
      click(FLAW_RULE[kind]);
      click('Report the fault');
      advance(ANIM);
      expect(wins).toEqual([3]);
      expect($('.solution')?.textContent).toMatch(/The fault was/);
    }
  });
  it('asks for a tap and a rule first, for free', () => {
    const l = start(1, 3) as LevelFlaw;
    click('Report the fault');
    expect(feedback()).toMatch(/Tap the fault on the diagram first/);
    tap(l.at);
    click('Report the fault');
    expect(feedback()).toMatch(/Choose which rule/);
    expect(feedback()).toMatch(/does not cost/);
    expect(wins).toEqual([]);
  });
  it('a tap in the wrong place misses without saying where the fault is', () => {
    const l = start(1, 3) as LevelFlaw;
    tap({ x: l.at.x > 0 ? l.at.x - 14 : l.at.x + 14, y: l.at.y });
    click(FLAW_RULE[l.flaw]);
    click('Report the fault');
    expect(feedback()).toMatch(/not where you tapped/);
    expect(feedback()).toMatch(/free test/);
    expect(feedback()).not.toMatch(/\d\.\d/);
  });
  it('the right place with the wrong rule is told apart, and the second miss costs a star', () => {
    const l = start(1, 3) as LevelFlaw;
    const other = (Object.keys(FLAW_RULE) as Flaw[]).find((k) => k !== l.flaw)!;
    tap(l.at);
    click(FLAW_RULE[other]);
    click('Report the fault');
    expect(feedback()).toMatch(/breaks a different rule/);
    click('Report the fault');
    expect(feedback()).toMatch(/cost a star/);
    click(FLAW_RULE[l.flaw]);
    click('Report the fault');
    advance(ANIM);
    expect(wins).toEqual([2]);
  });
  it('animates the verdict and locks the controls after the win', () => {
    const l = start(1, 3) as LevelFlaw;
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    tap(l.at);
    click(FLAW_RULE[l.flaw]);
    click('Report the fault');
    step(50);
    expect(canvas().dataset.phase).toBe('testing');
    advance(ANIM);
    expect(canvas().dataset.phase).toBe('done');
    expect(btn('Report the fault')!.disabled).toBe(true);
    expect(wins).toHaveLength(1);
  });
});

describe('level 2: read the picture', () => {
  const answer = (l: LevelRead) => {
    const [a, b] = l.sources;
    click(`Charge A is ${a.q > 0 ? 'positive' : 'negative'}`);
    click(`Charge B is ${b.q > 0 ? 'positive' : 'negative'}`);
    click(l.stronger === 'equal' ? 'The charges are equal' : `${l.stronger} is the larger charge`);
  };
  it('the right signs and the right larger charge win', () => {
    const l = start(2, 4) as LevelRead;
    answer(l);
    click('Submit the reading');
    advance(ANIM);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/proportional to the size of the charge|same number of lines/);
  });
  it('needs all three answers first, for free', () => {
    start(2, 4);
    click('Submit the reading');
    expect(feedback()).toMatch(/Answer all three questions/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('counts the wrong answers without saying which', () => {
    const l = start(2, 4) as LevelRead;
    const [a, b] = l.sources;
    click(`Charge A is ${a.q > 0 ? 'negative' : 'positive'}`);
    click(`Charge B is ${b.q > 0 ? 'negative' : 'positive'}`);
    click(l.stronger === 'equal' ? 'The charges are equal' : `${l.stronger} is the larger charge`);
    click('Submit the reading');
    expect(feedback()).toMatch(/2 of your 3 answers are wrong/);
    expect(wins).toEqual([]);
  });
  it('the picture hides the signs: the charges are drawn as plain letters', () => {
    start(2, 4);
    expect($('canvas')).not.toBeNull();
    expect(root.textContent).not.toMatch(/Charge A is \+/);
  });
});

describe('level 3: compare the strength', () => {
  const tapOrder = (l: LevelRank, order: number[]) => order.forEach((i) => tap(l.points[i].at));
  it('tapping the points from strongest to weakest wins, and the readings are shown in the explanation', () => {
    const l = start(3, 5) as LevelRank;
    tapOrder(l, l.answer);
    click('Check the order');
    advance(ANIM);
    expect(wins).toEqual([3]);
    const e = strengthsAt(l);
    expect($('.solution')?.textContent).toContain(e[l.answer[0]].toFixed(2));
  });
  it('needs all three points, for free', () => {
    const l = start(3, 5) as LevelRank;
    tap(l.points[0].at);
    click('Check the order');
    expect(feedback()).toMatch(/Tap all three points/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('a wrong order says how many places are right and does not reveal the readings', () => {
    const l = start(3, 5) as LevelRank;
    tapOrder(l, [...l.answer].reverse());
    click('Check the order');
    expect(feedback()).toMatch(/1 of the 3 places is right/);
    expect(feedback()).not.toMatch(/\d\.\d\d/);
    expect($('.solution')!.hidden).toBe(true);
  });
  it('"Start again" clears the order', () => {
    const l = start(3, 5) as LevelRank;
    tapOrder(l, l.answer);
    click('Clear my order');
    click('Check the order');
    expect(feedback()).toMatch(/Tap all three points/);
  });
  it('tapping the same point twice does not count it twice', () => {
    const l = start(3, 5) as LevelRank;
    tap(l.points[0].at);
    tap(l.points[0].at);
    tap(l.points[1].at);
    click('Check the order');
    expect(feedback()).toMatch(/Tap all three points/);
  });
});

describe('level 4: does it follow the line?', () => {
  const truth = (l: LevelRelease) => l.follows.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  const RUN = 12;
  it('choosing exactly the points on straight lines wins', () => {
    const l = start(4, 6) as LevelRelease;
    truth(l).forEach((i) => tap(l.points[i]));
    click('Release the charges');
    advance(RUN);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/inertia/);
  });
  it('needs at least one point chosen, for free', () => {
    start(4, 6);
    click('Release the charges');
    expect(feedback()).toMatch(/Tap the points where/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('a point on a curved line that you picked is reported as swinging off, and the run can be repeated', () => {
    const l = start(4, 6) as LevelRelease;
    const wrong = l.follows.findIndex((f) => !f);
    truth(l).forEach((i) => tap(l.points[i]));
    tap(l.points[wrong]);
    click('Release the charges');
    advance(RUN);
    expect(feedback()).toMatch(/1 of the charges you picked swung off their line/);
    expect(wins).toEqual([]);
    tap(l.points[wrong]); // take it back off
    click('Release the charges');
    advance(RUN);
    expect(wins).toEqual([3]); // the first miss was free
  });
  it('a point you missed is counted', () => {
    const l = start(4, 6) as LevelRelease;
    const t = truth(l);
    t.slice(1).forEach((i) => tap(l.points[i]));
    if (t.length === 1) tap(l.points[l.follows.findIndex((f) => !f)]);
    click('Release the charges');
    advance(RUN);
    expect(feedback()).toMatch(/would have followed the line|swung off/);
    expect(wins).toEqual([]);
  });
  it('the charges fly (phase testing) and the verdict comes only after they stop', () => {
    const l = start(4, 6) as LevelRelease;
    truth(l).forEach((i) => tap(l.points[i]));
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    click('Release the charges');
    advance(0.5);
    expect(canvas().dataset.phase).toBe('testing');
    expect(feedback()).toBe('');
    advance(RUN);
    expect(canvas().dataset.phase).toBe('done');
    expect(feedback()).not.toBe('');
  });
});

describe('robustness', () => {
  it('every level mounts and draws several frames without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      advance(0.5);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
