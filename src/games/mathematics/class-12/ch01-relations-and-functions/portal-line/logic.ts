// Pure rules of Portal Line: no DOM, no canvas. Travellers walk through a portal f. Level 1 fences the domain so that f is one-one (as wide
// as possible, around Pip); level 2 fences the co-domain so that f is onto; level 3 counts the one-one maps of a finite set onto itself;
// level 4 builds the return portal g(y) = (y − p)/q that undoes f(x) = ax + b; level 5 does the same for the two-portal trip g after f.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';

export type Kind = 'domain' | 'range' | 'count' | 'inverse' | 'compose';
/** Levels 4 and 5: the trip is f(x) = ax + b, then (level 5 only) g(x) = cx + d. Level 4 has c = 1, d = 0. */
export interface Lin {
  a: number;
  b: number;
  c: number;
  d: number;
  fText: string;
  gText: string;
}
export interface Round {
  kind: Kind;
  /** f in words, e.g. "f(x) = (x − 2)² + 1". */
  fnText: string;
  f: (x: number) => number;
  /** The x values where f turns (changes between rising and falling). Between two of them f is one-one. */
  turns: number[];
  /** domain: where Pip stands. */
  pip: number;
  /** range: the domain [a, b] of the portal. */
  a: number;
  b: number;
  /** count: n travellers, k of them already have their door fixed. */
  n: number;
  k: number;
  /** The winning setting of every dial. */
  ans: Record<string, number>;
  assist: 0 | 1 | 2;
  /** inverse, compose: the trip the travellers make. */
  lin?: Lin;
}

export const DOMAIN = { min: -5, max: 5 };
export const RANGE = { min: -30, max: 30 };
export const COUNT = { min: 1, max: 130 };
/** The return portal's dials (levels 4 and 5): shift p and divisor q. */
export const PQ = { p: { min: -9, max: 9, start: 0 }, q: { min: -5, max: 5 } };
/** The travellers sent on the trip, and the home markers they must return to. */
export const TRAVELLERS = [0, 1, 2, 3, 4];

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const sgn = (c: number) => (c < 0 ? '−' : '+');
const shift = (c: number) => (c === 0 ? 'x' : `(x ${sgn(-c)} ${Math.abs(c)})`);
const plus = (d: number) => (d === 0 ? '' : ` ${sgn(d)} ${Math.abs(d)}`);
export const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/** The values f takes on the real interval [lo, hi]: the extremes are at the ends or at a turning point inside. */
export function imageOf(r: Round, lo: number, hi: number): [number, number] {
  const xs = [lo, hi, ...r.turns.filter((t) => t > lo && t < hi)];
  const ys = xs.map(r.f);
  return [Math.min(...ys), Math.max(...ys)];
}
/** f is one-one on [lo, hi] exactly when no turning point lies strictly inside. */
export const oneOne = (r: Round, lo: number, hi: number) => !r.turns.some((t) => t > lo && t < hi);

function domainRound(variant: number, random: () => number): Round {
  const c = pick([-2, -1, 1, 2], random);
  const d = pick([0, 1, 2, 3], random);
  const side = pick([-1, 1], random);
  const reach = pick([2, 3], random);
  let fnText: string;
  let f: (x: number) => number;
  let turns: number[];
  let pip: number;
  if (variant === 0) {
    fnText = `f(x) = ${shift(c)}²${plus(d)}`;
    f = (x) => (x - c) ** 2 + d;
    turns = [c];
    pip = c + side * reach;
  } else if (variant === 1) {
    fnText = `f(x) = |${shift(c).replace(/[()]/g, '')}|${plus(d)}`;
    f = (x) => Math.abs(x - c) + d;
    turns = [c];
    pip = c + side * reach;
  } else {
    fnText = 'f(x) = x³ − 3x';
    f = (x) => x ** 3 - 3 * x;
    turns = [-1, 1];
    pip = pick([-3, 0, 3], random);
  }
  pip = Math.max(DOMAIN.min + 1, Math.min(DOMAIN.max - 1, pip));
  if (turns.includes(pip)) pip += pip < DOMAIN.max - 1 ? 1 : -1;
  const lo = Math.max(DOMAIN.min, ...turns.filter((t) => t < pip));
  const hi = Math.min(DOMAIN.max, ...turns.filter((t) => t > pip));
  return { kind: 'domain', fnText, f, turns, pip, a: 0, b: 0, n: 0, k: 0, ans: { lo, hi }, assist: 0 };
}

