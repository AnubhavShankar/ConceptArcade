import { defineGame } from '@core/define';
import { h } from '@core/dom';
import { fitCanvas, pointerToLocal, startLoop, stepPendulum, type Pendulum } from '@core/sim';
import { buildLevel, deduce, LETTERS, pullAccel, reaction, scoreTags, simpleScanCost, starsForRun, symbol, type Probe, type Reaction, type Sign } from './logic';

const W = 640;
const H = 330;
const ANCHOR_Y = 30;
const THREAD = 150;
const BALL = 22;
const PROBE_R = 90;

interface Item {
  label: string;
  sign: Sign;
  anchorX: number;
  p: Pendulum;
  /** Mystery spheres hide their sign until the student wins; the reference sphere shows it. */
  mystery: boolean;
}

const REACTION_TEXT: Record<Reaction, string> = { attract: 'pulled toward the rod', repel: 'pushed away from the rod', none: 'did not move' };

export default defineGame({
  mount(ctx) {
    const lvl = buildLevel(ctx.level, ctx.random);
    const n = lvl.spheres.length;
    const count = n + (lvl.reference ? 1 : 0);
    const css = getComputedStyle(document.documentElement);
    const col = (name: string) => css.getPropertyValue(name).trim();
    const colors = { text: col('--text'), muted: col('--muted'), line: col('--line'), panel: col('--panel'), accent: col('--accent') };

    // ---- scene state ------------------------------------------------------------------------
    const items: Item[] = [];
    if (lvl.reference) items.push({ label: 'REF', sign: 1, anchorX: W / (count + 1), p: { x: 0, v: 0 }, mystery: false });
    lvl.spheres.forEach((sign, i) =>
      items.push({ label: LETTERS[i], sign, anchorX: ((i + (lvl.reference ? 2 : 1)) * W) / (count + 1), p: { x: 0, v: 0 }, mystery: true }),
    );

    let rodIndex = 0;
    let wand = { x: W / 2, y: H - 14 }; // parked out of every sphere's reach
    let target: { x: number; y: number } | null = null;
    const seen = new Set<string>();
    const observations: { rodId: string; item: number; reaction: Reaction; rodSign: Sign }[] = [];
    let probes = 0;
    let wrong = 0;
    let revealed = false;
    let finished = false;
    const tags: (Sign | null)[] = Array(n).fill(null);
    let rodTag: Sign | null = null;
    const cost = simpleScanCost(lvl.spheres, lvl.reference);

    const pos = (it: Item) => ({ x: it.anchorX + it.p.x, y: ANCHOR_Y + Math.sqrt(THREAD * THREAD - it.p.x * it.p.x) });
    const signColor = (s: Sign) => (s > 0 ? '#c0392b' : s < 0 ? '#3156d3' : '#8a93a3');

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Spheres hanging from threads. Move the rod near a sphere to probe it.' });
    const g = fitCanvas(canvas, W, H);
    const status = h('p', { class: 'muted', 'aria-live': 'polite' });
    const log = h('ol', { class: 'notebook-log', 'aria-live': 'polite' });
    const feedback = h('p', { class: 'feedback', hidden: true, 'aria-live': 'polite' });

    const rodButtons = lvl.rods.map((rod, i) =>
      h('button', { class: 'btn secondary rod-btn', onclick: () => selectRod(i) }, h('span', { class: 'swatch', style: `background:${rod.color}` }), rod.label),
    );
    const probeButtons = items.map((it, i) =>
      h('button', { class: 'btn secondary small', onclick: () => moveWandTo(i) }, `Probe ${it.label === 'REF' ? 'reference' : it.label}`),
    );

    const tagRows = lvl.spheres.map((_, i) => {
      const buttons = ([1, -1, 0] as Sign[]).map((s) =>
        h('button', { class: 'btn secondary tag-btn', 'aria-pressed': 'false', 'aria-label': `Sphere ${LETTERS[i]} is ${symbol(s)}`, onclick: () => setTag(i, s) }, symbol(s)),
      );
      return { buttons, el: h('div', { class: 'tag-row' }, h('strong', null, `Sphere ${LETTERS[i]}`), ...buttons) };
    });
    const rodTagButtons = ([1, -1] as Sign[]).map((s) =>
      h('button', { class: 'btn secondary tag-btn', 'aria-pressed': 'false', 'aria-label': `Rod X is ${symbol(s)}`, onclick: () => setRodTag(s) }, symbol(s)),
    );
    const submit = h('button', { class: 'btn', onclick: () => submitAnswer() }, 'Submit deduction');

    // ---- actions ----------------------------------------------------------------------------
    function selectRod(i: number) {
      rodIndex = i;
      rodButtons.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    }
    function moveWandTo(i: number) {
      const p = pos(items[i]);
      target = { x: p.x - 38, y: p.y + 30 };
    }
    function paintTags() {
      tagRows.forEach((row, i) => row.buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(tags[i] === ([1, -1, 0] as Sign[])[j]))));
      rodTagButtons.forEach((b, j) => b.setAttribute('aria-pressed', String(rodTag === ([1, -1] as Sign[])[j])));
    }
    function setTag(i: number, s: Sign) {
      if (finished) return;
      tags[i] = tags[i] === s ? null : s;
      paintTags();
    }
    function setRodTag(s: Sign) {
      if (finished) return;
      rodTag = rodTag === s ? null : s;
      paintTags();
    }
    function say(text: string, kind: 'good' | 'bad' | '') {
      feedback.hidden = false;
      feedback.className = `feedback ${kind}`;
      feedback.textContent = text;
    }
    function refreshStatus() {
      status.textContent = `Probes used: ${probes}   ·   Wrong submissions: ${wrong}`;
    }
    function record(itemIndex: number) {
      const rod = lvl.rods[rodIndex];
      const key = `${rod.id}|${itemIndex}`;
      if (seen.has(key)) return;
      seen.add(key);
      probes++;
      const r = reaction(rod.sign, items[itemIndex].sign);
      observations.push({ rodId: rod.id, item: itemIndex, reaction: r, rodSign: rod.sign });
      const who = items[itemIndex].mystery ? `Sphere ${items[itemIndex].label}` : 'Reference sphere (+)';
      log.append(h('li', null, `${rod.label} near ${who}: ${REACTION_TEXT[r]}.`));
      log.lastElementChild?.scrollIntoView({ block: 'nearest' });
      refreshStatus();
    }
    function submitAnswer() {
      if (finished) return;
      const truth: Sign[] = lvl.tagRod ? [...lvl.spheres, lvl.rods[0].sign] : lvl.spheres;
      const given = lvl.tagRod ? [...tags, rodTag] : tags;
      const score = scoreTags(truth, given);
      if (!score.complete) {
        say(lvl.tagRod ? 'Tag every sphere and rod X first.' : 'Tag every sphere first: pick +, − or 0 for each.', 'bad');
        return;
      }
      // A lucky guess is not a deduction: every label must be PROVEN by the notebook before it can be judged.
      // This says nothing about whether the labels are right, so it can't be used to peek at the answer.
      const probesMade: Probe[] = observations.map((o) => ({
        rod: lvl.rods.findIndex((r) => r.id === o.rodId),
        target: lvl.reference && o.item === 0 ? 'ref' : o.item - (lvl.reference ? 1 : 0),
        reaction: o.reaction,
      }));
      const proven = deduce(lvl, n, probesMade);
      const unproven = [...proven.spheres.map((s, i) => (s === null ? 'Sphere ' + LETTERS[i] : '')), lvl.tagRod && proven.rodX === null ? 'rod X' : ''].filter(Boolean);
      if (unproven.length > 0) {
        say(`Your notebook can’t prove ${unproven.join(', ')} yet. A lucky guess doesn’t count, so probe more (this doesn’t cost you anything).`, 'bad');
        return;
      }
      if (score.allCorrect) {
        finished = true;
        revealed = true;
        submit.setAttribute('disabled', '');
        say(`Every label is right. You used ${probes} probe${probes === 1 ? '' : 's'} (a straightforward scan needs ${cost}).`, 'good');
        ctx.win({ stars: starsForRun(probes, cost, wrong) });
        return;
      }
      wrong++;
      refreshStatus();
      say(`${score.correct} of ${score.total} labels are right. Re-check your observations and try again (each wrong submission costs a star).`, 'bad');
    }

    // ---- pointer ----------------------------------------------------------------------------
    const moveWand = (e: PointerEvent) => {
      const p = pointerToLocal(e, canvas, W, H);
      wand = { x: Math.max(0, Math.min(W, p.x)), y: Math.max(0, Math.min(H, p.y)) };
      target = null;
    };
    canvas.addEventListener('pointermove', moveWand);
    canvas.addEventListener('pointerdown', moveWand);

    // ---- simulation + drawing ---------------------------------------------------------------
    const rod = () => lvl.rods[rodIndex];

    function frame(dt: number) {
      if (target) {
        wand = { x: wand.x + (target.x - wand.x) * Math.min(1, dt * 6), y: wand.y + (target.y - wand.y) * Math.min(1, dt * 6) };
      }
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const p = pos(it);
        const dx = wand.x - p.x;
        const dist = Math.hypot(dx, wand.y - p.y);
        const r = reaction(rod().sign, it.sign);
        stepPendulum(it.p, pullAccel(r, dx, dist), dt);
        if (dist <= PROBE_R && !finished) record(i);
      }
      draw();
    }

    function draw() {
      g.clearRect(0, 0, W, H);
      g.fillStyle = colors.panel;
      g.fillRect(0, 0, W, H);
      g.fillStyle = colors.line;
      g.fillRect(16, ANCHOR_Y - 10, W - 32, 8);

      items.forEach((it) => {
        const p = pos(it);
        const near = Math.hypot(wand.x - p.x, wand.y - p.y) <= PROBE_R;
        g.strokeStyle = colors.muted;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(it.anchorX, ANCHOR_Y - 2);
        g.lineTo(p.x, p.y);
        g.stroke();

        if (near && !finished) {
          g.strokeStyle = colors.accent;
          g.setLineDash([5, 4]);
          g.beginPath();
          g.arc(p.x, p.y, BALL + 9, 0, Math.PI * 2);
          g.stroke();
          g.setLineDash([]);
        }
        const showSign = revealed || !it.mystery;
        g.fillStyle = showSign ? signColor(it.sign) : '#cfd6e4';
        g.strokeStyle = colors.text;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(p.x, p.y, BALL, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.textAlign = 'center';
        g.fillStyle = showSign ? '#ffffff' : '#46506a';
        g.font = 'bold 20px system-ui, sans-serif';
        g.fillText(showSign ? symbol(it.sign) : '?', p.x, p.y + 7);
        g.fillStyle = colors.text;
        g.font = 'bold 14px system-ui, sans-serif';
        g.fillText(it.mystery ? `Sphere ${it.label}` : 'Reference', p.x, p.y + BALL + 20);
      });

      // the rod: handle goes down and to the right, tip is the pointer
      const r = rod();
      g.strokeStyle = r.color;
      g.lineCap = 'round';
      g.lineWidth = 11;
      g.beginPath();
      g.moveTo(wand.x, wand.y);
      g.lineTo(wand.x + 110, wand.y + 80);
      g.stroke();
      g.lineCap = 'butt';
      g.fillStyle = r.color;
      g.beginPath();
      g.arc(wand.x, wand.y, 13, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = colors.text;
      g.lineWidth = 2;
      g.stroke();
      if (r.style !== 'material') {
        g.fillStyle = '#ffffff';
        g.textAlign = 'center';
        g.font = 'bold 16px system-ui, sans-serif';
        g.fillText(r.style === 'sign' ? symbol(r.sign) : r.id.toUpperCase(), wand.x, wand.y + 5.5);
      }
    }

    // ---- assemble ---------------------------------------------------------------------------
    ctx.root.append(
      h('p', { class: 'story' }, lvl.story),
      status,
      canvas,
      h('div', { class: 'row' }, h('strong', null, 'Rod:'), ...rodButtons),
      h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Keyboard or touch:'), ...probeButtons),
      h('h3', null, 'Notebook'),
      h('div', { class: 'notebook' }, log),
      h('h3', null, 'Your deduction'),
      ...tagRows.map((r) => r.el),
      ...(lvl.tagRod ? [h('div', { class: 'tag-row' }, h('strong', null, 'Rod X is'), ...rodTagButtons)] : []),
      h('div', { class: 'row' }, submit),
      feedback,
    );
    selectRod(0);
    refreshStatus();
    return startLoop(frame);
  },
});
