import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { executeApiSend } from "@/lib/api/execute"
import { originFromRequest } from "@/lib/origin"
import { redactForLog } from "@/lib/api/idempotency"

export async function POST(req: Request) {
  return sessionRoute(req, async (session) => {
    const raw = await req.text()
    const started = Date.now()
    try {
      const result = await executeApiSend({
        workspace: session.workspace,
        rawText: raw,
        origin: originFromRequest(req),
      })
      await prisma.apiLog.create({
        data: {
          workspaceId: session.workspace.id,
          method: "POST",
          path: "/api/v1/send",
          status: result.status,
          requestBody: redactForLog(raw),
          responseBody: redactForLog(JSON.stringify(result.body)),
        },
      })
      return json({ ...((result.body ?? {}) as object), elapsedMs: Date.now() - started, via: "dashboard" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed"
      await prisma.apiLog.create({
        data: {
          workspaceId: session.workspace.id,
          method: "POST",
          path: "/api/v1/send",
          status: 400,
          requestBody: redactForLog(raw),
          responseBody: message,
        },
      })
      throw error
    }
  })
}
