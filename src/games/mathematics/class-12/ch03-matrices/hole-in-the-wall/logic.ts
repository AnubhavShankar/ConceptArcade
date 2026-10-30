// Pure rules of Hole in the Wall: no DOM, no canvas. Blocky's outline is a matrix of vertices (one column per vertex); the wall's hole is
// another matrix. The player sets the unknown entries of the machine so that its output matrix equals the hole exactly.
import { aid } from '@core/dialgame';
import { num, piText } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Mat = number[][];
export type Kind = 'equal' | 'product' | 'rotate' | 'order' | 'identity';
/** An entry cx·x + cy·y + c0. */
export type Form = [number, number, number];
export interface Round {
  kind: Kind;
  /** equal: Blocky's outline, each entry a form in x and y. */
  forms?: Form[][];
  /** product: the machine; null cells are the unknowns a (row 1) and b (row 2). */
  A?: (number | null)[][];
  /** The pose Blocky starts in (product, rotate, order). */
  P?: Mat;
  /** order: the two machines. */
  S?: Mat;
  T?: Mat;
  /** identity: the machine A that carved the hole twice (A²P). */
  M?: Mat;
  /** The hole in the wall. */
  H: Mat;
  /** The winning setting of every dial of the level. */
  ans: Record<string, number>;
  assist: 0 | 1 | 2;
}

export const DIALS: Record<Kind, { key: string; label: string; min: number; max: number; start: number }[]> = {
  equal: [{ key: 'x', label: 'x', min: 0, max: 9, start: 0 }, { key: 'y', label: 'y', min: 0, max: 9, start: 0 }],
  product: [{ key: 'a', label: 'a', min: -3, max: 9, start: 0 }, { key: 'b', label: 'b', min: -3, max: 9, start: 0 }],
  rotate: [{ key: 'k', label: 'Turn α', min: -11, max: 12, start: 0 }],
  order: [{ key: 'k', label: 'Shear k', min: 0, max: 8, start: 0 }, { key: 'o', label: 'Order', min: 1, max: 2, start: 1 }],
  identity: [{ key: 'k', label: 'k', min: -6, max: 9, start: 0 }, { key: 'm', label: 'm', min: -6, max: 12, start: 0 }],
};
export const KINDS: Kind[] = ['equal', 'product', 'rotate', 'order', 'identity'];

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));

export function mul(A: Mat, B: Mat): Mat {
  return A.map((row) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
}
const same = (A: Mat, B: Mat) => A.length === B.length && A.every((row, i) => row.every((v, j) => Math.abs(v - B[i][j]) < 1e-9));
export const rot = (k: number): Mat => {
  const a = (k * Math.PI) / 12;
  return [[Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)]];
};
const evalForm = (f: Form, x: number, y: number) => f[0] * x + f[1] * y + f[2];

/** Blocky's output matrix at the given dial values. */
export function outline(r: Round, v: Record<string, number>): Mat {
  switch (r.kind) {
    case 'equal':
      return r.forms!.map((row) => row.map((f) => evalForm(f, v.x, v.y)));
    case 'product': {
      const A = r.A!.map((row, i) => row.map((c) => (c === null ? (i === 0 ? v.a : v.b) : c)));
      return mul(A, r.P!);
    }
    case 'rotate':
      return mul(rot(v.k), r.P!);
    case 'order': {
      const S: Mat = [[1, v.k], [0, 1]];
      return v.o === 1 ? mul(r.T!, mul(S, r.P!)) : mul(S, mul(r.T!, r.P!));
    }
    case 'identity': {
      const M = r.M!;
      return mul([[v.k * M[0][0] - v.m, v.k * M[0][1]], [v.k * M[1][0], v.k * M[1][1] - v.m]], r.P!);
    }
  }
}
export const judge = (r: Round, v: Record<string, number>) => same(outline(r, v), r.H);

