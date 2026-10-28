// Pure rules of the Microscope Lab: no DOM, no canvas. Distances in cm; the eye sees sharply only from the near point D to infinity.
import { shuffle } from '@core/quiz';
import { fmt } from '@core/judge';

export const D = 25;

export interface Hero {
  name: string;
  role: string;
  story: string;
  objective: string;
}

// ---- the physics ----------------------------------------------------------------------------------------------------------

/** Simple microscope: an object u cm in front of a lens f (u < f) has a virtual image |v| = uf/(f − u) on the same side. */
export function magnifier(f: number, u: number): { kind: 'virtual' | 'infinity' | 'real'; v: number; m: number; M: number } {
  if (Math.abs(u - f) < 1e-9) return { kind: 'infinity', v: Infinity, m: Infinity, M: D / f };
  if (u > f) {
    const v = (u * f) / (u - f);
    return { kind: 'real', v, m: v / u, M: 0 };
  }
  const v = (u * f) / (f - u);
  return { kind: 'virtual', v, m: v / u, M: D / u };
}
/** Where the object must be so that the image is at the near point: u = fD/(f + D). */
export const nearPointU = (f: number) => (f * D) / (f + D);
/** Can the eye focus on the image? The virtual image must be at least D away (or at infinity). */
export const eyeSees = (v: number) => v >= D - 1e-9;

export interface Compound {
  /** Objective's real image distance, cm (null when there is none). */
  vo: number | null;
  /** Distance of that image in front of the eyepiece, cm (negative if it lies beyond). */
  d: number | null;
  /** Distance of the final virtual image from the eyepiece, cm (Infinity when at infinity). */
  ve: number | null;
  /** Magnification of the objective and total angular magnification. */
  mo: number | null;
  M: number | null;
}
/** A compound microscope with objective fo, eyepiece fe, tube length L, and an object uo in front of the objective. */
export function compound(fo: number, fe: number, L: number, uo: number): Compound {
  if (uo <= fo) return { vo: null, d: null, ve: null, mo: null, M: null };
  const vo = (uo * fo) / (uo - fo);
  const d = L - vo;
  if (d <= 0 || d > fe + 1e-9) return { vo, d, ve: null, mo: vo / uo, M: null };
  const ve = Math.abs(d - fe) < 1e-9 ? Infinity : (d * fe) / (fe - d);
  const mo = vo / uo;
  return { vo, d, ve, mo, M: mo * (D / d) };
}

// ---- the rounds -----------------------------------------------------------------------------------------------------------

export type Assist = 0 | 1 | 2;
export interface MagRound {
  f: number;
  /** The object distance that puts the image at the near point (exact), and its linear and angular magnification. */
  uSol: number;
  m: number;
  assist: Assist;
}
export interface ScopeRound {
  fo: number;
  fe: number;
  /** The total magnification wanted, with the image at the near point. */
  M: number;
  /** The settings that give it: object distance and tube length (exact). */
  uSol: number;
  LSol: number;
  /** Which exercise this round is. */
  exercise: string;
  assist: Assist;
}
export type Game =
  | { kind: 'mag'; hero: Hero; rounds: MagRound[]; charges: number[] }
  | { kind: 'scope'; hero: Hero; rounds: ScopeRound[]; charges: number[] };

/** Focal lengths whose near-point object distance is a unique multiple of 0.1 cm. */
const MAG_F = [5, 8, 9, 10, 12, 15, 20];
/** [fo, fe, M, exercise]: Ex 9.11(a), Ex 9.12 and Ex 9.26. */
const SCOPE: [number, number, number, string][] = [[2, 6.25, 20, 'Exercise 9.11(a)'], [0.8, 2.5, 88, 'Exercise 9.12'], [1.25, 5, 30, 'Exercise 9.26']];

export const SLIDERS = {
  mag: { min: 1, step: 0.1 },
  uo: { min: 0.5, max: 4, step: 0.1, start: 1 },
  L: { min: 5, max: 20, step: 0.1, start: 10 },
};

/** Exact settings for total magnification M with the final image at the near point. */
export function scopeSolution(fo: number, fe: number, M: number): { uSol: number; LSol: number; mo: number } {
  const mo = M / (1 + D / fe);
  const uSol = fo * (1 + 1 / mo);
  const LSol = mo * uSol + nearPointU(fe);
  return { uSol, LSol, mo };
}

export function buildGame(level: number, random: () => number): Game {
  const assist = (k: number) => k as Assist;
  if (level === 1) {
    const fs = shuffle(MAG_F, random).slice(0, 3).sort((a, b) => a - b);
    return {
      kind: 'mag',
      hero: {
        name: 'Mite',
        role: 'a tiny bug on a card, waiting for its photo',
        story: `Mite is too small to see. A magnifying glass makes a virtual image of it, but your eye can only focus on an image at least ${D} cm away, so the picture is sharp only when the image sits at that near point or farther. The closer the image, the sharper it is not, and the bigger it looks.`,
        objective: 'Slide Mite to the spot where the picture is as big as it can be while still sharp, in three rounds. A test shot costs a charge; the live eye view fades.',
      },
      rounds: fs.map((f, k) => ({ f, uSol: nearPointU(f), m: 1 + D / f, assist: assist(k) })),
      charges: [1, 1, 1],
    };
  }
  return {
    kind: 'scope',
    hero: {
      name: 'Spec',
      role: 'a speck on a slide, under a two-lens microscope',
      story: 'The objective makes a real, enlarged image of Spec inside the tube, and the eyepiece acts as a magnifier on that image. Two dials set the picture: how far Spec is from the objective, and how far apart the lenses are. Only one pair of settings gives the total magnification you want with the final image at the near point, where the eye is relaxed enough to see sharply.',
      objective: 'Crack both dials so the microscope gives the wanted magnification with a sharp picture, in three rounds. A test shot costs a charge; the live readout fades.',
    },
    rounds: SCOPE.map(([fo, fe, M, exercise], k) => ({ fo, fe, M, ...scopeSolution(fo, fe, M), exercise, assist: assist(k) })),
    charges: [1, 1, 1],
  };
}

