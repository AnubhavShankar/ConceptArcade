// Inspirations: Crossy Road (a hopper that cannot cross until the road in front of it is cleared), Dance Dance Revolution
// (the beat has to match the rhythm the machine plays) and Hill Climb Racing (the slope of the ground sets how fast you go).
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { mountDialLevel, type DialLevel } from '@core/dialgame';
import { fmt, sgn } from '@core/judge';
import { glow, line, orb, text } from '@core/neon';
import { SLIDERS, barrierAfter, biasExplain, biasMiss, biasReading, biasRounds, curveExplain, curveMiss, curveReading, curveRounds, judgeBias, judgeCurve, judgeRect, rectExplain, rectMiss, rectReading, rectRounds, type BiasRound, type CurveRound, type RectRound } from './logic';

const fromTrack = (px: number, min: number, max: number) => min + ((px - 60) / 520) * (max - min);

function biasLevel(random: () => number): DialLevel<BiasRound> {
  const S = SLIDERS.v;
  const Y = (v: number) => 290 - ((v - S.min) / (S.max - S.min)) * 230;
  const H = (b: number) => 270 - Math.max(0, Math.min(b, 7)) * 30;
  return {
    hero: {
      name: 'Hopper',
      role: 'a charge carrier that has to cross the barrier of a p–n junction',
      story: 'Where the p and n sides meet, carriers diffuse across, leave a depletion layer behind and build a potential barrier V₀ (about 0.7 V in silicon, 0.3 V in germanium). A forward battery (p side to the positive terminal) lowers the barrier; a reverse battery raises it and widens the layer.',
      objective: 'Choose the battery that brings the barrier to the height the hopper is planning for, in three rounds. A test shot costs a charge; the live hill fades.',
    },
    rounds: biasRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'v', aria: 'Battery voltage across the junction, positive for forward bias', label: 'Battery (+ forward, − reverse)', unit: '', step: S.step, min: S.min, max: S.max, start: 0, text: (x) => (x > 0 ? `${x.toFixed(2)} V forward` : x < 0 ? `${(-x).toFixed(2)} V reverse` : '0 V') }],
    handles: [{ dial: 'v', at: (_r, v) => [610, Y(v.v)], drag: (_r, _px, py) => S.min + ((290 - py) / 230) * (S.max - S.min), radius: 22 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the built-in barrier and the battery', read: (r, v) => biasReading(r, v.v) },
    fire: { button: '🐔 Hop', aria: 'Connect the battery and hop' },
    judge: (r, v) => judgeBias(r, v.v),
    miss: (r, v) => biasMiss(r, v.v),
    win: (r) => `${biasExplain(r)[0]} ${biasExplain(r)[1]}`,
    hint: (r) => `${r.material[0].toUpperCase()}${r.material.slice(1)} junction, V₀ = ${fmt(r.v0)} V. The hopper plans for a barrier of ${fmt(r.target)} V. ${r.assist === 0 ? 'The hill is drawn live.' : r.assist === 1 ? 'The hill is dim: use a test shot.' : 'No hill: work it out.'}`,
    hit: (r) => [330, H(r.target)],
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot }) => {
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      const used = shot ? shot.v.v : v.v;
      const bar = barrierAfter(r, used);
      g.fillStyle = 'rgba(80,200,255,0.12)';
      g.fillRect(60, 60, 230, 210);
      g.fillStyle = 'rgba(255,100,200,0.12)';
      g.fillRect(390, 60, 190, 210);
      text(g, 'p side', 175, 82, PAL.cyan, 12);
      text(g, 'n side', 485, 82, PAL.pink, 12);
      line(g, 60, 270, 580, 270, PAL.white, 2);
      line(g, 290, H(r.v0), 390, H(r.v0), PAL.dim, 2, [5, 5]);
      text(g, `built-in ${fmt(r.v0)} V`, 340, H(r.v0) - 8, PAL.dim, 11);
      if (live || dim) {
        g.save();
        g.globalAlpha = dim ? 0.3 : 1;
        const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.cyan;
        const w = 100 + Math.max(0, Math.min(bar, 7)) * 6;
        const x0 = 340 - w / 2;
        const x1 = 340 + w / 2;
        glow(g, col, 8, () => {
          g.strokeStyle = col;
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(60, 270);
          g.lineTo(x0, 270);
          g.lineTo(x1, H(bar));
          g.lineTo(580, H(bar));
          g.stroke();
        });
        text(g, `barrier ${fmt(Math.max(0, bar))} V`, 480, H(bar) - 8, col, 12);
        g.restore();
      }
      line(g, 60, H(r.target), 580, H(r.target), PAL.yellow, 2.5, [6, 5]);
      text(g, `plan: ${fmt(r.target)} V`, 120, H(r.target) - 8, PAL.yellow, 12);
      orb(g, 120, 250, 12, PAL.cyan, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 610, 60, 610, 290, PAL.dim, 4);
      text(g, 'forward', 610, 52, PAL.dim, 10);
      text(g, 'reverse', 610, 306, PAL.dim, 10);
      text(g, sgn(used) + ' V', 560, Y(used) + 4, shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow, 12, 'right');
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'BARRIER AS PLANNED' : 'WRONG BARRIER', 330, 34, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

function rectLevel(random: () => number): DialLevel<RectRound> {
  const S = SLIDERS.f;
  const X = (f: number) => 60 + ((f - S.min) / (S.max - S.min)) * 520;
  const WIN = 0.06;
  const tx = (s: number) => 60 + (s / WIN) * 520;
  return {
    hero: {
      name: 'Beat',
      role: 'a lamp that flashes once for every pulse a rectifier delivers',
      story: 'A diode conducts only when it is forward biased, so it passes one direction of an alternating supply. A half-wave rectifier uses one diode and passes one half of each cycle; a full-wave rectifier uses two and passes both halves, turning the second into a pulse in the same direction.',
      objective: 'Set the flash rate of the lamp to the frequency of the rectifier’s output, in three rounds. A test shot costs a charge; the live output trace fades.',
    },
    rounds: rectRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'f', aria: 'Flash frequency of the lamp in hertz', label: 'Lamp flash rate', unit: 'Hz', step: S.step, min: S.min, max: S.max, start: 30, text: (x) => `${x} Hz` }],
    handles: [{ dial: 'f', at: (_r, v) => [X(v.f), 312], drag: (_r, px) => fromTrack(px, S.min, S.max), radius: 20 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read when the diodes conduct', read: (r) => rectReading(r) },
    fire: { button: '💡 Flash', aria: 'Run the lamp at this flash rate' },
    judge: (r, v) => judgeRect(r, v.f),
    miss: (r, v) => rectMiss(r, v.f),
    win: (r) => `${rectExplain(r)[0]} ${rectExplain(r)[1]}`,
    hint: (r) => `${r.kind === 'half' ? 'Half-wave' : 'Full-wave'} rectifier on a ${r.f} Hz supply. ${r.assist === 0 ? 'The output trace is live.' : r.assist === 1 ? 'The trace is dim: use a test shot.' : 'No trace: work it out.'}`,
    hit: () => [330, 170],
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot }) => {
      const used = shot ? shot.v.f : v.f;
      text(g, `supply ${r.f} Hz`, 60, 40, PAL.dim, 12, 'left');
      line(g, 60, 100, 580, 100, PAL.dim, 1);
      g.strokeStyle = PAL.cyan;
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= 520; x += 4) {
        const s = (x / 520) * WIN;
        const y = 100 - 38 * Math.sin(2 * Math.PI * r.f * s);
        if (x === 0) g.moveTo(60 + x, y);
        else g.lineTo(60 + x, y);
      }
      g.stroke();
      text(g, `${r.kind === 'half' ? 'one diode' : 'two diodes'}`, 600, 100, PAL.cyan, 11, 'right');
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      g.save();
      g.globalAlpha = dim ? 0.3 : 1;
      if (live || dim) {
        line(g, 60, 205, 580, 205, PAL.dim, 1);
        g.strokeStyle = PAL.pink;
        g.lineWidth = 2.5;
        g.beginPath();
        for (let x = 0; x <= 520; x += 4) {
          const s = (x / 520) * WIN;
          const w = Math.sin(2 * Math.PI * r.f * s);
          const y = 205 - 38 * (r.kind === 'half' ? Math.max(0, w) : Math.abs(w));
          if (x === 0) g.moveTo(60 + x, y);
          else g.lineTo(60 + x, y);
        }
        g.stroke();
        text(g, 'output', 60, 160, PAL.pink, 12, 'left');
      } else text(g, 'output trace off', 330, 190, PAL.dim, 12);
      g.restore();
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      text(g, 'your lamp', 60, 250, col, 12, 'left');
      line(g, 60, 270, 580, 270, PAL.dim, 1);
      for (let s = 0.25 / used; s < WIN; s += 1 / used) {
        glow(g, col, 6, () => {
          g.fillStyle = col;
          g.beginPath();
          g.arc(tx(s), 270, 5, 0, Math.PI * 2);
          g.fill();
        });
      }
      orb(g, 600, 40, 14, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 60, 312, 580, 312, PAL.dim, 3);
      text(g, '10 Hz', 60, 332, PAL.dim, 10);
      text(g, '250 Hz', 580, 332, PAL.dim, 10);
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'IN TIME' : 'OFF THE BEAT', 330, 24, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

function curveLevel(random: () => number): DialLevel<CurveRound> {
  const S = SLIDERS.r;
  const X = (x: number) => 60 + ((x - S.min) / (S.max - S.min)) * 520;
  const fx = (v: number) => 100 + v * 400;
  const fy = (i: number) => 260 - i * 7;
  const rx = (v: number) => 500 + v * 18;
  const ry = (i: number) => 100 - i * 25;
  return {
    hero: {
      name: 'Slope',
      role: 'a racer climbing the V–I curve of a diode',
      story: 'A diode is not an ohmic resistor. In forward bias the current rises steeply once the voltage passes the cut-in value, so its resistance at a working point is the dynamic resistance r = ΔV/ΔI between two nearby points. In reverse bias the current is tiny and almost constant, so the resistance V/I is enormous.',
      objective: 'Set the diode’s resistance for the points on the curve, as a power of ten of ohms, in three rounds. A test shot costs a charge; the live slope helper fades.',
    },
    rounds: curveRounds(random),
    charges: [1, 1, 1],
    dials: [{ key: 'x', aria: 'Resistance as a power of ten of ohms', label: 'Resistance', unit: '', step: S.step, min: S.min, max: S.max, start: 4, text: (x) => `${fmt(10 ** x)} Ω` }],
    handles: [{ dial: 'x', at: (_r, v) => [X(v.x), 312], drag: (_r, px) => fromTrack(px, S.min, S.max), radius: 20 }],
    test: { button: '🔦 Test shot', aria: 'Test shot: read the change in voltage and current', read: (r) => curveReading(r) },
    fire: { button: '🏁 Race', aria: 'Race with this resistance' },
    judge: (r, v) => judgeCurve(r, v.x),
    miss: (r, v) => curveMiss(r, v.x),
    win: (r) => `${curveExplain(r)[0]} ${curveExplain(r)[1]}`,
    hint: (r) => `${r.kind === 'forward' ? 'Forward bias: resistance at the working point from the two marked points.' : 'Reverse bias: the resistance from the voltage and the current at the marked point.'} ${r.assist === 0 ? 'The slope helper is live.' : r.assist === 1 ? 'The helper is dim: use a test shot.' : 'No helper: work it out.'}`,
    hit: () => [330, 150],
    delay: 0.9,
    draw: ({ g, r, v, t, rt, shot }) => {
      const live = r.assist === 0 || shot !== null;
      const dim = r.assist === 1 && shot === null;
      const col = shot ? (shot.ok ? PAL.green : PAL.red) : PAL.yellow;
      if (r.kind === 'forward') {
        line(g, 100, 260, 560, 260, PAL.white, 2);
        line(g, 100, 40, 100, 260, PAL.white, 2);
        text(g, 'V (volts)', 560, 278, PAL.dim, 11, 'right');
        text(g, 'I (mA)', 80, 44, PAL.dim, 11, 'right');
        glow(g, PAL.cyan, 8, () => line(g, fx(r.v1 - 0.15), fy(r.i1 - (0.15 * (r.i2 - r.i1)) / (r.v2 - r.v1)), fx(r.v2 + 0.1), fy(r.i2 + (0.1 * (r.i2 - r.i1)) / (r.v2 - r.v1)), PAL.cyan, 3));
        for (const [pv, pi] of [[r.v1, r.i1], [r.v2, r.i2]] as [number, number][]) {
          g.fillStyle = PAL.white;
          g.beginPath();
          g.arc(fx(pv), fy(pi), 5, 0, Math.PI * 2);
          g.fill();
          text(g, `${fmt(pv)} V, ${fmt(pi)} mA`, fx(pv) + 12, fy(pi) + 4, PAL.white, 11, 'left');
        }
        if (live || dim) {
          g.save();
          g.globalAlpha = dim ? 0.3 : 1;
          line(g, fx(r.v1), fy(r.i1), fx(r.v2), fy(r.i1), PAL.pink, 2, [4, 4]);
          line(g, fx(r.v2), fy(r.i1), fx(r.v2), fy(r.i2), PAL.pink, 2, [4, 4]);
          text(g, `ΔV = ${fmt(r.v2 - r.v1)} V`, (fx(r.v1) + fx(r.v2)) / 2, fy(r.i1) + 16, PAL.pink, 11);
          text(g, `ΔI = ${fmt(r.i2 - r.i1)} mA`, fx(r.v2) + 8, (fy(r.i1) + fy(r.i2)) / 2, PAL.pink, 11, 'left');
          g.restore();
        }
      } else {
        line(g, 80, 100, 560, 100, PAL.white, 2);
        line(g, 500, 40, 500, 230, PAL.white, 2);
        text(g, 'V (volts)', 80, 86, PAL.dim, 11, 'left');
        text(g, 'I (µA)', 520, 44, PAL.dim, 11, 'left');
        glow(g, PAL.cyan, 8, () => line(g, rx(-22), ry(r.i1 / (r.v1 / -22)), 500, 100, PAL.cyan, 3));
        g.fillStyle = PAL.white;
        g.beginPath();
        g.arc(rx(r.v1), ry(r.i1), 5, 0, Math.PI * 2);
        g.fill();
        text(g, `${sgn(r.v1)} V, ${sgn(r.i1)} µA`, rx(r.v1) + 12, ry(r.i1) + 18, PAL.white, 11, 'left');
        if (live || dim) {
          g.save();
          g.globalAlpha = dim ? 0.3 : 1;
          line(g, rx(r.v1), 100, rx(r.v1), ry(r.i1), PAL.pink, 2, [4, 4]);
          text(g, 'V and I at this point', rx(r.v1), ry(r.i1) + 36, PAL.pink, 11);
          g.restore();
        }
      }
      text(g, `${fmt(10 ** v.x)} Ω`, X(v.x), 296, col, 12);
      orb(g, 600, 40, 14, PAL.pink, t, shot ? (shot.ok ? 'cheer' : 'worried') : 'happy');
      line(g, 60, 312, 580, 312, PAL.dim, 3);
      text(g, '1 Ω', 60, 332, PAL.dim, 10);
      text(g, '10⁹ Ω', 580, 332, PAL.dim, 10);
      if (rt > 0.9) glow(g, shot!.ok ? PAL.green : PAL.red, 12, () => text(g, shot!.ok ? 'RIGHT SLOPE' : 'WRONG SLOPE', 330, 24, shot!.ok ? PAL.green : PAL.red, 17));
    },
  };
}

export default defineGame({
  mount(ctx) {
    const level = ctx.level === 1 ? biasLevel(ctx.random) : ctx.level === 2 ? rectLevel(ctx.random) : curveLevel(ctx.random);
    return mountDialLevel(ctx as never, level as never, 'An arcade screen with a junction barrier set by a battery, a rectifier whose pulses a lamp must follow and a diode curve whose slope is the resistance.');
  },
});
