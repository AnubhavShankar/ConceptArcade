// Inspirations: Doodle Jump and Mario platforms (the electron hops between rungs only if the jump is exactly right), Zelda keys
// and doors (each higher level is a gate that needs a minimum energy) and a balanced budget (kinetic plus potential must equal the level).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { fmt, sgn } from '@core/judge';
import { glow, line, orb, text, waveColor } from '@core/neon';
import { E1, HC, SLIDERS, absorbExplain, absorbMiss, absorbReading, absorbRounds, beamExplain, beamMiss, beamReading, beamRounds, budgetExplain, budgetMiss, budgetReading, budgetRounds, jumpEv, judgeAbsorb, judgeBeam, judgeBudget, level, linesFor, topLevel, type AbsorbRound, type BeamRound, type BudgetRound } from './logic';

const yOf = (e: number) => 290 - (e + 13.6) * 17;
const colour = (lam: number, a = 1) => (lam < 380 ? `rgba(200,170,255,${a})` : lam > 760 ? `rgba(255,120,120,${a})` : waveColor(lam, a));

/** The ladder of levels n = 1 to 6 on the left, with the electron on level `at`. */
function ladder(g: CanvasRenderingContext2D, at: number, mark: number[], t: number, ok: boolean | null) {
  for (let n = 1; n <= 6; n++) {
    const y = yOf(level(n));
    line(g, 70, y, 300, y, mark.includes(n) ? PAL.yellow : PAL.dim, mark.includes(n) ? 3 : 2);
    text(g, `n = ${n}`, 20, y + 4, PAL.dim, 11, 'left');
    text(g, `${fmt(level(n))} eV`, 306, y + 4, PAL.dim, 10, 'left');
  }
  line(g, 70, yOf(0), 300, yOf(0), PAL.white, 2, [4, 4]);
  text(g, '0 (free)', 20, yOf(0) + 4, PAL.white, 10, 'left');
  orb(g, 185, yOf(level(at)) - 14, 10, PAL.green, t, ok === null ? 'happy' : ok ? 'cheer' : 'worried');
}

function absorbLevel(random: () => number): DialLevel<AbsorbRound> {
  const S = SLIDERS.lam;
  const specX = (lam: number) => 400 + ((lam - S.min) / (S.max - S.min)) * 210;
  return {
    hero: {
      name: 'Hop',
      role: 'an electron that can only stand on certain rungs of a ladder',
      story: 'An electron in hydrogen can sit only on rungs of fixed energy, Eₙ = −13.6/n² eV. To climb, it must absorb a whole photon whose energy equals the gap between two rungs, no more and no less. Any other photon just passes through.',
      objective: 'Choose the wavelength of the photon that lifts Hop from the lower rung to the higher one, in three rounds. A test shot costs a charge; the live energy readout fades.',
    },
    rounds: absorbRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'lam', aria: 'Wavelength of the photon in nanometres', label: 'Photon wavelength', unit: 'nm', step: S.step, min: S.min, max: S.max, start: 300, text: (x) => x.toFixed(1) }],
    handles: [{ dial: 'lam', at: (_r, v) => [specX(v.lam), 312], drag: (_r, px) => S.min + ((px - 400) / 210) * (S.max - S.min), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: compare the photon with the rung gaps', read: (r, v) => absorbReading(r, v.lam) },
    fire: { button: '🚀 Fire', aria: 'Fire the photon at the atom' },
    judge: (r, v) => judgeAbsorb(r, v.lam),
    miss: (r, v) => absorbMiss(r, v.lam),
    win: (r) => `${absorbExplain(r)[0]} ${absorbExplain(r)[1]}`,
    hint: (r) => `Hop starts on n = ${r.from} and must reach n = ${r.to}. Use hc = 1240 eV nm. ${r.assist === 0 ? 'The photon energy is shown live.' : r.assist === 1 ? 'The readout is dim: use a test shot.' : 'No readout: work it out.'}`,
    hit: (r) => [185, yOf(level(r.to))],
    delay: 1.2,
    draw: ({ g, r, v, t, rt, shot }) => {
      const e = HC / v.lam;
      const hit = [1, 2, 3, 4, 5, 6].filter((n) => n > r.from).find((n) => Math.abs(jumpEv(r.from, n) - e) / e < 0.005);
      const jumped = shot !== null && rt > 0.8 && hit !== undefined;
      ladder(g, jumped ? hit! : r.from, [r.from, r.to], t, shot && rt > 1.0 ? shot.ok : null);
      // the photon on its way in
      const px = shot ? 400 - Math.min(rt, 1) * 190 : 400;
      glow(g, colour(v.lam), 10, () => {
        g.fillStyle = colour(v.lam);
        g.beginPath();
        g.arc(px, yOf(level(r.from)) - 14, 8, 0, Math.PI * 2);
        g.fill();
      });
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(380, 50, 240, 220);
      text(g, 'PHOTON', 500, 70, PAL.dim, 11);
      if (live || dim) {
        g.globalAlpha = dim ? 0.35 : 1;
        text(g, `${fmt(e)} eV`, 500, 140, PAL.white, 28);
        text(g, `${fmt(v.lam)} nm`, 500, 170, colour(v.lam), 14);
        g.globalAlpha = 1;
        if (live && hit !== undefined) text(g, `fits the n = ${r.from} → ${hit} rung`, 500, 210, PAL.green, 12);
        else if (live) text(g, 'fits no rung', 500, 210, PAL.red, 12);
      } else text(g, '?', 500, 160, PAL.dim, 44);
      for (let x = 400; x <= 610; x += 2) {
        g.fillStyle = colour(S.min + ((x - 400) / 210) * (S.max - S.min));
        g.fillRect(x, 304, 2, 16);
      }
      text(g, `${fmt(v.lam)} nm`, specX(v.lam), 338, PAL.white, 11);
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'JUMP!' : 'NO JUMP', 190, 34, shot!.ok ? PAL.green : PAL.red, 18));
    },
  };
}

