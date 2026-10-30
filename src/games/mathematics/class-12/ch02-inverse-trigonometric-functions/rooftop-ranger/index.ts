// Inspirations: Hitman Sniper and Sniper Elite (a scope with an elevation turret and a range turret, one shot, a replay of
// where the round went) and Angry Birds (aim, fire, watch the consequence). The scope's swing is the principal branch.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { along, glow, line, text } from '@core/neon';
import { DIAL, GROUND, KINDS, ORIGIN, STEP, absSurd, angleText, buildRounds, explain, frame, intel, judge, missEnd, missText, piText, rayEnd, spotterText, surdText, type Frame, type Kind, type Round } from './logic';

type G = CanvasRenderingContext2D;
const SCENE_W = 480;
/** The dial on the right of the screen: tilt is a right half-circle, bearing an upper half-circle. */
const KNOB = { tilt: { cx: 540, cy: 172, R: 58 }, pan: { cx: 560, cy: 250, R: 58 } };
const TRACK = { x0: 500, x1: 624, y: 322 };
const FLIGHT = 0.9;

const HEROES: Record<Kind, { story: string; objective: string }> = {
  street: {
    story: 'Runaway delivery robots roll down Neon Street after dark, and only their heat blips show on the map. Hawk lies on a roof with a stun rifle whose scope tilts from straight down (−π/2) to straight up (π/2). The tangent of the tilt is rise over run: the roof height, downward so negative, over the street distance.',
    objective: 'Tilt the scope to the one angle that stuns the robot, in three rounds. The laser sight only works in round 1; a spotter call costs a charge.',
  },
  range: {
    story: 'Long shots drop. The rifle has a second dial, the range turret, which must be set to the straight-line distance to the target so the scope allows for the drop. The map gives only the roof height and the street distance, and the line of sight is the hypotenuse of that triangle.',
    objective: 'Set the tilt and the range turret so the round lands on the robot, in three rounds.',
  },
  sky: {
    story: 'Hawk now works from a balcony halfway up a tower. Drones hover above, and robots crawl on the ledges below. The laser range-finder gives the straight-line distance and the height of the target above or below the scope. The sine of the tilt is that height over the range: up is positive, down is negative. The scope still turns only from −π/2 to π/2.',
    objective: 'Tilt to the one angle that hits each target, whether it is above you or below, in three rounds.',
  },
  turret: {
    story: 'The robots’ leader hides in the square in front of a long wall. Hawk bolts a turret to the wall. It swings from due east (0) through straight out (π/2) to due west (π), and never behind the wall. The cosine of the bearing is the east offset over the range; offsets to the west are negative.',
    objective: 'Swing the turret to the one bearing that hits the robot, in three rounds. The boss hides on the west side.',
  },
  gadget: {
    story: 'Hawk’s new gadget scope is wired backwards: it shows sec, cosec or cot of the angle instead of the angle. Each reciprocal function has its own principal branch, and only the angle in that branch hits.',
    objective: 'Read the gadget, find the angle in the right branch, and stun all three targets.',
  },
};
const FIRE = { button: '🎯 Fire', aria: 'Fire the shot' };

function backdrop(g: G, t: number) {
  g.fillStyle = '#060a24';
  g.fillRect(0, 0, SCENE_W, 340);
  g.fillStyle = 'rgba(40,50,140,0.35)';
  g.fillRect(0, 170, SCENE_W, 170);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 26; i++) {
    const x = (i * 97) % SCENE_W;
    const y = (i * 53) % 150;
    g.globalAlpha = 0.3 + 0.3 * Math.sin(t * 2 + i);
    g.fillRect(x, y, 2, 2);
  }
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(40,50,120,0.55)';
  [[150, 120], [205, 160], [262, 105], [330, 150], [392, 125], [440, 170]].forEach(([x, top]) => g.fillRect(x, top, 46, 340 - top));
  g.fillStyle = 'rgba(255,210,63,0.25)';
  for (let i = 0; i < 20; i++) g.fillRect(156 + ((i * 47) % 300), 140 + ((i * 31) % 120), 6, 8);
}

