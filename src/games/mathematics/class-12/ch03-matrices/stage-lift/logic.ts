// Pure rules of Stage Lift: no DOM, no canvas. A concert stage is a 2 × 2 or 2 × 3 grid of hydraulic pillars whose heights form a matrix. The player sets the
// unknown program on faders (one dial per unknown entry or letter); the stage computer builds the heights from the equation of the round, and the free-runner
// Kiko (and Jax on a second stage in level 3) jumps for the heights on her choreography card, so every pillar must match the card entry by entry.
import { aid, type Values } from '@core/dialgame';
import { num } from '@core/mathkit';
import { pick } from '@core/quiz';

export type Mat = number[][];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
const mat = (r: number, c: number, lo: number, hi: number, random: () => number): Mat => Array.from({ length: r }, () => Array.from({ length: c }, () => ri(lo, hi, random)));
const zip = (A: Mat, B: Mat, f: (a: number, b: number) => number): Mat => A.map((row, i) => row.map((v, j) => f(v, B[i][j])));
const scale = (k: number, A: Mat): Mat => A.map((row) => row.map((v) => k * v));
const flat = (M: Mat) => M.flat();
const nonzero = (M: Mat) => flat(M).filter((v) => v !== 0).length;
const negatives = (M: Mat) => flat(M).filter((v) => v < 0).length;
const inRange = (M: Mat) => flat(M).every((v) => v >= -8 && v <= 14);
export const sameMat = (A: Mat, B: Mat) => flat(A).every((v, i) => v === flat(B)[i]);
/** "[3 −1; 4 2]": rows separated by "; ", true minus signs. */
export const matText = (M: Mat) => `[${M.map((row) => row.map(num).join(' ')).join('; ')}]`;
const SUB = '₀₁₂₃₄₅₆₇₈₉';
/** "y₁₂": the name of entry (i, j) of matrix `name`, counting from 1. */
export const entryName = (name: string, i: number, j: number) => `${name}${SUB[i + 1]}${SUB[j + 1]}`;
/** "+ 3" or "− 3": a signed term for a sum. */
const plus = (n: number) => (n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`);
/** A number inside a sum or difference: negatives get brackets, "7 − (−3)". */
const br = (n: number) => (n < 0 ? `(${num(n)})` : num(n));

export type Kind = 'add' | 'sub' | 'gain2' | 'gain3' | 'gainBack' | 'pair1' | 'pair2' | 'pair3' | 'letters1' | 'letters2' | 'letters3' | 'rule';
export interface Round {
  kind: Kind;
  rows: 2;
  cols: 2 | 3;
  /** The dial keys in fader order, e.g. ['y11', 'y12', 'y21', 'y22'] or ['x11', …, 'y22'] or ['x', 'y', 'z', 't']. */
  keys: string[];
  /** The winning value of each key. */
  ans: Values;
  /** Known matrices shown in the equation (A, B as the kind needs). */
  known: Record<string, Mat>;
  /** Kiko's card (and Jax's card in level 3). */
  card: Mat;
  card2?: Mat;
  /** Level 5: the rule for the card's entries, as text (for example "|i − 3j|"). */
  rule?: string;
  assist: 0 | 1 | 2;
}

// ---- The heights (the stage computer) -----------------------------------------------------------------------------------------------------------------

/** The dial keys of an unknown matrix `name` with `cols` columns: x11, x12, x21, x22. */
export const matKeys = (name: string, cols: number) => [0, 1].flatMap((i) => Array.from({ length: cols }, (_, j) => `${name}${i + 1}${j + 1}`));
/** The unknown matrix `name` (2 × cols) read from the dial values. */
export const fromDials = (name: string, cols: number, v: Values): Mat => [0, 1].map((i) => Array.from({ length: cols }, (_, j) => v[`${name}${i + 1}${j + 1}`] ?? 0));
const answers = (name: string, M: Mat): Values => Object.fromEntries(M.flatMap((row, i) => row.map((x, j) => [`${name}${i + 1}${j + 1}`, x] as const)));

/** The pillar heights of Kiko's stage (and Jax's stage) for the dial values v. */
export function heights(r: Round, v: Values): { kiko: Mat; jax?: Mat } {
  const X = fromDials('x', r.cols, v);
  const Y = fromDials('y', r.cols, v);
  const { A, B } = r.known;
  const add = (P: Mat, Q: Mat) => zip(P, Q, (a, b) => a + b);
  const sub = (P: Mat, Q: Mat) => zip(P, Q, (a, b) => a - b);
  const [x, y, z, t] = ['x', 'y', 'z', 't'].map((k) => v[k] ?? 0);
  switch (r.kind) {
    case 'add': return { kiko: add(A, Y) };
    case 'sub': return { kiko: sub(A, Y) };
    case 'gain2': return { kiko: add(scale(2, X), B) };
    case 'gain3': return { kiko: sub(scale(3, X), B) };
    case 'gainBack': return { kiko: sub(B, scale(2, X)) };
    case 'pair1': return { kiko: add(X, Y), jax: sub(X, Y) };
    case 'pair2': return { kiko: add(scale(2, X), Y), jax: sub(X, Y) };
    case 'pair3': return { kiko: add(scale(2, X), scale(3, Y)), jax: add(scale(3, X), scale(2, Y)) };
    case 'rule': return { kiko: Y };
    case 'letters1': return { kiko: add([[2 * x, 2 * z], [2 * y, 2 * t]], B) };
    case 'letters2': return { kiko: add([[x + y, z + t], [z - t, x - y]], B) };
    default: return { kiko: add([[2 * x + y, 2 * z + t], [2 * y + x, 2 * t + z]], B) };
  }
}
export const judge = (r: Round, v: Values) => {
  const h = heights(r, v);
  return sameMat(h.kiko, r.card) && (!h.jax || sameMat(h.jax, r.card2!));
};

// ---- The rounds ---------------------------------------------------------------------------------------------------------------------------------------

/** Run a generator until its conditions hold (rejection sampling). */
function until<T>(make: () => T | null): T {
  for (;;) {
    const r = make();
    if (r) return r;
  }
}

function addRound(sign: 1 | -1, random: () => number): Omit<Round, 'assist'> {
  return until(() => {
    const A = sign === 1 ? mat(2, 2, -2, 6, random) : mat(2, 2, 0, 8, random);
    const Y = mat(2, 2, -4, 5, random);
    if (nonzero(Y) < (sign === 1 ? 2 : 3) || negatives(Y) < 1) return null;
    const C = zip(A, Y, (a, y) => a + sign * y);
    if (!inRange(C)) return null;
    return { kind: sign === 1 ? 'add' : 'sub', rows: 2, cols: 2, keys: matKeys('y', 2), ans: answers('y', Y), known: { A }, card: C } as const;
  });
}

function gainRound(kind: 'gain2' | 'gain3' | 'gainBack', random: () => number): Omit<Round, 'assist'> {
  return until(() => {
    const X = kind === 'gain3' ? mat(2, 3, -3, 3, random) : mat(2, 3, -4, 4, random);
    const B = kind === 'gainBack' ? mat(2, 3, 0, 8, random) : mat(2, 3, -3, 5, random);
    if (nonzero(X) < 3 || negatives(X) < 1) return null;
    const C = kind === 'gain2' ? zip(scale(2, X), B, (a, b) => a + b) : kind === 'gain3' ? zip(scale(3, X), B, (a, b) => a - b) : zip(B, scale(2, X), (a, b) => a - b);
    if (!inRange(C)) return null;
    return { kind, rows: 2, cols: 3, keys: matKeys('x', 3), ans: answers('x', X), known: { B }, card: C } as const;
  });
}

function pairRound(kind: 'pair1' | 'pair2' | 'pair3', random: () => number): Omit<Round, 'assist'> {
  const [lo, hi] = kind === 'pair3' ? [-2, 3] : [-3, 4];
  return until(() => {
    const X = mat(2, 2, lo, hi, random);
    const Y = mat(2, 2, lo, hi, random);
    if (nonzero(X) + nonzero(Y) < 4 || negatives(X) + negatives(Y) < 1) return null;
    const ans: Values = { ...answers('x', X), ...answers('y', Y) };
    const keys = [...matKeys('x', 2), ...matKeys('y', 2)];
    const probe: Round = { kind, rows: 2, cols: 2, keys, ans, known: {}, card: [], assist: 0 };
    const h = heights(probe, ans);
    if (!inRange(h.kiko) || !inRange(h.jax!)) return null;
    return { kind, rows: 2, cols: 2, keys, ans, known: {}, card: h.kiko, card2: h.jax } as const;
  });
}

function lettersRound(kind: 'letters1' | 'letters2' | 'letters3', random: () => number): Omit<Round, 'assist'> {
  return until(() => {
    const [x, y, z, t] = [ri(-4, 5, random), ri(-4, 5, random), ri(-4, 5, random), ri(-4, 5, random)];
    if ([x, y, z, t].filter((n) => n !== 0).length < 3) return null;
    const B = mat(2, 2, -3, 4, random);
    const ans: Values = { x, y, z, t };
    const probe: Round = { kind, rows: 2, cols: 2, keys: ['x', 'y', 'z', 't'], ans, known: { B }, card: [], assist: 0 };
    const C = heights(probe, ans).kiko;
    if (!inRange(C)) return null;
    return { kind, rows: 2, cols: 2, keys: ['x', 'y', 'z', 't'], ans, known: { B }, card: C } as const;
  });
}

/** A rule for the entries of a card (level 5): its text, its value at row i and column j, and the working for one entry. */
interface Rule { text: string; f: (i: number, j: number) => number; calc: (i: number, j: number) => string }
const RULES: [Rule[], Rule[], Rule[]] = [
  [
    { text: 'i + 2j', f: (i, j) => i + 2 * j, calc: (i, j) => `${i} + 2·${j}` },
    { text: '2i − j', f: (i, j) => 2 * i - j, calc: (i, j) => `2·${i} − ${j}` },
    { text: 'ij', f: (i, j) => i * j, calc: (i, j) => `${i}·${j}` },
  ],
  [
    { text: '|i − 3j|', f: (i, j) => Math.abs(i - 3 * j), calc: (i, j) => `|${i} − ${3 * j}|` },
    { text: '(i − j)²', f: (i, j) => (i - j) ** 2, calc: (i, j) => `(${i} − ${j})²` },
    { text: '3i − 2j', f: (i, j) => 3 * i - 2 * j, calc: (i, j) => `${3 * i} − ${2 * j}` },
  ],
  [
    { text: '(−1)^(i + j)·(i + j)', f: (i, j) => (-1) ** (i + j) * (i + j), calc: (i, j) => `(−1)^${i + j}·${i + j}` },
    { text: '|2i − 3j| − 1', f: (i, j) => Math.abs(2 * i - 3 * j) - 1, calc: (i, j) => `|${2 * i} − ${3 * j}| − 1` },
    { text: 'i² − j²', f: (i, j) => i * i - j * j, calc: (i, j) => `${i * i} − ${j * j}` },
  ],
];
const RULE_BY_TEXT = new Map(RULES.flat().map((r) => [r.text, r] as const));

function ruleRound(k: number, random: () => number): Omit<Round, 'assist'> {
  const rule = pick(RULES[k], random);
  const card: Mat = [1, 2].map((i) => [1, 2, 3].map((j) => rule.f(i, j)));
  return { kind: 'rule', rows: 2, cols: 3, keys: matKeys('y', 3), ans: answers('y', card), known: {}, card, rule: rule.text };
}

/** The three rounds of a level (1 to 5), generated in round order; the helpers fade round by round. */
export function buildRounds(level: number, random: () => number): Round[] {
  const rs: Omit<Round, 'assist'>[] =
    level === 1 ? [addRound(1, random), addRound(1, random), addRound(-1, random)]
    : level === 2 ? [gainRound('gain2', random), gainRound('gain3', random), gainRound('gainBack', random)]
    : level === 3 ? [pairRound('pair1', random), pairRound('pair2', random), pairRound('pair3', random)]
    : level === 5 ? [ruleRound(0, random), ruleRound(1, random), ruleRound(2, random)]
    : [lettersRound('letters1', random), lettersRound('letters2', random), lettersRound('letters3', random)];
  return rs.map((r, i) => ({ ...r, assist: aid(i) }));
}

// ---- The run plan (what Kiko does) --------------------------------------------------------------------------------------------------------------------

/** Seconds for the pillars to rise at showtime. */
export const RISE = 0.3;
/** Seconds per hop. */
export const HOP = 0.24;
/** The snake path: row 1 left to right, then row 2 right to left. */
export function order(cols: number): [number, number][] {
  const back: [number, number][] = Array.from({ length: cols }, (_, j) => [0, j]);
  const front: [number, number][] = Array.from({ length: cols }, (_, j) => [1, cols - 1 - j]);
  return [...back, ...front];
}
export interface Fault { runner: 'kiko' | 'jax'; hop: number; i: number; j: number; kind: 'high' | 'low'; at: number }

/** The first wrong pillar on one runner's path, or null. */
export function runnerFault(cols: number, h: Mat, card: Mat, runner: 'kiko' | 'jax'): Fault | null {
  const ord = order(cols);
  for (let k = 0; k < ord.length; k++) {
    const [i, j] = ord[k];
    if (h[i][j] === card[i][j]) continue;
    const kind = h[i][j] > card[i][j] ? 'high' : 'low';
    return { runner, hop: k, i, j, kind, at: kind === 'high' ? RISE + HOP * (k + 0.6) : RISE + HOP * (k + 1) };
  }
  return null;
}
/** The first wrong pillar on the path (the earliest in time over both runners), or null. */
export function firstFault(r: Round, v: Values): Fault | null {
  const h = heights(r, v);
  const a = runnerFault(r.cols, h.kiko, r.card, 'kiko');
  const b = h.jax ? runnerFault(r.cols, h.jax, r.card2!, 'jax') : null;
  if (a && b) return b.at < a.at ? b : a;
  return a ?? b;
}
/** Seconds into the run at which the verdict lands: the first fault, or the hop onto the exit platform. */
export function verdictTime(r: Round, v: Values): number {
  const f = firstFault(r, v);
  return f ? f.at : RISE + HOP * (r.cols * 2 + 1);
}

// ---- Words --------------------------------------------------------------------------------------------------------------------------------------------

const EQ: Record<Kind, [string, string?]> = {
  add: ['A + Y'], sub: ['A − Y'], gain2: ['2X + B'], gain3: ['3X − B'], gainBack: ['B − 2X'],
  pair1: ['X + Y', 'X − Y'], pair2: ['2X + Y', 'X − Y'], pair3: ['2X + 3Y', '3X + 2Y'],
  rule: ['Y'],
  letters1: ['2[x z; y t] + B'], letters2: ['[x + y z + t; z − t x − y] + B'], letters3: ['2[x z; y t] + [y t; x z] + B'],
};

export function intel(r: Round): string {
  const { A, B } = r.known;
  const [e1, e2] = EQ[r.kind];
  switch (r.kind) {
    case 'add': return `Base program A = ${matText(A)} is loaded. The stage adds your program Y. Kiko’s card: C = ${matText(r.card)}.`;
    case 'sub': return `Base program A = ${matText(A)}. This stage subtracts your program: the pillars stand at A − Y. Kiko’s card: C = ${matText(r.card)}.`;
    case 'gain2': case 'gain3': case 'gainBack': return `Program B = ${matText(B)}. The stage runs ${e1} with your program X. Kiko’s card: C = ${matText(r.card)}.`;
    case 'rule': return `The card is a rule: cᵢⱼ = ${r.rule} for rows i = 1, 2 and columns j = 1, 2, 3. There is no base program: set program Y so each pillar (i, j) stands at cᵢⱼ.`;
    case 'pair1': case 'pair2': case 'pair3': return `Kiko’s stage runs ${e1} and Jax’s stage runs ${e2}. Kiko’s card: P = ${matText(r.card)}. Jax’s card: Q = ${matText(r.card2!)}.`;
    default: return `The stage runs ${e1}, with B = ${matText(B)}. Kiko’s card: C = ${matText(r.card)}.`;
  }
}
export const hintText = (r: Round) => `${intel(r)} ${r.assist === 0 ? 'Round 1: the pillars follow the faders live.' : r.assist === 1 ? 'The pillars stay down until showtime: a test lift costs a charge.' : 'Boss round: no preview, no test lift.'}`;

const WHO = { kiko: 'Kiko', jax: 'Jax' };
/** After a miss: which pillar failed and in which direction, never by how much. */
export function missText(r: Round, v: Values): string {
  const f = firstFault(r, v);
  if (!f) return 'Every pillar matched the card.';
  const who = WHO[f.runner];
  const where = `(${f.i + 1}, ${f.j + 1})`;
  const base = f.kind === 'high'
    ? `${who}’s pillar for entry ${where} stood too high: ${who} slammed into its side and dropped into the pit.`
    : `${who}’s pillar for entry ${where} stood too low: ${who} landed on thin air and fell into the gap.`;
  return base + (swappedIndices(r, v) ? ' Check the rule: i counts rows and j counts columns.' : '');
}

/** Level 5: true when the four entries y11, y12, y21, y22 are the rule applied with i and j swapped, and that differs from the card. */
function swappedIndices(r: Round, v: Values): boolean {
  const rule = r.rule ? RULE_BY_TEXT.get(r.rule) : undefined;
  if (!rule) return false;
  const cells = [[1, 1], [1, 2], [2, 1], [2, 2]];
  const swapped = cells.every(([i, j]) => (v[`y${i}${j}`] ?? 0) === rule.f(j, i));
  return swapped && cells.some(([i, j]) => r.card[i - 1][j - 1] !== rule.f(j, i));
}

/** The test lift (a charge): the wrong pillars by direction only. */
export function testText(r: Round, v: Values): string {
  const h = heights(r, v);
  const parts: string[] = [];
  const check = (who: string, M: Mat, card: Mat) => {
    const high: string[] = [];
    const low: string[] = [];
    M.forEach((row, i) => row.forEach((x, j) => {
      if (x > card[i][j]) high.push(`(${i + 1}, ${j + 1})`);
      else if (x < card[i][j]) low.push(`(${i + 1}, ${j + 1})`);
    }));
    const halves = [high.length ? `${high.length === 1 ? 'entry' : 'entries'} ${high.join(', ')} too high` : '', low.length ? `${low.length === 1 ? 'entry' : 'entries'} ${low.join(', ')} too low` : ''].filter(Boolean);
    if (halves.length) parts.push(`${who}’s stage has ${halves.join(' and ')}`);
  };
  check('Kiko', h.kiko, r.card);
  if (h.jax) check('Jax', h.jax, r.card2!);
  return parts.length ? `Test lift: ${parts.join('; ')}.` : 'Test lift: every pillar matches the card.';
}

/** After a win: the working, entry by entry. */
export function explain(r: Round): string {
  const { A, B } = r.known;
  const C = r.card;
  const X = fromDials('x', r.cols, r.ans);
  const Y = fromDials('y', r.cols, r.ans);
  const [x, y, z, t] = ['x', 'y', 'z', 't'].map((k) => r.ans[k] ?? 0);
  const each = (name: string, M: Mat, f: (i: number, j: number) => string) => M.flatMap((row, i) => row.map((_, j) => `${entryName(name, i, j)} = ${f(i, j)}`)).join(', ');
  switch (r.kind) {
    case 'add': return `Matrices add entry by entry, so Y = C − A: ${each('y', Y, (i, j) => `${num(C[i][j])} − ${br(A[i][j])} = ${num(Y[i][j])}`)}.`;
    case 'sub': return `A − Y = C, so Y = A − C: ${each('y', Y, (i, j) => `${num(A[i][j])} − ${br(C[i][j])} = ${num(Y[i][j])}`)}.`;
    case 'gain2': return `2X + B = C, so X = ½(C − B): ${each('x', X, (i, j) => `½(${num(C[i][j])} − ${br(B[i][j])}) = ${num(X[i][j])}`)}.`;
    case 'gain3': return `3X − B = C, so X = ⅓(C + B): ${each('x', X, (i, j) => `⅓(${num(C[i][j])} + ${br(B[i][j])}) = ${num(X[i][j])}`)}.`;
    case 'gainBack': return `B − 2X = C, so X = ½(B − C): ${each('x', X, (i, j) => `½(${num(B[i][j])} − ${br(C[i][j])}) = ${num(X[i][j])}`)}.`;
    case 'pair1': return `Adding the equations gives 2X = P + Q, so X = ½(P + Q) = ${matText(X)}; subtracting gives 2Y = P − Q, so Y = ${matText(Y)}.`;
    case 'pair2': return `Adding the equations gives 3X = P + Q, so X = ⅓(P + Q) = ${matText(X)}; then Y = X − Q = ${matText(Y)}.`;
    case 'pair3': return `Adding gives 5(X + Y) = P + Q and subtracting gives Y − X = P − Q, so X = ½[⅕(P + Q) − (P − Q)] = ${matText(X)} and Y = ½[⅕(P + Q) + (P − Q)] = ${matText(Y)}.`;
    case 'rule': {
      const rule = RULE_BY_TEXT.get(r.rule ?? '')!;
      const items = [1, 2].flatMap((i) => [1, 2, 3].map((j) => `${entryName('c', i - 1, j - 1)} = ${rule.calc(i, j)} = ${num(C[i - 1][j - 1])}`));
      return `Row i, column j: ${items.join(', ')}.`;
    }
    case 'letters1': return `Matching entries: 2x ${plus(B[0][0])} = ${num(C[0][0])} gives x = ${num(x)}; 2z ${plus(B[0][1])} = ${num(C[0][1])} gives z = ${num(z)}; 2y ${plus(B[1][0])} = ${num(C[1][0])} gives y = ${num(y)}; 2t ${plus(B[1][1])} = ${num(C[1][1])} gives t = ${num(t)}.`;
    case 'letters2': return `Matching entries: x + y = ${num(C[0][0] - B[0][0])} and x − y = ${num(C[1][1] - B[1][1])}, so x = ${num(x)} and y = ${num(y)}; z + t = ${num(C[0][1] - B[0][1])} and z − t = ${num(C[1][0] - B[1][0])}, so z = ${num(z)} and t = ${num(t)}.`;
    default: return `Matching entries: 2x + y = ${num(C[0][0] - B[0][0])} and x + 2y = ${num(C[1][0] - B[1][0])}, so x = ${num(x)} and y = ${num(y)}; 2z + t = ${num(C[0][1] - B[0][1])} and z + 2t = ${num(C[1][1] - B[1][1])}, so z = ${num(z)} and t = ${num(t)}.`;
  }
}

/** `y11` gives `y₁₁`; the letters stay x, y, z, t. */
export const labelFor = (key: string) => (key.length === 3 ? entryName(key[0], Number(key[1]) - 1, Number(key[2]) - 1) : key);
/** The accessible name of a fader. */
export const ariaFor = (key: string) => (key.length === 3 ? `Program ${key[0].toUpperCase()} entry row ${key[1]} column ${key[2]}` : `Letter ${key}`);

// ---- The equation band (what the screen writes at the top) --------------------------------------------------------------------------------------------

export interface Cell { text: string; sub?: string }
/** A rule card (level 5): the rule as text in a pink box, with small notes under it. Never the card's numbers. */
export interface RuleTok { rule: string; label: string; notes: string }
export type Tok = { op: string } | { grid: Cell[][]; tone: 'unknown' | 'known' | 'card'; label: string } | RuleTok;
const grid = (M: Mat, tone: 'known' | 'card', label: string): Tok => ({ grid: M.map((row) => row.map((x) => ({ text: num(x) }))), tone, label });
const unk = (name: string, cols: number, v: Values): Tok => ({ grid: [0, 1].map((i) => Array.from({ length: cols }, (_, j) => ({ text: num(v[`${name.toLowerCase()}${i + 1}${j + 1}`] ?? 0), sub: entryName(name.toLowerCase(), i, j) }))), tone: 'unknown', label: name });
const letters = (rows: string[][], label: string): Tok => ({ grid: rows.map((row) => row.map((text) => ({ text }))), tone: 'unknown', label });
const CARD = [['x', 'z'], ['y', 't']];
const SWAP = [['y', 't'], ['x', 'z']];

/** The equation(s) of the round as tokens: unknown matrices show the current fader values, never the computed heights. */
export function equations(r: Round, v: Values): Tok[][] {
  const { A, B } = r.known;
  const X = unk('X', r.cols, v);
  const Y = unk('Y', r.cols, v);
  const C = grid(r.card, 'card', 'card');
  const P = grid(r.card, 'card', 'card P');
  const Q = r.card2 ? grid(r.card2, 'card', 'card Q') : C;
  switch (r.kind) {
    case 'add': return [[grid(A, 'known', 'A'), { op: '+' }, Y, { op: '=' }, C]];
    case 'sub': return [[grid(A, 'known', 'A'), { op: '−' }, Y, { op: '=' }, C]];
    case 'gain2': return [[{ op: '2·' }, X, { op: '+' }, grid(B, 'known', 'B'), { op: '=' }, C]];
    case 'gain3': return [[{ op: '3·' }, X, { op: '−' }, grid(B, 'known', 'B'), { op: '=' }, C]];
    case 'gainBack': return [[grid(B, 'known', 'B'), { op: '−' }, { op: '2·' }, X, { op: '=' }, C]];
    case 'pair1': return [[X, { op: '+' }, Y, { op: '=' }, P], [X, { op: '−' }, Y, { op: '=' }, Q]];
    case 'pair2': return [[{ op: '2·' }, X, { op: '+' }, Y, { op: '=' }, P], [X, { op: '−' }, Y, { op: '=' }, Q]];
    case 'pair3': return [[{ op: '2·' }, X, { op: '+' }, { op: '3·' }, Y, { op: '=' }, P], [{ op: '3·' }, X, { op: '+' }, { op: '2·' }, Y, { op: '=' }, Q]];
    case 'rule': return [[Y, { op: '=' }, { rule: `card: cᵢⱼ = ${r.rule}`, label: 'rule', notes: 'i = 1, 2    j = 1, 2, 3' }]];
    case 'letters1': return [[{ op: '2·' }, letters(CARD, 'unknown'), { op: '+' }, grid(B, 'known', 'B'), { op: '=' }, C]];
    case 'letters2': return [[letters([['x + y', 'z + t'], ['z − t', 'x − y']], 'unknown'), { op: '+' }, grid(B, 'known', 'B'), { op: '=' }, C]];
    default: return [[{ op: '2·' }, letters(CARD, 'unknown'), { op: '+' }, letters(SWAP, 'unknown'), { op: '+' }, grid(B, 'known', 'B'), { op: '=' }, C]];
  }
}
/** "x = 0  y = 0  z = 0  t = 0": the letter values under a level 4 equation. */
export const letterValues = (v: Values) => ['x', 'y', 'z', 't'].map((k) => `${k} = ${num(v[k] ?? 0)}`).join('  ');
