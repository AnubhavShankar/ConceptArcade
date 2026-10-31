import { describe, expect, it } from 'vitest';
import { fmt } from '@core/judge';
import {
  AIM, DIAL, FLOAT, G, K, SIGNED, TINY, buildRounds, checkText, fault, floatCm, floatMm, forces, goalText, hintText, intel, judge, lcdText, missText, sgnQ, winText,
  type AimRow, type Fault, type FloatRow, type Round, type TinyRow, type Values,
} from './logic';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The token as a separate number, so "12 nC" does not match "2 nC". */
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const round = (kind: Round['kind'], row: object, assist: 0 | 1 | 2 = 0) => ({ ...row, kind, assist }) as Round;

const floatRows = FLOAT.flat();
const tinyRows = TINY.flat();
const signedRows = SIGNED.flat();
const aimRows = AIM.flat();
type Level = 1 | 2 | 3 | 4;
const rowsOf = (level: Level): Round[] =>
  level === 1 ? floatRows.map((r) => round('float', r)) : level === 2 ? tinyRows.map((r) => round('tiny', r)) : level === 3 ? signedRows.map((r) => round('signed', r)) : aimRows.map((r) => round('aim', r));
const dialOf = (level: Level) => ({ 1: DIAL.q1, 2: DIAL.q2, 3: DIAL.q3, 4: DIAL.h4 })[level];
const answerOf = (r: Round) => (r.kind === 'aim' ? r.h : r.q);
const setting = (r: Round, x: number): Values => (r.kind === 'aim' ? { h: x } : { q: x });

describe('the pools (every row was checked by script)', () => {
  it('float: the shown height is the float height of the answer, and solving back gives the answer', () => {
    for (const row of floatRows as FloatRow[]) {
      expect(fmt(floatCm(row.m, row.Q, row.q))).toBe(String(row.h));
      const nC = (row.m * 1e-3 * G * (row.h / 100) ** 2) / (K * row.Q * 1e-6) / 1e-9;
      expect(Math.abs(nC - row.q)).toBeLessThan(0.08);
    }
  });

  it('tiny and signed: the shown height is the float height, solving back gives |q|, and q has the sign of Q', () => {
    for (const row of [...tinyRows, ...signedRows] as TinyRow[]) {
      expect(fmt(floatMm(row.m, row.Q, row.q))).toBe(String(row.h));
      const pC = (row.m * 1e-6 * G * (row.h / 1000) ** 2) / (K * Math.abs(row.Q) * 1e-9) / 1e-12;
      expect(Math.abs(pC - Math.abs(row.q))).toBeLessThan(0.12);
      expect(Math.sign(row.q)).toBe(Math.sign(row.Q));
    }
  });

  it('aim: the shown charge solves back to the height, and the height floats it', () => {
    for (const row of aimRows as AimRow[]) {
      const nC = (row.m * 1e-3 * G * (row.h / 100) ** 2) / (K * row.Q * 1e-6) / 1e-9;
      expect(fmt(nC)).toBe(String(row.q));
      expect(Math.abs(floatCm(row.m, row.Q, row.q) - row.h)).toBeLessThan(0.03);
    }
  });

  it('every shown height is inside the column, and every level 4 charge is between 1 and 20 nC', () => {
    for (const row of floatRows) {
      expect(row.h).toBeGreaterThanOrEqual(5);
      expect(row.h).toBeLessThanOrEqual(17);
    }
    for (const row of [...tinyRows, ...signedRows]) {
      expect(row.h).toBeGreaterThanOrEqual(3);
      expect(row.h).toBeLessThanOrEqual(10);
    }
    for (const row of aimRows) {
      expect(row.q).toBeGreaterThanOrEqual(1);
      expect(row.q).toBeLessThanOrEqual(20);
      expect(row.h).toBeGreaterThanOrEqual(5);
      expect(row.h).toBeLessThanOrEqual(17);
    }
  });

  it('the force check at the answer balances: push and weight agree within the rounding of the shown height', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      for (const r of rowsOf(level)) {
        const f = forces(r, r.kind === 'aim' ? r.h : r.q);
        expect(Math.abs(f.push / f.weight - 1)).toBeLessThan(0.02);
      }
    }
  });
});

describe('exactly one winner in every round', () => {
  for (const level of [1, 2, 3, 4] as Level[]) {
    it(`level ${level}: only the answer wins over the whole dial, and the start setting loses`, () => {
      const d = dialOf(level);
      for (const r of rowsOf(level)) {
        const winners = range(d.min, d.max).filter((x) => judge(r, setting(r, x)));
        expect(winners).toEqual([answerOf(r)]);
        expect(judge(r, setting(r, d.start))).toBe(false);
      }
    });
  }

  it('no answer is shared by two rounds of a level, and none sits at a dial end', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      const d = dialOf(level);
      const answers = rowsOf(level).map((r) => Math.abs(answerOf(r)));
      expect(new Set(answers).size).toBe(answers.length);
      for (const a of answers) {
        expect(a).toBeGreaterThan(Math.abs(d.min) === d.min ? d.min : 0);
        expect(a).toBeLessThan(d.max);
      }
    }
  });

  it('physical honesty: the neighbouring charges float at least 1.2% away from the beam (levels 1 to 3)', () => {
    for (const row of floatRows) for (const dq of [-1, 1]) expect(Math.abs(floatCm(row.m, row.Q, row.q + dq) / row.h - 1)).toBeGreaterThanOrEqual(0.012);
    for (const row of [...tinyRows, ...signedRows]) for (const dq of [-1, 1]) expect(Math.abs(floatMm(row.m, row.Q, Math.abs(row.q) + dq) / row.h - 1)).toBeGreaterThanOrEqual(0.012);
  });
});

