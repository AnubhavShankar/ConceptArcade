import { DIFFICULTIES, parseManifest, type GameManifest } from './manifest';
import type { GameModule } from './types';

// Games register themselves just by existing: a folder with game.json + index.ts.
// Contributors never edit this file, so PRs that add games cannot conflict.
const manifestFiles = import.meta.glob<unknown>('/src/games/**/game.json', {
  eager: true,
  import: 'default',
});
const loaders = import.meta.glob<{ default: GameModule }>('/src/games/**/index.ts');

export interface GameEntry {
  manifest: GameManifest;
  load: () => Promise<GameModule>;
}

function build(): GameEntry[] {
  const entries: GameEntry[] = [];
  for (const [path, raw] of Object.entries(manifestFiles)) {
    const dir = path.slice(0, path.lastIndexOf('/'));
    const loader = loaders[`${dir}/index.ts`];
    const parsed = parseManifest(raw);
    if (!parsed.ok || !loader) {
      // `npm run validate` fails CI on this; at runtime we just skip the broken game.
      console.error(`Skipping invalid game at ${dir}`, parsed.ok ? 'missing index.ts' : parsed.errors);
      continue;
    }
    entries.push({ manifest: parsed.manifest, load: async () => (await loader()).default });
  }
  return entries.sort((a, b) => {
    const x = a.manifest;
    const y = b.manifest;
    return (
      x.subject.localeCompare(y.subject) ||
      x.classLevel - y.classLevel ||
      x.chapter.number - y.chapter.number ||
      DIFFICULTIES.indexOf(x.difficulty) - DIFFICULTIES.indexOf(y.difficulty) ||
      x.title.localeCompare(y.title)
    );
  });
}

export const catalog: GameEntry[] = build();

export function findGame(id: string): GameEntry | undefined {
  return catalog.find((g) => g.manifest.id === id);
}
