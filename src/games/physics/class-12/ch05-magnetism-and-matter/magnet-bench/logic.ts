// Rules, pools, judging, words and the fixed geometry of "The Floating Act" (magnet-bench). Pure: no DOM, no canvas, no Math.random.
// Units: moments in J/T, coil areas in 10⁻⁴ m² (level 2) or cm² (level 3), currents in A, turns as counts.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export type Pole = 'N' | 'S';
export const MARKS = 12; // the bar is ruled in 12 equal marks

export interface SawRow { cut: 'across' | 'along'; m0: number; need: number; nLeft: boolean; under: Pole }
export interface CoilRow { a: number; i: number; need: number; under: Pole } // a: turn area in units of 10⁻⁴ m²
export interface MatchRow { mBar: number; aCm2: number; i: number; top: Pole }

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'saw'; assist: Assist } & SawRow)
  | ({ kind: 'coil'; assist: Assist } & CoilRow)
  | ({ kind: 'match'; assist: Assist } & MatchRow);

// Level 1. Round 1 saws a thin strip along the whole length; rounds 2 and 3 saw a piece off the left end.
export const SAW: SawRow[][] = [
  [
    { cut: 'along', m0: 0.6, need: 0.2, nLeft: true, under: 'N' }, { cut: 'along', m0: 0.48, need: 0.28, nLeft: false, under: 'N' },
    { cut: 'along', m0: 0.72, need: 0.54, nLeft: true, under: 'S' }, { cut: 'along', m0: 0.84, need: 0.28, nLeft: false, under: 'S' },
  ],
  [
    { cut: 'across', m0: 0.6, need: 0.15, nLeft: true, under: 'N' }, { cut: 'across', m0: 0.48, need: 0.24, nLeft: false, under: 'N' },
    { cut: 'across', m0: 0.72, need: 0.48, nLeft: false, under: 'S' }, { cut: 'across', m0: 0.96, need: 0.24, nLeft: true, under: 'S' },
  ],
  [
    { cut: 'across', m0: 0.6, need: 0.25, nLeft: false, under: 'N' }, { cut: 'across', m0: 0.84, need: 0.14, nLeft: true, under: 'S' },
    { cut: 'across', m0: 0.48, need: 0.4, nLeft: false, under: 'S' }, { cut: 'across', m0: 0.72, need: 0.3, nLeft: true, under: 'N' },
  ],
];

// Level 2: a in units of 10⁻⁴ m². Answers (N, dir): r1 800/1, 500/0, 300/0, 600/1; r2 1000/0, 700/1, 900/0, 450/1; r3 1100/1, 350/0, 1300/0, 250/1.
export const COIL: CoilRow[][] = [
  [{ a: 2.5, i: 3, need: 0.6, under: 'N' }, { a: 2, i: 2, need: 0.2, under: 'S' }, { a: 5, i: 2, need: 0.3, under: 'S' }, { a: 4, i: 1.5, need: 0.36, under: 'N' }],
  [{ a: 1.6, i: 4, need: 0.64, under: 'S' }, { a: 3, i: 2.5, need: 0.525, under: 'N' }, { a: 2.5, i: 4, need: 0.9, under: 'S' }, { a: 1.2, i: 5, need: 0.27, under: 'N' }],
  [{ a: 2, i: 3, need: 0.66, under: 'N' }, { a: 1.5, i: 4, need: 0.21, under: 'S' }, { a: 4, i: 2.5, need: 1.3, under: 'S' }, { a: 2.5, i: 2, need: 0.125, under: 'N' }],
];

// Level 3: areas in cm². Answers (N, dir): r1 600/0, 700/1, 400/1, 500/0; r2 850/1, 1200/0, 550/0, 750/1; r3 1400/0, 950/1, 650/1, 1050/0.
export const MATCH: MatchRow[][] = [
  [{ mBar: 0.48, aCm2: 4, i: 2, top: 'S' }, { mBar: 0.35, aCm2: 2.5, i: 2, top: 'N' }, { mBar: 0.4, aCm2: 5, i: 2, top: 'N' }, { mBar: 0.6, aCm2: 6, i: 2, top: 'S' }],
  [{ mBar: 0.51, aCm2: 2, i: 3, top: 'N' }, { mBar: 0.96, aCm2: 2, i: 4, top: 'S' }, { mBar: 0.33, aCm2: 4, i: 1.5, top: 'S' }, { mBar: 0.75, aCm2: 2.5, i: 4, top: 'N' }],
  [{ mBar: 0.84, aCm2: 2, i: 3, top: 'S' }, { mBar: 0.57, aCm2: 3, i: 2, top: 'N' }, { mBar: 0.39, aCm2: 1.5, i: 4, top: 'N' }, { mBar: 0.63, aCm2: 1.5, i: 4, top: 'S' }],
];