function rangeRound(variant: number, random: () => number): Round {
  const a = pick([-3, -2, -1], random);
  const b = pick([2, 3, 4], random);
  const c = pick([-1, 0, 1, 2], random);
  const d = pick([-2, -1, 0, 1, 2], random);
  let fnText: string;
  let f: (x: number) => number;
  let turns: number[] = [];
  if (variant === 0) {
    const m = pick([2, 3, -2, -3], random);
    fnText = `f(x) = ${m === 1 ? '' : m === -1 ? '−' : m < 0 ? '−' + Math.abs(m) : m}x${plus(d)}`;
    f = (x) => m * x + d;
  } else if (variant === 1) {
    fnText = `f(x) = ${shift(c)}²${plus(d)}`;
    f = (x) => (x - c) ** 2 + d;
    turns = [c];
  } else {
    const top = pick([4, 5, 6], random);
    fnText = `f(x) = ${top} − ${shift(c)}²`;
    f = (x) => top - (x - c) ** 2;
    turns = [c];
  }
  const r: Round = { kind: 'range', fnText, f, turns, pip: 0, a, b, n: 0, k: 0, ans: {}, assist: 0 };
  const [lo, hi] = imageOf(r, a, b);
  r.ans = { lo, hi };
  return r;
}

function countRound(n: number, k: number): Round {
  return { kind: 'count', fnText: '', f: (x) => x, turns: [], pip: 0, a: 0, b: 0, n, k, ans: { c: factorial(n - k) }, assist: 0 };
}

const coef = (a: number) => (a === 1 ? '' : a === -1 ? '−' : dn(a));
/** ax + b written the textbook way: 2x + 3, −x + 4, 3x. */
export const linText = (a: number, b: number) => `${coef(a)}x${plus(b)}`;
const paren = (a: number) => (a < 0 ? `(${dn(a)})` : String(a));

/** Level 4: f(x) = ax + b, as [a, b] or [a, b, how it is written]. One entry is drawn per round. */
const INVERSE_POOLS: [number, number, string?][][] = [
  [[2, 3], [3, -4], [4, 1]],
  [[-2, 7], [-1, 4], [-3, -2]],
  [[-2, 5, '5 − 2x'], [-3, 6, '6 − 3x'], [2, -6, '2(x − 3)']],
];
/** Level 5: [[a, b], [c, d]] for f(x) = ax + b, then g(x) = cx + d. */
const COMPOSE_POOLS: [[number, number], [number, number]][][] = [
  [[[1, 2], [3, 0]], [[2, 0], [1, -5]]],
  [[[2, 1], [2, -3]], [[1, -3], [-2, 1]]],
  [[[3, -1], [-1, 4]], [[-1, 2], [2, 3]]],
];

/** The return portal (y − p)/q undoes the whole trip x → c(ax + b) + d exactly when q = ca and p = cb + d. */
export const returnPortal = (l: Lin) => ({ p: l.c * l.b + l.d, q: l.c * l.a });
const composite = (l: Lin) => ({ m: l.c * l.a, s: l.c * l.b + l.d });
/** The q dial starts at 1, or at 2 when 1 is the answer, so the start setting never wins. */
export const startQ = (r: Round) => (r.ans.q === 1 ? 2 : 1);

