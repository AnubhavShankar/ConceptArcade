// "Pebble in Orbit" (Section 5.2.3, 5.2.4; Examples 5.1(b), 5.2). Inspirations (code comment only): real CubeSat magnetorquers (student satellites steer with magnet rods and coils against
// Earth's field), real magnetic detumbling, and the docking games of space simulators (line up, ease in, hold). Level 3 borrows the golf power-meter loop: one kick, coast to rest on the spot.
// Core verb: steer a satellite by its magnet: set the rod's strength (levels 1 and 3), rotate the satellite to a heading (level 2), set the coil current and the station-keeping thruster
// (level 4), place the twin satellite at a port and turn it (level 5); then command the burn and watch Pebble turn, hold, tip or drift.
// Never leak the answer: every miss effect is a fixed size (FIXED), never proportional to the error; the telemetry box is the only helper (live in round 1, for 1.5 s after a paid check
// in round 2, never in round 3); the level 5 hatches look the same until the take; the win-only insets (τ = mB sin θ, U = −mB cos θ, W = ΔU, the forces, Pebble's field lines) come
// only on a win; `hit` is a fixed point; every take ends by 2.3 s. The art is in art.ts, the poses in take.ts.
import { PAL } from '@core/arcade';
import { helperOn, paidFlash } from '@core/aidflash';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { text } from '@core/neon';
import {
  FADER, GRIT, HIT, KNOB_R, PEB, PLATE4, PORT_D, THR, TLM, compass, compassAt, dele, dipoleLines, eclipse, fieldArrows, fieldBend, faderStrip, goalLine, handleRing, hatch, iX, inset,
  knobAt, mX, pebble, portAt, puffs, ring, slotBox, speck, star, starAt, station, tag, tether, thrusterSwitch, burnAngle, GRIT_WINGS, space, type InsetKind,
} from './art';
import {
  ARROW, DIAL, TLM_OFF, buildRounds, checkText, fieldDeg, goalText, hintText, judge, missText, outcomeOf, startHeading, starDeg, tlmText, verdictAt, winText,
  type Round, type Values,
} from './logic';
import { floaters, takeAt } from './take';

const ARIA = 'Low Earth orbit: a shoebox-sized student satellite floats above the planet in Earth’s magnetic field, a mission-control window at the top left, and its twin satellite waits to dock.';
const ROLE = 'a shoebox-sized student satellite that steers with a magnet rod against Earth’s magnetic field';
const HEROES = [
  {
    story: 'Pebble has just been thrown out of the rocket and is tumbling. It has no fuel: it steers with a magnet rod whose moment m it can set. In Earth’s field the rod feels a torque τ = mB sin θ, largest at right angles to the field and zero along it. One short burn at a known angle must give exactly the torque that stops the spin.',
    objective: 'Set the rod’s moment so the burn stops the spin dead, in three passes.',
  },
  {
    story: 'Night is coming: in Earth’s shadow Pebble switches everything off, and only the field holds it. The torque is zero along the field and against it, but the energy U = −mB cos θ is lowest along it (stable) and highest against it (unstable). The moment points from the rod’s S end to its N end. Some passes need a heading that rides out a bump, others one that flips on command.',
    objective: 'Turn Pebble to the heading the plan needs, so it holds or flips as planned, in three passes.',
  },
  {
    story: 'To turn without fuel Pebble kicks its reaction wheel once and coasts. Turning from along the field takes energy: mB to reach 90° and 2mB to reach 180°, the rise in U. The kick’s energy is fixed, so Pebble sets its rod’s strength to come to rest exactly on the guide star. At 90° the field still pulls back with a torque; at 180° the torque is zero.',
    objective: 'Set the rod’s moment so Pebble coasts to rest on the guide star, in three passes.',
  },
  {
    story: 'Pebble’s second steering tool is a flat coil, a magnet with m = NIA, its area in cm² (1 cm² = 10⁻⁴ m²). In a uniform field the forces on the coil cancel: a torque, but no net force. Near the space station’s big docking magnet the field is far from uniform, and the coil is pulled too, so Pebble must fire its station-keeping thruster to stay in its slot.',
    objective: 'Set the coil current and the thruster so Pebble turns onto the guide star and keeps its slot, in three passes.',
  },
  {
    story: 'Pebble’s twin, Grit, docks beside it, two small magnets together. On Pebble’s axis (the nose port) Pebble’s field is 2k and points the same way as Pebble; on the line through its middle (the side port) it is k and points the opposite way. Grit has U = −m·B: torque-free along or against that field, stable along it.',
    objective: 'Dock Grit at the right port, pointing the right way, for each docking plan, in three passes.',
  },
];

