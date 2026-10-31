// Pure rules of Wavefront Run: no DOM, no canvas. Speeds are in units of 10⁸ m/s, wavelengths in nm.
import { aid } from '@core/dialgame';
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

export const C = 3;
const RAD = Math.PI / 180;
export const sinD = (d: number) => Math.sin(d * RAD);
export const asinD = (x: number) => Math.asin(x) / RAD;
/** Frequency in Hz from a speed (10⁸ m/s) and a wavelength (nm). */
export const freq = (v: number, nm: number) => (v * 1e8) / (nm * 1e-9);

export interface MudRound {
  /** Wavelength in air (nm), refractive index of the medium. */
  lambda: number;
  n: number;
  /** The wavelength and speed in the medium (exact). */
  lamSol: number;
  vSol: number;
  assist: 0 | 1 | 2;
}
export interface BandRound {
  v1: number;
  v2: number;
  /** Angle of incidence (degrees) and the refraction angle that Huygens’ construction gives (exact). */
  i: number;
  rSol: number;
  assist: 0 | 1 | 2;
}

/** [wavelength in air, index]: the wavelength and speed in the medium come out as clean numbers. */
const MUD: [number, number][] = [[600, 1.5], [500, 1.25], [600, 1.2], [450, 1.5], [540, 1.2], [660, 1.5], [600, 2]];
/** [v1, v2] in 10⁸ m/s with a clean refraction angle for i = 30°. */
const BAND: [number, number][] = [[3, 2], [2, 3], [5, 6], [5, 4], [3, 4]];

export const SLIDERS = {
  lam: { min: 150, max: 700, step: 1 },
  v: { min: 1, max: 3, step: 0.01 },
  r: { min: 1, max: 85, step: 0.5 },
};

