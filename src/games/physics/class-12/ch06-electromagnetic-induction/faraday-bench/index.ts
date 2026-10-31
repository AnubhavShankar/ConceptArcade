// Inspirations (code comment only): deep-sea exploration games (a diver, a robot submarine and the dark below), the real practice of powering sealed underwater lamps and
// sensors by induction because seawater shorts any plug, and rhythm games for level 4 (the brightest flash lands on the steepest beat).
// Kavya, the salvage diver, turns and sizes a hoop by hand (level 1: its tilt, level 2: a ring's size, level 3: how fast to flip it, level 4: its turns) and signals the ship.
// Tug, the robot submarine, works the station console. Wink, the sealed beacon, lights from the emf: the art is in art.ts.
// Never leak the answer: the console LCD is the only place the player's resulting emf or current is drawn, live in round 1, for 1.5 s after a check in round 2 and never in
// round 3; Wink's glow on a miss is one fixed value (GLOW) and never proportional to the emf; `hit` is a fixed point; every animation ends by 2.4 s.
import { helperOn, paidFlash } from '@core/aidflash';
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { trackHandle, verdict } from '@core/mathkit';
import { text } from '@core/neon';
import {
  HOOP, KAVYA, PAD, PX_PER_CM, RING_Y, SLEEVE, WINK_AT, WINK_L2,
  calm, clamp01, consoleBody, consoleControls, ease, easeOut, field, grip, graphScreen, hoop, hoopLeads, kavya, pad, pedestal, ring, ringLeads, sea, slate, sleeve, tag, topside, trackBar, tug, wink, winkBob,
  type KavyaMood, type TopState, type TugMood, type WinkMood,
} from './art';
import {
  LCD_OFF, SHOW_AT, SHOW_STEP, buildRounds, crackAt, fault, goalLine, hintText, judge, lcdText, meterText, missText, rad, slopes, steepest, verdictDelay, winText, winkGlow,
  type Round, type Values,
} from './logic';

const ROLE = 'a salvage diver who lights a sealed beacon with a hoop of wire over a seabed electromagnet';
const HEROES = [
  {
    story: 'Kavya is marking a shipwreck for the survey ship above. Seawater would short any plug, so Wink, the beacon, is sealed in glass and wired to a hoop of wire. The station’s docking pad is an electromagnet whose field points straight up through the hoop. The flux is Φ = BA cos θ, where θ is the tilt of the hoop’s normal from the field. When Tug switches the pad off, the flux dies in 0.5 s, and the emf ε = NΔΦ/Δt lights Wink only while the flux is changing.',
    objective: 'Tilt the hoop so that, when the pad switches off, Wink gets exactly the voltage it needs, in three dives.',
  },
  {
    story: 'Next, the charging sleeve: a long tube on the station, wound as a solenoid, so the field inside is B = μ₀nI. Kavya lowers a ring of 200 turns into it, flat across the tube, and Tug ramps the current up in 0.2 s. The flux through the ring rises with the current, and Wink glows only while the current is changing.',
    objective: 'Pick the ring size that gives Wink exactly its voltage when the current ramps, in three dives.',
  },
  {
    story: 'The flip: Kavya holds the hoop flat over the docking pad and turns it over through 180°. The flux per turn goes from +BA to −BA, a change of 2BA, so the average emf is 2NBA/t and the current through Wink is ε/R. How fast she flips sets the current.',
    objective: 'Choose how fast to flip so Wink gets exactly the current it needs, in three dives.',
  },
  {
    story: 'The ship wants a signal it can film. The station’s program drives the flux per turn through the hoop step by step, as its screen shows. The emf in each step is the slope of the graph, so Wink flashes brightest in the steepest step, whether the flux is rising or falling. Kavya chooses how many turns her hoop has.',
    objective: 'Pick the number of turns so Wink reaches exactly its rating at the brightest moment, without cracking, in three dives.',
  },
];
const ARIA = 'Under the sea beside a shipwreck: a diver holds a wire hoop over a seabed electromagnet pad, a sealed beacon floats above the hoop, and a small robot submarine waits at the station console.';
const SLATES = ['DIVE 1', 'DIVE 2', 'FINAL DIVE'];

