// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/lens-bench/index';
import { buildGame, projectorMiss, type Game } from '../src/games/physics/class-12/ch09-ray-optics-and-optical-instruments/lens-bench/logic';
import { createRng } from '../src/core/random';
import { canvasRecorder, texts } from './helpers/canvas-rec';
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
  const m = manifest('ll');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 6, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => restarts++ } as unknown as GameContext;
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

const COMMIT = ['Fire the beam through this lens', 'Fire the beam through the pair', 'Fire the projector', 'Place the screen here', 'Pour this liquid and do the trick', 'Grind the face to this radius and fire the light'];
const setRight = (g: Game, i: number) => {
  if (g.kind === 'curved') setSlider(g.rounds[i].sol);
  else if (g.kind === 'grind') setSlider(g.rounds[i].sol);
  else if (g.kind === 'stack') setSlider(g.rounds[i].P2);
  else if (g.kind === 'projector') {
    setSlider(g.rounds[i].u, 0);
    setSlider(g.rounds[i].f, 1);
  } else if (g.kind === 'relay') setSlider(Math.round(g.rounds[i].screen));
  else setSlider(Math.round(g.rounds[i].nL * 100) / 100);
};
const setWrong = (g: Game, i: number) => {
  if (g.kind === 'curved') setSlider(g.rounds[i].sol + 10);
  else if (g.kind === 'grind') setSlider(g.rounds[i].sol + 10);
  else if (g.kind === 'stack') setSlider(g.rounds[i].P2 + 3 > 10 ? g.rounds[i].P2 - 3 : g.rounds[i].P2 + 3);
  else if (g.kind === 'projector') {
    setSlider(g.rounds[i].u + 7, 0);
    setSlider(g.rounds[i].f, 1);
  } else if (g.kind === 'relay') setSlider(Math.round(g.rounds[i].screen) + 8);
  else setSlider(Math.round(g.rounds[i].nL * 100) / 100 + 0.1);
};
const commit = (level: number) => click(COMMIT[level - 1]);
const solveRound = (level: number, g: Game, i: number) => {
  setRight(g, i);
  commit(level);
  advance(2.7);
};

describe('the arcade shell around every level', () => {
  it('opens with a hero banner, three hearts, round 1 of 3 and a score of 0', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      start(level, 4);
      expect($('.hero .hero-name')?.textContent?.length).toBeGreaterThan(4);
      expect($('.hero .objective')?.textContent).toMatch(/^Objective:/);
      expect(hearts()).toBe(3);
      expect(hud()).toMatch(/Round 1 of 3/);
      expect(hud()).toMatch(/Score 0/);
      expect(phase()).toBe('play');
    }
  });
  it('there is no inventory: no stock cards, no order board, only dials, handles and beams', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      start(level, 4);
      expect($('.cards')).toBeNull();
      expect(root.textContent).not.toMatch(/\bstock\b|\bshelf\b|workshop|customer/i);
    }
  });
  it('plays a whole level: three rounds, a growing score, a BOSS round at the end, then the win with 3 stars', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const g = start(level, 6);
      let last = 0;
      for (let i = 0; i < 3; i++) {
        if (i === 2) expect(hud()).toMatch(/Round 3 of 3 · BOSS/);
        solveRound(level, g, i);
        const score = Number(/Score (\d+)/.exec(hud())![1]);
        expect(score).toBeGreaterThan(last);
        last = score;
        if (i < 2) {
          expect(phase()).toBe('between');
          advance(1);
          expect(hud()).toMatch(new RegExp(`Round ${i + 2} of 3`));
        }
      }
      expect(phase()).toBe('won');
      advance(2);
      expect(wins).toEqual([3]);
      wins = [];
    }
  });
  it('a first-try round earns a PERFECT bonus: clearing it again after a miss scores less', () => {
    const g = start(1, 6);
    solveRound(1, g, 0);
    const clean = Number(/Score (\d+)/.exec(hud())![1]);
    const g2 = start(1, 6);
    setWrong(g2, 0);
    commit(1);
    advance(2.8);
    solveRound(1, g2, 0);
    const afterMiss = Number(/Score (\d+)/.exec(hud())![1]);
    expect(clean).toBeGreaterThanOrEqual(150);
    expect(afterMiss).toBeLessThan(clean);
  });
  it('a miss costs a heart, says what happened, keeps the round, and the next solve still works', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const g = start(level, 8);
      setWrong(g, 0);
      commit(level);
      advance(0.1);
      expect(phase()).toBe('resolve');
      advance(2.8);
      expect(hearts()).toBe(2);
      expect(hud()).toMatch(/Round 1 of 3/);
      expect(phase()).toBe('play');
      expect(feedback().length).toBeGreaterThan(15);
      solveRound(level, g, 0);
      expect(hearts()).toBe(2);
      expect(phase()).toBe('between');
    }
  });
  it('three misses end the level with a retry', () => {
    const g = start(2, 8);
    for (let i = 0; i < 3; i++) {
      setWrong(g, 0);
      commit(2);
      advance(2.8);
    }
    expect(phase()).toBe('over');
    expect($('.arcade-overlay')?.textContent).toMatch(/Out of hearts/);
    click('Try this level again');
    expect(restarts).toBe(1);
    expect(wins).toEqual([]);
  });
});

