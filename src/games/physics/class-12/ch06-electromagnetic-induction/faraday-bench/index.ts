import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fluxMilli, fmt, judgeFlip, judgeFlux, judgeGraph, judgeSolenoid, starsFor } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 3;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const CX = 320;
const CY = 175;
const rad = (deg: number) => (deg * Math.PI) / 180;

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
    let largestPick: number | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A coil in a magnetic field whose flux changes, with a meter for the induced emf.' });
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

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'flux') {
      const change = lvl.mode === 'change';
      const aria = change ? 'Change in flux in mWb' : 'Flux in mWb';
      const fIn = field(aria, change ? 'ΔΦ = ? mWb' : 'Φ = ? mWb');
      const run = () => {
        if (finished || busy()) return;
        const v = num(fIn);
        if (v === null || (!change && v <= 0)) return freeNote(change ? 'Enter the change as a number, with its sign.' : 'Enter the flux as a positive number of mWb.');
        const ok = judgeFlux(lvl, v).ok;
        verdict(ok);
        if (ok) return succeed(change ? `ΔΦ = ${fmt(lvl.answer)} mWb.` : `Φ = ${fmt(lvl.answer)} mWb.`);
        miss(change ? 'That is not the change in flux: work out the flux in each orientation with Φ = BA cos θ, then subtract, keeping the sign.' : 'That is not the flux: it is B times A times the cosine of the angle between the field and the normal to the coil. Use A in m² and give mWb.');
      };
      controls.append(row(change ? 'Change in flux' : 'Flux', fIn, 'mWb'), actionBtn('Measure the flux', 'Measure the flux', run));
      hint.textContent = change ? `B = ${lvl.b} T, A = ${lvl.aCm2} cm². The normal turns from ${lvl.theta1}° to ${lvl.theta2}° from the field.` : `B = ${lvl.b} T, A = ${lvl.aCm2} cm², the normal makes ${lvl.theta1}° with the field.`;
    }
    if (lvl.kind === 'solenoid') {
      const eIn = field('Induced emf in µV', 'ε = ? µV');
      const run = () => {
        if (finished || busy()) return;
        const v = num(eIn);
        if (v === null || v <= 0) return freeNote('Enter the emf as a positive number of µV.');
        const ok = judgeSolenoid(lvl, v).ok;
        verdict(ok);
        if (ok) return succeed(`ε = ${fmt(lvl.microV)} µV.`);
        miss('That is not the induced emf: the flux through the loop is the field of the solenoid, μ₀nI, times the area of the loop, and the emf is its rate of change. Use turns per metre and area in m².');
      };
      controls.append(row('Induced emf', eIn, 'µV'), actionBtn('Change the current', 'Change the current', run));
      hint.textContent = `${lvl.nPerCm} turns per cm, loop area ${lvl.aCm2} cm². The current goes from ${lvl.i1} A to ${lvl.i2} A in ${lvl.dt} s.`;
    }
    if (lvl.kind === 'flip') {
      const eIn = field('Average emf in mV', 'ε = ? mV');
      const iIn = field('Average current in mA', 'I = ? mA');
      const run = () => {
        if (finished || busy()) return;
        const e = num(eIn);
        const i = num(iIn);
        if (e === null || i === null || e <= 0 || i <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeFlip(lvl, e, i);
        verdict(res.ok);
        if (res.ok) return succeed(`ε = ${fmt(lvl.emf)} mV and I = ${fmt(lvl.current)} mA.`);
        const parts: string[] = [];
        if (!res.eOk) parts.push('The emf is not right: the flux changes from +BA to −BA, and every turn has the same emf.');
        if (!res.iOk) parts.push('The current is not right: it is the emf divided by the resistance of the coil. Mind the units.');
        miss(parts.join(' '));
      };
      controls.append(row('Average emf', eIn, 'mV'), row('Average current', iIn, 'mA'), actionBtn('Turn the coil', 'Turn the coil', run));
      hint.textContent = `${lvl.n} turns of radius ${lvl.rCm} cm, resistance ${lvl.r} Ω, in a field of ${lvl.bGauss} G (1 G = 10⁻⁴ T), turned through 180° in ${lvl.t} s.`;
    }
    if (lvl.kind === 'graph') {
      const eIn = field('Emf in the chosen segment in mV', 'ε = ? mV');
      const btns: HTMLElement[] = [1, 2, 3].map((k) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': `Segment ${k} has the largest emf`, 'aria-pressed': 'false', onclick: () => {
          largestPick = k;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, `Segment ${k}`);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const e = num(eIn);
        if (e === null || e <= 0) return freeNote('Enter the emf as a positive number of mV.');
        if (largestPick === null) return freeNote('Choose the segment with the largest emf.');
        const res = judgeGraph(lvl, e, largestPick);
        verdict(res.ok);
        if (res.ok) return succeed(`${lvl.emf} mV in segment ${lvl.segment}, and segment ${lvl.largest} is the largest.`);
        const parts: string[] = [];
        if (!res.eOk) parts.push('The emf is not right: it is the slope of the graph, in mWb per second.');
        if (!res.lOk) parts.push('The segment is not right: the largest emf is where the graph is steepest, up or down.');
        miss(parts.join(' '));
      };
      controls.append(row(`Segment ${lvl.segment}`, eIn, 'mV'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Largest emf'), ...btns), actionBtn('Read the graph', 'Read the graph', run));
      hint.textContent = `Flux (mWb) at 0, 1, 2 and 3 s: ${lvl.flux.join(', ')}. Find the emf in segment ${lvl.segment}.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const arrow = (x: number, y: number, dx: number, color: string) => {
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + dx, y);
      g.stroke();
      g.beginPath();
      g.moveTo(x + dx + 7, y);
      g.lineTo(x + dx - 1, y - 4);
      g.lineTo(x + dx - 1, y + 4);
      g.fill();
    };
    const fieldArrows = () => {
      for (let k = 0; k < 5; k++) {
        const y = 60 + k * 55;
        const t = (((clock * 0.2 + k * 0.13) % 1) + 1) % 1;
        g.globalAlpha = 0.45;
        arrow(40 + t * 70, y, 44, col.muted);
        g.globalAlpha = 1;
      }
      label(g, 'B', 40, 34, { size: 13, color: col.muted });
    };
    /** A coil seen edge-on: its width follows |cos| of the angle between the normal and the field. */
    const coil = (x: number, y: number, thetaDeg: number, size = 70) => {
      const nx = Math.cos(rad(thetaDeg));
      const ny = -Math.sin(rad(thetaDeg));
      g.strokeStyle = '#b87333';
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(x + ny * size, y - nx * size);
      g.lineTo(x - ny * size, y + nx * size);
      g.stroke();
      g.strokeStyle = col.text;
      g.fillStyle = col.text;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + nx * 60, y + ny * 60);
      g.stroke();
      label(g, 'n', x + nx * 76, y + ny * 76, { size: 12, color: col.text });
    };
    const meter = (x: number, y: number, value: number, text: string) => {
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.strokeRect(x - 100, y - 14, 200, 28);
      g.beginPath();
      g.moveTo(x, y - 14);
      g.lineTo(x, y + 14);
      g.stroke();
      const sw = Math.max(-1, Math.min(1, value)) * 96;
      g.fillStyle = POS;
      g.globalAlpha = 0.8;
      g.fillRect(sw >= 0 ? x : x + sw, y - 10, Math.abs(sw), 20);
      g.globalAlpha = 1;
      label(g, text, x, y + 30, { size: 12, color: col.text });
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    function drawFlux() {
      if (lvl.kind !== 'flux') return;
      fieldArrows();
      const f = runF();
      const th = lvl.mode === 'change' ? lvl.theta1 + (lvl.theta2 - lvl.theta1) * f : lvl.theta1;
      coil(CX, CY, th);
      label(g, `θ = ${fmt(th)}°`, CX + 110, CY - 70, { size: 13, color: col.muted });
      const phi = fluxMilli(lvl.b, lvl.aCm2, th);
      meter(CX, 300, phi / (lvl.b * lvl.aCm2 * 0.1 + 1e-9), `Φ now ${fmt(phi)} mWb`);
      verdictLabel(lvl.mode === 'flux' ? `Φ = ${fmt(lvl.answer)} mWb` : `ΔΦ = ${fmt(lvl.answer)} mWb`, CX, 30);
    }
    function drawSolenoid() {
      if (lvl.kind !== 'solenoid') return;
      const f = runF();
      const x0 = 110;
      const x1 = 530;
      g.strokeStyle = '#b87333';
      g.lineWidth = 3;
      for (let k = 0; k < 20; k++) {
        g.beginPath();
        g.ellipse(x0 + ((k + 0.5) / 20) * (x1 - x0), 130, 6, 52, 0, 0, Math.PI * 2);
        g.stroke();
      }
      // the small loop inside, and the field arrows whose density follows the current
      g.strokeStyle = col.accent;
      g.lineWidth = 4;
      g.beginPath();
      g.ellipse(CX, 130, 5, 24, 0, 0, Math.PI * 2);
      g.stroke();
      const cur = lvl.i1 + (lvl.i2 - lvl.i1) * f;
      const nArrows = Math.round(3 + cur * 1.2);
      for (let k = 0; k < nArrows; k++) {
        const y = 130 - 40 + (k / Math.max(1, nArrows - 1)) * 80;
        const t = (((clock * 0.4 + k * 0.1) % 1) + 1) % 1;
        g.globalAlpha = 0.5;
        arrow(x0 + 10 + t * 300, y, 40, col.accent);
        g.globalAlpha = 1;
      }
      label(g, `I = ${fmt(cur)} A`, CX, 215, { size: 14, color: col.text });
      meter(CX, 280, f > 0 && f < 1 ? 0.6 : 0, f > 0 && f < 1 ? 'emf flows while I changes' : f >= 1 ? 'steady: no emf' : 'steady');
      verdictLabel(`ε = ${fmt(lvl.microV)} µV`, CX, 30);
    }
    function drawFlip() {
      if (lvl.kind !== 'flip') return;
      fieldArrows();
      const f = runF();
      const th = 180 * f;
      coil(CX, CY, th);
      meter(CX, 290, f > 0 && f < 1 ? Math.sin(f * Math.PI) : 0, f > 0 && f < 1 ? `emf ≈ ${fmt(lvl.emf)} mV on average` : 'at rest');
      label(g, `${lvl.n} turns`, CX + 100, CY + 80, { size: 12, color: col.muted });
      verdictLabel(`ε = ${fmt(lvl.emf)} mV, I = ${fmt(lvl.current)} mA`, CX, 30);
    }
    function drawGraph() {
      if (lvl.kind !== 'graph') return;
      const f = runF();
      const gx = 110;
      const gy = 280;
      const sx = 120;
      const sy = 16;
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(gx + 3 * sx + 40, gy);
      g.moveTo(gx, gy);
      g.lineTo(gx, 60);
      g.stroke();
      label(g, 't (s)', gx + 3 * sx + 40, gy + 14, { size: 11, color: col.muted });
      label(g, 'Φ (mWb)', gx, 48, { size: 11, color: col.muted });
      lvl.flux.forEach((v, k) => {
        label(g, String(k), gx + k * sx, gy + 14, { size: 11, color: col.muted });
        disc(g, gx + k * sx, gy - v * sy, 4, col.accent);
      });
      for (let k = 1; k <= 3; k++) {
        const hot = k === lvl.segment;
        g.strokeStyle = hot ? col.accent : col.text;
        g.lineWidth = hot ? 4 : 2.5;
        g.beginPath();
        g.moveTo(gx + (k - 1) * sx, gy - lvl.flux[k - 1] * sy);
        g.lineTo(gx + k * sx, gy - lvl.flux[k] * sy);
        g.stroke();
        label(g, `${k}`, gx + (k - 0.5) * sx, gy - ((lvl.flux[k] + lvl.flux[k - 1]) / 2) * sy - 14, { size: 12, color: hot ? col.accent : col.muted });
      }
      // the marker running along and the emf it sees
      const tt = f * 3;
      const k = Math.min(2, Math.floor(tt));
      const a = lvl.flux[k];
      const b = lvl.flux[k + 1];
      const mx = gx + tt * sx;
      const my = gy - (a + (b - a) * (tt - k)) * sy;
      if (runT !== null) {
        disc(g, mx, my, 6, POS);
        label(g, `ε = ${Math.abs(b - a)} mV`, mx, my - 18, { size: 12, color: POS });
      }
      verdictLabel(`segment ${lvl.largest} is the steepest`, 400, 40);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawFlux();
      drawSolenoid();
      drawFlip();
      drawGraph();
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
