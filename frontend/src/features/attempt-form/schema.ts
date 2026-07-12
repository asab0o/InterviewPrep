import { z } from "zod";

const optionalText = z.string().max(100_000);
export const attemptFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付を入力してください。"),
  categoryId: z.number().int().positive().nullable(),
  problemMode: z.enum(["master", "custom"]),
  problemId: z.number().int().positive().nullable(),
  customTitle: z.string().trim().max(500),
  customNumber: z.number().int().positive().nullable(),
  code: optionalText,
  problemStatement: optionalText,
  videoUrl: z.union([z.literal(""), z.url("正しいURLを入力してください。")]),
  transcript: optionalText,
  retrospective: optionalText,
  umpireExplanation: optionalText,
  phrases: z.array(z.object({
    id: z.number().int().positive().optional(),
    englishText: z.string().trim().min(1, "英語を入力してください。").max(5_000),
    japaneseText: z.string().trim().min(1, "日本語訳を入力してください。").max(5_000),
  })).max(100),
}).superRefine((value, context) => {
  if (value.categoryId === null) context.addIssue({ code: "custom", path: ["categoryId"], message: "カテゴリーを選択してください。" });
  if (value.problemMode === "master" && value.problemId === null) context.addIssue({ code: "custom", path: ["problemId"], message: "問題を選択してください。" });
  if (value.problemMode === "custom" && !value.customTitle) context.addIssue({ code: "custom", path: ["customTitle"], message: "問題名を入力してください。" });
});

export type AttemptFormValues = z.infer<typeof attemptFormSchema>;
