// Pure rules of Mirror Crystal: no DOM, no canvas. A crystal is a grid of gems (a matrix). A mirror runs along its main diagonal: the crystal opens
// when it is symmetric (every gem equals its reflection, A′ = A) or skew symmetric (every gem is the opposite of its reflection, A′ = −A).
// Level 3 splits any 2 by 2 crystal into a symmetric part P and a skew part Q.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'sym' | 'skew' | 'split' | 'reverse';
export type Cell = number | null;
export interface Round {
  kind: Kind;
  /** sym, skew: the 3 by 3 crystal, null where a dial sets the gem; the letters x, y, z follow reading order. */
  A: Cell[][];
  /** split: the 2 by 2 crystal [a b; c d]. */
  M: number[][];
  /** reverse: the two crystals A and B whose product the vault reads in the mirror, (AB)′. */
  RA?: number[][];
  RB?: number[][];
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
  // The four gems of the crystal X the vault reads, (AB)′, in reading order.
  reverse: ['x11', 'x12', 'x21', 'x22'].map((k, i) => ({ key: k, label: ['X top left', 'X top right', 'X bottom left', 'X bottom right'][i], min: -20, max: 20, step: 1, start: 0 })),
};
export const KINDS: Kind[] = ['sym', 'skew', 'split', 'reverse'];

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

export const transpose = (M: number[][]): number[][] => M[0].map((_, j) => M.map((row) => row[j]));
export const mulM = (A: number[][], B: number[][]): number[][] => A.map((row) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
const sameM = (A: number[][], B: number[][]) => A.length === B.length && A.every((row, i) => row.length === B[i].length && row.every((v, j) => v === B[i][j]));
const rand = (rows: number[], cols: number, lo: number, hi: number, random: () => number): number[][] => rows.map(() => Array.from({ length: cols }, () => ri(lo, hi, random)));

/** Level 4: the vault reads (AB)′. Rounds 1 and 2 use 2 by 2 crystals, the boss a 2 by 3 times a 3 by 2. Every gem of C = AB is within the dials, C is not symmetric
 *  (so transposing matters), A′B′ differs from X = C′ (always, for the boss, where it is 3 by 3), and X has at least two non-zero gems. */
function reverseRound(i: number, random: () => number): Round {
  for (;;) {
    const boss = i === 2;
    const RA = boss ? rand([0, 1], 3, -2, 3, random) : rand([0, 1], 2, -3, 4, random);
    const RB = boss ? rand([0, 1, 2], 2, -2, 3, random) : rand([0, 1], 2, -3, 4, random);
    const C = mulM(RA, RB);
    const X = transpose(C);
    if (!C.flat().every((c) => Math.abs(c) <= 20)) continue;
    if (sameM(C, X)) continue;
    if (!boss && sameM(mulM(transpose(RA), transpose(RB)), X)) continue;
    if (X.flat().filter((c) => c !== 0).length < 2) continue;
    return { kind: 'reverse', A: [], M: [], RA, RB, ans: { x11: X[0][0], x12: X[0][1], x21: X[1][0], x22: X[1][1] }, assist: 0 };
  }
}

export function buildRounds(level: number, random: () => number): Round[] {
  const kind = KINDS[level - 1];
  const out: Round[] = [];
  const make: (random: () => number) => Round = kind === 'reverse' ? (rnd) => reverseRound(out.length, rnd) : { sym: symRound, skew: skewRound, split: splitRound }[kind];
  for (let i = 0; i < 3; i++) {
    let r = make(random);
    const same = (o: Round) => JSON.stringify(o.A) === JSON.stringify(r.A) && JSON.stringify(o.M) === JSON.stringify(r.M) && JSON.stringify(o.RA) === JSON.stringify(r.RA) && JSON.stringify(o.RB) === JSON.stringify(r.RB);
    for (let t = 0; t < 10 && (out.some(same) || Object.values(r.ans).every((x) => x === 0)); t++) r = make(random);
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

const XKEYS = ['x11', 'x12', 'x21', 'x22'];
const XPLACE = ['top left', 'top right', 'bottom left', 'bottom right'];
/** The four gems of the player's crystal X as a 2 by 2 matrix. */
export const xOf = (v: Record<string, number>): number[][] => [[v.x11, v.x12], [v.x21, v.x22]];
/** How many of the four gems of X match the vault's crystal. */
export const reverseMatches = (r: Round, v: Record<string, number>) => XKEYS.filter((k) => v[k] === r.ans[k]).length;
/** The 2 by 2 matrix A′B′ (the wrong order), or null when it is not 2 by 2. */
export const wrongOrder = (r: Round): number[][] | null => {
  const P = mulM(transpose(r.RA!), transpose(r.RB!));
  return P.length === 2 && P[0].length === 2 ? P : null;
};

export function judge(r: Round, v: Record<string, number>): boolean {
  if (r.kind === 'reverse') return reverseMatches(r, v) === 4;
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
  if (r.kind === 'reverse') {
    const X = xOf(v);
    const P = wrongOrder(r);
    if (P && sameM(X, P)) return 'Your crystal is A′B′, the mirror images multiplied in the same order: the vault stayed shut. The transpose of a product turns the order round.';
    if (sameM(X, mulM(r.RA!, r.RB!))) return 'Your crystal is AB itself, not its mirror image: the vault stayed shut.';
    const i = XKEYS.findIndex((k) => v[k] !== r.ans[k]);
    return `The ${XPLACE[i]} gem does not match the vault’s crystal: the vault stayed shut.`;
  }
  // Rounds 2 and 3 get one generic text: naming the failing pair or part would be the paid check for free.
  if (r.kind === 'split' && r.assist > 0) return 'The crystal stayed shut. P must mirror itself, Q must be its own opposite, and P + Q must give A: test each of the three rules against your gems.';
  if (r.kind !== 'split' && r.assist > 0) return r.kind === 'sym' ? 'The crystal stayed shut: a gem does not equal its reflection in the mirror. Test each gem against the one opposite it.' : 'The crystal stayed shut: some gem is not the opposite of its reflection, or a gem on the mirror line is not its own opposite. Test each pair.';
  if (r.kind === 'split') {
    const S = sumPQ(v);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (S[i][j] !== r.M[i][j]) return `P + Q does not give the crystal at ${at(i, j)}: change one of the two parts there.`;
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
  if (r.kind === 'reverse') return `Test glow: ${reverseMatches(r, v)} of the 4 gems match.`;
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
const matStr = (M: number[][]) => `[${M.map((row) => row.map(num).join(', ')).join('; ')}]`;
export function explain(r: Round): string {
  if (r.kind === 'reverse') {
    const C = mulM(r.RA!, r.RB!);
    const BtAt = mulM(transpose(r.RB!), transpose(r.RA!));
    return `AB = ${matStr(C)}, so (AB)′ = ${matStr(transpose(C))}. Check: B′A′ = ${matStr(BtAt)}, the same, because (AB)′ = B′A′.`;
  }
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
  r.kind === 'reverse'
    ? `The vault reads (AB)′ with A = ${matStr(r.RA!)} and B = ${matStr(r.RB!)}. Set the four gems of X.`
    : r.kind === 'split'
      ? `The crystal is A = [${r.M.map((row) => row.join(', ')).join('; ')}]. Split it into P + Q with P symmetric and Q skew symmetric.`
      : `Set the gems x, y and z so that the crystal is ${r.kind === 'sym' ? 'symmetric: every gem equals its reflection in the diagonal mirror' : 'skew symmetric: every gem is the opposite of its reflection, and the mirror line is all zeros'}.`;
