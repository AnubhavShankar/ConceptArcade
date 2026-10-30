// Inspirations: Tiny Wings and Alto's Adventure (ride a curve the ground decides) and surfing games. Surf is a kid on a hoverboard who rides one curve of the
// family of solutions of a differential equation. The wind arrows are the slope field, the constant C picks the curve, and the beacon must be on it.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, num, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { buildRounds, explain, intel, judge, missText, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 2.1;
const RIDE = 1.6;
const P = { x0: 60, x1: 580, top: 56, bottom: 270 };

const HEROES = [
  { story: 'The wind blows with slope dy/dx = g(x), so every ride is a curve y = G(x) + C that goes up and down the same way and differs only in height. Integrate to find G, then use the beacon to find the one C.', objective: 'Pick the constant C so the board rides through the beacon, in three rounds. The wind arrows and your curve show in round 1; a test ride costs a charge.' },
  { story: 'Here the wind depends on where the board is: the slope has x and y in it. Separate the variables, integrate both sides, and the general solution has one constant C. The one curve through the beacon fixes it.', objective: 'Pick the constant C so the board rides through the beacon, in three rounds. The wind arrows and your curve show in round 1; a test ride costs a charge.' },
  { story: 'The wind is (ax + ky)/x, which is homogeneous: every term has the same degree in x and y. Put y = vx and the variables separate. The family is y = C·xᵏ plus a straight-line part, and the beacon fixes C.', objective: 'Pick the constant C so the board rides through the beacon, in three rounds. The wind arrows and your curve show in round 1; a test ride costs a charge.' },
  { story: 'The equation is dy/dx + (m/x)y = Q: linear, with integrating factor xᵐ. Multiplying through makes the left side the derivative of xᵐ·y, so integrate once and put in the beacon to find C.', objective: 'Pick the constant C so the board rides through the beacon, in three rounds. The boss round shows no wind arrows and no curve until the ride.' },
];

/** Surf: a kid on a hoverboard, scarf flying, arms out for balance, tilting with the slope. */
function surf(g: G, x: number, y: number, ang: number, t: number, mood: Mood) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.fillStyle = PAL.cyan;
  g.beginPath();
  g.roundRect?.(-22, -2, 44, 6, 3);
  if (!g.roundRect) g.rect(-22, -2, 44, 6);
  g.fill();
  line(g, -12, -2, -10, -18, '#4a3a7a', 5);
  line(g, 10, -2, 8, -18, '#4a3a7a', 5);
  g.fillStyle = PAL.orange;
  g.fillRect(-10, -36, 22, 20);
  const sway = Math.sin(t * 4) * 3;
  line(g, -10, -30, -26, -34 + sway, '#e8c9a0', 4);
  line(g, 12, -30, 28, -36 - sway, '#e8c9a0', 4);
  g.fillStyle = '#e8c9a0';
  g.beginPath();
  g.arc(1, -46, 11, 0, Math.PI * 2);
  g.fill();
  face(g, 1, -46, 9, mood, t, '#1b1030');
  g.fillStyle = PAL.pink;
  g.beginPath();
  g.moveTo(-8, -38);
  g.quadraticCurveTo(-24, -40 + Math.sin(t * 7) * 4, -36, -34 + Math.sin(t * 7 + 1) * 5);
  g.lineTo(-30, -30);
  g.quadraticCurveTo(-20, -34, -8, -32);
  g.fill();
  g.restore();
}

