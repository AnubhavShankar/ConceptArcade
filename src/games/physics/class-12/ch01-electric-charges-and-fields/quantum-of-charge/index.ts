// The Quark Hunt. Inspirations (code comment only): Lunar Lander (hold a hover by balancing two forces), a guitar tuner (level 2: tune the rung spacing until every
// string rings true) and Papers, Please (level 3: inspect the readings and reject the ones that cannot be real).
// Levels 1 and 3 are tap boards on createArcade (level 1: add or remove single electrons; level 3: tap the drops that are dust); level 2 is a mountDialLevel level.
// Never leak the answer: the gauge, the full ladder and the e-ladder strip are the only helpers (live in round 1, for 1.5 s after a check in round 2, never in
// round 3); every miss animation takes a fixed speed or a fixed stamp, and `hit` is a fixed point. The art is in art.ts, the rules in logic.ts.
import { PAL, createArcade } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { helperOn, paidFlash } from '@core/aidflash';
import { text } from '@core/neon';
import { pointerToLocal } from '@core/sim';
import type { GameContext } from '@core/types';
import {
  DROPS, DROP_X, DROP_Y, HIT, LADDER, MARK_X, STRIP, calm, chamber, clamp01, desk, ease, eli, envelope, goalLine, grip, lab, ladderY, lcd, marker, oilDrop, panel, pico, rung, stamp, stencil,
  strip, stripX, tag, untouched, view, viewDrop, zap, type EliMood, type PicoOpts,
} from './art';
import {
  ARIA, LCD_OFF, LETTERS, N_DIAL, U_DIAL, buildRounds, calFault, checkText, faultOf, goalText, hintLine, lcdText, missText, offBy, reading, two, winText,
  type Fault, type Round,
} from './logic';

type G = CanvasRenderingContext2D;
const ROLE = 'a particle physicist on the night shift, hunting for free quarks with charged oil drops';
const HEROES = [
  {
    story: 'A free quark would carry a third of an electron’s charge, so Eli’s lab weighs charge itself. An oil drop sits between two plates 5 mm apart; the top plate is positive, so every extra electron on the drop adds an upward push e V/d. The drop hovers when n e V / d = m g. Charge only comes in whole electrons: an X-ray zap adds one, a UV flash knocks one off.',
    objective: 'Give the drop exactly the number of electrons that makes it hover, in three runs.',
  },
  {
    story: 'The lab’s new charge detector reads in its own units, du, and nobody knows how many du one electron gives. Every drop carries a whole number of electrons, so every reading is a whole number of the same step. The step is the largest one that fits every reading, and the smallest reading need not be a single electron.',
    objective: 'Set the detector’s rung spacing so every reading lands on a rung, in three runs.',
  },
  {
    story: 'Tonight’s run measured five drops. Every real free charge is a whole number of e = 1.6 × 10⁻¹⁹ C. A reading of a third or two thirds of e more would be a free quark, but every such reading so far has been dust on the lens or a misread drop.',
    objective: 'Flag every drop that is not a whole number of e, then publish the run, in three nights.',
  },
];
const hero = (n: 1 | 2 | 3) => ({ name: 'Eli', role: ROLE, ...HEROES[n - 1] });

/** One-shot effects (floaters) during an attempt: runs `fn` once per attempt and key. */
function onceFor() {
  let cur: unknown = null;
  const done = new Set<string>();
  return (shot: unknown, key: string, fn: () => void) => {
    if (cur !== shot) {
      cur = shot;
      done.clear();
    }
    if (shot && !done.has(key)) {
      done.add(key);
      fn();
    }
  };
}

function eliMood(shot: boolean, ok: boolean, rt: number, verdict: number, fault: Fault | null): EliMood {
  if (!shot) return 'happy';
  if (rt < verdict) return 'squint';
  if (ok) return 'cheer';
  return fault === 'kept' ? 'facepalm' : 'worried';
}
function picoOpts(shot: boolean, ok: boolean, rt: number, verdict: number): PicoOpts {
  const after = shot && rt >= verdict;
  return { lit: shot, droop: after && !ok, mark: after ? (ok ? 'ok' : 'bad') : null, flash: after && ok && rt - verdict < 0.12 ? 0.3 : 0 };
}
/** The gauge text for a frame and its colour. */
function gauge(r: Round, helper: boolean, s: { n: number; u: number }): [string, string] {
  return helper ? [lcdText(r, s), r.assist === 0 ? PAL.green : PAL.yellow] : [LCD_OFF, PAL.dim];
}

