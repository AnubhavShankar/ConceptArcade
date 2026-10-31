import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIAL, GADGET, GROUND, ORIGIN, STEP, absSurd, angleText, buildRounds, cosText, explain, flip, frame, intel, judge, landing, missEnd, missText, piText, rayEnd, scale, sinText, spotterText, square, surdText, tanText, value, type Round } from './logic';

const seeds = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const all = (level: number) => seeds.flatMap((s) => buildRounds(level, createRng(s)));
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('writing angles and surds', () => {
  it('writes steps of π/12 the textbook way', () => {
    expect([0, 1, 2, 3, 4, 6, 8, 9, 10, 12].map(piText)).toEqual(['0', 'π/12', 'π/6', 'π/4', 'π/3', 'π/2', '2π/3', '3π/4', '5π/6', 'π']);
    expect([-2, -4, -6].map(piText)).toEqual(['−π/6', '−π/3', '−π/2']);
    expect(angleText(-3)).toBe('−π/4 (−45°)');
  });
  it('writes surds and squares them exactly', () => {
    expect(surdText({ c: 15, root: 3 })).toBe('15√3');
    expect(surdText({ c: -8, root: 2 })).toBe('−8√2');
    expect(surdText({ c: 20, root: 1 })).toBe('20');
    expect(square({ c: 15, root: 3 })).toBe(675);
  });
  it('the ratio tables agree with the trig functions', () => {
    const num = (s: string) => Number(s.replace('−', '-').replace(/(\d*)√(\d)/g, (_, c, r) => String((c ? Number(c) : 1) * Math.sqrt(Number(r)))).split('/').reduce((a, b) => String(Number(a) / Number(b))));
    for (const k of [-4, -3, -2, 2, 3, 4]) expect(num(tanText(k))).toBeCloseTo(Math.tan(k * STEP), 9);
    for (const k of [-6, -4, -3, -2, 2, 3, 4, 6]) expect(num(sinText(k))).toBeCloseTo(Math.sin(k * STEP), 9);
    for (const k of [2, 3, 4, 6, 8, 9, 10]) expect(num(cosText(k))).toBeCloseTo(Math.cos(k * STEP), 9);
  });
});

describe('every round is a true triangle with one exact answer', () => {
  it('street: the tilt is tan⁻¹(−h/d), below the horizontal', () => {
    for (const r of all(1)) {
      expect(r.kind).toBe('street');
      expect(close(Math.atan(-value(r.h!) / value(r.d!)), r.k * STEP)).toBe(true);
      expect([-1, -2, -3, -4, -5]).toContain(r.k);
    }
  });
  it('range: the range is a whole number of metres equal to √(h² + d²)', () => {
    for (const r of all(2)) {
      expect(close(Math.atan(-value(r.h!) / value(r.d!)), r.k * STEP)).toBe(true);
      expect(Number.isInteger(r.range!)).toBe(true);
      expect(square(r.h!) + square(r.d!)).toBe(r.range! * r.range!);
      expect(r.range!).toBeGreaterThanOrEqual(DIAL.range.min);
      expect(r.range!).toBeLessThanOrEqual(DIAL.range.max);
    }
  });
  it('sky: the tilt is sin⁻¹(y/r), and each level has a target above and one below', () => {
    for (const s of seeds) {
      const rs = buildRounds(3, createRng(s));
      for (const r of rs) expect(close(Math.asin(value(r.y!) / r.r!), r.k * STEP)).toBe(true);
      expect(rs.some((r) => r.k > 0) && rs.some((r) => r.k < 0)).toBe(true);
    }
  });
  it('turret: the bearing is cos⁻¹(x/r) in [0, π], and the boss is never east of straight out', () => {
    for (const s of seeds) {
      const rs = buildRounds(4, createRng(s));
      for (const r of rs) {
        expect(close(Math.acos(value(r.x!) / r.r!), r.k * STEP)).toBe(true);
        expect(r.k).toBeGreaterThanOrEqual(0);
        expect(r.k).toBeLessThanOrEqual(12);
      }
      expect(rs.some((r) => r.k > 6)).toBe(true);
      expect(rs[2].k).toBeGreaterThanOrEqual(6);
    }
  });
  it('the helpers fade: live, reduced, none', () => {
    for (const level of [1, 2, 3, 4]) expect(buildRounds(level, createRng(5)).map((r) => r.assist)).toEqual([0, 1, 2]);
  });
  it('exactly one setting of the dials wins each round', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        const dial = level === 4 ? DIAL.pan : DIAL.tilt;
        let wins = 0;
        for (let k = dial.min; k <= dial.max; k++) {
          if (level === 2) for (let m = DIAL.range.min; m <= DIAL.range.max; m++) wins += judge(r, { k, range: m }) ? 1 : 0;
          else wins += judge(r, { k }) ? 1 : 0;
        }
        expect(wins).toBe(1);
      }
    }
  });
});

