// Pure rules of Track Joiner: no DOM, no canvas. A stunt track is made of pieces p·x² + q·x + r joined at whole-number x values. The player
// sets the unknown constants so the cart can cross every join: no gap (continuous) and, at level 3, no corner (differentiable).
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'gap' | 'two' | 'smooth';
export interface Piece {
  p: number;
  q: number;
  r: number;
}
export interface Round {
  kind: Kind;
  /** Joins, left to right. */
  joins: number[];
  /** The pieces, left to right; null marks the piece that depends on the dials. */
  pieces: (Piece | null)[];
  /** The winning setting of every dial. */
  ans: Record<string, number>;
  /** gap: the known constant m in the unknown piece kx + m. */
  m0: number;
  assist: 0 | 1 | 2;
}

export const DIALS: Record<Kind, { key: string; label: string; min: number; max: number; start: number }[]> = {
  gap: [{ key: 'k', label: 'k', min: -5, max: 9, start: 0 }],
  two: [{ key: 'a', label: 'a', min: -6, max: 8, start: 0 }, { key: 'b', label: 'b', min: -10, max: 12, start: 0 }],
  smooth: [{ key: 'k', label: 'k', min: -10, max: 16, start: 0 }, { key: 'm', label: 'm', min: -30, max: 30, start: 0 }],
};
export const KINDS: Kind[] = ['gap', 'two', 'smooth'];
export const X_END = 6;

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
const val = (q: Piece, x: number) => q.p * x * x + q.q * x + q.r;
const slope = (q: Piece, x: number) => 2 * q.p * x + q.q;

/** The unknown piece for given dial values. */
export function filled(r: Round, v: Record<string, number>): Piece[] {
  return r.pieces.map((pc) => pc ?? (r.kind === 'two' ? { p: 0, q: v.a, r: v.b } : { p: 0, q: v.k, r: r.kind === 'smooth' ? v.m : r.m0 }));
}

export function buildRounds(level: number, random: () => number): Round[] {
  const kind = KINDS[level - 1];
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    let r: Round;
    do r = kind === 'gap' ? gapRound(random) : kind === 'two' ? twoRound(random) : smoothRound(random);
    while (out.some((o) => JSON.stringify(o.ans) === JSON.stringify(r.ans) && JSON.stringify(o.joins) === JSON.stringify(r.joins)));
    out.push({ ...r, assist: aid(i) });
  }
  return out;
}

function gapRound(random: () => number): Round {
  const c = ri(1, 3, random);
  const k = ri(2, 6, random);
  const m = ri(-3, 3, random);
  const p = pick([0, 1, 2], random);
  const s = p === 0 ? ri(1, 3, random) : 0;
  // left(c) must equal k·c + m
  const left: Piece = { p, q: s, r: k * c + m - p * c * c - s * c };
  return { kind: 'gap', joins: [c], pieces: [left, null], ans: { k }, m0: m, assist: 0 };
}
function twoRound(random: () => number): Round {
  const c1 = ri(1, 2, random);
  const c2 = c1 + ri(1, 2, random);
  const a = pick([-3, -2, -1, 1, 2, 3, 4], random);
  const b = ri(-4, 6, random);
  const s1 = ri(-2, 3, random);
  const s3 = ri(-2, 3, random);
  const left: Piece = { p: 0, q: s1, r: a * c1 + b - s1 * c1 };
  const right: Piece = { p: 0, q: s3, r: a * c2 + b - s3 * c2 };
  return { kind: 'two', joins: [c1, c2], pieces: [left, null, right], ans: { a, b }, m0: 0, assist: 0 };
}
function smoothRound(random: () => number): Round {
  const c = ri(1, 3, random);
  const p = pick([1, 2], random);
  const q0 = ri(-2, 2, random);
  const r0 = ri(-3, 3, random);
  const left: Piece = { p, q: q0, r: r0 };
  const k = slope(left, c);
  const m = val(left, c) - k * c;
  return { kind: 'smooth', joins: [c], pieces: [left, null], ans: { k, m }, m0: 0, assist: 0 };
}

