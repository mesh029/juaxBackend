/**
 * Single Prisma client for the whole app.
 * Always import from here (or @/lib/db) — never `new PrismaClient()` elsewhere.
 */
export { prisma, checkDbConnection, getPrisma, type AppPrismaClient } from "./db";
