// Pure rules of "Beam Hall" (Force Lab rebuilt): no DOM, no canvas, no Math.random.
// Five levels of the magnetic force: the push on a beam (F = qv × B), the push on a rod (BIl sin θ), the cyclotron (r = mv/qB, f = qB/2πm),
// a new speed (the lap time does not change), and a helix (width from v sin θ, pitch from v cos θ).
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const Q = 1.6e-19; // C, the charge of a proton or (in size) an electron
export const MP = 1.67e-27; // kg, proton
export const ME = 9.1e-31; // kg, electron
export const G = 9.8; // m/s²
const DEG = Math.PI / 180;

export interface KickRow { pt: 'p' | 'e'; from: 'left' | 'right'; port: 'up' | 'down'; v: number; f: number; out: 0 | 1; b: number }
// v in 10⁶ m/s; f, the push the room needs, in 10⁻¹³ N. Answer: out (1 = field out of the screen) and b (T).
export interface LiftRow { bOut: boolean; t: number; l: number; th: 30 | 90; m: number; cur: 0 | 1; i: number }
// t = B in T; l in cm; th = angle between rod and field; m in g. Answer: cur (1 = left to right) and i (A).
export interface CycRow { v: number; r: number; b: number; f: number }
// v, the speed the plan needs, in 10⁷ m/s; r, the port radius, in cm. Answer: b (T) and f (MHz).
export interface FastRow { b: number; r0: number; k: number; f0: number; r: number }
// Yesterday: port r0 (cm) and RF f0 (MHz) in a b T field. Today the speed is k times. Answer: r (cm) and f = f0.
export interface FocusRow { v: number; th: 30 | 45 | 60; pipe: number; L: number; b: number }
// v in 10⁶ m/s; th, the angle to the axis; pipe, the tube's radius, and L, the screen distance, in cm. Answer: b (G).

export type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'kick'; assist: Assist } & KickRow)
  | ({ kind: 'lift'; assist: Assist } & LiftRow)
  | ({ kind: 'cyc'; assist: Assist } & CycRow)
  | ({ kind: 'speed'; assist: Assist } & FastRow)
  | ({ kind: 'focus'; assist: Assist } & FocusRow);

// ---- the pools (each row was checked by script: one winner, no wrong setting on a tolerance edge, targets that solve back) ----

export const KICK: KickRow[][] = [
  [
    { pt: 'p', from: 'left', port: 'up', v: 5, f: 3.2, out: 0, b: 0.4 }, { pt: 'p', from: 'left', port: 'down', v: 2, f: 1.92, out: 1, b: 0.6 },
    { pt: 'p', from: 'left', port: 'down', v: 4, f: 3.2, out: 1, b: 0.5 }, { pt: 'p', from: 'left', port: 'up', v: 3, f: 3.36, out: 0, b: 0.7 },
  ],
  [
    { pt: 'e', from: 'left', port: 'up', v: 2.5, f: 3.2, out: 1, b: 0.8 }, { pt: 'e', from: 'left', port: 'down', v: 5, f: 9.6, out: 0, b: 1.2 },
    { pt: 'e', from: 'left', port: 'up', v: 4, f: 5.76, out: 1, b: 0.9 }, { pt: 'e', from: 'left', port: 'down', v: 2, f: 4.8, out: 0, b: 1.5 },
  ],
  [
    { pt: 'p', from: 'right', port: 'up', v: 5, f: 8.8, out: 1, b: 1.1 }, { pt: 'e', from: 'right', port: 'up', v: 2.5, f: 5.6, out: 0, b: 1.4 },
    { pt: 'p', from: 'right', port: 'down', v: 2, f: 5.76, out: 0, b: 1.8 }, { pt: 'e', from: 'right', port: 'down', v: 4, f: 1.92, out: 1, b: 0.3 },
  ],
];