/** A boxy robot standing on (x, y), eyes glowing; it falls apart when stunned. */
function robot(g: G, x: number, y: number, t: number, stunned: number) {
  if (stunned > 0) {
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + 0.4;
      g.fillStyle = i % 2 ? PAL.orange : PAL.dim;
      g.fillRect(x + Math.cos(a) * 18 * stunned - 4, y - 8 + Math.sin(a) * 10 * stunned, 8, 6);
    }
    return;
  }
  const bob = Math.sin(t * 6) * 1.5;
  glow(g, PAL.red, 10, () => {
    g.fillStyle = '#3a1838';
    g.fillRect(x - 12, y - 30 + bob, 24, 22);
    g.fillRect(x - 9, y - 44 + bob, 18, 13);
  });
  g.fillStyle = PAL.red;
  g.fillRect(x - 6, y - 40 + bob, 4, 4);
  g.fillRect(x + 2, y - 40 + bob, 4, 4);
  line(g, x, y - 44 + bob, x, y - 52 + bob, PAL.dim, 2);
  g.fillStyle = PAL.orange;
  g.beginPath();
  g.arc(x, y - 53 + bob, 2.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PAL.dim;
  g.beginPath();
  g.arc(x - 7, y - 5, 4, 0, Math.PI * 2);
  g.arc(x + 7, y - 5, 4, 0, Math.PI * 2);
  g.fill();
}

