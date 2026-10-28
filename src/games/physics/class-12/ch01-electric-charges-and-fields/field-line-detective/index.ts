import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { fitCanvas, pointerToLocal, startLoop } from '@core/sim';
import {
  buildLevel,
  explainSolution,
  FLAW_RULE,
  judgeFlaw,
  judgeRank,
  judgeRead,
  judgeRelease,
  releasePath,
  starsFor,
  strengthsAt,
  trace,
  type Flaw,
  type Line,
  type Pt,
} from './logic';

const W = 640;
const H = 340;
const K = W / 48; // px per cm: the picture spans ±24 cm across and ±12.5 cm up
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const toPx = (p: Pt): Pt => ({ x: W / 2 + p.x * K, y: H / 2 - p.y * K });
const toCm = (p: Pt): Pt => ({ x: (p.x - W / 2) / K, y: (H / 2 - p.y) / K });

interface DrawnLine {
  line: Line;
  px: Pt[];
  cum: number[];
  offset: number;
}

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const col = themeColors();

    let misses = 0;
    let finished = false;
    let pendingWin: 1 | 2 | 3 | null = null;
    let clock = 0;
    let verdictAt: number | null = null;
    let verdictOk = false;
    let wonAt: number | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'An electric field-line diagram. Arrows drift along each line to show the direction of the field.' });
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
      controls.querySelectorAll('button').forEach((b) => b.setAttribute('disabled', ''));
      pendingWin = starsFor(misses, free);
    };
    const choiceGroup = <T extends string>(name: string, options: [T, string, string][]) => {
      let value: T | null = null;
      const buttons = options.map(([v, text, aria]) => h('button', { class: 'btn secondary small', type: 'button', 'aria-pressed': 'false', 'aria-label': aria, onclick: () => {
        value = v;
        buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === v)));
      } }, text));
      return { get: () => value, box: h('div', { class: 'route-group' }, h('strong', null, name), ...buttons) };
    };
    const actionBtn = (text: string, aria: string, fn: () => void) => h('button', { class: 'btn', type: 'button', 'aria-label': aria, onclick: fn }, text);

    // ---- the picture: lines with arrows that flow along them -----------------------------------------------
    const drawn: DrawnLine[] = lvl.lines.map((line, i) => {
      const px = line.pts.map(toPx);
      const cum = [0];
      for (let k = 1; k < px.length; k++) cum.push(cum[k - 1] + Math.hypot(px[k].x - px[k - 1].x, px[k].y - px[k - 1].y));
      return { line, px, cum, offset: (i * 13) % 36 };
    });
    function pointAt(d: DrawnLine, s: number): { p: Pt; t: Pt } {
      let lo = 0;
      let hi = d.cum.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (d.cum[mid] <= s) lo = mid;
        else hi = mid;
      }
      const a = d.px[lo];
      const b = d.px[hi];
      const seg = d.cum[hi] - d.cum[lo] || 1;
      const f = (s - d.cum[lo]) / seg;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      return { p: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, t: { x: (b.x - a.x) / len, y: (b.y - a.y) / len } };
    }
    function drawLines() {
      g.lineWidth = 2;
      g.strokeStyle = col.muted;
      for (const d of drawn) {
        g.globalAlpha = 0.85;
        g.beginPath();
        d.px.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
        g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = col.accent;
      g.lineWidth = 2.2;
      const gap = 36;
      for (const d of drawn) {
        const total = d.cum[d.cum.length - 1];
        if (total < 12) continue;
        const dir = d.line.reversed ? -1 : 1;
        const shift = (((clock * 38 * dir + d.offset) % gap) + gap) % gap;
        for (let s = shift; s < total; s += gap) {
          if (s < 14 || s > total - 10) continue; // keep clear of the charges
          const { p, t } = pointAt(d, s);
          const tx = t.x * dir;
          const ty = t.y * dir;
          g.beginPath();
          g.moveTo(p.x - tx * 5 - ty * 4, p.y - ty * 5 + tx * 4);
          g.lineTo(p.x + tx * 4, p.y + ty * 4);
          g.lineTo(p.x - tx * 5 + ty * 4, p.y - ty * 5 - tx * 4);
          g.stroke();
        }
      }
    }
    function drawCharges(hideSigns: boolean) {
      for (const s of lvl.sources) {
        const p = toPx(s.at);
        const pulse = 1 + 0.07 * Math.sin(clock * 3 + (s.at.x > 0 ? 1.5 : 0));
        g.globalAlpha = 0.25;
        disc(g, p.x, p.y, 24 * pulse, hideSigns ? col.muted : s.q < 0 ? NEG : POS);
        g.globalAlpha = 1;
        disc(g, p.x, p.y, 15, hideSigns ? col.panel : s.q < 0 ? NEG : POS, hideSigns ? col.muted : '#ffffff', 2.5);
        label(g, hideSigns ? s.name : s.q < 0 ? '−' : '+', p.x, p.y + 6, { size: 18, color: hideSigns ? col.text : '#ffffff' });
        if (!hideSigns && Math.abs(s.q) > 1) label(g, `${s.q > 0 ? '+' : '−'}${Math.abs(s.q)}q`, p.x, p.y + 34, { size: 12, bold: false, color: col.muted });
        else if (!hideSigns) label(g, `${s.q > 0 ? '+' : '−'}q`, p.x, p.y + 34, { size: 12, bold: false, color: col.muted });
      }
    }
    const ring = (p: Pt, r: number, color: string, width = 3) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      g.arc(p.x, p.y, r, 0, Math.PI * 2);
      g.stroke();
    };

    // ---- level 1: tap the flaw ----------------------------------------------------------------------------
    let tapCm: Pt | null = null;
    let tapCmDone = false;
    // ---- level 3: tap the points in order -----------------------------------------------------------------
    let order: number[] = [];
    let readings: number[] | null = null;
    // ---- level 4: choose the points, release the charges ----------------------------------------------------
    let picked = new Set<number>();
    let releases: { path: Pt[]; line: Pt[]; follows: boolean }[] | null = null;
    let releaseT = 0;
    const releaseLength = () => (releases ? Math.max(...releases.map((r) => r.path.length)) * 0.02 : 0);
    const releaseDone = () => !!releases && releaseT >= releaseLength() + 0.4;

    canvas.addEventListener('click', (e) => {
      if (finished) return;
      const px = pointerToLocal(e, canvas, W, H);
      const p = toCm(px);
      if (lvl.kind === 'flaw') {
        tapCm = p;
        tapCmDone = false;
      } else if (lvl.kind === 'rank' && !readings) {
        const i = lvl.points.findIndex((q) => Math.hypot(q.at.x - p.x, q.at.y - p.y) < 2.6);
        if (i >= 0 && !order.includes(i)) order.push(i);
      } else if (lvl.kind === 'release' && (!releases || releaseDone())) {
        if (releases) releases = null; // a finished run is cleared as soon as you change your choice
        const i = lvl.points.findIndex((q) => Math.hypot(q.x - p.x, q.y - p.y) < 2.6);
        if (i >= 0) {
          if (picked.has(i)) picked.delete(i);
          else picked.add(i);
        }
      }
    });

    if (lvl.kind === 'flaw') {
      const rule = choiceGroup<Flaw>('Which rule does it break?', (Object.keys(FLAW_RULE) as Flaw[]).map((f) => [f, FLAW_RULE[f], FLAW_RULE[f]]));
      const run = () => {
        if (finished) return;
        if (!tapCm) return freeNote('Tap the fault on the diagram first.');
        const r = rule.get();
        if (!r) return freeNote('Choose which rule the fault breaks.');
        const res = judgeFlaw(lvl, tapCm, r);
        tapCmDone = true;
        verdictAt = clock;
        verdictOk = res.ok;
        if (res.ok) return succeed('Found it: that is the fault, and that is the rule it breaks.');
        if (res.tapOk) return miss('You found the fault, but it breaks a different rule.');
        miss('The fault is not where you tapped.');
      };
      controls.append(h('p', { class: 'muted' }, 'Tap the diagram where you see the fault.'), rule.box, actionBtn('Report the fault', 'Report the fault', run));
      hint.textContent = 'Arrows drift along every line in the direction of the field. A correct diagram has none of these faults.';
    }

    if (lvl.kind === 'read') {
      const a = choiceGroup<'1' | '-1'>('Charge A is', [['1', 'Positive', 'Charge A is positive'], ['-1', 'Negative', 'Charge A is negative']]);
      const b = choiceGroup<'1' | '-1'>('Charge B is', [['1', 'Positive', 'Charge B is positive'], ['-1', 'Negative', 'Charge B is negative']]);
      const st = choiceGroup<'A' | 'B' | 'equal'>('The larger charge is', [['A', 'A', 'A is the larger charge'], ['B', 'B', 'B is the larger charge'], ['equal', 'They are equal', 'The charges are equal']]);
      const run = () => {
        if (finished) return;
        if (!a.get() || !b.get() || !st.get()) return freeNote('Answer all three questions first.');
        const res = judgeRead(lvl, Number(a.get()) as 1 | -1, Number(b.get()) as 1 | -1, st.get() as 'A' | 'B' | 'equal');
        verdictAt = clock;
        verdictOk = res.ok;
        if (res.ok) return succeed('Read correctly: signs from the arrows, sizes from the number of lines.');
        const wrong = [!res.signsOk[0], !res.signsOk[1], !res.strongerOk].filter(Boolean).length;
        miss(`${wrong} of your 3 answers ${wrong === 1 ? 'is' : 'are'} wrong. Look at where the lines start and end, and count them.`);
      };
      controls.append(a.box, b.box, st.box, actionBtn('Submit my reading', 'Submit the reading', run));
      hint.textContent = 'Lines leave positive charges and arrive on negative ones. The more lines at a charge, the larger it is.';
    }

    if (lvl.kind === 'rank') {
      const run = () => {
        if (finished) return;
        if (order.length < lvl.points.length) return freeNote('Tap all three points, strongest field first.');
        const res = judgeRank(lvl, order);
        verdictAt = clock;
        verdictOk = res.ok;
        if (res.ok) {
          readings = strengthsAt(lvl);
          return succeed('The meter agrees: you ranked the fields correctly.');
        }
        miss(`${res.correctPlaces} of the 3 places ${res.correctPlaces === 1 ? 'is' : 'are'} right. Compare how tightly the lines are packed at each point.`);
      };
      const clear = () => {
        if (!finished) order = [];
      };
      controls.append(h('p', { class: 'muted' }, 'Tap X, Y and Z in order: strongest field first.'), h('div', { class: 'row' }, actionBtn('Check the order', 'Check the order', run), h('button', { class: 'btn secondary', type: 'button', 'aria-label': 'Clear my order', onclick: clear }, 'Start again')));
      hint.textContent = 'Closely packed lines mean a strong field. Lines that spread apart mean a weak field.';
    }

    if (lvl.kind === 'release') {
      const run = () => {
        if (finished || (releases && !releaseDone())) return;
        if (picked.size === 0) return freeNote('Tap the points where the charge would follow its line, then release.');
        const chosen = [...picked];
        releases = chosen.map((i) => {
          const path = releasePath(lvl.sources, lvl.points[i], lvl.sign);
          return { path, line: trace(lvl.sources, lvl.points[i], lvl.sign, { maxArc: 10, step: 0.1 }).pts, follows: lvl.follows[i] };
        });
        releaseT = 0;
      };
      controls.append(h('p', { class: 'muted' }, 'Tap the points where the released charge would follow its field line exactly.'), actionBtn('Release the charges', 'Release the charges', run));
      hint.textContent = `The released charge is ${lvl.sign > 0 ? 'positive, so it is pushed along the field' : 'negative, so it is pushed against the field'}. It starts from rest.`;
    }

    // ---- frame ---------------------------------------------------------------------------------------------
    function finishRelease() {
      if (lvl.kind !== 'release' || !releases) return;
      const res = judgeRelease(lvl, [...picked]);
      verdictAt = clock;
      verdictOk = res.ok;
      if (res.ok) return succeed('Exactly right: the charge follows its line only where the line is straight.');
      const parts: string[] = [];
      if (res.extra) parts.push(`${res.extra} of the charges you picked swung off their line.`);
      if (res.missed) parts.push(`${res.missed} point${res.missed === 1 ? '' : 's'} you did not pick would have followed the line.`);
      misses++;
      say(parts.join(' ') + costNote());
    }
    function drawLevelOverlay() {
      if (lvl.kind === 'flaw' && tapCm) {
        const p = toPx(tapCm);
        const t = tapCmDone ? Math.min(1, (clock - (verdictAt ?? clock)) / REVEAL) : 0;
        ring(p, 14 + 4 * Math.sin(clock * 5), tapCmDone ? (verdictOk ? col.good : col.bad) : col.text, 3);
        if (tapCmDone && verdictOk) ring(p, 14 + 30 * ease(t), col.good, 3 * (1 - t) + 0.5);
      }
      if (lvl.kind === 'rank') {
        lvl.points.forEach((q, i) => {
          const p = toPx(q.at);
          disc(g, p.x, p.y, 8, col.panel, col.text, 2.5);
          label(g, q.name, p.x, p.y - 15, { size: 15, color: col.text });
          const n = order.indexOf(i);
          if (n >= 0) {
            ring(p, 15, col.accent, 3);
            disc(g, p.x + 16, p.y + 16, 10, col.accent);
            label(g, String(n + 1), p.x + 16, p.y + 20, { size: 13, color: col.panel });
          }
          if (readings) {
            const big = Math.max(...readings);
            const len = 70 * (readings[i] / big);
            g.fillStyle = col.good;
            g.fillRect(p.x - 25, p.y + 22, Math.max(4, len) * (Math.min(1, (clock - (verdictAt ?? clock)) / REVEAL)), 8);
            label(g, readings[i].toFixed(2), p.x, p.y + 48, { size: 12, color: col.good });
          }
        });
      }
      if (lvl.kind === 'release') {
        lvl.points.forEach((q, i) => {
          const p = toPx(q);
          const on = picked.has(i);
          disc(g, p.x, p.y, 9, on ? col.accent : col.panel, on ? col.panel : col.text, 2.5);
          label(g, String(i + 1), p.x, p.y + 4, { size: 11, color: on ? col.panel : col.text });
        });
        if (releases) {
          releases.forEach((r) => {
            const idx = Math.min(r.path.length - 1, Math.floor(releaseT / 0.02));
            g.setLineDash([5, 5]);
            g.strokeStyle = col.muted;
            g.lineWidth = 1.5;
            g.beginPath();
            r.line.forEach((q, j) => (j === 0 ? g.moveTo(toPx(q).x, toPx(q).y) : g.lineTo(toPx(q).x, toPx(q).y)));
            g.stroke();
            g.setLineDash([]);
            const color = lvl.sign > 0 ? POS : NEG;
            g.strokeStyle = color;
            g.lineWidth = 3;
            g.beginPath();
            for (let j = 0; j <= idx; j++) {
              const q = toPx(r.path[j]);
              if (j === 0) g.moveTo(q.x, q.y);
              else g.lineTo(q.x, q.y);
            }
            g.stroke();
            const head = toPx(r.path[idx]);
            disc(g, head.x, head.y, 7, color, '#ffffff', 2);
            if (idx >= r.path.length - 1) label(g, r.follows ? 'follows' : 'leaves the line', head.x, head.y - 14, { size: 12, color: r.follows ? col.good : col.bad });
          });
        }
      }
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (releases) {
        if (!releaseDone()) {
          releaseT += dt;
          if (releaseDone() && !finished) finishRelease();
        }
      }
      g.clearRect(0, 0, W, H);
      drawLines();
      drawCharges(lvl.kind === 'read');
      drawLevelOverlay();
      const phase = lvl.kind === 'release' ? (!releases ? 'idle' : releaseDone() ? 'done' : 'testing') : verdictAt === null ? 'idle' : clock - verdictAt < REVEAL ? 'testing' : 'done';
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
