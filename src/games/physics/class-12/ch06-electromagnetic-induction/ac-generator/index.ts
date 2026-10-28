import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgePeak, judgeRpm, judgeScale, starsFor } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 3.4;
const CY = 120;

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
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A coil rotating in a magnetic field with the sinusoidal emf it generates drawn as a trace.' });
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
    if (lvl.kind === 'peak') {
      const pIn = field('Peak emf in V', 'ε₀ = ? V');
      const iIn = field('Emf at the given angle in V', 'ε = ? V');
      const run = () => {
        if (finished || busy()) return;
        const p = num(pIn);
        const i = num(iIn);
        if (!positive(p, i)) return freeNote('Enter both answers as positive numbers.');
        const res = judgePeak(lvl, p as number, i as number);
        verdict(res.ok);
        if (res.ok) return succeed(`ε₀ = ${fmt(lvl.peak)} V and ε = ${fmt(lvl.inst)} V.`);
        const parts: string[] = [];
        if (!res.pOk) parts.push('The peak emf is not right: it is NBAω, with the area in m² and ω = 2πf in rad/s.');
        if (!res.iOk) parts.push('The emf at that angle is not right: the emf is zero when the plane of the coil is at right angles to the field, and follows a sine from there.');
        miss(parts.join(' '));
      };
      controls.append(row('Peak emf', pIn, 'V'), row(`At ${lvl.theta}°`, iIn, 'V'), actionBtn('Turn the coil', 'Turn the coil', run));
      hint.textContent = `${lvl.n} turns, area ${lvl.aCm2} cm², field ${lvl.b} T, turning at ${lvl.hz} Hz. The angle is measured from the position of zero emf.`;
    }
    if (lvl.kind === 'rpm') {
      const pIn = field('Peak emf in V', 'ε₀ = ? V');
      const tIn = field('Time from zero to the first peak in ms', 't = ? ms');
      const run = () => {
        if (finished || busy()) return;
        const p = num(pIn);
        const t = num(tIn);
        if (!positive(p, t)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeRpm(lvl, p as number, t as number);
        verdict(res.ok);
        if (res.ok) return succeed(`ε₀ = ${fmt(lvl.peak)} V, reached after ${fmt(lvl.quarterMs)} ms.`);
        const parts: string[] = [];
        if (!res.pOk) parts.push('The peak emf is not right: convert revolutions per minute to radians per second first.');
        if (!res.tOk) parts.push('The time is not right: the emf goes from zero to its peak in a fraction of one revolution. Give it in ms.');
        miss(parts.join(' '));
      };
      controls.append(row('Peak emf', pIn, 'V'), row('Time to the first peak', tIn, 'ms'), actionBtn('Turn the coil', 'Turn the coil', run));
      hint.textContent = `${lvl.n} turns, area ${lvl.aCm2} cm², field ${lvl.b} T, turning at ${lvl.rpm} revolutions per minute.`;
    }
    if (lvl.kind === 'scale') {
      const vIn = field('New peak emf in V', 'ε₀′ = ? V');
      const run = () => {
        if (finished || busy()) return;
        const v = num(vIn);
        if (!positive(v)) return freeNote('Enter the peak emf as a positive number of volts.');
        const ok = judgeScale(lvl, v as number).ok;
        verdict(ok);
        if (ok) return succeed(`ε₀′ = ${fmt(lvl.newPeak)} V.`);
        miss('That is not the new peak emf: it is proportional to the number of turns, to the speed and to the field, so the changes multiply.');
      };
      controls.append(row('New peak emf', vIn, 'V'), actionBtn('Change the generator', 'Change the generator', run));
      hint.textContent = `The peak emf was ${lvl.peak} V. Turns × ${lvl.nFactor}, speed × ${lvl.speedFactor}, field × ${lvl.bFactor}.`;
    }

    // ---- drawing --------------------------------------------------------------------------------------------------------
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const peakOf = () => (lvl.kind === 'scale' ? lvl.newPeak : lvl.peak);
    function drawGenerator() {
      const speedScale = lvl.kind === 'scale' ? (runT === null ? 1 : lvl.speedFactor) : lvl.kind === 'rpm' ? 1 + Math.log10(lvl.rpm / 300) : 1 + Math.log10(1 + lvl.hz) * 0.5;
      const ang = clock * 2.2 * speedScale;
      // the field arrows
      for (let k = 0; k < 4; k++) {
        const y = 50 + k * 45;
        g.strokeStyle = col.muted;
        g.globalAlpha = 0.45;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(40, y);
        g.lineTo(130, y);
        g.stroke();
        g.globalAlpha = 1;
      }
      label(g, 'B', 40, 30, { size: 12, color: col.muted });
      // the coil as a rotating rectangle, seen in perspective
      const w = Math.cos(ang) * 60;
      g.strokeStyle = '#b87333';
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(240 - w, CY - 55);
      g.lineTo(240 + w, CY - 55);
      g.lineTo(240 + w, CY + 55);
      g.lineTo(240 - w, CY + 55);
      g.closePath();
      g.stroke();
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(240, CY - 75);
      g.lineTo(240, CY + 75);
      g.stroke();
      // the trace of emf against time, scrolling
      const gx = 330;
      const gw = 280;
      const gy = CY;
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(gx + gw, gy);
      g.moveTo(gx, gy - 70);
      g.lineTo(gx, gy + 70);
      g.stroke();
      g.strokeStyle = col.accent;
      g.lineWidth = 2.5;
      g.beginPath();
      for (let k = 0; k <= 120; k++) {
        const u = k / 120;
        const phase = ang - (1 - u) * 6 * speedScale;
        const y = gy - Math.sin(phase) * 60;
        if (k) g.lineTo(gx + u * gw, y);
        else g.moveTo(gx + u * gw, y);
      }
      g.stroke();
      disc(g, gx + gw, gy - Math.sin(ang) * 60, 5, POS);
      label(g, `ε = ε₀ sin ωt, ε₀ = ${runT === null ? '?' : fmt(peakOf())} V`, gx + gw / 2, gy - 82, { size: 12, color: col.text });
      // a lamp that brightens with |emf|
      const bright = Math.abs(Math.sin(ang));
      disc(g, 240, 275, 18, `rgba(244,180,0,${0.15 + 0.85 * bright})`);
      label(g, 'lamp', 240, 305, { size: 11, color: col.muted });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawGenerator();
      verdictLabel(lvl.kind === 'peak' ? `ε₀ = ${fmt(lvl.peak)} V` : lvl.kind === 'rpm' ? `ε₀ = ${fmt(lvl.peak)} V, T/4 = ${fmt(lvl.quarterMs)} ms` : `ε₀′ = ${fmt(lvl.newPeak)} V`, 320, 322);
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
