// UX pieces for Air Time's canvas: a drag handle with a visible grip, the player's own setting beside it, a one-line goal that fades, and a tint per round.
// Pure drawing plus one pointer watcher per canvas; the rules and the drag itself stay in the engine (dialgame) and in logic.ts.
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
  active: boolean;
  touched: boolean;
  frame: number;
  pts: [number, number, number][];
}
const watching = new WeakMap<HTMLCanvasElement, Watch>();

/** One watcher per canvas: it knows where the grip was drawn last frame, whether it is held, and whether it was ever touched. */
function watch(c: HTMLCanvasElement, frame: number): Watch {
  let w = watching.get(c);
  if (!w) {
    const own: Watch = { active: false, touched: false, frame, pts: [] };
    w = own;
    watching.set(c, own);
    c.addEventListener('pointerdown', (e) => {
      const p = pointerToLocal(e, c, 640, 340);
      if (own.pts.some(([x, y, r]) => Math.hypot(p.x - x, p.y - y) <= r + 14)) {
        own.active = true;
        own.touched = true;
      }
    });
    const release = () => {
      own.active = false;
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

export interface GripSpec {
  x: number;
  y: number;
  /** Radius of the handle; never drawn smaller than GRIP_MIN. */
  r?: number;
  /** The direction the handle moves in: the arrows follow it. */
  dir: 'h' | 'v' | 'both';
  /** The player's own setting with its unit, drawn beside the handle. */
  read: string;
  side: 'left' | 'right' | 'above' | 'below';
  /** Pulse the handle and add "drag" to the readout until the first touch (level 1, round 1). */
  cue?: boolean;
}

/** A pill of dark glass behind a line of text, so the words stay readable over the scene. */
export function tag(g: G, s: string, x: number, y: number, align: 'left' | 'right' | 'center', color: string = PAL.yellow, size = 12) {
  const w = s.length * (size * 0.56) + 10;
  const x0 = align === 'left' ? x - 5 : align === 'right' ? x - w + 5 : x - w / 2;
  g.fillStyle = 'rgba(6,10,36,0.82)';
  g.fillRect(x0, y - size - 1, w, size + 6);
  text(g, s, x, y, color, size, align);
}

/** Draw a handle's grip (a ring with arrows), its highlight while held, its first-touch cue and the player's setting beside it. */
export function grip(g: G, c: HTMLCanvasElement, clock: number, o: GripSpec) {
  const w = watch(c, clock);
  const r = Math.max(GRIP_MIN, o.r ?? GRIP_MIN);
  w.pts.push([o.x, o.y, r]);
  const held = w.active;
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
  text(g, o.dir === 'h' ? '⇔' : o.dir === 'v' ? '⇕' : '✥', o.x, o.y + 5, held ? PAL.yellow : PAL.white, 14);
  const s = cue && o.read ? `${o.read} · drag` : o.read;
  const gap = r + 6;
  if (!s) return;
  if (o.side === 'right') tag(g, s, o.x + gap, o.y + 4, 'left');
  else if (o.side === 'left') tag(g, s, o.x - gap, o.y + 4, 'right');
  else if (o.side === 'above') tag(g, s, o.x, o.y - gap, 'center');
  else tag(g, s, o.x, o.y + gap + 12, 'center');
}

/** The round's goal as one short line on the scene: full for GOAL_SECONDS of play, then it fades out. */
export function goalLine(g: G, line: string, played: number, busy: boolean, y = 22, cx = 420) {
  if (busy || played > GOAL_SECONDS + 0.6) return;
  g.globalAlpha = played <= GOAL_SECONDS ? 1 : 1 - (played - GOAL_SECONDS) / 0.6;
  tag(g, line, cx, y, 'center', PAL.white, 12);
  g.globalAlpha = 1;
}

/** A different wash of light for each of the three rounds (cool dusk, violet night, red floodlights) and a still red frame for the boss round. */
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
