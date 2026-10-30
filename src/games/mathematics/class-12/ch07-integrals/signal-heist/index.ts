// Inspirations (code comment only): the frequency-matching hacking mini-games of stealth and superhero games (tune a signal until it matches the lock's
// waveform), and heist games (laser grids, vault doors, security turrets). The player drags the crest of each pure tone on its own mini-scope (its amplitude)
// until the sum of the tones rebuilds the lock's waveform exactly; level 4 sets a fuse rating on a charge meter. The art is in art.ts.
// The lock signal is drawn normalised (centred, fixed height) with no axis, zero line or number in levels 1 to 3. The player's mix is drawn on the main scope
// only in round 1, or for 1.5 s after a peek in round 2, or during the Transmit sweep. In level 4 the meter's liquid shows only in round 1; in rounds 2 and 3
// the tube is sealed behind a steel sleeve, during play and during the run.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel, type HandleSpec, type SceneInput, type Values } from '@core/dialgame';
import { backdrop } from '@core/mathkit';
import { line, text } from '@core/neon';
import { dart, door, hatch, hex, lasers, meter, muzzle, polyline, scopeFrame, slot, turretBody, type DoorScreen, type HexMood, type HexPose, type HatchLight } from './art';
import { amp, buildFuse, buildMatch, fuseHint, fuseMiss, fuseWin, gaps, judgeFuse, judgeMatch, matchHint, matchMiss, matchWin, mix, peekText, probeText, tone, twelfths, type FuseRound, type MatchRound } from './logic';

const ARIA = 'A hacker beside a vault door with a laser grid, rebuilding the lock’s waveform on an oscilloscope from pure tones.';
const ROLE = 'a hacker who cracks vault locks by rebuilding their signals from pure tones';
const HEROES = [
  {
    story: 'The vault lock broadcasts a signal such as sin² x. Hex’s wrist deck can only send pure tones: a constant and waves like cos 2x. Rewrite the signal with the double angle formulas, set each tone’s amplitude, and the lock reads the mix.',
    objective: 'Rebuild each lock signal exactly from pure tones, in three rounds.',
  },
  {
    story: 'These locks broadcast products such as sin 3x cos 4x. Products of waves are sums of waves in disguise: 2 sin A cos B = sin(A + B) + sin(A − B).',
    objective: 'Rebuild each product signal from pure tones, in three rounds.',
  },
  {
    story: 'These locks use cubes, fourth powers and products of three waves. Use the identities twice.',
    objective: 'Rebuild each signal from pure tones, in three rounds.',
  },
  {
    story: 'The vault’s capacitor charges at the rate of the lock signal from x = 0 to x = π/2, and discharges where the signal is negative. The lock reads the net charge once, at the end, and the fuse rating must equal it exactly.',
    objective: 'Set the fuse rating to the net charge ∫ f dx from 0 to π/2, in three rounds.',
  },
];

const SCOPE = { x0: 20, x1: 440, y0: 34, y1: 154 };
const DOOR = { cx: 548, cy: 120, r: 70 };
const HEX = { x: 452, y: 232 };
/** Level 4 has no slots, and the meter stands where Hex does in levels 1 to 3, so Hex waits further left. */
const HEX4 = { x: 370, y: 232 };
const SLOTS = { x0: 20, x1: 620 };
const SLOT = { top: 258, mid: 289, amp: 26 };
const METER = { x: 460, y0: 40, y1: 210, w: 18 };
const TURRET_X = 588;
const MID = (SCOPE.y0 + SCOPE.y1) / 2;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));
const PEEK_SECONDS = 1.5;

// ---- The scope: a normalised drawing of f, centred, with a fixed height --------------------------------------------------------------------------------

