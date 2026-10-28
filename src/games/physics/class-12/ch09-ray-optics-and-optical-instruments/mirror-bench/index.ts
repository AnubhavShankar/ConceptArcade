import { defineGame } from '@core/define';
import { label } from '@core/draw';
import { createLab } from '@core/labkit';
import { fmt, sgn } from '@core/judge';
import { startLoop } from '@core/sim';
import { AX, arrow, drawBench, drawRays, type Bench } from './scene';
import { buildLevel, explainSolution, judgeFocus, judgePin, judgeShave, judgeSpot, shaveResult } from './logic';

const W = 640;
const H = 300;
const ease = (t: number) => t * t * (3 - 2 * t);

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const lab = createLab(ctx, lvl.hero, { W, H, aria: 'An optical bench with a mirror, an object and the rays that form its image.', free: lvl.freeTests });
    const { g, col } = lab;

    // what the player last tried (the apparatus runs on it)
    let tryA: number | null = null;
    let started = false;

    const go = (text: string, run: () => void) => lab.button(text, text, () => {
      if (lab.finished || lab.busy()) return;
      run();
    });
    const positive = (v: number | null, what: string) => {
      if (v === null || v <= 0) {
        lab.freeNote(`Enter ${what} as a positive number of cm.`);
        return false;
      }
      return true;
    };
    const signedOk = (v: number | null) => {
      if (v === null || v === 0) {
        lab.freeNote('Enter the image height in cm, with a minus sign if the image is upside down.');
        return false;
      }
      return true;
    };

    if (lvl.kind === 'focus') {
      const sIn = lab.field('Screen distance from the mirror in cm', 's = ? cm');
      const hIn = lab.field('Image height in cm, negative if upside down', 'h = ? cm');
      lab.controls.append(
        lab.row('Screen distance', sIn, 'cm'),
        lab.row('Image height', hIn, 'cm'),
        go('Set the screen', () => {
          const s = lab.num(sIn);
          const hh = lab.num(hIn);
          if (!positive(s, 'the screen distance') || !signedOk(hh)) return;
          tryA = s;
          started = true;
          const r = judgeFocus(lvl, s!, hh!);
          lab.verdict(r.ok);
          if (r.ok) return lab.succeed(`Sharp! Flicker’s image is ${fmt(Math.abs(lvl.imgH))} cm tall and upside down, ${fmt(lvl.screen)} cm from the mirror.`, explainSolution(lvl));
          const parts: string[] = [];
          if (!r.sOk) parts.push('The rays cross somewhere else, so the flame looks blurred on the screen.');
          if (!r.hOk) parts.push('The image height is not right: it is the magnification times the flame’s height, with a minus sign when it is upside down.');
          lab.miss(parts.join(' '));
        }),
      );
      lab.hint.textContent = `Concave mirror, f = −${lvl.F} cm in the Cartesian convention; flame ${lvl.objH} cm tall, u = −${lvl.d} cm. Use 1/v + 1/u = 1/f and m = −v/u.`;
    }
    if (lvl.kind === 'pin') {
      const pIn = lab.field('Pin distance behind the mirror in cm', 'p = ? cm');
      const hIn = lab.field('Image height in cm, negative if upside down', 'h = ? cm');
      lab.controls.append(
        lab.row('Pin behind the mirror', pIn, 'cm'),
        lab.row('Image height', hIn, 'cm'),
        go('Push the pin in', () => {
          const p = lab.num(pIn);
          const hh = lab.num(hIn);
          if (!positive(p, 'the pin distance') || !signedOk(hh)) return;
          tryA = p;
          started = true;
          const r = judgePin(lvl, p!, hh!);
          lab.verdict(r.ok);
          if (r.ok) return lab.succeed(`The pin tip touches the image tip: ${fmt(lvl.behind)} cm behind the mirror, ${fmt(lvl.imgH)} cm tall, upright.`, explainSolution(lvl));
          const parts: string[] = [];
          if (!r.pOk) parts.push('There is a gap between the pin tip and the image tip.');
          if (!r.hOk) parts.push('The image height is not right: it is the magnification times the object’s height, positive when upright.');
          lab.miss(parts.join(' '));
        }),
      );
      lab.hint.textContent = `Convex mirror, f = +${lvl.F} cm; Dash is ${lvl.objH} cm tall at u = −${lvl.d} cm. Enter how far behind the mirror the image is.`;
    }
    if (lvl.kind === 'shave') {
      const dIn = lab.field('Distance from the mirror in cm', 'd = ? cm');
      lab.controls.append(
        lab.row('Hold her face at', dIn, 'cm'),
        go('Hold the face there', () => {
          const d = lab.num(dIn);
          if (!positive(d, 'the distance')) return;
          tryA = d;
          started = true;
          const r = judgeShave(lvl, d!);
          lab.verdict(r.ok);
          if (r.ok) return lab.succeed(`Upright and ${lvl.want} times as large, at ${fmt(lvl.d)} cm.`, explainSolution(lvl));
          if (r.m === null) return lab.miss('At the focus the reflected rays leave parallel, so no image forms at all.');
          if (r.real) return lab.miss(`At that distance the image is real and upside down, ${fmt(Math.abs(r.m))} times the size of her face.`);
          lab.miss(`At that distance she sees an upright image ${fmt(r.m)} times the size of her face.`);
        }),
      );
      lab.hint.textContent = `Concave mirror, f = −${lvl.F} cm. For an object at distance d in front of the mirror, m = f/(f − u) with u = −d.`;
    }
    if (lvl.kind === 'spot') {
      const sIn = lab.field('Detector position on the wall in cm', 'x = ? cm');
      lab.controls.append(
        lab.row('Detector, from the centre mark', sIn, 'cm'),
        go('Turn the mirror', () => {
          const s = lab.num(sIn);
          if (!positive(s, 'the detector position')) return;
          tryA = s;
          started = true;
          const r = judgeSpot(lvl, s!);
          lab.verdict(r.ok);
          if (r.ok) return lab.succeed(`The spot lands on the detector, ${fmt(lvl.shift)} cm from the centre mark.`, explainSolution(lvl));
          lab.miss('The spot lands beside the detector, not on it.');
        }),
      );
      lab.hint.textContent = `The wall is ${lvl.L} cm from the mirror and the mirror turns by ${lvl.theta}°. Give the position in cm above the centre mark.`;
    }

    // ---- drawing --------------------------------------------------------------------------------
    function drawScene() {
      const p = ease(lab.progress);
      if (lvl.kind === 'focus') {
        const sc = 560 / 108;
        const x0 = 40;
        const b: Bench = { x0, sc, vs: 7, concave: true, F: lvl.F, d: lvl.d, objH: lvl.objH };
        drawBench(g, col, b, W);
        const park = 108;
        const target = tryA ?? park;
        const sCur = started ? park + (target - park) * p : park;
        const xs = x0 + sCur * sc;
        g.strokeStyle = col.muted;
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(xs, AX - 115);
        g.lineTo(xs, AX + 115);
        g.stroke();
        label(g, 'screen', xs, AX + 135, { size: 11, color: col.muted });
        if (started) {
          drawRays(g, col, b, W, Math.min(1, p * 2), col.muted);
          const blur = Math.abs(sCur - lvl.screen) * sc * 0.12;
          const hi = lvl.imgH * 7;
          g.save();
          g.shadowColor = col.accent;
          g.shadowBlur = Math.min(24, blur);
          g.globalAlpha = Math.max(0.3, 1 - blur / 16) * Math.min(1, p * 3);
          arrow(g, xs, Math.max(-130, Math.min(130, hi)), col.accent, 5);
          g.restore();
        }
      } else if (lvl.kind === 'pin') {
        const sc = 7.5;
        const x0 = 150;
        const b: Bench = { x0, sc, vs: 8, concave: false, F: lvl.F, d: lvl.d, objH: lvl.objH };
        drawBench(g, col, b, W);
        if (started) {
          drawRays(g, col, b, W, Math.min(1, p * 2), col.muted);
          const pin = (tryA ?? 0) * p;
          const x = x0 - pin * sc;
          g.strokeStyle = col.bad;
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(x, AX);
          g.lineTo(x, AX - lvl.imgH * 8);
          g.stroke();
          label(g, 'pin', x, AX + 56, { size: 11, color: col.bad });
        }
      } else if (lvl.kind === 'shave') {
        const x0 = 170;
        const sc = 440 / (3 * lvl.F);
        const park = 2.5 * lvl.F;
        const target = Math.min(3 * lvl.F, tryA ?? park);
        const dCur = started ? park + (target - park) * p : park;
        const b: Bench = { x0, sc, vs: 3, concave: true, F: lvl.F, d: dCur, objH: 6 };
        drawBench(g, col, b, W);
        if (started) {
          drawRays(g, col, b, W, Math.min(1, p * 2), col.good);
          if ((tryA ?? 0) > 3 * lvl.F) label(g, 'beyond the edge of the bench', 320, 28, { size: 11, color: col.muted });
        }
        const r = started ? shaveResult(lvl.F, dCur) : null;
        if (r && r.m !== null) label(g, `${r.real ? 'real, inverted' : 'upright'}  m = ${sgn(r.m)}`, 440, 28, { size: 13, color: col.text });
      } else {
        // top view of the galvanometer mirror and the wall; vertical shifts are scaled, angles exaggerated
        const xm = 90;
        const xw = 560;
        const ps = 100 / 25;
        const tilt = started ? (lvl.theta * 4 * p * Math.PI) / 180 : 0;
        const spotY = AX - lvl.shift * ps * p;
        g.strokeStyle = col.muted;
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(xw, 20);
        g.lineTo(xw, H - 20);
        g.stroke();
        for (let y = 0; y <= 25; y += 5) {
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(xw - 8, AX - y * ps);
          g.lineTo(xw, AX - y * ps);
          g.stroke();
          label(g, `${y}`, xw + 20, AX - y * ps + 4, { size: 10, color: col.muted });
        }
        label(g, 'centre mark (0)', xw - 55, AX + 20, { size: 11, color: col.muted });
        // the light: from the centre mark, to the mirror, and back to the spot
        g.strokeStyle = col.accent;
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(xw, AX);
        g.lineTo(xm, AX);
        g.stroke();
        if (started) {
          g.globalAlpha = Math.min(1, p * 3);
          g.beginPath();
          g.moveTo(xm, AX);
          g.lineTo(xw, spotY);
          g.stroke();
          g.globalAlpha = 1;
        }
        g.save();
        g.translate(xm, AX);
        g.rotate(tilt);
        g.strokeStyle = col.text;
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(0, -45);
        g.lineTo(0, 45);
        g.stroke();
        g.restore();
        label(g, started ? `mirror turned ${lvl.theta}° (drawn larger)` : 'mirror, facing the light', xm + 20, 40, { size: 11, color: col.muted, align: 'left' });
        // the detector the player placed
        const dy = Math.max(-120, Math.min(120, (tryA ?? 0) * ps));
        if (tryA !== null) {
          g.strokeStyle = lab.ok && lab.progress >= 1 ? col.good : col.bad;
          g.lineWidth = 3;
          g.strokeRect(xw - 16, AX - dy - 9, 32, 18);
          label(g, 'detector', xw - 60, AX - dy + 4, { size: 11, color: col.muted });
        }
        if (started) {
          g.fillStyle = col.accent;
          g.beginPath();
          g.arc(xw, spotY, 6, 0, Math.PI * 2);
          g.fill();
        }
      }
    }

    lab.mountAll();
    return startLoop((dt) => {
      lab.tick(dt);
      g.clearRect(0, 0, W, H);
      drawScene();
      if (lab.ok && lab.progress >= 1 && started) label(g, lvl.kind === 'focus' ? 'sharp image' : lvl.kind === 'pin' ? 'pin on the image' : lvl.kind === 'shave' ? 'upright, as wanted' : 'spot on the detector', 320, 288, { size: 14, color: col.good });
      lab.endFrame();
    });
  },
});
