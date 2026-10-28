// Shared jsdom harness for the arcade games: a fake canvas and clock, DOM helpers, and the shell checks every arcade game must pass.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRng } from '../../src/core/random';
import type { GameContext, GameModule } from '../../src/core/types';
import { manifest } from '../fixtures';

export function arcadeHarness(game: GameModule, id: string, levelCount: number) {
  let step: (ms: number) => void = () => undefined;
  let clock = 0;
  let stop: (() => void) | void;
  let wins: number[] = [];
  let restarts = 0;
  let root: HTMLElement = document.body;

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
    vi.stubGlobal('cancelAnimationFrame', (id2: number) => queue.delete(id2));
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

  const h = {
    advance(seconds: number) {
      for (let i = 0; i < Math.round(seconds / 0.05); i++) step(50);
    },
    start(level: number, seed: number) {
      const m = manifest(id);
      document.body.innerHTML = '';
      root = document.createElement('div');
      document.body.append(root);
      const ctx = { root, manifest: m, level, levelCount, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => restarts++ } as unknown as GameContext;
      stop?.();
      stop = game.mount(ctx);
      h.advance(0.1);
    },
    $: (sel: string) => root.querySelector(sel) as HTMLElement | null,
    click(label: string) {
      const b = root.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement | null;
      if (!b) throw new Error(`no button "${label}"`);
      b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    },
    sliders: () => [...root.querySelectorAll('input[type="range"]')] as HTMLInputElement[],
    setSlider(v: number, which = 0) {
      const el = h.sliders()[which];
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    feedback: () => h.$('.feedback')?.textContent ?? '',
    note: () => h.$('.note')?.textContent ?? '',
    phase: () => h.$('canvas')?.dataset.phase,
    hud: () => h.$('.hud')?.textContent ?? '',
    hearts: () => (h.$('.hud-hearts')?.textContent ?? '').split('♥').length - 1,
    score: () => Number(/Score (\d+)/.exec(h.hud())?.[1] ?? 0),
    pointer: (type: string, x: number, y: number) => h.$('canvas')!.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true })),
    wins: () => wins,
    clearWins() {
      wins = [];
    },
    restarts: () => restarts,
  };
  return h;
}
export type Harness = ReturnType<typeof arcadeHarness>;

export interface ShellConfig<G> {
  levels: number[];
  build: (level: number, seed: number) => G;
  /** Set the dials to the winning values for round k. */
  setRight: (g: G, k: number, level: number) => void;
  /** Set the dials to a certain miss for round k. */
  setWrong: (g: G, k: number, level: number) => void;
  /** Press the button that commits the attempt. */
  commit: (level: number) => void;
}

/** The checks every arcade game must pass: hero banner, HUD, three rounds, boss banner, misses, game over and a clean console. */
export function shellTests<G>(h: Harness, c: ShellConfig<G>) {
  const solve = (g: G, k: number, level: number) => {
    c.setRight(g, k, level);
    c.commit(level);
    h.advance(2.8);
  };
  describe('the arcade shell around every level', () => {
    it('opens with a hero banner, three hearts, round 1 of 3 and a score of 0', () => {
      for (const level of c.levels) {
        h.start(level, 4);
        expect(h.$('.hero .hero-name')?.textContent?.length).toBeGreaterThan(3);
        expect(h.$('.hero .objective')?.textContent).toMatch(/^Objective:/);
        expect(h.hearts()).toBe(3);
        expect(h.hud()).toMatch(/Round 1 of 3/);
        expect(h.hud()).toMatch(/Score 0/);
        expect(h.phase()).toBe('play');
      }
    });
    it('plays a whole level: three rounds, a growing score, a BOSS round, then 3 stars', () => {
      for (const level of c.levels) {
        h.start(level, 6);
        const g = c.build(level, 6);
        let last = 0;
        for (let k = 0; k < 3; k++) {
          if (k === 2) expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
          solve(g, k, level);
          expect(h.score()).toBeGreaterThan(last);
          last = h.score();
          if (k < 2) {
            expect(h.phase()).toBe('between');
            h.advance(1);
            expect(h.hud()).toMatch(new RegExp(`Round ${k + 2} of 3`));
          }
        }
        expect(h.phase()).toBe('won');
        h.advance(2);
        expect(h.wins()).toEqual([3]);
        h.clearWins();
      }
    });
    it('a miss costs a heart, says what happened, keeps the round, and the next solve still works', () => {
      for (const level of c.levels) {
        h.start(level, 8);
        const g = c.build(level, 8);
        c.setWrong(g, 0, level);
        c.commit(level);
        h.advance(0.1);
        expect(h.phase()).toBe('resolve');
        h.advance(2.8);
        expect(h.hearts()).toBe(2);
        expect(h.hud()).toMatch(/Round 1 of 3/);
        expect(h.feedback().length).toBeGreaterThan(12);
        solve(g, 0, level);
        expect(h.phase()).toBe('between');
        expect(h.hearts()).toBe(2);
      }
    });
    it('three misses end the level with a retry, and the stars follow the hearts left', () => {
      const level = c.levels[0];
      h.start(level, 8);
      const g = c.build(level, 8);
      for (let k = 0; k < 3; k++) {
        c.setWrong(g, 0, level);
        c.commit(level);
        h.advance(2.8);
      }
      expect(h.phase()).toBe('over');
      h.click('Try this level again');
      expect(h.restarts()).toBe(1);
      expect(h.wins()).toEqual([]);
      h.start(level, 8);
      c.setWrong(g, 0, level);
      c.commit(level);
      h.advance(2.8);
      for (let k = 0; k < 3; k++) {
        solve(g, k, level);
        h.advance(1);
      }
      h.advance(2);
      expect(h.wins()).toEqual([2]);
    });
    it('every level animates through a hit and a miss with no console error', () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      for (const level of c.levels) {
        h.start(level, 9);
        const g = c.build(level, 9);
        h.advance(0.8);
        c.setWrong(g, 0, level);
        c.commit(level);
        h.advance(3);
        solve(g, 0, level);
        h.advance(1);
      }
      expect(err).not.toHaveBeenCalled();
    });
  });
}
