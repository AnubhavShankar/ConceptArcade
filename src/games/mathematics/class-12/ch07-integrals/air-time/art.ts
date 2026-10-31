// Drawing for Air Time: Blaze and the dirt bike, the night stadium and its crowd, the kicker and landing ramp, the course signs, the spin gauge and the
// speedometer. Nothing here knows the answer of a round: it draws the positions, angles, poses and needle values it is handed.
import { PAL } from '@core/arcade';
import { face } from '@core/mathkit';
import { glow, line, text } from '@core/neon';

export type G = CanvasRenderingContext2D;
export type Mood = 'happy' | 'worried' | 'cheer' | 'dizzy';
export type Pose = 'ride' | 'air' | 'stand' | 'fist' | 'fall' | 'launched' | 'dizzy';
export type CrowdMode = 'idle' | 'cheer' | 'groan';

const INK = '#1b1030';
const RED = '#d8232f';
const SKIN = '#f0c8a0';
const DIRT = '#6b4a2b';

/** Blaze's number 7 drawn as two strokes (it is a prop on the bike and the jersey, not scene text). */
function seven(g: G, cx: number, cy: number, s: number, color: string) {
  line(g, cx - s, cy - s, cx + s, cy - s, color, 1.4);
  line(g, cx + s, cy - s, cx - s * 0.3, cy + s, color, 1.4);
}

export function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function limb(g: G, pts: [number, number][], w: number, color: string) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
  g.lineCap = 'butt';
}

// ---- The bike ----------------------------------------------------------------------------------------------------------------------------------------------

export interface RiderOpts {
  pose: Pose;
  mood: Mood;
  /** Nitro flame from the exhaust. */
  nitro: boolean;
  /** Wheel turn in radians. */
  wheel: number;
  /** 0 to 1: the forks and the rear shock are squashed by a landing. */
  compress: number;
  /** Drawing scale (1 = 56 px long). */
  scale?: number;
  alpha?: number;
  /** Vertical squash (1 = normal): a bike lying on its side seen from the front-side. */
  squash?: number;
}

function wheel(g: G, cx: number, cy: number, spin: number) {
  g.fillStyle = '#101018';
  g.beginPath();
  g.arc(cx, cy, 12, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 12; i++) {
    g.save();
    g.translate(cx, cy);
    g.rotate(spin + (i * Math.PI) / 6);
    g.fillStyle = '#3a3a4a';
    g.fillRect(9.6, -1.7, 3.4, 3.4);
    g.restore();
  }
  g.strokeStyle = '#a9b1d6';
  g.lineWidth = 1.4;
  g.beginPath();
  g.arc(cx, cy, 8, 0, Math.PI * 2);
  g.stroke();
  for (let k = 0; k < 4; k++) line(g, cx, cy, cx + Math.cos(spin + (k * Math.PI) / 2) * 8, cy + Math.sin(spin + (k * Math.PI) / 2) * 8, '#cfd4ee', 1);
  g.fillStyle = '#e8ebff';
  g.beginPath();
  g.arc(cx, cy, 2, 0, Math.PI * 2);
  g.fill();
}

