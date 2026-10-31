// Pure rules of Card Sharp: no DOM, no canvas. Ace the stage magician deals from a small deck of 24 cards (4 suits, ranks A to 6). Level 1: P(A | B) by counting in
// the reduced sample space: tap every card that fits B, then tap again the ones that also fit A. Level 2: independent events, set the unknown chance so that
// P(A ∩ B) = P(A)·P(B). Level 3: two cards drawn without replacement, set the number of red cards for a given chance.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';

export type Kind = 'board' | 'indep' | 'draw';
export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6'];
export const CARDS = SUITS.length * RANKS.length;
export interface Round {
  kind: Kind;
  /** board: the condition B and the event A as words, and the whole target board (0 not in B, 1 in B only, 2 in both). */
  textB: string;
  textA: string;
  target: number[];
  /** indep: P(A) = a/12 shown reduced, P(A ∩ B) shown reduced, and the winning k with P(B) = k/12. draw: the deck size N and the wanted chance. */
  a: number;
  N: number;
  /** The winning setting, the dial range and the start. */
  ans: number;
  min: number;
  max: number;
  start: number;
  /** draw: how the chance is described. */
  mode: 'both' | 'atleast';
  assist: 0 | 1 | 2;
  /** Level 4 board only: the compound event (not A, A or C, neither) and its counts on the reduced deck: n = cards of B, a = of A and B, c = of C and B, ac = of A, C and B. */
  ev?: { kind: 'not' | 'or' | 'neither'; n: number; a: number; c: number; ac: number };
}

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const frac = (a: number, b: number) => (a === 0 ? '0' : `${a / gcd(a, b)}/${b / gcd(a, b)}`);

interface Pred {
  text: string;
  family: string;
  test: (suit: number, rank: number) => boolean;
}
const PREDS: Pred[] = [
  { text: 'a red card', family: 'colour', test: (s) => s === 1 || s === 2 },
  { text: 'a black card', family: 'colour', test: (s) => s === 0 || s === 3 },
  { text: 'a spade', family: 'suit', test: (s) => s === 0 },
  { text: 'a heart', family: 'suit', test: (s) => s === 1 },
  { text: 'an even rank (2, 4 or 6)', family: 'parity', test: (_s, r) => r % 2 === 0 },
  { text: 'an odd rank (A, 3 or 5)', family: 'parity', test: (_s, r) => r % 2 === 1 },
  { text: 'a rank of 4 or more', family: 'size', test: (_s, r) => r >= 4 },
  { text: 'a rank of 3 or less', family: 'size', test: (_s, r) => r <= 3 },
  { text: 'a prime rank (2, 3 or 5)', family: 'prime', test: (_s, r) => r === 2 || r === 3 || r === 5 },
];
/** The cards in the order row by row: suit s, rank r (1 to 6) is index s·6 + r − 1. */
export const cardIndex = (s: number, r: number) => s * RANKS.length + (r - 1);
const members = (p: Pred) => Array.from({ length: CARDS }, (_, i) => p.test(Math.floor(i / RANKS.length), (i % RANKS.length) + 1));

const blank = { textB: '', textA: '', target: [] as number[], a: 0, N: 0, ans: 0, min: 0, max: 0, start: 0, mode: 'both' as const, assist: 0 as const };