describe('a miss shows its effect and never the answer', () => {
  const wrongs = (r: Round) => {
    const dial = r.kind === 'turret' ? DIAL.pan : DIAL.tilt;
    const out: number[] = [];
    for (let k = dial.min; k <= dial.max; k++) if (k !== r.k) out.push(k);
    return out;
  };
  it('no miss or spotter text names the winning angle or range', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 40)) {
        for (const k of wrongs(r)) {
          const t = missText(r, { k, range: r.range });
          expect(t.length).toBeGreaterThan(20);
          expect(t).not.toContain('π');
          expect(t).not.toContain('°');
          expect(spotterText(r, { k })).not.toContain('π');
        }
        if (r.kind === 'range') {
          const t = missText(r, { k: r.k, range: r.range! + 3 });
          expect(t).toMatch(/farther/);
          expect(t).not.toContain(String(r.range));
          expect(missText(r, { k: r.k, range: r.range! - 3 })).toMatch(/nearer/);
        }
      }
    }
  });
  it('street misses say short or over, in the right direction', () => {
    for (const r of all(1)) {
      if (r.k > -6 + 1) expect(missText(r, { k: r.k - 1 })).toMatch(/short of the robot/);
      if (r.k < -1) expect(missText(r, { k: r.k + 1 })).toMatch(/over the robot/);
      expect(landing(r, r.k)).toBeCloseTo(value(r.d!), 9);
    }
  });
  it('sky and turret misses say which side the shot went', () => {
    for (const r of all(3)) {
      if (r.k < 6) expect(missText(r, { k: r.k + 1 })).toMatch(/above/);
      if (r.k > -6) expect(missText(r, { k: r.k - 1 })).toMatch(/below/);
    }
    for (const r of all(4)) {
      expect(missText(r, { k: r.k - 1 })).toMatch(/east/);
      expect(missText(r, { k: r.k + 1 })).toMatch(/west/);
    }
  });
});

describe('the working and the picture', () => {
  it('the explanation names the function, the branch and the answer', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level).slice(0, 30)) {
        const e = explain(r);
        expect(e).toContain(piText(r.k));
        expect(e).toMatch(level === 4 ? /cos⁻¹/ : level === 3 ? /sin⁻¹/ : /tan⁻¹/);
        if (level === 2) expect(e).toContain(`= ${r.range} m`);
        expect(intel(r).length).toBeGreaterThan(20);
      }
    }
  });
  it('the target is drawn inside the scene, and the right shot ends on it', () => {
    for (const level of [1, 2, 3, 4]) {
      for (const r of all(level)) {
        expect(r.vx).toBeGreaterThanOrEqual(40);
        expect(r.vx).toBeLessThanOrEqual(460);
        expect(r.vy).toBeGreaterThanOrEqual(10);
        expect(r.vy).toBeLessThanOrEqual(330);
        const { sx, sy } = scale(r);
        expect(Number.isFinite(sx) && Number.isFinite(sy) && sx > 0 && sy > 0).toBe(true);
        expect(rayEnd(r, r.k)).toEqual([r.vx, r.vy]);
        const off = rayEnd(r, r.k === 6 || r.k === 12 ? r.k - 1 : r.k + 1);
        expect(Number.isFinite(off[0]) && Number.isFinite(off[1])).toBe(true);
      }
    }
  });
});

