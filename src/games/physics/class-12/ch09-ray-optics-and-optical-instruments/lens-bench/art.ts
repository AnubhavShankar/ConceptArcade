// Characters and props for the Lens Workshop.
import { PAL } from '@core/arcade';
import { glow, line, type Mood } from '@core/neon';

type G = CanvasRenderingContext2D;

/**
 * A thin lens seen from the side at (x, ax). `f` > 0 draws a converging lens (bulging, arrows pointing out),
 * `f` < 0 a diverging one (pinched, arrows pointing in). `alpha` fades it out (the vanishing trick).
 */
export function lens(g: G, x: number, ax: number, f: number, half = 78, alpha = 1, color: string = PAL.cyan) {
  const mag = Number.isFinite(f) ? Math.max(3, Math.min(20, 400 / Math.max(10, Math.abs(f)) + 4)) : 8;
  const bulge = mag * (f >= 0 ? 1 : -1);
  g.save();
  g.globalAlpha = alpha;
  glow(g, color, 12, () => {
    g.fillStyle = 'rgba(77,225,255,0.16)';
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, ax - half);
    g.quadraticCurveTo(x + bulge * 2, ax, x, ax + half);
    g.quadraticCurveTo(x - bulge * 2, ax, x, ax - half);
    g.closePath();
    g.fill();
    g.stroke();
  });
  g.fillStyle = color;
  for (const s of [-1, 1]) {
    const base = ax + s * (half + (f >= 0 ? 4 : 12));
    const apex = ax + s * (half + (f >= 0 ? 12 : 4));
    g.beginPath();
    g.moveTo(x, apex);
    g.lineTo(x - 6, base);
    g.lineTo(x + 6, base);
    g.closePath();
    g.fill();
  }
  g.restore();
}

/** A camera sensor with a face: a tall rectangle standing on the axis at x. */
export function sensor(g: G, x: number, ax: number, t: number, mood: Mood = 'happy') {
  glow(g, PAL.green, 10, () => {
    g.fillStyle = '#2b3a7a';
    g.strokeStyle = PAL.green;
    g.lineWidth = 3;
    g.fillRect(x - 11, ax - 46, 22, 92);
    g.strokeRect(x - 11, ax - 46, 22, 92);
  });
  const wob = Math.sin(t * 3) * 0.6;
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(x - 4, ax - 14 + wob, 3.5, 0, Math.PI * 2);
  g.arc(x + 4, ax - 14 + wob, 3.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1b1030';
  g.beginPath();
  g.arc(x - 4, ax - 14, 1.5, 0, Math.PI * 2);
  g.arc(x + 4, ax - 14, 1.5, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#fff';
  g.lineWidth = 1.6;
  g.beginPath();
  if (mood === 'worried' || mood === 'dizzy') g.arc(x, ax + 6, 4, Math.PI * 1.1, Math.PI * 1.9);
  else g.arc(x, ax - 2, 4.5, 0.1 * Math.PI, 0.9 * Math.PI);
  g.stroke();
}

/** A slide in a frame with a little face on the picture. `h` is its height in px; `flip` draws the inverted image. */
export function slide(g: G, x: number, ax: number, h: number, t: number, mood: Mood = 'happy', flip = false, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, ax);
  if (flip) g.scale(1, -1);
  const w = Math.max(10, h * 0.7);
  glow(g, PAL.yellow, 10, () => {
    g.fillStyle = PAL.yellow;
    g.fillRect(-w / 2, -h, w, h);
  });
  g.fillStyle = '#2b2150';
  g.fillRect(-w / 2 + 3, -h + 3, w - 6, h - 6);
  const r = Math.max(3, Math.min(w, h) * 0.22);
  g.fillStyle = PAL.pink;
  g.beginPath();
  g.arc(0, -h * 0.55, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(-r * 0.4, -h * 0.58, r * 0.22, 0, Math.PI * 2);
  g.arc(r * 0.4, -h * 0.58, r * 0.22, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#fff';
  g.lineWidth = Math.max(1, r * 0.1);
  g.beginPath();
  if (mood === 'worried' || mood === 'dizzy') g.arc(0, -h * 0.45, r * 0.4, Math.PI * 1.1, Math.PI * 1.9);
  else g.arc(0, -h * 0.5 + Math.sin(t * 2) * 0.4, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  g.restore();
}

/**
 * Parallel rays from the left through a thin lens of focal length f at x (sc px per cm), drawn out to xEnd:
 * converging rays pass through the focus, diverging rays spread (with dashed lines back to the virtual focus),
 * and an infinite focal length leaves them straight.
 */
export function parallelRays(g: G, x: number, ax: number, f: number, sc: number, xEnd: number, color: string) {
  for (const k of [-48, -32, -16, 16, 32, 48]) {
    line(g, 10, ax + k, x, ax + k, color, 1.6);
    if (!Number.isFinite(f) || Math.abs(f) > 4000) {
      line(g, x, ax + k, xEnd, ax + k, color, 1.6);
    } else if (f > 0) {
      const slope = -k / (f * sc);
      line(g, x, ax + k, xEnd, ax + k + slope * (xEnd - x), color, 1.6);
    } else {
      const slope = k / (Math.abs(f) * sc);
      line(g, x, ax + k, xEnd, ax + k + slope * (xEnd - x), color, 1.6);
      line(g, x, ax + k, x - Math.abs(f) * sc, ax, color, 1, [3, 4]);
    }
  }
}
