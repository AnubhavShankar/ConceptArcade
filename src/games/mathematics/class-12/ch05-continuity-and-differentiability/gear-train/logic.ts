// Pure rules of Gear Train: no DOM, no canvas. The player sets the crank speed w (a whole number); the machine's output rate is
// (mn/md)·w for a first derivative (the chain rule: output rate = derivative × input rate) or (mn/md)·w² for a second derivative.
// The derivative is kept as a fraction mn/md so every comparison is exact.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { shuffle } from '@core/quiz';

export type Kind = 'power' | 'exp' | 'log' | 'base' | 'circle' | 'hyper' | 'param' | 'second';
export interface Round {
  kind: Kind;
  /** The machine in words: the function and the instant. */
  machine: string;
  /** The derivative at that instant is mn/md; the output rate is (mn/md)·w^order. */
  mn: number;
  md: number;
  order: 1 | 2;
  /** The whole-number crank speed that hits the target. */
  ans: number;
  /** The target output rate. */
  target: number;
  /** The unit the output is counted in: '' or 'e²' or 'ln 3'. */
  unit: string;
  assist: 0 | 1 | 2;
  /** The function itself, the x where its derivative is taken, and the value of the unit (e^g, ln a): used by tests to check mn/md numerically. */
  fn: (x: number) => number;
  x0: number;
  unitVal: number;
}

