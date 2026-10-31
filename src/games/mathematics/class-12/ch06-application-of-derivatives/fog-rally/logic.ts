// Pure rules of Fog Rally: no DOM, no canvas. Dusty drives a mountain stage through fog, so the player writes a gear plan for eight stretches of road
// from the sign of f′ (levels 1 to 4), or sets a road parameter a so that f′ keeps its sign on the whole stage (level 5).
import { aid } from '@core/dialgame';
import { num, piText, poly } from '@core/mathkit';
import { shuffle } from '@core/quiz';

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
/** "(x − 3)", "(x + 2)" or "x" for the factor x − c. */
export const lin = (c: number) => (c === 0 ? 'x' : c > 0 ? `(x − ${c})` : `(x + ${-c})`);
/** A whole number with a true minus sign; −0 is written 0. */
const n = (x: number) => num(x + 0);
/** Factors written the textbook way: the bare x first when a root is 0, otherwise ascending. */
const factors = (roots: number[]) => [...roots.filter((r) => r === 0), ...roots.filter((r) => r !== 0)].map(lin).join('');

export type Gear = 'gas' | 'brake' | null;
export type Kind = 'quad' | 'cubic' | 'cube' | 'flat' | 'square' | 'trig';
export interface StripRound {
  kind: Kind;
  /** The road as the organisers radio it, e.g. "f(x) = 2x³ − 3x² − 36x + 7". */
  text: string;
  /** f′ factored, e.g. "f′(x) = 6(x + 2)(x − 3)". */
  fpText: string;
  f: (x: number) => number;
  fp: (x: number) => number;
  lo: number;
  hi: number;
  width: number;
  cells: 8;
  trig: boolean;
  /** Roots of f′ where its sign changes, ascending (for trig: in units of π/4, e.g. 1 means π/4). */
  turns: number[];
  /** Roots of f′ where its sign does not change (level 3 only). Same units as turns. */
  flats: number[];
  /** The winning gear of each of the 8 cells. */
  want: ('gas' | 'brake')[];
  assist: 0 | 1 | 2;
}
export const CELLS = 8;
/** Seconds the truck takes to drive the whole stage when nothing goes wrong. */
export const DRIVE = 1.6;

export const mid = (r: StripRound, i: number) => r.lo + (i + 0.5) * r.width;

function mk(o: { kind: Kind; text: string; fpText: string; f: (x: number) => number; fp: (x: number) => number; turns: number[]; flats?: number[]; trig?: boolean }): StripRound {
  const trig = o.trig ?? false;
  const r: StripRound = {
    kind: o.kind,
    text: o.text,
    fpText: o.fpText,
    f: o.f,
    fp: o.fp,
    lo: trig ? 0 : -4,
    hi: trig ? 2 * Math.PI : 4,
    width: trig ? Math.PI / 4 : 1,
    cells: 8,
    trig,
    turns: o.turns,
    flats: o.flats ?? [],
    want: [],
    assist: 0,
  };
  r.want = Array.from({ length: CELLS }, (_, i) => (r.fp(mid(r, i)) > 0 ? 'gas' : 'brake'));
  return r;
}

// ---- The pools ----------------------------------------------------------------------------------------------------------------------------------

