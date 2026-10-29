// Inspirations: sniper-scope reticles (Duck Hunt, shooters: bring the far target to fill the ring), Pokémon Snap (fit the subject
// to the frame, here the film plate) and Fallout lockpicking (two dials, warmer or colder).
import { createArcade, PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { fmt } from '@core/judge';
import { glow, line, orb, text } from '@core/neon';
import { D, SLIDERS, buildGame, eyeSees, explainRound, judgeNear, judgePlate, judgeZoom, lRange, missText, plateSize, resultLine, view, viewReading, type NearRound, type PlateRound, type ZoomRound } from './logic';

const W = 640;
const H = 340;

export default defineGame({
  mount(ctx) {
    const game = buildGame(ctx.level, ctx.random);
    let onRound: (i: number) => void = () => undefined;
    const A = createArcade(ctx, game.hero, { W, H, aria: 'An arcade screen with a telescope, a far target and a scope view that must be filled.', rounds: 3, charges: game.charges, onRound: (i) => onRound(i) });
    const clearSay = () => {
      A.feedback.hidden = true;
    };
    const ri = () => Math.min(A.round, 2);
    const lensShape = (g: CanvasRenderingContext2D, x: number, y: number, half: number, color: string) => {
      glow(g, color, 10, () => {
        g.fillStyle = 'rgba(77,225,255,0.18)';
        g.strokeStyle = color;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x, y - half);
        g.quadraticCurveTo(x + half * 0.45, y, x, y + half);
        g.quadraticCurveTo(x - half * 0.45, y, x, y - half);
        g.closePath();
        g.fill();
        g.stroke();
      });
    };

    // ================= levels 1 and 3: the sniper scope (relaxed, then near point) ======================
    if (game.kind === 'zoom' || game.kind === 'near') {
      const rounds = game.rounds as (ZoomRound | NearRound)[];
      const isNear = game.kind === 'near';
      let fe: number = SLIDERS.fe.start;
      let L = 0;
      let attempt: { ok: boolean; fe: number; L: number } | null = null;
      const lr = (i: number) => lRange(rounds[i].fo, isNear ? 0.1 : 1);
      const scIn = 14;
      const insetX = (d: number) => 150 + d * scIn;
      const feSlider = A.slider({ aria: 'Focal length of the eyepiece in centimetres', label: 'Eyepiece focal length', min: SLIDERS.fe.min, max: SLIDERS.fe.max, step: SLIDERS.fe.step, value: fe, unit: 'cm', onInput: (v) => (fe = v) });
      const r0 = lr(0);
      const lSlider = A.slider({ aria: 'Tube length in centimetres', label: 'Tube length', min: r0.min, max: r0.max, step: r0.step, value: rounds[0].fo, unit: 'cm', onInput: (v) => (L = v) });
      const knobY = (v: number) => 300 - ((v - SLIDERS.fe.min) / (SLIDERS.fe.max - SLIDERS.fe.min)) * 130;
      A.handle({ x: () => insetX(L - rounds[ri()].fo), y: () => 235, r: 26, drag: (px) => lSlider.set(rounds[ri()].fo + (px - 150) / scIn) });
      A.handle({ x: () => 612, y: () => knobY(fe), r: 20, drag: (_px, py) => feSlider.set(SLIDERS.fe.min + ((300 - py) / 130) * (SLIDERS.fe.max - SLIDERS.fe.min)) });
      A.controls.append(
        feSlider.row,
        lSlider.row,
        A.button('🔦 Test shot', 'Test shot: measure the view with these settings', () => {
          if (!A.spend()) return;
          A.say(viewReading(rounds[ri()].fo, fe, L), true);
        }, 'secondary'),
        A.button('🎯 Fire', 'Fire the scope with these settings', () => {
          const r = rounds[ri()];
          const j = isNear ? judgeNear(r as NearRound, fe, L) : judgeZoom(r as ZoomRound, fe, L);
          attempt = { ok: j.ok, fe, L };
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[1]}` : missText(game, ri(), { fe, L }), { x: 540, y: 95 }, 0.9);
        }),
      );
      onRound = (i) => {
        const rg = lr(i);
        lSlider.range(rg.min, rg.max);
        fe = SLIDERS.fe.start;
        feSlider.set(fe);
        lSlider.set(rounds[i].fo + (isNear ? 8 : 0));
        attempt = null;
        clearSay();
        const r = rounds[i];
        A.hint.textContent = `Objective f = ${fmt(r.fo)} cm. Make the target fill the ring: ${fmt(r.M)}×, final image ${isNear ? `at the near point (${D} cm)` : 'at infinity'}. ${r.assist === 0 ? 'The scope view is live.' : r.assist === 1 ? 'The scope view is dim: use a test shot.' : 'The scope view is off: work it out.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const resolving = A.phase === 'resolve' && attempt !== null;
        const feU = resolving ? attempt!.fe : fe;
        const LU = resolving ? attempt!.L : L;
        const w = view(r.fo, feU, LU);
        text(g, `TELESCOPE: objective f = ${fmt(r.fo)} cm`, 190, 28, PAL.cyan, 12);
        // the schematic: a big objective, a long tube, a small eyepiece
        lensShape(g, 50, 85, 40, PAL.cyan);
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(50, 60, 280, 50);
        line(g, 50, 60, 330, 60, PAL.dim, 2);
        line(g, 50, 110, 330, 110, PAL.dim, 2);
        lensShape(g, 330, 85, 22, PAL.pink);
        text(g, 'objective', 50, 138, PAL.dim, 10);
        text(g, 'eyepiece', 330, 138, PAL.dim, 10);
        // the zoomed inset: where the eyepiece stands relative to the objective's focus
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(14, 160, 480, 150);
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 2;
        g.strokeRect(14, 160, 480, 150);
        text(g, 'ZOOM ON THE EYEPIECE END (not to the same scale)', 254, 176, PAL.cyan, 10);
        const AXY = 235;
        line(g, 14, AXY, 494, AXY, PAL.dim, 1.2, [6, 6]);
        const xF = insetX(0);
        const xE = insetX(LU - r.fo);
        line(g, xF, AXY - 40, xF, AXY + 40, PAL.yellow, 2, [4, 4]);
        text(g, 'objective’s focus (first image)', xF, AXY + 58, PAL.yellow, 10);
        if (xE > 20 && xE < 490) lensShape(g, xE, AXY, 44, PAL.pink);
        const xFe = xE - feU * scIn;
        if (xFe > 18) {
          line(g, xFe, AXY - 7, xFe, AXY + 7, PAL.pink, 2);
          text(g, 'eyepiece focus', xFe, AXY - 14, PAL.pink, 10);
        }
        if (r.assist === 0 || resolving) {
          const aligned = !isNear && Math.abs(xFe - xF) < 4;
          if (aligned) glow(g, PAL.green, 12, () => text(g, 'focus meets focus: image at infinity', 254, 300, PAL.green, 11));
        }
        // the scope view
        const cx = 540;
        const cy = 95;
        g.fillStyle = 'rgba(0,0,0,0.6)';
        g.beginPath();
        g.arc(cx, cy, 78, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = resolving ? (attempt!.ok ? PAL.green : PAL.red) : PAL.cyan;
        g.lineWidth = 3;
        g.stroke();
        const ringR = 56;
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 2;
        g.setLineDash([5, 5]);
        g.beginPath();
        g.arc(cx, cy, ringR, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
        line(g, cx - 78, cy, cx + 78, cy, PAL.dim, 1);
        line(g, cx, cy - 78, cx, cy + 78, PAL.dim, 1);
        text(g, `ring = ${fmt(r.M)}×`, cx, cy + 98, PAL.yellow, 11);
        const live = r.assist === 0 || resolving;
        const dim = r.assist === 1 && !resolving;
        if (live || dim) {
          if (w.M === null) text(g, 'no picture', cx, cy + 4, PAL.red, 12);
          else {
            const sharp = eyeSees(w.v!);
            const rad = Math.min(76, (ringR * w.M) / r.M);
            const blur = sharp ? 0 : Math.min(18, (D - w.v!) * 0.7);
            g.save();
            g.beginPath();
            g.arc(cx, cy, 77, 0, Math.PI * 2);
            g.clip();
            g.shadowColor = PAL.pink;
            g.shadowBlur = blur;
            g.globalAlpha = dim ? 0.3 : Math.max(0.3, 1 - blur / 24);
            orb(g, cx, cy, Math.max(4, rad), PAL.pink, t, resolving ? (attempt!.ok ? 'cheer' : 'worried') : 'happy');
            g.restore();
            if (live && !dim) text(g, `${fmt(w.M)}×${sharp ? '' : ' (blurred)'}`, cx, cy + 112, sharp ? PAL.green : PAL.red, 11);
          }
        } else text(g, '?', cx, cy + 12, PAL.dim, 40);
        // the eyepiece-focal-length dial
        line(g, 612, 170, 612, 300, PAL.dim, 4);
        text(g, `${SLIDERS.fe.max}`, 612, 162, PAL.dim, 10);
        text(g, `${SLIDERS.fe.min}`, 612, 318, PAL.dim, 10);
        text(g, 'f_e', 590, 240, PAL.pink, 11);
        if (resolving && A.rt > 0.9) glow(g, attempt!.ok ? PAL.green : PAL.red, 12, () => text(g, attempt!.ok ? 'LOCKED ON' : 'OFF TARGET', 540, 330, attempt!.ok ? PAL.green : PAL.red, 15));
      });
    }

    // ================= level 2: the photo plate ===========================================================
    if (game.kind === 'plate') {
      const rounds = game.rounds;
      const S = SLIDERS.fo;
      const objX = 70;
      const AX = 180;
      const sx = 0.2;
      const pxCm = 8;
      let fo: number = S.start;
      let attempt: { ok: boolean; fo: number } | null = null;
      const slider = A.slider({ aria: 'Focal length of the objective in centimetres', label: 'Objective focal length', min: S.min, max: S.max, step: S.step, value: fo, unit: 'cm', onInput: (v) => (fo = v) });
      A.handle({ x: () => objX + fo * sx, y: () => AX, r: 30, drag: (px) => slider.set((px - objX) / sx) });
      A.controls.append(
        slider.row,
        A.button('🔦 Test shot', 'Test shot: measure the image size at this focal length', () => {
          if (!A.spend()) return;
          const r = rounds[ri()];
          A.say(`At f = ${fo} cm the real image of the ${r.target} is ${fmt(plateSize(fo, r.theta))} cm across.`, true);
        }, 'secondary'),
        A.button('📸 Expose', 'Expose the plate at this focal length', () => {
          const r = rounds[ri()];
          const j = judgePlate(r, fo);
          attempt = { ok: j.ok, fo };
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[1]}` : missText(game, ri(), { fo }), { x: objX + fo * sx, y: AX }, 0.8);
        }),
      );
      onRound = (i) => {
        fo = S.start;
        slider.set(fo);
        attempt = null;
        clearSay();
        const r = rounds[i] as PlateRound;
        A.hint.textContent = `Target: ${r.target === 'moon' ? 'the Moon (3.48 × 10⁶ m across, 3.8 × 10⁸ m away)' : 'a tower 100 m tall, 3 km away'}. The plate is ${fmt(r.plate)} cm across. ${r.assist === 0 ? 'The live image is shown.' : r.assist === 1 ? 'The live image is off: use a test shot.' : 'No image: work it out.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const resolving = A.phase === 'resolve' && attempt !== null;
        const foU = resolving ? attempt!.fo : fo;
        const size = plateSize(foU, r.theta);
        const xp = objX + foU * sx;
        line(g, 10, AX, W - 10, AX, PAL.dim, 1.2, [6, 6]);
        lensShape(g, objX, AX, 70, PAL.cyan);
        text(g, 'objective', objX, AX + 92, PAL.cyan, 11);
        // parallel light from the far target, converging on the plate
        for (const k of [-45, -25, 25, 45]) line(g, 10, AX + k, objX, AX + k, PAL.yellow, 1.3);
        for (const k of [-45, -25, 25, 45]) line(g, objX, AX + k, xp, AX, PAL.yellow, 1.3);
        text(g, 'light from far away', 60, 40, PAL.yellow, 11);
        // the plate at the focal plane
        const plateR = (r.plate * pxCm) / 2;
        line(g, xp, AX - 110, xp, AX + 110, PAL.dim, 3);
        g.strokeStyle = PAL.yellow;
        g.lineWidth = 2;
        g.setLineDash([6, 5]);
        g.beginPath();
        g.ellipse(xp, AX, 7, plateR, 0, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
        text(g, `plate: ${fmt(r.plate)} cm`, xp, AX + 126, PAL.yellow, 11);
        const live = r.assist === 0 || resolving;
        if (live) {
          const imgR = (size * pxCm) / 2;
          const ok = Math.abs(imgR - plateR) < 3;
          g.save();
          g.globalAlpha = 0.9;
          g.shadowColor = ok ? PAL.green : PAL.pink;
          g.shadowBlur = 14;
          g.strokeStyle = ok ? PAL.green : PAL.pink;
          g.lineWidth = 4;
          g.beginPath();
          g.ellipse(xp, AX, 7, Math.min(imgR, 150), 0, 0, Math.PI * 2);
          g.stroke();
          g.restore();
          if (r.assist === 0 && A.phase === 'play') text(g, `image: ${fmt(size)} cm`, xp, AX - 128, ok ? PAL.green : PAL.pink, 11);
          // the target as it appears on the plate, a little character
          orb(g, xp + 38, AX, Math.max(5, Math.min(60, imgR * 0.9)), r.target === 'moon' ? PAL.white : PAL.orange, t, resolving ? (attempt!.ok ? 'cheer' : 'worried') : 'happy');
        } else text(g, '?', xp + 38, AX + 12, PAL.dim, 40);
        text(g, `focal length ${fmt(foU)} cm`, 330, 320, PAL.cyan, 12);
        if (resolving && A.rt > 0.8) glow(g, attempt!.ok ? PAL.green : PAL.red, 12, () => text(g, attempt!.ok ? 'PERFECT FIT' : 'DOES NOT FIT', 330, 36, attempt!.ok ? PAL.green : PAL.red, 16));
      });
    }

    A.mountAll();
    return A.run();
  },
});
