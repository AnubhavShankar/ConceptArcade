import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeCoil, judgeLCR, judgeRC, judgeVoltages, starsFor, type Lead } from './logic';

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
    let leadPick: Lead | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'An impedance triangle for a series circuit, with the voltage and current waves showing their phase difference.' });
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
    if (lvl.kind === 'rc') {
      const zIn = field('Impedance in Ω', 'Z = ? Ω');
      const iIn = field('Rms current in A', 'I = ? A');
      const vIn = field('Rms voltage across the capacitor in V', 'V_C = ? V');
      const run = () => {
        if (finished || busy()) return;
        const z = num(zIn);
        const i = num(iIn);
        const v = num(vIn);
        if (!positive(z, i, v)) return freeNote('Enter all three as positive numbers.');
        const res = judgeRC(lvl, z as number, i as number, v as number);
        verdict(res.ok);
        if (res.ok) return succeed(`Z = ${fmt(lvl.z)} Ω, I = ${fmt(lvl.i)} A, V_C = ${fmt(lvl.vc)} V.`);
        const parts: string[] = [];
        if (!res.zOk) parts.push('The impedance is not right: resistance and reactance are a quarter cycle apart, so they add like the sides of a right-angled triangle, not arithmetically.');
        if (!res.iOk) parts.push('The current is not right: it is the source voltage divided by the impedance.');
        if (!res.vOk) parts.push('The capacitor voltage is not right: it is the current times the capacitive reactance.');
        miss(parts.join(' '));
      };
      controls.append(row('Impedance', zIn, 'Ω'), row('Rms current', iIn, 'A'), row('Capacitor voltage', vIn, 'V'), actionBtn('Switch on the source', 'Switch on the source', run));
      hint.textContent = `R = ${lvl.r} Ω and C = ${lvl.cMicroF} µF in series on a ${lvl.v} V rms, ${lvl.hz} Hz source.`;
    }
    if (lvl.kind === 'lcr') {
      const zIn = field('Impedance in Ω', 'Z = ? Ω');
      const pIn = field('Phase difference in degrees', 'φ = ? °');
      const opts: [Lead, string, string][] = [['lags', 'The current lags the voltage', 'Lags'], ['leads', 'The current leads the voltage', 'Leads']];
      const btns: HTMLElement[] = opts.map(([v, aria, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': aria, 'aria-pressed': 'false', onclick: () => {
          leadPick = v;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const z = num(zIn);
        const p = num(pIn);
        if (!positive(z, p)) return freeNote('Enter the impedance and the size of the phase difference as positive numbers.');
        if (leadPick === null) return freeNote('Choose whether the current lags or leads the voltage.');
        const res = judgeLCR(lvl, z as number, p as number, leadPick);
        verdict(res.ok);
        if (res.ok) return succeed(`Z = ${fmt(lvl.z)} Ω, φ = ${fmt(lvl.phase)}°, the current ${lvl.lead} the voltage.`);
        const parts: string[] = [];
        if (!res.zOk) parts.push('The impedance is not right: Z = √(R² + (X_L − X_C)²).');
        if (!res.pOk) parts.push('The phase difference is not right: tan φ = (X_L − X_C)/R.');
        if (!res.lOk) parts.push('The lag or lead is not right: compare X_L with X_C. Which one wins?');
        miss(parts.join(' '));
      };
      controls.append(row('Impedance', zIn, 'Ω'), row('Phase difference', pIn, '°'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'The current'), ...btns), actionBtn('Check the circuit', 'Check the circuit', run));
      hint.textContent = `R = ${lvl.r} Ω, X_L = ${lvl.xl} Ω, X_C = ${lvl.xc} Ω, source peak ${lvl.vPeak} V.`;
    }
    if (lvl.kind === 'voltages') {
      const vIn = field('Source voltage in V', 'V = ? V');
      const run = () => {
        if (finished || busy()) return;
        const v = num(vIn);
        if (!positive(v)) return freeNote('Enter the voltage as a positive number of volts.');
        const ok = judgeVoltages(lvl, v as number).ok;
        verdict(ok);
        if (ok) return succeed(`V = ${fmt(lvl.source)} V.`);
        miss('That is not the source voltage: the inductor and capacitor voltages are opposite in phase, and the resistor voltage is a quarter cycle from both, so add them as phasors.');
      };
      controls.append(row('Source voltage', vIn, 'V'), actionBtn('Add the phasors', 'Add the phasors', run));
      hint.textContent = `V_R = ${lvl.vr} V, V_L = ${lvl.vl} V, V_C = ${lvl.vc} V (rms).`;
    }
    if (lvl.kind === 'coil') {
      const zIn = field('Impedance in Ω', 'Z = ? Ω');
      const iIn = field('Rms current in A', 'I = ? A');
      const fIn = field('Power factor', 'cos φ = ?');
      const run = () => {
        if (finished || busy()) return;
        const z = num(zIn);
        const i = num(iIn);
        const f = num(fIn);
        if (!positive(z, i, f)) return freeNote('Enter all three as positive numbers.');
        const res = judgeCoil(lvl, z as number, i as number, f as number);
        verdict(res.ok);
        if (res.ok) return succeed(`Z = ${fmt(lvl.z)} Ω, I = ${fmt(lvl.v / lvl.z)} A, cos φ = ${fmt(lvl.pf)}.`);
        const parts: string[] = [];
        if (!res.zOk) parts.push('The impedance is not right: the coil’s resistance and reactance are a quarter cycle apart.');
        if (!res.iOk) parts.push('The current is not right: it is the source voltage over the impedance.');
        if (!res.fOk) parts.push('The power factor is not right: it is the ratio of the resistance to the impedance.');
        miss(parts.join(' '));
      };
      controls.append(row('Impedance', zIn, 'Ω'), row('Rms current', iIn, 'A'), row('Power factor', fIn, ''), actionBtn('Check the coil', 'Check the coil', run));
      hint.textContent = `A coil of resistance ${lvl.r} Ω and inductance ${lvl.lMilliH} mH on a ${lvl.v} V rms, ${lvl.hz} Hz source.`;
    }

    // ---- drawing --------------------------------------------------------------------------------------------------------
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const arrow = (x: number, y: number, dx: number, dy: number, color: string, text: string) => {
      const len = Math.hypot(dx, dy);
      if (len < 2) return;
      const ux = dx / len;
      const uy = dy / len;
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + dx, y + dy);
      g.stroke();
      g.beginPath();
      g.moveTo(x + dx + ux * 9, y + dy + uy * 9);
      g.lineTo(x + dx - uy * 5, y + dy + ux * 5);
      g.lineTo(x + dx + uy * 5, y + dy - ux * 5);
      g.fill();
      label(g, text, x + dx / 2 + (dy !== 0 && dx === 0 ? 32 : 0), y + dy / 2 + (dx !== 0 && dy === 0 ? 18 : 0), { size: 12, color });
    };
    function drawScene() {
      // the phasor / impedance triangle on the left; a = resistive side, b = net reactive side (up = inductive)
      let a = 0;
      let b = 0;
      let unit = '';
      if (lvl.kind === 'rc') {
        a = lvl.r;
        b = -lvl.xc;
        unit = 'Ω';
      } else if (lvl.kind === 'lcr') {
        a = lvl.r;
        b = lvl.xl - lvl.xc;
        unit = 'Ω';
      } else if (lvl.kind === 'voltages') {
        a = lvl.vr;
        b = lvl.vl - lvl.vc;
        unit = 'V';
      } else {
        a = lvl.r;
        b = lvl.xl;
        unit = 'Ω';
      }
      const scale = 150 / Math.max(Math.abs(a), Math.abs(b), 1);
      const f = runT === null ? 0.55 : 0.55 + 0.45 * ease(Math.min(1, runT / RUN));
      const ox = 70;
      const oy = 180;
      arrow(ox, oy, a * scale * f, 0, col.text, `${fmt(a)} ${unit}`);
      arrow(ox + a * scale * f, oy, 0, -b * scale * f, '#c0392b', `${fmt(Math.abs(b))} ${unit}${b >= 0 ? ' (inductive)' : ' (capacitive)'}`);
      arrow(ox, oy, a * scale * f, -b * scale * f, col.accent, runT === null ? 'Z or V = ?' : `${fmt(Math.hypot(a, b))} ${unit}`);
      // the voltage and current waves, with the phase difference
      const gx = 330;
      const gw = 280;
      const gy = 150;
      const phi = Math.atan2(b, a);
      const ang = clock * 1.6;
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(gx + gw, gy);
      g.moveTo(gx, gy - 70);
      g.lineTo(gx, gy + 70);
      g.stroke();
      for (const [shift, color, name] of [[0, col.accent, 'v'], [-phi, '#c0392b', 'i']] as [number, string, string][]) {
        g.strokeStyle = color;
        g.lineWidth = 2.5;
        g.beginPath();
        for (let k = 0; k <= 120; k++) {
          const u = k / 120;
          const y = gy - Math.sin(ang - (1 - u) * 7 + shift) * 50;
          if (k) g.lineTo(gx + u * gw, y);
          else g.moveTo(gx + u * gw, y);
        }
        g.stroke();
        label(g, name, gx + gw + 14, gy - Math.sin(ang + shift) * 50, { size: 13, color });
      }
      label(g, `i ${b > 0 ? 'lags' : b < 0 ? 'leads' : 'is in phase with'} v by ${fmt(Math.abs((phi * 180) / Math.PI))}°`, gx + gw / 2, gy + 96, { size: 12, color: col.text });
      disc(g, gx, gy, 3, col.muted);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawScene();
      verdictLabel(lvl.kind === 'rc' ? `Z = ${fmt(lvl.z)} Ω` : lvl.kind === 'lcr' ? `Z = ${fmt(lvl.z)} Ω, φ = ${fmt(lvl.phase)}°` : lvl.kind === 'voltages' ? `V = ${fmt(lvl.source)} V` : `Z = ${fmt(lvl.z)} Ω, cos φ = ${fmt(lvl.pf)}`, 320, 326);
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
