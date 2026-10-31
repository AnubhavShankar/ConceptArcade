// Inspirations: Zelda and Portal beam puzzles (light the lantern, test chamber), Angry Birds (set the dials, fire, watch the shot).
import { createArcade, PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { fmt, sgn } from '@core/judge';
import { glow, line, orb, text, trace } from '@core/neon';
import { lantern, lens, glassRod, grinder, parallelRays, sensor, slide } from './art';
import { LIQUID_MISS_FADE, PROJ_MISS, SLIDERS, buildGame, curvedDen, curvedMissDen, curvedReading, explainRound, fInLiquid, fromPower, grindF, grindMissFocus, indexText, judgeCurved, judgeGrind, judgeLiquid, judgeProjector, judgeRelay, judgeStack, liquidMissF, liquidMissLabel, liquidSide, liquidText, mediumName, missText, relayMissDraw, pairPower, powerText, projectorMiss, projectorStartX, projectorV, resultLine, stackMissF, stackMissLabel, stackSide, type StackSide } from './logic';

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
          // a miss draws the focus a fixed 5 cm behind or in front of the sensor, never at the player's own focus
          const fDraw = attempt!.ok ? attempt!.f : grindMissFocus(r, attempt!.x);
          g.globalAlpha = Math.min(1, A.rt / 0.8);
          parallelRays(g, x0, AX, fDraw, sc, Math.min(W - 10, Math.max(fx + 20, x0 + fDraw * sc + 30)), PAL.yellow);
          g.globalAlpha = 1;
          const px = x0 + fDraw * sc;
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
      let attempt: { ok: boolean; p: number; side: StackSide } | null = null;
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
          attempt = { ok: j.ok, p: j.p, side: stackSide(r, P2) };
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
          // a miss draws a focus a fixed distance to one side of the flag, never the pair's own focus
          const f = resolving && !attempt!.ok ? stackMissF(r, attempt!.side, sc) : Math.abs(p) < 1e-9 ? Infinity : fromPower(p);
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
        if (resolving && A.rt > 0.5) glow(g, attempt!.ok ? PAL.green : PAL.red, 10, () => text(g, attempt!.ok ? `pair: ${sgn(attempt!.p)} D` : `the pair is ${stackMissLabel(attempt!.side)}`, 320, 292, attempt!.ok ? PAL.green : PAL.red, 15));
      });
    }

    // ================= level 3: the projector shot (an Angry Birds-style aim and fire) ==================
    if (game.kind === 'projector') {
      const rounds = game.rounds;
      const F = SLIDERS.focal;
      let f: number = F.start;
      let x = projectorStartX(rounds[0].D);
      let test: { f: number; x: number; v: number | null } | null = null;
      let attempt: { ok: boolean; f: number; x: number; miss: ReturnType<typeof projectorMiss> } | null = null;
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
          attempt = { ok: j.ok, f, x, miss: projectorMiss(r, f, x) };
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[1]}` : missText(game, ri(), { x, f }), { x: 50 + r.D * scFor(), y: 200 }, 1.4);
        }),
      );
      onRound = (i) => {
        posSlider.range(5, rounds[i].D - 5);
        x = projectorStartX(rounds[i].D);
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
          const miss = attempt!.miss;
          if (v === null || miss.none) {
            text(g, 'no real image: the slide is inside the focus', 330, 310, PAL.red, 13);
          } else {
            // a miss draws the picture a FIXED distance short of or beyond the screen, at a FIXED size against the frame, with a fixed
            // blur and no marker: never at the player's own image distance or size
            const frameH = Math.min(130, 40 * r.m);
            const m = v / xU;
            const hi = attempt!.ok ? Math.min(130, 40 * m) : Math.min(138, frameH * (miss.size === 'big' ? PROJ_MISS.big : miss.size === 'small' ? PROJ_MISS.small : 1));
            const ix = attempt!.ok ? lx + v * sc : xs + (miss.where === 'short' ? -PROJ_MISS.offsetPx : miss.where === 'beyond' ? PROJ_MISS.offsetPx : 0);
            const prog = Math.min(1, A.rt / 1.0);
            trace(g, [[50, AX - 40], [lx, AX - 40], [ix, AX + hi]], prog, PAL.yellow);
            trace(g, [[50, AX - 40], [lx, AX], [ix, AX + hi]], prog, PAL.cyan);
            if (A.rt > 1.0) {
              const blur = attempt!.ok || miss.where === 'on' ? 0 : PROJ_MISS.blur;
              g.save();
              g.shadowColor = PAL.yellow;
              g.shadowBlur = blur;
              g.globalAlpha = Math.max(0.3, 1 - blur / 26);
              slide(g, attempt!.ok ? xs : ix, AX, hi, t, attempt!.ok ? 'cheer' : 'worried', true);
              g.restore();
              if (!attempt!.ok) text(g, miss.where === 'short' ? 'focus falls short of the screen' : miss.where === 'beyond' ? 'focus falls beyond the screen' : miss.size === 'big' ? 'sharp, but too big' : miss.size === 'small' ? 'sharp, but too small' : 'not quite', 330, 310, PAL.red, 12);
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
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[1]}` : missText(game, ri(), {}), { x: x1Of() + screen * scFor(), y: 175 }, 1.4);
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
          if (attempt!.ok) {
            trace(g, [[30, tipY], [x1, tipY], [x2, yAt(x1, tipY, i1x, i1y, x2)], [i2x, i2y]], prog, PAL.yellow);
            trace(g, [[30, tipY], [x1, AX], [x2, yAt(30, tipY, x1, AX, x2) + (yAt(x1, AX, i1x, i1y, x2) - AX)], [i2x, i2y]], prog, PAL.cyan, 1.6);
            if (A.rt > 1.2) {
              g.save();
              g.shadowColor = PAL.yellow;
              g.shadowBlur = 0;
              orb(g, sx, Math.max(70, Math.min(AX + 100, i2y)), 10, PAL.yellow, t, 'cheer');
              g.restore();
            }
          } else {
            // a miss shows only the player's own screen: the light from Beacon to lens 1, then a fixed-width beam to the screen,
            // a blurred spot of FIXED size, and which side of the screen the image formed on. Nothing marks the true image.
            const md = relayMissDraw(r, attempt!.at);
            trace(g, [[30, tipY], [x1, tipY]], prog, PAL.yellow);
            trace(g, [[30, tipY], [x1, AX]], prog, PAL.cyan, 1.6);
            if (A.rt > 0.6) {
              g.globalAlpha = Math.min(1, (A.rt - 0.6) / 0.5);
              line(g, x2, AX - 22, sx, AX - md.rayHalf, PAL.red, 1.5);
              line(g, x2, AX + 22, sx, AX + md.rayHalf, PAL.red, 1.5);
              g.globalAlpha = 1;
            }
            if (A.rt > 1.2) {
              g.save();
              g.shadowColor = PAL.yellow;
              g.shadowBlur = md.spot;
              g.globalAlpha = 0.6;
              orb(g, sx, AX, 10, PAL.yellow, t, 'worried');
              g.restore();
              text(g, md.label, sx, AX + 130, PAL.red, 11);
            }
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
      let attempt: { ok: boolean; n: number; f: number; side: 'low' | 'high' } | null = null;
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
          attempt = { ok: j.ok, n: nL, f: j.f, side: liquidSide(r, nL) };
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
        const missed = resolving && !attempt!.ok;
        // a miss draws the lens at a fixed fade and a fixed focal length for its side, never the player's own f′
        const f = missed ? liquidMissF(r, attempt!.side) : fInLiquid(r.nG, n, r.fAir);
        if (live) {
          const fade = missed ? LIQUID_MISS_FADE : Math.max(0.05, Math.min(1, Math.abs(r.nG - n) * 8 + 0.02));
          lens(g, 320, AX, Number.isFinite(f) ? f : 1e6, 70, fade);
          parallelRays(g, 320, AX, f, 3, 485, PAL.yellow);
        } else {
          lens(g, 320, AX, r.fAir, 70, 0.35);
          text(g, '?', 320, AX + 50, PAL.dim, 36);
        }
        orb(g, 90, AX, 14, PAL.yellow, t, mood(attempt, 1.2));
        text(g, 'Lumi’s light', 90, AX + 30, PAL.white, 11);
        if (dip && A.phase === 'play') text(g, `dip test, n = ${dip.n.toFixed(2)}: ${liquidText(dip.f)}`, 320, 290, PAL.cyan, 11);
        if (resolving && A.rt > 0.4) glow(g, attempt!.ok ? PAL.green : PAL.red, 10, () => text(g, attempt!.ok ? liquidText(attempt!.f) : `the lens is ${liquidMissLabel(r, attempt!.side)}`, 320, 290, attempt!.ok ? PAL.green : PAL.red, 12));
      });
    }

    // ================= level 6: one curved face (a lantern, a glass rod and a grinding wheel) ===============
    if (game.kind === 'curved') {
      const rounds = game.rounds;
      const S = SLIDERS.curved;
      const FX = 250; // the curved face
      const EX = 600; // the flat end of the rod
      const SX = 520; // the sensor, drawn at the same place whatever the depth (the picture is not to scale)
      const AX = 190;
      const HALF = 56;
      let R: number = S.start;
      let test: { x: number } | null = null;
      let attempt: { x: number; ok: boolean; den: number } | null = null;
      const trackX = (r: number) => 60 + ((r - S.min) * 540) / (S.max - S.min);
      const radiusText = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}`;
      const slider = A.slider({ aria: 'Radius of the curved face in centimetres, negative for a concave face', label: 'Radius of the face', min: S.min, max: S.max, step: S.step, value: R, unit: 'cm', text: radiusText, onInput: (v) => (R = v) });
      A.handle({ x: () => trackX(R), y: () => 44, r: 22, drag: (px) => slider.set(S.min + ((px - 60) * (S.max - S.min)) / 540) });
      const zero = () => A.freeNote('A radius of 0 cm is not a curved face: dial a radius other than zero.');
      A.controls.append(
        slider.row,
        A.button('🔬 Test beam', 'Test beam: where the light focuses with this radius', () => {
          if (R === 0) return zero();
          if (!A.spend()) return;
          test = { x: R };
          A.say(curvedReading(rounds[ri()], R), true);
        }, 'secondary'),
        A.button('🔥 Grind and fire', 'Grind the face to this radius and fire the light', () => {
          if (R === 0) return zero();
          const r = rounds[ri()];
          const j = judgeCurved(r, R);
          attempt = { x: R, ok: j.ok, den: j.ok ? r.n2 / r.v : curvedMissDen(r, R) };
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[0]}` : missText(game, ri(), { x: R }), { x: r.virtual ? 250 + r.v * 5 : SX, y: AX }, 1.2);
        }),
      );
      onRound = (i) => {
        R = S.start;
        slider.set(R);
        test = null;
        attempt = null;
        clearSay();
        const r = rounds[i];
        const rod = `${mediumName(r.n2)} (n = ${indexText(r.n2)})`;
        A.hint.textContent = `Light goes from air (n₁ = 1) into a ${rod} rod with one curved end. The lamp stands ${-r.u} cm in front of that end. ${r.virtual ? `The image must be virtual, ${-r.v} cm in front of the end, on the lamp’s side.` : `The sensor is ${r.v} cm deep inside the rod.`} ${r.assist === 0 ? 'The live preview shows where the light focuses.' : r.assist === 1 ? 'The live preview is off; use a test beam.' : 'No preview: work it out.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const resolving = A.phase === 'resolve' && attempt !== null;
        const shown = resolving ? attempt!.x : R;
        const sc = r.virtual ? 5 : (SX - FX) / r.v; // px per cm of depth
        const lampX = r.virtual ? 150 : 70;
        const sensX = r.virtual ? FX + r.v * 5 : SX;
        const sag = shown === 0 ? 0 : Math.max(-34, Math.min(34, (Math.sign(shown) * 200) / (Math.abs(shown) + 3)));
        // the radius track
        line(g, 60, 44, 600, 44, PAL.dim, 3);
        for (const k of [-50, -25, 25, 50]) {
          line(g, trackX(k), 38, trackX(k), 50, PAL.dim, 1.5);
          text(g, radiusText(k), trackX(k), 68, PAL.dim, 10);
        }
        line(g, trackX(0), 34, trackX(0), 54, PAL.red, 2);
        text(g, '0: no face', trackX(0), 82, PAL.red, 9);
        text(g, 'radius of the curved face R (cm): concave ← → convex', 330, 24, PAL.dim, 11);
        line(g, 10, AX, W - 10, AX, PAL.dim, 1.2, [6, 6]);
        // the rod, the sensor inside it and the grinding wheel
        glassRod(g, FX, EX, AX, HALF, sag);
        text(g, `${mediumName(r.n2)} rod, n = ${indexText(r.n2)}`, 425, AX - HALF - 10, PAL.cyan, 11);
        grinder(g, FX - 24, AX - HALF - 14, t, resolving && A.rt < 0.9, A.rt);
        if (r.virtual) {
          g.globalAlpha = 0.55;
          g.setLineDash([4, 4]);
          g.strokeStyle = PAL.green;
          g.lineWidth = 2;
          g.strokeRect(sensX - 11, AX - 46, 22, 92);
          g.setLineDash([]);
          g.globalAlpha = 1;
          text(g, `image target: ${-r.v} cm in front`, sensX - 6, AX + 66, PAL.green, 10);
        } else {
          sensor(g, sensX, AX, t, mood(attempt, 1.1));
          text(g, `sensor, ${r.v} cm deep`, sensX, AX + 62, PAL.green, 11);
        }
        lantern(g, lampX, AX - 10, t, mood(attempt, 1.1), resolving && A.rt < 1.2);
        text(g, `lamp: |u| = ${-r.u} cm`, lampX + 4, AX + 82, PAL.yellow, 11);
        // light from the lamp, bent at the face (rays are the lamp's, the bend is `den` = n₂/v′)
        const rays = (den: number, color: string, alpha: number, upTo = EX - 4) => {
          g.globalAlpha = alpha;
          for (const k of [-44, -26, 26, 44]) {
            line(g, lampX + 14, AX, FX, AX + k, color, 1.5);
            const slope = (-k * den) / (r.n2 * sc);
            line(g, FX, AX + k, upTo, AX + k + slope * (upTo - FX), color, 1.5);
            if (den < 0) {
              const vx = FX + (r.n2 / den) * sc;
              if (vx > 10) line(g, FX, AX + k, vx, AX, color, 1, [3, 4]);
            }
          }
          g.globalAlpha = 1;
        };
        if (!resolving && r.assist === 0 && A.phase === 'play' && R !== 0) {
          rays(curvedDen(r, R), PAL.yellow, 0.7);
          const fx = FX + (r.n2 / curvedDen(r, R)) * sc;
          if (Number.isFinite(fx) && fx > FX && fx < EX) diamond(g, fx, AX, PAL.yellow);
        } else if (test && A.phase === 'play' && test.x === R && R !== 0) {
          rays(curvedDen(r, test.x), PAL.dim, 0.8);
          text(g, 'test beam', 425, AX + 100, PAL.dim, 11);
        }
        if (resolving) {
          const prog = Math.min(1, Math.max(0, (A.rt - 0.3) / 0.8));
          rays(attempt!.den, attempt!.ok ? PAL.green : PAL.red, prog);
          if (A.rt > 1.1) {
            if (attempt!.ok) glow(g, PAL.green, 16, () => text(g, 'SHARP!', 425, AX + 100, PAL.green, 16));
            else text(g, 'blurred', 425, AX + 100, PAL.red, 14);
          }
        }
      });
    }

    A.mountAll();
    return A.run();
  },
});
