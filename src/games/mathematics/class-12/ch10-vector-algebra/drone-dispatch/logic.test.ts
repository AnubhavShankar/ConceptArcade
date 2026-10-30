import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { MISS_GAP, RANGE, buildRounds, compass, explain, intel, judge, missOffset, missText, spotText, type Pt, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const grid = span(-RANGE, RANGE).flatMap((x) => span(-RANGE, RANGE).map((y): Pt => [x, y]));
const wrongOf = (r: Round): Pt => [r.ans[0] === RANGE ? r.ans[0] - 1 : r.ans[0] + 1, r.ans[1]];

describe('the vector rules are right', () => {
  it('textbook anchors: the vector from (1, 2) to (4, 6) is (3, 4) of size 5; R divides (0,0)(6,3) internally 1:2 at (2,1) and externally 3:1 at (9, 4.5)', () => {
    expect(Math.hypot(3, 4)).toBe(5);
    expect([(2 * 0 + 1 * 6) / 3, (2 * 0 + 1 * 3) / 3]).toEqual([2, 1]);
    expect([(3 * 6 - 1 * 0) / 2, (3 * 3 - 1 * 0) / 2]).toEqual([9, 4.5]);
  });
  it('level 2: the answer has the required direction and size', () => {
    for (const r of all(2)) {
      expect(r.ans[0] * r.d[1] - r.ans[1] * r.d[0]).toBe(0);
      expect(r.ans[0] * r.d[0] + r.ans[1] * r.d[1]).toBeGreaterThan(0);
      expect(Math.hypot(r.ans[0], r.ans[1])).toBeCloseTo(r.M, 9);
      // the direction is shown as a longer multiple, never already reduced to the answer
      expect(r.d.join()).not.toBe(r.ans.join());
    }
  });
  it('level 3: the relay really divides PQ in the ratio m : n, internally or externally', () => {
    for (const level of [3]) {
      for (const r of all(level)) {
        const [P, Q, R] = [r.D, r.E, r.ans];
        const k = r.external ? r.m - r.n : r.m + r.n;
        const calc = [0, 1].map((i) => (r.m * Q[i] + (r.external ? -1 : 1) * r.n * P[i]) / k + 0);
        expect(calc).toEqual(R.map((x) => x + 0));
        const PR = Math.hypot(R[0] - P[0], R[1] - P[1]);
        const QR = Math.hypot(R[0] - Q[0], R[1] - Q[1]);
        expect(PR / QR).toBeCloseTo(r.m / r.n, 9);
      }
    }
  });
});

describe('every round has exactly one winning tap', () => {
  it('only the answer wins over the whole plane, the start never wins, and the answer is on the plane', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 60)) {
        expect(grid.filter((p) => judge(r, p))).toEqual([r.ans]);
        expect(judge(r, r.start)).toBe(false);
        expect(Math.abs(r.ans[0])).toBeLessThanOrEqual(RANGE);
        expect(Math.abs(r.ans[1])).toBeLessThanOrEqual(RANGE);
      }
    }
  });
  it('helpers fade', () => {
    for (const level of [1, 2, 3]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
  it('level 3 ends with an external division', () => {
    for (const s of seeds) expect(buildRounds(3, createRng(s)).map((r) => r.external)).toEqual([false, false, true]);
  });
});

describe('words', () => {
  it('misses describe the effect and never print the right point; the working and the intel are stated', () => {
    for (const level of [1, 2, 3]) {
      for (const r of all(level).slice(0, 40)) {
        const w = wrongOf(r);
        const msg = missText(r, w);
        expect(msg.length).toBeGreaterThan(25);
        expect(msg).not.toContain(`(${r.ans[0]}, ${r.ans[1]})`.replace(/-/g, '−'));
        expect(spotText(r, w)).toMatch(/Test flight/);
        expect(explain(r)).toContain(`${r.ans[0] < 0 ? '−' : ''}${Math.abs(r.ans[0])}`);
        expect(intel(r).length).toBeGreaterThan(30);
      }
    }
  });
  it('rounds in a level differ', () => {
    for (const s of seeds) for (const level of [1, 2, 3]) {
      const rs = buildRounds(level, createRng(s));
      expect(new Set(rs.map((r) => r.ans.join() + r.D.join())).size).toBe(3);
    }
  });
});

describe('no miss text in any level contains a digit', () => {
  it('every wrong tap over the whole plane, in every level, gives words only; level 1 keeps its compass word and gives no distance', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 6)) {
        for (const p of grid) {
          if (judge(r, p)) continue;
          const msg = missText(r, p);
          expect(msg).not.toMatch(/\d/);
          expect(msg.length).toBeGreaterThan(25);
          if (level === 1) {
            expect(msg).toMatch(/^The drone landed (north|south|east|west|north-east|north-west|south-east|south-west) of the pad\.$/);
            expect(msg).not.toMatch(/away/);
          }
        }
      }
    }
  });
  it('level 1 miss text still says which side of the pad the drone came down', () => {
    const r = buildRounds(1, createRng(5))[0];
    const L: Pt = [r.ans[0] + 2, r.ans[1] - 3];
    expect(missText(r, L)).toBe('The drone landed south-east of the pad.');
  });
});

