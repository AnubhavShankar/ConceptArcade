// Inspirations: Duck Hunt (aim the laser so a bright stripe lands on the target), Pac-Man (two runners that only meet at the
// gaps in the maze) and Guitar Hero (a power meter you must set to the right level).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { fmt } from '@core/judge';
import { glow, line, orb, text, waveColor } from '@core/neon';
import { SLIDERS, fringeX, fringeWidth, gaugeExplain, gaugeMiss, gaugeRounds, hunterExplain, hunterMiss, hunterReading, hunterRounds, intensity, judgeGauge, judgeHunter, judgeLock, lockExplain, lockMiss, lockReading, lockRounds, type GaugeRound, type HunterRound, type LockRound } from './logic';

const css = waveColor;

function hunterLevel(random: () => number): DialLevel<HunterRound> {
  const AX = 170;
  const PX = 9;
  const SX = 520;
  const specX = (lam: number) => 70 + ((lam - 380) / 380) * 500;
  return {
    hero: {
      name: 'Hawkeye',
      role: 'a laser pointer on a shooting range',
      story: 'Hawkeye shines through two narrow slits, and the light makes stripes on the wall. A stripe is bright where the two paths differ by a whole number of wavelengths, so the colour of the laser decides where each stripe falls. The target is fixed.',
      objective: 'Choose the colour of the laser so the bright stripe of the stated order lands on the target, in three rounds. A test shot costs a charge; the live stripes fade.',
    },
    rounds: hunterRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'lam', aria: 'Wavelength of the laser in nanometres', label: 'Laser colour', unit: 'nm', step: SLIDERS.lam.step, min: SLIDERS.lam.min, max: SLIDERS.lam.max, start: 450 }],
    handles: [{ dial: 'lam', at: (_r, v) => [specX(v.lam), 312], drag: (_r, px) => 380 + ((px - 70) / 500) * 380, radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: see where the bright stripe lands', read: (r, v) => hunterReading(r, v.lam) },
    fire: { button: '🎯 Fire', aria: 'Fire the laser through the slits' },
    judge: (r, v) => judgeHunter(r, v.lam),
    miss: (r, v) => hunterMiss(r, v.lam),
    win: (r) => `${hunterExplain(r)[0]} ${hunterExplain(r)[1]}`,
    hint: (r) => `Slits ${fmt(r.d)} mm apart, screen ${fmt(r.D)} m away. Target: the ${r.n}th bright stripe, ${fmt(r.x)} mm from the centre. ${r.assist === 0 ? 'The stripes are drawn live.' : r.assist === 1 ? 'The stripes are dim: use a test shot.' : 'The stripes are hidden: work it out.'}`,
    hit: (r) => [SX + 20, AX - r.x * PX],
    delay: 1.2,
    draw: ({ g, r, v, t, rt, shot }) => {
      // the slits and the laser
      orb(g, 40, AX, 14, css(v.lam), t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 54, AX, 108, AX, css(v.lam, 0.7), 3);
      g.fillStyle = PAL.dim;
      g.fillRect(108, 30, 8, AX - 15 - 30);
      g.fillRect(108, AX - 9, 8, 18);
      g.fillRect(108, AX + 15, 8, 290 - AX - 15);
      text(g, 'two slits', 112, 24, PAL.dim, 11);
      // the screen
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(SX, 30, 44, 260);
      if (live || dim) {
        for (let y = 30; y < 290; y += 2) {
          const x = (AX - y) / PX;
          const I = intensity(x, v.lam, r.D, r.d);
          g.fillStyle = css(v.lam, (dim ? 0.3 : 1) * I);
          g.fillRect(SX, y, 44, 2);
        }
        for (const sl of [-12, 12]) line(g, 116, AX + sl, SX, AX - r.x * PX, css(v.lam, 0.25), 1.2);
      } else text(g, '?', SX + 22, AX + 14, PAL.dim, 40);
      g.strokeStyle = PAL.dim;
      g.lineWidth = 2;
      g.strokeRect(SX, 30, 44, 260);
      line(g, SX - 6, AX, SX, AX, PAL.white, 2);
      text(g, 'centre', SX - 28, AX + 4, PAL.dim, 10);
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
      // where the n-th stripe lands for this colour, drawn for the shot
      if (shot) {
        const y = AX - fringeX(r.n, v.lam, r.D, r.d) * PX;
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
      text(g, `${fmt(v.lam)} nm`, specX(v.lam), 340 - 4, PAL.white, 11);
      text(g, `stripe spacing ${fmt(fringeWidth(v.lam, r.D, r.d))} mm`, 300, 52, PAL.dim, 11);
    },
  };
}

function lockLevel(random: () => number): DialLevel<LockRound> {
  const BASE = 300;
  const PX = 22;
  const yOf = (x: number) => BASE - x * PX;
  return {
    hero: {
      name: 'Pac',
      role: 'a chomper racing two coloured stripe patterns at once',
      story: 'Two colours go through the same slits. Each makes its own bright stripes, with its own spacing. The two sets of stripes only line up at certain places, and the closest one to the centre is the prize.',
      objective: 'Put the detector where a bright stripe of each colour falls on the same spot, as near the centre as it can be, in three rounds. A test shot costs a charge; the live help fades.',
    },
    rounds: lockRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'x', aria: 'Distance of the detector from the centre in millimetres', label: 'Detector at', unit: 'mm from the centre', step: SLIDERS.x.step, min: SLIDERS.x.min, max: SLIDERS.x.max, start: 1 }],
    handles: [{ dial: 'x', at: (_r, v) => [440, yOf(v.x)], drag: (_r, _px, py) => (BASE - py) / PX, radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the fringe order of each colour here', read: (r, v) => lockReading(r, v.x) },
    fire: { button: '🔒 Lock', aria: 'Lock the detector here' },
    judge: (r, v) => judgeLock(r, v.x),
    miss: (r, v) => lockMiss(r, v.x),
    win: (r) => `${lockExplain(r)[0]} ${lockExplain(r)[1]}`,
    hint: (r) => `Slits ${fmt(r.d)} mm apart, screen ${fmt(r.D)} m away. Colours ${r.lam1} nm and ${r.lam2} nm. ${r.assist === 0 ? 'Marks show where the two patterns meet.' : r.assist === 1 ? 'The patterns are drawn; the marks are off.' : 'The patterns are hidden until you lock: work it out.'}`,
    hit: (r) => [500, yOf(r.xSol)],
    delay: 1.0,
    draw: ({ g, r, v, t, rt, shot }) => {
      const live = r.assist <= 1 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(470, 40, 30, 270);
      g.fillRect(506, 40, 30, 270);
      if (live) {
        for (let y = 40; y < 310; y += 2) {
          const x = (BASE - y) / PX;
          if (x < 0) continue;
          g.fillStyle = css(r.lam1, (dim ? 0.55 : 1) * intensity(x, r.lam1, r.D, r.d));
          g.fillRect(470, y, 30, 2);
          g.fillStyle = css(r.lam2, (dim ? 0.55 : 1) * intensity(x, r.lam2, r.D, r.d));
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
      text(g, 'centre', 425, BASE + 4, PAL.dim, 11);
      for (let mm = 2; mm <= 12; mm += 2) {
        line(g, 454, yOf(mm), 466, yOf(mm), PAL.dim, 1.5);
        text(g, `${mm}`, 446, yOf(mm) + 4, PAL.dim, 10, 'right');
      }
      if (r.assist === 0 && shot === null) {
        for (let k = 1; k * r.xSol <= 12; k++) glow(g, PAL.green, 8, () => line(g, 540, yOf(k * r.xSol), 556, yOf(k * r.xSol), PAL.green, 3));
        text(g, 'both bright', 590, yOf(r.xSol) + 4, PAL.green, 11);
      }
      // the detector bracket
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      glow(g, col, 8, () => {
        g.strokeStyle = col;
        g.lineWidth = 3;
        g.strokeRect(466, yOf(v.x) - 7, 74, 14);
      });
      text(g, `${fmt(v.x)} mm`, 560, yOf(v.x) + 4, col, 12, 'left');
      orb(g, 90, 175, 22, PAL.yellow, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      text(g, 'Pac', 90, 215, PAL.white, 12);
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'DOUBLE BRIGHT' : 'NO MATCH', 250, 40, shot!.ok ? PAL.green : PAL.red, 18));
    },
  };
}

function gaugeLevel(random: () => number): DialLevel<GaugeRound> {
  const CX = 470;
  const CY = 270;
  const R = 130;
  return {
    hero: {
      name: 'Amp',
      role: 'a power meter in a rhythm game',
      story: 'Two equally strong light waves reach the same spot. Where they add up in step the light is brightest, called K here. A path difference of exactly one wavelength gives that maximum. Move the path difference and the combined brightness changes with the square of a cosine.',
      objective: 'Set the meter to the brightness the waves make at the stated path difference, as a fraction of K, in three rounds. A test shot costs a charge; the live waves fade.',
    },
    rounds: gaugeRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'g', aria: 'Brightness as a fraction of K', label: 'Brightness', unit: '× K', step: SLIDERS.g.step, min: SLIDERS.g.min, max: SLIDERS.g.max, start: 0.5, text: (v) => v.toFixed(2) }],
    handles: [{ dial: 'g', at: (_r, v) => [CX - R * Math.cos(Math.PI * v.g), CY - R * Math.sin(Math.PI * v.g)], drag: (_r, px, py) => 1 - Math.atan2(CY - py, px - CX) / Math.PI, radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: measure the resultant amplitude', read: (r) => `The two waves of amplitude a combine to an amplitude of ${Number((2 * Math.abs(Math.cos(Math.PI * r.frac))).toFixed(3))}a here; at a path difference of λ it is 2a.` },
    fire: { button: '🎸 Play', aria: 'Play the note at this meter reading' },
    judge: (r, v) => judgeGauge(r, v.g),
    miss: (r, v) => gaugeMiss(r, v.g),
    win: (r) => `${gaugeExplain(r)[0]} ${gaugeExplain(r)[1]}`,
    hint: (r) => `Path difference: ${fmt(r.frac)} wavelengths, so φ = ${fmt(r.frac * 360)}°. At a path difference of λ the brightness is K. ${r.assist === 0 ? 'The combined wave is drawn live.' : r.assist === 1 ? 'The waves are drawn; the combined wave is hidden.' : 'Nothing is drawn: work it out.'}`,
    hit: () => [CX, CY - R * 0.6],
    delay: 0.8,
    draw: ({ g, r, v, t, rt, shot }) => {
      // the two waves, shifted by the path difference
      const lam = 70;
      const baseY = 120;
      const phaseT = t * 2;
      const wave = (x: number, shift: number) => Math.sin(((x - shift * lam) / lam) * Math.PI * 2 - phaseT);
      text(g, 'two equal waves', 190, 40, PAL.dim, 12);
      if (r.assist <= 1 || shot) {
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
      if (r.assist === 0 || shot) {
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
      if (shot && rt > 0.2) {
        const a2 = Math.PI * (1 - r.sol);
        line(g, CX + (R - 22) * Math.cos(a2), CY - (R - 22) * Math.sin(a2), CX + (R + 8) * Math.cos(a2), CY - (R + 8) * Math.sin(a2), PAL.white, 4);
        text(g, 'the real brightness', CX, CY - R - 34, PAL.white, 11);
      }
      orb(g, 70, 300, 14, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      if (rt > 0.8) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'PERFECT NOTE' : 'OFF KEY', 470, 40, shot!.ok ? PAL.green : PAL.red, 18));
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? hunterLevel(ctx.random) : ctx.level === 2 ? lockLevel(ctx.random) : gaugeLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen with two slits, interference stripes on a wall, and a dial to tune.');
  },
});
