import { BRAND } from "../brand"
import { prisma } from "../prisma"
import { HttpError } from "../http"
import { isEmail, normalizeEmail } from "../email/address"
import { newToken } from "../crypto"
import { sendRendered } from "../email/deliver"
import { transportKind } from "../email/transport"
import type { SignupForm, Workspace } from "@prisma/client"

export async function submitSignup(input: {
  form: SignupForm & { workspace: Workspace }
  email: string
  firstName: string
  consent: boolean
  honeypot: string
  origin: string
}) {
  if (input.honeypot) return { status: "subscribed" as const, devLink: null }
  const email = normalizeEmail(input.email)
  if (!isEmail(email)) throw new HttpError("Enter a valid email address.", 400)
  if (!input.consent) throw new HttpError("Consent is required.", 400)
  const suppressed = await prisma.suppression.findUnique({
    where: { workspaceId_email: { workspaceId: input.form.workspaceId, email } },
  })
  if (suppressed) return { status: "blocked" as const, devLink: null }

  const existing = await prisma.contact.findUnique({
    where: { workspaceId_email: { workspaceId: input.form.workspaceId, email } },
  })
  if (existing?.status === "subscribed") return { status: "already" as const, devLink: null }

  const now = new Date()
  const contact = await prisma.contact.upsert({
    where: { workspaceId_email: { workspaceId: input.form.workspaceId, email } },
    create: {
      workspaceId: input.form.workspaceId,
      email,
      firstName: input.firstName.trim(),
      status: input.form.doubleOptIn ? "pending" : "subscribed",
      consentStatus: "granted",
      consentedAt: now,
      consentSource: `form:${input.form.id}`,
      consentTextVersion: input.form.consentVersion,
    },
    update: {
      firstName: input.firstName.trim() || undefined,
      consentStatus: "granted",
      consentedAt: now,
      consentSource: `form:${input.form.id}`,
      consentTextVersion: input.form.consentVersion,
      status: input.form.doubleOptIn ? "pending" : "subscribed",
    },
  })
  if (input.form.listId) {
    await prisma.listMember.upsert({
      where: { listId_contactId: { listId: input.form.listId, contactId: contact.id } },
      create: { listId: input.form.listId, contactId: contact.id },
      update: {},
    })
  }
  await prisma.contactEvent.create({
    data: {
      workspaceId: input.form.workspaceId,
      contactId: contact.id,
      type: input.form.doubleOptIn ? "pending" : "subscribed",
      detail: `form:${input.form.name}`,
    },
  })
  if (!input.form.doubleOptIn) return { status: "subscribed" as const, devLink: null }

  const token = newToken()
  await prisma.confirmToken.create({
    data: {
      contactId: contact.id,
      formId: input.form.id,
      tokenHash: token.hash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    },
  })
  const link = `${input.origin}/confirm/${token.raw}`
  const domain = await prisma.sendingDomain.findFirst({
    where: { workspaceId: input.form.workspaceId },
    orderBy: { createdAt: "asc" },
  })
  if (domain && (domain.status === "verified" || transportKind() === "console")) {
    const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1d1f;">
<p>Confirm that ${email} should hear from ${input.form.workspace.senderName || input.form.workspace.name}.</p>
<p><a href="${link}">Confirm subscription</a></p>
<p style="color:#6e6e73;font-size:12px;">${input.form.consentText}</p>
</body></html>`
    await sendRendered({
      workspace: input.form.workspace,
      to: email,
      fromEmail: `hello@${domain.domain}`,
      fromName: input.form.workspace.senderName || input.form.workspace.name,
      replyTo: input.form.workspace.replyTo,
      subject: `Confirm your subscription`,
      html,
      category: "transactional",
      variables: { first_name: contact.firstName, email },
      origin: input.origin,
      source: "confirm",
      contactId: contact.id,
      requireConsent: false,
    }).catch(() => undefined)
  }
  return {
    status: "pending" as const,
    devLink: transportKind() === "console" ? link : null,
  }
}

export async function confirmSignup(rawToken: string) {
  const { sha256 } = await import("../crypto")
  const row = await prisma.confirmToken.findUnique({ where: { tokenHash: sha256(rawToken) }, include: { contact: true } })
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw new HttpError("This confirmation link is invalid or has expired.", 400)
  }
  await prisma.confirmToken.update({ where: { id: row.id }, data: { usedAt: new Date() } })
  await prisma.contact.update({
    where: { id: row.contactId },
    data: { status: "subscribed", consentStatus: "granted", consentedAt: row.contact.consentedAt ?? new Date() },
  })
  await prisma.contactEvent.create({
    data: {
      workspaceId: row.contact.workspaceId,
      contactId: row.contactId,
      type: "subscribed",
      detail: "double opt-in",
    },
  })
  return row.contact
}

export const defaultConsent = BRAND.defaultConsentText
