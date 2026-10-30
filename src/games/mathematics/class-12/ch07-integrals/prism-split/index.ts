// Inspirations: Portal and Zelda light puzzles (split a beam, send the pieces where they must go) and mixing-desk fitting games. Prism is a glass
// prism with a face: it splits one beam into simple beams. The player drags a crystal over the (A, B) mixing plane, and the pieces put back
// together are drawn against the original beam; a scanner sweeps along x and flags every place where they part.
import { PAL, createArcade } from '@core/arcade';
import { defineGame } from '@core/define';
import { backdrop, face, num, verdict } from '@core/mathkit';
import { line, text } from '@core/neon';
import { CHECK, DIAL, bad, beamText, buildRounds, explain, intel, judge, missText, original, probeText, recombined } from './logic';

type G = CanvasRenderingContext2D;
type Mood = 'happy' | 'worried' | 'cheer';
const CP = { x0: 24, x1: 432, top: 56, bottom: 250 };
const PL = { cx: 536, cy: 160, u: 8 };
const COLORS = [PAL.pink, PAL.green, PAL.orange];
const RUN = 1.7;
const YR = 8;

const HEROES = [
  { story: 'A beam g(x) = (px + q)/((x − a)(x − b)) can be split into two simple beams A/(x − a) + B/(x − b). Cover one factor and put its zero into the rest: that gives the strength of the other beam. Put the pieces back over a common bottom and you must get the original top.', objective: 'Drag the crystal to the strengths A and B whose beams, put back together, make the original beam, in three rounds. The recombined beam shows live in round 1; a test beam costs a charge.' },
  { story: 'A repeated factor needs two pieces: A/(x − a) + B/(x − a)². Multiply through by (x − a)² and the top becomes A(x − a) + B: matching the x terms gives A, and putting x = a gives B.', objective: 'Set A and B so the two pieces make the original beam, in three rounds. The recombined beam shows live in round 1; a test beam costs a charge.' },
  { story: 'Three factors, three pieces: A/(x − a) + B/(x − b) + C/(x − c). Each strength comes from covering its own factor and putting its zero into the others, and the three always add up to the coefficient of the top power.', objective: 'Set A, B and C so the three pieces make the original beam, in three rounds. The boss round does not draw your beam until the scanner runs.' },
];

