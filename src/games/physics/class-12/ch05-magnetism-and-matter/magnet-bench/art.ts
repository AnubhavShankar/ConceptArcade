// Drawing for "The Floating Act": the magic theatre, the velvet table with its X-ray window, the glass wand and gold ribbon, the bar and the saw, the coil and battery,
// Noor the illusionist, Biscuit the rabbit, Rondo the ring, the audience, the rehearsal card. Nothing here knows the answer of a round: it draws the positions, moods and
// states it is handed. No Math.random and no gradients (the jsdom canvas stub has none): every wobble comes from the clock.
import { PAL } from '@core/arcade';
import { face } from '@core/mathkit';
import { glow, line, text } from '@core/neon';
import { BAR, BATTERY, CARD, HAT, HOVER, NOOR, SOCKET, SOCKET2, STAGE, TABLE, WAND, WAND2, type Pole, type SawRow } from './logic';

export type G = CanvasRenderingContext2D;
export const POLE_COL: Record<Pole, string> = { N: '#e0453a', S: '#e8e4d8' };
export const WAND_TIP: [number, number] = [141, 184]; // where Noor's wand tip is at fire time
const INK = '#1b1030';
const GOLD = '#c9a24a';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (u: number) => clamp01(u) * clamp01(u) * (3 - 2 * clamp01(u));

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function dot(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}
function box(g: G, x: number, y: number, w: number, h: number, fill: string, edge?: string) {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
  if (edge) {
    g.strokeStyle = edge;
    g.lineWidth = 1;
    g.strokeRect(x, y, w, h);
  }
}
function poly(g: G, pts: [number, number][], fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
}
/** A small dark plate behind a scene label, so it reads on any background. Width is estimated (the test canvas cannot measure text). */
export function tag(g: G, s: string, x: number, y: number, color: string, size = 12, align: CanvasTextAlign = 'center') {
  const w = s.length * size * 0.58 + 10;
  const x0 = align === 'center' ? x - w / 2 : align === 'left' ? x - 5 : x - w + 5;
  g.fillStyle = 'rgba(8,4,20,0.62)';
  rr(g, x0, y - size - 1, w, size + 7, 4);
  g.fill();
  text(g, s, x, y, color, size, align);
}

// ---- the theatre ---------------------------------------------------------------------------------------------------------------------------------------

const SPOT = ['rgba(255,240,200,0.10)', 'rgba(200,170,255,0.12)', 'rgba(255,120,90,0.14)'];
const BANNER = ['MATINEE', 'EVENING SHOW', '★ GALA NIGHT ★'];

/** The stage: back wall, spotlight, velvet curtains, gold proscenium, floor with footlights, and the round's own decoration. Opaque, so the engine grid never shows. */
export function stage(g: G, t: number, k: number, calm = false) {
  box(g, 0, 0, 640, 340, '#1a1030');
  for (let x = 62; x < 600; x += 52) line(g, x, 22, x, STAGE.floor, '#21163d', 2);
  poly(g, [[320, 0], [140, TABLE.top], [500, TABLE.top]], SPOT[k]);
  for (const x0 of [0, 596]) {
    box(g, x0, 0, 44, 340, '#8a1530');
    for (let x = x0 + 5; x < x0 + 44; x += 11) line(g, x, 0, x, 340, '#5e0e22', 2);
  }
  box(g, 0, 0, 640, 22, GOLD);
  line(g, 0, 22, 640, 22, '#8a6d22', 2);
  text(g, BANNER[k], 250, 66, GOLD, 11);
  box(g, 0, STAGE.floor, 640, 20, '#3b2616');
  for (let x = 30; x < 640; x += 70) line(g, x, STAGE.floor, x - 8, 306, '#2c1b0f', 2);
  box(g, 0, 306, 640, 34, '#2c1c48');
  for (let i = 0; i < 9; i++) {
    const bx = 64 + 64 * i;
    g.globalAlpha = 0.7 + 0.3 * Math.sin(t * 2 + i);
    glow(g, '#ffd98a', 8, () => dot(g, bx, 302, 3.5, '#ffe9a8'));
    g.globalAlpha = 1;
  }
  if (k === 2) {
    // the chandelier (hung left of centre so it does not sit behind the goal line), and gold confetti behind the stage
    const sw = calm ? 0 : Math.sin(t * 1.3) * 0.035;
    g.save();
    g.translate(250, 22);
    g.rotate(sw);
    line(g, 0, 0, 0, 8, GOLD, 2);
    box(g, -26, 8, 52, 4, GOLD);
    for (let i = 0; i < 5; i++) {
      const bx = -22 + i * 11;
      g.globalAlpha = 0.75 + 0.25 * Math.sin(t * 2.4 + i * 1.7);
      glow(g, '#ffd98a', 10, () => dot(g, bx, 18, 3.5, '#fff1c4'));
      g.globalAlpha = 1;
      line(g, bx, 12, bx, 15, GOLD, 1.5);
    }
    g.restore();
    if (!calm) {
      g.globalAlpha = 0.5;
      for (let i = 0; i < 10; i++) {
        const cx = 70 + ((i * 59) % 500);
        const cy = 26 + ((t * 14 + i * 37) % 250);
        box(g, cx, cy, 5, 3, i % 2 ? '#ffd23f' : '#f0c040');
      }
      g.globalAlpha = 1;
    }
  }
}