describe('level 1: light the lantern', () => {
  it('the live preview is on in round 1 only; a test beam costs a charge and reads out the focus', () => {
    const g = start(1, 5);
    expect($('.note')?.textContent).toMatch(/live preview shows the focus/);
    click('Test beam: measure the lens as dialled now');
    expect(feedback()).toMatch(/Test beam: with R = 40 cm the lens focuses [\d.]+ cm behind it/);
    expect(hud()).toMatch(/Charges ·/);
    click('Test beam: measure the lens as dialled now');
    expect(feedback()).toMatch(/No charges left/);
    expect(feedback()).toMatch(/does not cost/);
    expect(hearts()).toBe(3);
    solveRound(1, g, 0);
    advance(1);
    expect($('.note')?.textContent).toMatch(/preview is off/);
  });
  it('dragging the curvature dial on the canvas sets the radius in whole centimetres', () => {
    start(1, 5);
    const trackX = (r: number) => 60 + ((r - 1) * 540) / 59;
    pointer('pointerdown', trackX(40), 44);
    pointer('pointermove', trackX(17.4), 44);
    expect(sliders()[0].value).toBe('17');
  });
});

describe('level 2: the power pair', () => {
  it('a measuring beam costs a charge; the fixed front lens is stated and the answer is a half-dioptre dial', () => {
    const g = start(2, 5) as Extract<Game, { kind: 'stack' }>;
    click('Measure the pair with a beam');
    expect(feedback()).toMatch(/The pair measures .* D at this dial setting/);
    expect(hud()).toMatch(/Charges ·/);
    expect($('.note')?.textContent).toMatch(/Front lens fixed at/);
    setSlider(g.rounds[0].P2);
    commit(2);
    advance(2.7);
    expect(phase()).toBe('between');
  });
  it('dragging the power knob on the track sets the back lens in half-dioptre steps', () => {
    start(2, 5);
    pointer('pointerdown', 604, 290 - (10 / 20) * 220);
    pointer('pointermove', 604, 290 - (13.2 / 20) * 220);
    expect(sliders()[0].value).toBe('3');
  });
});

