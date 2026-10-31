// Inspirations: Angry Birds and Asteroids (fire a particle at a target and read where it stops) and Battleship
// (deduce what is hiding from where the shot turns back).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { helperOn, paidFlash } from '@core/aidflash';
import { fmt } from '@core/judge';
import { glow, line, orb, text } from '@core/neon';
import { ELEMENTS, HIT, SLIDERS, START, closestFm, stopFm, foilExplain, foilMiss, foilReading, foilRounds, judgeFoil, judgeRange, rangeExplain, rangeMiss, rangeReading, rangeRounds, type FoilRound, type RangeRound } from './logic';

const NX = 540;
const AY = 170;
const PX = 6;
const ease = (u: number) => 1 - (1 - Math.min(1, u)) ** 2;

/**
 * The nucleus, the target ring and the α-particle that runs in and turns back at distance d (fm).
 * `dFm` is where it stops on screen: the player's own turning point only for the live helper and on a win, a fixed place on a miss.
 * `showPred` draws the green mark and its number (the helper); without it the dotted path ends at a fixed place.
 */
function scene(g: CanvasRenderingContext2D, z: number | null, targetFm: number | null, dFm: number, shotT: number | null, t: number, ok: boolean | null, showPred: boolean) {
  const rn = z === null ? 14 : 8 + z * 0.12;
  glow(g, PAL.red, 14, () => {
    g.fillStyle = PAL.red;
    g.beginPath();
    g.arc(NX, AY, rn, 0, Math.PI * 2);
    g.fill();
  });
  text(g, z === null ? '+?' : `+${z}e`, NX, AY + 4, PAL.white, 12);
  text(g, 'nucleus', NX, AY + 40, PAL.dim, 11);
  if (targetFm !== null) {
    g.strokeStyle = PAL.yellow;
    g.lineWidth = 2;
    g.setLineDash([6, 5]);
    g.beginPath();
    g.arc(NX, AY, PX * targetFm, Math.PI * 0.7, Math.PI * 1.3);
    g.stroke();
    g.setLineDash([]);
    text(g, `${fmt(targetFm)} fm`, NX - PX * targetFm, AY - 78, PAL.yellow, 11);
  }
  const startX = 60;
  const stopX = NX - PX * dFm;
  let x = startX;
  if (shotT !== null) {
    const u = Math.min(1, shotT / 0.9);
    const back = shotT > 1.0 ? Math.min(1, (shotT - 1.0) / 0.7) : 0;
    x = startX + (stopX - startX) * ease(u) - (stopX - startX) * 0.9 * back;
  }
  line(g, startX, AY, shotT !== null || showPred ? stopX : NX - 40, AY, PAL.cyan, 1.2, [3, 6]);
  if (showPred) {
    glow(g, PAL.green, 8, () => line(g, stopX, AY - 24, stopX, AY + 24, PAL.green, 3));
    text(g, `turns back at ${fmt(dFm)} fm`, stopX, AY + 44, PAL.green, 11);
  }
  orb(g, x, AY, 10, PAL.cyan, t, ok === null ? 'happy' : ok ? 'cheer' : 'worried');
  text(g, 'α', x, AY - 18, PAL.cyan, 12);
}

