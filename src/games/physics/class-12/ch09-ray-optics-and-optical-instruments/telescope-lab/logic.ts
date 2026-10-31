// Pure rules of the Telescope Lab: no DOM, no canvas. Distances in cm; the eye sees sharply only from the near point D to infinity.
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

export const D = 25;
export const MOON = { diameterM: 3.48e6, orbitM: 3.8e8 };
/** Angular size of the Moon (radians). */
export const MOON_ANGLE = MOON.diameterM / MOON.orbitM;

export interface Hero {
  name: string;
  role: string;
  story: string;
  objective: string;
}

// ---- the physics ----------------------------------------------------------------------------------------------------------

export interface View {
  /** Distance of the objective’s image in front of the eyepiece. */
  d: number;
  /** Where the final image is: |v| from the eyepiece, Infinity at infinity, or null when the eyepiece makes no virtual image. */
  v: number | null;
  /** Angular magnification M = fo/d, or null when there is no virtual image. */
  M: number | null;
}
/** A telescope with objective fo, eyepiece fe and tube length L, looking at a very distant object. */
export function view(fo: number, fe: number, L: number): View {
  const d = L - fo;
  if (d <= 1e-9 || d > fe + 1e-9) return { d, v: null, M: null };
  const v = Math.abs(d - fe) < 1e-9 ? Infinity : (d * fe) / (fe - d);
  return { d, v, M: fo / d };
}
/** Normal adjustment: the final image is at infinity, M = fo/fe and L = fo + fe. */
export const normalM = (fo: number, fe: number) => fo / fe;
/** Final image at the near point: M = (fo/fe)(1 + fe/D) and L = fo + fe D/(fe + D). */
export const nearM = (fo: number, fe: number) => (fo / fe) * (1 + fe / D);
export const nearL = (fo: number, fe: number) => fo + (fe * D) / (fe + D);
export const eyeSees = (v: number) => v >= D - 1e-9;
/** Diameter of the real image the objective forms of an object of angular size `theta` (rad): fo × theta. */
export const plateSize = (fo: number, theta: number) => fo * theta;

// ---- the rounds -----------------------------------------------------------------------------------------------------------

export type Assist = 0 | 1 | 2;
export interface ZoomRound {
  fo: number;
  M: number;
  /** The eyepiece and the tube length that give M with the image at infinity. */
  feSol: number;
  LSol: number;
  exercise: string;
  assist: Assist;
}
export interface PlateRound {
  /** The target and how big it looks: its angle in radians. */
  target: 'moon' | 'tower';
  theta: number;
  /** The plate size, cm, to one decimal. */
  plate: number;
  /** The objective focal length that fills the plate (exact). */
  foSol: number;
  exercise: string;
  assist: Assist;
}
export interface NearRound {
  fo: number;
  feSol: number;
  M: number;
  LSol: number;
  assist: Assist;
}
export type Planet = 'Saturn' | 'Jupiter' | 'Neptune';
/** A Cassegrain telescope (mm): a big concave mirror R1 and a small convex mirror R2 placed d in front of it. */
export interface CassRound {
  R1: number;
  R2: number;
  d: number;
  planet: Planet;
  /** The big mirror’s own focus, R1/2. */
  f1: number;
  /** The small mirror’s focal length, R2/2. */
  f2: number;
  /** The virtual object for the small mirror: f1 − d behind it. */
  u: number;
  /** Where the final image forms, measured from the small mirror: the sensor must go here. */
  v: number;
  assist: Assist;
}
export type Game =
  | { kind: 'cass'; hero: Hero; rounds: CassRound[]; charges: number[] }
  | { kind: 'zoom'; hero: Hero; rounds: ZoomRound[]; charges: number[] }
  | { kind: 'plate'; hero: Hero; rounds: PlateRound[]; charges: number[] }
  | { kind: 'near'; hero: Hero; rounds: NearRound[]; charges: number[] };

const ZOOM: [number, number, string][] = [[144, 24, 'Exercise 9.13'], [140, 28, 'Exercise 9.27(a)'], [1500, 1500, 'Exercise 9.14(a)']];
/** [fo, fe]: the near-point cases (Exercise 9.27(b) first). */
const NEAR: [number, number][] = [[140, 5], [100, 4], [120, 6], [80, 4], [150, 5]];
const TOWER_THETA = 100 / 3000;
const PLATE: ['moon' | 'tower', number][] = [['moon', 500], ['moon', 1000], ['moon', 1500], ['tower', 140], ['tower', 210]];