export const DIAL = { min: 1, max: 12 };
const pick = <T>(xs: readonly T[], random: () => number, n = 1): T[] => shuffle(xs, random).slice(0, n);
const sup = (n: number) => String(n).replace(/[0-9-]/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'['0123456789-'.indexOf(c)]);
const lin = (a: number, b: number) => (a === 1 ? 'x' : `${a}x`) + (b === 0 ? '' : b > 0 ? ` + ${b}` : ` − ${-b}`);
const eText = (g: number) => (g === 1 ? 'e' : `e${sup(g)}`);

export const output = (r: Round, w: number) => (r.mn * w ** r.order) / r.md;

type Spec = Pick<Round, 'kind' | 'machine' | 'mn' | 'order' | 'unit' | 'fn' | 'x0' | 'unitVal'> & { md?: number };
/** Choose a crank speed whose target has at most two decimals, then fix the round. */
function make(s: Spec, k: number, random: () => number): Round {
  const md = s.md ?? 1;
  const ok = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((w) => Math.round(s.mn * w ** s.order * 100) % md === 0);
  const ans = pick(ok, random)[0];
  return { ...s, md, ans, target: (s.mn * ans ** s.order) / md, assist: aid(k) };
}

export function buildRounds(level: number, random: () => number): Round[] {
  if (level === 1) {
    const mk = ([n, a, b, x0]: number[], k: number): Round => {
      const u = a * x0 + b;
      return make({ kind: 'power', machine: `y = (${lin(a, b)})${sup(n)} at x = ${x0}`, mn: n * a * u ** (n - 1), order: 1, unit: '', fn: (x) => (a * x + b) ** n, x0, unitVal: 1 }, k, random);
    };
    const [p, q] = pick([[2, 1, 1, 2], [2, 2, 1, 1], [3, 1, 1, 1], [3, 2, -1, 1], [2, 3, -1, 1], [3, 1, 2, 0]], random, 2);
    const [a, b, x0] = pick([[1, 1, 1], [1, 0, 1], [1, 2, 0]], random)[0];
    const u = a * x0 + b;
    return [mk(p, 0), mk(q, 1), make({ kind: 'power', machine: `y = ((${lin(a, b)})² + 1)² at x = ${x0}`, mn: 4 * a * u * (u * u + 1), order: 1, unit: '', fn: (x) => ((a * x + b) ** 2 + 1) ** 2, x0, unitVal: 1 }, 2, random)];
  }
  if (level === 2) {
    const [qa, qb, qx] = pick([[1, 0, 1], [1, 1, 1], [2, 0, 1], [1, -1, 2]], random)[0];
    const g0 = qa * qx * qx + qb * qx;
    const g = `${qa === 1 ? '' : qa}x²${qb === 0 ? '' : qb > 0 ? ` + ${qb === 1 ? '' : qb}x` : ` − ${qb === -1 ? '' : -qb}x`}`;
    const [x0, c, mn, md] = pick([[1, 1, 1, 1], [2, 1, 4, 5], [3, 1, 3, 5], [1, 3, 1, 2], [4, 4, 2, 5]], random)[0];
    const [base, ex, bx] = pick([[2, 1, 2], [3, 1, 2], [2, 2, 1], [3, 2, 1]], random)[0];
    const val = base ** bx ** ex;
    return [
      make({ kind: 'exp', machine: `y = e^(${g}) at x = ${qx}`, mn: 2 * qa * qx + qb, order: 1, unit: eText(g0), fn: (x) => Math.exp(qa * x * x + qb * x), x0: qx, unitVal: Math.exp(g0) }, 0, random),
      make({ kind: 'log', machine: `y = ln(x² + ${c}) at x = ${x0}`, mn, md, order: 1, unit: '', fn: (x) => Math.log(x * x + c), x0, unitVal: 1 }, 1, random),
      make({ kind: 'base', machine: `y = ${base}^${ex === 1 ? 'x' : `(x${sup(ex)})`} at x = ${bx}`, mn: val * ex * bx ** (ex - 1), order: 1, unit: `ln ${base}`, fn: (x) => base ** (x ** ex), x0: bx, unitVal: Math.log(base) }, 2, random),
    ];
  }
  if (level === 3) {
    const [cx, cy] = pick([[3, 4], [4, 3], [6, 8], [8, 6], [5, 12]], random)[0];
    const [hx, hy] = pick([[2, 3], [3, 2], [2, 6]], random)[0];
    const [a, b, t0] = pick([[1, 1, 2], [1, 2, 1], [2, 1, 2], [1, 1, 4]], random)[0];
    const R = Math.hypot(cx, cy);
    return [
      make({ kind: 'circle', machine: `a bead on x² + y² = ${cx ** 2 + cy ** 2} at (${cx}, ${cy}): x grows at w, and y falls at this rate`, mn: cx, md: cy, order: 1, unit: '', fn: (x) => Math.sqrt(R * R - x * x), x0: cx, unitVal: 1 }, 0, random),
      make({ kind: 'hyper', machine: `a bead on xy = ${hx * hy} at (${hx}, ${hy}): x grows at w, and y falls at this rate`, mn: hy, md: hx, order: 1, unit: '', fn: (x) => (hx * hy) / x, x0: hx, unitVal: 1 }, 1, random),
      make({ kind: 'param', machine: `a drone on x = ${a === 1 ? '' : a}t², y = ${b === 1 ? '' : b}t³ at t = ${t0}: x grows at w, and y grows at this rate`, mn: 3 * b * t0, md: 2 * a, order: 1, unit: '', fn: (x) => b * (x / a) ** 1.5, x0: a * t0 * t0, unitVal: 1 }, 2, random),
    ];
  }
  const P = (f: string, m: number, fn: (x: number) => number, x0: number) => ({ f, m, fn, x0 });
  const poly = pick([
    P('y = x³ at x = 2', 12, (x) => x ** 3, 2), P('y = x³ at x = 3', 18, (x) => x ** 3, 3), P('y = x⁴ at x = 1', 12, (x) => x ** 4, 1),
    P('y = x² + 5x at x = 4', 2, (x) => x * x + 5 * x, 4), P('y = x³ − 3x at x = 2', 12, (x) => x ** 3 - 3 * x, 2),
  ], random, 2);
  const boss = pick([P('y = x⁴ − x² at x = 2', 46, (x) => x ** 4 - x * x, 2), P('y = x⁵ at x = 1', 20, (x) => x ** 5, 1), P('y = x⁴ + x³ at x = 1', 18, (x) => x ** 4 + x ** 3, 1)], random)[0];
  return [poly[0], poly[1], boss].map((p, k) => make({ kind: 'second', machine: `${p.f}: x moves steadily at w, so y accelerates at this rate`, mn: p.m, order: 2, unit: '', fn: p.fn, x0: p.x0, unitVal: 1 }, k, random));
}

export const judge = (r: Round, w: number) => Math.abs(output(r, w) - r.target) < 1e-9;

const unitSuffix = (r: Round) => (r.unit ? ` ${r.unit}` : '');
/** A rate written with its unit. */
export const rateText = (r: Round, x: number) => `${fmt(x)}${unitSuffix(r)} per second`;

/** After a miss: what the machine did at that crank speed, never the speed that works. */
export function missText(r: Round, w: number): string {
  const out = output(r, w);
  const side = out < r.target ? 'too slowly to catch the dispatch window' : 'so fast that the dispatch window had already closed';
  return `The machine ran, and the output gear turned at ${rateText(r, out)}: ${side}.`;
}
export const spotText = (r: Round, w: number) => `Test run at w = ${w}: the output turns at ${rateText(r, output(r, w))}.`;

/** The derivative as the working writes it. */
const slope = (r: Round) => (r.md === 1 ? fmt(r.mn) : `${r.mn}/${r.md}`);

/** After a hit: the working. */
export function explain(r: Round): string {
  const unit = unitSuffix(r);
  const calc = `Output rate = ${slope(r)}${unit} × w${r.order === 2 ? '²' : ''}`;
  const solve = r.order === 2 ? `${fmt(r.target)} = ${slope(r)}w², so w² = ${r.ans ** 2} and w = ${r.ans}` : `${fmt(r.target)} = ${slope(r)}w, so w = ${r.ans}`;
  const why: Record<Kind, string> = {
    power: 'Chain rule: dy/dt = (dy/du)(du/dx)(dx/dt), each layer peeled from the outside in.',
    exp: 'd/dx e^g = g′ e^g, so the rate is g′(x) times e^g.',
    log: 'd/dx ln g = g′/g.',
    base: 'd/dx a^g = a^g (ln a) g′.',
    circle: 'Implicit: 2x + 2y(dy/dx) = 0, so the fall rate is (x/y)w.',
    hyper: 'Implicit: y + x(dy/dx) = 0, so the fall rate is (y/x)w.',
    param: 'dy/dx = (dy/dt)/(dx/dt), so the y rate is that slope times w.',
    second: 'With x moving steadily, y″ = (d²y/dx²)w².',
  };
  return `${why[r.kind]} ${calc}; ${solve}.`;
}

export const intel = (r: Round) => `${r.machine}. Target output: ${rateText(r, r.target)}.`;
