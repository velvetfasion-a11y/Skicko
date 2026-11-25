import { z } from "zod"
import { sessionRoute } from "@/lib/api/guard"
import { HttpError, json } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { applyWebhook } from "@/lib/webhooks/apply"
import { transportKind } from "@/lib/email/transport"

const schema = z.object({
  campaignId: z.string().optional(),
  messageId: z.string().optional(),
  type: z.enum(["delivered", "bounced", "complained"]),
})

export async function POST(req: Request) {
  return sessionRoute(req, async (session) => {
    if (transportKind() !== "console" && process.env.NODE_ENV === "production") {
      throw new HttpError("Provider simulation is only available with the console transport.", 403)
    }
    const body = schema.parse(await req.json())
    const message = body.messageId
      ? await prisma.message.findFirst({ where: { id: body.messageId, workspaceId: session.workspace.id } })
      : await prisma.message.findFirst({
          where: { workspaceId: session.workspace.id, campaignId: body.campaignId || undefined, status: "sent" },
          orderBy: { createdAt: "desc" },
        })
    if (!message?.providerId) throw new HttpError("Send the campaign before simulating a provider event.", 400)
    const result = await applyWebhook(
      {
        type: body.type === "delivered" ? "email.delivered" : body.type === "bounced" ? "email.bounced" : "email.complained",
        providerId: message.providerId,
        email: message.toEmail,
        bounceType: body.type === "bounced" ? "hard" : "",
      },
      session.workspace.id,
    )
    return json(result)
  })
}
