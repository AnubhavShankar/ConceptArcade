// Inspirations: Galaga and Space Invaders (fire photons at a target to knock electrons loose), Angry Birds and Peggle
// (a push-back that must just stop the fastest shot) and lockpicking (two dials that make a line pass through two points).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { fmt } from '@core/judge';
import { glow, line, orb, text, waveColor } from '@core/neon';
import { E, SLIDERS, judgeLine, judgeStop, judgeThreshold, kMax, lineExplain, lineMiss, lineReading, lineRounds, photonEv, stopExplain, stopMiss, stopReading, stopRounds, thresholdExplain, thresholdMiss, thresholdReading, thresholdRounds, type LineRound, type StopRound, type ThresholdRound } from './logic';

const colour = (lam: number, a = 1) => (lam < 380 ? `rgba(200,170,255,${a})` : waveColor(Math.min(760, lam), a));

function thresholdLevel(random: () => number): DialLevel<ThresholdRound> {
  const AX = 165;
  const specX = (lam: number) => 60 + ((lam - SLIDERS.lam.min) / (SLIDERS.lam.max - SLIDERS.lam.min)) * 520;
  return {
    hero: {
      name: 'Zap',
      role: 'a photon gunner trying to knock electrons out of a metal',
      story: 'The electrons in a metal are held in by an energy barrier called the work function. A photon gives all its energy hf = hc/λ to one electron at a time, so it works only if that one photon carries at least the work function. A bright beam of weak photons does nothing.',
      objective: 'Choose the wavelength of the faintest light that can just free an electron from the metal, in three rounds. A test shot costs a charge; the live energy bar fades.',
    },
    rounds: thresholdRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'lam', aria: 'Wavelength of the light in nanometres', label: 'Light wavelength', unit: 'nm', step: SLIDERS.lam.step, min: SLIDERS.lam.min, max: SLIDERS.lam.max, start: 700 }],
    handles: [{ dial: 'lam', at: (_r, v) => [specX(v.lam), 314], drag: (_r, px) => SLIDERS.lam.min + ((px - 60) / 520) * (SLIDERS.lam.max - SLIDERS.lam.min), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: compare the photon energy with the work function', read: (r, v) => thresholdReading(r, v.lam) },
    fire: { button: '💥 Fire', aria: 'Fire the photons at the metal' },
    judge: (r, v) => judgeThreshold(r, v.lam),
    miss: (r, v) => thresholdMiss(r, v.lam),
    win: (r) => `${thresholdExplain(r)[0]} ${thresholdExplain(r)[1]}`,
    hint: (r) => `Work function of the metal: ${fmt(r.phi)} eV. Use hc = 1240 eV nm. ${r.assist === 0 ? 'The energy bar is live.' : r.assist === 1 ? 'The bar is dim: use a test shot.' : 'No bar: work it out.'}`,
    hit: () => [390, AX],
    delay: 1.2,
    draw: ({ g, r, v, t, rt, shot }) => {
      const e = photonEv(v.lam);
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      // the metal with its electrons
      g.fillStyle = 'rgba(160,170,230,0.25)';
      g.fillRect(360, 60, 60, 220);
      g.strokeStyle = PAL.dim;
      g.lineWidth = 2;
      g.strokeRect(360, 60, 60, 220);
      text(g, `metal: φ = ${fmt(r.phi)} eV`, 390, 50, PAL.dim, 11);
      orb(g, 70, AX, 16, colour(v.lam), t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      // photons streaming toward the metal
      for (let k = 0; k < 7; k++) {
        const x = 90 + ((k * 40 + t * 120) % 270);
        glow(g, colour(v.lam), 8, () => {
          g.fillStyle = colour(v.lam);
          g.beginPath();
          g.arc(x, AX + Math.sin(k * 2.1) * 26, 5, 0, Math.PI * 2);
          g.fill();
        });
      }
      // electrons: shaking if they cannot leave, flying off if they can
      const out = e >= r.phi - 0.02;
      for (let k = 0; k < 5; k++) {
        const y = 90 + k * 40;
        const sh = out ? 0 : Math.sin(t * 20 + k) * 2;
        const fly = out && (live || dim) ? ((t * (60 + 80 * Math.sqrt(Math.max(0, e - r.phi))) + k * 50) % 160) : 0;
        orb(g, 390 + sh + fly, y, 9, PAL.green, t + k, out && live ? 'cheer' : out ? 'happy' : 'worried');
      }
      // the energy bar next to the barrier
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(500, 60, 120, 220);
      text(g, 'energy (eV)', 560, 50, PAL.dim, 11);
      const yE = (x: number) => 270 - x * 40;
      line(g, 506, yE(r.phi), 614, yE(r.phi), PAL.yellow, 3, [6, 4]);
      text(g, 'φ', 626, yE(r.phi) + 4, PAL.yellow, 12, 'right');
      if (live || dim) {
        g.fillStyle = colour(v.lam, dim ? 0.3 : 0.9);
        g.fillRect(530, yE(e), 40, 270 - yE(e));
        if (live) text(g, `${fmt(e)} eV`, 550, yE(e) - 8, PAL.white, 12);
      } else text(g, '?', 550, 170, PAL.dim, 40);
      for (let k = 0; k <= 6; k++) text(g, `${k}`, 516, yE(k) + 4, PAL.dim, 10, 'left');
      text(g, `${fmt(v.lam)} nm`, specX(v.lam), 342 - 6, PAL.white, 11);
      for (let x = 60; x <= 580; x += 2) {
        g.fillStyle = colour(SLIDERS.lam.min + ((x - 60) / 520) * (SLIDERS.lam.max - SLIDERS.lam.min));
        g.fillRect(x, 304, 2, 16);
      }
      if (rt > 1.2) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'JUST ENOUGH' : out ? 'TOO STRONG' : 'TOO WEAK', 250, 34, shot!.ok ? PAL.green : PAL.red, 16));
    },
  };
}

