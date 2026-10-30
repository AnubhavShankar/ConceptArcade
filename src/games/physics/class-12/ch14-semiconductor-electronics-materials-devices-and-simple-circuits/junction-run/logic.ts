// Pure rules of Junction Run: no DOM, no canvas. Voltages in V, currents in mA (reverse currents in µA), frequencies in Hz.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';
import { fmt, sgn } from '@core/judge';

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

export interface BiasRound {
  material: 'silicon' | 'germanium';
  /** The built-in barrier of the unbiased junction, V. */
  v0: number;
  goal: 'lower' | 'raise';
  /** The barrier the hopper needs, V. */
  target: number;
  /** The battery voltage that gives it: forward positive, reverse negative. */
  sol: number;
  assist: 0 | 1 | 2;
}
export interface RectRound {
  kind: 'half' | 'full';
  /** The supply frequency, Hz. */
  f: number;
  /** The frequency of the output pulses, Hz. */
  sol: number;
  assist: 0 | 1 | 2;
}
export interface CurveRound {
  kind: 'forward' | 'reverse';
  /** Forward: two points (V, mA). Reverse: one point (V, µA) with the signs of the book. */
  v1: number;
  i1: number;
  v2: number;
  i2: number;
  /** The resistance asked for, Ω, and its log10. */
  sol: number;
  logSol: number;
  assist: 0 | 1 | 2;
}

export const SLIDERS = {
  v: { min: -6, max: 1, step: 0.01 },
  f: { min: 10, max: 250, step: 1 },
  r: { min: 0, max: 9, step: 0.01 },
};
export const BIAS_TOL = 0.03;
export const FREQ_TOL = 2;
export const RES_TOL = 0.05;

const V0 = { silicon: 0.7, germanium: 0.3 };
const LOWER: { material: BiasRound['material']; target: number }[] = [
  { material: 'silicon', target: 0.4 },
  { material: 'silicon', target: 0.2 },
  { material: 'germanium', target: 0.1 },
  { material: 'germanium', target: 0.05 },
];
const RAISE: { material: BiasRound['material']; target: number }[] = [
  { material: 'silicon', target: 3.7 },
  { material: 'silicon', target: 5.7 },
  { material: 'germanium', target: 2.3 },
  { material: 'germanium', target: 4.3 },
];
// (V1, mA1, V2, mA2): forward points on the V–I curve of a diode.
const FORWARD: [number, number, number, number][] = [
  [0.7, 10, 0.8, 20],
  [0.7, 8, 0.75, 18],
  [0.6, 5, 0.7, 15],
  [0.65, 10, 0.75, 30],
  [0.7, 10, 0.9, 20],
];
// (V, µA): a reverse point.
const REVERSE: [number, number][] = [
  [-10, -1],
  [-5, -2],
  [-20, -4],
];

export function biasSolution(material: BiasRound['material'], goal: BiasRound['goal'], target: number) {
  const v0 = V0[material];
  return round6(goal === 'lower' ? v0 - target : -(target - v0));
}
export function biasRounds(random: () => number): BiasRound[] {
  const lower = shuffle(LOWER, random);
  const raise = shuffle(RAISE, random);
  const third = random() < 0.5 ? { goal: 'lower' as const, ...lower[1] } : { goal: 'raise' as const, ...raise[1] };
  return [{ goal: 'lower' as const, ...lower[0] }, { goal: 'raise' as const, ...raise[0] }, third].map((b, k) => ({ ...b, v0: V0[b.material], sol: biasSolution(b.material, b.goal, b.target), assist: aid(k) }));
}
/** Supply frequencies, Hz: the 50 and 60 Hz mains and three other supplies. Every output frequency (f for half-wave, 2f for full-wave) stays between 10 and 250 and clear of the dial's start. */
export const SUPPLIES = [25, 40, 50, 60, 100];
export const RECT_START = 30;
const rectOut = (kind: RectRound['kind'], f: number) => (kind === 'half' ? f : 2 * f);
/**
 * Three rounds: the kinds are a shuffle of half, full, full or of half, half, full, and the supplies are three different ones from the pool,
 * re-drawn until the three output frequencies differ, so the order and the earlier rounds say nothing about the later ones.
 */
