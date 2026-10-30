// Inspirations: Space Invaders (count the bullets that arrive each second), Rock Band's tuner (match one wave to another)
// and Mega Man's charge shot (charge the tube to the level that does the job).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { helperOn, paidFlash } from '@core/aidflash';
import { fmt } from '@core/judge';
import { glow, line, orb, text } from '@core/neon';
import { HIT, MISS_FRAC, SLIDERS, START, countExplain, countMiss, countReading, countRounds, electronNm, judgeCount, judgeTube, judgeTune, photonJ, specX, tubeExplain, tubeMiss, tubeReading, tubeRounds, tuneExplain, tuneMiss, tuneReading, tuneRounds, xrayMinA, type CountRound, type TubeRound, type TuneRound } from './logic';

const trackX = (v: number, min: number, max: number) => 60 + ((v - min) / (max - min)) * 520;
const fromTrack = (px: number, min: number, max: number) => min + ((px - 60) / 520) * (max - min);

function countLevel(random: () => number): DialLevel<CountRound> {
  const S = SLIDERS.n;
  const flash = paidFlash();
  return {
    hero: {
      name: 'Pixel',
      role: 'a gunner counting the photon bullets that arrive each second',
      story: 'A laser beam is a stream of photons. Each photon carries the energy hf and the beam’s power is the energy that arrives each second, so the number of photons per second is the power divided by the energy of one photon.',
      objective: 'Set the counter to the number of photons that arrive each second, in three rounds. A test shot costs a charge; the live power check fades.',
    },
    rounds: countRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'n', aria: 'Photons per second in units of 10 to the 15', label: 'Photons per second', unit: '× 10¹⁵', step: S.step, min: S.min, max: S.max, start: START.n, text: (x) => x.toFixed(1) }],
    handles: [{ dial: 'n', at: (_r, v) => [trackX(v.n, S.min, S.max), 312], drag: (_r, px) => fromTrack(px, S.min, S.max), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the energy of one photon', read: (r) => (flash.paid(), countReading(r)) },
    fire: { button: '👾 Count', aria: 'Lock in the photon count' },
    judge: (r, v) => judgeCount(r, v.n),
    miss: (r, v) => countMiss(r, v.n),
    win: (r) => `${countExplain(r)[0]} ${countExplain(r)[1]}`,
    hint: (r) => `Laser: f = ${fmt(r.f)} × 10¹⁴ Hz, power ${fmt(r.p)} mW, h = 6.63 × 10⁻³⁴ J s. ${r.assist === 0 ? 'The power check is live.' : r.assist === 1 ? 'The check shows for a moment after a test shot.' : 'No check: work it out.'}`,
    hit: () => HIT.n,
    delay: 1.0,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      const since = flash.since(A.clock, k);
      orb(g, 60, 160, 18, PAL.cyan, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      text(g, 'laser', 60, 196, PAL.dim, 11);
      // the stream: dots spaced by the counter value (more photons per second, more dots)
      const rate = Math.max(0.5, v.n) * 0.9;
      for (let k = 0; k < 40; k++) {
        const x = 90 + ((k * (420 / (rate * 4)) + t * 140) % 380);
        if (x > 470) continue;
        g.fillStyle = PAL.cyan;
        g.beginPath();
        g.arc(x, 160 + Math.sin(k * 3.3) * 12, 3, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = PAL.white;
      g.lineWidth = 3;
      g.strokeRect(470, 110, 50, 100);
      text(g, 'target', 495, 104, PAL.dim, 11);
      // the power that your count would deliver, against the beam's power: the helper is live in round 1, around a test
      // shot in round 2 and on a win. After a miss the bar takes a fixed over or under length and carries no numbers.
      const implied = (v.n * 1e15 * photonJ(r.f) * 1e-19) * 1e3;
      const helper = helperOn(r.assist, !!shot?.ok, since);
      text(g, 'power your count would carry', 330, 250, PAL.dim, 11);
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(100, 256, 460, 14);
      const maxP = Math.max(r.p * 3, 6);
      const bx = 100 + 460 * (r.p / maxP);
      if (helper) {
        g.fillStyle = PAL.cyan;
        g.fillRect(100, 256, 460 * Math.min(1, implied / maxP), 14);
        line(g, bx, 248, bx, 276, PAL.yellow, 3);
        text(g, `beam: ${fmt(r.p)} mW`, bx, 290, PAL.yellow, 11);
        text(g, `${fmt(implied)} mW`, 100 + 460 * Math.min(1, implied / maxP), 248, PAL.white, 11);
      } else if (shot) {
        g.fillStyle = PAL.red;
        g.fillRect(100, 256, Math.min(460, (bx - 100) * (v.n > r.nSol ? MISS_FRAC.over : MISS_FRAC.under)), 14);
        line(g, bx, 248, bx, 276, PAL.yellow, 3);
      } else text(g, '?', 330, 268, PAL.dim, 16);
      text(g, `${v.n.toFixed(1)} × 10¹⁵ per second`, 330, 36, PAL.white, 15);
      for (let x = 60; x <= 580; x += 52) line(g, x, 306, x, 318, PAL.dim, 1.5);
      line(g, 60, 312, 580, 312, PAL.dim, 3);
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'COUNT CONFIRMED' : 'MISCOUNT', 330, 66, shot!.ok ? PAL.green : PAL.red, 16));
    },
  };
}

