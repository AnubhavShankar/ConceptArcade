// Inspirations: Gradius and Zuma (put the orbit on the allowed ring), Mario Kart (speed and lap time round a track) and
// Cookie Clicker (numbers with absurd numbers of zeros).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { fmt } from '@core/judge';
import { glow, line, orb, text } from '@core/neon';
import { A0, SLIDERS, bigExplain, bigMiss, bigReading, bigRounds, judgeBig, judgeLap, judgeRing, lapExplain, lapMiss, lapReading, lapRounds, radius, ringExplain, ringMiss, ringReading, ringRounds, type BigRound, type LapRound, type RingRound } from './logic';

const CX = 330;
const CY = 170;
const SC = 1.2;

function ringLevel(random: () => number): DialLevel<RingRound> {
  const S = SLIDERS.r;
  return {
    hero: {
      name: 'Hop',
      role: 'an electron that may only orbit on certain rings',
      story: 'In Bohr’s model the electron’s allowed orbits have radius rₙ = n²a₀, where a₀ = 0.53 Å = 5.3 × 10⁻¹¹ m is the radius of the first orbit. Hop is on a given level and must be set on the right ring.',
      objective: 'Set the orbit radius for the stated level, in three rounds. A test shot costs a charge; the ring guides fade.',
    },
    rounds: ringRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'r', aria: 'Radius of the orbit in units of 10 to the minus 11 metres', label: 'Orbit radius', unit: '× 10⁻¹¹ m', step: S.step, min: S.min, max: S.max, start: 10, text: (x) => x.toFixed(1) }],
    handles: [{ dial: 'r', at: (_r, v) => [CX + SC * v.r, CY], drag: (_r, px) => (px - CX) / SC, radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: which level does this ring belong to', read: (r, v) => ringReading(r, v.r) },
    fire: { button: '🛰️ Orbit', aria: 'Put the electron on this ring' },
    judge: (r, v) => judgeRing(r, v.r),
    miss: (r, v) => ringMiss(r, v.r),
    win: (r) => `${ringExplain(r)[0]} ${ringExplain(r)[1]}`,
    hint: (r) => `Hop is on level n = ${r.n}; the first orbit has radius a₀ = 0.53 Å = 5.3 × 10⁻¹¹ m. ${r.assist === 0 ? 'The allowed rings are drawn.' : r.assist === 1 ? 'The rings are dim: use a test shot.' : 'No rings: work it out.'}`,
    hit: (r) => [CX + SC * r.rSol, CY],
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot }) => {
      orb(g, CX, CY, 9, PAL.red, t);
      text(g, 'nucleus', CX, CY + 24, PAL.dim, 10);
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      if (live || dim) {
        for (let n = 1; n <= 5; n++) {
          g.strokeStyle = dim ? 'rgba(143,155,214,0.25)' : PAL.dim;
          g.lineWidth = 1.5;
          g.setLineDash([4, 5]);
          g.beginPath();
          g.arc(CX, CY, SC * radius(n), 0, Math.PI * 2);
          g.stroke();
          g.setLineDash([]);
          if (!dim) text(g, `n = ${n}`, CX - SC * radius(n) - 4, CY - 4, PAL.dim, 10, 'right');
        }
      }
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.cyan;
      glow(g, col, 8, () => {
        g.strokeStyle = col;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(CX, CY, SC * v.r, 0, Math.PI * 2);
        g.stroke();
      });
      const w = 2.4 / Math.sqrt(Math.max(1, v.r / A0));
      orb(g, CX + SC * v.r * Math.cos(t * w), CY + SC * v.r * Math.sin(t * w), 9, PAL.green, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      text(g, `target: level n = ${r.n}`, 100, 40, PAL.yellow, 14, 'left');
      text(g, `${fmt(v.r)} × 10⁻¹¹ m`, CX + SC * v.r, CY - 18, col, 11);
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'ON THE RING' : 'OFF THE RING', 330, 322, shot!.ok ? PAL.green : PAL.red, 16));
    },
  };
}