// ---- judging --------------------------------------------------------------------------------------------------------------

export const magRange = (f: number) => ({ min: SLIDERS.mag.min, max: Math.round((f - 0.1) * 10) / 10 });
export function judgeMag(r: MagRound, u: number): { ok: boolean; v: number | null; sharp: boolean } {
  const o = magnifier(r.f, u);
  return { ok: Math.abs(u - r.uSol) <= 0.05, v: o.kind === 'virtual' ? o.v : null, sharp: o.kind === 'virtual' ? eyeSees(o.v) : o.kind === 'infinity' };
}
export function judgeScope(r: ScopeRound, uo: number, L: number): { ok: boolean; uOk: boolean; lOk: boolean } {
  const uOk = Math.abs(uo - r.uSol) <= 0.05;
  const lOk = Math.abs(L - r.LSol) <= 0.05;
  return { ok: uOk && lOk, uOk, lOk };
}

/** A test shot in words. */
export function magReading(f: number, u: number): string {
  const o = magnifier(f, u);
  if (o.kind === 'real') return `At ${fmt(u)} cm the lens makes a real image: you cannot look through it as a magnifier.`;
  if (o.kind === 'infinity') return `At ${fmt(u)} cm the image is at infinity: relaxed, but only ${fmt(o.M)}× big.`;
  return `At ${fmt(u)} cm the virtual image is ${fmt(o.v)} cm away, ${fmt(o.m)} times the size${eyeSees(o.v) ? '' : ', but nearer than your eye can focus'}.`;
}
export function scopeReading(r: ScopeRound, uo: number, L: number): string {
  const c = compound(r.fo, r.fe, L, uo);
  if (c.vo === null) return 'The object is inside the objective’s focal length: no real image forms in the tube.';
  if (c.M === null || c.ve === null) return c.d !== null && c.d <= 0 ? 'The first image forms beyond the eyepiece: the eyepiece cannot act as a magnifier.' : 'The first image is outside the eyepiece’s focal length: the eyepiece makes a real image, not a magnified virtual one.';
  return `Final image ${Number.isFinite(c.ve) ? `${fmt(c.ve)} cm` : 'at infinity'} from the eyepiece${eyeSees(c.ve) ? '' : ' (too near to focus)'}, total magnification ${fmt(c.M)}×.`;
}

export function explainRound(g: Game, k: number): string[] {
  if (g.kind === 'mag') {
    const r = g.rounds[k];
    return [
      `For the image at the near point, v = −${D} cm: 1/u = 1/v − 1/f gives u = fD/(f + D) = ${r.f} × ${D}/(${r.f} + ${D}) = ${fmt(r.uSol)} cm.`,
      `The linear magnification is m = |v|/u = 1 + D/f = ${fmt(r.m)}, and here it equals the magnifying power, because the image is at the near point (Exercise 9.23).`,
    ];
  }
  const r = g.rounds[k];
  return [
    `Image at the near point: the eyepiece gives 1 + D/f_e = ${fmt(1 + D / r.fe)}, so the objective must magnify m_o = ${r.M}/${fmt(1 + D / r.fe)} = ${fmt(r.M / (1 + D / r.fe))}. From the objective, u_o = f_o(1 + 1/m_o) = ${fmt(r.uSol)} cm.`,
    `Its image is v_o = m_o u_o, and the eyepiece sits ${fmt(nearPointU(r.fe))} cm in front of it (u_e = f_eD/(f_e + D)), so L = v_o + u_e = ${fmt(r.LSol)} cm (${r.exercise}).`,
  ];
}
export function resultLine(g: Game, k: number): string {
  if (g.kind === 'mag') return `Sharp and ${fmt(g.rounds[k].m)}× bigger: the image sits at the near point.`;
  return `Total magnification ${g.rounds[k].M}× with the image at the near point (${g.rounds[k].exercise}).`;
}
/** After a miss: the effect of what the player chose, never the right answer. */
export function missText(g: Game, k: number, tried: { u: number; L?: number }): string {
  if (g.kind === 'mag') {
    const r = g.rounds[k];
    const o = magnifier(r.f, tried.u);
    if (o.kind === 'real') return 'Mite is outside the focal length: the lens makes a real image, so there is nothing to look at.';
    if (o.kind === 'infinity') return 'The image is at infinity: relaxed and sharp, but Mite could be bigger.';
    return eyeSees(o.v) ? `Sharp, but only ${fmt(o.m)}× big: Mite could be bigger and still sharp.` : `The image is only ${fmt(o.v)} cm away, nearer than the eye can focus: it is a blur.`;
  }
  const r = g.rounds[k];
  const c = compound(r.fo, r.fe, tried.L ?? 10, tried.u);
  if (c.M === null || c.ve === null) return 'No clear picture forms with those settings.';
  return `With those settings the picture is ${fmt(c.M)}× and its image is ${Number.isFinite(c.ve) ? `${fmt(c.ve)} cm` : 'at infinity'} away${eyeSees(c.ve) ? '' : ', too near to focus'}: not the picture the lab wants.`;
}