/** Level 4, [R₁, R₂, d] in mm: round 1 is Exercise 9.29 (v = 315), round 2 one of two (300, 400), the boss 150. */
const CASS_1: [number, number, number][] = [[220, 140, 20]];
const CASS_2: [number, number, number][] = [[200, 120, 25], [240, 160, 20]];
const CASS_3: [number, number, number][] = [[180, 100, 15]];
const PLANETS: Planet[] = ['Saturn', 'Jupiter', 'Neptune'];

/** v from the small mirror: 1/v = 1/f₂ − 1/(f₁ − d), the big mirror’s image being a virtual object at u = f₁ − d behind it. */
export function cassV(R1: number, R2: number, d: number): number {
  const f1 = R1 / 2;
  const f2 = R2 / 2;
  const inv = 1 / f2 - 1 / (f1 - d);
  return Math.abs(inv) < 1e-12 ? Infinity : 1 / inv;
}
/** The blur radius (screen px) of a planet when the sensor is at x and the image forms at v: 0 only when they agree. */
export const blurPx = (x: number, v: number) => (Math.abs(x - v) < 1e-9 ? 0 : Math.min(22, 3 + Math.abs(x - v) * 0.1));
/** The blur a MISSED exposure always develops with, whatever the error (a blur that grew with the error would give the answer away). */
export const MISS_BLUR = 14;
export type CassSide = 'short' | 'long' | 'right';
/** short: the sensor sits in front of the focus (the light had not yet focused); long: behind it. */
export const cassSide = (r: CassRound, x: number): CassSide => (Math.abs(x - r.v) <= 0.5 ? 'right' : x < r.v ? 'short' : 'long');

export const SLIDERS = {
  cass: { min: 0, max: 600, step: 5, start: 50 },
  fe: { min: 0.5, max: 30, step: 0.5, start: 10 },
  fo: { min: 50, max: 2000, step: 10, start: 800 },
};
/** The tube-length dial for a round with objective fo and step `step`: a window around fo. */
export const lRange = (fo: number, step: number) => (fo >= 1000 ? { min: Math.round(fo * 0.9), max: Math.round(fo * 1.1), step } : { min: Math.round(fo - 5), max: Math.round(fo + 12), step });

