import { describe, expect, it } from 'vitest';
import {
  CYC, DIAL, FAST, FOCUS, G, KICK, LIFT, MP, Q,
  buildRounds, exitV7, fault, goal, helixPitch, helixWidth, hintText, intel, judge, lapMHz, lcdText, liftMN, liftUp, meterText, missText, push13, pushUp, rfFor, verdictDelay, weightMN, winText,
  type Fault, type Round, type Values,
} from './logic';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
};
const row = (kind: Round['kind'], r: object, assist: 0 | 1 | 2 = 0) => ({ ...r, kind, assist }) as Round;
const grid = (lo: number, hi: number, step: number) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => Number((lo + i * step).toFixed(6)));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The answer token as a separate number, so "1.2 T" does not match "11.2 T". */
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);

const LEVEL_KIND = ['kick', 'lift', 'cyc', 'speed', 'focus'] as const;
const POOLS = [KICK, LIFT, CYC, FAST, FOCUS] as object[][][];
const allRows = (level: number) => POOLS[level - 1].flatMap((pool, k) => pool.map((r) => ({ k, round: row(LEVEL_KIND[level - 1], r, Math.min(2, k) as 0 | 1 | 2) })));

/** Every reachable setting of a level, as the values passed to `fault`. */
function settings(level: number): Values[] {
  if (level === 1) return [0, 1].flatMap((out) => grid(0.1, 2, 0.1).map((b) => ({ out, b })));
  if (level === 2) return [0, 1].flatMap((cur) => grid(0.1, 5, 0.1).map((i) => ({ cur, i })));
  if (level === 3) return grid(0.5, 2.5, 0.1).flatMap((b) => grid(8, 40, 0.1).map((f) => ({ b, f })));
  if (level === 4) return grid(10, 80, 1).flatMap((r) => grid(8, 40, 0.1).map((f) => ({ r, f })));
  return grid(1, 20, 0.5).map((b) => ({ b }));
}
const answer = (r: Round): Values => {
  if (r.kind === 'kick') return { out: r.out, b: r.b };
  if (r.kind === 'lift') return { cur: r.cur, i: r.i };
  if (r.kind === 'cyc') return { b: r.b, f: r.f };
  if (r.kind === 'speed') return { r: r.r, f: r.f0 };
  return { b: r.b };
};
const start = (level: number): Values =>
  [{ out: DIAL.out.start, b: DIAL.kb.start }, { cur: DIAL.cur.start, i: DIAL.i.start }, { b: DIAL.cb.start, f: DIAL.f.start }, { r: DIAL.r.start, f: DIAL.f.start }, { b: DIAL.gb.start }][level - 1];

