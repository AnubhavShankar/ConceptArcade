// Inspirations: Mario Kart (road surfaces change your speed: karts ride the wave crests into the mud) and
// Lemmings (a marching column that turns where the ground slows it).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { fmt } from '@core/judge';
import { glow, line, orb, text } from '@core/neon';
import { C, SLIDERS, asinD, bandExplain, bandMiss, bandRounds, judgeBand, judgeMud, mudExplain, mudMiss, mudReading, mudRounds, sinD, type BandRound, type MudRound } from './logic';

const RAD = Math.PI / 180;

function mudLevel(random: () => number): DialLevel<MudRound> {
  const XB = 330;
  const AX = 170;
  return {
    hero: {
      name: 'Kart',
      role: 'a wave crest racing from the road into the mud',
      story: 'A light wave runs along a road and crosses into a new medium. The little karts ride the wave crests. When the wave enters the medium its speed and its wavelength change, but the karts only stay on the crests if the frequency stays what it was.',
      objective: 'Dial the wavelength and the speed the wave has in the medium so the karts stay on the crests, in three rounds. A test shot costs a charge; the live crest view fades.',
    },
    rounds: mudRounds(random),
    charges: [1, 1, 1],
    dials: [
      { key: 'lam', aria: 'Wavelength in the medium in nanometres', label: 'Wavelength in the medium', unit: 'nm', step: SLIDERS.lam.step, min: SLIDERS.lam.min, max: SLIDERS.lam.max, start: (r) => r.lambda },
      { key: 'v', aria: 'Speed in the medium in units of 10 to the 8 metres per second', label: 'Speed in the medium', unit: '× 10⁸ m/s', step: SLIDERS.v.step, min: SLIDERS.v.min, max: SLIDERS.v.max, start: C, text: (v) => v.toFixed(2) },
    ],
    handles: [
      { dial: 'lam', at: (_r, v) => [XB + 0.2 * v.lam + 12, AX - 62], drag: (_r, px) => (px - XB - 12) / 0.2, radius: 22 },
    ],
    test: { button: '🔦 Test shot', aria: 'Test shot: check the frequency of these settings', read: (r, v) => mudReading(r, v.lam, v.v) },
    fire: { button: '🏁 Go!', aria: 'Send the wave into the mud' },
    judge: (r, v) => judgeMud(r, v.lam, v.v).ok,
    miss: (r, v) => mudMiss(r, v.lam, v.v),
    win: (r) => `${mudExplain(r)[0]} ${mudExplain(r)[1]}`,
    hint: (r) => `Wave in air: λ = ${r.lambda} nm, c = 3 × 10⁸ m/s. The mud has refractive index n = ${r.n}. ${r.assist === 0 ? 'The crest view is live.' : r.assist === 1 ? 'The crest view is dim: use a test shot.' : 'The crest view is off: work it out.'}`,
    hit: () => [XB + 80, AX],
    delay: 1.6,
    draw: ({ g, r, v, t, rt, shot }) => {
      const lamPx = 0.2 * r.lambda;
      const lam2Px = 0.2 * v.lam;
      const v2Px = (v.v / C) * lamPx;
      const showCrests = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      // the road and the mud
      g.fillStyle = 'rgba(160,170,230,0.1)';
      g.fillRect(0, 70, XB, 210);
      g.fillStyle = 'rgba(255,155,61,0.18)';
      g.fillRect(XB, 70, 640 - XB, 210);
      line(g, XB, 70, XB, 280, PAL.white, 3);
      text(g, 'air (the road)', 160, 92, PAL.dim, 12);
      text(g, `medium (the mud), n = ${r.n}`, 490, 92, PAL.orange, 12);
      // the wave: continuous at the boundary, because the frequency is the same on both sides
      const P = 1.6;
      const phase = (t / P) * Math.PI * 2;
      const wave = (x: number) => (x < XB ? Math.sin((x / lamPx) * Math.PI * 2 - phase) : Math.sin((XB / lamPx) * Math.PI * 2 + ((x - XB) / lam2Px) * Math.PI * 2 - phase));
      if (showCrests || dim) {
        g.save();
        g.globalAlpha = dim ? 0.35 : 1;
        glow(g, PAL.cyan, 8, () => {
          g.strokeStyle = PAL.cyan;
          g.lineWidth = 3;
          g.beginPath();
          for (let x = 10; x <= 630; x += 2) {
            const y = AX - 46 * wave(x);
            if (x === 10) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
        });
        g.restore();
        // karts: they ride the crests of the wave in air and then keep going at the new speed
        const tt = t / P;
        for (let m = -3; m < 9; m++) {
          const xAir = lamPx * (m + 0.25 + tt);
          const tCross = (XB / lamPx - m - 0.25) * 1; // in periods
          const x = tt >= tCross ? XB + (tt - tCross) * v2Px : xAir;
          if (x < 8 || x > 632) continue;
          const y = AX - 46 * wave(x);
          orb(g, x, y - 14, 8, x < XB ? PAL.cyan : PAL.orange, t + m, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
        }
      } else text(g, '?', 320, AX + 10, PAL.dim, 44);
      text(g, `${fmt(v.lam)} nm`, XB + 90, 262, PAL.orange, 13);
      text(g, `${fmt(r.lambda)} nm`, 160, 262, PAL.cyan, 13);
      text(g, `v = ${fmt(v.v)} × 10⁸`, XB + 90, 246, PAL.orange, 11);
      text(g, 'v = 3 × 10⁸', 160, 246, PAL.cyan, 11);
      if (rt > 1.6) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'IN STEP' : 'OUT OF STEP', 320, 40, shot!.ok ? PAL.green : PAL.red, 18));
    },
  };
}

