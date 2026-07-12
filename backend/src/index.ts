import "dotenv/config";
import { createApp } from "./app";
import { loadAuthConfig } from "./config";
import { sqlite } from "./db/client";

const PORT = Number(process.env.PORT ?? 3000);
const app = createApp(loadAuthConfig(), sqlite);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV ?? "development"})`);
});
