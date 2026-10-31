import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import {
  COIL, DIAL, HOVER, MARKS, MATCH, SAW, VERDICT_AT, buildRounds, cardText, coilAnswer, coilMoment, coilTop, fault, goalText, hintText, judge, missText, other, pieceMoment, pieceTop,
  rehearsalText, ringPose, sawAnswer, winText, type CoilRow, type MatchRow, type Round, type SawRow,
} from './logic';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const range = (lo: number, hi: number, step = 1) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const sig3 = (x: number) => Number(x.toPrecision(3)) === x;
const rel = (a: number, b: number) => Math.abs(a / b - 1);

describe('the pools', () => {
  it('saw rows: need is a whole number of twelfths of m0, 2 to 10 marks, 3 figures, with marks far apart', () => {
    for (const rows of SAW) {
      for (const r of rows) {
        const k = (MARKS * r.need) / r.m0;
        expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-9);
        expect(Math.round(k)).toBeGreaterThanOrEqual(2);
        expect(Math.round(k)).toBeLessThanOrEqual(10);
        expect(Math.abs(pieceMoment(r, Math.round(k)) - r.need)).toBeLessThan(1e-9);
        expect(sig3(r.need)).toBe(true);
        expect(r.m0 / 12 / r.need).toBeGreaterThanOrEqual(0.07);
      }
    }
  });

  it('round 1 saws along the length, rounds 2 and 3 saw a piece off the left end', () => {
    expect(SAW[0].every((r) => r.cut === 'along')).toBe(true);
    expect(SAW[1].every((r) => r.cut === 'across')).toBe(true);
    expect(SAW[2].every((r) => r.cut === 'across')).toBe(true);
  });

  it('coil and match rows: the answer is a multiple of 50 inside the dial, and no other turn count is within 3%', () => {
    for (const pool of [COIL, MATCH] as (CoilRow | MatchRow)[][][]) {
      for (const rows of pool) {
        for (const r of rows) {
          const { n } = coilAnswer(r);
          const need = 'need' in r ? r.need : r.mBar;
          expect(n % 50).toBe(0);
          expect(n).toBeGreaterThan(100);
          expect(n).toBeLessThan(1500);
          expect(rel(coilMoment(r, n), need)).toBeLessThan(1e-6);
          for (const m of range(DIAL.n.min, DIAL.n.max, DIAL.n.step)) {
            if (m !== n) expect(rel(coilMoment(r, m), need)).toBeGreaterThan(0.03);
          }
        }
      }
    }
  });

  it('the answers listed in the pool comments are the ones the rules give', () => {
    const l2 = COIL.map((rows) => rows.map((r) => `${coilAnswer(r).n}/${coilAnswer(r).dir}`));
    expect(l2).toEqual([['800/1', '500/0', '300/0', '600/1'], ['1000/0', '700/1', '900/0', '450/1'], ['1100/1', '350/0', '1300/0', '250/1']]);
    const l3 = MATCH.map((rows) => rows.map((r) => `${coilAnswer(r).n}/${coilAnswer(r).dir}`));
    expect(l3).toEqual([['600/0', '700/1', '400/1', '500/0'], ['850/1', '1200/0', '550/0', '750/1'], ['1400/0', '950/1', '650/1', '1050/0']]);
    const l1 = SAW.map((rows) => rows.map((r) => `${sawAnswer(r).k}/${sawAnswer(r).up}`));
    expect(l1).toEqual([['4/0', '7/1', '9/1', '4/0'], ['3/0', '6/1', '8/0', '3/1'], ['5/1', '2/1', '10/0', '5/0']]);
  });
});

describe('exactly one winner', () => {
  const settings = (level: number): Record<string, number>[] =>
    level === 1
      ? range(DIAL.k.min, DIAL.k.max).flatMap((k) => [0, 1].map((up) => ({ k, up })))
      : range(DIAL.n.min, DIAL.n.max, DIAL.n.step).flatMap((n) => [0, 1].map((dir) => ({ n, dir })));
  for (const level of [1, 2, 3] as const) {
    it(`level ${level}: only the answer passes, and the start setting fails`, () => {
      for (const seed of SEEDS) {
        for (const r of buildRounds(level, createRng(seed))) {
          const ans = r.kind === 'saw' ? sawAnswer(r) : coilAnswer(r);
          const winners = settings(level).filter((x) => judge(r, x));
          expect(winners).toEqual([ans]);
          const start = level === 1 ? { k: DIAL.k.start, up: DIAL.up.start } : { n: DIAL.n.start, dir: DIAL.dir.start };
          expect(judge(r, start)).toBe(false);
        }
      }
    });
  }
});

