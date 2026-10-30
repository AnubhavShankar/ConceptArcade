// Rules, pools, judging and words for "Lightning on Set" (capacitor-bench). Pure: no DOM, no canvas, no Math.random.
// Units: C in nF (a pF row is divided by 1000), V in kV, Q in µC (nF × kV = µC), d in mm, A in m², U in J.
import { aid } from '@core/dialgame';
import { fmt } from '@core/judge';
import { pick } from '@core/quiz';

export const EPS0 = 8.85e-12; // F/m, the book's value
export const EB = 3; // kV per mm: air breaks down at 3 × 10⁶ V/m
export const U_AIR = 0.5 * EPS0 * 9e12; // J/m³ in air at breakdown, 39.825
/** The core gauge: fixed heights, never proportional to the charge. */
export const FILL = { short: 0.55, win: 0.8, over: 1 } as const;

export interface WakeRow { c: number; unit: 'nF' | 'pF'; q: number; gap: number; v: number } // v: answer in kV
export interface GapRow { a?: number; c0?: number; k: number; v: number; q: number; d: number } // d: answer in mm
export interface PanelRow { c0: number; v0: number; k: number; on: boolean; striker: string; vLo: number; vHi: number } // answer: panel k, switch on
export interface FlashRow { cue: number; joules: number; d: number; a: number } // answer: d mm, a m²

type Assist = 0 | 1 | 2;
export type Round =
  | ({ kind: 'wake'; assist: Assist } & WakeRow)
  | ({ kind: 'gap'; assist: Assist } & GapRow)
  | ({ kind: 'panel'; assist: Assist } & PanelRow)
  | ({ kind: 'flash'; assist: Assist } & FlashRow);

export const WAKE: WakeRow[][] = [
  [
    { c: 4, unit: 'nF', q: 32, gap: 4, v: 8 }, { c: 5, unit: 'nF', q: 30, gap: 4, v: 6 }, { c: 2, unit: 'nF', q: 18, gap: 4, v: 9 },
    { c: 6, unit: 'nF', q: 42, gap: 4, v: 7 }, { c: 3, unit: 'nF', q: 15, gap: 4, v: 5 },
  ],
  [
    { c: 2.5, unit: 'nF', q: 25, gap: 5, v: 10 }, { c: 1.5, unit: 'nF', q: 18, gap: 5, v: 12 },
    { c: 4, unit: 'nF', q: 44, gap: 5, v: 11 }, { c: 0.5, unit: 'nF', q: 7, gap: 5, v: 14 },
  ],
  [
    { c: 2500, unit: 'pF', q: 30, gap: 6, v: 12 }, { c: 1200, unit: 'pF', q: 18, gap: 6, v: 15 }, { c: 750, unit: 'pF', q: 9, gap: 6, v: 12 },
    { c: 4000, unit: 'pF', q: 56, gap: 6, v: 14 }, { c: 800, unit: 'pF', q: 13.6, gap: 6, v: 17 },
  ],
];

// Rows with `a`: C = Kε₀A/d. Rows with `c0`: the plates make c0 nF with air and a 6 mm gap, so C = K·c0·6/d.
// k = 1 means air (it can flash over); k > 1 is a panel that fills the gap (it never flashes over).
export const GAP: GapRow[][] = [
  [
    { a: 1, k: 1, v: 8, q: 17.7, d: 4 }, { a: 0.5, k: 1, v: 5, q: 11.1, d: 2 }, { a: 2, k: 1, v: 8, q: 28.3, d: 5 },
    { a: 1.5, k: 1, v: 10, q: 22.1, d: 6 }, { a: 1, k: 1, v: 14, q: 17.7, d: 7 },
  ],
  [
    { c0: 2, k: 3, v: 5, q: 45, d: 4 }, { c0: 1.5, k: 4, v: 6, q: 72, d: 3 }, { c0: 3, k: 2, v: 4, q: 18, d: 8 },
    { c0: 2.5, k: 6, v: 2, q: 36, d: 5 }, { c0: 2, k: 6, v: 3, q: 72, d: 3 },
  ],
  [
    { a: 1, k: 4, v: 3, q: 17.7, d: 6 }, { a: 0.5, k: 6, v: 4, q: 13.3, d: 8 }, { a: 2, k: 3, v: 2, q: 26.6, d: 4 },
    { a: 0.8, k: 5, v: 6, q: 23.6, d: 9 },
  ],
];

