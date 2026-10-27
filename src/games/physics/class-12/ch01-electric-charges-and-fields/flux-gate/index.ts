import { defineGame } from '@core/define';
import { label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, explainSolution, FACES, flux, fmt, judgeCube, judgeGrow, judgeTilt, starsFor, type FaceState } from './logic';

const W = 640;
const H = 340;
const REVEAL = 0.9;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const rad = (d: number) => (d * Math.PI) / 180;

interface Speck {
  x: number;
  y: number;
}
interface Flash {
  x: number;
  y: number;
  t: number;
}
const STATE_TEXT: Record<string, string> = { u: 'tap to choose', '1': 'leaves (+)', '-1': 'enters (−)', '0': 'skims (0)' };

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
    const canvas = h('canvas', { role: 'img', 'aria-label': 'Specks of electric field streaming through a loop or a cube. They flash as they cross.' });
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
    const field = (aria: string, placeholder: string) => h('input', { class: 'field', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': aria, placeholder }) as HTMLInputElement;
    const num = (el: HTMLInputElement) => parseNumber(el.value);
    const actionBtn = (text: string, aria: string, fn: () => void) => h('button', { class: 'btn', type: 'button', 'aria-label': aria, onclick: fn }, text);
    const verdict = (ok: boolean) => {
      verdictAt = clock;
      verdictOk = ok;
    };

    // ---- the stream of field specks ----------------------------------------------------------------
    /** Direction (unit vector in screen space) and speed (px/s) of the stream at a point. */
    let dirAt: (p: Speck) => Speck = () => ({ x: 1, y: 0 });
    let speedAt: (p: Speck) => number = () => 80;
    const specks: Speck[] = [];
    const flashes: Flash[] = [];
    let gate: { a: Speck; b: Speck } | null = null;
    const respawn = (s: Speck) => {
      const d = dirAt({ x: W / 2, y: H / 2 });
      let x = 8 + rnd() * (W - 16);
      let y = 8 + rnd() * (H - 16);
      for (let i = 0; i < 900 && x > 0 && x < W && y > 0 && y < H; i++) {
        x -= d.x * 2;
        y -= d.y * 2;
      }
      s.x = x + d.x * 2;
      s.y = y + d.y * 2;
    };
    function crosses(a: Speck, b: Speck, c: Speck, d: Speck): boolean {
      const o = (p: Speck, q: Speck, r: Speck) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
      return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
    }
    function moveSpecks(dt: number) {
      for (const s of specks) {
        const d = dirAt(s);
        const v = speedAt(s);
        const nx = s.x + d.x * v * dt;
        const ny = s.y + d.y * v * dt;
        if (gate && crosses(s, { x: nx, y: ny }, gate.a, gate.b)) flashes.push({ x: nx, y: ny, t: 0 });
        s.x = nx;
        s.y = ny;
        if (nx < -6 || nx > W + 6 || ny < -6 || ny > H + 6) respawn(s);
      }
      for (const f of flashes) f.t += dt;
      while (flashes.length && flashes[0].t > 0.6) flashes.shift();
    }
    function drawSpecks() {
      g.fillStyle = col.accent;
      g.globalAlpha = 0.7;
      for (const s of specks) {
        const d = dirAt(s);
        g.strokeStyle = col.accent;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(s.x, s.y);
        g.lineTo(s.x - d.x * 9, s.y - d.y * 9);
        g.stroke();
        g.beginPath();
        g.arc(s.x, s.y, 2.4, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      for (const f of flashes) {
        g.strokeStyle = col.good;
        g.lineWidth = 2.5;
        g.globalAlpha = 1 - f.t / 0.6;
        g.beginPath();
        g.arc(f.x, f.y, 4 + f.t * 30, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    const arrow = (x1: number, y1: number, x2: number, y2: number, color: string, width = 3) => {
      const m = Math.hypot(x2 - x1, y2 - y1) || 1;
      const ux = (x2 - x1) / m;
      const uy = (y2 - y1) / m;
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
      g.beginPath();
      g.moveTo(x2, y2);
      g.lineTo(x2 - ux * 10 - uy * 6, y2 - uy * 10 + ux * 6);
      g.lineTo(x2 - ux * 10 + uy * 6, y2 - uy * 10 - ux * 6);
      g.closePath();
      g.fill();
    };

    // ---- levels 1 and 3: the loop -----------------------------------------------------------------------------
    let theta = 90; // angle between the loop's outward normal and the field, in degrees
    let turn: { from: number; to: number; t: number } | null = null;
    const C = { x: W / 2, y: H / 2 };
    let placeGate: () => void = () => undefined;
    let finishTurn: (() => void) | null = null;
    if (lvl.kind === 'tilt' || lvl.kind === 'angle') {
      speedAt = () => 40 + (lvl.e / 1000) * 14;
      const len = lvl.side * 800;
      placeGate = () => {
        const n = { x: Math.cos(rad(theta)), y: -Math.sin(rad(theta)) };
        const d = { x: -n.y, y: n.x };
        gate = { a: { x: C.x - (d.x * len) / 2, y: C.y - (d.y * len) / 2 }, b: { x: C.x + (d.x * len) / 2, y: C.y + (d.y * len) / 2 } };
      };
      placeGate();
      if (lvl.kind === 'tilt') {
        const slider = h('input', { type: 'range', min: 0, max: 180, step: 1, value: String(theta), class: 'v-slider', 'aria-label': 'Angle between the loop’s normal and the field in degrees', oninput: () => { theta = Number(slider.value); } }) as HTMLInputElement;
        const run = () => {
          if (finished) return;
          const res = judgeTilt(lvl, theta);
          verdict(res.ok);
          if (res.ok) return succeed(`The meter reads ${fmt(res.flux)} N m²/C: the target flux.`);
          miss(`The flux is ${res.verdict === 'too-much' ? 'larger' : 'smaller'} than the target of ${fmt(lvl.target)} N m²/C. ${res.verdict === 'too-much' ? 'Turn the loop further from facing the field.' : 'Turn the loop to face the field more.'}`);
        };
        controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Target: ${fmt(lvl.target)} N m²/C`), slider, meter), actionBtn('Lock the loop', 'Lock the loop', run));
      } else {
        const angleIn = field('Angle between the normal and the field in degrees', 'θ = ? °');
        const run = () => {
          if (finished || turn) return;
          const a = num(angleIn);
          if (a === null || a < 0 || a > 180) return freeNote('Enter an angle between 0° and 180°.');
          turn = { from: theta, to: a, t: 0 };
        };
        controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, `Target: ${fmt(lvl.target)} N m²/C`), angleIn, h('span', { class: 'unit' }, '°')), actionBtn('Turn the loop to my angle', 'Turn the loop', run));
        angleIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
        finishTurn = () => {
          const res = judgeTilt(lvl, theta);
          verdict(res.ok);
          if (res.ok) return succeed(`The loop reads ${fmt(res.flux)} N m²/C: the target flux.`);
          miss(`At that angle the loop reads ${res.verdict === 'too-much' ? 'more' : 'less'} than the target.`);
        };
      }
      hint.textContent = `Field ${fmt(lvl.e)} N/C along +x. Loop side ${lvl.side * 100} cm, so area ${fmt(lvl.side * lvl.side)} m². Angle θ is measured between the loop's outward normal (the arrow) and the field.`;
    }

    // ---- level 2: the cube ----------------------------------------------------------------------------------------
    const faceStates: (FaceState | null)[] = FACES.map(() => null);
    if (lvl.kind === 'cube') {
      const d = { x: Math.cos(rad(lvl.alpha)), y: -Math.sin(rad(lvl.alpha)) };
      dirAt = () => d;
      speedAt = () => 40 + (lvl.e / 1000) * 14;
      const buttons = FACES.map((f, i) => {
        const b = h('button', { class: 'btn secondary small', type: 'button', 'aria-label': `Face ${f}`, onclick: () => {
          if (finished) return;
          const cur = faceStates[i];
          faceStates[i] = cur === null ? 1 : cur === 1 ? -1 : cur === -1 ? 0 : 1;
          paintFaces();
        } });
        return b;
      });
      const paintFaces = () => buttons.forEach((b, i) => { b.textContent = `${FACES[i]} face: ${STATE_TEXT[faceStates[i] === null ? 'u' : String(faceStates[i])]}`; });
      paintFaces();
      const rightIn = field('Flux through the +x face in N m²/C', 'Φ(+x) = ?');
      const netIn = field('Net flux through the cube in N m²/C', 'Φ(net) = ?');
      const run = () => {
        if (finished) return;
        if (faceStates.some((s) => s === null)) return freeNote('Choose positive, negative or zero for all six faces first.');
        const r = num(rightIn);
        const n = num(netIn);
        if (r === null || n === null) return freeNote('Enter the flux through the +x face and the net flux, in N m²/C. Use a minus sign if negative.');
        const res = judgeCube(lvl, faceStates as FaceState[], r, n);
        verdict(res.ok);
        if (res.ok) return succeed('Every face is right, and the net flux is zero: what enters the cube also leaves it.');
        const parts: string[] = [];
        if (res.facesWrong) parts.push(`${res.facesWrong} of the 6 faces ${res.facesWrong === 1 ? 'has' : 'have'} the wrong sign.`);
        if (!res.rightOk) parts.push('The flux through the +x face is not right.');
        if (!res.netOk) parts.push('The net flux is not right.');
        miss(parts.join(' '));
      };
      controls.append(h('div', { class: 'bench' }, ...buttons), h('div', { class: 'control' }, h('span', { class: 'control-label' }, '+x face'), rightIn, h('span', { class: 'unit' }, 'N m²/C')), h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Net flux'), netIn, h('span', { class: 'unit' }, 'N m²/C')), actionBtn('Check the cube', 'Check the cube', run));
      hint.textContent = `Field ${fmt(lvl.e)} N/C at ${lvl.alpha}° from +x, in the x-y plane. Cube side ${lvl.side * 100} cm. The ±z faces face towards and away from you.`;
    }

    // ---- level 4: the growing field -----------------------------------------------------------------------------------
    if (lvl.kind === 'grow') {
      speedAt = (p) => 25 + 85 * Math.sqrt(Math.max(0, p.x) / W);
      const netIn = field('Net flux through the cube in N m²/C', 'Φ = ? N m²/C');
      const run = () => {
        if (finished) return;
        const v = num(netIn);
        if (v === null) return freeNote('Enter the net flux in N m²/C.');
        const res = judgeGrow(lvl, v);
        verdict(res.ok);
        if (res.ok) return succeed(`The net flux is ${fmt(lvl.net)} N m²/C, and it is not zero.`);
        miss(`Your value is too ${res.verdict === 'too-big' ? 'large' : 'small'}. Remember there is flux through two faces, one out and one in.`);
      };
      netIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Net flux'), netIn, h('span', { class: 'unit' }, 'N m²/C')), actionBtn('Measure the net flux', 'Measure the net flux', run));
      hint.textContent = `E = ${lvl.alpha}√x (SI units). The cube has side a = ${lvl.a} m, with its near face at x = a and its far face at x = 2a.`;
    }

    for (let i = 0; i < 130; i++) {
      const s = { x: rnd() * W, y: rnd() * H };
      specks.push(s);
    }

    // ---- drawing ------------------------------------------------------------------------------------------------------
    function drawLoop() {
      if (lvl.kind !== 'tilt' && lvl.kind !== 'angle') return;
      if (!gate) return;
      g.strokeStyle = col.text;
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(gate.a.x, gate.a.y);
      g.lineTo(gate.b.x, gate.b.y);
      g.stroke();
      g.lineCap = 'butt';
      const n = { x: Math.cos(rad(theta)), y: -Math.sin(rad(theta)) };
      arrow(C.x, C.y, C.x + n.x * 55, C.y + n.y * 55, col.good, 3);
      label(g, 'n', C.x + n.x * 68, C.y + n.y * 68 + 5, { size: 14, color: col.good });
      // the field direction and the angle between it and the normal
      arrow(40, 30, 110, 30, col.accent, 3);
      label(g, 'E', 125, 35, { size: 14, color: col.accent });
      g.strokeStyle = col.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(C.x, C.y, 32, 0, -rad(theta), theta > 0);
      g.stroke();
      label(g, `θ = ${Math.round(theta)}°`, C.x + 34, C.y - 22, { size: 14, color: col.text });
      const phi = flux(lvl.e, lvl.side * lvl.side, theta);
      meter.textContent = `Φ = ${fmt(phi)} N m²/C`;
    }

    function drawCube() {
      if (lvl.kind !== 'cube') return;
      const s = 150;
      const x0 = C.x - s / 2;
      const y0 = C.y - s / 2;
      g.fillStyle = col.panel;
      g.globalAlpha = 0.55;
      g.fillRect(x0, y0, s, s);
      g.globalAlpha = 1;
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.strokeRect(x0, y0, s, s);
      const faces: [number, number, number, number, number][] = [
        [x0 + s, C.y, 1, 0, 0], // +x
        [x0, C.y, -1, 0, 1], // −x
        [C.x, y0, 0, -1, 2], // +y (up on screen)
        [C.x, y0 + s, 0, 1, 3], // −y
      ];
      for (const [fx, fy, nx, ny, i] of faces) {
        arrow(fx, fy, fx + nx * 34, fy + ny * 34, col.muted, 2);
        const st = faceStates[i];
        label(g, `${FACES[i]}`, fx + nx * 50, fy + ny * 50 + 5, { size: 13, color: col.text });
        if (st !== null) {
          const color = st === 1 ? '#c0392b' : st === -1 ? '#3156d3' : col.muted;
          g.strokeStyle = color;
          g.lineWidth = 6;
          g.beginPath();
          if (nx !== 0) {
            g.moveTo(fx, y0);
            g.lineTo(fx, y0 + s);
          } else {
            g.moveTo(x0, fy);
            g.lineTo(x0 + s, fy);
          }
          g.stroke();
          label(g, st === 1 ? '+' : st === -1 ? '−' : '0', fx - nx * 14, fy - ny * 14 + 5, { size: 18, color });
        }
      }
      label(g, '±z faces: towards and away from you', C.x, H - 14, { size: 12, bold: false, color: col.muted });
      const z = [4, 5].map((i) => faceStates[i]);
      if (z.some((v) => v !== null)) label(g, `+z: ${z[0] === null ? '?' : z[0] === 0 ? '0' : z[0] === 1 ? '+' : '−'}   −z: ${z[1] === null ? '?' : z[1] === 0 ? '0' : z[1] === 1 ? '+' : '−'}`, C.x, H - 32, { size: 13, color: col.text });
    }

    function drawGrow() {
      if (lvl.kind !== 'grow') return;
      const near = 250;
      const far = 390;
      g.fillStyle = col.panel;
      g.globalAlpha = 0.55;
      g.fillRect(near, C.y - 70, far - near, 140);
      g.globalAlpha = 1;
      g.strokeStyle = col.text;
      g.lineWidth = 3;
      g.strokeRect(near, C.y - 70, far - near, 140);
      for (const x of [near, far]) {
        const E = Math.sqrt(x / W);
        const reveal = verdictAt !== null ? 1 : 0.0;
        arrow(x - 40 * E - 20, C.y, x - 20, C.y, col.good, 3);
        arrow(x + 12, C.y - 40, x + 12 + 50 * E, C.y - 40, col.good, 3);
        void reveal;
      }
      label(g, 'E here', near - 30, C.y + 92, { size: 12, bold: false, color: col.muted });
      label(g, 'near face (x = a)', near, C.y + 100, { size: 12, color: col.text });
      label(g, 'far face (x = 2a)', far, C.y + 100, { size: 12, color: col.text });
      label(g, 'the field grows along +x: longer arrows, faster specks', C.x, 22, { size: 13, bold: false, color: col.muted });
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      if (turn) {
        turn.t += dt;
        const k = ease(Math.min(1, turn.t / REVEAL));
        theta = turn.from + (turn.to - turn.from) * k;
        placeGate();
        if (turn.t >= REVEAL) {
          theta = turn.to;
          placeGate();
          turn = null;
          finishTurn?.();
        }
      } else if (lvl.kind === 'tilt') {
        placeGate();
      }
      moveSpecks(dt);
      g.clearRect(0, 0, W, H);
      drawSpecks();
      drawLoop();
      drawCube();
      drawGrow();
      if (verdictAt !== null && clock - verdictAt < REVEAL) {
        g.strokeStyle = verdictOk ? col.good : col.bad;
        g.lineWidth = 6;
        g.globalAlpha = 1 - (clock - verdictAt) / REVEAL;
        g.strokeRect(3, 3, W - 6, H - 6);
        g.globalAlpha = 1;
      }
      const phase = turn ? 'testing' : verdictAt === null ? 'idle' : clock - verdictAt < REVEAL ? 'testing' : 'done';
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
