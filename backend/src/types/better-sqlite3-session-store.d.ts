declare module "better-sqlite3-session-store" {
  type StoreOptions = {
    client: import("better-sqlite3").Database;
    expired?: { clear?: boolean; intervalMs?: number };
  };

  export default function createSqliteStore(
    sessionModule: typeof import("express-session"),
  ): new (options: StoreOptions) => import("express-session").Store;
}