/** The velvet table, with the cutaway X-RAY window under the wand (and, in round 2, two candles). */
export function table(g: G, t: number, k: number, two = false) {
  box(g, TABLE.x0, TABLE.top, TABLE.x1 - TABLE.x0, STAGE.floor - TABLE.top, '#2b1a5a');
  for (let x = TABLE.x0 + 14; x < TABLE.x1; x += 20) line(g, x, TABLE.top + 8, x, STAGE.floor, '#21104a', 2);
  box(g, TABLE.x0 - 6, TABLE.top - 4, TABLE.x1 - TABLE.x0 + 12, 8, '#3d2a7a', GOLD);
  for (let x = TABLE.x0; x <= TABLE.x1; x += 6) line(g, x, STAGE.floor - 2, x, STAGE.floor + 5, GOLD, 2);
  const w = (s: { x: number; y: number; w: number; h: number }) => {
    box(g, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, '#0b0616');
    g.strokeStyle = GOLD;
    g.lineWidth = 2;
    g.strokeRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
  };
  w(SOCKET);
  text(g, 'X-RAY', SOCKET.x - SOCKET.w / 2 - 4, SOCKET.y - 8, GOLD, 11, 'right');
  if (two) {
    box(g, 446, TABLE.top - 4, 48, STAGE.floor - TABLE.top + 4, '#2b1a5a', GOLD);
    w(SOCKET2);
  }
  if (k === 1) {
    for (const cx of [168, 432]) {
      box(g, cx - 3, TABLE.top - 16, 6, 12, '#f4ecd8');
      g.globalAlpha = 0.85 + 0.15 * Math.sin(t * 9 + cx);
      glow(g, '#ffb347', 8, () => dot(g, cx, TABLE.top - 21, 3, '#ffcf70'));
      g.globalAlpha = 1;
    }
  }
}

/** The glass wand with its knob, the clip that holds the ring, and the gold ribbon (the target height, a fixed fact). */
export function wand(g: G, ribbonGlow = false, clipOpen = false, x = WAND.x, top = WAND.top, ribbonY: number = HOVER.win, label = true) {
  box(g, x - 3, top, 6, WAND.base - top, 'rgba(200,230,255,0.55)');
  line(g, x - 1.5, top, x - 1.5, WAND.base, 'rgba(255,255,255,0.7)', 1);
  dot(g, x, top - 2, 5, '#dfeaff');
  if (!clipOpen) box(g, x - 8, top + 3, 16, 6, '#8d93b5');
  else {
    box(g, x - 13, top + 3, 6, 6, '#8d93b5');
    box(g, x + 7, top + 3, 6, 6, '#8d93b5');
  }
  const bow = () => {
    poly(g, [[x, ribbonY], [x - 12, ribbonY - 7], [x - 12, ribbonY + 7]], '#f0c040');
    poly(g, [[x, ribbonY], [x + 12, ribbonY - 7], [x + 12, ribbonY + 7]], '#f0c040');
    dot(g, x, ribbonY, 3, '#b8860b');
  };
  if (ribbonGlow) glow(g, '#fff1a8', 16, bow);
  else bow();
  if (label) text(g, 'ribbon', x - 18, ribbonY + 4, '#f0c040', 11, 'right');
}