describe('building the rounds', () => {
  it('every level has 3 rounds of its kind, assist 0, 1, 2, and round k takes its row from pool k', () => {
    const kinds = ['float', 'tiny', 'signed', 'aim'] as const;
    const pools = [FLOAT, TINY, SIGNED, AIM] as unknown as Record<string, number>[][][];
    for (const level of [1, 2, 3, 4] as Level[]) {
      for (const seed of SEEDS) {
        let s = seed >>> 0;
        const random = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
        const rounds = buildRounds(level, random);
        expect(rounds.length).toBe(3);
        expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
        rounds.forEach((r, k) => {
          expect(r.kind).toBe(kinds[level - 1]);
          const row = pools[level - 1][k].find((p) => p.m === r.m && p.Q === r.Q);
          expect(row, `level ${level} round ${k}`).toBeDefined();
        });
      }
    }
  });

  it('the rounds of one seed are the same every time, and different seeds give different boards', () => {
    const make = (seed: number) => {
      let s = seed >>> 0;
      return buildRounds(1, () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296));
    };
    expect(make(5)).toEqual(make(5));
    expect(new Set(SEEDS.map((s) => JSON.stringify(make(s)))).size).toBeGreaterThan(10);
  });
});

describe('faults', () => {
  it('level 3: zero is flat, the opposite sign is pulled (checked before the size), the same sign is low or high', () => {
    for (const row of signedRows) {
      const r = round('signed', row);
      expect(fault(r, { q: 0 })).toBe('flat');
      expect(fault(r, { q: -row.q })).toBe('pulled');
      expect(fault(r, { q: -row.q * 3 })).toBe('pulled');
      expect(fault(r, { q: row.q + Math.sign(row.q) })).toBe('high');
      expect(fault(r, { q: row.q - Math.sign(row.q) })).toBe('low');
      expect(fault(r, { q: row.q })).toBeNull();
    }
  });

  it('levels 1 and 2: a smaller charge is low and a larger one is high', () => {
    for (const row of floatRows) {
      expect(fault(round('float', row), { q: row.q - 1 })).toBe('low');
      expect(fault(round('float', row), { q: row.q + 1 })).toBe('high');
    }
    for (const row of tinyRows) {
      expect(fault(round('tiny', row), { q: row.q - 1 })).toBe('low');
      expect(fault(round('tiny', row), { q: row.q + 1 })).toBe('high');
    }
  });

  it('level 4: a beam above the float height leaves the bead low, a beam below leaves it high', () => {
    for (const row of aimRows) {
      expect(fault(round('aim', row), { h: row.h + 1 })).toBe('low');
      expect(fault(round('aim', row), { h: row.h - 1 })).toBe('high');
    }
  });

  it('the float gauge agrees with the faults: it reads the beam height only at the answer', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const r of rowsOf(level)) {
        const q = answerOf(r) as number;
        const shown = (r as FloatRow).h;
        expect(lcdText(r, { q })).toBe(`floats at ${fmt(shown)} ${level === 1 ? 'cm' : 'mm'}`);
        expect(lcdText(r, { q: q + Math.sign(q) })).not.toBe(lcdText(r, { q }));
      }
    }
  });
});

