// Pure rules of the Energy Bench: no DOM, no canvas.
// Charges in nC, distances in cm, energies in µJ (system and dipole) or nJ (moving a test charge), potentials in volts.
import { pick } from '@core/quiz';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}
const within = (value: number, answer: number, tol: number) => (answer === 0 ? Math.abs(value) <= 1e-6 : Math.abs(value - answer) / Math.abs(answer) <= tol);

export interface Pt {
  x: number;
  y: number;
}
export interface Src {
  q: number;
  at: Pt;
}
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
/** Potential (V) at a point from charges in nC at positions in cm. */
export const potentialAt = (p: Pt, srcs: Src[]) => srcs.reduce((v, s) => v + (dist(p, s.at) > 1e-9 ? (900 * s.q) / dist(p, s.at) : 0), 0);

/** Interaction energy of one pair: k q1 q2 / r, in µJ (q in nC, r in cm). */
export const pairEnergy = (q1: number, q2: number, rCm: number) => (0.9 * q1 * q2) / rCm;
/** Potential energy of a whole system: the sum over every pair, each counted once. */
export function systemEnergy(srcs: Src[]): number {
  let u = 0;
  for (let i = 0; i < srcs.length; i++) for (let j = i + 1; j < srcs.length; j++) u += pairEnergy(srcs[i].q, srcs[j].q, dist(srcs[i].at, srcs[j].at));
  return u;
}
/** The work done in bringing the charges in one at a time, in order (from far away). Step k brings charge k. */
export function assemblySteps(srcs: Src[]): number[] {
  return srcs.map((s, k) => srcs.slice(0, k).reduce((w, t) => w + pairEnergy(s.q, t.q, dist(s.at, t.at)), 0));
}
/** Work (nJ) done by an external agent in moving a test charge q0 (nC) from A to B: W = q0 (V_B − V_A). */
export const moveWork = (q0: number, vA: number, vB: number) => q0 * (vB - vA);
/** Potential energy (µJ) of a dipole p (C m) in a field E (N/C) at angle θ to it: U = −pE cos θ. */
export const dipoleEnergy = (p: number, e: number, thetaDeg: number) => -p * e * Math.cos((thetaDeg * Math.PI) / 180) * 1e6;
/** Work (µJ) to turn a dipole from θ₁ to θ₂: the change in U. */
export const turnWork = (p: number, e: number, t1: number, t2: number) => dipoleEnergy(p, e, t2) - dipoleEnergy(p, e, t1);

// ---- levels ---------------------------------------------------------------------------------------------------------

export interface LevelSystem {
  kind: 'system';
  story: string;
  charges: Src[];
  side: number;
  answer: number; // µJ
  steps: number[];
  freeTests: number;
}
export type Path = 'same' | 'longer-more' | 'shorter-more';
export interface LevelMove {
  kind: 'move';
  story: string;
  fixed: Src[];
  testQ: number;
  a: Pt;
  b: Pt;
  vA: number;
  vB: number;
  answer: number; // nJ
  freeTests: number;
}
export interface LevelDipole {
  kind: 'dipole';
  story: string;
  q: number;
  sep: number;
  p: number;
  e: number;
  t1: number;
  t2: number;
  answer: number; // µJ
  u1: number;
  u2: number;
  freeTests: number;
}
export type Level = LevelSystem | LevelMove | LevelDipole;