interface Sig {
  fc: number;
  k: number;
}
/** The centre of f's range and the pixels per unit that give a fixed height of 45% of the scope around its middle. The same map draws the player's mix. */
function sigOf(f: (x: number) => number, hi: number, n: number): Sig {
  let lo = Infinity;
  let up = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = f((hi * i) / (n - 1));
    lo = Math.min(lo, v);
    up = Math.max(up, v);
  }
  return { fc: (lo + up) / 2, k: (0.45 * (SCOPE.y1 - SCOPE.y0)) / (((up - lo) / 2) || 1) };
}
const yOf = (s: Sig, v: number) => MID - (v - s.fc) * s.k;
const xOf = (i: number, n: number) => SCOPE.x0 + ((SCOPE.x1 - SCOPE.x0) * i) / (n - 1);
const curve = (f: (x: number) => number, s: Sig, hi: number, n: number, upTo = n): [number, number][] =>
  Array.from({ length: Math.min(n, upTo) }, (_, i): [number, number] => [xOf(i, n), yOf(s, f((hi * i) / (n - 1)))]);

// ---- The vault, the turret and Hex (shared by every level) ---------------------------------------------------------------------------------------------

interface Fx {
  shot: unknown;
  wheel: number;
  impact: boolean;
  granted: boolean;
  trip: boolean;
  blow: boolean;
}
type Frame = Pick<SceneInput<unknown>, 'g' | 't' | 'rt' | 'shot' | 'A'>;

/** Everything on the right of the screen: the door, the grid, the hatch, the turret with its dart, and Hex, timed from the verdict at `delay` (seconds scaled by `sp`). */
function vault(s: Frame, fx: Fx, delay: number, sp: number, at: { x: number; y: number }): { vt: number; win: boolean } {
  const { g, t, rt, shot, A } = s;
  if (shot && fx.shot !== shot) Object.assign(fx, { shot, wheel: t * 0.5, impact: false, granted: false, trip: false, blow: false });
  const vt = shot ? (rt - delay) / sp : -1;
  const win = !!shot && shot.ok;
  const after = vt >= 0;
  let open = 0;
  let off = 0;
  let screen: DoorScreen = 'idle';
  let light: HatchLight = 'idle';
  let drop = 0;
  let locked = false;
  let mood: HexMood = 'focus';
  let pose: HexPose = 'crouch';
  let hx = at.x;
  const bolts = [0, 0, 0, 0, 0, 0];
  const tgt: [number, number] = [at.x, at.y - 28];
  const aim = Math.atan2(tgt[1] - 83, tgt[0] - TURRET_X);
  const [mx, my] = muzzle(TURRET_X, aim);
  if (after && win) {
    screen = 'open';
    light = 'green';
    for (let i = 0; i < 6; i++) bolts[i] = clamp01((vt - i * 0.1) / 0.1);
    off = clamp01((vt - 0.3) / 0.4);
    open = ease((vt - 0.7) / 0.6);
    mood = 'happy';
    pose = vt < 1.1 ? 'fist' : 'run';
    if (vt >= 1.1) hx += 70 * ease((vt - 1.1) / 0.3);
    if (!fx.granted) {
      fx.granted = true;
      A.float('ACCESS GRANTED', 300, 205, PAL.green);
    }
  } else if (after) {
    screen = 'alarm';
    light = 'alarm';
    drop = ease(vt / 0.3);
    locked = vt >= 0.3;
    mood = vt < 0.65 ? 'worried' : 'dizzy';
    pose = vt < 0.65 ? 'crouch' : 'sit';
    if (vt >= 0.65 && !fx.impact) {
      fx.impact = true;
      A.burst(at.x, at.y - 30, PAL.cyan, 18, 150);
      A.float('ZAP!', at.x, at.y - 62, PAL.cyan);
    }
  }
  const wheel = shot ? fx.wheel : t * 0.5;
  hatch(g, TURRET_X, drop, light, t);
  door(g, DOOR.cx, DOOR.cy, DOOR.r, { open, bolts, wheel, screen, t });
  lasers(g, DOOR.cx, DOOR.cy, DOOR.r, t, off);
  turretBody(g, TURRET_X, t, { drop, aim, locked });
  if (after && !win) dart(g, mx, my, tgt[0], tgt[1], (vt - 0.45) / 0.2);
  line(g, at.x - 24, at.y + 1, at.x + 40, at.y + 1, 'rgba(143,155,214,0.3)', 1.5);
  // the holo of the deck beams to the scope while the mix is sent
  if (shot && rt < 0.8) {
    g.globalAlpha = 0.6;
    line(g, at.x + 22, at.y - 50, SCOPE.x1 + 6, MID, PAL.cyan, 1.5, [3, 4]);
    g.globalAlpha = 1;
  }
  hex(g, hx, at.y, t, { mood, pose, step: vt });
  return { vt, win };
}

