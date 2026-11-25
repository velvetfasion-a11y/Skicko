import { PrismaClient } from "@prisma/client"
import { ensureDirectDatabaseUrl, withPoolerParams } from "./database-url"

ensureDirectDatabaseUrl()

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const databaseUrl = process.env.DATABASE_URL ? withPoolerParams(process.env.DATABASE_URL) : undefined

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === "1" ? ["error", "warn"] : ["error"],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