describe('level 3: the projector shot', () => {
  it('has two dials; right in one and wrong in the other still misses; a test beam reads out where the picture lands', () => {
    const g = start(3, 5) as Extract<Game, { kind: 'projector' }>;
    expect(sliders()).toHaveLength(2);
    click('Test beam: see where the picture lands');
    expect(feedback()).toMatch(/the picture lands [\d.]+ cm beyond the lens|inside the focus/);
    setSlider(g.rounds[0].u, 0);
    setSlider(g.rounds[0].f + 2, 1);
    commit(3);
    advance(2.8);
    expect(hearts()).toBe(2);
    expect(feedback()).toMatch(/blur|wrong size|inside the focus/);
    setRight(g, 0);
    commit(3);
    advance(2.8);
    expect(phase()).toBe('between');
  });
  it('the slider range follows the distance D of each round', () => {
    const g = start(3, 4) as Extract<Game, { kind: 'projector' }>;
    expect(sliders()[0].max).toBe(String(g.rounds[0].D - 5));
    solveRound(3, g, 0);
    advance(1);
    expect(sliders()[0].max).toBe(String(g.rounds[1].D - 5));
  });
});

describe('level 4: test chamber 09', () => {
  it('a flash reveals only lens 1’s own image, and two flashes are free in round 1', () => {
    const g = start(4, 5) as Extract<Game, { kind: 'relay' }>;
    expect(hud()).toMatch(/Charges ⚡⚡/);
    click('Flash: where lens 1 alone makes its image');
    expect(feedback()).toContain(`${g.rounds[0].v1} cm`);
    expect(feedback()).toMatch(/ignoring lens 2/);
    expect(feedback()).not.toContain(`${g.rounds[0].screen} cm`);
  });
});

describe('level 5: the magician’s tank', () => {
  it('the dip test reads out the lens in the current liquid, and the dark tank hides it in later rounds', () => {
    const g = start(5, 5);
    setSlider(1.5);
    click('Dip test: measure the lens in this liquid');
    expect(feedback()).toMatch(/Dip test in n = 1\.50: (converging|diverging|no focus)/);
    solveRound(5, g, 0);
    advance(1);
    expect($('.note')?.textContent).toMatch(/dark until the trick/);
  });
  it('a liquid that is too dense turns the lens diverging, and the miss says so without naming the right index', () => {
    const g = start(5, 5) as Extract<Game, { kind: 'liquid' }>;
    solveRound(5, g, 0);
    advance(1);
    setSlider(1.9);
    commit(5);
    advance(2.8);
    expect(feedback()).toMatch(/diverging/);
  });
});

describe('level 4: a miss shows only the player’s own screen', () => {
  it('two wrong screens on the same side give the same words and the same on-screen label, and nothing is drawn at the true image', () => {
    const calls: { fn: string; args: unknown[] }[] = [];
    const recorder = new Proxy({}, { get: (_t, fn: string) => (...args: unknown[]) => (calls.push({ fn, args }), undefined), set: () => true });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(recorder as never);
    // the burst particles fly in random directions and could cross the true image by chance (a flaky pass of about 1 run in 10): fix them
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const g = start(4, 5) as Extract<Game, { kind: 'relay' }>;
    const r = g.rounds[0];
    const sc = 570 / (r.u1 + 120);
    const x1 = 30 + r.u1 * sc;
    const x2 = x1 + r.s * sc;
    const trueX = x2 + r.v2 * sc;
    const texts: string[] = [];
    const seen: string[] = [];
    for (const sx of [Math.round(r.screen) + 8, Math.round(r.screen) + 20]) {
      setSlider(sx);
      calls.length = 0;
      commit(4);
      advance(2.2);
      expect(Math.abs(x1 + sx * sc - trueX)).toBeGreaterThan(1);
      const own = x1 + sx * sc;
      const xs = calls.filter((c) => ['arc', 'ellipse', 'lineTo', 'moveTo', 'fillRect'].includes(c.fn)).map((c) => Number(c.args[0]));
      expect(xs.some((x) => Math.abs(x - trueX) < 0.01 && Math.abs(x - own) > 1)).toBe(false);
      const t = calls.filter((c) => c.fn === 'fillText').map((c) => String(c.args[0]));
      texts.push(...t);
      expect(t).not.toContain('the image forms here');
      expect(t.some((s) => /formed (in front of|behind) the screen/.test(s))).toBe(true);
      seen.push(t.filter((s) => /formed (in front of|behind)/.test(s))[0]);
      advance(0.6);
      seen.push(feedback());
    }
    expect(seen[0]).toBe(seen[2]);
    expect(seen[1]).toBe(seen[3]);
    expect(texts.some((s) => /forms here/.test(s))).toBe(false);
    // a win still draws the true image
    calls.length = 0;
    setSlider(Math.round(r.screen));
    commit(4);
    advance(2.2);
    expect(calls.some((c) => c.fn === 'lineTo' && Math.abs(Number(c.args[0]) - trueX) < 0.01)).toBe(true);
  });
});