describe('words', () => {
  const token = (r: Round) => (r.kind === 'float' ? `${r.q} nC` : r.kind === 'aim' ? `${r.h} cm` : `${Math.abs(r.q)} pC`);
  /** The player's own setting may be echoed in a miss text: it is not the answer. Remove it before looking for the answer. */
  const own = (r: Round, x: number) => (r.kind === 'float' ? `${x} nC` : r.kind === 'aim' ? `${x} cm` : `${r.kind === 'signed' ? sgnQ(x) : x} pC`);

  for (const level of [1, 2, 3, 4] as Level[]) {
    it(`level ${level}: no miss text contains the answer for any wrong setting`, () => {
      const d = dialOf(level);
      for (const r of rowsOf(level)) {
        for (const x of range(d.min, d.max)) {
          if (judge(r, setting(r, x))) continue;
          const text = missText(r, setting(r, x)).split(own(r, x)).join('');
          expect(has(text, token(r)), `${text} | answer ${token(r)}`).toBe(false);
          expect(text.length).toBeGreaterThan(20);
        }
      }
    });
  }

  it('the force check, the hint and the intel never contain the answer', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      const d = dialOf(level);
      for (const base of rowsOf(level)) {
        for (const assist of [0, 1, 2] as const) {
          const r = { ...base, assist } as Round;
          expect(has(hintText(r), token(r))).toBe(false);
          expect(has(intel(r), token(r))).toBe(false);
          expect(has(goalText(r), token(r))).toBe(false);
          for (const x of range(d.min, d.max, 3)) {
            if (judge(r, setting(r, x))) continue;
            expect(has(checkText(r, setting(r, x)).split(own(r, x)).join(''), token(r))).toBe(false);
          }
        }
      }
    }
  });

  it('a win says Melted! and shows the working', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      for (const r of rowsOf(level)) {
        const w = winText(r);
        expect(w).toMatch(/^Melted!/);
        expect(w).toContain(level === 1 || level === 4 ? 'k q Q / h² = m g' : 'q = m g h²');
        expect(w).toContain(token(r).replace(/ (nC|pC|cm)$/, ' $1'));
      }
    }
  });

  it('the miss text of level 3 names what happened: pulled down, uncharged, or the sign was right', () => {
    const r = round('signed', SIGNED[0][0]); // base −20 nC
    expect(missText(r, { q: 23 })).toMatch(/pulled down onto the base/);
    expect(missText(r, { q: 23 })).toMatch(/negative base/);
    expect(missText(r, { q: 0 })).toMatch(/uncharged/);
    expect(missText(r, { q: -5 })).toMatch(/sign was right, but the bead floated below the beam: more charge/);
    expect(missText(r, { q: -30 })).toMatch(/floated above the beam: less charge/);
    const pos = round('signed', SIGNED[0][1]);
    expect(missText(pos, { q: -4 })).toMatch(/positive base/);
  });

  it('the miss texts of every level say which way to change the setting', () => {
    expect(missText(round('float', FLOAT[0][0]), { q: 2 })).toMatch(/More charge floats it higher/);
    expect(missText(round('float', FLOAT[0][0]), { q: 9 })).toMatch(/Less charge floats it lower/);
    expect(missText(round('tiny', TINY[0][0]), { q: 2 })).toMatch(/2 pC.*More charge/);
    expect(missText(round('aim', AIM[0][0]), { h: 12 })).toMatch(/Lower the laser/);
    expect(missText(round('aim', AIM[0][0]), { h: 6 })).toMatch(/Raise the laser/);
  });

  it('the force check names the direction of the force and uses the right unit', () => {
    const f = round('float', FLOAT[0][0]);
    expect(checkText(f, { q: 4 })).toMatch(/^Force check: in the beam, a 4 nC bead is pushed up with [\d.]+ mN; its weight is 9\.8 mN\.$/);
    const s = round('signed', SIGNED[0][0]);
    expect(checkText(s, { q: 23 })).toMatch(/a \+23 pC bead is pulled down with/);
    expect(checkText(s, { q: 0 })).toMatch(/not pushed at all; its weight is 196 µN\./);
    expect(checkText(round('aim', AIM[0][0]), { h: 12 })).toMatch(/^Force check: at 12 cm the base pushes the bead up with [\d.]+ mN; its weight is 9\.8 mN\.$/);
  });

  it('the gauge texts: live reading, signed cases, and the level 4 push and weight line', () => {
    expect(lcdText(round('float', FLOAT[0][0]), { q: 4 })).toBe('floats at 8.57 cm');
    expect(lcdText(round('signed', SIGNED[0][0]), { q: 0 })).toBe('no push');
    expect(lcdText(round('signed', SIGNED[0][0]), { q: 5 })).toBe('pulled to the base');
    expect(lcdText(round('signed', SIGNED[0][0]), { q: -23 })).toBe('floats at 4.6 mm');
    expect(lcdText(round('aim', AIM[0][0]), { h: 19 })).toMatch(/^at 19 cm: push [\d.]+ mN · weight 9\.8 mN$/);
  });

  it('the hint line fades round by round', () => {
    const r = FLOAT[0][0];
    expect(hintText(round('float', r, 0))).toMatch(/Round 1: the float gauge is live/);
    expect(hintText(round('float', r, 1))).toMatch(/a force check costs a charge/);
    expect(hintText(round('float', r, 2))).toMatch(/Final chamber: no gauge/);
  });

  it('the goal lines name the fact the round gives, never the answer', () => {
    expect(goalText(round('float', FLOAT[0][0]))).toBe('Melt the bead: beam at 8.57 cm');
    expect(goalText(round('tiny', TINY[0][0]))).toBe('Melt the bead: beam at 4.98 mm');
    expect(goalText(round('signed', SIGNED[0][0]))).toBe('Melt the bead: base −20 nC, beam at 4.6 mm');
    expect(goalText(round('aim', AIM[0][0]))).toBe('Bead charged +4.41 nC: aim the laser');
  });
});

describe('typing the result', () => {
  it('the types of the fault are the four the scene draws', () => {
    const all: Fault[] = ['low', 'high', 'pulled', 'flat'];
    const seen = new Set<Fault>();
    for (const row of signedRows) {
      const r = round('signed', row);
      for (const x of range(-40, 40)) {
        const f = fault(r, { q: x });
        if (f) seen.add(f);
      }
    }
    expect([...seen].sort()).toEqual([...all].sort());
  });
});
