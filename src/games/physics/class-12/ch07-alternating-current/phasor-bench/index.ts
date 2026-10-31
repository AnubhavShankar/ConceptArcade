// Inspirations (code comment only): cooking-rush games (serve the order before the timer ends: a train that leaves on time), and photo-timing games
// (snap at the exact moment) for level 4. The player rigs a railway chai stall's electric kettle by hand (a clip along the coil, a voltage selector knob,
// a brew timer, a phasor arm) and flips the stall switch. The art is in art.ts.
// Never leak the answer: the plume has three fixed sizes (0.3, 1, 1.6), the stove glow three fixed colours, the photo one of three looks; the stall meter LCD
// is the only helper (live in round 1, for 1.5 s after a meter check in round 2, never in round 3); no voltage arrow is ever drawn on the phasor circle but the
// player's own arm; `hit` is a fixed point; every animation ends by 2.3 s.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { helperOn, paidFlash } from '@core/aidflash';
import { track, trackHandle } from '@core/mathkit';
import {
  CAMERA, COIL_TRACK, CUP, KNOB, PHASOR, STALL, camera, clamp01, clipX, coilBoard, counter, ease, foam, fuseBox, glidingCup, goalPill, gopal, grip, guard, iyer, kettle, knob, knobAngle,
  lcd, neonSign, orderSlip, photo, plume, scopeBox, spoutTip, station, stallBack, stream, tag, timerClock, train,
  type GopalMood, type IyerMood, type ScopeMode,
} from './art';
import { DEG, DIAL, LCD_OFF, PLUME, buildRounds, fault, goal, hintText, judge, lcdText, meterText, missText, verdictDelay, winText, type Fault, type Round, type Values } from './logic';

const ARIA = 'A railway platform: a chai-seller at his stall with an electric kettle, a pocket scope and a neon sign, and a passenger waiting at a train window.';
const ROLE = 'the chai-seller on Platform 3, whose electric kettle runs on the station’s AC supply';
const HEROES = [
  {
    story: 'Trains stop at Platform 3 for two minutes, and every passenger wants Gopal’s chai. His kettle’s coil burnt out, so he must fit a new one from a roll of bare nichrome wire. The rating on the kettle, power at a voltage, is an rms rating: the coil must give that power at that rms voltage. Too little resistance draws more current than the stall’s fuse allows.',
    objective: 'Slide the clip to the coil resistance that gives the rated power, before the whistle, in three trains.',
  },
  {
    story: 'The station’s supply changes from one platform to the next, and the only meter Gopal has is a pocket scope. A scope shows the peak of the wave, but the kettle’s selector is marked in rms volts, like every rating. The peak is √2 times the rms value.',
    objective: 'Turn the selector to the supply’s rms voltage, read from the scope’s peak, in three trains.',
  },
  {
    story: 'Each order needs a set amount of heat. In a resistor the power v·i rises and falls twice every cycle but never goes negative, and its average is V_rms I_rms = V²/R, half its peak. The timer switches the kettle off.',
    objective: 'Set the timer so the chai gets exactly the heat it needs: not lukewarm, not boiling over.',
  },
  {
    story: 'A travel magazine wants a photo of the neon CHAI sign at the instant it strikes. The neon strikes when the supply first reaches a set voltage; the camera is synced to the mains phasor, v = v_m sin ωt. The kettle’s current is in phase with the voltage, i = i_m sin ωt, so a relay on the kettle line can trigger the shot too.',
    objective: 'Swing the phasor arm to the instant the sign strikes, and get the shot in three trains.',
  },
];
const ORDERS = ['Masala', 'Ginger', 'Elaichi'];

type Out = 'win' | Fault;
type Cr = Extract<Round, { kind: 'coil' }>;