export const LIFT: LiftRow[][] = [
  [
    { bOut: false, t: 1.5, l: 20, th: 90, m: 61.2, cur: 1, i: 2.0 }, { bOut: true, t: 1.5, l: 10, th: 90, m: 49, cur: 0, i: 3.2 },
    { bOut: false, t: 1.5, l: 25, th: 90, m: 45.9, cur: 1, i: 1.2 }, { bOut: true, t: 1.5, l: 15, th: 90, m: 59.7, cur: 0, i: 2.6 },
  ],
  [
    { bOut: true, t: 3, l: 20, th: 90, m: 49, cur: 0, i: 0.8 }, { bOut: false, t: 3, l: 10, th: 90, m: 45.9, cur: 1, i: 1.5 },
    { bOut: true, t: 3, l: 12, th: 90, m: 91.8, cur: 0, i: 2.5 }, { bOut: false, t: 3, l: 16, th: 90, m: 88.2, cur: 1, i: 1.8 },
  ],
  [
    { bOut: false, t: 1.5, l: 20, th: 30, m: 64.3, cur: 1, i: 4.2 }, { bOut: true, t: 3, l: 20, th: 30, m: 42.9, cur: 0, i: 1.4 },
    { bOut: false, t: 1.5, l: 16, th: 30, m: 42.9, cur: 1, i: 3.5 }, { bOut: true, t: 3, l: 10, th: 30, m: 45.9, cur: 0, i: 3.0 },
  ],
];

export const CYC: CycRow[][] = [
  [{ v: 2, r: 17.4, b: 1.2, f: 18.3 }, { v: 3, r: 20.9, b: 1.5, f: 22.9 }, { v: 2.4, r: 31.3, b: 0.8, f: 12.2 }, { v: 3.6, r: 18.8, b: 2.0, f: 30.5 }],
  [{ v: 2.5, r: 23.7, b: 1.1, f: 16.8 }, { v: 3.2, r: 25.7, b: 1.3, f: 19.8 }, { v: 4, r: 26.1, b: 1.6, f: 24.4 }, { v: 1.5, r: 22.4, b: 0.7, f: 10.7 }],
  [{ v: 3, r: 16.5, b: 1.9, f: 29.0 }, { v: 2.8, r: 17.2, b: 1.7, f: 25.9 }, { v: 3.5, r: 15.9, b: 2.3, f: 35.1 }, { v: 2.6, r: 30.2, b: 0.9, f: 13.7 }],
];

export const FAST: FastRow[][] = [
  [{ b: 1.2, r0: 15, k: 2, f0: 18.3, r: 30 }, { b: 1.5, r0: 12, k: 2, f0: 22.9, r: 24 }, { b: 0.9, r0: 18, k: 2, f0: 13.7, r: 36 }, { b: 1.6, r0: 14, k: 2, f0: 24.4, r: 28 }],
  [{ b: 1.3, r0: 30, k: 1.5, f0: 19.8, r: 45 }, { b: 1.1, r0: 11, k: 3, f0: 16.8, r: 33 }, { b: 0.8, r0: 14, k: 3, f0: 12.2, r: 42 }, { b: 1.9, r0: 26, k: 1.5, f0: 29.0, r: 39 }],
  [{ b: 2.0, r0: 40, k: 0.5, f0: 30.5, r: 20 }, { b: 1.7, r0: 14, k: 2.5, f0: 25.9, r: 35 }, { b: 1.2, r0: 50, k: 0.5, f0: 18.3, r: 25 }, { b: 1.5, r0: 20, k: 2.5, f0: 22.9, r: 50 }],
];

