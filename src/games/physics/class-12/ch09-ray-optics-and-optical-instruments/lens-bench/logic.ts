// Pure rules of the Lens Lab: no DOM, no canvas.
// Cartesian sign convention: 1/v − 1/u = 1/f, m = v/u, power P = 100/f (f in cm, P in dioptres).
import { shuffle } from '@core/quiz';
import { fmt, sgn, within } from '@core/judge';

export interface Hero {
  name: string;
  role: string;
  story: string;
  objective: string;
}

// ---- the physics ----------------------------------------------------------------------------------------------------------

export const power = (fCm: number) => 100 / fCm;
export const fromPower = (p: number) => 100 / p;
/** Focal length from the lens-maker’s formula for a double-convex lens with radii r1, r2 (positive magnitudes); r2 = Infinity makes it plano-convex. */
export const makerF = (n: number, r1: number, r2: number) => 1 / ((n - 1) * (1 / r1 + (Number.isFinite(r2) ? 1 / r2 : 0)));
/** Focal length of a lens of index nG in a liquid of index nL, from its focal length in air. */
export const fInLiquid = (nG: number, nL: number, fAir: number) => (Math.abs(nG - nL) < 1e-9 ? Infinity : (fAir * (nG - 1)) / (nG / nL - 1));
export const nGlass = (R: number, fAir: number) => 1 + R / (2 * fAir);
/** Image distance (cm, positive beyond the lens) for a real object x cm in front of a converging lens f, or null when there is no real image. */
export function projectorV(f: number, x: number): number | null {
  return x > f ? (x * f) / (x - f) : null;
}

// ---- the rounds -----------------------------------------------------------------------------------------------------------

export type Assist = 0 | 1 | 2;
export interface GrindRound {
  shape: 'equal' | 'plano' | 'unequal';
  n: number;
  f: number;
  /** The radius that is already fixed (unequal only), cm. */
  R1: number;
  /** The radius the player must dial, cm. */
  sol: number;
  assist: Assist;
}
export interface StackRound {
  /** The fixed front lens, dioptres. */
  P1: number;
  /** The power the pair must have, dioptres. */
  target: number;
  /** The back lens that makes it. */
  P2: number;
  assist: Assist;
}
export interface ProjectorRound {
  D: number;
  m: number;
  /** The focal length and the position (cm from the slide) that give a sharp image at magnification m. */
  f: number;
  u: number;
  v: number;
  assist: Assist;
}
export interface RelayRound {
  f1: number;
  u1: number;
  s: number;
  f2: number;
  v1: number;
  u2: number;
  v2: number;
  /** Where the screen must stand, cm from lens 1. */
  screen: number;
}
export interface LiquidRound {
  kind: 'vanish' | 'target' | 'diverge';
  R: number;
  fAir: number;
  nG: number;
  /** The liquid that does the trick. */
  nL: number;
  /** The focal length wanted in the liquid (signed); Infinity for the vanishing trick. */
  fTarget: number;
  assist: Assist;
}
/** One curved face between two media: n₂/v − n₁/u = (n₂ − n₁)/R (cm; u < 0 is in front of the face, v > 0 inside the glass). */
export interface CurvedRound {
  n1: number;
  n2: number;
  u: number;
  v: number;
  /** The radius that focuses the light on the sensor (whole cm, negative for a concave face). */
  sol: number;
  /** The image is virtual (v < 0), on the lamp’s side. */
  virtual: boolean;
  assist: Assist;
}
export type Game =
  | { kind: 'curved'; hero: Hero; rounds: CurvedRound[]; charges: number[] }
  | { kind: 'grind'; hero: Hero; rounds: GrindRound[]; charges: number[] }
  | { kind: 'stack'; hero: Hero; rounds: StackRound[]; charges: number[] }
  | { kind: 'projector'; hero: Hero; rounds: ProjectorRound[]; charges: number[] }
  | { kind: 'relay'; hero: Hero; rounds: RelayRound[]; charges: number[] }
  | { kind: 'liquid'; hero: Hero; rounds: LiquidRound[]; charges: number[] };

