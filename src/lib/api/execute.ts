import { z } from "zod"
import { prisma } from "../prisma"
import { HttpError } from "../http"
import { hashRequestBody } from "./idempotency"
import { domainOf, isEmail, normalizeEmail, parseAddress } from "../email/address"
import { assertFromDomain, contactVariables, sendRendered } from "../email/deliver"
import { transportKind } from "../email/transport"
import { marketingEligible } from "../audience/eligibility"
import { suppressionSet } from "../audience/suppress"
import type { Workspace } from "@prisma/client"

const recipient = z.object({
  email: z.string().min(3),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company: z.string().optional(),
})

export const sendSchema = z
  .object({
    to: z.union([z.string().min(3), recipient]),
    from: z.string().optional(),
    reply_to: z.string().optional(),
    subject: z.string().trim().min(1).max(200),
    templateId: z.string().optional(),
    variables: z.record(z.string(), z.string()).optional(),
    html: z.string().optional(),
    category: z.enum(["transactional", "marketing"]).optional(),
  })
  .refine((value) => Boolean(value.templateId || value.html), { message: "Provide templateId or html." })

export async function executeApiSend(input: {
  workspace: Workspace
  rawText: string
  origin: string
  idempotencyKey?: string
}) {
  let parsed: unknown
  try {
    parsed = JSON.parse(input.rawText) as unknown
  } catch {
    throw new HttpError("Request body must be JSON.", 400)
  }
  const body = sendSchema.parse(parsed)
  const requestHash = hashRequestBody(input.rawText)
  if (input.idempotencyKey) {
    const existing = await prisma.idempotencyKey.findUnique({
      where: { workspaceId_key: { workspaceId: input.workspace.id, key: input.idempotencyKey } },
    })
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new HttpError("This Idempotency-Key was already used with a different request.", 409)
      }
      return { status: existing.statusCode, body: JSON.parse(existing.responseBody) as unknown, replayed: true }
    }
  }

  const to = typeof body.to === "string" ? { email: body.to } : body.to
  const email = normalizeEmail(to.email)
  if (!isEmail(email)) throw new HttpError("Recipient email is invalid.", 400)

  let html = body.html || ""
  let templateCategory: "marketing" | "transactional" | null = null
  if (body.templateId) {
    const template = await prisma.template.findFirst({
      where: { id: body.templateId, workspaceId: input.workspace.id },
    })
    if (!template) throw new HttpError("Template not found.", 404)
    html = template.html
    templateCategory = template.category === "transactional" ? "transactional" : "marketing"
  }
  const category = body.category ?? templateCategory ?? "transactional"

  const from = await resolveFrom(input.workspace, body.from)
  const suppressed = await suppressionSet(input.workspace.id)
  let contact = await prisma.contact.findUnique({
    where: { workspaceId_email: { workspaceId: input.workspace.id, email } },
  })
  if (!contact && (to.first_name || to.last_name || to.company)) {
    contact = await prisma.contact.create({
      data: {
        workspaceId: input.workspace.id,
        email,
        firstName: to.first_name || "",
        lastName: to.last_name || "",
        company: to.company || "",
        status: "pending",
        consentStatus: "unknown",
      },
    })
  }
  if (category === "marketing" && (!contact || !marketingEligible(contact, suppressed.has(email)))) {
    throw new HttpError("Marketing API sends require a subscribed contact with consent.", 409)
  }

  const variables = {
    ...(contact ? contactVariables(contact) : { email, first_name: to.first_name || "", last_name: to.last_name || "", company: to.company || "" }),
    ...(body.variables || {}),
  }
  const message = await sendRendered({
    workspace: input.workspace,
    to: email,
    fromEmail: from.email,
    fromName: from.name || input.workspace.senderName,
    replyTo: body.reply_to || input.workspace.replyTo,
    subject: body.subject,
    html,
    category,
    variables,
    origin: input.origin,
    source: "api",
    contactId: contact?.id,
    requireConsent: category === "marketing",
  })
  const response = {
    id: message.id,
    provider_id: message.providerId,
    status: "sent",
    to: email,
    category,
  }
  if (input.idempotencyKey) {
    await prisma.idempotencyKey.create({
      data: {
        workspaceId: input.workspace.id,
        key: input.idempotencyKey,
        requestHash,
        statusCode: 200,
        responseBody: JSON.stringify(response),
      },
    }).catch(() => undefined)
  }
  return { status: 200, body: response, replayed: false }
}

async function resolveFrom(workspace: Workspace, requested?: string) {
  if (requested) {
    const parsed = parseAddress(requested)
    if (!parsed) throw new HttpError("From address is invalid.", 400)
    const local = parsed.email.split("@")[0] || ""
    const checked = await assertFromDomain(workspace.id, domainOf(parsed.email), local)
    return { email: checked.email, name: parsed.name }
  }
  const domains = await prisma.sendingDomain.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
  })
  const domain = domains.find((item) => item.status === "verified") ?? (transportKind() === "console" ? domains[0] : undefined)
  if (!domain) throw new HttpError("Add and verify a sending domain, or pass from.", 422)
  const checked = await assertFromDomain(workspace.id, domain.domain, "hello")
  return { email: checked.email, name: workspace.senderName }
}
