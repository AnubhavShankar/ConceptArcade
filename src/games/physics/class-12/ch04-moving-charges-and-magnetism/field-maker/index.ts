// Inspirations (code comment only): creature-care games where you tune a habitat until the pet is happy, and "lead the critter home" puzzle games
// (the hatchling swims for the right exit only when the world is set up right). The player winds and bends coils of wire round a turtle tank and
// presses Switch on. The art is in art.ts.
// Never leak the answer: Nui's paths go to three fixed gate points (or two fixed circles) and the level 1 needle takes four fixed angles; the field
// meter is the only helper (live in round 1, for 1.5 s after a meter check in round 2, never in round 3); the field symbols over the tank show only
// during a trial, and only the field the player made; `hit` is a fixed point; every animation ends by 2.3 s.
import { PAL, type Arcade } from '@core/arcade';
import { defineGame } from '@core/define';
import { helperOn, paidFlash } from '@core/aidflash';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { along, text } from '@core/neon';
import {
  BUCKET, COIL_R, GATES, GAUGE, HIT, INNER_R, KNOB, LCD, OUTER_R, TANK, TRK, arcWire, bucket, clamp01, coilRing, ease, fieldMeter, gatePt, gates, gauge, goalLine, handleGrip, lab,
  labCard, leilani, nui, probe, sideInset, supply, supplyWire, tag, tank, trimWire, wireAt, type NuiMood,
} from './art';
import { DIAL, LCD_OFF, buildRounds, card, fault, goal, hintText, judge, lcdText, meterText, missText, netUT, verdictDelay, winText, type Round, type Values } from './logic';

const ARIA = 'A sea-turtle lab seen from above: a biologist beside a round tank wrapped in a coil of wire, where a hatchling swims for one of three gates.';
const ROLE = 'a marine biologist who tests sea-turtle hatchlings in a coil-wrapped tank before their dawn release';
const HEROES = [
  {
    story: 'A sea-turtle hatchling knows where it is from the Earth’s magnetic field: how strong it is, and whether it points down into the sea floor or up out of it. In Leilani’s shielded lab a coil around the tank makes the only field. First she calibrates the probe at the tank’s centre with a short trim wire. A current element makes dB = (μ₀/4π) I dl sin θ/r², pointing along dl × r.',
    objective: 'Set the trim wire’s current and its direction so the probe reads the calibration field, in three tries.',
  },
  {
    story: 'The first trial. Nui, a loggerhead hatchling, swims for the open sea only if the tank holds the field of home. Every turn of the coil adds μ₀I/2R at the centre, so B = μ₀NI/2R. Curl your right fingers along the current and the thumb points along the field: anticlockwise seen from above points up.',
    objective: 'Wind the coil and set its current’s sense so Nui feels home and swims for the open sea, in three trials.',
  },
  {
    story: 'The coil frame cracked, so Leilani bends a single thick wire into an arc instead. Each part of the arc adds to the field at the centre, so an arc of φ degrees gives φ/360 of the loop’s μ₀I/2R. The straight leads point at the centre: for them dl × r = 0, and they add nothing.',
    objective: 'Drag the arc round the circle and set the current’s sense to make the field of home, in three trials.',
  },
  {
    story: 'The new hatchlings are too lively for the shallow tank, so it sits on a stand above the coil, on its axis. There the field is weaker: B = μ₀NIR²/2(R² + x²)^(3/2), which at x = 0 is the centre value μ₀NI/2R.',
    objective: 'Wind the coil so the raised tank holds the field of home, in three trials.',
  },
  {
    story: 'Dawn is close, and the last hatchlings need fields from far across the ocean. A second coil around the first shares its centre and carries the same current. With the currents the same way their fields add; opposite ways, they subtract, and the bigger one wins.',
    objective: 'Wind the outer coil and set its sense so the two fields together make the field of home, in three trials.',
  },
];

type Out = 'win' | 'flip' | 'weak' | 'strong';
const DEG = Math.PI / 180;
const PEAK = { win: 60, weak: 27, strong: 81 }; // the level 1 needle: fixed angles from the top, towards the target side
const NUI_IDLE = (tt: number): [number, number, number] => {
  const a = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 1.2 : tt * 0.7;
  return [TANK.x + 10 * Math.cos(a), TANK.y + 10 * Math.sin(a), a + Math.PI / 2];
};
const lerpAngle = (a: number, b: number, u: number) => {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * u;
};