/** [n, f] for a double-convex lens with equal radii: R = 2(n−1)f. */
const EQUAL: [number, number][] = [[1.5, 20], [1.55, 20], [1.6, 15], [1.5, 30], [1.52, 25]];
/** [n, f] for a plano-convex lens: R = (n−1)f. */
const PLANO: [number, number][] = [[1.5, 24], [1.6, 20], [1.5, 40], [1.55, 20]];
/** [n, R1, f] with a clean second radius. */
const UNEQUAL: [number, number, number][] = [[1.5, 10, 12], [1.5, 20, 15], [1.6, 30, 20], [1.5, 15, 12]];
/** [P1, target] in dioptres; the back lens is target − P1 (a multiple of 0.5 D, never zero). */
const STACK: [number, number][] = [[2, -1], [4, 1.5], [-2.5, 2.5], [5, -2], [-2, 1], [2.5, -1.5], [-4, -1.5], [1, 4], [-5, 2], [4, -2.5]];
const PROJECTOR: [number, number, number][] = [[90, 2, 20], [64, 3, 12], [100, 4, 16], [45, 2, 10], [135, 2, 30], [80, 3, 15], [96, 3, 18], [75, 4, 12], [125, 4, 20], [80, 1, 20]];
/** [f1, u1, s, f2]: a convex lens, then a second lens (convex or concave) that sits before or after the first image. */
const RELAY_CONVEX: [number, number, number, number][] = [[10, 20, 35, 10], [10, 15, 45, 10]];
const RELAY_CONCAVE: [number, number, number, number][] = [[10, 20, 10, -20], [15, 30, 20, -20], [20, 40, 20, -30], [15, 60, 10, -15]];
/**
 * Level 5 pools, [R, f in air] and [R, f in air, wanted f′ in the liquid]. Each row's answer is a whole hundredth, no two rows of a
 * pool share an answer, and between them the answers spread over the whole dial (1.12 to 1.85): no pair of guesses covers the rows.
 * Vanish answers (n of the glass): 1.40, 1.45, 1.50, 1.60, 1.70, 1.80. Target: 1.12, 1.20, 1.28, 1.35, 1.44, 1.54.
 * Diverge: 1.50, 1.60, 1.68, 1.75, 1.80, 1.85. None is the start (1.30).
 */
export const VANISH: [number, number][] = [[16, 20], [18, 20], [20, 20], [24, 20], [28, 20], [32, 20]];
export const TARGET: [number, number, number][] = [[20, 25, 40], [20, 20, 40], [30, 25, 60], [20, 20, 90], [40, 25, 80], [30, 20, 110]];
export const DIVERGE: [number, number, number][] = [[14, 20, -70], [20, 25, -80], [20, 25, -60], [20, 20, -70], [20, 20, -60], [24, 25, -60]];

/** Level 6, [n₁, n₂, u, v]: pick one per round. Answers R = (n₂ − n₁)/(n₂/v − n₁/u): 10, 12, 10 / 6, 6, 5 / −40. */
const CURVED_1: [number, number, number, number][] = [[1, 1.5, -30, 90], [1, 1.5, -60, 60], [1, 1.5, -40, 60]];
const CURVED_2: [number, number, number, number][] = [[1, 1.5, -15, 90], [1, 1.5, -24, 36], [1, 4 / 3, -30, 40]];
const CURVED_3: [number, number, number, number][] = [[1, 1.5, -20, -24]];

export const SLIDERS = {
  curved: { min: -50, max: 50, step: 1, start: 30 },
  // the start is no row's answer (the answers are 10 to 30 cm; 30 was the answer of one equal-lens row)
  grind: { min: 1, max: 60, step: 1, start: 40 },
  stack: { min: -10, max: 10, step: 0.5, start: 0 },
  focal: { min: 8, max: 40, step: 1, start: 24 },
  relay: { min: 5, max: 120, step: 1, start: 30 },
  liquid: { min: 1.1, max: 1.9, step: 0.01, start: 1.3 },
};

function relayRound([f1, u1, s, f2]: [number, number, number, number]): RelayRound {
  const v1 = (u1 * f1) / (u1 - f1);
  const u2 = v1 - s;
  const v2 = 1 / (1 / f2 + 1 / u2);
  return { f1, u1, s, f2, v1, u2, v2, screen: s + v2 };
}

