// Pure rules of Culture Dish: no DOM, no canvas. Petri the lab robot has three jobs. Level 1: a specimen card with a differential equation falls toward the
// floor and the scanner must be set to its order and degree before it lands. Level 2: a colony obeys dy/dt = k·y, and the lamp setting k must hit a reading.
// Level 3: the dish swings by y″ + m²y = 0, and m must make a set number of full swings in one turn of the lamp.
import { aid } from '@core/dialgame';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'scan' | 'grow' | 'swing';
export interface Round {
  kind: Kind;
  /** The equation as written, and (scan) the highest derivative in it. */
  text: string;
  highest: string;
  /** Scan: the order and the degree (0 when the degree is not defined). */
  order: number;
  degree: number;
  /** Grow: the starting colony c, the time T, and the exponent the reading shows (c·e^exp). Swing: the swings n wanted. */
  c: number;
  T: number;
  exp: number;
  swings: number;
  /** The winning lamp setting: k (grow) or m (swing). */
  ans: number;
  min: number;
  max: number;
  start: number;
  /** Seconds the specimen takes to fall (scan). */
  fall: number;
  assist: 0 | 1 | 2;
}

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
const sup = (n: number) => (n === 1 ? '' : ['', '', '²', '³', '⁴'][n]);
const coef = (a: number) => (a === 1 ? '' : String(a));
const D = ['y', 'dy/dx', 'd²y/dx²', 'd³y/dx³'];

const blank = { order: 0, degree: 0, c: 0, T: 0, exp: 0, swings: 0, ans: 0, min: 0, max: 0, start: 0, fall: 18, assist: 0 as const };

/** A specimen card: the equation, its order and its degree (0 when the degree is not defined). */
function specimen(kind: 'plain' | 'power' | 'undefined', random: () => number): Round {
  const a = ri(2, 5, random);
  if (kind === 'plain') {
    const order = ri(1, 3, random);
    const n = ri(1, 3, random);
    // The highest derivative carries the power; lower terms are linear so they cannot mislead.
    const text = `${n === 1 ? '' : '('}${D[order]}${n === 1 ? '' : `)${sup(n)}`} + ${a}${order > 1 ? D[order - 1] : 'y'} = x`;
    return { ...blank, kind: 'scan', text, highest: D[order], order, degree: n, assist: 0 };
  }
  if (kind === 'power') {
    const order = ri(2, 3, random);
    const n = ri(2, 3, random);
    // The power sits on a lower derivative: it does not change the degree (the power of the highest derivative, which is 1).
    const text = `${D[order]} + ${coef(a)}(${D[order - 1]})${sup(n)} + y = 0`;
    return { ...blank, kind: 'scan', text, highest: D[order], order, degree: 1, assist: 0 };
  }
  const order = ri(1, 3, random);
  const fn = pick(['sin', 'cos', 'e^'], random);
  const text = fn === 'e^' ? `${D[order]} + e^(${D[order]}) = x` : `${D[order]} + ${fn}(${D[order]}) = 0`;
  return { ...blank, kind: 'scan', text, highest: D[order], order, degree: 0, assist: 0 };
}

function growth(random: () => number): Round {
  const c = pick([2, 3, 5, 10], random);
  const T = ri(1, 3, random);
  const k = pick([-4, -3, -2, -1, 1, 2, 3, 4], random);
  return { ...blank, kind: 'grow', text: 'dy/dt = k·y', highest: 'dy/dt', c, T, exp: k * T, ans: k, min: -5, max: 5, start: 0 };
}

function swing(random: () => number): Round {
  const n = ri(2, 6, random);
  return { ...blank, kind: 'swing', text: 'd²y/dt² + m²y = 0', highest: 'd²y/dt²', swings: n, ans: n, min: 0, max: 8, start: 0 };
}

export function buildRounds(level: number, random: () => number): Round[] {
  let makers: (() => Round)[];
  if (level === 1) makers = [() => specimen('plain', random), () => specimen('power', random), () => specimen('undefined', random)];
  else if (level === 2) makers = [() => growth(random), () => growth(random), () => growth(random)];
  else makers = [() => swing(random), () => swing(random), () => swing(random)];
  const out: Round[] = [];
  makers.forEach((make, i) => {
    let r = make();
    for (let t = 0; t < 50 && out.some((o) => o.text === r.text && o.ans === r.ans && o.c === r.c && o.T === r.T); t++) r = make();
    // The falling specimen gets faster each round.
    out.push({ ...r, fall: [18, 15, 12][i], assist: aid(i) });
  });
  return out;
}

