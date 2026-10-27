import { defineGame } from '@core/define';
import { disc, label, signColor, signed, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { fitCanvas, pointerToLocal, startLoop } from '@core/sim';
import { apply, buildLevel, isGoal, LETTERS, starsForMoves, total, type Move, type State } from './logic';

const W = 640;
const H = 300;
const Y = 148;
const R = 32;
const SLIDE = 0.7; // seconds for a touch animation; charges change at the halfway point

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const n = lvl.start.length;
    const col = themeColors();
    const baseX = (i: number) => ((i + 1) * W) / (n + 1);

    let cur: State = [...lvl.start];
    let moves = 0;
    let finished = false;
    let selected: number[] = [];
    let anim: { move: Move; t: number; applied: boolean } | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Metal spheres on insulating stands, each showing its charge and its goal.' });
    const g = fitCanvas(canvas, W, H);
    const status = h('p', { class: 'muted', 'aria-live': 'polite' });
    const log = h('ol', { class: 'notebook-log', 'aria-live': 'polite' });
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
    const sphereButtons = lvl.start.map((_, i) => h('button', { class: 'btn secondary tag-btn', 'aria-pressed': 'false', onclick: () => pick(i) }, LETTERS[i]));
    const earthBtn = h('button', { class: 'btn secondary', onclick: () => earth() }, 'Touch selected sphere to Earth');
    const resetBtn = h('button', { class: 'btn secondary', onclick: () => reset() }, 'Reset spheres');

    // ---- actions ----------------------------------------------------------------------------
    function refresh() {
      status.textContent = `Touches used: ${moves}   ·   Fewest possible: ${lvl.par}`;
      sphereButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(selected.includes(i))));
      earthBtn.toggleAttribute('disabled', !lvl.allowGround || selected.length !== 1 || !!anim || finished);
      resetBtn.toggleAttribute('disabled', finished);
      resetBtn.title = finished ? 'Level complete. Use "Replay level" below for a fresh puzzle.' : '';
    }
    function pick(i: number) {
      if (anim || finished) return;
      selected = selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i];
      if (selected.length === 2) {
        anim = { move: { kind: 'touch', a: selected[0], b: selected[1] }, t: 0, applied: false };
        selected = [];
      }
      refresh();
    }
    function earth() {
      if (anim || finished || !lvl.allowGround || selected.length !== 1) return;
      anim = { move: { kind: 'ground', a: selected[0] }, t: 0, applied: false };
      selected = [];
      refresh();
    }
    function reset() {
      if (finished) return; // the button is disabled once the level is won
      anim = null; // reset works immediately, even in the middle of a touch animation
      cur = [...lvl.start];
      moves = 0;
      selected = [];
      log.append(h('li', null, 'Spheres reset to their starting charges.'));
      refresh();
    }
    function commit(m: Move) {
      const before = cur;
      cur = apply(cur, m);
      moves++;
      const text =
        m.kind === 'touch'
          ? `${LETTERS[m.a]} touched ${LETTERS[m.b]}: both now ${signed(cur[m.a])} (was ${signed(before[m.a])} and ${signed(before[m.b])}).`
          : `${LETTERS[m.a]} touched the Earth: ${signed(before[m.a])} drained away, now 0.`;
      log.append(h('li', null, text));
      log.lastElementChild?.scrollIntoView({ block: 'nearest' });
      if (isGoal(cur, lvl.target)) {
        finished = true;
        feedback.hidden = false;
        feedback.className = 'feedback good';
        feedback.textContent = `Every goal is met in ${moves} touch${moves === 1 ? '' : 'es'} (the fewest possible is ${lvl.par}).`;
        ctx.win({ stars: starsForMoves(moves, lvl.par) });
      }
      refresh();
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
          commit(anim.move);
        }
        if (anim.t >= SLIDE) {
          anim = null;
          refresh();
        }
      }
      draw();
    }

    function offset(i: number): { dx: number; dy: number } {
      if (!anim) return { dx: 0, dy: 0 };
      const bump = Math.sin((Math.PI * Math.min(anim.t, SLIDE)) / SLIDE);
      const m = anim.move;
      if (m.kind === 'touch' && (i === m.a || i === m.b)) {
        const other = i === m.a ? m.b : m.a;
        const gap = baseX(other) - baseX(i);
        // lift the pair above the row so they never hide a sphere they pass over
        return { dx: (gap / 2 - Math.sign(gap) * (R + 1)) * bump, dy: -84 * bump };
      }
      if (m.kind === 'ground' && i === m.a) return { dx: 0, dy: 58 * bump };
      return { dx: 0, dy: 0 };
    }

    function draw() {
      g.clearRect(0, 0, W, H);
      g.fillStyle = col.panel;
      g.fillRect(0, 0, W, H);
      label(g, `Total charge in the lab: ${signed(total(cur))} µC`, W / 2, 22, { size: 16, color: col.text });

      cur.forEach((q, i) => {
        const { dx, dy } = offset(i);
        const x = baseX(i) + dx;
        const y = Y + dy;
        // insulating stand
        g.fillStyle = col.line;
        g.fillRect(baseX(i) - 5, Y + R, 10, 52);
        g.fillRect(baseX(i) - 26, Y + R + 52, 52, 7);
        if (selected.includes(i)) {
          g.setLineDash([6, 4]);
          g.strokeStyle = col.accent;
          g.lineWidth = 3;
          g.beginPath();
          g.arc(x, y, R + 8, 0, Math.PI * 2);
          g.stroke();
          g.setLineDash([]);
        }
        disc(g, x, y, R, signColor(q), col.text);
        label(g, signed(q), x, y + 7, { size: 20, color: '#ffffff' });
        label(g, `Sphere ${LETTERS[i]}`, baseX(i), Y + R + 82, { size: 14, color: col.text });
        const goal = lvl.target[i];
        const met = goal === null || Math.abs(q - goal) < 1e-9;
        label(g, goal === null ? 'goal: any' : `goal ${signed(goal)}`, baseX(i), Y + R + 102, { size: 13, color: goal === null ? col.muted : met ? col.good : col.bad });
      });

      if (lvl.allowGround) {
        g.strokeStyle = col.muted;
        g.lineWidth = 2;
        [0, 6, 12].forEach((k) => {
          g.beginPath();
          g.moveTo(W - 90 + k, H - 30 + k * 0.6);
          g.lineTo(W - 20 - k, H - 30 + k * 0.6);
          g.stroke();
        });
        label(g, 'Earth', W - 55, H - 6, { size: 12, color: col.muted, bold: false });
      }
    }

    // ---- assemble ---------------------------------------------------------------------------
    ctx.root.append(
      h('p', { class: 'story' }, lvl.story),
      status,
      canvas,
      h('div', { class: 'row' }, h('strong', null, 'Touch together:'), ...sphereButtons, ...(lvl.allowGround ? [earthBtn] : []), resetBtn),
      h('p', { class: 'muted' }, 'Pick two spheres to touch them (click them on the picture or use the buttons).'),
      h('h3', null, 'Log'),
      h('div', { class: 'notebook' }, log),
      feedback,
    );
    refresh();
    return startLoop(frame);
  },
});