const PEEK_SECONDS = 1.5;
const FIRE_ARIA = 'Command the burn: send the command to Pebble';
const INSET_KIND: InsetKind[] = ['tau', 'well', 'work', 'forces', 'lines'];
const mod = (x: number, n: number) => ((x % n) + n) % n;
const one = (x: number) => String(Math.round(x * 10) / 10);
type DockRound = Extract<Round, { kind: 'dock' }>;

function level(n: 1 | 2 | 3 | 4 | 5, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const dragAt: Record<string, number> = {};
  const dragged = new Set<string>();
  let now = 0;
  const fx = { shot: null as unknown, done: new Set<string>() };
  /** Every drag remembers the clock (for the 0.15 s highlight) and clears the first-time cue. */
  const touch = (key: string) => {
    dragAt[key] = now;
    dragged.add(key);
  };
  const hot = (key: string) => now - (dragAt[key] ?? -10) < 0.15;
  const primary = ['m', 'h', 'm', 'i', 'port'][n - 1];

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    const v = s.v as Values;
    now = t;
    if (fx.shot !== shot) {
      fx.shot = shot;
      fx.done.clear();
    }
    const once = (key: string, fn: () => void) => {
      if (!fx.done.has(key)) {
        fx.done.add(key);
        fn();
      }
    };
    const since = flash.since(t, k);
    const live = r.assist === 0 || (!shot && helperOn(r.assist, false, since) && since < PEEK_SECONDS);
    A.canvas.dataset.tlm = live ? '1' : '0';
    const out = shot ? outcomeOf(r, shot.v as Values) : null;
    if (out) A.canvas.dataset.take = out;
    else delete A.canvas.dataset.take;
    const fv = shot ? (shot.v as Values) : v;
    const T = takeAt(r, k, fv, shot ? rt : -1, t, shot ? t - rt : 0);
    const P = T.pebble;
    const f = fieldDeg(r, k);

    // the floaters and one-off effects of the take
    if (shot && out) {
      floaters(r, out, shot.v as Values).forEach((fl, i) => {
        if (rt >= fl.at) once(`f${i}`, () => A.float(fl.text, fl.x, fl.y, fl.color));
      });
      if (out === 'pulled' && rt >= 0.9) {
        once('spark', () => {
          A.burst(418, 170, PAL.orange, 10, 100);
          if (!reduce) A.shake(4);
        });
      }
      if (r.kind === 'dock' && out === 'closed' && rt >= 0.9) {
        const [px, py] = portAt(r.pDir, fv.port!);
        once('clang', () => A.burst(px, py, PAL.orange, 10, 100));
      }
    }

    // ---- the frame ----
    space(g, t, k, reduce);
    if (n <= 3 || (r.kind === 'coil' && r.uniform)) fieldArrows(g, f, t);
    if (r.kind === 'coil' && !r.uniform) {
      fieldBend(g, t);
      station(g, t);
    }
    if (r.kind === 'spin') burnAngle(g, f, startHeading(r, k, fv), r.th);
    if (r.kind === 'swing' || r.kind === 'coil') {
      const [sx, sy] = starAt(starDeg(r, k));
      star(g, sx, sy, t, T.gold);
    }
    if (r.kind === 'coil') slotBox(g);
    if (r.kind === 'park') compass(g, fv.h!);
    if (r.kind === 'dock') {
      const sel = fv.port!;
      for (const port of [0, 1]) {
        const [px, py] = portAt(r.pDir, port);
        hatch(g, px, py, port === sel ? T.iris : 0, port === sel && T.shut, !shot && port === sel);
      }
    }
    eclipse(g, T.darken);

    // Pebble, Grit and the effects around them
    pebble(g, { x: P.x, y: P.y, deg: P.deg, rod: n === 4 ? 'coil' : 'rod', nOpposite: r.kind === 'park' && r.rod === 180, glow: P.glow, folded: n === 5, mood: P.mood, flap: P.flap, alpha: P.alpha, look: P.look, wink: P.wink, t });
    if (T.puffs >= 0) {
      if (r.kind === 'park') for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) puffs(g, P.x + sx * 30, P.y + sy * 30, sx, sy, T.puffs, 1);
      else if (r.kind === 'coil') {
        if (r.uniform) puffs(g, P.x, P.y + 34, 0, 1, T.puffs);
        else puffs(g, P.x - 34, P.y, -1, 0, T.puffs);
      }
    }
    if (T.kick >= 0) ring(g, P.x, P.y, T.kick, 44);
    if (r.kind === 'park') {
      if (T.speck >= 0) speck(g, 640, 60, P.x, P.y, T.speck);
      if (T.cmd >= 0) ring(g, P.x, P.y, T.cmd, 60);
    }
    if (r.kind === 'dock' && T.grit) {
      const G = T.grit;
      pebble(g, { x: G.x, y: G.y, deg: G.deg, scale: 0.8, wings: GRIT_WINGS, rod: 'rod', folded: true, mood: G.mood, alpha: G.alpha, wink: G.wink, t: t + 1.3 });
      if (shot && rt < 0.9 && rt >= 0) puffs(g, G.x + 14, G.y, 1, 0, (rt * 3) % 1, 2);
      if (T.speck >= 0) speck(g, 640, 60, G.x, G.y, T.speck);
      if (T.cmd >= 0) ring(g, G.x, G.y, T.cmd, 40);
      if (T.tether >= 0) {
        const [px, py] = portAt(r.pDir, fv.port!);
        const ox = (px - PEB.x) / PORT_D;
        const oy = (py - PEB.y) / PORT_D;
        tether(g, G.x, G.y, G.x + ox * (14 + 40 * T.tether), G.y + oy * (14 + 40 * T.tether));
      }
    }
    dele(g, t, T.dele, shot ? Math.max(0, rt - T.tv) : 0);

    // the win-only teaching pictures
    if (T.inset > 0) {
      if (r.kind === 'dock') dipoleLines(g, PEB.x, PEB.y, r.pDir * 90, T.inset);
      inset(g, INSET_KIND[n - 1], r, T.inset);
    }

    // ---- the controls, the given facts and the player's own setting ----
    if (n === 1 || n === 3 || n === 4) faderStrip(g, n === 4 ? 'i' : 'm');
    if (n <= 3) {
      const b = (r as Extract<Round, { b: number }>).b;
      tag(g, `B ${b} µT`, 560, 296, PAL.cyan, 12);
    }
    if (r.kind === 'park') tag(g, `m ${one(r.m)} J/T`, 560, 316, PAL.white, 12);
    if (r.kind === 'coil') tag(g, `${r.n} turns · ${r.a} cm²`, PLATE4.x, PLATE4.y, PAL.white, 12);
    if (n === 4) thrusterSwitch(g, fv.thr!);
    if (n === 5) {
      // Grit's turn ring
      g.beginPath();
      g.arc(GRIT.x, GRIT.y, KNOB_R, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(244,246,255,0.3)';
      g.lineWidth = 1.5;
      g.stroke();
    }

    if (!shot) {
      const cue = k === 0 && !dragged.has(primary) ? t : -1;
      const showCue = (x: number, y: number) => {
        if (cue >= 0) text(g, 'drag', x - 38, y + 4 + 2 * Math.sin(t * 4), PAL.yellow, 11);
      };
      if (n === 1 || n === 3) {
        const x = mX(v.m!);
        handleRing(g, x, FADER.y, '⇔', hot('m'), primary === 'm' ? cue : -1);
        tag(g, `${one(v.m!)} J/T`, Math.max(150, Math.min(470, x)), 284, PAL.yellow, 13);
        showCue(x, FADER.y);
      } else if (n === 2) {
        const [hx, hy] = compassAt(v.h!);
        handleRing(g, hx, hy, '↻', hot('h'), cue);
        const right = hx >= PEB.x;
        tag(g, `${v.h}°`, right ? hx + 28 : hx - 28, hy + 5, PAL.yellow, 13, right ? 'left' : 'right');
        showCue(hx, hy);
      } else if (n === 4) {
        const x = iX(v.i!);
        handleRing(g, x, FADER.y, '⇔', hot('i'), cue);
        tag(g, `${v.i} mA`, Math.max(150, Math.min(470, x)), 284, PAL.yellow, 13);
        handleRing(g, v.thr ? THR.x1 : THR.x0, THR.y, '⇔', hot('thr'), -1);
        text(g, `THRUSTER ${v.thr ? 'ON' : 'OFF'}`, 566, 278, PAL.white, 11);
        showCue(x, FADER.y);
      } else {
        const dr = r as DockRound;
        const [px, py] = portAt(dr.pDir, v.port!);
        handleRing(g, px, py, '⇔', hot('port'), cue);
        const right = px >= 380;
        tag(g, `${v.port ? 'side' : 'nose'} port`, right ? px + 30 : px - 30, py + 4, PAL.yellow, 12, right ? 'left' : 'right');
        const [qx, qy] = knobAt(v.q!);
        handleRing(g, qx, qy, '↻', hot('q'), -1);
        tag(g, `points ${ARROW[v.q!]}`, GRIT.x, 302, PAL.yellow, 12);
        showCue(px, py);
      }
    }

    // the telemetry box, the only helper: live in round 1, for 1.5 s after a paid check in round 2, never in round 3
    g.fillStyle = '#04070f';
    g.fillRect(TLM.x, TLM.y, TLM.w, TLM.h);
    g.strokeStyle = '#4a5280';
    g.lineWidth = 1;
    g.strokeRect(TLM.x, TLM.y, TLM.w, TLM.h);
    text(g, live ? tlmText(r, fv) : TLM_OFF, TLM.x + TLM.w / 2, TLM.y + 14, r.assist === 0 ? PAL.green : PAL.yellow, 12);

    if (!shot) goalLine(g, goalText(r));
  }

  const wrap = (key: string, fn: HandleSpec<Round>['drag']): HandleSpec<Round>['drag'] => (r, px, py, v) => {
    touch(key);
    return fn(r, px, py, v);
  };
  const dials: DialSpec<Round>[] = [];
  const handles: HandleSpec<Round>[] = [];
  const mDial: DialSpec<Round> = { key: 'm', aria: 'Magnet rod moment in joules per tesla', label: 'Rod moment', unit: 'J/T', step: DIAL.m.step, min: DIAL.m.min, max: DIAL.m.max, start: DIAL.m.start };
  const mHandle: HandleSpec<Round> = { dial: 'm', at: (_r, v) => [mX(v.m), FADER.y], drag: wrap('m', (_r, px) => 0.2 + ((px - FADER.x0) / (FADER.x1 - FADER.x0)) * 3.8), radius: 20 };
  if (n === 1 || n === 3) {
    dials.push(mDial);
    handles.push(mHandle);
  } else if (n === 2) {
    dials.push({ key: 'h', aria: 'Pebble’s heading in degrees, the direction its camera faces', label: 'Heading', unit: '', step: DIAL.h.step, min: DIAL.h.min, max: DIAL.h.max, start: DIAL.h.start, text: (x) => `${x}°` });
    handles.push({
      dial: 'h',
      at: (_r, v) => compassAt(v.h),
      drag: wrap('h', (_r, px, py) => mod(Math.round(((Math.atan2(PEB.y - py, px - PEB.x) * 180) / Math.PI) / 15) * 15, 360)),
      radius: 20,
    });
  } else if (n === 4) {
    dials.push(
      { key: 'i', aria: 'Coil current in milliamperes', label: 'Coil current', unit: 'mA', step: DIAL.i.step, min: DIAL.i.min, max: DIAL.i.max, start: DIAL.i.start },
      { key: 'thr', aria: 'Station-keeping thruster: 0 off, 1 on', label: 'Thruster', unit: '', step: 1, min: DIAL.thr.min, max: DIAL.thr.max, start: DIAL.thr.start, text: (x) => (x ? 'ON' : 'OFF') },
    );
    handles.push(
      { dial: 'i', at: (_r, v) => [iX(v.i), FADER.y], drag: wrap('i', (_r, px) => 20 + ((px - FADER.x0) / (FADER.x1 - FADER.x0)) * 580), radius: 20 },
      { dial: 'thr', at: (_r, v) => [v.thr ? THR.x1 : THR.x0, THR.y], drag: wrap('thr', (_r, px) => (px > (THR.x0 + THR.x1) / 2 ? 1 : 0)), radius: 20 },
    );
  } else {
    dials.push(
      { key: 'port', aria: 'Docking port: 0 the nose port, 1 the side port', label: 'Port', unit: '', step: 1, min: DIAL.port.min, max: DIAL.port.max, start: DIAL.port.start, text: (x) => (x ? 'side port' : 'nose port') },
      { key: 'q', aria: 'Which way Grit points: 0 right, 1 up, 2 left, 3 down', label: 'Grit points', unit: '', step: 1, min: DIAL.q.min, max: DIAL.q.max, start: (r) => ((r as DockRound).pDir + 1) % 4, text: (x) => ARROW[x] },
    );
    handles.push(
      {
        dial: 'port',
        at: (r, v) => portAt((r as DockRound).pDir, v.port),
        drag: wrap('port', (r, px, py) => {
          const d = (r as DockRound).pDir;
          const [nx, ny] = portAt(d, 0);
          const [sx, sy] = portAt(d, 1);
          return Math.hypot(px - nx, py - ny) <= Math.hypot(px - sx, py - sy) ? 0 : 1;
        }),
        radius: 20,
      },
      { dial: 'q', at: (_r, v) => knobAt(v.q), drag: wrap('q', (_r, px, py) => mod(Math.round(Math.atan2(GRIT.y - py, px - GRIT.x) / (Math.PI / 2)), 4)), radius: 20 },
    );
  }

  return {
    hero: { name: 'Pebble', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: {
      button: '📡 Check telemetry',
      aria: 'Check telemetry: read what this setting would do before the burn',
      read: (r, v) => {
        flash.paid();
        return checkText(r, v as Values);
      },
    },
    fire: { button: n === 5 ? '🛰 Dock Grit' : '🚀 Command the burn', aria: FIRE_ARIA },
    judge: (r, v) => judge(r, v as Values),
    miss: (r, v) => missText(r, v as Values),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => HIT,
    delay: (r, v) => verdictAt(r, v as Values),
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
