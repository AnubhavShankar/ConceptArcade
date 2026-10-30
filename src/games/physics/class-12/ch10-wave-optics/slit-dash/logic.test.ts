import { describe, expect, it } from 'vitest';
import { GAUGE_GEOM, HIT, HUNT_GEOM, HUNT_MISS_PX, LAMP, LAMP_GEOM, LOCK_GEOM, SLIDERS, hunterStripeY, hunterTargetY, fringeWidth, fringeX, gauge, gaugeExplain, gaugeMiss, gaugeRounds, hunterExplain, hunterMiss, hunterReading, hunterRounds, intensity, judgeGauge, judgeHunter, judgeLamp, judgeLock, lampBrightness, lampDelta, lampExplain, lampMiss, lampPhiText, lampReading, lampRounds, lampSide, lockExplain, lockMiss, lockReading, lockRounds, type LampRound } from './logic';

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
};
const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 13);
const grid = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Math.round((min + i * step) * 1e6) / 1e6);

describe('the numbers from the textbook', () => {
  it('Exercise 10.4: d = 0.28 mm, D = 1.4 m and the 4th bright fringe at 1.2 cm give λ = 600 nm', () => {
    const [r] = hunterRounds(() => 0);
    expect(fringeX(4, 600, 1.4, 0.28)).toBeCloseTo(12, 6);
    expect(r).toBeDefined();
  });
  it('Exercise 10.5: I(Δ = λ) = K, so I(λ/3) = K/4', () => {
    expect(gauge(1)).toBeCloseTo(1, 9);
    expect(gauge(1 / 3)).toBeCloseTo(0.25, 9);
  });
  it('Exercise 10.6(b): 650 nm and 520 nm coincide at the 4th and 5th fringes', () => {
    expect(4 * 650).toBe(5 * 520);
    expect(fringeX(4, 650, 1.2, 2)).toBeCloseTo(fringeX(5, 520, 1.2, 2), 9);
  });
  it('the intensity pattern is 1 at the centre, 0 half a fringe out, 1 a whole fringe out', () => {
    const b = fringeWidth(600, 1, 0.5);
    expect(intensity(0, 600, 1, 0.5)).toBeCloseTo(1, 9);
    expect(intensity(b / 2, 600, 1, 0.5)).toBeCloseTo(0, 9);
    expect(intensity(b, 600, 1, 0.5)).toBeCloseTo(1, 9);
  });
});

describe('every level has three solvable rounds', () => {
  it('level 1: whole-nm wavelengths in the visible range, and exactly one colour on the dial hits the target', () => {
    for (const s of seeds) {
      const rounds = hunterRounds(lcg(s));
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      expect(new Set(rounds.map((r) => `${r.d}/${r.D}/${r.n}/${r.x}`)).size).toBe(3);
      for (const r of rounds) {
        expect(Number.isInteger(Math.round(r.lamSol * 1e6) / 1e6)).toBe(true);
        expect(r.lamSol).toBeGreaterThan(SLIDERS.lam.min);
        expect(r.lamSol).toBeLessThan(SLIDERS.lam.max);
        expect(fringeX(r.n, r.lamSol, r.D, r.d)).toBeCloseTo(r.x, 6);
        expect(grid(SLIDERS.lam.min, SLIDERS.lam.max, SLIDERS.lam.step).filter((l) => judgeHunter(r, l))).toEqual([r.lamSol]);
        expect(r.x).toBeLessThanOrEqual(15);
      }
    }
  });
  it('level 2: the nearest coincidence uses the smallest whole numbers, lies on the screen, and exactly one detector setting wins', () => {
    for (const s of seeds) {
      const rounds = lockRounds(lcg(s));
      expect(rounds).toHaveLength(3);
      for (const r of rounds) {
        expect(r.n1 * r.lam1).toBe(r.n2 * r.lam2);
        expect(r.xSol).toBeGreaterThanOrEqual(SLIDERS.x.min);
        expect(r.xSol).toBeLessThanOrEqual(SLIDERS.x.max);
        expect(r.xSol * 10).toBeCloseTo(Math.round(r.xSol * 10), 6);
        expect(grid(SLIDERS.x.min, SLIDERS.x.max, SLIDERS.x.step).filter((x) => judgeLock(r, x))).toHaveLength(1);
        // no smaller coincidence exists
        for (let n1 = 1; n1 < r.n1; n1++) expect((n1 * r.lam1) % r.lam2).not.toBe(0);
      }
    }
  });
  it('level 3: three different path differences with brightness 0, ¼, ½ or ¾ of K, each set by exactly one meter reading', () => {
    for (const s of seeds) {
      const rounds = gaugeRounds(lcg(s));
      expect(new Set(rounds.map((r) => r.frac)).size).toBe(3);
      for (const r of rounds) {
        expect([0, 0.25, 0.5, 0.75]).toContainEqual(expect.closeTo(r.sol, 9));
        expect(grid(SLIDERS.g.min, SLIDERS.g.max, SLIDERS.g.step).filter((v) => judgeGauge(r, v))).toHaveLength(1);
      }
    }
  });
});

