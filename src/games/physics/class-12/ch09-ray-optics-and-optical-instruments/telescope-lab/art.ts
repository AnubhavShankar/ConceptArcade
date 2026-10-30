// Art for Planet night (Telescope Lab level 4): the starry sky, Stella and her gear, the Cassegrain cross-section, the camera screen.
// Everything here only draws. Nothing in the picture marks where the final image forms: only the live round 1 screen and the paid
// test exposure show the true blur, and a missed exposure always develops with the same fixed blur.
import { PAL } from '@core/arcade';
import { glow, line, text } from '@core/neon';
import type { Planet } from './logic';

type G = CanvasRenderingContext2D;

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};

// ---- the sky ---------------------------------------------------------------------------------------------------------------

const rnd = lcg(20261030);
/** About 120 stars with seeded positions and twinkle phases. */
const STARS = Array.from({ length: 120 }, () => ({ x: rnd() * 640, y: rnd() * 290, r: 0.5 + rnd() * rnd() * 1.8, phase: rnd() * 6.28, speed: 1.5 + rnd() * 3 }));
/** Soft discs along a diagonal band: the Milky Way. */
const MILKY = Array.from({ length: 46 }, (_, i) => ({ x: -20 + i * 15 + (rnd() - 0.5) * 20, y: 230 - i * 4.4 + (rnd() - 0.5) * 36, r: 18 + rnd() * 26 }));

/** The planet in the sky: slightly brighter than the stars and it does not twinkle. */
export const SKY_PLANET = { x: 255, y: 95 };
const PLANET_COLOR: Record<Planet, string> = { Saturn: '#ecd29a', Jupiter: '#f0c9a0', Neptune: '#6f9bff' };
export const planetColor = (p: Planet) => PLANET_COLOR[p];

