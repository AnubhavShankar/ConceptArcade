// Pure rules of Flow Control: no DOM, no canvas. Dewey the dam keeper closes the gate at a whole-number setting b so that the tank holds exactly the
// volume the town needs. The volume is a definite integral of the rate of flow, plus what the tank already held.
import { aid } from '@core/dialgame';
import { num, poly } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export { poly };

export type Kind = 'power' | 'net' | 'sub' | 'sym';
export interface Round {
  kind: Kind;
  /** The rate of flow and one antiderivative of it, as functions. */
  f: (x: number) => number;
  F: (x: number) => number;
  /** The rate and its antiderivative, written out. */
  ftext: string;
  Ftext: string;
  /** What the tank already holds. */
  c0: number;
  /** True when the gate opens at −b and shuts at +b (symmetric limits). */
  sym: boolean;
  /** The volume the town needs, the winning setting and the dial range. */
  V: number;
  ans: number;
  max: number;
  start: number;
  assist: 0 | 1 | 2;
}

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
const ri = (lo: number, hi: number, random: () => number) => lo + Math.floor(random() * (hi - lo + 1));
const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶'];

const evalPoly = (ts: [number, number][]) => (x: number) => ts.reduce((s, [c, p]) => s + c * x ** p, 0);

/** The volume in the tank when the gate is set to b. */
export const volume = (r: Round, b: number) => r.c0 + (r.sym ? r.F(b) - r.F(-b) : r.F(b) - r.F(0));

function finish(r: Omit<Round, 'V' | 'start' | 'assist'>): Round {
  return { ...r, V: volume(r as Round, r.ans), start: 0, assist: 0 };
}
const unique = (r: Round) => {
  const wins: number[] = [];
  for (let b = 0; b <= r.max; b++) if (volume(r, b) === r.V) wins.push(b);
  return wins.length === 1 && wins[0] === r.ans && r.V !== volume(r, 0);
};

function powerRound(c0: number, random: () => number): Round {
  const n = ri(1, 3, random);
  const m = ri(1, 2, random);
  const ans = ri(2, 6, random);
  const ts: [number, number][] = [[(n + 1) * m, n]];
  return finish({ kind: 'power', f: evalPoly(ts), F: evalPoly([[m, n + 1]]), ftext: `f(t) = ${poly(ts)}`, Ftext: `F(t) = ${poly([[m, n + 1]])}`, c0, sym: false, ans, max: 9 });
}

function netRound(quadratic: boolean, random: () => number): Round {
  for (;;) {
    let ts: [number, number][];
    let Fs: [number, number][];
    let low: number;
    const s = ri(1, 3, random);
    if (!quadratic) {
      ts = [[2, 1], [-2 * s, 0]];
      Fs = [[1, 2], [-2 * s, 1]];
      low = 2 * s + 1;
    } else {
      const q = s + 2 * ri(1, 2, random);
      ts = [[3, 2], [-3 * (s + q), 1], [3 * s * q, 0]];
      Fs = [[1, 3], [(-3 * (s + q)) / 2, 2], [3 * s * q, 1]];
      low = q + 1;
    }
    const r = finish({ kind: 'net', f: evalPoly(ts), F: evalPoly(Fs), ftext: `f(t) = ${poly(ts)}`, Ftext: `F(t) = ${poly(Fs)}`, c0: 0, sym: false, ans: ri(low, 9, random), max: 9 });
    if (unique(r)) return r;
  }
}

function subRound(random: () => number): Round {
  const n = ri(1, 2, random);
  const c = ri(1, 3, random);
  const s = 2 * (n + 1);
  const ans = ri(1, n === 2 ? 3 : 5, random);
  const inner = `(t² + ${c})${n === 1 ? '' : SUP[n]}`;
  return finish({
    kind: 'sub',
    f: (t) => s * t * (t * t + c) ** n,
    F: (t) => (t * t + c) ** (n + 1) - c ** (n + 1),
    ftext: `f(t) = ${s}t·${inner}`,
    Ftext: `F(t) = (t² + ${c})${SUP[n + 1]} − ${c ** (n + 1)}`,
    c0: 0,
    sym: false,
    ans,
    max: 6,
  });
}