describe('level 4, Crosswind: the triangle law', () => {
  const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
  const rounds4 = seeds80.flatMap((s) => buildRounds(4, createRng(s)));
  const key = (r: Round) => `${r.D.join()}|${r.E.join()}=${r.ans.join()}`;
  const seen = (kind: string) => [...new Set(rounds4.filter((r) => r.kind === kind).map(key))].sort();

  it('every row of the brief gives its answer, and every row of every pool is played', () => {
    // legs: sum; wind: target − wind; wind2: target/2 − wind
    expect(seen('legs')).toEqual(['3,1|-1,4=2,5', '2,-3|1,5=3,2', '-4,2|1,3=-3,5', '4,0|-1,3=3,3'].sort());
    expect(seen('wind')).toEqual(['-2,1|3,4=5,3', '1,-2|-2,3=-3,5', '2,2|4,-1=2,-3'].sort());
    expect(seen('wind2')).toEqual(['2,-3|-2,4=-3,5', '-1,2|4,6=3,1', '1,1|6,-2=2,-2'].sort());
  });
  it('the answers obey the law: own + wind is the ground track, and the legs add tip to tail', () => {
    for (const r of rounds4) {
      if (r.kind === 'legs') expect(r.ans).toEqual([r.D[0] + r.E[0], r.D[1] + r.E[1]]);
      if (r.kind === 'wind') expect([r.ans[0] + r.D[0], r.ans[1] + r.D[1]]).toEqual(r.E);
      if (r.kind === 'wind2') expect([2 * (r.ans[0] + r.D[0]), 2 * (r.ans[1] + r.D[1])]).toEqual(r.E);
    }
  });
  it('rounds run legs, wind, wind2; helpers fade; the answers fit the plane; each round has one winning tap and the start never wins', () => {
    for (const s of seeds80) {
      const rs = buildRounds(4, createRng(s));
      expect(rs.map((r) => r.kind)).toEqual(['legs', 'wind', 'wind2']);
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
    }
    for (const r of rounds4.slice(0, 60)) {
      expect(grid.filter((p) => judge(r, p))).toEqual([r.ans]);
      expect(judge(r, r.start)).toBe(false);
      expect(Math.abs(r.ans[0])).toBeLessThanOrEqual(RANGE);
      expect(Math.abs(r.ans[1])).toBeLessThanOrEqual(RANGE);
      // the answer is not the data copied across: neither a leg, nor the wind, nor the target
      expect([r.D.join(), r.E.join()]).not.toContain(r.ans.join());
    }
  });
  it('levels 1 to 3 draw exactly what they drew before (the new level only adds)', () => {
    expect(buildRounds(1, createRng(7)).map((r) => r.kind)).toEqual(['join', 'join', 'join']);
    expect(buildRounds(3, createRng(7)).map((r) => r.kind)).toEqual(['section', 'section', 'section']);
  });
  it('a miss gives only a compass word: no digit, and nothing that depends on how far off the tap was', () => {
    const words = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
    for (const r of rounds4.slice(0, 9)) {
      const bySign = new Map<string, string>();
      for (const p of grid) {
        if (judge(r, p)) continue;
        const msg = missText(r, p);
        expect(msg).toMatch(/^Dash came down on a rooftop [a-z-]+ of the target\.$/);
        expect(msg).not.toMatch(/\d/);
        const c = compass(r, p);
        expect(words).toContain(c.word);
        expect(c.dx).toBe(Math.sign(p[0] - r.ans[0]));
        expect(c.dy).toBe(Math.sign(p[1] - r.ans[1]));
        // same signs, same text, whatever the distance
        const sig = `${c.dx},${c.dy}`;
        expect(bySign.get(sig) ?? msg).toBe(msg);
        bySign.set(sig, msg);
        // the flight ends a fixed 1.5 from the target, on the side of the error
        const off = missOffset(r, p);
        expect(Math.hypot(off[0], off[1])).toBeCloseTo(MISS_GAP, 9);
        expect(Math.sign(off[0])).toBe(c.dx);
        expect(Math.sign(off[1])).toBe(c.dy);
      }
      expect(bySign.size).toBe(8);
    }
  });
  it('the end point of a missed flight depends only on the compass side, never on how far off the tap was', () => {
    const r = buildRounds(4, createRng(5))[1];
    const a = missOffset(r, [r.ans[0] + 1, r.ans[1] + 1]);
    const b = missOffset(r, [r.ans[0] + 2, r.ans[1] + 7]);
    expect(a).toEqual(b);
    expect(missOffset(r, [r.ans[0] + 1, r.ans[1]])).not.toEqual(a);
  });
  it('the paid test flight and the working are stated, and the working names the law', () => {
    for (const r of rounds4.slice(0, 30)) {
      const w = wrongOf(r);
      expect(spotText(r, w)).toMatch(/^Test flight with .* Dash would land (\d+ (east|west|north|south)( and \d+ (north|south))?) of the target\.$/);
      expect(intel(r).length).toBeGreaterThan(40);
      if (r.kind === 'legs') expect(explain(r)).toMatch(/Triangle law/);
      if (r.kind === 'wind') expect(explain(r)).toMatch(/own vector = target − wind/);
      if (r.kind === 'wind2') expect(explain(r)).toMatch(/half the trip/);
      expect(explain(r)).toContain(`(${r.ans[0] < 0 ? '−' : ''}${Math.abs(r.ans[0])}, ${r.ans[1] < 0 ? '−' : ''}${Math.abs(r.ans[1])})`);
    }
    expect(spotText(buildRounds(4, createRng(5))[0], [0, 0])).toMatch(/Test flight/);
  });
});
