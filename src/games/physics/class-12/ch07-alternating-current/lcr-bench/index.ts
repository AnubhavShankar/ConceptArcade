// "Main Stage Soundcheck" (Section 7.6.1 and 7.7). Inspirations (code comment only): rhythm and music-festival games (the crowd reacts to every drop), and DJ games where
// the player rides faders on a mixer.
// Core verb: ride one vertical fader on the festival's crossover rack, then drop the beat. The fader sets a capacitor, a coil tap, the master voltage or the bass note.
// Never leak the answer: the meter bridge (LCD) is the only helper (live in round 1, 1.5 s after a paid check in round 2, never in round 3); sound rings, level 3 needles and
// the crowd's reactions take only fixed forms; before Fire the level 3 needles rest at zero; `hit` is a fixed point; every animation ends by 2.3 s. The art is in art.ts.
import { PAL } from '@core/arcade';
import { helperOn, paidFlash } from '@core/aidflash';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pointerToLocal } from '@core/sim';
import {
  FADER, MIDDRV, TIGER, TWEETER, WOOFER, amp, cable, calm, crowd, desk, ease, faderCap, faderGrip, faderY, goalPill, mehr, rack, rings, sky, stack, stage, tiger,
  type CrowdState, type MehrMood, type TigerState,
} from './art';
import { DIAL, LCD_OFF, NEEDLE, RING, TWO_PI, buildRounds, fault, goal, hintText, judge, lcdText, meterText, missText, verdictDelay, winText, type Round } from './logic';

const ARIA = 'An open-air music festival at night: a sound engineer at her mixing desk beside a crossover rack, a speaker stack on the stage, a masked DJ and a crowd waiting for the beat to drop.';
const ROLE = 'the sound engineer of an open-air music festival, who sets every speaker’s crossover by hand';
const HEROES = [
  {
    story: 'The festival opens tonight and Mehr runs the sound. Each speaker stack has a tweeter for the highs, a mid driver and a woofer for the bass. The tweeter sits behind a capacitor, so its current is set by its resistance R and the capacitor’s reactance X_C = 1/(2πfC). They do not simply add: the voltage across R is in step with the current and the voltage across C is a quarter cycle behind, so Z = √(R² + X_C²).',
    objective: 'Set the capacitor so the tweeter gets exactly the current it needs when the beat drops, in three songs.',
  },
  {
    story: 'The mid driver sits behind a coil and a capacitor in series. Their reactances pull against each other: Z = √(R² + (X_L − X_C)²). When X_L is bigger the current lags the voltage; when X_C is bigger it leads, with tan φ = (X_L − X_C)/R. To sound in step with the woofer, each song asks for a lagging or a leading current.',
    objective: 'Slide the coil’s tap so the mid gets the right current, lagging or leading as the song asks, in three songs.',
  },
  {
    story: 'At soundcheck the crew wrote down three meter readings: across the tweeter, its coil and its capacitor. Then someone bumped the master fader. The three voltages do not add up to the amplifier’s voltage, because they are not in step: V_L and V_C are opposite, and V_R is a quarter cycle from both.',
    objective: 'Put the master fader back on the exact voltage that gave the soundcheck readings, in three songs.',
  },
  {
    story: 'The woofer’s voice coil is a real coil: a resistance R in series with an inductance L. Only the resistance turns electrical power into sound and heat, so P = I²R = VI cos φ, with the power factor cos φ = R/Z. The higher the bass note, the bigger X_L, so the smaller the current and the power.',
    objective: 'Pick the bass note that gives the woofer exactly the power the drop needs, in three songs.',
  },
];
const DIALS = [
  { key: 'c', aria: 'Capacitor in front of the tweeter, in microfarads', label: 'Capacitor', unit: 'µF' },
  { key: 'l', aria: 'Coil tap in front of the mid driver, in millihenry', label: 'Coil', unit: 'mH' },
  { key: 'v', aria: 'Master fader, the amplifier voltage in volts', label: 'Master', unit: 'V' },
  { key: 'f', aria: 'Bass note frequency in hertz', label: 'Bass note', unit: 'Hz' },
] as const;

const PEEK_SECONDS = 1.5;
/** Every effect of a take is over by this many seconds. */
const END = 2.3;
type Out = 'win' | NonNullable<ReturnType<typeof fault>>;
const LED_IDLE = '#2f55d8';
const DRIVERS = [[TWEETER], [MIDDRV], [TWEETER, MIDDRV, WOOFER], [WOOFER]] as const;
const RING_COLOR = (y: number) => (y === TWEETER.y ? PAL.yellow : y === MIDDRV.y ? PAL.pink : PAL.cyan);

