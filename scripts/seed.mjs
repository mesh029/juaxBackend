import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const url = process.env.DATABASE_URL;

const pool = new pg.Pool({
  connectionString: url?.replace(/[?&]sslmode=[^&]+/, "").replace(/\?$/, ""),
  ssl: url?.includes("sslmode=require") ? { rejectUnauthorized: false } : false,
});

const sql = readFileSync(join(root, "database/seed/001_pilot_seed.sql"), "utf8");

pool
  .query(sql)
  .then(() => {
    console.log("Seed applied");
    return pool.end();
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
