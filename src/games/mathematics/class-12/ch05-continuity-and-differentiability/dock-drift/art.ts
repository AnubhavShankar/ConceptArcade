// Drawing for Dock Drift: Orbit the maintenance robot, the docking clamp, Commander Vega in the airlock window, the station (truss, hull wall, rail, cradle),
// the wall ruler and the formula sign. Nothing here knows the answer of a round: it draws the positions, moods and states it is handed. The rail is a fixed
// decorative curve (the same every round), never a graph of f.
import { PAL } from '@core/arcade';
import { backdrop, face, num } from '@core/mathkit';
import { glow, line, text } from '@core/neon';

export type G = CanvasRenderingContext2D;
export type OrbitMood = 'wait' | 'drift' | 'dock' | 'bonk' | 'dizzy';
export type VegaMood = 'idle' | 'cheer' | 'miss';

/** The release point on screen, the same every round. */
export const REL = { x: 230, y: 176 };
/** The hull wall; 11 px per metre on the ruler. */
export const WALL = { x: 540, top: 34, bottom: 318, unit: 11 };
export const clampY = (h: number) => REL.y - h * WALL.unit;
/** The clamp's centre column and the robot's end column. */
export const CLAMP_X = WALL.x - 8;
/** The dash pattern of the guide laser (nothing else in the scene uses it). */
export const LASER_DASH = [7, 5];
const PANEL = { x: WALL.x + 4, w: 60 };
const WINDOW = { x: PANEL.x + 30, y: 82 };

const INK = '#1b1030';

