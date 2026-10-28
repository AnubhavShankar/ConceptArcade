import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeAmpere, judgeFloat, judgeLoop, judgePair, judgeThree, starsFor } from './logic';

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
    let pick1: boolean | null = null;
    let userGap = 0; // level 2: the separation entered, in mm
    let floatState: 'balanced' | 'rises' | 'falls' = 'balanced';

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Long parallel wires carrying currents, with arrows for the forces they exert on each other.' });
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
    /** Two buttons: the first sets the pick to true. */
    const twoWay = (name: string, a: [string, string], b: [string, string]) => {
      const btns: HTMLElement[] = [a, b].map(([aria, text], idx) => {
        const el = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': aria, 'aria-pressed': 'false', onclick: () => {
          pick1 = idx === 0;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === el)));
        } }, text);
        return el;
      });
      return h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), ...btns);
    };

    // ---- the levels -------------------------------------------------------------------------------------------
    if (lvl.kind === 'pair') {
      const fIn = field('Force in µN', 'F = ? µN');
      const run = () => {
        if (finished || busy()) return;
        const f = num(fIn);
        if (f === null || f <= 0) return freeNote('Enter the force as a positive number of µN.');
        if (pick1 === null) return freeNote('Choose whether the wires attract or repel.');
        const res = judgePair(lvl, f, pick1);
        verdict(res.ok);
        if (res.ok) return succeed(`F = ${fmt(lvl.micro)} µN, and the wires ${lvl.same ? 'attract' : 'repel'}.`);
        const parts: string[] = [];
        if (!res.fOk) parts.push('The force is not right: each wire is in the field of the other. Use lengths in metres and give the force in µN.');
        if (!res.kindOk) parts.push('Attract or repel is not right: think about which way the field of one wire pushes the current in the other.');
        miss(parts.join(' '));
      };
      controls.append(row('Force', fIn, 'µN'), twoWay('Wires', ['The wires attract', 'Attract'], ['The wires repel', 'Repel']), actionBtn('Measure the force', 'Measure the force', run));
      hint.textContent = `Currents ${lvl.i1} A and ${lvl.i2} A, ${lvl.same ? 'in the same direction' : 'in opposite directions'}, ${lvl.dCm} cm apart. Find the force on a ${lvl.lCm} cm length of one wire.`;
    }
    if (lvl.kind === 'float') {
      const gIn = field('Separation in mm', 'd = ? mm');
      const run = () => {
        if (finished || busy()) return;
        const d = num(gIn);
        if (d === null || d <= 0) return freeNote('Enter the separation as a positive number of mm.');
        const res = judgeFloat(lvl, d);
        userGap = d;
        floatState = res.verdict;
        verdict(res.ok);
        if (res.ok) return succeed(`d = ${fmt(lvl.gapMm)} mm: the repulsion exactly balances the weight.`);
        miss(res.verdict === 'rises' ? 'At that separation the repulsion is greater than the weight, so the wire rises.' : 'At that separation the repulsion is smaller than the weight, so the wire falls onto the fixed wire.');
      };
      controls.append(row('Separation', gIn, 'mm'), actionBtn('Release the wire', 'Release the wire', run));
      hint.textContent = `Fixed wire ${lvl.i1} A, light wire ${lvl.i2} A in the opposite direction, ${lvl.lambda} g per metre. Take g = 9.8 m/s².`;
    }
    if (lvl.kind === 'ampere') {
      const iIn = field('Current in each wire in A', 'I = ? A');
      const dIn = field('Force per metre with both currents doubled in µN/m', 'F′/L = ? µN/m');
      const run = () => {
        if (finished || busy()) return;
        const i = num(iIn);
        const d = num(dIn);
        if (i === null || d === null || i <= 0 || d <= 0) return freeNote('Enter both answers as positive numbers.');
        const res = judgeAmpere(lvl, i, d);
        verdict(res.ok);
        if (res.ok) return succeed(`I = ${lvl.i} A, and doubling both currents gives ${fmt(lvl.doubled)} µN/m.`);
        const parts: string[] = [];
        if (!res.iOk) parts.push('The current is not right: the force per metre is 2 × 10⁻⁷ I²/d for equal currents, so work backwards.');
        if (!res.dOk) parts.push('The new force is not right: the force depends on the product of the two currents.');
        miss(parts.join(' '));
      };
      controls.append(row('Current', iIn, 'A'), row('Both doubled', dIn, 'µN/m'), actionBtn('Measure the force', 'Measure the force', run));
      hint.textContent = `Two equal currents, ${lvl.dM} m apart. The force per metre is ${fmt(lvl.microPerM)} µN/m.`;
    }
    if (lvl.kind === 'three') {
      const fIn = field('Net force per metre in µN/m', 'F/L = ? µN/m');
      const run = () => {
        if (finished || busy()) return;
        const f = num(fIn);
        if (f === null || f <= 0) return freeNote('Enter the force as a positive number of µN/m.');
        if (pick1 === null) return freeNote('Choose which wire the middle wire is pulled towards.');
        const res = judgeThree(lvl, f, pick1);
        verdict(res.ok);
        if (res.ok) return succeed(`${fmt(lvl.microPerM)} µN/m towards wire ${lvl.toLeft ? '1' : '3'}.`);
        const parts: string[] = [];
        if (!res.fOk) parts.push('The size is not right: add the two forces as signed quantities, since they may point opposite ways.');
        if (!res.dirOk) parts.push('The direction is not right: decide which outer wire wins.');
        miss(parts.join(' '));
      };
      controls.append(row('Net force', fIn, 'µN/m'), twoWay('Towards', ['Net force is toward wire 1', 'Wire 1'], ['Net force is toward wire 3', 'Wire 3']), actionBtn('Measure the force', 'Measure the force', run));
      hint.textContent = `Currents ${lvl.i1} A, ${lvl.i2} A, ${lvl.i3} A, spaced ${lvl.dCm} cm. Wire 1 is ${lvl.s1 > 0 ? 'parallel' : 'antiparallel'} and wire 3 is ${lvl.s3 > 0 ? 'parallel' : 'antiparallel'} to the middle wire.`;
    }
    if (lvl.kind === 'loop') {
      const fIn = field('Net force on the loop in mN', 'F = ? mN');
      const run = () => {
        if (finished || busy()) return;
        const f = num(fIn);
        if (f === null || f <= 0) return freeNote('Enter the force as a positive number of mN.');
        if (pick1 === null) return freeNote('Choose whether the loop is pulled towards the wire or pushed away.');
        const res = judgeLoop(lvl, f, pick1);
        verdict(res.ok);
        if (res.ok) return succeed(`F = ${fmt(lvl.milli)} mN, ${lvl.attracted ? 'towards' : 'away from'} the wire.`);
        const parts: string[] = [];
        if (!res.fOk) parts.push('The force is not right: the near side and the far side feel forces in opposite directions, and the two side arms cancel.');
        if (!res.dirOk) parts.push('The direction is not right: compare the current in the near side with the current in the wire.');
        miss(parts.join(' '));
      };
      controls.append(row('Net force', fIn, 'mN'), twoWay('Loop is', ['The loop is pulled toward the wire', 'Pulled'], ['The loop is pushed away from the wire', 'Pushed']), actionBtn('Measure the force', 'Measure the force', run));
      hint.textContent = `Wire ${lvl.i1} A, loop ${lvl.i2} A. The loop is ${lvl.aCm} cm wide and ${lvl.bCm} cm long, its near side ${lvl.dCm} cm from the wire.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const wireAt = (y: number, x0: number, x1: number, rightward: boolean, name: string, thick = 8) => {
      g.strokeStyle = '#b87333';
      g.lineWidth = thick;
      g.beginPath();
      g.moveTo(x0, y);
      g.lineTo(x1, y);
      g.stroke();
      g.fillStyle = POS;
      const n = 12;
      for (let k = 0; k < n; k++) {
        const t = (((clock * 0.3 + k / n) % 1) + 1) % 1;
        disc(g, rightward ? x0 + (x1 - x0) * t : x1 - (x1 - x0) * t, y, 2.8, POS);
      }
      const ax = rightward ? x1 - 30 : x0 + 30;
      arrowHead(ax, y - 14, rightward ? 1 : -1, 0, col.text);
      label(g, name, x0 - 30, y, { size: 12, color: col.text });
    };
    const arrowHead = (x: number, y: number, ux: number, uy: number, color: string, size = 8) => {
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(x - ux * 14, y - uy * 14);
      g.lineTo(x + ux * 8, y + uy * 8);
      g.stroke();
      g.beginPath();
      g.moveTo(x + ux * (8 + size), y + uy * (8 + size));
      g.lineTo(x + ux * 8 - uy * size * 0.7, y + uy * 8 + ux * size * 0.7);
      g.lineTo(x + ux * 8 + uy * size * 0.7, y + uy * 8 - ux * size * 0.7);
      g.fill();
    };
    const forceArrow = (x: number, y: number, up: boolean, color: string, text: string, len = 40) => {
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = 4;
      const dy = up ? -len : len;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + dy);
      g.stroke();
      g.beginPath();
      g.moveTo(x, y + dy + (up ? -9 : 9));
      g.lineTo(x - 7, y + dy);
      g.lineTo(x + 7, y + dy);
      g.fill();
      label(g, text, x + 22, y + dy / 2, { size: 12, color });
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));
    const gapPx = (cm: number) => Math.min(150, 28 + cm * 12);

    function drawPair() {
      if (lvl.kind !== 'pair') return;
      const f = runF();
      const g0 = gapPx(lvl.dCm);
      const move = (lvl.same ? -1 : 1) * 18 * f;
      const yA = CY - g0 / 2 - move / 2 - 0;
      const yB = CY + g0 / 2 + move / 2;
      wireAt(yA, 110, 560, true, 'wire 1');
      wireAt(yB, 110, 560, lvl.same, 'wire 2');
      label(g, `d = ${lvl.dCm} cm`, 595, CY, { size: 12, color: col.muted });
      if (f > 0 && verdictOk) {
        forceArrow(300, yA + 6, !lvl.same ? true : false, col.accent, 'F', 34);
        forceArrow(300, yB - 6, !lvl.same ? false : true, col.accent, 'F', 34);
      }
      verdictLabel(`F = ${fmt(lvl.micro)} µN on ${lvl.lCm} cm, ${lvl.same ? 'attraction' : 'repulsion'}`, CX, 30);
    }
    function drawFloat() {
      if (lvl.kind !== 'float') return;
      const base = 280;
      const mmToPx = (mm: number) => Math.min(220, 14 + mm * 2.2);
      const f = runF();
      wireAt(base, 110, 560, true, 'fixed', 10);
      const start = userGap > 0 ? mmToPx(userGap) : 130;
      let y = base - start;
      if (runT !== null) {
        if (floatState === 'rises') y -= f * 90;
        if (floatState === 'falls') y += f * (start - 12);
      }
      y = Math.max(34, Math.min(base - 12, y));
      wireAt(y, 110, 560, false, 'light', 6);
      if (runT === null) label(g, 'choose d, then release', CX, 36, { size: 13, color: col.muted });
      else {
        forceArrow(240, y + 6, false, col.text, 'mg', 30);
        if (floatState === 'balanced') forceArrow(400, y + 6, true, col.good, 'repulsion', 30);
        else if (floatState === 'rises') forceArrow(400, y + 6, true, col.bad, 'repulsion > mg', 44);
        else forceArrow(400, y + 6, true, col.bad, 'repulsion < mg', 14);
      }
      verdictLabel(`d = ${fmt(lvl.gapMm)} mm: it hovers`, CX, 30);
    }
    function drawAmpere() {
      if (lvl.kind !== 'ampere') return;
      const f = runF();
      const g0 = gapPx(lvl.dM * 10);
      const yA = CY - g0 / 2;
      const yB = CY + g0 / 2;
      wireAt(yA, 110, 560, true, 'wire 1', 8 + 3 * f);
      wireAt(yB, 110, 560, true, 'wire 2', 8 + 3 * f);
      label(g, `d = ${lvl.dM} m`, 595, CY, { size: 12, color: col.muted });
      label(g, `F/L = ${fmt(lvl.microPerM)} µN/m`, CX, CY, { size: 14, color: col.text });
      if (f > 0) {
        forceArrow(300, yA + 6, false, col.accent, '', 26);
        forceArrow(300, yB - 6, true, col.accent, '', 26);
      }
      verdictLabel(`${lvl.i} A each; doubled: ${fmt(lvl.doubled)} µN/m`, CX, 30);
    }
    function drawThree() {
      if (lvl.kind !== 'three') return;
      const f = runF();
      const g0 = gapPx(lvl.dCm) * 0.8;
      wireAt(CY - g0, 110, 560, lvl.s1 > 0, 'wire 1', 7);
      wireAt(CY, 110, 560, true, 'wire 2', 9);
      wireAt(CY + g0, 110, 560, lvl.s3 > 0, 'wire 3', 7);
      // wire 1's direction is drawn by its sign relative to wire 2
      if (lvl.s1 < 0) label(g, 'antiparallel to 2', 500, CY - g0 - 20, { size: 11, color: col.muted });
      if (lvl.s3 < 0) label(g, 'antiparallel to 2', 500, CY + g0 + 22, { size: 11, color: col.muted });
      if (f > 0 && verdictOk) forceArrow(320, CY, lvl.toLeft, col.accent, `${fmt(lvl.microPerM)} µN/m`, 40);
      verdictLabel(`net: ${fmt(lvl.microPerM)} µN/m towards wire ${lvl.toLeft ? '1' : '3'}`, CX, 30);
    }
    function drawLoop() {
      if (lvl.kind !== 'loop') return;
      const f = runF();
      const top = 70;
      const dpx = 30 + lvl.dCm * 4;
      const apx = lvl.aCm * 4;
      const move = (lvl.attracted ? -1 : 1) * 16 * f;
      wireAt(top, 110, 560, true, 'wire', 8);
      const y0 = top + dpx + move;
      const y1 = y0 + apx;
      const x0 = 220;
      const x1 = x0 + lvl.bCm * 6;
      g.strokeStyle = '#b87333';
      g.lineWidth = 5;
      g.strokeRect(x0, y0, x1 - x0, y1 - y0);
      // the current goes round the loop; the near side runs with the wire when attracted
      const dirRight = lvl.attracted;
      const pts: [number, number][] = dirRight ? [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]] : [[x1, y0], [x0, y0], [x0, y1], [x1, y1], [x1, y0]];
      let total = 0;
      const lens: number[] = [];
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        lens.push(l);
        total += l;
      }
      for (let k = 0; k < 14; k++) {
        let d = ((((clock * 0.2 + k / 14) % 1) + 1) % 1) * total;
        let i = 0;
        while (i < lens.length - 1 && d > lens[i]) d -= lens[i++];
        const t = d / lens[i];
        disc(g, pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t, 2.8, POS);
      }
      label(g, `near side ${lvl.dCm} cm`, x0 - 56, y0, { size: 11, color: col.muted });
      label(g, `${lvl.aCm} cm wide`, x1 + 40, (y0 + y1) / 2, { size: 11, color: col.muted });
      if (f > 0 && verdictOk) forceArrow((x0 + x1) / 2, (y0 + y1) / 2, lvl.attracted, col.accent, 'net F', 40);
      verdictLabel(`F = ${fmt(lvl.milli)} mN, ${lvl.attracted ? 'attracted' : 'repelled'}`, CX, 30);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawPair();
      drawFloat();
      drawAmpere();
      drawThree();
      drawLoop();
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