function tuneLevel(random: () => number): DialLevel<TuneRound> {
  const S = SLIDERS.v;
  const flash = paidFlash();
  const AX = 175;
  const K = 600;
  return {
    hero: {
      name: 'Eli',
      role: 'an electron that must be tuned to a crystal like a guitar string to a note',
      story: 'An electron behaves like a wave of wavelength λ = h/p. Accelerate it through V volts and p = √(2meV). A crystal diffracts the electron strongly only when its wavelength matches the spacing of the atoms, like the tuner on a guitar.',
      objective: 'Set the accelerating voltage so the electron’s wavelength matches the crystal spacing, in three rounds. A test shot costs a charge; the live waves fade.',
    },
    rounds: tuneRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'v', aria: 'Accelerating voltage in volts', label: 'Accelerating voltage', unit: 'V', step: S.step, min: S.min, max: S.max, start: START.v }],
    handles: [{ dial: 'v', at: (_r, v) => [trackX(v.v, S.min, S.max), 314], drag: (_r, px) => fromTrack(px, S.min, S.max), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: measure the electron’s wavelength', read: (_r, v) => (flash.paid(), tuneReading(v.v)) },
    fire: { button: '🎸 Strum', aria: 'Send the electron at the crystal' },
    judge: (r, v) => judgeTune(r, v.v),
    miss: (r, v) => tuneMiss(r, v.v),
    win: (r) => `${tuneExplain(r)[0]} ${tuneExplain(r)[1]}`,
    hint: (r) => `Crystal spacing: ${fmt(r.target)} nm. The electron starts from rest; use h = 6.63 × 10⁻³⁴ J s, m = 9.1 × 10⁻³¹ kg, e = 1.6 × 10⁻¹⁹ C. ${r.assist === 0 ? 'The electron wave is drawn live.' : r.assist === 1 ? 'The wave shows for a moment after a test shot.' : 'No wave: work it out.'}`,
    hit: () => HIT.v,
    delay: 1.0,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      const since = flash.since(A.clock, k);
      const lamPx = K * r.target;
      // the player's own wave is the helper: live in round 1, around a test shot in round 2, on a win. After a miss the wave
      // takes a fixed over or under length (a multiple of the crystal spacing), never the player's own wavelength.
      const helper = helperOn(r.assist, !!shot?.ok, since);
      const elPx = helper ? K * electronNm(v.v) : K * r.target * (electronNm(v.v) > r.target ? MISS_FRAC.over : MISS_FRAC.under);
      // the crystal rows
      for (let x = 20; x < 620; x += lamPx) {
        for (const dy of [-40, 0, 40]) {
          g.fillStyle = PAL.yellow;
          g.beginPath();
          g.arc(x + lamPx / 2, AX + dy + 110, 5, 0, Math.PI * 2);
          g.fill();
        }
      }
      text(g, `crystal rows, ${fmt(r.target)} nm apart`, 320, 300, PAL.yellow, 11);
      // the target wave
      glow(g, PAL.yellow, 6, () => {
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 2;
        g.setLineDash([6, 5]);
        g.beginPath();
        for (let x = 20; x <= 620; x += 2) {
          const y = 90 - 22 * Math.sin(((x - 20) / lamPx) * Math.PI * 2);
          if (x === 20) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
        g.setLineDash([]);
      });
      text(g, 'wave that matches the crystal', 130, 58, PAL.yellow, 11);
      if (helper || shot) {
        const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.cyan;
        glow(g, col, 8, () => {
          g.strokeStyle = col;
          g.lineWidth = 3;
          g.beginPath();
          for (let x = 20; x <= 620; x += 2) {
            const y = 150 - 22 * Math.sin(((x - 20) / elPx) * Math.PI * 2 - t * 3);
            if (x === 20) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
        });
        if (helper) text(g, `your electron: ${fmt(electronNm(v.v))} nm`, 130, 192, col, 11);
      } else text(g, '?', 320, 160, PAL.dim, 36);
      orb(g, 40, 40, 14, PAL.cyan, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 60, 314, 580, 314, PAL.dim, 3);
      text(g, `${fmt(v.v)} V`, trackX(v.v, S.min, S.max), 338, PAL.white, 11);
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'IN TUNE' : 'OUT OF TUNE', 320, 30, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

function tubeLevel(random: () => number): DialLevel<TubeRound> {
  const S = SLIDERS.kv;
  const spec = specX;
  const flash = paidFlash();
  return {
    hero: {
      name: 'Charge',
      role: 'an X-ray tube that is being charged for a power shot',
      story: 'In an X-ray tube electrons hit a metal target after being accelerated through a high voltage. The most energetic X-ray photon takes all of one electron’s energy, eV = hf = hc/λ, so the voltage decides the shortest wavelength in the beam.',
      objective: 'Set the tube voltage so the shortest X-ray wavelength is the wanted one, in three rounds. A test shot costs a charge; the live spectrum fades.',
    },
    rounds: tubeRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'kv', aria: 'Tube voltage in kilovolts', label: 'Tube voltage', unit: 'kV', step: S.step, min: S.min, max: S.max, start: START.kv }],
    handles: [{ dial: 'kv', at: (_r, v) => [trackX(v.kv, S.min, S.max), 314], drag: (_r, px) => fromTrack(px, S.min, S.max), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the shortest wavelength', read: (_r, v) => (flash.paid(), tubeReading(v.kv)) },
    fire: { button: '⚡ Charge', aria: 'Fire the X-ray tube at this voltage' },
    judge: (r, v) => judgeTube(r, v.kv),
    miss: (r, v) => tubeMiss(r, v.kv),
    win: (r) => `${tubeExplain(r)[0]} ${tubeExplain(r)[1]}`,
    hint: (r) => `Wanted: shortest wavelength ${fmt(r.target)} Å (1 Å = 10⁻¹⁰ m). Use hc = 12.4 kV Å. ${r.assist === 0 ? 'The spectrum is drawn live.' : r.assist === 1 ? 'The spectrum shows for a moment after a test shot.' : 'No spectrum: work it out.'}`,
    hit: () => HIT.kv,
    delay: 1.0,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      const since = flash.since(A.clock, k);
      // axes of the spectrum
      line(g, 60, 250, 600, 250, PAL.white, 2);
      line(g, 60, 60, 60, 250, PAL.white, 2);
      text(g, 'X-ray wavelength (Å)', 330, 276, PAL.dim, 11);
      for (let a = 0; a <= 1.2; a += 0.2) {
        line(g, spec(a), 250, spec(a), 256, PAL.dim, 1.5);
        text(g, a.toFixed(1), spec(a), 268, PAL.dim, 10);
      }
      // the wanted cut-off
      line(g, spec(r.target), 56, spec(r.target), 250, PAL.yellow, 2.5, [6, 5]);
      text(g, `wanted: ${fmt(r.target)} Å`, spec(r.target) + 6, 70, PAL.yellow, 11, 'left');
      // the player's own spectrum is the helper: live in round 1, around a test shot in round 2, on a win. After a miss the
      // cut-off takes a fixed over or under place (a multiple of the wanted one), never the player's own, and has no label.
      const helper = helperOn(r.assist, !!shot?.ok, since);
      const own = xrayMinA(v.kv);
      const lmin = helper ? own : r.target * (own > r.target ? MISS_FRAC.over : MISS_FRAC.under);
      if (helper || shot) {
        const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.cyan;
        glow(g, col, 8, () => {
          g.strokeStyle = col;
          g.lineWidth = 3;
          g.beginPath();
          let first = true;
          for (let a = lmin; a <= 1.2; a += 0.004) {
            const I = ((a / lmin - 1) / (a * a * a)) * lmin ** 2 * 0.42;
            const y = 250 - Math.min(170, I * 170);
            const x = spec(a);
            if (first) {
              g.moveTo(x, 250);
              g.lineTo(x, y);
              first = false;
            } else g.lineTo(x, y);
          }
          g.stroke();
        });
        if (helper) text(g, `cut-off ${fmt(lmin)} Å`, spec(lmin) - 6, 230, PAL.white, 11, 'right');
      } else text(g, '?', 330, 160, PAL.dim, 40);
      orb(g, 90, 110, 16, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      // the charge bar
      line(g, 60, 314, 580, 314, PAL.dim, 3);
      g.fillStyle = PAL.pink;
      g.fillRect(60, 308, ((v.kv - S.min) / (S.max - S.min)) * 520, 12);
      text(g, `${fmt(v.kv)} kV`, trackX(v.kv, S.min, S.max), 338, PAL.white, 11);
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'POWER SHOT' : 'WRONG CHARGE', 330, 30, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? countLevel(ctx.random) : ctx.level === 2 ? tuneLevel(ctx.random) : tubeLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen with photons, an electron wave and an X-ray spectrum to tune.');
  },
});
