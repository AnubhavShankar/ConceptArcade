// Pure geometry of the beam through the prism (screen coordinates, y down): no canvas here, so it can be unit-tested.
import { path } from './logic';

const RAD = Math.PI / 180;
export type V = [number, number];
export const rot = (v: V, deg: number): V => [v[0] * Math.cos(deg * RAD) - v[1] * Math.sin(deg * RAD), v[0] * Math.sin(deg * RAD) + v[1] * Math.cos(deg * RAD)];
export const add = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k];

export const APEX: V = [320, 70];
export const HEIGHT = 190;
export const BASE_Y = APEX[1] + HEIGHT;

/** Where the burst of points appears on a 640 × 340 screen: where the player's own beam ends, so it follows their setting and never the answer. */
export function hitPoint(A: number, nRel: number, i: number): V {
  const tr = trace3(A, nRel, i);
  const end: V = tr.out ? add(tr.P2, tr.out, 150) : tr.tirEnd ?? tr.P2;
  return [Math.max(20, Math.min(620, end[0])), Math.max(30, Math.min(310, end[1]))];
}

/** The prism, the beam through it and where it ends up, for incidence i and relative index nRel. */
export function trace3(A: number, nRel: number, i: number) {
  const h = (A / 2) * RAD;
  const dL: V = [-Math.sin(h), Math.cos(h)];
  const dR: V = [Math.sin(h), Math.cos(h)];
  const faceLen = HEIGHT / Math.cos(h);
  const nIn: V = [Math.cos(h), Math.sin(h)];
  const n2Out: V = [Math.cos(h), -Math.sin(h)];
  const E1 = add(APEX, dL, 0.55 * faceLen);
  const u = rot(nIn, -i);
  const p = path(A, nRel, i);
  const vin = rot(nIn, -p.r1);
  // where the inner ray meets the second face (or the base)
  const cross = (a: V, b: V) => a[0] * b[1] - a[1] * b[0];
  const den = cross(vin, dR);
  let t = Math.abs(den) > 1e-9 ? cross([APEX[0] - E1[0], APEX[1] - E1[1]], dR) / den : 200;
  let P2 = add(E1, vin, t);
  const sOn = ((P2[0] - APEX[0]) * dR[0] + (P2[1] - APEX[1]) * dR[1]);
  if (!(t > 0) || sOn < 0 || sOn > faceLen) {
    t = vin[1] > 0.01 ? (BASE_Y - E1[1]) / vin[1] : 120;
    P2 = add(E1, vin, t);
  }
  let out: V | null = null;
  let tirEnd: V | null = null;
  if (p.e !== null) out = rot(n2Out, p.e);
  else {
    const d = vin[0] * n2Out[0] + vin[1] * n2Out[1];
    const refl: V = [vin[0] - 2 * d * n2Out[0], vin[1] - 2 * d * n2Out[1]];
    const tt = refl[1] > 0.05 ? (BASE_Y - P2[1]) / refl[1] : 110;
    tirEnd = add(P2, refl, Math.min(tt, 220));
  }
  return { p, u, E1, P2, out, tirEnd, nIn, h };
}