const clip: HandleSpec<Round> = {
  dial: 'r',
  at: (_r, v) => [clipX(v.r), COIL_TRACK.y],
  drag: (_r, px) => 10 + ((px - COIL_TRACK.x0) / (COIL_TRACK.x1 - COIL_TRACK.x0)) * 110,
  radius: 20,
};
const knobHandle: HandleSpec<Round> = {
  dial: 'v',
  at: (_r, v) => [KNOB.x + KNOB.tip * Math.sin(knobAngle(v.v)), KNOB.y - KNOB.tip * Math.cos(knobAngle(v.v))],
  drag: (_r, px, py) => 100 + ((Math.atan2(px - KNOB.x, KNOB.y - py) / DEG + 120) / 240) * 150,
  radius: 18,
};
const arm: HandleSpec<Round> = {
  dial: 'th',
  at: (_r, v) => [PHASOR.x + PHASOR.r * Math.cos(v.th * DEG), PHASOR.y - PHASOR.r * Math.sin(v.th * DEG)],
  drag: (_r, px, py) => (Math.atan2(PHASOR.y - py, px - PHASOR.x) / DEG + 360) % 360,
  radius: 18,
};

function level(n: 1 | 2 | 3 | 4, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  const fx = { shot: null as unknown, done: new Set<string>() };
  let hooked = false;
  let dragged = false;

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    const v = s.v as Values;
    if (!hooked) {
      hooked = true;
      A.canvas.addEventListener('pointerdown', () => (dragged = true));
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

    // the stall meter LCD, the only helper: live in round 1, for 1.5 s after a meter check in round 2, never in round 3
    const live = helperOn(r.assist, false, flash.since(t, k));
    A.canvas.dataset.lcd = live ? '1' : '0';

    const tv = shot ? verdictDelay(r, shot.v as Values) : 0;
    const since = shot ? rt - tv : -1; // seconds since the verdict
    const f = shot ? fault(r, shot.v as Values) : null;
    const out: Out | null = shot ? (shot.ok ? 'win' : (f ?? 'weak')) : null;
    if (out) A.canvas.dataset.take = out;
    else delete A.canvas.dataset.take;

    // defaults: the stall at rest, Gopal waiting
    let glowColor: string | null = null;
    let glowA = 1;
    let plumeH = 0;
    let plumeA = 1;
    let flip = 0;
    let lever = 0;
    let gMood: GopalMood = 'happy';
    let iMood: IyerMood = 'wait';
    let iU = 0;
    let dx = 0;
    let whistle = false;
    let kTilt = 0;
    let kLift = -1;
    let streamTo = false;
    let cupU = -1;
    let foamU = -1;
    let lit: 0 | 1 | 2 = 0;
    let armTh = v.th ?? 0;
    let camFlash = 0;
    let flashA = 0;
    let photoState: { kind: 'win' | 'early' | 'late'; u: number; label: string } | null = null;
    let bulbs = true;
    let blown = false;
    let timerAngle = ((v.t ?? 30) / 300) * Math.PI * 2;

    if (shot) {
      flip = rt < 0.5 ? ease(rt / 0.15) : 1 - ease((rt - 0.5) / 0.2);
      lever = ease(rt / 0.15);
      if (rt >= 0) once('click', () => A.float('CLICK', 40, 178, PAL.white));
    }

    // the serve: a low pour into the cup, the cup slides along the sill to Mr. Iyer
    const serve = (ts: number, gs: number, ge: number) => {
      kLift = 0;
      kTilt = 0.5 * ease((rt - ts) / 0.12) * (1 - ease((rt - (gs - 0.08)) / 0.08));
      streamTo = kTilt > 0.35;
      if (rt >= gs && rt < ge) cupU = (rt - gs) / (ge - gs);
    };
    // Gopal’s high pour after a win: the kettle held up, a 60 px arc of chai into the cup
    const highPour = () => {
      if (since < 0.1) return;
      const u = since - 0.1;
      kLift = 28 * ease(u / 0.15);
      kTilt = 0.55 * ease(u / 0.15) * (1 - ease((u - 0.3) / 0.1));
      streamTo = u > 0.12 && u < 0.4;
    };

    if (r.kind === 'coil' || r.kind === 'scope') {
      if (shot) {
        const base = out === 'blow' ? '#ffffff' : out === 'weak' ? '#8a2a1a' : '#ff9b3d';
        glowColor = base;
        glowA = ease(rt / 0.4);
        if (out === 'blow') {
          if (rt >= 0.45) {
            blown = true;
            bulbs = false;
            glowColor = null;
            gMood = 'sooty';
            once('bang', () => {
              A.float('BANG!', 56, 96, PAL.yellow);
              A.burst(40, 120, PAL.yellow, 14, 150);
              A.shake(6);
            });
            if (rt < 0.6) flashA = 0.35 * (1 - (rt - 0.45) / 0.15);
          }
          if (rt >= 0.55) iMood = 'blow';
          iU = rt - 0.55;
        } else if (out === 'weak') {
          plumeH = PLUME.weak;
          plumeA = ease((rt - 0.4) / 0.2);
          if (rt >= 1.0) {
            whistle = true;
            dx = 300 * ease((rt - 1.0) / 1.2);
            iMood = 'weak';
            once('tweet', () => A.float('TWEET!', 600, 230, PAL.yellow));
          }
          if (since >= 0) gMood = 'worried';
        } else {
          plumeH = PLUME.right;
          plumeA = ease((rt - 0.4) / 0.2);
          serve(0.5, 0.9, 1.1);
          if (since >= 0) {
            gMood = 'cheer';
            iMood = 'win';
            iU = since;
            once('aah', () => A.float('AAH!', 500, 140, PAL.green));
            highPour();
          }
        }
      }
    } else if (r.kind === 'brew') {
      timerAngle = (((v.t ?? 30) / 300) + clamp01(rt / 0.8)) * Math.PI * 2;
      if (shot) {
        glowColor = '#ff9b3d';
        glowA = ease(rt / 0.3);
        if (out === 'cold') {
          plumeH = PLUME.weak;
          plumeA = ease((rt - 0.5) / 0.2);
        } else if (out === 'over') {
          plumeH = PLUME.over;
          plumeA = ease((rt - 0.7) / 0.1);
          if (rt >= 0.6) foamU = (rt - 0.6) / 0.4;
          if (rt >= 0.7) once('pssh', () => A.float('PSSSH!', 200, 150, PAL.white));
        } else {
          plumeH = PLUME.right;
          plumeA = ease((rt - 0.5) / 0.3);
        }
        if (rt >= 0.8) once('ding', () => A.float('DING', 92, 244, PAL.yellow));
        serve(0.76, 0.88, 1.0);
        if (since >= 0) {
          if (out === 'win') {
            gMood = 'cheer';
            iMood = 'win';
            highPour();
          } else {
            gMood = 'worried';
            iMood = out === 'cold' ? 'cold' : 'over';
            whistle = true;
            once('tweet', () => A.float('TWEET!', 600, 230, PAL.yellow));
          }
          iU = since;
          once('react', () => A.float(out === 'win' ? 'AAH!' : out === 'cold' ? 'COLD!' : 'HOT!', 500, 140, out === 'win' ? PAL.green : PAL.orange));
        }
      }
    } else {
      const th = v.th ?? 0;
      if (shot) {
        armTh = th * ease(rt / 0.6);
        glowColor = '#ff9b3d';
        glowA = ease(rt / 0.3);
        const win = out === 'win';
        // the sign: dark through the sweep; strikes at the flash if the shot is right, before it if late, after it if early
        if (out === 'late') lit = rt >= 0.6 ? 2 : 0;
        else if (win) lit = rt >= 0.9 ? 2 : rt >= 0.6 ? 1 : 0;
        else lit = rt >= 0.9 ? 2 : 0;
        if (rt >= 0.6) {
          camFlash = clamp01((rt - 0.6) / 0.15);
          once('snap', () => {
            A.float('SNAP', CAMERA.x, CAMERA.y - 70, PAL.white);
            A.burst(CAMERA.x - 19, CAMERA.y - 12, '#ffffff', 10, 120);
          });
          const kind = (win ? 'win' : out === 'early' ? 'early' : 'late') as 'win' | 'early' | 'late';
          A.canvas.dataset.photo = kind;
          photoState = { kind, u: (rt - 0.6) / 0.2, label: win ? 'PERFECT SHOT' : kind === 'early' ? 'TOO EARLY' : 'TOO LATE' };
        }
        if (since >= 0) {
          iU = since;
          if (win) {
            gMood = 'cheer';
            iMood = 'pose';
          } else {
            gMood = 'worried';
            iMood = 'blink';
            whistle = true;
            once('tweet', () => A.float('TWEET!', 600, 230, PAL.yellow));
          }
        }
      } else delete A.canvas.dataset.photo;
    }
    A.canvas.dataset.train = String(Math.round(dx));
    A.canvas.dataset.plume = shot ? String(plumeH) : '';
    A.canvas.dataset.glow = shot ? (glowColor === null ? 'off' : glowColor === '#ffffff' ? 'white' : glowColor === '#8a2a1a' ? 'red' : 'orange') : '';

    // ---- compose the frame ----
    station(g, t, k);
    if (n === 4) neonSign(g, t, lit);
    train(g, t, dx, k === 2);
    iyer(g, t, { mood: iMood, u: iU, dx });
    stallBack(g, t, bulbs, k === 2);
    fuseBox(g, lever, blown);
    gopal(g, t, { mood: gMood, flip, kettleLift: kLift, idle: !shot });
    g.globalAlpha = 1;
    counter(g, glowColor, glowA);
    kettle(g, t, kTilt, Math.max(0, kLift));
    if (streamTo) stream(g, spoutTip(kTilt, Math.max(0, kLift)), [CUP.x, CUP.y - 6]);
    plume(g, t, plumeH, plumeA);
    if (foamU >= 0) foam(g, foamU);
    if (cupU >= 0) glidingCup(g, cupU);
    guard(g, t, { whistle, sad: false });

    // the level's apparatus and the player's own setting by its handle
    const mode: ScopeMode = n === 1 ? 'off' : n === 2 ? 'sine' : n === 3 ? 'power' : 'phasor';
    const rmsLabel = r.kind === 'sign' ? `${r.rms} ${r.trig === 'v' ? 'V' : 'A'} rms` : '';
    scopeBox(g, t, mode, { peak: r.kind === 'scope' ? `${r.vm} V peak` : '', rms: rmsLabel, arm: armTh });
    if (n === 1) {
      coilBoard(g, v.r ?? DIAL.r.start);
      grip(g, clipX(v.r ?? DIAL.r.start), COIL_TRACK.y, 'h');
      const rr1 = r as Cr;
      tag(g, `${rr1.p} W · ${rr1.v} V`, 125, 245, PAL.white, 11);
      tag(g, `${v.r} Ω`, clipX(v.r ?? DIAL.r.start), 260, PAL.yellow, 12);
      if (k === 0 && !dragged && !shot) {
        g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5);
        tag(g, 'drag', clipX(v.r ?? DIAL.r.start), 326, PAL.yellow, 11);
        g.globalAlpha = 1;
      }
    } else if (n === 2) {
      knob(g, v.v ?? DIAL.v.start);
      const [hx, hy] = knobHandle.at(r, { v: v.v ?? DIAL.v.start });
      grip(g, hx, hy, 'rot');
      tag(g, `${v.v} V`, 216, 266, PAL.yellow, 12, 'left');
    } else if (n === 3) {
      const b = r as Extract<Round, { kind: 'brew' }>;
      orderSlip(g, ORDERS[k], `${b.e} kJ`);
      timerClock(g, 92, 270, timerAngle, `${v.t} s`);
      tag(g, `${b.v} V · ${b.r} Ω`, 170, 258, PAL.white, 11);
      railStrip(g);
      track(g, DIAL.t.min, DIAL.t.max);
      const hx = 60 + (((v.t ?? 30) - 30) / 270) * 520;
      grip(g, hx, 322, 'h');
      tag(g, `${v.t} s`, hx, 296, PAL.yellow, 12);
    } else {
      camera(g, camFlash);
      const ha = (v.th ?? 0) * DEG;
      const hx = PHASOR.x + PHASOR.r * Math.cos(ha);
      const hy = PHASOR.y - PHASOR.r * Math.sin(ha);
      grip(g, hx, hy, 'rot');
      let lx = PHASOR.x + (PHASOR.r + 26) * Math.cos(ha);
      let ly = PHASOR.y - (PHASOR.r + 26) * Math.sin(ha) + 4;
      const side = Math.cos(ha) >= 0 ? 1 : -1;
      if (ly < 78 || ly > 138) {
        lx = hx + side * 32;
        ly = hy + 4;
      }
      tag(g, `${v.th}°`, lx, ly, PAL.yellow, 12);
    }

    // the stall meter LCD (hung in front of the train)
    const lcdOn = live;
    lcd(g, lcdOn ? lcdText(r, v) : LCD_OFF, lcdOn ? (r.assist === 0 ? PAL.green : PAL.yellow) : PAL.dim);
    if (photoState) photo(g, photoState.kind, photoState.u, photoState.label);
    if (flashA > 0) {
      g.fillStyle = `rgba(255,255,255,${flashA.toFixed(3)})`;
      g.fillRect(0, 0, STALL.x + 228, 306);
    }
    if (!shot) goalPill(g, goal(r));
  }

  const dials: DialSpec<Round>[] = [];
  const handles: HandleSpec<Round>[] = [];
  if (n === 1) {
    dials.push({ key: 'r', aria: 'Coil resistance in ohms', label: 'Coil', unit: 'Ω', step: 1, min: DIAL.r.min, max: DIAL.r.max, start: DIAL.r.start });
    handles.push(clip);
  } else if (n === 2) {
    dials.push({ key: 'v', aria: 'Kettle voltage selector in rms volts', label: 'Selector', unit: 'V', step: 10, min: DIAL.v.min, max: DIAL.v.max, start: DIAL.v.start });
    handles.push(knobHandle);
  } else if (n === 3) {
    dials.push({ key: 't', aria: 'Brew timer in seconds', label: 'Timer', unit: 's', step: 10, min: DIAL.t.min, max: DIAL.t.max, start: DIAL.t.start });
    handles.push(trackHandle('t', () => DIAL.t.min, () => DIAL.t.max));
  } else {
    dials.push({ key: 'th', aria: 'Camera sync angle in degrees', label: 'Sync ωt', unit: '°', step: 5, min: DIAL.th.min, max: DIAL.th.max, start: DIAL.th.start });
    handles.push(arm);
  }

  return {
    hero: { name: 'Gopal', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: {
      button: '🔎 Meter check',
      aria: 'Meter check: read the stall meter for this setting',
      read: (r, v) => {
        flash.paid();
        return meterText(r, v as Values);
      },
    },
    fire: { button: '☕ Switch on', aria: 'Flip the stall switch and serve' },
    judge: (r, v) => judge(r, v as Values),
    miss: (r, v) => missText(r, v as Values),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => [320, 80],
    delay: (r, v) => verdictDelay(r, v as Values),
    draw,
  };
}

/** A dark strip behind the bottom track so its line and labels read against the rails. */
function railStrip(g: CanvasRenderingContext2D) {
  g.fillStyle = 'rgba(6,10,36,0.7)';
  g.fillRect(50, 310, 540, 30);
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
