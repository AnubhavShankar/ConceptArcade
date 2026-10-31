// Inspirations (code comment only): water-park slides and inspection games (find every fault before opening) and Minesweeper flags (mark exactly the
// right spots). Marlo the lifeguard inspects a tube slide joint by joint. The tube drawn on screen is one fixed decorative S-curve, never the graph of f:
// the formula on the blueprint sign is the evidence, and the zoom magnifier (live in round 1, a drone for 1.5 s in round 2, never in round 3) is the
// only place the true shape of f appears. A fault animation shows only the one joint the player got wrong.
import { PAL, createArcade } from '@core/arcade';
import { defineGame } from '@core/define';
import { pointerToLocal } from '@core/sim';
import type { GameContext } from '@core/types';
import {
  EXIT, MARLO, goalLine, roundTint, tapCue, crew, drone, duck, duckPose, jointPoint, jointRing, faultFx, marlo, pillars, scenery, sign, splashRing, stars, tube, zoomLens,
  type DuckPose,
} from './art';
import {
  buildRounds, complete, faultText, firstFault, flagText, hintLine, jointAria, jointTime, judge, missText, nextFlag, verdictTime, winText, zoomText, zoomWindow,
  type Fault, type Flag, type Level,
} from './logic';

const ROLE = 'a lifeguard who inspects a new tube slide joint by joint before the park opens';
const STORY = [
  'The blueprint gives the slide as a function f(x) in pieces, and the slide is enclosed, so only the formula can tell where it is broken. At each joint, the end of the piece on the left, the start of the piece on the right and the value there must all agree. If they do not, the slide has a gap there.',
  'Now a joined joint can still hide a kink: the two pieces meet, but at different slopes. A kink is a fault too. Flag each joint fine, kink or gap.',
  'These slides are made with the greatest integer [x] and with moduli like |cos x|. [x] steps at every integer. A modulus folds the slide where the inside changes sign, but not at a peak.',
  'The chief inspector’s slides mix pieces, [x] and moduli. Some joints are traps that look broken but are smooth.',
];
const OBJECTIVE = [
  'Flag every joint as joined or gap so the test duck rides the slide to the pool, in three rounds.',
  'Flag every joint correctly, in three rounds.',
  'Flag every joint correctly, in three rounds.',
  'Flag every joint correctly, in three rounds.',
];
const ARIA = 'A water-park tube slide with numbered joints between a lifeguard on the top deck and a splash pool, a rubber test duck waiting at the top, and a blueprint sign with the formula.';
export const GOAL = 'Goal: flag every joint, then send the duck';
const TWEET = { x: MARLO.x + 24, y: MARLO.y - 80 };

interface Shot {
  flags: Flag[];
  ok: boolean;
  fault: Fault | null;
  fx: { tweet: boolean; verdict: boolean; landed: boolean; spray: number };
}

