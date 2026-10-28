// Pure rules of the Mirror Bench: no DOM, no canvas.
// Cartesian sign convention: distances from the pole, positive along the incident light. For a mirror the object
// is at u < 0, a concave mirror has f < 0 and a convex mirror f > 0, and 1/v + 1/u = 1/f, m = -v/u.
import { pick } from '@core/quiz';
import { fmt, sgn, within } from '@core/judge';

export { starsFor } from '@core/judge';

/** Image distance from the mirror equation (signed). Infinity when the object is at the focus. */
export function imageV(f: number, u: number): number {
  const d = u - f;
  return Math.abs(d) < 1e-9 ? Infinity : (f * u) / d;
}
export const magnify = (u: number, v: number) => -v / u;

export interface LevelFocus {
  kind: 'focus';
  hero: { name: string; role: string; story: string; objective: string };
  /** Focal length magnitude and the object distance in front of the mirror, in cm. */
  F: number;
  d: number;
  objH: number;
  /** Where the real image forms, cm in front of the mirror. */
  screen: number;
  /** Signed image height, negative when inverted. */
  imgH: number;
  freeTests: number;
}
export interface LevelPin {
  kind: 'pin';
  hero: LevelFocus['hero'];
  F: number;
  d: number;
  objH: number;
  /** Where the virtual image seems to be, cm behind the mirror. */
  behind: number;
  imgH: number;
  freeTests: number;
}
export interface LevelShave {
  kind: 'shave';
  hero: LevelFocus['hero'];
  F: number;
  /** The magnification the hero wants. */
  want: number;
  /** The distance that gives it, cm. */
  d: number;
  freeTests: number;
}
export interface LevelSpot {
  kind: 'spot';
  hero: LevelFocus['hero'];
  /** Wall distance in cm and the mirror turn in degrees. */
  L: number;
  theta: number;
  /** Where the spot lands, cm from the undeflected spot. */
  shift: number;
  freeTests: number;
}
export type Level = LevelFocus | LevelPin | LevelShave | LevelSpot;

/** Pairs [|f|, object distance] for a concave mirror, with the object beyond f and clean image distances. */
const REAL: [number, number][] = [[10, 15], [10, 30], [12, 18], [12, 36], [15, 20], [15, 30], [18, 27], [20, 30], [20, 25], [12, 16], [12, 24]];
/** Pairs [f, object distance] for a convex mirror with clean image distances. */
const VIRT: [number, number][] = [[12, 12], [20, 20], [30, 30], [12, 36], [15, 60], [10, 40], [20, 60]];
/** Pairs [|f|, wanted magnification, distance] for a concave mirror held close. */
const SHAVE: [number, number, number][] = [[12, 2, 6], [15, 3, 10], [20, 4, 15], [20, 5, 16], [18, 3, 12], [24, 3, 16], [30, 2, 15], [12, 3, 8]];
/** Pairs [wall distance, mirror turn] for the galvanometer spot. */
const SPOT: [number, number][] = [[150, 3.5], [200, 2.5], [100, 5], [120, 4], [150, 2], [200, 3]];

export const tanDeg = (deg: number) => Math.tan((deg * Math.PI) / 180);

export function buildLevel(level: number, random: () => number): Level {
  if (level === 1) {
    const [F, d] = pick(REAL, random);
    const objH = pick([2, 2.5, 3, 4], random);
    const v = imageV(-F, -d);
    return {
      kind: 'focus',
      hero: {
        name: 'Flicker',
        role: `a ${objH} cm candle flame`,
        story: `Flicker burns ${d} cm in front of a concave mirror whose focal length is ${F} cm. The class wants to see the flame on a screen, and the screen can be set at any distance from the mirror.`,
        objective: 'Put the screen where Flicker’s image is sharp, and say how tall the image is and which way up it stands.',
      },
      F,
      d,
      objH,
      screen: -v,
      imgH: magnify(-d, v) * objH,
      freeTests: 1,
    };
  }
  if (level === 2) {
    const [F, d] = pick(VIRT, random);
    const objH = pick([4, 5, 6, 8], random);
    const v = imageV(F, -d);
    return {
      kind: 'pin',
      hero: {
        name: 'Dash',
        role: 'a toy car reflected in a wing mirror',
        story: `Dash sits ${d} cm from a convex mirror of focal length ${F} cm. A marker pin can be pushed in behind the mirror, and the pin is right only when its tip touches the tip of the image you see.`,
        objective: 'Place the pin tip on the tip of Dash’s image, and say how tall the image is.',
      },
      F,
      d,
      objH,
      behind: v,
      imgH: magnify(-d, v) * objH,
      freeTests: 1,
    };
  }
  if (level === 3) {
    const [F, want, d] = pick(SHAVE, random);
    return {
      kind: 'shave',
      hero: {
        name: 'Zoya’s face',
        role: 'looking into a shaving mirror',
        story: `Zoya wants to see her face upright and ${want} times its size in a concave mirror of focal length ${F} cm. How far from the mirror she holds her face decides what she sees.`,
        objective: `Choose the distance from the mirror that shows an upright image ${want} times as large.`,
      },
      F,
      want,
      d,
      freeTests: 1,
    };
  }
  const [L, theta] = pick(SPOT, random);
  return {
    kind: 'spot',
    hero: {
      name: 'Beam',
      role: 'a spot of light on a galvanometer scale',
      story: `A plane mirror on a galvanometer coil sends Beam back along the way it came, onto a wall ${L} cm away. A current is about to turn the mirror by ${theta}°.`,
      objective: 'Set the light detector on the wall exactly where Beam will land after the mirror turns.',
    },
    L,
    theta,
    shift: L * tanDeg(2 * theta),
    freeTests: 1,
  };
}

