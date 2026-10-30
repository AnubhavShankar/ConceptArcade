// Pure rules of Air Time: no DOM, no canvas. A stunt rider spins at a rate ω(x) radians per metre while flying (the total spin is the definite integral), or a
// nitro raises the speed at a rate k(x) per metre (the speed is multiplied by e^(∫k dx)). The player places the landing ramp or the nitro cut-off cone at x = q;
// exactly one whole q in every round makes the total exactly the trick angle or the speed the canyon needs.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { num } from '@core/mathkit';
import { shuffle } from '@core/quiz';

export type Kind = 'spin' | 'boost';
export interface Entry {
  /** The integrand as written on the course sign, e.g. '16/(x² + 4)'. */
  rate: string;
  f: (x: number) => number;
  /** An antiderivative of f. */
  F: (x: number) => number;
  p: number; // kicker or nitro start
  q: number; // the winning ramp or cone position
  lo: number; // dial range
  hi: number;
  kind: Kind;
  /** spin: the trick angle in radians (2π or 4π); boost: the speed factor. */
  target: number;
  /** How the target is written: '2π', '4π', '3', '√2', '5/2'. */
  label: string;
  /** The working shown after a win. */
  work: string;
}
export interface Round extends Entry {
  start: number;
  assist: 0 | 1 | 2;
}
export const V0 = 40; // km/h at the start of a boost round
export const SPIN_LAND = 1.35; // seconds into the launch when the bike lands (spin)
export const BOOST_LAND = 1.55; // seconds into the launch when the bike lands or misses (boost)

const P = Math.PI,
  sq = Math.sqrt,
  at = Math.atan,
  as = Math.asin,
  ln = Math.log;

const S = (rate: string, f: (x: number) => number, F: (x: number) => number, p: number, q: number, lo: number, hi: number, target: number, label: string, work: string): Entry => ({ rate, f, F, p, q, lo, hi, kind: 'spin', target, label, work });
const B = (rate: string, f: (x: number) => number, F: (x: number) => number, p: number, q: number, lo: number, hi: number, target: number, label: string, work: string): Entry => ({ rate, f, F, p, q, lo, hi, kind: 'boost', target, label, work });

