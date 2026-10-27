// Tiny canvas drawing helpers shared by simulation games.

export interface Theme {
  text: string;
  muted: string;
  line: string;
  panel: string;
  bg: string;
  accent: string;
  good: string;
  bad: string;
}

/** Read the page's colour tokens once at mount (canvas can't use CSS variables directly). */
export function themeColors(): Theme {
  const css = getComputedStyle(document.documentElement);
  const c = (n: string) => css.getPropertyValue(n).trim();
  return { text: c('--text'), muted: c('--muted'), line: c('--line'), panel: c('--panel'), bg: c('--bg'), accent: c('--accent'), good: c('--good'), bad: c('--bad') };
}

/** Charge-sign colours, always paired with a +/−/0 symbol so colour is never the only cue. */
export const SIGN_COLOR = { pos: '#c0392b', neg: '#3156d3', neu: '#8a93a3' };
export const signColor = (q: number) => (q > 1e-9 ? SIGN_COLOR.pos : q < -1e-9 ? SIGN_COLOR.neg : SIGN_COLOR.neu);

export function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string, lineWidth = 2): void {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lineWidth;
    g.stroke();
  }
}

export function label(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  { size = 14, bold = true, color = '#000', align = 'center' as CanvasTextAlign } = {},
): void {
  g.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  g.textAlign = align;
  g.fillStyle = color;
  g.fillText(s, x, y);
}

/** "+4", "−2.5", "0": signed, trimmed to 3 decimals. */
export function signed(q: number): string {
  const r = Number(Math.abs(q).toFixed(3));
  return r === 0 ? '0' : `${q < 0 ? '−' : '+'}${r}`;
}
