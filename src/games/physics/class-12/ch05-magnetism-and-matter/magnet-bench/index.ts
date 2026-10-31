// Inspirations (code comment only): stage-magic games and the real 1845 "light and heavy chest" trick, in which a magician hid an electromagnet under the stage; the
// floating ring-magnet toy; "Cut the Rope"-style one-cut puzzles for level 1. Noor the illusionist saws a magnet, then winds a hidden coil and wires its battery, and
// shouts "Showtime!": a ring magnet floats, falls or flies. The art is in art.ts.
// Never leak the answer: the ring always ends at a fixed height (HOVER) by outcome, never by how far the player's moment is from the answer; the rehearsal card is the
// only helper (live in round 1, for 1.5 s after a rehearsal in round 2, never in round 3); the piece's own poles are never written on it; `hit` is a fixed point;
// the gold field lines come only on a win; every animation ends by 2.3 s.
import { PAL } from '@core/arcade';
import { helperOn, paidFlash } from '@core/aidflash';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { line } from '@core/neon';
import {
  WAND_TIP, audience, bar, battery, biscuit, card, clamp01, coil, ease, fieldLines, goalLine, handleRing, noor, piece, ring, saw, secondWand, stage, standingPiece, table, tag, wand,
  type BiscuitState, type CrowdMood, type NoorOpts,
} from './art';
import {
  BAR, BATTERY, CARD_OFF, DIAL, HIT, SOCKET, TURNS, VERDICT_AT, buildRounds, cardText, fault, goalText, hintText, judge, missText, rehearsalText, ringPose, winText,
  type Outcome, type Round, type Values,
} from './logic';

const ARIA = 'A magic theatre stage: an illusionist beside a table with a glass wand, a ring magnet that floats over a magnet or coil hidden in the table, a rabbit in a top hat and an audience.';
const ROLE = 'a stage illusionist whose floating-ring act runs on real magnets and a hidden coil';
const HEROES = [
  {
    story: 'Noor’s act: a ring magnet floats on a glass wand, held up by a magnet hidden in the table, like poles facing. Tonight she saws the hidden magnet from a bar ruled in 12 equal marks. Every piece of a magnet is a whole magnet with its own N and S, and a piece of k/12 of the bar has k/12 of its moment. The paint only shows where the bar’s old poles were.',
    objective: 'Saw the right piece and stand it the right way up, so the ring floats at the gold ribbon, in three shows.',
  },
  {
    story: 'Noor swaps the hidden magnet for a coil on a plastic tube, so she can switch the float on and off. No iron is needed: a coil carrying a current is a magnet with m = NIA. Curl your right hand’s fingers along the current in the turns and your thumb points to the north end.',
    objective: 'Wind the coil and wire the battery so the ring floats at the ribbon, in three shows.',
  },
  {
    story: 'The grand finale has a second wand over a real bar magnet. Noor will replace that magnet with a coil in front of the audience, and the ring must not move: a coil with the same moment as the magnet makes the same field. The coil’s turns are measured in cm², and 1 cm² is 10⁻⁴ m².',
    objective: 'Wind a coil with the bar magnet’s moment and its pole on top, so the ring stays at the ribbon, in three shows.',
  },
];

const turnsX = (n: number) => TURNS.x0 + ((n - DIAL.n.min) / (DIAL.n.max - DIAL.n.min)) * (TURNS.x1 - TURNS.x0);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const poleOf = (r: Round) => (r.kind === 'match' ? r.top : r.under);

