// Rules for "Pebble in Orbit" (Section 5.2.3, 5.2.4; Examples 5.1(b), 5.2; Ex 5.1, 5.2, 5.4, 5.5, 5.6): a student satellite steers with a magnet rod or a coil against Earth's
// field. Pure functions only: no DOM, no canvas, no Math.random (randomness comes from the `random` argument).
import { aid } from '@core/dialgame';
import { fmt, sgn } from '@core/judge';
import { pick } from '@core/quiz';

export const rad = (deg: number) => (deg * Math.PI) / 180;
export const ARROW = ['→', '↑', '←', '↓'] as const; // quarter turns, anticlockwise on screen from →

/** Level 1: B in µT, th the angle between m and B, tau the needed torque in µN m, m the answer in J/T. */
export interface SpinRow { b: number; th: number; tau: number; m: number }
/** Level 2: phi the field direction on screen, rod 0 or 180 (N end on or opposite the camera), the plan, m (J/T) and b (µT) for the readout. The answer is the heading. */
export interface ParkRow { phi: number; rod: 0 | 180; goal: 'stable' | 'unstable'; m: number; b: number }
/** Level 3: the target angle from the field, B (µT), the kick's energy W (µJ), the answer m (J/T). */
export interface SwingRow { target: 90 | 180; b: number; w: number; m: number }
/** Level 4: n turns of a cm² each, B (µT), th (degrees), uniform field or next to the station, tau (µN m), the answer i (mA). */
export interface CoilRow { n: number; a: number; b: number; th: number; uniform: boolean; tau: number; i: number }
/** Level 5: pDir is Pebble's moment as a quarter turn; the plan; which port the plan names. The answer is a port and a direction. */
export interface DockRow { pDir: 0 | 1 | 2 | 3; goal: 'stable' | 'unstable' | 'lowest'; port: 'nose' | 'side' | 'any' }

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'spin'; assist: Assist } & SpinRow)
  | ({ kind: 'park'; assist: Assist } & ParkRow)
  | ({ kind: 'swing'; assist: Assist } & SwingRow)
  | ({ kind: 'coil'; assist: Assist } & CoilRow)
  | ({ kind: 'dock'; assist: Assist } & DockRow);

// The pools, copied from the brief (checked by script on 2026-10-31).
export const SPIN: SpinRow[][] = [
  [{ b: 30, th: 30, tau: 24, m: 1.6 }, { b: 40, th: 30, tau: 24, m: 1.2 }, { b: 50, th: 30, tau: 20, m: 0.8 }, { b: 25, th: 30, tau: 30, m: 2.4 }],
  [{ b: 40, th: 60, tau: 48.5, m: 1.4 }, { b: 30, th: 60, tau: 52, m: 2.0 }, { b: 50, th: 60, tau: 43.3, m: 1.0 }, { b: 20, th: 60, tau: 45, m: 2.6 }],
  [{ b: 40, th: 45, tau: 84.9, m: 3.0 }, { b: 25, th: 45, tau: 31.8, m: 1.8 }, { b: 50, th: 45, tau: 77.8, m: 2.2 }, { b: 30, th: 45, tau: 12.7, m: 0.6 }],
];

// Answers (heading h): r1 45, 165, 255, 300; r2 15, 120, 195, 330; r3 75, 150, 240, 285.
export const PARK: ParkRow[][] = [
  [{ phi: 45, rod: 0, goal: 'stable', m: 0.8, b: 30 }, { phi: 165, rod: 0, goal: 'stable', m: 1.2, b: 40 }, { phi: 255, rod: 0, goal: 'stable', m: 0.6, b: 50 }, { phi: 300, rod: 0, goal: 'stable', m: 1.0, b: 30 }],
  [{ phi: 195, rod: 0, goal: 'unstable', m: 0.8, b: 40 }, { phi: 300, rod: 0, goal: 'unstable', m: 0.6, b: 30 }, { phi: 15, rod: 0, goal: 'unstable', m: 1.2, b: 50 }, { phi: 150, rod: 0, goal: 'unstable', m: 1.0, b: 40 }],
  [{ phi: 255, rod: 180, goal: 'stable', m: 0.8, b: 50 }, { phi: 330, rod: 180, goal: 'stable', m: 1.2, b: 30 }, { phi: 60, rod: 180, goal: 'stable', m: 0.6, b: 40 }, { phi: 105, rod: 180, goal: 'stable', m: 1.0, b: 50 }],
];

