import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, f0, fmt, judgeAt, judgeNatural, judgeQ, judgeTune, judgeVolts, starsFor } from './logic';

const W = 640;
const H = 340;
const REVEAL = 0.9;
const RUN = 3;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const col = themeColors();

    let misses = 0;
    let finished = false;
    let pendingWin: 1 | 2 | 3 | null = null;
    let wonAt: number | null = null;
    let clock = 0;
    let verdictAt: number | null = null;
    let verdictOk = false;
    let runT: number | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A resonance curve showing the current of a series LCR circuit against the driving frequency.' });
    const g = fitCanvas(canvas, W, H);
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const solution = h('section', { class: 'panel solution', hidden: true });
    const hint = h('p', { class: 'muted note' });
    const controls = h('div', { class: 'lab-controls' });
    const free = lvl.freeTests;
    const say = (text: string, good = false) => {
      feedback.hidden = false;
      feedback.className = `feedback ${good ? 'good' : 'bad'}`;
      feedback.textContent = text;
    };
    const costNote = () => (misses > free ? ' That cost a star.' : free > 0 ? ` ${free - misses} free test${free - misses === 1 ? '' : 's'} left.` : '');
    const freeNote = (m: string) => say(`${m} That does not cost you anything.`);
    const miss = (text: string) => {
      misses++;
      say(text + costNote());
    };
    const succeed = (text: string) => {
      finished = true;
      say(text, true);
      solution.replaceChildren(h('h3', null, 'Why that works'), ...explainSolution(lvl).map((t) => h('p', null, t)));
      solution.hidden = false;
      controls.querySelectorAll('button, input').forEach((b) => b.setAttribute('disabled', ''));
      pendingWin = starsFor(misses, free);
    };
    const verdict = (ok: boolean) => {
      verdictAt = clock;
      verdictOk = ok;
      runT = 0;
    };
    const busy = () => runT !== null && runT < RUN;
    const field = (aria: string, placeholder: string) => h('input', { class: 'field', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': aria, placeholder }) as HTMLInputElement;
    const num = (el: HTMLInputElement) => parseNumber(el.value);
    const actionBtn = (text: string, aria: string, fn: () => void) => h('button', { class: 'btn', type: 'button', 'aria-label': aria, onclick: fn }, text);
    const row = (name: string, input: HTMLElement, unit: string) => h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), input, h('span', { class: 'unit' }, unit));
    const positive = (...vs: (number | null)[]) => vs.every((v) => v !== null && v > 0);

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'natural') {
      const wIn = field('Angular frequency in rad/s', 'ω₀ = ? rad/s');
      const fIn = field('Frequency in Hz', 'f₀ = ? Hz');
      const run = () => {
        if (finished || busy()) return;
        const w = num(wIn);
        const f = num(fIn);
        if (!positive(w, f)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeNatural(lvl, w as number, f as number);
        verdict(res.ok);
        if (res.ok) return succeed(`ω₀ = ${fmt(lvl.omega)} rad/s and f₀ = ${fmt(lvl.hz)} Hz.`);
        const parts: string[] = [];
        if (!res.wOk) parts.push('The angular frequency is not right: it depends on the product of L and C, in henry and farad.');
        if (!res.fOk) parts.push('The frequency is not right: it is the angular frequency divided by 2π.');
        miss(parts.join(' '));
      };
      controls.append(row('Angular frequency', wIn, 'rad/s'), row('Frequency', fIn, 'Hz'), actionBtn('Let the charge oscillate', 'Let the charge oscillate', run));
      hint.textContent = `C = ${lvl.cMicroF} µF and L = ${lvl.lMilliH} mH.`;
    }
    if (lvl.kind === 'at') {
      const zIn = field('Impedance in Ω', 'Z = ? Ω');
      const iIn = field('Rms current in A', 'I = ? A');
      const pIn = field('Average power in W', 'P = ? W');
      const run = () => {
        if (finished || busy()) return;
        const z = num(zIn);
        const i = num(iIn);
        const p = num(pIn);
        if (!positive(z, i, p)) return freeNote('Enter all three as positive numbers.');
        const res = judgeAt(lvl, z as number, i as number, p as number);
        verdict(res.ok);
        if (res.ok) return succeed(`Z = ${lvl.r} Ω, I = ${fmt(lvl.i)} A, P = ${fmt(lvl.p)} W.`);
        const parts: string[] = [];
        if (!res.zOk) parts.push('The impedance is not right: at resonance what happens to the two reactances?');
        if (!res.iOk) parts.push('The current is not right: it is the source voltage over the impedance.');
        if (!res.pOk) parts.push('The power is not right: at resonance the power factor is 1.');
        miss(parts.join(' '));
      };
      controls.append(row('Impedance', zIn, 'Ω'), row('Rms current', iIn, 'A'), row('Average power', pIn, 'W'), actionBtn('Tune to resonance', 'Tune to resonance', run));
      hint.textContent = `R = ${lvl.r} Ω, L = ${lvl.l} H, C = ${lvl.cMicroF} µF on a ${lvl.v} V rms source, at the natural frequency.`;
    }
    if (lvl.kind === 'volts') {
      const lIn = field('Rms voltage across the inductor in V', 'V_L = ? V');
      const cIn = field('Rms voltage across the LC combination in V', 'V_LC = ? V');
      const run = () => {
        if (finished || busy()) return;
        const l = num(lIn);
        const c = num(cIn);
        if (l === null || c === null || l <= 0 || c < 0) return freeNote('Enter the inductor voltage as a positive number and the combination voltage as a number (zero is allowed).');
        const res = judgeVolts(lvl, l, c);
        verdict(res.ok);
        if (res.ok) return succeed(`V_L = ${fmt(lvl.vl)} V, and zero across the LC combination.`);
        const parts: string[] = [];
        if (!res.lOk) parts.push('The inductor voltage is not right: it is the rms current times the inductive reactance at the resonant frequency.');
        if (!res.cOk) parts.push('The voltage across the combination is not right: compare the phases of V_L and V_C at resonance.');
        miss(parts.join(' '));
      };
      controls.append(row('Across the inductor', lIn, 'V'), row('Across L and C together', cIn, 'V'), actionBtn('Measure the voltages', 'Measure the voltages', run));
      hint.textContent = `R = ${lvl.r} Ω, L = ${lvl.l} H, C = ${lvl.cMicroF} µF on a ${lvl.v} V rms source, at resonance.`;
    }
    if (lvl.kind === 'q') {
      const qIn = field('Quality factor Q', 'Q = ?');
      const vIn = field('Rms voltage across the capacitor in V', 'V_C = ? V');
      const run = () => {
        if (finished || busy()) return;
        const q = num(qIn);
        const v = num(vIn);
        if (!positive(q, v)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeQ(lvl, q as number, v as number);
        verdict(res.ok);
        if (res.ok) return succeed(`Q = ${fmt(lvl.q)} and V_C = ${fmt(lvl.vc)} V.`);
        const parts: string[] = [];
        if (!res.qOk) parts.push('Q is not right: it is ω₀L/R, which is also √(L/C)/R.');
        if (!res.vOk) parts.push('The capacitor voltage is not right: at resonance the capacitor voltage is Q times the source voltage.');
        miss(parts.join(' '));
      };
      controls.append(row('Quality factor', qIn, ''), row('Capacitor voltage', vIn, 'V'), actionBtn('Measure the circuit', 'Measure the circuit', run));
      hint.textContent = `R = ${lvl.r} Ω, L = ${lvl.l} H, C = ${lvl.cMicroF} µF on a ${lvl.v} V rms source.`;
    }
    if (lvl.kind === 'tune') {
      const cIn = field('Capacitance in µF', 'C = ? µF');
      const fIn = field('New resonant frequency in Hz', 'f′ = ? Hz');
      const run = () => {
        if (finished || busy()) return;
        const c = num(cIn);
        const f = num(fIn);
        if (!positive(c, f)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeTune(lvl, c as number, f as number);
        verdict(res.ok);
        if (res.ok) return succeed(`C = ${fmt(lvl.cMicroF)} µF and f′ = ${fmt(lvl.newHz)} Hz.`);
        const parts: string[] = [];
        if (!res.cOk) parts.push('The capacitance is not right: at resonance ω² = 1/LC. Give it in µF.');
        if (!res.fOk) parts.push('The new frequency is not right: the resonant frequency depends on the square root of L.');
        miss(parts.join(' '));
      };
      controls.append(row('Capacitance', cIn, 'µF'), row('New frequency', fIn, 'Hz'), actionBtn('Tune the circuit', 'Tune the circuit', run));
      hint.textContent = `Inductance ${lvl.l} H, wanted resonance at ${lvl.hz} Hz.`;
    }

    // ---- drawing --------------------------------------------------------------------------------------------------------
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const params = () => {
      if (lvl.kind === 'natural') return { r: 15, l: lvl.lMilliH / 1000, c: lvl.cMicroF };
      if (lvl.kind === 'tune') return { r: 15, l: lvl.l, c: lvl.cMicroF };
      return { r: lvl.r, l: lvl.l, c: lvl.cMicroF };
    };
    function drawScene() {
      const { r, l, c } = params();
      const res = f0(l, c);
      const gx = 70;
      const gw = 500;
      const gy = 270;
      const gh = 170;
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(gx + gw, gy);
      g.moveTo(gx, gy);
      g.lineTo(gx, gy - gh - 20);
      g.stroke();
      label(g, 'driving frequency →', gx + gw - 60, gy + 20, { size: 11, color: col.muted });
      label(g, 'current', gx + 6, gy - gh - 28, { size: 11, color: col.muted });
      const iAt = (f: number) => {
        const w = 2 * Math.PI * f;
        return 1 / Math.hypot(r, w * l - 1 / (w * c * 1e-6));
      };
      const peak = 1 / r;
      g.strokeStyle = col.accent;
      g.lineWidth = 2.5;
      g.beginPath();
      for (let k = 0; k <= 160; k++) {
        const f = res * (0.2 + (k / 160) * 1.8);
        const x = gx + (k / 160) * gw;
        const y = gy - (iAt(f) / peak) * gh;
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
      // a marker that sweeps the driving frequency, and the resonant frequency
      const sweep = 0.2 + 1.8 * (0.5 + 0.5 * Math.sin(clock * 0.9));
      const mx = gx + ((sweep - 0.2) / 1.8) * gw;
      const my = gy - (iAt(res * sweep) / peak) * gh;
      disc(g, mx, my, 5, '#c0392b');
      const rx = gx + ((1 - 0.2) / 1.8) * gw;
      g.strokeStyle = col.good;
      g.setLineDash([5, 4]);
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(rx, gy);
      g.lineTo(rx, gy - gh - 10);
      g.stroke();
      g.setLineDash([]);
      const f = runT === null ? 0 : ease(Math.min(1, runT / RUN));
      label(g, f > 0 ? `f₀ = ${fmt(res)} Hz` : 'f₀ = ?', rx, gy - gh - 22, { size: 12, color: col.good });
      if (lvl.kind === 'q') {
        // the sharper, taller curve of a higher Q is hinted by a second curve of ten times the resistance
        g.strokeStyle = col.muted;
        g.lineWidth = 1.5;
        g.beginPath();
        for (let k = 0; k <= 160; k++) {
          const ff = res * (0.2 + (k / 160) * 1.8);
          const x = gx + (k / 160) * gw;
          const w = 2 * Math.PI * ff;
          const y = gy - (1 / Math.hypot(r * 4, w * l - 1 / (w * c * 1e-6)) / peak) * gh;
          if (k) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.stroke();
        label(g, 'more resistance: lower, broader (low Q)', gx + gw - 120, gy - 40, { size: 11, color: col.muted });
      }
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawScene();
      verdictLabel(lvl.kind === 'natural' ? `ω₀ = ${fmt(lvl.omega)} rad/s, f₀ = ${fmt(lvl.hz)} Hz` : lvl.kind === 'at' ? `Z = R, I = ${fmt(lvl.i)} A, P = ${fmt(lvl.p)} W` : lvl.kind === 'volts' ? `V_L = V_C = ${fmt(lvl.vl)} V, V_LC = 0` : lvl.kind === 'q' ? `Q = ${fmt(lvl.q)}, V_C = ${fmt(lvl.vc)} V` : `C = ${fmt(lvl.cMicroF)} µF, f′ = ${fmt(lvl.newHz)} Hz`, 320, 322);
      if (verdictAt !== null && clock - verdictAt < REVEAL) {
        g.strokeStyle = verdictOk ? col.good : col.bad;
        g.lineWidth = 6;
        g.globalAlpha = 1 - (clock - verdictAt) / REVEAL;
        g.strokeRect(3, 3, W - 6, H - 6);
        g.globalAlpha = 1;
      }
      const phase = verdictAt === null ? 'idle' : busy() || clock - verdictAt < REVEAL ? 'testing' : 'done';
      canvas.dataset.phase = phase;
      if (pendingWin !== null && phase !== 'testing') {
        wonAt ??= clock;
        if (clock - wonAt > 0.3) {
          const s = pendingWin;
          pendingWin = null;
          ctx.win({ stars: s });
        }
      }
    });
  },
});
