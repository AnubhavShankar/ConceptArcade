// Inspirations: Splatoon (cover the turf with ink) and Paper.io (the player is the pen that claims ground). Inky is a paint-roller squid kid and is also the
// handle: the player drags Inky along the turf, laying paint behind. The paint is area, so the part below the axis counts as paint, never as a negative.
import { PAL, type Arcade } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type HandleSpec } from '@core/dialgame';
import { backdrop, face, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import type { GameContext } from '@core/types';
import { area, arcHeight, buildRounds, CURVES, explain, height, hitPoint, intel, judge, missText, needText, pastFence, ROUND_DIAL_MAX, show, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.9;
const RUN = 1.4;
const F = { x0: 70, x1: 580, top: 62, bottom: 262 };
const E = { cx: 320, cy: 170, u: 12 };

const HEROES = [
  { story: 'The turf is an ellipse x²/a² + y²/b² = 1. Its area is πab, which is four times the area of its first quadrant. The width a is fixed by the arena; Inky drags the top of the ellipse up to set the height b.', objective: 'Drag Inky to the height b where the ellipse holds exactly the paint the turf needs, in three rounds. The paint counter shows in round 1; an ink gauge costs a charge.' },
  { story: 'The turf lies between a straight line and the x-axis, and the line crosses the axis. Paint below the axis is still turf, so it adds to the area: the area is the part below plus the part above, not their signed difference.', objective: 'Drag Inky to where the paint laid is exactly the paint needed, in three rounds. The paint counter shows in round 1; an ink gauge costs a charge.' },
  { story: 'The turf lies under a wave a·sin x. Each quarter wave of height a has area a, whether it is above the axis or below it, so the area grows by a with every step of π/2, never cancelling.', objective: 'Drag Inky to the number of quarter waves where the paint laid is exactly the paint needed, in three rounds. The paint counter shows in round 1; an ink gauge costs a charge.' },
  { story: 'The cubic k·x³ is below the axis for x < 0 and above it for x > 0. The roller starts at the left end of the turf and rolls right. Paint counts on both sides of the axis, so the two lobes add.', objective: 'Drag Inky to where the paint laid is exactly the paint needed, in three rounds. The boss round has no paint counter and no ink gauge.' },
  { story: 'This turf lies between the left wall (the y-axis) and a curve x = g(y). Each horizontal strip has length g(y) and height dy, so the area is ∫ g(y) dy from the bottom to the top edge.', objective: 'Drag the top edge so the turf gets exactly the paint it needs, in three rounds.' },
  { story: 'This turf sits under a round fence, the circle x² + y² = a². Its area from the centre line to the edge x = q is ∫ √(a² − x²) dx, a standard integral with a sin⁻¹ in it.', objective: 'Drag the edge so the round turf gets exactly the paint it needs, in three rounds.' },
];

// Levels 5 and 6 share a paint tank on the right. Its claim line sits at a fixed height and the verdict fills it to fixed levels (short, exact, over),
// so a miss shows only the direction and never a level that depends on the amounts.
const TANK = { x: 560, w: 40, y0: 90, y1: 290 };
const GOAL = 0.6;
const FILL = { short: GOAL * 0.55, over: 1 };

function tank(g: G, fill: number, over: boolean, t: number) {
  const h = TANK.y1 - TANK.y0;
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(TANK.x, TANK.y0, TANK.w, h);
  if (fill > 0) {
    g.fillStyle = over ? 'rgba(255,90,90,0.75)' : 'rgba(255,77,141,0.75)';
    g.fillRect(TANK.x, TANK.y1 - fill * h, TANK.w, fill * h);
  }
  g.strokeStyle = PAL.dim;
  g.lineWidth = 2;
  g.strokeRect(TANK.x, TANK.y0, TANK.w, h);
  const yg = TANK.y1 - GOAL * h;
  line(g, TANK.x - 8, yg, TANK.x + TANK.w + 8, yg, PAL.green, 2, [5, 4]);
  text(g, 'need', TANK.x - 12, yg + 4, PAL.green, 11, 'right');
  text(g, 'paint tank', TANK.x + TANK.w / 2, TANK.y1 + 16, PAL.dim, 10);
  if (over && fill >= 1) {
    g.fillStyle = PAL.red;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(TANK.x + 6 + i * 9, TANK.y0 - 3 - ((t * 25 + i * 7) % 14), 2.5, 0, Math.PI * 2);
      g.fill();
    }
  }
}

/** The counter: live in round 1, dim in round 2, off in the boss round, and never a number while a shot plays. */
function readout(g: G, r: Round, painted: number, shot: boolean) {
  g.globalAlpha = r.assist === 1 && !shot ? 0.3 : 1;
  if (shot) text(g, 'sealing the turf…', 500, 40, PAL.dim, 12);
  else if (r.assist < 2) text(g, `painted ${show(r, Math.round(painted * 10) / 10)}`, 500, 40, PAL.yellow, 13);
  else text(g, 'counter off', 500, 40, PAL.dim, 12);
  g.globalAlpha = 1;
  text(g, `need ${needText(r)}`, 500, 58, PAL.green, 13);
}

/** Fixed fill levels for the verdict: the direction of the miss, never its size. */
function tankFill(r: Round, val: number, ok: boolean, sweep: number) {
  return (ok ? GOAL : area(r, val) < r.T ? FILL.short : FILL.over) * sweep;
}

const SPILL = 'rgba(255,110,50,0.7)';

/** Paint spilling over at the player's own edge: a fan of drops that opens during the first half second. */
function splash(g: G, x: number, y: number, age: number) {
  const k = Math.min(1, Math.max(0, age) / 0.4);
  g.fillStyle = SPILL;
  for (let i = 0; i < 8; i++) {
    const a = (-Math.PI * (i + 0.5)) / 8;
    g.beginPath();
    g.arc(x + Math.cos(a) * (6 + 24 * k), y + Math.sin(a) * (6 + 24 * k) + 10 * k * k, 3.5, 0, Math.PI * 2);
    g.fill();
  }
}

/** Bare patches at fixed places inside the player's own strip: they say "short", never how short. */
function bare(g: G, spots: [number, number][]) {
  g.fillStyle = '#060a24';
  for (const [x, y] of spots) g.fillRect(x - 4.5, y - 4.5, 9, 9);
}

/** Drips of paint falling from the roller while it works. */
function drips(g: G, x0: number, x1: number, y: number, t: number) {
  g.fillStyle = PAL.pink;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(x0 + ((x1 - x0) * (i + 0.5)) / 5, y + 4 + ((t * 40 + i * 13) % 18), 2, 0, Math.PI * 2);
    g.fill();
  }
}

