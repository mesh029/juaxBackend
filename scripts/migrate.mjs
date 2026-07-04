import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

function aivenPool(connectionString) {
  const sslRequired = connectionString.includes("sslmode=require");
  const cleanUrl = connectionString
    .replace(/[?&]sslmode=[^&]+/, "")
    .replace(/\?$/, "");

  return new pg.Pool({
    connectionString: cleanUrl,
    ssl: sslRequired ? { rejectUnauthorized: false } : false,
  });
}

const pool = aivenPool(url);

async function runFile(relativePath) {
  const sql = readFileSync(join(root, relativePath), "utf8");
  console.log(`→ ${relativePath}`);
  await pool.query(sql);
  console.log(`  ✓ done`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("Connected to Aiven Postgres\n");

    await runFile("database/migrations/001_initial_schema.sql");
    await runFile("database/seed/001_pilot_seed.sql");

    const { rows } = await client.query(
      "SELECT COUNT(*)::int AS n FROM listings WHERE status = 'published'",
    );
    console.log(`\nPublished listings: ${rows[0].n}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  if (err.message?.includes("already exists")) {
    console.error("\nMigration partially applied. If schema exists, run seed only:");
    console.error("  node scripts/seed.mjs");
  }
  console.error(err);
  process.exit(1);
});
