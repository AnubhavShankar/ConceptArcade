// Inspirations: Katamari Damacy (a ball that grows as more sticks to it), Angry Birds (a hill that the shot must get over)
// and Pokémon evolution (a decay turns one nucleus into another, and the numbers must add up).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { fmt } from '@core/judge';
import { glow, line, orb, text } from '@core/neon';
import { PARTICLE, SLIDERS, barrierExplain, barrierKeV, barrierMiss, barrierReading, barrierRounds, decayExplain, decayMiss, decayReading, decayRounds, judgeBarrier, judgeDecay, judgeSize, radiusFm, sizeExplain, sizeMiss, sizeReading, sizeRounds, type BarrierRound, type DecayRound, type SizeRound } from './logic';

const fromTrack = (px: number, min: number, max: number) => min + ((px - 60) / 520) * (max - min);

function sizeLevel(random: () => number): DialLevel<SizeRound> {
  const S = SLIDERS.r;
  const PXF = 20;
  return {
    hero: {
      name: 'Katamari',
      role: 'a ball of nucleons that grows as more of them stick on',
      story: 'The radius of a nucleus grows as the cube root of its mass number: R = R₀A^⅓ with R₀ = 1.2 fm. That is the signature of a ball whose volume is proportional to the number of nucleons packed into it, so every nucleus has the same density.',
      objective: 'Set the radius of the ball for the stated nucleus, in three rounds. A test shot costs a charge; the live nucleon pack fades.',
    },
    rounds: sizeRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'r', aria: 'Nuclear radius in femtometres', label: 'Nuclear radius', unit: 'fm', step: S.step, min: S.min, max: S.max, start: 3, text: (x) => x.toFixed(2) }],
    handles: [{ dial: 'r', at: (_r, v) => [330 + PXF * v.r, 170], drag: (_r, px) => (px - 330) / PXF, radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the cube root of the mass number', read: (r) => sizeReading(r) },
    fire: { button: '🎱 Roll', aria: 'Roll the nucleus out at this radius' },
    judge: (r, v) => judgeSize(r, v.r),
    miss: (r, v) => sizeMiss(r, v.r),
    win: (r) => `${sizeExplain(r)[0]} ${sizeExplain(r)[1]}`,
    hint: (r) => `${r.name}: A = ${r.a}. R = R₀ A^⅓ with R₀ = 1.2 fm. ${r.assist === 0 ? 'The nucleon pack is drawn live.' : r.assist === 1 ? 'The pack is dim: use a test shot.' : 'No pack: work it out.'}`,
    hit: (r) => [330 + PXF * r.sol, 170],
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot }) => {
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      const Rt = PXF * radiusFm(r.a);
      if (live || dim) {
        g.globalAlpha = dim ? 0.3 : 1;
        const n = r.a;
        const dot = Math.max(2, (Rt * 0.9) / Math.sqrt(n));
        for (let i = 0; i < n; i++) {
          const rad = Rt * 0.96 * Math.sqrt((i + 0.5) / n);
          const ang = i * 2.399963;
          g.fillStyle = i % 2 ? PAL.cyan : PAL.pink;
          g.beginPath();
          g.arc(330 + rad * Math.cos(ang), 170 + rad * Math.sin(ang), dot * 0.62, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      }
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      glow(g, col, 10, () => {
        g.strokeStyle = col;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(330, 170, PXF * v.r, 0, Math.PI * 2);
        g.stroke();
      });
      text(g, `${r.name}: A = ${r.a}`, 330, 36, PAL.white, 14);
      text(g, `R = ${v.r.toFixed(2)} fm`, 330 + PXF * v.r + 8, 150, col, 12, 'left');
      line(g, 330, 174, 330 + PXF * v.r, 174, col, 2);
      orb(g, 80, 70, 14, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 330, 300, 330 + PXF * 1.2, 300, PAL.white, 4);
      text(g, 'R₀ = 1.2 fm', 330 + PXF * 0.6, 318, PAL.white, 11);
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'PERFECT SIZE' : 'WRONG SIZE', 330, 64, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

function barrierLevel(random: () => number): DialLevel<BarrierRound> {
  const S = SLIDERS.u;
  const X = (d: number) => 60 + (d - 1.5) * 90;
  const Y = (u: number) => 290 - (u / 2000) * 230;
  return {
    hero: {
      name: 'Climber',
      role: 'a nucleus that has to climb the Coulomb hill to fuse with another',
      story: 'Two nuclei repel each other with the Coulomb force, so one has to be pushed up a hill of potential energy to reach the other. The hill is steepest where they touch, and its height there is Z₁Z₂e²/(4πε₀d), with d the distance between the centres.',
      objective: 'Set the height of the hill at the point where the two nuclei touch, in three rounds. A test shot costs a charge; the live curve fades.',
    },
    rounds: barrierRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'u', aria: 'Height of the Coulomb barrier in kiloelectron volts', label: 'Barrier height', unit: 'keV', step: S.step, min: S.min, max: S.max, start: 200 }],
    handles: [{ dial: 'u', at: (_r, v) => [596, Y(v.u)], drag: (_r, _px, py) => ((290 - py) / 230) * 2000, radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the repulsion energy at touching', read: (r, v) => barrierReading(r, v.u) },
    fire: { button: '⛰️ Climb', aria: 'Set the barrier and climb it' },
    judge: (r, v) => judgeBarrier(r, v.u),
    miss: (r, v) => barrierMiss(r, v.u),
    win: (r) => `${barrierExplain(r)[0]} ${barrierExplain(r)[1]}`,
    hint: (r) => `${r.label[0].toUpperCase()}${r.label.slice(1)}: they touch when their centres are ${fmt(r.d)} fm apart. e²/4πε₀ = 1.44 MeV fm. ${r.assist === 0 ? 'The hill curve is drawn live.' : r.assist === 1 ? 'The curve is dim: use a test shot.' : 'No curve: work it out.'}`,
    hit: (r) => [X(r.d), Y(r.sol)],
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot }) => {
      line(g, 60, 290, 590, 290, PAL.white, 2);
      line(g, 60, 60, 60, 290, PAL.white, 2);
      text(g, 'distance between the centres (fm)', 320, 322, PAL.dim, 11);
      for (let d = 2; d <= 7; d++) {
        line(g, X(d), 290, X(d), 296, PAL.dim, 1.5);
        text(g, `${d}`, X(d), 308, PAL.dim, 10);
      }
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      if (live || dim) {
        g.save();
        g.globalAlpha = dim ? 0.3 : 1;
        glow(g, PAL.cyan, 8, () => {
          g.strokeStyle = PAL.cyan;
          g.lineWidth = 3;
          g.beginPath();
          let first = true;
          for (let d = 1.6; d <= 7.6; d += 0.05) {
            const y = Y(barrierKeV(r.z1, r.z2, d));
            if (y < 50) continue;
            if (first) {
              g.moveTo(X(d), y);
              first = false;
            } else g.lineTo(X(d), y);
          }
          g.stroke();
        });
        g.restore();
      }
      line(g, X(r.d), 60, X(r.d), 290, PAL.yellow, 2.5, [6, 5]);
      text(g, `touching at ${fmt(r.d)} fm`, X(r.d) + 6, 76, PAL.yellow, 11, 'left');
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.pink;
      glow(g, col, 8, () => line(g, 60, Y(v.u), 590, Y(v.u), col, 3));
      text(g, `${fmt(v.u)} keV`, 100, Y(v.u) - 8, col, 12);
      orb(g, 90, 230, 12, PAL.cyan, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      orb(g, 540, 240, 12, PAL.pink, t + 1, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 596, 70, 596, 290, PAL.dim, 4);
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'OVER THE TOP' : v.u > r.sol ? 'HILL TOO HIGH' : 'HILL TOO LOW', 330, 40, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

function decayLevel(random: () => number): DialLevel<DecayRound> {
  const aX = (a: number) => 60 + ((a - SLIDERS.a.min) / (SLIDERS.a.max - SLIDERS.a.min)) * 520;
  const zX = (z: number) => 60 + ((z - SLIDERS.z.min) / (SLIDERS.z.max - SLIDERS.z.min)) * 520;
  const box = (g: CanvasRenderingContext2D, x: number, label: string, a: number, z: number, col: string) => {
    g.strokeStyle = col;
    g.lineWidth = 3;
    g.strokeRect(x, 90, 150, 110);
    text(g, label, x + 75, 80, col, 12);
    text(g, `A = ${a}`, x + 75, 130, PAL.white, 18);
    text(g, `Z = ${z}`, x + 75, 170, PAL.white, 18);
  };
  return {
    hero: {
      name: 'Evo',
      role: 'a nucleus that evolves when it decays',
      story: 'When a nucleus decays, the mass number A (the number of nucleons) and the charge Z (the number of protons) are both the same before and after. An α-particle carries away A = 4 and Z = 2; a β⁻ decay turns a neutron into a proton and sends out an electron; a β⁺ decay does the reverse.',
      objective: 'Set the mass number and the charge of the nucleus that is left, in three rounds. A test shot costs a charge; the live balance fades.',
    },
    rounds: decayRounds(random),
    charges: [1, 1, 1],
    dials: [
      { key: 'a', aria: 'Mass number of the daughter nucleus', label: 'Daughter mass number A', unit: '', step: SLIDERS.a.step, min: SLIDERS.a.min, max: SLIDERS.a.max, start: 100, text: (x) => `A = ${x}` },
      { key: 'z', aria: 'Charge number of the daughter nucleus', label: 'Daughter charge Z', unit: '', step: SLIDERS.z.step, min: SLIDERS.z.min, max: SLIDERS.z.max, start: 50, text: (x) => `Z = ${x}` },
    ],
    handles: [
      { dial: 'a', at: (_r, v) => [aX(v.a), 296], drag: (_r, px) => fromTrack(px, SLIDERS.a.min, SLIDERS.a.max), radius: 20 },
      { dial: 'z', at: (_r, v) => [zX(v.z), 326], drag: (_r, px) => fromTrack(px, SLIDERS.z.min, SLIDERS.z.max), radius: 20 },
    ],
    test: { button: '🔦 Test shot', aria: 'Test shot: what the emitted particle carries away', read: (r) => decayReading(r) },
    fire: { button: '🧬 Decay', aria: 'Let the nucleus decay into this daughter' },
    judge: (r, v) => judgeDecay(r, v.a, v.z).ok,
    miss: (r, v) => decayMiss(r, v.a, v.z),
    win: (r) => `${decayExplain(r)[0]} ${decayExplain(r)[1]}`,
    hint: (r) => `${r.name}: A = ${r.a}, Z = ${r.z}; it decays by ${r.kind === 'alpha' ? 'α emission' : r.kind === 'beta-' ? 'β⁻ emission' : 'β⁺ emission'}. ${r.assist === 0 ? 'The balance check is live.' : r.assist === 1 ? 'The check is dim: use a test shot.' : 'No check: work it out.'}`,
    hit: () => [330, 145],
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot }) => {
      const p = PARTICLE[r.kind];
      box(g, 30, `parent: ${r.name}`, r.a, r.z, PAL.cyan);
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      box(g, 245, 'daughter (your dials)', v.a, v.z, col);
      box(g, 460, p.name, p.a, p.z, PAL.pink);
      text(g, '→', 205, 150, PAL.white, 26);
      text(g, '+', 430, 150, PAL.white, 26);
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      g.globalAlpha = dim ? 0.35 : 1;
      if (live || dim) {
        const aOk = v.a + p.a === r.a;
        const zOk = v.z + p.z === r.z;
        text(g, `A: ${v.a} + ${p.a} = ${v.a + p.a}  ${aOk ? '✓' : '✗'}`, 200, 232, aOk ? PAL.green : PAL.red, 13);
        text(g, `Z: ${v.z} + (${p.z}) = ${v.z + p.z}  ${zOk ? '✓' : '✗'}`, 460, 232, zOk ? PAL.green : PAL.red, 13);
      } else text(g, 'balance check off', 330, 232, PAL.dim, 12);
      g.globalAlpha = 1;
      orb(g, 330, 60, 14, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 60, 296, 580, 296, PAL.dim, 3);
      line(g, 60, 326, 580, 326, PAL.dim, 3);
      text(g, 'A', 40, 300, PAL.dim, 10, 'right');
      text(g, 'Z', 40, 330, PAL.dim, 10, 'right');
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'EVOLVED' : 'DOES NOT ADD UP', 330, 36, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? sizeLevel(ctx.random) : ctx.level === 2 ? barrierLevel(ctx.random) : decayLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen with a ball of nucleons, a Coulomb hill and a decay that must balance.');
  },
});
