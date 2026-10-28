import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeArc, judgeAxis, judgeConcentric, judgeElement, judgeLoop, axisUT, starsFor } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 3;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const CX = 320;
const CY = 175;

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
    let outPick: boolean | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A current in a wire, loop or coil, with flowing charge and the magnetic field it makes shown as dots or crosses.' });
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
    const dirChoice = () => {
      const opts: [boolean, string][] = [[true, 'Field points out of the page'], [false, 'Field points into the page']];
      const btns: HTMLElement[] = opts.map(([v, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': text, 'aria-pressed': 'false', onclick: () => {
          outPick = v;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, v ? 'Out of the page' : 'Into the page');
        return b;
      });
      return h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Direction'), ...btns);
    };
    const needDir = () => {
      if (outPick === null) {
        freeNote('Choose whether the field points out of the page or into it.');
        return false;
      }
      return true;
    };

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'element') {
      const bIn = field('Field in nT', 'dB = ? nT');
      const run = () => {
        if (finished || busy()) return;
        const b = num(bIn);
        if (b === null || b <= 0) return freeNote('Enter the field as a positive number of nT.');
        if (!needDir()) return;
        const res = judgeElement(lvl, b, outPick as boolean);
        verdict(res.ok);
        if (res.ok) return succeed(`dB = ${fmt(lvl.nt)} nT, ${lvl.out ? 'out of' : 'into'} the page.`);
        const parts: string[] = [];
        if (!res.bOk) parts.push('The size is not right: dB = (μ₀/4π) I dl sin θ / r², with the lengths in metres. Give it in nT.');
        if (!res.dirOk) parts.push('The direction is not right: it is the direction of dl × r, found with the right-hand rule.');
        miss(parts.join(' '));
      };
      controls.append(row('Field', bIn, 'nT'), dirChoice(), actionBtn('Measure the field', 'Measure the field', run));
      hint.textContent = `Current ${lvl.i} A, element length ${lvl.dlCm} cm pointing ${lvl.dlRight ? 'right' : 'left'}. The point is ${lvl.rM} m away, ${lvl.pointAbove ? 'above' : 'below'} the element, at ${lvl.theta}° to it. μ₀/4π = 10⁻⁷ T m/A.`;
    }
    if (lvl.kind === 'loop') {
      const bIn = field('Field at the centre in µT', 'B = ? µT');
      const run = () => {
        if (finished || busy()) return;
        const b = num(bIn);
        if (b === null || b <= 0) return freeNote('Enter the field as a positive number of µT.');
        if (!needDir()) return;
        const res = judgeLoop(lvl, b, outPick as boolean);
        verdict(res.ok);
        if (res.ok) return succeed(`B = ${fmt(lvl.ut)} µT, ${lvl.out ? 'out of' : 'into'} the page.`);
        const parts: string[] = [];
        if (!res.bOk) parts.push('The field is not right: every turn adds its own field at the centre. Give it in µT.');
        if (!res.dirOk) parts.push('The direction is not right: curl the fingers of the right hand along the current.');
        miss(parts.join(' '));
      };
      controls.append(row('Field at centre', bIn, 'µT'), dirChoice(), actionBtn('Measure the field', 'Measure the field', run));
      hint.textContent = `${lvl.n} turn${lvl.n > 1 ? 's' : ''} of radius ${lvl.rCm} cm carrying ${lvl.i} A, going ${lvl.clockwise ? 'clockwise' : 'anticlockwise'}. μ₀ = 4π × 10⁻⁷ T m/A.`;
    }
    if (lvl.kind === 'arc') {
      const bIn = field('Field at the centre of the arc in µT', 'B = ? µT');
      const run = () => {
        if (finished || busy()) return;
        const b = num(bIn);
        if (b === null || b <= 0) return freeNote('Enter the field as a positive number of µT.');
        if (!needDir()) return;
        const res = judgeArc(lvl, b, outPick as boolean);
        verdict(res.ok);
        if (res.ok) return succeed(`B = ${fmt(lvl.ut)} µT, ${lvl.out ? 'out of' : 'into'} the page.`);
        const parts: string[] = [];
        if (!res.bOk) parts.push('The field is not right: only the curved part contributes, and only in proportion to how much of the circle it is. What do the straight leads add?');
        if (!res.dirOk) parts.push('The direction is not right: curl the fingers of the right hand along the current in the arc.');
        miss(parts.join(' '));
      };
      controls.append(row('Field at centre', bIn, 'µT'), dirChoice(), actionBtn('Measure the field', 'Measure the field', run));
      hint.textContent = `The arc has radius ${lvl.rCm} cm and is ${lvl.frac === 0.5 ? 'a semicircle' : lvl.frac === 0.25 ? 'a quarter circle' : 'three quarters of a circle'}. Current ${lvl.i} A, ${lvl.clockwise ? 'clockwise' : 'anticlockwise'}.`;
    }
    if (lvl.kind === 'axis') {
      const bIn = field('Field on the axis in µT', 'B = ? µT');
      const rIn = field('Fraction of the centre field', 'B/B₀ = ?');
      const run = () => {
        if (finished || busy()) return;
        const b = num(bIn);
        const r = num(rIn);
        if (b === null || r === null || b <= 0 || r <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeAxis(lvl, b, r);
        verdict(res.ok);
        if (res.ok) return succeed(`B = ${fmt(lvl.ut)} µT, which is ${fmt(lvl.ratio)} of the centre field.`);
        const parts: string[] = [];
        if (!res.bOk) parts.push('The axis field is not right: at a distance x the field is reduced by the factor R³/(R² + x²)^(3/2).');
        if (!res.rOk) parts.push('The fraction is not right: divide the axis field by the field at the centre of the same coil.');
        miss(parts.join(' '));
      };
      controls.append(row('Axis field', bIn, 'µT'), row('Fraction of centre', rIn, ''), actionBtn('Measure the field', 'Measure the field', run));
      hint.textContent = `${lvl.n} turns of radius ${lvl.rCm} cm carrying ${lvl.i} A. The point is ${lvl.xCm} cm from the centre, on the axis.`;
    }
    if (lvl.kind === 'concentric') {
      const bIn = field('Net field in µT', 'B = ? µT');
      const run = () => {
        if (finished || busy()) return;
        const b = num(bIn);
        if (b === null || b <= 0) return freeNote('Enter the field as a positive number of µT.');
        if (!needDir()) return;
        const res = judgeConcentric(lvl, b, outPick as boolean);
        verdict(res.ok);
        if (res.ok) return succeed(`B = ${fmt(lvl.ut)} µT, ${lvl.out ? 'out of' : 'into'} the page.`);
        const parts: string[] = [];
        if (!res.bOk) parts.push(lvl.same ? 'The net field is not right: the two fields point the same way, so they add.' : 'The net field is not right: the two fields point opposite ways, so find the difference.');
        if (!res.dirOk) parts.push('The direction is not right: the loop with the larger field decides it.');
        miss(parts.join(' '));
      };
      controls.append(row('Net field', bIn, 'µT'), dirChoice(), actionBtn('Measure the field', 'Measure the field', run));
      hint.textContent = `Inner loop ${lvl.r1Cm} cm with ${lvl.i1} A, outer loop ${lvl.r2Cm} cm with ${lvl.i2} A, ${lvl.same ? 'same sense' : 'opposite senses'}.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const symbol = (x: number, y: number, out: boolean, size: number, color: string) => {
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(x, y, size, 0, Math.PI * 2);
      g.stroke();
      if (out) disc(g, x, y, size * 0.28, color);
      else {
        g.beginPath();
        g.moveTo(x - size * 0.6, y - size * 0.6);
        g.lineTo(x + size * 0.6, y + size * 0.6);
        g.moveTo(x + size * 0.6, y - size * 0.6);
        g.lineTo(x - size * 0.6, y + size * 0.6);
        g.stroke();
      }
    };
    const arrowHead = (x: number, y: number, ux: number, uy: number, color: string) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(x + ux * 8, y + uy * 8);
      g.lineTo(x - uy * 6, y + ux * 6);
      g.lineTo(x + uy * 6, y - ux * 6);
      g.fill();
    };
    /** Specks circulating round a circle or an arc of it. dir = +1 clockwise on screen. */
    const circulate = (cx: number, cy: number, r: number, a0: number, span: number, dir: number, n = 14, speed = 0.18) => {
      g.fillStyle = POS;
      g.globalAlpha = 0.9;
      for (let k = 0; k < n; k++) {
        const t = ((((clock * speed + k / n) % 1) + 1) % 1);
        const a = a0 + (dir > 0 ? t : 1 - t) * span;
        g.beginPath();
        g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));
    const showField = (x: number, y: number, out: boolean, size = 16) => {
      const f = runF();
      if (f <= 0) {
        label(g, '?', x, y, { size: 22, color: col.accent });
        return;
      }
      g.globalAlpha = Math.min(1, f * 1.5);
      symbol(x, y, out, size * (0.4 + 0.6 * f), col.accent);
      g.globalAlpha = 1;
    };

    function drawElement() {
      if (lvl.kind !== 'element') return;
      const sx = lvl.dlRight ? 1 : -1;
      const ex = 200;
      const ey = CY;
      // the element, with the current flowing along it
      g.strokeStyle = '#b87333';
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(ex - 20, ey);
      g.lineTo(ex + 20, ey);
      g.stroke();
      g.fillStyle = POS;
      for (let k = 0; k < 4; k++) {
        const t = (((clock * 0.6 + k / 4) % 1) + 1) % 1;
        disc(g, ex - sx * 20 + sx * 40 * t, ey, 2.8, POS);
      }
      arrowHead(ex + sx * 28, ey, sx, 0, col.text);
      label(g, 'I dl', ex, ey + 26, { size: 12, color: col.text });
      const th = (lvl.theta * Math.PI) / 180;
      const rpx = 230;
      const px = ex + sx * Math.cos(th) * rpx;
      const py = ey + (lvl.pointAbove ? -1 : 1) * Math.sin(th) * rpx;
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.setLineDash([5, 5]);
      g.beginPath();
      g.moveTo(ex, ey);
      g.lineTo(px, py);
      g.stroke();
      g.beginPath();
      g.moveTo(ex, ey);
      g.lineTo(ex + sx * 70, ey);
      g.stroke();
      g.setLineDash([]);
      label(g, `r = ${lvl.rM} m`, (ex + px) / 2, (ey + py) / 2 + (lvl.pointAbove ? -14 : 16), { size: 12, color: col.muted });
      label(g, `${lvl.theta}°`, ex + sx * 92, ey + (lvl.pointAbove ? -12 : 14), { size: 12, color: col.muted });
      disc(g, px, py, 4, col.text);
      showField(px + sx * 28, py, lvl.out);
      verdictLabel(`dB = ${fmt(lvl.nt)} nT`, CX, 30);
    }
    function drawLoop() {
      if (lvl.kind !== 'loop') return;
      const r = Math.min(110, 55 + lvl.rCm * 3.2);
      const turns = Math.min(5, 1 + Math.round(Math.log2(lvl.n + 1) * 0.7));
      for (let t = 0; t < turns; t++) {
        const rr = r + t * 3;
        g.strokeStyle = '#b87333';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(CX, CY, rr, 0, Math.PI * 2);
        g.stroke();
      }
      circulate(CX, CY, r, 0, Math.PI * 2, lvl.clockwise ? 1 : -1, 16);
      // an arrowhead on the loop showing the sense
      const a = lvl.clockwise ? 0.3 : -0.3;
      arrowHead(CX + Math.cos(a - Math.PI / 2) * r, CY + Math.sin(a - Math.PI / 2) * r, lvl.clockwise ? 1 : -1, 0, col.text);
      label(g, `${lvl.n} turn${lvl.n > 1 ? 's' : ''}, ${lvl.i} A`, CX, CY - r - 16, { size: 13, color: col.muted });
      showField(CX, CY, lvl.out, 20);
      verdictLabel(`B = ${fmt(lvl.ut)} µT`, CX, 30);
    }
    function drawArc() {
      if (lvl.kind !== 'arc') return;
      const r = Math.min(100, 45 + lvl.rCm * 8);
      const span = lvl.frac * Math.PI * 2;
      const a0 = -Math.PI / 2 - span / 2;
      const a1 = a0 + span;
      const dir = lvl.clockwise ? 1 : -1;
      // the arc
      g.strokeStyle = '#b87333';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(CX, CY, r, a0, a1);
      g.stroke();
      // the straight leads run radially outwards from each end, in line with the centre
      const lead = (a: number) => {
        const x0 = CX + Math.cos(a) * r;
        const y0 = CY + Math.sin(a) * r;
        const x1 = CX + Math.cos(a) * (r + 70);
        const y1 = CY + Math.sin(a) * (r + 70);
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
        return [x0, y0, x1, y1];
      };
      lead(a0);
      lead(a1);
      circulate(CX, CY, r, a0, span, dir, 10, 0.22);
      disc(g, CX, CY, 3, col.muted);
      label(g, `R = ${lvl.rCm} cm`, CX, CY + 26, { size: 12, color: col.muted });
      showField(CX + 44, CY, lvl.out, 14);
      verdictLabel(`B = ${fmt(lvl.ut)} µT`, CX, 30);
    }
    function drawAxis() {
      if (lvl.kind !== 'axis') return;
      // the coil seen edge-on on the left, the axis, the point, and a graph of B along the axis
      const R = lvl.rCm;
      const x0 = 110;
      const scale = 8;
      g.strokeStyle = '#b87333';
      g.lineWidth = 5;
      g.beginPath();
      g.ellipse(x0, 90, 10, 50, 0, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x0, 90);
      g.lineTo(580, 90);
      g.stroke();
      const px = x0 + lvl.xCm * scale * 0.8;
      disc(g, px, 90, 5, col.accent);
      label(g, `x = ${lvl.xCm} cm`, px, 70, { size: 12, color: col.accent });
      // B(x) graph
      const gx = x0;
      const gy = 300;
      g.strokeStyle = col.muted;
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(580, gy);
      g.moveTo(gx, gy);
      g.lineTo(gx, 140);
      g.stroke();
      const f = runF();
      g.strokeStyle = col.accent;
      g.lineWidth = 2.5;
      g.beginPath();
      const nPts = 40;
      for (let k = 0; k <= nPts * Math.max(0.05, f || 1); k++) {
        const xc = (k / nPts) * 40;
        const b = axisUT(lvl.n, lvl.i, R, xc) / lvl.centreUt;
        const sx = gx + xc * scale * 0.8 * 1.45;
        const sy = gy - b * 140;
        if (k) g.lineTo(sx, sy);
        else g.moveTo(sx, sy);
      }
      g.stroke();
      const mx = gx + lvl.xCm * scale * 0.8 * 1.45;
      const my = gy - lvl.ratio * 140;
      disc(g, mx, my, 5, col.accent);
      g.strokeStyle = col.muted;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(mx, my);
      g.lineTo(mx, gy);
      g.moveTo(mx, my);
      g.lineTo(gx, my);
      g.stroke();
      g.setLineDash([]);
      label(g, 'B / B₀ along the axis', 360, 150, { size: 12, color: col.muted });
      label(g, '1', gx - 10, gy - 140, { size: 11, color: col.muted });
      // current flows round the coil: seen edge-on, it runs up one side and down the other
      for (let k = 0; k < 5; k++) {
        const t = (((clock * 0.5 + k / 5) % 1) + 1) % 1;
        disc(g, x0 - 9, 140 - 100 * t, 2.8, POS);
        disc(g, x0 + 9, 40 + 100 * t, 2.8, POS);
      }
      verdictLabel(`B = ${fmt(lvl.ut)} µT (${fmt(lvl.ratio)} of the centre)`, 420, 30);
    }
    function drawConcentric() {
      if (lvl.kind !== 'concentric') return;
      const r1 = 36 + lvl.r1Cm * 4;
      const r2 = 36 + lvl.r2Cm * 4;
      g.strokeStyle = '#b87333';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(CX, CY, r1, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(CX, CY, r2, 0, Math.PI * 2);
      g.stroke();
      // the inner loop is anticlockwise (field out of the page); the outer one is the same or the opposite
      circulate(CX, CY, r1, 0, Math.PI * 2, -1, 10, 0.2);
      circulate(CX, CY, r2, 0, Math.PI * 2, lvl.same ? -1 : 1, 16, 0.14);
      label(g, `${lvl.i1} A`, CX + r1 + 4, CY - 10, { size: 12, color: col.text });
      label(g, `${lvl.i2} A`, CX + r2 + 4, CY - 10, { size: 12, color: col.text });
      label(g, lvl.same ? 'same sense' : 'opposite senses', CX, 32, { size: 13, color: col.muted });
      showField(CX, CY, lvl.out, 14);
      verdictLabel(`B = ${fmt(lvl.ut)} µT`, CX, 318);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawElement();
      drawLoop();
      drawArc();
      drawAxis();
      drawConcentric();
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
