import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeCapacitor, judgeFrequency, judgeInductor, judgePower, starsFor, type Brightness, type Lead } from './logic';

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
    let glowPick: Brightness | null = null;
    let leadPick: Lead | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'An inductor or capacitor on an AC source, with the voltage and current waves showing their phase difference.' });
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
    const choice = <T extends string>(name: string, opts: [T, string, string][], onPick: (v: T) => void) => {
      const btns: HTMLElement[] = opts.map(([v, aria, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': aria, 'aria-pressed': 'false', onclick: () => {
          onPick(v);
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      return h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), ...btns);
    };

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'inductor') {
      const xIn = field('Inductive reactance in Ω', 'X_L = ? Ω');
      const iIn = field('Rms current in A', 'I = ? A');
      const run = () => {
        if (finished || busy()) return;
        const x = num(xIn);
        const i = num(iIn);
        if (!positive(x, i)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeInductor(lvl, x as number, i as number);
        verdict(res.ok);
        if (res.ok) return succeed(`X_L = ${fmt(lvl.x)} Ω and I = ${fmt(lvl.i)} A.`);
        const parts: string[] = [];
        if (!res.xOk) parts.push('The reactance is not right: X_L = ωL with ω = 2πf and L in henry.');
        if (!res.iOk) parts.push('The current is not right: it is the rms voltage divided by the reactance.');
        miss(parts.join(' '));
      };
      controls.append(row('Reactance', xIn, 'Ω'), row('Rms current', iIn, 'A'), actionBtn('Switch on the source', 'Switch on the source', run));
      hint.textContent = `A ${lvl.lMilliH} mH inductor on a ${lvl.v} V rms, ${lvl.hz} Hz source.`;
    }
    if (lvl.kind === 'capacitor') {
      const xIn = field('Capacitive reactance in Ω', 'X_C = ? Ω');
      const iIn = field('Rms current in A', 'I = ? A');
      const run = () => {
        if (finished || busy()) return;
        const x = num(xIn);
        const i = num(iIn);
        if (!positive(x, i)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeCapacitor(lvl, x as number, i as number);
        verdict(res.ok);
        if (res.ok) return succeed(`X_C = ${fmt(lvl.x)} Ω and I = ${fmt(lvl.i)} A.`);
        const parts: string[] = [];
        if (!res.xOk) parts.push('The reactance is not right: X_C = 1/ωC with ω = 2πf and C in farad.');
        if (!res.iOk) parts.push('The current is not right: it is the rms voltage divided by the reactance.');
        miss(parts.join(' '));
      };
      controls.append(row('Reactance', xIn, 'Ω'), row('Rms current', iIn, 'A'), actionBtn('Switch on the source', 'Switch on the source', run));
      hint.textContent = `A ${lvl.cMicroF} µF capacitor on a ${lvl.v} V rms, ${lvl.hz} Hz source.`;
    }
    if (lvl.kind === 'frequency') {
      const xIn = field('Reactance at the new frequency in Ω', 'X′ = ? Ω');
      const run = () => {
        if (finished || busy()) return;
        const x = num(xIn);
        if (!positive(x)) return freeNote('Enter the reactance as a positive number of ohms.');
        if (glowPick === null) return freeNote('Choose whether the lamp glows brighter or dimmer.');
        const res = judgeFrequency(lvl, x as number, glowPick);
        verdict(res.ok);
        if (res.ok) return succeed(`X′ = ${fmt(lvl.x2)} Ω and the lamp glows ${lvl.glow}.`);
        const parts: string[] = [];
        if (!res.xOk) parts.push(lvl.element === 'inductor' ? 'The new reactance is not right: how does the reactance of an inductor depend on frequency?' : 'The new reactance is not right: how does the reactance of a capacitor depend on frequency?');
        if (!res.gOk) parts.push('The brightness is not right: compare the new reactance with the old one, and think about what that does to the current.');
        miss(parts.join(' '));
      };
      controls.append(row('New reactance', xIn, 'Ω'), choice<Brightness>('The lamp glows', [['brighter', 'The lamp glows brighter', 'Brighter'], ['dimmer', 'The lamp glows dimmer', 'Dimmer']], (v) => (glowPick = v)), actionBtn('Change the frequency', 'Change the frequency', run));
      hint.textContent = `The ${lvl.element} has a reactance of ${lvl.x1} Ω at ${lvl.hz1} Hz. The source goes to ${lvl.hz2} Hz.`;
    }
    if (lvl.kind === 'power') {
      const pIn = field('Average power in W', 'P = ? W');
      const run = () => {
        if (finished || busy()) return;
        const p = num(pIn);
        if (p === null || p < 0) return freeNote('Enter the power as a number of watts, zero or more.');
        if (leadPick === null) return freeNote('Choose whether the current lags or leads the voltage.');
        const res = judgePower(lvl, p, leadPick);
        verdict(res.ok);
        if (res.ok) return succeed(`No net power, and the current ${lvl.lead} the voltage.`);
        const parts: string[] = [];
        if (!res.pOk) parts.push('The net power is not right: the phase angle between v and i decides the average power, P = V I cos φ.');
        if (!res.lOk) parts.push(`The lag or lead is not right: ${lvl.element === 'inductor' ? 'an inductor opposes any change of current, which delays it' : 'the current charges the capacitor, so it reaches its peak before the voltage does'}.`);
        miss(parts.join(' '));
      };
      controls.append(row('Net power', pIn, 'W'), choice<Lead>('The current', [['lags', 'The current lags the voltage', 'Lags'], ['leads', 'The current leads the voltage', 'Leads']], (v) => (leadPick = v)), actionBtn('Run the cycle', 'Run the cycle', run));
      hint.textContent = `A pure ${lvl.element}, reactance ${lvl.x} Ω, on a ${lvl.v} V rms source.`;
    }

    // ---- drawing --------------------------------------------------------------------------------------------------------
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    function drawScene() {
      const element = lvl.kind === 'inductor' ? 'inductor' : lvl.kind === 'capacitor' ? 'capacitor' : lvl.element;
      const speed = lvl.kind === 'frequency' ? (runT === null ? 1.2 : Math.log2(lvl.hz2 / lvl.hz1) * 0.6 + 1.2) : 1.5;
      const ang = clock * Math.max(0.6, speed);
      const shift = element === 'inductor' ? -Math.PI / 2 : Math.PI / 2;
      // the element and a lamp on the left
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      if (element === 'inductor') {
        for (let k = 0; k < 6; k++) g.arc(70 + k * 20, 90, 10, Math.PI, 0);
      } else {
        g.moveTo(130, 60);
        g.lineTo(130, 120);
        g.moveTo(146, 60);
        g.lineTo(146, 120);
      }
      g.stroke();
      label(g, element, 130, 140, { size: 12, color: col.muted });
      const bright = lvl.kind === 'frequency' && runT !== null ? (lvl.glow === 'brighter' ? 1 : 0.2) : 0.5;
      disc(g, 130, 220, 20, `rgba(244,180,0,${0.15 + 0.85 * bright})`);
      label(g, 'lamp', 130, 254, { size: 11, color: col.muted });
      // the traces: v and i with the 90° shift
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(GX, GY);
      g.lineTo(GX + GW, GY);
      g.moveTo(GX, GY - 80);
      g.lineTo(GX, GY + 80);
      g.stroke();
      for (const [shiftBy, color, name] of [[0, col.accent, 'v'], [shift, '#c0392b', 'i']] as [number, string, string][]) {
        g.strokeStyle = color;
        g.lineWidth = 2.5;
        g.beginPath();
        for (let k = 0; k <= 120; k++) {
          const u = k / 120;
          const y = GY - Math.sin(ang - (1 - u) * 7 + shiftBy) * 60;
          if (k) g.lineTo(GX + u * GW, y);
          else g.moveTo(GX + u * GW, y);
        }
        g.stroke();
        label(g, name, GX + GW + 14, GY - Math.sin(ang + shiftBy) * 60, { size: 13, color });
      }
      label(g, 'voltage v and current i', GX + GW / 2, GY - 94, { size: 11, color: col.muted });
      if (runT !== null) label(g, element === 'inductor' ? 'i is a quarter cycle behind v' : 'i is a quarter cycle ahead of v', GX + GW / 2, GY + 100, { size: 12, color: col.text });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawScene();
      verdictLabel(lvl.kind === 'inductor' || lvl.kind === 'capacitor' ? `X = ${fmt(lvl.x)} Ω, I = ${fmt(lvl.i)} A` : lvl.kind === 'frequency' ? `X′ = ${fmt(lvl.x2)} Ω, ${lvl.glow}` : `P = 0, i ${lvl.lead} v`, 320, 326);
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
