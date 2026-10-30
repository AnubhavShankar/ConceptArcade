// Inspirations: Mario Kart (road surfaces change your speed: karts ride the wave crests into the mud) and
// Lemmings (a marching column that turns where the ground slows it).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { helperOn, paidFlash } from '@core/aidflash';
import { fmt } from '@core/judge';
import { glow, line, orb, text } from '@core/neon';
import { C, HEAD, SLIDERS, asinD, bandExplain, bandMiss, bandRounds, fmtHead, judgeBand, judgeMud, judgeRainbow, mudExplain, mudMiss, mudReading, mudRounds, rainbowDelay, rainbowExplain, rainbowLeader, rainbowMiss, rainbowRounds, rainbowTest, raceTimes, sinD, type BandRound, type MudRound, type RainbowRound } from './logic';

const RAD = Math.PI / 180;

function mudLevel(random: () => number): DialLevel<MudRound> {
  const XB = 330;
  const AX = 170;
  const flash = paidFlash();
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
    test: { button: '🔦 Test shot', aria: 'Test shot: check the frequency of these settings', read: (r, v) => (flash.paid(), mudReading(r, v.lam, v.v)) },
    fire: { button: '🏁 Go!', aria: 'Send the wave into the mud' },
    judge: (r, v) => judgeMud(r, v.lam, v.v).ok,
    miss: (r, v) => mudMiss(r, v.lam, v.v),
    win: (r) => `${mudExplain(r)[0]} ${mudExplain(r)[1]}`,
    hint: (r) => `Wave in air: λ = ${r.lambda} nm, c = 3 × 10⁸ m/s. The mud has refractive index n = ${r.n}. ${r.assist === 0 ? 'The crest view is live.' : r.assist === 1 ? 'The crest view shows for a moment after a test shot.' : 'The crest view is off: work it out.'}`,
    hit: () => [XB + 80, AX],
    delay: 1.6,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      const lamPx = 0.2 * r.lambda;
      const lam2Px = 0.2 * v.lam;
      const v2Px = (v.v / C) * lamPx;
      // the crests and karts: live in round 1, for a moment after a test shot in round 2, never in round 3 before the run; every run shows what it did
      const showCrests = helperOn(r.assist, shot !== null, flash.since(A.clock, k));
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
      if (showCrests) {
        g.save();
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
      // the true wavelets follow the hint: live help in round 1, shown before the march in round 2, never in round 3, and during a
      // shot only on a win (a miss must not draw the true construction)
      const showWavelets = shot !== null ? shot.ok : r.assist <= 1;
      const live = shot !== null ? 1 : Math.min(1, (t % 4) / 1.5 + 0.2);
      for (let xj = x0; showWavelets && xj < xEnd; xj += 24) {
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
        // on a miss the player's own front is shifted by a FIXED fraction along its normal: inside the wavelets' reach when too steep
        // ("cuts through"), outside when too shallow ("floats clear"); never a shift that grows with the error
        const R0 = sp2 * T0 * (shot && !shot.ok ? (v.r > r.rSol ? 0.9 : 1.1) : 1);
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

// ---- level 3: Rainbow race (two kart pulses through a glass block) -------------------------------------------------------------
const VIOLET = '#b57bff';

/** A small racing kart with a pulse-faced driver: wheels that turn, a helmet stripe, exhaust puffs, and a sweat drop when worried. */
function kart(g: CanvasRenderingContext2D, x: number, y: number, color: string, t: number, mood: 'happy' | 'worried' | 'cheer', moving: boolean) {
  const bob = Math.sin(t * (moving ? 18 : 5) + x * 0.05) * (moving ? 0.8 : 1.2);
  const by = y + bob;
  // exhaust puffs, idle and moving
  for (let i = 0; i < 3; i++) {
    const ph = (t * (moving ? 3 : 1.2) + i / 3) % 1;
    g.globalAlpha = 0.45 * (1 - ph);
    g.fillStyle = PAL.white;
    g.beginPath();
    g.arc(x - 28 - ph * (moving ? 22 : 10), by + 2 - ph * 6, 2 + ph * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // body, nose and spoiler
  g.fillStyle = color;
  g.fillRect(x - 26, by - 2, 30, 9);
  g.beginPath();
  g.moveTo(x + 4, by - 2);
  g.lineTo(x + 14, by + 5);
  g.lineTo(x + 4, by + 7);
  g.closePath();
  g.fill();
  g.fillStyle = PAL.white;
  g.fillRect(x - 28, by - 8, 4, 8);
  // wheels with a turning spoke
  for (const wx of [x - 19, x - 2]) {
    g.fillStyle = '#1b1030';
    g.beginPath();
    g.arc(wx, by + 8, 5.5, 0, Math.PI * 2);
    g.fill();
    const a = (moving ? t * 22 : t * 2) + wx;
    line(g, wx - 4 * Math.cos(a), by + 8 - 4 * Math.sin(a), wx + 4 * Math.cos(a), by + 8 + 4 * Math.sin(a), PAL.dim, 1.4);
  }
  // the driver: a pulse face under a helmet stripe
  orb(g, x - 11, by - 13, 8, color, t, mood);
  glow(g, PAL.white, 4, () => {
    g.strokeStyle = PAL.white;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x - 11, by - 13, 8.5, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  });
  if (mood === 'worried') {
    g.fillStyle = PAL.cyan;
    g.beginPath();
    g.arc(x - 1, by - 20 + ((t * 8) % 6), 2, 0, Math.PI * 2);
    g.fill();
  }
}

function rainbowLevel(random: () => number): DialLevel<RainbowRound> {
  const X0 = 44;
  const XG = 250;
  const XE = 450;
  const YR = 150;
  const YV = 225;
  const KR = 0.6;
  const KV = 0.55;
  /** Where a kart is: waiting, riding (fast in air, slow in the glass), then coasting past the finish. */
  const place = (start: number, dur: number, slow: number, rt: number) => {
    if (rt < start) return X0;
    const e = rt - start;
    if (e >= dur) return XE + Math.min(120, 110 * (e - dur));
    const u = e / dur;
    const fa = (XG - X0) / (XG - X0 + (XE - XG) / slow);
    return u < fa ? X0 + ((XG - X0) * u) / fa : XG + ((XE - XG) * (u - fa)) / (1 - fa);
  };
  const crests = (g: CanvasRenderingContext2D, y: number, color: string, n: number) => {
    g.globalAlpha = 0.5;
    for (let x = X0 + 20; x < XG; x += 22) line(g, x, y - 7, x, y + 7, color, 1.5);
    for (let x = XG + 4; x < XE; x += 22 / n) line(g, x, y - 7, x, y + 7, color, 1.5);
    for (let x = XE + 10; x < 620; x += 22) line(g, x, y - 7, x, y + 7, color, 1.5);
    g.globalAlpha = 1;
  };
  const lamp = (g: CanvasRenderingContext2D, y: number, green: boolean) => {
    g.fillStyle = '#1b1030';
    g.fillRect(X0 - 30, y - 12, 14, 24);
    glow(g, green ? PAL.green : PAL.red, 8, () => {
      g.fillStyle = green ? PAL.green : PAL.red;
      g.beginPath();
      g.arc(X0 - 23, y + (green ? 5 : -5), 4, 0, Math.PI * 2);
      g.fill();
    });
  };
  return {
    hero: {
      name: 'Pulse twins',
      role: 'a red and a violet light pulse racing through a block of glass',
      story: 'In glass, light slows down to c/n, and n is a little bigger for violet than for red. That is dispersion: the colours do not travel together.',
      objective: 'Give the violet pulse the head start that makes both colours leave the glass together, in three rounds.',
    },
    rounds: rainbowRounds(random),
    charges: [1, 1, 0],
    dials: [
      { key: 'head', aria: 'Head start of the violet pulse in tenths of a nanosecond, negative if red goes first', label: 'Violet head start', unit: 'ns', step: HEAD.step, min: HEAD.min, max: HEAD.max, start: HEAD.start, text: fmtHead },
    ],
    handles: [{ dial: 'head', at: (_r, v) => [320 + v.head * 7, 52], drag: (_r, px) => Math.round((px - 320) / 7), radius: 20 }],
    test: { button: '🏁 Test race', aria: 'Test race: see how long each colour takes in the glass', read: (r, v) => rainbowTest(r, v.head) },
    fire: { button: '🚦 Release both pulses', aria: 'Release the violet and red pulses' },
    judge: (r, v) => judgeRainbow(r, v.head),
    miss: (r, v) => rainbowMiss(r, v.head),
    win: (r) => `${rainbowExplain(r)[0]} ${rainbowExplain(r)[1]}`,
    hint: (r) => `A ${r.d} m block of glass: n = ${r.nr} for red and n = ${r.nv} for violet, c = 3 × 10⁸ m/s. ${r.assist === 0 ? 'The speed of each colour in the glass is shown.' : r.assist === 1 ? 'The speeds are hidden: a test race costs a charge.' : 'No speeds and no test race: work it out.'}`,
    hit: () => [XE, 188],
    delay: (r, v) => rainbowDelay(r, v.head),
    draw: ({ g, r, v, t, rt, shot }) => {
      const x = v.head;
      const tm = raceTimes(r, x);
      const lead = rainbowLeader(r, x);
      const go = shot !== null;
      // the head-start track, with the player's own setting
      line(g, 110, 52, 530, 52, PAL.dim, 2);
      for (let k = -3; k <= 3; k++) line(g, 320 + k * 70, 46, 320 + k * 70, 58, PAL.dim, 1.5);
      text(g, 'red first', 110, 80, PAL.red, 11);
      text(g, '0', 320, 80, PAL.dim, 11);
      text(g, 'violet first', 530, 80, VIOLET, 11);
      glow(g, PAL.yellow, 8, () => {
        g.fillStyle = PAL.yellow;
        g.beginPath();
        g.arc(320 + x * 7, 52, 8, 0, Math.PI * 2);
        g.fill();
      });
      text(g, `${fmtHead(x)} ns`, 320 + x * 7, 30, PAL.yellow, 13);
      // the glass block and the lanes
      g.fillStyle = 'rgba(120,220,255,0.12)';
      g.fillRect(XG, 98, XE - XG, 180);
      line(g, XG, 98, XG, 278, PAL.cyan, 2);
      line(g, XE, 98, XE, 278, PAL.cyan, 2);
      text(g, 'glass', (XG + XE) / 2, 116, PAL.cyan, 12);
      text(g, `thickness d = ${r.d} m`, (XG + XE) / 2, 296, PAL.cyan, 12);
      line(g, X0 - 10, YR, 620, YR, 'rgba(255,90,90,0.25)', 22);
      line(g, X0 - 10, YV, 620, YV, 'rgba(181,123,255,0.25)', 22);
      crests(g, YR, PAL.red, r.nr);
      crests(g, YV, VIOLET, r.nv);
      text(g, 'red pulse', 80, YR - 24, PAL.red, 11);
      text(g, 'violet pulse', 88, YV - 24, VIOLET, 11);
      text(g, `n = ${r.nr}`, 350, YR + 28, PAL.red, 12);
      text(g, `n = ${r.nv}`, 350, YV + 28, VIOLET, 12);
      if (r.assist === 0) {
        text(g, `v = ${(Math.round((C / r.nr) * 100) / 100).toFixed(2)} × 10⁸ m/s`, 350, YR + 44, PAL.red, 11);
        text(g, `v = ${(Math.round((C / r.nv) * 100) / 100).toFixed(2)} × 10⁸ m/s`, 350, YV + 44, VIOLET, 11);
      }
      // the finish line and the start lights (each goes green when its pulse is released)
      for (let k = 0; k < 17; k++) {
        g.fillStyle = k % 2 ? PAL.white : '#1b1030';
        g.fillRect(XE + 2, 100 + k * 10, 6, 10);
      }
      lamp(g, YR, go && rt >= tm.sr);
      lamp(g, YV, go && rt >= tm.sv);
      // the karts
      const t0 = go ? rt : 0;
      const xr = go ? place(tm.sr, tm.durR, KR, t0) : X0;
      const xv = go ? place(tm.sv, tm.durV, KV, t0) : X0;
      const first = Math.min(tm.exitR, tm.exitV);
      const done = (exit: number) => go && rt >= exit;
      const moodOf = (me: 'red' | 'violet'): 'happy' | 'worried' | 'cheer' => {
        if (!go || rt < first) return 'happy';
        if (shot!.ok) return 'cheer';
        return lead === me ? 'cheer' : 'worried';
      };
      kart(g, xr, YR, PAL.red, t, moodOf('red'), go && rt >= tm.sr && !done(tm.exitR));
      kart(g, xv, YV, VIOLET, t, moodOf('violet'), go && rt >= tm.sv && !done(tm.exitV));
      // a photo-finish flash on a win, and the verdict once the later pulse is out
      if (go && shot!.ok && rt >= tm.exitR && rt < tm.exitR + 0.3) {
        g.globalAlpha = 0.5 * (1 - (rt - tm.exitR) / 0.3);
        g.fillStyle = PAL.white;
        g.fillRect(XE - 20, 98, 40, 180);
        g.globalAlpha = 1;
      }
      if (go && rt >= Math.max(tm.exitR, tm.exitV)) {
        const ok = shot!.ok;
        glow(g, ok ? PAL.green : PAL.red, 12, () => text(g, ok ? 'PHOTO FINISH!' : lead === 'red' ? 'RED LEADS' : 'VIOLET LEADS', 320, 326, ok ? PAL.green : PAL.red, 16));
      }
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? mudLevel(ctx.random) : ctx.level === 2 ? bandLevel(ctx.random) : rainbowLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen showing a wave, a column of marchers, or two coloured kart pulses crossing into a slower medium.');
  },
});
