import { describe, expect, it } from 'vitest';
import {
  DIAL, EB, FILL, FLASH, GAP, PANEL, U_AIR, WAKE, after, buildRounds, capOf, cueRt, fault, flashJ, flashRt, hintText, intel, judge, lcdText, meterText, missText, nF, ramp, targetQ, verdictDelay, winText,
  type Fault, type Round, type Values,
} from './logic';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
};
const round = (kind: Round['kind'], row: object, assist: 0 | 1 | 2 = 0) => ({ ...row, kind, assist }) as Round;
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The answer token as a separate number, so "12 mm" does not match "2 mm". */
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);

describe('the pools (every row was checked by script)', () => {
  it('wake: nF × V is the charge, and the answer stays below the breakdown field', () => {
    for (const row of WAKE.flat()) {
      expect(Math.abs(nF(row) * row.v - row.q)).toBeLessThan(1e-9);
      expect(row.v).toBeLessThan(EB * row.gap);
    }
  });

  it('gap: the answer gap gives the charge, solving back gives the gap, and air rows do not flash over at the answer', () => {
    for (const row of GAP.flat()) {
      expect(Math.abs((capOf(row, row.d) * row.v) / row.q - 1)).toBeLessThan(0.005);
      const c = row.q / row.v;
      const d = row.c0 !== undefined ? (row.k * row.c0 * 6) / c : (8.85 * row.k * row.a!) / c;
      expect(Math.abs(d - row.d)).toBeLessThan(0.05);
      if (row.k === 1) expect(row.v).toBeLessThan(EB * row.d);
    }
  });

  it('panel: vLo is three times the striker gap, and no reachable setting lands near a band edge', () => {
    for (const row of PANEL.flat()) {
      expect(Math.abs(row.vLo - EB * Number(row.striker))).toBeLessThan(1e-9);
      for (let k = 1; k <= 6; k++) {
        for (const on of [0, 1]) {
          const { v } = after(row, k, on);
          expect(Math.abs(v - row.vLo)).toBeGreaterThan(0.05);
          expect(Math.abs(v - row.vHi)).toBeGreaterThan(0.05);
        }
      }
    }
  });

  it('flash: d is a third of the cue, the energy follows U = u·A·d, and u at breakdown is 39.825 J/m³', () => {
    expect(Math.abs(U_AIR - 39.825)).toBeLessThan(1e-9);
    for (const row of FLASH.flat()) {
      expect(row.d).toBe(row.cue / 3);
      expect(Math.abs(flashJ(row.d, row.a) / row.joules - 1)).toBeLessThan(0.005);
      expect(Math.abs(row.joules / ((39.8 * row.d) / 1000) - row.a)).toBeLessThan(0.03);
    }
  });

  it('the timing of level 4: the ramp reaches 3 kV per millimetre exactly when the flash fires, and the cue exactly when the shutter opens', () => {
    for (const row of FLASH.flat()) {
      expect(ramp(flashRt(row.d))).toBeCloseTo(EB * row.d, 9);
      expect(ramp(cueRt(row.cue))).toBeCloseTo(row.cue, 9);
      expect(flashRt(row.d)).toBeCloseTo(cueRt(row.cue), 9);
      expect(verdictDelay(round('flash', row), { d: row.d, a: row.a })).toBeCloseTo(flashRt(row.d) + 0.25, 9);
    }
    for (let d = DIAL.d.min; d <= DIAL.d.max; d++) {
      expect(verdictDelay(round('flash', FLASH[0][0]), { d, a: 1 })).toBeLessThanOrEqual(2.05 + 1e-9);
    }
  });

  it('the fixed fills are exactly 55, 80 and 100 per cent', () => {
    expect(FILL).toEqual({ short: 0.55, win: 0.8, over: 1 });
  });
});

describe('exactly one winner in every round', () => {
  it('level 1: only the answer voltage wins, and the start never wins', () => {
    for (const row of WAKE.flat()) {
      const r = round('wake', row);
      const winners = range(DIAL.v.min, DIAL.v.max).filter((v) => judge(r, { v }));
      expect(winners).toEqual([row.v]);
      expect(judge(r, { v: DIAL.v.start })).toBe(false);
    }
  });

  it('level 2: only the answer gap wins, and the start never wins', () => {
    for (const row of GAP.flat()) {
      const r = round('gap', row);
      const winners = range(DIAL.d.min, DIAL.d.max).filter((d) => judge(r, { d }));
      expect(winners).toEqual([row.d]);
      expect(judge(r, { d: 12 })).toBe(false);
    }
  });

  it('level 3: only the answer panel with the answer switch wins, and the start (no panel, connected) never wins', () => {
    for (const row of PANEL.flat()) {
      const r = round('panel', row);
      const winners: [number, number][] = [];
      for (let k = DIAL.k.min; k <= DIAL.k.max; k++) for (const on of [0, 1]) if (judge(r, { k, on })) winners.push([k, on]);
      expect(winners).toEqual([[row.k, row.on ? 1 : 0]]);
      expect(judge(r, { k: DIAL.k.start, on: DIAL.on.start })).toBe(false);
    }
  });

  it('level 4: only the answer gap with the answer area wins, and the start never wins', () => {
    for (const row of FLASH.flat()) {
      const r = round('flash', row);
      const winners: [number, number][] = [];
      for (const d of range(DIAL.d.min, DIAL.d.max)) for (const a of range(DIAL.a.min, DIAL.a.max, DIAL.a.step)) if (judge(r, { d, a })) winners.push([d, a]);
      expect(winners).toEqual([[row.d, row.a]]);
      expect(judge(r, { d: 2, a: DIAL.a.start })).toBe(false);
    }
  });
});

