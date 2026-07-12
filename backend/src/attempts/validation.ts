import { z } from "zod";

const nullableText = z.string().trim().max(100_000).nullable().optional();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}

export const phraseInputSchema = z.object({
  id: z.number().int().positive().optional(),
  englishText: z.string().trim().min(1).max(5_000),
  japaneseText: z.string().trim().min(1).max(5_000),
}).strict();

export const attemptInputSchema = z.object({
  date: z.string().refine(isRealDate, "date must be a valid YYYY-MM-DD value"),
  problemId: z.number().int().positive().nullable(),
  customTitle: z.string().trim().min(1).max(500).nullable().optional(),
  customNumber: z.number().int().positive().nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  code: nullableText,
  problemStatement: nullableText,
  videoUrl: z.string().trim().url().max(2_000).nullable().optional(),
  transcript: nullableText,
  retrospective: nullableText,
  umpireExplanation: nullableText,
  phrases: z.array(phraseInputSchema).max(100),
}).strict().superRefine((value, context) => {
  if (value.problemId === null && !value.customTitle) {
    context.addIssue({ code: "custom", path: ["customTitle"], message: "customTitle is required for a custom problem" });
  }
  if (value.problemId !== null && value.customTitle) {
    context.addIssue({ code: "custom", path: ["customTitle"], message: "customTitle is only allowed for a custom problem" });
  }
  const ids = value.phrases.flatMap((phrase) => phrase.id === undefined ? [] : [phrase.id]);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["phrases"], message: "phrase ids must not be duplicated" });
  }
});

export type AttemptInput = z.infer<typeof attemptInputSchema>;

export const attemptIdSchema = z.coerce.number().int().positive();
export const attemptListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  problemId: z.coerce.number().int().positive().optional(),
}).strict();
