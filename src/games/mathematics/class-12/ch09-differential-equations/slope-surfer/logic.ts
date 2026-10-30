// Pure rules of Slope Surfer: no DOM, no canvas. Surf rides one curve of the family of solutions of a differential equation. The curve is picked by the
// constant C, and exactly one whole-number C makes the ride pass through the beacon. The general solution is always known in closed form.
import { aid } from '@core/dialgame';
import { num, poly } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'direct' | 'sep' | 'homog' | 'linear';
export interface Round {
  kind: Kind;
  /** The equation as written, the general solution as written, and how C comes out of the beacon. */
  de: string;
  general: string;
  calc: string;
  /** The slope the equation gives at (x, y), and the height of the curve with constant C at x (NaN where it does not exist). */
  slope: (x: number, y: number) => number;
  curve: (x: number, c: number) => number;
  /** The beacon, the stretch of x the ride covers, and the winning C. */
  xb: number;
  yb: number;
  xs: number;
  xe: number;
  ans: number;
  cmin: number;
  cmax: number;
  start: number;
  assist: 0 | 1 | 2;
}

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
const nonzero = (lo: number, hi: number, random: () => number) => {
  let v = 0;
  while (v === 0) v = ri(lo, hi, random);
  return v;
};
const sgn = (c: number) => (c < 0 ? '−' : '');

function direct(random: () => number): Round {
  const c3 = pick([-1, 1, 2], random);
  const c2 = ri(-3, 3, random);
  const c1 = ri(-4, 4, random);
  const G = (x: number) => c3 * x ** 3 + c2 * x * x + c1 * x;
  const xb = ri(1, 3, random);
  const ans = nonzero(-9, 9, random);
  const g: [number, number][] = [[3 * c3, 2], [2 * c2, 1], [c1, 0]];
  return {
    kind: 'direct',
    de: `dy/dx = ${poly(g, 'x')}`,
    general: `y = ${poly([[c3, 3], [c2, 2], [c1, 1]], 'x')} + C`,
    calc: `C = ${G(xb) + ans} − (${G(xb)}) = ${ans}`,
    slope: (x) => 3 * c3 * x * x + 2 * c2 * x + c1,
    curve: (x, c) => G(x) + c,
    xb,
    yb: G(xb) + ans,
    xs: 0,
    xe: 4,
    ans,
    cmin: -12,
    cmax: 12,
    start: 0,
    assist: 0,
  };
}

function separable(variant: 'pow' | 'circle' | 'hyper', random: () => number): Round {
  if (variant === 'pow') {
    const k = ri(1, 3, random);
    const xb = ri(1, 3, random);
    const ans = nonzero(-6, 6, random);
    return {
      kind: 'sep', de: `dy/dx = ${k === 1 ? '' : k}y/x`, general: `y = C·x${k === 1 ? '' : ['', '', '²', '³'][k]}`, calc: `C = ${ans * xb ** k}/${xb ** k} = ${ans}`,
      slope: (x, y) => (k * y) / x, curve: (x, c) => c * x ** k, xb, yb: ans * xb ** k, xs: 0.3, xe: 4, ans, cmin: -9, cmax: 9, start: 0, assist: 0,
    };
  }
  const xb = ri(1, 4, random);
  const yb = ri(1, 5, random);
  if (variant === 'circle') {
    const ans = xb * xb + yb * yb;
    return {
      kind: 'sep', de: 'dy/dx = −x/y', general: 'x² + y² = C', calc: `C = ${xb}² + ${yb}² = ${ans}`,
      slope: (x, y) => -x / y, curve: (x, c) => (c - x * x >= 0 ? Math.sqrt(c - x * x) : Number.NaN), xb, yb, xs: 0, xe: 6, ans, cmin: 0, cmax: 45, start: 0, assist: 0,
    };
  }
  const ans = yb * yb - xb * xb;
  return {
    kind: 'sep', de: 'dy/dx = x/y', general: 'y² − x² = C', calc: `C = ${yb}² − ${xb}² = ${ans}`,
    slope: (x, y) => x / y, curve: (x, c) => (x * x + c >= 0 ? Math.sqrt(x * x + c) : Number.NaN), xb, yb, xs: 0, xe: 5, ans, cmin: -16, cmax: 25, start: 0, assist: 0,
  };
}

function homogeneous(random: () => number): Round {
  const k = pick([2, 3], random);
  const a = k === 2 ? nonzero(-3, 3, random) : pick([-4, -2, 2, 4], random);
  const A = a / (1 - k);
  const xb = ri(1, 3, random);
  const ans = nonzero(-5, 5, random);
  const yb = ans * xb ** k + A * xb;
  return {
    kind: 'homog',
    de: `dy/dx = (${sgn(a)}${Math.abs(a)}x + ${k}y)/x`,
    general: `y = C·x${k === 2 ? '²' : '³'} ${A < 0 ? '−' : '+'} ${Math.abs(A) === 1 ? '' : Math.abs(A)}x`,
    calc: `C = (${yb} − (${num(A)})·${xb}) / ${xb ** k} = ${ans}`,
    slope: (x, y) => (a * x + k * y) / x,
    curve: (x, c) => c * x ** k + A * x,
    xb,
    yb,
    xs: 0.3,
    xe: 4,
    ans,
    cmin: -9,
    cmax: 9,
    start: 0,
    assist: 0,
  };
}

