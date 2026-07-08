/**
 * Apply migrations that may be missing on production (idempotent SQL files).
 * Run after deploy: node scripts/apply-pending-migrations.mjs
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const PENDING = [
  "database/migrations/005_listing_requests.sql",
  "database/migrations/006_viewing_pickup_mode.sql",
  "database/migrations/009_postgis_admin_areas.sql",
  "database/migrations/010_backfill_listing_requests_from_feedback.sql",
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url.replace(/[?&]sslmode=[^&]+/, "").replace(/\?$/, ""),
  ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : false,
});

async function runFile(relativePath) {
  const sql = readFileSync(join(root, relativePath), "utf8");
  console.log(`→ ${relativePath}`);
  await pool.query(sql);
  console.log("  ✓ done");
}

async function main() {
  for (const file of PENDING) {
    await runFile(file);
  }
  console.log("\nPending migrations applied. Run: node scripts/import-kenya-counties.mjs");
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