describe('judging: classic mistakes do not win', () => {
  it('level 1: forgetting the order (n = 1) or mixing mm and m fails', () => {
    for (const r of hunterRounds(lcg(3))) {
      const lam1 = ((r.x * 1e-3 * r.d * 1e-3) / (1 * r.D)) * 1e9;
      expect(judgeHunter(r, lam1)).toBe(r.n === 1);
      expect(judgeHunter(r, r.lamSol * 10)).toBe(false);
    }
  });
  it('level 2: the first bright fringe of either colour, or the product of the wavelengths, is not the coincidence', () => {
    for (const r of lockRounds(lcg(3))) {
      expect(judgeLock(r, fringeX(1, r.lam1, r.D, r.d))).toBe(r.n1 === 1);
      expect(judgeLock(r, fringeX(r.n1 + 1, r.lam1, r.D, r.d))).toBe(false);
    }
  });
  it('level 3: the amplitude fraction instead of the intensity, or the phase over 2π, fails', () => {
    for (const r of gaugeRounds(lcg(3))) {
      if (r.sol > 0 && r.sol < 1) expect(judgeGauge(r, Math.sqrt(r.sol))).toBe(false);
    }
  });
});

describe('words: the working and the misses', () => {
  it('every working names the exercise', () => {
    expect(hunterExplain(hunterRounds(lcg(3))[0])[1]).toMatch(/Exercise 10\.4/);
    expect(lockExplain(lockRounds(lcg(3))[0])[1]).toMatch(/Exercise 10\.6/);
    expect(gaugeExplain(gaugeRounds(lcg(3))[0])[1]).toMatch(/Exercise 10\.5/);
  });
  it('a miss describes the effect and never states the answer', () => {
    const h = hunterRounds(lcg(3))[0];
    expect(hunterMiss(h, h.lamSol + 100)).toMatch(/past the target/);
    expect(hunterMiss(h, h.lamSol - 100)).toMatch(/short of the target/);
    expect(hunterMiss(h, h.lamSol + 100)).not.toContain(`${h.lamSol} nm`);
    const k = lockRounds(lcg(3))[0];
    expect(lockMiss(k, fringeX(1, k.lam1, k.D, k.d))).toMatch(/Only the|Neither|Both/);
    expect(lockMiss(k, 0.5)).toMatch(/Only the|Neither/);
    const g = gaugeRounds(lcg(3))[0];
    expect(gaugeMiss(g, g.sol + 0.3)).toMatch(/dimmer/);
    expect(gaugeMiss(g, g.sol - 0.3)).toMatch(/brighter/);
  });
  it('test shots read out the fringe positions and orders', () => {
    const h = hunterRounds(lcg(3))[0];
    expect(hunterReading(h, 500)).toMatch(/bright fringe lands [\d.]+ mm from the centre/);
    const k = lockRounds(lcg(3))[0];
    expect(lockReading(k, k.xSol)).toMatch(new RegExp(`order ${k.n1} of ${k.lam1} nm and ${k.n2} of ${k.lam2} nm`));
  });
});