export function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function dot(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

// ---- Orbit -------------------------------------------------------------------------------------------------------------------------------------------------

export interface OrbitOpts {
  t: number;
  mood: OrbitMood;
  /** 0: the grip claw is closed on the rail; 1: wide open. */
  claw: number;
  /** 0 to 1: a flash at the claw as it lets go. */
  flash?: number;
  /** Turn in radians (about the claw while hanging, about the middle otherwise). */
  rot?: number;
  /** Rotate about the top of the claw instead of the middle (the idle sway while it hangs from the rail). */
  hang?: boolean;
  scale?: number;
  alpha?: number;
  /** Wave the right arm. */
  wave?: boolean;
  /** Draw only the outline (a ghost of the motion trail). */
  outline?: boolean;
}

/** A pair of LED eyes on Orbit's screen, centred on (0, -4) in Orbit's own units. */
function eyes(g: G, o: OrbitOpts) {
  const blink = o.t % 3.7 < 0.12;
  for (const ex of [-4.5, 4.5]) {
    const side = ex < 0 ? -1 : 1;
    switch (o.mood) {
      case 'wait':
        // happy ^ ^ (a flat line while blinking)
        if (blink) line(g, ex - 2.2, -4, ex + 2.2, -4, PAL.green, 1.5);
        else {
          g.strokeStyle = PAL.green;
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(ex - 2.2, -2.8);
          g.lineTo(ex, -5.6);
          g.lineTo(ex + 2.2, -2.8);
          g.stroke();
        }
        break;
      case 'drift':
        // focused o o
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 1.4;
        g.beginPath();
        g.ellipse(ex, -4, 2, blink ? 0.4 : 2, 0, 0, Math.PI * 2);
        g.stroke();
        break;
      case 'dock':
        // a happy star eye, drawn as strokes (it is part of the face, not scene text)
        line(g, ex - 2.4, -2.6, ex + 2.4, -2.6, PAL.yellow, 1.4);
        line(g, ex, -5, ex, -0.2, PAL.yellow, 1.4);
        line(g, ex - 1.7, -4.3, ex + 1.7, -0.9, PAL.yellow, 1.2);
        line(g, ex + 1.7, -4.3, ex - 1.7, -0.9, PAL.yellow, 1.2);
        break;
      case 'bonk':
        // > <
        g.strokeStyle = PAL.red;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(ex - side * 2, -6.2);
        g.lineTo(ex + side * 1.6, -4);
        g.lineTo(ex - side * 2, -1.8);
        g.stroke();
        break;
      case 'dizzy':
        // a dizzy spiral eye, drawn as two arcs
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(ex, -3, 1.2, 0, Math.PI * 1.7);
        g.stroke();
        g.beginPath();
        g.arc(ex, -3, 2.6, Math.PI, Math.PI * 2.7);
        g.stroke();
        break;
    }
  }
  // the LED mouth: a smile while waiting or docked, a frown after a bonk
  g.strokeStyle = o.mood === 'bonk' || o.mood === 'dizzy' ? PAL.red : PAL.green;
  g.lineWidth = 1.1;
  g.beginPath();
  if (o.mood === 'wait' || o.mood === 'dock') g.arc(0, -0.2, 3, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (o.mood === 'bonk' || o.mood === 'dizzy') g.arc(0, 2.4, 2.6, 1.15 * Math.PI, 1.85 * Math.PI);
  else {
    g.moveTo(-2, 0.8);
    g.lineTo(2, 0.8);
  }
  g.stroke();
}

/**
 * Orbit, centred on the middle of the body at (x, y): a squat cylinder 30 × 26 with rivets, a dark face screen, a blinking antenna, a magnetic grip claw on top,
 * two empty thruster pods with a flickering red light, and a tool belt. Idle life: sways on the rail, blinks, coughs a spark every 2.5 s.
 */
export function orbit(g: G, x: number, y: number, o: OrbitOpts) {
  const { t } = o;
  g.save();
  g.globalAlpha = o.alpha ?? 1;
  g.translate(x, y);
  const s = o.scale ?? 1;
  g.scale(s, s);
  if (o.hang) {
    g.translate(0, -17);
    g.rotate(o.rot ?? 0);
    g.translate(0, 17);
  } else g.rotate(o.rot ?? 0);
  if (o.outline) {
    g.strokeStyle = PAL.dim;
    g.lineWidth = 1.2 / s;
    rr(g, -15, -13, 30, 26, 5);
    g.stroke();
    rr(g, -21, 3, 6, 11, 2);
    g.stroke();
    rr(g, 15, 3, 6, 11, 2);
    g.stroke();
    g.restore();
    return;
  }
  // thruster pods (empty: the red light flickers, and the left one coughs a spark every 2.5 s)
  for (const side of [-1, 1]) {
    const px = side < 0 ? -21 : 15;
    g.fillStyle = '#4a5078';
    rr(g, px, 3, 6, 11, 2);
    g.fill();
    g.fillStyle = '#2a2f55';
    g.fillRect(px + 1, 13, 4, 3);
    dot(g, px + 3, 7, 1.7, `rgba(255,70,70,${0.3 + 0.7 * Math.abs(Math.sin(t * 6 + (side + 1) * 2.1))})`);
  }
  if (t % 2.5 < 0.15) {
    line(g, -18, 16, -21, 20, PAL.yellow, 1.2);
    line(g, -18, 16, -15, 21, PAL.orange, 1.2);
  }
  // arms: short stubs at rest, the right one waves when asked
  const armPts: [number, number][] = o.wave ? [[15, -5], [22 + 2.5 * Math.sin(t * 14), -16]] : [[15, -5], [19, 0]];
  line(g, armPts[0][0], armPts[0][1], armPts[1][0], armPts[1][1], '#aab2d0', 3);
  dot(g, armPts[1][0], armPts[1][1], 2, '#e6e9f8');
  line(g, -15, -5, -19, 0, '#aab2d0', 3);
  dot(g, -19, 0, 2, '#e6e9f8');
  // body, shading, belt and tool
  g.fillStyle = '#d9deef';
  rr(g, -15, -13, 30, 26, 5);
  g.fill();
  g.fillStyle = '#aab2d0';
  g.fillRect(-15, 9, 30, 4);
  g.fillStyle = '#6b5230';
  g.fillRect(-15, 5, 30, 4);
  g.fillStyle = PAL.yellow;
  rr(g, -2.5, 5, 5, 4, 1);
  g.fill();
  g.fillStyle = '#c9ceea';
  g.fillRect(8.5, 9, 3, 7);
  g.fillStyle = '#7b82a6';
  g.fillRect(7.8, 15, 4.4, 2);
  for (const [rx, ry] of [[-12.5, -10.5], [12.5, -10.5], [-12.5, 11], [12.5, 11]]) dot(g, rx, ry, 1.2, '#8a92b4');
  // the face screen with its LED eyes
  g.fillStyle = '#0b1030';
  rr(g, -10, -10, 20, 14, 3);
  g.fill();
  g.strokeStyle = '#2b3a7a';
  g.lineWidth = 1;
  g.stroke();
  eyes(g, o);
  // antenna with a tip that blinks every 1.2 s
  line(g, 9, -13, 9, -22, '#8d93b5', 2);
  dot(g, 9, -23, 2.2, t % 1.2 < 0.25 ? PAL.pink : '#5a2a40');
  // the grip claw on top: two hooks that close on the rail (claw 0) or swing open (claw 1)
  g.fillStyle = '#7b82a6';
  rr(g, -6, -17, 12, 4, 1.5);
  g.fill();
  const a = Math.max(0, Math.min(1, o.claw)) * 0.95;
  for (const side of [-1, 1]) {
    const bx = side * 3;
    const ex = bx + side * Math.sin(a) * 8;
    const ey = -17 - Math.cos(a) * 8;
    line(g, bx, -17, ex, ey, '#c9ceea', 2.2);
    if (o.claw < 0.3) line(g, ex, ey, ex - side * 2.4, ey - 0.6, '#c9ceea', 2.2);
  }
  if ((o.flash ?? 0) > 0) {
    g.globalAlpha = (o.alpha ?? 1) * Math.min(1, o.flash ?? 0);
    glow(g, PAL.yellow, 10, () => dot(g, 0, -23, 3 + 7 * (1 - (o.flash ?? 0)), PAL.yellow));
  }
  g.restore();
}

// ---- The clamp ---------------------------------------------------------------------------------------------------------------------------------------------

/** The docking clamp at (x, y): a ring of radius 14 with four claws that close (closed 0 to 1) and a status light; `tone` colours the ring. */
export function clampRing(g: G, x: number, y: number, t: number, closed: number, tone: 'idle' | 'win' | 'miss') {
  const col = tone === 'win' ? PAL.green : tone === 'miss' ? PAL.red : '#c9ceea';
  // the bracket to the rail
  line(g, x + 12, y, WALL.x + 2, y, '#7b82a6', 5);
  glow(g, tone === 'idle' ? PAL.cyan : col, tone === 'idle' ? 6 : 14, () => {
    g.strokeStyle = col;
    g.lineWidth = 4;
    g.beginPath();
    g.arc(x, y, 14, 0, Math.PI * 2);
    g.stroke();
  });
  for (let i = 0; i < 4; i++) {
    const ang = Math.PI / 4 + (i * Math.PI) / 2;
    const r0 = 14;
    const r1 = 12 - 8 * closed;
    line(g, x + Math.cos(ang) * r0, y + Math.sin(ang) * r0, x + Math.cos(ang) * r1, y + Math.sin(ang) * r1, col, 3);
  }
  dot(g, x, y - 14, 2.2, tone === 'win' ? PAL.green : tone === 'miss' ? PAL.red : Math.sin(t * 4) > 0 ? PAL.cyan : '#2b3a7a');
}

// ---- Commander Vega ----------------------------------------------------------------------------------------------------------------------------------------

/** Commander Vega in the round airlock window: a helmeted face looking toward Orbit, a thumbs-up on a catch, a face-palm on a miss. */
export function vega(g: G, t: number, mood: VegaMood, look: number) {
  const cx = WINDOW.x;
  const cy = WINDOW.y + Math.sin(t * 1.5) * 0.8;
  dot(g, cx, WINDOW.y, 24, '#0b1030');
  g.strokeStyle = '#8d93b5';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, WINDOW.y, 24, 0, Math.PI * 2);
  g.stroke();
  dot(g, cx, cy + 1, 18, '#dfe4f7');
  dot(g, cx, cy + 1, 14.5, '#1d2a5c');
  const fx = cx + look * 1.6;
  dot(g, fx, cy + 1.5, 11.5, '#f0c8a0');
  face(g, fx, cy + 2, 11, mood === 'cheer' ? 'cheer' : mood === 'miss' ? 'worried' : 'happy', t, INK);
  g.strokeStyle = 'rgba(255,255,255,0.4)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(cx, cy + 1, 12.5, Math.PI * 1.15, Math.PI * 1.55);
  g.stroke();
  if (mood === 'cheer') {
    line(g, cx + 22, cy + 28, cx + 19, cy + 16, '#dfe4f7', 6);
    g.fillStyle = '#e8ecfb';
    rr(g, cx + 13.5, cy + 9, 11, 9, 3);
    g.fill();
    rr(g, cx + 16.5, cy + 1.5, 4.2, 9, 2);
    g.fill();
  } else if (mood === 'miss') {
    line(g, cx + 18, cy + 30, cx + 8, cy + 8, '#dfe4f7', 7);
    g.fillStyle = '#e8ecfb';
    rr(g, cx - 13, cy - 6, 26, 15, 6);
    g.fill();
    for (let i = -2; i <= 2; i++) line(g, cx + i * 5, cy - 4, cx + i * 5, cy + 7, '#aab2d0', 1);
  }
}

// ---- The station -------------------------------------------------------------------------------------------------------------------------------------------

const frac = (v: number) => v - Math.floor(v);

/** Deep space: the night backdrop, 60 twinkling stars, a blue planet's limb across the bottom-left corner, a drifting satellite and the truss beams across the top. */
export function station(g: G, t: number) {
  backdrop(g);
  for (let i = 0; i < 60; i++) {
    const x = frac(Math.sin(i * 12.9898) * 43758.5453) * 640;
    const y = 26 + frac(Math.sin(i * 78.233) * 12345.6789) * 280;
    if (Math.hypot(x - 80, y - 600) < 384) continue;
    g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.4 + i * 1.7));
    g.fillStyle = i % 5 === 0 ? PAL.cyan : PAL.white;
    const big = i % 4 === 0;
    g.fillRect(x, y, big ? 2 : 1, big ? 2 : 1);
  }
  g.globalAlpha = 1;
  // the planet: a big disc whose top-right edge shows, with an atmosphere glow and a few clouds
  g.fillStyle = '#16408f';
  g.beginPath();
  g.arc(80, 600, 380, 0, Math.PI * 2);
  g.fill();
  glow(g, PAL.cyan, 14, () => {
    g.strokeStyle = 'rgba(77,225,255,0.55)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(80, 600, 380, Math.PI * 1.08, Math.PI * 1.46);
    g.stroke();
  });
  g.fillStyle = 'rgba(44,138,90,0.55)';
  g.beginPath();
  g.ellipse(60, 270, 38, 11, -0.08, 0, Math.PI * 2);
  g.ellipse(170, 288, 30, 8, 0.1, 0, Math.PI * 2);
  g.fill();
  line(g, 20, 300, 120, 292, 'rgba(255,255,255,0.22)', 3);
  line(g, 230, 318, 300, 312, 'rgba(255,255,255,0.18)', 3);
  // a satellite drifting slowly across (decor)
  const sx = 660 - ((t * 7) % 720);
  const sy = 108 + Math.sin(t * 0.3) * 6;
  g.save();
  g.translate(sx, sy);
  g.rotate(Math.sin(t * 0.5) * 0.15);
  g.fillStyle = '#2c4fc4';
  g.fillRect(-17, -2.5, 11, 5);
  g.fillRect(6, -2.5, 11, 5);
  g.fillStyle = '#c9ceea';
  rr(g, -5, -4, 10, 8, 2);
  g.fill();
  dot(g, 0, -7, 1.4, Math.sin(t * 3) > 0.4 ? PAL.red : '#5a2a40');
  line(g, 0, -4, 0, -7, '#c9ceea', 1);
  g.restore();
  // truss beams across the top: two chords, zig-zag braces and posts
  line(g, 0, 5, 640, 5, '#7b82a6', 3);
  line(g, 0, 21, 640, 21, '#7b82a6', 3);
  for (let x = 0; x < 640; x += 24) {
    line(g, x, 5, x + 12, 21, '#4a5078', 1.5);
    line(g, x + 12, 21, x + 24, 5, '#4a5078', 1.5);
  }
  for (const x of [60, 300, 520]) {
    line(g, x, 21, x, 30, '#7b82a6', 4);
    dot(g, x, 33, 2.4, Math.sin(t * 2 + x) > 0 ? PAL.yellow : '#6a5a20');
  }
}

