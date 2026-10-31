// Rover Ridge levels 4 and 5, mounted straight on the arcade engine because they need buttons the dial template does not have: level 4 adds two
// declarations (no maximum, no plateau) beside Park, level 5 adds a one-corner or whole-edge toggle. The ruler dial, its drag handles, the probe, hearts,
// rounds and fading helpers work exactly as in levels 1 to 3.
//
// What a miss shows: only what the player's own choice did. A declaration shows the rover holding up its own sign and a stamp, never the true kind of round;
// the drive off the map and the hover with nowhere to land play only when the declaration was right. The plateau of a hidden (boss) round is drawn only
// after a win, so a miss never reveals the corners or the true shape.
import { helperOn, paidFlash } from '@core/aidflash';
import { createArcade, PAL } from '@core/arcade';
import { TRACK, backdrop, num, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import type { GameContext } from '@core/types';
import { rover, type Mood } from './art';
import { goalLine, grip, tint } from './ux';
import { BOX, DECLARE_HIT, buildRounds, explain, halfBox, intel, judgeEdge, judgeOpen, missTextEdge, missTextOpen, parseConstraint, ruleEnds, ruler, spotFor, spotText, zText, type Attempt, type Pt, type Round, type Shape } from './logic';

type G = CanvasRenderingContext2D;
type Action = 'park' | 'nomax' | 'empty';
interface Shot {
  ok: boolean;
  action: Action;
  z: number;
  shape: Shape;
}

const M = { x: 64, y: 292, u: 22 };
const X = (x: number) => M.x + x * M.u;
const Y = (y: number) => M.y - y * M.u;
/** Seconds into a park run when the verdict lands, and into a declaration. */
const PARK = 1.9;
const DECLARE = 1.0;
const START: Pt = [0.6, 0.6];
const PANEL = 352;

function arrow(g: G, x1: number, y1: number, x2: number, y2: number) {
  line(g, x1, y1, x2, y2, PAL.white, 2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  line(g, x2, y2, x2 - Math.cos(a - 0.5) * 7, y2 - Math.sin(a - 0.5) * 7, PAL.white, 2);
  line(g, x2, y2, x2 - Math.cos(a + 0.5) * 7, y2 - Math.sin(a + 0.5) * 7, PAL.white, 2);
}

function poly(g: G, pts: Pt[]) {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))));
  g.closePath();
}

/** The plateau, as the constraints draw it: a fenced patch, a patch that runs off the map, or two sides of a clash that never meet. */
function plateau(g: G, r: Round, dim: boolean, labelled: boolean) {
  g.globalAlpha = dim ? 0.35 : 1;
  if (r.kind === 'empty') {
    const tint = ['rgba(77,225,255,0.3)', 'rgba(255,77,141,0.3)'];
    const edge = [PAL.cyan, PAL.pink];
    r.constraints.slice(0, 2).forEach((c, i) => {
      const half = halfBox(parseConstraint(c));
      g.fillStyle = tint[i];
      g.strokeStyle = edge[i];
      g.lineWidth = 2;
      g.setLineDash([6, 4]);
      poly(g, half);
      g.fill();
      g.stroke();
      g.setLineDash([]);
      const cx = half.reduce((s, p) => s + p[0], 0) / half.length;
      const cy = half.reduce((s, p) => s + p[1], 0) / half.length;
      text(g, c, X(cx), Y(cy), edge[i], 11);
    });
    text(g, 'no common ground', X(6), Y(6), PAL.white, 12);
    g.globalAlpha = 1;
    return;
  }
  const area = r.draw ?? r.corners;
  g.fillStyle = 'rgba(160,110,60,0.55)';
  g.strokeStyle = PAL.orange;
  g.lineWidth = 3;
  poly(g, area);
  g.fill();
  if (r.open) {
    // Only the real cliffs are stroked; the window edge at x = 12 and y = 12 is not a cliff.
    g.beginPath();
    [area[area.length - 1], ...area.slice(0, area.length - 2)].forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))));
    g.stroke();
    arrow(g, X(10.2), Y(6), X(11.8), Y(6));
    arrow(g, X(6), Y(10.2), X(6), Y(11.8));
    text(g, 'runs on', X(9.3), Y(10.6), PAL.white, 11);
  } else g.stroke();
  if (labelled) for (const p of r.corners) {
    g.fillStyle = PAL.yellow;
    g.beginPath();
    g.arc(X(p[0]), Y(p[1]), 4, 0, Math.PI * 2);
    g.fill();
    text(g, `(${num(p[0])}, ${num(p[1])})`, X(p[0]) + 6, Y(p[1]) - 8, PAL.yellow, 10, 'left');
  }
  g.globalAlpha = 1;
}

