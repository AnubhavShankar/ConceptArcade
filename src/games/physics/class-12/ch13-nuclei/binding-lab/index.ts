// Inspirations: Jenga (how much work to pull the whole tower apart), Mario Party coins (a trade: what you spend against
// what you get back) and SimCity (how much power a plant gets from its fuel).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { fmt, sgn } from '@core/judge';
import { glow, line, orb, text } from '@core/neon';
import { SLIDERS, bindExplain, bindMiss, bindReading, bindRounds, judgeBind, judgePower, judgeQ, powerExplain, powerMiss, powerReading, powerRounds, qExplain, qMiss, qReading, qRounds, type BindRound, type PowerRound, type QRound } from './logic';

const trackX = (v: number, min: number, max: number) => 60 + ((v - min) / (max - min)) * 520;
const fromTrack = (px: number, min: number, max: number) => min + ((px - 60) / 520) * (max - min);

function bindLevel(): DialLevel<BindRound> {
  const S = SLIDERS.be;
  return {
    hero: {
      name: 'Jenga',
      role: 'a tower of protons and neutrons that must be pulled apart block by block',
      story: 'A nucleus weighs less than its separate protons and neutrons: the missing mass is the mass defect, and it is the energy that holds the nucleus together. It is also the energy needed to pull every nucleon apart.',
      objective: 'Set the energy needed to take the whole nucleus apart, in three rounds. A test shot costs a charge; the live mass defect fades.',
    },
    rounds: bindRounds(),
    charges: [1, 1, 1],
    dials: [{ key: 'be', aria: 'Binding energy in MeV', label: 'Binding energy', unit: 'MeV', step: S.step, min: S.min, max: S.max, start: 300, text: (x) => x.toFixed(1) }],
    handles: [{ dial: 'be', at: (_r, v) => [trackX(v.be, S.min, S.max), 314], drag: (_r, px) => fromTrack(px, S.min, S.max), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the mass defect', read: (r) => bindReading(r) },
    fire: { button: '🧱 Pull', aria: 'Pull the nucleus apart with this energy' },
    judge: (r, v) => judgeBind(r, v.be),
    miss: (r, v) => bindMiss(r, v.be),
    win: (r) => `${bindExplain(r)[0]} ${bindExplain(r)[1]}`,
    hint: (r) => `${r.name}: Z = ${r.z}, A = ${r.a}, atomic mass ${fmt(r.m)} u. m_H = 1.007825 u, m_n = 1.008665 u, 1 u = 931.5 MeV/c². ${r.assist === 0 ? 'The mass defect is shown live.' : r.assist === 1 ? 'The mass defect is dim: use a test shot.' : 'No readout: work it out.'}`,
    hit: () => [200, 170],
    delay: 1.0,
    draw: ({ g, r, v, t, rt, shot }) => {
      // the tower of nucleons
      const cols = Math.ceil(Math.sqrt(r.a));
      const bs = Math.max(4, Math.min(12, 150 / cols));
      for (let i = 0; i < r.a; i++) {
        const cx = 90 + (i % cols) * bs;
        const cy = 270 - Math.floor(i / cols) * bs;
        const fly = shot && rt > 0.2 ? (rt - 0.2) * (i % 7 - 3) * 30 : 0;
        g.fillStyle = i < r.z ? PAL.red : PAL.cyan;
        g.fillRect(cx + fly, cy - (shot && rt > 0.2 ? (rt - 0.2) * 40 * ((i % 5) / 5) : 0), bs - 1, bs - 1);
      }
      text(g, `${r.name}: ${r.z} protons (red), ${r.a - r.z} neutrons (blue)`, 190, 40, PAL.white, 12);
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      g.globalAlpha = dim ? 0.35 : 1;
      if (live || dim) text(g, `mass defect Δm = ${fmt(r.dm)} u`, 440, 110, PAL.cyan, 14);
      else text(g, 'Δm = ?', 440, 110, PAL.dim, 16);
      g.globalAlpha = 1;
      // the player's energy as a bar, against a hidden true one that is revealed on firing
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(340, 150, 260, 20);
      g.fillStyle = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      g.fillRect(340, 150, (260 * v.be) / S.max, 20);
      text(g, `${fmt(v.be)} MeV`, 470, 192, PAL.white, 14);
      if (shot && rt > 0.6) {
        const bx = 340 + (260 * r.sol) / S.max;
        line(g, bx, 140, bx, 180, PAL.white, 3);
        text(g, `real: ${fmt(r.sol)} MeV`, bx, 132, PAL.white, 11);
      }
      orb(g, 560, 70, 14, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 60, 314, 580, 314, PAL.dim, 3);
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'TOWER DOWN' : 'STILL STANDING', 440, 250, shot!.ok ? PAL.green : PAL.red, 16));
    },
  };
}

