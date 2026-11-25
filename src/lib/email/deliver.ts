import { prisma } from "../prisma"
import { HttpError } from "../http"
import { formatAddress, isLocalPart } from "./address"
import { composeEmail, type MailCategory } from "./compose"
import { getTransport, transportKind } from "./transport"
import { unsubscribeLinks } from "./unsubscribe"
import { marketingEligible } from "../audience/eligibility"
import { suppressionSet } from "../audience/suppress"

export function contactVariables(
  contact: { email: string; firstName: string; lastName: string; company: string; properties: string },
  extra?: Record<string, string | undefined>,
) {
  let properties: Record<string, string> = {}
  try {
    const parsed = JSON.parse(contact.properties) as Record<string, unknown>
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") properties[key] = value
      else if (value != null) properties[key] = String(value)
    }
  } catch {
    properties = {}
  }
  return {
    ...properties,
    email: contact.email,
    first_name: contact.firstName,
    last_name: contact.lastName,
    company: contact.company,
    ...extra,
  }
}

export async function assertFromDomain(workspaceId: string, domainName: string, localPart: string) {
  const domain = await prisma.sendingDomain.findUnique({
    where: { workspaceId_domain: { workspaceId, domain: domainName.toLowerCase() } },
  })
  if (!domain) throw new HttpError("Add that domain to the workspace before sending.", 400)
  if (!isLocalPart(localPart)) throw new HttpError("Use a simple from-address, like hello.", 400)
  if (transportKind() !== "console" && domain.status !== "verified") {
    throw new HttpError("Verify the sending domain before sending.", 422)
  }
  return { domain, email: `${localPart.toLowerCase()}@${domain.domain}` }
}

export async function deliverComposed(input: {
  workspaceId: string
  to: string
  fromEmail: string
  fromName: string
  replyTo?: string
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
  category: MailCategory
  source: "campaign" | "test" | "api" | "confirm"
  campaignId?: string | null
  contactId?: string | null
}) {
  const transport = getTransport()
  const from = formatAddress(input.fromName, input.fromEmail)
  try {
    const result = await transport.send({
      to: input.to,
      from,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      headers: input.headers,
      category: input.category,
    })
    return prisma.message.create({
      data: {
        workspaceId: input.workspaceId,
        providerId: result.providerId,
        toEmail: input.to,
        fromEmail: input.fromEmail,
        subject: input.subject,
        category: input.category,
        source: input.source,
        campaignId: input.campaignId || null,
        contactId: input.contactId || null,
        status: "sent",
        html: input.html.slice(0, 180_000),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed"
    await prisma.message.create({
      data: {
        workspaceId: input.workspaceId,
        toEmail: input.to,
        fromEmail: input.fromEmail,
        subject: input.subject,
        category: input.category,
        source: input.source,
        campaignId: input.campaignId || null,
        contactId: input.contactId || null,
        status: "failed",
        error: message.slice(0, 500),
      },
    })
    throw new HttpError(message, 502)
  }
}

export async function sendRendered(input: {
  workspace: { id: string; senderName: string; replyTo: string; companyAddress: string }
  to: string
  fromEmail: string
  fromName: string
  replyTo?: string
  subject: string
  preheader?: string
  html: string
  category: MailCategory
  variables: Record<string, string | undefined>
  origin: string
  source: "campaign" | "test" | "api" | "confirm"
  contactId?: string | null
  campaignId?: string | null
  requireConsent?: boolean
}) {
  const suppressed = await suppressionSet(input.workspace.id)
  const reason = suppressed.get(input.to.toLowerCase())
  if (reason && input.source !== "test") {
    throw new HttpError("This address is on the suppression list.", 409)
  }
  if (input.category === "marketing" && input.requireConsent !== false) {
    const contact = input.contactId
      ? await prisma.contact.findUnique({ where: { id: input.contactId } })
      : await prisma.contact.findUnique({
          where: { workspaceId_email: { workspaceId: input.workspace.id, email: input.to.toLowerCase() } },
        })
    if (!contact || !marketingEligible(contact, Boolean(reason))) {
      throw new HttpError("Marketing email needs a subscribed contact with consent.", 409)
    }
  }
  const links =
    input.source === "test" || !input.contactId
      ? { pageUrl: `${input.origin}/u/test`, oneClickUrl: `${input.origin}/api/unsubscribe?token=test` }
      : unsubscribeLinks(input.origin, input.contactId, input.campaignId)
  const composed = composeEmail({
    html: input.html,
    subject: input.subject,
    preheader: input.preheader,
    variables: input.variables,
    category: input.category,
    unsubscribeUrl: links.pageUrl,
    oneClickUrl: input.category === "marketing" ? links.oneClickUrl : undefined,
    companyAddress: input.workspace.companyAddress,
    senderName: input.fromName || input.workspace.senderName,
  })
  return deliverComposed({
    workspaceId: input.workspace.id,
    to: input.to,
    fromEmail: input.fromEmail,
    fromName: input.fromName,
    replyTo: input.replyTo || input.workspace.replyTo,
    subject: composed.subject,
    html: composed.html,
    text: composed.text,
    headers: composed.headers,
    category: input.category,
    source: input.source,
    campaignId: input.campaignId,
    contactId: input.contactId,
  })
}
