import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { bridge, buildLevel, explainSolution, fmt, judgeCurrent, judgeMeter, judgeNull, meterDeflection, starsFor } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 2.6;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
type Pt = [number, number];

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
    let slider = lvl.kind === 'null' ? 125 : 50; // rheostat ohms, or jockey cm
    let needle = 0; // smoothed needle position, -1 to 1
    let bToD: boolean | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A Wheatstone bridge with a galvanometer needle that swings as the bridge goes out of balance.' });
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
    const sliderEl = (aria: string, min: number, max: number, step: number, value: number) => {
      const el = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value), 'aria-label': aria }) as HTMLInputElement;
      const sync = () => (slider = Number(el.value));
      el.addEventListener('input', sync);
      el.addEventListener('change', sync);
      return el;
    };

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'null') {
      const xIn = field('Unknown resistance in Ω', 'X = ? Ω');
      const run = () => {
        if (finished || busy()) return;
        const x = num(xIn);
        if (x === null || x <= 0) return freeNote('Enter the resistance as a positive number of ohms.');
        const ok = judgeNull(lvl, x).ok;
        verdict(ok);
        if (ok) return succeed(`X = ${fmt(lvl.x)} Ω.`);
        miss('That is not the unknown resistance. At balance the ratios of the arms on the two sides are equal: which arms are on the same side?');
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Rheostat'), sliderEl('Rheostat resistance in Ω', 5, 250, 5, 125)), row('Unknown', xIn, 'Ω'), actionBtn('Check the bridge', 'Check the bridge', run));
      hint.textContent = `P = ${lvl.p} Ω (A to B), Q = ${fmt(lvl.q)} Ω (B to C). The rheostat R is in the arm A to D and X in the arm D to C. Find the setting where the needle rests at zero.`;
    }
    if (lvl.kind === 'current') {
      const iIn = field('Galvanometer current in mA', 'I = ? mA');
      const dirs = ['Current flows from B to D', 'Current flows from D to B'];
      const btns: HTMLElement[] = dirs.map((text, idx) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': text, 'aria-pressed': 'false', onclick: () => {
          bToD = idx === 0;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const i = num(iIn);
        if (i === null || i <= 0) return freeNote('Enter the current as a positive number of milliamperes.');
        if (bToD === null) return freeNote('Choose the direction of the galvanometer current.');
        const res = judgeCurrent(lvl, i, bToD);
        verdict(res.ok);
        if (res.ok) return succeed(`${fmt(lvl.igMilli)} mA from ${lvl.bToD ? 'B to D' : 'D to B'}.`);
        const parts: string[] = [];
        if (!res.igOk) parts.push('The galvanometer current is not right: find the potentials at B and D, then divide their difference by the galvanometer resistance. Give it in mA.');
        if (!res.dirOk) parts.push('The direction is not right: current flows towards the lower potential.');
        miss(parts.join(' '));
      };
      controls.append(row('Galvanometer', iIn, 'mA'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Direction'), ...btns), actionBtn('Check the bridge', 'Check the bridge', run));
      hint.textContent = `A to B: ${lvl.p} Ω, B to C: ${lvl.q} Ω, A to D: ${lvl.r} Ω, D to C: ${lvl.s} Ω. Galvanometer ${lvl.g} Ω between B and D. Battery ${lvl.v} V across A and C.`;
    }
    if (lvl.kind === 'meter') {
      const xIn = field('Unknown resistance in Ω', 'X = ? Ω');
      const sIn = field('Balance length after swapping in cm', 'l′ = ? cm');
      const run = () => {
        if (finished || busy()) return;
        const x = num(xIn);
        const s = num(sIn);
        if (x === null || s === null || x <= 0 || s <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeMeter(lvl, x, s);
        verdict(res.ok);
        if (res.ok) return succeed(`X = ${fmt(lvl.x)} Ω, and the balance point moves to ${lvl.swapped} cm.`);
        const parts: string[] = [];
        if (!res.xOk) parts.push('The unknown resistance is not right: at balance the resistances are in the same ratio as the two lengths of wire.');
        if (!res.sOk) parts.push('The new balance length is not right: swapping the two resistances swaps the ratio.');
        miss(parts.join(' '));
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Jockey'), sliderEl('Jockey position in cm', 0, 100, 1, 50)), row('Unknown', xIn, 'Ω'), row('After swapping', sIn, 'cm'), actionBtn('Check the meter bridge', 'Check the meter bridge', run));
      hint.textContent = `The known resistance R is ${lvl.r} Ω, in the right-hand gap. Slide the jockey until the needle rests at zero and read its position.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const wire = (...pts: Pt[]) => {
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    };
    const flowAlong = (pts: Pt[], speed: number, n = 7) => {
      const lens: number[] = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        lens.push(l);
        total += l;
      }
      g.fillStyle = POS;
      g.globalAlpha = 0.85;
      for (let k = 0; k < n; k++) {
        let d = ((((clock * speed + k / n) % 1) + 1) % 1) * total;
        let i = 0;
        while (i < lens.length - 1 && d > lens[i]) d -= lens[i++];
        const t = d / lens[i];
        g.beginPath();
        g.arc(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t, 3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    };
    /** A resistor drawn along the segment a to b, as a zigzag. */
    const res = (a: Pt, b: Pt, name: string, ringed = false) => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const s = len * 0.3;
      const e = len * 0.7;
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(a[0] + ux * s, a[1] + uy * s);
      for (let i = 0; i < 6; i++) {
        const t = s + ((i + 0.5) / 6) * (e - s);
        const off = i % 2 ? 7 : -7;
        g.lineTo(a[0] + ux * t - uy * off, a[1] + uy * t + ux * off);
      }
      g.lineTo(a[0] + ux * e, a[1] + uy * e);
      g.lineTo(b[0], b[1]);
      g.stroke();
      const mx = (a[0] + b[0]) / 2 - uy * 26;
      const my = (a[1] + b[1]) / 2 + ux * 26;
      label(g, name, mx, my, { size: 12, color: ringed ? col.accent : col.text });
    };
    /** The galvanometer: a dial with a needle that rests at zero and swings to either side. */
    const dial = (x: number, y: number, value: number, text: string) => {
      disc(g, x, y, 34, col.panel);
      g.strokeStyle = col.text;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y, 34, 0, Math.PI * 2);
      g.stroke();
      for (let k = -3; k <= 3; k++) {
        const a = (k / 3) * 1.1;
        g.beginPath();
        g.moveTo(x + Math.sin(a) * 28, y - Math.cos(a) * 28);
        g.lineTo(x + Math.sin(a) * 33, y - Math.cos(a) * 33);
        g.stroke();
      }
      g.strokeStyle = Math.abs(value) < 0.02 ? col.good : POS;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y + 8);
      g.lineTo(x + Math.sin(value * 1.1) * 28, y + 8 - Math.cos(value * 1.1) * 32);
      g.stroke();
      label(g, 'G', x, y + 26, { size: 11, color: col.muted });
      label(g, text, x, y + 52, { size: 12, color: col.text });
    };
    const battery = (x: number, y: number, text: string) => {
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x - 8, y - 14);
      g.lineTo(x - 8, y + 14);
      g.stroke();
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(x + 8, y - 8);
      g.lineTo(x + 8, y + 8);
      g.stroke();
      label(g, text, x, y + 30, { size: 12, color: col.muted });
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    function drawDiamond(p: string, q: string, r: string, s: string, target: number, scale: number, ringR: boolean, ringS: boolean) {
      const A: Pt = [110, 170];
      const B: Pt = [320, 62];
      const C: Pt = [530, 170];
      const D: Pt = [320, 278];
      res(A, B, p);
      res(B, C, q);
      res(A, D, r, ringR);
      res(D, C, s, ringS);
      wire(B, [320, 124]);
      wire([320, 216], D);
      needle += (Math.max(-1, Math.min(1, target / scale)) - needle) * 0.18;
      dial(320, 170, needle, '');
      wire(A, [110, 320], [290, 320]);
      wire([350, 320], [530, 320], C);
      battery(320, 320, 'battery');
      disc(g, A[0], A[1], 5, col.text);
      disc(g, B[0], B[1], 5, col.text);
      disc(g, C[0], C[1], 5, col.text);
      disc(g, D[0], D[1], 5, col.text);
      label(g, 'A', 90, 170, { size: 13, color: col.muted });
      label(g, 'B', 320, 44, { size: 13, color: col.muted });
      label(g, 'C', 552, 170, { size: 13, color: col.muted });
      label(g, 'D', 320, 296, { size: 13, color: col.muted });
      flowAlong([A, B, C], 0.12, 6);
      flowAlong([A, D, C], 0.12, 6);
    }
    function drawNull() {
      if (lvl.kind !== 'null') return;
      const ig = bridge(lvl.p, lvl.q, slider, lvl.x, lvl.g, lvl.v).ig;
      drawDiamond(`P ${lvl.p} Ω`, `Q ${fmt(lvl.q)} Ω`, `R ${fmt(slider)} Ω`, verdictAt !== null && verdictOk ? `X ${fmt(lvl.x)} Ω` : 'X = ?', ig, 0.004, false, true);
      label(g, ig === 0 || Math.abs(ig) < 1e-9 ? 'null' : '', 320, 230, { size: 12, color: col.good });
      verdictLabel(`balanced: P/Q = R/X`, 480, 40);
    }
    function drawCurrent() {
      if (lvl.kind !== 'current') return;
      const f = runF();
      const ig = bridge(lvl.p, lvl.q, lvl.r, lvl.s, lvl.g, lvl.v).ig;
      drawDiamond(`${lvl.p} Ω`, `${lvl.q} Ω`, `${lvl.r} Ω`, `${lvl.s} Ω`, ig * f, Math.abs(ig) * 1.4, false, false);
      if (runT !== null) flowAlong(lvl.bToD ? [[320, 124], [320, 216]] : [[320, 216], [320, 124]], 0.15, 5);
      label(g, runT === null ? 'switch on to see it' : `${fmt(lvl.igMilli * f)} mA`, 320, 240, { size: 12, color: col.text });
      verdictLabel(`${fmt(lvl.igMilli)} mA, ${lvl.bToD ? 'B to D' : 'D to B'}`, 480, 40);
    }
    function drawMeter() {
      if (lvl.kind !== 'meter') return;
      const f = runF();
      const x0 = 80;
      const x1 = 560;
      const wy = 215;
      const jx = x0 + ((x1 - x0) * slider) / 100;
      // the two resistors in the gaps, the wire, the jockey and the galvanometer
      res([x0, 90], [320, 90], verdictAt !== null && verdictOk ? `X ${fmt(lvl.x)} Ω` : 'X = ?');
      res([320, 90], [x1, 90], `R ${lvl.r} Ω`);
      wire([x0, 90], [x0, wy]);
      wire([x1, 90], [x1, wy]);
      g.strokeStyle = '#b87333';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(x0, wy);
      g.lineTo(x1, wy);
      g.stroke();
      for (let k = 0; k <= 10; k++) {
        g.strokeStyle = col.muted;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x0 + ((x1 - x0) * k) / 10, wy + 5);
        g.lineTo(x0 + ((x1 - x0) * k) / 10, wy + 11);
        g.stroke();
        if (k % 2 === 0) label(g, String(k * 10), x0 + ((x1 - x0) * k) / 10, wy + 24, { size: 10, color: col.muted });
      }
      needle += (Math.max(-1, Math.min(1, meterDeflection(lvl.x, lvl.r, slider) / 0.5)) - needle) * 0.18;
      dial(320, 150, needle, '');
      wire([320, 90], [320, 116]);
      wire([320, 184], [320, 198], [jx, 198], [jx, wy]);
      g.fillStyle = col.accent;
      g.fillRect(jx - 4, wy - 12, 8, 14);
      label(g, `${fmt(slider)} cm`, jx, wy + 44, { size: 12, color: col.accent });
      wire([x0, wy + 70], [290, wy + 70]);
      wire([350, wy + 70], [x1, wy + 70], [x1, wy]);
      wire([x0, wy], [x0, wy + 70]);
      battery(320, wy + 70, '');
      flowAlong([[x0, 90], [x1, 90]], 0.1, 8);
      void f;
      verdictLabel(`X/R = l/(100 − l), swapped: ${lvl.swapped} cm`, 320, 40);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawNull();
      drawCurrent();
      drawMeter();
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
