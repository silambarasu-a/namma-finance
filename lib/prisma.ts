/**
 * Prisma Client Singleton
 *
 * Ensures a single Prisma Client instance is used throughout the application
 * to avoid connection pool exhaustion in development (hot reloading).
 *
 * In production, this creates one client instance.
 * In development, this reuses the same client across hot reloads.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
