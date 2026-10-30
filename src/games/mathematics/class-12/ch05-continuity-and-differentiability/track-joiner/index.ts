// Inspirations: Line Rider (a rider on a drawn track that must have no breaks) and Hill Climb Racing (a vehicle that crashes at every
// bump). Zip is a stunt cart; a gap in the track is a discontinuity and a sharp corner is a point where f is not differentiable.
import { helperOn, paidFlash } from '@core/aidflash';
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { backdrop, face, track, trackHandle, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { DIALS, FRAME, KINDS, X_END, buildRounds, explain, filled, firstFault, intel, judge, missText, spotText, type Round } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const VERDICT = 1.8;
const PX = (x: number) => 40 + x * 90;

const HEROES = [
  { story: 'The track is built from pieces of different functions joined at whole-number values of x. For the cart to cross a join, the left limit must equal the right limit, and both must equal the value there: the function must be continuous. One piece has a constant k that is still to be set.', objective: 'Set k so the track has no gap, in three rounds. The live track shows in round 1; a test ride costs a charge.' },
  { story: 'This track has two joins, with a straight middle piece ax + b whose two constants are still to be set. Each join gives one equation in a and b, and the two equations together fix both.', objective: 'Set a and b so the cart can cross both joins, in three rounds. The live track fades; a test ride costs a charge.' },
  { story: 'A gap is not the only danger. If the slopes on the two sides of a join differ, the track has a sharp corner and the cart flips, because the function is not differentiable there. A smooth join needs the values and the slopes to agree.', objective: 'Set k and m so that the join is smooth, in three rounds: no gap and no corner.' },
];
const ARIA: Record<string, string> = { k: 'Constant k', a: 'Constant a', b: 'Constant b', m: 'Constant m' };

/** Zip: a stunt cart with a helmeted driver, a roll cage and two wheels, tilted to follow the slope. */
function zip(g: G, x: number, y: number, angle: number, t: number, mood: Mood, spin: number) {
  g.save?.();
  g.translate?.(x, y);
  g.rotate?.(angle + spin);
  g.fillStyle = '#c9342b';
  g.fillRect(-18, -20, 36, 14);
  g.strokeStyle = PAL.yellow;
  g.lineWidth = 2;
  g.strokeRect(-18, -20, 36, 14);
  line(g, -10, -20, -10, -34, PAL.dim, 2);
  line(g, 10, -20, 10, -34, PAL.dim, 2);
  line(g, -10, -34, 10, -34, PAL.dim, 2);
  g.fillStyle = '#f2c9a0';
  g.beginPath();
  g.arc(0, -29, 9, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PAL.cyan;
  g.beginPath();
  g.arc(0, -31, 9, Math.PI, 2 * Math.PI);
  g.fill();
  face(g, 0, -28, 8, mood, t, '#1b1030');
  for (const wx of [-11, 11]) {
    g.fillStyle = '#1b1030';
    g.beginPath();
    g.arc(wx, -4, 6, 0, Math.PI * 2);
    g.fill();
    line(g, wx, -4, wx + Math.cos(t * 12) * 5, -4 + Math.sin(t * 12) * 5, PAL.dim, 1.5);
  }
  g.restore?.();
}

function level(n: number, random: () => number): DialLevel<Round> {
  const kind = KINDS[n - 1];
  const hero = HEROES[n - 1];
  const dials = DIALS[kind];
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  // A fixed y frame for the level (it covers every row the level can make), never fitted to the finished track.
  const [y0, y1] = FRAME[kind];
  return {
    hero: { name: 'Zip', role: 'a stunt cart racing down a track built from pieces of functions', story: hero.story, objective: hero.objective },
    rounds,
    charges: [1, 1, 0],
    dials: dials.map((d) => ({ key: d.key, aria: ARIA[d.key], label: d.label, unit: '', step: 1, min: d.min, max: d.max, start: d.start, text: (v: number) => `${d.key} = ${v < 0 ? '−' : ''}${Math.abs(v)}` })),
    handles: kind === 'gap' ? [trackHandle('k', () => dials[0].min, () => dials[0].max)] : [],
    test: { button: '🛞 Test ride', aria: 'Test ride: read the limits at the first broken join', read: (r, v) => (flash.paid(), spotText(r, v)) },
    fire: { button: '🏁 Send Zip', aria: 'Send Zip down the track' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => `Finish! ${explain(r)}`,
    hint: (r) => `${intel(r)} ${r.assist === 0 ? 'The live track is on.' : r.assist === 1 ? 'Only the first piece is drawn: a test ride shows the whole track for a moment and costs a charge.' : 'Boss round: only the first piece is drawn; no test ride.'}`,
    hit: () => [PX(X_END), 160],
    delay: VERDICT,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      backdrop(g);
      const use = shot ? shot.v : v;
      const ps = filled(r, use);
      // The whole track (the player's own constants) is the helper: live in round 1, for 1.5 s after a paid test ride in round 2, and after a win;
      // never before Fire in the boss round and never during a miss, when only the first piece is drawn.
      const since = flash.since(A.clock, k);
      const helper = helperOn(r.assist, !!shot?.ok, shot ? Infinity : since);
      A.canvas.dataset.helper = helper ? '1' : '0';
      const Y = (y: number) => 280 - ((y - y0) / (y1 - y0)) * 190;
      const f = (x: number) => {
        const i = r.joins.filter((j) => x >= j).length;
        const q = ps[i];
        return q.p * x * x + q.q * x + q.r;
      };
      const piece = (x: number) => r.joins.filter((j) => x >= j).length;
      const visible = helper;
      g.save?.();
      g.beginPath?.();
      g.rect?.(0, 40, 640, 250);
      g.clip?.();
      const xMax = visible ? X_END : r.joins[0];
      for (let seg = 0; seg <= r.joins.length; seg++) {
        const a = seg === 0 ? 0 : r.joins[seg - 1];
        const b = seg === r.joins.length ? X_END : r.joins[seg];
        if (a >= xMax) continue;
        g.strokeStyle = seg % 2 ? PAL.pink : PAL.cyan;
        g.lineWidth = 4;
        g.beginPath();
        for (let x = a; x <= Math.min(b, xMax) + 1e-9; x += 0.05) {
          const xx = Math.min(x, b - 1e-6);
          const yy = ps[seg].p * xx * xx + ps[seg].q * xx + ps[seg].r;
          if (x === a) g.moveTo(PX(x), Y(yy));
          else g.lineTo(PX(x), Y(yy));
        }
        g.stroke();
      }
      g.restore?.();
      if (!visible) text(g, '? the rest of the track is hidden', 440, 120, PAL.dim, 12);
      r.joins.forEach((c) => {
        line(g, PX(c), 296, PX(c), 304, PAL.yellow, 2);
        text(g, `x = ${c}`, PX(c), 318, PAL.yellow, 11);
      });
      // The finish flag stands at the end of the whole track with the helper, and at a fixed height without it (the hidden piece's end must not show).
      const flagY = visible ? Y(f(X_END - 1e-6)) : Y((y0 + y1) / 2);
      line(g, PX(X_END), flagY - 50, PX(X_END), flagY, PAL.white, 2);
      g.fillStyle = PAL.green;
      g.fillRect(PX(X_END) - 22, flagY - 50, 22, 12);
      let cx = 0;
      let mood: Mood = 'happy';
      let spin = 0;
      let dropY = 0;
      if (shot) {
        const fault = firstFault(r, shot.v);
        // With the helper the cart runs to the real fault. Without it, a miss always ends at the first join, on the known piece, with the same tumble:
        // the picture never says which join broke, nor how big the gap or corner was.
        const stop = fault ? (visible ? fault.x : r.joins[0] - 0.02) : X_END;
        const p = Math.min(1, rt / 1.2);
        cx = p * stop;
        if (fault && rt > 1.2) {
          const e = rt - 1.2;
          if (fault.kind === 'gap') dropY = Math.min(70, e * e * 90);
          else spin = Math.min(Math.PI * 1.2, e * 6) * -1;
          mood = 'worried';
        }
        if (!fault && rt > 1.2) mood = 'cheer';
      }
      const vx = Math.min(X_END - 1e-3, Math.max(0, cx));
      const dy = 0.01;
      const ang = Math.atan2(-(Y(f(vx + dy)) - Y(f(Math.max(0, vx - dy)))), PX(vx + dy) - PX(Math.max(0, vx - dy)));
      const cartX = PX(cx);
      A.canvas.dataset.cart = String(Math.round(cartX));
      const cartY = Y(f(Math.min(vx, X_END - 1e-3))) + dropY;
      zip(g, cartX, cartY, -ang, t, shot ? mood : 'happy', spin);
      if (!shot && piece(0) === 0 && r.assist === 2) text(g, 'only the first piece is drawn', 150, 60, PAL.dim, 11);
      if (kindLabel(r)) text(g, kindLabel(r), 320, 24, PAL.yellow, 12);
      if (kind === 'gap') track(g, dials[0].min, dials[0].max);
      if (shot && rt > VERDICT) verdict(g, shot.ok, 'CROSSED THE FINISH', 'CRASH');
    },
  };
}
const kindLabel = (r: Round) => (r.kind === 'smooth' ? 'no gap AND no corner' : '');

export default defineGame({
  mount(ctx) {
    return mountDialLevel(ctx as never, level(Math.max(1, Math.min(3, ctx.level)), ctx.random) as never, 'A stunt cart on a track made of curve pieces, with constants to set so the pieces join without a gap or a corner.');
  },
});