export const POOLS: Record<1 | 2 | 3 | 4, [Entry[], Entry[], Entry[]]> = {
  1: [
    [
      S('16/(x² + 4)', (x) => 16 / (x * x + 4), (x) => 8 * at(x / 2), 0, 2, 1, 10, 2 * P, '2π', '∫ 16/(x² + 4) dx = 16 · ½ tan⁻¹(x/2) = 8 tan⁻¹(x/2). From 0 to 2: 8(π/4 − 0) = 2π.'),
      S('8/(x² + 1)', (x) => 8 / (x * x + 1), (x) => 8 * at(x), 0, 1, 1, 10, 2 * P, '2π', '∫ 8/(x² + 1) dx = 8 tan⁻¹ x. From 0 to 1: 8(π/4 − 0) = 2π.'),
      S('24/(x² + 9)', (x) => 24 / (x * x + 9), (x) => 8 * at(x / 3), 0, 3, 1, 10, 2 * P, '2π', '∫ 24/(x² + 9) dx = 24 · ⅓ tan⁻¹(x/3) = 8 tan⁻¹(x/3). From 0 to 3: 8(π/4 − 0) = 2π.'),
    ],
    [
      S('16/(x² + 4)', (x) => 16 / (x * x + 4), (x) => 8 * at(x / 2), 1, 6, 2, 11, 2 * P, '2π', '8 tan⁻¹(x/2) from 1 to 6 is 8(tan⁻¹ 3 − tan⁻¹ ½). tan of the difference is (3 − ½)/(1 + 3/2) = 1, so it is π/4 and the spin is 8 · π/4 = 2π.'),
      S('24/(x² + 9)', (x) => 24 / (x * x + 9), (x) => 8 * at(x / 3), 1, 6, 2, 11, 2 * P, '2π', '8 tan⁻¹(x/3) from 1 to 6 is 8(tan⁻¹ 2 − tan⁻¹ ⅓). tan of the difference is (2 − ⅓)/(1 + ⅔) = 1, so the spin is 8 · π/4 = 2π.'),
      S('8/(x² + 4)', (x) => 8 / (x * x + 4), (x) => 4 * at(x / 2), -2, 2, -1, 8, 2 * P, '2π', '∫ 8/(x² + 4) dx = 4 tan⁻¹(x/2). From −2 to 2: 4(π/4 − (−π/4)) = 2π.'),
      S('4/(x² + 1)', (x) => 4 / (x * x + 1), (x) => 4 * at(x), -1, 1, 0, 9, 2 * P, '2π', '∫ 4/(x² + 1) dx = 4 tan⁻¹ x. From −1 to 1: 4(π/4 + π/4) = 2π.'),
    ],
    [
      S('16/(x² + 4)', (x) => 16 / (x * x + 4), (x) => 8 * at(x / 2), -2, 2, -1, 8, 4 * P, '4π', '8 tan⁻¹(x/2) from −2 to 2: 8(π/4 + π/4) = 4π, a double backflip.'),
      S('8/(x² + 1)', (x) => 8 / (x * x + 1), (x) => 8 * at(x), -1, 1, 0, 9, 4 * P, '4π', '8 tan⁻¹ x from −1 to 1: 8(π/4 + π/4) = 4π, a double backflip.'),
      S('32/(x² + 4)', (x) => 32 / (x * x + 4), (x) => 16 * at(x / 2), 0, 2, 1, 10, 4 * P, '4π', '∫ 32/(x² + 4) dx = 16 tan⁻¹(x/2). From 0 to 2: 16 · π/4 = 4π, a double backflip.'),
    ],
  ],
  2: [
    [
      S('12/√(64 − x²)', (x) => 12 / sq(64 - x * x), (x) => 12 * as(x / 8), 0, 4, 1, 7, 2 * P, '2π', '∫ 12/√(64 − x²) dx = 12 sin⁻¹(x/8). From 0 to 4: 12(π/6 − 0) = 2π.'),
      S('12/√(144 − x²)', (x) => 12 / sq(144 - x * x), (x) => 12 * as(x / 12), 0, 6, 1, 11, 2 * P, '2π', '12 sin⁻¹(x/12) from 0 to 6: 12 · π/6 = 2π.'),
      S('12/√(256 − x²)', (x) => 12 / sq(256 - x * x), (x) => 12 * as(x / 16), 0, 8, 1, 15, 2 * P, '2π', '12 sin⁻¹(x/16) from 0 to 8: 12 · π/6 = 2π.'),
    ],
    [
      S('6/√(64 − x²)', (x) => 6 / sq(64 - x * x), (x) => 6 * as(x / 8), -4, 4, -3, 7, 2 * P, '2π', '6 sin⁻¹(x/8) from −4 to 4: 6(π/6 + π/6) = 2π.'),
      S('6/√(144 − x²)', (x) => 6 / sq(144 - x * x), (x) => 6 * as(x / 12), -6, 6, -5, 11, 2 * P, '2π', '6 sin⁻¹(x/12) from −6 to 6: 6(π/6 + π/6) = 2π.'),
      S('6/√(256 − x²)', (x) => 6 / sq(256 - x * x), (x) => 6 * as(x / 16), -8, 8, -7, 15, 2 * P, '2π', '6 sin⁻¹(x/16) from −8 to 8: 6(π/6 + π/6) = 2π.'),
    ],
    [
      S('24/√(256 − 4x²)', (x) => 24 / sq(256 - 4 * x * x), (x) => 12 * as(x / 8), 0, 4, 1, 7, 2 * P, '2π', 'Take out the 4: √(256 − 4x²) = 2√(64 − x²), so the rate is 12/√(64 − x²) and the spin is 12 sin⁻¹(x/8) from 0 to 4 = 12 · π/6 = 2π.'),
      S('36/√(576 − 9x²)', (x) => 36 / sq(576 - 9 * x * x), (x) => 12 * as(x / 8), 0, 4, 1, 7, 2 * P, '2π', '√(576 − 9x²) = 3√(64 − x²), so the rate is 12/√(64 − x²): 12 sin⁻¹(x/8) from 0 to 4 = 2π.'),
      S('24/√(576 − 4x²)', (x) => 24 / sq(576 - 4 * x * x), (x) => 12 * as(x / 12), 0, 6, 1, 11, 2 * P, '2π', '√(576 − 4x²) = 2√(144 − x²), so the rate is 12/√(144 − x²): 12 sin⁻¹(x/12) from 0 to 6 = 2π.'),
      S('48/√(256 − 4x²)', (x) => 48 / sq(256 - 4 * x * x), (x) => 24 * as(x / 8), 0, 4, 1, 7, 4 * P, '4π', '√(256 − 4x²) = 2√(64 − x²), so the rate is 24/√(64 − x²): 24 sin⁻¹(x/8) from 0 to 4 = 24 · π/6 = 4π, a double backflip.'),
    ],
  ],
  3: [
    [
      B('1/√(x² + 9)', (x) => 1 / sq(x * x + 9), (x) => ln(x + sq(x * x + 9)), 0, 4, 1, 14, 3, '3', '∫ dx/√(x² + 9) = log|x + √(x² + 9)|. From 0 to 4: log 9 − log 3 = log 3, so the speed is multiplied by e^(log 3) = 3: 120 km/h.'),
      B('1/√(x² + 16)', (x) => 1 / sq(x * x + 16), (x) => ln(x + sq(x * x + 16)), 0, 3, 1, 14, 2, '2', 'log|x + √(x² + 16)| from 0 to 3: log 8 − log 4 = log 2, so the speed doubles to 80 km/h.'),
      B('1/√(x² + 25)', (x) => 1 / sq(x * x + 25), (x) => ln(x + sq(x * x + 25)), 0, 12, 1, 14, 5, '5', 'log|x + √(x² + 25)| from 0 to 12: log 25 − log 5 = log 5, so the speed is multiplied by 5: 200 km/h.'),
    ],
    [
      B('1/√(x² − 64)', (x) => 1 / sq(x * x - 64), (x) => ln(x + sq(x * x - 64)), 10, 17, 11, 20, 2, '2', '∫ dx/√(x² − 64) = log|x + √(x² − 64)|. From 10 to 17: log 32 − log 16 = log 2: 80 km/h.'),
      B('1/√(x² − 144)', (x) => 1 / sq(x * x - 144), (x) => ln(x + sq(x * x - 144)), 13, 20, 14, 23, 2, '2', 'log|x + √(x² − 144)| from 13 to 20: log 36 − log 18 = log 2: 80 km/h.'),
      B('1/√(x² − 144)', (x) => 1 / sq(x * x - 144), (x) => ln(x + sq(x * x - 144)), 15, 20, 16, 25, 1.5, '3/2', 'log|x + √(x² − 144)| from 15 to 20: log 36 − log 24 = log(3/2): 60 km/h.'),
    ],
    [
      B('1/(x² − 1)', (x) => 1 / (x * x - 1), (x) => 0.5 * ln(Math.abs((x - 1) / (x + 1))), 2, 5, 3, 12, Math.SQRT2, '√2', '∫ dx/(x² − 1) = ½ log|(x − 1)/(x + 1)|. From 2 to 5: ½(log(4/6) − log(1/3)) = ½ log 2, so the speed is multiplied by e^(½ log 2) = √2: 40√2 ≈ 56.6 km/h.'),
      B('2/(x² − 1)', (x) => 2 / (x * x - 1), (x) => ln(Math.abs((x - 1) / (x + 1))), 2, 5, 3, 12, 2, '2', '∫ 2/(x² − 1) dx = log|(x − 1)/(x + 1)|. From 2 to 5: log(4/6) − log(1/3) = log 2: 80 km/h.'),
      B('4/(x² − 4)', (x) => 4 / (x * x - 4), (x) => ln(Math.abs((x - 2) / (x + 2))), 3, 6, 4, 13, 2.5, '5/2', '∫ 4/(x² − 4) dx = log|(x − 2)/(x + 2)|. From 3 to 6: log(4/8) − log(1/5) = log(5/2): 100 km/h.'),
    ],
  ],
  4: [
    [
      S('16/(x² − 6x + 13)', (x) => 16 / (x * x - 6 * x + 13), (x) => 8 * at((x - 3) / 2), 3, 5, 4, 13, 2 * P, '2π', 'x² − 6x + 13 = (x − 3)² + 4, so the integral is 8 tan⁻¹((x − 3)/2). From 3 to 5: 8(π/4 − 0) = 2π.'),
      S('8/(x² − 4x + 5)', (x) => 8 / (x * x - 4 * x + 5), (x) => 8 * at(x - 2), 2, 3, 3, 12, 2 * P, '2π', 'x² − 4x + 5 = (x − 2)² + 1, so the integral is 8 tan⁻¹(x − 2). From 2 to 3: 8 · π/4 = 2π.'),
      S('8/(x² + 2x + 2)', (x) => 8 / (x * x + 2 * x + 2), (x) => 8 * at(x + 1), -1, 0, 0, 9, 2 * P, '2π', 'x² + 2x + 2 = (x + 1)² + 1, so the integral is 8 tan⁻¹(x + 1). From −1 to 0: 8 · π/4 = 2π.'),
    ],
    [
      S('12/√(60 + 4x − x²)', (x) => 12 / sq(60 + 4 * x - x * x), (x) => 12 * as((x - 2) / 8), 2, 6, 3, 9, 2 * P, '2π', '60 + 4x − x² = 64 − (x − 2)², so the integral is 12 sin⁻¹((x − 2)/8). From 2 to 6: 12 · π/6 = 2π.'),
      S('6/√(60 + 4x − x²)', (x) => 6 / sq(60 + 4 * x - x * x), (x) => 6 * as((x - 2) / 8), -2, 6, -1, 9, 2 * P, '2π', '60 + 4x − x² = 64 − (x − 2)², so the integral is 6 sin⁻¹((x − 2)/8). From −2 to 6: 6(π/6 + π/6) = 2π.'),
      S('12/√(140 + 4x − x²)', (x) => 12 / sq(140 + 4 * x - x * x), (x) => 12 * as((x - 2) / 12), 2, 8, 3, 13, 2 * P, '2π', '140 + 4x − x² = 144 − (x − 2)², so the integral is 12 sin⁻¹((x − 2)/12). From 2 to 8: 12 · π/6 = 2π.'),
    ],
    [
      B('1/√(x² + 4x + 13)', (x) => 1 / sq(x * x + 4 * x + 13), (x) => ln(x + 2 + sq(x * x + 4 * x + 13)), -2, 2, -1, 12, 3, '3', 'x² + 4x + 13 = (x + 2)² + 9, so the integral is log|x + 2 + √(x² + 4x + 13)|. From −2 to 2: log 9 − log 3 = log 3: 120 km/h.'),
      B('1/√(x² − 2x + 17)', (x) => 1 / sq(x * x - 2 * x + 17), (x) => ln(x - 1 + sq(x * x - 2 * x + 17)), 1, 4, 2, 15, 2, '2', 'x² − 2x + 17 = (x − 1)² + 16, so the integral is log|x − 1 + √(x² − 2x + 17)|. From 1 to 4: log 8 − log 4 = log 2: 80 km/h.'),
      B('1/√(x² + 6x + 34)', (x) => 1 / sq(x * x + 6 * x + 34), (x) => ln(x + 3 + sq(x * x + 6 * x + 34)), -3, 9, -2, 13, 5, '5', 'x² + 6x + 34 = (x + 3)² + 25, so the integral is log|x + 3 + √(x² + 6x + 34)|. From −3 to 9: log 25 − log 5 = log 5: 200 km/h.'),
    ],
  ],
};

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  return POOLS[level].map((pool, k) => {
    const e = pick(pool, random);
    return { ...e, start: e.q === e.lo ? e.hi : e.lo, assist: aid(k) };
  });
}

