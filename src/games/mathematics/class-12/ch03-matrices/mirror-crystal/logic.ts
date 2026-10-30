// Pure rules of Mirror Crystal: no DOM, no canvas. A crystal is a grid of gems (a matrix). A mirror runs along its main diagonal: the crystal opens
// when it is symmetric (every gem equals its reflection, A′ = A) or skew symmetric (every gem is the opposite of its reflection, A′ = −A).
// Level 3 splits any 2 by 2 crystal into a symmetric part P and a skew part Q.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'sym' | 'skew' | 'split';
export type Cell = number | null;
export interface Round {
  kind: Kind;
  /** sym, skew: the 3 by 3 crystal, null where a dial sets the gem; the letters x, y, z follow reading order. */
  A: Cell[][];
  /** split: the 2 by 2 crystal [a b; c d]. */
  M: number[][];
  /** The winning setting of every dial. */
  ans: Record<string, number>;
  assist: 0 | 1 | 2;
}

export const DIALS: Record<Kind, { key: string; label: string; min: number; max: number; step: number; start: number }[]> = {
  sym: ['x', 'y', 'z'].map((k) => ({ key: k, label: `Gem ${k}`, min: -9, max: 9, step: 1, start: 0 })),
  skew: ['x', 'y', 'z'].map((k) => ({ key: k, label: `Gem ${k}`, min: -9, max: 9, step: 1, start: 0 })),
  // Every gem of P and of Q is a lever: the player has to find out that P must mirror itself and Q must be its own opposite.
  split: [
    { key: 'p11', label: 'P top left', min: -12, max: 12, step: 0.5, start: 0 },
    { key: 'p12', label: 'P top right', min: -12, max: 12, step: 0.5, start: 0 },
    { key: 'p21', label: 'P bottom left', min: -12, max: 12, step: 0.5, start: 0 },
    { key: 'p22', label: 'P bottom right', min: -12, max: 12, step: 0.5, start: 0 },
    { key: 'q11', label: 'Q top left', min: -12, max: 12, step: 0.5, start: 0 },
    { key: 'q12', label: 'Q top right', min: -12, max: 12, step: 0.5, start: 0 },
    { key: 'q21', label: 'Q bottom left', min: -12, max: 12, step: 0.5, start: 0 },
    { key: 'q22', label: 'Q bottom right', min: -12, max: 12, step: 0.5, start: 0 },
  ],
};
export const KINDS: Kind[] = ['sym', 'skew', 'split'];

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
const nonzero = (random: () => number) => pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9], random);
const PAIRS: [number, number][] = [[0, 1], [0, 2], [1, 2]];

/** The 3 by 3 crystal with the dials filled in. */
export function filled(r: Round, v: Record<string, number>): number[][] {
  let n = 0;
  return r.A.map((row) => row.map((c) => (c === null ? v['xyz'[n++]] : c)));
}