function bandLevel(random: () => number): DialLevel<BandRound> {
  const BX = 300;
  const BY = 190;
  return {
    hero: {
      name: 'Column',
      role: 'a marching column of lemmings that reaches slower or faster ground at a slant',
      story: 'A line of marchers meets new ground at a slant. The end of the line that reaches the ground first changes speed first, so the whole line swings round. Huygens’ wavelets show it: each point on the boundary sends out a wavelet at the new speed.',
      objective: 'Set the new direction so the wavefront you predict touches every wavelet, in three rounds. The live wavefront fades after round 1.',
    },
    rounds: bandRounds(random),
    charges: [0, 0, 0],
    dials: [{ key: 'r', aria: 'Angle of the new direction from the normal in degrees', label: 'New direction, from the normal', unit: '°', step: SLIDERS.r.step, min: SLIDERS.r.min, max: SLIDERS.r.max, start: 45 }],
    handles: [{ dial: 'r', at: (_r, v) => [BX + 105 * sinD(v.r), BY + 105 * Math.cos(v.r * RAD)], drag: (_r, px, py) => asinD(Math.min(1, Math.max(0, (px - BX) / Math.max(1, Math.hypot(px - BX, py - BY))))), radius: 24 }],
    fire: { button: '🚶 March', aria: 'Send the column over the boundary' },
    judge: (r, v) => judgeBand(r, v.r),
    miss: (r, v) => bandMiss(r, v.r),
    win: (r) => `The front stays straight: sin r = ${fmt((r.v2 / r.v1) * sinD(r.i))}, r = ${fmt(r.rSol)}°. ${bandExplain(r)[0]}`,
    hint: (r) => `Speed above the line v₁ = ${r.v1}, below it v₂ = ${r.v2} (× 10⁸ m/s); the column arrives at ${r.i}° to the normal. ${r.assist === 0 ? 'Your predicted wavefront is drawn live.' : r.assist === 1 ? 'The wavelets are drawn; the predicted front only appears when you march.' : 'Only the incoming column is drawn: work it out.'}`,
    hit: () => [BX + 40, BY + 50],
    delay: 1.2,
    draw: ({ g, r, v, t, rt, shot }) => {
      const sp1 = r.v1 * 40;
      const sp2 = r.v2 * 40;
      line(g, 20, BY, 620, BY, PAL.white, 3);
      line(g, BX, 40, BX, 330, PAL.dim, 1.2, [6, 5]);
      g.fillStyle = 'rgba(160,170,230,0.07)';
      g.fillRect(20, 40, 600, BY - 40);
      g.fillStyle = 'rgba(255,155,61,0.12)';
      g.fillRect(20, BY, 600, 140);
      text(g, `speed ${r.v1} × 10⁸`, 90, 60, PAL.dim, 12);
      text(g, `speed ${r.v2} × 10⁸`, 90, 322, PAL.orange, 12);
      const i = r.i * RAD;
      const x0 = 120;
      const T0 = 130 / sp2;
      // the incoming wavefront and the rays
      const xEnd = x0 + (T0 * sp1) / Math.sin(i);
      const front: [number, number] = [xEnd, BY];
      const dir: [number, number] = [Math.sin(i), Math.cos(i)];
      line(g, front[0], front[1], front[0] + 150 * Math.cos(i), front[1] - 150 * Math.sin(i), PAL.cyan, 3);
      for (let k = 0; k < 4; k++) {
        const sx = x0 + k * 70;
        line(g, sx - 140 * dir[0], BY - 140 * dir[1], sx, BY, PAL.cyan, 1.4);
      }
      // the wavelets
      const live = shot !== null ? 1 : Math.min(1, (t % 4) / 1.5 + 0.2);
      for (let xj = x0; xj < xEnd; xj += 24) {
        const R = sp2 * (T0 - ((xj - x0) * Math.sin(i)) / sp1);
        if (R <= 1) continue;
        g.strokeStyle = PAL.orange;
        g.globalAlpha = 0.6 * live;
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(xj, BY, R, 0, Math.PI);
        g.stroke();
        g.globalAlpha = 1;
      }
      // the predicted wavefront: tangent to the first wavelet, with the normal along the chosen direction
      const showFront = r.assist === 0 || shot !== null;
      if (showFront) {
        const rr = v.r * RAD;
        const n: [number, number] = [Math.sin(rr), Math.cos(rr)];
        const R0 = sp2 * T0;
        const px = x0 + n[0] * R0;
        const py = BY + n[1] * R0;
        const tan: [number, number] = [n[1], -n[0]];
        g.save();
        g.beginPath();
        g.rect(20, BY, 600, 140);
        g.clip();
        glow(g, shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow, 8, () => line(g, px - tan[0] * 170, py - tan[1] * 170, px + tan[0] * 170, py + tan[1] * 170, shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow, 3));
        g.restore();
        line(g, BX, BY, BX + 130 * n[0], BY + 130 * n[1], PAL.yellow, 2, [6, 5]);
      } else {
        const rr = v.r * RAD;
        line(g, BX, BY, BX + 130 * Math.sin(rr), BY + 130 * Math.cos(rr), PAL.yellow, 2, [6, 5]);
      }
      if (rt > 1.2) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'THE FRONT HOLDS' : 'THE COLUMN BREAKS', 320, 30, shot!.ok ? PAL.green : PAL.red, 16));
      for (let k = 0; k < 6; k++) orb(g, 80 + k * 22, 90 + (k % 2) * 6, 6, PAL.yellow, t + k, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? mudLevel(ctx.random) : bandLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen showing a wave or a column of marchers crossing into a slower medium.');
  },
});
