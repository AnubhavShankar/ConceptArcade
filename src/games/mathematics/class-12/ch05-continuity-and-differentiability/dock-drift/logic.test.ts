import { describe, expect, it } from 'vitest';
import { createRng } from '@core/random';
import { DIAL, POOLS, WALL_HEIGHT, buildRounds, fault, hintText, intel, judge, missEnd, missText, pingText, slope, where, winText, type Entry, type Kind } from './logic';

const seeds = Array.from({ length: 80 }, (_, i) => i * 7919 + 13);
const levels = [1, 2, 3, 4, 5] as const;
const kinds: Record<number, Kind> = { 1: 'product', 2: 'tower', 3: 'root', 4: 'sum', 5: 'invtrig' };
const entries: { level: number; k: number; e: Entry }[] = levels.flatMap((level) => POOLS[level].flatMap((pool, k) => pool.map((e) => ({ level, k, e }))));
const heights = Array.from({ length: DIAL.max - DIAL.min + 1 }, (_, i) => DIAL.min + i);
const evalText = (s: string) => (s === 'e' ? Math.E : s.includes('/') ? Number(s.split('/')[0]) / Number(s.split('/')[1]) : Number(s));
/** `\b` before a number so that '13 m' does not count as '3 m'. */
const hasMetres = (text: string, n: number) => new RegExp(`(^|[^0-9])${n} m`).test(text);

describe('every pool row is right', () => {
  it('has the brief’s size', () => {
    // level 1: 5 + 4 + 4, level 2: 3 + 5 + 4, level 3: 4 + 3 + 3, level 4: 2 + 3 + 3, level 5: 3 + 4 + 3
    expect(entries.length).toBe(13 + 12 + 10 + 8 + 10);
  });
  it('d · f′(x0) is ans (central difference), and ans is a whole number in the dial range', () => {
    for (const { e } of entries) {
      const slopeNum = (e.f(e.x0 + 1e-6) - e.f(e.x0 - 1e-6)) / 2e-6;
      expect(Math.abs(slopeNum * e.d - e.ans), e.text).toBeLessThan(1e-5);
      expect(Number.isInteger(e.ans)).toBe(true);
      expect(e.ans).toBeGreaterThanOrEqual(DIAL.min);
      expect(e.ans).toBeLessThanOrEqual(DIAL.max);
      expect(slope(e)).toBeCloseTo(slopeNum, 5);
    }
  });
  it('the working ends with the height it names, and x0Text is x0', () => {
    for (const { e } of entries) {
      const last = e.work.split('. ').pop() ?? '';
      if (e.ans === 0) expect(last, e.text).toMatch(/level/);
      else expect(last, e.text).toContain(`${Math.abs(e.ans)} m ${e.ans > 0 ? 'up' : 'down'}`);
      expect(evalText(e.x0Text)).toBeCloseTo(e.x0, 12);
      expect(e.d).toBeGreaterThan(0);
    }
  });
  it('the rail is finite at the release point and its text is a rail', () => {
    for (const { e } of entries) {
      expect(Number.isFinite(e.f(e.x0))).toBe(true);
      expect(e.text.startsWith('y = ')).toBe(true);
    }
  });
});

describe('exactly one winner', () => {
  it('for every row only ans passes judge over the whole dial', () => {
    for (const { e } of entries) expect(heights.filter((h) => judge(e, h)), e.text).toEqual([e.ans]);
  });
});

describe('levels', () => {
  it('give the kind of the level, assist 0, 1, 2, and a start that is in range and never the answer (80 seeds)', () => {
    for (const level of levels) {
      for (const seed of seeds) {
        const rounds = buildRounds(level, createRng(seed));
        expect(rounds.length).toBe(3);
        expect(rounds.map((r) => r.assist)).toEqual([0, 1, 2]);
        for (const r of rounds) {
          expect(r.kind).toBe(kinds[level]);
          expect(r.start).toBeGreaterThanOrEqual(DIAL.min);
          expect(r.start).toBeLessThanOrEqual(DIAL.max);
          expect(r.start).not.toBe(r.ans);
        }
      }
    }
  });
  it('vary from seed to seed', () => {
    for (const level of [1, 2, 3, 5] as const) {
      const seen = new Set(seeds.map((s) => buildRounds(level, createRng(s)).map((r) => r.text).join('|')));
      expect(seen.size).toBeGreaterThan(1);
    }
  });
});