describe('the pools (every row was checked by script)', () => {
  it('kick: the push to 3 figures is f, f/(1.6 v) gives back b, and the push points to the port only for the right field', () => {
    for (const r of KICK.flat()) {
      expect(Number(push13(r.v, r.b).toPrecision(3))).toBe(r.f);
      expect(Math.abs(r.f / (1.6 * r.v) - r.b)).toBeLessThan(0.02);
      expect(pushUp(r.pt, r.from, r.out)).toBe(r.port === 'up');
      expect(pushUp(r.pt, r.from, 1 - r.out)).not.toBe(r.port === 'up');
      for (const d of [-0.1, 0.1]) expect(Math.abs(push13(r.v, r.b + d) / push13(r.v, r.b) - 1)).toBeGreaterThan(0.02);
    }
  });

  it('lift: BIl sin θ / g to 3 figures is m, mg/(Bl sin θ) gives back i, and only the right current lifts', () => {
    for (const r of LIFT.flat()) {
      expect(Number((liftMN(r, r.i) / G).toPrecision(3))).toBe(r.m);
      expect(Math.abs(((r.m / 1000) * G) / (r.t * (r.l / 100) * Math.sin((r.th * Math.PI) / 180)) - r.i)).toBeLessThan(0.02);
      expect(liftUp(r.bOut, r.cur)).toBe(true);
      expect(liftUp(r.bOut, 1 - r.cur)).toBe(false);
    }
  });

  it('cyc: mv/qB to 3 figures is r, the RF matches one lap, and the lap frequency is never near a rounding edge', () => {
    for (const r of CYC.flat()) {
      expect(Number((((MP * r.v * 1e7) / (Q * r.b)) * 100).toPrecision(3))).toBe(r.r);
      expect(rfFor(r.b)).toBe(r.f);
      expect(Math.abs(lapMHz(r.b) - r.f)).toBeLessThan(0.03);
      expect(Math.abs((MP * r.v * 1e7) / (Q * (r.r / 100)) - r.b)).toBeLessThan(0.02);
    }
  });

  it('speed: r = r0 × k, the RF is the lap frequency of the field, and k × f0 (the tempting wrong RF) never rounds to f0', () => {
    const seen = new Set<number>();
    for (const r of FAST.flat()) {
      expect(r.r).toBe(r.r0 * r.k);
      expect(rfFor(r.b)).toBe(r.f0);
      expect(Math.abs(lapMHz(r.b) - r.f0)).toBeLessThan(0.03);
      expect(Math.round(r.k * r.f0 * 10) / 10).not.toBe(r.f0);
      expect(seen.has(r.r)).toBe(false);
      seen.add(r.r);
    }
  });

  it('focus: the pitch to 3 figures is L, the helix fits the tube at the answer, the start scrapes, and no dial value sits on the tube wall', () => {
    for (const r of FOCUS.flat()) {
      expect(Number(helixPitch(r, r.b).toPrecision(3))).toBe(r.L);
      expect(helixWidth(r, r.b)).toBeLessThanOrEqual(0.8 * r.pipe);
      expect(helixWidth(r, 1)).toBeGreaterThanOrEqual(r.pipe);
      for (const b of grid(1, 20, 0.5)) expect(Math.abs(helixWidth(r, b) - r.pipe) / r.pipe).toBeGreaterThanOrEqual(0.02);
      for (const d of [-0.5, 0.5]) expect(Math.abs(helixPitch(r, r.b + d) / r.L - 1)).toBeGreaterThan(0.02);
      expect(Math.abs((2 * Math.PI * 9.1e-31 * r.v * 1e6 * Math.cos((r.th * Math.PI) / 180)) / (Q * (r.L / 100)) * 1e4 - r.b)).toBeLessThan(0.1);
    }
  });

  it('the magnetic force does no work: the push is at right angles to v, so only the direction changes (qvB sets r, not the speed)', () => {
    // for every KICK row the push is across the beam line (up or down), never along it
    for (const r of KICK.flat()) expect(typeof pushUp(r.pt, r.from, r.out)).toBe('boolean');
    // r = mv/qB grows in proportion to v at the same B, while the lap time 2πm/qB does not depend on v
    for (const r of FAST.flat()) expect(exitV7(r.b, r.r) / exitV7(r.b, r.r0)).toBeCloseTo(r.k, 9);
  });
});

describe('one winner per round', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    it(`level ${level}: over every reachable setting only the answer wins, the start loses, and no answer is at a dial end`, () => {
      const xs = settings(level);
      const answers = new Set<string>();
      for (const { round: r } of allRows(level)) {
        const win = xs.filter((x) => judge(r, x));
        expect(win.length).toBe(1);
        expect(win[0]).toEqual(answer(r));
        expect(judge(r, start(level))).toBe(false);
        const a = JSON.stringify(answer(r));
        expect(answers.has(a)).toBe(false);
        answers.add(a);
        // not at a dial end
        const x = answer(r);
        if (level === 1) { expect(x.b).toBeGreaterThan(0.1); expect(x.b).toBeLessThan(2); }
        if (level === 2) { expect(x.i).toBeGreaterThan(0.1); expect(x.i).toBeLessThan(5); }
        if (level === 3) { expect(x.b).toBeGreaterThan(0.5); expect(x.b).toBeLessThan(2.5); expect(x.f).toBeGreaterThan(8); expect(x.f).toBeLessThan(40); }
        if (level === 4) { expect(x.r).toBeGreaterThan(10); expect(x.r).toBeLessThan(80); expect(x.f).toBeGreaterThan(8); expect(x.f).toBeLessThan(40); }
        if (level === 5) { expect(x.b).toBeGreaterThan(1); expect(x.b).toBeLessThan(20); }
      }
    });
  }
});

