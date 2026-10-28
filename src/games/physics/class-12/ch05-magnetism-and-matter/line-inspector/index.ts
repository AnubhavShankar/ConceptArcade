import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeFaces, judgeHalf, judgeSpot, starsFor, VERDICT, type DiagramKind, type Verdict } from './logic';

const W = 640;
const H = 340;
const NORTH = '#c0392b';
const SOUTH = '#3156d3';
const REVEAL = 0.9;
const RUN = 3;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const NAMES: Record<Verdict, string> = { magnetic: 'Magnetic', electrostatic: 'Electrostatic only', neither: 'Neither' };
const ORDER: Verdict[] = ['magnetic', 'electrostatic', 'neither'];

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
    const labels: (Verdict | null)[] = lvl.kind === 'spot' ? lvl.cards.map(() => null) : [];

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Field line diagrams, or a closed surface cutting through magnetic field lines.' });
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
    if (lvl.kind === 'spot') {
      const btns = lvl.cards.map((c, i) => {
        const b = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': `Diagram ${c.letter}`, onclick: () => {
          if (finished) return;
          const cur = labels[i];
          labels[i] = cur === null ? 'magnetic' : ORDER[(ORDER.indexOf(cur) + 1) % 3];
          b.textContent = `${c.letter}: ${NAMES[labels[i] as Verdict]}`;
        } }, `${c.letter}: ?`);
        return b;
      });
      const run = () => {
        if (finished || busy()) return;
        const res = judgeSpot(lvl, labels);
        if (res.unset) return freeNote('Label every diagram first.');
        verdict(res.ok);
        if (res.ok) return succeed('All six diagrams are classified correctly.');
        miss(`Diagram ${res.wrong.join(', ')} ${res.wrong.length > 1 ? 'are' : 'is'} not classified correctly: check whether the lines are closed loops, whether they end, and whether they cross.`);
      };
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Diagrams'), ...btns.slice(0, 3)), h('div', { class: 'control' }, h('span', { class: 'control-label' }, ''), ...btns.slice(3)), actionBtn('Check the diagrams', 'Check the diagrams', run));
      hint.textContent = 'Click a diagram button to cycle its label: Magnetic, Electrostatic only, Neither.';
    }
    if (lvl.kind === 'faces') {
      const fIn = field('Flux through the fifth face in µWb', 'Φ₅ = ? µWb');
      const run = () => {
        if (finished || busy()) return;
        const v = num(fIn);
        if (v === null || v === 0) return freeNote('Enter the flux as a non-zero number of µWb, with its sign.');
        const ok = judgeFaces(lvl, v).ok;
        verdict(ok);
        if (ok) return succeed(`Φ₅ = ${lvl.missing} µWb.`);
        miss('That is not the flux through the fifth face: what is the total magnetic flux through any closed surface?');
      };
      controls.append(row('Fifth face', fIn, 'µWb'), actionBtn('Check the surface', 'Check the surface', run));
      hint.textContent = `Fluxes through four faces (outward positive): ${lvl.known.join(', ')} µWb.`;
    }
    if (lvl.kind === 'half') {
      const fIn = field('Flux through the cut across the magnet in µWb', 'Φ = ? µWb');
      const run = () => {
        if (finished || busy()) return;
        const v = num(fIn);
        if (v === null || v === 0) return freeNote('Enter the flux as a non-zero number of µWb, with its sign.');
        const res = judgeHalf(lvl, v);
        verdict(res.ok);
        if (res.ok) return succeed(`Φ = ${lvl.cut} µWb.`);
        miss(res.signOk ? 'The size is not right: the flux has to balance the rest of the surface.' : 'The sign is not right: the surface is closed, so the total must be zero.');
      };
      controls.append(row('Flux across the magnet', fIn, 'µWb'), actionBtn('Check the surface', 'Check the surface', run));
      hint.textContent = `Outside the magnet the flux is ${lvl.outer} µWb (outward positive).`;
    }

    // ---- drawing helpers -------------------------------------------------------------------------------------------------
    const head = (x: number, y: number, ang: number, color: string, size = 5) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(x + Math.cos(ang) * size, y + Math.sin(ang) * size);
      g.lineTo(x + Math.cos(ang + 2.5) * size, y + Math.sin(ang + 2.5) * size);
      g.lineTo(x + Math.cos(ang - 2.5) * size, y + Math.sin(ang - 2.5) * size);
      g.fill();
    };
    const ellipseLine = (cx: number, cy: number, rx: number, ry: number, color: string) => {
      g.strokeStyle = color;
      g.lineWidth = 1.6;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      g.stroke();
      // arrows drifting round, anticlockwise on screen in the sense of N to S outside
      for (let k = 0; k < 2; k++) {
        const a = -((clock * 0.5 + k * Math.PI) % (Math.PI * 2));
        head(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, a - Math.PI / 2, color);
      }
    };
    const magnet = (x: number, y: number, w: number, hh: number) => {
      g.fillStyle = SOUTH;
      g.fillRect(x - w / 2, y - hh / 2, w / 2, hh);
      g.fillStyle = NORTH;
      g.fillRect(x, y - hh / 2, w / 2, hh);
    };
    const card = (kind: DiagramKind, cx: number, cy: number) => {
      const c = col.accent;
      if (kind === 'm-dipole') {
        for (let k = 1; k <= 3; k++) ellipseLine(cx, cy, 14 + k * 24, 8 + k * 14, c);
        magnet(cx, cy, 36, 12);
      } else if (kind === 'm-solenoid') {
        g.strokeStyle = '#b87333';
        g.lineWidth = 3;
        for (let k = 0; k < 6; k++) {
          g.beginPath();
          g.ellipse(cx - 30 + k * 12, cy, 4, 18, 0, 0, Math.PI * 2);
          g.stroke();
        }
        for (let k = 1; k <= 3; k++) ellipseLine(cx, cy, 30 + k * 18, 6 + k * 14, c);
      } else if (kind === 'e-dipole') {
        for (let k = 1; k <= 3; k++) {
          for (const side of [-1, 1]) {
            g.strokeStyle = c;
            g.lineWidth = 1.6;
            g.beginPath();
            g.moveTo(cx - 26, cy);
            g.bezierCurveTo(cx - 26, cy - side * k * 24, cx + 26, cy - side * k * 24, cx + 26, cy);
            g.stroke();
          }
        }
        disc(g, cx - 26, cy, 7, NORTH);
        disc(g, cx + 26, cy, 7, SOUTH);
        label(g, '+', cx - 26, cy, { size: 11, color: '#fff' });
        label(g, '−', cx + 26, cy, { size: 11, color: '#fff' });
      } else if (kind === 'e-radial') {
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          g.strokeStyle = c;
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
          g.lineTo(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62);
          g.stroke();
          head(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62, a, c);
        }
        disc(g, cx, cy, 9, NORTH);
      } else if (kind === 'n-cross') {
        g.strokeStyle = c;
        g.lineWidth = 1.8;
        g.beginPath();
        g.ellipse(cx - 18, cy, 50, 26, 0, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.ellipse(cx + 18, cy, 50, 26, 0, 0, Math.PI * 2);
        g.stroke();
        magnet(cx, cy, 30, 10);
      } else {
        for (let k = -2; k <= 2; k++) {
          g.strokeStyle = c;
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(cx + k * 12, cy + 20);
          g.lineTo(cx + k * 26, cy - 50);
          g.stroke();
          head(cx + k * 26, cy - 50, -Math.PI / 2, c);
        }
        g.fillStyle = NORTH;
        g.fillRect(cx - 34, cy + 20, 68, 14);
        label(g, 'N', cx, cy + 27, { size: 11, color: '#fff' });
      }
    };
    const verdictLabel = (text: string, x: number, y: number) => {
      if (verdictAt !== null && verdictOk) label(g, text, x, y, { size: 14, color: col.good });
    };
    const runF = () => (runT === null ? 0 : ease(Math.min(1, runT / RUN)));

    function drawSpot() {
      if (lvl.kind !== 'spot') return;
      lvl.cards.forEach((c, i) => {
        const cx = 110 + (i % 3) * 210;
        const cy = 90 + Math.floor(i / 3) * 150;
        g.strokeStyle = col.line;
        g.lineWidth = 1;
        g.strokeRect(cx - 98, cy - 68, 196, 136);
        label(g, c.letter, cx - 84, cy - 54, { size: 15, color: col.text });
        card(c.kind, cx, cy);
        if (verdictAt !== null && verdictOk) label(g, NAMES[VERDICT[c.kind]], cx, cy + 58, { size: 11, color: col.good });
      });
    }
    function drawFaces() {
      if (lvl.kind !== 'faces') return;
      const f = runF();
      // a closed box drawn as a hexagon with five labelled faces round it
      const cx = CXB;
      const cy = 170;
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.strokeRect(cx - 70, cy - 55, 140, 110);
      const faces: [number, number, number, string][] = [
        [cx, cy - 55, -1, 'top'],
        [cx + 70, cy, 1, 'right'],
        [cx, cy + 55, 1, 'bottom'],
        [cx - 70, cy, -1, 'left'],
      ];
      lvl.known.forEach((v, i) => {
        const [x, y, , name] = faces[i];
        label(g, `${v > 0 ? '+' : ''}${v} µWb`, x + (name === 'right' ? 56 : name === 'left' ? -56 : 0), y + (name === 'top' ? -18 : name === 'bottom' ? 18 : 0), { size: 13, color: v > 0 ? NORTH : SOUTH });
        for (let k = 0; k < Math.abs(v); k++) {
          const t = (((clock * 0.5 + k * 0.17) % 1) + 1) % 1;
          const dirOut = v > 0 ? 1 : -1;
          const along = name === 'top' || name === 'bottom' ? [(-50 + k * 14), 0] : [0, -35 + k * 10];
          const off = (t - 0.5) * 44 * dirOut;
          const ox = name === 'right' ? 1 : name === 'left' ? -1 : 0;
          const oy = name === 'top' ? -1 : name === 'bottom' ? 1 : 0;
          disc(g, x + along[0] + ox * off, y + along[1] + oy * off, 2, v > 0 ? NORTH : SOUTH);
        }
      });
      label(g, 'fifth face (back, into the page)', cx, cy, { size: 12, color: col.accent });
      label(g, runT === null ? 'Φ₅ = ?' : `${fmt(lvl.missing * f)} µWb`, cx, cy + 22, { size: 14, color: col.accent });
      verdictLabel('total flux through a closed surface = 0', CXB, 318);
    }
    function drawHalf() {
      if (lvl.kind !== 'half') return;
      const f = runF();
      const cx = CXB;
      const cy = 175;
      magnet(cx, cy, 300, 36);
      // the closed surface round one end, cutting the magnet in the middle
      const east = lvl.pole === 'north';
      const sx = east ? cx : cx;
      g.strokeStyle = col.text;
      g.lineWidth = 2.5;
      g.setLineDash([6, 4]);
      g.beginPath();
      g.ellipse(sx + (east ? 70 : -70), cy, 120, 85, 0, east ? -Math.PI / 2 : Math.PI / 2, east ? Math.PI / 2 : (3 * Math.PI) / 2);
      g.stroke();
      g.beginPath();
      g.moveTo(sx, cy - 85);
      g.lineTo(sx, cy + 85);
      g.stroke();
      g.setLineDash([]);
      // lines leaving (north) or entering (south) outside, and carrying on inside
      for (let k = 0; k < 4; k++) {
        const t = (((clock * 0.4 + k * 0.25) % 1) + 1) % 1;
        const dir = east ? 1 : -1;
        const x = cx + dir * (150 + 38 + t * 50);
        disc(g, x, cy - 26 + k * 17, 2.4, col.accent);
        const xi = cx + dir * (140 - t * 120);
        disc(g, xi, cy - 8 + k * 5, 2.4, col.accent);
      }
      label(g, `${lvl.outer > 0 ? '+' : ''}${lvl.outer} µWb`, cx + (east ? 190 : -190), cy - 70, { size: 13, color: col.text });
      label(g, runT === null ? 'cut: ?' : `${fmt(lvl.cut * f)} µWb`, sx, cy + 100, { size: 14, color: col.accent });
      verdictLabel('the lines continue inside the magnet', CXB, 318);
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (runT !== null && runT < RUN + 0.2) runT += dt;
      g.clearRect(0, 0, W, H);
      drawSpot();
      drawFaces();
      drawHalf();
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
const CXB = 320;
