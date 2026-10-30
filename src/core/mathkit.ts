// Small shared pieces for the mathematics games: the night backdrop, the handle track along the bottom, a box, and a few
// drawing parts. Rules stay in each game's logic.ts; this file only draws and maps dial positions.
import { PAL } from './arcade';
import type { HandleSpec } from './dialgame';
import { line, text } from './neon';

type G = CanvasRenderingContext2D;
export const TRACK = { x0: 60, x1: 580, y: 322 };

/** The dark game screen shared by the maths games. */
export function backdrop(g: G) {
  g.fillStyle = '#060a24';
  g.fillRect(0, 0, 640, 340);
  g.fillStyle = 'rgba(40,50,140,0.3)';
  g.fillRect(0, 180, 640, 160);
  for (let i = 0; i < 16; i++) line(g, i * 40, 0, i * 40, 340, PAL.grid, 1);
}

/** The slider track at the bottom of the screen with its end labels. */
export function track(g: G, lo: number, hi: number) {
  line(g, TRACK.x0, TRACK.y, TRACK.x1, TRACK.y, PAL.dim, 3);
  text(g, String(lo), TRACK.x0, TRACK.y + 16, PAL.dim, 10);
  text(g, String(hi), TRACK.x1, TRACK.y + 16, PAL.dim, 10);
}

/** A draggable handle on the bottom track for one dial whose range follows the round. */
export function trackHandle<R>(key: string, lo: (r: R) => number, hi: (r: R) => number, y = TRACK.y): HandleSpec<R> {
  const span = TRACK.x1 - TRACK.x0;
  return {
    dial: key,
    at: (r, v) => [TRACK.x0 + ((v[key] - lo(r)) / (hi(r) - lo(r))) * span, y],
    drag: (r, px) => lo(r) + ((px - TRACK.x0) / span) * (hi(r) - lo(r)),
    radius: 20,
  };
}

/** A box seen from the front-left: (x, y) is the front bottom-left corner, w by d on the floor, h tall. */
export function cuboid(g: G, x: number, y: number, w: number, d: number, h: number, col: string, open: boolean) {
  const ox = d * 0.5;
  const oy = d * 0.35;
  g.fillStyle = col;
  g.fillRect(x, y - h, w, h);
  g.fillStyle = '#1d2556';
  g.beginPath();
  g.moveTo(x + w, y - h);
  g.lineTo(x + w + ox, y - h - oy);
  g.lineTo(x + w + ox, y - oy);
  g.lineTo(x + w, y);
  g.fill();
  g.fillStyle = open ? '#0a1030' : '#3a4590';
  g.beginPath();
  g.moveTo(x, y - h);
  g.lineTo(x + ox, y - h - oy);
  g.lineTo(x + w + ox, y - h - oy);
  g.lineTo(x + w, y - h);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.2;
  g.strokeRect(x, y - h, w, h);
}

/** A toothed gear turning at `angle` radians. */
export function gear(g: G, x: number, y: number, r: number, teeth: number, angle: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = angle + (i * Math.PI) / teeth;
    const rr = i % 2 ? r * 0.82 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.fill();
  g.fillStyle = '#060a24';
  g.beginPath();
  g.arc(x, y, r * 0.28, 0, Math.PI * 2);
  g.fill();
  line(g, x, y, x + Math.cos(angle) * r * 0.75, y + Math.sin(angle) * r * 0.75, '#060a24', 2);
}

/** Eyes and a mouth for a character head centred at (x, y), radius R, in the given mood. */
export function face(g: G, x: number, y: number, R: number, mood: 'happy' | 'worried' | 'cheer', t: number, color = '#1b1030') {
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineWidth = 1.6;
  if (mood === 'cheer') {
    g.beginPath();
    g.arc(x - R * 0.38, y - R * 0.05, R * 0.17, Math.PI, 2 * Math.PI);
    g.arc(x + R * 0.38, y - R * 0.05, R * 0.17, Math.PI, 2 * Math.PI);
    g.stroke();
    g.beginPath();
    g.arc(x, y + R * 0.2, R * 0.38, 0.1 * Math.PI, 0.9 * Math.PI);
    g.stroke();
    return;
  }
  const blink = Math.sin(t * 1.3) > 0.97 ? 0.3 : 1;
  g.beginPath();
  g.ellipse(x - R * 0.38, y - R * 0.05, R * 0.15, R * 0.15 * blink, 0, 0, Math.PI * 2);
  g.ellipse(x + R * 0.38, y - R * 0.05, R * 0.15, R * 0.15 * blink, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  if (mood === 'worried') g.arc(x, y + R * 0.68, R * 0.3, 1.15 * Math.PI, 1.85 * Math.PI);
  else {
    g.moveTo(x - R * 0.25, y + R * 0.4);
    g.lineTo(x + R * 0.25, y + R * 0.4);
  }
  g.stroke();
  if (mood === 'worried') {
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.arc(x - R * 0.95, y + ((t * 18) % 6), R * 0.15, 0, Math.PI * 2);
    g.fill();
  }
}

/** The verdict line shown at the top once a shot has landed. */
export function verdict(g: G, ok: boolean, good: string, bad: string) {
  const c = ok ? PAL.green : PAL.red;
  g.shadowColor = c;
  g.shadowBlur = 12;
  text(g, ok ? good : bad, 320, 22, c, 17);
  g.shadowBlur = 0;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
/** k steps of π/12 written the textbook way: −π/6, 2π/3, π. */
export function piText(k: number): string {
  if (k === 0) return '0';
  const a = Math.abs(k);
  const g = gcd(a, 12);
  const n = a / g;
  const d = 12 / g;
  return `${k < 0 ? '−' : ''}${n === 1 ? '' : n}π${d === 1 ? '' : `/${d}`}`;
}

/** A number with a true minus sign, for matrices and coordinates. */
export const num = (x: number) => (x < 0 ? `−${Math.abs(Math.round(x * 100) / 100)}` : String(Math.round(x * 100) / 100));

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶'];
/** A polynomial from terms [coefficient, power], highest power first, written the textbook way with a true minus sign. */
export function poly(ts: [number, number][], v = 't'): string {
  const parts: string[] = [];
  for (const [c, p] of ts) {
    if (c === 0) continue;
    const body = p === 0 ? String(Math.abs(c)) : `${Math.abs(c) === 1 ? '' : Math.abs(c)}${v}${p === 1 ? '' : SUP[p]}`;
    parts.push(parts.length === 0 ? `${c < 0 ? '−' : ''}${body}` : `${c < 0 ? '−' : '+'} ${body}`);
  }
  return parts.join(' ') || '0';
}
