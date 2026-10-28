// Shared scaffolding for hero-and-objective games (chapters 9 to 14): hero banner, controls, free vs costly
// tests, the verdict flash, the "why it works" panel and the delayed win. Games keep their own rules in logic.ts
// and their own drawing; this only removes the repeated DOM and timing code.
import type { GameContext } from './types';
import { themeColors } from './draw';
import { h } from './dom';
import { parseNumber } from './quiz';
import { starsFor } from './judge';
import { fitCanvas } from './sim';
export { starsFor, within } from './judge';

/** The hero can be a person or any thing with a goal: a light ray, a car, a rolling ball, a charge. */
export interface Hero {
  name: string;
  /** What the hero is or does, e.g. "a pulse of light in a fibre". */
  role: string;
  /** The situation, two or three sentences. */
  story: string;
  /** What success looks like in the scene, one sentence. */
  objective: string;
}

/** Seconds the apparatus runs after "go" before the verdict is final. */
export const RUN = 3;
const REVEAL = 0.9;

export interface LabOptions {
  W: number;
  H: number;
  aria: string;
  /** Costly misses the player may make before stars are lost. */
  free: number;
}

export function createLab(ctx: GameContext, hero: Hero, o: LabOptions) {
  const col = themeColors();
  const canvas = h('canvas', { role: 'img', 'aria-label': o.aria });
  const g = fitCanvas(canvas, o.W, o.H);
  const banner = h('section', { class: 'panel hero' }, h('p', { class: 'hero-name' }, `${hero.name}, ${hero.role}`), h('p', null, hero.story), h('p', { class: 'objective' }, h('strong', null, 'Objective: '), hero.objective));
  const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
  const solution = h('section', { class: 'panel solution', hidden: true });
  const hint = h('p', { class: 'muted note' });
  const controls = h('div', { class: 'lab-controls' });

  let misses = 0;
  let finished = false;
  let pendingWin: 1 | 2 | 3 | null = null;
  let wonAt: number | null = null;
  let clock = 0;
  let verdictAt: number | null = null;
  let verdictOk = false;
  let runT: number | null = null;

  const say = (text: string, good = false) => {
    feedback.hidden = false;
    feedback.className = `feedback ${good ? 'good' : 'bad'}`;
    feedback.textContent = text;
  };
  const costNote = () => (misses > o.free ? ' That cost a star.' : o.free > 0 ? ` ${o.free - misses} free test${o.free - misses === 1 ? '' : 's'} left.` : '');
  const lab = {
    col,
    canvas,
    g,
    W: o.W,
    H: o.H,
    controls,
    hint,
    feedback,
    solution,
    say,
    /** Invalid input: tell the player, charge nothing. */
    freeNote: (m: string) => say(`${m} That does not cost you anything.`),
    /** A wrong design: charge a star (after the free tests) and say what went wrong, never what is right. */
    miss: (text: string) => {
      misses++;
      say(text + costNote());
    },
    succeed: (text: string, explain: string[]) => {
      finished = true;
      say(text, true);
      solution.replaceChildren(h('h3', null, 'Why that works'), ...explain.map((t) => h('p', null, t)));
      solution.hidden = false;
      controls.querySelectorAll('button, input').forEach((b) => b.setAttribute('disabled', ''));
      pendingWin = starsFor(misses, o.free);
    },
    /** Start the apparatus; the consequence plays for RUN seconds. */
    verdict: (ok: boolean) => {
      verdictAt = clock;
      verdictOk = ok;
      runT = 0;
    },
    get finished() {
      return finished;
    },
    get misses() {
      return misses;
    },
    get clock() {
      return clock;
    },
    /** True while the consequence is still playing. */
    busy: () => runT !== null && runT < RUN,
    /** 0 before a run, rising to 1 as the consequence plays. */
    get progress() {
      return runT === null ? 0 : Math.min(1, runT / RUN);
    },
    get ok() {
      return verdictOk;
    },
    field(aria: string, placeholder: string) {
      return h('input', { class: 'field', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': aria, placeholder }) as HTMLInputElement;
    },
    num: (el: HTMLInputElement) => parseNumber(el.value),
    button: (text: string, aria: string, fn: () => void) => h('button', { class: 'btn', type: 'button', 'aria-label': aria, onclick: fn }, text),
    row: (name: string, input: HTMLElement, unit: string) => h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), input, h('span', { class: 'unit' }, unit)),
    choice<T extends string>(name: string, opts: [T, string, string][], onPick: (v: T) => void) {
      const btns: HTMLElement[] = opts.map(([v, aria, text]) => {
        const b: HTMLElement = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': aria, 'aria-pressed': 'false', onclick: () => {
          onPick(v);
          btns.forEach((o2) => o2.setAttribute('aria-pressed', String(o2 === b)));
        } }, text);
        return b;
      });
      return h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), ...btns);
    },
    /** Put the page together: hero, picture, hint, controls, feedback, working. */
    mountAll: () => ctx.root.append(banner, canvas, hint, controls, feedback, solution),
    /** Advance the clocks; call first in the frame loop. */
    tick: (dt: number) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
    },
    /** Verdict flash, phase flag for tests and the delayed win; call last in the frame loop, after drawing. */
    endFrame: () => {
      if (verdictAt !== null && clock - verdictAt < REVEAL) {
        g.strokeStyle = verdictOk ? col.good : col.bad;
        g.lineWidth = 6;
        g.globalAlpha = 1 - (clock - verdictAt) / REVEAL;
        g.strokeRect(3, 3, o.W - 6, o.H - 6);
        g.globalAlpha = 1;
      }
      const phase = verdictAt === null ? 'idle' : lab.busy() || clock - verdictAt < REVEAL ? 'testing' : 'done';
      canvas.dataset.phase = phase;
      if (pendingWin !== null && phase !== 'testing') {
        wonAt ??= clock;
        if (clock - wonAt > 0.3) {
          const s = pendingWin;
          pendingWin = null;
          ctx.win({ stars: s });
        }
      }
    },
  };
  return lab;
}
export type Lab = ReturnType<typeof createLab>;
