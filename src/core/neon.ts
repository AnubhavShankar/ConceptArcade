// Drawing helpers shared by the arcade games: glowing lines and text, a polyline tracer, and a generic orb character.
import { PAL } from './arcade';

type G = CanvasRenderingContext2D;
export type Mood = 'happy' | 'worried' | 'cheer' | 'dizzy';

export function glow(g: G, color: string, blur: number, fn: () => void) {
  g.save();
  g.shadowColor = color;
  g.shadowBlur = blur;
  fn();
  g.restore();
}

export function line(g: G, x1: number, y1: number, x2: number, y2: number, color: string, w = 2, dash: number[] = []) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.setLineDash(dash);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
  g.setLineDash([]);
}

export function text(g: G, s: string, x: number, y: number, color: string = PAL.dim, size = 12, align: CanvasTextAlign = 'center', bold = true) {
  g.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  g.textAlign = align;
  g.fillStyle = color;
  g.fillText(s, x, y);
}

/** Draw the first fraction f of a polyline as a glowing beam. */
export function trace(g: G, pts: [number, number][], f: number, color: string, w = 2.5) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let left = total * Math.max(0, Math.min(1, f));
  glow(g, color, 8, () => {
    g.strokeStyle = color;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const k = Math.min(1, left / len);
      g.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k);
      left -= len;
    }
    g.stroke();
  });
}

/** The point a fraction f of the way along a polyline (for a hero travelling a path). */
export function along(pts: [number, number][], f: number): [number, number] {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let left = total * Math.max(0, Math.min(1, f));
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (left <= len || i === pts.length - 1) {
      const k = len === 0 ? 0 : Math.min(1, left / len);
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    }
    left -= len;
  }
  return pts[pts.length - 1];
}

/** A glowing orb with a face: a photon, a lamp, a spark. `t` makes it breathe. */
export function orb(g: G, x: number, y: number, r: number, color: string, t: number, mood: Mood = 'happy') {
  const breathe = 1 + Math.sin(t * 5) * 0.06;
  const R = r * breathe;
  glow(g, color, 16, () => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, R, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(x - R * 0.35, y - R * 0.15, R * 0.24, 0, Math.PI * 2);
  g.arc(x + R * 0.35, y - R * 0.15, R * 0.24, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1b1030';
  g.beginPath();
  g.arc(x - R * 0.3, y - R * 0.12, R * 0.11, 0, Math.PI * 2);
  g.arc(x + R * 0.4, y - R * 0.12, R * 0.11, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1b1030';
  g.lineWidth = Math.max(1.5, R * 0.08);
  g.beginPath();
  if (mood === 'worried' || mood === 'dizzy') g.arc(x, y + R * 0.62, R * 0.28, Math.PI * 1.1, Math.PI * 1.9);
  else if (mood === 'cheer') g.arc(x, y + R * 0.2, R * 0.38, 0.05 * Math.PI, 0.95 * Math.PI);
  else g.arc(x, y + R * 0.25, R * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
}
