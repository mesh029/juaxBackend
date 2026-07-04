/** SSL options for Aiven Postgres (sslmode=require). */
export function pgSsl(connectionString: string): boolean | { rejectUnauthorized: boolean } {
  if (!connectionString.includes("sslmode=require")) {
    return false;
  }
  return { rejectUnauthorized: false };
}

/** Strip sslmode from URL so pg Pool ssl config is not overridden. */
export function cleanDatabaseUrl(connectionString: string): string {
  return connectionString
    .replace(/[?&]sslmode=[^&]+/, "")
    .replace(/\?$/, "");
}
