// Snap the Electron (Bohr orbits). Inspirations (code comment only): a creature-photography rail game where you photograph elusive creatures for an album,
// duck-hunt style "lead the target" shooting for levels 2 and 3, and the "powers of ten" zoom film for level 4.
// Never leak the answer: the electron is drawn only in a winning photo; the atom shows a fixed haze (level 1) or a fixed band (levels 2 and 3), nothing on
// the orbit moves, the countdown bar fills at a fixed rate, and every miss look is fixed (MISS_LOOK). The helper (wave preview, lap meter, B's lap meter, live
// view) describes the player's own setting: live in round 1, for 1.5 s after a test flash in round 2, never in round 3 and never during a miss. The art is in art.ts.
import { PAL, type Arcade } from '@core/arcade';
import { helperOn, paidFlash } from '@core/aidflash';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type SceneInput } from '@core/dialgame';
import { fmt } from '@core/judge';
import { glow, text } from '@core/neon';
import {
  ATOM, FX, KIRAN_REST, SCREEN, TRAP as TRAP_AT, TWIN_A, TWIN_B, WAVE_WIN, WIN_MID, ZTRACK, GOAL_Y,
  arcDeg, atomCam, bodyScene, camera, clamp01, cupola, dataCard, direction, dragCue, ease, electron, grip, kiran, onRing, orbit, pico, proton, ringPx, station, strip, trapPx, twinPxA,
  twinPxB, viewfinder, waveRing, waveWindow, zoomTrack, type KiranState, type PicoState,
} from './art';
import {
  DELAY, DIAL, HANDLE_R, HBAR, HIT, MISS_LOOK, REVEAL, buildRounds, goal, helperLabel, hintText, judge, missText, outcome, ringA, sci, sup, testText, waves, winText, type Out, type Round, type Values,
} from './logic';

type G = CanvasRenderingContext2D;
type R1 = Extract<Round, { kind: 'ring' }>;
type R2 = Extract<Round, { kind: 'trap' }>;
type R3 = Extract<Round, { kind: 'twin' }>;
type R4 = Extract<Round, { kind: 'zoom' }>;

const ARIA = 'A space-station lab: a laser physicist floats at the controls of an attosecond flash camera that photographs the electron of a hydrogen atom, with the Earth in the porthole.';
const ROLE = 'a laser physicist on a space station who photographs the electron of a hydrogen atom with attosecond flashes';
const HEROES = [
  {
    story: 'A single hydrogen atom floats in Kiran’s vacuum cell. In Bohr’s picture its electron circles the proton like a tiny planet, but only on orbits of radius rₙ = n²a₀, where a₀ = 0.53 Å is the ground orbit. It moves far too fast to see, so Kiran’s camera fires a ring of light a few hundred attoseconds long: the photo catches the electron only if the ring lies on its orbit. (Flashes this short are real; their inventors won the 2023 Nobel Prize in Physics.)',
    objective: 'Size the ring flash to the electron’s orbit and photograph it, in three rounds.',
  },
  {
    story: 'Now Kiran wants a sharp spot photo. On level n the electron moves at vₙ = v₁/n, with v₁ = 2.19 × 10⁶ m/s, round a circle of radius n²a₀, so one lap takes T = 2πr/v. It circles clockwise. A gate at the top clicks as it passes, and the camera fires a set time later at the spot where Kiran parked it.',
    objective: 'Park the camera where the electron will be when the flash fires, in three rounds.',
  },
  {
    story: 'Two hydrogen atoms float side by side: A on a low level, B on a higher one. The radius grows as n² and the speed falls as 1/n, so a lap takes n³ times as long as on the ground orbit. Kiran’s pump flash starts both electrons from their gates together, and she uses the fast atom A as a clock: when A has lapped a set number of times, the camera fires at B.',
    objective: 'Park the camera on B’s orbit where its electron will be, in three rounds.',
  },
  {
    story: 'From the station’s window Kiran looks at bigger orbits. Bohr’s rule mvr = nħ, with ħ = 1.055 × 10⁻³⁴ J s, holds for any orbit, and in de Broglie’s picture the orbit holds exactly n matter waves. Her Bohr scope is a thought experiment: it zooms in by powers of ten until the waves can be counted, at least one and fewer than ten in its window. No real lens could do this, which is why nobody ever sees a planet’s orbit come in steps.',
    objective: 'Zoom the scope until the waves in its window can be counted, in three rounds.',
  },
];

