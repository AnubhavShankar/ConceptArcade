// Pure rules of the Mirror Arcade: no DOM, no canvas.
// Cartesian sign convention: distances from the pole, positive along the incident light. For a mirror the object
// is at u < 0, a concave mirror has f < 0 and a convex mirror f > 0, and 1/v + 1/u = 1/f, m = -v/u.
import { shuffle } from '@core/quiz';
import { fmt, within } from '@core/judge';

/** Image distance from the mirror equation (signed). Infinity when the object is at the focus. */
export function imageV(f: number, u: number): number {
  const d = u - f;
  return Math.abs(d) < 1e-9 ? Infinity : (f * u) / d;
}
export const magnify = (u: number, v: number) => -v / u;
export const tanDeg = (deg: number) => Math.tan((deg * Math.PI) / 180);

export interface Hero {
  name: string;
  role: string;
  story: string;
  objective: string;
}

/** What a mirror makes of an object `d` cm in front of it: where, and of what kind. */
export interface Image {
  kind: 'real' | 'virtual' | 'none';
  /** cm from the mirror: in front for a real image, behind for a virtual one. */
  dist: number;
  /** Signed magnification (negative: upside down). */
  m: number;
}
export function mirrorImage(F: number, concave: boolean, d: number): Image {
  const v = imageV(concave ? -F : F, -d);
  if (!Number.isFinite(v)) return { kind: 'none', dist: Infinity, m: Infinity };
  return { kind: v < 0 ? 'real' : 'virtual', dist: Math.abs(v), m: magnify(-d, v) };
}

export interface WallRound {
  F: number;
  /** Where the wall is, cm in front of the mirror. */
  wall: number;
  /** Where Flicker must stand, cm. */
  uSol: number;
  uStart: number;
}
export interface DriveRound {
  F: number;
  /** The finish line, cm in front of the mirror. */
  line: number;
  /** Where Dash’s image is when he is on the line, cm behind the mirror. */
  behind: number;
}
export interface SelfieRound {
  F: number;
  want: number;
  /** The distance that gives the wanted magnification, cm. */
  d: number;
  /** 0: live image and frame, 1: live image dimmed, 2: the image stays hidden until the snap. */
  assist: 0 | 1 | 2;
}
export interface LaserRound {
  L: number;
  theta: number;
  /** Where the target is, cm above the centre mark. */
  shift: number;
  /** 0: the spot is shown live, 1 and 2: the aim is in the dark. */
  assist: 0 | 1 | 2;
}
export type Game =
  | { kind: 'wall'; hero: Hero; rounds: WallRound[]; charges: number[] }
  | { kind: 'drive'; hero: Hero; rounds: DriveRound[]; charges: number[] }
  | { kind: 'selfie'; hero: Hero; rounds: SelfieRound[]; charges: number[] }
  | { kind: 'laser'; hero: Hero; rounds: LaserRound[]; charges: number[] };

/** Pairs [|f|, object distance] for a concave mirror with the object beyond f and clean image distances. */
const REAL: [number, number][] = [[10, 15], [10, 30], [12, 18], [12, 36], [15, 20], [15, 30], [18, 27], [20, 30], [20, 25], [12, 16], [12, 24]];
/** Pairs [f, finish line] for a convex mirror with clean image distances. */
const VIRT: [number, number][] = [[12, 12], [20, 20], [30, 30], [12, 36], [15, 60], [10, 40], [20, 60]];
/** Pairs [|f|, wanted magnification, distance] for a concave mirror held close. */
const SHAVE: [number, number, number][] = [[12, 2, 6], [15, 3, 10], [20, 4, 15], [20, 5, 16], [18, 3, 12], [24, 3, 16], [30, 2, 15], [12, 3, 8]];
/** Pairs [wall distance, mirror turn] for the galvanometer spot. */
const SPOT: [number, number][] = [[150, 3.5], [200, 2.5], [100, 5], [120, 4], [150, 2], [200, 3]];

export const RAIL_MAX = 100;

