// Inspirations: Zelda and Portal beam puzzles (light the lantern, test chamber), Angry Birds (set the dials, fire, watch the shot).
import { createArcade, PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { fmt, sgn } from '@core/judge';
import { glow, line, orb, text, trace } from '@core/neon';
import { lens, parallelRays, sensor, slide } from './art';
import { SLIDERS, buildGame, explainRound, fInLiquid, fromPower, grindF, judgeGrind, judgeLiquid, judgeProjector, judgeRelay, judgeStack, liquidText, missText, pairPower, powerText, projectorV, resultLine } from './logic';

const W = 640;
const H = 340;

export default defineGame({
  mount(ctx) {
    const game = buildGame(ctx.level, ctx.random);
    let onRound: (i: number) => void = () => undefined;
    const A = createArcade(ctx, game.hero, { W, H, aria: 'A lens laboratory: glowing lenses, light rays and a hero waiting for the beam.', rounds: 3, charges: game.charges, onRound: (i) => onRound(i) });
    const clearSay = () => {
      A.feedback.hidden = true;
    };
    const ri = () => Math.min(A.round, 2);
    const mood = (res: { ok: boolean } | null, from = 0) => (res && A.phase === 'resolve' && A.rt > from ? (res.ok ? 'cheer' : 'worried') : 'happy') as 'cheer' | 'worried' | 'happy';
    const diamond = (g: CanvasRenderingContext2D, x: number, y: number, color: string) => {
      glow(g, color, 8, () => {
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(x, y - 8);
        g.lineTo(x + 7, y);
        g.lineTo(x, y + 8);
        g.lineTo(x - 7, y);
        g.closePath();
        g.fill();
      });
    };

    // ================= level 1: light the lantern (a Zelda-style beam puzzle) =============================
    if (game.kind === 'grind') {
      const rounds = game.rounds;
      const S = SLIDERS.grind;
      const x0 = 130;
      const sc = 9;
      const AX = 190;
      let R: number = S.start;
      let test: { x: number; f: number } | null = null;
      let attempt: { x: number; ok: boolean; f: number } | null = null;
      const trackX = (r: number) => 60 + ((r - 1) * 540) / 59;
      const slider = A.slider({ aria: 'Radius of curvature in centimetres', label: 'Radius of the face', min: S.min, max: S.max, step: S.step, value: R, unit: 'cm', onInput: (v) => (R = v) });
      A.handle({ x: () => trackX(R), y: () => 44, r: 22, drag: (px) => slider.set(1 + ((px - 60) * 59) / 540) });
      A.controls.append(
        slider.row,
        A.button('🔬 Test beam', 'Test beam: measure the lens as dialled now', () => {
          if (!A.spend()) return;
          const f = grindF(rounds[ri()], R);
          test = { x: R, f };
          A.say(`Test beam: with R = ${R} cm the lens focuses ${fmt(f)} cm behind it.`, true);
        }, 'secondary'),
        A.button('🔥 Fire', 'Fire the beam through this lens', () => {
          const r = rounds[ri()];
          const j = judgeGrind(r, R);
          attempt = { x: R, ok: j.ok, f: j.f };
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[0]}` : missText(game, ri(), { x: R }), { x: x0 + r.f * sc, y: AX }, 1.2);
        }),
      );
      onRound = (i) => {
        R = S.start;
        slider.set(R);
        test = null;
        attempt = null;
        clearSay();
        const r = rounds[i];
        const kind = r.shape === 'equal' ? 'a double-convex lens whose two faces have the same radius' : r.shape === 'plano' ? 'a plano-convex lens: one face flat, the other with the radius you dial' : `a double-convex lens whose first face has R₁ = ${r.R1} cm; you dial the second`;
        A.hint.textContent = `${kind}. Glass n = ${r.n}. The lantern (sensor) stands ${r.f} cm behind the lens. ${r.assist === 0 ? 'The live preview shows the focus.' : r.assist === 1 ? 'The live preview is off; use a test beam.' : 'No preview: work it out.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        line(g, 60, 44, 600, 44, PAL.dim, 3);
        for (let k = 0; k <= 60; k += 10) {
          const x = trackX(Math.max(1, k));
          line(g, x, 38, x, 50, PAL.dim, 1.5);
          text(g, String(k), x, 68, PAL.dim, 10);
        }
        text(g, 'curvature dial: radius R (cm)', 330, 24, PAL.dim, 11);
        line(g, 10, AX, W - 10, AX, PAL.dim, 1.2, [6, 6]);
        const resolving = A.phase === 'resolve' && attempt !== null;
        const shown = resolving ? attempt!.x : R;
        lens(g, x0, AX, grindF(r, shown), 78);
        text(g, r.shape === 'equal' ? 'both faces alike' : r.shape === 'plano' ? 'one face flat' : `first face: R₁ = ${r.R1} cm`, x0, AX + 108, PAL.dim, 11);
        const fx = x0 + r.f * sc;
        sensor(g, fx, AX, t, mood(attempt, 1.1));
        text(g, `lantern at f = ${r.f} cm`, fx, AX + 62, PAL.green, 11);
        if (r.assist === 0 && A.phase === 'play') {
          g.globalAlpha = 0.7;
          parallelRays(g, x0, AX, grindF(r, R), sc, W - 10, PAL.yellow);
          g.globalAlpha = 1;
          const px = x0 + grindF(r, R) * sc;
          if (px < W - 8) diamond(g, px, AX, PAL.yellow);
        } else if (test && A.phase === 'play') {
          g.globalAlpha = 0.8;
          parallelRays(g, x0, AX, test.f, sc, W - 10, PAL.dim);
          g.globalAlpha = 1;
          if (x0 + test.f * sc < W) text(g, `test beam: ${fmt(test.f)} cm`, x0 + test.f * sc, AX - 60, PAL.dim, 11);
        }
        if (resolving) {
          g.globalAlpha = Math.min(1, A.rt / 0.8);
          parallelRays(g, x0, AX, attempt!.f, sc, Math.min(W - 10, Math.max(fx + 20, x0 + attempt!.f * sc + 30)), PAL.yellow);
          g.globalAlpha = 1;
          const px = x0 + attempt!.f * sc;
          if (A.rt > 0.8 && px < W - 6) {
            glow(g, attempt!.ok ? PAL.green : PAL.red, 14, () => {
              g.fillStyle = attempt!.ok ? PAL.green : PAL.red;
              g.beginPath();
              g.arc(px, AX, 7, 0, Math.PI * 2);
              g.fill();
            });
          }
        }
      });
    }

    // ================= level 2: the power pair (dial the back lens) ======================================
    if (game.kind === 'stack') {
      const rounds = game.rounds;
      const S = SLIDERS.stack;
      let P2: number = S.start;
      let measured: { p: number; at: number } | null = null;
      let attempt: { ok: boolean; p: number } | null = null;
      const knobY = (p: number) => 290 - ((p - S.min) / (S.max - S.min)) * 220;
      const slider = A.slider({ aria: 'Power of the back lens in dioptres', label: 'Back lens power', min: S.min, max: S.max, step: S.step, value: P2, unit: 'D', text: (v) => `${v > 0 ? '+' : ''}${v}`, onInput: (v) => (P2 = v) });
      A.handle({ x: () => 604, y: () => knobY(P2), r: 22, drag: (_px, py) => slider.set(S.min + ((290 - py) / 220) * (S.max - S.min)) });
      A.controls.append(
        slider.row,
        A.button('📏 Measure', 'Measure the pair with a beam', () => {
          if (!A.spend()) return;
          const p = pairPower(rounds[ri()], P2);
          measured = { p, at: P2 };
          A.say(`The pair measures ${sgn(p)} D at this dial setting.`, true);
        }, 'secondary'),
        A.button('🔥 Fire', 'Fire the beam through the pair', () => {
          const r = rounds[ri()];
          const j = judgeStack(r, P2);
          attempt = { ok: j.ok, p: j.p };
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[0]}` : missText(game, ri(), { x: P2 }), { x: 400, y: 175 }, 1.0);
        }),
      );
      onRound = (i) => {
        P2 = 0;
        slider.set(0);
        measured = null;
        attempt = null;
        clearSay();
        const r = rounds[i];
        A.hint.textContent = `Front lens fixed at ${sgn(r.P1)} D (f = ${sgn(fromPower(r.P1))} cm). Dot’s picture needs the pair to be ${powerText(r.target)}. ${r.assist === 0 ? 'The live rays show the pair.' : r.assist === 1 ? 'The live rays are off; use a measuring beam.' : 'No preview: work it out.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const AX = 175;
        const sc = 3;
        const resolving = A.phase === 'resolve' && attempt !== null;
        const p = resolving ? attempt!.p : pairPower(r, P2);
        text(g, `Dot’s picture needs ${sgn(r.target)} D`, 320, 30, PAL.yellow, 15);
        line(g, 10, AX, W - 10, AX, PAL.dim, 1.2, [6, 6]);
        const x1 = 170;
        const x2 = 198;
        lens(g, x1, AX, fromPower(r.P1), 70, 1, r.P1 > 0 ? PAL.cyan : PAL.pink);
        if (Math.abs(P2) > 1e-9) lens(g, x2, AX, fromPower(P2), 70, 1, P2 > 0 ? PAL.cyan : PAL.pink);
        else line(g, x2, AX - 70, x2, AX + 70, PAL.dim, 2, [4, 4]);
        text(g, `front ${sgn(r.P1)} D`, x1 - 8, AX + 96, r.P1 > 0 ? PAL.cyan : PAL.pink, 11);
        text(g, `back ${sgn(P2)} D`, x2 + 14, AX + 112, P2 > 0 ? PAL.cyan : PAL.pink, 11);
        // the flag: where the pair must focus (a virtual focus for a diverging pair)
        const ft = fromPower(r.target);
        const mid = (x1 + x2) / 2;
        const fx = ft > 0 ? mid + ft * sc : mid + ft * sc;
        if (fx > 12 && fx < W - 12) {
          line(g, fx, AX - 50, fx, AX + 50, PAL.green, 2, ft > 0 ? [] : [4, 4]);
          text(g, ft > 0 ? 'focus the picture needs' : 'virtual focus needed', fx, AX - 58, PAL.green, 11);
        }
        const live = r.assist === 0 || resolving;
        if (live) {
          const f = Math.abs(p) < 1e-9 ? Infinity : fromPower(p);
          g.globalAlpha = resolving ? 1 : 0.8;
          parallelRays(g, mid, AX, f, sc, W - 70, resolving ? (attempt!.ok ? PAL.green : PAL.red) : PAL.yellow);
          g.globalAlpha = 1;
          if (r.assist === 0 && A.phase === 'play') text(g, `pair: ${sgn(p)} D`, 320, 292, PAL.yellow, 13);
        } else if (measured && A.phase === 'play' && measured.at === P2) text(g, `measured: ${sgn(measured.p)} D`, 320, 292, PAL.cyan, 13);
        else if (A.phase === 'play') text(g, 'preview off', 320, 292, PAL.dim, 12);
        // the dial
        line(g, 604, 70, 604, 290, PAL.dim, 4);
        text(g, '+10 D', 604, 60, PAL.dim, 10);
        text(g, '−10 D', 604, 308, PAL.dim, 10);
        orb(g, 90, AX, 14, PAL.pink, t, mood(attempt, 1.0));
        text(g, 'Dot', 90, AX + 30, PAL.white, 11);
        if (resolving && A.rt > 0.5) glow(g, attempt!.ok ? PAL.green : PAL.red, 10, () => text(g, `pair: ${sgn(attempt!.p)} D`, 320, 292, attempt!.ok ? PAL.green : PAL.red, 15));
      });
    }

    // ================= level 3: the projector shot (an Angry Birds-style aim and fire) ==================
    if (game.kind === 'projector') {
      const rounds = game.rounds;
      const F = SLIDERS.focal;
      let f: number = F.start;
      let x = 30;
      let test: { f: number; x: number; v: number | null } | null = null;
      let attempt: { ok: boolean; f: number; x: number } | null = null;
      const scFor = () => 520 / rounds[ri()].D;
      const knobY = (v: number) => 290 - ((v - F.min) / (F.max - F.min)) * 210;
      const posSlider = A.slider({ aria: 'Lens position from the slide in centimetres', label: 'Lens stands', min: 5, max: rounds[0].D - 5, step: 1, value: x, unit: 'cm from the slide', onInput: (v) => (x = v) });
      const fSlider = A.slider({ aria: 'Focal length of the lens in centimetres', label: 'Lens focal length', min: F.min, max: F.max, step: F.step, value: f, unit: 'cm', onInput: (v) => (f = v) });
      A.handle({ x: () => 50 + x * scFor(), y: () => 115, r: 26, drag: (px) => posSlider.set((px - 50) / scFor()) });
      A.handle({ x: () => 612, y: () => knobY(f), r: 20, drag: (_px, py) => fSlider.set(F.min + ((290 - py) / 210) * (F.max - F.min)) });
      A.controls.append(
        posSlider.row,
        fSlider.row,
        A.button('🔦 Test beam', 'Test beam: see where the picture lands', () => {
          if (!A.spend()) return;
          const v = projectorV(f, x);
          test = { f, x, v };
          A.say(v === null ? `At f = ${f} cm and ${x} cm the slide is inside the focus: no real image.` : `At f = ${f} cm and ${x} cm the picture lands ${fmt(v)} cm beyond the lens, ${fmt(v / x)} times the slide’s size.`, true);
        }, 'secondary'),
        A.button('📽️ Fire', 'Fire the projector', () => {
          const r = rounds[ri()];
          const j = judgeProjector(r, f, x);
          attempt = { ok: j.ok, f, x };
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[1]}` : missText(game, ri(), { x, f }), { x: 50 + r.D * scFor(), y: 200 }, 1.4);
        }),
      );
      onRound = (i) => {
        posSlider.range(5, rounds[i].D - 5);
        x = Math.round(rounds[i].D / 2);
        posSlider.set(x);
        f = F.start;
        fSlider.set(f);
        test = null;
        attempt = null;
        clearSay();
        const r = rounds[i];
        A.hint.textContent = `Slide and screen are ${r.D} cm apart. The picture must be sharp and fill the frame, ${r.m} times the slide’s size. ${r.assist === 0 ? 'The dotted preview shows where the picture lands.' : 'No preview: use a test beam or work it out.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const sc = scFor();
        const AX = 200;
        const xs = 50 + r.D * sc;
        line(g, 20, AX, W - 10, AX, PAL.dim, 1.2, [6, 6]);
        const resolving = A.phase === 'resolve' && attempt !== null;
        const fU = resolving ? attempt!.f : f;
        const xU = resolving ? attempt!.x : x;
        const lx = 50 + xU * sc;
        slide(g, 50, AX, 40, t, mood(attempt, 1.4));
        text(g, 'slide', 50, AX + 18, PAL.dim, 11);
        glow(g, PAL.white, 6, () => line(g, xs, AX - 90, xs, AX + 90, PAL.white, 5));
        // the frame the picture must fill
        const frame = Math.min(130, 40 * r.m);
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 2;
        g.setLineDash([6, 5]);
        g.strokeRect(xs - 26, AX - 0, 52, frame);
        g.setLineDash([]);
        text(g, `frame: ${r.m}×`, xs, AX + frame + 16, PAL.yellow, 11);
        text(g, `screen (${r.D} cm)`, xs, AX - 100, PAL.white, 11);
        lens(g, lx, AX, fU, 60);
        text(g, `f = ${fU} cm`, lx, AX + 76, PAL.cyan, 11);
        const v = projectorV(fU, xU);
        if (r.assist === 0 && A.phase === 'play' && v !== null) {
          const ix = lx + v * sc;
          for (let k = 0; k < 14; k++) {
            const px = lx + ((ix - lx) * k) / 13;
            g.fillStyle = PAL.cyan;
            g.globalAlpha = 0.8 * (1 - k / 16);
            g.beginPath();
            g.arc(px, AX + ((40 * (v / xU)) * k) / 13, 2.5, 0, Math.PI * 2);
            g.fill();
          }
          g.globalAlpha = 1;
          diamond(g, ix, AX, PAL.cyan);
        } else if (test && A.phase === 'play' && test.v !== null) diamond(g, 50 + (test.x + test.v) * sc, AX, PAL.cyan);
        if (resolving) {
          if (v === null) {
            text(g, 'no real image: the slide is inside the focus', 330, 310, PAL.red, 13);
          } else {
            const m = v / xU;
            const hi = Math.min(130, 40 * m);
            const ix = lx + v * sc;
            const prog = Math.min(1, A.rt / 1.0);
            trace(g, [[50, AX - 40], [lx, AX - 40], [ix, AX + hi]], prog, PAL.yellow);
            trace(g, [[50, AX - 40], [lx, AX], [ix, AX + hi]], prog, PAL.cyan);
            if (A.rt > 1.0) {
              const blur = attempt!.ok ? 0 : Math.min(22, Math.abs(ix - xs) * 0.25);
              g.save();
              g.shadowColor = PAL.yellow;
              g.shadowBlur = blur;
              g.globalAlpha = Math.max(0.3, 1 - blur / 26);
              slide(g, attempt!.ok ? xs : ix, AX, hi, t, attempt!.ok ? 'cheer' : 'worried', true);
              g.restore();
              if (!attempt!.ok) text(g, 'the picture forms here', ix, AX - 14, PAL.red, 11);
              else glow(g, PAL.green, 14, () => text(g, `SHARP, ${r.m}×`, xs - 50, AX - 114, PAL.green, 15));
            }
          }
        }
        // the focal-length dial
        line(g, 612, 80, 612, 290, PAL.dim, 4);
        text(g, `${F.max}`, 612, 70, PAL.dim, 10);
        text(g, `${F.min}`, 612, 308, PAL.dim, 10);
      });
    }

    // ================= level 4: the test chamber (a Portal-style beam chamber) ===========================
    if (game.kind === 'relay') {
      const rounds = game.rounds;
      const S = SLIDERS.relay;
      let screen: number = S.start;
      let flash: { born: number } | null = null;
      let attempt: { ok: boolean; at: number } | null = null;
      const scFor = () => 570 / (rounds[ri()].u1 + 120);
      const x1Of = () => 30 + rounds[ri()].u1 * scFor();
      const slider = A.slider({ aria: 'Screen position from the first lens in centimetres', label: 'Receptor stands', min: S.min, max: S.max, step: S.step, value: screen, unit: 'cm from lens 1', onInput: (v) => (screen = v) });
      A.handle({ x: () => x1Of() + screen * scFor(), y: () => 100, r: 24, drag: (px) => slider.set((px - x1Of()) / scFor()) });
      A.controls.append(
        slider.row,
        A.button('⚡ Flash', 'Flash: where lens 1 alone makes its image', () => {
          if (!A.spend()) return;
          flash = { born: A.clock };
          A.say(`Lens 1 alone would focus Beacon’s light ${fmt(rounds[ri()].v1)} cm beyond itself (ignoring lens 2).`, true);
        }, 'secondary'),
        A.button('🎯 Place the receptor', 'Place the screen here', () => {
          const r = rounds[ri()];
          const j = judgeRelay(r, screen);
          attempt = { ok: j.ok, at: screen };
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[1]}` : missText(game, ri(), {}), { x: x1Of() + r.screen * scFor(), y: 175 }, 1.4);
        }),
      );
      onRound = (i) => {
        screen = S.start;
        slider.set(screen);
        flash = null;
        attempt = null;
        clearSay();
        const r = rounds[i];
        A.hint.textContent = `Lens 1: f = +${r.f1} cm, Beacon ${r.u1} cm in front of it. Lens 2: f = ${sgn(r.f2)} cm, ${r.s} cm behind lens 1. Give the receptor’s position from lens 1.`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const sc = scFor();
        const AX = 195;
        const x1 = x1Of();
        const x2 = x1 + r.s * sc;
        const ho = 36;
        g.fillStyle = 'rgba(255,255,255,0.05)';
        g.fillRect(0, 60, W, 270);
        line(g, 0, 60, W, 60, PAL.dim, 2);
        line(g, 0, 300, W, 300, PAL.dim, 2);
        text(g, 'TEST CHAMBER 09', 320, 24, PAL.dim, 12);
        line(g, 10, AX, W - 10, AX, PAL.dim, 1.2, [6, 6]);
        orb(g, 30, AX - ho, 10, PAL.yellow, t);
        line(g, 30, AX, 30, AX - ho + 10, PAL.yellow, 3);
        text(g, 'Beacon', 30, AX + 18, PAL.white, 11);
        lens(g, x1, AX, r.f1, 66);
        text(g, `lens 1: +${r.f1} cm`, x1, AX + 90, PAL.cyan, 11);
        lens(g, x2, AX, r.f2, 58, 1, r.f2 > 0 ? PAL.cyan : PAL.pink);
        text(g, `lens 2: ${sgn(r.f2)} cm`, x2, AX + 106, r.f2 > 0 ? PAL.cyan : PAL.pink, 11);
        const resolving = A.phase === 'resolve' && attempt !== null;
        const sx = x1 + (resolving ? attempt!.at : screen) * sc;
        glow(g, PAL.white, 6, () => line(g, sx, AX - 70, sx, AX + 70, PAL.white, 5));
        text(g, 'receptor', sx, AX - 78, PAL.white, 11);
        if (flash && A.phase === 'play') {
          const ix = x1 + r.v1 * sc;
          diamond(g, ix, AX, PAL.cyan);
          text(g, `lens 1 alone: ${fmt(r.v1)} cm`, ix, AX - 16, PAL.cyan, 11);
        }
        if (resolving) {
          const m1 = -r.v1 / r.u1;
          const m2 = r.v2 / r.u2;
          const tipY = AX - ho;
          const i1y = AX - m1 * ho;
          const i1x = x1 + r.v1 * sc;
          const i2y = AX - m1 * m2 * ho;
          const i2x = x2 + r.v2 * sc;
          const yAt = (xa: number, ya: number, xb: number, yb: number, x: number) => ya + ((yb - ya) * (x - xa)) / (xb - xa);
          const prog = Math.min(1, A.rt / 1.2);
          trace(g, [[30, tipY], [x1, tipY], [x2, yAt(x1, tipY, i1x, i1y, x2)], [i2x, i2y]], prog, PAL.yellow);
          trace(g, [[30, tipY], [x1, AX], [x2, yAt(30, tipY, x1, AX, x2) + (yAt(x1, AX, i1x, i1y, x2) - AX)], [i2x, i2y]], prog, PAL.cyan, 1.6);
          if (A.rt > 1.2) {
            const blur = attempt!.ok ? 0 : Math.min(22, Math.abs(i2x - sx) * 0.25);
            g.save();
            g.shadowColor = PAL.yellow;
            g.shadowBlur = blur;
            g.globalAlpha = Math.max(0.3, 1 - blur / 26);
            orb(g, attempt!.ok ? sx : i2x, Math.max(70, Math.min(AX + 100, i2y)), 10, PAL.yellow, t, attempt!.ok ? 'cheer' : 'worried');
            g.restore();
            if (!attempt!.ok) text(g, 'the image forms here', i2x, AX + 130, PAL.red, 11);
          }
        }
      });
    }

    // ================= level 5: the magician's tank ======================================================
    if (game.kind === 'liquid') {
      const rounds = game.rounds;
      const S = SLIDERS.liquid;
      let nL: number = S.start;
      let dip: { n: number; f: number } | null = null;
      let attempt: { ok: boolean; n: number; f: number } | null = null;
      const knobY = (n: number) => 285 - ((n - S.min) / (S.max - S.min)) * 190;
      const slider = A.slider({ aria: 'Refractive index of the liquid', label: 'Liquid index', min: S.min, max: S.max, step: S.step, value: nL, unit: '', text: (v) => `n = ${v.toFixed(2)}`, onInput: (v) => (nL = v) });
      A.handle({ x: () => 570, y: () => knobY(nL), r: 22, drag: (_px, py) => slider.set(S.min + ((285 - py) / 190) * (S.max - S.min)) });
      A.controls.append(
        slider.row,
        A.button('🧪 Dip test', 'Dip test: measure the lens in this liquid', () => {
          if (!A.spend()) return;
          const r = rounds[ri()];
          const f = fInLiquid(r.nG, nL, r.fAir);
          dip = { n: nL, f };
          A.say(`Dip test in n = ${nL.toFixed(2)}: ${liquidText(f)}.`, true);
        }, 'secondary'),
        A.button('🎩 Do the trick', 'Pour this liquid and do the trick', () => {
          const r = rounds[ri()];
          const j = judgeLiquid(r, nL);
          attempt = { ok: j.ok, n: nL, f: j.f };
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[1]}` : missText(game, ri(), { x: nL }), { x: 320, y: 185 }, 1.2);
        }),
      );
      onRound = (i) => {
        nL = S.start;
        slider.set(nL);
        dip = null;
        attempt = null;
        clearSay();
        const r = rounds[i];
        A.hint.textContent = `Lens: double convex, both radii ${r.R} cm, focal length ${r.fAir} cm in air. ${r.assist === 0 ? 'The tank shows the lens live.' : 'The tank is dark until the trick: work it out.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const AX = 185;
        const resolving = A.phase === 'resolve' && attempt !== null;
        const n = resolving ? attempt!.n : nL;
        const live = r.assist === 0 || resolving;
        const goal = r.kind === 'vanish' ? 'make the lens vanish' : r.kind === 'target' ? `make it converge with f′ = ${sgn(r.fTarget)} cm` : `make it diverge with f′ = ${sgn(r.fTarget)} cm`;
        text(g, `TRICK: ${goal}`, 320, 26, PAL.yellow, 14);
        g.fillStyle = `rgba(77,225,255,${0.1 + (n - 1.1) * 0.35})`;
        g.fillRect(150, 70, 340, 230);
        g.strokeStyle = PAL.white;
        g.lineWidth = 3;
        g.strokeRect(150, 70, 340, 230);
        text(g, `liquid: n = ${n.toFixed(2)}`, 320, 318, PAL.cyan, 12);
        line(g, 570, 95, 570, 285, PAL.dim, 4);
        text(g, 'n', 570, 85, PAL.dim, 11);
        const f = fInLiquid(r.nG, n, r.fAir);
        if (live) {
          const fade = Math.max(0.05, Math.min(1, Math.abs(r.nG - n) * 8 + 0.02));
          lens(g, 320, AX, Number.isFinite(f) ? f : 1e6, 70, fade);
          parallelRays(g, 320, AX, f, 3, 485, PAL.yellow);
        } else {
          lens(g, 320, AX, r.fAir, 70, 0.35);
          text(g, '?', 320, AX + 50, PAL.dim, 36);
        }
        orb(g, 90, AX, 14, PAL.yellow, t, mood(attempt, 1.2));
        text(g, 'Lumi’s light', 90, AX + 30, PAL.white, 11);
        if (dip && A.phase === 'play') text(g, `dip test, n = ${dip.n.toFixed(2)}: ${liquidText(dip.f)}`, 320, 290, PAL.cyan, 11);
        if (resolving && A.rt > 0.4) glow(g, attempt!.ok ? PAL.green : PAL.red, 10, () => text(g, liquidText(attempt!.f), 320, 290, attempt!.ok ? PAL.green : PAL.red, 12));
      });
    }

    A.mountAll();
    return A.run();
  },
});