describe('the rounds', () => {
  it('every level has three rounds of its kind, assist 0, 1, 2, and round k comes from pool k', () => {
    const pools = [WAKE, GAP, PANEL, FLASH] as object[][][];
    const kinds = ['wake', 'gap', 'panel', 'flash'];
    for (const level of [1, 2, 3, 4] as const) {
      for (const seed of SEEDS) {
        const rounds = buildRounds(level, lcg(seed));
        expect(rounds.length).toBe(3);
        expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
        rounds.forEach((r, k) => {
          expect(r.kind).toBe(kinds[level - 1]);
          const { kind, assist, ...row } = r as Round & Record<string, unknown>;
          void kind;
          void assist;
          expect(pools[level - 1][k]).toContainEqual(row);
        });
      }
    }
  });

  it('the seeds give variety (more than one row seen in each pool)', () => {
    for (const level of [1, 2, 3, 4] as const) {
      for (let k = 0; k < 3; k++) {
        const seen = new Set(SEEDS.map((s) => JSON.stringify(buildRounds(level, lcg(s))[k])));
        expect(seen.size).toBeGreaterThan(1);
      }
    }
  });
});

describe('faults', () => {
  it('level 1: v = 3 kV per millimetre of gap flashes over, and so does anything above it, even though it is also too much', () => {
    for (const row of WAKE.flat()) {
      const r = round('wake', row);
      expect(fault(r, { v: EB * row.gap })).toBe('flash');
      expect(fault(r, { v: DIAL.v.max })).toBe('flash');
      expect(fault(r, { v: row.v - 1 })).toBe('short');
      if (row.v + 1 < EB * row.gap) expect(fault(r, { v: row.v + 1 })).toBe('over');
    }
  });

  it('level 2: an air row with a 1 mm gap flashes over, a panel row with a 1 mm gap is simply too much, and a wide gap is too little', () => {
    for (const row of GAP.flat()) {
      const r = round('gap', row);
      if (row.k > 1) expect(fault(r, { d: 1 })).toBe('over');
      if (row.k === 1) expect(fault(r, { d: 1 })).toBe('flash');
      expect(fault(r, { d: 12 })).toBe(row.d === 12 ? null : 'short');
    }
  });

  it('level 3: the right panel with the wrong switch is always a fault, and all four kinds of fault appear in the pools', () => {
    const all = new Set<Fault>();
    const wrongSwitch = new Set<Fault>();
    for (const row of PANEL.flat()) {
      const r = round('panel', row);
      const f = fault(r, { k: row.k, on: row.on ? 0 : 1 });
      expect(f).not.toBeNull();
      wrongSwitch.add(f!);
      for (let k = 1; k <= 6; k++) for (const on of [0, 1]) {
        const g = fault(r, { k, on });
        if (g) all.add(g);
      }
    }
    for (const kind of ['nospark', 'punch', 'short', 'over'] as Fault[]) expect(all.has(kind)).toBe(true);
    expect(wrongSwitch.size).toBeGreaterThanOrEqual(2);
  });

  it('level 3: the voltage checks come first, and Q follows the switch', () => {
    const row = PANEL[0][0]; // 2 nF at 12 kV, K = 3, connected
    expect(after(row, 3, 1)).toEqual({ q: 72, v: 12 });
    expect(after(row, 3, 0)).toEqual({ q: 24, v: 4 });
    expect(fault(round('panel', row), { k: 3, on: 0 })).toBe('nospark');
    expect(targetQ(row)).toBe(72);
    expect(targetQ(PANEL[1][0])).toBe(24);
  });

  it('level 4: d ± 1 is early or late, and the right gap with the area ± 0.25 is dim or bright', () => {
    for (const row of FLASH.flat()) {
      const r = round('flash', row);
      expect(fault(r, { d: row.d - 1, a: row.a })).toBe('early');
      if (row.d < DIAL.d.max) expect(fault(r, { d: row.d + 1, a: row.a })).toBe('late');
      expect(fault(r, { d: row.d, a: row.a - 0.25 })).toBe('dim');
      if (row.a + 0.25 <= DIAL.a.max) expect(fault(r, { d: row.d, a: row.a + 0.25 })).toBe('bright');
      expect(fault(r, { d: row.d - 1, a: row.a + 0.25 })).toBe('early');
    }
  });
});