export const DIAL = {
  k: { min: 1, max: 11, start: 1 }, // level 1 saw mark
  up: { min: 0, max: 1, start: 0 }, // level 1: 0 left end up, 1 right end up
  n: { min: 100, max: 1500, step: 50, start: 100 }, // levels 2 and 3: turns
  dir: { min: 0, max: 1, start: 0 }, // levels 2 and 3: 0 front current ←, 1 front current →
};

export const other = (p: Pole): Pole => (p === 'N' ? 'S' : 'N');
/** Level 1: the moment of a piece sawn to mark k. */
export const pieceMoment = (r: SawRow, k: number) => (r.m0 * k) / MARKS;
/** Level 1: the pole at the end that is put up (up 0 = the piece's left end). Every piece points the same way as the bar. */
export const pieceTop = (r: SawRow, up: number): Pole => ((up === 0) === r.nLeft ? 'N' : 'S');
/** Levels 2 and 3: m = NIA. */
export const coilMoment = (r: CoilRow | MatchRow, n: number) => n * r.i * ('a' in r ? r.a : r.aCm2) * 1e-4;
/** Right-hand rule for an upright coil seen from the front: front current to the right (dir 1) makes the top end N. */
export const coilTop = (dir: number): Pole => (dir === 1 ? 'N' : 'S');
export const needOf = (r: Round) => (r.kind === 'match' ? r.mBar : r.need);
export const topNeeded = (r: Round): Pole => (r.kind === 'match' ? r.top : r.under);

export function sawAnswer(r: SawRow) {
  const k = Math.round((MARKS * r.need) / r.m0);
  const up = pieceTop(r, 0) === r.under ? 0 : 1;
  return { k, up };
}
export function coilAnswer(r: CoilRow | MatchRow) {
  const n = Math.round(('need' in r ? r.need : r.mBar) / (r.i * ('a' in r ? r.a : r.aCm2) * 1e-4));
  const dir = ('under' in r ? r.under : r.top) === 'N' ? 1 : 0;
  return { n, dir };
}