const track = { x0: 60, x1: 580 };
const trackX = (v: number, lo: number, hi: number) => track.x0 + ((v - lo) / (hi - lo)) * (track.x1 - track.x0);

function level(n: 1 | 2 | 3 | 4, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  const fx = { shot: null as unknown, done: new Set<string>() };
  let lastK = -1;
  let slateAt = -10;
  let touched = false;

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    const v = s.v as Required<Values>; // the dial values to draw: the live ones, or the ones that were fired
    if (k !== lastK) {
      lastK = k;
      slateAt = t;
      A.float('PLONK', 400, 70, PAL.white);
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
    // the console LCD helper: live in round 1, for 1.5 s after a paid check in round 2, never in round 3 (and the true value on a win)
    const since = flash.since(A.clock, k);
    const helper = helperOn(r.assist, !!shot?.ok, shot ? Infinity : since);
    A.canvas.dataset.helper = helper ? '1' : '0';
    const f = shot ? fault(r, v) : null;
    const tv = shot ? verdictDelay(r, v) : 0;
    const sinceV = shot ? rt - tv : -1;
    const crackT = shot && f === 'blown' ? crackAt(r, v) : Infinity;
    const cracked = rt >= crackT;
    const glow = shot ? winkGlow(r, v, rt) : 0;
    if (shot) {
      A.canvas.dataset.take = shot.ok ? 'win' : (f ?? 'miss');
      A.canvas.dataset.glow = glow.toFixed(2);
    } else {
      delete A.canvas.dataset.take;
      delete A.canvas.dataset.glow;
    }
    const flipEnd = n === 3 && v.t !== undefined ? 0.3 + v.t : 0;
    const lcd = { s: helper ? lcdText(r, v) : LCD_OFF, color: !helper ? PAL.dim : r.assist === 0 || shot?.ok ? PAL.green : PAL.yellow };
    const wpos = n === 2 ? WINK_L2 : WINK_AT;
    const wy = wpos.y + winkBob(t);

    // the moods, one per character
    const winkMood: WinkMood = !shot ? 'sleepy' : cracked ? 'blown' : rt < 0.3 ? 'sleepy' : f === 'dim' ? 'dim' : 'win';
    const kMood: KavyaMood = cracked ? 'frazzled' : sinceV >= 0 ? (shot!.ok ? 'cheer' : 'worried') : 'happy';
    const uK = cracked ? rt - crackT : sinceV;
    const tMood: TugMood = cracked ? 'blown' : sinceV >= 0 ? (shot!.ok ? 'win' : 'dim') : 'idle';
    const top: TopState = sinceV >= 0 ? (shot!.ok ? 'win' : (f as 'dim' | 'blown')) : 'idle';

    sea(g, t, k);

    if (n === 2) {
      // ---- level 2: the charging sleeve ----
      const rad2 = v.r;
      const ringY = shot ? RING_Y.held + (RING_Y.inside - RING_Y.held) * easeOut(rt / 0.3) : RING_Y.held;
      const boost = shot ? ease((rt - 0.3) / 0.2) * (1 - ease((rt - 1.0) / 0.5)) : 0;
      sleeve(g, boost);
      pedestal(g, WINK_L2.x, WINK_L2.y);
      ringLeads(g, [SLEEVE.x + PX_PER_CM * rad2, ringY], [WINK_L2.x, wy + 30]);
      ring(g, SLEEVE.x, ringY, rad2);
      wink(g, t, { x: wpos.x, y: wpos.y, glow, mood: winkMood, u: cracked ? rt - crackT : -1, bubbles: rt <= 2.3 });
      kavya(g, t, { mood: kMood, rt: shot ? rt : -1, u: uK, rod: [SLEEVE.x - PX_PER_CM * rad2, ringY] });
    } else {
      // ---- levels 1, 3, 4: the docking pad, its field and the hoop ----
      const on = n === 1 && shot ? 1 - ease((rt - 0.3) / 0.5) : 1;
      let fieldA = 0.35 * on;
      if (n === 4 && shot) {
        const p = clamp01((rt - SHOW_AT) / (3 * SHOW_STEP)) * 3;
        const i = Math.min(2, Math.floor(p));
        const phi = r.kind === 'show' ? r.phi[i] + (r.phi[i + 1] - r.phi[i]) * (p - i) : 0;
        fieldA = 0.12 + 0.23 * (phi / 16);
      }
      if (k === 2) {
        g.fillStyle = 'rgba(255,243,196,0.12)';
        g.beginPath();
        g.moveTo(154, 224);
        g.lineTo(PAD.x0 + 4, PAD.top);
        g.lineTo(PAD.x0 + 120, PAD.top);
        g.closePath();
        g.fill();
      }
      pad(g, t, on);
      field(g, fieldA);
      text(g, 'B ⬆', 360, 126, PAL.cyan, 11, 'left');
      if (n === 1 && r.kind === 'out') tag(g, `docking pad · B ${r.b} T ⬆`, 300, 314, 'center', PAL.dim, 11);
      if (n === 3 && r.kind === 'flip') {
        text(g, 'docking pad', 396, 268, PAL.dim, 11, 'left');
        text(g, `B ${r.b} T ⬆`, 396, 282, PAL.dim, 11, 'left');
      }
      if (n === 4) text(g, 'docking pad', 396, 268, PAL.dim, 11, 'left');
      const th = n === 1 ? v.th : n === 3 ? (shot ? 180 * clamp01((rt - 0.3) / v.t) : 0) : 0;
      const turns = n === 4 ? v.n : (r as { n: number }).n;
      hoopLeads(g, [wpos.x, wy + 30], th);
      hoop(g, th, 2 + turns / 40, { normal: true, arc: true });
      wink(g, t, { x: wpos.x, y: wpos.y, glow, mood: winkMood, u: cracked ? rt - crackT : -1, bubbles: rt <= 2.3 });
      const left: [number, number] = n === 3 ? [HOOP.x, HOOP.y] : [HOOP.x - HOOP.r * Math.cos(rad(th)), HOOP.y - HOOP.r * Math.sin(rad(th))];
      kavya(g, t, { mood: kMood, rt: shot ? rt : -1, u: uK, rod: left });
      if (n !== 4) tag(g, `${turns} turns`, 196, 246, 'center', PAL.white, 11);
      if (n === 4 && r.kind === 'show') graphScreen(g, r, shot ? (rt - SHOW_AT) / (3 * SHOW_STEP) : -1);
    }

    // the console and Tug (Tug drops behind the console when Wink cracks)
    const ctl = { i1: r.kind === 'tube' ? r.i1 : 0, i2: r.kind === 'tube' ? r.i2 : 0, flipEnd, t };
    consoleBody(g, lcd);
    consoleControls(g, n, shot ? rt : -1, ctl);
    tug(g, t, { n, rt: shot ? rt : -1, flipEnd, mood: tMood, u: tMood === 'blown' ? rt - crackT : sinceV });
    if (tMood === 'blown') {
      consoleBody(g, lcd);
      consoleControls(g, n, rt, ctl);
    }
    topside(g, t, top);

    // floaters and bursts on the beats of the dive
    if (shot) {
      once('signal', () => {
        A.float('SIGNAL!', KAVYA.x, 140, PAL.yellow);
        A.burst(172, 190, '#e6f6ff', 8, 60);
      });
      if (n === 1 && rt >= 0.25) once('click', () => A.float('CLICK', 520, 244, PAL.white));
      if (cracked) {
        once('crack', () => {
          A.burst(wpos.x, wy, '#e6f6ff', 14, 140);
          A.float('CRACK', wpos.x + 38, wy - 12, PAL.white);
        });
        if (!calm() && rt - crackT < 0.12) {
          g.fillStyle = `rgba(255,255,255,${0.35 * (1 - (rt - crackT) / 0.12)})`;
          g.fillRect(0, 0, 640, 340);
        }
      }
      if (n === 4 && shot.ok && r.kind === 'show') {
        const best = slopes(r).findIndex((x) => Math.abs(x) === steepest(r));
        if (rt >= SHOW_AT + SHOW_STEP * best) once('flash', () => A.float('FLASH!', wpos.x, wy - 34, PAL.yellow));
      }
    }

    // the goal line and the player's own setting by its handle (hidden during a dive; the verdict line takes y = 22)
    if (!shot) tag(g, goalLine(r), 320, 40, 'center', PAL.white, 13);
    else if (sinceV >= 0) verdict(g, shot.ok, 'WINK IS LIT!', f === 'blown' ? 'WINK CRACKED!' : 'WINK TOO DIM');
    if (!shot) {
      if (n === 1) {
        const hx = HOOP.x + HOOP.r * Math.cos(rad(v.th));
        const hy = HOOP.y + HOOP.r * Math.sin(rad(v.th));
        grip(g, hx, hy, 20, 'v');
        tag(g, `θ ${v.th}°`, hx + 26, hy + 5, 'left', PAL.yellow, 13);
        if (v.th !== 90) touched = true;
        if (k === 0 && !touched && (calm() || Math.floor(t * 3) % 2 === 0)) tag(g, 'drag', hx, hy + 30, 'center', PAL.yellow, 11);
      } else if (n === 2) {
        const hx = SLEEVE.x + PX_PER_CM * v.r;
        grip(g, hx, RING_Y.held, 20, 'h');
        tag(g, `r ${v.r} cm`, hx + 26, 100, 'left', PAL.yellow, 13);
      } else if (n === 3) {
        trackBar(g, track.x0, track.x1, '0.1 s', '2 s');
        const hx = trackX(v.t, 0.1, 2);
        grip(g, hx, 322, 20, 'h');
        tag(g, `${v.t} s flip`, hx, 296, 'center', PAL.yellow, 13);
      } else {
        trackBar(g, track.x0, track.x1, '10', '200');
        const hx = trackX(v.n, 10, 200);
        grip(g, hx, 322, 20, 'h');
        tag(g, `N ${v.n}`, hx, 296, 'center', PAL.yellow, 13);
      }
    } else if (n === 3 || n === 4) {
      trackBar(g, track.x0, track.x1, n === 3 ? '0.1 s' : '10', n === 3 ? '2 s' : '200');
    }
    slate(g, t - slateAt, SLATES[k]);
  }

  const dials: DialSpec<Round>[] = [];
  const handles: HandleSpec<Round>[] = [];
  if (n === 1) {
    dials.push({ key: 'th', aria: 'Tilt of the hoop in degrees from flat', label: 'Tilt', unit: '', step: 5, min: 0, max: 90, start: 90, text: (x) => `${x}°` });
    handles.push({
      dial: 'th',
      at: (_r, v) => [HOOP.x + HOOP.r * Math.cos(rad(v.th)), HOOP.y + HOOP.r * Math.sin(rad(v.th))],
      drag: (_r, px, py) => (Math.atan2(py - HOOP.y, Math.max(1, px - HOOP.x)) * 180) / Math.PI,
      radius: 20,
    });
  } else if (n === 2) {
    dials.push({ key: 'r', aria: 'Radius of the ring in centimetres', label: 'Ring', unit: 'cm', step: 0.5, min: 1, max: 8, start: 1 });
    handles.push({ dial: 'r', at: (_r, v) => [SLEEVE.x + PX_PER_CM * v.r, RING_Y.held], drag: (_r, px) => (px - SLEEVE.x) / PX_PER_CM, radius: 20 });
  } else if (n === 3) {
    dials.push({ key: 't', aria: 'Time for the half-turn flip in seconds', label: 'Flip time', unit: 's', step: 0.1, min: 0.1, max: 2, start: 2 });
    handles.push(trackHandle<Round>('t', () => 0.1, () => 2));
  } else {
    dials.push({ key: 'n', aria: 'Number of turns on the hoop', label: 'Turns', unit: '', step: 10, min: 10, max: 200, start: 10 });
    handles.push(trackHandle<Round>('n', () => 10, () => 200));
  }

  return {
    hero: { name: 'Kavya', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: {
      button: '🔎 Console check',
      aria: 'Console check: read the station meter for this setting',
      read: (r, v) => (flash.paid(), meterText(r, v as Values)),
    },
    fire: { button: '🔦 Signal!', aria: 'Signal the ship: run the station and light the beacon' },
    judge: (r, v) => judge(r, v as Values),
    miss: (r, v) => missText(r, v as Values),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => [320, 70],
    delay: (r, v) => verdictDelay(r, v as Values),
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