function tripRound(kind: 'inverse' | 'compose', lin: Lin): Round {
  const fnText = kind === 'inverse' ? `f(x) = ${lin.fText}` : `f(x) = ${lin.fText}     g(x) = ${lin.gText}`;
  return { kind, fnText, f: (x) => lin.a * x + lin.b, turns: [], pip: 0, a: 0, b: 0, n: 0, k: 0, ans: returnPortal(lin), assist: 0, lin };
}
/** Three rounds, one entry from each round's pool; an entry whose answer an earlier round already had is skipped, so no one setting wins twice. */
function tripRounds(level: number, random: () => number): Round[] {
  const taken: string[] = [];
  return [0, 1, 2].map((k) => {
    const pool: Lin[] =
      level === 4
        ? INVERSE_POOLS[k].map(([a, b, text]) => ({ a, b, c: 1, d: 0, fText: text ?? linText(a, b), gText: 'x' }))
        : COMPOSE_POOLS[k].map(([[a, b], [c, d]]) => ({ a, b, c, d, fText: linText(a, b), gText: linText(c, d) }));
    const key = (l: Lin) => `${returnPortal(l).p},${returnPortal(l).q}`;
    const fresh = pool.filter((l) => !taken.includes(key(l)));
    const lin = pick(fresh.length ? fresh : pool, random);
    taken.push(key(lin));
    return tripRound(level === 4 ? 'inverse' : 'compose', lin);
  });
}

export function buildRounds(level: number, random: () => number): Round[] {
  let rs: Round[];
  if (level === 1) rs = [0, 1, 2].map((v) => domainRound(v, random));
  else if (level === 2) rs = [0, 1, 2].map((v) => rangeRound(v, random));
  else if (level === 3) rs = [countRound(3, 0), countRound(4, 0), countRound(5, 0)];
  else rs = tripRounds(level, random);
  return rs.map((r, i) => ({ ...r, assist: aid(i) }));
}

/** Where traveller x comes out of the return portal (y − p)/q, as an exact fraction; null when q is 0 (no such portal). */
export function landing(r: Round, v: Record<string, number>, x: number): { num: number; den: number } | null {
  if (!r.lin || v.q === 0) return null;
  const { m, s } = composite(r.lin);
  return { num: m * x + s - v.p, den: v.q };
}
/** Every traveller 0 to 4 comes out of the return portal on his own home marker. */
export function homeAll(r: Round, v: Record<string, number>): boolean {
  return TRAVELLERS.every((x) => {
    const L = landing(r, v, x);
    return L !== null && L.num === L.den * x;
  });
}
/**
 * What the scene shows after Fire: 0 when everyone is home, otherwise only the side on which the first traveller who missed home came out
 * (-1 left, +1 right). The scene draws a miss with a fixed shift in that direction, never the real landing places.
 */
export function outcome(r: Round, v: Record<string, number>): -1 | 0 | 1 {
  for (const x of TRAVELLERS) {
    const L = landing(r, v, x);
    if (!L) return 1;
    const err = L.num - L.den * x;
    if (err !== 0) return (Math.sign(err) * Math.sign(L.den)) as -1 | 1;
  }
  return 0;
}
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
/** num/den in lowest terms, written 7/3, −2/3 or 4. */
export function ratio(num: number, den: number): string {
  const s = den < 0 ? -1 : 1;
  const g = gcd(num, den) || 1;
  const n = (s * num) / g;
  const d = (s * den) / g;
  return d === 1 ? dn(n) : `${dn(n)}/${d}`;
}

export const judge = (r: Round, v: Record<string, number>): boolean => Object.entries(r.ans).every(([k, x]) => v[k] === x);

/**
 * Two different travellers on [lo, hi] who land on the same door, or null when f is one-one there. A turning point t inside means f rises on
 * one side and falls on the other, so every value near t is taken twice; the partner of a traveller on the left is found by bisection.
 */