function lapLevel(): DialLevel<LapRound> {
  const vX = (v: number) => 60 + ((v - SLIDERS.v.min) / (SLIDERS.v.max - SLIDERS.v.min)) * 520;
  const tX = (t: number) => 60 + ((t - SLIDERS.t.min) / (SLIDERS.t.max - SLIDERS.t.min)) * 520;
  return {
    hero: {
      name: 'Lap',
      role: 'an electron racing round a Bohr orbit',
      story: 'The electron in hydrogen’s first orbit moves at 2.19 × 10⁶ m/s on a circle of radius 0.53 Å. On level n the radius is n² times bigger, the speed is 1/n of the first, and one lap takes T = 2πr/v.',
      objective: 'Set the electron’s speed and its lap time on the stated level, in three rounds. A test shot costs a charge; the live lap counter fades.',
    },
    rounds: lapRounds(),
    charges: [1, 1, 1],
    dials: [
      { key: 'v', aria: 'Speed in units of 10 to the 5 metres per second', label: 'Speed', unit: '× 10⁵ m/s', step: SLIDERS.v.step, min: SLIDERS.v.min, max: SLIDERS.v.max, start: 15, text: (x) => x.toFixed(2) },
      { key: 't', aria: 'Lap time in units of 10 to the minus 16 seconds', label: 'Lap time', unit: '× 10⁻¹⁶ s', step: SLIDERS.t.step, min: SLIDERS.t.min, max: SLIDERS.t.max, start: 10, text: (x) => x.toFixed(2) },
    ],
    handles: [
      { dial: 'v', at: (_r, v) => [vX(v.v), 296], drag: (_r, px) => SLIDERS.v.min + ((px - 60) / 520) * (SLIDERS.v.max - SLIDERS.v.min), radius: 20 },
      { dial: 't', at: (_r, v) => [tX(v.t), 326], drag: (_r, px) => SLIDERS.t.min + ((px - 60) / 520) * (SLIDERS.t.max - SLIDERS.t.min), radius: 20 },
    ],
    test: { button: '🔦 Test shot', aria: 'Test shot: time a lap at this speed', read: (r, v) => lapReading(r, v.v, v.t) },
    fire: { button: '🏁 Race', aria: 'Race the electron round the orbit' },
    judge: (r, v) => judgeLap(r, v.v, v.t).ok,
    miss: (r, v) => lapMiss(r, v.v, v.t),
    win: (r) => `${lapExplain(r)[0]} ${lapExplain(r)[1]}`,
    hint: (r) => `Level n = ${r.n}. Level 1: r₁ = 0.53 Å, v₁ = 2.19 × 10⁶ m/s. ${r.assist === 0 ? 'The lap counter is live.' : r.assist === 1 ? 'The counter is dim: use a test shot.' : 'No counter: work it out.'}`,
    hit: () => [CX, CY],
    delay: 1.0,
    draw: ({ g, r, v, t, rt, shot }) => {
      const R = 38 * r.n + 20;
      orb(g, CX, CY - 20, 9, PAL.red, t);
      for (let n = 1; n <= 3; n++) {
        g.strokeStyle = n === r.n ? PAL.yellow : 'rgba(143,155,214,0.3)';
        g.lineWidth = n === r.n ? 2.5 : 1.2;
        g.beginPath();
        g.arc(CX, CY - 20, 38 * n + 20, 0, Math.PI * 2);
        g.stroke();
      }
      const live = r.assist === 0 || shot !== null;
      const w = (2 * Math.PI) / (v.t * 0.1);
      orb(g, CX + R * Math.cos(t * w * 0.35), CY - 20 + R * Math.sin(t * w * 0.35), 9, PAL.green, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      text(g, `level n = ${r.n}`, 90, 40, PAL.yellow, 14, 'left');
      if (live) {
        const lapNow = ((2 * Math.PI * radius(r.n) * 1e-11) / (v.v * 1e5)) / 1e-16;
        text(g, `at ${fmt(v.v)} × 10⁵ m/s a lap would take ${fmt(lapNow)} × 10⁻¹⁶ s`, 330, 60, lapNow > 0 && Math.abs(lapNow - v.t) / lapNow < 0.015 ? PAL.green : PAL.cyan, 12);
      } else text(g, 'lap counter off', 330, 60, PAL.dim, 12);
      line(g, 60, 296, 580, 296, PAL.dim, 3);
      line(g, 60, 326, 580, 326, PAL.dim, 3);
      text(g, `${v.v.toFixed(2)}`, vX(v.v), 284, PAL.white, 11);
      text(g, `${v.t.toFixed(2)}`, tX(v.t), 316, PAL.white, 11);
      text(g, 'speed', 40, 300, PAL.dim, 10, 'right');
      text(g, 'lap', 40, 330, PAL.dim, 10, 'right');
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'FASTEST LAP' : 'WRONG PACE', 330, 280, shot!.ok ? PAL.green : PAL.red, 16));
    },
  };
}