// ---- levels 1 and 3: tap boards on createArcade ----
function boardLevel(ctx: GameContext, n: 1 | 3): () => void {
  const rounds = buildRounds(n, ctx.random);
  let count = 0;
  let flags = [false, false, false, false, false];
  let fired: { ok: boolean; count: number; flags: boolean[]; fault: Fault | null } | null = null;
  let tapped = false;
  let flagged = false;
  let jabAt = -10;
  const zaps: { kind: 'x' | 'uv'; at: number }[] = [];
  const pf = paidFlash();
  const once = onceFor();
  const A = createArcade(ctx, hero(n), {
    W: 640,
    H: 340,
    aria: ARIA,
    rounds: 3,
    charges: [1, 1, 0],
    onRound: (k) => {
      count = 0;
      flags = [false, false, false, false, false];
      fired = null;
      tapped = false;
      flagged = false;
      zaps.length = 0;
      A.feedback.hidden = true;
      A.hint.textContent = hintLine(rounds[k]);
      slider?.set(0);
      refreshFlags();
    },
  });
  const cur = () => rounds[Math.min(A.round, 2)];
  let slider: ReturnType<typeof A.slider> | null = null;
  const flagBtns: HTMLButtonElement[] = [];

  function setCount(v: number) {
    const nv = Math.max(N_DIAL.min, Math.min(N_DIAL.max, v));
    if (nv === count) return;
    const up = nv > count;
    slider?.set(nv);
    A.sound('blip');
    zaps.push({ kind: up ? 'x' : 'uv', at: A.clock });
    jabAt = A.clock;
    tapped = true;
    A.float(up ? '⚡' : '☀', up ? 270 : 420, 140, up ? PAL.yellow : '#c9a0ff');
  }
  function toggle(i: number) {
    if (A.phase !== 'play') return;
    flags[i] = !flags[i];
    flagged = true;
    jabAt = A.clock;
    A.sound('blip');
    refreshFlags();
  }
  function refreshFlags() {
    flagBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(flags[i])));
  }
  function fire() {
    const r = cur();
    const f = faultOf(r, { n: count, u: 6, flags });
    fired = { ok: f === null, count, flags: [...flags], fault: f };
    A.resolve(f === null, f === null ? winText(r) : missText(r, f, { n: count, u: 6 }), { x: HIT[0], y: HIT[1] }, n === 1 ? 1.2 : 1.4);
  }
  const check = A.button(n === 1 ? '🔎 Force check' : '🔎 Ladder check', n === 1 ? 'Force check: compare the push with the weight' : 'Ladder check: see the whole numbers of e for a moment', () => {
    if (!A.spend()) return;
    pf.paid();
    A.say(checkText(cur(), { n: count, u: 6 }), true);
  }, 'secondary');

  if (n === 1) {
    slider = A.slider({ aria: 'Electrons on the drop', label: 'Electrons', min: N_DIAL.min, max: N_DIAL.max, step: 1, value: 0, unit: '', onInput: (v) => (count = v) });
    A.controls.append(
      A.button('☀ −1 electron', 'UV flash: knock one electron off the drop', () => setCount(count - 1), 'secondary'),
      A.button('⚡ +1 electron', 'X-ray zap: add one electron to the drop', () => setCount(count + 1), 'secondary'),
      slider.row,
      check,
      A.button('🔌 Switch on the plates', 'Switch on the plates and release the drop', fire),
    );
  } else {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:4px 0';
    for (let i = 0; i < 5; i++) {
      const b = A.button(`Drop ${LETTERS[i]}`, `Flag drop ${LETTERS[i]}`, () => toggle(i), 'small');
      b.setAttribute('aria-pressed', 'false');
      flagBtns.push(b);
      row.append(b);
    }
    A.controls.append(row, check, A.button('📰 Publish the run', 'Publish the run', fire));
    A.canvas.addEventListener('pointerdown', (e) => {
      if (A.phase !== 'play') return;
      const p = pointerToLocal(e, A.canvas, 640, 340);
      const i = DROPS.findIndex((d) => Math.hypot(p.x - d.x, p.y - d.y) <= 22);
      if (i >= 0) toggle(i);
    });
  }

  A.scene((g, t) => {
    if (A.phase === 'between') return;
    if (A.phase === 'play') fired = null;
    const k = Math.min(A.round, 2);
    const r = cur();
    const shot = A.phase === 'resolve' ? fired : null;
    const rt = shot ? A.rt : 0;
    const since = pf.since(t, k);
    const helper = helperOn(r.assist, false, since);
    A.canvas.dataset.live = helper ? '1' : '0';
    lab(g, t, k);
    stencil(g, k);
    if (r.kind === 'hold') drawHold(g, A, r, k, t, rt, shot, count, helper, once);
    else if (r.kind === 'dust') drawDust(g, A, r, k, t, rt, shot, flags, helper, once);
    if (!shot) goalLineFor(g, A, r);
  });

  function goalLineFor(g: G, a: typeof A, r: Round) {
    goalLine(g, goalText(r), a.t, false);
  }

  // Level 1: the chamber.
  function drawHold(g: G, a: typeof A, r: Extract<Round, { kind: 'hold' }>, k: number, t: number, rt: number, shot: typeof fired, live: number, helper: boolean, one: ReturnType<typeof onceFor>) {
    const c = shot ? shot.count : live;
    const ok = shot?.ok ?? false;
    const [lt, lc] = gauge(r, helper, { n: c, u: 6 });
    lcd(g, lt, lc);
    a.canvas.dataset.lcd = helper ? '1' : '0';
    const verdict = 1.2;
    const lever = shot ? -25 + 50 * ease(rt / 0.15) : -25;
    const press = (kind: 'x' | 'uv') => (zaps.some((z) => z.kind === kind && t - z.at < 0.12) ? 1 : 0);
    desk(g, t, { lever, xray: press('x'), uv: press('uv'), knob: 0, plates: !!shot });
    chamber(g, t, { glow: !!shot, V: r.V, m: r.m, pulse: k === 0 && !tapped && !shot, tapCue: k === 0 && !tapped && !shot });
    text(g, `${c} electron${c === 1 ? '' : 's'}`, DROP_X, 214, PAL.yellow, 15);
    // the drop: a hover with a jiggle, or a fixed 110 px/s fall or rise to a plate
    let y = DROP_Y;
    let squash = false;
    const fall = 86;
    if (shot && rt > 0.1) {
      if (ok) y = DROP_Y + (calm() ? 0 : Math.sin(t * 20));
      else if (shot.fault === 'low') {
        y = DROP_Y + Math.min(fall, 110 * (rt - 0.1));
        squash = y >= DROP_Y + fall;
        if (squash) y = 262;
      } else y = DROP_Y - Math.min(fall, 110 * (rt - 0.1));
    }
    a.canvas.dataset.dropy = y.toFixed(2);
    if (!shot) for (const z of zaps) if (t - z.at < 0.15) zap(g, z.kind, (t - z.at) / 0.15, DROP_Y);
    oilDrop(g, DROP_X, y, t, c, { squash, glint: ok && rt >= verdict, wobble: shot ? 0 : 0.35 });
    const stuck = !ok && shot?.fault === 'high' && rt > 0.1 + fall / 110;
    one(shot, 'clack', () => a.float('CLACK', 150, 262, PAL.white));
    if (shot && rt >= 0.1 + fall / 110 && !ok) one(shot, 'land', () => a.float(stuck ? 'tik' : 'plip', DROP_X, stuck ? 100 : 250, PAL.white));
    if (shot && rt >= verdict) one(shot, 'verdict', () => (ok ? a.float('CLICK', 400, 64, PAL.white) : a.float('hmm', 400, 64, PAL.dim)));
    pico(g, t, picoOpts(!!shot, ok, rt, verdict));
    eli(g, t, { mood: eliMood(!!shot, ok, rt, verdict, shot?.fault ?? null), reach: shot && rt < 0.35 ? 'lever' : 'box', jab: clamp01(1 - (t - jabAt) / 0.12), lever, cheerT: rt - verdict });
  }

  // Level 3: the five drops.
  function drawDust(g: G, a: typeof A, r: Extract<Round, { kind: 'dust' }>, k: number, t: number, rt: number, shot: typeof fired, live: boolean[], helper: boolean, one: ReturnType<typeof onceFor>) {
    const fl = shot ? shot.flags : live;
    const ok = shot?.ok ?? false;
    const verdict = 1.4;
    view(g);
    desk(g, t, { lever: -25, xray: 0, uv: 0, knob: 0, plates: false });
    const keptKs = r.ks.filter((_, i) => !fl[i]);
    r.ks.forEach((kk, i) => {
      const label = two(reading(kk));
      if (!shot) return viewDrop(g, i, label, t, { flagged: fl[i] });
      if (fl[i]) {
        const u0 = clamp01(rt / 0.4);
        if (rt < 0.4) viewDrop(g, i, label, t, { flagged: true, dy: -50 * ease(u0), alpha: 1 - u0, showText: false });
        one(shot, `pfft${i}`, () => a.float('PFFT', DROPS[i].x, 130, PAL.white));
      } else if (rt < 0.4) viewDrop(g, i, label, t, { flagged: false });
      else if (rt < 0.7) {
        const u1 = ease((rt - 0.4) / 0.3);
        viewDrop(g, i, label, t, { flagged: false, dx: (DROP_X - DROPS[i].x) * u1, r: 12 * (1 - 0.6 * u1), showText: false });
      }
    });
    // the kept drops go into an envelope that slides to Pico; Pico reads it; the stamp slams on at 1.4 s
    if (shot && rt >= 0.55 && rt < verdict) {
      const slide = calm() ? (rt >= 0.9 ? 1 : 0) : ease((rt - 0.6) / 0.3);
      envelope(g, DROP_X, 150 + (62 - 150) * slide, 1.2);
    }
    const showStrip = shot ? ok && rt >= verdict + 0.1 : helper;
    a.canvas.dataset.strip = showStrip ? '1' : '0';
    if (showStrip) strip(g, shot ? keptKs : r.ks);
    if (shot && ok && rt >= verdict + 0.1) {
      const u2 = ease((rt - verdict - 0.1) / 0.5);
      keptKs.forEach((kk) => {
        const x = stripX(kk / 3);
        g.fillStyle = '#e8c15a';
        g.beginPath();
        g.arc(DROP_X + (x - DROP_X) * u2, 150 + (STRIP.y - 30 - 150) * u2, 6, 0, Math.PI * 2);
        g.fill();
      });
    }
    if (shot && rt >= verdict) {
      stamp(g, ok ? 'PUBLISHED: NO FREE QUARKS' : shot.fault === 'kept' ? 'RETRACTED' : 'TOO FEW DROPS', ok ? PAL.green : shot.fault === 'kept' ? PAL.red : PAL.orange, rt - verdict);
      one(shot, 'verdict', () => (ok ? a.float('CLICK', 400, 64, PAL.white) : a.float('hmm', 400, 64, PAL.dim)));
    }
    if (k === 0 && !flagged && !shot) {
      g.globalAlpha = 0.5 + 0.5 * Math.sin(5 * t);
      tag(g, 'tap a drop', DROPS[0].x, 100, 'center', PAL.yellow, 11);
      g.globalAlpha = 1;
    }
    void r;
    pico(g, t, picoOpts(!!shot, ok, rt, verdict));
    eli(g, t, { mood: eliMood(!!shot, ok, rt, verdict, shot?.fault ?? null), reach: shot ? 'point' : 'box', jab: clamp01(1 - (t - jabAt) / 0.12), lever: -25, cheerT: rt - verdict });
  }

  A.mountAll();
  return A.run();
}