/** The angle (clockwise from 12 o'clock) of a pointer round a centre, snapped to 15 degrees; a drag near 360 wraps to 0. */
function wrap15(px: number, py: number, c: { x: number; y: number }): number {
  let d = (Math.atan2(px - c.x, -(py - c.y)) * 180) / Math.PI;
  if (d < 0) d += 360;
  return (Math.round(d / 15) * 15) % 360;
}

/** When the camera of levels 2 and 3 fires, in seconds into the take. */
const FIRE_AT = { trap: 0.9, twin: 1.0 } as const;

function level(n: 1 | 2 | 3 | 4, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  let lastK = -1;
  let stampAt = -10;
  let lastVal = Number.NaN;
  let changedAt = -10;
  let lastAria = '';
  const fx = { shot: null as unknown, done: new Set<string>() };

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    const v = s.v as Values;
    if (k !== lastK) {
      lastK = k;
      stampAt = t;
      lastVal = Number.NaN;
    }
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
    const kind = r.kind;
    const RV = REVEAL[kind];
    const DV = DELAY[kind];
    const dialVal = kind === 'ring' ? v.k! : kind === 'zoom' ? v.z! : v.deg!;
    if (dialVal !== lastVal) {
      if (!Number.isNaN(lastVal)) changedAt = t;
      lastVal = dialVal;
    }
    const since = flash.since(A.clock, k);
    const revealed = !!shot && rt >= RV;
    const win = !!shot && shot.ok;
    const helper = shot ? win && revealed : helperOn(r.assist, false, since);
    const out: Out | '' = shot && revealed ? outcome(r, shot.v) : '';
    A.canvas.dataset.helper = helper ? 'on' : 'off';
    A.canvas.dataset.out = out;
    const readout = kind === 'ring' ? `${ringA(v.k!).toFixed(2)} Å` : kind === 'zoom' ? `×10${sup(v.z!)}` : `${v.deg}°`;
    const aria = `${ARIA} ${goal(r)}. Your setting: ${readout}.`;
    if (aria !== lastAria) {
      lastAria = aria;
      A.canvas.setAttribute('aria-label', aria);
    }

    // Kiran and Pico react to the take
    const press = shot ? (rt < 0.12 ? rt / 0.12 : rt < 0.4 ? 1 - (rt - 0.12) / 0.28 : 0) : 0;
    const ks: KiranState = {
      ...KIRAN_REST,
      mood: shot ? (revealed ? (win ? 'cheer' : 'worried') : 'focus') : t - changedAt < 0.5 ? 'focus' : 'happy',
      goggles: !!shot && rt < RV,
      press,
      spin: win && revealed && !FX.reduce ? 2 * Math.PI * ease((rt - RV) / 0.9) : 0,
      sweat: shot && !win && rt >= DV ? rt - DV : -1,
      facepalm: !!shot && !win && rt >= DV,
      thumbsUp: win && revealed && FX.reduce,
    };
    const ps: PicoState = {
      mood: shot ? (!revealed ? 'busy' : win ? 'happy' : 'sad') : 'idle',
      look: n === 4 ? [400, WIN_MID] : [ATOM.x, ATOM.y],
      u: shot && revealed ? rt - RV : 0,
    };
    if (shot) {
      once('fire', () => A.float(n === 4 ? 'ZOOM!' : 'FLASH!', 96, 268, PAL.white));
      if (revealed && win) once('beep', () => A.float('BEEP!', 142, 84, PAL.pink));
    }

    const c: Ctx = { g, k, v, t, rt, shot, A, helper, revealed, out, once, win };
    station(g, t, k, n === 4 ? 'ZOOM' : 'FLASH', press);
    kiran(g, t, ks);
    pico(g, t, ps);
    if (r.kind === 'ring') scene1(c, r);
    else if (r.kind === 'trap') scene2(c, r);
    else if (r.kind === 'twin') scene3(c, r);
    else scene4(c, r);

    text(g, goal(r), 400, GOAL_Y, PAL.yellow, 13);
    if (t - stampAt < 1.2) text(g, k === 2 ? 'FINAL SHOT' : `SHOT ${k + 1}`, 620, 50, k === 2 ? PAL.red : PAL.white, 14, 'right');
  }

  const dials = [
    n === 1
      ? { key: 'k', aria: 'Ring flash radius, in steps of the ground orbit of 0.53 ångström', label: 'Ring flash', unit: 'Å', step: 1, min: DIAL.k.min, max: DIAL.k.max, start: DIAL.k.start, text: (x: number) => ringA(x).toFixed(2) }
      : n === 4
        ? { key: 'z', aria: 'Zoom of the Bohr scope, as a power of ten', label: 'Zoom', unit: '', step: 1, min: DIAL.z.min, max: DIAL.z.max, start: DIAL.z.start, text: (x: number) => `×10${sup(x)}` }
        : { key: 'deg', aria: n === 2 ? 'Camera angle in degrees, clockwise from the gate' : 'Camera angle on atom B in degrees, clockwise from its gate', label: 'Camera angle', unit: '', step: 15, min: DIAL.deg.min, max: DIAL.deg.max, start: DIAL.deg.start, text: (x: number) => `${x}°` },
  ];
  const handles =
    n === 1
      ? [{ dial: 'k', at: (_r: Round, v: Values) => [ATOM.x + ringPx(v.k!), ATOM.y] as [number, number], drag: (_r: Round, px: number, py: number) => (Math.hypot(px - ATOM.x, py - ATOM.y) - 12) / 4.2, radius: HANDLE_R }]
      : n === 2
        ? [{ dial: 'deg', at: (r: Round, v: Values) => onRing(TRAP_AT.x, TRAP_AT.y, trapPx((r as R2).n), v.deg!), drag: (_r: Round, px: number, py: number) => wrap15(px, py, TRAP_AT), radius: HANDLE_R }]
        : n === 3
          ? [{ dial: 'deg', at: (r: Round, v: Values) => onRing(TWIN_B.x, TWIN_B.y, twinPxB((r as R3).nb), v.deg!), drag: (_r: Round, px: number, py: number) => wrap15(px, py, TWIN_B), radius: HANDLE_R }]
          : [{ dial: 'z', at: (_r: Round, v: Values) => [ZTRACK.x0 + (v.z! / 90) * 420, ZTRACK.y] as [number, number], drag: (_r: Round, px: number) => ((px - ZTRACK.x0) / 420) * 90, radius: HANDLE_R }];

  return {
    hero: { name: 'Kiran', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: {
      button: '🔎 Test flash',
      aria: 'Test flash: preview this setting (costs a charge)',
      read: (r, v) => {
        flash.paid();
        return testText(r, v);
      },
    },
    fire: n === 4 ? { button: '🔭 Zoom!', aria: 'Zoom the scope to this power of ten' } : { button: '📸 Flash!', aria: 'Fire the flash and take the photo' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => HIT,
    delay: (r) => DELAY[r.kind],
    draw,
  };
}

// ---------------------------------------------------------------- the scenes

interface Ctx {
  g: G;
  k: number;
  v: Values;
  t: number;
  rt: number;
  shot: { ok: boolean; v: Values } | null;
  A: Arcade;
  helper: boolean;
  revealed: boolean;
  out: Out | '';
  win: boolean;
  once: (key: string, fn: () => void) => void;
}

/** A white wash over the ATOM CAM only, at most 0.35, halved with reduced motion. */
function wash(g: G, a: number) {
  if (a <= 0) return;
  g.fillStyle = `rgba(255,255,255,${(FX.reduce ? a / 2 : a).toFixed(3)})`;
  g.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
}
function verdict(c: Ctx, x: number, sub?: string) {
  if (c.win) glow(c.g, PAL.green, 10, () => text(c.g, 'GOT IT ✓', x, 318, PAL.green, 16));
  else {
    text(c.g, 'EMPTY FRAME ✗', x, 318, PAL.red, 16);
    if (sub) text(c.g, sub, x, 332, PAL.red, 12);
  }
}
const faint = (rt: number, from: number, len: number) => clamp01(1 - (rt - from) / len);

/** Level 1: the ring flash. */
function scene1(c: Ctx, r: R1) {
  const { g, v, t, rt, shot, helper, revealed, out, once, win } = c;
  const label = c.k === 2 ? 'ATOM CAM · FINAL SHOT' : 'ATOM CAM · H';
  atomCam(g, label, c.k === 2);
  // the haze: fixed, never moving with the answer
  const gr = g.createRadialGradient(ATOM.x, ATOM.y, 0, ATOM.x, ATOM.y, 140);
  if (gr) {
    gr.addColorStop(0, 'rgba(77,225,255,0.10)');
    gr.addColorStop(1, 'rgba(77,225,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(ATOM.x, ATOM.y, 140, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 10; i++) {
    g.fillStyle = `rgba(255,255,255,${(0.2 + 0.2 * Math.sin(3 * t + i)).toFixed(2)})`;
    g.beginPath();
    g.arc(400 + 120 * Math.sin(2.3 * i), 186 + 110 * Math.cos(1.7 * i), 1, 0, Math.PI * 2);
    g.fill();
  }
  const R = ringPx(v.k!);
  text(g, 'a₀ = 0.53 Å (ground orbit)', 180, 322, PAL.dim, 11, 'left');
  // the ring flash
  g.lineWidth = 2;
  if (!shot) {
    g.strokeStyle = PAL.cyan;
    g.globalAlpha = 0.8;
    g.setLineDash([6, 6]);
    g.beginPath();
    g.arc(ATOM.x, ATOM.y, R, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
    for (let i = 0; i < 8; i++) {
      const [bx, by] = onRing(ATOM.x, ATOM.y, R, i * 45);
      g.fillStyle = PAL.white;
      g.beginPath();
      g.arc(bx, by, 2, 0, Math.PI * 2);
      g.fill();
    }
  } else if (rt >= 0.1 && rt < 0.35) {
    glow(g, PAL.white, 16, () => {
      g.strokeStyle = PAL.white;
      g.lineWidth = 7 - 20 * (rt - 0.1);
      g.beginPath();
      g.arc(ATOM.x, ATOM.y, R, 0, Math.PI * 2);
      g.stroke();
    });
    wash(g, 0.35 * (1 - (rt - 0.1) / 0.25));
  } else if (shot && rt < 0.1) {
    g.strokeStyle = PAL.cyan;
    g.setLineDash([6, 6]);
    g.beginPath();
    g.arc(ATOM.x, ATOM.y, R, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  }
  let pm: 'sleepy' | 'smile' | 'yawn' = 'sleepy';
  if (revealed && shot) {
    if (win) {
      pm = 'smile';
      g.strokeStyle = PAL.green;
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(ATOM.x, ATOM.y, R, 0, Math.PI * 2);
      g.stroke();
      const [ex, ey] = onRing(ATOM.x, ATOM.y, R, 315);
      electron(g, ex, ey, t, rt - REVEAL.ring, { cx: ATOM.x, cy: ATOM.y, R, deg: 315 });
      viewfinder(g, ex, ey, t);
      once('snap', () => c.A.float('SNAP!', ex, ey - 24, PAL.white));
    } else {
      g.strokeStyle = PAL.white;
      g.globalAlpha = 0.5;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(ATOM.x, ATOM.y, R, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
      // the streak: fixed length and offset, only its side tells
      const a = 0.6 * faint(rt, REVEAL.ring, 0.8);
      if (a > 0) arcDeg(g, ATOM.x, ATOM.y, out === 'wide' ? Math.max(16, R - MISS_LOOK.streakOffset) : R + MISS_LOOK.streakOffset, 200, 200 + MISS_LOOK.streakDeg, PAL.cyan, 3, a);
      if (rt >= 0.9 && rt < 1.5) pm = 'yawn';
    }
    verdict(c, 400);
  }
  proton(g, ATOM.x, ATOM.y, 12, t, pm);
  // the player's own setting
  if (!shot) {
    grip(g, ATOM.x + R, ATOM.y, HANDLE_R, '⇔');
    if (c.k === 0 && v.k === DIAL.k.start) dragCue(g, t, '⇔', ATOM.x + R, ATOM.y + 32);
  }
  text(g, `${ringA(v.k!).toFixed(2)} Å`, ATOM.x + R, ATOM.y - 30, PAL.white, 12);
  // the helper: the matter-wave preview of the player's ring
  if (helper) {
    const N = waves(v.k!);
    waveRing(g, ATOM.x, ATOM.y, R, N, PAL.green, 2);
    const fits = Number.isInteger(N);
    if (!fits) text(g, '✗', ATOM.x, ATOM.y - R - 14, PAL.red, 12);
    text(g, helperLabel(r, v), 180, 72, fits ? PAL.green : PAL.red, 12, 'left');
  }
}

/** Shared drawing of a camera on an orbit with its readout, grip and cue. */
function cameraOn(c: Ctx, cx: number, cy: number, R: number, cueY: number) {
  const { g, v, t, shot } = c;
  const [x, y] = onRing(cx, cy, R, v.deg!);
  camera(g, x, y, cx, cy);
  if (!shot) {
    grip(g, x, y, HANDLE_R, '↻');
    if (c.k === 0 && v.deg === DIAL.deg.start) dragCue(g, t, '↻', cx, cueY);
  }
  const [rx, ry] = onRing(cx, cy, R - 32, v.deg!);
  text(g, `${v.deg}°`, rx, ry + 4, PAL.white, 12);
  return [x, y] as const;
}

/** The camera's flash at (x, y) when the shot fires at `at`. */
function cameraFlash(c: Ctx, x: number, y: number, at: number) {
  const { g, rt, shot } = c;
  if (!shot || rt < at || rt >= at + 0.25) return;
  const p = (rt - at) / 0.25;
  g.globalAlpha = 0.9 * (1 - p);
  g.fillStyle = PAL.white;
  g.beginPath();
  g.arc(x, y, 6 + 20 * p, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  if (rt - at < 0.2) wash(g, 0.25 * (1 - (rt - at) / 0.2));
}

/** The photo of a camera shot at a point of an orbit: a win, a comet trail (passed) or a faint glow (early). */
function photo(c: Ctx, cx: number, cy: number, R: number, r: R2 | R3) {
  const { g, v, t, rt, once, out } = c;
  const RV = REVEAL[r.kind];
  const deg = v.deg!;
  if (out === 'win') {
    const [ex, ey] = onRing(cx, cy, R, deg);
    electron(g, ex, ey, t, rt - RV, { cx, cy, R, deg });
    viewfinder(g, ex, ey, t);
    once('snap', () => c.A.float('SNAP!', ex, ey - 24, PAL.white));
  } else if (out === 'passed') {
    const a = 0.6 * faint(rt, RV, 0.8);
    if (a > 0) {
      arcDeg(g, cx, cy, R, deg + 5, deg + 5 + MISS_LOOK.trailDeg, PAL.cyan, 4, a);
      const [hx, hy] = onRing(cx, cy, R, deg + 5 + MISS_LOOK.trailDeg);
      g.globalAlpha = a;
      g.fillStyle = PAL.white;
      g.beginPath();
      g.arc(hx, hy, 3, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
  } else if (out === 'early') {
    const a = 0.4 * faint(rt, RV, 0.8);
    if (a > 0) arcDeg(g, cx, cy, R, deg - 5 - MISS_LOOK.trailDeg, deg - 5, PAL.cyan, 8, a);
  }
}

/** Level 2: the camera trap. */
function scene2(c: Ctx, r: R2) {
  const { g, v, t, rt, shot, helper, revealed, out, once, win } = c;
  const R = trapPx(r.n);
  const cx = TRAP_AT.x;
  const cy = TRAP_AT.y;
  atomCam(g, c.k === 2 ? 'ATOM CAM · FINAL SHOT' : 'ATOM CAM · H', c.k === 2);
  const band = shot ? 0.18 + 0.12 * clamp01((rt - 0.1) / 0.85) : 0.18;
  const led = shot && rt >= 0.1 && rt < 0.25 ? 1 : 0;
  if (shot) {
    once('fire2', () => c.A.float('ARMED', 96, 248, PAL.white));
    if (rt >= 0.1) once('click', () => c.A.float('CLICK', cx, cy - R - 24, PAL.white));
  }
  orbit(g, cx, cy, R, t, { band, ticks: true, led });
  direction(g, cx, cy, R);
  const [lx, ly] = onRing(cx, cy, R + 34, 35);
  text(g, '↻ clockwise', lx, ly, PAL.dim, 11);
  text(g, `n = ${r.n}`, cx - R - 8, cy + R, PAL.white, 12, 'right');
  // the countdown bar fills at a fixed rate and is hidden from the reveal on
  if (shot && rt >= 0.1 && rt < REVEAL.trap) {
    g.strokeStyle = PAL.dim;
    g.lineWidth = 1;
    g.strokeRect(528, 60, 84, 8);
    g.fillStyle = PAL.yellow;
    g.fillRect(528, 60, 84 * clamp01((rt - 0.1) / 0.8), 8);
    text(g, 'Δt', 616, 68, PAL.dim, 11, 'left');
  }
  let pm: 'sleepy' | 'smile' | 'yawn' = 'sleepy';
  if (revealed && win) pm = 'smile';
  if (revealed && !win && rt >= REVEAL.trap + 0.6 && rt < REVEAL.trap + 1.2) pm = 'yawn';
  proton(g, cx, cy, 12, t, pm);
  const [px, py] = cameraOn(c, cx, cy, R, cy - R - 34);
  if (helper) {
    arcDeg(g, cx, cy, R, 0, v.deg!, PAL.green, 20, 0.22);
    text(g, helperLabel(r, v), 180, 72, PAL.green, 12, 'left');
  }
  cameraFlash(c, px, py, FIRE_AT.trap);
  if (revealed) {
    photo(c, cx, cy, R, r);
    verdict(c, 400, out === 'passed' ? 'it had already passed' : 'it had not arrived yet');
  }
}

/** One atom of level 3 (band, gate, proton). */
function level3Atom(c: Ctx, cx: number, cy: number, R: number, o: { ticks: boolean; pm: 'sleepy' | 'smile' | 'yawn' }) {
  const { g, t, rt, shot } = c;
  const band = shot ? 0.18 + 0.12 * clamp01((rt - 0.1) / 0.9) : 0.18;
  orbit(g, cx, cy, R, t, { band, ticks: o.ticks, led: shot && rt >= 0.1 ? 1 : 0 });
  proton(g, cx, cy, 10, t, o.pm);
}

/** Level 3: twin atoms. */
function scene3(c: Ctx, r: R3) {
  const { g, v, rt, shot, helper, revealed, out, once, win } = c;
  const RA =twinPxA(r.na);
  const RB = twinPxB(r.nb);
  atomCam(g, c.k === 2 ? 'ATOM CAM · FINAL SHOT' : 'ATOM CAM · H', c.k === 2);
  text(g, '↻ both clockwise', 388, 50, PAL.dim, 11);
  if (shot) {
    once('fire3', () => c.A.float('GO', 96, 248, PAL.white));
    if (rt >= 0.1) once('click', () => c.A.float('CLICK', TWIN_A.x, TWIN_A.y - RA - 24, PAL.white));
  }
  let pm: 'sleepy' | 'smile' | 'yawn' = 'sleepy';
  if (revealed && win) pm = 'smile';
  if (revealed && !win && rt >= REVEAL.twin + 0.6 && rt < REVEAL.twin + 1.2) pm = 'yawn';
  level3Atom(c, TWIN_A.x, TWIN_A.y, RA, { ticks: false, pm });
  level3Atom(c, TWIN_B.x, TWIN_B.y, RB, { ticks: true, pm });
  text(g, `A · n = ${r.na}`, TWIN_A.x, TWIN_A.y + RA + 20, PAL.white, 12);
  text(g, `B · n = ${r.nb}`, TWIN_B.x, TWIN_B.y + RB + 18, PAL.white, 12);
  // A's lap counter: dashes in play, a plain count in the take (the gate LED stays lit)
  const lx = TWIN_A.x - 28;
  const ly = TWIN_A.y - RA - 52;
  g.fillStyle = '#000000';
  g.fillRect(lx, ly, 56, 16);
  const laps = shot && rt >= 0.1 ? Math.min(r.k, Math.floor((r.k * (rt - 0.1)) / 0.9)) : -1;
  text(g, laps < 0 ? '— —' : `laps ${laps}`, TWIN_A.x, ly + 12, PAL.green, 11);
  const [px, py] = cameraOn(c, TWIN_B.x, TWIN_B.y, RB, TWIN_B.y - RB - 34);
  if (helper) {
    arcDeg(g, TWIN_B.x, TWIN_B.y, RB, 0, v.deg!, PAL.green, 20, 0.22);
    text(g, helperLabel(r, v), 180, 72, PAL.green, 12, 'left');
  }
  cameraFlash(c, px, py, FIRE_AT.twin);
  if (revealed) {
    photo(c, TWIN_B.x, TWIN_B.y, RB, r);
    verdict(c, TWIN_A.x, out === 'passed' ? 'it had already passed' : 'it had not arrived yet');
  }
}

/** Level 4: powers of ten. */
function scene4(c: Ctx, r: R4) {
  const { g, v, t, rt, shot, helper, revealed, out, win } = c;
  const mvr = r.m * r.v * r.r;
  const nWaves = mvr / HBAR;
  cupola(g, t, c.k === 2);
  g.globalAlpha = shot ? 1 - 0.7 * ease(rt / 0.3) : 1;
  bodyScene(g, r.id, r.scene, t, revealed ? (win ? 'cheer' : 'worried') : 'happy');
  g.globalAlpha = 1;
  dataCard(g, r.short.charAt(0).toUpperCase() + r.short.slice(1), `m = ${sci(r.m)} kg`, `v = ${sci(r.v)} m/s`, `r = ${sci(r.r)} m`);
  waveWindow(g, !helper && !shot);
  if (!shot) text(g, 'BOHR SCOPE · a thought experiment', 400, 280, PAL.dim, 11);
  zoomTrack(g);
  const hx = ZTRACK.x0 + (v.z! / 90) * 420;
  if (!shot) {
    grip(g, hx, ZTRACK.y, HANDLE_R, '⇔');
    if (c.k === 0 && v.z === DIAL.z.start) dragCue(g, t, '⇔', hx + 30, ZTRACK.y + 4, 'left');
  }
  text(g, `×10${sup(v.z!)}`, hx, 292, PAL.white, 12);
  if (helper) {
    if (!(revealed && win)) strip(g, nWaves / 10 ** v.z!, PAL.green);
    text(g, helperLabel(r, v), 574, 220, PAL.green, 11, 'right');
  }
  if (shot && rt >= 0.05 && rt < 1.0) {
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const s = FX.reduce ? (i < 3 ? 0.2 + 0.3 * i : -1) : (((rt - 0.05) * 1.2 + i / 6) % 1);
      if (s < 0) continue;
      g.globalAlpha = 0.5 * (1 - s);
      const hw = 40 + 300 * s;
      const hh = 12 + 90 * s;
      g.beginPath();
      if (typeof g.roundRect === 'function') g.roundRect(400 - hw, WIN_MID - hh, 2 * hw, 2 * hh, 8);
      else g.rect(400 - hw, WIN_MID - hh, 2 * hw, 2 * hh);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  if (revealed) {
    if (out === 'win') {
      strip(g, nWaves / 10 ** r.b, PAL.green, 8);
      text(g, `${fmt(nWaves / 10 ** r.b)} waves in view`, 400, 222, PAL.green, 12);
      glow(g, PAL.green, 10, () => text(g, 'COUNTED ✓', 400, 198, PAL.green, 16));
    } else if (out === 'many') {
      g.globalAlpha = 0.35;
      g.fillStyle = PAL.dim;
      g.fillRect(WAVE_WIN.x, 216, WAVE_WIN.w, 36);
      g.globalAlpha = 1;
      g.strokeStyle = PAL.dim;
      g.lineWidth = 1;
      for (let i = 0; i < MISS_LOOK.blurLines; i++) {
        g.beginPath();
        g.moveTo(222 + 9 * i, 216);
        g.lineTo(222 + 9 * i, 252);
        g.stroke();
      }
      text(g, 'TOO MANY TO COUNT ✗', 400, 198, PAL.red, 14);
    } else {
      strip(g, MISS_LOOK.fewWaves, PAL.dim);
      text(g, 'LESS THAN ONE WAVE ✗', 400, 198, PAL.red, 14);
    }
  }
}

export default defineGame({
  mount(ctx) {
    FX.reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
