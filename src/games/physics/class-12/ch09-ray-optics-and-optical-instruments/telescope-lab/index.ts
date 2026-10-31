// Inspirations: sniper-scope reticles (Duck Hunt, shooters: bring the far target to fill the ring), Pokémon Snap (fit the subject
// to the frame, here the film plate) and Fallout lockpicking (two dials, warmer or colder).
import { createArcade, PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { helperOn, paidFlash } from '@core/aidflash';
import { fmt } from '@core/judge';
import { glow, line, orb, text } from '@core/neon';
import { CASS, cameraScreen, cassInset, flyingPhoto, journal, nightSky, outerScope, planetColor, roof, sensorChip, sensorX, stella, type StellaState } from './art';
import { D, MISS_BLUR, PLATE_MISS, SCOPE_MISS_BLUR, SCOPE_MISS_RADIUS, SLIDERS, blurPx, buildGame, cassIntel, eyeSees, explainRound, judgeCass, judgeNear, judgePlate, judgeZoom, lRange, missText, plateSide, plateSize, resultLine, scopeMiss, view, viewReading, type NearRound, type PlateRound, type ZoomRound } from './logic';

const W = 640;
const H = 340;
/** How long the round's goal line stays on the canvas, in seconds (it fades over the last half second). */
export const GOAL_SECONDS = 3.5;
/** The one-line goal at the start of a round (levels 1 to 3). */
const goalLine = (g: CanvasRenderingContext2D, s: string, x: number, y: number, age: number) => {
  if (age >= GOAL_SECONDS) return;
  g.save();
  g.globalAlpha = Math.min(1, (GOAL_SECONDS - age) / 0.5);
  text(g, s, x, y, PAL.white, 12);
  g.restore();
};

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
      const flash = paidFlash();
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
          flash.paid();
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
        const marker = isNear ? '' : r.assist === 0 ? ', and the zoom marks where the eyepiece focus is' : r.assist === 1 ? ', with the zoom’s focus marker' : '';
        A.hint.textContent = `Objective f = ${fmt(r.fo)} cm. Make the target fill the ring: ${fmt(r.M)}×, final image ${isNear ? `at the near point (${D} cm)` : 'at infinity'}. ${r.assist === 0 ? `The scope view is live${marker}.` : r.assist === 1 ? `The scope view shows for a moment after a test shot${marker}.` : 'The scope view is off: work it out.'}`;
      };
      let seenRound = -1;
      let roundT0 = 0;
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        if (ri() !== seenRound) {
          seenRound = ri();
          roundT0 = t;
        }
        const resolving = A.phase === 'resolve' && attempt !== null;
        const feU = resolving ? attempt!.fe : fe;
        const LU = resolving ? attempt!.L : L;
        const w = view(r.fo, feU, LU);
        text(g, `TELESCOPE: objective f = ${fmt(r.fo)} cm`, 190, 24, PAL.cyan, 12);
        if (A.phase === 'play') goalLine(g, `Goal: fill the ring with ${fmt(r.M)}×`, 190, 42, t - roundT0);
        // the schematic: a big objective, a long tube, a small eyepiece
        lensShape(g, 50, 85, 40, PAL.cyan);
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(50, 60, 280, 50);
        line(g, 50, 60, 330, 60, PAL.dim, 2);
        line(g, 50, 110, 330, 110, PAL.dim, 2);
        lensShape(g, 330, 85, 22, PAL.pink);
        text(g, 'objective', 50, 138, PAL.dim, 11);
        text(g, 'eyepiece', 330, 138, PAL.dim, 11);
        // the zoomed inset: where the eyepiece stands relative to the objective's focus
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(14, 160, 480, 150);
        g.strokeStyle = PAL.cyan;
        g.lineWidth = 2;
        g.strokeRect(14, 160, 480, 150);
        text(g, 'ZOOM ON THE EYEPIECE END (not to the same scale)', 254, 173, PAL.cyan, 11);
        const AXY = 235;
        line(g, 14, AXY, 494, AXY, PAL.dim, 1.2, [6, 6]);
        const xF = insetX(0);
        const xE = insetX(LU - r.fo);
        line(g, xF, AXY - 40, xF, AXY + 40, PAL.yellow, 2, [4, 4]);
        text(g, 'objective’s focus (first image)', xF, AXY + 58, PAL.yellow, 11);
        if (xE > 20 && xE < 490) lensShape(g, xE, AXY, 44, PAL.pink);
        // The player's own tube length, with its unit, beside the eyepiece handle (their own setting, never the answer).
        if (xE > 20 && xE < 490) text(g, `tube L = ${fmt(LU)} cm`, Math.max(70, Math.min(430, xE)), AXY - 47, PAL.pink, 11);
        // The helper is on in round 1, for a moment after a paid check in round 2, never in round 3, and after a shot only on a win. A miss shows
        // the fixed category effect below instead. In level 1 it includes the eyepiece's own focus against the objective's focus in this zoom (and the
        // green "focus meets focus" note): that alignment IS the answer, so it is part of the helper and nowhere else.
        const since = flash.since(A.clock, ri());
        const helper = resolving ? attempt!.ok : helperOn(r.assist, false, since);
        const xFe = xE - feU * scIn;
        // Level 3 (near point) keeps the tick always: there, focus against focus is not the answer (the image is at 25 cm, not at infinity).
        if ((isNear || helper) && xFe > 18) {
          line(g, xFe, AXY - 7, xFe, AXY + 7, PAL.pink, 2);
          text(g, 'eyepiece focus', xFe, AXY - 14, PAL.pink, 11);
        }
        if (helper && !isNear) {
          const aligned = Math.abs(xFe - xF) < 4;
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
        text(g, `ring = ${fmt(r.M)}×`, cx - 78, cy + 98, PAL.yellow, 11, 'left');
        // a missed shot: the target at a fixed size for its category (over, under, about right) and a fixed blur, never the player's own scale
        const miss = resolving && !attempt!.ok ? scopeMiss(r, feU, LU) : null;
        if (helper || miss) {
          if (w.M === null || miss?.none) text(g, 'no picture', cx, cy + 4, PAL.red, 12);
          else {
            const sharp = miss ? !miss.blurred : eyeSees(w.v!);
            const rad = miss ? SCOPE_MISS_RADIUS[miss.size] : Math.min(76, (ringR * w.M) / r.M);
            const blur = miss ? (miss.blurred ? SCOPE_MISS_BLUR : 0) : sharp ? 0 : Math.min(18, (D - w.v!) * 0.7);
            g.save();
            g.beginPath();
            g.arc(cx, cy, 77, 0, Math.PI * 2);
            g.clip();
            g.shadowColor = PAL.pink;
            g.shadowBlur = blur;
            g.globalAlpha = Math.max(0.3, 1 - blur / 24);
            orb(g, cx, cy, Math.max(4, rad), PAL.pink, t, resolving ? (attempt!.ok ? 'cheer' : 'worried') : 'happy');
            g.restore();
            if (!miss) text(g, `${fmt(w.M)}×${sharp ? '' : ' (blurred)'}`, cx - 78, cy + 112, sharp ? PAL.green : PAL.red, 11, 'left');
            else if (miss.blurred) text(g, 'blurred', cx - 78, cy + 112, PAL.red, 11, 'left');
          }
        } else text(g, '?', cx, cy + 12, PAL.dim, 40);
        // the eyepiece-focal-length dial
        line(g, 612, 170, 612, 300, PAL.dim, 4);
        text(g, `${SLIDERS.fe.max}`, 612, 164, PAL.dim, 11);
        text(g, `${SLIDERS.fe.min}`, 612, 318, PAL.dim, 11);
        text(g, 'f_e', 612, 150, PAL.pink, 11);
        // The player's own eyepiece focal length with its unit, beside its handle.
        const kY = 300 - ((feU - SLIDERS.fe.min) / (SLIDERS.fe.max - SLIDERS.fe.min)) * 130;
        text(g, `${fmt(feU)} cm`, 588, kY + 4, PAL.pink, 11, 'right');
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
      let seenPlate = -1;
      let plateT0 = 0;
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        if (ri() !== seenPlate) {
          seenPlate = ri();
          plateT0 = t;
        }
        if (A.phase === 'play') goalLine(g, `Goal: make the image fill the ${fmt(r.plate)} cm plate`, 330, 36, t - plateT0);
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
          // a missed exposure draws the image at a fixed multiple of the plate (over or under), never to the player's own scale
          const missed = resolving && !attempt!.ok;
          const imgR = missed ? plateR * PLATE_MISS[plateSide(r, foU)] : (size * pxCm) / 2;
          const ok = !missed && Math.abs(imgR - plateR) < 3;
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

    // ================= level 4: Planet night (a Cassegrain telescope on a rooftop observatory) ==========================
    if (game.kind === 'cass') {
      const rounds = game.rounds;
      const S = SLIDERS.cass;
      let x: number = S.start;
      let attempt: { ok: boolean; x: number } | null = null;
      let test: { x: number; until: number } | null = null;
      let wowShown = false;
      let pinned = false;
      const slider = A.slider({ aria: 'Camera sensor distance from the small mirror in millimetres', label: 'Sensor behind the small mirror', min: S.min, max: S.max, step: S.step, value: x, unit: 'mm', onInput: (v) => (x = v) });
      A.handle({ x: () => sensorX(x), y: () => CASS.AXY, r: 22, drag: (px) => slider.set((CASS.XS - px) / CASS.SC) });
      A.controls.append(
        slider.row,
        A.button('📷 Test exposure', 'Test exposure: show the camera screen for a moment with the sensor here', () => {
          if (!A.spend()) return;
          test = { x, until: A.clock + 1.5 };
          A.say(`Test exposure with the sensor at ${x} mm: watch the camera screen.`, true);
        }, 'secondary'),
        A.button('📸 Expose', 'Expose the photograph with the sensor here', () => {
          const r = rounds[ri()];
          const j = judgeCass(r, x);
          attempt = { ok: j.ok, x };
          wowShown = false;
          pinned = false;
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[0]}` : missText(game, ri(), { x }), { x: 565, y: 72 }, 1.5);
        }),
      );
      onRound = (i) => {
        x = S.start;
        slider.set(x);
        test = null;
        attempt = null;
        wowShown = false;
        pinned = false;
        clearSay();
        const r = rounds[i];
        A.hint.textContent = `${cassIntel(r)} ${r.assist === 0 ? 'The camera screen is live: you can watch the sharpness change.' : r.assist === 1 ? 'The screen is dark until a test exposure shows it for a moment.' : 'The screen stays dark until you expose: work it out.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const resolving = A.phase === 'resolve' && attempt !== null;
        const rt = A.rt;
        const shown = resolving ? attempt!.x : x;
        const ok = resolving ? attempt!.ok : null;
        // the sky, the roof, the telescope and Stella
        nightSky(g, t, r.planet);
        roof(g, t);
        text(g, `PLANET NIGHT: ${r.planet}`, 110, 24, PAL.white, 12);
        outerScope(g, t, 165, 250);
        const cyc = t % 8;
        const st: StellaState = { mood: 'happy', rub: 0, sip: !resolving && cyc < 1.6 ? Math.sin((Math.PI * cyc) / 1.6) : 0, look: t % 9 < 2.5 ? 'sky' : 'screen' };
        if (resolving && rt > 1.5) {
          st.mood = ok ? 'wow' : 'worried';
          if (!ok && rt > 1.7 && rt < 2.25) st.rub = 1;
          if (ok && !wowShown) {
            wowShown = true;
            A.float('WOW!', 62, 170, PAL.yellow);
          }
        }
        const completed = A.round + (A.phase === 'won' ? 1 : 0);
        stella(g, 62, 298, t, st);
        journal(g, 108, 274, rounds.slice(0, Math.min(3, completed)).map((q) => q.planet), t);
        // the cross-section
        const focus = resolving && ok === true && rt > 0.5;
        cassInset(g, t, sensorX(shown), focus ? 'focus' : 'idle', Math.min(1, rt - 0.5));
        sensorChip(g, sensorX(shown), t, resolving && rt > 1.5 ? ok : null);
        text(g, `sensor: ${shown} mm`, sensorX(shown), CASS.AXY + 48, PAL.green, 10);
        if (A.phase === 'play') text(g, 'drag the sensor', sensorX(shown), CASS.AXY - 42, PAL.dim, 9);
        // the camera screen
        let blur: number | null = null;
        let label = r.assist === 1 ? 'test exposure to look' : 'dark until Expose';
        let tag = '';
        let develop = 1;
        let shutter = 0;
        if (resolving) {
          shutter = rt < 0.5 ? Math.sin((Math.PI * rt) / 0.5) : 0;
          develop = Math.max(0, Math.min(1, (rt - 0.5) / 1.0));
          blur = rt < 0.5 ? null : attempt!.ok ? 0 : MISS_BLUR;
          label = '';
        } else if (r.assist === 0 && A.phase === 'play') {
          blur = blurPx(x, r.v);
          tag = 'LIVE';
        } else if (test && A.phase === 'play' && A.clock < test.until) {
          blur = blurPx(test.x, r.v);
          tag = 'TEST';
        }
        cameraScreen(g, 565, 72, t, { planet: r.planet, blur, develop, shutter, ok: resolving && rt > 1.5 ? ok : null, label, stamp: resolving && !attempt!.ok && rt > 1.55 });
        if (tag) text(g, tag, 565, 146, PAL.yellow, 10);
        else text(g, r.planet, 565, 146, planetColor(r.planet), 10);
        if (resolving && ok && rt > 1.55) {
          flyingPhoto(g, r.planet, [565, 72], [108, 262], Math.min(1, (rt - 1.55) / 0.7));
          if (rt > 2.25 && !pinned) {
            pinned = true;
            A.burst(108, 262, PAL.yellow, 24, 140);
          }
        }
      });
    }

    A.mountAll();
    return A.run();
  },
});
