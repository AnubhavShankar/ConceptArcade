// Pure rules of the Prism Lab: no DOM, no canvas.
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

const RAD = Math.PI / 180;
export const sinD = (d: number) => Math.sin(d * RAD);
export const asinD = (x: number) => Math.asin(x) / RAD;

export interface Hero {
  name: string;
  role: string;
  story: string;
  objective: string;
}

// ---- the physics ----------------------------------------------------------------------------------------------------------

export interface Path {
  r1: number;
  r2: number;
  /** Angle of emergence at the second face, or null when the ray is totally reflected there. */
  e: number | null;
  /** Deviation of the emergent ray, or null when it does not emerge. */
  D: number | null;
}
/** A ray at incidence i on the first face of a prism of apex angle A and index n (relative to the surroundings). */
export function path(A: number, n: number, i: number): Path {
  const r1 = asinD(sinD(i) / n);
  const r2 = A - r1;
  const s = n * sinD(r2);
  if (s >= 1 || r2 < 0) return { r1, r2, e: null, D: null };
  const e = asinD(s);
  return { r1, r2, e, D: i + e - A };
}
/** Angle of incidence for the minimum deviation: the ray crosses the prism symmetrically, r1 = A/2. */
export const minDevIncidence = (A: number, n: number, nL = 1) => asinD(((n / nL) * sinD(A / 2)));
export const minDeviation = (A: number, n: number, nL = 1) => 2 * minDevIncidence(A, n, nL) - A;
/** The refractive index from the angle of minimum deviation, n = sin((A + D)/2) / sin(A/2). */
export const indexFromMinDev = (A: number, Dmin: number) => sinD((A + Dmin) / 2) / sinD(A / 2);
/** The widest angle of incidence at which the ray is still totally reflected at the second face. */
export function tirLimit(A: number, n: number): number | null {
  const c = asinD(1 / n);
  const r1 = A - c;
  return r1 <= 0 ? null : asinD(n * sinD(r1));
}

// ---- the rounds -----------------------------------------------------------------------------------------------------------

export type Assist = 0 | 1 | 2;
export interface SweetRound {
  A: number;
  Dmin: number;
  /** The incidence of minimum deviation (a whole number of degrees) and the index of the glass. */
  iSol: number;
  nSol: number;
  assist: Assist;
}
export interface GelRound {
  A: number;
  n: number;
  nL: number;
  /** Incidence of minimum deviation in the gel (exact). */
  iSol: number;
  assist: Assist;
}
export interface PongRound {
  A: number;
  n: number;
  /** The widest incidence that is still totally reflected (exact). */
  iSol: number;
  assist: Assist;
}
export type Game =
  | { kind: 'sweet'; hero: Hero; rounds: SweetRound[]; charges: number[] }
  | { kind: 'gel'; hero: Hero; rounds: GelRound[]; charges: number[] }
  | { kind: 'pong'; hero: Hero; rounds: PongRound[]; charges: number[] };

/** [apex angle, minimum deviation]: the incidence of minimum deviation (A + D)/2 is a whole number of degrees. */
const SWEET: [number, number][] = [[60, 40], [60, 30], [60, 36], [50, 30], [60, 38], [60, 34], [70, 40], [50, 34]];
/** [apex angle, index of the glass, index of the gel] */
const GEL: [number, number, number][] = [[60, 1.5, 1.1], [60, 1.5, 1.2], [60, 1.6, 1.33], [60, 1.5, 1.33], [60, 1.66, 1.33]];
/** [apex angle, index] */
const PONG: [number, number][] = [[60, 1.524], [60, 1.6], [50, 1.6], [45, 1.5], [60, 1.7]];

export const SLIDERS = {
  i: { min: 1, max: 80, step: 1, start: 30 },
  n: { min: 1.3, max: 1.8, step: 0.01, start: 1.5 },
};