export const FOCUS: FocusRow[][] = [
  [{ v: 5, th: 30, pipe: 6, L: 22.1, b: 7 }, { v: 6, th: 30, pipe: 5.5, L: 20.6, b: 9 }, { v: 4, th: 30, pipe: 4, L: 15.5, b: 8 }, { v: 3, th: 30, pipe: 4, L: 14.3, b: 6.5 }],
  [{ v: 5, th: 45, pipe: 6, L: 12.6, b: 10 }, { v: 8, th: 45, pipe: 9, L: 19.3, b: 10.5 }, { v: 4.8, th: 45, pipe: 5, L: 10.5, b: 11.5 }, { v: 6, th: 45, pipe: 5.5, L: 11.7, b: 13 }],
  [{ v: 4.8, th: 60, pipe: 7, L: 9.03, b: 9.5 }, { v: 4, th: 60, pipe: 7.5, L: 9.53, b: 7.5 }, { v: 3, th: 60, pipe: 8, L: 9.75, b: 5.5 }, { v: 4.8, th: 60, pipe: 11.5, L: 14.3, b: 6 }],
];

// ---- the dials ----

export const DIAL = {
  out: { min: 0, max: 1, start: 1 }, // L1: 1 = field out of the screen ⊙, 0 = into ⊗
  kb: { min: 0.1, max: 2, step: 0.1, start: 0.1 }, // L1 kicker, T
  cur: { min: 0, max: 1, start: 1 }, // L2: 1 = current left to right →, 0 = right to left ←
  i: { min: 0.1, max: 5, step: 0.1, start: 0.1 }, // L2, A
  cb: { min: 0.5, max: 2.5, step: 0.1, start: 0.5 }, // L3 magnet, T
  f: { min: 8, max: 40, step: 0.1, start: 8 }, // L3 and L4 RF, MHz
  r: { min: 10, max: 80, step: 1, start: 10 }, // L4 port radius, cm
  gb: { min: 1, max: 20, step: 0.5, start: 1 }, // L5 focusing coil, G
};

// ---- the physics ----

const same = (a: number, b: number) => Math.abs(a - b) < 1e-6;
/** L1: the push qvB in units of 10⁻¹³ N (v in 10⁶ m/s, b in T). */
export const push13 = (v: number, b: number) => 1.6 * v * b;
/** L1: true when q v × B points up the screen. v is along ±x, B along ±z, so F_y = −q·v_x·B_z. */
export const pushUp = (pt: 'p' | 'e', from: 'left' | 'right', out: number) => (pt === 'p' ? 1 : -1) * -(from === 'left' ? 1 : -1) * (out ? 1 : -1) > 0;
/** L2: true when I l × B points up. The rod lies along x; the field's z part decides: F_y = −s_x·B_z. */
export const liftUp = (bOut: boolean, cur: number) => -(cur ? 1 : -1) * (bOut ? 1 : -1) > 0;
/** L2: the push on the rod and its weight, both in mN. */
export const liftMN = (r: LiftRow, i: number) => r.t * i * (r.l / 100) * Math.sin(r.th * DEG) * 1000;
export const weightMN = (r: LiftRow) => r.m * G;
/** L3, L4: the lap frequency in MHz, the RF dial value that matches it, and the speed (10⁷ m/s) of a proton leaving radius rCm. */
export const lapMHz = (b: number) => (Q * b) / (2 * Math.PI * MP) / 1e6;
export const rfFor = (b: number) => Math.round(lapMHz(b) * 10) / 10;
export const exitV7 = (b: number, rCm: number) => (Q * b * (rCm / 100)) / MP / 1e7;
/** L5: the helix's full width (2r) and its pitch, both in cm, for a field of bG gauss. */
export const helixWidth = (r: FocusRow, bG: number) => 2 * ((ME * r.v * 1e6 * Math.sin(r.th * DEG)) / (Q * bG * 1e-4)) * 100;
export const helixPitch = (r: FocusRow, bG: number) => ((2 * Math.PI * ME * r.v * 1e6 * Math.cos(r.th * DEG)) / (Q * bG * 1e-4)) * 100;

const POOLS = [KICK, LIFT, CYC, FAST, FOCUS] as unknown[][][];
const KINDS = ['kick', 'lift', 'cyc', 'speed', 'focus'] as const;
/** Three rounds, one row from each pool, with the helper fading (assist 0, 1, 2). It must be the first use of `random` in a level. */
export function buildRounds(level: 1 | 2 | 3 | 4 | 5, random: () => number): Round[] {
  return POOLS[level - 1].map((pool, k) => ({ ...(pick(pool, random) as object), kind: KINDS[level - 1], assist: aid(k) }) as Round);
}

