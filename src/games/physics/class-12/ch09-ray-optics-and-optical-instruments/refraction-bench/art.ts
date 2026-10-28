// Characters and props for the Refraction Arcade.
import { PAL } from '@core/arcade';
import { glow, type Mood } from '@core/neon';

type G = CanvasRenderingContext2D;

/** A pin with a face: a round head on a needle that stands on the ground at (x, baseY). */
export function pinCharacter(g: G, x: number, baseY: number, h: number, t: number, mood: Mood = 'happy') {
  g.strokeStyle = PAL.white;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x, baseY);
  g.lineTo(x, baseY - h);
  g.stroke();
  const hy = baseY - h - 8;
  const r = 9 + Math.sin(t * 4) * 0.4;
  glow(g, PAL.pink, 10, () => {
    g.fillStyle = PAL.pink;
    g.beginPath();
    g.arc(x, hy, r, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(x - 3.5, hy - 2, 2.6, 0, Math.PI * 2);
  g.arc(x + 3.5, hy - 2, 2.6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1b1030';
  g.beginPath();
  g.arc(x - 3.2, hy - 1.6, 1.2, 0, Math.PI * 2);
  g.arc(x + 3.8, hy - 1.6, 1.2, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1b1030';
  g.lineWidth = 1.5;
  g.beginPath();
  if (mood === 'worried' || mood === 'dizzy') g.arc(x, hy + 6, 3, Math.PI * 1.1, Math.PI * 1.9);
  else g.arc(x, hy + 2, 3.4, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
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
