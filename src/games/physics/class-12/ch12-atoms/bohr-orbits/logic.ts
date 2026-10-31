// Snap the Electron: the rules of the four levels (ring flash, camera trap, twin atoms, powers of ten).
// Pure functions only: no DOM, no canvas, and randomness only through the `random` argument.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick, shuffle } from '@core/quiz';

export const A0 = 0.53; // Å, the ground orbit a₀ (Example 12.3)
export const V1 = 2.19e6; // m/s, the ground-orbit speed (Ex 12.6)
export const HBAR = 1.055e-34; // J s
export const T1 = (2 * Math.PI * A0 * 1e-10) / V1; // s, one ground-orbit lap: 1.52 × 10⁻¹⁶ s
export const radius = (n: number) => A0 * n * n; // Å
export const speed = (n: number) => V1 / n; // m/s
export const period = (n: number) => T1 * n ** 3; // s, the same as 2π·radius(n)·1e-10 / speed(n)
export const ringA = (k: number) => (53 * k) / 100; // Å, the ring flash at k steps of a₀
/** Matter waves round a circular orbit of radius k·a₀ with the speed such an orbit has: 2πr/λ = √(r/a₀) (§12.6). */
export const waves = (k: number) => Math.sqrt(k);

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** An integer exponent in superscript, with a true minus sign: sup(74) = '⁷⁴', sup(-15) = '⁻¹⁵'. */
export const sup = (e: number) => `${e < 0 ? '⁻' : ''}${[...String(Math.abs(e))].map((c) => SUP[Number(c)]).join('')}`;
/** Two significant figures, the book's style: 0.16, 2.0, 0.50, 3.0 × 10³, 6.0 × 10²⁴. */
export function sci(x: number): string {
  const e = Math.floor(Math.log10(Math.abs(x)) + 1e-9);
  if (e >= -1 && e <= 1) return x.toFixed(e === 1 ? 0 : e === 0 ? 1 : 2);
  return `${(x / 10 ** e).toFixed(1)} × 10${sup(e)}`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const DIAL = {
  k: { min: 1, max: 30, step: 1, start: 6 }, // level 1: the ring flash in steps of a₀ (0.53 Å to 15.9 Å)
  deg: { min: 0, max: 345, step: 15, start: 0 }, // levels 2 and 3: degrees clockwise from the gate
  z: { min: 0, max: 90, step: 1, start: 0 }, // level 4: the zoom ×10ᶻ
};
export const HANDLE_R = 20; // every drag handle (UX: at least 18)

export type Say = 'level' | 'excited' | 'waves';
export interface TrapRow { n: number; laps: number; deg: number; dt: number } // dt in s; answer deg
export interface TwinRow { na: number; nb: number; k: number; deg: number } // answer deg (on B)
export type Scene = 'cabin' | 'earth' | 'planet' | 'sun';
export interface ZoomRow { id: string; name: string; short: string; around: string; scene: Scene; m: number; v: number; r: number; b: number } // answer b
type Assist = 0 | 1 | 2;
export type Round =
  | { kind: 'ring'; n: number; say: Say; assist: Assist }
  | ({ kind: 'trap'; assist: Assist } & TrapRow)
  | ({ kind: 'twin'; assist: Assist } & TwinRow)
  | ({ kind: 'zoom'; assist: Assist } & ZoomRow);
export type Values = { k?: number; deg?: number; z?: number };

// Level 2. laps = whole laps done before the flash; deg = the angle of the electron at the flash (the answer).
// dt is shown to 3 significant figures and solves back to the angle within 5° for v₁ = 2.18, 2.19 or 2.2 × 10⁶ m/s,
// a₀ = 0.529 or 0.53 Å, or T₁ = 1.52 × 10⁻¹⁶ s; the dial step is 15°.
export const TRAP: TrapRow[][] = [
  [
    { n: 1, laps: 0, deg: 90, dt: 3.8e-17 }, { n: 1, laps: 0, deg: 120, dt: 5.07e-17 }, { n: 1, laps: 0, deg: 270, dt: 1.14e-16 },
    { n: 2, laps: 0, deg: 90, dt: 3.04e-16 }, { n: 2, laps: 0, deg: 180, dt: 6.08e-16 }, { n: 2, laps: 0, deg: 270, dt: 9.12e-16 },
  ],
  [
    { n: 2, laps: 1, deg: 60, dt: 1.42e-15 }, { n: 2, laps: 0, deg: 210, dt: 7.1e-16 }, { n: 2, laps: 1, deg: 300, dt: 2.23e-15 },
    { n: 3, laps: 0, deg: 150, dt: 1.71e-15 }, { n: 3, laps: 0, deg: 300, dt: 3.42e-15 }, { n: 3, laps: 1, deg: 210, dt: 6.5e-15 },
  ],
  [
    { n: 3, laps: 1, deg: 30, dt: 4.45e-15 }, { n: 3, laps: 1, deg: 330, dt: 7.87e-15 }, { n: 4, laps: 1, deg: 45, dt: 1.09e-14 },
    { n: 4, laps: 1, deg: 135, dt: 1.34e-14 }, { n: 4, laps: 1, deg: 225, dt: 1.58e-14 }, { n: 4, laps: 0, deg: 315, dt: 8.52e-15 },
  ],
];

// Level 3. A is the clock (the lower level), B carries the camera. B's laps = k·(na/nb)³ exactly; deg = its fraction × 360.
export const TWIN: TwinRow[][] = [
  [
    { na: 1, nb: 2, k: 2, deg: 90 }, { na: 1, nb: 2, k: 3, deg: 135 }, { na: 1, nb: 2, k: 6, deg: 270 },
    { na: 2, nb: 4, k: 2, deg: 90 }, { na: 2, nb: 4, k: 3, deg: 135 }, { na: 2, nb: 4, k: 6, deg: 270 },
  ],
  [
    { na: 1, nb: 3, k: 9, deg: 120 }, { na: 1, nb: 3, k: 18, deg: 240 }, { na: 1, nb: 3, k: 36, deg: 120 },
    { na: 1, nb: 3, k: 45, deg: 240 }, { na: 2, nb: 3, k: 9, deg: 240 }, { na: 2, nb: 3, k: 18, deg: 120 },
  ],
  [
    { na: 1, nb: 4, k: 8, deg: 45 }, { na: 1, nb: 4, k: 32, deg: 180 }, { na: 1, nb: 4, k: 40, deg: 225 },
    { na: 1, nb: 4, k: 56, deg: 315 }, { na: 1, nb: 4, k: 72, deg: 45 }, { na: 1, nb: 4, k: 104, deg: 225 },
  ],
];

// Level 4. Values to 2 significant figures (shown with sci). b = ⌊log₁₀(mvr/ħ)⌋, the same for ħ = 1.05, 1.0546 or
// 1.055 × 10⁻³⁴ J s and for h/2π with h = 6.6 or 6.63 × 10⁻³⁴ J s. Round 3's Earth row is Ex 12.9.
export const ZOOM: ZoomRow[][] = [
  [
    { id: 'ball', name: 'Kiran’s cricket ball', short: 'the ball', around: 'her hand on a string', scene: 'cabin', m: 0.16, v: 2.0, r: 0.5, b: 33 },
    { id: 'weather', name: 'a weather satellite', short: 'the satellite', around: 'the Earth', scene: 'earth', m: 3.0e3, v: 3.1e3, r: 4.2e7, b: 48 },
    { id: 'station', name: 'this space station', short: 'this station', around: 'the Earth', scene: 'earth', m: 4.2e5, v: 7.7e3, r: 6.8e6, b: 50 },
  ],
  [
    { id: 'phobos', name: 'Phobos', short: 'Phobos', around: 'Mars', scene: 'planet', m: 1.1e16, v: 2.1e3, r: 9.4e6, b: 60 },
    { id: 'moon', name: 'the Moon', short: 'the Moon', around: 'the Earth', scene: 'planet', m: 7.4e22, v: 1.0e3, r: 3.8e8, b: 68 },
    { id: 'io', name: 'Io', short: 'Io', around: 'Jupiter', scene: 'planet', m: 8.9e22, v: 1.7e4, r: 4.2e8, b: 69 },
    { id: 'ganymede', name: 'Ganymede', short: 'Ganymede', around: 'Jupiter', scene: 'planet', m: 1.5e23, v: 1.1e4, r: 1.1e9, b: 70 },
  ],
  [
    { id: 'mars', name: 'Mars', short: 'Mars', around: 'the Sun', scene: 'sun', m: 6.4e23, v: 2.4e4, r: 2.3e11, b: 73 },
    { id: 'earth', name: 'the Earth', short: 'the Earth', around: 'the Sun', scene: 'sun', m: 6.0e24, v: 3.0e4, r: 1.5e11, b: 74 },
    { id: 'venus', name: 'Venus', short: 'Venus', around: 'the Sun', scene: 'sun', m: 4.9e24, v: 3.5e4, r: 1.1e11, b: 74 },
    { id: 'neptune', name: 'Neptune', short: 'Neptune', around: 'the Sun', scene: 'sun', m: 1.0e26, v: 5.4e3, r: 4.5e12, b: 76 },
    { id: 'jupiter', name: 'Jupiter', short: 'Jupiter', around: 'the Sun', scene: 'sun', m: 1.9e27, v: 1.3e4, r: 7.8e11, b: 77 },
  ],
];

const SAY: Say[] = ['level', 'excited', 'waves'];
export const ORD: Record<number, string> = { 2: 'first', 3: 'second', 4: 'third', 5: 'fourth' };

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  if (level === 1) {
    const ns = shuffle([2, 3, 4, 5], random).slice(0, 3).sort((a, b) => a - b);
    return ns.map((n, k) => ({ kind: 'ring' as const, n, say: SAY[k], assist: aid(k) }));
  }
  const pools = [TRAP, TWIN, ZOOM][level - 2] as unknown[][];
  const kind = (['trap', 'twin', 'zoom'] as const)[level - 2];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

/** The winning dial value of a round. */
export const answer = (r: Round): number => (r.kind === 'ring' ? r.n * r.n : r.kind === 'zoom' ? r.b : r.deg);
/** The player's own dial value for this round's dial. */
export const own = (r: Round, x: Values): number => (r.kind === 'ring' ? x.k! : r.kind === 'zoom' ? x.z! : x.deg!);

export type Out = 'win' | 'wide' | 'narrow' | 'passed' | 'early' | 'many' | 'few';
export function outcome(r: Round, x: Values): Out {
  const a = answer(r);
  const v = own(r, x);
  if (v === a) return 'win';
  if (r.kind === 'ring') return v > a ? 'wide' : 'narrow';
  if (r.kind === 'zoom') return v < a ? 'many' : 'few';
  return v < a ? 'passed' : 'early'; // trap and twin: a smaller angle means the electron had already gone by
}
export const judge = (r: Round, x: Values) => outcome(r, x) === 'win';

/** Seconds into the take at which the photo is revealed, and at which the verdict lands. */
export const REVEAL = { ring: 0.3, trap: 0.95, twin: 1.05, zoom: 1.0 } as const;
export const DELAY = { ring: 0.45, trap: 1.0, twin: 1.1, zoom: 1.1 } as const;
/** The fixed looks of a miss: never proportional to the error. */
export const MISS_LOOK = { streakOffset: 12, streakDeg: 40, trailDeg: 35, blurLines: 40, fewWaves: 0.3 } as const;
export const HIT: [number, number] = [400, 52]; // the burst and "−1 ♥" point, the same in every level and round

// ---- words ----

/** Level 1: how the electron's level is given. */
export function phrase(r: Extract<Round, { kind: 'ring' }>): string {
  if (r.say === 'level') return `on level n = ${r.n}`;
  if (r.say === 'excited') return `in the ${ORD[r.n]} excited state`;
  return `on the orbit that holds ${r.n} of its matter waves`;
}

/** The one-line goal drawn on the canvas, at most 58 characters. */
export function goal(r: Round): string {
  if (r.kind === 'ring') {
    if (r.say === 'level') return `Snap the electron on level n = ${r.n}`;
    if (r.say === 'excited') return `Snap the electron in the ${ORD[r.n]} excited state`;
    return `Snap the electron whose orbit holds ${r.n} waves`;
  }
  if (r.kind === 'trap') return `Level ${r.n}: the flash fires ${fmt(r.dt)} s after the gate`;
  if (r.kind === 'twin') return `Flash at B when A has lapped ${r.k} times`;
  return `Zoom in to count the waves of ${r.short}`;
}

/** The facts, in the hint line under the canvas. */
export function intel(r: Round): string {
  if (r.kind === 'ring') return `The electron is ${phrase(r)}. The ground orbit is a₀ = 0.53 Å.`;
  if (r.kind === 'trap') return `Level n = ${r.n}. The electron circles clockwise and passes the gate at the top; the flash fires ${fmt(r.dt)} s later. v₁ = 2.19 × 10⁶ m/s, a₀ = 0.53 Å.`;
  if (r.kind === 'twin') return `Atom A is on level ${r.na} and atom B on level ${r.nb}. Both electrons leave their gates together; the camera fires at B when A has lapped ${r.k} times.`;
  return `${cap(r.name)} round ${r.around}: m = ${sci(r.m)} kg, v = ${sci(r.v)} m/s, r = ${sci(r.r)} m. ħ = 1.055 × 10⁻³⁴ J s.`;
}

const AIDLINE: Record<Round['kind'], string> = {
  ring: 'Round 1: the matter-wave preview is live.',
  trap: 'Round 1: the lap meter is live.',
  twin: 'Round 1: B’s lap meter is live.',
  zoom: 'Round 1: the scope’s live view is on.',
};
export const aidLine = (r: Round): string =>
  r.assist === 0 ? AIDLINE[r.kind] : r.assist === 1 ? 'The helper is off: a test flash shows it for a moment (costs a charge).' : 'Final shot: no helper and no test flash.';
export const hintText = (r: Round): string => `${intel(r)} ${aidLine(r)}`;

/** The paid check, read out in the feedback panel; it may hold numbers. */
export function testText(r: Round, x: Values): string {
  if (r.kind === 'ring') return `Test flash: a ring of ${ringA(x.k!).toFixed(2)} Å would hold ${fmt(waves(x.k!))} matter waves. Only a whole number of waves closes up.`;
  if (r.kind === 'trap') return `Test flash: on level ${r.n} the electron moves at ${fmt(speed(r.n))} m/s, and one lap takes ${fmt(period(r.n))} s.`;
  if (r.kind === 'twin') return `Test flash: one lap of B (n = ${r.nb}) lasts as long as ${fmt((r.nb / r.na) ** 3)} laps of A (n = ${r.na}).`;
  return `Test flash: mvr = ${fmt(r.m * r.v * r.r)} J s for ${r.name}.`;
}

/** What the player's setting did, and which way to go; never the answer. */
export function missText(r: Round, x: Values): string {
  const o = outcome(r, x);
  if (o === 'wide') return `The ring flash at ${ringA(x.k!).toFixed(2)} Å lit empty space: the electron circles closer in. Make the ring smaller.`;
  if (o === 'narrow') return `The ring flash at ${ringA(x.k!).toFixed(2)} Å lit empty space: the electron circles farther out. Make the ring bigger.`;
  const who = r.kind === 'twin' ? 'B’s electron' : 'the electron';
  if (o === 'passed') return `At ${x.deg}° the flash lit an empty spot: ${who} had already gone past the camera. Try a larger angle.`;
  if (o === 'early') return `At ${x.deg}° the flash lit an empty spot: ${who} had not reached the camera yet. Try a smaller angle.`;
  if (o === 'many') return `At ×10${sup(x.z!)} the window held far too many waves to count. Zoom in more.`;
  if (o === 'few') return `At ×10${sup(x.z!)} the window held less than one wave. Zoom out.`;
  return '';
}

/** The working after a win, short. */
export function winText(r: Round): string {
  if (r.kind === 'ring') return `Got it! rₙ = n²a₀ = ${r.n}² × 0.53 Å = ${radius(r.n).toFixed(2)} Å, not ${r.n} × 0.53 Å. Its matter wave fits ${r.n} times round the orbit, because 2πr = nλ (Ex 12.7, §12.6).`;
  if (r.kind === 'trap') return `Got it! On level ${r.n}, v = v₁/${r.n} = ${fmt(speed(r.n))} m/s round r = ${radius(r.n).toFixed(2)} Å, so one lap takes T = 2πr/v = ${fmt(period(r.n))} s. ${fmt(r.dt)} s is ${fmt(r.dt / period(r.n))} laps: ${r.deg}° past the gate (Ex 12.6).`;
  if (r.kind === 'twin') return `Got it! T ∝ n³, so one lap of B (n = ${r.nb}) lasts ${fmt((r.nb / r.na) ** 3)} laps of A (n = ${r.na}). ${r.k} laps of A is ${fmt(r.k * (r.na / r.nb) ** 3)} laps of B: ${r.deg}° past its gate (Ex 12.6).`;
  const mvr = r.m * r.v * r.r;
  return `Counted! n = mvr/ħ = ${fmt(mvr)} ÷ (1.055 × 10⁻³⁴) = ${fmt(mvr / HBAR)}, so a zoom of ×10${sup(r.b)} leaves ${fmt(mvr / HBAR / 10 ** r.b)} waves in view. Steps of ħ in an orbit this big are far too small ever to notice (Ex 12.9).`;
}

/** Drawn on the canvas only while the helper is on. Every helper describes the player's own setting, never the answer. */
export function helperLabel(r: Round, x: Values): string {
  if (r.kind === 'ring') return `${fmt(waves(x.k!))} waves: ${Number.isInteger(waves(x.k!)) ? 'fits ✓' : 'no fit ✗'}`;
  if (r.kind === 'trap') return `first reaches here ${fmt((period(r.n) * x.deg!) / 360)} s after the gate`;
  if (r.kind === 'twin') return `B first reaches here after ${fmt((x.deg! / 360) * (r.nb / r.na) ** 3)} laps of A`;
  return 'live view';
}
