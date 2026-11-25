import { prisma } from "@/lib/prisma"
import { hashApiKey } from "@/lib/api/keys"
import { executeApiSend } from "@/lib/api/execute"
import { HttpError, error, json, toErrorResponse } from "@/lib/http"
import { originFromRequest } from "@/lib/origin"
import { redactForLog } from "@/lib/api/idempotency"

async function authenticate(req: Request) {
  const header = req.headers.get("authorization") || ""
  const token = header.replace(/^Bearer\s+/i, "").trim()
  if (!token.startsWith("sk_live_")) throw new HttpError("Invalid API key.", 401)
  const key = await prisma.apiKey.findUnique({ where: { hash: hashApiKey(token) }, include: { workspace: true } })
  if (!key || key.revokedAt) throw new HttpError("Invalid API key.", 401)
  await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
  return key
}

export async function POST(req: Request) {
  const raw = await req.text()
  let status = 500
  let responseText = ""
  let workspaceId = ""
  let apiKeyId: string | null = null
  const idempotencyKey = req.headers.get("idempotency-key") || ""
  try {
    const key = await authenticate(req)
    workspaceId = key.workspaceId
    apiKeyId = key.id
    const result = await executeApiSend({
      workspace: key.workspace,
      rawText: raw,
      origin: originFromRequest(req),
      idempotencyKey: idempotencyKey || undefined,
    })
    status = result.status
    responseText = JSON.stringify(result.body)
    return json(result.body, result.status)
  } catch (err) {
    const response = toErrorResponse(err)
    status = response.status
    responseText = await response.clone().text()
    return response
  } finally {
    if (workspaceId) {
      await prisma.apiLog.create({
        data: {
          workspaceId,
          apiKeyId,
          method: "POST",
          path: "/api/v1/send",
          status,
          idempotencyKey,
          requestBody: redactForLog(raw),
          responseBody: redactForLog(responseText),
        },
      }).catch(() => undefined)
    }
  }
}

export function GET() {
  return error("Use POST /api/v1/send.", 405)
}
