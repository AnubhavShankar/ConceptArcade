// Rover's body, shared by the five levels of Rover Ridge.
import { PAL } from '@core/arcade';
import { face } from '@core/mathkit';
import { line } from '@core/neon';

type G = CanvasRenderingContext2D;
export type Mood = 'happy' | 'worried' | 'cheer';

/** Rover: a six-wheeled mining rover with a camera head on a mast, a dish and a drill that spins. */
export function rover(g: G, x: number, y: number, t: number, mood: Mood, driving: boolean) {
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(x, y + 12, 18, 3.5, 0, 0, Math.PI * 2);
  g.fill();
  for (const wx of [-12, 0, 12]) {
    g.strokeStyle = PAL.dim;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x + wx, y + 7, 5, 0, Math.PI * 2);
    g.stroke();
    const a = driving ? t * 14 : 0;
    line(g, x + wx, y + 7, x + wx + Math.cos(a) * 5, y + 7 + Math.sin(a) * 5, PAL.dim, 1.5);
  }
  g.fillStyle = PAL.orange;
  g.fillRect(x - 17, y - 8, 34, 12);
  g.fillStyle = PAL.cyan;
  g.fillRect(x - 17, y - 11, 22, 3);
  line(g, x + 8, y - 8, x + 8, y - 24, PAL.dim, 2.5);
  g.fillStyle = '#d8e4ff';
  g.beginPath();
  g.arc(x + 8, y - 28, 8, 0, Math.PI * 2);
  g.fill();
  face(g, x + 8, y - 28, 6, mood, t, '#1b1030');
  line(g, x - 12, y - 8, x - 12, y - 18, PAL.dim, 2);
  g.strokeStyle = PAL.pink;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x - 12, y - 18, 6, Math.PI, 2 * Math.PI);
  g.stroke();
  // The drill at the front
  const d = Math.sin(t * (driving ? 40 : 6)) * 2;
  line(g, x + 17, y - 2, x + 25, y - 2 + d, PAL.yellow, 3);
}
