// Pure rules of the Magnet Bench: no DOM, no canvas.
// Magnetic moments in J/T (A m²), areas in cm² where named, currents in A.
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

export type Pole = 'N' | 'S';
export const otherPole = (p: Pole): Pole => (p === 'N' ? 'S' : 'N');
/** The magnetic moment of a solenoid, m = N I A, with A in cm². */
export const solenoidMoment = (n: number, i: number, aCm2: number) => n * i * aCm2 * 1e-4;
/** Which end is the north pole: with the current on the front of the windings flowing up, the north pole is at the left end. */
export const northAtLeft = (frontUp: boolean) => frontUp;

// ---- levels --------------------------------------------------------------------------------------------------------------

export interface LevelCut {
  kind: 'cut';
  story: string;
  /** Number of pieces, and whether the cuts run across the length or along it. */
  pieces: number;
  dir: 'across' | 'along';
  /** True when the original magnet has its north pole at the left end. */
  northLeft: boolean;
  freeTests: number;
}
export interface LevelSolenoid {
  kind: 'solenoid';
  story: string;
  n: number;
  aCm2: number;
  i: number;
  frontUp: boolean;
  m: number;
  freeTests: number;
}
export interface LevelMatch {
  kind: 'match';
  story: string;
  mBar: number;
  n: number;
  aCm2: number;
  i: number;
  freeTests: number;
}
export type Level = LevelCut | LevelSolenoid | LevelMatch;

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const dir = random() < 0.5 ? 'across' : 'along';
    const pieces = pick([2, 3], random);
    return {
      kind: 'cut',
      story: dir === 'across' ? 'A bar magnet is cut across its length into pieces. Is there any way to end up with a piece that has only a north pole? Label the two ends of every piece as north or south.' : 'A bar magnet is cut along its length into thinner pieces. Label the two ends of every piece as north or south, and see whether any piece ends up with a single pole.',
      pieces,
      dir,
      northLeft: random() < 0.5,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const n = pick([200, 400, 800, 2000], random);
    const aCm2 = pick([1.6, 2.5, 4], random);
    const i = pick([2, 3, 4], random);
    const frontUp = random() < 0.5;
    return {
      kind: 'solenoid',
      story: 'A closely wound solenoid carrying a current behaves like a bar magnet. Find its magnetic moment, and say at which end its north pole is, using the direction of the current in the windings on the side facing you.',
      n,
      aCm2,
      i,
      frontUp,
      m: solenoidMoment(n, i, aCm2),
      freeTests: 1,
    };
  }
  const n = pick([400, 800, 2000], random);
  const aCm2 = pick([1.6, 2.5, 4], random);
  const i = pick([1, 2, 3, 4], random);
  return {
    kind: 'match',
    story: 'A short bar magnet has a known magnetic moment. A solenoid of the stated turns and cross-section is to behave as an equivalent magnet. Find the current it needs to have the same magnetic moment.',
    mBar: solenoidMoment(n, i, aCm2),
    n,
    aCm2,
    i,
    freeTests: 1,
  };
}

/** The correct labels for every piece: [left end, right end]. Every piece is a complete magnet pointing the same way as the original. */
export function correctEnds(lvl: LevelCut): [Pole, Pole][] {
  const pair: [Pole, Pole] = lvl.northLeft ? ['N', 'S'] : ['S', 'N'];
  return Array.from({ length: lvl.pieces }, () => [pair[0], pair[1]]);
}
export function judgeCut(lvl: LevelCut, labels: (Pole | null)[][]): { ok: boolean; unset: boolean; wrongPieces: number[] } {
  const truth = correctEnds(lvl);
  const unset = labels.some((p) => p.some((x) => x === null));
  const wrongPieces = truth.map((_, i) => i).filter((i) => labels[i][0] !== truth[i][0] || labels[i][1] !== truth[i][1]);
  return { ok: !unset && wrongPieces.length === 0, unset, wrongPieces };
}
export function judgeSolenoid(lvl: LevelSolenoid, m: number, northLeft: boolean): { ok: boolean; mOk: boolean; poleOk: boolean } {
  const mOk = within(m, lvl.m, 0.03);
  const poleOk = northLeft === northAtLeft(lvl.frontUp);
  return { ok: mOk && poleOk, mOk, poleOk };
}
export function judgeMatch(lvl: LevelMatch, i: number): { ok: boolean } {
  return { ok: within(i, lvl.i, 0.03) };
}

export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'cut') {
    return [
      `Every piece is a complete magnet with a north pole at one end and a south pole at the other, all pointing the same way as the original (north at the ${lvl.northLeft ? 'left' : 'right'}).`,
      lvl.dir === 'across' ? 'Cutting across creates new poles at each cut face: the face on one piece is a south pole and the face on the next piece is a north pole. Isolated magnetic poles (monopoles) do not exist.' : 'Cutting along the length makes thinner magnets, each with the same north and south ends as before.',
    ];
  }
  if (lvl.kind === 'solenoid') {
    return [
      `The magnetic moment of a solenoid is m = N I A = ${lvl.n} × ${lvl.i} × ${lvl.aCm2 * 1e-4} = ${fmt(lvl.m)} J/T, just as for a single loop but with N turns.`,
      `The current on the front of the windings flows ${lvl.frontUp ? 'upwards' : 'downwards'}. Curl the fingers of the right hand along that current: the thumb points to the north pole, at the ${lvl.frontUp ? 'left' : 'right'} end.`,
    ];
  }
  return [
    `The solenoid's moment is N I A, so I = m/(N A) = ${fmt(lvl.mBar)} / (${lvl.n} × ${lvl.aCm2 * 1e-4}) = ${fmt(lvl.i)} A.`,
    'A current loop and a bar magnet are equivalent when they have the same magnetic moment: the far field depends only on m.',
  ];
}
