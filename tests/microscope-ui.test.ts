// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/microscope-lab/index';
import { buildGame, judgeMag, judgeScope, missText, type Game } from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/microscope-lab/logic';
import { createRng } from '../src/core/random';
import type { GameContext } from '../src/core/types';
import { manifest } from './fixtures';
import { canvasRecorder, texts } from './helpers/canvas-rec';

let step: (ms: number) => void;
let clock = 0;
let stop: (() => void) | void;
let wins: number[];
let restarts: number;
let root: HTMLElement;

beforeEach(() => {
  clock = 0;
  wins = [];
  restarts = 0;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: () => () => undefined, set: () => true }) as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 640, height: 340, right: 640, bottom: 340, x: 0, y: 0, toJSON: () => ({}) });
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
  const m = manifest('ml');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 2, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => restarts++ } as unknown as GameContext;
  stop?.();
  stop = game.mount(ctx);
  advance(0.1);
  return buildGame(level, createRng(seed));
}
const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;
const click = (label: string) => {
  const b = root.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement | null;
  if (!b) throw new Error(`no button "${label}"`);
  b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
const sliders = () => [...root.querySelectorAll('input[type="range"]')] as HTMLInputElement[];
const setSlider = (v: number, which = 0) => {
  const el = sliders()[which];
  el.value = String(v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
const feedback = () => $('.feedback')?.textContent ?? '';
const phase = () => $('canvas')!.dataset.phase;
const hud = () => $('.hud')?.textContent ?? '';
const hearts = () => ($('.hud-hearts')?.textContent ?? '').split('♥').length - 1;
const pointer = (type: string, x: number, y: number) => $('canvas')!.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
const r1 = (x: number) => Math.round(x * 10) / 10;

const FIRE = ['Take the photo at this distance', 'Crack the lock with these settings'];
const TEST = ['Test shot: measure the picture at this distance', 'Test shot: measure the picture with these settings'];
const setRight = (g: Game, k: number) => {
  if (g.kind === 'mag') {
    // the winning dial value nearest the exact spot (the window is a step or two wide, and the sharpness edge sits a hair inside it)
    const r = g.rounds[k];
    let best = 1;
    for (let u = 1; u <= r.f - 0.1; u = r1(u + 0.1)) if (judgeMag(r, u).ok && (!judgeMag(r, best).ok || Math.abs(u - r.uSol) < Math.abs(best - r.uSol))) best = u;
    setSlider(best);
  } else {
    setSlider(r1(g.rounds[k].uSol), 0);
    setSlider(r1(g.rounds[k].LSol), 1);
  }
};
const setWrong = (g: Game, k: number) => {
  if (g.kind === 'mag') setSlider(Math.max(1, r1(g.rounds[k].uSol) - 1));
  else {
    setSlider(r1(g.rounds[k].uSol) + 1, 0);
    setSlider(r1(g.rounds[k].LSol), 1);
  }
};
const solveRound = (level: number, g: Game, k: number) => {
  setRight(g, k);
  click(FIRE[level - 1]);
  advance(2.8);
};

describe('the arcade shell around every level', () => {
  it('opens with a hero banner, three hearts, round 1 of 3 and a score of 0', () => {
    for (const level of [1, 2]) {
      start(level, 4);
      expect($('.hero .hero-name')?.textContent?.length).toBeGreaterThan(3);
      expect($('.hero .objective')?.textContent).toMatch(/^Objective:/);
      expect(hearts()).toBe(3);
      expect(hud()).toMatch(/Round 1 of 3/);
      expect(hud()).toMatch(/Score 0/);
      expect(phase()).toBe('play');
    }
  });
  it('plays a whole level: three rounds, a growing score, a BOSS round, then 3 stars', () => {
    for (const level of [1, 2]) {
      const g = start(level, 6);
      let last = 0;
      for (let k = 0; k < 3; k++) {
        if (k === 2) expect(hud()).toMatch(/Round 3 of 3 · BOSS/);
        solveRound(level, g, k);
        const score = Number(/Score (\d+)/.exec(hud())![1]);
        expect(score).toBeGreaterThan(last);
        last = score;
        if (k < 2) {
          expect(phase()).toBe('between');
          advance(1);
          expect(hud()).toMatch(new RegExp(`Round ${k + 2} of 3`));
        }
      }
      expect(phase()).toBe('won');
      advance(2);
      expect(wins).toEqual([3]);
      wins = [];
    }
  });
  it('a miss costs a heart, says what happened, keeps the round, and the next solve still works', () => {
    for (const level of [1, 2]) {
      const g = start(level, 8);
      setWrong(g, 0);
      click(FIRE[level - 1]);
      advance(0.1);
      expect(phase()).toBe('resolve');
      advance(2.8);
      expect(hearts()).toBe(2);
      expect(hud()).toMatch(/Round 1 of 3/);
      expect(feedback().length).toBeGreaterThan(15);
      solveRound(level, g, 0);
      expect(phase()).toBe('between');
    }
  });
  it('three misses end the level with a retry', () => {
    const g = start(2, 8);
    for (let k = 0; k < 3; k++) {
      setWrong(g, 0);
      click(FIRE[1]);
      advance(2.8);
    }
    expect(phase()).toBe('over');
    click('Try this level again');
    expect(restarts).toBe(1);
  });
});

describe('level 1: bug safari', () => {
  it('closer than the near-point spot blurs; a step farther is sharp but smaller; neither names the right distance', () => {
    const g = start(1, 5) as Extract<Game, { kind: 'mag' }>;
    const r = g.rounds[0];
    setSlider(Math.max(1, r1(r.uSol) - 1));
    click(FIRE[0]);
    advance(2.8);
    expect(feedback()).toMatch(/nearer than the eye can focus/);
    setSlider(r1(r.uSol) + 0.3);
    click(FIRE[0]);
    advance(2.8);
    expect(feedback()).toMatch(/Sharp, but Mite could look bigger/);
    expect(hearts()).toBe(1);
    expect(feedback()).not.toContain(`${r1(r.uSol)} cm`);
  });
  it('a test shot costs a charge and reads out the picture; the slider range follows each lens', () => {
    const g = start(1, 5) as Extract<Game, { kind: 'mag' }>;
    click(TEST[0]);
    expect(feedback()).toMatch(/At [\d.]+ cm the (virtual image is [\d.]+ cm away|lens makes a real image|image is at infinity)/);
    click(TEST[0]);
    expect(feedback()).toMatch(/No charges left/);
    expect(feedback()).toMatch(/does not cost/);
    expect(sliders()[0].max).toBe(String(Math.round((g.rounds[0].f - 0.1) * 10) / 10));
    solveRound(1, g, 0);
    advance(1);
    expect(sliders()[0].max).toBe(String(Math.round((g.rounds[1].f - 0.1) * 10) / 10));
    expect($('.note')?.textContent).toMatch(/for a moment after a test shot/);
  });
  it('dragging Mite along the bench sets his distance in 0.1 cm steps', () => {
    const g = start(1, 5) as Extract<Game, { kind: 'mag' }>;
    const f = g.rounds[0].f;
    const sc = 230 / f;
    const u0 = Number(sliders()[0].value);
    pointer('pointerdown', 300 - u0 * sc, 170);
    pointer('pointermove', 300 - 3.37 * sc, 170);
    expect(sliders()[0].value).toBe('3.4');
  });
});

describe('level 2: cracking the microscope', () => {
  it('has two dials; the right object distance with the wrong tube still misses and reports the picture it made', () => {
    const g = start(2, 5) as Extract<Game, { kind: 'scope' }>;
    expect(sliders()).toHaveLength(2);
    const r = g.rounds[0];
    setSlider(r1(r.uSol), 0);
    setSlider(r1(r.LSol) + 2, 1);
    click(FIRE[1]);
    advance(2.8);
    expect(feedback()).toMatch(/not the picture the lab wants|No clear picture/);
    expect(hearts()).toBe(2);
    expect(feedback()).not.toMatch(/Exercise/);
  });
  it('the three rounds are Exercises 9.11, 9.12 and 9.26 (their numbers are in the hints)', () => {
    const g = start(2, 5) as Extract<Game, { kind: 'scope' }>;
    expect($('.note')?.textContent).toMatch(/Objective f = 2 cm, eyepiece f = 6.25 cm\. Wanted: 20×/);
    solveRound(2, g, 0);
    advance(1);
    expect($('.note')?.textContent).toMatch(/f = 0\.8 cm, eyepiece f = 2\.5 cm\. Wanted: 88×/);
    solveRound(2, g, 1);
    advance(1);
    expect($('.note')?.textContent).toMatch(/f = 1\.25 cm, eyepiece f = 5 cm\. Wanted: 30×/);
    expect($('.note')?.textContent).toMatch(/work it out/);
  });
  it('a test shot reads the picture for the current dials, and dragging the speck and the eyepiece moves the dials', () => {
    start(2, 5);
    click(TEST[1]);
    expect(feedback()).toMatch(/inside the objective|first image|Final image|eyepiece/i);
    pointer('pointerdown', 170 - 1 * 18, 151);
    pointer('pointermove', 170 - 2.46 * 18, 151);
    expect(sliders()[0].value).toBe('2.5');
    pointer('pointerup', 0, 0);
    pointer('pointerdown', 170 + 10 * 18, 97);
    pointer('pointermove', 170 + 14.96 * 18, 97);
    expect(sliders()[1].value).toBe('15');
  });
});

/** One drawn frame after the clock has run `dt` seconds. */
const frameAfter = (rc: ReturnType<typeof canvasRecorder>, dt: number) => {
  if (dt > 0.05) advance(dt - 0.05);
  rc.clear();
  advance(0.05);
  return texts(rc.rec);
};
const HELPER = [/× (sharp|blurred)|^at infinity$|^image .* cm away/, /^LOCK SIGNAL|^final image|^first image/];
const has = (t: string[], level: number) => t.some((s) => HELPER[level - 1].test(s));
const playTo = (level: number, g: Game, round: number) => {
  for (let k = 0; k < round; k++) {
    solveRound(level, g, k);
    advance(1);
  }
};

describe('no leaks: the helper fades, and a miss shows no number or true picture', () => {
  it('round 1 has the live view; round 2 only for about 1.5 s after a test shot; round 3 never, even after a test shot', () => {
    for (const level of [1, 2]) {
      const rc = canvasRecorder();
      const g = start(level, 5);
      expect(has(frameAfter(rc, 0.1), level)).toBe(true);
      playTo(level, g, 1);
      expect(has(frameAfter(rc, 0.1), level)).toBe(false);
      click(TEST[level - 1]);
      expect(has(frameAfter(rc, 0.3), level)).toBe(true);
      expect(has(frameAfter(rc, 1.5), level)).toBe(false);
      setRight(g, 1);
      click(FIRE[level - 1]);
      advance(2.8);
      advance(1);
      expect(hud()).toMatch(/Round 3 of 3/);
      expect(has(frameAfter(rc, 0.1), level)).toBe(false);
      click(TEST[level - 1]);
      expect(has(frameAfter(rc, 0.3), level)).toBe(false);
    }
  });
  it('a miss in round 2 or 3 draws no view, readout, signal bar or first image; a win draws them', () => {
    for (const level of [1, 2]) {
      for (const round of [1, 2]) {
        const rc = canvasRecorder();
        const g = start(level, 5);
        playTo(level, g, round);
        setWrong(g, round);
        click(FIRE[level - 1]);
        advance(2.0);
        expect(has(frameAfter(rc, 0.05), level)).toBe(false);
        advance(1);
        setRight(g, round);
        click(FIRE[level - 1]);
        advance(2.0);
        expect(has(frameAfter(rc, 0.05), level)).toBe(true);
        advance(1);
      }
    }
  });
  it('miss texts carry no number, and two wrong settings on the same side give the same words and the same drawn end', () => {
    // level 1: both nearer than the eye can focus, then both sharp but too far from the lens
    const rc = canvasRecorder();
    const g1 = buildGame(1, createRng(5)) as Extract<Game, { kind: 'mag' }>;
    for (const sets of [[1, 2], [r1(g1.rounds[1].uSol) + 0.3, r1(g1.rounds[1].uSol) + 0.6]]) {
      playTo(1, start(1, 5), 1);
      const ends: string[][] = [];
      const says: string[] = [];
      for (const u of sets) {
        setSlider(u);
        click(FIRE[0]);
        advance(2.0);
        ends.push(frameAfter(rc, 0.05));
        advance(1);
        says.push(feedback());
      }
      expect(says[0]).toBe(says[1]);
      expect(says[0]).not.toMatch(/\d/);
      expect(ends[0]).toEqual(ends[1]);
    }
    // level 2: search for two settings with the same direction words
    const g2 = start(2, 5) as Extract<Game, { kind: 'scope' }>;
    playTo(2, g2, 1);
    const r = g2.rounds[1];
    const byText = new Map<string, [number, number][]>();
    for (let a = 5; a <= 40; a++)
      for (let b = 50; b <= 200; b += 5) {
        const uo = a / 10;
        const L = b / 10;
        if (judgeScope(r, uo, L).ok) continue;
        const txt = missText(g2, 1, { u: uo, L });
        if (/No clear picture/.test(txt)) continue;
        byText.set(txt, [...(byText.get(txt) ?? []), [uo, L]]);
      }
    const group = [...byText.entries()].sort((x, y) => y[1].length - x[1].length)[0][1];
    expect(group.length).toBeGreaterThan(2);
    const ends: string[][] = [];
    const says: string[] = [];
    for (const [uo, L] of [group[0], group[group.length - 1]]) {
      expect(judgeScope(r, uo, L).ok).toBe(false);
      setSlider(uo, 0);
      setSlider(L, 1);
      click(FIRE[1]);
      advance(2.0);
      ends.push(frameAfter(rc, 0.05));
      advance(1);
      says.push(feedback());
    }
    expect(says[0]).toBe(says[1]);
    expect(says[0]).not.toMatch(/\d/);
    expect(ends[0]).toEqual(ends[1]);
  });
  it('the start never wins: firing at once costs a heart in every round of both levels', () => {
    for (const level of [1, 2]) {
      const g = start(level, 5);
      for (let k = 0; k < 3; k++) {
        playTo(level, g, k);
        const before = hearts();
        click(FIRE[level - 1]);
        advance(2.8);
        expect(hearts()).toBe(before - 1);
        if (hearts() === 0) break;
        start(level, 5);
      }
    }
  });
});

describe('robustness', () => {
  it('every level animates through a hit and a miss with no console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2]) {
      const g = start(level, 9);
      advance(0.8);
      setWrong(g, 0);
      click(FIRE[level - 1]);
      advance(3);
      solveRound(level, g, 0);
      advance(1);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