// ---- level 1: the bar, the saw and the pieces ---------------------------------------------------------------------------------------------------------

function paint(g: G, x0: number, x1: number, y0: number, y1: number, nLeft: boolean) {
  const mid = BAR.x0 + BAR.len / 2;
  const left = POLE_COL[nLeft ? 'N' : 'S'];
  const right = POLE_COL[nLeft ? 'S' : 'N'];
  if (x0 < mid) box(g, x0, y0, Math.min(x1, mid) - x0, y1 - y0, left);
  if (x1 > mid) box(g, Math.max(x0, mid), y0, x1 - Math.max(x0, mid), y1 - y0, right);
}

/** The bar on its cutting board. `sawn`: the piece has been cut off. Ruler ticks carry no numbers; the dashed outline marks what the player's mark would saw off. */
export function bar(g: G, r: SawRow, k: number, sawn: boolean) {
  const across = r.cut === 'across';
  const y0 = across ? BAR.y : BAR.y + BAR.h - BAR.slab;
  const y1 = BAR.y + BAR.h;
  box(g, BAR.x0 - 6, y1, BAR.len + 12, 6, '#a07a3a');
  const lt = r.nLeft ? 'N' : 'S';
  const rt = r.nLeft ? 'S' : 'N';
  if (across) {
    paint(g, BAR.x0 + (sawn ? 12 * k : 0), BAR.x0 + BAR.len, y0, y1, r.nLeft);
    for (let i = 0; i <= 12; i++) line(g, BAR.x0 + 12 * i, y0, BAR.x0 + 12 * i, y0 - (i % 6 === 0 ? 7 : 4), PAL.dim, 1.5);
    if (!sawn) text(g, lt, BAR.x0 + 8, y1 - 5, INK, 11);
    text(g, rt, BAR.x0 + BAR.len - 8, y1 - 5, INK, 11);
  } else {
    paint(g, BAR.x0, BAR.x0 + BAR.len, y0, sawn ? y1 - 5 * k : y1, r.nLeft);
    for (let i = 0; i <= 12; i++) line(g, BAR.x0 - 7, y1 - 5 * i, BAR.x0 - (i % 6 === 0 ? 1 : 4), y1 - 5 * i, PAL.dim, 1.5);
    const my = (y0 + (sawn ? y1 - 5 * k : y1)) / 2 + 4;
    text(g, lt, BAR.x0 + 8, my, INK, 11);
    text(g, rt, BAR.x0 + BAR.len - 8, my, INK, 11);
  }
  const my = across ? y1 - 5 : (y0 + y1) / 2 - 8;
  text(g, `${r.m0} J/T`, BAR.x0 + BAR.len / 2 + (across ? 8 : 0), my, INK, 11);
  if (!sawn) {
    g.setLineDash([4, 3]);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1.5;
    if (across) g.strokeRect(BAR.x0, y0, 12 * k, BAR.h);
    else g.strokeRect(BAR.x0, y1 - 5 * k, BAR.len, 5 * k);
    g.setLineDash([]);
  }
}

/** The hacksaw standing at the player's mark. `zip` is seconds into the cut, or -1 when it is waiting. */
export function saw(g: G, r: SawRow, k: number, zip: number) {
  const cut = zip >= 0;
  const jig = cut ? 2.5 * Math.sin(zip * 55) : 0;
  const p = ease(zip / 0.3);
  if (r.cut === 'across') {
    const x = BAR.x0 + 12 * k;
    const tip = 200 + 26 * p + jig;
    box(g, x - 1.5, tip - 34, 3, 34, '#c5ccd8');
    for (let y = tip - 30; y < tip; y += 4) line(g, x + 1.5, y, x + 4, y + 2, '#8d93b5', 1);
    rr(g, x - 7, tip - 44, 14, 12, 3);
    g.fillStyle = '#8a5a2b';
    g.fill();
  } else {
    const y = BAR.y + BAR.h - 5 * k;
    const off = cut ? 96 * p + jig : 0;
    box(g, BAR.x0 - 22 + off, y - 1.5, 50, 3, '#c5ccd8');
    for (let x = BAR.x0 - 18 + off; x < BAR.x0 + 28 + off; x += 4) line(g, x, y + 1.5, x + 2, y + 4, '#8d93b5', 1);
    rr(g, BAR.x0 - 34 + off, y - 7, 12, 14, 3);
    g.fillStyle = '#8a5a2b';
    g.fill();
  }
}