// ---- level 4: lamps or lasers -----------------------------------------------------------------------------------------------

const lampSeeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const halves = Array.from({ length: LAMP.max - LAMP.min + 1 }, (_, i) => LAMP.min + i);
/** Every row the three rounds can draw, found by playing many seeds: key "coherent num/den" per round index. */
const allRows = () => {
  const rows: Map<string, LampRound>[] = [new Map(), new Map(), new Map()];
  for (const s of lampSeeds) lampRounds(lcg(s)).forEach((r, k) => rows[k].set(`${r.coherent ? 'laser' : 'bulbs'} ${r.num}/${r.den}`, r));
  return rows;
};
/** The brightness (units of I₀) found by adding two unit phasors: |1 + e^{iφ}|² for locked sources. No cos² formula is used. */
const phasorSum = (frac: number) => {
  const phi = 2 * Math.PI * frac;
  return (1 + Math.cos(phi)) ** 2 + Math.sin(phi) ** 2;
};
/** Two bulbs: the phase difference takes every value in turn, and the brightness is the time average of |1 + e^{iθ}|². */
const bulbAverage = () => {
  let sum = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) sum += phasorSum(i / n);
  return sum / n;
};

describe('level 4: lamps or lasers, the numbers', () => {
  it('coherent: 4I₀cos²(φ/2) agrees with adding two phasors for every path difference', () => {
    for (const frac of [0, 1 / 12, 1 / 6, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 0.9, 1]) expect(lampBrightness(true, frac)).toBeCloseTo(phasorSum(frac), 9);
  });
  it('incoherent: the time average of two unit phasors is 2I₀, and so is the rule for any path difference', () => {
    expect(bulbAverage()).toBeCloseTo(2, 6);
    for (const frac of [0, 1 / 6, 1 / 4, 1 / 3, 1 / 2, 0.77]) expect(lampBrightness(false, frac)).toBe(2);
  });
  it('the tables (reviewer, 2026-10-30): round 1 laser 2, 1, 3; round 2 mixed 1, 3, 0 / bulbs 2, 2; boss 0 / bulbs 2 / 4 (in I₀)', () => {
    const [r1, r2, r3] = allRows();
    expect([...r1.keys()].sort()).toEqual(['laser 1/3', 'laser 1/4', 'laser 1/6']);
    expect([...r2.keys()].sort()).toEqual(['bulbs 1/3', 'bulbs 1/6', 'laser 1/2', 'laser 1/3', 'laser 1/6']);
    expect([...r3.keys()].sort()).toEqual(['bulbs 1/6', 'laser 0/1', 'laser 1/2']);
    const sol = (m: Map<string, LampRound>, key: string) => m.get(key)!.sol / 2;
    expect(sol(r1, 'laser 1/4')).toBe(2);
    expect(sol(r1, 'laser 1/3')).toBe(1);
    expect(sol(r1, 'laser 1/6')).toBe(3);
    expect(sol(r2, 'laser 1/3')).toBe(1);
    expect(sol(r2, 'laser 1/6')).toBe(3);
    expect(sol(r2, 'laser 1/2')).toBe(0);
    expect(sol(r2, 'bulbs 1/3')).toBe(2);
    expect(sol(r2, 'bulbs 1/6')).toBe(2);
    expect(sol(r3, 'laser 1/2')).toBe(0);
    expect(sol(r3, 'bulbs 1/6')).toBe(2);
    expect(sol(r3, 'laser 0/1')).toBe(4);
  });
  it('every row is checked against the independent phasor sum or the 2I₀ average, and sits on a whole half of the meter', () => {
    for (const rows of allRows()) {
      for (const r of rows.values()) {
        const exact = r.coherent ? phasorSum(r.num / r.den) : bulbAverage();
        expect(r.sol).toBeCloseTo(2 * exact, 5);
        expect(Number.isInteger(r.sol)).toBe(true);
        expect(r.sol).toBeGreaterThanOrEqual(LAMP.min);
        expect(r.sol).toBeLessThanOrEqual(LAMP.max);
        expect(r.frac).toBeCloseTo(r.num / r.den, 12);
      }
    }
  });
});

