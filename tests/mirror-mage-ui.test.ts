// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import game from '../src/games/mathematics/class-12/ch07-integrals/mirror-mage/index';
import { GOLD, RING, RUNE, ringAngle, ringPoint, ringValue } from '../src/games/mathematics/class-12/ch07-integrals/mirror-mage/art';
import { GOAL, HANDLE_RADIUS } from '../src/games/mathematics/class-12/ch07-integrals/mirror-mage/index';
import { RANGE, UNIT, buildRounds, fault, manaText, type Round } from '../src/games/mathematics/class-12/ch07-integrals/mirror-mage/logic';
import { createRng } from '../src/core/random';
import { arcadeHarness, shellTests } from './helpers/arcade-harness';

const h = arcadeHarness(game, 'mirror-mage', 5);
type L = 1 | 2 | 3 | 4 | 5;
const LEVELS: L[] = [1, 2, 3, 4, 5];
const build = (level: number, seed: number) => buildRounds(level as L, createRng(seed));

shellTests<Round[]>(h, {
  levels: [1, 2, 3, 4, 5],
  build,
  setRight: (g, k) => h.setSlider(g[k].ans),
  setWrong: (g, k, level) => h.setSlider(g[k].ans + 1 <= RANGE[level as 1].max ? g[k].ans + 1 : g[k].ans - 1),
  commit: () => h.click('Cast the spell'),
});

const CAST = 'Cast the spell';
const MIRROR = 'Mirror spell: show the rune with its mirror image for a moment';
const YELLOW = '#ffd23f';
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The answer's text as a separate token, not part of a longer number or fraction. */
const holds = (s: string, token: string) => new RegExp(`(?<![\\w/π−])${escape(token)}(?![\\w/π])`).test(s);
/** The first setting of the dial that is `low` or `high` for this round. */
const wrongKind = (level: L, r: Round, kind: 'low' | 'high') => {
  const ks: number[] = [];
  for (let k = RANGE[level].min; k <= RANGE[level].max; k++) if (fault(UNIT[level], r, k) === kind) ks.push(k);
  return ks;
};

// A canvas recorder: every string drawn (with its position), every stroke (colour, dashed or not, number of points) and every fill colour.
const recorder = () => {
  const rec = { at: [] as { s: string; x: number; y: number }[], strokes: [] as { style: string; dash: boolean; n: number }[], fills: [] as string[], sizes: [] as number[], arcs: [] as { x: number; y: number; r: number }[] };
  const store: Record<string, unknown> = {};
  let n = 0;
  let dash = false;
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'fillText') return (s: string, x: number, y: number) => (rec.at.push({ s: String(s), x, y }), rec.sizes.push(Number(/(\d+(\.\d+)?)px/.exec(String(store.font))?.[1] ?? 99)));
      if (p === 'beginPath') return () => (n = 0);
      if (p === 'lineTo') return () => n++;
      if (p === 'setLineDash') return (a: number[]) => (dash = a.length > 0);
      if (p === 'stroke') return () => rec.strokes.push({ style: String(store.strokeStyle), dash, n });
      if (p === 'fill' || p === 'fillRect') return () => rec.fills.push(String(store.fillStyle));
      if (p === 'arc') return (x: number, y: number, r: number) => rec.arcs.push({ x, y, r });
      return () => undefined;
    },
    set: (_t, p, v) => {
      store[String(p)] = v;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  const clear = () => {
    rec.at.length = 0;
    rec.strokes.length = 0;
    rec.fills.length = 0;
    rec.sizes.length = 0;
    rec.arcs.length = 0;
  };
  return { rec, clear };
};
type Rec = ReturnType<typeof recorder>['rec'];
const frame = (r: ReturnType<typeof recorder>, dt = 0.05) => {
  if (dt > 0.05) h.advance(dt - 0.05);
  r.clear();
  h.advance(0.05);
  return r.rec;
};
const texts = (rec: Rec) => rec.at.map((a) => a.s);
/** The mirror spell's own marks: yellow dashed strokes, and in level 2 the gold partner region. */
const helperDrawn = (rec: Rec) => rec.strokes.some((s) => s.style === YELLOW && s.dash) || rec.fills.includes(GOLD);
const mirrorFlag = () => h.$('canvas')!.dataset.mirror;
const playTo = (level: number, round: number, seed = 5) => {
  const g = build(level, seed);
  for (let k = 0; k < round; k++) {
    h.setSlider(g[k].ans);
    h.click(CAST);
    h.advance(2.8);
    h.advance(1);
  }
  return g;
};