// ---- level 2: calibrate the detector (a dial level) ----
function calLevel(random: () => number): DialLevel<Round> {
  const rounds = buildRounds(2, random);
  const pf = paidFlash();
  const once = onceFor();
  return {
    hero: hero(2),
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'u', aria: 'Detector units per electron: the spacing of the rungs', label: 'Rung spacing', unit: 'du', step: U_DIAL.step, min: U_DIAL.min, max: U_DIAL.max, start: U_DIAL.start, text: (x) => x.toFixed(1) }],
    handles: [{ dial: 'u', at: (_r, v) => [LADDER.x, ladderY(v.u)], drag: (_r, _px, py) => (LADDER.y0 - py) / LADDER.px, radius: 20 }],
    test: {
      button: '🔎 Fit check',
      aria: 'Fit check: see the counts at this spacing',
      read: (r, v) => {
        pf.paid();
        return checkText(r, { n: 0, u: v.u });
      },
    },
    fire: { button: '📏 Fit the ladder', aria: 'Fit the ladder to the readings' },
    judge: (r, v) => r.kind === 'cal' && calFault(r, v.u) === null,
    miss: (r, v) => missText(r, 'offrung', { n: 0, u: v.u }),
    win: (r) => winText(r),
    hint: (r) => hintLine(r),
    hit: () => HIT,
    delay: 1.1,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      if (r.kind !== 'cal') return;
      const u = v.u;
      const verdict = 1.1;
      const ok = shot?.ok ?? false;
      const since = pf.since(t, k);
      const helper = helperOn(r.assist, false, since);
      A.canvas.dataset.live = helper ? '1' : '0';
      A.canvas.dataset.lcd = helper ? '1' : '0';
      lab(g, t, k);
      stencil(g, k);
      const [lt, lc] = gauge(r, helper, { n: 0, u });
      lcd(g, lt, lc);
      desk(g, t, { lever: -25, xray: 0, uv: 0, knob: shot ? rt * 9 : 0, plates: false });
      panel(g);
      const N = Math.floor(36 / u + 1e-9);
      // the rungs: only the first before the attempt, unless the helper is on; the whole ladder draws upward during the attempt
      let shown = helper ? N : 1;
      if (shot) shown = 1 + Math.floor(clamp01((rt - 0.1) / 0.5) * (N - 1));
      for (let j = Math.min(N, shown); j >= 2; j--) rung(g, u * j, false);
      rung(g, u, true);
      once(shot, 'fit', () => A.float('FIT', 380, 70, PAL.cyan));
      // the three drop markers, labelled with their readings; they slide onto the ladder from 0.6 to 1.0 s
      const slide = shot ? (calm() ? (rt >= 1 ? 1 : 0) : ease((rt - 0.6) / 0.4)) : 0;
      r.reads.forEach((q, i) => {
        const y = ladderY(q);
        const on = offBy(q, u) < 0.02;
        const x = MARK_X + (LADDER.x - MARK_X) * slide;
        const wob = shot && !on && rt >= 1 && !calm() ? Math.sin(t * 20) * 2 : 0;
        marker(g, x, y + wob, `${q} du`);
        if (shot && rt >= 1) {
          if (on) text(g, '✓', 318, y + 4, PAL.green, 13, 'right');
          else text(g, '?', 318, y + 4, PAL.red, 13, 'right');
        }
        if (shot && ok && rt >= verdict) text(g, `${r.ns[i]} e`, 446, y + 4, PAL.green, 12, 'left');
      });
      if (!shot) grip(g, A.canvas, t, { x: LADDER.x, y: ladderY(u), read: `${u.toFixed(1)} du`, cue: k === 0 && untouched(A.canvas) });
      if (shot && rt >= verdict) once(shot, 'verdict2', () => A.float(ok ? 'CLICK' : 'hmm', 400, 64, ok ? PAL.white : PAL.dim));
      pico(g, t, { ...picoOpts(!!shot, ok, rt, verdict), scale: 0.8 });
      eli(g, t, { mood: eliMood(!!shot, ok, rt, verdict, null), reach: shot ? 'knob' : 'box', jab: 0, lever: -25, cheerT: rt - verdict });
      if (!shot) goalLine(g, goalText(r), A.t, false);
    },
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(3, ctx.level)) as 1 | 2 | 3;
    if (n === 2) return mountDialLevel(ctx as never, calLevel(ctx.random) as never, ARIA);
    return boardLevel(ctx, n);
  },
});