function bigLevel(): DialLevel<BigRound> {
  const lx = (x: number) => 60 + ((x - SLIDERS.log.min) / (SLIDERS.log.max - SLIDERS.log.min)) * 520;
  return {
    hero: {
      name: 'Giga',
      role: 'a planet that is, in Bohr’s terms, an enormous atom',
      story: 'Bohr’s rule says the angular momentum of an orbit is a whole number times ħ: mvr = nħ, with ħ = 1.055 × 10⁻³⁴ J s. For a hydrogen atom n is 1, 2, 3. For a planet, n is astronomically large, which is why we never see its angular momentum jump in steps.',
      objective: 'Dial the number of zeros of the quantum number (log₁₀ n) for each orbit, in three rounds. A test shot costs a charge; the live odometer fades.',
    },
    rounds: bigRounds(),
    charges: [1, 1, 1],
    dials: [{ key: 'x', aria: 'Base ten logarithm of the quantum number', label: 'log₁₀ of the quantum number', unit: '', step: SLIDERS.log.step, min: SLIDERS.log.min, max: SLIDERS.log.max, start: 10, text: (x) => `n ≈ 10^${x.toFixed(1)}` }],
    handles: [{ dial: 'x', at: (_r, v) => [lx(v.x), 314], drag: (_r, px) => SLIDERS.log.min + ((px - 60) / 520) * (SLIDERS.log.max - SLIDERS.log.min), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the angular momentum mvr', read: (r) => bigReading(r) },
    fire: { button: '🔢 Count', aria: 'Lock in the number of zeros' },
    judge: (r, v) => judgeBig(r, v.x),
    miss: (r, v) => bigMiss(r, v.x),
    win: (r) => `${bigExplain(r)[0]} ${bigExplain(r)[1]}`,
    hint: (r) => `${r.desc.charAt(0).toUpperCase()}${r.desc.slice(1)}. ${r.assist === 0 ? 'The odometer is live.' : r.assist === 1 ? 'The odometer is dim: use a test shot.' : 'No odometer: work it out.'}`,
    hit: () => [330, 160],
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot }) => {
      orb(g, 90, 110, 26, r.name === 'Ball' ? PAL.orange : r.name === 'Moon' ? PAL.white : PAL.cyan, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      text(g, r.name, 90, 160, PAL.white, 13);
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      g.globalAlpha = dim ? 0.4 : 1;
      text(g, live || dim ? `n ≈ 10^${v.x.toFixed(1)}` : 'n ≈ ?', 360, 140, col, 44);
      g.globalAlpha = 1;
      if (live) text(g, `that is a 1 followed by ${Math.round(v.x)} zeros`, 360, 176, PAL.dim, 13);
      // the log ruler: atoms live at the left end
      line(g, 60, 250, 580, 250, PAL.white, 2);
      for (let k = 0; k <= 90; k += 10) {
        line(g, lx(k), 244, lx(k), 256, PAL.dim, 1.5);
        text(g, `${k}`, lx(k), 272, PAL.dim, 10);
      }
      text(g, 'a hydrogen atom: n = 1, 2, 3', lx(0) + 6, 232, PAL.dim, 11, 'left');
      glow(g, col, 8, () => line(g, lx(v.x), 236, lx(v.x), 264, col, 4));
      line(g, 60, 314, 580, 314, PAL.dim, 3);
      text(g, 'log₁₀ n', 40, 318, PAL.dim, 10, 'right');
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'COUNTED' : 'MISCOUNTED', 330, 40, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? ringLevel(ctx.random) : ctx.level === 2 ? lapLevel() : bigLevel();
    return mountDialLevel(ctx as never, level as never, 'An arcade screen with Bohr orbits, an electron on a ring and dials for its speed and lap time.');
  },
});
