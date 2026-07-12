import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export function createDb(path: string) {
  const sqlite = new Database(path);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}

const dbPath = process.env.DB_PATH;

if (!dbPath) {
  throw new Error("DB_PATH is required");
}

export const { db, sqlite } = createDb(dbPath);
