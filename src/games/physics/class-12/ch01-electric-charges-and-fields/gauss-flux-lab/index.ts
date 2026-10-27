import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeBox, judgeCubeFace, judgeDensity, judgeFlux, starsFor, type Density } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const C = { x: W / 2, y: H / 2 };

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const col = themeColors();
    const rnd = ctx.random;

    let misses = 0;
    let finished = false;
    let pendingWin: 1 | 2 | 3 | null = null;
    let wonAt: number | null = null;
    let clock = 0;
    let verdictAt: number | null = null;
    let verdictOk = false;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A charged object, a closed surface with charges around it, a black box, or a cube with a charge, with moving specks that show the charge or the field.' });
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
    };
    const field = (aria: string, placeholder: string) => h('input', { class: 'field', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': aria, placeholder }) as HTMLInputElement;
    const num = (el: HTMLInputElement) => parseNumber(el.value);
    const actionBtn = (text: string, aria: string, fn: () => void) => h('button', { class: 'btn', type: 'button', 'aria-label': aria, onclick: fn }, text);
    const choiceGroup = <T extends string>(name: string, options: [T, string, string][]) => {
      let value: T | null = null;
      const buttons = options.map(([v, text, aria]) => h('button', { class: 'btn secondary small', type: 'button', 'aria-pressed': 'false', 'aria-label': aria, onclick: () => {
        value = v;
        buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === v)));
      } }, text));
      return { get: () => value, box: h('div', { class: 'route-group' }, h('strong', null, name), ...buttons) };
    };
    // ---- level 1: charged objects ---------------------------------------------------------------------------
    let weighed = 0; // 0..1, how much of the charge has been "collected" after a right answer
    if (lvl.kind === 'density') {
      const sym = choiceGroup<Density>('The right density is…', [['λ', 'λ (per length)', 'Density is λ'], ['σ', 'σ (per area)', 'Density is σ'], ['ρ', 'ρ (per volume)', 'Density is ρ']]);
      const qIn = field('Total charge in µC', 'Q = ? µC');
      const run = () => {
        if (finished) return;
        if (!sym.get()) return freeNote('Choose which kind of density this object has first.');
        const q = num(qIn);
        if (q === null || q <= 0) return freeNote('Enter the total charge as a positive number of µC.');
        const res = judgeDensity(lvl, sym.get() as Density, q);
        verdict(res.ok);
        if (res.ok) return succeed(`Total charge ${fmt(lvl.answer)} µC: the right density, and the right total.`);
        const parts: string[] = [];
        if (!res.symbolOk) parts.push('That is not the right kind of density for this shape.');
        if (!res.qOk) parts.push(`Your total charge is too ${q > lvl.answer ? 'large' : 'small'}.`);
        miss(parts.join(' '));
      };
      qIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(sym.box, h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Total charge'), qIn, h('span', { class: 'unit' }, 'µC')), actionBtn('Weigh the charge', 'Weigh the charge', run));
      hint.textContent = `The object: ${lvl.what}. Density: ${lvl.value} ${lvl.unit}.`;
    }

    // ---- level 2: flux through a closed surface --------------------------------------------------------------
    const R2 = 62; // px for a surface of radius 1
    if (lvl.kind === 'flux') {
      const aIn = field('Net flux through the surface as drawn in N m²/C', 'Φ = ? N m²/C');
      const bIn = field('Net flux after the surface is resized in N m²/C', 'Φ′ = ? N m²/C');
      const run = () => {
        if (finished) return;
        const a = num(aIn);
        const b = num(bIn);
        if (a === null || b === null) return freeNote('Enter both fluxes in N m²/C. Use a minus sign if negative.');
        const res = judgeFlux(lvl, a, b);
        verdict(res.ok);
        if (res.ok) return succeed(`Both fluxes are right: ${fmt(lvl.first)} and ${fmt(lvl.second)} N m²/C.`);
        const parts: string[] = [];
        if (!res.firstOk) parts.push('The first flux is not right.');
        if (!res.secondOk) parts.push('The flux after resizing is not right.');
        miss(parts.join(' '));
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Surface as drawn'), aIn, h('span', { class: 'unit' }, 'N m²/C')), h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Radius × ${lvl.factor}`), bIn, h('span', { class: 'unit' }, 'N m²/C')), actionBtn('Check the fluxes', 'Check the fluxes', run));
      hint.textContent = `Charges (µC): ${lvl.charges.map((c) => `${c.q > 0 ? '+' : '−'}${Math.abs(c.q)}`).join(', ')}. The solid circle is the surface; the dashed circle is the same surface with its radius multiplied by ${lvl.factor}.`;
    }

    // ---- level 3: the black box -------------------------------------------------------------------------------
    let ticked = new Set<string>();
    if (lvl.kind === 'box') {
      const qIn = field('Charge inside in nC', 'q = ? nC');
      const chips = lvl.contents.map((c) => h('button', { class: 'btn secondary small', type: 'button', 'aria-pressed': 'false', 'aria-label': `Zero flux: ${c.text}`, onclick: () => {
        if (finished) return;
        if (ticked.has(c.id)) ticked.delete(c.id);
        else ticked.add(c.id);
        chips.forEach((b, i) => b.setAttribute('aria-pressed', String(ticked.has(lvl.contents[i].id))));
      } }, c.text));
      const run = () => {
        if (finished) return;
        const q = num(qIn);
        if (q === null) return freeNote('Enter the charge inside in nC, with a minus sign if it is negative.');
        if (ticked.size === 0) return freeNote('Tick every set of contents that would give zero net flux.');
        const res = judgeBox(lvl, q, [...ticked]);
        verdict(res.ok);
        if (res.ok) return succeed('Right: the charge inside, and zero net flux does not mean an empty box.');
        const parts: string[] = [];
        if (!res.qOk) parts.push('The charge inside is not right.');
        if (!res.setOk) parts.push('The set of contents that give zero flux is not right.');
        miss(parts.join(' '));
      };
      qIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Charge inside'), qIn, h('span', { class: 'unit' }, 'nC')), h('p', { class: 'muted' }, 'Which contents would give zero net flux?'), h('div', { class: 'bench' }, ...chips), actionBtn('Check the box', 'Check the box', run));
      hint.textContent = `Measured: net outward flux ${fmt(lvl.measured)} N m²/C through the surface of the box.`;
    }

    // ---- level 4: a face of a cube ------------------------------------------------------------------------------------
    if (lvl.kind === 'cubeface') {
      const vIn = field('Flux through the highlighted face in N m²/C', 'Φ = ? N m²/C');
      const run = () => {
        if (finished) return;
        const v = num(vIn);
        if (v === null || v < 0) return freeNote('Enter the flux through the face as a number of N m²/C (0 if there is none).');
        const res = judgeCubeFace(lvl, v);
        verdict(res.ok);
        if (res.ok) return succeed(`The flux through the ${lvl.faceName} face is ${fmt(lvl.answer)} N m²/C.`);
        miss(`Your flux is too ${res.verdict === 'too-big' ? 'large' : 'small'} for that face.`);
      };
      vIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, `The ${lvl.faceName} face`), vIn, h('span', { class: 'unit' }, 'N m²/C')), actionBtn('Measure the face', 'Measure the face', run));
      hint.textContent = `The charge is +${lvl.q} µC, ${lvl.where === 'centre' ? 'at the centre of the cube' : 'at the front, bottom, left corner of the cube'}. Faces of the cube are all equal squares.`;
    }

    // ---- drifting specks (charge on the object, or flow of field) ------------------------------------------------------
    interface Dot {
      a: number;
      b: number;
      age: number;
      life: number;
    }
    const dots: Dot[] = Array.from({ length: 90 }, () => ({ a: rnd(), b: rnd(), age: rnd() * 3, life: 2 + rnd() * 3 }));
    const tickDots = (dt: number) => {
      for (const d of dots) {
        d.age += dt;
        if (d.age > d.life) {
          d.a = rnd();
          d.b = rnd();
          d.age = 0;
        }
      }
    };

    function drawDensity() {
      if (lvl.kind !== 'density') return;
      g.fillStyle = POS;
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      if (lvl.shape === 'line') {
        g.fillStyle = col.panel;
        g.fillRect(C.x - 190, C.y - 8, 380, 16);
        g.strokeRect(C.x - 190, C.y - 8, 380, 16);
        for (const d of dots) {
          const x = C.x - 190 + ((d.a + clock * 0.05 * (1 + d.b)) % 1) * 380;
          g.fillStyle = POS;
          g.globalAlpha = 0.5 + 0.5 * Math.sin(d.age * 4);
          g.beginPath();
          g.arc(x, C.y - 4 + d.b * 8, 2.6, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
        label(g, 'thin rod: charge along its length', C.x, C.y + 48, { size: 13, color: col.muted });
      } else if (lvl.shape === 'surface') {
        const sphere = lvl.what.includes('sphere');
        if (sphere) {
          g.fillStyle = col.panel;
          g.beginPath();
          g.arc(C.x, C.y, 100, 0, Math.PI * 2);
          g.fill();
          g.stroke();
          for (const d of dots) {
            const ang = (d.a + clock * 0.04 * (1 + d.b)) * Math.PI * 2;
            g.fillStyle = POS;
            g.globalAlpha = 0.5 + 0.5 * Math.sin(d.age * 4);
            g.beginPath();
            g.arc(C.x + Math.cos(ang) * 96, C.y + Math.sin(ang) * 96, 3, 0, Math.PI * 2);
            g.fill();
          }
        } else {
          g.fillStyle = col.panel;
          g.fillRect(C.x - 110, C.y - 110, 220, 220);
          g.strokeRect(C.x - 110, C.y - 110, 220, 220);
          for (const d of dots) {
            g.fillStyle = POS;
            g.globalAlpha = 0.5 + 0.5 * Math.sin(d.age * 4);
            g.beginPath();
            g.arc(C.x - 104 + d.a * 208, C.y - 104 + d.b * 208, 3, 0, Math.PI * 2);
            g.fill();
          }
        }
        g.globalAlpha = 1;
        label(g, 'charge sits on the surface', C.x, H - 14, { size: 13, color: col.muted });
      } else {
        g.fillStyle = col.panel;
        g.beginPath();
        g.arc(C.x, C.y, 100, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        for (const d of dots) {
          const rr = Math.sqrt(d.a) * 96;
          const ang = (d.b + clock * 0.03) * Math.PI * 2;
          g.fillStyle = POS;
          g.globalAlpha = 0.5 + 0.5 * Math.sin(d.age * 4);
          g.beginPath();
          g.arc(C.x + Math.cos(ang + d.a * 6) * rr, C.y + Math.sin(ang + d.a * 6) * rr, 3, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
        label(g, 'charge fills the whole volume', C.x, H - 14, { size: 13, color: col.muted });
      }
      if (verdictAt !== null && verdictOk) {
        weighed = Math.min(1, (clock - verdictAt) / REVEAL);
        g.fillStyle = col.good;
        g.fillRect(40, 24, 560 * ease(weighed), 10);
        g.strokeStyle = col.muted;
        g.lineWidth = 1.5;
        g.strokeRect(40, 24, 560, 10);
        label(g, `Q = ${fmt(lvl.answer)} µC`, C.x, 52, { size: 14, color: col.good });
      }
    }

    function drawFlux() {
      if (lvl.kind !== 'flux') return;
      g.strokeStyle = col.text;
      g.lineWidth = 3.5;
      g.beginPath();
      g.arc(C.x, C.y, R2, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = col.accent;
      g.lineWidth = 2;
      g.setLineDash([7, 6]);
      g.beginPath();
      g.arc(C.x, C.y, R2 * lvl.factor, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      label(g, 'surface', C.x, C.y - R2 - 6, { size: 12, color: col.text });
      label(g, `radius × ${lvl.factor}`, C.x, C.y - R2 * lvl.factor - 6, { size: 12, color: col.accent });
      for (const c of lvl.charges) {
        const a = (c.angle * Math.PI) / 180;
        const x = C.x + Math.cos(a) * c.r * R2;
        const y = C.y + Math.sin(a) * c.r * R2;
        // a few specks leaving a positive charge or arriving at a negative one
        for (let k = 0; k < 6; k++) {
          const t = ((clock * 0.4 + k / 6 + c.angle) % 1 + 1) % 1;
          const th = (k / 6) * Math.PI * 2;
          const rr = c.q > 0 ? 12 + t * 40 : 52 - t * 40;
          g.fillStyle = c.q > 0 ? POS : NEG;
          g.globalAlpha = 0.65 * (1 - t);
          g.beginPath();
          g.arc(x + Math.cos(th) * rr, y + Math.sin(th) * rr, 2.4, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
        disc(g, x, y, 12, c.q > 0 ? POS : NEG, '#ffffff', 2);
        label(g, c.q > 0 ? '+' : '−', x, y + 5, { size: 15, color: '#ffffff' });
        label(g, `${Math.abs(c.q)} µC`, x, y + 26, { size: 11, bold: false, color: col.muted });
      }
    }

    function drawBox() {
      if (lvl.kind !== 'box') return;
      g.fillStyle = col.panel;
      g.fillRect(C.x - 80, C.y - 80, 160, 160);
      g.strokeStyle = col.text;
      g.lineWidth = 4;
      g.strokeRect(C.x - 80, C.y - 80, 160, 160);
      label(g, '?', C.x, C.y + 16, { size: 56, color: col.muted });
      const out = lvl.measured > 0;
      const strength = Math.min(1, Math.abs(lvl.measured) / 12000 + 0.2);
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * Math.PI * 2;
        const t = ((clock * 0.5 * strength + k / 12) % 1 + 1) % 1;
        const r1 = out ? 90 + t * 60 : 150 - t * 60;
        g.fillStyle = col.accent;
        g.globalAlpha = 0.9 * Math.sin(t * Math.PI);
        g.beginPath();
        g.arc(C.x + Math.cos(ang) * r1 * 1.2, C.y + Math.sin(ang) * r1, 3.2, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      label(g, out ? 'the field leaves the box' : 'the field enters the box', C.x, H - 14, { size: 13, color: col.muted });
    }

    function drawCube() {
      if (lvl.kind !== 'cubeface') return;
      const s = 130;
      const x0 = C.x - 90;
      const y0 = C.y - 40;
      const dx = 70;
      const dy = -55;
      const fl = { x: x0, y: y0 + s }; // front, bottom, left corner
      const V = {
        fbl: fl,
        fbr: { x: x0 + s, y: y0 + s },
        ftl: { x: x0, y: y0 },
        ftr: { x: x0 + s, y: y0 },
        bbl: { x: fl.x + dx, y: fl.y + dy },
        bbr: { x: x0 + s + dx, y: y0 + s + dy },
        btl: { x: x0 + dx, y: y0 + dy },
        btr: { x: x0 + s + dx, y: y0 + dy },
      };
      const faces: Record<string, (keyof typeof V)[]> = {
        front: ['fbl', 'fbr', 'ftr', 'ftl'],
        back: ['bbl', 'bbr', 'btr', 'btl'],
        left: ['fbl', 'bbl', 'btl', 'ftl'],
        right: ['fbr', 'bbr', 'btr', 'ftr'],
        top: ['ftl', 'ftr', 'btr', 'btl'],
        bottom: ['fbl', 'fbr', 'bbr', 'bbl'],
      };
      const path = (keys: (keyof typeof V)[]) => {
        g.beginPath();
        keys.forEach((k, i) => (i === 0 ? g.moveTo(V[k].x, V[k].y) : g.lineTo(V[k].x, V[k].y)));
        g.closePath();
      };
      g.fillStyle = col.panel;
      g.globalAlpha = 0.5;
      for (const keys of Object.values(faces)) {
        path(keys);
        g.fill();
      }
      g.globalAlpha = 1;
      path(faces[lvl.faceName]);
      g.fillStyle = col.accent;
      g.globalAlpha = 0.35 + 0.15 * Math.sin(clock * 4);
      g.fill();
      g.globalAlpha = 1;
      g.strokeStyle = col.text;
      g.lineWidth = 2.5;
      for (const keys of Object.values(faces)) {
        path(keys);
        g.stroke();
      }
      const centre = lvl.where === 'centre' ? { x: x0 + s / 2 + dx / 2, y: y0 + s / 2 + dy / 2 } : fl;
      for (let k = 0; k < 14; k++) {
        const th = (k / 14) * Math.PI * 2;
        const t = ((clock * 0.45 + k / 14) % 1 + 1) % 1;
        g.fillStyle = POS;
        g.globalAlpha = 0.7 * (1 - t);
        g.beginPath();
        g.arc(centre.x + Math.cos(th) * (14 + t * 70), centre.y + Math.sin(th) * (14 + t * 70) * 0.8, 2.6, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      disc(g, centre.x, centre.y, 12, POS, '#ffffff', 2);
      label(g, '+', centre.x, centre.y + 5, { size: 16, color: '#ffffff' });
      label(g, `${lvl.faceName} face`, C.x + 150, C.y + 80, { size: 14, color: col.accent });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      tickDots(dt);
      g.clearRect(0, 0, W, H);
      drawDensity();
      drawFlux();
      drawBox();
      drawCube();
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
