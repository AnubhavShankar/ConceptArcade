// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/flux-gate/index';
import { buildLevel, FACES, type FaceState, type Level, type LevelAngle, type LevelCube, type LevelGrow, type LevelTilt } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/flux-gate/logic';
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
  const m = manifest('fg');
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  const ctx = { root, manifest: m, level, levelCount: 4, levelInfo: m.levels[Math.min(level, 3) - 1], random: createRng(seed), randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
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
const ANIM = 1.6;
const r6 = (x: number) => String(Number(x.toPrecision(6)));

describe('level 1: tilt the loop', () => {
  const ANGLE = 'Angle between the loop’s normal and the field in degrees';
  const setAngle = (a: number) => {
    const s = input(ANGLE);
    s.value = String(a);
    s.dispatchEvent(new Event('input', { bubbles: true }));
  };
  it('the angle that gives the target flux wins, with the working shown', () => {
    const l = start(1, 3) as LevelTilt;
    setAngle(l.thetaAnswer);
    click('Lock the loop');
    advance(ANIM);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/E A cos θ/);
  });
  it('the meter shows the flux live as the loop turns', () => {
    const l = start(1, 3) as LevelTilt;
    setAngle(0);
    step(50);
    const a = $('.v-readout')!.textContent;
    setAngle(90);
    step(50);
    const b = $('.v-readout')!.textContent;
    expect(a).not.toBe(b);
    expect(b).toMatch(/^Φ = 0 N m²\/C$|^Φ = [-−]?[\d.]+( × 10[⁻⁰-⁹]+)? N m²\/C$/);
    void l;
  });
  it('a wrong angle says whether the flux is larger or smaller, the first miss is free', () => {
    const l = start(1, 3) as LevelTilt;
    setAngle(l.thetaAnswer < 90 ? l.thetaAnswer + 25 : l.thetaAnswer - 25);
    click('Lock the loop');
    expect(feedback()).toMatch(/(larger|smaller) than the target/);
    expect(feedback()).toMatch(/0 free tests left/);
    click('Lock the loop');
    expect(feedback()).toMatch(/cost a star/);
    setAngle(l.thetaAnswer);
    click('Lock the loop');
    advance(ANIM);
    expect(wins).toEqual([2]);
  });
  it('the verdict animates and the controls lock after the win', () => {
    const l = start(1, 3) as LevelTilt;
    step(50);
    expect(canvas().dataset.phase).toBe('idle');
    setAngle(l.thetaAnswer);
    click('Lock the loop');
    step(50);
    expect(canvas().dataset.phase).toBe('testing');
    advance(ANIM);
    expect(canvas().dataset.phase).toBe('done');
    expect(btn('Lock the loop')!.disabled).toBe(true);
    expect(wins).toHaveLength(1);
  });
});

describe('level 2: the faces of a cube', () => {
  const setFace = (i: number, want: FaceState) => {
    const clicks = want === 1 ? 1 : want === -1 ? 2 : 3;
    for (let k = 0; k < clicks; k++) click(`Face ${FACES[i]}`);
  };
  const answer = (l: LevelCube) => {
    l.states.forEach((s, i) => setFace(i, s));
    typeIn('Flux through the +x face in N m²/C', r6(l.rightFlux));
    typeIn('Net flux through the cube in N m²/C', '0');
  };
  it('the right signs, the +x flux and a net flux of zero win', () => {
    const l = start(2, 4) as LevelCube;
    answer(l);
    click('Check the cube');
    advance(ANIM);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/net flux through the cube is zero/);
  });
  it('a face cycles through leaves, enters, skims', () => {
    start(2, 4);
    click('Face +x');
    expect(btn('Face +x')!.textContent).toMatch(/leaves \(\+\)/);
    click('Face +x');
    expect(btn('Face +x')!.textContent).toMatch(/enters \(−\)/);
    click('Face +x');
    expect(btn('Face +x')!.textContent).toMatch(/skims \(0\)/);
  });
  it('needs all six faces and both numbers first, for free', () => {
    const l = start(2, 4) as LevelCube;
    click('Check the cube');
    expect(feedback()).toMatch(/all six faces/);
    expect(feedback()).toMatch(/does not cost/);
    l.states.forEach((s, i) => setFace(i, s));
    click('Check the cube');
    expect(feedback()).toMatch(/Enter the flux through the \+x face and the net flux/);
  });
  it('counts wrong faces without naming them, and flags a wrong net flux', () => {
    const l = start(2, 4) as LevelCube;
    l.states.forEach((s, i) => setFace(i, i === 0 ? ((s === 1 ? -1 : 1) as FaceState) : s));
    typeIn('Flux through the +x face in N m²/C', r6(l.rightFlux));
    typeIn('Net flux through the cube in N m²/C', r6(l.e * l.side * l.side));
    click('Check the cube');
    expect(feedback()).toMatch(/1 of the 6 faces has the wrong sign/);
    expect(feedback()).toMatch(/net flux is not right/);
    expect(wins).toEqual([]);
  });
});

