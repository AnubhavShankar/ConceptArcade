// Characters and props for the Mirror Arcade, drawn in a neon arcade style on the dark game screen.
import { PAL } from '@core/arcade';
import { glow, line, text, type Mood } from '@core/neon';

export { glow, line, text, type Mood };

type G = CanvasRenderingContext2D;
/** The ruler under the axis, in cm from the mirror pole. */
export function ruler(g: G, x0: number, y: number, sc: number, maxCm: number, dir = 1) {
  line(g, x0, y, x0 + dir * maxCm * sc, y, PAL.dim, 1.5);
  for (let c = 0; c <= maxCm; c += 5) {
    const x = x0 + dir * c * sc;
    line(g, x, y, x, y + (c % 10 === 0 ? 8 : 4), PAL.dim, 1.5);
    if (c % 10 === 0) text(g, String(c), x, y + 21, PAL.dim, 10);
  }
  text(g, 'cm from the mirror', x0 + dir * maxCm * sc * 0.5, y + 36, PAL.dim, 10);
}

/** The mirror: a bright curve with a hatched back. */
export function mirror(g: G, x0: number, ax: number, concave: boolean, half = 90) {
  glow(g, PAL.cyan, 14, () => {
    g.strokeStyle = PAL.white;
    g.lineWidth = 5;
    g.beginPath();
    if (concave) {
      g.moveTo(x0 + 16, ax - half);
      g.quadraticCurveTo(x0 - 16, ax, x0 + 16, ax + half);
    } else {
      g.moveTo(x0 - 16, ax - half);
      g.quadraticCurveTo(x0 + 16, ax, x0 - 16, ax + half);
    }
    g.stroke();
  });
  // hatching on the back (the left side) of the curve
  for (let i = -half + 10; i < half; i += 14) {
    const cx = x0 + (concave ? 1 : -1) * 16 * (i / half) ** 2;
    line(g, cx - 4, ax + i, cx - 12, ax + i + 8, PAL.dim, 1);
  }
}

/** Flicker: a flame with a face. `flip` draws the inverted image; `ghost` makes it translucent. */
export function flame(g: G, x: number, baseY: number, hpx: number, t: number, mood: Mood = 'happy', flip = false, alpha = 1) {
  const s = flip ? -1 : 1;
  const w = Math.max(6, Math.abs(hpx) * 0.36);
  const wob = Math.sin(t * 8 + x) * 0.06;
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, baseY);
  g.scale(1, s * (hpx < 0 ? -1 : 1));
  const H = Math.abs(hpx);
  glow(g, PAL.orange, 18, () => {
    const grad = g.createLinearGradient?.(0, 0, 0, -H);
    if (grad) {
      grad.addColorStop(0, PAL.orange);
      grad.addColorStop(1, PAL.yellow);
      g.fillStyle = grad;
    } else g.fillStyle = PAL.orange;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-w * 1.5, -H * 0.1, -w * 1.1, -H * 0.55, wob * H, -H);
    g.bezierCurveTo(w * 1.1, -H * 0.55, w * 1.5, -H * 0.1, 0, 0);
    g.fill();
  });
  // face
  const ey = -H * 0.38;
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(-w * 0.38, ey, Math.max(2, w * 0.26), 0, Math.PI * 2);
  g.arc(w * 0.38, ey, Math.max(2, w * 0.26), 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1b1030';
  g.beginPath();
  g.arc(-w * 0.34, ey + 1, Math.max(1, w * 0.12), 0, Math.PI * 2);
  g.arc(w * 0.42, ey + 1, Math.max(1, w * 0.12), 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1b1030';
  g.lineWidth = 2;
  g.beginPath();
  const my = -H * 0.2;
  if (mood === 'worried' || mood === 'dizzy') g.arc(0, my + w * 0.3, w * 0.28, Math.PI * 1.1, Math.PI * 1.9);
  else g.arc(0, my - w * 0.1, w * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  g.restore();
}

/** Dash: a toy car seen from the side, facing left. */
export function car(g: G, x: number, y: number, k: number, t: number, mood: Mood = 'happy') {
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  glow(g, PAL.pink, 10, () => {
    g.fillStyle = PAL.pink;
    g.beginPath();
    g.roundRect?.(-34, -22, 68, 22, 8);
    if (!g.roundRect) g.rect(-34, -22, 68, 22);
    g.fill();
    g.fillStyle = '#ff86b3';
    g.beginPath();
    g.moveTo(-16, -22);
    g.lineTo(-8, -38);
    g.lineTo(16, -38);
    g.lineTo(26, -22);
    g.closePath();
    g.fill();
  });
  g.fillStyle = PAL.white;
  g.beginPath();
  g.arc(-6, -29, 4, 0, Math.PI * 2);
  g.arc(10, -29, 4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1b1030';
  g.beginPath();
  g.arc(-7, -29, 1.8, 0, Math.PI * 2);
  g.arc(9, -29, 1.8, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1b1030';
  g.lineWidth = 1.5;
  g.beginPath();
  if (mood === 'worried' || mood === 'dizzy') g.arc(2, -22, 4, Math.PI * 1.15, Math.PI * 1.85);
  else g.arc(2, -27, 4, 0.2 * Math.PI, 0.8 * Math.PI);
  g.stroke();
  g.fillStyle = PAL.yellow;
  g.fillRect(-36, -16, 5, 6);
  for (const wx of [-20, 20]) {
    g.fillStyle = '#10143a';
    g.beginPath();
    g.arc(wx, 0, 8, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = PAL.white;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(wx, 0);
    g.lineTo(wx + Math.cos(t * 12) * 6, Math.sin(t * 12) * 6);
    g.stroke();
  }
  g.restore();
}

/** Zoya’s face: a round face with hair. `r` is the radius in px. */
export function face(g: G, x: number, y: number, r: number, mood: Mood = 'happy', flip = false, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y);
  if (flip) g.scale(1, -1);
  glow(g, PAL.yellow, 10, () => {
    g.fillStyle = '#ffcf99';
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = '#3a2556';
  g.beginPath();
  g.arc(0, -r * 0.1, r * 1.04, Math.PI * 1.02, Math.PI * 1.98);
  g.lineTo(r * 0.8, -r * 0.35);
  g.lineTo(-r * 0.8, -r * 0.35);
  g.closePath();
  g.fill();
  g.fillStyle = '#1b1030';
  g.beginPath();
  g.arc(-r * 0.36, -r * 0.08, Math.max(1.5, r * 0.1), 0, Math.PI * 2);
  g.arc(r * 0.36, -r * 0.08, Math.max(1.5, r * 0.1), 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1b1030';
  g.lineWidth = Math.max(1.5, r * 0.06);
  g.beginPath();
  if (mood === 'dizzy' || mood === 'worried') g.arc(0, r * 0.55, r * 0.25, Math.PI * 1.1, Math.PI * 1.9);
  else g.arc(0, r * 0.25, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  g.restore();
}

/** A bullseye target. */
export function target(g: G, x: number, y: number, r: number, hit: boolean, t: number) {
  glow(g, hit ? PAL.green : PAL.red, 14, () => {
    for (let i = 3; i >= 1; i--) {
      g.fillStyle = i % 2 ? (hit ? PAL.green : PAL.red) : PAL.white;
      g.beginPath();
      g.arc(x, y, (r * i) / 3 + (hit ? Math.sin(t * 10) * 1.5 : 0), 0, Math.PI * 2);
      g.fill();
    }
  });
}
