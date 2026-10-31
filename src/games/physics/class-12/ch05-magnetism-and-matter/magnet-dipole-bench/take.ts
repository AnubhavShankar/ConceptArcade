// The take of "Pebble in Orbit": where Pebble and Grit are, how they turn and how they feel, `rt` seconds after Fire (or before Fire, when `rt < 0`). Pure functions of the round, the fired
// settings and the clock: no canvas. Every miss effect is a FIXED size, never a function of how far the setting was from the answer. Every take ends by 2.3 s.
import { PAL } from '@core/arcade';
import { ease, clamp01, GRIT, PEB, portAt, type DeleMood, type PebbleMood } from './art';
import { FIXED, SPIN_END, TUMBLE, fieldDeg, outcomeOf, parkTheta, spinG, startHeading, verdictAt, type Outcome, type Round, type Values } from './logic';

export interface Pose {
  x: number;
  y: number;
  deg: number;
  alpha: number;
  mood: PebbleMood;
  glow: number;
  flap: number;
  look: [number, number];
  wink: boolean;
}
export interface Take {
  pebble: Pose;
  grit: Pose | null;
  darken: number; // the eclipse overlay alpha (level 2)
  kick: number; // the kick ring progress 0..1, or -1 (level 3)
  speck: number; // the bump speck progress 0..1, or -1 (aimed at Pebble in level 2, at Grit in level 5)
  cmd: number; // the command ring progress 0..1, or -1
  tether: number; // the pull test tether stretch 0..1, or -1 (level 5)
  puffs: number; // thruster puff phase 0..1, or -1 (level 2 corners, level 4 thruster)
  shut: boolean; // level 5: the chosen hatch snapped shut
  iris: number; // level 5: the chosen hatch opening 0..1
  gold: boolean; // the guide star's ring turns gold
  dele: DeleMood;
  inset: number; // the win-only picture's alpha
  out: Outcome | null;
  tv: number;
}
export interface Floater { at: number; text: string; x: number; y: number; color: string }

/** A damped wobble: amp · e^(−decay·s) · sin(2π·hz·s), zero before s = 0. */
export const wobble = (amp: number, decay: number, hz: number, s: number) => (s < 0 ? 0 : amp * Math.exp(-decay * s) * Math.sin(2 * Math.PI * hz * s));
/** A coast to rest: fast at first, slowing. */
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;

const pose = (x: number, y: number): Pose => ({ x, y, deg: 0, alpha: 1, mood: 'happy', glow: 0, flap: 0, look: [0, 0], wink: false });
const burnGlow = (rt: number, off: number) => (rt < 0 ? 0 : rt < 0.15 ? rt / 0.15 : rt < off ? 1 : Math.max(0, 1 - (rt - off) / 0.2));