function mountLevel(ctx: GameContext, level: Level) {
  const rounds = buildRounds(level, ctx.random);
  const flags: Flag[] = [null, null, null, null];
  let last = -1;
  let seenRound = -1;
  let roundT0 = 0;
  let zoom: { joint: number; until: number } | null = null;
  let shot: Shot | null = null;
  const buttons: HTMLButtonElement[] = [];

  const A = createArcade(ctx, { name: 'Marlo', role: ROLE, story: STORY[level - 1], objective: OBJECTIVE[level - 1] }, {
    W: 640,
    H: 340,
    aria: ARIA,
    rounds: 3,
    charges: [1, 1, 0],
    onRound: (k) => {
      flags.fill(null);
      last = -1;
      zoom = null;
      shot = null;
      const r = rounds[k];
      buttons.forEach((b, i) => {
        b.hidden = i >= r.joints.length;
        if (i < r.joints.length) b.setAttribute('aria-label', jointAria(r.joints[i]));
        refresh(i);
      });
      A.feedback.hidden = true;
      A.hint.textContent = hintLine(r);
    },
  });
  const cur = () => Math.min(A.round, 2);
  function refresh(i: number) {
    const f = flags[i];
    buttons[i].dataset.flag = f ?? 'none';
    const label = flagText(level, f);
    buttons[i].textContent = label;
    buttons[i].title = label;
  }
  const tap = (i: number) => {
    if (A.phase !== 'play' || i >= rounds[cur()].joints.length) return;
    flags[i] = nextFlag(level, flags[i]);
    last = i;
    A.sound('blip');
    refresh(i);
  };

  const holder = document.createElement('div');
  holder.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:4px;max-width:420px;margin:8px auto';
  for (let i = 0; i < 4; i++) {
    const b = A.button('?', `Joint ${i + 1}`, () => tap(i), 'small');
    b.dataset.joint = String(i);
    b.dataset.flag = 'none';
    buttons.push(b);
    holder.append(b);
  }
  A.controls.append(holder);
  A.canvas.addEventListener('pointerdown', (e) => {
    if (A.phase !== 'play') return;
    const p = pointerToLocal(e, A.canvas, 640, 340);
    const n = rounds[cur()].joints.length;
    for (let i = 0; i < n; i++) {
      const [x, y] = jointPoint(i, n);
      if (Math.hypot(p.x - x, p.y - y) <= 22) {
        tap(i);
        return;
      }
    }
  });
  A.controls.append(
    A.button('🔍 Zoom drone', 'Zoom drone: a close-up of the joint you last tapped', () => {
      const r = rounds[cur()];
      if (last < 0) {
        A.freeNote('Tap a joint first, then send the zoom drone.');
        return;
      }
      if (r.assist === 0) {
        A.freeNote('Round 1: the zoom already shows the joint you last tapped.');
        return;
      }
      if (!A.spend()) return;
      zoom = { joint: last, until: A.clock + 1.5 };
      A.say(zoomText(r, last), true);
    }, 'secondary'),
    A.button('🦆 Send the duck', 'Send the test duck', () => {
      const r = rounds[cur()];
      const n = r.joints.length;
      const used = flags.slice(0, n);
      if (!complete(used, n)) {
        A.freeNote('Flag every joint first.');
        return;
      }
      const ok = judge(r, used);
      const fault = ok ? null : firstFault(r, used);
      shot = { flags: used, ok, fault, fx: { tweet: false, verdict: false, landed: false, spray: 0 } };
      const [jx, jy] = fault ? jointPoint(fault.joint, n) : [EXIT[0], EXIT[1] - 10];
      A.resolve(ok, ok ? winText(r) : missText(r, used), { x: jx, y: jy }, verdictTime(r, fault));
    }),
  );

  A.scene((g, t) => {
    if (A.phase === 'between') return;
    const r = rounds[cur()];
    const n = r.joints.length;
    const run = A.phase === 'resolve' ? shot : null;
    const rt = run ? A.rt : 0;
    const shown = run ? run.flags : flags;
    const fault = run?.fault ?? null;

    if (cur() !== seenRound) {
      seenRound = cur();
      roundT0 = t;
    }
    scenery(g, t);
    roundTint(g, cur(), t);
    pillars(g);
    tube(g);
    for (let i = 0; i < n; i++) jointRing(g, i, n, r.joints[i].cText, shown[i] ?? null, level, !run && i === last, t);
    sign(g, r);
    if (!run) goalLine(g, GOAL, 200, 22, t - roundT0);
    if (!run && level === 1 && cur() === 0 && last < 0) {
      const [cx, cy] = jointPoint(0, n);
      tapCue(g, cx, cy, t);
    }
    if (run) {
      for (let i = 0; i < n; i++) {
        const f = run.flags[i];
        if (f === 'gap' || f === 'kink') {
          const [x, y] = jointPoint(i, n);
          crew(g, x, y, f, rt, t);
        }
      }
    }

    // Sir Quacks
    let pose: DuckPose = duckPose(r, null, 0);
    if (run) pose = duckPose(r, fault, rt);
    else pose = { ...pose, y: pose.y + Math.sin(t * 3) * 1.2 };
    if (run) {
      if (!run.fx.tweet) {
        run.fx.tweet = true;
        A.float('TWEET!', TWEET.x, TWEET.y, PAL.white);
      }
      if (pose.state === 'ride' && A.clock - run.fx.spray > 0.07) {
        run.fx.spray = A.clock;
        A.burst(pose.x, pose.y + 8, PAL.cyan, 2, 60);
      }
      if (!fault && pose.landedAt !== null && rt >= pose.landedAt && !run.fx.landed) {
        run.fx.landed = true;
        A.burst(pose.x, 300, PAL.cyan, 26, 180);
      }
      if (fault && pose.state === 'stuck' && !run.fx.landed) {
        run.fx.landed = true;
        A.burst(pose.x, pose.y, PAL.dim, 12, 90);
      }
      const vt = verdictTime(r, fault);
      if (rt >= vt && !run.fx.verdict) {
        run.fx.verdict = true;
        if (!fault) A.float('SLIDE APPROVED!', 250, 76, PAL.green);
      }
    }
    if (pose.state === 'float' && !fault && pose.landedAt !== null) splashRing(g, pose.x, pose.y, rt - pose.landedAt);
    duck(g, pose.x, pose.y, pose.ang, 0.78, t, pose.mood);
    if (pose.state === 'float' && !fault) {
      g.fillStyle = 'rgba(27,121,176,0.65)';
      g.beginPath();
      g.ellipse(pose.x, pose.y + 9, 19, 5, 0, 0, Math.PI * 2);
      g.fill();
    }
    if (pose.state === 'stuck') stars(g, pose.x + 8, pose.y - 24, t);
    // the one fault marker: where the first wrong joint is, the same for every kind of fault
    if (run && fault) {
      const [x, y] = jointPoint(fault.joint, n);
      faultFx(g, x, y, rt - jointTime(r, fault.joint), faultText(r, fault.joint));
    }

    // Marlo
    let mood: 'happy' | 'worried' | 'cheer' | 'facepalm' = 'happy';
    let blow = false;
    if (run) {
      const vt = verdictTime(r, fault);
      blow = rt < 0.3;
      if (rt >= vt) mood = !fault ? 'cheer' : 'worried';
    }
    marlo(g, MARLO.x, MARLO.y, t, { mood, blow });

    // the zoom: the only place the true shape of f appears
    let zj = -1;
    if (!run) {
      if (r.assist === 0) zj = last;
      else if (r.assist === 1 && zoom && A.clock < zoom.until) zj = zoom.joint;
    }
    if (!run && (r.assist === 0 || zj >= 0)) zoomLens(g, zj >= 0 ? zoomWindow(r, zj) : null, zj >= 0 ? r.joints[zj].cText : null);
    if (!run && r.assist === 1 && zj >= 0) {
      const [x, y] = jointPoint(zj, n);
      drone(g, x, y - 46, t);
    }
    A.canvas.dataset.zoom = zj >= 0 ? '1' : '0';
    A.canvas.dataset.zoomJoint = String(zj);
    A.canvas.dataset.fault = fault ? `joint:${fault.joint}` : '';
    A.canvas.dataset.duck = run ? `${pose.state}:${Math.round(pose.x)},${Math.round(pose.y)}` : '';
    A.canvas.dataset.crew = run ? run.flags.map((f, i) => (f === 'gap' || f === 'kink' ? `${i}:${f}` : '')).filter(Boolean).join(',') : '';
  });
  A.mountAll();
  return A.run();
}

export default defineGame({
  mount(ctx) {
    return mountLevel(ctx, Math.max(1, Math.min(4, ctx.level)) as Level);
  },
});
