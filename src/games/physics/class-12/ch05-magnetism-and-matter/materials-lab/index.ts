import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeChi, judgeCore, judgeCurie, judgePick, starsFor, type Kind } from './logic';

const W = 640;
const H = 340;
const NORTH = '#c0392b';
const SOUTH = '#3156d3';
const REVEAL = 0.9;
const RUN = 3;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const CX = 320;
const CY = 175;
const hash = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

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
    let typePick: Kind | null = null;
    const picks: Record<'repelled' | 'weak' | 'strong', string | null> = { repelled: null, weak: null, strong: null };

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Magnetic materials: a solenoid core, atomic dipoles in a field, or samples near a magnet.' });
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
    if (lvl.kind === 'core') {
      const hIn = field('Magnetic intensity H in A/m', 'H = ? A/m');
      const mIn = field('Magnetisation M in A/m', 'M = ? A/m');
      const bIn = field('Magnetic field B in T', 'B = ? T');
      const run = () => {
        if (finished || busy()) return;
        const hh = num(hIn);
        const m = num(mIn);
        const b = num(bIn);
        if (hh === null || m === null || b === null || hh <= 0 || m <= 0 || b <= 0) return freeNote('Enter all three as positive numbers.');
        const res = judgeCore(lvl, hh, m, b);
        verdict(res.ok);
        if (res.ok) return succeed(`H = ${fmt(lvl.h)} A/m, M = ${fmt(lvl.m)} A/m, B = ${fmt(lvl.b)} T.`);
        const parts: string[] = [];
        if (!res.hOk) parts.push('H is not right: it depends only on the turns per metre and the current.');
        if (!res.mOk) parts.push('M is not right: it is χ times H, and χ = μᵣ − 1.');
        if (!res.bOk) parts.push('B is not right: B = μ₀(H + M).');
        miss(parts.join(' '));
      };
      controls.append(row('H', hIn, 'A/m'), row('M', mIn, 'A/m'), row('B', bIn, 'T'), actionBtn('Measure the core', 'Measure the core', run));
      hint.textContent = `${lvl.n} turns per metre, ${lvl.i} A, core with relative permeability μᵣ = ${lvl.mur}. μ₀ = 4π × 10⁻⁷ T m/A.`;
    }
    if (lvl.kind === 'chi') {
      const cIn = field('Susceptibility χ', lvl.unit === 1 ? 'χ = ?' : 'χ = ? × 10⁻⁵');
      const opts: [Kind, string][] = [['diamagnetic', 'Diamagnetic'], ['paramagnetic', 'Paramagnetic'], ['ferromagnetic', 'Ferromagnetic']];
      const btns: HTMLElement[] = opts.map(([v, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': text, 'aria-pressed': 'false', onclick: () => {
          typePick = v;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const c = num(cIn);
        if (c === null || c === 0) return freeNote('Enter the susceptibility as a non-zero number, with its sign.');
        if (typePick === null) return freeNote('Choose the kind of material.');
        const res = judgeChi(lvl, c, typePick);
        verdict(res.ok);
        if (res.ok) return succeed(`χ = ${fmt(lvl.chiUnits)}${lvl.unit === 1 ? '' : ' × 10⁻⁵'}, ${lvl.type}.`);
        const parts: string[] = [];
        if (!res.chiOk) parts.push('The susceptibility is not right: μᵣ = 1 + χ. Keep the sign.');
        if (!res.typeOk) parts.push('The kind is not right: look at the sign and the size of χ.');
        miss(parts.join(' '));
      };
      controls.append(row('Susceptibility', cIn, lvl.unit === 1 ? '' : '10⁻⁵'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Kind'), ...btns), actionBtn('Classify the material', 'Classify the material', run));
      hint.textContent = `The relative permeability is μᵣ = ${lvl.mur >= 2 ? fmt(lvl.mur) : String(Number(lvl.mur.toPrecision(7)))}.`;
    }
    if (lvl.kind === 'curie') {
      const xIn = field('Susceptibility at the new temperature in 10⁻⁵', 'χ₂ = ? × 10⁻⁵');
      const run = () => {
        if (finished || busy()) return;
        const x = num(xIn);
        if (x === null || x <= 0) return freeNote('Enter the susceptibility as a positive number.');
        const ok = judgeCurie(lvl, x).ok;
        verdict(ok);
        if (ok) return succeed(`χ₂ = ${fmt(lvl.chi2)} × 10⁻⁵.`);
        miss('That is not the susceptibility at the new temperature: for a paramagnet, does it rise or fall when the sample is cooled, and by what factor?');
      };
      controls.append(row('New susceptibility', xIn, '10⁻⁵'), actionBtn('Change the temperature', 'Change the temperature', run));
      hint.textContent = `χ = ${lvl.chi1} × 10⁻⁵ at ${lvl.t1} K. The sample is taken to ${lvl.t2} K.`;
    }
    if (lvl.kind === 'pick') {
      const group = (key: 'repelled' | 'weak' | 'strong', name: string, prefix: string) => {
        const btns: HTMLElement[] = lvl.options.map((o) => {
          const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': `${prefix}: ${o}`, 'aria-pressed': 'false', onclick: () => {
            picks[key] = o;
            btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          } }, o);
          return b;
        });
        return h('div', { class: 'control' }, h('span', { class: 'control-label' }, name), ...btns);
      };
      const run = () => {
        if (finished || busy()) return;
        if (!picks.repelled || !picks.weak || !picks.strong) return freeNote('Make all three choices first.');
        const res = judgePick(lvl, picks.repelled, picks.weak, picks.strong);
        verdict(res.ok);
        if (res.ok) return succeed(`${lvl.repelled} is repelled, ${lvl.weak} weakly attracted, ${lvl.strong} strongly attracted.`);
        const parts: string[] = [];
        if (!res.rOk) parts.push('The repelled sample is not right: which kind of material moves from strong to weak field?');
        if (!res.wOk) parts.push('The weakly attracted sample is not right: its atoms have permanent moments that only partly line up.');
        if (!res.sOk) parts.push('The strongly attracted sample is not right: look for a material with domains.');
        miss(parts.join(' '));
      };
      controls.append(group('repelled', 'Repelled', 'Repelled'), group('weak', 'Weakly attracted', 'Weakly attracted'), group('strong', 'Strongly attracted', 'Strongly attracted'), actionBtn('Bring the magnet near', 'Bring the magnet near', run));
      hint.textContent = 'The three samples are one diamagnetic, one paramagnetic and one ferromagnetic material.';
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const dipole = (x: number, y: number, ang: number, size = 8) => {
      g.lineWidth = 3;
      g.strokeStyle = NORTH;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(ang) * size, y - Math.sin(ang) * size);
      g.stroke();
      g.strokeStyle = SOUTH;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - Math.cos(ang) * size, y + Math.sin(ang) * size);
      g.stroke();
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    /** A grid of atomic dipoles; align is the fraction that points along the field (to the right), jitter is the thermal wobble. */
    const dipoleGrid = (x0: number, y0: number, x1: number, y1: number, cols: number, rows: number, align: number, jitter: number) => {
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = x0 + ((i + 0.5) / cols) * (x1 - x0);
          const y = y0 + ((j + 0.5) / rows) * (y1 - y0);
          const rnd = hash(i, j) * Math.PI * 2;
          const wob = Math.sin(clock * (3 + hash(j, i) * 4) + i) * jitter;
          const a = rnd * (1 - align) + wob * (1 - align * 0.5);
          dipole(x, y, align >= 0.99 ? wob * 0.05 : a, 7);
        }
      }
    };

    function drawCore() {
      if (lvl.kind !== 'core') return;
      const f = runF();
      g.strokeStyle = '#b87333';
      g.lineWidth = 3;
      for (let k = 0; k < 12; k++) {
        g.beginPath();
        g.ellipse(150 + k * 28, CY, 6, 70, 0, 0, Math.PI * 2);
        g.stroke();
      }
      g.fillStyle = col.panel;
      g.globalAlpha = 0.5;
      g.fillRect(145, CY - 52, 320, 104);
      g.globalAlpha = 1;
      dipoleGrid(150, CY - 50, 462, CY + 50, 14, 5, 0.1 + 0.9 * f, 1.2);
      label(g, `H = ? , M = ? , B = ?`, CX, 40, { size: 13, color: col.muted });
      if (f > 0) label(g, `H ${fmt(lvl.h)} A/m, M ${fmt(lvl.m * f)} A/m`, CX, 285, { size: 13, color: col.text });
      verdictLabel(`B = ${fmt(lvl.b)} T`, CX, 318);
    }
    function drawChi() {
      if (lvl.kind !== 'chi') return;
      const f = runF();
      // field lines pass through, are expelled by, or are drawn into a bar, depending on μr
      const bar = [CX - 40, CY - 50, 80, 100] as const;
      const dens = lvl.mur > 5 ? 2.2 : lvl.mur > 1 ? 1.1 : 0.9;
      for (let k = 0; k < 11; k++) {
        const y = 40 + k * 26;
        const inside = y > bar[1] && y < bar[1] + bar[3];
        let y2 = y;
        if (lvl.mur > 5 && !inside) y2 = y + (CY - y) * 0.25 * f;
        if (lvl.mur <= 1 && inside) y2 = y + (y < CY ? -1 : 1) * 24 * f;
        g.strokeStyle = col.accent;
        g.lineWidth = 1.5;
        g.globalAlpha = 0.6;
        g.beginPath();
        g.moveTo(80, y);
        g.lineTo(bar[0] - 20, y);
        g.quadraticCurveTo(bar[0], y2, bar[0] + 10, y2);
        g.lineTo(bar[0] + bar[2] - 10, y2);
        g.quadraticCurveTo(bar[0] + bar[2], y2, bar[0] + bar[2] + 20, y);
        g.lineTo(560, y);
        g.stroke();
        g.globalAlpha = 1;
        const t = (((clock * 0.2 * dens + k * 0.09) % 1) + 1) % 1;
        disc(g, 80 + t * 480, Math.abs(t * 480 + 80 - CX) < 60 ? y2 : y, 2.2, col.accent);
      }
      g.fillStyle = col.panel;
      g.strokeStyle = col.line;
      g.lineWidth = 2;
      g.globalAlpha = 0.7;
      g.fillRect(...bar);
      g.globalAlpha = 1;
      g.strokeRect(...bar);
      label(g, 'sample', CX, CY, { size: 12, color: col.muted });
      verdictLabel(`${lvl.type}`, CX, 318);
    }
    function drawCurie() {
      if (lvl.kind !== 'curie') return;
      const f = runF();
      const t = lvl.t1 + (lvl.t2 - lvl.t1) * f;
      // the alignment is proportional to 1/T, the wobble to T
      const align = Math.min(0.95, (lvl.chi1 / 6) * (lvl.t1 / t) * 0.7 + 0.05);
      dipoleGrid(120, 80, 520, 280, 16, 7, align, t / 120);
      label(g, `T = ${fmt(t)} K`, CX, 44, { size: 15, color: col.text });
      label(g, 'field →', 80, CY, { size: 12, color: col.muted });
      verdictLabel(`χ = ${fmt(lvl.chi2)} × 10⁻⁵ at ${lvl.t2} K`, CX, 318);
    }
    function drawPick() {
      if (lvl.kind !== 'pick') return;
      const f = runF();
      // the magnet at the left, three samples to the right; each moves towards or away from it after the test
      g.fillStyle = SOUTH;
      g.fillRect(60, CY - 40, 50, 80);
      g.fillStyle = NORTH;
      g.fillRect(110, CY - 40, 50, 80);
      label(g, 'S', 85, CY, { size: 16, color: '#fff' });
      label(g, 'N', 135, CY, { size: 16, color: '#fff' });
      lvl.options.forEach((name, i) => {
        const y = 80 + i * 90;
        let x = 360;
        const shift = name === lvl.repelled ? 40 : name === lvl.weak ? -30 : -130;
        x += shift * f;
        g.fillStyle = col.panel;
        g.strokeStyle = col.line;
        g.lineWidth = 2;
        g.fillRect(x - 28, y - 22, 56, 44);
        g.strokeRect(x - 28, y - 22, 56, 44);
        label(g, name, x, y, { size: 12, color: col.text });
        if (verdictAt !== null && verdictOk) label(g, name === lvl.repelled ? 'repelled' : name === lvl.weak ? 'weakly attracted' : 'strongly attracted', x + 100, y, { size: 11, color: col.good });
      });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawCore();
      drawChi();
      drawCurie();
      drawPick();
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
