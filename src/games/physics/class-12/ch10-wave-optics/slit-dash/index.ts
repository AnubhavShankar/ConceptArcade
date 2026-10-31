// Inspirations: Duck Hunt (aim the laser so a bright stripe lands on the target), Pac-Man (two runners that only meet at the
// gaps in the maze) and Guitar Hero (a power meter you must set to the right level).
import { helperOn, paidFlash } from '@core/aidflash';
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { fmt } from '@core/judge';
import { along, glow, line, orb, text, trace, waveColor } from '@core/neon';
import { GAUGE_GEOM, HIT, HUNT_GEOM, LAMP, LAMP_GEOM, LOCK_GEOM, SLIDERS, fringeWidth, hunterStripeY, gaugeExplain, gaugeMiss, gaugeRounds, hunterExplain, hunterMiss, hunterReading, hunterRounds, intensity, judgeGauge, judgeHunter, judgeLamp, judgeLock, lampDelta, lampExplain, lampMiss, lampReading, lampRounds, lampSide, lockExplain, lockMiss, lockReading, lockRounds, type GaugeRound, type HunterRound, type LampRound, type LockRound } from './logic';

import { goalLine, grip, tag, tint, touched } from './ux';

const css = waveColor;
/** Radius of every drag handle, in scene pixels (at least 18, about 44 px on a phone). */
export const HANDLE_R = 22;

/** The player's own setting in a pill of dark glass, its centre kept between lo and hi so it never leaves the scene. */
function own(g: CanvasRenderingContext2D, s: string, x: number, y: number, lo = 50, hi = 590, color: string = PAL.yellow) {
  const half = (s.length * 6.8 + 10) / 2;
  tag(g, s, Math.max(lo + half, Math.min(hi - half, x)), y, 'center', color, 12);
}

