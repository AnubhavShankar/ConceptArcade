// Inspirations: Galaga and Space Invaders (fire photons at a target to knock electrons loose), Angry Birds and Peggle
// (a push-back that must just stop the fastest shot) and lockpicking (two dials that make a line pass through two points).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { helperOn, paidFlash } from '@core/aidflash';
import { fmt } from '@core/judge';
import { glow, line, orb, text, waveColor } from '@core/neon';
import { BRIGHT_SLIDERS, BRIGHT_START, E, HC, LINE_START, NEEDLE_MAX, SLIDERS, lineSides, STOP_START, THRESHOLD_START, stopKind, stopTurnFraction, streamsText, thresholdFly, brightIntel, brightMiss, brightReading, brightRounds, brightWin, d1, judgeBright, judgeLine, judgeStop, judgeThreshold, kMax, lineExplain, lineMiss, lineReading, lineRounds, needleReading, photonEv, stopExplain, stopMiss, stopReading, stopRounds, streamKind, thresholdExplain, thresholdMiss, thresholdReading, thresholdRounds, turnFraction, voltsText, type BrightRound, type LineRound, type StopRound, type ThresholdRound } from './logic';

/** How long the level 3 goal line stays on the canvas at the start of a round, in seconds (it fades over the last half second). */
export const GOAL_SECONDS = 3.5;

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
    dials: [{ key: 'lam', aria: 'Wavelength of the light in nanometres', label: 'Light wavelength', unit: 'nm', step: SLIDERS.lam.step, min: SLIDERS.lam.min, max: SLIDERS.lam.max, start: THRESHOLD_START }],
    handles: [{ dial: 'lam', at: (_r, v) => [specX(v.lam), 314], drag: (_r, px) => SLIDERS.lam.min + ((px - 60) / 520) * (SLIDERS.lam.max - SLIDERS.lam.min), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: compare the photon energy with the work function', read: (r, v) => thresholdReading(r, v.lam) },
    fire: { button: '💥 Fire', aria: 'Fire the photons at the metal' },
    judge: (r, v) => judgeThreshold(r, v.lam),
    miss: (r, v) => thresholdMiss(r, v.lam),
    win: (r) => `${thresholdExplain(r)[0]} ${thresholdExplain(r)[1]}`,
    hint: (r) => `Work function of the metal: ${fmt(r.phi)} eV. Use hc = 1240 eV nm. ${r.assist === 0 ? 'The energy bar is live.' : r.assist === 1 ? 'The bar is dim: use a test shot.' : 'No bar: work it out.'}`,
    hit: () => [390, AX],
    delay: 1.2,
    draw: ({ g, r, v, t, rt, shot, A }) => {
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
      // during a shot the speed is one fixed value per side (never a function of the photon energy chosen)
      const speed = shot ? thresholdFly(r, v.lam) : 60 + 80 * Math.sqrt(Math.max(0, e - r.phi));
      if (shot) A.canvas.dataset.speed = String(speed);
      for (let k = 0; k < 5; k++) {
        const y = 90 + k * 40;
        const sh = out ? 0 : Math.sin(t * 20 + k) * 2;
        const fly = out && (live || dim) ? ((t * speed + k * 50) % 160) : 0;
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
    dials: [{ key: 'v', aria: 'Retarding voltage in volts', label: 'Retarding voltage', unit: 'V', step: SLIDERS.v.step, min: SLIDERS.v.min, max: SLIDERS.v.max, start: STOP_START, text: (x) => x.toFixed(2) }],
    handles: [{ dial: 'v', at: (_r, v) => [598, knobY(v.v)], drag: (_r, _px, py) => ((300 - py) / 220) * SLIDERS.v.max, radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: see if any electron reaches the collector', read: (r, v) => stopReading(r, v.v) },
    fire: { button: '🏐 Serve', aria: 'Switch on the light with this retarding voltage' },
    judge: (r, v) => judgeStop(r, v.v),
    miss: (r, v) => stopMiss(r, v.v),
    win: (r) => `${stopExplain(r)[0]} ${stopExplain(r)[1]}`,
    hint: (r) => `Light of wavelength ${r.lam} nm on a metal with work function ${fmt(r.phi)} eV (hc = 1240 eV nm). ${r.assist === 0 ? 'The current meter is live.' : r.assist === 1 ? 'The meter is off: use a test shot.' : 'No meter: work it out.'}`,
    hit: () => [X0 + L / 2, 170],
    delay: 1.2,
    draw: ({ g, r, v, t, rt, shot, A }) => {
      const k = kMax(r.lam, r.phi);
      // during a shot the electrons follow one of three fixed patterns that depend only on the side of the stopping potential
      const kind = shot ? stopKind(r, v.v) : null;
      if (kind) A.canvas.dataset.stopStream = kind;
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
        const frac = kind ? stopTurnFraction(kind, i) : v.v <= 1e-9 ? 1 : Math.min(1, ki / v.v);
        const reach = kind ? kind === 'through' && frac >= 1 : v.v <= 1e-9 || ki >= v.v - 1e-9;
        if (reach) reaching++;
        const xmax = L * frac;
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
  // The graph fills the left of the scene (x up to GR). The two drag handles sit on tracks in the panel on the right, away from the graph, so that
  // the handles (and their readouts) never mark a point of the player's own line: the line is drawn only by the helper.
  const GX = 36;
  const PXF = 22;
  const GR = GX + 18 * PXF;
  const Y0 = 170;
  const PXV = 43;
  const yv = (vv: number) => Y0 - vv * PXV;
  const xf = (f: number) => GX + f * PXF;
  const slope = (h: number) => ((h * 1e-34 * 1e14) / (E * 1e-19)); // V per 10¹⁴ Hz
  const flash = paidFlash();
  const TX0 = 480;
  const TX1 = 605;
  const H_TRACK_Y = 150;
  const PHI_TRACK_Y = 250;
  const trackX = (x: number, min: number, max: number) => TX0 + ((x - min) / (max - min)) * (TX1 - TX0);
  const fromTrack = (px: number, min: number, max: number) => min + ((px - TX0) / (TX1 - TX0)) * (max - min);
  let seenRound = -1;
  let roundT0 = 0;
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
      { key: 'h', aria: 'Planck’s constant in units of 10 to the minus 34 joule seconds', label: 'Planck’s constant', unit: '× 10⁻³⁴ J s', step: SLIDERS.h.step, min: SLIDERS.h.min, max: SLIDERS.h.max, start: LINE_START.h, text: (x) => x.toFixed(2) },
      { key: 'phi', aria: 'Work function in electron volts', label: 'Work function', unit: 'eV', step: SLIDERS.phi.step, min: SLIDERS.phi.min, max: SLIDERS.phi.max, start: LINE_START.phi, text: (x) => x.toFixed(2) },
    ],
    handles: [
      { dial: 'h', at: (_r, v) => [trackX(v.h, SLIDERS.h.min, SLIDERS.h.max), H_TRACK_Y], drag: (_r, px) => fromTrack(px, SLIDERS.h.min, SLIDERS.h.max), radius: 22 },
      { dial: 'phi', at: (_r, v) => [trackX(v.phi, SLIDERS.phi.min, SLIDERS.phi.max), PHI_TRACK_Y], drag: (_r, px) => fromTrack(px, SLIDERS.phi.min, SLIDERS.phi.max), radius: 22 },
    ],
    test: { button: '🔦 Test shot', aria: 'Test shot: compare the line with the measured points', read: (r, v) => (flash.paid(), lineReading(r, v.h, v.phi)) },
    fire: { button: '📏 Fit', aria: 'Check the line against the measured points' },
    judge: (r, v) => judgeLine(r, v.h, v.phi).ok,
    miss: (r, v) => lineMiss(r, v.h, v.phi),
    win: (r) => `${lineExplain(r)[0]} ${lineExplain(r)[1]}`,
    hint: (r) => `Measured: ${fmt(r.v1)} V at ${fmt(r.f1)} × 10¹⁴ Hz and ${fmt(r.v2)} V at ${fmt(r.f2)} × 10¹⁴ Hz (e = 1.6 × 10⁻¹⁹ C). ${r.assist === 0 ? 'The line is drawn live.' : r.assist === 1 ? 'The line shows for a moment after a test shot.' : 'No line until you fit: work it out.'}`,
    hit: (r) => [xf(r.f2), yv(r.v2)],
    delay: 1.0,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      if (k !== seenRound) {
        seenRound = k;
        roundT0 = t;
      }
      // axes
      line(g, GX, Y0, GR + 6, Y0, PAL.white, 2);
      line(g, GX, 30, GX, 320, PAL.white, 2);
      text(g, 'frequency (10¹⁴ Hz)', (GX + GR) / 2, 336, PAL.dim, 11);
      text(g, 'stopping potential V₀ (V)', GX + 6, 24, PAL.dim, 11, 'left');
      for (let f = 2; f <= 18; f += 2) {
        line(g, xf(f), Y0 - 4, xf(f), Y0 + 4, PAL.dim, 1.5);
        text(g, `${f}`, xf(f), Y0 + 18, PAL.dim, 11);
      }
      for (const val of [-2, -1, 1, 2, 3]) {
        line(g, GX - 4, yv(val), GX + 4, yv(val), PAL.dim, 1.5);
        text(g, `${val}`, GX - 8, yv(val) + 4, PAL.dim, 11, 'right');
      }
      // the goal, on the canvas at the start of the round
      const age = t - roundT0;
      if (!shot && age < GOAL_SECONDS) {
        g.save();
        g.globalAlpha = Math.min(1, (GOAL_SECONDS - age) / 0.5);
        text(g, 'Goal: a line through both yellow points', (GX + GR) / 2, 46, PAL.white, 12);
        g.restore();
      }
      // the two dials, on tracks in the panel on the right (nothing here follows the line)
      for (const [y, head, min, max, val, unit] of [
        [H_TRACK_Y, 'h  (× 10⁻³⁴ J s)', SLIDERS.h.min, SLIDERS.h.max, v.h, ''],
        [PHI_TRACK_Y, 'φ  (eV)', SLIDERS.phi.min, SLIDERS.phi.max, v.phi, ' eV'],
      ] as [number, string, number, number, number, string][]) {
        line(g, TX0, y, TX1, y, PAL.dim, 4);
        text(g, head, (TX0 + TX1) / 2, y - 40, PAL.cyan, 11);
        text(g, `${val.toFixed(2)}${unit}`, Math.max(TX0 + 22, Math.min(TX1 - 22, trackX(val, min, max))), y + 42, PAL.cyan, 11);
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
      // the player's line: live in round 1, for a moment after a test shot in round 2, never in round 3; a win shows it, a miss does not
      const live = helperOn(r.assist, !!shot?.ok, flash.since(A.clock, k));
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.cyan;
      if (live) glow(g, col, 8, () => line(g, GX, yv(-v.phi), GR, yv(slope(v.h) * 18 - v.phi), col, 3));
      else if (shot && rt > 0.2) {
        // a miss without the live line: a fixed-length arrow at each measured point toward the side the line passes, and no line
        const sides = lineSides(r, shot.v.h, shot.v.phi);
        [[r.f1, r.v1], [r.f2, r.v2]].forEach(([f, vv], i) => {
          const s = sides[i];
          line(g, xf(f), yv(vv) - s * 12, xf(f), yv(vv) - s * 40, PAL.red, 3);
          text(g, s > 0 ? '▲' : '▼', xf(f), yv(vv) - s * 52 + 5, PAL.red, 14);
        });
      } else if (!shot) text(g, 'line hidden', (GX + GR) / 2, 70, PAL.dim, 12);
      orb(g, 545, 56, 14, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'THE LINE FITS' : 'MISSES THE POINTS', (GX + GR) / 2, 52, shot!.ok ? PAL.green : PAL.red, 16));
    },
  };
}

// Level 4. Inspiration: the Peggle and Angry Birds "tune two settings, then watch the run" loop, with an ammeter needle.
function brightLevel(random: () => number): DialLevel<BrightRound> {
  const X0 = 190;
  const XL = 410;
  const L = XL - X0;
  const lane = (i: number) => 78 + i * 20;
  const knobY = (b: number) => 300 - ((b - 1) / 9) * 210;
  const voltY = (vt: number) => 310 - (vt / 40) * 220;
  const GX = (volts: number) => 170 + (volts + 4.2) * 50;
  const GY = (cur: number) => Math.max(210, 322 - (cur / NEEDLE_MAX) * 100);
  const CX = 530;
  const CY = 108;
  const CR = 44;
  const ease = (s: number) => 1 - (1 - Math.min(1, Math.max(0, s))) ** 2;
  const angle = (frac: number) => Math.PI + Math.PI * Math.min(1, Math.max(0, frac));
  let pendingTest = false;
  let testAt = -99;
  let lastK = -1;
  return {
    hero: {
      name: 'Volt',
      role: 'a ball of electrons running the reference experiment again with a new lamp',
      story: 'Volt runs the reference experiment again with a new lamp. A brighter lamp frees more electrons, so the saturation current grows, but each electron still gets the same energy from one photon. Only a new colour changes the stopping potential.',
      objective: 'Set the brightness and the stopping voltage that match the new run, in three rounds.',
    },
    rounds: brightRounds(random),
    charges: [1, 1, 0],
    dials: [
      { key: 'b', aria: 'Photon rate (brightness): the number of photon streams', label: 'Photon rate (brightness)', unit: '', step: BRIGHT_SLIDERS.b.step, min: BRIGHT_SLIDERS.b.min, max: BRIGHT_SLIDERS.b.max, start: BRIGHT_START.b, text: (x) => streamsText(x) },
      { key: 'vt', aria: 'Stopping voltage in volts', label: 'Stopping voltage', unit: 'V', step: BRIGHT_SLIDERS.vt.step, min: BRIGHT_SLIDERS.vt.min, max: BRIGHT_SLIDERS.vt.max, start: BRIGHT_START.vt, text: (x) => voltsText(x) },
    ],
    handles: [
      { dial: 'b', at: (_r, v) => [28, knobY(v.b)], drag: (_r, _px, py) => 1 + ((300 - py) / 210) * 9, radius: 22 },
      { dial: 'vt', at: (_r, v) => [610, voltY(v.vt)], drag: (_r, _px, py) => ((310 - py) / 220) * 40, radius: 22 },
    ],
    test: {
      button: '🔦 Test run',
      aria: 'Test run: show the current and voltage graph and read the meters',
      read: (r, v) => {
        pendingTest = true;
        return brightReading(r, v.b, v.vt);
      },
    },
    fire: { button: '💡 Run', aria: 'Switch on the lamp and run the experiment' },
    judge: (r, v) => judgeBright(r, v.b, v.vt).ok,
    miss: (r, v) => brightMiss(r, v.b, v.vt),
    win: (r) => brightWin(r),
    hint: (r) => `${brightIntel(r)} ${r.assist === 0 ? 'The current–voltage graph is live.' : r.assist === 1 ? 'The graph is off: a test run shows it for a moment.' : 'No graph: work it out.'}`,
    // a fixed point in the middle of the tube: never the winning setting
    hit: () => [300, 125],
    delay: 1.4,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      if (k !== lastK) {
        lastK = k;
        testAt = -99;
        pendingTest = false;
      }
      if (pendingTest) {
        testAt = t;
        pendingTest = false;
      }
      const col = colour(HC / r.e2);
      const mood = shot ? (shot.ok ? 'cheer' : 'worried') : 'happy';
      const kind = streamKind(r, v.vt);
      const showGraph = r.assist === 0 || (shot === null && t - testAt < 1.8);
      // the reference run and the new run
      text(g, `Reference: ${streamsText(r.b1)} give ${r.i1} µA, ${d1(r.e1)} eV photons are stopped by ${d1(r.v01)} V`, 320, 14, PAL.dim, 11);
      text(g, `Now: ${r.e2 === r.e1 ? 'the same colour' : `${d1(r.e2)} eV photons`}, target ${r.i2} µA`, 320, 30, PAL.white, 11);
      // the lamp with its brightness knob
      g.fillStyle = PAL.dim;
      g.fillRect(100, 150, 20, 26);
      g.fillRect(94, 174, 32, 8);
      orb(g, 110, 125, 22 + Math.sin(t * 9) * 0.6, col, t, mood);
      text(g, `rate ${v.b}`, 28, 74, PAL.yellow, 12);
      line(g, 28, 90, 28, 300, PAL.dim, 4);
      text(g, '1', 28, 318, PAL.dim, 10);
      // the photon streams: one per unit of brightness
      for (let s = 0; s < v.b; s++) {
        const y = 125 + (s - (v.b - 1) / 2) * 11;
        for (let j = 0; j < 3; j++) {
          const x = 142 + ((t * 70 + s * 17 + j * 15) % 44);
          glow(g, col, 6, () => {
            g.fillStyle = col;
            g.beginPath();
            g.arc(x, y, 2.4, 0, Math.PI * 2);
            g.fill();
          });
        }
      }
      // the phototube
      g.fillStyle = 'rgba(160,190,255,0.10)';
      g.fillRect(150, 56, 300, 136);
      g.strokeStyle = PAL.dim;
      g.lineWidth = 2;
      g.strokeRect(150, 56, 300, 136);
      line(g, X0, 66, X0, 186, PAL.dim, 6);
      line(g, XL, 66, XL, 186, PAL.pink, 6);
      text(g, 'emitter', X0, 52, PAL.dim, 10);
      text(g, 'collector', XL, 52, PAL.pink, 10);
      // the retarding field (the player's own voltage)
      line(g, X0, 186, XL, 186 - (v.vt / 10) * 8, PAL.yellow, 2, [6, 5]);
      // the electrons: resting before the run, then a fixed pattern that depends only on the side of the stopping voltage
      for (let i = 0; i < 6; i++) {
        const y = lane(i);
        if (!shot) {
          orb(g, X0 + 12, y + Math.sin(t * 3 + i) * 2, 6, PAL.dim, t + i, 'happy');
          continue;
        }
        const u = rt - (0.1 + 0.1 * i);
        const frac = turnFraction(kind, i);
        const xT = Math.min(XL - 8, X0 + L * frac);
        let x = X0 + 12;
        let drawIt = true;
        if (u > 0) {
          if (u < 0.7) x = X0 + 12 + (xT - X0 - 12) * ease(u / 0.7);
          else if (kind === 'through' && frac >= 1) {
            drawIt = false;
            if (u < 0.95) glow(g, PAL.red, 14, () => {
              g.fillStyle = PAL.red;
              g.beginPath();
              g.arc(XL, y, 8 * (1 - (u - 0.7) / 0.25) + 2, 0, Math.PI * 2);
              g.fill();
            });
          } else x = xT - (xT - X0 - 12) * Math.min(1, (u - 0.7) / 0.5) ** 2;
        }
        if (drawIt) orb(g, x, y, 6, PAL.green, t + i, kind === 'stopped' ? 'cheer' : 'worried');
      }
      orb(g, 100, 250, 14, PAL.green, t, mood);
      text(g, 'Volt', 100, 276, PAL.dim, 10);
      // the ammeter: the needle rests at zero until the run, then parks at the mark or a fixed distance from it
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.beginPath();
      g.arc(CX, CY, CR, Math.PI, 2 * Math.PI);
      g.fill();
      g.strokeStyle = PAL.white;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(CX, CY, CR, Math.PI, 2 * Math.PI);
      g.stroke();
      for (let j = 0; j <= 14; j++) line(g, CX + CR * 0.88 * Math.cos(angle(j / 14)), CY + CR * 0.88 * Math.sin(angle(j / 14)), CX + CR * Math.cos(angle(j / 14)), CY + CR * Math.sin(angle(j / 14)), PAL.dim, 1.5);
      const fT = r.i2 / NEEDLE_MAX;
      line(g, CX + CR * 0.7 * Math.cos(angle(fT)), CY + CR * 0.7 * Math.sin(angle(fT)), CX + CR * 1.12 * Math.cos(angle(fT)), CY + CR * 1.12 * Math.sin(angle(fT)), PAL.yellow, 3);
      const fin = needleReading(r, v.b) / NEEDLE_MAX;
      const nf = shot ? fin * ease(rt / 1.0) + 0.012 * Math.sin(rt * 22) * Math.exp(-rt * 3) : 0.01 * (1 + Math.sin(t * 2));
      line(g, CX, CY, CX + CR * 0.85 * Math.cos(angle(nf)), CY + CR * 0.85 * Math.sin(angle(nf)), PAL.white, 2.5);
      g.fillStyle = PAL.white;
      g.beginPath();
      g.arc(CX, CY, 4, 0, Math.PI * 2);
      g.fill();
      text(g, 'µA', CX, CY + 18, PAL.dim, 11);
      text(g, `target ${r.i2} µA`, CX, 140, PAL.yellow, 11);
      line(g, XL, CY, CX - CR, CY, PAL.dim, 2);
      const verdictOn = shot !== null && rt > 1.4;
      glow(g, verdictOn ? (shot!.ok ? PAL.green : PAL.red) : PAL.dim, verdictOn ? 12 : 0, () => {
        g.fillStyle = verdictOn ? (shot!.ok ? PAL.green : PAL.red) : 'rgba(255,255,255,0.15)';
        g.beginPath();
        g.arc(CX, 162, 8, 0, Math.PI * 2);
        g.fill();
      });
      // the battery: long plate +, short plate −
      line(g, CX - 18, 200, CX + 18, 200, PAL.white, 3);
      line(g, CX - 9, 210, CX + 9, 210, PAL.white, 5);
      text(g, '+', CX - 30, 204, PAL.white, 12);
      text(g, '−', CX - 22, 216, PAL.white, 14);
      text(g, `${voltsText(v.vt)} V`, CX, 236, PAL.yellow, 14);
      text(g, 'retarding', CX, 252, PAL.dim, 10);
      line(g, 610, 90, 610, 310, PAL.dim, 4);
      text(g, '4.0 V', 610, 80, PAL.dim, 10);
      text(g, '0', 610, 326, PAL.dim, 10);
      // the current-voltage graph: live in round 1, a test run in round 2, none in the boss round
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(170, 205, 270, 124);
      if (showGraph) {
        line(g, GX(-4.2), GY(0), GX(1), GY(0), PAL.white, 1.5);
        line(g, GX(0), 210, GX(0), GY(0), PAL.dim, 1);
        for (let vv = -4; vv <= 1; vv++) {
          line(g, GX(vv), GY(0) - 3, GX(vv), GY(0) + 3, PAL.dim, 1.5);
          text(g, vv === 0 ? '0' : vv > 0 ? `+${vv}` : `−${-vv}`, GX(vv), GY(0) + 14, PAL.dim, 9);
        }
        text(g, 'voltage (V)', 305, 326, PAL.dim, 9);
        text(g, 'current', 190, 218, PAL.dim, 9);
        line(g, GX(-4.2), GY(r.i2), GX(1), GY(r.i2), PAL.yellow, 1.5, [5, 4]);
        const plateau = (v.b * r.i1) / r.b1;
        const v0 = r.v02t / 10;
        g.save();
        glow(g, PAL.cyan, 6, () => {
          g.strokeStyle = PAL.cyan;
          g.lineWidth = 2.5;
          g.beginPath();
          for (let s = 0; s <= 52; s++) {
            const vv = -v0 + (s / 52) * (1 + v0);
            const cur = vv >= 0 ? plateau : plateau * (1 - (vv / v0) ** 2);
            if (s === 0) g.moveTo(GX(vv), GY(cur));
            else g.lineTo(GX(vv), GY(cur));
          }
          g.stroke();
        });
        g.restore();
        line(g, GX(-v.vt / 10), 210, GX(-v.vt / 10), GY(0), PAL.pink, 2, [4, 4]);
      } else text(g, 'graph off', 305, 270, PAL.dim, 13);
      if (shot && rt > 1.0) {
        A.canvas.dataset.needle = String(needleReading(r, v.b) - r.i2);
        A.canvas.dataset.stream = kind;
      }
      if (verdictOn) {
        const bad = v.b !== r.b2 ? (v.b < r.b2 ? 'CURRENT BELOW THE MARK' : 'CURRENT ABOVE THE MARK') : kind === 'through' ? 'STILL GETTING THROUGH' : 'TURNED BACK EARLY';
        glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'BOTH READINGS MATCH' : bad, 320, 48, shot!.ok ? PAL.green : PAL.red, 14));
      }
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 4 ? brightLevel(ctx.random) : ctx.level === 1 ? thresholdLevel(ctx.random) : ctx.level === 2 ? stopLevel(ctx.random) : lineLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen showing photons hitting a metal, electrons flying off, and a graph of stopping potential.');
  },
});
