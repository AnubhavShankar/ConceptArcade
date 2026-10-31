// Inspirations: pool and snooker (an off-centre hit of equal balls sends the two balls off at a right angle) and Golf Clash style aiming. Cue is a pool
// player with a visor. The object ball's path is fixed; the cue ball's path is (λ, k) and λ is the player's call. The meters read dot products and shadows.
import { PAL } from '@core/arcade';
import { helperOn, paidFlash } from '@core/aidflash';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, num, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { angle, buildRounds, cuePath, explain, intel, judge, measure, missText, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const T = { x0: 150, x1: 590, y0: 62, y1: 282 };
const C0 = { x: 370, y: 172 };
const S = 12;
const RUN = 1.9;

const HEROES = [
  { story: 'When a moving ball hits a ball at rest off-centre, and the two are equal, they leave at a right angle to each other. Two vectors are at a right angle exactly when their dot product is 0: (a, b)·(λ, k) = aλ + bk = 0.', objective: 'Set λ so the cue ball leaves at a right angle to the object ball, in three rounds. The preview and the right-angle mark show in round 1; a meter costs a charge.' },
  { story: 'The dot product a·b = a₁b₁ + a₂b₂ is a number: here it is the energy the cue ball passes to the object ball. Set the unknown part of the cue ball’s path so the dot product comes out as the number the table needs.', objective: 'Set λ so the dot product of the two paths is exactly the number wanted, in three rounds. The meter reading shows live in round 1; a meter costs a charge.' },
  { story: 'The shadow (projection) of a path r on a rail direction u is (r·u)/|u|. It is positive when r points along the rail and negative when it points back. Work out |u| first.', objective: 'Set λ so the shadow of the cue ball’s path on the rail is exactly the length wanted, in three rounds. The shadow shows live in round 1; the boss round has no meter.' },
];

/** Cue: a pool player in a visor and waistcoat, bridge hand on the felt, cue stick that strikes. */
function cue(g: G, x: number, y: number, t: number, mood: Mood, strike: number, aim: number) {
  g.fillStyle = '#2a2f66';
  g.fillRect(x - 12, y - 18, 24, 42);
  g.fillStyle = PAL.white;
  g.fillRect(x - 8, y - 14, 16, 16);
  g.fillStyle = '#e8c9a0';
  g.beginPath();
  g.arc(x, y - 30, 12, 0, Math.PI * 2);
  g.fill();
  face(g, x, y - 29, 9, mood, t, '#1b1030');
  g.fillStyle = PAL.green;
  g.fillRect(x - 15, y - 42, 30, 6);
  g.fillRect(x - 15, y - 42, 36, 3);
  // The cue stick pulls back and strikes
  const back = strike < 0.25 ? strike * 4 * 14 : Math.max(0, 14 - (strike - 0.25) * 4 * 28);
  g.save();
  g.translate(x + 10, y - 8);
  g.rotate(aim);
  g.fillStyle = '#d9a35b';
  g.fillRect(-4 - back, -2, 74, 4);
  g.fillStyle = PAL.cyan;
  g.fillRect(-4 - back + 70, -2, 5, 4);
  g.restore();
}

function ball(g: G, x: number, y: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, 8, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath();
  g.arc(x - 2.5, y - 2.5, 2.5, 0, Math.PI * 2);
  g.fill();
}

/** How far along a path (dx, dy) in screen pixels a ball can travel before the cushion. */
function room(x: number, y: number, dx: number, dy: number) {
  let s = 1;
  if (dx > 0) s = Math.min(s, (T.x1 - 10 - x) / dx);
  if (dx < 0) s = Math.min(s, (T.x0 + 10 - x) / dx);
  if (dy > 0) s = Math.min(s, (T.y1 - 10 - y) / dy);
  if (dy < 0) s = Math.min(s, (T.y0 + 10 - y) / dy);
  return Math.max(0, s);
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  /** The preview and the readings: live in round 1, for 1.5 s after a paid meter in round 2, never in the boss round. */
  const flash = paidFlash();
  return {
    hero: { name: 'Cue', role: 'a pool player in a visor who sends the cue ball off along a vector', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'l', aria: 'Cue ball path component λ', label: 'Rebound λ', unit: '', step: 1, min: (r: Round) => r.min, max: (r: Round) => r.max, start: (r: Round) => r.start, text: (v: number) => `λ = ${num(v)}` }],
    handles: [trackHandle<Round>('l', (r) => r.min, (r) => r.max)],
    test: {
      button: '📏 Meter',
      aria: 'Meter: read the shot for this λ',
      read: (r, v) => {
        flash.paid();
        return spotText(r, v.l);
      },
    },
    fire: { button: '🎱 Take the shot', aria: 'Take the shot' },
    judge: (r, v) => judge(r, v.l),
    miss: (r, v) => missText(r, v.l),
    win: (r) => `Clean break! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The preview is live.' : r.assist === 1 ? 'No preview: a meter shows it for a moment and costs a charge.' : 'Boss round: no preview, no meter.'}`,
    hit: () => [C0.x, C0.y],
    delay: RUN,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      backdrop(g);
      const since = flash.since(t, k);
      const l = shot ? shot.v.l : v.l;
      // The table
      g.fillStyle = '#3a2a1a';
      g.fillRect(T.x0 - 10, T.y0 - 10, T.x1 - T.x0 + 20, T.y1 - T.y0 + 20);
      g.fillStyle = '#146b3a';
      g.fillRect(T.x0, T.y0, T.x1 - T.x0, T.y1 - T.y0);
      g.fillStyle = '#05140c';
      for (const [px, py] of [[T.x0, T.y0], [(T.x0 + T.x1) / 2, T.y0 - 2], [T.x1, T.y0], [T.x0, T.y1], [(T.x0 + T.x1) / 2, T.y1 + 2], [T.x1, T.y1]]) {
        g.beginPath();
        g.arc(px, py, 11, 0, Math.PI * 2);
        g.fill();
      }
      const c = cuePath(r, l);
      const o = r.o;
      const od: [number, number] = [o[0] * S, -o[1] * S];
      const cd: [number, number] = [c[0] * S, -c[1] * S];
      if (r.kind === 'proj') {
        // The rail direction as a ruler along the table's bottom
        const ux = r.u[0] * S * 0.8;
        const uy = -r.u[1] * S * 0.8;
        line(g, T.x0 + 40, T.y1 - 20, T.x0 + 40 + ux, T.y1 - 20 + uy, PAL.pink, 3);
        text(g, `rail (${num(r.u[0])}, ${num(r.u[1])})`, T.x0 + 40 + ux / 2, T.y1 - 26 + uy / 2, PAL.pink, 10);
      }
      // The preview is the helper: before Fire only, and only while helperOn says so (the player's own setting; a shot never redraws it).
      const helper = !shot && helperOn(r.assist, false, since);
      A.canvas.dataset.helper = helper ? '1' : '0';
      const p = shot ? Math.max(0, Math.min(1, (rt - 0.45) / (RUN - 0.6))) : 0;
      const hit = shot ? rt > 0.45 : false;
      // The paths (object ball always, the cue ball preview while aiming)
      if (r.kind !== 'proj') line(g, C0.x, C0.y, C0.x + od[0], C0.y + od[1], PAL.cyan, 2, [5, 4]);
      if (helper) {
        g.globalAlpha = 0.9;
        line(g, C0.x, C0.y, C0.x + cd[0], C0.y + cd[1], PAL.yellow, 2.5, [5, 4]);
        g.globalAlpha = 1;
        if (r.kind === 'perp' && Math.abs(angle(r, l) - 90) < 1e-6) text(g, '⊾ 90°', C0.x + 18, C0.y - 12, PAL.green, 12);
        text(g, r.kind === 'proj' ? `shadow ${num(Math.round(measure(r, l) * 10) / 10)}` : r.kind === 'dot' ? `dot ${num(measure(r, l))}` : `angle ${num(Math.round(angle(r, l) * 10) / 10)}°`, 480, 40, PAL.yellow, 12);
      }
      // The balls
      const sc = room(C0.x, C0.y, cd[0], cd[1]);
      const so = room(C0.x, C0.y, od[0], od[1]);
      const cueFrom: [number, number] = [C0.x - 70, C0.y + 30];
      if (r.kind === 'proj' ? false : true) ball(g, C0.x + (hit ? od[0] * so * p : 0), C0.y + (hit ? od[1] * so * p : 0), PAL.pink);
      const approach = shot ? Math.min(1, rt / 0.45) : 0;
      if (hit) ball(g, C0.x + cd[0] * sc * p, C0.y + cd[1] * sc * p, PAL.white);
      else ball(g, cueFrom[0] + (C0.x - cueFrom[0]) * approach, cueFrom[1] + (C0.y - cueFrom[1]) * approach, PAL.white);
      if (r.kind === 'proj' && !hit) ball(g, C0.x, C0.y, PAL.pink);
      text(g, 'cue ball', cueFrom[0] - 4, cueFrom[1] + 22, PAL.dim, 9);
      const mood: Mood = shot ? (rt > RUN ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      cue(g, 60, 248, t, mood, shot ? Math.min(0.6, rt) : 0, -0.45);
      track(g, r.min, r.max);
      if (shot && rt > RUN) verdict(g, shot.ok, 'CLEAN BREAK', 'SCRATCH');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(3, ctx.level)), ctx.random) as never, 'A pool player at a table with an object ball and a cue ball, where the cue ball’s rebound path is set by a number.');
  },
});
