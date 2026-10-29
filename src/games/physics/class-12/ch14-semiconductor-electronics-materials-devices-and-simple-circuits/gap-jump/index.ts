// Inspirations: Super Mario Bros. (a jump that has to clear a gap, no more and no less) and Minesweeper (a grid of atoms
// where one square is different, and the numbers around it must agree).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { fmt } from '@core/judge';
import { glow, line, orb, text } from '@core/neon';
import { LOG_NI2, SLIDERS, dopeExplain, dopeMiss, dopeReading, dopeRounds, gapExplain, gapMiss, gapReading, gapRounds, judgeDope, judgeGap, photonEv, type DopeRound, type GapRound } from './logic';

const fromTrack = (px: number, min: number, max: number) => min + ((px - 60) / 520) * (max - min);

function gapLevel(random: () => number): DialLevel<GapRound> {
  const S = SLIDERS.l;
  const X = (l: number) => 60 + ((l - S.min) / (S.max - S.min)) * 520;
  const Y = (e: number) => 270 - 35 * Math.min(e, 6.2);
  return {
    hero: {
      name: 'Sparky',
      role: 'an electron in the valence band that has to jump the gap into the conduction band',
      story: 'In a solid the electrons sit in the valence band, and they can carry a current only after they are lifted across the energy gap into the conduction band. The gap is 5.4 eV in carbon, 1.1 eV in silicon and 0.7 eV in germanium. A photon of wavelength λ carries hc/λ, with hc = 1240 eV nm.',
      objective: 'Choose the longest wavelength of light that still lifts the electron over the gap, in three rounds. A test shot costs a charge; the live energy meter fades.',
    },
    rounds: gapRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'l', aria: 'Wavelength of the photon in nanometres', label: 'Photon wavelength', unit: 'nm', step: S.step, min: S.min, max: S.max, start: 600, text: (x) => `${x} nm` }],
    handles: [{ dial: 'l', at: (_r, v) => [X(v.l), 312], drag: (_r, px) => fromTrack(px, S.min, S.max), radius: 20 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the photon energy and the gap', read: (r, v) => gapReading(r, v.l) },
    fire: { button: '🚀 Jump', aria: 'Fire the photon at the electron' },
    judge: (r, v) => judgeGap(r, v.l),
    miss: (r, v) => gapMiss(r, v.l),
    win: (r) => `${gapExplain(r)[0]} ${gapExplain(r)[1]}`,
    hint: (r) => `${r.name[0].toUpperCase()}${r.name.slice(1)} has a gap of ${fmt(r.eg)} eV. λ = hc/E with hc = 1240 eV nm. ${r.assist === 0 ? 'The energy meter is live.' : r.assist === 1 ? 'The meter is dim: use a test shot.' : 'No meter: work it out.'}`,
    hit: (r) => [330, Y(r.eg)],
    delay: 1.1,
    draw: ({ g, r, v, t, rt, shot }) => {
      const e = photonEv(shot ? shot.v.l : v.l);
      const top = Y(r.eg);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(150, 270, 340, 30);
      g.fillRect(150, 40, 340, Math.max(8, top - 40));
      text(g, 'conduction band', 320, 62, PAL.dim, 12);
      text(g, 'valence band', 320, 292, PAL.dim, 12);
      line(g, 150, 270, 490, 270, PAL.white, 2);
      line(g, 150, top, 490, top, PAL.white, 2);
      text(g, `${r.name}`, 70, 150, PAL.white, 14);
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      g.globalAlpha = dim ? 0.3 : 1;
      if (live || dim) {
        const col = e >= r.eg ? PAL.green : PAL.red;
        glow(g, col, 8, () => line(g, 530, 270, 530, Y(e), col, 6));
        text(g, `photon ${fmt(e)} eV`, 530, Y(e) - 10, col, 12);
        text(g, `gap ${fmt(r.eg)} eV`, 320, (top + 270) / 2, PAL.yellow, 13);
        line(g, 320, 270, 320, top, PAL.yellow, 2, [5, 5]);
      } else text(g, 'energy meter off', 530, 150, PAL.dim, 12);
      g.globalAlpha = 1;
      let rise = 0;
      if (shot) {
        const p = Math.min(1, rt / 0.8);
        const peak = e >= r.eg ? r.eg + 0.4 : e;
        rise = 35 * Math.min(peak, 6.2) * Math.sin((p * Math.PI) / 2);
        if (e < r.eg && rt > 0.8) rise *= Math.max(0, 1 - (rt - 0.8) * 2);
      }
      orb(g, 320, Math.max(46, 262 - rise), 13, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 60, 312, 580, 312, PAL.dim, 3);
      text(g, '100 nm', 60, 332, PAL.dim, 10);
      text(g, '2000 nm', 580, 332, PAL.dim, 10);
      if (rt > 1.1) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'CLEARED THE GAP' : e >= r.eg ? 'JUMPED, BUT NOT THE LONGEST' : 'FELL SHORT', 330, 24, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

function dopeLevel(random: () => number): DialLevel<DopeRound> {
  const S = SLIDERS.c;
  const X = (c: number) => 60 + ((c - S.min) / (S.max - S.min)) * 520;
  return {
    hero: {
      name: 'Doper',
      role: 'a crystal of silicon being doped with a few foreign atoms',
      story: 'Silicon has 4 valence electrons. A dopant atom with 5 (arsenic, phosphorus, antimony) gives one spare electron: n-type. An atom with 3 (boron, aluminium, indium, gallium) leaves a hole: p-type. Each dopant atom gives one carrier, which swamps the thermal ones, and in equilibrium n_e n_h = n_i² with n_i = 1.5 × 10¹⁶ m⁻³.',
      objective: 'Set the number of electrons and of holes in the doped crystal, as powers of ten per m³, in three rounds. A test shot costs a charge; the live checks fade.',
    },
    rounds: dopeRounds(random),
    charges: [1, 1, 1],
    dials: [
      { key: 'e', aria: 'Electrons per cubic metre as a power of ten', label: 'Electrons n_e', unit: '', step: S.step, min: S.min, max: S.max, start: 15, text: (x) => `10^${x.toFixed(2)} m⁻³` },
      { key: 'h', aria: 'Holes per cubic metre as a power of ten', label: 'Holes n_h', unit: '', step: S.step, min: S.min, max: S.max, start: 15, text: (x) => `10^${x.toFixed(2)} m⁻³` },
    ],
    handles: [
      { dial: 'e', at: (_r, v) => [X(v.e), 296], drag: (_r, px) => fromTrack(px, S.min, S.max), radius: 20 },
      { dial: 'h', at: (_r, v) => [X(v.h), 326], drag: (_r, px) => fromTrack(px, S.min, S.max), radius: 20 },
    ],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the dopant and the silicon atoms', read: (r) => dopeReading(r) },
    fire: { button: '🧪 Dope', aria: 'Dope the crystal with these carrier counts' },
    judge: (r, v) => judgeDope(r, v.e, v.h).ok,
    miss: (r, v) => dopeMiss(r, v.e, v.h),
    win: (r) => `${dopeExplain(r)[0]} ${dopeExplain(r)[1]}`,
    hint: (r) => `${r.dopant.name[0].toUpperCase()}${r.dopant.name.slice(1)}: ${fmt(r.ppm)} ppm of 5 × 10²⁸ silicon atoms/m³. Majority carriers ≈ dopant atoms; n_e n_h = n_i². ${r.assist === 0 ? 'The live checks are on.' : r.assist === 1 ? 'The checks are dim: use a test shot.' : 'No checks: work it out.'}`,
    hit: () => [330, 150],
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot }) => {
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 4; j++) {
          const x = 50 + i * 38;
          const y = 90 + j * 38;
          const dopant = i === 3 && j === 2;
          g.fillStyle = dopant ? PAL.pink : PAL.cyan;
          g.beginPath();
          g.arc(x, y, dopant ? 11 : 9, 0, Math.PI * 2);
          g.fill();
        }
      }
      if (r.type === 'n') {
        glow(g, PAL.yellow, 8, () => {
          g.fillStyle = PAL.yellow;
          g.beginPath();
          g.arc(164 + 20 * Math.cos(t * 2), 166 + 20 * Math.sin(t * 2), 5, 0, Math.PI * 2);
          g.fill();
        });
        text(g, 'spare electron', 164, 214, PAL.yellow, 11);
      } else {
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(164 + 14 * Math.cos(t * 2), 166 + 14 * Math.sin(t * 2), 6, 0, Math.PI * 2);
        g.stroke();
        text(g, 'a hole', 164, 214, PAL.yellow, 11);
      }
      text(g, `silicon + ${r.dopant.name}, ${fmt(r.ppm)} ppm`, 150, 60, PAL.white, 13);
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      g.globalAlpha = dim ? 0.35 : 1;
      if (live || dim) {
        const sum = v.e + v.h;
        const prod = Math.abs(sum - LOG_NI2) <= 0.05;
        const maj = r.type === 'n' ? v.e : v.h;
        const majOk = maj <= Math.log10(r.n) + 0.05;
        text(g, `n_e n_h = 10^${sum.toFixed(2)}  vs n_i² = 10^${LOG_NI2.toFixed(2)}  ${prod ? '✓' : '✗'}`, 430, 130, prod ? PAL.green : PAL.red, 13);
        text(g, `${r.type === 'n' ? 'electrons' : 'holes'} ≤ dopant atoms?  ${majOk ? '✓' : '✗'}`, 430, 164, majOk ? PAL.green : PAL.red, 13);
      } else text(g, 'checks off', 430, 146, PAL.dim, 12);
      g.globalAlpha = 1;
      orb(g, 540, 60, 14, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 60, 296, 580, 296, col, 3);
      line(g, 60, 326, 580, 326, col, 3);
      text(g, 'n_e', 40, 300, PAL.dim, 10, 'right');
      text(g, 'n_h', 40, 330, PAL.dim, 10, 'right');
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'WELL DOPED' : 'THE NUMBERS DO NOT FIT', 330, 24, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? gapLevel(ctx.random) : dopeLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen with an energy gap an electron must jump and a silicon crystal that is doped.');
  },
});
