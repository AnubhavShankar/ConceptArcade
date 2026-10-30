// Inspirations: Cities: Skylines water works and the stop-the-meter timing of fishing games. Dewey is a dam keeper in a hard hat; the rate of flow is a
// curve f, and the volume that reaches the tank is the definite integral of f from the opening to the shutting of the gate. The flow runs live: the
// player works out the moment, then shuts the gate on time. A charge buys slow motion.
import { PAL, createArcade } from '@core/arcade';
import { defineGame } from '@core/define';
import { backdrop, face, num, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { SPEED, buildRounds, explain, intel, missText, onTime } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const P = { x0: 150, x1: 430, top: 72, bottom: 250 };
const TANK = { x0: 478, x1: 566, top: 72, bottom: 250 };

const HEROES = [
  { story: 'Water runs into the tank at a rate f(t) that changes with time. The volume that arrives between two moments is the area under the rate curve, which is the definite integral: find an antiderivative F and take F(b) − F(0). If the tank already holds some water, add it.', objective: 'Open the gate, then shut it at the moment the tank holds exactly what the town needs, in three rounds. The gauge shows in round 1; a charge buys slow motion.' },
  { story: 'This time the rate dips below zero for a while: water drains back out. The definite integral counts that part as negative, so it gives the net volume, not the total that flowed. Take F(b) − F(0) and let the sign do the work.', objective: 'Open the gate, then shut it when the net volume in the tank is the volume needed, in three rounds. The gauge shows in round 1; a charge buys slow motion.' },
  { story: 'The rate is 2(n + 1)·t·(t² + c)ⁿ. Putting u = t² + c gives u′ = 2t, so the integral becomes a power of u. The volume is the new antiderivative at b minus its value at 0.', objective: 'Open the gate, then shut it so the tank holds exactly the volume needed, in three rounds. The gauge shows in round 1; a charge buys slow motion.' },
  { story: 'The canal runs from −h to h around the sluice. The profile f has even terms (x², x⁴) and odd terms (x, x³). Over equal distances either side the odd terms give areas that cancel exactly, so only the even terms count, doubled.', objective: 'Open the gate and shut it at the half-width where the canal holds exactly the volume needed, in three rounds. The gauge shows in round 1; the boss round has no gauge.' },
];

/** Dewey: a stocky dam keeper robot with a hard hat, a lantern and a sluice wheel he turns. */
function dewey(g: G, x: number, y: number, t: number, mood: Mood, turn: number) {
  const bob = Math.sin(t * 2.5) * 1.5;
  const yy = y + bob;
  g.fillStyle = '#4a3a7a';
  g.fillRect(x - 14, yy - 4, 11, 34);
  g.fillRect(x + 3, yy - 4, 11, 34);
  g.fillStyle = PAL.orange;
  g.fillRect(x - 20, yy - 44, 40, 44);
  g.fillStyle = PAL.yellow;
  g.fillRect(x - 20, yy - 30, 40, 6);
  g.fillStyle = '#e8c9a0';
  g.beginPath();
  g.arc(x, yy - 58, 15, 0, Math.PI * 2);
  g.fill();
  face(g, x, yy - 58, 11, mood, t, '#1b1030');
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.arc(x, yy - 62, 17, Math.PI, 2 * Math.PI);
  g.fill();
  g.fillRect(x - 20, yy - 63, 40, 4);
  // The sluice wheel, turned by the clock
  const wx = x + 46;
  const wy = yy - 20;
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(wx, wy, 16, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 4; i++) {
    const a = turn * 0.6 + (i * Math.PI) / 2;
    line(g, wx, wy, wx + Math.cos(a) * 16, wy + Math.sin(a) * 16, PAL.cyan, 2);
  }
  line(g, x + 18, yy - 30, wx - 12, wy + 6, '#e8c9a0', 5);
  // The lantern swings
  const sw = Math.sin(t * 2) * 0.2;
  line(g, x - 20, yy - 36, x - 30 + sw * 20, yy - 18, PAL.dim, 2);
  g.fillStyle = mood === 'worried' ? PAL.red : PAL.yellow;
  g.beginPath();
  g.arc(x - 30 + sw * 20, yy - 14, 5, 0, Math.PI * 2);
  g.fill();
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(4, ctx.level));
    const hero = HEROES[n - 1];
    const rounds = buildRounds(n, ctx.random);
    const geo = rounds.map((r) => {
      const lo = r.sym ? -r.max : 0;
      const ys = Array.from({ length: 121 }, (_, i) => r.f(lo + ((r.max - lo) * i) / 120));
      const y0 = Math.min(0, ...ys);
      const y1 = Math.max(0, ...ys);
      return { lo, y0, y1: y1 === y0 ? y0 + 1 : y1, cap: 1.25 * r.V };
    });
    let running = false;
    let slow = false;
    let tNow = 0;
    let shut: number | null = null;
    let lastT: number | null = null;
    const A = createArcade(
      ctx,
      { name: 'Dewey', role: 'a dam keeper who shuts the gate at the moment the tank holds exactly what the town needs', story: hero.story, objective: hero.objective },
      {
        W: 640,
        H: 340,
        aria: 'A dam keeper beside a rate-of-flow graph and a water tank, with a gate that is opened and shut by the player.',
        rounds: 3,
        charges: [1, 1, 0],
        onRound: (k) => {
          running = false;
          slow = false;
          tNow = 0;
          shut = null;
          A.feedback.hidden = true;
          const r = rounds[k];
          A.hint.textContent = `${intel(r)} ${r.assist === 0 ? 'The gauge is live.' : r.assist === 1 ? 'The gauge is dim.' : 'Boss round: no gauge.'} Space opens and shuts the gate.`;
        },
      },
    );
    const cur = () => rounds[Math.min(A.round, 2)];
    function open() {
      if (running || shut !== null) return;
      running = true;
      A.sound('grab');
    }
    function shutNow() {
      if (!running) {
        A.freeNote('The gate is not open yet.');
        return;
      }
      running = false;
      shut = tNow;
      const r = cur();
      const ok = onTime(r, tNow);
      A.resolve(ok, ok ? `Gate shut, tank full! ${explain(r)}` : missText(r, tNow), { x: (TANK.x0 + TANK.x1) / 2, y: TANK.top + 30 }, 0.6);
    }
    A.controls.append(
      A.button('🚰 Open the gate', 'Open the gate', open),
      A.button('✋ Shut the gate', 'Shut the gate', shutNow),
      A.button('🐢 Slow motion', 'Slow motion: run this round at half speed', () => {
        if (slow) {
          A.freeNote('Slow motion is already on.');
          return;
        }
        if (!A.spend()) return;
        slow = true;
        A.say('Slow motion: the flow runs at half speed for the rest of this round.', true);
      }, 'secondary'),
    );
    A.canvas.tabIndex = 0;
    A.canvas.addEventListener('keydown', (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      if (A.phase !== 'play') return;
      if (running) shutNow();
      else open();
    });
    A.scene((g, t) => {
      const dt = lastT === null ? 0 : Math.min(0.1, t - lastT);
      lastT = t;
      if (A.phase === 'between') return;
      const r = cur();
      // After a miss the same round plays again with the gate closed.
      if (A.phase === 'play' && shut !== null) {
        shut = null;
        tNow = 0;
        running = false;
      }
      if (A.phase === 'play' && running) {
        tNow = Math.min(r.max, tNow + dt * SPEED * (slow ? 0.5 : 1));
        if (tNow >= r.max) shutNow();
      }
      backdrop(g);
      const { lo, y0, y1, cap } = geo[rounds.indexOf(r)] ?? geo[0];
      const X = (x: number) => P.x0 + ((x - lo) / (r.max - lo)) * (P.x1 - P.x0);
      const Y = (y: number) => P.bottom - ((y - y0) / (y1 - y0)) * (P.bottom - P.top);
      const ok = shut !== null ? onTime(r, shut) : null;
      const a = r.sym ? -tNow : 0;
      const z = Y(0);
      // The area swept so far, in thin strips: cyan where the rate is positive, red where it drains.
      const steps = 60;
      for (let i = 0; i < steps; i++) {
        const w = (X(tNow) - X(a)) / steps;
        if (w <= 0) continue;
        const x = a + ((tNow - a) * (i + 0.5)) / steps;
        const fy = Y(r.f(x));
        g.fillStyle = r.f(x) < 0 ? 'rgba(255,90,90,0.4)' : 'rgba(80,200,255,0.4)';
        g.fillRect(X(a) + i * w, Math.min(fy, z), w + 0.5, Math.abs(z - fy));
      }
      line(g, P.x0, z, P.x1, z, PAL.dim, 1.5);
      g.strokeStyle = PAL.cyan;
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i <= 120; i++) {
        const x = lo + ((r.max - lo) * i) / 120;
        if (i === 0) g.moveTo(X(x), Y(r.f(x)));
        else g.lineTo(X(x), Y(r.f(x)));
      }
      g.stroke();
      text(g, r.ftext, (P.x0 + P.x1) / 2, P.top - 14, PAL.cyan, 12);
      for (let i = 0; i <= r.max; i++) {
        for (const x of r.sym && i > 0 ? [i, -i] : [i]) {
          line(g, X(x), z - 3, X(x), z + 3, PAL.dim, 1);
          text(g, String(x), X(x), P.bottom + 12, PAL.dim, 9);
        }
      }
      line(g, X(tNow), P.top, X(tNow), P.bottom, PAL.yellow, 1.5, [4, 4]);
      if (r.sym) line(g, X(-tNow), P.top, X(-tNow), P.bottom, PAL.yellow, 1.5, [4, 4]);
      // The tank
      const vol = r.c0 + (r.sym ? r.F(tNow) - r.F(-tNow) : r.F(tNow) - r.F(0));
      const live = shut !== null || r.assist === 0;
      const dim = shut === null && r.assist === 1;
      const level01 = live || dim ? Math.max(0, Math.min(1.08, vol / cap)) : 0;
      g.strokeStyle = PAL.white;
      g.lineWidth = 2;
      g.strokeRect(TANK.x0, TANK.top, TANK.x1 - TANK.x0, TANK.bottom - TANK.top);
      const wy = Math.max(TANK.top - 10, TANK.bottom - level01 * (TANK.bottom - TANK.top));
      const flood = ok === false && vol > r.V;
      g.globalAlpha = dim ? 0.3 : 1;
      g.fillStyle = flood ? 'rgba(255,90,90,0.65)' : 'rgba(80,200,255,0.65)';
      g.fillRect(TANK.x0 + 1, wy, TANK.x1 - TANK.x0 - 2, TANK.bottom - wy);
      g.globalAlpha = 1;
      const my = TANK.bottom - (r.V / cap) * (TANK.bottom - TANK.top);
      line(g, TANK.x0 - 8, my, TANK.x1 + 8, my, PAL.green, 2.5);
      text(g, `need ${r.V}`, TANK.x0 - 10, my - 6, PAL.green, 11, 'right');
      if (r.c0 > 0) text(g, `starts at ${r.c0}`, (TANK.x0 + TANK.x1) / 2, TANK.bottom + 14, PAL.dim, 10);
      if (shut !== null && A.rt > 0.5) text(g, `holds ${num(Math.round(vol * 10) / 10)}`, (TANK.x0 + TANK.x1) / 2, TANK.top - 10, flood ? PAL.red : PAL.white, 12);
      if (flood && A.rt > 0.5) for (let i = 0; i < 6; i++) text(g, '💧', TANK.x0 + 8 + i * 14, TANK.top - 22 - ((t * 40 + i * 9) % 18), PAL.red, 11);
      if (!live && !dim) text(g, 'gauge off', (TANK.x0 + TANK.x1) / 2, (TANK.top + TANK.bottom) / 2, PAL.dim, 11);
      // The clock and Dewey
      text(g, `${r.sym ? 'h' : 't'} = ${tNow.toFixed(1)}${slow ? '  🐢' : ''}`, 62, 276, running ? PAL.yellow : PAL.dim, 14);
      const mood: Mood = ok === null ? 'happy' : A.rt > 0.5 ? (ok ? 'cheer' : 'worried') : 'happy';
      dewey(g, 62, 232, t, mood, tNow * 2);
      if (ok !== null && A.rt > 0.9) verdict(g, ok, 'GATE SHUT, TANK FULL', flood ? 'FLOOD IN THE VILLAGE' : 'DRY TAPS');
    });
    A.mountAll();
    return A.run();
  },
});
