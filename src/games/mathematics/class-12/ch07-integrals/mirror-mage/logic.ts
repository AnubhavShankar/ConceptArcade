// Rules of Mirror Mage (Maths Ch 7, section 7.10): a rune drinks exactly the integral of its curve; the player sets that mana on a ring.
// Pure: no DOM, no canvas, no Math.random. The pools, the units and every text live here and are tested in logic.test.ts.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';

export type Unit = 'half' | 'pi8' | 'recip' | 'pilog';
export interface Row {
  /** The rune's integrand as written, e.g. '√(sin x)/(√(sin x) + √(cos x))'. */
  name: string;
  f: (x: number) => number;
  a: number; b: number;
  /** The limits as written: '0', 'π/2', '−5'. */
  aText: string; bText: string;
  /** The answer as a whole number of the level's unit (for 'recip', the m in 1/m). */
  ans: number;
  /** For level 1: where the V turns (the split points), used by the mirror spell. */
  splits?: number[];
  work: string;
}
export interface Round extends Row { assist: 0 | 1 | 2 }
export type Level = 1 | 2 | 3 | 4 | 5;
export const UNIT: Record<1 | 2 | 3 | 4 | 5, Unit> = { 1: 'half', 2: 'pi8', 3: 'recip', 4: 'pi8', 5: 'pilog' };
export const RANGE: Record<1 | 2 | 3 | 4 | 5, { min: number; max: number; start: number }> = {
  1: { min: 0, max: 60, start: 30 },
  2: { min: 0, max: 16, start: 8 },
  3: { min: 2, max: 120, start: 2 },
  4: { min: 0, max: 16, start: 12 },
  5: { min: -12, max: 12, start: 4 },
};
/** The mana value of dial k in the level's unit, as a real number. */
export const manaValue = (u: Unit, k: number) => (u === 'half' ? k / 2 : u === 'pi8' ? (k * Math.PI) / 8 : u === 'recip' ? 1 / k : ((k * Math.PI) / 8) * Math.log(2));
export const judge = (r: Row, k: number) => k === r.ans;
/** 'low': less mana than the rune holds; 'high': more. Compare values, not dial numbers (for 'recip' a bigger m is less mana). */
export const fault = (u: Unit, r: Row, k: number): 'low' | 'high' | null => (k === r.ans ? null : manaValue(u, k) < manaValue(u, r.ans) ? 'low' : 'high');

// ---- Unit texts ------------------------------------------------------------------------------------------------------------------------------------------

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const sign = (k: number) => (k < 0 ? '−' : '');
/** k halves, reduced: 10 → '5', 13 → '13/2', 0 → '0'. */
export const half = (k: number) => {
  const a = Math.abs(k);
  return k === 0 ? '0' : a % 2 === 0 ? `${sign(k)}${a / 2}` : `${sign(k)}${a}/2`;
};
/** k eighths of π, reduced: 3 → '3π/8', 4 → 'π/2', 8 → 'π', 16 → '2π'. */
export const pi8 = (k: number) => {
  if (k === 0) return '0';
  const a = Math.abs(k);
  const g = gcd(a, 8);
  const n = a / g;
  const d = 8 / g;
  return `${sign(k)}${n === 1 ? '' : n}π${d === 1 ? '' : `/${d}`}`;
};
export const recip = (m: number) => `1/${m}`;
/** k eighths of π log 2: 1 → '(π/8) log 2', 8 → 'π log 2', −4 → '−(π/2) log 2'. */
export const pilog = (k: number) => {
  if (k === 0) return '0';
  const part = pi8(Math.abs(k));
  return `${sign(k)}${part.includes('/') ? `(${part})` : part} log 2`;
};
export const manaText = (u: Unit, k: number) => (u === 'half' ? half(k) : u === 'pi8' ? pi8(k) : u === 'recip' ? recip(k) : pilog(k));

// ---- The pools (the answers were checked numerically in logic.test.ts) -----------------------------------------------------------------------------------

