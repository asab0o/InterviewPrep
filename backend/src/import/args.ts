// `pnpm run import:legacy -- [--dry-run] [--source=github|local] [--path=<...>]` の引数パース。
// I/O・DBアクセスを含まない純粋関数（scripts/import-legacy.tsから呼ばれる薄いオーケストレーション対象外）。

export type Source = "github" | "local";
export type CliArgs = { dryRun: boolean; source: Source; path?: string };

export function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let source: Source = "github";
  let path: string | undefined;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--source=")) {
      const value = arg.slice("--source=".length);
      if (value !== "github" && value !== "local") {
        throw new Error(`invalid --source value: "${value}" (expected "github" or "local")`);
      }
      source = value;
      continue;
    }
    if (arg.startsWith("--path=")) {
      path = arg.slice("--path=".length);
      continue;
    }
    throw new Error(`unrecognized argument: "${arg}"`);
  }

  if (source === "local" && !path) {
    throw new Error("--path is required when --source=local");
  }

  return path === undefined ? { dryRun, source } : { dryRun, source, path };
}
