// Inspirations: Lemmings (a crowd walks in a line and you place the things that decide who survives) and Portal (a doorway whose far
// side must be exactly right). Pip leads the travellers through the portal f; two travellers on one door means f is not one-one.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type HandleSpec } from '@core/dialgame';
import { backdrop, face, track, trackHandle, verdict } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import { COUNT, DOMAIN, RANGE, buildRounds, collision, explain, imageOf, intel, judge, missText, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.6;
const Y0 = 232;

const HEROES = [
  { story: 'The portal sends each traveller x to the door f(x). A function is one-one when no two travellers ever share a door. Where f turns (rising, then falling) two different travellers land on the same door, so the fences must stop before the turn. The Mayor wants as many travellers as possible to cross, and Pip must be among them.', objective: 'Place the left and right fences so f is one-one on the fenced stretch and as wide as possible around Pip, in three rounds. The graph shows in round 1; a test walk costs a charge.' },
  { story: 'The doors are the co-domain. A function is onto when every door in the co-domain is used by someone. The return portal can switch on only when no door is left dark and no traveller lands outside the doors. Travellers come from a fixed stretch of the line.', objective: 'Place the two fences of the doors so f is onto, in three rounds. The lit doors show in round 1; a test walk costs a charge.' },
  { story: 'When a finite set of travellers maps into a set of the same size, one-one and onto are the same thing: every door gets exactly one traveller. The Mayor counts the ways the portal can be set up, and the first traveller can choose any of the doors, the next any that remain.', objective: 'Count how many one-one maps there are, in three rounds, with the number of travellers growing.' },
];
const FIRE = ['Send the travellers through', 'Send the travellers through', 'Hand the ledger to the Mayor'];

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
  text(g, label, x, y - 20, '#1b1030', 10);
}

const NL = (x: number) => 320 + x * 45;
const fence = (g: G, x: number, color: string, label: string) => {
  glow(g, color, 10, () => line(g, x, Y0 - 56, x, Y0 + 4, color, 4));
  g.fillStyle = color;
  g.fillRect(x - 3, Y0 - 56, 16, 10);
  text(g, label, x, Y0 + 20, color, 11);
};

function drawDomain(g: G, r: Round, v: Record<string, number>, t: number, rt: number, shot: { ok: boolean; v: Record<string, number> } | null) {
  const f = (x: number) => r.f(x);
  const ys = Array.from({ length: 101 }, (_, i) => f(-5 + i / 10));
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const Y = (y: number) => 190 - ((y - lo) / (hi - lo || 1)) * 120;
  line(g, NL(DOMAIN.min), Y0, NL(DOMAIN.max), Y0, PAL.dim, 3);
  for (let x = DOMAIN.min; x <= DOMAIN.max; x++) {
    line(g, NL(x), Y0 - 4, NL(x), Y0 + 4, PAL.dim, 1.5);
    text(g, String(x), NL(x), Y0 + 20, PAL.dim, 10);
  }
  if (r.assist <= 1 || shot) {
    g.globalAlpha = r.assist === 1 && !shot ? 0.3 : 1;
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 100; i++) {
      const x = -5 + i / 10;
      if (i === 0) g.moveTo(NL(x), Y(f(x)));
      else g.lineTo(NL(x), Y(f(x)));
    }
    g.stroke();
    g.globalAlpha = 1;
  } else text(g, 'graph off', 520, 70, PAL.dim, 12);
  const use = shot ? shot.v : v;
  const L = Math.min(use.lo, use.hi);
  const R = Math.max(use.lo, use.hi);
  fence(g, NL(use.lo), PAL.green, 'left');
  fence(g, NL(use.hi), PAL.pink, 'right');
  const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
  pip(g, NL(r.pip), Y0 - 2, t, mood, shot && rt < 1 ? rt : 0, String(r.pip));
  if (shot) {
    const p = Math.min(1, rt / 1.0);
    const hit = collision(r, L, R);
    for (let x = Math.ceil(L); x <= R; x++) {
      if (x === r.pip) continue;
      const bad = hit && Math.abs(x - hit[0]) < 1e-9;
      g.fillStyle = bad && rt > 1 ? PAL.red : PAL.yellow;
      g.beginPath();
      g.arc(NL(x), Y0 - 10 - (Y0 - 10 - Y(f(x))) * p, 5, 0, Math.PI * 2);
      g.fill();
    }
    if (hit && rt > 1) {
      g.strokeStyle = PAL.red;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(NL(hit[0]), Y(f(hit[0])), 12, 0, Math.PI * 2);
      g.arc(NL(hit[1]), Y(f(hit[1])), 12, 0, Math.PI * 2);
      g.stroke();
    }
  }
}