describe('faults and words', () => {
  it('a clamp above the line is high and below is low', () => {
    for (const { e } of entries) {
      if (e.ans < DIAL.max) expect(fault(e, e.ans + 1)).toBe('high');
      if (e.ans > DIAL.min) expect(fault(e, e.ans - 1)).toBe('low');
      expect(fault(e, e.ans)).toBeNull();
    }
  });
  it('the miss text says underneath for high and above it for low, and names the player’s height', () => {
    for (const { e } of entries) {
      for (const h of heights) {
        if (h === e.ans) continue;
        const text = missText(e, h);
        expect(text).toContain(h > e.ans ? 'underneath' : 'above it');
        expect(text).toContain('bonked the hull');
        expect(text).toContain(where(h));
      }
    }
  });
  it('a miss text never contains the winning height (when the player’s own height is not the same size)', () => {
    for (const { e } of entries) {
      for (const h of heights) {
        if (h === e.ans || Math.abs(h) === Math.abs(e.ans)) continue;
        const text = missText(e, h);
        if (e.ans !== 0) expect(hasMetres(text, Math.abs(e.ans)), `${e.text} h=${h}: ${text}`).toBe(false);
        else expect(text).not.toMatch(/\b0 m/);
        expect(text).not.toMatch(/slope|derivative/);
      }
    }
  });
  it('the ping gives a direction and no digits', () => {
    for (const { e } of entries) {
      for (const h of heights) {
        const text = pingText(e, h);
        expect(text).toMatch(/below|above|right through/);
        expect(text.replace('Sensor ping:', '')).not.toMatch(/\d/);
        expect(text.includes('right through')).toBe(h === e.ans);
      }
    }
  });
  it('the hint line fades round by round, and the intel names the rail but never the answer', () => {
    for (const seed of seeds.slice(0, 20)) {
      for (const level of levels) {
        const [a, b, c] = buildRounds(level, createRng(seed));
        expect(hintText(a)).toMatch(/guide laser shows the drift line/);
        expect(hintText(b)).toMatch(/No laser: a sensor ping costs a charge/);
        expect(hintText(c)).toMatch(/Boss round: no laser, no ping/);
        for (const r of [a, b, c]) {
          expect(intel(r)).toContain(r.text);
          expect(intel(r)).toContain(`${r.d} m further on`);
          expect(intel(r)).not.toContain(r.work);
          expect(winText(r)).toBe(`Docked! ${r.work}`);
        }
      }
    }
  });
  it('where() reads the height', () => {
    expect(where(3)).toBe('3 m up');
    expect(where(-5)).toBe('5 m down');
    expect(where(0)).toBe('level with the release point');
  });
});

describe('where a missed robot hits the hull (brief 6.1)', () => {
  it('is on the side the robot really passes, near the clamp, within the wall, and never the true height', () => {
    for (const { e } of entries) {
      for (const h of heights) {
        if (h === e.ans) continue;
        const end = missEnd(e, h);
        // direction only: past the clamp, on the right side
        if (e.ans > h) expect(end).toBeGreaterThan(h);
        else expect(end).toBeLessThan(h);
        expect(Math.abs(end - h)).toBeLessThanOrEqual(2);
        expect(Math.abs(end)).toBeLessThanOrEqual(WALL_HEIGHT);
        expect(Math.abs(end - e.ans), `${e.text} h=${h}`).toBeGreaterThanOrEqual(0.5);
      }
    }
  });
  it('is 2 m past the clamp whenever that is not within half a metre of the answer', () => {
    for (const { e } of entries) {
      for (const h of heights) {
        if (h === e.ans) continue;
        const dir = e.ans > h ? 1 : -1;
        if (Math.abs(e.ans - (h + dir * 2)) >= 0.5 && Math.abs(h + dir * 2) <= WALL_HEIGHT) expect(missEnd(e, h)).toBe(h + dir * 2);
      }
    }
  });
});
