// Light / dark / follow-the-device. Stored per browser; games read their colours when they mount.
import { h } from './dom';

export type ThemeChoice = 'auto' | 'light' | 'dark';
const KEY = 'concept-arcade:theme';
const ORDER: ThemeChoice[] = ['auto', 'light', 'dark'];
const LABEL: Record<ThemeChoice, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };
const ICON: Record<ThemeChoice, string> = { auto: '◐', light: '☀', dark: '☾' };

export function loadTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return ORDER.includes(v as ThemeChoice) ? (v as ThemeChoice) : 'auto';
  } catch {
    return 'auto';
  }
}

export function applyTheme(choice: ThemeChoice = loadTheme()): void {
  if (choice === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', choice);
}

/** A button that cycles Auto → Light → Dark and says what it will do. */
export function themeToggle(): HTMLButtonElement {
  let current = loadTheme();
  const btn = h('button', { class: 'theme-toggle', type: 'button' });
  const paint = () => {
    btn.replaceChildren(h('span', { 'aria-hidden': 'true' }, ICON[current]), h('span', null, LABEL[current]));
    btn.setAttribute('aria-label', `Theme: ${LABEL[current]}. Press to change.`);
  };
  btn.addEventListener('click', () => {
    current = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    try {
      localStorage.setItem(KEY, current);
    } catch {
      /* the choice just will not be remembered */
    }
    applyTheme(current);
    paint();
  });
  paint();
  return btn;
}