function level(n: number, random: () => number): DialLevel<Round> {
  const hero = HEROES[n - 1];
  const rounds = buildRounds(n, random);
  const geo = rounds.map((r) => {
    const ys = Array.from({ length: 61 }, (_, i) => r.curve(r.xs + ((r.xe - r.xs) * i) / 60, r.ans)).filter((y) => Number.isFinite(y));
    ys.push(r.yb);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const pad = (y1 - y0) * 0.3 + 1;
    return { y0: y0 - pad, y1: y1 + pad };
  });
  return {
    hero: { name: 'Surf', role: 'a kid on a hoverboard who rides one curve of a differential equation through the beacon', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'c', aria: 'Constant C of the curve', label: 'Constant C', unit: '', step: 1, min: (r: Round) => r.cmin, max: (r: Round) => r.cmax, start: (r: Round) => r.start, text: (v: number) => `C = ${num(v)}` }],
    handles: [trackHandle<Round>('c', (r) => r.cmin, (r) => r.cmax)],
    test: { button: '🌊 Test ride', aria: 'Test ride: read the height at the beacon for this C', read: (r, v) => spotText(r, v.c) },
    fire: { button: '🏄 Ride the curve', aria: 'Ride the curve' },
    judge: (r, v) => judge(r, v.c),
    miss: (r, v) => missText(r, v.c),
    win: (r) => `Through the beacon! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The wind and your curve are live.' : r.assist === 1 ? 'The curve is dim: a test ride costs a charge.' : 'Boss round: no wind arrows, no curve.'}`,
    hit: (r) => {
      const { y0, y1 } = geo[rounds.indexOf(r)] ?? geo[0];
      return [P.x0 + ((r.xb - r.xs) / (r.xe - r.xs)) * (P.x1 - P.x0), P.bottom - ((r.yb - y0) / (y1 - y0)) * (P.bottom - P.top)];
    },
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot }) => {
      backdrop(g);
      const { y0, y1 } = geo[rounds.indexOf(r)] ?? geo[0];
      const X = (x: number) => P.x0 + ((x - r.xs) / (r.xe - r.xs)) * (P.x1 - P.x0);
      const Y = (y: number) => P.bottom - ((y - y0) / (y1 - y0)) * (P.bottom - P.top);
      const c = shot ? shot.v.c : v.c;
      // Waves under the board
      for (let i = 0; i < 3; i++) {
        g.strokeStyle = `rgba(80,200,255,${0.12 + i * 0.05})`;
        g.lineWidth = 2;
        g.beginPath();
        for (let x = 0; x <= 640; x += 8) g.lineTo(x, 296 + i * 12 + Math.sin(x / 40 + t * (1.5 + i * 0.4)) * 4);
        g.stroke();
      }
      // The wind: the slope field
      if (r.assist <= 1) {
        g.globalAlpha = r.assist === 1 ? 0.3 : 0.75;
        for (let i = 0; i <= 8; i++) {
          for (let j = 0; j <= 5; j++) {
            const x = r.xs + ((r.xe - r.xs) * (i + 0.3)) / 8.6;
            const y = y0 + ((y1 - y0) * (j + 0.4)) / 5.8;
            const s = r.slope(x, y);
            if (!Number.isFinite(s)) continue;
            const dx = (P.x1 - P.x0) / (r.xe - r.xs);
            const dy = (P.bottom - P.top) / (y1 - y0);
            const len = Math.hypot(dx, s * dy);
            const ux = (dx / len) * 10;
            const uy = ((-s * dy) / len) * 10;
            line(g, X(x) - ux, Y(y) - uy, X(x) + ux, Y(y) + uy, PAL.dim, 1.5);
            line(g, X(x) + ux, Y(y) + uy, X(x) + ux * 0.4 - uy * 0.35, Y(y) + uy * 0.4 + ux * 0.35, PAL.dim, 1.5);
          }
        }
        g.globalAlpha = 1;
      }
      // The beacon
      const bx = X(r.xb);
      const by = Y(r.yb);
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      g.strokeStyle = PAL.yellow;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(bx, by, 11 + pulse * 3, 0, Math.PI * 2);
      g.stroke();
      text(g, `(${r.xb}, ${num(r.yb)})`, bx, by - 20, PAL.yellow, 11);
      // The curve of the chosen C
      const showCurve = r.assist <= 1 || shot !== null;
      const pts: [number, number][] = [];
      for (let i = 0; i <= 160; i++) {
        const x = r.xs + ((r.xe - r.xs) * i) / 160;
        const y = r.curve(x, c);
        if (Number.isFinite(y) && y > y0 - (y1 - y0) && y < y1 + (y1 - y0)) pts.push([x, y]);
      }
      if (showCurve) {
        g.globalAlpha = r.assist === 1 && !shot ? 0.3 : 1;
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 3;
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
        g.stroke();
        g.globalAlpha = 1;
      }
      // The board
      let sx = X(r.xs);
      let sy = pts.length ? Y(pts[0][1]) : (P.top + P.bottom) / 2;
      let ang = 0;
      if (shot) {
        const p = Math.min(1, rt / RIDE);
        const cap = pts.length ? Math.min(pts.length - 1, Math.floor(p * 160)) : 0;
        if (pts.length) {
          [sx, sy] = [X(pts[cap][0]), Y(pts[cap][1])];
          const a = pts[Math.max(0, cap - 3)];
          const b = pts[Math.min(pts.length - 1, cap + 3)];
          ang = Math.atan2(Y(b[1]) - Y(a[1]), X(b[0]) - X(a[0]));
        }
        for (let i = 1; i < 6; i++) {
          g.fillStyle = `rgba(80,200,255,${0.4 - i * 0.06})`;
          g.fillRect(sx - 22 - i * 7, sy + 2 + Math.sin(t * 9 + i) * 2, 4, 3);
        }
      } else if (pts.length > 3) ang = Math.atan2(Y(pts[3][1]) - Y(pts[0][1]), X(pts[3][0]) - X(pts[0][0]));
      const bob = shot ? 0 : Math.sin(t * 3) * 2;
      const mood: Mood = shot ? (rt > RIDE ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      surf(g, sx, sy - 4 + bob, Math.max(-0.9, Math.min(0.9, ang)), t, mood);
      track(g, r.cmin, r.cmax);
      if (shot && rt > VERDICT - 0.3) verdict(g, shot.ok, 'THROUGH THE BEACON', 'MISSED THE BEACON');
    },
  };
}

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(4, ctx.level)), ctx.random) as never, 'A kid on a hoverboard riding one curve of a family of solutions over wind arrows, to pass through a beacon.');
  },
});