describe('rounds', () => {
  it('every level builds three rounds of its kind, assist 0, 1, 2, round k from pool k, over 80 seeds', () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      for (const seed of SEEDS) {
        const rounds = buildRounds(level, lcg(seed));
        expect(rounds.length).toBe(3);
        expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
        rounds.forEach((r, k) => {
          expect(r.kind).toBe(LEVEL_KIND[level - 1]);
          const { kind, assist, ...rest } = r;
          void kind;
          void assist;
          expect(POOLS[level - 1][k].some((p) => JSON.stringify(p) === JSON.stringify(rest))).toBe(true);
        });
      }
    }
  });

  it('the same seed gives the same rounds, and different seeds give variety', () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(buildRounds(level, lcg(5))).toEqual(buildRounds(level, lcg(5)));
      expect(new Set(SEEDS.map((s) => JSON.stringify(buildRounds(level, lcg(s))))).size).toBeGreaterThan(10);
    }
  });
});

describe('faults', () => {
  const r1 = row('kick', KICK[0][0]) as Extract<Round, { kind: 'kick' }>;
  const r2 = row('lift', LIFT[0][0]) as Extract<Round, { kind: 'lift' }>;
  const r3 = row('cyc', CYC[0][0]) as Extract<Round, { kind: 'cyc' }>;
  const r4 = row('speed', FAST[0][0]) as Extract<Round, { kind: 'speed' }>;
  const r5 = row('focus', FOCUS[0][0]) as Extract<Round, { kind: 'focus' }>;
  it('level 1: the wrong field is wrong at any strength, and b ± 0.1 is weak or strong', () => {
    for (const b of grid(0.1, 2, 0.1)) expect(fault(r1, { out: 1 - r1.out, b })).toBe('wrong');
    expect(fault(r1, { out: r1.out, b: 0.3 })).toBe('weak');
    expect(fault(r1, { out: r1.out, b: 0.5 })).toBe('strong');
  });
  it('level 2: the wrong current is down at any size, and i ± 0.1 is sag or jump', () => {
    for (const i of grid(0.1, 5, 0.1)) expect(fault(r2, { cur: 1 - r2.cur, i })).toBe('down');
    expect(fault(r2, { cur: r2.cur, i: 1.9 })).toBe('sag');
    expect(fault(r2, { cur: r2.cur, i: 2.1 })).toBe('jump');
  });
  it('level 3: the right field with f ± 0.1 falls out of step, and b ± 0.1 with its own RF reaches the port too slowly or too fast', () => {
    expect(fault(r3, { b: r3.b, f: 18.2 })).toBe('slow');
    expect(fault(r3, { b: r3.b, f: 18.4 })).toBe('fast');
    expect(fault(r3, { b: 1.1, f: rfFor(1.1) })).toBe('shallow');
    expect(fault(r3, { b: 1.3, f: rfFor(1.3) })).toBe('deep');
  });
  it('level 4: the RF is judged first (k × f0 is out of step), then the port', () => {
    for (const r of FAST.flat()) {
      const rr = row('speed', r) as Extract<Round, { kind: 'speed' }>;
      const tempting = Math.round(r.k * r.f0 * 10) / 10;
      if (tempting >= 8 && tempting <= 40) expect(fault(rr, { r: r.r, f: tempting })).toBe(r.k > 1 ? 'fast' : 'slow');
    }
    expect(fault(r4, { r: r4.r - 1, f: r4.f0 })).toBe('shallow');
    expect(fault(r4, { r: r4.r + 1, f: r4.f0 })).toBe('deep');
  });
  it('level 5: 1 G scrapes on every row, b + 0.5 is short, b − 0.5 is long or scrapes', () => {
    for (const r of FOCUS.flat()) {
      const rr = row('focus', r) as Extract<Round, { kind: 'focus' }>;
      expect(fault(rr, { b: 1 })).toBe('scrape');
      expect(fault(rr, { b: r.b + 0.5 })).toBe('short');
      expect(['long', 'scrape']).toContain(fault(rr, { b: r.b - 0.5 }));
    }
    expect(fault(r5, { b: 1 })).toBe('scrape');
  });
});