describe('level 5: gadget readouts (sec⁻¹, cosec⁻¹, cot⁻¹)', () => {
  const seeds80 = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
  const rounds5 = (s: number) => buildRounds(5, createRng(s));
  const num = (s: string) => Number(s.replace('−', '-').replace(/(\d*)√(\d)/g, (_, c, r) => String((c ? Number(c) : 1) * Math.sqrt(Number(r)))).split('/').reduce((a, b) => String(Number(a) / Number(b))));
  const dialOf = (r: Round) => (frame(r) === 'turret' ? DIAL.pan : DIAL.tilt);

  it('every reading is the true reciprocal, and its principal value is the step (checked numerically)', () => {
    for (const [k, t] of Object.entries(GADGET.sec)) {
      expect(Math.acos(1 / num(t))).toBeCloseTo(Number(k) * STEP, 9); // sec⁻¹ x = cos⁻¹(1/x), in [0, π]
      expect(num(t)).toBeCloseTo(1 / Math.cos(Number(k) * STEP), 9);
    }
    for (const [k, t] of Object.entries(GADGET.cosec)) {
      expect(Math.asin(1 / num(t))).toBeCloseTo(Number(k) * STEP, 9); // cosec⁻¹ x = sin⁻¹(1/x), in [−π/2, π/2]
      expect(num(t)).toBeCloseTo(1 / Math.sin(Number(k) * STEP), 9);
    }
    for (const [k, t] of Object.entries(GADGET.cot)) {
      expect(Math.PI / 2 - Math.atan(num(t))).toBeCloseTo(Number(k) * STEP, 9); // cot⁻¹ x = π/2 − tan⁻¹ x, in (0, π)
      expect(Number(k) * STEP).toBeGreaterThan(0);
      expect(Number(k) * STEP).toBeLessThan(Math.PI);
    }
    expect(Object.keys(GADGET.sec).map(Number)).toEqual([2, 3, 4, 8, 9, 10]);
    expect(Object.keys(GADGET.cosec).map(Number).sort((a, b) => a - b)).toEqual([-6, -4, -3, -2, 2, 3, 4, 6]);
    expect(Object.keys(GADGET.cot).map(Number)).toEqual([2, 3, 4, 6, 8, 9, 10]);
  });

  it('the rounds are sec, cosec, cot in order, and the reading is the true ratio of the sides', () => {
    for (const s of seeds80) {
      const rs = rounds5(s);
      expect(rs.map((r) => r.fn)).toEqual(['sec', 'cosec', 'cot']);
      expect(rs.map((r) => r.kind)).toEqual(['gadget', 'gadget', 'gadget']);
      expect(rs.map((r) => frame(r))).toEqual(['turret', 'sky', 'turret']);
      const [sec, cosec, cot] = rs;
      expect(sec.ratio).toBe(GADGET.sec[sec.k]);
      expect(cosec.ratio).toBe(GADGET.cosec[cosec.k]);
      expect(cot.ratio).toBe(GADGET.cot[cot.k]);
      // sec θ = range / east offset, with the sign of the offset
      expect(num(sec.ratio!)).toBeCloseTo(sec.r! / value(sec.x!), 9);
      expect(Math.acos(value(sec.x!) / sec.r!)).toBeCloseTo(sec.k * STEP, 9);
      expect(sec.k).not.toBe(6);
      // cosec θ = range / height, with the sign of the height
      expect(num(cosec.ratio!)).toBeCloseTo(cosec.r! / value(cosec.y!), 9);
      expect(Math.asin(value(cosec.y!) / cosec.r!)).toBeCloseTo(cosec.k * STEP, 9);
      expect(cosec.k).not.toBe(0);
      expect(cosec.k < 0).toBe(value(cosec.y!) < 0);
      // cot θ = east offset / height, the height above the turret is positive
      const height = Math.sqrt(cot.r! * cot.r! - square(cot.x!));
      expect(height).toBeGreaterThan(0);
      expect(num(cot.ratio!)).toBeCloseTo(value(cot.x!) / height, 9);
      expect(Math.PI / 2 - Math.atan(value(cot.x!) / height)).toBeCloseTo(cot.k * STEP, 9);
      expect(cot.vy).toBeLessThan(ORIGIN.turret[1]);
      expect(rs.map((r) => r.assist)).toEqual([0, 1, 2]);
    }
  });

  it('the negative readings: cosec⁻¹ gives a negative angle, sec⁻¹ and cot⁻¹ an obtuse one', () => {
    for (const s of seeds80) {
      const [sec, cosec, cot] = rounds5(s);
      expect(sec.ratio!.startsWith('−')).toBe(sec.k > 6);
      expect(cosec.ratio!.startsWith('−')).toBe(cosec.k < 0);
      expect(cot.ratio!.startsWith('−')).toBe(cot.k > 6);
    }
  });

  it('the boss is obtuse for most seeds and acute (or straight up) for some', () => {
    const bosses = seeds80.map((s) => rounds5(s)[2].k);
    const obtuse = bosses.filter((k) => k > 6).length;
    expect(obtuse).toBeGreaterThanOrEqual(1);
    expect(bosses.some((k) => k <= 6)).toBe(true);
    expect(obtuse).toBeGreaterThan(bosses.length / 2);
    expect(bosses.some((k) => k === 6)).toBe(true);
  });

  it('exactly one dial setting wins each round, and the starting setting never does', () => {
    for (const s of seeds80) {
      for (const r of rounds5(s)) {
        const d = dialOf(r);
        let wins = 0;
        for (let k = d.min; k <= d.max; k++) wins += judge(r, { k }) ? 1 : 0;
        expect(wins).toBe(1);
        expect(judge(r, { k: 0 })).toBe(false); // both dials start at 0 in this level
        expect(r.k).toBeGreaterThanOrEqual(d.min);
        expect(r.k).toBeLessThanOrEqual(d.max);
      }
    }
  });

  it('the round uses the right dial: pan 0..12 for sec and cot, tilt −6..6 for cosec', () => {
    const [sec, cosec, cot] = rounds5(7);
    expect([dialOf(sec), dialOf(cosec), dialOf(cot)]).toEqual([DIAL.pan, DIAL.tilt, DIAL.pan]);
  });

  it('the tracer ends on the target for the winning angle and nowhere near it for any other setting', () => {
    for (const s of seeds80.slice(0, 40)) {
      for (const r of rounds5(s)) {
        const d = dialOf(r);
        for (let k = d.min; k <= d.max; k++) {
          const end = rayEnd(r, k);
          const onTarget = end[0] === r.vx && end[1] === r.vy;
          expect(onTarget).toBe(judge(r, { k }));
          if (!onTarget) expect(Math.hypot(end[0] - r.vx, end[1] - r.vy)).toBeGreaterThan(1e-6);
        }
        const { sx, sy } = scale(r);
        expect(Number.isFinite(sx) && Number.isFinite(sy) && sx > 0 && sy > 0).toBe(true);
        expect(r.vx).toBeGreaterThanOrEqual(40);
        expect(r.vx).toBeLessThanOrEqual(460);
        expect(r.vy).toBeGreaterThanOrEqual(10);
        expect(r.vy).toBeLessThanOrEqual(330);
      }
    }
  });

  it('no intel, miss or spotter text gives the angle, and a miss names only the side the shot went', () => {
    for (const s of seeds80.slice(0, 40)) {
      for (const r of rounds5(s)) {
        const d = dialOf(r);
        expect(intel(r)).toContain(r.ratio!);
        expect(intel(r)).not.toContain('π');
        expect(intel(r)).not.toContain('°');
        for (let k = d.min; k <= d.max; k++) {
          if (k === r.k) continue;
          for (const t of [missText(r, { k }), spotterText(r, { k })]) {
            expect(t.length).toBeGreaterThan(20);
            expect(t).not.toContain('π');
            expect(t).not.toContain('°');
            expect(t).not.toContain(r.ratio!);
          }
        }
      }
    }
    const [sec, cosec, cot] = rounds5(11);
    expect(missText(sec, { k: sec.k > 6 ? 0 : 12 })).toMatch(/west|east/);
    expect(missText(cosec, { k: cosec.k > 0 ? -6 : 6 })).toMatch(/above|below/);
    expect(missText(cot, { k: cot.k > 6 ? 0 : 12 })).toMatch(/west|east/);
  });

  it('the working names the function, the reading, the branch and the angle', () => {
    for (const s of seeds80) {
      const [sec, cosec, cot] = rounds5(s);
      expect(explain(sec)).toContain(`sec θ = ${sec.ratio}`);
      expect(explain(sec)).toContain(`cos θ = ${cosText(sec.k)}`);
      expect(explain(sec)).toMatch(/branch of sec⁻¹ is \[0, π\]/);
      expect(explain(sec)).toContain(angleText(sec.k));
      expect(explain(cosec)).toContain(`cosec θ = ${cosec.ratio}`);
      expect(explain(cosec)).toContain(`sin θ = ${sinText(cosec.k)}`);
      expect(explain(cosec)).toMatch(/branch of cosec⁻¹ is \[−π\/2, π\/2\]/);
      expect(explain(cosec)).toContain(angleText(cosec.k));
      expect(explain(cot)).toMatch(/cot⁻¹|branch \(0, π\)/);
      if (cot.k === 6) expect(explain(cot)).toContain('θ = π/2');
      else {
        expect(explain(cot)).toContain(angleText(cot.k));
        expect(explain(cot)).toMatch(cot.k > 6 ? /obtuse/ : /acute/);
        expect(num(explain(cot).match(/tan θ = (\S+?)\. The/)![1])).toBeCloseTo(Math.tan(cot.k * STEP), 9);
      }
    }
    expect(intel(rounds5(3)[1])).toMatch(/Tilt the scope/);
    expect(intel(rounds5(3)[0])).toMatch(/Swing the turret/);
  });
});