/** An entry such as x + y − 2, 2y − 1 or 5. */
export function formText(f: Form): string {
  const parts: string[] = [];
  const add = (c: number, name: string) => {
    if (c === 0) return;
    const mag = name === '' ? String(Math.abs(c)) : Math.abs(c) === 1 ? name : `${Math.abs(c)}${name}`;
    parts.push(parts.length === 0 ? `${c < 0 ? '−' : ''}${mag}` : `${c < 0 ? '−' : '+'} ${mag}`);
  };
  add(f[0], 'x');
  add(f[1], 'y');
  add(f[2], '');
  return parts.length === 0 ? '0' : parts.join(' ');
}

const SURDS: [number, string][] = [[2, '2'], [Math.sqrt(3), '√3'], [Math.SQRT2, '√2'], [1, '1'], [0, '0'], [-1, '−1'], [-Math.SQRT2, '−√2'], [-Math.sqrt(3), '−√3'], [-2, '−2']];
/** A number that is 0, ±1, ±2, ±√2 or ±√3 written exactly; anything else as a decimal. */
export const surdText = (x: number) => SURDS.find(([v]) => Math.abs(v - x) < 1e-9)?.[1] ?? num(x);

export function matText(M: Mat, r?: Round): string {
  const f = r?.kind === 'rotate' ? surdText : num;
  return `[ ${M.map((row) => row.map(f).join('  ')).join(' ; ')} ]`;
}
export function machineText(r: Round): string {
  switch (r.kind) {
    case 'equal':
      return `Outline [ ${r.forms!.map((row) => row.map(formText).join('  |  ')).join(' ; ')} ]`;
    case 'product':
      return `Machine A = [ ${r.A!.map((row, i) => row.map((c) => (c === null ? (i === 0 ? 'a' : 'b') : num(c))).join('  ')).join(' ; ')} ], pose P = ${matText(r.P!)}`;
    case 'rotate':
      return `Machine A = [ cos α  −sin α ; sin α  cos α ], pose P = ${matText(r.P!)}`;
    case 'order':
      return `Shear A = [ 1  k ; 0  1 ], gate B = ${matText(r.T!)}, pose P = ${matText(r.P!)}. Order 1 sends Blocky through A then B (BAP); order 2 through B then A (ABP)`;
    case 'identity':
      return `Machine A = ${matText(r.M!)}, pose P = ${matText(r.P!)}. The hole was carved by A twice (A²P). The express machine is kA − mI: set k and m so one pass carves the same hole`;
  }
}