export function mudRounds(random: () => number): MudRound[] {
  return shuffle(MUD, random)
    .slice(0, 3)
    .sort((a, b) => b[1] - a[1])
    .map(([lambda, n], k) => ({ lambda, n, lamSol: lambda / n, vSol: C / n, assist: aid(k) }));
}
export function bandRounds(random: () => number): BandRound[] {
  return shuffle(BAND, random)
    .slice(0, 3)
    .map(([v1, v2], k) => ({ v1, v2, i: 30, rSol: asinD((v2 / v1) * sinD(30)), assist: aid(k) }));
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export function judgeMud(r: MudRound, lam: number, v: number): { ok: boolean; lamOk: boolean; vOk: boolean } {
  const lamOk = Math.abs(lam - r.lamSol) <= 0.5;
  const vOk = Math.abs(v - r.vSol) <= 0.005;
  return { ok: lamOk && vOk, lamOk, vOk };
}
export const judgeBand = (r: BandRound, deg: number) => Math.abs(deg - r.rSol) <= 0.26;

/** A test shot on the mud track: does the frequency stay the same? */
export function mudReading(r: MudRound, lam: number, v: number): string {
  const f0 = freq(C, r.lambda);
  const f1 = freq(v, lam);
  return `With λ′ = ${fmt(lam)} nm and v′ = ${fmt(v)} × 10⁸ m/s the frequency would be ${fmt(f1)} Hz; the wave coming in has ${fmt(f0)} Hz. ${Math.abs(f1 - f0) / f0 < 0.01 ? 'They agree.' : 'They do not agree.'}`;
}

export function mudMiss(r: MudRound, lam: number, v: number): string {
  const j = judgeMud(r, lam, v);
  const parts: string[] = [];
  if (Math.abs(freq(v, lam) - freq(C, r.lambda)) / freq(C, r.lambda) > 0.01) parts.push('The karts drift off the crests: your wavelength and speed would change the frequency, and the frequency cannot change.');
  if (!j.lamOk && parts.length === 0) parts.push('The karts keep up with the crests, but the wave in the mud does not have the wavelength the medium gives it.');
  if (!j.vOk && parts.length === 0) parts.push('The karts keep up with the crests, but the speed in the mud is not what its refractive index allows.');
  return parts.join(' ');
}
export const bandMiss = (r: BandRound, deg: number) =>
  `The wavefront you predicted at ${fmt(deg)}° ${deg > r.rSol ? 'cuts through' : 'floats clear of'} the secondary wavelets: the column would not stay in step.`;

export function mudExplain(r: MudRound): string[] {
  return [
    `The speed in the medium is v = c/n = 3/${r.n} = ${fmt(r.vSol)} × 10⁸ m/s. The frequency does not change, so λ′ = λ/n = ${r.lambda}/${r.n} = ${fmt(r.lamSol)} nm (Exercise 10.1).`,
    `The frequency is f = c/λ = ${fmt(freq(C, r.lambda))} Hz on both sides. The reflected light stays in air, so it keeps λ = ${r.lambda} nm, c and the same f.`,
  ];
}
export function bandExplain(r: BandRound): string[] {
  return [
    `Each wavelet spreads at the new speed v₂ = ${r.v2}, while the front reaches the next point at the old speed v₁ = ${r.v1}: sin r / sin i = v₂/v₁.`,
    `sin r = (${r.v2}/${r.v1}) × sin ${r.i}° = ${fmt((r.v2 / r.v1) * sinD(r.i))}, so r = ${fmt(r.rSol)}° (Huygens’ construction, Section 10.3).`,
  ];
}

// ---- level 3: Rainbow race (dispersion). Times are in tenths of a nanosecond (integers). ---------------------------------------

export interface RainbowRound {
  /** Thickness of the glass block (m) and the indices for red and violet. */
  d: number;
  nr: number;
  nv: number;
  /** The head start violet needs, in tenths of a ns: d(n_v − n_r)/c. */
  dt: number;
  /** Time each pulse spends inside the glass, in tenths of a ns: d·n/c. */
  trT: number;
  tvT: number;
  assist: 0 | 1 | 2;
}

/** [d, n_red, n_violet] per round; round 3 picks one of its two rows. */
const RAINBOW: [number, number, number][][] = [[[3, 1.51, 1.53]], [[6, 1.5, 1.53]], [[15, 1.52, 1.54], [12, 1.51, 1.535]]];

/** The head-start dial, in tenths of a ns. Positive: violet starts first. The start (0) is never an answer. */
export const HEAD = { min: -30, max: 30, step: 1, start: 0 };

/** Time through a block of thickness d (m) at index n, in tenths of a ns (c = 3 × 10⁸ m/s). */
export const transitT = (d: number, n: number) => Math.round(((d * n) / C) * 100);

export function rainbowRounds(random: () => number): RainbowRound[] {
  return RAINBOW.map((pool, k) => {
    const [d, nr, nv] = pool.length === 1 ? pool[0] : shuffle(pool, random)[0];
    return { d, nr, nv, dt: Math.round(((d * (nv - nr)) / 3e8) * 1e10), trT: transitT(d, nr), tvT: transitT(d, nv), assist: aid(k) };
  });
}

/** Exactly one head start wins. */
export const judgeRainbow = (r: RainbowRound, x: number) => x === r.dt;
/** Who leaves the block first. */
export const rainbowLeader = (r: RainbowRound, x: number): 'red' | 'violet' | 'together' => (x < r.dt ? 'red' : x > r.dt ? 'violet' : 'together');

/** A head start in tenths of a ns, as written for a student: 0.6, 3, −0.5. */
export const fmtHead = (x: number) => `${x < 0 ? '−' : ''}${Number((Math.abs(x) / 10).toFixed(1))}`;
const tenths = (t: number) => (t / 10).toFixed(1);

/** The paid test race: numbers are allowed here. */
export function rainbowTest(r: RainbowRound, x: number): string {
  const gap = r.tvT - r.trT - x;
  const when = gap === 0 ? 'together with red' : gap > 0 ? `${tenths(gap)} ns after red` : `${tenths(-gap)} ns before red`;
  return `Test race with a head start of ${fmtHead(x)} ns: red takes ${tenths(r.trT)} ns through the glass, violet takes ${tenths(r.tvT)} ns, so violet leaves ${when}.`;
}

/** After a miss: only which pulse left the block first. */
export const rainbowMiss = (r: RainbowRound, x: number) => `With a head start of ${fmtHead(x)} ns the ${rainbowLeader(r, x) === 'red' ? 'red' : 'violet'} pulse left the block first.`;

export function rainbowExplain(r: RainbowRound): string[] {
  const dn = Math.round((r.nv - r.nr) * 1000) / 1000;
  return [
    `In glass v = c/n, so violet (n = ${r.nv}) is slower than red (n = ${r.nr}). The extra time is d(n_v − n_r)/c = ${r.d} × ${dn}/(3 × 10⁸) s = ${tenths(r.dt)} ns, so violet needs that head start.`,
    `Through ${r.d} m of glass red needs ${tenths(r.trT)} ns and violet ${tenths(r.tvT)} ns (Exercise 10.3 gives the same speeds, c/n).`,
  ];
}

/**
 * The race as drawn, in seconds of animation. The start lights are scaled from the head start the player set (a clamp keeps long head
 * starts inside the 2.4 s of the shot). The exit gap is FIXED: zero on a win, GAP on a miss, whichever way the player was off, so the
 * picture never grows with the error.
 */
export const RACE = { dr: 1.1, gap: 0.3, perNs: 0.6, cap: 0.6 };
export function raceTimes(r: RainbowRound, x: number) {
  const xd = Math.max(-RACE.cap, Math.min(RACE.cap, (x / 10) * RACE.perNs));
  const lead = rainbowLeader(r, x);
  const g = lead === 'together' ? 0 : lead === 'red' ? RACE.gap : -RACE.gap;
  const sr = Math.max(0, xd);
  const sv = Math.max(0, -xd);
  const exitR = sr + RACE.dr;
  const exitV = exitR + g;
  return { sr, sv, exitR, exitV, durR: RACE.dr, durV: exitV - sv, xd };
}
/** When the verdict lands: just after the later pulse leaves the block. */
export const rainbowDelay = (r: RainbowRound, x: number) => {
  const t = raceTimes(r, x);
  return Math.max(t.exitR, t.exitV) + 0.1;
};
