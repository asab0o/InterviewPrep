// push本文（Markdown）組み立て。設計書02-api-design.md 7章 / 要件5.4のテンプレートを厳密に実装する。
// umpireExplanation は含めない（Problemマスタ側で1問1件管理するため）。

export type MarkdownAttempt = {
  number: number;
  title: string;
  attemptNumber: number;
  date: string;
  code: string | null;
  phrases: { englishText: string; japaneseText: string }[];
  retrospective: string | null;
};

export function buildMarkdown(attempt: MarkdownAttempt): string {
  const sections: string[] = [
    `# ${attempt.number}. ${attempt.title} (Attempt ${attempt.attemptNumber}) — ${attempt.date}`,
  ];

  // codeがnull/空文字の場合はCode見出しごと省略する（設計書に明記はないが、phrases/retrospectiveの
  // 「空なら見出しごと省略」ルールと一貫させるための実装判断。空フェンスだけを残すより自然なため）。
  const code = attempt.code?.trim();
  if (code) {
    sections.push(`## Code\n\n\`\`\`\n${code}\n\`\`\``);
  }

  if (attempt.phrases.length > 0) {
    const lines = attempt.phrases
      .map((phrase) => `- ${phrase.englishText} → ${phrase.japaneseText}`)
      .join("\n");
    sections.push(`## English\n${lines}`);
  }

  const retrospective = attempt.retrospective?.trim();
  if (retrospective) {
    sections.push(`## Could Not Do\n${retrospective}`);
  }

  return `${sections.join("\n\n")}\n`;
}
