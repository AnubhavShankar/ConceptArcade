// Inspirations: Katamari Damacy (a ball that grows as more sticks to it), Angry Birds (a hill that the shot must get over)
// and Pokémon evolution (a decay turns one nucleus into another, and the numbers must add up).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { helperOn, paidFlash } from '@core/aidflash';
import { fmt } from '@core/judge';
import { glow, line, orb, text } from '@core/neon';
import { DECAY_START, decaySides, BARRIER_HIT, BARRIER_START, PARTICLE, SIZE_HIT, SIZE_START, SLIDERS, TWIN_MATCH, barrierEffect, packRadius, TWIN_SLIDERS, TWIN_START, barrierExplain, barrierKeV, barrierMiss, barrierReading, barrierRounds, decayExplain, decayMiss, decayReading, decayRounds, judgeBarrier, judgeDecay, judgeSize, judgeTwin, radiusFm, sizeExplain, sizeMiss, sizeReading, sizeRounds, twinIntel, twinMiss, twinReading, twinRounds, twinWin, type BarrierRound, type DecayRound, type SizeRound, type TwinRound } from './logic';

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
    dials: [{ key: 'r', aria: 'Nuclear radius in femtometres', label: 'Nuclear radius', unit: 'fm', step: S.step, min: S.min, max: S.max, start: SIZE_START, text: (x) => x.toFixed(2) }],
    handles: [{ dial: 'r', at: (_r, v) => [330 + PXF * v.r, 170], drag: (_r, px) => (px - 330) / PXF, radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the cube root of the mass number', read: (r) => sizeReading(r) },
    fire: { button: '🎱 Roll', aria: 'Roll the nucleus out at this radius' },
    judge: (r, v) => judgeSize(r, v.r),
    miss: (r, v) => sizeMiss(r, v.r),
    win: (r) => `${sizeExplain(r)[0]} ${sizeExplain(r)[1]}`,
    hint: (r) => `${r.name}: A = ${r.a}. R = R₀ A^⅓ with R₀ = 1.2 fm. ${r.assist === 0 ? 'The nucleon pack is drawn live.' : r.assist === 1 ? 'The pack is dim: use a test shot.' : 'No pack: work it out.'}`,
    // a fixed point: never the true radius
    hit: () => SIZE_HIT,
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot, A }) => {
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      // during a shot the pack has the true radius only on a win; on a miss it is a fixed step off the player's own ring, on the right side
      const packFm = shot ? packRadius(r, v.r, shot.ok) : radiusFm(r.a);
      if (shot) A.canvas.dataset.pack = (packFm - v.r).toFixed(2);
      const Rt = PXF * packFm;
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
    dials: [{ key: 'u', aria: 'Height of the Coulomb barrier in kiloelectron volts', label: 'Barrier height', unit: 'keV', step: S.step, min: S.min, max: S.max, start: BARRIER_START }],
    handles: [{ dial: 'u', at: (_r, v) => [596, Y(v.u)], drag: (_r, _px, py) => ((290 - py) / 230) * 2000, radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the repulsion energy at touching', read: (r, v) => barrierReading(r, v.u) },
    fire: { button: '⛰️ Climb', aria: 'Set the barrier and climb it' },
    judge: (r, v) => judgeBarrier(r, v.u),
    miss: (r, v) => barrierMiss(r, v.u),
    win: (r) => `${barrierExplain(r)[0]} ${barrierExplain(r)[1]}`,
    hint: (r) => `${r.label[0].toUpperCase()}${r.label.slice(1)}: they touch when their centres are ${fmt(r.d)} fm apart. e²/4πε₀ = 1.44 MeV fm. ${r.assist === 0 ? 'The hill curve is drawn live.' : r.assist === 1 ? 'The curve is dim: use a test shot.' : 'No curve: work it out.'}`,
    // a fixed point: never the true height or the touching distance
    hit: () => BARRIER_HIT,
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot, A }) => {
      line(g, 60, 290, 590, 290, PAL.white, 2);
      line(g, 60, 60, 60, 290, PAL.white, 2);
      text(g, 'distance between the centres (fm)', 320, 322, PAL.dim, 11);
      for (let d = 2; d <= 7; d++) {
        line(g, X(d), 290, X(d), 296, PAL.dim, 1.5);
        text(g, `${d}`, X(d), 308, PAL.dim, 10);
      }
      // the true hill is drawn as the helper before the shot, and after a win; a miss never draws it
      const live = (r.assist === 0 && shot === null) || (shot !== null && shot.ok);
      const dim = r.assist === 1 && shot === null;
      const eff = shot ? barrierEffect(r, v.u) : null;
      if (eff) A.canvas.dataset.barrier = eff;
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
      // the climber: fixed effects from the side only. It meets the other nucleus (win), bounces off a hill set too high, or sails over one set too low.
      const gx = X(r.d);
      const s = Math.min(1, rt / 0.8);
      const e = 1 - (1 - s) ** 2;
      let cx = 90;
      let cy = 230;
      let px = 540;
      if (eff === 'meet') {
        cx = 90 + (gx - 14 - 90) * e;
        px = 540 + (gx + 14 - 540) * e;
        cy = 230 - 30 * Math.sin(Math.PI * s);
      } else if (eff === 'bounce') {
        const back = Math.min(1, Math.max(0, (rt - 0.8) / 0.6));
        cx = 90 + (gx - 14 - 90) * 0.55 * e * (1 - back);
        cy = 230 - 40 * Math.sin(Math.PI * s) * (1 - back);
        if (rt > 0.7 && rt < 1.1) glow(g, PAL.red, 14, () => text(g, '✸', gx - 10, 226, PAL.red, 22));
      } else if (eff === 'overshoot') {
        cx = 90 + (gx + 60 - 90) * e;
        cy = 230 - 30 * Math.sin(Math.PI * s);
      }
      orb(g, cx, cy, 12, PAL.cyan, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      orb(g, px, 240, 12, PAL.pink, t + 1, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 596, 70, 596, 290, PAL.dim, 4);
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'OVER THE TOP' : v.u > r.sol ? 'HILL TOO HIGH' : 'HILL TOO LOW', 330, 40, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

function decayLevel(random: () => number): DialLevel<DecayRound> {
  const aX = (a: number) => 60 + ((a - SLIDERS.a.min) / (SLIDERS.a.max - SLIDERS.a.min)) * 520;
  const zX = (z: number) => 60 + ((z - SLIDERS.z.min) / (SLIDERS.z.max - SLIDERS.z.min)) * 520;
  const flash = paidFlash();
  const box =(g: CanvasRenderingContext2D, x: number, label: string, a: number, z: number, col: string) => {
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
      { key: 'a', aria: 'Mass number of the daughter nucleus', label: 'Daughter mass number A', unit: '', step: SLIDERS.a.step, min: SLIDERS.a.min, max: SLIDERS.a.max, start: DECAY_START.a, text: (x) => `A = ${x}` },
      { key: 'z', aria: 'Charge number of the daughter nucleus', label: 'Daughter charge Z', unit: '', step: SLIDERS.z.step, min: SLIDERS.z.min, max: SLIDERS.z.max, start: DECAY_START.z, text: (x) => `Z = ${x}` },
    ],
    handles: [
      { dial: 'a', at: (_r, v) => [aX(v.a), 296], drag: (_r, px) => fromTrack(px, SLIDERS.a.min, SLIDERS.a.max), radius: 20 },
      { dial: 'z', at: (_r, v) => [zX(v.z), 326], drag: (_r, px) => fromTrack(px, SLIDERS.z.min, SLIDERS.z.max), radius: 20 },
    ],
    test: { button: '🔦 Test shot', aria: 'Test shot: what the emitted particle carries away', read: (r) => (flash.paid(), decayReading(r)) },
    fire: { button: '🧬 Decay', aria: 'Let the nucleus decay into this daughter' },
    judge: (r, v) => judgeDecay(r, v.a, v.z).ok,
    miss: (r, v) => decayMiss(r, v.a, v.z),
    win: (r) => `${decayExplain(r)[0]} ${decayExplain(r)[1]}`,
    hint: (r) => `${r.name}: A = ${r.a}, Z = ${r.z}; it decays by ${r.kind === 'alpha' ? 'α emission' : r.kind === 'beta-' ? 'β⁻ emission' : 'β⁺ emission'}. ${r.assist === 0 ? 'The balance check is live.' : r.assist === 1 ? 'The check shows for a moment after a test shot.' : 'No check: work it out.'}`,
    hit: () => [330, 145],
    delay: 0.9,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      const p = PARTICLE[r.kind];
      box(g, 30, `parent: ${r.name}`, r.a, r.z, PAL.cyan);
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      box(g, 245, 'daughter (your dials)', v.a, v.z, col);
      box(g, 460, p.name, p.a, p.z, PAL.pink);
      text(g, '→', 205, 150, PAL.white, 26);
      text(g, '+', 430, 150, PAL.white, 26);
      // the per-dial balance check: live in round 1, for a moment after a test shot in round 2, never in round 3; a win shows it, a miss does not
      const live = helperOn(r.assist, !!shot?.ok, flash.since(A.clock, k));
      if (live) {
        const aOk = v.a + p.a === r.a;
        const zOk = v.z + p.z === r.z;
        text(g, `A: ${v.a} + ${p.a} = ${v.a + p.a}  ${aOk ? '✓' : '✗'}`, 200, 232, aOk ? PAL.green : PAL.red, 13);
        text(g, `Z: ${v.z} + (${p.z}) = ${v.z + p.z}  ${zOk ? '✓' : '✗'}`, 460, 232, zOk ? PAL.green : PAL.red, 13);
      } else if (shot && rt > 0.3) {
        // a miss without the live check: only which way each count is out, in fixed words (more ▲, same =, fewer ▼)
        const [sa, sz] = decaySides(r, shot.v.a, shot.v.z);
        const mark = (s: number) => (s > 0 ? '▲ more' : s < 0 ? '▼ fewer' : '= same');
        text(g, `nucleons after: ${mark(sa)}`, 200, 232, PAL.red, 13);
        text(g, `charge after: ${mark(sz)}`, 460, 232, PAL.red, 13);
      } else text(g, 'balance check off', 330, 232, PAL.dim, 12);
      orb(g, 330, 60, 14, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 60, 296, 580, 296, PAL.dim, 3);
      line(g, 60, 326, 580, 326, PAL.dim, 3);
      text(g, 'A', 40, 300, PAL.dim, 10, 'right');
      text(g, 'Z', 40, 330, PAL.dim, 10, 'right');
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'EVOLVED' : 'DOES NOT ADD UP', 330, 36, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

// Level 4. Inspiration: Katamari Damacy again (the ball is rolled up from nucleons) with a "same family" clue like a
// Pokémon type chart: isotopes, isobars and isotones.
function twinLevel(random: () => number): DialLevel<TwinRound> {
  const Zs = TWIN_SLIDERS.z;
  const Ns = TWIN_SLIDERS.n;
  const zX = (z: number) => 60 + ((z - Zs.min) / (Zs.max - Zs.min)) * 520;
  const nX = (n: number) => 60 + ((n - Ns.min) / (Ns.max - Ns.min)) * 520;
  const BX = 330;
  const BY = 150;
  const letters = (s: string) => s.replace(/[^A-Za-z]/g, '');
  let pendingTest = false;
  let testAt = -99;
  let lastK = -1;
  const card = (g: CanvasRenderingContext2D, x: number, title: string, a: number, z: number, sym: string, col: string) => {
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fillRect(x, 96, 130, 104);
    g.strokeStyle = col;
    g.lineWidth = 2;
    g.strokeRect(x, 96, 130, 104);
    text(g, title, x + 65, 90, col, 11);
    text(g, 'A', x + 12, 140, PAL.dim, 10, 'left');
    text(g, 'Z', x + 12, 172, PAL.dim, 10, 'left');
    text(g, String(a), x + 50, 140, PAL.white, 18, 'right');
    text(g, String(z), x + 50, 172, PAL.white, 18, 'right');
    text(g, sym, x + 58, 166, col, 44, 'left');
  };
  const light = (g: CanvasRenderingContext2D, x: number, y: number, on: boolean, label: string) => {
    glow(g, on ? PAL.green : PAL.red, 8, () => {
      g.fillStyle = on ? PAL.green : PAL.red;
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.fill();
    });
    text(g, on ? '✓' : '✗', x, y + 4, '#1b1030', 10);
    text(g, label, x + 14, y + 4, PAL.white, 11, 'left');
  };
  return {
    hero: {
      name: 'Katamari',
      role: 'a ball of nucleons rolling out the nuclide a clue describes',
      story: 'Nuclides come in families. Isotopes have the same number of protons Z, isobars the same mass number A, isotones the same number of neutrons N.',
      objective: 'Roll the nuclide each clue describes, in three rounds.',
    },
    rounds: twinRounds(random),
    charges: [1, 1, 0],
    dials: [
      { key: 'z', aria: 'Number of protons Z', label: 'Protons Z', unit: '', step: Zs.step, min: Zs.min, max: Zs.max, start: TWIN_START.z, text: (x) => `Z = ${x}` },
      { key: 'n', aria: 'Number of neutrons N', label: 'Neutrons N', unit: '', step: Ns.step, min: Ns.min, max: Ns.max, start: TWIN_START.n, text: (x) => `N = ${x}` },
    ],
    handles: [
      { dial: 'z', at: (_r, v) => [zX(v.z), 296], drag: (_r, px) => fromTrack(px, Zs.min, Zs.max), radius: 20 },
      { dial: 'n', at: (_r, v) => [nX(v.n), 326], drag: (_r, px) => fromTrack(px, Ns.min, Ns.max), radius: 20 },
    ],
    test: {
      button: '🔦 Test run',
      aria: 'Test run: check the nuclide against the clue',
      read: (r, v) => {
        pendingTest = true;
        return twinReading(r, v.z, v.n);
      },
    },
    fire: { button: '🎱 Roll', aria: 'Roll the nuclide out with these protons and neutrons' },
    judge: (r, v) => judgeTwin(r, v.z, v.n).ok,
    miss: (r, v) => twinMiss(r, v.z, v.n),
    win: (r) => twinWin(r),
    hint: (r) => `${twinIntel(r)} ${r.assist === 0 ? 'The check lights are live.' : r.assist === 1 ? 'The lights are off: a test run shows them for a moment.' : 'No lights: work it out.'}`,
    // the middle of the ball: a fixed point, never the winning setting
    hit: () => [BX, BY],
    delay: 1.0,
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
      const a = v.z + v.n;
      const j = judgeTwin(r, v.z, v.n);
      const mood = shot ? (shot.ok ? 'cheer' : 'worried') : 'happy';
      text(g, `Clue: ${r.relation} of ${r.ref} ${r.extra}`, 330, 28, PAL.white, 14);
      orb(g, 60, 62, 14, PAL.pink, t, mood);
      // the two cards: the reference nuclide, and the player's own numbers (the element letters only after a win)
      card(g, 20, 'reference', r.refA, r.refZ, letters(r.ref), PAL.cyan);
      const shown = shot?.ok && rt > 0.6 ? letters(r.name) : '?';
      card(g, 490, 'your nuclide', a, v.z, shown, shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow);
      A.canvas.dataset.card = shown;
      // the ball of nucleons: protons (+) and neutrons (0), as many as the dials say
      const wob = shot && !shot.ok ? Math.sin(rt * 28) * 6 * Math.max(0, 1 - rt / 1.8) : 0;
      const Rb = 14 * Math.cbrt(a) * (1 + Math.sin(t * 2.2) * 0.015);
      const dot = Math.min(9, (0.9 * Rb) / Math.sqrt(a));
      const shedding = shot !== null && !shot.ok && rt > 0.5;
      if (shot && rt > 0.6) A.canvas.dataset.shed = shedding ? '1' : '0';
      if (shot?.ok) {
        glow(g, PAL.green, 18, () => {
          g.strokeStyle = PAL.green;
          g.lineWidth = 3 + Math.sin(rt * 12);
          g.beginPath();
          g.arc(BX, BY, Rb + 8, 0, Math.PI * 2);
          g.stroke();
        });
      }
      for (let i = 0; i < a; i++) {
        const proton = Math.floor(((i + 1) * v.z) / a) > Math.floor((i * v.z) / a);
        const rad = Rb * 0.96 * Math.sqrt((i + 0.5) / a);
        const ang = i * 2.399963 + t * 0.2;
        let x = BX + wob + rad * Math.cos(ang);
        let y = BY + rad * Math.sin(ang);
        if (shedding && i === a - 1) {
          const s = rt - 0.5;
          x += s * 110;
          y += -s * 70 + 120 * s * s;
        }
        g.fillStyle = proton ? PAL.red : PAL.dim;
        g.beginPath();
        g.arc(x, y, dot, 0, Math.PI * 2);
        g.fill();
        if (dot >= 5) text(g, proton ? '+' : '0', x, y + 3, '#1b1030', Math.round(dot * 1.4));
      }
      text(g, `${v.z} protons (+), ${v.n} neutrons (0)`, BX, 252 - 10, PAL.dim, 11);
      // the check lights: live in round 1, a test run in round 2, none in the boss round
      const live = r.assist === 0 || (shot === null && t - testAt < 1.5);
      if (live) {
        light(g, 90, 262, j.relOk, `${TWIN_MATCH[r.relation]} as ${r.ref}`);
        light(g, 340, 262, j.extraOk, r.extra);
      } else text(g, 'check lights off', 330, 266, PAL.dim, 12);
      // the two dials
      line(g, 60, 296, 580, 296, PAL.dim, 3);
      line(g, 60, 326, 580, 326, PAL.dim, 3);
      text(g, 'Z', 40, 300, PAL.dim, 10, 'right');
      text(g, 'N', 40, 330, PAL.dim, 10, 'right');
      text(g, `${v.z}`, 600, 300, PAL.yellow, 11, 'left');
      text(g, `${v.n}`, 600, 330, PAL.yellow, 11, 'left');
      if (shot && rt > 1.0) {
        const bad = !j.relOk ? `NOT AN ${r.relation.toUpperCase()}` : 'EXTRA FACT NOT MET';
        glow(g, shot.ok ? PAL.green : PAL.red, 12, () => text(g, shot.ok ? 'LOCKED IN' : bad, 330, 58, shot.ok ? PAL.green : PAL.red, 17));
      }
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 4 ? twinLevel(ctx.random) : ctx.level === 1 ? sizeLevel(ctx.random) : ctx.level === 2 ? barrierLevel(ctx.random) : decayLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen with a ball of nucleons, a Coulomb hill and a decay that must balance.');
  },
});
