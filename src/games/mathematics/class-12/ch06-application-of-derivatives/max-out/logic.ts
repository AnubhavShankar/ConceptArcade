// Pure rules of Max Out: no DOM, no canvas. Every round has one whole-number setting that is the true maximum or minimum.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { shuffle } from '@core/quiz';

export type Shape = 'square' | 'rect' | 'can' | 'tank' | 'cone' | 'cylVol' | 'cylSurf' | 'cable';
export interface Round {
  shape: Shape;
  goal: 'max' | 'min';
  /**
   * square: side of the sheet, cm. rect: one side. can: R, so the can holds 2πR³ cm³. tank: base area, m².
   * cone: radius of the sphere, cm. cylVol, cylSurf: height H of the cone, cm (its base radius is H/2).
   * cable: the curvature k of the cable y = kx².
   */
  a: number;
  /** rect: the other side. tank: depth, m. cable: where the climber waits along the x axis. */
  b: number;
  /** tank: price of the base per m². */
  c: number;
  /** tank: price of the walls per m². */
  d: number;
  best: number;
  lo: number;
  hi: number;
  start: number;
  assist: 0 | 1 | 2;
}

export const pick = <T>(xs: readonly T[], random: () => number, n = 1): T[] => shuffle(xs, random).slice(0, n);

/** The quantity being made as large or as small as possible, at setting s. Areas and volumes with π are given divided by π. */
export function objective(r: Round, s: number): number {
  switch (r.shape) {
    case 'square':
      return s * (r.a - 2 * s) ** 2;
    case 'rect':
      return s * (r.a - 2 * s) * (r.b - 2 * s);
    case 'can':
      return 2 * s * s + (4 * r.a ** 3) / s;
    case 'tank':
      return r.c * r.a + r.d * 2 * r.b * (s + r.a / s);
    case 'cone':
      return (s * s * (2 * r.a - s)) / 3;
    case 'cylVol':
      return ((r.a - s) / 2) ** 2 * s;
    case 'cylSurf':
      return (r.a - s) * s;
    case 'cable':
      return (s - r.b) ** 2 + (r.a * s * s) ** 2;
  }
}

const RANGE: Record<Shape, (r: Pick<Round, 'a' | 'b'>) => [number, number]> = {
  square: (r) => [1, Math.ceil(r.a / 2) - 1],
  rect: (r) => [1, Math.ceil(Math.min(r.a, r.b) / 2) - 1],
  can: () => [1, 10],
  tank: () => [1, 10],
  cone: (r) => [1, 2 * r.a - 1],
  cylVol: (r) => [1, r.a - 1],
  cylSurf: (r) => [1, r.a - 1],
  cable: () => [-6, 8],
};

/** The setting where the derivative is zero, worked out by calculus (the tests check it against a scan of every dial position). */
function bestOf(r: Pick<Round, 'shape' | 'a' | 'b'>): number {
  switch (r.shape) {
    case 'square':
      return r.a / 6;
    case 'rect':
      return Math.round((r.a + r.b - Math.sqrt(r.a * r.a - r.a * r.b + r.b * r.b)) / 6);
    case 'can':
      return r.a;
    case 'tank':
      return Math.sqrt(r.a);
    case 'cone':
      return (4 * r.a) / 3;
    case 'cylVol':
      return r.a / 3;
    case 'cylSurf':
      return r.a / 2;
    case 'cable':
      return NaN; // set by cableRound from the x* the climber was placed for
  }
}

function make(shape: Shape, over: Partial<Round>, k: number): Round {
  const r: Round = { shape, goal: shape === 'square' || shape === 'rect' || shape === 'cone' || shape === 'cylVol' || shape === 'cylSurf' ? 'max' : 'min', a: 0, b: 0, c: 0, d: 0, best: 0, lo: 0, hi: 0, start: 0, assist: aid(k), ...over };
  [r.lo, r.hi] = RANGE[shape](r);
  r.best = over.best ?? bestOf(r);
  r.start = shape === 'cable' ? 0 : r.lo;
  return r;
}

/** Where the climber must wait so that the nearest point of y = kx² is x*: D² = (x − p)² + k²x⁴ is smallest where p = x + 2k²x³ (rounded to the cent, which is exact for the k used). */
export const climberAt = (k: number, xStar: number) => Number((xStar + 2 * k * k * xStar ** 3).toFixed(2));
const cableRound = (k: number, xStar: number, round: number) => make('cable', { a: k, b: climberAt(k, xStar), best: xStar }, round);

/** How the curvature is written on screen: y = ½x², y = 0.3x², y = x². */
export const kText = (k: number) => (k === 1 ? '' : k === 0.5 ? '½' : String(k));

/**
 * Every (k, x*) a cable round may use. The climber's x must be a number with at most two decimals, on the screen (−6 to 8), and at least 1 away from x*, so that putting Fold
 * straight under the climber never wins. The ratio of the climber's x to x* is 1 + 2(kx*)², so it takes six different values: no fixed fraction of the climber's x wins either.
 */
