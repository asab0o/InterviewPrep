import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { ApiError } from "../../api/client";
import { generateProblemUmpire, previewUmpire } from "../../api/umpire";
import type { Problem } from "../../types/api";
import type { AttemptFormValues } from "./schema";

/**
 * Shared state/behavior for the record form + UMPIRE panel (5.3 / 5.5):
 * - "problem title auto-reflect" into the first line of problemStatement (5.5, Q15: the merged
 *   text is what gets saved into problemStatement).
 * - UMPIRE generation (master: POST /api/problems/:id/umpire with cache reuse + force regenerate,
 *   custom: POST /api/umpire/preview, always fresh, result is stored into the form's
 *   umpireExplanation field so it gets saved on the Attempt).
 * - Resetting the displayed explanation whenever the selected problem changes, so a stale
 *   explanation belonging to a *different* problem never lingers on screen (and can't be
 *   accidentally selected into "Add to phrases").
 * - englishDraft: lifted out of PhraseEditor so "Add to phrases" (UmpirePanel) can populate it.
 */
export function useAttemptForm(
  methods: UseFormReturn<AttemptFormValues>,
  problems: Problem[],
  initialUmpireExplanation: string | null,
) {
  const mode = methods.watch("problemMode");
  const problemId = methods.watch("problemId");
  const customTitle = methods.watch("customTitle");
  const problemStatement = methods.watch("problemStatement");

  const [englishDraft, setEnglishDraft] = useState("");
  const [umpireText, setUmpireText] = useState<string | null>(initialUmpireExplanation);
  const [umpireCached, setUmpireCached] = useState<boolean | null>(null);

  const currentTitle = mode === "master"
    ? problems.find((problem) => problem.id === problemId)?.title ?? ""
    : customTitle.trim();

  useEffect(() => {
    if (!currentTitle) return;
    const statement = methods.getValues("problemStatement");
    const lines = statement.split("\n");
    if (lines[0] === currentTitle) return;
    lines[0] = currentTitle;
    methods.setValue("problemStatement", lines.join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTitle]);

  // Reset stale UMPIRE display when the selected problem actually changes (mode or master
  // problemId). Skipped on the very first render so an edit-mode initial explanation survives
  // until the user switches away from the problem it belongs to.
  const resetKey = mode === "master" ? `master:${problemId ?? "none"}` : "custom";
  const isFirstResetRef = useRef(true);
  useEffect(() => {
    if (isFirstResetRef.current) {
      isFirstResetRef.current = false;
      return;
    }
    setUmpireText(null);
    setUmpireCached(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const masterUmpire = useMutation({
    mutationFn: (input: { problemId: number; problemStatement: string; force: boolean }) =>
      generateProblemUmpire(input.problemId, { problemStatement: input.problemStatement, force: input.force }),
    onSuccess: (result) => {
      setUmpireText(result.umpireExplanation);
      setUmpireCached(result.cached);
    },
  });

  const previewMutation = useMutation({
    mutationFn: (statement: string) => previewUmpire({ problemStatement: statement }),
    onSuccess: (result) => {
      setUmpireText(result.umpireExplanation);
      setUmpireCached(null);
      methods.setValue("umpireExplanation", result.umpireExplanation, { shouldDirty: true });
    },
  });

  const isGenerating = masterUmpire.isPending || previewMutation.isPending;
  const generateError = masterUmpire.error instanceof ApiError
    ? masterUmpire.error.message
    : previewMutation.error instanceof ApiError
      ? previewMutation.error.message
      : masterUmpire.isError || previewMutation.isError
        ? "UMPIRE解説を生成できませんでした。"
        : null;

  // Clear a stale generation error once the user edits the problem statement again.
  const statementRef = useRef(problemStatement);
  useEffect(() => {
    if (statementRef.current === problemStatement) return;
    statementRef.current = problemStatement;
    if (masterUmpire.isError) masterUmpire.reset();
    if (previewMutation.isError) previewMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemStatement]);

  function handleGenerate(force: boolean) {
    const statement = methods.getValues("problemStatement");
    if (!statement.trim()) return;
    if (mode === "master") {
      if (problemId === null) return;
      masterUmpire.mutate({ problemId, problemStatement: statement, force });
    } else {
      previewMutation.mutate(statement);
    }
  }

  const generateDisabled = isGenerating || !problemStatement.trim() || (mode === "master" && problemId === null);

  return {
    mode,
    englishDraft,
    setEnglishDraft,
    umpireText,
    umpireCached,
    isGenerating,
    generateError,
    generateDisabled,
    handleGenerate,
  };
}
