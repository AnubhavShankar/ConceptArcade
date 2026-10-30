// Inspirations: Battleship (tap a square on a grid) and Lunar Lander (send a craft where you worked out it must go). Dash is a courier drone with four rotors.
// The player taps the vector plane, or drags the arrow tip, to send Dash a vector; the left map shows where the flight really leads.
import { PAL, createArcade } from '@core/arcade';
import { defineGame } from '@core/define';
import { backdrop, face, num, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { RANGE, buildRounds, explain, intel, isTriangle, judge, missOffset, missText, spotText, type Pt, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const U = 10;
const MAP = { cx: 170, cy: 185 };
const PLANE = { cx: 470, cy: 185 };
const FLY = 1.4;

const HEROES = [
  { story: 'A vector is a movement. The vector from a point D to a point E is E − D: subtract the coordinates of the start from those of the end. Dash must be sent exactly that far in exactly that direction.', objective: 'Tap the vector that carries Dash from the drone to the pad, in three rounds. The coordinates are on the map; a test flight costs a charge.' },
  { story: 'A thrust has a size and a direction. The unit vector along d is d/|d|, with |d| = √(x² + y²). Multiply the unit vector by the size wanted and you have the thrust. The direction is shown as a longer multiple, so find |d| first.', objective: 'Tap the end of the thrust vector that has the size wanted along the direction given, in three rounds. A guide line and live size show in round 1; a test flight costs a charge.' },
  { story: 'The relay R divides the leg PQ in the ratio m : n. Internally, R = (n·P + m·Q)/(m + n). Externally, R lies on the line PQ outside the leg, and R = (m·Q − n·P)/(m − n). Tap the relay point on the plane.', objective: 'Tap the relay point that divides PQ in the ratio given, in three rounds. The boss round divides externally. A live ratio shows in round 1; a test flight costs a charge.' },
  { story: 'A crosswind blows over the city. Dash’s path over the ground is its own vector plus the wind, tip to tail. To reach the target, Dash must aim at target − wind.', objective: 'Send Dash the vector that lands on the target despite the wind, in three rounds.' },
];

/** Dash: a courier drone with four spinning rotors, a camera eye, a parcel and a shadow. */
function dash(g: G, x: number, y: number, t: number, mood: Mood, tilt: number) {
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(x, y + 22, 14, 3.5, 0, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  for (const sx of [-1, 1]) {
    line(g, sx * 8, -4, sx * 17, -9, PAL.dim, 2);
    g.fillStyle = 'rgba(77,225,255,0.55)';
    g.beginPath();
    g.ellipse(sx * 17, -10, 8 + Math.abs(Math.sin(t * 30 + sx)) * 3, 2.2, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = PAL.cyan;
  g.beginPath();
  g.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
  g.fill();
  face(g, 0, -1, 6, mood, t, '#0a1030');
  g.fillStyle = PAL.orange;
  g.fillRect(-6, 9, 12, 8);
  line(g, -4, 7, -4, 9, PAL.dim, 1.5);
  line(g, 4, 7, 4, 9, PAL.dim, 1.5);
  g.restore();
}

const pt = (p: Pt) => `(${num(p[0])}, ${num(p[1])})`;
const sz = (p: Pt) => Math.round(Math.hypot(p[0], p[1]) * 10) / 10;

// Level 4 map: its own scale (MU px per unit, not the plane's U) and no numbered grid, so the answer cannot be measured against the plane.
const MU = 8;
const at = (p: Pt): [number, number] => [MAP.cx + p[0] * MU, MAP.cy - p[1] * MU];
function arrow(g: G, a: [number, number], b: [number, number], color: string, w: number, dash: number[] = []) {
  line(g, a[0], a[1], b[0], b[1], color, w, dash);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(b[0], b[1]);
  g.lineTo(b[0] - 8 * Math.cos(ang - 0.45), b[1] - 8 * Math.sin(ang - 0.45));
  g.lineTo(b[0] - 8 * Math.cos(ang + 0.45), b[1] - 8 * Math.sin(ang + 0.45));
  g.fill();
}

/** The wind: streaks that blow along the wind vector across the map, and a windsock that points downwind. */
function wind(g: G, t: number, w: Pt) {
  const m = Math.hypot(w[0], w[1]) || 1;
  const ux = w[0] / m;
  const uy = -w[1] / m;
  for (let i = 0; i < 9; i++) {
    const along = ((t * 22 + i * 27) % 180) - 90;
    const perp = ((i * 41) % 150) - 75;
    const x = MAP.cx + ux * along - uy * perp;
    const y = MAP.cy + uy * along + ux * perp;
    line(g, x, y, x + ux * 16, y + uy * 16, 'rgba(170,225,255,0.35)', 1.5);
  }
  const px = MAP.cx - 78;
  const py = MAP.cy + 96;
  line(g, px, py, px, py - 30, PAL.dim, 3);
  for (let k = 0; k < 4; k++) {
    const flutter = Math.sin(t * 6 + k) * 1.6;
    const x0 = px + ux * k * 7 - uy * flutter;
    const y0 = py - 30 + uy * k * 7 + ux * flutter;
    line(g, x0, y0, x0 + ux * 7, y0 + uy * 7, k % 2 ? PAL.white : PAL.orange, 8 - k * 1.6);
  }
  text(g, `wind ${pt(w)}`, px + 22, py + 12, PAL.cyan, 10);
}

/** Level 4 map: wind, the target pad, the legs, the live or test ghost, and the flight. The triangle that solves it is drawn only after a win; a miss ends at a fixed 1.5 units from the target. */
function crosswind(g: G, t: number, r: Round, fired: Pt | null, rt: number, probe: Pt | null, now: Pt, mood: Mood) {
  const legs = r.kind === 'legs';
  const target: Pt = legs ? [r.D[0] + r.E[0], r.D[1] + r.E[1]] : r.E;
  const won = fired !== null && judge(r, fired);
  g.strokeStyle = PAL.dim;
  g.lineWidth = 1.5;
  g.strokeRect(MAP.cx - 100, MAP.cy - 110, 200, 220);
  if (!legs) wind(g, t, r.D);
  const [tx, ty] = at(target);
  g.strokeStyle = PAL.green;
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(tx, ty, 7 + Math.sin(t * 4) * 1.5, 0, Math.PI * 2);
  g.stroke();
  text(g, legs ? 'target' : `target ${pt(r.E)}`, tx, ty - 12, PAL.green, 10);
  if (legs) {
    arrow(g, at([0, 0]), at(r.D), PAL.cyan, 2.5);
    arrow(g, at(r.D), at(target), PAL.pink, 2.5);
    text(g, pt(r.D), at([r.D[0] / 2, r.D[1] / 2])[0] - 4, at([r.D[0] / 2, r.D[1] / 2])[1] + 16, PAL.cyan, 10);
    text(g, pt(r.E), at([r.D[0] + r.E[0] / 2, r.D[1] + r.E[1] / 2])[0] + 4, at([r.D[0] + r.E[0] / 2, r.D[1] + r.E[1] / 2])[1] - 8, PAL.pink, 10);
  }
  if (fired === null && legs && r.assist === 0) arrow(g, at([0, 0]), at(now), PAL.yellow, 2, [4, 4]);
  if (fired === null && !legs && probe !== null) {
    const f = r.kind === 'wind2' ? 2 : 1;
    g.globalAlpha = 0.6;
    arrow(g, at([0, 0]), at([f * (probe[0] + r.D[0]), f * (probe[1] + r.D[1])]), PAL.yellow, 2, [4, 4]);
    g.globalAlpha = 1;
  }
  const start = at([0, 0]);
  let [dx, dy] = start;
  let tilt = legs ? 0 : Math.max(-0.3, Math.min(0.3, r.D[0] * 0.04));
  if (fired !== null) {
    const p = Math.min(1, rt / FLY);
    const off: Pt = won ? [0, 0] : missOffset(r, fired);
    const [ex, ey] = at([target[0] + off[0], target[1] + off[1]]);
    dx += (ex - dx) * p;
    dy += (ey - dy) * p;
    tilt = Math.max(-0.4, Math.min(0.4, (ex - start[0]) / 200)) * (p < 1 ? 1 : 0);
    line(g, start[0], start[1], dx, dy, PAL.yellow, 2, [3, 4]);
    if (p >= 1) {
      g.strokeStyle = won ? PAL.green : PAL.red;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(ex, ey, 11, 0, Math.PI * 2);
      g.stroke();
    }
    if (won && rt > FLY) {
      // The triangle law, shown only now: own vector, then the wind, and the ground track from the start to the end.
      const own = at(r.ans);
      arrow(g, start, own, PAL.yellow, 3);
      if (legs) text(g, 'sum', (start[0] + tx) / 2 - 14, (start[1] + ty) / 2, PAL.green, 10);
      else {
        const tip = at([r.ans[0] + r.D[0], r.ans[1] + r.D[1]]);
        arrow(g, own, tip, PAL.cyan, 3);
        arrow(g, start, tip, PAL.green, 2, [5, 4]);
        text(g, 'own', (start[0] + own[0]) / 2 - 14, (start[1] + own[1]) / 2 + 12, PAL.yellow, 10);
        text(g, r.kind === 'wind2' ? 'wind, ground track per minute' : 'wind, ground track', (own[0] + tip[0]) / 2, Math.min(own[1], tip[1]) - 8, PAL.cyan, 10);
      }
    }
  } else dy += Math.sin(t * 3) * 2;
  dash(g, dx, dy - 6, t, mood, tilt);
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(4, ctx.level));
    const hero = HEROES[n - 1];
    const rounds = buildRounds(n, ctx.random);
    const v: Pt = [0, 0];
    let fired: Pt | null = null;
    let probe: Pt | null = null;
    const A = createArcade(
      ctx,
      { name: 'Dash', role: 'a courier drone with four rotors who flies exactly the vector the player sends', story: hero.story, objective: hero.objective },
      {
        W: 640,
        H: 340,
        aria: 'A courier drone above a map, and a vector plane that the player taps to send the drone a vector or to place a relay point.',
        rounds: 3,
        charges: [1, 1, 0],
        onRound: (k) => {
          fired = null;
          probe = null;
          sliders[0].set(0);
          sliders[1].set(0);
          A.feedback.hidden = true;
          const r = rounds[k];
          A.hint.textContent = `${intel(r)} ${r.assist === 0 ? 'The guide is live.' : r.assist === 1 ? 'The guide is dim: a test flight costs a charge.' : 'Boss round: no guide.'}`;
        },
      },
    );
    const sliders = ['x', 'y'].map((k, i) => A.slider({ aria: `${k} coordinate of the vector plane`, label: k === 'x' ? 'East x' : 'North y', min: -RANGE, max: RANGE, step: 1, value: 0, unit: '', text: (val) => `${k} = ${num(val)}`, onInput: (val) => (v[i] = val) }));
    A.controls.append(...sliders.map((s) => s.row));
    const cur = () => rounds[Math.min(A.round, 2)];
    const toPlane = (p: Pt): [number, number] => [PLANE.cx + p[0] * U, PLANE.cy - p[1] * U];
    A.handle({
      x: () => toPlane(v)[0],
      y: () => toPlane(v)[1],
      r: 12,
      drag: (px, py) => {
        sliders[0].set(Math.round((px - PLANE.cx) / U));
        sliders[1].set(Math.round((PLANE.cy - py) / U));
      },
    });
    // A tap anywhere on the plane places the tip, and sliding on from there keeps moving it.
    let tapping = false;
    const place = (e: MouseEvent) => {
      const rect = A.canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) * 640) / rect.width;
      const py = ((e.clientY - rect.top) * 340) / rect.height;
      sliders[0].set(Math.max(-RANGE, Math.min(RANGE, Math.round((px - PLANE.cx) / U))));
      sliders[1].set(Math.max(-RANGE, Math.min(RANGE, Math.round((PLANE.cy - py) / U))));
      return { px, py };
    };
    A.canvas.addEventListener('pointerdown', (e) => {
      if (A.phase !== 'play') return;
      const rect = A.canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) * 640) / rect.width;
      const py = ((e.clientY - rect.top) * 340) / rect.height;
      if (Math.abs(px - PLANE.cx) <= (RANGE + 0.5) * U && Math.abs(py - PLANE.cy) <= (RANGE + 0.5) * U) {
        tapping = true;
        place(e);
      }
    });
    A.canvas.addEventListener('pointermove', (e) => {
      if (tapping && A.phase === 'play') place(e);
    });
    const stop = () => (tapping = false);
    A.canvas.addEventListener('pointerup', stop);
    A.canvas.addEventListener('pointercancel', stop);
    A.controls.append(
      A.button('🛰️ Test flight', 'Test flight: see where this vector leads', () => {
        if (!A.spend()) return;
        probe = [v[0], v[1]];
        A.say(spotText(cur(), [v[0], v[1]]), true);
      }, 'secondary'),
      A.button('🚁 Dispatch the drone', 'Dispatch the drone', () => {
        const r = cur();
        const tap: Pt = [v[0], v[1]];
        const ok = judge(r, tap);
        fired = tap;
        probe = null;
        A.resolve(ok, ok ? `Delivered! ${explain(r)}` : missText(r, tap), { x: MAP.cx, y: MAP.cy }, FLY + 0.2);
      }),
    );
    const grid = (g: G, c: { cx: number; cy: number }) => {
      for (let i = -RANGE; i <= RANGE; i += 2) {
        line(g, c.cx + i * U, c.cy - RANGE * U, c.cx + i * U, c.cy + RANGE * U, PAL.grid, 1);
        line(g, c.cx - RANGE * U, c.cy + i * U, c.cx + RANGE * U, c.cy + i * U, PAL.grid, 1);
      }
      g.strokeStyle = PAL.dim;
      g.lineWidth = 1.5;
      g.strokeRect(c.cx - RANGE * U, c.cy - RANGE * U, 2 * RANGE * U, 2 * RANGE * U);
      line(g, c.cx - RANGE * U, c.cy, c.cx + RANGE * U, c.cy, PAL.dim, 1);
      line(g, c.cx, c.cy - RANGE * U, c.cx, c.cy + RANGE * U, PAL.dim, 1);
      for (let i = -10; i <= 10; i += 5) if (i !== 0) {
        text(g, String(i), c.cx + i * U, c.cy + 12, PAL.dim, 9);
        text(g, String(i), c.cx - 10, c.cy - i * U + 3, PAL.dim, 9);
      }
    };
    A.scene((g, t) => {
      if (A.phase === 'between') return;
      if (A.phase === 'play' && fired !== null) fired = null;
      const r = cur();
      const use: Pt = fired ?? [v[0], v[1]];
      const mp = (p: Pt): [number, number] => [MAP.cx + p[0] * U, MAP.cy - p[1] * U];
      backdrop(g);
      if (!isTriangle(r.kind)) grid(g, MAP);
      grid(g, PLANE);
      text(g, 'map', MAP.cx, 52, PAL.dim, 11);
      text(g, 'vector plane (tap or drag)', PLANE.cx, 52, PAL.dim, 11);
      const live = r.assist === 0;
      const dim = r.assist === 1;
      // Where the drone starts and where the flight ends
      const start: Pt = r.kind === 'mag' ? [0, 0] : r.D;
      // After a miss on level 1 the flight ends a fixed 1.5 units from the pad on the side of the error, never at the true landing point.
      const gap: Pt = r.kind === 'join' && fired !== null && !judge(r, fired) ? missOffset(r, fired) : [0, 0];
      const end: Pt = r.kind === 'join' ? (gap[0] || gap[1] ? [r.E[0] + gap[0], r.E[1] + gap[1]] : [r.D[0] + use[0], r.D[1] + use[1]]) : use;
      const mood: Mood = fired === null ? 'happy' : A.rt > FLY ? (judge(r, fired) ? 'cheer' : 'worried') : 'happy';
      if (r.kind === 'join') {
        const [ex, ey] = mp(r.E);
        g.strokeStyle = PAL.green;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(ex, ey, 7 + Math.sin(t * 4) * 1.5, 0, Math.PI * 2);
        g.stroke();
        text(g, `pad ${pt(r.E)}`, ex, ey - 12, PAL.green, 10);
        text(g, `drone ${pt(r.D)}`, mp(r.D)[0], mp(r.D)[1] + 30, PAL.cyan, 10);
        if (live || dim) {
          g.globalAlpha = dim ? 0.3 : 0.7;
          line(g, ...mp(r.D), ...mp(r.E), PAL.dim, 1.5, [4, 4]);
          g.globalAlpha = 1;
        }
      } else if (r.kind === 'section') {
        for (const [p, name] of [[r.D, 'P'], [r.E, 'Q']] as [Pt, string][]) {
          for (const c of [mp, toPlane]) {
            const [x, y] = c(p);
            g.fillStyle = PAL.pink;
            g.beginPath();
            g.arc(x, y, 5, 0, Math.PI * 2);
            g.fill();
            text(g, `${name}${pt(p)}`, x, y - 10, PAL.pink, 10);
          }
        }
        line(g, ...mp(r.D), ...mp(r.E), PAL.dim, 1.5, [4, 4]);
        line(g, ...toPlane(r.D), ...toPlane(r.E), PAL.dim, 1, [4, 4]);
      } else if (r.kind === 'mag' && (live || dim)) {
        g.globalAlpha = dim ? 0.3 : 0.7;
        const f = RANGE / Math.max(Math.abs(r.d[0]), Math.abs(r.d[1]));
        line(g, PLANE.cx, PLANE.cy, PLANE.cx + r.d[0] * f * U, PLANE.cy - r.d[1] * f * U, PAL.dim, 1.5, [4, 4]);
        g.globalAlpha = 1;
      }
      // The arrow on the vector plane and the live readouts
      const [tx, ty] = toPlane(use);
      if (r.kind !== 'section') {
        line(g, PLANE.cx, PLANE.cy, tx, ty, PAL.yellow, 3);
        g.fillStyle = PAL.yellow;
        g.beginPath();
        g.arc(tx, ty, 5, 0, Math.PI * 2);
        g.fill();
      } else {
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(tx, ty, 7, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = dim ? 0.3 : 1;
      if (live || dim) {
        const msg = r.kind === 'mag' ? `size ${sz(use)}` : r.kind === 'section' ? `R ${pt(use)}` : `vector ${pt(use)}`;
        text(g, msg, PLANE.cx, 328, PAL.yellow, 12);
      } else text(g, 'guide off', PLANE.cx, 328, PAL.dim, 12);
      g.globalAlpha = 1;
      text(g, r.kind === 'mag' ? `thrust ${num(Math.round(r.M * 10) / 10)} along (${r.d[0]}, ${r.d[1]})` : r.kind === 'section' ? `${r.m} : ${r.n} ${r.external ? 'externally' : 'internally'}` : r.kind === 'legs' ? `legs ${pt(r.D)} then ${pt(r.E)}` : r.kind === 'wind' ? `wind ${pt(r.D)}, target ${pt(r.E)}, 1 min` : r.kind === 'wind2' ? `wind ${pt(r.D)}, target ${pt(r.E)}, 2 min` : `from ${pt(r.D)} to ${pt(r.E)}`, MAP.cx, 328, PAL.green, isTriangle(r.kind) ? 11 : 12);
      // The flight
      if (isTriangle(r.kind)) {
        crosswind(g, t, r, fired, A.rt, probe, [v[0], v[1]], mood);
      } else {
        let [dx, dy] = mp(start);
        let tilt = 0;
        if (fired !== null) {
          const p = Math.min(1, A.rt / FLY);
          const [ex, ey] = mp(end);
          dx += (ex - dx) * p;
          dy += (ey - dy) * p;
          tilt = Math.max(-0.4, Math.min(0.4, (ex - mp(start)[0]) / 200)) * (p < 1 ? 1 : 0);
          line(g, ...mp(start), dx, dy, PAL.yellow, 2, [3, 4]);
          if (p >= 1) {
            g.strokeStyle = judge(r, fired) ? PAL.green : PAL.red;
            g.lineWidth = 3;
            g.beginPath();
            g.arc(ex, ey, 11, 0, Math.PI * 2);
            g.stroke();
          }
        } else dy += Math.sin(t * 3) * 2;
        dash(g, dx, dy - 6, t, mood, tilt);
      }
      if (fired !== null && A.rt > FLY + 0.1) verdict(g, judge(r, fired), 'DELIVERED', 'WRONG DROP');
    });
    A.mountAll();
    return A.run();
  },
});