function equalRound(random: () => number): Round {
  const xs = ri(1, 6, random);
  const ys = ri(1, 6, random);
  const a = pick([1, 2, 3], random);
  const forms: Form[][] = [
    [[1, 0, pick([-2, 0, 1, 2], random)], [0, a, -pick([0, 1, 2], random)], [0, 0, ri(1, 5, random)]],
    [[1, 1, pick([-2, 0, 1], random)], pick([[1, -1, 0], [2, -1, 0], [1, 2, -2]] as Form[], random), [0, 0, ri(1, 5, random)]],
  ];
  const H = forms.map((row) => row.map((f) => evalForm(f, xs, ys)));
  return { kind: 'equal', forms, H, ans: { x: xs, y: ys }, assist: 0 };
}
function productRound(random: () => number): Round {
  const P: Mat = pick([[[1, 2], [1, 3]], [[2, 1], [3, 2]], [[1, 1], [2, 3]], [[3, 1], [2, 1]]] as Mat[], random);
  const a = ri(1, 6, random);
  const b = ri(1, 6, random);
  const A: (number | null)[][] = [[null, null], [null, null]];
  const solved: Mat = [[0, 0], [0, 0]];
  [a, b].forEach((unknown, i) => {
    const c = ri(0, 1, random);
    const known = ri(1, 4, random);
    A[i][1 - c] = known;
    solved[i][c] = unknown;
    solved[i][1 - c] = known;
  });
  return { kind: 'product', A, P, H: mul(solved, P), ans: { a, b }, assist: 0 };
}
function rotateRound(random: () => number): Round {
  const k = pick([-9, -8, -6, -4, -3, -2, 2, 3, 4, 6, 8, 9, 10], random);
  const P: Mat = [[2, 0, 0], [0, 2, 0]];
  return { kind: 'rotate', P, H: mul(rot(k), P), ans: { k }, assist: 0 };
}
/** The gates B that do not commute with a shear: a quarter turn, a swap, a flip, a lower shear and two stretches. */
export const GATES: Mat[] = [[[0, -1], [1, 0]], [[0, 1], [1, 0]], [[1, 0], [0, -1]], [[1, 0], [1, 1]], [[2, 0], [0, 1]], [[1, 0], [0, 2]]];
const POSES: Mat[] = [[[1, 2], [1, 1]], [[2, 1], [1, 1]], [[1, 1], [2, 1]]];
const orderOut = (T: Mat, P: Mat, k: number, o: number): Mat => (o === 1 ? mul(T, mul([[1, k], [0, 1]], P)) : mul([[1, k], [0, 1]], mul(T, P)));
function orderRound(random: () => number): Round {
  for (;;) {
    const T: Mat = pick(GATES, random);
    const P: Mat = pick(POSES, random);
    const k = ri(1, 6, random);
    const o = ri(1, 2, random);
    const H = orderOut(T, P, k, o);
    // exactly one (shear, order) pair over the whole dial gives this hole (a gate and pose can make two different settings coincide)
    let wins = 0;
    for (let kk = DIALS.order[0].min; kk <= DIALS.order[0].max; kk++) for (const oo of [1, 2]) if (same(orderOut(T, P, kk, oo), H)) wins++;
    if (wins === 1) return { kind: 'order', P, T, H, ans: { k, o }, assist: 0 };
  }
}

const ID_EASY: Mat[] = [[[2, 1], [1, 2]], [[2, 1], [3, 1]], [[3, 2], [1, 1]], [[2, 3], [1, 2]]];
const ID_MID: Mat[] = [[[2, -1], [1, 3]], [[1, -2], [1, 2]], [[1, 2], [-1, 3]], [[2, -3], [1, -1]], [[0, 1], [-1, 0]]];
const ID_BOSS: Mat[] = [[[3, 1], [-1, 2]], [[3, -2], [4, -2]], [[3, 2], [-2, 1]]]; // Misc Q5, Ex 3.2 Q17, one more
/** The hole is A²P; the one pair (k, m) with (kA − mI)P = A²P is k = tr A, m = det A. Round i takes its machine from a pool of growing difficulty. */
function identityRound(i: number, random: () => number): Round {
  const M = pick(i === 0 ? ID_EASY : i === 1 ? ID_MID : ID_BOSS, random);
  const P: Mat = [[1, 2], [1, 3]];
  return { kind: 'identity', M, P, H: mul(mul(M, M), P), ans: { k: M[0][0] + M[1][1], m: M[0][0] * M[1][1] - M[0][1] * M[1][0] }, assist: 0 };
}

export function buildRounds(level: number, random: () => number): Round[] {
  const kind = KINDS[level - 1];
  const out: Round[] = [];
  const make: (random: () => number) => Round =
    kind === 'identity' ? (rnd) => identityRound(out.length, rnd) : { equal: equalRound, product: productRound, rotate: rotateRound, order: orderRound }[kind];
  for (let i = 0; i < 3; i++) {
    let r = make(random);
    // distinct holes within a level
    for (let t = 0; t < 8 && out.some((o) => same(o.H, r.H)); t++) r = make(random);
    out.push({ ...r, assist: aid(i) });
  }
  return out;
}