export function buildGame(level: number, random: () => number): Game {
  const assist = (i: number) => i as Assist;
  if (level === 1) {
    const [e] = shuffle(EQUAL, random);
    const [p] = shuffle(PLANO, random);
    const [u] = shuffle(UNEQUAL, random);
    const rounds: GrindRound[] = [
      { shape: 'equal', n: e[0], f: e[1], R1: 0, sol: 2 * (e[0] - 1) * e[1], assist: 0 },
      { shape: 'plano', n: p[0], f: p[1], R1: 0, sol: (p[0] - 1) * p[1], assist: 1 },
      { shape: 'unequal', n: u[0], f: u[2], R1: u[1], sol: 1 / (1 / ((u[0] - 1) * u[2]) - 1 / u[1]), assist: 2 },
    ];
    return {
      kind: 'grind',
      hero: {
        name: 'Glim',
        role: 'a camera sensor that needs a sharp focus',
        story: 'A flexible lens of known glass sits in front of Glim, and you can dial the radius of curvature of one of its faces. The radius decides where parallel light comes to a focus, and Glim only sees a sharp picture if the focus lands on the sensor.',
        objective: 'Dial the radius so the focus lands exactly on Glim’s sensor, in three rounds. The live focus preview fades after round 1.',
      },
      rounds,
      charges: [1, 1, 1],
    };
  }
  if (level === 2) {
    const picks = shuffle(STACK, random).slice(0, 3).sort((a, b) => Math.abs(a[1] - a[0]) - Math.abs(b[1] - b[0]));
    return {
      kind: 'stack',
      hero: {
        name: 'Dot',
        role: 'a camera behind two lenses pressed together',
        story: 'The front lens of the pair is fixed. You can dial the back lens from a strong diverging lens to a strong converging one. Lenses in contact add their powers, P = 1/f in dioptres with f in metres.',
        objective: 'Dial the back lens so the pair has exactly the power Dot’s picture needs, in three rounds. A measuring beam costs a charge, and the live view fades after round 1.',
      },
      rounds: picks.map(([P1, target], i) => ({ P1, target, P2: target - P1, assist: assist(i) })),
      charges: [1, 1, 1],
    };
  }
  if (level === 3) {
    const picks = shuffle(PROJECTOR, random).slice(0, 3).sort((a, b) => a[0] * a[1] - b[0] * b[1]);
    const rounds: ProjectorRound[] = picks.map(([D, m, f], i) => {
      const u = D / (m + 1);
      return { D, m, f, u, v: m * u, assist: assist(i) };
    });
    return {
      kind: 'projector',
      hero: {
        name: 'Reel',
        role: 'a slide projector with a lens you can retune',
        story: 'The slide and the screen are fixed D apart. Reel’s lens can be retuned to any focal length and slid anywhere between them. Only one pair of settings puts a sharp picture on the screen at the magnification the screen frame asks for.',
        objective: 'Tune the focal length and the position so the picture is sharp and fills the frame, in three rounds. A test beam costs a charge.',
      },
      rounds,
      charges: [1, 1, 1],
    };
  }
  if (level === 4) {
    const [c] = shuffle(RELAY_CONVEX, random);
    const [a, b] = shuffle(RELAY_CONCAVE, random);
    return {
      kind: 'relay',
      hero: {
        name: 'Beacon',
        role: 'a lamp whose light crosses two lenses',
        story: 'Beacon’s light is bent by the first lens and then by a second one, which may be a diverging lens placed before the first image forms. The screen has to stand where the second lens finally brings the light to a focus.',
        objective: 'Place the screen at the final image, measured from the first lens, in three rounds. A flash charge shows where the first lens alone would make its image.',
      },
      rounds: [relayRound(c), relayRound(a), relayRound(b)],
      charges: [2, 1, 1],
    };
  }
  if (level === 6) {
    const [a] = shuffle(CURVED_1, random);
    const [b] = shuffle(CURVED_2, random);
    const mk = ([n1, n2, u, v]: [number, number, number, number], i: number): CurvedRound => ({ n1, n2, u, v, sol: Math.round(curvedRadius(n1, n2, u, v)), virtual: v < 0, assist: assist(i) });
    return {
      kind: 'curved',
      hero: {
        name: 'Ember',
        role: 'a lantern whose light must reach a sensor buried in a glass rod',
        story: 'A single curved glass face bends light by itself: n₂/v − n₁/u = (n₂ − n₁)/R. The lantern’s light must focus on the sensor buried inside the glass rod.',
        objective: 'Grind the rod’s end to the radius that focuses the light on the sensor, in three rounds.',
      },
      rounds: [mk(a, 0), mk(b, 1), mk(CURVED_3[0], 2)],
      charges: [1, 1, 0],
    };
  }
  const [vn] = shuffle(VANISH, random);
  const [tg] = shuffle(TARGET, random);
  const [dv] = shuffle(DIVERGE, random);
  const mk = (kind: LiquidRound['kind'], R: number, fAir: number, fTarget: number, i: number): LiquidRound => {
    const nG = nGlass(R, fAir);
    const nL = kind === 'vanish' ? nG : nG / (1 + (fAir * (nG - 1)) / fTarget);
    return { kind, R, fAir, nG, nL, fTarget, assist: assist(i) };
  };
  return {
    kind: 'liquid',
    hero: {
      name: 'Lumi',
      role: 'a glass lens in a magician’s tank',
      story: 'A double-convex lens bends light only because glass differs from what surrounds it. In a liquid its focal length changes, it can fade from sight, and it can even turn from a converging into a diverging lens.',
      objective: 'Choose the liquid’s refractive index for each trick, in three rounds. A dip test shows the lens’s focal length in the current liquid.',
    },
    rounds: [mk('vanish', vn[0], vn[1], Infinity, 0), mk('target', tg[0], tg[1], tg[2], 1), mk('diverge', dv[0], dv[1], dv[2], 2)],
    charges: [1, 1, 1],
  };
}

