import { describe, expect, it } from 'vitest';
import { fmt } from '@core/judge';
import { createRng } from '@core/random';
import {
  DIAL, METERS, MID, NEEDLE, RING, TWEET, WOOF, buildRounds, direction, fault, goal, hintText, judge, lcdText, meterText, midI, missText, netX, phaseDeg, readings, tweetI, verdictDelay, winText, woofP, xc, xl,
  type MeterRow, type MidRow, type Round, type TweetRow, type WoofRow,
} from './logic';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const range = (lo: number, hi: number, step: number) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => Number((lo + i * step).toFixed(6)));
const COILS = range(DIAL.l.min, DIAL.l.max, DIAL.l.step);
const CAPS = range(DIAL.c.min, DIAL.c.max, DIAL.c.step);
const VOLTS = range(DIAL.v.min, DIAL.v.max, DIAL.v.step);
const NOTES = range(DIAL.f.min, DIAL.f.max, DIAL.f.step);
const tweet = (row: TweetRow): Round => ({ kind: 'tweet', assist: 0, ...row });
const mid = (row: MidRow): Round => ({ kind: 'mid', assist: 0, ...row });
const meters = (row: MeterRow): Round => ({ kind: 'meters', assist: 0, ...row });
const woof = (row: WoofRow): Round => ({ kind: 'woof', assist: 0, ...row });
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const flat = <T>(pools: T[][]) => pools.flat();

describe('the pools are exact', () => {
  it('level 1: the shown current is the true current at the answer, to 3 figures', () => {
    for (const r of flat(TWEET)) expect(fmt(tweetI(r, r.c))).toBe(String(r.i));
  });
  it('level 2: the shown current is true at the answer and the answer is on the shown side of resonance', () => {
    for (const r of flat(MID)) {
      expect(fmt(midI(r, r.l))).toBe(String(r.i));
      expect(netX(r, r.l) > 0).toBe(r.lag);
    }
  });
  it('level 3: every row is an exact Pythagorean triple, and the sum and the plain difference do not land near the answer', () => {
    for (const r of flat(METERS)) {
      expect(Math.hypot(r.vr, r.vl - r.vc)).toBe(r.v);
      expect(Math.abs(r.vr + r.vl + r.vc - r.v)).toBeGreaterThan(5);
      expect(Math.abs(r.vr + Math.abs(r.vl - r.vc) - r.v)).toBeGreaterThan(5);
    }
  });
  it('level 4: the shown power is the true power at the answer, to 3 figures', () => {
    for (const r of flat(WOOF)) expect(fmt(woofP(r, r.f))).toBe(String(r.p));
  });
  it('the answers are never at a dial end or at the start', () => {
    for (const r of flat(TWEET)) expect(r.c > DIAL.c.min && r.c < DIAL.c.max).toBe(true);
    for (const r of flat(MID)) expect(r.l > DIAL.l.min && r.l < DIAL.l.max).toBe(true);
    for (const r of flat(METERS)) expect(r.v > DIAL.v.min && r.v < DIAL.v.max).toBe(true);
    for (const r of flat(WOOF)) expect(r.f > DIAL.f.min && r.f < DIAL.f.max).toBe(true);
  });
  it('using Z = R + X_C in level 1 lands more than 0.6 µF from the answer', () => {
    for (const r of flat(TWEET)) {
      const wrong = 1 / (TWO(r.fk * 1000) * (r.v / r.i - r.r) * 1e-6);
      expect(Math.abs(wrong - r.c)).toBeGreaterThan(0.6);
    }
  });
});
const TWO = (f: number) => 2 * Math.PI * f;