describe('level 6: one curved face', () => {
  const trackX = (r: number) => 60 + ((r + 50) * 540) / 100;
  it('opens with Ember, the brief’s story, a dial from −50 to 50 starting at 30, and the live preview in round 1 only', () => {
    start(6, 5);
    expect($('.hero .hero-name')?.textContent).toMatch(/^Ember/);
    expect($('.hero')?.textContent).toContain('A single curved glass face bends light by itself');
    expect(sliders()).toHaveLength(1);
    expect(sliders()[0].min).toBe('-50');
    expect(sliders()[0].max).toBe('50');
    expect(sliders()[0].value).toBe('30');
    expect($('.note')?.textContent).toMatch(/live preview shows where the light focuses/);
    expect($('.note')?.textContent).toMatch(/air \(n₁ = 1\)/);
    const g = buildGame(6, createRng(5));
    solveRound(6, g, 0);
    advance(1);
    expect($('.note')?.textContent).toMatch(/live preview is off/);
    solveRound(6, g, 1);
    advance(1);
    expect($('.note')?.textContent).toMatch(/No preview: work it out/);
    expect($('.note')?.textContent).toMatch(/virtual/);
  });
  it('the start setting never wins: firing at R = 30 costs a heart', () => {
    start(6, 5);
    commit(6);
    advance(2.8);
    expect(hearts()).toBe(2);
  });
  it('a test beam costs a charge and reads out the focus; the boss round has no charges', () => {
    const g = start(6, 5);
    expect(hud()).toMatch(/Charges ⚡/);
    click('Test beam: where the light focuses with this radius');
    expect(feedback()).toMatch(/Test beam: with R = 30 cm, the light (focuses [\d.]+ cm inside the rod|spreads as if from a point [\d.]+ cm in front of the face|leaves the face parallel)/);
    click('Test beam: where the light focuses with this radius');
    expect(feedback()).toMatch(/No charges left/);
    expect(feedback()).toMatch(/does not cost/);
    expect(hearts()).toBe(3);
    solveRound(6, g, 0);
    advance(1);
    solveRound(6, g, 1);
    advance(1);
    expect(hud()).toMatch(/BOSS/);
    expect(hud()).not.toMatch(/Charges/);
    click('Test beam: where the light focuses with this radius');
    expect(feedback()).toMatch(/No charges left/);
    expect(hearts()).toBe(3);
  });
  it('a radius of 0 is not a curved face: it is a free note, not a miss, and a test beam is not spent on it', () => {
    start(6, 5);
    setSlider(0);
    commit(6);
    expect(feedback()).toMatch(/not a curved face/);
    expect(feedback()).toMatch(/does not cost/);
    expect(phase()).toBe('play');
    expect(hearts()).toBe(3);
    click('Test beam: where the light focuses with this radius');
    expect(feedback()).toMatch(/not a curved face/);
    expect(hud()).toMatch(/Charges ⚡/);
  });
  it('a miss says only which way the face bent the light, with no number, and the same words however far off', () => {
    const g = start(6, 5) as Extract<Game, { kind: 'curved' }>;
    const seen = new Set<string>();
    for (const x of [g.rounds[0].sol + 4, g.rounds[0].sol + 14, g.rounds[0].sol + 30]) {
      if (x > 50) continue;
      setSlider(x);
      commit(6);
      advance(2.8);
      expect(feedback()).not.toMatch(/\d/);
      seen.add(feedback());
      if (phase() === 'over') break;
    }
    expect(seen.size).toBe(1);
    expect([...seen][0]).toMatch(/too weakly/);
  });
  it('the boss round wants a concave face: R = −40 wins, and the working says so', () => {
    const g = start(6, 7);
    solveRound(6, g, 0);
    advance(1);
    solveRound(6, g, 1);
    advance(1);
    expect(sliders()[0].value).toBe('30');
    setSlider(40);
    commit(6);
    advance(2.8);
    expect(hearts()).toBe(2);
    setSlider(-40);
    commit(6);
    advance(2.8);
    expect(phase()).toBe('won');
    expect(feedback()).toMatch(/R = −40 cm: a concave face/);
  });
  it('dragging the radius track sets whole centimetres, negative on the left', () => {
    start(6, 5);
    pointer('pointerdown', trackX(30), 44);
    pointer('pointermove', trackX(-17.4), 44);
    expect(sliders()[0].value).toBe('-17');
    pointer('pointerup', 0, 0);
  });
});

