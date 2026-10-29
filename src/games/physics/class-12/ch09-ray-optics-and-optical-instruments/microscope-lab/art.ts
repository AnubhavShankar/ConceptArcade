// Characters and props for the Microscope Lab.
import { PAL } from '@core/arcade';
import { glow, line, type Mood } from '@core/neon';

type G = CanvasRenderingContext2D;

/** Mite: a round bug with antennae and little legs, standing at (x, baseY) with body radius r. `flip` draws the inverted image. */
export function bug(g: G, x: number, baseY: number, r: number, t: number, mood: Mood = 'happy', flip = false, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, baseY);
  if (flip) g.scale(1, -1);
  const cy = -r - 3;
  g.strokeStyle = PAL.green;
  g.lineWidth = Math.max(1.5, r * 0.12);
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * r * 0.5, cy + r * 0.8);
    g.lineTo(s * r * 0.95, 0);
    g.stroke();
    g.beginPath();
    g.moveTo(s * r * 0.35, cy - r * 0.8);
    g.quadraticCurveTo(s * r * 0.7, cy - r * 1.6 + Math.sin(t * 6) * r * 0.1, s * r * 1.0, cy - r * 1.5);
    g.stroke();
  }
  glow(g, PAL.green, 10, () => {
    g.fillStyle = PAL.green;
    g.beginPath();
    g.arc(0, cy, r, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(-r * 0.35, cy - r * 0.15, r * 0.24, 0, Math.PI * 2);
  g.arc(r * 0.35, cy - r * 0.15, r * 0.24, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1b1030';
  g.beginPath();
  g.arc(-r * 0.3, cy - r * 0.12, r * 0.11, 0, Math.PI * 2);
  g.arc(r * 0.4, cy - r * 0.12, r * 0.11, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1b1030';
  g.lineWidth = Math.max(1, r * 0.08);
  g.beginPath();
  if (mood === 'worried' || mood === 'dizzy') g.arc(0, cy + r * 0.62, r * 0.28, Math.PI * 1.1, Math.PI * 1.9);
  else g.arc(0, cy + r * 0.2, r * 0.34, 0.1 * Math.PI, 0.9 * Math.PI);
  g.stroke();
  g.restore();
}

/** A simple convex lens icon, `half` px tall, centred at (x, y). */
export function lensIcon(g: G, x: number, y: number, half: number, color: string = PAL.cyan) {
  glow(g, color, 12, () => {
    g.fillStyle = 'rgba(77,225,255,0.18)';
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, y - half);
    g.quadraticCurveTo(x + half * 0.5, y, x, y + half);
    g.quadraticCurveTo(x - half * 0.5, y, x, y - half);
    g.closePath();
    g.fill();
    g.stroke();
  });
}

/** An eye looking left. */
export function eye(g: G, x: number, y: number, t: number, mood: Mood = 'happy') {
  g.fillStyle = '#fff';
  g.beginPath();
  g.ellipse(x, y, 20, 13, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = mood === 'worried' ? PAL.red : PAL.cyan;
  g.beginPath();
  g.arc(x - 7, y + Math.sin(t * 2) * 0.8, 7, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1b1030';
  g.beginPath();
  g.arc(x - 8, y + Math.sin(t * 2) * 0.8, 3, 0, Math.PI * 2);
  g.fill();
  line(g, x - 22, y - 16, x + 12, y - 18, PAL.dim, 2);
}

/** A horizontal "signal" meter, 0..1, with a label above it. */
export function meter(g: G, x: number, y: number, w: number, frac: number, color: string) {
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(x, y, w, 12);
  g.fillStyle = color;
  g.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 12);
  g.strokeStyle = PAL.dim;
  g.lineWidth = 1.5;
  g.strokeRect(x, y, w, 12);
}
