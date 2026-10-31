// "Lights of the High Pass" (Section 7.4 and 7.5). Inspirations (code comment only): survival-in-the-snow games (guide the lost party home before they freeze),
// lighthouse-keeper games, and rhythm games for the level 4 finale (the beat must be steady).
// Core verb: throttle the water turbine. In every level the player drags the sluice lever, which sets the turbine's speed and so the supply frequency, then flips the lamp switch.
// Never leak the answer: the lamps are dark before Fire whatever the setting; the lamp meter (LCD) is the only helper (live in round 1, 1.5 s after a paid check in round 2,
// never in round 3); lamp glow, the trekkers' four paths and the level 4 flicker take only fixed forms; the turbine's take speed is the same for every setting;
// `hit` is a fixed point; every animation ends by 2.3 s. The art is in art.ts.
import { PAL } from '@core/arcade';
import { helperOn, paidFlash } from '@core/aidflash';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { text } from '@core/neon';
import { pointerToLocal } from '@core/sim';
import {
  CAP_CAN, CHOKE_BOX, DRIFT_DOOR, DRIFT_TRAIL, JACKETS, LAMPS, LCD, PORCH, ROOF, SLUICE, TRAIL_LEN, YAK, capCan, choke, clamp01, dolma, dropper, drift, ease, inset, lamp, leverY, lever, lodge, mountain,
  party, pathAt, post, roofWire, shed, snow, stream, tag, trail, yak, type DolmaMood, type PartyState, type YakState,
} from './art';
import { DIAL, GLOW, LCD_OFF, TWO_PI, buildRounds, dialOf, fault, goal, hintText, judge, lcdText, meterText, missText, verdictDelay, winText, type Round } from './logic';

const ARIA = 'A snowbound mountain lodge at night: its keeper stands at the sluice lever of a small water turbine, and a roped party of trekkers waits on the trail for the lamps to light.';
const ROLE = 'the keeper of a high-pass trekkers’ lodge, whose lamps run on a water turbine she sets by hand';
const HEROES = [
  {
    story: 'A blizzard has caught a party of trekkers below the pass. Dolma’s lodge makes its own AC with a small water turbine: the regulator holds the voltage, but the frequency follows the turbine’s speed, set by the sluice lever. The trail lamps are 12-volt lamps fed through a sealed choke, so the choke’s reactance X_L = 2πfL sets their current.',
    objective: 'Set the turbine’s frequency so the trail lamps get exactly the current they need, in three storms.',
  },
  {
    story: 'The red porch beacon shows the trekkers the lodge door. It is a 12-volt lamp fed through a sealed capacitor, whose reactance X_C = 1/(2πfC) sets the current. A capacitor works the other way round from a choke: the faster the turbine, the smaller its reactance.',
    objective: 'Set the frequency so the porch beacon gets exactly its current, in three storms.',
  },
  {
    story: 'Tonight one turbine feeds both: the trail lamps through the choke and the porch beacon through the capacitor. Speeding up dims one and brightens the other. These lamps can take far more than they need; the danger in a blizzard is too little light.',
    objective: 'Find the one frequency at which both the trail and the beacon are bright enough, in three storms.',
  },
  {
    story: 'Deep winter: the stream is low, the turbine turns slowly, and a lamp flickers so much that the falling snow strobes. The roof beacon has two lamps. One is fed through a resistor dropper, with its current in step with the voltage; the other through the choke or the capacitor, with its current a quarter cycle out of step. If the two currents are equal, one lamp is at its brightest just as the other goes dark.',
    objective: 'Set the frequency that makes the two beacon lamps carry equal currents, so the light is steady, in three storms.',
  },
];

const PEEK_SECONDS = 1.5;
/** Where the party starts: the leader's distance along the trail from its right end; the others trail behind by GAP. */
const S0 = 70;
const GAP = 22;
/** The leader's distance at the second lamp, where a dim party veers off. */
const S_VEER = Math.hypot(560 - 630, 296 - 312) + Math.hypot(490 - 560, 282 - 296);
/** Just past the door, where a party that found the beacon dark walks on. */
const S_PAST = TRAIL_LEN + 30;
const TRAIL_DRIFT = (i: number): [number, number] => [DRIFT_TRAIL[0] - 24 + i * 24, DRIFT_TRAIL[1]];
const DOOR_DRIFT = (i: number): [number, number] => [DRIFT_DOOR[0] - 24 + i * 24, DRIFT_DOOR[1]];

type Out = 'win' | NonNullable<ReturnType<typeof fault>>;

/** A thin cable between two parts of the scene. */
function cord(g: CanvasRenderingContext2D, pts: [number, number][]) {
  for (const [c, w] of [['#0a0d1c', 3], ['#6a6f8f', 1.2]] as const) {
    g.strokeStyle = c;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.stroke();
  }
}

