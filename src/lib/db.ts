import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

/**
 * ONE PrismaClient for the entire app (Vercel serverless-safe).
 *
 * Important: cache on globalThis in production too — not only in development.
 * The common dev-only pattern causes extra clients when modules reload on serverless.
 *
 * With direct Aiven (~20 conn limit) on Vercel:
 * - connection_limit=1 per lambda instance (default on VERCEL)
 * - ~18–20 max concurrent warm instances before limit — OK for pilot traffic
 * - Optional: Prisma Accelerate (DATABASE_URL=prisma://…) if you outgrow that
 */
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL_ENV,
  );
}

function usesAccelerate(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith("prisma://") || url.startsWith("prisma+postgres://");
}

function buildDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw || usesAccelerate(raw)) return raw;

  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set(
        "connection_limit",
        process.env.PRISMA_CONNECTION_LIMIT ?? (isServerlessRuntime() ? "1" : "3"),
      );
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set(
        "pool_timeout",
        process.env.PRISMA_POOL_TIMEOUT ?? (isServerlessRuntime() ? "20" : "30"),
      );
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "10");
    }
    if (process.env.DATABASE_USE_PGBOUNCER === "true" && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function createPrismaClient(): PrismaClient {
  const url = buildDatabaseUrl();
  const base = new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (usesAccelerate(process.env.DATABASE_URL)) {
    return base.$extends(withAccelerate()) as unknown as PrismaClient;
  }

  return base;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Always assign — including production on Vercel (required for serverless singleton).
globalForPrisma.prisma = prisma;

export type AppPrismaClient = typeof prisma;

export async function checkDbConnection(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

/** @deprecated Use `prisma` directly. Kept for migrate/seed scripts. */
export { prisma as getPrisma };
