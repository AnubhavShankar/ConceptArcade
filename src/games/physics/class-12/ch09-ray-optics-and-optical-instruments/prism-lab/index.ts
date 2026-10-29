// Inspirations: The Talos Principle (find the beam setting that charges the crystal), Portal (a test chamber that changes the
// medium), Pong (keep the ball bouncing off the wall: total internal reflection).
import { createArcade, PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { fmt } from '@core/judge';
import { along, glow, line, orb, text, trace } from '@core/neon';
import { APEX, BASE_Y, HEIGHT, add, trace3, type V } from './geometry';
import { SLIDERS, buildGame, explainRound, indexFromMinDev, judgeGel, judgePong, judgeSweet, missText, resultLine, testText, trapped, type GelRound, type PongRound, type SweetRound } from './logic';

const W = 640;
const H = 340;
const RAD = Math.PI / 180;
function prismShape(g: CanvasRenderingContext2D, A: number, tint = 'rgba(77,225,255,0.16)') {
  const h = (A / 2) * RAD;
  const half = HEIGHT * Math.tan(h);
  glow(g, PAL.cyan, 12, () => {
    g.fillStyle = tint;
    g.strokeStyle = PAL.white;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(APEX[0], APEX[1]);
    g.lineTo(APEX[0] + half, BASE_Y);
    g.lineTo(APEX[0] - half, BASE_Y);
    g.closePath();
    g.fill();
    g.stroke();
  });
}

export default defineGame({
  mount(ctx) {
    const game = buildGame(ctx.level, ctx.random);
    let onRound: (i: number) => void = () => undefined;
    const A = createArcade(ctx, game.hero, { W, H, aria: 'An arcade screen with a glowing prism, a laser beam bending through it and a crystal target.', rounds: 3, charges: game.charges, onRound: (i) => onRound(i) });
    const clearSay = () => {
      A.feedback.hidden = true;
    };
    const ri = () => Math.min(A.round, 2);
    const S = SLIDERS;
    let inc: number = S.i.start;
    let nEst: number = S.n.start;
    let attempt: { ok: boolean; i: number } | null = null;
    const incSlider = A.slider({ aria: 'Angle of incidence in degrees', label: 'Beam arrives at', min: S.i.min, max: S.i.max, step: S.i.step, value: inc, unit: '°', onInput: (v) => (inc = v) });
    const roundA = () => game.rounds[ri()].A;
    const sourceAt = (i: number): V => {
      const g0 = trace3(roundA(), 1.5, i);
      return add(g0.E1, g0.u, -190);
    };
    A.handle({
      x: () => sourceAt(inc)[0],
      y: () => sourceAt(inc)[1],
      r: 24,
      drag: (px, py) => {
        const A0 = roundA();
        const g0 = trace3(A0, 1.5, 0);
        const w: V = [g0.E1[0] - px, g0.E1[1] - py];
        const ang = (Math.atan2(g0.nIn[1], g0.nIn[0]) - Math.atan2(w[1], w[0])) / RAD;
        incSlider.set(ang);
      },
    });
    A.controls.append(incSlider.row);
    let nSlider: ReturnType<typeof A.slider> | null = null;
    if (game.kind === 'sweet') {
      nSlider = A.slider({ aria: 'Refractive index of the glass', label: 'Glass index you read', min: S.n.min, max: S.n.max, step: S.n.step, value: nEst, unit: '', text: (v) => `n = ${v.toFixed(2)}`, onInput: (v) => (nEst = v) });
      A.controls.append(nSlider.row);
    }
    const nRelOf = (): number => {
      if (game.kind === 'sweet') return indexFromMinDev(game.rounds[ri()].A, game.rounds[ri()].Dmin);
      if (game.kind === 'gel') return game.rounds[ri()].n / game.rounds[ri()].nL;
      return game.rounds[ri()].n;
    };
    A.controls.append(
      A.button('🔦 Test beam', 'Test beam: measure the bend at this angle', () => {
        if (!A.spend()) return;
        A.say(testText(roundA(), nRelOf(), inc), true);
      }, 'secondary'),
      A.button('🔥 Fire', 'Fire the beam at this angle', () => {
        const k = ri();
        const R = game.rounds[k];
        let ok = false;
        let miss = '';
        if (game.kind === 'sweet') {
          const j = judgeSweet(R as SweetRound, inc, nEst);
          ok = j.ok;
          if (!ok) miss = missText(game, k, { i: inc, n: nEst });
        } else if (game.kind === 'gel') {
          ok = judgeGel(R as GelRound, inc).ok;
          if (!ok) miss = missText(game, k, { i: inc });
        } else {
          ok = judgePong(R as PongRound, inc).ok;
          if (!ok) miss = missText(game, k, { i: inc });
        }
        attempt = { ok, i: inc };
        const tr = trace3(R.A, nRelOf(), inc);
        const hit: V = tr.out ? add(tr.P2, tr.out, 150) : tr.tirEnd ?? tr.P2;
        A.resolve(ok, ok ? `${resultLine(game, k)} ${explainRound(game, k)[0]}` : miss, { x: Math.max(20, Math.min(W - 20, hit[0])), y: Math.max(30, Math.min(H - 30, hit[1])) }, 1.4);
      }),
    );
    onRound = (k) => {
      inc = S.i.start;
      incSlider.set(inc);
      nEst = S.n.start;
      nSlider?.set(nEst);
      attempt = null;
      clearSay();
      const R = game.rounds[k];
      const live = R.assist === 0 ? 'The live readout is on.' : R.assist === 1 ? 'The live readout is off: use test beams.' : 'No readout: work it out.';
      if (game.kind === 'sweet') A.hint.textContent = `Prism apex angle ${R.A}°. Sweep the angle and watch the bend, or use test beams: two angles with the same bend lie either side of the sweet spot, and it is near the middle of them. ${live}`;
      else if (game.kind === 'gel') A.hint.textContent = `Prism apex ${R.A}°, glass n = ${(R as GelRound).n}, gel n = ${(R as GelRound).nL}. Find the angle of least bend in the gel. ${live}`;
      else A.hint.textContent = `Prism apex ${R.A}°, glass n = ${(R as PongRound).n}. Photon must just bounce off the second face. ${live}`;
    };

    const crystal = (g: CanvasRenderingContext2D, x: number, y: number, lit: boolean, t: number) => {
      glow(g, lit ? PAL.green : PAL.dim, lit ? 22 : 6, () => {
        g.fillStyle = lit ? PAL.green : '#2b3a7a';
        g.strokeStyle = lit ? PAL.white : PAL.dim;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x, y - 24 - (lit ? Math.sin(t * 8) * 2 : 0));
        g.lineTo(x + 15, y);
        g.lineTo(x, y + 24);
        g.lineTo(x - 15, y);
        g.closePath();
        g.fill();
        g.stroke();
      });
    };

    A.scene((g, t) => {
      if (A.phase === 'between') return;
      const k = ri();
      const R = game.rounds[k];
      const resolving = A.phase === 'resolve' && attempt !== null;
      const iShown = resolving ? attempt!.i : inc;
      const nRel = nRelOf();
      const tr = trace3(R.A, nRel, iShown);
      const isGel = game.kind === 'gel';
      g.fillStyle = isGel ? 'rgba(93,255,154,0.08)' : 'rgba(255,255,255,0.03)';
      g.fillRect(0, 40, W, 270);
      if (game.kind === 'gel') text(g, `gel chamber: n = ${(R as GelRound).nL}`, 100, 60, PAL.green, 12);
      if (game.kind === 'pong') text(g, 'PONG: keep Photon in play', 110, 60, PAL.dim, 12);
      if (game.kind === 'sweet') text(g, 'CRYSTAL CHARGE', 520, 60, PAL.dim, 11);
      prismShape(g, R.A);
      // the crystal sits where the beam leaves at the sweet spot
      if (game.kind !== 'pong') {
        const sweetI = game.kind === 'sweet' ? (R as SweetRound).iSol : (R as GelRound).iSol;
        const ts = trace3(R.A, nRel, sweetI);
        const cpos = ts.out ? add(ts.P2, ts.out, 190) : ts.P2;
        const cx = Math.min(W - 30, cpos[0]);
        const cy = Math.max(70, Math.min(H - 40, cpos[1]));
        const shown = R.assist === 0 || resolving;
        const lit = resolving && attempt!.ok && A.rt > 1.3;
        if (shown) crystal(g, cx, cy, lit, t);
        else text(g, '?', cx, cy + 12, PAL.dim, 34);
      }
      // the beam
      const live = R.assist === 0 || resolving || (R.assist === 1 && A.phase === 'play');
      const src = add(tr.E1, tr.u, -190);
      const pts: V[] = [src, tr.E1, tr.P2];
      if (tr.out) pts.push(add(tr.P2, tr.out, 260));
      else if (tr.tirEnd) pts.push(tr.tirEnd);
      const f = resolving ? Math.min(1, A.rt / 1.3) : 1;
      line(g, src[0], src[1], tr.E1[0], tr.E1[1], PAL.pink, 3);
      if (live) {
        trace(g, pts.slice(1), resolving ? f : 1, tr.out ? PAL.yellow : PAL.red, 3);
        if (R.assist === 0 && A.phase === 'play') {
          if (tr.p.D !== null) text(g, `bend D = ${fmt(tr.p.D)}°`, 500, 300, PAL.yellow, 14);
          else text(g, 'totally reflected: it stays inside', 460, 300, PAL.red, 13);
        }
      }
      const ball: V = resolving && f < 1 ? along(pts, f * 0.999) : src;
      orb(g, ball[0], ball[1], 12, PAL.pink, t, resolving ? (attempt!.ok ? 'cheer' : 'worried') : 'happy');
      if (resolving && A.rt > 1.3) {
        const end: V = tr.out ? add(tr.P2, tr.out, 260) : (tr.tirEnd ?? tr.P2);
        const flag = attempt!.ok ? PAL.green : PAL.red;
        glow(g, flag, 12, () => text(g, attempt!.ok ? 'NICE!' : 'MISS', Math.max(40, Math.min(W - 40, end[0])), Math.max(30, Math.min(H - 20, end[1])), flag, 16));
      }
      if (A.phase === 'play' && R.assist === 1 && !live) text(g, 'readout off', 500, 300, PAL.dim, 12);
      if (game.kind === 'pong') {
        // the second face is the paddle
        const hh = (R.A / 2) * RAD;
        const half = HEIGHT * Math.tan(hh);
        glow(g, PAL.cyan, 10, () => line(g, APEX[0], APEX[1], APEX[0] + half, BASE_Y, PAL.cyan, 6));
        if (resolving && A.rt > 1.0 && !trapped(R as PongRound, attempt!.i)) text(g, 'it got past the paddle', 330, 320, PAL.red, 12);
      }
    });

    A.mountAll();
    return A.run();
  },
});