export const CABLE_ROWS: { k: number; x: number; b: number }[] = (() => {
  const rows: { k: number; x: number; b: number }[] = [];
  for (const k of [1, 1.5, 0.5, 0.3, 0.2, 0.6, 0.1]) {
    for (let x = -5; x <= 5; x++) {
      if (x === 0) continue;
      const exact = x + 2 * k * k * x ** 3;
      const b = climberAt(k, x);
      if (Math.abs(b - exact) > 1e-9 || b < -6 || b > 8 || Math.abs(b - x) < 1 || k * x * x > 20) continue;
      rows.push({ k, x, b });
    }
  }
  return rows;
})();

/** Three cable rows with different curvatures and different answers in size (|x*|), so no round is the mirror image of another. */
function cableRows(random: () => number): { k: number; x: number }[] {
  for (;;) {
    const out: { k: number; x: number }[] = [];
    for (const row of shuffle(CABLE_ROWS, random)) {
      if (out.some((o) => o.k === row.k || Math.abs(o.x) === Math.abs(row.x))) continue;
      out.push(row);
      if (out.length === 3) return out;
    }
  }
}

export function buildRounds(level: number, random: () => number): Round[] {
  if (level === 1) {
    const [s1, s2] = pick([12, 18, 24, 30, 36], random, 2);
    const [a, b] = pick([[45, 24], [24, 9], [48, 18], [72, 27]], random)[0];
    return [make('square', { a: s1 }, 0), make('square', { a: s2 }, 1), make('rect', { a, b }, 2)];
  }
  if (level === 2) {
    const [r1, r2] = pick([2, 3, 4, 5], random, 2);
    const area = pick([4, 9, 16, 25], random)[0];
    const [depth] = pick([2, 3], random);
    const [pb] = pick([50, 70, 80], random);
    const [ps] = pick([30, 45, 60], random);
    return [make('can', { a: r1 }, 0), make('can', { a: r2 }, 1), make('tank', { a: area, b: depth, c: pb, d: ps }, 2)];
  }
  if (level === 3) {
    const [R] = pick([3, 6, 9], random);
    const [h1, h2] = pick([6, 12, 18], random, 2);
    return [make('cone', { a: R }, 0), make('cylVol', { a: h1 }, 1), make('cylSurf', { a: h2 }, 2)];
  }
  return cableRows(random).map((row, i) => cableRound(row.k, row.x, i));
}

export const judge = (r: Round, s: number) => s === r.best;

/** The reading at a setting, with its unit. */
export function show(r: Round, s: number): string {
  const o = objective(r, s);
  switch (r.shape) {
    case 'square':
    case 'rect':
      return `${fmt(o)} cm³`;
    case 'cone':
    case 'cylVol':
      return `${fmt(o)}π cm³`;
    case 'cylSurf':
    case 'can':
      return `${fmt(o)}π cm²`;
    case 'tank':
      return `₹${fmt(o)}`;
    case 'cable':
      return `√${fmt(o)} m`;
  }
}

/**
 * After a miss: what the build did, in words and never in numbers. It gives the direction of the setting (which side of the best one it was) and nothing else: no volume,
 * metal, cost or length, because from the value at a setting you can work towards the best one. Only a paid test build prints readings.
 */
export function missText(r: Round, s: number): string {
  const low = s < r.best;
  switch (r.shape) {
    case 'square':
    case 'rect':
      return `${low ? 'A wide, shallow tray' : 'A tall, narrow box'}: it held less than the biggest box this sheet can make, and the crate would not go in.`;
    case 'can':
      return `${low ? 'A tall, thin can' : 'A short, wide can'}: it needed more metal than the leanest can for this volume, and the order’s metal ran out before the last seam was welded.`;
    case 'tank':
      return `${low ? 'A long, narrow base' : 'A wide base with a short side'}: the tank cost more than the cheapest one that holds this volume, and the order’s budget ran out before it was finished.`;
    case 'cone':
    case 'cylVol':
      return `${low ? 'A squat' : 'A tall, thin'} solid: a bigger one still fits, so the buyer sent it back.`;
    case 'cylSurf':
      return `${low ? 'A squat' : 'A tall, thin'} cylinder: more curved surface was possible, so the client wanted more paint area and sent it back.`;
    case 'cable':
      return `Fold hung too far ${low ? 'left' : 'right'} along the cable: a shorter line to the climber existed, so the rope ran out before the hook reached the climber.`;
  }
}

/**
 * How full the bar for a build is, as a fraction of the target: exactly 1 on a win, and a fixed 0.55 (a maximum that fell short) or 1.45 (a minimum that ran over) on a
 * miss, whatever the player's setting. So the bar never measures how far off the setting was.
 */
export const barRatio = (r: Round, ok: boolean) => (ok ? 1 : r.goal === 'min' ? 1.45 : 0.55);

/** A test build (costs a charge): the reading at the current setting, nothing about where the best one is. */
export const spotText = (r: Round, s: number) => `Test build at ${s}: ${show(r, s)}.`;

