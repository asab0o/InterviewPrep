import "dotenv/config";
import express, { type Request, type Response } from "express";

// ============================================================
// scaffold段階のエントリポイント。
// DB接続・認証・ビジネスロジックは含まない（次のステップで実装）。
// ============================================================

const app = express();

const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json());

// ヘルスチェック（docs/design/02-api-design.md の正式仕様どおり、/api配下ではなく認証不要）。
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV ?? "development"})`);
});