function qLevel(): DialLevel<QRound> {
  const S = SLIDERS.q;
  return {
    hero: {
      name: 'Coin',
      role: 'a trader in a nuclear reaction who pays in mass and is paid in mass',
      story: 'In a nuclear reaction the total mass changes a little. The mass lost is released as energy, and the mass gained must be paid for. The energy released is the Q value, Q = (mass before − mass after) c².',
      objective: 'Set the Q value of each reaction, with the right sign, in three rounds. A test shot costs a charge; the live masses fade.',
    },
    rounds: qRounds(),
    charges: [1, 1, 1],
    dials: [{ key: 'q', aria: 'Q value in MeV', label: 'Q value', unit: 'MeV', step: S.step, min: S.min, max: S.max, start: 0, text: (x) => (x > 0 ? '+' : '') + x.toFixed(2) }],
    handles: [{ dial: 'q', at: (_r, v) => [trackX(v.q, S.min, S.max), 314], drag: (_r, px) => fromTrack(px, S.min, S.max), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: weigh the two sides of the reaction', read: (r) => qReading(r) },
    fire: { button: '🪙 Trade', aria: 'Settle the reaction at this Q value' },
    judge: (r, v) => judgeQ(r, v.q),
    miss: (r, v) => qMiss(r, v.q),
    win: (r) => `${qExplain(r)[0]} ${qExplain(r)[1]}`,
    hint: (r) => `${r.eq}. Masses: left ${fmt(r.left)} u, right ${fmt(r.right)} u; 1 u = 931.5 MeV/c². ${r.assist === 0 ? 'The scale is live.' : r.assist === 1 ? 'The scale is dim: use a test shot.' : 'No scale: work it out.'}`,
    hit: () => [330, 170],
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot }) => {
      text(g, r.eq, 330, 36, PAL.white, 14);
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      // two pans: before and after (the difference is far too small to see, so it is shown as a separate bar)
      const dm = r.left - r.right;
      g.save();
      g.translate(330, 130);
      g.rotate(Math.max(-0.35, Math.min(0.35, (dm * 12) / 1)));
      line(g, -120, 0, 120, 0, PAL.white, 5);
      g.restore();
      line(g, 330, 130, 330, 200, PAL.dim, 6);
      text(g, 'before', 210, 118, PAL.cyan, 12);
      text(g, 'after', 450, 118, PAL.pink, 12);
      g.globalAlpha = dim ? 0.35 : 1;
      if (live || dim) {
        text(g, `${fmt(r.left)} u`, 210, 100, PAL.cyan, 13);
        text(g, `${fmt(r.right)} u`, 450, 100, PAL.pink, 13);
      } else text(g, '? u', 330, 100, PAL.dim, 16);
      g.globalAlpha = 1;
      // the energy bar, centred on zero
      line(g, 60, 250, 580, 250, PAL.white, 2);
      line(g, trackX(0, S.min, S.max), 240, trackX(0, S.min, S.max), 260, PAL.white, 3);
      text(g, '0', trackX(0, S.min, S.max), 278, PAL.white, 11);
      const x0 = trackX(0, S.min, S.max);
      const x1 = trackX(v.q, S.min, S.max);
      g.fillStyle = shot ? (shot.ok ? PAL.green : PAL.red) : v.q >= 0 ? PAL.green : PAL.orange;
      g.fillRect(Math.min(x0, x1), 238, Math.abs(x1 - x0), 24);
      text(g, v.q >= 0 ? 'gives out energy' : 'takes in energy', 330, 300, PAL.dim, 11);
      if (shot && rt > 0.5) {
        const xr = trackX(r.sol, S.min, S.max);
        line(g, xr, 226, xr, 274, PAL.white, 3);
        text(g, `real Q = ${sgn(r.sol)} MeV`, xr, 218, PAL.white, 11);
      }
      line(g, 60, 314, 580, 314, PAL.dim, 3);
      text(g, `${v.q.toFixed(2)} MeV`, x1, 338, PAL.white, 11);
      orb(g, 330, 190, 12, PAL.yellow, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? (r.sol > 0 ? 'EXOTHERMIC' : 'ENDOTHERMIC') : 'BAD TRADE', 330, 64, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

function powerLevel(): DialLevel<PowerRound> {
  const S = SLIDERS.e;
  return {
    hero: {
      name: 'Plant',
      role: 'a power plant that wants to know how much energy its fuel holds',
      story: 'Nuclear fuel releases energy for every fission or fusion, and the energy released by a mass of fuel is the number of events times the energy per event. Converting mass completely into energy gives E = mc².',
      objective: 'Set the total energy the fuel releases, in units of 10¹³ J, in three rounds. A test shot costs a charge; the live fuel count fades.',
    },
    rounds: powerRounds(),
    charges: [1, 1, 1],
    dials: [{ key: 'e', aria: 'Energy released in units of 10 to the 13 joules', label: 'Energy released', unit: '× 10¹³ J', step: S.step, min: S.min, max: S.max, start: 5, text: (x) => x.toFixed(2) }],
    handles: [{ dial: 'e', at: (_r, v) => [trackX(v.e, S.min, S.max), 314], drag: (_r, px) => fromTrack(px, S.min, S.max), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: count the events in the fuel', read: (r) => powerReading(r) },
    fire: { button: '⚡ Switch on', aria: 'Switch the power plant on' },
    judge: (r, v) => judgePower(r, v.e),
    miss: (r, v) => powerMiss(r, v.e),
    win: (r) => `${powerExplain(r)[0]} ${powerExplain(r)[1]}`,
    hint: (r) => `Fuel: ${r.name}; ${r.desc}. N_A = 6.023 × 10²³ per mole, 1 MeV = 1.6 × 10⁻¹³ J. ${r.assist === 0 ? 'The event count is shown live.' : r.assist === 1 ? 'The count is dim: use a test shot.' : 'No count: work it out.'}`,
    hit: () => [330, 150],
    delay: 1.0,
    draw: ({ g, r, v, t, rt, shot }) => {
      // a plant with a chimney
      g.fillStyle = 'rgba(160,170,230,0.25)';
      g.fillRect(100, 150, 150, 110);
      g.fillRect(180, 80, 30, 70);
      g.strokeStyle = PAL.dim;
      g.lineWidth = 2;
      g.strokeRect(100, 150, 150, 110);
      for (let k = 0; k < 5; k++) {
        g.globalAlpha = 0.5 - k * 0.08;
        g.fillStyle = PAL.white;
        g.beginPath();
        g.arc(195 + Math.sin(t * 2 + k) * 8, 70 - k * 14 - ((t * 20) % 14), 8 + k * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      text(g, r.name, 175, 285, PAL.white, 13);
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      g.globalAlpha = dim ? 0.35 : 1;
      if (live || dim) text(g, r.desc, 430, 120, PAL.cyan, 11);
      else text(g, '?', 430, 130, PAL.dim, 36);
      g.globalAlpha = 1;
      // the energy meter
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(300, 170, 300, 24);
      g.fillStyle = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      g.fillRect(300, 170, (300 * v.e) / S.max, 24);
      text(g, `${v.e.toFixed(2)} × 10¹³ J`, 450, 214, PAL.white, 15);
      if (shot && rt > 0.6) {
        const bx = 300 + (300 * r.sol) / S.max;
        line(g, bx, 160, bx, 204, PAL.white, 3);
        text(g, `real: ${fmt(r.sol)}`, bx, 154, PAL.white, 11);
      }
      orb(g, 550, 90, 14, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 60, 314, 580, 314, PAL.dim, 3);
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'POWER ON' : 'BLACKOUT', 450, 260, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? bindLevel() : ctx.level === 2 ? qLevel() : powerLevel();
    return mountDialLevel(ctx as never, level as never, 'An arcade screen with nuclei, reactions and a power plant, each with a dial to set.');
  },
});
