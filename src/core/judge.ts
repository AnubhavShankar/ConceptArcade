// Pure judging helpers shared by the hero-and-objective games. No DOM here, so logic tests stay light.

/** 3 stars, minus one per costly miss, never below 1. The first `free` misses cost nothing. */
export function starsFor(misses: number, free: number): 1 | 2 | 3 {
  return Math.max(1, 3 - Math.max(0, misses - free)) as 1 | 2 | 3;
}

/** Relative closeness: |value - answer| <= tol * |answer| (absolute when the answer is 0). */
export function within(value: number, answer: number, tol: number): boolean {
  return answer === 0 ? Math.abs(value) <= tol : Math.abs(value - answer) / Math.abs(answer) <= tol;
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
/** Three significant figures, with × 10ⁿ for very large or small numbers. */
export function fmt(x: number): string {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) {
    const [m, e] = x.toExponential(2).split('e');
    return `${Number(m)} × 10${[...String(Number(e))].map((c) => SUP['0123456789-'.indexOf(c)]).join('')}`;
  }
  return String(Number(x.toPrecision(3)));
}

/** A signed number with a true minus sign, trimmed to 3 significant figures. */
export function sgn(x: number): string {
  return `${x < 0 ? '−' : ''}${fmt(Math.abs(x))}`;
}