function hunterLevel(random: () => number): DialLevel<HunterRound> {
  const { AX, PX, SX } = HUNT_GEOM;
  const specX = (lam: number) => 70 + ((lam - 380) / 380) * 500;
  const flash = paidFlash();
  return {
    hero: {
      name: 'Kestrel',
      role: 'a laser pointer on a shooting range',
      story: 'Kestrel shines through two narrow slits, and the light makes stripes on the wall. A stripe is bright where the two paths differ by a whole number of wavelengths, so the colour of the laser decides where each stripe falls. The target is fixed.',
      objective: 'Choose the colour of the laser so the bright stripe of the stated order lands on the target, in three rounds. A test shot costs a charge; the live stripes fade.',
    },
    rounds: hunterRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'lam', aria: 'Wavelength of the laser in nanometres', label: 'Laser colour', unit: 'nm', step: SLIDERS.lam.step, min: SLIDERS.lam.min, max: SLIDERS.lam.max, start: SLIDERS.lam.start }],
    handles: [{ dial: 'lam', at: (_r, v) => [specX(v.lam), 312], drag: (_r, px) => 380 + ((px - 70) / 500) * 380, radius: HANDLE_R }],
    test: { button: '🔦 Test shot', aria: 'Test shot: see where the bright stripe lands', read: (r, v) => (flash.paid(), hunterReading(r, v.lam)) },
    fire: { button: '🎯 Fire', aria: 'Fire the laser through the slits' },
    judge: (r, v) => judgeHunter(r, v.lam),
    miss: (r, v) => hunterMiss(r, v.lam),
    win: (r) => `${hunterExplain(r)[0]} ${hunterExplain(r)[1]}`,
    hint: (r) => `Slits ${fmt(r.d)} mm apart, screen ${fmt(r.D)} m away. Target: the ${r.n}th bright stripe, ${fmt(r.x)} mm from the centre. ${r.assist === 0 ? 'The stripes are drawn live.' : r.assist === 1 ? 'The stripes and their spacing show for a moment after a test shot, which costs a charge.' : 'The stripes are hidden: work it out.'}`,
    // a fixed point on the wall, never the target
    hit: () => HIT.hunter,
    delay: 1.2,
    draw: ({ g, r, v, t, rt, shot, k, A }) => {
      tint(g, k, t);
      // The helper (stripes and their spacing): live in round 1, on for 1.5 s after a paid test shot in round 2, never in round 3. A win may show the stripes; a miss never does.
      const helper = helperOn(r.assist, shot?.ok === true, shot ? Infinity : flash.since(t, k));
      A.canvas.dataset.helper = helper ? '1' : '0';
      // the slits and the laser
      orb(g, 40, AX, 14, css(v.lam), t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 54, AX, 108, AX, css(v.lam, 0.7), 3);
      g.fillStyle = PAL.dim;
      g.fillRect(108, 30, 8, AX - 15 - 30);
      g.fillRect(108, AX - 9, 8, 18);
      g.fillRect(108, AX + 15, 8, 290 - AX - 15);
      text(g, 'two slits', 112, 24, PAL.dim, 11);
      // the screen
      // the true stripes are the helper; a miss never shows where the stripes really fall
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(SX, 30, 44, 260);
      if (helper) {
        for (let y = 30; y < 290; y += 2) {
          const x = (AX - y) / PX;
          const I = intensity(x, v.lam, r.D, r.d);
          g.fillStyle = css(v.lam, I);
          g.fillRect(SX, y, 44, 2);
        }
        for (const sl of [-12, 12]) line(g, 116, AX + sl, SX, AX - r.x * PX, css(v.lam, 0.25), 1.2);
      } else text(g, '?', SX + 22, AX + 14, PAL.dim, 40);
      g.strokeStyle = PAL.dim;
      g.lineWidth = 2;
      g.strokeRect(SX, 30, 44, 260);
      line(g, SX - 6, AX, SX, AX, PAL.white, 2);
      text(g, 'centre', SX - 28, AX + 4, PAL.dim, 11);
      // the target
      const ty = AX - r.x * PX;
      glow(g, PAL.yellow, 10, () => {
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(SX + 22, ty, 14, 0, Math.PI * 2);
        g.moveTo(SX + 2, ty);
        g.lineTo(SX + 42, ty);
        g.moveTo(SX + 22, ty - 20);
        g.lineTo(SX + 22, ty + 20);
        g.stroke();
      });
      text(g, `target: stripe ${r.n}`, SX - 16, ty + 4, PAL.yellow, 11, 'right');
      // the fired stripe: on the target for a win, a fixed distance past or short of it for a miss
      if (shot) {
        const y = hunterStripeY(r, v.lam);
        if (y > 24 && y < 296) {
          glow(g, shot.ok ? PAL.green : PAL.red, 10, () => {
            g.fillStyle = shot.ok ? PAL.green : PAL.red;
            g.beginPath();
            g.arc(SX + 22, y, 6, 0, Math.PI * 2);
            g.fill();
          });
        }
        if (rt > 1.2) glow(g, shot.ok ? PAL.green : PAL.red, 12, () => text(g, shot.ok ? 'BULLSEYE' : 'MISSED', 320, 30, shot.ok ? PAL.green : PAL.red, 18));
      }
      // the colour dial
      for (let x = 70; x <= 570; x += 2) {
        g.fillStyle = css(380 + ((x - 70) / 500) * 380);
        g.fillRect(x, 304, 2, 16);
      }
      // the handle's grip with the player's own colour beside it (kept clear of the wall), and a "drag" cue on level 1, round 1
      if (!shot) {
        const cue = k === 0;
        grip(g, A.canvas, t, { x: specX(v.lam), y: 312, r: HANDLE_R, dir: 'h', read: '', side: 'above', cue });
        own(g, `${fmt(v.lam)} nm${cue && !touched(A.canvas) ? ' · drag' : ''}`, specX(v.lam), 312 - HANDLE_R - 6, 90, 490);
      }
      if (helper) text(g, `stripe spacing ${fmt(fringeWidth(v.lam, r.D, r.d))} mm`, 300, 52, PAL.dim, 11);
      goalLine(g, `Goal: put the ${r.n}th bright stripe on the target`, A.t, shot !== null);
    },
  };
}