function board(random: () => number): Round {
  for (;;) {
    const pb = pick(PREDS, random);
    const pa = pick(PREDS, random);
    if (pa.family === pb.family) continue;
    const B = members(pb);
    const A = members(pa);
    const p = B.filter(Boolean).length;
    const f = B.filter((x, i) => x && A[i]).length;
    if (p < 6 || p > 16 || f < 1 || f >= p) continue;
    return { ...blank, kind: 'board', textB: pb.text, textA: pa.text, target: B.map((x, i) => (!x ? 0 : A[i] ? 2 : 1)) };
  }
}
/** Level 4: the same tap board, with a compound event on the reduced deck: not A, A or C, neither A nor C. */
function compound(kind: 'not' | 'or' | 'neither', random: () => number): Round {
  for (;;) {
    const pb = pick(PREDS, random);
    const pa = pick(PREDS, random);
    const pc = kind === 'not' ? pa : pick(PREDS, random);
    const fam = new Set([pb.family, pa.family, pc.family]);
    if (fam.size < (kind === 'not' ? 2 : 3)) continue;
    const B = members(pb);
    const A = members(pa);
    const C = members(pc);
    const n = B.filter(Boolean).length;
    const a = B.filter((x, i) => x && A[i]).length;
    const c = kind === 'not' ? 0 : B.filter((x, i) => x && C[i]).length;
    const ac = kind === 'not' ? 0 : B.filter((x, i) => x && A[i] && C[i]).length;
    const holds = (i: number) => (kind === 'not' ? !A[i] : kind === 'or' ? A[i] || C[i] : !(A[i] || C[i]));
    const k = B.filter((x, i) => x && holds(i)).length;
    // 6 to 16 cards in B; the event holds for some card of B and fails for another; for a union, an overlap to take off once, and each of A and C
    // reaching cards the other does not (so the union is neither A alone nor C alone)
    if (n < 6 || n > 16 || k < 1 || k >= n || (kind !== 'not' && (ac < 1 || a <= ac || c <= ac))) continue;
    const textA = kind === 'not' ? `not ${pa.text}` : kind === 'or' ? `${pa.text} or ${pc.text}` : `neither ${pa.text} nor ${pc.text}`;
    return { ...blank, kind: 'board', textB: pb.text, textA, target: B.map((x, i) => (!x ? 0 : holds(i) ? 2 : 1)), ev: { kind, n, a, c, ac } };
  }
}
function indep(random: () => number): Round {
  const a = pick([2, 3, 4, 6, 8, 9], random);
  const k = ri(2, 10, random);
  return { ...blank, kind: 'indep', a, ans: k, min: 0, max: 12, start: 0 };
}
export const pOf = (r: Round, k: number) => (r.a * k) / 144;
function draw(mode: 'both' | 'atleast', random: () => number): Round {
  for (;;) {
    const N = pick([8, 10, 12], random);
    const red = ri(3, N - 2, random);
    const r: Round = { ...blank, kind: 'draw', N, ans: red, min: 0, max: N, start: 0, mode };
    if (drawChance(r, red)[0] === 0) continue;
    return r;
  }
}
/** The chance as [numerator, denominator] for r red cards in the deck. */
export function drawChance(r: Round, red: number): [number, number] {
  const d = r.N * (r.N - 1);
  if (r.mode === 'both') return [red * (red - 1), d];
  const black = r.N - red;
  return [d - black * (black - 1), d];
}

export function buildRounds(level: number, random: () => number): Round[] {
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    const mk = () => (level === 4 ? compound((['not', 'or', 'neither'] as const)[i], random) : level === 1 ? board(random) : level === 2 ? indep(random) : draw(i === 2 ? 'atleast' : 'both', random));
    let r = mk();
    for (let t = 0; t < 60 && out.some((o) => o.textB + o.textA + o.a + o.N === r.textB + r.textA + r.a + r.N && o.ans === r.ans); t++) r = mk();
    out.push({ ...r, start: r.ans === 0 ? 1 : 0, assist: aid(i) });
  }
  return out;
}

/** Board: every card must be in the right state. Others: the dial must equal the answer. */
export const judgeBoard = (r: Round, state: number[]) => r.target.every((x, i) => x === state[i]);
export const judge = (r: Round, v: number) => v === r.ans;
/** The counts a board of states shows: the cards in B and the cards in both. */
export const counts = (state: number[]) => [state.filter((x) => x > 0).length, state.filter((x) => x === 2).length] as const;

const wantChance = (r: Round) => {
  const [n, d] = drawChance(r, r.ans);
  return frac(n, d);
};

export function intel(r: Round): string {
  if (r.kind === 'board' && r.ev) return `A card is drawn and it is ${r.textB}. What is the chance it is also in the event “${r.textA}”? Tap each card that fits B once (yellow), and tap again the cards that also fit the event (green). The chance is then green cards out of marked cards.`;
  if (r.kind === 'board') return `A card is drawn and it is ${r.textB}. What is the chance it is also ${r.textA}? Tap each card that fits B once (yellow), and tap again the cards that also fit A (green). The chance is then green cards out of marked cards.`;
  if (r.kind === 'indep') return `P(A) = ${frac(r.a, 12)} and P(A ∩ B) = ${frac(r.a * r.ans, 144)}, and A and B are independent. P(B) is k/12. Set k.`;
  return `A deck of ${r.N} cards has some red cards. Two cards are drawn without replacement. The chance that ${r.mode === 'both' ? 'both are red' : 'at least one is red'} is ${wantChance(r)}. Set the number of red cards.`;
}