describe('Mirror Mage', () => {
  it('the slider range and start follow RANGE per level, in steps of 1', () => {
    for (const level of LEVELS) {
      h.start(level, 5);
      expect(h.sliders().length).toBe(1);
      const [s] = h.sliders();
      expect(Number(s.min)).toBe(RANGE[level].min);
      expect(Number(s.max)).toBe(RANGE[level].max);
      expect(Number(s.value)).toBe(RANGE[level].start);
      expect(Number(s.step)).toBe(1);
    }
  });

  it('the readout writes the mana of the dial in the level’s unit with a true minus sign', () => {
    h.start(1, 5);
    h.setSlider(13);
    expect(h.$('.lab-controls')!.textContent).toContain('13/2');
    h.start(3, 5);
    h.setSlider(12);
    expect(h.$('.lab-controls')!.textContent).toContain('1/12');
    h.start(5, 5);
    h.setSlider(-4);
    expect(h.$('.lab-controls')!.textContent).toContain('−(π/2) log 2');
  });

  it('a miss says fizzled (too little) or backfired (too much), costs a heart, and never states the right mana', () => {
    for (const level of LEVELS) {
      const r = build(level, 5)[0];
      for (const kind of ['low', 'high'] as const) {
        const ks = wrongKind(level, r, kind);
        if (ks.length === 0) continue;
        h.start(level, 5);
        h.setSlider(ks[0]);
        h.click(CAST);
        h.advance(2.8);
        expect(h.feedback()).toMatch(kind === 'low' ? /fizzled/ : /backfired/);
        expect(holds(h.feedback(), manaText(UNIT[level], r.ans))).toBe(false);
        expect(h.hearts()).toBe(2);
      }
    }
  });

  it('the mirror spell costs a charge, then No charges left', () => {
    h.start(2, 5);
    h.click(MIRROR);
    expect(h.feedback()).toMatch(/Mirror spell/);
    expect(h.hud()).toMatch(/Charges ·/);
    h.click(MIRROR);
    expect(h.feedback()).toMatch(/No charges left/);
    h.start(1, 5);
    h.click(MIRROR);
    expect(h.feedback()).toBe('Mirror spell: the rune shows where to split it.');
  });

  it('a win says Barrier broken! with the working, and the hint line fades round by round', () => {
    h.start(2, 5);
    expect(h.note()).toMatch(/Round 1: the mirror shows the rune’s hidden shape/);
    const g = build(2, 5);
    h.setSlider(g[0].ans);
    h.click(CAST);
    h.advance(2.8);
    expect(h.feedback()).toMatch(/Barrier broken!/);
    expect(h.feedback()).toContain(g[0].work);
    expect(h.hearts()).toBe(3);
    h.advance(1);
    expect(h.note()).toMatch(/a mirror spell costs a charge/);
    h.setSlider(g[1].ans);
    h.click(CAST);
    h.advance(3.8);
    expect(h.note()).toMatch(/Boss round: no mirror/);
    h.click(MIRROR);
    expect(h.feedback()).toMatch(/No charges left/);
  });

  it('the verdict lands at 1.3 s: hearts and score do not move before it', () => {
    h.start(1, 5);
    const g = build(1, 5);
    h.setSlider(g[0].ans + 1);
    h.click(CAST);
    h.advance(1.15);
    expect(h.hearts()).toBe(3);
    h.advance(0.3);
    expect(h.hearts()).toBe(2);
    h.start(1, 5);
    h.setSlider(g[0].ans);
    h.click(CAST);
    h.advance(1.15);
    expect(h.score()).toBe(0);
    h.advance(0.3);
    expect(h.score()).toBeGreaterThan(0);
  });

  it('the ring maps the dial to an angle and back: every dial value round-trips through the pointer', () => {
    for (const level of LEVELS) {
      const { min, max } = RANGE[level];
      expect(ringAngle(min, min, max)).toBeCloseTo(-Math.PI / 2, 12);
      expect(ringAngle(max, min, max)).toBeLessThan(1.5 * Math.PI);
      for (let k = min; k <= max; k++) {
        const [px, py] = ringPoint(k, min, max);
        expect(Math.hypot(px - RING.cx, py - RING.cy)).toBeCloseTo(RING.R, 9);
        expect(Math.round(ringValue(px, py, min, max))).toBe(k);
      }
    }
  });
});

