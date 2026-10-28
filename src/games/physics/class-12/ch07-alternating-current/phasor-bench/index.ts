import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeBulb, judgeConvert, judgeCycle, judgeInstant, starsFor, type Phase } from './logic';

const W = 640;
const H = 340;
const REVEAL = 0.9;
const RUN = 3;
const GX = 330;
const GW = 280;
const GY = 130;

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
    let phasePick: Phase | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A phasor rotating in a circle, with the sine waves of voltage and current and the power drawn beside it.' });
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
    if (lvl.kind === 'bulb') {
      const rIn = field('Resistance in Ω', 'R = ? Ω');
      const vIn = field('Peak voltage in V', 'v m = ? V');
      const iIn = field('Rms current in A', 'I = ? A');
      const run = () => {
        if (finished || busy()) return;
        const r = num(rIn);
        const v = num(vIn);
        const i = num(iIn);
        if (!positive(r, v, i)) return freeNote('Enter all three as positive numbers.');
        const res = judgeBulb(lvl, r as number, v as number, i as number);
        verdict(res.ok);
        if (res.ok) return succeed(`R = ${fmt(lvl.r)} Ω, v_m = ${fmt(lvl.vm)} V, I = ${fmt(lvl.i)} A.`);
        const parts: string[] = [];
        if (!res.rOk) parts.push('The resistance is not right: the rating gives the power at the rms voltage, and P = V²/R.');
        if (!res.vOk) parts.push('The peak voltage is not right: the stated voltage is the rms value.');
        if (!res.iOk) parts.push('The rms current is not right: power is rms voltage times rms current.');
        miss(parts.join(' '));
      };
      controls.append(row('Resistance', rIn, 'Ω'), row('Peak voltage', vIn, 'V'), row('Rms current', iIn, 'A'), actionBtn('Light the bulb', 'Light the bulb', run));
      hint.textContent = `The bulb is rated ${lvl.p} W for a ${lvl.v} V supply.`;
    }
    if (lvl.kind === 'convert') {
      const vIn = field('Rms voltage in V', 'V rms = ? V');
      const iIn = field('Peak current in A', 'i m = ? A');
      const run = () => {
        if (finished || busy()) return;
        const v = num(vIn);
        const i = num(iIn);
        if (!positive(v, i)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeConvert(lvl, v as number, i as number);
        verdict(res.ok);
        if (res.ok) return succeed(`V_rms = ${fmt(lvl.vRms)} V and i_m = ${fmt(lvl.iPeak)} A.`);
        const parts: string[] = [];
        if (!res.vOk) parts.push('The rms voltage is not right: the rms value of a sine wave is smaller than its peak.');
        if (!res.iOk) parts.push('The peak current is not right: the peak is larger than the rms value.');
        miss(parts.join(' '));
      };
      controls.append(row('Rms voltage', vIn, 'V'), row('Peak current', iIn, 'A'), actionBtn('Convert', 'Convert', run));
      hint.textContent = `The peak voltage is ${lvl.vm} V and the rms current is ${lvl.iRms} A.`;
    }
    if (lvl.kind === 'cycle') {
      const iIn = field('Rms current in A', 'I = ? A');
      const aIn = field('Average power in W', 'P avg = ? W');
      const pIn = field('Peak power in W', 'P peak = ? W');
      const run = () => {
        if (finished || busy()) return;
        const i = num(iIn);
        const a = num(aIn);
        const p = num(pIn);
        if (!positive(i, a, p)) return freeNote('Enter all three as positive numbers.');
        const res = judgeCycle(lvl, i as number, a as number, p as number);
        verdict(res.ok);
        if (res.ok) return succeed(`I = ${fmt(lvl.i)} A, average ${fmt(lvl.pAvg)} W, peak ${fmt(lvl.pPeak)} W.`);
        const parts: string[] = [];
        if (!res.iOk) parts.push('The rms current is not right: it is the rms voltage over the resistance.');
        if (!res.aOk) parts.push('The average power is not right: it is the rms voltage times the rms current.');
        if (!res.pOk) parts.push('The peak power is not right: at the peak of the cycle both v and i are at their maximum.');
        miss(parts.join(' '));
      };
      controls.append(row('Rms current', iIn, 'A'), row('Average power', aIn, 'W'), row('Peak power', pIn, 'W'), actionBtn('Run the cycle', 'Run the cycle', run));
      hint.textContent = `A ${lvl.r} Ω resistor on a ${lvl.v} V rms, ${lvl.hz} Hz supply.`;
    }
    if (lvl.kind === 'instant') {
      const vIn = field('Instantaneous voltage in V', 'v = ? V');
      const opts: [Phase, string, string][] = [['inphase', 'Current is in phase with the voltage', 'In phase'], ['lags', 'Current lags the voltage', 'Lags'], ['leads', 'Current leads the voltage', 'Leads']];
      const btns: HTMLElement[] = opts.map(([v, aria, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': aria, 'aria-pressed': 'false', onclick: () => {
          phasePick = v;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const v = num(vIn);
        if (!positive(v)) return freeNote('Enter the voltage as a positive number of volts.');
        if (phasePick === null) return freeNote('Choose how the current in the resistor is related to the voltage.');
        const res = judgeInstant(lvl, v as number, phasePick);
        verdict(res.ok);
        if (res.ok) return succeed(`v = ${fmt(lvl.vNow)} V, and the current is in phase.`);
        const parts: string[] = [];
        if (!res.vOk) parts.push('The voltage is not right: the supply voltage is given as an rms value, and the instantaneous voltage is the peak times the sine.');
        if (!res.pOk) parts.push('The phase is not right: for a resistor, Ohm’s law holds at every instant.');
        miss(parts.join(' '));
      };
      controls.append(row('Voltage now', vIn, 'V'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Current'), ...btns), actionBtn('Read the phasor', 'Read the phasor', run));
      hint.textContent = `${lvl.v} V rms, ${lvl.hz} Hz. Find v when ωt = ${lvl.phase}°.`;
    }

    // ---- drawing --------------------------------------------------------------------------------------------------------
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    function drawScene() {
      const speed = lvl.kind === 'cycle' || lvl.kind === 'instant' ? 1.8 : 1.4;
      let ang = clock * speed;
      if (lvl.kind === 'instant') ang = (lvl.phase * Math.PI) / 180 + (runT === null ? Math.sin(clock) * 0.15 : 0);
      // the phasor circle
      const cx = 140;
      const cy = 150;
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(cx, cy, 80, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(cx - 95, cy);
      g.lineTo(cx + 95, cy);
      g.moveTo(cx, cy - 95);
      g.lineTo(cx, cy + 95);
      g.stroke();
      g.strokeStyle = col.accent;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(ang) * 80, cy - Math.sin(ang) * 80);
      g.stroke();
      g.strokeStyle = col.good;
      g.setLineDash([4, 4]);
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(cx + Math.cos(ang) * 80, cy - Math.sin(ang) * 80);
      g.lineTo(cx + Math.cos(ang) * 80, cy);
      g.stroke();
      g.setLineDash([]);
      label(g, 'phasor: v_m rotates, v is its projection', cx, 262, { size: 11, color: col.muted });
      // the traces: voltage and current in phase, and power for the cycle level
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(GX, GY);
      g.lineTo(GX + GW, GY);
      g.moveTo(GX, GY - 80);
      g.lineTo(GX, GY + 80);
      g.stroke();
      g.strokeStyle = col.accent;
      g.lineWidth = 2.5;
      g.beginPath();
      for (let k = 0; k <= 120; k++) {
        const u = k / 120;
        const ph = ang - (1 - u) * 7;
        const y = GY - Math.sin(ph) * 60;
        if (k) g.lineTo(GX + u * GW, y);
        else g.moveTo(GX + u * GW, y);
      }
      g.stroke();
      label(g, 'v and i (in phase for a resistor)', GX + GW / 2, GY - 92, { size: 11, color: col.muted });
      if (lvl.kind === 'cycle') {
        const py = 270;
        g.strokeStyle = '#c0392b';
        g.lineWidth = 2.5;
        g.beginPath();
        for (let k = 0; k <= 120; k++) {
          const u = k / 120;
          const ph = ang - (1 - u) * 7;
          const y = py - Math.sin(ph) ** 2 * 60;
          if (k) g.lineTo(GX + u * GW, y);
          else g.moveTo(GX + u * GW, y);
        }
        g.stroke();
        g.strokeStyle = col.good;
        g.setLineDash([5, 4]);
        g.beginPath();
        g.moveTo(GX, py - 30);
        g.lineTo(GX + GW, py - 30);
        g.stroke();
        g.setLineDash([]);
        label(g, 'power v i: always ≥ 0, average = half the peak', GX + GW / 2, py + 22, { size: 11, color: col.muted });
      }
      if (lvl.kind === 'bulb') {
        const lit = runT === null ? 0.2 : 1;
        disc(g, 480, 270, 24, `rgba(244,180,0,${0.15 + 0.85 * lit * (0.6 + 0.4 * Math.abs(Math.sin(ang)))})`);
        label(g, `${lvl.p} W, ${lvl.v} V`, 480, 308, { size: 12, color: col.text });
      }
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawScene();
      verdictLabel(lvl.kind === 'bulb' ? `R = ${fmt(lvl.r)} Ω, v_m = ${fmt(lvl.vm)} V` : lvl.kind === 'convert' ? `V_rms = ${fmt(lvl.vRms)} V, i_m = ${fmt(lvl.iPeak)} A` : lvl.kind === 'cycle' ? `average ${fmt(lvl.pAvg)} W` : `v = ${fmt(lvl.vNow)} V`, 320, 326);
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