// on: true means the take needs more charge (keep the charger connected); false means keep the charge and lower V (unplug).
// The spark jumps the striker gap only when V ≥ vLo = 3 × striker (kV); above vHi it punches through the shell.
export const PANEL: PanelRow[][] = [
  [
    { c0: 2, v0: 12, k: 3, on: true, striker: '3', vLo: 9, vHi: 15 }, { c0: 5, v0: 8, k: 4, on: true, striker: '2', vLo: 6, vHi: 10 },
    { c0: 3, v0: 10, k: 2, on: true, striker: '2', vLo: 6, vHi: 12 }, { c0: 4, v0: 6, k: 5, on: true, striker: '1.5', vLo: 4.5, vHi: 9 },
  ],
  [
    { c0: 2, v0: 12, k: 3, on: false, striker: '1.2', vLo: 3.6, vHi: 5 }, { c0: 5, v0: 20, k: 4, on: false, striker: '1.5', vLo: 4.5, vHi: 6 },
    { c0: 3, v0: 15, k: 5, on: false, striker: '0.9', vLo: 2.7, vHi: 3.5 }, { c0: 4, v0: 12, k: 2, on: false, striker: '1.8', vLo: 5.4, vHi: 9 },
  ],
  [
    { c0: 2.5, v0: 8, k: 6, on: true, striker: '2', vLo: 6, vHi: 10 }, { c0: 1.5, v0: 14, k: 4, on: true, striker: '4', vLo: 12, vHi: 16 },
    { c0: 6, v0: 15, k: 3, on: false, striker: '1.4', vLo: 4.2, vHi: 6 }, { c0: 2, v0: 18, k: 6, on: false, striker: '0.8', vLo: 2.4, vHi: 3.5 },
  ],
];

// The camera rolls when the charger reaches `cue` kV, so d = cue/3. The flash carries U_AIR × a × d/1000 J (shown to 3 figures).
export const FLASH: FlashRow[][] = [
  [{ cue: 15, joules: 0.199, d: 5, a: 1 }, { cue: 12, joules: 0.239, d: 4, a: 1.5 }, { cue: 18, joules: 0.119, d: 6, a: 0.5 }, { cue: 9, joules: 0.239, d: 3, a: 2 }],
  [{ cue: 21, joules: 0.697, d: 7, a: 2.5 }, { cue: 24, joules: 0.398, d: 8, a: 1.25 }, { cue: 30, joules: 0.299, d: 10, a: 0.75 }, { cue: 27, joules: 0.538, d: 9, a: 1.5 }],
  [{ cue: 27, joules: 0.986, d: 9, a: 2.75 }, { cue: 33, joules: 0.767, d: 11, a: 1.75 }, { cue: 36, joules: 1.43, d: 12, a: 3 }, { cue: 30, joules: 0.896, d: 10, a: 2.25 }],
];

export const DIAL = {
  v: { min: 1, max: 20, start: 2 }, // level 1, kV
  d: { min: 1, max: 12 }, // levels 2 and 4, mm (start 12 in level 2, 2 in level 4)
  k: { min: 1, max: 6, start: 1 }, // level 3: 1 is no panel (air)
  on: { min: 0, max: 1, start: 1 }, // level 3: 1 connected, 0 unplugged
  a: { min: 0.25, max: 3, step: 0.25, start: 0.25 }, // level 4, m²
};

export const nF = (r: WakeRow) => (r.unit === 'pF' ? r.c / 1000 : r.c);
/** Level 2: capacitance in nF for a gap of d mm. */
export const capOf = (r: GapRow, d: number) => (r.c0 !== undefined ? (r.k * r.c0 * 6) / d : (8.85 * r.k * r.a!) / d);
/** Level 3: Q (µC) and V (kV) after the panel goes in. */
export const after = (r: PanelRow, k: number, on: number) => (on ? { q: k * r.c0 * r.v0, v: r.v0 } : { q: r.c0 * r.v0, v: r.v0 / k });
export const targetQ = (r: PanelRow) => (r.on ? r.k * r.c0 * r.v0 : r.c0 * r.v0);
/** Level 4: the flash energy in J for a gap of d mm and plates of a m². */
export const flashJ = (d: number, a: number) => (U_AIR * a * d) / 1000;

/** Level 4 timing: the charger ramps at 24 kV/s from 0.30 s. The shutter opens when the ramp reaches the cue; the air breaks down when it reaches 3 kV per mm. */
export const RAMP = { start: 0.3, rate: 24 };
export const ramp = (rt: number) => Math.max(0, RAMP.rate * (rt - RAMP.start));
export const cueRt = (cue: number) => RAMP.start + cue / RAMP.rate;
export const flashRt = (d: number) => RAMP.start + (EB * d) / RAMP.rate;

export function buildRounds(level: 1 | 2 | 3 | 4, random: () => number): Round[] {
  const pools = [WAKE, GAP, PANEL, FLASH][level - 1] as unknown[][];
  const kind = (['wake', 'gap', 'panel', 'flash'] as const)[level - 1];
  return pools.map((pool, k) => ({ ...(pick(pool, random) as object), kind, assist: aid(k) }) as Round);
}

