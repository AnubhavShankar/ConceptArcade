import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeCube, judgeJunction, judgeLoop, judgeReduce, judgeTwoLoop, starsFor } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const REVEAL = 0.9;
const RUN = 3;
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
    let pick1: boolean | null = null; // the chosen direction in levels 2, 3 and 4

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A circuit of cells and resistors with charge flowing along its wires.' });
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
    /** Two buttons: the first sets the choice to true, the second to false. */
    const twoWay = (name: string, a: string, b: string) => {
      const btns: HTMLElement[] = [a, b].map((text, idx) => {
        const el = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': text, 'aria-pressed': 'false', onclick: () => {
          pick1 = idx === 0;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === el)));
        } }, text);
        return el;
      });
      return h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), ...btns);
    };

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'reduce') {
      const rIn = field('Resistance of the network in Ω', 'R = ? Ω');
      const vIn = field('Voltage across the ringed resistor in V', 'V₁ = ? V');
      const run = () => {
        if (finished || busy()) return;
        const r = num(rIn);
        const v = num(vIn);
        if (r === null || v === null || r <= 0 || v <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeReduce(lvl, r, v);
        verdict(res.ok);
        if (res.ok) return succeed(`R = ${fmt(lvl.req)} Ω and V₁ = ${fmt(lvl.vR1)} V.`);
        const parts: string[] = [];
        if (!res.reqOk) parts.push('The resistance of the network is not right: reduce one group first, then combine the result with the remaining resistor.');
        if (!res.vOk) parts.push('The voltage across R₁ is not right: decide whether R₁ carries the whole current or sits across the whole battery.');
        miss(parts.join(' '));
      };
      controls.append(row('Network', rIn, 'Ω'), row('Ringed resistor', vIn, 'V'), actionBtn('Check the network', 'Check the network', run));
      hint.textContent = `R₁ = ${lvl.r1} Ω, R₂ = ${lvl.r2} Ω, R₃ = ${lvl.r3} Ω, battery ${lvl.v} V (no internal resistance).`;
    }
    if (lvl.kind === 'junction') {
      const iIn = field('Fourth current in A', 'I₄ = ? A');
      const dir = twoWay('Direction', 'Current flows into the junction', 'Current flows out of the junction');
      const run = () => {
        if (finished || busy()) return;
        const i = num(iIn);
        if (i === null || i <= 0) return freeNote('Enter the current as a positive number of amperes.');
        if (pick1 === null) return freeNote('Choose whether the fourth current flows into the junction or out of it.');
        const res = judgeJunction(lvl, i, pick1);
        verdict(res.ok);
        if (res.ok) return succeed(`${fmt(lvl.fourth)} A ${lvl.fourthIn ? 'into' : 'out of'} the junction.`);
        const parts: string[] = [];
        if (!res.magOk) parts.push('The size of the fourth current is not right: what goes in must equal what comes out.');
        if (!res.dirOk) parts.push('The direction is not right: add up what the three known wires bring in and take out, and see which way the balance lies.');
        miss(parts.join(' '));
      };
      controls.append(row('Fourth current', iIn, 'A'), dir, actionBtn('Check the junction', 'Check the junction', run));
      hint.textContent = `Wires 1 to 3 carry ${lvl.known.map((k) => `${fmt(Math.abs(k))} A ${k > 0 ? 'in' : 'out'}`).join(', ')}.`;
    }
    if (lvl.kind === 'loop') {
      const iIn = field('Current in the loop in A', 'I = ? A');
      const vIn = field('Voltage across the ringed resistor in V', 'V₁ = ? V');
      const dir = twoWay('Direction', 'Current flows clockwise', 'Current flows anticlockwise');
      const run = () => {
        if (finished || busy()) return;
        const i = num(iIn);
        const v = num(vIn);
        if (i === null || v === null || i <= 0 || v <= 0) return freeNote('Enter both answers as positive numbers.');
        if (pick1 === null) return freeNote('Choose the direction of the current.');
        const res = judgeLoop(lvl, i, v, pick1);
        verdict(res.ok);
        if (res.ok) return succeed(`I = ${fmt(lvl.i)} A, V₁ = ${fmt(lvl.vR1)} V, ${lvl.clockwise ? 'clockwise' : 'anticlockwise'}.`);
        const parts: string[] = [];
        if (!res.iOk) parts.push(lvl.aiding ? 'The current is not right: round the loop the emfs and the voltage drops must balance.' : 'The current is not right: the emfs push in opposite directions, so what counts is the difference.');
        if (!res.vOk) parts.push('The voltage across the ringed resistor is not right: it is the current times that resistance.');
        if (!res.dirOk) parts.push('The direction is not right: the larger emf decides which way the current goes.');
        miss(parts.join(' '));
      };
      controls.append(row('Current', iIn, 'A'), row('Ringed resistor', vIn, 'V'), dir, actionBtn('Check the loop', 'Check the loop', run));
      hint.textContent = `Cell 1: ${lvl.e1} V (pushes clockwise). Cell 2: ${lvl.e2} V. R₁ = ${lvl.r1} Ω (ringed), R₂ = ${lvl.r2} Ω. No internal resistance.`;
    }
    if (lvl.kind === 'twoloop') {
      const aIn = field('Current from cell 1 in A', 'I₁ = ? A');
      const bIn = field('Current in the middle resistor in A', 'I₃ = ? A');
      const dir = twoWay('Middle current', 'Middle current flows down', 'Middle current flows up');
      const run = () => {
        if (finished || busy()) return;
        const a = num(aIn);
        const b = num(bIn);
        if (a === null || b === null || a <= 0 || b <= 0) return freeNote('Enter both currents as positive numbers (the size, not the direction).');
        if (pick1 === null) return freeNote('Choose the direction of the middle current.');
        const res = judgeTwoLoop(lvl, a, b, pick1);
        verdict(res.ok);
        if (res.ok) return succeed(`I₁ = ${fmt(Math.abs(lvl.i1))} A, I₃ = ${fmt(lvl.i3)} A, flowing ${lvl.down ? 'down' : 'up'}.`);
        const parts: string[] = [];
        if (!res.i1Ok) parts.push('The current from cell 1 is not right: apply the loop rule to the left loop, with the junction rule for the middle current.');
        if (!res.i3Ok) parts.push('The current in the middle resistor is not right: three unknowns need three equations.');
        if (!res.dirOk) parts.push('The direction of the middle current is not right: check which cell wins.');
        miss(parts.join(' '));
      };
      controls.append(row('Cell 1 current', aIn, 'A'), row('Middle resistor', bIn, 'A'), dir, actionBtn('Check the network', 'Check the network', run));
      hint.textContent = `ε₁ = ${lvl.e1} V, R₁ = ${lvl.r1} Ω; ε₂ = ${lvl.e2} V${lvl.sign === 1 ? '' : ' (reversed)'}, R₂ = ${lvl.r2} Ω; shared R₃ = ${lvl.r3} Ω.`;
    }
    if (lvl.kind === 'cube') {
      const rIn = field('Equivalent resistance in Ω', 'R = ? Ω');
      const eIn = field('Current in each edge at the positive corner in A', 'I = ? A');
      const run = () => {
        if (finished || busy()) return;
        const r = num(rIn);
        const e = num(eIn);
        if (r === null || e === null || r <= 0 || e <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeCube(lvl, r, e);
        verdict(res.ok);
        if (res.ok) return succeed(`R = ${fmt(lvl.req)} Ω, and ${fmt(lvl.edge)} A in each edge at the positive corner.`);
        const parts: string[] = [];
        if (!res.reqOk) parts.push('The resistance is not right: this network is not just series and parallel, so use the symmetry and the loop rule.');
        if (!res.edgeOk) parts.push('The edge current is not right: the total current leaves the positive corner along three equivalent edges.');
        miss(parts.join(' '));
      };
      controls.append(row('Cube', rIn, 'Ω'), row('Edge current', eIn, 'A'), actionBtn('Check the cube', 'Check the cube', run));
      hint.textContent = `Each of the 12 edges is ${lvl.r} Ω. The battery is ${lvl.e} V, with no internal resistance.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const wire = (...pts: Pt[]) => {
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    };
    const flowAlong = (pts: Pt[], speed: number, n = 8) => {
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
    const zigzag = (x: number, y: number, len: number, vertical: boolean, ringed = false, name = '') => {
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y);
      for (let i = 0; i < 6; i++) {
        const along = ((i + 0.5) / 6) * len;
        const off = i % 2 ? 8 : -8;
        g.lineTo(vertical ? x + off : x + along, vertical ? y + along : y + off);
      }
      g.lineTo(vertical ? x : x + len, vertical ? y + len : y);
      g.stroke();
      const cx = vertical ? x : x + len / 2;
      const cy = vertical ? y + len / 2 : y;
      if (ringed) {
        g.strokeStyle = col.accent;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(cx, cy, 28, 0, Math.PI * 2);
        g.stroke();
      }
      if (name) label(g, name, vertical ? cx + 40 : cx, vertical ? cy + 4 : cy - 30, { size: 12, color: col.text });
    };
    const cellSym = (x: number, y: number, flip: boolean, text: string, horizontal = false) => {
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      if (horizontal) {
        const a = flip ? 8 : -8;
        g.moveTo(x - 16, y + a);
        g.lineTo(x + 16, y + a);
      } else {
        const a = flip ? 8 : -8;
        g.moveTo(x - 16, y + a);
        g.lineTo(x + 16, y + a);
      }
      g.stroke();
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(x - 9, y - (flip ? 8 : -8));
      g.lineTo(x + 9, y - (flip ? 8 : -8));
      g.stroke();
      label(g, text, x + 44, y, { size: 12, color: col.text });
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    function drawReduce() {
      if (lvl.kind !== 'reduce') return;
      const f = runF();
      const top = 90;
      const bot = 250;
      const sp = 0.05 + f * 0.25;
      wire([60, top], [60, bot]);
      g.strokeStyle = col.text;
      cellSym(60, (top + bot) / 2, false, `${lvl.v} V`);
      if (lvl.topology === 'r1-series-with-pair') {
        wire([60, top], [150, top]);
        wire([270, top], [380, top], [380, 140]);
        wire([380, top], [500, top], [500, 140]);
        wire([380, 220], [380, bot]);
        wire([500, 220], [500, bot]);
        wire([60, bot], [500, bot]);
        zigzag(150, top, 120, false, true, 'R₁');
        zigzag(380, 140, 80, true, false, 'R₂');
        zigzag(500, 140, 80, true, false, 'R₃');
        flowAlong([[60, top], [380, top]], sp, 8);
      } else {
        wire([60, top], [200, top]);
        wire([60, bot], [440, bot]);
        wire([200, top], [200, 140]);
        wire([200, 220], [200, bot]);
        wire([200, top], [440, top], [440, 120]);
        wire([440, 160], [440, 180]);
        wire([440, 220], [440, bot]);
        zigzag(200, 140, 80, true, true, 'R₁');
        zigzag(440, 100, 60, true, false, 'R₂');
        zigzag(440, 170, 60, true, false, 'R₃');
        flowAlong([[60, top], [440, top]], sp, 8);
      }
      verdictLabel(`R = ${fmt(lvl.req)} Ω, V₁ = ${fmt(lvl.vR1)} V`, 320, 40);
    }
    function drawJunction() {
      if (lvl.kind !== 'junction') return;
      const f = runF();
      const c: Pt = [320, 170];
      const ends: Pt[] = [[90, 100], [200, 40], [560, 130], [340, 310]];
      const cur = [...lvl.known, lvl.fourthIn ? lvl.fourth : -lvl.fourth];
      ends.forEach((e, i) => {
        wire(e, c);
        const show = i < 3 || runT !== null;
        const into = cur[i] > 0;
        const mag = Math.abs(cur[i]);
        if (show) flowAlong(into ? [e, c] : [c, e], 0.05 + mag * 0.06, Math.max(3, mag * 3));
        const lx = e[0] + (c[0] - e[0]) * (i === 3 ? 0.18 : 0.2) + (i === 0 ? -10 : 0);
        const ly = e[1] + (c[1] - e[1]) * 0.2 + (i === 1 ? -14 : -12);
        label(g, i < 3 ? `${fmt(mag)} A ${into ? 'in' : 'out'}` : runT !== null ? `${fmt(mag)} A ${into ? 'in' : 'out'}` : 'I₄ = ?', lx, ly, { size: 13, color: i < 3 ? col.text : col.accent });
      });
      disc(g, c[0], c[1], 8, col.text);
      void f;
      verdictLabel('what flows in equals what flows out', 320, 330);
    }
    function drawLoop() {
      if (lvl.kind !== 'loop') return;
      const f = runF();
      const left = 120;
      const right = 520;
      const top = 80;
      const bot = 260;
      wire([left, top], [250, top]);
      wire([370, top], [right, top], [right, 150]);
      wire([right, 200], [right, bot], [370, bot]);
      wire([250, bot], [left, bot], [left, 200]);
      wire([left, 150], [left, top]);
      zigzag(250, top, 120, false, true, 'R₁');
      zigzag(250, bot, 120, false, false, 'R₂');
      // cell 1 pushes clockwise (up the left side); cell 2 helps or opposes
      cellSym(left, 175, false, `${lvl.e1} V`);
      cellSym(right, 175, lvl.aiding ? true : false, `${lvl.e2} V`);
      const cw: Pt[] = [[left, bot], [left, top], [right, top], [right, bot], [left, bot]];
      const path = lvl.clockwise ? cw : [...cw].reverse();
      if (runT !== null) flowAlong(path, 0.05 + f * (0.05 + lvl.i * 0.04), 12);
      label(g, 'cell 1 pushes clockwise', 320, 175, { size: 12, color: col.muted });
      verdictLabel(`I = ${fmt(lvl.i)} A ${lvl.clockwise ? 'clockwise' : 'anticlockwise'}`, 320, 310);
    }
    function drawTwoLoop() {
      if (lvl.kind !== 'twoloop') return;
      const f = runF();
      const top = 80;
      const bot = 260;
      const xs = [130, 320, 510];
      wire([xs[0], top], [xs[2], top]);
      wire([xs[0], bot], [xs[2], bot]);
      xs.forEach((x) => {
        wire([x, top], [x, 110]);
        wire([x, 230], [x, bot]);
      });
      wire([xs[0], 110], [xs[0], 120]);
      zigzag(xs[0], 130, 70, true, false, 'R₁');
      cellSym(xs[0], 215, false, `${lvl.e1} V`);
      zigzag(xs[1], 110, 120, true, false, 'R₃');
      zigzag(xs[2], 130, 70, true, false, 'R₂');
      cellSym(xs[2], 215, lvl.sign === -1, `${lvl.e2} V`);
      label(g, 'junction', xs[1], top - 16, { size: 11, color: col.muted });
      if (runT !== null) {
        const sp = 0.05 + f * 0.25;
        flowAlong(lvl.i1 > 0 ? [[xs[0], bot], [xs[0], top]] : [[xs[0], top], [xs[0], bot]], sp, 6);
        flowAlong(lvl.down ? [[xs[1], top], [xs[1], bot]] : [[xs[1], bot], [xs[1], top]], sp, 6);
        const i2 = lvl.i3 * (lvl.down ? 1 : -1) - lvl.i1;
        flowAlong(i2 > 0 ? [[xs[2], bot], [xs[2], top]] : [[xs[2], top], [xs[2], bot]], sp, 6);
      }
      verdictLabel(`I₁ = ${fmt(Math.abs(lvl.i1))} A, I₃ = ${fmt(lvl.i3)} A ${lvl.down ? 'down' : 'up'}`, 320, 310);
    }
    function drawCube() {
      if (lvl.kind !== 'cube') return;
      const f = runF();
      const P = (x: number, y: number, z: number): Pt => [200 + 150 * x + 70 * z, 250 - 120 * y - 55 * z];
      const A = P(0, 0, 0);
      const B = P(1, 0, 0);
      const C = P(1, 1, 0);
      const D = P(0, 1, 0);
      const A2 = P(0, 0, 1);
      const B2 = P(1, 0, 1);
      const C2 = P(1, 1, 1);
      const D2 = P(0, 1, 1);
      // [from, to, share of the total current / 3] drawn only after the run
      const edges: [Pt, Pt, number][] = [
        [A, B, 1], [A, D, 1], [A, A2, 1],
        [B, C, 0.5], [B, B2, 0.5], [D, C, 0.5], [D, D2, 0.5], [A2, B2, 0.5], [A2, D2, 0.5],
        [C, C2, 1], [B2, C2, 1], [D2, C2, 1],
      ];
      edges.forEach(([a, b]) => wire(a, b));
      if (runT !== null) edges.forEach(([a, b, share]) => flowAlong([a, b], 0.05 + f * 0.2 * share, share === 1 ? 5 : 3));
      [A, B, C, D, A2, B2, C2, D2].forEach((p) => disc(g, p[0], p[1], 5, col.text));
      disc(g, A[0], A[1], 9, POS);
      disc(g, C2[0], C2[1], 9, '#3156d3');
      label(g, '+', A[0] - 16, A[1] + 4, { size: 14, color: POS });
      label(g, '−', C2[0] + 16, C2[1] - 8, { size: 14, color: '#3156d3' });
      label(g, `${lvl.e} V`, 90, 170, { size: 13, color: col.muted });
      label(g, `each edge ${lvl.r} Ω`, 480, 250, { size: 12, color: col.muted });
      verdictLabel(`R = ${fmt(lvl.req)} Ω, ${fmt(lvl.total)} A in total`, 320, 310);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawReduce();
      drawJunction();
      drawLoop();
      drawTwoLoop();
      drawCube();
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