describe('robustness', () => {
  it('every level animates through a hit and a miss with no console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const g = start(level, 9);
      advance(0.8);
      setWrong(g, 0);
      commit(level);
      advance(3);
      solveRound(level, g, 0);
      advance(1);
    }
    expect(err).not.toHaveBeenCalled();
  });
});

// ---- no leaks, levels 1, 2, 3 and 5: the start never wins, and a miss shows a fixed effect with no number -------------------------

type Rec = ReturnType<typeof canvasRecorder>;
const frameAfter = (rc: Rec, dt: number) => {
  if (dt > 0.05) advance(dt - 0.05);
  rc.clear();
  advance(0.05);
  return rc.rec;
};
const playTo = (level: number, g: Game, round: number) => {
  for (let i = 0; i < round; i++) {
    solveRound(level, g, i);
    advance(1);
  }
};
/** One miss, then the frame 2 s into its animation, then the wait for the round to come back. */
const missEnd = (rc: Rec, level: number) => {
  commit(level);
  advance(2.0);
  const rec = frameAfter(rc, 0.05);
  // a snapshot: the recorder keeps appending while the round comes back
  const snap = { at: [...rec.at], strokes: [...rec.strokes], fills: [...rec.fills], arcs: [...rec.arcs] };
  advance(1);
  return snap;
};

describe('no leaks, levels 1, 2, 3 and 5: the start never wins', () => {
  it('firing at once is a miss in every round of these levels', () => {
    for (const level of [1, 2, 3, 5]) {
      for (const round of [0, 1, 2]) {
        const g = start(level, 5);
        playTo(level, g, round);
        const before = hearts();
        commit(level);
        advance(2.8);
        expect(hearts()).toBe(before - 1);
      }
    }
  });
  it('level 3 starts the lens at 0.7 of the slide-to-screen distance in every round', () => {
    const g = start(3, 5) as Extract<Game, { kind: 'projector' }>;
    expect(sliders()[0].value).toBe(String(Math.round(0.7 * g.rounds[0].D)));
    solveRound(3, g, 0);
    advance(1);
    expect(sliders()[0].value).toBe(String(Math.round(0.7 * g.rounds[1].D)));
  });
});

