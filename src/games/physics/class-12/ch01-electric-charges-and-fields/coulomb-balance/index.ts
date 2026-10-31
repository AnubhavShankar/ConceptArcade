// "Float the Bead": a levitation lab. A metal bead sits in a glass column above a charged base; released, it floats where the Coulomb push equals its weight,
// k q Q / h² = m g, and a laser crossing the column melts it if it floats in the beam. Levels 1 to 3: charge the bead on the charger dial. Level 4: slide the laser.
// Inspirations (code comment only): Portal's numbered test chambers, each with a robot that inspects the result, and golf games (one clean shot per hole).
// Never leak the answer: the gauge (LCD) and the ghost bead are the only places a float height or force for the player's setting shows (live in round 1, for 1.5 s
// after a paid force check in round 2, never in round 3); on a miss the bead is drawn exactly OFFSET px from the beam, never at its true height; level 4 has no ghost.
import { PAL } from '@core/arcade';
import { helperOn, paidFlash } from '@core/aidflash';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { track, trackHandle } from '@core/mathkit';
import { text } from '@core/neon';
import {
  BUTTON, COL, DOT, HIT, KEYHOLE, METALS, base, bead, beam, clampArt, clamp01, column, consoleDesk, dotBot, ease, femi, jag, laser, lab, aimMarker, yOf,
  type DotState, type FemiMood, type Kind,
} from './art';
import { DIAL, LCD_OFF, OFFSET, VERDICT, baseUnit, buildRounds, checkText, fault, floatCm, floatMm, goalText, hintText, judge, lcdText, lengthUnit, massUnit, missText, sgnQ, winText, type Fault, type Round } from './logic';
import { GRIP_MIN, goalLine, grip, tag } from './ux';

const ARIA = 'A levitation lab: a scientist at a console beside a glass column where a charged metal bead floats above a charged base, with a heating laser crossing the column.';
const ROLE = 'a materials scientist who floats metal beads above a charged base and melts them in mid-air with a laser';
const HEROES = [
  {
    story: 'Femi’s furnace has no crucible: a charged base pushes a charged metal bead up a glass column until the push equals the bead’s weight, k q Q / h² = m g. Where it floats, a laser melts it into a perfect sphere. The higher the bead must float, the more charge it needs, but not in proportion: the push falls as 1/h².',
    objective: 'Charge the bead so it floats exactly in the laser beam, in three test chambers.',
  },
  {
    story: 'The new column is only 12 mm tall and the beads weigh milligrams. The law is the same, but every prefix must become SI first: 1 mg = 10⁻⁶ kg, 1 mm = 10⁻³ m, 1 nC = 10⁻⁹ C, and the answer comes out in picocoulombs (10⁻¹² C).',
    objective: 'Charge each tiny bead to the right number of picocoulombs to float it in the beam.',
  },
  {
    story: 'The base can now be charged either way. Only like charges repel: a bead charged opposite to the base is pulled straight down onto it, and an uncharged bead just sits there.',
    objective: 'Choose the sign and the size of the bead’s charge to float it in the beam.',
  },
  {
    story: 'The beads now arrive already charged, and the laser rides on a rail. Turn the balance around: the bead floats where k q Q / h² = m g, so h = √(k q Q / (m g)).',
    objective: 'Slide the laser to the height where the bead will float, in three test chambers.',
  },
];

const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
const kindOf = (r: Round): Kind => r.kind;
/** The level 4 laser emitter sits on its rail at this x. */
const RAIL_X = 273;