function level(n: 1 | 2 | 3 | 4, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const spec = DIALS[n - 1];
  const D = DIAL[spec.key];
  const flash = paidFlash();
  const fx = { shot: null as unknown, done: new Set<string>() };
  const grab = { held: false, touched: false, bound: null as HTMLCanvasElement | null, y: FADER.y0 };

  /** One watcher per canvas: whether the fader's ring is held, and whether the canvas was ever touched (the first-touch cue). */
  function watch(c: HTMLCanvasElement) {
    if (grab.bound === c) return;
    grab.bound = c;
    c.addEventListener('pointerdown', (e) => {
      const p = pointerToLocal(e, c, 640, 340);
      grab.touched = true;
      if (Math.hypot(p.x - FADER.x, p.y - grab.y) <= 34) grab.held = true;
    });
    const release = () => {
      grab.held = false;
    };
    c.addEventListener('pointerup', release);
    c.addEventListener('pointercancel', release);
  }

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    const val = s.v[spec.key];
    const y = faderY(val, D.min, D.max);
    grab.y = y;
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

    // the meter bridge: live in round 1, for 1.5 s after a paid check in round 2, never in round 3
    const since = flash.since(t, k);
    const live = r.assist === 0 || (!shot && helperOn(r.assist, false, since) && since < PEEK_SECONDS);
    A.canvas.dataset.lcd = live ? '1' : '0';
    const x = { [spec.key]: val };
    const lcd = live ? lcdText(r, x) : LCD_OFF;
    const lcdColor = r.assist === 0 ? PAL.green : PAL.yellow;

    // ---- the take ----
    const out: Out | null = shot ? (shot.ok ? 'win' : fault(r, shot.v)!) : null;
    if (out) A.canvas.dataset.take = out;
    else delete A.canvas.dataset.take;
    const tv = shot ? verdictDelay(r, shot.v) : 0;
    const on = !!shot && rt < END;
    const wind = on && rt < 0.4;
    const burnt = on && out === 'loud' && n < 3 && rt >= 0.45;
    const slammed = on && out === 'loud' && n === 4 && rt >= 0.45;

    let flashBeams = false;
    let slam = 0;
    const pump = { tweeter: 0, mid: 0, woofer: 0 };
    let led = LED_IDLE;
    let crack: 'tweeter' | 'mid' | null = null;
    let smoke = -1;
    let jump = 0;
    let shake = 0;
    let crowdState: CrowdState = 'idle';
    let mood: MehrMood = 'happy';
    let fists = 0;
    let tState: TigerState = 'idle';
    let needle = 0;
    let limiter = false;
    let ringAlpha = 0;
    const ringSpecs: { x: number; y: number; color: string; alpha: number; jagged?: boolean; max?: number }[] = [];
    const wobble = Math.sin(rt * TWO_PI * 4) * 3;
    const which = ['tweeter', 'mid', 'woofer'] as const;

    if (on) {
      flashBeams = rt < 0.1;
      slam = rt < 0.12 ? rt / 0.12 : rt < 0.3 ? 1 - (rt - 0.12) / 0.18 : 0;
      once('drop', () => A.float('DROP!', 140, 170, PAL.white));
      tState = rt >= tv ? (out === 'win' ? 'win' : 'miss') : 'fire';
      const active = DRIVERS[n - 1];
      const drive = (alpha: number, o: { jagged?: boolean; max?: number } = {}) => {
        for (const d of active) {
          if (out === 'phase' && d === TWEETER) continue;
          ringSpecs.push({ x: d.x, y: d.y, color: RING_COLOR(d.y), alpha, ...o });
        }
        ringAlpha = alpha;
      };
      const pumpAll = () => {
        for (const d of active) pump[which[d === TWEETER ? 0 : d === MIDDRV ? 1 : 2]] = wobble;
      };
      if (wind) {
        pumpAll();
        drive(RING.faint);
      } else if (out === 'win') {
        pumpAll();
        drive(RING.right);
        led = PAL.green;
        needle = n === 3 ? NEEDLE.right * ease((rt - 0.4) / 0.2) : 0;
      } else if (out === 'quiet') {
        pumpAll();
        drive(RING.faint);
        needle = n === 3 ? NEEDLE.low * ease((rt - 0.4) / 0.2) : 0;
      } else if (out === 'phase') {
        pump.mid = wobble;
        pump.woofer = wobble;
        ringSpecs.push({ x: MIDDRV.x, y: MIDDRV.y, color: PAL.pink, alpha: RING.right, max: 60 }, { x: WOOFER.x, y: WOOFER.y, color: PAL.cyan, alpha: RING.right, max: 60 });
        ringAlpha = RING.right;
      } else if (n < 3) {
        // burnt out: a POP!, the dome cracks, grey smoke, no more rings, the LED strip blinks red twice
        if (rt < 0.45) {
          pumpAll();
          drive(RING.faint);
        } else {
          crack = n === 1 ? 'tweeter' : 'mid';
          if (rt < 2.2) smoke = rt - 0.45;
          const b = rt - 0.45;
          if (b < 0.5 && b % 0.25 < 0.15) led = PAL.red;
          once('pop', () => {
            const p = n === 1 ? TWEETER : MIDDRV;
            A.float('POP!', p.x, p.y - 22, PAL.white);
            A.burst(p.x, p.y, PAL.white, 10, 120);
          });
        }
      } else if (n === 3) {
        // distorted: the limiter LED, jagged rings, the needles swing to 125%
        limiter = true;
        pumpAll();
        drive(RING.right, { jagged: true });
        needle = NEEDLE.high * ease((rt - 0.4) / 0.2);
      } else {
        // slammed: the woofer's cone jumps with a BONK and the stack shakes
        jump = 8 * Math.sin(Math.PI * Math.min(1, (rt - 0.45) / 0.3));
        if (rt < 0.75 && !calm()) shake = 3;
        if (rt < 1.4) drive(RING.right, { jagged: true });
        once('bonk', () => A.float('BONK', WOOFER.x, WOOFER.y - 34, PAL.white));
      }
      if (n === 3 && out && rt >= 0.4) A.canvas.dataset.needle = needle.toFixed(2);

      // the crowd, Mehr and the headliner react
      if (out === 'win') {
        if (rt >= tv) {
          crowdState = 'jump';
          mood = 'cheer';
          fists = ease((rt - tv) / 0.2);
          once('wooo', () => {
            A.float('WOOO!', 420, 250, PAL.yellow);
            A.float('YEAH!', TIGER.x, 100, PAL.yellow);
            A.burst(372, 250, PAL.yellow, 30, 200);
            A.burst(628, 250, PAL.pink, 30, 200);
          });
        }
      } else if (out === 'loud') {
        if (rt >= 0.45) crowdState = 'ears';
        if (burnt || slammed) mood = 'frazzled';
        else if (rt >= tv) mood = 'worried';
        if (rt >= tv) once('ow', () => A.float('OW!', 420, 250, PAL.red));
      } else {
        crowdState = out === 'phase' ? 'look' : 'still';
        if (rt >= tv) mood = 'worried';
        if (rt >= 0.8) once('huh', () => A.float(out === 'phase' ? 'HOLLOW…' : 'HUH?', 420, 250, PAL.white));
      }
    }
    if (ringAlpha > 0) A.canvas.dataset.ring = ringAlpha.toFixed(2);
    else delete A.canvas.dataset.ring;
    if (!(n === 3 && on && needle > 0)) delete A.canvas.dataset.needle;

    // ---- compose the frame ----
    sky(g, k, t);
    stage(g, t, { k, flash: flashBeams, fireworks: k === 2 && !shot });
    tiger(g, t, tState, on ? rt - tv : 0);
    stack(g, t, { pump, led, crack, smoke, jump, shake });
    for (const q of ringSpecs) rings(g, q.x, q.y, q.color, q.alpha, rt, { jagged: q.jagged, max: q.max });
    crowd(g, t, k, crowdState);
    cable(g);
    const rk = {
      tweet: { kind: 'tweet' as const, plate: r.kind === 'tweet' ? `TWEETER ${r.r} Ω` : '' },
      mid: { kind: 'mid' as const, plate: r.kind === 'mid' ? `MID ${r.r} Ω` : '', can: r.kind === 'mid' ? `${r.c} µF` : '', tap: (s.v.l - DIAL.l.min) / (DIAL.l.max - DIAL.l.min) },
      meters: { kind: 'meters' as const, plate: 'SOUNDCHECK', meters: r.kind === 'meters' ? { vr: r.vr, vl: r.vl, vc: r.vc, needle } : undefined, limiter },
      woof: { kind: 'woof' as const, plate: r.kind === 'woof' ? `WOOFER ${r.r} Ω · ${r.l} mH` : '' },
    }[r.kind];
    rack(g, rk);
    amp(g, r.kind === 'tweet' ? `${r.v} V` : r.kind === 'meters' ? 'MASTER' : 'AMP');
    desk(g, { lcd, lcdColor, live, drop: slam });
    mehr(g, t, { mood, slam, fists });
    faderCap(g, y, grab.held && !shot);
    // the fader's ring with the player's own setting, and the round's goal; both only while setting up
    if (!shot) {
      const read = spec.key === 'c' ? `${val} µF` : spec.key === 'l' ? `${fmt(val)} mH` : spec.key === 'v' ? `${val} V` : `${val} Hz`;
      faderGrip(g, t, y, { held: grab.held, cue: n === 1 && k === 0 && !grab.touched, read });
      goalPill(g, goal(r));
    }
  }

  const dial: DialSpec<Round> = { key: spec.key, aria: spec.aria, label: spec.label, unit: spec.unit, step: D.step, min: D.min, max: D.max, start: D.start, ...(spec.key === 'l' ? { text: (x: number) => fmt(x) } : {}) };
  const handle: HandleSpec<Round> = {
    dial: spec.key,
    at: (_r, v) => [FADER.x, faderY(v[spec.key], D.min, D.max)],
    drag: (_r, _px, py) => D.min + ((FADER.y0 - py) / (FADER.y0 - FADER.y1)) * (D.max - D.min),
    radius: 20,
  };

  return {
    hero: { name: 'Mehr', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: [dial],
    handles: [handle],
    test: {
      button: '🔎 Meter check',
      aria: 'Meter check: read the meter bridge for this fader setting',
      read: (r, v) => {
        flash.paid();
        return meterText(r, v);
      },
    },
    fire: { button: '🎚️ Drop the beat', aria: 'Drop the beat and play the speakers' },
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