/** The bike alone, centred on (0, 0) of the current transform, facing right. The wheels touch the ground 20 px below the centre. */
function bikeParts(g: G, t: number, o: RiderOpts) {
  const c = o.compress * 4;
  wheel(g, -22, 8, o.wheel);
  wheel(g, 22, 8, o.wheel);
  // rear swing arm and shock, front forks (two parallel lines); the body sinks by `c` when they compress
  line(g, -8, 2 + c, -22, 8, '#8d93b5', 3);
  line(g, -13, -5 + c, -19, 5, '#ffb23f', 2.4);
  line(g, 9, -10 + c, 22, 8, '#c4c9e6', 2);
  line(g, 11.6, -10 + c, 22, 8, '#c4c9e6', 2);
  // frame, tank, seat
  g.fillStyle = RED;
  g.beginPath();
  g.moveTo(-14, -4 + c);
  g.lineTo(8, -10 + c);
  g.lineTo(13, -4 + c);
  g.lineTo(2, 6 + c);
  g.lineTo(-12, 4 + c);
  g.closePath();
  g.fill();
  g.fillStyle = '#f23a46';
  rr(g, -4, -14 + c, 15, 7, 3);
  g.fill();
  g.fillStyle = '#17171f';
  rr(g, -19, -9 + c, 20, 4.5, 2);
  g.fill();
  // exhaust, handlebar, number plate
  line(g, -4, 3 + c, -30, -1 + c, '#c9ceea', 3.4);
  line(g, 8, -12 + c, 4, -18 + c, '#17171f', 2.6);
  g.fillStyle = PAL.white;
  rr(g, 13, -16 + c, 9, 9, 2);
  g.fill();
  seven(g, 17.5, -11.6 + c, 2.6, INK);
  if (o.nitro) {
    const a = 14 + 8 * Math.sin(t * 40);
    const b = 9 + 5 * Math.cos(t * 37);
    glow(g, '#6cc8ff', 10, () => {
      g.fillStyle = '#6cc8ff';
      g.beginPath();
      g.moveTo(-30, -4 + c);
      g.lineTo(-30 - a, -1 + c);
      g.lineTo(-30, 2 + c);
      g.fill();
    });
    g.fillStyle = PAL.white;
    g.beginPath();
    g.moveTo(-30, -2 + c);
    g.lineTo(-30 - b, -1 + c);
    g.lineTo(-30, 0.8 + c);
    g.fill();
  }
}

interface Pz {
  hip: [number, number];
  sh: [number, number];
  head: [number, number];
  legs: [number, number, number, number][];
  arms: [number, number, number, number][];
}
const POSES: Record<Pose, Pz> = {
  ride: { hip: [-9, -11], sh: [0, -25], head: [5, -32], legs: [[0, -3, -3, 6]], arms: [[5, -22, 8, -14]] },
  air: { hip: [-7, -11], sh: [-1, -23], head: [3, -30], legs: [[9, -16, 0, 2]], arms: [[4, -19, 8, -14]] },
  stand: { hip: [-3, -19], sh: [-1, -36], head: [0, -45], legs: [[0, -7, -3, 5]], arms: [[4, -26, 8, -14]] },
  fist: { hip: [-3, -19], sh: [-1, -36], head: [0, -45], legs: [[0, -7, -3, 5]], arms: [[4, -26, 8, -14], [8, -45, 10, -54]] },
  launched: { hip: [0, 0], sh: [3, -16], head: [6, -24], legs: [[-6, 9, -12, 17], [2, 10, -2, 19]], arms: [[-9, -18, -16, -26], [13, -24, 20, -28]] },
  fall: { hip: [0, 0], sh: [0, -16], head: [0, -24], legs: [[-3, 10, -4, 19], [3, 10, 4, 19]], arms: [[-9, -8, -12, 2], [9, -8, 12, 2]] },
  dizzy: { hip: [0, 0], sh: [0, -16], head: [0, -24], legs: [[-3, 10, -4, 19], [3, 10, 4, 19]], arms: [[-8, -14, -12, -6], [8, -14, 12, -6]] },
};