export function buildGame(level: number, random: () => number): Game {
  const assist = (k: number) => k as Assist;
  if (level === 1) {
    const picks = shuffle(SWEET, random).slice(0, 3);
    const rounds: SweetRound[] = picks.map(([A, Dmin], k) => ({ A, Dmin, iSol: (A + Dmin) / 2, nSol: indexFromMinDev(A, Dmin), assist: assist(k) }));
    return {
      kind: 'sweet',
      hero: {
        name: 'Beam',
        role: 'a laser that wants to bend as little as it can',
        story: 'A prism bends Beam by an amount that depends on the angle it arrives at, and there is one sweet spot where it bends least. The crystal on the right charges only when Beam leaves at that sweet spot. The bend at the sweet spot also gives away what the glass is made of.',
        objective: 'Find the incidence angle of least bend, and read the glass’s refractive index from it, in three rounds. Test beams are limited, and the live readout fades.',
      },
      rounds,
      charges: [1, 3, 3],
    };
  }
  if (level === 2) {
    const picks = shuffle(GEL, random).slice(0, 3).sort((a, b) => b[2] - a[2]);
    const rounds: GelRound[] = picks.map(([A, n, nL], k) => ({ A, n, nL, iSol: minDevIncidence(A, n, nL), assist: assist(k) }));
    return {
      kind: 'gel',
      hero: {
        name: 'Ray',
        role: 'a laser in a gel-filled test chamber',
        story: 'The chamber around the prism is filled with a clear gel. Light bends at the glass only because the glass differs from its surroundings, so the sweet spot of least bend moves when the gel changes.',
        objective: 'Set the incidence angle of least bend in the gel, in three rounds. Test beams are limited, and the live readout fades.',
      },
      rounds,
      charges: [1, 2, 2],
    };
  }
  const picks = shuffle(PONG, random).slice(0, 3);
  const rounds: PongRound[] = picks.map(([A, n], k) => ({ A, n, iSol: tirLimit(A, n)!, assist: assist(k) }));
  return {
    kind: 'pong',
    hero: {
      name: 'Photon',
      role: 'a ball of light in a game of Pong',
      story: 'Photon enters one face of the prism and heads for the second face. If it meets that face too steeply it escapes; if it meets it at more than the critical angle it bounces back inside, like a ball off a wall. The steeper Photon comes in at the first face, the less steeply it hits the second.',
      objective: 'Aim Photon at the widest angle at which it still bounces inside off the second face, in three rounds. Test beams are limited, and the live path fades.',
    },
    rounds,
    charges: [1, 1, 1],
  };
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export function judgeSweet(r: SweetRound, i: number, n: number): { ok: boolean; iOk: boolean; nOk: boolean } {
  const iOk = Math.abs(i - r.iSol) <= 0.5;
  const nOk = Math.abs(n - r.nSol) <= 0.006;
  return { ok: iOk && nOk, iOk, nOk };
}
export function judgeGel(r: GelRound, i: number): { ok: boolean } {
  return { ok: Math.abs(i - r.iSol) <= 0.51 };
}
/** Is the ray totally reflected at the second face for this incidence (a rounded entry up to half a degree over the limit is forgiven)? */
export const trapped = (r: PongRound, i: number) => i <= r.iSol + 0.51;
export function judgePong(r: PongRound, i: number): { ok: boolean; trapped: boolean } {
  return { ok: Math.abs(i - r.iSol) <= 0.51, trapped: trapped(r, i) };
}

/** A test beam in words. */
export function testText(A: number, n: number, i: number): string {
  const p = path(A, n, i);
  return p.D === null ? `At ${i}° the beam is totally reflected inside the prism and does not come out.` : `At ${i}° the beam leaves bent by ${fmt(p.D)}° from its original direction.`;
}

export function explainRound(g: Game, k: number): string[] {
  if (g.kind === 'sweet') {
    const r = g.rounds[k];
    return [
      `At the minimum deviation the ray crosses the prism symmetrically, so the incidence is i = (A + D)/2 = (${r.A}° + ${r.Dmin}°)/2 = ${r.iSol}°, and the ray inside makes r = A/2 = ${r.A / 2}° with each normal.`,
      `n = sin i / sin r = sin ${r.iSol}° / sin ${r.A / 2}° = ${fmt(r.nSol)} (Exercise 9.6). Two incidences with the same deviation lie either side of the sweet spot, and it is near the middle of them (exactly midway only when they are close together).`,
    ];
  }
  if (g.kind === 'gel') {
    const r = g.rounds[k];
    return [
      `In a gel of index ${r.nL} the prism acts like glass of relative index n/n(gel) = ${r.n}/${r.nL} = ${fmt(r.n / r.nL)}.`,
      `At the minimum deviation r = A/2 = ${r.A / 2}°, so sin i = ${fmt(r.n / r.nL)} × sin ${r.A / 2}° = ${fmt(r.n / r.nL * sinD(r.A / 2))}, and i = ${fmt(r.iSol)}° (Exercise 9.6, in a liquid). The bend is also smaller: D = ${fmt(minDeviation(r.A, r.n, r.nL))}°.`,
    ];
  }
  const r = g.rounds[k];
  const c = asinD(1 / r.n);
  return [
    `Photon is just totally reflected at the second face when r₂ = the critical angle: sin c = 1/n = 1/${r.n}, so c = ${fmt(c)}°.`,
    `Then r₁ = A − c = ${r.A}° − ${fmt(c)}° = ${fmt(r.A - c)}°, and sin i = n sin r₁ gives i = ${fmt(r.iSol)}°. A wider incidence gives a smaller r₂ and the ray escapes (Exercise 9.21).`,
  ];
}

export function resultLine(g: Game, k: number): string {
  if (g.kind === 'sweet') return `The crystal charges: least bend at ${g.rounds[k].iSol}°, so n = ${fmt(g.rounds[k].nSol)}.`;
  if (g.kind === 'gel') return `Least bend in the gel at i = ${fmt(g.rounds[k].iSol)}°.`;
  return `Photon just bounces: the limit is ${fmt(g.rounds[k].iSol)}°.`;
}

/** After a miss: the effect of what the player chose, never the right answer. */
export function missText(g: Game, k: number, tried: { i: number; n?: number }): string {
  if (g.kind === 'sweet') {
    const r = g.rounds[k];
    const j = judgeSweet(r, tried.i, tried.n ?? 1.5);
    const parts: string[] = [];
    if (!j.iOk) {
      const p = path(r.A, r.nSol, tried.i);
      parts.push(p.D === null ? 'At that angle the beam never leaves the prism, so the crystal stays dark.' : `Beam leaves bent by ${fmt(p.D)}°, not at its sweet spot, so the crystal stays dark.`);
    }
    if (!j.nOk) parts.push('The index you read does not match the glass.');
    return parts.join(' ');
  }
  if (g.kind === 'gel') {
    const r = g.rounds[k];
    const p = path(r.A, r.n / r.nL, tried.i);
    return p.D === null ? 'At that angle the beam is totally reflected and never leaves the prism.' : `Ray leaves bent by ${fmt(p.D)}°, but that is not the least bend the prism can give in this gel.`;
  }
  const r = g.rounds[k];
  return trapped(r, tried.i) ? 'Photon bounces back inside, but a wider shot would have bounced too: the limit is further out.' : 'Photon meets the second face too steeply and escapes through it.';
}

