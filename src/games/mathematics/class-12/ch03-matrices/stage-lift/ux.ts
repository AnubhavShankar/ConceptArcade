// UX pieces for Stage Lift's canvas: a one-line goal that fades, a fader knob with a visible grip that lights up while it is held, the first-touch cue and a tint
// per round. Pure drawing plus one pointer watcher per canvas; the rules and the drag itself stay in the engine (dialgame) and in logic.ts.
import { PAL } from '@core/arcade';
import { text } from '@core/neon';
import { pointerToLocal } from '@core/sim';

type G = CanvasRenderingContext2D;
/** The smallest handle radius, in scene pixels (about 44 px on a phone). */
export const GRIP_MIN = 18;
/** How long the goal line stays at full strength, in seconds of play. */
export const GOAL_SECONDS = 3;

const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

interface Watch {
  /** Index (in drawing order) of the knob that is held, or -1. */
  active: number;
  touched: boolean;
  frame: number;
  pts: [number, number, number][];
}
const watching = new WeakMap<HTMLCanvasElement, Watch>();

/** One watcher per canvas: it knows where the knobs were drawn last frame, which one is held, and whether any was ever touched. */
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

/** Whether any knob has been grabbed on this canvas yet. */
export const wasTouched = (c: HTMLCanvasElement) => watching.get(c)?.touched ?? false;

/** A pill of dark glass behind a line of text, so the words stay readable over the scene. */
export function tag(g: G, s: string, x: number, y: number, align: 'left' | 'right' | 'center', color: string = PAL.yellow, size = 12) {
  const w = s.length * (size * 0.56) + 10;
  const x0 = align === 'left' ? x - 5 : align === 'right' ? x - w + 5 : x - w / 2;
  g.fillStyle = 'rgba(6,10,36,0.82)';
  g.fillRect(x0, y - size - 1, w, size + 6);
  text(g, s, x, y, color, size, align);
}

export interface KnobSpec {
  x: number;
  y: number;
  /** The radius the engine uses for this fader's handle; the grip ring is drawn at that size (never below GRIP_MIN). */
  r: number;
  /** Pulse the knob and write "drag" beside it until the first touch (level 1, round 1, first fader). */
  cue?: boolean;
}

/** A fader knob with its grip: a ring, ⇕ arrows on the cap, a bright ring while held and a first-touch cue. */
export function knob(g: G, c: HTMLCanvasElement, clock: number, o: KnobSpec) {
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
    g.arc(o.x, o.y, r + 3 + f * 10, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.globalAlpha = held ? 1 : 0.55;
  g.strokeStyle = held ? PAL.yellow : PAL.white;
  g.lineWidth = held ? 3.5 : 1.5;
  g.beginPath();
  g.arc(o.x, o.y, r, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
  if (held) {
    g.fillStyle = 'rgba(255,210,63,0.22)';
    g.beginPath();
    g.arc(o.x, o.y, r, 0, Math.PI * 2);
    g.fill();
  }
  // the cap of the fader
  g.fillStyle = held ? '#fff2a8' : PAL.yellow;
  g.fillRect(o.x - 11, o.y - 7, 22, 14);
  text(g, '⇕', o.x, o.y + 4, '#3a2a00', 12);
  if (cue) tag(g, 'drag ⇕', o.x - r - 4, o.y + 4, 'right', PAL.yellow, 12);
}

/** The round's goal as one short line on the scene: full for GOAL_SECONDS of play, then it fades out. Hidden while a show plays. */
export function goalLine(g: G, line: string, played: number, busy: boolean, y: number, cx: number) {
  if (busy || played > GOAL_SECONDS + 0.6) return;
  g.globalAlpha = played <= GOAL_SECONDS ? 1 : 1 - (played - GOAL_SECONDS) / 0.6;
  tag(g, line, cx, y, 'center', PAL.white, 12);
  g.globalAlpha = 1;
}

/** Each of the three rounds gets its own colour of stage light: cyan, violet, then a still red frame for the boss round. */
export const BEAMS = ['rgba(120,230,255,0.08)', 'rgba(200,140,255,0.09)', 'rgba(255,120,110,0.1)'];
const WASH = ['rgba(77,225,255,0.05)', 'rgba(170,90,255,0.1)', 'rgba(255,60,90,0.11)'];
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
