// Pure rules of Signal Heist: no DOM, no canvas. A vault lock broadcasts a signal f(x) (a power or a product of sines and cosines). The player sets the
// amplitude of each offered pure tone; the lock opens only when the sum of the tones equals f exactly (a trigonometric identity). Level 4 asks for the net
// charge, the integral of f from 0 to π/2, as a fuse rating in twelfths.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';

/** A band is '1' (the constant), or 'sin kx' / 'cos kx' with k a whole number ('sin x' for k = 1). */
export type Band = string;
/** The pure tone of a band, as a function of x. */
export function tone(b: Band): (x: number) => number {
  if (b === '1') return () => 1;
  const m = /^(sin|cos) (\d*)x$/.exec(b);
  if (!m) throw new Error(`bad band ${b}`);
  const k = m[2] ? Number(m[2]) : 1;
  return m[1] === 'sin' ? (x) => Math.sin(k * x) : (x) => Math.cos(k * x);
}
export interface MatchRow {
  /** The lock signal as shown, e.g. 'sin 3x cos 4x'. */
  name: string;
  f: (x: number) => number;
  /** The tones offered, in slot order, with the winning amplitude of each in eighths. */
  bands: [Band, number][];
  /** The identity, as a sentence. */
  identity: string;
  /** The antiderivative of f, without + C. */
  integral: string;
}
export interface FuseRow {
  name: string;
  f: (x: number) => number;
  /** An antiderivative, for the charge meter. */
  F: (x: number) => number;
  /** The net charge ∫₀^(π/2) f dx in twelfths. */
  ans: number;
  work: string;
}

const { sin, cos } = Math;
const m = (name: string, f: (x: number) => number, bands: [Band, number][], identity: string, integral: string): MatchRow => ({ name, f, bands, identity, integral });

