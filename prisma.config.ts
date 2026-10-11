import { defineConfig } from "prisma/config";

/**
 * Prisma CLI setup. The client is constructed in
 * packages/infrastructure/src/prisma.ts. Model files live under prisma/models.
 * This file points at that directory so Prisma combines them.
 *
 * Generate does not connect. A missing DATABASE_URL uses a local placeholder
 * so the client can still be generated. Commands that open a database require
 * the real URL.
 */
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://127.0.0.1:5432/life";

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
