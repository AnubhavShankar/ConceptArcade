// Pure rules of the Lenz Lab: no DOM, no canvas.
import { pick } from '@core/quiz';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e5 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => Math.abs(value - answer) / Math.abs(answer) <= tol;

export type Sense = 'clockwise' | 'anticlockwise' | 'none';
export type Pole = 'north' | 'south';
export type Motion = 'approach' | 'recede';

/** Induced current seen from the side the magnet comes from. */
export function magnetSense(pole: Pole, motion: Motion): Sense {
  const ccw = (pole === 'north') === (motion === 'approach');
  return ccw ? 'anticlockwise' : 'clockwise';
}
/** The coil always opposes the motion: it repels an approaching magnet and attracts a receding one. */
export const magnetForce = (motion: Motion): 'repels' | 'attracts' => (motion === 'approach' ? 'repels' : 'attracts');

export type Change = 'increasing' | 'decreasing' | 'none';
/** The sense of the induced current seen from the front, for a field into or out of the page whose flux through the loop changes. */
export function loopSense(bInto: boolean, change: Change): Sense {
  if (change === 'none') return 'none';
  // into the page and increasing: the induced field must point out of the page: anticlockwise
  const ccw = bInto === (change === 'increasing');
  return ccw ? 'anticlockwise' : 'clockwise';
}

export interface Cause {
  text: string;
  change: Change;
}
export const CAUSES: Cause[] = [
  { text: 'the loop is moving out of the region of field', change: 'decreasing' },
  { text: 'the loop is moving into the region of field', change: 'increasing' },
  { text: 'the loop is squeezed into a thin strip', change: 'decreasing' },
  { text: 'the loop is stretched into a bigger circle', change: 'increasing' },
  { text: 'the field is being switched on and is rising', change: 'increasing' },
  { text: 'the field is fading away', change: 'decreasing' },
  { text: 'the loop slides along inside the uniform field', change: 'none' },
  { text: 'the loop spins about an axis along the field lines', change: 'none' },
];

/** A rod of length l (m) sliding at speed v (m/s) on rails of resistance R (ohm) in a field B (T). */
export const rodCurrent = (b: number, l: number, v: number, r: number) => (b * l * v) / r;
export const rodForce = (b: number, l: number, v: number, r: number) => b * rodCurrent(b, l, v, r) * l;
export const rodPower = (b: number, l: number, v: number, r: number) => rodForce(b, l, v, r) * v;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelMagnet {
  kind: 'magnet';
  story: string;
  pole: Pole;
  motion: Motion;
  sense: Sense;
  force: 'repels' | 'attracts';
  freeTests: number;
}
export interface LevelLoop {
  kind: 'loop';
  story: string;
  bInto: boolean;
  cause: Cause;
  sense: Sense;
  freeTests: number;
}
export interface LevelRod {
  kind: 'rod';
  story: string;
  b: number;
  l: number;
  v: number;
  r: number;
  current: number;
  forceMilli: number;
  powerMilli: number;
  freeTests: number;
}
export type Level = LevelMagnet | LevelLoop | LevelRod;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const pole = pick(['north', 'south'] as Pole[], random);
    const motion = pick(['approach', 'recede'] as Motion[], random);
    return {
      kind: 'magnet',
      story: `The ${pole} pole of a bar magnet is ${motion === 'approach' ? 'pushed towards' : 'pulled away from'} a closed coil. The induced current opposes the change that produces it. Say which way the induced current flows, as seen from the side of the magnet, and whether the coil attracts or repels the magnet.`,
      pole,
      motion,
      sense: magnetSense(pole, motion),
      force: magnetForce(motion),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const cause = pick(CAUSES, random);
    const bInto = random() < 0.5;
    return {
      kind: 'loop',
      story: `A closed loop lies in the plane of the page, in a magnetic field that points ${bInto ? 'into' : 'out of'} the page, and ${cause.text}. Use Lenz's law to give the direction of the induced current as seen on the page, or say if there is none.`,
      bInto,
      cause,
      sense: loopSense(bInto, cause.change),
      freeTests: 1,
    };
  }
  const b = pick([0.2, 0.5, 1], random);
  const l = pick([0.1, 0.2, 0.5], random);
  const v = pick([1, 2, 4], random);
  const r = pick([0.05, 0.1, 0.2], random);
  return {
    kind: 'rod',
    story: 'A metal rod slides at a steady speed along two rails joined by a resistance, in a field at right angles to the plane of the rails. The induced current feels a force opposing the motion, so work must be done to keep the rod moving. Find the induced current, the force needed to keep the rod moving, and the power supplied.',
    b,
    l,
    v,
    r,
    current: rodCurrent(b, l, v, r),
    forceMilli: rodForce(b, l, v, r) * 1000,
    powerMilli: rodPower(b, l, v, r) * 1000,
    freeTests: 1,
  };
}

export function judgeMagnet(lvl: LevelMagnet, sense: Sense, force: 'repels' | 'attracts'): { ok: boolean; sOk: boolean; fOk: boolean } {
  const sOk = sense === lvl.sense;
  const fOk = force === lvl.force;
  return { ok: sOk && fOk, sOk, fOk };
}
export function judgeLoop(lvl: LevelLoop, sense: Sense): { ok: boolean } {
  return { ok: sense === lvl.sense };
}
export function judgeRod(lvl: LevelRod, i: number, f: number, p: number): { ok: boolean; iOk: boolean; fOk: boolean; pOk: boolean } {
  const iOk = within(i, lvl.current, 0.03);
  const fOk = within(f, lvl.forceMilli, 0.03);
  const pOk = within(p, lvl.powerMilli, 0.03);
  return { ok: iOk && fOk && pOk, iOk, fOk, pOk };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'magnet') {
    return [
      lvl.motion === 'approach' ? `The flux through the coil from the ${lvl.pole} pole is growing, so the induced current makes a field that opposes it: the coil's face towards the magnet becomes a ${lvl.pole} pole too.` : `The flux through the coil from the ${lvl.pole} pole is falling, so the induced current makes a field that props it up: the coil's face towards the magnet becomes the opposite pole.`,
      `Seen from the magnet, that current is ${lvl.sense}. The coil ${lvl.force} the magnet, always opposing its motion. If it did the opposite the magnet would speed up for nothing, breaking conservation of energy.`,
    ];
  }
  if (lvl.kind === 'loop') {
    return lvl.sense === 'none'
      ? ['The flux through the loop does not change, so by Faraday’s law there is no induced emf and no current.', 'A strong field alone does nothing: it is the change of flux that induces the emf.']
      : [
          `The field is ${lvl.bInto ? 'into' : 'out of'} the page and its flux through the loop is ${lvl.cause.change}. The induced current must oppose the change.`,
          `To oppose ${lvl.cause.change === 'increasing' ? 'an increase' : 'a decrease'} of flux ${lvl.bInto ? 'into' : 'out of'} the page the loop makes a field ${(lvl.cause.change === 'increasing') === lvl.bInto ? 'out of' : 'into'} the page: the current is ${lvl.sense}.`,
        ];
  }
  return [
    `ε = Blv = ${lvl.b} × ${lvl.l} × ${lvl.v} = ${fmt(lvl.b * lvl.l * lvl.v)} V, so I = ε/R = ${fmt(lvl.current)} A.`,
    `The force on the current is F = BIl = ${fmt(lvl.forceMilli)} mN, opposing the motion, and the power supplied is P = Fv = ${fmt(lvl.powerMilli)} mW. This equals I²R: all the work done becomes heat in the circuit.`,
  ];
}