function level(n: 1 | 2 | 3 | 4, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const pf = paidFlash();
  let moved = false;
  let lastK = -1;
  const fx = { shot: null as unknown, done: new Set<string>() };

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    const v = s.v;
    const kind = kindOf(r);
    const still = calm();
    if (k !== lastK) {
      lastK = k;
      moved = false;
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
    const q = v.q ?? 0;
    const start = n === 4 ? DIAL.h4.start : n === 1 ? DIAL.q1.start : n === 2 ? DIAL.q2.start : DIAL.q3.start;
    if ((n === 4 ? v.h : v.q) !== start) moved = true;

    const beamH = r.kind === 'aim' ? v.h : r.h;
    const beamY = yOf(kind, beamH);
    const f: Fault | null = shot ? fault(r, shot.v) : null;
    const out: 'win' | Fault | null = shot ? (shot.ok ? 'win' : f) : null;
    const since = shot ? rt - VERDICT : -1;
    if (out) A.canvas.dataset.take = out;
    else delete A.canvas.dataset.take;

    // ---- the helper: the gauge and the ghost bead -------------------------------------------------------------------------------------------------------
    const flash = pf.since(t, k);
    const live = r.assist === 0 || (!shot && helperOn(r.assist, false, flash));
    A.canvas.dataset.lcd = live ? '1' : '0';
    const lcd = live ? lcdText(r, v) : LCD_OFF;
    const lcdColor = r.assist === 0 ? PAL.green : PAL.yellow;

    // ---- where the bead is, and what it looks like -------------------------------------------------------------------------------------------------------
    const clampY = yOf(kind, 0);
    let beadY = clampY;
    let heat = 0;
    let mirror = false;
    let open = 0;
    let scorch = 0;
    let beamA = 0;
    let fMood: FemiMood = 'happy';
    let fist = false;
    let dState: DotState = 'idle';
    let dU = 0;
    let goggles = 0;
    let hand: [number, number] | null = null;
    let reach = 0;
    let press = 0;
    let key = 0;
    let tap = 0;
    const extras: (() => void)[] = [];
    if (shot) {
      const restY = out === 'win' ? beamY : out === 'low' ? beamY + OFFSET : out === 'high' ? beamY - OFFSET : clampY;
      const rest = Math.max(COL.top + 10, Math.min(COL.base - 10, restY));
      const moves = out === 'win' || out === 'low' || out === 'high';
      A.canvas.dataset.restY = String(moves ? rest : clampY);
      open = ease(rt / 0.15);
      if (moves) {
        const u = clamp01((rt - 0.15) / 0.8);
        beadY = clampY + (rest - clampY) * (1 - (1 - u) ** 3);
        const bob = rt > 0.95 && rt < 1.4 && !still ? 6 * Math.exp(-4 * (rt - 0.95)) * Math.sin(14 * (rt - 0.95)) : 0;
        beadY += bob;
      }
      // Femi: goggles down, RELEASE pressed at once, the laser key at 1.0 s
      goggles = rt < 0.15 ? ease(rt / 0.15) : since < 0 ? 1 : 1 - ease(since / 0.25);
      const pressed = ease(rt / 0.2) * (1 - ease((rt - 0.3) / 0.15));
      const turned = ease((rt - 0.95) / 0.1) * (1 - ease((rt - 1.15) / 0.15));
      press = pressed;
      key = ease((rt - 1) / 0.15);
      if (rt < 0.45) {
        hand = [BUTTON.x, BUTTON.y];
        reach = pressed;
      } else if (rt >= 0.95 && rt < 1.3) {
        hand = [KEYHOLE.x, KEYHOLE.y];
        reach = turned;
      }
      fMood = 'squint';
      if (rt >= 0) once('click', () => A.float('CLICK', 40, 220, PAL.white));
      if (out === 'pulled' && rt >= 0.2) {
        once('snap', () => {
          A.float('SNAP', COL.x, clampY - 24, '#bfe0ff');
          A.shake(5);
        });
        if (rt < 0.7) {
          const seed = Math.floor(t / 0.05);
          extras.push(() => {
            for (let i = 0; i < 4; i++) jag(g, COL.x - 13 + i * 8.7, clampY - 5, COL.x - 17 + i * 11, COL.base - 2, seed + i * 5, '#bfe0ff', 2, 3);
          });
        }
        fMood = 'startled';
        dState = 'pulled';
        dU = rt - 0.2;
        if (rt >= 0.25) once('dotbang', () => A.float('!!', DOT.x, DOT.y - 78, PAL.yellow));
      }
      if (out === 'flat' && rt >= 0.3) once('dots', () => A.float('…', COL.x, clampY - 28, PAL.dim));
      // the beam: fires at 1.0 s, on until 1.6 s, gone by 1.8 s
      if (rt >= 1) {
        beamA = rt < 1.6 ? ease((rt - 1) / 0.08) : 1 - clamp01((rt - 1.6) / 0.2);
        once('zap', () => A.float('ZAP', 300, beamY - 18, PAL.red));
      }
      // the verdict
      if (since >= 0) {
        if (out === 'win') {
          heat = clamp01((rt - 1.1) / 0.5);
          mirror = rt >= 1.6;
          fMood = 'cheer';
          fist = true;
          dState = 'win';
          dU = since;
          once('melt', () => {
            A.float('MELT!', COL.x, beamY - 24, PAL.orange);
            A.float('FLAWLESS', DOT.x, DOT.y - 78, PAL.green);
          });
        } else if (out === 'low' || out === 'high') {
          fMood = 'worried';
          dState = 'miss';
          dU = since;
          scorch = beamA;
          once('missed', () => A.float('MISSED', DOT.x, DOT.y - 78, PAL.red));
        } else if (out === 'flat') {
          fMood = 'shrug';
          dState = 'flat';
          dU = since;
        } else if (out === 'pulled') {
          fMood = 'startled';
        }
      }
      if (dState === 'pulled' && rt >= 1.9) dState = 'idle';
    } else {
      delete A.canvas.dataset.restY;
    }
    const idle = !shot;
    // the tablet tap while idle
    if (idle && t % 5 < 0.5) tap = Math.abs(Math.sin(((t % 5) / 0.5) * Math.PI * 3));

    // ---- compose the frame -------------------------------------------------------------------------------------------------------------------------------
    lab(g, t, k, still);
    column(g, kind);
    text(g, `bead ${r.m} ${massUnit(r)}`, 380, 290, PAL.dim, 11, 'left');
    laser(g, beamY, r.kind === 'aim', scorch);
    if (beamA > 0) beam(g, beamY, beamA);
    else aimMarker(g, beamY);
    const Q = r.Q;
    base(g, Q, `base ${sgnQ(Q)} ${baseUnit(r)}`);
    clampArt(g, open);
    // the ghost bead (the helper): the dashed outline at the true float height for the dial, levels 1 to 3 only
    if (!shot && live && r.kind !== 'aim') {
      let gy = clampY;
      const noPush = r.kind === 'signed' && (q === 0 || Math.sign(q) !== Math.sign(r.Q));
      if (!noPush) {
        const fh = r.kind === 'float' ? floatCm(r.m, r.Q, q) : floatMm(r.m, r.Q, q);
        gy = Math.max(COL.top + 10, Math.min(clampY, yOf(kind, fh)));
      }
      bead(g, COL.x, gy, t, { metal: METALS[k], heat: 0, mirror: false, ghost: r.assist === 0 ? PAL.green : PAL.yellow });
    }
    bead(g, COL.x, beadY, t, { metal: METALS[k], heat, mirror });
    for (const fn of extras) fn();
    // the beam label next to the emitter: the given beam height, or the player's own laser setting
    if (r.kind === 'aim') tag(g, `${v.h} cm`, 244, beamY - 12, 'right', PAL.yellow, 12);
    else tag(g, `beam ${r.h} ${lengthUnit(r)}`, 244, beamY - 12, 'right', PAL.white, 12);
    // the console: the charger knob with the player's own charge under it
    const knobFrac = n === 1 ? (q - DIAL.q1.min) / (DIAL.q1.max - DIAL.q1.min) : n === 2 ? (q - DIAL.q2.min) / (DIAL.q2.max - DIAL.q2.min) : n === 3 ? (q + 40) / 80 : 0.5;
    const read = n === 1 ? `${q} nC` : n === 2 ? `${q} pC` : n === 3 ? (q === 0 ? '0 pC' : `${sgnQ(q)} pC`) : `${sgnQ((r as Extract<Round, { kind: 'aim' }>).q)} nC`;
    consoleDesk(g, { knob: (knobFrac * 270 - 135) * (Math.PI / 180), lcd, lcdColor, read, readColor: n === 4 ? PAL.white : PAL.yellow, press, key, tap });
    if (n < 4) track(g, n === 1 ? DIAL.q1.min : n === 2 ? DIAL.q2.min : DIAL.q3.min, n === 1 ? DIAL.q1.max : n === 2 ? DIAL.q2.max : DIAL.q3.max);
    if (n === 3) text(g, '0', 320, 338, PAL.white, 10);
    femi(g, t, { mood: fMood, goggles, hand, reach, fist, idle, calm: still });
    dotBot(g, t, { state: dState, u: dU, fire: !!shot, calm: still });
    // the handle grips, only while the player is setting up
    if (!shot) {
      if (n < 4) {
        const lo = n === 1 ? DIAL.q1.min : n === 2 ? DIAL.q2.min : DIAL.q3.min;
        const hi = n === 1 ? DIAL.q1.max : n === 2 ? DIAL.q2.max : DIAL.q3.max;
        const hx = 60 + ((q - lo) / (hi - lo)) * 520;
        grip(g, A.canvas, t, { x: hx, y: 322, r: 20, dir: 'h', read: '', side: 'above', cue: n === 1 && k === 0 && !moved });
      } else {
        grip(g, A.canvas, t, { x: RAIL_X, y: beamY, r: 20, dir: 'v', read: '', side: 'left', cue: k === 0 && !moved, glass: true });
      }
    }
    goalLine(g, goalText(r), 20, 320);
  }

  const dials: DialSpec<Round>[] = [];
  const handles: HandleSpec<Round>[] = [];
  if (n === 1) {
    dials.push({ key: 'q', aria: 'Charge on the bead in nanocoulombs', label: 'Bead charge', unit: 'nC', step: 1, min: DIAL.q1.min, max: DIAL.q1.max, start: DIAL.q1.start });
    handles.push(trackHandle('q', () => DIAL.q1.min, () => DIAL.q1.max));
  } else if (n === 2) {
    dials.push({ key: 'q', aria: 'Charge on the bead in picocoulombs', label: 'Bead charge', unit: 'pC', step: 1, min: DIAL.q2.min, max: DIAL.q2.max, start: DIAL.q2.start });
    handles.push(trackHandle('q', () => DIAL.q2.min, () => DIAL.q2.max));
  } else if (n === 3) {
    dials.push({
      key: 'q', aria: 'Charge on the bead in picocoulombs, negative or positive', label: 'Bead charge', unit: 'pC', step: 1, min: DIAL.q3.min, max: DIAL.q3.max, start: DIAL.q3.start,
      text: (x) => (x < 0 ? `−${-x}` : x > 0 ? `+${x}` : '0'),
    });
    handles.push(trackHandle('q', () => DIAL.q3.min, () => DIAL.q3.max));
  } else {
    dials.push({ key: 'h', aria: 'Height of the laser beam in centimetres', label: 'Laser height', unit: 'cm', step: 1, min: DIAL.h4.min, max: DIAL.h4.max, start: DIAL.h4.start });
    handles.push({ dial: 'h', at: (_r, v) => [RAIL_X, yOf('aim', v.h)], drag: (_r, _px, py) => (COL.base - 7 - py) / 13, radius: Math.max(20, GRIP_MIN) });
  }

  return {
    hero: { name: 'Femi', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: {
      button: '🔎 Force check',
      aria: 'Force check: compare the push of the base with the bead’s weight',
      read: (r, v) => {
        pf.paid();
        return checkText(r, v);
      },
    },
    fire: { button: '🔥 Release and fire', aria: 'Release the bead and fire the laser' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => HIT,
    delay: VERDICT,
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