describe('rounds', () => {
  for (const level of [1, 2, 3] as const) {
    it(`level ${level}: three rounds of the right kind, assist 0, 1, 2, row k from pool k, no repeated answer`, () => {
      const pool = [SAW, COIL, MATCH][level - 1] as unknown[][];
      const kind = ['saw', 'coil', 'match'][level - 1];
      for (const seed of SEEDS) {
        const rounds = buildRounds(level, createRng(seed));
        expect(rounds.length).toBe(3);
        expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
        const answers = new Set<string>();
        rounds.forEach((r, k) => {
          expect(r.kind).toBe(kind);
          const { kind: _k, assist: _a, ...row } = r;
          expect(pool[k]).toContainEqual(row);
          answers.add(JSON.stringify(r.kind === 'saw' ? sawAnswer(r) : coilAnswer(r as CoilRow & { kind: 'coil' })));
        });
        expect(answers.size).toBe(3);
      }
    });
  }
});

describe('the physics', () => {
  it('pieceTop follows the bar: the left end of an across piece is the bar’s left pole and the sawn face is the opposite', () => {
    for (const rows of SAW) {
      for (const r of rows) {
        expect(pieceTop(r, 0)).toBe(r.nLeft ? 'N' : 'S');
        expect(pieceTop(r, 1)).toBe(other(pieceTop(r, 0)));
        if (r.cut === 'across') expect(pieceTop(r, 1)).toBe(r.nLeft ? 'S' : 'N');
      }
    }
  });

  it('coilTop(1) is N, coilTop(0) is S', () => {
    expect(coilTop(1)).toBe('N');
    expect(coilTop(0)).toBe('S');
  });

  it('fault: snap for the right size with the wrong pole, low one step down, high one step up', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      for (const level of [1, 2, 3] as const) {
        for (const r of buildRounds(level, createRng(seed))) {
          if (r.kind === 'saw') {
            const a = sawAnswer(r);
            expect(fault(r, { k: a.k, up: 1 - a.up })).toBe('snap');
            expect(fault(r, { k: a.k - 1, up: a.up })).toBe('low');
            expect(fault(r, { k: a.k + 1, up: a.up })).toBe('high');
            expect(fault(r, a)).toBeNull();
          } else {
            const a = coilAnswer(r);
            expect(fault(r, { n: a.n, dir: 1 - a.dir })).toBe('snap');
            expect(fault(r, { n: a.n - 50, dir: a.dir })).toBe('low');
            expect(fault(r, { n: a.n + 50, dir: a.dir })).toBe('high');
            expect(fault(r, a)).toBeNull();
          }
        }
      }
    }
  });

  it('the pole is checked first: the wrong pole snaps at every size', () => {
    const r = buildRounds(2, createRng(3))[0];
    const a = coilAnswer(r as CoilRow & { kind: 'coil' });
    for (const n of range(DIAL.n.min, DIAL.n.max, DIAL.n.step)) expect(fault(r, { n, dir: 1 - a.dir })).toBe('snap');
  });
});

describe('the ring flies to fixed heights', () => {
  it('HOVER is exactly the brief’s', () => {
    expect(HOVER).toEqual({ start: 78, win: 124, low: 200, snap: 222 });
  });
  it('hangs in the clip until 0.7 s, then settles at the fixed height of its outcome', () => {
    for (const out of ['win', 'low', 'snap', 'high'] as const) expect(ringPose(out, 0.5).y).toBe(HOVER.start);
    expect(ringPose('win', 1.15).y).toBeCloseTo(HOVER.win, 6);
    expect(ringPose('low', 1.15).y).toBeCloseTo(HOVER.low, 6);
    expect(ringPose('snap', 1.2).y).toBe(HOVER.snap);
    expect(Math.abs(ringPose('win', 2.2).y - HOVER.win)).toBeLessThanOrEqual(3);
    expect(Math.abs(ringPose('low', 2.2).y - HOVER.low)).toBeLessThanOrEqual(1);
  });
  it('the high ring flies off the wand and lands on the rabbit’s ears at 1.3 s', () => {
    const p = ringPose('high', 1.3);
    expect([p.x, p.y]).toEqual([520, 236]);
    expect(ringPose('high', 1.0).spin).toBe(true);
    expect(ringPose('high', 0.85).y).toBeCloseTo(58, 6);
  });
  it('the verdict lands once the ring has reached its place', () => {
    expect(VERDICT_AT).toBe(1.2);
  });
});