function lockLevel(random: () => number): DialLevel<LockRound> {
  const { BASE, PX } = LOCK_GEOM;
  const yOf = (x: number) => BASE - x * PX;
  const flash = paidFlash();
  return {
    hero: {
      name: 'Dot',
      role: 'a chomper racing two coloured stripe patterns at once',
      story: 'Two colours go through the same slits. Each makes its own bright stripes, with its own spacing. The two sets of stripes only line up at certain places, and the closest one to the centre is the prize.',
      objective: 'Put the detector where a bright stripe of each colour falls on the same spot, as near the centre as it can be, in three rounds. A test shot costs a charge; the live help fades.',
    },
    rounds: lockRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'x', aria: 'Distance of the detector from the centre in millimetres', label: 'Detector at', unit: 'mm from the centre', step: SLIDERS.x.step, min: SLIDERS.x.min, max: SLIDERS.x.max, start: SLIDERS.x.start }],
    handles: [{ dial: 'x', at: (_r, v) => [440, yOf(v.x)], drag: (_r, _px, py) => (BASE - py) / PX, radius: HANDLE_R }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the fringe order of each colour here', read: (r, v) => (flash.paid(), lockReading(r, v.x)) },
    fire: { button: '🔒 Lock', aria: 'Lock the detector here' },
    judge: (r, v) => judgeLock(r, v.x),
    miss: (r, v) => lockMiss(r, v.x),
    win: (r) => `${lockExplain(r)[0]} ${lockExplain(r)[1]}`,
    hint: (r) => `Slits ${fmt(r.d)} mm apart, screen ${fmt(r.D)} m away. Colours ${r.lam1} nm and ${r.lam2} nm. ${r.assist === 0 ? 'Marks show where the two patterns meet.' : r.assist === 1 ? 'The patterns show for a moment after a test shot, which costs a charge; the marks are off.' : 'The patterns are hidden until you lock: work it out.'}`,
    // a fixed empty spot between Pac and the detector, never where the two patterns meet
    hit: () => HIT.lock,
    delay: 1.0,
    draw: ({ g, r, v, t, rt, shot, k, A }) => {
      tint(g, k, t);
      // The patterns are the helper: live in round 1, on for 1.5 s after a paid test shot in round 2, never in round 3. They come back after a win only: after a miss they would show where the two colours meet.
      const live = helperOn(r.assist, shot?.ok === true, shot ? Infinity : flash.since(t, k));
      A.canvas.dataset.helper = live ? '1' : '0';
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(470, 40, 30, 270);
      g.fillRect(506, 40, 30, 270);
      if (live) {
        for (let y = 40; y < 310; y += 2) {
          const x = (BASE - y) / PX;
          if (x < 0) continue;
          g.fillStyle = css(r.lam1, intensity(x, r.lam1, r.D, r.d));
          g.fillRect(470, y, 30, 2);
          g.fillStyle = css(r.lam2, intensity(x, r.lam2, r.D, r.d));
          g.fillRect(506, y, 30, 2);
        }
      } else text(g, '?', 503, 180, PAL.dim, 44);
      g.strokeStyle = PAL.dim;
      g.lineWidth = 2;
      g.strokeRect(470, 40, 30, 270);
      g.strokeRect(506, 40, 30, 270);
      text(g, `${r.lam1} nm`, 485, 32, css(r.lam1), 11);
      text(g, `${r.lam2} nm`, 521, 32, css(r.lam2), 11);
      line(g, 460, BASE, 545, BASE, PAL.white, 2);
      text(g, 'centre', 396, BASE + 4, PAL.dim, 11);
      for (let mm = 2; mm <= 12; mm += 2) {
        line(g, 454, yOf(mm), 466, yOf(mm), PAL.dim, 1.5);
        text(g, `${mm}`, 450, yOf(mm) + 4, PAL.dim, 11, 'right');
      }
      if (r.assist === 0 && shot === null) {
        for (let m = 1; m * r.xSol <= 12; m++) glow(g, PAL.green, 8, () => line(g, 540, yOf(m * r.xSol), 556, yOf(m * r.xSol), PAL.green, 3));
        // 20 px below the mark, so the player's own reading beside the bracket never sits on it
        text(g, 'both bright', 590, yOf(r.xSol) + 22, PAL.green, 11);
      }
      // the detector bracket
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      glow(g, col, 8, () => {
        g.strokeStyle = col;
        g.lineWidth = 3;
        g.strokeRect(466, yOf(v.x) - 7, 74, 14);
      });
      tag(g, `${fmt(v.x)} mm`, 560, yOf(v.x) + 4, 'left', col, 12);
      if (!shot) grip(g, A.canvas, t, { x: 440, y: yOf(v.x), r: HANDLE_R, dir: 'v', read: '', side: 'left' });
      orb(g, 90, 175, 22, PAL.yellow, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      text(g, 'Dot', 90, 215, PAL.white, 12);
      goalLine(g, 'Goal: lock the nearest spot where both colours are bright', A.t, shot !== null);
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'DOUBLE BRIGHT' : 'NO MATCH', 250, 40, shot!.ok ? PAL.green : PAL.red, 18));
    },
  };
}