/** The first join where the cart cannot cross, and why, or null when it can cross all of them. */
export function firstFault(r: Round, v: Record<string, number>): { x: number; kind: 'gap' | 'corner'; before: number; after: number } | null {
  const ps = filled(r, v);
  for (let i = 0; i < r.joins.length; i++) {
    const c = r.joins[i];
    const [l, rr] = [ps[i], ps[i + 1]];
    if (val(l, c) !== val(rr, c)) return { x: c, kind: 'gap', before: val(l, c), after: val(rr, c) };
    if (r.kind === 'smooth' && slope(l, c) !== slope(rr, c)) return { x: c, kind: 'corner', before: slope(l, c), after: slope(rr, c) };
  }
  return null;
}
export const judge = (r: Round, v: Record<string, number>) => firstFault(r, v) === null;

const term = (c: number, s: string, first: boolean) => {
  if (c === 0) return '';
  const mag = s === '' ? String(Math.abs(c)) : Math.abs(c) === 1 ? s : `${Math.abs(c)}${s}`;
  return first ? `${c < 0 ? '−' : ''}${mag}` : ` ${c < 0 ? '−' : '+'} ${mag}`;
};
export function pieceText(q: Piece): string {
  const s = term(q.p, 'x²', true) + term(q.q, 'x', q.p === 0) + term(q.r, '', q.p === 0 && q.q === 0);
  return s || '0';
}
const unknownText = (r: Round) => (r.kind === 'two' ? 'ax + b' : r.kind === 'gap' ? `kx${r.m0 === 0 ? '' : r.m0 < 0 ? ` − ${-r.m0}` : ` + ${r.m0}`}` : 'kx + m');
export function trackText(r: Round): string {
  const texts = r.pieces.map((pc) => (pc ? pieceText(pc) : unknownText(r)));
  const n = texts.length;
  const parts = texts.map((t, i) => {
    const cond = i === 0 ? `x < ${r.joins[0]}` : i === n - 1 ? `x ≥ ${r.joins[i - 1]}` : `${r.joins[i - 1]} ≤ x < ${r.joins[i]}`;
    return `${t} for ${cond}`;
  });
  return `f(x) = ${parts.join('; ')}`;
}

/** After a miss: where the cart came off the track, never the constants that fix it. */
export function missText(r: Round, v: Record<string, number>): string {
  const f = firstFault(r, v);
  if (!f) return 'The cart did not make it.';
  if (f.kind === 'gap') return `At x = ${f.x} the track broke: one piece ends at height ${num(f.before)} and the next starts at ${num(f.after)}, so the cart fell into the gap.`;
  return `At x = ${f.x} the track bent sharply: the slope jumped from ${num(f.before)} to ${num(f.after)}, so the cart hit the corner and flipped.`;
}
export function spotText(r: Round, v: Record<string, number>): string {
  const f = firstFault(r, v);
  if (!f) return 'Test ride: the cart crosses every join on these settings.';
  return f.kind === 'gap' ? `Test ride: at x = ${f.x}, the left limit is ${num(f.before)} and the right limit is ${num(f.after)}.` : `Test ride: at x = ${f.x}, the left slope is ${num(f.before)} and the right slope is ${num(f.after)}.`;
}

/** After a hit: the working. */
export function explain(r: Round): string {
  const [c] = r.joins;
  if (r.kind === 'gap') {
    const L = val(r.pieces[0]!, c);
    return `Continuity at x = ${c}: the left limit is ${L}, so the right piece must also give ${L}: ${r.ans.k}·${c} ${r.m0 < 0 ? '−' : '+'} ${Math.abs(r.m0)} = ${L}, which gives k = ${r.ans.k}.`;
  }
  if (r.kind === 'two') {
    const [c1, c2] = r.joins;
    const V1 = val(r.pieces[0]!, c1);
    const V2 = val(r.pieces[2]!, c2);
    return `Continuity at x = ${c1}: ${c1}a + b = ${V1}. At x = ${c2}: ${c2}a + b = ${V2}. Subtracting gives a = ${r.ans.a}, then b = ${r.ans.b}.`;
  }
  const left = r.pieces[0]!;
  return `Differentiable at x = ${c}: the slopes match, ${2 * left.p * c + left.q} = k, so k = ${r.ans.k}; and the values match, ${val(left, c)} = ${r.ans.k}·${c} + m, so m = ${r.ans.m}.`;
}
export const intel = (r: Round) => `${trackText(r)}. The finish flag is at x = ${X_END}.`;