/** Level 1. Entry [a, c, e]: f(x) = a·x² − 2ac·x + e, f′(x) = 2a(x − c). */
export const L1_UP: [number, number, number][] = [[1, 2, 3], [2, 3, 5], [1, -1, -4], [3, 1, 2], [2, -2, 1], [1, -3, 0]];
export const L1_DOWN: [number, number, number][] = [[-1, 1, 4], [-2, 2, -3], [-1, -2, 6], [-3, -1, 0], [-2, 0, 5], [-1, 3, -2]];
export const L1_BOSS: [number, number, number][] = [[-2, 3, 5], [3, -2, 1], [2, -1, -7], [-3, 2, 4], [-1, -3, 8], [2, 2, -3]];
/** Level 2. Entry [s, p, q, e]. */
export const L2_UP: [number, number, number, number][] = [[1, -2, 3, 7], [1, -1, 2, 0], [1, 0, 3, 1], [1, -3, 1, 4], [1, 1, 3, -2]];
export const L2_DOWN: [number, number, number, number][] = [[-1, -1, 3, 5], [-1, -2, 1, 0], [-1, 0, 2, -3], [-1, -3, 0, 2], [-1, 1, 2, 4]];
export const L2_BOSS: [number, number, number, number][] = [[1, -2, 2, 0], [-1, -1, 3, 0], [1, -3, 1, 5], [1, 1, 3, 0], [-1, -3, 3, 0], [1, 0, 2, 4]];
/** Level 3: cube f(x) = s(x − a)³ + e, f′(x) = 3s(x − a)²; entry [s, a, e]. */
export const L3_CUBE: [number, number, number][] = [[1, 1, -99], [1, -2, 0], [-1, 2, 0], [1, 0, 5], [-1, -1, 3], [1, 2, 1]];
/** flat: f(x) = s(x − a)³(x − b), f′(x) = 4s(x − a)²(x − r) with r = (a + 3b)/4; entry [s, a, b]. */
export const L3_FLAT: [number, number, number][] = [[1, -1, 3], [1, 1, -3], [-1, 3, -1], [1, -3, 1], [-1, 2, -2], [-1, -2, 2], [1, 0, 4], [-1, 0, -4]];
/** square: f(x) = [(x − s)(x − s − 2k)]², f′(x) = 4(x − s)(x − s − k)(x − s − 2k); entry [s, k]. */
export const L3_SQUARE: [number, number][] = [[0, 1], [-1, 1], [-2, 1], [-3, 3], [-2, 2], [1, 1], [-1, 2]];

export interface TrigEntry { text: string; fpText: string; f: (x: number) => number; fp: (x: number) => number; turns: number[] }
export const L4_POOL: { easy: TrigEntry[]; mid: TrigEntry[]; boss: TrigEntry[] } = {
  easy: [
    { text: 'f(x) = sin x', fpText: 'f′(x) = cos x', f: Math.sin, fp: Math.cos, turns: [2, 6] },
    { text: 'f(x) = cos x', fpText: 'f′(x) = −sin x', f: Math.cos, fp: (x: number) => -Math.sin(x), turns: [4] },
  ],
  mid: [
    { text: 'f(x) = sin x + cos x', fpText: 'f′(x) = cos x − sin x', f: (x: number) => Math.sin(x) + Math.cos(x), fp: (x: number) => Math.cos(x) - Math.sin(x), turns: [1, 5] },
    { text: 'f(x) = sin x − cos x', fpText: 'f′(x) = cos x + sin x', f: (x: number) => Math.sin(x) - Math.cos(x), fp: (x: number) => Math.cos(x) + Math.sin(x), turns: [3, 7] },
  ],
  boss: [
    { text: 'f(x) = sin 2x', fpText: 'f′(x) = 2 cos 2x', f: (x: number) => Math.sin(2 * x), fp: (x: number) => 2 * Math.cos(2 * x), turns: [1, 3, 5, 7] },
    { text: 'f(x) = cos 2x', fpText: 'f′(x) = −2 sin 2x', f: (x: number) => Math.cos(2 * x), fp: (x: number) => -2 * Math.sin(2 * x), turns: [2, 4, 6] },
  ],
};

// ---- Round makers ---------------------------------------------------------------------------------------------------------------------------------