/** The hull wall: a riveted panel with warning stripes, the airlock window frame and the airlock light (amber while waiting, green once the robot is caught). */
export function hull(g: G, t: number, light: 'amber' | 'green') {
  const { x, w } = PANEL;
  g.fillStyle = '#2a2f55';
  g.fillRect(x, WALL.top, w, WALL.bottom - WALL.top);
  g.strokeStyle = '#7b82a6';
  g.lineWidth = 1.5;
  g.strokeRect(x, WALL.top, w, WALL.bottom - WALL.top);
  for (let y = WALL.top + 56; y < WALL.bottom; y += 56) line(g, x, y, x + w, y, '#1d2250', 2);
  for (const [y0, y1] of [[WALL.top, WALL.top + 12], [WALL.bottom - 12, WALL.bottom]]) {
    for (let i = 0; i < 5; i++) {
      const x0 = x + i * 12;
      g.fillStyle = i % 2 ? '#10142e' : PAL.yellow;
      g.beginPath();
      g.moveTo(x0, y1);
      g.lineTo(x0 + 6, y1);
      g.lineTo(x0 + 12, y0);
      g.lineTo(x0 + 6, y0);
      g.closePath();
      g.fill();
    }
  }
  for (let y = WALL.top + 28; y < WALL.bottom - 14; y += 28) {
    dot(g, x + 7, y, 1.8, '#8d93b5');
    dot(g, x + w - 7, y, 1.8, '#8d93b5');
  }
  const lamp = light === 'green' ? PAL.green : Math.sin(t * 2) > 0 ? PAL.orange : '#6a4a20';
  glow(g, lamp, light === 'green' ? 14 : 6, () => dot(g, WINDOW.x, 52, 4.2, lamp));
  text(g, 'AIRLOCK 7', WINDOW.x, 122, PAL.dim, 11);
  // the clamp's rail runs up the wall
  g.fillStyle = '#4a5078';
  g.fillRect(WALL.x - 1, WALL.top, 5, WALL.bottom - WALL.top);
}