export function takeAt(r: Round, k: number, v: Values, rt: number, t: number, tf: number): Take {
  const fired = rt >= 0;
  const out: Outcome | null = fired ? outcomeOf(r, v) : null;
  const tv = fired ? verdictAt(r, v) : 99;
  const after = fired && rt >= tv;
  const win = out === 'win';
  const bob = 2 * Math.sin(t * 1.6);
  const T: Take = {
    pebble: pose(PEB.x, PEB.y + bob), grit: null, darken: 0, kick: -1, speck: -1, cmd: -1, tether: -1, puffs: -1, shut: false, iris: 0, gold: false,
    dele: !fired ? 'idle' : after ? (win ? 'cheer' : 'oops') : rt < 0.4 ? 'lean' : 'idle', inset: win && after ? clamp01((rt - tv) / 0.2) : 0, out, tv,
  };
  const P = T.pebble;
  const flapNow = after && win && rt - tv < 0.8 ? 10 * Math.sin((rt - tv) * 2 * Math.PI * 2.5) : 0;
  const resultMood = (bad: PebbleMood = 'worried'): PebbleMood => (after ? (win ? 'cheer' : bad) : 'happy');

  switch (r.kind) {
    case 'spin': {
      const burn = startHeading(r, k, v);
      const end = out === 'win' ? SPIN_END.win : out === 'low' ? SPIN_END.low : SPIN_END.high;
      if (!fired) P.deg = burn + TUMBLE.rate * t;
      else {
        const hf = burn + TUMBLE.rate * tf;
        if (rt < TUMBLE.turn) {
          const d = ((((burn - hf + 540) % 360) + 360) % 360) - 180; // the shortest arc
          P.deg = hf + d * ease(rt / TUMBLE.turn);
        } else P.deg = burn + TUMBLE.rate * spinG(end, rt - TUMBLE.turn);
      }
      P.glow = fired ? (rt < TUMBLE.turn ? rt / TUMBLE.turn : burnGlow(rt - 0.15, 0.75)) : 0;
      P.mood = resultMood(out === 'high' ? 'dizzy' : 'worried');
      P.flap = flapNow;
      break;
    }
    case 'park': {
      const h = v.h!;
      P.deg = h;
      if (!fired) break;
      const th = parkTheta(r, h);
      T.darken = 0.45 * ease((rt - 0.15) / 0.35);
      if (rt < 0.45) T.puffs = rt / 0.45;
      if (out === 'swing') P.deg = h + (th < 180 ? -1 : 1) * FIXED.swingOff * ease((rt - 0.55) / 0.45);
      else if (r.goal === 'stable') {
        if (rt >= 0.9 && rt <= 1.1) T.speck = (rt - 0.9) / 0.2;
        if (win) P.deg = h + wobble(6, 3, 2.5, rt - 1.1);
        else {
          P.deg = h + FIXED.tip * ease((rt - 1.1) / 0.25) + (rt > 1.35 ? 240 * (rt - 1.35) : 0);
          const u = clamp01((rt - 1.35) / 0.85);
          P.x += 80 * u;
          P.y -= 50 * u;
          P.alpha = 1 - 0.6 * u;
        }
      } else {
        if (rt >= 0.9 && rt <= 1.3) T.cmd = (rt - 0.9) / 0.4;
        P.deg = win ? h + 180 * ease((rt - 1.0) / 0.4) + wobble(FIXED.wobble, 6, 3, rt - 1.4) : h + wobble(FIXED.wobble, 3, 2.5, rt - 1.1);
      }
      P.mood = rt < 0.5 ? 'happy' : !after ? (out === 'flip' && rt >= 1.35 ? 'dizzy' : 'dark') : win ? 'cheer' : out === 'flip' ? 'dizzy' : 'worried';
      P.flap = flapNow;
      break;
    }
    case 'swing': {
      const f = fieldDeg(r, k);
      let a = 0;
      if (fired) {
        const e = easeOut((rt - 0.15) / 0.85);
        if (out === 'win') a = r.target * e;
        else if (out === 'short') a = FIXED.short * r.target * (rt > 1.1 ? 1 - ease((rt - 1.1) / 0.7) : e);
        else a = (1 + FIXED.over) * r.target * e + (r.target === 180 && rt > 1.0 ? 60 * (rt - 1.0) : 0);
        T.kick = rt < 0.3 ? rt / 0.3 : -1;
        T.gold = win && rt >= 1.0;
        if (win && r.target === 90 && rt >= 1.0) a += 1.5 * Math.sin(2 * Math.PI * 2.5 * (rt - 1.0));
      }
      P.deg = f + a;
      P.glow = fired ? burnGlow(rt, 1.0) : 0;
      P.mood = resultMood(out === 'over' && r.target === 180 ? 'dizzy' : 'worried');
      P.flap = flapNow;
      break;
    }
    case 'coil': {
      const f = fieldDeg(r, k);
      const s0 = f + r.th;
      P.deg = s0;
      if (!fired) break;
      const toward = s0 + FIXED.short * (f - s0);
      const past = f + FIXED.over * (f - s0);
      if (out === 'win') P.deg = s0 + (f - s0) * easeOut((rt - 0.15) / 0.85);
      else if (out === 'short') P.deg = rt <= 0.9 ? s0 + (toward - s0) * easeOut((rt - 0.15) / 0.65) : toward + (s0 - toward) * ease((rt - 0.9) / 0.6);
      else if (out === 'over') P.deg = s0 + (past - s0) * easeOut((rt - 0.15) / 0.85);
      if (out === 'drift') P.y += FIXED.drift * ease((rt - 0.2) / 0.7);
      if (out === 'pulled') P.x += FIXED.drift * ease((rt - 0.2) / 0.7);
      if (win && !r.uniform && rt >= 0.15) P.x += Math.sin(rt * 6 * 2 * Math.PI);
      P.glow = burnGlow(rt, 0.9);
      if (v.thr === 1 && rt < 0.9) T.puffs = (rt / 0.2) % 1;
      T.gold = win && rt >= 1.0;
      P.mood = resultMood();
      P.flap = flapNow;
      break;
    }
    case 'dock': {
      P.deg = r.pDir * 90;
      const q = v.q!;
      const g = pose(GRIT.x, GRIT.y + 2 * Math.sin(t * 1.6 + 1.7));
      g.deg = q * 90;
      T.grit = g;
      if (!fired) break;
      const [px, py] = portAt(r.pDir, v.port!);
      const ox = (px - PEB.x) / 92;
      const oy = (py - PEB.y) / 92;
      const fly = ease((rt - 0.15) / 0.75);
      g.x = GRIT.x + (px - GRIT.x) * fly;
      g.y = GRIT.y + (py - GRIT.y) * fly;
      T.shut = out === 'closed' && rt >= 0.7;
      T.iris = out === 'closed' ? 0 : ease((rt - 0.7) / 0.2);
      if (out === 'closed' && rt > 0.9) {
        const d = Math.hypot(GRIT.x - px, GRIT.y - py);
        const b = ease((rt - 0.9) / 0.3);
        g.x = px + ((GRIT.x - px) / d) * 40 * b;
        g.y = py + ((GRIT.y - py) / d) * 40 * b;
      }
      if (out !== 'closed' && rt >= 0.9) P.look = [2 * ox, 2 * oy];
      const s = rt - 1.2;
      if (out === 'torque') g.deg = q * 90 - (rt >= 0.9 ? 150 * (rt - 0.9) : 0);
      else if (out === 'flip') {
        if (rt >= 1.0 && rt <= 1.2) T.speck = (rt - 1.0) / 0.2;
        g.deg = q * 90 + FIXED.tip * ease(s / 0.25) + (rt > 1.45 ? 240 * (rt - 1.45) : 0);
        const u = clamp01((rt - 1.45) / 0.75);
        g.x += 70 * u;
        g.y -= 40 * u;
        g.alpha = 1 - 0.6 * u;
      } else if (out === 'steady') {
        if (rt >= 1.0 && rt <= 1.4) T.cmd = (rt - 1.0) / 0.4;
        g.deg = q * 90 + wobble(FIXED.wobble, 3, 2.5, s);
      } else if (out === 'loose') {
        if (rt >= 1.2) T.tether = clamp01(s / 0.25);
        g.x += ox * FIXED.loose * ease(s / 0.25);
        g.y += oy * FIXED.loose * ease(s / 0.25);
      } else if (win && r.goal === 'stable') {
        if (rt >= 1.0 && rt <= 1.2) T.speck = (rt - 1.0) / 0.2;
        g.deg = q * 90 + wobble(6, 3, 2.5, s);
      } else if (win && r.goal === 'unstable') {
        if (rt >= 1.0 && rt <= 1.4) T.cmd = (rt - 1.0) / 0.4;
        g.deg = q * 90 + 180 * ease(s / 0.4);
        g.x += ox * 50 * clamp01((rt - 1.4) / 0.5);
        g.y += oy * 50 * clamp01((rt - 1.4) / 0.5);
      } else if (win) {
        if (rt >= 1.2) T.tether = clamp01(s / 0.25);
        if (rt >= 1.2) g.x += 2 * Math.sin(s * 40);
      }
      g.mood = !after ? 'happy' : win ? 'cheer' : out === 'flip' ? 'dizzy' : 'worried';
      g.wink = win && after && rt - tv < 0.3;
      P.mood = resultMood();
      T.gold = false;
      break;
    }
  }
  return T;
}