/** A helmet with the visor down: red shell, white stripe, dark visor with a glint that slides across every 3 s, chin guard. */
function helmet(g: G, hx: number, hy: number, t: number, mood: Mood, turn: number) {
  g.fillStyle = RED;
  g.beginPath();
  g.arc(hx, hy, 7.6, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.white;
  g.lineWidth = 1.8;
  g.beginPath();
  g.arc(hx, hy, 7.6, Math.PI * 1.15, Math.PI * 1.85);
  g.stroke();
  g.fillStyle = '#9c1822';
  rr(g, hx + 1.5 + turn, hy + 3.6, 7, 4.4, 1.8);
  g.fill();
  g.fillStyle = '#0d1430';
  g.beginPath();
  g.ellipse(hx + 3 + turn, hy - 0.6, 5, 3.4, 0, 0, Math.PI * 2);
  g.fill();
  const ph = (t % 3) / 0.5;
  if (ph < 1 && mood !== 'dizzy') line(g, hx + turn - 0.6 + ph * 7, hy - 3, hx + turn + 1.6 + ph * 7, hy + 1.6, 'rgba(255,255,255,0.85)', 1.3);
  if (mood === 'dizzy') {
    for (const dx of [0.6, 5.2]) {
      line(g, hx + dx - 1.4 + turn, hy - 2.2, hx + dx + 1.4 + turn, hy + 1, PAL.white, 1.1);
      line(g, hx + dx + 1.4 + turn, hy - 2.2, hx + dx - 1.4 + turn, hy + 1, PAL.white, 1.1);
    }
  }
  if (mood === 'worried') {
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.arc(hx - 9.5, hy - 1 + ((t * 18) % 6), 1.4, 0, Math.PI * 2);
    g.fill();
  }
}

/** The rider's body in the current frame. `dy` sinks the whole rider with the bike suspension. */
function person(g: G, t: number, o: RiderOpts, dy: number, turn: number) {
  const P = POSES[o.pose];
  const [hx, hy] = [P.hip[0], P.hip[1] + dy];
  const sh: [number, number] = [P.sh[0], P.sh[1] + dy];
  for (const l of P.legs) {
    limb(g, [[hx, hy], [l[0], l[1] + dy], [l[2], l[3] + dy]], 5, '#15151f');
    g.fillStyle = '#0c0c12';
    rr(g, l[2] - 4, l[3] + dy - 1.4, 9, 4.2, 1.6);
    g.fill();
  }
  limb(g, [[hx, hy], sh], 9, '#1d4cc4');
  limb(g, [[hx + (sh[0] - hx) * 0.4, hy + (sh[1] - hy) * 0.4], sh], 10, '#8b90a8');
  seven(g, hx + (sh[0] - hx) * 0.3 - 0.5, hy + (sh[1] - hy) * 0.3, 1.9, PAL.white);
  helmet(g, P.head[0], P.head[1] + dy, t, o.mood, turn);
  for (const a of P.arms) {
    limb(g, [sh, [a[0], a[1] + dy], [a[2], a[3] + dy]], 3.8, '#1d4cc4');
    g.fillStyle = '#0c0c12';
    g.beginPath();
    g.arc(a[2], a[3] + dy, 2.7, 0, Math.PI * 2);
    g.fill();
  }
}

/** The bike on its own (a crashed or tumbling bike without its rider), centred on (x, y), turned by `angle`. */
export function bike(g: G, x: number, y: number, angle: number, t: number, o: RiderOpts) {
  g.save();
  g.globalAlpha = o.alpha ?? 1;
  g.translate(x, y);
  g.scale(o.scale ?? 1, (o.scale ?? 1) * (o.squash ?? 1));
  g.rotate(angle);
  bikeParts(g, t, o);
  g.restore();
}

/**
 * Blaze on the bike, centred on the bike's middle (x, y) and turned by `angle` about it. Poses ride, air, stand and fist draw the bike with the rider on it; launched,
 * fall and dizzy draw only the rider (hip at (x, y)), because the bike is a separate thing then. Idle life: the helmet turns toward the ramp and back every 4 s.
 */
export function rider(g: G, x: number, y: number, angle: number, t: number, o: RiderOpts) {
  const alone = o.pose === 'launched' || o.pose === 'fall' || o.pose === 'dizzy';
  g.save();
  g.globalAlpha = o.alpha ?? 1;
  g.translate(x, y);
  g.scale(o.scale ?? 1, (o.scale ?? 1) * (o.squash ?? 1));
  g.rotate(angle);
  const turn = o.pose === 'ride' ? 1.6 * Math.sin(((t % 4) / 4) * Math.PI) : 0;
  if (!alone) bikeParts(g, t, o);
  person(g, t, o, alone ? 0 : o.compress * 4, turn);
  g.restore();
}

/** Three stars circling above a head. */
export function starsAround(g: G, x: number, y: number, t: number) {
  for (let i = 0; i < 3; i++) {
    const a = t * 7 + (i * Math.PI * 2) / 3;
    text(g, '★', x + Math.cos(a) * 13, y + Math.sin(a) * 4, PAL.yellow, 11);
  }
}

/** Blaze's portrait: a rounded frame 44 × 44 with the visor up, in the given mood (X eyes when dizzy). */
export function portrait(g: G, x: number, y: number, mood: Mood, t: number) {
  g.fillStyle = '#12183f';
  rr(g, x, y, 44, 44, 8);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.4;
  g.stroke();
  const cx = x + 22;
  const cy = y + 25;
  g.fillStyle = SKIN;
  g.beginPath();
  g.arc(cx, cy, 14, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = RED;
  g.beginPath();
  g.arc(cx, cy - 1, 17, Math.PI * 1.02, Math.PI * 1.98);
  g.fill();
  g.fillStyle = PAL.white;
  g.fillRect(cx - 2, cy - 18, 4, 6);
  g.fillStyle = '#0d1430';
  rr(g, cx - 14, cy - 9, 28, 5, 2);
  g.fill();
  g.fillStyle = RED;
  rr(g, cx - 16, cy + 6, 6, 12, 3);
  g.fill();
  rr(g, cx + 10, cy + 6, 6, 12, 3);
  g.fill();
  if (mood === 'dizzy') {
    g.strokeStyle = INK;
    g.lineWidth = 1.6;
    for (const dx of [-5.4, 5.4]) {
      line(g, cx + dx - 2.4, cy + 1 - 2.4, cx + dx + 2.4, cy + 1 + 2.4, INK, 1.6);
      line(g, cx + dx + 2.4, cy + 1 - 2.4, cx + dx - 2.4, cy + 1 + 2.4, INK, 1.6);
    }
    g.beginPath();
    g.arc(cx, cy + 11, 3.4, 1.15 * Math.PI, 1.85 * Math.PI);
    g.stroke();
  } else face(g, cx, cy + 1, 11, mood, t, INK);
}

// ---- The stadium -----------------------------------------------------------------------------------------------------------------------------------------

/** Two floodlight towers with a bank of six lamps each, and their faint light cones. */
export function towers(g: G, ground: number) {
  for (const x of [250, 470]) {
    line(g, x, ground, x, 86, '#7b82a6', 4);
    g.fillStyle = 'rgba(255,255,220,0.08)';
    g.beginPath();
    g.moveTo(x - 18, 80);
    g.lineTo(x + 18, 80);
    g.lineTo(x + 110, ground);
    g.lineTo(x - 110, ground);
    g.closePath();
    g.fill();
    g.fillStyle = '#4a5078';
    g.fillRect(x - 20, 70, 40, 14);
    for (let i = 0; i < 6; i++) {
      glow(g, '#fff6c0', 8, () => {
        g.fillStyle = '#fff6c0';
        g.beginPath();
        g.arc(x - 15 + (i % 3) * 15, 74 + Math.floor(i / 3) * 7, 3, 0, Math.PI * 2);
        g.fill();
      });
    }
  }
}

const SHIRTS = ['#e8505b', '#4de1ff', '#ffd23f', '#5dff9a', '#b07cff', '#ff9b3d', '#f4f6ff'];
/** A crowd of `n` fans between x0 and x1 standing behind a rail at `railY`: idle bobbing, cheering (jumping, flags fast) or groaning (hands on faces). */
export function crowd(g: G, t: number, mode: CrowdMode, railY: number, x0 = 14, x1 = 626, n = 14, railTo = 640) {
  for (let i = 0; i < n; i++) {
    const x = x0 + (i * (x1 - x0)) / (n - 1);
    const ph = i * 1.7;
    const bob = mode === 'cheer' ? 6 * Math.abs(Math.sin(t * 9 + ph)) : mode === 'groan' ? -2 : 1.5 * Math.sin(t * 3 + ph);
    const hy = railY - 17 - bob;
    g.fillStyle = SHIRTS[i % SHIRTS.length];
    rr(g, x - 6, hy + 6, 12, railY - hy - 4, 3);
    g.fill();
    g.fillStyle = i % 3 === 0 ? '#c68a5e' : i % 3 === 1 ? SKIN : '#8a5a3a';
    g.beginPath();
    g.arc(x, hy, 5.2, 0, Math.PI * 2);
    g.fill();
    if (mode === 'groan') {
      limb(g, [[x - 5, hy + 10], [x - 5, hy + 3]], 2.4, SHIRTS[i % SHIRTS.length]);
      limb(g, [[x + 5, hy + 10], [x + 5, hy + 3]], 2.4, SHIRTS[i % SHIRTS.length]);
    } else if (mode === 'cheer') {
      limb(g, [[x - 5, hy + 9], [x - 8, hy - 8]], 2.4, SHIRTS[i % SHIRTS.length]);
      limb(g, [[x + 5, hy + 9], [x + 8, hy - 8]], 2.4, SHIRTS[i % SHIRTS.length]);
    }
    if (i % 4 === 2) {
      const w = Math.sin(t * (mode === 'cheer' ? 14 : 3) + i) * 3;
      line(g, x + 8, hy + 6, x + 8, hy - 22, '#c9ceea', 1.4);
      g.fillStyle = i % 8 === 2 ? PAL.pink : PAL.cyan;
      g.beginPath();
      g.moveTo(x + 8, hy - 22);
      g.lineTo(x + 20 + w, hy - 18);
      g.lineTo(x + 8, hy - 13);
      g.fill();
    }
  }
  g.fillStyle = '#1c2250';
  g.fillRect(0, railY - 2, railTo, 6);
  line(g, 0, railY - 2, railTo, railY - 2, PAL.dim, 1.5);
}

/** The dirt band with dashed tyre tracks. */
export function dirt(g: G, y: number) {
  g.fillStyle = '#3b2a1c';
  g.fillRect(0, y, 640, 340 - y);
  line(g, 0, y + 10, 640, y + 10, '#2a1c11', 2, [14, 10]);
  line(g, 0, y + 17, 640, y + 17, '#2a1c11', 2, [14, 10]);
  line(g, 0, y + 1, 640, y + 1, '#5a4029', 2);
}

/** A rounded course sign with a small title and a line of text in yellow. */
export function sign(g: G, x: number, y: number, w: number, h: number, title: string, body: string, extra?: string) {
  g.fillStyle = 'rgba(8,12,40,0.88)';
  rr(g, x, y, w, h, 8);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.4;
  g.stroke();
  text(g, title, x + 10, y + 15, PAL.dim, 11, 'left');
  text(g, body, x + 10, y + 33, PAL.yellow, 14, 'left');
  if (extra) text(g, extra, x + 10, y + 49, PAL.white, 11, 'left');
}

// ---- The kicker, the landing ramp, the gauges ------------------------------------------------------------------------------------------------------------

/** The kicker: a dirt ramp from the ground up to its lip at (xLip, top), with a plank face. */
export function kicker(g: G, xLip: number, top: number, ground: number) {
  g.fillStyle = DIRT;
  g.beginPath();
  g.moveTo(0, ground);
  g.lineTo(xLip, top);
  g.lineTo(xLip, ground);
  g.closePath();
  g.fill();
  g.fillStyle = '#8a5f33';
  g.fillRect(xLip - 8, top, 8, ground - top);
  for (let y = top + 10; y < ground; y += 12) line(g, xLip - 8, y, xLip, y, '#5a3d20', 1.2);
  line(g, 0, ground, xLip, top, '#a67a48', 3);
}

/** The landing ramp whose flat top starts at xs: a short rise, a flat top 30 px wide with a checkered strip, then a slope of 60 px down. */
export function landingRamp(g: G, xs: number, top: number, ground: number) {
  g.fillStyle = DIRT;
  g.beginPath();
  g.moveTo(xs - 36, ground);
  g.lineTo(xs, top);
  g.lineTo(xs + 30, top);
  g.lineTo(xs + 90, ground);
  g.closePath();
  g.fill();
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? '#101018' : PAL.white;
    g.fillRect(xs + i * 5, top - 2, 5, 4);
  }
  line(g, xs - 36, ground, xs, top, '#a67a48', 3);
}

/** The spin gauge: a circular dial marked every 90 degrees, a needle at `deg`, a red tick at `targetDeg`, and the degrees underneath. */
export function spinGauge(g: G, cx: number, cy: number, r: number, deg: number, targetDeg: number) {
  g.fillStyle = 'rgba(8,12,40,0.9)';
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.6;
  g.stroke();
  const ang = (d: number) => (d * Math.PI) / 180 - Math.PI / 2;
  for (const d of [0, 90, 180, 270]) {
    line(g, cx + Math.cos(ang(d)) * (r - 7), cy + Math.sin(ang(d)) * (r - 7), cx + Math.cos(ang(d)) * r, cy + Math.sin(ang(d)) * r, PAL.dim, 2);
    text(g, String(d), cx + Math.cos(ang(d)) * (r - 17), cy + Math.sin(ang(d)) * (r - 17) + 4, PAL.dim, 11);
  }
  line(g, cx + Math.cos(ang(targetDeg)) * (r - 9), cy + Math.sin(ang(targetDeg)) * (r - 9), cx + Math.cos(ang(targetDeg)) * (r + 3), cy + Math.sin(ang(targetDeg)) * (r + 3), PAL.red, 3);
  line(g, cx, cy, cx + Math.cos(ang(deg)) * (r - 10), cy + Math.sin(ang(deg)) * (r - 10), PAL.yellow, 2.4);
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.arc(cx, cy, 3, 0, Math.PI * 2);
  g.fill();
  text(g, `${Math.round(deg)}°`, cx, cy + r + 13, PAL.yellow, 12);
  text(g, 'SPIN', cx, cy - r - 5, PAL.dim, 11);
}

/** The speedometer: a half dial from 0 to 220 km/h, a needle at `kmh`, a red mark at `target`, and the speed in digits. */
export function speedo(g: G, cx: number, cy: number, r: number, kmh: number, target: number) {
  g.fillStyle = 'rgba(8,12,40,0.9)';
  g.beginPath();
  g.arc(cx, cy, r, Math.PI, Math.PI * 2);
  g.closePath();
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.6;
  g.stroke();
  const ang = (v: number) => Math.PI + (Math.max(0, Math.min(220, v)) / 220) * Math.PI;
  for (const v of [0, 55, 110, 165, 220]) {
    line(g, cx + Math.cos(ang(v)) * (r - 6), cy + Math.sin(ang(v)) * (r - 6), cx + Math.cos(ang(v)) * r, cy + Math.sin(ang(v)) * r, PAL.dim, 2);
    text(g, String(v), cx + Math.cos(ang(v)) * (r - 17), cy + Math.sin(ang(v)) * (r - 17) + 4, PAL.dim, 11);
  }
  line(g, cx + Math.cos(ang(target)) * (r - 9), cy + Math.sin(ang(target)) * (r - 9), cx + Math.cos(ang(target)) * (r + 3), cy + Math.sin(ang(target)) * (r + 3), PAL.red, 3);
  line(g, cx, cy, cx + Math.cos(ang(kmh)) * (r - 8), cy + Math.sin(ang(kmh)) * (r - 8), PAL.yellow, 2.4);
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.arc(cx, cy, 3, 0, Math.PI * 2);
  g.fill();
  text(g, `${Math.round(kmh)} km/h`, cx, cy + 14, PAL.yellow, 12);
}

/** A checkered flag on a pole at (x, y) (the foot of the pole), waving. */
export function checkFlag(g: G, x: number, y: number, t: number) {
  line(g, x, y, x, y - 34, '#c9ceea', 2);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 ? '#101018' : PAL.white;
      g.fillRect(x + 1 + i * 5, y - 34 + j * 5 + Math.sin(t * 5 + i) * 1.2, 5, 5);
    }
  }
}