describe('Mirror Mage UX', () => {
  it('the goal is drawn on the canvas at the start of every round and is gone after 3 s', () => {
    const R = recorder();
    h.start(2, 5);
    expect(texts(frame(R))).toContain(GOAL);
    expect(texts(frame(R, 2.0))).toContain(GOAL);
    expect(texts(frame(R, 1.5))).not.toContain(GOAL);
    playTo(2, 1);
    expect(texts(frame(R, 0.3))).toContain(GOAL);
    expect(texts(frame(R, 3.2))).not.toContain(GOAL);
    playTo(2, 2);
    expect(h.hud()).toMatch(/Round 3 of 3/);
    expect(texts(frame(R, 0.3))).toContain(GOAL);
  });

  it('the ring handle is at least 18 px, and the grip ring is drawn around the gem', () => {
    expect(HANDLE_RADIUS).toBeGreaterThanOrEqual(18);
    const R = recorder();
    h.start(1, 5);
    const { arcs } = frame(R);
    const [gx, gy] = ringPoint(RANGE[1].start, RANGE[1].min, RANGE[1].max);
    expect(arcs.some((a) => Math.abs(a.x - gx) < 0.01 && Math.abs(a.y - gy) < 0.01 && a.r >= 12)).toBe(true);
  });

  it('level 1 round 1 pulses a drag cue until the first touch, and no other level or round shows it', () => {
    const R = recorder();
    h.start(1, 5);
    expect(texts(frame(R))).toContain('↻ drag');
    h.setSlider(RANGE[1].start + 3);
    expect(texts(frame(R))).not.toContain('↻ drag');
    h.setSlider(RANGE[1].start);
    expect(texts(frame(R))).not.toContain('↻ drag');
    h.start(2, 5);
    expect(texts(frame(R))).not.toContain('↻ drag');
  });

  it('the miss text says in plain words to use more or less mana, never how much', () => {
    for (const level of LEVELS) {
      const r = build(level, 5)[0];
      for (const kind of ['low', 'high'] as const) {
        const ks = wrongKind(level, r, kind);
        if (ks.length === 0) continue;
        h.start(level, 5);
        h.setSlider(ks[0]);
        h.click(CAST);
        h.advance(2.8);
        expect(h.feedback()).toContain(kind === 'low' ? 'Try more mana.' : 'Try less mana.');
      }
    }
  });

  it('the scene text is at least 11 px, every control is labelled, and each round has its own light', () => {
    const R = recorder();
    for (const level of [1, 5]) {
      h.start(level, 5);
      frame(R, 0.5);
      expect(Math.min(...R.rec.sizes)).toBeGreaterThanOrEqual(11);
      for (const el of document.body.querySelectorAll('button, input')) expect(el.getAttribute('aria-label')).toBeTruthy();
    }
    const tints: string[] = [];
    for (const round of [0, 1, 2]) {
      h.start(1, 5);
      playTo(1, round);
      frame(R, 0.3);
      tints.push(R.rec.fills.find((f) => /^rgba\((255,150,60|60,110,255|170,40,90)/.test(f)) ?? '');
    }
    expect(new Set(tints).size).toBe(3);
  });
});

describe('Mirror Mage never leaks the answer', () => {
  for (const level of LEVELS) {
    it(`level ${level}: the mirror shapes are live in round 1, show for 1.5 s after a mirror spell in round 2, and never in round 3`, () => {
      const R = recorder();
      h.start(level, 5);
      // round 1: live
      let rec = frame(R);
      expect(helperDrawn(rec)).toBe(true);
      expect(mirrorFlag()).toBe('1');
      // round 2: hidden at every setting; a mirror spell shows it for 1.5 s, once
      const g = playTo(level, 1);
      expect(h.hud()).toMatch(/Round 2 of 3/);
      rec = frame(R, 0.3);
      expect(helperDrawn(rec)).toBe(false);
      expect(mirrorFlag()).toBe('0');
      for (const k of [RANGE[level].min, g[1].ans, RANGE[level].max]) {
        h.setSlider(k);
        expect(helperDrawn(frame(R))).toBe(false);
      }
      h.click(MIRROR);
      expect(helperDrawn(frame(R, 0.3))).toBe(true);
      expect(mirrorFlag()).toBe('1');
      expect(helperDrawn(frame(R, 1.0))).toBe(true);
      expect(helperDrawn(frame(R, 0.5))).toBe(false);
      expect(mirrorFlag()).toBe('0');
      h.click(MIRROR);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(helperDrawn(frame(R, 0.5))).toBe(false);
      // round 3: never, at any setting, even the winning one; a mirror spell is refused
      h.setSlider(g[1].ans);
      h.click(CAST);
      h.advance(2.8);
      h.advance(1);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      for (let k = RANGE[level].min; k <= RANGE[level].max; k += 3) {
        h.setSlider(k);
        expect(helperDrawn(frame(R))).toBe(false);
      }
      h.setSlider(g[2].ans);
      expect(helperDrawn(frame(R))).toBe(false);
      h.click(MIRROR);
      expect(h.feedback()).toMatch(/No charges left/);
      expect(helperDrawn(frame(R, 0.5))).toBe(false);
      expect(mirrorFlag()).toBe('0');
    });
  }

  it('level 1 marks the split points, level 2 draws the block and the gold partner, levels 3 and 5 the mirrored curve, level 4 the fold', () => {
    const R = recorder();
    h.start(1, 5);
    let rec = frame(R);
    expect(rec.strokes.filter((s) => s.style === YELLOW && s.dash).length).toBeGreaterThanOrEqual(2);
    h.start(2, 5);
    rec = frame(R);
    expect(rec.fills).toContain(GOLD);
    expect(rec.strokes.some((s) => s.style === YELLOW && s.dash && s.n >= 3)).toBe(true);
    for (const level of [3, 5]) {
      h.start(level, 5);
      rec = frame(R);
      expect(rec.strokes.some((s) => s.style === YELLOW && s.dash && s.n >= 200)).toBe(true);
    }
    h.start(4, 5);
    rec = frame(R);
    expect(rec.strokes.some((s) => s.style === YELLOW && s.dash && s.n >= 30)).toBe(true);
  });

  it('the rune has no axis numbers and no grid: the only text on the tablet is the key', () => {
    const R = recorder();
    for (const level of LEVELS) {
      for (const round of [0, 1, 2]) {
        h.start(level, 5);
        playTo(level, round);
        const rec = frame(R, 0.3);
        const onTablet = rec.at.filter((a) => a.x >= RUNE.x0 - 8 && a.x <= RUNE.x1 + 8 && a.y >= 56 && a.y <= 250).map((a) => a.s);
        expect(onTablet.every((s) => s === '+ drinks mana' || s === '− gives mana back')).toBe(true);
      }
    }
  });

  it('in round 3 nothing drawn before the cast contains the answer’s mana text (apart from the caption, which gives the limits)', () => {
    const R = recorder();
    for (const level of LEVELS) {
      h.start(level, 5);
      const g = playTo(level, 2);
      expect(h.hud()).toMatch(/Round 3 of 3 · BOSS/);
      const ans = manaText(UNIT[level], g[2].ans);
      for (const dt of [0.05, 0.4, 1]) {
        const rec = frame(R, dt);
        const drawn = texts(rec).filter((s) => !s.startsWith('∫'));
        expect(drawn.length).toBeGreaterThan(0);
        expect(drawn.some((s) => holds(s, ans))).toBe(false);
      }
    }
  });

  it('a fizzle always stops the fill at 70% of the rune, whatever the guess, and an overflow fills it completely', () => {
    for (const level of LEVELS) {
      const r = build(level, 11)[0];
      const lows = wrongKind(level, r, 'low');
      const highs = wrongKind(level, r, 'high');
      const picks = [lows[0], lows[Math.floor(lows.length / 2)], lows[lows.length - 1]].filter((k) => k !== undefined);
      for (const k of picks) {
        h.start(level, 11);
        h.setSlider(k);
        h.click(CAST);
        h.advance(1.25);
        expect(h.$('canvas')!.dataset.cast).toBe('low');
        expect(h.$('canvas')!.dataset.fill).toBe('0.70');
        h.advance(0.9);
        expect(h.$('canvas')!.dataset.fill).toBe('0.70');
      }
      for (const k of [highs[0], highs[highs.length - 1]].filter((v) => v !== undefined)) {
        h.start(level, 11);
        h.setSlider(k);
        h.click(CAST);
        h.advance(1.25);
        expect(h.$('canvas')!.dataset.cast).toBe('high');
        expect(h.$('canvas')!.dataset.fill).toBe('1.00');
      }
      h.start(level, 11);
      h.setSlider(r.ans);
      h.click(CAST);
      h.advance(1.25);
      expect(h.$('canvas')!.dataset.cast).toBe('win');
      expect(h.$('canvas')!.dataset.fill).toBe('1.00');
    }
  });

  it('the miss burst and the −1 float land at the same fixed point whichever setting was wrong', () => {
    const spots: string[] = [];
    for (const [level, kind] of [[1, 'low'], [1, 'high'], [2, 'low'], [3, 'high'], [5, 'low'], [4, 'high']] as const) {
      const R = recorder();
      h.start(level, 11);
      const r = build(level, 11)[0];
      const ks = wrongKind(level, r, kind);
      h.setSlider(ks[Math.floor(ks.length / 2)]);
      h.click(CAST);
      R.clear();
      h.advance(2.8);
      const f = R.rec.at.filter((a) => a.s === '−1 ♥');
      expect(f.length).toBeGreaterThan(0);
      spots.push(...f.map((a) => String(a.x)));
    }
    expect(new Set(spots).size).toBe(1);
    expect(spots[0]).toBe('320');
  });

  it('a miss draws nothing that states the right mana: the only mana text is the player’s own', () => {
    const R = recorder();
    for (const level of LEVELS) {
      const r = build(level, 11)[0];
      for (const kind of ['low', 'high'] as const) {
        const ks = wrongKind(level, r, kind);
        if (ks.length === 0) continue;
        h.start(level, 11);
        const k = ks[Math.floor(ks.length / 2)];
        h.setSlider(k);
        h.click(CAST);
        R.clear();
        h.advance(2.8);
        const drawn = texts(R.rec).filter((s) => !s.startsWith('∫'));
        const ans = manaText(UNIT[level], r.ans);
        if (ans !== manaText(UNIT[level], k)) expect(drawn.some((s) => holds(s, ans))).toBe(false);
        expect(drawn).toContain(manaText(UNIT[level], k));
      }
    }
  });

  it('every dial setting at a few positions animates through a cast with no console error, and only the answer wins', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const level of LEVELS) {
      const r = build(level, 11)[0];
      const { min, max } = RANGE[level];
      for (const k of [min, r.ans - 1, r.ans, r.ans + 1, max]) {
        if (k < min || k > max) continue;
        h.start(level, 11);
        h.setSlider(k);
        h.click(CAST);
        h.advance(3);
        expect(h.hearts()).toBe(k === r.ans ? 3 : 2);
      }
    }
    expect(err).not.toHaveBeenCalled();
  });

  it('after a win the canvas shows the barrier broken and the win text appears; rounds go on', () => {
    const R = recorder();
    h.start(5, 5);
    const g = build(5, 5);
    h.setSlider(g[0].ans);
    h.click(CAST);
    R.clear();
    h.advance(2.2);
    expect(texts(R.rec)).toContain('BARRIER BROKEN!');
    h.advance(0.7);
    expect(h.phase()).toBe('between');
  });
});
