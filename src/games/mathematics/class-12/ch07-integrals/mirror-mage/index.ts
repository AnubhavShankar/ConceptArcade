// Inspirations (code comment only): fantasy RPG spell casting with an exact mana cost, and mirror and reflection puzzles (the mirror shows the hidden shape of the
// problem). The player turns a mana ring (a rotary dial around the staff's mirror) to the rune's exact value, then casts. The art is in art.ts.
// Never leak the answer: the rune is drawn with no axis numbers and no grid on an opaque tablet. The mirror shapes are helpers: live in round 1, only for 1.5 s
// after a mirror spell (a charge) in round 2, never in round 3. A fizzle always stops the fill at a fixed 70% of the rune, whatever the guess, and `hit` is a fixed point.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type HandleSpec, type SceneInput } from '@core/dialgame';
import { text } from '@core/neon';
import { LYRA, RUNE, WARDEN, barrier, caption, cracks, dragCue, ease, goalLine, lyra, roundTint, manaRing, manaStream, mirrorShapes, overflow, ringPoint, ringValue, rune, shards, shockwave, smokePuffs, tower, warden, ZERO, type LyraMood, type WardenState } from './art';
import { RANGE, UNIT, buildRounds, fault, hintText, judge, manaText, mirrorText, missText, winText, type Round } from './logic';

const ARIA = 'A mirror mage with a staff facing a rune barrier, with a mana ring to set the exact mana the rune holds.';
const ROLE = 'a mirror mage who breaks rune barriers by channelling exactly the mana each rune holds';
const OBJ = 'Channel exactly each rune’s mana, in three rounds.';
const HEROES = [
  {
    story: 'A rune drinks exactly the integral of its curve. These runes are V-shaped, the curve |x − c|, so split the integral where the V turns and add the two triangles.',
    objective: `${OBJ} Mana is counted in halves.`,
  },
  {
    story: 'These runes look impossible to integrate. But a rune and its mirror image, f(a − x), fit together into a full block of height 1. So the rune holds exactly half the block.',
    objective: `${OBJ} Mana is counted in units of π/8.`,
  },
  {
    story: 'These runes are powers like x(1 − x)⁵. In the mirror they become (1 − x)x⁵, which falls apart into easy powers of x.',
    objective: `${OBJ} Each rune holds 1/m of a crystal: find m.`,
  },
  {
    story: 'These runes run over whole half-turns or symmetric ranges. Fold the rune at its middle: the halves are equal and add, or opposite and cancel.',
    objective: `${OBJ} Mana is counted in units of π/8; a balanced rune holds 0.`,
  },
  {
    story: 'The tower’s last runes are logarithms, and some give mana back. Mirror them, add, and the logs collapse into log 2.',
    objective: `${OBJ} Mana is counted in units of (π/8) log 2.`,
  },
];

/** The ring's drag handle: at least 18 px, so a thumb can grab the gem. */
export const HANDLE_RADIUS = 22;
export const GOAL = 'Goal: fill the rune with its exact mana';
const PEEK_SECONDS = 1.5;
/** When the verdict lands, and when the rune is full for a spell that is not short. */
const VERDICT = 1.3;
const CAST = 1.1;
/** A fizzle's fill always stops here, whatever the guess. */
const STOP = 0.7;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type Kind = 'win' | 'low' | 'high';

const ringHandle = (min: number, max: number): HandleSpec<Round> => ({
  dial: 'k',
  at: (_r, v) => ringPoint(v.k, min, max),
  drag: (_r, px, py) => ringValue(px, py, min, max),
  radius: HANDLE_RADIUS,
});