export function buildGame(level: number, random: () => number): Game {
  if (level === 1) {
    const pairs = shuffle(REAL, random).slice(0, 3);
    const rounds: WallRound[] = pairs
      .map(([F, uSol]) => {
        const wall = mirrorImage(F, true, uSol).dist;
        const uStart = 3 * F !== uSol && 3 * F <= RAIL_MAX ? 3 * F : 4 * F;
        return { F, wall, uSol, uStart };
      })
      .sort((a, b) => a.wall - b.wall);
    return {
      kind: 'wall',
      hero: {
        name: 'Flicker',
        role: 'a candle flame on a rail',
        story: 'Flicker stands on a rail in front of a concave mirror whose focal length is a secret. A wall stands at a marked distance. Flicker’s flash charges show where the image lands for any spot on the rail.',
        objective: 'Stand Flicker where his image lands sharp on the wall, in all three rounds, without losing your hearts.',
      },
      rounds,
      charges: [2, 1, 1],
    };
  }
  if (level === 2) {
    const pairs = shuffle(VIRT, random).slice(0, 3);
    const rounds: DriveRound[] = pairs.map(([F, line]) => ({ F, line, behind: mirrorImage(F, false, line).dist }));
    return {
      kind: 'drive',
      hero: {
        name: 'Dash',
        role: 'a toy car driving at a convex wing mirror',
        story: 'Dash drives straight at a convex mirror. A catch-bar sits behind the mirror, and the photo-finish shutter fires the instant Dash crosses the line. The bar must be where his image is at that moment.',
        objective: 'Set the catch-bar before Dash starts, so the image of Dash is on it when he crosses the finish line.',
      },
      rounds,
      charges: [0, 0, 0],
    };
  }
  if (level === 3) {
    const picks = shuffle(SHAVE, random).slice(0, 3).sort((a, b) => a[1] - b[1]);
    const rounds: SelfieRound[] = picks.map(([F, want, d], i) => ({ F, want, d, assist: i as 0 | 1 | 2 }));
    return {
      kind: 'selfie',
      hero: {
        name: 'Zoya’s face',
        role: 'in a concave selfie mirror',
        story: 'Zoya wants a selfie in which her face fills a frame several times bigger than her real face, upright. Near the mirror her face is magnified; too far away it flips upside down.',
        objective: 'Hold her face at the distance where the image fits the frame, upright, then snap the photo. The helper aids fade as you go.',
      },
      rounds,
      charges: [0, 0, 0],
    };
  }
  const spots = shuffle(SPOT, random).slice(0, 3);
  const rounds: LaserRound[] = spots.map(([L, theta], i) => ({ L, theta, shift: Math.round(L * tanDeg(2 * theta) * 10) / 10, assist: i as 0 | 1 | 2 }));
  return {
    kind: 'laser',
    hero: {
      name: 'Beam',
      role: 'a laser spot in a shooting gallery',
      story: 'A laser reflects off a small plane mirror on a dial and strikes a target on a wall. Turning the mirror dial moves the spot, but the spot moves in a surprising way.',
      objective: 'Turn the mirror dial to the angle that sends the spot onto the target, then fire. The aim light goes out after the first round.',
    },
    rounds,
    charges: [0, 0, 0],
  };
}

// ---- judging ----------------------------------------------------------------------------------------------------------

export function judgeWall(r: WallRound, u: number): { ok: boolean; image: Image } {
  const image = mirrorImage(r.F, true, u);
  return { ok: image.kind === 'real' && within(image.dist, r.wall, 0.01), image };
}
export function judgeDrive(r: DriveRound, bar: number): { ok: boolean } {
  return { ok: within(bar, r.behind, 0.03) };
}
export function judgeSelfie(r: SelfieRound, d: number): { ok: boolean; image: Image } {
  const image = mirrorImage(r.F, true, d);
  return { ok: image.kind === 'virtual' && within(image.m, r.want, 0.03), image };
}
export function judgeLaser(r: LaserRound, theta: number): { ok: boolean; shift: number } {
  const shift = r.L * tanDeg(2 * theta);
  return { ok: within(shift, r.shift, 0.03), shift };
}