function rangeLevel(random: () => number): DialLevel<RangeRound> {
  const S = SLIDERS.k;
  const kX = (k: number) => 60 + ((k - S.min) / (S.max - S.min)) * 520;
  const flash = paidFlash();
  return {
    hero: {
      name: 'Alpha',
      role: 'an α-particle fired straight at a nucleus',
      story: 'An α-particle and a nucleus are both positive, so the nucleus pushes it back harder and harder as it closes in. All of its kinetic energy turns into electric potential energy at the closest point, where it stops and rebounds.',
      objective: 'Choose the energy that brings Alpha to exactly the marked distance from the nucleus before it turns back, in three rounds. A test shot costs a charge; the live turning point fades.',
    },
    rounds: rangeRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'k', aria: 'Kinetic energy of the alpha particle in MeV', label: 'Alpha energy', unit: 'MeV', step: S.step, min: S.min, max: S.max, start: START.k, text: (x) => x.toFixed(2) }],
    handles: [{ dial: 'k', at: (_r, v) => [kX(v.k), 314], drag: (_r, px) => S.min + ((px - 60) / 520) * (S.max - S.min), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: see where the alpha particle turns back', read: (r, v) => (flash.paid(), rangeReading(r, v.k)) },
    fire: { button: '🎯 Fire', aria: 'Fire the alpha particle at the nucleus' },
    judge: (r, v) => judgeRange(r, v.k),
    miss: (r, v) => rangeMiss(r, v.k),
    win: (r) => `${rangeExplain(r)[0]} ${rangeExplain(r)[1]}`,
    hint: (r) => `Nucleus charge Z = ${r.z} (${ELEMENTS[r.z] ?? 'a nucleus'}); e²/4πε₀ = 1.44 MeV fm. Wanted: closest approach ${fmt(r.target)} fm. ${r.assist === 0 ? 'The turning point is marked live.' : r.assist === 1 ? 'The mark shows for a moment after a test shot.' : 'No mark: work it out.'}`,
    hit: () => HIT,
    delay: 1.3,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      const since = flash.since(A.clock, k);
      const dOwn = closestFm(r.z, v.k);
      // the mark and its number are the helper: live in round 1, a moment after a paid check in round 2, never in round 3, and after a miss never
      const showPred = shot ? shot.ok && rt > 1.0 : helperOn(r.assist, false, since);
      scene(g, r.z, r.target, shot ? stopFm(dOwn, r.target, shot.ok) : dOwn, shot ? rt : null, t, shot && rt > 1.3 ? shot.ok : null, showPred);
      line(g, 60, 314, 580, 314, PAL.dim, 3);
      text(g, `${v.k.toFixed(2)} MeV`, kX(v.k), 338, PAL.white, 11);
      if (rt > 1.3) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'JUST SHORT OF THE RING' : closestFm(r.z, v.k) < r.target ? 'TOO CLOSE' : 'TURNED TOO SOON', 330, 40, shot!.ok ? PAL.green : PAL.red, 16));
    },
  };
}

function foilLevel(random: () => number): DialLevel<FoilRound> {
  const S = SLIDERS.z;
  const zX = (z: number) => 60 + ((z - S.min) / (S.max - S.min)) * 520;
  const flash = paidFlash();
  return {
    hero: {
      name: 'Sonar',
      role: 'a detective α-particle that has to work out what the foil is made of',
      story: 'An α-particle of a known energy was fired at a thin metal foil and turned back at a measured distance from the nucleus. The more charge the nucleus carries, the further out the α-particle turns back, so the turning point tells you the element.',
      objective: 'Dial the nuclear charge Z that explains where the α-particle turned back, in three rounds. A test shot costs a charge; the live prediction fades.',
    },
    rounds: foilRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'z', aria: 'Atomic number of the nucleus', label: 'Nuclear charge Z', unit: '', step: S.step, min: S.min, max: S.max, start: START.z, text: (x) => `Z = ${x}` }],
    handles: [{ dial: 'z', at: (_r, v) => [zX(v.z), 314], drag: (_r, px) => S.min + ((px - 60) / 520) * (S.max - S.min), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: see where an alpha particle would turn for this Z', read: (r, v) => (flash.paid(), foilReading(r, v.z)) },
    fire: { button: '🔎 Identify', aria: 'Identify the nucleus' },
    judge: (r, v) => judgeFoil(r, v.z),
    miss: (r, v) => foilMiss(r, v.z),
    win: (r) => `${foilExplain(r)[0]} ${foilExplain(r)[1]}`,
    hint: (r) => `A ${fmt(r.k)} MeV α-particle turned back ${fmt(r.turn)} fm from the nucleus (e²/4πε₀ = 1.44 MeV fm). ${r.assist === 0 ? 'Your predicted turning point is shown live.' : r.assist === 1 ? 'The prediction shows for a moment after a test shot.' : 'No prediction: work it out.'}`,
    hit: () => HIT,
    delay: 1.2,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      const since = flash.since(A.clock, k);
      const dOwn = closestFm(v.z, r.k);
      const showPred = shot ? shot.ok && rt > 1.0 : helperOn(r.assist, false, since);
      scene(g, shot && rt > 0 ? v.z : null, r.turn, shot ? stopFm(dOwn, r.turn, shot.ok) : dOwn, shot ? rt : null, t, shot && rt > 1.2 ? shot.ok : null, showPred);
      line(g, NX - PX * r.turn, 60, NX - PX * r.turn, 280, PAL.yellow, 1.5, [4, 5]);
      text(g, 'where it really turned', NX - PX * r.turn, 56, PAL.yellow, 11);
      line(g, 60, 314, 580, 314, PAL.dim, 3);
      text(g, `Z = ${v.z}`, zX(v.z), 338, PAL.white, 11);
      if (rt > 1.2) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? `IT IS ${(ELEMENTS[r.zSol] ?? '').toUpperCase()}` : 'WRONG ELEMENT', 330, 40, shot!.ok ? PAL.green : PAL.red, 16));
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? rangeLevel(ctx.random) : foilLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen with an alpha particle running at a nucleus and turning back.');
  },
});