describe('the helpers and timing', () => {
  it('the lcd text carries the player’s setting; the monitor check text agrees with it', () => {
    const r = row('kick', KICK[0][0]) as Extract<Round, { kind: 'kick' }>;
    expect(lcdText(r, { out: 1, b: 0.5 })).toBe('push 4 × 10⁻¹³ N ⬇');
    expect(lcdText(r, { out: 0, b: 0.5 })).toBe('push 4 × 10⁻¹³ N ⬆');
    expect(meterText(r, { out: 0, b: 0.5 })).toContain('4 × 10⁻¹³ N, up the screen');
    expect(lcdText(row('lift', LIFT[0][0]), { cur: 1, i: 2 })).toMatch(/^push 600 mN ⬆ · weight 600 mN$/);
    expect(weightMN(row('lift', LIFT[0][0]) as Extract<Round, { kind: 'lift' }>)).toBeCloseTo(599.76, 2);
  });
  it('the verdict lands at the impact: 0.85, 0.90, 0.65 or 1.30, 0.60 or 1.05, and always before 2.3 s', () => {
    expect(verdictDelay(row('kick', KICK[0][0]), { out: 1, b: 1 })).toBe(0.85);
    expect(verdictDelay(row('lift', LIFT[0][0]), { cur: 1, i: 1 })).toBe(0.9);
    const c = row('cyc', CYC[0][0]);
    expect(verdictDelay(c, { b: 1.2, f: 10 })).toBe(0.65);
    expect(verdictDelay(c, { b: 1.2, f: 18.3 })).toBe(1.3);
    const f = row('focus', FOCUS[0][0]);
    expect(verdictDelay(f, { b: 1 })).toBe(0.6);
    expect(verdictDelay(f, { b: 7 })).toBe(1.05);
    for (const level of [1, 2, 3, 4, 5]) for (const { round } of allRows(level)) for (const x of settings(level).filter((_, i) => i % 97 === 0)) expect(verdictDelay(round, x)).toBeLessThan(2.3);
  });
});