function beamLevel(random: () => number): DialLevel<BeamRound> {
  const S = SLIDERS.beam;
  const kX = (e: number) => 60 + ((e - S.min) / (S.max - S.min)) * 520;
  return {
    hero: {
      name: 'Key',
      role: 'an electron beam opening the doors of a hydrogen atom',
      story: 'A beam of electrons can lift a hydrogen atom from the ground state only if each beam electron carries at least the gap to a higher rung. Each rung is a door with its own key energy. The higher the rungs reached, the more different jumps the atom can make on the way down, and each jump is one spectral line.',
      objective: 'Set the beam energy so the gas shows exactly the wanted number of spectral lines, in three rounds. A test shot costs a charge; the live door panel fades.',
    },
    rounds: beamRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'e', aria: 'Energy of the electron beam in electron volts', label: 'Beam energy', unit: 'eV', step: S.step, min: S.min, max: S.max, start: 9, text: (x) => x.toFixed(2) }],
    handles: [{ dial: 'e', at: (_r, v) => [kX(v.e), 314], drag: (_r, px) => S.min + ((px - 60) / 520) * (S.max - S.min), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: see how high the beam lifts the atom', read: (_r, v) => beamReading(v.e) },
    fire: { button: '🔑 Open', aria: 'Fire the electron beam at the gas' },
    judge: (r, v) => judgeBeam(r, v.e),
    miss: (r, v) => beamMiss(r, v.e),
    win: (r) => `${beamExplain(r)[0]} ${beamExplain(r)[1]}`,
    hint: (r) => `Wanted: exactly ${r.lines} spectral line${r.lines === 1 ? '' : 's'} from hydrogen starting in the ground state (E₁ = −13.6 eV). ${r.assist === 0 ? 'The door panel is live.' : r.assist === 1 ? 'The panel is dim: use a test shot.' : 'No panel: work it out.'}`,
    hit: () => [185, 150],
    delay: 1.0,
    draw: ({ g, r, v, t, rt, shot }) => {
      const nTop = topLevel(v.e);
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      ladder(g, live || dim ? nTop : 1, live || dim ? [nTop] : [], t, shot && rt > 0.9 ? shot.ok : null);
      // the doors: the key energy of each rung
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(400, 50, 220, 220);
      text(g, 'DOORS (key energy)', 510, 70, PAL.dim, 11);
      for (let n = 2; n <= 6; n++) {
        const key = E1 * (1 - 1 / (n * n));
        const open = live || dim ? v.e >= key - 1e-9 : false;
        const y = 90 + (n - 2) * 34;
        g.globalAlpha = dim ? 0.4 : 1;
        glow(g, open ? PAL.green : PAL.dim, open ? 8 : 0, () => {
          g.strokeStyle = open ? PAL.green : PAL.dim;
          g.lineWidth = 2.5;
          g.strokeRect(420, y - 12, 26, 24);
        });
        text(g, `n = ${n}`, 470, y + 4, open ? PAL.green : PAL.dim, 12, 'left');
        if (live) text(g, `${fmt(key)} eV`, 540, y + 4, PAL.dim, 11, 'left');
        g.globalAlpha = 1;
      }
      if (live || dim) text(g, `${linesFor(v.e)} line${linesFor(v.e) === 1 ? '' : 's'}`, 510, 260, dim ? PAL.dim : PAL.yellow, 16);
      else text(g, '?', 510, 200, PAL.dim, 44);
      // the lines the gas can show
      if (live) {
        for (let hi = 2; hi <= nTop; hi++) for (let lo = 1; lo < hi; lo++) line(g, 90 + (hi * 8 + lo * 25) % 180, yOf(level(hi)), 90 + (hi * 8 + lo * 25) % 180, yOf(level(lo)), PAL.cyan, 1.5);
      }
      line(g, 60, 314, 580, 314, PAL.dim, 3);
      text(g, `${v.e.toFixed(2)} eV`, kX(v.e), 338, PAL.white, 11);
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'DOORS OPEN' : 'WRONG KEY', 190, 34, shot!.ok ? PAL.green : PAL.red, 18));
    },
  };
}

