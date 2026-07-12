// push本文（Markdown）のプレビュー組み立て。バックエンド（backend/src/github/markdown.ts）と
// 同一ロジック・同一出力になるよう実装を揃える（02-api-design.md 7章 / 要件5.4）。
// umpireExplanation は含めない（Problemマスタ側で1問1件管理するため）。
//
// 注意：check成功後（=サーバー側で number/title/category の解決に成功した後）にのみこの関数を呼ぶ想定
// のため number が null になるケースは実運用では発生しない。呼び出し側が壊れないための最小限の防御と
// して number: null も受け付け、その場合は "# {title} ..." のように番号部分を省略する。

export type MarkdownAttempt = {
  number: number | null;
  title: string;
  attemptNumber: number;
  date: string;
  code: string | null;
  phrases: { englishText: string; japaneseText: string }[];
  retrospective: string | null;
};

export function buildMarkdown(attempt: MarkdownAttempt): string {
  const heading = attempt.number !== null
    ? `# ${attempt.number}. ${attempt.title} (Attempt ${attempt.attemptNumber}) — ${attempt.date}`
    : `# ${attempt.title} (Attempt ${attempt.attemptNumber}) — ${attempt.date}`;
  const sections: string[] = [heading];

  // codeがnull/空文字の場合はCode見出しごと省略する（backendのbuildMarkdownと同じ判断）。
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
