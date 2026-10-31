// Inspirations: Lemmings (a crowd walks in a line and you place the things that decide who survives) and Portal (a doorway whose far
// side must be exactly right). Pip leads the travellers through the portal f; two travellers on one door means f is not one-one.
import { helperOn, paidFlash } from '@core/aidflash';
import { PAL, type Arcade } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec } from '@core/dialgame';
import { TRACK, backdrop, face, track, trackHandle, verdict } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import type { GameContext } from '@core/types';
import { COUNT, DOMAIN, PQ, RANGE, TRAVELLERS, aidLine, buildRounds, domainFault, explain, imageOf, intel, judge, landing, missText, outcome, rangeFault, spotText, startQ, type Round } from './logic';
import { goalLine, grip, tint } from './ux';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.6;
const Y0 = 232;
/** Radius of every drag handle, in scene pixels (at least 18, about 44 px on a phone). */
export const HANDLE_R = 18;
const dn = (x: number) => (x < 0 ? `−${Math.abs(x)}` : String(x));

const HEROES = [
  { story: 'The portal sends each traveller x to the door f(x). A function is one-one when no two travellers ever share a door. Where f turns (rising, then falling) two different travellers land on the same door, so the fences must stop before the turn. The Mayor wants as many travellers as possible to cross, and Pip must be among them.', objective: 'Place the left and right fences so f is one-one on the fenced stretch and as wide as possible around Pip, in three rounds. The graph shows in round 1; a test walk costs a charge.' },
  { story: 'The doors are the co-domain. A function is onto when every door in the co-domain is used by someone. The return portal can switch on only when no door is left dark and no traveller lands outside the doors. Travellers come from a fixed stretch of the line.', objective: 'Place the two fences of the doors so f is onto, in three rounds. The lit doors show in round 1; a test walk costs a charge.' },
  { story: 'When a finite set of travellers maps into a set of the same size, one-one and onto are the same thing: every door gets exactly one traveller. The Mayor counts the ways the portal can be set up, and the first traveller can choose any of the doors, the next any that remain.', objective: 'Count how many one-one maps there are, in three rounds, with the number of travellers growing.' },
  { story: 'Portal f is a bijection: every door gets exactly one traveller. So it can be undone. The return portal subtracts p and divides by q, and only the right p and q bring everyone home.', objective: 'Build the return portal so all travellers get home, in three rounds.' },
  { story: 'Now the travellers pass two portals, f and then g. To bring them home in one step, the return portal must undo g∘f, the whole trip in that order.', objective: 'Build one return portal for the two-portal trip, in three rounds.' },
];
const FIRE = ['Send the travellers through', 'Send the travellers through', 'Hand the ledger to the Mayor', 'Send the travellers there and back', 'Send the travellers there and back'];
const TEST_TRIP = 'Test walk: send one test traveller';
/** The round's goal, one line at the top of the scene. */
const GOALS = [
  'Goal: fence the widest one-one stretch around Pip',
  'Goal: fence the doors so f is onto',
  'Goal: count the one-one maps onto the doors',
  'Goal: build the return portal that brings everyone home',
  'Goal: one return portal that undoes f, then g',
];
type ArcadeRef = { A: Arcade | null };

