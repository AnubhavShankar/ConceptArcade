// Inspirations (code comment only): movie-stunt games (each attempt is a "take" and the director reacts), the sparking lab sets of old monster films, and rhythm
// games for level 4 (the flash has to land on the beat). The player rigs a real plate capacitor (charger voltage, plate gap, dielectric panel and charger switch,
// plate size) and calls "Action!". The art is in art.ts.
// Never leak the answer: the core gauge shows only the fixed fills 55%, 80% and 100%; the plates always carry six + and six − before a take; the rig meter LCD is the
// only helper (live in round 1, for 1.5 s after a meter check in round 2, never in round 3); `hit` is a fixed point; every animation ends by 2.4 s.
// Level 4: the flash fires when the charger ramp reaches 3 kV per millimetre of the player's gap, never at the cue.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { fmt } from '@core/judge';
import { TRACK, track, trackHandle } from '@core/mathkit';
import { along, line, text, trace } from '@core/neon';
import { GRIP_MIN, goalLine, grip, tint } from './ux';
import {
  ANTENNA, CAMERA, RACK, RIG, STRIKER, SWITCH, TITAN, bolt, cable, cablePts, camera, clamp01, clapper, crankXFor, daily, desk, director, ease, plateW, rack, rig, slab, slotX, smoke, stage, supplyPts, titan, topY, zara,
  type DailyKind, type DirectorState, type TitanOpts, type ZaraMood,
} from './art';
import {
  DIAL, EB, FILL, LCD_OFF, buildRounds, cueRt, fault, flashRt, hintText, judge, lcdText, meterText, missText, ramp, targetQ, verdictDelay, winText, type Fault, type Round,
} from './logic';

const ARIA = 'A film set: a special-effects chief beside a giant parallel-plate capacitor rig wired to a sleeping robot prop, with the director watching from his chair.';
const ROLE = 'the special-effects chief on a robot movie, who wakes the giant robot prop with a real plate capacitor';
const HEROES = [
  {
    story: 'The film’s big scene: the giant robot TITAN-7 wakes when lightning hits it. Zara’s rig is a real parallel-plate capacitor. Its plates hold a charge Q = CV, and when she pulls the lever it all rushes into the robot’s power core. Air breaks down at about 3 kV per millimetre, so too high a voltage for the gap makes the rig flash over. (Zara is a trained high-voltage technician. Never try this at home.)',
    objective: 'Set the charger voltage so the core gets exactly the charge it needs, in three takes.',
  },
  {
    story: 'Now the charger is fixed, so Zara sets the gap between the plates instead. C = ε₀A/d: a smaller gap gives more capacitance, and a dielectric panel that fills the gap multiplies C by its constant K. Air still flashes over at 3 kV per millimetre; the panels are far stronger.',
    objective: 'Crank the top plate to the gap that gives the core its charge, in three takes.',
  },
  {
    story: 'The rig is already charged, and the director wants a change. A dielectric panel slid into the gap multiplies C by K. With the charger still connected the voltage stays fixed and more charge flows in; unplugged, the charge is trapped and the voltage falls. The cable now stops short of the antenna: the spark jumps the striker gap only at 3 kV per millimetre or more, and above the shell’s rating it punches into the robot instead.',
    objective: 'Pick the panel and the charger switch so the spark lands and the core gets its charge, in three takes.',
  },
  {
    story: 'The finale: a sheet of lightning between the plates themselves lights TITAN-7 for the poster shot. The charger ramps up until the air breaks down at E = 3 × 10⁶ V/m, so the gap sets when the flash fires. At that moment the field’s energy is all released: u = ½ε₀E² in every cubic metre between the plates, so the plate area sets how bright it is.',
    objective: 'Set the gap and the plate area so the flash fires on cue and exposes the shot just right, in three takes.',
  },
];

const PEEK_SECONDS = 1.5;
type Out = 'win' | Fault;

const crank: HandleSpec<Round> = { dial: 'd', at: (r, v) => [crankXFor(r.kind === 'flash' ? plateW(v.a) : RIG.w), topY(v.d)], drag: (_r, _px, py) => (RIG.bottom - RIG.plate - py) / RIG.mm, radius: GRIP_MIN };
/** Where the plate-area grip sits (level 4): below the bottom plate's right edge, clear of the screw jack's hand-wheel. */
const AREA_Y = RIG.bottom + 20;
/** The round's goal, one short line on the scene at the start of each take. It states only what the hint line already gives. */
const goalText = (r: Round) =>
  r.kind === 'wake' ? `Goal: charge the plates so the core holds ${r.q} µC`
  : r.kind === 'gap' ? `Goal: set the gap so the core gets ${r.q} µC`
  : r.kind === 'panel' ? `Goal: land the spark and give the core ${fmt(targetQ(r))} µC`
  : `Goal: flash on the ${r.cue} kV cue, exposure ${r.joules} J`;
