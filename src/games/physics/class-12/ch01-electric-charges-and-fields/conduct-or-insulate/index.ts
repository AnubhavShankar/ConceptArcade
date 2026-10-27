import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { fitCanvas, pointerToLocal, startLoop } from '@core/sim';
import {
  buildLevel,
  changesMade,
  checkConfig,
  costOf,
  evaluate,
  explainFailure,
  explainSuccess,
  fmtR,
  initialConfig,
  material,
  remaining,
  SAFE_FRACTION,
  starsFor,
  type Config,
  type Evaluation,
} from './logic';

const W = 640;
const H = 350;
const GROUND = 150; // y of the forecourt
const WORKER_X0 = 60;
const PUMP_X = 560;
const FLASH = 0.9; // seconds the spark is shown
const NODE = 26; // radius of the Worker and Earth nodes
const OK = '#1a7f4b';
const BAD = '#c0392b';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const col = themeColors();
    const start = initialConfig(lvl);
    let config: Config = start.map((r) => [...r]);
    let sel: { route: number; slot: number } = { route: 0, slot: 0 };
    let sparks = 0;
    let finished = false;
    let shown: Evaluation | null = null; // the last test's verdict, used to colour the parts
    let run: { t: number; ev: Evaluation } | null = null;
    let flash = 0;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A charged worker walking to a fuel pump, and the path that should carry their charge to the Earth.' });
    const g = fitCanvas(canvas, W, H);
    const status = h('p', { class: 'status-line', 'aria-live': 'polite' });
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const solution = h('section', { class: 'panel solution', hidden: true });
    const partsEl = h('div', { class: 'control-body' });
    const swapEl = h('div', { class: 'control-body' });
    const infoEl = h('div', { class: 'control-body' });
    const runBtn = h('button', { class: 'btn', 'aria-label': 'Run the discharge test', onclick: () => runTest() }, 'Run discharge test');

    // ---- geometry ---------------------------------------------------------------------------
    const nRoutes = lvl.routes.length;
    const rowY = (r: number) => (nRoutes === 1 ? 285 : 255 + r * 66);
    function slotRect(r: number, s: number): Rect {
      const n = lvl.routes[r].slots.length;
      const span = 340;
      const cell = span / n;
      const w = Math.min(118, cell - 18);
      return { x: 150 + cell * (s + 0.5) - w / 2, y: rowY(r) - 22, w, h: 44 };
    }

    // ---- actions ----------------------------------------------------------------------------
    function say(text: string, kind: 'good' | 'bad' | '') {
      feedback.hidden = false;
      feedback.className = `feedback ${kind}`;
      feedback.textContent = text;
    }
    const busy = () => run !== null || flash > 0;

    function select(route: number, slot: number) {
      if (finished) return;
      sel = { route, slot };
      refresh();
    }
    function put(id: string) {
      if (finished || busy()) return;
      config[sel.route][sel.slot] = id;
      shown = null;
      refresh();
    }
    function restore() {
      if (finished || busy()) return;
      config[sel.route][sel.slot] = start[sel.route][sel.slot];
      shown = null;
      refresh();
    }
    function runTest() {
      if (finished || busy()) return;
      const check = checkConfig(lvl, config);
      if (check.status === 'gap') return say('There is still an empty gap in the path. Fit a part into every position first. (This does not cost you anything.)', 'bad');
      if (check.status === 'too-many-changes') return say(`You may swap at most ${check.allowed} part${check.allowed === 1 ? '' : 's'}, but you have changed ${check.made}. Restore the extra ones. (This does not cost you anything.)`, 'bad');
      if (check.status === 'over-budget') return say(`Over budget: those parts cost ${check.cost}, and the cap is ${check.cap}. (This does not cost you anything.)`, 'bad');
      run = { t: 0, ev: evaluate(lvl, config) };
      shown = run.ev;
      feedback.hidden = true;
      refresh();
    }
    function finishRun(ev: Evaluation) {
      run = null;
      if (ev.safe) {
        finished = true;
        say(`Safe! The charge drained away before the worker reached the nozzle.${sparks ? '' : ' No sparks at all.'}`, 'good');
        solution.replaceChildren(h('h3', null, 'Why it worked'), ...explainSuccess(lvl, config).map((t) => h('p', null, t)));
        solution.hidden = false;
        refresh();
        ctx.win({ stars: starsFor(sparks) });
        return;
      }
      sparks++;
      flash = FLASH;
      say(`SPARK at the nozzle! ${explainFailure(lvl, config)} (That cost a star.)`, 'bad');
      refresh();
    }

    // ---- DOM parts --------------------------------------------------------------------------
    function refresh() {
      const slotBtns: Node[] = [];
      lvl.routes.forEach((route, r) => {
        const group = route.slots.map((slot, s) => {
          const id = config[r][s];
          const changed = id !== start[r][s];
          const text = `${slot.name}: ${id === null ? 'empty' : material(id).name}${changed && lvl.maxChanges !== null ? ' (swapped)' : ''}`;
          return h('button', { class: 'btn secondary small', 'aria-pressed': String(sel.route === r && sel.slot === s), disabled: finished, onclick: () => select(r, s) }, text);
        });
        slotBtns.push(h('div', { class: 'route-group' }, ...(nRoutes > 1 ? [h('strong', null, route.name)] : []), ...group));
      });
      partsEl.replaceChildren(...slotBtns);

      const slot = lvl.routes[sel.route].slots[sel.slot];
      const choices = slot.options ?? lvl.toolbox;
      const current = config[sel.route][sel.slot];
      swapEl.replaceChildren(
        h('p', { class: 'muted' }, `Fit into: ${nRoutes > 1 ? lvl.routes[sel.route].name + ', ' : ''}${slot.name}`),
        h(
          'div',
          { class: 'choices' },
          ...choices.map((id) => {
            const m = material(id);
            const datasheet = lvl.mode === 'tradeoff' ? ` · R ${fmtR(m.r)} · cost ${m.cost}` : '';
            return h('button', { class: 'btn secondary small', 'aria-pressed': String(current === id), disabled: finished || busy(), onclick: () => put(id) }, `${m.name}${datasheet}`);
          }),
        ),
        ...(lvl.maxChanges !== null ? [h('button', { class: 'btn secondary small', disabled: finished || busy() || current === start[sel.route][sel.slot], onclick: () => restore() }, 'Undo the swap on this part')] : []),
      );

      const info: Node[] = [];
      if (lvl.maxChanges !== null) info.push(h('p', null, h('strong', null, 'Parts swapped: '), `${changesMade(lvl, config)} of ${lvl.maxChanges} allowed`));
      if (lvl.mode === 'tradeoff') {
        const filled = config.every((r) => r.every((id) => id !== null));
        const res = filled ? evaluate(lvl, config).resistance : null;
        info.push(
          h('p', null, h('strong', null, 'Total resistance: '), res === null ? 'choose all three parts' : `${fmtR(res)} (limit ${lvl.rMax})`),
          h('p', null, h('strong', null, 'Total cost: '), `${costOf(config)} (cap ${lvl.costCap})`),
        );
      }
      infoEl.replaceChildren(...info);
      runBtn.toggleAttribute('disabled', finished || busy());
    }

    // ---- input ------------------------------------------------------------------------------
    canvas.addEventListener('pointerdown', (e) => {
      const p = pointerToLocal(e, canvas, W, H);
      lvl.routes.forEach((route, r) =>
        route.slots.forEach((_, s) => {
          const b = slotRect(r, s);
          if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) select(r, s);
        }),
      );
    });

    // ---- animation --------------------------------------------------------------------------
    function frame(dt: number) {
      if (run) {
        run.t += dt;
        if (run.t >= lvl.walk) finishRun(run.ev);
      }
      if (flash > 0) {
        flash = Math.max(0, flash - dt);
        if (flash === 0) refresh();
      }
      const text = run ? 'The worker is walking to the pump…' : finished ? 'Discharged. The worker can refuel safely.' : flash > 0 ? 'SPARK!' : 'Fix the discharge path, then run the test.';
      if (status.textContent !== text) status.textContent = text;
      draw();
    }

    function draw() {
      g.clearRect(0, 0, W, H);
      g.fillStyle = col.panel;
      g.fillRect(0, 0, W, H);

      const t = run ? run.t : finished ? lvl.walk : 0;
      const frac = run ? remaining(t, run.ev.resistance, lvl.rMax, lvl.walk) : finished ? remaining(lvl.walk, evaluate(lvl, config).resistance, lvl.rMax, lvl.walk) : 1;
      const walkX = WORKER_X0 + (PUMP_X - 70 - WORKER_X0) * Math.min(1, t / lvl.walk);

      // forecourt: ground, pump with nozzle, and the worker with a charge meter
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(20, GROUND);
      g.lineTo(W - 20, GROUND);
      g.stroke();
      g.fillStyle = '#6b7385';
      g.fillRect(PUMP_X - 20, GROUND - 78, 40, 78);
      g.fillStyle = '#d9a441';
      g.fillRect(PUMP_X - 14, GROUND - 70, 28, 22);
      g.strokeStyle = '#6b7385';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(PUMP_X - 20, GROUND - 40);
      g.lineTo(PUMP_X - 38, GROUND - 40);
      g.lineTo(PUMP_X - 44, GROUND - 24);
      g.stroke();
      label(g, 'fuel pump', PUMP_X, GROUND + 18, { size: 12, color: col.muted, bold: false });

      // worker
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(walkX, GROUND - 62);
      g.lineTo(walkX, GROUND - 24);
      g.moveTo(walkX - 14, GROUND - 48);
      g.lineTo(walkX + 14, GROUND - 48);
      g.moveTo(walkX, GROUND - 24);
      g.lineTo(walkX - 10, GROUND);
      g.moveTo(walkX, GROUND - 24);
      g.lineTo(walkX + 10, GROUND);
      g.stroke();
      disc(g, walkX, GROUND - 74, 12, col.panel, col.text);
      const pluses = Math.max(0, Math.round(5 * frac));
      label(g, '+'.repeat(pluses) || '·', walkX, GROUND - 98, { size: 16, color: frac > SAFE_FRACTION ? BAD : OK });
      label(g, `charge left: ${Math.round(frac * 100)}%`, walkX, GROUND + 18, { size: 12, color: col.muted, bold: false });

      if (flash > 0) {
        const a = flash / FLASH;
        g.globalAlpha = a;
        g.fillStyle = '#ffb400';
        g.beginPath();
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * Math.PI * 2;
          const r = i % 2 === 0 ? 36 : 16;
          g.lineTo(PUMP_X - 44 + Math.cos(ang) * r, GROUND - 24 + Math.sin(ang) * r);
        }
        g.closePath();
        g.fill();
        g.globalAlpha = 1;
        label(g, 'SPARK!', PUMP_X - 44, GROUND - 70, { size: 18, color: BAD });
      }

      // the discharge path: worker node, routes of parts, Earth node
      const leftX = 90;
      const rightX = 560;
      const midY = nRoutes === 1 ? rowY(0) : (rowY(0) + rowY(1)) / 2;
      disc(g, leftX, midY, NODE, col.panel, col.text);
      label(g, 'Worker', leftX, midY + 4, { size: 11, color: col.text });
      disc(g, rightX, midY, NODE, col.panel, col.text);
      label(g, 'Earth', rightX, midY + 4, { size: 11, color: col.text });
      g.strokeStyle = col.muted;
      g.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(rightX - 10 + i * 4, midY + NODE + 8 + i * 5);
        g.lineTo(rightX + 10 - i * 4, midY + NODE + 8 + i * 5);
        g.stroke();
      }

      lvl.routes.forEach((route, r) => {
        const y = rowY(r);
        const first = slotRect(r, 0);
        const lastRect = slotRect(r, route.slots.length - 1);
        // wires: node -> first part -> ... -> last part -> node
        g.strokeStyle = col.muted;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(leftX + NODE, midY);
        if (nRoutes > 1) g.lineTo(120, midY), g.lineTo(120, y);
        g.lineTo(first.x, y);
        g.stroke();
        route.slots.forEach((_, s) => {
          if (s === 0) return;
          const a = slotRect(r, s - 1);
          const b = slotRect(r, s);
          g.beginPath();
          g.moveTo(a.x + a.w, y);
          g.lineTo(b.x, y);
          g.stroke();
        });
        g.beginPath();
        g.moveTo(lastRect.x + lastRect.w, y);
        g.lineTo(520, y);
        if (nRoutes > 1) g.lineTo(520, midY);
        g.lineTo(rightX - NODE, midY);
        g.stroke();
        if (nRoutes > 1) label(g, route.name, 40, y + 4, { size: 12, color: col.muted, align: 'center' });

        // parts
        route.slots.forEach((slot, s) => {
          const b = slotRect(r, s);
          const id = config[r][s];
          const blockedHere = shown?.blocked.some((x) => x.route === r && x.slot === s);
          const passed = shown && !blockedHere && (shown.blocked.find((x) => x.route === r)?.slot ?? Infinity) > s;
          g.fillStyle = col.panel;
          g.fillRect(b.x, b.y, b.w, b.h);
          g.strokeStyle = blockedHere ? BAD : passed ? OK : col.muted;
          g.lineWidth = 3;
          g.strokeRect(b.x, b.y, b.w, b.h);
          if (sel.route === r && sel.slot === s && !finished) {
            g.setLineDash([5, 4]);
            g.strokeStyle = col.accent;
            g.lineWidth = 2;
            g.strokeRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10);
            g.setLineDash([]);
          }
          label(g, id === null ? '—' : material(id).name, b.x + b.w / 2, b.y + b.h / 2 + 4, { size: b.w < 90 ? 11 : 12, color: col.text });
          label(g, slot.name, b.x + b.w / 2, b.y - 8, { size: 11, color: col.muted, bold: false });
          if (id !== start[r][s] && lvl.maxChanges !== null) label(g, 'swapped', b.x + b.w / 2, b.y + b.h + 14, { size: 10, color: col.accent, bold: false });
        });

        // charge carriers flowing along the route while the test runs
        if (run) {
          const wireStart = leftX + NODE;
          const stopAt = shown?.blocked.find((x) => x.route === r);
          const stopX = stopAt ? slotRect(r, stopAt.slot).x - 8 : rightX - NODE;
          const speed = 120;
          for (let k = 0; k < 7; k++) {
            const pos = (run.t * speed + k * 52) % 520;
            const x = wireStart + pos;
            if (x > stopX) {
              if (stopAt) disc(g, stopX - (k % 3) * 9, y, 4, BAD);
              continue;
            }
            disc(g, x, nRoutes > 1 && x < 120 ? midY : y, 4, '#c0392b');
          }
        }
      });
    }

    // ---- assemble ---------------------------------------------------------------------------
    ctx.root.append(
      h('p', { class: 'story' }, lvl.story),
      status,
      canvas,
      h(
        'div',
        { class: 'lab-controls' },
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Parts of the path'), partsEl),
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, lvl.mode === 'tradeoff' ? 'Choose a part' : 'Swap in'), swapEl),
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Limits'), infoEl),
        h('div', { class: 'control record-row' }, h('span', { class: 'control-label' }, 'Test'), runBtn, h('span', { class: 'muted' }, 'A failed test is a spark and costs a star.')),
      ),
      feedback,
      solution,
    );
    refresh();
    return startLoop(frame);
  },
});