describe('no leaks, level 1: the missed focus is drawn a fixed 5 cm beside the sensor', () => {
  it('two wrong radii on the same side end with the same dot, the same words, and the dot is never at the sensor', () => {
    const AX = 190;
    for (const round of [0, 1, 2]) {
      for (const side of ['behind', 'front'] as const) {
        const rc = canvasRecorder();
        const g = start(1, 5) as Extract<Game, { kind: 'grind' }>;
        playTo(1, g, round);
        const r = g.rounds[round];
        const radii = side === 'behind' ? [r.sol + 8, r.sol + 15] : [Math.max(1, r.sol - 4), Math.max(1, r.sol - 7)];
        const want = 130 + (r.f + (side === 'behind' ? 5 : -5)) * 9;
        const ends: { dots: number[]; words: string[] }[] = [];
        for (const x of radii) {
          setSlider(x);
          const rec = missEnd(rc, 1);
          ends.push({ dots: rec.arcs.filter((a) => a.y === AX && a.r === 7).map((a) => a.x), words: texts(rec) });
        }
        expect(ends[0].dots.some((x) => Math.abs(x - want) < 1e-6)).toBe(true);
        expect(ends[0].dots).toEqual(ends[1].dots);
        expect(ends[0].dots.some((x) => Math.abs(x - (130 + r.f * 9)) < 1e-6)).toBe(false);
        expect(ends[0].words).toEqual(ends[1].words);
      }
    }
  });
  it('a miss says only behind or in front, with no number', () => {
    const g = start(1, 5) as Extract<Game, { kind: 'grind' }>;
    setSlider(g.rounds[0].sol + 9);
    commit(1);
    advance(2.8);
    expect(feedback()).toMatch(/behind Glim’s sensor/);
    expect(feedback()).not.toMatch(/\d/);
  });
});

describe('no leaks, level 2: a missed pair shows a direction, not its own power', () => {
  it('the pair’s power is printed on a win and never on a miss; round 1 has it live, round 2 does not', () => {
    for (const round of [0, 1, 2]) {
      const rc = canvasRecorder();
      const g = start(2, 5) as Extract<Game, { kind: 'stack' }>;
      playTo(2, g, round);
      const r = g.rounds[round];
      if (round === 0) expect(texts(frameAfter(rc, 0.1)).some((s) => /^pair: /.test(s))).toBe(true);
      else expect(texts(frameAfter(rc, 0.1)).some((s) => /^pair: /.test(s))).toBe(false);
      setSlider(r.P2 + 3 > 10 ? r.P2 - 3 : r.P2 + 3);
      commit(2);
      advance(2.0);
      const miss = texts(frameAfter(rc, 0.05));
      expect(miss.some((s) => /^pair: /.test(s))).toBe(false);
      expect(miss.some((s) => /^the pair is too (converging|diverging)$/.test(s))).toBe(true);
      advance(1);
      setSlider(r.P2);
      commit(2);
      advance(2.0);
      expect(texts(frameAfter(rc, 0.05)).some((s) => /^pair: /.test(s))).toBe(true);
    }
  });
  it('two wrong back lenses on the same side end on the same words', () => {
    for (const round of [0, 1, 2]) {
      for (const side of ['up', 'down'] as const) {
        const rc = canvasRecorder();
        const g = start(2, 5) as Extract<Game, { kind: 'stack' }>;
        playTo(2, g, round);
        const r = g.rounds[round];
        const ends: string[][] = [];
        for (const d of [2, 3]) {
          setSlider(Math.max(-10, Math.min(10, r.P2 + (side === 'up' ? d : -d))));
          // apart from the label of the player's own back lens
          ends.push(texts(missEnd(rc, 2)).filter((s) => !/^back /.test(s)));
        }
        expect(ends[0]).toEqual(ends[1]);
      }
    }
  });
  it('a miss says only too converging or too diverging, with no number', () => {
    const g = start(2, 5) as Extract<Game, { kind: 'stack' }>;
    setSlider(g.rounds[0].P2 + 3 > 10 ? g.rounds[0].P2 - 3 : g.rounds[0].P2 + 3);
    commit(2);
    advance(2.8);
    expect(feedback()).toMatch(/too (converging|diverging)/);
    expect(feedback()).not.toMatch(/\d/);
  });
});