const { sin, cos, tan, exp, log, sqrt, abs, PI } = Math;
const r = (name: string, f: (x: number) => number, a: number, b: number, aText: string, bText: string, ans: number, work: string, splits?: number[]): Row => ({ name, f, a, b, aText, bText, ans, work, splits });

export const POOLS: Record<1 | 2 | 3 | 4 | 5, [Row[], Row[], Row[]]> = {
  1: [
    [
      r('|x − 1|', (x) => abs(x - 1), 0, 4, '0', '4', 10, 'Split at x = 1: ∫₀¹ (1 − x) dx + ∫₁⁴ (x − 1) dx = 1/2 + 9/2 = 5.', [1]),
      r('|x − 2|', (x) => abs(x - 2), 0, 6, '0', '6', 20, 'Split at x = 2: ∫₀² (2 − x) dx + ∫₂⁶ (x − 2) dx = 2 + 8 = 10.', [2]),
      r('|x − 2|', (x) => abs(x - 2), 0, 5, '0', '5', 13, 'Split at x = 2: ∫₀² (2 − x) dx + ∫₂⁵ (x − 2) dx = 2 + 9/2 = 13/2.', [2]),
    ],
    [
      r('|x − 5|', (x) => abs(x - 5), 2, 8, '2', '8', 18, 'Split at x = 5: ∫₂⁵ (5 − x) dx + ∫₅⁸ (x − 5) dx = 9/2 + 9/2 = 9.', [5]),
      r('|x − 1|', (x) => abs(x - 1), -2, 6, '−2', '6', 34, 'Split at x = 1: ∫₋₂¹ (1 − x) dx + ∫₁⁶ (x − 1) dx = 9/2 + 25/2 = 17.', [1]),
      r('|2x − 3|', (x) => abs(2 * x - 3), 0, 3, '0', '3', 9, 'Split at x = 3/2: ∫₀^(3/2) (3 − 2x) dx + ∫_(3/2)³ (2x − 3) dx = 9/4 + 9/4 = 9/2.', [1.5]),
    ],
    [
      r('|x + 2|', (x) => abs(x + 2), -5, 5, '−5', '5', 58, 'Split at x = −2: ∫₋₅⁻² (−2 − x) dx + ∫₋₂⁵ (x + 2) dx = 9/2 + 49/2 = 29.', [-2]),
      r('|x² − 1|', (x) => abs(x * x - 1), 0, 2, '0', '2', 4, 'Split at x = 1: ∫₀¹ (1 − x²) dx + ∫₁² (x² − 1) dx = 2/3 + 4/3 = 2.', [1]),
      r('|x² − 1|', (x) => abs(x * x - 1), -2, 2, '−2', '2', 8, 'Split at x = −1 and 1, or note the integrand is even: twice ∫₀² |x² − 1| dx = 2 × 2 = 4.', [-1, 1]),
    ],
  ],
  2: [
    [
      r('√(sin x)/(√(sin x) + √(cos x))', (x) => sqrt(sin(x)) / (sqrt(sin(x)) + sqrt(cos(x))), 0, PI / 2, '0', 'π/2', 2, 'Replace x by π/2 − x: I = ∫ √(cos x)/(√(cos x) + √(sin x)) dx. Adding the two forms, 2I = ∫₀^(π/2) 1 dx = π/2, so I = π/4.'),
      r('cos⁵ x/(sin⁵ x + cos⁵ x)', (x) => cos(x) ** 5 / (sin(x) ** 5 + cos(x) ** 5), 0, PI / 2, '0', 'π/2', 2, 'With π/2 − x, I = ∫ sin⁵ x/(cos⁵ x + sin⁵ x) dx. Adding, 2I = π/2, so I = π/4.'),
      r('sin^(3/2) x/(sin^(3/2) x + cos^(3/2) x)', (x) => sin(x) ** 1.5 / (sin(x) ** 1.5 + cos(x) ** 1.5), 0, PI / 2, '0', 'π/2', 2, 'With π/2 − x the sines and cosines swap; adding the two forms, 2I = π/2, so I = π/4.'),
      r('cos² x', (x) => cos(x) ** 2, 0, PI / 2, '0', 'π/2', 2, 'With π/2 − x, I = ∫₀^(π/2) sin² x dx as well. Adding, 2I = ∫ (cos² x + sin² x) dx = π/2, so I = π/4.'),
    ],
    [
      r('eˣ/(eˣ + e^(π − x))', (x) => exp(x) / (exp(x) + exp(PI - x)), 0, PI, '0', 'π', 4, 'With π − x, I = ∫ e^(π − x)/(e^(π − x) + eˣ) dx. Adding, 2I = π, so I = π/2.'),
      r('x²/(x² + (π − x)²)', (x) => (x * x) / (x * x + (PI - x) ** 2), 0, PI, '0', 'π', 4, 'With π − x, I = ∫ (π − x)²/((π − x)² + x²) dx. Adding, 2I = π, so I = π/2.'),
      r('sin x/(sin x + sin(π/4 − x))', (x) => sin(x) / (sin(x) + sin(PI / 4 - x)), 0, PI / 4, '0', 'π/4', 1, 'With π/4 − x, I = ∫ sin(π/4 − x)/(sin(π/4 − x) + sin x) dx. Adding, 2I = π/4, so I = π/8.'),
    ],
    [
      r('x⁴/(x⁴ + (π/4 − x)⁴)', (x) => x ** 4 / (x ** 4 + (PI / 4 - x) ** 4), 0, PI / 4, '0', 'π/4', 1, 'With π/4 − x the two powers swap; adding, 2I = π/4, so I = π/8.'),
      r('1/(1 + e^(cos x))', (x) => 1 / (1 + exp(cos(x))), 0, PI, '0', 'π', 4, 'With π − x, cos x becomes −cos x: I = ∫ 1/(1 + e^(−cos x)) dx = ∫ e^(cos x)/(e^(cos x) + 1) dx. Adding, 2I = π, so I = π/2.'),
      r('1/(1 + tan³ x)', (x) => 1 / (1 + tan(x) ** 3), 0, PI / 2, '0', 'π/2', 2, 'With π/2 − x, tan x becomes cot x: I = ∫ 1/(1 + cot³ x) dx = ∫ tan³ x/(tan³ x + 1) dx. Adding, 2I = π/2, so I = π/4.'),
    ],
  ],
  3: [
    [
      r('x(1 − x)²', (x) => x * (1 - x) ** 2, 0, 1, '0', '1', 12, '∫₀¹ x(1 − x)² dx = ∫₀¹ (1 − x)x² dx = 1/3 − 1/4 = 1/12.'),
      r('x(1 − x)³', (x) => x * (1 - x) ** 3, 0, 1, '0', '1', 20, '∫₀¹ x(1 − x)³ dx = ∫₀¹ (1 − x)x³ dx = 1/4 − 1/5 = 1/20.'),
    ],
    [
      r('x(1 − x)⁴', (x) => x * (1 - x) ** 4, 0, 1, '0', '1', 30, '∫₀¹ (1 − x)x⁴ dx = 1/5 − 1/6 = 1/30.'),
      r('x(1 − x)⁵', (x) => x * (1 - x) ** 5, 0, 1, '0', '1', 42, '∫₀¹ (1 − x)x⁵ dx = 1/6 − 1/7 = 1/42.'),
      r('x²(1 − x)²', (x) => x * x * (1 - x) ** 2, 0, 1, '0', '1', 30, 'The mirror leaves it the same, so expand: ∫₀¹ (x² − 2x³ + x⁴) dx = 1/3 − 1/2 + 1/5 = 1/30.'),
    ],
    [
      r('x²(1 − x)³', (x) => x * x * (1 - x) ** 3, 0, 1, '0', '1', 60, '∫₀¹ (1 − x)²x³ dx = ∫₀¹ (x³ − 2x⁴ + x⁵) dx = 1/4 − 2/5 + 1/6 = 1/60.'),
      r('x(1 − x)⁹', (x) => x * (1 - x) ** 9, 0, 1, '0', '1', 110, '∫₀¹ (1 − x)x⁹ dx = 1/10 − 1/11 = 1/110.'),
    ],
  ],
  4: [
    [
      r('sin² x', (x) => sin(x) ** 2, -PI / 2, PI / 2, '−π/2', 'π/2', 4, 'sin² x is even, so I = 2∫₀^(π/2) sin² x dx = 2 · π/4 = π/2.'),
      r('sin² x', (x) => sin(x) ** 2, 0, PI, '0', 'π', 4, 'sin²(π − x) = sin² x, so I = 2∫₀^(π/2) sin² x dx = π/2.'),
      r('sin² x', (x) => sin(x) ** 2, 0, 2 * PI, '0', '2π', 8, 'Over a whole turn, I = 4∫₀^(π/2) sin² x dx = 4 · π/4 = π.'),
    ],
    [
      r('cos⁵ x', (x) => cos(x) ** 5, 0, 2 * PI, '0', '2π', 0, 'cos⁵(π − x) = −cos⁵ x, so ∫₀^π cos⁵ x dx = 0, and the same over [π, 2π]: I = 0.'),
      r('sin⁷ x', (x) => sin(x) ** 7, -PI / 2, PI / 2, '−π/2', 'π/2', 0, 'sin⁷ x is odd, so over symmetric limits I = 0.'),
      r('cos² x', (x) => cos(x) ** 2, 0, 2 * PI, '0', '2π', 8, 'I = 4∫₀^(π/2) cos² x dx = 4 · π/4 = π.'),
      r('cos² x', (x) => cos(x) ** 2, 0, PI, '0', 'π', 4, 'cos²(π − x) = cos² x, so I = 2∫₀^(π/2) cos² x dx = π/2.'),
    ],
    [
      r('sin⁴ x', (x) => sin(x) ** 4, 0, 2 * PI, '0', '2π', 6, 'I = 4∫₀^(π/2) sin⁴ x dx = 4 · 3π/16 = 3π/4.'),
      r('cos² 3x', (x) => cos(3 * x) ** 2, 0, PI, '0', 'π', 4, 'cos² 3x = (1 + cos 6x)/2, and cos 6x integrates to 0 over [0, π], so I = π/2.'),
      r('sin² x', (x) => sin(x) ** 2, -PI, PI, '−π', 'π', 8, 'sin² x is even, so I = 2∫₀^π sin² x dx = 2 · π/2 = π.'),
    ],
  ],
  5: [
    [
      r('log(1 + tan x)', (x) => log(1 + tan(x)), 0, PI / 4, '0', 'π/4', 1, 'With π/4 − x: 1 + tan(π/4 − x) = 2/(1 + tan x), so I = ∫ [log 2 − log(1 + tan x)] dx = (π/4) log 2 − I. So 2I = (π/4) log 2 and I = (π/8) log 2.'),
      r('log tan x', (x) => log(tan(x)), 0, PI / 2, '0', 'π/2', 0, 'Replace x by π/2 − x: log tan x becomes log cot x = −log tan x, so I = −I and I = 0.'),
    ],
    [
      r('2 log sin x − log sin 2x', (x) => 2 * log(sin(x)) - log(sin(2 * x)), 0, PI / 2, '0', 'π/2', -4, 'log sin 2x = log 2 + log sin x + log cos x, so the integrand is log sin x − log cos x − log 2. On [0, π/2], ∫ log sin x = ∫ log cos x (replace x by π/2 − x), so I = −(π/2) log 2.'),
      r('log sin x', (x) => log(sin(x)), 0, PI / 2, '0', 'π/2', -4, 'Let I = ∫₀^(π/2) log sin x dx = ∫₀^(π/2) log cos x dx. Then 2I = ∫ log(sin 2x/2) dx = ∫₀^(π/2) log sin 2x dx − (π/2) log 2 = I − (π/2) log 2, so I = −(π/2) log 2.'),
      r('log sin 2x', (x) => log(sin(2 * x)), 0, PI / 2, '0', 'π/2', -4, 'With t = 2x, I = ½∫₀^π log sin t dt = ½ · 2∫₀^(π/2) log sin t dt = −(π/2) log 2.'),
    ],
    [
      r('log(1 + cos x)', (x) => log(2) + 2 * log(abs(cos(x / 2))), 0, PI, '0', 'π', -8, '1 + cos x = 2 cos²(x/2), so I = π log 2 + 2∫₀^π log cos(x/2) dx = π log 2 + 4∫₀^(π/2) log cos t dt = π log 2 − 2π log 2 = −π log 2.'),
      r('log sin x', (x) => log(sin(x)), 0, PI, '0', 'π', -8, 'log sin(π − x) = log sin x, so I = 2∫₀^(π/2) log sin x dx = −π log 2.'),
    ],
  ],
};