/** A test, never the right setting. */
export function spotText(r: Round, v: number, state: number[] = []): string {
  if (r.kind === 'board') {
    const [p, f] = counts(state);
    return p === 0 ? 'Check: no cards are marked yet.' : `Check: ${f} green out of ${p} marked is ${frac(f, p)}.`;
  }
  if (r.kind === 'indep') return `Check: with P(B) = ${frac(v, 12)}, P(A)·P(B) = ${frac(r.a * v, 144)}.`;
  const [n, d] = drawChance(r, v);
  return `Check: with ${v} red cards the chance is ${frac(n, d)}.`;
}
/** After a miss. Level 1 (the plain board) says only that a mark is wrong: counts of missing, extra or wrongly coloured cards would let a board of all-yellow
 * cards print |B| and |A ∩ B|. Level 4 keeps its reviewed text. Levels 2 and 3 give the direction only: the product or the chance at the player's own value is the paid check. */
export function missText(r: Round, v: number, state: number[] = []): string {
  if (r.kind === 'board' && !r.ev) return 'The dealer checked the table and at least one card is marked wrong. Re-read B, mark every card that fits it once, then mark again only the cards that also fit A.';
  // Level 4: round 1 (live count) may describe the fault; rounds 2 and 3 get one generic text, so an all-yellow board cannot read |B| off it.
  if (r.kind === 'board' && r.assist > 0) return 'The dealer checked the table and at least one card is marked wrong. Re-read B, mark every card that fits it once, then mark again only the cards that also fit the event.';
  if (r.kind === 'board') {
    const missing = r.target.filter((x, i) => x > 0 && state[i] === 0).length;
    const extra = state.filter((x, i) => x > 0 && r.target[i] === 0).length;
    const wrongLevel = state.filter((x, i) => x > 0 && r.target[i] > 0 && x !== r.target[i]).length;
    const bits: string[] = [];
    if (missing) bits.push(`${missing} card${missing === 1 ? '' : 's'} that fit B ${missing === 1 ? 'was' : 'were'} left out`);
    if (extra) bits.push(`${extra} marked card${extra === 1 ? '' : 's'} do${extra === 1 ? 'es' : ''} not fit B at all`);
    if (wrongLevel) bits.push(`${wrongLevel} card${wrongLevel === 1 ? ' is' : 's are'} in B but marked the wrong colour for ${r.ev ? 'the event' : 'A'}`);
    return `The dealer checked the table: ${bits.join('; ') || 'the marks do not match'}.`;
  }
  if (r.kind === 'indep') return `With that P(B) the product P(A)·P(B) comes out ${v > r.ans ? 'more' : 'less'} than P(A ∩ B), so A and B are not independent. Set ${v > r.ans ? 'a smaller' : 'a larger'} k.`;
  return `With that many red cards the chance of the draw comes out ${v > r.ans ? 'more' : 'less'} than the chance stated. Set ${v > r.ans ? 'fewer' : 'more'} red cards.`;
}
/** After a hit. */
export function explain(r: Round): string {
  if (r.kind === 'board' && r.ev) {
    const { kind, n, a, c, ac } = r.ev;
    const u = a + c - ac;
    if (kind === 'not') return `P(not A | B) = 1 − P(A | B) = 1 − ${frac(a, n)} = ${frac(n - a, n)}.`;
    if (kind === 'or') return `P(A ∪ C | B) = P(A | B) + P(C | B) − P(A ∩ C | B) = (${a} + ${c} − ${ac})/${n} = ${frac(u, n)}.`;
    return `P(neither | B) = 1 − P(A ∪ C | B) = 1 − ${frac(u, n)} = ${frac(n - u, n)}.`;
  }
  if (r.kind === 'board') {
    const [p, f] = counts(r.target);
    return `Given B, the sample space shrinks to the ${p} cards that fit it, and ${f} of them also fit A: P(A | B) = ${f}/${p} = ${frac(f, p)}.`;
  }
  if (r.kind === 'indep') return `Independent events: P(A ∩ B) = P(A)·P(B), so P(B) = (${frac(r.a * r.ans, 144)}) ÷ (${frac(r.a, 12)}) = ${frac(r.ans, 12)}, and k = ${r.ans}.`;
  return r.mode === 'both'
    ? `Without replacement: P(both red) = (${r.ans}/${r.N})·(${r.ans - 1}/${r.N - 1}) = ${wantChance(r)}.`
    : `P(at least one red) = 1 − P(both black) = 1 − (${r.N - r.ans}/${r.N})·(${r.N - r.ans - 1}/${r.N - 1}) = ${wantChance(r)}.`;
}
