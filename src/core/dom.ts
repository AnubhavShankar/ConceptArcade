/** Tiny, XSS-safe DOM helpers. Strings become text nodes, never HTML. */
export type Child = Node | string | number | null | undefined | false;
type Props = Record<string, string | number | boolean | ((e: Event) => void)> | null;

function apply(el: Element, props: Props, children: Child[]): void {
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      el.setAttribute('class', String(value));
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'object' ? c : String(c));
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  apply(el, props, children);
  return el;
}

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  props: Props = null,
  ...children: Child[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  apply(el, props, children);
  return el;
}
