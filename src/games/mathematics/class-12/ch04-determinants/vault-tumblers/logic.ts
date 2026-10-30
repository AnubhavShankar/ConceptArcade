// Pure rules of Vault Tumblers: no DOM, no canvas. A vault opens when its tumblers (x, y, z) satisfy every clue plate AX = B. Levels 1 to 3
// have one code; level 4 asks for the determinant and whether the plates have one code, none, or many.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'two' | 'three' | 'bill' | 'jam';
export type Verdict = 1 | 2 | 3; // 1 = exactly one code, 2 = no code, 3 = many codes
export interface Round {
  kind: Kind;
  A: number[][];
  B: number[];
  /** The names of the unknowns on the plates (letters, or the goods in a shopping bill). */
  names: string[];
  /** The code (levels 1 to 3). */
  sol: number[];
  /** Level 4: the true verdict and |A|. */
  verdict: Verdict;
  det: number;
  assist: 0 | 1 | 2;
}

export const DIALS = {
  digits: { min: 0, max: 12 },
  det: { min: -30, max: 30 },
  verdict: { min: 1, max: 3 },
};
const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));

export const det2 = (A: number[][]) => A[0][0] * A[1][1] - A[0][1] * A[1][0];
export function det3(A: number[][]): number {
  return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
}
export const det = (A: number[][]) => (A.length === 2 ? det2(A) : det3(A));

/** The adjoint: the transpose of the matrix of cofactors. */
export function adj(A: number[][]): number[][] {
  if (A.length === 2) return [[A[1][1], -A[0][1]], [-A[1][0], A[0][0]]];
  const minor = (i: number, j: number) => {
    const rows = [0, 1, 2].filter((r) => r !== i);
    const cols = [0, 1, 2].filter((c) => c !== j);
    return A[rows[0]][cols[0]] * A[rows[1]][cols[1]] - A[rows[0]][cols[1]] * A[rows[1]][cols[0]];
  };
  const cof = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i + j) % 2 === 0 ? minor(i, j) : -minor(i, j)));
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => cof[j][i]));
}
export const mulVec = (M: number[][], v: number[]) => M.map((row) => row.reduce((s, x, k) => s + x * v[k], 0));

const eqText = (row: number[], names: string[], rhs: number) => {
  const parts: string[] = [];
  row.forEach((c, i) => {
    if (c === 0) return;
    const mag = Math.abs(c) === 1 ? names[i] : `${Math.abs(c)}${names[i].length > 1 ? ' ' : ''}${names[i]}`;
    parts.push(parts.length === 0 ? `${c < 0 ? '−' : ''}${mag}` : `${c < 0 ? '−' : '+'} ${mag}`);
  });
  return `${parts.join(' ')} = ${num(rhs)}`;
};
export const plateText = (r: Round, i: number) => eqText(r.A[i], r.names, r.B[i]);
/** The plates, satisfied or not, at the given tumblers. */
export const plateOk = (r: Round, v: number[]) => r.A.map((row, i) => row.reduce((s, c, k) => s + c * v[k], 0) === r.B[i]);

function system(n: 2 | 3, random: () => number, lo: number, hi: number, negatives: boolean): number[][] {
  const values = [...Array(hi - lo + 1)].map((_, i) => lo + i).concat(negatives ? [-1, -2] : []);
  for (;;) {
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => pick(values, random)));
    const d = det(A);
    if (d !== 0 && Math.abs(d) <= 30) return A;
  }
}

const GOODS = [['onion', 'wheat', 'rice'], ['pen', 'notebook', 'folder'], ['apple', 'banana', 'mango']];
function solvable(kind: 'two' | 'three' | 'bill', random: () => number): Round {
  const n = kind === 'two' ? 2 : 3;
  const A = kind === 'bill' ? system(3, random, 1, 6, false) : system(n, random, 1, 4, n === 3);
  const sol = Array.from({ length: n }, () => ri(2, 9, random));
  const names = kind === 'bill' ? pick(GOODS, random) : n === 2 ? ['x', 'y'] : ['x', 'y', 'z'];
  return { kind, A, B: mulVec(A, sol), names, sol, verdict: 1, det: det(A), assist: 0 };
}