function linear(random: () => number): Round {
  for (;;) {
    const m = ri(1, 2, random);
    const j = ri(0, 1, random);
    const qq = pick([-2, -1, 1, 2], random);
    const q = (m + j + 1) * qq;
    const xb = ri(1, 3, random);
    const yb = nonzero(-6, 9, random);
    const ans = yb * xb ** m - qq * xb ** (m + j + 1);
    if (Math.abs(ans) > 20) continue;
    const top = `${qq === 1 ? '' : qq === -1 ? '−' : qq}x${['', '', '²', '³', '⁴'][m + j + 1]}`;
    return {
      kind: 'linear',
      de: `dy/dx + ${m === 1 ? '' : m}y/x = ${q}${j === 1 ? 'x' : ''}`,
      general: `x${m === 1 ? '' : ['', '', '²'][m]}·y = ${top} + C`,
      calc: `C = ${xb ** m}·${yb} − (${qq * xb ** (m + j + 1)}) = ${ans}`,
      slope: (x, y) => q * x ** j - (m * y) / x,
      curve: (x, c) => (qq * x ** (m + j + 1) + c) / x ** m,
      xb,
      yb,
      xs: 0.5,
      xe: 4,
      ans,
      cmin: -20,
      cmax: 20,
      start: 0,
      assist: 0,
    };
  }
}

export function buildRounds(level: number, random: () => number): Round[] {
  const makers: (() => Round)[] =
    level === 1 ? [() => direct(random), () => direct(random), () => direct(random)]
    : level === 2 ? [() => separable('pow', random), () => separable('circle', random), () => separable('hyper', random)]
    : level === 3 ? [() => homogeneous(random), () => homogeneous(random), () => homogeneous(random)]
    : [() => linear(random), () => linear(random), () => linear(random)];
  const out: Round[] = [];
  makers.forEach((make, i) => {
    let r = make();
    // Every dial starts at 0, the same for every row, so a row whose answer is 0 (which the start would win) is drawn again.
    for (let t = 0; t < 200 && (r.ans === START || out.some((o) => o.de === r.de && o.xb === r.xb && o.ans === r.ans)); t++) r = make();
    out.push({ ...r, start: START, assist: aid(i) });
  });
  return out;
}

/** The constant every round starts at. */
export const START = 0;

export const judge = (r: Round, c: number) => c === r.ans;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
/** True when the curve with constant c passes through the beacon. */
export const passes = (r: Round, c: number) => near(r.curve(r.xb, c), r.yb);

const round2 = (x: number) => num(Math.round(x * 100) / 100);
export const intel = (r: Round) => `The wind is ${r.de}. Surf must pass through the beacon at (${r.xb}, ${num(r.yb)}).`;
/** A test ride: the height the board would have at the beacon, never the constant. */
export function spotText(r: Round, c: number): string {
  const h = r.curve(r.xb, c);
  return Number.isNaN(h) ? `Test ride with C = ${num(c)}: the curve ends before it reaches x = ${r.xb}.` : `Test ride with C = ${num(c)}: at x = ${r.xb} the board is at height ${round2(h)}.`;
}
/** On which side of the beacon the board crosses x = xb: above, below, or nowhere (the curve does not exist there). */
export function missSide(r: Round, c: number): 'above' | 'below' | 'none' {
  const h = r.curve(r.xb, c);
  return Number.isNaN(h) ? 'none' : h > r.yb ? 'above' : 'below';
}
/** After a miss: the side only, with no height and no number from the player's constant (the paid test ride is the only place that prints one). */
export function missText(r: Round, c: number): string {
  const side = missSide(r, c);
  if (side === 'none') return `The ride ended before it reached the beacon: with this C the curve does not exist at x = ${r.xb}.`;
  return `The board crossed x = ${r.xb} ${side} the beacon.`;
}
/**
 * The y frame of the picture: fixed, from the family's own curves at the two ends of the dial. Every curve of the family lies between them, so it holds the true
 * curve and the beacon whatever the answer is, and it is the same for any answer.
 */
export function frameOf(r: Round): [number, number] {
  const ys: number[] = [];
  for (const c of [r.cmin, r.cmax]) {
    for (let i = 0; i <= 60; i++) {
      const y = r.curve(r.xs + ((r.xe - r.xs) * i) / 60, c);
      if (Number.isFinite(y)) ys.push(y);
    }
  }
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const pad = (hi - lo) * 0.08 + 0.5;
  return [lo - pad, hi + pad];
}
/** After a hit: the working. */
export function explain(r: Round): string {
  const how: Record<Kind, string> = {
    direct: 'Integrate both sides.',
    sep: 'Separate the variables and integrate.',
    homog: 'Put y = vx and separate (or solve the linear form).',
    linear: 'Multiply by the integrating factor, a power of x, and integrate.',
  };
  return `${how[r.kind]} The general solution is ${r.general}. Through (${r.xb}, ${num(r.yb)}): ${r.calc}.`;
}