/** The red strobe of the alarm over the whole screen. */
function strobe(g: CanvasRenderingContext2D, rt: number, vt: number, win: boolean) {
  if (vt < 0 || win || Math.floor(rt / 0.12) % 2 !== 0) return;
  g.fillStyle = 'rgba(255,60,60,0.18)';
  g.fillRect(0, 0, 640, 340);
}

// ---- Levels 1 to 3: rebuild the signal ------------------------------------------------------------------------------------------------------------------

function matchLevel(n: 1 | 2 | 3, random: () => number): DialLevel<MatchRound> {
  const rounds = buildMatch(n, random);
  const count = rounds[0].bands.length; // 3 in level 1, 4 in levels 2 and 3
  const amps = (v: Values) => Array.from({ length: count }, (_, i) => v[`b${i}`]);
  const geom = (i: number) => {
    const span = (SLOTS.x1 - SLOTS.x0) / count;
    return { x: SLOTS.x0 + i * span, w: span - 10 };
  };
  const slotHandle = (i: number): HandleSpec<MatchRound> => ({
    dial: `b${i}`,
    at: (_r, v) => [geom(i).x + geom(i).w / 2, SLOT.mid - (v[`b${i}`] / 8) * SLOT.amp],
    drag: (_r, _px, py) => Math.round(((SLOT.mid - py) / SLOT.amp) * 8),
    radius: 12,
  });
  let peekPending = false;
  let peekAt = -10;
  let lastK = -1;
  const fx: Fx = { shot: null, wheel: 0, impact: false, granted: false, trip: false, blow: false };
  const cache = new WeakMap<object, { sg: Sig; f: [number, number][] }>();
  const sigFor = (r: MatchRound) => {
    let c = cache.get(r);
    if (!c) {
      const sg = sigOf(r.f, 2 * Math.PI, 400);
      c = { sg, f: curve(r.f, sg, 2 * Math.PI, 400) };
      cache.set(r, c);
    }
    return c;
  };
  let flags: boolean[] = [];
  let flagsShot: unknown = null;

  function draw(s: SceneInput<MatchRound>) {
    const { g, r, k, t, rt, shot } = s;
    if (k !== lastK) {
      lastK = k;
      peekPending = false;
      peekAt = -10;
    }
    if (peekPending && !shot) {
      peekPending = false;
      peekAt = t;
    }
    const a = amps(s.v);
    const { sg, f } = sigFor(r);
    backdrop(g);
    const { vt, win } = vault(s, fx, 0.9, 1, HEX);
    if (shot && flagsShot !== shot) {
      flagsShot = shot;
      flags = gaps(r, a);
    }
    // the main scope: the lock signal, normalised, with no axis, zero line or number
    scopeFrame(g, SCOPE);
    const flash = win && vt >= 0 && vt < 0.4;
    polyline(g, f, flash ? PAL.white : PAL.pink, 2.4);
    const peeking = !shot && r.assist === 1 && t - peekAt < PEEK_SECONDS;
    const showMix = !!shot || r.assist === 0 || peeking;
    s.A.canvas.dataset.mixShown = showMix ? '1' : '0';
    if (showMix) {
      const u = shot ? clamp01(rt / 0.8) : 1;
      const upTo = Math.max(2, Math.round(u * 400));
      const mf = mix(r, a);
      if (shot) {
        const fl = flags;
        g.fillStyle = 'rgba(255,90,90,0.38)';
        const dx = (SCOPE.x1 - SCOPE.x0) / 399;
        for (let i = 0; i < Math.min(400, upTo); i++) {
          if (!fl[i]) continue;
          const y1 = f[i][1];
          const y2 = yOf(sg, mf((2 * Math.PI * i) / 399));
          g.fillRect(f[i][0] - dx / 2, Math.min(y1, y2), dx + 0.6, Math.abs(y1 - y2) + 0.6);
        }
      }
      polyline(g, curve(mf, sg, 2 * Math.PI, 400, upTo), flash ? PAL.white : PAL.cyan, 2.2);
      if (shot && u < 1) line(g, xOf(upTo - 1, 400), SCOPE.y0, xOf(upTo - 1, 400), SCOPE.y1, 'rgba(255,255,255,0.5)', 1);
    }
    // the tone slots: each shows only the player's own tone at the player's own amplitude
    r.bands.forEach(([b], i) => {
      const { x, w } = geom(i);
      const tf = tone(b);
      slot(g, x, w, SLOT.top, SLOT.mid, b, amp(a[i]), (p) => (a[i] / 8) * SLOT.amp * tf(p));
    });
    strobe(g, rt, vt, win);
  }

  return {
    hero: { name: 'Hex', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials: Array.from({ length: count }, (_, i) => ({ key: `b${i}`, aria: `Amplitude of tone ${i + 1}, in eighths`, label: `Tone ${i + 1}`, unit: '', step: 1, min: -8, max: 8, start: 0, text: (v: number) => amp(v) })),
    handles: Array.from({ length: count }, (_, i) => slotHandle(i)),
    test: {
      button: '🔍 Peek',
      aria: 'Scope peek: show your mix on the scope for a moment',
      read: (r, v) => {
        peekPending = true;
        return peekText(r, amps(v));
      },
    },
    fire: { button: '📡 Transmit', aria: 'Transmit the tone mix to the lock' },
    judge: (r, v) => judgeMatch(r, amps(v)),
    miss: (r, v) => matchMiss(r, amps(v)),
    win: (r) => matchWin(r),
    hint: (r) => matchHint(r),
    hit: () => [DOOR.cx, DOOR.cy],
    delay: 0.9,
    draw,
  };
}

// ---- Level 4: the fuse -----------------------------------------------------------------------------------------------------------------------------------

const FUSE_RUN = 1.2;
const FUSE_AT = 1.3;
/** The win and miss sequences are timed for a verdict at 0.9 s; with the verdict at 1.3 s they run at 3/4 of the length to end inside 2.4 s. */
const FUSE_SPEED = 0.75;
const fuseY = (k: number) => METER.y1 - (k / 24) * (METER.y1 - METER.y0);

function fuseLevel(random: () => number): DialLevel<FuseRound> {
  const rounds = buildFuse(random);
  let probePending = false;
  let probeAt = -10;
  let probeK = 12;
  let probeSign = 0;
  let lastK = -1;
  const fx: Fx = { shot: null, wheel: 0, impact: false, granted: false, trip: false, blow: false };
  const HI = Math.PI / 2;
  const cache = new WeakMap<object, { sg: Sig; f: [number, number][] }>();
  const sigFor = (r: FuseRound) => {
    let c = cache.get(r);
    if (!c) {
      const sg = sigOf(r.f, HI, 200);
      c = { sg, f: curve(r.f, sg, HI, 200) };
      cache.set(r, c);
    }
    return c;
  };

  function draw(s: SceneInput<FuseRound>) {
    const { g, r, k, t, rt, shot, A } = s;
    if (k !== lastK) {
      lastK = k;
      probePending = false;
      probeAt = -10;
    }
    const kk = s.v.k;
    backdrop(g);
    const { vt, win } = vault(s, fx, FUSE_AT, FUSE_SPEED, HEX4);
    // the scope: f over 0 to π/2, normalised, with a faint zero line (the sign matters) and no number
    const { sg, f } = sigFor(r);
    scopeFrame(g, SCOPE);
    const zy = yOf(sg, 0);
    if (zy > SCOPE.y0 && zy < SCOPE.y1) line(g, SCOPE.x0 + 4, zy, SCOPE.x1 - 4, zy, 'rgba(255,255,255,0.22)', 1, [5, 4]);
    polyline(g, f, PAL.pink, 2.4);
    const u = shot ? clamp01(rt / FUSE_RUN) : 0;
    if (shot) {
      const upTo = Math.max(1, Math.round(u * 199));
      const dx = (SCOPE.x1 - SCOPE.x0) / 199;
      for (let i = 0; i <= upTo; i++) {
        const y = f[i][1];
        g.fillStyle = y <= zy ? 'rgba(77,225,255,0.45)' : 'rgba(255,155,61,0.5)';
        g.fillRect(f[i][0] - dx / 2, Math.min(y, zy), dx + 0.6, Math.abs(y - zy) + 0.6);
      }
      if (u < 1) line(g, f[upTo][0], SCOPE.y0, f[upTo][0], SCOPE.y1, 'rgba(255,255,255,0.6)', 1.2);
    }
    // the meter: liquid in round 1 only; rounds 2 and 3 are sealed behind a steel sleeve, in play and in the run
    const sealed = r.assist !== 0;
    A.canvas.dataset.meterSealed = sealed ? '1' : '0';
    const liquid = !sealed && shot ? r.F(HI * u) - r.F(0) : null;
    const probing = !shot && r.assist === 1 && t - probeAt < PEEK_SECONDS;
    const below = !!shot && r.ans > kk;
    const fuse = !shot || vt < 0 ? 'idle' : win ? 'glow' : below ? 'blown' : 'dark';
    meter(g, METER, { k: kk, liquid, sealed, mark: r.assist === 0 ? r.ans / 12 : null, fuse, t });
    if (shot && vt >= 0 && win && !fx.trip) {
      fx.trip = true;
      A.sound('blip');
    }
    if (shot && vt >= 0 && !win && below && !fx.blow) {
      fx.blow = true;
      A.burst(METER.x + METER.w / 2, fuseY(kk), PAL.orange, 26, 170);
      A.burst(METER.x + METER.w / 2, fuseY(kk), '#9aa0b8', 12, 60);
    }
    if (probePending && !shot) {
      probePending = false;
      probeAt = t;
    }
    // the probe: a direction only, beside the fuse that was probed, for 1.5 s
    if (probing && r.assist === 1) {
      const py = fuseY(probeK);
      if (probeSign > 0) text(g, '▲', METER.x + METER.w / 2, py - 12, PAL.pink, 14);
      else if (probeSign < 0) text(g, '▼', METER.x + METER.w / 2, py + 22, PAL.pink, 14);
      else text(g, '◎', METER.x + METER.w / 2, py + 5, PAL.green, 16);
    }
    strobe(g, rt, vt, win);
  }

  return {
    hero: { name: 'Hex', role: ROLE, ...HEROES[3] },
    rounds,
    charges: [1, 1, 0],
    dials: [{ key: 'k', aria: 'Fuse rating, in twelfths', label: 'Fuse rating', unit: '', step: 1, min: 0, max: 24, start: (r) => r.start, text: (v) => twelfths(v) }],
    handles: [
      {
        dial: 'k',
        at: (_r, v) => [METER.x + METER.w / 2, fuseY(v.k)],
        drag: (_r, _px, py) => ((METER.y1 - py) / (METER.y1 - METER.y0)) * 24,
        radius: 14,
      },
    ],
    test: {
      button: '🔍 Probe',
      aria: 'Probe: is the net charge more or less than the rating?',
      read: (r, v) => {
        probePending = true;
        probeK = v.k;
        probeSign = Math.sign(r.ans - v.k);
        return probeText(r, v.k);
      },
    },
    fire: { button: '⚡ Charge', aria: 'Run the charge through the fuse' },
    judge: (r, v) => judgeFuse(r, v.k),
    miss: (r, v) => fuseMiss(r, v.k),
    win: (r) => fuseWin(r),
    hint: (r) => fuseHint(r),
    hit: () => [METER.x + METER.w / 2, (METER.y0 + METER.y1) / 2],
    delay: FUSE_AT,
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(4, ctx.level)) as 1 | 2 | 3 | 4;
    return n === 4 ? mountDialLevel(ctx as never, fuseLevel(ctx.random) as never, ARIA) : mountDialLevel(ctx as never, matchLevel(n, ctx.random) as never, ARIA);
  },
});
