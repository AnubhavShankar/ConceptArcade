// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/gauss-symmetry-lab/index';
import { buildLevel, CORRECT_SURFACE, SURFACE_NAME, type Level, type LevelFindQ, type LevelLine, type LevelPick, type LevelShell, type LevelSheet, type Surface } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/gauss-symmetry-lab/logic';
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
  const m = manifest('gs');
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
const ANIM = 1.6;

describe('level 1: pick the surface', () => {
  const pickSurface = (s: Surface) => {
    click(SURFACE_NAME[s]);
    click('Check this surface');
  };
  it('three right choices in a row win, advancing through the rounds', () => {
    const l = start(1, 3) as LevelPick;
    for (let i = 0; i < 3; i++) {
      expect([...root.querySelectorAll('.muted')].map((e) => e.textContent).join(' ')).toMatch(new RegExp(`Round ${i + 1} of 3`));
      pickSurface(CORRECT_SURFACE[l.rounds[i]]);
      advance(2);
    }
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/perpendicular|same size|no flux/);
  });
  it('a wrong surface (a cube or a blob) never works, and the reason is explained only after a right choice', () => {
    const l = start(1, 3) as LevelPick;
    pickSurface('cube');
    expect(feedback()).toMatch(/does not make the field constant and perpendicular/);
    expect(feedback()).toMatch(/0 free tests left/);
    pickSurface('blob');
    expect(feedback()).toMatch(/cost a star/);
    pickSurface(CORRECT_SURFACE[l.rounds[0]]);
    expect(feedback()).toMatch(/^Right\./);
    advance(2);
    pickSurface(CORRECT_SURFACE[l.rounds[1]]);
    advance(2);
    pickSurface(CORRECT_SURFACE[l.rounds[2]]);
    advance(2);
    expect(wins).toEqual([2]);
  });
  it('asks for a surface first, for free', () => {
    start(1, 3);
    click('Check this surface');
    expect(feedback()).toMatch(/Choose a surface first/);
    expect(feedback()).toMatch(/does not cost/);
  });
  it('the selection is cleared when the next round starts', () => {
    const l = start(1, 3) as LevelPick;
    pickSurface(CORRECT_SURFACE[l.rounds[0]]);
    advance(2);
    expect(btn(SURFACE_NAME[CORRECT_SURFACE[l.rounds[0]]])!.getAttribute('aria-pressed')).toBe('false');
    click('Check this surface');
    expect(feedback()).toMatch(/Choose a surface first/);
  });
});

describe('level 2: the long wire', () => {
  const check = (lam: number, fall: string) => {
    typeIn('Charge per unit length in µC/m', r6(lam));
    click(`Field at twice the distance is ${fall}`);
    click('Check the wire');
    advance(ANIM);
  };
  it('the right λ and a fall-off of 1/2 win, with the working shown', () => {
    const l = start(2, 4) as LevelLine;
    check(l.lambda, '1/2');
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/2π ε₀ r/);
  });
  it('treating the wire like a point charge (1/4) is called out, separately from the λ', () => {
    const l = start(2, 4) as LevelLine;
    check(l.lambda, '1/4');
    expect(feedback()).toMatch(/does not fall that fast/);
    expect(feedback()).not.toMatch(/charge per unit length is not right/);
    check(l.lambda * 2, '1/2');
    expect(feedback()).toMatch(/charge per unit length is not right/);
    expect(feedback()).toMatch(/cost a star/);
  });
  it('needs a positive λ and a fall-off first, for free', () => {
    const l = start(2, 4) as LevelLine;
    click('Check the wire');
    expect(feedback()).toMatch(/positive number of µC\/m/);
    typeIn('Charge per unit length in µC/m', r6(l.lambda));
    click('Check the wire');
    expect(feedback()).toMatch(/twice the distance/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 3: sheets and plates', () => {
  const find = (mode: 'sheet' | 'plates') => {
    for (let s = 1; s < 300; s++) if ((buildLevel(3, createRng(s)) as LevelSheet).mode === mode) return s;
    throw new Error('no seed');
  };
  it('a sheet: σ/2ε₀ and "the same at twice the distance" win', () => {
    const l = start(3, find('sheet')) as LevelSheet;
    typeIn('Field near the sheet in N/C', r6(l.first));
    click('Field at twice the distance is the same');
    click('Check the field');
    advance(ANIM);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/does not depend on the distance/);
  });
  it('a sheet: "the field halves with distance" is called out', () => {
    const l = start(3, find('sheet')) as LevelSheet;
    typeIn('Field near the sheet in N/C', r6(l.first));
    click('Field at twice the distance is half');
    click('Check the field');
    expect(feedback()).toMatch(/not how the field of a large sheet changes/);
    expect(wins).toEqual([]);
  });
  it('plates: σ/ε₀ between and 0 outside win', () => {
    const l = start(3, find('plates')) as LevelSheet;
    typeIn('Field between the plates in N/C', r6(l.first));
    typeIn('Field outside the plates in N/C', '0');
    click('Check the field');
    advance(ANIM);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/cancel/);
  });
  it('plates: forgetting that the fields add, or giving a field outside, is caught separately', () => {
    const l = start(3, find('plates')) as LevelSheet;
    typeIn('Field between the plates in N/C', r6(l.first / 2));
    typeIn('Field outside the plates in N/C', r6(l.first / 2));
    click('Check the field');
    expect(feedback()).toMatch(/between the plates is not right/);
    expect(feedback()).toMatch(/outside the plates is not right/);
  });
});