function level(n: 1 | 2 | 3, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const dragAt: Record<string, number> = {};
  const dragged = new Set<string>();
  let now = 0;
  let lastK = -1;
  const fx = { shot: null as unknown, done: new Set<string>() };
  /** Every drag remembers the clock (for the 0.15 s highlight) and clears the first-time cue. */
  const touch = (key: string) => {
    dragAt[key] = now;
    dragged.add(key);
  };
  const hot = (key: string) => now - (dragAt[key] ?? -10) < 0.15;

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A } = s;
    const v = s.v as Values;
    now = t;
    if (k !== lastK) lastK = k;
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
    const out: Outcome | null = shot ? (shot.ok ? 'win' : (fault(r, shot.v as Values) ?? 'snap')) : null;
    const u = out ? rt - VERDICT_AT : -1; // seconds since the verdict
    const pose = ringPose(out, rt);

    // the rehearsal card, the only helper: live in round 1, for 1.5 s after a rehearsal in round 2, never in round 3
    const on = helperOn(r.assist, false, shot ? Infinity : since);
    A.canvas.dataset.card = on ? '1' : '0';
    if (out) A.canvas.dataset.act = out;
    else delete A.canvas.dataset.act;
    A.canvas.dataset.ring = pose.y.toFixed(0);

    // the act: instant response to Showtime, then the saw or the switch, the clip, the ring, the verdict and the reactions
    if (shot) {
      once('fire', () => {
        A.float('Hey presto!', 96, 150, PAL.yellow);
        A.burst(WAND_TIP[0], WAND_TIP[1], PAL.white, 10, 90);
      });
      if (n === 1) once('dust', () => A.burst(r.kind === 'saw' && r.cut === 'across' ? BAR.x0 + 12 * v.k! : BAR.x0 + BAR.len / 2, r.kind === 'saw' && r.cut === 'across' ? BAR.y + BAR.h : BAR.y + BAR.h - 5 * v.k!, '#bbbbbb', 6, 60));
      else once('click', () => A.float('CLICK', BATTERY.x, BATTERY.y - 30, PAL.white));
      if (rt >= 0.7) once('clip', () => A.float('click', 380, 100, PAL.white));
      if (out === 'snap' && rt >= 1.15) {
        once('clack', () => {
          A.float('CLACK!', 380, 196, PAL.white);
          A.shake(5);
        });
      }
      if (u >= 0) {
        once('verdict', () => {
          if (out === 'win') {
            A.sound('win');
            A.burst(380, 124, PAL.yellow, 24, 120);
            A.float('CLAP CLAP', 200, 300, PAL.yellow);
            A.float('CLAP CLAP', 440, 300, PAL.yellow);
            A.float('👏', 520, 226, PAL.white);
          } else if (out === 'high') A.float('gasp!', 320, 300, PAL.orange);
          else A.float('ooh…', 320, 300, PAL.dim);
        });
      }
    }

    // ---- compose the frame ----
    stage(g, t, k, reduce);
    table(g, t, k, n === 3);
    wand(g, out === 'win' && u >= 0, !!shot && rt >= 0.7);
    if (n === 3 && r.kind === 'match') secondWand(g, r.top, t, shot ? ease((rt - 0.15) / 0.35) : 0);

    if (n === 1 && r.kind === 'saw') {
      const sawn = !!shot && rt >= 0.3;
      bar(g, r, v.k!, sawn);
      if (!shot || rt < 0.9) saw(g, r, v.k!, shot ? rt : -1);
      const len = r.cut === 'across' ? 12 * v.k! : BAR.len;
      if (!shot || rt >= 0.7) standingPiece(g, r, v.k!, v.up!);
      else if (rt >= 0.3) {
        const p = ease((rt - 0.3) / 0.4);
        const o: [number, number] = r.cut === 'across' ? [BAR.x0 + 6 * v.k!, BAR.y + BAR.h / 2] : [BAR.x0 + BAR.len / 2, BAR.y + BAR.h - 2.5 * v.k!];
        const sf = Math.min(0.5, 44 / len);
        piece(g, r, v.k!, lerp(o[0], SOCKET.x, p), lerp(o[1], SOCKET.y, p) - 22 * Math.sin(Math.PI * p), lerp(1, sf, p), (v.up === 0 ? Math.PI / 2 : -Math.PI / 2) * p);
      }
      if (!shot) {
        const across = r.cut === 'across';
        const sx = BAR.x0 + 12 * v.k!;
        tag(g, `mark ${v.k} · ${v.k}/12`, across ? sx : 248, across ? 150 : 154, PAL.yellow);
        tag(g, `${v.up ? 'right' : 'left'} end up`, SOCKET.x, 296, PAL.yellow);
      } else tag(g, `${v.up ? 'right' : 'left'} end up`, SOCKET.x, 296, PAL.yellow);
    } else if (r.kind !== 'saw') {
      const lever = shot && rt < 0.15 ? lerp(1 - v.dir!, v.dir!, rt / 0.15) : v.dir!;
      coil(g, v.n!, v.dir!, t, !!shot && rt >= 0.15);
      battery(g, lever, !!shot && rt >= 0.15, r.i);
      const x0 = TURNS.x0;
      line(g, x0, TURNS.y, TURNS.x1, TURNS.y, PAL.dim, 3);
      tag(g, String(DIAL.n.min), x0, 318, PAL.dim, 11);
      tag(g, String(DIAL.n.max), TURNS.x1, 318, PAL.dim, 11);
      tag(g, `${v.n} turns`, turnsX(v.n!), 272, PAL.yellow);
      tag(g, `${v.n} turns`, 412, 246, PAL.yellow, 12, 'left');
      tag(g, `front current ${v.dir ? '→' : '←'}`, BATTERY.x, 238, PAL.yellow);
      tag(g, r.kind === 'coil' ? `turn area ${r.a} × 10⁻⁴ m²` : `turn area ${r.aCm2} cm²`, 258, 208, PAL.white, 11);
      tag(g, `battery ${r.i} A`, 258, 192, PAL.white, 11);
      if (r.kind === 'match') tag(g, `${r.mBar} J/T`, 470, 296, PAL.white, 11);
    }

    // the people and the ring
    const mood: NoorOpts['mood'] = u < 0 ? 'happy' : out === 'win' ? 'cheer' : out === 'high' ? 'startled' : 'worried';
    noor(g, t, { mood, flick: shot ? rt : -1, u, saw: n === 1 });
    const bs: BiscuitState = !shot ? 'idle' : u < 0 ? 'cover' : (out as BiscuitState);
    biscuit(g, t, bs, u);
    const rm = !out ? 'idle' : out === 'high' ? (rt >= 1.0 ? 'high' : 'idle') : rt >= 1.15 ? out : 'idle';
    const sway = shot ? 0 : 2 * Math.sin(t * 1.7);
    ring(g, pose.x + sway, pose.y, rm, pose.spin ? (Math.floor(rt / 0.1) % 2 ? 2 : 1) : 0, poleOf(r), pose.h);
    if (out === 'win' && u >= 0) fieldLines(g, Math.min(1, u / 0.15) * (1 - clamp01((u - 0.8) / 0.3)));
    const crowd: CrowdMood = u < 0 ? 'idle' : out === 'win' ? 'win' : out === 'high' ? 'gasp' : 'ooh';
    audience(g, t, crowd);
    card(g, on ? cardText(r, v) : CARD_OFF, r.assist === 0 ? PAL.green : PAL.yellow);

    // handles drawn by the game, and the first-time cue
    if (!shot) {
      if (n === 1 && r.kind === 'saw') {
        const across = r.cut === 'across';
        const hx = across ? BAR.x0 + 12 * v.k! : BAR.x0 - 18;
        const hy = across ? BAR.y - 16 : BAR.y + BAR.h - 5 * v.k!;
        const cue = k === 0 && !dragged.has('k') ? t : -1;
        handleRing(g, hx, hy, across ? '⇔' : '⇕', hot('k'), cue);
        if (cue >= 0) tag(g, `drag the saw ${across ? '⇔' : '⇕'}`, across ? hx : hx + 20, hy - 30 + 3 * Math.sin(t * 4), PAL.yellow);
        handleRing(g, SOCKET.x, SOCKET.y, '⇔', hot('up'), -1);
      } else {
        handleRing(g, turnsX(v.n!), TURNS.y, '⇔', hot('n'), -1);
        handleRing(g, BATTERY.x + (v.dir ? 14 : -14), BATTERY.y + 9, '⇔', hot('dir'), -1);
      }
      goalLine(g, goalText(r));
    }
  }

  const dials: DialSpec<Round>[] = [];
  const handles: HandleSpec<Round>[] = [];
  const wrap = (key: string, f: HandleSpec<Round>['drag']): HandleSpec<Round>['drag'] => (r, px, py, v) => {
    touch(key);
    return f(r, px, py, v);
  };
  if (n === 1) {
    dials.push(
      { key: 'k', aria: 'Saw mark: how many twelfths of the bar to saw off', label: 'Saw at', unit: '', step: 1, min: DIAL.k.min, max: DIAL.k.max, start: DIAL.k.start, text: (x) => `mark ${x} (${x}/12)` },
      { key: 'up', aria: 'Which end of the piece goes up: 0 the left end, 1 the right end', label: 'End up', unit: '', step: 1, min: DIAL.up.min, max: DIAL.up.max, start: DIAL.up.start, text: (x) => (x ? 'right end' : 'left end') },
    );
    handles.push(
      {
        dial: 'k',
        at: (r, v) => (r.kind === 'saw' && r.cut === 'along' ? [BAR.x0 - 18, BAR.y + BAR.h - 5 * v.k] : [BAR.x0 + 12 * v.k, BAR.y - 16]),
        drag: wrap('k', (r, px, py) => (r.kind === 'saw' && r.cut === 'along' ? (BAR.y + BAR.h - py) / 5 : (px - BAR.x0) / 12)),
        radius: 20,
      },
      { dial: 'up', at: () => [SOCKET.x, SOCKET.y], drag: wrap('up', (_r, px) => (px > SOCKET.x ? 1 : 0)), radius: 20 },
    );
  } else {
    dials.push(
      { key: 'n', aria: 'Number of turns wound on the coil', label: 'Turns', unit: '', step: DIAL.n.step, min: DIAL.n.min, max: DIAL.n.max, start: DIAL.n.start, text: (x) => `${x} turns` },
      { key: 'dir', aria: 'Battery switch: 0 the front current flows left, 1 it flows right', label: 'Current', unit: '', step: 1, min: DIAL.dir.min, max: DIAL.dir.max, start: DIAL.dir.start, text: (x) => (x ? 'front turns →' : 'front turns ←') },
    );
    handles.push(
      { dial: 'n', at: (_r, v) => [turnsX(v.n), TURNS.y], drag: wrap('n', (_r, px) => DIAL.n.min + ((px - TURNS.x0) / (TURNS.x1 - TURNS.x0)) * (DIAL.n.max - DIAL.n.min)), radius: 20 },
      { dial: 'dir', at: (_r, v) => [BATTERY.x + (v.dir ? 14 : -14), BATTERY.y + 9], drag: wrap('dir', (_r, px) => (px > BATTERY.x ? 1 : 0)), radius: 20 },
    );
  }

  return {
    hero: { name: 'Noor', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: {
      button: '🪄 Rehearse',
      aria: 'Rehearse: try this setting backstage first',
      read: (r, v) => {
        flash.paid();
        return rehearsalText(r, v as Values);
      },
    },
    fire: { button: '🎩 Showtime!', aria: 'Showtime: perform the floating ring act' },
    judge: (r, v) => judge(r, v as Values),
    miss: (r, v) => missText(r, v as Values),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => HIT,
    delay: VERDICT_AT,
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(3, ctx.level)) as 1 | 2 | 3;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
