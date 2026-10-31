import { describe, expect, it } from 'vitest';
import { fmt } from '@core/judge';
import { createRng } from '@core/random';
import {
  ARROW, COIL, DIAL, DOCK, FIELD3, FIELD4, FIXED, PARK, SPIN, SPIN_END, SWING, TLM_OFF, TUMBLE,
  answerOf, buildRounds, checkText, coilTau, dockAnswer, dockU, fault, fieldAt, fieldDeg, goalText, hintText, judge, missText, outcomeOf, parkAnswer, parkTheta, spinG,
  spinTau, startOf, starDeg, stopAt, tlmText, verdictAt, winText, type Round, type Values,
} from './logic';

type L = 1 | 2 | 3 | 4 | 5;
const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const KINDS = ['spin', 'park', 'swing', 'coil', 'dock'] as const;
const POOLS = [SPIN, PARK, SWING, COIL, DOCK] as unknown[][][];
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const rowsOf = (level: L): Round[] => POOLS[level - 1].flatMap((pool) => pool.map((row) => ({ ...(row as object), kind: KINDS[level - 1], assist: 0 }) as Round));
const steps = (d: { min: number; max: number; step: number }) => Array.from({ length: Math.round((d.max - d.min) / d.step) + 1 }, (_, i) => Math.round((d.min + i * d.step) * 1000) / 1000);
/** Every reachable setting of a level's dials. */
function settings(level: L, r: Round): Values[] {
  if (level === 1 || level === 3) return steps(DIAL.m).map((m) => ({ m }));
  if (level === 2) return steps(DIAL.h).map((h) => ({ h }));
  if (level === 4) return steps(DIAL.i).flatMap((i) => [0, 1].map((thr) => ({ i, thr })));
  void r;
  return [0, 1].flatMap((port) => [0, 1, 2, 3].map((q) => ({ port, q })));
}
const same = (a: Values, b: Values) => (Object.keys(a) as (keyof Values)[]).every((k) => a[k] === b[k] || (typeof a[k] === 'number' && Math.abs(a[k]! - b[k]!) < 1e-6));
const LEVELS: L[] = [1, 2, 3, 4, 5];

describe('the pools', () => {
  it('have the row counts of the brief', () => {
    expect(SPIN.map((p) => p.length)).toEqual([4, 4, 4]);
    expect(PARK.map((p) => p.length)).toEqual([4, 4, 4]);
    expect(SWING.map((p) => p.length)).toEqual([4, 4, 4]);
    expect(COIL.map((p) => p.length)).toEqual([4, 4, 4]);
    expect(DOCK.map((p) => p.length)).toEqual([4, 2, 2]);
  });

  it('level 1: the shown torque is the true torque at the answer (3 figures)', () => {
    for (const r of rowsOf(1) as Extract<Round, { kind: 'spin' }>[]) expect(Number(fmt(spinTau(r, r.m))), `${r.b} ${r.th}`).toBe(r.tau);
  });

  it('level 2: the heading answer is a multiple of 15, never at an end or the start, and torque-free', () => {
    for (const r of rowsOf(2) as Extract<Round, { kind: 'park' }>[]) {
      const a = parkAnswer(r);
      expect(a % 15).toBe(0);
      expect(a).not.toBe(DIAL.h.min);
      expect(a).not.toBe(DIAL.h.max);
      expect(a).not.toBe(DIAL.h.start);
      expect(parkTheta(r, a)).toBe(r.goal === 'stable' ? 0 : 180);
    }
  });

  it('level 3: the kick energy is mB (target 90) or 2mB (target 180), and the answer comes to rest on the target', () => {
    for (const r of rowsOf(3) as Extract<Round, { kind: 'swing' }>[]) {
      expect(r.w).toBeCloseTo((r.target === 90 ? 1 : 2) * r.m * r.b, 6);
      expect(stopAt(r, r.m)).toBeCloseTo(r.target, 4);
    }
  });

  it('level 4: the shown torque is the true torque at the answer (3 figures)', () => {
    for (const r of rowsOf(4) as Extract<Round, { kind: 'coil' }>[]) expect(Number(fmt(coilTau(r, r.i))), `${r.n} ${r.a}`).toBe(r.tau);
  });
});

