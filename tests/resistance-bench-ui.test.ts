// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/physics/class-12/ch03-current-electricity/resistance-bench/index';
import { COL, buildRounds, ohms, wantValue, type Round } from '../src/games/physics/class-12/ch03-current-electricity/resistance-bench/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'resistance-bench', 5);
const build = (level: number, seed: number) => buildRounds(level as 1 | 2 | 3 | 4 | 5, createRng(seed));
const fireLabel = (level: number) => (level === 5 ? 'Fit the resistor and switch on the pump' : 'Send the bucket truck up to the line here');
const TESTER = 'Tester check: read the tester for this setting';
const LEVELS = [1, 2, 3, 4, 5];

function set(r: Round, right: boolean) {
  if (r.kind === 'joint') h.setSlider(right ? r.bad : r.bad + 1);
  else if (r.kind === 'bands') {
    h.setSlider(r.d1, 0);
    h.setSlider(right ? r.d2 : r.d2 + 1, 1);
    h.setSlider(r.m, 2);
  } else h.setSlider(right ? r.d : r.d + 0.5);
}
shellTests<Round[]>(h, {
  levels: LEVELS,
  build,
  setRight: (g, k) => set(g[k], true),
  setWrong: (g, k) => set(g[k], false),
  commit: (level) => h.click(fireLabel(level)),
});

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s: string, token: string) => new RegExp(`(^|[^0-9.])${escape(token)}(?![0-9]|\\.[0-9])`).test(s);

// A canvas recorder: every string drawn.
const recorder = () => {
  const rec = { at: [] as { s: string; x: number; y: number }[] };
  const proxy = new Proxy({}, {
    get: (_t, p) => (p === 'fillText' ? (s: string, x: number, y: number) => rec.at.push({ s: String(s), x, y }) : () => undefined),
    set: () => true,
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  return rec;
};
type Rec = ReturnType<typeof recorder>;
/** Advance to the end of one frame and return the strings drawn in that frame. */
const frame = (rec: Rec, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  rec.at.length = 0;
  h.advance(0.05);
  return rec.at.map((a) => a.s);
};
/** Start a level (with the recorder on) and win the first `round` rounds. */
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    set(g[k], true);
    h.click(fireLabel(level));
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};
const LCD_RE = [/^short here: /, /at \+2 V/, /^short here: /, /^short here: /, /^your bands: /];
const lcdDrawn = (level: number, texts: string[]) => texts.some((s) => LCD_RE[level - 1].test(s));
const GOAL_RE = [/Find the short/, /Find the corroded joint/, /Find the short/, /Find the short/, /Pump resistor/];

describe('Line Down', () => {
  it('levels 1, 3 and 4 have one slider, Truck at, 0 to 12 in steps of 0.5, starting at 0', () => {
    for (const level of [1, 3, 4]) {
      h.start(level, 5);
      const [s] = h.sliders();
      expect(h.sliders().length).toBe(1);
      expect([Number(s.min), Number(s.max), Number(s.step), Number(s.value)]).toEqual([0, 12, 0.5, 0]);
      expect(h.$('.control-label')?.textContent).toBe('Truck at');
    }
  });

  it('level 2 has the slider Joint, 1 to 8, starting at 1', () => {
    h.start(2, 5);
    const [s] = h.sliders();
    expect(h.sliders().length).toBe(1);
    expect([Number(s.min), Number(s.max), Number(s.value)]).toEqual([1, 8, 1]);
    expect(h.$('.control-label')?.textContent).toBe('Joint');
  });

  it('level 5 has Band 1 (1 to 9), Band 2 (0 to 9) and Multiplier (0 to 6), starting brown, black, black', () => {
    h.start(5, 5);
    const [b1, b2, m] = h.sliders();
    expect(h.sliders().length).toBe(3);
    const labels = [...document.querySelectorAll('.control-label')].map((e) => e.textContent);
    expect(labels).toEqual(['Band 1', 'Band 2', 'Multiplier']);
    expect([Number(b1.min), Number(b1.max), Number(b1.value)]).toEqual([1, 9, 1]);
    expect([Number(b2.min), Number(b2.max), Number(b2.value)]).toEqual([0, 9, 0]);
    expect([Number(m.min), Number(m.max), Number(m.value)]).toEqual([0, 6, 0]);
    const readout = h.$('.lab-controls')!.textContent!;
    expect(readout).toContain('brown');
    expect(readout).toContain('black');
  });

  it('a level 1 miss short of the answer says farther out, one past it says Drive back, and the heart drops at 0.95 s', () => {
    h.start(1, 5);
    const r = build(1, 5)[0] as Extract<Round, { kind: 'break' }>;
    h.setSlider(r.d - 0.5);
    h.click(fireLabel(1));
    h.advance(0.85);
    expect(h.hearts()).toBe(3);
    h.advance(0.15);
    expect(h.hearts()).toBe(2);
    h.advance(2);
    expect(h.feedback()).toMatch(/farther out/);
    expect(h.feedback()).not.toContain(`km ${r.d}`);
    h.setSlider(r.d + 0.5);
    h.click(fireLabel(1));
    h.advance(2.8);
    expect(h.feedback()).toMatch(/Drive back/);
    expect(h.hearts()).toBe(1);
  });

  it('a level 2 miss says was sound and lands at 1.45 s', () => {
    h.start(2, 5);
    const r = build(2, 5)[0] as Extract<Round, { kind: 'joint' }>;
    h.setSlider(r.bad + 1);
    h.click(fireLabel(2));
    h.advance(1.35);
    expect(h.hearts()).toBe(3);
    h.advance(0.15);
    expect(h.hearts()).toBe(2);
    h.advance(1.2);
    expect(h.feedback()).toMatch(/was sound/);
    expect(has(h.feedback(), `Joint ${r.bad}`)).toBe(false);
  });

  it('a level 5 value too small says fuse blew, too big says never clicked, both land at 0.65 s', () => {
    h.start(5, 5);
    const r = build(5, 5)[0] as Extract<Round, { kind: 'bands' }>;
    h.setSlider(r.d1, 0);
    h.setSlider(r.d2, 1);
    h.setSlider(r.m - 1, 2);
    h.click(fireLabel(5));
    h.advance(0.55);
    expect(h.hearts()).toBe(3);
    h.advance(0.15);
    expect(h.hearts()).toBe(2);
    h.advance(2.2);
    expect(h.feedback()).toMatch(/fuse blew/);
    expect(h.feedback()).toMatch(/Use a bigger value/);
    h.setSlider(r.m + 1, 2);
    h.click(fireLabel(5));
    h.advance(0.55);
    expect(h.hearts()).toBe(2);
    h.advance(0.15);
    expect(h.hearts()).toBe(1);
    h.advance(2.2);
    expect(h.feedback()).toMatch(/never clicked/);
    expect(h.feedback()).toMatch(/Use a smaller value/);
  });

  it('a tester check costs a charge, then there are no charges left, in every level', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      h.click(TESTER);
      expect(h.feedback()).toMatch(/Tester check/);
      expect(h.hud()).toMatch(/Charges ·/);
      h.click(TESTER);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(h.hearts()).toBe(3);
    }
  });

  it('a win starts with the level’s own words and shows the working', () => {
    const heads = [/^Lights on! R = V\/I/, /^Health centre on!/, /^School lights on!/, /^Market lights on!/, /^Water’s flowing! R = V\/I/];
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], true);
      h.click(fireLabel(level));
      h.advance(2.8);
      expect(h.feedback()).toMatch(heads[level - 1]);
      expect(h.hearts()).toBe(3);
    }
  });

  it('the hint line fades round by round', () => {
    h.start(1, 5);
    expect(h.note()).toMatch(/Round 1: the tester screen is live/);
    const g = build(1, 5);
    set(g[0], true);
    h.click(fireLabel(1));
    h.advance(3.8);
    expect(h.note()).toMatch(/a tester check costs a charge/);
    set(g[1], true);
    h.click(fireLabel(1));
    h.advance(3.8);
    expect(h.note()).toMatch(/no tester screen/);
  });
});