function stopLevel(random: () => number): DialLevel<StopRound> {
  const X0 = 110;
  const L = 380;
  const knobY = (v: number) => 300 - (v / SLIDERS.v.max) * 220;
  return {
    hero: {
      name: 'Volt',
      role: 'a ball of electrons shot at a wall against a push-back field',
      story: 'Light frees electrons from a plate with all speeds up to a maximum. A collector plate opposite is held at a retarding voltage that pushes the electrons back. When the push-back is just strong enough to stop the fastest electron, the current falls to zero: that is the stopping potential.',
      objective: 'Set the retarding voltage to the stopping potential, in three rounds. A test shot costs a charge; the live current meter fades.',
    },
    rounds: stopRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'v', aria: 'Retarding voltage in volts', label: 'Retarding voltage', unit: 'V', step: SLIDERS.v.step, min: SLIDERS.v.min, max: SLIDERS.v.max, start: 0.2, text: (x) => x.toFixed(2) }],
    handles: [{ dial: 'v', at: (_r, v) => [598, knobY(v.v)], drag: (_r, _px, py) => ((300 - py) / 220) * SLIDERS.v.max, radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: see if any electron reaches the collector', read: (r, v) => stopReading(r, v.v) },
    fire: { button: '🏐 Serve', aria: 'Switch on the light with this retarding voltage' },
    judge: (r, v) => judgeStop(r, v.v),
    miss: (r, v) => stopMiss(r, v.v),
    win: (r) => `${stopExplain(r)[0]} ${stopExplain(r)[1]}`,
    hint: (r) => `Light of wavelength ${r.lam} nm on a metal with work function ${fmt(r.phi)} eV (hc = 1240 eV nm). ${r.assist === 0 ? 'The current meter is live.' : r.assist === 1 ? 'The meter is off: use a test shot.' : 'No meter: work it out.'}`,
    hit: () => [X0 + L / 2, 170],
    delay: 1.2,
    draw: ({ g, r, v, t, rt, shot }) => {
      const k = kMax(r.lam, r.phi);
      line(g, X0, 60, X0, 290, PAL.dim, 6);
      line(g, X0 + L, 60, X0 + L, 290, PAL.pink, 6);
      text(g, 'emitter', X0, 50, PAL.dim, 11);
      text(g, 'collector', X0 + L, 50, PAL.pink, 11);
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      let reaching = 0;
      for (let i = 1; i <= 5; i++) {
        const ki = (k * i) / 5;
        const y = 70 + i * 36;
        const reach = v.v <= 1e-9 || ki >= v.v - 1e-9;
        if (reach) reaching++;
        const xmax = v.v <= 1e-9 ? L : Math.min(L, (L * ki) / v.v);
        const tt = (t * 0.55 + i * 0.17) % 2;
        const s = tt < 1 ? tt : 2 - tt;
        if (live || dim) {
          g.globalAlpha = dim ? 0.35 : 1;
          line(g, X0, y, X0 + xmax, y, PAL.green, 1, [3, 5]);
          orb(g, X0 + s * xmax, y, 9, PAL.green, t + i, reach ? 'cheer' : 'worried');
          g.globalAlpha = 1;
        } else orb(g, X0 + 4, y, 9, PAL.dim, t + i);
      }
      // the field: a ramp of potential energy
      g.strokeStyle = PAL.yellow;
      g.lineWidth = 2;
      g.setLineDash([6, 5]);
      g.beginPath();
      g.moveTo(X0, 300);
      g.lineTo(X0 + L, 300 - v.v * 40);
      g.stroke();
      g.setLineDash([]);
      text(g, `retarding ${v.v.toFixed(2)} V`, X0 + L / 2, 322, PAL.yellow, 12);
      if (r.assist === 0 || shot) {
        const col = reaching > 0 ? PAL.red : PAL.green;
        text(g, reaching > 0 ? `current flows (${reaching} of 5 reach it)` : 'current is zero', 330, 36, col, 13);
      } else text(g, 'current meter off', 330, 36, PAL.dim, 12);
      // the voltage dial
      line(g, 598, 80, 598, 300, PAL.dim, 4);
      text(g, `${SLIDERS.v.max} V`, 598, 70, PAL.dim, 10);
      text(g, '0', 598, 316, PAL.dim, 10);
      if (rt > 1.2) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'JUST STOPPED' : v.v < r.v0 ? 'STILL GETTING THROUGH' : 'OVER-STOPPED', 330, 66, shot!.ok ? PAL.green : PAL.red, 15));
    },
  };
}

