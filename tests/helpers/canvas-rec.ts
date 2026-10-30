// A canvas recorder for the jsdom UI tests: every string drawn (with its position), every stroke (colour, dashed or not,
// number of points), every fill colour and every arc (centre, radius). Install it after the harness has run its beforeEach.
import { vi } from 'vitest';

export interface Rec {
  at: { s: string; x: number; y: number }[];
  strokes: { style: string; dash: boolean; n: number }[];
  fills: string[];
  arcs: { x: number; y: number; r: number }[];
}

export function canvasRecorder() {
  const rec: Rec = { at: [], strokes: [], fills: [], arcs: [] };
  const store: Record<string, unknown> = {};
  let n = 0;
  let dash = false;
  const proxy = new Proxy(store, {
    get: (_t, p) => {
      if (p === 'fillText') return (s: string, x: number, y: number) => rec.at.push({ s: String(s), x, y });
      if (p === 'beginPath') return () => (n = 0);
      if (p === 'lineTo') return () => n++;
      if (p === 'arc') return (x: number, y: number, r: number) => rec.arcs.push({ x, y, r });
      if (p === 'setLineDash') return (a: number[]) => (dash = a.length > 0);
      if (p === 'stroke') return () => rec.strokes.push({ style: String(store.strokeStyle), dash, n });
      if (p === 'fill') return () => rec.fills.push(String(store.fillStyle));
      return () => undefined;
    },
    set: (_t, p, v) => {
      store[String(p)] = v;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(proxy as never);
  const clear = () => {
    rec.at.length = 0;
    rec.strokes.length = 0;
    rec.fills.length = 0;
    rec.arcs.length = 0;
  };
  return { rec, clear };
}
export type CanvasRec = ReturnType<typeof canvasRecorder>;
export const texts = (rec: Rec) => rec.at.map((a) => a.s);
