// Inspirations: Flappy Bird (squeeze through a gap and land exactly), Tetris (rotate the piece until it fits) and
// Pinball (set the flipper angle that sends the most through).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { helperOn, paidFlash } from '@core/aidflash';
import { fmt } from '@core/judge';
import { glow, line, orb, text, waveColor } from '@core/neon';
import { SLIDERS, asinD, cosD, judgeMiddle, judgeShade, judgeSlit, middleExplain, middleMiss, middlePolaroid, middleReading, middleRounds, shadeExplain, shadeMiss, shadeReading, shadeRounds, slitExplain, slitIntensity, slitMiss, slitReading, slitRounds, twoPolaroids, type MiddleRound, type ShadeRound, type SlitRound } from './logic';

const RAD = Math.PI / 180;

function slitLevel(random: () => number): DialLevel<SlitRound> {
  const AX = 170;
  const BX = 240;
  const WX = 480;
  const DPX = WX - BX;
  const yAt = (deg: number) => AX - DPX * Math.tan(deg * RAD);
  const flash = paidFlash();
  return {
    hero: {
      name: 'Flap',
      role: 'a ray of light squeezing through a gap',
      story: 'Flap passes through one narrow gap and spreads out on the wall into a bright centre with dark bands either side. A dark band is where the light from the two halves of the gap cancels, at a sin θ = nλ. How wide the gap is decides how far out the dark bands fall.',
      objective: 'Set the gap width so the stated dark band lands exactly on the target, in three rounds. A test shot costs a charge; the live pattern fades.',
    },
    rounds: slitRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'a', aria: 'Width of the slit in nanometres', label: 'Gap width', unit: 'nm', step: SLIDERS.a.step, min: SLIDERS.a.min, max: SLIDERS.a.max, start: 1500 }],
    handles: [{ dial: 'a', at: (_r, v) => [BX, AX - Math.max(3, v.a * 0.01) / 2], drag: (_r, _px, py) => 2 * (AX - py) * 100, radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: measure where the dark band falls', read: (r, v) => (flash.paid(), slitReading(r, v.a)) },
    fire: { button: '🐦 Flap!', aria: 'Send the light through this gap' },
    judge: (r, v) => judgeSlit(r, v.a),
    miss: (r, v) => slitMiss(r, v.a),
    win: (r) => `${slitExplain(r)[0]} ${slitExplain(r)[1]}`,
    hint: (r) => `Wavelength ${r.lam} nm. Target: dark band number ${r.n}, ${r.theta}° from the straight-on direction. ${r.assist === 0 ? 'The pattern is drawn live.' : r.assist === 1 ? 'The pattern shows for a moment after a test shot.' : 'The pattern is hidden: work it out.'}`,
    hit: (r) => [WX + 20, yAt(r.theta)],
    delay: 1.2,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      const col = (al: number) => waveColor(r.lam, al);
      orb(g, 50, AX, 14, col(1), t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 64, AX, BX, AX, col(0.6), 3);
      // the barrier with its gap
      const gap = Math.max(3, v.a * 0.01);
      g.fillStyle = PAL.dim;
      g.fillRect(BX - 4, 30, 8, AX - gap / 2 - 30);
      g.fillRect(BX - 4, AX + gap / 2, 8, 310 - AX - gap / 2);
      text(g, `${fmt(v.a)} nm`, BX, 24, PAL.white, 12);
      // the wall pattern
      // the true pattern and the player's own dark band: live in round 1, for a moment after a test shot in round 2, never in round 3; a win shows them, a miss does not
      const live = helperOn(r.assist, !!shot?.ok, flash.since(A.clock, k));
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(WX, 20, 40, 300);
      if (live) {
        for (let y = 20; y < 320; y += 2) {
          const deg = Math.atan((AX - y) / DPX) / RAD;
          g.fillStyle = col(Math.min(1, slitIntensity(v.a, r.lam, deg) * 1.2));
          g.fillRect(WX, y, 40, 2);
        }
      } else text(g, '?', WX + 20, AX + 12, PAL.dim, 40);
      g.strokeStyle = PAL.dim;
      g.lineWidth = 2;
      g.strokeRect(WX, 20, 40, 300);
      for (const s of [1, -1]) {
        const y = yAt(s * r.theta);
        glow(g, PAL.yellow, 10, () => {
          g.strokeStyle = PAL.yellow;
          g.lineWidth = 3;
          g.beginPath();
          g.arc(WX + 20, y, 13, 0, Math.PI * 2);
          g.stroke();
        });
      }
      text(g, `dark band ${r.n} here`, WX - 8, yAt(r.theta) + 4, PAL.yellow, 11, 'right');
      if (shot) {
        const exists = r.n * r.lam <= shot.v.a;
        const d = asinD(Math.min(1, (r.n * r.lam) / shot.v.a));
        // without the live pattern a miss marks the band at a fixed offset on the correct side of the target: 10 px beyond it (too narrow) or 28 px inside it (too wide)
        const y = live ? yAt(d) : d > r.theta ? yAt(r.theta) - 10 : yAt(r.theta) + 28;
        if (exists && y > 20) {
          glow(g, shot.ok ? PAL.green : PAL.red, 10, () => {
            g.fillStyle = shot.ok ? PAL.green : PAL.red;
            g.beginPath();
            g.arc(WX + 20, y, 6, 0, Math.PI * 2);
            g.fill();
          });
        }
        if (rt > 1.2) glow(g, shot.ok ? PAL.green : PAL.red, 12, () => text(g, shot.ok ? 'THROUGH THE GAP' : 'CRASHED', 320, 30, shot.ok ? PAL.green : PAL.red, 17));
      }
    },
  };
}