export function quad([a, c, e]: [number, number, number]): StripRound {
  return mk({
    kind: 'quad',
    text: `f(x) = ${poly([[a, 2], [-2 * a * c, 1], [e, 0]], 'x')}`,
    fpText: `f′(x) = ${n(2 * a)}${lin(c)}`,
    f: (x) => a * x * x - 2 * a * c * x + e,
    fp: (x) => 2 * a * (x - c),
    turns: [c],
  });
}
/** The boss quadratic: the same terms written in reverse order, so the leading coefficient cannot be read off the first term. */
export function quadBoss([a, c, e]: [number, number, number]): StripRound {
  return { ...quad([a, c, e]), text: `f(x) = ${poly([[e, 0], [-2 * a * c, 1], [a, 2]], 'x')}` };
}
export function cubic6([s, p, q, e]: [number, number, number, number]): StripRound {
  return mk({
    kind: 'cubic',
    text: `f(x) = ${poly([[2 * s, 3], [-3 * s * (p + q), 2], [6 * s * p * q, 1], [e, 0]], 'x')}`,
    fpText: `f′(x) = ${n(6 * s)}${factors([p, q])}`,
    f: (x) => s * (2 * x ** 3 - 3 * (p + q) * x * x + 6 * p * q * x) + e,
    fp: (x) => 6 * s * (x - p) * (x - q),
    turns: [p, q],
  });
}
export function cubic3([s, p, q, e]: [number, number, number, number]): StripRound {
  return mk({
    kind: 'cubic',
    text: `f(x) = ${poly([[s, 3], [-1.5 * s * (p + q), 2], [3 * s * p * q, 1], [e, 0]], 'x')}`,
    fpText: `f′(x) = ${n(3 * s)}${factors([p, q])}`,
    f: (x) => s * (x ** 3 - 1.5 * (p + q) * x * x + 3 * p * q * x) + e,
    fp: (x) => 3 * s * (x - p) * (x - q),
    turns: [p, q],
  });
}
export function cube([s, a, e]: [number, number, number]): StripRound {
  return mk({
    kind: 'cube',
    text: `f(x) = ${poly([[s, 3], [-3 * s * a, 2], [3 * s * a * a, 1], [-s * a * a * a + e, 0]], 'x')}`,
    fpText: `f′(x) = ${s < 0 ? '−' : ''}3${lin(a)}²`,
    f: (x) => s * (x - a) ** 3 + e,
    fp: (x) => 3 * s * (x - a) ** 2,
    turns: [],
    flats: [a],
  });
}
export function flat([s, a, b]: [number, number, number]): StripRound {
  const r = (a + 3 * b) / 4;
  const sign = s < 0 ? '−' : '';
  return mk({
    kind: 'flat',
    text: `f(x) = ${sign}${lin(a)}³${lin(b)}`,
    fpText: r === 0 ? `f′(x) = ${sign}4x${lin(a)}²` : `f′(x) = ${sign}4${lin(a)}²${lin(r)}`,
    f: (x) => s * (x - a) ** 3 * (x - b),
    fp: (x) => 4 * s * (x - a) ** 2 * (x - r),
    turns: [r],
    flats: [a],
  });
}
export function square([s, k]: [number, number]): StripRound {
  return mk({
    kind: 'square',
    text: `f(x) = [${factors([s, s + 2 * k])}]²`,
    fpText: `f′(x) = 4${factors([s, s + k, s + 2 * k])}`,
    f: (x) => ((x - s) * (x - s - 2 * k)) ** 2,
    fp: (x) => 4 * (x - s) * (x - s - k) * (x - s - 2 * k),
    turns: [s, s + k, s + 2 * k],
  });
}
export function trig(e: TrigEntry): StripRound {
  return mk({ kind: 'trig', text: e.text, fpText: e.fpText, f: e.f, fp: e.fp, turns: e.turns, trig: true });
}

export function buildStrip(level: 1 | 2 | 3 | 4, random: () => number): StripRound[] {
  let rs: StripRound[];
  if (level === 1) rs = [quad(pick(L1_UP, random)), quad(pick(L1_DOWN, random)), quadBoss(pick(L1_BOSS, random))];
  else if (level === 2) rs = [cubic6(pick(L2_UP, random)), cubic6(pick(L2_DOWN, random)), cubic3(pick(L2_BOSS, random))];
  else if (level === 3) rs = [cube(pick(L3_CUBE, random)), flat(pick(L3_FLAT, random)), square(pick(L3_SQUARE, random))];
  else rs = [trig(pick(L4_POOL.easy, random)), trig(pick(L4_POOL.mid, random)), trig(pick(L4_POOL.boss, random))];
  return rs.map((r, i) => ({ ...r, assist: aid(i) }));
}

// ---- Judging and run planning ---------------------------------------------------------------------------------------------------------------------

export const complete = (gears: Gear[]) => gears.length === CELLS && gears.every((g) => g !== null);
export const judgeStrip = (r: StripRound, gears: Gear[]) => complete(gears) && gears.every((g, i) => g === r.want[i]);
/** The first cell whose gear is wrong, and what happens there. Call only with a complete strip. */
export function firstFault(r: StripRound, gears: Gear[]): { cell: number; kind: 'stall' | 'flip' } | null {
  for (let i = 0; i < CELLS; i++) if (gears[i] !== r.want[i]) return { cell: i, kind: r.want[i] === 'gas' ? 'stall' : 'flip' };
  return null;
}
/** Seconds into the run when the verdict lands: the crash, or the finish. Always below 2.4. */
export const impactTime = (f: ReturnType<typeof firstFault>) => (f ? ((f.cell + 0.5) * DRIVE) / CELLS + 0.25 : DRIVE);

// ---- Words ----------------------------------------------------------------------------------------------------------------------------------------