export const MATCH: Record<1 | 2 | 3, [MatchRow[], MatchRow[], MatchRow[]]> = {
  1: [
    [
      m('sin² x', (x) => sin(x) ** 2, [['1', 4], ['cos 2x', -4], ['sin 2x', 0]], 'sin² x = (1 − cos 2x)/2 = 1/2 − (1/2) cos 2x.', 'x/2 − (sin 2x)/4'),
      m('cos² x', (x) => cos(x) ** 2, [['1', 4], ['cos 2x', 4], ['sin 2x', 0]], 'cos² x = (1 + cos 2x)/2 = 1/2 + (1/2) cos 2x.', 'x/2 + (sin 2x)/4'),
      m('sin x cos x', (x) => sin(x) * cos(x), [['1', 0], ['sin 2x', 4], ['cos 2x', 0]], 'sin x cos x = (1/2) sin 2x.', '−(cos 2x)/4'),
    ],
    [
      m('sin² 2x', (x) => sin(2 * x) ** 2, [['1', 4], ['cos 2x', 0], ['cos 4x', -4]], 'sin² 2x = (1 − cos 4x)/2.', 'x/2 − (sin 4x)/8'),
      m('cos² 3x', (x) => cos(3 * x) ** 2, [['1', 4], ['cos 3x', 0], ['cos 6x', 4]], 'cos² 3x = (1 + cos 6x)/2.', 'x/2 + (sin 6x)/12'),
      m('2 sin² x', (x) => 2 * sin(x) ** 2, [['1', 8], ['cos 2x', -8], ['sin 2x', 0]], '2 sin² x = 1 − cos 2x.', 'x − (sin 2x)/2'),
    ],
    [
      m('sin² x cos² x', (x) => sin(x) ** 2 * cos(x) ** 2, [['1', 1], ['cos 2x', 0], ['cos 4x', -1]], 'sin² x cos² x = (1/4) sin² 2x = (1/8)(1 − cos 4x).', 'x/8 − (sin 4x)/32'),
      m('cos² x − sin² x', (x) => cos(x) ** 2 - sin(x) ** 2, [['1', 0], ['cos 2x', 8], ['sin 2x', 0]], 'cos² x − sin² x = cos 2x: no constant at all.', '(sin 2x)/2'),
    ],
  ],
  2: [
    [
      m('sin 3x cos x', (x) => sin(3 * x) * cos(x), [['sin x', 0], ['sin 2x', 4], ['sin 3x', 0], ['sin 4x', 4]], '2 sin A cos B = sin(A + B) + sin(A − B), so sin 3x cos x = (1/2)(sin 4x + sin 2x).', '−(cos 4x)/8 − (cos 2x)/4'),
      m('cos 3x cos x', (x) => cos(3 * x) * cos(x), [['cos x', 0], ['cos 2x', 4], ['cos 3x', 0], ['cos 4x', 4]], '2 cos A cos B = cos(A + B) + cos(A − B), so cos 3x cos x = (1/2)(cos 4x + cos 2x).', '(sin 4x)/8 + (sin 2x)/4'),
      m('sin 3x sin x', (x) => sin(3 * x) * sin(x), [['cos 2x', 4], ['cos 3x', 0], ['cos 4x', -4], ['sin 4x', 0]], '2 sin A sin B = cos(A − B) − cos(A + B), so sin 3x sin x = (1/2)(cos 2x − cos 4x).', '(sin 2x)/4 − (sin 4x)/8'),
    ],
    [
      m('sin x cos 3x', (x) => sin(x) * cos(3 * x), [['sin 2x', -4], ['sin 3x', 0], ['sin 4x', 4], ['cos 2x', 0]], 'sin x cos 3x = (1/2)(sin 4x + sin(−2x)) = (1/2)(sin 4x − sin 2x).', '−(cos 4x)/8 + (cos 2x)/4'),
      m('sin 3x cos 4x', (x) => sin(3 * x) * cos(4 * x), [['sin x', -4], ['sin 3x', 0], ['sin 4x', 0], ['sin 7x', 4]], 'sin 3x cos 4x = (1/2)(sin 7x + sin(−x)) = (1/2)(sin 7x − sin x).', '−(cos 7x)/14 + (cos x)/2'),
      m('sin 4x sin 8x', (x) => sin(4 * x) * sin(8 * x), [['cos 4x', 4], ['cos 8x', 0], ['cos 12x', -4], ['sin 12x', 0]], 'sin 4x sin 8x = (1/2)(cos 4x − cos 12x).', '(sin 4x)/8 − (sin 12x)/24'),
    ],
    [
      m('2 sin 2x cos 5x', (x) => 2 * sin(2 * x) * cos(5 * x), [['sin 3x', -8], ['sin 5x', 0], ['sin 7x', 8], ['cos 3x', 0]], '2 sin 2x cos 5x = sin 7x + sin(−3x) = sin 7x − sin 3x.', '−(cos 7x)/7 + (cos 3x)/3'),
      m('2 cos 4x cos 2x', (x) => 2 * cos(4 * x) * cos(2 * x), [['cos 2x', 8], ['cos 4x', 0], ['cos 6x', 8], ['sin 6x', 0]], '2 cos 4x cos 2x = cos 6x + cos 2x.', '(sin 6x)/6 + (sin 2x)/2'),
    ],
  ],
  3: [
    [
      m('sin³ x', (x) => sin(x) ** 3, [['sin x', 6], ['sin 2x', 0], ['sin 3x', -2], ['cos 3x', 0]], 'sin 3x = 3 sin x − 4 sin³ x, so sin³ x = (3/4) sin x − (1/4) sin 3x.', '−(3/4) cos x + (cos 3x)/12'),
      m('cos³ x', (x) => cos(x) ** 3, [['cos x', 6], ['cos 2x', 0], ['cos 3x', 2], ['sin 3x', 0]], 'cos 3x = 4 cos³ x − 3 cos x, so cos³ x = (3/4) cos x + (1/4) cos 3x.', '(3/4) sin x + (sin 3x)/12'),
    ],
    [
      m('cos⁴ x', (x) => cos(x) ** 4, [['1', 3], ['cos 2x', 4], ['cos 3x', 0], ['cos 4x', 1]], 'cos⁴ x = ((1 + cos 2x)/2)² = (1/4)(1 + 2 cos 2x + cos² 2x) = 3/8 + (1/2) cos 2x + (1/8) cos 4x.', '3x/8 + (sin 2x)/4 + (sin 4x)/32'),
      m('sin⁴ x', (x) => sin(x) ** 4, [['1', 3], ['cos 2x', -4], ['cos 3x', 0], ['cos 4x', 1]], 'sin⁴ x = ((1 − cos 2x)/2)² = 3/8 − (1/2) cos 2x + (1/8) cos 4x.', '3x/8 − (sin 2x)/4 + (sin 4x)/32'),
    ],
    [
      m('cos 2x cos 4x cos 6x', (x) => cos(2 * x) * cos(4 * x) * cos(6 * x), [['1', 2], ['cos 4x', 2], ['cos 8x', 2], ['cos 12x', 2]], 'cos 2x cos 4x = (1/2)(cos 6x + cos 2x); multiply by cos 6x and use the identities again: (1/4)(1 + cos 4x + cos 8x + cos 12x).', 'x/4 + (sin 4x)/16 + (sin 8x)/32 + (sin 12x)/48'),
      m('sin x sin 2x sin 3x', (x) => sin(x) * sin(2 * x) * sin(3 * x), [['sin 2x', 2], ['sin 4x', 2], ['sin 6x', -2], ['cos 2x', 0]], 'sin x sin 3x = (1/2)(cos 2x − cos 4x); multiply by sin 2x: (1/4)(sin 2x + sin 4x − sin 6x).', '−(cos 2x)/8 − (cos 4x)/16 + (cos 6x)/24'),
    ],
  ],
};