/** A handle on the bottom track. The drag records the clock for the highlight and clears the first-touch cue. */
const trk = (key: string, lo: number, hi: number, mark: () => void): HandleSpec<Round> => ({
  dial: key,
  at: (_r, v) => [TRK.x0 + ((v[key] - lo) / (hi - lo)) * (TRK.x1 - TRK.x0), TRK.y],
  drag: (_r, px) => (mark(), lo + ((px - TRK.x0) / (TRK.x1 - TRK.x0)) * (hi - lo)),
  radius: 20,
});
const knob = (key: string, mark: () => void): HandleSpec<Round> => ({
  dial: key,
  at: (_r, v) => [KNOB.x + (v[key] ? 14 : -14), KNOB.y],
  drag: (_r, px) => (mark(), px > KNOB.x ? 1 : 0),
  radius: 20,
});
const senseDial = (aria: string, label: string): DialSpec<Round> => ({
  key: 'sense', aria, label, unit: '', step: 1, min: DIAL.sense.min, max: DIAL.sense.max, start: DIAL.sense.start, text: (x) => (x ? 'anticlockwise ↺' : 'clockwise ↻'),
});
const turnsDial = (aria: string, label: string): DialSpec<Round> => ({
  key: 'n', aria, label, unit: '', step: DIAL.n.step, min: DIAL.n.min, max: DIAL.n.max, start: DIAL.n.start, text: (x) => `${x} turns`,
});

