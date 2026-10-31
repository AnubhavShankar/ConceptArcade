// "Line Down" (the rebuilt Resistance Bench). Inspirations (code comment only): treasure-hunt and metal-detector games (drive to the spot and dig), the "where is
// the fault" tension of rescue-sim games, and real line crews' resistance fault location. Kabir, a lineworker, drives a bucket truck along a valley road to the
// kilometre where a short must be (levels 1, 3, 4), to the joint that must be bad (level 2), or turns three colour bands on a burnt resistor (level 5). The art is
// in art.ts, the rules in logic.ts.
// Never leak the answer: the fault (twisted wires, branch) is drawn only on a win; a level 2 miss stops the switch-on pulse at the fixed x 200 and never marks the
// bad joint; the arrow signs have one fixed size and position beside the bucket; the tester screen is the only place a reading appears before a commit (live in
// round 1, for 1.5 s after a tester check in round 2, never in round 3); `hit` is the fixed point (320, 70); every animation ends by 2.35 s.
import { PAL } from '@core/arcade';
import { defineGame } from '@core/define';
import { helperOn, paidFlash } from '@core/aidflash';
import { mountDialLevel, type DialLevel, type DialSpec, type HandleSpec, type SceneInput } from '@core/dialgame';
import { along, text } from '@core/neon';
import {
  BANNER, BANNER5, CARD, KM, LCD, ROWS, SW, TRACE, TRUCK, beam, board, bubble, clamp01, ease, fault as drawFault, hills, idleBeam, jointCards, kabir, kmX, lever, lightning, munni, powerLine, pulse, pump,
  readout, road, room, sign, sky, smoke, substation, swX, swatches, tag, truck, truckGrip, village, wireYAt, type VKind,
} from './art';
import { COL, DIAL, JKM, LCD_OFF, buildRounds, cardText, fault, goalText, hintText, judge, lcdText, meterText, missText, verdictDelay, winText, type Round } from './logic';

const ARIA = 'A valley at night in monsoon rain: a power line on poles runs from a substation to a dark village, with a lineworker’s bucket truck parked on the road below.';
const ROLE = 'a lineworker bringing a valley’s power back through a monsoon night';
const HEROES = [
  {
    story: 'A monsoon storm has blacked out the valley. Kabir’s tester at the substation puts a voltage across the two wires of the line and reads the current. Somewhere the wind has twisted the two wires together, a dead short, so the test current runs out along one wire, through the short and back. R = V/I, and every kilometre of line adds the same resistance.',
    objective: 'Park the bucket truck under the short, by Ohm’s law, in three tries.',
  },
  {
    story: 'The line is up, but one of the eight joints on the health centre’s spur is corroded. The tester has swept each joint from −2 V to +2 V and drawn its trace on a card. A joint that obeys Ohm’s law gives a straight line through the origin: the same V/I at every voltage, either way round. A corroded joint does not.',
    objective: 'Park under the corroded joint and replace it, in three tries.',
  },
  {
    story: 'The school’s line is another wire. R = ρl/A: each wire’s resistance depends on its metal (the resistivity ρ), its length and its cross-section. Work out the ohms per kilometre from the metal and the size, and remember that the test current goes out and back. A wire with half the radius has a quarter of the area.',
    objective: 'Find the short on the school’s line, in three tries.',
  },
  {
    story: 'A landslide has dragged one span of the market line and stretched its wire. Stretched k times at constant volume, a wire is k times longer and has 1/k of its area, so its resistance rises k² times; its resistivity does not change. Away from the landslide this line has 1 Ω of loop resistance per km.',
    objective: 'Find the short on the market line, before or past the landslide, in three tries.',
  },
  {
    story: 'Last job: the village pump. Its controller’s resistor has burnt out, and the circuit label says how many volts it dropped at how many milliamps, so R = V/I. A carbon resistor carries its value in colour bands: two digits, then the power of ten.',
    objective: 'Set the three colour bands so the pump starts, in three tries.',
  },
];

const VILLAGE: VKind[] = ['houses', 'health', 'school', 'market'];
const nearestJoint = (px: number) => {
  let best = 0;
  JKM.forEach((km, i) => {
    if (Math.abs(kmX(km) - px) < Math.abs(kmX(JKM[best]) - px)) best = i;
  });
  return best;
};

