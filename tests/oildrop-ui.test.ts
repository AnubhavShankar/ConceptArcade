// @vitest-environment jsdom
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch01-electric-charges-and-fields/quantum-of-charge/index';
import { buildLevel, determinesUnit, gcdAll, hoverVoltage, isImpure } from '../src/games/physics/class-12/ch01-electric-charges-and-fields/quantum-of-charge/logic';
import { createRng } from '../src/core/random';
import type { GameContext } from '../src/core/types';
import { manifest } from './fixtures';

// ---- a fake browser: a stub canvas, and an animation clock we step by hand ----------------------
let step: (ms: number) => void;
let clock = 0;
let stop: (() => void) | void;
let wins: number[];
let root: HTMLElement;

beforeEach(() => {
  clock = 0;
  wins = [];
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
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

/** Run the clock for this many seconds in 50 ms frames (the longest step the loop allows). */
const advance = (seconds: number) => {
  for (let i = 0; i < Math.round(seconds / 0.05); i++) step(50);
};

function start(level: number, seed: number) {
  const m = manifest('oil');
  const rng = createRng(seed);
  const ctx = { root, manifest: m, level, levelCount: 3, levelInfo: m.levels[level - 1], random: rng, randomInt: (a: number) => a, win: ({ stars }: { stars: number }) => wins.push(stars), restart: () => undefined } as unknown as GameContext;
  stop = game.mount(ctx);
  return buildLevel(level, createRng(seed)); // the same level the game built, from the same seed
}

const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;
const $$ = (sel: string) => [...root.querySelectorAll(sel)] as HTMLElement[];
const click = (el: Element | null) => {
  if (!el) throw new Error('nothing to click');
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
const clickLabel = (label: string) => click($(`[aria-label="${label}"]`));
/** Move one of the two voltage knobs, as dragging it would. */
const knob = (label: string, value: number) => {
  const el = $(`input[aria-label="${label}"]`) as HTMLInputElement;
  el.value = String(value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
/** Reach a voltage with the coarse knob (whole volts) and the fine knob (the rest). */
const setVolts = (v: number) => {
  const c = Math.max(0, Math.min(600, Math.round(v)));
  knob('Voltage, coarse knob', c);
  knob('Voltage, fine knob', Math.round((v - c) * 100) / 100);
};
const selectDrop = (id: number) => click($$('button').find((b) => b.textContent?.startsWith(`Drop ${id}`) && b.getAttribute('aria-pressed') !== null) ?? null);
const status = () => $('.status-line')?.textContent ?? '';
const feedback = () => $('.feedback')?.textContent ?? '';

/** Tune the voltage to a drop's hover voltage and hold it long enough to record. */
function measure(level: ReturnType<typeof buildLevel>, id: number, offBy = 1) {
  selectDrop(id);
  const d = level.drops.find((x) => x.id === id)!;
  setVolts(Math.round(hoverVoltage(d) * offBy * 10) / 10);
  advance(1.2);
  clickLabel('Record this drop');
}

describe('the chamber behaves like physics', () => {
  it('a drop falls with no voltage, rises with too much, and hovers at the hover voltage', () => {
    const lvl = start(1, 3);
    const d = lvl.drops[0];
    advance(0.2);
    expect(status()).toContain('no voltage yet');
    setVolts(Math.round(hoverVoltage(d) * 1.3));
    advance(0.1);
    expect(status()).toContain('rising');
    setVolts(Math.round(hoverVoltage(d) * 0.7));
    advance(0.1);
    expect(status()).toContain('falling');
    setVolts(Math.round(hoverVoltage(d) * 10) / 10);
    advance(0.1);
    expect(status()).toContain('hovering');
  });

  it('the drop can only be recorded after it has hovered steadily for a full second', () => {
    const lvl = start(1, 3);
    const d = lvl.drops[0];
    const record = () => $('[aria-label="Record this drop"]') as HTMLButtonElement;
    expect(record().disabled).toBe(true);
    setVolts(Math.round(hoverVoltage(d) * 10) / 10);
    advance(0.5);
    expect(record().disabled).toBe(true); // not long enough
    advance(0.7);
    expect(record().disabled).toBe(false);
    setVolts(Math.round(hoverVoltage(d) * 1.2)); // knocked off balance: the timer starts over
    advance(0.1);
    expect(record().disabled).toBe(true);
  });

  it('the voltage can never go above the top of the dial, even with both knobs at the top', () => {
    start(1, 3);
    knob('Voltage, coarse knob', 600);
    knob('Voltage, fine knob', 5);
    expect($('.v-readout')?.textContent).toBe('600.00 V');
    click($$('button').find((b) => b.getAttribute('aria-label') === 'Voltage down 1 volt') ?? null);
    expect($('.v-readout')?.textContent).toBe('599.00 V');
  });

  it('runs without a single error in the console', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const lvl = start(2, 4);
    measure(lvl, 1);
    advance(1);
    expect(err).not.toHaveBeenCalled();
  });
});

describe('level 1: hold the drop, then count electrons', () => {
  it('plays through to a win with three stars', () => {
    const lvl = start(1, 3);
    for (const d of lvl.drops) {
      measure(lvl, d.id);
      expect($('table.data')?.textContent).toContain(String(d.id));
    }
    expect($$('table.data tbody tr')).toHaveLength(3);
    for (const d of lvl.drops) {
      const input = $(`input[aria-label="Electrons on drop ${d.id}"]`) as HTMLInputElement;
      input.value = String(d.multiple);
      clickLabel(`Check electrons on drop ${d.id}`);
    }
    expect(wins).toEqual([3]);
  });

  it('a wrong count says so, does not give the answer, and costs a star', () => {
    const lvl = start(1, 3);
    for (const d of lvl.drops) measure(lvl, d.id);
    const first = lvl.drops[0];
    (($(`input[aria-label="Electrons on drop ${first.id}"]`)) as HTMLInputElement).value = String(first.multiple + 1);
    clickLabel(`Check electrons on drop ${first.id}`);
    expect(feedback()).toMatch(/Not quite/);
    expect(feedback()).not.toContain(String(first.multiple));
    for (const d of lvl.drops) {
      (($(`input[aria-label="Electrons on drop ${d.id}"]`)) as HTMLInputElement).value = String(d.multiple);
      clickLabel(`Check electrons on drop ${d.id}`);
    }
    expect(wins).toEqual([2]);
  });

  it('the recorded charge matches the drop, within the tuning tolerance', () => {
    const lvl = start(1, 3);
    const d = lvl.drops[0];
    measure(lvl, d.id, 1.02); // tuned 2% high, inside the 3% tolerance
    const q = Number($('table.data tbody tr td:nth-child(4)')?.textContent);
    const truth = d.charge / 1e-19;
    expect(Math.abs(q - truth) / truth).toBeLessThan(0.03);
    expect(Math.abs(q - truth) / truth).toBeGreaterThan(0.005); // sloppier tuning really does cost accuracy
  });
});

describe('level 2: find the unit, only when the data can show it', () => {
  const submit = (value: string) => {
    ($('input[aria-label^="Unit of charge"]') as HTMLInputElement).value = value;
    click($$('button').find((b) => b.textContent === 'Submit unit') ?? null);
  };

  it('refuses with fewer than three drops, and it costs nothing', () => {
    const lvl = start(2, 4);
    measure(lvl, 1);
    measure(lvl, 2);
    submit('1.6');
    expect(feedback()).toMatch(/at least three drops/);
    expect(wins).toEqual([]);
  });

  it('refuses when the measured drops could all be multiples of something bigger, without saying what', () => {
    // find a level where three drops share a common factor
    let seed = 0;
    let common: number[] | null = null;
    let lvl = buildLevel(2, createRng(1));
    for (seed = 1; seed < 400 && !common; seed++) {
      lvl = buildLevel(2, createRng(seed));
      const ids = lvl.drops.map((d) => d.id);
      for (const a of ids) for (const b of ids) for (const c of ids) {
        if (a < b && b < c && !determinesUnit([a, b, c].map((i) => lvl.drops.find((d) => d.id === i)!))) common ??= [a, b, c];
      }
    }
    expect(common).not.toBeNull();
    start(2, seed - 1);
    for (const id of common!) measure(lvl, id);
    submit('1.6');
    expect(feedback()).toMatch(/could all be multiples of something bigger/);
    expect(feedback()).not.toMatch(/\d/); // no numbers: nothing about 2e, 3e or the unit
    expect(wins).toEqual([]);
  });

  it('accepts the right unit once the drops can show it (in 10⁻¹⁹ C or in coulombs), three stars', () => {
    const lvl = start(2, 4);
    for (const d of lvl.drops) measure(lvl, d.id);
    submit('1.6');
    expect(wins).toEqual([3]);
  });

  it('accepts 1.6e-19 typed in coulombs too', () => {
    const lvl = start(2, 4);
    for (const d of lvl.drops) measure(lvl, d.id);
    submit('1.6e-19');
    expect(wins).toEqual([3]);
  });

  it('a wrong unit, such as twice the unit, costs a star and reveals nothing', () => {
    const lvl = start(2, 4);
    for (const d of lvl.drops) measure(lvl, d.id);
    submit('3.2');
    expect(feedback()).toMatch(/does not fit all your data/);
    expect(feedback()).not.toContain('1.6');
    submit('1.6');
    expect(wins).toEqual([2]);
  });

  it('the level always has an answer: all five drops together do determine the unit', () => {
    for (let s = 1; s < 40; s++) expect(gcdAll(buildLevel(2, createRng(s)).drops.map((d) => d.multiple))).toBe(1);
  });
});

describe('level 3: impure samples', () => {
  const flag = (id: number, on = true) => {
    const box = $(`input[aria-label="Flag drop ${id} as impure"]`) as HTMLInputElement;
    box.checked = on;
    box.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const submit = () => clickLabel('Submit flags');

  it('will not judge until every drop is measured, and it costs nothing', () => {
    const lvl = start(3, 5);
    measure(lvl, 1);
    submit();
    expect(feedback()).toMatch(/Measure all 6 drops first/);
    expect(wins).toEqual([]);
  });

  it('shows the charge divided by e, and the half-integer drops are visibly off a whole number', () => {
    const lvl = start(3, 5);
    for (const d of lvl.drops) measure(lvl, d.id);
    const ratios = $$('table.data tbody tr').map((tr) => Number(tr.children[4].textContent));
    lvl.drops.forEach((d, i) => {
      const frac = Math.abs(ratios[i] - Math.round(ratios[i]));
      if (isImpure(d)) expect(frac).toBeGreaterThan(0.25);
      else expect(frac).toBeLessThan(0.25);
    });
  });

  it('flagging exactly the impure samples wins with three stars', () => {
    const lvl = start(3, 5);
    for (const d of lvl.drops) measure(lvl, d.id);
    for (const d of lvl.drops.filter(isImpure)) flag(d.id);
    submit();
    expect(wins).toEqual([3]);
  });

  it('flagging a good sample, or missing an impure one, costs a star and reveals nothing', () => {
    const lvl = start(3, 5);
    for (const d of lvl.drops) measure(lvl, d.id);
    const good = lvl.drops.find((d) => !isImpure(d))!;
    flag(good.id);
    submit();
    expect(feedback()).toMatch(/Not quite/);
    expect(feedback()).not.toMatch(/\d/);
    flag(good.id, false);
    for (const d of lvl.drops.filter(isImpure)) flag(d.id);
    submit();
    expect(wins).toEqual([2]);
  });
});

describe('the controls (regressions: tight rows, and a knob too coarse to hit a narrow window)', () => {
  it('two knobs add up: coarse + fine is the voltage, with the total and each knob shown separately', () => {
    start(1, 3);
    knob('Voltage, coarse knob', 48);
    knob('Voltage, fine knob', 5);
    expect($('.v-readout')?.textContent).toBe('53.00 V');
    expect($$('.knob-val').map((e) => e.textContent)).toEqual(['48 V', '+5.00 V']);
    knob('Voltage, fine knob', -2.5);
    expect($$('.knob-val').map((e) => e.textContent)).toEqual(['48 V', '−2.50 V']);
    expect($('.v-readout')?.textContent).toBe('45.50 V');
  });

  it('moving the coarse knob never moves the fine knob, so nothing jumps under your finger', () => {
    start(1, 3);
    knob('Voltage, fine knob', 2.37);
    knob('Voltage, coarse knob', 100);
    expect((($('input[aria-label="Voltage, fine knob"]')) as HTMLInputElement).value).toBe('2.37');
    expect($('.v-readout')?.textContent).toBe('102.37 V');
  });

  it('the nudge buttons set both knobs to match the new voltage', () => {
    start(1, 3);
    setVolts(10.5);
    click($$('button').find((b) => b.getAttribute('aria-label') === 'Voltage up 1 volt') ?? null);
    expect($('.v-readout')?.textContent).toBe('11.50 V');
    expect((($('input[aria-label="Voltage, coarse knob"]')) as HTMLInputElement).value).toBe('12');
    expect((($('input[aria-label="Voltage, fine knob"]')) as HTMLInputElement).value).toBe('-0.5');
  });

  it('every hover window is far wider than one step of the fine knob, so a narrow window can always be hit', () => {
    for (const level of [1, 2, 3]) {
      for (let s = 1; s < 80; s++) {
        const l = buildLevel(level, createRng(s));
        for (const d of l.drops) expect(2 * l.tol * hoverVoltage(d)).toBeGreaterThan(0.5); // volts; a fine step is 0.01 V
      }
    }
  });

  it('clicking the drop you are already on does not restart the held-steady timer', () => {
    const lvl = start(1, 3);
    setVolts(Math.round(hoverVoltage(lvl.drops[0]) * 100) / 100);
    advance(0.6);
    selectDrop(1); // already the current drop: must be ignored
    advance(0.5);
    expect(($('[aria-label="Record this drop"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('every control sits in one grid, and the Record button has its own row, not shared with other controls', () => {
    start(2, 4);
    const grid = $('.lab-controls')!;
    expect(grid).not.toBeNull();
    expect(grid.children).toHaveLength(6); // total, coarse, fine, nudge, record, drops
    const record = $('[aria-label="Record this drop"]')!;
    expect(record.closest('.record-row')?.parentElement).toBe(grid);
    expect(record.closest('.row')).toBeNull();
    expect([...grid.children].filter((c) => c.contains(record))).toHaveLength(1);
  });

  it('the stylesheet gives that grid real gaps (the rows used to touch with zero space between them)', () => {
    const css = fs.readFileSync('src/styles.css', 'utf8');
    const rule = /\.lab-controls\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(rule).toMatch(/display:\s*grid/);
    expect(Number(/gap:\s*(\d+)px/.exec(rule)?.[1])).toBeGreaterThanOrEqual(10);
    expect(css).not.toMatch(/\.record-row[^}]*margin:\s*0\b/);
  });
});

describe('after winning', () => {
  it('the controls lock so a second win cannot be recorded', () => {
    const lvl = start(1, 3);
    for (const d of lvl.drops) measure(lvl, d.id);
    for (const d of lvl.drops) {
      (($(`input[aria-label="Electrons on drop ${d.id}"]`)) as HTMLInputElement).value = String(d.multiple);
      clickLabel(`Check electrons on drop ${d.id}`);
    }
    expect(($('[aria-label="Record this drop"]') as HTMLButtonElement).disabled).toBe(true);
    expect(wins).toHaveLength(1);
  });
});