function gaugeLevel(random: () => number): DialLevel<GaugeRound> {
  const { CX, CY, R } = GAUGE_GEOM;
  const flash = paidFlash();
  return {
    hero: {
      name: 'Amp',
      role: 'a power meter in a rhythm game',
      story: 'Two equally strong light waves reach the same spot. Where they add up in step the light is brightest, called K here. A path difference of exactly one wavelength gives that maximum. Move the path difference and the combined brightness changes with the square of a cosine.',
      objective: 'Set the meter to the brightness the waves make at the stated path difference, as a fraction of K, in three rounds. A test shot costs a charge; the live waves fade.',
    },
    rounds: gaugeRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'g', aria: 'Brightness as a fraction of K', label: 'Brightness', unit: '× K', step: SLIDERS.g.step, min: SLIDERS.g.min, max: SLIDERS.g.max, start: SLIDERS.g.start, text: (v) => v.toFixed(2) }],
    handles: [{ dial: 'g', at: (_r, v) => [CX - R * Math.cos(Math.PI * v.g), CY - R * Math.sin(Math.PI * v.g)], drag: (_r, px, py) => 1 - Math.atan2(CY - py, px - CX) / Math.PI, radius: HANDLE_R }],
    test: { button: '🔦 Test shot', aria: 'Test shot: measure the resultant amplitude', read: (r) => (flash.paid(), `The two waves of amplitude a combine to an amplitude of ${Number((2 * Math.abs(Math.cos(Math.PI * r.frac))).toFixed(3))}a here; at a path difference of λ it is 2a.`) },
    fire: { button: '🎸 Play', aria: 'Play the note at this meter reading' },
    judge: (r, v) => judgeGauge(r, v.g),
    miss: (r, v) => gaugeMiss(r, v.g),
    win: (r) => `${gaugeExplain(r)[0]} ${gaugeExplain(r)[1]}`,
    hint: (r) => `Path difference: ${fmt(r.frac)} wavelengths, so φ = ${fmt(r.frac * 360)}°. At a path difference of λ the brightness is K. ${r.assist === 0 ? 'The combined wave is drawn live.' : r.assist === 1 ? 'The waves show for a moment after a test shot, which costs a charge; the combined wave is hidden.' : 'Nothing is drawn: work it out.'}`,
    // below the meter's pivot: no needle ever points there
    hit: () => HIT.gauge,
    delay: 0.8,
    draw: ({ g, r, v, t, rt, shot, k, A }) => {
      tint(g, k, t);
      // The two waves are the helper: live in round 1, on for 1.5 s after a paid test shot in round 2, never in round 3. A win may show them; a miss never does.
      const helper = helperOn(r.assist, shot?.ok === true, shot ? Infinity : flash.since(t, k));
      A.canvas.dataset.helper = helper ? '1' : '0';
      // the two waves, shifted by the path difference
      const lam = 70;
      const baseY = 120;
      const phaseT = t * 2;
      const wave = (x: number, shift: number) => Math.sin(((x - shift * lam) / lam) * Math.PI * 2 - phaseT);
      text(g, 'two equal waves', 190, 40, PAL.dim, 12);
      if (helper) {
        for (const [c, shift] of [[PAL.cyan, 0], [PAL.pink, r.frac]] as [string, number][]) {
          glow(g, c, 6, () => {
            g.strokeStyle = c;
            g.lineWidth = 2.5;
            g.beginPath();
            for (let x = 30; x <= 350; x += 2) {
              const y = baseY - 28 * wave(x, shift);
              if (x === 30) g.moveTo(x, y);
              else g.lineTo(x, y);
            }
            g.stroke();
          });
        }
      }
      if (r.assist === 0 || shot?.ok === true) {
        glow(g, PAL.yellow, 8, () => {
          g.strokeStyle = PAL.yellow;
          g.lineWidth = 3;
          g.beginPath();
          for (let x = 30; x <= 350; x += 2) {
            const y = 240 - 28 * (wave(x, 0) + wave(x, r.frac));
            if (x === 30) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
        });
        text(g, 'sum of the two', 190, 292, PAL.yellow, 12);
      } else text(g, '?', 190, 250, PAL.dim, 40);
      line(g, 30, baseY, 350, baseY, PAL.dim, 1, [4, 5]);
      line(g, 30, 240, 350, 240, PAL.dim, 1, [4, 5]);
      // the meter
      g.strokeStyle = PAL.dim;
      g.lineWidth = 8;
      g.beginPath();
      g.arc(CX, CY, R, Math.PI, 2 * Math.PI);
      g.stroke();
      for (let k = 0; k <= 4; k++) {
        const a = Math.PI * (1 - k / 4);
        line(g, CX + (R - 18) * Math.cos(a), CY - (R - 18) * Math.sin(a), CX + (R + 4) * Math.cos(a), CY - (R + 4) * Math.sin(a), PAL.dim, 2);
        text(g, `${k / 4}`, CX + (R + 20) * Math.cos(a), CY - (R + 20) * Math.sin(a) + 4, PAL.dim, 11);
      }
      text(g, 'K', CX + R + 20, CY + 18, PAL.dim, 11);
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      const ang = Math.PI * (1 - v.g);
      glow(g, col, 8, () => line(g, CX, CY, CX + (R - 10) * Math.cos(ang), CY - (R - 10) * Math.sin(ang), col, 5));
      text(g, `${v.g.toFixed(2)} K`, CX, CY + 30, col, 16);
      if (shot?.ok === true && rt > 0.2) {
        const a2 = Math.PI * (1 - r.sol);
        line(g, CX + (R - 22) * Math.cos(a2), CY - (R - 22) * Math.sin(a2), CX + (R + 8) * Math.cos(a2), CY - (R + 8) * Math.sin(a2), PAL.white, 4);
        text(g, 'the real brightness', CX, CY - R - 34, PAL.white, 11);
      }
      // the needle's grip, and the player's own setting just outside the dial along the needle (kept inside the scene)
      if (!shot) {
        grip(g, A.canvas, t, { x: CX - R * Math.cos(Math.PI * v.g), y: CY - R * Math.sin(Math.PI * v.g), r: HANDLE_R, dir: 'both', read: '', side: 'above' });
        own(g, `${v.g.toFixed(2)} K`, CX - (R + 52) * Math.cos(Math.PI * v.g), Math.max(22, Math.min(330, CY - (R + 52) * Math.sin(Math.PI * v.g))), 345, 600);
      }
      goalLine(g, `Goal: set the meter to the brightness at ${fmt(r.frac)} wavelengths`, A.t, shot !== null);
      orb(g, 70, 300, 14, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      if (rt > 0.8) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'PERFECT NOTE' : 'OFF KEY', 470, 40, shot!.ok ? PAL.green : PAL.red, 18));
    },
  };
}