/** Every wrong setting of a round, with the answer token that its miss text must not contain. */
function wrongSettings(r: Round): { x: Values; token: string | null }[] {
  const out: { x: Values; token: string | null }[] = [];
  if (r.kind === 'wake') for (const v of range(DIAL.v.min, DIAL.v.max)) if (v !== r.v) out.push({ x: { v }, token: `${r.v} kV` });
  if (r.kind === 'gap') for (const d of range(DIAL.d.min, DIAL.d.max)) if (d !== r.d) out.push({ x: { d }, token: `${r.d} mm` });
  if (r.kind === 'panel') {
    for (let k = 1; k <= 6; k++) for (const on of [0, 1]) if (!judge(r, { k, on })) out.push({ x: { k, on }, token: k !== r.k ? `K = ${r.k}` : null });
  }
  if (r.kind === 'flash') {
    for (const d of range(DIAL.d.min, DIAL.d.max)) {
      for (const a of range(DIAL.a.min, DIAL.a.max, DIAL.a.step)) {
        if (judge(r, { d, a })) continue;
        if (d !== r.d) out.push({ x: { d, a }, token: `${r.d} mm` });
        else out.push({ x: { d, a }, token: `${r.a} m²` });
      }
    }
  }
  return out;
}

describe('words', () => {
  const all = [WAKE, GAP, PANEL, FLASH].flatMap((pool, i) => pool.flat().map((row) => round((['wake', 'gap', 'panel', 'flash'] as const)[i], row)));

  it('a miss text never contains the answer, and every wrong setting has a miss text', () => {
    for (const r of all) {
      for (const { x, token } of wrongSettings(r)) {
        const text = missText(r, x);
        expect(text.length).toBeGreaterThan(20);
        if (token) expect(has(text, token)).toBe(false);
      }
    }
  });

  it('a level 2 wrong gap names the player’s own gap, and a level 4 wrong area names the player’s own area', () => {
    const g = round('gap', GAP[0][0]);
    expect(missText(g, { d: 6 })).toContain('6 mm');
    const f = round('flash', FLASH[0][0]);
    expect(missText(f, { d: 5, a: 2 })).toContain('2 m²');
  });

  it('a hit has no miss text', () => {
    expect(missText(round('wake', WAKE[0][0]), { v: 8 })).toBe('');
  });

  it('win texts show the working', () => {
    for (const row of WAKE.flat()) expect(winText(round('wake', row))).toContain('V = Q/C');
    for (const row of GAP.flat()) expect(/ε₀A\/d|× 6\/d/.test(winText(round('gap', row)))).toBe(true);
    for (const row of PANEL.flat()) expect(/KCV|V = Q\/C/.test(winText(round('panel', row)))).toBe(true);
    for (const row of FLASH.flat()) expect(winText(round('flash', row))).toContain('u = ½ε₀E²');
    for (const r of all) expect(winText(r)).toMatch(r.kind === 'flash' ? /^Perfect shot!/ : /^It’s alive!/);
  });

  it('the win text of the pF rows converts the units, and the unplugged rows say the charge stayed', () => {
    expect(winText(round('wake', WAKE[2][0]))).toContain('2500 pF = 2.5 nF');
    expect(winText(round('panel', PANEL[1][0]))).toContain('charge stayed');
  });

  it('the hint line fades round by round', () => {
    const r = WAKE[0][0];
    expect(hintText(round('wake', r, 0))).toContain('the rig meter is live');
    expect(hintText(round('wake', r, 1))).toContain('a meter check costs a charge');
    expect(hintText(round('wake', r, 2))).toContain('Final take: no meter');
    expect(intel(round('wake', WAKE[2][0]))).toContain('2500 pF');
  });

  it('the meter text and the LCD give the player’s own Q, C, V after, or flash energy', () => {
    expect(meterText(round('wake', WAKE[0][0]), { v: 5 })).toBe('Meter check: at 5 kV these plates hold 20 µC.');
    expect(lcdText(round('wake', WAKE[0][0]), { v: 5 })).toBe('Q 20 µC');
    expect(lcdText(round('gap', GAP[1][0]), { d: 6 })).toBe('C 6 nF · Q 30 µC');
    expect(lcdText(round('panel', PANEL[1][0]), { k: 3, on: 0 })).toBe('after: 4 kV · 24 µC');
    expect(lcdText(round('flash', FLASH[0][0]), { d: 5, a: 1 })).toBe('fires 15 kV · 0.199 J');
  });

  it('the verdict lands at 0.95 s (0.55 s on a flashover) in levels 1 and 2, 1.45 s in level 3, and when the flash fires plus 0.25 s in level 4', () => {
    const w = round('wake', WAKE[0][0]);
    expect(verdictDelay(w, { v: 8 })).toBe(0.95);
    expect(verdictDelay(w, { v: 20 })).toBe(0.55);
    expect(verdictDelay(round('panel', PANEL[0][0]), { k: 1, on: 1 })).toBe(1.45);
    expect(verdictDelay(round('flash', FLASH[0][0]), { d: 5, a: 1 })).toBeCloseTo(1.175, 9);
  });
});