function symRound(random: () => number): Round {
  const A: Cell[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const ans: Record<string, number> = {};
  for (let i = 0; i < 3; i++) A[i][i] = ri(1, 9, random);
  const unknownSide = PAIRS.map(() => pick([0, 1], random));
  PAIRS.forEach(([i, j], k) => {
    const known = nonzero(random);
    const u: [number, number] = unknownSide[k] === 0 ? [i, j] : [j, i];
    const kn: [number, number] = unknownSide[k] === 0 ? [j, i] : [i, j];
    A[kn[0]][kn[1]] = known;
    A[u[0]][u[1]] = null;
  });
  let n = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (A[i][j] === null) ans['xyz'[n++]] = A[j][i] as number;
  return { kind: 'sym', A, M: [], ans, assist: 0 };
}

function skewRound(random: () => number): Round {
  const A: Cell[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const ans: Record<string, number> = {};
  const diag = pick([0, 1, 2], random);
  A[diag][diag] = null;
  const missing = shuffle([0, 1, 2], random)[0];
  PAIRS.forEach(([i, j], k) => {
    const v = nonzero(random);
    if (k === missing) {
      A[i][j] = v;
      A[j][i] = -v;
    } else {
      const side = pick([0, 1], random);
      const [u, w] = side === 0 ? [[i, j], [j, i]] : [[j, i], [i, j]];
      A[w[0]][w[1]] = v;
      A[u[0]][u[1]] = null;
    }
  });
  let n = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (A[i][j] === null) ans['xyz'[n++]] = i === j ? 0 : -(A[j][i] as number);
  return { kind: 'skew', A, M: [], ans, assist: 0 };
}

function splitRound(random: () => number): Round {
  const a = ri(1, 9, random);
  const d = ri(-4, 9, random);
  const b = ri(-6, 9, random);
  const c = ri(-6, 9, random);
  return { kind: 'split', A: [], M: [[a, b], [c, d]], ans: { p11: a, p12: (b + c) / 2, p21: (b + c) / 2, p22: d, q11: 0, q12: (b - c) / 2, q21: (c - b) / 2, q22: 0 }, assist: 0 };
}

export function buildRounds(level: number, random: () => number): Round[] {
  const make = { sym: symRound, skew: skewRound, split: splitRound }[KINDS[level - 1]];
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    let r = make(random);
    for (let t = 0; t < 10 && (out.some((o) => JSON.stringify(o.A) === JSON.stringify(r.A) && JSON.stringify(o.M) === JSON.stringify(r.M)) || Object.values(r.ans).every((x) => x === 0)); t++) r = make(random);
    out.push({ ...r, assist: aid(i) });
  }
  return out;
}

/** The pairs (i, j) with i < j whose gem and reflection break the rule, and the diagonal gems that break the skew rule. */
export function broken(r: Round, v: Record<string, number>): { pairs: [number, number][]; diag: number[] } {
  const M = filled(r, v);
  const pairs = PAIRS.filter(([i, j]) => (r.kind === 'sym' ? M[i][j] !== M[j][i] : M[i][j] !== -M[j][i]));
  const diag = r.kind === 'skew' ? [0, 1, 2].filter((i) => M[i][i] !== 0) : [];
  return { pairs, diag };
}

/** The 2 by 2 sum P + Q for the dials. */
export const sumPQ = (v: Record<string, number>): number[][] => [[v.p11 + v.q11, v.p12 + v.q12], [v.p21 + v.q21, v.p22 + v.q22]];
/** P is symmetric when it matches its mirror image; Q is skew symmetric when its diagonal is 0 and its mirror gems are opposites. */
export const pSymmetric = (v: Record<string, number>) => v.p12 === v.p21;
export const qSkew = (v: Record<string, number>) => v.q11 === 0 && v.q22 === 0 && v.q21 === -v.q12;

export function judge(r: Round, v: Record<string, number>): boolean {
  if (r.kind === 'split') {
    const S = sumPQ(v);
    return S.every((row, i) => row.every((x, j) => x === r.M[i][j])) && pSymmetric(v) && qSkew(v);
  }
  const b = broken(r, v);
  return b.pairs.length === 0 && b.diag.length === 0;
}

const at = (i: number, j: number) => `row ${i + 1}, column ${j + 1}`;
/** After a miss: which gems the mirror caught, never the values that fix them. */
export function missText(r: Round, v: Record<string, number>): string {
  if (r.kind === 'split') {
    const S = sumPQ(v);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (S[i][j] !== r.M[i][j]) return `P + Q does not give the crystal: at ${at(i, j)} the two parts add up to ${num(S[i][j])}, not what the crystal holds there.`;
    if (!pSymmetric(v)) return `P is not symmetric: its gems at ${at(0, 1)} and ${at(1, 0)} differ, so the mirror does not match them.`;
    if (v.q11 !== 0 || v.q22 !== 0) return 'Q is not skew symmetric: a gem on its mirror line is its own reflection, so it would have to be its own opposite.';
    return `Q is not skew symmetric: its gems at ${at(0, 1)} and ${at(1, 0)} are not opposites.`;
  }
  const b = broken(r, v);
  if (b.pairs.length) {
    const [i, j] = b.pairs[0];
    return `The mirror caught the gems at ${at(i, j)} and ${at(j, i)}: they ${r.kind === 'sym' ? 'are not equal' : 'are not opposites'}, so the crystal stayed shut.`;
  }
  return `A gem on the mirror line (${at(b.diag[0], b.diag[0])}) must be its own opposite for a skew crystal, and it is not.`;
}
export function spotText(r: Round, v: Record<string, number>): string {
  if (r.kind === 'split') {
    const S = sumPQ(v);
    const ok = S.map((row, i) => row.map((x, j) => (x === r.M[i][j] ? '✓' : '✗')).join(' '));
    return `Check P + Q against the crystal: top row ${ok[0]}, bottom row ${ok[1]}. P is ${pSymmetric(v) ? '' : 'not '}symmetric and Q is ${qSkew(v) ? '' : 'not '}skew symmetric.`;
  }
  const b = broken(r, v);
  return `Check: ${PAIRS.length - b.pairs.length} of 3 mirror pairs match${r.kind === 'skew' ? `, and ${3 - b.diag.length} of 3 mirror-line gems are fine` : ''}.`;
}

const cellName = (i: number, j: number) => `a${i + 1}${j + 1}`;
/** After a hit: the working. */
export function explain(r: Round): string {
  if (r.kind === 'split') {
    const [[a, b], [c, d]] = r.M;
    return `P = ½(A + A′) = [${a}, ${num((b + c) / 2)}; ${num((b + c) / 2)}, ${d}] is symmetric, and Q = ½(A − A′) = [0, ${num((b - c) / 2)}; ${num((c - b) / 2)}, 0] is skew symmetric. Check: P + Q = A.`;
  }
  const letters: string[] = [];
  let n = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (r.A[i][j] !== null) continue;
      const l = 'xyz'[n++];
      if (r.kind === 'sym') letters.push(`${l} = ${cellName(i, j)} = ${cellName(j, i)} = ${r.ans[l]}`);
      else letters.push(i === j ? `${l} = ${cellName(i, i)} = −${cellName(i, i)}, so ${l} = 0` : `${l} = ${cellName(i, j)} = −${cellName(j, i)} = ${num(r.ans[l])}`);
    }
  }
  return `${r.kind === 'sym' ? 'A′ = A means a_ij = a_ji' : 'A′ = −A means a_ji = −a_ij, so every diagonal entry is 0'}: ${letters.join('; ')}.`;
}
export const intel = (r: Round): string =>
  r.kind === 'split'
    ? `The crystal is A = [${r.M.map((row) => row.join(', ')).join('; ')}]. Split it into P + Q with P symmetric and Q skew symmetric.`
    : `Set the gems x, y and z so that the crystal is ${r.kind === 'sym' ? 'symmetric: every gem equals its reflection in the diagonal mirror' : 'skew symmetric: every gem is the opposite of its reflection, and the mirror line is all zeros'}.`;