export function mountOpen(ctx: GameContext, n: 4 | 5, hero: { story: string; objective: string }): () => void {
  const rounds = buildRounds(n, ctx.random);
  const values = { z: 0 };
  const flash = paidFlash();
  let shape: Shape = 'corner';
  let shot: Shot | null = null;
  let onRound: (k: number) => void = () => undefined;
  const A = createArcade(
    ctx,
    { name: 'Rover', role: 'a mining rover who parks at the richest corner of a fenced plateau', story: hero.story, objective: hero.objective },
    { W: 640, H: 340, aria: 'A mining rover on the open plains with an ore ruler that slides across the map, and buttons to declare what the plateau allows.', rounds: 3, charges: [1, 1, 0], onRound: (k) => onRound(k) },
  );
  const cur = () => Math.min(A.round, 2);
  const r0 = rounds[0];
  values.z = r0.start;
  const slider = A.slider({ aria: 'Ruler setting Z', label: 'Ruler Z', min: r0.min, max: r0.max, step: 1, value: values.z, unit: '', text: (v) => `Z = ${num(v)}`, onInput: (v) => (values.z = v) });

  // Handles: the ruler itself on the map, and the track along the bottom.
  const mid = (r: Round, z: number): Pt => {
    const e = ruleEnds(r, z);
    return e.length >= 2 ? [(e[0][0] + e[e.length - 1][0]) / 2, (e[0][1] + e[e.length - 1][1]) / 2] : [BOX / 2, BOX / 2];
  };
  const clamp = (v: number) => Math.max(0, Math.min(BOX, v));
  A.handle({
    x: () => X(mid(rounds[cur()], values.z)[0]),
    y: () => Y(mid(rounds[cur()], values.z)[1]),
    r: 22,
    drag: (px, py) => {
      const r = rounds[cur()];
      slider.set(r.a * clamp((px - M.x) / M.u) + r.b * clamp((M.y - py) / M.u));
    },
  });
  const th = trackHandle<Round>('z', (r) => r.min, (r) => r.max);
  A.handle({ x: () => th.at(rounds[cur()], values)[0], y: () => th.at(rounds[cur()], values)[1], r: 20, drag: (px, py) => slider.set(th.drag(rounds[cur()], px, py, values)) });

  const commit = (action: Action) => {
    const k = cur();
    const r = rounds[k];
    const z = values.z;
    let ok: boolean;
    let said: string;
    if (n === 4) {
      const attempt: Attempt = action === 'park' ? { action, z } : { action };
      ok = judgeOpen(r, attempt);
      said = ok ? `${action === 'park' ? 'Ore found!' : 'Claim confirmed!'} ${explain(r)}` : missTextOpen(r, attempt);
    } else {
      ok = judgeEdge(r, z, shape);
      said = ok ? `Ore found! ${explain(r)}` : missTextEdge(r, z, shape);
    }
    shot = { ok, action, z, shape };
    // The burst lands where the rover went for this very attempt (or at a fixed point for a declaration), never at the winning corner.
    const spot = action === 'park' ? spotFor(r, z) : DECLARE_HIT;
    A.resolve(ok, said, { x: X(spot[0]), y: Math.max(70, Y(spot[1])) }, action === 'park' ? PARK : DECLARE);
  };

  A.controls.append(slider.row);
  A.controls.append(A.button('📡 Probe', 'Probe: see how the ruler sits at this Z', () => {
    if (!A.spend()) return;
    flash.paid();
    A.say(spotText(rounds[cur()], values.z), true);
  }, 'secondary'));
  const toggle = A.button('', 'Toggle: best at one corner or along a whole edge', () => {
    shape = shape === 'corner' ? 'edge' : 'corner';
    syncToggle();
    A.sound('blip');
  }, 'secondary');
  function syncToggle() {
    toggle.dataset.shape = shape;
    toggle.textContent = shape === 'edge' ? 'Best at: a whole edge' : 'Best at: one corner';
  }
  syncToggle();
  if (n === 5) A.controls.append(toggle);
  A.controls.append(A.button('🚙 Send the rover', 'Send the rover', () => commit('park')));
  // The first declaration follows the goal of the round: 'No maximum' on a max round, 'No minimum' on a min round.
  const noOpt = A.button('', '', () => commit('nomax'), 'secondary');
  function syncDeclare(goal: 'max' | 'min') {
    const word = goal === 'max' ? 'maximum' : 'minimum';
    noOpt.textContent = `🚫 No ${word}`;
    noOpt.setAttribute('aria-label', `Declare: there is no ${word}`);
  }
  syncDeclare(r0.goal);
  if (n === 4) {
    A.controls.append(noOpt, A.button('⛔ No plateau', 'Declare: there is no feasible region', () => commit('empty'), 'secondary'));
  }

  onRound = (k) => {
    const r = rounds[k];
    slider.range(r.min, r.max);
    slider.set(r.start);
    shape = 'corner';
    syncToggle();
    syncDeclare(r.goal);
    shot = null;
    A.feedback.hidden = true;
    A.hint.textContent = `${intel(r)} ${r.assist === 0 ? 'The plateau and its corners are drawn.' : r.assist === 1 ? 'The plateau shows for a moment after a probe, and a probe costs a charge.' : 'Boss round: no plateau, no probe.'}`;
  };

  A.scene((g, t) => {
    if (A.phase === 'between') return;
    const r = rounds[cur()];
    const run = A.phase === 'resolve' ? shot : null;
    const rt = run ? A.rt : 0;
    const z = run ? run.z : values.z;
    backdrop(g);
    line(g, X(0), Y(0), X(BOX), Y(0), PAL.dim, 1.5);
    line(g, X(0), Y(0), X(0), Y(BOX), PAL.dim, 1.5);
    for (let i = 0; i <= BOX; i += 2) {
      line(g, X(i), Y(0), X(i), Y(BOX), PAL.grid, 1);
      line(g, X(0), Y(i), X(BOX), Y(i), PAL.grid, 1);
      text(g, String(i), X(i), Y(0) + 13, PAL.dim, 9);
      if (i > 0) text(g, String(i), X(0) - 10, Y(i) + 3, PAL.dim, 9);
    }
    // The plateau is the helper: live in round 1, a moment after a paid probe in round 2, never in round 3; only a win reveals it after a drive.
    const k = cur();
    const helper = helperOn(r.assist, run !== null && run.ok, run ? Infinity : flash.since(A.clock, k));
    A.canvas.dataset.helper = helper ? '1' : '0';
    tint(g, k, t);
    if (helper) plateau(g, r, false, r.assist === 0 || (run !== null && run.ok));
    else text(g, 'the plateau is hidden: use the inequalities', X(6), Y(6), PAL.dim, 12);
    // The ruler line Z = z across the map box
    const ends = ruleEnds(r, z);
    const st = ruler(r, z);
    const color = run && rt > 1.0 ? (run.ok ? PAL.green : PAL.red) : PAL.cyan;
    if (ends.length >= 2) line(g, X(ends[0][0]), Y(ends[0][1]), X(ends[ends.length - 1][0]), Y(ends[ends.length - 1][1]), color, 3);
    text(g, `Z = ${num(z)}`, PANEL, 22, PAL.yellow, 14, 'left');
    text(g, `ore Z = ${zText(r)}`, PANEL, 44, PAL.green, 12, 'left');
    text(g, `want the ${r.goal === 'max' ? 'LARGEST' : 'SMALLEST'}`, PANEL, 62, PAL.green, 12, 'left');
    r.constraints.forEach((c, i) => text(g, c, PANEL, 88 + i * 16, PAL.dim, 11, 'left'));
    const below = 88 + r.constraints.length * 16 + 14;
    if (r.assist === 0 && !run) text(g, `ruler ${st}`, PANEL, below, st === 'touches' ? PAL.green : PAL.yellow, 12, 'left');
    if (n === 5) text(g, `claim: best at ${(run ? run.shape : shape) === 'edge' ? 'a whole edge' : 'one corner'}`, PANEL, below + 20, PAL.yellow, 11, 'left');

    // Rover: parks where the ruler meets the plateau, or stays put and holds up its declaration.
    let spot: Pt = START;
    let mood: Mood = 'happy';
    let driving = false;
    let lift = 0;
    let verdictAt = Infinity;
    if (run) {
      if (run.action === 'park') {
        const to = spotFor(r, z);
        const p = Math.min(1, rt / (PARK - 0.5));
        spot = [START[0] + (to[0] - START[0]) * p, START[1] + (to[1] - START[1]) * p];
        driving = rt < PARK - 0.5;
        mood = rt > PARK - 0.5 ? (run.ok ? 'cheer' : 'worried') : 'happy';
        verdictAt = PARK - 0.4;
      } else {
        verdictAt = DECLARE;
        const after = rt > DECLARE;
        mood = after ? (run.ok ? 'cheer' : 'worried') : 'happy';
        if (after && run.ok && run.action === 'nomax') {
          // The claim was right: the ground never ends, so the rover keeps driving off the map.
          const q = Math.min(1, (rt - DECLARE) / 1.2);
          spot = [START[0] + 15 * q, START[1] + 15 * q];
          driving = q < 1;
        }
        if (after && run.ok && run.action === 'empty') lift = 10 + Math.sin(t * 6) * 3;
      }
    }
    const rx = X(spot[0]);
    const ry = Y(spot[1]) - 6 - lift;
    rover(g, rx, ry, t, mood, driving);
    if (run && run.action !== 'park') {
      const after = rt > DECLARE;
      const c = !after ? PAL.yellow : run.ok ? PAL.green : PAL.red;
      g.fillStyle = 'rgba(6,10,36,0.9)';
      g.fillRect(rx + 12, ry - 60, 96, 20);
      g.strokeStyle = c;
      g.lineWidth = 2;
      g.strokeRect(rx + 12, ry - 60, 96, 20);
      text(g, run.action === 'nomax' ? (r.goal === 'max' ? 'NO MAXIMUM' : 'NO MINIMUM') : 'NO PLATEAU', rx + 60, ry - 46, c, 11);
      if (after && !run.ok) text(g, '✕', rx + 60, ry - 66, PAL.red, 20);
      if (after && run.ok && run.action === 'empty') text(g, 'nowhere to land', rx + 4, ry + 30, PAL.white, 11);
    }
    if (run && n === 5 && run.action === 'park' && rt > PARK - 0.5) text(g, run.shape === 'edge' ? 'WHOLE EDGE' : 'ONE CORNER', rx, ry - 50, PAL.yellow, 11);
    track(g, r.min, r.max);
    if (!run) {
      // the two handles of the one dial, and the player's own Z beside the knob
      const [mx, my] = mid(r, values.z);
      const hx = TRACK.x0 + ((values.z - r.min) / (r.max - r.min)) * (TRACK.x1 - TRACK.x0);
      grip(g, A.canvas, t, { x: X(mx), y: Y(my), r: 22, dir: 'both', read: '', side: 'right' });
      grip(g, A.canvas, t, { x: hx, y: TRACK.y, r: 20, dir: 'h', read: `Z = ${num(values.z)} ore`, side: hx > 450 ? 'left' : 'right' });
    }
    goalLine(g, n === 4 ? 'Goal: park at the best Z, or say none exists' : 'Goal: park at the best Z, then name its shape', A.t, run !== null, 14, 170);
    if (run && rt > verdictAt) {
      const bad = run.action !== 'park' ? 'CLAIM REJECTED' : n === 5 && run.z === r.ans ? 'RIGHT Z, WRONG SHAPE' : st === 'misses' ? 'NO GROUND THERE' : 'BETTER GROUND LEFT';
      verdict(g, run.ok, run.action === 'park' ? 'BEST GROUND FOUND' : 'CLAIM CONFIRMED', bad);
    }
  });
  A.mountAll();
  return A.run();
}