/** What the hero actually gets at a held distance d (cm) from a concave mirror: the magnification (signed), or null at the focus. */
export function shaveResult(F: number, d: number): { m: number | null; real: boolean } {
  const v = imageV(-F, -d);
  if (!Number.isFinite(v)) return { m: null, real: false };
  return { m: magnify(-d, v), real: v < 0 };
}

export function judgeFocus(lvl: LevelFocus, screen: number, height: number): { ok: boolean; sOk: boolean; hOk: boolean } {
  const sOk = within(screen, lvl.screen, 0.03);
  const hOk = within(height, lvl.imgH, 0.03);
  return { ok: sOk && hOk, sOk, hOk };
}
export function judgePin(lvl: LevelPin, behind: number, height: number): { ok: boolean; pOk: boolean; hOk: boolean } {
  const pOk = within(behind, lvl.behind, 0.03);
  const hOk = within(height, lvl.imgH, 0.03);
  return { ok: pOk && hOk, pOk, hOk };
}
export function judgeShave(lvl: LevelShave, d: number): { ok: boolean; m: number | null; real: boolean } {
  const r = shaveResult(lvl.F, d);
  return { ok: r.m !== null && !r.real && within(r.m, lvl.want, 0.03), m: r.m, real: r.real };
}
export function judgeSpot(lvl: LevelSpot, shift: number): { ok: boolean } {
  return { ok: within(shift, lvl.shift, 0.03) };
}

export function explainSolution(lvl: Level): string[] {
  if (lvl.kind === 'focus') {
    const v = -lvl.screen;
    return [
      `Concave mirror: f = −${lvl.F} cm, and the flame is at u = −${lvl.d} cm. 1/v = 1/f − 1/u = −1/${lvl.F} + 1/${lvl.d}, so v = ${sgn(v)} cm: the image is real, ${fmt(lvl.screen)} cm in front of the mirror, where the screen must stand.`,
      `m = −v/u = −(${sgn(v)})/(−${lvl.d}) = ${sgn(magnify(-lvl.d, v))}, so the image is ${fmt(Math.abs(lvl.imgH))} cm tall and upside down when m is negative (Exercise 9.1).`,
      'Moving the flame closer to the mirror (but not inside f) moves its image farther away, so the screen must follow.',
    ];
  }
  if (lvl.kind === 'pin') {
    const v = lvl.behind;
    return [
      `Convex mirror: f = +${lvl.F} cm and u = −${lvl.d} cm. 1/v = 1/${lvl.F} + 1/${lvl.d}, so v = +${fmt(v)} cm: the image is virtual, ${fmt(v)} cm behind the mirror, and the pin goes there.`,
      `m = −v/u = ${fmt(v)}/${lvl.d} = ${fmt(magnify(-lvl.d, v))}: upright and smaller, ${fmt(lvl.imgH)} cm tall (Exercise 9.2). A convex mirror always gives a virtual, erect, diminished image between the pole and the focus.`,
    ];
  }
  if (lvl.kind === 'shave') {
    return [
      `For a concave mirror with the object inside f the image is virtual and erect, m = f/(f − u). With f = −${lvl.F} and u = −d: m = ${lvl.F}/(${lvl.F} − d).`,
      `Setting m = ${lvl.want} gives d = ${lvl.F}(1 − 1/${lvl.want}) = ${fmt(lvl.d)} cm, which is less than f, so she is inside the focus (Example 9.3, case ii).`,
    ];
  }
  return [
    `The reflected ray turns twice as much as the mirror: when the mirror turns by θ, the ray turns by 2θ = ${2 * lvl.theta}°.`,
    `The spot moves ${lvl.L} × tan(${2 * lvl.theta}°) = ${fmt(lvl.shift)} cm along the wall (Exercise 9.30).`,
  ];
}