function level(n: 1 | 2 | 3 | 4 | 5, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const u = UNIT[n];
  const R = RANGE[n];
  let mirrorPending = false;
  let mirrorAt = -10;
  let lastK = -1;
  let roundT0 = 0;
  let touched = false;
  const fx = { shot: null as unknown, win: false, shatter: false, fizzle: false, backfire: false, sparks: false };

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A, v } = s;
    if (k !== lastK) {
      lastK = k;
      roundT0 = t;
      mirrorPending = false;
      mirrorAt = -10;
    }
    if (mirrorPending && !shot) {
      mirrorPending = false;
      mirrorAt = t;
    }
    // the mirror helper: round 1 live, round 2 only just after a mirror spell, round 3 never; never while the spell plays
    const peekT = t - mirrorAt;
    const peeking = !shot && r.assist !== 2 && peekT >= 0 && peekT < PEEK_SECONDS;
    const live = !shot && (r.assist === 0 || (r.assist === 1 && peeking));
    const fade = peeking ? ease(peekT / 0.15) * (1 - ease((peekT - 1.35) / 0.15)) : 1;
    A.canvas.dataset.mirror = live ? '1' : '0';

    let kind: Kind | null = null;
    if (shot) {
      kind = shot.ok ? 'win' : (fault(u, r, v.k) ?? 'low');
      if (fx.shot !== shot) Object.assign(fx, { shot, win: false, shatter: false, fizzle: false, backfire: false, sparks: false });
      A.canvas.dataset.cast = kind;
    } else delete A.canvas.dataset.cast;
    const light = shot ? (kind === 'low' ? Math.min(STOP, rt / CAST) : Math.min(1, rt / CAST)) : 0;
    if (shot) A.canvas.dataset.fill = light.toFixed(2);
    else delete A.canvas.dataset.fill;
    const after = shot ? rt - VERDICT : -1;
    const broken = kind === 'win' && rt >= 1.4;

    // one-shot effects at the moment of the verdict
    if (shot && kind === 'win') {
      if (after >= 0 && !fx.win) {
        fx.win = true;
        A.float('BARRIER BROKEN!', 320, 240, PAL.green);
      }
      if (rt >= 1.4 && !fx.shatter) {
        fx.shatter = true;
        A.burst(320, 160, PAL.pink, 40, 240);
      }
    }
    if (shot && kind === 'low' && after >= 0 && !fx.fizzle) {
      fx.fizzle = true;
      A.float('FIZZLE!', 320, 240, PAL.orange);
    }
    if (shot && kind === 'high') {
      if (rt >= CAST && !fx.sparks) {
        fx.sparks = true;
        A.burst(300, 120, PAL.orange, 8, 150);
        A.burst(400, 200, PAL.orange, 8, 150);
      }
      if (after >= 0 && !fx.backfire) {
        fx.backfire = true;
        A.burst(LYRA.x, LYRA.y - 60, PAL.orange, 26, 200);
        A.float('BACKFIRE!', 200, 240, PAL.orange);
      }
    }

    // the Warden's state
    let wState: WardenState = 'idle';
    let wU = 0;
    if (shot && kind === 'win' && rt >= 1.4) [wState, wU] = ['crumble', rt - 1.4];
    else if (shot && kind === 'low' && after >= 0) [wState, wU] = ['slam', after];
    else if (shot && kind === 'high' && after >= 0) [wState, wU] = ['mock', after];

    tower(g, t);
    roundTint(g, k, t);
    warden(g, WARDEN.x, WARDEN.y, t, { state: wState, u: wU });
    if (!broken) {
      barrier(g, t);
      text(g, '+ drinks mana', 172, 67, PAL.cyan, 11, 'left');
      text(g, '− gives mana back', 266, 67, PAL.pink, 11, 'left');
      rune(g, r, { light, flare: after >= 0 && kind === 'win' ? clamp01(1 - after / 0.2) * 0.9 : 0 });
      if (live) mirrorShapes(g, n, r, r.assist === 0 ? (peeking ? 1 : 0.85) : 0.8 * fade);
      if (shot && kind === 'win' && after >= 0) cracks(g, clamp01(after / 0.1));
      caption(g, r);
    }
    if (shot && kind === 'win' && broken) shards(g, rt - 1.4);
    if (shot && kind === 'high' && rt >= CAST && rt - CAST < 0.8) overflow(g, r, rt - CAST);
    if (shot && kind === 'low' && after >= 0 && after < 1) smokePuffs(g, RUNE.x0 + (RUNE.x1 - RUNE.x0) * STOP, ZERO, after);
    if (shot && kind === 'low') shockwave(g, (rt - 1.5) / 0.4);

    // the cast: the ring, the stream of mana, and Lyra
    manaRing(g, manaText(u, v.k), v.k, R.min, R.max, t, shot ? 1 : 0);
    if (!shot && v.k !== R.start) touched = true;
    if (!shot && n === 1 && k === 0 && !touched) dragCue(g, v.k, R.min, R.max, t);
    if (!shot) goalLine(g, GOAL, 320, 26, t - roundT0);
    if (shot && rt < 1.3) {
      const amount = kind === 'low' ? (rt < 0.77 ? 1 : clamp01(1 - (rt - 0.77) / 0.5) * (0.5 + 0.5 * Math.sin(rt * 30))) : clamp01((1.2 - rt) / 0.1);
      manaStream(g, t, RUNE.x0 + (RUNE.x1 - RUNE.x0) * Math.max(0.05, light), amount);
    }
    let mood: LyraMood = 'focus';
    if (shot && after >= 0) mood = kind === 'win' ? 'cheer' : 'worried';
    const knock = shot && kind === 'low' ? 12 * (ease((rt - 1.9) / 0.15) - ease((rt - 2.15) / 0.15)) : 0;
    const twirl = shot && kind === 'win' && rt >= 1.4 ? 4 * Math.PI * ease((rt - 1.4) / 0.8) : 0;
    lyra(g, LYRA.x, LYRA.y, t, {
      mood,
      cast: shot ? ease(rt / 0.25) : 0,
      twirl,
      knock,
      soot: shot !== null && kind === 'high' && after >= 0,
      smoke: shot && kind === 'high' ? after : -1,
    });
  }

  return {
    hero: { name: 'Lyra', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'k', aria: n === 3 ? 'Mana as 1 over m: set m' : 'Mana to channel into the rune', label: n === 3 ? 'Mana 1/m' : 'Mana', unit: '', step: 1, min: R.min, max: R.max, start: R.start, text: (v) => manaText(u, v) }],
    handles: [ringHandle(R.min, R.max)],
    test: {
      button: '🪞 Mirror spell',
      aria: 'Mirror spell: show the rune with its mirror image for a moment',
      read: () => {
        mirrorPending = true;
        return mirrorText(n);
      },
    },
    fire: { button: '✨ Cast', aria: 'Cast the spell' },
    judge: (r, v) => judge(r, v.k),
    miss: (r, v) => missText(n, r, v.k),
    win: (r) => winText(r),
    hint: (r) => hintText(n, r),
    hit: () => [320, 160],
    delay: VERDICT,
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
