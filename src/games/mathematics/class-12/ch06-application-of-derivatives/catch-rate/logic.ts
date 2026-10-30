// Pure rules of Catch Rate: no DOM, no canvas. A rescue crew runs a winch at rate w (a whole number) that makes one quantity change; a second
// quantity depends on it, and its rate must equal the target. Output rate = (mn/md)·w, the chain rule through time.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { shuffle } from '@core/quiz';

export type Kind = 'ripple' | 'cube' | 'balloon' | 'ladderFoot' | 'ladderTop' | 'shadow' | 'coneHalf' | 'coneThird';
export interface Round {
  kind: Kind;
  /** The situation at the instant, in words. */
  scene: string;
  /** What the winch changes, and what must be matched. */
  input: string;
  output: string;
  /** Size parameters used to draw: r, edge x, ladder foot and top, lamp and person heights, depth h. */
  a: number;
  b: number;
  /** The derivative at that instant is mn/md; output rate = (mn/md)·w. */
  mn: number;
  md: number;
  /** The unit of the input rate and of the output rate, e.g. 'cm' and 'π cm²'. */
  inUnit: string;
  outUnit: string;
  ans: number;
  target: number;
  /** The output quantity (π divided out) when the winch has been running t seconds at w = 1, for numerical checks. */
  q: (t: number) => number;
  assist: 0 | 1 | 2;
}

export const DIAL = { min: 1, max: 12 };
const pick = <T>(xs: readonly T[], random: () => number, n = 1): T[] => shuffle(xs, random).slice(0, n);
export const output = (r: Round, w: number) => (r.mn * w) / r.md;
const sup2 = '²';

type Spec = Omit<Round, 'ans' | 'target' | 'assist'>;
function make(s: Spec, k: number, random: () => number): Round {
  const ok = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((w) => Math.round(s.mn * w * 100) % s.md === 0);
  const ans = pick(ok, random)[0];
  return { ...s, ans, target: (s.mn * ans) / s.md, assist: aid(k) };
}

const base = { md: 1 };
function ripple(random: () => number, k: number): Round {
  const r = pick([3, 4, 5, 6, 8, 10], random)[0];
  return make({ ...base, kind: 'ripple', scene: `A ripple spreads from a dropped stone. Its radius is ${r} cm.`, input: 'the radius grows at w cm per second', output: 'The area of the ripple must grow at', a: r, b: 0, mn: 2 * r, inUnit: 'cm', outUnit: 'π cm²', q: (t) => (r + t) ** 2 }, k, random);
}
function cube(random: () => number, k: number): Round {
  const x = pick([2, 3, 4, 5], random)[0];
  return make({ ...base, kind: 'cube', scene: `A cube of ice melts evenly. Its edge is ${x} cm.`, input: 'the edge changes at w cm per second', output: 'The volume must change at', a: x, b: 0, mn: 3 * x * x, inUnit: 'cm', outUnit: 'cm³', q: (t) => (x + t) ** 3 }, k, random);
}
function balloon(random: () => number, k: number): Round {
  const r = pick([1, 2, 3, 4], random)[0];
  return make({ ...base, kind: 'balloon', scene: `A spherical balloon is being blown up. Its radius is ${r} cm.`, input: 'the radius grows at w cm per second', output: 'The volume must grow at', a: r, b: 0, mn: 4 * r * r, inUnit: 'cm', outUnit: 'π cm³', q: (t) => (4 / 3) * (r + t) ** 3 }, k, random);
}
const LADDERS: [number, number][] = [[4, 3], [3, 4], [6, 8], [8, 6], [12, 5], [5, 12]];
function ladderFoot(random: () => number, k: number, pickFrom = LADDERS): Round {
  const [x, y] = pick(pickFrom, random)[0];
  const L = Math.hypot(x, y);
  return make({ kind: 'ladderFoot', scene: `A ${L} m ladder leans on a wall. Its foot is ${x} m from the wall and its top is ${y} m up.`, input: 'the foot is pulled away from the wall at w metres per second', output: 'The top must slide down at', a: x, b: y, mn: x, md: y, inUnit: 'm', outUnit: 'm', q: (t) => -Math.sqrt(L * L - (x + t) ** 2) }, k, random);
}
function ladderTop(random: () => number, k: number): Round {
  const [x, y] = pick(LADDERS, random)[0];
  const L = Math.hypot(x, y);
  return make({ kind: 'ladderTop', scene: `A ${L} m ladder leans on a wall. Its foot is ${x} m from the wall and its top is ${y} m up.`, input: 'the top is let down the wall at w metres per second', output: 'The foot must slide out at', a: x, b: y, mn: y, md: x, inUnit: 'm', outUnit: 'm', q: (t) => Math.sqrt(L * L - (y - t) ** 2) }, k, random);
}
function shadow(random: () => number, k: number): Round {
  const [H, h] = pick([[6, 2], [9, 3], [8, 2], [5, 2], [12, 4], [10, 4]], random)[0];
  return make({ kind: 'shadow', scene: `A ${h} m person stands under a ${H} m lamp post.`, input: 'the person walks away from the post at w metres per second', output: 'The shadow must lengthen at', a: H, b: h, mn: h, md: H - h, inUnit: 'm', outUnit: 'm', q: (t) => ((6 + t) * h) / (H - h) }, k, random);
}
function cone(random: () => number, k: number, third: boolean): Round {
  const h = pick(third ? [3, 6, 9] : [4, 6, 8], random)[0];
  const d = third ? 3 : 2;
  const vol = (hh: number) => hh ** 3 / (3 * d * d);
  return make({ ...base, kind: third ? 'coneThird' : 'coneHalf', scene: `Water fills an upside-down cone whose radius is always ${third ? 'one third' : 'half'} of the water’s depth. The depth is ${h} cm.`, input: 'the depth rises at w cm per second', output: 'The volume must grow at', a: h, b: 0, mn: (h * h) / (d * d), md: 1, inUnit: 'cm', outUnit: 'π cm³', q: (t) => vol(h + t) }, k, random);
}

