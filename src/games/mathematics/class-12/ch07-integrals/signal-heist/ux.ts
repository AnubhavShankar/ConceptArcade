// UX pieces for Signal Heist's canvas: a drag handle with a visible grip that lights up while it is held (one watcher knows which of several is held), the
// first-touch cue, a one-line goal that fades, a tint per round, and the strobe of the alarm kept under 3 Hz. Pure drawing plus one pointer watcher per
// canvas; the rules and the drag itself stay in the engine (dialgame) and in logic.ts.
import { PAL } from '@core/arcade';
import { text } from '@core/neon';
import { pointerToLocal } from '@core/sim';

type G = CanvasRenderingContext2D;
/** The smallest handle radius, in scene pixels (about 44 px on a phone). */
export const GRIP_MIN = 18;
/** How long the goal line stays at full strength, in seconds of play. */
export const GOAL_SECONDS = 3;

export const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

interface Watch {
  /** Index (in drawing order) of the grip that is held, or -1. */
  active: number;
  touched: boolean;
  frame: number;
  pts: [number, number, number][];
}
const watching = new WeakMap<HTMLCanvasElement, Watch>();

/** One watcher per canvas: it knows where the grips were drawn last frame, which one is held, and whether any was ever touched. */
function watch(c: HTMLCanvasElement, frame: number): Watch {
  let w = watching.get(c);
  if (!w) {
    const own: Watch = { active: -1, touched: false, frame, pts: [] };
    w = own;
    watching.set(c, own);
    c.addEventListener('pointerdown', (e) => {
      const p = pointerToLocal(e, c, 640, 340);
      // The engine takes the first handle within its radius plus 14, so the highlight does the same.
      const i = own.pts.findIndex(([x, y, r]) => Math.hypot(p.x - x, p.y - y) <= r + 14);
      if (i >= 0) {
        own.active = i;
        own.touched = true;
      }
    });
    const release = () => {
      own.active = -1;
    };
    c.addEventListener('pointerup', release);
    c.addEventListener('pointercancel', release);
  }
  if (w.frame !== frame) {
    w.frame = frame;
    w.pts = [];
  }
  return w;
}

/** Whether any grip has been grabbed on this canvas yet. */
export const wasTouched = (c: HTMLCanvasElement) => watching.get(c)?.touched ?? false;

/** A pill of dark glass behind a line of text, so the words stay readable over the scene. */
export function tag(g: G, s: string, x: number, y: number, align: 'left' | 'right' | 'center', color: string = PAL.yellow, size = 12) {
  const w = s.length * (size * 0.56) + 10;
  const x0 = align === 'left' ? x - 5 : align === 'right' ? x - w + 5 : x - w / 2;
  g.fillStyle = 'rgba(6,10,36,0.82)';
  g.fillRect(x0, y - size - 1, w, size + 6);
  text(g, s, x, y, color, size, align);
}

export interface GripSpec {
  x: number;
  y: number;
  /** The radius the engine uses for this handle; the ring is drawn at that size (never below GRIP_MIN). */
  r: number;
  /** Pulse the ring until the first touch (level 1, round 1, first handle). */
  cue?: boolean;
  /** Where the "drag" word goes while the cue shows. */
  cueSide?: 'left' | 'right';
}

/** A handle's grip: a ring with ⇕ arrows, a bright ring and fill while held, and the first-touch cue. */
export function grip(g: G, c: HTMLCanvasElement, clock: number, o: GripSpec) {
  const w = watch(c, clock);
  const r = Math.max(GRIP_MIN, o.r);
  const idx = w.pts.length;
  w.pts.push([o.x, o.y, r]);
  const held = w.active === idx;
  const cue = !!o.cue && !w.touched;
  if (cue && !calm()) {
    const f = (clock * 1.1) % 1;
    g.globalAlpha = 0.7 * (1 - f);
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(o.x, o.y, r + 4 + f * 12, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.fillStyle = held ? 'rgba(255,210,63,0.4)' : 'rgba(10,16,48,0.5)';
  g.beginPath();
  g.arc(o.x, o.y, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = held ? PAL.yellow : PAL.white;
  g.lineWidth = held ? 4 : 2;
  g.beginPath();
  g.arc(o.x, o.y, r, 0, Math.PI * 2);
  g.stroke();
  text(g, '⇕', o.x, o.y + 5, held ? PAL.yellow : PAL.white, 14);
  if (cue) {
    if (o.cueSide === 'right') tag(g, 'drag ⇕', o.x + r + 6, o.y + 4, 'left', PAL.yellow, 12);
    else tag(g, 'drag ⇕', o.x - r - 6, o.y + 4, 'right', PAL.yellow, 12);
  }
}

/** The round's goal as one short line on the scene: full for GOAL_SECONDS of play, then it fades out. Hidden while a shot plays. */
export function goalLine(g: G, line: string, played: number, busy: boolean, y: number, cx: number) {
  if (busy || played > GOAL_SECONDS + 0.6) return;
  g.globalAlpha = played <= GOAL_SECONDS ? 1 : 1 - (played - GOAL_SECONDS) / 0.6;
  tag(g, line, cx, y, 'center', PAL.white, 12);
  g.globalAlpha = 1;
}

/** A different wash of light for each of the three rounds (cool, violet, red) and a still red frame for the boss round. */
export const WASH = ['rgba(77,225,255,0.05)', 'rgba(170,90,255,0.1)', 'rgba(255,60,90,0.11)'];
export function tint(g: G, k: number) {
  const i = Math.min(2, k);
  g.fillStyle = WASH[i];
  g.fillRect(0, 0, 640, 340);
  if (i === 2) {
    g.strokeStyle = 'rgba(255,60,90,0.35)';
    g.lineWidth = 6;
    g.strokeRect(3, 3, 634, 334);
  }
}

/** Seconds per half-cycle of the alarm strobe: 0.2 s on, 0.2 s off is 2.5 flashes a second, under the 3 Hz limit. */
export const STROBE_HALF = 0.2;
/**
 * The red strobe of the alarm over the whole screen (alpha 0.18); with reduced motion it is a steady, fainter tint instead.
 * `since` is the real seconds since the verdict landed (negative before it), so the strobe always starts with a full 0.2 s of light.
 */
export function strobe(g: G, since: number, win: boolean) {
  if (since < 0 || win) return;
  if (calm()) {
    g.fillStyle = 'rgba(255,60,60,0.1)';
    g.fillRect(0, 0, 640, 340);
    return;
  }
  if (Math.floor(since / STROBE_HALF + 1e-9) % 2 !== 0) return;
  g.fillStyle = 'rgba(255,60,60,0.18)';
  g.fillRect(0, 0, 640, 340);
}