describe('levels 1 and 3: the wider pools (π/12 and 5π/12 join the special angles)', () => {
  it('two-term lengths are written with their common factor out, and the signs flip cleanly', () => {
    expect(surdText({ c: 20, root: 1, c2: 10, root2: 3 })).toBe('10(2 + √3)');
    expect(surdText({ c: 5, root: 6, c2: -5, root2: 2 })).toBe('5(√6 − √2)');
    expect(surdText(flip({ c: 5, root: 6, c2: -5, root2: 2 }))).toBe('−5(√6 − √2)');
    expect(surdText({ c: 1, root: 6, c2: 1, root2: 2 })).toBe('(√6 + √2)');
    expect(surdText(absSurd(flip({ c: 1, root: 6, c2: 1, root2: 2 })))).toBe('(√6 + √2)');
    expect(value({ c: 20, root: 1, c2: 10, root2: 3 })).toBeCloseTo(10 * (2 + Math.sqrt(3)), 12);
    expect(square({ c: 5, root: 6, c2: -5, root2: 2 })).toBeCloseTo((5 * (Math.sqrt(6) - Math.sqrt(2))) ** 2, 9);
  });
  it('the new ratios are the true tan and sin of 15° and 75°, written with brackets where a minus sign needs them', () => {
    expect(Math.tan(STEP)).toBeCloseTo(2 - Math.sqrt(3), 12);
    expect(Math.tan(5 * STEP)).toBeCloseTo(2 + Math.sqrt(3), 12);
    expect(Math.sin(STEP)).toBeCloseTo((Math.sqrt(6) - Math.sqrt(2)) / 4, 12);
    expect(Math.sin(5 * STEP)).toBeCloseTo((Math.sqrt(6) + Math.sqrt(2)) / 4, 12);
    expect([tanText(1), tanText(-1), tanText(5), tanText(-5)]).toEqual(['2 − √3', '−(2 − √3)', '2 + √3', '−(2 + √3)']);
    expect([sinText(1), sinText(-1), sinText(5), sinText(-5)]).toEqual(['(√6 − √2)/4', '−(√6 − √2)/4', '(√6 + √2)/4', '−(√6 + √2)/4']);
  });
  it('street: each level draws three different tilts, and over the seeds every tilt from π/12 to 5π/12 comes up in every round', () => {
    const seen = [new Set<number>(), new Set<number>(), new Set<number>()];
    for (const s of seeds) {
      const rs = buildRounds(1, createRng(s));
      expect(new Set(rs.map((r) => r.k)).size).toBe(3);
      rs.forEach((r, i) => seen[i].add(r.k));
    }
    for (const set of seen) expect([...set].sort((a, b) => a - b)).toEqual([-5, -4, -3, -2, -1]);
    const hard = all(1).filter((r) => r.k === -1 || r.k === -5);
    expect(hard.length).toBeGreaterThan(50);
    for (const r of hard) {
      expect(r.h!.c2 === undefined).toBe(r.k === -1);
      expect(r.d!.c2 === undefined).toBe(r.k === -5);
      expect(Math.atan(-value(r.h!) / value(r.d!))).toBeCloseTo(r.k * STEP, 12);
    }
  });
  it('sky: three different tilts out of π/12 to 5π/12 and a boss that is one of them or straight up, above and below', () => {
    const ans = new Set<number>();
    let straight = 0;
    for (const s of seeds) {
      const rs = buildRounds(3, createRng(s));
      expect(new Set(rs.slice(0, 2).map((r) => Math.abs(r.k))).size).toBe(2);
      expect(rs[0].k * rs[1].k).toBeLessThan(0);
      rs.forEach((r) => {
        ans.add(r.k);
        expect(Math.asin(value(r.y!) / r.r!)).toBeCloseTo(r.k * STEP, 12);
        expect(r.r!).toBeGreaterThanOrEqual(10);
      });
      if (Math.abs(rs[2].k) === 6) straight++;
    }
    for (const k of [1, 2, 3, 4, 5, -1, -2, -3, -4, -5]) expect(ans.has(k)).toBe(true);
    expect(straight).toBeGreaterThan(0);
    expect(straight).toBeLessThan(seeds.length / 2);
  });
  it('the working for the new rows names the sum and the exact ratio', () => {
    for (const r of all(1).filter((x) => x.k === -1 || x.k === -5).slice(0, 10)) {
      const e = explain(r);
      expect(e).toContain(`= ${tanText(r.k)}`);
      expect(e).toContain(`tan⁻¹(${tanText(r.k)}) = ${piText(r.k)}`);
      expect(e).toMatch(/\(\d+\(2 \+ √3\)\)|\(2 \+ √3\)/);
    }
    for (const r of all(3).filter((x) => Math.abs(x.k) === 1 || Math.abs(x.k) === 5).slice(0, 10)) {
      expect(explain(r)).toContain(`= ${sinText(r.k)}`);
      expect(explain(r)).toMatch(/√6/);
      expect(intel(r)).toMatch(/\(√6 [−+] √2\)/);
    }
  });
});

