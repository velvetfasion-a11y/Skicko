import { prisma } from "../prisma"
import { normalizeEmail } from "../email/address"

export async function suppressAddress(input: {
  workspaceId: string
  email: string
  reason: "hard_bounce" | "complaint" | "unsubscribe" | "manual"
  source: string
  contactStatus?: string
}) {
  const email = normalizeEmail(input.email)
  await prisma.suppression.upsert({
    where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
    create: {
      workspaceId: input.workspaceId,
      email,
      reason: input.reason,
      source: input.source,
    },
    update: { reason: input.reason, source: input.source },
  })
  if (input.contactStatus) {
    await prisma.contact.updateMany({
      where: { workspaceId: input.workspaceId, email },
      data: {
        status: input.contactStatus,
        ...(input.reason === "unsubscribe" ? { consentStatus: "withdrawn" } : {}),
      },
    })
  }
  const contact = await prisma.contact.findUnique({
    where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
  })
  if (contact) {
    await prisma.contactEvent.create({
      data: {
        workspaceId: input.workspaceId,
        contactId: contact.id,
        type: input.reason,
        detail: input.source,
      },
    })
  }
  return email
}

export async function suppressionSet(workspaceId: string) {
  const rows = await prisma.suppression.findMany({ where: { workspaceId }, select: { email: true, reason: true } })
  return new Map(rows.map((row) => [row.email, row.reason]))
}
