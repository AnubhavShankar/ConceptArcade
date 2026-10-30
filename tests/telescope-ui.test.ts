// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/telescope-lab/index';
import { PLATE_MISS, SCOPE_MISS_RADIUS, buildGame, judgeNear, judgeZoom, lRange, scopeMiss, type Game } from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/telescope-lab/logic';
import { canvasRecorder, texts } from './helpers/canvas-rec';
import { createRng } from '../src/core/random';
import type { GameContext } from '../src/core/types';
import { manifest } from './fixtures';

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
  const m = manifest('tl');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => restarts++ } as unknown as GameContext;
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

const FIRE = ['Fire the scope with these settings', 'Expose the plate at this focal length', 'Fire the scope with these settings', 'Expose the photograph with the sensor here'];
const TEST = ['Test shot: measure the view with these settings', 'Test shot: measure the image size at this focal length', 'Test shot: measure the view with these settings', 'Test exposure: show the camera screen for a moment with the sensor here'];
const setRight = (g: Game, k: number) => {
  if (g.kind === 'cass') setSlider(g.rounds[k].v);
  else if (g.kind === 'plate') setSlider(Math.round(g.rounds[k].foSol / 10) * 10);
  else {
    setSlider(g.rounds[k].feSol, 0);
    setSlider(g.kind === 'near' ? r1(g.rounds[k].LSol) : g.rounds[k].LSol, 1);
  }
};
const setWrong = (g: Game, k: number) => {
  if (g.kind === 'cass') setSlider(g.rounds[k].v + 100 <= 600 ? g.rounds[k].v + 100 : g.rounds[k].v - 100);
  else if (g.kind === 'plate') setSlider(Math.max(50, Math.round(g.rounds[k].foSol / 20) * 10));
  else if (g.kind === 'zoom') {
    setSlider(g.rounds[k].feSol * 2, 0);
    setSlider(g.rounds[k].LSol, 1);
  } else {
    setSlider(g.rounds[k].feSol, 0);
    setSlider(g.rounds[k].fo + g.rounds[k].feSol, 1);
  }
};
const solveRound = (level: number, g: Game, k: number) => {
  setRight(g, k);
  click(FIRE[level - 1]);
  advance(2.8);
};