// ---- judging --------------------------------------------------------------------------------------------------------------

/** The focal length of the lens with the dialled radius x. */
export function grindF(r: GrindRound, x: number): number {
  if (r.shape === 'equal') return makerF(r.n, x, x);
  if (r.shape === 'plano') return makerF(r.n, x, Infinity);
  return makerF(r.n, r.R1, x);
}
export function judgeGrind(r: GrindRound, x: number): { ok: boolean; f: number } {
  const f = grindF(r, x);
  return { ok: within(f, r.f, 0.02), f };
}
/** The power of the pair with the back lens dialled to P2 dioptres. */
export const pairPower = (r: StackRound, P2: number) => r.P1 + P2;
export function judgeStack(r: StackRound, P2: number): { ok: boolean; p: number } {
  const p = pairPower(r, P2);
  return { ok: Math.abs(p - r.target) < 0.01, p };
}
export function judgeProjector(r: ProjectorRound, f: number, x: number): { ok: boolean; fOk: boolean; xOk: boolean } {
  const fOk = f === r.f;
  const xOk = Math.abs(x - r.u) <= 0.5;
  return { ok: fOk && xOk, fOk, xOk };
}
export function judgeRelay(r: RelayRound, screen: number): { ok: boolean } {
  return { ok: Math.abs(screen - r.screen) <= 0.5 };
}
/**
 * What a missed screen position draws (level 4): a spot of FIXED size and beam width at the player's own screen, and the side the
 * image formed on. It depends on the side only, never on how far off the screen is, and never marks the true image.
 */
export function relayMissDraw(r: RelayRound, screen: number): { side: 'front' | 'behind'; spot: number; rayHalf: number; label: string } {
  const side = r.screen < screen ? 'front' : 'behind';
  return { side, spot: 14, rayHalf: 12, label: side === 'front' ? 'the image formed in front of the screen' : 'the image formed behind the screen' };
}
export function judgeLiquid(r: LiquidRound, nL: number): { ok: boolean; f: number } {
  return { ok: Math.abs(nL - r.nL) <= 0.005, f: fInLiquid(r.nG, nL, r.fAir) };
}

