import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeDipole, judgePoint, judgePolygon, judgeZero, potentialAt, starsFor, type Pt, type Src, type Zero } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const C = { x: W / 2, y: H / 2 };

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

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A map of electric potential: red where it is positive, blue where it is negative, with rings rippling out of the charges and a probe that reads the potential.' });
    const g = fitCanvas(canvas, W, H);
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const solution = h('section', { class: 'panel solution', hidden: true });
    const hint = h('p', { class: 'muted note' });
    const controls = h('div', { class: 'lab-controls' });
    const meter = h('span', { class: 'v-readout', 'aria-live': 'off' });
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
    };
    const field = (aria: string, placeholder: string) => h('input', { class: 'field', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': aria, placeholder }) as HTMLInputElement;
    const num = (el: HTMLInputElement) => parseNumber(el.value);
    const actionBtn = (text: string, aria: string, fn: () => void) => h('button', { class: 'btn', type: 'button', 'aria-label': aria, onclick: fn }, text);
    const slider = (aria: string, min: number, max: number, step: number, value: number, on: (v: number) => void) => h('input', { type: 'range', min, max, step, value: String(value), class: 'v-slider', 'aria-label': aria, oninput: (e: Event) => on(Number((e.target as HTMLInputElement).value)) }) as HTMLInputElement;
    const choiceGroup = <T extends string>(name: string, options: [T, string, string][]) => {
      let value: T | null = null;
      const buttons = options.map(([v, text, aria]) => h('button', { class: 'btn secondary small', type: 'button', 'aria-pressed': 'false', 'aria-label': aria, onclick: () => {
        value = v;
        buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === v)));
      } }, text));
      return { get: () => value, box: h('div', { class: 'route-group' }, h('strong', null, name), ...buttons) };
    };

    // ---- the scene: charges in cm, a scale, and a probe ---------------------------------------------------
    let sources: Src[] = [];
    let k = 8; // px per cm
    let origin = { ...C };
    const toPx = (p: Pt): Pt => ({ x: origin.x + p.x * k, y: origin.y - p.y * k });
    let probe: Pt | null = null;
    let probeR = 10;
    let probeX = 0;

    if (lvl.kind === 'point') {
      sources = [{ q: lvl.Q, at: { x: 0, y: 0 } }];
      k = 7;
      origin = { x: 90, y: C.y };
      probe = { x: probeR, y: 0 };
    } else if (lvl.kind === 'polygon') {
      k = 11;
      sources = Array.from({ length: lvl.n }, (_, i) => ({ q: lvl.q, at: { x: lvl.R * Math.cos((2 * Math.PI * i) / lvl.n + Math.PI / 2), y: lvl.R * Math.sin((2 * Math.PI * i) / lvl.n + Math.PI / 2) } }));
      probe = { x: 0, y: 0 };
    } else if (lvl.kind === 'zero') {
      k = 520 / (lvl.d + 36);
      origin = { x: 60 + 18 * k, y: C.y };
      sources = [{ q: lvl.big, at: { x: 0, y: 0 } }, { q: lvl.small, at: { x: lvl.d, y: 0 } }];
      probeX = lvl.d / 2;
      probe = { x: probeX, y: 0 };
    } else {
      k = 6;
      const a = lvl.sep / 2;
      sources = [{ q: lvl.q, at: { x: a, y: 0 } }, { q: -lvl.q, at: { x: -a, y: 0 } }];
      const t = (lvl.theta * Math.PI) / 180;
      probe = { x: lvl.r * Math.cos(t), y: lvl.r * Math.sin(t) };
    }

    // ---- the potential map, painted once into an offscreen canvas --------------------------------------------
    const map = document.createElement('canvas');
    map.width = 128;
    map.height = 68;
    const mg = map.getContext('2d')!;
    const vref = 260;
    function paintMap() {
      mg.clearRect(0, 0, 128, 68);
      for (let i = 0; i < 128; i++) {
        for (let j = 0; j < 68; j++) {
          const px = { x: ((i + 0.5) * W) / 128, y: ((j + 0.5) * H) / 68 };
          const cm = { x: (px.x - origin.x) / k, y: (origin.y - px.y) / k };
          const v = potentialAt(cm, sources);
          const a = Math.min(0.7, Math.abs(Math.tanh(v / vref)) * 0.7);
          mg.fillStyle = v >= 0 ? `rgba(192,57,43,${a})` : `rgba(49,86,211,${a})`;
          mg.fillRect(i, j, 1, 1);
        }
      }
    }
    paintMap();

    // ---- the levels ---------------------------------------------------------------------------------------------
    if (lvl.kind === 'point') {
      const sl = slider('Probe distance from the charge in cm', 2, 40, 0.5, probeR, (v) => {
        probeR = v;
        probe = { x: v, y: 0 };
      });
      const wIn = field('Work to bring the test charge in mJ', 'W = ? mJ');
      const run = () => {
        if (finished) return;
        const w = num(wIn);
        if (w === null) return freeNote('Enter the work in mJ, with a minus sign if it is negative.');
        const res = judgePoint(lvl, probeR, w);
        verdict(res.ok);
        if (res.ok) return succeed(`The probe reads ${fmt(res.v)} V, and the work is ${fmt(lvl.work)} mJ.`);
        const parts: string[] = [];
        if (!res.rOk) parts.push(`The potential at the probe is ${Math.abs(res.v) > Math.abs(lvl.target) ? 'too large' : 'too small'} in size.`);
        if (!res.workOk) parts.push('The work is not right: W = q₀V, and it carries the sign of V.');
        miss(parts.join(' '));
      };
      wIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Target: ${fmt(lvl.target)} V`), sl, meter), h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Bring in ${lvl.testQ} µC`), wIn, h('span', { class: 'unit' }, 'mJ')), actionBtn('Lock the probe', 'Lock the probe', run));
      hint.textContent = `The charge is ${lvl.Q > 0 ? '+' : '−'}${Math.abs(lvl.Q)} nC. The test charge is +${lvl.testQ} µC, brought from far away (where V = 0).`;
    }
    if (lvl.kind === 'polygon') {
      const vIn = field('Potential at the centre in V', 'V = ? V');
      const fld = choiceGroup<Zero>('The electric field at the centre is…', [['zero', 'Zero', 'The field at the centre is zero'], ['not-zero', 'Not zero', 'The field at the centre is not zero']]);
      const run = () => {
        if (finished) return;
        const v = num(vIn);
        if (v === null) return freeNote('Enter the potential in volts, with a minus sign if it is negative.');
        if (!fld.get()) return freeNote('Say whether the field at the centre is zero.');
        const res = judgePolygon(lvl, v, fld.get() as Zero);
        verdict(res.ok);
        if (res.ok) return succeed(`V = ${fmt(lvl.answer)} V at the centre, while the field there is zero.`);
        const parts: string[] = [];
        if (!res.vOk) parts.push('The potential is not right: potentials are scalars, so add every charge’s kq/r.');
        if (!res.fieldOk) parts.push('The field is a vector: think about the directions of the individual fields at the centre.');
        miss(parts.join(' '));
      };
      vIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Potential at the centre'), vIn, h('span', { class: 'unit' }, 'V')), fld.box, actionBtn('Check the centre', 'Check the centre', run));
      hint.textContent = `${lvl.n} charges of ${lvl.q > 0 ? '+' : '−'}${Math.abs(lvl.q)} nC at the corners of a regular polygon, each ${lvl.R} cm from the centre.`;
    }
    if (lvl.kind === 'zero') {
      const sl = slider('Probe position along the line in cm', -18, lvl.d + 18, 0.5, probeX, (v) => {
        probeX = v;
        probe = { x: v, y: 0 };
      });
      const bIn = field('Zero point between the charges in cm', 'between = ? cm');
      const oIn = field('Zero point outside the charges in cm', 'outside = ? cm');
      const run = () => {
        if (finished) return;
        const b = num(bIn);
        const o = num(oIn);
        if (b === null || o === null || b <= 0 || o <= 0) return freeNote('Enter both distances from the larger charge, as positive numbers of cm.');
        const res = judgeZero(lvl, b, o);
        verdict(res.ok);
        if (res.ok) return succeed(`V = 0 at ${fmt(lvl.between)} cm and at ${fmt(lvl.outside)} cm from the larger charge.`);
        const parts: string[] = [];
        if (!res.betweenOk) parts.push('The point between the charges is not right: the distances must be in the ratio of the charges.');
        if (!res.outsideOk) parts.push('The point outside is not right: it lies on the side of the smaller charge.');
        miss(parts.join(' '));
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Slide the probe'), sl, meter), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Between the charges'), bIn, h('span', { class: 'unit' }, 'cm')), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Outside the charges'), oIn, h('span', { class: 'unit' }, 'cm')), actionBtn('Check the zero points', 'Check the zero points', run));
      hint.textContent = `The larger charge is ${lvl.big > 0 ? '+' : '−'}${Math.abs(lvl.big)} nC (on the left) and the smaller is ${lvl.small > 0 ? '+' : '−'}${Math.abs(lvl.small)} nC, ${lvl.d} cm apart. Distances are measured from the larger charge.`;
    }
    if (lvl.kind === 'dipole') {
      const vIn = field('Potential at the probe in V', 'V = ? V');
      const run = () => {
        if (finished) return;
        const v = num(vIn);
        if (v === null) return freeNote('Enter the potential in volts, with a minus sign if it is negative (0 if it is zero).');
        const res = judgeDipole(lvl, v);
        verdict(res.ok);
        if (res.ok) return succeed(lvl.answer === 0 ? 'The potential is zero everywhere on the equatorial plane.' : `V = ${fmt(lvl.answer)} V at the probe.`);
        miss(res.verdict === 'wrong-sign' ? 'The sign is wrong: the potential is positive on the side of the positive charge.' : lvl.answer === 0 ? 'The potential is not that large there: look at the angle.' : `Your potential is too ${res.verdict === 'too-big' ? 'large' : 'small'}.`);
      };
      vIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Potential at the probe'), vIn, h('span', { class: 'unit' }, 'V')), actionBtn('Measure the potential', 'Measure the potential', run));
      hint.textContent = `Dipole: ±${lvl.q} nC, ${lvl.sep} cm apart (positive charge on the right). The probe is ${lvl.r} cm from its centre, ${lvl.theta}° from the axis (measured from the positive side).`;
    }

    // ---- drawing -----------------------------------------------------------------------------------------------------
    function drawScene() {
      g.drawImage(map, 0, 0, W, H);
      // rings that ripple out of the charges
      for (const s of sources) {
        const p = toPx(s.at);
        g.strokeStyle = s.q > 0 ? POS : NEG;
        g.lineWidth = 2;
        for (let r = 0; r < 4; r++) {
          const t = ((clock * 0.35 + r / 4) % 1 + 1) % 1;
          g.globalAlpha = 0.5 * (1 - t);
          g.beginPath();
          g.arc(p.x, p.y, 16 + t * 90, 0, Math.PI * 2);
          g.stroke();
        }
        g.globalAlpha = 1;
      }
      for (const s of sources) {
        const p = toPx(s.at);
        const small = lvl.kind === 'dipole' ? 9 : 14;
        disc(g, p.x, p.y, small, s.q > 0 ? POS : NEG, '#ffffff', 2);
        label(g, s.q > 0 ? '+' : '−', p.x, p.y + small * 0.4, { size: small * 1.1, color: '#ffffff' });
      }
      if (lvl.kind === 'zero') {
        const a = toPx({ x: 0, y: 0 });
        const b = toPx({ x: lvl.d, y: 0 });
        g.strokeStyle = col.muted;
        g.setLineDash([5, 5]);
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(a.x - 24 * k, a.y);
        g.lineTo(b.x + 24 * k, a.y);
        g.stroke();
        g.setLineDash([]);
      }
      if (probe) {
        const p = toPx(probe);
        const v = potentialAt(probe, sources);
        g.strokeStyle = col.text;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(p.x, p.y, 9 + 1.5 * Math.sin(clock * 5), 0, Math.PI * 2);
        g.stroke();
        label(g, 'probe', p.x, p.y - 17, { size: 12, color: col.text });
        if (lvl.kind === 'point' || lvl.kind === 'zero') meter.textContent = `V = ${Math.abs(v) < 0.5 ? '0' : fmt(v)} V`;
      }
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      g.clearRect(0, 0, W, H);
      drawScene();
      if (verdictAt !== null && clock - verdictAt < REVEAL) {
        g.strokeStyle = verdictOk ? col.good : col.bad;
        g.lineWidth = 6;
        g.globalAlpha = 1 - (clock - verdictAt) / REVEAL;
        g.strokeRect(3, 3, W - 6, H - 6);
        g.globalAlpha = 1;
      }
      const phase = verdictAt === null ? 'idle' : clock - verdictAt < REVEAL ? 'testing' : 'done';
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
