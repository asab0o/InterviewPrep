import { db, sqlite } from "./client";
import { seedDatabase } from "./seed-service";

try {
  const result = seedDatabase(db);
  console.log(`Seeded ${result.categories} categories, ${result.problems} problems.`);
} finally {
  sqlite.close();
}