describe('exactly one winner', () => {
  it('level 1: only the answer passes judge; the start fails', () => {
    for (const r of flat(TWEET)) {
      const round = tweet(r);
      expect(CAPS.filter((c) => judge(round, { c }))).toEqual([r.c]);
      expect(judge(round, { c: DIAL.c.start })).toBe(false);
    }
  });
  it('level 2: only the answer passes judge, on a grid of 0.1 mH; the start fails', () => {
    expect(COILS.length).toBe(40);
    for (const r of flat(MID)) {
      const round = mid(r);
      expect(COILS.filter((l) => judge(round, { l }))).toEqual([r.l]);
      expect(judge(round, { l: DIAL.l.start })).toBe(false);
    }
  });
  it('level 3: only the answer passes judge; the start fails', () => {
    for (const r of flat(METERS)) {
      const round = meters(r);
      expect(VOLTS.filter((v) => judge(round, { v }))).toEqual([r.v]);
      expect(judge(round, { v: DIAL.v.start })).toBe(false);
    }
  });
  it('level 4: only the answer passes judge; the start fails', () => {
    for (const r of flat(WOOF)) {
      const round = woof(r);
      expect(NOTES.filter((f) => judge(round, { f }))).toEqual([r.f]);
      expect(judge(round, { f: DIAL.f.start })).toBe(false);
    }
  });
});

describe('the faults match the physics', () => {
  it('level 1: loud exactly when the true current is above the shown one, and every other setting is more than 1.2% off', () => {
    for (const r of flat(TWEET)) {
      for (const c of CAPS.filter((x) => x !== r.c)) {
        const I = tweetI(r, c);
        expect(fault(tweet(r), { c })).toBe(I > r.i ? 'loud' : 'quiet');
        expect(Math.abs(I / r.i - 1)).toBeGreaterThan(0.012);
      }
    }
  });
  it('level 2: phase exactly when the sign of X_L − X_C is wrong; the right side is loud or quiet by the current, more than 1.2% off', () => {
    for (const r of flat(MID)) {
      for (const l of COILS.filter((x) => x !== r.l)) {
        const f = fault(mid(r), { l });
        if (netX(r, l) > 0 !== r.lag) expect(f).toBe('phase');
        else {
          const I = midI(r, l);
          expect(f).toBe(I > r.i ? 'loud' : 'quiet');
          expect(Math.abs(I / r.i - 1)).toBeGreaterThan(0.012);
        }
      }
    }
  });
  it('level 2: no coil setting sits on resonance, and each row has a mirror setting with the same current on the wrong side', () => {
    for (const r of flat(MID)) {
      const lres = 1000 / ((2 * Math.PI * 1000 * r.fk) ** 2 * r.c * 1e-6);
      for (const l of COILS) expect(Math.abs(l - lres)).toBeGreaterThan(0.005);
      const mirror = 2 * lres - r.l;
      if (mirror >= 0.1 && mirror <= 4) {
        const nearest = COILS.reduce((a, b) => (Math.abs(b - mirror) < Math.abs(a - mirror) ? b : a));
        expect(fault(mid(r), { l: nearest })).toBe('phase');
      }
    }
  });
  it('level 3: loud above the answer, quiet below', () => {
    for (const r of flat(METERS)) for (const v of VOLTS.filter((x) => x !== r.v)) expect(fault(meters(r), { v })).toBe(v > r.v ? 'loud' : 'quiet');
  });
  it('level 4: loud for a lower note, quiet for a higher one, and every other note is more than 1.2% off', () => {
    for (const r of flat(WOOF)) {
      for (const f of NOTES.filter((x) => x !== r.f)) {
        const P = woofP(r, f);
        expect(fault(woof(r), { f })).toBe(P > r.p ? 'loud' : 'quiet');
        expect(Math.abs(P / r.p - 1)).toBeGreaterThan(0.012);
      }
    }
  });
  it('the phase angle is positive for a lagging setting, and cos φ = R/Z at the woofer answer', () => {
    for (const r of flat(MID)) expect(phaseDeg(r, r.l) > 0).toBe(r.lag);
    for (const r of flat(WOOF)) {
      const z = Math.hypot(r.r, xl(r.l, r.f));
      expect(woofP(r, r.f)).toBeCloseTo(r.v * r.v * r.r / (z * z), 9);
    }
  });
  it('the reactances behave: X_C falls and X_L rises with f', () => {
    expect(xc(10, 2000)).toBeGreaterThan(xc(10, 4000));
    expect(xl(1, 2000)).toBeLessThan(xl(1, 4000));
  });
  it('level 3 meters scale with the master voltage and read the soundcheck values at the answer', () => {
    for (const r of flat(METERS)) {
      const R = readings(r, r.v);
      expect([R.vr, R.vl, R.vc]).toEqual([r.vr, r.vl, r.vc]);
      expect(readings(r, 2 * r.v).vl).toBeCloseTo(2 * r.vl, 9);
    }
  });
  it('the verdict lands at 0.5 s for a burn-out or a slam, 0.6 s for distortion and 0.9 s otherwise', () => {
    for (const r of flat(TWEET)) {
      expect(verdictDelay(tweet(r), { c: r.c + 1 })).toBe(0.5);
      expect(verdictDelay(tweet(r), { c: r.c - 1 })).toBe(0.9);
      expect(verdictDelay(tweet(r), { c: r.c })).toBe(0.9);
    }
    for (const r of flat(METERS)) expect(verdictDelay(meters(r), { v: r.v + 1 })).toBe(0.6);
    for (const r of flat(WOOF)) expect(verdictDelay(woof(r), { f: r.f - 5 })).toBe(0.5);
  });
});