/** Draw a polaroid disc at (x, y) with its pass axis at `deg` from the vertical. */
function polaroid(g: CanvasRenderingContext2D, x: number, y: number, deg: number, color: string, label: string) {
  glow(g, color, 8, () => {
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, 42, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  });
  g.save();
  g.beginPath();
  g.arc(x, y, 40, 0, Math.PI * 2);
  g.clip();
  g.strokeStyle = color;
  g.globalAlpha = 0.5;
  g.lineWidth = 1.5;
  for (let k = -6; k <= 6; k++) {
    const ox = k * 7 * Math.cos(deg * RAD);
    const oy = k * 7 * Math.sin(deg * RAD);
    g.beginPath();
    g.moveTo(x + ox - 60 * Math.sin(deg * RAD), y + oy - 60 * Math.cos(deg * RAD));
    g.lineTo(x + ox + 60 * Math.sin(deg * RAD), y + oy + 60 * Math.cos(deg * RAD));
    g.stroke();
  }
  g.restore();
  line(g, x - 30 * Math.sin(deg * RAD), y - 30 * Math.cos(deg * RAD), x + 30 * Math.sin(deg * RAD), y + 30 * Math.cos(deg * RAD), PAL.white, 3);
  text(g, label, x, y + 64, color, 11);
}
const beam = (g: CanvasRenderingContext2D, x1: number, x2: number, y: number, frac: number, color: string) => {
  g.fillStyle = color;
  g.globalAlpha = Math.max(0.05, Math.min(1, frac));
  g.fillRect(x1, y - 10, x2 - x1, 20);
  g.globalAlpha = 1;
};