/** Prism: a glass prism on a stand, with a face, that splits the beam and shimmers. */
function prism(g: G, x: number, y: number, t: number, mood: Mood, widths: number[]) {
  line(g, x - 60, y - 14, x - 12, y - 14, PAL.white, 4);
  g.fillStyle = 'rgba(150,220,255,0.35)';
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - 24, y + 6);
  g.lineTo(x + 24, y + 6);
  g.lineTo(x, y - 40);
  g.closePath();
  g.fill();
  g.stroke();
  face(g, x, y - 8, 9, mood, t, PAL.cyan);
  const glint = (t * 0.7) % 1;
  g.fillStyle = PAL.white;
  g.beginPath();
  g.arc(x - 24 + 24 * glint, y + 6 - 46 * glint, 2, 0, Math.PI * 2);
  g.fill();
  widths.forEach((w, i) => {
    const dy = (i - (widths.length - 1) / 2) * 12;
    line(g, x + 10, y - 14, x + 90, y - 14 + dy * 1.4, COLORS[i], Math.min(10, 0.8 + Math.abs(w) * 0.8));
    text(g, 'ABC'[i], x + 98, y - 10 + dy * 1.4, COLORS[i], 11);
  });
  g.fillStyle = PAL.cyan;
  g.fillRect(x - 18, y + 6, 36, 6);
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(3, ctx.level));
    const hero = HEROES[n - 1];
    const rounds = buildRounds(n, ctx.random);
    const count = rounds[0].ans.length;
    const vals = [0, 0, 0];
    let fired: number[] | null = null;
    const A = createArcade(
      ctx,
      { name: 'Prism', role: 'a glass prism on a stand that splits one beam of light into simple beams', story: hero.story, objective: hero.objective },
      {
        W: 640,
        H: 340,
        aria: 'A glass prism beside a curve of the original beam, the beam put back together from its pieces, and a plane for setting the strengths A and B.',
        rounds: 3,
        charges: [1, 1, 0],
        onRound: (k) => {
          fired = null;
          sliders.forEach((s) => s.set(0));
          A.feedback.hidden = true;
          const r = rounds[k];
          A.hint.textContent = `${intel(r)} ${r.assist === 0 ? 'Your beam is drawn live.' : r.assist === 1 ? 'Your beam is dim: a test beam costs a charge.' : 'Boss round: your beam appears only when the scanner runs.'}`;
        },
      },
    );
    const sliders = Array.from({ length: count }, (_, i) =>
      A.slider({ aria: `Strength of beam ${'ABC'[i]}`, label: `Beam ${'ABC'[i]}`, min: DIAL.min, max: DIAL.max, step: 1, value: 0, unit: '', text: (v) => `${'ABC'[i]} = ${num(v)}`, onInput: (v) => (vals[i] = v) }),
    );
    A.handle({
      x: () => PL.cx + vals[0] * PL.u,
      y: () => PL.cy - vals[1] * PL.u,
      r: 14,
      drag: (px, py) => {
        sliders[0].set(Math.round((px - PL.cx) / PL.u));
        sliders[1].set(Math.round((PL.cy - py) / PL.u));
      },
    });
    A.controls.append(...sliders.map((s) => s.row));
    const cur = () => rounds[Math.min(A.round, 2)];
    A.controls.append(
      A.button('🔦 Test beam', 'Test beam: compare the beams at one point', () => {
        if (!A.spend()) return;
        A.say(probeText(cur(), vals.slice(0, count)), true);
      }, 'secondary'),
      A.button('🔷 Split the beam', 'Split the beam', () => {
        const r = cur();
        const v = vals.slice(0, count);
        const ok = judge(r, v);
        fired = v;
        A.resolve(ok, ok ? `Beams match! ${explain(r)}` : missText(r, v), { x: PL.cx, y: PL.cy }, RUN);
      }),
    );
    A.scene((g, t) => {
      if (A.phase === 'between') return;
      if (A.phase === 'play' && fired !== null) fired = null;
      const r = cur();
      const use = fired ?? vals.slice(0, count);
      const X = (x: number) => CP.x0 + ((x + 6) / 12) * (CP.x1 - CP.x0);
      const mid = (CP.top + CP.bottom) / 2;
      const Y = (y: number) => mid - (y / YR) * ((CP.bottom - CP.top) / 2);
      backdrop(g);
      line(g, CP.x0, mid, CP.x1, mid, PAL.dim, 1);
      line(g, X(0), CP.top, X(0), CP.bottom, PAL.dim, 1);
      r.poles.forEach((p) => {
        line(g, X(p), CP.top, X(p), CP.bottom, PAL.pink, 1.5, [4, 4]);
        text(g, `x = ${num(p)}`, X(p), CP.bottom + 14, PAL.pink, 10);
      });
      const plot = (fn: (x: number) => number, color: string, alpha: number, w: number) => {
        g.globalAlpha = alpha;
        g.strokeStyle = color;
        g.lineWidth = w;
        g.beginPath();
        let pen = false;
        for (let i = 0; i <= 480; i++) {
          const x = -6 + (12 * i) / 480;
          const y = fn(x);
          if (!Number.isFinite(y) || Math.abs(y) > YR) {
            pen = false;
            continue;
          }
          if (pen) g.lineTo(X(x), Y(y));
          else g.moveTo(X(x), Y(y));
          pen = true;
        }
        g.stroke();
        g.globalAlpha = 1;
      };
      plot((x) => original(r, x), PAL.cyan, 1, 3);
      const show = fired !== null || r.assist <= 1;
      if (show) plot((x) => recombined(r, use, x), PAL.yellow, fired === null && r.assist === 1 ? 0.3 : 0.95, 2);
      else text(g, 'your beam is hidden until the scanner runs', X(0), CP.top + 10, PAL.dim, 11);
      text(g, `g(x) = ${beamText(r)}`, (CP.x0 + CP.x1) / 2, 30, PAL.cyan, 12);
      // The scanner sweeps along x and marks each checkpoint where the beams agree or part.
      let ok: boolean | null = null;
      if (fired !== null) {
        const sx = -6 + 12 * Math.min(1, A.rt / (RUN - 0.2));
        line(g, X(sx), CP.top, X(sx), CP.bottom, PAL.white, 2);
        const off = bad(r, fired);
        for (const c of CHECK) {
          if (c > sx) continue;
          g.fillStyle = off.includes(c) ? PAL.red : PAL.green;
          g.beginPath();
          g.arc(X(c), CP.bottom + 30, 5, 0, Math.PI * 2);
          g.fill();
        }
        if (A.rt > RUN - 0.1) ok = judge(r, fired);
      }
      // The mixing plane
      const u = PL.u;
      g.strokeStyle = PAL.grid;
      g.lineWidth = 1;
      for (let i = DIAL.min; i <= DIAL.max; i += 3) {
        line(g, PL.cx + i * u, PL.cy - 9 * u, PL.cx + i * u, PL.cy + 9 * u, PAL.grid, 1);
        line(g, PL.cx - 9 * u, PL.cy + i * u, PL.cx + 9 * u, PL.cy + i * u, PAL.grid, 1);
      }
      g.strokeStyle = PAL.dim;
      g.lineWidth = 1.5;
      g.strokeRect(PL.cx - 9 * u, PL.cy - 9 * u, 18 * u, 18 * u);
      line(g, PL.cx - 9 * u, PL.cy, PL.cx + 9 * u, PL.cy, PAL.dim, 1);
      line(g, PL.cx, PL.cy - 9 * u, PL.cx, PL.cy + 9 * u, PAL.dim, 1);
      text(g, 'A', PL.cx + 9 * u + 8, PL.cy + 4, PAL.pink, 12);
      text(g, 'B', PL.cx, PL.cy - 9 * u - 8, PAL.green, 12);
      g.fillStyle = PAL.yellow;
      g.beginPath();
      g.arc(PL.cx + use[0] * u, PL.cy - use[1] * u, 6, 0, Math.PI * 2);
      g.fill();
      if (count === 3) text(g, `C = ${num(use[2])}`, PL.cx, PL.cy + 9 * u + 16, PAL.orange, 12);
      const mood: Mood = ok === null ? 'happy' : ok ? 'cheer' : 'worried';
      prism(g, 70, 306, t, mood, use);
      if (ok !== null) verdict(g, ok, 'BEAMS MATCH', 'THE BEAMS PART');
    });
    A.mountAll();
    return A.run();
  },
});
