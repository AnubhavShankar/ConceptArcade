// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { startApp } from '../src/core/app';
import { catalog } from '../src/core/registry';
import { applyMeta, gameMeta, gameTitle, gameUrl, homeMeta, homeTitle, homeUrl } from '../src/core/seo';

const meta = (sel: string) => document.head.querySelector(sel)?.getAttribute(sel.startsWith('link') ? 'href' : 'content');

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.clear();
  location.hash = '';
});

describe('applyMeta', () => {
  it('sets the tab title, description, canonical link and social tags', () => {
    applyMeta(homeMeta());
    expect(document.title).toBe(homeTitle());
    expect(meta('meta[name="description"]')).toBe(homeMeta().description);
    expect(meta('link[rel="canonical"]')).toBe(homeUrl());
    expect(meta('meta[property="og:title"]')).toBe(homeTitle());
    expect(meta('meta[property="og:url"]')).toBe(homeUrl());
    expect(meta('meta[name="twitter:title"]')).toBe(homeTitle());
  });
  it('updates in place: calling it again never duplicates a tag', () => {
    applyMeta(homeMeta());
    applyMeta(gameMeta(catalog[0].manifest));
    for (const sel of ['meta[name="description"]', 'link[rel="canonical"]', 'meta[property="og:title"]', 'meta[property="og:image"]']) {
      expect(document.head.querySelectorAll(sel).length).toBeLessThanOrEqual(1);
    }
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(meta('link[rel="canonical"]')).toBe(gameUrl(catalog[0].manifest.id));
  });
  it('keeps tags the page already had, changing only their values', () => {
    document.head.innerHTML = '<meta name="description" content="old"><link rel="canonical" href="https://x/">';
    applyMeta(homeMeta());
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(meta('meta[name="description"]')).toBe(homeMeta().description);
  });
});

describe('the router keeps the metadata in step with the page', () => {
  it('shows the home metadata on the home page', () => {
    startApp(document.getElementById('app')!);
    expect(document.title).toBe(homeTitle());
    expect(meta('link[rel="canonical"]')).toBe(homeUrl());
  });
  it('shows each game its own title, description and canonical URL when it is opened, and home again on the way back', () => {
    const m = catalog[0].manifest;
    startApp(document.getElementById('app')!);
    location.hash = `#/game/${m.id}`;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(document.title).toBe(gameTitle(m));
    expect(meta('meta[name="description"]')).toBe(gameMeta(m).description);
    expect(meta('link[rel="canonical"]')).toBe(gameUrl(m.id));
    location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(document.title).toBe(homeTitle());
  });
  it('an unknown game id falls back to the home metadata rather than a broken title', () => {
    startApp(document.getElementById('app')!);
    location.hash = '#/game/does-not-exist';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(document.title).toBe(homeTitle());
  });
  it('every game gets a different title in the tab', () => {
    const titles = new Set<string>();
    startApp(document.getElementById('app')!);
    for (const e of catalog) {
      location.hash = `#/game/${e.manifest.id}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      titles.add(document.title);
    }
    expect(titles.size).toBe(catalog.length);
  });
});
