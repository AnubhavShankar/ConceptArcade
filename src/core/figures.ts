import { h, svg } from './dom';

export type Sign = 1 | -1 | 0;

const SYMBOL: Record<string, string> = { '1': '+', '-1': '−', '0': '0' };
const WORD: Record<string, string> = { '1': 'positive', '-1': 'negative', '0': 'neutral' };

/** A round body showing its charge sign (colour is also backed by a symbol, never colour alone). */
export function chargeIcon(sign: Sign, size = 48): SVGSVGElement {
  const cls = sign === 1 ? 'pos' : sign === -1 ? 'neg' : 'neu';
  return svg(
    'svg',
    { viewBox: '0 0 60 60', width: size, height: size, role: 'img', 'aria-label': `${WORD[sign]} charge` },
    svg('circle', { cx: 30, cy: 30, r: 24, class: `charge-ball ${cls}` }),
    svg('text', { x: 30, y: 38, 'text-anchor': 'middle', 'font-size': 26, class: 'charge-sym' }, SYMBOL[sign]),
  );
}

/** A row of labelled charged bodies, e.g. [{sign: 1, label: 'Glass rod'}, ...]. */
export function chargeRow(items: { sign: Sign; label: string }[]): HTMLElement {
  return h(
    'div',
    { class: 'figure-row' },
    ...items.map((it) => h('figure', { class: 'figure-item' }, chargeIcon(it.sign), h('figcaption', null, it.label))),
  );
}
