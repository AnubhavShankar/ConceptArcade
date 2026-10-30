import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIAL, STEP, angleText, buildRounds, cosText, explain, intel, judge, landing, missText, piText, rayEnd, scale, sinText, spotterText, square, surdText, tanText, value, type Round } from './logic';

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
      expect([-2, -3, -4]).toContain(r.k);
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
      expect(missText(r, { k: r.k + 1 })).toMatch(/over the robot/);
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