export function collision(r: Round, lo: number, hi: number): [number, number] | null {
  const t = r.turns.find((x) => x > lo && x < hi);
  if (t === undefined) return null;
  for (const step of [1, 0.5, 0.25, 0.05]) {
    for (let x1 = t - step; x1 >= lo - 1e-9; x1 -= step) {
      const y = r.f(x1);
      const g = (x: number) => r.f(x) - y;
      const right = r.turns.find((u) => u > t && u < hi) ?? hi;
      if (g(t) * g(right) > 0) continue;
      let a = t;
      let b = right;
      for (let i = 0; i < 60; i++) {
        const m = (a + b) / 2;
        if (g(a) * g(m) <= 0) b = m;
        else a = m;
      }
      const x2 = Math.round(((a + b) / 2) * 100) / 100;
      if (x2 > t) return [Math.round(x1 * 100) / 100, x2];
    }
  }
  return [t - 0.05, t + 0.05];
}
const dn = (x: number) => (x < 0 ? `−${Math.abs(x)}` : String(x));

/** Level 1, the kind of fault in the player's own fences (what the miss text and the miss animation show, and nothing more). */
export type DomainFault = 'ok' | 'outside' | 'jam' | 'narrow';
export function domainFault(r: Round, v: Record<string, number>): DomainFault {
  const lo = Math.min(v.lo, v.hi);
  const hi = Math.max(v.lo, v.hi);
  if (r.pip < lo || r.pip > hi) return 'outside';
  if (collision(r, lo, hi)) return 'jam';
  return judge(r, v) ? 'ok' : 'narrow';
}
/** Level 2, per end of the player's co-domain: 'narrow' (a traveller lands outside), 'wide' (a door stays dark) or 'ok'. */
export type EndFault = 'ok' | 'narrow' | 'wide';
export function rangeFault(r: Round, v: Record<string, number>): [EndFault, EndFault] {
  const [lo, hi] = imageOf(r, r.a, r.b);
  const l = Math.min(v.lo, v.hi);
  const h = Math.max(v.lo, v.hi);
  return [l > lo ? 'narrow' : l < lo ? 'wide' : 'ok', h < hi ? 'narrow' : h > hi ? 'wide' : 'ok'];
}

/** After a miss: what happened at the portal, never the fence that works. */
export function missText(r: Round, v: Record<string, number>): string {
  if (r.lin) {
    // Only the side, never a landing place or the name of a traveller: from where a traveller landed and the player's own p and q, f follows in one step.
    if (v.q === 0) return 'A portal cannot divide by zero.';
    return `Not everyone got home: a traveller came out of the return portal to the ${outcome(r, v) > 0 ? 'right' : 'left'} of home. The portal does not undo the trip.`;
  }
  // Levels 1 and 2 say the kind of fault only: a pair of colliding travellers or a door that was hit would give the turning point or the range.
  if (r.kind === 'domain') {
    const fault = domainFault(r, v);
    if (fault === 'outside') return 'Pip was left outside your fences and could not cross.';
    if (fault === 'jam') return 'Two travellers landed on the same door and fell over: the portal was not one-one on your fences.';
    return 'Everyone crossed safely, but the Mayor wants every traveller who can cross safely to cross, and your fences kept one back.';
  }
  if (r.kind === 'range') {
    const [low, high] = rangeFault(r, v);
    if (low === 'narrow' || high === 'narrow') {
      const where = [low === 'narrow' ? 'below your lowest door' : '', high === 'narrow' ? 'above your highest door' : ''].filter(Boolean).join(' and another ');
      return `A traveller landed ${where}, outside your fences: the portal does not map into your co-domain.`;
    }
    const names = [low === 'wide' ? 'lowest' : '', high === 'wide' ? 'highest' : ''].filter(Boolean);
    return `The ${names.join(' and ')} door${names.length > 1 ? 's' : ''} of your co-domain stayed dark all day, because nobody ever lands there: the return portal cannot switch on, so f is not onto.`;
  }
  return 'The Mayor’s ledger did not balance: the number of ways the travellers can be arranged is different from your count.';
}
export function spotText(r: Round, v: Record<string, number>): string {
  if (r.lin) {
    // The paid test walk may show a number: where one test traveller, traveller 1, comes out. It gives one equation, not both p and q.
    const L = landing(r, v, 1);
    if (!L) return 'A portal cannot divide by zero.';
    return `Test walker: traveller 1 went through ${r.kind === 'compose' ? 'portals f and g' : 'portal f'} and came out of your return portal at ${ratio(L.num, L.den)}. Home is 1.`;
  }
  if (r.kind === 'domain') {
    const lo = Math.min(v.lo, v.hi);
    const hi = Math.max(v.lo, v.hi);
    const hit = collision(r, lo, hi);
    return `Test walkers: the travellers at ${dn(lo)} and ${dn(hi)} land on doors ${dn(r.f(lo))} and ${dn(r.f(hi))}. ${hit ? 'Some pair of travellers collides on these fences.' : 'No two travellers collide on these fences.'}`;
  }
  if (r.kind === 'range') return `Test walkers: the travellers at ${r.a} and ${r.b} land on doors ${dn(r.f(r.a))} and ${dn(r.f(r.b))}.`;
  return `Test walkers: traveller 1 has ${r.n - r.k} doors to choose from; once he has picked, the next traveller has one fewer.`;
}