export type Fault = 'wrong' | 'weak' | 'strong' | 'down' | 'sag' | 'jump' | 'slow' | 'fast' | 'shallow' | 'deep' | 'scrape' | 'long' | 'short';
export type Values = { out?: number; b?: number; cur?: number; i?: number; f?: number; r?: number };

/** What the player's setting did, or null for the winning setting. */
export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'kick':
      if (x.out !== r.out) return 'wrong';
      return same(x.b!, r.b) ? null : x.b! < r.b ? 'weak' : 'strong';
    case 'lift':
      if (x.cur !== r.cur) return 'down';
      return same(x.i!, r.i) ? null : x.i! < r.i ? 'sag' : 'jump';
    case 'cyc': {
      const want = rfFor(x.b!);
      if (!same(x.f!, want)) return x.f! < want ? 'slow' : 'fast';
      return same(x.b!, r.b) ? null : x.b! < r.b ? 'shallow' : 'deep';
    }
    case 'speed':
      if (!same(x.f!, r.f0)) return x.f! < r.f0 ? 'slow' : 'fast';
      return same(x.r!, r.r) ? null : x.r! < r.r ? 'shallow' : 'deep';
    case 'focus':
      if (helixWidth(r, x.b!) >= r.pipe) return 'scrape';
      return same(x.b!, r.b) ? null : x.b! < r.b ? 'long' : 'short';
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;

/** Seconds into the run at which the verdict lands (the moment of impact). */
export const verdictDelay = (r: Round, x: Values) =>
  r.kind === 'kick' ? 0.85 : r.kind === 'lift' ? 0.9 : r.kind === 'focus' ? (fault(r, x) === 'scrape' ? 0.6 : 1.05) : fault(r, x) === 'slow' || fault(r, x) === 'fast' ? 0.65 : 1.3;

// ---- words ----

const pName = (r: { pt: 'p' | 'e' }) => (r.pt === 'p' ? 'proton' : 'electron');
const moving = (r: { from: 'left' | 'right' }) => (r.from === 'left' ? 'to the right' : 'to the left');
const room = (r: { port: 'up' | 'down' }) => (r.port === 'up' ? 'Room A' : 'Room B');
const fieldWord = (out: number | undefined) => (out ? 'out of the screen' : 'into the screen');
const curWord = (cur: number | undefined) => (cur ? 'left to right' : 'right to left');

/** The canvas goal line (UX item 1), at most 40 characters. */
export function goal(r: Round): string {
  switch (r.kind) {
    case 'kick': return `Turn the ${pName(r)} beam into ${room(r)}`;
    case 'lift': return `Float the ${r.m} g test rod`;
    case 'cyc': return `Protons out at ${r.v} × 10⁷ m/s`;
    case 'speed': return `New plan: ${r.k} × yesterday’s speed`;
    case 'focus': return `Sharp spot at ${r.L} cm`;
  }
}

/** The round's facts. */
export function intel(r: Round): string {
  switch (r.kind) {
    case 'kick': return `A ${pName(r)} beam moves ${moving(r)} at ${r.v} × 10⁶ m/s. ${room(r)} needs a sideways push of ${r.f} × 10⁻¹³ N.`;
    case 'lift': return `The test rod is ${r.l} cm long and its mass is ${r.m} g. The field is ${r.t} T, ${r.bOut ? 'out of' : 'into'} the screen${r.th === 30 ? ', crossing the rod at 30°' : ', at right angles to the rod'}.`;
    case 'cyc': return `Phil’s plan needs protons at ${r.v} × 10⁷ m/s. The extraction port is ${r.r} cm from the centre.`;
    case 'speed': return `Yesterday: the port at ${r.r0} cm and the RF at ${r.f0} MHz, in a ${r.b} T field. Today’s plan needs ${r.k} times yesterday’s speed, with the same magnet.`;
    case 'focus': return `Electrons leave the gun at ${r.v} × 10⁶ m/s, ${r.th}° to the axis. The tube’s radius is ${r.pipe} cm and the screen is ${r.L} cm from the gun.`;
  }
}