/** A cell edge as the student reads it: "−3", "0", "π/4", "2π". */
export const edgeText = (r: StripRound, i: number) => (r.trig ? piText(3 * i) : n(r.lo + i));
/** A turn value stored in `turns` or `flats`, as the student reads it. */
const turnText = (r: StripRound, t: number) => (r.trig ? piText(3 * t) : n(t));

export const stripIntel = (r: StripRound) => `Road plan: ${r.text}, for x from ${edgeText(r, 0)} to ${edgeText(r, 8)}. Set GAS where the road climbs and BRAKE where it falls.`;

export function stripMiss(r: StripRound, gears: Gear[]): string {
  const f = firstFault(r, gears);
  if (!f) return '';
  const A = edgeText(r, f.cell);
  const B = edgeText(r, f.cell + 1);
  return f.kind === 'stall'
    ? `Between x = ${A} and x = ${B} Dusty was braking while the road climbed: the truck lost speed, stalled and rolled back. Change the gear on that stretch and drive again.`
    : `Between x = ${A} and x = ${B} Dusty was on the gas while the road dropped away: the truck ran too fast, hit the dip and flipped. Change the gear on that stretch and drive again.`;
}

export function scoutText(r: StripRound, i: number): string {
  const s = r.fp(mid(r, i));
  return `Scout drone over x = ${edgeText(r, i)} to ${edgeText(r, i + 1)}: the road ${s > 0 ? 'climbs' : 'falls'} there (f′ = ${num(s)} at the middle of the stretch).`;
}

export function stripExplain(r: StripRound): string {
  const list = (ts: number[]) => ts.map((t) => turnText(r, t)).join(', ');
  const s1 = `${r.fpText}.`;
  let s2: string;
  if (r.flats.length === 0) s2 = `f′ = 0 at x = ${list(r.turns)}.`;
  else if (r.turns.length === 0) s2 = `f′ = 0 only at x = ${list(r.flats)}, and the squared factor keeps its sign there, so the road just flattens.`;
  else s2 = `f′ = 0 at x = ${list(r.flats)} and x = ${list(r.turns)}; the squared factor does not change sign at ${list(r.flats)}, so the only turn is at x = ${list(r.turns)}.`;
  const bounds = r.trig ? [0, ...r.turns, 8] : [-Infinity, ...r.turns, Infinity];
  const unit = r.trig ? Math.PI / 4 : 1;
  const edge = (b: number) => (b === -Infinity ? '−∞' : b === Infinity ? '∞' : turnText(r, b));
  const inc: string[] = [];
  const dec: string[] = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const [a, b] = [bounds[i], bounds[i + 1]];
    let x: number;
    if (a === -Infinity && b === Infinity) x = (r.flats[0] ?? -1) + 1;
    else if (a === -Infinity) x = b - 1;
    else if (b === Infinity) x = a + 1;
    else x = ((a + b) / 2) * unit;
    while (Math.abs(r.fp(x)) < 1e-9) x += 0.5;
    (r.fp(x) > 0 ? inc : dec).push(`(${edge(a)}, ${edge(b)})`);
  }
  const whole = r.trig ? '(0, 2π)' : '(−∞, ∞)';
  let s3: string;
  if (dec.length === 0) s3 = `So f increases on ${whole} and never decreases.`;
  else if (inc.length === 0) s3 = `So f decreases on ${whole} and never increases.`;
  else s3 = `So f increases on ${inc.join(' and ')} and decreases on ${dec.join(' and ')}.`;
  return `${s1} ${s2} ${s3}`;
}

// ---- Level 5: the road builder ----------------------------------------------------------------------------------------------------------------------

export type BuildKind = 'inc' | 'dec' | 'cub';
export interface BuildRound {
  kind: BuildKind;
  m: number;
  n: number;
  ans: number;
  min: number;
  max: number;
  start: number;
  gear: 'gas' | 'brake';
  assist: 0 | 1 | 2;
}

export function buildBuilder(random: () => number): BuildRound[] {
  const m1 = pick([-2, -1, 0, 1, 2], random);
  const m2 = pick([-2, -1, 0, 1, 2], random);
  const m3 = pick([1, 2], random);
  const a1 = -2 * m1 + 0;
  const a2 = 2 * m2 + 0;
  const a3 = -3 * m3 * m3 + 0;
  return [
    { kind: 'inc', m: m1, n: m1 + 2, ans: a1, min: -8, max: 8, start: a1 === 0 ? 4 : 0, gear: 'gas', assist: aid(0) },
    { kind: 'dec', m: m2, n: m2 + 2, ans: a2, min: -8, max: 8, start: a2 === 0 ? 4 : 0, gear: 'brake', assist: aid(1) },
    { kind: 'cub', m: m3, n: m3 + 2, ans: a3, min: -15, max: 3, start: 0, gear: 'gas', assist: aid(2) },
  ];
}

