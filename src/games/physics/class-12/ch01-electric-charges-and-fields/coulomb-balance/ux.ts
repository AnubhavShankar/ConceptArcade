// UX pieces for the canvas of "Float the Bead": a drag handle with a visible grip and the player's own setting beside it, a pill of dark glass behind
// scene text, the round's goal line, and the pulsing "drag" cue that stays until the first touch. Pure drawing plus one pointer watcher per canvas.
import { PAL } from '@core/arcade';
import { text } from '@core/neon';
import { pointerToLocal } from '@core/sim';

type G = CanvasRenderingContext2D;
/** The smallest handle radius, in scene pixels (about 44 px on a phone). */
export const GRIP_MIN = 18;

const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

interface Watch {
  active: boolean;
  touched: boolean;
  frame: number;
  pts: [number, number, number][];
}
const watching = new WeakMap<HTMLCanvasElement, Watch>();

/** One watcher per canvas: it knows where the grips were drawn last frame, whether one is held, and whether any was ever touched. */
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
  dir: 'h' | 'v';
  /** The player's own setting with its unit, drawn beside the handle. */
  read: string;
  side: 'left' | 'right' | 'above' | 'below';
  /** Pulse a "drag" label above (or beside) the handle until the first touch. */
  cue?: boolean;
  /** A see-through ring (for a handle that sits on top of the thing it moves, such as the laser emitter). */
  glass?: boolean;
}

/** A pill of dark glass behind a line of text, so the words stay readable over the scene. */
export function tag(g: G, s: string, x: number, y: number, align: 'left' | 'right' | 'center', color: string = PAL.yellow, size = 12) {
  const w = s.length * (size * 0.58) + 10;
  const x0 = align === 'left' ? x - 5 : align === 'right' ? x - w + 5 : x - w / 2;
  g.fillStyle = 'rgba(6,10,36,0.82)';
  g.fillRect(x0, y - size - 1, w, size + 6);
  text(g, s, x, y, color, size, align);
}

/** True once the player has pressed on any grip drawn on this canvas. */
export const touched = (c: HTMLCanvasElement, clock: number) => watch(c, clock).touched;

/** Draw a handle's grip (a ring with arrows), its highlight while held, its first-touch cue and the player's setting beside it. */
export function grip(g: G, c: HTMLCanvasElement, clock: number, o: GripSpec) {
  const w = watch(c, clock);
  const r = Math.max(GRIP_MIN, o.r ?? GRIP_MIN);
  w.pts.push([o.x, o.y, r]);
  const held = w.active;
  g.fillStyle = held ? 'rgba(255,210,63,0.4)' : o.glass ? 'rgba(10,16,48,0.25)' : 'rgba(10,16,48,0.78)';
  g.beginPath();
  g.arc(o.x, o.y, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = held ? PAL.yellow : PAL.white;
  g.lineWidth = held ? 4 : 2;
  g.beginPath();
  g.arc(o.x, o.y, r, 0, Math.PI * 2);
  g.stroke();
  text(g, o.dir === 'h' ? '⇔' : '⇕', o.x, o.y + 5, held ? PAL.yellow : PAL.white, 14);
  if (o.cue && !w.touched) {
    g.globalAlpha = calm() ? 1 : 0.5 + 0.5 * Math.sin(5 * clock);
    if (o.dir === 'h') text(g, 'drag ⇔', o.x, o.y - r - 8, PAL.yellow, 12);
    else text(g, 'drag ⇕', o.x - r - 8, o.y - 18, PAL.yellow, 12, 'right');
    g.globalAlpha = 1;
  }
  if (!o.read) return;
  const gap = r + 6;
  if (o.side === 'right') tag(g, o.read, o.x + gap, o.y + 4, 'left');
  else if (o.side === 'left') tag(g, o.read, o.x - gap, o.y + 4, 'right');
  else if (o.side === 'above') tag(g, o.read, o.x, o.y - gap, 'center');
  else tag(g, o.read, o.x, o.y + gap + 12, 'center');
}

/** The round's goal as one short line at the top of the scene. */
export function goalLine(g: G, line: string, y = 20, cx = 320) {
  tag(g, line, cx, y, 'center', PAL.yellow, 14);
}