export const SWING: SwingRow[][] = [
  [{ target: 90, b: 30, w: 36, m: 1.2 }, { target: 90, b: 40, w: 64, m: 1.6 }, { target: 90, b: 25, w: 70, m: 2.8 }, { target: 90, b: 50, w: 40, m: 0.8 }],
  [{ target: 180, b: 30, w: 84, m: 1.4 }, { target: 180, b: 40, w: 48, m: 0.6 }, { target: 180, b: 20, w: 88, m: 2.2 }, { target: 180, b: 50, w: 100, m: 1.0 }],
  [{ target: 180, b: 25, w: 150, m: 3.0 }, { target: 90, b: 20, w: 68, m: 3.4 }, { target: 90, b: 45, w: 90, m: 2.0 }, { target: 180, b: 35, w: 126, m: 1.8 }],
];

export const COIL: CoilRow[][] = [
  [{ n: 500, a: 80, b: 40, th: 30, uniform: true, tau: 16, i: 200 }, { n: 400, a: 50, b: 30, th: 90, uniform: true, tau: 18, i: 300 },
   { n: 250, a: 100, b: 50, th: 30, uniform: true, tau: 22.5, i: 360 }, { n: 800, a: 25, b: 40, th: 60, uniform: true, tau: 9.7, i: 140 }],
  [{ n: 600, a: 40, b: 60, th: 30, uniform: false, tau: 18.7, i: 260 }, { n: 300, a: 60, b: 50, th: 60, uniform: false, tau: 31.2, i: 400 },
   { n: 1000, a: 20, b: 80, th: 30, uniform: false, tau: 14.4, i: 180 }, { n: 450, a: 80, b: 40, th: 90, uniform: false, tau: 17.3, i: 120 }],
  [{ n: 1200, a: 30, b: 45, th: 30, uniform: true, tau: 17.8, i: 220 }, { n: 700, a: 50, b: 35, th: 60, uniform: false, tau: 36.1, i: 340 },
   { n: 350, a: 70, b: 55, th: 90, uniform: true, tau: 62, i: 460 }, { n: 900, a: 35, b: 30, th: 30, uniform: false, tau: 23.6, i: 500 }],
];

// Answers (port, q): r1 side with q = pDir + 2; r2 nose with q = pDir + 2; r3 nose with q = pDir.
export const DOCK: DockRow[][] = [
  [{ pDir: 0, goal: 'stable', port: 'side' }, { pDir: 1, goal: 'stable', port: 'side' }, { pDir: 2, goal: 'stable', port: 'side' }, { pDir: 3, goal: 'stable', port: 'side' }],
  [{ pDir: 0, goal: 'unstable', port: 'nose' }, { pDir: 1, goal: 'unstable', port: 'nose' }],
  [{ pDir: 0, goal: 'lowest', port: 'any' }, { pDir: 1, goal: 'lowest', port: 'any' }],
];

export const DIAL = {
  m: { min: 0.2, max: 4, step: 0.2, start: 0.2 }, // levels 1 and 3, J/T
  h: { min: 0, max: 345, step: 15, start: 90 }, // level 2, degrees
  i: { min: 20, max: 600, step: 20, start: 20 }, // level 4, mA
  thr: { min: 0, max: 1, start: 0 }, // level 4: 0 off, 1 on
  port: { min: 0, max: 1, start: 0 }, // level 5: 0 nose, 1 side
  q: { min: 0, max: 3 }, // level 5: start (pDir + 1) % 4, always across the field
};
export const VERDICT = { spin: 1.0, park: 1.7, swing: 1.3, coil: 1.3, dock: 1.6 } as const;
/** Every miss effect takes one of these fixed sizes, never a size proportional to the error. */
export const FIXED = { spinLeft: 0.4, swingOff: 25, tip: 60, wobble: 8, short: 0.6, over: 0.3, drift: 40, loose: 30 } as const;