export function buildRounds(level: 1 | 2 | 3, random: () => number): Round[] {
  const pools = [SAW, COIL, MATCH][level - 1] as unknown[][];
  const kind = (['saw', 'coil', 'match'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'snap' | 'low' | 'high';
export type Values = { k?: number; up?: number; n?: number; dir?: number };

export function fault(r: Round, x: Values): Fault | null {
  const top = r.kind === 'saw' ? pieceTop(r, x.up!) : coilTop(x.dir!);
  if (top !== topNeeded(r)) return 'snap';
  const m = r.kind === 'saw' ? pieceMoment(r, x.k!) : coilMoment(r, x.n!);
  const need = needOf(r);
  if (Math.abs(m / need - 1) < 1e-6) return null;
  return m < need ? 'low' : 'high';
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;
export const VERDICT_AT = 1.2; // seconds into the act: the ring reaches its fixed resting place

// ---- fixed geometry (logical canvas pixels, 640 × 340) --------------------------------------------------------------------------------------------------
export const STAGE = { floor: 286 }; // stage floor line
export const TABLE = { x0: 160, x1: 440, top: 228 }; // velvet-covered table, cloth down to the floor
export const WAND = { x: 380, top: 72, base: 228 }; // the glass wand
export const HOVER = { start: 78, win: 124, low: 200, snap: 222 }; // ring centre y: clip, ribbon, low float, on the table
export const SOCKET = { x: 380, y: 258, w: 56, h: 52 }; // cutaway window in the table front under the wand (centre)
export const BAR = { x0: 176, y: 204, len: 144, h: 18, slab: 60 }; // level 1 bar: 12 px per mark across; along: a slab 144 × 60, 5 px per mark
export const NOOR = { x: 96, feet: 286 };
export const HAT = { x: 520, y: 286 }; // Biscuit's top hat
export const CARD = { x: 556, y: 132, w: 124, h: 54 }; // the rehearsal card on an easel (centre)
export const TURNS = { x0: 150, x1: 470, y: 300 }; // levels 2 and 3: the winding track along the stage edge
export const BATTERY = { x: 250, y: 262 }; // levels 2 and 3: battery box with the polarity switch (centre)
export const HIT: [number, number] = [300, 60]; // fixed burst point
/** Level 3: the second wand over the real bar magnet in its own cutaway window. */
export const WAND2 = { x: 470, top: 120, base: 228, ring: 168 };
export const SOCKET2 = { x: 470, y: 258, w: 36, h: 52 };

// ---- the ring's flight: fixed heights by outcome, never proportional to the player's moment -------------------------------------------------------------
export type Outcome = 'win' | Fault;
export interface RingPose { x: number; y: number; spin: boolean; h: number }
const smooth = (u: number) => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
};
/** Where the ring is `rt` seconds after Showtime. The ring hangs in its clip until 0.70 s; then it falls, floats or flies by outcome. */
export function ringPose(out: Outcome | null, rt: number): RingPose {
  const x = WAND.x;
  if (!out || rt < 0.7) return { x, y: HOVER.start, spin: false, h: 10 };
  const fall = (to: number, over: number, bob: number): RingPose => {
    let y: number;
    if (rt < 1.05) y = HOVER.start + (to + over - HOVER.start) * ((rt - 0.7) / 0.35) ** 2;
    else if (rt < 1.15) y = to + over - over * smooth((rt - 1.05) / 0.1);
    else y = to + bob * Math.sin((rt - 1.15) * 8) * Math.min(1, (rt - 1.15) / 0.1);
    return { x, y, spin: false, h: 10 };
  };
  if (out === 'win') return fall(HOVER.win, 6, 3);
  if (out === 'low') return fall(HOVER.low, 4, 1);
  if (out === 'snap') {
    if (rt < 1.15) return { x, y: HOVER.start + (HOVER.snap - HOVER.start) * ((rt - 0.7) / 0.45) ** 2, spin: false, h: 10 };
    return { x, y: HOVER.snap, spin: false, h: rt < 1.3 ? 7 : 10 };
  }
  // high: up 20 px off the knob, then a parabola to Biscuit's ears at 1.30 s
  if (rt < 0.85) return { x, y: HOVER.start - 20 * smooth((rt - 0.7) / 0.15), spin: false, h: 10 };
  if (rt < 1.3) {
    const u = (rt - 0.85) / 0.45;
    return { x: 380 + 140 * u, y: 58 - 200 * u + 378 * u * u, spin: true, h: 10 };
  }
  return { x: HAT.x, y: 236, spin: false, h: 10 };
}

// ---- words ----------------------------------------------------------------------------------------------------------------------------------------------
export const CARD_OFF = '— — —';

export function goalText(r: Round): string {
  if (r.kind === 'saw') return `Float the ring: saw a ${r.need} J/T piece`;
  if (r.kind === 'coil') return `Float the ring: wind a ${r.need} J/T coil`;
  return `Swap the ${r.mBar} J/T magnet for a coil`;
}

export function intel(r: Round): string {
  if (r.kind === 'saw') {
    return `The bar is ${r.m0} J/T, ruled in 12 equal marks, and its left end is stamped ${r.nLeft ? 'N' : 'S'}. Noor saws ${r.cut === 'across' ? 'a piece off the left end' : 'a thin strip along its whole length'}. The ring’s underside is ${r.under}, and it floats at the ribbon over a ${r.need} J/T magnet.`;
  }
  if (r.kind === 'coil') {
    return `Each turn of the coil is ${r.a} × 10⁻⁴ m² and the battery gives ${r.i} A. The ring’s underside is ${r.under}, and it floats at the ribbon over a ${r.need} J/T magnet.`;
  }
  return `The bar magnet under the second wand is ${r.mBar} J/T, standing with its ${r.top} end up. Each turn of the coil is ${r.aCm2} cm² and the battery gives ${r.i} A.`;
}

export const hintText = (r: Round) =>
  `${intel(r)} ${r.assist === 0 ? 'Round 1: the rehearsal card is live.' : r.assist === 1 ? 'The card is blank: a rehearsal costs a charge.' : 'Gala night: no rehearsal.'}`;

export function missText(r: Round, x: Values): string {
  const f = fault(r, x);
  if (r.kind === 'saw') {
    if (f === 'snap') return `With the ${x.up ? 'right' : 'left'} end up, the piece’s top pole was unlike the ring’s underside, so they attracted and the ring snapped down. A float needs like poles facing: think about which pole the ${r.cut === 'across' ? 'sawn face' : 'top end'} is.`;
    if (f === 'low') return `A piece to mark ${x.k} was too weak a magnet: the ring floated far below the ribbon. Saw off a bigger piece.`;
    return `A piece to mark ${x.k} was too strong a magnet: the ring was pushed right off the wand. Saw off a smaller piece.`;
  }
  if (f === 'snap') return `With the front current flowing ${x.dir ? 'right' : 'left'}, the coil’s top end was unlike the ring’s underside, so the ring snapped down. Use the right-hand rule on the front turns.`;
  if (f === 'low') return `${x.n} turns made too small a magnetic moment: the ring floated far below the ribbon. Wind more turns.`;
  return `${x.n} turns made too big a magnetic moment: the ring was pushed right off the wand. Wind fewer turns.`;
}

/** The moment and the top pole of the player's setting (what the rehearsal and the card read out). */
export function readout(r: Round, x: Values): { m: number; top: Pole } {
  if (r.kind === 'saw') return { m: pieceMoment(r, x.k!), top: pieceTop(r, x.up!) };
  return { m: coilMoment(r, x.n!), top: coilTop(x.dir!) };
}

export function rehearsalText(r: Round, x: Values): string {
  const { m, top } = readout(r, x);
  if (r.kind === 'saw') return `Rehearsal: a piece to mark ${x.k} is a ${fmt(m)} J/T magnet, and with the ${x.up ? 'right' : 'left'} end up its top is a ${top} pole.`;
  return `Rehearsal: ${x.n} turns give m = ${fmt(m)} J/T, and with the front current flowing ${x.dir ? 'right' : 'left'} the top end is ${top}.`;
}

export function cardText(r: Round, x: Values): string {
  const { m, top } = readout(r, x);
  return `m ${fmt(m)} J/T · top ${top}`;
}

export function winText(r: Round): string {
  if (r.kind === 'saw') {
    const a = sawAnswer(r);
    if (r.cut === 'across') {
      return `Ta-da! Every piece of a magnet is a whole magnet: the sawn face became ${r.nLeft ? 'an S' : 'an N'} pole, so the ${a.up ? 'sawn face' : 'stamped end'} went up to face the ring’s ${r.under}. The piece is ${a.k}/12 of the bar, so m = ${a.k}/12 × ${r.m0} = ${r.need} J/T.`;
    }
    return `Ta-da! A strip sawn along the length is still a whole magnet, with the same N and S ends as the bar, so its ${a.up ? 'right' : 'left'} end went up to face the ring’s ${r.under}. It is ${a.k}/12 of the bar, so m = ${a.k}/12 × ${r.m0} = ${r.need} J/T.`;
  }
  const a = coilAnswer(r);
  if (r.kind === 'coil') {
    return `Ta-da! A coil is a magnet, no iron needed: m = NIA = ${a.n} × ${r.i} × ${r.a} × 10⁻⁴ = ${r.need} J/T. Fingers along the current, thumb to N: front current ${a.dir ? '→' : '←'} put ${r.under} on top.`;
  }
  return `Ta-da! Same moment, same field: N = m/(IA) = ${r.mBar} ÷ (${r.i} × ${r.aCm2} × 10⁻⁴) = ${a.n} turns, since ${r.aCm2} cm² = ${r.aCm2} × 10⁻⁴ m². Front current ${a.dir ? '→' : '←'} puts ${r.top} on top, like the magnet.`;
}