describe('disjoint pools', () => {
  it('within each level no answer appears in two pools', () => {
    const answers = [TWEET.map((p) => p.map((r) => r.c)), MID.map((p) => p.map((r) => r.l)), METERS.map((p) => p.map((r) => r.v)), WOOF.map((p) => p.map((r) => r.f))];
    for (const level of answers) {
      const all = level.flat();
      expect(new Set(all).size).toBe(all.length);
    }
  });
});

describe('rounds', () => {
  it('80 seeds: three rounds of the level’s kind, assist 0, 1, 2, round k from pool k', () => {
    const pools = [TWEET, MID, METERS, WOOF] as unknown[][][];
    const kinds = ['tweet', 'mid', 'meters', 'woof'];
    for (const seed of SEEDS) {
      for (const level of [1, 2, 3, 4] as const) {
        const rounds = buildRounds(level, createRng(seed));
        expect(rounds.length).toBe(3);
        expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
        rounds.forEach((r, k) => {
          expect(r.kind).toBe(kinds[level - 1]);
          const { kind: _k, assist: _a, ...row } = r as unknown as Record<string, unknown>;
          expect(pools[level - 1][k]).toContainEqual(row);
        });
      }
    }
  });
  it('the rounds differ across seeds', () => {
    const seen = new Set(SEEDS.map((s) => JSON.stringify(buildRounds(1, createRng(s)))));
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe('words', () => {
  const all: [Round, number[]][] = [
    ...flat(TWEET).map((r): [Round, number[]] => [tweet(r), CAPS]),
    ...flat(MID).map((r): [Round, number[]] => [mid(r), COILS]),
    ...flat(METERS).map((r): [Round, number[]] => [meters(r), VOLTS]),
    ...flat(WOOF).map((r): [Round, number[]] => [woof(r), NOTES]),
  ];
  const own = (r: Round, x: number) => (r.kind === 'tweet' ? `${x} µF` : r.kind === 'mid' ? `${fmt(x)} mH` : r.kind === 'meters' ? `${x} V` : `${x} Hz`);
  const vals = (r: Round, x: number) => (r.kind === 'tweet' ? { c: x } : r.kind === 'mid' ? { l: x } : r.kind === 'meters' ? { v: x } : { f: x });
  const answer = (r: Round) => (r.kind === 'tweet' ? `${r.c} µF` : r.kind === 'mid' ? `${fmt(r.l)} mH` : r.kind === 'meters' ? `${r.v} V` : `${r.f} Hz`);
  const ans = (r: Round) => (r.kind === 'tweet' ? r.c : r.kind === 'mid' ? r.l : r.kind === 'meters' ? r.v : r.f);

  it('a miss text names the player’s own setting with its unit and never the answer, and always says which way to move', () => {
    for (const [r, dial] of all) {
      for (const x of dial.filter((d) => d !== ans(r))) {
        const t = missText(r, vals(r, x));
        expect(has(t, own(r, x)), `${r.kind} ${x}: ${t}`).toBe(true);
        expect(has(t, answer(r)), `${r.kind} ${x}: ${t}`).toBe(false);
        expect(t).toMatch(/(Use (less|more)|Pick a (higher|lower) note|Bring the master down|Push the master up)/);
      }
    }
  });
  it('level 2: the phase text says led for a lag row and lagged for a lead row, and points back to the right side', () => {
    for (const r of flat(MID)) {
      for (const l of COILS) {
        const v = { l };
        if (fault(mid(r), v) !== 'phase') continue;
        const t = missText(mid(r), v);
        expect(t).toContain(r.lag ? 'led' : 'lagged');
        expect(t).toContain('hollow');
        expect(t).toContain(direction(mid(r), v) > 0 ? 'more of the coil' : 'less of the coil');
      }
    }
  });
  it('directions: more capacitance, more coil, more volts and a lower note raise the current or power', () => {
    for (const r of flat(TWEET)) expect(direction(tweet(r), { c: r.c - 1 })).toBe(1);
    for (const r of flat(WOOF)) expect(direction(woof(r), { f: r.f + 5 })).toBe(-1);
  });
  it('win texts carry their key formula', () => {
    for (const r of flat(TWEET)) expect(winText(tweet(r))).toContain('√(R² + X_C²)');
    for (const r of flat(MID)) expect(winText(mid(r))).toContain('tan φ');
    for (const r of flat(METERS)) expect(winText(meters(r))).toContain('√(V_R² + (V_L − V_C)²)');
    for (const r of flat(WOOF)) expect(winText(woof(r))).toContain('cos φ = R/Z');
    expect(winText(tweet(TWEET[0][0]))).toMatch(/^Highs on!/);
    expect(winText(mid(MID[0][0]))).toMatch(/^In step!/);
    expect(winText(meters(METERS[0][0]))).toMatch(/^Back on the mark!/);
    expect(winText(woof(WOOF[0][0]))).toMatch(/^Drop landed!/);
  });
  it('the goal line and the hint line state the given facts and fade with the round', () => {
    expect(goal(tweet(TWEET[0][0]))).toBe('Tweeter needs 0.886 A');
    expect(goal(mid(MID[0][0]))).toBe('Mid needs 0.889 A, lagging');
    expect(goal(mid(MID[0][1]))).toBe('Mid needs 1.18 A, leading');
    expect(goal(meters(METERS[0][0]))).toBe('Match the soundcheck meters');
    expect(goal(woof(WOOF[0][0]))).toBe('Woofer needs 31.8 W');
    const r = tweet(TWEET[0][0]);
    expect(hintText({ ...r, assist: 0 })).toMatch(/Round 1: the meter bridge is live\.$/);
    expect(hintText({ ...r, assist: 1 })).toMatch(/a meter check costs a charge\.$/);
    expect(hintText({ ...r, assist: 2 })).toMatch(/Headline set: no meters\.$/);
  });
  it('the meter check and the LCD give numbers for the player’s own setting', () => {
    expect(meterText(tweet(TWEET[0][0]), { c: 10 })).toMatch(/^Meter check: with 10 µF, X_C = 7\.96 Ω and the tweeter draws 0\.886 A\.$/);
    expect(meterText(mid(MID[0][0]), { l: 3.6 })).toMatch(/lagging by/);
    expect(meterText(meters(METERS[0][0]), { v: 50 })).toBe('Meter check: at 50 V the meters would read 30, 110 and 70 V.');
    expect(meterText(woof(WOOF[0][0]), { f: 200 })).toMatch(/^Meter check: at 200 Hz, X_L = /);
    expect(lcdText(tweet(TWEET[0][0]), { c: 10 })).toBe('tweeter 0.886 A');
    expect(lcdText(mid(MID[0][0]), { l: 3.6 })).toBe('mid 0.889 A · lags');
    expect(lcdText(meters(METERS[0][0]), { v: 50 })).toBe('30 · 110 · 70 V');
    expect(lcdText(woof(WOOF[0][0]), { f: 200 })).toBe('woofer 31.8 W');
  });
  it('the fixed effects are exactly the brief’s', () => {
    expect(RING).toEqual({ faint: 0.25, right: 1 });
    expect(NEEDLE).toEqual({ low: 0.5, right: 1, high: 1.25 });
  });
});