const sq = (n: number) => n * n;
/** After a hit: the working, from the function to the proof that it is a maximum or a minimum. */
export function explain(r: Round): string {
  const o = (s: number) => objective(r, s);
  switch (r.shape) {
    case 'square':
      return `V = x(${r.a} − 2x)². V′ = (${r.a} − 2x)(${r.a} − 6x) = 0 gives x = ${r.a / 2} (the box would have no floor) or x = ${r.best} cm. V″ = −${4 * r.a} < 0, so it is a maximum: V = ${fmt(o(r.best))} cm³.`;
    case 'rect': {
      const sum = r.a + r.b;
      return `V = x(${r.a} − 2x)(${r.b} − 2x), so V′ = 12x² − ${4 * sum}x + ${r.a * r.b} = 0. The roots are x = ${r.best} and x = ${fmt(otherRoot(r))}; the second is more than half the shorter side, so that cut is impossible. V″ = 24x − ${4 * sum} < 0 at x = ${r.best}: V = ${fmt(o(r.best))} cm³.`;
    }
    case 'can': {
      const V = 2 * r.a ** 3;
      return `A = 2πr² + 2V/r with V = ${V}π cm³. A′ = 4πr − 2V/r² = 0 gives r³ = V/(2π) = ${r.a ** 3}, so r = ${r.best} cm. A″ = 4π + 4V/r³ > 0, a minimum: A = ${fmt(o(r.best))}π cm², and the height is V/(πr²) = ${(V / sq(r.best))} = 2r.`;
    }
    case 'tank':
      return `With base x by ${r.a}/x and depth ${r.b} m, C = ${r.c * r.a} + ${2 * r.b * r.d}(x + ${r.a}/x). C′ = 0 gives x² = ${r.a}, so x = ${r.best} m (the prices do not change it). C″ > 0, a minimum: ₹${fmt(o(r.best))}.`;
    case 'cone':
      return `A cone of height h in a sphere of radius ${r.a} has r² = h(${2 * r.a} − h), so V = (π/3)h²(${2 * r.a} − h). V′ = 0 gives h = 4R/3 = ${r.best} cm. V″ < 0 there: V = ${fmt(o(r.best))}π cm³.`;
    case 'cylVol':
      return `The cone has height ${r.a} and base radius ${r.a / 2}, so by similar triangles r = (${r.a} − h)/2 and V = πr²h. V′ = 0 gives h = H/3 = ${r.best} cm, a third of the cone’s height. V″ < 0: V = ${fmt(o(r.best))}π cm³.`;
    case 'cylSurf':
      return `Curved surface S = 2πrh = π(${r.a} − h)h. S′ = π(${r.a} − 2h) = 0 gives h = H/2 = ${r.best} cm. S″ = −2π < 0: S = ${fmt(o(r.best))}π cm². (The volume was largest at H/3, the surface at H/2.)`;
    case 'cable':
      return `D² = (x ${r.b < 0 ? '+' : '−'} ${fmt(Math.abs(r.b))})² + (${kText(r.a)}x²)². (D²)′ = 2(x ${r.b < 0 ? '+' : '−'} ${fmt(Math.abs(r.b))}) + ${fmt(Number((4 * r.a * r.a).toFixed(4)))}x³ = 0 gives x = ${r.best}. (D²)″ > 0, so it is the nearest point: D² = ${fmt(o(r.best))}, D = √${fmt(o(r.best))} m.`;
  }
}
const otherRoot = (r: Round) => (r.a + r.b + Math.sqrt(r.a * r.a - r.a * r.b + r.b * r.b)) / 6;

/** What the hero is told about the round. */
export function intel(r: Round): string {
  switch (r.shape) {
    case 'square':
      return `A square tin sheet, ${r.a} cm by ${r.a} cm. Cut a square of side x from each corner and fold up the sides. Most volume wins.`;
    case 'rect':
      return `A tin sheet, ${r.a} cm by ${r.b} cm. Cut a square of side x from each corner and fold up the sides. Most volume wins.`;
    case 'can':
      return `A closed can must hold exactly ${2 * r.a ** 3}π cm³. Dial the radius r in cm; the height follows. Least metal wins.`;
    case 'tank':
      return `An open tank, ${r.b} m deep, holding ${r.a * r.b} m³: the base is x m by ${r.a}/x m. Base ₹${r.c}/m², walls ₹${r.d}/m². Dial x in m; least cost wins.`;
    case 'cone':
      return `A cone with its apex at the top of a sphere of radius ${r.a} cm and its base circle on the sphere. Dial the cone’s height h. Most volume wins.`;
    case 'cylVol':
      return `A cylinder stands on the base of a cone ${r.a} cm tall with base radius ${r.a / 2} cm. Dial the cylinder’s height h. Most volume wins.`;
    case 'cylSurf':
      return `A cylinder stands on the base of a cone ${r.a} cm tall with base radius ${r.a / 2} cm. Dial the cylinder’s height h. Most curved surface wins.`;
    case 'cable':
      return `The cable runs along y = ${kText(r.a)}x² (heights from its lowest point). The climber waits at (${r.b}, 0). Dial where Fold sits on the cable; the shortest winch line wins.`;
  }
}