describe('level 3: find the angle', () => {
  const ANGLE = 'Angle between the normal and the field in degrees';
  const go = (a: string | number) => {
    typeIn(ANGLE, a);
    click('Turn the loop');
    advance(ANIM + 1.2); // the loop turns, then the verdict flashes
  };
  it('the right angle wins, including a negative flux (an angle above 90°)', () => {
    for (const wantObtuse of [false, true]) {
      let seed = 1;
      for (; seed < 400; seed++) {
        const l = buildLevel(3, createRng(seed)) as LevelAngle;
        if ((l.thetaAnswer > 90) === wantObtuse) break;
      }
      const l = start(3, seed) as LevelAngle;
      wins = [];
      go(l.thetaAnswer);
      expect(wins).toEqual([3]);
    }
  });
  it('the loop turns first (phase testing) and the verdict comes after', () => {
    const l = start(3, 5) as LevelAngle;
    typeIn(ANGLE, l.thetaAnswer + 40);
    click('Turn the loop');
    advance(0.3);
    expect(canvas().dataset.phase).toBe('testing');
    expect(feedback()).toBe('');
    advance(ANIM);
    expect(feedback()).toMatch(/(more|less) than the target/);
  });
  it('rejects an angle outside 0 to 180 for free', () => {
    start(3, 5);
    for (const bad of ['', '200', '-10', 'x']) {
      typeIn(ANGLE, bad);
      click('Turn the loop');
      expect(feedback()).toMatch(/between 0° and 180°/);
      expect(feedback()).toMatch(/does not cost/);
    }
  });
  it('a wrong angle costs a star after the free test', () => {
    const l = start(3, 5) as LevelAngle;
    go(l.thetaAnswer < 90 ? l.thetaAnswer + 30 : l.thetaAnswer - 30);
    expect(feedback()).toMatch(/0 free tests left/);
    go(l.thetaAnswer < 90 ? l.thetaAnswer + 30 : l.thetaAnswer - 30);
    expect(feedback()).toMatch(/cost a star/);
    go(l.thetaAnswer);
    expect(wins).toEqual([2]);
  });
});

describe('level 4: the growing field', () => {
  const NET = 'Net flux through the cube in N m²/C';
  const go = (v: string | number) => {
    typeIn(NET, v);
    click('Measure the net flux');
    advance(ANIM);
  };
  it('the net flux of the two faces wins and the explanation says it is not zero', () => {
    const l = start(4, 6) as LevelGrow;
    go(r6(l.net));
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/not zero, so the cube must contain charge/);
  });
  it('a wrong value says too large or too small, and using only the far face is a miss', () => {
    const l = start(4, 6) as LevelGrow;
    go(r6(l.alpha * Math.sqrt(2 * l.a) * l.a * l.a));
    expect(feedback()).toMatch(/too large/);
    go(r6(l.net * 0.5));
    expect(feedback()).toMatch(/too small/);
    expect(feedback()).toMatch(/cost a star/);
  });
  it('rejects empty input for free', () => {
    start(4, 6);
    click('Measure the net flux');
    expect(feedback()).toMatch(/Enter the net flux/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('robustness', () => {
  it('every level mounts and draws frames without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      advance(0.6);
    }
    expect(err).not.toHaveBeenCalled();
  });
});