// Level 5: the left wall is the y-axis; the curve x = g(y) bounds the turf on the right. The curve drawn is one fixed generic bulge, not g, so the picture cannot be measured.
const S5 = { wall: 130, bottom: 292, top: 56 };
const y5 = (v: number) => S5.bottom - (v / 6) * (S5.bottom - S5.top);
const bulge = (u: number) => 110 + 80 * Math.sin(0.4 + 2.4 * u);

function sidewaysLevel(): Pick<DialLevel<Round>, 'handles' | 'hit' | 'draw'> {
  return {
    handles: [{ dial: 'v', at: (_r, v) => [S5.wall + 26, y5(v.v)], drag: (_r, _px, py) => ((S5.bottom - py) / (S5.bottom - S5.top)) * 6, radius: 24 }],
    hit: hitPoint,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const val = shot ? shot.v.v : v.v;
      const sweep = shot ? Math.min(1, rt / RUN) : 1;
      const hv = val * sweep;
      const { wall, bottom, top } = S5;
      line(g, wall, bottom, wall + 250, bottom, PAL.dim, 1.5);
      line(g, wall, top - 14, wall, bottom, PAL.dim, 3);
      text(g, 'y-axis (left wall)', wall, top - 22, PAL.dim, 10);
      for (let i = 1; i <= 6; i++) line(g, wall - 5, y5(i), wall + 5, y5(i), PAL.dim, 1.5);
      g.fillStyle = 'rgba(255,77,141,0.5)';
      g.beginPath();
      g.moveTo(wall, bottom);
      for (let i = 0; i <= 40; i++) {
        const u = ((hv / 6) * i) / 40;
        g.lineTo(wall + bulge(u), bottom - u * (bottom - top));
      }
      g.lineTo(wall, y5(hv));
      g.closePath();
      g.fill();
      g.strokeStyle = PAL.cyan;
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i <= 60; i++) {
        const u = i / 60;
        if (i === 0) g.moveTo(wall + bulge(u), bottom - u * (bottom - top));
        else g.lineTo(wall + bulge(u), bottom - u * (bottom - top));
      }
      g.stroke();
      text(g, `x = ${CURVES[r.p[0]].fx}`, wall + bulge(1) + 12, top + 6, PAL.cyan, 12, 'left');
      const reach = wall + bulge(val / 6) + 16;
      line(g, wall, y5(val), reach, y5(val), PAL.yellow, 1.5, [4, 4]);
      text(g, `y = ${val}`, reach + 6, y5(val) + 4, PAL.yellow, 11, 'left');
      const rolling = shot !== null && sweep < 1;
      if (rolling) {
        line(g, wall + 40, y5(hv), wall + bulge(hv / 6), y5(hv), PAL.cyan, 5);
        drips(g, wall + 40, wall + bulge(hv / 6), y5(hv), t);
      }
      readout(g, r, area(r, val), shot !== null);
      const over = shot !== null && !shot.ok && area(r, val) > r.T;
      tank(g, shot ? tankFill(r, val, shot.ok, sweep) : 0, over && sweep >= 1, t);
      const mood: Mood = shot ? (rt > RUN ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      inky(g, wall + 26, y5(hv) + (shot ? 0 : Math.sin(t * 3) * 1.5), t, mood, shot ? rt * 4 : 0);
      if (shot && rt > VERDICT - 0.3) verdict(g, shot.ok, 'TURF SEALED', over ? 'SPILLED ON THE RIVAL' : 'BARE PATCHES');
    },
  };
}

