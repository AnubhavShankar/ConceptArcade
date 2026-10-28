import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeLoop, judgeMagnet, judgeRod, starsFor, type Sense } from './logic';

const W = 640;
const H = 340;
const NORTH = '#c0392b';
const SOUTH = '#3156d3';
const REVEAL = 0.9;
const RUN = 3.4;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
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
    let sensePick: Sense | null = null;
    let forcePick: 'repels' | 'attracts' | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A coil, loop or rod in a changing magnetic field, with the induced current drawn as flowing charge.' });
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
    if (lvl.kind === 'magnet') {
      const run = () => {
        if (finished || busy()) return;
        if (sensePick === null || forcePick === null) return freeNote('Choose a direction for the current and say whether the coil attracts or repels.');
        const res = judgeMagnet(lvl, sensePick, forcePick);
        verdict(res.ok);
        if (res.ok) return succeed(`The current is ${lvl.sense}, and the coil ${lvl.force} the magnet.`);
        const parts: string[] = [];
        if (!res.sOk) parts.push('The direction of the current is not right: the induced current makes a field that opposes the change of flux.');
        if (!res.fOk) parts.push('The force is not right: think about whether the coil helps or opposes the motion of the magnet.');
        miss(parts.join(' '));
      };
      controls.append(
        choice<Sense>('Current', [['clockwise', 'Current is clockwise', 'Clockwise'], ['anticlockwise', 'Current is anticlockwise', 'Anticlockwise']], (v) => (sensePick = v)),
        choice<'repels' | 'attracts'>('The coil', [['repels', 'The coil repels the magnet', 'Repels'], ['attracts', 'The coil attracts the magnet', 'Attracts']], (v) => (forcePick = v)),
        actionBtn('Move the magnet', 'Move the magnet', run),
      );
      hint.textContent = 'The direction of the current is as seen by an observer on the side of the magnet.';
    }
    if (lvl.kind === 'loop') {
      const run = () => {
        if (finished || busy()) return;
        if (sensePick === null) return freeNote('Choose the direction of the induced current, or "no current".');
        const ok = judgeLoop(lvl, sensePick).ok;
        verdict(ok);
        if (ok) return succeed(lvl.sense === 'none' ? 'There is no induced current: the flux does not change.' : `The induced current is ${lvl.sense}.`);
        miss('That is not right: first decide whether the flux through the loop is increasing, decreasing or unchanged, then find the direction of the current whose field opposes the change.');
      };
      controls.append(
        choice<Sense>('Current', [['clockwise', 'Current is clockwise', 'Clockwise'], ['anticlockwise', 'Current is anticlockwise', 'Anticlockwise'], ['none', 'There is no current', 'No current']], (v) => (sensePick = v)),
        actionBtn('Check the loop', 'Check the loop', run),
      );
      hint.textContent = 'Directions are as seen looking at the page.';
    }
    if (lvl.kind === 'rod') {
      const iIn = field('Induced current in A', 'I = ? A');
      const fIn = field('Force needed in mN', 'F = ? mN');
      const pIn = field('Power supplied in mW', 'P = ? mW');
      const run = () => {
        if (finished || busy()) return;
        const i = num(iIn);
        const f = num(fIn);
        const p = num(pIn);
        if (i === null || f === null || p === null || i <= 0 || f <= 0 || p <= 0) return freeNote('Enter all three as positive numbers.');
        const res = judgeRod(lvl, i, f, p);
        verdict(res.ok);
        if (res.ok) return succeed(`I = ${fmt(lvl.current)} A, F = ${fmt(lvl.forceMilli)} mN, P = ${fmt(lvl.powerMilli)} mW.`);
        const parts: string[] = [];
        if (!res.iOk) parts.push('The current is not right: the motional emf Blv drives it round the circuit of resistance R.');
        if (!res.fOk) parts.push('The force is not right: the field acts on the current in the rod, F = BIl.');
        if (!res.pOk) parts.push('The power is not right: it is the force times the speed. Give it in mW.');
        miss(parts.join(' '));
      };
      controls.append(row('Current', iIn, 'A'), row('Force', fIn, 'mN'), row('Power', pIn, 'mW'), actionBtn('Pull the rod', 'Pull the rod', run));
      hint.textContent = `B = ${lvl.b} T, rod length ${lvl.l} m, speed ${lvl.v} m/s, resistance of the circuit ${lvl.r} Ω.`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const circulate = (cx: number, cy: number, rx: number, ry: number, sense: Sense, n = 14) => {
      if (sense === 'none') return;
      const dir = sense === 'clockwise' ? 1 : -1;
      g.fillStyle = '#f4b400';
      for (let k = 0; k < n; k++) {
        const a = dir * (clock * 2.2 + (k / n) * Math.PI * 2);
        disc(g, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 3, '#f4b400');
      }
    };
    const symbol = (x: number, y: number, out: boolean) => {
      g.strokeStyle = col.muted;
      g.fillStyle = col.muted;
      g.lineWidth = 1.5;
      g.globalAlpha = 0.6;
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.stroke();
      if (out) disc(g, x, y, 2.2, col.muted);
      else {
        g.beginPath();
        g.moveTo(x - 4, y - 4);
        g.lineTo(x + 4, y + 4);
        g.moveTo(x + 4, y - 4);
        g.lineTo(x - 4, y + 4);
        g.stroke();
      }
      g.globalAlpha = 1;
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    function drawMagnet() {
      if (lvl.kind !== 'magnet') return;
      const f = runF();
      // coil on the right (seen end-on as an ellipse); the magnet comes from the left
      const cx = 440;
      g.strokeStyle = '#b87333';
      g.lineWidth = 4;
      g.beginPath();
      g.ellipse(cx, CY, 18, 70, 0, 0, Math.PI * 2);
      g.stroke();
      const pos = lvl.motion === 'approach' ? 120 + 130 * f : 250 - 130 * f;
      const leftColor = lvl.pole === 'north' ? SOUTH : NORTH;
      const rightColor = lvl.pole === 'north' ? NORTH : SOUTH;
      g.fillStyle = leftColor;
      g.fillRect(pos - 90, CY - 22, 90, 44);
      g.fillStyle = rightColor;
      g.fillRect(pos, CY - 22, 90, 44);
      label(g, lvl.pole === 'north' ? 'S' : 'N', pos - 45, CY, { size: 16, color: '#fff' });
      label(g, lvl.pole === 'north' ? 'N' : 'S', pos + 45, CY, { size: 16, color: '#fff' });
      if (f > 0 && f < 1) circulate(cx, CY, 18, 70, lvl.sense);
      if (f >= 1) circulate(cx, CY, 18, 70, lvl.sense);
      label(g, `${lvl.pole} pole ${lvl.motion === 'approach' ? 'approaching' : 'receding'}`, 250, 60, { size: 13, color: col.muted });
      label(g, 'observer', 70, CY + 80, { size: 11, color: col.muted });
      verdictLabel(`${lvl.sense}; the coil ${lvl.force} the magnet`, 320, 310);
    }
    function drawLoop() {
      if (lvl.kind !== 'loop') return;
      const f = runF();
      // the field region is a shaded block with dots or crosses
      const bx = 150;
      const by = 60;
      g.fillStyle = col.accent;
      g.globalAlpha = 0.07;
      const region = lvl.cause.text.includes('switched on') || lvl.cause.text.includes('fading');
      g.fillRect(bx, by, 340, 230);
      g.globalAlpha = 1;
      for (let x = bx + 28; x < bx + 340; x += 56) for (let y = by + 28; y < by + 230; y += 56) symbol(x, y, !lvl.bInto);
      void region;
      let cx = 320;
      let rx = 50;
      let ry = 50;
      const t = lvl.cause.text;
      if (t.includes('out of the region')) cx = 320 + 260 * f;
      else if (t.includes('into the region')) cx = 560 - 240 * f;
      else if (t.includes('squeezed')) ry = 50 - 40 * f;
      else if (t.includes('stretched')) {
        rx = 20 + 50 * f;
        ry = 20 + 50 * f;
      } else if (t.includes('slides')) cx = 280 + 80 * Math.sin(f * 3);
      g.strokeStyle = '#b87333';
      g.lineWidth = 5;
      g.beginPath();
      g.ellipse(cx, CY, rx, ry, t.includes('spins') ? clock : 0, 0, Math.PI * 2);
      g.stroke();
      if (verdictAt !== null && lvl.sense !== 'none') circulate(cx, CY, rx, ry, lvl.sense);
      label(g, `flux ${lvl.cause.change}`, 320, 40, { size: 13, color: col.muted });
      verdictLabel(lvl.sense === 'none' ? 'no change of flux, no current' : `${lvl.sense}`, 320, 316);
    }
    function drawRod() {
      if (lvl.kind !== 'rod') return;
      const x0 = 120;
      const x1 = 540;
      g.strokeStyle = col.muted;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x0, 90);
      g.lineTo(x1, 90);
      g.moveTo(x0, 260);
      g.lineTo(x1, 260);
      g.moveTo(x0, 90);
      g.lineTo(x0, 260);
      g.stroke();
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x0, 150);
      for (let i = 0; i < 6; i++) g.lineTo(x0 - (i % 2 ? 8 : -8), 150 + ((i + 0.5) / 6) * 40);
      g.lineTo(x0, 200);
      g.stroke();
      for (let x = 170; x < 520; x += 70) for (let y = 120; y < 240; y += 50) symbol(x, y, false);
      const rx = 200 + 240 * (runT === null ? 0 : (Math.min(runT, RUN) / RUN) * 0.9);
      g.strokeStyle = '#b87333';
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(rx, 90);
      g.lineTo(rx, 260);
      g.stroke();
      if (runT !== null) {
        // pull arrow, and the opposing magnetic force arrow
        g.strokeStyle = col.good;
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(rx + 8, CY);
        g.lineTo(rx + 56, CY);
        g.stroke();
        g.strokeStyle = col.bad;
        g.beginPath();
        g.moveTo(rx - 8, CY + 24);
        g.lineTo(rx - 56, CY + 24);
        g.stroke();
        label(g, 'pull', rx + 36, CY - 14, { size: 11, color: col.good });
        label(g, 'F = BIl', rx - 40, CY + 42, { size: 11, color: col.bad });
        for (let k = 0; k < 10; k++) {
          const a = (clock * 0.6 + k / 10) % 1;
          disc(g, x0 + (rx - x0) * a, a < 0.5 ? 90 : 260, 2.5, '#f4b400');
        }
      }
      verdictLabel(`I = ${fmt(lvl.current)} A, F = ${fmt(lvl.forceMilli)} mN, P = ${fmt(lvl.powerMilli)} mW`, 320, 316);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawMagnet();
      drawLoop();
      drawRod();
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