function level(n: 1 | 2 | 3 | 4 | 5, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  let arc: Arcade | null = null;
  let touched = false;
  let lastDrag = -10;
  const mark = () => {
    touched = true;
    lastDrag = arc?.clock ?? 0;
  };
  const fx = { shot: null as unknown, done: new Set<string>() };

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    const v = s.v as Values;
    arc = A;
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
    const live = !shot && helperOn(r.assist, false, since);
    A.canvas.dataset.lcd = live ? '1' : '0';
    const f = shot ? fault(r, shot.v) : null;
    const out: Out | null = shot ? (f ?? 'win') : null;
    if (out) A.canvas.dataset.take = out;
    else delete A.canvas.dataset.take;
    const tv = verdictDelay(r);
    const after = shot ? rt - tv : -1; // seconds since the verdict
    const hot = t - lastDrag < 0.15;

    // ---- the room, the tank, the rim and gates
    lab(g, t, k, n !== 4);
    tank(g, t, k);
    gates(g, t, out === 'weak' && rt >= 1.2 ? 'shallows' : out === 'strong' && rt >= 1.2 ? 'rocks' : null);

    // ---- the trial
    const on = !!shot && rt > 0;
    let leiMood: 'happy' | 'worried' | 'cheer' = 'happy';
    if (shot) {
      once('click', () => A.float('CLICK', 92, 232, PAL.white));
      if (after >= 0) {
        leiMood = out === 'win' ? 'cheer' : 'worried';
        if (out === 'win') once('sound', () => A.sound('win'));
      }
    }
    const press = shot ? (rt < 0.1 ? ease(rt / 0.1) : Math.max(0, 1 - (rt - 0.1) / 0.2)) : 0;
    const coilRt = shot && rt >= 0.1 && rt < 1.5 ? rt - 0.1 : -1;
    let bucketOpts = { count: k + 1, nui: false, clap: 0, hide: 0, watch: !!shot };

    if (n === 1) {
      const r1 = r as Extract<Round, { kind: 'trim' }>;
      coilRing(g, COIL_R, 0, { rt: -1, alpha: 0.3, arrows: false });
      probe(g, t);
      trimWire(g, r1, v.dir!, shot ? rt : -1);
      const sg = r1.up ? 1 : -1;
      let needle = 0;
      if (shot) {
        const target = out === 'win' ? sg * PEAK.win : out === 'weak' ? sg * PEAK.weak : out === 'strong' ? sg * PEAK.strong : -sg * PEAK.win;
        needle = target * ease((rt - 0.5) / 0.4);
      }
      gauge(g, r1.up, needle, after >= 0 ? (out === 'win' ? 'ok' : 'off') : null);
      supply(g, 1, on, v.dir!);
      const clap = out === 'win' && after >= 0 ? 0.5 + 0.5 * Math.sin(after * 16) : 0;
      const hide = out && out !== 'win' && after >= 0 ? ease(after / 0.1) * (1 - ease((after - 0.6) / 0.2)) : 0;
      bucketOpts = { count: 1, nui: true, clap, hide, watch: false };
    } else {
      // coils
      const r5 = r.kind === 'pair' ? r : null;
      const sense = v.sense!;
      if (n === 3) {
        arcWire(g, v.deg!, sense, { rt: coilRt, leadTags: k === 0 });
      } else if (r5) {
        coilRing(g, INNER_R, r5.s1, { rt: coilRt, tag: 'inner' });
        coilRing(g, OUTER_R, sense, { rt: coilRt, tag: 'outer' });
        supplyWire(g, OUTER_R);
      } else {
        coilRing(g, COIL_R, sense, { rt: coilRt });
        supplyWire(g, COIL_R);
      }
      supply(g, n, on, sense);
      if (n === 4) sideInset(g);

      // Nui: idle round the tank's centre; in a trial a straight line to one of three fixed gates, or two fixed circles
      let [nx, ny, nh] = NUI_IDLE(t);
      let mood: NuiMood = 'happy';
      let alpha = 1;
      let wobble = 0;
      let spin: number | undefined;
      if (shot && rt >= 0.5) {
        const [px, py, ph] = NUI_IDLE(t - rt + 0.5);
        const u1 = ease((rt - 0.5) / 0.2);
        if (out === 'win') {
          const G = gatePt(GATES.sea);
          const pts: [number, number][] = [[px, py], G, [TANK.x, 30]];
          [nx, ny] = along(pts, clamp01((rt - 0.7) / 0.9));
          nh = lerpAngle(ph, -Math.PI / 2, u1);
          alpha = 1 - ease((rt - 1.7) / 0.5);
          if (after >= 0) once('heart', () => A.float('♥', G[0], G[1] - 14, PAL.pink));
        } else if (out === 'flip') {
          const u = rt - 0.5;
          const th = 4 * Math.PI * clamp01(u / 0.8);
          const cx = TANK.x + 16 * Math.cos(th);
          const cy = TANK.y + 16 * Math.sin(th);
          const c = ease(u / 0.15);
          nx = px + (cx - px) * c;
          ny = py + (cy - py) * c;
          nh = th + Math.PI / 2;
          mood = rt < 1.8 ? 'dizzy' : 'happy';
          if (rt >= 1.3) {
            const b = ease((rt - 1.3) / 0.3);
            const [ix, iy, ih] = NUI_IDLE(t);
            nx = cx + (ix - cx) * b;
            ny = cy + (iy - cy) * b;
            nh = lerpAngle(th + Math.PI / 2, ih, b);
          }
          if (rt >= 1.0) once('q', () => A.float('?', nx, ny - 20, PAL.yellow));
        } else {
          const G = gatePt(out === 'weak' ? GATES.shallows : GATES.rocks);
          const head = Math.atan2(G[1] - py, G[0] - px);
          const e = clamp01((rt - 0.7) / 0.5);
          nx = px + (G[0] - px) * e;
          ny = py + (G[1] - py) * e;
          nh = lerpAngle(ph, head, u1);
          if (rt >= 1.2) {
            const w = rt - 1.2;
            wobble = w < 0.3 ? Math.sin((w / 0.3) * Math.PI * 3) * 10 * DEG : 0;
            nx -= Math.cos(head) * 4;
            ny -= Math.sin(head) * 4;
            mood = w < 0.5 ? 'dazed' : 'happy';
            once('bonk', () => A.float('bonk', G[0] + (out === 'weak' ? 18 : -18), G[1] + 22, PAL.orange));
          }
        }
        void spin;
      }
      // the field the player made, over the tank, only during a trial
      if (shot) {
        const up = r5 ? netUT(r5, shot.v.sense, shot.v.n) > 0 : shot.v.sense === 1;
        const a = Math.min(ease((rt - 0.1) / 0.4), 1 - ease((rt - 1.2) / 0.4)) * 0.45;
        if (a > 0) {
          g.globalAlpha = a;
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) text(g, up ? '⊙' : '⊗', TANK.x + (i - 1) * 40, TANK.y + (j - 1) * 40 + 4, PAL.white, 12);
          g.globalAlpha = 1;
        }
      }
      nui(g, nx, ny, nh, t, { mood, alpha, wobble, paddle: true, spin });
    }

    // ---- the card, the bucket, Leilani, the field meter
    labCard(g, card(r));
    bucket(g, t, bucketOpts);
    leilani(g, t, { mood: leiMood, press, hop: leiMood === 'cheer' ? Math.min(1, after / 0.3) : 0 });
    fieldMeter(g, live ? lcdText(r, v) : LCD_OFF, r.assist === 0 ? PAL.green : PAL.yellow);

    // ---- the grips, each with the player's own setting beside it
    if (!shot) {
      const sx = KNOB.x + (v.sense ?? v.dir ? 14 : -14);
      handleGrip(g, sx, KNOB.y, '⇔', hot);
      const sw = n === 1 ? (v.dir ? '→' : '←') : v.sense ? '↺' : '↻';
      tag(g, sw, KNOB.x + 14 + 26, KNOB.y + 4, 'left');
      if (n === 3) {
        const a = v.deg! * DEG;
        const ex = TANK.x + COIL_R * Math.cos(a);
        const ey = TANK.y - COIL_R * Math.sin(a);
        handleGrip(g, ex, ey, '↻', hot);
        tag(g, `${v.deg}°`, TANK.x + (COIL_R + 38) * Math.cos(a), TANK.y - (COIL_R + 38) * Math.sin(a) + 4, 'center');
      } else {
        const key = n === 1 ? 'i' : 'n';
        const lo = n === 1 ? DIAL.i.min : DIAL.n.min;
        const hi = n === 1 ? DIAL.i.max : DIAL.n.max;
        const hx = TRK.x0 + ((v[key]! - lo) / (hi - lo)) * (TRK.x1 - TRK.x0);
        handleGrip(g, hx, TRK.y, '⇔', hot);
        const read = n === 1 ? `${v.i} A` : `${v.n} turns`;
        if (hx > 360) tag(g, read, hx - 26, TRK.y + 4, 'right');
        else tag(g, read, hx + 26, TRK.y + 4, 'left');
        if (n === 1 && k === 0 && !touched) {
          const bob = Math.sin(t * 4) * 3;
          tag(g, 'drag ⇔', hx, TRK.y - 30 + bob, 'center');
        }
      }
      goalLine(g, goal(r));
    }
    // keep the knob positions from sitting on the LCD
    void LCD;
    void GAUGE;
    void BUCKET;
    void wireAt;
  }

  const dials: DialSpec<Round>[] = [];
  const handles: HandleSpec<Round>[] = [];
  if (n === 1) {
    dials.push(
      { key: 'dir', aria: 'Trim wire current direction: 1 left to right, 0 right to left', label: 'Direction', unit: '', step: 1, min: 0, max: 1, start: 0, text: (x) => (x ? 'left to right →' : 'right to left ←') },
      { key: 'i', aria: 'Trim wire current in amperes', label: 'Current', unit: 'A', step: 1, min: DIAL.i.min, max: DIAL.i.max, start: DIAL.i.start },
    );
    handles.push(knob('dir', mark), trk('i', DIAL.i.min, DIAL.i.max, mark));
  } else if (n === 3) {
    dials.push(senseDial('Coil current seen from above: 1 anticlockwise, 0 clockwise', 'Sense'), { key: 'deg', aria: 'Angle of the arc in degrees', label: 'Arc', unit: '°', step: DIAL.deg.step, min: DIAL.deg.min, max: DIAL.deg.max, start: DIAL.deg.start });
    handles.push(knob('sense', mark), {
      dial: 'deg',
      at: (_r, v) => [TANK.x + COIL_R * Math.cos(v.deg * DEG), TANK.y - COIL_R * Math.sin(v.deg * DEG)],
      drag: (_r, px, py) => {
        mark();
        const a = (Math.atan2(TANK.y - py, px - TANK.x) * 180) / Math.PI;
        return a <= 0 ? a + 360 : a;
      },
      radius: 20,
    });
  } else {
    const outer = n === 5;
    dials.push(
      senseDial(outer ? 'Outer coil current seen from above: 1 anticlockwise, 0 clockwise' : 'Coil current seen from above: 1 anticlockwise, 0 clockwise', outer ? 'Outer sense' : 'Sense'),
      turnsDial(outer ? 'Number of turns on the outer coil' : 'Number of turns on the coil', outer ? 'Outer turns' : 'Turns'),
    );
    handles.push(knob('sense', mark), trk('n', DIAL.n.min, DIAL.n.max, mark));
  }

  return {
    hero: { name: 'Leilani', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: {
      button: '🔎 Meter check',
      aria: 'Meter check: read the field meter for this setting',
      read: (r, v) => {
        flash.paid();
        return meterText(r, v as Values);
      },
    },
    fire: { button: '🐢 Switch on', aria: 'Switch on the coil and start the trial' },
    judge: (r, v) => judge(r, v as Values),
    miss: (r, v) => missText(r, v as Values),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => HIT,
    delay: (r) => verdictDelay(r),
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