// ---- Rounds ----------------------------------------------------------------------------------------------------------------------------------------------

const pick = <T>(xs: readonly T[], random: () => number): T => shuffle(xs, random)[0];
export const buildRounds = (level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] => POOLS[level].map((pool, k) => ({ ...pick(pool, random), assist: aid(k) }));

// ---- The fold of level 4 (a drawing aid for the mirror spell) --------------------------------------------------------------------------------------------

/**
 * Where the mirror spell folds a level-4 rune: the interval [lo, hi] is folded at its middle, onto the left half; `odd` means the halves are opposite
 * (the fold goes through the zero line). Over the whole range the fold is used as it stands, unless the halves are equal there and the left half is itself
 * odd about its own middle (cos⁵ x over [0, 2π]): then the fold shows that half, where the cancelling happens. The answer is never consulted.
 */
export function foldPlan(row: Row): { lo: number; hi: number; odd: boolean | null } {
  const parity = (lo: number, hi: number): boolean | null => {
    let even = true;
    let odd = true;
    for (let i = 1; i <= 9; i++) {
      const x = lo + ((hi - lo) * i) / 10;
      const u = row.f(x);
      const w = row.f(lo + hi - x);
      if (Math.abs(w - u) > 1e-9) even = false;
      if (Math.abs(w + u) > 1e-9) odd = false;
    }
    return odd && !even ? true : even ? false : null;
  };
  const whole = parity(row.a, row.b);
  if (whole === false) {
    const m = (row.a + row.b) / 2;
    if (parity(row.a, m) === true) return { lo: row.a, hi: m, odd: true };
  }
  return { lo: row.a, hi: row.b, odd: whole };
}