/** spin: total radians F(q) − F(p); boost: the speed factor e^(F(q) − F(p)). */
export const value = (r: Entry, q: number) => (r.kind === 'spin' ? r.F(q) - r.F(r.p) : Math.exp(r.F(q) - r.F(r.p)));
export const judge = (r: Entry, q: number) => Math.abs(value(r, q) - r.target) < 1e-9;

export type Fault = 'under' | 'over' | 'wayUnder' | 'wayOver' | 'short' | 'long';
/** How the attempt fails: spin under/over (small) or way under/over (more than π/2 off); boost short/long. */
export function fault(r: Entry, q: number): Fault | null {
  if (judge(r, q)) return null;
  if (r.kind === 'boost') return value(r, q) < r.target ? 'short' : 'long';
  const d = value(r, q) - r.target;
  return d < -Math.PI / 2 ? 'wayUnder' : d < 0 ? 'under' : d > Math.PI / 2 ? 'wayOver' : 'over';
}

/** Seconds into the launch when the verdict lands. */
export const landTime = (r: Entry) => (r.kind === 'spin' ? SPIN_LAND : BOOST_LAND);
/** The target speed in km/h, written: '120 km/h' or '40√2 ≈ 56.6 km/h'. */
export const speedText = (r: Entry) => (r.label === '√2' ? '40√2 ≈ 56.6 km/h' : `${fmt(V0 * r.target)} km/h`);

