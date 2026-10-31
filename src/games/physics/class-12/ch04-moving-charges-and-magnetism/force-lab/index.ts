// Inspirations (code comment only): pinball and marble-run games (bend a ball into the right lane with a flipper), the beam-steering puzzles of sci-fi lab games,
// and rhythm games for the cyclotron (the kick must land on the beat of every lap). The player is a night-shift medical physicist who checks a proton-therapy beam
// line: she sets the magnets and presses Power on, and the beam flies. The art is in art.ts.
// Never leak the answer: no beam path, spiral or helix is drawn before Power on; every miss takes a fixed form (never proportional to the player's setting);
// the beam monitor is the only helper (live in round 1, for 1.5 s after a monitor check in round 2, never in round 3); `hit` is a fixed point;
// every animation ends by 2.3 s.
import { helperOn, paidFlash } from '@core/aidflash';
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { along, glow, line, text } from '@core/neon';
import {
  BT, CYCL, HIT, KSWITCH, LSWITCH, PHIL, PIPE, ROD, SPOT, STOP_Y, TRK, TUBE, ROOM,
  beacon, bunch, circuit, clamp01, clock, cyclotron, desk, doorOf, ease, goalLine, handleGrip, hall, imani, inset, monitor, phil, pipeEntry, pipeToPhil, portBlock, psu, rPx,
  rodney, screenInset, stand, switchyard, tag, testMagnet, tube, type Pt, type RodMood,
} from './art';
import {
  DIAL, LCD_OFF, buildRounds, fault, goal, hintText, judge, lcdText, meterText, missText, verdictDelay, winText, type Fault, type Round, type Values,
} from './logic';

const ARIA = 'A hospital proton-therapy beam hall: a medical physicist at her control desk steers a beam with magnets toward a test phantom on a treatment couch.';
const ROLE = 'the night-shift medical physicist at a proton-therapy centre, who checks the beam before the first patient';
const HEROES = [
  {
    story: 'It is five in the morning at the proton-therapy centre, and the first patient comes at seven. Dr. Imani Osei checks the beam line with Phil, the hospital’s test phantom. A charge moving through a magnetic field feels a push F = qv × B, at right angles to both v and B, of size qvB; for a negative electron it is reversed. The push bends the beam but never speeds it up.',
    objective: 'Set the kicker’s field direction and strength so the beam turns into Phil’s room, in three runs.',
  },
  {
    story: 'Next, the test magnet. A copper rod hangs on two fine threads across its field. A wire carrying a current I feels F = BIl sin θ, with θ the angle between the wire and the field, in the direction of I l × B. When that push equals the rod’s weight mg, the threads go slack and the rod floats.',
    objective: 'Set the current’s direction and size so the test rod floats, in three tries.',
  },
  {
    story: 'Now the cyclotron. Its magnet bends protons into circles, because qvB = mv²/r gives r = mv/qB, and a radio-frequency (RF) kick speeds them up once every lap. A lap takes 2πm/qB at any speed, so the RF must beat at f = qB/2πm. Protons leave by the port when their circle reaches it, and their speed there decides how deep the dose goes in Phil.',
    objective: 'Set the magnet and the RF so the protons leave the port at the speed Phil’s plan needs, in three runs.',
  },
  {
    story: 'Today’s plan needs protons at a new speed, from the same magnet. r = mv/qB grows in proportion to the speed, so the extraction port has to move. Think about the lap time before you touch the RF.',
    objective: 'Move the port and set the RF for the new speed, in three runs.',
  },
  {
    story: 'Last check: the electron gun of the imaging tube. Electrons leave the gun at an angle to the field of a focusing coil. The part of the velocity across the field, v sin θ, makes them circle; the part along it, v cos θ, carries them forward one pitch, p = 2πm v cos θ/qB, every turn. After exactly one turn they are back on the axis: a sharp spot.',
    objective: 'Set the focusing field so the spot is sharp on the screen and no electron scrapes the tube, in three runs.',
  },
];