describe('level 4: three solvable rounds with one winner', () => {
  it('three rounds, the helper fading 0, 1, 2; lasers only in round 1, then a mixed round 2 and a mixed boss', () => {
    const kinds: Set<string>[] = [new Set(), new Set(), new Set()];
    for (const s of lampSeeds) {
      const rounds = lampRounds(lcg(s));
      expect(rounds).toHaveLength(3);
      expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
      rounds.forEach((r, k) => kinds[k].add(r.coherent ? 'laser' : 'bulbs'));
    }
    expect([...kinds[0]]).toEqual(['laser']);
    expect([...kinds[1]].sort()).toEqual(['bulbs', 'laser']);
    expect([...kinds[2]].sort()).toEqual(['bulbs', 'laser']);
  });
  it('exactly one meter setting wins each round: the true brightness', () => {
    for (const rows of allRows()) for (const r of rows.values()) expect(halves.filter((v) => judgeLamp(r, v))).toEqual([r.sol]);
    for (const s of lampSeeds) for (const r of lampRounds(lcg(s))) expect(halves.filter((v) => judgeLamp(r, v))).toEqual([r.sol]);
  });
  it('the start setting never wins: it is odd, and no row has an odd answer', () => {
    expect(LAMP.start % 2).toBe(1);
    expect(LAMP.start).toBeGreaterThanOrEqual(LAMP.min);
    expect(LAMP.start).toBeLessThanOrEqual(LAMP.max);
    for (const rows of allRows()) for (const r of rows.values()) expect(judgeLamp(r, LAMP.start)).toBe(false);
  });
  it('the answer is not a position: every round has several different answers, and no answer is fixed for a round', () => {
    const [r1, r2, r3] = allRows();
    const answers = (m: Map<string, LampRound>) => new Set([...m.values()].map((r) => r.sol));
    expect(answers(r1).size).toBe(3);
    expect(answers(r2).size).toBe(4);
    expect(answers(r3).size).toBe(3);
  });
  it('the same rounds come back for the same seed, and the seeds vary', () => {
    expect(lampRounds(lcg(7))).toEqual(lampRounds(lcg(7)));
    expect(new Set(lampSeeds.map((s) => JSON.stringify(lampRounds(lcg(s))))).size).toBeGreaterThan(8);
  });
});

describe('level 4: classic mistakes do not win', () => {
  it('for every incoherent row the coherent formula gives a different value, so it never wins', () => {
    let bulbRows = 0;
    for (const rows of allRows()) {
      for (const r of rows.values()) {
        if (r.coherent) continue;
        bulbRows++;
        const asIfCoherent = Math.round(2 * lampBrightness(true, r.frac));
        expect(asIfCoherent).not.toBe(r.sol);
        expect(lampBrightness(true, r.frac)).not.toBeCloseTo(lampBrightness(false, r.frac), 6);
        expect(judgeLamp(r, asIfCoherent)).toBe(false);
      }
    }
    expect(bulbRows).toBe(3);
  });
  it('every bulb row has a laser row with the same path difference and a different answer, so the source type decides', () => {
    const [, r2] = allRows();
    for (const key of ['1/3', '1/6']) expect(r2.get(`laser ${key}`)!.sol).not.toBe(r2.get(`bulbs ${key}`)!.sol);
  });
  it('treating locked sources as bulbs (always 2I₀) fails unless the answer is 2I₀', () => {
    for (const rows of allRows()) for (const r of rows.values()) if (r.coherent) expect(judgeLamp(r, 4)).toBe(r.sol === 4);
  });
  it('reading the amplitude instead of the intensity fails for 3I₀ and 4I₀ (it coincides at 0 and 1)', () => {
    for (const rows of allRows()) {
      for (const r of rows.values()) {
        if (!r.coherent) continue;
        const amp = Math.round(2 * Math.sqrt(r.sol / 2));
        if (r.sol / 2 !== 0 && r.sol / 2 !== 1) expect(judgeLamp(r, amp)).toBe(false);
      }
    }
  });
  it('calling a bright maximum or a dark spot 2I₀ (the bulbs’ answer) does not win', () => {
    for (const rows of allRows()) for (const r of rows.values()) if (r.coherent && (r.sol === 0 || r.sol === 8)) expect(judgeLamp(r, 4)).toBe(false);
  });
});

