// Pure rules of Portal Line: no DOM, no canvas. Travellers walk through a portal f. Level 1 fences the domain so that f is one-one (as wide
// as possible, around Pip); level 2 fences the co-domain so that f is onto; level 3 counts the one-one maps of a finite set onto itself.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';

export type Kind = 'domain' | 'range' | 'count';
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
}

export const DOMAIN = { min: -5, max: 5 };
export const RANGE = { min: -30, max: 30 };
export const COUNT = { min: 1, max: 130 };

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

export function buildRounds(level: number, random: () => number): Round[] {
  let rs: Round[];
  if (level === 1) rs = [0, 1, 2].map((v) => domainRound(v, random));
  else if (level === 2) rs = [0, 1, 2].map((v) => rangeRound(v, random));
  else rs = [countRound(3, 0), countRound(4, 0), countRound(5, 0)];
  return rs.map((r, i) => ({ ...r, assist: aid(i) }));
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

/** After a miss: what happened at the portal, never the fence that works. */
export function missText(r: Round, v: Record<string, number>): string {
  if (r.kind === 'domain') {
    const lo = Math.min(v.lo, v.hi);
    const hi = Math.max(v.lo, v.hi);
    if (r.pip < lo || r.pip > hi) return 'Pip was left outside your fences and could not cross.';
    const hit = collision(r, lo, hi);
    if (hit) return `Travellers ${dn(hit[0])} and ${dn(hit[1])} both landed on door ${dn(r.f(hit[0]))} and fell over: the portal was not one-one on your fences.`;
    return 'Everyone crossed safely, but the Mayor wants every traveller who can cross safely to cross, and your fences kept one back.';
  }
  if (r.kind === 'range') {
    const [lo, hi] = imageOf(r, r.a, r.b);
    const l = Math.min(v.lo, v.hi);
    const h = Math.max(v.lo, v.hi);
    if (l > lo || h < hi) return `A traveller landed on door ${dn(l > lo ? lo : hi)}, outside your fences: the portal does not map into your co-domain.`;
    return `Door ${dn(l < lo ? l : h)} stayed dark all day, because nobody ever lands there: the return portal cannot switch on, so f is not onto.`;
  }
  return 'The Mayor’s ledger did not balance: the number of ways the travellers can be arranged is different from your count.';
}
export function spotText(r: Round, v: Record<string, number>): string {
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
  if (r.kind === 'domain') {
    const t = r.turns.map(dn).join(' and ');
    return `${r.fnText} turns at x = ${t}, so it is strictly monotone between turning points and one-one there. Pip is at ${dn(r.pip)}, so the widest one-one stretch is [${dn(r.ans.lo)}, ${dn(r.ans.hi)}].`;
  }
  if (r.kind === 'range') return `On [${dn(r.a)}, ${dn(r.b)}], ${r.fnText} takes every value between ${dn(r.ans.lo)} and ${dn(r.ans.hi)} (the extremes are at the ends or at the turning point), so f is onto exactly when the co-domain is [${dn(r.ans.lo)}, ${dn(r.ans.hi)}].`;
  return `A one-one map of ${r.n} travellers onto ${r.n} doors: ${Array.from({ length: r.n }, (_, i) => r.n - i).join(' × ')} = ${r.ans.c} ways (a finite set: one-one means onto too).`;
}
export function intel(r: Round): string {
  if (r.kind === 'domain') return `${r.fnText} on the real line. Pip stands at ${dn(r.pip)}. Place the two fences so f is one-one and as wide as possible around Pip.`;
  if (r.kind === 'range') return `${r.fnText} for travellers from ${dn(r.a)} to ${dn(r.b)}. Place the two fences of the doors so every door is used and no traveller lands outside.`;
  return `${r.n} travellers cross to ${r.n} doors, one traveller per door. Count the ways the portal can be one-one.`;
}
