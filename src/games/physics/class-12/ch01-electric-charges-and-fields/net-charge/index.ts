import { defineGame } from '@core/define';
import { disc, label, signColor, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { fitCanvas, pointerToLocal, startLoop } from '@core/sim';
import { bestUnit, buildLevel, explainSolution, fmtCharge, judgeSeal, sealMessage, starsFor, total, touch } from './logic';

const W = 640;
const H = 310;
const Y = 150;
const R = 37;
const SLIDE = 0.7; // seconds; the charges change at the halfway point

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const n = lvl.start.length;
    const col = themeColors();
    const baseX = (i: number) => ((i + 1) * W) / (n + 1);

    let cur: number[] = [...lvl.start];
    let touched: boolean[] = lvl.start.map(() => false);
    /** Composite cells whose net charge the student has read with the electrometer. */
    let measured: boolean[] = lvl.start.map(() => false);
    let moves = 0;
    let overloads = 0;
    let finished = false;
    let selected: number[] = [];
    let anim: { a: number; b: number; t: number; applied: boolean } | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Conducting bodies with charge readouts, and a vault.' });
    const g = fitCanvas(canvas, W, H);
    const status = h('p', { class: 'muted', 'aria-live': 'polite' });
    const log = h('ol', { class: 'notebook-log', 'aria-live': 'polite' });
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const solution = h('section', { class: 'panel solution', hidden: true });
    const bodyButtons = lvl.names.map((name, i) => h('button', { class: 'btn secondary', 'aria-pressed': 'false', onclick: () => pick(i) }, name));
    const sealBtn = h('button', { class: 'btn', onclick: () => seal() }, 'Seal the vault');
    const resetBtn = h('button', { class: 'btn secondary', onclick: () => reset() }, 'Reset bodies');
    // Level 3: the door does not state a number. It asks for a match with the sealed capsule.
    const door = h(
      'div',
      { class: 'door', role: 'status' },
      h('span', { class: 'door-label' }, 'SYS_REQ'),
      h('span', { class: 'door-value' }, lvl.hiddenTarget ? 'match the sealed capsule' : fmtCharge(lvl.target, lvl.targetUnit)),
    );
    const compositeIdx = lvl.parts.flatMap((p, i) => (p ? [i] : []));
    const measureBtns = compositeIdx.map((i) => h('button', { class: 'btn secondary', onclick: () => measure(i) }, `Measure ${lvl.names[i]} (electrometer)`));

    // ---- actions ----------------------------------------------------------------------------
    function refresh() {
      status.textContent = `Touches used: ${moves}   ·   Fewest possible: ${lvl.par}   ·   Overloads: ${overloads}`;
      bodyButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(selected.includes(i))));
      sealBtn.toggleAttribute('disabled', finished);
      resetBtn.toggleAttribute('disabled', finished);
      resetBtn.title = finished ? 'Vault sealed. Use "Replay level" below for a fresh puzzle.' : '';
    }
    function pick(i: number) {
      if (anim || finished) return;
      selected = selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i];
      if (selected.length === 2) {
        anim = { a: selected[0], b: selected[1], t: 0, applied: false };
        selected = [];
      }
      refresh();
    }
    /** Read a composite cell's net charge. It does not touch anything, so the cell keeps its internal structure. */
    function measure(i: number) {
      if (anim || finished || measured[i] || touched[i]) return;
      measured[i] = true;
      log.append(h('li', null, `Electrometer on ${lvl.names[i]}: net charge ${fmtCharge(cur[i])}.`));
      refresh();
    }
    function reset() {
      if (finished) return;
      anim = null; // reset works at once, even in the middle of a touch animation
      cur = [...lvl.start];
      touched = lvl.start.map(() => false);
      measured = lvl.start.map(() => false);
      moves = 0;
      selected = [];
      log.append(h('li', null, 'Bodies reset to their starting charges.'));
      refresh();
    }
    function say(text: string, kind: 'good' | 'bad') {
      feedback.hidden = false;
      feedback.className = `feedback ${kind}`;
      feedback.textContent = text;
    }
    /** After a win: the fewest-touches solution, with the arithmetic and the reasoning. */
    function showSolution() {
      const ex = explainSolution(lvl);
      const verdict = moves === lvl.par ? 'You matched the fewest possible.' : `You used ${moves}; the fewest possible is ${lvl.par}.`;
      solution.replaceChildren(
        h('h3', null, `Fewest possible: ${lvl.par} touch${lvl.par === 1 ? '' : 'es'}`),
        h('p', { class: 'muted' }, `${verdict} Here is one way to do it, and why it works.`),
        ...ex.setup.map((t) => h('p', null, t)),
        h('ol', { class: 'solution-steps' }, ...ex.steps.map((st) => h('li', null, h('div', null, st.calc), h('div', { class: 'muted' }, st.note)))),
        h('h4', null, 'Why this is the shortest'),
        ...ex.rationale.map((t) => h('p', null, t)),
      );
      solution.hidden = false;
    }
    function commit(a: number, b: number) {
      const before = [cur[a], cur[b]];
      cur = touch(cur, a, b);
      touched[a] = true;
      touched[b] = true;
      moves++;
      log.append(h('li', null, `${lvl.names[a]} (${fmtCharge(before[0])}) touched ${lvl.names[b]} (${fmtCharge(before[1])}): both now ${fmtCharge(cur[a])}.`));
      log.lastElementChild?.scrollIntoView({ block: 'nearest' });
      refresh();
    }
    function seal() {
      if (anim || finished) return;
      const verdict = judgeSeal(cur[lvl.vault], lvl.target);
      if (verdict.ok) {
        finished = true;
        const what = lvl.hiddenTarget ? 'The capsule held ' : 'Vault sealed at ';
        say(`${what}${fmtCharge(lvl.target, lvl.targetUnit)}. Sealed in ${moves} touch${moves === 1 ? '' : 'es'} (the fewest possible is ${lvl.par}).`, 'good');
        refresh();
        showSolution();
        ctx.win({ stars: starsFor(moves, lvl.par, overloads) });
        return;
      }
      overloads++;
      refresh();
      say(sealMessage(lvl, cur[lvl.vault], verdict), 'bad');
    }

    canvas.addEventListener('pointerdown', (e) => {
      const p = pointerToLocal(e, canvas, W, H);
      const i = cur.findIndex((_, k) => Math.hypot(p.x - baseX(k), p.y - Y) <= R + 6);
      if (i >= 0) pick(i);
    });

    // ---- animation + drawing ----------------------------------------------------------------
    function frame(dt: number) {
      if (anim) {
        anim.t += dt;
        if (!anim.applied && anim.t >= SLIDE / 2) {
          anim.applied = true;
          commit(anim.a, anim.b);
        }
        if (anim.t >= SLIDE) {
          anim = null;
          refresh();
        }
      }
      draw();
    }

    function offset(i: number): { dx: number; dy: number } {
      if (!anim || (i !== anim.a && i !== anim.b)) return { dx: 0, dy: 0 };
      const bump = Math.sin((Math.PI * Math.min(anim.t, SLIDE)) / SLIDE);
      const other = i === anim.a ? anim.b : anim.a;
      const gap = baseX(other) - baseX(i);
      // lift the pair above the row so they never hide a body they pass over
      return { dx: (gap / 2 - Math.sign(gap) * (R + 1)) * bump, dy: -84 * bump };
    }

    function draw() {
      g.clearRect(0, 0, W, H);
      g.fillStyle = col.panel;
      g.fillRect(0, 0, W, H);
      // Shown in the prefix of the biggest body, so the total reads in the same units as the spheres.
      label(g, `Total charge in the cabinet: ${fmtCharge(total(cur), bestUnit([...cur, total(cur)]))}`, W / 2, 22, { size: 15, color: col.text });

      cur.forEach((q, i) => {
        const { dx, dy } = offset(i);
        const x = baseX(i) + dx;
        const y = Y + dy;
        const isVault = i === lvl.vault;
        g.fillStyle = col.line;
        g.fillRect(baseX(i) - 5, Y + R, 10, 44);
        g.fillRect(baseX(i) - 26, Y + R + 44, 52, 7);
        if (selected.includes(i)) {
          g.setLineDash([6, 4]);
          g.strokeStyle = col.accent;
          g.lineWidth = 3;
          g.beginPath();
          g.arc(x, y, R + 8, 0, Math.PI * 2);
          g.stroke();
          g.setLineDash([]);
        }
        if (isVault) disc(g, x, y, R + 5, 'transparent', col.good, 3);
        // A composite cell hides its net charge until it is measured or has touched something.
        const netHidden = lvl.parts[i] !== null && !touched[i] && !measured[i];
        disc(g, x, y, R, netHidden ? '#8a93a3' : signColor(q), col.text);
        label(g, netHidden ? 'net ?' : fmtCharge(q), x, y + 4, { size: 12, color: '#ffffff' });
        label(g, lvl.names[i], baseX(i), Y + R + 70, { size: 13, color: col.text });
        const parts = lvl.parts[i];
        if (parts && !touched[i]) {
          const last = parts.length - 1;
          parts.forEach((p, k) => {
            // the last internal charge is the sealed capsule: its value is never shown
            const sealed = lvl.hiddenTarget && k === last;
            label(g, sealed ? 'sealed capsule: ?' : fmtCharge(p), baseX(i), Y + R + 87 + k * 15, { size: 12, color: sealed ? col.accent : col.muted, bold: sealed });
          });
        }
      });
    }

    // ---- assemble ---------------------------------------------------------------------------
    ctx.root.append(
      h('p', { class: 'story' }, lvl.story),
      door,
      status,
      canvas,
      h('div', { class: 'row' }, h('strong', null, 'Touch together:'), ...bodyButtons),
      ...(measureBtns.length ? [h('div', { class: 'row' }, h('strong', null, 'Electrometer:'), ...measureBtns)] : []),
      h('div', { class: 'row' }, sealBtn, resetBtn),
      h('p', { class: 'muted' }, 'Pick two bodies to touch them (click them on the picture or use the buttons). Seal the vault when it holds exactly the charge the door asks for.'),
      h('h3', null, 'Log'),
      h('div', { class: 'notebook' }, log),
      feedback,
      solution,
    );
    refresh();
    return startLoop(frame);
  },
});