function jam(verdict: Verdict, random: () => number): Round {
  if (verdict === 1) {
    const A = system(3, random, 0, 3, false);
    const sol = Array.from({ length: 3 }, () => ri(1, 6, random));
    return { kind: 'jam', A, B: mulVec(A, sol), names: ['x', 'y', 'z'], sol, verdict, det: det3(A), assist: 0 };
  }
  for (;;) {
    const r1 = [ri(1, 3, random), ri(0, 3, random), ri(1, 3, random)];
    const r2 = [ri(0, 3, random), ri(1, 3, random), ri(1, 3, random)];
    if (r1[0] * r2[1] === r1[1] * r2[0] && r1[0] * r2[2] === r1[2] * r2[0]) continue; // not proportional
    const A = [r1, r2, r1.map((c, i) => c + r2[i])];
    const b1 = ri(2, 9, random);
    const b2 = ri(2, 9, random);
    const b3 = verdict === 3 ? b1 + b2 : b1 + b2 + pick([-3, -2, -1, 1, 2, 3], random);
    return { kind: 'jam', A, B: [b1, b2, b3], names: ['x', 'y', 'z'], sol: [0, 0, 0], verdict, det: 0, assist: 0 };
  }
}

export function buildRounds(level: number, random: () => number): Round[] {
  let rs: Round[];
  if (level === 4) rs = shuffle([1, 2, 3] as Verdict[], random).map((v) => jam(v, random));
  else {
    const kind = (['two', 'three', 'bill'] as const)[level - 1];
    rs = [solvable(kind, random), solvable(kind, random), solvable(kind, random)];
    for (let i = 1; i < 3; i++) for (let t = 0; t < 10 && rs.slice(0, i).some((o) => o.sol.join() === rs[i].sol.join() && o.A.join() === rs[i].A.join()); t++) rs[i] = solvable(kind, random);
  }
  return rs.map((r, k) => ({ ...r, assist: aid(k) }));
}

/** The setting of the dials is {x, y, z} for levels 1 to 3 and {d, m} for level 4. */
export function judge(r: Round, v: Record<string, number>): boolean {
  if (r.kind === 'jam') return v.d === r.det && v.m === r.verdict;
  return r.sol.every((s, i) => v['xyz'[i]] === s);
}

/** After a miss: what the vault did, never the code. */
export function missText(r: Round, v: Record<string, number>): string {
  if (r.kind === 'jam') {
    if (v.d !== r.det) return 'The vault computes |A| from its own plates and compared it with your reading: they disagreed, so the door stayed shut.';
    return 'The door’s sensors compared your verdict with how the plates actually behave, and they disagreed: the alarm sounded.';
  }
  const ok = plateOk(r, r.sol.map((_, i) => v['xyz'[i]]));
  const stuck = ok.map((o, i) => (o ? null : i + 1)).filter((x): x is number => x !== null);
  return `The tumblers turned, but plate${stuck.length > 1 ? 's' : ''} ${stuck.join(' and ')} stayed locked, so the door did not open.`;
}
export function spotText(r: Round, v: Record<string, number>): string {
  if (r.kind === 'jam') return `Plate check: |A| is ${v.d === r.det ? 'the value you dialled' : 'not the value you dialled'}.`;
  const ok = plateOk(r, r.sol.map((_, i) => v['xyz'[i]]));
  return `Plate check: ${ok.map((o, i) => `plate ${i + 1} ${o ? '✓ open' : '✗ locked'}`).join(', ')}.`;
}

const matRows = (M: number[][]) => M.map((row) => row.map(num).join(' ')).join('; ');
/** After a hit: the working. */
export function explain(r: Round): string {
  if (r.kind === 'jam') {
    const adjB = mulVec(adj(r.A), r.B);
    if (r.verdict === 1) return `|A| = ${num(r.det)} ≠ 0, so A is non-singular and AX = B has exactly one solution, X = A⁻¹B.`;
    const w = `|A| = 0, so A is singular and (adj A)B = (${adjB.map(num).join(', ')}).`;
    return r.verdict === 3 ? `${w} It is the zero vector, so the plates are consistent and there are many codes.` : `${w} It is not the zero vector, so the plates are inconsistent: no code.`;
  }
  const d = r.det;
  const a = adj(r.A);
  const how = r.A.length === 2 ? `adj A = [${matRows(a)}]` : 'adj A = the transpose of the matrix of cofactors';
  return `|A| = ${num(d)} ≠ 0, so A⁻¹ = adj A/|A| exists (${how}). X = A⁻¹B = (1/${num(d)})(${mulVec(a, r.B).map(num).join(', ')}) = (${r.sol.join(', ')}).`;
}

export const intel = (r: Round): string => {
  if (r.kind === 'jam') return `Three plates: ${r.A.map((_, i) => plateText(r, i)).join('; ')}. Dial |A|, then declare how many codes the vault has.`;
  if (r.kind === 'bill') return `Three shoppers paid for baskets: ${r.A.map((_, i) => `${plateText(r, i).replace(' = ', ' = ₹')}`).join('; ')}. Dial the price of one unit of each.`;
  return `Plates: ${r.A.map((_, i) => plateText(r, i)).join('; ')}. Dial the tumblers.`;
};