/** A sawn piece centred at (x, y), `scale` times its size on the bar, turned by `angle` (π/2 stands it with its left end up). Returns the world positions of its two ends. */
export function piece(g: G, r: SawRow, k: number, x: number, y: number, scale: number, angle: number) {
  const across = r.cut === 'across';
  const len = across ? 12 * k : BAR.len;
  const th = across ? BAR.h : 5 * k;
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.scale(scale, scale);
  const lc = POLE_COL[r.nLeft ? 'N' : 'S'];
  const rc = POLE_COL[r.nLeft ? 'S' : 'N'];
  const half = BAR.len / 2;
  box(g, -len / 2, -th / 2, Math.min(len, half), th, lc);
  if (len > half) box(g, -len / 2 + half, -th / 2, len - half, th, rc);
  g.strokeStyle = 'rgba(20,10,40,0.8)';
  g.lineWidth = 1 / Math.max(scale, 0.3);
  g.strokeRect(-len / 2, -th / 2, len, th);
  g.restore();
  const d = (len * scale) / 2;
  const ends = { left: [x - Math.cos(angle) * d, y - Math.sin(angle) * d] as [number, number], right: [x + Math.cos(angle) * d, y + Math.sin(angle) * d] as [number, number] };
  const inset = Math.min(9, d - 2);
  const stamp = (e: [number, number], sign: number, s: string) => text(g, s, e[0] - Math.cos(angle) * inset * sign, e[1] - Math.sin(angle) * inset * sign + 4, INK, 11);
  stamp(ends.left, -1, r.nLeft ? 'N' : 'S'); // the bar's left end carries its stamp
  if (!across) stamp(ends.right, 1, r.nLeft ? 'S' : 'N'); // a strip keeps both stamped ends; a piece's sawn face is blank
  return ends;
}

/** The piece standing on its end in the X-ray window (the player's own choice; its poles are not written on it). */
export function standingPiece(g: G, r: SawRow, k: number, up: number) {
  const len = r.cut === 'across' ? 12 * k : BAR.len;
  const scale = Math.min(0.5, 44 / len);
  piece(g, r, k, SOCKET.x, SOCKET.y, scale, up === 0 ? Math.PI / 2 : -Math.PI / 2);
  tri(g, SOCKET.x, SOCKET.y - SOCKET.h / 2 + 1);
  text(g, 'up', SOCKET.x + 17, SOCKET.y - SOCKET.h / 2 + 12, PAL.yellow, 11, 'left');
}
function tri(g: G, x: number, y: number) {
  poly(g, [[x, y - 4], [x - 5, y + 3], [x + 5, y + 3]], PAL.yellow);
}

// ---- levels 2 and 3: the coil and the battery ---------------------------------------------------------------------------------------------------------

/** The upright coil in the window. Its front turns light up with yellow dots streaming in the player's current direction when `live`. */
export function coil(g: G, n: number, dir: number, t: number, live: boolean) {
  const cx = SOCKET.x;
  const cnt = 5 + Math.round(n / 300);
  box(g, cx - 10, SOCKET.y - 22, 20, 44, 'rgba(235,240,250,0.85)');
  for (let j = 0; j < cnt; j++) {
    const y = SOCKET.y - 19 + (j * 38) / (cnt - 1);
    g.lineWidth = 2;
    g.strokeStyle = '#7a4a1e';
    g.beginPath();
    g.ellipse(cx, y, 9, 3, 0, Math.PI, Math.PI * 2);
    g.stroke();
    g.strokeStyle = live ? '#ffcf70' : '#e0a050';
    g.beginPath();
    g.ellipse(cx, y, 9, 3, 0, 0, Math.PI);
    g.stroke();
    if (live) {
      for (let q = 0; q < 2; q++) {
        const ph = (((t * 120) / 28 + q * 0.5 + j * 0.13) % 1 + 1) % 1; // 28 px of front arc per turn, 120 px/s
        const phi = dir === 1 ? Math.PI * (1 - ph) : Math.PI * ph; // front current to the right: the dot runs from the left end to the right end
        dot(g, cx + 9 * Math.cos(phi), y + 3 * Math.sin(phi), 1.8, PAL.yellow);
      }
    }
  }
}