function level(n: 1 | 2 | 3 | 4, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const { min: lo, max: hi } = dialOf(n);
  const flash = paidFlash();
  const fx = { shot: null as unknown, done: new Set<string>() };
  const grab = { held: false, touched: false, bound: null as HTMLCanvasElement | null, f: lo };

  /** One watcher per canvas: whether the lever's grip is held, and whether it was ever touched (the first-touch cue). */
  function watch(c: HTMLCanvasElement) {
    if (grab.bound === c) return;
    grab.bound = c;
    c.addEventListener('pointerdown', (e) => {
      const p = pointerToLocal(e, c, 640, 340);
      if (Math.hypot(p.x - SLUICE.x, p.y - leverY(grab.f, lo, hi)) <= 34) {
        grab.held = true;
        grab.touched = true;
      }
    });
    const release = () => {
      grab.held = false;
    };
    c.addEventListener('pointerup', release);
    c.addEventListener('pointercancel', release);
  }

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    const f = s.v.f;
    const kk = Math.min(2, k);
    grab.f = f;
    watch(A.canvas);
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

    // the lamp meter: live in round 1, for 1.5 s after a paid check in round 2, never in round 3
    const since = flash.since(t, k);
    const live = r.assist === 0 || (!shot && helperOn(r.assist, false, since) && since < PEEK_SECONDS);
    A.canvas.dataset.lcd = live ? '1' : '0';
    const lcd = live ? lcdText(r, { f }) : LCD_OFF;
    const lcdColor = r.assist === 0 ? PAL.green : PAL.yellow;

    const tv = shot ? verdictDelay(r, shot.v) : 0;
    const ft = shot ? fault(r, shot.v) : null;
    const win = !!shot && shot.ok;
    const out: Out | null = shot ? (win ? 'win' : ft!) : null;
    if (out) A.canvas.dataset.take = out;
    else delete A.canvas.dataset.take;

    // ---- the lamps (fixed forms only) ----
    const on = !!shot && rt >= 0.5;
    let trailA = 0;
    let porchA = 0;
    let roofA = 0;
    let flashV = 0;
    let broken = false;
    if (on) {
      if (n === 1 || n === 2) {
        const a = ft === 'burst' ? GLOW.right : win ? GLOW.right : GLOW.dim;
        if (ft === 'burst') {
          if (rt < 0.6) flashV = 0.45;
          else broken = true;
        }
        if (n === 1) trailA = a;
        else porchA = a;
      } else if (n === 3) {
        trailA = ft === 'trail' ? GLOW.dim : GLOW.right;
        porchA = ft === 'porch' ? GLOW.dim : GLOW.right;
      } else {
        roofA = win ? 1 : 0.3 + 0.7 * (0.5 - 0.5 * Math.cos(TWO_PI * 2 * (rt - 0.5)));
      }
    }
    const pulse = n === 4 && on && !win ? (roofA - 0.3) / 0.7 : 0;
    const lampXY: [number, number][] = n === 1 || n === 3 ? LAMPS : [];
    if (shot && ft === 'burst' && rt >= 0.6) {
      once('pop', () => {
        const pts: [number, number][] = n === 2 ? [[PORCH.x, PORCH.y]] : lampXY;
        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
        const top = Math.min(...pts.map((p) => p[1]));
        A.float('POP!', cx, top - 22, PAL.white);
        for (const [x, y] of pts) A.burst(x, y, PAL.white, 10, 120);
      });
    }

    // ---- the party's path ----
    const colors = JACKETS[kk];
    let pState: PartyState = 'walk';
    let sLead = S0;
    let topple = 0;
    let hidden = false;
    let driftAt: 'trail' | 'door' | null = null;
    let beam = 0.3 * Math.sin((t * TWO_PI) / 3);
    let veer = 0;
    let veerTo: (i: number) => [number, number] = TRAIL_DRIFT;
    if (shot) {
      if (win) sLead = S0 + (TRAIL_LEN - S0) * clamp01((rt - 0.6) / 1.2);
      else if (ft === 'burst') {
        if (rt >= 0.6) {
          pState = 'huddle';
          beam = Math.sin(rt * 8);
        }
      } else if (ft === 'part' || ft === 'dropper') {
        if (rt >= 0.6) pState = 'shield';
      } else if (ft === 'dim' || ft === 'trail') {
        sLead = S0 + (S_VEER - S0) * clamp01((rt - 0.6) / 0.3);
        veer = ease((rt - 0.9) / 0.25);
        topple = clamp01((rt - 1.0) / 0.15);
        if (rt >= 0.9) driftAt = 'trail';
        if (rt >= 1.15) hidden = true;
      } else if (ft === 'porch') {
        sLead = S0 + (S_PAST - S0) * clamp01((rt - 0.6) / 0.7);
        veer = ease((rt - 1.3) / 0.1);
        topple = clamp01((rt - 1.3) / 0.1);
        veerTo = DOOR_DRIFT;
        if (rt >= 1.3) driftAt = 'door';
        if (rt >= 1.4) hidden = true;
      }
    }
    const partyPts = (): [number, number][] =>
      [0, 1, 2].map((i) => {
        const [px, py] = pathAt(sLead - i * GAP);
        const [dx, dy] = veerTo(i);
        return [px + (dx - px) * veer, py + (dy - py) * veer] as [number, number];
      });
    if (shot) {
      if (ft === 'burst' && rt >= 0.6) once('huddle', () => A.float('?', 560, 252, PAL.white));
      if ((ft === 'part' || ft === 'dropper') && rt >= 0.9) once('which', () => A.float('WHICH WAY?', 540, 250, PAL.white));
      if ((ft === 'dim' || ft === 'trail') && rt >= 1.15) once('flump', () => A.float('FLUMP', DRIFT_TRAIL[0], DRIFT_TRAIL[1] - 30, PAL.white));
      if (ft === 'porch' && rt >= 1.4) once('flump', () => A.float('FLUMP', DRIFT_DOOR[0], DRIFT_DOOR[1] - 30, PAL.white));
      if (win && rt >= 1.8) once('namaste', () => A.float('NAMASTE!', 120, 250, PAL.yellow));
    }

    // ---- Norbu ----
    let yState: YakState = 'idle';
    let yU = 0;
    if (shot) {
      yState = 'lift';
      yU = rt;
      if (ft === 'burst') {
        if (rt >= 0.6) {
          yState = 'back';
          yU = rt - 0.6;
        }
      } else if (win) {
        if (rt >= tv) {
          yState = 'toss';
          yU = rt - tv;
          once('grunt', () => A.float('GRUNT!', YAK.x, YAK.y - 44, PAL.yellow));
        }
      } else if (rt >= tv) {
        yState = 'low';
        yU = rt - tv;
      }
    }

    // ---- Dolma ----
    let mood: DolmaMood = 'happy';
    let lean = 0;
    let both = 0;
    let armsUp = 0;
    let wave = false;
    let shift = 0;
    if (shot) {
      lean = 8 * (rt < 0.25 ? ease(rt / 0.25) : 1 - ease((rt - 0.25) / 0.25));
      both = rt < 0.5 ? ease(rt / 0.25) : 1 - ease((rt - 0.5) / 0.3);
      shift = 6 * Math.sin(Math.PI * clamp01(rt / 0.25));
      once('clunk', () => A.float('CLUNK', 250, 150, PAL.white));
      if (ft === 'burst') {
        if (rt >= 0.6) mood = 'startled';
        if (rt >= tv + 0.8) mood = 'worried';
      } else if (win) {
        if (rt >= tv) {
          mood = 'cheer';
          armsUp = ease((rt - tv) / 0.2);
          if (rt >= tv + 0.7) {
            wave = true;
            armsUp = 0;
          }
        }
      } else if (rt >= tv) mood = 'worried';
    }
    const fast = shot ? ease(rt / 0.5) : 0;

    // ---- compose the frame ----
    mountain(g, kk);
    stream(g, t, fast);
    lodge(g, t, kk);
    yak(g, t, yState, yU);
    trail(g);
    if (n === 1 || n === 3) for (const [x, y] of LAMPS) post(g, x, y);
    shed(g, t, { f, supply: r.kind === 'choke' || r.kind === 'cap' ? r.v : undefined, fast });
    lever(g, f, lo, hi, shift);

    // the sealed parts and their cords
    if (r.kind === 'choke') {
      choke(g, `CHOKE ${r.l} mH`, [[348, 224], [354, 216]]);
      cord(g, [[390, 214], [408, 214], [420, 236], [490, 250], [560, 264]]);
    } else if (r.kind === 'cap') {
      capCan(g, `CAP ${r.c} µF`, [[228, 226], [179, 222]]);
      cord(g, [[158, 222], [128, 226]]);
    } else if (r.kind === 'both') {
      choke(g, 'CHOKE', [[348, 224], [354, 216]]);
      cord(g, [[390, 214], [408, 214], [420, 236], [490, 250], [560, 264]]);
      capCan(g, 'CAP', [[228, 226], [179, 222]]);
      cord(g, [[158, 222], [128, 226]]);
    } else if (r.part === 'L') {
      choke(g, `CHOKE ${r.l} mH`, roofWire([CHOKE_BOX.x - 18, CHOKE_BOX.y]));
    } else {
      capCan(g, `CAP ${r.c} µF`, roofWire([CAP_CAN.x, CAP_CAN.y - 15]));
    }
    if (r.kind === 'steady') dropper(g, `R ${r.r} Ω`);

    // the lamps
    const big = ft === 'part' ? 'b' : ft === 'dropper' ? 'a' : '';
    if (n === 1 || n === 3) for (const [x, y] of LAMPS) lamp(g, x, y, { a: broken ? 0 : trailA, flash: flashV, broken });
    if (n === 2 || n === 3) lamp(g, PORCH.x, PORCH.y, { a: broken ? 0 : porchA, red: true, flash: flashV, broken });
    if (n === 4) {
      lamp(g, ROOF.a[0], ROOF.a[1], { a: roofA, big: big === 'a' });
      lamp(g, ROOF.b[0], ROOF.b[1], { a: roofA, big: big === 'b' });
    }

    if (driftAt === 'trail') drift(g, DRIFT_TRAIL[0], DRIFT_TRAIL[1], hidden, colors);
    if (driftAt === 'door') drift(g, DRIFT_DOOR[0], DRIFT_DOOR[1], hidden, colors);
    if (!hidden) party(g, t, { pts: partyPts(), state: pState, colors, topple, beam });
    dolma(g, t, { mood, lean, gripY: leverY(f, lo, hi) + shift, both, armsUp, wave, lamp: !!shot, snow: 3 * clamp01(A.t / 45) });
    if (n === 4 && win && rt >= tv) inset(g);
    snow(g, kk, t, n === 4 && !win && on ? { near: [(ROOF.a[0] + ROOF.b[0]) / 2, ROOF.a[1]], pulse } : {});

    // the lamp meter
    g.fillStyle = '#02060a';
    g.fillRect(LCD.x, LCD.y, LCD.w, LCD.h);
    g.strokeStyle = '#555c7d';
    g.lineWidth = 1;
    g.strokeRect(LCD.x, LCD.y, LCD.w, LCD.h);
    text(g, lcd, LCD.x + LCD.w / 2, LCD.y + 13, live ? lcdColor : PAL.dim, 12);

    // the lever's grip with the player's own setting, and the round's goal; both only while setting up
    if (!shot) {
      const y = leverY(f, lo, hi);
      const cue = n === 1 && k === 0 && !grab.touched;
      if (cue) {
        const u = (t * 1.1) % 1;
        g.globalAlpha = 0.7 * (1 - u);
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(SLUICE.x, y, 20 + 4 + u * 12, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
      }
      g.fillStyle = grab.held ? 'rgba(255,210,63,0.4)' : 'rgba(10,16,48,0.25)';
      g.beginPath();
      g.arc(SLUICE.x, y, 20, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = grab.held ? PAL.yellow : PAL.white;
      g.lineWidth = grab.held ? 4 : 2;
      g.beginPath();
      g.arc(SLUICE.x, y, 20, 0, Math.PI * 2);
      g.stroke();
      text(g, '⇕', SLUICE.x, y - 26, grab.held ? PAL.yellow : PAL.white, 13);
      text(g, '⇕', SLUICE.x, y + 36, grab.held ? PAL.yellow : PAL.white, 13);
      tag(g, `${f} Hz`, SLUICE.x + 26, y + 4, 'left', PAL.yellow, 13);
      if (cue) text(g, 'drag', SLUICE.x + 26, y + 20, PAL.white, 11, 'left');
      g.fillStyle = 'rgba(6,10,36,0.8)';
      g.fillRect(170, 16, 300, 20);
      text(g, goal(r), 320, 31, PAL.white, 13);
    }
  }

  const dial: DialSpec<Round> = { key: 'f', aria: 'Turbine frequency in hertz', label: 'Turbine', unit: 'Hz', step: DIAL.f.step, min: lo, max: hi, start: dialOf(n).start };
  const handle: HandleSpec<Round> = {
    dial: 'f',
    at: (_r, v) => [SLUICE.x, leverY(v.f, lo, hi)],
    drag: (_r, _px, py) => lo + ((SLUICE.y0 - py) / (SLUICE.y0 - SLUICE.y1)) * (hi - lo),
    radius: 20,
  };

  return {
    hero: { name: 'Dolma', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: [dial],
    handles: [handle],
    test: {
      button: '🔎 Meter check',
      aria: 'Meter check: read the lamp meter for this frequency',
      read: (r, v) => {
        flash.paid();
        return meterText(r, v);
      },
    },
    fire: { button: '💡 Light the lamps', aria: 'Open the sluice and switch on the lamps' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => [320, 80],
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