function lineLevel(random: () => number): DialLevel<LineRound> {
  const GX = 40;
  const PXF = 31;
  const Y0 = 170;
  const PXV = 43;
  const yv = (vv: number) => Y0 - vv * PXV;
  const xf = (f: number) => GX + f * PXF;
  const slope = (h: number) => ((h * 1e-34 * 1e14) / (E * 1e-19)); // V per 10¹⁴ Hz
  return {
    hero: {
      name: 'Ruler',
      role: 'a laser line that must pass through two measured points',
      story: 'A student measured the stopping potential of a metal at two frequencies. Einstein’s equation says V₀ = (h/e) f − φ/e, a straight line: its slope is h/e and it crosses the voltage axis at −φ/e. Your two dials are Planck’s constant and the work function.',
      objective: 'Set h and φ so the line passes through both measured points, in three rounds. A test shot costs a charge; the live line fades.',
    },
    rounds: lineRounds(random),
    charges: [1, 1, 1],
    dials: [
      { key: 'h', aria: 'Planck’s constant in units of 10 to the minus 34 joule seconds', label: 'Planck’s constant', unit: '× 10⁻³⁴ J s', step: SLIDERS.h.step, min: SLIDERS.h.min, max: SLIDERS.h.max, start: 5, text: (x) => x.toFixed(2) },
      { key: 'phi', aria: 'Work function in electron volts', label: 'Work function', unit: 'eV', step: SLIDERS.phi.step, min: SLIDERS.phi.min, max: SLIDERS.phi.max, start: 3, text: (x) => x.toFixed(2) },
    ],
    handles: [
      { dial: 'h', at: (_r, v) => [xf(16), yv(slope(v.h) * 16 - v.phi)], drag: (_r, _px, py, v) => ((((Y0 - py) / PXV + v.phi) / 16) * (E * 1e-19)) / (1e-34 * 1e14), radius: 22 },
      { dial: 'phi', at: (_r, v) => [xf(0.8), yv(slope(v.h) * 0.8 - v.phi)], drag: (_r, _px, py, v) => slope(v.h) * 0.8 - (Y0 - py) / PXV, radius: 22 },
    ],
    test: { button: '🔦 Test shot', aria: 'Test shot: compare the line with the measured points', read: (r, v) => lineReading(r, v.h, v.phi) },
    fire: { button: '📏 Fit', aria: 'Check the line against the measured points' },
    judge: (r, v) => judgeLine(r, v.h, v.phi).ok,
    miss: (r, v) => lineMiss(r, v.h, v.phi),
    win: (r) => `${lineExplain(r)[0]} ${lineExplain(r)[1]}`,
    hint: (r) => `Measured: ${fmt(r.v1)} V at ${fmt(r.f1)} × 10¹⁴ Hz and ${fmt(r.v2)} V at ${fmt(r.f2)} × 10¹⁴ Hz (e = 1.6 × 10⁻¹⁹ C). ${r.assist === 0 ? 'The line is drawn live.' : r.assist === 1 ? 'The line is dim: use a test shot.' : 'No line until you fit: work it out.'}`,
    hit: (r) => [xf(r.f2), yv(r.v2)],
    delay: 1.0,
    draw: ({ g, r, v, t, rt, shot }) => {
      // axes
      line(g, GX, Y0, 620, Y0, PAL.white, 2);
      line(g, GX, 30, GX, 320, PAL.white, 2);
      text(g, 'frequency (10¹⁴ Hz)', 330, 336, PAL.dim, 11);
      text(g, 'stopping potential V₀ (V)', 40, 24, PAL.dim, 11, 'left');
      for (let f = 2; f <= 18; f += 2) {
        line(g, xf(f), Y0 - 4, xf(f), Y0 + 4, PAL.dim, 1.5);
        text(g, `${f}`, xf(f), Y0 + 18, PAL.dim, 10);
      }
      for (const val of [-2, -1, 1, 2, 3]) {
        line(g, GX - 4, yv(val), GX + 4, yv(val), PAL.dim, 1.5);
        text(g, `${val}`, GX - 8, yv(val) + 4, PAL.dim, 10, 'right');
      }
      // the measured points
      for (const [f, vv] of [[r.f1, r.v1], [r.f2, r.v2]] as [number, number][]) {
        glow(g, PAL.yellow, 10, () => {
          g.fillStyle = PAL.yellow;
          g.beginPath();
          g.arc(xf(f), yv(vv), 7, 0, Math.PI * 2);
          g.fill();
        });
        text(g, `${fmt(vv)} V`, xf(f) + 12, yv(vv) - 10, PAL.yellow, 11, 'left');
      }
      // the line from the two dials
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.cyan;
      if (live || dim) {
        g.save();
        g.globalAlpha = dim ? 0.35 : 1;
        glow(g, col, 8, () => line(g, xf(0), yv(-v.phi), xf(18), yv(slope(v.h) * 18 - v.phi), col, 3));
        g.restore();
      } else text(g, 'line hidden', 330, 60, PAL.dim, 12);
      // the intercept and the slope handles are drawn by the engine; label them
      text(g, `φ = ${v.phi.toFixed(2)} eV`, xf(0) + 70, yv(-v.phi) + 20, PAL.cyan, 11);
      text(g, `h = ${v.h.toFixed(2)}`, xf(16) - 30, yv(slope(v.h) * 16 - v.phi) - 14, PAL.cyan, 11);
      orb(g, 560, 70, 14, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'THE LINE FITS' : 'MISSES THE POINTS', 330, 52, shot!.ok ? PAL.green : PAL.red, 16));
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? thresholdLevel(ctx.random) : ctx.level === 2 ? stopLevel(ctx.random) : lineLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen showing photons hitting a metal, electrons flying off, and a graph of stopping potential.');
  },
});
