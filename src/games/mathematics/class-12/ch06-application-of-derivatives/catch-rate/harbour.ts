// Drawing for Catch Rate level 4 (running costs): a night harbour, a lifeboat, a fuel dial, a donation jar, a volunteer queue and an alarm.
// Pure drawing: the fill of a meter is decided by index.ts from logic.ts, and a miss shows only which side of the target line the rate landed on.
import { PAL } from '@core/arcade';
import { line, text } from '@core/neon';

type G = CanvasRenderingContext2D;
/** Where the target line sits on a meter (0 empty, 1 full scale), and where the rim of the jar is. */
export const TARGET = 0.7;
export const RIM = 0.92;

/** Moon, twinkling stars and a rolling waterline. */
export function night(g: G, clock: number) {
  g.fillStyle = 'rgba(255,240,200,0.9)';
  g.beginPath();
  g.arc(596, 84, 14, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#060a24';
  g.beginPath();
  g.arc(602, 80, 12, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 6; i++) {
    g.globalAlpha = 0.35 + 0.35 * Math.sin(clock * 2 + i * 1.7);
    g.fillStyle = PAL.white;
    g.fillRect(270 + i * 56, 74 + ((i * 37) % 40), 2, 2);
  }
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(60,110,200,0.35)';
  g.fillRect(250, 222, 380, 40);
  for (let i = 0; i < 9; i++) {
    const x0 = 256 + i * 42;
    const ph = clock * 1.6 + i;
    line(g, x0, 232 + Math.sin(ph) * 2, x0 + 20, 232 - Math.sin(ph) * 2, 'rgba(150,200,255,0.5)', 2);
  }
}

/** The lifeboat: orange hull with a stripe, a cabin with a lit window, a life ring, a mast light and a wake that grows with the throttle. */
export function lifeboat(g: G, x: number, y: number, clock: number, throttle: number, size = 1) {
  const bob = Math.sin(clock * 2.1) * 2;
  g.save();
  g.translate(x, y + bob);
  g.scale(size, size);
  for (let i = 0; i < 4; i++) {
    g.globalAlpha = Math.max(0, 0.6 - i * 0.14) * throttle;
    line(g, -64 - i * 12, 20 + (i % 2) * 3, -78 - i * 12, 20 + (i % 2) * 3, PAL.white, 3);
  }
  g.globalAlpha = 1;
  g.fillStyle = PAL.orange;
  g.beginPath();
  g.moveTo(-62, 0);
  g.lineTo(62, 0);
  g.lineTo(46, 24);
  g.lineTo(-48, 24);
  g.closePath();
  g.fill();
  g.fillStyle = PAL.white;
  g.fillRect(-56, 8, 108, 4);
  g.fillStyle = '#d9e4ff';
  g.fillRect(-12, -26, 36, 26);
  g.fillStyle = PAL.yellow;
  g.fillRect(-6, -20, 10, 10);
  g.fillRect(8, -20, 10, 10);
  g.strokeStyle = PAL.red;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(-34, -6, 9, 0, Math.PI * 2);
  g.stroke();
  line(g, 6, -26, 6, -44, PAL.dim, 2);
  g.fillStyle = Math.sin(clock * 5) > 0 ? PAL.yellow : PAL.orange;
  g.beginPath();
  g.arc(6, -46, 3.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** A fuel dial (⛽): the needle sweeps from empty to full scale, a tick marks the target, and a red zone sits at the end. */
export function fuelDial(g: G, cx: number, cy: number, r: number, frac: number, clock: number) {
  g.fillStyle = '#26305f';
  g.beginPath();
  g.arc(cx, cy, r + 6, Math.PI, 2 * Math.PI);
  g.closePath();
  g.fill();
  g.strokeStyle = PAL.dim;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, r, Math.PI, 2 * Math.PI);
  g.stroke();
  g.strokeStyle = PAL.red;
  g.lineWidth = 5;
  g.beginPath();
  g.arc(cx, cy, r - 7, Math.PI * (1 + RIM), 2 * Math.PI);
  g.stroke();
  const tk = Math.PI * (1 + TARGET);
  line(g, cx + Math.cos(tk) * (r - 12), cy + Math.sin(tk) * (r - 12), cx + Math.cos(tk) * (r + 8), cy + Math.sin(tk) * (r + 8), PAL.yellow, 3);
  const a = Math.PI * (1 + Math.min(1, Math.max(0, frac))) + Math.sin(clock * 11) * 0.01 * frac;
  line(g, cx, cy, cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4), PAL.cyan, 3);
  g.fillStyle = PAL.cyan;
  g.beginPath();
  g.arc(cx, cy, 5, 0, Math.PI * 2);
  g.fill();
  text(g, '⛽ fuel cost', cx, cy + 20, PAL.white, 11);
}

/** A glass jar filling with coins (revenue) or a net-funds meter (profit): a target line, a rim, and coins spilling over when it overflows. */
export function jar(g: G, x: number, bottom: number, frac: number, clock: number, label: string) {
  const w = 64;
  const h = 110;
  const level = Math.min(1.02, Math.max(0, frac)) * h;
  g.fillStyle = 'rgba(255,210,63,0.75)';
  g.fillRect(x - w / 2 + 3, bottom - level, w - 6, level);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i * 9 < level - 4; i++) g.fillRect(x - w / 2 + 6 + ((i * 17) % 40), bottom - 6 - i * 9, 14, 3);
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 3;
  g.strokeRect(x - w / 2, bottom - h * RIM, w, h * RIM);
  line(g, x - w / 2 - 10, bottom - h * TARGET, x + w / 2 + 10, bottom - h * TARGET, PAL.yellow, 2, [5, 4]);
  text(g, 'target', x + w / 2 + 28, bottom - h * TARGET, PAL.yellow, 11);
  text(g, label, x, bottom + 14, PAL.white, 11);
  if (frac > RIM) {
    for (let i = 0; i < 4; i++) {
      const u = (clock * 1.4 + i / 4) % 1;
      g.fillStyle = PAL.yellow;
      g.beginPath();
      g.arc(x + (i % 2 ? 1 : -1) * (w / 2 + u * 14), bottom - h * RIM + u * u * 60, 4, 0, Math.PI * 2);
      g.fill();
    }
  }
}

