import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, correctEnds, explainSolution, fmt, judgeCut, judgeMatch, judgeSolenoid, northAtLeft, otherPole, starsFor, type Pole } from './logic';

const W = 640;
const H = 340;
const NORTH = '#c0392b';
const SOUTH = '#3156d3';
const REVEAL = 0.9;
const RUN = 3;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const CX = 320;

interface Dipole {
  x: number;
  y: number;
  mx: number;
  my: number;
}

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
    const labels: (Pole | null)[][] = lvl.kind === 'cut' ? Array.from({ length: lvl.pieces }, () => [null, null]) : [];
    let northLeftPick: boolean | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Bar magnets or a solenoid with a grid of compass needles showing their magnetic field.' });
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
    if (lvl.kind === 'cut') {
      const cells: HTMLElement[] = [];
      for (let p = 0; p < lvl.pieces; p++) {
        for (let e = 0; e < 2; e++) {
          const name = `Piece ${p + 1}, ${e === 0 ? 'left' : 'right'} end`;
          const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': name, onclick: () => {
            if (finished) return;
            const cur = labels[p][e];
            labels[p][e] = cur === null ? 'N' : otherPole(cur);
            b.textContent = `${e === 0 ? 'L' : 'R'}: ${labels[p][e]}`;
          } }, `${e === 0 ? 'L' : 'R'}: ?`);
          cells.push(b);
        }
      }
      const run = () => {
        if (finished || busy()) return;
        const res = judgeCut(lvl, labels);
        if (res.unset) return freeNote('Label every end of every piece first.');
        verdict(res.ok);
        if (res.ok) return succeed('Every piece is a complete magnet, pointing the same way as the original.');
        miss(`Piece ${res.wrongPieces.map((i) => i + 1).join(' and ')} ${res.wrongPieces.length > 1 ? 'are' : 'is'} not labelled correctly: think about which way each piece points compared with the original magnet.`);
      };
      for (let p = 0; p < lvl.pieces; p++) controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Piece ${p + 1}`), cells[2 * p], cells[2 * p + 1]));
      controls.append(actionBtn('Check the poles', 'Check the poles', run));
      hint.textContent = `The original magnet has its north pole at the ${lvl.northLeft ? 'left' : 'right'} end. It was cut ${lvl.dir === 'across' ? 'across its length' : 'along its length'} into ${lvl.pieces} pieces. Click each end label to cycle it between N and S.`;
    }
    if (lvl.kind === 'solenoid') {
      const mIn = field('Magnetic moment in J/T', 'm = ? J/T');
      const opts: [boolean, string, string][] = [[true, 'North pole at the left end', 'Left end'], [false, 'North pole at the right end', 'Right end']];
      const btns: HTMLElement[] = opts.map(([v, aria, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': aria, 'aria-pressed': 'false', onclick: () => {
          northLeftPick = v;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const m = num(mIn);
        if (m === null || m <= 0) return freeNote('Enter the magnetic moment as a positive number of J/T.');
        if (northLeftPick === null) return freeNote('Choose which end is the north pole.');
        const res = judgeSolenoid(lvl, m, northLeftPick);
        verdict(res.ok);
        if (res.ok) return succeed(`m = ${fmt(lvl.m)} J/T, with the north pole at the ${northAtLeft(lvl.frontUp) ? 'left' : 'right'} end.`);
        const parts: string[] = [];
        if (!res.mOk) parts.push('The magnetic moment is not right: it is the number of turns times the current times the area of one turn, with the area in m².');
        if (!res.poleOk) parts.push('The pole is not right: curl the fingers of the right hand along the current in the windings, and the thumb gives the north pole.');
        miss(parts.join(' '));
      };
      controls.append(row('Moment', mIn, 'J/T'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'North pole'), ...btns), actionBtn('Check the solenoid', 'Check the solenoid', run));
      hint.textContent = `${lvl.n} turns, area ${lvl.aCm2} cm² each, current ${lvl.i} A. On the side facing you the current flows ${lvl.frontUp ? 'upwards' : 'downwards'}.`;
    }
    if (lvl.kind === 'match') {
      const iIn = field('Current in A', 'I = ? A');
      const run = () => {
        if (finished || busy()) return;
        const i = num(iIn);
        if (i === null || i <= 0) return freeNote('Enter the current as a positive number of amperes.');
        const ok = judgeMatch(lvl, i).ok;
        // the solenoid is drawn with the field of the current chosen
        chosenI = i;
        verdict(ok);
        if (ok) return succeed(`I = ${fmt(lvl.i)} A.`);
        miss(i * lvl.n * lvl.aCm2 * 1e-4 < lvl.mBar ? 'With that current the solenoid is a weaker magnet than the bar magnet.' : 'With that current the solenoid is a stronger magnet than the bar magnet.');
      };
      controls.append(row('Current', iIn, 'A'), actionBtn('Switch on the solenoid', 'Switch on the solenoid', run));
      hint.textContent = `Bar magnet: ${fmt(lvl.mBar)} J/T. Solenoid: ${lvl.n} turns, area ${lvl.aCm2} cm² each.`;
    }
    let chosenI = 0;

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    /** Compass needles at a grid of points, each aligned with the field of the dipoles, with a slow wobble. */
    const compassGrid = (dipoles: Dipole[], x0: number, y0: number, x1: number, y1: number, cols: number, rows: number, skip: (x: number, y: number) => boolean) => {
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = x0 + ((i + 0.5) / cols) * (x1 - x0);
          const y = y0 + ((j + 0.5) / rows) * (y1 - y0);
          if (skip(x, y)) continue;
          let bx = 0;
          let by = 0;
          for (const d of dipoles) {
            const rx = x - d.x;
            const ry = y - d.y;
            const r2 = rx * rx + ry * ry + 400;
            const r = Math.sqrt(r2);
            const mr = d.mx * (rx / r) + d.my * (ry / r);
            bx += (3 * mr * (rx / r) - d.mx) / (r2 * r) * 1e4;
            by += (3 * mr * (ry / r) - d.my) / (r2 * r) * 1e4;
          }
          const a = Math.atan2(by, bx) + Math.sin(clock * 2 + i * 0.7 + j) * 0.04;
          const ux = Math.cos(a);
          const uy = Math.sin(a);
          g.lineWidth = 3;
          g.strokeStyle = NORTH;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + ux * 9, y + uy * 9);
          g.stroke();
          g.strokeStyle = SOUTH;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x - ux * 9, y - uy * 9);
          g.stroke();
        }
      }
    };
    const magnet = (x: number, y: number, w: number, hgt: number, leftPole: Pole | null, rightPole: Pole | null) => {
      const color = (p: Pole | null) => (p === 'N' ? NORTH : p === 'S' ? SOUTH : col.muted);
      g.fillStyle = color(leftPole);
      g.fillRect(x, y, w / 2, hgt);
      g.fillStyle = color(rightPole);
      g.fillRect(x + w / 2, y, w / 2, hgt);
      g.strokeStyle = col.line;
      g.lineWidth = 2;
      g.strokeRect(x, y, w, hgt);
      if (hgt > 14) {
        label(g, leftPole ?? '?', x + w * 0.25, y + hgt / 2, { size: Math.min(16, hgt - 2), color: '#fff' });
        label(g, rightPole ?? '?', x + w * 0.75, y + hgt / 2, { size: Math.min(16, hgt - 2), color: '#fff' });
      }
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    function drawCut() {
      if (lvl.kind !== 'cut') return;
      const truth = correctEnds(lvl);
      const dipoles: Dipole[] = [];
      const total = 300;
      const x0 = CX - total / 2;
      const f = runF();
      const show = (p: number, e: number) => (verdictAt !== null && verdictOk ? truth[p][e] : labels[p][e]);
      for (let p = 0; p < lvl.pieces; p++) {
        let x: number;
        let y: number;
        let w: number;
        let hgt: number;
        if (lvl.dir === 'across') {
          w = (total - 14 * (lvl.pieces - 1)) / lvl.pieces;
          hgt = 40;
          x = x0 + p * (w + 14);
          y = 70;
        } else {
          w = total;
          hgt = (84 - 8 * (lvl.pieces - 1)) / lvl.pieces;
          x = x0;
          y = 52 + p * (hgt + 8);
        }
        magnet(x, y, w, hgt, show(p, 0), show(p, 1));
        const dirx = lvl.northLeft ? -1 : 1;
        dipoles.push({ x: x + w / 2, y: y + hgt / 2, mx: dirx * (lvl.dir === 'across' ? 1 : 0.6) * (0.5 + 0.5 * f), my: 0 });
      }
      label(g, lvl.dir === 'across' ? 'cut across' : 'cut along', CX, 36, { size: 12, color: col.muted });
      compassGrid(dipoles, 60, 120, 580, 330, 17, 5, () => false);
      verdictLabel('every piece is a magnet with two poles', CX, 318);
    }
    function drawSolenoid() {
      if (lvl.kind !== 'solenoid') return;
      const x0 = CX - 110;
      const x1 = CX + 110;
      const turns = 9;
      g.strokeStyle = '#b87333';
      g.lineWidth = 3;
      for (let k = 0; k < turns; k++) {
        const x = x0 + ((k + 0.5) / turns) * (x1 - x0);
        g.beginPath();
        g.ellipse(x, 90, 7, 34, 0, 0, Math.PI * 2);
        g.stroke();
      }
      // arrows on the front windings
      for (let k = 0; k < turns; k += 2) {
        const x = x0 + ((k + 0.5) / turns) * (x1 - x0) + 7;
        const dir = lvl.frontUp ? -1 : 1;
        const t = (((clock * 0.6 + k * 0.1) % 1) + 1) % 1;
        const y = 90 + dir * (-30 + 60 * t) * -1;
        disc(g, x, y, 2.8, NORTH);
      }
      label(g, `${lvl.i} A`, x0 - 36, 90, { size: 12, color: col.text });
      const known = verdictAt !== null && verdictOk;
      const nl = northAtLeft(lvl.frontUp);
      if (known) {
        label(g, 'N', nl ? x0 - 12 : x1 + 12, 90, { size: 18, color: NORTH });
        label(g, 'S', nl ? x1 + 12 : x0 - 12, 90, { size: 18, color: SOUTH });
      } else label(g, '? ?', CX, 138, { size: 14, color: col.accent });
      const dirx = (nl ? -1 : 1) * (known ? 1 : 0.2 + 0.8 * runF());
      compassGrid([{ x: CX, y: 90, mx: dirx, my: 0 }], 60, 150, 580, 330, 17, 5, () => false);
      verdictLabel(`m = ${fmt(lvl.m)} J/T`, CX, 318);
    }
    function drawMatch() {
      if (lvl.kind !== 'match') return;
      // the bar magnet on the left, the solenoid on the right, compass needles round both
      magnet(130, 66, 120, 36, 'N', 'S');
      label(g, `${fmt(lvl.mBar)} J/T`, 190, 46, { size: 12, color: col.text });
      const x0 = 400;
      const x1 = 530;
      for (let k = 0; k < 8; k++) {
        const x = x0 + ((k + 0.5) / 8) * (x1 - x0);
        g.strokeStyle = '#b87333';
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(x, 84, 6, 26, 0, 0, Math.PI * 2);
        g.stroke();
      }
      label(g, `${lvl.n} turns`, 465, 46, { size: 12, color: col.text });
      const mSol = chosenI > 0 ? chosenI * lvl.n * lvl.aCm2 * 1e-4 : 0;
      const k = lvl.mBar > 0 ? mSol / lvl.mBar : 0;
      const f = runF();
      compassGrid([{ x: 190, y: 84, mx: 1, my: 0 }], 40, 120, 320, 330, 8, 5, () => false);
      compassGrid([{ x: 465, y: 84, mx: 1 * Math.max(0.02, k * f), my: 0 }], 330, 120, 610, 330, 8, 5, () => false);
      label(g, runT === null ? 'solenoid off' : `solenoid ${fmt(mSol)} J/T`, 465, 108, { size: 12, color: col.muted });
      verdictLabel('same moment, same field', CX, 318);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawCut();
      drawSolenoid();
      drawMatch();
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