// ---- Words -----------------------------------------------------------------------------------------------------------------------------------------------

export const intel = (r: Round) =>
  r.kind === 'spin'
    ? `Kicker at x = ${num(r.p)} m. In the air Blaze spins at ω(x) = ${r.rate} radians per metre. Place the landing ramp so the total spin from the kicker is exactly ${r.label}, ${r.target > 3 * Math.PI ? 'a double backflip' : 'one backflip'}.`
    : `The nitro fires from x = ${num(r.p)} m and raises the speed at the rate k(x) = ${r.rate} per metre, so the speed is multiplied by e^(∫k dx). The bike starts at 40 km/h; cut the nitro where it reaches ${speedText(r)} (×${r.label}).`;

export const hintText = (r: Round) => `${intel(r)} ${r.assist === 0 ? 'Round 1: the gauge shows your setting live.' : r.assist === 1 ? 'The gauge is off: a test run costs a charge.' : 'Boss round: no gauge, no test run.'}`;

/** What the player's setting did (q is the player's setting; never the right answer). */
export function missText(r: Entry, q: number): string {
  switch (fault(r, q)) {
    case 'under':
      return `With the landing ramp at x = ${num(q)} m Blaze had not spun far enough: the bike came down rear wheel first with its nose up and looped out from under the rider.`;
    case 'over':
      return `With the landing ramp at x = ${num(q)} m Blaze spun too far: the bike came down nose first and threw the rider over the handlebars.`;
    case 'wayUnder':
      return `With the landing ramp at x = ${num(q)} m Blaze was still upside down from too little spin and landed on the helmet.`;
    case 'wayOver':
      return `With the landing ramp at x = ${num(q)} m Blaze spun so far past the trick that the bike landed upside down.`;
    case 'short':
      return `Cutting the nitro at x = ${num(q)} m left the bike too slow: it fell short of the landing pad and dropped into the canyon.`;
    case 'long':
      return `Cutting the nitro at x = ${num(q)} m made the bike too fast: it flew over the landing pad and smashed into the billboard.`;
    default:
      return 'The jump worked.';
  }
}

/** The charge: what the setting gives, read out. */
export const testText = (r: Entry, q: number) =>
  r.kind === 'spin'
    ? `Practice jump: with the ramp at x = ${num(q)} m the total spin is ${Math.round((value(r, q) * 180) / Math.PI)}°.`
    : `Dyno test: cutting the nitro at x = ${num(q)} m gives ${fmt(V0 * value(r, q))} km/h at the lip.`;

export const winText = (r: Entry) => (r.kind === 'spin' ? `Clean landing! ${r.work}` : `Big air! ${r.work}`);