/** Pip: a traveller with a cap, a numbered shirt and a backpack. */
function pip(g: G, x: number, y: number, t: number, mood: Mood, walk: number, label: string) {
  const sway = Math.sin(walk * 10) * 3;
  g.fillStyle = '#3b6b4a';
  g.fillRect(x + 8, y - 34, 9, 18);
  g.fillStyle = PAL.orange;
  g.fillRect(x - 10, y - 38, 20, 26);
  line(g, x - 5, y - 12, x - 5 + sway, y, PAL.dim, 4);
  line(g, x + 5, y - 12, x + 5 - sway, y, PAL.dim, 4);
  g.fillStyle = '#f2c9a0';
  g.beginPath();
  g.arc(x, y - 48, 11, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PAL.red;
  g.beginPath();
  g.arc(x, y - 52, 11, Math.PI, 2 * Math.PI);
  g.fill();
  g.fillRect(x - 3, y - 61, 14, 4);
  face(g, x, y - 47, 9, mood, t, '#1b1030');
  text(g, label, x, y - 20, '#1b1030', 11);
}

const NL = (x: number) => 320 + x * 45;
/** A fence: a pole with a flag. Its word stands beside the flag (the left fence to the left, the right fence to the right), clear of the axis numbers. */
const fence = (g: G, x: number, color: string, label: string, side: 'left' | 'right') => {
  glow(g, color, 10, () => line(g, x, Y0 - 56, x, Y0 + 4, color, 4));
  g.fillStyle = color;
  g.fillRect(x - 3, Y0 - 56, 16, 10);
  if (side === 'left') text(g, label, x - 7, Y0 - 47, color, 12, 'right');
  else text(g, label, x + 19, Y0 - 47, color, 12, 'left');
};

function drawDomain(g: G, r: Round, v: Record<string, number>, t: number, rt: number, shot: { ok: boolean; v: Record<string, number> } | null, helper: boolean) {
  const f = (x: number) => r.f(x);
  const ys = Array.from({ length: 101 }, (_, i) => f(-5 + i / 10));
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const Y = (y: number) => 190 - ((y - lo) / (hi - lo || 1)) * 120;
  line(g, NL(DOMAIN.min), Y0, NL(DOMAIN.max), Y0, PAL.dim, 3);
  for (let x = DOMAIN.min; x <= DOMAIN.max; x++) {
    line(g, NL(x), Y0 - 4, NL(x), Y0 + 4, PAL.dim, 1.5);
    text(g, String(x), NL(x), Y0 + 20, PAL.dim, 11);
  }
  // The graph is the helper: live in round 1, on for 1.5 s after a paid test walk in round 2, never in round 3. A miss never adds it (it would show the turning point), a win may.
  if (helper) {
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 100; i++) {
      const x = -5 + i / 10;
      if (i === 0) g.moveTo(NL(x), Y(f(x)));
      else g.lineTo(NL(x), Y(f(x)));
    }
    g.stroke();
  } else text(g, 'graph off', 520, 70, PAL.dim, 12);
  const use = shot ? shot.v : v;
  const L = Math.min(use.lo, use.hi);
  const R = Math.max(use.lo, use.hi);
  fence(g, NL(use.lo), PAL.green, 'left', 'left');
  fence(g, NL(use.hi), PAL.pink, 'right', 'right');
  const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
  pip(g, NL(r.pip), Y0 - 2, t, mood, shot && rt < 1 ? rt : 0, String(r.pip));
  if (shot) {
    const p = Math.min(1, rt / 1.0);
    // A miss draws only what the player's fences did: the crowd rises to one fixed row of doors, and a jam turns the whole crowd red.
    // It never draws the real heights or the colliding pair (they would show the turning point).
    const jam = domainFault(r, shot.v) === 'jam';
    for (let x = Math.ceil(L); x <= R; x++) {
      if (x === r.pip) continue;
      const top = shot.ok ? Y(f(x)) : 120;
      g.fillStyle = jam && rt > 1 ? PAL.red : PAL.yellow;
      g.beginPath();
      g.arc(NL(x), Y0 - 10 - (Y0 - 10 - top) * p, 5, 0, Math.PI * 2);
      g.fill();
    }
    if (jam && rt > 1) text(g, '!', (NL(L) + NL(R)) / 2, 100, PAL.red, 22);
  }
}