// ---- level 4: lamps or lasers -----------------------------------------------------------------------------------------------
// Lumi is a handheld light meter. The scene is NOT to scale: the marked point sits at the same place in every round, and nothing
// on the screen, the needle or the burst changes with the true brightness until the run is won.

const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
};
/** A cheap deterministic noise in [0, 1) for flicker and for the drifting phase of separate bulbs. */
const noise = (n: number) => Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;

/** A bench laser: a dark body with cooling fins, a status lamp and a red lens that flares when the run starts. */
function laserGun(g: CanvasRenderingContext2D, x: number, y: number, t: number, rt: number) {
  g.fillStyle = '#2b2a5c';
  rr(g, x - 26, y - 14, 52, 28, 5);
  g.fill();
  g.strokeStyle = PAL.red;
  g.lineWidth = 2;
  g.stroke();
  for (let k = 0; k < 4; k++) line(g, x - 18 + k * 7, y - 10, x - 18 + k * 7, y + 10, PAL.dim, 1.5);
  g.fillStyle = Math.sin(t * 4) > 0 ? PAL.green : PAL.dim;
  g.beginPath();
  g.arc(x + 14, y - 8, 2.5, 0, Math.PI * 2);
  g.fill();
  glow(g, PAL.red, 12, () => {
    g.fillStyle = PAL.red;
    g.beginPath();
    g.arc(x + 28, y, 6, 0, Math.PI * 2);
    g.fill();
  });
  if (rt > 0 && rt < 0.4) glow(g, PAL.red, 14, () => line(g, x + 28 - 20 * rt, y, x + 28 + 40 * rt, y, 'rgba(255,200,200,0.9)', 3));
  text(g, 'LASER', x - 4, y + 4, PAL.red, 11);
}

