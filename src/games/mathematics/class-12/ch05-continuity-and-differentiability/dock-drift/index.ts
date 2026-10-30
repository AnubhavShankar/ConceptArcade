// Inspirations (code comment only): Sonic grind rails (ride a rail, fly off along it), Kerbal Space Program docking (no gravity: momentum carries you straight
// on), and Portal momentum puzzles. The player drags the docking clamp up or down the station wall, then releases Orbit; it drifts in a straight line along
// the rail's tangent. The art is in art.ts. The rail drawn on screen is a fixed decoration, never the graph of f.
// A miss shows only "above" or "below": the robot hits the hull 2 m past the clamp on the side it really passes (missEnd), never at the true height.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type SceneInput } from '@core/dialgame';
import { line, text } from '@core/neon';
import { CLAMP_X, LASER_DASH, REL, WALL, clampRing, clampY, hull, orbit, rail, ruler, sign, station, vega, type OrbitMood, type VegaMood } from './art';
import { DIAL, DOCK, buildRounds, heightText, hintText, judge, missEnd, missText, pingText, winText, type Round } from './logic';

const ARIA = 'A maintenance robot on a curved space-station rail, about to drift across to a docking clamp on the hull wall that the player slides up or down.';
const ROLE = 'a maintenance robot that rides the rails of a space station and must drift into its docking clamp';
const HEROES = [
  {
    story: 'Orbit slides along a rail shaped like y = f(x), lets go at the release point and, with no gravity and no fuel, drifts straight on along the rail’s tangent. Over the d metres to the wall it rises d·f′(x₀). The rails here are products and quotients of factors, so take logs to differentiate.',
    objective: 'Set the docking clamp at the height where Orbit reaches the wall, in three rounds.',
  },
  {
    story: 'These rails are power towers like x^x, where both the base and the power change. Neither the power rule nor the exponential rule applies: take logs first.',
    objective: 'Catch Orbit in the clamp on every power-tower rail, in three rounds.',
  },
  {
    story: 'These rails are square roots of quotients. Taking logs turns the root into a factor of one half.',
    objective: 'Catch Orbit in the clamp on every root rail, in three rounds.',
  },
  {
    story: 'These rails are sums of power towers. The log of a sum does not split, so differentiate each term on its own and add.',
    objective: 'Catch Orbit in the clamp on every sum rail, in three rounds.',
  },
  {
    story: 'These rails follow inverse trigonometric functions. A substitution such as x = tan θ often turns them into a simple multiple of tan⁻¹ x or sin⁻¹ x first.',
    objective: 'Catch Orbit in the clamp on every inverse-trig rail, in three rounds.',
  },
];

const S = 0.85; // Orbit is drawn a little smaller than its 30 × 26 body so that it fits the clamp ring
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const keep = (y: number) => Math.max(60, Math.min(300, y));