/** The floaters of a take, each shown once when `rt` passes `at`. Dele's lines come from his window; the rest sit near the action. */
export function floaters(r: Round, out: Outcome, v: Values): Floater[] {
  const win = out === 'win';
  const tv = verdictAt(r, v);
  const W = PAL.white;
  const O = PAL.orange;
  const G = PAL.green;
  const dele = (text: string): Floater => ({ at: 0, text, x: 150, y: 70, color: W });
  const list: Floater[] = [{ at: tv, text: win ? 'Nice!' : 'Uh-oh', x: 150, y: 70, color: win ? G : O }];
  switch (r.kind) {
    case 'spin':
      list.push(dele('Burn!'), { at: 0.3, text: 'BURN', x: 300, y: 108, color: O });
      if (win) list.push({ at: 0.85, text: 'STOPPED', x: 300, y: 130, color: G });
      else list.push({ at: 0.9, text: out === 'low' ? 'STILL SPINNING' : 'SPUN BACK', x: 300, y: 130, color: O });
      break;
    case 'park':
      list.push(dele('Park it'), { at: 0, text: 'PARKED', x: 300, y: 108, color: W });
      if (r.goal === 'unstable') list.push({ at: 0.9, text: 'Flip!', x: 150, y: 54, color: W });
      if (out === 'swing') list.push({ at: 0.6, text: 'TORQUE', x: 300, y: 130, color: O });
      else if (r.goal === 'stable') {
        list.push({ at: 1.1, text: 'tink', x: 300, y: 130, color: W });
        list.push(win ? { at: 1.15, text: 'STEADY', x: 300, y: 108, color: G } : { at: 1.3, text: 'TIPPED', x: 300, y: 108, color: O });
      } else list.push(win ? { at: 1.05, text: 'FLIPPED', x: 300, y: 108, color: G } : { at: 1.1, text: 'NO FLIP', x: 300, y: 108, color: O });
      break;
    case 'swing':
      list.push(dele('Burn!'), { at: 0, text: 'KICK', x: 300, y: 108, color: W }, { at: 1.0, text: win ? 'ON STAR' : out === 'short' ? 'SHORT' : 'PAST', x: 300, y: 130, color: win ? G : O });
      break;
    case 'coil':
      list.push(dele('Burn!'), { at: 0, text: 'BURN', x: 300, y: 108, color: O });
      if (win) list.push({ at: 1.0, text: 'ON STAR', x: 300, y: 130, color: G });
      else if (out === 'short') list.push({ at: 0.85, text: 'SHORT', x: 300, y: 130, color: O });
      else if (out === 'over') list.push({ at: 1.0, text: 'PAST', x: 300, y: 130, color: O });
      else if (out === 'drift') list.push({ at: 0.9, text: 'DRIFT', x: 300, y: 108, color: O });
      else list.push({ at: 0.9, text: 'CLANK', x: 418, y: 150, color: O });
      break;
    case 'dock': {
      const [px, py] = portAt(r.pDir, v.port!);
      const y = Math.max(56, py - 34);
      list.push(dele('Dock!'));
      if (out === 'closed') list.push({ at: 0.9, text: 'CLANG', x: px, y, color: O });
      else list.push({ at: 0.9, text: 'CLUNK', x: px, y, color: W });
      if (out === 'torque') list.push({ at: 1.0, text: 'TURNS', x: px, y, color: O });
      else if (out === 'flip') list.push({ at: 1.3, text: 'FLIPPED', x: px, y, color: O });
      else if (out === 'steady') list.push({ at: 1.2, text: 'NO FLIP', x: px, y, color: O });
      else if (out === 'loose') list.push({ at: 1.25, text: 'LOOSE', x: px, y, color: O });
      else if (win) list.push({ at: 1.25, text: r.goal === 'stable' ? 'DOCKED' : r.goal === 'unstable' ? 'AWAY!' : 'TIGHT', x: px, y, color: G });
      break;
    }
  }
  return list;
}