function drawRange(g: G, r: Round, v: Record<string, number>, t: number, rt: number, shot: { ok: boolean; v: Record<string, number> } | null, helper: boolean) {
  const X = (y: number) => 320 + (y / 30) * 250;
  line(g, X(RANGE.min), Y0, X(RANGE.max), Y0, PAL.dim, 3);
  for (let y = RANGE.min; y <= RANGE.max; y += 10) {
    line(g, X(y), Y0 - 4, X(y), Y0 + 4, PAL.dim, 1.5);
    text(g, String(y), X(y), Y0 + 20, PAL.dim, 11);
  }
  const [ilo, ihi] = imageOf(r, r.a, r.b);
  // The lit doors are the helper: live in round 1, on for 1.5 s after a paid test walk in round 2, never in round 3 (a win may show them).
  if (helper) {
    g.fillStyle = 'rgba(77,225,255,0.5)';
    g.fillRect(X(ilo), Y0 - 14, X(ihi) - X(ilo), 10);
    text(g, 'doors in use', (X(ilo) + X(ihi)) / 2, Y0 - 22, PAL.cyan, 11);
  } else text(g, 'lit doors off', 520, 70, PAL.dim, 12);
  const use = shot ? shot.v : v;
  fence(g, X(use.lo), PAL.green, 'low', 'left');
  fence(g, X(use.hi), PAL.pink, 'high', 'right');
  text(g, `travellers from ${r.a} to ${r.b}`, 150, 60, PAL.white, 12);
  const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
  pip(g, 80, 150, t, mood, shot && rt < 1 ? rt : 0, String(r.a));
  if (shot) {
    const p = Math.min(1, rt / 1.0);
    const l = Math.min(use.lo, use.hi);
    const h = Math.max(use.lo, use.hi);
    const count = r.b - r.a + 1;
    const [lowF, highF] = rangeFault(r, use);
    // A miss draws only what the player's fences did: the crowd lands spread evenly across the fenced doors, a traveller too far for a narrow
    // end lands a fixed 24 px outside that fence, and a wide end shows a dark door. Never the real landing places (they would show the range).
    for (let x = r.a; x <= r.b; x++) {
      const y = shot.ok ? r.f(x) : l + ((h - l) * (x - r.a + 0.5)) / count;
      g.fillStyle = PAL.yellow;
      g.beginPath();
      g.arc(120 + ((X(y) - 120) * p), 90 + (Y0 - 14 - 90) * p + x * 3, 5, 0, Math.PI * 2);
      g.fill();
    }
    if (!shot.ok) {
      g.fillStyle = PAL.red;
      const lost = [lowF === 'narrow' ? X(l) - 24 : null, highF === 'narrow' ? X(h) + 24 : null];
      for (const px of lost) {
        if (px === null) continue;
        g.beginPath();
        g.arc(120 + (px - 120) * p, 90 + (Y0 - 14 - 90) * p, 5, 0, Math.PI * 2);
        g.fill();
      }
      if (rt > 1) for (const door of [lowF === 'wide' ? l : null, highF === 'wide' ? h : null]) if (door !== null) g.fillRect(X(door) - 5, Y0 - 14, 10, 10);
    }
  }
}

function drawCount(g: G, r: Round, t: number, rt: number, shot: { ok: boolean } | null) {
  const n = r.n;
  const gap = 360 / n;
  for (let i = 0; i < n; i++) {
    const x = 100 + i * gap;
    pip(g, x, 130, t + i, 'happy', 0, String(i + 1));
    g.fillStyle = '#26305f';
    g.fillRect(x - 16 + 180, 150, 32, 44);
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 2;
    g.strokeRect(x - 16 + 180, 150, 32, 44);
    text(g, `door ${i + 1}`, x + 180, 214, PAL.dim, 11);
  }
  if (shot) {
    const p = Math.min(1, rt / 1.0);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      line(g, 100 + i * gap, 134, 100 + i * gap + (j * gap + 180 - i * gap) * p, 134 + 40 * p, shot.ok ? PAL.green : PAL.yellow, 1.5);
    }
  }
  text(g, `${n} travellers, ${n} doors, one traveller on each door`, 320, 270, PAL.dim, 12);
}

// Levels 4 and 5: the trip there and back. Not to scale: the doors carry no numbers and the gates are only gates. Home markers 0 to 4 stand on the
// bottom line; the crowd hops up to the door lane, walks through gate f (and g), drops through the pink return portal and walks home along the line.
// A miss shows only the side: the whole crowd stops a fixed STEP to the left or right of home, never the real landing places.
const HX = (i: number) => 90 + 55 * i;
const HOME_Y = 226;
const LANE_Y = 118;
const RET_X = 566;
const STEP = 27;
/** The two tracks of levels 4 and 5 sit side by side on one row, so each handle can be 18 px or more in radius without touching the other or the ghosts above. */
const TR = { y: 308, q: { x0: 84, x1: 290 }, p: { x0: 368, x1: 574 } } as const;
const trackX = (key: 'p' | 'q', v: number) => TR[key].x0 + ((v - PQ[key].min) / (PQ[key].max - PQ[key].min)) * (TR[key].x1 - TR[key].x0);
const trackDrag = (key: 'p' | 'q', px: number) => PQ[key].min + ((px - TR[key].x0) / (TR[key].x1 - TR[key].x0)) * (PQ[key].max - PQ[key].min);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const ease = (u: number) => u * u * (3 - 2 * u);

