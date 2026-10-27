// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { renderHome, resetHomeState } from '../src/core/home';
import { applyResult } from '../src/core/progress';
import { applyTheme, loadTheme, themeToggle } from '../src/core/theme';
import { entry } from './fixtures';

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
  resetHomeState();
});

describe('theme', () => {
  it('defaults to following the device, and a stored choice is applied to the page', () => {
    expect(loadTheme()).toBe('auto');
    localStorage.setItem('concept-arcade:theme', 'dark');
    applyTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    localStorage.setItem('concept-arcade:theme', 'auto');
    applyTheme();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
  it('ignores a garbage stored value', () => {
    localStorage.setItem('concept-arcade:theme', 'purple');
    expect(loadTheme()).toBe('auto');
  });
  it('the toggle cycles Auto, Light, Dark, remembers it, and says what it is', () => {
    const btn = themeToggle();
    document.body.append(btn);
    expect(btn.textContent).toContain('Auto');
    btn.click();
    expect(btn.textContent).toContain('Light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    btn.click();
    expect(btn.textContent).toContain('Dark');
    expect(localStorage.getItem('concept-arcade:theme')).toBe('dark');
    btn.click();
    expect(btn.textContent).toContain('Auto');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(btn.getAttribute('aria-label')).toMatch(/Theme: Auto/);
  });
  it('still works when storage is blocked', () => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
    try {
      const btn = themeToggle();
      expect(() => btn.click()).not.toThrow();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    } finally {
      Storage.prototype.setItem = real;
    }
  });
});

describe('home hero', () => {
  const app = () => document.querySelector('#app') as HTMLElement;
  beforeEach(() => {
    const d = document.createElement('div');
    d.id = 'app';
    document.body.append(d);
  });
  it('shows games finished, levels cleared and stars earned from the saved progress', () => {
    const store = [1, 2, 3].reduce((s, l) => applyResult(s, 'a', l, 3), {});
    renderHome(app(), { entries: [entry('a'), entry('b')], curricula: [], store, last: null });
    const stats = [...app().querySelectorAll('.stat')].map((s) => s.textContent);
    expect(stats).toEqual(['1/2games finished', '3/6levels cleared', '9 ★stars earned']);
  });
  it('shows zeros for a new student, and offers the theme toggle', () => {
    renderHome(app(), { entries: [entry('a')], curricula: [], store: {}, last: null });
    expect(app().querySelector('.stat strong')?.textContent).toBe('0/1');
    expect(app().querySelector('.theme-toggle')).not.toBeNull();
  });
});