function drawRange(g: G, r: Round, v: Record<string, number>, t: number, rt: number, shot: { ok: boolean; v: Record<string, number> } | null) {
  const X = (y: number) => 320 + (y / 30) * 250;
  line(g, X(RANGE.min), Y0, X(RANGE.max), Y0, PAL.dim, 3);
  for (let y = RANGE.min; y <= RANGE.max; y += 10) {
    line(g, X(y), Y0 - 4, X(y), Y0 + 4, PAL.dim, 1.5);
    text(g, String(y), X(y), Y0 + 20, PAL.dim, 10);
  }
  const [ilo, ihi] = imageOf(r, r.a, r.b);
  if (r.assist <= 1 || shot) {
    g.globalAlpha = r.assist === 1 && !shot ? 0.3 : 1;
    g.fillStyle = 'rgba(77,225,255,0.5)';
    g.fillRect(X(ilo), Y0 - 14, X(ihi) - X(ilo), 10);
    text(g, 'doors in use', (X(ilo) + X(ihi)) / 2, Y0 - 22, PAL.cyan, 11);
    g.globalAlpha = 1;
  } else text(g, 'lit doors off', 520, 70, PAL.dim, 12);
  const use = shot ? shot.v : v;
  fence(g, X(use.lo), PAL.green, 'low');
  fence(g, X(use.hi), PAL.pink, 'high');
  text(g, `travellers from ${r.a} to ${r.b}`, 150, 60, PAL.white, 12);
  const mood: Mood = shot ? (rt > VERDICT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
  pip(g, 80, 150, t, mood, shot && rt < 1 ? rt : 0, String(r.a));
  if (shot) {
    const p = Math.min(1, rt / 1.0);
    const l = Math.min(use.lo, use.hi);
    const h = Math.max(use.lo, use.hi);
    for (let x = r.a; x <= r.b; x++) {
      const y = r.f(x);
      const out = y < l || y > h;
      g.fillStyle = out && rt > 1 ? PAL.red : PAL.yellow;
      g.beginPath();
      g.arc(120 + ((X(y) - 120) * p), 90 + (Y0 - 14 - 90) * p + x * 3, 5, 0, Math.PI * 2);
      g.fill();
    }
    if (rt > 1 && (l < ilo || h > ihi)) {
      g.fillStyle = PAL.red;
      for (const door of [l < ilo ? l : null, h > ihi ? h : null]) if (door !== null) g.fillRect(X(door) - 5, Y0 - 14, 10, 10);
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
    text(g, `door ${i + 1}`, x + 180, 214, PAL.dim, 10);
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

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  const dials = n === 3
    ? [{ key: 'c', aria: 'Number of one-one maps', label: 'Number of ways', unit: '', step: 1, min: COUNT.min, max: COUNT.max, start: 1, text: (v: number) => `${v}` }]
    : (() => {
        const span = n === 1 ? DOMAIN : RANGE;
        return [
          { key: 'lo', aria: n === 1 ? 'Left fence' : 'Lowest door of the co-domain', label: n === 1 ? 'Left fence' : 'Lowest door', unit: '', step: 1, min: span.min, max: span.max, start: 0, text: (v: number) => `${v}` },
          { key: 'hi', aria: n === 1 ? 'Right fence' : 'Highest door of the co-domain', label: n === 1 ? 'Right fence' : 'Highest door', unit: '', step: 1, min: span.min, max: span.max, start: 0, text: (v: number) => `${v}` },
        ];
      })();
  const handles: HandleSpec<Round>[] = n === 3
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
    test: { button: '🚶 Test walk', aria: 'Test walk: send two test travellers', read: (r, v) => spotText(r, v) },
    fire: { button: n === 3 ? '📒 Give the ledger' : '🚪 Send them through', aria: FIRE[n - 1] },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `Everyone through! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The live picture is on.' : r.assist === 1 ? 'The picture is dim: a test walk costs a charge.' : 'Boss round: no picture, no test walk.'}`,
    hit: () => [320, 150],
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      if (n === 1) drawDomain(g, r, v, t, rt, shot);
      else if (n === 2) drawRange(g, r, v, t, rt, shot);
      else drawCount(g, r, t, rt, shot);
      if (n === 3) track(g, COUNT.min, COUNT.max);
      if (n !== 3) text(g, r.fnText, 320, 30, PAL.yellow, 14);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'EVERYONE THROUGH', 'THE PORTAL JAMMED');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(3, ctx.level)), ctx.random) as never, 'A traveller and a crowd on a number line, a portal that sends each number to a door, and fences that decide who may cross.');
  },
});
