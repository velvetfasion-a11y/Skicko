import type { Prisma, PrismaClient } from "@prisma/client"
import { BRAND } from "./brand"
import { prisma } from "./prisma"
import { starterTemplates } from "./email/starters"
import { normalizeEmail } from "./email/address"

type Database = PrismaClient | Prisma.TransactionClient

export async function createWorkspaceForUser(
  input: {
    userId: string
    workspaceName: string
    senderName: string
    replyTo: string
  },
  db: Database = prisma,
) {
  return db.workspace.create({
    data: {
      name: input.workspaceName.trim(),
      senderName: input.senderName.trim(),
      replyTo: normalizeEmail(input.replyTo),
      companyAddress: "",
      members: { create: { userId: input.userId, role: "owner" } },
      templates: {
        create: starterTemplates().map((template) => ({
          name: template.name,
          description: template.description,
          category: template.category,
          html: template.html,
        })),
      },
      forms: {
        create: {
          name: "Newsletter",
          headline: `Notes from ${input.workspaceName.trim()}`,
          description: "Occasional letters. Unsubscribe whenever you like.",
          buttonLabel: "Subscribe",
          doubleOptIn: true,
          consentText: BRAND.defaultConsentText,
          consentVersion: BRAND.consentVersion,
        },
      },
    },
  })
}

export async function findOrCreateUserByEmail(email: string, name?: string) {
  const normalized = normalizeEmail(email)
  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    include: { membership: true },
  })
  if (existing) return existing
  const local = normalized.split("@")[0] || "Studio"
  const pretty = name?.trim() || local.replace(/[._-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email: normalized, name: pretty } })
    await createWorkspaceForUser(
      {
        userId: created.id,
        workspaceName: pretty,
        senderName: pretty,
        replyTo: normalized,
      },
      tx,
    )
    return created
  })
  return prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { membership: true } })
}
