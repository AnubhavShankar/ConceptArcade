import { describe, expect, it } from 'vitest';
import {
  DIAL, DT1, DT2, FLIP, GLOW, LCD_OFF, MU0, NR, OUT, SHOW, TUBE,
  buildRounds, crackAt, emfFlip, emfOut, emfTube, fault, goalLine, hintText, judge, lcdText, maFlip, meterText, missText, peakShow, popAt, slopes, steepest, verdictDelay, winText, winkGlow,
  type FlipRow, type OutRow, type Round, type ShowRow, type TubeRow, type Values,
} from './logic';

const SEEDS = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
};
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}`).test(s);
const out = (row: OutRow, assist: 0 | 1 | 2 = 0) => ({ ...row, kind: 'out', assist }) as Round;
const tube = (row: TubeRow, assist: 0 | 1 | 2 = 0) => ({ ...row, kind: 'tube', assist }) as Round;
const flip = (row: FlipRow, assist: 0 | 1 | 2 = 0) => ({ ...row, kind: 'flip', assist }) as Round;
const show = (row: ShowRow, assist: 0 | 1 | 2 = 0) => ({ ...row, kind: 'show', assist }) as Round;
const range = (min: number, max: number, step: number) => Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Number((min + i * step).toFixed(6)));
const TH = range(0, 90, 5);
const RS = range(1, 8, 0.5);
const TS = Array.from({ length: 20 }, (_, i) => Number((0.1 * (i + 1)).toFixed(1)));
const NS = range(10, 200, 10);

describe('the pools', () => {
  it('level 1: every target solves back to its tilt, and the emf at the answer equals the target to 3 figures', () => {
    for (const r of OUT.flat()) {
      expect(Number(emfOut(r, r.th).toPrecision(3))).toBe(r.vb);
      const th = (Math.acos((r.vb * DT1) / (r.n * r.b * r.a * 1e-4)) * 180) / Math.PI;
      expect(Math.abs(th - r.th)).toBeLessThan(1);
    }
  });

  it('level 2: every target solves back to its radius, and the emf at the answer equals the target to 3 figures', () => {
    for (const r of TUBE.flat()) {
      expect(Number(emfTube(r, r.r).toPrecision(3))).toBe(r.vb);
      const rc = 100 * Math.sqrt((r.vb * DT2) / (NR * MU0 * r.n * 100 * Math.PI * (r.i2 - r.i1)));
      expect(Math.abs(rc - r.r)).toBeLessThan(0.05);
    }
  });

  it('level 3: every target solves back to its flip time, and the current at the answer equals the target to 3 figures', () => {
    for (const r of FLIP.flat()) {
      expect(Number(maFlip(r, r.t).toPrecision(3))).toBe(r.ma);
      const t = (2 * r.n * r.b * Math.PI * (r.rc / 100) ** 2) / ((r.ma / 1000) * r.R);
      expect(Math.abs(t - r.t)).toBeLessThan(0.02);
    }
  });

  it('level 4: fluxes are even and in 0..16, no step is flat, exactly one step is steepest, and the peak at the answer equals the target', () => {
    for (const r of SHOW.flat()) {
      for (const f of r.phi) {
        expect(f % 2).toBe(0);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(16);
      }
      const s = slopes(r).map(Math.abs);
      expect(s.every((x) => x > 0)).toBe(true);
      expect(s.filter((x) => x === steepest(r)).length).toBe(1);
      expect(Math.abs(peakShow(r, r.n) - r.vb)).toBeLessThan(1e-9);
    }
  });

  it('round 1 of level 4 has its steepest step rising, rounds 2 and 3 falling', () => {
    SHOW[0].forEach((r) => expect(slopes(r).find((s) => Math.abs(s) === steepest(r))! > 0).toBe(true));
    for (const k of [1, 2]) SHOW[k].forEach((r) => expect(slopes(r).find((s) => Math.abs(s) === steepest(r))! < 0).toBe(true));
  });
});

describe('exactly one winning setting, and the physics agrees with every fault', () => {
  const value = (r: Round, x: number): Values => (r.kind === 'out' ? { th: x } : r.kind === 'tube' ? { r: x } : r.kind === 'flip' ? { t: x } : { n: x });
  const scan = (r: Round): number[] => (r.kind === 'out' ? TH : r.kind === 'tube' ? RS : r.kind === 'flip' ? TS : NS);
  const answer = (r: Round) => (r.kind === 'out' ? r.th : r.kind === 'tube' ? r.r : r.kind === 'flip' ? r.t : r.n);
  const start = (r: Round) => (r.kind === 'out' ? DIAL.th.start : r.kind === 'tube' ? DIAL.r.start : r.kind === 'flip' ? DIAL.t.start : DIAL.n.start);
  /** The quantity the player aims at, and the target. */
  const effect = (r: Round, x: number) => (r.kind === 'out' ? emfOut(r, x) : r.kind === 'tube' ? emfTube(r, x) : r.kind === 'flip' ? maFlip(r, x) : peakShow(r, x));
  const target = (r: Round) => (r.kind === 'out' ? r.vb : r.kind === 'tube' ? r.vb : r.kind === 'flip' ? r.ma : r.vb);
  const rows: Round[] = [...OUT.flat().map((x) => out(x)), ...TUBE.flat().map((x) => tube(x)), ...FLIP.flat().map((x) => flip(x)), ...SHOW.flat().map((x) => show(x))];

  it('only the answer passes judge, the start fails, and no answer is at a dial end', () => {
    for (const r of rows) {
      const winners = scan(r).filter((x) => judge(r, value(r, x)));
      expect(winners).toEqual([answer(r)]);
      expect(judge(r, value(r, start(r)))).toBe(false);
      expect(answer(r)).toBeGreaterThan(scan(r)[0]);
      expect(answer(r)).toBeLessThan(scan(r)[scan(r).length - 1]);
    }
  });

  it('dim means the emf (or current, or peak) is below the target and blown means above, by at least 2.5%', () => {
    for (const r of rows) {
      for (const x of scan(r)) {
        const f = fault(r, value(r, x));
        if (f === null) continue;
        const e = effect(r, x);
        const want = target(r);
        if (f === 'dim') expect(e, `${r.kind} ${x}`).toBeLessThan(want * 0.975);
        else expect(e, `${r.kind} ${x}`).toBeGreaterThan(want * 1.025);
      }
    }
  });
});

describe('rounds', () => {
  it('every level has three rounds of its kind, assist 0, 1, 2, round k from pool k, and the three answers differ', () => {
    const pools = [OUT, TUBE, FLIP, SHOW] as unknown[][][];
    const kinds = ['out', 'tube', 'flip', 'show'];
    const ans = (r: Round) => (r.kind === 'out' ? r.th : r.kind === 'tube' ? r.r : r.kind === 'flip' ? r.t : r.n);
    for (const seed of SEEDS) {
      for (const level of [1, 2, 3, 4] as const) {
        const g = buildRounds(level, lcg(seed));
        expect(g.length).toBe(3);
        expect(g.map((r) => r.kind)).toEqual([kinds[level - 1], kinds[level - 1], kinds[level - 1]]);
        expect(g.map((r) => r.assist)).toEqual([0, 1, 2]);
        g.forEach((r, k) => {
          const { kind: _k, assist: _a, ...row } = r;
          expect(pools[level - 1][k]).toContainEqual(row);
        });
        expect(new Set(g.map(ans)).size).toBe(3);
      }
    }
  });

  it('the answer sets of the three pools of a level are disjoint', () => {
    const sets = (xs: number[][]) => xs.map((x) => new Set(x));
    const check = (s: Set<number>[]) => {
      for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) expect([...s[i]].filter((x) => s[j].has(x))).toEqual([]);
    };
    check(sets(OUT.map((p) => p.map((r) => r.th))));
    check(sets(TUBE.map((p) => p.map((r) => r.r))));
    check(sets(FLIP.map((p) => p.map((r) => r.t))));
    check(sets(SHOW.map((p) => p.map((r) => r.n))));
  });

  it('the dial ranges are what the brief says', () => {
    expect(DIAL).toEqual({ th: { min: 0, max: 90, step: 5, start: 90 }, r: { min: 1, max: 8, step: 0.5, start: 1 }, t: { min: 0.1, max: 2, step: 0.1, start: 2 }, n: { min: 10, max: 200, step: 10, start: 10 } });
  });
});

describe('timing', () => {
  it('every verdict lands by 2.0 s at every dial value, and popAt is defined for every n above the answer', () => {
    for (const r of OUT.flat()) for (const th of TH) expect(verdictDelay(out(r), { th })).toBeLessThanOrEqual(2);
    for (const r of TUBE.flat()) for (const x of RS) expect(verdictDelay(tube(r), { r: x })).toBeLessThanOrEqual(2);
    for (const r of FLIP.flat()) for (const t of TS) expect(verdictDelay(flip(r), { t })).toBeLessThanOrEqual(2);
    for (const r of SHOW.flat()) {
      for (const n of NS) {
        expect(verdictDelay(show(r), { n })).toBeLessThanOrEqual(2);
        if (n > r.n) {
          const i0 = slopes(r).findIndex((s) => n * Math.abs(s) > r.vb * 1000 + 1e-9);
          expect(i0).toBeGreaterThanOrEqual(0);
          expect(popAt(r, n)).toBeLessThanOrEqual(1.4 + 1e-9);
        }
      }
    }
  });

  it('blown verdicts come at 0.45, 0.42, 0.45 s and the cracking step plus 0.05 s; dim and win at 0.85, 0.6, 0.3 + min(t, 0.7) and 1.85 s', () => {
    const o = out(OUT[0][0]);
    expect(verdictDelay(o, { th: 0 })).toBe(0.45);
    expect(verdictDelay(o, { th: 90 })).toBe(0.85);
    expect(verdictDelay(tube(TUBE[0][0]), { r: 8 })).toBe(0.42);
    expect(verdictDelay(tube(TUBE[0][0]), { r: 1 })).toBe(0.6);
    const f = flip(FLIP[0][0]);
    expect(verdictDelay(f, { t: 0.1 })).toBe(0.45);
    expect(verdictDelay(f, { t: 2 })).toBeCloseTo(1, 9);
    expect(verdictDelay(f, { t: 0.6 })).toBeCloseTo(0.9, 9);
    expect(verdictDelay(f, { t: 0.5 })).toBeCloseTo(0.8, 9);
    const s = show(SHOW[0][0]);
    expect(verdictDelay(s, { n: 10 })).toBe(1.85);
    expect(verdictDelay(s, { n: 50 })).toBe(1.85);
    expect(verdictDelay(s, { n: 200 })).toBeCloseTo(popAt(SHOW[0][0], 200) + 0.05, 9);
    const latest = Math.max(...SHOW.flat().flatMap((r) => NS.filter((n) => n > r.n).map((n) => verdictDelay(show(r), { n }))));
    expect(latest).toBeCloseTo(1.45, 9);
  });
});

describe('Wink’s glow', () => {
  const all: [Round, Values[]][] = [
    ...OUT.flat().map((x): [Round, Values[]] => [out(x), TH.map((th) => ({ th }))]),
    ...TUBE.flat().map((x): [Round, Values[]] => [tube(x), RS.map((r) => ({ r }))]),
    ...FLIP.flat().map((x): [Round, Values[]] => [flip(x), TS.map((t) => ({ t }))]),
    ...SHOW.flat().map((x): [Round, Values[]] => [show(x), NS.map((n) => ({ n }))]),
  ];
  const times = Array.from({ length: 49 }, (_, i) => i * 0.05);

  it('on a miss the glow takes one fixed value (0.25 dim, 0.6 blown, or dark), never a value that scales with the emf', () => {
    for (const [r, xs] of all) {
      for (const x of xs) {
        const f = fault(r, x);
        if (f === null) continue;
        const seen = new Set(times.map((rt) => winkGlow(r, x, rt)));
        const allowed = f === 'dim' ? [0, GLOW.dim] : [0, GLOW.blown];
        for (const g of seen) expect(allowed, `${r.kind} ${JSON.stringify(x)}`).toContain(g);
        expect(seen.has(allowed[1])).toBe(!(r.kind === 'out' && x.th === 90));
      }
    }
  });

  it('a blown miss goes dark at the crack, and the crack comes before the verdict', () => {
    for (const [r, xs] of all) {
      for (const x of xs) {
        if (fault(r, x) !== 'blown') continue;
        const c = crackAt(r, x);
        expect(winkGlow(r, x, c - 0.01)).toBe(GLOW.blown);
        expect(winkGlow(r, x, c + 0.01)).toBe(0);
        expect(c).toBeLessThan(verdictDelay(r, x));
        expect(verdictDelay(r, x) - c).toBeCloseTo(r.kind === 'show' ? 0.05 : r.kind === 'out' ? 0.05 : r.kind === 'tube' ? 0.04 : 0.05, 6);
      }
    }
  });

  it('on a win Wink glows fully while the flux changes and goes dark once the change stops', () => {
    for (const row of OUT.flat()) {
      const r = out(row);
      const x = { th: row.th };
      expect(winkGlow(r, x, 0.1)).toBe(0);
      expect(winkGlow(r, x, 0.5)).toBe(1);
      expect(winkGlow(r, x, 1.01)).toBe(0);
      expect(winkGlow(r, x, 2.2)).toBe(0);
    }
    for (const row of TUBE.flat()) {
      const x = { r: row.r };
      expect(winkGlow(tube(row), x, 0.4)).toBe(1);
      expect(winkGlow(tube(row), x, 0.66)).toBe(0);
    }
    for (const row of FLIP.flat()) {
      const x = { t: row.t };
      expect(winkGlow(flip(row), x, 0.3 + row.t / 2)).toBe(1);
      expect(winkGlow(flip(row), x, 0.3 + row.t + 0.11)).toBe(0);
    }
    for (const row of SHOW.flat()) {
      const x = { n: row.n };
      const sl = slopes(row).map(Math.abs);
      sl.forEach((s, i) => expect(winkGlow(show(row), x, 0.3 + 0.5 * i + 0.25)).toBeCloseTo(s / steepest(row), 9));
      expect(Math.max(...sl.map((_, i) => winkGlow(show(row), x, 0.3 + 0.5 * i + 0.25)))).toBe(1);
      expect(winkGlow(show(row), x, 1.81)).toBe(0);
    }
  });

  it('a dim miss keeps its glow only while the flux changes, and the edge-on start stays completely dark', () => {
    for (const row of OUT.flat()) {
      expect(winkGlow(out(row), { th: 85 }, 0.5)).toBe(GLOW.dim);
      expect(winkGlow(out(row), { th: 85 }, 0.9)).toBe(0);
      expect(winkGlow(out(row), { th: 90 }, 0.5)).toBe(0);
    }
    for (const row of FLIP.flat()) {
      expect(winkGlow(flip(row), { t: 2 }, 1.5)).toBe(GLOW.dim);
      expect(winkGlow(flip(row), { t: 2 }, 2.4)).toBe(0);
    }
  });
});

describe('words', () => {
  const rows: Round[] = [...OUT.flat().map((x) => out(x)), ...TUBE.flat().map((x) => tube(x)), ...FLIP.flat().map((x) => flip(x)), ...SHOW.flat().map((x) => show(x))];
  const token = (r: Round) => (r.kind === 'out' ? `${r.th}°` : r.kind === 'tube' ? `${r.r} cm` : r.kind === 'flip' ? `${r.t} s` : `${r.n} turns`);
  const settings = (r: Round): Values[] => (r.kind === 'out' ? TH.map((th) => ({ th })) : r.kind === 'tube' ? RS.map((x) => ({ r: x })) : r.kind === 'flip' ? TS.map((t) => ({ t })) : NS.map((n) => ({ n })));

  it('a miss text never contains the answer, and ends with a plain fix', () => {
    for (const r of rows) {
      for (const x of settings(r)) {
        if (judge(r, x)) continue;
        const m = missText(r, x);
        expect(has(m, token(r)), `${r.kind} ${JSON.stringify(x)}: ${m}`).toBe(false);
        expect(m).toMatch(/(Tilt it flatter|Tilt the hoop flatter|Tilt it more steeply|Use a bigger ring|Use a smaller ring|Flip faster|Flip more slowly|Use more turns|Use fewer turns)\.$/);
      }
    }
  });

  it('the edge-on start says the hoop stayed dark, and 0° says the glass cracked', () => {
    for (const r of OUT.flat()) {
      expect(missText(out(r), { th: 90 })).toMatch(/stayed dark/);
      expect(missText(out(r), { th: 0 })).toMatch(/cracked/);
    }
    expect(missText(out(OUT[0][0]), { th: 85 })).toMatch(/only glowed dimly/);
  });

  it('a win text carries the working', () => {
    for (const r of OUT.flat()) expect(winText(out(r))).toContain('ΔΦ/Δt');
    for (const r of TUBE.flat()) expect(winText(tube(r))).toContain('μ₀nπr²');
    for (const r of FLIP.flat()) expect(winText(flip(r))).toContain('2BA');
    for (const r of SHOW.flat()) expect(winText(show(r))).toContain('slope');
    expect(winText(out(OUT[0][0]))).toMatch(/^Spotted!/);
    expect(winText(show(SHOW[0][0]))).toMatch(/^Signal received! .* rises 6 mWb/);
    expect(winText(show(SHOW[1][0]))).toMatch(/falls 10 mWb/);
  });

  it('the targets are shown to 3 significant figures, and the goal line carries them', () => {
    expect(goalLine(out(OUT[0][0]))).toBe('Light Wink: it needs 1.00 V');
    expect(goalLine(tube(TUBE[0][0]))).toBe('Light Wink: it needs 0.505 V');
    expect(goalLine(flip(FLIP[2][0]))).toBe('Light Wink: it needs 62.8 mA');
    expect(goalLine(show(SHOW[0][0]))).toBe('Signal: Wink peaks at exactly 0.300 V');
  });

  it('the hint line follows the helper level', () => {
    expect(hintText(out(OUT[0][0], 0))).toMatch(/Dive 1: the console meter is live\.$/);
    expect(hintText(out(OUT[0][0], 1))).toMatch(/a console check costs a charge\.$/);
    expect(hintText(out(OUT[0][0], 2))).toMatch(/Final dive: no meter\.$/);
    expect(hintText(flip(FLIP[0][0]))).toContain('Wink needs 314 mA');
  });

  it('the check and the LCD print the player’s own value, and agree with the physics', () => {
    const o = out(OUT[0][0]);
    expect(lcdText(o, { th: 60 })).toBe('WINK 1 V');
    expect(meterText(o, { th: 60 })).toBe('Console check: tilted to 60°, the hoop links 0.5 Wb, so Wink would get 1 V.');
    expect(lcdText(o, { th: 90 })).toBe('WINK 0 V');
    expect(lcdText(tube(TUBE[0][0]), { r: 4 })).toBe('WINK 0.505 V');
    expect(lcdText(flip(FLIP[0][0]), { t: 0.5 })).toBe('WINK 314 mA');
    expect(lcdText(show(SHOW[0][0]), { n: 50 })).toBe('PEAK 0.3 V');
    expect(meterText(show(SHOW[0][0]), { n: 10 })).toBe('Console check: with 10 turns the brightest step would give Wink 0.06 V.');
    expect(LCD_OFF).toBe('— — —');
    for (const r of [out(OUT[0][0]), tube(TUBE[0][0]), flip(FLIP[0][0]), show(SHOW[0][0])]) {
      expect(lcdText(r, { th: 60, r: 4, t: 0.5, n: 50 })).toMatch(/^(WINK|PEAK) /);
      expect(meterText(r, { th: 60, r: 4, t: 0.5, n: 50 })).toMatch(/^Console check: /);
    }
  });

  it('the physics helpers agree with textbook values', () => {
    expect(emfOut(OUT[0][0], 60)).toBeCloseTo(1, 9);
    expect(emfFlip(FLIP[0][0], 0.5)).toBeCloseTo(1.2566, 3);
    expect(GLOW).toEqual({ dim: 0.25, blown: 0.6, win: 1 });
  });
});