const fz = (name: string, f: (x: number) => number, F: (x: number) => number, ans: number, work: string): FuseRow => ({ name, f, F, ans, work });
export const FUSE: [FuseRow[], FuseRow[], FuseRow[]] = [
  [
    fz('sin 3x cos x', (x) => sin(3 * x) * cos(x), (x) => 0.5 * (-cos(4 * x) / 4 - cos(2 * x) / 2), 6, 'sin 3x cos x = (1/2)(sin 4x + sin 2x), so the integral is (1/2)[−(cos 4x)/4 − (cos 2x)/2] from 0 to π/2 = (1/2)[(−1/4 + 1/2) − (−1/4 − 1/2)] = 1/2.'),
    fz('sin 2x cos x', (x) => sin(2 * x) * cos(x), (x) => 0.5 * (-cos(3 * x) / 3 - cos(x)), 8, 'sin 2x cos x = (1/2)(sin 3x + sin x), so the integral is (1/2)[−(cos 3x)/3 − cos x] from 0 to π/2 = (1/2)[0 − (−1/3 − 1)] = 2/3.'),
    fz('cos 2x cos x', (x) => cos(2 * x) * cos(x), (x) => 0.5 * (sin(3 * x) / 3 + sin(x)), 4, 'cos 2x cos x = (1/2)(cos 3x + cos x), so the integral is (1/2)[(sin 3x)/3 + sin x] from 0 to π/2 = (1/2)(−1/3 + 1) = 1/3.'),
  ],
  [
    fz('sin 4x cos 2x', (x) => sin(4 * x) * cos(2 * x), (x) => 0.5 * (-cos(6 * x) / 6 - cos(2 * x) / 2), 8, 'sin 4x cos 2x = (1/2)(sin 6x + sin 2x), so the integral is (1/2)[−(cos 6x)/6 − (cos 2x)/2] from 0 to π/2 = (1/2)[(1/6 + 1/2) − (−1/6 − 1/2)] = 2/3.'),
    fz('sin 5x cos x', (x) => sin(5 * x) * cos(x), (x) => 0.5 * (-cos(6 * x) / 6 - cos(4 * x) / 4), 2, 'sin 5x cos x = (1/2)(sin 6x + sin 4x), so the integral is (1/2)[−(cos 6x)/6 − (cos 4x)/4] from 0 to π/2 = (1/2)[(1/6 − 1/4) − (−1/6 − 1/4)] = 1/6.'),
    fz('sin 3x cos 3x', (x) => sin(3 * x) * cos(3 * x), (x) => 0.5 * (-cos(6 * x) / 6), 2, 'sin 3x cos 3x = (1/2) sin 6x, so the integral is (1/2)[−(cos 6x)/6] from 0 to π/2 = (1/2)(1/6 + 1/6) = 1/6.'),
  ],
  [
    fz('sin x sin 2x sin 3x', (x) => sin(x) * sin(2 * x) * sin(3 * x), (x) => 0.25 * (-cos(2 * x) / 2 - cos(4 * x) / 4 + cos(6 * x) / 6), 2, 'sin x sin 2x sin 3x = (1/4)(sin 2x + sin 4x − sin 6x), so the integral is (1/4)[−(cos 2x)/2 − (cos 4x)/4 + (cos 6x)/6] from 0 to π/2 = (1/4)[(1/2 − 1/4 − 1/6) − (−1/2 − 1/4 + 1/6)] = 1/6.'),
    fz('sin³ x', (x) => sin(x) ** 3, (x) => -0.75 * cos(x) + cos(3 * x) / 12, 8, 'sin³ x = (3/4) sin x − (1/4) sin 3x, so the integral is [−(3/4) cos x + (cos 3x)/12] from 0 to π/2 = 0 − (−3/4 + 1/12) = 2/3.'),
    fz('cos³ x', (x) => cos(x) ** 3, (x) => 0.75 * sin(x) + sin(3 * x) / 12, 8, 'cos³ x = (3/4) cos x + (1/4) cos 3x, so the integral is [(3/4) sin x + (sin 3x)/12] from 0 to π/2 = 3/4 − 1/12 = 2/3.'),
  ],
];