export function nightSky(g: G, t: number, planet: Planet) {
  const grad = g.createLinearGradient?.(0, 0, 0, 340);
  if (grad) {
    grad.addColorStop(0, '#050a24');
    grad.addColorStop(0.7, '#10205a');
    grad.addColorStop(1, '#1c2c6a');
    g.fillStyle = grad;
  } else g.fillStyle = '#0a1440';
  g.fillRect(-10, -10, 660, 360);
  g.fillStyle = '#b8c4ff';
  for (const m of MILKY) {
    g.globalAlpha = 0.035;
    g.beginPath();
    g.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#fff';
  for (const s of STARS) {
    g.globalAlpha = 0.45 + 0.5 * Math.sin(t * s.speed + s.phase);
    g.beginPath();
    g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // a shooting star every nine seconds
  const cyc = t % 9;
  if (cyc < 0.7) {
    const f = cyc / 0.7;
    const sx = 470 - f * 150;
    const sy = 30 + f * 70;
    g.globalAlpha = 1 - f * f;
    line(g, sx, sy, sx + 30, sy - 13, '#fff', 2);
    line(g, sx + 30, sy - 13, sx + 62, sy - 27, 'rgba(255,255,255,0.25)', 1.2);
    g.globalAlpha = 1;
  }
  // the planet: steady and a little brighter
  glow(g, planetColor(planet), 14, () => {
    g.fillStyle = planetColor(planet);
    g.beginPath();
    g.arc(SKY_PLANET.x, SKY_PLANET.y, planet === 'Neptune' ? 3.6 : 4.6, 0, Math.PI * 2);
    g.fill();
  });
}

/** The observatory roof: a floor, a low wall and little rail lights. */
export function roof(g: G, t: number) {
  g.fillStyle = '#0b1030';
  g.fillRect(0, 300, 640, 40);
  g.fillStyle = '#1b2456';
  g.fillRect(0, 296, 640, 5);
  for (let x = 20; x < 640; x += 60) {
    g.fillStyle = '#2a3678';
    g.fillRect(x, 288, 4, 10);
    g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + x);
    g.fillStyle = PAL.red;
    g.fillRect(x, 286, 4, 3);
    g.globalAlpha = 1;
  }
}

// ---- the telescope seen from outside ------------------------------------------------------------------------------------

/** A white Cassegrain tube on a tripod, pointing at the planet in the sky. */
export function outerScope(g: G, t: number, px: number, py: number) {
  const ang = Math.atan2(SKY_PLANET.y - py, SKY_PLANET.x - px);
  line(g, px, py, px - 30, 298, '#8f9bd6', 4);
  line(g, px, py, px + 30, 298, '#8f9bd6', 4);
  line(g, px, py, px + 2, 298, '#aab3d8', 4);
  g.fillStyle = '#3a4a8a';
  g.beginPath();
  g.arc(px, py, 7, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.translate(px, py);
  g.rotate(ang);
  glow(g, PAL.cyan, 8, () => {
    g.fillStyle = '#f4f6ff';
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 1.5;
    g.fillRect(-26, -11, 112, 22);
    g.strokeRect(-26, -11, 112, 22);
  });
  g.fillStyle = '#c9d1f5';
  g.fillRect(70, -13, 18, 26);
  g.fillStyle = '#20263f';
  g.beginPath();
  g.ellipse(88, 0, 3, 11, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#8f9bd6';
  g.fillRect(-40, -8, 14, 16);
  g.fillStyle = '#20263f';
  g.fillRect(28, -17, 22, 5);
  g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4);
  g.fillStyle = PAL.red;
  g.fillRect(-36, -4, 4, 4);
  g.globalAlpha = 1;
  g.restore();
}

// ---- Stella --------------------------------------------------------------------------------------------------------------

export interface StellaState {
  mood: 'happy' | 'worried' | 'wow';
  /** 0..1: the hands cover the eyes (after a blurry shot). */
  rub: number;
  /** 0..1: how far the thermos is raised. */
  sip: number;
  /** The gaze: toward the camera screen, or up at the sky. */
  look: 'screen' | 'sky';
}

const COAT = '#d9467a';
const SCARF = '#ffd23f';
const BEANIE = '#4de1ff';
const SKIN = '#f1c4a0';
const DARK = '#1b1030';

function sparkle(g: G, x: number, y: number, r: number) {
  line(g, x - r, y, x + r, y, '#fff', 1.4);
  line(g, x, y - r, x, y + r, '#fff', 1.4);
  line(g, x - r * 0.6, y - r * 0.6, x + r * 0.6, y + r * 0.6, PAL.yellow, 1);
  line(g, x - r * 0.6, y + r * 0.6, x + r * 0.6, y - r * 0.6, PAL.yellow, 1);
}

/** The stargazer: woolly beanie with a pompom, a long scarf, mittens and a thermos, in her puffy coat; standing on the roof at (x, 298). */
export function stella(g: G, x: number, y: number, t: number, s: StellaState) {
  const breathe = Math.sin(t * 2) * 0.9;
  const hy = y - 92 + breathe * 0.5; // head centre
  // boots and legs
  g.fillStyle = '#2a3678';
  g.fillRect(x - 12, y - 28, 9, 22);
  g.fillRect(x + 3, y - 28, 9, 22);
  g.fillStyle = '#20263f';
  g.fillRect(x - 15, y - 8, 13, 8);
  g.fillRect(x + 2, y - 8, 13, 8);
  // puffy coat
  g.fillStyle = COAT;
  g.beginPath();
  g.ellipse(x, y - 52 + breathe * 0.4, 21, 28, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 1.5;
  for (const dy of [-64, -52, -40]) {
    g.beginPath();
    g.arc(x, y + dy + breathe * 0.4, 19, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
  }
  // the left arm reaches toward the telescope's camera; the right one holds the thermos
  const lax = x + 20;
  const lay = y - 52;
  line(g, x + 12, y - 66, lax + 8, lay, COAT, 8);
  g.fillStyle = PAL.white;
  g.beginPath();
  g.arc(lax + 9, lay, 5.5, 0, Math.PI * 2);
  g.fill();
  const hxS = x - 18;
  const hyS = y - 46;
  const hxE = x - 5;
  const hyE = y - 84;
  const sip = s.rub > 0 ? 0 : s.sip;
  const hx = hxS + (hxE - hxS) * sip;
  const hyy = hyS + (hyE - hyS) * sip;
  line(g, x - 14, y - 66, hx, hyy, COAT, 8);
  g.fillStyle = PAL.red;
  g.fillRect(hx - 4, hyy - 14, 8, 16);
  g.fillStyle = '#e8ecff';
  g.fillRect(hx - 4, hyy - 17, 8, 4);
  g.fillStyle = PAL.white;
  g.beginPath();
  g.arc(hx, hyy + 1, 5, 0, Math.PI * 2);
  g.fill();
  if (sip > 0.5) {
    g.globalAlpha = 0.5;
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(hx + 3, hyy - 22 - (t * 14) % 8, 2 + ((t * 14) % 8) * 0.2, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }
  // the long scarf: a wrap around the neck and a tail that flutters
  g.fillStyle = SCARF;
  g.fillRect(x - 15, y - 82 + breathe * 0.4, 30, 9);
  g.beginPath();
  g.moveTo(x - 13, y - 74);
  g.lineTo(x - 5, y - 74);
  g.lineTo(x - 9 + Math.sin(t * 2.4) * 4, y - 36);
  g.lineTo(x - 21 + Math.sin(t * 2.4 + 0.7) * 5, y - 40);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(x - 15, y - 78 + breathe * 0.4, 30, 2);
  // head
  g.fillStyle = SKIN;
  g.beginPath();
  g.arc(x, hy, 15, 0, Math.PI * 2);
  g.fill();
  // beanie with a brim and a bouncing pompom
  g.fillStyle = BEANIE;
  g.beginPath();
  g.arc(x, hy - 3, 16.5, Math.PI, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2aa9cc';
  g.fillRect(x - 17, hy - 6, 34, 6);
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 1.2;
  for (let k = -12; k <= 12; k += 6) line(g, x + k, hy - 6, x + k * 0.9, hy - 18, 'rgba(255,255,255,0.3)', 1.2);
  const bob = Math.abs(Math.sin(t * 2.2)) * 1.6;
  g.fillStyle = PAL.white;
  g.beginPath();
  g.arc(x + 1, hy - 24 - bob, 5.5, 0, Math.PI * 2);
  g.fill();
  // face
  const blink = t % 3.3 < 0.12;
  const gx = s.look === 'sky' ? 1.4 : 2.2;
  const gy = s.look === 'sky' ? -2 : -1.2;
  const ey = hy + 3;
  if (s.rub > 0) {
    // the mittens rub the eyes
    const wob = Math.sin(t * 22) * 2;
    g.fillStyle = PAL.white;
    g.beginPath();
    g.arc(x - 7 + wob, ey, 5.5, 0, Math.PI * 2);
    g.arc(x + 7 - wob, ey, 5.5, 0, Math.PI * 2);
    g.fill();
  } else if (s.mood === 'wow') {
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(x - 5.5, ey, 4.6, 0, Math.PI * 2);
    g.arc(x + 5.5, ey, 4.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = DARK;
    g.beginPath();
    g.arc(x - 5.5, ey - 0.6, 2.4, 0, Math.PI * 2);
    g.arc(x + 5.5, ey - 0.6, 2.4, 0, Math.PI * 2);
    g.fill();
    sparkle(g, x - 11, ey - 7, 4 + Math.sin(t * 12) * 1.2);
    sparkle(g, x + 12, ey - 6, 3.5 + Math.cos(t * 12) * 1.2);
  } else if (blink) {
    line(g, x - 8, ey, x - 3, ey, DARK, 1.6);
    line(g, x + 3, ey, x + 8, ey, DARK, 1.6);
  } else {
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(x - 5.5, ey, 3.8, 0, Math.PI * 2);
    g.arc(x + 5.5, ey, 3.8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = DARK;
    g.beginPath();
    g.arc(x - 5.5 + gx, ey + gy, 1.9, 0, Math.PI * 2);
    g.arc(x + 5.5 + gx, ey + gy, 1.9, 0, Math.PI * 2);
    g.fill();
  }
  // cheeks, mouth
  g.fillStyle = 'rgba(255,90,120,0.35)';
  g.beginPath();
  g.arc(x - 10, hy + 8, 3, 0, Math.PI * 2);
  g.arc(x + 10, hy + 8, 3, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = DARK;
  g.lineWidth = 1.5;
  g.beginPath();
  if (s.mood === 'wow') {
    g.fillStyle = DARK;
    g.ellipse(x, hy + 10, 3.4, 4.4, 0, 0, Math.PI * 2);
    g.fill();
  } else if (s.mood === 'worried') g.arc(x, hy + 14, 4.5, 1.15 * Math.PI, 1.85 * Math.PI);
  else g.arc(x, hy + 7, 4.2, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  if (s.mood === 'worried') {
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.arc(x + 15, hy - 4 + ((t * 20) % 9), 2.4, 0, Math.PI * 2);
    g.fill();
  }
  // breath puffs in the cold
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.45 + k / 3) % 1;
    g.globalAlpha = (1 - ph) * 0.55;
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(x + 12 + ph * 20, hy + 11 - ph * 14, 2 + ph * 5, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

/** The star journal: an open book on a little stool. Each planet already photographed is pinned with a gold star. */
export function journal(g: G, x: number, y: number, taken: Planet[], t: number) {
  g.fillStyle = '#3a2d4a';
  g.fillRect(x - 16, y + 6, 32, 6);
  line(g, x - 12, y + 12, x - 14, 298, '#6b5040', 3);
  line(g, x + 12, y + 12, x + 14, 298, '#6b5040', 3);
  g.fillStyle = '#f4f6ff';
  g.beginPath();
  g.moveTo(x - 20, y + 6);
  g.lineTo(x, y + 2);
  g.lineTo(x + 20, y + 6);
  g.lineTo(x + 20, y - 8);
  g.lineTo(x, y - 12);
  g.lineTo(x - 20, y - 8);
  g.closePath();
  g.fill();
  line(g, x, y + 2, x, y - 12, '#8f9bd6', 1.5);
  taken.forEach((p, i) => {
    const px = x - 15 + i * 11;
    g.fillStyle = planetColor(p);
    g.beginPath();
    g.arc(px + 3, y - 3, 3.2, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4 + i);
    g.fillStyle = PAL.yellow;
    g.fillRect(px + 4, y - 11, 3, 3);
    g.globalAlpha = 1;
  });
  text(g, 'star journal', x, y + 24, PAL.dim, 9);
}

// ---- the Cassegrain cross-section --------------------------------------------------------------------------------------

/** Geometry of the cross-section inset (px). The sensor is dragged along the axis behind the big mirror. */
export const CASS = { X1: 560, XS: 600, AXY: 232, SC: 0.483, panel: { x: 290, y: 148, w: 342, h: 178 } };
export const sensorX = (mm: number) => CASS.XS - mm * CASS.SC;
const AXY_TOP = CASS.AXY - 32;

/**
 * The cross-section: the big concave mirror with a hole, the small convex mirror on a spider, the light folding twice.
 * `final` is how the last beam is drawn: `idle` is a fixed strip through the hole (it does not converge anywhere), `focus` converges at the sensor
 * (drawn only for a hit, where the sensor really is at the focus).
 */
export function cassInset(g: G, t: number, sensorAt: number, final: 'idle' | 'focus', prog: number) {
  const { X1, XS, AXY, panel } = CASS;
  g.fillStyle = 'rgba(0,0,0,0.42)';
  g.fillRect(panel.x, panel.y, panel.w, panel.h);
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 2;
  g.strokeRect(panel.x, panel.y, panel.w, panel.h);
  text(g, 'INSIDE THE TELESCOPE (not to scale)', panel.x + panel.w / 2, panel.y + 15, PAL.cyan, 10);
  line(g, panel.x + 4, AXY, panel.x + panel.w - 4, AXY, PAL.dim, 1, [6, 6]);
  // the camera body behind the big mirror, with the rail the sensor slides on
  g.strokeStyle = PAL.dim;
  g.lineWidth = 1.5;
  g.setLineDash([4, 4]);
  g.strokeRect(panel.x + 8, AXY - 26, X1 - panel.x - 12, 52);
  g.setLineDash([]);
  text(g, 'camera', panel.x + 38, AXY - 31, PAL.dim, 9);
  // tube walls
  line(g, X1, AXY - 68, XS + 26, AXY - 68, '#f4f6ff', 3);
  line(g, X1, AXY + 68, XS + 26, AXY + 68, '#f4f6ff', 3);
  // the big concave mirror (an arc open toward the right) with the central hole
  glow(g, PAL.cyan, 8, () => {
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 5;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(X1 + 3, AXY + s * 18);
      g.quadraticCurveTo(X1 - 6, AXY + s * 44, X1 + 4, AXY + s * 66);
      g.stroke();
    }
  });
  text(g, 'big concave mirror', 480, AXY + 86, PAL.cyan, 10);
  // the small convex mirror on a spider
  line(g, XS, AXY - 68, XS, AXY - 18, PAL.dim, 1.2);
  line(g, XS, AXY + 68, XS, AXY + 18, PAL.dim, 1.2);
  glow(g, PAL.pink, 8, () => {
    g.strokeStyle = PAL.pink;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(XS - 3, AXY - 18);
    g.quadraticCurveTo(XS + 7, AXY, XS - 3, AXY + 18);
    g.stroke();
  });
  text(g, 'small convex mirror', 626, AXY + 80, PAL.pink, 10, 'right');
  // the big mirror's own image: a point behind the small mirror (a virtual object for it)
  const vx = XS + 28;
  line(g, vx - 4, AXY - 4, vx + 4, AXY + 4, PAL.yellow, 1.5);
  line(g, vx - 4, AXY + 4, vx + 4, AXY - 4, PAL.yellow, 1.5);
  // the folded light: in from the right, onto the big mirror, up to the small mirror
  for (const k of [-40, -22, 22, 40]) {
    line(g, XS + 26, AXY + k, X1 + 2, AXY + k, PAL.yellow, 1.5);
    const yAt = AXY + (k * (vx - XS)) / (vx - X1);
    line(g, X1 + 2, AXY + k, XS - 2, yAt, PAL.cyan, 1.3);
    line(g, XS - 2, yAt, vx, AXY, PAL.cyan, 0.8, [3, 4]);
    // and the light that goes back toward the hole
    if (final === 'focus') {
      g.globalAlpha = Math.max(0, Math.min(1, prog));
      line(g, XS - 2, yAt, sensorAt, AXY, '#fff', 1.4);
      g.globalAlpha = 1;
    }
  }
  if (final === 'idle') {
    for (let k = 0; k < 6; k++) {
      g.globalAlpha = 0.55 - k * 0.09;
      line(g, XS - 4 - k * 22, AXY - 9, XS - 4 - (k + 1) * 22, AXY - 9, '#fff', 1.3);
      line(g, XS - 4 - k * 22, AXY + 9, XS - 4 - (k + 1) * 22, AXY + 9, '#fff', 1.3);
    }
    g.globalAlpha = 1;
  }
  // light scattered down the tube for life: slow drifting motes along the incoming beam
  for (let k = 0; k < 4; k++) {
    const ph = (t * 0.6 + k / 4) % 1;
    g.globalAlpha = 0.6 * Math.sin(ph * Math.PI);
    g.fillStyle = PAL.yellow;
    g.beginPath();
    g.arc(XS + 26 - ph * (XS + 26 - X1), AXY + (k % 2 ? 30 : -30), 1.8, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

/** The camera sensor chip on its rail at x: a green wafer with pins and a flickering status light. */
export function sensorChip(g: G, x: number, t: number, ok: boolean | null) {
  const c = ok === null ? PAL.green : ok ? PAL.green : PAL.red;
  glow(g, c, 10, () => {
    g.fillStyle = '#2b3a7a';
    g.strokeStyle = c;
    g.lineWidth = 2.5;
    g.fillRect(x - 5, AXY_TOP, 10, 64);
    g.strokeRect(x - 5, AXY_TOP, 10, 64);
  });
  g.fillStyle = '#aab3d8';
  for (let k = 0; k < 6; k++) {
    g.fillRect(x - 8, AXY_TOP + 4 + k * 10, 3, 4);
    g.fillRect(x + 5, AXY_TOP + 4 + k * 10, 3, 4);
  }
  g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 7);
  g.fillStyle = c;
  g.fillRect(x - 2, AXY_TOP + 2, 4, 3);
  g.globalAlpha = 1;
}

// ---- the camera screen -----------------------------------------------------------------------------------------------

const BG_STARS = Array.from({ length: 16 }, () => ({ a: rnd() * 6.28, d: rnd() * 52, r: 0.7 + rnd() * 1.1 }));

/** Stacked soft discs: a blob whose radius grows with the defocus. */
function blob(g: G, x: number, y: number, rx: number, ry: number, rot: number, color: string, blur: number, alpha: number) {
  g.fillStyle = color;
  for (let k = 0; k <= 6; k++) {
    g.globalAlpha = alpha * (k === 0 ? 0.5 : 0.17);
    g.beginPath();
    g.ellipse(x, y, rx + (blur * k) / 6, ry + (blur * k) / 6, rot, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

function chord(g: G, cx: number, cy: number, r: number, off: number, color: string, w: number) {
  const hc = Math.sqrt(Math.max(0, r * r - off * off));
  line(g, cx - hc, cy + off, cx + hc, cy + off, color, w);
}

/** The planet as the sensor records it: pin-sharp (banded, with rings, spot and moons) at blur 0, a soft blob otherwise. */
export function planetPic(g: G, kind: Planet, cx: number, cy: number, blur: number, t: number) {
  const sharp = blur < 0.5;
  // background stars: sharp points, or swollen soft halos
  for (const s of BG_STARS) {
    const sx = cx + Math.cos(s.a) * s.d;
    const sy = cy + Math.sin(s.a) * s.d;
    if (sharp) {
      g.fillStyle = '#fff';
      g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + s.a * 5);
      g.beginPath();
      g.arc(sx, sy, s.r, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    } else blob(g, sx, sy, s.r, s.r, 0, '#cfd8ff', blur * 0.5, 0.7);
  }
  if (kind === 'Saturn') {
    const r = 15;
    const tilt = -0.38;
    if (!sharp) {
      blob(g, cx, cy, r, r, 0, '#ecd29a', blur, 0.9);
      blob(g, cx, cy, 32, 8, tilt, '#d9b97a', blur, 0.5);
      blob(g, cx + 38, cy - 20, 2.5, 2.5, 0, '#fff', blur, 0.7);
      return;
    }
    const ring = (rx: number, ry: number, from: number, to: number, color: string, w: number) => {
      g.save();
      g.translate(cx, cy);
      g.rotate(tilt);
      g.strokeStyle = color;
      g.lineWidth = w;
      g.beginPath();
      g.ellipse(0, 0, rx, ry, 0, from, to);
      g.stroke();
      g.restore();
    };
    ring(31, 8, Math.PI, Math.PI * 2, '#c9a96a', 3);
    ring(25, 6.4, Math.PI, Math.PI * 2, '#e3c98c', 3);
    g.fillStyle = '#ecd29a';
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    for (const [off, c] of [[-8, '#c9a56b'], [-2, '#f6e3b4'], [5, '#bf9a60'], [10, '#d9bd84']] as [number, string][]) chord(g, cx, cy, r, off, c, 2.6);
    ring(31, 8, 0, Math.PI, '#c9a96a', 3);
    ring(25, 6.4, 0, Math.PI, '#e3c98c', 3);
    ring(28, 7.2, 0, Math.PI, 'rgba(5,6,13,0.9)', 1.2); // the Cassini gap
    ring(28, 7.2, Math.PI, Math.PI * 2, 'rgba(5,6,13,0.9)', 1.2);
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(cx + 38, cy - 20, 2.4, 0, Math.PI * 2); // Titan
    g.fill();
    return;
  }
  if (kind === 'Jupiter') {
    const r = 20;
    if (!sharp) {
      blob(g, cx, cy, r, r, 0, '#f0c9a0', blur, 0.9);
      for (const dx of [-46, -34, 32, 46]) blob(g, cx + dx, cy - 2, 1.8, 1.8, 0, '#fff', blur, 0.7);
      return;
    }
    g.fillStyle = '#f0d9b5';
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    for (const [off, c] of [[-14, '#b8825a'], [-8, '#f6e6c8'], [-2, '#c4936a'], [4, '#f1dcc0'], [10, '#b27a52'], [16, '#e8cfae']] as [number, string][]) chord(g, cx, cy, r, off, c, 3);
    g.fillStyle = '#d2482e';
    g.beginPath();
    g.ellipse(cx + 8, cy + 8, 5.5, 3.2, 0.1, 0, Math.PI * 2); // the Great Red Spot
    g.fill();
    g.fillStyle = '#fff';
    for (const dx of [-46, -34, 32, 46]) {
      g.beginPath();
      g.arc(cx + dx, cy - 2, 1.9, 0, Math.PI * 2); // the four Galilean moons in a line
      g.fill();
    }
    return;
  }
  const r = 10;
  if (!sharp) {
    blob(g, cx, cy, r, r, 0, '#6f9bff', blur, 0.85);
    blob(g, cx + 22, cy - 12, 1.7, 1.7, 0, '#fff', blur, 0.6);
    return;
  }
  g.fillStyle = '#5b8cff';
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  chord(g, cx, cy, r, -3, '#7aa4ff', 2);
  chord(g, cx, cy, r, 4, '#3f6fe0', 2);
  g.fillStyle = '#2f55b8';
  g.beginPath();
  g.ellipse(cx - 3, cy + 2, 3, 1.8, 0, 0, Math.PI * 2); // the Great Dark Spot
  g.fill();
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(cx + 22, cy - 12, 1.7, 0, Math.PI * 2); // Triton
  g.fill();
}

export interface ScreenState {
  planet: Planet;
  /** The blur radius to show, or null for a dark screen. */
  blur: number | null;
  /** 0..1: how far the exposure has developed. */
  develop: number;
  /** 0..1 shutter: 1 is closed. */
  shutter: number;
  ok: boolean | null;
  label: string;
  stamp: boolean;
}

/** The round camera screen (radius 60): bezel, glass, and the planet as recorded. Neptune sits behind a thin drifting cloud. */
export function cameraScreen(g: G, cx: number, cy: number, t: number, s: ScreenState) {
  const R = 60;
  g.fillStyle = '#20263f';
  g.beginPath();
  g.arc(cx, cy, R + 7, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#05060d';
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();
  if (s.blur !== null && s.shutter < 1) {
    g.save();
    g.beginPath();
    g.arc(cx, cy, R - 1, 0, Math.PI * 2);
    g.clip();
    g.globalAlpha = Math.max(0, Math.min(1, s.develop));
    planetPic(g, s.planet, cx, cy, s.blur, t);
    if (s.planet === 'Neptune') {
      for (let k = 0; k < 3; k++) {
        const ox = ((t * 9 + k * 55) % 190) - 70;
        g.globalAlpha = 0.17 * Math.max(0, Math.min(1, s.develop));
        g.fillStyle = '#b8c4ff';
        g.beginPath();
        g.ellipse(cx + ox - 30, cy - 18 + k * 17, 46, 9, 0.1, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    g.restore();
  } else if (s.blur === null && s.label) {
    text(g, '?', cx, cy + 12, PAL.dim, 36);
    text(g, s.label, cx, cy + 36, PAL.dim, 9);
  }
  // shutter iris: closes and opens at the moment of exposure
  if (s.shutter > 0) {
    g.fillStyle = '#05060d';
    g.beginPath();
    g.arc(cx, cy, R * Math.min(1, s.shutter), 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = PAL.dim;
    g.lineWidth = 1.5;
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      line(g, cx, cy, cx + Math.cos(a) * R * s.shutter, cy + Math.sin(a) * R * s.shutter, PAL.dim, 1);
    }
  }
  g.strokeStyle = s.ok === null ? PAL.cyan : s.ok ? PAL.green : PAL.red;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 0.18;
  g.strokeStyle = '#fff';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, R - 7, Math.PI * 1.15, Math.PI * 1.45);
  g.stroke();
  g.globalAlpha = 1;
  if (s.stamp) {
    g.save();
    g.translate(cx, cy + 4);
    g.rotate(-0.28);
    g.strokeStyle = PAL.red;
    g.lineWidth = 3;
    g.strokeRect(-42, -13, 84, 26);
    text(g, 'BLURRY', 0, 7, PAL.red, 19);
    g.restore();
  }
}

/** A tiny photo flying from the camera screen to the journal, then pinned. `f` runs 0..1. */
export function flyingPhoto(g: G, planet: Planet, from: [number, number], to: [number, number], f: number) {
  const e = f * f * (3 - 2 * f);
  const x = from[0] + (to[0] - from[0]) * e;
  const y = from[1] + (to[1] - from[1]) * e - Math.sin(e * Math.PI) * 50;
  g.save();
  g.translate(x, y);
  g.rotate((1 - e) * 0.5);
  g.fillStyle = '#f4f6ff';
  g.fillRect(-11, -11, 22, 22);
  g.fillStyle = '#05060d';
  g.fillRect(-9, -9, 18, 15);
  g.fillStyle = planetColor(planet);
  g.beginPath();
  g.arc(0, -2, 4, 0, Math.PI * 2);
  g.fill();
  g.restore();
  if (f > 0.95) {
    glow(g, PAL.yellow, 10, () => {
      g.fillStyle = PAL.yellow;
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const q = (i * Math.PI) / 5 - Math.PI / 2;
        const rr = i % 2 ? 3 : 7;
        g.lineTo(x + Math.cos(q) * rr, y - 16 + Math.sin(q) * rr);
      }
      g.fill();
    });
  }
}