export function buildGame(level: number, random: () => number): Game {
  const assist = (k: number) => k as Assist;
  if (level === 1) {
    return {
      kind: 'zoom',
      hero: {
        name: 'Hawk',
        role: 'a scout peering through a sniper-style telescope',
        story: 'The scout wants a distant target to fill the reticle ring. In normal adjustment the telescope’s final image is at infinity, which fixes how the eyepiece and the tube length must be chosen for a wanted magnification. The first image the objective makes of a far object sits at its focus.',
        objective: 'Choose the eyepiece focal length and the tube length that give the ring’s magnification with the final image at infinity, in three rounds. A test shot costs a charge; the live view fades.',
      },
      rounds: ZOOM.map(([fo, M, exercise], k) => ({ fo, M, feSol: fo / M, LSol: fo + fo / M, exercise, assist: assist(k) })),
      charges: [1, 1, 1],
    };
  }
  if (level === 2) {
    const picks = shuffle(PLATE, random).slice(0, 3).map(([target, fo]) => {
      const theta = target === 'moon' ? MOON_ANGLE : TOWER_THETA;
      const plate = Math.round(fo * theta * 10) / 10;
      return { target, theta, plate, foSol: plate / theta, exercise: target === 'moon' ? 'Exercise 9.14(b)' : 'Exercise 9.28(b)' };
    }).sort((a, b) => a.plate - b.plate);
    return {
      kind: 'plate',
      hero: {
        name: 'Luna',
        role: 'the Moon, posing for a photograph',
        story: 'A long-focus telescope photographs far objects through its objective alone: the real image it forms has a size equal to the focal length times the angle the object covers. The photographic plate has a fixed size. The Moon covers about 0.0092 rad of sky, and a 100 m tower seen from 3 km away covers 1/30 rad.',
        objective: 'Choose the objective focal length so the real image of the target exactly fills the plate, in three rounds. A test shot costs a charge; the live view fades.',
      },
      rounds: picks.map((p, k) => ({ ...p, assist: assist(k) })),
      charges: [1, 1, 1],
    };
  }
  if (level === 4) {
    const [a] = CASS_1;
    const [b] = shuffle(CASS_2, random);
    const [c] = CASS_3;
    const mk = ([R1, R2, d]: [number, number, number], i: number): CassRound => ({ R1, R2, d, planet: PLANETS[i], f1: R1 / 2, f2: R2 / 2, u: R1 / 2 - d, v: Math.round(cassV(R1, R2, d)), assist: assist(i) });
    return {
      kind: 'cass',
      hero: {
        name: 'Stella',
        role: 'a young stargazer with a Cassegrain telescope on a rooftop observatory',
        story: 'Stella wants to photograph a planet tonight. Her Cassegrain telescope folds the light: the big concave mirror sends it to a small convex mirror, which sends it back through a hole in the big mirror to the camera. The big mirror’s image is a virtual object for the small one.',
        objective: 'Slide the camera sensor to where the planet comes into focus, and photograph all three planets.',
      },
      rounds: [mk(a, 0), mk(b, 1), mk(c, 2)],
      charges: [1, 1, 0],
    };
  }
  const list: [number, number][] = [NEAR[0], ...shuffle(NEAR.slice(1), random).slice(0, 2)];
  return {
    kind: 'near',
    hero: {
      name: 'Orion',
      role: 'an astronomer who cannot relax their eyes',
      story: 'Normal adjustment puts the final image at infinity, which is restful. But Orion prefers the final image at the near point, 25 cm away, where the telescope is a little stronger. Both the eyepiece and the tube length must be chosen so the image lands there.',
      objective: 'Choose the eyepiece and the tube length that give the ringed magnification with the final image at the near point, in three rounds. A test shot costs a charge; the live view fades.',
    },
    rounds: list.map(([fo, fe], k) => ({ fo, feSol: fe, M: nearM(fo, fe), LSol: nearL(fo, fe), assist: assist(k) })),
    charges: [1, 1, 1],
  };
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export function judgeZoom(r: ZoomRound, fe: number, L: number): { ok: boolean; feOk: boolean; lOk: boolean } {
  const feOk = Math.abs(fe - r.feSol) <= 0.25;
  const lOk = Math.abs(L - r.LSol) <= 0.5;
  return { ok: feOk && lOk, feOk, lOk };
}
export function judgePlate(r: PlateRound, fo: number): { ok: boolean; size: number } {
  return { ok: Math.abs(fo - r.foSol) <= 5.01, size: plateSize(fo, r.theta) };
}
export function judgeNear(r: NearRound, fe: number, L: number): { ok: boolean; feOk: boolean; lOk: boolean } {
  const feOk = Math.abs(fe - r.feSol) <= 0.25;
  const lOk = Math.abs(L - r.LSol) <= 0.05;
  return { ok: feOk && lOk, feOk, lOk };
}

/** Level 4: the sensor must stand exactly where the final image forms (the dial moves in steps of 5 mm, every answer is a multiple of 5). */
export function judgeCass(r: CassRound, x: number): { ok: boolean; side: CassSide } {
  const side = cassSide(r, x);
  return { ok: side === 'right', side };
}
/** What the shot says first, before any slider moves. */
export const cassIntel = (r: CassRound) => `Tonight: ${r.planet}. Big mirror R₁ = ${r.R1} mm, small convex mirror R₂ = ${r.R2} mm, ${r.d} mm apart. Slide the camera sensor to where the planet’s image forms, measured from the small mirror.`;

/** A test shot in words. */
export function viewReading(fo: number, fe: number, L: number): string {
  const w = view(fo, fe, L);
  if (w.M === null) return w.d <= 0 ? 'The eyepiece is inside the objective’s focus: it cannot work on the first image.' : 'The first image is outside the eyepiece’s focal length: the eyepiece makes a real image, not a magnified virtual one.';
  return `Final image ${w.v === Infinity ? 'at infinity' : `${fmt(w.v!)} cm from the eyepiece`}${w.v !== null && !eyeSees(w.v) ? ' (too near to focus)' : ''}, magnification ${fmt(w.M)}×.`;
}

export function explainRound(g: Game, k: number): string[] {
  if (g.kind === 'cass') {
    const r = g.rounds[k];
    return [
      `The big mirror would focus ${r.planet} at f₁ = ${r.f1} mm, which is ${r.f1} − ${r.d} = ${r.u} mm behind the small mirror: a virtual object. With f₂ = ${r.f2} mm, 1/v = 1/${r.f2} − 1/${r.u}, so v = ${r.v} mm from the small mirror.`,
      'A Cassegrain folds the light twice, so a short tube acts like a long one: the big concave mirror’s image is a virtual object for the small convex mirror (Exercise 9.29).',
    ];
  }
  if (g.kind === 'zoom') {
    const r = g.rounds[k];
    return [
      `In normal adjustment M = f_o/f_e, so f_e = f_o/M = ${r.fo}/${r.M} = ${fmt(r.feSol)} cm.`,
      `The objective’s image of a distant object is at its focus, and the eyepiece must stand f_e beyond it for the final image at infinity: L = f_o + f_e = ${fmt(r.LSol)} cm (${r.exercise}).`,
    ];
  }
  if (g.kind === 'plate') {
    const r = g.rounds[k];
    return [
      `The objective’s image of a distant object has size f_o × θ. For ${r.target === 'moon' ? `the Moon, θ = ${fmt(MOON.diameterM)} m / ${fmt(MOON.orbitM)} m = ${fmt(MOON_ANGLE)} rad` : 'the tower, θ = 100 m / 3000 m = 1/30 rad'}.`,
      `So f_o = ${fmt(r.plate)} cm / ${fmt(r.theta)} = ${fmt(r.foSol)} cm, about ${fmt(Math.round(r.foSol / 10) * 10)} cm (${r.exercise}).`,
    ];
  }
  const r = g.rounds[k];
  return [
    `With the final image at the near point D the eyepiece’s object is at u_e = f_eD/(f_e + D) = ${fmt(nearL(r.fo, r.feSol) - r.fo)} cm from it, so L = f_o + u_e = ${fmt(r.LSol)} cm.`,
    `The magnification is M = f_o/u_e = (f_o/f_e)(1 + f_e/D) = ${fmt(r.M)} (Exercise 9.27(b)).`,
  ];
}
export function resultLine(g: Game, k: number): string {
  if (g.kind === 'cass') return `${g.rounds[k].planet} is pin-sharp: the image forms ${g.rounds[k].v} mm from the small mirror.`;
  if (g.kind === 'zoom') return `The target fills the reticle: ${g.rounds[k].M}× with the image at infinity (${g.rounds[k].exercise}).`;
  if (g.kind === 'plate') return `The image fills the plate: ${fmt(g.rounds[k].plate)} cm across (${g.rounds[k].exercise}).`;
  return `Sharp, and ${fmt(g.rounds[k].M)}× with the image at the near point.`;
}
/** After a miss: the effect of what the player chose, never the right answer. */
export function missText(g: Game, k: number, tried: { fe?: number; L?: number; fo?: number; x?: number }): string {
  if (g.kind === 'cass') {
    // only the side (review fix): the image formed in front of or behind the sensor, never how far
    const r = g.rounds[k];
    const x = tried.x ?? 0;
    return `With the sensor at ${x} mm, ${r.planet} came out as a blurred disc: the light ${x < r.v ? 'had not yet come to a focus' : 'had already focused and spread out again'}.`;
  }
  if (g.kind === 'plate') {
    // direction only: no size, no number
    const r = g.rounds[k];
    return plateSide(r, tried.fo ?? 0) === 'over' ? 'The image is too big: it spills over the plate.' : 'The image is too small: it leaves the plate partly empty.';
  }
  const r = g.rounds[k];
  const s = scopeMiss(r, tried.fe ?? 1, tried.L ?? r.fo);
  if (s.none) return 'No clear picture forms with those settings.';
  const size = s.size === 'over' ? 'The target overfills the ring' : s.size === 'under' ? 'The target does not fill the ring' : 'The target nearly fills the ring';
  return s.blurred ? `${size}, and the picture is blurred: the final image is too near for the eye to focus.` : `${size}: this is not the view the ring asks for.`;
}

/** Level 2: which side of the plate the image falls on for a focal length fo: too long spills over, too short leaves it empty. */
export const plateSide = (r: PlateRound, fo: number): 'over' | 'under' => (fo > r.foSol ? 'over' : 'under');
/** What a missed plate exposure always draws: the image ring at a fixed multiple of the plate, whatever the error. */
export const PLATE_MISS = { over: 1.5, under: 0.55 };

/** Levels 1 and 3: how a missed scope looks, by category only (never the player's own magnification or image distance). */
export type ScopeMiss = { none: true } | { none: false; size: 'over' | 'under' | 'about'; blurred: boolean };
export function scopeMiss(r: { fo: number; M: number }, fe: number, L: number): ScopeMiss {
  const w = view(r.fo, fe, L);
  if (w.M === null) return { none: true };
  const ratio = w.M / r.M;
  return { none: false, size: ratio > 1.03 ? 'over' : ratio < 0.97 ? 'under' : 'about', blurred: !eyeSees(w.v!) };
}
/** The radius (screen px) of the target in the scope view on a miss, by category: the ring is 56 px, the view 77 px. */
export const SCOPE_MISS_RADIUS = { over: 72, under: 24, about: 56 };
/** The blur a missed scope view always develops with when the final image is too near to focus. */
export const SCOPE_MISS_BLUR = 14;