// ---- what a miss draws on levels 1, 2, 3 and 5: the direction only, with fixed effects ------------------------------------------
// A drawing or a text that followed the player's own result (the focus, the pair's power, the image, the lens in the liquid) would let
// two misses pin the answer down. Each miss below depends on the side of the miss alone, never on how far off it was.

/** Level 1: the missed focus is drawn this many cm behind or in front of the sensor, whatever the radius. */
export const GRIND_MISS_OFFSET = 5;
export type GrindSide = 'behind' | 'front';
export const grindSide = (r: GrindRound, x: number): GrindSide => (grindF(r, x) > r.f ? 'behind' : 'front');
/** The focal length (cm) a missed face draws its focus at. */
export const grindMissFocus = (r: GrindRound, x: number) => r.f + (grindSide(r, x) === 'behind' ? GRIND_MISS_OFFSET : -GRIND_MISS_OFFSET);

/** Level 2: the missed pair draws its focus this many px to one side of the flag (the flag is public), whatever the power. */
export const STACK_MISS_PX = 60;
export type StackSide = 'tooConverging' | 'tooDiverging';
export const stackSide = (r: StackRound, P2: number): StackSide => (pairPower(r, P2) > r.target ? 'tooConverging' : 'tooDiverging');
/** The signed focal length (cm; negative means diverging rays from a virtual focus) a missed pair draws, at `sc` px per cm. */
export function stackMissF(r: StackRound, side: StackSide, sc: number): number {
  const ft = fromPower(r.target);
  const f = ft + ((side === 'tooConverging' ? -1 : 1) * STACK_MISS_PX) / sc;
  return ft > 0 ? Math.max(f, 4) : Math.min(f, -4);
}
export const stackMissLabel = (side: StackSide) => (side === 'tooConverging' ? 'too converging' : 'too diverging');

/** Level 3: where the picture formed against the screen, and its size against the frame. */
export type ProjWhere = 'short' | 'beyond' | 'on';
export type ProjSize = 'big' | 'small' | 'about';
export type ProjMiss = { none: true } | { none: false; where: ProjWhere; size: ProjSize };
export function projectorMiss(r: ProjectorRound, f: number, x: number): ProjMiss {
  const v = projectorV(f, x);
  if (v === null) return { none: true };
  const gap = x + v - r.D;
  const ratio = v / x / r.m;
  return { none: false, where: Math.abs(gap) <= 0.5 ? 'on' : gap < 0 ? 'short' : 'beyond', size: ratio > 1.05 ? 'big' : ratio < 0.95 ? 'small' : 'about' };
}
/** Where the lens starts on its dial: a fixed 0.7 of the slide-to-screen distance, which is no row's answer D/(m + 1) (m = 1 to 4). */
export const projectorStartX = (D: number) => Math.round(0.7 * D);
/** A missed picture is drawn this many px short of or beyond the screen, at 1.35 or 0.55 of the frame, with this blur. */
export const PROJ_MISS = { offsetPx: 45, big: 1.35, small: 0.55, blur: 14 };

/** Level 5: which side of the right index the liquid is on (the dial's direction), and what the lens does there. */
export type LiquidSide = 'low' | 'high';
export const liquidSide = (r: LiquidRound, nL: number): LiquidSide => (nL < r.nL ? 'low' : 'high');
/** The fixed fade of the lens in a missed liquid. */
export const LIQUID_MISS_FADE = 0.55;
/** The signed focal length (cm) a missed liquid draws: fixed fractions of the wanted one, never the player's own f′. */
export function liquidMissF(r: LiquidRound, side: LiquidSide): number {
  if (r.kind === 'vanish') return side === 'low' ? 80 : -80;
  if (r.kind === 'target') return r.fTarget * (side === 'low' ? 0.6 : 1.7);
  return r.fTarget * (side === 'low' ? 1.7 : 0.6);
}
export function liquidMissLabel(r: LiquidRound, side: LiquidSide): string {
  if (r.kind === 'vanish') return side === 'low' ? 'still converging' : 'now diverging';
  if (r.kind === 'target') return side === 'low' ? 'too strong' : 'too weak';
  return side === 'low' ? 'not diverging enough' : 'diverging too strongly';
}