const portal = (g: G, x: number, y: number, color: string, label: string) => {
  glow(g, color, 12, () => {
    g.strokeStyle = color;
    g.lineWidth = 4;
    g.beginPath();
    g.ellipse(x, y, 11, 30, 0, 0, Math.PI * 2);
    g.stroke();
  });
  text(g, label, x, y - 40, color, 13);
};
/** Pip drawn at scale s with his feet at (x, y). */
function mini(g: G, x: number, y: number, s: number, alpha: number, t: number, mood: Mood, walk: number, label: string) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y);
  g.scale(s, s);
  pip(g, 0, 0, t, mood, walk, label);
  g.restore();
}
/** Where traveller i is u seconds into his trip (staggered), ending at end on the home line. */
function tripPos(i: number, u: number, end: number, gates: number[]): { x: number; y: number; s: number; a: number; walking: number } {
  const home = HOME_Y - 2;
  const lane = LANE_Y;
  if (u <= 0) return { x: HX(i), y: home, s: 1, a: 1, walking: 0 };
  if (u < 0.3) {
    const w = u / 0.3;
    return { x: HX(i), y: lerp(home, lane, ease(w)) - 24 * Math.sin(Math.PI * w), s: lerp(1, 0.5, w), a: 1, walking: 0 };
  }
  if (u < 0.75) {
    const x = lerp(HX(i), 548, (u - 0.3) / 0.45);
    return { x, y: lane, s: 0.5, a: gates.some((gx) => Math.abs(x - gx) < 12) ? 0.35 : 1, walking: u };
  }
  if (u < 0.9) {
    const w = (u - 0.75) / 0.15;
    return { x: lerp(548, RET_X, w), y: lerp(lane, home, w), s: lerp(0.5, 1, w), a: 1, walking: 0 };
  }
  if (u < 1.3) return { x: lerp(RET_X, end, (u - 0.9) / 0.4), y: home, s: 1, a: 1, walking: u };
  return { x: end, y: home, s: 1, a: 1, walking: 0 };
}

function drawTrip(g: G, r: Round, v: Record<string, number>, t: number, rt: number, shot: { ok: boolean; v: Record<string, number> } | null, helper: boolean, A: Arcade) {
  const gates = r.kind === 'inverse' ? [410] : [370, 450];
  line(g, 50, HOME_Y, 600, HOME_Y, PAL.dim, 3);
  text(g, 'home', 36, HOME_Y + 18, PAL.dim, 11, 'left');
  for (const i of TRAVELLERS) {
    line(g, HX(i), HOME_Y - 4, HX(i), HOME_Y + 4, PAL.dim, 1.5);
    text(g, String(i), HX(i), HOME_Y + 18, PAL.dim, 11);
  }
  line(g, 60, LANE_Y, 600, LANE_Y, PAL.dim, 2, [6, 6]);
  text(g, 'the doors', 60, LANE_Y + 16, PAL.dim, 11, 'left');
  gates.forEach((gx, i) => portal(g, gx, LANE_Y - 16, PAL.cyan, i === 0 ? 'f' : 'g'));
  portal(g, RET_X, HOME_Y - 24, PAL.pink, 'return');
  for (const key of ['q', 'p'] as const) {
    line(g, TR[key].x0, TR.y, TR[key].x1, TR.y, PAL.dim, 3);
    text(g, key, TR[key].x0 - 30, TR.y + 5, PAL.yellow, 14);
    text(g, String(PQ[key].min), TR[key].x0, TR.y + 31, PAL.dim, 11);
    text(g, String(PQ[key].max), TR[key].x1, TR.y + 31, PAL.dim, 11);
  }
  if (!shot) {
    for (const i of TRAVELLERS) mini(g, HX(i), HOME_Y - 2, 1, 1, t + i, 'happy', 0, String(i));
    if (helper) {
      g.globalAlpha = 0.9;
      for (const i of TRAVELLERS) {
        const L = landing(r, v, i);
        if (!L) continue;
        const gx = Math.max(40, Math.min(600, HX(0) + 55 * (L.num / L.den)));
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(gx, HOME_Y + 36, 8, 0, Math.PI * 2);
        g.stroke();
        text(g, String(i), gx, HOME_Y + 41, PAL.cyan, 11);
      }
      g.globalAlpha = 1;
      text(g, 'ghosts: where each traveller would land', 440, 46, PAL.cyan, 11);
    } else text(g, 'ghosts off', 560, 46, PAL.dim, 12);
    // the two handles, each with the player's own setting beside it
    for (const key of ['q', 'p'] as const) {
      grip(g, A.canvas, t, { x: trackX(key, v[key]), y: TR.y, r: HANDLE_R, dir: 'h', read: `${key} = ${dn(v[key])}`, side: 'above', cue: false });
    }
    return;
  }
  const side = shot.ok ? 0 : outcome(r, shot.v) || 1;
  for (const i of TRAVELLERS) {
    const p = tripPos(i, rt - 0.04 * i, HX(i) + side * STEP, gates);
    const mood: Mood = rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy';
    mini(g, p.x, p.y, p.s, p.a, t, mood, p.walking, String(i));
    if (!shot.ok && rt > 1.5) text(g, '?', p.x, p.y - 72, PAL.yellow, 14);
  }
}