/** The wall ruler: a tick every metre from −12 to 12 on the wall's left edge, labelled every 2 m, with the release height marked. Not to scale with the rail. */
export function ruler(g: G) {
  for (let m = -12; m <= 12; m++) {
    const y = clampY(m);
    line(g, 514 - (m % 2 === 0 ? 8 : 5), y, 514, y, m === 0 ? PAL.green : PAL.dim, m === 0 ? 2 : 1);
    if (m % 2 === 0) text(g, num(m), 500, y + 3, m === 0 ? PAL.green : PAL.dim, 11, 'right');
  }
  line(g, REL.x + 24, REL.y, 482, REL.y, PAL.dim, 1, [4, 4]);
  text(g, 'release height', 400, REL.y - 6, PAL.green, 11);
}

/** The rail: a glowing tube along a fixed decorative curve into the release cradle (a dark box that hides the rail's last direction). */
export function rail(g: G) {
  g.lineCap = 'round';
  glow(g, PAL.cyan, 10, () => {
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(20, 60);
    g.bezierCurveTo(120, 40, 170, 210, REL.x, REL.y);
    g.stroke();
  });
  g.strokeStyle = '#0d5a78';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(20, 60);
  g.bezierCurveTo(120, 40, 170, 210, REL.x, REL.y);
  g.stroke();
  g.lineCap = 'butt';
  dot(g, 20, 60, 6, '#4a5078');
  g.fillStyle = '#10142e';
  rr(g, REL.x - 17, REL.y - 12, 34, 24, 4);
  g.fill();
  g.strokeStyle = '#7b82a6';
  g.lineWidth = 1.5;
  g.stroke();
}

/** The formula sign: RAIL, the formula in yellow, and where Orbit lets go. The wall is not to scale and the sign says how far it really is. */
export function sign(g: G, title: string, formula: string, info: string) {
  g.fillStyle = 'rgba(8,12,40,0.9)';
  rr(g, 14, 236, 300, 52, 8);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.4;
  g.stroke();
  text(g, title, 24, 250, PAL.dim, 11, 'left');
  const size = formula.length > 36 ? 11 : formula.length > 30 ? 12 : 13;
  text(g, formula, 24, 267, PAL.yellow, size, 'left');
  text(g, info, 24, 282, PAL.white, 11, 'left');
}