/** After a flash: the reading Flicker’s charge gives, in words. */
export function flashText(u: number, img: Image): string {
  if (img.kind === 'none') return `Flicker at ${u} cm: the rays come back parallel, so no image forms.`;
  return `Flicker at ${u} cm: a ${img.kind} image ${fmt(img.dist)} cm ${img.kind === 'real' ? 'in front of' : 'behind'} the mirror.`;
}

export function explainRound(game: Game, i: number): string[] {
  if (game.kind === 'wall') {
    const r = game.rounds[i];
    return [
      `Mirror: f = −${r.F} cm. For the wall at v = −${fmt(r.wall)} cm: 1/u = 1/f − 1/v = −1/${r.F} + 1/${fmt(r.wall)}, so u = −${r.uSol} cm.`,
      `Flicker stands ${r.uSol} cm from the mirror. Any flash gives f too: f = uv/(u + v) in magnitudes (Exercise 9.1).`,
    ];
  }
  if (game.kind === 'drive') {
    const r = game.rounds[i];
    const m = r.behind / r.line;
    return [
      `Convex mirror: f = +${r.F} cm and u = −${r.line} cm, so 1/v = 1/${r.F} + 1/${r.line} and v = +${fmt(r.behind)} cm: the image is virtual, behind the mirror.`,
      `m = −v/u = ${fmt(m)}: upright and smaller. The image never gets beyond the focus, which is why a convex mirror gives a wide view (Exercise 9.2, Example 9.4).`,
    ];
  }
  if (game.kind === 'selfie') {
    const r = game.rounds[i];
    return [
      `Inside the focus of a concave mirror m = f/(f − u) with f = −${r.F} and u = −d: m = ${r.F}/(${r.F} − d).`,
      `Setting m = ${r.want} gives d = ${r.F}(1 − 1/${r.want}) = ${fmt(r.d)} cm, which is less than f: a virtual, upright, enlarged image (Example 9.3).`,
    ];
  }
  const r = game.rounds[i];
  return [
    `When the mirror turns by θ the reflected ray turns by 2θ. The spot is ${fmt(r.shift)} cm off the centre of a wall ${r.L} cm away, so tan 2θ = ${fmt(r.shift)}/${r.L}.`,
    `2θ = ${fmt(2 * r.theta)}°, so the dial must read θ = ${fmt(r.theta)}° (Exercise 9.30).`,
  ];
}

/** What the player sees after a miss: the effect of what they chose, never the right answer. */
export function missText(game: Game, i: number, tried: number): string {
  if (game.kind === 'wall') {
    const r = game.rounds[i];
    const img = mirrorImage(r.F, true, tried);
    if (img.kind === 'none') return 'At the focus no image forms at all, so the wall stays dark.';
    if (img.kind === 'virtual') return 'The image is virtual, behind the mirror: no wall can catch it, so the wall stays dark.';
    return `The image lands ${fmt(img.dist)} cm from the mirror, not on the wall, so Flicker looks blurred there.`;
  }
  if (game.kind === 'drive') return 'The image of Dash was not on the catch-bar when he crossed the line: the photo shows a gap.';
  if (game.kind === 'selfie') {
    const img = mirrorImage(game.rounds[i].F, true, tried);
    if (img.kind === 'none') return 'At the focus no image forms at all.';
    if (img.kind === 'real') return `Too far: the image is real and upside down, ${fmt(Math.abs(img.m))} times her face.`;
    return `The image is upright and ${fmt(img.m)} times her face: it does not fit the frame.`;
  }
  return 'The spot lands beside the target.';
}

export function resultLine(game: Game, i: number): string {
  if (game.kind === 'wall') return `Sharp! The image lands on the wall ${fmt(game.rounds[i].wall)} cm away.`;
  if (game.kind === 'drive') return `The image is on the bar: ${fmt(game.rounds[i].behind)} cm behind the mirror.`;
  if (game.kind === 'selfie') return `A perfect fit: upright and ${game.rounds[i].want} times as large.`;
  return `Bullseye! The spot lands ${fmt(game.rounds[i].shift)} cm from the centre mark.`;
}