/** Three volunteers in hi-vis vests in a queue; each tosses coins towards the jar, faster when the queue rate is set higher. */
export function queue(g: G, x: number, floor: number, clock: number, w: number, jarX: number) {
  for (let i = 0; i < 3; i++) {
    const px = x + i * 34;
    const hop = Math.abs(Math.sin(clock * 3 + i * 1.3)) * 3;
    g.fillStyle = '#3a4a7a';
    g.fillRect(px - 6, floor - 22 - hop, 12, 22);
    g.fillStyle = PAL.orange;
    g.fillRect(px - 8, floor - 42 - hop, 16, 22);
    g.fillStyle = '#f2c9a0';
    g.beginPath();
    g.arc(px, floor - 50 - hop, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = PAL.yellow;
    g.beginPath();
    g.arc(px, floor - 52 - hop, 8.5, Math.PI, 2 * Math.PI);
    g.fill();
  }
  const rate = 0.35 + (w / 12) * 1.1;
  for (let i = 0; i < 5; i++) {
    const u = (clock * rate + i / 5) % 1;
    g.fillStyle = PAL.yellow;
    g.beginPath();
    g.arc(x + 70 + (jarX - x - 80) * u, floor - 60 - Math.sin(u * Math.PI) * 44, 4, 0, Math.PI * 2);
    g.fill();
  }
}

/** A flashing alarm lamp with a symbol and a word, for an overflow. */
export function alarm(g: G, x: number, y: number, clock: number) {
  const on = Math.sin(clock * 14) > 0;
  g.fillStyle = on ? PAL.red : '#5a1a2a';
  g.beginPath();
  g.arc(x, y, 9, Math.PI, 2 * Math.PI);
  g.fill();
  g.fillRect(x - 9, y, 18, 4);
  if (on) for (let i = -2; i <= 2; i++) line(g, x + i * 6, y - 12, x + i * 11, y - 22, PAL.red, 2);
  text(g, '⚠ OVERFLOW', x, y + 18, PAL.red, 11);
}