// Level 6: the turf under the arc of a circle, with the right edge x = q as the handle. The picture is the real circle, but it carries no numbers.
// The edge handle runs along a fixed track, x = 1 to 10 at 24 px a unit, whatever the circle, so the end of the fence (x = a) sits in a different place each round.
const S6 = { x0: 100, bottom: 290, U: 24 };
const x6 = (q: number) => S6.x0 + q * S6.U;
const arcY = (a: number, x: number) => S6.bottom - S6.U * arcHeight(a, x);
/** The right edge of the paint can only reach the end of the fence. */
let arcade: Arcade | null = null;

function roundLevel(): Pick<DialLevel<Round>, 'handles' | 'hit' | 'draw'> {
  return {
    handles: [{ dial: 'v', at: (_r, v) => [x6(v.v), S6.bottom], drag: (_r, px) => (px - S6.x0) / S6.U, radius: 24 }],
    hit: hitPoint,
    draw: ({ g, r, v, t, rt, shot, A }) => {
      arcade = A;
      backdrop(g);
      const a = r.p[0];
      const val = shot ? shot.v.v : v.v;
      const sweep = shot ? Math.min(1, rt / RUN) : 1;
      const hq = val * sweep;
      const hc = Math.min(hq, a);
      const { x0, bottom, U } = S6;
      line(g, x0 - 12, bottom, x6(ROUND_DIAL_MAX) + 24, bottom, PAL.dim, 1.5);
      line(g, x0, bottom, x0, bottom - 252, PAL.dim, 3);
      text(g, 'centre line', x0, bottom - 262, PAL.dim, 10);
      for (let i = 1; i <= ROUND_DIAL_MAX; i++) line(g, x6(i), bottom - 4, x6(i), bottom + 4, PAL.dim, 1.5);
      g.fillStyle = 'rgba(255,77,141,0.5)';
      g.beginPath();
      g.moveTo(x0, bottom);
      for (let i = 0; i <= 50; i++) {
        const x = (hc * i) / 50;
        g.lineTo(x6(x), arcY(a, x));
      }
      g.lineTo(x6(hc), bottom);
      g.closePath();
      g.fill();
      // The round fence glows.
      g.save();
      g.shadowColor = PAL.cyan;
      g.shadowBlur = 10;
      g.strokeStyle = PAL.cyan;
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i <= 80; i++) {
        const x = (a * i) / 80;
        if (i === 0) g.moveTo(x6(0), arcY(a, 0));
        else g.lineTo(x6(x), arcY(a, x));
      }
      g.stroke();
      g.restore();
      text(g, `x² + y² = ${a * a}`, x6(a * 0.75) + 8, bottom - U * a * 0.75 - 8, PAL.cyan, 12, 'left');
      const ex = x6(val);
      line(g, ex, bottom, ex, arcY(a, Math.min(val, a)) - 12, PAL.yellow, 1.5, [4, 4]);
      text(g, `x = ${val}`, ex, bottom + 20, PAL.yellow, 11);
      const rolling = shot !== null && sweep < 1;
      if (rolling) {
        line(g, x6(hc), bottom - 6, x6(hc), arcY(a, hc), PAL.cyan, 5);
        drips(g, x6(hc) + 4, x6(hc) + 14, arcY(a, hc) - 8, t);
      }
      readout(g, r, area(r, val), shot !== null);
      const over = shot !== null && !shot.ok && area(r, val) > r.T;
      tank(g, shot ? tankFill(r, val, shot.ok, sweep) : 0, over && sweep >= 1, t);
      const mood: Mood = shot ? (rt > RUN ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      inky(g, x6(hq) - 8, bottom + (shot ? 0 : Math.sin(t * 3) * 1.5), t, mood, shot ? rt * 4 : 0);
      if (shot && rt > VERDICT - 0.3) verdict(g, shot.ok, 'TURF SEALED', over ? 'SPILLED ON THE RIVAL' : 'BARE PATCHES');
    },
  };
}

