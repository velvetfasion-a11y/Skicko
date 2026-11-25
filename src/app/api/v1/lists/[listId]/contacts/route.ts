import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashApiKey } from "@/lib/api/keys"
import { HttpError, json, toErrorResponse } from "@/lib/http"
import { addContact, removeContactFromList } from "@/lib/audience/mutate"
import { redactForLog } from "@/lib/api/idempotency"

const addSchema = z.object({
  email: z.string().min(3),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company: z.string().optional(),
  consent: z.object({
    status: z.enum(["granted", "pending", "withdrawn"]).optional(),
    source: z.string().optional(),
    text_version: z.string().optional(),
  }).optional(),
})

async function authenticate(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim()
  if (!token.startsWith("sk_live_")) throw new HttpError("Invalid API key.", 401)
  const key = await prisma.apiKey.findUnique({ where: { hash: hashApiKey(token) }, include: { workspace: true } })
  if (!key || key.revokedAt) throw new HttpError("Invalid API key.", 401)
  await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
  return key
}

async function finish(workspaceId: string, apiKeyId: string, method: string, path: string, status: number, requestBody: string, responseBody: string) {
  await prisma.apiLog.create({
    data: { workspaceId, apiKeyId, method, path, status, requestBody: redactForLog(requestBody), responseBody: redactForLog(responseBody) },
  }).catch(() => undefined)
}

export async function POST(req: Request, context: { params: Promise<{ listId: string }> }) {
  const raw = await req.text()
  const { listId } = await context.params
  const path = `/api/v1/lists/${listId}/contacts`
  try {
    const key = await authenticate(req)
    const body = addSchema.parse(JSON.parse(raw || "{}"))
    const result = await addContact({
      workspaceId: key.workspaceId,
      email: body.email,
      firstName: body.first_name,
      lastName: body.last_name,
      company: body.company,
      listId,
      consent: body.consent?.status === "granted",
      source: body.consent?.source || "api",
    })
    const payload = { id: result.contact.id, email: result.contact.email, suppressed: result.suppressed, marketable: result.contact.status === "subscribed" && result.contact.consentStatus === "granted" && !result.suppressed }
    await finish(key.workspaceId, key.id, "POST", path, 200, raw, JSON.stringify(payload))
    return json(payload)
  } catch (error) {
    const response = toErrorResponse(error)
    return response
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ listId: string }> }) {
  const { listId } = await context.params
  const url = new URL(req.url)
  try {
    const key = await authenticate(req)
    let email = url.searchParams.get("email") || ""
    if (!email) {
      const text = await req.text()
      if (text) email = (JSON.parse(text) as { email?: string }).email || ""
    }
    if (!email) throw new HttpError("Provide an email.", 400)
    const result = await removeContactFromList(key.workspaceId, listId, email)
    await finish(key.workspaceId, key.id, "DELETE", `/api/v1/lists/${listId}/contacts`, 200, email, JSON.stringify(result))
    return json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