export function rectRounds(random: () => number): RectRound[] {
  const kinds = shuffle<RectRound['kind']>(random() < 0.5 ? ['half', 'full', 'full'] : ['half', 'half', 'full'], random);
  let fs = [40, 50, 60];
  for (let i = 0; i < 40; i++) {
    const pick = shuffle(SUPPLIES, random).slice(0, 3);
    if (new Set(pick.map((f, k) => rectOut(kinds[k], f))).size === 3) {
      fs = pick;
      break;
    }
  }
  return kinds.map((kind, k) => ({ kind, f: fs[k], sol: rectOut(kind, fs[k]), assist: aid(k) }));
}
export const resistance = (r: Pick<CurveRound, 'kind' | 'v1' | 'i1' | 'v2' | 'i2'>) => (r.kind === 'forward' ? (r.v2 - r.v1) / ((r.i2 - r.i1) * 1e-3) : Math.abs(r.v1) / Math.abs(r.i1 * 1e-6));
export function curveRounds(random: () => number): CurveRound[] {
  const fw = shuffle(FORWARD, random).slice(0, 2);
  const rv = shuffle(REVERSE, random)[0];
  const rows: Omit<CurveRound, 'sol' | 'logSol' | 'assist'>[] = [
    ...fw.map(([v1, i1, v2, i2]) => ({ kind: 'forward' as const, v1, i1, v2, i2 })),
    { kind: 'reverse' as const, v1: rv[0], i1: rv[1], v2: rv[0], i2: rv[1] },
  ];
  return rows.map((r, k) => {
    const sol = round6(resistance(r));
    return { ...r, sol, logSol: round6(Math.log10(sol)), assist: aid(k) };
  });
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export const judgeBias = (r: BiasRound, v: number) => Math.abs(v - r.sol) <= BIAS_TOL;
export const judgeRect = (r: RectRound, f: number) => Math.abs(f - r.sol) <= FREQ_TOL;
export const judgeCurve = (r: CurveRound, x: number) => Math.abs(x - r.logSol) <= RES_TOL;
/** The barrier left after a battery of v volts (forward positive) is connected. */
export const barrierAfter = (r: BiasRound, v: number) => r.v0 - v;
/** What a student gets by dividing the voltage by the current at the second point instead of taking the slope. */
export const staticResistance = (r: CurveRound) => Math.abs(r.v2) / Math.abs(r.i2 * (r.kind === 'forward' ? 1e-3 : 1e-6));

export const biasReading = (r: BiasRound, v: number) => `The unbiased ${r.material} junction has a built-in barrier of ${fmt(r.v0)} V. You set ${v < 0 ? 'a reverse' : v > 0 ? 'a forward' : 'no'} battery${v === 0 ? '' : ` of ${fmt(Math.abs(v))} V`}: forward bias pushes carriers towards the junction, reverse bias pulls them away.`;
export const rectReading = (r: RectRound) => (r.kind === 'half' ? `A half-wave rectifier has one diode: it conducts during one half of every ${fmt(1000 / r.f)} ms cycle of the ${r.f} Hz supply and blocks the other half.` : `A full-wave rectifier has two diodes, one for each half of the ${r.f} Hz cycle: whichever half the supply is in, one of them conducts.`);
export const curveReading = (r: CurveRound) => (r.kind === 'forward' ? `Between the two points the voltage rises by ${fmt(r.v2 - r.v1)} V while the current rises by ${fmt(r.i2 - r.i1)} mA.` : `At ${sgn(r.v1)} V the reverse current is ${sgn(r.i1)} µA (1 µA = 10⁻⁶ A).`);

export function biasMiss(r: BiasRound, v: number): string {
  if (r.goal === 'raise' && v > 0) return 'That battery is the wrong way round: it pushes the carriers towards the junction, narrowing the depletion layer and lowering the barrier instead of raising it.';
  if (r.goal === 'lower' && v < 0) return 'That battery is the wrong way round: it pulls the carriers away from the junction, widening the depletion layer and making the barrier higher instead of lower.';
  return barrierAfter(r, v) > r.target ? 'With that battery the barrier ends up higher than the one the hopper is planning for.' : 'With that battery the barrier ends up lower than the one the hopper is planning for.';
}
/** After a miss: the direction only (faster or slower than the circuit), never a ratio to the true rate. */
export function rectMiss(r: RectRound, f: number): string {
  return f > r.sol ? 'Your lamp flashes faster than the circuit delivers: some of the flashes would be invented.' : 'Your lamp flashes more slowly than the circuit delivers: some of the real pulses would be missed.';
}
export function curveMiss(r: CurveRound, x: number): string {
  if (r.kind === 'forward' && Math.abs(x - Math.log10(staticResistance(r))) <= RES_TOL) return 'That is the slope of a line from the origin to the point, but the question is about how the voltage changes with the current between the two points on the curve.';
  if (r.kind === 'forward') return x > r.logSol ? 'With that resistance the current would hardly change when the voltage rises, but on the curve it climbs by many milliamps.' : 'With that resistance the current would shoot up for a tiny rise in voltage, but on the curve it climbs more gently.';
  return x > r.logSol ? 'A resistance that large would leave almost no reverse current at that voltage: less than the curve shows.' : 'A resistance that small would pass much more reverse current than the curve shows.';
}

export function biasExplain(r: BiasRound): string[] {
  return [`The barrier after biasing is ${fmt(r.v0)} V ${r.sol >= 0 ? '−' : '+'} ${fmt(Math.abs(r.sol))} V = ${fmt(r.target)} V, so the battery must be ${fmt(Math.abs(r.sol))} V ${r.sol >= 0 ? 'forward' : 'reverse'}.`, 'Forward bias opposes the junction’s potential barrier and lowers it, so carriers cross and a current flows; reverse bias adds to it and widens the depletion layer (Exercises 14.4, 14.5; Example 14.3).'];
}
export function rectExplain(r: RectRound): string[] {
  return [r.kind === 'half' ? `A half-wave rectifier gives one pulse per cycle, so the output frequency is the same as the supply: ${fmt(r.sol)} Hz.` : `A full-wave rectifier gives a pulse in each half-cycle, so the output frequency is twice the supply: 2 × ${fmt(r.f)} Hz = ${fmt(r.sol)} Hz.`, 'The output is always the same direction, but it is not steady: it still pulses, and a capacitor can smooth it (Exercise 14.6).'];
}
export function curveExplain(r: CurveRound): string[] {
  return [r.kind === 'forward' ? `The dynamic resistance is r = ΔV/ΔI = ${fmt(r.v2 - r.v1)} V / ${fmt(r.i2 - r.i1)} mA = ${fmt(r.sol)} Ω.` : `R = V/I = ${fmt(Math.abs(r.v1))} V / ${fmt(Math.abs(r.i1))} µA = ${fmt(r.sol)} Ω.`, 'The forward resistance is small and the reverse resistance huge, which is why a diode passes current one way only (Example 14.4).'];
}