export function buildRounds(level: number, random: () => number): Round[] {
  if (level === 1) return [ripple(random, 0), cube(random, 1), balloon(random, 2)];
  if (level === 2) return [ladderFoot(random, 0), ladderTop(random, 1), ladderFoot(random, 2, [[12, 5], [5, 12], [8, 6]])];
  return [shadow(random, 0), cone(random, 1, false), cone(random, 2, true)];
}

export const judge = (r: Round, w: number) => Math.abs(output(r, w) - r.target) < 1e-9;
export const rateText = (r: Round, x: number) => `${fmt(x)} ${r.outUnit} per second`;

/** After a miss: what the winch did, never the speed that works. */
export function missText(r: Round, w: number): string {
  const out = output(r, w);
  return `The winch ran, and the result changed at ${rateText(r, out)}: ${out < r.target ? 'too slowly, so the rescue crew arrived late' : 'too fast, so the rescue crew overshot'}.`;
}
export const spotText = (r: Round, w: number) => `Test run at w = ${w}: the result changes at ${rateText(r, output(r, w))}.`;

const slope = (r: Round) => (r.md === 1 ? fmt(r.mn) : `${r.mn}/${r.md}`);
/** After a hit: the working. */
export function explain(r: Round): string {
  const rule: Record<Kind, string> = {
    ripple: `A = πr², so dA/dt = 2πr·(dr/dt) = ${r.mn}π·w`,
    cube: `V = x³, so dV/dt = 3x²·(dx/dt) = ${r.mn}·w`,
    balloon: `V = (4/3)πr³, so dV/dt = 4πr²·(dr/dt) = ${r.mn}π·w`,
    ladderFoot: `x² + y² = ${r.a ** 2 + r.b ** 2}, so 2x·x′ + 2y·y′ = 0 and y′ = −(x/y)x′; the top falls at (${r.a}/${r.b})w`,
    ladderTop: `x² + y² = ${r.a ** 2 + r.b ** 2}, so x′ = −(y/x)y′; the foot moves at (${r.b}/${r.a})w`,
    shadow: `By similar triangles the shadow s satisfies s/${r.b} = (d + s)/${r.a}, so s = ${r.b}d/${r.a - r.b} and s′ = (${r.b}/${r.a - r.b})w`,
    coneHalf: `r = h/2, so V = (π/3)r²h = πh³/12 and dV/dt = (π/4)h²·(dh/dt) = ${r.mn}π·w`,
    coneThird: `r = h/3, so V = (π/3)r²h = πh³/27 and dV/dt = (π/9)h²·(dh/dt) = ${r.mn}π·w`,
  };
  return `${rule[r.kind]}. ${slope(r)}·w = ${fmt(r.target)}, so w = ${r.ans}${sup2 ? '' : ''}.`;
}
export const intel = (r: Round) => `${r.scene} The winch makes ${r.input}. ${r.output} ${fmt(r.target)} ${r.outUnit} per second.`;
