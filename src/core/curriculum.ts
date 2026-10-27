import { z } from 'zod';
import { SUBJECTS } from './manifest';

/**
 * A curriculum file lists the chapters of one subject and class (e.g. NCERT Physics, Class 12).
 * It is independent of the games: it lets the home page show chapters that have no games yet as
 * "coming soon", and gives every game one canonical chapter name. Adding a subject or class means
 * adding one new file under src/curriculum/, never editing a shared one.
 */
export const curriculumSchema = z
  .object({
    $schema: z.string().optional(),
    subject: z.enum(SUBJECTS),
    classLevel: z.number().int().min(6).max(12),
    source: z.string().max(120).optional(),
    chapters: z
      .array(
        z
          .object({
            number: z.number().int().min(1).max(40),
            name: z.string().min(3).max(90),
          })
          .strict(),
      )
      .min(1)
      .superRefine((chapters, ctx) => {
        const seen = new Set<number>();
        chapters.forEach((c, i) => {
          if (seen.has(c.number)) ctx.addIssue({ code: 'custom', path: [i, 'number'], message: `chapter ${c.number} is listed twice` });
          seen.add(c.number);
        });
      }),
  })
  .strict();

export type Curriculum = z.infer<typeof curriculumSchema>;

export type ParsedCurriculum = { ok: true; curriculum: Curriculum } | { ok: false; errors: string[] };

export function parseCurriculum(raw: unknown): ParsedCurriculum {
  const r = curriculumSchema.safeParse(raw);
  if (r.success) return { ok: true, curriculum: r.data };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`) };
}

export const subjectLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
