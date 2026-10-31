// Inspirations (code comment only): theme-park management games (keep the rides running and the riders happy), the real eddy-current brakes of roller coasters and
// drop towers, the classic "jumping ring" demonstration scaled up into a ride, and the cue-matching of rhythm games for the light show.
// Joon, the night-shift engineer, throws the ride's switches (level 1: pole, move and ring; level 2: three field switches; level 3: the brake bank's resistance) and
// presses Go. The art is in art.ts.
// Never leak the answer: the LCD is the only place the induced field (levels 1 and 2) or the steady speed (level 3) is drawn, live in round 1, for 1.5 s after a flux
// check in round 2 and never in round 3; the level 3 car moves at one of three fixed paces; `hit` is a fixed point; every animation ends by 2.4 s.
import { helperOn, paidFlash } from '@core/aidflash';
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { TRACK, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import {
  BRAKE_ZONE, EV_LABEL, LEVER_X, LEVER_Y, MAG_ABOVE, MAG_BELOW, RIG_X, RING, RING_TOP, SHIFT, SIGN,
  bank, brakeZone, buffer, calm, car, carPose, clamp01, crane, cueBoard, cueCard, ease, easeOut, fieldFrame, fieldLines, gapEmf, glowColor, grip, joon, lcdLine, lightning, loopSign,
  magnet, moveArrow, park, parkedCar, pit, podium, riders, ringBack, ringFront, rollers, switchSlot, tag, ticket, tower, track3, tunnel,
  type G, type JoonMood, type RiderState, type RingOpts,
} from './art';
import {
  LCD_OFF, RUN, buildRounds, fault, firstWrong, goalLine, hintText, judge, lcdText, meterText, missText, rocket, tunnelGlow, verdictDelay, winText,
  type Glow, type Round, type Values,
} from './logic';

const ROLE = 'the night-shift ride engineer at Magnet Park, whose rides launch, glow and brake by Lenz’s law';
const HEROES = [
  {
    story: 'Magnet Park’s star ride is the Ring Rocket: riders sit in a big aluminium ring round a tower, and a giant magnet moves toward or away from it. The ring’s induced current always opposes the change in flux, so an approaching pole repels the ring and a retreating pole pulls it back. The ring’s show lights are wired through one-way diodes: green ↺ glows for anticlockwise current and red ↻ for clockwise, seen from above. A magnet held still does nothing, however strong.',
    objective: 'Set the magnet’s pole, its move and the ring so the ring does exactly what each show cue asks, in three shows.',
  },
  {
    story: 'In the Light Tunnel, three loop-shaped signs hang in the fields of three electromagnets. As the ride passes, each sign is driven in or out of its field, squeezed flat, sprung open, or has its field switched on or faded. A sign’s current flows only while its flux changes, and always the way that opposes the change. Its lights glow green ↺ for anticlockwise current and red ↻ for clockwise, as you look at it.',
    objective: 'Set each magnet’s field ⊗ into or ⊙ out of the page so the signs flash the show’s colours in order, in three shows.',
  },
  {
    story: 'The coaster’s last slope ends in a magnetic brake. The car drags a copper bar across two rails between strong magnets, and the rails are joined through a brake bank of resistance R. The bar’s motional emf drives a current, and the force BIl on it opposes the motion. The car speeds up until that force equals the pull down the slope, then rolls at a steady speed: all the work the slope does becomes heat in the brake bank.',
    objective: 'Set the brake bank so the car steadies at exactly the safe speed and glides into the station, in three runs.',
  },
];
const ARIA = [
  'A theme park at night: a ride engineer at a control podium beside a ring-shaped ride round a launch tower, with a giant bar magnet below or above the ring and two riders in it.',
  'A dark ride tunnel: three loop-shaped signs with green and red lights hang in the fields of three electromagnets, each under a colour cue card.',
  'The last slope of a roller coaster: a car with two riders rolls through a magnetic brake toward the station platform, with a brake bank cabinet below the track.',
];

const dialLever = (key: string, aria: string, label: string, min: number, max: number, start: number, say: (x: number) => string): DialSpec<Round> => ({ key, aria, label, unit: '', step: 1, min, max, start, text: say });
const binary = (x: number, aria: string, label: string, key: string, say: (x: number) => string) => dialLever(key, aria, label, 0, 1, x, say);
const lever = (dial: string, x: number): HandleSpec<Round> => ({ dial, at: (_r, v) => [x, v[dial] ? LEVER_Y.top : LEVER_Y.bottom], drag: (_r, _px, py) => (py < LEVER_Y.mid ? 1 : 0), radius: 18 });

/** What the show shows after the verdict, drawn at the top of the scene. */
function verdictLine(g: G, ok: boolean, n: number, out: string) {
  const bad = n === 1 ? (out === 'hold' || out === 'split' ? 'NOTHING HAPPENED' : 'WRONG SHOW') : n === 2 ? 'OFF CUE' : out === 'fast' ? 'BANG! TOO FAST' : 'SHORT OF THE STATION';
  verdict(g, ok, n === 1 ? 'SHOWTIME!' : n === 2 ? 'WHAT A SHOW!' : 'SMOOTH STOP!', bad);
}

interface Ctx {
  s: SceneInput<Round>;
  /** Seconds since the verdict landed (negative before it, and when there is no shot). */
  sinceV: number;
  /** The settings to draw: the live ones, or the ones that were fired. */
  v: Record<string, number>;
  vals: Values;
  /** Whether the LCD helper shows its reading, and the colour of its text. */
  helper: boolean;
  lcdColor: string;
  out: string | null;
  once: (key: string, fn: () => void) => void;
  joon: (mood: JoonMood, u: number) => void;
}

function level(n: 1 | 2 | 3, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  const fx = { shot: null as unknown, done: new Set<string>() };
  let lastK = -1;
  let tickAt = -10;
  let touched = false;
  const LABELS = n === 3 ? ['RUN 1', 'RUN 2', 'FINAL RUN'] : ['SHOW 1', 'SHOW 2', 'FINAL SHOW'];

  // ---- level 1: the Ring Rocket ----
  function scene1(c: Ctx, r: Extract<Round, { kind: 'rocket' }>) {
    const { g, t, rt, k, shot, A } = c.s;
    const { v, sinceV, out, once } = c;
    park(g, t, k);
    const below = r.magnet === 'below';
    const o1 = shot ? rocket(r, v.pole, v.move, v.ring) : null;
    const physical = o1 === null ? null : o1 === 'hold' || o1 === 'split' ? 'still' : o1.startsWith('launch') ? 'launch' : 'clamp';
    const lampGlow = o1 && o1 !== 'hold' && o1 !== 'split' ? (o1.split('-')[1] as Glow) : null;
    if (physical) A.canvas.dataset.ring = physical;
    else delete A.canvas.dataset.ring;
    // the magnet moves toward or away from the ring (0.10 to 0.45 s) and goes home at the end
    const shift = shot ? v.move * SHIFT * ease((rt - 0.1) / 0.35) * (1 - ease((rt - 1.9) / 0.4)) : 0;
    const faceY = below ? MAG_BELOW.face - shift : MAG_ABOVE.face + shift;
    let ringY = RING.y;
    let squash = 0;
    if (physical === 'launch') ringY = RING.y + (RING_TOP - RING.y) * easeOut((rt - 0.35) / 0.6) * (1 - ease((rt - 1.3) / 0.9));
    if (physical === 'clamp') {
      squash = 4 * ease((rt - 0.4) / 0.08) - 4 * ease((rt - 0.5) / 0.3);
      ringY = RING.y + squash;
    }
    const litA = lampGlow ? clamp01((rt - 0.3) / 0.1) * (1 - clamp01((rt - 1.9) / 0.4)) : 0;
    const ringO: RingOpts = { y: ringY, lit: lampGlow, litA, split: v.ring === 0 };
    if (!below) crane(g, faceY - MAG_ABOVE.h);
    ringBack(g, ringO);
    tower(g, t, Math.max(0, squash));
    if (below) pit(g, faceY);
    magnet(g, below, faceY, v.pole);
    fieldLines(g, below, faceY, v.pole);
    if (!shot) moveArrow(g, below, below ? faceY + MAG_BELOW.h / 2 : faceY - MAG_ABOVE.h / 2, v.move);
    // the riders sit in the front seats and move with the ring
    let rs: RiderState = 'idle';
    let ru = 0;
    if (shot) {
      if (physical === 'launch' && rt >= 0.35) [rs, ru] = ['cheer', rt - 0.35];
      else if (physical === 'clamp' && rt >= 0.4) [rs, ru] = ['bounce', rt - 0.4];
      else if (physical === 'still' && rt >= 0.45) [rs, ru] = ['worried', rt - 0.45];
      if (sinceV >= 0 && !shot.ok && physical !== 'still') [rs, ru] = ['worried', sinceV];
      if (sinceV >= 0 && shot.ok && physical === 'launch') [rs, ru] = ['cheer', sinceV];
    }
    riders(g, t, { x: RING.x, y: ringY + 12, gap: 44, state: rs, u: ru });
    ringFront(g, ringO);
    if (v.ring === 0 && shot && rt >= 0.3 && rt <= 1.2 && v.move !== 0) gapEmf(g, ringY);
    // the control podium: the player's own settings, and the flux meter LCD on top of it
    podium(g, { pole: v.pole, move: v.move, ring: v.ring }, { s: c.helper ? lcdText(r, c.vals) : LCD_OFF, color: c.lcdColor });
    // the cue board: the show's brief, then the verdict
    let l1 = r.go === 'launch' ? 'LAUNCH' : 'PULL DOWN';
    let c1 = PAL.white;
    if (shot && sinceV >= 0) {
      if (out === 'win') [l1, c1] = ['✓ SHOW!', PAL.green];
      else if (sinceV < 1.5 && (out === 'move' || out === 'both')) [l1, c1] = ['✗ WRONG MOVE', PAL.red];
      else if (sinceV < 1.5 && out === 'colour') [l1, c1] = ['✗ WRONG COLOUR', PAL.red];
    }
    cueBoard(g, { l1, c1, l2: r.glow === 'green' ? 'GREEN ↺' : 'RED ↻', c2: glowColor(r.glow) });
    if (!shot) {
      const pos = [v.pole ? LEVER_Y.top : LEVER_Y.bottom, v.move > 0 ? LEVER_Y.top : v.move < 0 ? LEVER_Y.bottom : LEVER_Y.mid, v.ring ? LEVER_Y.top : LEVER_Y.bottom];
      for (let i = 0; i < 3; i++) grip(g, LEVER_X[i], pos[i], 18, 'v');
      if (v.pole !== 1 || v.move !== 0 || v.ring !== 1) touched = true;
      if (k === 0 && !touched && (calm() || Math.floor(t * 3) % 2 === 0)) text(g, 'drag', LEVER_X[1], 226, PAL.yellow, 11);
    }
    // floaters and the ring's reactions
    if (shot) {
      once('go', () => {
        A.float('KSHH', 64, 180, PAL.dim);
        A.float('GO!', 110, 150, PAL.green);
      });
      if (physical === 'launch' && rt >= 0.4) once('wheee', () => A.float('WHEEE!', RING.x, 190, PAL.yellow));
      if (physical === 'clamp' && rt >= 0.4) {
        once('clunk', () => {
          A.float('CLUNK', RING.x, 280, PAL.white);
          A.shake(3);
        });
      }
      if (physical === 'still' && rt >= 0.5) once('still', () => A.float('…', RING.x, 190, PAL.dim));
      if (sinceV >= 0 && !shot.ok && physical !== 'still') once('groan', () => A.float('AWW…', RING.x, 170, PAL.orange));
    }
    c.joon(!shot ? 'happy' : sinceV < 0 ? 'happy' : shot.ok ? 'cheer' : 'worried', sinceV);
  }

  // ---- level 2: the Light Tunnel ----
  function scene2(c: Ctx, r: Extract<Round, { kind: 'tunnel' }>) {
    const { g, t, rt, k, shot, A } = c.s;
    const { v, sinceV, once } = c;
    tunnel(g, t, k);
    const fw = shot ? firstWrong(r, c.vals) : -1;
    for (let i = 0; i < 3; i++) {
      const cx = RIG_X[i];
      const ev = r.ev[i];
      const into = v[`z${i}`] === 1;
      const plays = !!shot && (fw < 0 || i <= fw);
      const p = plays ? clamp01((rt - (0.3 + 0.6 * i)) / 0.45) : 0;
      const e = ease(p);
      const marks = ev === 'rise' ? 0.15 + 0.65 * e : ev === 'fade' ? 0.6 * (1 - e) : 0.6;
      fieldFrame(g, cx, into, marks);
      const sign = { x: cx, w: 44, h: SIGN.h, round: 0 };
      if (ev === 'enter') sign.x = cx - 75 + 75 * e;
      if (ev === 'leave') sign.x = cx + 75 * e;
      if (ev === 'squeeze') sign.h = SIGN.h - 44 * e;
      if (ev === 'stretch') [sign.w, sign.h, sign.round] = [44 + 8 * e, 6 + 44 * e + 2 * e, e];
      const startAt = 0.45 + 0.6 * i;
      const on = plays && rt >= startAt;
      const lit = on ? tunnelGlow(ev, v[`z${i}`]) : null;
      loopSign(g, { ...sign, lit, litA: on ? (rt <= 0.75 + 0.6 * i ? 1 : 0.35) : 0 });
      if (ev === 'squeeze') rollers(g, cx, e);
      const mark = plays && rt >= 0.55 + 0.6 * i ? (tunnelGlow(ev, v[`z${i}`]) === r.cue[i] ? '✓' : '✗') : '';
      cueCard(g, cx, i, r.cue[i], mark);
      if (mark === '✓') once(`ooh${i}`, () => A.float('ooh!', 96, 250, PAL.cyan));
      text(g, EV_LABEL[ev], cx, 228, PAL.dim, 11);
      lcdLine(g, cx, c.helper ? lcdText(r, c.vals, i) : LCD_OFF, c.lcdColor);
      switchSlot(g, cx, into);
      if (!shot) grip(g, cx, into ? 262 : 292, 18, 'v');
    }
    // the riders watch the show from a small parked ride car
    parkedCar(g);
    let rs: RiderState = 'idle';
    let ru = 0;
    if (shot && sinceV >= 0) [rs, ru] = [shot.ok ? 'cheer' : 'worried', sinceV];
    riders(g, t, { x: 96, y: 293, state: rs, u: ru });
    if (shot) {
      once('go', () => {
        A.float('KSHH', 64, 180, PAL.dim);
        A.float('GO!', 110, 150, PAL.green);
      });
      if (sinceV >= 0) once('end', () => A.float(shot.ok ? 'YAY!' : '…', 96, 236, shot.ok ? PAL.yellow : PAL.dim));
      if (shot.ok && rt >= 2.05) {
        once('fireworks', () => {
          A.burst(200, 100, PAL.yellow, 30, 200);
          A.burst(350, 80, PAL.pink, 30, 200);
          A.burst(500, 100, PAL.green, 30, 200);
        });
      }
    }
    c.joon(!shot ? 'happy' : sinceV < 0 ? 'happy' : shot.ok ? 'cheer' : 'worried', sinceV);
  }

  // ---- level 3: the Brake Run ----
  function scene3(c: Ctx, r: Extract<Round, { kind: 'brake' }>) {
    const { g, t, rt, k, shot, A } = c.s;
    const { v, sinceV, once } = c;
    park(g, t, k);
    const f = shot ? fault(r, c.vals) : null;
    // the pace is one of three fixed values per outcome, never proportional to the player's steady speed
    const run = f === 'fast' ? RUN.fast : f === 'slow' ? RUN.slow : RUN.win;
    const u = shot ? clamp01((rt - 0.1) / run.dur) : 0;
    const shape = f === 'fast' ? u ** 1.6 : f === 'slow' ? 1 - (1 - u) ** 2 : ease(u);
    const pose = carPose(run.end * shape);
    const heat = !!shot && pose.x >= BRAKE_ZONE.x0 - 10 && pose.x <= BRAKE_ZONE.x1 + 30;
    if (shot) A.canvas.dataset.carX = pose.x.toFixed(1);
    else delete A.canvas.dataset.carX;
    track3(g);
    brakeZone(g);
    text(g, `BRAKE · B ${r.b} T · bar ${r.l} m`, 300, 124, PAL.white, 13);
    bank(g, heat, { s: c.helper ? lcdText(r, c.vals) : LCD_OFF, color: c.lcdColor });
    const slam = f === 'fast' && rt >= 1.5;
    buffer(g, slam ? ease((rt - 1.5) / 0.1) * (1 - ease((rt - 1.7) / 0.3)) : 0);
    let rs: RiderState = 'idle';
    let ru = 0;
    if (slam) [rs, ru] = ['slam', rt - 1.5];
    else if (shot && sinceV >= 0) [rs, ru] = [shot.ok ? 'cheer' : 'worried', sinceV];
    g.save();
    g.translate(pose.x, pose.y);
    g.rotate(pose.a);
    riders(g, t, { x: 0, y: -14, state: rs, u: ru });
    car(g, !!shot);
    g.restore();
    // the player's own setting by its handle
    line(g, TRACK.x0, TRACK.y, TRACK.x1, TRACK.y, PAL.dim, 3);
    text(g, '1 mΩ', TRACK.x0, TRACK.y + 14, PAL.dim, 11);
    text(g, '25 mΩ', TRACK.x1, TRACK.y + 14, PAL.dim, 11);
    if (!shot) {
      const hx = TRACK.x0 + ((v.r - 1) / 24) * (TRACK.x1 - TRACK.x0);
      grip(g, hx, TRACK.y, 20, 'h');
      tag(g, `R ${v.r} mΩ`, hx, 296, 'center', PAL.yellow, 13);
    }
    if (shot) {
      once('go', () => {
        A.float('KSHH', 64, 180, PAL.dim);
        A.float('GO!', 110, 150, PAL.green);
      });
      if (heat) once('heat', () => A.float('HEAT', 300, 245, PAL.orange));
      if (slam) {
        once('bang', () => {
          A.float('BANG!', 580, 205, PAL.orange);
          A.shake(9);
          A.burst(600, 239, PAL.yellow, 18, 160);
        });
        if (rt >= 1.7) once('whoa', () => A.float('WHOA!', 560, 190, PAL.white));
      }
      if (sinceV >= 0 && !slam) once('end', () => A.float(shot.ok ? 'YAY!' : '…', pose.x, pose.y - 60, shot.ok ? PAL.yellow : PAL.dim));
    }
    c.joon(slam ? 'frazzled' : !shot || sinceV < 0 ? 'happy' : shot.ok ? 'cheer' : 'worried', slam ? rt - 1.5 : sinceV);
  }

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    if (k !== lastK) {
      lastK = k;
      tickAt = t;
      A.float('DING', 320, 118, PAL.yellow);
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
    // the LCD helper: live in round 1, for 1.5 s after a paid flux check in round 2, never in round 3 (and shown on a win, like every helper)
    const since = flash.since(A.clock, k);
    const helper = helperOn(r.assist, !!shot?.ok, shot ? Infinity : since);
    A.canvas.dataset.helper = helper ? '1' : '0';
    const tv = shot ? verdictDelay(r, shot.v) : 0;
    const f = shot ? fault(r, shot.v) : null;
    const out = shot ? (shot.ok ? 'win' : (f ?? 'miss')) : null;
    if (out) A.canvas.dataset.take = out;
    else delete A.canvas.dataset.take;
    const v = s.v;
    const c: Ctx = {
      s,
      sinceV: shot ? rt - tv : -1,
      v,
      vals: v as Values,
      helper,
      lcdColor: r.assist === 0 || shot?.ok ? PAL.green : PAL.yellow,
      out,
      once,
      joon: (mood, u) => joon(g, t, { mood, press: shot ? rt : -1, u: Math.max(0, u) }),
    };
    if (r.kind === 'rocket') scene1(c, r);
    else if (r.kind === 'tunnel') scene2(c, r);
    else scene3(c, r);
    if (shot && c.sinceV >= 0) verdictLine(g, shot.ok, n, out ?? '');
    if (!shot) tag(g, goalLine(r), 320, 40, 'center', PAL.white, 13);
    ticket(g, t - tickAt, LABELS[k]);
    if (k === 2) lightning(g, t);
  }

  const dials: DialSpec<Round>[] = [];
  const handles: HandleSpec<Round>[] = [];
  if (n === 1) {
    dials.push(
      binary(1, 'Magnet pole facing the ring: 1 north, 0 south', 'Pole', 'pole', (x) => (x ? 'N faces the ring' : 'S faces the ring')),
      dialLever('move', 'Magnet move: 1 toward the ring, 0 hold still, -1 away', 'Move', -1, 1, 0, (x) => (x > 0 ? 'toward the ring' : x < 0 ? 'away from the ring' : 'hold still')),
      binary(1, 'Ring: 1 closed, 0 split', 'Ring', 'ring', (x) => (x ? 'closed' : 'split')),
    );
    handles.push(lever('pole', LEVER_X[0]), {
      dial: 'move',
      at: (_r, v) => [LEVER_X[1], v.move > 0 ? LEVER_Y.top : v.move < 0 ? LEVER_Y.bottom : LEVER_Y.mid],
      drag: (_r, _px, py) => (py < LEVER_Y.mid - 8 ? 1 : py > LEVER_Y.mid + 8 ? -1 : 0),
      radius: 18,
    }, lever('ring', LEVER_X[2]));
  } else if (n === 2) {
    for (let i = 0; i < 3; i++) {
      dials.push(binary(1, `Sign ${i + 1} magnet: 1 field into the page, 0 out of the page`, `Sign ${i + 1}`, `z${i}`, (x) => (x ? '⊗ into the page' : '⊙ out of the page')));
      handles.push({ dial: `z${i}`, at: (_r, v) => [RIG_X[i], v[`z${i}`] ? 262 : 292], drag: (_r, _px, py) => (py < 277 ? 1 : 0), radius: 18 });
    }
  } else {
    dials.push({ key: 'r', aria: 'Brake bank resistance in milliohms', label: 'Brake bank', unit: 'mΩ', step: 1, min: 1, max: 25, start: 1 });
    handles.push(trackHandle<Round>('r', () => 1, () => 25));
  }

  return {
    hero: { name: 'Joon', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: {
      button: n === 3 ? '🔎 Brake check' : '🔎 Flux check',
      aria: n === 3 ? 'Brake check: read the brake meter for this setting' : 'Flux check: read the flux meter for this setting',
      read: (r, v) => (flash.paid(), meterText(r, v as Values)),
    },
    fire: { button: '🎢 Go!', aria: 'Start the ride' },
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
    const n = Math.max(1, Math.min(3, ctx.level)) as 1 | 2 | 3;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA[n - 1]);
  },
});