export const hintText = (r: Round) => `${intel(r)} ${r.assist === 0 ? 'Round 1: the beam monitor is live.' : r.assist === 1 ? 'The monitor is off: a monitor check costs a charge.' : 'Last run: no monitor.'}`;

/** What the player's own setting did, then what to change; never the answer. */
export function missText(r: Round, x: Values): string {
  const f = fault(r, x);
  switch (r.kind) {
    case 'kick':
      if (f === 'wrong') return `With the field ${fieldWord(x.out)}, q v × B pushed the ${pName(r)} the other way: the beam bent away from ${room(r)} and hit the wall. Flip the field.`;
      if (f === 'weak') return `At ${x.b} T the push was too weak: the beam bent too little and hit the wall beyond the door. Turn the kicker up.`;
      return `At ${x.b} T the push was too strong: the beam bent too sharply and hit the wall before the door. Turn the kicker down.`;
    case 'lift':
      if (f === 'down') return `With the current ${curWord(x.cur)}, I l × B pushed the rod down and a thread snapped. Reverse the current.`;
      if (f === 'sag') return `At ${x.i} A the push was smaller than the rod’s weight: it stayed hanging on its threads. Use more current.`;
      return `At ${x.i} A the push was bigger than the rod’s weight: it jumped and hit the stop bar. Use less current.`;
    case 'cyc':
      if (f === 'slow') return `At ${x.f} MHz the RF beat slower than the protons’ laps in ${x.b} T: they fell out of step and hit a dee wall. Match the RF to one lap.`;
      if (f === 'fast') return `At ${x.f} MHz the RF beat faster than the protons’ laps in ${x.b} T: they fell out of step and hit a dee wall. Match the RF to one lap.`;
      if (f === 'shallow') return `In ${x.b} T the protons reached the port too slowly: the dose stopped short of the target. Use a stronger field, with an RF to match.`;
      return `In ${x.b} T the protons reached the port too fast: the dose went past the target. Use a weaker field, with an RF to match.`;
    case 'speed':
      if (f === 'slow') return `At ${x.f} MHz the RF beat slower than the protons’ laps: they fell out of step and hit a dee wall.`;
      if (f === 'fast') return `At ${x.f} MHz the RF beat faster than the protons’ laps: they fell out of step and hit a dee wall.`;
      if (f === 'shallow') return `With the port at ${x.r} cm the protons left too slowly: the dose stopped short of the target. Move the port out.`;
      return `With the port at ${x.r} cm the protons left too fast: the dose went past the target. Move the port in.`;
    case 'focus':
      if (f === 'scrape') return `At ${x.b} G the spiral was wider than the tube: the electrons scraped the glass and never reached the screen. Use more field.`;
      if (f === 'long') return `At ${x.b} G one turn was longer than the tube: the beam had not met the axis again at the screen, so the spot was a blur. Use more field.`;
      return `At ${x.b} G the beam met the axis before the screen and spread out again: a blur. Use less field.`;
  }
}