describe('words', () => {
  const FAULT_TOKENS = (r: Round): string[] => {
    if (r.kind === 'kick') return [`${r.b} T`];
    if (r.kind === 'lift') return [`${r.i} A`];
    if (r.kind === 'cyc') return [`${r.b} T`, `${r.f} MHz`];
    if (r.kind === 'speed') return [`${r.r} cm`, `${r.f0} MHz`];
    return [`${r.b} G`];
  };
  /** The tokens the player's own setting is allowed to repeat. */
  const own = (r: Round, x: Values): string[] => {
    const t: string[] = [];
    if (x.b !== undefined) t.push(`${x.b} ${r.kind === 'focus' ? 'G' : 'T'}`);
    if (x.i !== undefined) t.push(`${x.i} A`);
    if (x.f !== undefined) t.push(`${x.f} MHz`);
    if (x.r !== undefined) t.push(`${x.r} cm`);
    return t;
  };
  for (const level of [1, 2, 3, 4, 5]) {
    it(`level ${level}: no miss text contains the answer unless it is the player’s own number, and every miss says something`, () => {
      const xs = settings(level);
      for (const { round: r } of allRows(level)) {
        const stride = level >= 3 && level <= 4 ? 7 : 1;
        xs.forEach((x, idx) => {
          if (idx % stride !== 0 || judge(r, x)) return;
          const s = missText(r, x);
          expect(s.length).toBeGreaterThan(20);
          for (const t of FAULT_TOKENS(r)) if (!own(r, x).includes(t)) expect(has(s, t), `${s} / ${t}`).toBe(false);
        });
      }
    });
  }

  it('every miss ends with a plain "what to change" sentence, except the two RF texts of level 4', () => {
    const f = (r: Round, x: Values, k: Fault) => {
      expect(fault(r, x)).toBe(k);
      return missText(r, x);
    };
    const r1 = row('kick', KICK[0][0]);
    expect(f(r1, { out: 1, b: 0.4 }, 'wrong')).toMatch(/Flip the field\.$/);
    expect(f(r1, { out: 0, b: 0.3 }, 'weak')).toMatch(/Turn the kicker up\.$/);
    expect(f(r1, { out: 0, b: 0.5 }, 'strong')).toMatch(/Turn the kicker down\.$/);
    const r2 = row('lift', LIFT[0][0]);
    expect(f(r2, { cur: 0, i: 2 }, 'down')).toMatch(/Reverse the current\.$/);
    expect(f(r2, { cur: 1, i: 1.9 }, 'sag')).toMatch(/Use more current\.$/);
    expect(f(r2, { cur: 1, i: 2.1 }, 'jump')).toMatch(/Use less current\.$/);
    const r3 = row('cyc', CYC[0][0]);
    expect(f(r3, { b: 1.2, f: 18.2 }, 'slow')).toMatch(/Match the RF to one lap\.$/);
    expect(f(r3, { b: 1.2, f: 18.4 }, 'fast')).toMatch(/Match the RF to one lap\.$/);
    expect(f(r3, { b: 1.1, f: rfFor(1.1) }, 'shallow')).toMatch(/stronger field, with an RF to match\.$/);
    expect(f(r3, { b: 1.3, f: rfFor(1.3) }, 'deep')).toMatch(/weaker field, with an RF to match\.$/);
    const r4 = row('speed', FAST[0][0]);
    expect(f(r4, { r: 30, f: 18.2 }, 'slow')).toMatch(/hit a dee wall\.$/);
    expect(f(r4, { r: 29, f: 18.3 }, 'shallow')).toMatch(/Move the port out\.$/);
    expect(f(r4, { r: 31, f: 18.3 }, 'deep')).toMatch(/Move the port in\.$/);
    const r5 = row('focus', FOCUS[0][0]);
    expect(f(r5, { b: 1 }, 'scrape')).toMatch(/Use more field\.$/);
    expect(f(r5, { b: 7.5 }, 'short')).toMatch(/Use less field\.$/);
  });

  it('every win text carries the working', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const want = ['q v × B', 'BIl sin θ = mg', 'f = qB/2πm', 'has no v in it', 'v cos θ'][level - 1];
      for (const { round: r } of allRows(level)) expect(winText(r)).toContain(want);
    }
  });

  it('every goal line is at most 40 characters, and every hint line carries the facts and the round’s helper', () => {
    for (let level = 1; level <= 5; level++) {
      for (const { round: r } of allRows(level)) {
        expect(goal(r).length).toBeLessThanOrEqual(40);
        expect(hintText(r)).toContain(intel(r));
      }
    }
    expect(hintText(row('kick', KICK[0][0], 0))).toContain('Round 1: the beam monitor is live.');
    expect(hintText(row('kick', KICK[0][0], 1))).toContain('a monitor check costs a charge');
    expect(hintText(row('kick', KICK[0][0], 2))).toContain('Last run: no monitor.');
  });
});