/** A hovering drone centred on (x, y). */
function drone(g: G, x: number, y: number, t: number, stunned: number) {
  if (stunned > 0) {
    robot(g, x, y + 10, t, stunned);
    return;
  }
  const yy = y + Math.sin(t * 4) * 2;
  glow(g, PAL.pink, 10, () => {
    g.fillStyle = '#3a1838';
    g.beginPath();
    g.ellipse(x, yy, 16, 7, 0, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = PAL.pink;
  g.fillRect(x - 3, yy - 2, 6, 4);
  const spin = Math.abs(Math.sin(t * 30)) * 10 + 3;
  line(g, x - 20 - spin / 2, yy - 9, x - 20 + spin / 2, yy - 9, PAL.white, 2);
  line(g, x + 20 - spin / 2, yy - 9, x + 20 + spin / 2, yy - 9, PAL.white, 2);
  line(g, x - 14, yy - 4, x - 20, yy - 9, PAL.dim, 1.5);
  line(g, x + 14, yy - 4, x + 20, yy - 9, PAL.dim, 1.5);
}

function arrowLabel(g: G, x1: number, y1: number, x2: number, y2: number, s: string, lx: number, ly: number, align: CanvasTextAlign = 'center') {
  line(g, x1, y1, x2, y2, PAL.yellow, 1.5, [4, 4]);
  text(g, s, lx, ly, PAL.yellow, 12, align);
}

type Mood = 'happy' | 'worried' | 'cheer';
const SKIN = '#e9b98f';
const OLIVE = '#3d5a3a';
const DARK = '#1b1030';

/** The shooter's head: a helmet with a glowing rim; one eye squints down the scope while aiming. */
function head(g: G, x: number, y: number, R: number, t: number, mood: Mood, aiming: boolean) {
  g.fillStyle = SKIN;
  g.beginPath();
  g.arc(x, y, R, 0, Math.PI * 2);
  g.fill();
  glow(g, PAL.cyan, 6, () => {
    g.fillStyle = OLIVE;
    g.beginPath();
    g.arc(x, y - R * 0.15, R * 1.12, Math.PI, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = OLIVE;
  g.fillRect(x - R * 1.3, y - R * 0.22, R * 2.6, R * 0.3);
  line(g, x - R * 1.15, y - R * 0.22, x + R * 1.15, y - R * 0.22, PAL.cyan, 1);
  const ey = y + R * 0.2;
  g.fillStyle = DARK;
  g.beginPath();
  if (aiming && mood === 'happy') line(g, x - R * 0.6, ey, x - R * 0.15, ey, DARK, 1.6);
  else g.arc(x - R * 0.35, ey, R * 0.14, 0, Math.PI * 2);
  g.arc(x + R * 0.4, ey, R * 0.14, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = DARK;
  g.lineWidth = 1.5;
  g.beginPath();
  if (mood === 'cheer') g.arc(x + R * 0.05, y + R * 0.42, R * 0.34, 0.1 * Math.PI, 0.9 * Math.PI);
  else if (mood === 'worried') g.arc(x + R * 0.05, y + R * 0.82, R * 0.28, 1.15 * Math.PI, 1.85 * Math.PI);
  else {
    g.moveTo(x - R * 0.15, y + R * 0.58);
    g.lineTo(x + R * 0.32, y + R * 0.58);
  }
  g.stroke();
  if (mood === 'worried') {
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.arc(x - R * 0.95, y + R * 0.1 + ((t * 18) % 6), R * 0.17, 0, Math.PI * 2);
    g.fill();
  }
}

/** A scoped rifle held at the shoulder (sx, sy), pointing at screen angle a; returns the muzzle. */
function rifle(g: G, sx: number, sy: number, a: number, len: number, t: number, flash: boolean): [number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const at = (d: number, off = 0): [number, number] => [sx + c * d - s * off, sy + s * d + c * off];
  const seg = (d0: number, d1: number, off: number, color: string, w: number) => {
    const [x0, y0] = at(d0, off);
    const [x1, y1] = at(d1, off);
    line(g, x0, y0, x1, y1, color, w);
  };
  seg(-10, 6, 1, '#6b5040', 6);
  seg(2, len, 0, '#aab3d8', 3);
  seg(2, 9, 2.5, '#20263f', 4);
  seg(3, 15, -5, '#20263f', 5);
  seg(1, 3, -2.5, '#20263f', 2);
  const [gx, gy] = at(15.5, -5);
  g.globalAlpha = 0.55 + 0.45 * Math.sin(t * 3);
  glow(g, PAL.cyan, 8, () => {
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.arc(gx, gy, 2, 0, Math.PI * 2);
    g.fill();
  });
  g.globalAlpha = 1;
  const [mx, my] = at(len);
  if (flash) {
    glow(g, PAL.yellow, 16, () => {
      g.fillStyle = PAL.yellow;
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const q = a + (i * Math.PI) / 5;
        const R = i % 2 ? 4 : 11;
        g.lineTo(mx + Math.cos(q) * R, my + Math.sin(q) * R);
      }
      g.fill();
    });
  }
  return [mx, my];
}

/**
 * The ranger: prone on the roof (street, range), kneeling on the balcony (sky), or behind a gun on the wall
 * (turret, seen from above). While aiming the rifle stays in its rest pose, so the picture never shows the tilt;
 * when the shot is fired it swings to the shot's line, kicks back and flashes. Returns the muzzle for the tracer.
 */
function shooter(g: G, kind: Frame, t: number, mood: Mood, aim: number | null, rt: number): [number, number] {
  const [ox, oy] = ORIGIN[kind];
  const kick = aim === null ? 0 : Math.max(0, 1 - rt * 6) * 4;
  const flash = aim !== null && rt < 0.12;
  const aiming = aim === null || mood === 'happy';
  const breathe = Math.sin(t * 2.2) * 0.8;
  if (kind === 'turret') {
    g.fillStyle = OLIVE;
    g.beginPath();
    g.ellipse(ox, oy + 30, 17, 7, 0, 0, Math.PI * 2);
    g.fill();
    head(g, ox, oy + 19 + breathe * 0.5, 9, t, mood, aiming);
    const a = aim ?? -Math.PI / 2;
    const [kx, ky] = [ox - Math.cos(a) * kick, oy - Math.sin(a) * kick];
    g.fillStyle = '#20263f';
    g.beginPath();
    g.arc(kx, ky, 9, 0, Math.PI * 2);
    g.fill();
    return rifle(g, kx, ky, a, 28, t, flash);
  }
  const prone = kind !== 'sky';
  const S: [number, number] = prone ? [ox - 22, oy - 4 + breathe * 0.3] : [ox - 20, oy - 6 + breathe * 0.4];
  const rest = Math.atan2(oy - S[1], ox - S[0]);
  const len = Math.hypot(ox - S[0], oy - S[1]);
  const a = aim ?? rest;
  const sx = S[0] - Math.cos(a) * kick;
  const sy = S[1] - Math.sin(a) * kick;
  if (prone) {
    const top = oy + 4;
    line(g, 16, top - 2, 34, top - 4, '#33482f', 6);
    line(g, 18, top - 1, 36, top - 2, OLIVE, 5);
    g.fillStyle = '#20263f';
    g.fillRect(12, top - 6, 5, 6);
    g.fillStyle = OLIVE;
    g.beginPath();
    g.ellipse(44, top - 7 + breathe * 0.3, 14, 6, -0.08, 0, Math.PI * 2);
    g.fill();
    line(g, 48, top - 6, sx + Math.cos(a) * 6, sy + Math.sin(a) * 6, OLIVE, 4);
    if (aim === null) {
      line(g, ox - 6, oy, ox - 9, top, '#aab3d8', 1.5);
      line(g, ox - 6, oy, ox - 3, top, '#aab3d8', 1.5);
    }
    head(g, sx - 3, sy - 10, 7, t, mood, aiming);
  } else {
    const floor = oy + 4;
    g.fillStyle = OLIVE;
    g.fillRect(40, oy - 26 + breathe * 0.4, 15, 22);
    line(g, 44, oy - 4, 40, floor, '#33482f', 6);
    line(g, 50, oy - 4, 62, oy - 2, OLIVE, 6);
    line(g, 62, oy - 2, 62, floor, OLIVE, 5);
    g.fillStyle = '#20263f';
    g.fillRect(36, floor - 4, 8, 4);
    g.fillRect(60, floor - 4, 8, 4);
    line(g, 50, oy - 20, sx + Math.cos(a) * 5, sy + Math.sin(a) * 5, OLIVE, 4);
    head(g, 49, oy - 34 + breathe * 0.4, 8, t, mood, aiming);
  }
  return rifle(g, sx, sy, a, len, t, flash);
}

function sceneStreet(g: G, r: Round) {
  const [ox, oy] = ORIGIN[frame(r)];
  const gy = GROUND[frame(r)];
  g.fillStyle = '#141a4a';
  g.fillRect(14, oy + 4, ox - 14, gy - oy - 4);
  g.fillStyle = 'rgba(255,210,63,0.35)';
  for (let j = 0; j < 6; j++) for (let i = 0; i < 2; i++) g.fillRect(26 + i * 24, oy + 22 + j * 30, 10, 12);
  line(g, ox, gy, SCENE_W, gy, PAL.dim, 3);
  line(g, 14, oy + 4, ox, oy + 4, PAL.cyan, 2);
  arrowLabel(g, ox + 8, oy + 4, ox + 8, gy, `h = ${surdText(r.h!)} m`, ox + 14, (oy + gy) / 2, 'left');
  arrowLabel(g, ox, gy + 18, r.vx, gy + 18, `d = ${surdText(r.d!)} m`, (ox + r.vx) / 2, gy + 34);
  if (r.kind === 'range') {
    line(g, ox, oy, r.vx, gy - 20, 'rgba(255,210,63,0.35)', 1, [2, 6]);
    text(g, 'line of sight r = ?', (ox + r.vx) / 2 + 30, (oy + gy) / 2 - 18, PAL.yellow, 12);
  }
}

function sceneSky(g: G, r: Round) {
  const [ox, oy] = ORIGIN.sky;
  g.fillStyle = '#141a4a';
  g.fillRect(14, 0, ox - 14, 340);
  g.fillStyle = 'rgba(255,210,63,0.35)';
  for (let j = 0; j < 10; j++) for (let i = 0; i < 2; i++) g.fillRect(26 + i * 24, 14 + j * 32, 10, 12);
  g.fillStyle = '#060a24';
  g.fillRect(28, oy - 46, ox - 28, 50);
  line(g, 14, oy + 4, ox + 12, oy + 4, PAL.cyan, 3);
  line(g, ox + 8, oy, SCENE_W, oy, 'rgba(255,255,255,0.18)', 1, [3, 6]);
  if (r.k < 0) line(g, r.vx - 26, r.vy, r.vx + 26, r.vy, PAL.dim, 3);
  // A gadget round names the sides but gives no numbers: the scope's screen is the only reading.
  const gad = r.kind === 'gadget';
  arrowLabel(g, r.vx + 26, oy, r.vx + 26, r.vy, gad ? 'height y' : `${r.y!.c > 0 ? 'up' : 'down'} ${surdText(absSurd(r.y!))} m`, r.vx + 32, (oy + r.vy) / 2, 'left');
  line(g, ox + 8, oy, r.vx, r.vy, 'rgba(255,210,63,0.35)', 1, [2, 6]);
  text(g, gad ? 'range r' : `range ${r.r} m`, (ox + r.vx) / 2 - 10, (oy + r.vy) / 2 + (r.k > 0 ? 18 : -10), PAL.yellow, 12);
}

function sceneTurret(g: G, r: Round) {
  const [ox, oy] = ORIGIN.turret;
  g.fillStyle = 'rgba(130,160,255,0.08)';
  for (let i = 0; i < 8; i++) g.fillRect(i * 64, 0, 2, oy);
  for (let j = 0; j < 5; j++) g.fillRect(0, j * 64, SCENE_W, 2);
  g.fillStyle = '#141a4a';
  g.fillRect(0, oy, SCENE_W, 340 - oy);
  line(g, 0, oy, SCENE_W, oy, PAL.cyan, 4);
  text(g, 'WALL', 40, oy + 26, PAL.dim, 11);
  text(g, '← west', 70, 24, PAL.dim, 11);
  text(g, 'east →', 410, 24, PAL.dim, 11);
  // A gadget round names the sides but gives no numbers: the scope's screen is the only reading.
  const gad = r.kind === 'gadget';
  if (r.x!.c !== 0) arrowLabel(g, ox, r.vy, r.vx, r.vy, gad ? 'east offset x' : `${surdText({ c: Math.abs(r.x!.c), root: r.x!.root })} m ${r.x!.c > 0 ? 'east' : 'west'}`, (ox + r.vx) / 2, r.vy - 22);
  line(g, ox, oy, r.vx, r.vy, 'rgba(255,210,63,0.35)', 1, [2, 6]);
  if (gad && r.fn === 'cot') arrowLabel(g, r.vx, oy, r.vx, r.vy, 'height y', r.vx + (r.vx >= ox ? 6 : -6), (oy + r.vy) / 2, r.vx >= ox ? 'left' : 'right');
  else text(g, gad ? 'range r' : `range ${r.r} m`, (ox + r.vx) / 2 + (r.vx >= ox ? 36 : -36), (oy + r.vy) / 2 + 10, PAL.yellow, 12);
}

/**
 * The gadget scope's cracked screen, bolted beside the shooter: it shows sec θ, cosec θ or cot θ, never θ.
 * It sits at the same place whatever the dial says, so it carries no hint of the angle.
 */
function gadgetScreen(g: G, r: Round, f: Frame, t: number) {
  const [ox, oy] = ORIGIN[f];
  const w = 128;
  const h = 26;
  const [px, py] = f === 'sky' ? [20, 40] : [ox - 176, oy + 8];
  const [tx, ty, hx, hy] = f === 'sky' ? [px + w / 2, py + h, 49, oy - 42] : [px + w, py + h / 2, ox - 17, oy + 18];
  line(g, tx, ty, hx, hy, PAL.dim, 1.5);
  g.fillStyle = '#04081c';
  g.fillRect(px, py, w, h);
  glow(g, PAL.green, 6, () => {
    g.strokeStyle = PAL.green;
    g.lineWidth = 1.5;
    g.strokeRect(px, py, w, h);
  });
  const flick = 0.8 + 0.2 * Math.sin(t * 37) * Math.sin(t * 5.3);
  g.globalAlpha = Math.max(0.55, Math.min(1, flick));
  glow(g, PAL.green, 6, () => text(g, `${r.fn} θ = ${r.ratio}`, px + w / 2, py + 18, PAL.green, 13));
  g.globalAlpha = 1;
  line(g, px + w - 30, py, px + w - 22, py + 10, PAL.dim, 1);
  line(g, px + w - 22, py + 10, px + w - 27, py + 15, PAL.dim, 1);
  line(g, px + w - 22, py + 10, px + w - 12, py + h, PAL.dim, 1);
}

function knob(g: G, kind: Frame, k: number, range?: number) {
  g.fillStyle = 'rgba(8,12,40,0.85)';
  g.fillRect(486, 0, 154, 340);
  line(g, 486, 0, 486, 340, PAL.grid, 2);
  const pan = kind === 'turret';
  const { cx, cy, R } = pan ? KNOB.pan : KNOB.tilt;
  const a0 = pan ? 0 : -Math.PI / 2;
  const a1 = pan ? Math.PI : Math.PI / 2;
  text(g, pan ? 'TURRET BEARING' : 'SCOPE TILT', 563, pan ? 156 : 80, PAL.white, 12);
  g.strokeStyle = PAL.dim;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, R, -a1, -a0);
  g.stroke();
  for (let s = Math.round(a0 / STEP); s <= Math.round(a1 / STEP); s++) {
    const a = s * STEP;
    const big = s % 2 === 0;
    line(g, cx + (R - (big ? 9 : 5)) * Math.cos(a), cy - (R - (big ? 9 : 5)) * Math.sin(a), cx + R * Math.cos(a), cy - R * Math.sin(a), PAL.dim, big ? 2 : 1);
    if (big) text(g, piText(s), cx + (R + 15) * Math.cos(a), cy - (R + 15) * Math.sin(a) + 4, PAL.dim, 10);
  }
  const a = k * STEP;
  glow(g, PAL.cyan, 8, () => line(g, cx, cy, cx + (R - 4) * Math.cos(a), cy - (R - 4) * Math.sin(a), PAL.cyan, 3));
  text(g, angleText(k), 563, pan ? 282 : 262, PAL.cyan, 14);
  text(g, pan ? 'swing: [0, π]' : 'swing: [−π/2, π/2]', 563, pan ? 302 : 282, PAL.dim, 10);
  if (range !== undefined) {
    text(g, `RANGE ${range} m`, 563, 306, PAL.white, 12);
    line(g, TRACK.x0, TRACK.y, TRACK.x1, TRACK.y, PAL.dim, 3);
  }
}

function level(kind: Kind, random: () => number): DialLevel<Round> {
  // The dial is a bearing (pan) in a turret scene and a tilt in the others. A gadget level switches per round.
  const gad = kind === 'gadget';
  const isPan = (r: Round) => frame(r) === 'turret';
  const dialOf = (r: Round) => (isPan(r) ? DIAL.pan : DIAL.tilt);
  const knobOf = (r: Round) => (isPan(r) ? KNOB.pan : KNOB.tilt);
  // What the last shot did, so a miss can pop where the player's own shot ended (never on the true target).
  let fired: { ok: boolean; k: number; range?: number } = { ok: false, k: 0 };
  const toRange = (px: number) => DIAL.range.min + ((px - TRACK.x0) / (TRACK.x1 - TRACK.x0)) * (DIAL.range.max - DIAL.range.min);
  const fromRange = (v: number) => TRACK.x0 + ((v - DIAL.range.min) / (DIAL.range.max - DIAL.range.min)) * (TRACK.x1 - TRACK.x0);
  const L: DialLevel<Round> = {
    hero: { name: 'Hawk', role: 'a rooftop ranger who guards Neon Street from runaway robots at night', ...HEROES[kind] },
    rounds: buildRounds(KINDS.indexOf(kind) + 1, random),
    charges: [1, 1, 0],
    dials: [
      {
        key: 'k',
        aria: gad ? 'Aim angle in steps of pi over 12' : kind === 'turret' ? 'Turret bearing in steps of pi over 12' : 'Scope tilt in steps of pi over 12',
        label: gad ? 'Aim angle' : kind === 'turret' ? 'Turret bearing' : 'Scope tilt',
        unit: '',
        step: 1,
        min: (r: Round) => dialOf(r).min,
        max: (r: Round) => dialOf(r).max,
        // One constant start in every round and level: 0 is never an answer (a tilt answer is never level, a bearing answer is never due east or due
        // west), so the start never wins and, being the same everywhere, tells nothing. (A start of straight out, 6, moved to 0 on the rounds whose
        // answer was 6, and that move told the answer.)
        start: () => 0,
        text: angleText,
      },
      ...(kind === 'range' ? [{ key: 'r', aria: 'Range turret in metres', label: 'Range turret', unit: 'm', step: 1, min: DIAL.range.min, max: DIAL.range.max, start: 20 }] : []),
    ],
    handles: [
      {
        dial: 'k',
        at: (r, v) => {
          const K = knobOf(r);
          return [K.cx + K.R * Math.cos(v.k * STEP), K.cy - K.R * Math.sin(v.k * STEP)];
        },
        drag: (r, px, py) => {
          const K = knobOf(r);
          const pan = isPan(r);
          let a = Math.atan2(K.cy - py, px - K.cx);
          if (pan && a < 0) a = px >= K.cx ? 0 : Math.PI;
          if (!pan && Math.abs(a) > Math.PI / 2) a = Math.sign(a) * (Math.PI / 2);
          return Math.round(a / STEP);
        },
        radius: 20,
      },
      ...(kind === 'range' ? [{ dial: 'r', at: (_r: Round, v: Record<string, number>): [number, number] => [fromRange(v.r), TRACK.y], drag: (_r: Round, px: number) => toRange(px), radius: 16 }] : []),
    ],
    test: { button: '📡 Spotter', aria: 'Call the spotter: where would this shot go', read: (r, v) => spotterText(r, { k: v.k, range: v.r }) },
    fire: FIRE,
    judge: (r, v) => {
      const ok = judge(r, { k: v.k, range: v.r });
      fired = { ok, k: v.k, range: v.r };
      return ok;
    },
    miss: (r, v) => missText(r, { k: v.k, range: v.r }),
    win: (r) => `Stunned! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The laser sight is on this round.' : r.assist === 1 ? 'Laser sight off: a spotter call costs a charge.' : 'Boss round: no sight, no spotter.'}`,
    hit: (r) => {
      if (gad && !fired.ok) {
        // A gadget miss pops where the tracer of the miss ends (a fixed spot for the side the shot went), never on the target.
        const [ex, ey] = missEnd(r, { k: fired.k, range: fired.range });
        return [Math.max(40, Math.min(440, ex)), Math.max(50, Math.min(310, ey))];
      }
      return [r.vx, r.vy - (r.kind === 'street' || r.kind === 'range' ? 24 : 0)];
    },
    delay: FLIGHT,
    draw: ({ g, r, v, t, rt, shot, A }) => {
      const mood: Mood = shot ? (rt > FLIGHT ? (shot.ok ? 'cheer' : 'worried') : 'happy') : 'happy';
      const f = frame(r);
      backdrop(g, t);
      if (f === 'street' || f === 'range') sceneStreet(g, r);
      else if (f === 'sky') sceneSky(g, r);
      else sceneTurret(g, r);
      const stunned = shot?.ok && rt > FLIGHT ? Math.min(1, (rt - FLIGHT) * 2) : 0;
      if (f === 'sky' && r.k > 0) drone(g, r.vx, r.vy, t, stunned);
      else if (f === 'turret') {
        if (stunned > 0) robot(g, r.vx, r.vy + 16, t, stunned);
        else {
          glow(g, PAL.red, 10, () => {
            g.fillStyle = '#3a1838';
            g.beginPath();
            g.arc(r.vx, r.vy, 13, 0, Math.PI * 2);
            g.fill();
          });
          g.fillStyle = PAL.red;
          g.fillRect(r.vx - 6, r.vy - 3, 4, 4);
          g.fillRect(r.vx + 2, r.vy - 3, 4, 4);
        }
      } else robot(g, r.vx, r.vy, t, stunned);
      const O = ORIGIN[f];
      if (!shot && r.assist === 0) {
        const end = rayEnd(r, v.k, SCENE_W);
        line(g, O[0], O[1], end[0], end[1], 'rgba(77,225,255,0.55)', 1.5, [6, 5]);
      }
      // A hit ends on the target. A miss ends a fixed distance from it on the side the shot went, never in the true geometry (the offsets from the
      // target at two settings would give the angle).
      const end = shot ? (shot.ok ? rayEnd(r, shot.v.k, SCENE_W) : missEnd(r, { k: shot.v.k, range: shot.v.r })) : null;
      A.canvas.dataset.tracer = end ? `${Math.round(end[0])},${Math.round(end[1])}` : '';
      const muzzle = shooter(g, f, t, mood, end ? Math.atan2(end[1] - O[1], end[0] - O[0]) : null, rt);
      if (gad) gadgetScreen(g, r, f, t);
      if (shot && end) {
        const p = Math.min(1, rt / FLIGHT);
        const [bx, by] = along([muzzle, end], p);
        const [tx, ty] = along([muzzle, end], Math.max(0, p - 0.25));
        glow(g, PAL.yellow, 10, () => line(g, tx, ty, bx, by, PAL.yellow, 3));
        if (rt > FLIGHT) glow(g, shot.ok ? PAL.green : PAL.red, 12, () => text(g, shot.ok ? 'TARGET STUNNED' : 'MISS', 240, 50, shot.ok ? PAL.green : PAL.red, 18));
      }
      knob(g, f, v.k, kind === 'range' ? v.r : undefined);
      text(g, 'not to scale', 440, 336, PAL.dim, 9);
    },
  };
  return L;
}

export default defineGame({
  mount(ctx) {
    const kind = KINDS[Math.max(0, Math.min(4, ctx.level - 1))];
    return mountDialLevel(ctx as never, level(kind, ctx.random) as never, 'A night street seen from a rooftop: a ranger, a robot or drone target, and a scope dial that turns only through its principal range.');
  },
});