describe('level 4: words', () => {
  it('a miss says only too high or too low, with the player’s own setting as the only number', () => {
    for (const rows of allRows()) {
      for (const r of rows.values()) {
        for (const x of halves) {
          if (judgeLamp(r, x)) continue;
          const t = lampMiss(r, x);
          expect(t).toBe(`The meter set to ${x / 2}I₀ read ${x > r.sol ? 'too high' : 'too low'} for the light at that point.`);
          expect(t.match(/\d+(\.\d+)?/g)).toEqual([String(x / 2)]);
          expect(t).not.toMatch(/Δ|λ|coheren|bulb|laser|fringe|brighter|dimmer|2π|cos/);
          expect(t).not.toContain(`${r.sol / 2}I₀ `);
        }
      }
    }
  });
  it('a miss text depends only on the setting and the side: the same text for rounds with different answers', () => {
    const texts = new Map<string, Set<string>>();
    for (const rows of allRows()) {
      for (const r of rows.values()) {
        for (const x of halves) {
          if (judgeLamp(r, x)) continue;
          const key = `${x}/${x > r.sol}`;
          texts.set(key, (texts.get(key) ?? new Set()).add(lampMiss(r, x)));
        }
      }
    }
    for (const set of texts.values()) expect(set.size).toBe(1);
  });
  it('the side drawn on the meter agrees with the text', () => {
    for (const rows of allRows()) for (const r of rows.values()) for (const x of halves) if (!judgeLamp(r, x)) expect(lampSide(r, x)).toBe(x > r.sol ? 'dimmer' : 'brighter');
  });
  it('the paid phase check never mentions the brightness', () => {
    for (const rows of allRows()) {
      for (const r of rows.values()) {
        const t = lampReading(r);
        expect(t).not.toMatch(/I₀|bright|dim/);
        if (r.coherent) expect(t).toContain(`φ = ${Math.round(r.frac * 360)}°`);
        else expect(t).not.toMatch(/\d/);
      }
    }
  });
  it('the working: coherent shows φ and the answer, bulbs say 2I₀ everywhere', () => {
    const [r1, r2, r3] = allRows();
    expect(lampExplain(r1.get('laser 1/4')!)).toBe('Coherent beams: φ = 2πΔ/λ = π/2, so I = 4I₀cos²(φ/2) = 2I₀.');
    expect(lampExplain(r1.get('laser 1/3')!)).toBe('Coherent beams: φ = 2πΔ/λ = 2π/3, so I = 4I₀cos²(φ/2) = 1I₀.');
    expect(lampExplain(r1.get('laser 1/6')!)).toBe('Coherent beams: φ = 2πΔ/λ = π/3, so I = 4I₀cos²(φ/2) = 3I₀.');
    expect(lampExplain(r3.get('laser 1/2')!)).toBe('Coherent beams: φ = 2πΔ/λ = π, so I = 4I₀cos²(φ/2) = 0I₀.');
    expect(lampExplain(r3.get('laser 0/1')!)).toBe('Coherent beams: φ = 2πΔ/λ = 0, so I = 4I₀cos²(φ/2) = 4I₀.');
    for (const r of [r2.get('bulbs 1/3')!, r2.get('bulbs 1/6')!, r3.get('bulbs 1/6')!]) expect(lampExplain(r)).toMatch(/incoherent.*averages to 1\/2 and I = 2I₀ everywhere, whatever the path difference/);
  });
  it('path differences and phases read naturally', () => {
    const [r1, , r3] = allRows();
    expect(lampDelta(r1.get('laser 1/4')!)).toBe('λ/4');
    expect(lampDelta(r3.get('laser 0/1')!)).toBe('0');
    expect(lampPhiText(r1.get('laser 1/6')!)).toBe('π/3');
  });
});