/** The battery box with its two-way polarity lever and the wires to the coil. */
export function battery(g: G, dir: number, live: boolean, amps: number) {
  const x0 = BATTERY.x - 30;
  const y0 = BATTERY.y - 18;
  const wire = (y: number, y2: number, c: string) => {
    g.strokeStyle = c;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x0 + 60, y);
    g.lineTo(SOCKET.x - SOCKET.w / 2, y);
    g.lineTo(SOCKET.x - 10, y2);
    g.stroke();
  };
  wire(y0 + 8, SOCKET.y - 14, live ? '#ff7a6a' : '#b8302d');
  wire(y0 + 30, SOCKET.y + 14, live ? '#8fa0c0' : '#2a2a30');
  box(g, x0, y0, 60, 36, '#2a2f55', '#7b82a6');
  dot(g, x0 + 10, y0, 3.5, '#e0282d');
  dot(g, x0 + 50, y0, 3.5, '#3a3a44');
  text(g, '+', x0 + 10, y0 - 6, '#ff9a8a', 11);
  text(g, '−', x0 + 50, y0 - 6, PAL.dim, 11);
  text(g, `${amps} A`, BATTERY.x, y0 + 14, PAL.white, 11);
  rr(g, BATTERY.x - 20, BATTERY.y + 4, 40, 10, 5);
  g.fillStyle = '#0b0616';
  g.fill();
  dot(g, BATTERY.x + (2 * dir - 1) * 14, BATTERY.y + 9, 7, '#f0c040'); // `dir` may be fractional while the lever snaps over
  text(g, '←', BATTERY.x - 24, BATTERY.y + 13, PAL.white, 12, 'right');
  text(g, '→', BATTERY.x + 24, BATTERY.y + 13, PAL.white, 12, 'left');
}

/** Level 3: the second wand, its ring at the ribbon, and the real bar magnet in its own window. `slide` 0 to 1 takes the magnet out of the window to the right. */
export function secondWand(g: G, top: Pole, t: number, slide: number) {
  wand(g, false, true, WAND2.x, WAND2.top, WAND2.ring, false);
  ring(g, WAND2.x, WAND2.ring + 2 * Math.sin(t * 2.2), 'idle', false, top);
  g.save();
  g.beginPath();
  g.rect(SOCKET2.x - SOCKET2.w / 2 + 1, SOCKET2.y - SOCKET2.h / 2 + 1, SOCKET2.w - 2, SOCKET2.h - 2);
  g.clip();
  const mx = SOCKET2.x + 40 * ease(slide);
  box(g, mx - 7, SOCKET2.y - 20, 14, 20, POLE_COL[top]);
  box(g, mx - 7, SOCKET2.y, 14, 20, POLE_COL[other(top)]);
  text(g, top, mx, SOCKET2.y - 7, INK, 11);
  g.restore();
  tri(g, SOCKET2.x, SOCKET2.y - SOCKET2.h / 2 + 1);
  text(g, 'top', SOCKET2.x + 12, SOCKET2.y - SOCKET2.h / 2 + 12, PAL.yellow, 11, 'left');
}
const other = (p: Pole): Pole => (p === 'N' ? 'S' : 'N');

// ---- the ring, the field and the card ----------------------------------------------------------------------------------------------------------------