describe('words', () => {
  const all = (fn: (r: Round, level: number) => void) => {
    for (const seed of SEEDS.slice(0, 12)) for (const level of [1, 2, 3] as const) for (const r of buildRounds(level, createRng(seed))) fn(r, level);
  };

  it('a miss never contains the answer token, and a snap never prints a mark or a turn count', () => {
    all((r) => {
      const a = r.kind === 'saw' ? sawAnswer(r) : coilAnswer(r);
      const token = r.kind === 'saw' ? `mark ${(a as { k: number }).k}` : `${(a as { n: number }).n} turns`;
      const xs = r.kind === 'saw' ? range(DIAL.k.min, DIAL.k.max).flatMap((k) => [0, 1].map((up) => ({ k, up }))) : range(DIAL.n.min, DIAL.n.max, DIAL.n.step).flatMap((n) => [0, 1].map((dir) => ({ n, dir })));
      for (const x of xs) {
        if (judge(r, x)) continue;
        const t = missText(r, x);
        expect(has(t, token)).toBe(false);
        if (fault(r, x) === 'snap') {
          expect(t).not.toMatch(/mark/);
          expect(t).not.toMatch(/\d turns/); // the brief's own text says "the front turns", which is fine; a count of turns is not
          expect(t).toMatch(/snapped down/);
        }
        if (r.kind === 'saw') {
          const a2 = a as { k: number };
          expect(t).not.toContain(`${a2.k}/12`);
        }
      }
    });
  });

  it('a miss ends with a plain change to make and no moment or pole of the right setting', () => {
    all((r) => {
      const a = r.kind === 'saw' ? sawAnswer(r) : coilAnswer(r);
      const x = r.kind === 'saw' ? { k: (a as { k: number }).k + 1, up: (a as { up: number }).up } : { n: (a as { n: number }).n + 50, dir: (a as { dir: number }).dir };
      const t = missText(r, x);
      expect(t).toMatch(/(smaller piece|fewer turns)\.$/);
    });
  });

  it('winText names the idea of each level', () => {
    all((r, level) => {
      const t = winText(r);
      expect(t.startsWith('Ta-da!')).toBe(true);
      if (level === 1) expect(t).toMatch(/whole magnet/);
      if (level === 2) expect(t).toContain('m = NIA');
      if (level === 3) expect(t).toContain('Same moment, same field');
      expect(t.split(/[.!] /).length).toBeLessThanOrEqual(4);
    });
  });

  it('every goal line is at most 44 characters and the card text reads m and the top pole', () => {
    all((r) => {
      expect(goalText(r).length).toBeLessThanOrEqual(44);
      const x = r.kind === 'saw' ? { k: 3, up: 1 } : { n: 300, dir: 1 };
      expect(cardText(r, x)).toMatch(/^m .* J\/T · top [NS]$/);
      expect(rehearsalText(r, x)).toMatch(/^Rehearsal: /);
    });
  });

  it('the hint line fades with the round', () => {
    const rounds = buildRounds(1, createRng(5));
    expect(hintText(rounds[0])).toMatch(/Round 1: the rehearsal card is live/);
    expect(hintText(rounds[1])).toMatch(/a rehearsal costs a charge/);
    expect(hintText(rounds[2])).toMatch(/Gala night: no rehearsal/);
  });

  it('the rehearsal gives the moment and the pole of the player’s own setting', () => {
    const r = buildRounds(1, createRng(5))[0] as Round & { kind: 'saw' };
    const t = rehearsalText(r, { k: 6, up: 0 });
    expect(t).toContain(`${r.m0 / 2}`);
    expect(t).toContain(`${pieceTop(r as SawRow, 0)} pole`);
  });
});
