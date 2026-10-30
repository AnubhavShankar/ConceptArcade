// Pure rules of Panel Tilt: no DOM, no canvas. Sol the solar installer works with a panel that is the parallelogram spanned by two support vectors a and b.
// Level 1: set the mount bolt to exactly a × b (direction by the right-hand rule, length equal to the panel's area). Level 2: one component of b is unknown
// and the panel must have a given area |a × b|. Level 3: one component of b is unknown and the supports must be parallel, a × b = 0.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'mount' | 'area' | 'parallel';
export type V3 = [number, number, number];
export interface Round {
  kind: Kind;
  a: V3;
  /** b with its unknown component(s): for mount b is complete; for area and parallel b[2] (area) or b[0] (parallel) is replaced by the dial. */
  b: V3;
  /** Which component of b is the dial (area: 2, parallel: 0; mount: none). */
  free: number;
  /** The panel area wanted (area). */
  T: number;
  /** The winning dial values: the three bolt components (mount) or the single unknown. */
  ans: number[];
  min: number;
  max: number;
  start: number[];
  assist: 0 | 1 | 2;
}

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const size = (v: V3) => Math.hypot(v[0], v[1], v[2]);
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const isSquare = (n: number) => Number.isInteger(Math.sqrt(n));
const rv = (random: () => number): V3 => [ri(-3, 3, random), ri(-3, 3, random), ri(-3, 3, random)];
const blank = { T: 0, min: 0, max: 0, start: [0] as number[], assist: 0 as const };

function mount(random: () => number): Round {
  for (;;) {
    const a = rv(random);
    const b = rv(random);
    const n = cross(a, b);
    if (n.every((x) => x === 0) || n.some((x) => Math.abs(x) > 12)) continue;
    // at least two nonzero parts, so the bolt is not an axis
    if (n.filter((x) => x !== 0).length < 2) continue;
    return { ...blank, kind: 'mount', a, b, free: -1, ans: n, min: -12, max: 12, start: [0, 0, 0] };
  }
}
function area(random: () => number): Round {
  for (;;) {
    const a = rv(random);
    const b = rv(random);
    const free = 2;
    const n = cross(a, b);
    const T2 = n[0] ** 2 + n[1] ** 2 + n[2] ** 2;
    if (T2 === 0 || !isSquare(T2) || a[0] === 0 && a[1] === 0) continue;
    const T = Math.sqrt(T2);
    // exactly one dial value from 0 to 9 gives that area
    const wins = Array.from({ length: 10 }, (_, l) => l).filter((l) => Math.abs(size(cross(a, [b[0], b[1], l])) - T) < 1e-9);
    if (wins.length !== 1 || wins[0] !== b[2] || b[2] < 1) continue;
    return { ...blank, kind: 'area', a, b, free, T, ans: [b[2]], min: 0, max: 9, start: [0] };
  }
}
function parallel(random: () => number): Round {
  for (;;) {
    const a = rv(random);
    if (a[1] === 0 || a[2] === 0 || a[0] === 0) continue;
    const t = pick([-3, -2, -1, 2, 3], random);
    const l = t * a[0];
    if (Math.abs(l) > 9) continue;
    return { ...blank, kind: 'parallel', a, b: [l, t * a[1], t * a[2]], free: 0, ans: [l], min: -9, max: 9, start: [0] };
  }
}

export function buildRounds(level: number, random: () => number): Round[] {
  const make = level === 1 ? mount : level === 2 ? area : parallel;
  const out: Round[] = [];
  for (let i = 0; i < 3; i++) {
    let r = make(random);
    for (let t = 0; t < 80 && out.some((o) => o.a.join() === r.a.join() && o.b.join() === r.b.join()); t++) r = make(random);
    // The start must not already win.
    out.push({ ...r, start: r.ans.map((x) => (x === 0 ? 1 : 0)), assist: aid(i) });
  }
  return out;
}

export const judge = (r: Round, v: number[]) => r.ans.every((x, i) => x === v[i]);
/** b with the player's setting put in. */
export function bWith(r: Round, v: number[]): V3 {
  if (r.kind === 'mount') return r.b;
  const b: V3 = [...r.b];
  b[r.free] = v[0];
  return b;
}
/** The bolt n and the panel's own normal for the current setting. */
export const normal = (r: Round, v: number[]): V3 => (r.kind === 'mount' ? [v[0], v[1], v[2]] : cross(r.a, bWith(r, v)));

const vec = (p: V3) => `(${num(p[0])}, ${num(p[1])}, ${num(p[2])})`;
const one = (x: number) => num(Math.round(x * 10) / 10);

export function intel(r: Round): string {
  if (r.kind === 'mount') return `The panel is spanned by a = ${vec(r.a)} and b = ${vec(r.b)}. Set the mount bolt to a × b: square to the panel, by the right-hand rule, as long as the panel's area.`;
  if (r.kind === 'area') return `The panel is spanned by a = ${vec(r.a)} and b = (${num(r.b[0])}, ${num(r.b[1])}, c). It must have an area of exactly ${num(r.T)}. Set c.`;
  return `The supports are a = ${vec(r.a)} and b = (c, ${num(r.b[1])}, ${num(r.b[2])}). They must be parallel, so the panel folds flat. Set c.`;
}
/** A bolt test: how the mount sits against the panel, never the right mount. */
export function spotText(r: Round, v: number[]): string {
  if (r.kind === 'mount') {
    const n = normal(r, v);
    return `Bolt test: the mount is ${dot(n, r.a) === 0 && dot(n, r.b) === 0 ? 'square to both supports' : `not square: n·a = ${num(dot(n, r.a))}, n·b = ${num(dot(n, r.b))}`}.`;
  }
  const n = normal(r, v);
  return `Panel test with c = ${num(v[0])}: the panel area is ${one(size(n))}.`;
}
/** After a miss. */
export function missText(r: Round, v: number[]): string {
  const n = normal(r, v);
  if (r.kind === 'mount') {
    const t = cross(r.a, r.b);
    const square = dot(n, r.a) === 0 && dot(n, r.b) === 0;
    if (!square) return `The bolt is not square to the panel: n·a = ${num(dot(n, r.a))} and n·b = ${num(dot(n, r.b))}, so the panel tilts off the sun.`;
    if (n.every((x, i) => x === -t[i])) return 'The bolt is square to the panel but points the wrong way: the right-hand rule from a to b puts it the other side.';
    return `The bolt is square to the panel but its length is ${one(size(n))}, not the area of the panel.`;
  }
  if (r.kind === 'area') return `The panel has area ${one(size(n))}, ${size(n) > r.T ? 'bigger' : 'smaller'} than the ${num(r.T)} wanted.`;
  const s = size(n);
  return `The supports are not parallel: the panel still has area ${one(s)}, so it will not fold flat.`;
}
/** After a hit: the working. */
export function explain(r: Round): string {
  const n = cross(r.a, r.b);
  if (r.kind === 'mount') return `a × b = (a₂b₃ − a₃b₂, a₃b₁ − a₁b₃, a₁b₂ − a₂b₁) = ${vec(r.ans as V3)}. Its length ${one(size(n))} is the area of the parallelogram.`;
  if (r.kind === 'area') return `Put b = (${num(r.b[0])}, ${num(r.b[1])}, c) into a × b and take |a × b| = ${num(r.T)}: the only c from 0 to 9 that fits is ${num(r.ans[0])}.`;
  return `Parallel vectors have a × b = 0, so b is a multiple of a: b = ${num(r.b[1] / r.a[1])}·a, which gives c = ${num(r.ans[0])}.`;
}