describe('no leaks, level 3: a missed picture is worded and drawn by category only', () => {
  it('two wrong settings in the same category end on the same words, and nothing marks where the picture formed', () => {
    let tested = 0;
    for (const round of [0, 1, 2]) {
      const g0 = start(3, 5) as Extract<Game, { kind: 'projector' }>;
      const r = g0.rounds[round];
      const groups = new Map<string, [number, number][]>();
      for (const f of [8, 12, 16, 20, 24, 28, 32, 40]) {
        for (let x = 6; x <= r.D - 6; x += 7) {
          if (f === r.f && Math.abs(x - r.u) <= 0.5) continue;
          const m = projectorMiss(r, f, x);
          if (m.none) continue;
          const key = `${m.where}/${m.size}`;
          groups.set(key, [...(groups.get(key) ?? []), [f, x]]);
        }
      }
      for (const list of groups.values()) {
        const two = [list[0], list.find((p) => p[0] !== list[0][0] && p[1] !== list[0][1])].filter(Boolean) as [number, number][];
        if (two.length < 2) continue;
        const rc = canvasRecorder();
        const g = start(3, 5);
        playTo(3, g, round);
        const ends: string[][] = [];
        for (const [f, x] of two) {
          setSlider(x, 0);
          setSlider(f, 1);
          const t = texts(missEnd(rc, 3));
          expect(t.some((s) => /forms here/.test(s))).toBe(false);
          ends.push(t.filter((s) => !/^f = [\d.]+ cm$/.test(s)));
        }
        expect(ends[0]).toEqual(ends[1]);
        tested++;
      }
    }
    expect(tested).toBeGreaterThan(5);
  });
  it('a miss says where the picture formed against the screen and its size against the frame, with no number', () => {
    const g = start(3, 5) as Extract<Game, { kind: 'projector' }>;
    setSlider(g.rounds[0].u, 0);
    setSlider(g.rounds[0].f + 2, 1);
    commit(3);
    advance(2.8);
    expect(feedback()).toMatch(/(short of|beyond) the screen: a blur|sharp on the screen/);
    expect(feedback()).toMatch(/frame/);
    expect(feedback()).not.toMatch(/\d/);
  });
});

describe('no leaks, level 5: a missed liquid shows the side, not the lens’s own focal length', () => {
  it('the focal length is printed on a win and never on a miss', () => {
    for (const round of [0, 1, 2]) {
      const rc = canvasRecorder();
      const g = start(5, 5) as Extract<Game, { kind: 'liquid' }>;
      playTo(5, g, round);
      const r = g.rounds[round];
      setSlider(Math.max(1.1, Math.round((r.nL - 0.07) * 100) / 100));
      commit(5);
      advance(2.0);
      const miss = texts(frameAfter(rc, 0.05));
      expect(miss.some((s) => /f = |no focus at all/.test(s))).toBe(false);
      expect(miss.some((s) => /^the lens is /.test(s))).toBe(true);
      advance(1);
      setSlider(Math.round(r.nL * 100) / 100);
      commit(5);
      advance(2.0);
      expect(texts(frameAfter(rc, 0.05)).some((s) => /f = |no focus at all/.test(s))).toBe(true);
    }
  });
  it('two wrong liquids on the same side end on the same words', () => {
    for (const round of [0, 1, 2]) {
      for (const side of ['up', 'down'] as const) {
        const rc = canvasRecorder();
        const g = start(5, 5) as Extract<Game, { kind: 'liquid' }>;
        playTo(5, g, round);
        const r = g.rounds[round];
        const ends: string[][] = [];
        for (const d of [0.06, 0.15]) {
          setSlider(Math.max(1.1, Math.min(1.9, Math.round((r.nL + (side === 'up' ? d : -d)) * 100) / 100)));
          ends.push(texts(missEnd(rc, 5)).filter((s) => !/^liquid: n = /.test(s)));
        }
        expect(ends[0]).toEqual(ends[1]);
      }
    }
  });
  it('a miss says only the side, with no number', () => {
    const g = start(5, 5) as Extract<Game, { kind: 'liquid' }>;
    setSlider(Math.round((g.rounds[0].nL + 0.1) * 100) / 100);
    commit(5);
    advance(2.8);
    expect(feedback()).toMatch(/diverging lens: it has not vanished/);
    expect(feedback()).not.toMatch(/\d/);
  });
});