// ---- Words -----------------------------------------------------------------------------------------------------------------------------------------------

const UNIT_WORDS: Record<1 | 2 | 3 | 4 | 5, string> = { 1: 'counted in halves', 2: 'in units of π/8', 3: 'as 1/m of a crystal: set m', 4: 'in units of π/8', 5: 'in units of (π/8) log 2' };
export const intel = (level: 1 | 2 | 3 | 4 | 5, row: Row) => `The rune is ∫ ${row.name} dx from ${row.aText} to ${row.bText}. Channel exactly that much mana, ${UNIT_WORDS[level]}.`;
export const hintText = (level: 1 | 2 | 3 | 4 | 5, row: Round) => `${intel(level, row)} ${row.assist === 0 ? 'Round 1: the mirror shows the rune’s hidden shape.' : row.assist === 1 ? 'The mirror is dark: a mirror spell costs a charge.' : 'Boss round: no mirror.'}`;
/** What the player's own setting did. Never the right amount. */
export const missText = (level: 1 | 2 | 3 | 4 | 5, row: Row, k: number) => {
  const u = UNIT[level];
  return fault(u, row, k) === 'high'
    ? `With ${manaText(u, k)} of mana the rune overflowed and the spell backfired at the caster. Try less mana.`
    : `With ${manaText(u, k)} of mana the spell ran dry before the rune was full: it fizzled and the Stone Warden struck back. Try more mana.`;
};
export const mirrorText = (level: 1 | 2 | 3 | 4 | 5) => (level === 1 ? 'Mirror spell: the rune shows where to split it.' : 'Mirror spell: the rune and its mirror image appear together for a moment.');
export const winText = (row: Row) => `Barrier broken! ${row.work}`;