/** After a hit: the working. */
export function explain(r: Round): string {
  if (r.lin) {
    const { a, b, c, d } = r.lin;
    const { p, q } = r.ans;
    const undo = (k: number) => `(y ${sgn(-k)} ${Math.abs(k)})/${paren(q)}`;
    if (r.kind === 'inverse') return `f(x) = ${linText(a, b)}. To undo it, ${b >= 0 ? `subtract ${b}` : `add ${-b}`} and divide by ${dn(a)}: f⁻¹(y) = ${undo(b)}. So p = ${dn(b)}, q = ${dn(a)}.`;
    return `g(f(x)) = g(${r.lin.fText}) = ${linText(q, p)}. Undo that: x = ${undo(p)}. In the other order, f(g(x)) = ${linText(c * a, a * d + b)}, which is a different map: the order of composition matters.`;
  }
  if (r.kind === 'domain') {
    const t = r.turns.map(dn).join(' and ');
    return `${r.fnText} turns at x = ${t}, so it is strictly monotone between turning points and one-one there. Pip is at ${dn(r.pip)}, so the widest one-one stretch is [${dn(r.ans.lo)}, ${dn(r.ans.hi)}].`;
  }
  if (r.kind === 'range') return `On [${dn(r.a)}, ${dn(r.b)}], ${r.fnText} takes every value between ${dn(r.ans.lo)} and ${dn(r.ans.hi)} (the extremes are at the ends or at the turning point), so f is onto exactly when the co-domain is [${dn(r.ans.lo)}, ${dn(r.ans.hi)}].`;
  return `A one-one map of ${r.n} travellers onto ${r.n} doors: ${Array.from({ length: r.n }, (_, i) => r.n - i).join(' × ')} = ${r.ans.c} ways (a finite set: one-one means onto too).`;
}
export function intel(r: Round): string {
  if (r.lin && r.kind === 'inverse') return `Portal f sends traveller x to door ${r.lin.fText}. Build the return portal g(y) = (y − p)/q so every traveller gets home.`;
  if (r.lin) return `Travellers go through portal f(x) = ${r.lin.fText}, then portal g(x) = ${r.lin.gText}. Build one return portal (y − p)/q that brings them all home.`;
  if (r.kind === 'domain') return `${r.fnText} on the real line. Pip stands at ${dn(r.pip)}. Place the two fences so f is one-one and as wide as possible around Pip.`;
  if (r.kind === 'range') return `${r.fnText} for travellers from ${dn(r.a)} to ${dn(r.b)}. Place the two fences of the doors so every door is used and no traveller lands outside.`;
  return `${r.n} travellers cross to ${r.n} doors, one traveller per door. Count the ways the portal can be one-one.`;
}
/** Levels 4 and 5: what the helper does in this round (ghosts show where your return portal would send each traveller). */
export const aidLine = (r: Round) =>
  r.assist === 0 ? 'Ghost travellers show where your return portal would send everyone.' : r.assist === 1 ? 'The ghosts show for a moment after a test walk, which costs a charge.' : 'Boss round: no ghosts, no test walk.';
