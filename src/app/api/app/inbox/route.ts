import { sessionRoute } from "@/lib/api/guard"
import { json } from "@/lib/http"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  return sessionRoute(req, async (session) => {
    const messages = await prisma.message.findMany({
      where: { workspaceId: session.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    return json({
      messages: messages.map((message) => ({
        id: message.id,
        toEmail: message.toEmail,
        subject: message.subject,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
        html: message.html,
        source: message.source,
      })),
    })
  })
}
