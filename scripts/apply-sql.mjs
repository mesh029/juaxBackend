import "dotenv/config";
import { readFileSync } from "fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url.replace(/[?&]sslmode=[^&]+/, "").replace(/\?$/, ""),
  ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : false,
});

const file = process.argv[2] ?? "database/migrations/006_password_auth.sql";
const sql = readFileSync(file, "utf8");

pool
  .query(sql)
  .then(() => {
    console.log(`Applied ${file}`);
    return pool.end();
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