function shadeLevel(random: () => number): DialLevel<ShadeRound> {
  const AY = 170;
  const P2X = 330;
  const flash = paidFlash();
  return {
    hero: {
      name: 'Glare',
      role: 'a lamp whose light must be dimmed by exactly the right amount',
      story: 'Ordinary light vibrates in every direction. A polaroid lets through only the part that vibrates along its pass axis, so it halves the light. A second polaroid then passes cos²θ of what is left, where θ is the angle between the two pass axes (Malus’ law).',
      objective: 'Turn the second polaroid so the light reaching the eye is the wanted fraction of the lamp’s light, in three rounds. A test shot costs a charge; the live meter fades.',
    },
    rounds: shadeRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 't', aria: 'Angle between the two polaroids in degrees', label: 'Angle between the polaroids', unit: '°', step: SLIDERS.theta.step, min: SLIDERS.theta.min, max: SLIDERS.theta.max, start: 10 }],
    handles: [{ dial: 't', at: (_r, v) => [P2X + 36 * Math.sin(v.t * RAD), AY - 36 * Math.cos(v.t * RAD)], drag: (_r, px, py) => (Math.atan2(px - P2X, AY - py) / RAD), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: measure the light that gets through', read: (_r, v) => (flash.paid(), shadeReading(v.t)) },
    fire: { button: '🕶️ Look', aria: 'Look through the polaroids at this angle' },
    judge: (r, v) => judgeShade(r, v.t),
    miss: (r, v) => shadeMiss(r, v.t),
    win: (r) => `${shadeExplain(r)[0]} ${shadeExplain(r)[1]}`,
    hint: (r) => `Wanted: ${fmt(r.target)} of the lamp’s light reaches the eye. The first polaroid is fixed. ${r.assist === 0 ? 'The light meter is live.' : r.assist === 1 ? 'The meter shows for a moment after a test shot.' : 'No meter: work it out.'}`,
    hit: () => [560, AY],
    delay: 1.0,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      // the light that reaches the eye (the readout and the brightness of the beam): live in round 1, for a moment after a test shot in round 2, never in round 3;
      // a win shows it, a miss shows only a fixed bright or dim beam
      const live = helperOn(r.assist, !!shot?.ok, flash.since(A.clock, k));
      orb(g, 60, AY, 16, PAL.yellow, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      text(g, 'lamp (all directions)', 60, AY + 40, PAL.dim, 10);
      beam(g, 76, 190, AY, 1, 'rgba(255,210,63,0.5)');
      polaroid(g, 210, AY, 0, PAL.cyan, 'first polaroid');
      beam(g, 252, 288, AY, 0.5, 'rgba(255,210,63,0.5)');
      polaroid(g, P2X, AY, v.t, PAL.pink, 'second polaroid');
      const through = twoPolaroids(v.t);
      const bright = live ? Math.min(1, through * 2) : shot ? (through > r.target ? 0.9 : 0.2) : 0.5;
      beam(g, 372, 520, AY, bright, 'rgba(255,210,63,0.5)');
      g.strokeStyle = PAL.white;
      g.lineWidth = 2.5;
      g.beginPath();
      g.ellipse(560, AY, 22, 14, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = `rgba(255,210,63,${bright})`;
      g.beginPath();
      g.arc(560, AY, 8, 0, Math.PI * 2);
      g.fill();
      text(g, 'eye', 560, AY + 40, PAL.dim, 11);
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      if (live) text(g, `${fmt(through)} of the lamp reaches the eye`, 330, 40, col, 14);
      else text(g, 'meter off', 330, 40, PAL.dim, 13);
      text(g, `wanted: ${fmt(r.target)}`, 330, 62, PAL.white, 12);
      text(g, `${fmt(v.t)}°`, P2X, AY - 56, PAL.pink, 14);
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'JUST RIGHT' : 'WRONG SHADE', 330, 310, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

function middleLevel(random: () => number): DialLevel<MiddleRound> {
  const AY = 170;
  const P2X = 290;
  const flash = paidFlash();
  return {
    hero: {
      name: 'Flipper',
      role: 'a ball of light between two crossed gates',
      story: 'The first and last polaroids are crossed, so no light gets through them alone. Put a third polaroid between them and some does, because each gate passes the part of the light along its own axis. The middle one, turned by θ, lets cos²θ through, and the last then lets through cos² of what remains.',
      objective: 'Turn the middle polaroid so the light that gets through is the wanted fraction of the light after the first polaroid, in three rounds. A test shot costs a charge; the live meter fades.',
    },
    rounds: middleRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 't', aria: 'Angle of the middle polaroid in degrees', label: 'Middle polaroid at', unit: '° to the first', step: SLIDERS.theta.step, min: SLIDERS.theta.min, max: SLIDERS.theta.max, start: 5 }],
    handles: [{ dial: 't', at: (_r, v) => [P2X + 36 * Math.sin(v.t * RAD), AY - 36 * Math.cos(v.t * RAD)], drag: (_r, px, py) => Math.atan2(px - P2X, AY - py) / RAD, radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: measure the light that gets through', read: (_r, v) => (flash.paid(), middleReading(v.t)) },
    fire: { button: '🎱 Flip', aria: 'Flip the ball through the three polaroids' },
    judge: (r, v) => judgeMiddle(r, v.t),
    miss: (r, v) => middleMiss(r, v.t),
    win: (r) => `${middleExplain(r)[0]} ${middleExplain(r)[1]}`,
    hint: (r) => `The last polaroid is at 90° to the first. Wanted: ${fmt(r.target)} of the light that gets through the first. ${r.assist === 0 ? 'The light meter is live.' : r.assist === 1 ? 'The meter shows for a moment after a test shot.' : 'No meter: work it out.'}`,
    hit: () => [570, AY],
    delay: 1.0,
    draw: ({ g, r, k, v, t, rt, shot, A }) => {
      // the light between and after the polaroids (the readout and the beam brightness): live in round 1, for a moment after a test shot in round 2, never in round 3;
      // a win shows it, a miss shows only a fixed bright or dim beam
      const live = helperOn(r.assist, !!shot?.ok, flash.since(A.clock, k));
      orb(g, 56, AY, 14, PAL.yellow, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      beam(g, 70, 150, AY, 0.9, 'rgba(255,210,63,0.5)');
      polaroid(g, 170, AY, 0, PAL.cyan, 'first (0°)');
      beam(g, 212, 248, AY, 0.9, 'rgba(255,210,63,0.5)');
      polaroid(g, P2X, AY, v.t, PAL.pink, 'middle');
      const m = cosD(v.t) ** 2;
      beam(g, 332, 408, AY, live ? m : 0.5, 'rgba(255,210,63,0.5)');
      polaroid(g, 430, AY, 90, PAL.green, 'last (90°)');
      const through = middlePolaroid(v.t);
      const bright = live ? Math.min(1, through * 4) : shot ? (through > r.target ? 0.9 : 0.2) : 0.5;
      beam(g, 472, 540, AY, bright, 'rgba(255,210,63,0.5)');
      g.fillStyle = `rgba(255,210,63,${bright})`;
      g.beginPath();
      g.arc(570, AY, 9, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = PAL.white;
      g.lineWidth = 2.5;
      g.beginPath();
      g.ellipse(570, AY, 22, 14, 0, 0, Math.PI * 2);
      g.stroke();
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      if (live) text(g, `${fmt(through)} of the light after the first gets through`, 320, 40, col, 14);
      else text(g, 'meter off', 320, 40, PAL.dim, 13);
      text(g, `wanted: ${fmt(r.target)}`, 320, 62, PAL.white, 12);
      text(g, `${fmt(v.t)}°`, P2X, AY - 56, PAL.pink, 14);
      if (rt > 1.0) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'GOAL' : 'OUT', 320, 310, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? slitLevel(ctx.random) : ctx.level === 2 ? shadeLevel(ctx.random) : middleLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen with a slit or polaroid filters and the light that gets through them.');
  },
});
