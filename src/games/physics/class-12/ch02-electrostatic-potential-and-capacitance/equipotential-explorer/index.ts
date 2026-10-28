import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, pointerToLocal, startLoop } from '@core/sim';
import { buildLevel, explainSolution, fmt, judgeAngle, judgeRank, judgeUniform, needed, potentialAt, starsFor, strengthsAt, tapMatches, tapStars, type Angle, type Pt, type Src, type Way } from './logic';

const W = 640;
const H = 340;
const K = W / 48; // px per cm: the map spans ±24 cm across and ±12.5 cm up
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const toPx = (p: Pt): Pt => ({ x: W / 2 + p.x * K, y: H / 2 - p.y * K });
const toCm = (p: Pt): Pt => ({ x: (p.x - W / 2) / K, y: (H / 2 - p.y) / K });

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
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A map of electric potential with equipotential bands, charges, and the points you test.' });
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
    const succeed = (text: string, stars: 1 | 2 | 3) => {
      finished = true;
      say(text, true);
      solution.replaceChildren(h('h3', null, 'Why that works'), ...explainSolution(lvl).map((t) => h('p', null, t)));
      solution.hidden = false;
      controls.querySelectorAll('button, input').forEach((b) => b.setAttribute('disabled', ''));
      pendingWin = stars;
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

    // ---- the potential map, painted once (smooth, or in steps so that the bands show the equipotentials) -------
    let sources: Src[] = [];
    if (lvl.kind === 'find' || lvl.kind === 'rank') sources = lvl.sources;
    const map = document.createElement('canvas');
    map.width = 160;
    map.height = 85;
    const mg = map.getContext('2d')!;
    function paintMap(banded: boolean) {
      mg.clearRect(0, 0, 160, 85);
      for (let i = 0; i < 160; i++) {
        for (let j = 0; j < 85; j++) {
          const cm = toCm({ x: ((i + 0.5) * W) / 160, y: ((j + 0.5) * H) / 85 });
          let v = potentialAt(cm, sources);
          if (banded) v = Math.round(v / 60) * 60;
          const a = Math.min(0.75, Math.abs(Math.tanh(v / 260)) * 0.75);
          mg.fillStyle = v >= 0 ? `rgba(192,57,43,${a})` : `rgba(49,86,211,${a})`;
          mg.fillRect(i, j, 1, 1);
        }
      }
    }
    if (sources.length) paintMap(lvl.kind === 'rank');

    // ---- level 1: find the equipotential ----------------------------------------------------------------------------
    const taps: { p: Pt; v: number; ok: boolean }[] = [];
    let found: Pt[] = [];
    if (lvl.kind === 'find') {
      const ang = choiceGroup<Angle>('The field meets an equipotential surface…', [['perpendicular', 'At right angles', 'The field is perpendicular to the surface'], ['along', 'Along the surface', 'The field is along the surface'], ['any', 'At any angle', 'The field meets it at any angle']]);
      const progress = h('p', { class: 'muted' }, `Points found: 0 of ${needed}.`);
      const run = () => {
        if (finished) return;
        if (found.length < needed) return freeNote(`Find ${needed} points with the target potential first (tap the map). You have ${found.length}.`);
        if (!ang.get()) return freeNote('Say how the field meets an equipotential surface.');
        const res = judgeAngle(ang.get() as Angle);
        verdict(res.ok);
        if (res.ok) return succeed('Three points on the equipotential, and the field meets it at right angles.', tapStars(taps.length, Math.max(0, misses - free)));
        miss('If the field had a part along the surface, a charge moving along it would gain or lose energy, and the potential would not be constant.');
      };
      canvas.addEventListener('click', (e) => {
        if (finished) return;
        const p = toCm(pointerToLocal(e, canvas, W, H));
        const ok = tapMatches(lvl, p, found);
        const v = potentialAt(p, sources);
        taps.push({ p, v, ok });
        if (ok) found.push(p);
        progress.textContent = `Points found: ${found.length} of ${needed}. Taps so far: ${taps.length}.`;
        say(ok ? `V = ${fmt(Math.abs(v) < 0.5 ? 0 : v)} V: a match.` : `V = ${fmt(Math.abs(v) < 0.5 ? 0 : v)} V: not the target.`, ok);
      });
      controls.append(progress, ang.box, actionBtn('Check the equipotential', 'Check the equipotential', run));
      hint.textContent = `The marked point has a potential of ${fmt(Math.abs(lvl.target) < 0.5 ? 0 : lvl.target)} V. Fewer taps earn more stars, so reason about the shape before you tap.`;
    }

    // ---- level 2: the uniform field --------------------------------------------------------------------------------------
    if (lvl.kind === 'uniform') {
      const eIn = field('Field strength in V/m', 'E = ? V/m');
      const way = choiceGroup<Way>('The field points…', [['a-to-b', 'From A towards B', 'The field points from A towards B'], ['b-to-a', 'From B towards A', 'The field points from B towards A']]);
      const run = () => {
        if (finished) return;
        const e = num(eIn);
        if (e === null || e <= 0) return freeNote('Enter the field strength as a positive number of V/m.');
        if (!way.get()) return freeNote('Say which way the field points.');
        const res = judgeUniform(lvl, e, way.get() as Way);
        verdict(res.ok);
        if (res.ok) return succeed(`E = ${fmt(lvl.e)} V/m, pointing from ${lvl.from === 'a-to-b' ? 'A to B' : 'B to A'}.`, starsFor(misses, free));
        const parts: string[] = [];
        if (!res.eOk) parts.push('The field strength is not right: E = ΔV / d, with d in metres.');
        if (!res.wayOk) parts.push('The field points towards lower potential.');
        miss(parts.join(' '));
      };
      eIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Field strength'), eIn, h('span', { class: 'unit' }, 'V/m')), way.box, actionBtn('Check the field', 'Check the field', run));
      hint.textContent = `Probe A reads ${fmt(lvl.vA)} V and probe B reads ${fmt(lvl.vB)} V. They are ${lvl.d} cm apart along the field.`;
    }

    // ---- level 3: rank by crowding --------------------------------------------------------------------------------------------
    let order: number[] = [];
    let readings: number[] | null = null;
    if (lvl.kind === 'rank') {
      const run = () => {
        if (finished) return;
        if (order.length < lvl.points.length) return freeNote('Tap all three points, strongest field first.');
        const res = judgeRank(lvl, order);
        verdict(res.ok);
        if (res.ok) {
          readings = strengthsAt(lvl);
          return succeed('Right: the bands are tightest where the field is strongest.', starsFor(misses, free));
        }
        miss(`${res.correctPlaces} of the 3 places ${res.correctPlaces === 1 ? 'is' : 'are'} right. Compare how close together the colour bands are at each point.`);
      };
      canvas.addEventListener('click', (e) => {
        if (finished) return;
        const p = toCm(pointerToLocal(e, canvas, W, H));
        const i = lvl.points.findIndex((q) => dist2(q.at, p) < 2.6);
        if (i >= 0 && !order.includes(i)) order.push(i);
      });
      controls.append(h('p', { class: 'muted' }, 'Tap X, Y and Z in order: strongest field first.'), h('div', { class: 'row' }, actionBtn('Check the order', 'Check the order', run), h('button', { class: 'btn secondary', type: 'button', 'aria-label': 'Clear my order', onclick: () => { if (!finished) order = []; } }, 'Start again')));
      hint.textContent = 'Each colour step is an equipotential surface. Bands close together mean the potential changes fast with distance.';
    }
    const dist2 = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

    // ---- drawing ----------------------------------------------------------------------------------------------------------------
    const drawCharges = () => {
      for (const s of sources) {
        const p = toPx(s.at);
        g.strokeStyle = s.q > 0 ? POS : NEG;
        g.lineWidth = 2;
        for (let r = 0; r < 3; r++) {
          const t = ((clock * 0.3 + r / 3) % 1 + 1) % 1;
          g.globalAlpha = 0.45 * (1 - t);
          g.beginPath();
          g.arc(p.x, p.y, 16 + t * 70, 0, Math.PI * 2);
          g.stroke();
        }
        g.globalAlpha = 1;
        disc(g, p.x, p.y, 14, s.q > 0 ? POS : NEG, '#ffffff', 2);
        label(g, s.q > 0 ? '+' : '−', p.x, p.y + 6, { size: 17, color: '#ffffff' });
      }
    };
    function drawFind() {
      if (lvl.kind !== 'find') return;
      g.drawImage(map, 0, 0, W, H);
      drawCharges();
      const m = toPx(lvl.mark);
      g.strokeStyle = col.good;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(m.x, m.y, 10 + 2 * Math.sin(clock * 4), 0, Math.PI * 2);
      g.stroke();
      label(g, `target ${fmt(Math.abs(lvl.target) < 0.5 ? 0 : lvl.target)} V`, m.x, m.y - 18, { size: 12, color: col.good });
      for (const t of taps) {
        const p = toPx(t.p);
        if (t.ok) {
          disc(g, p.x, p.y, 6, col.good, '#ffffff', 2);
        } else {
          g.strokeStyle = col.muted;
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(p.x - 4, p.y - 4);
          g.lineTo(p.x + 4, p.y + 4);
          g.moveTo(p.x + 4, p.y - 4);
          g.lineTo(p.x - 4, p.y + 4);
          g.stroke();
        }
      }
      const sorted = found.length >= 2 ? [...found, lvl.mark].sort((a, b) => a.y - b.y) : [];
      if (found.length >= needed) {
        g.strokeStyle = col.good;
        g.lineWidth = 2;
        g.setLineDash([6, 5]);
        g.beginPath();
        sorted.forEach((q, i) => (i === 0 ? g.moveTo(toPx(q).x, toPx(q).y) : g.lineTo(toPx(q).x, toPx(q).y)));
        g.stroke();
        g.setLineDash([]);
      }
    }
    function drawUniform() {
      if (lvl.kind !== 'uniform') return;
      const dpx = Math.min(400, lvl.d * 38);
      const xa = W / 2 - dpx / 2;
      const xb = W / 2 + dpx / 2;
      const right = lvl.from === 'a-to-b'; // the field points from A (left) to B (right)
      // vertical equipotential stripes, with the higher potential in red
      const vHigh = Math.max(lvl.vA, lvl.vB);
      const vLow = Math.min(lvl.vA, lvl.vB);
      for (let x = 20; x < W - 20; x += 10) {
        const f = (x - xa) / (xb - xa); // 0 at A, 1 at B
        const v = lvl.vA + (lvl.vB - lvl.vA) * f;
        const t = Math.max(-0.4, Math.min(1.4, (v - vLow) / (vHigh - vLow || 1)));
        g.fillStyle = `rgba(${t > 0.5 ? '192,57,43' : '49,86,211'},${0.1 + 0.25 * Math.abs(t - 0.5)})`;
        g.fillRect(x, 24, 10, H - 48);
      }
      g.strokeStyle = col.muted;
      g.lineWidth = 1;
      g.strokeRect(20, 24, W - 40, H - 48);
      // specks that flow along the field
      g.strokeStyle = col.accent;
      g.lineWidth = 2;
      for (let row = 0; row < 7; row++) {
        for (let k = 0; k < 9; k++) {
          const t = ((clock * 0.25 * (lvl.e / 800 + 0.6) + k / 9) % 1 + 1) % 1;
          const x = 30 + (W - 60) * (right ? t : 1 - t);
          const y = 44 + row * 40;
          g.globalAlpha = 0.6 * Math.sin(t * Math.PI);
          g.beginPath();
          g.moveTo(x - (right ? 9 : -9), y);
          g.lineTo(x, y);
          g.stroke();
          g.beginPath();
          g.arc(x, y, 2.4, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.globalAlpha = 1;
      for (const [x, name, v] of [[xa, 'A', lvl.vA], [xb, 'B', lvl.vB]] as const) {
        disc(g, x, H / 2, 10, col.panel, col.text, 3);
        label(g, name, x, H / 2 - 18, { size: 15, color: col.text });
        label(g, `${fmt(v)} V`, x, H / 2 + 30, { size: 14, color: col.text });
      }
      g.strokeStyle = col.text;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(xa, H - 36);
      g.lineTo(xb, H - 36);
      g.stroke();
      label(g, `${lvl.d} cm`, W / 2, H - 22, { size: 13, color: col.muted });
    }
    function drawRank() {
      if (lvl.kind !== 'rank') return;
      g.drawImage(map, 0, 0, W, H);
      drawCharges();
      lvl.points.forEach((q, i) => {
        const p = toPx(q.at);
        disc(g, p.x, p.y, 8, col.panel, col.text, 2.5);
        label(g, q.name, p.x, p.y - 15, { size: 15, color: col.text });
        const n = order.indexOf(i);
        if (n >= 0) {
          g.strokeStyle = col.accent;
          g.lineWidth = 3;
          g.beginPath();
          g.arc(p.x, p.y, 15, 0, Math.PI * 2);
          g.stroke();
          disc(g, p.x + 16, p.y + 16, 10, col.accent);
          label(g, String(n + 1), p.x + 16, p.y + 20, { size: 13, color: col.panel });
        }
        if (readings) label(g, `E ∝ ${readings[i].toFixed(1)}`, p.x, p.y + 32, { size: 12, color: col.good });
      });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      g.clearRect(0, 0, W, H);
      drawFind();
      drawUniform();
      drawRank();
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