describe('exactly one winning setting per row', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the answer is the only winner and the start setting loses`, () => {
      for (const r of rowsOf(level)) {
        const winners = settings(level, r).filter((s) => judge(r, s));
        expect(winners.length, JSON.stringify(r)).toBe(1);
        expect(same(winners[0], answerOf(r))).toBe(true);
        expect(judge(r, startOf(r)), JSON.stringify(r)).toBe(false);
      }
    });
  }

  it('answers of levels 1 to 4 are never at either end of their dial', () => {
    for (const r of [...rowsOf(1), ...rowsOf(3)]) expect([DIAL.m.min, DIAL.m.max]).not.toContain(answerOf(r).m);
    for (const r of rowsOf(2)) expect([DIAL.h.min, DIAL.h.max]).not.toContain(answerOf(r).h);
    for (const r of rowsOf(4)) expect([DIAL.i.min, DIAL.i.max]).not.toContain(answerOf(r).i);
  });

  it('the start setting of level 5 is across the field at the nose port, so it never wins', () => {
    for (const r of rowsOf(5) as Extract<Round, { kind: 'dock' }>[]) {
      const s = startOf(r);
      expect(s.port).toBe(0);
      expect(s.q).toBe((r.pDir + 1) % 4);
      expect(dockU(r, 0, s.q!)).toBe(0);
    }
  });

  it('answers of one level never repeat between its pools', () => {
    for (const level of LEVELS) {
      const keys = POOLS[level - 1].map((pool) => new Set(pool.map((row) => JSON.stringify(answerOf({ ...(row as object), kind: KINDS[level - 1], assist: 0 } as Round)))));
      for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) for (const x of keys[a]) expect(keys[b].has(x), `level ${level}: pools ${a + 1} and ${b + 1} share ${x}`).toBe(false);
    }
  });
});

describe('faults match the physics', () => {
  it('level 1: a smaller m is low, a larger one high', () => {
    for (const r of rowsOf(1) as Extract<Round, { kind: 'spin' }>[]) {
      for (const m of steps(DIAL.m)) {
        if (Math.abs(m - r.m) < 1e-6) continue;
        expect(fault(r, { m })).toBe(m < r.m ? 'low' : 'high');
        // the torque it gives agrees: too little below, too much above
        expect(spinTau(r, m) < r.tau).toBe(m < r.m);
      }
    }
  });

  it('level 3: a larger m stops short, a smaller one goes past (or tumbles), and stopAt agrees', () => {
    for (const r of rowsOf(3) as Extract<Round, { kind: 'swing' }>[]) {
      for (const m of steps(DIAL.m)) {
        if (Math.abs(m - r.m) < 1e-6) continue;
        const s = stopAt(r, m);
        if (m > r.m) {
          expect(fault(r, { m })).toBe('short');
          expect(s).toBeLessThan(r.target);
        } else {
          expect(fault(r, { m })).toBe('over');
          expect(s).toBeGreaterThan(r.target);
        }
        if (s !== Infinity) expect(Math.abs(s - r.target), `${r.m} ${m}`).toBeGreaterThan(3);
      }
    }
  });

  it('level 2: swing exactly when the angle is not 0 or 180; flip and steady as the plan says', () => {
    for (const r of rowsOf(2) as Extract<Round, { kind: 'park' }>[]) {
      for (const h of steps(DIAL.h)) {
        const th = parkTheta(r, h);
        const f = fault(r, { h });
        if (th !== 0 && th !== 180) expect(f).toBe('swing');
        else if (r.goal === 'stable') expect(f).toBe(th === 0 ? null : 'flip');
        else expect(f).toBe(th === 180 ? null : 'steady');
      }
      expect(fault(r, { h: DIAL.h.start })).toBe('swing');
    }
  });

  it('level 4: a wrong thruster is drift or pulled whatever the current; a right one leaves short or over', () => {
    for (const r of rowsOf(4) as Extract<Round, { kind: 'coil' }>[]) {
      for (const i of steps(DIAL.i)) {
        expect(fault(r, { i, thr: r.uniform ? 1 : 0 })).toBe(r.uniform ? 'drift' : 'pulled');
        const f = fault(r, { i, thr: r.uniform ? 0 : 1 });
        expect(f).toBe(i === r.i ? null : i < r.i ? 'short' : 'over');
        if (i !== r.i) expect(Math.abs(coilTau(r, i) / r.tau - 1)).toBeGreaterThan(0.03);
      }
    }
  });

  it('level 5: every fault kind occurs, and each is the physics of the setting', () => {
    const seen = new Set<string>();
    for (const r of rowsOf(5) as Extract<Round, { kind: 'dock' }>[]) {
      for (const port of [0, 1]) {
        for (let q = 0; q < 4; q++) {
          const f = fault(r, { port, q });
          if (f) seen.add(f);
          const u = dockU(r, port, q);
          if (f === 'closed') expect((r.port === 'nose' && port !== 0) || (r.port === 'side' && port !== 1)).toBe(true);
          else if (u === 0) expect(f).toBe('torque');
          else if (f === 'flip') expect(u).toBeGreaterThan(0);
          else if (f === 'steady') expect(u).toBeLessThan(0);
          else if (f === 'loose') expect([port, u]).toEqual([1, -1]);
        }
      }
      expect(dockAnswer(r).port).toBe(r.goal === 'stable' ? 1 : 0);
    }
    expect([...seen].sort()).toEqual(['closed', 'flip', 'loose', 'steady', 'torque']);
  });

  it('the field of a small magnet: 2k along m on its axis, k against m across it', () => {
    const r = { kind: 'dock', assist: 0, pDir: 1, goal: 'stable', port: 'side' } as Round & { kind: 'dock' };
    expect(fieldAt(r, 0)).toBe(1);
    expect(fieldAt(r, 1)).toBe(3);
    expect(dockU(r, 0, 1)).toBe(-2);
    expect(dockU(r, 0, 3)).toBe(2);
    expect(dockU(r, 1, 3)).toBe(-1);
    expect(dockU(r, 1, 1)).toBe(1);
    expect(dockU(r, 1, 0)).toBe(0);
  });
});

describe('rounds', () => {
  it('80 seeds: three rounds of the level’s kind, aids 0 1 2, round k from pool k, three different answers', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const rounds = buildRounds(level, createRng(seed));
        expect(rounds.length).toBe(3);
        expect(rounds.map((r) => r.kind)).toEqual([KINDS[level - 1], KINDS[level - 1], KINDS[level - 1]]);
        expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
        rounds.forEach((r, k) => {
          const { kind, assist, ...row } = r;
          void kind;
          void assist;
          expect(POOLS[level - 1][k].some((p) => JSON.stringify(p) === JSON.stringify(row))).toBe(true);
        });
        expect(new Set(rounds.map((r) => JSON.stringify(answerOf(r)))).size).toBe(3);
      }
    }
  });

  it('constants are exactly the brief’s', () => {
    expect(FIXED).toEqual({ spinLeft: 0.4, swingOff: 25, tip: 60, wobble: 8, short: 0.6, over: 0.3, drift: 40, loose: 30 });
    expect(TLM_OFF).toBe('— — —');
    expect(ARROW).toEqual(['→', '↑', '←', '↓']);
  });
});

describe('words', () => {
  const wrongOf = (level: L, r: Round) => settings(level, r).filter((s) => !judge(r, s));

  it('goal lines fit 44 characters and telemetry fits 28 for every row and every setting', () => {
    for (const level of LEVELS) {
      for (const r of rowsOf(level)) {
        expect(goalText(r).length, goalText(r)).toBeLessThanOrEqual(44);
        for (const s of settings(level, r)) expect(tlmText(r, s).length, tlmText(r, s)).toBeLessThanOrEqual(28);
      }
    }
  });

  it('a miss names the player’s own setting, never the answer, and ends with a direction in words', () => {
    const ends = [/rod\.$/, /(zero\.|unstable\.|highest energy\.)$/, /rod\.$/, /(current\.|needs no thrust\.|with the thruster\.)$/, /(names\.|there\.|unstable\.|higher energy\.|deeper energy\.)$/];
    for (const level of LEVELS) {
      for (const r of rowsOf(level)) {
        const a = answerOf(r);
        for (const s of wrongOf(level, r)) {
          const t = missText(r, s);
          expect(t.length, `${level} ${JSON.stringify(s)}`).toBeGreaterThan(20);
          expect(t).toMatch(ends[level - 1]);
          if (level === 1 || level === 3) {
            if (fault(r, s)) expect(t).toContain(`m = ${s.m} J/T`);
            expect(has(t, `m = ${a.m} J/T`)).toBe(false);
          }
          if (level === 2) {
            expect(t).toContain(`${s.h}°`);
            expect(has(t, `${a.h}°`) && a.h !== s.h).toBe(false);
          }
          if (level === 4) {
            const f = fault(r, s);
            if (f === 'drift' || f === 'pulled') expect(/\d/.test(t)).toBe(false);
            else {
              expect(t).toContain(`${s.i} mA`);
              expect(has(t, `${a.i} mA`)).toBe(false);
            }
          }
          if (level === 5) expect(/\d/.test(t)).toBe(false);
        }
      }
    }
  });

  it('a check costs a charge and tells numbers; a negative energy has a true minus; 180° prints τ = 0', () => {
    for (const r of rowsOf(2) as Extract<Round, { kind: 'park' }>[]) {
      const flip = { h: (parkAnswer(r) + 180) % 360 };
      const t = checkText(r, flip);
      if (r.goal === 'unstable') expect(t).toContain('τ = 0 µN m');
      expect(/\d\.\d{3,}|e-/.test(t)).toBe(false);
      expect(tlmText(r, { h: parkAnswer(r) })).toMatch(/^θ \d+° · τ .* · U /);
      if (r.goal === 'stable') expect(tlmText(r, { h: parkAnswer(r) })).toContain('U −');
    }
    for (const r of rowsOf(5) as Extract<Round, { kind: 'dock' }>[]) expect(checkText(r, { port: 0, q: (r.pDir + 1) % 4 })).toContain('a torque on it');
    for (const r of rowsOf(3) as Extract<Round, { kind: 'swing' }>[]) expect(checkText(r, { m: 0.2 })).toContain('tumble Pebble right over');
  });

  it('every win teaches its idea', () => {
    for (const r of rowsOf(1)) expect(winText(r)).toContain('τ = mB sin θ');
    for (const r of rowsOf(2) as Extract<Round, { kind: 'park' }>[]) expect(winText(r)).toContain(r.goal === 'stable' ? 'torque mB sin θ is zero' : 'U = +mB');
    for (const r of rowsOf(3) as Extract<Round, { kind: 'swing' }>[]) expect(winText(r)).toContain(r.target === 90 ? 'W = U(90°) − U(0°)' : 'W = (+mB) − (−mB) = 2mB');
    for (const r of rowsOf(4)) expect(winText(r)).toContain('m = NIA');
    for (const r of rowsOf(5) as Extract<Round, { kind: 'dock' }>[]) expect(winText(r)).toMatch(r.goal === 'stable' ? /side port/ : r.goal === 'unstable' ? /2k/ : /Tightest dock/);
    for (const r of rowsOf(4) as Extract<Round, { kind: 'coil' }>[]) expect(winText(r)).toContain(r.uniform ? 'no net force' : 'net force as well');
  });

  it('the hint line says how the helper behaves in each round', () => {
    const [a, b, c] = buildRounds(1, createRng(5));
    expect(hintText(a)).toMatch(/telemetry is live/);
    expect(hintText(b)).toMatch(/a check costs a charge/);
    expect(hintText(c)).toMatch(/no telemetry/);
  });
});

describe('scene helpers', () => {
  it('spinG: the burn ends in a dead stop, a slow spin on, or a spin back, at a fixed rate', () => {
    expect(spinG(1, 0.7)).toBeCloseTo(0.7, 9);
    expect(spinG(0, 0.5 + 1) - spinG(0, 0.5 + 0.2)).toBeCloseTo(0, 9);
    let prev = -1;
    for (let s = 0; s <= 1.2; s += 0.05) {
      expect(spinG(SPIN_END.win, s)).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = spinG(SPIN_END.win, s);
    }
    expect(spinG(0.4, 2) - spinG(0.4, 1)).toBeCloseTo(0.4, 9);
    expect(spinG(-0.4, 2) - spinG(-0.4, 1)).toBeCloseTo(-0.4, 9);
    expect(TUMBLE.rate * (spinG(0.4, 2) - spinG(0.4, 1))).toBeCloseTo(48, 6);
  });

  it('verdict times follow the table and stay within the take', () => {
    for (const level of LEVELS) {
      for (const r of rowsOf(level)) {
        for (const s of settings(level, r)) {
          const v = verdictAt(r, s);
          expect(v).toBeGreaterThan(0.9);
          expect(v).toBeLessThanOrEqual(1.7);
        }
        expect(verdictAt(r, answerOf(r))).toBeLessThanOrEqual(1.5);
      }
    }
    const spin = rowsOf(1)[0];
    expect([verdictAt(spin, { m: spin.kind === 'spin' ? spin.m : 0 }), verdictAt(spin, { m: 0.2 }), verdictAt(spin, { m: 4 })]).toEqual([1.0, 1.1, 1.2]);
    const coil = rowsOf(4)[0];
    expect(verdictAt(coil, { i: 20, thr: 1 })).toBe(1.0);
    const station = rowsOf(4).find((r) => r.kind === 'coil' && !r.uniform)!;
    expect(verdictAt(station, { i: 20, thr: 0 })).toBe(0.95);
    expect(outcomeOf(station, answerOf(station))).toBe('win');
  });

  it('every guide star stays clear of the goal pill, the control strip and Dele’s window', () => {
    const clear = (deg: number) => {
      const x = 300 + 120 * Math.cos((deg * Math.PI) / 180);
      const y = 170 - 120 * Math.sin((deg * Math.PI) / 180);
      return y >= 80 && y <= 262 && !(x < 170 && y < 100);
    };
    for (const t of [90, 180] as const) FIELD3[t].forEach((f) => expect(clear(f + t), `target ${t} field ${f}`).toBe(true));
    FIELD4.uniform.forEach((f) => expect(clear(f)).toBe(true));
    expect(clear(FIELD4.station)).toBe(true);
    for (const level of [3, 4] as const) {
      for (const seed of SEEDS.slice(0, 20)) buildRounds(level, createRng(seed)).forEach((r, k) => expect(clear(starDeg(r, k))).toBe(true));
    }
    expect(fieldDeg(rowsOf(2)[0], 0)).toBe(45);
  });
});
