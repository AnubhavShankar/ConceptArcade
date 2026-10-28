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
export type Game =
  | { kind: 'zoom'; hero: Hero; rounds: ZoomRound[]; charges: number[] }
  | { kind: 'plate'; hero: Hero; rounds: PlateRound[]; charges: number[] }
  | { kind: 'near'; hero: Hero; rounds: NearRound[]; charges: number[] };

const ZOOM: [number, number, string][] = [[144, 24, 'Exercise 9.13'], [140, 28, 'Exercise 9.27(a)'], [1500, 1500, 'Exercise 9.14(a)']];
/** [fo, fe]: the near-point cases (Exercise 9.27(b) first). */
const NEAR: [number, number][] = [[140, 5], [100, 4], [120, 6], [80, 4], [150, 5]];
const TOWER_THETA = 100 / 3000;
const PLATE: ['moon' | 'tower', number][] = [['moon', 500], ['moon', 1000], ['moon', 1500], ['tower', 140], ['tower', 210]];

export const SLIDERS = {
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

/** A test shot in words. */
export function viewReading(fo: number, fe: number, L: number): string {
  const w = view(fo, fe, L);
  if (w.M === null) return w.d <= 0 ? 'The eyepiece is inside the objective’s focus: it cannot work on the first image.' : 'The first image is outside the eyepiece’s focal length: the eyepiece makes a real image, not a magnified virtual one.';
  return `Final image ${w.v === Infinity ? 'at infinity' : `${fmt(w.v!)} cm from the eyepiece`}${w.v !== null && !eyeSees(w.v) ? ' (too near to focus)' : ''}, magnification ${fmt(w.M)}×.`;
}

export function explainRound(g: Game, k: number): string[] {
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
  if (g.kind === 'zoom') return `The target fills the reticle: ${g.rounds[k].M}× with the image at infinity (${g.rounds[k].exercise}).`;
  if (g.kind === 'plate') return `The image fills the plate: ${fmt(g.rounds[k].plate)} cm across (${g.rounds[k].exercise}).`;
  return `Sharp, and ${fmt(g.rounds[k].M)}× with the image at the near point.`;
}
/** After a miss: the effect of what the player chose, never the right answer. */
export function missText(g: Game, k: number, tried: { fe?: number; L?: number; fo?: number }): string {
  if (g.kind === 'plate') {
    const r = g.rounds[k];
    const size = plateSize(tried.fo ?? 0, r.theta);
    return size > r.plate ? `The image is ${fmt(size)} cm across: it spills over the ${fmt(r.plate)} cm plate.` : `The image is only ${fmt(size)} cm across: it leaves the ${fmt(r.plate)} cm plate partly empty.`;
  }
  const r = g.rounds[k];
  const w = view(r.fo, tried.fe ?? 1, tried.L ?? r.fo);
  if (w.M === null) return 'No clear picture forms with those settings.';
  return `With those settings the telescope gives ${fmt(w.M)}× and the final image is ${w.v === Infinity ? 'at infinity' : `${fmt(w.v!)} cm away`}${w.v !== null && !eyeSees(w.v) ? ', too near to focus' : ''}: not the view the ring asks for.`;
}