// ---- level 6: one curved face ---------------------------------------------------------------------------------------------

/** R = (n₂ − n₁)/(n₂/v − n₁/u), from n₂/v − n₁/u = (n₂ − n₁)/R. */
export function curvedRadius(n1: number, n2: number, u: number, v: number): number {
  return (n2 - n1) / (n2 / v - n1 / u);
}
/** n₂/v′ for a face of radius x: (n₂ − n₁)/x + n₁/u. Zero means the light leaves the face parallel. */
export const curvedDen = (r: CurvedRound, x: number) => (r.n2 - r.n1) / x + r.n1 / r.u;
/** Where a face of radius x focuses the light, cm (positive inside the glass, negative for a virtual image, Infinity for parallel light). */
export function curvedV(r: CurvedRound, x: number): number {
  const den = curvedDen(r, x);
  return Math.abs(den) < 1e-9 ? Infinity : r.n2 / den;
}
export type CurvedSide = 'right' | 'strong' | 'weak';
/** Whether the face with radius x bends the light too strongly or too weakly for the sensor (only the direction). */
export function curvedSide(r: CurvedRound, x: number): CurvedSide {
  const need = curvedDen(r, r.sol);
  const have = curvedDen(r, x);
  if (Math.abs(have - need) < 1e-9) return 'right';
  return have > need ? 'strong' : 'weak';
}
/** The face is judged on the dialled radius itself (whole cm); a radius of 0 is not a curved face and never reaches here. */
export function judgeCurved(r: CurvedRound, x: number): { ok: boolean; side: CurvedSide } {
  const side = curvedSide(r, x);
  return { ok: x === r.sol && side === 'right', side };
}
/**
 * What the picture draws on a miss: n₂/v′ for the rays, with a FIXED size that depends only on the direction of the miss and on
 * whether the light converges or spreads, never on how far off the radius is (a size that grew with the error would let two
 * misses pin the answer down). Real focus: too strong focuses short of the sensor, too weak beyond it.
 */
export function curvedMissDen(r: CurvedRound, x: number): number {
  const d0 = r.n2 / r.v;
  const side = curvedSide(r, x);
  const converges = curvedDen(r, x) > 1e-9;
  if (side === 'strong') return converges ? (d0 > 0 ? d0 / 0.55 : -d0 * 0.9) : d0 * 0.55;
  return converges ? d0 / 1.45 : d0 > 0 ? -d0 * 0.4 : d0 * 1.8;
}
/** The paid test beam: where the dialled face focuses the light, with numbers. */
export function curvedReading(r: CurvedRound, x: number): string {
  const v = curvedV(r, x);
  const where = v === Infinity ? 'the light leaves the face parallel: no focus at all' : v > 0 ? `the light focuses ${fmt(v)} cm inside the rod` : `the light spreads as if from a point ${fmt(-v)} cm in front of the face`;
  return `Test beam: with R = ${sgn(x)} cm, ${where}.`;
}
const nText = (n: number) => (Math.abs(n - 4 / 3) < 1e-9 ? '4/3' : Math.abs(n - 1 / 3) < 1e-9 ? '1/3' : String(Math.round(n * 1e6) / 1e6));
const nPar = (n: number) => (nText(n).includes('/') ? `(${nText(n)})` : nText(n));
const par = (x: number) => (x < 0 ? `(−${-x})` : String(x));
/** A unit fraction such as 1/20 or −1/80 (every row of the level has one). */
export const unitFraction = (x: number) => `${x < 0 ? '−' : ''}1/${Math.round(Math.abs(1 / x))}`;
export const mediumName = (n: number) => (Math.abs(n - 4 / 3) < 1e-9 ? 'water' : 'glass');
export const indexText = nText;

export const powerText = (p: number) => (Math.abs(p) < 1e-9 ? '0 D (flat glass)' : `${p > 0 ? '+' : '−'}${fmt(Math.abs(p))} D (${p > 0 ? 'converging' : 'diverging'}, f = ${sgn(fromPower(p))} cm)`);
export function liquidText(f: number): string {
  return !Number.isFinite(f) || Math.abs(f) > 5000 ? 'no focus at all: the lens has vanished' : `${f > 0 ? 'converging' : 'diverging'}, f = ${sgn(f)} cm`;
}

