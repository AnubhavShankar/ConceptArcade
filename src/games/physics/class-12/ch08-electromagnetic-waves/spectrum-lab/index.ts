import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { BANDS, bandName, buildLevel, explainSolution, fmt, judgeClassify, judgeOrder, judgePhoton, judgeSame, starsFor, type Band, type Same } from './logic';

const W = 640;
const H = 340;
const REVEAL = 0.9;
const RUN = 3;
const COLOURS: Record<Band, string> = { radio: '#7a8a99', microwave: '#8e6bb0', infrared: '#c0392b', visible: '#2e9e4a', ultraviolet: '#3156d3', xray: '#1a5276', gamma: '#222' };

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
    const picked: Band[] = [];
    let bandPick: Band | null = null;
    let largerPick: 'first' | 'second' | null = null;
    let samePick: Same | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'The electromagnetic spectrum from radio waves to gamma rays, drawn as waves of shrinking wavelength.' });
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
    if (lvl.kind === 'order') {
      const btns: Record<string, HTMLButtonElement> = {};
      const chips = lvl.bands.map((b) => {
        const el = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': `Pick ${bandName(b)}`, onclick: () => {
          if (finished || picked.includes(b)) return;
          picked.push(b);
          el.setAttribute('disabled', '');
        } }, bandName(b)) as HTMLButtonElement;
        btns[b] = el;
        return el;
      });
      const run = () => {
        if (finished || busy()) return;
        const res = judgeOrder(lvl, picked);
        if (!res.complete) return freeNote('Pick all the bands first.');
        verdict(res.ok);
        if (res.ok) return succeed(`From longest to shortest wavelength: ${lvl.order.map(bandName).join(', ')}.`);
        miss('That is not the order: the longest wavelength comes first. Think of radio waves at one end and gamma rays at the other.');
      };
      const reset = () => {
        if (finished) return;
        picked.length = 0;
        chips.forEach((c) => c.removeAttribute('disabled'));
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Longest first'), ...chips), actionBtn('Start again', 'Reset the order', reset), actionBtn('Check the order', 'Check the order', run));
      hint.textContent = 'Pick the bands in order from the longest wavelength to the shortest.';
    }
    if (lvl.kind === 'classify') {
      const fIn = field('Frequency in Hz', 'f = ? Hz');
      const run = () => {
        if (finished || busy()) return;
        const f = num(fIn);
        if (f === null || f <= 0) return freeNote('Enter the frequency as a positive number of hertz, like 3e18.');
        if (bandPick === null) return freeNote('Choose the part of the spectrum.');
        const res = judgeClassify(lvl, bandPick, f);
        verdict(res.ok);
        if (res.ok) return succeed(`${bandName(lvl.band)}, f = ${fmt(lvl.hz)} Hz.`);
        const parts: string[] = [];
        if (!res.bOk) parts.push('The band is not right: compare the wavelength with the typical wavelengths of the bands.');
        if (!res.fOk) parts.push('The frequency is not right: it is the speed of light divided by the wavelength, in hertz.');
        miss(parts.join(' '));
      };
      controls.append(
        choice<Band>('Band', BANDS.map((b) => [b.id, `Band: ${b.name}`, b.name] as [Band, string, string]), (v) => (bandPick = v)),
        row('Frequency', fIn, 'Hz'),
        actionBtn('Identify the wave', 'Identify the wave', run),
      );
      hint.textContent = `The wavelength is ${lvl.lambdaText}. c = 3 × 10⁸ m/s.`;
    }
    if (lvl.kind === 'photon') {
      const eIn = field('Photon energy in eV', 'E = ? eV');
      const run = () => {
        if (finished || busy()) return;
        const e = num(eIn);
        if (e === null || e <= 0) return freeNote('Enter the energy as a positive number of eV, like 2.5e-9.');
        if (largerPick === null) return freeNote('Choose which radiation has the more energetic photons.');
        const res = judgePhoton(lvl, e, largerPick);
        verdict(res.ok);
        if (res.ok) return succeed(`E = ${fmt(lvl.ev)} eV, and the ${lvl.larger} radiation has the more energetic photons.`);
        const parts: string[] = [];
        if (!res.eOk) parts.push('The energy is not right: E = hf = hc/λ, in joules, then divide by 1.6 × 10⁻¹⁹ J per eV.');
        if (!res.lOk) parts.push('The comparison is not right: how does the photon energy depend on the wavelength?');
        miss(parts.join(' '));
      };
      controls.append(row('Photon energy', eIn, 'eV'), choice<'first' | 'second'>('More energetic photons', [['first', 'The first radiation has the more energetic photons', 'First'], ['second', 'The second radiation has the more energetic photons', 'Second']], (v) => (largerPick = v)), actionBtn('Measure the photons', 'Measure the photons', run));
      hint.textContent = `First radiation: ${lvl.lambdaText}. Second radiation: ${lvl.otherText}. h = 6.63 × 10⁻³⁴ J s, 1 eV = 1.6 × 10⁻¹⁹ J.`;
    }
    if (lvl.kind === 'same') {
      const tIn = field('Travel time in ms', 't = ? ms');
      const run = () => {
        if (finished || busy()) return;
        const t = num(tIn);
        if (t === null || t <= 0) return freeNote('Enter the time as a positive number of ms.');
        if (samePick === null) return freeNote('Choose which quantity is the same for all three.');
        const res = judgeSame(lvl, t, samePick);
        verdict(res.ok);
        if (res.ok) return succeed(`${fmt(lvl.ms)} ms for each, because the speed in vacuum is the same.`);
        const parts: string[] = [];
        if (!res.tOk) parts.push('The time is not right: distance divided by the speed of light, in ms.');
        if (!res.sOk) parts.push('The quantity is not right: which of these do the three waves not share, and which do they?');
        miss(parts.join(' '));
      };
      controls.append(
        row('Travel time', tIn, 'ms'),
        choice<Same>('The same for all three', [['speed', 'Speed in vacuum is the same', 'Speed'], ['frequency', 'Frequency is the same', 'Frequency'], ['wavelength', 'Wavelength is the same', 'Wavelength'], ['energy', 'Photon energy is the same', 'Photon energy']], (v) => (samePick = v)),
        actionBtn('Race the waves', 'Race the waves', run),
      );
      hint.textContent = `Distance travelled: ${lvl.distanceKm} km.`;
    }

    // ---- drawing --------------------------------------------------------------------------------------------------------
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    function drawSpectrum(highlight?: Band | null, order?: Band[]) {
      // a bar with seven bands, with a wave sketch whose wavelength shrinks from left to right
      const x0 = 30;
      const w = 580;
      const seg = w / BANDS.length;
      BANDS.forEach((b, i) => {
        const dim = order && !order.includes(b.id);
        g.fillStyle = COLOURS[b.id];
        g.globalAlpha = dim ? 0.25 : highlight && highlight !== b.id ? 0.35 : 1;
        g.fillRect(x0 + i * seg, 60, seg - 3, 34);
        g.globalAlpha = 1;
        label(g, b.name, x0 + i * seg + seg / 2, 76, { size: 10, color: '#fff' });
        // wave sketch
        const lam = 52 * Math.pow(0.62, i) + 4;
        g.strokeStyle = COLOURS[b.id];
        g.lineWidth = 2;
        g.beginPath();
        for (let x = 0; x <= seg - 6; x += 1) {
          const y = 140 + Math.sin(((x + clock * 40) / lam) * Math.PI * 2) * 16;
          if (x === 0) g.moveTo(x0 + i * seg + x, y);
          else g.lineTo(x0 + i * seg + x, y);
        }
        g.stroke();
      });
      label(g, 'longer wavelength, lower frequency, lower photon energy', 190, 36, { size: 11, color: col.muted });
      label(g, '→ shorter wavelength, higher frequency', 500, 36, { size: 11, color: col.muted });
    }
    function drawScene() {
      if (lvl.kind === 'order') {
        drawSpectrum(null, lvl.bands);
        // the picks so far, as chips along the bottom
        picked.forEach((b, i) => {
          g.fillStyle = COLOURS[b];
          g.fillRect(40 + i * 110, 230, 100, 36);
          label(g, `${i + 1}. ${bandName(b)}`, 90 + i * 110, 248, { size: 11, color: '#fff' });
        });
        label(g, picked.length ? 'your order, longest wavelength first' : 'pick the bands in order', 320, 290, { size: 12, color: col.muted });
      } else if (lvl.kind === 'classify') {
        drawSpectrum(bandPick);
        label(g, `λ = ${lvl.lambdaText}`, 320, 220, { size: 18, color: col.text });
      } else if (lvl.kind === 'photon') {
        drawSpectrum(null);
        label(g, `first: ${lvl.lambdaText}    second: ${lvl.otherText}`, 320, 220, { size: 16, color: col.text });
      } else {
        // a race: three waves of very different wavelength move together
        const f = runT === null ? 0 : Math.min(1, runT / RUN);
        for (let i = 0; i < 3; i++) {
          const y = 110 + i * 60;
          const lam = [4, 24, 90][i];
          g.strokeStyle = [COLOURS.xray, COLOURS.visible, COLOURS.radio][i];
          g.lineWidth = 2.5;
          g.beginPath();
          for (let x = 60; x <= 60 + 480 * f + 30; x += 1) {
            const yy = y + Math.sin(((x - clock * 90) / lam) * Math.PI * 2) * 12;
            if (x === 60) g.moveTo(x, yy);
            else g.lineTo(x, yy);
          }
          g.stroke();
          disc(g, 60 + 480 * f + 30, y, 5, col.accent);
          label(g, ['X-rays 10⁻¹⁰ m', 'red light 6800 Å', 'radio 500 m'][i], 100, y - 24, { size: 11, color: col.muted });
        }
        label(g, f >= 1 ? 'all arrive together' : 'the three waves race', 320, 300, { size: 13, color: col.text });
      }
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawScene();
      verdictLabel(lvl.kind === 'order' ? 'longest to shortest' : lvl.kind === 'classify' ? `${bandName(lvl.band)}, ${fmt(lvl.hz)} Hz` : lvl.kind === 'photon' ? `E = ${fmt(lvl.ev)} eV` : `${fmt(lvl.ms)} ms, same speed`, 320, 324);
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