/** The monitor check (costs a charge): the facts for the player's setting. */
export function meterText(r: Round, x: Values): string {
  switch (r.kind) {
    case 'kick': return `Monitor check: with ${x.b} T ${fieldWord(x.out)}, the push on the ${pName(r)} is ${fmt(push13(r.v, x.b!))} × 10⁻¹³ N, ${pushUp(r.pt, r.from, x.out!) ? 'up' : 'down'} the screen.`;
    case 'lift': return `Monitor check: ${x.i} A ${curWord(x.cur)} gives a push of ${fmt(liftMN(r, x.i!))} mN, ${liftUp(r.bOut, x.cur!) ? 'up' : 'down'}; the rod weighs ${fmt(weightMN(r))} mN.`;
    case 'cyc': return `Monitor check: in ${x.b} T the protons lap at ${fmt(lapMHz(x.b!))} MHz and reach the port at ${fmt(exitV7(x.b!, r.r))} × 10⁷ m/s.`;
    case 'speed': return `Monitor check: from a port at ${x.r} cm the protons leave at ${fmt(exitV7(r.b, x.r!))} × 10⁷ m/s; they lap at ${fmt(lapMHz(r.b))} MHz.`;
    case 'focus': return `Monitor check: at ${x.b} G one turn carries the electrons ${fmt(helixPitch(r, x.b!))} cm along the tube, and the spiral is ${fmt(helixWidth(r, x.b!))} cm wide.`;
  }
}

/** The wall monitor's live text (the helper), for the player's setting v. */
export const LCD_OFF = '— — —';
export function lcdText(r: Round, v: Values): string {
  switch (r.kind) {
    case 'kick': return `push ${fmt(push13(r.v, v.b!))} × 10⁻¹³ N ${pushUp(r.pt, r.from, v.out!) ? '⬆' : '⬇'}`;
    case 'lift': return `push ${fmt(liftMN(r, v.i!))} mN ${liftUp(r.bOut, v.cur!) ? '⬆' : '⬇'} · weight ${fmt(weightMN(r))} mN`;
    case 'cyc': return `lap ${fmt(lapMHz(v.b!))} MHz · out ${fmt(exitV7(v.b!, r.r))} × 10⁷ m/s`;
    case 'speed': return `lap ${fmt(lapMHz(r.b))} MHz · out ${fmt(exitV7(r.b, v.r!))} × 10⁷ m/s`;
    case 'focus': return `pitch ${fmt(helixPitch(r, v.b!))} cm · width ${fmt(helixWidth(r, v.b!))} cm`;
  }
}

/** After a win: two or three sentences of working. */
export function winText(r: Round): string {
  switch (r.kind) {
    case 'kick': return `Beam in! q v × B is at right angles to v and B: for a ${pName(r)} moving ${moving(r)} with the field ${fieldWord(r.out)} it points ${r.port}${r.pt === 'e' ? ', the reverse of a proton’s push' : ''}. Its size is qvB, so B = F/qv = ${r.f} × 10⁻¹³ ÷ (1.6 × 10⁻¹⁹ × ${r.v} × 10⁶) = ${r.b} T. The push bends the beam but does no work, so the speed stays the same.`;
    case 'lift': return `It floats! BIl sin θ = mg, so I = mg/(Bl sin θ) = ${fmt(r.m / 1000)} × 9.8 ÷ (${r.t} × ${fmt(r.l / 100)}${r.th === 30 ? ' × sin 30°' : ''}) = ${r.i} A, and with the current ${curWord(r.cur)} I l × B points up.`;
    case 'cyc': return `Dose on target! qvB = mv²/r gives B = mv/qr = 1.67 × 10⁻²⁷ × ${r.v} × 10⁷ ÷ (1.6 × 10⁻¹⁹ × ${fmt(r.r / 100)}) = ${r.b} T. One lap takes 2πm/qB, so the RF beats at f = qB/2πm = ${r.f} MHz.`;
    case 'speed': return `Dose on target! r = mv/qB grows with the speed: ${r.r0} cm × ${r.k} = ${r.r} cm. The lap time 2πm/qB has no v in it, so the RF stays at ${r.f0} MHz.`;
    case 'focus': return `Sharp spot! Across the field, v sin θ makes circles 2mv sin θ/qB = ${fmt(helixWidth(r, r.b))} cm wide, inside the ${r.pipe} cm tube. Along it, v cos θ carries the electrons one pitch, 2πm v cos θ/qB = ${r.L} cm, per turn: so B = ${r.b} G.`;
  }
}