describe('a miss shows no number, and its tracer ends at a fixed spot for the side the shot went', () => {
  const dials = (r: Round) => (frame(r) === 'turret' ? DIAL.pan : DIAL.tilt);
  /** Every wrong setting of a round: all tilts, and for the range level three ranges (short, long) with the true tilt as well. */
  const wrongShots = (r: Round) => {
    const out: { k: number; range?: number }[] = [];
    const d = dials(r);
    for (let k = d.min; k <= d.max; k++) {
      if (r.kind === 'range') for (const range of [r.range! - 5, r.range! - 1, r.range!, r.range! + 1, r.range! + 5]) out.push({ k, range });
      else out.push({ k });
    }
    return out.filter((s) => !judge(r, s));
  };
  it('no miss text holds a digit, in levels 1 to 4', () => {
    for (const level of [1, 2, 3, 4]) for (const r of all(level).slice(0, 60)) for (const s of wrongShots(r)) expect(missText(r, s)).not.toMatch(/\d/);
  });
  it('the same words always end the tracer at the same spot, and no ending is on the target or off the scene', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      for (const r of all(level).slice(0, 90)) {
        const byText = new Map<string, Set<string>>();
        for (const s of wrongShots(r)) {
          const end = missEnd(r, s);
          expect(end[0]).toBeGreaterThanOrEqual(10);
          expect(end[0]).toBeLessThanOrEqual(470);
          expect(end[1]).toBeGreaterThanOrEqual(4);
          expect(end[1]).toBeLessThanOrEqual(GROUND[frame(r)]);
          // 40 px from the target (at least 20 where the edge of the scene clips it)
          expect(Math.hypot(end[0] - r.vx, end[1] - r.vy)).toBeGreaterThanOrEqual(20);
          const t = missText(r, s);
          byText.set(t, (byText.get(t) ?? new Set()).add(end.join()));
        }
        for (const ends of byText.values()) expect(ends.size).toBe(1);
      }
    }
  });
  it('the ending is the same fixed offset in every round of a level (40 px beside the target), never a function of how far off the setting was', () => {
    for (const r of all(1).slice(0, 60)) {
      const steeper = r.k > -5 ? missEnd(r, { k: r.k - 1 }) : null;
      const steepest = r.k > -4 ? missEnd(r, { k: r.k - 2 }) : null;
      if (steeper && steepest) expect(steeper).toEqual(steepest);
      expect(missEnd(r, { k: r.k + 1 }) === undefined).toBe(false);
      if (r.k < -1) expect(missEnd(r, { k: r.k + 1 })).toEqual([Math.min(470, r.vx + 40), r.vy]);
      if (steeper && r.k > -5) expect(steeper).toEqual([r.vx - 40, r.vy]);
    }
  });
  it('the start (0) is one constant and never wins, in any level', () => {
    for (const level of [1, 2, 3, 4, 5]) for (const r of all(level)) expect(judge(r, { k: 0, range: 20 })).toBe(false);
  });
});
