// Pure rules of Room Keeper: no DOM, no canvas. A relation on guests decides who shares a room; an equivalence relation (reflexive, symmetric and
// transitive) splits the guests into rooms. Level 1 repairs a chart with one pair missing, level 2 finds the modulus that makes the given rooms,
// level 3 counts the ways to seat the guests under constraints.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';

export type Kind = 'repair' | 'modulus' | 'count';
export type Pair = [number, number];
export interface Round {
  kind: Kind;
  /** Number of guests, 1..n. */
  n: number;
  /** repair: the chart, every pair that is related. */
  pairs: Pair[];
  /** repair: the pair that was removed (the answer, kept for tests and the working). */
  gone: Pair;
  /** modulus: the target rooms (groups of guests). */
  rooms: number[][];
  /** count: guests that must share a room, and guests that must not. */
  together: Pair[];
  apart: Pair[];
  ans: Record<string, number>;
  assist: 0 | 1 | 2;
}

export const DIALS = {
  repair: [{ key: 'a', label: 'Row guest', min: 1, max: 6, start: 1 }, { key: 'b', label: 'Column guest', min: 1, max: 6, start: 1 }],
  modulus: [{ key: 'm', label: 'Modulus m', min: 1, max: 11, start: 1 }],
  count: [{ key: 'c', label: 'Ways to seat', min: 1, max: 60, start: 1 }],
};
const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];

/** Reflexive, symmetric and transitive on guests 1..n. */
export function properties(pairs: Pair[], n: number): { reflexive: boolean; symmetric: boolean; transitive: boolean } {
  const has = new Set(pairs.map(([a, b]) => `${a},${b}`));
  let reflexive = true;
  let symmetric = true;
  let transitive = true;
  for (let a = 1; a <= n; a++) if (!has.has(`${a},${a}`)) reflexive = false;
  for (const [a, b] of pairs) if (!has.has(`${b},${a}`)) symmetric = false;
  for (const [a, b] of pairs) for (const [c, d] of pairs) if (b === c && !has.has(`${a},${d}`)) transitive = false;
  return { reflexive, symmetric, transitive };
}
export const isEquivalence = (pairs: Pair[], n: number) => {
  const p = properties(pairs, n);
  return p.reflexive && p.symmetric && p.transitive;
};

function repairRound(sizes: number[], random: () => number): Round {
  const n = sizes.reduce((a, b) => a + b, 0);
  const order = shuffle(Array.from({ length: n }, (_, i) => i + 1), random);
  const blocks: number[][] = [];
  let at = 0;
  for (const s of sizes) {
    blocks.push(order.slice(at, at + s));
    at += s;
  }
  const pairs: Pair[] = [];
  for (const b of blocks) for (const x of b) for (const y of b) pairs.push([x, y]);
  const big = blocks.filter((b) => b.length >= 2);
  const blk = pick(big, random);
  const [a, b] = shuffle(blk, random).slice(0, 2);
  return { kind: 'repair', n, pairs: pairs.filter(([x, y]) => !(x === a && y === b)), gone: [a, b], rooms: [], together: [], apart: [], ans: { a, b }, assist: 0 };
}

const classes = (N: number, m: number) => {
  const out: number[][] = [];
  for (let r = 0; r < m; r++) {
    const g = Array.from({ length: N }, (_, i) => i + 1).filter((x) => x % m === r);
    if (g.length) out.push(g);
  }
  return out;
};
export const roomsFor = classes;
export const MOD_GUESTS = 12;
function modulusRound(m: number): Round {
  return { kind: 'modulus', n: MOD_GUESTS, pairs: [], gone: [0, 0], rooms: classes(MOD_GUESTS, m), together: [], apart: [], ans: { m }, assist: 0 };
}

/** Number of ways to split guests 1..n into rooms (set partitions) with the given guests together and apart. */
export function countSeatings(n: number, together: Pair[], apart: Pair[]): number {
  let count = 0;
  const room = new Array<number>(n + 1).fill(0);
  const rec = (g: number, used: number) => {
    if (g > n) {
      if (together.every(([a, b]) => room[a] === room[b]) && apart.every(([a, b]) => room[a] !== room[b])) count++;
      return;
    }
    for (let r = 1; r <= used + 1; r++) {
      room[g] = r;
      rec(g + 1, Math.max(used, r));
    }
  };
  rec(1, 0);
  return count;
}
const COUNTS: { n: number; together: Pair[]; apart: Pair[] }[][] = [
  [{ n: 3, together: [[1, 2]], apart: [] }, { n: 3, together: [], apart: [[1, 2]] }],
  [{ n: 4, together: [[1, 2]], apart: [] }, { n: 4, together: [], apart: [[1, 2]] }],
  [{ n: 4, together: [[1, 2]], apart: [[3, 4]] }, { n: 5, together: [[1, 2]], apart: [] }, { n: 5, together: [[1, 2]], apart: [[3, 4]] }, { n: 4, together: [[1, 2], [2, 3]], apart: [] }],
];
function countRound(k: number, random: () => number): Round {
  const c = pick(COUNTS[k], random);
  return { kind: 'count', n: c.n, pairs: [], gone: [0, 0], rooms: [], together: c.together, apart: c.apart, ans: { c: countSeatings(c.n, c.together, c.apart) }, assist: 0 };
}