export const roadF = (r: BuildRound, a: number) => (x: number) => (r.kind === 'inc' ? x * x + a * x + 1 : r.kind === 'dec' ? -x * x + a * x + 1 : x ** 3 + a * x);
export const roadFp = (r: BuildRound, a: number) => (x: number) => (r.kind === 'inc' ? 2 * x + a : r.kind === 'dec' ? -2 * x + a : 3 * x * x + a);
/** Where the road turns just before or inside the stage: the dip floor (inc, cub) or the hump top (dec); null if the cubic never turns (a ≥ 0). */
export const turnAt = (r: BuildRound, a: number) => (r.kind === 'inc' ? -a / 2 : r.kind === 'dec' ? a / 2 : a < 0 ? Math.sqrt(-a / 3) : null);
export const judgeBuild = (r: BuildRound, a: number) => a === r.ans;
/** 'late': the turn is inside the stage (crash); 'early': before the gate or no turn (marshal voids it). */
export const buildFault = (r: BuildRound, a: number): 'late' | 'early' | null => {
  const t = turnAt(r, a);
  return a === r.ans ? null : t !== null && t > r.m ? 'late' : 'early';
};

const FORMULA: Record<BuildKind, string> = { inc: 'f(x) = x² + ax + 1', dec: 'f(x) = −x² + ax + 1', cub: 'f(x) = x³ + ax' };
export const buildFormula = (r: BuildRound) => FORMULA[r.kind];

export function buildIntel(r: BuildRound): string {
  const head = `Roadworks: ${FORMULA[r.kind]}. The stage runs from the start gate at x = ${n(r.m)} to the finish at x = ${n(r.m + 2)}, all in`;
  if (r.kind === 'dec') return `${head} BRAKE, so the road must fall the whole way. Set a so the hump before the stage tops out exactly at the gate.`;
  return `${head} GAS, so the road must climb the whole way. Set a so the dip before the stage ends exactly at the gate.`;
}

export function buildMiss(r: BuildRound, a: number): string {
  const A = num(a);
  const fault = buildFault(r, a);
  const dir = ` Try a ${a < r.ans ? 'larger' : 'smaller'} a.`;
  if (fault === 'late') {
    return r.gear === 'gas'
      ? `With a = ${A} the road is still falling after the start gate, so its lowest point is inside the stage. Dusty was on the gas, ran down into the dip and flipped.${dir}`
      : `With a = ${A} the road is still climbing after the start gate, so its highest point is inside the stage. Dusty was braking, stalled on the climb and rolled back.${dir}`;
  }
  const t = turnAt(r, a);
  return r.gear === 'gas'
    ? `With a = ${A} the whole stage climbs, but the road ${t === null ? 'never dips at all' : 'stopped dipping before the start gate'}. The marshal wanted the turn exactly at the gate: stage voided.${dir}`
    : `With a = ${A} the whole stage falls, but the hump topped out before the start gate. The marshal wanted the turn exactly at the gate: stage voided.${dir}`;
}

export const buildScout = (r: BuildRound, a: number) => `Scout at the start gate x = ${n(r.m)}: with a = ${num(a)} the slope there is f′(${n(r.m)}) = ${num(roadFp(r, a)(r.m))}.`;

export function buildExplain(r: BuildRound): string {
  const m = n(r.m);
  if (r.kind === 'inc') return `f′(x) = 2x + a grows with x, so on the stage it is weakest at the gate. The road climbs the whole stage when f′(${m}) = 2·(${m}) + a ≥ 0, and it turns exactly at the gate when that is 0: a = ${n(r.ans)}.`;
  if (r.kind === 'dec') return `f′(x) = −2x + a falls as x grows, so on the stage it is largest at the gate. The road falls the whole stage when f′(${m}) = −2·(${m}) + a ≤ 0, and it turns exactly at the gate when that is 0: a = ${n(r.ans)}.`;
  return `f′(x) = 3x² + a grows with x for x > 0, so on the stage it is weakest at the gate. The road climbs the whole stage when f′(${r.m}) = 3·${r.m}² + a ≥ 0, and it turns exactly at the gate when that is 0: a = ${n(r.ans)}.`;
}
