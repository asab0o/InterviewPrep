import { useState } from "react";

export function useFileText(onRead: (text: string) => void) {
  const [error, setError] = useState<string | null>(null);
  async function readFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError(".txtファイルを選択してください。");
      return;
    }
    try {
      onRead(await file.text());
      setError(null);
    } catch {
      setError("ファイルを読み込めませんでした。");
    }
  }
  return { readFile, error };
}