export type RingMood = 'idle' | 'win' | 'low' | 'snap' | 'high';
/** Rondo, a chrome ring magnet seen edge-on. `spin` 0 none, 1 flat (34 × 10), 2 on edge (10 × 34). The underside pole is printed below it (a given fact). */
export function ring(g: G, x: number, y: number, mood: RingMood, spin: number | boolean, pole: Pole, h = 10) {
  const sp = spin === true ? 1 : spin === false ? 0 : spin;
  const w = sp === 2 ? 10 : 34;
  const hh = sp === 2 ? 34 : h;
  g.fillStyle = '#c9d3e6';
  g.beginPath();
  g.ellipse(x, y, w / 2, hh / 2, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#8d99b5';
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = '#6f7a99';
  g.beginPath();
  g.ellipse(x, y - 0.5, w * 0.27, hh * 0.2, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#ffffff';
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(x, y, w / 2 - 2, hh / 2 - 1.5, 0, Math.PI * 1.1, Math.PI * 1.55);
  g.stroke();
  if (sp !== 2) {
    const ey = y + 2.5;
    g.strokeStyle = INK;
    g.fillStyle = INK;
    g.lineWidth = 1.2;
    if (mood === 'win') {
      for (const ex of [-6, 6]) {
        g.beginPath();
        g.arc(x + ex, ey + 0.5, 1.8, Math.PI, Math.PI * 2);
        g.stroke();
      }
    } else if (mood === 'snap') {
      for (const ex of [-6, 6]) {
        line(g, x + ex - 1.5, ey - 1.5, x + ex + 1.5, ey + 1.5, INK, 1.2);
        line(g, x + ex - 1.5, ey + 1.5, x + ex + 1.5, ey - 1.5, INK, 1.2);
      }
    } else if (mood === 'high') {
      for (const ex of [-6, 6]) {
        g.beginPath();
        g.arc(x + ex, ey, 1.8, 0, Math.PI * 1.6);
        g.stroke();
      }
    } else {
      dot(g, x - 6, ey, 1.4, INK);
      dot(g, x + 6, ey, 1.4, INK);
      if (mood === 'low') {
        g.beginPath();
        g.arc(x, ey + 4.5, 2.2, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
      }
    }
    text(g, `${pole}▾`, x, y + hh / 2 + 13, PAL.white, 11);
  }
}

/** Four closed loops of gold field lines round the ring and the hidden magnet: the true picture, drawn only on a win. */
export function fieldLines(g: G, alpha: number) {
  if (alpha <= 0) return;
  g.globalAlpha = 0.5 * alpha;
  for (let i = 1; i <= 4; i++) {
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(WAND.x, (HOVER.win - 4 + SOCKET.y + 24) / 2, 14 + 13 * i, (SOCKET.y + 24 - HOVER.win + 4) / 2 + 3, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;
}

/** The rehearsal card on an easel: the only place the piece's or coil's moment and top pole appear before the act. */
export function card(g: G, s: string, color: string) {
  line(g, CARD.x - 40, CARD.y + CARD.h / 2, CARD.x - 50, 238, '#5a3b1c', 3);
  line(g, CARD.x + 40, CARD.y + CARD.h / 2, CARD.x + 50, 238, '#5a3b1c', 3);
  box(g, CARD.x - CARD.w / 2 - 4, CARD.y - CARD.h / 2 - 4, CARD.w + 8, CARD.h + 8, '#5a3b1c');
  box(g, CARD.x - CARD.w / 2, CARD.y - CARD.h / 2, CARD.w, CARD.h, '#14241c');
  text(g, 'REHEARSAL', CARD.x, CARD.y - 10, PAL.dim, 11);
  g.font = 'bold 13px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = color;
  g.fillText(s, CARD.x, CARD.y + 14, CARD.w - 8);
}

/** The round's goal on the scene, in one short line on a dark plate. */
export function goalLine(g: G, s: string) {
  const w = s.length * 7.6 + 24;
  g.fillStyle = 'rgba(0,0,0,0.55)';
  rr(g, 320 - w / 2, 24, w, 24, 12);
  g.fill();
  text(g, s, 320, 41, PAL.white, 13);
}

/** A drag handle drawn by the game: a white ring with a grip glyph, filled while dragged, pulsing (radius 20 to 26) while it is the first-time cue. */
export function handleRing(g: G, x: number, y: number, glyph: string, hot: boolean, cue: number) {
  const r = cue >= 0 ? 23 + 3 * Math.sin(cue * Math.PI * 4) : 20;
  if (hot) {
    g.fillStyle = 'rgba(255,210,63,0.35)';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  text(g, glyph, x, y + 4, PAL.white, 12);
}

// ---- the people ------------------------------------------------------------------------------------------------------------------------------------------

export interface NoorOpts { mood: 'happy' | 'cheer' | 'worried' | 'startled'; flick: number; u: number; saw: boolean }

/** Noor, the stage illusionist, feet at NOOR: top hat, sequinned tailcoat, bow tie, gloves, wand; she breathes, blinks, twirls her wand and tips her hat. */
export function noor(g: G, t: number, o: NoorOpts) {
  const bow = o.mood === 'cheer' && o.u >= 0 && o.u < 0.6 ? 25 * Math.sin(Math.PI * clamp01(o.u / 0.6)) : 0;
  g.save();
  g.translate(NOOR.x, NOOR.feet);
  g.rotate((bow * Math.PI) / 180);
  g.scale(0.86, 0.86 * (1 + 0.015 * Math.sin(t * 2.2)));
  box(g, -13, -8, 13, 8, '#101010');
  box(g, 3, -8, 15, 8, '#101010');
  box(g, -11, -38, 8, 30, '#14122a');
  box(g, 5, -38, 8, 30, '#14122a');
  poly(g, [[-18, -34], [-14, -88], [16, -88], [20, -34], [10, -24], [-8, -24]], '#16206b');
  const lit = Math.floor(t / 0.4) % 3;
  [[-8, -72], [2, -58], [11, -74]].forEach(([sx, sy], i) => dot(g, sx, sy, 1.8, i === lit ? '#ffffff' : 'rgba(255,255,255,0.35)'));
  poly(g, [[-6, -88], [6, -88], [0, -62]], '#ffffff');
  poly(g, [[0, -86], [-7, -90], [-7, -82]], '#d11f35');
  poly(g, [[0, -86], [7, -90], [7, -82]], '#d11f35');
  // left arm (holding the hacksaw in level 1)
  line(g, -14, -82, -8, -52, '#16206b', 5);
  dot(g, -8, -50, 3, '#ffffff');
  if (o.saw) {
    box(g, -8, -53, 4, 6, '#8a5a2b');
    box(g, -6, -53, 28, 2, '#c5ccd8');
  }
  // head
  dot(g, 2, -100, 12, '#f2c9a0');
  if (o.mood === 'startled') {
    dot(g, 6, -101, 1.8, INK);
    dot(g, 14, -101, 1.8, INK);
    line(g, 2, -107, 9, -107, INK, 1.4);
    line(g, 10, -107, 17, -107, INK, 1.4);
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(10, -92, 3, 0, Math.PI * 2);
    g.stroke();
  } else {
    face(g, 8, -100, 12, o.mood === 'cheer' ? 'cheer' : o.mood === 'worried' ? 'worried' : 'happy', t);
  }
  // the hat: tipped 4° every 6 s, knocked up when startled
  const knock = o.mood === 'startled' && o.u >= 0 && o.u < 0.4 ? -6 : 0;
  const tip = t % 6 < 0.4 ? 4 * Math.sin((Math.PI * (t % 6)) / 0.4) : 0;
  g.save();
  g.translate(2, -111 + knock);
  g.rotate((tip * Math.PI) / 180);
  box(g, -10, -20, 22, 20, '#0c0c14');
  box(g, -10, -7, 22, 4, '#d11f35');
  g.fillStyle = '#0c0c14';
  g.beginPath();
  g.ellipse(1, 0, 17, 4, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // right arm raised with the wand
  line(g, 14, -82, 26, -76, '#16206b', 5);
  line(g, 26, -76, 32, -90, '#16206b', 5);
  dot(g, 32, -91, 3, '#ffffff');
  let a = -0.5;
  if (o.flick >= 0) a += (-60 * Math.PI) / 180 * (o.flick < 0.1 ? o.flick / 0.1 : Math.max(0, 1 - (o.flick - 0.1) / 0.3));
  if (t % 4 < 0.5) a += (2 * Math.PI * (t % 4)) / 0.5;
  g.save();
  g.translate(32, -91);
  g.rotate(a);
  box(g, 0, -1.5, 18, 3, '#101010');
  box(g, 14, -1.5, 4, 3, '#ffffff');
  g.restore();
  g.restore();
}

export type BiscuitState = 'idle' | 'cover' | 'win' | 'low' | 'snap' | 'high';
/** Biscuit, the rabbit assistant in an upturned top hat: twitching nose, flopping ear, paws over its eyes at the act, and a reaction to every result. */
export function biscuit(g: G, t: number, s: BiscuitState, u: number) {
  const hx = HAT.x;
  const hy = HAT.y;
  const rise = s === 'win' ? -14 * ease(u / 0.2) : s === 'snap' ? 30 * ease(u / 0.15) * (u < 0.8 ? 1 : 1 - ease((u - 0.8) / 0.2)) : 0;
  const cy = hy - 26 + rise; // head centre
  const droop = s === 'low' ? 1 : 0;
  const flop = s === 'idle' && t % 5 < 0.6 ? Math.sin((Math.PI * (t % 5)) / 0.6) * 0.7 : 0;
  g.save(); // nothing of the rabbit shows below the hat
  g.beginPath();
  g.rect(hx - 40, 0, 80, hy - 1);
  g.clip();
  for (const side of [-1, 1]) {
    g.save();
    g.translate(hx + side * 5, cy - 7);
    g.rotate(side * (droop ? 1.35 : 0.12) + (side === 1 ? flop : 0));
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(0, -11, 3.6, 12, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f5a3b8';
    g.beginPath();
    g.ellipse(0, -11, 1.8, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  dot(g, hx, cy, 10, '#ffffff');
  dot(g, hx - 10, cy + 6, 3, '#ffffff'); // paws on the brim
  dot(g, hx + 10, cy + 6, 3, '#ffffff');
  const wig = t % 2 < 0.5 ? Math.sin(t * 50) * 1 : 0;
  dot(g, hx + wig, cy + 3, 2, '#f5799a');
  if (s === 'cover') {
    dot(g, hx - 4, cy - 2, 3.4, '#ffffff');
    dot(g, hx + 4, cy - 2, 3.4, '#ffffff');
    g.strokeStyle = '#d6d6e0';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(hx - 4, cy - 2, 3.4, 0, Math.PI * 2);
    g.arc(hx + 4, cy - 2, 3.4, 0, Math.PI * 2);
    g.stroke();
  } else if (s === 'high' && u >= 0.1) {
    for (const ex of [-4, 4]) {
      g.strokeStyle = INK;
      g.lineWidth = 1.2;
      g.beginPath();
      g.arc(hx + ex, cy - 2, 2.2, 0, Math.PI * 1.7);
      g.stroke();
    }
  } else {
    const blink = t % 3.3 < 0.12 ? 0.3 : 1;
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(hx - 4, cy - 2, 1.8, 1.8 * blink, 0, 0, Math.PI * 2);
    g.ellipse(hx + 4, cy - 2, 1.8, 1.8 * blink, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (s === 'win') {
    const c = u > 0.2 && Math.floor((u - 0.2) / 0.2) % 2 === 0 ? 3 : 10; // claps twice
    dot(g, hx - c, cy + 6, 3, '#ffffff');
    dot(g, hx + c, cy + 6, 3, '#ffffff');
  }
  if (s === 'high' && u >= 0.1) {
    for (let i = 0; i < 3; i++) {
      const an = t * 5 + (i * Math.PI * 2) / 3;
      text(g, '✦', hx + Math.cos(an) * 12, cy - 22 + Math.sin(an) * 4, PAL.yellow, 11);
    }
  }
  g.restore();
  // the hat in front: an upturned top hat
  poly(g, [[hx - 18, hy - 14], [hx + 18, hy - 14], [hx + 14, hy], [hx - 14, hy]], '#0c0c14');
  box(g, hx - 17, hy - 9, 34, 3, '#d11f35');
  g.fillStyle = '#0c0c14';
  g.beginPath();
  g.ellipse(hx, hy - 14, 20, 4, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#3a3a52';
  g.lineWidth = 1;
  g.stroke();
}

export type CrowdMood = 'idle' | 'win' | 'ooh' | 'gasp';
/** The audience: 14 head-and-shoulder silhouettes along the bottom, bobbing out of phase; arms up on a win. */
export function audience(g: G, t: number, mood: CrowdMood) {
  for (let i = 0; i < 14; i++) {
    const x = 30 + i * 44.6;
    const bob = Math.sin(t * 1.8 + i * 1.3) * 1 - (mood === 'gasp' ? 3 : 0);
    g.fillStyle = '#120a1e';
    g.beginPath();
    g.ellipse(x, 342 + bob, 22, 18, 0, Math.PI, Math.PI * 2);
    g.fill();
    dot(g, x, 321 + bob, 9, '#120a1e');
    if (mood === 'win') {
      const w = Math.sin(t * 7 + i) * 2;
      line(g, x - 15, 336 + bob, x - 19, 314 + bob + w, '#120a1e', 3);
      line(g, x + 15, 336 + bob, x + 19, 314 + bob - w, '#120a1e', 3);
    }
  }
}