export type Fault = 'flash' | 'short' | 'over' | 'nospark' | 'punch' | 'early' | 'late' | 'dim' | 'bright';
export type Values = { v?: number; d?: number; k?: number; on?: number; a?: number };

export function fault(r: Round, x: Values): Fault | null {
  switch (r.kind) {
    case 'wake': {
      const v = x.v!;
      if (v >= EB * r.gap) return 'flash';
      return v === r.v ? null : v < r.v ? 'short' : 'over';
    }
    case 'gap': {
      const d = x.d!;
      if (r.k === 1 && r.v >= EB * d) return 'flash';
      return d === r.d ? null : d > r.d ? 'short' : 'over';
    }
    case 'panel': {
      const { q, v } = after(r, x.k!, x.on!);
      if (v < r.vLo) return 'nospark';
      if (v > r.vHi) return 'punch';
      const qt = targetQ(r);
      return Math.abs(q - qt) < 1e-9 ? null : q < qt ? 'short' : 'over';
    }
    case 'flash': {
      if (x.d !== r.d) return x.d! < r.d ? 'early' : 'late';
      return x.a === r.a ? null : x.a! < r.a ? 'dim' : 'bright';
    }
  }
}
export const judge = (r: Round, x: Values) => fault(r, x) === null;

/** Seconds into the take at which the verdict (hearts, score, text) lands. */
export function verdictDelay(r: Round, x: Values): number {
  if (r.kind === 'wake' || r.kind === 'gap') return fault(r, x) === 'flash' ? 0.55 : 0.95;
  if (r.kind === 'panel') return 1.45;
  return 0.55 + x.d! / 8;
}

// ---- words ------------------------------------------------------------------------------------------------------------------------------------------------

const cText = (r: WakeRow) => `${r.c} ${r.unit}`;

export function intel(r: Round): string {
  switch (r.kind) {
    case 'wake':
      return `Rig: C = ${cText(r)}, with ${r.gap} mm of air between the plates. TITAN-7’s core needs ${r.q} µC.`;
    case 'gap':
      return r.c0 === undefined
        ? `Plates of ${r.a} m², charger at ${r.v} kV, ${r.k === 1 ? 'air between the plates' : `a K = ${r.k} panel filling the gap`}. The core needs ${r.q} µC.`
        : `With air and a 6 mm gap these plates make ${r.c0} nF. Charger at ${r.v} kV, with K = ${r.k} panels filling the gap. The core needs ${r.q} µC.`;
    case 'panel':
      return `The rig holds ${r.c0} nF charged to ${r.v0} kV. The core needs ${fmt(targetQ(r))} µC. Striker gap ${r.striker} mm; the robot’s shell is rated to ${r.vHi} kV.`;
    case 'flash':
      return `The camera rolls when the charger reaches ${r.cue} kV. The shot needs a flash of ${r.joules} J.`;
  }
}

export const hintText = (r: Round) => `${intel(r)} ${r.assist === 0 ? 'Round 1: the rig meter is live.' : r.assist === 1 ? 'The meter is off: a meter check costs a charge.' : 'Final take: no meter.'}`;

/** What the player's setting did, by fault. It never prints the answer. */
export function missText(r: Round, x: Values): string {
  const f = fault(r, x);
  if (f === null) return '';
  if (r.kind === 'wake') {
    const v = x.v!;
    if (f === 'flash') return `At ${v} kV across ${r.gap} mm of air the field reached 3 kV per millimetre: the air broke down and the rig flashed over between its own plates.`;
    if (f === 'short') return `At ${v} kV the plates held too little charge: TITAN-7’s core only flickered.`;
    return `At ${v} kV the plates held too much charge: the core overloaded and blew its fuse.`;
  }
  if (r.kind === 'gap') {
    const d = x.d!;
    if (f === 'flash') return `With only ${d} mm of air, ${r.v} kV is 3 kV per millimetre or more: the air broke down and the rig flashed over.`;
    if (f === 'short') return `With a ${d} mm gap the capacitance was too small: the core got too little charge and only flickered.`;
    return `With a ${d} mm gap the capacitance was too big: the core got too much charge and blew its fuse.`;
  }
  if (r.kind === 'panel') {
    const k = x.k!;
    const lead = `${x.on ? 'With the charger connected' : 'With the charger unplugged'} ${k === 1 ? 'and no panel' : `and the K = ${k} panel`},`;
    if (f === 'nospark') return `${lead} the voltage ended too low to jump the striker gap: the spark fizzled out in mid-air.`;
    if (f === 'punch') return `${lead} the voltage ended too high for the robot’s shell: the spark punched into its chest.`;
    if (f === 'short') return `${lead} the spark landed, but the core got too little charge and only flickered.`;
    return `${lead} the spark landed, but the core got too much charge and blew its fuse.`;
  }
  const d = x.d!;
  const a = x.a!;
  if (f === 'early') return `A ${d} mm gap broke down before the charger reached the cue: the flash went off before the camera rolled.`;
  if (f === 'late') return `A ${d} mm gap held out past the cue: the camera had stopped rolling when the flash came.`;
  if (f === 'dim') return `On cue, but plates of ${a} m² stored too little energy in the field: the frame came out dark.`;
  return `On cue, but plates of ${a} m² stored too much energy in the field: the frame washed out white.`;
}