function level(n: 1 | 2 | 3 | 4 | 5, random: () => number): DialLevel<Round> {
  const rounds = buildRounds(n, random);
  const flash = paidFlash();
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  let touched = false; // level 1 round 1: the drag cue goes once the truck has moved
  const fx = { shot: null as unknown, done: new Set<string>() };

  /** The top band: round banner, goal line and the tester screen (the only helper). */
  function topBand(s: SceneInput<Round>, screen: string, color: string) {
    const { g, r, k } = s;
    text(g, n === 5 ? BANNER5[k] : BANNER[k], 12, 20, PAL.yellow, 11, 'left');
    text(g, goalText(r), 320, 20, PAL.white, 13);
    g.fillStyle = '#000000';
    g.fillRect(LCD.x, LCD.y, LCD.w, LCD.h);
    g.strokeStyle = '#3a4458';
    g.lineWidth = 1;
    g.strokeRect(LCD.x, LCD.y, LCD.w, LCD.h);
    text(g, screen, LCD.x + LCD.w / 2, LCD.y + 16, color, screen.length > 30 ? 11 : 12);
  }

  function draw(s: SceneInput<Round>) {
    const { g, r, k, t, rt, shot, A, v } = s;
    if (fx.shot !== shot) {
      fx.shot = shot;
      fx.done.clear();
    }
    const once = (key: string, fn: () => void) => {
      if (!fx.done.has(key)) {
        fx.done.add(key);
        fn();
      }
    };
    // the tester screen: the only place a reading shows before a commit
    const since = flash.since(t, k);
    const won = shot !== null && shot.ok;
    const missed = shot !== null && !shot.ok;
    const live = helperOn(r.assist, won, missed ? Infinity : since);
    A.canvas.dataset.lcd = live ? '1' : '0';
    const screen = live ? lcdText(r, v) : LCD_OFF;
    const screenColor = r.assist === 0 ? PAL.green : PAL.yellow;
    const delay = verdictDelay(r);
    const landed = shot !== null && rt >= delay;
    const win = landed && won;
    const miss = landed && missed;
    const f = shot ? fault(r, shot.v) : null;
    if (shot) A.canvas.dataset.take = shot.ok ? 'win' : (f ?? 'miss');
    else delete A.canvas.dataset.take;

    if (n === 5) {
      pumpHouse();
      return;
    }
    valley();

    // ---- levels 1 to 4: the valley ----
    function valley() {
      const two = n === 2;
      const x = two ? kmX(JKM[v.j - 1]) : kmX(v.d);
      if (!touched && n === 1 && k === 0 && v.d !== DIAL.d.start) touched = true;
      const tripped = two && miss;
      // the village lights one house (two windows) at a time, 0.08 s apart, from 1.9 s
      const lit = win && rt >= 1.9 ? Math.min(10, 2 * (Math.floor((rt - 1.9) / 0.08) + 1)) : 0;

      sky(g, k, t, calm);
      hills(g);
      substation(g, t, tripped);
      village(g, VILLAGE[n - 1], lit, t);
      powerLine(g, r.kind === 'slide' ? r.a : undefined);
      if (r.kind === 'wire' && r.half) tag(g, 'half the radius →', kmX(r.s!), 136, 'center', PAL.white, 11);
      if (r.kind === 'slide') sign(g, `stretched × ${r.k}`, kmX(r.a + 0.5), 122, 110, 20, 12, PAL.white);

      // the take: the bucket, Kabir, the verdict
      const sleeve = (() => {
        if (!two || !shot) return null;
        return { j: v.j, state: (rt < 0.65 ? 'old' : rt < 0.95 ? 'gone' : 'new') as 'old' | 'gone' | 'new' };
      })();
      if (r.kind === 'joint') jointCards(g, r, sleeve);
      road(g);

      const lowerAt = shot && !shot.ok ? 1.6 : 1.95;
      const up = shot ? ease((rt - 0.15) / 0.45) * (1 - ease((rt - lowerAt) / 0.45)) : 0;
      const bucket: [number, number] | null = up > 0 ? [x + 10 + 12 * Math.sin(up * Math.PI), 262 - 90 * up] : null;
      const beacon = shot ? calm || Math.floor(rt * 4) % 2 === 0 : false;
      truck(g, x, TRUCK.y, { wheel: x / 6, beacon, cab: shot ? null : 'happy', t, boom: bucket, folded: !bucket });

      if (shot) {
        once('roger', () => A.float('ROGER', x, 232, PAL.white));
        const mood = win ? (rt >= 1.4 || two ? 'cheer' : 'happy') : miss ? 'worried' : 'happy';
        const squint = rt >= 0.6 && !landed;
        if (rt < 0.15) kabir(g, x - 16 + 26 * (rt / 0.15), 269, { t, mood: 'happy' });
        else if (bucket) {
          const [bx, by] = bucket;
          const hooking = !two && win && rt >= 0.95 && rt < 1.4;
          const stick = hooking ? 2.85 + 0.25 * Math.sin((rt - 0.95) * 20) : win && rt >= 1.4 ? null : miss ? 0.1 : 0.35;
          kabir(g, bx, by + 7, { t, mood, squint, hand: hooking ? [10, -6] : [8, -4], stick, fist: win && rt >= 1.4 });
          g.fillStyle = '#e6b800';
          g.fillRect(bx - 8, by + 4, 16, 6);
        }

        // the headlamp beam: it sweeps along the wires (levels 1, 3, 4) or rests on the sleeve (level 2)
        if (bucket && rt >= 0.6) {
          const [bx, by] = bucket;
          const end = two ? 1.45 : win ? 1.4 : 1.6;
          const a = 0.25 * (1 - clamp01((rt - end) / 0.2));
          const sweep = two ? x : rt < 0.9 ? x - 40 + 100 * ease((rt - 0.6) / 0.3) : x + 60 - 38 * ease((rt - 0.9) / 0.15);
          if (a > 0) beam(g, bx + 2, by - 28, sweep, a);
        }

        if (two) {
          // level 2: cut the old sleeve, clamp a new one, switch on
          if (rt >= 0.65) {
            once('snip', () => {
              A.float('snip', x, 128, PAL.white);
              A.burst(x, wireYAt(x, 0), PAL.yellow, 14, 120);
            });
          }
          if (rt >= 1.0 && rt < 1.45) pulse(g, 60 + 140 * ((rt - 1.0) / 0.45));
          if (win && rt < 1.9) pulse(g, 200 + 388 * ((rt - 1.45) / 0.45));
          if (miss) once('trip', () => {
            A.float('TRIP', 40, 186, PAL.red);
            A.shake(4);
          });
        } else {
          if (win) {
            once('found', () => {
              A.burst(x + 22, 160, PAL.yellow, 24, 160);
              A.float('FOUND IT!', x, 128, PAL.yellow);
            });
            drawFault(g, x + 22, (rt - 1.05) / 0.35);
            if (rt >= 1.4 && rt < 1.9) pulse(g, 60 + 528 * ease((rt - 1.4) / 0.5));
          }
          if (miss && f) {
            const sx = Math.min(600, Math.max(40, x + 58));
            sign(g, f === 'near' ? '→ farther' : '← back', sx, 132, 70, 20, 12, PAL.yellow);
            if (bucket) bubble(g, 'Line clear here', Math.min(574, Math.max(66, bucket[0])), bucket[1] - 50);
          }
        }
        if (win && rt >= 1.9) once('yay', () => A.float('YAY!', 600, 186, PAL.yellow));
      } else {
        idleBeam(g, x - 13, TRUCK.y - 17, t, calm);
      }

      // Munni at the village end
      const mood = win && rt >= 1.9 ? 'win' : miss ? 'miss' : 'idle';
      munni(g, 612, 262, { t, mood, u: rt - 1.9 });
      if (miss) bubble(g, 'still dark…', 585, 222);

      // the line card (the given facts), the top band, the player's own setting beside its handle
      const card = cardText(r);
      if (card) {
        g.fillStyle = '#0b1030';
        g.fillRect(CARD.x, CARD.y, CARD.w, CARD.h);
        g.strokeStyle = '#3a4458';
        g.lineWidth = 1;
        g.strokeRect(CARD.x, CARD.y, CARD.w, CARD.h);
        text(g, card, 20, 52, PAL.white, 12, 'left');
      }
      topBand(s, screen, screenColor);
      readout(g, two ? `J${v.j}` : `${v.d} km`, x, 332);
      if (!shot) truckGrip(g, x, n === 1 && k === 0 && !touched, t, calm);
      lightning(g, k, t, calm);
    }

    // ---- level 5: the pump house ----
    function pumpHouse() {
      const b: [number, number, number] = [v.b1, v.b2, v.m];
      const low = landed && f === 'low';
      const high = landed && f === 'high';
      room(g, k, t, calm);
      board(g, { b, drop: shot ? 6 * ease(rt / 0.3) : 0, ledRed: low, relayOn: win, fuse: low ? 'blown' : 'ok' });
      swatches(g, b, !shot);
      tag(g, `${COL[v.b1]} · ${COL[v.b2]} · ${COL[v.m]}`, 320, 188, 'center', PAL.yellow, 12);
      const deg = shot ? -30 + 70 * clamp01((rt - 0.3) / 0.15) : -30;
      lever(g, deg);
      const fill = win ? 0.85 * ease((rt - 0.65) / 1.2) : 0;
      pump(g, win ? (rt - 0.65) * 14 : 0, fill, win && rt >= 1.85);

      // Kabir kneels at the left with his field kit; Munni waits at the pump-house door
      g.fillStyle = '#c33';
      g.fillRect(96, 306, 20, 10);
      g.fillStyle = '#f2f4f8';
      g.fillRect(104, 309, 4, 4);
      const hand: [number, number] = !shot ? [4, 12] : rt < 0.3 ? [16, -10] : [14, -24];
      kabir(g, 70, 316, { t, mood: win ? 'cheer' : low ? 'worried' : 'happy', kneel: true, hand: high ? undefined : hand, scratch: high, fist: win, squint: false });
      idleBeam(g, 76, 274, t, calm);
      munni(g, 606, 330, { t, mood: win ? 'win' : landed ? 'miss' : 'idle', u: rt - 0.65 });
      if (landed && !win) bubble(g, 'still dry…', 560, 292);
      topBand(s, screen, screenColor);

      if (shot) {
        once('click', () => A.float('CLICK', 320, 92, PAL.white));
        if (rt >= 0.3) once('clunk', () => A.float('CLUNK', 130, 210, PAL.white));
        if (rt >= 0.3 && rt < 0.6) {
          const p = (rt - 0.3) / 0.3;
          for (let i = 0; i < 5; i++) {
            const fi = p * 1.3 - i * 0.12;
            if (fi > 0 && fi < 1) {
              const [px, py] = along(TRACE, fi);
              g.fillStyle = PAL.yellow;
              g.beginPath();
              g.arc(px, py, 3, 0, Math.PI * 2);
              g.fill();
            }
          }
        }
        if (win) {
          once('relay', () => {
            A.float('CLICK', 440, 118, PAL.white);
            A.float('WHOOSH', 590, 96, PAL.cyan);
            A.float('YAY!', 590, 250, PAL.yellow);
          });
        }
        if (low) {
          once('pop', () => {
            A.burst(440, 84, PAL.yellow, 22, 150);
            A.float('POP', 440, 62, PAL.red);
          });
          if (rt < 2.3) smoke(g, 440, 84, rt - 0.65, 6);
        }
        if (high) bubble(g, '…', 490, 138);
      }
    }
  }

  const dials: DialSpec<Round>[] = [];
  const handles: HandleSpec<Round>[] = [];
  if (n === 1 || n === 3 || n === 4) {
    dials.push({ key: 'd', aria: 'Where to park the bucket truck, in kilometres from the substation', label: 'Truck at', unit: 'km', ...DIAL.d });
    handles.push({ dial: 'd', at: (_r, v) => [kmX(v.d), TRUCK.y], drag: (_r, px) => (px - KM.x0) / KM.px, radius: 22 });
  } else if (n === 2) {
    dials.push({ key: 'j', aria: 'Which joint to park under, 1 to 8', label: 'Joint', unit: '', ...DIAL.j, text: (x) => `J${x}` });
    handles.push({ dial: 'j', at: (_r, v) => [kmX(JKM[v.j - 1]), TRUCK.y], drag: (_r, px) => 1 + nearestJoint(px), radius: 22 });
  } else {
    dials.push(
      { key: 'b1', aria: 'First colour band', label: 'Band 1', unit: '', ...DIAL.b1, text: (x) => COL[x] },
      { key: 'b2', aria: 'Second colour band', label: 'Band 2', unit: '', ...DIAL.b2, text: (x) => COL[x] },
      { key: 'm', aria: 'Multiplier band, the power of ten', label: 'Multiplier', unit: '', ...DIAL.m, text: (x) => COL[x] },
    );
    handles.push(
      { dial: 'b1', at: (_r, v) => [swX(v.b1 - 1), ROWS[0]], drag: (_r, px) => 1 + Math.round((px - SW.x0 - SW.w / 2) / SW.step), radius: 18 },
      { dial: 'b2', at: (_r, v) => [swX(v.b2), ROWS[1]], drag: (_r, px) => Math.round((px - SW.x0 - SW.w / 2) / SW.step), radius: 18 },
      { dial: 'm', at: (_r, v) => [swX(v.m), ROWS[2]], drag: (_r, px) => Math.round((px - SW.x0 - SW.w / 2) / SW.step), radius: 18 },
    );
  }

  return {
    hero: { name: 'Kabir', role: ROLE, ...HEROES[n - 1] },
    rounds,
    charges: [1, 1, 0],
    dials,
    handles,
    test: {
      button: '🔎 Tester check',
      aria: 'Tester check: read the tester for this setting',
      read: (r, v) => {
        flash.paid();
        return meterText(r, v);
      },
    },
    fire:
      n === 5
        ? { button: '🔌 Switch on the pump', aria: 'Fit the resistor and switch on the pump' }
        : { button: '🚚 Go and fix', aria: 'Send the bucket truck up to the line here' },
    judge: (r, v) => judge(r, v),
    miss: (r, v) => missText(r, v),
    win: (r) => winText(r),
    hint: (r) => hintText(r),
    hit: () => [320, 70],
    delay: (r) => verdictDelay(r),
    draw,
  };
}

export default defineGame({
  mount(ctx) {
    const n = Math.max(1, Math.min(5, ctx.level)) as 1 | 2 | 3 | 4 | 5;
    return mountDialLevel(ctx as never, level(n, ctx.random) as never, ARIA);
  },
});