const mod = (x: number, n: number) => ((x % n) + n) % n;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const clean = (x: number) => (Math.abs(x) < 1e-9 ? 0 : x);

export const spinTau = (r: SpinRow, m: number) => m * r.b * Math.sin(rad(r.th));
/** Level 2: the angle (0 to 345) from the field to the rod's N end for heading h. */
export const parkTheta = (r: ParkRow, h: number) => mod(h + r.rod - r.phi, 360);
export const parkAnswer = (r: ParkRow) => mod(r.phi - r.rod + (r.goal === 'unstable' ? 180 : 0), 360);
/** Level 2: τ (µN m, never negative) and U (µJ) at the angle th. `clean` stops sin 180° = 1.2e-16 printing as 1.47 × 10⁻¹⁵. */
export const parkTau = (r: ParkRow, th: number) => clean(Math.abs(r.m * r.b * Math.sin(rad(th))));
export const parkU = (r: ParkRow, th: number) => clean(-r.m * r.b * Math.cos(rad(th)));
/** Level 3: where the kick brings Pebble to rest, in degrees from the field, or Infinity if it tumbles right over. */
export function stopAt(r: SwingRow, m: number) {
  const c = 1 - r.w / (m * r.b);
  if (c < -1 - 1e-9) return Infinity;
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}
export const coilM = (r: CoilRow, i: number) => r.n * (i / 1000) * r.a * 1e-4; // J/T
export const coilTau = (r: CoilRow, i: number) => coilM(r, i) * r.b * Math.sin(rad(r.th)); // µN m
/** Level 5: the direction (quarter turn) of Pebble's field at a port: along Pebble at the nose, against it at the side. */
export const fieldAt = (r: DockRow, port: number) => (port === 0 ? r.pDir : mod(r.pDir + 2, 4));
/** Level 5: Grit's energy in units of k = μ₀m²/4πr³: −2 or +2 at the nose, −1 or +1 at the side, 0 across the field. */
export function dockU(r: DockRow, port: number, q: number) {
  const rel = mod(q - fieldAt(r, port), 4);
  const size = port === 0 ? 2 : 1;
  return rel === 0 ? -size : rel === 2 ? size : 0;
}
export const dockAnswer = (r: DockRow) =>
  r.goal === 'stable' ? { port: 1, q: mod(r.pDir + 2, 4) } : r.goal === 'unstable' ? { port: 0, q: mod(r.pDir + 2, 4) } : { port: 0, q: r.pDir };

