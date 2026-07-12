import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const dbPath = process.env.DB_PATH;

if (!dbPath) {
  throw new Error("DB_PATH is required (for example: DB_PATH=./data/app.db)");
}

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: dbPath,
  },
});