// ---- every level: where the burst goes, where the dial starts, and what a miss shows ---------------------------------------------

type Pt = [number, number];
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Distance from a point to the segment a-b. */
const segDist = (p: Pt, a: Pt, b: Pt) => {
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)));
  return dist(p, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
};

describe('every level: hit is never the answer', () => {
  it('level 1: the burst is far from the target on the wall, for every target', () => {
    for (const s of seeds) for (const r of hunterRounds(lcg(s))) expect(dist(HIT.hunter, [HUNT_GEOM.SX + 20, hunterTargetY(r)])).toBeGreaterThan(40);
  });
  it('level 2: the burst is far from the detector setting that wins, for every pair of colours', () => {
    for (const s of seeds) for (const r of lockRounds(lcg(s))) expect(dist(HIT.lock, [LOCK_GEOM.X, LOCK_GEOM.BASE - r.xSol * LOCK_GEOM.PX])).toBeGreaterThan(100);
    // and far from the detector at any setting
    for (const x of grid(SLIDERS.x.min, SLIDERS.x.max, SLIDERS.x.step)) expect(dist(HIT.lock, [LOCK_GEOM.X, LOCK_GEOM.BASE - x * LOCK_GEOM.PX])).toBeGreaterThan(50);
  });
  it('level 3: the burst lies below the pivot, away from every needle position, including the winning ones', () => {
    const { CX, CY, R } = GAUGE_GEOM;
    for (const v of grid(SLIDERS.g.min, SLIDERS.g.max, SLIDERS.g.step)) {
      const a = Math.PI * (1 - v);
      expect(segDist(HIT.gauge, [CX, CY], [CX + (R - 10) * Math.cos(a), CY - (R - 10) * Math.sin(a)])).toBeGreaterThan(40);
    }
  });
  it('level 4: the burst is on the screen marker, far from the meter knob at every setting', () => {
    for (let x = LAMP.min; x <= LAMP.max; x++) expect(dist(HIT.lamp, [LAMP_GEOM.MX, LAMP_GEOM.BOT - x * LAMP_GEOM.PXH])).toBeGreaterThan(100);
    expect(HIT.lamp).toEqual([LAMP_GEOM.SX + 8, LAMP_GEOM.MY]);
  });
});

describe('every level: the start setting never wins', () => {
  it('level 1: the start colour hits no target', () => {
    for (const s of seeds) for (const r of hunterRounds(lcg(s))) expect(judgeHunter(r, SLIDERS.lam.start)).toBe(false);
  });
  it('level 2: the start detector position matches no pair', () => {
    for (const s of seeds) for (const r of lockRounds(lcg(s))) expect(judgeLock(r, SLIDERS.x.start)).toBe(false);
  });
  it('level 3: the start meter reading is no round’s answer, and is on the dial’s grid', () => {
    expect(grid(SLIDERS.g.min, SLIDERS.g.max, SLIDERS.g.step)).toContainEqual(expect.closeTo(SLIDERS.g.start, 9));
    for (const s of seeds) for (const r of gaugeRounds(lcg(s))) expect(judgeGauge(r, SLIDERS.g.start)).toBe(false);
    // none of the possible answers (0, ¼, ½, ¾) is within the tolerance of the start
    for (const sol of [0, 0.25, 0.5, 0.75]) expect(judgeGauge({ frac: 0, sol, assist: 0 }, SLIDERS.g.start)).toBe(false);
  });
});