/** An ordinary bulb: glass, a filament that flickers on its own rhythm, and a screw base. */
function bulb(g: CanvasRenderingContext2D, x: number, y: number, tint: string, t: number, seed: number, rt: number) {
  const flick = 0.7 + 0.3 * noise(Math.floor(t * 9) + seed * 17);
  g.fillStyle = '#4a4f8a';
  g.fillRect(x - 28, y - 6, 13, 12);
  for (let k = 0; k < 3; k++) line(g, x - 26 + k * 4, y - 6, x - 26 + k * 4, y + 6, '#1b1030', 1.5);
  glow(g, tint, 18 * flick + (rt > 0 ? 10 : 0), () => {
    g.fillStyle = tint;
    g.globalAlpha = 0.35 + 0.4 * flick;
    g.beginPath();
    g.arc(x, y, 15, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  });
  g.strokeStyle = PAL.white;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(x, y, 15, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = PAL.orange;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x - 14, y);
  for (let k = 1; k <= 5; k++) g.lineTo(x - 14 + k * 5, y + (k % 2 ? -5 : 5));
  g.stroke();
}

/** Lumi, a handheld light meter: antenna lamp, a display for the meter setting, a sensor eye that looks at the marked point, arms and feet. */
function lumi(g: CanvasRenderingContext2D, x: number, y: number, t: number, rt: number, verdict: 'win' | 'miss' | null, setting: string) {
  const bob = Math.sin(t * 3) * 1.5;
  const by = y + bob;
  const aiming = rt > 0 && verdict === null;
  const col = verdict === 'win' ? PAL.green : verdict === 'miss' ? PAL.red : PAL.yellow;
  // antenna lamp
  line(g, x, by - 32, x, by - 46, PAL.dim, 2);
  glow(g, PAL.yellow, 10, () => {
    g.fillStyle = PAL.yellow;
    g.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 2.5));
    g.beginPath();
    g.arc(x, by - 49, 4, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  });
  // arms and feet
  const up = verdict === 'win';
  line(g, x - 23, by - 6, x - 34, up ? by - 28 : by + 10, PAL.dim, 4);
  line(g, x + 23, by - 6, x + 34, up ? by - 28 : by + 10, PAL.dim, 4);
  g.fillStyle = PAL.dim;
  g.fillRect(x - 15, by + 32, 11, 8);
  g.fillRect(x + 4, by + 32, 11, 8);
  // body
  g.fillStyle = '#2a3170';
  rr(g, x - 23, by - 32, 46, 66, 9);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 2;
  g.stroke();
  // display with the player's own setting
  g.fillStyle = '#0b1030';
  g.fillRect(x - 17, by - 27, 34, 14);
  text(g, setting, x, by - 16, col, 11);
  // sensor eye, looking left at the marked point; a lid comes down while it measures
  const blink = Math.sin(t * 1.3) > 0.97;
  g.fillStyle = PAL.white;
  g.beginPath();
  g.arc(x, by + 2, 11, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1b1030';
  g.beginPath();
  g.arc(x - 3, by + 1, verdict === 'win' ? 6 : 5, 0, Math.PI * 2);
  g.fill();
  if (verdict === 'win') {
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(x - 5, by - 1, 1.8, 0, Math.PI * 2);
    g.fill();
  }
  if (blink || aiming) {
    g.fillStyle = '#2a3170';
    g.fillRect(x - 12, by - 10, 24, blink ? 12 : 7);
    line(g, x - 11, by - (blink ? -2 : 3), x + 11, by - (blink ? -2 : 3), PAL.cyan, 2);
  }
  // mouth: smile, grin, frown
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2;
  g.beginPath();
  if (verdict === 'miss') g.arc(x, by + 28, 6, 1.15 * Math.PI, 1.85 * Math.PI);
  else if (verdict === 'win') g.arc(x, by + 19, 8, 0.05 * Math.PI, 0.95 * Math.PI);
  else g.arc(x, by + 18, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  if (verdict === 'miss') {
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.arc(x + 20, by - 38 + ((rt * 12) % 6), 3, 0, Math.PI * 2);
    g.fill();
  }
  if (verdict === 'win') glow(g, PAL.yellow, 8, () => text(g, '✦', x + 36, by - 40, PAL.yellow, 14));
  // the flash of a measurement
  if (rt > 0 && rt < 0.35) glow(g, PAL.cyan, 12, () => {
    g.strokeStyle = PAL.cyan;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x - 3, by + 1, 12 + rt * 60, 0, Math.PI * 2);
    g.stroke();
  });
}

function lampLevel(random: () => number): DialLevel<LampRound> {
  const { SX, MY, MX, BOT, PXH } = LAMP_GEOM;
  const yOf = (h: number) => BOT - h * PXH;
  const VERDICT = 1.0;
  const LAMBDA_PX = 60;
  const ASSIST_NOTE = ['The waves and their sum are drawn live.', 'The waves show for a moment after a phase check, which costs a charge; the sum is hidden.', 'Nothing is drawn: work it out.'];
  const flash = paidFlash();
  return {
    hero: {
      name: 'Lumi',
      role: 'a handheld light meter with a sensor eye',
      story: 'Two laser slits give fringes, but two ordinary bulbs do not: their phases are not locked, so their intensities simply add.',
      objective: 'Set the meter to the brightness at the marked point, in three rounds. A phase check costs a charge; the live waves fade.',
    },
    rounds: lampRounds(random),
    charges: [1, 1, 0],
    dials: [{ key: 'i', aria: 'Meter setting: brightness at the marked point in multiples of I zero', label: 'Meter', unit: '× I₀', step: LAMP.step, min: LAMP.min, max: LAMP.max, start: LAMP.start, text: (v) => (v / 2).toFixed(1) }],
    handles: [{ dial: 'i', at: (_r, v) => [MX, yOf(v.i)], drag: (_r, _px, py) => (BOT - py) / PXH, radius: HANDLE_R }],
    test: { button: '🔦 Phase check', aria: 'Phase check: are the two sources locked in phase?', read: (r) => (flash.paid(), lampReading(r)) },
    fire: { button: '📟 Lock the reading', aria: 'Lock the meter reading' },
    judge: (r, v) => judgeLamp(r, v.i),
    miss: (r, v) => lampMiss(r, v.i),
    win: (r) => lampExplain(r),
    hint: (r) => `${r.coherent ? 'A laser feeds both slits.' : 'Two separate light bulbs shine on the screen.'} At the marked point the path difference is Δ = ${lampDelta(r)}. ${ASSIST_NOTE[r.assist]}`,
    // a fixed point on the screen: never the winning position
    hit: () => HIT.lamp,
    delay: VERDICT,
    draw: ({ g, r, v, t, rt, shot, k, A }) => {
      tint(g, k, t);
      // The waves are the helper: live in round 1, on for 1.5 s after a paid phase check in round 2, never in round 3. A win may show them; a miss never does.
      const helper = helperOn(r.assist, shot?.ok === true, shot ? Infinity : flash.since(t, k));
      A.canvas.dataset.helper = helper ? '1' : '0';
      const verdict = shot && rt >= VERDICT ? (shot.ok ? 'win' : 'miss') : null;
      const run = shot ? Math.min(1, rt / 0.8) : 0;
      const delta = lampDelta(r);
      // the sources
      const paths: [number, number][][] = [];
      if (r.coherent) {
        laserGun(g, 50, 120, t, shot ? rt : 0);
        g.fillStyle = PAL.dim;
        g.fillRect(168, 44, 8, 56);
        g.fillRect(168, 108, 8, 24);
        g.fillRect(168, 140, 8, 60);
        line(g, 78, 120, 168, 104, waveColor(650, 0.3), 1.5);
        line(g, 78, 120, 168, 136, waveColor(650, 0.3), 1.5);
        paths.push([[78, 120], [172, 104], [SX + 2, MY - 3]], [[78, 120], [172, 136], [SX + 2, MY + 3]]);
        line(g, 176, 104, SX + 2, MY - 3, waveColor(650, 0.35), 1.5);
        line(g, 176, 136, SX + 2, MY + 3, waveColor(650, 0.35), 1.5);
        text(g, 'laser · two slits', 110, 196, PAL.dim, 11);
      } else {
        bulb(g, 66, 98, PAL.yellow, t, 1, shot ? rt : 0);
        bulb(g, 66, 142, PAL.orange, t, 2, shot ? rt : 0);
        for (const [by, c, s] of [[98, 'rgba(255,210,63,', 1], [142, 'rgba(255,155,61,', 2]] as [number, string, number][]) {
          line(g, 84, by, SX + 2, MY + (by < MY ? -3 : 3), `${c}${0.15 + 0.25 * noise(Math.floor(t * 9) + s * 17)})`, 1.5);
          paths.push([[84, by], [SX + 2, MY + (by < MY ? -3 : 3)]]);
        }
        text(g, 'two separate bulbs', 110, 196, PAL.dim, 11);
      }
      if (shot) {
        paths.forEach((p, i) => {
          trace(g, p, run, r.coherent ? PAL.red : i ? PAL.orange : PAL.yellow, 2.5);
          if (run > 0 && run < 1) {
            const [px, py] = along(p, run);
            glow(g, PAL.white, 10, () => {
              g.fillStyle = PAL.white;
              g.beginPath();
              g.arc(px, py, 3.5, 0, Math.PI * 2);
              g.fill();
            });
          }
        });
      }
      // the screen: dark until the run is won
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(SX, 44, 16, 152);
      const reveal = verdict === 'win' ? Math.min(1, (rt - VERDICT) / 0.4) : 0;
      if (reveal > 0) {
        const y0 = MY + r.frac * LAMBDA_PX;
        for (let y = 44; y < 196; y += 2) {
          const I = r.coherent ? Math.cos((Math.PI * (y0 - y)) / LAMBDA_PX) ** 2 : 0.5;
          g.fillStyle = `rgba(255,240,180,${(I * reveal).toFixed(3)})`;
          g.fillRect(SX, y, 16, 2);
        }
      }
      g.strokeStyle = PAL.dim;
      g.lineWidth = 2;
      g.strokeRect(SX, 44, 16, 152);
      glow(g, PAL.yellow, 10, () => {
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(SX + 8, MY, 11, 0, Math.PI * 2);
        g.stroke();
      });
      text(g, `Δ = ${delta}`, SX + 8, 36, PAL.yellow, 12);
      text(g, 'screen', SX + 8, 212, PAL.dim, 11);
      if (reveal > 0) text(g, `${r.sol / 2} I₀`, SX + 24, MY + 4, PAL.green, 13, 'left');
      else text(g, '? I₀', SX + 24, MY + 4, PAL.dim, 13, 'left');
      // the two waves and their sum: the live helper, fading round by round
      if (helper) {
        const phaseT = t * 2;
        const drift = r.coherent ? 0 : noise(Math.floor(t * 3) + 5) - 0.5;
        const shift = r.frac + drift * 1.4;
        const wave = (x: number, s: number) => Math.sin(((x - s * LAMBDA_PX) / LAMBDA_PX) * Math.PI * 2 - phaseT);
        for (const [c, s] of [[PAL.cyan, 0], [PAL.pink, shift]] as [string, number][]) {
          glow(g, c, 5, () => {
            g.strokeStyle = c;
            g.lineWidth = 2;
            g.beginPath();
            for (let x = 20; x <= 320; x += 3) {
              const y = 244 - 13 * wave(x, s);
              if (x === 20) g.moveTo(x, y);
              else g.lineTo(x, y);
            }
            g.stroke();
          });
        }
        text(g, 'the two waves at the point', 170, 224, PAL.dim, 11);
        if (r.assist === 0 || verdict === 'win') {
          glow(g, PAL.yellow, 6, () => {
            g.strokeStyle = PAL.yellow;
            g.lineWidth = 2.5;
            g.beginPath();
            for (let x = 20; x <= 320; x += 3) {
              const y = 306 - 13 * (wave(x, 0) + wave(x, shift));
              if (x === 20) g.moveTo(x, y);
              else g.lineTo(x, y);
            }
            g.stroke();
          });
          text(g, 'sum', 334, 310, PAL.yellow, 11, 'left');
        } else text(g, '?', 170, 316, PAL.dim, 28);
      }
      // the meter
      const ky = yOf(v.i);
      const blink = verdict === 'miss' && Math.floor((rt - VERDICT) * 4) % 2 === 0;
      const col = verdict === 'win' ? PAL.green : verdict === 'miss' ? PAL.red : PAL.yellow;
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(MX - 12, yOf(8), 24, 8 * PXH);
      g.fillStyle = col;
      g.globalAlpha = 0.3;
      g.fillRect(MX - 12, ky, 24, BOT - ky);
      g.globalAlpha = 1;
      g.strokeStyle = blink ? PAL.red : PAL.dim;
      g.lineWidth = blink ? 5 : 2;
      g.strokeRect(MX - 12, yOf(8), 24, 8 * PXH);
      for (let h = 0; h <= 8; h++) {
        line(g, MX - 12 - (h % 2 ? 5 : 10), yOf(h), MX - 12, yOf(h), PAL.dim, 1.5);
        if (h % 2 === 0) text(g, `${h / 2}`, MX - 28, yOf(h) + 4, PAL.dim, 11, 'right');
      }
      text(g, 'I₀', MX, 30, PAL.dim, 12);
      glow(g, col, 10, () => {
        g.fillStyle = col;
        g.beginPath();
        g.arc(MX, ky, 14, 0, Math.PI * 2);
        g.fill();
      });
      text(g, (v.i / 2).toFixed(1), MX, ky + 4, '#1b1030', 11);
      if (verdict === 'miss') {
        // a fixed-size arrow: brighter or dimmer than the setting, and nothing more
        const dir = lampSide(r, v.i) === 'dimmer' ? 1 : -1;
        const ax = MX + 27;
        const y1 = ky + dir * 22;
        const y2 = ky + dir * 56;
        glow(g, PAL.red, 8, () => {
          line(g, ax, y1, ax, y2, PAL.red, 4);
          line(g, ax, y2, ax - 6, y2 - dir * 9, PAL.red, 4);
          line(g, ax, y2, ax + 6, y2 - dir * 9, PAL.red, 4);
        });
        text(g, lampSide(r, v.i), ax + 8, (y1 + y2) / 2 + 3, PAL.red, 11, 'left');
      }
      // the knob's grip, and the player's own reading with its unit beside it
      if (!shot) {
        grip(g, A.canvas, t, { x: MX, y: ky, r: HANDLE_R, dir: 'v', read: '', side: 'right' });
        tag(g, `${(v.i / 2).toFixed(1)} I₀`, MX + HANDLE_R + 4, ky + 4, 'left', PAL.yellow, 12);
      }
      lumi(g, 462, 232, t, shot ? rt : 0, verdict, (v.i / 2).toFixed(1));
      goalLine(g, 'Goal: set the meter to the brightness at the marked point', A.t, shot !== null);
      if (verdict) glow(g, verdict === 'win' ? PAL.green : PAL.red, 12, () => text(g, verdict === 'win' ? 'SPOT ON' : 'METER OFF', 230, 28, verdict === 'win' ? PAL.green : PAL.red, 18));
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? hunterLevel(ctx.random) : ctx.level === 2 ? lockLevel(ctx.random) : ctx.level === 4 ? lampLevel(ctx.random) : gaugeLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen with two slits, interference stripes on a wall, and a dial to tune.');
  },
});
