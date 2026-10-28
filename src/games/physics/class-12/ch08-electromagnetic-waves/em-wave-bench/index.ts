import { defineGame } from '@core/define';
import { label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeDirection, judgeEnergy, judgeEquation, judgeMagnitude, judgeQuantities, judgeWavelength, starsFor, type Axis, type Equal } from './logic';

const W = 640;
const H = 340;
const E_COL = '#c0392b';
const B_COL = '#3156d3';
const REVEAL = 0.9;
const RUN = 3;

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
    let axisPick: Axis | null = null;
    let eqPick: Equal | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A plane electromagnetic wave travelling along an axis, with the electric field in one plane and the magnetic field in a plane at right angles.' });
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
    if (lvl.kind === 'magnitude') {
      const isE = lvl.mode === 'E';
      const aIn = field(isE ? 'Electric field amplitude in V/m' : 'Magnetic field in nT', isE ? 'E₀ = ? V/m' : 'B = ? nT');
      const run = () => {
        if (finished || busy()) return;
        const a = num(aIn);
        if (!positive(a)) return freeNote('Enter a positive number.');
        const ok = judgeMagnitude(lvl, a as number).ok;
        verdict(ok);
        if (ok) return succeed(isE ? `E₀ = ${fmt(lvl.answer)} V/m.` : `B = ${fmt(lvl.answer)} nT.`);
        miss(isE ? 'That is not the electric amplitude: the ratio E₀/B₀ for a wave in vacuum is a universal speed. Mind the nT.' : 'That is not the magnetic field: in vacuum E/B is the speed of light. Give it in nT.');
      };
      controls.append(row(isE ? 'Electric amplitude' : 'Magnetic field', aIn, isE ? 'V/m' : 'nT'), actionBtn('Send the wave', 'Send the wave', run));
      hint.textContent = isE ? `The magnetic field amplitude is ${lvl.b0Nano} nT.` : `At a point and instant E = ${lvl.e0} V/m.`;
    }
    if (lvl.kind === 'direction') {
      const axes: Axis[] = ['+x', '-x', '+y', '-y', '+z', '-z'];
      const btns: HTMLElement[] = axes.map((a) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': `B points along ${a}`, 'aria-pressed': 'false', onclick: () => {
          axisPick = a;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, a);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        if (axisPick === null) return freeNote('Choose a direction for the magnetic field.');
        const ok = judgeDirection(lvl, axisPick).ok;
        verdict(ok);
        if (ok) return succeed(`B points along ${lvl.b}.`);
        miss('That is not the direction of B: it must be at right angles to both E and the direction of travel, and E × B must point along the direction of travel.');
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'B points along'), ...btns), actionBtn('Check the direction', 'Check the direction', run));
      hint.textContent = `The wave travels along ${lvl.travel} and its electric field is along ${lvl.e}.`;
    }
    if (lvl.kind === 'wavelength') {
      const aIn = field('Wavelength for the first frequency in m', 'λ₁ = ? m');
      const bIn = field('Wavelength for the second frequency in m', 'λ₂ = ? m');
      const run = () => {
        if (finished || busy()) return;
        const a = num(aIn);
        const b = num(bIn);
        if (!positive(a, b)) return freeNote('Enter both answers as positive numbers.');
        const res = judgeWavelength(lvl, a as number, b as number);
        verdict(res.ok);
        if (res.ok) return succeed(`λ₁ = ${fmt(lvl.l1)} m and λ₂ = ${fmt(lvl.l2)} m.`);
        const parts: string[] = [];
        if (!res.aOk) parts.push('The first wavelength is not right: it is the speed of light divided by the frequency in hertz.');
        if (!res.bOk) parts.push('The second wavelength is not right: the higher the frequency, the shorter the wavelength.');
        miss(parts.join(' '));
      };
      controls.append(row('First wavelength', aIn, 'm'), row('Second wavelength', bIn, 'm'), actionBtn('Tune the radio', 'Tune the radio', run));
      hint.textContent = `The two frequencies are ${lvl.f1} MHz and ${lvl.f2} MHz. c = 3 × 10⁸ m/s.`;
    }
    if (lvl.kind === 'quantities') {
      const bIn = field('Magnetic field amplitude in nT', 'B₀ = ? nT');
      const kIn = field('Wave number in rad/m', 'k = ? rad/m');
      const lIn = field('Wavelength in m', 'λ = ? m');
      const run = () => {
        if (finished || busy()) return;
        const b = num(bIn);
        const k = num(kIn);
        const l = num(lIn);
        if (!positive(b, k, l)) return freeNote('Enter all three as positive numbers.');
        const res = judgeQuantities(lvl, b as number, k as number, l as number);
        verdict(res.ok);
        if (res.ok) return succeed(`B₀ = ${fmt(lvl.b0Nano)} nT, k = ${fmt(lvl.k)} rad/m, λ = ${fmt(lvl.lambda)} m.`);
        const parts: string[] = [];
        if (!res.bOk) parts.push('The magnetic amplitude is not right: B₀ = E₀/c, in nT.');
        if (!res.kOk) parts.push('The wave number is not right: k = 2π/λ.');
        if (!res.lOk) parts.push('The wavelength is not right: λ = c/f.');
        miss(parts.join(' '));
      };
      controls.append(row('Magnetic amplitude', bIn, 'nT'), row('Wave number', kIn, 'rad/m'), row('Wavelength', lIn, 'm'), actionBtn('Send the wave', 'Send the wave', run));
      hint.textContent = `E₀ = ${lvl.e0} V/m at ${lvl.fMHz} MHz.`;
    }
    if (lvl.kind === 'equation') {
      const lIn = field('Wavelength in cm', 'λ = ? cm');
      const fIn = field('Frequency in GHz', 'f = ? GHz');
      const eIn = field('Electric field amplitude in V/m', 'E₀ = ? V/m');
      const run = () => {
        if (finished || busy()) return;
        const l = num(lIn);
        const f = num(fIn);
        const e = num(eIn);
        if (!positive(l, f, e)) return freeNote('Enter all three as positive numbers.');
        const res = judgeEquation(lvl, l as number, f as number, e as number);
        verdict(res.ok);
        if (res.ok) return succeed(`λ = ${fmt(lvl.lambdaCm)} cm, f = ${fmt(lvl.fGHz)} GHz, E₀ = ${fmt(lvl.e0)} V/m.`);
        const parts: string[] = [];
        if (!res.lOk) parts.push('The wavelength is not right: the number multiplying x is the wave number k = 2π/λ. Give λ in cm.');
        if (!res.fOk) parts.push('The frequency is not right: the number multiplying t is the angular frequency ω = 2πf. Give f in GHz.');
        if (!res.eOk) parts.push('The electric amplitude is not right: E₀ = cB₀.');
        miss(parts.join(' '));
      };
      controls.append(row('Wavelength', lIn, 'cm'), row('Frequency', fIn, 'GHz'), row('Electric amplitude', eIn, 'V/m'), actionBtn('Read the equation', 'Read the equation', run));
      hint.textContent = `B = ${lvl.b0e7} × 10⁻⁷ T × sin(${lvl.k3} × 10³ x + ${fmt(lvl.omega11)} × 10¹¹ t), with x in metres and t in seconds.`;
    }
    if (lvl.kind === 'energy') {
      const lIn = field('Wavelength in cm', 'λ = ? cm');
      const bIn = field('Magnetic field amplitude in nT', 'B₀ = ? nT');
      const uIn = field('Average magnetic energy density in nJ/m³', 'u_B = ? nJ/m³');
      const opts: [Equal, string, string][] = [['equal', 'The electric and magnetic energy densities are equal', 'Equal'], ['e-larger', 'The electric energy density is larger', 'Electric larger'], ['b-larger', 'The magnetic energy density is larger', 'Magnetic larger']];
      const btns: HTMLElement[] = opts.map(([v, aria, text]) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': aria, 'aria-pressed': 'false', onclick: () => {
          eqPick = v;
          btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
        } }, text);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const l = num(lIn);
        const b = num(bIn);
        const u = num(uIn);
        if (!positive(l, b, u)) return freeNote('Enter all three as positive numbers.');
        if (eqPick === null) return freeNote('Compare the two energy densities.');
        const res = judgeEnergy(lvl, l as number, b as number, u as number, eqPick);
        verdict(res.ok);
        if (res.ok) return succeed(`λ = ${fmt(lvl.lambdaCm)} cm, B₀ = ${fmt(lvl.b0Nano)} nT, u_B = ${fmt(lvl.uNano)} nJ/m³, equal to u_E.`);
        const parts: string[] = [];
        if (!res.lOk) parts.push('The wavelength is not right: λ = c/f. Give it in cm.');
        if (!res.bOk) parts.push('The magnetic amplitude is not right: B₀ = E₀/c.');
        if (!res.uOk) parts.push('The magnetic energy density is not right: its average is B₀²/4μ₀. Give it in nJ/m³.');
        if (!res.eqOk) parts.push('Think again about the comparison: work out the average electric energy density ¼ε₀E₀² too.');
        miss(parts.join(' '));
      };
      controls.append(row('Wavelength', lIn, 'cm'), row('Magnetic amplitude', bIn, 'nT'), row('Magnetic energy density', uIn, 'nJ/m³'), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'The energy densities'), ...btns), actionBtn('Measure the wave', 'Measure the wave', run));
      hint.textContent = `E₀ = ${lvl.e0} V/m at ${lvl.fGHz} × 10⁹ Hz. ε₀ = 8.854 × 10⁻¹² C²/(N m²), μ₀ = 4π × 10⁻⁷ T m/A.`;
    }

    // ---- drawing --------------------------------------------------------------------------------------------------------
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    function drawWave() {
      // the wave travels to the right; E is in the vertical plane, B in the plane out of the page (drawn at an angle)
      const x0 = 70;
      const x1 = 590;
      const y0 = 175;
      const lam = lvl.kind === 'wavelength' ? 150 : lvl.kind === 'quantities' ? 190 - Math.min(80, lvl.fMHz) : 160;
      const phase = clock * 2;
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1 + 20, y0);
      g.stroke();
      label(g, 'direction of travel', x1 - 40, y0 + 18, { size: 11, color: col.muted });
      g.strokeStyle = E_COL;
      g.lineWidth = 3;
      g.beginPath();
      for (let x = x0; x <= x1; x += 4) {
        const y = y0 - Math.sin(((x - x0) / lam) * Math.PI * 2 - phase) * 70;
        if (x === x0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      g.strokeStyle = B_COL;
      g.lineWidth = 3;
      g.beginPath();
      for (let x = x0; x <= x1; x += 4) {
        const s = Math.sin(((x - x0) / lam) * Math.PI * 2 - phase) * 55;
        // B is drawn out of the page: skewed diagonally
        const px = x + s * 0.6;
        const py = y0 + s * 0.55;
        if (x === x0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();
      label(g, 'E', x0 - 14, y0 - 70, { size: 14, color: E_COL });
      label(g, 'B (at right angles to E and to the travel)', x0 + 130, y0 + 100, { size: 12, color: B_COL });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawWave();
      verdictLabel(lvl.kind === 'magnitude' ? (lvl.mode === 'E' ? `E₀ = ${fmt(lvl.answer)} V/m` : `B = ${fmt(lvl.answer)} nT`) : lvl.kind === 'direction' ? `B along ${lvl.b}` : lvl.kind === 'wavelength' ? `${fmt(lvl.l1)} m and ${fmt(lvl.l2)} m` : lvl.kind === 'quantities' ? `B₀ = ${fmt(lvl.b0Nano)} nT, λ = ${fmt(lvl.lambda)} m` : lvl.kind === 'equation' ? `λ = ${fmt(lvl.lambdaCm)} cm, f = ${fmt(lvl.fGHz)} GHz` : `u_E = u_B = ${fmt(lvl.uNano)} nJ/m³`, 320, 324);
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
