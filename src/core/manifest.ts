import { z } from 'zod';

export const SUBJECTS = ['physics', 'chemistry', 'mathematics', 'biology'] as const;
export const DIFFICULTIES = ['concept', 'application', 'challenge'] as const;
export const MECHANICS = [
  'tune-to-target',
  'build-the-setup',
  'predict-then-reveal',
  'fix-the-broken',
  'numeric-puzzle',
  'match-and-sort',
  'other',
] as const;

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The metadata every game ships in its `game.json`. */
export const manifestSchema = z
  .object({
    $schema: z.string().optional(),
    id: z.string().regex(kebab, 'must be kebab-case, e.g. "coulomb-balance"').max(48),
    title: z.string().min(3).max(60),
    summary: z.string().min(10).max(140),
    subject: z.enum(SUBJECTS),
    classLevel: z.number().int().min(6).max(12),
    chapter: z
      .object({
        number: z.number().int().min(1).max(30),
        name: z.string().min(3).max(80),
      })
      .strict(),
    ncertRef: z
      .string()
      .min(3)
      .max(80)
      .describe('Where the concept is taught, e.g. "Section 1.4, Coulomb\'s Law". Reference only; never copy text.'),
    concepts: z.array(z.string().min(2).max(60)).min(1).max(6),
    learningOutcome: z
      .string()
      .min(10)
      .max(200)
      .describe('What a student can do after winning that they could not reliably do before.'),
    mechanic: z.enum(MECHANICS),
    difficulty: z.enum(DIFFICULTIES),
    estimatedMinutes: z.number().int().min(1).max(30),
    hints: z
      .array(z.string().min(3).max(200))
      .min(2)
      .max(4)
      .describe('Ordered from gentlest nudge to most revealing. Each hint costs the student one star.'),
    misconceptions: z.array(z.string().min(3).max(160)).max(5).optional(),
    author: z
      .object({
        name: z.string().min(1).max(60),
        github: z.string().regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, 'GitHub username'),
      })
      .strict(),
  })
  .strict();

export type GameManifest = z.infer<typeof manifestSchema>;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Folder (relative to src/games) a game must live in, derived from its manifest. */
export function expectedDir(m: GameManifest): string {
  const ch = String(m.chapter.number).padStart(2, '0');
  return `${m.subject}/class-${m.classLevel}/ch${ch}-${slugify(m.chapter.name)}/${m.id}`;
}

export type ParseResult =
  | { ok: true; manifest: GameManifest }
  | { ok: false; errors: string[] };

export function parseManifest(raw: unknown): ParseResult {
  const r = manifestSchema.safeParse(raw);
  if (r.success) return { ok: true, manifest: r.data };
  return {
    ok: false,
    errors: r.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
  };
}
