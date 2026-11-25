import { prisma } from "../prisma"
import { classifyProviderEvent, suppressionReasonFor } from "../audience/eligibility"
import { suppressAddress } from "../audience/suppress"

export type NormalizedEvent = {
  type: string
  providerId: string
  email: string
  bounceType: string
}

export function normalizeWebhook(body: unknown): NormalizedEvent {
  const record = (body ?? {}) as {
    type?: string
    providerId?: string
    email?: string
    bounceType?: string
    data?: {
      email_id?: string
      to?: string[] | string
      bounce?: { type?: string }
    }
  }
  const to = record.data?.to
  const email = record.email || (Array.isArray(to) ? to[0] : to) || ""
  return {
    type: record.type || "unknown",
    providerId: record.providerId || record.data?.email_id || "",
    email: email.toLowerCase(),
    bounceType: record.bounceType || record.data?.bounce?.type || "",
  }
}

export async function applyWebhook(body: unknown, fallbackWorkspaceId?: string) {
  const event = normalizeWebhook(body)
  const kind = classifyProviderEvent(event.type, event.bounceType)
  const message = event.providerId
    ? await prisma.message.findUnique({ where: { providerId: event.providerId } })
    : null
  const workspaceId = message?.workspaceId || fallbackWorkspaceId || ""
  if (workspaceId) {
    await prisma.webhookEvent.create({
      data: {
        workspaceId,
        type: event.type || kind,
        email: event.email || message?.toEmail || "",
        payload: JSON.stringify(event).slice(0, 4000),
      },
    })
  }
  if (!message) return { matched: false, kind }
  const status = kind === "other" ? message.status : kind === "bounced" ? "bounced" : kind
  if (kind !== "other") {
    await prisma.message.update({ where: { id: message.id }, data: { status } })
    if (message.campaignId && message.contactId) {
      await prisma.campaignRecipient.updateMany({
        where: { campaignId: message.campaignId, contactId: message.contactId },
        data: { status: kind === "delivered" ? "delivered" : kind === "bounced" ? "bounced" : "complained" },
      })
    }
  }
  const reason = suppressionReasonFor(kind)
  const email = message.toEmail || event.email
  if (reason && email) {
    await suppressAddress({
      workspaceId: message.workspaceId,
      email,
      reason,
      source: `webhook:${event.type}`,
      contactStatus: reason === "hard_bounce" ? "bounced" : undefined,
    })
  }
  return { matched: true, kind, messageId: message.id }
}