// ---- Rounds and judging ---------------------------------------------------------------------------------------------------------------------------------

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
export type MatchRound = MatchRow & { assist: 0 | 1 | 2 };
export type FuseRound = FuseRow & { assist: 0 | 1 | 2; start: number };
export const buildMatch = (level: 1 | 2 | 3, random: () => number): MatchRound[] => MATCH[level].map((pool, k) => ({ ...pick(pool, random), assist: aid(k) }));
export const buildFuse = (random: () => number): FuseRound[] => FUSE.map((pool, k) => ({ ...pick(pool, random), assist: aid(k), start: 12 }));
/** The player's mix at x, with the amplitudes a[i] in eighths for the bands in slot order. */
export const mix = (r: MatchRow, a: number[]) => (x: number) => r.bands.reduce((s, [b], i) => s + ((a[i] ?? 0) / 8) * tone(b)(x), 0);
export const judgeMatch = (r: MatchRow, a: number[]) => r.bands.every(([, c], i) => a[i] === c);
export const judgeFuse = (r: FuseRow, k: number) => k === r.ans;
/** Where the mix is off by more than 0.02 on [0, 2π], sampled at 400 points: true means a gap there. */
export const gaps = (r: MatchRow, a: number[]) =>
  Array.from({ length: 400 }, (_, i) => {
    const x = (2 * Math.PI * i) / 399;
    return Math.abs(mix(r, a)(x) - r.f(x)) > 0.02;
  });
/** The number of separate runs of true in a list of flags. */
export const runs = (flags: boolean[]) => flags.reduce((n, f, i) => n + (f && !flags[i - 1] ? 1 : 0), 0);

// ---- Words ----------------------------------------------------------------------------------------------------------------------------------------------

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
/** k eighths, reduced, with a true minus sign: 4 → '1/2', −2 → '−1/4', 8 → '1'. */
export function amp(k: number): string {
  if (k === 0) return '0';
  const g = gcd(Math.abs(k), 8);
  const n = Math.abs(k) / g;
  const d = 8 / g;
  return `${k < 0 ? '−' : ''}${n}${d === 1 ? '' : `/${d}`}`;
}
/** k twelfths, reduced: 6 → '1/2', 8 → '2/3', 12 → '1', 24 → '2'. */
export function twelfths(k: number): string {
  if (k === 0) return '0';
  const g = gcd(Math.abs(k), 12);
  const n = Math.abs(k) / g;
  const d = 12 / g;
  return `${k < 0 ? '−' : ''}${n}${d === 1 ? '' : `/${d}`}`;
}

export const matchIntel = (r: MatchRow) => `Lock signal: f(x) = ${r.name}. Tones offered: ${r.bands.map(([b]) => b).join(', ')}. Set each amplitude so the tones add up to the signal exactly.`;
export const matchHint = (r: MatchRound) =>
  `${matchIntel(r)} ${r.assist === 0 ? 'Round 1: your mix shows live on the scope.' : r.assist === 1 ? 'Your mix is hidden: a scope peek costs a charge and shows it for 1.5 s.' : 'Boss round: no peek.'}`;
export function matchMiss(r: MatchRow, a: number[]): string {
  const count = runs(gaps(r, a));
  return `The mix did not match the lock signal: the scope flagged ${count} gap${count === 1 ? '' : 's'} in red, the alarm went off and the turret fired a stun dart. Check each tone’s amplitude against the identity.`;
}
export const peekText = (r: MatchRow, a: number[]) => `Scope peek: your mix ${judgeMatch(r, a) ? 'lies right on' : 'does not lie on'} the lock signal.`;
export const matchWin = (r: MatchRow) => `Lock open! ${r.identity} So ∫ ${r.name} dx = ${r.integral} + C.`;

export const fuseIntel = (r: FuseRow) =>
  `The lock signal f(x) = ${r.name} charges the capacitor from x = 0 to x = π/2, and discharges where it is negative. Set the fuse rating to the net charge, ∫ f dx from 0 to π/2.`;
export const fuseHint = (r: FuseRound) =>
  `${fuseIntel(r)} ${r.assist === 0 ? 'Round 1: the charge meter shows the charge as it builds.' : r.assist === 1 ? 'The meter is dark: a probe costs a charge and shows its arrow for 1.5 s.' : 'Boss round: no probe.'}`;
export function fuseMiss(r: FuseRow, k: number): string {
  return k < r.ans
    ? `The capacitor ended with more charge than the ${twelfths(k)} fuse could take: it blew, the alarm went off and the turret fired. Raise the fuse rating.`
    : `The capacitor ended below the ${twelfths(k)} rating, so the fuse never tripped and the backup alarm went off. Lower the fuse rating.`;
}
export const probeText = (r: FuseRow, k: number) => `Probe: the net charge will be ${k < r.ans ? 'more than' : k > r.ans ? 'less than' : 'exactly'} your ${twelfths(k)} rating.`;
export const fuseWin = (r: FuseRow) => `Fuse tripped, vault open! ${r.work}`;