export function buildRounds(level: number, random: () => number): Round[] {
  let rs: Round[];
  if (level === 1) rs = [repairRound(pick([[2, 2], [3, 1]], random), random), repairRound(pick([[3, 2], [2, 2, 1]], random), random), repairRound(pick([[3, 3], [4, 2], [3, 2, 1]], random), random)];
  else if (level === 2) rs = shuffle([3, 4, 5, 6], random).slice(0, 3).map(modulusRound);
  else rs = [0, 1, 2].map((k) => countRound(k, random));
  return rs.map((r, i) => ({ ...r, assist: aid(i) }));
}

/** The chart with the pair (a, b) added. */
export const withPair = (r: Round, a: number, b: number): Pair[] => [...r.pairs, [a, b]];

export function judge(r: Round, v: Record<string, number>): boolean {
  if (r.kind === 'repair') return isEquivalence(withPair(r, v.a, v.b), r.n);
  if (r.kind === 'modulus') return JSON.stringify(classes(MOD_GUESTS, v.m)) === JSON.stringify(r.rooms);
  return v.c === r.ans.c;
}

const fault = (p: { reflexive: boolean; symmetric: boolean; transitive: boolean }) => [!p.reflexive && 'reflexive', !p.symmetric && 'symmetric', !p.transitive && 'transitive'].filter(Boolean) as string[];

/** After a miss: what went wrong in the mansion, never the answer. */
export function missText(r: Round, v: Record<string, number>): string {
  if (r.kind === 'repair') {
    const f = fault(properties(withPair(r, v.a, v.b), r.n));
    return `With that entry the chart still breaks the rule${f.length > 1 ? 's' : ''}: it is not ${f.join(' and not ')}, so the guests argued about the rooms.`;
  }
  if (r.kind === 'modulus') {
    const mine = classes(MOD_GUESTS, v.m);
    const first = r.rooms.find((room) => !mine.some((g) => JSON.stringify(g) === JSON.stringify(room)))!;
    return `Your rule put the guests into ${mine.length} room${mine.length === 1 ? '' : 's'}, and the guests ${first.slice(0, 3).join(', ')}… were not seated as the plan says.`;
  }
  return 'The count did not match the plans: the Keeper tried every seating and found a different number of ways.';
}
export function spotText(r: Round, v: Record<string, number>): string {
  if (r.kind === 'repair') {
    const p = properties(withPair(r, v.a, v.b), r.n);
    const yn = (x: boolean) => (x ? '✓' : '✗');
    return `Check: with that entry the chart is reflexive ${yn(p.reflexive)}, symmetric ${yn(p.symmetric)}, transitive ${yn(p.transitive)}.`;
  }
  if (r.kind === 'modulus') return `Check: with modulus ${v.m} the guests fall into ${classes(MOD_GUESTS, v.m).length} rooms: ${classes(MOD_GUESTS, v.m).map((g) => `{${g.join(',')}}`).join(' ')}.`;
  return 'Hint: glue the guests who must share a room into one super-guest, then count the ways to seat the rest.';
}

const gtext = (g: number[]) => `{${g.join(', ')}}`;
/** After a hit: the working. */
export function explain(r: Round): string {
  if (r.kind === 'repair') return `The chart should be an equivalence relation: reflexive, symmetric, transitive. The pair (${r.gone[0]}, ${r.gone[1]}) was missing: guests ${r.gone[0]} and ${r.gone[1]} share a room, so by symmetry and transitivity (${r.gone[0]}, ${r.gone[1]}) must be in the chart.`;
  if (r.kind === 'modulus') return `x ~ y when x − y is a multiple of m is an equivalence relation. The rooms ${r.rooms.map(gtext).join(' ')} are its classes, and each room has guests ${r.ans.m} apart, so m = ${r.ans.m}.`;
  const glue = r.together.length ? `Glue ${r.together.map(([a, b]) => `${a} and ${b}`).join(' and ')} together. ` : '';
  const sep = r.apart.length ? `Keep ${r.apart.map(([a, b]) => `${a} and ${b}`).join(' and ')} apart. ` : '';
  return `${glue}${sep}Counting the ways to split ${r.n} guests into rooms under these rules gives ${r.ans.c}.`;
}
export function intel(r: Round): string {
  if (r.kind === 'repair') return `Guests 1 to ${r.n}. The chart lists who shares a room with whom, but one entry has been rubbed out. Which entry (row guest, column guest) must be written back so the chart is an equivalence relation?`;
  if (r.kind === 'modulus') return `Guests 1 to ${MOD_GUESTS}. The rooms must be ${r.rooms.map(gtext).join(' ')}. Pick the m so that x and y share a room when x − y is a multiple of m.`;
  const t = r.together.map(([a, b]) => `guests ${a} and ${b} must share a room`);
  const a = r.apart.map(([x, y]) => `guests ${x} and ${y} must not`);
  return `${r.n} guests, rooms of any size, no empty rooms. ${[...t, ...a].join('; ')}. How many different ways can the Keeper seat them?`;
}