/** Levels 4 and 5: q = 0 is not a portal. Catch the Send and Test walk buttons before they act: the note is free, nothing is fired and no charge is spent. */
function guardZero(ctx: GameContext, ref: ArcadeRef, n: number): () => void {
  const onClick = (e: Event) => {
    const label = (e.target as HTMLElement | null)?.closest?.('button')?.getAttribute('aria-label') ?? '';
    if (label !== FIRE[n - 1] && label !== TEST_TRIP) return;
    const A = ref.A;
    if (!A || A.phase !== 'play') return;
    const q = Number((ctx.root.querySelectorAll('input[type="range"]')[1] as HTMLInputElement | undefined)?.value);
    if (q !== 0) return;
    e.stopImmediatePropagation();
    A.freeNote('A portal cannot divide by zero.');
  };
  ctx.root.addEventListener('click', onClick, true);
  return () => ctx.root.removeEventListener('click', onClick, true);
}

function level(n: number, random: () => number, ref: ArcadeRef): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  const trip = n >= 4;
  const tripDials: DialSpec<Round>[] = [
    { key: 'p', aria: 'Return portal shift p', label: 'Shift p (subtract)', unit: '', step: 1, min: PQ.p.min, max: PQ.p.max, start: PQ.p.start, text: (v: number) => `${v}` },
    { key: 'q', aria: 'Return portal divisor q', label: 'Divisor q (divide by)', unit: '', step: 1, min: PQ.q.min, max: PQ.q.max, start: startQ, text: (v: number) => `${v}` },
  ];
  const flash = paidFlash();
  const tripHandles: HandleSpec<Round>[] = (['q', 'p'] as const).map((key) => ({
    dial: key,
    at: (_r: Round, v: Record<string, number>): [number, number] => [trackX(key, v[key]), TR.y],
    drag: (_r: Round, px: number) => trackDrag(key, px),
    radius: HANDLE_R,
  }));
  const dials = trip ? tripDials : n === 3
    ? [{ key: 'c', aria: 'Number of one-one maps', label: 'Number of ways', unit: '', step: 1, min: COUNT.min, max: COUNT.max, start: 1, text: (v: number) => `${v}` }]
    : (() => {
        const span = n === 1 ? DOMAIN : RANGE;
        return [
          { key: 'lo', aria: n === 1 ? 'Left fence' : 'Lowest door of the co-domain', label: n === 1 ? 'Left fence' : 'Lowest door', unit: '', step: 1, min: span.min, max: span.max, start: 0, text: (v: number) => `${v}` },
          { key: 'hi', aria: n === 1 ? 'Right fence' : 'Highest door of the co-domain', label: n === 1 ? 'Right fence' : 'Highest door', unit: '', step: 1, min: span.min, max: span.max, start: 0, text: (v: number) => `${v}` },
        ];
      })();
  const handles: HandleSpec<Round>[] = trip ? tripHandles : n === 3
    ? [trackHandle<Round>('c', () => COUNT.min, () => COUNT.max)]
    : (['lo', 'hi'] as const).map((key) => ({
        dial: key,
        at: (_r: Round, v: Record<string, number>): [number, number] => [n === 1 ? NL(v[key]) : 320 + (v[key] / 30) * 250, Y0 + 40],
        drag: (_r: Round, px: number) => (n === 1 ? (px - 320) / 45 : ((px - 320) / 250) * 30),
        radius: 18,
      }));
  return {
    hero: { name: 'Pip', role: 'a traveller who leads a crowd through a portal that sends each person x to the door f(x)', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: trip
      ? { button: '🚶 Test walk', aria: TEST_TRIP, read: (r, v) => (flash.paid(), spotText(r, v)) }
      : { button: '🚶 Test walk', aria: 'Test walk: send two test travellers', read: (r, v) => (flash.paid(), spotText(r, v)) },
    fire: { button: n === 3 ? '📒 Give the ledger' : trip ? '🚪 Send them there and back' : '🚪 Send them through', aria: FIRE[n - 1] },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `${trip ? 'Everyone home!' : 'Everyone through!'} ${explain(r)}`,
    hint: (r) => (trip ? `${intel(r)} ${aidLine(r)}` : n === 3 ? `${intel(r)} ${r.assist < 2 ? 'A test walk costs a charge.' : 'Boss round: no test walk.'}` : `${intel(r)} ${r.assist === 0 ? 'The live picture is on.' : r.assist === 1 ? 'The picture shows for a moment after a test walk, which costs a charge.' : 'Boss round: no picture, no test walk.'}`),
    hit: () => [320, 150],
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot, k, A }) => {
      ref.A = A;
      backdrop(g);
      tint(g, k, t);
      // The helper (graph, lit doors, ghosts): live in round 1, 1.5 s after a paid test walk in round 2, never in round 3; a win may show the graph or the doors.
      const helper = helperOn(r.assist, !!shot && shot.ok && n <= 2, shot ? Infinity : flash.since(t, k));
      A.canvas.dataset.helper = helper ? '1' : '0';
      if (n === 1) drawDomain(g, r, v, t, rt, shot, helper);
      else if (n === 2) drawRange(g, r, v, t, rt, shot, helper);
      else if (n === 3) drawCount(g, r, t, rt, shot);
      else drawTrip(g, r, v, t, rt, shot, helper, A);
      if (n === 3) track(g, COUNT.min, COUNT.max);
      if (!shot) {
        const own = (key: string) => v[key];
        if (n === 1 || n === 2) {
          const word = n === 1 ? ['left', 'right'] : ['low', 'high'];
          (['lo', 'hi'] as const).forEach((key, i) => {
            const x = n === 1 ? NL(own(key)) : 320 + (own(key) / 30) * 250;
            grip(g, A.canvas, t, { x, y: Y0 + 40, r: HANDLE_R, dir: 'h', read: `${word[i]} ${dn(own(key))}`, side: i === 0 ? (x < 120 ? 'below' : 'left') : x > 520 ? 'below' : 'right', cue: n === 1 && k === 0 });
          });
        } else if (n === 3) {
          grip(g, A.canvas, t, { x: TRACK.x0 + ((own('c') - COUNT.min) / (COUNT.max - COUNT.min)) * (TRACK.x1 - TRACK.x0), y: TRACK.y, r: 20, dir: 'h', read: `${own('c')} ways`, side: 'above' });
        }
      }
      goalLine(g, GOALS[n - 1], A.t, shot !== null, n === 3 ? 14 : 12);
      if (n !== 3) text(g, r.fnText, 320, 30, PAL.yellow, 14);
      if (shot && rt > VERDICT) {
        if (trip) verdict(g, shot.ok, 'EVERYONE HOME', 'LOST!');
        else verdict(g, shot.ok, 'EVERYONE THROUGH', 'THE PORTAL JAMMED');
      }
    },
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level));
    const ref: ArcadeRef = { A: null };
    const stop = mountDialLevel(
      ctx as never,
      level(n, ctx.random, ref) as never,
      n >= 4 ? 'Travellers hop through one or two portals to the doors, then through a pink return portal back to their home markers on a number line.' : 'A traveller and a crowd on a number line, a portal that sends each number to a door, and fences that decide who may cross.',
    );
    if (n < 4) return stop;
    const unguard = guardZero(ctx, ref, n);
    return () => {
      unguard();
      stop();
    };
  },
});