describe('level 4: inside or outside the shell', () => {
  const find = (region: 'inside' | 'outside', q?: 1 | -1) => {
    for (let s = 1; s < 500; s++) {
      const l = buildLevel(4, createRng(s)) as LevelShell;
      if (l.region === region && (q === undefined || Math.sign(l.q) === q)) return s;
    }
    throw new Error('no seed');
  };
  const answer = (l: LevelShell) => {
    click(`The probe is ${l.region}`);
    typeIn('Field at the probe in N/C', r6(l.field));
    click(l.dir === 'none' ? 'There is no field' : `The field points ${l.dir}`);
    click('Check the probe');
    advance(ANIM);
  };
  it('inside: no field and no direction wins', () => {
    const l = start(4, find('inside')) as LevelShell;
    answer(l);
    expect(wins).toEqual([3]);
    expect($('.solution')?.textContent).toMatch(/Gaussian sphere encloses no charge/);
  });
  it('outside: kq/r² pointing with the sign of the charge wins, for both signs', () => {
    for (const q of [1, -1] as const) {
      const l = start(4, find('outside', q)) as LevelShell;
      wins = [];
      answer(l);
      expect(wins).toEqual([3]);
    }
  });
  it('treating the inside like the outside is caught on all three counts', () => {
    const l = start(4, find('inside')) as LevelShell;
    click('The probe is outside');
    typeIn('Field at the probe in N/C', '5000');
    click('The field points outward');
    click('Check the probe');
    expect(feedback()).toMatch(/Compare the probe’s distance with the radius/);
    expect(feedback()).toMatch(/field strength is not right/);
    expect(feedback()).toMatch(/direction is not right/);
    void l;
  });
  it('needs region and direction first, for free', () => {
    start(4, 3);
    click('Check the probe');
    expect(feedback()).toMatch(/inside or outside, and which way/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('level 5: find the charge', () => {
  const find = (dir: 'inward' | 'outward') => {
    for (let s = 1; s < 300; s++) if ((buildLevel(5, createRng(s)) as LevelFindQ).dir === dir) return s;
    throw new Error('no seed');
  };
  const answer = (q: number, matters = 'no') => {
    typeIn('Charge on the sphere in nC', r6(q));
    click(`The radius matters: ${matters}`);
    click('Check the charge');
    advance(ANIM);
  };
  it('the signed charge wins for both directions of field, and the radius is said not to matter', () => {
    for (const dir of ['inward', 'outward'] as const) {
      const l = start(5, find(dir)) as LevelFindQ;
      wins = [];
      answer(l.answer);
      expect(wins).toEqual([3]);
    }
    expect($('.solution')?.textContent).toMatch(/point charge/);
  });
  it('the wrong sign gets a pointer to the direction of the field', () => {
    const l = start(5, find('inward')) as LevelFindQ;
    answer(-l.answer);
    expect(feedback()).toMatch(/Check the sign/);
  });
  it('saying the radius matters is called out', () => {
    const l = start(5, 3) as LevelFindQ;
    answer(l.answer, 'yes');
    expect(feedback()).toMatch(/only the total charge and the distance from the centre matter/);
  });
  it('rejects zero and missing input for free', () => {
    start(5, 3);
    typeIn('Charge on the sphere in nC', '0');
    click('Check the charge');
    expect(feedback()).toMatch(/Enter the charge in nC/);
    expect(feedback()).toMatch(/does not cost/);
  });
});

describe('robustness', () => {
  it('every level mounts, animates and settles without a console error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of [1, 2, 3, 4, 5]) {
      start(level, 9);
      expect($('p')?.textContent?.length).toBeGreaterThan(40);
      advance(0.6);
      expect(canvas().dataset.phase).toBe('idle');
    }
    expect(err).not.toHaveBeenCalled();
  });
});