describe('Line Down: what is drawn', () => {
  it('draws the goal line in the first frame of every round, and the round banner', () => {
    for (const level of LEVELS) {
      const rec = recorder();
      h.start(level, 5);
      const first = frame(rec);
      expect(first.some((s) => GOAL_RE[level - 1].test(s))).toBe(true);
      expect(first).toContain(level === 5 ? 'JOB 1' : 'DUSK');
      playTo(level, 1);
      const second = frame(rec, 0.1);
      expect(second.some((s) => GOAL_RE[level - 1].test(s))).toBe(true);
      expect(second).toContain(level === 5 ? 'JOB 2' : 'NIGHT');
      vi.restoreAllMocks();
    }
  });

  it('draws the player’s own setting', () => {
    for (const level of LEVELS) {
      const rec = recorder();
      h.start(level, 5);
      if (level === 2) h.setSlider(4);
      else if (level === 5) {
        h.setSlider(3, 0);
        h.setSlider(5, 1);
        h.setSlider(2, 2);
      } else h.setSlider(6.5);
      const s = frame(rec);
      if (level === 2) expect(s).toContain('J4');
      else if (level === 5) expect(s).toContain(`${COL[3]} · ${COL[5]} · ${COL[2]}`);
      else expect(s).toContain('6.5 km');
      vi.restoreAllMocks();
    }
  });

  it('the tester screen is live in round 1', () => {
    for (const level of LEVELS) {
      const rec = recorder();
      h.start(level, 5);
      if (level === 1 || level === 3 || level === 4) h.setSlider(2);
      expect(lcdDrawn(level, frame(rec))).toBe(true);
      expect(h.$('canvas')!.dataset.lcd).toBe('1');
      vi.restoreAllMocks();
    }
  });

  it('round 2 shows the screen only within 1.5 s after a tester check, and never in or after a miss; round 3 never before a win', () => {
    for (const level of LEVELS) {
      const rec = recorder();
      h.start(level, 5);
      const g = playTo(level, 1);
      expect(lcdDrawn(level, frame(rec, 0.1))).toBe(false);
      h.click(TESTER);
      expect(lcdDrawn(level, frame(rec))).toBe(true);
      expect(lcdDrawn(level, frame(rec, 1.2))).toBe(true);
      expect(lcdDrawn(level, frame(rec, 0.6))).toBe(false);
      // a miss: nothing live during or after the take
      set(g[1], false);
      h.click(fireLabel(level));
      for (let i = 0; i < 12; i++) expect(lcdDrawn(level, frame(rec, 0.2))).toBe(false);
      h.advance(0.6);
      // a win in round 2 shows the screen during the take
      set(g[1], true);
      h.click(fireLabel(level));
      expect(lcdDrawn(level, frame(rec, 0.3))).toBe(true);
      h.advance(3.8);
      // round 3: no screen, even after a tester check is refused, and not during a miss
      expect(lcdDrawn(level, frame(rec, 0.1))).toBe(false);
      h.click(TESTER);
      expect(lcdDrawn(level, frame(rec))).toBe(false);
      set(g[2], false);
      h.click(fireLabel(level));
      for (let i = 0; i < 12; i++) expect(lcdDrawn(level, frame(rec, 0.2))).toBe(false);
      vi.restoreAllMocks();
    }
  });

  it('never draws the answer before the player sets it, never FOUND IT! or a marker at the bad joint before a win', () => {
    for (const level of LEVELS) {
      const rec = recorder();
      h.start(level, 5);
      const g = build(level, 5);
      const r = g[0];
      const s = frame(rec);
      for (const str of s) {
        if (r.kind === 'bands') expect(str.includes(ohms(wantValue(r)))).toBe(false);
        else if (r.kind !== 'joint') {
          expect(str).not.toBe(`km ${r.d}`);
          expect(str).not.toBe(`${r.d} km`);
        }
        expect(str).not.toBe('FOUND IT!');
      }
      // a miss: no fault, no answer
      set(r, false);
      h.click(fireLabel(level));
      for (let i = 0; i < 14; i++) {
        for (const str of frame(rec, 0.15)) {
          expect(str).not.toBe('FOUND IT!');
          expect(str).not.toBe('YAY!');
          if (r.kind === 'bands') expect(str.includes(ohms(wantValue(r)))).toBe(false);
        }
      }
      vi.restoreAllMocks();
    }
  });

  it('the level 1 round 1 drag cue is drawn before the truck moves and not after it has moved', () => {
    const rec = recorder();
    h.start(1, 5);
    expect(frame(rec)).toContain('drag ⇔');
    h.setSlider(1);
    expect(frame(rec)).not.toContain('drag ⇔');
    h.setSlider(0);
    expect(frame(rec)).not.toContain('drag ⇔');
    vi.restoreAllMocks();
  });

  it('a win draws FOUND IT! in levels 1, 3 and 4, and a level 2 miss draws TRIP', () => {
    for (const level of [1, 3, 4]) {
      const rec = recorder();
      h.start(level, 5);
      set(build(level, 5)[0], true);
      h.click(fireLabel(level));
      const seen = new Set<string>();
      for (let i = 0; i < 15; i++) frame(rec, 0.15).forEach((x) => seen.add(x));
      expect(seen.has('FOUND IT!')).toBe(true);
      expect(seen.has('YAY!')).toBe(true);
      vi.restoreAllMocks();
    }
    const rec = recorder();
    h.start(2, 5);
    set(build(2, 5)[0], false);
    h.click(fireLabel(2));
    const seen = new Set<string>();
    for (let i = 0; i < 15; i++) frame(rec, 0.15).forEach((x) => seen.add(x));
    expect(seen.has('TRIP')).toBe(true);
    expect(seen.has('FOUND IT!')).toBe(false);
    vi.restoreAllMocks();
  });

  it('the miss text of every level ends by saying what to change', () => {
    const ends = [/Drive (farther out|back)\.$/, /Try another joint\.$/, /Drive (farther out|back)\.$/, /Drive (farther out|back)\.$/, /Use a (bigger|smaller) value\.$/];
    for (const level of LEVELS) {
      h.start(level, 5);
      set(build(level, 5)[0], false);
      h.click(fireLabel(level));
      h.advance(2.8);
      expect(h.feedback()).toMatch(ends[level - 1]);
    }
  });
});