export function buildRounds(level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] {
  const pools = [SPIN, PARK, SWING, COIL, DOCK][level - 1] as unknown[][];
  const kind = (['spin', 'park', 'swing', 'coil', 'dock'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'low' | 'high' | 'swing' | 'flip' | 'steady' | 'short' | 'over' | 'drift' | 'pulled' | 'closed' | 'torque' | 'loose';
export type Values = { m?: number; h?: number; i?: number; thr?: number; port?: number; q?: number };

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'spin':
      return near(x.m!, r.m) ? null : x.m! < r.m ? 'low' : 'high';
    case 'park': {
      const th = parkTheta(r, x.h!);
      if (th !== 0 && th !== 180) return 'swing';
      if (r.goal === 'stable') return th === 0 ? null : 'flip';
      return th === 180 ? null : 'steady';
    }
    case 'swing':
      return near(x.m!, r.m) ? null : x.m! > r.m ? 'short' : 'over';
    case 'coil': {
      const thrNeeded = r.uniform ? 0 : 1;
      if (x.thr !== thrNeeded) return r.uniform ? 'drift' : 'pulled';
      return x.i === r.i ? null : x.i! < r.i ? 'short' : 'over';
    }
    case 'dock': {
      const port = x.port!;
      if ((r.port === 'nose' && port !== 0) || (r.port === 'side' && port !== 1)) return 'closed';
      const u = dockU(r, port, x.q!);
      if (u === 0) return 'torque';
      if (r.goal === 'stable') return u < 0 ? null : 'flip';
      if (r.goal === 'unstable') return u > 0 ? null : 'steady';
      if (u > 0) return 'flip';
      return port === 0 ? null : 'loose';
    }
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;

// ---- scene helpers (pure; the art and the tests use them) -------------------------------------------------------------------------------------------------

export const FIELD1 = [15, 195, 340] as const; // level 1: field direction per round (degrees anticlockwise from →)
export const FIELD3 = { 90: [-100, 110, -125], 180: [20, -30, 40] } as const; // level 3: per target and round (puts the guide star clear of the HUD)
export const FIELD4 = { uniform: [150, 210, 170], station: 20 } as const; // level 4: per round; next to the station 20° (toward the docking magnet)

/** The field's direction on screen for round k (level 5 has no external field: 0). */
export function fieldDeg(r: Round, k: number): number {
  switch (r.kind) {
    case 'spin': return FIELD1[k];
    case 'park': return r.phi;
    case 'swing': return FIELD3[r.target][k];
    case 'coil': return r.uniform ? FIELD4.uniform[k] : FIELD4.station;
    case 'dock': return 0;
  }
}
/** Where Pebble's moment points when the round starts, or (level 2) for the heading v.h. */
export const startHeading = (r: Round, k: number, v: Values) =>
  r.kind === 'spin' || r.kind === 'coil' ? fieldDeg(r, k) + r.th : r.kind === 'park' ? v.h! : r.kind === 'swing' ? fieldDeg(r, k) : r.pDir * 90;
/** The guide star's direction (levels 3 and 4). */
export const starDeg = (r: Round, k: number) => (r.kind === 'swing' ? fieldDeg(r, k) + r.target : fieldDeg(r, k));

/** The one winning setting of a round, and the dial values it starts on. */
export function answerOf(r: Round): Values {
  switch (r.kind) {
    case 'spin':
    case 'swing': return { m: r.m };
    case 'park': return { h: parkAnswer(r) };
    case 'coil': return { i: r.i, thr: r.uniform ? 0 : 1 };
    case 'dock': return dockAnswer(r);
  }
}
export function startOf(r: Round): Values {
  switch (r.kind) {
    case 'spin':
    case 'swing': return { m: DIAL.m.start };
    case 'park': return { h: DIAL.h.start };
    case 'coil': return { i: DIAL.i.start, thr: DIAL.thr.start };
    case 'dock': return { port: DIAL.port.start, q: (r.pDir + 1) % 4 };
  }
}

/** Level 1: the tumble. Pebble spins at TUMBLE.rate °/s until the burn; the burn lasts TUMBLE.ramp s and leaves the spin at `end` times the old rate. */
export const TUMBLE = { rate: 120, turn: 0.3, ramp: 0.5 } as const;
export const SPIN_END = { win: 0, low: FIXED.spinLeft, high: -FIXED.spinLeft } as const;
/** Spin angle in units of TUMBLE.rate, s seconds after the burn begins: the integral of 1 + (end − 1) · smooth(σ / ramp). */
export function spinG(end: number, s: number): number {
  const u = Math.max(0, s) / TUMBLE.ramp;
  const is = u <= 1 ? (u - Math.sin(Math.PI * u) / Math.PI) / 2 : 0.5 + (u - 1); // ∫ smooth, smooth(u) = (1 − cos πu)/2
  return Math.max(0, s) + (end - 1) * TUMBLE.ramp * is;
}

export type Outcome = 'win' | Fault;
export const outcomeOf = (r: Round, x: Values): Outcome => fault(r, x) ?? 'win';
/** Seconds into the take at which the verdict lands (hearts, score, text). */
export function verdictAt(r: Round, x: Values): number {
  const o = outcomeOf(r, x);
  switch (r.kind) {
    case 'spin': return o === 'win' ? 1.0 : o === 'low' ? 1.1 : 1.2;
    case 'park': return o === 'swing' ? 1.0 : o === 'flip' ? 1.6 : 1.5;
    case 'swing': return o === 'win' ? 1.1 : o === 'short' ? 1.4 : 1.2;
    case 'coil': return o === 'drift' ? 1.0 : o === 'pulled' ? 0.95 : o === 'win' ? 1.1 : o === 'short' ? 1.4 : 1.2;
    case 'dock': return o === 'closed' ? 1.0 : o === 'torque' ? 1.3 : o === 'flip' ? 1.6 : 1.5;
  }
}

// ---- words ------------------------------------------------------------------------------------------------------------------------------------------------

/** The angle between m and B folded into 0 to 180. */
export const angleOf = (th: number) => (th <= 180 ? th : 360 - th);
/** Grit's energy in units of k: −2k, −k, 0, +k, +2k (a true minus sign). */
export const kText = (u: number) => (u === 0 ? '0' : `${u < 0 ? '−' : '+'}${Math.abs(u) === 2 ? '2' : ''}k`);

export const TLM_OFF = '— — —';

/** The one-line goal on the canvas (at most 44 characters). */
export function goalText(r: Round): string {
  switch (r.kind) {
    case 'spin': return `Stop the spin: burn ${r.tau} µN m`;
    case 'park': return r.goal === 'stable' ? 'Park Pebble so a bump can’t tip it' : 'Park Pebble balanced, ready to flip';
    case 'swing': return `Coast to ${r.target}° on one ${r.w} µJ kick`;
    case 'coil': return `Turn to the star: burn ${r.tau} µN m`;
    case 'dock': return r.goal === 'stable' ? 'Dock Grit at the side port, stable' : r.goal === 'unstable' ? 'Dock Grit at the nose port, ready to flip' : 'Dock Grit with the lowest energy';
  }
}

export function intel(r: Round): string {
  switch (r.kind) {
    case 'spin': return `Pebble is tumbling. The rod fires when it is at ${r.th}° to Earth’s ${r.b} µT field, and the burn must give a torque of ${r.tau} µN m to stop the spin.`;
    case 'park': return `The rod is ${r.m} J/T in a ${r.b} µT field, with its N end ${r.rod === 0 ? 'on the camera side' : 'opposite the camera'}. In the eclipse only the field holds Pebble. ${r.goal === 'stable' ? 'It must ride out a bump from a speck of dust.' : 'It must sit torque-free at its highest energy, ready to flip on command.'}`;
    case 'swing': return `Pebble starts with its rod along Earth’s ${r.b} µT field. One reaction-wheel kick gives it ${r.w} µJ, and it must come to rest at ${r.target}° from the field, on the guide star.`;
    case 'coil': return `The coil has ${r.n} turns of ${r.a} cm² each, at ${r.th}° to a ${r.b} µT field ${r.uniform ? 'that is uniform out here' : 'next to the station’s docking magnet, where it is far from uniform'}. The turn needs ${r.tau} µN m.`;
    case 'dock': return `Pebble points ${ARROW[r.pDir]}. ${r.goal === 'stable' ? 'Grit docks at the side port and must stay put when bumped.' : r.goal === 'unstable' ? 'Grit docks at the nose port, torque-free but ready to spring away on a nudge.' : 'Grit may use either port: the plan wants the lowest energy, the tightest dock of all.'}`;
  }
}

export const hintText = (r: Round) =>
  `${intel(r)} ${r.assist === 0 ? 'Round 1: telemetry is live.' : r.assist === 1 ? 'Telemetry is off: a check costs a charge.' : 'Boss pass: no telemetry.'}`;

/** What the player's setting did and what to change, never the answer. */
export function missText(r: Round, x: Values): string {
  const f = fault(r, x);
  switch (f) {
    case 'low': return `With m = ${x.m} J/T the burn’s torque was too small: Pebble is still spinning the same way. Use a stronger rod.`;
    case 'high': return `With m = ${x.m} J/T the burn’s torque was too big: Pebble now spins the other way. Use a weaker rod.`;
    case 'swing': return `At ${x.h}° the rod was at an angle to the field, so the torque mB sin θ swung Pebble away. Park where the torque is zero.`;
    case 'flip': return r.kind === 'park'
      ? `At ${x.h}° the torque was zero, but the rod’s N end pointed against the field: the bump tipped Pebble over. That balance is unstable.`
      : 'Grit was torque-free but pointed against Pebble’s field there: the bump flipped it over. That is unstable.';
    case 'steady': return r.kind === 'park'
      ? `At ${x.h}° Pebble was torque-free but at its lowest energy, so on the command it only wobbled back. The plan needs the torque-free heading with the highest energy.`
      : 'Grit was torque-free and stable there, so on the release it only wobbled. The plan needs the torque-free way with the higher energy.';
    case 'short': return r.kind === 'swing'
      ? `With m = ${x.m} J/T the field soaked up the kick too soon: Pebble stopped short of ${(r as Extract<Round, { kind: 'swing' }>).target}° and swung back. Use a weaker rod.`
      : `${x.i} mA gave the coil too small a moment: Pebble stopped short of the guide star. More current.`;
    case 'over': return r.kind === 'swing'
      ? `With m = ${x.m} J/T the kick had energy to spare: Pebble went past ${(r as Extract<Round, { kind: 'swing' }>).target}°${(r as Extract<Round, { kind: 'swing' }>).target === 180 ? ' and tumbled right over' : ''}. Use a stronger rod.`
      : `${x.i} mA gave the coil too big a moment: Pebble swung past the guide star. Less current.`;
    case 'drift': return 'In a uniform field the forces on the coil cancel, so there was nothing to hold against: the thruster pushed Pebble out of its slot. Out here it needs no thrust.';
    case 'pulled': return 'Next to the docking magnet the field is not uniform, so it pulled on the coil and Pebble clanked into the truss. Hold the slot with the thruster.';
    case 'closed': return 'That port’s hatch was shut, and Grit bounced off it. Dock at the port the plan names.';
    case 'torque': return 'Grit pointed across Pebble’s field at that port, so a torque turned it: not in equilibrium. Line Grit up with the field there.';
    case 'loose': return 'Grit was stable at the side port, but Pebble’s field there is only half as strong, and the pull test tugged it loose. Find the deeper energy.';
    default: return '';
  }
}

/** The numbers the round-2 helper and the live telemetry show: the angle from the field, τ and U. */
function parkNumbers(r: ParkRow, h: number) {
  const th = parkTheta(r, h);
  return { th, angle: angleOf(th), tau: fmt(parkTau(r, th)), u: sgn(parkU(r, th)) };
}

/** The paid check. */
export function checkText(r: Round, x: Values): string {
  switch (r.kind) {
    case 'spin': return `Check: m = ${x.m} J/T at ${r.th}° gives τ = ${fmt(spinTau(r, x.m!))} µN m.`;
    case 'park': {
      const p = parkNumbers(r, x.h!);
      return `Check: at ${x.h}° the rod is ${p.angle}° from the field: τ = ${p.tau} µN m, U = ${p.u} µJ.`;
    }
    case 'swing': {
      const s = stopAt(r, x.m!);
      return `Check: with m = ${x.m} J/T the kick would ${s === Infinity ? 'tumble Pebble right over' : `bring Pebble to rest at ${Math.round(s)}° from the field`}.`;
    }
    case 'coil': return `Check: m = NIA = ${fmt(coilM(r, x.i!))} J/T, so τ = ${fmt(coilTau(r, x.i!))} µN m.`;
    case 'dock': {
      const u = dockU(r, x.port!, x.q!);
      return `Check: at the ${x.port ? 'side' : 'nose'} port Pebble’s field points ${ARROW[fieldAt(r, x.port!)]}. Grit pointing ${ARROW[x.q!]} has U = ${kText(u)}${u === 0 ? ' and a torque on it' : ' and no torque'}.`;
    }
  }
}

/** The live telemetry box (at most 28 characters). */
export function tlmText(r: Round, v: Values): string {
  switch (r.kind) {
    case 'spin': return `τ ${fmt(spinTau(r, v.m!))} µN m`;
    case 'park': {
      const p = parkNumbers(r, v.h!);
      return `θ ${p.angle}° · τ ${p.tau} · U ${p.u}`;
    }
    case 'swing': {
      const s = stopAt(r, v.m!);
      return s === Infinity ? 'tumbles over' : `rests at ${Math.round(s)}°`;
    }
    case 'coil': return `m ${fmt(coilM(r, v.i!))} · τ ${fmt(coilTau(r, v.i!))} µN m`;
    case 'dock': {
      const u = dockU(r, v.port!, v.q!);
      return `U ${kText(u)} · τ ${u === 0 ? '≠ 0' : '0'}`;
    }
  }
}

export function winText(r: Round): string {
  switch (r.kind) {
    case 'spin': return `Spin stopped! τ = mB sin θ, so m = τ/(B sin θ) = ${r.tau} ÷ (${r.b} × sin ${r.th}°) = ${r.m} J/T. The torque is largest at right angles to the field and zero along it.`;
    case 'park': return r.goal === 'stable'
      ? `Parked! The torque mB sin θ is zero at 0° and at 180°. With the N end along the field, U = −mB = −${fmt(r.m * r.b)} µJ, the lowest, so a bump only makes Pebble wobble back; at 180° U = +${fmt(r.m * r.b)} µJ and a bump tips it over.`
      : `Balanced! With the N end against the field, θ = 180°: no torque, but U = +mB = +${fmt(r.m * r.b)} µJ, the highest, so the gentlest nudge flips it, as planned. Along the field U = −mB is the stable one.`;
    case 'swing': return r.target === 90
      ? `Locked on! Turning from along the field to 90° costs W = U(90°) − U(0°) = 0 − (−mB) = mB, so m = W/B = ${r.w} ÷ ${r.b} = ${r.m} J/T. At 90° the field still pulls back with τ = mB = ${r.w} µN m, so the star lock holds Pebble there.`
      : `Balanced! Turning to 180° costs W = (+mB) − (−mB) = 2mB, so m = W/(2B) = ${r.w} ÷ (2 × ${r.b}) = ${r.m} J/T. At 180° the torque mB sin 180° is zero, though it took work to get there.`;
    case 'coil': return `On the star! m = NIA, so I = τ/(NAB sin θ) = ${r.tau} ÷ (${r.n} × ${r.a} × 10⁻⁴ × ${r.b} × sin ${r.th}°) = ${r.i / 1000} A = ${r.i} mA. ${r.uniform ? 'In a uniform field the forces on the coil cancel: a torque but no net force.' : 'Next to the magnet the field is not uniform, so there is a net force as well, and the thruster held Pebble in its slot.'}`;
    case 'dock': return r.goal === 'stable'
      ? `Docked! At the side port Pebble’s field is k and points opposite to Pebble (${ARROW[fieldAt(r, 1)]}), so Grit pointing ${ARROW[dockAnswer(r).q]} lines up with it: U = −m·B = −k, stable.`
      : r.goal === 'unstable'
        ? `Ready to fly! On Pebble’s axis its field is 2k and points the same way as Pebble, so Grit pointing ${ARROW[dockAnswer(r).q]}, against it, is torque-free with U = +2k, the highest: a nudge flips it away.`
        : `Tightest dock! On Pebble’s axis the field is 2k along Pebble, so Grit pointing the same way (${ARROW[r.pDir]}) has U = −2k, the lowest of all; the best at the side port is only −k.`;
  }
}