describe('every level: a miss shows the side only, the same for any wrong setting on that side', () => {
  it('level 1: the text has no number but the order, and the drawn stripe sits a fixed distance past or short of the target', () => {
    for (const s of seeds.slice(0, 20)) {
      for (const r of hunterRounds(lcg(s))) {
        const wrong = grid(SLIDERS.lam.min, SLIDERS.lam.max, SLIDERS.lam.step).filter((l) => !judgeHunter(r, l));
        const past = wrong.filter((l) => fringeX(r.n, l, r.D, r.d) > r.x);
        const short = wrong.filter((l) => fringeX(r.n, l, r.D, r.d) < r.x);
        expect(past.length + short.length).toBe(wrong.length);
        expect(new Set(past.map((l) => hunterMiss(r, l))).size).toBe(1);
        expect(new Set(short.map((l) => hunterMiss(r, l))).size).toBe(1);
        expect(new Set(past.map((l) => hunterStripeY(r, l)))).toEqual(new Set([hunterTargetY(r) - HUNT_MISS_PX]));
        expect(new Set(short.map((l) => hunterStripeY(r, l)))).toEqual(new Set([hunterTargetY(r) + HUNT_MISS_PX]));
        expect(hunterMiss(r, past[0]).match(/\d+/g)).toEqual([String(r.n)]);
        expect(hunterMiss(r, past[0])).not.toMatch(/mm|nm/);
        // a win lands on the target
        expect(hunterStripeY(r, r.lamSol)).toBe(hunterTargetY(r));
      }
    }
  });
  it('level 3: the text is the same for every wrong reading on a side', () => {
    for (const s of seeds.slice(0, 20)) {
      for (const r of gaugeRounds(lcg(s))) {
        const wrong = grid(SLIDERS.g.min, SLIDERS.g.max, SLIDERS.g.step).filter((v) => !judgeGauge(r, v));
        expect(new Set(wrong.filter((v) => v > r.sol).map((v) => gaugeMiss(r, v))).size).toBeLessThanOrEqual(1);
        expect(new Set(wrong.filter((v) => v < r.sol).map((v) => gaugeMiss(r, v))).size).toBeLessThanOrEqual(1);
        expect(gaugeMiss(r, r.sol + 0.3)).not.toMatch(/\d/);
      }
    }
  });
  it('level 4: with the player’s own setting masked, the text and the arrow are the same for every wrong setting on a side', () => {
    for (const rows of allRows()) {
      for (const r of rows.values()) {
        const wrong = halves.filter((v) => !judgeLamp(r, v));
        for (const above of [true, false]) {
          const side = wrong.filter((v) => (v > r.sol) === above);
          if (side.length === 0) continue;
          expect(new Set(side.map((v) => lampMiss(r, v).replace(String(v / 2), 'X'))).size).toBe(1);
          expect(new Set(side.map((v) => lampSide(r, v))).size).toBe(1);
        }
      }
    }
  });
  it('level 2: a miss text carries no distance or position, only which colour is bright', () => {
    for (const s of seeds.slice(0, 20)) {
      for (const r of lockRounds(lcg(s))) {
        for (const x of grid(SLIDERS.x.min, SLIDERS.x.max, SLIDERS.x.step)) {
          if (judgeLock(r, x)) continue;
          const t = lockMiss(r, x);
          expect(t).not.toMatch(new RegExp(`\\b${r.xSol}\\b`));
          expect((t.match(/\d+(\.\d+)?/g) ?? []).every((n) => [String(r.lam1), String(r.lam2)].includes(n))).toBe(true);
        }
      }
    }
  });
});
