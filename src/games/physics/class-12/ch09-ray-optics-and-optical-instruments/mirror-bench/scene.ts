// Drawing for the Mirror Bench: the axis, the mirror, the object and the principal rays. Heights are drawn
// exaggerated against distances (a vertical scale `vs` px per cm), which keeps every straight ray straight.
import type { Theme } from '@core/draw';
import { label } from '@core/draw';
import { imageV } from './logic';

export const AX = 150;

export function arrow(g: CanvasRenderingContext2D, x: number, hpx: number, color: string, width = 3, dashed = false) {
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = width;
  g.setLineDash(dashed ? [5, 4] : []);
  g.beginPath();
  g.moveTo(x, AX);
  g.lineTo(x, AX - hpx);
  g.stroke();
  g.setLineDash([]);
  const s = hpx >= 0 ? 1 : -1;
  g.beginPath();
  g.moveTo(x, AX - hpx);
  g.lineTo(x - 5, AX - hpx + 9 * s);
  g.lineTo(x + 5, AX - hpx + 9 * s);
  g.closePath();
  g.fill();
}

function line(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, dashed = false, width = 1.6) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.setLineDash(dashed ? [5, 4] : []);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
  g.setLineDash([]);
}

export interface Bench {
  x0: number;
  sc: number;
  vs: number;
  concave: boolean;
  F: number;
  d: number;
  objH: number;
}

/** The mirror, the axis, F (and C for a concave mirror) and the object. */
export function drawBench(g: CanvasRenderingContext2D, col: Theme, b: Bench, W: number) {
  line(g, 10, AX, W - 10, AX, col.line);
  g.strokeStyle = col.text;
  g.lineWidth = 4;
  g.beginPath();
  if (b.concave) {
    g.moveTo(b.x0 + 14, AX - 100);
    g.quadraticCurveTo(b.x0 - 14, AX, b.x0 + 14, AX + 100);
  } else {
    g.moveTo(b.x0 - 14, AX - 100);
    g.quadraticCurveTo(b.x0 + 14, AX, b.x0 - 14, AX + 100);
  }
  g.stroke();
  const xF = b.x0 + (b.concave ? b.F : -b.F) * b.sc;
  const xC = b.x0 + (b.concave ? 2 * b.F : -2 * b.F) * b.sc;
  for (const [x, t] of [[xF, 'F'], [xC, 'C']] as [number, string][]) {
    if (x > 8 && x < W - 8) {
      line(g, x, AX - 5, x, AX + 5, col.muted, false, 2);
      label(g, t, x, AX + 20, { size: 12, color: col.muted });
    }
  }
  label(g, 'P', b.x0 + (b.concave ? 14 : -4), AX + 20, { size: 12, color: col.muted });
  arrow(g, b.x0 + b.d * b.sc, b.objH * b.vs, col.accent, 4);
  label(g, 'object', b.x0 + b.d * b.sc, AX + 40, { size: 11, color: col.muted });
}

/** The two principal rays and the image they make. `alpha` fades them in. */
export function drawRays(g: CanvasRenderingContext2D, col: Theme, b: Bench, W: number, alpha: number, imageColor: string) {
  const f = b.concave ? -b.F : b.F;
  const v = imageV(f, -b.d);
  const xo = b.x0 + b.d * b.sc;
  const yo = AX - b.objH * b.vs;
  const xF = b.x0 + (b.concave ? b.F : -b.F) * b.sc;
  const xEnd = W - 12;
  g.globalAlpha = alpha;
  // parallel ray: in along the axis direction, out through F
  line(g, xo, yo, b.x0, yo, col.accent);
  const dx = xF - b.x0;
  const dy = AX - yo;
  const k = (xEnd - b.x0) / Math.abs(dx);
  line(g, b.x0, yo, b.x0 + Math.abs(dx) * k, yo + dy * Math.sign(dx) * k, col.accent);
  // focal ray: toward F, out parallel to the axis
  if (Math.abs(xF - xo) > 1e-6) {
    const ym = yo + ((AX - yo) * (b.x0 - xo)) / (xF - xo);
    line(g, xo, yo, b.x0, ym, col.good);
    line(g, b.x0, ym, xEnd, ym, col.good);
  }
  if (Number.isFinite(v)) {
    const di = -v;
    const xi = b.x0 + di * b.sc;
    const m = -v / -b.d;
    const hi = Math.max(-130, Math.min(130, m * b.objH * b.vs));
    if (xi > 6 && xi < W - 6) {
      if (di < 0) {
        // dashed lines back to the virtual image tip
        const yi = AX - hi;
        line(g, b.x0, yo, xi, yi, col.accent, true);
        if (Math.abs(xF - xo) > 1e-6) line(g, b.x0, yo + ((AX - yo) * (b.x0 - xo)) / (xF - xo), xi, yi, col.good, true);
      }
      g.globalAlpha = alpha;
      arrow(g, xi, hi, imageColor, 4, di < 0);
      label(g, di < 0 ? 'virtual image' : 'image', xi, AX + 40, { size: 11, color: col.muted });
    }
  }
  g.globalAlpha = 1;
}