type Out = 'win' | Fault;
const SPARK = new Set<Fault>(['wrong', 'down', 'jump', 'slow', 'fast', 'scrape']);
const BAND = ['#4d8dff', PAL.green, PAL.yellow];
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
const quad = (a: Pt, c: Pt, e: Pt, u: number): Pt => [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * c[0] + u * u * e[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[1] + u * u * e[1]];

interface Moods { phil: 'idle' | 'win' | 'miss'; ledRed: boolean; ringGlow: boolean }
interface Ctx {
  g: CanvasRenderingContext2D;
  r: Round;
  k: number;
  t: number;
  rt: number;
  shot: SceneInput<Round>['shot'];
  v: Values;
  A: SceneInput<Round>['A'];
  out: Out | null;
  /** Seconds since the verdict (negative before it). */
  sv: number;
  once: (key: string, fn: () => void) => void;
  moods: Moods;
}

function level(n: 1 | 2 | 3 | 4 | 5, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  const st = { now: 0, lastDrag: -10, touched: false, shot: null as unknown, done: new Set<string>() };
  const mark = () => {
    st.lastDrag = st.now;
    st.touched = true;
  };
  const hot = () => st.now - st.lastDrag < 0.15;

  // ---- handles and the track ----
  const trk = (key: string, lo: number, hi: number): HandleSpec<Round> => ({
    dial: key,
    at: (_r, v) => [TRK.x0 + ((v[key] - lo) / (hi - lo)) * (TRK.x1 - TRK.x0), TRK.y],
    drag: (_r, px) => {
      mark();
      return lo + ((px - TRK.x0) / (TRK.x1 - TRK.x0)) * (hi - lo);
    },
    radius: 20,
  });
  /** The bottom track with its end labels, its grip and the player's own setting above it. */
  function track(c: Ctx, lo: number, hi: number, loTxt: string, hiTxt: string, val: number, read: string, cue: boolean) {
    const { g, t } = c;
    line(g, TRK.x0, TRK.y, TRK.x1, TRK.y, PAL.dim, 3);
    text(g, loTxt, TRK.x0, 337, PAL.dim, 11);
    text(g, hiTxt, TRK.x1, 337, PAL.dim, 11);
    const x = TRK.x0 + ((val - lo) / (hi - lo)) * (TRK.x1 - TRK.x0);
    handleGrip(g, x, TRK.y, '⇔', hot());
    tag(g, read, x, TRK.y - 26, 'center', PAL.yellow, 12);
    if (cue && !st.touched) text(g, 'drag ⇔', x, TRK.y - 52 + (calm() ? 0 : Math.sin(t * 4) * 3), PAL.yellow, 12);
  }

  // ---- level 1: the switchyard ----
  function kickScene(c: Ctx) {
    const { g, t, rt, shot, v, A, out, sv, once, moods } = c;
    const r = c.r as Extract<Round, { kind: 'kick' }>;
    switchyard(g, r, v.out!, { t, mood: moods.phil, band: BAND[c.k], ring: true });
    const door = doorOf(r);
    const rx = r.from === 'left' ? ROOM.rightX : ROOM.leftX;
    const ry = r.port === 'up' ? ROOM.upY : ROOM.downY;
    if (shot) {
      const sgn = r.from === 'left' ? 1 : -1;
      const u = r.port === 'up' ? 1 : -1;
      let ctrl: Pt = [door[0], 190];
      let end: Pt = door;
      if (out === 'weak') {
        ctrl = [door[0] + 46 * sgn, 190];
        end = [door[0] + 46 * sgn, door[1] + 22 * u];
      } else if (out === 'strong') {
        ctrl = [door[0] - 46 * sgn, 190];
        end = [door[0] - 46 * sgn, door[1] + 22 * u];
      } else if (out === 'wrong') end = [door[0], 380 - door[1]];
      const entry = pipeEntry(r);
      const at = (x: number): Pt | null => (x < 0 || x > 0.85 ? null : x < 0.35 ? [entry[0] + ((330 - entry[0]) * x) / 0.35, 190] : quad([330, 190], ctrl, end, (x - 0.35) / 0.5));
      const head = at(rt);
      if (head) bunch(g, head[0], head[1], r.pt, [1, 2, 3, 4, 5].map((i) => at(rt - 0.03 * i)).filter((p): p is Pt => p !== null));
      if (rt >= 0.85) {
        if (out === 'win') {
          if (sv < 0.2) {
            g.fillStyle = 'rgba(93,255,154,0.3)';
            g.fillRect(rx, ry, ROOM.w, ROOM.h);
          }
          once('zap', () => {
            A.float('ZAP!', rx + ROOM.w / 2, ry + ROOM.h / 2, PAL.green);
            A.sound('win');
          });
          tag(g, '✓ DOSE OK', door[0], r.port === 'up' ? door[1] + 40 : door[1] - 28, 'center', PAL.green, 12);
        } else {
          once('clang', () => {
            A.burst(end[0], end[1], PAL.orange, 16, 140);
            A.float('CLANG!', end[0], end[1] - 8, PAL.orange);
            if (out === 'wrong') A.shake(5);
          });
          g.fillStyle = 'rgba(8,8,16,0.85)';
          g.beginPath();
          g.ellipse(end[0], end[1], 6, 4, 0.3, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }

  // ---- level 2: the test rod ----
  function liftScene(c: Ctx) {
    const { g, t, rt, shot, v, A, out, sv, once } = c;
    const r = c.r as Extract<Round, { kind: 'lift' }>;
    testMagnet(g, r, t);
    if (r.th === 30) inset(g);
    stand(g);
    let y = ROD.y;
    let tilt = 0;
    let mood: RodMood = 'idle';
    let thread: 'taut' | 'slack' | 'snapped' = 'taut';
    if (shot) {
      const u = ease((rt - 0.45) / 0.2);
      if (out === 'win') {
        y = ROD.y - 4 * u + (rt > 0.7 && !calm() ? Math.sin(t * 3) : 0);
        thread = rt >= 0.45 ? 'slack' : 'taut';
        if (sv >= 0) {
          mood = 'win';
          once('whee', () => A.float('whee!', 360, 150, PAL.green));
        }
      } else if (out === 'sag') {
        y = ROD.y + 2 * u;
        if (sv >= 0) mood = 'sag';
      } else if (out === 'jump') {
        y = rt < 0.6 ? ROD.y + (STOP_Y + 6 - ROD.y) * ease((rt - 0.45) / 0.15) : STOP_Y + 6 + (ROD.y - STOP_Y - 6) * ease((rt - 0.6) / 0.3);
        thread = rt >= 0.5 && rt < 0.75 ? 'slack' : 'taut';
        if (rt >= 0.6) once('clang', () => {
          A.float('CLANG!', 360, STOP_Y - 14, PAL.yellow);
          A.burst(360, STOP_Y, PAL.yellow, 12, 120);
        });
        if (sv >= 0 && sv < 0.8) mood = 'dizzy';
      } else if (out === 'down') {
        y = ROD.y + 8 * ease((rt - 0.45) / 0.05);
        if (rt >= 0.5) {
          thread = 'snapped';
          mood = 'snap';
          tilt = (-20 * Math.PI / 180) * ease((rt - 0.5) / 0.2);
          once('snap', () => A.float('SNAP!', 300, 120, PAL.red));
        }
      }
      once('clunk', () => A.float('CLUNK', 184, 226, PAL.white));
      if (rt >= 0.15) {
        // yellow current dots run through the leads and the rod in the player's direction, 120 px/s
        const path = circuit(y);
        const pts = v.cur ? path : [...path].reverse();
        let total = 0;
        for (let j = 1; j < pts.length; j++) total += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
        const run = (rt - 0.15) * 120;
        g.fillStyle = PAL.yellow;
        for (let i = 0; i < total / 30; i++) {
          const [px, py] = along(pts, ((run + i * 30) % total) / total);
          g.beginPath();
          g.arc(px, py, 2.5, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    psu(g, v.cur!);
    rodney(g, y, tilt, mood, t, thread, t);
    tag(g, `${r.l} cm · ${r.m} g`, 360, 224, 'center', PAL.white, 12);
  }

  // ---- levels 3 and 4: the cyclotron ----
  function cycScene(c: Ctx) {
    const { g, t, rt, shot, v, A, out, once, moods } = c;
    const r = c.r as Extract<Round, { kind: 'cyc' | 'speed' }>;
    const lvl = r.kind === 'cyc' ? 3 : 4;
    cyclotron(g, lvl, r.kind === 'cyc' ? r.r : undefined);
    if (r.kind === 'speed') {
      portBlock(g, v.r!);
      g.fillStyle = '#ffe9a0';
      g.fillRect(462, 70, 148, 40);
      text(g, 'yesterday:', 470, 86, '#2a2415', 12, 'left');
      text(g, `port ${r.r0} cm, RF ${r.f0} MHz`, 470, 102, '#2a2415', 12, 'left');
    }
    pipeToPhil(g);
    phil(g, PHIL.x, PHIL.y, 1, t, moods.phil, BAND[c.k], { couch: true, ring: 'cutaway', ringGlow: moods.ringGlow, ledRed: moods.ledRed });
    if (shot) {
      const port = r.kind === 'cyc' ? CYCL.R : rPx(v.r!);
      const spiral = (rt2: number, jitter: boolean): Pt => {
        const p = clamp01((rt2 - 0.05) / 0.95);
        const jit = jitter && rt2 >= 0.5 ? Math.sin(rt2 * 80) * 4 : 0;
        const rad = 8 + (port - 8) * p + jit;
        const a = Math.PI * 8 * p;
        return [CYCL.x + rad * Math.cos(a), CYCL.y + rad * Math.sin(a)];
      };
      const wall: Pt = [CYCL.x - 30, CYCL.y + 62];
      const stepOut = out === 'slow' || out === 'fast';
      const pos = (x: number): Pt | null => {
        if (x < 0.05) return null;
        if (stepOut) {
          if (x <= 0.6) return spiral(x, true);
          if (x <= 0.65) {
            const a = spiral(0.6, true);
            const u = (x - 0.6) / 0.05;
            return [a[0] + (wall[0] - a[0]) * u, a[1] + (wall[1] - a[1]) * u];
          }
          return null;
        }
        if (x <= 1) return spiral(x, false);
        if (x <= 1.25) {
          const start: Pt = [CYCL.x + port, CYCL.y];
          return along([start, PIPE[0], PIPE[1], PIPE[2], [PHIL.x - 40, PHIL.y]], (x - 1) / 0.25);
        }
        return null;
      };
      // the faint trace of the spiral so far, then the bunch with its tail
      g.strokeStyle = 'rgba(255,155,61,0.3)';
      g.lineWidth = 1.5;
      g.beginPath();
      for (let i = 0; i <= 60; i++) {
        const x2 = 0.05 + (Math.min(rt, stepOut ? 0.6 : 1) - 0.05) * (i / 60);
        if (x2 < 0.05) break;
        const p = spiral(x2, stepOut);
        if (i === 0) g.moveTo(p[0], p[1]);
        else g.lineTo(p[0], p[1]);
      }
      g.stroke();
      const head = pos(rt);
      if (head) bunch(g, head[0], head[1], 'p', [1, 2, 3, 4, 5].map((i) => pos(rt - 0.025 * i)).filter((p): p is Pt => p !== null), 3);
      if (stepOut && rt >= 0.65) {
        once('fzzt', () => {
          A.float('FZZT', wall[0], wall[1] - 8, PAL.yellow);
          A.burst(wall[0], wall[1], PAL.yellow, 12, 120);
        });
        g.fillStyle = 'rgba(8,8,16,0.85)';
        g.beginPath();
        g.ellipse(wall[0], wall[1], 6, 4, 0.3, 0, Math.PI * 2);
        g.fill();
      } else if (!stepOut && rt >= 1.25) {
        const dx = out === 'win' ? 0 : out === 'shallow' ? -40 : 40;
        g.globalAlpha = clamp01((2.35 - rt) / 0.3);
        glow(g, PAL.orange, 14, () => {
          g.fillStyle = '#ffc060';
          g.beginPath();
          g.arc(PHIL.x + dx, PHIL.y, 10, 0, Math.PI * 2);
          g.fill();
        });
        g.globalAlpha = 1;
        if (out === 'win') {
          once('dose', () => A.sound('win'));
          tag(g, '✓ DOSE OK', PHIL.x, PHIL.y - 34, 'center', PAL.green, 12);
        }
      }
    }
  }

  // ---- level 5: the imaging tube ----
  function focusScene(c: Ctx) {
    const { g, rt, shot, A, out, once } = c;
    const r = c.r as Extract<Round, { kind: 'focus' }>;
    tube(g, r, shot ? ease(rt / 0.2) : 0);
    let kind: 'idle' | 'sharp' | 'blur' | 'dark' = 'idle';
    if (shot) {
      const turns = out === 'win' ? 1 : out === 'long' ? 0.6 : out === 'short' ? 1.4 : 1;
      const amp = out === 'scrape' ? 17 : 11;
      const cap = out === 'scrape' ? 0.5 : 1;
      const dotAt = (j: number, x: number): Pt | null => {
        const u = clamp01((x - 0.05 - 0.04 * j) / 0.95);
        if (x < 0.05 + 0.04 * j) return null;
        const w = Math.min(cap, u);
        const s = turns * w;
        return [TUBE.x0 + (TUBE.x1 - TUBE.x0) * w, TUBE.y - amp * (1 - Math.cos(2 * Math.PI * s))];
      };
      for (let j = 0; j < 3; j++) {
        const gone = out !== 'scrape' && rt - 0.05 - 0.04 * j >= 0.95;
        if (gone) continue;
        for (let m = 6; m >= 1; m--) {
          const p = dotAt(j, rt - 0.02 * m);
          if (p) {
            g.globalAlpha = 0.5 * (1 - m / 7);
            g.fillStyle = PAL.cyan;
            g.beginPath();
            g.arc(p[0], p[1], 2.2, 0, Math.PI * 2);
            g.fill();
          }
        }
        g.globalAlpha = 1;
        const p = dotAt(j, rt);
        if (p) {
          glow(g, PAL.cyan, 8, () => {
            g.fillStyle = PAL.cyan;
            g.beginPath();
            g.arc(p[0], p[1], 3, 0, Math.PI * 2);
            g.fill();
          });
        }
      }
      if (out === 'scrape') {
        kind = 'dark';
        if (rt >= 0.55) {
          once('fzzt', () => {
            A.float('FZZT', 365, TUBE.y - 44, PAL.orange);
            A.burst(365, TUBE.y - 34, PAL.orange, 12, 100);
          });
          g.globalAlpha = 0.6 * clamp01(1 - (rt - 0.55) / 0.8);
          g.fillStyle = PAL.orange;
          g.beginPath();
          g.arc(365, TUBE.y - 34, 14, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = 1;
        }
      } else if (rt >= 1) {
        kind = out === 'win' ? 'sharp' : 'blur';
        once('spot', () => {
          A.float(out === 'win' ? 'SHARP!' : 'BLUR', SPOT.x - 20, SPOT.y + SPOT.r + 22, out === 'win' ? PAL.green : PAL.orange);
          if (out === 'win') A.sound('win');
        });
      }
    }
    screenInset(g, kind);
  }

  // ---- the frame ----
  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    const v = s.v as Values;
    st.now = t;
    if (st.shot !== shot) {
      st.shot = shot;
      st.done.clear();
    }
    const once = (key: string, fn: () => void) => {
      if (!st.done.has(key)) {
        st.done.add(key);
        fn();
      }
    };
    // the beam monitor, the only helper: live in round 1, for 1.5 s after a check in round 2, never in round 3
    const since = flash.since(t, k);
    const live = !shot && helperOn(r.assist, false, since);
    A.canvas.dataset.lcd = live ? '1' : '0';
    const f = shot ? fault(r, shot.v as Values) : null;
    const out: Out | null = shot ? (shot.ok ? 'win' : (f ?? 'short')) : null;
    if (out) A.canvas.dataset.take = out;
    else delete A.canvas.dataset.take;
    const sv = shot ? rt - verdictDelay(r, shot.v as Values) : -1;
    const verdict = shot !== null && sv >= 0;
    const miss = verdict && out !== 'win';
    const moods: Moods = { phil: verdict ? (out === 'win' ? 'win' : 'miss') : 'idle', ledRed: miss && sv < 1, ringGlow: verdict && out === 'win' };
    const c: Ctx = { g, r, k, t, rt, shot, v, A, out, sv, once, moods };

    hall(g, t, k, n === 1 ? r.kind === 'kick' && r.from === 'left' : n === 2);
    if (r.kind === 'kick') kickScene(c);
    else if (r.kind === 'lift') liftScene(c);
    else if (r.kind === 'cyc' || r.kind === 'speed') cycScene(c);
    else focusScene(c);

    // Imani, her desk, the monitor, the clock and the beacon
    if (shot) once('power', () => A.float('POWER ON', 110, 236, PAL.yellow));
    const press = shot ? (rt < 0.3 ? clamp01(rt / 0.1) : 1 - clamp01((rt - 0.3) / 0.2)) : 0;
    desk(g, press);
    monitor(g, live ? lcdText(r, v) : LCD_OFF, live ? (r.assist === 0 ? PAL.green : PAL.yellow) : PAL.dim);
    clock(g, k);
    if (k === 2) text(g, 'LAST CHECK BEFORE PATIENTS', 308, 46, PAL.red, 11);
    beacon(g, t, shot ? 'turn' : k === 2 ? 'glow' : 'off');
    const spark = miss && out !== null && SPARK.has(out);
    imani(g, t, { mood: verdict ? (out === 'win' ? 'cheer' : 'worried') : 'happy', press, flinch: !!spark && sv < 0.4 });

    // the grips, each with the player's own setting beside it, and the round's goal
    if (!shot) {
      const cue = n === 1 && k === 0;
      if (r.kind === 'kick') {
        handleGrip(g, KSWITCH.x, KSWITCH.y + (v.out ? -14 : 14), '⇕', hot());
        track(c, DIAL.kb.min, DIAL.kb.max, '0.1 T', '2 T', v.b!, `${v.b} T`, cue);
      } else if (r.kind === 'lift') {
        handleGrip(g, LSWITCH.x + (v.cur ? 14 : -14), LSWITCH.y, '⇔', hot());
        text(g, v.cur ? '→' : '←', LSWITCH.x, 275, PAL.yellow, 13);
        track(c, DIAL.i.min, DIAL.i.max, '0.1 A', '5 A', v.i!, `${v.i} A`, false);
      } else if (r.kind === 'cyc') {
        const by = BT.y0 + ((v.b! - DIAL.cb.min) / (DIAL.cb.max - DIAL.cb.min)) * (BT.y1 - BT.y0);
        line(g, BT.x, BT.y0, BT.x, BT.y1, PAL.dim, 3);
        text(g, 'MAGNET', BT.x, 44, PAL.white, 11);
        text(g, '2.5 T', BT.x + 18, 40, PAL.dim, 11, 'left');
        text(g, '0.5 T', BT.x + 18, 196, PAL.dim, 11, 'left');
        handleGrip(g, BT.x, by, '⇕', hot());
        tag(g, `${v.b} T`, BT.x + 26, by + 4, 'left', PAL.yellow, 12);
        track(c, DIAL.f.min, DIAL.f.max, '8 MHz', '40 MHz', v.f!, `${v.f} MHz`, false);
      } else if (r.kind === 'speed') {
        const px = CYCL.x + rPx(v.r!);
        handleGrip(g, px, CYCL.y, '⇔', hot());
        tag(g, `${v.r} cm`, px, CYCL.y - 18, 'center', PAL.yellow, 12);
        track(c, DIAL.f.min, DIAL.f.max, '8 MHz', '40 MHz', v.f!, `${v.f} MHz`, false);
      } else {
        track(c, DIAL.gb.min, DIAL.gb.max, '1 G', '20 G', v.b!, `${v.b} G`, false);
      }
      goalLine(g, goal(r));
    }
  }

  // ---- the dials ----
  const dials: DialSpec<Round>[] = [];
  const handles: HandleSpec<Round>[] = [];
  const rf: DialSpec<Round> = { key: 'f', aria: 'RF frequency in megahertz', label: 'RF', unit: 'MHz', step: DIAL.f.step, min: DIAL.f.min, max: DIAL.f.max, start: DIAL.f.start };
  if (n === 1) {
    dials.push(
      { key: 'out', aria: 'Kicker field: 1 out of the screen, 0 into the screen', label: 'Field', unit: '', step: 1, min: DIAL.out.min, max: DIAL.out.max, start: DIAL.out.start, text: (x) => (x ? 'out of the screen ⊙' : 'into the screen ⊗') },
      { key: 'b', aria: 'Kicker field strength in tesla', label: 'Kicker', unit: 'T', step: DIAL.kb.step, min: DIAL.kb.min, max: DIAL.kb.max, start: DIAL.kb.start },
    );
    handles.push({ dial: 'out', at: (_r, v) => [KSWITCH.x, KSWITCH.y + (v.out ? -14 : 14)], drag: (_r, _px, py) => {
      mark();
      return py < KSWITCH.y ? 1 : 0;
    }, radius: 20 }, trk('b', DIAL.kb.min, DIAL.kb.max));
  } else if (n === 2) {
    dials.push(
      { key: 'cur', aria: 'Current direction in the rod: 1 left to right, 0 right to left', label: 'Current', unit: '', step: 1, min: DIAL.cur.min, max: DIAL.cur.max, start: DIAL.cur.start, text: (x) => (x ? 'left to right →' : 'right to left ←') },
      { key: 'i', aria: 'Current in the rod in amperes', label: 'Current size', unit: 'A', step: DIAL.i.step, min: DIAL.i.min, max: DIAL.i.max, start: DIAL.i.start },
    );
    handles.push({ dial: 'cur', at: (_r, v) => [LSWITCH.x + (v.cur ? 14 : -14), LSWITCH.y], drag: (_r, px) => {
      mark();
      return px > LSWITCH.x ? 1 : 0;
    }, radius: 20 }, trk('i', DIAL.i.min, DIAL.i.max));
  } else if (n === 3) {
    dials.push({ key: 'b', aria: 'Cyclotron magnet in tesla', label: 'Magnet', unit: 'T', step: DIAL.cb.step, min: DIAL.cb.min, max: DIAL.cb.max, start: DIAL.cb.start }, rf);
    handles.push({ dial: 'b', at: (_r, v) => [BT.x, BT.y0 + ((v.b - 0.5) / 2) * (BT.y1 - BT.y0)], drag: (_r, _px, py) => {
      mark();
      return 0.5 + ((py - BT.y0) / (BT.y1 - BT.y0)) * 2;
    }, radius: 20 }, trk('f', DIAL.f.min, DIAL.f.max));
  } else if (n === 4) {
    dials.push({ key: 'r', aria: 'Extraction port radius in centimetres', label: 'Port', unit: 'cm', step: DIAL.r.step, min: DIAL.r.min, max: DIAL.r.max, start: DIAL.r.start }, rf);
    handles.push({ dial: 'r', at: (_r, v) => [CYCL.x + rPx(v.r), CYCL.y], drag: (_r, px) => {
      mark();
      return ((px - CYCL.x) / CYCL.R) * 80;
    }, radius: 20 }, trk('f', DIAL.f.min, DIAL.f.max));
  } else {
    dials.push({ key: 'b', aria: 'Focusing coil field in gauss', label: 'Focus coil', unit: 'G', step: DIAL.gb.step, min: DIAL.gb.min, max: DIAL.gb.max, start: DIAL.gb.start });
    handles.push(trk('b', DIAL.gb.min, DIAL.gb.max));
  }

  return {
    hero: { name: 'Imani', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: {
      button: '🔎 Monitor check',
      aria: 'Monitor check: read the beam monitor for this setting',
      read: (r, v) => {
        flash.paid();
        return meterText(r, v as Values);
      },
    },
    fire: { button: '⚡ Power on', aria: 'Power on: run the beam with these settings' },
    judge: (r, v) => judge(r, v as Values),
    miss: (r, v) => missText(r, v as Values),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => HIT,
    delay: (r, v) => verdictDelay(r, v as Values),
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