/** Scan: the setting is {order, degree}. Grow and swing: one number. */
export const judgeScan = (r: Round, order: number, degree: number) => order === r.order && degree === r.degree;
export const judge = (r: Round, v: number) => v === r.ans;
/** The colony after T hours with setting k, as the exponent of e in c·e^(kT). */
export const exponent = (r: Round, k: number) => k * r.T;
/** Full swings the dish makes in one turn of the lamp (t from 0 to 2π) with frequency m. */
export const swingsFor = (m: number) => m;

export const intel = (r: Round): string => {
  if (r.kind === 'scan') return `Set the scanner to the order and the degree of ${r.text}. The specimen lands in ${r.fall} seconds.`;
  if (r.kind === 'grow') return `The colony starts at ${r.c} and obeys ${r.text}. After ${r.T} hour${r.T === 1 ? '' : 's'} it must read ${r.c}·e^${num(r.exp)}. Set the lamp k.`;
  return `The dish obeys ${r.text}. In one turn of the lamp (t from 0 to 2π) it must make exactly ${r.swings} full swings. Set m.`;
};

const degreeWord = (d: number) => (d === 0 ? 'not defined' : String(d));
/** A magnifier: which derivative is the highest, never the order or degree. */
export const magnify = (r: Round) => `Magnifier: the highest derivative in this specimen is ${r.highest}.`;
/** A test of the lamp setting, never the right one. */
export function spotText(r: Round, v: number): string {
  if (r.kind === 'grow') return `Incubator test with k = ${num(v)}: after ${r.T} hour${r.T === 1 ? '' : 's'} the colony would read ${r.c}·e^${num(exponent(r, v))}.`;
  return `Swing test with m = ${v}: in one turn of the lamp the dish makes ${swingsFor(v)} full swing${swingsFor(v) === 1 ? '' : 's'}.`;
}
/** After a miss. */
export function missText(r: Round, v: number, order = 0, degree = 0): string {
  if (r.kind === 'scan') {
    const bits: string[] = [];
    if (order !== r.order) bits.push(order < r.order ? 'the order is too low: a higher derivative is still in the equation' : 'the order is too high: no derivative that high appears');
    if (degree !== r.degree) bits.push(r.degree === 0 ? 'a derivative inside sin, cos or e is not a power, so the degree is not defined' : degree === 0 ? 'the equation is a polynomial in its derivatives, so a degree exists' : 'the degree is the power of the highest derivative only');
    return `The scanner flagged the specimen: ${bits.join('; ')}.`;
  }
  if (r.kind === 'grow') {
    const e = exponent(r, v);
    return `After ${r.T} hour${r.T === 1 ? '' : 's'} the colony reads ${r.c}·e^${num(e)}, ${e > r.exp ? 'above' : 'below'} the reading wanted.`;
  }
  return `The dish made ${swingsFor(v)} full swing${swingsFor(v) === 1 ? '' : 's'} in one turn of the lamp, ${v > r.swings ? 'more' : 'fewer'} than the ${r.swings} wanted.`;
}
/** After a hit. */
export function explain(r: Round): string {
  if (r.kind === 'scan') return `The highest derivative is ${r.highest}, so the order is ${r.order}. ${r.degree === 0 ? 'The derivative sits inside a function (sin, cos or e), so the equation is not a polynomial in its derivatives and the degree is not defined.' : `Its power is ${r.degree}, so the degree is ${r.degree}. Only the power of the highest derivative counts.`}`;
  if (r.kind === 'grow') return `Separating, dy/y = k dt gives y = c·e^(kt). At t = ${r.T}: y = ${r.c}·e^(${r.T}k), so ${r.T}k = ${num(r.exp)} and k = ${num(r.ans)}.`;
  return `y″ = −m²y has the solution y = A cos(mt) + B sin(mt), with period 2π/m. In a turn of 2π it makes m full swings, so m = ${r.ans}.`;
}
export { degreeWord };