export function explainRound(g: Game, i: number): string[] {
  if (g.kind === 'curved') {
    const r = g.rounds[i];
    const lhs = r.n2 / r.v - r.n1 / r.u;
    return [
      `n₂/v − n₁/u = ${nPar(r.n2)}/${par(r.v)} − ${nPar(r.n1)}/${par(r.u)} = ${unitFraction(lhs)}, which equals (n₂ − n₁)/R = ${nPar(r.n2 - r.n1)}/R, so R = ${sgn(r.sol)} cm${r.sol < 0 ? ': a concave face' : ''}.`,
      'Light goes from medium 1 into medium 2 at one curved surface: u is negative (the lamp is in front), a positive v is inside the glass, and a negative R means the face curves the other way (Section 9.5.1, Example 9.5).',
    ];
  }
  if (g.kind === 'grind') {
    const r = g.rounds[i];
    const how = r.shape === 'equal' ? `Both radii equal: 1/f = (n − 1)(2/R), so R = 2(n − 1)f = 2 × ${fmt(r.n - 1)} × ${r.f} = ${fmt(r.sol)} cm.` : r.shape === 'plano' ? `One face flat: 1/f = (n − 1)/R, so R = (n − 1)f = ${fmt(r.n - 1)} × ${r.f} = ${fmt(r.sol)} cm.` : `1/f = (n − 1)(1/R₁ + 1/R₂): 1/R₂ = 1/(${fmt(r.n - 1)} × ${r.f}) − 1/${r.R1}, so R₂ = ${fmt(r.sol)} cm.`;
    return [how, 'The lens-maker’s formula fixes the focal length from the glass and the two radii (Exercise 9.7, Example 9.7).'];
  }
  if (g.kind === 'stack') {
    const r = g.rounds[i];
    return [`Lenses in contact add their powers: P = P₁ + P₂, so P₂ = ${sgn(r.target)} − (${sgn(r.P1)}) = ${sgn(r.P2)} D.`, `The back lens has f = ${sgn(fromPower(r.P2))} cm, and the pair is ${powerText(r.target)} (Exercise 9.10).`];
  }
  if (g.kind === 'projector') {
    const r = g.rounds[i];
    return [`With object distance u and image distance v = mu, u + v = D gives u = D/(m + 1) = ${r.D}/${r.m + 1} = ${fmt(r.u)} cm and v = ${fmt(r.v)} cm.`, `1/f = 1/u + 1/v = 1/${fmt(r.u)} + 1/${fmt(r.v)}, so f = ${r.f} cm, with the lens ${fmt(r.u)} cm from the slide (Exercise 9.19).`];
  }
  if (g.kind === 'relay') {
    const r = g.rounds[i];
    return [`Lens 1 alone: v₁ = u₁f₁/(u₁ − f₁) = ${fmt(r.v1)} cm. That image is ${fmt(Math.abs(r.u2))} cm ${r.u2 < 0 ? 'before' : 'beyond'} lens 2, so lens 2 treats it as a ${r.u2 < 0 ? 'real' : 'virtual'} object at u₂ = ${sgn(r.u2)} cm.`, `1/v₂ = 1/f₂ + 1/u₂ gives v₂ = ${fmt(r.v2)} cm, so the screen stands ${r.s} + ${fmt(r.v2)} = ${fmt(r.screen)} cm from lens 1 (Example 9.8).`];
  }
  const r = g.rounds[i];
  return [
    `Lens in air: 1/f = (n − 1)(2/R), so n = 1 + R/(2f) = 1 + ${r.R}/${2 * r.fAir} = ${fmt(r.nG)}.`,
    r.kind === 'vanish' ? `Light bends only where the indices differ. With liquid n = ${fmt(r.nL)} = n(glass) the focal length is infinite: the lens vanishes (Example 9.6).` : `In a liquid: 1/f′ = (n(glass)/n(liquid) − 1)(1/f)/(n(glass) − 1). For f′ = ${sgn(r.fTarget)} cm, n(liquid) = ${fmt(r.nL)}${r.kind === 'diverge' ? ', above n(glass), so the lens diverges' : ''} (Example 9.7).`,
  ];
}