function level(n: 1 | 2 | 3 | 4 | 5, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  let pingPending = false;
  let pingAt = -10;
  let pingH = 0;
  let lastK = -1;
  let lastH = 0;
  let lastOk = false;
  const fx = { shot: null as unknown, clack: false, verdict: false };

  function drawScene(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    if (k !== lastK) {
      lastK = k;
      pingPending = false;
      pingAt = -10;
    }
    if (pingPending && !shot) {
      pingPending = false;
      pingAt = t;
      pingH = s.v.h;
    }
    if (shot && fx.shot !== shot) Object.assign(fx, { shot, clack: false, verdict: false });
    const h = s.v.h;
    const ok = !!shot && shot.ok;
    const endH = ok ? h : shot ? missEnd(r, h) : h;
    const endY = clampY(endH);
    const docked = !!shot && rt >= DOCK;
    // a data attribute for the tests: where the robot's line ends on the hull, in metres from the release height (only while a shot plays)
    if (shot) A.canvas.dataset.driftEnd = String(endH);
    else delete A.canvas.dataset.driftEnd;

    station(g, t);
    hull(g, t, ok && docked ? 'green' : 'amber');
    ruler(g);
    sign(g, 'RAIL', r.text, `release at x = ${r.x0Text} · wall ${r.d} m away`);
    rail(g);

    // helper: the guide laser, round 1 only (it points at the answer, so it must never be drawn in rounds 2 and 3, and it is hidden while a shot plays)
    if (r.assist === 0 && !shot) {
      const ly = clampY(r.ans);
      line(g, REL.x, REL.y, CLAMP_X, ly, PAL.pink, 2, LASER_DASH);
      for (let i = 0; i < 4; i++) {
        const u = (t * 0.45 + i / 4) % 1;
        const cx = REL.x + (CLAMP_X - REL.x) * u;
        const cy = REL.y + (ly - REL.y) * u;
        const a = Math.atan2(ly - REL.y, CLAMP_X - REL.x);
        g.fillStyle = PAL.pink;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
        g.lineTo(cx + Math.cos(a + 2.5) * 5, cy + Math.sin(a + 2.5) * 5);
        g.lineTo(cx + Math.cos(a - 2.5) * 5, cy + Math.sin(a - 2.5) * 5);
        g.fill();
      }
      text(g, 'GUIDE LASER', (REL.x + CLAMP_X) / 2, (REL.y + ly) / 2 - 9, PAL.pink, 9);
    }

    // Orbit
    let rx = REL.x;
    let ry = REL.y;
    let rot = Math.sin(t * 2) * ((2 * Math.PI) / 180);
    let hang = true;
    let mood: OrbitMood = 'wait';
    let claw = 0;
    let flash = 0;
    let wave = false;
    if (shot) {
      hang = false;
      rot = 0;
      mood = 'drift';
      if (rt < 0.2) {
        claw = clamp01(rt / 0.2);
        flash = 1 - clamp01(rt / 0.2);
      } else {
        claw = 1;
        const u = clamp01((rt - 0.2) / (DOCK - 0.2));
        rx = REL.x + (CLAMP_X - REL.x) * u;
        ry = REL.y + (endY - REL.y) * u;
        // the motion trail: five fading ghost outlines
        if (rt < DOCK) {
          for (let i = 5; i >= 1; i--) {
            const ug = u - 0.04 * i;
            if (ug <= 0) continue;
            orbit(g, REL.x + (CLAMP_X - REL.x) * ug, REL.y + (endY - REL.y) * ug, { t, mood, claw, scale: S, outline: true, alpha: 0.4 * (1 - i / 6) });
          }
        }
      }
      if (docked) {
        const d = rt - DOCK;
        if (ok) {
          mood = 'dock';
          wave = d > 0.25;
        } else {
          const tm = clamp01(d / (2.3 - DOCK));
          const e = ease(tm);
          rx = CLAMP_X - 120 * e;
          ry = Math.max(24, Math.min(330, endY - 34 * Math.sin(Math.PI * tm) + 20 * tm));
          rot = 4 * Math.PI * e;
          mood = d < 0.4 ? 'bonk' : 'dizzy';
        }
      }
    } else {
      ry = REL.y + Math.sin(t * 3) * 0.6;
    }
    orbit(g, rx, ry, { t, mood, claw, flash, rot, hang, scale: S, wave });

    // the pings: a ring from Orbit and an arrow on the clamp (direction only), for a short time after the charge is spent
    const dp = t - pingAt;
    if (!shot && dp >= 0 && dp < 1.8) {
      if (dp < 1.2) {
        for (const delay of [0, 0.25]) {
          const q = (dp - delay) / 0.95;
          if (q < 0 || q > 1) continue;
          g.globalAlpha = 1 - q;
          g.strokeStyle = PAL.cyan;
          g.lineWidth = 2;
          g.beginPath();
          g.arc(REL.x, REL.y, 10 + 90 * q, 0, Math.PI * 2);
          g.stroke();
          g.globalAlpha = 1;
        }
        text(g, 'PING', REL.x, REL.y - 40, PAL.cyan, 10);
      }
      const py = clampY(pingH);
      if (pingH === r.ans) text(g, '◎', CLAMP_X - 30, py + 5, PAL.green, 16);
      else if (pingH < r.ans) {
        line(g, CLAMP_X, py - 18, CLAMP_X, py - 30, PAL.pink, 2);
        text(g, '▲', CLAMP_X, py - 30, PAL.pink, 14);
      } else {
        line(g, CLAMP_X, py + 18, CLAMP_X, py + 28, PAL.pink, 2);
        text(g, '▼', CLAMP_X, py + 40, PAL.pink, 14);
      }
    }

    // the clamp (the player's object) with its readout; the claws close on a catch and the ring flashes red once on a miss
    const cy = clampY(h);
    const tone = shot && docked ? (ok ? 'win' : rt - DOCK < 0.5 ? 'miss' : 'idle') : 'idle';
    clampRing(g, CLAMP_X, cy, t, ok && docked ? ease((rt - DOCK) / 0.25) : 0, tone);
    g.fillStyle = 'rgba(8,12,40,0.85)';
    g.fillRect(432, cy - 9, 40, 18);
    text(g, `${heightText(h)} m`, 452, cy + 4, PAL.yellow, 11);

    // Commander Vega in the airlock window
    let vm: VegaMood = 'idle';
    if (shot && docked) vm = ok ? 'cheer' : 'miss';
    vega(g, t, vm, -1 + 0.3 * Math.sin(t * 0.8));

    // one-time effects
    if (shot && rt >= 0.05 && !fx.clack) {
      fx.clack = true;
      A.float('CLACK', REL.x, REL.y - 34, PAL.white);
      A.burst(REL.x + 6, REL.y + 2, '#dfe4f7', 6, 40);
    }
    if (shot && docked && !fx.verdict) {
      fx.verdict = true;
      if (ok) A.float('DOCKED!', CLAMP_X - 70, keep(endY - 28), PAL.green);
      else {
        A.float('THUNK', CLAMP_X - 60, keep(endY - 24), PAL.yellow);
        A.burst(CLAMP_X + 6, endY, PAL.yellow, 16, 150);
      }
    }
  }

  return {
    hero: { name: 'Orbit', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'h', aria: 'Clamp height on the wall, in metres above the release point', label: 'Clamp height', unit: 'm', step: 1, min: DIAL.min, max: DIAL.max, start: (r) => r.start, text: heightText }],
    handles: [{ dial: 'h', at: (_r, v) => [CLAMP_X, clampY(v.h)], drag: (_r, _px, py) => (REL.y - py) / WALL.unit, radius: 18 }],
    test: {
      button: '📡 Ping',
      aria: 'Sensor ping: will Orbit pass above or below the clamp?',
      read: (r, v) => {
        pingPending = true;
        return pingText(r, v.h);
      },
    },
    fire: { button: '🚀 Release', aria: 'Release Orbit from the rail' },
    judge: (r, v) => {
      lastH = v.h; // the verdict's burst appears at the player's own clamp on a catch, and at a fixed point on a miss, never at the winning height
      lastOk = judge(r, v.h);
      return lastOk;
    },
    miss: (r, v) => missText(r, v.h),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => (lastOk ? [CLAMP_X, keep(clampY(lastH))] : [CLAMP_X, REL.y]),
    delay: DOCK,
    draw: (s) => drawScene(s),
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