/**
 * Level 6 only: the dial runs past the end of the fence, and an edge there is invalid input. Catch the Seal and Ink gauge buttons before they act:
 * the note is free, nothing is fired and no charge is spent.
 */
function guardFence(ctx: GameContext, rounds: Round[]): () => void {
  const onClick = (e: Event) => {
    const b = (e.target as HTMLElement | null)?.closest?.('button');
    const label = b?.getAttribute('aria-label') ?? '';
    if (label !== 'Seal the turf' && !label.startsWith('Ink gauge')) return;
    const A = arcade;
    if (!A || A.phase !== 'play') return;
    const r = rounds[Math.min(A.round, 2)];
    const q = Number((ctx.root.querySelector('input[type="range"]') as HTMLInputElement | null)?.value);
    if (!pastFence(r, q)) return;
    e.stopImmediatePropagation();
    A.freeNote(`The round fence ends at x = ${r.p[0]}: the edge cannot go past it.`);
  };
  ctx.root.addEventListener('click', onClick, true);
  return () => ctx.root.removeEventListener('click', onClick, true);
}

/** Inky: a squid kid with a dome head, wiggling tentacle legs and a paint roller. */
function inky(g: G, x: number, y: number, t: number, mood: Mood, roll: number) {
  for (let i = 0; i < 4; i++) {
    const tx = x - 12 + i * 8;
    const w = Math.sin(t * 6 + i * 1.3) * 3;
    g.strokeStyle = PAL.pink;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(tx, y - 18);
    g.quadraticCurveTo(tx + w, y - 8, tx - w * 0.5, y);
    g.stroke();
  }
  g.fillStyle = PAL.pink;
  g.beginPath();
  g.ellipse(x, y - 32, 15, 18, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ff9fc5';
  g.beginPath();
  g.ellipse(x - 5, y - 40, 4, 7, -0.4, 0, Math.PI * 2);
  g.fill();
  face(g, x, y - 30, 11, mood, t, '#1b1030');
  // The roller: a handle from the side of the head and a cylinder that turns as it rolls.
  line(g, x + 12, y - 28, x + 28, y - 10, PAL.dim, 3);
  g.fillStyle = PAL.cyan;
  g.fillRect(x + 20, y - 12, 18, 8);
  for (let i = 0; i < 3; i++) line(g, x + 22 + ((i * 6 + roll * 6) % 16), y - 12, x + 22 + ((i * 6 + roll * 6) % 16), y - 4, '#0a1030', 1.5);
}

/** Levels 5 and 6: the edge of the turf is the dial, from 1 to the end of the turf, and the scene is its own. */
function newLevel(n: 5 | 6, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const scene = n === 5 ? sidewaysLevel() : roundLevel();
  return {
    hero: { name: 'Inky', role: 'a paint-roller squid kid who covers a turf with exactly the paint it needs', story: hero.story, objective: hero.objective },
    rounds: buildRounds(n, random),
    charges: [1, 1, 0],
    dials: [{ key: 'v', aria: 'Roller setting', label: n === 5 ? 'Top edge at y' : 'Right edge at x', unit: '', step: 1, min: (r: Round) => r.min, max: (r: Round) => (n === 5 ? r.max : ROUND_DIAL_MAX), start: (r: Round) => r.start, text: (v: number) => (n === 5 ? `y = ${v}` : `x = ${v}`) }],
    handles: scene.handles,
    test: { button: '🎯 Ink gauge', aria: 'Ink gauge: read the paint laid at this setting', read: (r, v) => spotText(r, v.v) },
    fire: { button: '🖌️ Seal the turf', aria: 'Seal the turf' },
    judge: (r, v) => judge(r, v.v),
    miss: (r, v) => missText(r, v.v),
    win: (r) => `Turf sealed! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The paint counter is live.' : r.assist === 1 ? 'The counter is dim: an ink gauge costs a charge.' : 'Boss round: no counter, no gauge.'}`,
    hit: scene.hit,
    delay: VERDICT,
    draw: scene.draw,
  };
}

function level(n: number, random: () => number): DialLevel<Round> {
  if (n >= 5) return newLevel(n === 5 ? 5 : 6, random);
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  const kind = rounds[0].kind;
  const geo = rounds.map((r) => {
    if (kind === 'ellipse') return { x0: -1, x1: 1, y0: -1, y1: 1, lo: -r.p[0] };
    const x0 = kind === 'cubic' ? -3 : 0;
    const x1 = kind === 'line' ? 9 : kind === 'sine' ? 4 * Math.PI : 4;
    const ys = Array.from({ length: 121 }, (_, i) => height(r, x0 + ((x1 - x0) * i) / 120));
    const y0 = Math.min(0, ...ys);
    const y1 = Math.max(0, ...ys);
    const pad = (y1 - y0) * 0.06;
    return { x0, x1, y0: y0 - pad, y1: y1 + pad, lo: kind === 'cubic' ? -r.p[1] : 0 };
  });
  const at = (r: Round) => geo[rounds.indexOf(r)] ?? geo[0];
  const X = (r: Round, x: number) => F.x0 + ((x - at(r).x0) / (at(r).x1 - at(r).x0)) * (F.x1 - F.x0);
  const Y = (r: Round, y: number) => F.bottom - ((y - at(r).y0) / (at(r).y1 - at(r).y0)) * (F.bottom - F.top);
  const edge = (r: Round, v: number) => (r.kind === 'sine' ? (v * Math.PI) / 2 : v);
  const handle: HandleSpec<Round> =
    kind === 'ellipse'
      ? { dial: 'v', at: (_r, v) => [E.cx, E.cy - v.v * E.u], drag: (_r, _px, py) => (E.cy - py) / E.u, radius: 24 }
      : { dial: 'v', at: (r, v) => [X(r, edge(r, v.v)), Y(r, 0)], drag: (r, px) => ((px - X(r, 0)) / (X(r, 1) - X(r, 0))) / (r.kind === 'sine' ? Math.PI / 2 : 1), radius: 24 };
  const labels = ['Ellipse height b', 'Roller at x', 'Quarter waves n', 'Roller at x'];
  return {
    hero: { name: 'Inky', role: 'a paint-roller squid kid who covers a turf with exactly the paint it needs', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'v', aria: 'Roller setting', label: labels[n - 1], unit: '', step: 1, min: (r: Round) => r.min, max: (r: Round) => r.max, start: (r: Round) => r.start, text: (v: number) => (kind === 'ellipse' ? `b = ${v}` : kind === 'sine' ? `${v} quarter waves` : `x = ${v}`) }],
    handles: [handle],
    test: { button: '🎯 Ink gauge', aria: 'Ink gauge: read the paint laid at this setting', read: (r, v) => spotText(r, v.v) },
    fire: { button: '🖌️ Seal the turf', aria: 'Seal the turf' },
    judge: (r, v) => judge(r, v.v),
    miss: (r, v) => missText(r, v.v),
    win: (r) => `Turf sealed! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The paint counter is live.' : r.assist === 1 ? 'The counter is dim: an ink gauge costs a charge.' : 'Boss round: no counter, no gauge.'}`,
    hit: hitPoint,
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const val = shot ? shot.v.v : v.v;
      const sweep = shot ? Math.min(1, rt / RUN) : 1;
      // A miss shows itself only once the roller has finished, and only on the player's own strip: all orange with a splash at the player's own edge when over, fixed bare patches when short.
      const done = shot !== null && rt > RUN;
      let painted = 0;
      let overT = false;
      let px: number;
      let py: number;
      if (kind === 'ellipse') {
        const a = r.p[0];
        const b = Math.max(0.05, val);
        line(g, E.cx - 7 * E.u, E.cy, E.cx + 7 * E.u, E.cy, PAL.dim, 1.5);
        line(g, E.cx, E.cy - 9 * E.u, E.cx, E.cy + 9 * E.u, PAL.dim, 1.5);
        painted = a * val;
        overT = shot !== null && a * val > r.T;
        g.save();
        g.beginPath();
        g.rect(E.cx - a * E.u - 2, 0, 2 * a * E.u * sweep + 4, 340);
        g.clip();
        g.fillStyle = done && overT ? SPILL : 'rgba(255,77,141,0.5)';
        g.beginPath();
        g.ellipse(E.cx, E.cy, a * E.u, b * E.u, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(E.cx, E.cy, a * E.u, b * E.u, 0, 0, Math.PI * 2);
        g.stroke();
        if (done && shot && !shot.ok) {
          if (overT) splash(g, E.cx, E.cy - b * E.u, rt - RUN);
          else bare(g, [[-0.5, 0.3], [0.2, -0.35], [0.55, 0.1], [-0.15, 0.4]].map(([fx, fy]) => [E.cx + fx * a * E.u, E.cy + fy * b * E.u] as [number, number]));
        }
        text(g, `a = ${a}`, E.cx + a * E.u + 22, E.cy + 14, PAL.dim, 11);
        px = E.cx + (shot ? -a * E.u + 2 * a * E.u * sweep : 0) + 0;
        py = E.cy - b * E.u;
        if (shot) py = E.cy;
      } else {
        const lo = at(r).lo;
        const hi = edge(r, val);
        const z = Y(r, 0);
        line(g, F.x0, z, F.x1, z, PAL.dim, 1.5);
        // The curve and the paint laid under it so far
        const N = 120;
        const dx = (hi - lo) / N;
        for (let i = 0; i < N * sweep; i++) {
          const x = lo + (i + 0.5) * dx;
          const h = height(r, x);
          g.fillStyle = done && shot && !shot.ok && area(r, val) > r.T ? SPILL : h < 0 ? 'rgba(255,155,61,0.5)' : 'rgba(255,77,141,0.5)';
          g.fillRect(X(r, lo + i * dx), Math.min(Y(r, h), z), X(r, lo + (i + 1) * dx) - X(r, lo + i * dx) + 0.6, Math.abs(z - Y(r, h)));
        }
        painted = area(r, val);
        overT = shot !== null && area(r, val) > r.T;
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 3;
        g.beginPath();
        for (let i = 0; i <= 200; i++) {
          const x = at(r).x0 + ((at(r).x1 - at(r).x0) * i) / 200;
          if (i === 0) g.moveTo(X(r, x), Y(r, height(r, x)));
          else g.lineTo(X(r, x), Y(r, height(r, x)));
        }
        g.stroke();
        if (done && shot && !shot.ok) {
          if (overT) splash(g, X(r, hi), z, rt - RUN);
          else bare(g, [0.18, 0.4, 0.62, 0.84].map((f, i) => [X(r, lo) + (X(r, hi) - X(r, lo)) * f, z + (i % 2 ? 3 : -9) + 4.5] as [number, number]));
        }
        if (r.kind === 'sine') for (let i = 0; i <= 8; i++) text(g, i === 0 ? '0' : `${i}`, X(r, (i * Math.PI) / 2), z + (i % 2 ? 15 : 28), PAL.dim, 9);
        else for (let i = Math.ceil(at(r).x0); i <= at(r).x1; i++) text(g, String(i), X(r, i), z + 14, PAL.dim, 9);
        px = X(r, lo + (hi - lo) * (shot ? sweep : 1));
        py = z;
        line(g, X(r, hi), F.top, X(r, hi), F.bottom, PAL.yellow, 1.5, [4, 4]);
      }
      // The counter
      // Round 1 shows it live and round 2 dim before the roller is sent; while a shot plays it shows no number in any round.
      const live = r.assist === 0 && !shot;
      const dim = r.assist === 1 && !shot;
      g.globalAlpha = dim ? 0.3 : 1;
      if (shot) text(g, 'sealing the turf…', 500, 40, PAL.dim, 12);
      else if (live || dim) text(g, `painted ${show(r, Math.round(painted * 10) / 10)}`, 500, 40, PAL.yellow, 13);
      else text(g, 'counter off', 500, 40, PAL.dim, 12);
      g.globalAlpha = 1;
      text(g, `need ${show(r, r.T)}`, 500, 58, PAL.green, 13);
      const mood: Mood = shot ? (rt > RUN ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      inky(g, px, py + (kind === 'ellipse' && !shot ? -6 : 0), t, mood, shot ? rt * 4 : 0);
      if (shot && rt > VERDICT - 0.3) verdict(g, shot.ok, 'TURF SEALED', overT ? 'SPILLED ON THE RIVAL' : 'BARE PATCHES');
    },
  };
}

export default defineGame({
  mount(ctx) {
    const L = level(Math.max(1, Math.min(6, ctx.level)), ctx.random);
    const stop = mountDialLevel(ctx as never, L as never, ctx.level >= 5 ? 'A paint-roller squid kid on a turf bounded by a curve on its side or by a circle, dragged to lay exactly the paint the turf needs.' : 'A paint-roller squid kid on a turf bounded by a curve and the x-axis, dragged to lay exactly the paint the turf needs.');
    if (ctx.level < 6) return stop;
    arcade = null;
    const unguard = guardFence(ctx, L.rounds);
    return () => {
      unguard();
      stop();
    };
  },
});