export function resultLine(g: Game, i: number): string {
  if (g.kind === 'curved') {
    const r = g.rounds[i];
    return r.virtual ? `Sharp: the face makes the image where the sensor sits, ${-r.v} cm in front of it.` : `Sharp: the light focuses on the sensor, ${r.v} cm inside the rod.`;
  }
  if (g.kind === 'grind') return `Sharp: the focus lands on Glim’s sensor at ${g.rounds[i].f} cm.`;
  if (g.kind === 'stack') return `The pair is exactly ${powerText(g.rounds[i].target)}.`;
  if (g.kind === 'projector') return `Sharp, and ${g.rounds[i].m} times as big: it fills the frame.`;
  if (g.kind === 'relay') return `Beacon’s light focuses on the screen, ${fmt(g.rounds[i].screen)} cm from lens 1.`;
  return g.rounds[i].kind === 'vanish' ? 'The lens has vanished: it is invisible in this liquid.' : `The trick works: ${liquidText(g.rounds[i].fTarget)}.`;
}

/** After a miss: the effect of what the player chose, never the right answer. */
export function missText(g: Game, i: number, tried: { x?: number; f?: number }): string {
  if (g.kind === 'curved') {
    // direction only (review fix): no focus depth, so two misses cannot pin the radius down
    const r = g.rounds[i];
    const side = curvedSide(r, tried.x ?? r.sol);
    if (r.virtual) return `With that radius the face bent the light too ${side === 'strong' ? 'strongly' : 'weakly'} for the image to land on the sensor: the picture is a blur.`;
    return side === 'strong' ? 'With that radius the face bent the light too strongly: it came to a focus in front of the sensor, so the picture is a blur.' : 'With that radius the face bent the light too weakly: it did not come to a focus until beyond the sensor (or not at all), so the picture is a blur.';
  }
  if (g.kind === 'grind') {
    // direction only: no focal length
    return `With that radius the focus lands ${grindSide(g.rounds[i], tried.x ?? 1) === 'behind' ? 'behind' : 'in front of'} Glim’s sensor: the picture is a blur.`;
  }
  if (g.kind === 'stack') {
    return stackSide(g.rounds[i], tried.x ?? 0) === 'tooConverging'
      ? 'The pair is too converging for Dot’s picture: it brings the light together too strongly, or does not spread it enough.'
      : 'The pair is too diverging for Dot’s picture: it spreads the light too much, or does not bring it together enough.';
  }
  if (g.kind === 'projector') {
    const m = projectorMiss(g.rounds[i], tried.f ?? 1, tried.x ?? 0);
    if (m.none) return 'With that lens the slide is inside the focus: no real image reaches the screen.';
    const where = m.where === 'on' ? 'The picture is sharp on the screen' : `The picture comes to a focus ${m.where === 'short' ? 'short of' : 'beyond'} the screen: a blur`;
    const size = m.size === 'big' ? 'bigger than the frame' : m.size === 'small' ? 'smaller than the frame' : 'about the frame’s size';
    return `${where}, and it is ${size}${m.where === 'on' && m.size === 'about' ? ', but not exactly the one asked for' : ''}.`;
  }
  if (g.kind === 'relay') return 'Beacon’s light is not focused on the screen there: the picture is a smear.';
  const r = g.rounds[i];
  const low = liquidSide(r, tried.x ?? 1.3) === 'low';
  if (r.kind === 'vanish') return `In that liquid the lens still bends the light like a ${low ? 'converging' : 'diverging'} lens: it has not vanished.`;
  if (r.kind === 'target') return low ? 'In that liquid the lens converges too strongly: not the trick the magician promised.' : 'In that liquid the lens is too weak, or has even vanished or turned diverging: not the trick the magician promised.';
  return low ? 'In that liquid the lens does not diverge enough, or has even turned converging: not the trick the magician promised.' : 'In that liquid the lens diverges too strongly: not the trick the magician promised.';
}