describe('the arcade shell around every level', () => {
  it('opens with a hero banner, three hearts, round 1 of 3 and a score of 0', () => {
    for (const level of [1, 2, 3, 4]) {
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
    for (const level of [1, 2, 3, 4]) {
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
    for (const level of [1, 2, 3, 4]) {
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
    const g = start(1, 8);
    for (let k = 0; k < 3; k++) {
      setWrong(g, 0);
      click(FIRE[0]);
      advance(2.8);
    }
    expect(phase()).toBe('over');
    click('Try this level again');
    expect(restarts).toBe(1);
  });
});

describe('level 1: the scout’s scope', () => {
  it('the three rounds are Exercises 9.13, 9.27(a) and 9.14(a), and the hint says which aids are on', () => {
    const g = start(1, 5);
    expect($('.note')?.textContent).toMatch(/Objective f = 144 cm\. Make the target fill the ring: 24×/);
    expect($('.note')?.textContent).toMatch(/scope view is live/);
    solveRound(1, g, 0);
    advance(1);
    expect($('.note')?.textContent).toMatch(/f = 140 cm\. Make the target fill the ring: 28×/);
    expect($('.note')?.textContent).toMatch(/for a moment after a test shot/);
    solveRound(1, g, 1);
    advance(1);
    expect($('.note')?.textContent).toMatch(/1500 cm\. Make the target fill the ring: 1500×/);
    expect($('.note')?.textContent).toMatch(/work it out/);
  });
  it('a test shot costs a charge and reads the view; the near-point tube length is not the relaxed answer', () => {
    const g = start(1, 5) as Extract<Game, { kind: 'zoom' }>;
    click(TEST[0]);
    expect(feedback()).toMatch(/Final image|inside the objective|outside the eyepiece/);
    click(TEST[0]);
    expect(feedback()).toMatch(/No charges left/);
    expect(feedback()).toMatch(/does not cost/);
    setSlider(g.rounds[0].feSol, 0);
    setSlider(g.rounds[0].LSol - 1, 1);
    click(FIRE[0]);
    advance(2.8);
    expect(hearts()).toBe(2);
  });
  it('dragging the eyepiece along the zoom inset sets the tube length, and the focal-length knob sets the eyepiece', () => {
    start(1, 5);
    pointer('pointerdown', 150, 235);
    pointer('pointermove', 150 + 4.6 * 14, 235);
    expect(sliders()[1].value).toBe('149');
    pointer('pointerup', 0, 0);
    const knobY = (v: number) => 300 - ((v - 0.5) / 29.5) * 130;
    pointer('pointerdown', 612, knobY(10));
    pointer('pointermove', 612, knobY(6));
    expect(sliders()[0].value).toBe('6');
  });
});

describe('level 2: the photo plate', () => {
  it('a focal length twice too long spills over the plate, half as long leaves it empty, and neither names the right value', () => {
    const g = start(2, 5) as Extract<Game, { kind: 'plate' }>;
    const fo = Math.round(g.rounds[0].foSol / 10) * 10;
    setSlider(Math.min(2000, fo * 2));
    click(FIRE[1]);
    advance(2.8);
    expect(feedback()).toMatch(/spills over/);
    setSlider(Math.max(50, Math.round(fo / 20) * 10));
    click(FIRE[1]);
    advance(2.8);
    expect(feedback()).toMatch(/partly empty/);
    expect(feedback()).not.toContain(`${fo} cm`);
    expect(hearts()).toBe(1);
  });
  it('dragging the plate along the axis sets the focal length in steps of 10 cm', () => {
    start(2, 5);
    pointer('pointerdown', 70 + 800 * 0.2, 180);
    pointer('pointermove', 70 + 1004 * 0.2, 180);
    expect(sliders()[0].value).toBe('1000');
  });
});

describe('level 3: Orion’s near-point view', () => {
  it('the first round is Exercise 9.27(b); the relaxed tube length is not the near-point one', () => {
    const g = start(3, 5) as Extract<Game, { kind: 'near' }>;
    expect($('.note')?.textContent).toMatch(/Objective f = 140 cm\. Make the target fill the ring: 33\.6×, final image at the near point/);
    setSlider(g.rounds[0].feSol, 0);
    setSlider(g.rounds[0].fo + g.rounds[0].feSol, 1);
    click(FIRE[2]);
    advance(2.8);
    expect(feedback()).toMatch(/does not fill the ring: this is not the view the ring asks for/);
    expect(feedback()).not.toMatch(/\d/);
    expect(hearts()).toBe(2);
  });
});

describe('level 4: Planet night', () => {
  const FIRE4 = FIRE[3];
  const TEST4 = TEST[3];
  it('opens with Stella, the brief’s story and the round 1 intel for Saturn (Exercise 9.29), with the live screen on', () => {
    start(4, 5);
    expect($('.hero .hero-name')?.textContent).toMatch(/^Stella/);
    expect($('.hero')?.textContent).toContain('The big mirror’s image is a virtual object for the small one.');
    expect($('.note')?.textContent).toContain('Tonight: Saturn. Big mirror R₁ = 220 mm, small convex mirror R₂ = 140 mm, 20 mm apart.');
    expect($('.note')?.textContent).toMatch(/camera screen is live/);
    expect(sliders()).toHaveLength(1);
    expect(sliders()[0].min).toBe('0');
    expect(sliders()[0].max).toBe('600');
    expect(sliders()[0].step).toBe('5');
    expect(sliders()[0].value).toBe('50');
  });
  it('the three planets come in order, and the aids fade: live, dark until a test exposure, dark until Expose', () => {
    const g = start(4, 5) as Extract<Game, { kind: 'cass' }>;
    solveRound(4, g, 0);
    expect(feedback()).toContain('Saturn is pin-sharp: the image forms 315 mm from the small mirror.');
    advance(1);
    expect($('.note')?.textContent).toMatch(/Tonight: Jupiter\./);
    expect($('.note')?.textContent).toMatch(/dark until a test exposure/);
    solveRound(4, g, 1);
    advance(1);
    expect($('.note')?.textContent).toMatch(/Tonight: Neptune\. Big mirror R₁ = 180 mm, small convex mirror R₂ = 100 mm, 15 mm apart\./);
    expect($('.note')?.textContent).toMatch(/stays dark until you expose/);
  });
  it('the start setting never wins: exposing at 50 mm is a miss that costs a heart', () => {
    start(4, 5);
    click(FIRE4);
    advance(2.8);
    expect(hearts()).toBe(2);
  });
  it('a miss says only which side the image formed, never how far, and never the answer', () => {
    const g = start(4, 5) as Extract<Game, { kind: 'cass' }>;
    const v = g.rounds[0].v;
    setSlider(v - 100);
    click(FIRE4);
    advance(2.8);
    const short = feedback();
    expect(short).toContain('Saturn came out as a blurred disc: the light had not yet come to a focus.');
    setSlider(v - 25);
    click(FIRE4);
    advance(2.8);
    expect(feedback().replace(String(v - 25), 'X')).toBe(short.replace(String(v - 100), 'X'));
    expect(hearts()).toBe(1);
    expect(short).not.toContain(String(v));
    setSlider(v + 100);
    click(FIRE4);
    advance(0.1);
    advance(2.8);
    expect(phase()).toBe('over');
    expect(feedback()).toContain('had already focused and spread out again');
    expect(feedback()).not.toContain(String(v));
  });
  it('a test exposure costs the charge and the screen lights up for a moment; the boss round has no charges', () => {
    const g = start(4, 5) as Extract<Game, { kind: 'cass' }>;
    expect(hud()).toMatch(/Charges ⚡/);
    click(TEST4);
    expect(feedback()).toMatch(/Test exposure with the sensor at 50 mm/);
    expect(feedback()).not.toContain(String(g.rounds[0].v));
    expect(hud()).toMatch(/Charges ·/);
    click(TEST4);
    expect(feedback()).toMatch(/No charges left/);
    expect(feedback()).toMatch(/does not cost/);
    expect(hearts()).toBe(3);
    solveRound(4, g, 0);
    advance(1);
    solveRound(4, g, 1);
    advance(1);
    expect(hud()).toMatch(/BOSS/);
    expect(hud()).not.toMatch(/Charges/);
    click(TEST4);
    expect(feedback()).toMatch(/No charges left/);
  });
  it('dragging the sensor along the rail in the inset sets the distance in steps of 5 mm', () => {
    start(4, 5);
    const sx = (mm: number) => 600 - mm * 0.483;
    pointer('pointerdown', sx(50), 232);
    pointer('pointermove', sx(317), 232);
    expect(sliders()[0].value).toBe('315');
    pointer('pointerup', 0, 0);
  });
  it('a win photographs the planet: the whole level ends with three stars, and the last answer is 150 mm for Neptune', () => {
    const g = start(4, 6) as Extract<Game, { kind: 'cass' }>;
    for (let k = 0; k < 3; k++) {
      solveRound(4, g, k);
      advance(1);
    }
    expect(g.rounds[2].v).toBe(150);
    advance(2);
    expect(wins).toEqual([3]);
    wins = [];
  });
});

describe('robustness', () => {
  it('every level animates through a hit and a miss with no console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
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

// ---- no leaks, levels 1 to 3: the helper fades, a miss draws a fixed effect and no number --------------------------------------

type Rec = ReturnType<typeof canvasRecorder>;
const SCOPE_HELPER = /^[\d.]+×( \(blurred\))?$/;
const frameAfter = (rc: Rec, dt: number) => {
  if (dt > 0.05) advance(dt - 0.05);
  rc.clear();
  advance(0.05);
  return rc.rec;
};
const scopeHas = (rec: Rec['rec']) => texts(rec).some((s) => SCOPE_HELPER.test(s));
/** Some valid view (the eyepiece inside its focal length), so that a live helper would draw its numbers. */
const validView = (g: Game, k: number) => {
  if (g.kind === 'zoom' || g.kind === 'near') {
    setSlider(10, 0);
    setSlider(g.rounds[k].fo + 5, 1);
  }
};
const playTo = (level: number, g: Game, round: number) => {
  for (let k = 0; k < round; k++) {
    solveRound(level, g, k);
    advance(1);
  }
};
const bodyRadii = (rec: Rec['rec'], x: number, y: number) => rec.arcs.filter((a) => a.x === x && a.y === y).map((a) => a.r);

describe('no leaks, levels 1 and 3: the scope view', () => {
  it('round 1 has the live view; round 2 only for about 1.5 s after a test shot; round 3 never, even after a test shot', () => {
    for (const level of [1, 3]) {
      const rc = canvasRecorder();
      const g = start(level, 5);
      validView(g, 0);
      expect(scopeHas(frameAfter(rc, 0.1))).toBe(true);
      solveRound(level, g, 0);
      advance(1);
      validView(g, 1);
      expect(scopeHas(frameAfter(rc, 0.1))).toBe(false);
      click(TEST[level - 1]);
      expect(scopeHas(frameAfter(rc, 0.3))).toBe(true);
      expect(scopeHas(frameAfter(rc, 1.5))).toBe(false);
      solveRound(level, g, 1);
      advance(1);
      expect(hud()).toMatch(/Round 3 of 3/);
      validView(g, 2);
      expect(scopeHas(frameAfter(rc, 0.1))).toBe(false);
      click(TEST[level - 1]);
      expect(scopeHas(frameAfter(rc, 0.3))).toBe(false);
    }
  });
  it('a miss never draws the live view or its numbers, in any round; a win does', () => {
    for (const level of [1, 3]) {
      for (const round of [0, 1, 2]) {
        const rc = canvasRecorder();
        const g = start(level, 5);
        playTo(level, g, round);
        setWrong(g, round);
        click(FIRE[level - 1]);
        advance(2.0);
        expect(scopeHas(frameAfter(rc, 0.05))).toBe(false);
        advance(1);
        setRight(g, round);
        click(FIRE[level - 1]);
        advance(2.0);
        expect(scopeHas(frameAfter(rc, 0.05))).toBe(true);
        advance(1);
      }
    }
  });
  it('two wrong settings in the same category end on the same words and the target at the same fixed size', () => {
    let tested = 0;
    for (const level of [1, 3]) {
      for (const round of [0, 1, 2]) {
        const g0 = start(level, 5) as Extract<Game, { kind: 'zoom' | 'near' }>;
        const r = g0.rounds[round];
        const lr = lRange(r.fo, level === 1 ? 1 : 0.1);
        const groups = new Map<string, [number, number][]>();
        for (const fe of [3, 5, 8, 10, 15, 30]) {
          for (let L = lr.min; L <= lr.max + 1e-9; L = Math.round((L + lr.step * (level === 1 ? 1 : 20)) * 10) / 10) {
            if (level === 1 ? judgeZoom(r as never, fe, L).ok : judgeNear(r as never, fe, L).ok) continue;
            const s = scopeMiss(r, fe, L);
            if (s.none || s.size === 'about') continue;
            const key = `${s.size}/${s.blurred}`;
            groups.set(key, [...(groups.get(key) ?? []), [fe, L]]);
          }
        }
        for (const [key, list] of groups) {
          const two = [list[0], list.find((p) => p[0] !== list[0][0] && p[1] !== list[0][1])].filter(Boolean) as [number, number][];
          if (two.length < 2) continue;
          const rc = canvasRecorder();
          const g = start(level, 5);
          playTo(level, g, round);
          const ends: { words: string[]; radii: number[] }[] = [];
          for (const [fe, L] of two) {
            setSlider(fe, 0);
            setSlider(L, 1);
            click(FIRE[level - 1]);
            advance(2.0);
            const rec = frameAfter(rc, 0.05);
            ends.push({ words: texts(rec), radii: bodyRadii(rec, 540, 95) });
            advance(1);
          }
          expect(ends[0].words).toEqual(ends[1].words);
          const want = SCOPE_MISS_RADIUS[key.split('/')[0] as 'over' | 'under'];
          for (const e of ends) expect(e.radii.some((x) => x > want * 0.93 && x < want * 1.07 && x !== 77 && x !== 78)).toBe(true);
          tested++;
        }
      }
    }
    expect(tested).toBeGreaterThan(3);
  });
});

describe('no leaks, level 2: the plate', () => {
  it('two wrong focal lengths on the same side end the same, the image drawn at a fixed multiple of the plate, with no readout', () => {
    for (const round of [0, 1, 2]) {
      for (const side of ['over', 'under'] as const) {
        const rc = canvasRecorder();
        const g = start(2, 5) as Extract<Game, { kind: 'plate' }>;
        playTo(2, g, round);
        const r = g.rounds[round];
        const fos = (side === 'over' ? [1.2, 1.3] : [0.5, 0.7]).map((f) => Math.max(50, Math.min(2000, Math.round((r.foSol * f) / 10) * 10)));
        const ends: { words: string[]; radii: number[] }[] = [];
        for (const fo of fos) {
          setSlider(fo);
          click(FIRE[1]);
          advance(2.0);
          const rec = frameAfter(rc, 0.05);
          const xp = 70 + fo * 0.2;
          // apart from the player's own setting, which is printed on the bench
          ends.push({ words: texts(rec).filter((s) => !/^focal length [\d.]+ cm$/.test(s)), radii: bodyRadii(rec, xp + 38, 180) });
          expect(texts(rec).some((s) => /^image: /.test(s))).toBe(false);
          advance(1);
        }
        expect(ends[0].words).toEqual(ends[1].words);
        const want = Math.max(5, Math.min(60, ((r.plate * 8) / 2) * PLATE_MISS[side] * 0.9));
        for (const e of ends) expect(e.radii.some((x) => x > want * 0.93 && x < want * 1.07)).toBe(true);
      }
    }
  });
  it('a miss text holds no number', () => {
    const g = start(2, 5) as Extract<Game, { kind: 'plate' }>;
    setSlider(Math.min(2000, Math.round((g.rounds[0].foSol * 2) / 10) * 10));
    click(FIRE[1]);
    advance(2.8);
    expect(feedback()).not.toMatch(/\d/);
  });
});

describe('no leaks, levels 1 to 3: the start never wins', () => {
  it('firing at once is a miss in every round of every level', () => {
    for (const level of [1, 2, 3]) {
      for (const round of [0, 1, 2]) {
        const g = start(level, 5);
        playTo(level, g, round);
        const before = hearts();
        click(FIRE[level - 1]);
        advance(2.8);
        expect(hearts()).toBe(before - 1);
      }
    }
  });
});