export function buildLevel(level: number, random: () => number): Level {
  const sign = () => (random() < 0.5 ? -1 : 1);
  if (level === 1) {
    const side = pick([10, 12, 15, 20], random);
    const mags = [2, 3, 4, 5];
    let qs = [sign() * pick(mags, random), sign() * pick(mags, random), sign() * pick(mags, random)];
    if (qs.every((q) => Math.sign(q) === Math.sign(qs[0]))) qs = [qs[0], qs[1], -qs[2]];
    const R = side / Math.sqrt(3);
    const charges: Src[] = qs.map((q, i) => ({ q, at: { x: R * Math.cos(Math.PI / 2 + (2 * Math.PI * i) / 3), y: R * Math.sin(Math.PI / 2 + (2 * Math.PI * i) / 3) } }));
    return {
      kind: 'system',
      story: 'Three charges sit at the corners of an equilateral triangle. The potential energy of the system is the work needed to bring them there, one at a time, from far apart. Work out the total. Unlike charges lower the energy and like charges raise it.',
      charges,
      side,
      answer: systemEnergy(charges),
      steps: assemblySteps(charges),
      freeTests: 1,
    };
  }
  if (level === 2) {
    const a = pick([4, 5, 6], random);
    const mags = [3, 4, 5, 6];
    const fixed: Src[] = [{ q: sign() * pick(mags, random), at: { x: -a, y: 0 } }, { q: sign() * pick(mags, random), at: { x: a, y: 0 } }];
    let A: Pt = { x: -14, y: 5 };
    let B: Pt = { x: 12, y: -4 };
    for (let i = 0; i < 400; i++) {
      const p = { x: -20 + random() * 40, y: -10 + random() * 20 };
      const q = { x: -20 + random() * 40, y: -10 + random() * 20 };
      if ([p, q].some((z) => fixed.some((f) => dist(f.at, z) < 4)) || dist(p, q) < 10) continue;
      const dv = Math.abs(potentialAt(q, fixed) - potentialAt(p, fixed));
      if (dv > 60 && dv < 600) {
        A = p;
        B = q;
        break;
      }
    }
    const testQ = sign() * pick([1, 2, 5], random);
    const vA = potentialAt(A, fixed);
    const vB = potentialAt(B, fixed);
    return {
      kind: 'move',
      story: 'Two fixed charges set up a potential. A small test charge is carried from A to B by an outside agent. The work depends only on the potentials at A and at B, not on the route taken. Find the work done by the agent, with its sign.',
      fixed,
      testQ,
      a: A,
      b: B,
      vA,
      vB,
      answer: moveWork(testQ, vA, vB),
      freeTests: 1,
    };
  }
  const q = pick([2, 4, 5], random);
  const sep = pick([4, 5, 10], random);
  const p = q * 1e-9 * (sep / 100);
  const e = pick([2000, 4000, 5000, 10000], random);
  const pairs: [number, number][] = [[0, 180], [0, 90], [90, 180], [30, 120], [60, 180], [180, 0], [45, 135]];
  const [t1, t2] = pick(pairs, random);
  return {
    kind: 'dipole',
    story: 'A dipole sits in a uniform field, and an outside agent turns it slowly from one orientation to another. The potential energy of a dipole in a field is U = −pE cos θ, lowest when it points along the field. Find the work the agent does, with its sign.',
    q,
    sep,
    p,
    e,
    t1,
    t2,
    answer: turnWork(p, e, t1, t2),
    u1: dipoleEnergy(p, e, t1),
    u2: dipoleEnergy(p, e, t2),
    freeTests: 1,
  };
}

export function judgeSystem(lvl: LevelSystem, u: number): { ok: boolean; verdict: 'on-target' | 'too-high' | 'too-low' } {
  const ok = within(u, lvl.answer, 0.03);
  return { ok, verdict: ok ? 'on-target' : u > lvl.answer ? 'too-high' : 'too-low' };
}
export function judgeMove(lvl: LevelMove, w: number, path: Path): { ok: boolean; wOk: boolean; pathOk: boolean } {
  const wOk = within(w, lvl.answer, 0.03);
  const pathOk = path === 'same';
  return { ok: wOk && pathOk, wOk, pathOk };
}
export function judgeDipole(lvl: LevelDipole, w: number): { ok: boolean; verdict: 'on-target' | 'wrong-sign' | 'too-high' | 'too-low' } {
  const ok = within(w, lvl.answer, 0.03);
  const verdict = ok ? 'on-target' : lvl.answer !== 0 && Math.sign(w) !== Math.sign(lvl.answer) ? 'wrong-sign' : w > lvl.answer ? 'too-high' : 'too-low';
  return { ok, verdict };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

// ---- what is shown after a win -------------------------------------------------------------------------------------------

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'system') {
    const [a, b, c] = lvl.charges;
    return [
      'Bring the charges in one at a time. The first costs nothing. The second feels the first: W₂ = kq₁q₂/r. The third feels both: W₃ = kq₃(q₁/r + q₂/r).',
      `Here that is ${lvl.steps.map((s) => fmt(s)).join(' µJ, then ')} µJ, a total of ${fmt(lvl.answer)} µJ.`,
      `Equivalently U = (k/${lvl.side} cm)(q₁q₂ + q₁q₃ + q₂q₃) with q = ${[a, b, c].map((x) => x.q).join(', ')} nC. Each pair is counted once, and unlike charges give a negative term.`,
    ];
  }
  if (lvl.kind === 'move') {
    return [
      `The potential at A is ${fmt(lvl.vA)} V and at B is ${fmt(lvl.vB)} V (sum of kq/r over the two fixed charges).`,
      `The work done by the agent is W = q₀(V_B − V_A) = ${lvl.testQ} nC × (${fmt(lvl.vB)} − ${fmt(lvl.vA)}) V = ${fmt(lvl.answer)} nJ.`,
      'The electrostatic force is conservative: the work depends only on the end points, never on the path.',
    ];
  }
  return [
    `U = −pE cos θ. At θ = ${lvl.t1}°: U = ${fmt(lvl.u1)} µJ. At θ = ${lvl.t2}°: U = ${fmt(lvl.u2)} µJ.`,
    `The agent supplies the change: W = U₂ − U₁ = ${fmt(lvl.answer)} µJ${lvl.answer < 0 ? ' (negative: the field does the work as the dipole swings towards the field)' : ''}.`,
    'The energy is lowest at θ = 0 (stable) and highest at θ = 180° (unstable). Turning from 0 to 180° takes 2pE.',
  ];
}