const openAngle = (-140 * Math.PI) / 180;
const openTip: [number, number] = [SWITCH.x + SWITCH.len * Math.sin(openAngle), SWITCH.y - SWITCH.len * Math.cos(openAngle)];

function level(n: 1 | 2 | 3 | 4, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  let meterPending = false;
  let meterAt = -10;
  let lastK = -1;
  let clapAt = -10;
  const fx = { shot: null as unknown, done: new Set<string>() };

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    const v = s.v;
    if (k !== lastK) {
      lastK = k;
      meterPending = false;
      meterAt = -10;
      clapAt = t;
      A.float('CLACK', 320, 100, PAL.white);
    }
    if (meterPending && !shot) {
      meterPending = false;
      meterAt = t;
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

    // the rig meter LCD, the only helper: live in round 1, for 1.5 s after a meter check in round 2, never in round 3
    const peeking = !shot && r.assist === 1 && t - meterAt >= 0 && t - meterAt < PEEK_SECONDS;
    const live = r.assist === 0 || peeking;
    A.canvas.dataset.lcd = live ? '1' : '0';
    const lcd = live ? lcdText(r, v) : LCD_OFF;
    const lcdColor = r.assist === 0 ? PAL.green : PAL.yellow;

    const tv = shot ? verdictDelay(r, shot.v) : 0;
    const since = shot ? rt - tv : -1; // seconds since the verdict
    const f = shot ? fault(r, shot.v) : null;
    const out: Out | null = shot ? (shot.ok ? 'win' : (f ?? 'short')) : null;
    if (out) A.canvas.dataset.take = out;
    else delete A.canvas.dataset.take;
    const x0 = RIG.cx - RIG.w / 2;

    // defaults: the rig at rest
    let d = 5;
    let w = RIG.w;
    let field = 0.15;
    let tokens = 6;
    let needle = 0;
    let closed = 1;
    let lever = -30;
    let goggles = false;
    let both = 0;
    let zMood: ZaraMood = 'happy';
    let fist = false;
    let dState: DirectorState = 'idle';
    let dU = 0;
    let slabLeft: number | null = null;
    let slabLabel: string | undefined;
    let band: [number, number] | undefined;
    let cue: number | undefined;
    let striker = false;
    let iris = 0;
    let flashA = 0;
    let coreOpts: TitanOpts['core'] = null;
    let fill = 0;
    const T: TitanOpts = { eyes: 'off', droop: 15, turn: 0, spin: 0, arms: 0, awake: false, pump: 0, slump: 0, steam: -1, fuse: -1, smoke: -1, core: null };
    const extras: (() => void)[] = [];
    const supplyTokens = (f0: number, plus: boolean, pts: [number, number][]) => {
      for (let i = 0; i < 6; i++) {
        const fi = f0 - i * 0.1;
        if (fi > 0 && fi < 1) {
          const [px, py] = along(pts, fi);
          text(g, plus ? '+' : '−', px, py + 4, plus ? PAL.yellow : PAL.cyan, 13);
        }
      }
    };

    // the take, shared by every level: the lever pull, the director's call and the reactions after the verdict
    const pullAt = r.kind === 'panel' ? 0.5 : 0;
    if (shot) {
      lever = -30 + 70 * clamp01((rt - pullAt) / 0.3);
      both = ease((rt - pullAt) / 0.3);
      goggles = rt >= pullAt + 0.15;
      dState = 'action';
      dU = rt - pullAt;
      if (rt >= pullAt) once('action', () => A.float('ACTION!', 556, 236, PAL.yellow));
      if (rt >= pullAt + 0.3) once('clunk', () => A.float('CLUNK', 52, 228, PAL.white));
    }

    if (r.kind === 'wake' || r.kind === 'gap') {
      d = r.kind === 'gap' ? v.d : r.gap;
      needle = r.kind === 'gap' ? r.v : v.v;
      if (r.kind === 'gap' && r.k > 1) {
        slabLeft = x0;
        slabLabel = `K = ${r.k}`;
      }
      const notch = `${r.q} µC`;
      if (shot && out === 'flash') {
        // flashover: arcs snap between the plates, the charge is lost, the robot stays asleep
        if (rt >= 0.3) {
          once('bang', () => {
            A.float('BANG!', RIG.cx, topY(d) - 12, '#bfe0ff');
            A.shake(8);
            A.burst(RIG.cx, topY(d) + 8, '#bfe0ff', 18, 150);
          });
          flashA = rt < 0.45 ? 0.35 * (1 - (rt - 0.3) / 0.15) : 0;
          extras.push(() => {
            if (rt < 1) {
              g.globalAlpha = rt < 0.7 ? 1 : clamp01((1 - rt) / 0.3);
              for (let i = 1; i <= 3; i++) bolt(g, x0 + (RIG.w * i) / 4, topY(d) + RIG.plate, x0 + (RIG.w * i) / 4 + 6 * (i - 2), RIG.bottom - RIG.plate, t, i);
              g.globalAlpha = 1;
            }
            smoke(g, RIG.cx, (topY(d) + RIG.bottom) / 2, rt - 0.3, 6);
          });
        }
        if (rt >= 0.35) {
          zMood = 'frazzled';
          dState = 'duck';
          dU = rt - 0.35;
        }
        if (since >= 0) once('cut', () => A.float('CUT! CUT!', 556, 236, PAL.red));
      } else if (shot) {
        const pts = cablePts(d, w, false);
        const p = clamp01((rt - 0.3) / 0.5);
        if (rt >= 0.3) {
          extras.push(() => {
            g.globalAlpha = rt < 0.95 ? 1 : clamp01((1.1 - rt) / 0.15);
            trace(g, pts, p, '#ffe9a8', 3);
            if (rt < 0.85) for (let i = 0; i < 5; i++) {
              const fi = p - i * 0.1;
              if (fi > 0 && fi < 1) {
                const [px, py] = along(pts, fi);
                text(g, '+', px, py + 4, PAL.yellow, 13);
              }
            }
            g.globalAlpha = 1;
          });
        }
        const target = out === 'win' ? FILL.win : out === 'short' ? FILL.short : FILL.over;
        fill = target * ease((rt - 0.8) / 0.15);
        coreOpts = { fill, color: out === 'win' ? PAL.green : out === 'short' ? PAL.yellow : PAL.red, flash: out === 'over' && rt >= 0.85, overflow: out === 'over' ? ease((rt - 0.8) / 0.15) : 0, notch };
        reactions(out!, since);
      }
      if (!coreOpts) coreOpts = { fill: 0, color: PAL.green, flash: false, overflow: 0, notch };
    } else if (r.kind === 'panel') {
      d = 5;
      needle = r.v0;
      band = [r.vLo, r.vHi];
      striker = true;
      closed = v.on ? 1 : 0;
      const k3 = v.k;
      const notch = `${fmt(targetQ(r))} µC`;
      if (!shot) {
        if (k3 > 1) {
          slabLeft = 342;
          slabLabel = `K = ${k3}`;
        }
      } else {
        // the panel slides in and the switch settles (0 to 0.5 s)
        if (k3 > 1) {
          slabLeft = 342 + (x0 - 342) * ease(rt / 0.5);
          slabLabel = `K = ${k3}`;
        } else if (rt < 0.5 && Math.floor(rt * 6) % 2 === 0) {
          extras.push(() => text(g, 'air only', RIG.cx, topY(d) - 9, PAL.yellow, 11));
        }
        if (!v.on) {
          once('click', () => A.float('CLICK', SWITCH.x, SWITCH.y - 34, PAL.white));
          needle = r.v0 + (r.v0 / k3 - r.v0) * ease((rt - 0.15) / 0.35);
        } else if (k3 > 1) {
          if (rt >= 0.5) tokens = 12;
          else if (rt >= 0.1) {
            const sp = supplyPts(d, w);
            const f0 = (rt - 0.1) / 0.4;
            extras.push(() => {
              supplyTokens(f0, true, sp.red);
              supplyTokens(f0, false, sp.black);
            });
          }
        }
        const pts = cablePts(d, w, true);
        if (rt >= 0.7) {
          extras.push(() => {
            g.globalAlpha = rt < 0.95 ? 1 : clamp01((1.1 - rt) / 0.15);
            trace(g, pts, (rt - 0.7) / 0.25, '#ffe9a8', 3);
            g.globalAlpha = 1;
          });
        }
        // the spark at the striker gap (0.95 to 1.10 s)
        if (rt >= 0.95 && rt < 1.1) {
          if (out === 'nospark') {
            once('fzzt', () => A.float('fzzt', 548, 90, PAL.dim));
            extras.push(() => {
              g.globalAlpha = 1 - (rt - 0.95) / 0.15;
              line(g, STRIKER.x, STRIKER.y + 4, STRIKER.x + (Math.floor(t * 30) % 2 ? 4 : -4), STRIKER.y + 12, '#bfe0ff', 2);
              g.globalAlpha = 1;
            });
          } else if (out === 'punch') {
            extras.push(() => bolt(g, STRIKER.x, STRIKER.y + 4, TITAN.x + 16, 200, t, 3, 2.5, 8));
          } else {
            extras.push(() => bolt(g, STRIKER.x, STRIKER.y + 4, ANTENNA.x, ANTENNA.y - 4, t, 5, 2.5, 4));
          }
        }
        if (out === 'punch' && rt >= 1) {
          once('scorch', () => A.burst(TITAN.x + 16, 200, PAL.yellow, 14, 140));
          extras.push(() => {
            g.fillStyle = 'rgba(8,8,16,0.85)';
            g.beginPath();
            g.ellipse(TITAN.x + 16, 200, 7, 5, 0.4, 0, Math.PI * 2);
            g.fill();
          });
        }
        // the core fills (1.10 to 1.40 s) with the fixed fills only; a punch-through shows the red overload flash instead
        const target = out === 'win' ? FILL.win : out === 'short' ? FILL.short : out === 'over' ? FILL.over : 0;
        fill = target * ease((rt - 1.1) / 0.3);
        coreOpts = { fill, color: out === 'win' ? PAL.green : out === 'short' ? PAL.yellow : PAL.red, flash: out === 'punch' && rt >= 1.1, overflow: out === 'over' ? ease((rt - 1.1) / 0.3) : 0, notch, shell: `SHELL ${r.vHi} kV` };
        reactions(out!, since);
      }
      if (!coreOpts) coreOpts = { fill: 0, color: PAL.green, flash: false, overflow: 0, notch, shell: `SHELL ${r.vHi} kV` };
    } else {
      // level 4: the finale. The charger ramps; the shutter opens at the cue; the air breaks down at 3 kV per millimetre of the player's gap
      d = v.d;
      w = plateW(v.a);
      cue = r.cue;
      T.awake = true;
      T.eyes = 'on';
      T.droop = 0;
      T.turn = t % 4 < 0.9 ? Math.sin((Math.PI * (t % 4)) / 0.9) : 0;
      coreOpts = { fill: 1, color: PAL.green, flash: false, overflow: 0 };
      if (shot) {
        const rtFlash = flashRt(shot.v.d);
        const rtCue = cueRt(r.cue);
        const V = ramp(rt);
        const fired = rt >= rtFlash;
        needle = fired ? 0 : V;
        field = fired ? 0.15 : 0.15 + 0.85 * (V / (EB * shot.v.d)) ** 2;
        iris = ease((rt - rtCue) / 0.03) * (1 - ease((rt - rtCue - 0.09) / 0.03));
        A.canvas.dataset.needle = needle.toFixed(2);
        if (rt >= rtCue) {
          once('snap', () => {
            A.float('SNAP', CAMERA.x, CAMERA.y - 70, PAL.white);
            A.canvas.dataset.shutterAt = rt.toFixed(2);
          });
        }
        if (fired) {
          once('boom', () => {
            A.float('BOOM', RIG.cx, topY(d) - 14, '#bfe0ff');
            A.shake(8);
            A.canvas.dataset.flashAt = rt.toFixed(2);
          });
          if (rt < rtFlash + 0.25) {
            flashA = 0.45 * (1 - (rt - rtFlash) / 0.25);
            const xs = RIG.cx - w / 2;
            extras.push(() => {
              for (let i = 0; i < 5; i++) {
                const bx = xs + (w * (i + 0.5)) / 5;
                bolt(g, bx, topY(d) + RIG.plate, bx + 8 * (i % 2 ? 1 : -1), RIG.bottom - RIG.plate, t, i + 7, 2.5, 7);
              }
            });
          }
        }
        if (since >= 0) {
          const kind = out as DailyKind;
          extras.push(() => daily(g, kind, since));
          once('cut', () => A.float(out === 'win' ? 'CUT! PRINT IT!' : 'CUT…', 556, 236, out === 'win' ? PAL.green : PAL.orange));
          if (out === 'win') {
            zMood = 'cheer';
            fist = true;
            dState = 'win';
            dU = since;
            T.pump = ease(since / 0.25);
          } else {
            zMood = 'worried';
            dState = 'slump';
            dU = since;
            T.slump = ease(since / 0.3);
          }
        }
      } else {
        delete A.canvas.dataset.needle;
        delete A.canvas.dataset.flashAt;
        delete A.canvas.dataset.shutterAt;
      }
    }
    if (!shot || r.kind === 'flash') delete A.canvas.dataset.fill;
    else A.canvas.dataset.fill = fill.toFixed(2);

    /** The reactions of Zara, the Director and TITAN-7 after the verdict (levels 1 to 3). */
    function reactions(o: Out, u: number) {
      if (u < 0) return;
      if (o === 'win') {
        zMood = 'cheer';
        fist = true;
        dState = 'win';
        dU = u;
        T.eyes = 'on';
        T.droop = 15 * (1 - ease(u / 0.3));
        T.arms = ease(u / 0.4);
        T.steam = u;
        once('cut', () => {
          A.float('CUT! PRINT IT!', 556, 236, PAL.green);
          A.float('WHIRR', TITAN.x, 150, PAL.cyan);
        });
      } else if (o === 'short' || o === 'nospark') {
        zMood = 'worried';
        dState = 'slump';
        dU = u;
        T.eyes = u < 0.8 ? 'flicker' : 'off';
        T.droop = 15 + 8 * ease(u / 0.3);
        once('cut', () => {
          A.float('CUT…', 556, 236, PAL.orange);
          A.float('pfft', TITAN.x, 150, PAL.dim);
        });
      } else {
        zMood = 'worried';
        dState = 'duck';
        dU = u;
        T.spin = clamp01(u / 1);
        T.fuse = u;
        T.smoke = u;
        once('cut', () => {
          A.float('CUT! CUT!', 556, 236, PAL.red);
          A.burst(TITAN.x + 22, 189, PAL.yellow, 14, 150);
        });
      }
    }

    // ---- compose the frame ----
    stage(g, t);
    tint(g, k, t, 590, 26);
    const rackOn = r.kind === 'panel';
    desk(g, { needle, band, cue, lcd, lcdColor, closed, lever });
    camera(g, t, n === 4 && !!shot, iris);
    rig(g, { d, w, field, tokens, crank: r.kind === 'gap' || r.kind === 'flash', areaTab: r.kind === 'flash', label: !!shot });
    if (slabLeft !== null) slab(g, d, w, slabLeft, slabLabel);
    if (r.kind === 'gap' && r.k === 1) text(g, 'air', RIG.cx, (topY(d) + RIG.bottom) / 2 + 4, PAL.dim, 11);
    if (r.kind === 'wake') text(g, `gap ${r.gap} mm`, RIG.cx, topY(d) - 9, PAL.dim, 11);
    if (rackOn) rack(g, v.k);
    if (r.kind === 'wake') track(g, DIAL.v.min, DIAL.v.max);
    const sp = supplyPts(d, w);
    cable(g, sp.black, '#2a2a30', 3);
    cable(g, sp.red, '#e0282d', 3);
    cable(g, cablePts(d, w, striker), '#e0a030', 4);
    if (striker) {
      g.fillStyle = '#b87333';
      g.beginPath();
      g.arc(STRIKER.x, STRIKER.y, 5, 0, Math.PI * 2);
      g.fill();
      if (r.kind === 'panel') text(g, `striker gap ${r.striker} mm`, STRIKER.x + 14, STRIKER.y - 2, PAL.dim, 11, 'left');
    }
    T.core = coreOpts;
    titan(g, t, T);
    director(g, t, dState, dU);
    zara(g, t, { mood: zMood, goggles, lever, both, fist });
    for (const fn of extras) fn();
    if (t - clapAt < 0.8) clapper(g, t - clapAt, k === 2 ? 'FINAL TAKE' : `TAKE ${k + 1}`);
    // The grips of the handles, each with the player's own setting beside it, and the round's goal on top of everything but the white flash.
    if (!shot) {
      const cue1 = n === 1 && k === 0;
      if (r.kind === 'wake') {
        const hx = TRACK.x0 + ((v.v! - DIAL.v.min) / (DIAL.v.max - DIAL.v.min)) * (TRACK.x1 - TRACK.x0);
        grip(g, A.canvas, t, { x: hx, y: TRACK.y, r: 20, dir: 'h', read: `${v.v} kV`, side: hx > 450 ? 'left' : 'right', cue: cue1, glass: true });
      } else if (r.kind === 'gap' || r.kind === 'flash') {
        grip(g, A.canvas, t, { x: crankXFor(r.kind === 'flash' ? plateW(v.a!) : RIG.w), y: topY(v.d!), r: GRIP_MIN, dir: 'v', read: `${v.d} mm`, side: 'right', glass: true });
        if (r.kind === 'flash') grip(g, A.canvas, t, { x: RIG.cx + plateW(v.a!) / 2 + 3, y: AREA_Y, r: GRIP_MIN, dir: 'h', read: `${fmt(v.a!)} m²`, side: 'right', glass: true });
      } else {
        grip(g, A.canvas, t, { x: slotX(v.k!), y: RACK.y + RACK.h / 2, r: GRIP_MIN, dir: 'h', read: v.k === 1 ? 'panel: none (air)' : `panel: K = ${v.k}`, side: 'above', glass: true });
        const [sx, sy] = v.on ? [SWITCH.x, SWITCH.y - SWITCH.len] : openTip;
        grip(g, A.canvas, t, { x: sx, y: sy, r: GRIP_MIN, dir: 'v', read: `switch ${v.on ? 'ON' : 'OFF'}`, side: 'left', glass: true });
      }
    }
    goalLine(g, goalText(r), A.t, shot !== null);
    if (flashA > 0) {
      g.fillStyle = `rgba(255,255,255,${flashA.toFixed(3)})`;
      g.fillRect(0, 0, 640, 340);
    }
  }

  const dials: DialSpec<Round>[] = [];
  const handles: HandleSpec<Round>[] = [];
  const dD = (start: number): DialSpec<Round> => ({ key: 'd', aria: 'Gap between the plates in millimetres', label: 'Gap', unit: 'mm', step: 1, min: DIAL.d.min, max: DIAL.d.max, start });
  if (n === 1) {
    dials.push({ key: 'v', aria: 'Charger voltage in kilovolts', label: 'Charger', unit: 'kV', step: 1, min: DIAL.v.min, max: DIAL.v.max, start: DIAL.v.start });
    handles.push(trackHandle('v', () => DIAL.v.min, () => DIAL.v.max));
  } else if (n === 2) {
    dials.push(dD(12));
    handles.push(crank);
  } else if (n === 3) {
    dials.push(
      { key: 'k', aria: 'Dielectric panel to slide in', label: 'Panel', unit: '', step: 1, min: DIAL.k.min, max: DIAL.k.max, start: DIAL.k.start, text: (x) => (x === 1 ? 'none (air)' : `K = ${x}`) },
      { key: 'on', aria: 'Charger switch: 1 connected, 0 unplugged', label: 'Charger', unit: '', step: 1, min: DIAL.on.min, max: DIAL.on.max, start: DIAL.on.start, text: (x) => (x ? 'connected' : 'unplugged') },
    );
    handles.push(
      { dial: 'k', at: (_r, v) => [slotX(v.k), RACK.y + RACK.h / 2], drag: (_r, px) => Math.floor((px - RACK.x0) / RACK.w) + 1, radius: GRIP_MIN },
      { dial: 'on', at: (_r, v) => (v.on ? [SWITCH.x, SWITCH.y - SWITCH.len] : openTip), drag: (_r, _px, py) => (py < SWITCH.y ? 1 : 0), radius: GRIP_MIN },
    );
  } else {
    dials.push(dD(2), { key: 'a', aria: 'Plate area in square metres', label: 'Plate area', unit: 'm²', step: DIAL.a.step, min: DIAL.a.min, max: DIAL.a.max, start: DIAL.a.start });
    handles.push(crank, { dial: 'a', at: (_r, v) => [RIG.cx + plateW(v.a) / 2 + 3, AREA_Y], drag: (_r, px) => (2 * (px - RIG.cx) - 60) / 60, radius: GRIP_MIN });
  }

  return {
    hero: { name: 'Zara', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: {
      button: '🔎 Meter check',
      aria: 'Meter check: read the rig meter for this setting',
      read: (r, v) => {
        meterPending = true;
        return meterText(r, v);
      },
    },
    fire: { button: '🎬 Action!', aria: 'Call action and pull the discharge lever' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => [320, 70],
    delay: (r, v) => verdictDelay(r, v),
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