/** Which vertex of Blocky lands in the wrong place first (1-based), with where it landed. */
export function firstMismatch(r: Round, v: Record<string, number>): { vertex: number; at: [number, number] } | null {
  const M = outline(r, v);
  for (let c = 0; c < M[0].length; c++) {
    if (Math.abs(M[0][c] - r.H[0][c]) > 1e-9 || Math.abs(M[1][c] - r.H[1][c]) > 1e-9) return { vertex: c + 1, at: [M[0][c], M[1][c]] };
  }
  return null;
}
const at = (p: [number, number], r: Round) => `(${[surdText, surdText].map((f, i) => (r.kind === 'rotate' ? f(p[i]) : num(p[i]))).join(', ')})`;
/** After a miss: what happened to Blocky, never the setting that fits. Level 5 keeps its reviewed text. Levels 1 to 4 print no coordinates: round 1 (live helper) names the first vertex that jammed, rounds 2 and 3 say only that a corner missed (naming the vertex would be part of the paid test slide). */
export function missText(r: Round, v: Record<string, number>): string {
  const m = firstMismatch(r, v);
  if (!m) return 'Blocky did not fit.';
  if (r.kind === 'identity') return `Blocky went through the machine and vertex ${m.vertex} came out at ${at(m.at, r)}, but the hole’s corner is not there: he jammed in the wall.`;
  if (r.assist > 0) return 'Blocky jammed in the wall: at least one corner landed outside the hole. Use a test slide, or redo the multiplication, and compare each corner with the hole.';
  return `Vertex ${m.vertex} landed outside the hole, so Blocky jammed in the wall. Compare that corner of your outline with the hole’s corner.`;
}
export function spotText(r: Round, v: Record<string, number>): string {
  return `Test slide: Blocky’s outline would come out as ${matText(outline(r, v), r)}.`;
}

/** After a hit: the working. */
export function explain(r: Round): string {
  switch (r.kind) {
    case 'equal': {
      const [e11, e12] = [r.forms![0][0], r.forms![0][1]];
      return `Equal matrices have equal entries. ${formText(e11)} = ${num(r.H[0][0])} gives x = ${r.ans.x}; ${formText(e12)} = ${num(r.H[0][1])} gives y = ${r.ans.y}. The other entries then agree.`;
    }
    case 'product': {
      const lines = [0, 1].map((i) => {
        const row = r.A![i];
        const c = row.indexOf(null);
        const other = row[1 - c] as number;
        const letter = i === 0 ? 'a' : 'b';
        const [p0, p1] = [r.P![0][0], r.P![1][0]];
        const lhs = c === 0 ? `${letter}·${p0} + ${other}·${p1}` : `${other}·${p0} + ${letter}·${p1}`;
        return `Row ${i + 1} of A times column 1 of P: ${lhs} = ${num(r.H[i][0])}, so ${letter} = ${r.ans[letter]}`;
      });
      return `${lines.join('; ')}. Then every entry of A·P matches the hole.`;
    }
    case 'rotate': {
      return `A·(2, 0)ᵀ = (2cos α, 2sin α) = (${surdText(r.H[0][0])}, ${surdText(r.H[1][0])}), so cos α = ${surdText(r.H[0][0] / 2)} over 1 and α = ${piText(r.ans.k)} (a turn of ${r.ans.k * 15}°).`;
    }
    case 'order':
      return `Matrix products depend on the order: with A = [1 ${r.ans.k}; 0 1], ${r.ans.o === 1 ? 'B·A·P' : 'A·B·P'} fits the hole, and the other order does not, because AB ≠ BA.`;
    case 'identity': {
      const M = r.M!;
      const S = mul(M, M);
      const { k, m } = r.ans;
      const rule = m < 0 ? `A² = ${k}A + ${-m}I, that is A² − ${k}A − ${-m}I = O` : `A² = ${k}A − ${m}I, that is A² − ${k}A + ${m}I = O`;
      return `A² = ${matText(S)}. Match kA − mI to it: the top-right entry gives ${num(M[0][1])}k = ${num(S[0][1])}, so k = ${k}; then the top-left entry gives ${num(M[0][0])}k − m = ${num(S[0][0])}, so m = ${num(m)}. So ${rule}.`;
    }
  }
}
export const intel = (r: Round) => `${machineText(r)}. The hole is ${matText(r.H, r)}.`;