/** The meter check (it costs a charge) and the round 1 live readout. */
export function meterText(r: Round, x: Values): string {
  if (r.kind === 'wake') return `Meter check: at ${x.v} kV these plates hold ${fmt(nF(r) * x.v!)} µC.`;
  if (r.kind === 'gap') return `Meter check: a ${x.d} mm gap gives C = ${fmt(capOf(r, x.d!))} nF, so the plates hold ${fmt(capOf(r, x.d!) * r.v)} µC.`;
  if (r.kind === 'panel') {
    const s = after(r, x.k!, x.on!);
    return `Meter check: after the panel goes in, V = ${fmt(s.v)} kV and Q = ${fmt(s.q)} µC.`;
  }
  return `Meter check: this gap fires at ${EB * x.d!} kV, and the flash would carry ${fmt(flashJ(x.d!, x.a!))} J.`;
}

export const LCD_OFF = '— — —';
/** The LCD's live text: the only place the player's resulting Q, C, V-after or flash energy appears before a take. */
export function lcdText(r: Round, x: Values): string {
  if (r.kind === 'wake') return `Q ${fmt(nF(r) * x.v!)} µC`;
  if (r.kind === 'gap') return `C ${fmt(capOf(r, x.d!))} nF · Q ${fmt(capOf(r, x.d!) * r.v)} µC`;
  if (r.kind === 'panel') {
    const s = after(r, x.k!, x.on!);
    return `after: ${fmt(s.v)} kV · ${fmt(s.q)} µC`;
  }
  return `fires ${EB * x.d!} kV · ${fmt(flashJ(x.d!, x.a!))} J`;
}

export function winText(r: Round): string {
  if (r.kind === 'wake') {
    return `It’s alive! V = Q/C = ${r.q} µC ÷ ${fmt(nF(r))} nF = ${r.v} kV${r.unit === 'pF' ? ` (${r.c} pF = ${fmt(nF(r))} nF)` : ''}. The field, ${fmt(r.v / r.gap)} kV per millimetre, stays below the 3 at which air breaks down.`;
  }
  if (r.kind === 'gap') {
    if (r.c0 === undefined) {
      return `It’s alive! The core needs C = Q/V = ${fmt(r.q / r.v)} nF. With C = ${r.k > 1 ? 'Kε₀A/d' : 'ε₀A/d'}, d = ${r.k > 1 ? `${r.k} × ` : ''}8.85 × 10⁻¹² × ${r.a} ÷ (${fmt(r.q / r.v)} × 10⁻⁹) m = ${r.d} mm.`;
    }
    return `It’s alive! The core needs C = Q/V = ${fmt(r.q / r.v)} nF. The panels multiply C by ${r.k}, and C grows as the gap shrinks: ${r.k} × ${r.c0} × 6/d = ${fmt(r.q / r.v)} gives d = ${r.d} mm.`;
  }
  if (r.kind === 'panel') {
    return r.on
      ? `It’s alive! Connected, the charger held ${r.v0} kV while the K = ${r.k} panel raised C to ${fmt(r.k * r.c0)} nF, so Q = KCV = ${fmt(targetQ(r))} µC. The spark jumped the ${r.striker} mm gap, and ${r.v0} kV is within the shell’s ${r.vHi} kV.`
      : `It’s alive! Unplugged, the charge stayed at ${fmt(targetQ(r))} µC while the K = ${r.k} panel raised C to ${fmt(r.k * r.c0)} nF, so V = Q/C fell to ${fmt(r.v0 / r.k)} kV: enough to jump ${r.striker} mm, and within the shell’s ${r.vHi} kV.`;
  }
  return `Perfect shot! Air breaks down at 3 kV per millimetre, so a ${r.d} mm gap fires at ${r.cue} kV, on cue. The field then holds u = ½ε₀E² = ½ × 8.85 × 10⁻¹² × (3 × 10⁶)² ≈ 39.8 J/m³, and U = u × A × d = 39.8 × ${r.a} × ${fmt(r.d / 1000)} = ${r.joules} J, the same as ½CV² with C = ε₀A/d.`;
}