function symRound(withFour: boolean, random: () => number): Round {
  const a = ri(1, 3, random);
  const b4 = withFour ? ri(1, 2, random) : 0;
  const k = pick([-3, -2, -1, 1, 2, 3], random);
  const j = pick([-3, -2, -1, 1, 2, 3], random);
  const ts: [number, number][] = [[5 * b4, 4], [4 * k, 3], [3 * a, 2], [2 * j, 1]];
  const Fs: [number, number][] = [[b4, 5], [k, 4], [a, 3], [j, 2]];
  const ans = ri(2, withFour ? 3 : 4, random);
  return finish({ kind: 'sym', f: evalPoly(ts), F: evalPoly(Fs), ftext: `f(x) = ${poly(ts, 'x')}`, Ftext: `F(x) = ${poly(Fs, 'x')}`, c0: 0, sym: true, ans, max: 5 });
}

/** Three rounds from three makers, drawing again when a round repeats an earlier one. */
function distinct(makers: (() => Round)[]): Round[] {
  const out: Round[] = [];
  for (const make of makers) {
    let r = make();
    for (let i = 0; i < 50 && out.some((o) => o.ftext === r.ftext && o.c0 === r.c0); i++) r = make();
    out.push(r);
  }
  return out;
}

export function buildRounds(level: number, random: () => number): Round[] {
  let rs: Round[];
  if (level === 1) rs = distinct([() => powerRound(0, random), () => powerRound(ri(2, 7, random), random), () => powerRound(ri(2, 7, random), random)]);
  else if (level === 2) rs = distinct([() => netRound(false, random), () => netRound(false, random), () => netRound(true, random)]);
  else if (level === 3) rs = distinct([() => subRound(random), () => subRound(random), () => subRound(random)]);
  else rs = distinct([() => symRound(false, random), () => symRound(true, random), () => symRound(true, random)]);
  return rs.map((r, i) => ({ ...r, assist: aid(i) }));
}

export const judge = (r: Round, b: number) => volume(r, b) === r.V;

/** The gate runs live: this many time units pass each second (half of it in slow motion). */
export const SPEED = 1.5;
/** Shutting within this many time units of the exact moment counts as on time (less than half the gap between whole numbers). */
export const ON = 0.3;
export const onTime = (r: Round, t: number) => Math.abs(t - r.ans) <= ON;

/** What the rate of flow says about this round, in words. */
export function intel(r: Round): string {
  const lim = r.sym ? 'The gate opens at −b and shuts at +b' : 'The gate opens at t = 0 and shuts at t = b';
  const have = r.c0 > 0 ? ` The tank already holds ${r.c0}.` : '';
  return `${r.ftext}. ${lim}.${have} The town needs exactly ${r.V}.`;
}

const one = (x: number) => num(Math.round(x * 10) / 10);

/** After a miss: when the gate shut, what the tank holds and which way it is off, never the right moment. */
export function missText(r: Round, t: number): string {
  const v = volume(r, t);
  const lim = r.sym ? `from −${one(t)} to ${one(t)}` : `at t = ${one(t)}`;
  const side = v < r.V ? 'short of' : 'over';
  if (r.kind === 'net' && r.F(t) < r.F(0) && v < r.V) return `The gate shut ${lim} and the tank holds ${num(Math.round(v * 10) / 10)}: the flow had run backwards and drained it, so the net volume is ${side} what the town needs.`;
  return `The gate shut ${lim} and the tank holds ${num(Math.round(v * 10) / 10)}, which is ${side} what the town needs.`;
}

/** After a hit: the working. */
export function explain(r: Round): string {
  const lo = r.sym ? `−${r.ans}` : '0';
  const base = r.c0 > 0 ? `${r.c0} + ` : '';
  const pieces: Record<Kind, string> = {
    power: 'Integrate the rate with the power rule, then subtract F(0) from F(b).',
    net: 'The rate is negative before it turns, so the integral subtracts there: the net volume is F(b) − F(0), not the total flow.',
    sub: 'Put u = t² + c, so u′ = 2t, which turns the integrand into a power of u.',
    sym: 'Over −b to b the odd terms cancel (their areas are equal and opposite), so only the even terms count, doubled.',
  };
  return `${pieces[r.kind]} ${r.Ftext}. The volume is ${base}F(${r.ans}) − F(${lo}) = ${num(r.V)}.`;
}
