// Inspirations: Pokémon Snap (get the creature big and in focus for the photo) and Fallout lockpicking (two dials, warmer or colder).
import { createArcade, PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { helperOn, paidFlash } from '@core/aidflash';
import { fmt } from '@core/judge';
import { glow, line, text } from '@core/neon';
import { bug, eye, lensIcon, meter } from './art';
import { D, SLIDERS, buildGame, compound, eyeSees, explainRound, judgeMag, judgeScope, magRange, magReading, magnifier, missText, resultLine, scopeReading } from './logic';

const W = 640;
const H = 340;

export default defineGame({
  mount(ctx) {
    const game = buildGame(ctx.level, ctx.random);
    let onRound: (i: number) => void = () => undefined;
    const A = createArcade(ctx, game.hero, { W, H, aria: 'An arcade screen with a lens, a tiny creature and an eye view of how big and sharp it looks.', rounds: 3, charges: game.charges, onRound: (i) => onRound(i) });
    const clearSay = () => {
      A.feedback.hidden = true;
    };
    const ri = () => Math.min(A.round, 2);
    const flash = paidFlash();
    const flashOver = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rt: number, from: number) => {
      if (rt >= from && rt < from + 0.35) {
        g.fillStyle = '#fff';
        g.globalAlpha = 0.85 * (1 - (rt - from) / 0.35);
        g.fillRect(x, y, w, h);
        g.globalAlpha = 1;
      }
    };

    // ================= level 1: bug safari (a Pokémon Snap-style photo) ==================================
    if (game.kind === 'mag') {
      const rounds = game.rounds;
      const lensX = 300;
      const AX = 190;
      const scFor = () => 230 / rounds[ri()].f;
      let u = 3;
      let attempt: { ok: boolean; u: number } | null = null;
      const range0 = magRange(rounds[0].f);
      const slider = A.slider({ aria: 'Distance of Mite from the lens in centimetres', label: 'Mite is', min: range0.min, max: range0.max, step: SLIDERS.mag.step, value: u, unit: 'cm from the lens', onInput: (v) => (u = v) });
      A.handle({ x: () => lensX - u * scFor(), y: () => AX - 20, r: 26, drag: (px) => slider.set((lensX - px) / scFor()) });
      A.controls.append(
        slider.row,
        A.button('🔦 Test shot', 'Test shot: measure the picture at this distance', () => {
          if (!A.spend()) return;
          flash.paid();
          A.say(magReading(rounds[ri()].f, u), true);
        }, 'secondary'),
        A.button('📸 Snap!', 'Take the photo at this distance', () => {
          const r = rounds[ri()];
          const j = judgeMag(r, u);
          attempt = { ok: j.ok, u };
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[0]}` : missText(game, ri(), { u }), { x: 520, y: 170 }, 0.6);
        }),
      );
      onRound = (i) => {
        const rg = magRange(rounds[i].f);
        slider.range(rg.min, rg.max);
        u = Math.round(rounds[i].f * 0.4 * 10) / 10;
        slider.set(u);
        attempt = null;
        clearSay();
        const r = rounds[i];
        A.hint.textContent = `Magnifying glass: f = ${r.f} cm. Your eye focuses on images from ${D} cm to infinity. ${r.assist === 0 ? 'The eye view is live.' : r.assist === 1 ? 'The eye view shows for a moment after a test shot.' : 'The eye view is off: work it out.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const sc = scFor();
        const resolving = A.phase === 'resolve' && attempt !== null;
        const uu = resolving ? attempt!.u : u;
        const o = magnifier(r.f, uu);
        // round 1 live, round 2 for a moment after a test shot, round 3 never; a win shows it, a miss does not
        const won = resolving && attempt!.ok;
        const live = helperOn(r.assist, won, flash.since(A.clock, ri()));
        line(g, 10, AX, 400, AX, PAL.dim, 1.2, [6, 6]);
        lensIcon(g, lensX, AX, 70);
        text(g, `f = ${r.f} cm`, lensX, AX + 92, PAL.cyan, 11);
        const fx = lensX - r.f * sc;
        line(g, fx, AX - 5, fx, AX + 5, PAL.dim, 2);
        text(g, 'F', fx, AX + 20, PAL.dim, 11);
        bug(g, lensX - uu * sc, AX, 11, t, resolving ? (attempt!.ok ? 'cheer' : 'worried') : 'happy');
        eye(g, 372, AX - 10, t, resolving && !attempt!.ok ? 'worried' : 'happy');
        // the virtual image, drawn if it fits on the bench
        if (o.kind === 'virtual') {
          const ix = lensX - o.v * sc;
          if (ix > 14 && live) {
            g.globalAlpha = 0.55;
            bug(g, ix, AX, Math.min(40, 11 * o.m), t, 'happy');
            g.globalAlpha = 1;
            text(g, 'image', ix, AX + 18, PAL.dim, 10);
          } else if (live) text(g, `image ${fmt(o.v)} cm away ←`, 150, 60, PAL.dim, 11);
        }
        // the eye view: a photo frame
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.fillRect(430, 40, 200, 250);
        const sharp = o.kind === 'virtual' ? eyeSees(o.v) : o.kind === 'infinity';
        const good = resolving ? attempt!.ok : sharp;
        g.strokeStyle = resolving ? (attempt!.ok ? PAL.green : PAL.red) : PAL.cyan;
        g.lineWidth = 3;
        g.strokeRect(430, 40, 200, 250);
        text(g, 'EYE VIEW', 530, 34, PAL.cyan, 11);
        if (o.kind === 'real') {
          if (live || resolving) text(g, 'no virtual image', 530, 170, PAL.red, 13);
        } else if (live) {
          const m = o.kind === 'virtual' ? o.M : 1;
          const rad = Math.min(92, 11 * m);
          const blur = sharp ? 0 : Math.min(20, (D - (o.kind === 'virtual' ? o.v : D)) * 0.9);
          g.save();
          g.beginPath();
          g.rect(431, 41, 198, 248);
          g.clip();
          g.shadowColor = PAL.green;
          g.shadowBlur = blur;
          g.globalAlpha = Math.max(0.35, 1 - blur / 26);
          bug(g, 530, 160 + rad, rad, t, good ? 'cheer' : 'worried');
          g.restore();
          text(g, o.kind === 'virtual' ? `${fmt(m)}× ${sharp ? 'sharp' : 'blurred: too near'}` : 'at infinity', 530, 276, sharp ? PAL.green : PAL.red, 12);
        } else if (resolving) {
          // a miss without the live view: fixed-size effects that show only the direction (too near: a big blur; too far: small and sharp)
          g.save();
          g.beginPath();
          g.rect(431, 41, 198, 248);
          g.clip();
          g.shadowColor = PAL.green;
          g.shadowBlur = sharp ? 0 : 14;
          g.globalAlpha = sharp ? 0.9 : 0.5;
          bug(g, 530, 160 + (sharp ? 28 : 70), sharp ? 28 : 70, t, 'worried');
          g.restore();
          text(g, sharp ? 'sharp, but small' : 'blurred: too near', 530, 276, PAL.red, 12);
        } else text(g, '?', 530, 190, PAL.dim, 44);
        if (resolving) flashOver(g, 430, 40, 200, 250, A.rt, 0.0);
        if (resolving && A.rt > 0.6) glow(g, attempt!.ok ? PAL.green : PAL.red, 12, () => text(g, attempt!.ok ? 'PERFECT SHOT' : 'BAD SHOT', 530, 316, attempt!.ok ? PAL.green : PAL.red, 15));
      });
    }

    // ================= level 2: cracking the microscope (Fallout-style two-dial lockpicking) ============
    if (game.kind === 'scope') {
      const rounds = game.rounds;
      const S = SLIDERS;
      const objX = 170;
      const sc = 18;
      const AX = 175;
      let uo: number = S.uo.start;
      let L: number = S.L.start;
      let attempt: { ok: boolean; uo: number; L: number } | null = null;
      const uSlider = A.slider({ aria: 'Distance of the speck from the objective in centimetres', label: 'Speck is', min: S.uo.min, max: S.uo.max, step: S.uo.step, value: uo, unit: 'cm from the objective', onInput: (v) => (uo = v) });
      const lSlider = A.slider({ aria: 'Tube length between the lenses in centimetres', label: 'Tube length', min: S.L.min, max: S.L.max, step: S.L.step, value: L, unit: 'cm between the lenses', onInput: (v) => (L = v) });
      A.handle({ x: () => objX - uo * sc, y: () => AX - 24, r: 24, drag: (px) => uSlider.set((objX - px) / sc) });
      A.handle({ x: () => objX + L * sc, y: () => AX - 78, r: 24, drag: (px) => lSlider.set((px - objX) / sc) });
      A.controls.append(
        uSlider.row,
        lSlider.row,
        A.button('🔦 Test shot', 'Test shot: measure the picture with these settings', () => {
          if (!A.spend()) return;
          flash.paid();
          A.say(scopeReading(rounds[ri()], uo, L), true);
        }, 'secondary'),
        A.button('🔓 Crack it!', 'Crack the lock with these settings', () => {
          const r = rounds[ri()];
          const j = judgeScope(r, uo, L);
          attempt = { ok: j.ok, uo, L };
          A.resolve(j.ok, j.ok ? `${resultLine(game, ri())} ${explainRound(game, ri())[1]}` : missText(game, ri(), { u: uo, L }), { x: objX + L * sc, y: AX }, 0.9);
        }),
      );
      onRound = (i) => {
        uo = S.uo.start;
        L = S.L.start;
        uSlider.set(uo);
        lSlider.set(L);
        attempt = null;
        clearSay();
        const r = rounds[i];
        A.hint.textContent = `Objective f = ${r.fo} cm, eyepiece f = ${r.fe} cm. Wanted: ${r.M}× with the final image at the near point (${D} cm). ${r.assist === 0 ? 'The readout and the signal bar are live.' : r.assist === 1 ? 'The readout and the signal bar show for a moment after a test shot.' : 'No readout, no signal: work it out.'}`;
      };
      A.scene((g, t) => {
        if (A.phase === 'between') return;
        const r = rounds[ri()];
        const resolving = A.phase === 'resolve' && attempt !== null;
        const uu = resolving ? attempt!.uo : uo;
        const LL = resolving ? attempt!.L : L;
        const c = compound(r.fo, r.fe, LL, uu);
        const live = helperOn(r.assist, resolving && attempt!.ok, flash.since(A.clock, ri()));
        const eyeX = objX + LL * sc;
        line(g, 10, AX, W - 10, AX, PAL.dim, 1.2, [6, 6]);
        // the tube
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(objX, AX - 56, LL * sc, 112);
        line(g, objX, AX - 56, eyeX, AX - 56, PAL.dim, 2);
        line(g, objX, AX + 56, eyeX, AX + 56, PAL.dim, 2);
        lensIcon(g, objX, AX, 50);
        lensIcon(g, eyeX, AX, 50, PAL.pink);
        text(g, `objective f = ${r.fo} cm`, objX, AX + 78, PAL.cyan, 11);
        text(g, `eyepiece f = ${r.fe} cm`, eyeX, AX + 78, PAL.pink, 11);
        bug(g, objX - uu * sc, AX, 9, t, resolving ? (attempt!.ok ? 'cheer' : 'worried') : 'happy');
        text(g, 'Spec', objX - uu * sc, AX + 16, PAL.white, 10);
        if (c.vo !== null && live) {
          const ix = objX + c.vo * sc;
          if (ix < W - 20) {
            g.globalAlpha = 0.8;
            bug(g, ix, AX, Math.min(34, 9 * (c.mo ?? 1)), t, 'happy', true);
            g.globalAlpha = 1;
            text(g, 'first image', ix, AX + 52, PAL.dim, 10);
          }
        }
        eye(g, Math.min(W - 40, eyeX + 62), AX - 6, t, resolving && !attempt!.ok ? 'worried' : 'happy');
        // the lock: how close are the dials? (a Fallout-style warm/cold bar)
        const closeness = Math.max(0, 1 - Math.hypot((uu - r.uSol) / 1.5, (LL - r.LSol) / 6));
        if (live) {
          text(g, 'LOCK SIGNAL', 90, 296, PAL.dim, 10);
          meter(g, 20, 302, 140, closeness, closeness > 0.93 ? PAL.green : closeness > 0.6 ? PAL.yellow : PAL.red);
        } else text(g, 'lock signal off', 90, 308, PAL.dim, 11);
        if (live) text(g, c.M !== null && c.ve !== null ? `final image ${Number.isFinite(c.ve) ? `${fmt(c.ve)} cm` : '∞'} · ${fmt(c.M)}×` : 'no clear picture', 400, 296, c.M !== null && c.ve !== null && eyeSees(c.ve) ? PAL.green : PAL.red, 13);
        text(g, `wanted ${r.M}×, image at ${D} cm`, 400, 316, PAL.yellow, 12);
        if (resolving && A.rt > 0.9) glow(g, attempt!.ok ? PAL.green : PAL.red, 12, () => text(g, attempt!.ok ? 'UNLOCKED' : 'LOCKED', 320, 40, attempt!.ok ? PAL.green : PAL.red, 18));
      });
    }

    A.mountAll();
    return A.run();
  },
});
