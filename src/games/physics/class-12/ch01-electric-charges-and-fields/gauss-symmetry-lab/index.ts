import { defineGame } from '@core/define';
import { disc, label, themeColors } from '@core/draw';
import { h } from '@core/dom';
import { parseNumber } from '@core/quiz';
import { fitCanvas, startLoop } from '@core/sim';
import { buildLevel, DIST_NAME, explainSolution, fmt, judgeFindQ, judgeLine, judgePick, judgeShell, judgeSheet, starsFor, SURFACE_NAME, WHY, type Dir, type Dist, type Fall, type Region, type Same, type Surface, type YesNo } from './logic';

const W = 640;
const H = 340;
const POS = '#c0392b';
const NEG = '#3156d3';
const REVEAL = 0.9;
const C = { x: W / 2, y: H / 2 };

interface Speck {
  x: number;
  y: number;
  age: number;
  life: number;
}

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
    let round = 0;
    let candidate: Surface | null = null;

    // ---- DOM --------------------------------------------------------------------------------
    const canvas = h('canvas', { role: 'img', 'aria-label': 'A charge distribution with specks drifting along its electric field, and the surfaces or probes used to study it.' });
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
    const choiceGroup = <T extends string>(name: string, options: [T, string, string][], on?: (v: T) => void) => {
      let value: T | null = null;
      const buttons = options.map(([v, text, aria]) => h('button', { class: 'btn secondary small', type: 'button', 'aria-pressed': 'false', 'aria-label': aria, onclick: () => {
        value = v;
        buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === v)));
        on?.(v);
      } }, text));
      return { get: () => value, reset: () => { value = null; buttons.forEach((b) => b.setAttribute('aria-pressed', 'false')); }, box: h('div', { class: 'route-group' }, h('strong', null, name), ...buttons) };
    };

    // ---- drifting specks that show the field ---------------------------------------------------------------
    type Kind = 'point' | 'line' | 'sheet' | 'shell' | 'plates';
    let kind: Kind = 'point';
    let shellR = 90; // px
    let shellSign = 1;
    const specks: Speck[] = Array.from({ length: 120 }, () => ({ x: rnd() * W, y: rnd() * H, age: rnd() * 3, life: 2 + rnd() * 3 }));
    /** Velocity (px/s) of the specks at a point, for each kind of charge distribution. */
    function velocity(p: Speck): { x: number; y: number } {
      if (kind === 'point' || kind === 'shell') {
        const dx = p.x - C.x;
        const dy = p.y - C.y;
        const r = Math.hypot(dx, dy) || 1;
        if (kind === 'shell' && r < shellR) return { x: 0, y: 0 };
        const speed = Math.min(90, 3500 / (r * Math.max(1, r / 60)));
        return { x: (shellSign * dx * speed) / r, y: (shellSign * dy * speed) / r };
      }
      if (kind === 'line') {
        const dx = p.x - C.x;
        const speed = Math.min(90, 2600 / Math.max(30, Math.abs(dx)));
        return { x: Math.sign(dx || 1) * speed, y: 0 };
      }
      if (kind === 'sheet') return { x: Math.sign(p.x - C.x || 1) * 55, y: 0 };
      // plates: from the + plate on the left to the − plate on the right, nothing outside
      return p.x > C.x - 100 && p.x < C.x + 100 ? { x: 70, y: 0 } : { x: 0, y: 0 };
    }
    function moveSpecks(dt: number) {
      for (const s of specks) {
        s.age += dt;
        const v = velocity(s);
        s.x += v.x * dt;
        s.y += v.y * dt;
        const stalled = v.x === 0 && v.y === 0 && s.age > 0.4;
        if (s.age > s.life || stalled || s.x < -4 || s.x > W + 4 || s.y < -4 || s.y > H + 4) {
          if (kind === 'point' || kind === 'shell') {
            const a = rnd() * Math.PI * 2;
            const r0 = (kind === 'shell' ? shellR : 20) + 3;
            s.x = C.x + Math.cos(a) * r0;
            s.y = C.y + Math.sin(a) * r0;
          } else if (kind === 'plates') {
            s.x = C.x - 98 + rnd() * 12;
            s.y = 30 + rnd() * (H - 60);
          } else {
            s.x = C.x + (rnd() < 0.5 ? -1 : 1) * (12 + rnd() * 6);
            s.y = 20 + rnd() * (H - 40);
          }
          s.age = 0;
          s.life = 2 + rnd() * 3;
        }
      }
    }
    function drawSpecks() {
      g.fillStyle = col.accent;
      g.strokeStyle = col.accent;
      g.lineWidth = 1.8;
      for (const s of specks) {
        const v = velocity(s);
        const m = Math.hypot(v.x, v.y);
        if (m === 0) continue;
        g.globalAlpha = Math.max(0, Math.min(1, s.age / 0.5, (s.life - s.age) / 0.5)) * 0.75;
        g.beginPath();
        g.moveTo(s.x, s.y);
        g.lineTo(s.x - (v.x / m) * 8, s.y - (v.y / m) * 8);
        g.stroke();
        g.beginPath();
        g.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    const drawSource = () => {
      g.lineWidth = 3;
      if (kind === 'point') {
        disc(g, C.x, C.y, 14, POS, '#ffffff', 2);
        label(g, '+', C.x, C.y + 6, { size: 18, color: '#ffffff' });
      } else if (kind === 'line') {
        g.strokeStyle = POS;
        g.beginPath();
        g.moveTo(C.x, 14);
        g.lineTo(C.x, H - 14);
        g.stroke();
        label(g, 'wire', C.x + 22, 26, { size: 12, bold: false, color: col.muted });
      } else if (kind === 'sheet') {
        g.strokeStyle = shellSign > 0 ? POS : NEG;
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(C.x, 14);
        g.lineTo(C.x, H - 14);
        g.stroke();
        label(g, 'sheet', C.x + 28, 26, { size: 12, bold: false, color: col.muted });
      } else if (kind === 'shell') {
        g.strokeStyle = shellSign > 0 ? POS : NEG;
        g.lineWidth = 5;
        g.beginPath();
        g.arc(C.x, C.y, shellR, 0, Math.PI * 2);
        g.stroke();
      } else {
        for (const [x, c, t] of [[C.x - 100, POS, '+σ'], [C.x + 100, NEG, '−σ']] as const) {
          g.strokeStyle = c;
          g.lineWidth = 8;
          g.beginPath();
          g.moveTo(x, 24);
          g.lineTo(x, H - 24);
          g.stroke();
          label(g, t, x, 16, { size: 14, color: c });
        }
      }
    };

    let onTick: (() => void) | null = null;

    // ---- level 1: pick the surface --------------------------------------------------------------------------
    if (lvl.kind === 'pick') {
      const surf = choiceGroup<Surface>('The Gaussian surface should be…', (Object.keys(SURFACE_NAME) as Surface[]).map((s) => [s, SURFACE_NAME[s], SURFACE_NAME[s]]), (v) => (candidate = v));
      const roundLabel = h('p', { class: 'muted' });
      const paintRound = () => (roundLabel.textContent = `Round ${round + 1} of ${lvl.rounds.length}: ${DIST_NAME[lvl.rounds[round]][0].toUpperCase()}${DIST_NAME[lvl.rounds[round]].slice(1)}.`);
      const setKind = () => {
        const d: Dist = lvl.rounds[round];
        kind = d === 'point' ? 'point' : d === 'line' ? 'line' : d === 'sheet' ? 'sheet' : 'shell';
        shellR = 55;
      };
      setKind();
      paintRound();
      const run = () => {
        if (finished || advancing) return;
        if (!candidate) return freeNote('Choose a surface first.');
        const d = lvl.rounds[round];
        const res = judgePick(d, candidate);
        verdict(res.ok);
        if (!res.ok) return miss('That surface does not make the field constant and perpendicular to it. Think about the symmetry of the charge.');
        say(`Right. ${WHY[d]}`, true);
        advancing = true;
        advanceAt = clock + REVEAL + 0.2;
      };
      let advancing = false;
      let advanceAt = 0;
      onTick = () => {
        if (advancing && clock >= advanceAt) {
          advancing = false;
          if (round + 1 >= lvl.rounds.length) return succeed('All three surfaces chosen correctly.');
          round++;
          candidate = null;
          surf.reset();
          setKind();
          paintRound();
        }
      };
      controls.append(roundLabel, surf.box, actionBtn('Check this surface', 'Check this surface', run));
      hint.textContent = 'A good Gaussian surface is one where the field is perpendicular to the surface and the same size everywhere on it (or parallel to it, with no flux).';
    }
    // ---- level 2: the line --------------------------------------------------------------------------------------------
    if (lvl.kind === 'line') {
      kind = 'line';
      const lamIn = field('Charge per unit length in µC/m', 'λ = ? µC/m');
      const fall = choiceGroup<Fall>('At twice the distance the field is…', [['1/2', '½ as big', 'Field at twice the distance is 1/2'], ['1/4', '¼ as big', 'Field at twice the distance is 1/4'], ['1/8', '⅛ as big', 'Field at twice the distance is 1/8']]);
      const run = () => {
        if (finished) return;
        const lam = num(lamIn);
        if (lam === null || lam <= 0) return freeNote('Enter the charge per unit length as a positive number of µC/m.');
        if (!fall.get()) return freeNote('Say how the field changes at twice the distance.');
        const res = judgeLine(lvl, lam, fall.get() as Fall);
        verdict(res.ok);
        if (res.ok) return succeed(`λ = ${lvl.lambda} µC/m, and the field falls as 1/r.`);
        const parts: string[] = [];
        if (!res.lambdaOk) parts.push('Your charge per unit length is not right.');
        if (!res.fallOk) parts.push('The field of a long wire does not fall that fast.');
        miss(parts.join(' '));
      };
      lamIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Charge per length'), lamIn, h('span', { class: 'unit' }, 'µC/m')), fall.box, actionBtn('Check the wire', 'Check the wire', run));
      hint.textContent = `A probe ${lvl.r} cm from the wire measures E = ${fmt(lvl.field)} N/C, pointing away from it.`;
    }

    // ---- level 3: sheet or plates ----------------------------------------------------------------------------------------
    if (lvl.kind === 'sheet') {
      kind = lvl.mode === 'sheet' ? 'sheet' : 'plates';
      const aIn = field(lvl.mode === 'sheet' ? 'Field near the sheet in N/C' : 'Field between the plates in N/C', 'E = ? N/C');
      const bIn = field('Field outside the plates in N/C', 'E = ? N/C');
      const same = choiceGroup<Same>('At twice the distance from the sheet the field is…', [['same', 'The same', 'Field at twice the distance is the same'], ['half', 'Half', 'Field at twice the distance is half'], ['double', 'Double', 'Field at twice the distance is double']]);
      const run = () => {
        if (finished) return;
        const a = num(aIn);
        const b = lvl.mode === 'plates' ? num(bIn) : 0;
        if (a === null || b === null) return freeNote('Enter the field strength in N/C (enter 0 where there is no field).');
        if (lvl.mode === 'sheet' && !same.get()) return freeNote('Say how the field changes at twice the distance.');
        const res = judgeSheet(lvl, a, b, same.get() as Same | null);
        verdict(res.ok);
        if (res.ok) return succeed(lvl.mode === 'sheet' ? `E = σ/2ε₀ = ${fmt(lvl.first)} N/C, the same at any distance.` : `Between the plates E = σ/ε₀ = ${fmt(lvl.first)} N/C, and outside E = 0.`);
        const parts: string[] = [];
        if (!res.aOk) parts.push(lvl.mode === 'sheet' ? 'The field near the sheet is not right.' : 'The field between the plates is not right.');
        if (!res.bOk) parts.push(lvl.mode === 'sheet' ? 'That is not how the field of a large sheet changes with distance.' : 'The field outside the plates is not right.');
        miss(parts.join(' '));
      };
      [aIn, bIn].forEach((i) => i.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run()));
      controls.append(
        h('div', { class: 'control' }, h('span', { class: 'control-label' }, lvl.mode === 'sheet' ? 'Field near the sheet' : 'Field between the plates'), aIn, h('span', { class: 'unit' }, 'N/C')),
        ...(lvl.mode === 'sheet' ? [same.box] : [h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Field outside the plates'), bIn, h('span', { class: 'unit' }, 'N/C'))]),
        actionBtn('Check the field', 'Check the field', run),
      );
      hint.textContent = lvl.mode === 'sheet' ? `Surface charge density σ = ${lvl.sigma} µC/m² (a very large sheet).` : `Surface charge densities +σ and −σ with σ = ${lvl.sigma} µC/m² (very large parallel plates).`;
    }

    // ---- levels 4 and 5: the shell -----------------------------------------------------------------------------------------
    let probeR = 0;
    if (lvl.kind === 'shell') {
      kind = 'shell';
      const scale = 3.6;
      shellR = lvl.R * scale;
      shellSign = lvl.q > 0 ? 1 : -1;
      probeR = lvl.r * scale;
      const region = choiceGroup<Region>('The probe is…', [['inside', 'Inside the shell', 'The probe is inside'], ['outside', 'Outside the shell', 'The probe is outside']]);
      const eIn = field('Field at the probe in N/C', 'E = ? N/C');
      const dir = choiceGroup<Dir>('The field there…', [['outward', 'Points outward', 'The field points outward'], ['inward', 'Points inward', 'The field points inward'], ['none', 'There is no field', 'There is no field']]);
      const run = () => {
        if (finished) return;
        const e = num(eIn);
        if (!region.get() || !dir.get()) return freeNote('Say whether the probe is inside or outside, and which way the field points.');
        if (e === null || e < 0) return freeNote('Enter the field strength as a number of N/C (0 if there is none).');
        const res = judgeShell(lvl, region.get() as Region, e, dir.get() as Dir);
        verdict(res.ok);
        if (res.ok) return succeed(lvl.region === 'inside' ? 'No field inside a uniformly charged shell.' : `E = ${fmt(lvl.field)} N/C, pointing ${lvl.dir}.`);
        const parts: string[] = [];
        if (!res.regionOk) parts.push('Compare the probe’s distance with the radius of the shell.');
        if (!res.eOk) parts.push('The field strength is not right.');
        if (!res.dirOk) parts.push('The direction is not right.');
        miss(parts.join(' '));
      };
      eIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(region.box, h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Field strength'), eIn, h('span', { class: 'unit' }, 'N/C')), dir.box, actionBtn('Check the probe', 'Check the probe', run));
      hint.textContent = `The shell has radius ${lvl.R} cm and charge ${lvl.q > 0 ? '+' : '−'}${Math.abs(lvl.q)} nC. The probe is ${lvl.r} cm from the centre.`;
    }
    if (lvl.kind === 'findq') {
      kind = 'shell';
      const scale = 3.6;
      shellR = lvl.R * scale;
      shellSign = lvl.dir === 'outward' ? 1 : -1;
      probeR = lvl.r * scale;
      const qIn = field('Charge on the sphere in nC', 'q = ? nC');
      const radius = choiceGroup<YesNo>('Does the sphere’s radius matter here?', [['yes', 'Yes', 'The radius matters: yes'], ['no', 'No', 'The radius matters: no']]);
      const run = () => {
        if (finished) return;
        const q = num(qIn);
        if (q === null || q === 0) return freeNote('Enter the charge in nC, with a minus sign if it is negative.');
        if (!radius.get()) return freeNote('Say whether the radius of the sphere matters.');
        const res = judgeFindQ(lvl, q, radius.get() as YesNo);
        verdict(res.ok);
        if (res.ok) return succeed(`q = ${fmt(lvl.answer)} nC, and the radius did not matter.`);
        const parts: string[] = [];
        if (!res.qOk) parts.push(Math.sign(q) !== Math.sign(lvl.answer) ? 'Check the sign: which way does the field point?' : 'The size of the charge is not right.');
        if (!res.radiusOk) parts.push('Outside the sphere only the total charge and the distance from the centre matter.');
        miss(parts.join(' '));
      };
      qIn.addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && run());
      controls.append(h('div', { class: 'control' }, h('span', { class: 'control-label' }, 'Charge on the sphere'), qIn, h('span', { class: 'unit' }, 'nC')), radius.box, actionBtn('Check the charge', 'Check the charge', run));
      hint.textContent = `The sphere has radius ${lvl.R} cm. At ${lvl.r} cm from its centre the probe measures E = ${fmt(lvl.field)} N/C, pointing ${lvl.dir}.`;
    }

    // ---- drawing -------------------------------------------------------------------------------------------------------------
    function drawCandidate() {
      if (lvl.kind !== 'pick' || !candidate) return;
      g.strokeStyle = col.good;
      g.lineWidth = 3;
      g.setLineDash([8, 6]);
      g.globalAlpha = 0.9;
      g.beginPath();
      if (candidate === 'sphere') g.arc(C.x, C.y, 120, 0, Math.PI * 2);
      else if (candidate === 'cylinder') g.rect(C.x - 90, C.y - 110, 180, 220);
      else if (candidate === 'pillbox') g.rect(C.x - 55, C.y - 40, 110, 80);
      else if (candidate === 'cube') g.rect(C.x - 100, C.y - 100, 200, 200);
      else for (let i = 0; i <= 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const r = 110 + 30 * Math.sin(a * 3 + clock) + 20 * Math.cos(a * 5);
        if (i === 0) g.moveTo(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r * 0.85);
        else g.lineTo(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r * 0.85);
      }
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      label(g, SURFACE_NAME[candidate], C.x, H - 12, { size: 13, color: col.good });
    }
    function drawProbe() {
      if (lvl.kind !== 'shell' && lvl.kind !== 'findq') return;
      const x = C.x + probeR;
      disc(g, x, C.y, 8, 'rgba(0,0,0,0)', col.text, 2.5);
      label(g, 'probe', x, C.y - 16, { size: 12, bold: false, color: col.muted });
      g.setLineDash([4, 4]);
      g.strokeStyle = col.muted;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(C.x, C.y + 24);
      g.lineTo(x, C.y + 24);
      g.stroke();
      g.setLineDash([]);
      label(g, `${lvl.r} cm`, (C.x + x) / 2, C.y + 42, { size: 12, bold: false, color: col.muted });
      label(g, `R = ${lvl.R} cm`, C.x, C.y - shellR - 8, { size: 12, bold: false, color: col.muted });
      if (lvl.kind === 'findq') {
        const out = lvl.dir === 'outward';
        const y = C.y + 60;
        const x1 = x + (out ? 0 : 38);
        const x2 = x + (out ? 38 : 0);
        const dir = out ? 1 : -1;
        g.strokeStyle = col.good;
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(x1, y);
        g.lineTo(x2, y);
        g.moveTo(x2, y);
        g.lineTo(x2 - dir * 9, y - 6);
        g.moveTo(x2, y);
        g.lineTo(x2 - dir * 9, y + 6);
        g.stroke();
        label(g, `E = ${fmt(lvl.field)} N/C, ${lvl.dir}`, x + 20, C.y + 84, { size: 13, color: col.good });
      }
    }

    ctx.root.append(h('p', null, lvl.story), canvas, hint, controls, feedback, solution);
    return startLoop((dt) => {
      clock += dt;
      onTick?.();
      moveSpecks(dt);
      g.clearRect(0, 0, W, H);
      drawSpecks();
      drawSource();
      drawCandidate();
      drawProbe();
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