function budgetLevel(random: () => number): DialLevel<BudgetRound> {
  const KY = (e: number) => 170 - e * 5;
  return {
    hero: {
      name: 'Orbit',
      role: 'an electron whose energy budget must balance',
      story: 'An electron in a circular Bohr orbit has kinetic energy that is always positive and potential energy that is negative, and the two add up to the energy of the level: K + U = E. For an orbit held by the electric force, K is minus the total energy and U is twice the total.',
      objective: 'Set the kinetic and the potential energy of the electron in the stated level, in three rounds. A test shot costs a charge; the live bars fade.',
    },
    rounds: budgetRounds(random),
    charges: [1, 1, 1],
    dials: [
      { key: 'ke', aria: 'Kinetic energy in electron volts', label: 'Kinetic energy', unit: 'eV', step: SLIDERS.ke.step, min: SLIDERS.ke.min, max: SLIDERS.ke.max, start: 5, text: (x) => x.toFixed(2) },
      { key: 'pe', aria: 'Potential energy in electron volts', label: 'Potential energy', unit: 'eV', step: SLIDERS.pe.step, min: SLIDERS.pe.min, max: SLIDERS.pe.max, start: -5, text: (x) => x.toFixed(2) },
    ],
    handles: [
      { dial: 'ke', at: (_r, v) => [470, KY(v.ke)], drag: (_r, _px, py) => (170 - py) / 5, radius: 22 },
      { dial: 'pe', at: (_r, v) => [560, KY(v.pe)], drag: (_r, _px, py) => (170 - py) / 5, radius: 22 },
    ],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the total energy of this level', read: (r) => budgetReading(r) },
    fire: { button: '⚖️ Balance', aria: 'Check the energy budget' },
    judge: (r, v) => judgeBudget(r, v.ke, v.pe).ok,
    miss: (r, v) => budgetMiss(r, v.ke, v.pe),
    win: (r) => `${budgetExplain(r)[0]} ${budgetExplain(r)[1]}`,
    hint: (r) => `The electron is in level n = ${r.n} of hydrogen, E₁ = −13.6 eV. ${r.assist === 0 ? 'The bars and the total are live.' : r.assist === 1 ? 'The bars are dim: use a test shot.' : 'No bars: work it out.'}`,
    hit: () => [515, 170],
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot }) => {
      ladder(g, r.n, [r.n], t, shot && rt > 0.9 ? shot.ok : null);
      line(g, 420, 170, 620, 170, PAL.white, 2);
      text(g, '0', 410, 174, PAL.white, 11, 'right');
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.cyan;
      if (live || dim) {
        g.globalAlpha = dim ? 0.35 : 1;
        g.fillStyle = PAL.green;
        g.fillRect(455, Math.min(170, KY(v.ke)), 30, Math.abs(KY(v.ke) - 170));
        g.fillStyle = PAL.pink;
        g.fillRect(545, Math.min(170, KY(v.pe)), 30, Math.abs(KY(v.pe) - 170));
        g.globalAlpha = 1;
        text(g, 'kinetic', 470, 40, PAL.green, 11);
        text(g, 'potential', 560, 40, PAL.pink, 11);
        if (live) {
          line(g, 410, KY(v.ke + v.pe), 620, KY(v.ke + v.pe), col, 3, [6, 4]);
          text(g, `K + U = ${sgn(v.ke + v.pe)} eV`, 515, KY(v.ke + v.pe) + (v.ke + v.pe > -3 ? -10 : 18), col, 12);
        }
      } else text(g, '?', 515, 180, PAL.dim, 44);
      line(g, 410, KY(level(r.n)), 620, KY(level(r.n)), PAL.yellow, 2, [3, 5]);
      text(g, `level n = ${r.n}: ${fmt(level(r.n))} eV`, 515, KY(level(r.n)) - 8, PAL.yellow, 11);
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'BALANCED' : 'OUT OF BALANCE', 190, 34, shot!.ok ? PAL.green : PAL.red, 18));
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? absorbLevel(ctx.random) : ctx.level === 2 ? beamLevel(ctx.random) : budgetLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen with the energy levels of a hydrogen atom as rungs of a ladder.');
  },
});
